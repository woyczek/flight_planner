"""Appareils des pilotes par le relais de la compagnie (V3 frame, lot R1a, 29 oct. 2026 ; frame/SPEC.md « relais »).

Le lanceur tourne en mode relais (launch.py --relay <hôte public>) derrière le proxy inverse du NAS (https, Let's Encrypt),
écouté sur 127.0.0.1 seulement. Un appareil de pilote :
  · reçoit de l'administrateur, sur le poste, un code à 8 chiffres lié à son trigramme (new_code), à usage unique, valable
    10 minutes ; il le saisit une fois sur la page /__relay/pair ;
  · garde un jeton long (cookie sog_relay, HttpOnly, Secure, SameSite=Lax) dont seule l'empreinte est gardée ici
    (tools/.relay.json, local, jamais versionné), avec son trigramme : l'auteur de ses écritures vient de là, jamais de la
    page ; un an au plus, révocable par appareil ou par pilote ;
  · 5 codes faux d'une même adresse : une minute d'attente ; 30 codes faux en une heure : appairage fermé jusqu'au prochain
    code demandé sur le poste.
Ce module tient l'état (codes, essais, appareils) ; le contrôle de chaque requête est dans launch.py (_relay_gate).
Bibliothèque standard seulement."""
import datetime, hashlib, hmac, json, os, re, secrets, threading, time

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.relay.json')
COOKIE = 'sog_relay'
MAX_AGE = 365 * 24 * 3600
CODE_TTL = 600  # durée d'un code (s)
TRIES_PER_IP = 5
LOCK_S = 60
TRIES_HOUR = 30  # codes faux en une heure, toutes adresses : appairage fermé
TRIGRAM = re.compile(r'[A-Z0-9]{2,5}')

_lock = threading.Lock()
state = {'codes': {}, 'fails': {}, 'wrong': [], 'closed': False}  # codes : code → (trigramme, heure d'émission)


def _iso(ts=None):
    return datetime.datetime.fromtimestamp(time.time() if ts is None else ts, datetime.timezone.utc).isoformat(timespec='seconds')


def devices():
    """Appareils appairés (fichier relu à chaque appel : petit, et révoqué ailleurs = révoqué ici)."""
    try:
        with open(FILE, encoding='utf-8') as f:
            lst = json.load(f).get('devices') or []
        return [d for d in lst if isinstance(d, dict) and d.get('hash') and TRIGRAM.fullmatch(str(d.get('trigram') or ''))]
    except (OSError, ValueError, AttributeError):
        return []


def _save(lst):
    tmp = FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'devices': lst}, f, ensure_ascii=False, indent=1)
    os.replace(tmp, FILE)


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def listing():
    """Appareils pour l'écran du poste : { id, trigram, label, at, last, expires } ; jamais l'empreinte."""
    return [{k: d.get(k, '') for k in ('id', 'trigram', 'label', 'at', 'last', 'expires')} for d in devices()]


def new_code(trigram):
    """Code à 8 chiffres pour un appareil de ce pilote (un seul usage, 10 minutes) ; rouvre l'appairage fermé. None si le
    trigramme est invalide."""
    tri = str(trigram or '').upper()
    if not TRIGRAM.fullmatch(tri):
        return None
    code = f'{secrets.randbelow(10 ** 8):08d}'
    with _lock:
        now = time.monotonic()
        state['codes'] = {c: v for c, v in state['codes'].items() if now - v[1] < CODE_TTL}
        state['codes'][code] = (tri, now)
        state['closed'] = False
        state['wrong'] = []
    return code


def pending():
    """Codes en cours (sans leur valeur) : [{ trigram, expires_in }]."""
    now = time.monotonic()
    with _lock:
        return [{'trigram': t, 'expires_in': int(CODE_TTL - (now - at))} for t, at in state['codes'].values() if now - at < CODE_TTL]


def device_label(ua):
    ua = str(ua or '')
    for rx, name in ((r'iPhone', 'iPhone'), (r'iPad', 'iPad'), (r'Android', 'Android'), (r'Windows', 'Windows'), (r'Mac OS', 'Mac'),
                     (r'Linux', 'Linux')):
        if re.search(rx, ua):
            return name
    return '?'


def attempt(ip, code, ua=''):
    """Code saisi : ('ok', jeton, trigramme) ; ('wait', secondes, '') après 5 essais faux de cette adresse en une minute ;
    ('closed', 0, '') appairage fermé (30 essais faux en une heure) ; ('expired', 0, '') aucun code en cours ; ('bad', 0, '')."""
    now = time.monotonic()
    with _lock:
        if state['closed']:
            return 'closed', 0, ''
        # adresses tournantes (IPv6) : les essais de plus d'une heure oubliés, la table ne grossit pas sans fin
        state['fails'] = {k: v for k, v in state['fails'].items() if now - v[1] < 3600}
        n, at = state['fails'].get(ip, (0, now))
        if n >= TRIES_PER_IP and now - at < LOCK_S:
            return 'wait', int(LOCK_S - (now - at)) + 1, ''
        if n >= TRIES_PER_IP:
            n = 0
        live = {c: v for c, v in state['codes'].items() if now - v[1] < CODE_TTL}
        state['codes'] = live
        if not live:
            return 'expired', 0, ''
        c = code.strip() if isinstance(code, str) else ''
        hit = next((k for k in live if re.fullmatch(r'\d{8}', c) and hmac.compare_digest(c, k)), None)
        if hit:
            tri = live.pop(hit)[0]
            state['fails'].pop(ip, None)
            token = secrets.token_urlsafe(32)
            lst = devices()
            lst.append({'id': secrets.token_hex(6), 'hash': _hash(token), 'trigram': tri, 'label': device_label(ua), 'at': _iso(),
                        'last': '', 'expires': _iso(time.time() + MAX_AGE)})
            _save(lst)
            return 'ok', token, tri
        state['fails'][ip] = (n + 1, now if n == 0 else at)
        state['wrong'] = [t for t in state['wrong'] if now - t < 3600] + [now]
        if len(state['wrong']) >= TRIES_HOUR:
            state.update(closed=True, codes={})
            return 'closed', 0, ''
        return 'bad', 0, ''


def paired(token):
    """L'appareil de ce jeton { id, trigram, … } s'il est appairé et pas expiré ; None sinon. Dernier usage noté au plus
    une fois par heure."""
    if not isinstance(token, str) or not token or len(token) > 200:
        return None
    h = _hash(token)
    with _lock:
        lst = devices()
        for d in lst:
            if hmac.compare_digest(h, d['hash']):
                if str(d.get('expires') or '') and str(d['expires']) < _iso():
                    return None
                if not d.get('last') or d['last'][:13] != _iso()[:13]:
                    d['last'] = _iso()
                    _save(lst)
                return {k: d.get(k, '') for k in ('id', 'trigram', 'label')}
    return None


def forget(device_id=None, trigram=None):
    """Révoque un appareil (son id), tous ceux d'un pilote (trigram) ; rend le nombre retiré."""
    with _lock:
        lst = devices()
        keep = [d for d in lst if not ((device_id and d.get('id') == device_id) or (trigram and d.get('trigram') == str(trigram).upper()))]
        if len(keep) != len(lst):
            _save(keep)
        return len(lst) - len(keep)
