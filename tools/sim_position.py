"""Position du simulateur de vol de ce poste (V3 frame, service de position réelle : source « sim », frame/SPEC.md § 3.2).

Route du lanceur GET /__setup/sim/position ; interroge, dans l'ordre :
  1. l'API web de X-Plane 12 (12.1.1 et plus ; port 8086 par défaut) : id des datarefs résolus une fois par nom
     (/api/v2/datarefs?filter[name]=…, puis de nouveau si X-Plane a redémarré : id inconnu), valeurs lues une à une
     (/api/v2/datarefs/<id>/value) ; liste vide ou position 0° / 0° tant qu'aucun vol n'est chargé : pas de position ;
  2. l'API web de Little Navmap (son serveur web lancé ; port 8965 par défaut) : /api/sim/info, « active » faux sans
     simulateur relié.
Rend { lat, lon, altFt, trackDeg, gsKt, source: 'xplane' | 'lnm', at } ou None (aucun simulateur).
  · jamais d'appel hors de ce poste : l'hôte est la boucle locale, seuls les ports se règlent (tools/.sim.json, local,
    jamais versionné : { "xplane": 8086, "lnm": 8965 }) ;
  · au plus un passage par seconde : un appel plus rapproché reçoit le résultat du précédent ;
  · les deux simulateurs interrogés en parallèle, 0,8 s au plus chacun (sous Windows, un port fermé de la boucle locale
    ne répond « refusé » qu'après 2 s) ; X-Plane l'emporte s'il répond ; un simulateur qui n'a pas répondu du tout
    (port fermé) n'est réinterrogé que 10 s plus tard.
Bibliothèque standard seulement."""
import datetime, json, os, threading, time, urllib.error, urllib.parse, urllib.request

CONF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.sim.json')
PORTS = {'xplane': 8086, 'lnm': 8965}
HOSTS = ('127.0.0.1', '[::1]')  # boucle locale seulement : IPv4, puis IPv6 si le simulateur n'écoute que là
TIMEOUT = 0.8
MIN_GAP = 1.0
DOWN_GAP = 10.0
# datarefs de X-Plane : degrés, mètres au-dessus de la mer, route vraie (hpath) et cap vrai (true_psi), m/s
DATAREFS = {
    'lat': 'sim/flightmodel/position/latitude',
    'lon': 'sim/flightmodel/position/longitude',
    'elev': 'sim/flightmodel/position/elevation',
    'hpath': 'sim/flightmodel/position/hpath',
    'psi': 'sim/flightmodel/position/true_psi',
    'gs': 'sim/flightmodel/position/groundspeed',
}

_lock = threading.Lock()
_last = [0.0, None]  # heure du dernier passage, son résultat
_ids = {}  # port de X-Plane -> {clé: id} (les id changent à chaque démarrage de X-Plane)
_host = {}  # port -> hôte de la boucle locale qui a répondu
_down = {}  # simulateur -> heure où il n'a pas répondu (port fermé)


def ports():
    """Ports réglés (tools/.sim.json), sinon ceux par défaut ; une valeur illisible garde le défaut."""
    out = dict(PORTS)
    try:
        with open(CONF, encoding='utf-8') as f:
            conf = json.load(f)
        for k in PORTS:
            v = conf.get(k) if isinstance(conf, dict) else None
            if isinstance(v, int) and 0 < v < 65536:
                out[k] = v
    except (OSError, ValueError):
        pass
    return out


