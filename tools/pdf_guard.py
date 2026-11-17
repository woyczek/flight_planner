"""La lecture des PDF par le LANCEUR, sans que le lanceur ne charge jamais de bibliothèque de PDF (Q-0053 : oui à pypdf et pdfplumber en OPTION ; avis de Sécurisation du 14 novembre 2026).

Règles (celles de l'ergonomie et de Sécurisation, toutes tenues ici) :
  · le lanceur n'IMPORTE JAMAIS pypdf, pdfplumber, pdfminer ni Pillow : il lit leurs versions dans un sous-processus isolé (`python -I -c`, importlib.metadata : aucune ligne de ces bibliothèques ne s'y exécute) et lit un PDF dans un
    AUTRE sous-processus (tools/pdf_child.py) ; ni le lanceur ni la page n'installent quoi que ce soit : une bibliothèque qui manque ou trop ancienne est DITE, avec le NOM du script à lancer (SOG-0376 : installer_bibliotheques.cmd ou .sh, jamais une commande pip à recopier) ;
  · les minima (MINIMA) sont ceux de Sécurisation et viennent du SEUL fichier des bornes, tools/requirements-optional.txt, que lit aussi le script d'installation (tools/optional_libs.py, un lecteur strict) : pypdf ≥ 6.21.4 (trois avis de
    déni de service avant), pdfplumber ≥ 0.11.10 (qui exige pdfminer.six 20260107, sans avis), Pillow ≥ 13.0.0 (39 avis avant, tous corrigés) ; la version est comparée en NOMBRES (pdfminer.six est une date) ; un fichier des bornes refusé
    rend l'état « bornes illisibles » et n'autorise AUCUNE lecture ;
  · le sous-processus de lecture : `python -I` (ni dossier courant ni variables PYTHON*), dossier courant = un dossier temporaire VIDE, environnement NETTOYÉ (rien d'autre que SYSTEMROOT), délai dur avec arrêt de TOUT l'arbre
    de processus (objet Job sous Windows, groupe de processus ailleurs), mémoire limitée (MEMORY_LIMIT : objet Job sous Windows, RLIMIT_AS ailleurs), pages comptées, rend son résultat dans UN fichier de son dossier temporaire (taille
    bornée) ; ce résultat est une ENTRÉE NON FIABLE : JSON sans nombre non fini, deux champs fermés, textes nettoyés des caractères de contrôle et bornés ;
  · le PDF lu reste sous data/local/upload/ ou data/sia/zones/<zone>/ (chemin réel, sans lien, nom par motif, taille bornée), jamais pris d'une donnée du dépôt.
Bibliothèque standard seulement."""
import json
import os
import re
import shutil
import site
import subprocess
import sys
import tempfile
import time

import optional_libs

try:
    GROUPS = optional_libs.load()
    BOUNDS_ERROR = None
except ValueError as _e:      # fichier des bornes refusé : rien n'est lu, et l'état le dit (jamais « prête » sur des bornes inconnues)
    GROUPS, BOUNDS_ERROR = [], str(_e)
MINIMA = optional_libs.minima(GROUPS)      # (paquet, minimum inclus, maximum exclu ou None), du fichier des bornes
SCRIPT = 'installer_bibliotheques.cmd' if sys.platform == 'win32' else 'installer_bibliotheques.sh'      # le script à la racine de la suite, nommé dans chaque phrase d'échec
PURPOSES = {'text': ('pypdf',), 'vectors': ('pdfplumber', 'pdfminer.six', 'Pillow'), 'ocr': ('pypdfium2', 'rapidocr-onnxruntime')}           # ce que chaque lecture exige
HOW_TO = f'À faire : lancer {SCRIPT}, dans le dossier de la suite, puis relancer le lanceur.'      # le texte FIXE du remède : jamais construit depuis un contenu
MAX_PDF_BYTES = 1024 ** 3               # l'AIP civil du Royaume-Uni fait 772 Mo
MAX_PAGES = 400
MAX_CHARS_PAGE = 200_000
MAX_OUT_BYTES = 4_000_000
MEMORY_LIMIT = 2 * 1024 ** 3
TIMEOUT = 120
VERSION_TIMEOUT = 20
NAME = re.compile(r'[A-Za-z0-9][A-Za-z0-9._ -]{0,118}\.pdf', re.I)
ZONE = re.compile(r'[a-z]{2,4}')
_HERE = os.path.dirname(os.path.abspath(__file__))
_CHILD = os.path.join(_HERE, 'pdf_child.py')


