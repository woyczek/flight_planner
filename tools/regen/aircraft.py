"""Le jeu « aircraft » du lanceur : types et performances des aéronefs (V3 § 10.34 A1, module Données) — chargé par regen_jobs.load_verbs().

Quatre verbes, au contrat de base/* (frame/INTEGRATION.md § 15, modules/data/SPEC.md § 5.5) :
  · `aircraft/fetch` { codes } : les sources des types (OACI Doc 8643), de leurs performances (EUROCONTROL APD) et des consommations (SimBrief) dans les
    caches du poste (AircraftDB/aircraft_http_cache.json, AircraftDB/icao_doc8643_cache/), jamais versionnés ; la base elle-même n'est pas touchée (le
    script écrit dans des copies jetées) ;
  · `aircraft/build` { codes } : AircraftDB/aircraft_db.js et aircraft_perf.js reconstruits depuis ces caches, sans réseau (la passe APD relit son cache
    HTTP ; un code jamais téléchargé y reste sans performances) ; ces fichiers du poste ne sont pas versionnés : c'est `aircraft/publish` qui les met
    dans le dépôt des données ;
  · `aircraft/purge` { dry } : les caches seulement, le plan d'abord (dry), jamais un fichier suivi par git ni la base ;
  · `aircraft/publish` { dry } : la base du poste publiée dans AircraftDB/ du dépôt des données (aircraft_publish du lanceur) : dry, le plan
    { remove, copy } ; sinon l'écriture, un commit au nom de l'auteur, puis une passe de synchronisation.
Codes : des désignateurs OACI (2 à 8 lettres ou chiffres) ; liste vide : les types de la flotte de la compagnie (airline/fleet.json).
Éléments de la vue : les étapes (types, apd, simbrief), chacune { state, error? } ; result { ok, codes, steps, failed: [{ item, error }], reason? }.
Le script tools/../AircraftDB/update_aircraft_db.py fait le travail (bibliothèque standard, réseau poli : pause entre requêtes) ; il tourne en
sous-processus, son journal ligne à ligne, l'annulation l'arrête."""
import json
import os
import re
import subprocess
import sys
import tempfile
import shutil

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : environnement réduit des sous-processus, règle commune des purges)
ADB = os.path.join(ROOT, 'AircraftDB')
SCRIPT = os.path.join(ADB, 'update_aircraft_db.py')
OUTPUTS = ('aircraft_db.js', 'aircraft_perf.js')
CACHES = ('aircraft_http_cache.json', 'icao_doc8643_cache')  # sous AircraftDB/ : ce que fetch remplit et que purge retire
CODE = re.compile(r'[A-Z0-9]{2,8}')
MAX_CODES = 200
STEPS = ('types', 'apd', 'simbrief')
MIN_GAP = {('aircraft', 'fetch'): 30}  # OACI, EUROCONTROL, SimBrief : pas deux départs coup sur coup


def check_codes(a):
    """{ codes: [désignateurs] } ; None si un code n'en est pas un (rien de deviné)."""
    codes = a.get('codes', [])
    if not isinstance(codes, list) or len(codes) > MAX_CODES:
        return None
    out = []
    for c in codes:
        if not isinstance(c, str) or not CODE.fullmatch(c.strip().upper()):
            return None
        out.append(c.strip().upper())
    return {'codes': sorted(set(out))}


def check_dry(a):
    return {'dry': a.get('dry', True) is not False}


def fleet_codes(data):
    """Les types de la flotte de la compagnie (airline/fleet.json : { aircraft: [{ type }] }), triés ; [] sans flotte lisible."""
    try:
        with open(os.path.join(data, 'airline', 'fleet.json'), encoding='utf-8') as f:
            doc = json.load(f)
    except (OSError, ValueError):
        return []
    lst = doc.get('aircraft') if isinstance(doc, dict) else None
    types = {str(x.get('type') or '').strip().upper() for x in lst or [] if isinstance(x, dict)}
    return sorted(c for c in types if CODE.fullmatch(c))[:MAX_CODES]


class _View:
    """Les éléments du travail à la racine de sa vue : job.data['steps'] = { étape: { state, error? } }."""

    def __init__(self, job):
        self.job = job
        job.data['steps'] = {s: {'state': 'waiting'} for s in STEPS}

    def set(self, step, **kw):
        self.job.data['steps'][step] = {**self.job.data['steps'][step], **kw}


