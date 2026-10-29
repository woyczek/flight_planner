"""La base aéronautique construite sur le poste, SANS FENÊTRE (jeu « base » du lanceur ; lot D5, DECISIONS de frame/aerodb du 30 octobre 2026 ;
frame/aerodb/INTEGRATION.md « Building on the workstation ») — chargé par regen_jobs.load_verbs(). Bibliothèque standard seulement.

Verbe `base/build`, arguments `{ zones: [identifiants], personal?: [sources], parallel?: faux }`. Les constructeurs sont ceux de la page
(shared/sia_base.js, aero_sources.js, aero_zones.js) : ils tournent dans le navigateur du poste (Edge, sinon Chrome) sans fenêtre
(frame/aerodb/build/headless.html). Rien n'est porté en Python ; ce module orchestre :
  * le navigateur est cherché par CHEMIN ABSOLU seulement (find_browser) ; introuvable → { ok: False, reason: 'no-browser' } ;
  * PAR DÉFAUT UNE SEULE INSTANCE construit toutes les zones demandées avec les fonctions de la page (SiaBase.buildZones : la sortie est celle de la
    page, octet pour octet) et remet chaque zone dès qu'elle est prête ; le travail commite chaque zone SEULE à mesure (commit_outputs) ;
  * `parallel` (mode interne, pas dans l'interface) : une instance par zone, au plus (cœurs − 1, au moins 1) à la fois, bornées par la mémoire libre
    (≈ 500 Mo par instance, davantage pour une grosse entrée : can_start()) ; les plus lourdes d'abord (mesures : DECISIONS du 30 octobre) ;
  * chaque instance : profil temporaire (supprimé ensuite, même en échec ou annulation), pas de réseau hors de l'adresse du lanceur (proxy mort +
    « <-loopback>;adresse »), délai limité, processus tué avec ses enfants ;
  * la sortie d'une zone (13 fichiers JSON) est contrôlée, écrite sous data/sia/base/<zone>/<cycle>/ par la règle de chemin du lanceur, puis VALIDÉE
    SEULE par regen_jobs.commit_outputs : une zone en échec ne publie rien et n'arrête pas les autres.

Transport (décision du cadre, 30 octobre) : UNE seule adresse, celle du LANCEUR ; pas de second serveur. La page charge ses scripts (/frame/…,
/shared/…) et ses entrées (/data/sia/…) du lanceur et remet chaque zone par POST /__setup/regen/job/put { job, token, zone, files } (regen_jobs.Jobs.put :
409 pas le travail en cours, 403 jeton faux, 400 zone hors de args.zones ou nom refusé, 413 plus de 64 Mo ; la route n'écrit rien) ; le verbe la reçoit par
job.take(zone, timeout). Le jeton (job.token) n'est JAMAIS dans une ligne de commande : le navigateur reçoit l'adresse fichier d'un start.html écrit dans le
profil temporaire (write_start_page), dont le script mène à la page du lanceur (jeton dans le FRAGMENT) ; start.html est supprimé dès que la page dit
« started » (ligne de console `SOGB`), le profil entier à la fin. L'adresse du lanceur : launcher_origin().

État lisible par la page (GET regen/job?id=) : job.data['zones'] = { zone: { state ('waiting' | 'building' | 'built' | 'failed' | 'cancelled'), done, total
(sources lues / à lire), error (code), message?, commit?, warning?, files?, seconds? } }, step « N zones sur M », done / total en zones.
Résultat : { ok, cycle, built: [zones], failed: [{ zone, error }], commits: [{ zone, commit }], zones, instances, seconds, reason? } ; reason : 'partial', 'failed',
'cancelled' ; refus du travail (ok: False) : 'no-browser', 'no-input', 'xplane-in-page' ('xplane' dans personal : le dossier d'X-Plane est une poignée gardée
par la page, ce travail reste dans la page), 'failed' (adresse du lanceur inconnue). Codes d'une zone : 'browser-failed', 'browser-exited', 'timeout',
'page-error', 'invalid-output', 'write-failed', 'cancelled'.
Crochets des essais (ctx, jamais posés par le lanceur) : 'browser' (chemin absolu, ou liste de chemins absolus : un faux navigateur et son script), 'origin',
'cores', 'free_memory' (octets ou fonction), 'zone_timeout', 'start_timeout' (secondes), 'per_instance' (octets), 'debug'.
"""
import ctypes
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs, Job)