class PdfError(Exception):
    """Une lecture refusée ou échouée ; `reason` : missing | version | path | timeout | failed | output."""

    def __init__(self, reason, message):
        super().__init__(message)
        self.reason = reason


# ----------------------------------------------------------------------------------------------------------------------- versions (sans importer)
def _dirs():
    """Les dossiers des paquets du lanceur (le sous-processus est `-I` : il ne voit pas les paquets « --user » sans qu'on les lui dise)."""
    out = []
    try:
        # Comme Python hors -I : le site utilisateur prime sur le site global.
        # Respecter aussi -s, PYTHONNOUSERSITE et les environnements virtuels.
        out = ([site.getusersitepackages()] if site.ENABLE_USER_SITE else []) + list(site.getsitepackages())
    except Exception:
        pass
    return [d for d in out if isinstance(d, str) and os.path.isdir(d)]


def _env():
    return {k: os.environ[k] for k in ('SYSTEMROOT',) if k in os.environ}


def versions(names=None):
    """{ paquet: version ou None } lues par importlib.metadata dans un sous-processus isolé : la bibliothèque n'est PAS importée."""
    names = list(names or [m[0] for m in MINIMA])
    code = ('import importlib.metadata as m, json, sys\npackage_dirs = json.loads(sys.argv[1])\nsys.path[:] = [p for p in sys.path if p not in package_dirs] + package_dirs\nout = {}\nfor n in json.loads(sys.argv[2]):\n'
            '    try:\n        out[n] = m.version(n)\n    except Exception:\n        out[n] = None\nprint(json.dumps(out))\n')
    try:
        r = subprocess.run([sys.executable, '-I', '-c', code, json.dumps(_dirs()), json.dumps(names)], capture_output=True, timeout=VERSION_TIMEOUT, cwd=tempfile.gettempdir(), env=_env(),
                           stdin=subprocess.DEVNULL, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        raw = json.loads(r.stdout.decode('utf-8', 'replace')[:20000])
    except (OSError, ValueError, subprocess.SubprocessError):
        return {n: None for n in names}
    return {n: (raw.get(n) if isinstance(raw.get(n), str) and re.fullmatch(r'[0-9][0-9A-Za-z.+!_-]{0,30}', raw.get(n)) else None) for n in names}


def _nums(v):
    return tuple(int(x) for x in re.findall(r'\d+', str(v))[:6])


def judge(name, have):
    """'missing' | 'old' | 'new' | 'ok' d'une version lue, d'après MINIMA (comparaison en nombres)."""
    spec = next((m for m in MINIMA if m[0] == name), None)
    if not have:
        return 'missing'
    if not spec:
        return 'ok'
    if _nums(have) < _nums(spec[1]):
        return 'old'
    if spec[2] and _nums(have) >= _nums(spec[2]):
        return 'new'
    return 'ok'


_STATUS = {'at': 0.0, 'value': None}
STATUS_TTL = 5.0                           # secondes : une page qui appelle `pdf/status` en boucle ne lance pas un sous-processus à chaque fois


def status(versions_of=None):
    """L'état des paquets, pour la page (verbe `pdf/status`, lecture seule) : { packages: [{ name, version, minimum, maximum, state }], ready: { text, vectors }, command, python }. Sans `versions_of`, la réponse est gardée STATUS_TTL secondes."""
    now = time.monotonic()
    if versions_of is None and _STATUS['value'] is not None and now - _STATUS['at'] < STATUS_TTL:
        return json.loads(json.dumps(_STATUS['value']))
    have = (versions_of or versions)()
    packages = [{'name': n, 'version': have.get(n), 'minimum': lo, 'maximum': hi, 'state': judge(n, have.get(n))} for n, lo, hi in MINIMA]
    by = {p['name']: p['state'] for p in packages}
    ready = {k: bool(MINIMA) and all(by.get(n) == 'ok' for n in v) for k, v in PURPOSES.items()}
    groups = [{'id': g['id'], 'packages': [p[0] for p in g['packages']], 'ready': all(by.get(p[0]) == 'ok' for p in g['packages'])} for g in GROUPS]
    out = {'packages': packages, 'groups': groups, 'ready': ready, 'script': SCRIPT, 'python': '.'.join(map(str, sys.version_info[:3]))}
    if BOUNDS_ERROR:
        out['error'] = 'bounds'
    if versions_of is None:
        _STATUS['at'], _STATUS['value'] = now, json.loads(json.dumps(out))
    return out


def require(purpose, versions_of=None):
    """Lève PdfError('missing' | 'version') avec la commande si une bibliothèque de `purpose` manque ou est trop ancienne."""
    if BOUNDS_ERROR:
        raise PdfError('failed', 'lecture de PDF impossible : le fichier des bornes (tools/requirements-optional.txt) est refusé ; rien n’est lu. ' + HOW_TO)
    st = status(versions_of)
    bad = [p for p in st['packages'] if p['name'] in PURPOSES[purpose] and p['state'] != 'ok']
    if bad:
        # un texte FIXE : les noms viennent de la liste fermée, l'état est un des quatre mots du jugement, la version lue n'est PAS recopiée (la page la dit, à son tour, depuis `pdf/status`)
        what = ', '.join(f"{p['name']} {'absent' if p['state'] == 'missing' else 'trop ancienne' if p['state'] == 'old' else 'trop récente'}" for p in bad)
        raise PdfError('missing' if all(p['state'] == 'missing' for p in bad) else 'version', f'lecture de PDF impossible : {what}. {HOW_TO}')


# ----------------------------------------------------------------------------------------------------------------------- le chemin du PDF
def safe_pdf(data, path):
    """Le chemin réel d'un PDF sous data/local/upload/, data/sia/zones/<zone>/ ou data/local/vac/<AAAA-MM-JJ>/ (les cartes VAC de la reconstruction VFR, SOG-0427) ; PdfError('path') sinon (nom par motif, aucun lien, un fichier, ≤ MAX_PDF_BYTES)."""
    try:
        root = os.path.realpath(str(data))
        p = os.path.abspath(str(path))
        name = os.path.basename(p)
        if not NAME.fullmatch(name):
            raise PdfError('path', 'nom de fichier refusé')
        rel_path = os.path.relpath(p, os.path.abspath(str(data)))
        rel = rel_path.replace('\\', '/').split('/')
        okfolder = ((rel[:2] == ['local', 'upload'] and len(rel) == 3) or (rel[:2] == ['sia', 'zones'] and len(rel) == 4 and bool(ZONE.fullmatch(rel[2])))
                    or (rel[:2] == ['local', 'vac'] and len(rel) == 4 and bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', rel[2], re.A))))
        if rel[0] == '..' or not okfolder:
            raise PdfError('path', 'le PDF doit être sous data/local/upload/, data/sia/zones/<zone>/ ou data/local/vac/<cycle>/')
        if os.path.normcase(os.path.realpath(p)) != os.path.normcase(os.path.join(root, rel_path)):
            raise PdfError('path', 'un lien n’est pas suivi')
        if not os.path.isfile(p) or os.path.getsize(p) > MAX_PDF_BYTES:
            raise PdfError('path', 'pas un fichier, ou trop gros')
        return p
    except (OSError, ValueError):
        raise PdfError('path', 'chemin refusé') from None


# ----------------------------------------------------------------------------------------------------------------------- le sous-processus
def _jobify(proc, memory):
    """Windows : le processus entre dans un objet Job (mémoire limitée, tout l'arbre arrêté à sa fermeture) ; rend le Job ou None ailleurs."""
    if os.name != 'nt':
        return None
    import ctypes
    from ctypes import wintypes
    k = ctypes.WinDLL('kernel32', use_last_error=True)

    class Basic(ctypes.Structure):
        _fields_ = [('PerProcessUserTimeLimit', ctypes.c_int64), ('PerJobUserTimeLimit', ctypes.c_int64), ('LimitFlags', wintypes.DWORD), ('MinimumWorkingSetSize', ctypes.c_size_t),
                    ('MaximumWorkingSetSize', ctypes.c_size_t), ('ActiveProcessLimit', wintypes.DWORD), ('Affinity', ctypes.c_size_t), ('PriorityClass', wintypes.DWORD), ('SchedulingClass', wintypes.DWORD)]

    class Counters(ctypes.Structure):
        _fields_ = [(n, ctypes.c_uint64) for n in ('r', 'w', 'o', 'rb', 'wb', 'ob')]

    class Extended(ctypes.Structure):
        _fields_ = [('Basic', Basic), ('Io', Counters), ('ProcessMemoryLimit', ctypes.c_size_t), ('JobMemoryLimit', ctypes.c_size_t), ('PeakProcessMemoryUsed', ctypes.c_size_t), ('PeakJobMemoryUsed', ctypes.c_size_t)]
    k.CreateJobObjectW.restype = wintypes.HANDLE
    job = k.CreateJobObjectW(None, None)
    if not job:
        return None
    info = Extended()
    info.Basic.LimitFlags = 0x100 | 0x2000 | 0x8                 # JOB_OBJECT_LIMIT_PROCESS_MEMORY | KILL_ON_JOB_CLOSE | ACTIVE_PROCESS (le lecteur n'a aucune raison de lancer un processus fils)
    info.Basic.ActiveProcessLimit = 2 if sys.prefix != getattr(sys, 'base_prefix', sys.prefix) else 1          # un environnement virtuel lance l'interpréteur de base comme fils : un processus de plus
    info.ProcessMemoryLimit = int(memory)
    k.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    k.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    if not k.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)) or not k.AssignProcessToJobObject(job, wintypes.HANDLE(int(proc._handle))):
        k.CloseHandle.argtypes = [wintypes.HANDLE]
        k.CloseHandle(job)
        return None
    return job


def _kill(proc, job):
    """Arrête le processus et TOUT son arbre."""
    try:
        if job is not None:
            import ctypes
            from ctypes import wintypes
            k = ctypes.WinDLL('kernel32')
            k.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
            k.TerminateJobObject(job, 1)
        elif os.name != 'nt':
            import signal
            os.killpg(proc.pid, signal.SIGKILL)
        else:
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], capture_output=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        pass
    try:
        proc.kill()
    except OSError:
        pass


