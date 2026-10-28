"""Travaux longs du lanceur pour le module Données (V3, frame/INTEGRATION.md § 15) — bibliothèque standard seulement.

Socle commun à toutes les opérations de régénération (lot D0 ; les verbes des constructeurs arrivent avec eux, lot D2) :
  * un travail à la fois, dans un fil ; état { id, set, verb, state ('running' | 'done' | 'error' | 'cancelled'), step,
    done, total, unit, log (200 dernières lignes), result, started, ended } ; le dernier reste lisible (page rechargée) ;
  * les verbes viennent d'une liste fixe (REGISTRY : (jeu, verbe) → fonction, contrôle des arguments) : rien de la page
    n'est un chemin, une adresse ou une commande ;
  * annulation demandée (Job.cancelled) : la fonction la regarde entre ses étapes ;
  * l'état du poste (state()) : sorties locales (fichiers, octets, plus récent, cycles), caches des sources téléchargées,
    commits de sortie pas encore poussés, pypdf importable, place libre, identifiants EAD présents (oui / non, jamais les
    valeurs).
Routes (tools/launch.py, ce poste seulement : refusées à un appareil du réseau local) : GET /__setup/regen/state,
POST /__setup/regen/job { set, verb, args } → { job }, GET /__setup/regen/job[?id=], POST /__setup/regen/job/cancel { id }.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid

# sorties publiées (chemins de data/) et sorties locales jamais publiées ; caches des sources : data/sia/<source>/
OUTPUTS = ('sia/base/', 'proc/', 'sia/vfr/', 'AircraftDB/', 'sia/mora.csv')
LOCAL = 'local/'
CACHE_ROOT = 'sia/'
NOT_CACHES = {'base', 'vfr'}  # sous sia/ : des sorties, pas des caches de sources
CYCLE = re.compile(r'^\d{4}(-\d{2}-\d{2})?$')
LOG_MAX = 200


def _walk(root, cancelled=None):
    """{ files, bytes, newest (s), cycles: [noms de dossiers en forme de cycle] } d'un dossier ou d'un fichier."""
    out = {'files': 0, 'bytes': 0, 'newest': 0, 'cycles': set()}
    if os.path.isfile(root):
        st = os.stat(root)
        return {'files': 1, 'bytes': st.st_size, 'newest': int(st.st_mtime), 'cycles': []}
    for d, dirs, files in os.walk(root):
        if cancelled and cancelled():
            break
        dirs[:] = [x for x in dirs if not x.startswith('.') and not os.path.islink(os.path.join(d, x))]
        out['cycles'].update(x for x in dirs if CYCLE.match(x))
        for f in files:
            if f.startswith('.'):
                continue
            try:
                st = os.stat(os.path.join(d, f))
            except OSError:
                continue
            out['files'] += 1
            out['bytes'] += st.st_size
            out['newest'] = max(out['newest'], int(st.st_mtime))
    out['cycles'] = sorted(out['cycles'])
    return out


def _unpushed(data, git_cmd, git_env):
    """Commits de data/ pas encore poussés qui touchent les sorties : { commits, files } ; None sans git ni amont."""
    if not git_cmd or not os.path.isdir(os.path.join(data, '.git')):
        return None
    try:
        p = subprocess.run(git_cmd('-C', data, 'log', '@{u}..HEAD', '--name-only', '--format=%x00%H', '--', *OUTPUTS),
                           capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=20, env=git_env())
    except (OSError, subprocess.TimeoutExpired):
        return None
    if p.returncode != 0:
        return None
    commits = [c for c in p.stdout.split('\x00') if c.strip()]
    files = {f.strip() for c in commits for f in c.strip().split('\n')[1:] if f.strip()}
    return {'commits': len(commits), 'files': len(files)}


def state(data, secrets, git_cmd=None, git_env=dict, step=None, cancelled=None):
    """État du poste pour l'écran Données (jamais une valeur secrète). step(text, done, total) au fil du relevé."""
    roots = [*OUTPUTS, LOCAL]
    caches = []
    try:
        caches = sorted(x for x in os.listdir(os.path.join(data, CACHE_ROOT))
                        if x not in NOT_CACHES and not x.startswith('.') and os.path.isdir(os.path.join(data, CACHE_ROOT, x)))
    except OSError:
        pass
    total = len(roots) + len(caches) + 1
    out = {'outputs': {}, 'local': None, 'caches': {}}
    n = 0
    for r in roots:
        if cancelled and cancelled():
            return None
        n += 1
        if step:
            step(r, n, total)
        p = os.path.join(data, *r.strip('/').split('/'))
        v = _walk(p, cancelled) if os.path.exists(p) else None
        if r == LOCAL:
            out['local'] = v
        else:
            out['outputs'][r] = v
    for c in caches:
        if cancelled and cancelled():
            return None
        n += 1
        if step:
            step(f'{CACHE_ROOT}{c}/', n, total)
        out['caches'][c] = _walk(os.path.join(data, CACHE_ROOT, c), cancelled)
    if step:
        step('git', total, total)
    out['unpushed'] = _unpushed(data, git_cmd, git_env)
    try:
        free = shutil.disk_usage(data).free
    except OSError:
        free = None
    out['tools'] = {'pypdf': importlib.util.find_spec('pypdf') is not None, 'freeBytes': free}
    out['ead'] = os.path.isfile(os.path.join(secrets, 'ead.json'))  # présence seulement, jamais le contenu
    out['at'] = int(time.time())
    return out


