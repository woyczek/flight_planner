"""Appareils appairés au lanceur : un seul appairage et une seule liste pour les deux canaux (V3 frame, refonte R-C2, 30 oct.
2026 ; frame/SPEC.md § 3.10 et « relais »).

Deux canaux mènent un appareil au lanceur :
  · lan : le réseau local (lancer.cmd --lan, ou Réglages › Accès du poste), même port, adresse privée et hôte exact exigés ;
    cookie sog_lan_<port> (HttpOnly, SameSite=Strict) ;
  · relay : le relais de la compagnie (launch.py --relay <hôte public>) derrière le proxy inverse du NAS, https ; cookie
    sog_relay (HttpOnly, Secure, SameSite=Lax).
Un seul mécanisme pour les deux :
  · un code à 8 chiffres, un usage, 10 minutes. Demandé sur l'écran « Appareils » du poste, il porte le trigramme du pilote
    et vaut sur les deux canaux ; affiché en console à l'ouverture du réseau local (ou par « Nouveau code » de la carte
    d'accès), il n'en porte pas et vaut sur le réseau local seulement (la ligne dit « code de console », « Nommer » lui pose
    un trigramme après coup) ;
  · les mêmes limites d'essais : 5 codes faux d'une même adresse, une minute d'attente ; 30 en une heure sur un canal,
    appairage fermé sur ce canal jusqu'au prochain code demandé sur le poste pour lui (un seau par canal : un inconnu devant
    le relais ne ferme pas le réseau local, relecture sécurité de R-C2) ;
  · une seule liste, tools/.devices.json (local, jamais versionné) : { id, hash (empreinte du jeton, jamais le jeton),
    channel (celui par lequel l'appareil est venu), trigram, label, at, last, expires } ; un jeton ne vaut que sur le canal
    de sa ligne ; un an au plus (une ligne expirée est retirée à la lecture) ; révocable par appareil, par pilote, par canal
    ou tout ;
  · reprise : à la première lecture, les anciens fichiers tools/.lan.json et tools/.relay.json sont repris dans la liste (un
    appareil appairé le reste), puis retirés.
Ce module tient l'état (codes, essais, appareils) et les adresses du réseau local ; les serveurs et le contrôle de chaque
requête sont dans launch.py. Bibliothèque standard seulement."""
import datetime, hashlib, hmac, ipaddress, json, os, re, secrets, socket, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, '.devices.json')
OLD = {'lan': os.path.join(HERE, '.lan.json'), 'relay': os.path.join(HERE, '.relay.json')}  # repris une fois, puis retirés
CHANNELS = ('lan', 'relay')
RELAY_COOKIE = 'sog_relay'
NETS = [ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')]
MAX_AGE = 365 * 24 * 3600
CODE_TTL = 600  # durée d'un code (s)
TRIES_PER_IP = 5
LOCK_S = 60
TRIES_HOUR = 30  # codes faux en une heure sur un canal, toutes adresses : appairage fermé sur ce canal
TRIGRAM = re.compile(r'[A-Z0-9]{2,5}')
# routes /__setup/ ouvertes à un appareil appairé : déclarées là où elles sont écrites, dans launch.py (@route(…,
# public='lan', relay=True) ; table ROUTES) ; tout le reste (clés, clone, reprise, imports, maintenance, ces appareils) :
# ce poste seulement

_lock = threading.Lock()
# codes : code → (trigramme ou '', heure d'émission, canaux) ; fails : adresse → (essais faux, premier essai) ; wrong et
# closed : un seau par canal
state = {'codes': {}, 'fails': {}, 'wrong': {c: [] for c in CHANNELS}, 'closed': {c: False for c in CHANNELS}}
_devices = {'mtime': None, 'list': []}


def _iso(ts=None):
    return datetime.datetime.fromtimestamp(time.time() if ts is None else ts, datetime.timezone.utc).isoformat(timespec='seconds')


def lan_cookie(port):
    """Nom du cookie du réseau local : propre au port (deux lanceurs sur le même poste ne partagent pas leurs appareils)."""
    return f'sog_lan_{int(port)}'


def private(ip):
    """Adresse de ce poste ou du réseau local (privée au sens strict : pas l'espace partagé des opérateurs)."""
    try:
        a = ipaddress.ip_address(str(ip).split('%')[0])
    except ValueError:
        return False
    if a.version == 6 and a.ipv4_mapped:
        a = a.ipv4_mapped
    return a.is_loopback or (a.version == 4 and any(a in n for n in NETS))


def addresses():
    """Adresses IPv4 privées de ce poste ; celle de la route par défaut d'abord (la seule ouverte par défaut)."""
    first, found = '', set()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(('192.0.2.1', 9))  # aucun paquet envoyé (UDP) : seulement l'interface choisie
            first = s.getsockname()[0]
    except OSError:
        pass
    try:
        found.update(i[4][0] for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET))
    except OSError:
        pass
    found.add(first)
    ok = sorted(ip for ip in found if ip and private(ip) and not ipaddress.ip_address(ip).is_loopback)
    return sorted(ok, key=lambda ip: ip != first)


