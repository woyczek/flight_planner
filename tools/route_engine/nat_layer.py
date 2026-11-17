"""La couche « NAT » du graphe du moteur (SOG-0263) : les tracks du jour de l'Atlantique Nord, prises MÊME PÉRIMÉES, dites périmées.

Le fichier `<data>/sia/zones/nat/nat_tracks.json` (FAA NMS, écrit par le lanceur) : { tracks: [{ id, route: [points], east: [niveaux], west: [niveaux], nar, by, from, to }] } ; un point est un
nom de repère (« VENER ») ou une coordonnée NAT (« 5530/20 » : 55°30'N 020°W, « 57/30 » : 57°N 030°W). C'est une ENTRÉE LUE (rien pris tel quel, SOG-0263) : au plus MAX_TRACKS tracks de MAX_POINTS
points, un identifiant de track `[A-Z]{1,2}`, un nom de repère `[A-Z][A-Z0-9]{1,6}`, des coordonnées finies dans le globe, des niveaux entiers de 100 à 600, des dates ISO ; ce qui n'est pas dans ces bornes
est laissé de côté (et dit dans `nav.nat['skipped']`), jamais corrigé à la volée.

Ce que la couche ajoute au graphe (`add(nav)`, appelée par Nav.__init__ après les airways) :
  · pour chaque track, une chaîne d'arêtes `route = 'NAT<id>'`, `dir = 'F'` (l'ordre du message est le sens du flux ; les deux sens seulement si le message donne des niveaux est ET ouest), niveaux = le plus bas
    et le plus haut de ses niveaux × 100 ft, `nat = { track, direction, from, to, stale, issued }` ; `stale` : la validité de la track (`to`) est antérieure à la date du vol (`nav.date`) : elle est PRISE quand même ;
  · un repère nommé que la base connaît PARTAGE son nœud (il touche déjà les airways et le graphe FRA) ; plusieurs homonymes : le plus proche des coordonnées de la track ; un repère inconnu sans coordonnées
    ne se place pas : la chaîne commence au premier repère placé (dit dans `skipped`) ;
  · l'ENTRÉE et la SORTIE (premier et dernier repère placés) qui ne touchent aucun airway HAUT de la base sont raccordées par un DCT de simulation aux LINK_NODES nœuds du réseau haut les plus proches à moins de
    LINK_NM NM (entrée : du réseau vers la track ; sortie : de la track vers le réseau), arêtes `nat_link` : le contrôle les dit « revue » (aucune route lue)."""
import datetime as dt
import json
import re

MAX_BYTES = 2_000_000
MAX_TRACKS = 60
MAX_POINTS = 40
PAST_NAME = 'nat_past.json'          # SOG-0394 : les routes qui sont sorties de nat_tracks.json à une relecture (écrites à côté par tools/aero_fetch.py nat) : lues comme une entrée NON FIABLE, prises seulement si elles sont valables à l'heure du passage
MAX_PAST = 120
LINK_NM = 900                         # un raccord DCT de simulation : jusqu'à 900 NM (la côte est loin du premier repère océanique, et le Canada n'a pas de points dans la base) ; le plus proche est le moins cher
LINK_NODES = 3
MIN_COMPONENT = 200                  # un réseau d'au moins 200 nœuds connexes : celui d'un pays, pas un îlot
HIGH_FT = 24500                      # un airway « haut » : son plafond atteint au moins cette altitude
NAME = re.compile(r'[A-Z][A-Z0-9]{1,6}', re.A)      # re.A : jamais de chiffres ou de lettres d'une autre écriture
TRACK = re.compile(r'[A-Z]{1,2}', re.A)
COORD = re.compile(r'(\d{2})(\d{2})?/(\d{2,3})', re.A)


def path_of(nav):
    return nav.data_dir / 'sia' / 'zones' / 'nat' / 'nat_tracks.json'


def path_past(nav):
    return nav.data_dir / 'sia' / 'zones' / 'nat' / PAST_NAME


def key_of(t):
    """La clé d'une route : (lettre, début de validité, sens), comme tools/aero_fetch.py (nat_key)."""
    return (t['id'], t['from'].strftime('%Y-%m-%dT%H:%M:%SZ') if t['from'] else '', 'east' if t['east'] and not t['west'] else 'west' if t['west'] and not t['east'] else 'both')


