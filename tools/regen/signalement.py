"""Le jeu « signalement » du lanceur : « Signaler un problème ou une demande » écrit sur le poste de l'ergonome (SOG-0316) — chargé par regen_jobs.load_verbs().

Deux verbes, ce poste seulement (comme tous les travaux ; la route est la route existante POST /__setup/regen/job : aucune route nouvelle) :
  · `signalement/ajouter` { kind, title, text, screen, ctx?, images?, origin? } : ajoute UN signalement à organisation/SIGNALEMENTS.json, avec jusqu'à trois captures rangées dans organisation/images/ ;
  · `signalement/lire` { ids? } : { ok, count, items: { id: { state, fiche? } }, refs: ['ABC/SIG-…', …] (ceux d'un pilote déjà repris) } — l'état des signalements demandés (vingt derniers sans `ids`) ; { ok: false, reason: 'no-organisation' } sur un poste qui n'est pas celui de l'ergonome.
Forme du fichier : { "schema": "sog-signalements/1", "updated": "<ISO UTC>", "items": { "SIG-0123456789": { kind, title, text, screen, ctx?, images?, at, state, from?, folder?, ref? }, … } } — 1000 entrées au plus ; l'ergonome le lit à chaque tour
et y pose l'état (`state` : new, read, fiche + `fiche` SOG-nnnn) : ce verbe n'efface et ne réécrit JAMAIS ce qu'il ne crée pas (les entrées déjà là sont gardées telles quelles, clés inconnues comprises ; un fichier illisible ou d'un autre schéma est refusé, pas remplacé).
Règles : le dossier organisation/ absent → { ok: false, reason: 'no-organisation' } (rien n'est créé) ; sorte, écran, langue, design et taille sont des listes fermées ; titre de 80 signes au plus, texte de 2000 (sans caractère de commande, hors tabulation et saut de ligne pour le texte) ;
une clé inconnue de l'argument est REFUSÉE ; l'identifiant est fabriqué ici (SIG- et dix chiffres hexadécimaux), jamais reçu.
CAPTURES (SOG-0316, avis de Sécurisation) : trois au plus, png, jpeg ou webp RECONNUS PAR LEURS OCTETS (signature ; ni le nom ni le type annoncé ne comptent ; svg, html et le reste sont refusés), 1,5 Mio chacune sur les octets réellement reçus, dimensions lues dans l'en-tête (8000 × 8000 et 40 millions de pixels au plus) ;
le nom est fabriqué ici (SIG-<identifiant>-<n>.<ext>), jamais reçu ; création exclusive dans organisation/images/ (qui ne se crée pas, n'est ni un lien ni une jonction), jamais d'écrasement ; les images d'abord, puis le JSON (.tmp puis remplacement) ; si le JSON échoue, les images CRÉÉES PAR CE TRAVAIL sont retirées, elles seules.
Les octets ne restent JAMAIS dans les arguments du travail : `check()` les décode, les contrôle et les range dans une RÉSERVE en mémoire (jamais sur disque, jeton token_urlsafe, usage unique, 2 minutes, 6 entrées, 27 Mio au total, vidée à l'usage, à l'échec et à l'expiration) ; le travail ne garde que des tailles et des types.
`origin` { folder, ref } : un signalement REPRIS du dépôt de données (celui d'un pilote, SOG-0316) — avec ses photos si le pilote en a jointes (SOG-0335 : réduites sur son appareil, lues et contrôlées par la page, puis re-contrôlées ici comme toute capture : signature, taille, dimensions) ; marqué `from: pilote`, `folder` (« signalé depuis le dossier de … » : le trigramme d'un chemin n'est pas une identité vérifiée) et `ref` ; le même `ref` n'est repris qu'une fois."""
import base64
import json
import os
import re
import secrets
import threading
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
SCHEMA = 'sog-signalements/1'
FILE = 'SIGNALEMENTS.json'
MAX_ITEMS = 1000
MAX_TITLE = 80
MAX_TEXT = 2000        # le même que la recette (SOG-0303)
FILE_MAX = 4 * 1024 * 1024
KINDS = ('bug', 'regression', 'ergonomics', 'performance', 'request')
LANGS = ('fr', 'en', 'de', 'es')
DESIGNS = ('standard', 'cabinet', 'field', 'metro', 'swiss', 'cupertino', 'material', 'aqua')
SIZES = ('phone', 'tablet', 'desktop')
TONES = ('day', 'night')
# l'écran d'où l'on vient : les modules de la suite et les écrans du cadre (tests/v3 K232 compare cette liste aux dossiers de modules/)
SCREENS = ('aircraft', 'atmosphere', 'data', 'flightlog', 'fuel', 'hello', 'maps', 'missions', 'report', 'stats', 'website',
           'help', 'roadmap', 'recette', 'settings', 'device', 'conflicts', 'sources', 'signaler', 'other')
