"""FRA candidate connectivity from the supplied EUROCONTROL significant-point workbook.
Point roles, numeric levels, simple UTC windows and entry/exit FLOS are enforced.
The workbooks do not provide area polygons or NPZ geometry; links remain candidates.
"""
import collections,datetime as dt,gzip,heapq,json,math,re
from pathlib import Path
CORRIDOR_EXCESS_NM=250   # SOG-0161 : détour maximal d'un point FRA par rapport à un tronçon dep → passages → arr (recherche « normale »)
FRA_FILE=None   # SOG-0081 : chemin de fra.json.gz posé par le travail du lanceur (data/route/fra.json.gz) ; None : à côté du module, comme RouteSim 2

def coord(text):
    if not re.fullmatch('[NSEW]\\d{6,7}',text): return None
    n=text[1:]; return (int(n[:-4])+int(n[-4:-2])/60+int(n[-2:])/3600)*(-1 if text[0] in 'SW' else 1)

def limit(text):
    s=text.strip().upper()
    m=re.fullmatch(r'FL\s*(\d{2,3})',s)
    if m:return int(m[1])*100
    m=re.fullmatch(r'(\d+)\s*(?:FT|FEET)',s)
    if m:return int(m[1])
    if s in ['GND','SFC']:return 0
    if s in ['UNL','UNLIMITED']:return 66000
    return None

def time_ok(value,when):
    if value=='H24':return True
    m=re.fullmatch(r'(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)',value)
    if not m:return False
    a=int(m[1])*60+int(m[2]);b=int(m[3])*60+int(m[4]); t=when.hour*60+when.minute
    return a<=t<b if a<b else t>=a or t<b

