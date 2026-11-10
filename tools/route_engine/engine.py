"""RouteSim: local AeroDB routing and conservative RAD pre-check. Standard library only."""
from __future__ import annotations
import argparse, collections, datetime as dt, fnmatch, gzip, heapq, json, math, re
from pathlib import Path
from . import flight_profile                                  # SOG-0081 : imports relatifs (le moteur est le paquet tools/route_engine), seul changement avec les chemins ci-dessous
from . import fra as fra_module
from . import procedures as procedure_module
from . import planning
from . import rad_flight
from . import nav_data

HERE = Path(__file__).resolve().parent
DATA_DIR = None   # SOG-0081 : dossier des données (sia/base, proc) posé par le travail du lanceur ; None : <root>/data, comme RouteSim 2
RAD_FILE = None   # SOG-0081 : chemin de rad.json.gz posé par le travail du lanceur (data/route/rad.json.gz) ; None : à côté du module, comme RouteSim 2
MONTHS = dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(),range(1,13)))

def date_in(text):
    m = re.search(r'(\d{1,2})[ /-]+([A-Z]{3})[ /-]+(\d{4})', text.upper())
    if m:
        try: return dt.date(int(m[3]),MONTHS[m[2]],int(m[1]))
        except (KeyError,ValueError): return None
    return None

def nm(a,b):
    x,y=math.radians(a['lat']),math.radians(b['lat'])
    d=math.sin((y-x)/2)**2+math.cos(x)*math.cos(y)*math.sin(math.radians(b['lon']-a['lon'])/2)**2
    return 3440.065*2*math.asin(min(1,math.sqrt(d)))

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def tokens(s): return set(re.findall(r'[A-Z][A-Z0-9_*]{1,30}',s.upper()))

def route_connector(word,nav,airways=(),procedures=()):
    return word=='DCT' or word in airways or word in procedures or (word not in nav.ids and re.fullmatch(r'U?[A-Z]\d{1,4}[A-Z]?',word) is not None)

def profile_options(request):
    return dict(speed_kt=float(request.get('speed_kt',450)),climb_fps=float(request.get('climb_fpm',2000))/60,descent_fps=float(request.get('descent_fpm',2000))/60)

def via_points(request):
    value=request.get('via',[])
    if isinstance(value,str): value=re.split(r'[\s,;]+',value.strip().upper())
    points=[str(x).strip().upper() for x in value if str(x).strip()]
    if len(points)>128 or any(not re.fullmatch('[A-Z0-9][A-Z0-9_-]{1,20}',p) for p in points): raise ValueError('Via : jusqu’à 128 identifiants de points, séparés par des espaces.')
    return points

class RoutingGraph(dict):
    flight=None