def device_label(ua):
    """Nom court d'un appareil d'après son navigateur (« Android · Chrome », « iPad · Safari »…)."""
    ua = str(ua or '')
    osn = next((n for k, n in (('iPad', 'iPad'), ('iPhone', 'iPhone'), ('Android', 'Android'), ('Windows', 'Windows'),
                               ('Mac OS X', 'Mac'), ('CrOS', 'ChromeOS'), ('Linux', 'Linux')) if k in ua), '?')
    br = next((n for k, n in (('Edg/', 'Edge'), ('OPR/', 'Opera'), ('Firefox/', 'Firefox'), ('FxiOS', 'Firefox'),
                              ('CriOS', 'Chrome'), ('Chrome/', 'Chrome'), ('Safari/', 'Safari')) if k in ua), '?')
    return f'{osn} · {br}'


def _row(d, channel):
    """Une ligne valide de la liste, ou None (une ligne du relais a toujours son trigramme : l'auteur de ses écritures)."""
    if not isinstance(d, dict) or not isinstance(d.get('hash'), str) or len(d['hash']) != 64:
        return None
    tri = str(d.get('trigram') or '').upper()
    if (tri and not TRIGRAM.fullmatch(tri)) or (channel == 'relay' and not tri):
        return None
    at = str(d.get('at') or '')
    return {'id': str(d.get('id') or d['hash'][:12]), 'hash': d['hash'], 'channel': channel, 'trigram': tri,
            'label': str(d.get('label') or '?'), 'at': at, 'last': str(d.get('last') or ''),
            'expires': str(d.get('expires') or '') or _iso(_parse(at) + MAX_AGE if at else time.time() + MAX_AGE)}


def _parse(iso):
    try:
        return datetime.datetime.fromisoformat(iso).timestamp()
    except ValueError:
        return time.time()


def _migrate():
    """Les anciens fichiers (.lan.json, .relay.json) repris dans .devices.json, puis retirés ; rien s'il n'y en a pas."""
    rows = []
    for channel, path in OLD.items():
        try:
            with open(path, encoding='utf-8') as f:
                rows += [r for r in (_row(d, channel) for d in json.load(f).get('devices') or []) if r]
        except (OSError, ValueError, AttributeError):
            continue
    if not any(os.path.exists(p) for p in OLD.values()):
        return
    _save(rows)
    for path in OLD.values():
        try:
            os.remove(path)
        except OSError:
            pass


