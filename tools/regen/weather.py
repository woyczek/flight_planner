"""Le jeu « weather » du lanceur : le synoptique mondial de l'Atmosphère (GFS de la NOAA) lu et publié sur le poste (SOG-0138) — chargé par regen_jobs.load_verbs().

La carte « monde » du module Atmosphère lit des pages publiées par tools/build_world_weather.py (un index, deux fichiers par échéance, 25 échéances de 3 h jusqu'à +72 h). Ces pages sont faites au déploiement du site (workflow pages.yml) ;
sur le poste, rien ne lançait l'outil : pas de carte. Un travail le lance.

Un verbe, `weather/world` { action?: 'build' (par défaut) | 'status' } :
  · `status` : { ok, exists, run, built, step, times: [première, dernière échéance], steps, files, bytes, age } — ce que la publication du poste contient (jamais d'appel réseau) ;
  · `build` : exécute tools/build_world_weather.py (bibliothèque standard ; NOMADS de la NOAA, GFS 1°, sans clé ni quota) vers un dossier de travail, CONTRÔLE ce qu'il a écrit (un index de schéma 1, des fichiers nommés par lui seul, taille et nombre bornés), puis le
    met en place d'un coup dans data/local/weather/world/ (`local/` : propre au poste, jamais synchronisé ni commité : une publication de plusieurs Mo toutes les six heures n'a rien à faire dans l'historique git). La publication d'avant sert de reprise
    (`--keep file://…`) : même run de GFS → rien n'est redemandé à la NOAA. Rend { ok, kept, run, built, times, steps, files, bytes, seconds, reason?, message? } ; reason : 'no-run' (aucun run publié / NOAA injoignable : l'ancienne publication reste), 'invalid' (le dossier produit n'est pas conforme : rien n'est remplacé), 'timeout', 'cancelled', 'failed'.
Rien n'est lu hors de la NOAA ; aucun chemin, aucune adresse ne vient de la page. Un départ par dix minutes au plus (MIN_GAP)."""
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
DEST = ('local', 'weather', 'world')
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


def _read_lines(proc, job, lines):
    """Lit la sortie de l'outil ligne à ligne : « @etape k/n » devient l'avancement du travail, le reste est gardé (les dernières lignes servent de message)."""
    for line in proc.stdout:
        m = PROGRESS.match(line)
        if m:
            job.step('synoptique monde : échéance %s sur %s' % m.groups(), int(m.group(1)), int(m.group(2)), 'étapes')
        elif line.strip():
            lines.append(line.strip())
            del lines[:-50]


def run(job, args, ctx):
    data = ctx['data']
    dest = os.path.join(data, *DEST)
    if args['action'] == 'status':
        return {'ok': True, **_summary(dest)}
    base = os.path.realpath(data)
    parent = os.path.dirname(dest)
    if not regen_jobs.inside(parent, base):
        return {'ok': False, 'reason': 'failed', 'message': 'unsafe path'}
    os.makedirs(parent, exist_ok=True)
    t0 = time.time()
    work = tempfile.mkdtemp(prefix='.world-', dir=parent)
    out = os.path.join(work, 'world')
    cmd = [sys.executable, '-I', ctx.get('script') or SCRIPT, out]           # ctx['script'] : crochet des essais (jamais posé par le lanceur), un faux outil
    if _read_index(dest):
        cmd += ['--keep', 'file:///' + dest.replace('\\', '/').lstrip('/') + '/']      # la publication d'avant : même run de GFS → rien n'est redemandé à la NOAA
    job.step('synoptique monde : lecture de GFS (NOAA)', 0, 1, 'étapes')
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', env=regen_jobs.child_env(), cwd=work)
        lines, end = [], t0 + ctx.get('timeout', TIMEOUT)
        reader = threading.Thread(target=_read_lines, args=(proc, job, lines), daemon=True)      # l'avancement (« @etape k/n », une ligne par échéance) monte au fur et à mesure ; lire la sortie en continu évite aussi qu'un tube plein ne fige l'outil
        reader.start()
        while proc.poll() is None:
            if job.cancelled() or time.time() > end:
                proc.kill()
                proc.wait()
                return {'ok': False, 'reason': 'cancelled' if job.cancelled() else 'timeout', 'seconds': round(time.time() - t0, 1)}
            time.sleep(0.3)
        reader.join(5)
        lines = lines[-6:]
        for line in lines:
            job.log(line[:300])
        said = ' '.join(lines)
        if proc.returncode != 0:
            return {'ok': False, 'reason': 'failed', 'message': said[:300], 'seconds': round(time.time() - t0, 1)}
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
        return {'ok': True, 'kept': any('reprise' in x for x in lines), **_summary(dest), 'seconds': round(time.time() - t0, 1)}
    except OSError as e:
        return {'ok': False, 'reason': 'failed', 'message': str(e)[:200], 'seconds': round(time.time() - t0, 1)}
    finally:
        shutil.rmtree(work, ignore_errors=True)


VERBS = {('weather', 'world'): (run, check)}
