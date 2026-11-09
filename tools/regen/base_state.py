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

RECORD_DIR = ('local', 'build')
ORDER = ('never-built', 'failed', 'pickup-waiting', 'source-newer', 'inputs-changed', 'parser-old', 'files-missing', 'source-old')
BUILDABLE = {'never-built', 'failed', 'source-newer', 'inputs-changed', 'parser-old', 'files-missing'}
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


def mark_failed(data, zone, error, at=None):
    """Garde l'échec de la dernière construction avec ce que la dernière réussie avait lu : la zone est dite « en échec » jusqu'à la prochaine réussie."""
    rec = {k: v for k, v in (read_record(data, zone) or {}).items() if k != 'zone'}
    return write_record(data, zone, **{**rec, 'failed': {'error': error, 'at': at or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}})


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
    out = {}
    for z in zones:
        reasons = []
        folders = built_folders(data, z)
        own = aero_cycles.zone_cycle(z, used)
        rec = read_record(data, z)
        built = folders[-1] if folders else None
        if not folders:
            reasons.append({'code': 'never-built'})
        else:
            if rec and rec.get('failed') and rec['failed'].get('at', '') >= (rec.get('builtAt') or ''):
                reasons.append({'code': 'failed', 'error': rec['failed'].get('error')})
            if own and built < own:
                reasons.append({'code': 'source-newer', 'source': aero_cycles.ZONE_SOURCE[z], 'cycle': own, 'built': built})
            elif own and own < current:
                reasons.append({'code': 'source-old', 'source': aero_cycles.ZONE_SOURCE[z], 'cycle': own, 'current': current})
            if rec and isinstance(rec.get('inputs'), dict) and not rec.get('failed'):
                now = signature(inputs_of(data, z, personal), rec['inputs'])
                changed = sorted({k for k in now if k not in rec['inputs'] or rec['inputs'][k].get('sha256') != now[k]['sha256']} | {k for k in rec['inputs'] if k not in now})
                if changed:
                    reasons.append({'code': 'inputs-changed', 'count': len(changed), 'names': changed[:3]})
            version = _meta_version(os.path.join(data, 'sia', 'base', z, built, 'meta.json'))
            if parser and (version is None or version < parser):
                reasons.append({'code': 'parser-old', 'built': version, 'current': parser})
            missing = [k for k in B.KINDS if not os.path.isfile(os.path.join(data, 'sia', 'base', z, built, f'{k}.json'))]
            if missing:
                reasons.append({'code': 'files-missing', 'count': len(missing)})
        reasons += wait.get(z, [])
        reasons.sort(key=lambda r: ORDER.index(r['code']))
        first = reasons[0]['code'] if reasons else None
        state = 'up-to-date' if not reasons else 'never-built' if first == 'never-built' else 'failed' if first == 'failed' else 'stale'
        out[z] = {'state': state, 'reason': reasons[0] if reasons else None, 'reasons': reasons, 'buildable': any(r['code'] in BUILDABLE for r in reasons), 'builtCycle': built,
                  'expectedCycle': own or built, 'parserVersion': _meta_version(os.path.join(data, 'sia', 'base', z, built, 'meta.json')) if built else None}
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
    return {'ok': True, 'current': aero_cycles.airac_start(ctx.get('today')), 'parserVersion': parser_version(), 'zones': states, 'counts': counts}


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
        res['ok'] = bool(b.get('ok'))
        if b.get('reason'):
            res['reason'] = b['reason']
    else:
        res['nothing'] = True
        job.log('rien à construire : ' + (f'{len(res["upToDate"])} zone(s) à jour' if res['upToDate'] else 'aucune zone à jour') + (f', {len(res["waiting"])} attendent un fichier de Téléchargements' if res['waiting'] else ''))
    job.data['phase'] = 'done'
    res['after'] = zone_states(data, zones, personal, ctx)
    return res


VERBS = {('base', 'status'): (status, check_status), ('base', 'update'): (update, check_update)}
