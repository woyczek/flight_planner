"""Le noyau commun des lecteurs d'eAIP au format EUROCONTROL / Annexe 15 (V3, 11 nov. 2026, SOG-0240 : « trouver des sources », première famille F1).

Un eAIP d'Annexe 15 publie, en HTML, un fichier par section : ENR 4.4 (points désignés : nom, coordonnées, routes, remarques), ENR 4.1 (aides radio), ENR 3.x (routes : un bloc par route, un point par ligne, le tronçon qui le suit).
Ce qui est commun à tous les États — lire une coordonnée « 523012N » / « 0073848W », une limite « FL245 » / « 3000 ft », une date « 29 OCT 2026 », écrire le même GeoJSON (des « Feature » `sog: 'point'` et `sog: 'airway'` que lit
shared/aero_sources.js), nommer le fichier d'une édition (« <nom>_AAAAMMJJ.geojson », dont tools/aero_cycles.py lit le cycle AIRAC) — est ICI ; ce qui dépend de la mise en page d'un État (les identifiants de lignes d'Irlande, ceux de
la Suède, les classes des tableaux du Portugal…) reste dans le profil de cet État : tools/airnav_eaip.py (Irlande), tools/lfv_eaip.py (Suède), puis les autres. Refactoring à comportement identique : les deux lecteurs d'avant
rendent les mêmes objets, les mêmes fichiers. Bibliothèque standard seulement."""
import datetime
import html as htmllib
import os
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


# ----------------------------------------------------------------------------------------------------------------------- la mise en page à tableaux « Table-row-type » (Portugal, Hongrie, Géorgie, Islande, Finlande…)
# Les lignes d'un tableau d'ENR portent la classe `Table-row-type-1` (en-tête ou désignateur de route), `-2` (numéros de colonnes ou point d'une route), `-3` (une ligne de données ou le tronçon d'une route) ; une ligne de
# données peut porter un tableau imbriqué (limites haute / basse) dont les `<tr>` n'ont pas de classe : le découpage ne part que des lignes classées.
_ROW = re.compile(r'<tr\b[^>]*\bclass="Table-row-type-(\d)[^"]*"[^>]*>(.*?)(?=<tr\b[^>]*\bclass="Table-row-type-|</table>\s*</body>|\Z)', re.S)
_COORDS = re.compile(r'(\d{6,7}(?:\.\d+)?[NS])\s*(\d{6,8}(?:\.\d+)?[EW])')
_NAMECODE = re.compile(r'[A-Z0-9]{2,6}')
MAX_POINTS = 20000
MAX_SEGMENTS = 60000


def table_rows(page):
    """[(type de ligne : '1' | '2' | '3', le HTML de la ligne et de ce qu'elle porte)] dans l'ordre de la page."""
    return [(m.group(1), m.group(2)) for m in _ROW.finditer(page)]


def cells_of(chunk):
    """Le texte des cellules `<td>` / `<th>` du premier niveau d'une ligne (un tableau imbriqué est un seul texte)."""
    chunk = re.sub(r'<table\b.*?</table>', lambda m: re.sub(r'<(/?)t[dr]\b[^>]*>', ' ', m.group(0)), chunk, flags=re.S)       # un tableau imbriqué : ses cellules ne sont pas celles de la ligne
    return [text_of(c) for c in re.findall(r'<t[dh]\b[^>]*>(.*?)</t[dh]>', chunk, re.S)]


def issue_of_title(page):
    """La date d'entrée en vigueur d'une page d'eAIP (« … valid from 01 OCT 2026 » dans son titre) en AAAA-MM-JJ, ou None."""
    m = re.search(r'<title>[^<]*?valid from\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})', page, re.I)
    return date_of(*m.groups()) if m else None


