"""eAIP d'Irlande (AirNav Ireland) : points (ENR 4.4) et routes RNAV (ENR 3.3) en GeoJSON pour la zone « ie » (V3, 5 nov. 2026, lot C2).

La zone ie n'avait que l'export openAIP : aucun point, aucune voie. L'eAIP d'AirNav Ireland (https://www.airnav.ie, section « Aeronautical Information Management ») publie les
tables ENR 4.4 (points désignés : nom, coordonnées en DMS) et ENR 3.3 (routes RNAV : points, coordonnées, cap, distance, limites) en HTML ; il ne donne ni jeu AIXM / ARINC 424 ni table
de codage des procédures (SID, STAR et approches sont des cartes PDF). Ce module lit les deux tables et écrit un GeoJSON que le lecteur de la suite (shared/aero_sources.js, geojson)
sait lire : des « Feature » `sog: 'point'` (un point désigné) et `sog: 'airway'` (un tronçon de route, de deux positions).

La page « Currently Effective Issue » de la page AIM donne l'adresse de l'édition en vigueur (…/AIRAC/AAAA-MM-JJ-AIRAC/html/index.html, les dossiers des éditions passées ne suivent pas tous
le même modèle : l'adresse est LUE sur la page, jamais construite) et la date d'entrée en vigueur (« 29 OCT 2026 ») ; l'adresse lue est contrôlée (https, www.airnav.ie, chemin sûr)
avant toute requête, comme tout ce qu'un serveur écrit dans une page. Le fichier écrit porte la date de l'édition dans son nom (airnav_ie_enr_AAAAMMJJ.geojson) : c'est son cycle AIRAC
(tools/aero_cycles.py).

Licence : aucune mention de réutilisation sur les pages lues (l'AIP est publié par AirNav Ireland pour le compte de la CAA irlandaise ; l'avis du site ne parle que de l'exactitude). La source
est donc traitée comme une licence d'usage personnel (publiée seulement si le propriétaire du dépôt de données le déclare) et les données compilées restent dans le dépôt privé des données.
Bibliothèque standard seulement. Appelé par tools/aero_fetch.py (fournisseur « airnav »). Essai : python tools/airnav_eaip.py [dossier de sortie].
"""
import datetime
import html as htmllib
import json
import os
import re
import sys
import urllib.parse

HOST = 'https://www.airnav.ie'
AIM = HOST + '/air-traffic-management/aeronautical-information-management'
ISSUE_PATH = re.compile(r'^/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/html/index\.html$')      # /AIRAC/2026-10-29-AIRAC/html/index.html, /AIRAC_MAY_2026/2026-05-14-AIRAC/html/index.html
PAGES = ('EI-ENR-4.4-en-IE.html', 'EI-ENR-3.3-en-IE.html')
MONTHS = {m: i + 1 for i, m in enumerate(('JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'))}
NAME = 'airnav_ie_enr'
OUT_RE = re.compile(r'^airnav_ie_enr_(\d{8})\.geojson\Z')
MAX_FEATURES = 20000                                    # l'Irlande : quelques centaines de points, dix routes ; au-delà, la page n'est pas celle qu'on croit


def current_issue(page):
    """(adresse de l'édition en vigueur, sa date AAAA-MM-JJ) lus sur la page AIM sous « Currently Effective Issue », ou None. L'adresse doit être https://www.airnav.ie/<dossiers>/html/index.html
    (un autre hôte, http, un chemin hors du modèle, un « .. » : refusés)."""
    i = page.find('Currently Effective Issue')
    if i < 0:
        return None
    m = re.search(r'<a [^>]*href="([^"]+)"[^>]*>([^<]*)</a>', page[i:i + 3000])
    if not m:
        return None
    url, label = htmllib.unescape(m.group(1)).strip(), htmllib.unescape(m.group(2))
    u = urllib.parse.urlsplit(url)
    if u.scheme != 'https' or u.netloc != 'www.airnav.ie' or u.query or u.fragment or '..' in u.path or not ISSUE_PATH.match(u.path):
        return None
    d = re.search(r'(\d{1,2})\s+([A-Z]{3})\s+(\d{4})', label.upper())
    if not d or d.group(2) not in MONTHS:
        return None
    try:
        date = datetime.date(int(d.group(3)), MONTHS[d.group(2)], int(d.group(1)))
    except ValueError:
        return None
    return url, date.isoformat()