def _run(job, cmd):
    """Le script en sous-processus, dans AircraftDB/ ; chaque ligne au journal ; l'annulation l'arrête. Rend le code de sortie (None : annulé)."""
    # environnement réduit (regen_jobs.child_env) : le script ne voit pas les identifiants du lanceur
    p = subprocess.Popen(cmd, cwd=ADB, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=regen_jobs.child_env(), text=True, encoding='utf-8',
                         errors='replace')
    try:
        for line in p.stdout:
            job.log(line.rstrip())
            if job.cancelled():
                p.terminate()
                return None
        return p.wait()
    finally:
        if p.poll() is None:
            p.kill()


def _commands(codes, db, perf, offline, data):
    """Les trois étapes : types (OACI Doc 8643), performances (EUROCONTROL APD), consommations (SimBrief) ; les corrections
    manuelles lues du dépôt des données servi (references/aircraft_overrides.json)."""
    py, net = sys.executable, ['--no-network'] if offline else []
    overrides = os.path.join(data, 'references', 'aircraft_overrides.json')
    return {'types': [py, SCRIPT, '--only', *codes, '--overrides', overrides, '--db', db, '--out', db, *net],
            'apd': [py, SCRIPT, '--apd', *codes, '--db', db, '--out', db, '--perf-out', perf],
            'simbrief': [py, SCRIPT, '--simbrief', '--perf-out', perf, *net]}


def _steps(job, args, ctx, offline):
    """fetch (offline faux) dans des copies jetées, build (offline vrai) sur la base du poste ; mêmes étapes, même vue."""
    if not os.path.isfile(SCRIPT):
        return {'ok': False, 'reason': 'no-script', 'message': 'AircraftDB/update_aircraft_db.py absent de cette installation'}
    codes = args['codes'] or fleet_codes(ctx['data'])
    if not codes:
        return {'ok': False, 'reason': 'no-codes', 'message': 'no codes given and no fleet to read them from'}
    view, failed, done = _View(job), [], []
    with tempfile.TemporaryDirectory(prefix='sog-aircraft-') as td:
        if offline:  # build : la base du poste elle-même
            db, perf = os.path.join(ADB, OUTPUTS[0]), os.path.join(ADB, OUTPUTS[1])
        else:  # fetch : des copies, jetées à la fin ; seuls les caches du script restent
            db, perf = os.path.join(td, OUTPUTS[0]), os.path.join(td, OUTPUTS[1])
            for src, dst in ((os.path.join(ADB, OUTPUTS[0]), db), (os.path.join(ADB, OUTPUTS[1]), perf)):
                if os.path.isfile(src):
                    shutil.copyfile(src, dst)
        cmds = _commands(codes, db, perf, offline, ctx['data'])
        for n, s in enumerate(STEPS):
            if job.cancelled():
                break
            job.step(s, n, len(STEPS), 'steps')
            view.set(s, state='running')
            code = _run(job, cmds[s])
            if code is None:
                view.set(s, state='cancelled')
                break
            if code:
                view.set(s, state='failed', error=f'exit-{code}')
                failed.append({'item': s, 'error': f'exit-{code}'})
            else:
                view.set(s, state='done')
                done.append(s)
        job.step('', len(done) + len(failed), len(STEPS), 'steps')
    reason = 'cancelled' if job.cancelled() else 'failed' if failed and not done else 'partial' if failed else None
    res = {'ok': reason is None, 'codes': codes, 'steps': done, 'failed': failed, 'commit': None}
    if reason:
        res['reason'] = reason
    return res


def fetch(job, args, ctx):
    """Verbe aircraft/fetch (voir l'en-tête du module)."""
    return _steps(job, args, ctx, offline=False)


def build(job, args, ctx):
    """Verbe aircraft/build (voir l'en-tête du module)."""
    return _steps(job, args, ctx, offline=True)


