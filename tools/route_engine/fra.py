"""FRA candidate connectivity from the supplied EUROCONTROL significant-point workbook.
Point roles, numeric levels, simple UTC windows and entry/exit FLOS are enforced.
The workbooks do not provide area polygons or NPZ geometry; links remain candidates.
"""
import array,collections,datetime as dt,gzip,heapq,json,math,re
from pathlib import Path
from . import geo      # SOG-0468 (3)
CORRIDOR_EXCESS_NM=250   # SOG-0161 : détour maximal d'un point FRA par rapport à un tronçon dep → passages → arr (recherche « normale »)
LEVEL_HINT=None   # SOG-0587 : l'ensemble des niveaux du CLIC en cours (posé par plan.levels, rendu à None à sa fin) : les voisins de route libre de chaque point sont calculés UNE fois pour tous ces niveaux, la sélection est refaite par niveau ; None : le niveau seul
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

def orientation(value,role):
    """SOG-0610 : l'orientation de niveau (« EVEN » / « ODD ») qu'une LIGNE de la liste impose à son entrée (`E`) ou à sa sortie (`X`) ; None : aucune. La même lecture que `parity`."""
    if value in ['-','','ALL','ALL/ALL']:return None
    if value in ['EVEN/ODD','ODD/EVEN']:value=value.split('/')[0 if role=='E' else 1] if role in ['E','X'] else None
    return value if value in ['ODD','EVEN'] else None

