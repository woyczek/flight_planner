"""Accès des appareils du réseau local au lanceur (V3 frame, lots 18 et 20 ; frame/SPEC.md § 3.10).

Sur option explicite (lancer.cmd --lan, ou Réglages › Accès du poste sur le poste lui-même), le lanceur écoute aussi sur
une adresse privée de ce poste (celle de la route par défaut ; les autres — VPN, WSL, Hyper-V, Docker — seulement sur
demande ; jamais 0.0.0.0), même port, jusqu'à sa fermeture. Un appareil du réseau local :
  · vient d'une adresse privée (sinon refusé) et nomme l'hôte exact (adresse:port ; un nom de domaine qui pointerait
    ici, « DNS rebinding », est refusé) ;
  · s'appaire une fois avec le code à 6 chiffres affiché dans la console et dans les Réglages du poste : il reçoit un
    jeton long (cookie sog_lan_<port>, HttpOnly, SameSite=Strict), dont seule l'empreinte est gardée ici
    (tools/.lan.json, local, jamais versionné) ; sans jeton, tout est refusé, fichiers de data/ compris ;
  · un code sert une fois et dure 10 minutes : après un appairage réussi ou passé ce délai, plus de code tant que le
    poste n'en demande pas un nouveau ;
  · 5 codes faux d'une même adresse : une minute d'attente ; 30 codes faux en une heure : appairage fermé jusqu'au
    prochain « Nouveau code » demandé depuis le poste.
Ce module tient l'état (code, essais, appareils) ; les serveurs et le contrôle de chaque requête sont dans launch.py.
Bibliothèque standard seulement."""
import datetime, hashlib, hmac, ipaddress, json, os, re, secrets, socket, threading, time

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.lan.json')
NETS = [ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')]
MAX_AGE = 365 * 24 * 3600
CODE_TTL = 600  # durée d'un code (s)
TRIES_PER_IP = 5
LOCK_S = 60
TRIES_HOUR = 30  # codes faux en une heure, toutes adresses : appairage fermé
# routes /__setup/ ouvertes à un appareil appairé : celles de l'appli Pilote (relevé du lanceur, arbre et lot
# d'écritures de data/, passage d'échange, relais réseau, position du simulateur, fiches Little Navmap en lecture) ;
# tout le reste (clés, clone, reprise, imports, maintenance, débrayage, réglage de cet accès) : ce poste seulement
ROUTES = {
    'GET': {'/__setup/status', '/__setup/changes', '/__setup/sim/position', '/__setup/lnmperf', '/__setup/lnmperf-folder'},
    'POST': {'/__setup/batch', '/__setup/sync', '/__setup/net'},
}

_lock = threading.Lock()
state = {'code': '', 'issued': 0.0, 'closed': False, 'fails': {}, 'wrong': []}
_devices = {'mtime': None, 'list': []}


def cookie_name(port):
    """Nom du cookie d'appairage : propre au port (deux lanceurs sur le même poste ne partagent pas leurs appareils)."""
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


def new_code():
    """Nouveau code d'appairage (6 chiffres, 10 minutes) ; rouvre l'appairage fermé après trop d'essais."""
    with _lock:
        state.update(code=f'{secrets.randbelow(10 ** 6):06d}', issued=time.monotonic(), closed=False, wrong=[])
        state['fails'].clear()
        return state['code']


def clear_code():
    with _lock:
        state.update(code='', issued=0.0)


def code_state():
    """{ code, expires (s) } du code en cours, { closed } si l'appairage est fermé, sinon {} (pas de code en cours)."""
    with _lock:
        if state['closed']:
            return {'closed': True}
        left = CODE_TTL - (time.monotonic() - state['issued'])
        if not state['code'] or left <= 0:
            return {}
        return {'code': state['code'], 'expires': int(left)}


def device_label(ua):
    """Nom court d'un appareil d'après son navigateur (« Android · Chrome », « iPad · Safari »…)."""
    ua = str(ua or '')
    osn = next((n for k, n in (('iPad', 'iPad'), ('iPhone', 'iPhone'), ('Android', 'Android'), ('Windows', 'Windows'),
                               ('Mac OS X', 'Mac'), ('CrOS', 'ChromeOS'), ('Linux', 'Linux')) if k in ua), '?')
    br = next((n for k, n in (('Edg/', 'Edge'), ('OPR/', 'Opera'), ('Firefox/', 'Firefox'), ('FxiOS', 'Firefox'),
                              ('CriOS', 'Chrome'), ('Chrome/', 'Chrome'), ('Safari/', 'Safari')) if k in ua), '?')
    return f'{osn} · {br}'


def devices():
    """Appareils appairés (empreinte de jeton, nom, date), relus si le fichier a changé."""
    try:
        m = os.path.getmtime(FILE)
    except OSError:
        m = None
    if m != _devices['mtime']:
        try:
            with open(FILE, encoding='utf-8') as f:
                d = json.load(f)
            lst = [x for x in d.get('devices', []) if isinstance(x, dict) and isinstance(x.get('hash'), str)]
        except (OSError, ValueError, AttributeError):
            lst = []
        _devices.update(mtime=m, list=lst)
    return list(_devices['list'])


def listing():
    """Appareils appairés pour les Réglages du poste : { id (début de l'empreinte), label, at } ; jamais l'empreinte."""
    return [{'id': d['hash'][:12], 'label': d.get('label') or '?', 'at': d.get('at') or ''} for d in devices()]


def _save(lst):
    tmp = FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump({'devices': lst}, f, ensure_ascii=False, indent=1)
    os.replace(tmp, FILE)
    _devices['mtime'] = None


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def paired(token):
    """Vrai si ce jeton (cookie) est celui d'un appareil appairé."""
    if not token or len(token) > 200:
        return False
    h = _hash(token)
    return any(hmac.compare_digest(h, d['hash']) for d in devices())


def attempt(ip, code, ua=''):
    """Code saisi par un appareil : ('ok', jeton) ; ('wait', secondes) après 5 essais faux de cette adresse en une
    minute ; ('closed', 0) appairage fermé (30 essais faux en une heure) ; ('expired', 0) pas de code en cours ;
    ('bad', 0) code faux."""
    now = time.monotonic()
    with _lock:
        if state['closed']:
            return 'closed', 0
        n, at = state['fails'].get(ip, (0, now))
        if n >= TRIES_PER_IP and now - at < LOCK_S:
            return 'wait', int(LOCK_S - (now - at)) + 1
        if n >= TRIES_PER_IP:
            n = 0
        cur = state['code'] if now - state['issued'] < CODE_TTL else ''
        if not cur:
            return 'expired', 0
        if isinstance(code, str) and re.fullmatch(r'\d{6}', code.strip()) and hmac.compare_digest(code.strip(), cur):
            state['fails'].pop(ip, None)
            state.update(code='', issued=0.0)  # un code ne sert qu'une fois
            token = secrets.token_urlsafe(32)
            lst = devices()
            lst.append({'hash': _hash(token), 'label': device_label(ua),
                        'at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')})
            _save(lst)
            return 'ok', token
        state['fails'][ip] = (n + 1, now if n == 0 else at)
        state['wrong'] = [t for t in state['wrong'] if now - t < 3600] + [now]
        if len(state['wrong']) >= TRIES_HOUR:
            state.update(closed=True, code='', issued=0.0)
            return 'closed', 0
        return 'bad', 0


def forget(device=None):
    """Oublie un appareil (son id, début de l'empreinte) ou tous (None) : il devra saisir un code de nouveau."""
    with _lock:
        _save([] if device is None else [d for d in devices() if not d['hash'].startswith(str(device)) or len(str(device)) < 8])


def allowed_route(method, path):
    """Route /__setup/ ouverte à un appareil appairé (PUT : jamais)."""
    return path in ROUTES.get(method, set())
