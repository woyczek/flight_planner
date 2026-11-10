"""Le jeu « ground » du lanceur : la couche sol d'un aérodrome, pistes de circulation, postes de stationnement et points d'attente d'OpenStreetMap (V3 § 10.40, SOG-0046 / lot AeroDB) — chargé par regen_jobs.load_verbs().

Un verbe, `ground/fetch` { icao, dry? }, au contrat des travaux de base (frame/INTEGRATION.md § 15) : UN terrain par appel, le geste du pilote depuis Données, jamais une liste, jamais depuis la page (Overpass
met ~30 s et le serveur est public : un appel par terrain, MIN_GAP 30 s entre deux départs).
  · `dry: true` : à blanc, le plan seulement (l'hôte et le fichier), aucun appel, rien d'écrit ;
  · sinon : UNE requête Overpass (overpass-api.de, adresse calculée ici, jamais prise de la page) sur la surface de l'aérodrome (le tag `icao`), les réponses compactées dans
    data/proc/ground/<OACI>.json = { icao, cycle (la date du jour), source: 'osm', attribution: '© OpenStreetMap contributors, ODbL',
    items: [{ id, kind: 'twy' | 'park' | 'hold' | 'apron', name, gate?: vrai (une porte), line: [[lon, lat]…] (twy, apron) | point: [lon, lat] (park, hold, apron : son centre) }] } et le manifeste proc/ground/index.json ({ aerodromes: { <OACI>: { cycle, twy, park, hold, bytes } } }),
    UN commit (regen_jobs.commit_outputs, au nom de l'auteur, sans push). Noms bornés à 16 signes (sans signe de commande), éléments bornés à 5 000, coordonnées arrondies à 1e-6 ; rien n'est écrit
    sans un seul élément (« no-data »). Licence : base dérivée sous ODbL, dépôt privé de la compagnie (décision de l'utilisateur du 6 nov. 2026) ; l'attribution est dans le fichier.
Résultat : { ok, icao, items: { twy, park, hold }, bytes, truncated, commit, warnings, file } ou { ok: False, reason: 'no-data' | 'failed' | 'cancelled', message? } ; ou, à blanc, { ok, dry, plan }."""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
from datetime import date, datetime, timezone

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs, download)

HOST = 'overpass-api.de'
URL = f'https://{HOST}/api/interpreter?data='
ATTRIBUTION = '© OpenStreetMap contributors, ODbL'
MAX_ITEMS = 5000
MAX_POINTS = 2000        # points d'une ligne
MAX_NAME = 16
MAX_BYTES = 40 * 1024 * 1024
KINDS = ('twy', 'park', 'hold', 'apron')      # apron : l'aire de trafic (SOG-0195 : « U, V, G, M »), son nom et son contour
MIN_GAP = {('ground', 'fetch'): 30}
ICAO = re.compile(r'[A-Z0-9]{4}')


def _download(url, timeout=120):
    """(statut, octets) d'une adresse calculée ici ; plafonnée, redirection vers un autre hôte refusée (regen_jobs.download)."""
    return regen_jobs.download(url, timeout, MAX_BYTES)


GET = _download  # remplacé par les essais : aucun appel réel dans la noreg
SLEEP = time.sleep   # idem : les essais ne dorment pas
RETRY_WAITS = (8, 20)   # SOG-0135 : un Overpass occupé (429, 502, 503, 504) ou injoignable est réessayé deux fois (8 s puis 20 s) avant de dire l'échec : un « rien » silencieux a été vu sur le poste de l'utilisateur
STATE_FILE = ('local', 'ground_state.json')   # le dernier résultat par terrain (data/local/ : jamais commité) : la page le relit pour dire « Sol non lu : <raison> », même après un rechargement
STATE_MAX = 300


