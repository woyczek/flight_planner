"""Travaux longs du lanceur pour le module Données (V3, frame/INTEGRATION.md § 15) — bibliothèque standard seulement.

Socle commun à toutes les opérations de régénération (lot D0 ; les verbes des constructeurs arrivent avec eux, lot D2) :
  * un travail à la fois, dans un fil ; état { id, set, verb, state ('running' | 'done' | 'error' | 'cancelled' | 'interrupted'), step,
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
import urllib.error
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

    def __init__(self, set_, verb, args, clean=str, author=''):
        self.clean = clean  # nettoyage des secrets (clean_error) : toute ligne et toute étape passent par lui
        self.author = author  # trigramme de la page qui a lancé le travail ('' sans lui) : l'auteur de commit_outputs
        self.id = uuid.uuid4().hex[:12]
        self.data = {'id': self.id, 'set': set_, 'verb': verb, 'args': args, 'author': author, 'state': 'running', 'step': '',
                     'done': 0, 'total': 0, 'unit': '', 'log': [], 'result': None, 'started': int(time.time()), 'ended': None}
        self._cancel = threading.Event()

    def step(self, text, done=None, total=None, unit=None):
        self.data['step'] = self.clean(str(text))[:200]
        if done is not None:
            self.data['done'] = done
        if total is not None:
            self.data['total'] = total
        if unit is not None:
            self.data['unit'] = unit

    def log(self, line):
        lg = self.data['log']
        lg.append(self.clean(str(line))[:500])  # un verbe ne peut pas y laisser un identifiant, même par mégarde
        del lg[:-LOG_MAX]

    def cancelled(self):
        return self._cancel.is_set()

    def view(self):
        return {**self.data, 'log': list(self.data['log'])}


# délai minimal entre deux départs d'un même verbe, en secondes : EAD Basic se lit terrain par terrain, sur un geste, jamais en
# masse (EAD_BASIC.md § 1) ; un travail à la fois ne suffit pas à le garantir, ce délai rend la règle réelle
MIN_GAP = {('proc', 'ead-fetch'): 30}


def clean_error(text, ctx=None):
    """Texte d'une erreur sans secret, avant le journal du travail et la page : les identifiants d'EAD Basic du poste (s'il y en a),
    les jetons, identifiants de session et adresses de courriel (proc_ead.sanitize), puis les « utilisateur:mot de passe@ » et les
    paramètres de session ou de jeton d'une adresse. Ne lève jamais."""
    out = str(text)
    try:
        tools = os.path.dirname(os.path.abspath(__file__))
        if tools not in sys.path:
            sys.path.insert(0, tools)
        import proc_ead
        secrets = _ead_credentials(ctx['secrets']) if ctx and ctx.get('secrets') else ()
        out = proc_ead.sanitize(out, [s for s in secrets if s])
    except Exception:  # le filtre ci-dessous s'applique quand même
        pass
    out = re.sub(r'(?i)(\b[a-z][a-z0-9+.-]*://)[^/\s:@]+:[^/\s@]*@', r'\1<secret>@', out)
    out = re.sub(r'(?i)([?&;](?:jsessionid|session|sid|token|access_token|key|apikey|password|pwd|pass)=)[^&#\s]*', r'\1<secret>', out)
    return out


class Jobs:
    """Un travail à la fois ; REGISTRY : (jeu, verbe) → (fonction(job, args, ctx) → résultat, contrôle(args) → args | None) ;
    MIN_GAP : délai minimal entre deux départs d'un verbe (refus 'too-soon', 429, avec `wait` en secondes)."""

    def __init__(self, registry, ctx=None, min_gap=None, store=None):
        self.registry = dict(registry)
        self.ctx = ctx or {}
        self.lock = threading.Lock()
        self.cur = None
        self.min_gap = dict(MIN_GAP if min_gap is None else min_gap)
        self.last = {}  # (jeu, verbe) → heure (time.time) du dernier départ
        self.store = store  # tools/.regen_last.json : le dernier travail et les derniers départs, gardés d'un lancement à l'autre
        self.kept = None  # dernier travail d'un lancement précédent (« interrupted » s'il courait encore)
        self._load()

    def _load(self):
        """Relit le dernier travail et les derniers départs : un travail qui courait quand le lanceur s'est arrêté devient
        « interrupted » ; les délais (MIN_GAP) valent par-delà un redémarrage. Fichier absent ou illisible : rien."""
        if not self.store:
            return
        try:
            with open(self.store, encoding='utf-8') as f:
                v = json.load(f)
        except (OSError, ValueError):
            return
        j = v.get('job') if isinstance(v, dict) else None
        if isinstance(j, dict) and isinstance(j.get('id'), str):
            if j.get('state') == 'running':
                j.update(state='interrupted', ended=j.get('ended') or int(time.time()))
            self.kept = j
        for k, t in (v.get('last') or {}).items() if isinstance(v, dict) else ():
            if isinstance(k, str) and '/' in k and isinstance(t, (int, float)):
                self.last[tuple(k.split('/', 1))] = float(t)

    def _save(self):
        """Écrit le dernier travail (sans secret : son journal est déjà nettoyé) et les derniers départs ; jamais d'erreur."""
        if not self.store:
            return
        j = self.cur.view() if self.cur else self.kept
        try:
            tmp = self.store + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump({'job': j, 'last': {f'{a}/{b}': t for (a, b), t in self.last.items()}}, f, ensure_ascii=False)
            os.replace(tmp, self.store)
        except (OSError, TypeError, ValueError):
            pass

    def start(self, set_, verb, args, author=''):
        key = (str(set_ or ''), str(verb or ''))
        author = author if isinstance(author, str) and re.fullmatch(r'[A-Z]{3}', author) else ''
        if key not in self.registry:
            return {'ok': False, 'status': 400, 'message': f'unknown operation {key[0]}/{key[1]}'}
        fn, check = self.registry[key]
        a = check(args if isinstance(args, dict) else {})
        if a is None:
            return {'ok': False, 'status': 400, 'message': 'invalid arguments'}
        with self.lock:
            if self.cur and self.cur.data['state'] == 'running':
                return {'ok': False, 'status': 409, 'message': 'a job is already running', 'job': self.cur.id}
            gap, now = self.min_gap.get(key), time.time()
            if gap and key in self.last and now - self.last[key] < gap:
                wait = max(1, int(gap - (now - self.last[key]) + 0.999))
                return {'ok': False, 'status': 429, 'reason': 'too-soon', 'wait': wait, 'message': f'too soon: wait {wait} s'}
            self.last[key] = now
            job = self.cur = Job(*key, a, clean=lambda t: clean_error(t, self.ctx), author=author)
            self._save()
        threading.Thread(target=self._run, args=(job, fn, a), daemon=True).start()
        return {'ok': True, 'job': job.id}

    def _run(self, job, fn, a):
        try:
            res = fn(job, a, self.ctx)
            job.data['state'] = 'cancelled' if job.cancelled() else 'done'
            job.data['result'] = res
        except Exception as e:  # le travail s'arrête, le lanceur continue : l'erreur est dite à la page, nettoyée
            msg = clean_error(e, self.ctx)
            job.log(f'error: {msg}')
            job.data['state'] = 'error'
            job.data['result'] = {'message': msg[:300]}
        job.data['ended'] = int(time.time())
        with self.lock:
            self._save()

    def view(self, id_=None):
        """Le travail id_ ({ ok: False, status: 410 } s'il n'est plus là) ; sans id_, le courant ou le dernier."""
        with self.lock:
            j = self.cur
        v = j.view() if j else self.kept  # sans travail dans ce lancement : celui du précédent (« interrupted » s'il courait)
        if id_:
            return v if v and v.get('id') == id_ else {'ok': False, 'status': 410, 'message': 'no such job'}
        return {'job': v}

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


def _ead_commit(data, icao, git_cmd, git_env, warnings, source='ead'):
    """Valide dans data/ les deux fichiers installés et eux seuls : `git add` puis `git commit -m … -- <chemins>` (la forme
    avec chemins vaut --only : le commit est fait de HEAD + ces fichiers tels qu'ils sont sur le disque, jamais de l'index ni
    d'un autre chemin ; ce que l'utilisateur a mis en attente ou modifié ailleurs dans data/ reste où il est). Pas de push.
    `source` ('ead' | 'eaip') ne change que le message. Rend le SHA du commit, ou None (avertissement ajouté à `warnings` : pas de dépôt,
    git en échec, rien à valider)."""
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
        message = (f":card_file_box: Procédures {icao} lues dans l'eAIP du SIA (à la demande)" if source == 'eaip' else
                   f':card_file_box: Procédures {icao} lues dans EAD Basic (à la demande, non opérationnelles)')
        c = run(*who, 'commit', '-m', message, '--', *paths)
        if c.returncode != 0:
            warnings.append('git commit: ' + (c.stderr or c.stdout).strip()[:200])
            return None
        h = run('rev-parse', 'HEAD')
        sha = h.stdout.strip()
        return sha if h.returncode == 0 and re.fullmatch(r'[0-9a-f]{40}', sha) else None
    except (OSError, subprocess.TimeoutExpired) as e:
        warnings.append(f'git: {str(e)[:200]}')
        return None


def _installed_file(data, icao):
    """Le fichier du terrain tel que proc_manual.install vient de l'écrire (data/proc/manual/<OACI>.json), relu sur le disque ; None s'il ne se lit pas. Rendu dans le résultat du
    travail (`file`) : aerodb le sert tout de suite, sans attendre que sa copie de lecture rattrape (la première lecture répondait « 0 procédures »)."""
    try:
        with open(os.path.join(data, 'proc', 'manual', f'{icao}.json'), encoding='utf-8') as f:
            doc = json.load(f)
        return doc if isinstance(doc, dict) and isinstance(doc.get('procedures'), list) else None
    except (OSError, ValueError):
        return None


def _summary(stats):
    """Ligne de journal d'un compte rendu `stats` : « 18 procédure(s) sur 22 page(s) de codage ; 4 non lue(s) ; 2 procédure(s) écartée(s) (motifs : …) »."""
    why = '; '.join(f'{t} ×{n}' for t, n in stats.get('reasons', []))
    return (f'{stats.get("procedures", 0)} procédure(s) installée(s) ; {stats.get("read", 0)} page(s) lue(s) sur {stats.get("pages", 0)}, {stats.get("rejected", 0)} non lue(s)'
            f'{"; " + str(stats["doubt"]) + " à vérifier (statut doubt, gardées dans le fichier)" if stats.get("doubt") else ""}'
            f'{"; " + str(stats["dropped"]) + " retirée(s)" if stats.get("dropped") else ""}{" (motifs : " + why + ")" if why else ""}')


def _nothing_read(formats, stats):
    """Message de l'échec « rien de lu » : combien de documents et de pages ont été vus, combien lus, et les motifs les plus fréquents des autres (« 31 document(s), 0 of 31 page(s) read
    (mise en page non reconnue ×31) ») ; Fuel l'affiche tel quel après la raison, c'est tout ce que l'utilisateur voit d'une lecture qui n'a rien donné."""
    docs = len({f.get('file') for f in formats if f.get('file')})
    why = '; '.join(f'{t} ×{n}' for t, n in stats.get('reasons', [])[:2])
    return f'no procedure could be read for this aerodrome: {docs} document(s), {stats.get("read", 0)} of {stats.get("pages", 0)} page(s) read' + (f' ({why})' if why else '')


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
    Rend { ok: True, icao, procedures, warnings, commit (SHA | None), ocr, source: 'ead' } ou { ok: False, reason: 'no-credentials' | 'cancelled' |
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
    import proc_eaip
    import proc_manual

    def clean(text, n=300):
        return proc_ead.sanitize(str(text), [user, password])[:n]

    def say(*parts):
        text = proc_ead.sanitize(' '.join(map(str, parts)), [user, password])
        job.log(text)
        job.step(text[:200])
        if job.cancelled():
            raise _Cancelled()

    def step(text, done, total, unit):
        job.step(proc_ead.sanitize(str(text), [user, password]), done, total, unit)      # le nombre de documents faits sur le total : la page le montre (aerodb.fetchProcedures → onProgress)
        if job.cancelled():
            raise _Cancelled()

    def failed(message, warnings=(), stats=None):
        return {'ok': False, 'reason': 'failed', 'message': clean(message), 'warnings': [clean(w) for w in warnings][:50], **({'stats': stats} if stats else {})}
    out = os.path.join(data, 'local', 'ead')
    t0 = time.time()
    formats, stats = [], None                             # les comptes de ce qui a été vu, rendus aussi quand la lecture échoue (aerodb les passe : { ok: false, reason: 'failed', message, stats })
    try:
        os.makedirs(out, exist_ok=True)
        lib = proc_ead.EadLibrary(user, password, say, delay=1.0)
        if not lib.open():
            return failed('login refused')
        doc = proc_ead.fetch_ad(lib, icao, out, say, step=step)
        ocr = None
        ocr_path = os.path.join(out, f'{icao}.ocr.json')
        if os.path.isfile(ocr_path) and os.stat(ocr_path).st_mtime >= t0 - 1:   # écrit par CE travail (un reste d'une lecture ancienne est ignoré)
            with open(ocr_path, encoding='utf-8') as f:
                ocr = json.load(f)
        if job.cancelled():
            raise _Cancelled()
        todo = [d for d in (doc, ocr) if d and d.get('procedures')]
        warnings = [w for d in (doc, ocr) if d for w in d.get('warnings', [])]
        formats = [f for d in (doc, ocr) if d for f in d.get('formats', [])]
        stats = proc_eaip.stats_of(formats, 0)            # sans procédure installée ; remplacé par le compte final en cas de succès
        if not todo:
            job.log(clean(_summary(stats)))
            return failed(_nothing_read(formats, stats), warnings, stats)
        for d in todo:                                    # ce que fait proc_manual.main() avant d'installer
            problems = proc_manual.verify(d)
            if problems:
                job.log(clean(_summary(stats)))
                return failed('geometry check failed: ' + '; '.join(problems[:3]), warnings, stats)
        installed = 0
        say(f'{icao}: installation de {sum(len(d["procedures"]) for d in todo)} procédure(s)')
        for d in todo:
            try:
                proc_manual.install(d, os.path.join(data, 'proc'), replace=False)
                installed += len(d['procedures'])
            except SystemExit as e:                       # procédures d'une autre source dans le fichier du terrain : rien n'est écrit
                if not installed:
                    return failed(e, warnings, stats)
                warnings.append(str(e))                   # le premier document est déjà installé : le second est signalé
    except _Cancelled:
        return {'ok': False, 'reason': 'cancelled'}
    except (SystemExit, Exception) as e:
        return failed(e, stats=stats)
    commit = _ead_commit(data, icao, ctx.get('git_cmd'), ctx.get('git_env', dict), warnings)
    stats = proc_eaip.stats_of(formats, installed)       # pages = documents lus (une entrée par page de tableau vue) ; pas de contrôle de géométrie par procédure ici : dropped 0
    job.log(clean(_summary(stats)))
    return {'ok': True, 'icao': icao, 'procedures': installed, 'warnings': [clean(w) for w in warnings][:50], 'commit': commit,
            'ocr': bool(ocr and ocr.get('procedures')), 'source': 'ead', 'stats': stats, 'file': _installed_file(data, icao)}


def _eaip_args(a):
    """Contrôle des arguments de proc/eaip-fetch : ceux d'ead-fetch (un code OACI et rien d'autre) et un code de la France (« LF… »),
    seule à avoir son eAIP lu ainsi ; None sinon (→ 400)."""
    r = _ead_args(a)
    return r if r and r['icao'].startswith('LF') else None


def _eaip_fetch(job, args, ctx):
    """Verbe proc/eaip-fetch : lit dans l'eAIP du SIA (France) les procédures d'UN terrain (tables de codage ARINC des pages AD 2), les
    installe sous data/proc/manual/ et les valide dans le dépôt des données (aerodb.fetchProcedures, § 10.20) ; le pendant d'ead-fetch pour
    un État dont l'AIP est publiée sans compte. Aucun identifiant ; AUCUNE adresse ne vient de la page : le dossier AIRAC est calculé ici
    (cycle en vigueur d'après le calendrier de 28 jours, proc_eaip.eaip_url). Étapes : proc_eaip.read_aerodrome (page AD 2, pages DATA et CODE,
    cache data/local/eaip/<cycle>/ jamais publié ; les points en route sont placés d'après la base SIA du poste, data/sia/base/fr/<cycle>/, si
    elle y est, sinon à la lecture par aerodb), contrôle de géométrie par procédure (proc_eaip.gaps_of : une procédure qui échoue n'est pas
    installée, elle est signalée), proc_manual.install (sans --replace : un fichier du terrain qui porte des procédures d'une autre source n'est
    jamais écrasé), puis commit de proc/manual/<OACI>.json et proc/manual/index.json SEULS (_ead_commit), sans push. Le contrôle de
    proc_manual.verify n'est PAS appliqué : il demande le cap vrai (`trk`) que seules les lectures à la main portent, les tables du SIA
    impriment le cap magnétique. L'annulation est regardée à chaque message et avant d'installer.
    Rend { ok: True, icao, procedures, warnings, commit (SHA | None), source: 'eaip', cycle } ou { ok: False, reason: 'no-tables' (la page du
    terrain ne cite aucune table de codage) | 'cancelled' | 'failed', message? }."""
    icao = args['icao']
    data = ctx['data']
    tools = os.path.dirname(os.path.abspath(__file__))
    if tools not in sys.path:
        sys.path.insert(0, tools)
    import proc_ead
    import proc_eaip
    import proc_manual
    cycle = proc_ead.lib_cycle(data)                    # cycle en vigueur (la date du dossier AIRAC de l'eAIP)
    eaip = proc_eaip.eaip_url(cycle)

    def clean(text, n=300):
        return str(text)[:n]

    def say(*parts):
        text = ' '.join(map(str, parts))
        job.log(text)
        job.step(text[:200])
        if job.cancelled():
            raise _Cancelled()

    def step(text, done, total):
        job.step(text, done, total, 'pages')
        if job.cancelled():
            raise _Cancelled()

    def failed(message, warnings=()):
        return {'ok': False, 'reason': 'failed', 'message': clean(message), 'warnings': [clean(w) for w in warnings][:50]}
    cache = os.path.join(data, 'local', 'eaip', cycle)
    base = os.path.join(data, 'sia', 'base', 'fr', cycle)
    try:
        os.makedirs(cache, exist_ok=True)
        try:
            resolve = proc_eaip.base_resolver(base) if os.path.isdir(base) else None
        except (OSError, ValueError, AttributeError, TypeError):    # base illisible : les points en route sont placés à la lecture
            resolve = None
        say(f'{icao}: eAIP du SIA, cycle {cycle}')
        doc = proc_eaip.read_aerodrome(eaip, icao, cache, resolve, say, step=step)
        if doc is None:
            return {'ok': False, 'reason': 'no-tables'}
        if job.cancelled():
            raise _Cancelled()
        warnings = list(doc.get('warnings', []))
        kept = doc.get('procedures', [])
        for p in kept:                                  # géométrie : proc_eaip.mark_geometry (cap magnétique et distance imprimés) ; une procédure qui échoue reste dans le fichier, statut « doubt »
            if proc_eaip.mark_geometry(p):
                warnings.append(f'{p.get("id")}: À VÉRIFIER, {p["doubt"]}')
        dropped = [d.get('reason') or 'autre' for d in doc.pop('dropped', [])]       # vraiment retirées (build_aerodrome) : un bloc sans titre qui répète une procédure nommée
        doubt = [proc_eaip.doubt_key(p.get('doubt')) for p in kept if p.get('status') == 'doubt']
        stats = proc_eaip.stats_of(doc.get('formats', []), len({p.get('id') for p in kept}), dropped, doubt)
        job.log(clean(_summary(stats)))
        if not kept:
            return {**failed('no procedure could be read for this aerodrome', warnings), 'stats': stats}
        doc['warnings'] = warnings
        try:      # une relecture REMPLACE la lecture précédente de la même source (eaip) : ses identifiants d'avant (autre nom, autre règle de lecture) ne restent pas
            proc_manual.install(doc, os.path.join(data, 'proc'), replace=False, replace_source='eaip')
        except SystemExit as e:                         # procédures d'une autre source dans le fichier du terrain : rien n'est écrit
            return {**failed(e, warnings), 'stats': stats}
    except _Cancelled:
        return {'ok': False, 'reason': 'cancelled'}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return failed(f'eAIP page not found (HTTP 404): the AIRAC folder of cycle {cycle} is not published yet on the SIA site, or {icao} has no AD 2 page in it')
        return failed(f'SIA site answered HTTP {e.code}')
    except (OSError, SystemExit, Exception) as e:       # réseau (URLError, délai), pypdf manquant (SystemExit), PDF illisible…
        return failed(e)
    commit = _ead_commit(data, icao, ctx.get('git_cmd'), ctx.get('git_env', dict), warnings, source='eaip')
    return {'ok': True, 'icao': icao, 'procedures': len({p.get('id') for p in kept}), 'warnings': [clean(w) for w in warnings][:50], 'commit': commit,
            'source': 'eaip', 'cycle': cycle, 'stats': stats, 'file': _installed_file(data, icao)}


# verbes du lot D0 ; les constructeurs (D2) ajoutent les leurs ici, chacun avec son contrôle d'arguments
def commit_outputs(ctx, author, paths, message):
    """Le seul commit des sorties dans data/, pour tous les verbes : `git add` puis `git commit -m … -- <chemins>` (avec chemins :
    HEAD plus ces fichiers tels qu'ils sont sur le disque, jamais l'index ni un autre chemin ; ce que l'utilisateur a mis en
    attente ailleurs reste où il est), auteur = le trigramme de la page (jamais un auteur de poste), pas de push. Chemins
    relatifs à data/, sous les sorties (OUTPUTS) seulement. Rend { commit: SHA | None, warning: texte | None } : pas de dépôt,
    pas de trigramme, chemin refusé, rien de changé ou git en échec → commit None et la raison."""
    data, git_cmd, git_env = ctx.get('data'), ctx.get('git_cmd'), ctx.get('git_env', dict)
    paths = [str(p).replace('\\', '/') for p in paths or []]
    bad = [p for p in paths if not p or p.startswith('/') or '..' in p.split('/') or ':' in p
           or not any(p == o or (o.endswith('/') and p.startswith(o)) for o in OUTPUTS)]
    if bad or not paths:
        return {'commit': None, 'warning': f'refused path: {bad[0] if bad else "(none)"}'}
    if not (isinstance(author, str) and re.fullmatch(r'[A-Z]{3}', author)):
        return {'commit': None, 'warning': 'no trigram: nothing committed'}
    if not git_cmd or not data or not os.path.isdir(os.path.join(data, '.git')):
        return {'commit': None, 'warning': "data/ is not a git repository: nothing committed"}
    env = dict(git_env())

    def run(*args):
        return subprocess.run(git_cmd('-C', data, *args), capture_output=True, text=True, encoding='utf-8', errors='replace',
                              timeout=60, env=env)
    try:
        a = run('add', '--', *paths)
        if a.returncode != 0:
            return {'commit': None, 'warning': clean_error('git add: ' + (a.stderr or a.stdout).strip(), ctx)[:200]}
        if run('diff', '--cached', '--quiet', '--', *paths).returncode == 0:
            return {'commit': None, 'warning': 'nothing changed: no commit'}
        c = run('-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local', 'commit', '-m', str(message)[:500], '--', *paths)
        if c.returncode != 0:
            return {'commit': None, 'warning': clean_error('git commit: ' + (c.stderr or c.stdout).strip(), ctx)[:200]}
        h = run('rev-parse', 'HEAD')
        sha = h.stdout.strip()
        return {'commit': sha if h.returncode == 0 and re.fullmatch(r'[0-9a-f]{40}', sha) else None, 'warning': None}
    except (OSError, subprocess.TimeoutExpired) as e:
        return {'commit': None, 'warning': f'git: {str(e)[:200]}'}


def load_verbs(folder=None):
    """Les verbes des jeux : chaque tools/regen/<jeu>.py (dans l'ordre des noms, sauf « _… ») exporte VERBS = { (jeu, verbe):
    (fonction, contrôle) } et, s'il veut, MIN_GAP = { (jeu, verbe): secondes } ; fusionnés dans REGISTRY et MIN_GAP. Appelé
    par le lanceur à la création des travaux (pas à l'import : un jeu peut importer ce module). Un fichier en échec est
    laissé de côté, sa raison rendue ; le lanceur continue. Rend [(fichier, message)]."""
    folder = folder or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'regen')
    errors = []
    try:
        names = sorted(n for n in os.listdir(folder) if n.endswith('.py') and not n.startswith('_'))
    except OSError:
        return errors
    for n in names:
        try:
            spec = importlib.util.spec_from_file_location(f'regen_{n[:-3]}', os.path.join(folder, n))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            verbs, gaps = getattr(mod, 'VERBS', {}) or {}, getattr(mod, 'MIN_GAP', {}) or {}
            for k, v in verbs.items():
                if not (isinstance(k, tuple) and len(k) == 2 and isinstance(v, tuple) and len(v) == 2 and callable(v[0]) and callable(v[1])):
                    raise ValueError(f'bad VERBS entry {k!r}')
            REGISTRY.update(verbs)
            MIN_GAP.update({k: float(v) for k, v in gaps.items() if isinstance(k, tuple) and isinstance(v, (int, float))})
        except Exception as e:  # un jeu en échec ne fait pas tomber le lanceur
            errors.append((n, str(e)[:200]))
    return errors


REGISTRY = {
    ('state', 'scan'): (_scan, lambda a: {} if not a else None),
    ('proc', 'ead-fetch'): (_ead_fetch, _ead_args),
    ('proc', 'eaip-fetch'): (_eaip_fetch, _eaip_args),
}