def parse_points(page):
    """Les points désignés d'une page ENR 4.4 à tableau : [{ id, lat, lon, remarks }] dans l'ordre de la page. Une ligne de données : nom-code (2 à 6 lettres ou chiffres), les coordonnées (deux lignes ou une seule),
    les routes, les remarques ; une ligne sans coordonnées lisibles (une suite de remarques) n'est pas un point."""
    out = []
    for kind, chunk in table_rows(page):
        if kind != '3':
            continue
        cells = cells_of(chunk)
        if len(cells) < 2:
            continue
        name = cells[0].strip().upper()
        m = _COORDS.search(cells[1])
        la, lo = (dms(m.group(1)), dms(m.group(2))) if m else (None, None)
        if _NAMECODE.fullmatch(name) and la is not None and lo is not None:
            out.append({'id': name, 'lat': la, 'lon': lo, 'remarks': cells[-1][:200] if len(cells) > 3 else ''})
    return out


def point_id(name):
    """L'identifiant d'un point de route : « ROSAL » → ROSAL ; « ALCARIA RUIVA DME (DML) » → DML (le code entre parenthèses d'une balise) ; '' si aucun nom-code lisible."""
    t = re.sub(r'\s+', ' ', name or '').strip().upper()
    m = re.search(r'\(([A-Z0-9]{2,5})\)$', t)
    if m:
        return m.group(1)
    return t if _NAMECODE.fullmatch(t) else ''


def parse_routes(page, stats=None):
    """Les tronçons des routes d'une page ENR 3.x à blocs : [{ route, a: { id, lat, lon }, b: { id, lat, lon }, lower, upper, nm, trk }]. Un bloc : la ligne du désignateur (`Route-designator`), puis pour chaque point
    sa ligne (`Significant-point-description` et les coordonnées), puis la ligne du tronçon qui part de lui (cap, distance « 24.7 NM », limites en deux lignes superposées `Upper` / `Lower`). Un tronçon dont un point
    est illisible n'est pas rendu ; une limite absente est null. `stats` (un dict) reçoit `unnamed` : le nombre de blocs dont le désignateur de route est VIDE dans la page (l'édition du 26 nov. 2026 du Portugal l'est : la route n'est pas nommée, ses tronçons
    ne sont pas rendus, jamais devinés)."""
    out, route, prev, pend = [], None, None, None
    for kind, chunk in table_rows(page):
        if kind == '1' and 'Route-designator' in chunk:
            m = re.search(r'[A-Z]{1,2}\d{1,4}[A-Z]?', text_of(chunk))
            route, prev, pend = (m.group(0) if m else None), None, None
            if not m and stats is not None:
                stats['unnamed'] = stats.get('unnamed', 0) + 1
        elif kind == '2' and route:
            cells = cells_of(chunk)       # une ligne de point : un signe (▲ ∆), le nom, les coordonnées (par les cellules, pas par les classes : l'édition du 26 nov. 2026 écrit « ~frameAPSHiddenRow » au lieu de « Significant-point-description »)
            m = _COORDS.search(cells[2]) if len(cells) >= 3 else None
            la, lo = (dms(m.group(1)), dms(m.group(2))) if m else (None, None)
            pid = point_id(cells[1]) if len(cells) >= 3 and m else ''
            if not m:
                continue          # une ligne d'en-tête de colonnes : ni point, ni coupure de la route
            pt = {'id': pid, 'lat': la, 'lon': lo} if pid and la is not None and lo is not None else None
            if pt and prev and pend:
                out.append({'route': route, 'a': prev, 'b': pt, 'lower': pend.get('lower'), 'upper': pend.get('upper'), 'nm': pend.get('nm'), 'trk': pend.get('trk')})
            prev, pend = pt, None
        elif kind == '3' and prev is not None and ('UpperAndLower' in chunk or 'RouteTemplate' in chunk):
            pairs = [(text_of(u).rstrip(' /'), text_of(l).rstrip(' /')) for u, l in re.findall(r'class="Upper"[^>]*>(.*?)</td>.*?class="Lower"[^>]*>(.*?)</td>', chunk, re.S)]
            lim = next(((level_ft(u), level_ft(l)) for u, l in pairs if level_ft(u) is not None and level_ft(l) is not None), (None, None))
            trk = next((int(re.match(r'\d+', u).group(0)) for u, l in pairs if re.fullmatch(r'\d{1,3}', u)), None)
            dist = re.search(r'([\d.]+)\s*NM', text_of(chunk))
            pend = {'upper': lim[0], 'lower': lim[1], 'trk': trk, 'nm': float(dist.group(1)) if dist else None}
    return out