PAGE = 'frame/aerodb/build/headless.html'
# fichiers du code que la page lit (le même ensemble que la page V2 : constructeurs, lecteurs, contours des zones, villes) ; rien d'autre
ZONES_GEO = 'shared/carto/aero_zones_geo.js'

# les 12 fichiers d'une zone (frame/aerodb/SPEC.md : une sorte par fichier), son entrée du manifeste, et les grandes villes du monde
KINDS = {'airspaces': list, 'aerodromes': list, 'navaids': list, 'points': list, 'vrp': list, 'airways': list, 'obstacles': list,
         'aeroindex': dict, 'mora': list, 'obstaclemax': dict, 'cities': list, 'meta': dict}
MANIFEST = 'manifest.json'
MAJOR = 'cities_major.json'
ZONE_ID = re.compile(r'^[a-z0-9_-]{2,12}$')
CYCLE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
AIRAC_NAME = re.compile(r'^(?:AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)(\d{4}-\d{2}-\d{2})\.xml$', re.I)
SAFE_NAME = re.compile(r'^[\w .()+-]{1,150}$')          # nom de fichier d'entrée admis (jamais « | », « # », « % », « : », séparateur)
INPUT_EXT = re.compile(r'\.(xml|geojson|json|txt|air)$', re.I)
SUB_DIRS = ('openaip', 'aixm5', 'geojson')               # sous-dossiers des sources dans data/sia/ (sia_base.js : SOURCE_DIRS) ; zones/<zone>/ en plus

PER_INSTANCE = 500 * 1024 * 1024  # mémoire comptée par instance (au moins)
GROWTH = 15                       # secondes pendant lesquelles une instance qui vient de partir est comptée en entier (sa mémoire n'est pas encore prise)
ZONE_TIMEOUT = 900                # secondes par instance
START_TIMEOUT = 45                # secondes pour que la page dise « started » (sinon : refusée par le lanceur, introuvable…)
LINE_MAX = 4000
MIN_GAP = {}                      # pas de délai minimal entre deux départs


# ----------------------------------------------------------------------------------------------------------------------- le navigateur
def _abs_file(path):
    """Chemin absolu d'un fichier qui existe (pas un dossier, pas un lien) ; '' sinon."""
    try:
        if isinstance(path, str) and os.path.isabs(path) and os.path.isfile(path) and not os.path.islink(path):
            return os.path.normpath(path)
    except (OSError, ValueError):
        pass
    return ''


def browser_candidates(environ=None, platform=None):
    """Emplacements connus d'Edge puis de Chrome : des chemins ABSOLUS, jamais un nom nu résolu par PATH ou par le dossier courant
    (l'esprit de NoDefaultCurrentDirectoryInExePath). Windows : Program Files, Program Files (x86) et %LOCALAPPDATA% (Chrome par utilisateur),
    dont la variable doit elle-même être un chemin absolu ; macOS et Linux : les emplacements habituels."""
    env = os.environ if environ is None else environ
    plat = platform or sys.platform
    out = []
    if plat.startswith('win'):
        def under(var, *parts):
            root = env.get(var, '')
            if root and os.path.isabs(root):
                out.append(os.path.join(root, *parts))
        edge, chrome = ('Microsoft', 'Edge', 'Application', 'msedge.exe'), ('Google', 'Chrome', 'Application', 'chrome.exe')
        for var in ('ProgramFiles(x86)', 'ProgramFiles'):
            under(var, *edge)
        for var in ('ProgramFiles', 'ProgramFiles(x86)', 'LOCALAPPDATA'):
            under(var, *chrome)
    elif plat == 'darwin':
        out += ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    else:
        out += ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/opt/microsoft/msedge/msedge', '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']
    return out


def find_browser(ctx=None):
    """Commande de base du navigateur (liste de chemins absolus) ou None. Le crochet d'essai ctx['browser'] (un chemin absolu, ou une liste :
    un interpréteur et son script) remplace la recherche, avec les mêmes contrôles ; il n'y a aucun autre repli, en particulier aucun nom
    résolu par PATH ni par le dossier courant."""
    hook = (ctx or {}).get('browser')
    if hook:
        parts = [hook] if isinstance(hook, str) else list(hook)
        checked = [_abs_file(p) for p in parts]
        return checked if parts and all(checked) else None
    for p in browser_candidates():
        if _abs_file(p):
            return [os.path.normpath(p)]
    return None