def devices():
    """Appareils appairés (relus si le fichier a changé : révoqué ailleurs = révoqué ici)."""
    if not os.path.exists(FILE):
        _migrate()
    try:
        m = os.path.getmtime(FILE)
    except OSError:
        m = None
    if m != _devices['mtime']:
        try:
            with open(FILE, encoding='utf-8') as f:
                lst = [r for r in (_row(d, d.get('channel')) for d in json.load(f).get('devices') or [] if isinstance(d, dict)
                                   and d.get('channel') in CHANNELS) if r]
        except (OSError, ValueError, AttributeError):
            lst = []
        live = [d for d in lst if d['expires'] >= _iso()]
        if len(live) != len(lst):  # les lignes expirées retirées à la lecture : ni gardées, ni montrées
            _save(live)
            m = _devices['mtime'] = os.path.getmtime(FILE)
        _devices.update(mtime=m, list=live)
    return [dict(d) for d in _devices['list']]


def _save(lst):
    tmp = FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'schema': 1, 'devices': lst}, f, ensure_ascii=False, indent=1)
    os.replace(tmp, FILE)
    _devices['mtime'] = None


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def listing(channel=None):
    """Appareils pour les écrans du poste : { id, channel, trigram, label, at, last, expires } ; jamais l'empreinte."""
    return [{k: d[k] for k in ('id', 'channel', 'trigram', 'label', 'at', 'last', 'expires')} for d in devices()
            if channel in (None, d['channel'])]


def new_code(trigram=None, channels=CHANNELS):
    """Code à 8 chiffres (un usage, 10 minutes) ; rouvre l'appairage fermé. Avec un trigramme (écran « Appareils ») : les deux
    canaux ; sans (code de console du réseau local) : channels=('lan',). None si le trigramme est invalide."""
    tri = str(trigram or '').upper()
    if trigram is not None and not TRIGRAM.fullmatch(tri):
        return None
    if not tri and 'relay' in channels:  # le relais signe les écritures du trigramme de l'appareil : jamais sans
        return None
    code = f'{secrets.randbelow(10 ** 8):08d}'
    with _lock:
        now = time.monotonic()
        state['codes'] = {c: v for c, v in state['codes'].items() if now - v[1] < CODE_TTL}
        state['codes'][code] = (tri, now, tuple(channels))
        for ch in channels:  # rouvre le ou les canaux de ce code ; l'attente d'une adresse (5 codes faux) reste
            state['closed'][ch] = False
            state['wrong'][ch] = []
    return code


def console_code():
    """Le code de console du réseau local (sans trigramme) : un seul à la fois, le précédent retiré."""
    clear_console()
    return new_code(None, ('lan',))


def clear_console():
    """Retire le code de console en cours (fermeture du réseau local)."""
    with _lock:
        state['codes'] = {c: v for c, v in state['codes'].items() if v[0] or v[2] != ('lan',)}


def console_state():
    """{ code, expires (s) } du code de console en cours, { closed } si l'appairage est fermé, sinon {} (aucun code)."""
    now = time.monotonic()
    with _lock:
        if state['closed']['lan']:
            return {'closed': True}
        live = [(c, v) for c, v in state['codes'].items() if not v[0] and v[2] == ('lan',) and now - v[1] < CODE_TTL]
        if not live:
            return {}
        c, v = max(live, key=lambda x: x[1][1])
        return {'code': c, 'expires': int(CODE_TTL - (now - v[1]))}


def pending():
    """Codes en cours (sans leur valeur) : [{ trigram, channels, expires_in }]."""
    now = time.monotonic()
    with _lock:
        return [{'trigram': t, 'channels': list(ch), 'expires_in': int(CODE_TTL - (now - at))} for t, at, ch in state['codes'].values()
                if now - at < CODE_TTL]