def parity(value,fl,role):
    if value in ['-','','ALL','ALL/ALL','EVEN/ODD','ODD/EVEN']:
        if value in ['EVEN/ODD','ODD/EVEN']:
            value=value.split('/')[0 if role=='E' else 1] if role in ['E','X'] else '-'
        else:return True
    if value=='-':return True
    if value not in ['ODD','EVEN']:return False
    return fl%10==0 and (fl//10)%2==(1 if value=='ODD' else 0)

class Fra:
    _neigh=None      # SOG-0587 : par défaut dans la CLASSE (un Fra fait sans __init__, comme celui du cas K373, n'a ni cache ni compteur)
    near_pairs=0
    def __init__(self,nav,date,nm):
        self.nav=nav;self.nm=nm;self.records=[];self.by_key=collections.defaultdict(list);self.book=None
        self.near_pairs=0
        self._neigh=None      # SOG-0587 : (clé, contexte) des voisins du clic en cours : un seul gardé, vidé avec les autres caches du graphe (Nav.release_graph_caches)
        self.by_row={};self.by_id=collections.defaultdict(list);self.discards=[]      # SOG-0610 : les lignes par numéro de ligne et par nom de point ; les entrées et sorties écartées pour leur seule orientation, au dernier graphe
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
            self.records.append(r);self.by_key[key].append(r);self.by_row[r['row']]=r;self.by_id[r['id']].append(r)

    def eligible(self,r,fl,when,steps=False):
        return r['lower'] is not None and r['upper'] is not None and r['lower']<=fl*100 and (steps or fl*100<=r['upper']) and time_ok(r['time'],when) and not r['remarks']

    @staticmethod
    def airport_match(value,airport):return airport in re.findall(r'[A-Z0-9]{4}',value)

    def graph(self,g,dep,arr,fl,when,via=(),steps=False,density="normal"):
        nav=self.nav
        self.discards=[]      # SOG-0610 : les entrées et sorties écartées pour leur seule orientation de niveau, à ce niveau (`causes`)
        # SOG-0161 : les distances de ce graphe (des millions d'appels de nm) se calculent sur des positions dont le sinus et le cosinus sont faits une fois (même formule que engine.nm)
        trig={}
        def tr(p):
            t=trig.get(id(p))
            if t is None:
                la=math.radians(p['lat']);t=trig[id(p)]=(la,math.radians(p['lon']),math.cos(la),p)
            return t
        gmemo={}
        def goal_key(tg):      # SOG-0468 (2) : la clé de tri « distance d'un candidat à un but », la même pour tous les points de départ, calculée une fois par (candidat, but) ; la position en radians du candidat est dans son enregistrement (`_tr`)
            memo=gmemo.setdefault(id(tg[3]),{})
            def key(pair):
                o=pair[1];state=o['state'];v=memo.get(state)
                if v is None:v=memo[state]=fast(o['_tr'],tg)
                return v
            return key
        fast=geo.chord_nm      # SOG-0468 (3) : la formule de geo.py, sur les positions en radians de `tr`
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
        lvls=LEVEL_HINT if LEVEL_HINT and fl in LEVEL_HINT else frozenset((fl,))      # SOG-0587 : les niveaux du CLIC (plan.levels les pose) ; hors d'un clic : le niveau seul, rien n'est gardé
        ckey=(dep,arr,tuple(via),when.isoformat(timespec='minutes'),bool(steps),density,lvls)
        ctx=self._neigh[1] if self._neigh and self._neigh[0]==ckey else None
        if ctx is None:      # SOG-0587 : les points admissibles à l'UN des niveaux (la boîte, le couloir, l'heure et les remarques ne dépendent pas du niveau), dans l'ordre de la liste ; leurs voisins sont calculés UNE fois (`near`), pour tous les niveaux
            members=[]
            for r in self.records:
                p=nav.nodes[r['key']]
                if r['lower'] is None or r['upper'] is None or not self.time_ok_row(r,when) or not (latlo<=p['lat']<=lathi and lonlo<=p['lon']<=lonhi) or not in_corridor(p):continue
                if not any(r['lower']<=x*100 and (steps or x*100<=r['upper']) for x in lvls):continue
                members.append(dict(r,state=r['key']+'|FRA|'+r['area']+'|'+str(r['row']),_tr=tr(p),_i=len(members)))      # SOG-0468 (2) : `_tr` = les positions en radians du point, faites une fois (le dictionnaire reste local à ce graphe : les arêtes n'en reprennent que des valeurs)
            areas=collections.defaultdict(list)
            for r in members:areas[r['area']].append(r)
            ctx=dict(members=members,areas=areas,cells={},cand={},near={})
            if len(lvls)>1:self._neigh=(ckey,ctx)
        floor_ft=fl*100
        for r in ctx['members']:
            if not (r['lower']<=floor_ft and (steps or floor_ft<=r['upper'])):continue      # admissible à CE niveau (la condition de `eligible`)
            p=nav.nodes[r['key']];state=r['state'];nav.nodes[state]=p;groups[r['area']].append(r)
            enter=('E' in r['enroute'] and parity(r['flos'],fl,'E')) or ('D' in r['terminal'] and self.airport_match(r['dep'],dep))
            leave=('X' in r['enroute'] and parity(r['flos'],fl,'X')) or ('A' in r['terminal'] and self.airport_match(r['arr'],arr))
            if not enter and 'E' in r['enroute'] and orientation(r['flos'],'E'):self.discards.append(dict(code='fra_entry_orientation',area=r['area'],point=r['id'],fl=fl,parity=orientation(r['flos'],'E')))
            if not leave and 'X' in r['enroute'] and orientation(r['flos'],'X'):self.discards.append(dict(code='fra_exit_orientation',area=r['area'],point=r['id'],fl=fl,parity=orientation(r['flos'],'X')))
            gate=dict(route='DCT',nm=0,kind='FRA_GATE',fra_area=r['area'],lower=r['lower'],upper=r['upper'])
            if enter:g.setdefault(r['key'],[]).append((state,gate))
            if leave:g.setdefault(state,[]).append((r['key'],gate))
        shared=collections.defaultdict(list)      # SOG-0610 : le CHAÎNAGE : un point INTERMÉDIAIRE (rôle « I ») que deux aires voisines ont tous deux, au niveau demandé, relie les deux aires (la liste donne une ligne par aire à ce point) ; l'orientation de niveau ne joue que pour une entrée ou une sortie, jamais ici
        for records in groups.values():
            for r in records:
                if r['enroute']=='I':shared[r['key']].append(r)
        for rows in shared.values():
            for a in rows:
                for b in rows:
                    if a['area']!=b['area'] and max(a['lower'],b['lower'])<=min(a['upper'],b['upper']):g.setdefault(a['state'],[]).append((b['state'],dict(route='DCT',nm=0,kind='FRA_GATE',fra_area=b['area'],lower=max(a['lower'],b['lower']),upper=min(a['upper'],b['upper']),chained=True)))
        cand_cache=ctx['cand']
        def near_of(r,area,cells):      # SOG-0587 : les voisins d'un point parmi les points admissibles à l'un des niveaux, triés par distance (le tri est stable : l'ordre des égalités est celui des cases), avec le secteur de chacun ; rangés en tableaux (la mémoire d'un clic de douze niveaux)
            p=nav.nodes[r['key']]; la,lo=math.floor(p['lat']),math.floor(p['lon']);tp=tr(p)
            max_nm=900 if density=='wide' else 500
            if density=='wide':candidates=ctx['areas'][area]
            else:                       # les points d'une même case de 1° partagent leur liste de candidats (SOG-0161)
                candidates=cand_cache.get((area,la,lo))
                if candidates is None:candidates=cand_cache[(area,la,lo)]=[o for x in range(la-9,la+10) for y in range(lo-16,lo+17) for o in cells.get((x,y),[])]
            found=[]
            self.near_pairs+=len(candidates)      # SOG-0587 : le TRAVAIL des voisins (les paires examinées), pour que les cas bornent le calcul sans compter des secondes
            for other in candidates:
                if other['key']==r['key']:continue
                if not ('X' in other['enroute'] or other['enroute']=='I' or 'A' in other['terminal'] and self.airport_match(other['arr'],arr)):continue
                if max(r['lower'],other['lower'])>min(r['upper'],other['upper']):continue
                d=fast(tp,other['_tr'])
                if .1<d<=max_nm:found.append((d,other))
            found.sort(key=lambda pair:pair[0])
            sector=bytearray()
            for d,o in found:
                target=nav.nodes[o['key']];angle=math.atan2(target['lat']-p['lat'],(target['lon']-p['lon'])*math.cos(math.radians(p['lat'])))
                sector.append(int((angle+math.pi)/(math.pi/4))%8)
            return array.array('d',[d for d,o in found]),array.array('I',[o['_i'] for d,o in found]),bytes(sector)
        for area,records in groups.items():
            cells=ctx['cells'].get(area)
            if cells is None:
                cells=ctx['cells'][area]=collections.defaultdict(list)
                for r in ctx['areas'][area]:
                    p=nav.nodes[r['key']];cells[(math.floor(p['lat']),math.floor(p['lon']))].append(r)
            for r in records:
                can_depart='E' in r['enroute'] or r['enroute']=='I' or 'D' in r['terminal'] and self.airport_match(r['dep'],dep)
                if not can_depart:continue
                p=nav.nodes[r['key']];tp=tr(p)
                # Distances here are graph search settings, not FRA legal limits.
                # Wider search retries are automatic if the first topology fails.
                near=ctx['near'].get(r['state'])
                if near is None:near=ctx['near'][r['state']]=near_of(r,area,cells)
                neighbors=[];sector_of=[];members=ctx['members']      # SOG-0587 : la liste de CE niveau : les voisins admissibles à ce niveau, dans le même ordre
                for d,i,k in zip(near[0],near[1],near[2]):
                    o=members[i]
                    if o['lower']<=floor_ft and (steps or floor_ft<=o['upper']):neighbors.append((d,o));sector_of.append(k)
                goals=[nav.nodes[k] for k in resolved]+[nav.ads[arr]]
                goals=sorted(goals,key=lambda goal:fast(tp,tr(goal)))[:2]+[nav.ads[arr]]
                chosen=neighbors[:(100 if density=='wide' else 24)]
                chosen += [(d,o) for d,o in neighbors if 'X' in o['enroute']][:(40 if density=='wide' else 12)]
                for goal in goals:
                    chosen += heapq.nsmallest(8,neighbors,key=goal_key(tr(goal)))
                # Retain candidates in each compass sector, including directions
                # away from the arrival when a mandatory waypoint requires it.
                sectors=collections.defaultdict(list)
                for pair,k in zip(neighbors,sector_of):sectors[k].append(pair)
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

    def near_miss(self,a,b,fl,when,dep,arr,active_areas,steps=False):
        """SOG-0610 : un DIRECT entre deux points de route libre d'une même aire que `match` n'a pas retenu pour sa SEULE orientation de niveau : l'entrée (le premier point est une entrée « E » d'orientation autre que celle du niveau) ou la sortie (le second est une sortie « X »). Rend { code, area, point, parity } ou None ; le contrôle juge ensuite si l'avion est en croisière à ce point (`run_findings`)."""
        for r in self.by_key.get(a,[]):
            if not self.eligible(r,fl,when,steps):continue
            for s in self.by_key.get(b,[]):
                if s['area']!=r['area'] or not self.eligible(s,fl,when,steps):continue
                entry=('E' in r['enroute'] and parity(r['flos'],fl,'E')) or ('D' in r['terminal'] and self.airport_match(r['dep'],dep))
                continuation=r['area'] in active_areas and r['enroute'] in ('I','EX')      # SOG-0610 : un point « EX » (entrée et sortie) se traverse comme un point intermédiaire dans l'aire, comme dans le graphe de la recherche (l'orientation ne joue qu'à l'entrée et à la sortie de la suite)
                leave=('X' in s['enroute'] and parity(s['flos'],fl,'X')) or ('A' in s['terminal'] and self.airport_match(s['arr'],arr))
                if not (entry or continuation) and 'E' in r['enroute'] and orientation(r['flos'],'E') and (leave or s['enroute'] in ('I','EX')):
                    return dict(code='fra_entry_orientation',area=r['area'],point=r['id'],parity=orientation(r['flos'],'E'))
                if (entry or continuation) and not (leave or s['enroute'] in ('I','EX')) and 'X' in s['enroute'] and orientation(s['flos'],'X'):
                    return dict(code='fra_exit_orientation',area=s['area'],point=s['id'],parity=orientation(s['flos'],'X'))
        return None

    def active_after(self,m,target,fl,when,steps=False):
        """SOG-0610 : les aires ACTIVES après un tronçon de route libre `m` (un résultat de `match`) arrivé en `target` : la sienne tant qu'il n'en sort pas, et, quand il arrive à un point intermédiaire, les aires voisines qui ont aussi ce point en intermédiaire au niveau demandé (le chaînage)."""
        out={m['area']} if (not m['exits'] or m['to_role']=='EX') else set()
        if m['to_role']=='I':out|={s['area'] for s in self.by_key.get(target,[]) if s['enroute']=='I' and s['area']!=m['area'] and self.eligible(s,fl,when,steps)}
        return out

    def causes(self,used_areas=()):
        """SOG-0610 : pourquoi la recherche n'a pas pris une aire : les entrées et sorties écartées pour leur SEULE orientation de niveau au niveau demandé, une cause par aire et par code (l'aire, la parité qui passe, le niveau, trois points au plus) ; sans les aires que la route traverse. Rien n'est cherché de plus : lues au graphe déjà fait. ATTENTION : `discards` est l'état du dernier graphe fait (`Nav.last_fra_discards` le pose avant la lecture) : si deux plans partagent un même contexte, la cause peut être celle de l'autre demande (des points publics de la liste, jamais un secret)."""
        found={}
        for d in self.discards:
            if d['area'] in used_areas:continue
            c=found.setdefault((d['code'],d['area']),dict(code=d['code'],area=d['area'],fl=d['fl'],parity=d['parity'],points=[]))
            if d['point'] not in c['points'] and len(c['points'])<3:c['points'].append(d['point'])
        return sorted(found.values(),key=lambda c:(c['area'],c['code']))

    def run_findings(self,legs,cruise_fl,levels,when,dep,arr):
        """SOG-0610 : le contrôle juge chaque SUITE de tronçons de route libre : à son ENTRÉE (la ligne en rôle « E » : l'orientation de niveau) et à sa SORTIE (une ligne en rôle « X » de la même aire, au niveau volé : sa bande, son orientation ; une sortie par un point intermédiaire seul est une REVUE). Jugés seulement quand l'avion est EN CROISIÈRE au point (l'altitude du profil est le niveau) : en montée ou en descente, le niveau n'est pas celui de la ligne. Rend [{level, code, text, values}]."""
        out=[];n=len(legs);i=0
        for k,leg in enumerate(legs):
            miss=leg.get('fra_near_miss')
            if not miss:continue
            fl=levels[k] if levels and levels[k] else cruise_fl
            at=leg.get('altitude_start_ft') if miss['code']=='fra_entry_orientation' else leg.get('altitude_end_ft')
            if isinstance(at,(int,float)) and abs(at-fl*100)<=50:
                out.append(dict(level='ERREUR',code=miss['code'],values=dict(area=miss['area'],point=miss['point'],fl=fl,parity=miss['parity']),text=f"Route libre : {'entrée' if miss['code']=='fra_entry_orientation' else 'sortie'} de l'aire {miss['area']} à {miss['point']} au niveau FL{fl:03d} ; cette {'entrée' if miss['code']=='fra_entry_orientation' else 'sortie'} n'est ouverte qu'aux niveaux {'impairs' if miss['parity']=='ODD' else 'pairs'} (orientation de niveau de la liste Eurocontrol)."))
        while i<n:
            if legs[i].get('kind')!='FRA':i+=1;continue
            j=i
            while j+1<n and legs[j+1].get('kind')=='FRA' and legs[j+1]['start']['id']==legs[j]['end']['id']:j+=1
            out+=self._run_findings(legs,i,j,cruise_fl,levels,when,dep,arr,j+1<n and bool(legs[j+1].get('fra_near_miss')))
            i=j+1
        return out

    def _run_findings(self,legs,i,j,cruise_fl,levels,when,dep,arr,refused_next=False):
        out=[];first,last=legs[i],legs[j]
        def level_of(n):return (levels[n] if levels and levels[n] else cruise_fl)
        def steady(altitude,fl):return isinstance(altitude,(int,float)) and abs(altitude-fl*100)<=50
        fl=level_of(i);entry=self.by_row.get((first.get('fra_rows') or [None])[0])
        if entry and 'E' in entry['enroute'] and steady(first.get('altitude_start_ft'),fl):
            want=orientation(entry['flos'],'E')
            if want and not parity(entry['flos'],fl,'E') and not ('D' in entry['terminal'] and self.airport_match(entry['dep'],dep)):
                out.append(dict(level='ERREUR',code='fra_entry_orientation',values=dict(area=first['fra_area'],point=first['start']['id'],fl=fl,parity=want),text=f"Route libre : entrée de l'aire {first['fra_area']} à {first['start']['id']} au niveau FL{fl:03d} ; cette entrée n'est ouverte qu'aux niveaux {'impairs' if want=='ODD' else 'pairs'} (orientation de niveau de la liste Eurocontrol)."))
        fl=level_of(j);area=last.get('fra_area');end=last['end']['id']
        if steady(last.get('altitude_end_ft'),fl) and not refused_next:      # le direct suivant, refusé pour son orientation, le dit déjà
            rows=[x for x in self.by_id.get(end,[]) if x['area']==area and 'X' in x['enroute'] and self.time_ok_row(x,when)]
            arrival=any('A' in x['terminal'] and self.airport_match(x['arr'],arr) for x in self.by_id.get(end,[]) if x['area']==area)
            inside=[x for x in rows if x['lower'] is not None and x['upper'] is not None and x['lower']<=fl*100<=x['upper']]
            if arrival or any(parity(x['flos'],fl,'X') for x in inside):pass
            elif inside:
                want=orientation(inside[0]['flos'],'X')
                out.append(dict(level='ERREUR',code='fra_exit_orientation',values=dict(area=area,point=end,fl=fl,parity=want),text=f"Route libre : sortie de l'aire {area} à {end} au niveau FL{fl:03d} ; cette sortie n'est ouverte qu'aux niveaux {'impairs' if want=='ODD' else 'pairs'} (orientation de niveau de la liste Eurocontrol)."))
            elif any(isinstance(x['lower'],(int,float)) and isinstance(x['upper'],(int,float)) for x in rows):      # les lignes dont une borne est illisible ne donnent pas de bande (jamais une exception : la REVUE ci-dessous les dit)
                bands=[x for x in rows if isinstance(x['lower'],(int,float)) and isinstance(x['upper'],(int,float))];low=min(x['lower'] for x in bands);high=max(x['upper'] for x in bands)
                out.append(dict(level='ERREUR',code='fra_exit_band',values=dict(area=area,point=end,fl=fl,lower_fl=low//100,upper_fl=high//100),text=f"Route libre : sortie de l'aire {area} à {end} au niveau FL{fl:03d} ; la sortie n'existe qu'entre FL{low//100:03d} et FL{high//100:03d} (bande de la liste Eurocontrol)."))
            else:
                out.append(dict(level='REVUE',code='fra_exit_role',values=dict(area=area,point=end,fl=fl),text=f"Route libre : l'aire {area} est quittée à {end}, qui n'y est pas un point de sortie dans la liste Eurocontrol : à examiner."))
        return out

    def release(self):self._neigh=None

    def time_ok_row(self,r,when):return time_ok(r['time'],when) and not r['remarks']

    def match(self,a,b,fl,when,dep,arr,active_areas,steps=False):
        matches=[]
        for r in self.by_key.get(a,[]):
            if not self.eligible(r,fl,when,steps):continue
            for s in self.by_key.get(b,[]):
                if s['area']!=r['area'] or not self.eligible(s,fl,when,steps):continue
                entry=('E' in r['enroute'] and parity(r['flos'],fl,'E')) or ('D' in r['terminal'] and self.airport_match(r['dep'],dep))
                continuation=r['area'] in active_areas and r['enroute'] in ('I','EX')      # SOG-0610 : un point « EX » (entrée et sortie) se traverse comme un point intermédiaire dans l'aire, comme dans le graphe de la recherche (l'orientation ne joue qu'à l'entrée et à la sortie de la suite)
                exit_ok='X' in s['enroute'] and parity(s['flos'],fl,'X') or 'A' in s['terminal'] and self.airport_match(s['arr'],arr)
                if (entry or continuation) and (exit_ok or s['enroute'] in ('I','EX')):
                    matches.append(dict(area=r['area'],lower=max(r['lower'],s['lower']),upper=min(r['upper'],s['upper']),
                        from_role=r['enroute'],to_role=s['enroute'],exits=exit_ok,rows=[r['row'],s['row']],cycle=r['cycle']))
        return matches