# les options : sans fenêtre, profil temporaire à usage unique, rien d'installé ni de synchronisé, et AUCUN réseau hors de l'adresse du
# travail : le proxy mort refuse tout, « <-loopback> » retire le contournement implicite des adresses locales (sinon les autres ports de
# cette machine, dont le lanceur, resteraient joignables), et seule l'adresse du travail est contournée ; les noms d'hôte ne se résolvent plus
def browser_args(profile, netloc, url):
    return ['--headless=new', f'--user-data-dir={profile}', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
            '--disable-sync', '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
            '--metrics-recording-only', '--mute-audio', '--disable-gpu', '--disable-breakpad', '--no-pings',
            '--proxy-server=127.0.0.1:9', f'--proxy-bypass-list=<-loopback>;{netloc}',
            '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
            '--enable-logging=stderr', '--v=0', url]


def kill_tree(proc):
    """Arrête le processus et tous ses enfants (Windows : taskkill /T /F par numéro, liste d'arguments, jamais d'interpréteur de commandes ;
    ailleurs : le groupe de processus) puis attend sa fin. Ne lève jamais."""
    if proc is None:
        return
    try:
        if proc.poll() is None:
            if sys.platform.startswith('win'):
                tk = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32', 'taskkill.exe')
                subprocess.run([tk, '/PID', str(proc.pid), '/T', '/F'], capture_output=True, timeout=30)
            else:
                os.killpg(proc.pid, signal.SIGKILL)
    except (OSError, subprocess.SubprocessError, ProcessLookupError):
        pass
    try:
        proc.kill()
    except OSError:
        pass
    try:
        proc.wait(timeout=15)
    except (OSError, subprocess.SubprocessError):
        pass


def remove_tree(path):
    """Supprime le profil temporaire (Windows garde un instant les fichiers d'un processus qui vient de finir : quelques essais)."""
    for _ in range(20):
        shutil.rmtree(path, ignore_errors=True)
        if not os.path.exists(path):
            return True
        time.sleep(0.25)
    return not os.path.exists(path)


# ----------------------------------------------------------------------------------------------------------------------- mémoire et cœurs
def free_memory():
    """Mémoire physique disponible, en octets (Windows : GlobalMemoryStatusEx ; Linux : MemAvailable de /proc/meminfo) ; None si inconnue."""
    try:
        if sys.platform.startswith('win'):
            class Status(ctypes.Structure):
                _fields_ = [('dwLength', ctypes.c_ulong), ('dwMemoryLoad', ctypes.c_ulong), ('ullTotalPhys', ctypes.c_ulonglong),
                            ('ullAvailPhys', ctypes.c_ulonglong), ('ullTotalPageFile', ctypes.c_ulonglong),
                            ('ullAvailPageFile', ctypes.c_ulonglong), ('ullTotalVirtual', ctypes.c_ulonglong),
                            ('ullAvailVirtual', ctypes.c_ulonglong), ('ullAvailExtendedVirtual', ctypes.c_ulonglong)]
            st = Status()
            st.dwLength = ctypes.sizeof(Status)
            return int(st.ullAvailPhys) if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st)) else None
        with open('/proc/meminfo', encoding='ascii') as f:
            for line in f:
                if line.startswith('MemAvailable:'):
                    return int(line.split()[1]) * 1024
    except (OSError, ValueError, AttributeError):
        pass
    return None


def can_start(cores, free, running, need):
    """Peut-on lancer une instance de plus ? running : [(mémoire comptée, âge en secondes)] des instances en cours ; need : la mémoire comptée de
    la suivante. Au plus (cœurs − 1, au moins 1) en même temps ; la mémoire libre doit porter la suivante en plus de ce que les instances
    encore en croissance (moins de GROWTH secondes) n'ont pas encore prise ; la première part toujours. free inconnue (None) : seulement les cœurs."""
    if not running:
        return True
    if len(running) >= max(1, int(cores) - 1):
        return False
    if free is None:
        return True
    return free - sum(n for n, age in running if age < GROWTH) >= need


def need_of(largest):
    """Mémoire comptée pour une zone dont la plus grosse entrée pèse `largest` octets : PER_INSTANCE (≈ 500 Mo, la mesure donne 400 à 450 Mo
    pour une zone d'openAIP) plus 15 fois la plus grosse entrée (le SIA français : 44 Mo d'AIXM, 1,2 Go mesurés)."""
    return PER_INSTANCE + 15 * int(largest)


