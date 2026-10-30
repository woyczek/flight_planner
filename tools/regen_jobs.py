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
import hmac
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
import urllib.parse
import urllib.request
import uuid

import outbound  # le User-Agent du lanceur, chaque échec dit en console
from secrets import token_urlsafe  # jeton d'un travail (le paramètre « secrets » des fonctions est un dossier)

# sorties publiées (chemins de data/) et sorties locales jamais publiées ; caches des sources : data/sia/<source>/
OUTPUTS = ('sia/base/', 'proc/', 'sia/vfr/', 'AircraftDB/', 'sia/mora.csv')
LOCAL = 'local/'
CACHE_ROOT = 'sia/'
NOT_CACHES = {'base', 'vfr'}  # sous sia/ : des sorties, pas des caches de sources
CYCLE = re.compile(r'^\d{4}(-\d{2}-\d{2})?$')
LOG_MAX = 200
TRIGRAM = re.compile(r'[A-Z0-9]{2,5}')  # règle commune du trigramme (users.js, secrets_view, flightPath) : 2 à 5 signes


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


# sortie d'une zone rendue par la page sans fenêtre d'un travail (POST /__setup/regen/job/put) : noms de fichier, taille
PUT_NAME = re.compile(r'[a-z0-9_.-]{1,64}\.json')
PUT_ZONE = re.compile(r'[a-z0-9_-]{1,32}')
PUT_MAX = 64 * 1024 * 1024  # octets, tous les fichiers d'un envoi


class Job:
    """Un travail : son état lisible par la page, ses aides (étape, journal), l'annulation demandée, et la sortie des zones
    rendue par une page sans fenêtre (token, put, take)."""

    def __init__(self, set_, verb, args, clean=str, author=''):
        self.clean = clean  # nettoyage des secrets (clean_error) : toute ligne et toute étape passent par lui
        self.author = author  # trigramme de la page qui a lancé le travail ('' sans lui) : l'auteur de commit_outputs
        self.id = uuid.uuid4().hex[:12]
        self.data = {'id': self.id, 'set': set_, 'verb': verb, 'args': args, 'author': author, 'state': 'running', 'step': '',
                     'done': 0, 'total': 0, 'unit': '', 'log': [], 'result': None, 'started': int(time.time()), 'ended': None}
        self._cancel = threading.Event()
        # jeton du travail : sa page sans fenêtre le réclame une seule fois (claim, après offer du verbe) ; jamais dans
        # view(), le fichier du dernier travail, un journal, une ligne de commande ni une adresse
        self.token = token_urlsafe(32)
        self._inbox, self._given, self._cv = {}, set(), threading.Condition()
        self._offer, self._claimed = None, False

    def offer(self, payload=None):
        """Le verbe ouvre la réclamation du jeton par sa page sans fenêtre (POST /__setup/regen/job/claim), avec ce qu'elle
        doit recevoir en plus (zones, cycle, entrées… : un objet JSON, sans les clés ok, job, token) ; une seule réclamation
        ensuite."""
        payload = dict(payload or {})
        if {'ok', 'job', 'token', 'status'} & set(payload):
            raise ValueError('offer: reserved key')
        json.dumps(payload)  # lisible en JSON, sinon ValueError / TypeError ici, pas à la réclamation
        self._offer = payload

    def put(self, zone, files):
        """Sortie d'une zone remise par la route (déjà contrôlée) : { nom: texte } ; une zone se rend une fois par travail
        (False si elle l'a déjà été : jamais deux fois 64 Mo gardés pour la même zone)."""
        with self._cv:
            if zone in self._given:
                return False
            self._given.add(zone)
            self._inbox[zone] = files
            self._cv.notify_all()
            return True

    def drop(self):
        """Fin du travail : les sorties pas reprises par le verbe sont oubliées (rien ne reste en mémoire)."""
        with self._cv:
            self._inbox.clear()
            self._cv.notify_all()

    def take(self, zone, timeout=None):
        """Attend la sortie de cette zone : { nom: texte }, ou None (délai passé, travail annulé)."""
        end = None if timeout is None else time.time() + timeout
        with self._cv:
            while zone not in self._inbox:
                if self.cancelled() or (end is not None and time.time() >= end):
                    return None
                self._cv.wait(0.5 if end is None else max(0.01, min(0.5, end - time.time())))
            return self._inbox.pop(zone)

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