class Job:
    """Un travail : son état lisible par la page, ses aides (étape, journal) et l'annulation demandée."""

    def __init__(self, set_, verb, args):
        self.id = uuid.uuid4().hex[:12]
        self.data = {'id': self.id, 'set': set_, 'verb': verb, 'args': args, 'state': 'running', 'step': '', 'done': 0,
                     'total': 0, 'unit': '', 'log': [], 'result': None, 'started': int(time.time()), 'ended': None}
        self._cancel = threading.Event()

    def step(self, text, done=None, total=None, unit=None):
        self.data['step'] = str(text)[:200]
        if done is not None:
            self.data['done'] = done
        if total is not None:
            self.data['total'] = total
        if unit is not None:
            self.data['unit'] = unit

    def log(self, line):
        lg = self.data['log']
        lg.append(str(line)[:500])
        del lg[:-LOG_MAX]

    def cancelled(self):
        return self._cancel.is_set()

    def view(self):
        return {**self.data, 'log': list(self.data['log'])}


class Jobs:
    """Un travail à la fois ; REGISTRY : (jeu, verbe) → (fonction(job, args, ctx) → résultat, contrôle(args) → args | None)."""

    def __init__(self, registry, ctx=None):
        self.registry = dict(registry)
        self.ctx = ctx or {}
        self.lock = threading.Lock()
        self.cur = None

    def start(self, set_, verb, args):
        key = (str(set_ or ''), str(verb or ''))
        if key not in self.registry:
            return {'ok': False, 'status': 400, 'message': f'unknown operation {key[0]}/{key[1]}'}
        fn, check = self.registry[key]
        a = check(args if isinstance(args, dict) else {})
        if a is None:
            return {'ok': False, 'status': 400, 'message': 'invalid arguments'}
        with self.lock:
            if self.cur and self.cur.data['state'] == 'running':
                return {'ok': False, 'status': 409, 'message': 'a job is already running', 'job': self.cur.id}
            job = self.cur = Job(*key, a)
        threading.Thread(target=self._run, args=(job, fn, a), daemon=True).start()
        return {'ok': True, 'job': job.id}

    def _run(self, job, fn, a):
        try:
            res = fn(job, a, self.ctx)
            job.data['state'] = 'cancelled' if job.cancelled() else 'done'
            job.data['result'] = res
        except Exception as e:  # le travail s'arrête, le lanceur continue : l'erreur est dite à la page
            job.log(f'error: {e}')
            job.data['state'] = 'error'
            job.data['result'] = {'message': str(e)[:300]}
        job.data['ended'] = int(time.time())

    def view(self, id_=None):
        """Le travail id_ ({ ok: False, status: 410 } s'il n'est plus là) ; sans id_, le courant ou le dernier."""
        with self.lock:
            j = self.cur
        if id_:
            return j.view() if j and j.id == id_ else {'ok': False, 'status': 410, 'message': 'no such job'}
        return {'job': j.view() if j else None}

    def cancel(self, id_):
        with self.lock:
            j = self.cur
        if not j or j.id != id_:
            return {'ok': False, 'status': 410, 'message': 'no such job'}
        j._cancel.set()
        return {'ok': True, 'job': j.id}


