"""Use the coded AeroDB SID/STAR point sequences; reject missing geometry and doubtful records."""
import collections,json,re
from pathlib import Path

def bounds(alt):
    if not alt:return None,None
    value=alt.get('ft');kind=alt.get('type')
    if not isinstance(value,(int,float)):return None,None
    return (value,value) if kind=='at' else (value,None) if kind=='min' else (None,value) if kind=='max' else (None,None)

class Catalog:
    def __init__(self,nav):self.nav=nav;self.loaded={};self.items=[];self.stats={}
    def prepare(self,ad):
        if ad in self.loaded:return
        nav=self.nav;root=nav.data_dir/'proc';candidates=[]   # SOG-0081 : data_dir
        manual=root/'manual'/(ad+'.json')
        if manual.exists():candidates.append(manual)
        for folder in sorted(root.iterdir(),reverse=True) if root.exists() else []:
            if folder.is_dir() and re.fullmatch(r'\d{4}-\d\d-\d\d',folder.name) and folder.name<=str(nav.date) and (folder/(ad+'.json')).exists():candidates.append(folder/(ad+'.json'))
        data=None
        for p in candidates:
            d=json.loads(p.read_text(encoding='utf-8-sig'))
            if d.get('cycle','9999')<=str(nav.date):data=d;break
        self.loaded[ad]=data
        stats=collections.Counter()
        if not data:self.stats[ad]={'absent':1};return
        for proc in data.get('procedures',[]):
            kind=proc.get('kind')
            if kind not in ['SID','STAR']:continue
            stats[kind+'_total']+=1
            if not proc.get('name') or not proc.get('id'):stats[kind+'_incomplete']+=1;continue
            if proc.get('status')=='doubt':stats[kind+'_doubt']+=1;continue
            points=[];valid=True
            for point in proc.get('points',[]):
                if point.get('phase')=='missed':continue
                if point.get('gap') or point.get('leg') in ['HM','HF','HA','RF','AF']:
                    valid=False;break
                p=dict(point)
                if not nav.valid(p):
                    keys=nav.ids.get(p.get('id'),[])
                    if not keys:valid=False;break
                    keys=sorted(keys,key=lambda k:nav_distance(nav,nav.nodes[k],nav.ads[ad]))
                    if nav_distance(nav,nav.nodes[keys[0]],nav.ads[ad])>200:valid=False;break
                    p.update(lat=nav.nodes[keys[0]]['lat'],lon=nav.nodes[keys[0]]['lon'])
                if not p.get('id'):valid=False;break
                p['key']=nav.add(p);points.append(p)
            if not valid or len(points)<(1 if proc.get('partial') and kind=='SID' else 2):stats[kind+'_incomplete']+=1;continue   # SOG-0374 : une SID « lue en partie » n'a que son point de sortie (le tracé n'est pas lu, jamais inventé)
            airport=dict(nav.ads[ad],id=ad,key=nav.resolve(ad),alt=None)
            sequence=([airport]+points) if kind=='SID' else (points+[airport])
            token=re.sub('[^A-Z0-9]','',proc['name'].upper())
            item=dict(proc,token=token,airport=ad,cycle=data.get('cycle'),sequence=sequence)
            self.items.append(item);stats[kind+('_partial' if proc.get('partial') else '_usable')]+=1      # SOG-0374 : une SID lue en partie n'est pas « utilisable » (ni libre le raccord DCT, ni dite complète)
        self.stats[ad]=dict(stats)

    def options(self,ad,kind,runway=''):
        self.prepare(ad)
        return [p for p in self.items if p['airport']==ad and p['kind']==kind and (not runway or runway in p.get('runways',[]))]

    def edges(self,p,speed=220):
        result=[];seq=p['sequence']
        for i,(a,b) in enumerate(zip(seq,seq[1:])):
            lo1,hi1=bounds(a.get('alt'));lo2,hi2=bounds(b.get('alt'))
            e=dict(route=p['token'],kind=p['kind'],nm=nav_distance(self.nav,a,b),lower=0,upper=66000,procedure_id=p['id'],procedure_name=p['name'],
                airport=p['airport'],runways=p.get('runways',[]),procedure_status=p.get('status'),partial=bool(p.get('partial')),source_cycle=p['cycle'],source=p.get('source'),planned_speed_kt=speed,
                node_constraints=dict(start_min=lo1,start_max=hi1,end_min=lo2,end_max=hi2),speed_limit_ias=b.get('kt'))
            if p['kind']=='STAR' and i==len(seq)-2:e['kind']='APPROACH_LINK'
            result.append((a['key'],b['key'],e))
        return result

    @staticmethod
    def flyable(p,ceiling_ft):
        """SOG-0529 : vrai si la procédure peut être volée du niveau de croisière `ceiling_ft` : son point d'entrée (STAR) ou de sortie (SID) n'EXIGE pas une altitude au-dessus de ce niveau (« au moins 12 000 ft » à EPL : pas au FL090). Sans niveau (None) : toujours vrai."""
        seq=p.get('sequence') or []
        if ceiling_ft is None or not seq:return True
        need=bounds((seq[0] if p['kind']=='STAR' else seq[-1]).get('alt'))[0]
        return not(isinstance(need,(int,float)) and need>ceiling_ft+.01)

    def add_graph(self,g,ad,kind,runway='',speed=220,unable_rnav=False,ceiling_ft=None):
        available=self.options(ad,kind,runway);used=0
        connected=set(g)|{v for es in g.values() for v,e in es}
        for p in available:
            if unable_rnav:
                from . import planning   # SOG-0081 : import relatif
                if planning.procedure_rnav(p) is not False:continue
            edges=self.edges(p,speed);endpoint=edges[-1][1] if kind=='SID' else edges[0][0]
            if not self.flyable(p,ceiling_ft):      # SOG-0529 : une procédure dont le point d'entrée (STAR) ou de sortie (SID) EXIGE une altitude au-dessus du niveau de croisière ne peut pas être volée de ce niveau : elle n'est pas « utilisée » (le raccord DCT de simulation prend alors le relais, DIT et jugé par la limite du RAD) ; LFBY → LFST au FL090 : toutes les STAR de LFST commencent à EPL « au moins 12 000 ft » : « CALCUL IMPOSSIBLE », l'IFPS « MISSING ROUTE DATA »
                self.above=getattr(self,'above',{});self.above.setdefault((ad,kind),set()).add(p['id']);self.stats.setdefault(ad,{})[kind+'_above_level']=len(self.above[(ad,kind)])
                continue
            if endpoint not in connected:continue
            if not p.get('partial'):used+=1      # SOG-0374 : une SID lue en partie ne remplace pas le raccord DCT de simulation (elle s'y ajoute : un tracé de plus à la recherche)
            # Independent states keep different runway/procedure paths from splicing together.
            for i,(u,v,e) in enumerate(edges):
                su=u if i==0 else u+'|PROC|'+p['id']
                sv=v if i==len(edges)-1 else v+'|PROC|'+p['id']
                self.nav.nodes[su]=self.nav.nodes[u];self.nav.nodes[sv]=self.nav.nodes[v]
                g.setdefault(su,[]).append((sv,e))
        return used

    def expand(self,token,start,end,dep,arr,runway_dep='',runway_arr='',speed=220,preferred=()):
        candidates=[]
        for p in self.items:
            if p['token']!=token:continue
            if preferred and p['id'] not in preferred:continue
            runway=runway_dep if p['kind']=='SID' else runway_arr
            if runway and runway not in p.get('runways',[]):continue
            if p['airport']!=(dep if p['kind']=='SID' else arr):continue
            seq=p['sequence']
            starts=[i for i,x in enumerate(seq) if x['key']==start]
            ends=[i for i,x in enumerate(seq) if x['key']==end]
            for a in starts:
                for b in ends:
                    if b>a:
                        part=self.edges(p,speed)[a:b];candidates.append(part)
        return min(candidates,key=lambda es:sum(e['nm'] for u,v,e in es)) if candidates else None

def nav_distance(nav,a,b):
    from . import engine   # SOG-0081 : import relatif
    return engine.nm(a,b)
