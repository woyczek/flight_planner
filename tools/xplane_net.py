"""Le réseau de repli X-Plane (Navigraph) pour les États SANS réseau officiel : points et voies aériennes lus dans le dossier d'X-Plane de l'utilisateur (SOG-0474 suite ; Q-0108 : « les deux »).

RÉGIME (décidé par l'utilisateur, Q-0108 ; cadre de Sécurisation) : usage PERSONNEL, LOCAL, jamais publié. Le dossier d'X-Plane est indiqué UNE fois par l'utilisateur (un chemin tapé) ;
le lanceur ne le cherche jamais ; il est REVALIDÉ à chaque lecture. Trois fichiers à noms FIXES (jamais un nom lu du disque ni de la requête) : earth_fix.dat, earth_nav.dat, earth_awy.dat, sous
`Custom Data/` ou `Resources/default data/` du dossier donné. Le réseau dérivé est écrit sous data/local/xplane/ (jamais versionné, jamais publié, jamais dans data/ synchronisé) :
`net_<cycle>.json`. Aucune position lue dans X-Plane n'entre dans le dépôt, un cas ou un message : les cas utilisent des lignes INVENTÉES.

Le nom du dossier de l'utilisateur ne sort JAMAIS (ni réponse, ni journal, ni message d'erreur) : les fonctions rendent des BOOLÉENS et des CODES de raison.

  check_folder(chemin) → (ok, raison) ; folder_files(chemin) → { nom : chemin absolu } ou {} ; read_cycle(chemin) → 'AAMM' ou '' ;
  build(chemin, zones, boxes) → ({ cycle, zones: { zone: { points, airways } }, counts }, raison) ; save(data, net) → nom du fichier.
Bibliothèque standard seulement.
"""
import json
import os
import re

NAMES = ('earth_fix.dat', 'earth_nav.dat', 'earth_awy.dat')      # les trois fichiers, noms FIXES
SUBDIRS = ('Custom Data', os.path.join('Resources', 'default data'))
MAX_TOTAL = 200 * 1024 * 1024        # octets lus au total (relus pendant la lecture)
MAX_LINES = 3_000_000
MAX_LINE = 65536
MAX_PATH = 260
MAX_EDGES = 400_000
CYCLE = re.compile(r'data cycle (\d{4})\b', re.A)
ROUTE = re.compile(r'[A-Z0-9]{1,7}\Z', re.A)
IDENT = re.compile(r'[A-Z0-9]{1,7}\Z', re.A)
DRIVE = re.compile(r'[A-Za-z]:[\\/]')
FLOAT = re.compile(r'[-+]?\d{1,3}(?:\.\d{1,8})?\Z', re.A)


def _link(path):
    """Un lien symbolique OU une jonction Windows (comme uk_package._link)."""
    if os.path.islink(path):
        return True
    junction = getattr(os.path, 'isjunction', None)
    return bool(junction and junction(path))


def check_folder(path):
    """(ok, raison) : le chemin tapé par l'utilisateur est-il un dossier d'X-Plane lisible ? Raisons : 'not-text', 'long', 'control', 'unc', 'relative', 'dotdot', 'drive', 'missing', 'link', 'no-files'.
    Jamais le chemin dans la raison."""
    if not isinstance(path, str) or not path:
        return False, 'not-text'
    if len(path) > MAX_PATH:
        return False, 'long'
    if any(ord(c) < 32 or ord(c) == 127 for c in path):
        return False, 'control'
    if path.startswith(('\\\\', '//')):
        return False, 'unc'      # un chemin UNC ferait envoyer le hachage d'identification de l'utilisateur à une autre machine
    if not DRIVE.match(path) and not (os.name != 'nt' and path.startswith('/')):
        return False, 'relative'
    if any(part == '..' for part in re.split(r'[\\/]+', path)):
        return False, 'dotdot'
    if os.name == 'nt' and not re.match(r'[A-Za-z]:[\\/]', path):
        return False, 'drive'
    if not os.path.isdir(path):
        return False, 'missing'
    if _link(path):
        return False, 'link'
    return (True, '') if folder_files(path) else (False, 'no-files')


def folder_files(path):
    """{ nom : chemin absolu } des trois fichiers trouvés SOUS le dossier, `Custom Data` avant `Resources/default data` ; un fichier lien ou jonction est refusé ; {} si aucun des trois."""
    out = {}
    for sub in SUBDIRS:
        d = os.path.join(path, sub)
        if not os.path.isdir(d) or _link(d):
            continue
        for name in NAMES:
            f = os.path.join(d, name)
            if name not in out and os.path.isfile(f) and not _link(f):
                out[name] = f
    return out


def _lines(path, budget):
    """Les lignes d'un fichier, lues par morceaux ; `budget` = [octets restants] partagé par les trois fichiers : relu pendant la lecture (un fichier qui grossit ne dépasse pas MAX_TOTAL). Lève OverflowError au-delà."""
    n = 0
    with open(path, 'rb') as f:
        while True:
            raw = f.readline(MAX_LINE + 1)      # une ligne n'est jamais lue d'un coup en entier : un fichier sans saut de ligne de plusieurs Go ne se charge pas
            if not raw:
                return
            budget[0] -= len(raw)
            n += 1
            if budget[0] < 0 or n > MAX_LINES or len(raw) > MAX_LINE:
                raise OverflowError('too-big')
            yield raw.decode('utf-8', 'replace').strip()