class Nav:
    def __init__(self,root,date):
        self.root=Path(root); self.date=date; self.nodes={}; self.ids=collections.defaultdict(list)
        self.data_dir=Path(DATA_DIR) if DATA_DIR else self.root/'data'   # SOG-0081 : DATA_DIR
        self.ads={}; self.edges=[]; self.cycles={}; self.coverage=[];self.vrp_keys=set();self.navaid_keys=set()
        base=self.data_dir/'sia/base'   # SOG-0081 : data_dir
        if not base.is_dir(): raise ValueError('Base introuvable : '+str(base))
        for zone in sorted(base.iterdir()):
            if not zone.is_dir(): continue
            datasets=nav_data.Zone(zone,date)
            if not datasets.folders and not datasets.flat:continue
            self.cycles[zone.name]=max([p.name for p in datasets.folders]+[p.stem for p in datasets.flat])
            index=datasets.dataset('aeroindex')
            if isinstance(index,dict):index=[dict(zip(index['fields'],row)) for row in index.get('rows',[])]
            for a in index:
                if self.valid(a) and a.get('icao'):
                    self.ads[a['icao']]=a;self.add(dict(a,id=a['icao']))
            for kind in ['points','navaids','vrp']:
                for point in datasets.dataset(kind):
                    if self.valid(point) and point.get('id'):
                        key=self.add(point)
                        if kind=='vrp':self.vrp_keys.add(key)
                        if kind=='navaids':self.navaid_keys.add(key)
            ways=datasets.dataset('airways');seen_edges=set();count=0
            for w in ways:
                if not self.valid(w.get('a',{})) or not self.valid(w.get('b',{})):continue
                a,b=self.add(w['a']),self.add(w['b'])
                signature=(a,b,w['route'],w.get('lower'),w.get('upper'))
                if signature in seen_edges:continue
                seen_edges.add(signature);count+=1
                self.edges.append(dict(a=a,b=b,route=w['route'],lower=w.get('lower'),upper=w.get('upper'),dir=w.get('dir'),   # SOG-0078 : dir ('F' a→b, 'B' b→a, 'FB' les deux ; absent : inconnu)
                    nm=nm(self.nodes[a],self.nodes[b]),zone=zone.name,source_cycle=datasets.cycles['airways']))
            self.coverage.append(dict(zone=zone.name,cycle=datasets.cycles['airways'] or self.cycles[zone.name],segments=count,
                dataset_cycles=datasets.cycles,sources=datasets.sources['airways']))
        if not self.edges: raise ValueError('Aucun segment airway dans les cycles disponibles à cette date.')
        self.fra=fra_module.Fra(self,date,nm)
        self._fra_graph_cache={}
        self._routing_cache=collections.OrderedDict()
        self.procedures=procedure_module.Catalog(self)
        import threading
        self._plan_lock=threading.RLock()

    def release_graph_caches(self):
        for name in ['_fra_graph_cache','_routing_cache','_fra_recovery_graph_cache']:
            cache=getattr(self,name,None)
            if cache is not None:cache.clear()

    @staticmethod
    def valid(p): return all(isinstance(p.get(k),(int,float)) and math.isfinite(p[k]) for k in ['lat','lon']) and -90<=p['lat']<=90 and -180<=p['lon']<=180

    def add(self,p):
        ident=p['id'].strip().upper()
        for key in self.ids[ident]:
            if nm(p,self.nodes[key])<0.15: return key
        key=f'{ident}@{p["lat"]:.5f},{p["lon"]:.5f}'
        self.nodes[key]=dict(id=ident,lat=p['lat'],lon=p['lon'])
        self.ids[ident].append(key)
        return key

    def resolve(self,ident):
        candidates=self.ids.get(ident,[])
        if not candidates: raise ValueError('Point inconnu dans AeroDB : '+ident)
        if len(candidates)>1: raise ValueError('Identifiant géographiquement ambigu : '+ident+' ('+str(len(candidates))+' positions).')
        return candidates[0]

    def resolve_sequence(self,names,start=None,end=None):
        """Resolve homonyms by the shortest complete geographical chain.
        A close second interpretation stays an explicit ambiguity.
        """
        if not names:return []
        paths=[(0.,start,[])]
        for ident in names:
            ident=str(ident).strip().upper();keys=self.ids.get(ident,[])
            if not keys:raise ValueError('Point inconnu dans AeroDB : '+ident)
            next_paths=[]
            for key in keys:
                choices=sorted((cost+(nm(self.nodes[previous],self.nodes[key]) if previous else 0),key,[*chosen,key]) for cost,previous,chosen in paths)
                next_paths.extend(choices[:2])
            paths=next_paths
        ranked=sorted((cost+(nm(self.nodes[key],self.nodes[end]) if end else 0),chosen) for cost,key,chosen in paths)
        best=ranked[0]
        if len(ranked)>1 and ranked[1][0]-best[0]<max(1,best[0]*.005):
            raise ValueError('Route géographiquement ambiguë : plusieurs positions de points donnent des trajets comparables. Préciser un point voisin.')
        return best[1]

    def resolve_context(self,ident,previous=None,via='DCT',following=()):
        candidates=list(self.ids.get(ident,[]))
        if not candidates: return self.resolve(ident)
        if len(candidates)>1 and previous and via!='DCT':
            g=self.graph(None,via)
            candidates=[k for k in candidates if self.path(g,previous,k) is not None]
        if len(candidates)>1 and len(following)>=2 and following[0] in {e['route'] for e in self.edges}:
            g=self.graph(None,following[0]); ends=self.ids.get(following[1],[])
            candidates=[k for k in candidates if any(self.path(g,k,end) is not None for end in ends)]
        if len(candidates)==1: return candidates[0]
        if not candidates: raise ValueError('Aucune position de '+ident+' reliée à l’airway indiquée')
        raise ValueError('Identifiant géographiquement ambigu : '+ident+' ('+str(len(candidates))+' positions encore possibles).')

    def graph(self,fl=None,airway=None,directed=True):
        g=collections.defaultdict(list)
        for e in self.edges:
            if airway and e['route']!=airway: continue
            if fl is not None and not self.level(e,fl): continue
            # SOG-0078 : un segment à sens unique (dir 'F' ou 'B', lu dans la source) ne se parcourt que dans son sens ; sans `dir` (source muette), les deux sens restent une hypothèse de simulation.
            if not directed or e.get('dir')!='B': g[e['a']].append((e['b'],e))
            if not directed or e.get('dir')!='F': g[e['b']].append((e['a'],e))
        return g

    @staticmethod
    def level(e,fl):
        return isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100<=e['upper']

    @staticmethod
    def edge_band(e,side):
        c=e.get('node_constraints') or {};low=e.get('lower');high=e.get('upper')
        low=low if isinstance(low,(int,float)) else -1e9;high=high if isinstance(high,(int,float)) else 1e9
        if c.get(side+'_min') is not None:low=max(low,c[side+'_min'])
        if c.get(side+'_max') is not None:high=min(high,c[side+'_max'])
        return low,high

    def search(self,g,start,end,waypoints=(),require_fra=False,fra_already=False,initial_band=None):
        """A* with ordered milestones and nondominated reachable-altitude labels.
        Heuristic is geodesic distance through remaining milestones, scaled by
        the cheapest cost/NM in this graph. It stays admissible with FRA bonus.
        """
        import time
        begun=time.perf_counter();expanded=0;fra_reachable=False
        names=[self.nodes[k]['id'] for k in waypoints]
        flight=getattr(g,'flight',None)
        low,high=initial_band or ((flight['departure'],flight['departure']) if flight else (-1e9,1e9))
        origin=(start,0,bool(fra_already),low,high)
        ratios=[e.get('_cost',e['nm'])/e['nm'] for es in g.values() for _,e in es if e['nm']>.00001]
        ratio=min(ratios,default=0)
        targets=[self.nodes[k] for k in waypoints]+[self.nodes[end]]
        suffix=[0.]*len(targets)
        for i in range(len(targets)-2,-1,-1):suffix[i]=suffix[i+1]+nm(targets[i],targets[i+1])
        heuristics={}
        def heuristic(u,index):
            key=(u,index)
            if key not in heuristics:heuristics[key]=ratio*(nm(self.nodes[u],targets[index])+suffix[index])
            return heuristics[key]
        q=[(heuristic(start,0),0,origin)];costs={origin:0};prev={};labels=collections.defaultdict(list)
        labels[origin[:3]].append((0,low,high,origin))
        while q:
            if expanded%128==0 and (expanded>=100000 or time.perf_counter()-begun>6):
                self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=False,truncated=True,fra_reachable=fra_reachable)
                raise ValueError('Budget de recherche atteint (6 s / 100 000 états). Ce résultat ne prouve pas l’absence de route ; réduire les contraintes ou examiner la couverture des bases.')
            _,cost,state=heapq.heappop(q)
            if cost!=costs.get(state):continue
            expanded+=1;u,index,seen_fra,low,high=state
            fra_reachable=fra_reachable or '|FRA|' in u
            if u==end and index==len(names) and (seen_fra or not require_fra):
                if flight and not low-.01<=flight['arrival']<=high+.01:continue
                path=[]
                while state!=origin:
                    previous,e=prev[state];path.append((previous[0],state[0],e));state=previous
                self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=True,fra_reachable=fra_reachable)
                return list(reversed(path))
            for v,e in g.get(u,[]):
                a,b=self.edge_band(e,'start');a=max(a,low);b=min(b,high)
                if a>b+.001:continue
                c,d=self.edge_band(e,'end')
                if flight:
                    ceiling=flight['ceiling'];b=min(b,ceiling);d=min(d,ceiling)
                    if a>b+.001:continue
                    seconds=e['nm']/(e.get('planned_speed_kt') or flight['speed_kt'])*3600
                    up=0 if e.get('kind') in ['STAR','APPROACH_LINK'] else flight['climb_fps']*seconds
                    down=0 if e.get('kind')=='SID' else flight['descent_fps']*seconds
                    c=max(c,a-down,0);d=min(d,b+up)
                    if v==end:c=max(c,flight['arrival']);d=min(d,flight['arrival'])
                elif e['nm']<.00001:c,d=max(c,a),min(d,b)
                if c>d+.001:continue
                c,d=round(c,6),round(d,6)
                next_index=index+1 if index<len(names) and self.nodes[v]['id']==names[index] and nm(self.nodes[v],self.nodes[waypoints[index]])<.15 else index
                qualifies=e.get('kind')=='FRA' and (not getattr(g,'required_fra_area',None) or e.get('fra_area')==g.required_fra_area)
                next_state=(v,next_index,seen_fra or qualifies,c,d);new=cost+e.get('_cost',e['nm'])
                bucket=labels[next_state[:3]]
                if any(old<=new+1e-10 and lo<=c+.001 and hi>=d-.001 for old,lo,hi,_ in bucket):continue
                kept=[]
                for old,lo,hi,key in bucket:
                    if new<=old+1e-10 and c<=lo+.001 and d>=hi-.001:costs.pop(key,None)
                    else:kept.append((old,lo,hi,key))
                kept.append((new,c,d,next_state));labels[next_state[:3]]=kept
                costs[next_state]=new;prev[next_state]=(state,e)
                heapq.heappush(q,(new+heuristic(v,next_index),new,next_state))
        self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=False,fra_reachable=fra_reachable)
        return None

    def path(self,g,start,end):return self.search(g,start,end)

    def terminal_gates(self,airport,isdep,ad,g,incoming,terminal,radius,have,other):
        """SOG-0161 : sans SID ni STAR, les portes FRA que le classeur EUROCONTROL publie pour CET aérodrome (point « D » de départ, « A » d'arrivée, l'aérodrome nommé dans la ligne) sont des raccords possibles
        AU-DELÀ du rayon : le plancher d'une zone FRA (FL285 en Suède et au Danemark) est atteint après une distance de montée (2000 ft/min, 450 kt : ~107 NM) que la SID parcourt ; un point plus proche n'est pas atteignable,
        un point plus loin d'une marge de 120 NM n'est pas un raccord. Le raccord reste un DCT de simulation (connector), dit « revue » par le contrôle : aucune SID complète n'a été lue. [(distance NM, nœud)]"""
        fra=getattr(self,'fra',None)
        if not(fra and fra.book):return [],set()
        role,col='D' if isdep else 'A','dep' if isdep else 'arr'
        speed=float(terminal.get('speed_kt',450));rate=float(terminal.get('climb_fpm' if isdep else 'descent_fpm',2000));elev=float(self.ads[ad].get('elev') or 0)
        detour=lambda k:nm(self.nodes[airport],self.nodes[k])+nm(self.nodes[k],other)
        out,unreachable=[],set()
        network={x for e in self.edges for x in (e['a'],e['b'])}
        for k in set(g)|set(incoming):
            if '|' in k or k not in self.nodes:continue
            records=[r for r in fra.by_key.get(k,[]) if role in r['terminal'] and fra.airport_match(r[col],ad) and isinstance(r['lower'],(int,float))]
            if not records:continue
            d=nm(self.nodes[airport],self.nodes[k]);need=max(0,(min(r['lower'] for r in records)-elev))/rate*speed/60
            if d<need-.1:
                if k not in network:unreachable.add(k)      # une porte FRA plus proche que la distance de montée, qui n'est sur aucun airway : pas un raccord (le profil vertical la refuserait)
            elif k not in have and d<=max(radius,need+120):out.append((detour(k),d,k))
        out=[(d,k) for _,d,k in sorted(out)[:6]]       # les six portes les mieux placées (détour minimal vers l'autre aérodrome) : toutes les portes d'un grand aérodrome (LFPG : 20) font grossir le graphe jusqu'à épuiser le budget de recherche (LFPG → LEMD)
        return out,unreachable

    def routing_graph(self,dep,arr,fl,radius,blocks=(),profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None):
        terminal=terminal or {}
        cost_fields={k:terminal.get(k) for k in ['objective','fra_preference','unable_rnav','use_procedures','dep_runway','arr_runway','terminal_speed_kt','speed_kt','_fuel_model','search_density','_rad_avoid']}
        cache_key=json.dumps([dep,arr,fl,radius,blocks,profile_options,allow_steps,via,str(when),enable_fra,cost_fields],sort_keys=True)
        if not hasattr(self,'_routing_cache'):self._routing_cache=collections.OrderedDict()
        if cache_key in self._routing_cache:
            return self._routing_cache[cache_key]
        point_rules=collections.defaultdict(list);segment_rules=collections.defaultdict(list);procedure_rules=collections.defaultdict(list)
        chain_blocks=[]
        for rule in blocks:
            if rule['kind']!='segment' or rule['via']=='DCT':continue
            if not hasattr(self,'_rad_chain_cache'):self._rad_chain_cache={}
            chain_key=(rule['via'],rule['start'],rule['end'])
            if chain_key not in self._rad_chain_cache:
                route_graph=self.graph(None,rule['via']);paths=[]
                for a in self.ids.get(rule['start'],[]):
                    for b in self.ids.get(rule['end'],[]):
                        path=self.path(route_graph,a,b)
                        if path:paths.append(path)
                self._rad_chain_cache[chain_key]=min(paths,key=lambda path:sum(e['nm'] for a,b,e in path)) if paths else []
            for a,b,e in self._rad_chain_cache[chain_key]:chain_blocks.append(dict(rule,start=self.nodes[a]['id'],end=self.nodes[b]['id']))
        for rule in [*blocks,*chain_blocks,*terminal.get('_rad_avoid',[])]:
            if rule['kind']=='point':point_rules[rule['point']].append(rule)
            elif rule['kind']=='procedure':procedure_rules[rule['procedure_id']].append(rule)
            else:segment_rules[(rule['via'],rule['start'],rule['end'])].append(rule)
        def relevant_rules(a,b,e):
            return point_rules.get(a,[])+point_rules.get(b,[])+segment_rules.get((e['route'],a,b),[])+procedure_rules.get(e.get('procedure_id'),[])
        if dep==arr: raise ValueError('Choisir deux aérodromes différents.')
        if dep not in self.ads or arr not in self.ads: raise ValueError('Aérodrome absent d’AeroDB : '+(dep if dep not in self.ads else arr))
        a,b=self.resolve(dep),self.resolve(arr); g=self.graph(None if allow_steps else fl)
        terminal=terminal or {}
        when=when or dt.datetime.combine(self.date,dt.time(12))
        if enable_fra and getattr(self,'fra',None) and self.fra.book:
            key=(dep,arr,fl,allow_steps,tuple(via),when.isoformat(timespec='minutes'),terminal.get('search_density','normal'))
            if key not in self._fra_graph_cache:
                self._fra_graph_cache[key]=self.fra.graph(g,dep,arr,fl,when,via,allow_steps,terminal.get('search_density','normal'))
                if len(self._fra_graph_cache)>1: self._fra_graph_cache.pop(next(iter(self._fra_graph_cache)))
            g={u:list(es) for u,es in self._fra_graph_cache[key].items()}
        if terminal.get('unable_rnav'):
            rejected=0;unknown=0
            for u in list(g):
                permitted=[]
                for v,e in g[u]:
                    if e.get('kind') in ['FRA','FRA_GATE']:continue
                    info=planning.rnav_edge(self,u,v,e)
                    if info['required'] is False:permitted.append((v,e))
                    elif info['required'] is True:rejected+=1
                    else:unknown+=1
                g[u]=permitted
            if not any(g.values()):raise ValueError(f'Unable RNAV : aucun segment IFR conventionnel confirmé dans ce réseau. {rejected} sens de segments exigent RNAV ; {unknown} ont une exigence inconnue. Aucun DCT de substitution n’a été inventé.')
        for key in list(g):
            g[key]=[(other,e) for other,e in g[key] if isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100 and e['upper']>=e['lower']]
            if not g[key]: del g[key]
        incoming=collections.defaultdict(list)
        for u,edges in g.items():
            for v,e in edges: incoming[v].append((u,e))
        terminal=terminal or {}; used_procs={}
        if terminal.get('use_procedures',False) and getattr(self,'procedures',None):
            for ad,kind,rwy in [(dep,'SID',terminal.get('dep_runway','')),(arr,'STAR',terminal.get('arr_runway',''))]:
                used_procs[ad]=self.procedures.add_graph(g,ad,kind,rwy,float(terminal.get('terminal_speed_kt',220)),terminal.get('unable_rnav',False))
        # DCT fallback is explicit when no complete, connected procedure is available.
        for airport,isdep in [(a,True),(b,False)]:
            if used_procs.get(dep if isdep else arr):continue
            near=sorted((nm(self.nodes[airport],self.nodes[k]),k) for k in set(g)|set(incoming) if k not in [a,b] and '|FRA|' not in k)
            near=[(d,k) for d,k in near if d<=radius]
            gates,unreachable=self.terminal_gates(airport,isdep,dep if isdep else arr,g,incoming,terminal,radius,{k for d,k in near},self.nodes[b if isdep else a])   # SOG-0161
            near=[(d,k) for d,k in near if k not in unreachable]+gates
            if not near: raise ValueError(f'Aucun point du réseau au FL{fl:03d} à moins de {radius:g} NM de {self.nodes[airport]["id"]}. Couverture ou niveau insuffisant.')
            for d,k in near:
                ids=(self.nodes[airport]['id'],self.nodes[k]['id']) if isdep else (self.nodes[k]['id'],self.nodes[airport]['id'])
                e=dict(route='DCT',nm=d,connector=True)
                if isdep: g.setdefault(airport,[]).append((k,e))
                else: g.setdefault(k,[]).append((airport,e))
        # An imposed AD is an overflight waypoint, never a landing. Only this
        # explicit simulation connector is added; its altitude stays airborne.
        for ident in via:
            if ident not in self.ads or ident in [dep,arr]:continue
            if terminal.get('unable_rnav'):continue
            waypoint=self.resolve(ident)
            for key in set(g)|{v for es in g.values() for v,_ in es}:
                if key==waypoint or '|PROC|' in key or '|FRA|' in key or key in [a,b]:continue
                distance=nm(self.nodes[waypoint],self.nodes[key])
                if not .1<distance<=radius:continue
                edge=dict(route='DCT',kind='VIA_AD',nm=distance,connector=True,overflight=ident,lower=0,upper=fl*100)
                g.setdefault(waypoint,[]).append((key,edge))
                g.setdefault(key,[]).append((waypoint,edge))
        # Apply RAD after SID/STAR and all connectors have been inserted. A rule
        # on a procedure point must affect path finding, not only final checking.
        for u,edges in list(g.items()):
            allowed=[]
            for v,e in edges:
                relevant=relevant_rules(self.nodes[u]['id'],self.nodes[v]['id'],e)
                if any(rule.get('lower_ft') is None for rule in relevant):continue
                bands=[(e.get('lower') if isinstance(e.get('lower'),(int,float)) else 0,e.get('upper') if isinstance(e.get('upper'),(int,float)) else fl*100)]
                for rule in relevant:
                    lo,hi=rule['lower_ft'],rule['upper_ft'];next_bands=[]
                    for lower,upper in bands:
                        if hi<lower or lo>upper:next_bands.append((lower,upper));continue
                        if lower<lo:next_bands.append((lower,lo-.01))
                        if hi<upper:next_bands.append((hi+.01,upper))
                    bands=next_bands
                allowed.extend((v,dict(e,lower=lower,upper=upper)) if relevant else (v,e) for lower,upper in bands)
            g[u]=allowed
        g={u:[(v,dict(e,_cost=planning.edge_cost(e,terminal))) for v,e in es] for u,es in g.items()}
        graph=RoutingGraph(g)
        if profile_options:
            graph.flight=dict(profile_options,departure=self.ads[dep].get('elev') or 0,arrival=self.ads[arr].get('elev') or 0,ceiling=fl*100)
        self._routing_cache[cache_key]=(graph,a,b)
        if len(self._routing_cache)>1:self._routing_cache.popitem(last=False)
        return graph,a,b

    def resolve_vias(self,g,start,end,via):
        # Resolve geography once. A* consumes names in order across all physical,
        # FRA and procedure states; repeated reachability searches are unnecessary.
        return self.resolve_sequence(via,start,end)

    def constrained_path(self,g,start,end,waypoints=(),require_fra=False,fra_already=False,initial_band=None):
        return self.search(g,start,end,waypoints,require_fra,fra_already,initial_band)

    def generate(self,dep,arr,fl,radius,blocks=(),profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None):
        g,a,b=self.routing_graph(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,terminal)
        mandatory=self.resolve_vias(g,a,b,via)
        path=self.constrained_path(g,a,b,mandatory,bool((terminal or {}).get('require_fra')))
        if path is None and enable_fra and getattr(self,'last_search',{}).get('fra_reachable',True) and (terminal or {}).get('search_density','normal')=='normal':
            del g
            self.release_graph_caches()
            return self.generate(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,dict(terminal or {},search_density='wide'))
        if path is None: raise ValueError('Aucun chemin avec un tronçon FRA accessible aux conditions demandées.' if (terminal or {}).get('require_fra') else 'Aucune route trouvée sur le réseau disponible à ce niveau. Essayer un autre FL ou une autre paire d’AD. Aucun DCT intermédiaire n’a été inventé.')
        return self.format_path(dep,path,via),path

    def format_path(self,dep,path,via=()):
        words=[dep]; last=None
        for u,v,e in path:
            if e.get('kind')=='FRA_GATE': continue
            if last==e['route'] and last!='DCT' and words[-1] not in via: words[-1]=self.nodes[v]['id']
            else: words.extend([e['route'],self.nodes[v]['id']])
            last=e['route']
        return ' '.join(words)

    def alternate_routes(self,dep,arr,fl,radius,blocks=(),count=3,profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None,return_paths=False):
        """Diverse A* candidates by increasing cost on previously used links.
        This is not an exact k-shortest enumeration; every retained path is
        subsequently checked with its original source edges and flight profile.
        """
        g,start,end=self.routing_graph(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,terminal)
        mandatory=self.resolve_vias(g,start,end,via);selected=[];seen=set();usage=collections.Counter()
        def signature(path):return tuple((self.nodes[a]['id'],self.nodes[b]['id'],e['route'],e.get('fra_area')) for a,b,e in path if e.get('kind')!='FRA_GATE')
        def links(path):return {(self.nodes[a]['id'],self.nodes[b]['id'],e['route'],e.get('fra_area')) for a,b,e in path if e.get('kind')!='FRA_GATE' and not e.get('connector')}
        for attempt in range(max(8,count*3)):
            if terminal and terminal.get('_deadline'):
                import time
                if time.perf_counter()>terminal['_deadline']:break
            modified=RoutingGraph({u:[(v,dict(e,_cost=e['_cost']*(1+.4*usage[(u,v,e['route'],e.get('fra_area'))]))) for v,e in es] for u,es in g.items()})
            modified.flight=g.flight
            path=self.constrained_path(modified,start,end,mandatory,bool((terminal or {}).get('require_fra')))
            if path is None:break
            sig=signature(path);edges=links(path)
            for a,b,e in path:
                if e.get('kind')!='FRA_GATE':usage[(a,b,e['route'],e.get('fra_area'))]+=1
            if sig in seen:continue
            seen.add(sig)
            if not selected or all(len(edges & links(p))/max(1,len(edges | links(p)))<.93 for p in selected):selected.append(path)
            if len(selected)>=count:break
        return [(self.format_path(dep,p,via),p) if return_paths else self.format_path(dep,p,via) for p in selected]


