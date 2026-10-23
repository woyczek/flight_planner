"""Accès des appareils du réseau local au lanceur (V3 frame, lot 18 ; frame/SPEC.md § 3.10).

Sur option explicite (lancer.cmd --lan, ou Réglages › Accès du poste sur le poste lui-même), le lanceur écoute aussi sur
les adresses privées de ce poste (10/8, 172.16/12, 192.168/16 ; jamais 0.0.0.0 : ni VPN ni interface publique), même
port, jusqu'à sa fermeture. Un appareil du réseau local :
  · vient d'une adresse privée (sinon refusé) et nomme l'hôte exact (adresse:port ; un nom de domaine qui pointerait
    ici, « DNS rebinding », est refusé) ;
  · s'appaire une fois avec le code à 6 chiffres affiché dans la console et dans les Réglages du poste : il reçoit un
    jeton long (cookie HttpOnly, SameSite=Strict), dont seule l'empreinte est gardée ici (tools/.lan.json, local,
    jamais versionné) ; sans jeton, tout est refusé, fichiers de data/ compris (en http hors du poste, le navigateur
    n'envoie pas Sec-Fetch-Site : le cookie strict est ce qui écarte les autres sites) ;
  · 5 codes faux d'une même adresse : une minute d'attente ; 20 codes faux en tout : nouveau code.
Ce module tient l'état (code, essais, appareils) ; les serveurs et le contrôle de chaque requête sont dans launch.py.
Bibliothèque standard seulement."""
import datetime, hashlib, hmac, ipaddress, json, os, secrets, socket, threading, time

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.lan.json')
NETS = [ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')]
COOKIE = 'sog_lan'
MAX_AGE = 365 * 24 * 3600
TRIES_PER_IP = 5
LOCK_S = 60
TRIES_TOTAL = 20
# routes /__setup/ ouvertes à un appareil appairé : celles de l'appli Pilote (relevé du lanceur, arbre et lot
# d'écritures de data/, passage d'échange, relais réseau, position du simulateur, fiches Little Navmap en lecture) ;
# tout le reste (clés, clone, reprise, imports, maintenance, débrayage, réglage de cet accès) : ce poste seulement
ROUTES = {
    'GET': {'/__setup/status', '/__setup/changes', '/__setup/sim/position', '/__setup/lnmperf', '/__setup/lnmperf-folder'},
    'POST': {'/__setup/batch', '/__setup/sync', '/__setup/net'},
}

_lock = threading.Lock()
state = {'code': '', 'fails': {}, 'total': 0}
_devices = {'mtime': None, 'list': []}


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
    """Adresses IPv4 privées de ce poste ; celle de la route par défaut d'abord (l'adresse à montrer)."""
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
    """Nouveau code d'appairage (6 chiffres), essais remis à zéro."""
    with _lock:
        state['code'] = f'{secrets.randbelow(10 ** 6):06d}'
        state['fails'].clear()
        state['total'] = 0
        return state['code']


def clear_code():
    with _lock:
        state['code'] = ''


def devices():
    """Appareils appairés (empreintes de jeton, nom, date), relus si le fichier a changé."""
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


def attempt(ip, code, label=''):
    """Code saisi par un appareil : ('ok', jeton) ; ('wait', secondes) après trop d'essais de cette adresse ;
    ('bad', nouveau_code_ou_'') sinon (nouveau code posé après 20 essais faux en tout)."""
    now = time.monotonic()
    with _lock:
        n, at = state['fails'].get(ip, (0, now))
        if n >= TRIES_PER_IP and now - at < LOCK_S:
            return 'wait', int(LOCK_S - (now - at)) + 1
        if n >= TRIES_PER_IP:
            n = 0
        cur = state['code']
        if cur and isinstance(code, str) and hmac.compare_digest(code.strip(), cur):
            state['fails'].pop(ip, None)
            token = secrets.token_urlsafe(32)
            lst = devices()
            lst.append({'hash': _hash(token), 'label': str(label)[:120],
                        'at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')})
            _save(lst)
            return 'ok', token
        state['fails'][ip] = (n + 1, now)
        state['total'] += 1
        if state['total'] >= TRIES_TOTAL:
            state['code'] = f'{secrets.randbelow(10 ** 6):06d}'
            state['fails'].clear()
            state['total'] = 0
            return 'bad', state['code']
        return 'bad', ''


def forget():
    """Oublie tous les appareils appairés (chacun devra saisir un code de nouveau)."""
    with _lock:
        _save([])


def allowed_route(method, path):
    """Route /__setup/ ouverte à un appareil appairé (PUT : jamais)."""
    return path in ROUTES.get(method, set())
