"""Le jeu « weather » du lanceur : le synoptique mondial de l'Atmosphère (GFS de la NOAA) lu et publié sur le poste (SOG-0138) — chargé par regen_jobs.load_verbs().

La carte « monde » du module Atmosphère lit des pages publiées par tools/build_world_weather.py (un index, deux fichiers par échéance, 25 échéances de 3 h jusqu'à +72 h). Ces pages sont faites au déploiement du site (workflow pages.yml) ;
sur le poste, rien ne lançait l'outil : pas de carte. Un travail le lance.

Un verbe, `weather/world` { action?: 'build' (par défaut) | 'status' } :
  · `status` : { ok, exists, run, built, step, times: [première, dernière échéance], steps, files, bytes, age } — ce que la publication du poste contient (jamais d'appel réseau) ;
  · `build` : exécute tools/build_world_weather.py (bibliothèque standard ; NOMADS de la NOAA, GFS 1°, sans clé ni quota) vers un dossier de travail, CONTRÔLE ce qu'il a écrit (un index de schéma 1, des fichiers nommés par lui seul, taille et nombre bornés), puis le
    met en place d'un coup dans data/weather/world/ (SOG-0138 : data/local/ n'est servi à personne, hidden() du lanceur ; data/weather/ l'est, et n'est ni dans l'arbre du lanceur, FRAME_SKIP, ni dans git : `weather/` dans data/.gitignore et dans .git/info/exclude, posés ici s'ils manquent ; une publication de plusieurs Mo toutes les six heures n'a rien à faire dans l'historique). L'ancienne publication de data/local/weather/world/ est déplacée une fois, pas reconstruite. La publication d'avant sert de reprise
    (`--keep file://…`) : même run de GFS → rien n'est redemandé à la NOAA. Rend { ok, kept, run, built, times, steps, files, bytes, seconds, reason?, message? } ; reason : 'no-run' (aucun run publié / NOAA injoignable : l'ancienne publication reste), 'invalid' (le dossier produit n'est pas conforme : rien n'est remplacé), 'timeout', 'cancelled', 'failed'.
Rien n'est lu hors de la NOAA ; aucun chemin, aucune adresse ne vient de la page. Un départ par dix minutes au plus (MIN_GAP), compté pour les travaux qui ont lu la NOAA : un échec avant toute lecture rend `reached: False`, le délai n'en tient pas compte."""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : inside, child_env)

SCRIPT = os.path.join(TOOLS, 'build_world_weather.py')
DEST = ('weather', 'world')
LEGACY = ('local', 'weather', 'world')      # là où les premières versions l'écrivaient (jamais servi par le lanceur)
TIMEOUT = 900                      # secondes pour toute la lecture (le serveur de la NOAA répond par échéance)
MAX_FILES = 2 * 25 + 1             # un index, deux fichiers par échéance, 25 échéances
MAX_BYTES = 40 * 1024 * 1024       # la publication fait quelques Mo : au-delà, refusée
FILE = re.compile(r'^(?:index|\d{4}-\d{2}-\d{2}T\d{2}(?:-alt)?)\.json\Z', re.A)
MIN_GAP = {('weather', 'world'): 600}


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { action?: 'build' | 'status' } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'action'} or a.get('action', 'build') not in ('build', 'status'):
        return None
    return {'action': a.get('action', 'build')}


def _read_index(folder):
    try:
        with open(os.path.join(folder, 'index.json'), encoding='utf-8') as f:
            idx = json.load(f)
    except (OSError, ValueError):
        return None
    ok = (isinstance(idx, dict) and idx.get('schema') == 1 and idx.get('model') == 'gfs' and isinstance(idx.get('times'), list) and idx['times'] and len(idx['times']) <= 25
          and all(isinstance(t, int) and not isinstance(t, bool) for t in idx['times']) and isinstance(idx.get('files'), list) and len(idx['files']) == len(idx['times']))
    return idx if ok else None