def convert_tables(profile, points_page, route_pages, issue):
    """(GeoJSON, nombre de points, nombre de tronçons) d'un État à tableaux : ses points (ENR 4.4), ses routes (une ou plusieurs pages ENR 3.x). Les points qu'une route nomme et que l'ENR 4.4 ne liste pas (balises,
    points de limite de FIR) sont ajoutés. Lève ValueError si l'ENR 4.4 ne donne rien (une page changée) ou s'il y a trop d'objets ; une section d'ENR 3 vide (« NIL ») donne zéro tronçon sans erreur quand
    le profil dit `routes_nil_ok`."""
    points = parse_points(points_page)
    if not points:
        raise ValueError('aucun point lu dans l’ENR 4.4 (mise en page changée ?)')
    stats = {}
    segments = [s for page in route_pages for s in parse_routes(page, stats)]
    if route_pages and not segments and not profile.get('routes_nil_ok'):
        raise ValueError('aucun tronçon lu dans l’ENR 3 (mise en page changée ?)')
    known = {p['id'] for p in points}
    for s in segments:
        for p in (s['a'], s['b']):
            if p['id'] not in known:
                known.add(p['id'])
                points.append({'id': p['id'], 'lat': p['lat'], 'lon': p['lon'], 'remarks': ''})
    if len(points) > MAX_POINTS or len(segments) > MAX_SEGMENTS:
        raise ValueError('trop d’objets : ce ne sont pas les pages attendues')
    g = to_geojson(profile['name'], profile['label'], points, segments, issue, extra=('nm', 'trk'))
    if stats.get('unnamed'):
        g['skipped'] = {'routes_without_name': stats['unnamed']}      # dit au résultat (aero_fetch) : des routes que la page ne nomme pas ne sont pas lues
    return g, len(points), len(segments)


# les États à tableaux : le profil dit où sont les pages (adresse fixe, hôte contrôlé) et comment s'appelle le fichier écrit (sa date est son cycle AIRAC : tools/aero_cycles.py)
PROFILES = {
    'pt': {'zone': 'pt', 'source': 'navpt', 'name': 'navpt_pt_enr', 'label': 'NAV Portugal eAIP (ENR 4.4, ENR 3.1, ENR 3.3)', 'host': 'ais.nav.pt',
           'base': 'https://ais.nav.pt/wp-content/uploads/AIS_Files/eAIP_Current/eAIP_Online/eAIP/html/eAIP/',
           'points': 'LP-ENR-4.4-en-PT.html', 'routes': ('LP-ENR-3.1-en-PT.html', 'LP-ENR-3.3-en-PT.html'),
           'title': 'AIP for PORTUGAL', 'points_section': 'ENR-4.4', 'routes_sections': ('ENR-3.1', 'ENR-3.3')},
}


def out_re(profile):
    """Le nom d'un fichier écrit pour ce profil : navpt_pt_enr_20261001.geojson."""
    return re.compile(r'^' + re.escape(profile['name']) + r'_(\d{8})\.geojson\Z')


def page_url(profile, name):
    """L'adresse d'une page du profil : sa base fixe + un nom connu du profil, jamais autre chose."""
    if name != profile['points'] and name not in profile['routes']:
        raise ValueError(f'page refusée : {name!r}')
    return profile['base'] + name