STATES = ('new', 'read', 'fiche')
VERSION = re.compile(r'[0-9A-Za-z._+-]{1,40}')      # « jalon-n-gSHA » (git describe) : le jalon et le SHA court
ID = re.compile(r'SIG-[0-9a-f]{10}')
IMAGE_NAME = re.compile(r'SIG-[0-9a-zA-Z]{4,16}-[1-3]\.(png|jpg|webp)')
FICHE = re.compile(r'SOG-[0-9]{4}')
FOLDER = re.compile(r'[A-Za-z0-9]{2,8}')
REF = re.compile(r'[A-Za-z0-9._-]{4,40}')
CONTROL = re.compile(r'[\x00-\x08\x0b-\x1f\x7f]')       # le texte : tabulation et saut de ligne permis
CONTROL_ALL = re.compile(r'[\x00-\x1f\x7f]')            # le titre : sur une ligne
MAX_IMAGES = 3
IMAGE_MAX = 1572864                                    # 1,5 Mio d'octets
B64_MAX = 2097152                                      # la même taille en base64 : refusée avant de décoder
SIDE_MAX = 8000
PIXELS_MAX = 40_000_000
HOLD_S = 120
HOLD_MAX = 6
HOLD_BYTES = HOLD_MAX * MAX_IMAGES * IMAGE_MAX

# ---- la réserve des octets : en mémoire seulement, usage unique
_HELD = {}                  # jeton → (échéance, [(extension, octets)], total)
_LOCK = threading.Lock()


def _purge(now):
    for k in [k for k, v in _HELD.items() if v[0] <= now]:
        del _HELD[k]


def hold(images, now=None):
    """Range les captures contrôlées ; rend le jeton, ou None si la réserve est pleine (6 entrées ou 27 Mio)."""
    now = time.time() if now is None else now
    total = sum(len(b) for _, b in images)
    with _LOCK:
        _purge(now)
        if len(_HELD) >= HOLD_MAX or sum(v[2] for v in _HELD.values()) + total > HOLD_BYTES:
            return None
        token = secrets.token_urlsafe(24)
        _HELD[token] = (now + HOLD_S, list(images), total)
        return token


def take(token, now=None):
    """Reprend (et vide) les captures d'un jeton : une seule fois ; None si le jeton est inconnu, déjà pris ou expiré."""
    now = time.time() if now is None else now
    with _LOCK:
        _purge(now)
        v = _HELD.pop(token, None) if isinstance(token, str) else None
    return v[1] if v else None


def held():
    """(nombre d'entrées, octets) de la réserve — pour les cas de banc."""
    with _LOCK:
        _purge(time.time())
        return len(_HELD), sum(v[2] for v in _HELD.values())


