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
import argparse, glob, http.server, io, json, os, re, secrets, shutil, socket, subprocess, sys, tempfile, threading, time
import urllib.parse, urllib.request, webbrowser, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data_sync  # synchronisation git du pool de données (bouton « Synchroniser »)
import aero_fetch  # données aéronautiques d'autres pays (Paramètres › Maintenance › Données aéronautiques)

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


def va_short():
    """Sigle de la compagnie virtuelle (config/repository_tree, va.short), écrit dans le champ va des fichiers de données ;
    repli : SOG."""
    try:
        with open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8') as f:
            m = re.search(r'\bva:\{[^}]*?\bshort:"([^"]+)"', f.read())
        return m.group(1) if m else 'SOG'
    except OSError:
        return 'SOG'


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
    """Git sans question dans le terminal ni fenêtre d'identifiants (la page les demande), SSH compris."""
    return data_sync.git_env()


def clone(user=None, secret=None, remember=False, url=None):
    """Clone du dépôt de données ; identifiants : ceux de la page (le temps du clone), sinon ceux que Git connaît.
    Retourne (ok, journal)."""
    git = shutil.which('git')
    if not git:
        return False, 'Git n’est pas installé (https://git-scm.com) : utilisez l’archive des données.'
    if os.path.isdir(DATA) and os.listdir(DATA):
        return False, 'Le dossier data/ existe déjà et n’est pas vide : il est laissé tel quel.'
    if any(c in (user or '') + (secret or '') for c in '\r\n\0'):
        return False, 'Identifiant ou mot de passe invalide (retour à la ligne).'  # pas de champ glissé dans « git credential »
    url = (url or '').strip() or data_repo_url()  # dépôt précisé au premier lancement, sinon celui de la configuration
    if not data_sync.REMOTE_RE.match(url):
        return False, 'Adresse du dépôt invalide.'
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
# 127.0.0.1:<port> exigée, en-tête X-SOG-Setup : une autre page web ne peut pas l'envoyer sans pré-vérification CORS,
# à laquelle ce serveur ne répond pas)
class Setup(http.server.SimpleHTTPRequestHandler):
    port = 0
    MAX_UPLOAD = 512 * 1024 * 1024  # archive des données ou journal : 512 Mo au plus

    def log_message(self, *a):
        pass

    def _local_host(self):
        """En-tête Host de cette machine : une page d'un autre site qui ferait pointer son nom vers 127.0.0.1
        (« DNS rebinding ») envoie son propre nom et se voit refuser tout le dossier, données comprises."""
        return self.headers.get('Host') in (f'127.0.0.1:{self.port}', f'localhost:{self.port}', f'[::1]:{self.port}')

    def _allowed(self):
        return self._local_host() and (self.headers.get('X-SOG-Setup') == '1' or self.headers.get('X-DEFA-Setup') == '1')

    def translate_path(self, path):
        """/data/… : dossier de données choisi (--data), s'il n'est pas celui de la suite."""
        p = super().translate_path(path)
        if os.path.normcase(DATA) == os.path.normcase(os.path.join(ROOT, 'data')):
            return p
        rel = urllib.parse.unquote(path.split('?', 1)[0].split('#', 1)[0])
        if rel == '/data' or rel.startswith('/data/'):
            out = os.path.normpath(os.path.join(DATA, *[x for x in rel[6:].split('/') if x]))
            return out if out == DATA or out.startswith(DATA + os.sep) else DATA
        return p

    purge = True  # première page servie par ce lanceur : vider le cache du navigateur pour ce site

    def end_headers(self):
        if getattr(self, '_purge', False):
            # versions précédentes : pages et scripts gardés en cache (dont un type refusé avec nosniff) ; le navigateur
            # les jette tous à la première page de chaque lancement
            self.send_header('Clear-Site-Data', '"cache"')
            Setup.purge = False
        self.send_header('X-Content-Type-Options', 'nosniff')
        # fichier versionné par son empreinte (?v=…, tools/bump_versions.py : elle change avec le contenu) : gardé tel
        # quel, sans revalidation — une quarantaine d'allers-retours de moins par page, qui retardaient la fin de
        # l'analyse et laissaient voir la page à moitié construite ; le reste (pages, données) : revalidé à chaque fois,
        # jamais de script périmé (ni de type) en cache
        versioned = re.search(r'[?&]v=[0-9a-f]{6,}', self.path or '')
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if versioned else 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        # config/repository_tree (sans extension) est un script : avec nosniff, servi en octet-stream il ne
        # s'exécuterait pas (plus de menu ni de barre latérale)
        if os.path.basename(str(path).split('?')[0]) == 'repository_tree':
            return 'text/javascript'
        return super().guess_type(path)

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self):
        if not self._local_host():
            return self._json({'error': 'refusé'}, 403)
        return super().do_HEAD()

    def do_GET(self):
        if not self._local_host():
            return self._json({'error': 'refusé'}, 403)
        # index du pool demandés : refaits d'abord (fichiers changés depuis le démarrage : git, autre poste, éditeur),
        # leurs signatures doivent dire vrai — une page sert sa copie d'un fichier tant que sa signature n'a pas changé
        idx = self.path.split('?')[0]
        if idx.endswith('/data/disponibilites/_index.json'):
            with INDEX_LOCK:  # serveur à fils : une seule réécriture à la fois
                index_availability()
        elif idx.endswith('/data/utilisateurs/_index.json'):
            with INDEX_LOCK:
                index_users()
        self._purge = Setup.purge and re.search(r'(\.html|/)$', self.path.split('?')[0]) is not None
        if self.path.split('?')[0] == '/__setup/status':
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            git = shutil.which('git')
            return self._json({'server': True, 'root': ROOT, 'git': bool(git), 'data': has_data(),
                               'dataGit': os.path.isdir(os.path.join(DATA, '.git')), 'dataRepo': data_repo_url()})
        if self.path.split('?')[0] == '/__setup/sync-remote':
            # dépôt git de synchronisation de data/ : adresse actuelle (ou celle du clone par défaut)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json({**data_sync.remote_info(DATA), 'default': data_repo_url()})
        if self.path.split('?')[0] == '/__setup/sync-status':
            # synchronisation git du pool (tools/data_sync.py) : état pour le bouton de l'en-tête ; ?fetch=1 : relu
            # sur le dépôt distant (commits à recevoir)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(data_sync.status(DATA, fetch='fetch=1' in self.path))
        if self.path.split('?')[0] == '/__setup/tools':
            # outils de tools/ (sommaire tools/index.html) : nom, sorte, titre et en-tête de chaque fichier
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json({'tools': tools_inventory()})
        if self.path.split('?')[0] == '/__setup/vatsim-bookings':
            # réservations ATC publiques de VATSIM (Planning ODV, shared/atc_sessions.js) : l'API ne permet pas la
            # lecture directe depuis une page (pas d'en-tête CORS) ; relayées ici
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(vatsim_bookings())
        if self.path.split('?')[0] == '/__setup/aircraft-db':
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json({**AIRCRAFT, **aircraft_files()})
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
        try:
            size = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            return self._json({'error': 'taille invalide'}, 400)
        if size < 0 or size > self.MAX_UPLOAD:
            return self._json({'error': 'fichier trop gros'}, 413)
        body = self.rfile.read(size) if size else b''
        if path == '/__setup/perf':
            # mesures de l'audit de performance (tools/perf_audit.html) : docs/technique/perf/runs/<nom>.json
            name = re.sub(r'[^\w.-]+', '_', urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('name', ['audit'])[0])[:80]
            try:
                json.loads(body or b'null')
            except ValueError:
                return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
            out = os.path.join(ROOT, 'docs', 'technique', 'perf', 'runs')
            os.makedirs(out, exist_ok=True)
            with open(os.path.join(out, name + '.json'), 'wb') as f:
                f.write(body)
            return self._json({'ok': True, 'file': f'docs/technique/perf/runs/{name}.json'})
        if path == '/__setup/sync-remote':
            # dépôt git de synchronisation de data/ (premier lancement) : vérifié (git ls-remote), enregistré si demandé ;
            # jamais bloquant : le compte rendu dit seulement si le dépôt répond
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            url = str(a.get('url') or '').strip()
            r = {'check': data_sync.check_remote(url)}
            if a.get('save'):
                r['saved'] = data_sync.set_remote(DATA, url)
            return self._json(r)
        if path == '/__setup/sync':
            # un passage de synchronisation (commit au nom du trigramme, fusion fiche par fiche, envoi), un à la fois
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            with SYNC_LOCK:
                r = data_sync.run(DATA, str(a.get('author') or '').upper(), str(a.get('name') or '')[:60])
            if r.get('received'):
                with INDEX_LOCK:
                    index_availability()
                    index_users()
            return self._json(r)
        if path == '/__setup/aircraft-db':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            return self._json({'started': aircraft_start(a.get('codes') or []), **AIRCRAFT, **aircraft_files()})
        if path == '/__setup/aero-fetch':
            # données aéronautiques d'autres pays (tools/aero_fetch.py) : téléchargées dans data/sia/<source>/
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            args = [str(x)[:12] for x in (a.get('args') or [])][:40]
            with AERO_LOCK:
                return self._json(aero_fetch.fetch(DATA, str(a.get('provider') or ''), args))
        if path == '/__setup/clone':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            ok, log = clone((a.get('user') or '').strip(), a.get('secret') or '', bool(a.get('remember')), a.get('url'))
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
                    return self._json({'ok': r.returncode == 0, 'message': (r.stdout + r.stderr).strip()[-1500:] or 'Référence mise à jour.'})
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