def _date(text):
    """Un instant ISO (« 2026-11-13T11:30:00Z ») → datetime UTC ; None sinon."""
    if not isinstance(text, str) or len(text) > 40:
        return None
    try:
        d = dt.datetime.fromisoformat(text.strip().replace('Z', '+00:00'))
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


def _levels(raw):
    out = []
    for x in raw if isinstance(raw, list) else []:
        try:
            s = str(x).strip()
            v = int(s) if s.isascii() else 0      # chiffres d'une autre écriture : pas un niveau (comme `re.A` pour les repères)
        except ValueError:
            continue
        if 100 <= v <= 600:
            out.append(v)
    return sorted(set(out))


def check(meta, fl, east, eta=None):
    """SOG-0354 L5 (1) : une track est-elle valable POUR CE VOL ? None si oui, sinon (code, phrase) : `direction` (le sens de la track n'est pas celui du vol), `level` (le niveau demandé n'est pas dans la LISTE des niveaux de la track pour ce sens), `time` (l'heure estimée au passage de l'entrée, `eta`, un datetime UTC, n'est pas dans la
    validité du message : `from` / `to`). Chaque track écartée est dite avec sa raison, une fois : jamais une omission silencieuse. `meta` : la méta d'une track (nav.nat['meta'][id])."""
    kept = meta.get('source') == 'kept'      # SOG-0394 : une route GARDÉE d'un message précédent n'est prise que si l'heure du passage de son entrée est dans SA fenêtre : jamais « périmée prise quand même », et sans heure elle ne peut pas être prise
    tid, direction = meta.get('label') or meta['track'], meta.get('direction')
    wanted = 'east' if east else 'west'
    if direction not in (wanted, 'both'):
        return 'direction', f"route NAT {tid} : sens contraire (la track va vers l'{'ouest' if direction == 'west' else 'est'}, le vol vers l'{'est' if east else 'ouest'})"
    levels = meta.get('levels_' + wanted)
    if isinstance(levels, list) and levels and int(fl) not in levels:
        return 'level', f"route NAT {tid} : FL{int(fl)} non proposé vers l'{'est' if east else 'ouest'} (FL{levels[0]} à FL{levels[-1]})"
    if eta is not None and (kept or not meta.get('stale')):      # un message PÉRIMÉ (d'un jour passé) est utilisé et dit périmé (règle du 13/11, K237) : ses heures ne sont pas contrôlées
        a, b = _date(meta.get('from')), _date(meta.get('to'))
        t = eta if eta.tzinfo else eta.replace(tzinfo=dt.timezone.utc)      # la validité d'une route NAT s'entend à l'heure de PASSAGE de l'entrée (décision de l'ergonomie, 16 nov.) : l'heure estimée à l'entrée est dans la fenêtre
        if (a and t < a) or (b and t > b):
            window = ' de ' + a.strftime('%H%M') + 'Z' if a else ''
            window += (' à ' + b.strftime('%H%M') + 'Z') if b else ''
            return 'time', f"route NAT {tid} : non valide à {t.strftime('%H%M')}Z (valide{window})"
    return None


MERIDIAN = -30.0      # SOG-0403 : la validité d'un système de routes NAT se juge au passage du 30° OUEST (NAT Doc 007, § 2.1.1 et 2.1.3 : « Day-time OTS 1130 UTC to 1900 UTC at 30°W »)
NEAR_MIN = 60         # SOG-0403 : une route écartée pour l'heure à moins d'une heure près dit de combien et à partir de quelle heure de départ elle serait prise