def read_cycle(path):
    """Le cycle (« 2610 ») de l'en-tête de earth_fix.dat (« 1200 Version - data cycle 2610, build … ») ; '' sans en-tête lisible."""
    f = folder_files(path).get('earth_fix.dat')
    if not f:
        return ''
    try:
        with open(f, 'rb') as h:
            head = h.read(512).decode('utf-8', 'replace')
    except OSError:
        return ''
    m = CYCLE.search(head)
    return m[1] if m else ''


def _num(text):
    return float(text) if FLOAT.match(text) else None


def parse_fixes(lines):
    """{ (ident, région) : (lat, lon) } des points en route (ENRT) de earth_fix.dat : « lat lon ident terrain région [code] »."""
    out = {}
    for line in lines:
        f = line.split()
        if len(f) < 5 or f[3] != 'ENRT' or not IDENT.match(f[2]):
            continue
        lat, lon = _num(f[0]), _num(f[1])
        if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180:
            out[(f[2], f[4])] = (lat, lon)
    return out


def parse_navs(lines):
    """{ (ident, région) : (lat, lon) } des VOR (3) et NDB (2) de earth_nav.dat : « code lat lon altitude fréquence portée déclinaison ident terrain région nom »."""
    out = {}
    for line in lines:
        f = line.split()
        if len(f) < 10 or f[0] not in ('2', '3') or not IDENT.match(f[7]):
            continue
        lat, lon = _num(f[1]), _num(f[2])
        if lat is not None and lon is not None and -90 <= lat <= 90 and -180 <= lon <= 180:
            out[(f[7], f[9])] = (lat, lon)
    return out


def parse_airways(lines, where):
    """Les tronçons de earth_awy.dat (« ident1 région1 type1 ident2 région2 type2 sens niveau base sommet noms ») dont les deux extrémités ont une position (`where` : { (ident, région) : (lat, lon) }) :
    [{ route, a: { id, lat, lon }, b: { … }, lower, upper, dir }] ; un tronçon par nom de voie (« UL607-UN866 »). `dir` : F (de a vers b), B (de b vers a), FB (les deux), comme la base."""
    out = []
    for line in lines:
        f = line.split()
        if len(f) < 11 or f[6] not in ('N', 'F', 'B'):
            continue
        if (f[0], f[1]) == (f[3], f[4]):
            continue      # un tronçon d'un point à lui-même
        a, b = where.get((f[0], f[1])), where.get((f[3], f[4]))
        base, top = _num(f[8]), _num(f[9])
        if not a or not b or base is None or top is None or not (0 <= base <= top <= 999):
            continue
        for name in f[10].upper().split('-'):
            if ROUTE.match(name):
                out.append({'route': name, 'a': {'id': f[0], 'lat': a[0], 'lon': a[1]}, 'b': {'id': f[3], 'lat': b[0], 'lon': b[1]}, 'lower': int(base * 100), 'upper': int(top * 100),
                            'dir': {'N': 'FB', 'F': 'F', 'B': 'B'}[f[6]]})
                if len(out) >= MAX_EDGES:
                    return out
    return out


def _inside(point, boxes):
    lat, lon = point
    return any(w <= lon <= e and s <= lat <= n for w, s, e, n in boxes)


def build(path, zones, boxes):
    """({ cycle, zones: { zone : { points, airways } }, counts }, raison) pour les ZONES données (celles qui n'ont pas de réseau officiel) : `boxes` = { zone : [[ouest, sud, est, nord], …] }. Un tronçon est celui de la zone dont
    un cadre contient l'une de ses extrémités. Raisons : 'no-files', 'too-big', 'unreadable', 'nothing'."""
    ok, why = check_folder(path)
    if not ok:
        return None, why
    files = folder_files(path)
    if not all(n in files for n in NAMES):
        return None, 'no-files'
    budget = [MAX_TOTAL]
    try:
        where = parse_fixes(_lines(files['earth_fix.dat'], budget))
        where.update(parse_navs(_lines(files['earth_nav.dat'], budget)))
        ways = parse_airways(_lines(files['earth_awy.dat'], budget), where)
    except OverflowError:
        return None, 'too-big'
    except OSError:
        return None, 'unreadable'
    out, counts = {}, {}
    for zone in zones:
        zb = [b for b in boxes.get(zone, []) if isinstance(b, (list, tuple)) and len(b) == 4]
        mine = [w for w in ways if _inside((w['a']['lat'], w['a']['lon']), zb) or _inside((w['b']['lat'], w['b']['lon']), zb)]
        if not mine:
            continue
        seen, points = set(), []
        for w in mine:
            for end in (w['a'], w['b']):
                if end['id'] not in seen:
                    seen.add(end['id'])
                    points.append({'id': end['id'], 'type': 'ICAO', 'lat': end['lat'], 'lon': end['lon']})
        out[zone] = {'points': points, 'airways': mine}
        counts[zone] = {'points': len(points), 'airways': len(mine)}
    if not out:
        return None, 'nothing'
    return {'schema': 1, 'source': 'X-Plane (Navigraph), personnel', 'cycle': read_cycle(path), 'zones': out, 'counts': counts}, ''