# délai minimal entre deux départs d'un même verbe, en secondes : chaque jeu exporte le sien (tools/regen/<jeu>.py, MIN_GAP ; load_verbs les réunit ici) ; celui d'EAD Basic
# (30 s, tools/regen/proc.py) fait partie de ses conditions : un terrain par geste, jamais en masse (EAD_BASIC.md § 1)
MIN_GAP = {}


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
        self.held = ''  # raison d'une suspension des départs (la mise à jour de la suite) ; vide : les travaux partent
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
        author = author if isinstance(author, str) and TRIGRAM.fullmatch(author) else ''
        if key not in self.registry:
            return {'ok': False, 'status': 400, 'message': f'unknown operation {key[0]}/{key[1]}'}
        fn, check = self.registry[key]
        a = check(args if isinstance(args, dict) else {})
        if a is None:
            return {'ok': False, 'status': 400, 'message': 'invalid arguments'}
        with self.lock:
            if self.held:
                return {'ok': False, 'status': 409, 'reason': self.held, 'message': f'no job starts now ({self.held})'}
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
        finally:
            job.drop()  # sorties de zones non reprises : oubliées avec le travail, quoi qu'il arrive (même une BaseException)
            if job.data['state'] == 'running':  # BaseException (arrêt du fil) : jamais un travail qui « tourne » pour toujours
                job.data['state'] = 'error'
                job.data['ended'] = job.data['ended'] or int(time.time())
        with self.lock:
            self._save()

    def hold(self, why):
        """Suspend les départs (start refusé avec reason why) si aucun travail ne tourne ; False sinon. view, cancel, claim et
        put répondent pendant la suspension : le verrou n'est tenu que le temps de poser le drapeau."""
        with self.lock:
            if self.held or self.cur and self.cur.data['state'] == 'running':
                return False
            self.held = str(why or 'held')
            return True

    def release(self):
        """Les départs reprennent."""
        with self.lock:
            self.held = ''

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

    def claim(self, id_):
        """Le jeton du travail en cours et ce que son verbe a offert, remis UNE fois : 409 si ce n'est pas le travail qui
        tourne, si son verbe n'a rien offert (job.offer) ou si le jeton a déjà été réclamé."""
        with self.lock:
            j = self.cur
            if not j or j.id != str(id_ or '') or j.data['state'] != 'running':
                return {'ok': False, 'status': 409, 'message': 'not the running job'}
            if j._offer is None or j._claimed:
                return {'ok': False, 'status': 409, 'message': 'nothing to claim (not offered, or already claimed)'}
            j._claimed = True
            return {**j._offer, 'ok': True, 'job': j.id, 'token': j.token}

    def put(self, id_, token, zone, files):
        """Sortie d'une zone rendue par la page sans fenêtre du travail en cours : 409 (pas celui qui tourne), 403 (jeton
        faux), 400 (zone hors des arguments du travail, nom de fichier refusé), 413 (plus de PUT_MAX octets) ; rien n'est
        écrit ici, le verbe la reçoit par job.take(zone) et l'écrit lui-même."""
        with self.lock:
            j = self.cur
        if not j or j.id != str(id_ or '') or j.data['state'] != 'running':
            return {'ok': False, 'status': 409, 'message': 'not the running job'}
        if not isinstance(token, str) or not hmac.compare_digest(token.encode(), j.token.encode()):
            return {'ok': False, 'status': 403, 'message': 'wrong token'}
        args = j.data.get('args') or {}
        zones = [args.get('zone')] + list(args.get('zones') or []) if isinstance(args, dict) else []
        if not isinstance(zone, str) or not PUT_ZONE.fullmatch(zone) or zone not in zones:
            return {'ok': False, 'status': 400, 'message': 'zone not in the job'}
        if not isinstance(files, dict) or not files or not all(isinstance(k, str) and PUT_NAME.fullmatch(k) and isinstance(v, str)
                                                                for k, v in files.items()):
            return {'ok': False, 'status': 400, 'message': 'refused file name'}
        if sum(len(v.encode('utf-8')) for v in files.values()) > PUT_MAX:
            return {'ok': False, 'status': 413, 'message': 'too large'}
        if not j.put(zone, dict(files)):
            return {'ok': False, 'status': 409, 'message': 'zone already delivered'}
        return {'ok': True, 'job': j.id, 'zone': zone, 'files': len(files)}


def _scan(job, args, ctx):
    """Verbe state/scan : le relevé de state() comme travail (gros caches), avec son avancement."""
    return state(ctx['data'], ctx['secrets'], ctx.get('git_cmd'), ctx.get('git_env', dict),
                 step=lambda t, d, n: job.step(t, d, n, 'parts'), cancelled=job.cancelled)


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