def _get(job, url):
    """(statut, octets) d'Overpass, réessayé si le serveur est occupé ou injoignable ; l'exception d'un dernier essai est relevée telle quelle."""
    for n in range(len(RETRY_WAITS) + 1):
        try:
            status, body = GET(url)
        except (OSError, urllib.error.URLError) as e:
            if n >= len(RETRY_WAITS) or job.cancelled():
                raise
            status, body, why = 0, b'', type(e).__name__
        else:
            why = f'HTTP {status}'
        if status not in (0, 429, 502, 503, 504) or n >= len(RETRY_WAITS) or job.cancelled():
            return status, body
        job.log(f'Overpass : {why}, nouvel essai dans {RETRY_WAITS[n]} s')
        SLEEP(RETRY_WAITS[n])
    return status, body


def _remember(data, icao, result):
    """Garde le résultat d'un terrain dans data/local/ground_state.json : { at, ok, reason?, message? } ; ne lève jamais."""
    path = os.path.join(data, *STATE_FILE)
    try:
        try:
            with open(path, encoding='utf-8') as f:
                state = json.load(f)
            if not isinstance(state, dict) or not isinstance(state.get('aerodromes'), dict):
                raise ValueError
        except (OSError, ValueError):
            state = {'schema': 1, 'aerodromes': {}}
        entry = {'at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'ok': result.get('ok') is True}
        if not entry['ok']:
            entry['reason'] = str(result.get('reason') or 'failed')[:20]
            entry['message'] = str(result.get('message') or '')[:300]
        state['aerodromes'].pop(icao, None)
        state['aerodromes'][icao] = entry
        while len(state['aerodromes']) > STATE_MAX:
            state['aerodromes'].pop(next(iter(state['aerodromes'])))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + '.tmp', 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False)
        os.replace(path + '.tmp', path)
    except (OSError, TypeError, ValueError):
        pass


def state(job, args, ctx):
    """Verbe ground/state (lecture seule) : { ok, aerodromes: { <OACI>: { at, ok, reason?, message? } } } — le dernier résultat de ground/fetch par terrain."""
    try:
        with open(os.path.join(ctx['data'], *STATE_FILE), encoding='utf-8') as f:
            v = json.load(f)
        return {'ok': True, 'aerodromes': v.get('aerodromes') if isinstance(v, dict) and isinstance(v.get('aerodromes'), dict) else {}}
    except (OSError, ValueError):
        return {'ok': True, 'aerodromes': {}}


def check_state(a):
    return {} if a == {} or a is None else None


def query(icao):
    """La requête Overpass d'un terrain : les ways « taxiway », les postes et portes (ways et nœuds), les points d'attente, dans la surface de l'aérodrome qui porte ce code OACI."""
    return ('[out:json][timeout:90];'
            f'area["aeroway"="aerodrome"]["icao"="{icao}"]->.a;('
            'way["aeroway"="taxiway"](area.a);'
            'way["aeroway"="apron"](area.a);'
            'way["aeroway"~"^(parking_position|gate)$"](area.a);'
            'node["aeroway"~"^(parking_position|gate|holding_position)$"](area.a);'
            'way["aeroway"="holding_position"](area.a););out geom;')


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { icao: 4 caractères [A-Z0-9], dry?: booléen } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'icao', 'dry'} or not isinstance(a.get('icao'), str):
        return None
    icao = a['icao'].strip().upper()
    if not ICAO.fullmatch(icao) or ('dry' in a and not isinstance(a['dry'], bool)):
        return None
    return {'icao': icao, 'dry': a.get('dry') is True}


def _name(tags):
    """Le nom affiché : `ref` (« A », « 12 ») puis `name`, sans signe de commande, espaces réduits, 16 signes au plus ; '' sans nom."""
    for k in ('ref', 'name'):
        v = tags.get(k) if isinstance(tags, dict) else None
        if isinstance(v, str):
            v = re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', v)
            v = ' '.join(v.split())[:MAX_NAME].strip()
            if v:
                return v
    return ''


def _pt(lon, lat):
    """[lon, lat] arrondi à 1e-6, ou None hors du globe ou non fini."""
    try:
        lon, lat = float(lon), float(lat)
    except (TypeError, ValueError):
        return None
    if not (-180 <= lon <= 180 and -90 <= lat <= 90) or lon != lon or lat != lat:
        return None
    return [round(lon, 6), round(lat, 6)]