class Rad:
    def __init__(self,date):
        with gzip.open(RAD_FILE or HERE/'rad.json.gz','rt',encoding='utf-8') as f: books=json.load(f)   # SOG-0081 : RAD_FILE
        self.book=next((b for b in books if b['start']<=str(date)<b['end_exclusive']),None)
        self.date=date; self.groups={}
        if self.book:
            for r in self.book['sheets']['Annex 1']:
                self.groups[r['v'][3].strip()]=r['v'][4]

    def match(self,expr,ad,seen=None):
        seen=set() if seen is None else seen
        for t in tokens(expr):
            if t in self.groups and t not in seen:
                if self.match(self.groups[t],ad,seen|{t}): return True
            elif re.fullmatch('[A-Z*]{2,4}',t) and ('*' in t or len(t)==4):
                if fnmatch.fnmatchcase(ad,t): return True
        return False

    def active(self,r):
        v=r['v']; start,end=date_in(v[1]),date_in(v[2])
        if start and self.date<start: return False
        if end and self.date>end: return False
        return True

    def blocks(self,dep,arr,fl):
        """Only unambiguous, all-day atomic prohibitions; no general RAD grammar inference."""
        if not self.book: return []
        blocks=[]
        for sheet in ['Annex 2B','Annex 3B DCT']:
            active=[r for r in self.book['sheets'][sheet] if self.active(r)]
            ids=collections.Counter(r['v'][3] for r in active)
            for r in active:
                v=r['v']
                if v[0]=='DEL' or ids[v[3]]!=1 or not (date_in(v[1]) or v[1]=='BOT'): continue
                base=dict(id=v[3],sheet=sheet,row=r['row'])
                if sheet=='Annex 2B':
                    if v[9]!='H24': continue
                    util=' '.join(v[8].split())
                    allowed=util=='NOT AVBL FOR TFC'
                    m=re.fullmatch(r'NOT AVBL FOR TFC (DEP|ARR) ([A-Z0-9_*(), ]+)',util)
                    if m and not (tokens(m[2]) & {'EXC','AND','OR','VIA','ABV','BLW','AT','FLT','TYP'}):
                        allowed=self.match(m[2],dep if m[1]=='DEP' else arr)
                    if not allowed: continue
                    if not v[4] and not v[5] and not v[6] and re.fullmatch('[A-Z0-9]{2,7}',v[7]):
                        blocks.append(dict(base,kind='point',point=v[7]))
                    elif all(re.fullmatch('[A-Z0-9]{2,7}',v[i]) for i in [4,5,6]) and not v[7]:
                        blocks.append(dict(base,kind='segment',via=v[4],start=v[5],end=v[6]))
                else:
                    if v[8].upper() not in ['NO','N'] or v[9] or v[10]!='H24': continue
                    lo=re.fullmatch(r'(?:FL)?(\d{1,3})',v[6]); hi=re.fullmatch(r'(?:FL)?(\d{1,3})',v[7])
                    if lo and hi and (fl is None or int(lo[1])<=fl<=int(hi[1])) and all(re.fullmatch('[A-Z0-9]{2,7}',v[i]) for i in [4,5]):
                        blocks.append(dict(base,kind='segment',via='DCT',start=v[4],end=v[5],lower_ft=int(lo[1])*100,upper_ft=int(hi[1])*100))
        blocks.extend(rad_flight.static_blocks(self,dep,arr))
        return list({json.dumps(b,sort_keys=True):b for b in blocks}.values())

    def candidates(self,dep,arr,ids,routes):
        if not self.book: return []
        found=[]; search=(ids|routes)-{'DCT'}
        for sheet,rows in self.book['sheets'].items():
            if sheet=='Annex 1': continue
            for r in rows:
                if not self.active(r): continue
                v=r['v']; reason=[]
                if sheet=='Annex 3A DEP' and self.match(v[4],dep): reason.append('AD de départ')
                elif sheet=='Annex 3A ARR' and self.match(v[4],arr): reason.append('AD d’arrivée')
                elif sheet=='Annex 2A' and (self.match(v[4],dep) or self.match(v[6],arr)):
                    reason.append('ADEP/ADES ou groupe à examiner')
                else:
                    cols={'Annex 2B':[4,5,6,7,8], 'Annex 2C':[4,5,7], 'Annex 3B DCT':[4,5],
                          'Annex 3B FRA LIM':[4], 'Annex 3A Conditions':[4,5]}.get(sheet,[])
                    ts=tokens(' '.join(v[i] for i in cols))
                    hit=search & ts
                    if hit: reason.append('Mention de '+', '.join(sorted(hit)))
                    # Capture airport-specific rules even without an explicit matching route token.
                    if sheet in ['Annex 2B','Annex 2C','Annex 3A Conditions']:
                        if dep in ts or arr in ts: reason.append('Mention de l’AD')
                        for group in ts & self.groups.keys():
                            if self.match(group,dep) or self.match(group,arr):
                                reason.append('Groupe '+group)
                if reason:
                    found.append(dict(sheet=sheet,row=r['row'],id=v[3],change=v[0],reason='; '.join(reason),
                        validity=v[1]+' → '+v[2],values=v,strike_removed=r.get('strike_removed',False),
                        headers=self.book.get('headers',{}).get(sheet,[]),
                        assessment='Suppression publiée — vérifier la chronologie' if v[0]=='DEL' else 'À interpréter : correspondance de texte, applicabilité non établie'))
        return found