def _clean(res):
    """Le résultat du sous-processus (entrée non fiable) → { pages, texts, fonts } fermé, ou PdfError('output') ; `fonts` (le nombre d'avertissements « fontTools absent » de pypdf, SOG-0427) est
    facultatif dans la réponse (un entier de 0 à 1 000 000) et vaut 0 sans lui."""
    if not isinstance(res, dict) or not {'pages', 'texts'} <= set(res) <= {'pages', 'texts', 'fonts'} or not isinstance(res['pages'], int) or isinstance(res['pages'], bool) or not 0 <= res['pages'] <= 100000 \
            or not isinstance(res['texts'], list) or len(res['texts']) > MAX_PAGES or any(not isinstance(t, str) for t in res['texts']) \
            or ('fonts' in res and (not isinstance(res['fonts'], int) or isinstance(res['fonts'], bool) or not 0 <= res['fonts'] <= 1_000_000)):
        raise PdfError('output', 'la réponse du lecteur de PDF n’a pas la forme attendue')
    return {'pages': res['pages'], 'texts': [re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', ' ', t)[:MAX_CHARS_PAGE] for t in res['texts']], 'fonts': res.get('fonts', 0)}


def _refuse(name):
    raise ValueError('nombre non fini : ' + name)


def _run_child(argv_of, timeout, memory, child=None, max_out=MAX_OUT_BYTES):
    """Lance le sous-processus borné (python -I, dossier courant temporaire vide, environnement nettoyé, mémoire et délai bornés, tout l'arbre arrêté) avec les arguments `argv_of(fichier de sortie)` et rend l'objet JSON
    qu'il a écrit (une ENTRÉE NON FIABLE : à valider par l'appelant) ; PdfError timeout / failed / output. Le dossier temporaire est effacé à chaque fois (succès, échec, délai)."""
    tmp = tempfile.mkdtemp(prefix='pdfread-')
    out = os.path.join(tmp, 'out.json')
    proc = job = None
    try:
        kw = {'creationflags': getattr(subprocess, 'CREATE_NO_WINDOW', 0) | getattr(subprocess, 'CREATE_NEW_PROCESS_GROUP', 0)} if os.name == 'nt' else {'start_new_session': True}
        if os.name != 'nt':
            import resource

            def limit():
                resource.setrlimit(resource.RLIMIT_AS, (int(memory), int(memory)))
            kw['preexec_fn'] = limit
        proc = subprocess.Popen([sys.executable, '-I', child or _CHILD, *argv_of(out)], cwd=tmp, env=_env(),
                                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)
        job = _jobify(proc, memory)
        if os.name == 'nt' and job is None:                     # sans objet Job : NI limite de mémoire NI arrêt de l'arbre : la lecture est refusée, jamais faite sans limite
            _kill(proc, None)
            raise PdfError('failed', 'la limite de mémoire du lecteur de PDF n’a pas pu être posée : lecture refusée')
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            _kill(proc, job)
            raise PdfError('timeout', f'lecture abandonnée après {timeout} s') from None
        if proc.returncode != 0 or not os.path.isfile(out):
            raise PdfError('failed', f'le lecteur de PDF s’est arrêté (code {proc.returncode}) : PDF illisible, ou mémoire au-delà de {int(memory) // 1024 ** 2} Mo')
        if os.path.getsize(out) > max_out:
            raise PdfError('output', 'la réponse du lecteur de PDF est trop grosse')
        try:
            with open(out, encoding='utf-8') as f:
                return json.load(f, parse_constant=_refuse)
        except (OSError, ValueError, RecursionError):
            raise PdfError('output', 'la réponse du lecteur de PDF est illisible') from None
    finally:
        if proc is not None and proc.poll() is None:
            _kill(proc, job)
            try:
                proc.wait(5)
            except subprocess.SubprocessError:
                pass
        if job is not None:
            try:
                import ctypes
                from ctypes import wintypes
                k = ctypes.WinDLL('kernel32')
                k.CloseHandle.argtypes = [wintypes.HANDLE]
                k.CloseHandle(job)
            except OSError:
                pass
        for _ in range(5):                       # Windows : un fichier encore tenu par le processus qui s'arrête
            try:
                shutil.rmtree(tmp)
                break
            except OSError:
                time.sleep(0.2)


def read_text(data, path, first=0, count=MAX_PAGES, timeout=TIMEOUT, memory=MEMORY_LIMIT, versions_of=None, child=None):
    """Le texte des pages [first, first + count) d'un PDF déposé : { pages (le total), texts [un texte par page lue], fonts }, lu par pypdf dans un SOUS-PROCESSUS (voir l'en-tête). PdfError : manque / version / path / timeout /
    failed / output. `child` : le script du sous-processus (les essais seulement)."""
    path = safe_pdf(data, path)
    require('text', versions_of)
    first, count = max(0, int(first)), max(1, min(int(count), MAX_PAGES))
    return _clean(_run_child(lambda out: [path, out, str(first), str(first + count), str(MAX_CHARS_PAGE), json.dumps(_dirs())], timeout, memory, child))


# ----------------------------------------------------------------------------------------------------------------------- la lecture par paquets (SOG-0427)
PACK = 25                                 # des PDF lus par un même sous-processus : le démarrage de Python et de pypdf se paie une fois par paquet, pas une fois par carte
MAX_PACK_CHARS = 16_000_000               # le texte d'un paquet, tout compris : au-delà, le reste du paquet n'est pas gardé (dit « output »)
MAX_PACK_OUT = 40_000_000                 # la réponse d'un paquet, en octets


def _clean_item(item):
    """Un élément de la réponse d'un paquet (entrée non fiable) → { pages, texts, fonts } fermé, ou { error: 'failed' } : `{ ok: false }` (le fichier n'a pas pu être lu : il est dit, les autres sont lus), ou une forme que `_clean` refuse."""
    if isinstance(item, dict) and item.get('ok') is True:
        try:
            return _clean({k: v for k, v in item.items() if k != 'ok'})
        except PdfError:
            return {'error': 'output'}
    return {'error': 'failed'}


def read_many(data, paths, pack=PACK, timeout=TIMEOUT, memory=MEMORY_LIMIT, versions_of=None, child=None, on_pack=None):
    """Le texte de PLUSIEURS PDF (SOG-0427 : les cartes VAC d'un cycle, 420 d'un coup), par PAQUETS : un sous-processus borné par paquet de `pack` PDF (mêmes bornes de mémoire et de temps que read_text, posées par paquet), au lieu d'un par PDF.
    Rend une liste alignée sur `paths` : { pages, texts, fonts } pour un PDF lu, { error: 'path' | 'failed' | 'timeout' | 'output' | 'cancelled' } sinon : UN fichier illisible n'emporte pas son paquet (le sous-processus le dit, lit les autres) ; un
    paquet qui s'arrête (mémoire, délai, plantage) est relu FICHIER PAR FICHIER, pour que seul le fautif soit dit en échec. PdfError seulement si une bibliothèque manque ou est trop ancienne (require, une fois). `on_pack(fait, total)` est
    appelé avant chaque paquet (un signe de vie ; faux : la suite n'est pas lue, « cancelled »)."""
    require('text', versions_of)
    pack = max(1, min(int(pack), 100))
    results = [None] * len(paths)
    todo = []
    for i, p in enumerate(paths):
        try:
            todo.append((i, safe_pdf(data, p)))
        except PdfError as e:
            results[i] = {'error': e.reason}
    for k in range(0, len(todo), pack):
        chunk = todo[k:k + pack]
        if on_pack is not None and on_pack(k, len(todo)) is False:
            for i, _ in chunk:
                results[i] = {'error': 'cancelled'}
            continue
        names = [sp for _, sp in chunk]
        try:
            res = _run_child(lambda out: ['--many', out, str(MAX_CHARS_PAGE), str(MAX_PAGES), str(MAX_PACK_CHARS), json.dumps(_dirs()), *names], timeout, memory, child, MAX_PACK_OUT)
            items = res.get('items') if isinstance(res, dict) and set(res) == {'items'} else None
            if not isinstance(items, list) or len(items) != len(chunk):
                raise PdfError('output', 'la réponse du lecteur de PDF n’a pas la forme attendue')
            for (i, _), item in zip(chunk, items):
                results[i] = _clean_item(item)
        except PdfError:
            for i, sp in chunk:                # le paquet s'est arrêté : chaque PDF est relu seul, pour que seul le fautif soit dit
                try:
                    results[i] = _clean(_run_child(lambda out, sp=sp: [sp, out, '0', str(MAX_PAGES), str(MAX_CHARS_PAGE), json.dumps(_dirs())], timeout, memory, child))
                except PdfError as e:
                    results[i] = {'error': e.reason}
    return results