# ----------------------------------------------------------------------------------------------------------------------- l'eAIP pris à la main : un zip qui porte une ISO, une ISO, un zip du dossier, le dossier extrait (SOG-0244)
# Les pages sont retrouvées par leur TITRE (« AIP for PORTUGAL … (section ENR-4.4) valid from 26 NOV 2026 »), jamais par leur nom : l'ISO du Portugal est de niveau 1 (noms 8.3 : « LP_ENR31.HTM ») et un zip ou un dossier de Windows
# peut porter n'importe quel nom. Un fichier d'un tel paquet est une ENTRÉE NON FIABLE : tout est borné et chaque refus dit sa raison en clair (ValueError).
PKG_MAX_BYTES = 1536 * 1024 * 1024      # un paquet (zip ou ISO) plus gros : refusé avant d'être ouvert
ISO_MAX_PAGES = 2000                    # pages ENR prises dans une image ISO (Sécurisation 12/11 : le chemin ISO n'avait pas le plafond du zip et du dossier ; chaque lecture d'un membre déflaté relance la décompression)
PKG_MAX_FILES = 8000                    # fichiers regardés dans un dossier ou un zip
PAGE_MAX = 8 * 1024 * 1024              # une page d'eAIP : 0,5 Mo (ENR 3.3) ; au-delà, ce n'est pas la page attendue
HEAD = 4096
_TITLE = re.compile(r'<title>(.*?)</title>', re.I | re.S)
_SECTION = re.compile(r'\(section (ENR-\d+(?:\.\d+)?)\)', re.I)


def _is_enr_page(path):
    low = path.replace('\\', '/').lower()
    name = low.rsplit('/', 1)[-1]
    return 'eaip/html/eaip' in low and 'enr' in name and name.endswith(('.htm', '.html'))


def pages_of_dir(root):
    """{ chemin : lecteur(n) } des pages ENR d'un dossier extrait : UN seul dossier est listé, à un chemin relatif connu (`eAIP/html/eAIP`, `html/eAIP` ou le dossier lui-même s'il porte les pages), jamais un parcours récursif ; ni lien suivi."""
    out = {}
    root = os.path.realpath(root)
    for sub in (('eAIP', 'html', 'eAIP'), ('html', 'eAIP'), ()):
        d = os.path.join(root, *sub)
        if not os.path.isdir(d) or os.path.islink(d):
            continue
        try:
            names = sorted(os.listdir(d))
        except OSError:
            continue
        if len(names) > PKG_MAX_FILES:
            raise ValueError('trop de fichiers dans le dossier : ce n’est pas un eAIP')
        for n in names:
            p = os.path.join(d, n)
            if n.lower().endswith(('.htm', '.html')) and 'enr' in n.lower() and os.path.isfile(p) and not os.path.islink(p):
                out[p] = (lambda limit, p=p: _read_file(p, limit))
        if out:
            break
    return out


def _read_file(p, n):
    """Les n premiers octets d'une page d'un dossier ; ValueError si la page dépasse PAGE_MAX."""
    if os.path.getsize(p) > PAGE_MAX:
        raise ValueError('page trop grande')
    with open(p, 'rb') as f:
        return f.read(n)


def pages_of_zip(zf):
    """Pages ENR d'un zip qui porte le dossier de l'eAIP (eAIP/html/eAIP/…), sans extraire : { nom du membre : lecteur(limite) }."""
    out = {}
    infos = zf.infolist()
    if len(infos) > PKG_MAX_FILES * 4:
        raise ValueError('trop de fichiers dans le zip : ce n’est pas un eAIP')
    for i in infos:
        if not i.is_dir() and _is_enr_page(i.filename):
            out[i.filename] = (lambda limit, i=i: _read_member(zf, i, limit))
    return out


def _read_member(zf, info, n):
    if info.file_size > PAGE_MAX:
        raise ValueError('page trop grande')
    with zf.open(info) as f:
        return f.read(n)


def _too_big():
    raise ValueError('page trop grande')


def pages_of_iso(iso):
    """Pages ENR d'une image ISO 9660 (tools/iso9660.py), sans la monter : { chemin dans l'image : lecteur(limite) }."""
    out = {}
    walked = iso.walk()
    if len(walked) > PKG_MAX_FILES * 4:
        raise ValueError('image ISO refusée : trop de fichiers')
    for path, entry in walked.items():
        if _is_enr_page(path):
            if len(out) >= ISO_MAX_PAGES:
                raise ValueError('image ISO refusée : trop de pages ENR')
            out[path] = (lambda n, e=entry: iso.read((e[0], min(e[1], n)), PAGE_MAX) if e[1] <= PAGE_MAX else _too_big())
    return out


