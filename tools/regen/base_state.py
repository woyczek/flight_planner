"""L'état de la base par zone et la mise à jour incrémentale (jeu « base » du lanceur ; V3 § 10.44, SOG-0071) — chargé par regen_jobs.load_verbs(). Bibliothèque standard seulement.

  · `base/status` { zones?: [identifiants], personal?: [sources] } : UN appel, l'état de chaque zone demandée (par défaut, celles que la base publie et celles que le poste a construites), avec la ou les RAISONS en code et paramètres
    (la page les dit dans les quatre langues : frame/aerodb/INTEGRATION.md « The state per zone »). Rend { ok, current, parserVersion, zones: { <zone>: { state, reason, reasons, buildable, builtCycle, expectedCycle, parserVersion } }, counts }.
    state : 'up-to-date' | 'stale' | 'never-built' | 'failed' ('building' est celui de la page : un travail en cours occupe le lanceur, ce verbe est alors refusé (409) et la page lit les zones du travail).
    reasons : [{ code, ... }] dans l'ordre d'importance : never-built, failed, pickup-waiting, source-newer, inputs-changed, parser-old, files-missing, source-old ; reason = le premier ; buildable : une construction changerait quelque chose
    (faux pour pickup-waiting et source-old : il faut d'abord un fichier plus récent, que la reprise ou le téléchargement apporte). Rien n'est écrit.
  · `base/update` { zones, personal?, fetch?: vrai } : « Mettre à jour » — télécharge (base/fetch : seulement ce qui a changé), lit l'état, construit SEULES les zones que l'état dit à reconstruire (jamais construites, en échec, source plus récente,
    entrées changées, parseur ancien, fichiers manquants), rend l'état d'après. Idempotent : rien n'a bougé → rien n'est construit. La reprise de Téléchargements n'est PAS faite ici (elle se montre puis se prend : base/pickup) : une zone qui
    l'attend est dite (`waiting`).
Ce que la construction a lu est gardé à part : data/local/build/<zone>.json (local au poste, jamais publié) : { zone, cycle, builtAt, parserVersion, personal, inputs: { nom: { size, mtime, sha256 } }, failed? } — de quoi dire « entrées changées »
sans rien deviner ; une zone construite avant ce fichier est jugée sur ses cycles, son parseur et ses fichiers seulement."""
import datetime
import hashlib
import json
import os
import re
import sys
import time
import types
import zipfile

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import aero_cycles  # noqa: E402
import regen_jobs  # noqa: E402
import zone_publish  # noqa: E402  (l'état de publication de chaque zone, SOG-0258)

RECORD_DIR = ('local', 'build')
ORDER = ('index-orphan', 'never-built', 'failed', 'pickup-waiting', 'source-newer', 'personal-undeclared', 'inputs-changed', 'source-unbuilt', 'parser-old', 'files-missing', 'source-unread', 'source-missing', 'source-old')
BUILDABLE = {'index-orphan', 'never-built', 'failed', 'source-newer', 'inputs-changed', 'source-unbuilt', 'parser-old', 'files-missing'}
POINT_SOURCES = ('sia', 'nats', 'enaire', 'airnav', 'dfs', 'lfv', 'faa', 'navpt')      # les sources dont la suite lit les points ou les voies aériennes (openAIP n'en porte pas)
MAX_ZONES = 60


def _ns(verb):
    """Les noms d'un autre jeu du lanceur (base.py, base_sources.py) : chargés par load_verbs, pas importables par leur nom."""
    entry = regen_jobs.REGISTRY.get(verb)
    return types.SimpleNamespace(**entry[0].__globals__) if entry else None


def parser_version():
    """La version du parseur que la page construit avec (frame/aerodb/catalogue.js › PARSER_VERSION) ; 0 si elle ne se lit pas."""
    try:
        with open(os.path.join(ROOT, 'frame', 'aerodb', 'catalogue.js'), encoding='utf-8') as f:
            m = re.search(r'const PARSER_VERSION = (\d+)', f.read())
        return int(m.group(1)) if m else 0
    except OSError:
        return 0