# ----------------------------------------------------------------------------------------------------------------------- l'adresse du lanceur
def launcher_origin(ctx):
    """L'adresse du lanceur (http://127.0.0.1:<port>), la SEULE que la page de construction charge : ses scripts (/frame/…, /shared/…), les entrées
    (/data/sia/…) et la route de sortie POST /__setup/regen/job/put (regen_jobs.Jobs.put, qui contrôle le travail, le jeton, la zone, les noms et la
    taille ; elle n'écrit rien, le verbe reçoit la sortie par job.take). ctx['origin'] si le lanceur la donne, sinon le port du lanceur en cours (la
    classe Setup de tools/launch.py, lue sans l'importer). '' si elle est inconnue."""
    origin = (ctx.get('origin') or '').rstrip('/')
    if not origin:
        main = sys.modules.get('__main__')
        port = getattr(getattr(main, 'Setup', None), 'port', 0)
        origin = f'http://127.0.0.1:{port}' if isinstance(port, int) and 0 < port < 65536 else ''
    return origin if re.fullmatch(r'http://127[.]0[.]0[.]1:[0-9]{1,5}', origin) else ''


# ----------------------------------------------------------------------------------------------------------------------- les entrées
def zone_ids(root=None):
    """Identifiants des zones (clés de window.AERO_ZONES_GEO, shared/carto/aero_zones_geo.js) ; vide si le fichier ne se lit pas."""
    try:
        with open(os.path.join(root or ROOT, *ZONES_GEO.split('/')), encoding='utf-8') as f:
            text = f.read()
        obj = json.loads(text[text.index('{', text.index('AERO_ZONES_GEO')):text.rindex('}') + 1])
        return [k for k in obj if ZONE_ID.match(k)]
    except (OSError, ValueError):
        return []


_IDS = []