def _summary(folder):
    """{ exists, run, built, step, times, steps, files, bytes, age } de la publication d'un dossier (l'index lu comme une entrée non fiable), ou { exists: False }."""
    idx = _read_index(folder)
    if not idx:
        return {'exists': False}
    files = [n for n in os.listdir(folder) if FILE.match(n)]
    size = 0
    for n in files:
        try:
            size += os.path.getsize(os.path.join(folder, n))
        except OSError:
            pass
    iso = lambda t: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t)) if isinstance(t, int) and not isinstance(t, bool) else None
    return {'exists': True, 'run': iso(idx.get('run')), 'built': iso(idx.get('built')), 'step': idx.get('step') if isinstance(idx.get('step'), int) else None, 'times': [iso(idx['times'][0]), iso(idx['times'][-1])],
            'steps': len(idx['times']), 'files': len(files), 'bytes': size, 'age': max(0, int(time.time()) - idx['built']) if isinstance(idx.get('built'), int) else None}


def _valid(folder):
    """Le dossier produit par l'outil est-il conforme ? Un index de schéma 1 ; des fichiers de noms connus seulement (ni sous-dossier, ni lien) ; ceux que l'index nomme y sont tous ; nombre et taille bornés."""
    idx = _read_index(folder)
    if not idx:
        return False
    try:
        entries = list(os.scandir(folder))
    except OSError:
        return False
    if len(entries) > MAX_FILES or any(not FILE.match(e.name) or e.is_symlink() or not e.is_file(follow_symlinks=False) for e in entries):
        return False
    names = {e.name for e in entries}
    named = [*idx['files'], *(idx.get('altFiles') or [])]
    return all(isinstance(n, str) and n in names for n in named) and sum(e.stat().st_size for e in entries) <= MAX_BYTES


PROGRESS = re.compile(r'^@etape (\d{1,3})/(\d{1,3})\s*$')      # la ligne d'avancement de tools/build_world_weather.py (une par échéance lue)


def _read_lines(proc, job, lines, seen=None):
    """Lit la sortie de l'outil ligne à ligne : « @etape k/n » devient l'avancement du travail (et `seen` en garde la trace : la NOAA a été lue), le reste est gardé (les dernières lignes servent de message)."""
    for line in proc.stdout:
        m = PROGRESS.match(line)
        if m:
            if seen is not None:
                seen.append(1)
            job.step('synoptique monde : échéance %s sur %s' % m.groups(), int(m.group(1)), int(m.group(2)), 'étapes')
        elif line.strip():
            lines.append(line.strip())
            del lines[:-50]


IGNORED = ('weather', 'weather/', '/weather', '/weather/')


def _ignore(data):
    """`weather/` dans data/.gitignore (le dépôt des données est celui de l'utilisateur : une ligne ajoutée, jamais commitée ici) et dans .git/info/exclude (ignoré tout de suite, sans rien à commiter). 'added' si .gitignore a changé (une ligne reste à commiter), 'present', ou 'none' (pas un dépôt)."""
    gi, git = os.path.join(data, '.gitignore'), os.path.join(data, '.git')
    if not (os.path.exists(git) or os.path.isfile(gi)):
        return 'none'
    state = 'present'
    try:
        with open(gi, 'r', encoding='utf-8', newline='') as f:
            text = f.read()
    except OSError:
        text = ''
    if not any(line.strip() in IGNORED for line in text.splitlines()):
        eol = '\r\n' if '\r\n' in text else '\n'
        add = ('' if not text or text.endswith('\n') else eol) + '# Synoptique monde (GFS) construit sur le poste (travail weather/world) : jamais synchronisé ni publié' + eol + 'weather/' + eol
        try:
            with open(gi, 'a', encoding='utf-8', newline='') as f:
                f.write(add)
            state = 'added'
        except OSError:
            state = 'none'
    if os.path.isdir(git):
        ex = os.path.join(git, 'info', 'exclude')
        try:
            try:
                with open(ex, 'r', encoding='utf-8') as f:
                    cur = f.read()
            except OSError:
                cur = ''
            if not any(line.strip() in IGNORED for line in cur.splitlines()):
                os.makedirs(os.path.dirname(ex), exist_ok=True)
                with open(ex, 'a', encoding='utf-8', newline='\n') as f:
                    f.write(('' if not cur or cur.endswith('\n') else '\n') + 'weather/\n')
        except OSError:
            pass
    return state


