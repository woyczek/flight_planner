"""Lanceur de la suite (appelé par lancer.cmd / lancer.sh, à la racine) : données, serveur local, navigateur.

1. Données (data/, dépôt privé) :
   - déjà là (data/data_tree.js) : mise à jour si c'est un clone git (git pull, sans bloquer en cas d'échec) ;
   - sinon, une archive reçue par mail (un .zip qui contient data_tree.js), déposée à la racine du dossier : extraite
     dans data/ ;
   - sinon, clone du dépôt de données (adresse : config/repository_tree › sources.dataRepo), si Git connaît déjà les
     identifiants ; sinon, la page de premier lancement les demande (ou l'archive).
2. Serveur web local (http://127.0.0.1, premier port libre à partir de 8000) servi depuis la racine du dossier, avec
   l'interface de la page de premier lancement (/__setup/…, voir Setup) ; déjà lancé : on ouvre seulement le navigateur.
3. Navigateur ouvert sur la page de premier lancement (apps/settings/premier_lancement.html), qui renvoie vers
   l'accueil une fois la suite réglée.

Usage : python tools/launch.py [--port 8000] [--page apps/…] [--no-browser] [--no-data]
Arrêt : fermer la fenêtre, ou Ctrl+C.
"""
import argparse, glob, http.server, io, json, os, re, shutil, socket, subprocess, sys, tempfile, threading, time
import urllib.parse, urllib.request, webbrowser, zipfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
PAGE = 'apps/settings/premier_lancement.html'
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


def has_data():
    return os.path.isfile(os.path.join(DATA, 'data_tree.js'))


def extract_data(z, quiet=False):
    """Archive des données (.zip contenant data_tree.js) extraite dans data/ ; faux si ce n'en est pas une."""
    try:
        with zipfile.ZipFile(z) as zf:
            marker = next((n for n in zf.namelist() if n.endswith('data_tree.js')), None)
            if not marker:
                return False
            prefix = marker[:-len('data_tree.js')]
            if not quiet:
                say(f'  Archive des données : {os.path.basename(z)} → data/')
            for info in zf.infolist():
                if info.is_dir() or not info.filename.startswith(prefix):
                    continue
                target = os.path.normpath(os.path.join(DATA, info.filename[len(prefix):]))
                if not target.startswith(DATA + os.sep):
                    continue  # chemin hors de data/ : ignoré
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with zf.open(info) as src, open(target, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
            return True
    except (zipfile.BadZipFile, OSError):
        return False


def from_archive():
    """Archive reçue par mail, déposée à la racine (ou dans data/)."""
    return any(extract_data(z) for z in sorted(glob.glob(os.path.join(ROOT, '*.zip')) + glob.glob(os.path.join(DATA, '*.zip'))))


def git_env():
    """Git sans question dans le terminal ni fenêtre d'identifiants (la page les demande)."""
    return dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never')


def clone(user=None, secret=None, remember=False):
    """Clone du dépôt de données ; identifiants : ceux de la page (le temps du clone), sinon ceux que Git connaît.
    Retourne (ok, journal)."""
    git = shutil.which('git')
    if not git:
        return False, 'Git n’est pas installé (https://git-scm.com) : utilisez l’archive des données.'
    if os.path.isdir(DATA) and os.listdir(DATA):
        return False, 'Le dossier data/ existe déjà et n’est pas vide : il est laissé tel quel.'
    url = data_repo_url()
    env = git_env()
    cmd = [git]
    if user and secret:
        # assistant d'identifiants le temps de cette commande : rien n'est écrit dans .git/config ni dans l'adresse
        env.update(DEFA_GIT_U=user, DEFA_GIT_P=secret)
        cmd += ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo "username=$DEFA_GIT_U"; echo "password=$DEFA_GIT_P"; }; f']
    if run([git, 'lfs', 'version'], capture_output=True) == 0:
        run([git, 'lfs', 'install'], capture_output=True)
    try:
        r = subprocess.run(cmd + ['clone', url, DATA], cwd=ROOT, env=env, capture_output=True, text=True,
                           encoding='utf-8', errors='replace', timeout=1800)
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)
    log = (r.stdout + r.stderr).strip()
    if r.returncode != 0 or not has_data():
        if os.path.isdir(DATA) and not os.listdir(DATA):
            os.rmdir(DATA)
        if re.search(r'Authentication failed|could not read Username|403|401|terminal prompts disabled', log, re.I):
            return False, 'Accès refusé : identifiant, mot de passe ou jeton incorrect, ou accès au dépôt pas encore donné.'
        return False, log or 'Échec du clone.'
    if remember and user and secret:
        host = urllib.parse.urlparse(url)
        subprocess.run([git, 'credential', 'approve'], input=f'protocol={host.scheme}\nhost={host.netloc}\nusername={user}\npassword={secret}\n\n',
                       text=True, capture_output=True, cwd=ROOT)
    return True, 'Données récupérées.'