def block_hit(block,a,b,via):
    if block['kind']=='point': return block['point'] in [a,b]
    return block['via']==via and block['start']==a and block['end']==b

def assess(request,_nav=None,_rad=None,_path=None):
    dep=str(request.get('dep','')).strip().upper(); arr=str(request.get('arr','')).strip().upper()
    for ad in [dep,arr]:
        if not re.fullmatch('[A-Z0-9]{3,4}',ad): raise ValueError('Code aérodrome invalide : '+ad)
    when=dt.datetime.fromisoformat(str(request.get('date','2026-11-09T12:00')).replace('Z','+00:00'))
    # UI and CLI inputs are UTC. Offset-aware ISO requests are normalized to UTC.
    if when.tzinfo: when=when.astimezone(dt.timezone.utc).replace(tzinfo=None)
    fl=int(request.get('fl',180))
    if fl<10 or fl>660: raise ValueError('Le niveau doit être compris entre FL010 et FL660.')
    options=profile_options(request); mandatory=via_points(request)
    # Validate vertical assumptions even when no route can be resolved.
    flight_profile.build([],0,0,fl,**options)
    strategy=request.get('level_strategy','natural')
    if _nav is None:
        import gc
        gc.collect()
    nav=_nav or Nav(request.get('root','E:/defa'),when.date()); rad=_rad or Rad(when.date())
    if getattr(nav,'procedures',None):
        for ad in [dep,arr]:
            if ad in nav.ads:nav.procedures.prepare(ad)
    generated=request.get('mode','calculate')=='calculate'; blocks=rad.blocks(dep,arr,None)
    route=str(request.get('route','')).strip().upper(); issues=[]; legs=[]
    def issue(level,text): issues.append(dict(level=level,text=text))
    if generated:
        radius=float(request.get('radius',40))
        if not 1<=radius<=100: raise ValueError('Rayon de raccordement : 1 à 100 NM.')
        route,path=nav.generate(dep,arr,fl,radius,blocks,options,strategy=='adapt',mandatory,when,request.get('enable_fra',True),request)
    else:
        if not route: raise ValueError('Coller une route à contrôler.')
        path=_path or []
    words=route.split()
    if words and re.fullmatch(r'[NK]\d{4}F\d{3}',words[0]):
        issue('REVUE','Vitesse initiale ignorée. Le niveau de la route doit correspondre au FL saisi.')
        route_fl=int(words[0][-3:])
        if route_fl!=fl: issue('ERREUR',f'Le préfixe annonce FL{route_fl:03d}, mais le champ niveau vaut FL{fl:03d}.')
        words=words[1:]
    if not words or words[0]!=dep: words.insert(0,dep)
    if words[-1]!=arr: words.append(arr)
    route=' '.join(words)
    if dep not in nav.ads: issue('ERREUR','AD de départ inconnu : '+dep)
    if arr not in nav.ads: issue('ERREUR','AD d’arrivée inconnu : '+arr)
    airways={e['route'] for e in nav.edges}; procedure_names={p['token'] for p in nav.procedures.items}; connectors=airways|procedure_names|{w for w in words if route_connector(w,nav,airways,procedure_names)}; parsed=[]; active_fra=set()
    resolved_by_word={}
    if not path:
        point_indices=[i for i,w in enumerate(words) if w not in connectors]
        try:resolved_by_word=dict(zip(point_indices,nav.resolve_sequence([words[i] for i in point_indices])))
        except ValueError as e:issue('ERREUR',str(e))
    preferred={e.get('procedure_id') for a,b,e in path if e.get('procedure_id')}
    # An airway name must sit between two points. Adjacent points mean implicit DCT.
    i=0
    try:
        current=resolved_by_word[0] if 0 in resolved_by_word else nav.resolve(words[0]); i=1
    except ValueError as e:
        issue('ERREUR',str(e)); current=None; i=1
    while not path and i<len(words):
        via='DCT'
        if words[i]=='DCT' or words[i] in connectors:
            via=words[i]; i+=1
            if i>=len(words): issue('ERREUR','Route incomplète après '+via); break
        word=words[i]; i+=1
        if word=='DCT' or word in connectors:
            issue('ERREUR','Point manquant avant '+word); current=None; continue
        try: target=resolved_by_word[i-1] if i-1 in resolved_by_word else nav.resolve_context(word,current,via,words[i:])
        except ValueError as e:
            issue('ERREUR',str(e)+' — ce point ne peut pas être localisé sans ambiguïté dans la couverture chargée.')
            current=None; continue
        if current is None: current=target; continue
        if current==target:
            issue('ERREUR','Point répété sans déplacement : '+word); continue
        if via in procedure_names:
            part=nav.procedures.expand(via,current,target,dep,arr,request.get('dep_runway',''),request.get('arr_runway',''),float(request.get('terminal_speed_kt',220)),preferred)
            if part is None:issue('ERREUR','Procédure non reliée aux points indiqués ou piste incompatible : '+via)
            else:parsed.extend(part)
            active_fra=set()
        elif via=='DCT':
            e=dict(route=via,nm=nm(nav.nodes[current],nav.nodes[target]))
            matches=nav.fra.match(current,target,fl,when,dep,arr,active_fra,strategy=='adapt') if request.get('enable_fra',True) and getattr(nav,'fra',None) else []
            if matches:
                hints=[x for u,v,x in path if x.get('kind')=='FRA' and nav.nodes[u]['id']==nav.nodes[current]['id'] and nav.nodes[v]['id']==nav.nodes[target]['id']]
                m=next((m for m in matches if any(h.get('fra_area')==m['area'] and h.get('fra_rows')==m['rows'] for h in hints)),matches[0]); e.update(kind='FRA',fra_area=m['area'],lower=m['lower'],upper=m['upper'],from_role=m['from_role'],to_role=m['to_role'],fra_rows=m['rows'],source_cycle=m['cycle'])
                active_fra={m['area']} if not m['exits'] else set()
            else: active_fra=set()
            parsed.append((current,target,e))
        else:
            active_fra=set()
            p=nav.path(nav.graph(None,via),current,target)
            if p is None and nav.path(nav.graph(None,via,directed=False),current,target) is not None:   # SOG-0078 : le chemin existe à contre-sens d'un segment à sens unique
                issue('ERREUR',f'Sens interdit : {via} est à sens unique et {nav.nodes[current]["id"]} → {word} le parcourt à contre-sens.')
            elif p is None:
                if nav.nodes[current]['id'] in nav.ads or word in nav.ads:
                    issue('ERREUR',f'Continuité absente dans AeroDB : {nav.nodes[current]["id"]} {via} {word}.')
                else:
                    reason=(f'Airway {via} absente des segments chargés' if via not in airways else f'Portion {via} non couverte entre ces points')
                    reason+=f" : {nav.nodes[current]['id']} → {word}. Tracé géométrique indicatif ; continuité et limites non vérifiables."
                    issue('REVUE',reason)
                    parsed.append((current,target,dict(route=via,kind='UNRESOLVED_AIRWAY',nm=nm(nav.nodes[current],nav.nodes[target]),data_gap=reason)))
            else: parsed.extend(p)
        current=target
    if path:parsed=[(a,b,e) for a,b,e in path if e.get('kind')!='FRA_GATE']
    for ident in mandatory:
        if ident in nav.ads and ident not in [dep,arr]:issue('REVUE',f'{ident} est survolé à l’altitude du profil, sans atterrissage. Raccords DCT AD–réseau de simulation, autorisation non vérifiée.')
    known_ids={dep,arr}; used_routes=set()
    for a,b,e in parsed:
        known_ids.update([nav.nodes[a]['id'],nav.nodes[b]['id']]); used_routes.add(e['route'])
        legs.append(dict(start=nav.nodes[a],end=nav.nodes[b],via=e['route'],kind=e.get('kind','AIRWAY' if e['route']!='DCT' else 'DCT'),
            data_gap=e.get('data_gap'),fra_area=e.get('fra_area'),from_role=e.get('from_role'),to_role=e.get('to_role'),fra_rows=e.get('fra_rows'),nm=round(e['nm'],2),
            lower=e.get('lower'),upper=e.get('upper'),node_constraints=e.get('node_constraints'),planned_speed_kt=e.get('planned_speed_kt'),speed_limit_ias=e.get('speed_limit_ias'),
            procedure_id=e.get('procedure_id'),procedure_name=e.get('procedure_name'),procedure_airport=e.get('airport'),runways=e.get('runways'),source_zone=e.get('zone'),source_cycle=e.get('source_cycle') or nav.cycles.get(e.get('zone')),
            direction=({'F':'sens unique','B':'sens unique','FB':'double sens'}.get(e.get('dir'),'inconnue') if e['route']!='DCT' else 'non vérifiée')))   # SOG-0078
    dep_elev=nav.ads.get(dep,{}).get('elev'); arr_elev=nav.ads.get(arr,{}).get('elev')
    if dep_elev is None or arr_elev is None: issue('REVUE','Élévation AD absente : 0 ft utilisé pour le modèle vertical de simulation.')
    profile=flight_profile.build(legs,dep_elev or 0,arr_elev or 0,fl,**options,strategy=strategy)
    for l in legs:
        if l.get('data_gap'):l['compatible']=None
        for text in l['vertical_errors']:
            issue('ERREUR',f'{l["via"]} {l["start"]["id"]}–{l["end"]["id"]} : {text}')
    if legs and not profile['feasible'] and not any(l['vertical_errors'] for l in legs):
        issue('ERREUR','Profil vertical impossible avec les altitudes AD et les taux de montée/descente saisis.')
    candidates=rad.candidates(dep,arr,known_ids,used_routes | {alias for route_name in used_routes for alias in rad_flight.aliases(route_name)})
    if request.get('unable_rnav'):
        for a,b,e in parsed:
            if e.get('kind') in ['SID','STAR','APPROACH_LINK']:
                p=next((p for p in nav.procedures.items if p['id']==e.get('procedure_id')),None);required=planning.procedure_rnav(p) if p else None
            elif e.get('kind')=='FRA':required=True
            elif e['route']=='DCT':required=None
            else:required=planning.rnav_edge(nav,a,b,e)['required']
            if required is not False:
                issue('ERREUR',f'Unable RNAV : {e["route"]} {nav.nodes[a]["id"]}–{nav.nodes[b]["id"]} : '+('RNAV requise.' if required else 'compatibilité conventionnelle non documentée.'))
    if request.get('require_fra') and not any(l.get('kind')=='FRA' for l in legs):issue('ERREUR','FRA imposé : aucun tronçon FRA reconnu dans la route contrôlée.')
    ordered=[nav.nodes[parsed[0][0]]['id']] if parsed else []
    ordered.extend(nav.nodes[b]['id'] for a,b,e in parsed)
    cursor=0; via_checks=[]
    for point in mandatory:
        try:
            cursor=ordered.index(point,cursor)+1; via_checks.append(dict(point=point,passed=True))
        except ValueError:
            via_checks.append(dict(point=point,passed=False)); issue('ERREUR','Point imposé non traversé dans l’ordre demandé : '+point)
    violations=[]
    for block in rad.blocks(dep,arr,None):
        affected=[l for l in legs if block_hit(block,l['start']['id'],l['end']['id'],l['via']) and
            (block.get('lower_ft') is None or l['altitude_max_ft']>=block['lower_ft'] and l['altitude_min_ft']<=block['upper_ft'])]
        hit=bool(affected)
        if hit:
            violations.append(block)
            issue('ERREUR',f'Interdiction RAD explicite {block["id"]} ({block["sheet"]}, ligne {block["row"]}).')
            for l in affected: l['alerts'].append('Interdiction RAD '+block['id'])
    # Full-flight conditions see the expanded SID/STAR, not only filed endpoints.
    elapsed=0.
    for leg in legs:
        leg['time_start_min']=elapsed;elapsed+=leg['nm']/(leg.get('planned_speed_kt') or options['speed_kt'])*60;leg['time_end_min']=elapsed
    rad_summary=rad_flight.evaluate(rad,legs,dep,arr,when,candidates,set(nav.ids)|used_routes)
    atomic_ids={(b['sheet'],b['row']) for b in violations}
    for finding in rad_summary['findings']:
        if (finding['sheet'],finding['row']) not in atomic_ids:issue('ERREUR',finding['text'])
        for index in finding['segments']:
            leg=legs[index];leg['alerts'].append('RAD '+finding['id']+' : '+', '.join(finding['phases']));leg['compatible']=False
    for c in candidates:
        if any(x['sheet']==c['sheet'] and x['row']==c['row'] for x in violations): c['assessment']='INFRACTION : interdiction simple H24 applicable'
    fra_loaded=bool(getattr(nav,'fra',None) and nav.fra.book)
    if request.get('use_procedures'):
        selected_kinds={l.get('kind') for l in legs}
        for ad,kind in [(dep,'SID'),(arr,'STAR')]:
            if kind not in selected_kinds:
                stats=nav.procedures.stats.get(ad,{})
                issue('REVUE',f'{ad} : aucune {kind} complète connectée utilisée ; raccord DCT de simulation. Catalogue : {stats.get(kind+"_total",0)} procédures, {stats.get(kind+"_usable",0)} résolues, {stats.get(kind+"_incomplete",0)} incomplètes, {stats.get(kind+"_doubt",0)} douteuses.')
    gaps=[dict(name='FRA : géométrie et NPZ',reason='Points FRA, rôles E/X/I/A/D, niveaux numériques et horaires simples utilisés. Volumes des FRA, NPZ et règles complexes non fournis par la liste de points : les liaisons sont des candidates à contrôler.' if fra_loaded else 'Aucune liste FRA ne couvre cette date. Les DCT ne sont pas des autorisations FRA.'),
          dict(name='Sens et vitesses limites',reason='Sens autorisés et limites de vitesse absents des fichiers airways ; vitesse sol saisie utilisée pour le profil.'),
          dict(name='RAD complet',reason='Le vol entier, SID/STAR développées comprises, est le périmètre du contrôle. Seules les formes de conditions explicitement prises en charge sont décidées. Conditions complexes, doublons ambigus, plafonnements conditionnels et géométrie des espaces restent à interpréter.'),
          dict(name='Procédures et environnement',reason='SID/STAR complètes sélectionnées depuis AeroDB, selon la piste. Tracé entre points codés, sans modèle de virage ni certification ARINC. Approche finale, IAS, parité, QNH, vent, performances, relief, NOTAM et activations EAUP/EUUP non évalués.')]
    if not rad.book: issue('REVUE','Aucun RAD fourni ne couvre cette date : contrôle RAD indisponible.')
    usedcycles={(e.get('zone'),e.get('source_cycle') or nav.cycles.get(e.get('zone'))) for _,_,e in parsed if e.get('zone')}
    for zone,cycle in sorted(usedcycles):
        if cycle and (when.date()-dt.date.fromisoformat(cycle)).days>=28:issue('REVUE',f'Cycle de navigation périmé pour {zone.upper()} : {cycle} (source des segments utilisés).')
    errors=[x for x in issues if x['level']=='ERREUR']
    data_gaps=[dict(start=l['start']['id'],end=l['end']['id'],via=l['via'],reason=l['data_gap']) for l in legs if l.get('data_gap')]
    status='ERREURS DÉTECTÉES' if errors else 'CONTRÔLE INCOMPLET — DONNÉES MANQUANTES' if data_gaps else 'CONTRÔLE PARTIEL — À VÉRIFIER'
    result=dict(ok=True,status=status,generated=generated,route=route,fl=fl,date=when.isoformat(timespec='minutes')+'Z',
        dep=dep,arr=arr,data_gaps=data_gaps,coverage_complete=not data_gaps,distance_nm=round(sum(l['nm'] for l in legs),1),legs=legs,issues=issues,rad=candidates,
        rad_source={k:rad.book[k] for k in ['file','title','start','end_exclusive','sha256']} if rad.book else None,
        coverage=nav.coverage,rad_summary=rad_summary,rad_atomic_rules=len(blocks),profile=profile,gaps=gaps,via=mandatory,via_checks=via_checks,
        fra_source=dict(file=nav.fra.book['file'],start=nav.fra.book['start'],sha256=nav.fra.book['sha256'],points=len(nav.fra.records)) if fra_loaded else None,
        procedures_used=list({l['procedure_id']:dict(id=l['procedure_id'],name=l['procedure_name'],airport=l['procedure_airport'],runways=l['runways'],cycle=l['source_cycle']) for l in legs if l.get('procedure_id')}.values()),
        procedure_coverage={ad:nav.procedures.stats.get(ad,{}) for ad in [dep,arr]},
        checked=['Identifiants et continuité des airways couvertes ; données manquantes signalées','Profil vertical contre plancher/plafond de chaque segment','RAD sur tout le vol : tous les points et segments SID / route / STAR, conditions simples prises en charge'],
        counts=dict(aerodromes=len(nav.ads),segments=len(nav.edges),points=len(nav.nodes)),
        limitation='Précontrôle de simulation, jamais une validation IFPS. Les mentions RAD sont des pistes à examiner, pas des infractions établies.')
    planning.metrics(result,request)
    result['report']=report(result)
    if _nav is None:nav.release_graph_caches()
    return result