def _scan(job, args, ctx):
    """Verbe state/scan : le relevé de state() comme travail (gros caches), avec son avancement."""
    return state(ctx['data'], ctx['secrets'], ctx.get('git_cmd'), ctx.get('git_env', dict),
                 step=lambda t, d, n: job.step(t, d, n, 'parts'), cancelled=job.cancelled)


class _Cancelled(BaseException):
    """Annulation demandée, levée par say() de _ead_fetch. BaseException : les « except Exception » de proc_ead (lecture de PDF,
    OCR) ne l'avalent pas ; _ead_fetch l'attrape toujours."""


def _ead_args(a):
    """Contrôle des arguments de proc/ead-fetch : { 'icao': 4 caractères [A-Z0-9] } et rien d'autre ; None sinon (→ 400).
    Une liste (« LFBD,LFBO »), un joker, un champ en plus : refusés, EAD Basic ne se lit pas en masse."""
    if not isinstance(a, dict) or set(a) != {'icao'} or not isinstance(a['icao'], str):
        return None
    icao = a['icao'].strip().upper()
    return {'icao': icao} if re.fullmatch(r'[A-Z0-9]{4}', icao) else None


def _ead_credentials(secrets):
    """(identifiant, mot de passe) d'EAD Basic : <secrets>/ead.json { user, password }, sinon les variables EAD_USER et
    EAD_PASSWORD ; ('', '') sans rien. Les valeurs ne sont ni journalisées ni rendues."""
    try:
        with open(os.path.join(secrets, 'ead.json'), encoding='utf-8') as f:
            j = json.load(f)
        if isinstance(j, dict):
            user, password = str(j.get('user') or '').strip(), str(j.get('password') or '')
            if user and password:
                return user, password
    except (OSError, ValueError):
        pass
    return os.environ.get('EAD_USER', '').strip(), os.environ.get('EAD_PASSWORD', '')


def _ead_commit(data, icao, git_cmd, git_env, warnings):
    """Valide dans data/ les deux fichiers installés et eux seuls : `git add` puis `git commit -m … -- <chemins>` (la forme
    avec chemins vaut --only : le commit est fait de HEAD + ces fichiers tels qu'ils sont sur le disque, jamais de l'index ni
    d'un autre chemin ; ce que l'utilisateur a mis en attente ou modifié ailleurs dans data/ reste où il est). Pas de push.
    Rend le SHA du commit, ou None (avertissement ajouté à `warnings` : pas de dépôt, git en échec, rien à valider)."""
    if not git_cmd or not os.path.isdir(os.path.join(data, '.git')):
        warnings.append("git: data/ n'est pas un dépôt, rien n'est validé")
        return None
    paths = [f'proc/manual/{icao}.json', 'proc/manual/index.json']
    env = dict(git_env())

    def run(*args):
        return subprocess.run(git_cmd('-C', data, *args), capture_output=True, text=True, encoding='utf-8', errors='replace',
                              timeout=60, env=env)
    try:
        who = []
        if not run('config', 'user.name').stdout.strip() or not run('config', 'user.email').stdout.strip():
            who = ['-c', 'user.name=POSTE', '-c', 'user.email=poste@defa.local']   # comme les autres validations du lanceur
        a = run('add', '--', *paths)
        if a.returncode != 0:
            warnings.append('git add: ' + (a.stderr or a.stdout).strip()[:200])
            return None
        if run('diff', '--cached', '--quiet', '--', *paths).returncode == 0:
            warnings.append('git: rien de changé dans les fichiers installés, aucun commit')
            return None
        c = run(*who, 'commit', '-m', f':card_file_box: Procédures {icao} lues dans EAD Basic (à la demande, non opérationnelles)',
                '--', *paths)
        if c.returncode != 0:
            warnings.append('git commit: ' + (c.stderr or c.stdout).strip()[:200])
            return None
        h = run('rev-parse', 'HEAD')
        sha = h.stdout.strip()
        return sha if h.returncode == 0 and re.fullmatch(r'[0-9a-f]{40}', sha) else None
    except (OSError, subprocess.TimeoutExpired) as e:
        warnings.append(f'git: {str(e)[:200]}')
        return None