def _get(port, path):
    """JSON d'une adresse de la boucle locale (hôte qui a déjà répondu d'abord) ; exception si aucun ne répond."""
    hosts = sorted(HOSTS, key=lambda h: h != _host.get(port))
    err = None
    for h in hosts:
        try:
            req = urllib.request.Request(f'http://{h}:{port}{path}', headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                _host[port] = h
                return json.loads(r.read().decode('utf-8') or 'null')
        except urllib.error.HTTPError:
            _host[port] = h
            raise  # le simulateur répond : l'erreur est la sienne
        except (OSError, ValueError) as e:
            err = e
    raise err or OSError('injoignable')


def _num(v):
    """Nombre fini (une valeur de tableau : son premier élément), sinon None."""
    if isinstance(v, list):
        v = v[0] if v else None
    return float(v) if isinstance(v, (int, float)) and v == v and abs(v) != float('inf') else None


def xplane(port):
    """Position de X-Plane 12 (API web, v2) ; None sans vol chargé ou sans X-Plane."""
    for attempt in (0, 1):
        ids = _ids.get(port)
        if not ids:
            q = '&'.join('filter[name]=' + urllib.parse.quote(n, safe='/') for n in DATAREFS.values()) + '&fields=id,name'
            try:
                rows = (_get(port, '/api/v2/datarefs?' + q) or {}).get('data') or []
            except urllib.error.HTTPError:
                return None  # 404 : datarefs inconnus tant qu'aucun vol n'est chargé ; 403 : trafic entrant coupé
            by = {r.get('name'): r.get('id') for r in rows if isinstance(r, dict)}
            ids = {k: by[n] for k, n in DATAREFS.items() if by.get(n) is not None}
            if 'lat' not in ids or 'lon' not in ids:
                return None
            _ids[port] = ids
        try:
            v = {k: _num((_get(port, f'/api/v2/datarefs/{i}/value') or {}).get('data')) for k, i in ids.items()}
        except urllib.error.HTTPError:
            _ids.pop(port, None)  # X-Plane redémarré : id à résoudre de nouveau, une fois
            continue
        lat, lon = v.get('lat'), v.get('lon')
        if lat is None or lon is None or (abs(lat) < .01 and abs(lon) < .01):
            return None
        gs = v.get('gs')
        # route vraie en mouvement ; à l'arrêt (moins de 1 m/s) elle n'a pas de sens : le cap vrai
        track = v.get('hpath') if gs is not None and gs >= 1 and v.get('hpath') is not None else v.get('psi')
        return {
            'lat': lat, 'lon': lon,
            'altFt': None if v.get('elev') is None else round(v['elev'] / 0.3048),
            'trackDeg': None if track is None else round(track) % 360,
            'gsKt': None if gs is None else round(gs * 1.943844),
            'source': 'xplane',
        }
    return None


def lnm(port):
    """Position du simulateur relié à Little Navmap (API web : /api/sim/info) ; None s'il n'y en a pas."""
    try:
        d = _get(port, '/api/sim/info') or {}
    except urllib.error.HTTPError:
        return None
    p = d.get('position') if isinstance(d, dict) and d.get('active') else None
    lat, lon = _num((p or {}).get('lat')), _num((p or {}).get('lon'))
    if lat is None or lon is None or (abs(lat) < .01 and abs(lon) < .01):
        return None
    alt, gs, hdg = _num(d.get('indicated_altitude')), _num(d.get('ground_speed')), _num(d.get('heading'))
    return {
        'lat': lat, 'lon': lon,
        'altFt': None if alt is None else round(alt),
        'trackDeg': None if hdg is None else round(hdg) % 360,  # cap magnétique : Little Navmap ne donne pas la route
        'gsKt': None if gs is None else round(gs),
        'source': 'lnm',
    }


def position():
    """Position du simulateur de ce poste, ou None ; au plus un passage par seconde."""
    with _lock:
        now = time.monotonic()
        if now - _last[0] < MIN_GAP:
            return _last[1]
        p = ports()
        got = {}

        def ask(name, fn):
            try:
                got[name] = fn(p[name])
                _down.pop(name, None)
            except Exception as e:  # port fermé, réponse illisible ou inattendue : pas de position de lui
                got[name] = None
                if isinstance(e, OSError) and not isinstance(e, urllib.error.HTTPError):
                    _down[name] = time.monotonic()

        asked = [a for a in (('xplane', xplane), ('lnm', lnm)) if now - _down.get(a[0], -DOWN_GAP) >= DOWN_GAP]
        threads = [threading.Thread(target=ask, args=a, daemon=True) for a in asked]
        for th in threads:
            th.start()
        for th in threads:
            th.join(3 * TIMEOUT + 2)
        fix = got.get('xplane') or got.get('lnm')
        if fix:
            fix = {**fix, 'at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')}
        _last[0], _last[1] = time.monotonic(), fix
        return fix