def ensure_data():
    say('1. Données (dossier data/)')
    git = shutil.which('git')
    if has_data():
        if git and os.path.isdir(os.path.join(DATA, '.git')):
            say('  Données présentes : mise à jour (git pull)…')
            if run([git, '-C', DATA, 'pull', '--ff-only'], timeout=180, env=git_env()) != 0:
                say('  Mise à jour impossible pour l’instant (réseau, accès ou modifications locales) : données actuelles gardées.')
        else:
            say('  Données présentes.')
        return True
    if from_archive():
        return True
    if git:
        say(f'  Essai du dépôt de données (privé) : {data_repo_url()}')
        ok, log = clone()
        if ok:
            say('  Données récupérées.')
            return True
    say('  Données pas encore là : la page de premier lancement demande vos identifiants framagit ou l’archive reçue.')
    return False


# ---- interface de la page de premier lancement (/__setup/…) : seulement depuis la page servie ici (adresse
# 127.0.0.1:<port> exigée, en-tête X-DEFA-Setup : une autre page web ne peut pas l'envoyer sans pré-vérification CORS,
# à laquelle ce serveur ne répond pas)
class Setup(http.server.SimpleHTTPRequestHandler):
    port = 0

    def log_message(self, *a):
        pass

    def _allowed(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.port}', f'localhost:{self.port}') and self.headers.get('X-DEFA-Setup') == '1'

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/__setup/status':
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            git = shutil.which('git')
            return self._json({'server': True, 'root': ROOT, 'git': bool(git), 'data': has_data(),
                               'dataGit': os.path.isdir(os.path.join(DATA, '.git')), 'dataRepo': data_repo_url()})
        if self.path.split('?')[0] == '/__setup/sia-zip':
            # ZIP du SIA téléchargé : ?info → nom, taille, date ; sinon le fichier lui-même
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            z = sia_zip()
            if 'info' in self.path:
                return self._json({'found': bool(z), 'name': os.path.basename(z) if z else '', 'size': os.path.getsize(z) if z else 0,
                                   'mtime': os.path.getmtime(z) if z else 0, 'where': [os.path.basename(d) or d for d in downloads_dirs()]})
            if not z:
                return self._json({'error': 'aucun ZIP du SIA'}, 404)
            with open(z, 'rb') as f:
                body = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/zip')
            self.send_header('X-File-Name', urllib.parse.quote(os.path.basename(z)))
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return None
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        if not path.startswith('/__setup/') or not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        size = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(size) if size else b''
        if path == '/__setup/clone':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            ok, log = clone((a.get('user') or '').strip(), a.get('secret') or '', bool(a.get('remember')))
            return self._json({'ok': ok, 'message': log})
        if path == '/__setup/upload':
            kind = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('kind', [''])[0]
            with tempfile.NamedTemporaryFile(delete=False, suffix='.upload') as f:
                f.write(body)
                tmp = f.name
            try:
                if kind == 'data':
                    if has_data():
                        return self._json({'ok': False, 'message': 'Les données sont déjà là (data/data_tree.js).'})
                    ok = extract_data(tmp, quiet=True)
                    return self._json({'ok': ok, 'message': 'Données installées dans data/.' if ok else 'Ce fichier n’est pas une archive de données (data_tree.js absent).'})
                if kind == 'log':
                    if not has_data():
                        return self._json({'ok': False, 'message': 'Installez d’abord les données (étape 1).'})
                    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'defa_reference.py'), tmp], cwd=ROOT,
                                       capture_output=True, text=True, encoding='utf-8', errors='replace')
                    return self._json({'ok': r.returncode == 0, 'message': (r.stdout + r.stderr).strip()[-1500:] or 'Référence DEFA mise à jour.'})
                return self._json({'ok': False, 'message': 'Type de fichier inconnu.'}, 400)
            finally:
                try:
                    os.remove(tmp)
                except OSError:
                    pass
        return self._json({'error': 'inconnu'}, 404)


def downloads_dirs():
    """Dossiers où chercher un téléchargement : Téléchargements (emplacement réel sous Windows, même déplacé), racine."""
    dirs = []
    if os.name == 'nt':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders') as k:
                dirs.append(os.path.expandvars(winreg.QueryValueEx(k, '{374DE290-123F-4565-9164-39C4925E467B}')[0]))
        except OSError:
            pass
    dirs += [os.path.join(os.path.expanduser('~'), 'Downloads'), os.path.join(os.path.expanduser('~'), 'Téléchargements'), ROOT]
    return [d for i, d in enumerate(dirs) if os.path.isdir(d) and d not in dirs[:i]]


def sia_zip():
    """Dernier ZIP d'export du SIA téléchargé (export_xml_bd_SIA_<date>[-vNN].zip), ou None."""
    found = [p for d in downloads_dirs() for p in glob.glob(os.path.join(d, 'export_xml_bd_SIA_*.zip'))]
    return max(found, key=os.path.getmtime) if found else None


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
    Setup.port = port
    handler = lambda *x, **k: Setup(*x, directory=ROOT, **k)
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