def tools_inventory():
    """Outils de tools/ pour le sommaire tools/index.html : nom, sorte (page, python, shell, dossier), titre (<title> d'une
    page) et en-tête (meta description, docstring de tête d'un script Python, commentaires de tête d'un script shell).
    Fichiers « _… » (brouillons), README et caches exclus."""
    out = []
    base = os.path.join(ROOT, 'tools')
    for name in sorted(os.listdir(base), key=str.lower):
        p = os.path.join(base, name)
        if name.startswith(('_', '.')) or name in ('README.md', 'index.html', '__pycache__'):
            continue
        item = {'name': name, 'kind': 'dossier' if os.path.isdir(p) else os.path.splitext(name)[1].lstrip('.'), 'title': '', 'head': ''}
        if os.path.isfile(p):
            try:
                with open(p, encoding='utf-8', errors='replace') as f:
                    text = f.read(12000)
            except OSError:
                text = ''
            if name.endswith('.html'):
                m = re.search(r'<title>(.*?)</title>', text, re.S | re.I)
                item['title'] = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
                m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', text, re.I)
                item['head'] = m.group(1) if m else ''
            elif name.endswith('.py'):
                m = re.search(r'^(?:#.*\n|\s*\n)*(?:r|u)?("""|\'\'\')(.*?)\1', text, re.S)
                item['head'] = m.group(2).strip() if m else ''
            elif name.endswith('.sh'):
                lines = []
                for l in text.splitlines()[1:]:  # bloc de commentaires sous le shebang
                    if not l.startswith('#'):
                        break
                    lines.append(l[1:].strip())
                item['head'] = '\n'.join(lines)
        out.append(item)
    return out