def _migrate(data):
    """La publication d'avant (data/local/weather/world/, que le lanceur ne sert pas) est déplacée une fois vers data/weather/world/ : pas reconstruite. Si la nouvelle existe déjà, l'ancienne (conforme, de nos noms) est retirée. True si déplacée."""
    old, new = os.path.join(data, *LEGACY), os.path.join(data, *DEST)
    if not os.path.isdir(old) or os.path.islink(old):
        return False
    moved = False
    try:
        if not os.path.exists(new):
            if not _valid(old):
                return False
            os.makedirs(os.path.dirname(new), exist_ok=True)
            os.replace(old, new)
            moved = True
        elif _valid(old):
            shutil.rmtree(old, ignore_errors=True)
        for d in (os.path.dirname(old), os.path.dirname(os.path.dirname(old))):
            try:
                os.rmdir(d)          # data/local/weather, puis data/local s'ils sont vides (jamais autrement)
            except OSError:
                break
    except OSError:
        return moved
    return moved


def run(job, args, ctx):
    data = ctx['data']
    dest = os.path.join(data, *DEST)
    moved = _migrate(data)
    if args['action'] == 'status':
        return {'ok': True, **_summary(dest), **({'migrated': True} if moved else {})}
    base = os.path.realpath(data)
    parent = os.path.dirname(dest)
    if not regen_jobs.inside(parent, base):
        return {'ok': False, 'reason': 'failed', 'message': 'unsafe path', 'reached': False}
    os.makedirs(parent, exist_ok=True)
    ignored = _ignore(data)
    t0 = time.time()
    work = tempfile.mkdtemp(prefix='.world-', dir=parent)
    out = os.path.join(work, 'world')
    cmd = [sys.executable, '-I', ctx.get('script') or SCRIPT, out]           # ctx['script'] : crochet des essais (jamais posé par le lanceur), un faux outil
    if _read_index(dest):
        cmd += ['--keep', 'file:///' + dest.replace('\\', '/').lstrip('/') + '/']      # la publication d'avant : même run de GFS → rien n'est redemandé à la NOAA
    job.step('synoptique monde : lecture de GFS (NOAA)', 0, 1, 'étapes')
    try:
        proc = job.track(subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', env=regen_jobs.child_env(), cwd=work))      # déclaré : un travail libéré (SOG-0245) l'arrête
        lines, seen, end = [], [], t0 + ctx.get('timeout', TIMEOUT)
        reader = threading.Thread(target=_read_lines, args=(proc, job, lines, seen), daemon=True)      # l'avancement (« @etape k/n », une ligne par échéance) monte au fur et à mesure ; lire la sortie en continu évite aussi qu'un tube plein ne fige l'outil
        reader.start()
        while proc.poll() is None:
            if job.cancelled() or time.time() > end:
                proc.kill()
                proc.wait()
                return {'ok': False, 'reason': 'cancelled' if job.cancelled() else 'timeout', 'seconds': round(time.time() - t0, 1), **({'reached': False} if job.cancelled() and not seen else {})}
            time.sleep(0.3)
        reader.join(5)
        lines = lines[-6:]
        for line in lines:
            job.log(line[:300])
        said = ' '.join(lines)
        if proc.returncode != 0:
            return {'ok': False, 'reason': 'failed', 'message': said[:300], 'seconds': round(time.time() - t0, 1), **({} if seen else {'reached': False})}      # sorti en erreur sans avoir lu une échéance : la NOAA n'a pas été lue, le délai ne compte pas
        if not os.path.isdir(out):
            return {'ok': False, 'reason': 'no-run', 'message': said[:300], 'seconds': round(time.time() - t0, 1)}      # aucune publication écrite : l'ancienne reste
        if not _valid(out):
            return {'ok': False, 'reason': 'invalid', 'message': 'the folder written is not a valid world forecast: nothing replaced', 'seconds': round(time.time() - t0, 1)}
        old = dest + '.old'
        shutil.rmtree(old, ignore_errors=True)
        if os.path.isdir(dest):
            os.replace(dest, old)
        os.replace(out, dest)
        shutil.rmtree(old, ignore_errors=True)
        return {'ok': True, 'kept': any('reprise' in x for x in lines), **_summary(dest), 'gitignore': ignored, **({'migrated': True} if moved else {}), 'seconds': round(time.time() - t0, 1)}
    except OSError as e:
        return {'ok': False, 'reason': 'failed', 'message': str(e)[:200], 'seconds': round(time.time() - t0, 1), 'reached': False}
    finally:
        shutil.rmtree(work, ignore_errors=True)


VERBS = {('weather', 'world'): (run, check)}
