"""Le noyau commun des lecteurs d'eAIP au format EUROCONTROL / Annexe 15 (V3, 11 nov. 2026, SOG-0240 : « trouver des sources », première famille F1).

Un eAIP d'Annexe 15 publie, en HTML, un fichier par section : ENR 4.4 (points désignés : nom, coordonnées, routes, remarques), ENR 4.1 (aides radio), ENR 3.x (routes : un bloc par route, un point par ligne, le tronçon qui le suit).
Ce qui est commun à tous les États — lire une coordonnée « 523012N » / « 0073848W », une limite « FL245 » / « 3000 ft », une date « 29 OCT 2026 », écrire le même GeoJSON (des « Feature » `sog: 'point'` et `sog: 'airway'` que lit
shared/aero_sources.js), nommer le fichier d'une édition (« <nom>_AAAAMMJJ.geojson », dont tools/aero_cycles.py lit le cycle AIRAC) — est ICI ; ce qui dépend de la mise en page d'un État (les identifiants de lignes d'Irlande, ceux de
la Suède, les classes des tableaux du Portugal…) reste dans le profil de cet État : tools/airnav_eaip.py (Irlande), tools/lfv_eaip.py (Suède), puis les autres. Refactoring à comportement identique : les deux lecteurs d'avant
rendent les mêmes objets, les mêmes fichiers. Bibliothèque standard seulement."""
import datetime
import html as htmllib
import re

MONTHS = {m: i + 1 for i, m in enumerate(('JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'))}


def text_of(cell):
    """Le texte d'une cellule HTML : balises retirées, entités décodées, espaces réduits."""
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', cell))).strip()


def rows_of(page):
    """[(id de la ligne, [texte de chaque cellule])] dans l'ordre de la page, pour les lignes `<tr id="…">`."""
    return [(rid, [text_of(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', body, re.S)]) for rid, body in re.findall(r'<tr id="([^"]+)"[^>]*>(.*?)</tr>', page, re.S)]


def dms(text):
    """Degrés décimaux d'une coordonnée de l'eAIP : « 523012N », « 0073848W », « 532957.8N » (DDMMSS[.s] pour la latitude, DDDMMSS[.s] pour la longitude) ; None si illisible."""
    m = re.fullmatch(r'(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)([NSEW])', str(text).strip())
    if not m:
        return None
    deg, mn, sec, h = int(m.group(1)), int(m.group(2)), float(m.group(3)), m.group(4)
    if (h in 'NS' and len(m.group(1)) != 2) or (h in 'EW' and len(m.group(1)) != 3) or mn >= 60 or sec >= 60 or deg > (90 if h in 'NS' else 180):
        return None
    v = deg + mn / 60 + sec / 3600
    return round(-v if h in 'SW' else v, 6)


def level_ft(text):
    """Une limite verticale de l'eAIP en pieds : « FL245 » / « FL 245 » → 24500, « 3000 ft » → 3000, « GND » / « SFC » → 0 ; None si absente ou illisible, Infinity pour « UNL »."""
    t = re.sub(r'\s+', ' ', htmllib.unescape(str(text or ''))).strip().upper()
    m = re.fullmatch(r'FL ?(\d{2,3})', t)
    if m:
        return int(m.group(1)) * 100
    m = re.fullmatch(r'(\d{3,5}) ?(?:FT|F)(?: ?(?:AMSL|MSL|AGL|ALT))?', t)
    if m:
        return int(m.group(1))
    if t in ('GND', 'SFC'):
        return 0
    if t in ('UNL', 'UNLTD', 'UNLIMITED'):
        return float('inf')
    return None


def date_of(day, month, year):
    """« 29 », « OCT », « 2026 » → « 2026-10-29 » ; None si le mois ou le jour n'existe pas."""
    if str(month).upper() not in MONTHS:
        return None
    try:
        return datetime.date(int(year), MONTHS[str(month).upper()], int(day)).isoformat()
    except ValueError:
        return None


def to_geojson(name, source, points, segments, issue, remark='remarks', extra=()):
    """Le GeoJSON d'une zone : un Feature `sog: 'point'` par point désigné (ses remarques, lues dans la clé `remark` du point), un Feature `sog: 'airway'` (LineString de deux positions) par tronçon, avec les champs
    `extra` du tronçon en plus de la route, des deux points et des limites. `issue` : la date de l'édition (AAAA-MM-JJ). Les limites infinies sont écrites « UNL » (le JSON n'a pas d'infini)."""
    feats = []
    seen = set()
    for p in points:
        if p['id'] in seen:
            continue
        seen.add(p['id'])
        feats.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [p['lon'], p['lat']]}, 'properties': {'sog': 'point', 'id': p['id'], 'remarks': p.get(remark, '')}})
    lim = lambda v: 'UNL' if v == float('inf') else v
    for s in segments:
        props = {'sog': 'airway', 'route': s['route'], 'a': s['a']['id'], 'b': s['b']['id'], 'lower': lim(s['lower']), 'upper': lim(s['upper'])}
        props.update({k: s[k] for k in extra})
        feats.append({'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [[s['a']['lon'], s['a']['lat']], [s['b']['lon'], s['b']['lat']]]}, 'properties': props})
    return {'type': 'FeatureCollection', 'name': name, 'issue': issue, 'source': source, 'features': feats}


def out_name(name, issue):
    """Le nom du fichier d'une édition : « airnav_ie_enr_20261029.geojson » (la date du cycle AIRAC y est lue par tools/aero_cycles.py)."""
    return f'{name}_{issue.replace("-", "")}.geojson'