def page_url(issue_url, name):
    """L'adresse d'une page de section de l'édition : …/html/eAIP/<nom>."""
    if name not in PAGES:
        raise ValueError(f'page refusée : {name!r}')
    return issue_url.rsplit('/', 1)[0] + '/eAIP/' + name


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


def parse_enr44(page):
    """Les points désignés de l'ENR 4.4 : [{ id, lat, lon, remarks }] dans l'ordre de la page. Une ligne est `<tr id="SP-ID">` avec `SP-ID-LAT` et `SP-ID-LONG`."""
    out = []
    for m in re.finditer(r'<tr id="SP-([A-Z0-9]{2,8})"[^>]*>(.*?)</tr>', page, re.S):
        pid, row = m.group(1), m.group(2)
        lat = re.search(r'id="SP-%s-LAT">([^<]*)<' % pid, row)
        lon = re.search(r'id="SP-%s-LONG">([^<]*)<' % pid, row)
        la, lo = dms(lat.group(1)) if lat else None, dms(lon.group(1)) if lon else None
        if la is None or lo is None:
            continue
        rem = re.search(r'class="Designated-point"[^>]*>([^<]*)<', row)
        out.append({'id': pid, 'lat': la, 'lon': lo, 'remarks': re.sub(r'\s+', ' ', htmllib.unescape(rem.group(1))).strip() if rem else ''})
    return out


# un événement de l'ENR 3.3 : début d'une table de route, un point (nom et position), les champs du tronçon qui suit
_TOK = re.compile(
    r'<table[^>]*\bid="(?P<route>[A-Z]{1,2}\d{1,4}[A-Z]?)"[^>]*class="ENR-table'
    r'|class="Significant-point-description">(?P<name>[^<]*)</span></td><td colspan="3">(?P<lat>\d+(?:\.\d+)?[NS])\s(?P<lon>\d+(?:\.\d+)?[EW])'
    r'|class="Route-segment-length">(?P<nm>[\d.]+)\s*NM'
    r'|class="Route-segment-upper">(?P<up>[^<]*)<'
    r'|class="Route-segment-lower">(?P<lo>[^<]*)<'
    r'|class="Route-segment-mag-track">(?P<trk>\d*)<')


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


def point_id(name):
    """L'identifiant d'un point de route : « SUROX » → SUROX ; « DUBLIN DVOR/DME (DUB) » → DUB (le code entre parenthèses d'une balise) ; une mention « unknown reference: … » est retirée."""
    t = re.sub(r'\s+', ' ', htmllib.unescape(name or '')).strip().upper()
    t = re.sub(r'^UNKNOWN REFERENCE:\s*', '', t)
    m = re.search(r'\(([A-Z0-9]{2,5})\)\s*$', t)
    return m.group(1) if m else t