def time_fields(meta, eta, entry=None, point=None, hour=None):
    """SOG-0391 (a) : une track écartée pour l'HEURE dit, en CHAMPS, l'heure du passage de son entrée (`at`, « 2026-11-17T13:32Z »), le point d'entrée (`entry`) et la fenêtre du message (`from`, `to`, « 2026-11-17T01:30:00Z » ; None si le message n'en donne pas) : l'écran ne lit aucun mot."""
    t = eta if eta.tzinfo else eta.replace(tzinfo=dt.timezone.utc)
    out = {'at': t.strftime('%Y-%m-%dT%H:%MZ'), 'point': point or 'entry', 'entry': entry, 'from': meta.get('from'), 'to': meta.get('to')}      # `at` : l'heure estimée au `point` (« 30W » : le passage du 30° ouest ; « entry » : l'entrée, quand la route ne le franchit pas)
    a, b = _date(meta.get('from')), _date(meta.get('to'))
    if hour is not None and not meta.get('stale'):
        d = hour if hour.tzinfo else hour.replace(tzinfo=dt.timezone.utc)
        late = (t - b).total_seconds() / 60 if b and t > b else None      # SOG-0403 : à moins d'une heure près : de combien, et à partir de / jusqu'à quelle heure de départ la route serait prise
        early = (a - t).total_seconds() / 60 if a and t < a else None
        if late is not None and late <= NEAR_MIN:
            out['near'] = {'minutes': round(late), 'side': 'late', 'depart_until': (d - dt.timedelta(minutes=late)).strftime('%Y-%m-%dT%H:%MZ')}
        elif early is not None and early <= NEAR_MIN:
            out['near'] = {'minutes': round(early), 'side': 'early', 'depart_from': (d + dt.timedelta(minutes=early)).strftime('%Y-%m-%dT%H:%MZ')}
    return out


def unknown_hour(meta):
    """SOG-0394 : une route GARDÉE ne se prend pas sans heure de passage : (code, phrase) de son écart."""
    return 'time', f"route NAT {meta.get('label') or meta['track']} : l'heure de passage n'est pas connue : la validité d'une route gardée ne peut pas être vérifiée"


def coordinate(token):
    """(lat, lon) d'une coordonnée NAT (« 5530/20 », « 57/30 ») : nord, ouest ; None sinon."""
    m = COORD.fullmatch(token)
    if not m:
        return None
    la = int(m.group(1)) + int(m.group(2) or 0) / 60
    lo = int(m.group(3))
    if la > 90 or lo > 180 or int(m.group(2) or 0) > 59:
        return None
    return (la, -float(lo))


def read(path, limit=MAX_TRACKS):
    """Le fichier en entrée lue : ({ tracks: [track nettoyées] }, [raisons de ce qui est laissé]) ; ({}, [raison]) sans fichier lisible."""
    skipped = []
    try:
        if path.stat().st_size > MAX_BYTES:
            return [], ['file-too-big']
        doc = json.loads(path.read_text(encoding='utf-8-sig'))
    except (OSError, ValueError, RecursionError, MemoryError):      # une imbrication profonde ou un fichier énorme : « illisible », comme un fichier absent
        return [], ['no-file']
    rows = doc.get('tracks') if isinstance(doc, dict) else None
    if not isinstance(rows, list):
        return [], ['no-tracks']
    out = []
    for t in rows[:limit]:
        if not isinstance(t, dict) or not isinstance(t.get('id'), str) or not TRACK.fullmatch(t['id'].strip().upper()):
            skipped.append('bad-track')
            continue
        tid = t['id'].strip().upper()
        east, west = _levels(t.get('east')), _levels(t.get('west'))
        route = t.get('route')
        if not (east or west) or not isinstance(route, list) or len(route) < 2 or len(route) > MAX_POINTS:
            skipped.append(f'{tid}: shape')
            continue
        pts = []
        for p in route:
            s = str(p).strip().upper() if isinstance(p, (str, int, float)) else ''
            if COORD.fullmatch(s):
                c = coordinate(s)
                if c:
                    pts.append({'id': s, 'lat': c[0], 'lon': c[1]})
                    continue
            elif NAME.fullmatch(s):
                pts.append({'id': s})
                continue
            skipped.append(f'{tid}: point')
        if len(pts) < 2:
            skipped.append(f'{tid}: points')
            continue
        out.append({'id': tid, 'points': pts, 'east': east, 'west': west, 'from': _date(t.get('from')), 'to': _date(t.get('to'))})
    return out, skipped