def check(a):
    """Contrôle des arguments (→ 400 si None) : { zones: [identifiants de la liste des zones, 1 à 60, sans doublon], personal?: [sources],
    parallel?: vrai/faux } et rien d'autre. Aucun chemin, aucune adresse, aucune commande ne vient de la page. `parallel` (faux par défaut,
    mode interne, pas dans l'interface) : une instance du navigateur par zone au lieu d'une seule pour toutes (DECISIONS du 30 octobre)."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'personal', 'parallel'} or not isinstance(a.get('zones'), list):
        return None
    zones = [z.strip().lower() if isinstance(z, str) else z for z in a['zones']]
    if not _IDS:
        _IDS.extend(zone_ids())
    if not 1 <= len(zones) <= 60 or any(not isinstance(z, str) or z not in _IDS for z in zones) or len(set(zones)) != len(zones):
        return None
    personal = a.get('personal', [])
    if not isinstance(personal, list) or len(personal) > 10 or any(not isinstance(p, str) or not re.fullmatch(r'[a-z0-9]{2,12}', p) for p in personal):
        return None
    if not isinstance(a.get('parallel', False), bool):
        return None
    return {'zones': zones, 'personal': sorted(set(personal)), 'parallel': a.get('parallel', False)}


def list_inputs(data):
    """Fichiers de data/sia/ que la construction peut lire : { chemin relatif (avec « / »): chemin absolu }. Racine : les XML (SIA, AIXM,
    axes ENR 5.7) et mora.csv ; openaip/, aixm5/, geojson/ et zones/<zone>/ : les fichiers .xml .geojson .json .txt .air. Ni lien, ni nom
    hors de SAFE_NAME, ni fichier caché. Le tri par zone et par source est fait par la page (AeroZones.fileWanted) : une seule règle."""
    root = os.path.join(data, 'sia')
    out = {}

    def scan(folder, prefix, ok):
        try:
            with os.scandir(folder) as it:
                for e in it:
                    if e.name.startswith('.') or not SAFE_NAME.match(e.name) or e.is_symlink() or not e.is_file(follow_symlinks=False):
                        continue
                    if ok(e.name):
                        out[prefix + e.name] = e.path
        except OSError:
            pass
    scan(root, '', lambda n: n.lower().endswith('.xml') or n.lower() == 'mora.csv')
    for d in SUB_DIRS:
        scan(os.path.join(root, d), d + '/', lambda n: bool(INPUT_EXT.search(n)))
    try:
        with os.scandir(os.path.join(root, 'zones')) as it:
            zdirs = [e.name for e in it if e.is_dir(follow_symlinks=False) and ZONE_ID.match(e.name)]
    except OSError:
        zdirs = []
    for z in zdirs:
        scan(os.path.join(root, 'zones', z), f'zones/{z}/', lambda n: bool(INPUT_EXT.search(n)))
    return out


def cycle_of(inputs, today=None):
    """Cycle de la construction : la date la plus récente des fichiers du SIA datés (la règle de sia_base.js › build), sinon le cycle AIRAC en
    vigueur (calendrier de 28 jours, AIRAC 2401 = 2024-01-25)."""
    dates = sorted({m.group(1) for rel in inputs for m in [AIRAC_NAME.match(rel)] if m})
    if dates:
        return dates[-1]
    from datetime import date, timedelta
    ref, d = date(2024, 1, 25), today or date.today()
    return (ref + timedelta(days=28 * ((d - ref).days // 28))).isoformat()


def own_inputs(zone, inputs):
    """Les entrées qui sont probablement celles de la zone (d'après leurs noms : openaip/<zone>_…, zones/<zone>/…, le SIA à la racine pour la
    France, ENAIRE pour l'Espagne, la FAA pour les États-Unis) : un ORDRE de départ et une estimation de mémoire seulement, jamais une règle de
    lecture (la page décide seule, par AeroZones.fileWanted)."""
    out = []
    for rel in inputs:
        base = rel.rsplit('/', 1)[-1].lower()
        if (base.startswith(zone + '_') or rel.startswith(f'zones/{zone}/') or (zone == 'fr' and '/' not in rel and rel != 'mora.csv')
                or (zone == 'es' and rel.startswith('aixm5/LE_')) or (zone == 'us' and rel.startswith('geojson/faa_'))):
            out.append(rel)
    return out


# ----------------------------------------------------------------------------------------------------------------------- le rendu d'une zone
def _without_date(obj):
    return {k: v for k, v in obj.items() if k != 'updated_at'} if isinstance(obj, dict) else obj


def validate(zone, cycle, files):
    """Contrôle le rendu d'une zone avant toute écriture : les noms exacts (12 sortes, l'entrée du manifeste, les grandes villes en
    plus), du JSON, et pour chaque sorte son en-tête (schéma 2, zone, cycle, sorte) et le type de ses données. Rend (textes, entrée du
    manifeste) ou lève ValueError (le rendu entier est refusé, rien n'est écrit)."""
    want = {f'{k}.json' for k in KINDS} | {MANIFEST}
    names = set(files)
    if not want <= names or not names <= want | {MAJOR}:
        raise ValueError(f'unexpected file names: {sorted(names ^ want)[:4]}')
    parsed = {}
    for name, text in files.items():
        try:
            parsed[name] = json.loads(text)
        except ValueError as e:
            raise ValueError(f'{name}: not JSON ({str(e)[:60]})')
    for kind, typ in KINDS.items():
        body = parsed[f'{kind}.json']
        if not (isinstance(body, dict) and body.get('schema') == 2 and body.get('zone') == zone and body.get('cycle') == cycle
                and body.get('kind') == kind and isinstance(body.get('parserVersion'), int) and isinstance(body.get('data'), typ)):
            raise ValueError(f'{kind}.json: wrong header or data type')
    entry = parsed[MANIFEST]
    if not (isinstance(entry, dict) and entry.get('cycle') == cycle and isinstance(entry.get('prefixes'), list)
            and isinstance(entry.get('kb'), dict) and isinstance(entry.get('cells'), dict)):
        raise ValueError('manifest entry: wrong shape')
    if MAJOR in parsed:
        major = parsed[MAJOR]
        if not (isinstance(major, dict) and major.get('schema') == 2 and major.get('kind') == 'cities_major' and isinstance(major.get('data'), list)):
            raise ValueError('cities_major.json: wrong shape')
    return {n: files[n] for n in names if n != MANIFEST}, entry


def write_if_changed(path, text, parsed=None):
    """Écrit le texte (d'un coup : fichier temporaire puis remplacement) si le contenu change, la date updated_at mise à part ; rend vrai
    si le fichier a été écrit, faux s'il est inchangé."""
    try:
        with open(path, encoding='utf-8') as f:
            old = json.load(f)
        if _without_date(old) == _without_date(parsed if parsed is not None else json.loads(text)):
            return False
    except (OSError, ValueError):
        pass
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f'{path}.{os.getpid()}.{threading.get_ident()}.tmp'
    try:
        with open(tmp, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
    return True


def target_of(data, rel, zone):
    """Chemin complet d'un fichier de sortie (relatif à data/) par la règle de chemin du lanceur (data_sync.data_path : ni « .. », ni « : », ni nom
    de périphérique, ni lien qui sorte de data/) ; de plus il reste sous data/sia/base/<zone>/ (ou est sia/base/index.json ou cities_major.json)."""
    import data_sync
    full = data_sync.data_path(data, rel)
    if not full:
        raise ValueError(f'path refused: {rel}')
    base = os.path.realpath(os.path.join(data, 'sia', 'base'))
    real = os.path.realpath(full)
    zdir = os.path.join(base, zone) + os.sep
    if not (real.startswith(zdir) or real in (os.path.join(base, 'index.json'), os.path.join(base, MAJOR))):
        raise ValueError(f'path outside sia/base/{zone}/: {rel}')
    return full


def install(data, zone, cycle, texts, entry):
    """Écrit la zone dans data/sia/base/<zone>/<cycle>/ (zone, cycle et noms contrôlés, chaque chemin par target_of : aucun chemin ne vient du
    navigateur), les grandes villes si elles changent, et l'entrée de la zone dans le manifeste sia/base/index.json (les autres zones gardées,
    écrit comme la page l'écrit : JSON compact). Rend (chemins relatifs à data/ écrits ou inchangés pour le commit, nombre de fichiers écrits)."""
    if not (ZONE_ID.match(zone) and CYCLE.match(cycle)):
        raise ValueError('bad zone or cycle')
    paths, written = [], 0
    for name in sorted(texts):
        rel = f'sia/base/{MAJOR}' if name == MAJOR else f'sia/base/{zone}/{cycle}/{name}'
        written += write_if_changed(target_of(data, rel, zone), texts[name])
        paths.append(rel)
    index = target_of(data, 'sia/base/index.json', zone)
    try:
        with open(index, encoding='utf-8') as f:
            prev = json.load(f)
        zones = dict(prev.get('zones') or {}) if isinstance(prev, dict) else {}
    except (OSError, ValueError):
        zones = {}
    zones[zone] = entry
    body = {'schema': 2, 'kind': 'index', 'zones': zones}
    at = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
    written += write_if_changed(index, json.dumps({**body, 'updated_at': at}, ensure_ascii=False, separators=(',', ':')), body)
    paths.append('sia/base/index.json')
    return paths, written


# ----------------------------------------------------------------------------------------------------------------------- le travail
def _sogb(line):
    """L'objet JSON d'une ligne de console « … SOGB {json} … » du navigateur, ou None."""
    i = line.find('SOGB ')
    if i < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(line[i + 5:i + 5 + LINE_MAX])
    except ValueError:
        return None
    return obj if isinstance(obj, dict) else None


def write_start_page(profile, url):
    """Écrit start.html dans le profil temporaire (créé par tempfile.mkdtemp : dossier du seul utilisateur, sous son dossier temporaire ; le fichier,
    en lecture et écriture pour lui seul là où le système le permet) : un script qui mène à la page de construction. C'est son adresse FICHIER
    que le navigateur reçoit en argument, jamais celle qui porte le jeton (la ligne de commande se lit depuis les autres comptes). Rend l'adresse
    fichier ; lève ValueError si le profil n'est pas sous le dossier temporaire de l'utilisateur."""
    root = os.path.normcase(os.path.realpath(tempfile.gettempdir()))
    if not os.path.normcase(os.path.realpath(profile)).startswith(root + os.sep):
        raise ValueError('the temporary profile is not under the temporary folder of the user')
    path = os.path.join(profile, 'start.html')
    page = ('<!doctype html><meta charset="utf-8"><title>Construction de la base aéronautique</title>'
            '<script>location.replace(' + json.dumps(url).replace('</', '<\\/') + ')</script>')
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(page)
    return pathlib.Path(path).as_uri()


def build(job, args, ctx):
    t0 = time.time()
    cmd = find_browser(ctx)
    if not cmd:
        return {'ok': False, 'reason': 'no-browser', 'message': 'no Edge or Chrome found at a known absolute location'}
    if 'xplane' in (args.get('personal') or []):
        return {'ok': False, 'reason': 'xplane-in-page', 'message': 'the X-Plane folder is a handle held by the page: that build stays in the page'}
    data = ctx['data']
    parallel = bool(args.get('parallel'))
    zones = ['fr'] * ('fr' in args['zones']) + sorted(z for z in args['zones'] if z != 'fr')    # l'ordre du découpage : la France, puis l'alphabet
    personal = list(args.get('personal') or [])
    inputs = list_inputs(data)
    if not inputs:
        return {'ok': False, 'reason': 'no-input', 'message': 'no input file in data/sia/'}
    cycle = cycle_of(inputs)
    sizes = {}
    for rel, p in inputs.items():
        try:
            sizes[rel] = os.path.getsize(p)
        except OSError:
            sizes[rel] = 0
    own = {z: own_inputs(z, inputs) for z in zones}
    weight = {z: sum(sizes[r] for r in own[z]) for z in zones}
    # les lots : une instance qui construit toutes les zones (par défaut), ou une instance par zone, les plus lourdes d'abord (parallel)
    batches = [[z] for z in sorted(zones, key=lambda z: (-weight[z], zones.index(z)))] if parallel else [list(zones)]
    per = ctx.get('per_instance')      # crochet d'essai : la même mémoire comptée pour toutes
    needs = [per or need_of(max([sizes[r] for z in b for r in own[z]] or [0])) for b in batches]
    origin = launcher_origin(ctx)
    if not origin:
        return {'ok': False, 'reason': 'failed', 'message': 'the launcher address is unknown: the build page cannot be loaded'}
    netloc = urllib.parse.urlsplit(origin).netloc
    cores = ctx.get('cores') or os.cpu_count() or 1
    timeout = ctx.get('zone_timeout', ZONE_TIMEOUT)
    free_of = ctx.get('free_memory', free_memory)

    lock = threading.Lock()        # l'état partagé (liste des zones)
    commit_lock = threading.Lock()  # une écriture suivie de son commit à la fois (index.json, git)
    st = {z: {'state': 'waiting', 'done': 0, 'total': 0} for z in zones}
    peak = [0]
    started = {}     # lot → heure de départ de l'instance en cours

    def publish_progress():
        done = sum(1 for s in st.values() if s['state'] in ('built', 'failed', 'cancelled'))
        busy = [z for z in zones if st[z]['state'] == 'building']
        job.data['zones'] = {z: dict(st[z]) for z in zones}     # une copie : la page lit job.view() pendant que les fils écrivent
        job.step(f'{done} zones sur {len(zones)}' + (f' (en construction : {", ".join(busy)})' if parallel and busy else ''), done, len(zones), 'zones')

    def update(zone, **kw):
        with lock:
            st[zone].update(kw)
            publish_progress()

    def url_of(batch):
        """L'adresse de la page de construction, avec le jeton dans son fragment ; elle n'est écrite que dans start.html du profil."""
        q = {'job': job.id, 't': job.token, 'zones': ','.join(zones), 'cycle': cycle, 'personal': ','.join(personal), 'in': '|'.join(sorted(inputs))}
        if parallel:
            q['zone'] = batch[0]
        return f'{origin}/{PAGE}#' + urllib.parse.urlencode(q, quote_via=urllib.parse.quote, safe=',')

    def finish(zone, got, z0):
        """La zone est là : contrôle, écriture, commit (une zone à la fois pour index.json et git)."""
        try:
            texts, entry = validate(zone, cycle, got)
        except ValueError as e:
            return update(zone, state='failed', error='invalid-output', message=str(e)[:200], seconds=round(time.time() - z0, 1))
        try:
            with commit_lock:
                paths, written = install(data, zone, cycle, texts, entry)
                done = regen_jobs.commit_outputs(ctx, job.author, paths, f':card_file_box: Base aéronautique {zone} {cycle} construite sur le poste')
        except (OSError, ValueError) as e:
            return update(zone, state='failed', error='write-failed', message=str(e)[:200], seconds=round(time.time() - z0, 1))
        job.log(f'{zone}: construite, {written} fichier(s) écrit(s), commit {(done.get("commit") or "aucun")[:10]}')
        update(zone, state='built', commit=done.get('commit'), warning=done.get('warning'), files=written, seconds=round(time.time() - z0, 1))

    def run_batch(batch):
        z0 = time.time()
        profile = tempfile.mkdtemp(prefix='sog-base-')
        proc, errs, fatal, up = None, {}, [], threading.Event()
        try:
            try:
                start = write_start_page(profile, url_of(batch))
                flags = {'creationflags': 0x08000000} if sys.platform.startswith('win') else {'start_new_session': True}
                proc = subprocess.Popen(cmd + browser_args(profile, netloc, start), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                        stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace', **flags)
            except (OSError, ValueError) as e:
                for z in batch:
                    update(z, state='failed', error='browser-failed', message=str(e)[:200])
                return

            def read():
                for line in proc.stderr:
                    o = _sogb(line)
                    if not o and ctx.get('debug') and 'CONSOLE' in line:   # essais : les autres messages de la console de la page (sans fragment d'adresse)
                        job.log(f'console: {line.split("#")[0].strip()[:260]}')
                    if not o or o.get('zone') not in (*batch, '*'):
                        continue
                    if o.get('started'):
                        up.set()
                        try:
                            os.remove(os.path.join(profile, 'start.html'))     # le fichier qui portait le jeton n'a plus d'utilité
                        except OSError:
                            pass
                    elif 'error' in o:
                        if o['zone'] == '*':
                            fatal.append(str(o['error'])[:300])
                        else:
                            errs[o['zone']] = str(o['error'])[:300]
                    elif isinstance(o.get('sources'), int):
                        for z in batch:
                            if st[z]['state'] == 'building':
                                update(z, total=o['sources'])
                    elif isinstance(o.get('n'), int):
                        for z in batch:
                            if st[z]['state'] == 'building':
                                update(z, done=o['n'])
            threading.Thread(target=read, daemon=True).start()
            for z in batch:
                update(z, state='building')
            job.log(f'{" ".join(batch)}: construction lancée')
            remaining, end = list(batch), z0 + timeout
            while remaining:
                zone = remaining[0]
                got = job.take(zone, 0.3)
                if got is None:
                    why = ''
                    if zone in errs:                      # la page dit que CETTE zone a échoué : les autres continuent
                        remaining.pop(0)
                        update(zone, state='failed', error='page-error', message=errs[zone], seconds=round(time.time() - z0, 1))
                        continue
                    if fatal:
                        why = 'page-error'
                    elif job.cancelled():
                        why = 'cancelled'
                    elif time.time() > end:
                        why = 'timeout'
                    elif not up.is_set() and time.time() > z0 + ctx.get('start_timeout', START_TIMEOUT):
                        why, fatal = 'browser-failed', ['the build page did not start (not loaded from the launcher?)']
                    elif proc.poll() is not None:
                        got = job.take(zone, 1.0)         # le rendu a pu arriver juste avant la sortie
                        if got is None:
                            why = 'browser-exited'
                    if got is None:
                        if why:
                            for r in remaining:
                                update(r, state='cancelled' if why == 'cancelled' else 'failed', error=why, message=fatal[0] if fatal else '', seconds=round(time.time() - z0, 1))
                            remaining = []
                        continue
                remaining.pop(0)
                if not remaining:                         # la dernière zone est là : le navigateur n'a plus rien à faire
                    kill_tree(proc)
                finish(zone, got, z0)
        finally:
            kill_tree(proc)
            remove_tree(profile)

    pending = list(range(len(batches)))
    threads = {}
    with lock:
        publish_progress()    # la liste, toutes les zones « en attente »
    try:
        while pending or threads:
            for k in [k for k, t in threads.items() if not t.is_alive()]:
                del threads[k]
            if job.cancelled():
                for k in pending:
                    for z in batches[k]:
                        st[z]['state'] = 'cancelled'
                pending.clear()
                with lock:
                    publish_progress()
            else:
                while pending and can_start(cores, free_of() if callable(free_of) else free_of,
                                            [(needs[k], time.time() - started[k]) for k, t in threads.items() if t.is_alive()], needs[pending[0]]):
                    k = pending.pop(0)
                    started[k] = time.time()
                    threads[k] = threading.Thread(target=run_batch, args=(batches[k],), daemon=True)
                    threads[k].start()
                    peak[0] = max(peak[0], sum(1 for t in threads.values() if t.is_alive()))
                    time.sleep(0.5)                       # le départ suivant voit la mémoire que celui-ci a déjà prise
            time.sleep(0.2)
        for t in threads.values():
            t.join()
    finally:
        job.data['zones'] = {z: dict(st[z]) for z in zones}
    built = [z for z in zones if st[z]['state'] == 'built']
    failed = [{'zone': z, 'error': st[z].get('error') or st[z]['state']} for z in zones if st[z]['state'] == 'failed']
    res = {'ok': len(built) == len(zones), 'cycle': cycle, 'built': built, 'failed': failed,
           'commits': [{'zone': z, 'commit': st[z].get('commit')} for z in built], 'zones': {z: dict(st[z]) for z in zones},
           'instances': peak[0], 'seconds': round(time.time() - t0, 1)}
    if job.cancelled():
        res['reason'] = 'cancelled'
    elif not res['ok']:
        res['reason'] = 'failed' if not built else 'partial'
    return res


VERBS = {('base', 'build'): (build, check)}
