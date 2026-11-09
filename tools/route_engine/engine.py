"""RouteSim: local AeroDB routing and conservative RAD pre-check. Standard library only."""
from __future__ import annotations
import argparse, collections, datetime as dt, fnmatch, gzip, heapq, json, math, re
from pathlib import Path
from . import flight_profile                                  # SOG-0081 : imports relatifs (le moteur est le paquet tools/route_engine), seul changement avec les chemins ci-dessous
from . import fra as fra_module
from . import procedures as procedure_module

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

def profile_options(request):
    return dict(speed_kt=float(request.get('speed_kt',450)),climb_fps=float(request.get('climb_fpm',2000))/60,descent_fps=float(request.get('descent_fpm',2000))/60)

def via_points(request):
    value=request.get('via',[])
    if isinstance(value,str): value=re.split(r'[\s,;]+',value.strip().upper())
    points=[str(x).strip().upper() for x in value if str(x).strip()]
    if len(points)>8 or any(not re.fullmatch('[A-Z0-9]{2,7}',p) for p in points): raise ValueError('Via : jusqu’à 8 identifiants de points, séparés par des espaces.')
    return points

class Nav:
    def __init__(self,root,date):
        self.root=Path(root); self.date=date; self.nodes={}; self.ids=collections.defaultdict(list)
        self.data_dir=Path(DATA_DIR) if DATA_DIR else self.root/'data'   # SOG-0081 : DATA_DIR
        self.ads={}; self.edges=[]; self.cycles={}; self.coverage=[]
        base=self.data_dir/'sia/base'   # SOG-0081 : data_dir
        if not base.is_dir(): raise ValueError('Base introuvable : '+str(base))
        for zone in sorted(base.iterdir()):
            if not zone.is_dir(): continue
            dirs=sorted(p for p in zone.iterdir() if p.is_dir() and re.fullmatch(r'\d{4}-\d\d-\d\d',p.name) and p.name<=str(date))
            if not dirs: continue
            folder=dirs[-1]; self.cycles[zone.name]=folder.name
            def data(kind):
                p=folder/(kind+'.json')
                return load(p).get('data',[]) if p.exists() else []
            index=data('aeroindex')
            if isinstance(index,dict):
                for row in index.get('rows',[]):
                    a=dict(zip(index['fields'],row))
                    if self.valid(a):
                        self.ads[a['icao']]=a; self.add(dict(a,id=a['icao']))
            for kind in ['points','navaids']:
                for p in data(kind):
                    if self.valid(p) and p.get('id'): self.add(p)
            ways=data('airways')
            self.coverage.append(dict(zone=zone.name,cycle=folder.name,segments=len(ways)))
            for w in ways:
                if not self.valid(w.get('a',{})) or not self.valid(w.get('b',{})): continue
                a,b=self.add(w['a']),self.add(w['b'])
                self.edges.append(dict(a=a,b=b,route=w['route'],lower=w.get('lower'),upper=w.get('upper'),
                                       nm=nm(self.nodes[a],self.nodes[b]),zone=zone.name))
        if not self.edges: raise ValueError('Aucun segment airway dans les cycles disponibles à cette date.')
        self.fra=fra_module.Fra(self,date,nm)
        self._fra_graph_cache={}
        self.procedures=procedure_module.Catalog(self)

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

    def graph(self,fl=None,airway=None):
        g=collections.defaultdict(list)
        for e in self.edges:
            if airway and e['route']!=airway: continue
            if fl is not None and not self.level(e,fl): continue
            # Source has no directional metadata. Both directions are an explicit simulation assumption.
            g[e['a']].append((e['b'],e)); g[e['b']].append((e['a'],e))
        return g

    @staticmethod
    def level(e,fl):
        return isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100<=e['upper']

    def path(self,g,start,end):
        q=[(0,start)]; costs={start:0}; prev={}
        while q:
            cost,u=heapq.heappop(q)
            if cost!=costs[u]: continue
            if u==end:
                path=[]
                while u!=start:
                    p,e=prev[u]; path.append((p,u,e)); u=p
                return list(reversed(path))
            for v,e in g.get(u,[]):
                new=cost+e['nm']
                if new<costs.get(v,math.inf):
                    costs[v]=new; prev[v]=(u,e); heapq.heappush(q,(new,v))
        return None

    def routing_graph(self,dep,arr,fl,radius,blocks=(),profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None):
        if dep==arr: raise ValueError('Choisir deux aérodromes différents.')
        if dep not in self.ads or arr not in self.ads: raise ValueError('Aérodrome absent d’AeroDB : '+(dep if dep not in self.ads else arr))
        a,b=self.resolve(dep),self.resolve(arr); g=self.graph(None if allow_steps else fl)
        when=when or dt.datetime.combine(self.date,dt.time(12))
        if enable_fra and getattr(self,'fra',None) and self.fra.book:
            key=(dep,arr,fl,allow_steps,tuple(via),when.isoformat(timespec='minutes'))
            if key not in self._fra_graph_cache:
                self._fra_graph_cache[key]=self.fra.graph(g,dep,arr,fl,when,via,allow_steps)
                if len(self._fra_graph_cache)>6: self._fra_graph_cache.pop(next(iter(self._fra_graph_cache)))
            g={u:list(es) for u,es in self._fra_graph_cache[key].items()}
        for key in list(g):
            g[key]=[(other,e) for other,e in g[key] if isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100 and e['upper']>=e['lower'] and not any(block_hit(x,self.nodes[key]['id'],self.nodes[other]['id'],e['route']) for x in blocks)]
            if profile_options:
                # Conservative reachability: the direct distance is a lower bound on flown distance.
                # This avoids selecting high-floor edges before climb / after descent can reach them.
                def reachable(node):
                    return min(fl*100,(self.ads[dep].get('elev') or 0)+nm(self.ads[dep],self.nodes[node])*profile_options['climb_fps']*3600/profile_options['speed_kt'],
                        (self.ads[arr].get('elev') or 0)+nm(self.ads[arr],self.nodes[node])*profile_options['descent_fps']*3600/profile_options['speed_kt'])
                here=reachable(key)
                g[key]=[(v,e) for v,e in g[key] if e['lower']<=min(here,reachable(v))+.1]
            if not g[key]: del g[key]
        incoming=collections.defaultdict(list)
        for u,edges in g.items():
            for v,e in edges: incoming[v].append((u,e))
        terminal=terminal or {}; used_procs={}
        if terminal.get('use_procedures',False) and getattr(self,'procedures',None):
            for ad,kind,rwy in [(dep,'SID',terminal.get('dep_runway','')),(arr,'STAR',terminal.get('arr_runway',''))]:
                used_procs[ad]=self.procedures.add_graph(g,ad,kind,rwy,float(terminal.get('terminal_speed_kt',220)))
        # DCT fallback is explicit when no complete, connected procedure is available.
        for airport,isdep in [(a,True),(b,False)]:
            if used_procs.get(dep if isdep else arr):continue
            near=sorted((nm(self.nodes[airport],self.nodes[k]),k) for k in set(g)|set(incoming) if k not in [a,b] and '|FRA|' not in k)
            near=[(d,k) for d,k in near if d<=radius]
            if not near: raise ValueError(f'Aucun point du réseau au FL{fl:03d} à moins de {radius:g} NM de {self.nodes[airport]["id"]}. Couverture ou niveau insuffisant.')
            for d,k in near:
                if profile_options:
                    rate=profile_options['climb_fps'] if isdep else profile_options['descent_fps']
                    elevation=self.ads[dep if isdep else arr].get('elev') or 0
                    reachable=elevation+d/profile_options['speed_kt']*3600*rate
                    neighbors=g.get(k,[]) if isdep else incoming.get(k,[])
                    if not any(e.get('lower',0)<=reachable+.1 for _,e in neighbors if not e.get('connector')): continue
                ids=(self.nodes[airport]['id'],self.nodes[k]['id']) if isdep else (self.nodes[k]['id'],self.nodes[airport]['id'])
                if any(block_hit(x,*ids,'DCT') for x in blocks): continue
                e=dict(route='DCT',nm=d,connector=True)
                if isdep: g.setdefault(airport,[]).append((k,e))
                else: g.setdefault(k,[]).append((airport,e))
        return g,a,b

    def resolve_vias(self,g,start,end,via):
        found=[]
        for ident in via:
            keys=list(self.ids.get(ident,[])); keys.extend(k for k in g if ('|FRA|' in k or '|PROC|' in k) and self.nodes[k]['id']==ident)
            candidates=[key for key in keys if key in g and self.path(g,start,key) is not None and self.path(g,key,end) is not None]
            if not candidates:
                known=bool(self.ids.get(ident))
                detail='point inconnu des bases chargées' if not known else 'aucun chemin continu départ → point → arrivée dans le réseau filtré par niveaux, profil, FRA et RAD'
                raise ValueError(f'Point imposé {ident} : {detail}. Le passage n’a pas été supprimé.')
            positions={(round(self.nodes[k]['lat'],3),round(self.nodes[k]['lon'],3)) for k in candidates}
            if len(positions)>1: raise ValueError('Point imposé géographiquement ambigu : '+ident)
            # A single geographical point may have physical and FRA states. Pick the best complete passage.
            choice=min(candidates,key=lambda k:sum(e['nm'] for a,b,e in self.path(g,start,k))+sum(e['nm'] for a,b,e in self.path(g,k,end)))
            found.append(choice)
        return found

    def constrained_path(self,g,start,end,waypoints=()):
        result=[]; previous=start
        for target in [*waypoints,end]:
            part=self.path(g,previous,target)
            if part is None: return None
            result.extend(part); previous=target
        return result

    def generate(self,dep,arr,fl,radius,blocks=(),profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None):
        g,a,b=self.routing_graph(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,terminal)
        mandatory=self.resolve_vias(g,a,b,via)
        path=self.constrained_path(g,a,b,mandatory)
        if path is None: raise ValueError('Aucune route trouvée sur le réseau disponible à ce niveau. Essayer un autre FL ou une autre paire d’AD. Aucun DCT intermédiaire n’a été inventé.')
        return self.format_path(dep,path,via),path

    def format_path(self,dep,path,via=()):
        words=[dep]; last=None
        for u,v,e in path:
            if e.get('kind')=='FRA_GATE': continue
            if last==e['route'] and last!='DCT' and words[-1] not in via: words[-1]=self.nodes[v]['id']
            else: words.extend([e['route'],self.nodes[v]['id']])
            last=e['route']
        return ' '.join(words)

    def alternate_routes(self,dep,arr,fl,radius,blocks=(),count=3,profile_options=None,allow_steps=False,via=(),when=None,enable_fra=True,terminal=None):
        """Yen's loopless k-shortest paths, keeping geographically distinct airway options."""
        g,start,end=self.routing_graph(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,terminal)
        mandatory=self.resolve_vias(g,start,end,via)
        first=self.constrained_path(g,start,end,mandatory)
        if first is None: return []
        def sig(path): return tuple((a,b,e['route']) for a,b,e in path)
        def internal(path): return {(a,b) for a,b,e in path if e['route']!='DCT'}
        accepted=[first]; selected=[first]; waiting=[]; seen={sig(first)}; serial=0
        # Examine at most 45 shortest simple paths. No invented intermediate DCT.
        for _ in range(5 if len(g)>6000 else 18):
            previous=accepted[-1]
            for i in range(len(previous)):
                root=previous[:i]; spur=previous[i][0]
                banned_nodes={a for a,b,e in root}
                banned_edges={sig(p)[i] for p in accepted if len(p)>i and sig(p)[:i]==sig(root)}
                sub={u:[(v,e) for v,e in es if v not in banned_nodes and (u,v,e['route']) not in banned_edges]
                     for u,es in g.items() if u not in banned_nodes}
                visited=[a for a,b,e in root]+[spur]; consumed=0
                for key in visited:
                    if consumed<len(mandatory) and key==mandatory[consumed]: consumed+=1
                tail=self.constrained_path(sub,spur,end,mandatory[consumed:])
                if tail is None: continue
                path=root+tail; signature=sig(path)
                if signature in seen: continue
                seen.add(signature); serial+=1
                heapq.heappush(waiting,(sum(e['nm'] for a,b,e in path),serial,path))
            if not waiting: break
            _,_,path=heapq.heappop(waiting); accepted.append(path)
            edges=internal(path)
            # Tiny airport connector changes alone do not count as another route.
            distinct=all(len(edges & internal(p))/max(1,len(edges | internal(p)))<0.88 for p in selected)
            if distinct: selected.append(path)
            if len(selected)>=count: break
        return [self.format_path(dep,p,via) for p in selected[:count]]

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
        return blocks

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