def parse_enr33(page):
    """Les tronçons des routes de l'ENR 3.3 : [{ route, a: { id, lat, lon }, b: { id, lat, lon }, lower, upper, nm, trk }]. Une table de route suit ses points et, entre deux points, la ligne du tronçon
    (cap magnétique, distance, limites). Un tronçon sans l'un des deux points (position illisible) n'est pas rendu ; une limite absente est null."""
    out, route, prev, pend = [], None, None, {}
    for m in _TOK.finditer(page):
        if m.group('route'):
            route, prev, pend = m.group('route'), None, {}
        elif m.group('name') is not None:
            la, lo = dms(m.group('lat')), dms(m.group('lon'))
            pt = {'id': point_id(m.group('name')), 'lat': la, 'lon': lo} if la is not None and lo is not None and route else None
            if pt and prev and pend:
                lower, upper = level_ft(pend.get('lo')), level_ft(pend.get('up'))
                out.append({'route': route, 'a': prev, 'b': pt, 'lower': lower, 'upper': upper, 'nm': pend.get('nm'), 'trk': pend.get('trk')})
            prev, pend = pt, {}
        elif prev is not None:
            for k in ('nm', 'up', 'lo', 'trk'):
                if m.group(k) is not None:
                    pend[k] = float(m.group(k)) if k == 'nm' else (int(m.group(k)) if k == 'trk' and m.group(k) else m.group(k))
    return out


def to_geojson(points, segments, issue):
    """Le GeoJSON de la zone ie : un Feature `sog: 'point'` par point désigné de l'ENR 4.4, un Feature `sog: 'airway'` (LineString de deux positions) par tronçon de l'ENR 3.3.
    `issue` : la date de l'édition (AAAA-MM-JJ). Les limites infinies sont écrites « UNL » (le JSON n'a pas d'infini)."""
    feats = []
    seen = set()
    for p in points:
        if p['id'] in seen:
            continue
        seen.add(p['id'])
        feats.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [p['lon'], p['lat']]}, 'properties': {'sog': 'point', 'id': p['id'], 'remarks': p.get('remarks', '')}})
    lim = lambda v: 'UNL' if v == float('inf') else v
    for s in segments:
        feats.append({'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [[s['a']['lon'], s['a']['lat']], [s['b']['lon'], s['b']['lat']]]},
                      'properties': {'sog': 'airway', 'route': s['route'], 'a': s['a']['id'], 'b': s['b']['id'], 'lower': lim(s['lower']), 'upper': lim(s['upper']), 'nm': s['nm'], 'trk': s['trk']}})
    return {'type': 'FeatureCollection', 'name': NAME, 'issue': issue, 'source': 'AirNav Ireland eAIP (ENR 4.4, ENR 3.3)', 'features': feats}


def convert(enr44, enr33, issue):
    """(GeoJSON, nombre de points, nombre de tronçons) d'après les deux pages ; lève ValueError si l'une ne donne rien (une page changée) ou trop de choses."""
    points, segments = parse_enr44(enr44), parse_enr33(enr33)
    if not points:
        raise ValueError('aucun point lu dans l’ENR 4.4 (mise en page changée ?)')
    if not segments:
        raise ValueError('aucun tronçon lu dans l’ENR 3.3 (mise en page changée ?)')
    if len(points) + len(segments) > MAX_FEATURES:
        raise ValueError('trop d’objets pour l’Irlande : ce ne sont pas les pages attendues')
    return to_geojson(points, segments, issue), len(points), len(segments)


def out_name(issue):
    """Le nom du fichier d'une édition : airnav_ie_enr_20261029.geojson (la date du cycle AIRAC y est lue par tools/aero_cycles.py)."""
    return f'{NAME}_{issue.replace("-", "")}.geojson'


def main(argv=None):
    """Essai : lit l'édition en vigueur sur le réseau et écrit le GeoJSON dans le dossier donné (défaut : le dossier courant)."""
    import urllib.request
    argv = list(sys.argv[1:] if argv is None else argv)
    folder = argv[0] if argv else '.'
    get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'SOG-launcher-test'}), timeout=60).read().decode('utf-8', 'replace')
    cur = current_issue(get(AIM))
    if not cur:
        sys.exit('édition en vigueur introuvable sur la page AIM')
    url, issue = cur
    g, n, m = convert(get(page_url(url, PAGES[0])), get(page_url(url, PAGES[1])), issue)
    path = os.path.join(folder, out_name(issue))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(g, f, ensure_ascii=False)
    print(f'{path} : {n} points, {m} tronçons (édition du {issue})')


if __name__ == '__main__':
    main()
