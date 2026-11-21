"""RouteSim: local AeroDB routing and conservative RAD pre-check. Standard library only."""
from __future__ import annotations
import argparse, collections, datetime as dt, fnmatch, functools, gzip, heapq, json, math, re
from pathlib import Path
from . import flight_profile                                  # SOG-0081 : imports relatifs (le moteur est le paquet tools/route_engine), seul changement avec les chemins ci-dessous
from . import fra as fra_module
from . import procedures as procedure_module
from . import planning
from . import rad_flight
from . import nav_data
from . import nat_layer     # SOG-0263
from . import geo     # SOG-0468 (3) : la formule du grand cercle, une fois
from . import level_rule      # SOG-0530 lot B : le contrôle du niveau de croisière contre la règle semi-circulaire (un avertissement)
from . import fra_floor      # SOG-0401 (lot 3) : les voies volées au-dessus du plancher de route libre (RAD, annexe 3B « FRA LIM »)
from . import dct_limits    # SOG-0401 (lot 3) : la limite des directs au raccord d'un terrain (RAD, annexe 3A « Conditions »)
from . import space_dct      # SOG-0513 lot C : la limite d'un direct dans un espace (RAD, annexe 3B FRA LIM : EGTTNFRA)

HERE = Path(__file__).resolve().parent
DATA_DIR = None   # SOG-0081 : dossier des données (sia/base, proc) posé par le travail du lanceur ; None : <root>/data, comme RouteSim 2
SEARCH_CAP_S = 120.0   # SOG-0524 : le GARDE-FOU d'UNE recherche (A*), en secondes : large, il ne décide plus de rien — un calcul qui le dépasse est « interrompu » (le poste est trop lent), jamais « impossible » ; les budgets se comptent en ÉTATS (STATE_CEIL, `max_states`)
STATE_CEIL = None   # SOG-0524 : le plafond ABSOLU du compteur d'états du Nav (`states_total`) de la phase en cours (route de tête, alternatives, propositions), posé par plan.plan() ; None : seule la borne propre de chaque recherche (100 000 états). Déterministe : la même demande rend la même réponse quelle que soit la charge du poste


class Interrupted(Exception):
    """SOG-0524 : le garde-fou de TEMPS a joué (le poste est trop lent) : le calcul n'a pas été mené à son terme — ce n'est PAS une absence de route (jamais un ValueError : aucun `except ValueError` ne le prend pour une route introuvable)."""


def interrupted(seconds):
    return Interrupted(f'Calcul interrompu : le poste est trop lent (plus de {seconds:g} s sans conclure). Ce n’est pas une absence de route : relancer le calcul, ou alléger ce qui charge le poste.')
TURN_CACHE_MAX = 200000      # revue de Sécurisation : au plus ce nombre de triplets (précédent, point, suivant) dans la mémoire des virages d'un Nav ; au-delà elle est vidée
BRIDGE_VISITS = 0      # SOG-0524 : les visites de la DERNIÈRE recherche de direct (`bridge_gap`), pour les cas
MAX_BRIDGE_VISITS = 2_000_000      # SOG-0476 (Sécurisation) : les cellules et points visités par une recherche de direct
NO_NETWORK_MAX_NM = 900      # SOG-0474 : au-delà, aucun direct de repli (le terrain est trop loin de tout réseau lu)
DEADLINE = None   # SOG-0371 / SOG-0524 : l'instant (time.perf_counter) du GARDE-FOU de TEMPS du calcul entier, posé par plan.plan() (large : plan.GUARD_S) ; passé, une recherche ou un graphe qui commence lève `Interrupted`. Il ne borne plus aucune phase : les phases se bornent en états ; None : seul le garde-fou propre de la recherche


RAD_FILE = None   # SOG-0081 : chemin de rad.json.gz posé par le travail du lanceur (data/route/rad.json.gz) ; None : à côté du module, comme RouteSim 2
MONTHS = dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(),range(1,13)))

@functools.lru_cache(maxsize=8192)      # SOG-0354 L2a : une fonction PURE (un texte → une date) appelée 620 000 fois par un calcul (les lignes du RAD relues à chaque blocage) : 1,2 s de l'analyse d'un texte déjà vu ; les dates sont immuables
def date_in(text):
    m = re.search(r'(\d{1,2})[ /-]+([A-Z]{3})[ /-]+(\d{4})', text.upper())
    if m:
        try: return dt.date(int(m[3]),MONTHS[m[2]],int(m[1]))
        except (KeyError,ValueError): return None
    return None

nm=geo.nm      # SOG-0468 (3) : écrit une fois dans geo.py (avec la garde min(1, …)) ; les autres modules appellent engine.nm

_LL=re.compile(r'(\d{2})(\d{2})?([NS])(\d{3})(\d{2})?([EW])')
_NAT_A=re.compile(r'(\d{2})(\d{2})([NEWS])')      # « 5520N » : 55°N 020°W (la longitude à deux chiffres, moins de 100°)
_NAT_B=re.compile(r'(\d{2})([NEWS])(\d{2})')      # « 55N20 » : 55°N 120°W (le « 1 » des centaines est omis)
_QUADRANT={'N':(1,-1),'E':(1,1),'S':(-1,1),'W':(-1,-1)}      # ARINC 424 : N = nord / ouest, E = nord / est, S = sud / est, W = sud / ouest

def coordinate(ident):
    """(lat, lon) d'un point donné par ses coordonnées dans une route (SOG-0211) : « 4959N08712W » / « 49N087W » (ddmm?N dddmm?W, E et S de même) et les formes NAT à cinq signes d'ARINC 424 (« 5520N » = 55°N 020°W, « 55N20 » = 55°N 120°W ; quadrant N = N/O, E = N/E, S = S/E, W = S/O) ; None sinon."""
    t=str(ident or '').strip().upper()
    m=_LL.fullmatch(t)
    if m:
        la=int(m.group(1))+int(m.group(2) or 0)/60; lo=int(m.group(4))+int(m.group(5) or 0)/60
        if la>90 or lo>180 or int(m.group(2) or 0)>59 or int(m.group(5) or 0)>59: return None
        return (-la if m.group(3)=='S' else la, -lo if m.group(6)=='W' else lo)
    m=_NAT_A.fullmatch(t)
    if m: la,lo,q=int(m.group(1)),int(m.group(2)),m.group(3)
    else:
        m=_NAT_B.fullmatch(t)
        if not m: return None
        la,q,lo=int(m.group(1)),m.group(2),100+int(m.group(3))
    if la>90 or lo>180: return None
    sl,so=_QUADRANT[q]
    return (sl*la, so*lo)

def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

@functools.lru_cache(maxsize=65536)
def _tokens(s): return frozenset(re.findall(r'[A-Z][A-Z0-9_*]{1,30}',s.upper()))      # SOG-0424 : le même texte de règle est lu à chaque évaluation d'une route (192 000 lectures pour une demande) : lu UNE fois (un ensemble figé : les appelants ne font que des intersections et des tests)

def tokens(s): return _tokens(s)

def route_connector(word,nav,airways=(),procedures=()):
    return word=='DCT' or word in airways or word in procedures or (word not in nav.ids and re.fullmatch(r'U?[A-Z]\d{1,4}[A-Z]?',word) is not None)

def split_level(word):
    """SOG-0401 : « POINT/F165 » → ('POINT', 165) ; un mot sans groupe de niveau → (mot, None). Le groupe est celui du texte de Carburant (`PT2/F280`, frame/lib/route_text.js) : le niveau en centaines de pieds, trois chiffres ; sa valeur n'est pas jugée ici (l'appelant refuse hors de 10 à 660)."""
    m=re.fullmatch(r'(.+)/(?:[NK]\d{4}|M\d{3})?F(\d{3})',word)      # SOG-0431 : aussi « POINT/N0405F200 » (vitesse et niveau, le groupe que le plan de vol écrit : la vitesse n'est pas lue ici)
    return (m.group(1),int(m.group(2))) if m else (word,None)

def today():
    """SOG-0532 (7) : la date du jour (UTC, « AAAA-MM-JJ », sans heure : on ne suppose pas d'heure de départ) quand la demande n'en donne pas. Jamais une date figée dans le code : le cycle AIRAC de la base et les règles du RAD en dépendent."""
    return dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%d')

WARNING_CODES={'level_semicircular','level_rule_near_limit','level_rule_no_variation'}      # SOG-0530 : les raisons qui sont des AVERTISSEMENTS (la route reste valide, le verdict ne change pas) : rendues à part dans `warnings`
MAX_VERDICT_ITEMS=100      # SOG-0532 : au plus cent raisons dans `violations` et dans `unverifiable` (la réponse reste bornée)

def yoyo(levels):
    """SOG-0532 (1) / PROF326 d'Eurocontrol : la suite des niveaux écrits d'un vol, [(point, niveau)] dans l'ordre de la route (le premier est le niveau déposé) : une DESCENTE suivie d'une REMONTÉE est un yoyo critique, jamais permis. Rend (point de la remontée, niveau le plus bas, niveau de la remontée) ou None."""
    low=None;low_point=None
    for (_pa,la),(pb,lb) in zip(levels,levels[1:]):
        if lb<la:
            if low is None or lb<low:low,low_point=lb,pb
        elif lb>la and low is not None:return dict(down_point=str(low_point)[:40],down_fl=low,up_point=str(pb)[:40],up_fl=lb)
    return None

def written_route(dep,legs,via=(),marks=None):
    """SOG-0401 : le texte de la route depuis ses tronçons, écrit comme `Nav.format_path` l'écrit (une voie, puis le point où elle se termine ; les tronçons qui se suivent sur la même voie ne font qu'un mot), avec, en plus, un groupe de niveau « POINT/Fnnn »
    sur le point de DÉPART des tronçons que `marks` désigne ({ indice du tronçon : niveau en centaines de pieds }) : ce point reste dans le texte, la voie est répétée après lui (« B1 SITET/F195 B1 KEPAD »). Le départ (indice 0) et l'arrivée n'en portent jamais."""
    marks=marks or {}; words=[[dep,None]]; last=None
    for n,leg in enumerate(legs):
        name=leg['via']; end=leg['end']['id']
        if n>0 and n in marks:words[-1][1]=marks[n]
        if last==name and last!='DCT' and words[-1][0] not in via and words[-1][1] is None:words[-1][0]=end
        else:words.extend([[name,None],[end,None]])
        last=name
    return ' '.join(w+(f'/F{l:03d}' if l else '') for w,l in words)