def _line(geometry):
    """Les points d'une géométrie Overpass (`out geom`), sans point invalide ni point répété à la suite ; au plus MAX_POINTS (un sur n au-delà)."""
    pts = []
    for g in geometry if isinstance(geometry, list) else []:
        p = _pt(g.get('lon'), g.get('lat')) if isinstance(g, dict) else None
        if p and (not pts or pts[-1] != p):
            pts.append(p)
    if len(pts) > MAX_POINTS:
        step = -(-len(pts) // MAX_POINTS)
        pts = pts[::step] + ([pts[-1]] if pts[-1] != pts[::step][-1] else [])
    return pts


def build(icao, response, cycle, warnings=None):
    """Le fichier d'un terrain d'après la réponse d'Overpass (`out geom`, JSON déjà lu) : { icao, cycle, source, attribution, items } ; items vide : rien à écrire. Un élément invalide est laissé de côté,
    sans arrêter les autres ; le même identifiant n'est gardé qu'une fois ; au plus MAX_ITEMS, les pistes de circulation d'abord. `warnings` : liste où dire ce qui a été laissé."""
    warnings = warnings if warnings is not None else []
    items, seen, skipped = [], set(), 0
    for el in response.get('elements', []) if isinstance(response, dict) else []:
        if not isinstance(el, dict) or el.get('type') not in ('way', 'node') or not isinstance(el.get('id'), int):
            skipped += 1
            continue
        tags = el.get('tags') if isinstance(el.get('tags'), dict) else {}
        aeroway = tags.get('aeroway')
        kind = 'twy' if aeroway == 'taxiway' else 'hold' if aeroway == 'holding_position' else 'apron' if aeroway == 'apron' else 'park' if aeroway in ('parking_position', 'gate') else None
        ident = ('w' if el['type'] == 'way' else 'n') + str(el['id'])
        if kind is None or ident in seen:
            skipped += 1
            continue
        item = {'id': ident, 'kind': kind, 'name': _name(tags)}
        if kind == 'park' and aeroway == 'gate':
            item['gate'] = True                            # une porte (pas un poste de stationnement) : le poste 12 d'une aire n'est pas la porte A12
        if el['type'] == 'node':
            p = _pt(el.get('lon'), el.get('lat'))
            if not p:
                skipped += 1
                continue
            item['point'] = p
        else:
            pts = _line(el.get('geometry'))
            if kind == 'twy':
                if len(pts) < 2:
                    skipped += 1
                    continue
                item['line'] = pts
            elif kind == 'apron':                          # une aire de trafic : son contour (au moins 3 sommets) et son centre, où poser son nom
                if len(pts) < 3:
                    skipped += 1
                    continue
                m = pts[:-1] if pts[0] == pts[-1] else pts
                item['line'] = pts
                item['point'] = [round(sum(p[0] for p in m) / len(m), 6), round(sum(p[1] for p in m) / len(m), 6)]
            elif pts:                                      # un poste ou un point d'attente dessiné en ligne ou en surface : un point (le milieu des sommets)
                m = pts[:-1] if len(pts) > 2 and pts[0] == pts[-1] else pts
                item['point'] = [round(sum(p[0] for p in m) / len(m), 6), round(sum(p[1] for p in m) / len(m), 6)]
            else:
                skipped += 1
                continue
        seen.add(ident)
        items.append(item)
    items.sort(key=lambda i: (KINDS.index(i['kind']), i['name'], i['id']))
    if skipped:
        warnings.append(f'{skipped} élément(s) laissé(s) de côté (type, identifiant ou géométrie non valides, doublon)')
    if len(items) > MAX_ITEMS:
        warnings.append(f'{len(items) - MAX_ITEMS} élément(s) au-delà de {MAX_ITEMS} non gardé(s)')
        items = items[:MAX_ITEMS]
    return {'icao': icao, 'cycle': cycle, 'source': 'osm', 'attribution': ATTRIBUTION, 'items': items}


def _write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.replace(tmp, path)


def fetch(job, args, ctx):
    """Verbe ground/fetch : voir l'en-tête ; le résultat de chaque lecture (réussie ou non, hors « à blanc ») est gardé dans data/local/ground_state.json."""
    try:
        result = _fetch(job, args, ctx)
    except Exception as e:      # jamais un échec muet : le travail l'aurait dit, et le fichier d'état aussi
        result = {'ok': False, 'reason': 'failed', 'message': regen_jobs.clean_error(f'{type(e).__name__}: {e}', ctx)[:300]}
    if not args.get('dry') and isinstance(result, dict):
        _remember(ctx['data'], args['icao'], result)
    return result


def _fetch(job, args, ctx):
    icao, data = args['icao'], ctx['data']
    if regen_jobs.merge_pending(ctx):
        return {'ok': False, 'reason': 'failed', 'message': 'a merge is pending in data/ (interrupted synchronisation): nothing installed; "Synchronise" settles it'}
    if args.get('dry'):
        return {'ok': True, 'dry': True, 'icao': icao, 'plan': {'host': HOST, 'calls': 1, 'file': f'proc/ground/{icao}.json'}}
    warnings = []
    try:
        job.step(f'{icao}: Overpass ({HOST}), une requête', 0, 1, 'requête')
        status, body = _get(job, URL + urllib.parse.quote(query(icao)))
        if job.cancelled():
            return {'ok': False, 'reason': 'cancelled'}
        if status != 200:
            return {'ok': False, 'reason': 'failed', 'message': f'Overpass answered HTTP {status}' + (' (busy: try again in a minute)' if status in (429, 504) else '')}
        job.step(f'{icao}: lecture de la réponse', 1, 1, 'requête')
        try:
            response = json.loads(body.decode('utf-8'))
        except ValueError:
            return {'ok': False, 'reason': 'failed', 'message': 'Overpass answer is not JSON'}
        doc = build(icao, response, date.today().isoformat(), warnings)
        if not doc['items']:
            return {'ok': False, 'reason': 'no-data', 'message': f'OpenStreetMap has no taxiway, stand or holding point inside the aerodrome area tagged icao={icao}', 'warnings': warnings}
        text = json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n'
        counts = {k: sum(1 for i in doc['items'] if i['kind'] == k) for k in KINDS}
        _write(os.path.join(data, 'proc', 'ground', f'{icao}.json'), text)
        index_path = os.path.join(data, 'proc', 'ground', 'index.json')
        try:
            with open(index_path, encoding='utf-8') as f:
                index = json.load(f)
            if not isinstance(index, dict) or not isinstance(index.get('aerodromes'), dict):
                raise ValueError
        except (OSError, ValueError):
            index = {'schema': 1, 'aerodromes': {}}
        index['aerodromes'][icao] = {'cycle': doc['cycle'], **counts, 'bytes': len(text.encode('utf-8'))}
        _write(index_path, json.dumps(index, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
    except (OSError, urllib.error.URLError, regen_jobs.TooLarge) as e:
        return {'ok': False, 'reason': 'failed', 'message': regen_jobs.clean_error(str(e), ctx)[:300]}
    done = regen_jobs.commit_outputs(ctx, getattr(job, 'author', ''), [f'proc/ground/{icao}.json', 'proc/ground/index.json'], f':world_map: Couche sol de {icao} (OpenStreetMap, ODbL) : {counts["twy"]} voies, {counts["park"]} postes, {counts["hold"]} points d\'attente')
    if done.get('warning'):
        warnings.append('git: ' + done['warning'])
    job.log(f'{icao}: {counts["twy"]} voie(s), {counts["park"]} poste(s), {counts["hold"]} point(s) d\'attente, {len(text.encode("utf-8"))} octets')
    return {'ok': True, 'icao': icao, 'items': counts, 'bytes': len(text.encode('utf-8')), 'truncated': any('au-delà' in w for w in warnings), 'commit': done.get('commit'), 'warnings': warnings[:50],
            'file': f'proc/ground/{icao}.json'}


VERBS = {('ground', 'fetch'): (fetch, check), ('ground', 'state'): (state, check_state)}