# ----------------------------------------------------------------------------------------------------------------------- ce que la construction a lu
def inputs_of(data, zone, personal):
    """Les fichiers de data/sia/ qui nourrissent une zone : { chemin relatif: chemin réel } — ceux que base.list_inputs voit et que la règle d'attribution (base_sources.file_source) donne à la zone ou à toutes (mora.csv) ; une source sous
    licence d'usage personnel (NATS, ENAIRE, AirNav) seulement si la case « personnel » la déclare."""
    B, S = _ns(('base', 'build')), _ns(('base', 'fetch'))
    out = {}
    for rel, path in B.list_inputs(data).items():
        z = S.attributed_zone(rel)
        fs = S.file_source(rel)
        if z not in (zone, '*') or (fs and fs['source'] in aero_cycles.PERSONAL_CYCLED and fs['source'] not in personal):
            continue
        out[rel] = path
    return out


def _sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def signature(paths, before=None):
    """{ nom: { size, mtime, sha256 } } des fichiers : l'empreinte n'est recalculée que si la taille ou la date a changé depuis `before` (la même empreinte sinon)."""
    out = {}
    for rel, path in sorted(paths.items()):
        try:
            st = os.stat(path)
        except OSError:
            continue
        old = (before or {}).get(rel)
        if old and old.get('size') == st.st_size and old.get('mtime') == st.st_mtime_ns and old.get('sha256'):
            out[rel] = old
            continue
        try:
            out[rel] = {'size': st.st_size, 'mtime': st.st_mtime_ns, 'sha256': _sha(path)}
        except OSError:
            continue
    return out


def _record_path(data, zone):
    return os.path.join(data, *RECORD_DIR, f'{zone}.json')


def read_record(data, zone):
    try:
        with open(_record_path(data, zone), encoding='utf-8') as f:
            rec = json.load(f)
        return rec if isinstance(rec, dict) and rec.get('zone') == zone else None
    except (OSError, ValueError):
        return None


def write_record(data, zone, **fields):
    """Garde ce que la construction de la zone a lu (ou son échec). Écrit d'un coup ; une erreur d'écriture n'arrête rien (l'état se jugera sans)."""
    path = _record_path(data, zone)
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + '.tmp', 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps({'zone': zone, **fields}, ensure_ascii=False, indent=1) + '\n')
        os.replace(path + '.tmp', path)
        return True
    except OSError:
        return False


def mark_failed(data, zone, error, at=None, message=''):
    """Garde l'échec de la dernière construction avec ce que la dernière réussie avait lu : la zone est dite « en échec » jusqu'à la prochaine réussie."""
    rec = {k: v for k, v in (read_record(data, zone) or {}).items() if k != 'zone'}
    return write_record(data, zone, **{**rec, 'failed': {'error': error, 'at': at or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), **({'message': str(message)[:300]} if message else {})}})