def level_marks(legs,changes,lowered=None,filed=None):
    """SOG-0401 : les changements de palier du profil (`profile.changes`, dans l'ordre de la route) → { indice du tronçon où le changement COMMENCE : nouveau niveau en centaines de pieds } ; un changement qui commence au départ, ou dont le point n'est le départ d'aucun tronçon, n'a pas de groupe ; deux changements au même point : le dernier."""
    marks={}; cursor=0; current=filed      # SOG-0532 (2) : `filed` : le niveau DÉPOSÉ ; un groupe n'est écrit que s'il CHANGE le niveau (jamais « POINT/F330 » quand le vol est déjà au FL330 : le niveau écrit est le niveau demandé)
    for change in changes:
        k=next((j for j in range(cursor,len(legs)) if legs[j]['start']['id']==change['point']),None)
        level=int(change['to_ft']//1000)*10      # SOG-0431 : un niveau écrit dans une route est un niveau de CROISIÈRE utilisable : un multiple de dix, au plus égal à l'altitude (le plafond de la voie : 20 500 ft s'écrit F200, jamais F205 : « SYN101: INVALID LEVEL DESIGNATOR (ROUTE) » d'Eurocontrol)
        if k is None or k==0 or not 10<=level<=660 or level==current:continue
        if lowered is not None and level*100!=round(change['to_ft']/100)*100:lowered.append((change['point'],round(change['to_ft']/100),level))
        marks[k]=level; cursor=k; current=level
    return marks

def leg_levels(legs,words,marks):
    """SOG-0401 : le niveau déposé à chaque tronçon d'une route lue avec des groupes de niveau (`marks` : { indice du mot : niveau }) : le niveau du dernier groupe posé sur un point au plus tard au départ du tronçon, None (le niveau de la demande) tant qu'aucun n'a été posé ; None sans groupe."""
    if not marks:return None
    levels=[None]*len(legs); cursor=0
    for n in sorted(marks):
        k=next((j for j in range(cursor,len(legs)) if legs[j]['start']['id']==words[n]),None)
        if k is None:continue
        for j in range(k,len(legs)):levels[j]=marks[n]
        cursor=k
    return levels

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
        self.ads={}; self.edges=[]; self.cycles={}; self.coverage=[];self.vrp_keys=set();self.navaid_keys=set();self.fir_keys=set()      # SOG-0417 : les points que la source dit à la limite d'une FIR (drapeau `lim: 'fir'` de la base : une donnée NON FIABLE, lue à la porte des portes seulement)
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
                        if kind=='points' and point.get('lim')=='fir':self.fir_keys.add(key)
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
        self._xplane_overlay()      # SOG-0474 suite (Q-0108) : le réseau de repli X-Plane, personnel et local, pour les États SANS réseau officiel
        if not self.edges: raise ValueError('Aucun segment airway dans les cycles disponibles à cette date.')
        import time as _time;_began=_time.perf_counter()      # SOG-0354 L5 (3) : le temps de la lecture des tracks (`timing.tracks_s`)
        try:nat_layer.add(self,nm);self.nat['seconds']=round(_time.perf_counter()-_began,3)   # SOG-0263 : la couche NAT (les tracks du jour, même périmées, dites périmées) ; un fichier illisible ne coûte pas le calcul
        except (OSError,ValueError,KeyError,TypeError) as exc:self.nat={'tracks':[],'issued':None,'stale':False,'skipped':[f'error: {exc.__class__.__name__}'],'links':0}
        self.fra=fra_module.Fra(self,date,nm)
        self._fra_graph_cache={}
        self._routing_cache=collections.OrderedDict()
        self.procedures=procedure_module.Catalog(self)
        import threading
        self._plan_lock=threading.RLock()

    TURN_MAX_DEG=100.0      # SOG-0501 : un virage plus serré que cela à un point de la route n'est pas pris (l'IFPS : « CRITICAL SHARP TURN » ; mesuré : refusés à 138° et 139°, le plus grand virage non refusé 68° : le seuil exact est entre les deux, 100° est PROVISOIRE et prudent)
    TURN_FREE_KINDS=('SID','STAR','APPROACH_LINK','FRA_GATE')      # les raccords de procédures et les portes ne virent pas « à un point de la route »
    XPLANE_MIN_OFFICIAL=20      # un État dont la base a moins de tronçons de voie n'a pas de réseau officiel (même seuil que tools/regen/xplane.py)

    def _xplane_overlay(self):
        """SOG-0474 suite (Q-0108 : « les deux ») : le réseau dérivé des fichiers d'X-Plane (Navigraph) de l'utilisateur, lu dans data/local/xplane/ (tools/xplane_net.py, verbe xplane/build), n'est ajouté QUE pour les zones sans réseau officiel (moins de
        XPLANE_MIN_OFFICIAL tronçons) et APRÈS le réseau officiel ; chaque tronçon porte `src: 'xplane'` (la revue le dit) ; un tronçon déjà là d'une source officielle (mêmes extrémités, même voie) n'est pas doublé. Personnel, local, jamais publié."""
        self.xplane=None
        try:
            import xplane_net
            net=xplane_net.net_of(str(self.data_dir))
        except (ImportError,OSError,ValueError,KeyError,TypeError):return
        if not net or not isinstance(net.get('zones'),dict):return
        official={c['zone'] for c in self.coverage if (c.get('segments') or 0)>=self.XPLANE_MIN_OFFICIAL}
        have={(frozenset((self.nodes[e['a']]['id'],self.nodes[e['b']]['id'])),e['route']) for e in self.edges}
        cycle=net.get('cycle') if isinstance(net.get('cycle'),str) and re.fullmatch(r'\d{4}',net.get('cycle')) else None
        used=[];total=0
        for zone,part in sorted(net['zones'].items()):
            if zone in official or not isinstance(part,dict) or not isinstance(part.get('airways'),list):continue
            count=0
            for w in part['airways']:
                if not isinstance(w,dict) or not isinstance(w.get('route'),str) or not isinstance(w.get('a'),dict) or not isinstance(w.get('b'),dict):continue
                if not (self.valid(w['a']) and self.valid(w['b'])) or not isinstance(w['a'].get('id'),str) or not isinstance(w['b'].get('id'),str):continue
                signature=(frozenset((w['a']['id'],w['b']['id'])),w['route'])
                if signature in have:continue
                lo,up=w.get('lower'),w.get('upper')
                if not (isinstance(lo,(int,float)) and isinstance(up,(int,float)) and 0<=lo<=up<=99900):continue
                ends=[]
                for end in ('a','b'):
                    before=len(self.nodes);key=self.add(dict(id=w[end]['id'],lat=w[end]['lat'],lon=w[end]['lon']))
                    if len(self.nodes)>before:self.nodes[key]['local']='xplane'      # SOG-0474 suite (Sécurisation) : la marque, PAR POINT, d'une position venue d'X-Plane (Navigraph) ; un point déjà connu d'une source officielle n'est pas marqué ; elle suit le point dans les tronçons et les points de la réponse : Carburant n'écrit jamais sa position au dépôt du groupe (xpStrip, F255)
                    ends.append(key)
                a,b=ends
                have.add(signature);count+=1
                self.edges.append(dict(a=a,b=b,route=w['route'],lower=lo,upper=up,dir=w.get('dir') if w.get('dir') in ('F','B','FB') else None,nm=nm(self.nodes[a],self.nodes[b]),zone=zone,src='xplane',source_cycle=None))      # le cycle d'X-Plane (« 2610 ») n'est pas une date ISO : il est dit dans `nav.xplane`
            if count:
                used.append(zone);total+=count
                self.coverage.append(dict(zone=zone,cycle=None,segments=count,dataset_cycles={},sources=['xplane']))
        if used:self.xplane=dict(cycle=cycle,zones=used,segments=total)

    def sharp_turn(self,previous,u,v,incoming,e):
        """SOG-0501 : vrai si la route `previous` → `u` → `v` vire à `u` de plus de TURN_MAX_DEG ; faux pour un raccord, une porte, un point sans position (nœud FRA ou de procédure) ; mémorisé par triplet."""
        if not self.TURN_MAX_DEG or incoming is None:return False
        if '|' in previous or '|' in u or '|' in v or incoming.get('connector') or e.get('connector') or incoming.get('kind') in self.TURN_FREE_KINDS or e.get('kind') in self.TURN_FREE_KINDS:return False
        cache=self.__dict__.setdefault('_turn_cache',{});key=(previous,u,v)
        if key not in cache:
            if len(cache)>=TURN_CACHE_MAX:cache.clear()      # revue de Sécurisation : la mémoire des virages ne croît pas sans borne pendant la vie du Nav (elle est aussi vidée avec les caches du graphe)
            nodes=self.nodes
            cache[key]=previous!=v and geo.turn_deg(nodes[previous],nodes[u],nodes[v])>self.TURN_MAX_DEG if previous in nodes and u in nodes and v in nodes else False
        return cache[key]

    def release_graph_caches(self):
        for name in ['_fra_graph_cache','_routing_cache','_routing_base','_fra_recovery_graph_cache','_turn_cache']:
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

    def keys_of(self,ident):
        """Les positions d'un identifiant : celles de la base ; à défaut, le point que ses coordonnées donnent (SOG-0211 : « KDEN 4959N08712W DCT 5520N06712W … », la route de l'utilisateur) ; [] sinon."""
        keys=self.ids.get(ident,[])
        if keys: return keys
        p=coordinate(ident)
        if not p: return []
        for named in [i for i in self.ids if '/' in i]:      # SOG-0411 : « 5100N05000W » est le point que la route NAT nomme « 51/50 » (les deux écritures d'une même coordonnée) : le même nœud, sinon la portion « NATF » ne le rejoint pas
            for key in self.ids[named]:
                if nm(dict(lat=p[0],lon=p[1]),self.nodes[key])<0.15: return [key]
        return [self.add(dict(id=ident,lat=p[0],lon=p[1]))]

    def resolve(self,ident):
        candidates=self.keys_of(ident)
        if not candidates: raise ValueError('Point inconnu dans AeroDB : '+ident)
        if len(candidates)>1: raise ValueError('Identifiant géographiquement ambigu : '+ident+' ('+str(len(candidates))+' positions).')
        return candidates[0]

    def check_detour(self,keys,start=None,end=None):
        """Un point de la route qui n'a aucun voisin plausible (SOG-0142 : « LFRS PAM LFBD » plaçait PAM à Tyndall, aux États-Unis, seul PAM de la base) : le trajet fait plus du double de la distance directe plus 400 NM →
        « Point loin de la route », avec le point qui coûte le plus. Pas de contrôle sous 50 NM de distance directe (un circuit) ni sans point intermédiaire."""
        chain=[k for k in [start,*keys,end] if k]
        if len(chain)<3:return
        pts=[self.nodes[k] for k in chain]
        direct=nm(pts[0],pts[-1]);total=sum(nm(a,b) for a,b in zip(pts,pts[1:]))
        if direct<50 or total<=2*direct+400:return
        worst=max(range(1,len(pts)-1),key=lambda i:nm(pts[i-1],pts[i])+nm(pts[i],pts[i+1])-nm(pts[i-1],pts[i+1]))
        extra=nm(pts[worst-1],pts[worst])+nm(pts[worst],pts[worst+1])-nm(pts[worst-1],pts[worst+1])
        raise ValueError(f"Point loin de la route : {pts[worst]['id']} ajoute {extra:.0f} NM à une route directe de {direct:.0f} NM (position {pts[worst]['lat']:.2f}, {pts[worst]['lon']:.2f}) ; aucun homonyme plus proche dans la base : point inconnu à proximité.")

    def resolve_sequence(self,names,start=None,end=None):
        """Resolve homonyms by the shortest complete geographical chain.
        A close second interpretation stays an explicit ambiguity.
        """
        if not names:return []
        paths=[(0.,start,[])]
        for ident in names:
            ident=str(ident).strip().upper();keys=self.keys_of(ident)
            if not keys:raise ValueError('Point inconnu dans AeroDB : '+ident)
            next_paths=[]
            for key in keys:
                choices=sorted((cost+(nm(self.nodes[previous],self.nodes[key]) if previous else 0),key,[*chosen,key]) for cost,previous,chosen in paths)
                next_paths.extend(choices[:2])
            paths=next_paths
        ranked=sorted((cost+(nm(self.nodes[key],self.nodes[end]) if end else 0),chosen) for cost,key,chosen in paths)
        best=ranked[0]
        self.check_detour(best[1],start,end)
        if len(ranked)>1 and ranked[1][0]-best[0]<max(1,best[0]*.005):
            raise ValueError('Route géographiquement ambiguë : plusieurs positions de points donnent des trajets comparables. Préciser un point voisin.')
        return best[1]

    def resolve_context(self,ident,previous=None,via='DCT',following=()):
        candidates=list(self.keys_of(ident))
        if not candidates: return self.resolve(ident)
        if len(candidates)>1 and previous and via!='DCT':
            g=self.graph(None,via)
            candidates=[k for k in candidates if self.path(g,previous,k) is not None]
        if len(candidates)>1 and len(following)>=2 and following[0] in {e['route'] for e in self.edges}:
            g=self.graph(None,following[0]); ends=self.keys_of(following[1])
            candidates=[k for k in candidates if any(self.path(g,k,end) is not None for end in ends)]
        if len(candidates)==1: return candidates[0]
        if not candidates: raise ValueError('Aucune position de '+ident+' reliée à l’airway indiquée')
        raise ValueError('Identifiant géographiquement ambigu : '+ident+' ('+str(len(candidates))+' positions encore possibles).')

    def airway_portion(self,alias,p,q):
        """SOG-0401 : la portion de la voie `alias` entre les points p et q (identifiants), cherchée dans les tronçons chargés : le plus court chemin (en tronçons) de p à q en suivant les sens de la voie ; renvoie (tronçons dans le sens de p vers q, tronçons du chemin pris à l'envers) ou None si aucun chemin ne relie p à q (donnée manquante : la règle n'est alors pas décidée)."""
        cache=self.__dict__.setdefault('_portions',{})
        key=(alias,p,q)
        if key in cache:return cache[key]
        adj=self.__dict__.setdefault('_way_adj',{}).get(alias)
        if adj is None:      # le graphe de la voie, fait UNE fois par voie (le calcul le demande pour chaque règle de segment : un parcours de tous les tronçons chargés à chaque fois coûtait plus d'une seconde par vol)
            by_route=self.__dict__.get('_by_route')
            if by_route is None:
                by_route=self._by_route=collections.defaultdict(list)
                for e in self.edges:by_route[e['route']].append(e)
            adj=collections.defaultdict(set)
            for name,edges in by_route.items():
                if alias not in rad_flight.aliases(name):continue
                for e in edges:
                    a,b=self.nodes[e['a']]['id'],self.nodes[e['b']]['id']
                    if e.get('dir')!='B':adj[a].add(b)
                    if e.get('dir')!='F':adj[b].add(a)
            self._way_adj[alias]=adj
        prev={p:None};queue=collections.deque([p]);result=None
        while queue:
            x=queue.popleft()
            if x==q:break
            for y in sorted(adj[x]):
                if y not in prev:prev[y]=x;queue.append(y)
        if q in prev:
            forward=set();x=q
            while prev[x] is not None:forward.add((prev[x],x));x=prev[x]
            result=(forward,{(b,a) for a,b in forward})
        cache[key]=result
        return result

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
        if not (isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100<=e['upper']):return False
        m=e.get('nat')      # SOG-0354 L5 (1) : une track n'est prise qu'à un niveau de SA LISTE (min et max ne disent pas les niveaux entre les deux : FL350 et FL390 sans FL370)
        return not (m and m.get('levels') and fl not in m['levels'])

    @staticmethod
    def edge_band(e,side):
        c=e.get('node_constraints') or {};low=e.get('lower');high=e.get('upper')
        low=low if isinstance(low,(int,float)) else -1e9;high=high if isinstance(high,(int,float)) else 1e9
        if c.get(side+'_min') is not None:low=max(low,c[side+'_min'])
        if c.get(side+'_max') is not None:high=min(high,c[side+'_max'])
        return low,high

    LOW_MARGIN_FT=1000      # SOG-0161 : une voie dont le plafond est sous le niveau demandé de plus que cela est « basse » (V, T, L…)
    LOW_ALLOW=1.3           # la montée / la descente, comptées sur la distance qu'elles demandent × ce coefficient (la STAR, les virages)
    LOW_PENALTY=3.0         # le coût d'une voie basse hors de la montée et de la descente (paliers demandés : `level_strategy: adapt`) ; sans paliers demandés (le défaut, SOG-0532) la voie est EXCLUE
    LOW_CLIMB_MARGIN_FT=1000      # SOG-0532 (5) : la marge entre le profil naturel et le plafond d'une voie prise à la montée ou à la descente
    DETOUR=1.15      # SOG-0532 (5) : la distance de la route est au plus 15 % au-dessus du grand cercle (l'altitude au bout d'un tronçon de montée est celle de cette distance)
    nat_rejected=frozenset()      # SOG-0354 L5 (1) : les tracks écartées pour CE vol (sections.solve, avec l'option `sections`) : la recherche entière qui suit ne les prend pas non plus ; remis à vide par plan.plan à chaque demande

    def search(self,*args,**kwargs):
        """SOG-0354 L5 (4) d1 ter : `_search` et le TOTAL des états de toutes les recherches de ce Nav (`states_total`) : le budget de la route libre est un nombre d'ÉTATS (déterministe), mesuré par la différence de ce total."""
        before=self.last_search if hasattr(self,'last_search') else None
        try:return self._search(*args,**kwargs)
        finally:
            ls=getattr(self,'last_search',None)
            if ls is not None and ls is not before:self.states_total=getattr(self,'states_total',0)+(ls.get('expanded') or 0)

    def _search(self,g,start,end,waypoints=(),require_fra=False,fra_already=False,initial_band=None,gate=False,goals=None,need=None,max_states=None):
        """A* with ordered milestones and nondominated reachable-altitude labels.
        Heuristic is geodesic distance through remaining milestones, scaled by
        the cheapest cost/NM in this graph. It stays admissible with FRA bonus.
        SOG-0354 L2b (3) : `gate` vrai = `end` est une PORTE (un point au milieu du vol), pas l'arrivée : ni la descente d'arrivée ni le niveau d'arrivée ne sont exigés ; la bande finale (low, high)
        et le coût sont rendus dans `last_search` (`band`, `cost`) pour que la section suivante parte de cette bande (`initial_band`).
        SOG-0354 L5 (1 bis) : `goals` (des nœuds, sans jalons) = UNE seule recherche vers TOUTES ces portes : l'heuristique est la distance à la plus proche, chaque porte est notée à son premier dépilage (le plus petit coût : l'heuristique reste cohérente) et la recherche continue jusqu'à ce que toutes soient notées ; le résultat est
        { porte: { path, cost, band } } (celles atteintes), jamais une exception de budget : une porte non atteinte manque (`last_search['truncated']` dit que le budget a coupé). `end` est alors ignoré (toute porte convient). `need` : s'arrêter dès que ce nombre de portes est atteint (la route libre n'a besoin que des plus proches : une porte inatteignable fait sinon parcourir tout l'espace des états, 31 000 états, 5 s pour EIDW → KJFK).
        """
        import time
        begun=time.perf_counter();expanded=0;fra_reachable=False
        cap=max_states or 100000      # SOG-0524 : le plafond d'états de CETTE recherche : le sien, ramené à ce qui reste à la phase (STATE_CEIL)
        if STATE_CEIL is not None:cap=max(1,min(cap,STATE_CEIL-getattr(self,'states_total',0)))
        stop_at=begun+SEARCH_CAP_S if DEADLINE is None else min(begun+SEARCH_CAP_S,DEADLINE)      # SOG-0371 / SOG-0524 (garde-fou de temps seulement) : la borne de la phase en cours borne AUSSI la recherche déjà partie
        names=[self.nodes[k]['id'] for k in waypoints]
        flight=getattr(g,'flight',None)
        low,high=initial_band or ((flight['departure'],flight['ceiling'] if flight.get('free_departure') else flight['departure']) if flight else (-1e9,1e9))   # SOG-0161 : free_departure : aucune SID lue, la montée n'est pas bornée par le raccord
        origin=(start,0,bool(fra_already),low,high)
        ground=min(0,flight['departure'],flight['arrival']) if flight else 0      # SOG-0354 L5 (4) : le sol, 0 sauf pour un aérodrome sous le niveau de la mer
        ratios=[e.get('_cost',e['nm'])/e['nm'] for es in g.values() for _,e in es if e['nm']>.00001]
        ratio=min(ratios,default=0)
        goal_set=set(goals) if goals else None
        reach=getattr(g,'goal_reach_ft',None)      # SOG-0517 : le niveau auquel une porte doit être atteinte pour servir la section suivante (la route libre : le plancher de la bande océanique) : une porte atteinte seulement par des voies basses n'est pas notée, la recherche continue (une autre étiquette, plus haute, peut l'atteindre)
        reached={}
        if goal_set:end=min(goal_set);waypoints=();names=[]
        targets=[self.nodes[k] for k in waypoints]+[self.nodes[end]]
        suffix=[0.]*len(targets)
        for i in range(len(targets)-2,-1,-1):suffix[i]=suffix[i+1]+nm(targets[i],targets[i+1])
        heuristics={}
        def heuristic(u,index):
            key=(u,index)
            if key not in heuristics:heuristics[key]=ratio*(min(nm(self.nodes[u],self.nodes[x]) for x in goal_set) if goal_set else nm(self.nodes[u],targets[index])+suffix[index])
            return heuristics[key]
        if flight:
            cruise=flight['ceiling'];kt=flight['speed_kt']/3600
            climb_nm=0 if initial_band else max(0,cruise-flight['departure'])/flight['climb_fps']*kt*self.LOW_ALLOW      # SOG-0354 L2b (3) : une section qui part d'une porte (une bande donnée) est en croisière : pas de montée libre
            descent_nm=0 if gate else max(0,cruise-flight['arrival'])/flight['descent_fps']*kt*self.LOW_ALLOW      # ... et une section qui finit à une porte n'a pas de descente d'arrivée
            first,last=self.nodes[start],targets[-1];from_start={};to_end={}
        strict=bool(flight and flight.get('strict'))      # SOG-0532 : niveau constant (stratégie `natural`, le défaut) : plus de coût ×3, l'exclusion
        def lane_fits(u,v,e,top,ds_u,de_v):
            """SOG-0532 (1)(5) : une voie BASSE (plafond sous le niveau de croisière) n'est prise que si le profil NATUREL reste dans sa bande sur tout le tronçon : à la montée (le tronçon u → v est parcouru pendant la montée : l'altitude au bout, avec un détour de 15 %, plus la marge, sous le plafond ; l'altitude au début, sans détour, au moins au plancher) ou à la descente (symétrique, vers l'arrivée). Distances : le grand cercle depuis le départ / vers l'arrivée."""
            floor=max(x for x in (self.edge_band(e,'start')[0],self.edge_band(e,'end')[0],-1e9))
            floor=floor if floor>-1e8 else None
            cf=flight['climb_fps']/kt;df=flight['descent_fps']/kt
            if not initial_band:
                ds_v=from_start.get(v)
                if ds_v is None:ds_v=from_start[v]=nm(first,self.nodes[v])
                if min(cruise,flight['departure']+ds_v*self.DETOUR*cf)+self.LOW_CLIMB_MARGIN_FT<=top and (floor is None or flight['departure']+ds_u*cf>=floor):return True
            if not gate:
                de_u=to_end.get(u)
                if de_u is None:de_u=to_end[u]=nm(self.nodes[u],last)
                if min(cruise,flight['arrival']+de_u*self.DETOUR*df)+self.LOW_CLIMB_MARGIN_FT<=top and (floor is None or flight['arrival']+de_v*df>=floor):return True
            return False
        def low_factor(u,v,e):
            """SOG-0161 (LFOE → KTPA : de JFK à Tampa, 700 NM en V et T à 17 500 ft pour un vol au FL370) : une voie BASSE (plafond sous le niveau demandé) ne se prend pas hors de la montée du départ et de la descente vers l'arrivée : son coût est multiplié (jamais interdite : un maillon bas peut être la seule liaison)."""
            if not flight or e.get('connector'):return 1
            if e.get('kind')=='FRA':      # SOG-0535 : un direct de route libre a une BANDE (le classeur FRA) comme une voie : au niveau CONSTANT il est exclu quand la bande n'atteint pas le niveau (jamais un palier que l'utilisateur n'a pas demandé : FL315 sous un vol au FL330) ; hors du niveau constant (paliers demandés) il garde son coût d'avant
                if not strict:return 1
            elif e.get('kind') not in (None,'AIRWAY') or e.get('route')=='DCT':return 1
            top=max(self.edge_band(e,'start')[1],self.edge_band(e,'end')[1])
            if top>=cruise-self.LOW_MARGIN_FT:return 1
            ds=from_start.get(u)
            if ds is None:ds=from_start[u]=nm(first,self.nodes[u])
            de=to_end.get(v)
            if de is None:de=to_end[v]=nm(self.nodes[v],last)
            if strict:return 1 if lane_fits(u,v,e,top,ds,de) else None      # SOG-0532 (1)(5) : le niveau est CONSTANT : une voie dont l'étendue ne contient pas le niveau de croisière est EXCLUE (None), sauf dans la montée et la descente naturelles, et là seulement si le profil reste dans sa bande, avec une marge, sur tout le tronçon
            return 1 if ds<=climb_nm or de<=descent_nm else self.LOW_PENALTY
        q=[(heuristic(start,0),0,origin)];costs={origin:0};prev={};labels=collections.defaultdict(list)
        labels[origin[:3]].append((0,low,high,origin))
        while q:
            if expanded%128==0 and time.perf_counter()>stop_at:      # SOG-0524 : le GARDE-FOU de temps : le poste est trop lent, le calcul est INTERROMPU (jamais dit « impossible » ni « budget atteint »)
                self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=bool(reached),truncated='time',fra_reachable=fra_reachable)
                raise interrupted(round(stop_at-begun))
            if expanded%128==0 and expanded>=cap:      # SOG-0354 L5 (4) : le budget en ÉTATS (déterministe : la même demande rend la même réponse quelle que soit la charge du poste)
                self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=bool(reached),truncated=True,fra_reachable=fra_reachable)
                if goal_set:return reached
                raise ValueError(f'Budget de recherche atteint ({cap:,} états). Ce résultat ne prouve pas l’absence de route ; réduire les contraintes ou examiner la couverture des bases.'.replace(',',' '))
            _,cost,state=heapq.heappop(q)
            if cost!=costs.get(state):continue
            expanded+=1;u,index,seen_fra,low,high=state
            fra_reachable=fra_reachable or '|FRA|' in u
            if goal_set:
                if u in goal_set and u not in reached and (reach is None or high>=reach-.01):
                    path,walk=[],state
                    while walk!=origin:
                        previous,e=prev[walk];path.append((previous[0],walk[0],e));walk=previous
                    reached[u]=dict(path=list(reversed(path)),cost=cost,band=(low,high))
                    if len(reached)==len(goal_set) or (need and len(reached)>=need):
                        self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=True,fra_reachable=fra_reachable,goals=len(goal_set))
                        return reached
            elif u==end and index==len(names) and (seen_fra or not require_fra):
                if flight and not gate and not low-.01<=flight['arrival']<=high+.01:continue
                path=[]
                while state!=origin:
                    previous,e=prev[state];path.append((previous[0],state[0],e));state=previous
                self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=True,fra_reachable=fra_reachable,band=(low,high),cost=cost)
                return list(reversed(path))
            came=prev.get(state) if state!=origin else None      # SOG-0501 : l'arête par laquelle ce meilleur état a été atteint (le virage au point u)
            for v,e in g.get(u,[]):
                if self.nat_rejected and e.get('nat') and e['nat']['track'] in self.nat_rejected:continue
                if came is not None and self.sharp_turn(came[0][0],u,v,came[1],e):continue
                a,b=self.edge_band(e,'start')
                if a==0:a=ground      # le plancher 0 est le sol (L5 4) : sous le niveau de la mer pour EHAM
                a=max(a,low);b=min(b,high)
                if a>b+.001:continue
                c,d=self.edge_band(e,'end')
                if c==0:c=ground
                if flight:
                    ceiling=flight['ceiling'];b=min(b,ceiling);d=min(d,ceiling)
                    if a>b+.001:continue
                    seconds=e['nm']/(e.get('planned_speed_kt') or flight['speed_kt'])*3600
                    up=0 if e.get('kind') in ['STAR','APPROACH_LINK'] else flight['climb_fps']*seconds
                    down=0 if e.get('kind')=='SID' else flight['descent_fps']*seconds
                    if v==end and not gate and flight.get('free_arrival') and e.get('connector'):down=1e9   # SOG-0161 : aucune STAR lue : la descente du raccord d'arrivée n'est pas bornée
                    c=max(c,a-down,ground);d=min(d,b+up)
                    if v==end and not gate:c=max(c,flight['arrival']);d=min(d,flight['arrival'])
                elif e['nm']<.00001:c,d=max(c,a),min(d,b)
                if c>d+.001:continue
                c,d=round(c,6),round(d,6)
                next_index=index+1 if index<len(names) and self.nodes[v]['id']==names[index] and nm(self.nodes[v],self.nodes[waypoints[index]])<.15 else index
                qualifies=e.get('kind')=='FRA' and (not getattr(g,'required_fra_area',None) or e.get('fra_area')==g.required_fra_area)
                factor=low_factor(u,v,e)
                if factor is None:continue      # SOG-0532 : la voie est exclue
                next_state=(v,next_index,seen_fra or qualifies,c,d);new=cost+e.get('_cost',e['nm'])*factor
                bucket=labels[next_state[:3]]
                new_t,c_t,d_t=new+1e-10,c+.001,d-.001      # SOG-0354 L2b (1) : les trois seuils une fois, la boucle sans générateur (6,3 millions de tours par recherche de 6 000 états) : même test, mot pour mot
                dominated=False
                for old,lo,hi,_ in bucket:
                    if old<=new_t and lo<=c_t and hi>=d_t:
                        dominated=True;break
                if dominated:continue
                kept=[]
                for old,lo,hi,key in bucket:
                    if new<=old+1e-10 and c<=lo+.001 and d>=hi-.001:costs.pop(key,None)
                    else:kept.append((old,lo,hi,key))
                kept.append((new,c,d,next_state));labels[next_state[:3]]=kept
                costs[next_state]=new;prev[next_state]=(state,e)
                heapq.heappush(q,(new+heuristic(v,next_index),new,next_state))
        self.last_search=dict(algorithm='A* / labels altitude non dominés',expanded=expanded,seconds=round(time.perf_counter()-begun,4),found=bool(reached),fra_reachable=fra_reachable)
        return reached if goal_set else None

    def path(self,g,start,end):return self.search(g,start,end)

    def connected(self,g,start,end):
        """SOG-0161 : `end` est-il atteignable depuis `start` dans le graphe, SANS tenir compte des altitudes ? (parcours en largeur, quelques ms). Faux : aucune recherche d'altitudes n'y trouvera de route, et elle épuiserait son budget (6 s,
        100 000 états) à parcourir l'espace des états avant de s'arrêter : EGLL → KJFK le faisait trois fois (41 s) ; `last_search` dit alors found=False, fra_reachable (un état FRA a été vu : le graphe large peut encore relier)."""
        seen={start};queue=collections.deque([start]);fra_seen=False
        while queue:
            u=queue.popleft()
            if u==end:return True
            fra_seen=fra_seen or '|FRA|' in u
            for v,e in g.get(u,()):
                if v not in seen:seen.add(v);queue.append(v)
        self.last_search=dict(algorithm='parcours en largeur (liaison sans altitude)',expanded=len(seen),seconds=0.0,found=False,fra_reachable=fra_seen)
        return False

    def lane_possible(self,e,first,last,flight):
        """SOG-0532 : une voie est-elle UTILISABLE à ce niveau, à la grosse maille (la connexité des deux parties du réseau, `bridge_gap`) : elle contient le niveau de croisière, ou son plafond est au-dessus du profil naturel à son bout le plus loin du départ (montée) ou de l'arrivée (descente), avec la marge et le détour. Les planchers et les virages sont jugés par la recherche (`lane_fits`)."""
        top=max(self.edge_band(e,'start')[1],self.edge_band(e,'end')[1])
        cruise=flight['ceiling']
        if top>=cruise-self.LOW_MARGIN_FT:return True
        kt=flight['speed_kt']/3600;cf=flight['climb_fps']/kt;df=flight['descent_fps']/kt
        u,v=self.nodes.get(e.get('a')),self.nodes.get(e.get('b'))
        if not u or not v:return True
        ds=max(nm(first,u),nm(first,v));de=max(nm(u,last),nm(v,last))
        floor=max(self.edge_band(e,'start')[0],self.edge_band(e,'end')[0])      # le plancher : le profil naturel, à son bout le plus proche du départ (de l'arrivée), doit être au-dessus
        floor=floor if floor>-1e8 else None
        climb=flight['departure']+ds*self.DETOUR*cf+self.LOW_CLIMB_MARGIN_FT<=top and (floor is None or flight['departure']+min(nm(first,u),nm(first,v))*cf>=floor)
        descent=flight['arrival']+de*self.DETOUR*df+self.LOW_CLIMB_MARGIN_FT<=top and (floor is None or flight['arrival']+min(nm(u,last),nm(v,last))*df>=floor)
        return climb or descent

    def bridge_gap(self,g,a,b,fl,steps=False,flight=None):
        global BRIDGE_VISITS
        BRIDGE_VISITS=0      # SOG-0524 (suite) : les visites de cette recherche, comptées (K359 les assertait en secondes : sous charge, rouge)
        """SOG-0476 : (NM, de, vers) le plus court direct d'un point atteignable DEPUIS `a` à un point d'où `b` est atteignable, à NO_NETWORK_MAX_NM au plus ; None sinon. Les deux parties du graphe ne se touchent pas (la base n'a pas de voie entre elles) : le direct
        est le seul lien, dit en revue (jamais une route perdue). Parcours en largeur sans altitude, grille d'un degré sur le plus grand des deux ensembles : borné par la taille du graphe."""
        first,last=self.nodes[a],self.nodes[b]
        usable=lambda e:not e.get('nat') and (steps or not isinstance(e.get('upper'),(int,float)) or e['upper']>=fl*100) and (not (flight and flight.get('strict')) or e.get('kind') not in (None,'AIRWAY') or e.get('route')=='DCT' or self.lane_possible(e,first,last,flight))      # SOG-0532 : niveau constant : une voie basse ne relie que dans la montée et la descente      # les routes NAT ne relient pas : la couche NAT les pose à part (sections) ; une voie dont le plafond est sous le niveau demandé n'est pas utilisable à ce niveau (sauf si les paliers sont permis)
        def reach(start,adj):
            seen={start};todo=[start]
            while todo:
                for other,e in adj.get(todo.pop(),()):
                    if other not in seen and usable(e):seen.add(other);todo.append(other)
            return seen
        fwd=reach(a,g)
        if b in fwd:return None
        rev=collections.defaultdict(list)
        for u,edges in g.items():
            for v,e in edges:rev[v].append((u,e))
        together={a};todo=[a]      # SOG-0476 (Essais : K105) : si `b` est du MÊME réseau que `a` sans tenir compte du sens, ce n'est pas une coupure mais un sens unique pris à rebours : jamais ponté (une voie à sens unique reste interdite à rebours)
        while todo:
            k=todo.pop()
            for other,e in list(g.get(k,()))+list(rev.get(k,())):
                if other not in together and usable(e):together.add(other);todo.append(other)
        if b in together:return None
        bwd=reach(b,rev)
        real=lambda k:'|FRA|' not in k and '|PROC|' not in k and k in self.nodes
        fwd={k for k in fwd if real(k) and k!=a};bwd={k for k in bwd if real(k) and k!=b}
        if not fwd or not bwd:return None
        small,big,toward_b=(fwd,bwd,True) if len(fwd)<=len(bwd) else (bwd,fwd,False)
        def box(keys):
            lats=[self.nodes[k]['lat'] for k in keys];lons=[self.nodes[k]['lon'] for k in keys]
            return min(lats),max(lats),min(lons),max(lons)
        (s0,s1,so0,so1),(b0,b1,bo0,bo1)=box(small),box(big)      # SOG-0476 (Sécurisation) : deux boîtes à plus de 900 NM l'une de l'autre (l'Atlantique : deux grands réseaux sans voisin) : aucun lien possible, rien n'est parcouru
        dlat=max(0.0,s0-b1,b0-s1)*60;dlon=max(0.0,so0-bo1,bo0-so1)*60*math.cos(math.radians(min(80.0,max(abs(s0),abs(s1),abs(b0),abs(b1)))))
        if max(dlat,dlon)>NO_NETWORK_MAX_NM:return None
        cells=collections.defaultdict(list)
        for k in big:
            p=self.nodes[k];cells[(math.floor(p['lat']),math.floor(p['lon']))].append(k)
        reach_deg=int(NO_NETWORK_MAX_NM/60)+2
        best=None;visits=0
        for k in small:
            p=self.nodes[k];la,lo=math.floor(p['lat']),math.floor(p['lon'])
            for r in range(reach_deg+1):      # l'anneau r : SON BORD seulement (la longitude compte double : un degré de longitude vaut moins d'un degré de latitude)
                ring=[(x,y) for x in (la-r,la+r) for y in range(lo-2*r,lo+2*r+1)] if r else [(la,lo)]
                if r:ring+=[(x,y) for y in (lo-2*r,lo+2*r) for x in range(la-r+1,la+r)]
                for xy in ring:
                    for other in cells.get(xy,()):
                        visits+=1
                        d=nm(p,self.nodes[other])
                        if d<=NO_NETWORK_MAX_NM and (best is None or d<best[0]):best=(d,k,other) if toward_b else (d,other,k)
                    visits+=1
                BRIDGE_VISITS=visits
                if visits>MAX_BRIDGE_VISITS:return best      # un budget de visites : au-delà, ce qui est trouvé (ou rien : non décidé, rien de perdu)
                if best and best[0]<=r*30:break      # un anneau plus loin ne peut pas être plus proche
        return best

    def no_network_anchor(self,airport,isdep,g,incoming,fl,a,b):
        """SOG-0474 : le point du réseau le plus proche d'un terrain qui n'en a aucun à portée de raccord : (NM, clé), dans la plus grande partie CONNEXE du réseau haut à ce niveau (`nat_layer.main_network` : un point isolé n'est pas un point de repli) ET ATTEIGNABLE depuis le départ (vers l'arrivée pour un départ : un bout de voie à sens unique qui ne mène nulle part n'est pas le dernier point connu), à NO_NETWORK_MAX_NM au plus ; None sinon."""
        from . import nat_layer
        main=nat_layer.main_network(self,fl*100)
        reach={b if isdep else a};todo=[b if isdep else a];links=incoming if isdep else g
        while todo:      # le parcours en largeur sans altitude : le même sens que `connected`
            for other,_e in links.get(todo.pop(),()):
                if other not in reach:reach.add(other);todo.append(other)
        best=None
        for k in main&reach:
            if k in (a,b) or ('|FRA|' in k) or ('|PROC|' in k):continue
            d=nm(self.nodes[airport],self.nodes[k])
            if d<=NO_NETWORK_MAX_NM and (best is None or d<best[0]):best=(d,k)
        return best

    def terminal_gates(self,airport,isdep,ad,g,incoming,terminal,radius,have,other):
        """SOG-0161 : sans SID ni STAR, les portes FRA que le classeur EUROCONTROL publie pour CET aérodrome (point « D » de départ, « A » d'arrivée, l'aérodrome nommé dans la ligne) sont des raccords possibles
        AU-DELÀ du rayon : le plancher d'une zone FRA (FL285 en Suède et au Danemark) est atteint après une distance de montée (2000 ft/min, 450 kt : ~107 NM) que la SID parcourt ; un point plus proche n'est pas atteignable,
        un point plus loin d'une marge de 120 NM n'est pas un raccord. Le raccord reste un DCT de simulation (connector), dit « revue » par le contrôle : aucune SID complète n'a été lue. [(distance NM, nœud)]"""
        fra=getattr(self,'fra',None)
        if not(fra and fra.book):return [],set()
        role,col='D' if isdep else 'A','dep' if isdep else 'arr'
        speed=float(terminal.get('speed_kt',450));rate=float(terminal.get('climb_fpm' if isdep else 'descent_fpm',2000));elev=flight_profile.elevation(ad,self.ads[ad].get('elev'))
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
        strict=bool(terminal.get('_level_lock'))      # SOG-0532 : niveau constant (le défaut ; des paliers seulement si l'utilisateur les demande) : le graphe garde TOUTES les voies, la recherche exclut celles dont l'étendue ne contient pas le niveau (sauf montée et descente, avec marge)
        cost_fields={k:terminal.get(k) for k in ['objective','fra_preference','unable_rnav','use_procedures','dep_runway','arr_runway','terminal_speed_kt','speed_kt','climb_fpm','descent_fpm','_fuel_model','search_density','_rad_avoid']}      # climb_fpm et descent_fpm : lus par terminal_gates (revue de Sécurisation) : deux demandes de montées différentes ne partagent pas un graphe
        cache_key=json.dumps([dep,arr,fl,radius,blocks,profile_options,allow_steps,strict,via,str(when),enable_fra,cost_fields,sorted((getattr(self,'fra_floors',None) or {}).items())],sort_keys=True)
        if not hasattr(self,'_routing_cache'):self._routing_cache=collections.OrderedDict()
        if cache_key in self._routing_cache:
            self.graph_seconds=0.0
            return self._routing_cache[cache_key]
        import time
        if not hasattr(self,'_routing_base'):self._routing_base=collections.OrderedDict()
        base_key=json.dumps([dep,arr,fl,radius,profile_options,allow_steps,strict,via,str(when),enable_fra,{k:v for k,v in cost_fields.items() if k not in ('_rad_avoid',)},sorted((getattr(self,'fra_floors',None) or {}).items())],sort_keys=True)      # SOG-0468 (1) : le graphe SANS les règles RAD (la construction, 1 à 3 s) ne dépend ni des interdictions ni des évitements : une reprise RAD ne le refait pas, elle n'applique que ses règles
        base=self._routing_base.get(base_key)
        if base is None:
            if DEADLINE is not None and time.perf_counter()>DEADLINE:raise interrupted(round(SEARCH_CAP_S))      # SOG-0524 : plus de graphe écarté « faute de temps » (la réponse dépendait de la charge du poste) : seul le garde-fou de temps interrompt

        built=time.perf_counter()
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
            if rule['kind']=='compel':continue      # SOG-0354 L5 (4) défaut 4 : « passer par X à côté de Y » : lu par la route libre (graph.rad_compel), pas un blocage du graphe
            if rule['kind']=='point':point_rules[rule['point']].append(rule)
            elif rule['kind']=='procedure':procedure_rules[rule['procedure_id']].append(rule)
            else:segment_rules[(rule['via'],rule['start'],rule['end'])].append(rule)
        def relevant_rules(a,b,e):
            return point_rules.get(a,[])+point_rules.get(b,[])+segment_rules.get((e['route'],a,b),[])+procedure_rules.get(e.get('procedure_id'),[])
        if base is None:
            if dep==arr: raise ValueError('Choisir deux aérodromes différents.')
            if dep not in self.ads or arr not in self.ads: raise ValueError('Aérodrome absent d’AeroDB : '+(dep if dep not in self.ads else arr))
            a,b=self.resolve(dep),self.resolve(arr); g=self.graph(None if (allow_steps or strict) else fl)
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
            floors=getattr(self,'fra_floors',None)      # SOG-0401 (lot 3) : une voie de la Suisse ou de l'Italie n'existe pas au-dessus du plancher de la route libre (RAD, annexe 3B) : son plafond est ramené à ce plancher (une voie « basse » : évitée, jamais interdite) ; la recherche ne la vole plus à FL350
            if floors:
                for u in list(g):
                    capped=None
                    for k,(other,e) in enumerate(g[u]):
                        f=floors.get(e.get('zone'))
                        if f and e.get('route')!='DCT' and not e.get('procedure_id') and e.get('kind') not in ('FRA','FRA_GATE') and isinstance(e.get('upper'),(int,float)) and e['upper']>f*100:
                            if capped is None:capped=list(g[u])
                            capped[k]=(other,dict(e,upper=f*100,fra_floor_cap=f))
                    if capped is not None:g[u]=capped
            for key in list(g):
                g[key]=[(other,e) for other,e in g[key] if isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100 and e['upper']>=e['lower']]
                if not g[key]: del g[key]
            incoming=collections.defaultdict(list)
            for u,edges in g.items():
                for v,e in edges: incoming[v].append((u,e))
            terminal=terminal or {}; used_procs={}
            if terminal.get('use_procedures',False) and getattr(self,'procedures',None):
                for ad,kind,rwy in [(dep,'SID',terminal.get('dep_runway','')),(arr,'STAR',terminal.get('arr_runway',''))]:
                    used_procs[ad]=self.procedures.add_graph(g,ad,kind,rwy,float(terminal.get('terminal_speed_kt',220)),terminal.get('unable_rnav',False),fl*100)
            # DCT fallback is explicit when no complete, connected procedure is available.
            for airport,isdep in [(a,True),(b,False)]:
                if used_procs.get(dep if isdep else arr):continue
                near=sorted((nm(self.nodes[airport],self.nodes[k]),k) for k in set(g)|set(incoming) if k not in [a,b] and '|FRA|' not in k)
                near=[(d,k) for d,k in near if d<=radius]
                gates,unreachable=self.terminal_gates(airport,isdep,dep if isdep else arr,g,incoming,terminal,radius,{k for d,k in near},self.nodes[b if isdep else a])   # SOG-0161
                near=[(d,k) for d,k in near if k not in unreachable]+gates
                fallback=False
                if not near:      # SOG-0474 : la base n'a PAS le réseau de cet État (la Bosnie : ni point ni voie) : jamais une route perdue ; le dernier point connu, dans la partie principale du réseau à ce niveau, et UN direct jusqu'au terrain, DIT
                    far=self.no_network_anchor(airport,isdep,g,incoming,fl,a,b)
                    if far is None: raise ValueError(f'Aucun point du réseau au FL{fl:03d} à moins de {radius:g} NM de {self.nodes[airport]["id"]}. Couverture ou niveau insuffisant.')
                    near,fallback=[far],True
                for d,k in near:
                    ids=(self.nodes[airport]['id'],self.nodes[k]['id']) if isdep else (self.nodes[k]['id'],self.nodes[airport]['id'])
                    e=dict(route='DCT',nm=d,connector=True,**({'no_network':True} if fallback else {}))
                    if isdep: g.setdefault(airport,[]).append((k,e))
                    else: g.setdefault(k,[]).append((airport,e))
            flight0=dict(profile_options or {},departure=flight_profile.elevation(dep,self.ads[dep].get('elev')),arrival=flight_profile.elevation(arr,self.ads[arr].get('elev')),ceiling=fl*100,strict=strict) if strict and profile_options else None
            link=self.bridge_gap(g,a,b,fl,allow_steps,flight0)      # SOG-0476 : l'arrivée n'est PAS atteignable depuis le départ AU NIVEAU DEMANDÉ (un réseau isolé ou plafonné : l'Islande, à 452 NM de celui du Royaume-Uni, ses voies s'arrêtent à FL285) : jamais une route perdue ; UN direct entre les deux parties, dit
            if link:
                gap,u,v=link
                g.setdefault(u,[]).append((v,dict(route='DCT',nm=gap,connector=True,no_network='gap')))
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
            g={u:[(v,dict(e,_cost=planning.edge_cost(e,terminal))) for v,e in es] for u,es in g.items()}
            base=(g,used_procs,a,b)
            self._routing_base[base_key]=base
            if len(self._routing_base)>1:self._routing_base.popitem(last=False)
        g,used_procs,a,b=base
        # Apply RAD after SID/STAR and all connectors have been inserted. A rule
        # on a procedure point must affect path finding, not only final checking.
        out={}
        for u,edges in g.items():
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
            out[u]=allowed
        graph=RoutingGraph(out)
        graph.rad_avoid=frozenset(r['point'] for r in (terminal or {}).get('_rad_avoid',[]) if r.get('kind')=='point')      # SOG-0354 L5 (4) défaut 4 : les points qu'une règle RAD fait éviter (repli) : ni entrée ni sortie de route NAT ou de route libre
        graph.rad_compel={r['before']:r['point'] for r in (terminal or {}).get('_rad_avoid',[]) if r.get('kind')=='compel'}      # { Y : X } : Y s'atteint (se quitte) par X (la route libre)
        if profile_options:
            graph.flight=dict(profile_options,departure=flight_profile.elevation(dep,self.ads[dep].get('elev')),arrival=flight_profile.elevation(arr,self.ads[arr].get('elev')),ceiling=fl*100,free_departure=not used_procs.get(dep),free_arrival=not used_procs.get(arr),strict=strict)   # SOG-0161 : sans SID (STAR) lue, la montée (la descente) du raccord est celle que la procédure ferait : supposée libre, dite « repli » par le contrôle
        self.graph_seconds=round(time.perf_counter()-built,3)
        self._graph_cost=max(getattr(self,'_graph_cost',0.0),self.graph_seconds)      # SOG-0475 : le coût d'un graphe de CE calcul (remis à 0 par plan.plan)
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
        import time
        if DEADLINE is not None and time.perf_counter()>DEADLINE:raise interrupted(round(SEARCH_CAP_S))      # SOG-0524 : le garde-fou de temps (plus de limite de phase en secondes)
        g,a,b=self.routing_graph(dep,arr,fl,radius,blocks,profile_options,allow_steps,via,when,enable_fra,terminal)
        mandatory=self.resolve_vias(g,a,b,via)
        path=None
        if getattr(self,'sections',False) and not mandatory and not (terminal or {}).get('require_fra'):      # SOG-0354 L2b (3) : l'option `sections` de la demande : un vol qui traverse l'Atlantique par une track est découpé en sections (tools/route_engine/sections.py) ; None = pas applicable, la recherche entière suit
            from . import sections
            path=sections.solve(self,g,a,b)
        if path is None:path=self.constrained_path(g,a,b,mandatory,bool((terminal or {}).get('require_fra'))) if self.connected(g,a,b) else None   # SOG-0161 : sans liaison, même sans contrainte d'altitude, la recherche de niveaux ne cherche pas 6 s dans le vide
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
            if STATE_CEIL is not None and getattr(self,'states_total',0)>=STATE_CEIL:break      # SOG-0524 : le budget de la phase, en états (avant : un instant)
            modified=RoutingGraph({u:[(v,dict(e,_cost=e.get('_cost',e['nm'])*(1+.4*usage[(u,v,e['route'],e.get('fra_area'))]))) for v,e in es] for u,es in g.items()})      # SOG-0524 : une arête sans `_cost` (les routes NAT GARDÉES d'un message précédent, hors fenêtre : sections._previous_system) coûte sa distance, comme la recherche le lit (`ratios`) ; `e['_cost']` levait KeyError : KJFK → EGLL avec des alternatives
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
        self._match={}; self._cand=None; self._blk={}      # SOG-0424 : ce qui ne dépend que du classeur et du couple de terrains est calculé une fois par contexte (les évaluations d'une demande : la route, les variantes, les reprises RAD)
        if self.book:
            for r in self.book['sheets']['Annex 1']:
                self.groups[r['v'][3].strip()]=r['v'][4]

    def match(self,expr,ad,seen=None):
        if seen is None:
            key=(expr,ad)
            if key not in self._match:self._match[key]=self._match_of(expr,ad,set())
            return self._match[key]
        return self._match_of(expr,ad,seen)

    def _match_of(self,expr,ad,seen):
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
        key=(dep,arr,fl)      # SOG-0424 : les mêmes interdictions pour le même couple (et le même niveau) : calculées une fois
        if key not in self._blk:self._blk[key]=self._blocks(dep,arr,fl)
        return [dict(b) for b in self._blk[key]]

    def _blocks(self,dep,arr,fl):
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

    CANDIDATE_COLUMNS={'Annex 2B':[4,5,6,7,8], 'Annex 2C':[4,5,7], 'Annex 3B DCT':[4,5], 'Annex 3B FRA LIM':[4], 'Annex 3A Conditions':[4,5]}

    def _candidate_index(self):
        """SOG-0424 : les lignes ACTIVES du classeur et leurs mots (lus une fois) : (feuille, ligne, valeurs, mots) dans l'ordre des feuilles et des lignes ; ce qui ne dépend ni de la route ni des terrains."""
        out=[]
        for sheet,rows in self.book['sheets'].items():
            if sheet=='Annex 1': continue
            cols=self.CANDIDATE_COLUMNS.get(sheet,[])
            for r in rows:
                if not self.active(r): continue
                v=r['v'];out.append((sheet,r,v,tokens(' '.join(v[i] for i in cols))))
        return out

    def candidates(self,dep,arr,ids,routes):
        if not self.book: return []
        if self._cand is None:self._cand=self._candidate_index()
        found=[]; search=(ids|routes)-{'DCT'}
        for sheet,r,v,ts in self._cand:
            if True:
                reason=[]
                if sheet=='Annex 3A DEP' and self.match(v[4],dep): reason.append('AD de départ')
                elif sheet=='Annex 3A ARR' and self.match(v[4],arr): reason.append('AD d’arrivée')
                elif sheet=='Annex 2A' and (self.match(v[4],dep) or self.match(v[6],arr)):
                    reason.append('ADEP/ADES ou groupe à examiner')
                else:
                    hit=search & ts
                    if hit: reason.append('Mention de '+', '.join(sorted(hit)))
                    # Capture airport-specific rules even without an explicit matching route token.
                    if sheet in ['Annex 2B','Annex 2C','Annex 3A Conditions']:
                        if dep in ts or arr in ts: reason.append('Mention de l’AD')
                        for group in sorted(ts & self.groups.keys()):      # SOG-0424 : triés (l'ordre d'un ensemble change d'un processus à l'autre : la même route donnait deux textes)
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