def sections_of(pages, profile):
    """(page de l'ENR 4.4, [pages des routes], édition AAAA-MM-JJ) d'un jeu de pages : celles dont le TITRE porte le nom de l'AIP du profil (« AIP for PORTUGAL ») et la section voulue. ValueError (en clair) si l'ENR 4.4 ou les routes manquent."""
    want = {profile['points_section']: 'points', **{s: 'routes' for s in profile['routes_sections']}}
    got, issue, seen = {}, None, 0
    for path, read in sorted(pages.items()):
        head = read(HEAD)[:HEAD].decode('utf-8', 'replace')
        m = _TITLE.search(head)
        if not m or profile['title'].lower() not in m.group(1).lower():
            continue
        seen += 1
        sec = _SECTION.search(m.group(1))
        key = sec.group(1).upper() if sec else ''
        if key in want and key not in got:
            got[key] = read(PAGE_MAX).decode('utf-8', 'replace')      # la page entière (bornée par PAGE_MAX)
            issue = issue or issue_of_title(got[key])
    if not seen:
        raise ValueError(f'aucune page de « {profile["title"]} » : ce n’est pas cet eAIP')
    if profile['points_section'] not in got:
        raise ValueError(f'la page {profile["points_section"].replace("-", " ")} de « {profile["title"]} » manque dans ce fichier')
    routes = [got[s] for s in profile['routes_sections'] if s in got]
    if not routes:
        raise ValueError('aucune page de routes (ENR 3) dans ce fichier')
    if not issue:
        raise ValueError('date d’entrée en vigueur introuvable dans le titre des pages')
    return got[profile['points_section']], routes, issue


def read_package(profile, path):
    """Lit un eAIP pris à la main : `path` est un zip (qui porte une ISO, ou le dossier de l'eAIP), une ISO, ou un dossier extrait. Rend (page ENR 4.4, [pages de routes], édition) ; ValueError dit POURQUOI en clair (« ISO illisible : … »,
    « aucune page de … », « zip illisible »…). Ne lit que ce que le profil attend ; jamais d'exécution ; tout est borné."""
    import zipfile
    import zip_guard
    import iso9660
    try:
        if os.path.isdir(path):
            return sections_of(pages_of_dir(path), profile)
        size = os.path.getsize(path)
        if size > PKG_MAX_BYTES:
            raise ValueError(f'fichier de plus de {PKG_MAX_BYTES // 1048576} Mo')
        with open(path, 'rb') as f:
            head = f.read(4)
        if head[:4] == b'PK\x03\x04':
            try:
                zf = zip_guard.open_zip(path)
            except (zipfile.BadZipFile, OSError) as e:
                raise ValueError(f'zip illisible : {e}') from None
            with zf:
                isos = [i for i in zf.infolist() if not i.is_dir() and i.filename.lower().endswith('.iso')]
                if len(isos) == 1 and isos[0].file_size <= PKG_MAX_BYTES:
                    try:
                        iso = iso9660.Iso(zf.open(isos[0]), isos[0].file_size)
                        return sections_of(pages_of_iso(iso), profile)
                    except iso9660.IsoError as e:
                        raise ValueError(f'ISO illisible : {e}') from None
                if len(isos) > 1:
                    raise ValueError('plusieurs images ISO dans le zip')
                return sections_of(pages_of_zip(zf), profile)
        with open(path, 'rb') as f:
            f.seek(0x8000)
            vd = f.read(8)
        if iso9660.looks_like_iso(vd):
            try:
                with open(path, 'rb') as f:
                    return sections_of(pages_of_iso(iso9660.Iso(f, size)), profile)
            except iso9660.IsoError as e:
                raise ValueError(f'ISO illisible : {e}') from None
        if path.lower().endswith('.iso'):
            raise ValueError('ISO illisible : pas une image ISO 9660 (signature CD001 absente)')
        raise ValueError('ni zip, ni image ISO, ni dossier')
    except OSError as e:
        raise ValueError(f'lecture impossible : {e}') from None