# environnement d'un sous-processus d'un travail (script d'un jeu, git) : ce qu'il faut pour tourner et passer un proxy, jamais
# le reste du lanceur (EAD_USER, EAD_PASSWORD, jetons… : un script tiers n'a pas à les voir)
CHILD_KEEP = {k.upper() for k in ('PATH', 'PATHEXT', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE',
                                  'APPDATA', 'LOCALAPPDATA', 'HOMEDRIVE', 'HOMEPATH', 'LANG', 'LC_ALL', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY',
                                  # dossiers et description du système, sans secret : un navigateur sans fenêtre (base/build) en a besoin
                                  'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432', 'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)',
                                  'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS',
                                  'USERNAME', 'USERDOMAIN', 'COMPUTERNAME', 'XDG_RUNTIME_DIR', 'DISPLAY')}


def child_env(**extra):
    """Environnement réduit d'un sous-processus de travail (CHILD_KEEP), sortie en UTF-8, plus `extra`."""
    env = {k: v for k, v in os.environ.items() if k.upper() in CHILD_KEEP}
    env['PYTHONIOENCODING'] = 'utf-8'
    env.update(extra)
    return env


def git_child_env():
    """child_env() pour git : sans question, chaque chemin un nom de fichier."""
    return child_env(GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never', GIT_LITERAL_PATHSPECS='1')


def inside(path, base):
    """Vrai si `path` n'est pas un lien et se résout (liens et jonctions compris) sous `base` (déjà résolu). Le dernier garde-fou avant
    un retrait, pour toutes les purges."""
    try:
        if os.path.islink(path):
            return False
        real = os.path.normcase(os.path.realpath(path))
        base = os.path.normcase(base)
        return os.path.commonpath([real, base]) == base and real != base
    except (OSError, ValueError):
        return False


def files_under(top, base):
    """(fichiers, refusés) sous `top` sans suivre de lien : un dossier qui est un lien ou se résout hors de `base` (une jonction de
    Windows n'est pas un lien pour os.walk) n'est pas descendu ; un fichier lien ou hors de `base` est compté parmi les refusés."""
    files, bad = [], 0
    for d, subs, names in os.walk(top):
        bad += sum(1 for x in subs if not inside(os.path.join(d, x), base))
        subs[:] = [x for x in subs if inside(os.path.join(d, x), base)]
        for n in names:
            full = os.path.join(d, n)
            if inside(full, base):
                files.append(full)
            else:
                bad += 1
    return files, bad


def prune_empty(top, base):
    """Retire les dossiers vidés sous `top` (lui compris), du plus profond au plus haut, sans descendre un lien ni une jonction
    (regen_jobs.inside) ; un dossier non vide reste."""
    dirs = []
    for d, subs, _names in os.walk(top):
        dirs.append(d)
        subs[:] = [x for x in subs if inside(os.path.join(d, x), base)]
    for d in sorted(dirs, key=len, reverse=True):
        try:
            os.rmdir(d)
        except OSError:
            pass


def merge_pending(ctx):
    """Une fusion attend dans data/ (passage de synchronisation interrompu) : aucun verbe n'y écrit avant qu'elle soit réglée (un
    commit la conclurait, ou git le refuse après coup sur des fichiers déjà écrits)."""
    data = ctx.get('data') or ''
    return bool(data) and os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD'))


MAX_DOWNLOAD = 200 * 1024 * 1024  # plafond d'une réponse (comme aero_fetch : un CIFP fait quelques dizaines de Mo)


class TooLarge(Exception):
    """Réponse au-delà de MAX_DOWNLOAD, ou zip au-delà de MAX_UNZIP : arrêté."""


MAX_UNZIP = 2 * 1024 ** 3  # plafond de la taille décompressée d'un zip lu par le lanceur (CIFP, archive des données)


def zip_check(zf, max_bytes=None, depth=None):
    """Les entrées d'un zip lu par le lanceur, contrôlé avant toute lecture : la somme des tailles décompressées annoncées
    (ZipInfo.file_size) au plus max_bytes (MAX_UNZIP par défaut ; zipfile ne rend jamais plus que la taille annoncée d'une
    entrée, une taille fausse finit en erreur de CRC), sinon TooLarge ; depth : une entrée sous plus de depth dossiers, ValueError."""
    infos = zf.infolist()
    cap = MAX_UNZIP if max_bytes is None else max_bytes
    total = sum(i.file_size for i in infos)
    if total > cap:
        raise TooLarge(f'zip of {total // 1048576} MB once unpacked, over {cap // 1048576} MB')
    if depth is not None and any(i.filename.replace('\\', '/').strip('/').count('/') > depth for i in infos):
        raise ValueError(f'zip-too-deep: entries under more than {depth} folder(s)')
    return infos


_OPENER = outbound.opener(what='travail', quiet=(404, 410))  # même hôte (outbound.SameHost) ; une absence (404, 410) : le travail la dit


def download(url, timeout=120, max_bytes=None):
    """(statut, octets) d'une adresse calculée par un verbe : réponse lue par morceaux et arrêtée au plafond (TooLarge), redirection
    vers un autre hôte refusée ; une erreur HTTP rend son statut et b''."""
    cap = MAX_DOWNLOAD if max_bytes is None else max_bytes
    try:
        with _OPENER.open(urllib.request.Request(url), timeout=timeout) as r:
            size = r.headers.get('Content-Length')
            if size and size.isdigit() and int(size) > cap:
                raise TooLarge(f'response of {int(size) // 1048576} MB, over {cap // 1048576} MB')
            parts, n = [], 0
            while True:
                part = r.read(1 << 16)
                if not part:
                    return r.status, b''.join(parts)
                n += len(part)
                if n > cap:
                    raise TooLarge(f'response over {cap // 1048576} MB')
                parts.append(part)
    except urllib.error.HTTPError as e:
        return e.code, b''


def commit_outputs(ctx, author, paths, message):
    """Le seul commit des sorties dans data/, pour tous les verbes : `git add` puis `git commit -m … -- <chemins>` (avec chemins :
    HEAD plus ces fichiers tels qu'ils sont sur le disque, jamais l'index ni un autre chemin ; ce que l'utilisateur a mis en
    attente ailleurs reste où il est), auteur = le trigramme de la page (jamais un auteur de poste), pas de push. Chemins
    relatifs à data/, sous les sorties (OUTPUTS) seulement. Rend { commit: SHA | None, warning: texte | None } : pas de dépôt,
    pas de trigramme, chemin refusé, rien de changé ou git en échec → commit None et la raison."""
    data, git_cmd, git_env = ctx.get('data'), ctx.get('git_cmd'), ctx.get('git_env', dict)
    paths = [str(p).replace('\\', '/') for p in paths or []]
    bad = [p for p in paths if not p or p.startswith('/') or '..' in p.split('/') or re.search(r'[:*?\[\]\\]', p)
           or not any(p == o or (o.endswith('/') and p.startswith(o)) for o in OUTPUTS)]
    if bad or not paths:
        return {'commit': None, 'warning': f'refused path: {bad[0] if bad else "(none)"}'}
    if not (isinstance(author, str) and TRIGRAM.fullmatch(author)):
        return {'commit': None, 'warning': 'no trigram: nothing committed'}
    if not git_cmd or not data or not os.path.isdir(os.path.join(data, '.git')):
        return {'commit': None, 'warning': "data/ is not a git repository: nothing committed"}
    if os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):  # un commit la conclurait, ou git le refuse
        return {'commit': None, 'warning': 'a merge is pending in data/ (interrupted synchronisation): nothing committed; '
                                           '"Synchronise" cancels it and merges again'}
    env = dict(git_env(), GIT_LITERAL_PATHSPECS='1')  # chaque chemin est un nom de fichier, jamais un motif

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
            # un verbe déjà défini (par le socle ou un autre jeu) n'est jamais écrasé : ce fichier est refusé, et dit
            taken = [k for k in verbs if k in REGISTRY]
            if taken:
                raise ValueError(f'verb already defined: {taken[0][0]}/{taken[0][1]}')
            REGISTRY.update(verbs)
            # un délai n'est jamais abaissé par un jeu (celui d'EAD Basic fait partie de ses conditions) : le plus long gagne
            for k, v in gaps.items():
                if isinstance(k, tuple) and isinstance(v, (int, float)):
                    MIN_GAP[k] = max(float(v), float(MIN_GAP.get(k, 0)))
        except Exception as e:  # un jeu en échec ne fait pas tomber le lanceur
            errors.append((n, str(e)[:200]))
    return errors


REGISTRY = {
    ('state', 'scan'): (_scan, lambda a: {} if not a else None),
}