def report(r):
    altitude=f'Altitude VFR {r.get("target_altitude_ft",r["fl"]*100):g} ft' if r.get('planning',{}).get('traffic')=='VFR' else f'FL{r["fl"]:03.0f}'
    lines=['ROUTESIM — SIMULATION',r['status'],'',r['route'],f'{altitude} · {r["date"]} · Distance du tracé : {r["distance_nm"]} NM',
        '',r['limitation'],'', 'CONTRÔLES']
    lines += [f'[{i["level"]}] {i["text"]}' for i in r['issues']]
    if r.get('estimate'):
        estimate=r['estimate'];lines+=['','OBJECTIF ET ESTIMATIONS',str(r.get('planning')),f'Durée : {estimate["duration_min"]:g} min ; carburant estimé : '+(str(estimate['fuel_kg'])+' kg' if estimate['fuel_kg'] is not None else 'non renseigné'),str(estimate.get('fuel_model'))]
    if r.get('rad_summary'):lines+=['','RAD — PÉRIMÈTRE VOL ENTIER',str(r['rad_summary'])]
    if r.get('proposal'):lines+=['','PROPOSITION DE REPLI NON VALIDÉE',r.get('proposal_note','')]
    if r.get('fra_stats'):lines+=['','FRA : '+str(r['fra_stats'])]
    if r.get('vfr_environment'):lines+=['','CONTRÔLES VFR : '+str(r['vfr_environment'])]
    lines += ['','COUVERTURE DU CONTRÔLE']+[g['name']+' : '+g['reason'] for g in r.get('gaps',[])]
    if r.get('profile'):
        p=r['profile']; lines += ['','PROFIL VERTICAL',f'Vitesse sol {p["speed_kt"]:g} kt ; montée {p["climb_fpm"]:g} ft/min ; descente {p["descent_fpm"]:g} ft/min.',
            f'Stratégie {p["strategy"]} ; maximum atteint {p["max_altitude_ft"]:g} ft ; durée {p["duration_min"]:g} min.']
        lines += [f'Palier FL{h["fl"]:g}, du NM {h["start_nm"]:.1f} au NM {h["end_nm"]:.1f}' for h in p['holds']]
    lines += ['','PASSAGES IMPOSÉS', ' → '.join(r.get('via',[])) or 'Aucun point intermédiaire imposé']
    lines += ['','PROCÉDURES SÉLECTIONNÉES']+[p['id']+' | '+p['name']+' | piste '+','.join(p['runways'])+' | cycle '+p['cycle'] for p in r.get('procedures_used',[])]
    lines += ['','RAD : '+(r['rad_source']['title'] if r['rad_source'] else 'indisponible'),
        f'{r["rad_atomic_rules"]} interdictions simples prises en charge à cette date et pour ces AD/ce FL.',
        f'{len(r["rad"])} mentions à examiner. Les règles sans mention explicite peuvent aussi s’appliquer.',
        'Les textes barrés du classeur sont retirés à l’import. Les lignes AMD/DEL et doublons ne sont pas fusionnés.']
    for x in r['rad']:
        lines += ['',f'{x["id"]} | {x["sheet"]}, ligne {x["row"]} | {x["change"] or "inchangé"}',x['reason'],x['validity'],x['assessment']]
        lines += [f'  {x["headers"][i] if i<len(x.get("headers",[])) else str(i+1)} : {v}' for i,v in enumerate(x['values'][4:],4) if v]
    lines += ['','SEGMENTS RÉSOLUS']
    lines += [f'{l["start"]["id"]:7s} {l["via"]:7s} {l["end"]["id"]:7s} {l["nm"]:7.2f} NM'+
              (f'   {l["lower"]}–{l["upper"]} ft' if l['lower'] is not None else '')+
              f' | vol {l.get("altitude_start_ft",0):g} → {l.get("altitude_end_ft",0):g} ft | GS {l.get("speed_kt",450):g} kt | '+
              ('limite publiée '+str(l['speed_limit_ias'])+' kt IAS' if l.get('speed_limit_ias') else 'vitesse limite non renseignée')+
              (' | contraintes aux points : '+str(l['node_constraints']) if l.get('node_constraints') else '')+
              (' | ALERTE : '+'; '.join(l['alerts']) if l.get('alerts') else '') for l in r['legs']]
    lines += ['','COUVERTURE AERODB']+[f'{x["zone"].upper()}: {x["cycle"]}, {x["segments"]} segments' for x in r['coverage']]
    return '\n'.join(lines)

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--request',required=True); p.add_argument('--output',required=True)
    args=p.parse_args()
    try: result=assess(load(args.request))
    except Exception as e: result=dict(ok=False,error=str(e))
    Path(args.output).write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')

if __name__=='__main__': main()