def sia_zip():
    """Dernier ZIP d'export du SIA téléchargé (export_xml_bd_SIA_<date>[-vNN].zip), ou None."""
    found = [p for d in downloads_dirs() for p in glob.glob(os.path.join(d, 'export_xml_bd_SIA_*.zip'))]
    return max(found, key=os.path.getmtime) if found else None


class Server(http.server.ThreadingHTTPServer):
    """Serveur de la suite : une connexion coupée par le navigateur (page quittée, image ou téléchargement annulé) n'est
    pas une erreur, elle ne s'affiche pas ; les autres gardent leur trace."""

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


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


VATSIM_BOOKINGS = 'https://atc-bookings.vatsim.net/api/booking'
_vatsim = {'at': 0.0, 'data': None}


def vatsim_bookings():
    """Réservations ATC de VATSIM (toutes divisions ; trainings, examens, événements, réservations) : { bookings: […] },
    gardées 5 minutes ; { error } si l'API ne répond pas."""
    if _vatsim['data'] is not None and time.time() - _vatsim['at'] < 300:
        return _vatsim['data']
    try:
        req = urllib.request.Request(VATSIM_BOOKINGS, headers={'User-Agent': 'DEFA-suite', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.load(r)
    except (OSError, ValueError) as e:
        return {'error': str(e)}
    _vatsim.update(at=time.time(), data={'bookings': data if isinstance(data, list) else []})
    return _vatsim['data']


# Repère de cette installation : un jeton tiré à chaque lancement, écrit à la racine et dans les dossiers de données.
# Les pages le lisent par le serveur et dans le dossier autorisé du navigateur (FileAccess) : jetons différents = le
# dossier choisi est une autre copie de la suite (ex. « DEFA - Copy »), signalée. Fichier ignoré par git.
INSTANCE_FILE = '.defa_instance'
INSTANCE_DIRS = ('', 'data', os.path.join('data', 'missions'), os.path.join('data', 'cr'), os.path.join('data', 'sia'),
                 os.path.join('data', 'planner'))


INDEX_LOCK = threading.Lock()
# ---- base des types d'aéronefs (OACI Doc 8643, performances EUROCONTROL) : non publiée, complétée sur chaque poste,
# type par type, par AircraftDB/update_aircraft_db.py (--only CODES, puis --apd CODES) : un nouvel appareil, ou une liste
# (flotte, missions de l'ODV et du registre) — Paramètres › Maintenance › Références et dépendances, /__setup/aircraft-db.
# Jamais toute la base EUROCONTROL d'un coup.
AIRCRAFT = {'state': 'idle', 'step': '', 'started': None, 'ended': None, 'log': []}
AIRCRAFT_LOCK = threading.Lock()


def aircraft_files():
    d = os.path.join(ROOT, 'AircraftDB')
    return {'db': os.path.exists(os.path.join(d, 'aircraft_db.js')), 'perf': os.path.exists(os.path.join(d, 'aircraft_perf.js'))}


def aircraft_rebuild(codes):
    d = os.path.join(ROOT, 'AircraftDB')
    script = os.path.join(d, 'update_aircraft_db.py')
    overrides = os.path.join(DATA, 'references', 'aircraft_overrides.json')
    steps = [('types (OACI Doc 8643) : ' + ' '.join(codes), [sys.executable, script, '--only', *codes, '--overrides', overrides]),
             ('performances (EUROCONTROL APD) : ' + ' '.join(codes), [sys.executable, script, '--apd', *codes])]
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
    ok = True
    for name, cmd in steps:
        AIRCRAFT['step'] = name
        try:
            p = subprocess.Popen(cmd, cwd=d, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, text=True, encoding='utf-8', errors='replace')
            for line in p.stdout:
                AIRCRAFT['log'] = (AIRCRAFT['log'] + [line.rstrip()])[-40:]
            ok = p.wait() == 0 and ok
        except OSError as e:
            AIRCRAFT['log'].append(str(e))
            ok = False
    AIRCRAFT.update(state='done' if ok else 'error', step='', ended=time.time())


def aircraft_start(codes):
    """Complète les types donnés (désignateurs OACI) en tâche de fond ; False si une passe tourne déjà ou si la liste
    est vide."""
    codes = sorted({re.sub(r'[^A-Z0-9]', '', str(c).upper())[:8] for c in codes} - {''})[:200]
    if not codes:
        return False
    with AIRCRAFT_LOCK:
        if AIRCRAFT['state'] == 'running':
            return False
        AIRCRAFT.update(state='running', started=time.time(), ended=None, log=[], codes=codes)
    threading.Thread(target=aircraft_rebuild, args=(codes,), daemon=True).start()
    return True


AERO_LOCK = threading.Lock()  # un téléchargement de données aéronautiques à la fois (tools/aero_fetch.py)
SYNC_LOCK = threading.Lock()  # une synchronisation git à la fois (tools/data_sync.py)  # index du pool refaits à la demande (do_GET)


def index_availability():
    """data/disponibilites/_index.json : pilotes qui ont déclaré leurs disponibilités. Les pages ne demandent que ces
    fichiers (l'ODV en demandait un par pilote, presque tous absents). Entrée d'un pilote : { weeks: [semaines ISO du
    dossier <TRI>/ (format par plages, docs/technique/DISPOS_ET_REORGANISATION.md § 1.3)], at: { semaine: updated_at du fichier }
    (signature : les pages gardent les fichiers dans leur index et ne relisent que ceux dont la date a changé,
    docs/technique/INDEX_DONNEES.md § 3), legacy: true (ancien fichier <TRI>.json), legacy_at (sa signature) }. Refait à chaque demande de l'index (do_GET) ;
    réécrit seulement s'il change ; ignoré par git (régénéré)."""
    d = os.path.join(DATA, 'disponibilites')
    if not os.path.isdir(d):
        return
    pilots = {}
    for n in sorted(os.listdir(d)):
        m = re.match(r'^([A-Za-z0-9]{2,5})(\.json)?$', n)
        if not m:
            continue
        p = os.path.join(d, n)
        if m.group(2) and os.path.isfile(p):
            e = pilots.setdefault(m.group(1).upper(), {})
            e['legacy'] = True
            e['legacy_at'] = updated_at(p)
        elif not m.group(2) and os.path.isdir(p):
            weeks = sorted(x[:-5] for x in os.listdir(p) if re.match(r'^\d{4}-W\d{2}\.json$', x))
            if weeks:
                e = pilots.setdefault(m.group(1).upper(), {})
                e['weeks'] = weeks
                e['at'] = {w: updated_at(os.path.join(p, w + '.json')) for w in weeks}
    p = os.path.join(d, '_index.json')
    try:
        old = json.load(open(p, encoding='utf-8')).get('pilots')
    except (OSError, ValueError):
        old = None
    if old != pilots:
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'schema': 2, 'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'pilots': pilots}, f, indent=1)


def updated_at(path):
    """Champ updated_at d'un fichier JSON du pool (signature dans les index) ; '' s'il est illisible."""
    try:
        return str(json.load(open(path, encoding='utf-8')).get('updated_at') or '')
    except (OSError, ValueError, AttributeError):
        return ''


def index_users():
    """data/utilisateurs/_index.json : trigramme → rôle, actif, nom, updated_at de la fiche (signature, comme
    index_availability) (fiches <TRI>.json, docs/technique/DISPOS_ET_REORGANISATION.md § 2). Les pages s'en servent pour lister
    les utilisateurs ; refait à chaque demande ; réécrit seulement s'il change."""
    d = os.path.join(DATA, 'utilisateurs')
    if not os.path.isdir(d):
        return
    users = {}
    for n in sorted(os.listdir(d)):
        m = re.match(r'^([A-Z0-9]{2,5})\.json$', n)
        if not m:
            continue
        try:
            u = json.load(open(os.path.join(d, n), encoding='utf-8'))
        except (OSError, ValueError):
            continue
        users[m.group(1)] = {'role': u.get('role') or 'utilisateur', 'actif': u.get('actif') is not False, 'nom': u.get('nom') or '',
                             'updated_at': str(u.get('updated_at') or '')}
    p = os.path.join(d, '_index.json')
    try:
        old = json.load(open(p, encoding='utf-8')).get('utilisateurs')
    except (OSError, ValueError):
        old = None
    if old != users:
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'schema': 1, 'va': va_short(), 'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'utilisateurs': users}, f, indent=1, ensure_ascii=False)


def mark_instance():
    token = secrets.token_hex(8)
    for d in INSTANCE_DIRS:
        p = os.path.join(ROOT, d)
        if os.path.isdir(p):
            try:
                # 2e ligne : chemin réel du dossier (liens résolus), cité par les pages quand ce dossier est choisi
                # depuis une autre copie de la suite (le navigateur ne donne que le nom du dossier)
                with open(os.path.join(p, INSTANCE_FILE), 'w', encoding='utf-8', newline='\n') as f:
                    f.write(token + '\n' + os.path.realpath(p) + '\n')
            except OSError:
                pass  # dossier en lecture seule : pas de contrôle pour lui
    return token


def main():
    ap = argparse.ArgumentParser(description='Lanceur de la suite DEFA (données, serveur local, navigateur).')
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--page', default=PAGE)
    ap.add_argument('--no-browser', action='store_true')
    ap.add_argument('--no-data', action='store_true')
    ap.add_argument('--data', help='autre dossier de données servi sous /data/ (essais sur une copie, ex. synchronisation)')
    a = ap.parse_args()
    global DATA
    if a.data:  # autre dossier de données (copie d'essai) : servi sous /data/, ni clone ni mise à jour au démarrage
        DATA = os.path.abspath(a.data)
        a.no_data = True
    if sys.version_info < (3, 8):
        say('Python 3.8 ou plus récent est nécessaire : https://www.python.org/downloads/')
        return 1
    say('X-Plane Web Suite — lanceur')
    say(f'Dossier : {ROOT}')
    if a.data:
        say(f'Données : {DATA} (--data)')
    say('')
    if not a.no_data:
        ensure_data()
    say('2. Serveur local')
    port = a.port
    for p in range(a.port, a.port + 20):
        if ours(p):
            url = f'http://127.0.0.1:{p}/{a.page}?t={int(time.time())}'  # adresse neuve : page jamais reprise du cache
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
    mark_instance()
    index_availability()
    index_users()
    if not aircraft_files()['db']:
        say("  Base des types d'aéronefs absente : la compléter dans Paramètres › Maintenance › Références et dépendances.")
    handler = lambda *x, **k: Setup(*x, directory=ROOT, **k)
    srv = Server(('127.0.0.1', port), handler)
    url = f'http://127.0.0.1:{port}/{a.page}?t={int(time.time())}'  # adresse neuve : page jamais reprise du cache
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