def assess(request,_nav=None,_rad=None):
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
    nav=_nav or Nav(request.get('root','E:/defa'),when.date()); rad=_rad or Rad(when.date())
    if getattr(nav,'procedures',None):
        for ad in [dep,arr]:
            if ad in nav.ads:nav.procedures.prepare(ad)
    generated=request.get('mode','calculate')=='calculate'; blocks=rad.blocks(dep,arr,fl)
    route=str(request.get('route','')).strip().upper(); issues=[]; legs=[]
    def issue(level,text): issues.append(dict(level=level,text=text))
    if generated:
        radius=float(request.get('radius',40))
        if not 1<=radius<=100: raise ValueError('Rayon de raccordement : 1 à 100 NM.')
        route,path=nav.generate(dep,arr,fl,radius,blocks,options,strategy=='adapt',mandatory,when,request.get('enable_fra',True),request)
    else:
        if not route: raise ValueError('Coller une route à contrôler.')
        path=[]
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
    airways={e['route'] for e in nav.edges}; procedure_names={p['token'] for p in nav.procedures.items}; connectors=airways|procedure_names; parsed=[]; active_fra=set()
    preferred={e.get('procedure_id') for a,b,e in path if e.get('procedure_id')} if generated else set()
    # An airway name must sit between two points. Adjacent points mean implicit DCT.
    i=0
    try:
        current=nav.resolve(words[0]); i=1
    except ValueError as e:
        issue('ERREUR',str(e)); current=None; i=1
    while i<len(words):
        via='DCT'
        if words[i]=='DCT' or words[i] in connectors:
            via=words[i]; i+=1
            if i>=len(words): issue('ERREUR','Route incomplète après '+via); break
        word=words[i]; i+=1
        if word=='DCT' or word in connectors:
            issue('ERREUR','Point manquant avant '+word); current=None; continue
        try: target=nav.resolve_context(word,current,via,words[i:])
        except ValueError as e:
            issue('ERREUR',str(e)+' — les SID/STAR, coordonnées et changements de niveau ne sont pas analysés dans cette version.')
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
                m=matches[0]; e.update(kind='FRA',fra_area=m['area'],lower=m['lower'],upper=m['upper'],from_role=m['from_role'],to_role=m['to_role'],fra_rows=m['rows'],source_cycle=m['cycle'])
                active_fra={m['area']} if not m['exits'] else set()
            else: active_fra=set()
            parsed.append((current,target,e))
        else:
            active_fra=set()
            p=nav.path(nav.graph(None,via),current,target)
            if p is None:
                issue('ERREUR',f'Continuité absente dans AeroDB : {nav.nodes[current]["id"]} {via} {word}.')
            else: parsed.extend(p)
        current=target
    known_ids={dep,arr}; used_routes=set()
    for a,b,e in parsed:
        known_ids.update([nav.nodes[a]['id'],nav.nodes[b]['id']]); used_routes.add(e['route'])
        legs.append(dict(start=nav.nodes[a],end=nav.nodes[b],via=e['route'],kind=e.get('kind','AIRWAY' if e['route']!='DCT' else 'DCT'),
            fra_area=e.get('fra_area'),from_role=e.get('from_role'),to_role=e.get('to_role'),fra_rows=e.get('fra_rows'),nm=round(e['nm'],2),
            lower=e.get('lower'),upper=e.get('upper'),node_constraints=e.get('node_constraints'),planned_speed_kt=e.get('planned_speed_kt'),speed_limit_ias=e.get('speed_limit_ias'),
            procedure_id=e.get('procedure_id'),procedure_name=e.get('procedure_name'),runways=e.get('runways'),source_zone=e.get('zone'),source_cycle=e.get('source_cycle') or nav.cycles.get(e.get('zone')),
            direction='inconnue' if e['route']!='DCT' else 'non vérifiée'))
    dep_elev=nav.ads.get(dep,{}).get('elev'); arr_elev=nav.ads.get(arr,{}).get('elev')
    if dep_elev is None or arr_elev is None: issue('REVUE','Élévation AD absente : 0 ft utilisé pour le modèle vertical de simulation.')
    profile=flight_profile.build(legs,dep_elev or 0,arr_elev or 0,fl,**options,strategy=strategy)
    for l in legs:
        for text in l['vertical_errors']:
            issue('ERREUR',f'{l["via"]} {l["start"]["id"]}–{l["end"]["id"]} : {text}')
    if legs and not profile['feasible'] and not any(l['vertical_errors'] for l in legs):
        issue('ERREUR','Profil vertical impossible avec les altitudes AD et les taux de montée/descente saisis.')
    candidates=rad.candidates(dep,arr,known_ids,used_routes)
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
          dict(name='RAD complet',reason='Seules les interdictions simples H24 prises en charge sont évaluées. Exceptions, plafonnements conditionnels, horaires et espaces traversés non évalués.'),
          dict(name='Procédures et environnement',reason='SID/STAR complètes sélectionnées depuis AeroDB, selon la piste. Tracé entre points codés, sans modèle de virage ni certification ARINC. Approche finale, IAS, parité, QNH, vent, performances, relief, NOTAM et activations EAUP/EUUP non évalués.')]
    if not rad.book: issue('REVUE','Aucun RAD fourni ne couvre cette date : contrôle RAD indisponible.')
    usedzones={e.get('zone') for _,_,e in parsed if e.get('zone')}
    for z in usedzones:
        cyc=dt.date.fromisoformat(nav.cycles[z])
        if (when.date()-cyc).days>=28: issue('REVUE',f'Cycle de navigation périmé pour {z.upper()} : {cyc}.')
    errors=[x for x in issues if x['level']=='ERREUR']
    status='ERREURS DÉTECTÉES' if errors else 'CONTRÔLE PARTIEL — À VÉRIFIER'
    result=dict(ok=True,status=status,generated=generated,route=route,fl=fl,date=when.isoformat(timespec='minutes')+'Z',
        dep=dep,arr=arr,distance_nm=round(sum(l['nm'] for l in legs),1),legs=legs,issues=issues,rad=candidates,
        rad_source={k:rad.book[k] for k in ['file','title','start','end_exclusive','sha256']} if rad.book else None,
        coverage=nav.coverage,rad_atomic_rules=len(blocks),profile=profile,gaps=gaps,via=mandatory,via_checks=via_checks,
        fra_source=dict(file=nav.fra.book['file'],start=nav.fra.book['start'],sha256=nav.fra.book['sha256'],points=len(nav.fra.records)) if fra_loaded else None,
        procedures_used=list({l['procedure_id']:dict(id=l['procedure_id'],name=l['procedure_name'],runways=l['runways'],cycle=l['source_cycle']) for l in legs if l.get('procedure_id')}.values()),
        procedure_coverage={ad:nav.procedures.stats.get(ad,{}) for ad in [dep,arr]},
        checked=['Identifiants et continuité des airways','Profil vertical contre plancher/plafond de chaque segment','Interdictions RAD simples prises en charge'],
        counts=dict(aerodromes=len(nav.ads),segments=len(nav.edges),points=len(nav.nodes)),
        limitation='Précontrôle de simulation, jamais une validation IFPS. Les mentions RAD sont des pistes à examiner, pas des infractions établies.')
    result['report']=report(result)
    return result

def report(r):
    lines=['ROUTESIM — SIMULATION',r['status'],'',r['route'],f'FL{r["fl"]:03d} · {r["date"]} · Distance des segments résolus : {r["distance_nm"]} NM',
        '',r['limitation'],'', 'CONTRÔLES']
    lines += [f'[{i["level"]}] {i["text"]}' for i in r['issues']]
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
