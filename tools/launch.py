"""Lanceur de la suite (appelé par lancer.cmd / lancer.sh, à la racine) : données, serveur local, navigateur.

1. Données (data/, dépôt privé) :
   - déjà là (data/data_tree.js) : mise à jour si c'est un clone git (git pull, sans bloquer en cas d'échec) ;
   - sinon, une archive reçue par mail (un .zip qui contient data_tree.js), déposée à la racine du dossier : extraite
     dans data/ ;
   - sinon, clone du dépôt de données (adresse : config/repository_tree › sources.dataRepo) ; s'il est refusé (dépôt
     privé, accès pas encore donné), la suite démarre quand même sur les exemples et le message dit quoi faire.
2. Serveur web local (http://127.0.0.1, premier port libre à partir de 8000) servi depuis la racine du dossier ;
   déjà lancé : on ouvre seulement le navigateur.
3. Navigateur ouvert sur Paramètres › Sources et dossiers, en mode premier lancement (un seul dossier à choisir).

Usage : python tools/launch.py [--port 8000] [--page apps/…] [--no-browser] [--no-data]
Arrêt : fermer la fenêtre, ou Ctrl+C.
"""
import argparse, glob, http.server, io, os, re, shutil, socket, subprocess, sys, threading, time, urllib.request, webbrowser, zipfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
PAGE = 'apps/settings/parametrage.html?m=sources&setup=1'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def say(msg=''):
    print(msg, flush=True)


def config_text():
    for p in (os.path.join(ROOT, 'config', 'repository_tree'), os.path.join(ROOT, 'repository_tree')):
        if os.path.isfile(p):
            return io.open(p, encoding='utf-8').read()
    return ''


def data_repo_url():
    m = re.search(r'dataRepo\s*:\s*\{\s*url\s*:\s*"([^"]+)"', config_text())
    url = m.group(1) if m else 'https://framagit.org/defa-virtual/missions-defa'
    return url if url.endswith('.git') else url + '.git'


def run(cmd, **kw):
    try:
        return subprocess.run(cmd, cwd=kw.pop('cwd', ROOT), **kw).returncode
    except (OSError, subprocess.SubprocessError):
        return -1


def from_archive():
    """Archive des données reçue par mail, déposée à la racine (ou dans data/) : extraite dans data/."""
    for z in sorted(glob.glob(os.path.join(ROOT, '*.zip')) + glob.glob(os.path.join(DATA, '*.zip'))):
        try:
            with zipfile.ZipFile(z) as zf:
                marker = next((n for n in zf.namelist() if n.endswith('data_tree.js')), None)
                if not marker:
                    continue
                prefix = marker[:-len('data_tree.js')]
                say(f'  Archive des données trouvée : {os.path.basename(z)} → data/')
                for info in zf.infolist():
                    if info.is_dir() or not info.filename.startswith(prefix):
                        continue
                    target = os.path.normpath(os.path.join(DATA, info.filename[len(prefix):]))
                    if not target.startswith(DATA):
                        continue  # chemin hors de data/ : ignoré
                    os.makedirs(os.path.dirname(target), exist_ok=True)
                    with zf.open(info) as src, open(target, 'wb') as dst:
                        shutil.copyfileobj(src, dst)
                return True
        except zipfile.BadZipFile:
            continue
    return False


def ensure_data():
    say('1. Données (dossier data/)')
    git = shutil.which('git')
    if os.path.isfile(os.path.join(DATA, 'data_tree.js')):
        if git and os.path.isdir(os.path.join(DATA, '.git')):
            say('  Données présentes : mise à jour (git pull)…')
            if run([git, '-C', DATA, 'pull', '--ff-only'], timeout=180) != 0:
                say('  Mise à jour impossible pour l’instant (réseau, accès ou modifications locales) : données actuelles gardées.')
        else:
            say('  Données présentes.')
        return True
    if from_archive():
        return True
    if git:
        url = data_repo_url()
        if os.path.isdir(DATA) and os.listdir(DATA):
            say('  Le dossier data/ existe mais ne contient pas de données (data_tree.js) : il est laissé tel quel.')
        else:
            say(f'  Récupération du dépôt de données (privé) : {url}')
            say('  Si Git demande un identifiant, utilisez votre compte framagit (accès à demander au Centre).')
            if shutil.which('git-lfs') or run([git, 'lfs', 'version'], capture_output=True) == 0:
                run([git, 'lfs', 'install'], capture_output=True)
            if run([git, 'clone', url, DATA], timeout=1800) == 0 and os.path.isfile(os.path.join(DATA, 'data_tree.js')):
                say('  Données récupérées.')
                return True
            if os.path.isdir(DATA) and not os.listdir(DATA):
                os.rmdir(DATA)
    say('')
    say('  ⚠ Données non récupérées. La suite démarre sur les exemples fournis.')
    say('    Le dépôt des données est privé. Deux possibilités :')
    say('    - demander l’accès au dépôt (compte framagit), puis relancer ce lanceur ;')
    say('    - demander un jeu de données par mail : déposer l’archive .zip reçue dans ce dossier,')
    say(f'      à côté de lancer.cmd / lancer.sh ({ROOT}), puis relancer.')
    if not git:
        say('    (Git n’est pas installé : seule l’archive par mail est possible, ou installez Git : https://git-scm.com)')
    say('')
    return False


def ours(port):
    """Vrai si la suite répond déjà sur ce port (lanceur relancé)."""
    for path in ('config/repository_tree', 'repository_tree'):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/{path}', timeout=1.5) as r:
                if b'REPOSITORY_TREE' in r.read(4096):
                    return True
        except Exception:
            pass
    return False


def free(port):
    with socket.socket() as s:
        try:
            s.bind(('127.0.0.1', port))
            return True
        except OSError:
            return False


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser(description='Lanceur de la suite DEFA (données, serveur local, navigateur).')
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--page', default=PAGE)
    ap.add_argument('--no-browser', action='store_true')
    ap.add_argument('--no-data', action='store_true')
    a = ap.parse_args()
    if sys.version_info < (3, 8):
        say('Python 3.8 ou plus récent est nécessaire : https://www.python.org/downloads/')
        return 1
    say('Suite DEFA — lanceur')
    say(f'Dossier : {ROOT}')
    say('')
    if not a.no_data:
        ensure_data()
    say('2. Serveur local')
    port = a.port
    for p in range(a.port, a.port + 20):
        if ours(p):
            url = f'http://127.0.0.1:{p}/{a.page}'
            say(f'  La suite tourne déjà : {url}')
            if not a.no_browser:
                webbrowser.open(url)
            return 0
        if free(p):
            port = p
            break
    else:
        say('  Aucun port libre entre {} et {}.'.format(a.port, a.port + 19))
        return 1
    handler = lambda *x, **k: Quiet(*x, directory=ROOT, **k)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    url = f'http://127.0.0.1:{port}/{a.page}'
    say(f'  Suite servie sur http://127.0.0.1:{port}/')
    say('')
    say('3. Navigateur')
    say(f'  {url}')
    say('  Chrome ou Edge conseillés (Brave : voir docs/INSTALL.md).')
    if not a.no_browser:
        threading.Thread(target=lambda: (time.sleep(0.8), webbrowser.open(url)), daemon=True).start()
    say('')
    say('Laissez cette fenêtre ouverte pendant l’utilisation. Pour arrêter : fermez-la (ou Ctrl+C).')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        say('Arrêt.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