def parity(value,fl,role):
    if value in ['-','','ALL','ALL/ALL','EVEN/ODD','ODD/EVEN']:
        if value in ['EVEN/ODD','ODD/EVEN']:
            value=value.split('/')[0 if role=='E' else 1] if role in ['E','X'] else '-'
        else:return True
    if value=='-':return True
    if value not in ['ODD','EVEN']:return False
    return fl%10==0 and (fl//10)%2==(1 if value=='ODD' else 0)

class Fra:
    def __init__(self,nav,date,nm):
        self.nav=nav;self.nm=nm;self.records=[];self.by_key=collections.defaultdict(list);self.book=None
        path=Path(FRA_FILE) if FRA_FILE else Path(__file__).resolve().parent/'fra.json.gz'   # SOG-0081 : FRA_FILE
        if not path.exists():return
        with gzip.open(path,'rt',encoding='utf-8') as f:books=json.load(f)
        possible=[b for b in books if b['start']<=str(date)<str(dt.date.fromisoformat(b['start'])+dt.timedelta(days=28))]
        if not possible:return
        self.book=max(possible,key=lambda b:b['start'])
        for record in self.book['rows']:
            v=record['v'];lat,lon=coord(v[3]),coord(v[4]);limits=v[11].split('/')
            if lat is None or lon is None or len(limits)!=2 or v[0]=='DEL':continue
            lo,hi=map(limit,limits)
            key=nav.add(dict(id=v[2],lat=lat,lon=lon))
            r=dict(key=key,id=v[2],area=v[5],enroute=v[6],terminal=v[7],arr=v[8],dep=v[9],flos=v[10],
                   lower=lo,upper=hi,time=v[12],remarks=v[14],row=record['row'],cycle=self.book['start'])
            self.records.append(r);self.by_key[key].append(r)

    def eligible(self,r,fl,when,steps=False):
        return r['lower'] is not None and r['upper'] is not None and r['lower']<=fl*100 and (steps or fl*100<=r['upper']) and time_ok(r['time'],when) and not r['remarks']

    @staticmethod
    def airport_match(value,airport):return airport in re.findall(r'[A-Z0-9]{4}',value)

    def graph(self,g,dep,arr,fl,when,via=(),steps=False,density="normal"):
        nav=self.nav
        # SOG-0161 : les distances de ce graphe (des millions d'appels de nm) se calculent sur des positions dont le sinus et le cosinus sont faits une fois (même formule que engine.nm)
        trig={}
        def tr(p):
            t=trig.get(id(p))
            if t is None:
                la=math.radians(p['lat']);t=trig[id(p)]=(la,math.radians(p['lon']),math.cos(la),p)
            return t
        gmemo={}
        def to_goal(o,tg):      # distance d'un candidat à un but : la même pour tous les points de départ, calculée une fois
            k=(o['state'],id(tg[3]))
            v=gmemo.get(k)
            if v is None:v=gmemo[k]=fast(tr(nav.nodes[o['key']]),tg)
            return v
        def fast(a,b):
            return 3440.065*2*math.asin(min(1,math.sqrt(math.sin((b[0]-a[0])/2)**2+a[2]*b[2]*math.sin((b[1]-a[1])/2)**2)))
        resolved=nav.resolve_sequence(via,nav.resolve(dep),nav.resolve(arr))
        anchor=[nav.ads[dep],nav.ads[arr]]+[nav.nodes[k] for k in resolved]
        latlo=min(p['lat'] for p in anchor)-4; lathi=max(p['lat'] for p in anchor)+4
        lonlo=min(p['lon'] for p in anchor)-6; lonhi=max(p['lon'] for p in anchor)+6
        groups=collections.defaultdict(list)
        # SOG-0161 : recherche « normale » : seuls les points dont le détour par rapport à un tronçon dep → passages → arr ne dépasse pas 250 NM (une ellipse de ~460 NM de demi-largeur au milieu d'un trajet de 1 600 NM) sont des sommets du graphe ;
        # « wide » (le deuxième essai automatique du plan) garde toute l'emprise : le graphe FRA coûtait 12 s sur ESSB → LEMO, le détour borné en coûte 3
        legs=[(tr(x),tr(y),fast(tr(x),tr(y))) for x,y in zip(anchor,anchor[1:])]
        def in_corridor(p):
            if density=='wide' or not legs:return True
            q=tr(p)
            return any(fast(a,q)+fast(q,b)-d<=CORRIDOR_EXCESS_NM for a,b,d in legs)
        for r in self.records:
            p=nav.nodes[r['key']]
            if not (latlo<=p['lat']<=lathi and lonlo<=p['lon']<=lonhi) or not in_corridor(p) or not self.eligible(r,fl,when,steps):continue
            state=r['key']+'|FRA|'+r['area']+'|'+str(r['row']);nav.nodes[state]=p
            r=dict(r,state=state);groups[r['area']].append(r)
            enter=('E' in r['enroute'] and parity(r['flos'],fl,'E')) or ('D' in r['terminal'] and self.airport_match(r['dep'],dep))
            leave=('X' in r['enroute'] and parity(r['flos'],fl,'X')) or ('A' in r['terminal'] and self.airport_match(r['arr'],arr))
            gate=dict(route='DCT',nm=0,kind='FRA_GATE',fra_area=r['area'],lower=r['lower'],upper=r['upper'])
            if enter:g.setdefault(r['key'],[]).append((state,gate))
            if leave:g.setdefault(state,[]).append((r['key'],gate))
        cand_cache={}
        for area,records in groups.items():
            cells=collections.defaultdict(list)
            for r in records:
                p=nav.nodes[r['key']];cells[(math.floor(p['lat']),math.floor(p['lon']))].append(r)
            for r in records:
                can_depart='E' in r['enroute'] or r['enroute']=='I' or 'D' in r['terminal'] and self.airport_match(r['dep'],dep)
                if not can_depart:continue
                p=nav.nodes[r['key']]; la,lo=math.floor(p['lat']),math.floor(p['lon']);neighbors=[];tp=tr(p)
                # Distances here are graph search settings, not FRA legal limits.
                # Wider search retries are automatic if the first topology fails.
                max_nm=900 if density=='wide' else 500
                if density=='wide':candidates=records
                else:                       # les points d'une même case de 1° partagent leur liste de candidats (SOG-0161)
                    candidates=cand_cache.get((area,la,lo))
                    if candidates is None:candidates=cand_cache[(area,la,lo)]=[o for x in range(la-9,la+10) for y in range(lo-16,lo+17) for o in cells.get((x,y),[])]
                for other in candidates:
                    if other['key']==r['key']:continue
                    if not ('X' in other['enroute'] or other['enroute']=='I' or 'A' in other['terminal'] and self.airport_match(other['arr'],arr)):continue
                    if max(r['lower'],other['lower'])>min(r['upper'],other['upper']):continue
                    d=fast(tp,tr(nav.nodes[other['key']]))
                    if .1<d<=max_nm:neighbors.append((d,other))
                neighbors.sort(key=lambda pair:pair[0])
                goals=[nav.nodes[k] for k in resolved]+[nav.ads[arr]]
                goals=sorted(goals,key=lambda goal:fast(tp,tr(goal)))[:2]+[nav.ads[arr]]
                chosen=neighbors[:(100 if density=='wide' else 24)]
                chosen += [(d,o) for d,o in neighbors if 'X' in o['enroute']][:(40 if density=='wide' else 12)]
                for goal in goals:
                    tg=tr(goal);chosen += heapq.nsmallest(8,neighbors,key=lambda pair:to_goal(pair[1],tg))
                # Retain candidates in each compass sector, including directions
                # away from the arrival when a mandatory waypoint requires it.
                sectors=collections.defaultdict(list)
                for d,o in neighbors:
                    target=nav.nodes[o['key']];angle=math.atan2(target['lat']-p['lat'],(target['lon']-p['lon'])*math.cos(math.radians(p['lat'])))
                    sectors[int((angle+math.pi)/(math.pi/4))%8].append((d,o))
                for values in sectors.values():chosen+=values[:4]
                chosen += [(d,o) for d,o in neighbors if o['id'] in via]
                used=set()
                for d,o in chosen:
                    if o['state'] in used:continue
                    used.add(o['state'])
                    lower=max(r['lower'],o['lower']);upper=min(r['upper'],o['upper'])
                    if lower>upper:continue
                    g.setdefault(r['state'],[]).append((o['state'],dict(route='DCT',kind='FRA',fra_area=area,nm=d,lower=lower,upper=upper,
                        from_role=r['enroute'] or r['terminal'],to_role=o['enroute'] or o['terminal'],fra_rows=[r['row'],o['row']],source_cycle=r['cycle'])))
        return g

    def match(self,a,b,fl,when,dep,arr,active_areas,steps=False):
        matches=[]
        for r in self.by_key.get(a,[]):
            if not self.eligible(r,fl,when,steps):continue
            for s in self.by_key.get(b,[]):
                if s['area']!=r['area'] or not self.eligible(s,fl,when,steps):continue
                entry=('E' in r['enroute'] and parity(r['flos'],fl,'E')) or ('D' in r['terminal'] and self.airport_match(r['dep'],dep))
                continuation=r['area'] in active_areas and r['enroute']=='I'
                exit_ok='X' in s['enroute'] and parity(s['flos'],fl,'X') or 'A' in s['terminal'] and self.airport_match(s['arr'],arr)
                if (entry or continuation) and (exit_ok or s['enroute']=='I'):
                    matches.append(dict(area=r['area'],lower=max(r['lower'],s['lower']),upper=min(r['upper'],s['upper']),
                        from_role=r['enroute'],to_role=s['enroute'],exits=exit_ok,rows=[r['row'],s['row']],cycle=r['cycle']))
        return matches