def hint(nav, dep, arr):
    """Une phrase quand le vol traverse l'Atlantique (départ à l'ouest de 35°W, arrivée à l'est de 15°W, ou l'inverse) et qu'AUCUNE track du message ne va dans son sens : « Aucune route NAT vers l'est dans le message du 13/11. » ; '' sinon (pas de couche, pas de traversée, ou une track dans le bon sens)."""
    info = getattr(nav, 'nat', None)
    if not info or not info.get('tracks'):
        return ''
    a, b = nav.ads.get(dep), nav.ads.get(arr)
    if not a or not b:
        return ''
    east = a['lon'] < -35 and b['lon'] > -15
    west = a['lon'] > -15 and b['lon'] < -35
    if not (east or west):
        return ''
    want = 'east' if east else 'west'
    if want in info.get('directions', ()):
        return ''
    return f"Aucune route NAT vers {'l' + chr(39) + 'est' if east else 'l' + chr(39) + 'ouest'} dans le message du {info.get('issued') or '?'}."


def main_network(nav):
    """Les nœuds du réseau HAUT (airways dont le plafond atteint HIGH_FT) qui sont dans une composante CONNEXE d'au moins MIN_COMPONENT nœuds : un nœud d'airway isolé (un îlot de quelques points, sans lien avec le réseau d'un pays) n'est pas
    un raccord : une track qui s'y raccorde ne mène nulle part (mesuré le 13/11 : trois nœuds irlandais voisins de l'entrée d'une track, sans aucune voie vers le Royaume-Uni). Composantes par union-find sur les arêtes hautes, sans tenir compte du sens."""
    parent = {}

    def find(x):
        while parent.setdefault(x, x) != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for e in nav.edges:
        if isinstance(e.get('upper'), (int, float)) and e['upper'] >= HIGH_FT and not e.get('nat'):
            ra, rb = find(e['a']), find(e['b'])
            if ra != rb:
                parent[ra] = rb
    size = {}
    for x in list(parent):
        r = find(x)
        size[r] = size.get(r, 0) + 1
    floor = min(MIN_COMPONENT, max(3, max(size.values(), default=0) // 4))      # sur une base de banc de quelques nœuds, un quart de la plus grande composante
    return {x for x in parent if size[find(x)] >= floor}


def add(nav, nm):
    """Ajoute les tracks du fichier au graphe `nav` (voir l'en-tête) ; rend `nav.nat` = { tracks: [id], issued: 'JJ/MM' | None, stale: bool, skipped: [raisons], links: n } (aussi posé sur nav)."""
    nav.nat = {'tracks': [], 'issued': None, 'stale': False, 'skipped': [], 'links': 0, 'directions': []}
    tracks, skipped = read(path_of(nav))
    nav.nat['skipped'] = skipped
    past, past_skipped = read(path_past(nav), MAX_PAST)      # SOG-0394 : les routes gardées (entrée non fiable : mêmes bornes que le fichier du jour)
    here = {key_of(t) for t in tracks}
    kept = [dict(t, kept=True) for t in past if key_of(t) not in here]
    nav.nat['kept'] = []
    if past_skipped and past_skipped != ['no-file']:
        nav.nat['skipped'].append('nat_past: ' + ', '.join(sorted(set(past_skipped))[:3]))
    if not tracks and not kept:
        return nav.nat
    tracks = tracks + kept
    day = nav.date if isinstance(nav.date, dt.date) else None
    if day is None:
        try:
            day = dt.date.fromisoformat(str(nav.date)[:10])
        except ValueError:
            day = None
    high = main_network(nav)
    issued = [t['from'] for t in tracks if t['from'] and not t.get('kept')]
    nav.nat['issued'] = min(issued).strftime('%d/%m') if issued else None
    for t in tracks:
        # les repères : placés (clé du nœud) ou laissés de côté
        anchor = next((p for p in t['points'] if 'lat' in p), None)
        keys = []
        for p in t['points']:
            if 'lat' in p:
                keys.append(nav.add({'id': p['id'], 'lat': p['lat'], 'lon': p['lon']}))
                continue
            cands = [k for k in nav.ids.get(p['id'], []) if k in nav.nodes]
            if not cands:
                nav.nat['skipped'].append(f'{t["id"]}: {p["id"]} inconnu')
                continue
            if anchor and len(cands) > 1:
                cands.sort(key=lambda k: nm(nav.nodes[k], anchor))
            keys.append(cands[0])
        keys = [k for i, k in enumerate(keys) if i == 0 or k != keys[i - 1]]
        if len(keys) < 2:
            nav.nat['skipped'].append(f'{t["id"]}: moins de deux repères placés')
            continue
        isk = bool(t.get('kept'))
        tid = t['id'] + '~' + t['from'].strftime('%Y%m%d%H%M') if isk and t['from'] else t['id'] + '~' + t['to'].strftime('%Y%m%d%H%M') if isk else t['id']      # une route gardée porte une clé qui ne se confond pas avec la lettre du jour
        levels = t['east'] + t['west']
        lower, upper = min(levels) * 100, max(levels) * 100
        direction = 'west' if t['west'] and not t['east'] else 'east' if t['east'] and not t['west'] else 'both'
        stale = bool(t['to'] and day and t['to'].date() < day)
        meta = {'track': tid, 'direction': direction, 'levels': sorted(set(levels)), 'levels_east': list(t['east']), 'levels_west': list(t['west']), 'from': t['from'].strftime('%Y-%m-%dT%H:%M:%SZ') if t['from'] else None,
                'to': t['to'].strftime('%Y-%m-%dT%H:%M:%SZ') if t['to'] else None, 'stale': stale, 'issued': t['from'].strftime('%d/%m') if t['from'] else None}
        if isk:      # SOG-0394 : la lettre, la source et le nom dit (« R gardée du 17/11 ») d'une route gardée
            meta.update(letter=t['id'], source='kept', label=f"{t['id']} (gardée du {meta['issued'] or '?'})")
        sense = 'FB' if direction == 'both' else 'F'
        for a, b in zip(keys, keys[1:]):
            nav.edges.append(dict(a=a, b=b, route='NAT' + t['id'], lower=lower, upper=upper, dir=sense, nm=nm(nav.nodes[a], nav.nodes[b]), zone='nat',
                                  source_cycle=(t['from'].strftime('%Y-%m-%d') if t['from'] else None), nat=meta))
        for end, node, into in (('entry', keys[0], True), ('exit', keys[-1], False)):
            if node in high:
                continue
            near = sorted((nm(nav.nodes[node], nav.nodes[k]), k) for k in high if k != node and abs(nav.nodes[k]['lat'] - nav.nodes[node]['lat']) < LINK_NM / 60 + .1)
            near = [(d, k) for d, k in near if d <= LINK_NM][:LINK_NODES]
            for d, k in near:
                a, b = (k, node) if into else (node, k)
                nav.edges.append(dict(a=a, b=b, route='DCT', lower=lower, upper=upper, dir='F', nm=d, zone='nat', source_cycle=meta['from'] and meta['from'][:10], nat_link=end, nat=meta))
                nav.nat['links'] += 1
            if not near:
                nav.nat['skipped'].append(f'{t["id"]}: {end} sans réseau haut à moins de {LINK_NM} NM')
        nav.nat['tracks'].append(tid)
        if isk:
            nav.nat['kept'].append(tid)
        nav.nat.setdefault('points', {})[tid] = [{'id': nav.nodes[k]['id'], 'lat': nav.nodes[k]['lat'], 'lon': nav.nodes[k]['lon']} for k in keys]      # SOG-0394 : les points de la route, pour que l'écran n'ait pas à lire le fichier
        nav.nat.setdefault('ends', {})[tid] = [keys[0], keys[-1]]      # SOG-0354 L5 (2) : les deux extrémités de chaque route du jour : les entrées et les sorties d'une route libre créée (free_route)
        nav.nat.setdefault('meta', {})[tid] = meta      # SOG-0354 L5 : la méta de chaque track, pour dire pourquoi l'une est écartée (check)
        if not isk:      # la phrase « aucune route NAT vers l'est dans le message du… » et l'état périmé ne parlent que de la dernière publication
            nav.nat['directions'] = sorted(set(nav.nat['directions']) | ({'east', 'west'} if direction == 'both' else {direction}))
            nav.nat['stale'] = nav.nat['stale'] or stale
    return nav.nat