# ----------------------------------------------------------------------------------------------------------------------- l'état
def built_folders(data, zone):
    """Les cycles construits d'une zone (dossiers de data/sia/base/<zone>/ qui portent un meta.json), triés."""
    base = os.path.join(data, 'sia', 'base', zone)
    try:
        return sorted(n for n in os.listdir(base) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', n) and os.path.isfile(os.path.join(base, n, 'meta.json')))
    except OSError:
        return []


def _meta_version(path):
    try:
        with open(path, encoding='utf-8') as f:
            v = json.load(f).get('parserVersion')
        return v if isinstance(v, int) and not isinstance(v, bool) else None
    except (OSError, ValueError, AttributeError):
        return None


def waiting_pickups(data, zones, ctx, held):
    """Ce qui attend dans Téléchargements sans avoir été pris : { zone: [{ code: 'pickup-waiting', source, set?, cycle?, zip }] } (NATS : un jeu à la fois, comme base/pickup ; SIA : le zip dont le cycle dépasse celui que le poste détient)."""
    S = _ns(('base', 'fetch'))
    dirs = list((ctx.get('downloads') or (lambda: []))())
    out = {}
    if not dirs or S is None:
        return out
    gz = [z for z in zones if 'nats' in S.sources_of(z)]
    if gz:
        plan = S.pickup(S._Quiet(), {'zones': gz, 'dry': True, '_sets_only': True}, ctx)
        for z, v in (plan.get('zones') or {}).items():
            for s in v['sets']:
                if s['state'] == 'waiting':
                    out.setdefault(z, []).append({'code': 'pickup-waiting', 'source': 'nats', 'set': s['set'], 'cycle': s.get('cycle'), 'zip': s['zip']})
    if 'fr' in zones:
        zp = S._latest(dirs, S.PICKUP['sia']['zip'])
        if zp:
            try:
                with zipfile.ZipFile(zp) as zf:
                    cycles = [c[1] for i in regen_jobs.zip_check(zf) if not i.is_dir() and (c := aero_cycles.cycled(i.filename.replace('\\', '/').rsplit('/', 1)[-1]))]
            except (zipfile.BadZipFile, OSError, ValueError, regen_jobs.TooLarge):
                cycles = []
            if cycles and max(cycles) > ((held.get('sia') or {}).get('cycle') or ''):
                out.setdefault('fr', []).append({'code': 'pickup-waiting', 'source': 'sia', 'cycle': max(cycles), 'zip': os.path.basename(zp)})
    return out


def _declared(data, zone):
    """Le cycle que l'index de la base (sia/base/index.json) déclare pour la zone, ou None."""
    try:
        with open(os.path.join(data, 'sia', 'base', 'index.json'), encoding='utf-8') as f:
            e = ((json.load(f) or {}).get('zones') or {}).get(zone)
        c = e.get('cycle') if isinstance(e, dict) else None
        return c if isinstance(c, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', c) else None
    except (OSError, ValueError, AttributeError):
        return None


def _data_len(path):
    try:
        with open(path, encoding='utf-8') as f:
            d = (json.load(f) or {}).get('data')
        return len(d) if isinstance(d, (list, dict)) else None
    except (OSError, ValueError, AttributeError):
        return None


def download_times(data, inputs, S):
    """{ (zone, source): date (epoch) du plus récent fichier que le poste détient pour cette source de cette zone } : les fichiers de data/sia/ rangés par file_source ; lecture seule, sans réseau."""
    latest = {}
    for rel in inputs:
        fs = S.file_source(rel)
        if not fs:
            continue
        try:
            t = os.stat(os.path.join(data, 'sia', *str(rel).split('/'))).st_mtime
        except OSError:
            continue
        k = (fs['zone'], fs['source'])
        latest[k] = max(latest.get(k, 0), t)
    return latest


def download_state(zone, current, personal, latest, S, absent=frozenset()):
    """Les sources de la zone TÉLÉCHARGEABLES déjà présentes sur le poste (SOG-0180) : { done, cycle (le cycle AIRAC en vigueur), at (ISO UTC de la plus ancienne des dernières dates, None sans fichier), sources: { <id>: { present, at } } }. `done` : chaque source
    téléchargeable de la zone (ni déposée à la main, ni lue sur ce poste seulement ; ENAIRE seulement avec sa coche « personnel ») a un fichier écrit depuis le début du cycle en vigueur. Une zone sans source téléchargeable : done faux, sources vides."""
    names = [x for x in S.sources_of(zone) if S.SOURCES[x]['kind'] == 'download' and (x != 'enaire' or 'enaire' in personal)]
    if 'openaip' in names and ((zone, 'openaip') not in latest and (len(zone) != 2 or all(f'{zone}_{layer}' in absent for layer in ('asp', 'apt', 'nav', 'rpp')))):
        names.remove('openaip')                      # openAIP n'a aucun export de ce pays (ou la zone n'a pas de code de pays) : rien à attendre de lui, la zone n'en est pas « en retard »
    start = datetime.datetime.combine(datetime.date.fromisoformat(current), datetime.time(0, 0), datetime.timezone.utc).timestamp()
    iso = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    sources = {x: {'present': (zone, x) in latest, 'at': iso(latest[(zone, x)]) if (zone, x) in latest else None} for x in names}
    ats = [latest[(zone, x)] for x in names if (zone, x) in latest]
    return {'done': bool(names) and all((zone, x) in latest and latest[(zone, x)] >= start for x in names), 'cycle': current, 'at': iso(min(ats)) if ats else None, 'sources': sources}


def zone_states(data, zones, personal, ctx):
    """L'état des zones (voir l'en-tête) : { zone: { state, reason, reasons, buildable, builtCycle, expectedCycle, parserVersion } }."""
    B, S = _ns(('base', 'build')), _ns(('base', 'fetch'))
    today = ctx.get('today')
    current = aero_cycles.airac_start(today)
    inputs = B.list_inputs(data)
    sources = aero_cycles.report(inputs, today, root=os.path.join(data, 'sia'))
    used = aero_cycles.used_sources(sources, personal)
    parser = parser_version()
    wait = waiting_pickups(data, zones, ctx, sources)
    latest = download_times(data, inputs, S) if S else {}
    absent = S.absent_load(ctx, current) if S else frozenset()
    out = {}
    for z in zones:
        reasons, notices = [], []
        folders = built_folders(data, z)
        own = aero_cycles.zone_cycle(z, used)
        declared = _declared(data, z)
        if declared:
            gone = [k for k in ('meta', *B.KINDS) if not os.path.isfile(os.path.join(data, 'sia', 'base', z, declared, f'{k}.json'))]
            if gone:        # l'index annonce un cycle dont des fichiers manquent : l'appli dirait « aucune base installée » (SOG-0143)
                reasons.append({'code': 'index-orphan', 'cycle': declared, 'count': len(gone)})
        rec = read_record(data, z)
        built = folders[-1] if folders else None
        if not folders:
            if not reasons:
                reasons.append({'code': 'never-built'})
        else:
            if rec and rec.get('failed') and rec['failed'].get('at', '') >= (rec.get('builtAt') or ''):
                reasons.append({'code': 'failed', 'error': rec['failed'].get('error'), **({'message': rec['failed']['message']} if rec['failed'].get('message') else {})})
            if own and built < own:
                reasons.append({'code': 'source-newer', 'source': aero_cycles.ZONE_SOURCE[z], 'cycle': own, 'built': built})
            elif own and own < current:
                reasons.append({'code': 'source-old', 'source': aero_cycles.ZONE_SOURCE[z], 'cycle': own, 'current': current})
            feeding = set(S.sources_of(z)) if S else set(aero_cycles.PERSONAL_CYCLED)      # SOG-0260 : l'enregistrement garde les sources déclarées à la construction (liste globale) : seules celles qui NOURRISSENT la zone comptent
            undeclared = [x for x in aero_cycles.PERSONAL_CYCLED if rec and x in (rec.get('personal') or []) and x not in personal and x in feeding]
            for x in undeclared:                # SOG-0226 : construite avec une source sous licence personnelle que la case « personnel » ne déclare plus : le dit en code, pas par le nom d'un de ses fichiers
                reasons.append({'code': 'personal-undeclared', 'source': x})
            if rec and isinstance(rec.get('inputs'), dict) and not rec.get('failed'):
                now = signature(inputs_of(data, z, personal), rec['inputs'])
                changed = sorted({k for k in now if k not in rec['inputs'] or rec['inputs'][k].get('sha256') != now[k]['sha256']} | {k for k in rec['inputs'] if k not in now})
                changed = [k for k in changed if not ((fs := S.file_source(k)) and fs['source'] in undeclared)]        # les fichiers de la source non déclarée ne sont pas des « entrées changées » : c'est la raison ci-dessus
                if changed:
                    reasons.append({'code': 'inputs-changed', 'count': len(changed), 'names': changed[:3]})
            version = _meta_version(os.path.join(data, 'sia', 'base', z, built, 'meta.json'))
            if parser and (version is None or version < parser):
                reasons.append({'code': 'parser-old', 'built': version, 'current': parser})
            missing = [k for k in B.KINDS if not os.path.isfile(os.path.join(data, 'sia', 'base', z, built, f'{k}.json'))]
            if missing:
                reasons.append({'code': 'files-missing', 'count': len(missing)})
            elif _data_len(os.path.join(data, 'sia', 'base', z, built, 'points.json')) == 0 and _data_len(os.path.join(data, 'sia', 'base', z, built, 'airways.json')) == 0:
                # construite sans point ni voie : la zone a une source qui en porte (le fichier manque : à fournir) ou n'en a aucune (openAIP : la source ne les porte pas)
                giving = [s for s in S.sources_of(z) if s in POINT_SOURCES]
                if giving:
                    g = giving[0]
                    there = any((fs := S.file_source(rel)) and fs['source'] == g for rel in inputs)
                    if not there:
                        reasons.append({'code': 'source-missing', 'source': g})                    # le fichier de la source n'est pas sur le poste : à fournir
                    elif g in aero_cycles.PERSONAL_CYCLED and g not in personal:
                        reasons.append({'code': 'source-unread', 'source': g, 'why': 'personal'})   # le fichier est là, la case « personnel » ne le déclare pas : construit sans
                    else:
                        reasons.append({'code': 'source-unbuilt', 'source': g})                    # le fichier est là et lisible : la zone a été construite avant lui
                else:
                    notices.append({'code': 'no-points', 'source': 'openaip'})
        reasons += wait.get(z, [])
        reasons.sort(key=lambda r: ORDER.index(r['code']))
        first = reasons[0]['code'] if reasons else None
        state = 'up-to-date' if not reasons else 'never-built' if first == 'never-built' else 'failed' if first == 'failed' else 'stale'
        out[z] = {'state': state, 'reason': reasons[0] if reasons else None, 'reasons': reasons, 'notices': notices, 'buildable': any(r['code'] in BUILDABLE for r in reasons), 'builtCycle': built, 'builtAt': (rec or {}).get('builtAt'),
                  'expectedCycle': own or built, 'parserVersion': _meta_version(os.path.join(data, 'sia', 'base', z, built, 'meta.json')) if built else None,
                  'download': download_state(z, current, personal, latest, S, absent) if S else None}
    try:
        pub = zone_publish.states(data, list(out))      # SOG-0258 : publiée = le commit de construction est un ancêtre de la branche distante connue (quatre appels de git en tout, aucun réseau)
    except Exception:       # un état de publication qui échoue ne fait pas échouer l'état des zones
        pub = {}
    for z in out:
        out[z]['publish'] = pub.get(z)
    return out


def _zones_default(data):
    names = set()
    try:
        names |= {n for n in os.listdir(os.path.join(data, 'sia', 'base')) if os.path.isdir(os.path.join(data, 'sia', 'base', n))}
    except OSError:
        pass
    ids = set(_ids())
    return sorted(z for z in names if z in ids)


def _ids():
    B = _ns(('base', 'build'))
    return B.zone_ids() if B else []


def check_status(a):
    """Contrôle d'arguments (→ 400 si None) : { zones?: [identifiants connus, 1 à 60], personal?: [sources] } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'personal'}:
        return None
    out = {}
    if 'zones' in a:
        B = _ns(('base', 'build'))
        c = B.check({'zones': a['zones']}) if B else None
        if c is None:
            return None
        out['zones'] = c['zones']
    personal = a.get('personal', [])
    if not isinstance(personal, list) or len(personal) > 10 or any(not isinstance(p, str) or not re.fullmatch(r'[a-z0-9]{2,12}', p) for p in personal):
        return None
    out['personal'] = sorted(set(personal))
    return out


def status(job, args, ctx):
    data = ctx['data']
    zones = args.get('zones') or _zones_default(data)
    states = zone_states(data, zones, args.get('personal', []), ctx)
    counts = {}
    for v in states.values():
        counts[v['state']] = counts.get(v['state'], 0) + 1
    return {'ok': True, 'current': aero_cycles.airac_start(ctx.get('today')), 'parserVersion': parser_version(), 'zones': states, 'counts': counts,
            'excluded': [{'source': p, 'why': 'local-only', 'message': f'{p} : lu sur ce poste seulement'} for p in dict.fromkeys(args.get('personal') or []) if p in _ns(('base', 'build')).LOCAL_ONLY]}


# ----------------------------------------------------------------------------------------------------------------------- base/update
def check_update(a):
    """Contrôle d'arguments (→ 400 si None) : { zones: [identifiants connus, 1 à 60], personal?: [sources], fetch?: booléen (vrai par défaut) } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'personal', 'fetch'} or not isinstance(a.get('fetch', True), bool) or 'zones' not in a:
        return None
    c = check_status({k: a[k] for k in ('zones', 'personal') if k in a})
    return None if c is None else {**c, 'fetch': a.get('fetch', True)}


def update(job, args, ctx):
    data, personal, zones = ctx['data'], args['personal'], args['zones']
    S = _ns(('base', 'fetch'))
    res = {'ok': True, 'fetched': None, 'before': {}, 'built': [], 'failed': [], 'waiting': [], 'notBuildable': [], 'upToDate': [], 'after': {}, 'nothing': False}
    if args['fetch'] and S is not None and not job.cancelled():
        job.data['phase'] = 'fetch'
        fa = regen_jobs.REGISTRY[('base', 'fetch')][1]({'zones': zones, 'personal': personal})
        if fa is not None:
            f = regen_jobs.REGISTRY[('base', 'fetch')][0](job, fa, ctx)
            res['fetched'] = {'ok': f.get('ok'), 'fetched': f.get('fetched', []), 'unchanged': f.get('unchanged', []), 'failed': f.get('failed', []), 'manual': f.get('manual', [])}
    if job.cancelled():
        return {**res, 'ok': False, 'reason': 'cancelled'}
    job.data['phase'] = 'status'
    before = zone_states(data, zones, personal, ctx)
    res['before'] = before
    todo = [z for z in zones if before[z]['state'] != 'up-to-date' and before[z]['buildable']]
    res['upToDate'] = [z for z in zones if before[z]['state'] == 'up-to-date']
    res['waiting'] = [{'zone': z, 'reasons': [r for r in before[z]['reasons'] if r['code'] == 'pickup-waiting']} for z in zones if any(r['code'] == 'pickup-waiting' for r in before[z]['reasons'])]
    res['notBuildable'] = [z for z in zones if before[z]['state'] != 'up-to-date' and not before[z]['buildable']]
    if todo:
        job.data['phase'] = 'build'
        job.log(f'{len(todo)} zone(s) à construire sur {len(zones)} : {" ".join(todo)}')
        build, check = regen_jobs.REGISTRY[('base', 'build')]
        build = ctx.get('build') or build           # crochet des essais (jamais posé par le lanceur) : une construction sans navigateur
        b = build(job, check({'zones': todo, 'personal': personal}), ctx)
        res['built'] = b.get('built', [])
        res['failed'] = b.get('failed', [])
        res['build'] = {k: b[k] for k in ('ok', 'reason', 'cycle', 'cycles', 'folders', 'commits', 'seconds', 'message') if k in b}
        res['excluded'] = b.get('excluded') or []
        res['ok'] = bool(b.get('ok'))
        if b.get('reason'):
            res['reason'] = b['reason']
    else:
        res['nothing'] = True
        job.log('rien à construire : ' + (f'{len(res["upToDate"])} zone(s) à jour' if res['upToDate'] else 'aucune zone à jour') + (f', {len(res["waiting"])} attendent un fichier de Téléchargements' if res['waiting'] else ''))
    job.data['phase'] = 'done'
    res['after'] = zone_states(data, zones, personal, ctx)
    return res



# ----------------------------------------------------------------------------------------------------------------------- la raison d'un refus d'arguments (400), dans ses mots (SOG-0144)
ALLOWED = {'build': {'zones', 'personal'}, 'status': {'zones', 'personal'}, 'update': {'zones', 'personal', 'fetch'}, 'fetch': {'zones', 'personal'}, 'purge': {'zones', 'what', 'dry'}, 'pickup': {'zones', 'dry', 'zips', 'personal', 'build'}}


def explain(verb):
    """La fonction qui dit pourquoi les arguments d'un verbe du jeu « base » sont refusés : { reason (un code), message (en anglais, que la page traduit d'après le code et ses paramètres), ... paramètres } ; None si elle ne sait pas."""
    def why(a):
        B, S = _ns(('base', 'build')), _ns(('base', 'fetch'))
        if not isinstance(a, dict):
            return {'reason': 'not-an-object', 'message': 'the arguments are an object'}
        extra = sorted(set(a) - ALLOWED[verb])
        if extra:
            return {'reason': 'unknown-field', 'field': str(extra[0])[:40], 'message': f'unknown field: {str(extra[0])[:40]}'}
        if 'zones' in a or verb != 'status':
            zones = a.get('zones')
            if not isinstance(zones, list):
                return {'reason': 'zones-missing', 'message': 'zones: a list of zone identifiers is needed'}
            if not zones:
                return {'reason': 'no-zone', 'message': 'no zone given'}
            if len(zones) > MAX_ZONES:
                return {'reason': 'too-many-zones', 'max': MAX_ZONES, 'count': len(zones), 'message': f'{MAX_ZONES} zones at most per request, {len(zones)} given'}
            ids = set(B.zone_ids()) if B else set()
            seen = set()
            for z in zones:
                z = z.strip().lower() if isinstance(z, str) else z
                if not isinstance(z, str):
                    return {'reason': 'bad-zone', 'message': 'zones: identifiers are texts'}
                if z not in ids:
                    return {'reason': 'unknown-zone', 'zone': z[:12], 'message': f'unknown zone: {z[:12]}'}
                if z in seen:
                    return {'reason': 'duplicate-zone', 'zone': z, 'message': f'zone given twice: {z}'}
                seen.add(z)
        personal = a.get('personal', [])
        if verb in ('build', 'status', 'update', 'fetch', 'pickup'):
            personal = personal or []
            if not isinstance(personal, list) or len(personal) > 10:
                return {'reason': 'bad-source', 'message': 'personal: a list of 10 sources at most'}
            for p in personal:
                ok = isinstance(p, str) and re.fullmatch(r'[a-z0-9]{2,12}', p.strip().lower()) and (verb != 'fetch' or not S or p.strip().lower() in S.SOURCES)
                if not ok:
                    return {'reason': 'bad-source', 'source': str(p)[:20], 'message': f'source not admitted: {str(p)[:20]}'}
        if verb == 'update' and not isinstance(a.get('fetch', True), bool):
            return {'reason': 'bad-field', 'field': 'fetch', 'message': 'fetch: true or false'}
        if verb in ('purge', 'pickup') and not isinstance(a.get('dry', True), bool):
            return {'reason': 'bad-field', 'field': 'dry', 'message': 'dry: true or false'}
        if verb == 'purge' and (not isinstance(a.get('what', ['sources']), list) or any(w not in ('sources', 'caches') for w in a.get('what', []))):
            return {'reason': 'bad-field', 'field': 'what', 'message': 'what: sources and / or caches'}
        return None
    return why


EXPLAIN = {('base', v): explain(v) for v in ALLOWED}
VERBS = {('base', 'status'): (status, check_status), ('base', 'update'): (update, check_update)}