def save(data, net):
    """Écrit le réseau dérivé sous data/local/xplane/ (fichier temporaire puis remplacement ; jamais ailleurs) et retire celui d'un autre cycle ; rend le nom du fichier."""
    cycle = net.get('cycle') or 'xxxx'
    if not re.fullmatch(r'\d{4}|xxxx', cycle):
        raise ValueError('cycle')
    folder = os.path.join(data, 'local', 'xplane')
    os.makedirs(folder, exist_ok=True)
    name = f'net_{cycle}.json'
    tmp = os.path.join(folder, name + '.part')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(net, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, os.path.join(folder, name))
    for old in os.listdir(folder):
        if re.fullmatch(r'net_(?:\d{4}|xxxx)\.json', old) and old != name:
            os.remove(os.path.join(folder, old))
    return name


# ---- la configuration (le dossier indiqué par l'utilisateur) et son état : data/local/xplane.json, jamais servi, jamais synchronisé

CONFIG = ('local', 'xplane.json')
NET = re.compile(r'net_(?:\d{4}|xxxx)\.json\Z', re.A)


def config_path(data):
    return os.path.join(data, *CONFIG)


def config_read(data):
    """Le chemin gardé ('' sans configuration ou fichier illisible) : revalidé par l'appelant à CHAQUE lecture, jamais cru."""
    import safe_json
    v, why = safe_json.read(config_path(data), 4096, encoding='utf-8')
    if why:
        return ''
    p = v.get('path') if isinstance(v, dict) else ''
    return p if isinstance(p, str) and len(p) <= MAX_PATH else ''


def config_write(data, path):
    """Garde le chemin (fichier temporaire puis remplacement) ; '' efface la configuration. Rend vrai si le fichier a changé."""
    target = config_path(data)
    if not path:
        try:
            os.remove(target)
            return True
        except OSError:
            return False
    os.makedirs(os.path.dirname(target), exist_ok=True)
    tmp = target + '.part'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'path': path}, f)
    os.replace(tmp, target)
    return True


def net_of(data):
    """({ cycle, zones: { zone : { points, airways } } } du réseau dérivé de data/local/xplane/, None sans fichier ni fichier lisible."""
    folder = os.path.join(data, 'local', 'xplane')
    try:
        names = sorted(n for n in os.listdir(folder) if NET.fullmatch(n))
    except OSError:
        return None
    if not names:
        return None
    try:
        import safe_json
    except ImportError:
        return None
    doc, why = safe_json.read(os.path.join(folder, names[-1]), MAX_TOTAL, encoding='utf-8')
    return doc if not why and isinstance(doc, dict) and isinstance(doc.get('zones'), dict) else None


def status(data):
    """{ configured, state ('ok' | 'missing' | 'not-xplane' | 'unreadable' | None), cycle ('2610' | None : celui du DOSSIER), zones (nombre | None), built ('2610' | None : le cycle du réseau CONSTRUIT, data/local/xplane/net_*.json) } : l'état est RECALCULÉ (le dossier est revalidé), jamais le chemin."""
    path = config_read(data)
    net = net_of(data)
    zones = len(net['zones']) if net else None
    built = net.get('cycle') if net and isinstance(net.get('cycle'), str) and re.fullmatch(r'\d{4}', net['cycle']) else None      # SOG-0474 : la page compare le cycle du dossier à celui du réseau en place pour décider de relancer ; une valeur qui n'a pas la forme d'un cycle (« 2610 ») n'est pas rendue
    if not path:
        return {'configured': False, 'state': None, 'cycle': None, 'zones': zones, 'built': built}
    ok, why = check_folder(path)
    state = 'ok' if ok else 'not-xplane' if why == 'no-files' else 'missing' if why == 'missing' else 'unreadable'
    return {'configured': True, 'state': state, 'cycle': (read_cycle(path) or None) if ok else None, 'zones': zones, 'built': built}


def set_path(data, path, certified):
    """(HTTP, corps) du POST /__setup/xplane : { path } ; '' efface. Un code court, jamais le chemin. Raisons : bad-body, too-long, refused, not-a-folder, not-xplane, not-personal."""
    if not isinstance(path, str):
        return 400, {'ok': False, 'reason': 'bad-body'}
    if path == '':
        config_write(data, '')
        return 200, {'ok': True, 'configured': False, 'state': None}
    if not certified:
        return 403, {'ok': False, 'reason': 'not-personal'}
    ok, why = check_folder(path)
    if not ok:
        reason = {'not-text': 'bad-body', 'long': 'too-long', 'missing': 'not-a-folder', 'no-files': 'not-xplane'}.get(why, 'refused')
        return 400, {'ok': False, 'reason': reason}
    config_write(data, path)
    return 200, {'ok': True, 'configured': True, 'state': 'ok', 'cycle': read_cycle(path) or None}