MAX_BAND_ISSUES=40      # SOG-0401 (4) : les suites de tronçons hors de la bande du niveau détaillées une à une ; le reste en une phrase

def assess(request,_nav=None,_rad=None,_path=None):
    dep=str(request.get('dep','')).strip().upper(); arr=str(request.get('arr','')).strip().upper()
    for ad in [dep,arr]:
        if not re.fullmatch(r'[A-Z0-9]{3,4}|[A-Z]{2}\d{3}',ad,re.A): raise ValueError('Code aérodrome invalide : '+ad)      # SOG-0466 lot 2 : ou le code de liste d'une hélistation (« LF418 »)
    when=dt.datetime.fromisoformat(str(request.get('date') or today()).replace('Z','+00:00'))      # SOG-0532 (7) : sans date, celle du jour
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
    generated=request.get('mode','calculate')=='calculate'; fallback=bool(request.get('_rad_fallback'))      # SOG-0401 (règle de l'ergonome) : le calcul ne perd jamais une route à cause d'une règle qu'il sait décider : sans route sans infraction, la MEILLEURE route est rendue (`_rad_fallback`) et les règles qu'elle enfreint sont DITES (une REVUE, jamais un refus)
    blocks=[] if fallback else rad.blocks(dep,arr,None)
    route=str(request.get('route','')).strip().upper(); issues=[]; legs=[]
    def issue(level,text,code=None,unverifiable=False,**values):      # SOG-0532 (3) / SOG-0531 : une raison qui compte pour le verdict porte un CODE stable et ses valeurs (l'écran compose la phrase dans la langue ; `text` reste la phrase française des journaux)
        issues.append(dict(level=level,text=text,**({'code':code,'values':values} if code else {}),**({'unverifiable':True} if unverifiable else {})))
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
    marks={}      # SOG-0401 : les groupes de niveau « POINT/Fnnn » de la route lue : { indice du mot : niveau en centaines de pieds } ; le mot ne garde que son identifiant (la résolution des points est inchangée) ; le niveau ne sert qu'à juger la bande des voies (`leg_levels`)
    for n,w in enumerate(words):
        ident,level=split_level(w)
        if level is None:continue
        words[n]=ident
        if 10<=level<=660:marks[n]=level
        else:issue('ERREUR',f'Groupe de niveau {w} : le niveau doit être compris entre F010 et F660.')
    if not words or words[0]!=dep:
        words.insert(0,dep); marks={n+1:l for n,l in marks.items()}
    if words[-1]!=arr: words.append(arr)
    marks={n:l for n,l in marks.items() if 0<n<len(words)-1}
    jump=yoyo([(None,fl)]+[(words[n],marks[n]) for n in sorted(marks)]) if marks else None
    if jump:issue('ERREUR',f'Yoyo de niveau : descente au FL{jump["down_fl"]:03d} à {jump["down_point"]}, puis remontée au FL{jump["up_fl"]:03d} à {jump["up_point"]} (Eurocontrol : PROF326) ; le niveau déposé est FL{fl:03d}.','level_yoyo',filed_fl=fl,**jump)      # SOG-0532 lot 2 bis : les DEUX points (la descente, puis la remontée)      # le départ et l'arrivée ne portent jamais de groupe (le niveau déposé est celui du champ niveau)
    if dep not in nav.ads: issue('ERREUR','AD de départ inconnu : '+dep)
    if arr not in nav.ads: issue('ERREUR','AD d’arrivée inconnu : '+arr)
    airways={e['route'] for e in nav.edges}; procedure_names={p['token'] for p in nav.procedures.items}; connectors=airways|procedure_names|{w for w in words if route_connector(w,nav,airways,procedure_names)}; parsed=[]; active_fra=set()
    for n in [n for n in marks if words[n] in connectors]:
        issue('ERREUR',f'Groupe de niveau sur une voie : {words[n]}/F{marks[n]:03d} (il se pose sur un point).'); del marks[n]
    route=' '.join(w+(f'/F{marks[n]:03d}' if n in marks else '') for n,w in enumerate(words))      # la route lue est rendue avec ses groupes
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
            fra_floor_cap=e.get('fra_floor_cap'),procedure_id=e.get('procedure_id'),procedure_name=e.get('procedure_name'),procedure_partial=bool(e.get('partial')),procedure_airport=e.get('airport'),runways=e.get('runways'),source_zone=e.get('zone'),source_cycle=e.get('source_cycle') or nav.cycles.get(e.get('zone')),
            direction=({'F':'sens unique','B':'sens unique','FB':'double sens'}.get(e.get('dir'),'inconnue') if e['route']!='DCT' else 'non vérifiée'),
            nat=e.get('nat'),nat_link=e.get('nat_link'),origin=e.get('origin'),no_network=e.get('no_network'),src=e.get('src')))   # SOG-0078 ; SOG-0354 L5 (2) : origin='random' = route libre CRÉÉE (jamais lue) ; SOG-0263 : la track NAT du tronçon et, pour un raccord DCT, entry / exit
    dep_elev=nav.ads.get(dep,{}).get('elev'); arr_elev=nav.ads.get(arr,{}).get('elev')
    flight_profile.elevation(dep,dep_elev); flight_profile.elevation(arr,arr_elev)      # SOG-0354 L5 (4) : une élévation hors de -1 500 à 30 000 ft est refusée, dite
    if dep_elev is None or arr_elev is None: issue('REVUE','Élévation AD absente : 0 ft utilisé pour le modèle vertical de simulation.')
    # SOG-0371 (aller-retour) : une route que le moteur a ÉCRITE est relue sans refus. Son raccord DCT depuis (vers) un aérodrome sans SID (STAR) lue est libre au contrôle comme à la recherche (la montée n'y est pas tenue au plancher de l'airway suivante) ;
    # un aérodrome qui a des procédures lues garde la rigueur du contrôle (une route saisie « LFPG DCT … » doit prendre sa SID)
    no_proc=lambda ad,kind:not nav.procedures.stats.get(ad,{}).get(kind+'_usable',0)
    free=dict(free_departure=bool(legs) and legs[0]['via']=='DCT' and legs[0].get('kind')!='SID' and (generated or no_proc(dep,'SID')),free_arrival=bool(legs) and legs[-1]['via']=='DCT' and legs[-1].get('kind') not in ['STAR','APPROACH_LINK'] and (generated or no_proc(arr,'STAR')))   # SOG-0161 : le même raccord libre que la recherche
    level_table=level_rule.load(nav.data_dir/'route'/'levels_fr.json')      # SOG-0530 lot B : le tableau des niveaux de la France (lu par le lanceur), une fois pour la route
    for l,cap_ft in zip(legs,level_rule.caps(legs,nav.ads,level_table,fl*100)):      # SOG-0530 lot C : le palier au plafond d'une voie de France prend le plus haut niveau conforme sous ce plafond
        if cap_ft is not None:l['semicircular_cap_ft']=cap_ft
    profile=flight_profile.build(legs,dep_elev or 0,arr_elev or 0,fl,**options,strategy=strategy,**free)
    for l in legs:
        if l.get('data_gap'):l['compatible']=None
        for text in l['vertical_errors']:
            issue('ERREUR',f'{l["via"]} {l["start"]["id"]}–{l["end"]["id"]} : {text}')
    if legs:      # SOG-0530 lot B : le niveau de croisière contre la règle semi-circulaire de l'AIP de France (tableau lu par le lanceur) : un AVERTISSEMENT, jamais une erreur ; le doute (route proche d'une coupure, État sans tableau) est DIT
        level_warnings,level_open,level_notes,level_stats=level_rule.check(legs,nav.ads,level_table)
        for x in level_warnings+level_open+level_notes:issue('REVUE',x['text'],x['code'],False,**x['values'])      # l'ergonome : un doute sur le niveau (route proche d'une coupure, variation inconnue) est une ligne du groupe d'AVERTISSEMENT, jamais un non-vérifiable : aucune de ces raisons ne change le verdict
    if legs and not profile['feasible'] and not any(l['vertical_errors'] for l in legs):
        issue('ERREUR','Profil vertical impossible avec les altitudes AD et les taux de montée/descente saisis.')
    # SOG-0401 (4) : le profil adapté ramène en silence au plafond d'une voie un tronçon de croisière dont la bande est sous le niveau déposé : c'est DIT. Une route SAISIE (ni générée, ni relue d'un chemin de la recherche) : ERREUR par suite de tronçons (au plus MAX_BAND_ISSUES,
    # puis une phrase de total) ; une route de la RECHERCHE (palier adapté voulu, `Nav.generate` en `adapt`) : une REVUE, la recherche ne change pas (une ERREUR la ferait refuser) ; les changements de palier sont rendus dans tous les cas (`profile_changes`)
    # SOG-0401 (retouche j) : le texte d'une route de la RECHERCHE porte les changements de palier (`profile_changes`) : « POINT/Fnnn » (le nouveau niveau, en centaines de pieds) sur le point où chaque changement COMMENCE ; une route sans changement garde son texte,
    # une route SAISIE garde le sien (ses groupes, s'il en a, sont ceux de l'utilisateur). Le texte est refait depuis les tronçons seulement s'il se retrouve à l'identique sans groupe (sinon une REVUE le dit : jamais un texte réécrit sans preuve)
    written=False
    if (generated or _path is not None) and not marks:
        lowered=[]
        level_changes=level_marks(legs,profile.get('changes') or [],lowered,fl)
        jump=yoyo([(None,fl)]+[(legs[k]['start']['id'],level_changes[k]) for k in sorted(level_changes)])
        if jump:issue('ERREUR',f'Yoyo de niveau : descente au FL{jump["down_fl"]:03d} à {jump["down_point"]}, puis remontée au FL{jump["up_fl"]:03d} à {jump["up_point"]} (Eurocontrol : PROF326) ; le niveau déposé est FL{fl:03d}.','level_yoyo',filed_fl=fl,**jump)      # SOG-0532 lot 2 bis : les DEUX points (la descente, puis la remontée)
        if level_changes:
            if written_route(dep,legs,mandatory)==route:
                route=written_route(dep,legs,mandatory,level_changes); written=True
            else:issue('REVUE','Les changements de palier du profil ne sont pas écrits dans le texte de la route : ce texte n’est pas celui que ses tronçons donnent.')
            if profile.get('changes_total',0)>len(profile.get('changes') or []):issue('REVUE',f'Le texte de la route ne porte que les {len(profile["changes"])} premiers des {profile["changes_total"]} changements de niveau.')
            if lowered and written:issue('REVUE','Niveau écrit ramené à un niveau de croisière : '+', '.join(f'{pt}/F{lv:03d} (le plafond de la voie est F{raw:03d})' for pt,raw,lv in lowered[:6])+(f' et {len(lowered)-6} autre(s)' if len(lowered)>6 else '')+' : un niveau écrit dans une route est un multiple de dix, au plus égal au plafond (Eurocontrol refuse F205 : SYN101) ; le profil du vol garde l’altitude du plafond.')
    band_runs=flight_profile.band_findings(legs,fl,profile.get('cruise_nm'),leg_levels(legs,words,marks))
    if band_runs and (generated or _path is not None):
        count=sum(len(r['legs']) for r in band_runs)
        issue('REVUE',f'Profil adapté aux plafonds : {count} tronçon{"s" if count>1 else ""} de croisière hors de la bande du niveau FL{fl:03d} (voie{"s" if len({r["legs"][0]["via"] for r in band_runs})>1 else ""} {", ".join(list(dict.fromkeys(r["legs"][0]["via"] for r in band_runs))[:6])}) : le palier y est ramené, voir `profile_changes`'+(' ; la route porte les changements de niveau (POINT/Fnnn).' if written else '.'))
    elif band_runs:
        for r in band_runs[:MAX_BAND_ISSUES]:
            issue('ERREUR',r['text'])
        if len(band_runs)>MAX_BAND_ISSUES:
            more=band_runs[MAX_BAND_ISSUES:]
            issue('ERREUR',f'{sum(len(r["legs"]) for r in more)} autres tronçons de croisière hors de la bande du niveau FL{fl:03d} ({len(more)} suites, voies {", ".join(list(dict.fromkeys(r["legs"][0]["via"] for r in more))[:8])}), non détaillés.')
        for r in band_runs:
            for l in r['legs']:
                l['alerts'].append(r['short']); l['compatible']=False
    floor_of=fra_floor.floors(rad)      # SOG-0401 (lot 3) : PROF407 d'Eurocontrol : une voie de la Suisse ou de l'Italie que le PROFIL met au-dessus du plancher de la route libre n'existe pas ; ERREUR pour une route SAISIE, REVUE pour une route de la recherche (qui garde la route la plus courte et le dit : à remplacer par des directs entre points de route libre, non calculé)
    floor_runs=fra_floor.findings(legs,floor_of)
    floor_unknown=fra_floor.unknown(legs,floor_of)
    if floor_runs and (generated or _path is not None):
        issue('REVUE',f'Voies au-dessus du plancher de la route libre : {sum(len(r["legs"]) for r in floor_runs)} tronçon(s) de voie ({", ".join(list(dict.fromkeys(r["legs"][0]["via"] for r in floor_runs))[:6])}) dans un espace de route libre (RAD, annexe 3B FRA LIM) : la voie n’y existe pas, Eurocontrol répondrait PROF407 ; à remplacer par des directs entre points de route libre (non calculé).')
    elif floor_runs:
        for r in floor_runs[:fra_floor.MAX_ISSUES]:issue('ERREUR',r['text'])
        if len(floor_runs)>fra_floor.MAX_ISSUES:issue('ERREUR',f'{sum(len(r["legs"]) for r in floor_runs[fra_floor.MAX_ISSUES:])} autres tronçons de voie volés dans un espace de route libre, non détaillés.')
    if floor_unknown:issue('REVUE',f'{floor_unknown} tronçon(s) de voie d’un pays à plancher de route libre dont le profil ne donne pas l’altitude : à examiner.')
    unread_fra=fra_floor.unread_issue(legs)      # SOG-0501 (c) : la route libre des États dont la base n'a ni contours ni niveaux : dite, jamais passée sous silence
    if unread_fra:issue('REVUE',unread_fra)
    for r in floor_runs:
        for l in r['legs']:
            l['alerts'].append(r['short'])
            if not (generated or _path is not None):l['compatible']=False
    nat_legs=[l['nat'] for l in legs if l.get('nat') and not l.get('nat_link') and (l['via'].startswith('NAT') or l['nat'].get('out_of_window') or l['nat'].get('partial'))]   # SOG-0263 : les tracks du jour sont prises même périmées, et dites
    seen_partial=set()
    if nat_legs:
        used=list(dict.fromkeys(n.get('letter') or n['track'] for n in nat_legs)); issued=next((n['issued'] for n in nat_legs if n.get('issued')),None); stale=any(n['stale'] for n in nat_legs if n.get('source')!='kept');kept=any(n.get('source')=='kept' for n in nat_legs)      # SOG-0394 : une route GARDÉE d'un message précédent n'est jamais « prise quand même » : elle n'est là que valable à l'heure de son passage
        outw=next((n for n in nat_legs if n.get('out_of_window')),None)      # SOG-0403 (R2) : une route prise HORS de sa fenêtre est dite, écrite point par point (jamais « NATx »)
        if outw:issue('REVUE',f'Route NAT hors de sa fenêtre : système du {issued or "?"} (de {(outw.get("from") or "?")[:16]} à {(outw.get("to") or "?")[:16]}), route {" ".join(used)} suivie point par point, sa liste de niveaux ne lie pas ; autorisation océanique non vérifiée.')
        for n in nat_legs:      # SOG-0414 : une route NAT que la base ne sait pas suivre d'un bout à l'autre est écrite point par point, et la raison est dite (jamais « NATx » pour une portion)
            pa=n.get('partial')
            if pa and n['track'] not in seen_partial:
                seen_partial.add(n['track'])
                many=len(pa['missing'])>1
                gone=f'sa sortie {pa["missing"][-1]} n\'est pas dans la base' if pa.get('exit_missing') and not many else (", ".join(pa["missing"])+(" ne sont" if many else " n\'est")+" pas dans la base")
                issue('REVUE',f'Route NAT {n.get("letter") or n["track"]} suivie de {pa["from"]} à {pa["to"]} seulement : {gone}'+(f' ; les routes nord-américaines {" / ".join(pa["nar"])} du message ne sont pas suivies' if pa.get('nar') else '')+' ; écrite point par point, jamais sous son nom.')
        if all(n.get('partial') for n in nat_legs) and not outw:pass
        elif not outw:issue('REVUE',f'Routes NAT du {issued or "?"}'+(', périmées' if stale else '')+f' : {" ".join("NAT"+t for t in used)}. '
              +('Prises quand même (le message en vigueur au moment du vol n\'est pas lu) ; ' if stale else "Route gardée d'un message précédent, valable à l'heure de son passage ; " if kept else 'Message du jour ; ')+'autorisation océanique non vérifiée.')
    random_legs=[l for l in legs if l.get('origin')=='random']
    if random_legs:issue('REVUE','Route libre océanique, créée : '+' '.join(dict.fromkeys(l['start']['id'] for l in random_legs))+' '+random_legs[-1]['end']['id']+' (un point par 10° de longitude, à la latitude entière du chemin le plus court). Non publiée : autorisation océanique non vérifiée.')
    sec=getattr(nav,'sections_info',None) or {}
    nd=sec.get('nat_discarded') if random_legs else None      # SOG-0421 : la route NAT valable écartée au profit de la route libre (+5 % ou plus) : dite avec l'écart, et la proximité d'une route NAT valable
    if nd:issue('REVUE',f"Route NAT {nd['track']} écartée : {nd['nm']:g} NM contre {nd['free_nm']:g} NM pour la route libre, {nd['extra_nm']:g} NM de plus (+{nd['extra_pct']:g} %, seuil {nd['max_pct']:g} %) ; la route libre est prise (« direct, pas forcément par le nord »).")
    for x in (sec.get('nat_near') or []) if nd else []:issue('REVUE',f"La route libre passe à moins d'un degré de latitude de la route NAT {x['track']} (à {x['min_deg']:g}°, entre {x['from_lon']:g}° et {x['to_lon']:g}°) : à contrôler.")
    if not nat_legs and legs and getattr(nav,'nat',None):   # SOG-0263 : un vol qui traverse sans track dans son sens le dit, au lieu de se taire
        hint=nat_layer.hint(nav,dep,arr)
        if hint:issue('REVUE',hint)
    for l in legs:   # SOG-0263 : le raccord du réseau à la track (entrée) ou de la track au réseau (sortie) est un DCT de simulation, dit « revue »
        if l.get('nat_link'):issue('REVUE',f'Raccord NAT ({"entrée" if l["nat_link"]=="entry" else "sortie"}) : DCT de {l["nm"]:.0f} NM {l["start"]["id"]}–{l["end"]["id"]}, simulation (aucune route lue).')
    xp=[l for l in legs if l.get('src')=='xplane']      # SOG-0474 suite : des tronçons du réseau de repli X-Plane (personnel, non officiel) : dits, avec le cycle
    if xp:
        names=sorted({l['via'] for l in xp if l['via']!='DCT'})[:8]
        issue('REVUE',f"Réseau X-Plane (Navigraph), personnel, cycle {(getattr(nav,'xplane',None) or {}).get('cycle') or '?'} : {len(xp)} tronçon(s) ({', '.join(names)}) d'un État sans réseau officiel — non officiel, à vérifier.")
    for l in legs:      # SOG-0476 : la base n'a pas de liaison entre deux parties du réseau : un direct, dit avec ses deux bouts et sa longueur
        if l.get('no_network')=='gap':
            from_id,to_id,km=l['start']['id'],l['end']['id'],l['nm']
            issue('REVUE',f"Réseau absent : la base n'a pas de liaison entre {from_id} et {to_id} ; un direct de {km:.0f} NM les relie, simulation non validée (aucune route lue).",'network_gap',True,from_point=from_id,to_point=to_id,nm=round(km))      # SOG-0532 (6) : un direct inventé entre deux parties du réseau : non vérifiable, nommé
    for l in legs:      # SOG-0474 : le terrain n'a aucun point du réseau à portée de raccord (la base n'a pas le réseau de son État) : la route va jusqu'au dernier point connu, puis UN direct, dit
        if l.get('no_network') is True:
            far_end=l['end'] if l['start']['id'] in (dep,arr) else l['start']
            ad_end=l['start'] if far_end is l['end'] else l['end']
            ad_id,far_id,km=ad_end['id'],far_end['id'],l['nm']
            issue('REVUE',f"Réseau absent : la base n'a pas le réseau de cet État près de {ad_id} ; la route s'arrête au dernier point connu {far_id}, puis un direct de {km:.0f} NM jusqu'au terrain, simulation non validée (aucune route lue).")
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
            issue('ERREUR',f'Interdiction RAD explicite {block["id"]} ({block["sheet"]}, ligne {block["row"]}){" enfreinte : aucune route sans infraction, la meilleure est rendue" if fallback else ""}.','rad_block',id=block['id'],sheet=block['sheet'],row=block['row'],target=rad_flight.leg_label(affected[0]))      # SOG-0532 lot 2 bis : `target` : l'élément de la ROUTE que la règle atteint (le premier tronçon touché)      # SOG-0532 (3) : une règle connue enfreinte est une ERREUR, jamais une revue (route calculée comme route tapée)
            for l in affected: l['alerts'].append('Interdiction RAD '+block['id'])
    # Full-flight conditions see the expanded SID/STAR, not only filed endpoints.
    elapsed=0.
    for leg in legs:
        leg['time_start_min']=elapsed;elapsed+=leg['nm']/(leg.get('planned_speed_kt') or options['speed_kt'])*60;leg['time_end_min']=elapsed
    rad_summary=rad_flight.evaluate(rad,legs,dep,arr,when,candidates,set(nav.ids)|used_routes,fl,nav.airway_portion,natural=not marks and not written)      # SOG-0513 (A) : sans changement de niveau dans la route, les règles de niveau jugent le profil du niveau déposé
    atomic_ids={(b['sheet'],b['row']) for b in violations}
    not_verified=rad_flight.not_verified(rad,legs,dep,arr,candidates,set(nav.ids)|used_routes,nav.airway_portion)      # SOG-0532 lot 2 : par État, le COMPTE des règles du RAD dont la cible est volée et non décidées (avec leur raison en code), et celui des règles qui ne visent qu'un espace inconnu ; la phrase « Règles RAD NON appliquées » (SOG-0501 (c)) n'est plus dite : une ligne par État
    for nv in not_verified:
        issue('REVUE',f"RAD, État {nv['state']} : "+(f"{nv['flown']} règle(s) visent un tronçon ou un point de cette route et n'ont pas pu être vérifiées" if nv['flown'] else '')+(' ; ' if nv['flown'] and nv['spaces_only'] else '')+(f"{nv['spaces_only']} règle(s) ne visent qu'un espace que la base ne connaît pas" if nv['spaces_only'] else '')+'.','rad_unread',True,state=nv['state'],flown=nv['flown'],spaces_only=nv['spaces_only'])
    for finding in rad_summary['findings']:
        if (finding['sheet'],finding['row']) not in atomic_ids:issue('ERREUR',('Règle RAD enfreinte (aucune route sans infraction, la meilleure est rendue) : ' if fallback else '')+finding['text'],'rad_rule',id=finding['id'],sheet=finding['sheet'],row=finding['row'],**({'target':finding['target']} if finding.get('target') else {}))      # SOG-0532 lot 2 bis : `target` : le tronçon ou le point de la route qui a déclenché la règle      # SOG-0532 (3)
        for index in finding['segments']:
            leg=legs[index];leg['alerts'].append('RAD '+finding['id']+' : '+', '.join(finding['phases']));leg['compatible']=False
    for c in candidates:
        if any(x['sheet']==c['sheet'] and x['row']==c['row'] for x in violations): c['assessment']='INFRACTION : interdiction simple H24 applicable'
    fra_loaded=bool(getattr(nav,'fra',None) and nav.fra.book)
    if request.get('use_procedures'):
        selected_kinds={l.get('kind') for l in legs}
        for l in legs:      # SOG-0374 : une SID lue en partie (point de sortie et niveaux) est dite : son tracé n'est pas lu
            if l.get('procedure_partial'):issue('REVUE',f'{l["procedure_airport"]} : SID {l["procedure_name"]} lue en partie : point de sortie et niveaux ; tracé non lu, voir la carte.')
        for ad,kind in [(dep,'SID'),(arr,'STAR')]:
            if kind not in selected_kinds:
                stats=nav.procedures.stats.get(ad,{})
                issue('REVUE',f'{ad} : aucune {kind} complète connectée utilisée ; raccord DCT de simulation. Catalogue : {stats.get(kind+"_total",0)} procédures, {stats.get(kind+"_usable",0)} résolues, {stats.get(kind+"_incomplete",0)} incomplètes, {stats.get(kind+"_doubt",0)} douteuses.'+(f' {stats[kind+"_above_level"]} refusée(s) à ce niveau : leur point {"d’entrée" if kind=="STAR" else "de sortie"} exige une altitude au-dessus du niveau de croisière FL{fl:03d}.' if stats.get(kind+'_above_level') else ''))
    dct_summary,dct_issues=dct_limits.check(rad,legs,dep,arr,request.get('mode')=='validate',nav.procedures,fl*100,strict=True)      # SOG-0401 (lot 3) : ROUTE135 d'Eurocontrol : un direct au raccord au-delà de la limite du RAD
    for level,text,*meta in dct_issues:issue(level,text,*([meta[0]['code'],meta[0].get('unverifiable',False)] if meta else []),**(meta[0]['values'] if meta else {}))
    for level,text,*meta in space_dct.check(rad,legs,lambda:space_dct.spaces_of(nav),True,dep,arr,True):issue(level,text,*([meta[0]['code']] if meta else []),**(meta[0]['values'] if meta else {}))      # SOG-0532 (3) : un direct décidé trop long est une ERREUR, route calculée ou tapée      # SOG-0513 lot C : ROUTE165 : la limite d'un direct dans EGTTNFRA (au-dessus de FL245 : 0 NM)
    gaps=[dict(name='FRA : géométrie et NPZ',reason='Points FRA, rôles E/X/I/A/D, niveaux numériques et horaires simples utilisés. Volumes des FRA, NPZ et règles complexes non fournis par la liste de points : les liaisons sont des candidates à contrôler.' if fra_loaded else 'Aucune liste FRA ne couvre cette date. Les DCT ne sont pas des autorisations FRA.'),
          dict(name='Sens et vitesses limites',reason='Sens autorisés et limites de vitesse absents des fichiers airways ; vitesse sol saisie utilisée pour le profil.'),
          dict(name='RAD complet',reason='Le vol entier, SID/STAR développées comprises, est le périmètre du contrôle. Seules les formes de conditions explicitement prises en charge sont décidées. Conditions complexes, doublons ambigus, plafonnements conditionnels et géométrie des espaces restent à interpréter.'),
          dict(name='Procédures et environnement',reason='SID/STAR complètes sélectionnées depuis AeroDB, selon la piste. Tracé entre points codés, sans modèle de virage ni certification ARINC. Approche finale, IAS, parité, QNH, vent, performances, relief, NOTAM et activations EAUP/EUUP non évalués.')]
    if not rad.book: issue('REVUE','Aucun RAD fourni ne couvre cette date : contrôle RAD indisponible.')
    usedcycles={}      # SOG-0411 : (zone, cycle) → les tronçons qui en viennent (la remarque dit CE qui est périmé, pas seulement la zone)
    for u,v,e in parsed:
        if e.get('zone'):usedcycles.setdefault((e['zone'],e.get('source_cycle') or nav.cycles.get(e['zone'])),[]).append((e.get('route') or '?',nav.nodes[u]['id'],nav.nodes[v]['id']))
    for (zone,cycle),legs_of in sorted(usedcycles.items(),key=lambda x:(x[0][0],x[0][1] or '')):
        if cycle and (when.date()-dt.date.fromisoformat(cycle)).days>=28:
            named=[]      # un tronçon par voie : de son premier point au dernier (« N260B-N271B (NICSO → ALLEX) »)
            for via,a_,b_ in legs_of:
                if named and named[-1][0]==via:named[-1][2]=b_
                else:named.append([via,a_,b_])
            seen_cycle=nav.cycles.get(zone)
            issue('REVUE',f'Cycle de navigation périmé pour {zone.upper()} : {cycle}, source de '+', '.join(f'{v} ({a_} → {b_})' for v,a_,b_ in named[:4])+(f' et {len(named)-4} autre(s)' if len(named)>4 else '')+(f' ; le cycle courant de la zone est {seen_cycle}' if seen_cycle and seen_cycle!=cycle else '')+'.','stale_cycle',True,zone=zone,cycle=cycle,current=seen_cycle,routes=[v for v,_a,_b in named[:6]])      # SOG-0532 (6) : un État dont les données sont d'un cycle périmé : « non vérifiable » pour cet État, nommé
    if request.get('fl_basis')=='default':issues.insert(0,dict(level='REVUE',text=f"Niveau du vol absent : le calcul est fait au FL{fl:03d}, le niveau par défaut du moteur ; un autre niveau donne d'autres voies (les voies ont leurs bandes de niveau)."))      # SOG-0517 : la demande n'avait pas de niveau (Carburant : le vol sans niveau) : dit EN TÊTE (l'IFPS de l'utilisateur du 19/11 : calculé au FL180, déposé au FL270)
    errors=[x for x in issues if x['level']=='ERREUR']
    violations=[dict(code=x.get('code') or 'other',values=x.get('values') or {},text=x['text'][:300]) for x in errors[:MAX_VERDICT_ITEMS]]      # SOG-0532 (3) : les règles CONNUES enfreintes (jamais confondues avec ce qui n'a pas pu être vérifié)
    unverifiable=[dict(code=x['code'],values=x.get('values') or {},text=x['text'][:300]) for x in issues if x['level']=='REVUE' and x.get('unverifiable')][:MAX_VERDICT_ITEMS]      # ce que le contrôle n'a pas pu vérifier, nommé
    warnings=[dict(code=x['code'],values=x.get('values') or {},text=x['text'][:300]) for x in issues if x['level']=='REVUE' and x.get('code') in WARNING_CODES][:MAX_VERDICT_ITEMS]      # SOG-0530 : les avertissements, à part : ni une violation ni un non-vérifiable
    data_gaps=[dict(start=l['start']['id'],end=l['end']['id'],via=l['via'],reason=l['data_gap']) for l in legs if l.get('data_gap')]
    status='ERREURS DÉTECTÉES' if errors else 'CONTRÔLE INCOMPLET — DONNÉES MANQUANTES' if data_gaps else 'CONTRÔLE PARTIEL — À VÉRIFIER'
    result=dict(ok=True,status=status,verdict='violates' if violations else 'unverifiable' if unverifiable or data_gaps else 'conform',violations=violations,unverifiable=unverifiable,warnings=warnings,level_rule=dict(level_stats,warnings=len(level_warnings),undecided=len(level_open)) if legs else None,generated=generated,route=route,fl=fl,date=when.isoformat(timespec='minutes')+'Z',
        dep=dep,arr=arr,data_gaps=data_gaps,coverage_complete=not data_gaps,distance_nm=round(sum(l['nm'] for l in legs),1),legs=legs,issues=issues,rad=candidates,
        rad_source={k:rad.book[k] for k in ['file','title','start','end_exclusive','sha256']} if rad.book else None,
        coverage=nav.coverage,rad_summary=rad_summary,not_verified=not_verified,dct_limits=dct_summary,fra_floors=dict(applied=floor_of,not_read=[fra_floor.NOT_READ[z] for z in sorted(fra_floor.NOT_READ)],runs=len(floor_runs),unknown=floor_unknown),rad_atomic_rules=len(blocks),profile=profile,profile_changes=profile.get('changes',[]),profile_changes_total=profile.get('changes_total',0),gaps=gaps,via=mandatory,via_checks=via_checks,
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