# ---- les octets d'une capture : le type vient de la signature, les dimensions de l'en-tête
def sniff(b):
    """(extension, largeur, hauteur) d'une capture png, jpeg ou webp d'après ses octets, ou None."""
    try:
        if b[:8] == b'\x89PNG\r\n\x1a\n' and b[12:16] == b'IHDR':
            return 'png', int.from_bytes(b[16:20], 'big'), int.from_bytes(b[20:24], 'big')
        if b[:3] == b'\xff\xd8\xff':
            i = 2
            while i + 9 < len(b):
                if b[i] != 0xFF:
                    i += 1
                    continue
                m = b[i + 1]
                if m == 0xFF:
                    i += 1
                    continue
                if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7:
                    i += 2
                    continue
                n = int.from_bytes(b[i + 2:i + 4], 'big')
                if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
                    return 'jpg', int.from_bytes(b[i + 7:i + 9], 'big'), int.from_bytes(b[i + 5:i + 7], 'big')
                if n < 2:
                    return None
                i += 2 + n
            return None
        if b[:4] == b'RIFF' and b[8:12] == b'WEBP':
            kind = b[12:16]
            if kind == b'VP8 ' and b[23:26] == b'\x9d\x01\x2a':
                return 'webp', int.from_bytes(b[26:28], 'little') & 0x3FFF, int.from_bytes(b[28:30], 'little') & 0x3FFF
            if kind == b'VP8L' and b[20] == 0x2F:
                bits = int.from_bytes(b[21:25], 'little')
                return 'webp', (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            if kind == b'VP8X':
                return 'webp', int.from_bytes(b[24:27], 'little') + 1, int.from_bytes(b[27:30], 'little') + 1
    except (IndexError, ValueError):
        return None
    return None


def image_problem(data):
    """(extension, octets, None) d'une capture reçue en base64, ou (None, None, raison)."""
    if not isinstance(data, str) or len(data) > B64_MAX:
        return None, None, 'image-too-big'
    try:
        raw = base64.b64decode(data, validate=True)
    except (ValueError, TypeError):
        return None, None, 'bad-image'
    if not raw or len(raw) > IMAGE_MAX:
        return None, None, 'image-too-big'
    s = sniff(raw)
    if s is None:
        return None, None, 'bad-image'
    ext, w, h = s
    if w < 1 or h < 1 or w > SIDE_MAX or h > SIDE_MAX or w * h > PIXELS_MAX:
        return None, None, 'image-dimensions'
    return ext, raw, None


# ---- les arguments
def _text(v, n, pattern):
    return isinstance(v, str) and 0 < len(v.strip()) and len(v) <= n and not pattern.search(v)


def parse(a):
    """(arguments propres avec les octets décodés, None) ou (None, raison) : la forme et les règles de fond ; rien n'est gardé ici."""
    if not isinstance(a, dict) or not {'kind', 'title', 'text', 'screen'} <= set(a) <= {'kind', 'title', 'text', 'screen', 'ctx', 'images', 'origin'}:
        return None, 'bad-fields'
    if a['kind'] not in KINDS or a['screen'] not in SCREENS:
        return None, 'bad-fields'
    if not _text(a['title'], MAX_TITLE, CONTROL_ALL) or not _text(a['text'], MAX_TEXT, CONTROL):
        return None, 'bad-fields'
    out = {'kind': a['kind'], 'title': a['title'].strip(), 'text': a['text'].strip(), 'screen': a['screen']}
    if 'ctx' in a:
        c = a['ctx']
        if not isinstance(c, dict) or not set(c) <= {'version', 'lang', 'design', 'size', 'tone'}:
            return None, 'bad-fields'
        ok = ((c.get('version') is None or (isinstance(c['version'], str) and VERSION.fullmatch(c['version']))) and c.get('lang', 'fr') in LANGS and c.get('design', 'standard') in DESIGNS
              and c.get('size', 'phone') in SIZES and c.get('tone', 'day') in TONES)
        if not ok:
            return None, 'bad-fields'
        out['ctx'] = {k: c[k] for k in ('version', 'lang', 'design', 'size', 'tone') if k in c}
    origin = a.get('origin')
    if origin is not None:
        if not isinstance(origin, dict) or set(origin) != {'folder', 'ref'} or not isinstance(origin['folder'], str) or not FOLDER.fullmatch(origin['folder']) \
                or not isinstance(origin['ref'], str) or not REF.fullmatch(origin['ref']):
            return None, 'bad-fields'
        out['origin'] = {'folder': origin['folder'], 'ref': origin['ref']}
    imgs = a.get('images', [])
    if not isinstance(imgs, list) or len(imgs) > MAX_IMAGES:
        return None, 'too-many-images'
    raws = []
    for im in imgs:
        if not isinstance(im, dict) or not set(im) <= {'data', 'name', 'type'}:    # le nom et le type annoncés par la page sont ignorés
            return None, 'bad-image'
        ext, raw, why = image_problem(im.get('data'))
        if why:
            return None, why
        raws.append((ext, raw))
    out['_raws'] = raws
    return out, None


def check(a):
    """Contrôle d'arguments de signalement/ajouter (→ 400 si None) : les octets sont décodés, contrôlés et RANGÉS dans la réserve ; ce qui reste (et que le travail garde) : tailles et types, jamais un octet."""
    out, why = parse(a)
    if why:
        return None
    raws = out.pop('_raws')
    if raws:
        token = hold(raws)
        if token is None:
            return None
        out['images'] = [{'type': e, 'size': len(b)} for e, b in raws]
        out['_ref'] = token
    return out


def check_read(a):
    """Contrôle de signalement/lire : rien, ou `ids` (vingt identifiants au plus)."""
    if not isinstance(a, dict) or not set(a) <= {'ids'}:
        return None
    ids = a.get('ids', [])
    if not isinstance(ids, list) or len(ids) > 20 or not all(isinstance(i, str) and ID.fullmatch(i) for i in ids):
        return None
    return {'ids': ids} if ids else {}


def explain(a):
    """La raison d'un refus d'arguments (regen_jobs.EXPLAIN) : un code, jamais le contenu."""
    out, why = parse(a)
    if why is None:
        why = 'reserve-full'
    return {'reason': why, 'message': f'refused: {why}'}


# ---- le fichier
def _read_raw(path):
    """(document, None) du fichier tel quel ; ({schéma, items vides}, None) s'il n'existe pas ; (None, raison) s'il est trop gros, illisible ou d'un autre schéma : jamais remplacé."""
    try:
        if os.path.getsize(path) > FILE_MAX:
            return None, 'unreadable'
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except FileNotFoundError:
        return {'schema': SCHEMA, 'items': {}}, None
    except (OSError, ValueError):
        return None, 'unreadable'
    if not isinstance(d, dict) or d.get('schema') != SCHEMA or not isinstance(d.get('items'), dict):
        return None, 'unreadable'
    return d, None


def _images_dir(org):
    """Le dossier organisation/images/ s'il existe, qu'il n'est ni un lien ni une jonction et reste dans organisation/ ; sinon None. Jamais créé."""
    d = os.path.join(org, 'images')
    if not os.path.isdir(d) or os.path.islink(d) or (hasattr(os.path, 'isjunction') and os.path.isjunction(d)):
        return None
    if os.path.normcase(os.path.realpath(d)) != os.path.normcase(os.path.join(os.path.realpath(org), 'images')):
        return None
    return d


def ajouter(job, args, ctx):
    """Verbe signalement/ajouter (voir l'en-tête)."""
    raws = take(args.get('_ref')) if args.get('_ref') else []
    if raws is None:
        return {'ok': False, 'reason': 'expired'}
    root = (ctx or {}).get('root') or ROOT
    org = os.path.join(root, 'organisation')
    if not os.path.isdir(org):
        return {'ok': False, 'reason': 'no-organisation'}
    folder = _images_dir(org) if raws else None
    if raws and folder is None:
        return {'ok': False, 'reason': 'no-images-dir'}
    path = os.path.join(org, FILE)
    doc, why = _read_raw(path)
    if why:
        return {'ok': False, 'reason': why}
    items = doc['items']
    origin = args.get('origin')
    if origin and any(isinstance(v, dict) and v.get('from') == 'pilote' and v.get('folder') == origin['folder'] and v.get('ref') == origin['ref'] for v in items.values()):
        return {'ok': False, 'reason': 'already'}
    if len(items) >= MAX_ITEMS:
        return {'ok': False, 'reason': 'too-many'}
    made = []                                # les images CRÉÉES PAR CE TRAVAIL, et elles seules
    try:
        free = lambda i: i not in items and not (folder and any(os.path.exists(os.path.join(folder, f'{i}-{n}.{e}')) for n in (1, 2, 3) for e in ('png', 'jpg', 'webp')))
        for _ in range(8):       # une collision (identifiant ou nom déjà là) : un nouvel identifiant, rien n'est écrasé
            sid = 'SIG-' + secrets.token_hex(5)
            if free(sid):
                break
        else:
            return {'ok': False, 'reason': 'failed'}
        names = []
        for n, (ext, raw) in enumerate(raws, 1):
            name = f'{sid}-{n}.{ext}'
            assert IMAGE_NAME.fullmatch(name)
            with open(os.path.join(folder, name), 'xb') as f:
                made.append(os.path.join(folder, name))
                f.write(raw)
            names.append(name)
        entry = {k: args[k] for k in ('kind', 'title', 'text', 'screen', 'ctx') if k in args}
        if names:
            entry['images'] = names
        entry['at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        entry['state'] = 'new'
        if origin:
            entry.update({'from': 'pilote', 'folder': origin['folder'], 'ref': origin['ref']})
        items[sid] = entry
        doc['updated'] = entry['at']
        tmp = path + '.tmp'
        try:
            with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
                f.write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass
    except (OSError, AssertionError):
        for p in made:
            try:
                os.remove(p)
            except OSError:
                pass
        return {'ok': False, 'reason': 'failed'}
    job.log(f'signalement : {sid} ({len(made)} capture(s))')
    return {'ok': True, 'id': sid, 'at': entry['at'], 'images': len(made)}


def lire(job, args, ctx):
    """Verbe signalement/lire : l'état des signalements demandés (le poste de l'ergonome seulement)."""
    root = (ctx or {}).get('root') or ROOT
    org = os.path.join(root, 'organisation')
    if not os.path.isdir(org):
        return {'ok': False, 'reason': 'no-organisation'}
    doc, why = _read_raw(os.path.join(org, FILE))
    if why:
        return {'ok': False, 'reason': why}
    items = doc['items']
    ids = args.get('ids') or list(items)[-20:]
    out = {}
    for i in ids:
        v = items.get(i)
        if isinstance(v, dict):
            st = v.get('state') if v.get('state') in STATES else 'new'
            out[i] = {'state': st, **({'fiche': v['fiche']} if st == 'fiche' and isinstance(v.get('fiche'), str) and FICHE.fullmatch(v['fiche']) else {})}
    refs = [f"{v['folder']}/{v['ref']}" for v in items.values() if isinstance(v, dict) and v.get('from') == 'pilote' and isinstance(v.get('folder'), str) and isinstance(v.get('ref'), str)][:MAX_ITEMS]
    return {'ok': True, 'count': len(items), 'items': out, 'refs': refs}      # `refs` : les signalements de pilotes déjà repris (dossier/identifiant), pour dire « n non repris »


VERBS = {
    ('signalement', 'ajouter'): (ajouter, check),
    ('signalement', 'lire'): (lire, check_read),
}
MIN_GAP = {('signalement', 'ajouter'): 2}
EXPLAIN = {('signalement', 'ajouter'): explain}