def _tracked(ctx, rels):
    """Chemins (relatifs au dossier de la suite) suivis par git : jamais retirés par une purge."""
    git = ctx.get('git_cmd')
    if not git:
        return set()
    p = subprocess.run(git('-C', ROOT, 'ls-files', '-z', '--', *rels), capture_output=True, env=regen_jobs.git_child_env(), timeout=60)
    if p.returncode:
        raise RuntimeError('git ls-files failed')
    return {x for x in p.stdout.decode('utf-8', 'replace').split('\0') if x}


def purge(job, args, ctx):
    """Verbe aircraft/purge : les caches du script (dry : ce qui partirait), jamais un fichier suivi ni la base."""
    dry, files, size, kept, removed = args['dry'], 0, 0, 0, []
    cands, refused = [], 0
    base = os.path.realpath(ADB)
    for c in CACHES:  # chaque chemin résolu sous AircraftDB/ (regen_jobs.inside : un lien ou une jonction vers ailleurs est refusé)
        full = os.path.join(ADB, c)
        if not os.path.lexists(full):
            continue
        if not regen_jobs.inside(full, base):
            refused += 1
        elif os.path.isfile(full):
            cands.append(full)
        elif os.path.isdir(full):
            fs, bad = regen_jobs.files_under(full, base)
            cands += fs
            refused += bad
    rels = [os.path.relpath(f, ROOT).replace(os.sep, '/') for f in cands]
    try:
        tracked = _tracked(ctx, rels) if rels else set()
    except (OSError, RuntimeError, subprocess.SubprocessError):  # on ne devine pas ce qui est suivi : rien n'est retiré
        return {'ok': False, 'reason': 'failed', 'message': 'git ls-files failed: nothing removed', 'removed': {}, 'warnings': []}
    job.step('purge', 0, len(cands), 'files')
    for n, (full, rel) in enumerate(zip(cands, rels)):
        if job.cancelled():
            break
        if rel in tracked:
            kept += 1
            continue
        if not regen_jobs.inside(full, base):  # revérifié juste avant le retrait
            refused += 1
            continue
        try:
            nb = os.lstat(full).st_size
            if not dry:
                os.remove(full)
        except OSError as e:
            job.log(f'{rel} non retiré ({e.__class__.__name__})')
            continue
        files += 1
        size += nb
        removed.append(rel)
        job.step('purge', n + 1, len(cands), 'files')
    top = os.path.join(ADB, CACHES[1])
    if not dry and not job.cancelled() and os.path.isdir(top) and regen_jobs.inside(top, base):
        regen_jobs.prune_empty(top, base)  # les dossiers vidés ; jamais au travers d'une jonction
    job.log(f"{'à retirer' if dry else 'retiré'} : {files} fichier(s), {size // 1024} Ko" + (f', {kept} suivi(s) par git gardé(s)' if kept else ''))
    res = {'ok': not job.cancelled(), 'dry': dry, 'removed': {'files': files, 'bytes': size},
           'warnings': ([{'code': 'kept-tracked', 'count': kept}] if kept else []) + ([{'code': 'unsafe-path', 'count': refused}] if refused else [])}
    if job.cancelled():
        res['reason'] = 'cancelled'
    return res


def publish(job, args, ctx):
    """Verbe aircraft/publish : dry, le plan { remove, copy } ; sinon la publication dans le dépôt des données, commit au nom de l'auteur, synchronisation."""
    fn = ctx.get('aircraft_publish')
    if not callable(fn):
        return {'ok': False, 'reason': 'unsupported', 'message': 'this launcher cannot publish the aircraft base'}
    if not args['dry'] and not job.author:
        return {'ok': False, 'reason': 'no-author', 'message': 'a trigram is needed to commit'}
    job.step('publish', 0, 1, 'steps')
    r = fn(job.author, not args['dry']) or {}
    job.step('publish', 1, 1, 'steps')
    res = {'ok': bool(r.get('ok')), 'dry': args['dry'], 'remove': r.get('remove') or [], 'copy': r.get('copy') or [],
           'message': str(r.get('message') or '')[:300]}
    if not res['ok']:
        res['reason'] = 'failed'
    return res


VERBS = {
    ('aircraft', 'fetch'): (fetch, check_codes),
    ('aircraft', 'build'): (build, check_codes),
    ('aircraft', 'purge'): (purge, check_dry),
    ('aircraft', 'publish'): (publish, check_dry),
}