def attempt(ip, code, ua, channel):
    """Code saisi sur le canal channel : ('ok', jeton, trigramme) ; ('wait', secondes, '') après 5 essais faux de cette
    adresse en une minute ; ('closed', 0, '') appairage fermé sur ce canal (30 essais faux en une heure) ; ('expired', 0, '')
    aucun code en cours pour ce canal ; ('bad', 0, '')."""
    now = time.monotonic()
    with _lock:
        if state['closed'][channel]:
            return 'closed', 0, ''
        # adresses tournantes (IPv6) : les essais de plus d'une heure oubliés, la table ne grossit pas sans fin
        state['fails'] = {k: v for k, v in state['fails'].items() if now - v[1] < 3600}
        n, at = state['fails'].get(ip, (0, now))
        if n >= TRIES_PER_IP and now - at < LOCK_S:
            return 'wait', int(LOCK_S - (now - at)) + 1, ''
        if n >= TRIES_PER_IP:
            n = 0
        state['codes'] = {c: v for c, v in state['codes'].items() if now - v[1] < CODE_TTL}
        live = {c: v for c, v in state['codes'].items() if channel in v[2]}
        if not live:
            return 'expired', 0, ''
        c = code.strip() if isinstance(code, str) else ''
        hit = next((k for k in live if re.fullmatch(r'\d{8}', c) and hmac.compare_digest(c, k)), None)
        if hit:
            tri = state['codes'].pop(hit)[0]
            state['fails'].pop(ip, None)
            token = secrets.token_urlsafe(32)
            lst = devices()
            h = _hash(token)
            lst.append({'id': secrets.token_hex(6), 'hash': h, 'channel': channel, 'trigram': tri, 'label': device_label(ua), 'at': _iso(),
                        'last': '', 'expires': _iso(time.time() + MAX_AGE)})
            _save(lst)
            return 'ok', token, tri
        state['fails'][ip] = (n + 1, now if n == 0 else at)
        state['wrong'][channel] = [t for t in state['wrong'][channel] if now - t < 3600] + [now]
        if len(state['wrong'][channel]) >= TRIES_HOUR:
            # ce canal fermé : ses codes ne valent plus pour lui (un code des deux canaux garde l'autre) ; un code neuf le rouvre
            state['closed'][channel] = True
            state['codes'] = {c: (t, at, tuple(x for x in ch if x != channel)) for c, (t, at, ch) in state['codes'].items() if ch != (channel,)}
            return 'closed', 0, ''
        return 'bad', 0, ''


def paired(token, channel):
    """L'appareil de ce jeton { id, channel, trigram, label } s'il est appairé sur ce canal et pas expiré ; None sinon.
    Dernier usage noté au plus une fois par heure."""
    if not isinstance(token, str) or not token or len(token) > 200:
        return None
    h = _hash(token)
    with _lock:
        lst = devices()
        for d in lst:
            if hmac.compare_digest(h, d['hash']):
                if d['channel'] != channel or d['expires'] < _iso():
                    return None
                if d['last'][:13] != _iso()[:13]:
                    d['last'] = _iso()
                    _save(lst)
                return {k: d[k] for k in ('id', 'channel', 'trigram', 'label')}
    return None


def forget(device_id=None, trigram=None, channel=None, every=False):
    """Révoque un appareil (son id), ceux d'un pilote (trigram), ceux d'un canal (channel), ou tous (every) ; rend le nombre
    retiré."""
    tri = str(trigram or '').upper()

    def gone(d):
        return every or (device_id and d['id'] == device_id) or (tri and d['trigram'] == tri) or (channel and d['channel'] == channel)
    with _lock:
        lst = devices()
        keep = [d for d in lst if not gone(d)]
        if len(keep) != len(lst):
            _save(keep)
        return len(lst) - len(keep)


def name(device_id, trigram):
    """Pose un trigramme sur un appareil appairé par un code de console (sa ligne n'en a pas) ; vrai si c'est fait."""
    tri = str(trigram or '').upper()
    if not TRIGRAM.fullmatch(tri):
        return False
    with _lock:
        lst = devices()
        for d in lst:
            if d['id'] == device_id and not d['trigram']:
                d['trigram'] = tri
                _save(lst)
                return True
    return False
