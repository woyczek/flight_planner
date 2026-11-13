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
LINK_NM = 900                         # un raccord DCT de simulation : jusqu'à 900 NM (la côte est loin du premier repère océanique, et le Canada n'a pas de points dans la base) ; le plus proche est le moins cher
LINK_NODES = 3
HIGH_FT = 24500                      # un airway « haut » : son plafond atteint au moins cette altitude
NAME = re.compile(r'[A-Z][A-Z0-9]{1,6}')
TRACK = re.compile(r'[A-Z]{1,2}')
COORD = re.compile(r'(\d{2})(\d{2})?/(\d{2,3})')


def path_of(nav):
    return nav.data_dir / 'sia' / 'zones' / 'nat' / 'nat_tracks.json'


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
            v = int(str(x).strip())
        except ValueError:
            continue
        if 100 <= v <= 600:
            out.append(v)
    return sorted(set(out))


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


def read(path):
    """Le fichier en entrée lue : ({ tracks: [track nettoyées] }, [raisons de ce qui est laissé]) ; ({}, [raison]) sans fichier lisible."""
    skipped = []
    try:
        if path.stat().st_size > MAX_BYTES:
            return [], ['file-too-big']
        doc = json.loads(path.read_text(encoding='utf-8-sig'))
    except (OSError, ValueError):
        return [], ['no-file']
    rows = doc.get('tracks') if isinstance(doc, dict) else None
    if not isinstance(rows, list):
        return [], ['no-tracks']
    out = []
    for t in rows[:MAX_TRACKS]:
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


def add(nav, nm):
    """Ajoute les tracks du fichier au graphe `nav` (voir l'en-tête) ; rend `nav.nat` = { tracks: [id], issued: 'JJ/MM' | None, stale: bool, skipped: [raisons], links: n } (aussi posé sur nav)."""
    nav.nat = {'tracks': [], 'issued': None, 'stale': False, 'skipped': [], 'links': 0}
    tracks, skipped = read(path_of(nav))
    nav.nat['skipped'] = skipped
    if not tracks:
        return nav.nat
    day = nav.date if isinstance(nav.date, dt.date) else None
    if day is None:
        try:
            day = dt.date.fromisoformat(str(nav.date)[:10])
        except ValueError:
            day = None
    network = {x for e in nav.edges for x in (e['a'], e['b'])}
    high = {x for e in nav.edges if isinstance(e.get('upper'), (int, float)) and e['upper'] >= HIGH_FT for x in (e['a'], e['b'])}
    issued = [t['from'] for t in tracks if t['from']]
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
        levels = t['east'] + t['west']
        lower, upper = min(levels) * 100, max(levels) * 100
        direction = 'west' if t['west'] and not t['east'] else 'east' if t['east'] and not t['west'] else 'both'
        stale = bool(t['to'] and day and t['to'].date() < day)
        meta = {'track': t['id'], 'direction': direction, 'from': t['from'].strftime('%Y-%m-%dT%H:%M:%SZ') if t['from'] else None,
                'to': t['to'].strftime('%Y-%m-%dT%H:%M:%SZ') if t['to'] else None, 'stale': stale, 'issued': t['from'].strftime('%d/%m') if t['from'] else None}
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
        nav.nat['tracks'].append(t['id'])
        nav.nat['stale'] = nav.nat['stale'] or stale
    return nav.nat