def _ead_fetch(job, args, ctx):
    """Verbe proc/ead-fetch : lit dans EAD Basic les procédures d'UN terrain, les installe sous data/proc/manual/ et les valide dans
    le dépôt des données (aerodb.fetchProcedures, § 10.20). Règle d'EAD Basic (frame/aerodb/EAD_BASIC.md § 1) : un terrain par geste de
    l'utilisateur, jamais une liste, jamais en masse, jamais planifié — le contrôle d'arguments n'admet qu'un code OACI.
    Identifiants : <secrets>/ead.json { user, password }, sinon EAD_USER / EAD_PASSWORD ; jamais journalisés (say() nettoie), jamais rendus.
    Étapes : connexion à la bibliothèque, proc_ead.fetch_ad (cache local data/local/ead/, jamais publié), contrôle de géométrie de
    proc_manual.verify (caps et distances refaits : une procédure qui échoue n'est pas installée), proc_manual.install (sans --replace : un
    fichier du terrain qui porte des procédures d'une autre source n'est jamais écrasé), puis commit de proc/manual/<OACI>.json et
    proc/manual/index.json SEULS (_ead_commit), sans push. L'annulation est regardée à chaque message et avant d'installer ; une fois les
    fichiers écrits, le travail va jusqu'au commit (sinon data/ resterait sali).
    Rend { ok: True, icao, procedures, warnings, commit (SHA | None), ocr } ou { ok: False, reason: 'no-credentials' | 'cancelled' |
    'failed', message? }."""
    icao = args['icao']
    data = ctx['data']
    user, password = _ead_credentials(ctx['secrets'])
    if not user or not password:
        return {'ok': False, 'reason': 'no-credentials'}
    tools = os.path.dirname(os.path.abspath(__file__))
    if tools not in sys.path:
        sys.path.insert(0, tools)
    import proc_ead
    import proc_manual

    def clean(text, n=300):
        return proc_ead.sanitize(str(text), [user, password])[:n]

    def say(*parts):
        text = proc_ead.sanitize(' '.join(map(str, parts)), [user, password])
        job.log(text)
        job.step(text[:200])
        if job.cancelled():
            raise _Cancelled()

    def failed(message, warnings=()):
        return {'ok': False, 'reason': 'failed', 'message': clean(message), 'warnings': [clean(w) for w in warnings][:50]}
    out = os.path.join(data, 'local', 'ead')
    t0 = time.time()
    try:
        os.makedirs(out, exist_ok=True)
        lib = proc_ead.EadLibrary(user, password, say, delay=1.0)
        if not lib.open():
            return failed('login refused')
        doc = proc_ead.fetch_ad(lib, icao, out, say)
        ocr = None
        ocr_path = os.path.join(out, f'{icao}.ocr.json')
        if os.path.isfile(ocr_path) and os.stat(ocr_path).st_mtime >= t0 - 1:   # écrit par CE travail (un reste d'une lecture ancienne est ignoré)
            with open(ocr_path, encoding='utf-8') as f:
                ocr = json.load(f)
        if job.cancelled():
            raise _Cancelled()
        todo = [d for d in (doc, ocr) if d and d.get('procedures')]
        warnings = [w for d in (doc, ocr) if d for w in d.get('warnings', [])]
        if not todo:
            return failed('no procedure could be read for this aerodrome', warnings)
        for d in todo:                                    # ce que fait proc_manual.main() avant d'installer
            problems = proc_manual.verify(d)
            if problems:
                return failed('geometry check failed: ' + '; '.join(problems[:3]), warnings)
        installed = 0
        for d in todo:
            try:
                proc_manual.install(d, os.path.join(data, 'proc'), replace=False)
                installed += len(d['procedures'])
            except SystemExit as e:                       # procédures d'une autre source dans le fichier du terrain : rien n'est écrit
                if not installed:
                    return failed(e, warnings)
                warnings.append(str(e))                   # le premier document est déjà installé : le second est signalé
    except _Cancelled:
        return {'ok': False, 'reason': 'cancelled'}
    except (SystemExit, Exception) as e:
        return failed(e)
    commit = _ead_commit(data, icao, ctx.get('git_cmd'), ctx.get('git_env', dict), warnings)
    return {'ok': True, 'icao': icao, 'procedures': installed, 'warnings': [clean(w) for w in warnings][:50], 'commit': commit,
            'ocr': bool(ocr and ocr.get('procedures'))}


# verbes du lot D0 ; les constructeurs (D2) ajoutent les leurs ici, chacun avec son contrôle d'arguments
REGISTRY = {
    ('state', 'scan'): (_scan, lambda a: {} if not a else None),
    ('proc', 'ead-fetch'): (_ead_fetch, _ead_args),
}
