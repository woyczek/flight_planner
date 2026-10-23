"""Lanceur de la suite (appelé par lancer.cmd / lancer.sh, à la racine) : données, serveur local, navigateur.

1. Données (data/, dépôt privé) :
   - déjà là (data/data_tree.js) : mise à jour si c'est un clone git (git pull, sans bloquer en cas d'échec) ;
   - sinon, une archive reçue par mail (un .zip qui contient data_tree.js), déposée à la racine du dossier : extraite
     dans data/ ;
   - sinon, clone du dépôt de données s'il a une adresse (config/repository_tree › sources.dataRepo, vide par défaut : la
     page de premier lancement la demande, ou propose le jeu d'essai tools/jeu_essai.py), si Git connaît déjà les
     identifiants ; sinon, la page de premier lancement les demande (ou l'archive).
2. Serveur web local (http://127.0.0.1, premier port libre à partir de 8000) servi depuis la racine du dossier, avec
   l'interface de la page de premier lancement (/__setup/…, voir Setup) ; déjà lancé : on ouvre seulement le navigateur.
3. Navigateur ouvert sur la page de premier lancement (apps/settings/premier_lancement.html), qui renvoie vers
   l'accueil une fois la suite réglée.

Usage : python tools/launch.py [--port 8000] [--page apps/…] [--no-browser] [--no-data]
Arrêt : fermer la fenêtre, ou Ctrl+C.
"""
import argparse, datetime, fnmatch, glob, hashlib, http.server, io, json, math, os, re, secrets, shutil, socket, subprocess, sys, tempfile, threading, time
import ipaddress, posixpath, urllib.parse, urllib.request, webbrowser, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data_sync  # synchronisation git du pool de données (bouton « Synchroniser ») ; git durci (data_sync.git_cmd)
import data_guard  # .js de data/ : servis seulement s'ils suivent le format des fichiers de données
import report_bridge  # pont du registre : comptes rendus V3 (cr/reports/) rejoués dans cr/missions.yaml (V2)
import csp_policy as cspmod  # politique de sécurité du contenu, commune au site sans lanceur (tools/build_pages.py)
import aero_fetch  # données aéronautiques d'autres pays (Paramètres › Maintenance › Données aéronautiques)
from check_binaries import POINTER as LFS_POINTER  # début d'un pointeur Git LFS (fichier non récupéré)
import version_stamps  # empreintes ?v=… posées au moment de servir (pages, scripts, feuilles des designs)

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
PAGE = 'apps/settings/premier_lancement.html'
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def say(msg=''):
    """Message à la console du lanceur, écrit aussitôt (sortie non tamponnée)."""
    print(msg, flush=True)


def config_text():
    """Texte de config/repository_tree (ou de l'ancien repository_tree à la racine) ; '' s'il manque."""
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
    """Dépôt de données de la configuration (sources.dataRepo) ; chaîne vide s'il n'y en a pas (pas d'adresse par défaut :
    l'utilisateur la donne au premier lancement)."""
    m = re.search(r'dataRepo\s*:\s*\{\s*url\s*:\s*"([^"]*)"', config_text())
    url = m.group(1).strip() if m else ''
    return url if not url or url.endswith('.git') else url + '.git'


def run(cmd, **kw):
    """Lance une commande (dossier de la suite par défaut) ; code de sortie, -1 si elle ne démarre pas."""
    try:
        return subprocess.run(cmd, cwd=kw.pop('cwd', ROOT), **kw).returncode
    except (OSError, subprocess.SubprocessError):
        return -1


def has_data():
    """Vrai si le dossier des données est en place (data/data_tree.js présent)."""
    return os.path.isfile(os.path.join(DATA, 'data_tree.js'))


# archive des données : jamais extraits — un .git/ reçu ferait lancer une commande par git (core.fsmonitor, crochets),
# un exécutable n'a rien à faire dans des données
SKIP_EXT = ('.exe', '.dll', '.xpl', '.so', '.dylib', '.bat', '.cmd', '.com', '.scr', '.ps1', '.psm1', '.vbs', '.vbe',
            '.wsf', '.hta', '.lnk', '.msi', '.jar', '.sh', '.py', '.pyw')


def extract_data(z, quiet=False):
    """Archive des données (.zip contenant data_tree.js) extraite dans data/ ; faux si ce n'en est pas une. Dossiers
    .git et exécutables ignorés (SKIP_EXT)."""
    try:
        with zipfile.ZipFile(z) as zf:
            marker = next((n for n in zf.namelist() if n.endswith('data_tree.js')), None)
            if not marker:
                return False
            prefix = marker[:-len('data_tree.js')]
            if not quiet:
                say(f'  Archive des données : {os.path.basename(z)} → data/')
            skipped = []
            for info in zf.infolist():
                if info.is_dir() or not info.filename.startswith(prefix):
                    continue
                parts = info.filename[len(prefix):].replace('\\', '/').split('/')
                if any(x.lower().rstrip('. ') == '.git' for x in parts) or parts[-1].lower().rstrip('. ').endswith(SKIP_EXT):
                    skipped.append(info.filename[len(prefix):])
                    continue
                target = os.path.normpath(os.path.join(DATA, info.filename[len(prefix):]))
                if not target.startswith(DATA + os.sep):
                    continue  # chemin hors de data/ : ignoré
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with zf.open(info) as src, open(target, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
            if skipped:
                say(f'  {len(skipped)} fichier(s) ignoré(s) (dossier .git ou exécutable) : ' + ', '.join(skipped[:5]) + ('…' if len(skipped) > 5 else ''))
            return True
    except (zipfile.BadZipFile, OSError):
        return False


def from_archive():
    """Archive reçue par mail, déposée à la racine (ou dans data/)."""
    return any(extract_data(z) for z in sorted(glob.glob(os.path.join(ROOT, '*.zip')) + glob.glob(os.path.join(DATA, '*.zip'))))


def git_env():
    """Git sans question dans le terminal ni fenêtre d'identifiants (la page les demande), SSH compris."""
    return data_sync.git_env()


def git_auth(user, secret):
    """Identifiants de la page le temps d'une commande git : (variables d'environnement, options -c) — assistant
    d'identifiants éphémère, rien n'est écrit dans .git/config ni dans l'adresse. Sans les deux : ({}, [])."""
    if not (user and secret):
        return {}, []
    return ({'DEFA_GIT_U': user, 'DEFA_GIT_P': secret},
            ['-c', 'credential.helper=', '-c', 'credential.helper=!f() { echo "username=$DEFA_GIT_U"; echo "password=$DEFA_GIT_P"; }; f'])


def remember_credentials(url, user, secret):
    """Identifiants confiés à l'assistant d'identifiants de Git (case « Se souvenir »)."""
    git = data_sync.git_exe()
    if git and user and secret:
        host = urllib.parse.urlparse(url)
        subprocess.run([git, 'credential', 'approve'], input=f'protocol={host.scheme}\nhost={host.netloc}\nusername={user}\npassword={secret}\n\n',
                       text=True, capture_output=True, cwd=ROOT)


def clone(user=None, secret=None, remember=False, url=None):
    """Clone du dépôt de données ; identifiants : ceux de la page (le temps du clone), sinon ceux que Git connaît.
    Retourne (ok, journal)."""
    git = data_sync.git_exe()
    if not git:
        return False, 'Git n’est pas installé (https://git-scm.com) : utilisez l’archive des données.'
    if os.path.isdir(DATA) and os.listdir(DATA):
        return False, 'Le dossier data/ existe déjà et n’est pas vide : il est laissé tel quel.'
    if any(c in (user or '') + (secret or '') for c in '\r\n\0'):
        return False, 'Identifiant ou mot de passe invalide (retour à la ligne).'  # pas de champ glissé dans « git credential »
    url = (url or '').strip() or data_repo_url()  # dépôt précisé au premier lancement, sinon celui de la configuration
    if not url:
        return False, 'Adresse du dépôt de données à préciser.'
    if not data_sync.REMOTE_RE.match(url):
        return False, data_sync.REMOTE_HELP
    extra, auth = git_auth(user, secret)
    env = dict(git_env(), **extra)
    cmd = data_sync.git_cmd(*auth)
    if run([git, 'lfs', 'version'], capture_output=True) == 0:
        run([git, 'lfs', 'install'], capture_output=True)
    try:
        r = subprocess.run(cmd + ['clone', '--', url, DATA], cwd=ROOT, env=env, capture_output=True, text=True,
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
    ensure_lfs(DATA, 'data', 'Données')  # données clonées : fichiers Git LFS récupérés, ou signalés
    if remember:
        remember_credentials(url, user, secret)
    return True, 'Données récupérées.'


def ensure_data():
    """Étape 1 du lancement : données présentes mises à jour (git pull en avance rapide si data/ est un dépôt) ; sinon
    archive reçue, sinon clone du dépôt de données ; à défaut, la page de premier lancement prend le relais."""
    say('1. Données (dossier data/)')
    git = data_sync.git_exe()
    if has_data():
        if git and os.path.isdir(os.path.join(DATA, '.git')):
            # mise à jour sans « git pull » (son réglage pull.rebase et une modification locale l'arrêtaient) : fiches du
            # poste commitées d'abord, branche distante fusionnée fiche par fiche, rien d'envoyé (tools/data_sync.update)
            say('  Données présentes : mise à jour depuis le dépôt…')
            with SYNC_LOCK:
                r = data_sync.update(DATA)
            say('  ' + r['message'])
        else:
            say('  Données présentes.')
        return True
    if from_archive():
        return True
    if git and data_repo_url():
        say(f'  Essai du dépôt de données : {data_repo_url()}')
        ok, log = clone()
        if ok:
            say('  Données récupérées.')
            return True
    say('  Données pas encore là : la page de premier lancement propose le jeu d’essai, l’adresse de votre dépôt de données')
    say('  ou l’archive reçue.')
    return False


def sample_data():
    """Jeu d'essai livré avec la suite (tools/jeu_essai.py) installé dans data/ ; refusé si des données y sont déjà.
    Retourne (ok, journal)."""
    if has_data():
        return False, 'Des données sont déjà dans data/ (data_tree.js) : le jeu d’essai ne les remplace pas.'
    script = os.path.join(ROOT, 'tools', 'jeu_essai.py')
    if not os.path.isfile(script):
        return False, 'Jeu d’essai absent de cette version de la suite (tools/jeu_essai.py).'
    try:
        r = subprocess.run([sys.executable, script, '--data', DATA], cwd=ROOT, capture_output=True, text=True,
                           encoding='utf-8', errors='replace', timeout=300, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)
    log = (r.stdout + r.stderr).strip()[-3000:]
    return r.returncode == 0 and has_data(), log or ('Jeu d’essai installé.' if r.returncode == 0 else 'Échec du jeu d’essai.')


# ---- ce que le serveur ne sert pas (docs/technique/AUDIT_SECURITE_2026-10-07.md) : secrets/, data/local/ (copie du
# stockage du navigateur), fichiers et dossiers « . » (.git, .defa_site.json…) sauf le repère .defa_instance et, dans le
# .git de la suite, ce que lit le pied de page (HEAD, références, objets : numéro de commit) ; listes de dossiers
GIT_FOOTER = re.compile(r'HEAD|packed-refs|refs/[\w./-]+|objects/[0-9a-f]{2}/[0-9a-f]{38}')
# fichiers de data/ qu'un navigateur exécuterait s'ils étaient ouverts directement : servis en bac à sable
SANDBOXED = ('.html', '.htm', '.xhtml', '.svg', '.xml', '.xsl', '.xslt')


def hidden(parts):
    """Vrai si un chemin (segments depuis la racine servie, minuscules) n'est pas à servir."""
    if not parts:
        return False
    if parts[0] == 'secrets' or parts[:2] == ['data', 'local']:
        return True
    if parts[0] == '.git':
        return not GIT_FOOTER.fullmatch('/'.join(parts[1:]))
    return any(x.startswith('.') and not (i == len(parts) - 1 and x == '.defa_instance') for i, x in enumerate(parts))


# ---- interface de la page de premier lancement (/__setup/…) : seulement depuis la page servie ici (adresse
# 127.0.0.1:<port> exigée, en-tête X-SOG-Setup : une autre page web ne peut pas l'envoyer sans pré-vérification CORS,
# à laquelle ce serveur ne répond pas)
class Setup(http.server.SimpleHTTPRequestHandler):
    port = 0
    MAX_UPLOAD = 512 * 1024 * 1024  # archive des données ou journal : 512 Mo au plus

    def log_message(self, *a):
        """Journal des requêtes coupé : la console ne garde que les messages du lanceur."""
        pass

    def _local_host(self):
        """En-tête Host de cette machine : une page d'un autre site qui ferait pointer son nom vers 127.0.0.1
        (« DNS rebinding ») envoie son propre nom et se voit refuser tout le dossier, données comprises."""
        return self.headers.get('Host') in (f'127.0.0.1:{self.port}', f'localhost:{self.port}', f'[::1]:{self.port}')

    def _same_origin(self):
        """Requête de la suite elle-même : en-tête Sec-Fetch-Site du navigateur « same-origin » ou « none » (adresse
        tapée, favori, ouverture par le lanceur) ; absent pour un programme (curl, le lanceur). Un autre site (même
        une autre copie sur un autre port) ne lit rien : sans ce contrôle, <script src="http://127.0.0.1:8000/data/…">
        depuis n'importe quelle page web lisait les données (window.DATA_TREE, DEFA_REFERENCE…)."""
        return self.headers.get('Sec-Fetch-Site') in (None, 'same-origin', 'none')

    def _refused(self):
        """Raison de refuser la requête ('' : servie) — hôte, origine, chemin caché."""
        if not self._local_host():
            return 'hôte'
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if not self._same_origin() and not self._relaxed_navigation(path):
            return 'autre site'
        if path.startswith('/__setup/'):
            return ''
        rel = posixpath.normpath(urllib.parse.unquote(path))
        parts = [x for x in rel.split('/') if x not in ('', '.')]
        if any(':' in x or '\\' in x for x in parts):
            return 'chemin'  # flux NTFS (fichier::$DATA), séparateur Windows
        if hidden([x.lower().rstrip('. ') for x in parts]):  # Windows ignore la casse et les points ou espaces finaux
            return 'chemin'
        # même contrôle sur le chemin réel (noms courts 8.3, liens, dossier --data) : ce qui est réellement lu
        real = os.path.normcase(os.path.realpath(self.translate_path(self.path)))
        for base, prefix in ((DATA, ['data']), (ROOT, [])):
            b = os.path.normcase(os.path.realpath(base))
            if real == b or real.startswith(b + os.sep):
                rest = [x for x in real[len(b):].split(os.sep) if x]
                if hidden(prefix + rest):
                    return 'chemin'
                break
        return ''

    def _relaxed_navigation(self, path):
        """Débrayage (RELAX, jusqu'à la fermeture du lanceur) : une page de la suite ouverte depuis un autre site ou une
        extension (navigation de premier plan) est servie ; scripts, données, images et /__setup/ restent refusés aux
        autres sites."""
        return (RELAX['nav'] and self.headers.get('Sec-Fetch-Mode') == 'navigate'
                and self.headers.get('Sec-Fetch-Dest') == 'document' and not path.startswith('/__setup/')
                and (path.endswith('/') or path.lower().endswith('.html')))  # pages seulement, jamais un fichier de données

    def _deny(self, why):
        """Requête refusée : 404 pour un chemin non servi, page d'explication pour un lien venu d'un autre site, 403
        sinon."""
        if why == 'chemin':
            return self._json({'error': 'introuvable'}, 404)
        if why == 'autre site' and self.headers.get('Sec-Fetch-Mode') == 'navigate':
            # lien suivi depuis un autre site (messagerie web, forum…) : explication et lien vers l'accueil seulement,
            # jamais vers l'adresse demandée (ses paramètres viennent de l'autre site)
            body = ('<!doctype html><meta charset="utf-8"><title>SOG</title><body style="font:16px system-ui;margin:3em">'
                    '<p>Page de la suite ouverte depuis un autre site : refusée, pour que ce site ne puisse rien lire ni '
                    'déclencher.<br><i>Suite page opened from another website: refused.</i></p>'
                    '<p><a href="/">Ouvrir l’accueil de la suite · Open the suite home page</a></p>').encode('utf-8')
            self.send_response(403)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return None
        return self._json({'error': 'refusé'}, 403)

    def _allowed(self):
        """Vrai si une requête /__setup/ vient de la page servie ici : hôte local, même origine, en-tête X-SOG-Setup."""
        return (self._local_host() and self._same_origin()
                and (self.headers.get('X-SOG-Setup') == '1' or self.headers.get('X-DEFA-Setup') == '1'))

    def list_directory(self, path):
        """Pas de liste de dossier (contenu de data/, de secrets/… : rien à découvrir) ; index.html servi s'il existe."""
        self.send_error(404)
        return None

    def _data_script(self):
        """Chemin d'un .js du dossier de données, '' sinon."""
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if not path.lower().endswith('.js'):
            return ''
        real = os.path.realpath(self.translate_path(self.path))
        b = os.path.normcase(os.path.realpath(DATA))
        return real if os.path.normcase(real).startswith(b + os.sep) else ''

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
        """En-têtes communs : purge du cache à la première page de chaque lancement, en-têtes de sécurité, cache
        (fichier versionné ?v= gardé, le reste revalidé)."""
        if getattr(self, '_purge', False):
            # versions précédentes : pages et scripts gardés en cache (dont un type refusé avec nosniff) ; le navigateur
            # les jette tous à la première page de chaque lancement
            self.send_header('Clear-Site-Data', '"cache"')
            Setup.purge = False
        self.send_header('X-Content-Type-Options', 'nosniff')
        # rien d'ici n'est utilisable par une autre origine : ni encadré (« Synchroniser » cliqué à l'insu du pilote),
        # ni chargé comme script ou image par un autre site (en plus du contrôle Sec-Fetch-Site)
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        # requête illisible (TLS sur le port HTTP, version inconnue) : send_error passe par ici avant que path existe
        raw = getattr(self, 'path', '') or ''
        path = raw.split('?', 1)[0].lower()
        sandbox = path.startswith('/data/') and path.endswith(SANDBOXED)
        self.send_header('Content-Security-Policy', ("sandbox; " if sandbox else '') + csp_policy())
        # fichier versionné par son empreinte (?v=…, tools/bump_versions.py : elle change avec le contenu) : gardé tel
        # quel, sans revalidation — une quarantaine d'allers-retours de moins par page, qui retardaient la fin de
        # l'analyse et laissaient voir la page à moitié construite ; le reste (pages, données) : revalidé à chaque fois,
        # jamais de script périmé (ni de type) en cache
        versioned = re.search(r'[?&]v=[0-9a-f]{6,}', raw)
        self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if versioned else 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        """Type MIME servi ; config/repository_tree, sans extension, est un script."""
        # config/repository_tree (sans extension) est un script : avec nosniff, servi en octet-stream il ne
        # s'exécuterait pas (plus de menu ni de barre latérale)
        if os.path.basename(str(path).split('?')[0]) == 'repository_tree':
            return 'text/javascript'
        return super().guess_type(path)

    def _json(self, obj, code=200):
        """Réponse JSON (UTF-8, jamais mise en cache)."""
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _data_script_refused(self):
        """Raison de refuser un .js de data/ hors format (tools/data_guard.py) ; '' s'il est servi."""
        js = self._data_script()
        if not js or not os.path.isfile(js):
            return ''
        ok, why = data_guard.check_file(js)
        if ok:
            return ''
        say(f'  ⚠ Fichier de données refusé (pas au format des données, voir tools/data_guard.py) : {js} — {why}')
        return why

    def do_HEAD(self):
        """HEAD : mêmes refus que GET."""
        why = self._refused()
        if why:
            return self._deny(why)
        if self._stamped(head=True):
            return None
        return super().do_HEAD()

    def _stamped(self, head=False):
        """Page, script ou feuille de design servi avec ses empreintes ?v=… posées (tools/version_stamps.py) et un ETag
        (son empreinte) : une page inchangée répond 304, un fichier versionné reste en cache. Vrai si servi ici."""
        f = self.translate_path(self.path)
        try:
            if not os.path.isfile(f) or not version_stamps.stamped(f):
                return False
            body, h = version_stamps.serve(f)
        except Exception as e:  # jamais de réponse coupée : le fichier part tel quel
            say(f'  ⚠ Empreintes non posées ({os.path.basename(f)}) : {e} — fichier servi tel quel.')
            return False
        etag = f'"{h}"'
        if self.headers.get('If-None-Match') == etag:
            self.send_response(304)
            self.send_header('ETag', etag)
            self.end_headers()
            return True
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(f))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('ETag', etag)
        self.end_headers()
        if not head:
            self.wfile.write(body)
        return True

    def do_GET(self):
        """GET : refus (chemins cachés, autre site, scripts de données hors format), index du pool refaits avant d'être
        servis, routes /__setup/, sinon fichier statique."""
        why = self._refused()
        if why:
            return self._deny(why)
        if self._data_script_refused():
            return self._json({'error': 'fichier de données refusé (format)'}, 403)
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
            git = data_sync.git_exe()
            return self._json({'server': True, 'root': ROOT, 'git': bool(git), 'data': has_data(),
                               'dataGit': os.path.isdir(os.path.join(DATA, '.git')), 'dataRepo': data_repo_url(), 'lfs': LFS,
                               'csp': True, 'relaxNav': RELAX['nav']})
        if self.path.split('?')[0] == '/__setup/changes':
            # V3 frame : tête de data/ et, si elle a changé depuis since, son arbre (transport « lanceur »)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            since = (urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('since') or [''])[0]
            with FRAME_LOCK:
                head, tree = frame_tree()
            return self._json({'head': head, 'same': True} if since == head else {'head': head, 'tree': tree})
        if self.path.split('?')[0] == '/__setup/mission-folders':
            # dossiers de missions présents (data/missions/<famille>/<id>) : le registre repris par le navigateur au
            # premier démarrage écarte les missions dont le dossier n'existe plus (registre périmé)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            root, out = os.path.join(DATA, 'missions'), []
            try:
                for fam in sorted(os.listdir(root)):
                    if os.path.isdir(os.path.join(root, fam)) and not fam.startswith('.'):
                        out += [f'{fam}/{m}' for m in sorted(os.listdir(os.path.join(root, fam)))
                                if os.path.isdir(os.path.join(root, fam, m)) and not m.startswith('.')]
            except OSError:
                pass
            return self._json({'folders': out})
        if self.path.split('?')[0] == '/__setup/data-list':
            # fichiers d'un dossier de données de la liste DATA_LISTS (demandes d'accès des postes, comptes signés) :
            # noms seulement, le contenu se lit comme tout fichier de data/
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            return self._json(data_list(q.get('dir', [''])[0]))
        if self.path.split('?')[0] == '/__setup/registre-historique':
            # versions du registre signé des utilisateurs dans l'historique git des données (comptes signés : poste
            # resté hors ligne, refondation) ; contenus seulement, rien n'est vérifié ici (les pages vérifient)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(registry_history())
        if self.path.split('?')[0] == '/__setup/sites':
            # sites que les pages peuvent contacter (connect-src) : liste fixe, configuration, sites autorisés ici
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(sites_view())
        if self.path.split('?')[0] == '/__setup/sync-remote':
            # dépôt git de synchronisation de data/ : adresse actuelle (ou celle du clone par défaut)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            # state : 'absent' (rien : clone), 'plain' (des fichiers sans dépôt : reprise, POST /__setup/adopt), 'repo'
            return self._json({**data_sync.remote_info(DATA), 'default': data_repo_url(), 'state': data_sync.data_state(DATA)})
        if self.path.split('?')[0] == '/__setup/sync-status':
            # synchronisation git du pool (tools/data_sync.py) : état pour le bouton de l'en-tête ; ?fetch=1 : relu
            # sur le dépôt distant (commits à recevoir)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(sync_status(fetch='fetch=1' in self.path, fresh='fresh=1' in self.path))
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
        if self.path.split('?')[0] == '/__setup/secrets':
            # clés et identifiants des services externes (Paramètres : Installation pour la suite, Mon profil pour un
            # utilisateur) : indicateurs seulement (enregistré, 4 derniers caractères), jamais les valeurs secrètes
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            return self._json(secrets_view(q.get('tri', [''])[0]))
        if self.path.split('?')[0] == '/__setup/secrets/test':
            # « Tester » d'une carte de Paramètres › Installation › Clés et services externes : un appel de contrôle au
            # service avec la clé enregistrée ; { ok, count } ou { ok: false, key: missing | refused, error }
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            return self._json(secrets_test(q.get('service', [''])[0]))
        if self.path.split('?')[0] == '/__setup/ivao-activations':
            # zones spéciales IVAO activées (Ordres de vols, shared/odv_airspace.js) : NOTAM de la division liés à une
            # zone et horaires publiés des zones de France ; clé d'API locale (ivao_key), jamais transmise à la page
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            return self._json(ivao_activations(q.get('from', [''])[0], q.get('to', [''])[0]))
        if self.path.split('?')[0] == '/__setup/defa-site':
            # état de la mise à jour de la flotte et du journal DEFA depuis le site (Paramètres › Maintenance)
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json(defa_state())
        if self.path.split('?')[0] in ('/__setup/ivao/last-flight', '/__setup/vatsim/last-flight'):
            # dernier vol du pilote pour le CR (« Mon dernier vol IVAO / VATSIM ») : liste des vols des 7 derniers jours,
            # ou détail d'un vol (session / connection) au format du collage du tracker ; clé IVAO jamais transmise
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            arg = lambda k: (q.get(k) or [''])[0].strip()
            if 'ivao' in self.path.split('?')[0]:
                return self._json(ivao_last_flight(arg('vid'), arg('session')))
            return self._json(vatsim_last_flight(arg('cid'), arg('connection')))
        if self.path.split('?')[0] == '/__setup/ivao-bookings':
            # réservations ATC d'IVAO (trainings, examens, réservations ; shared/atc_sessions.js) : API sous clé
            # (ivao_key), jamais transmise à la page
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            return self._json(ivao_bookings(q.get('from', [''])[0], q.get('to', [''])[0], q.get('pre', ['LF'])[0]))
        if self.path.split('?')[0] == '/__setup/aircraft-db':
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            return self._json({**AIRCRAFT, **aircraft_files()})
        if self.path.split('?')[0] == '/__setup/downloads':
            # derniers fichiers téléchargés d'une source (motif sans chemin, ex. EG_*_DS_*_XML.zip pour NATS) :
            # ?glob=…&info → [{ name, size, mtime }] (le plus récent de chaque jeu : nom sans ses dates) ;
            # ?glob=…&name=… → le fichier, seulement s'il suit le motif et se trouve dans Téléchargements
            if not self._allowed():
                return self._json({'error': 'refusé'}, 403)
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query, keep_blank_values=True)  # « &info » sans valeur
            pattern = (q.get('glob') or [''])[0]
            if pattern not in download_patterns():  # motifs des sources déclarées seulement, jamais « *.* »
                return self._json({'error': 'motif inconnu'}, 400)
            latest = downloads_matching(pattern)
            if 'info' in q:
                return self._json({'files': [{'name': os.path.basename(p), 'size': os.path.getsize(p), 'mtime': os.path.getmtime(p)} for p in latest],
                                   'where': [os.path.basename(d) or d for d in downloads_dirs()]})
            name = (q.get('name') or [''])[0]
            path = next((p for p in latest if os.path.basename(p) == name), None)
            if not path:
                return self._json({'error': 'fichier absent'}, 404)
            with open(path, 'rb') as f:
                body = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return None
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
        if self._stamped():
            return None
        return super().do_GET()

    def do_POST(self):
        """POST /__setup/… (page servie ici seulement) : synchronisation, secrets, imports, jeu d'essai, clone et dépôt
        des données."""
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
            # dépôt git de synchronisation de data/ (premier lancement) : vérifié (git ls-remote), enregistré si demandé
            # et si c'est le dépôt actuel ou celui de la configuration (autre dépôt : dans un terminal) ; jamais
            # bloquant : le compte rendu dit seulement si le dépôt répond
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            url = str(a.get('url') or '').strip()
            # needsConfirm : ni le dépôt actuel ni celui de la configuration — la page prévient avant « Enregistrer »
            r = {'check': data_sync.check_remote(url),
                 'needsConfirm': not any(data_sync.same_repo(url, u) for u in (data_sync.remote_info(DATA)['url'], data_repo_url()))}
            if a.get('save'):
                saved = data_sync.set_remote(DATA, url, allowed=[data_repo_url()])
                if saved.get('refused'):
                    # autre dépôt : confirmé par l'utilisateur dans une fenêtre du système (ancienne et nouvelle adresse),
                    # hors du navigateur — un script de la page ne peut ni la voir ni y répondre
                    ok, why = confirm_remote(saved.get('current') or '', url)
                    if ok:
                        saved = data_sync.set_remote(DATA, url, allowed=[data_repo_url(), url])
                    else:
                        saved['message'] = f'Changement de dépôt non confirmé : {why} Dépôt inchangé.'
                r['saved'] = saved
            return self._json(r)
        if path == '/__setup/net':
            # V3 frame : appel sortant d'un module relayé (SimBrief, IVAO, VATSIM)
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                return self._json({'error': 'JSON invalide'}, 400)
            code, hdrs, out = frame_net(a if isinstance(a, dict) else {})
            self.send_response(code)
            for k, v in hdrs.items():
                self.send_header(k, v)
            self.send_header('Content-Length', str(len(out)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-SOG-Relay', '1')
            self.end_headers()
            self.wfile.write(out)
            return None
        if path == '/__setup/batch':
            # V3 frame : lot d'écritures de la couche de données, en une fois (frame/store/transport_launcher.js)
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
            r, code = frame_batch(a if isinstance(a, dict) else {})
            return self._json(r, code)
        if path == '/__setup/sync':
            # un passage de synchronisation (commit au nom du trigramme, fusion fiche par fiche, envoi), un à la fois
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            with SYNC_LOCK:
                # pont du registre avant (le registre rejoué part dans ce passage) et après (comptes rendus reçus : le
                # registre rejoué partira au passage suivant)
                registry_bridge()
                r = data_sync.run(DATA, str(a.get('author') or '').upper(), str(a.get('name') or '')[:60])
                if r.get('received'):
                    registry_bridge()
            sync_status_reset()  # état relu au prochain appel : le bouton reflète le passage qui vient d'avoir lieu
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
            return self._json({'started': aircraft_start(a.get('codes') or [], bool(a.get('quick'))), **AIRCRAFT, **aircraft_files()})
        if path == '/__setup/aircraft-publish':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            try:
                return self._json(aircraft_publish(str(a.get('author') or '').upper(), bool(a.get('apply'))))
            except (OSError, RuntimeError) as e:
                return self._json({'ok': False, 'remove': [], 'copy': [], 'message': str(e)[-600:]})
        if path == '/__setup/defa-site':
            # flotte et journal DEFA depuis le site : { refresh, auto, force } (une fois par jour en auto) ou
            # { auto_enabled } (réglage de Paramètres › Maintenance)
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            if 'auto_enabled' in a:
                return self._json(defa_set_auto(bool(a['auto_enabled'])))
            pages = a.get('pages') if isinstance(a.get('pages'), dict) else None
            return self._json(defa_refresh(force=bool(a.get('force')), auto=bool(a.get('auto')), pages=pages))
        if path == '/__setup/secrets':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
            return self._json(secrets_save(a))
        if path == '/__setup/relax':
            # débrayage de l'ouverture depuis un autre site ou une extension : activé après confirmation dans la fenêtre du
            # lanceur, jusqu'à sa fermeture ; rétabli sans confirmation
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            return self._json(relax_set(bool(a.get('on'))))
        if path in ('/__setup/site-allow', '/__setup/site-remove'):
            # site ajouté à la CSP (connect-src) : confirmé dans la fenêtre du lanceur, qu'aucune page ne peut voir ni
            # valider ; retiré : sans confirmation (la liste ne fait que rétrécir)
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            return self._json(site_allow(str(a.get('url') or '')) if path.endswith('allow') else site_remove(str(a.get('url') or '')))
        if path == '/__setup/aero-fetch':
            # données aéronautiques d'autres pays (tools/aero_fetch.py) : téléchargées dans data/sia/<source>/
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            args = [str(x)[:12] for x in (a.get('args') or [])][:40]
            with AERO_LOCK:
                return self._json(fresh(aero_fetch).fetch(DATA, str(a.get('provider') or ''), args))
        if path == '/__setup/jeu-essai':
            ok, log = sample_data()
            if ok:
                mark_instance()  # data/ vient d'être créé : ses repères
                with INDEX_LOCK:
                    index_availability()
                    index_users()
            return self._json({'ok': ok, 'message': log})
        if path == '/__setup/clone':
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            ok, log = clone((a.get('user') or '').strip(), a.get('secret') or '', bool(a.get('remember')), a.get('url'))
            if ok:
                mark_instance()
            return self._json({'ok': ok, 'message': log})
        if path == '/__setup/adopt':
            # data/ déjà là sans être un dépôt (exemples, archive, données saisies) devenu un clone du dépôt des données,
            # fiches du poste reprises par les règles de la synchronisation, rien d'envoyé (tools/data_sync.adopt) ;
            # dépôt de la configuration admis, autre dépôt : confirmé dans la fenêtre du lanceur, comme sync-remote
            try:
                a = json.loads(body or b'{}')
            except ValueError:
                a = {}
            url = str(a.get('url') or '').strip() or data_repo_url()
            user, secret = str(a.get('user') or '').strip(), str(a.get('secret') or '')
            if any(c in user + secret for c in '\r\n\0'):
                return self._json({'ok': False, 'message': 'Identifiant ou mot de passe invalide (retour à la ligne).'})
            if not data_sync.REMOTE_RE.match(url):
                return self._json({'ok': False, 'message': data_sync.REMOTE_HELP})
            # needsConfirm : autre dépôt que celui de la configuration ; dry : la page le demande avant le clic, rien n'est fait
            need = not data_sync.same_repo(url, data_repo_url())
            if a.get('dry'):
                return self._json({'ok': True, 'dry': True, 'needsConfirm': need, 'state': data_sync.data_state(DATA)})
            if need:
                ok, why = confirm_adopt(url)
                if not ok:
                    return self._json({'ok': False, 'needsConfirm': True, 'message': f'Reprise non confirmée : {why} data/ inchangé.'})
            git = data_sync.git_exe()
            if git and run([git, 'lfs', 'version'], capture_output=True) == 0:
                run([git, 'lfs', 'install'], capture_output=True)
            extra, auth = git_auth(user, secret)
            with SYNC_LOCK:
                r = data_sync.adopt(DATA, url, str(a.get('author') or 'POSTE').upper(), env=dict(git_env(), **extra),
                                    name=str(a.get('name') or '')[:60], auth=auth)
            if r.get('ok'):
                say(f'  Reprise de data/ dans le dépôt {url} : ' + r.get('message', ''))
                ensure_lfs(DATA, 'data', 'Données')
                mark_instance()
                if a.get('remember'):
                    remember_credentials(url, user, secret)
                with INDEX_LOCK:
                    index_availability()
                    index_users()
            sync_status_reset()
            return self._json({**r, 'needsConfirm': need})
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
                    if ok:
                        mark_instance()
                    return self._json({'ok': ok, 'message': 'Données installées dans data/.' if ok else 'Ce fichier n’est pas une archive de données (data_tree.js absent).'})
                if kind == 'log':
                    if not has_data():
                        return self._json({'ok': False, 'message': 'Installez d’abord les données (étape 1).'})
                    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'defa_reference.py'), tmp,
                                        '--out=' + os.path.join(DATA, 'references', 'defa_reference.js')], cwd=ROOT,
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


# ---- confirmation hors du navigateur : fenêtre Oui / Non du système, ouverte par le lanceur
CONFIRM_LOCK = threading.Lock()
_confirm = {'until': 0.0, 'no_at': 0.0}  # après un « Non » : pas de nouvelle fenêtre pendant 30 s (une page piégée insisterait)
CONFIRM_PAUSE = 30


def confirm_status(title, text):
    """Fenêtre Oui / Non du système (« Non » par défaut), au premier plan et modale pour tout le système : une page web ne
    peut ni la voir ni y répondre. Rend 'yes', 'no' (Non, fermée, sans réponse en 15 min), 'busy' (une autre fenêtre de
    confirmation est déjà ouverte) ou 'none' (aucune fenêtre ne peut s'ouvrir : Linux sans zenity, session sans bureau)."""
    if not CONFIRM_LOCK.acquire(blocking=False):
        return 'busy'
    try:
        say('  Fenêtre de confirmation ouverte sur cet ordinateur : répondez Oui ou Non. / Confirmation window open: answer Yes or No.')
        if sys.platform == 'win32':
            import ctypes
            # MB_YESNO | MB_ICONWARNING | MB_DEFBUTTON2 | MB_SYSTEMMODAL | MB_SETFOREGROUND | MB_TOPMOST ; IDYES = 6, 0 : échec
            r = ctypes.windll.user32.MessageBoxW(None, text, title, 0x4 | 0x30 | 0x100 | 0x1000 | 0x10000 | 0x40000)
            return 'yes' if r == 6 else 'none' if r == 0 else 'no'
        if sys.platform == 'darwin':
            r = subprocess.run(['osascript', '-e', 'on run argv', '-e',
                                'display dialog (item 2 of argv) with title (item 1 of argv) buttons {"Non", "Oui"} '
                                'default button "Non" with icon caution', '-e', 'end run', title, text],
                               capture_output=True, text=True, timeout=900)
            return ('yes' if 'Oui' in r.stdout else 'no') if r.returncode == 0 else 'no' if '-128' in r.stderr else 'none'
        zenity = shutil.which('zenity')
        if zenity:
            r = subprocess.run([zenity, '--question', '--no-markup', '--default-cancel', '--title', title, '--text', text,
                                '--ok-label', 'Oui', '--cancel-label', 'Non'], capture_output=True, timeout=900)
            return 'yes' if r.returncode == 0 else 'no' if r.returncode in (1, 5) else 'none'
        return 'none'
    except subprocess.TimeoutExpired:
        return 'no'
    except (OSError, AttributeError, subprocess.SubprocessError):
        return 'none'
    finally:
        CONFIRM_LOCK.release()


def confirm_box(title, text):
    """Vrai seulement sur « Oui » (confirm_status)."""
    return confirm_status(title, text) == 'yes'


def confirm_ask(title, text, what):
    """Confirmation dans la fenêtre du lanceur, avec la pause après un refus ; rend (ok, raison en clair si non)."""
    left = _confirm['until'] - time.time()
    if left > 0:
        return False, (f'Refusée il y a {int(time.time() - _confirm["no_at"])} s dans la fenêtre du lanceur : nouvel essai '
                       f'possible dans {int(left) + 1} s.')
    st = confirm_status(title, text)
    say(f'  {what} — ' + {'yes': 'confirmé', 'no': 'refusé', 'busy': 'autre fenêtre déjà ouverte', 'none': 'aucune fenêtre'}[st])
    if st == 'yes':
        return True, ''
    if st == 'no':
        _confirm.update(until=time.time() + CONFIRM_PAUSE, no_at=time.time())
        return False, f'Refusée ou fermée dans la fenêtre du lanceur (nouvel essai possible dans {CONFIRM_PAUSE} s).'
    if st == 'busy':
        return False, 'Une autre fenêtre de confirmation est déjà ouverte sur cet ordinateur : répondez-lui d’abord, puis réessayez.'
    return False, ('Aucune fenêtre de confirmation ne peut s’ouvrir sur cet ordinateur (Linux : installer zenity ; session sans '
                   'bureau) : seul le dépôt de la configuration (sources.dataRepo) est admis sans confirmation.')


def confirm_remote(old, new):
    """Changement du dépôt de synchronisation de data/ confirmé par l'utilisateur (fenêtre du lanceur) ; (ok, raison)."""
    return confirm_ask('SO Group — dépôt des données / data repository', (
        'Changer le dépôt de synchronisation des données ?\n\n'
        f'Actuel : {old or "(aucun)"}\nNouveau : {new}\n\n'
        'Toutes les données de data/ partiront vers le nouveau dépôt au prochain « Synchroniser ». '
        'Si vous n’avez pas demandé ce changement, répondez Non.\n\n'
        'Change the data synchronisation repository? All data in data/ will be sent to the new repository at the next '
        '“Synchronise”. If you did not ask for this change, answer No.'), f'Dépôt de synchronisation : {new}')


def confirm_adopt(url):
    """Reprise de data/ dans un autre dépôt que celui de la configuration, confirmée par l'utilisateur (fenêtre du
    lanceur) ; (ok, raison)."""
    return confirm_ask('SO Group — dépôt des données / data repository', (
        'Faire du dossier data/ de ce poste un clone de ce dépôt ?\n\n'
        f'Dépôt : {url}\n\n'
        'Les fiches du poste seront gardées dans un commit local, puis partiront vers ce dépôt au prochain « Synchroniser ». '
        'Si vous n’avez pas demandé cette reprise, répondez Non.\n\n'
        'Make this computer’s data/ folder a clone of this repository? Its records are kept in a local commit, then sent to '
        'this repository at the next “Synchronise”. If you did not ask for this, answer No.'), f'Reprise de data/ dans le dépôt {url}')


_patterns = []


def download_patterns():
    """Motifs de fichiers que la page peut demander à Téléchargements : ceux des sources déclarées dans
    shared/aero_zones.js (« downloads: 'EG_*_DS_*_XML.zip' »), lus une fois."""
    if not _patterns:
        try:
            with open(os.path.join(ROOT, 'shared', 'aero_zones.js'), encoding='utf-8') as f:
                found = re.findall(r"\bdownloads:\s*'([A-Za-z0-9_*.\-]{3,80})'", f.read())
        except OSError:
            found = []
        _patterns.append({x for x in found if '*' in x and x.strip('*.') and not re.fullmatch(r'[*.]+', x)})
    return _patterns[0]


def downloads_matching(pattern):
    """Fichiers de Téléchargements qui suivent le motif (fnmatch, sans chemin) : le plus récent de chaque jeu (nom privé
    de ses dates AAAAMMJJ et des suffixes de doublon « (1) »), triés par nom."""
    found = [p for d in downloads_dirs() for p in glob.glob(os.path.join(d, '*'))
             if os.path.isfile(p) and fnmatch.fnmatch(os.path.basename(p), pattern)]
    best = {}
    for p in found:
        key = re.sub(r'\s*\(\d+\)', '', re.sub(r'\d{8}', '', os.path.basename(p)))
        if key not in best or os.path.getmtime(p) > os.path.getmtime(best[key]):
            best[key] = p
    return sorted(best.values(), key=os.path.basename)


def sia_zip():
    """Dernier ZIP d'export du SIA téléchargé (export_xml_bd_SIA_<date>[-vNN].zip), ou None."""
    found = [p for d in downloads_dirs() for p in glob.glob(os.path.join(d, 'export_xml_bd_SIA_*.zip'))]
    return max(found, key=os.path.getmtime) if found else None


class Server(http.server.ThreadingHTTPServer):
    """Serveur de la suite : une connexion coupée par le navigateur (page quittée, image ou téléchargement annulé) n'est
    pas une erreur, elle ne s'affiche pas ; les autres gardent leur trace."""

    def handle_error(self, request, client_address):
        """Connexion coupée par le navigateur (page quittée en cours de chargement) : ignorée, rien dans la console."""
        if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


class Server6(Server):
    """Même serveur sur l'adresse IPv6 locale (::1) : « localhost » y mène d'abord sous Windows ; sans elle, chaque
    connexion attend le repli sur 127.0.0.1 (≈ 0,2 à 0,3 s par fichier, page affichée en 1,5 s au lieu de 0,15 s)."""
    address_family = socket.AF_INET6


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
    """Vrai si le port est libre sur 127.0.0.1."""
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


IVAO_API = 'https://api.ivao.aero/v2'
_ivao = {'at': 0.0, 'areas': None}


# ---- secrets locaux (dossier secrets/ à la racine de la suite, exclu de git, hors des données et des sauvegardes) :
#   secrets/<service>.json            clés de la suite (IVAO : apiKey, savedAt) — Paramètres › Installation › Clés et services externes
#   secrets/users/<TRI>.json          identifiants d'un utilisateur ({ ivao: { clientId, clientSecret } }) — Mon profil
# Champs admis par service et portée ; écrits par POST /__setup/secrets, jamais relus par la page (indicateurs seuls).
SECRET_FIELDS = {'app': {'ivao': {'apiKey': True}}, 'user': {'ivao': {'clientId': False, 'clientSecret': True}}}
SECRETS = os.path.join(ROOT, 'secrets')


def _secret_file(scope, tri='', service=''):
    """Fichier d'un secret : secrets/<service>.json (portée app) ou secrets/users/<TRI>.json (portée utilisateur)."""
    if scope == 'app':
        return os.path.join(SECRETS, f'{service}.json')
    return os.path.join(SECRETS, 'users', f'{tri}.json')


def _read_json(path):
    """Objet JSON d'un fichier ; {} s'il est absent, illisible ou n'est pas un objet."""
    try:
        with open(path, encoding='utf-8') as f:
            v = json.load(f)
        return v if isinstance(v, dict) else {}
    except (OSError, ValueError):
        return {}


def _write_json(path, value):
    """Écrit un JSON par fichier temporaire puis remplacement (jamais de fichier à moitié écrit)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(value, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def _hint(v):
    """Indicateur d'un secret pour la page : réglé ou non, ses 4 derniers caractères s'il en a au moins 8 (jamais la
    valeur)."""
    v = str(v or '')
    return {'set': bool(v), 'hint': ('…' + v[-4:]) if len(v) >= 8 else ''}


def secrets_view(tri=''):
    """Indicateurs des secrets : { app: { ivao: { apiKey: { set, hint, env } } }, user: { ivao: { clientId (en clair :
    pas secret), clientSecret: { set, hint } } } } (user : trigramme donné)."""
    out = {'app': {}, 'user': {}}
    for service, fields in SECRET_FIELDS['app'].items():
        cur = _read_json(_secret_file('app', service=service))
        saved = cur.get('savedAt') if isinstance(cur.get('savedAt'), dict) else {}
        out['app'][service] = {k: {**_hint(cur.get(k)), 'at': str(saved.get(k) or '') if cur.get(k) else ''} for k in fields}
    if os.environ.get('IVAO_API_KEY'):
        out['app']['ivao']['apiKey'] = {**_hint(os.environ['IVAO_API_KEY']), 'env': True}
    tri = str(tri or '').upper()
    if re.fullmatch(r'[A-Z0-9]{2,5}', tri):
        cur = _read_json(_secret_file('user', tri))
        for service, fields in SECRET_FIELDS['user'].items():
            s = cur.get(service) or {}
            out['user'][service] = {k: (_hint(s.get(k)) if secret else str(s.get(k) or '')) for k, secret in fields.items()}
    return out


def secrets_save(a):
    """{ scope: app | user, tri (user), service, values: { champ: valeur } } : valeur vide = effacée, champ absent =
    inchangé ; champs hors de SECRET_FIELDS refusés."""
    scope, service = str(a.get('scope') or ''), str(a.get('service') or '')
    fields = SECRET_FIELDS.get(scope, {}).get(service)
    values = a.get('values') if isinstance(a.get('values'), dict) else None
    if not fields or values is None or any(k not in fields for k in values):
        return {'ok': False, 'message': 'service ou champ inconnu'}
    tri = str(a.get('tri') or '').upper()
    if scope == 'user' and not re.fullmatch(r'[A-Z0-9]{2,5}', tri):
        return {'ok': False, 'message': 'trigramme manquant ou invalide'}
    path = _secret_file(scope, tri, service)
    cur = _read_json(path)
    target = cur if scope == 'app' else cur.setdefault(service, {})
    saved = target.setdefault('savedAt', {}) if scope == 'app' else {}
    for k, v in values.items():
        v = str(v or '').strip()[:500]
        if v:
            target[k] = v
            saved[k] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')  # « enregistrée le … »
        else:
            target.pop(k, None)
            saved.pop(k, None)
    if scope == 'app' and not saved:
        target.pop('savedAt', None)
    if scope == 'user' and not target:
        cur.pop(service, None)
    try:
        if cur:
            _write_json(path, cur)
        elif os.path.exists(path):
            os.remove(path)
    except OSError as e:
        return {'ok': False, 'message': str(e)}
    if scope == 'app' and service == 'ivao':
        _ivao.update(at=0.0, areas=None)  # clé changée : zones relues
    return {'ok': True, **secrets_view(tri)}


# Erreurs des routes IVAO : code « key » (missing : clé absente, refused : clé refusée par IVAO, 401 / 403) que les
# pages traduisent avec un lien vers Paramètres › Installation › Clés et services externes (SuiteKeys.explain).
IVAO_NO_KEY = {'error': 'clé IVAO absente', 'key': 'missing'}


def ivao_fail(e):
    """{ error, key? } d'un échec d'appel à l'API IVAO : clé refusée (401 / 403), trop de demandes (429), réseau."""
    code = getattr(e, 'code', None)
    if code in (401, 403):
        return {'error': f'clé IVAO refusée (HTTP {code})', 'key': 'refused'}
    if code == 429:
        return {'error': 'IVAO : HTTP 429 (trop de demandes : réessayer plus tard)'}
    return {'error': f'IVAO : HTTP {code}' if code else f'IVAO : {e}'}


DATA_LISTS = ('utilisateurs/demandes',)  # dossiers de data/ dont la page peut demander la liste


def data_list(rel):
    """{ files: [noms .json] } d'un dossier de DATA_LISTS ; { files: [] } pour un autre dossier ou un dossier absent."""
    if rel not in DATA_LISTS:
        return {'files': []}
    d = os.path.join(DATA, *rel.split('/'))
    try:
        names = sorted(n for n in os.listdir(d) if re.fullmatch(r'[A-Z0-9]{2,5}_[0-9a-f]{16}\.json', n))
    except OSError:
        names = []
    return {'files': names}


def registry_history(limit=500):
    """{ versions: [enveloppe…] } : versions successives de data/utilisateurs/_registre.json dans l'historique git des
    données, de la plus ancienne à la plus récente (sans doublon) ; [] sans git ou sans historique."""
    rel = 'utilisateurs/_registre.json'
    if not data_sync.git_exe() or not os.path.isdir(os.path.join(DATA, '.git')):
        return {'versions': []}
    code, out = data_sync.git(DATA, 'log', '--format=%H', '--reverse', f'-n{limit}', '--', rel)
    seen, versions = set(), []
    for h in (out.split() if code == 0 else []):
        if not re.fullmatch(r'[0-9a-f]{40}', h):
            continue
        c, text = data_sync.git(DATA, 'show', f'{h}:{rel}')
        try:
            env = json.loads(text) if c == 0 else None
        except ValueError:
            env = None
        key = json.dumps(env, sort_keys=True) if isinstance(env, dict) else ''
        if key and key not in seen:
            seen.add(key)
            versions.append(env)
    return {'versions': versions}


def secrets_test(service):
    """Appel de contrôle d'une clé de la suite (« Tester ») : IVAO, sessions du tracker de la dernière heure."""
    if service != 'ivao':
        return {'ok': False, 'error': 'service sans clé à tester'}
    key = ivao_key()
    if not key:
        return {'ok': False, **IVAO_NO_KEY}
    now = datetime.datetime.now(datetime.timezone.utc)
    try:
        got = _ivao_get('/tracker/sessions?' + urllib.parse.urlencode({
            'perPage': 1, 'from': (now - datetime.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'to': now.strftime('%Y-%m-%dT%H:%M:%SZ')}), key)
    except (OSError, ValueError) as e:
        return {'ok': False, **ivao_fail(e)}
    return {'ok': True, 'count': int((got if isinstance(got, dict) else {}).get('totalItems') or 0)}


# ---- politique de sécurité du contenu (CSP ; docs/technique/AUDIT_SECURITE_2026-10-07.md, lot 4) : liste et forme
# communes au site sans lanceur (tools/csp_policy.py, balise meta posée par tools/build_pages.py) ; ici en en-tête, avec
# les sites autorisés sur ce poste (fenêtre du lanceur) et frame-ancestors.
CSP_CONNECT = cspmod.CONNECT
CSP_SCRIPTS = cspmod.SCRIPTS
SITES_FILE = os.path.join(SECRETS, 'sites.json')  # sites autorisés par l'utilisateur (fenêtre du lanceur)
_csp = {'key': None, 'value': ''}


site_origin = cspmod.site_origin


def config_sites():
    """Origines des adresses de la configuration de la suite (config/repository_tree : dépôt de la suite, sources) :
    réglées par le code, pas par la page."""
    return cspmod.config_sites(config_text())


def user_sites():
    return [o for o in _read_json(SITES_FILE).get('sites') or [] if site_origin(o) == o]


def sites_view():
    return {'fixed': CSP_CONNECT, 'config': config_sites(), 'user': user_sites()}


# ---- V3 frame : transport « lanceur » de la couche de données (frame/store/transport_launcher.js). Le dossier data/ du
# poste est le dépôt : arbre { chemin: empreinte git du fichier } (gardée par taille et date), tête = empreinte de cet
# arbre ; un lot d'écritures s'écrit d'un coup, un commit local si data/ est un dépôt git (l'échange avec le dépôt
# distant reste le passage de synchronisation, /__setup/sync). Hors de l'arbre : .git, local/, copies de conflits et
# d'avant restauration, index régénérés, repère du lanceur, sources du SIA (seule sia/base/ est publiée).
FRAME_SKIP = re.compile(r'(^|/)(\.git|_conflits|_avant_restauration)(/|$)|^local(/|$)|(^|/)_index\.json$|^\.defa_instance$|^sia/(?=.)(?!base(/|$))')
FRAME_LOCK = threading.Lock()
_frame_memo = {}  # chemin → ((taille, date), empreinte)


def frame_tree():
    """(tête, arbre) de data/ : empreinte git de chaque fichier (relue seulement si sa taille ou sa date change)."""
    out = {}
    for d, dirs, files in os.walk(DATA):
        rel_d = os.path.relpath(d, DATA).replace(os.sep, '/')
        rel_d = '' if rel_d == '.' else rel_d + '/'
        dirs[:] = [x for x in dirs if not FRAME_SKIP.search(rel_d + x + '/')]
        for f in files:
            rel = rel_d + f
            if FRAME_SKIP.search(rel):
                continue
            full = os.path.join(d, f)
            try:
                st = os.stat(full)
            except OSError:
                continue
            key = (st.st_size, st.st_mtime_ns)
            m = _frame_memo.get(rel)
            if not m or m[0] != key:
                with open(full, 'rb') as fh:
                    b = fh.read()
                m = (key, hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest())
                _frame_memo[rel] = m
            out[rel] = m[1]
    return hashlib.sha1(json.dumps(sorted(out.items())).encode()).hexdigest(), out


def frame_batch(a):
    """Lot d'écritures du frame { parent, message, author, changes: [{ path, text | null }] } : refusé si la tête a changé
    depuis parent (conflict) ou si un chemin sort de data/ ou est exclu ; .js au format des données seulement
    (tools/data_guard.py) ; écrit, puis commit local au nom de l'auteur si data/ est un dépôt git. Rend { ok, head }."""
    changes = a.get('changes') if isinstance(a.get('changes'), list) else []
    author = str(a.get('author') or '').upper()
    with FRAME_LOCK:
        head, _ = frame_tree()
        if str(a.get('parent') or '') != head:
            return {'ok': False, 'conflict': True, 'head': head, 'message': 'data/ a changé depuis la dernière lecture'}, 409
        todo = []
        for c in changes:
            rel = posixpath.normpath(str(c.get('path') or '')).lstrip('/')
            if not rel or rel.startswith('..') or rel.startswith('.') or '/.' in rel or FRAME_SKIP.search(rel):
                return {'ok': False, 'message': f'chemin refusé : {c.get("path")}'}, 400
            text = c.get('text')
            if text is not None and rel.lower().endswith('.js'):
                with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
                    f.write(text)
                    tmp = f.name
                ok, why = data_guard.check_file(tmp)
                os.remove(tmp)
                if not ok:
                    return {'ok': False, 'message': f'{rel} : pas au format des données ({why})'}, 400
            todo.append((rel, text))
        for rel, text in todo:
            full = os.path.join(DATA, *rel.split('/'))
            if text is None:
                if os.path.isfile(full):
                    os.remove(full)
                continue
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
        bridged = registry_bridge()  # registre V2 à jour des comptes rendus, dans le même commit
        if todo and os.path.isdir(os.path.join(DATA, '.git')) and re.fullmatch(r'[A-Z0-9]{2,5}', author):
            paths = [r for r, _ in todo] + (['/'.join(report_bridge.REGISTRY)] if bridged else [])
            env = dict(data_sync.git_env(), GIT_AUTHOR_NAME=author, GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local')
            data_sync.git(DATA, 'add', '-A', '--', *paths, env=env)
            data_sync.git(DATA, '-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local', 'commit', '-q', '-m',
                          str(a.get('message') or f'{author} : lot du frame')[:500], '--', *paths, env=env)
        head, _ = frame_tree()
    if any(r.startswith('disponibilites/') for r, _ in todo):
        with INDEX_LOCK:
            index_availability()
    if any(r.startswith('utilisateurs/') for r, _ in todo):
        with INDEX_LOCK:
            index_users()
    return {'ok': True, 'head': head}, 200


def registry_bridge():
    """Comptes rendus de la V3 rejoués dans le registre V2 (tools/report_bridge.py) ; vrai si le registre a changé. Un
    registre illisible n'est jamais réécrit : la raison est dite dans la console du lanceur."""
    try:
        r = report_bridge.bridge(DATA)
    except Exception as e:  # le pont ne bloque jamais un lot ni un échange
        r = {'error': f'{type(e).__name__}: {e}'}
    if r.get('error'):
        say(f'Pont du registre (cr/missions.yaml) : {r["error"]}')
    return bool(r.get('changed') or r.get('added'))


# ---- V3 frame : relais des appels sortants des modules (ctx.net, frame/app.js) : CORS et clés restent ici. Sites relayés
# seulement (https) ; clé d'API IVAO ajoutée pour api.ivao.aero ; site de la compagnie (data/airline/settings.json, site)
# en lecture seule (GET) ; réponse rendue telle quelle (statut, type, corps, 8 Mo au plus) ; réseau injoignable : 502
# marqué X-SOG-Offline.
NET_HOSTS = {'www.simbrief.com': '', 'api.ivao.aero': 'ivao', 'api.vatsim.net': '', 'data.vatsim.net': '', 'my.vatsim.net': '',
             'aviationweather.gov': '', 'metar.vatsim.net': ''}
NET_MAX = 8 * 1048576


def airline_host():
    """Hôte du site de la compagnie (data/airline/settings.json, champ site, en https) ; '' sans site, ou pour une adresse
    locale ou privée (le relais ne sert jamais à atteindre le réseau du poste)."""
    try:
        with open(os.path.join(DATA, 'airline', 'settings.json'), encoding='utf-8-sig') as f:
            site = json.load(f).get('site')
    except (OSError, ValueError, AttributeError):
        return ''
    u = urllib.parse.urlparse(str(site or '').strip())
    host = (u.hostname or '').lower()
    if u.scheme != 'https' or not host or host == 'localhost' or host.endswith('.localhost'):
        return ''
    try:
        if not ipaddress.ip_address(host).is_global:
            return ''
    except ValueError:
        pass  # un nom, pas une adresse
    return host


def frame_net(a):
    """Relais d'un appel { url, method, accept, contentType, body } : (statut, en-têtes, corps)."""
    url = str(a.get('url') or '')
    u = urllib.parse.urlparse(url)
    site = u.scheme == 'https' and bool(u.hostname) and u.hostname not in NET_HOSTS and u.hostname == airline_host()
    if u.scheme != 'https' or (u.hostname not in NET_HOSTS and not site):
        return 403, {'Content-Type': 'application/json'}, json.dumps({'error': 'site non relayé'}).encode()
    method = str(a.get('method') or 'GET').upper()
    if method not in (('GET',) if site else ('GET', 'POST')):
        return 405, {'Content-Type': 'application/json'}, json.dumps({'error': 'méthode refusée'}).encode()
    headers = {'User-Agent': 'SOG-suite', 'Accept': str(a.get('accept') or '*/*')}
    if NET_HOSTS.get(u.hostname) == 'ivao':
        key = ivao_key()
        if key:
            headers['apiKey'] = key
    data = None
    if method == 'POST' and isinstance(a.get('body'), str):
        data = a['body'].encode('utf-8')
        headers['Content-Type'] = str(a.get('contentType') or 'application/json')
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {'Content-Type': r.headers.get('Content-Type') or 'application/octet-stream'}, r.read(NET_MAX)
    except urllib.error.HTTPError as e:
        return e.code, {'Content-Type': e.headers.get('Content-Type') or 'text/plain'}, e.read(NET_MAX)
    except (OSError, ValueError):
        return 502, {'Content-Type': 'text/plain', 'X-SOG-Offline': '1'}, b'unreachable'


def csp_policy():
    """Valeur de l'en-tête Content-Security-Policy (refaite quand la configuration, les sites autorisés ou les modules
    de l'appli V3 changent : meta.net, hôtes que leurs bibliothèques appellent elles-mêmes)."""
    key = tuple(os.path.getmtime(p) if os.path.exists(p) else 0 for p in
                (SITES_FILE, os.path.join(ROOT, 'config', 'repository_tree'), os.path.join(ROOT, 'repository_tree'),
                 os.path.join(ROOT, 'frame', 'app.js'), *cspmod.module_files(ROOT)))
    if _csp['key'] != key:
        _csp.update(key=key, value=cspmod.value([*config_sites(), *user_sites(), *cspmod.module_hosts(ROOT)]))
    return _csp['value']


# ---- débrayage : pages de la suite ouvertes depuis un autre site ou une extension (Claude in Chrome, favoris gérés par
# une extension…), pour la session du lanceur seulement — rien n'est enregistré, la protection revient au lancement
# suivant. Les pages affichent tant qu'il dure un bouton rouge « Protection réduite — rétablir » (app_framework.js).
RELAX = {'nav': False}


def relax_set(on):
    """Active (après confirmation dans la fenêtre du lanceur) ou rétablit (sans confirmation) ; { ok, relaxNav }."""
    if not on:
        if RELAX['nav']:
            say('  Ouverture depuis un autre site : protection rétablie.')
        RELAX['nav'] = False
        return {'ok': True, 'relaxNav': False}
    if RELAX['nav']:
        return {'ok': True, 'relaxNav': True}
    if time.time() < _confirm['until']:
        return {'ok': False, 'relaxNav': False, 'message': 'Demande refusée il y a moins de 30 s : réessayez plus tard.'}
    ok = confirm_box('SO Group — protection réduite / reduced protection', (
        'Autoriser l’ouverture des pages de la suite depuis un autre site ou une extension (par exemple Claude in Chrome), '
        'jusqu’à la fermeture du lanceur ?\n\n'
        'Un site que vous visitez pourra alors ouvrir une page de la suite avec ses propres paramètres. Les données, les '
        'scripts et les réglages du lanceur restent fermés aux autres sites. Un bouton rouge reste affiché en haut de '
        'chaque page pour rétablir la protection.\n\n'
        'Allow suite pages to be opened from another website or an extension (for example Claude in Chrome) until the '
        'launcher closes? A website you visit could then open a suite page with its own parameters. Data, scripts and '
        'launcher settings stay closed to other websites.'))
    say('  Ouverture depuis un autre site : ' + ('autorisée jusqu’à la fermeture du lanceur' if ok else 'non confirmée'))
    if not ok:
        _confirm.update(until=time.time() + 30, no_at=time.time())
        return {'ok': False, 'relaxNav': False, 'message': 'Non confirmé dans la fenêtre du lanceur.'}
    RELAX['nav'] = True
    return {'ok': True, 'relaxNav': True}


def site_allow(url):
    """Ajoute un site à connect-src après confirmation dans la fenêtre du lanceur ; { ok, origin, message }."""
    o = site_origin(url)
    if not o:
        return {'ok': False, 'message': 'Adresse refusée : https://… seulement (ou http:// de cette machine).'}
    if o in CSP_CONNECT or o in config_sites() or o in user_sites():
        return {'ok': True, 'origin': o, 'already': True, 'message': f'{o} : déjà autorisé.'}
    if time.time() < _confirm['until']:
        return {'ok': False, 'origin': o, 'message': 'Demande refusée il y a moins de 30 s : réessayez plus tard.'}
    ok = confirm_box('SO Group — site autorisé / allowed website', (
        f'Autoriser la suite à contacter ce site ?\n\n{o}\n\n'
        'Les pages pourront lui envoyer des données (comptes rendus, requêtes). Si vous n’avez pas demandé cet ajout, '
        'répondez Non.\n\n'
        'Allow the suite to contact this website? The pages will be able to send data to it. If you did not ask for '
        'this, answer No.'))
    say(f'  Site autorisé : {o} — ' + ('confirmé' if ok else 'non confirmé'))
    if not ok:
        _confirm.update(until=time.time() + 30, no_at=time.time())
        return {'ok': False, 'origin': o, 'message': 'Ajout non confirmé dans la fenêtre du lanceur.'}
    cur = _read_json(SITES_FILE)
    cur['sites'] = sorted({*user_sites(), o})
    try:
        _write_json(SITES_FILE, cur)
    except OSError as e:
        return {'ok': False, 'origin': o, 'message': str(e)}
    return {'ok': True, 'origin': o, 'message': f'{o} : autorisé.'}


def site_remove(url):
    """Retire un site autorisé par l'utilisateur (sans confirmation) ; { ok, origin }."""
    o = site_origin(url)
    cur = _read_json(SITES_FILE)
    cur['sites'] = [x for x in user_sites() if x != o]
    try:
        _write_json(SITES_FILE, cur)
    except OSError as e:
        return {'ok': False, 'message': str(e)}
    return {'ok': True, 'origin': o}


def ivao_key():
    """Clé d'API IVAO (en-tête apiKey) : variable d'environnement IVAO_API_KEY, sinon secrets/ivao.json { "apiKey" }
    (Paramètres › Installation › Clés et services externes) ; '' si absente."""
    k = os.environ.get('IVAO_API_KEY', '').strip()
    return k or str(_read_json(_secret_file('app', service='ivao')).get('apiKey', '')).strip()


def _ivao_get(path, key):
    """GET sur l'API IVAO avec la clé d'API du lanceur ; JSON de la réponse."""
    req = urllib.request.Request(IVAO_API + path, headers={'User-Agent': 'SOG-suite', 'Accept': 'application/json', 'apiKey': key})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def ivao_activations(day_from='', day_to=''):
    """Zones spéciales IVAO de France actives entre deux dates (AAAA-MM-JJ, incluses) : { activations: [{ ivao, zone,
    type, date, debut, fin, source: 'notam' | 'horaire', texte }], zones } ; NOTAM de la division FR liés à une zone
    (specialAreaId), horaires publiés des zones (times : jours et heures UTC) ; { error } sans clé ou sans réponse.
    Zones gardées une heure, NOTAM relus à chaque appel."""
    key = ivao_key()
    if not key:
        return IVAO_NO_KEY
    try:
        d0 = datetime.date.fromisoformat(day_from) if day_from else datetime.date.today()
        d1 = datetime.date.fromisoformat(day_to) if day_to else d0 + datetime.timedelta(days=6)
    except ValueError:
        return {'error': 'dates attendues : from=AAAA-MM-JJ&to=AAAA-MM-JJ'}
    try:
        if _ivao['areas'] is None or time.time() - _ivao['at'] > 3600:
            areas = _ivao_get('/specialAreas/all?now=false', key)
            _ivao.update(at=time.time(), areas=[a for a in areas if str(a.get('name', '')).startswith('LF') and any(str(c.get('id', '')).startswith('LF') for c in a.get('centers') or [])])
        notams = _ivao_get('/divisions/FR/notams/all?now=false', key)
    except (OSError, ValueError) as e:
        return ivao_fail(e)
    by_id = {a['id']: a for a in _ivao['areas']}
    out = []
    days = [d0 + datetime.timedelta(days=i) for i in range((d1 - d0).days + 1)][:62]
    def hm(v):
        return str(v or '')[:5]
    for n in notams if isinstance(notams, list) else []:
        a = by_id.get(n.get('specialAreaId'))
        if not a:
            continue
        try:
            s = datetime.datetime.fromisoformat(str(n['startTime']).replace('Z', '+00:00'))
            e = datetime.datetime.fromisoformat(str(n['endTime']).replace('Z', '+00:00')) if n.get('endTime') else None
        except (KeyError, ValueError):
            continue
        for d in days:
            if s.date() > d or (e and e.date() < d):
                continue
            out.append({'ivao': a['id'], 'zone': a['name'], 'type': a.get('type', ''), 'date': d.isoformat(),
                        'debut': s.strftime('%H:%M') if s.date() == d else '00:00',
                        'fin': e.strftime('%H:%M') if e and e.date() == d else '24:00',
                        'source': 'notam', 'texte': str(n.get('description', '')).split('E)')[-1].strip()[:200]})
    names = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun']
    for a in _ivao['areas']:
        for t in a.get('times') or []:
            if not t.get('endTime'):  # « sur NOTAM » ou H24 possible : pas d'horaire publié
                continue
            for d in days:
                if t.get(names[d.weekday()]):
                    out.append({'ivao': a['id'], 'zone': a['name'], 'type': a.get('type', ''), 'date': d.isoformat(),
                                'debut': hm(t.get('startTime')), 'fin': hm(t.get('endTime')), 'source': 'horaire',
                                'texte': str(a.get('activationDetails', ''))[:200]})
    return {'activations': out, 'zones': len(_ivao['areas'])}


# ---- flotte et journal DEFA depuis le site (pages publiques de flotte.defa-virtual.fr, lues sans connexion) : passés
# aux scripts du collage (AircraftDB/update_fleet.py, tools/defa_reference.py), écrits dans le dossier de données servi
# (data/references/ ou --data) ; au plus une fois par jour calendaire à l'ouverture d'une page (shared/defa_site.js,
# réglage « automatique » gardé ici, hors des données), ou à la demande (Paramètres › Maintenance).
DEFA_SITE = {
    'flotte': ('https://flotte.defa-virtual.fr/flotte.php', ('AircraftDB', 'update_fleet.py'), 'aircraft_fleet.js'),
    'log': ('https://flotte.defa-virtual.fr/log_vols.php', ('tools', 'defa_reference.py'), 'defa_reference.js'),
}
DEFA_STATE = os.path.join(ROOT, 'tools', '.defa_site.json')
DEFA_LOCK = threading.Lock()


def defa_state():
    """{ auto, last (dernière tentative, heure locale ISO), pages: { flotte|log: { at, ok, message } } }."""
    s = _read_json(DEFA_STATE)
    return {'auto': s.get('auto', True), 'last': str(s.get('last') or ''), 'pages': s.get('pages') or {}}


def _defa_save(s):
    """Écrit l'état de la récupération du site DEFA ; erreur d'écriture ignorée."""
    try:
        with open(DEFA_STATE, 'w', encoding='utf-8') as f:
            json.dump(s, f, ensure_ascii=False, indent=1)
    except OSError:
        pass


def defa_set_auto(on):
    """Active ou coupe la récupération automatique du site DEFA ; renvoie l'état."""
    s = defa_state()
    s['auto'] = on
    _defa_save(s)
    return s


def defa_refresh(force=False, auto=False, pages=None):
    """Télécharge les pages Flotte et Log des vols et les passe aux scripts ; auto : seulement si le réglage le permet
    et qu'aucune tentative n'a eu lieu aujourd'hui (échec compris) ; une passe à la fois. pages : adresses réglées par la
    page ({ flotte, log } : site de la compagnie, RepositoryNav.vaUrl) ; adresse vide : page non importée (compagnie sans
    site réglé : jamais la flotte d'une autre) ; sans pages (page ancienne) : adresses par défaut de DEFA_SITE."""
    s = defa_state()
    if auto and not force and (not s['auto'] or s['last'][:10] == datetime.date.today().isoformat()):
        return {**s, 'skipped': True}
    if not has_data():
        return {**s, 'error': 'données absentes (data/data_tree.js)'}
    if not DEFA_LOCK.acquire(blocking=False):
        return {**s, 'busy': True}
    try:
        s['last'] = datetime.datetime.now().isoformat(timespec='seconds')
        _defa_save(s)  # les autres onglets voient la tentative du jour
        for page, (url, script, out) in DEFA_SITE.items():
            r = {'at': s['last']}
            tmp = ''
            if pages is not None:
                url = str(pages.get(page) or '').strip()
                if not re.match(r'https?://', url):
                    s['pages'][page] = {**r, 'ok': False, 'message': 'adresse du site de la compagnie non réglée (Paramètres › Installation › Sources et dossiers)'}
                    continue
            r['url'] = url
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'SOG-suite (flotte et journal)'})
                with urllib.request.urlopen(req, timeout=30) as f:
                    raw = f.read()
                with tempfile.NamedTemporaryFile(delete=False, suffix='.html') as f:
                    f.write(raw)
                    tmp = f.name
                p = subprocess.run([sys.executable, os.path.join(ROOT, *script), tmp, '--out=' + os.path.join(DATA, 'references', out)],
                                   cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180,
                                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
                r.update(ok=p.returncode == 0, message=(p.stdout + p.stderr).strip()[-600:])
            except (OSError, ValueError, subprocess.SubprocessError) as e:
                r.update(ok=False, message=str(e)[:300])
            finally:
                if tmp:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass
            s['pages'][page] = r
        # types d'aéronefs inconnus de la base (flotte, journal, appareils individuels) : une passe sur ces seuls codes
        s['types'] = defa_types_pass()
        _defa_save(s)
        return {**s, 'ran': True}
    finally:
        DEFA_LOCK.release()


def _data_rows(name, key):
    """Lignes d'un fichier de données de data/references/ (format AircraftDB/datafile.py : « let data = {…}; »)."""
    try:
        with open(os.path.join(DATA, 'references', name), encoding='utf-8') as f:
            m = re.search(r'let data = (\{.*?\n\});', f.read(), re.S)
        return (json.loads(m.group(1)) if m else {}).get(key) or []
    except (OSError, ValueError, AttributeError):
        return []


def unknown_types():
    """Types OACI de la flotte, du journal (référence) et des appareils individuels absents de la base des types
    (AircraftDB/aircraft_db.js, alias compris) ; tous si la base manque."""
    try:
        with open(os.path.join(ROOT, 'AircraftDB', 'aircraft_db.js'), encoding='utf-8') as f:
            m = re.search(r'window\.AIRCRAFT_DB = (\{.*\});', f.read(), re.S)
        db = json.loads(m.group(1)) if m else {}
    except (OSError, ValueError):
        db = {}
    aliases = db.get('__aliases') or {}
    codes = set()
    for name, key in (('aircraft_fleet.js', 'rows'), ('defa_reference.js', 'aircraft'), ('aircraft_personal.js', 'rows')):
        for r in _data_rows(name, key):
            c = str((r or {}).get('type') or '').upper().strip()
            if re.fullmatch('[A-Z0-9]{2,4}', c):
                codes.add(c)
    return sorted(c for c in codes if c not in db and aliases.get(c, c) not in db)


def defa_types_pass():
    """Après la mise à jour depuis le site : passe de la base des types sur les codes inconnus (au plus 200), si aucune
    passe ne tourne ; { codes, started }."""
    codes = unknown_types()[:200]
    return {'codes': codes, 'started': bool(codes) and aircraft_start(codes)}


# ---- dernier vol du pilote (CR : « Mon dernier vol IVAO / VATSIM »). Le lanceur interroge le réseau (IVAO : clé de la
# suite, jamais transmise à la page ; VATSIM : API publique, sans clé, sans CORS) et rend le format du collage du
# tracker (shared/mission_core/text_import.js › parseIvaoDetails) : la page passe le plan de vol (texte FPL OACI) à
# parseFpl et le tout au même préremplissage (MissionTextImport.apply). Cache : liste d'un pilote 2 minutes ; détail
# d'un vol terminé gardé (il ne change plus) ; vol en cours jamais gardé.
VATSIM_API = 'https://api.vatsim.net/v2'
_flights = {'list': {}, 'detail': {}}
FLIGHT_DAYS = 7


def _hhmm(seconds):
    """Durée ou heure en secondes → « HHMM » ; '' sans valeur."""
    try:
        m = int(seconds) // 60
    except (TypeError, ValueError):
        return ''
    return f'{m // 60 % 100:02d}{m % 60:02d}' if m >= 0 else ''


def _fpl_clean(v):
    """Champ de plan de vol sans tiret (séparateur des cases OACI) ni retour à la ligne."""
    return re.sub(r'\s+', ' ', str(v or '').replace('-', ' ').replace('(', ' ').replace(')', ' ')).strip()


def _fpl_text(callsign, rules, ftype, acft, count=1, wake='', equip='', dep='', eobt='', speed='', level='', route='', arr='',
              eet='', altn='', altn2='', item18='', endurance='', pob=None):
    """Plan de vol au format OACI « (FPL-…) », lu par text_import.js › parseFpl (même analyse qu'un plan collé)."""
    c = _fpl_clean
    item9 = f"{f'{count}/' if (count or 1) > 1 else ''}{c(acft) or 'ZZZZ'}{f'/{c(wake)}' if wake else ''}"
    item19 = ' '.join(x for x in (f'E/{endurance}' if endurance else '', f'P/{pob}' if pob else '') if x)
    parts = [f'FPL-{c(callsign)}', f'{c(rules)[:1] or "I"}{c(ftype)[:1]}', item9, c(equip) or 'Z/Z', f'{c(dep) or "ZZZZ"}{eobt}',
             f'{c(speed)}{c(level)} {c(route)}'.strip(), ' '.join(x for x in (f'{c(arr) or "ZZZZ"}{eet}', c(altn), c(altn2)) if x),
             c(item18) or '0']
    if item19:
        parts.append(item19)
    return '(' + ' -'.join(parts) + ')'


def _cached(kind, key, maxage):
    hit = _flights[kind].get(key)
    return hit[1] if hit and (maxage is None or time.time() - hit[0] < maxage) else None


def _since(days=FLIGHT_DAYS):
    now = datetime.datetime.now(datetime.timezone.utc)
    return now - datetime.timedelta(days=days), now


def _iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')


_ivao_tracks = {}  # session terminée → ses points (une trace terminée ne change plus)


def _ivao_points(sid, key, done=True):
    """Points d'une session IVAO dans l'ordre (timestamp, latitude, longitude, altitude, groundSpeed, onGround, state) ;
    gardés si la session est terminée."""
    hit = _ivao_tracks.get(sid)
    if hit is not None:
        return hit
    got = _ivao_get(f'/tracker/sessions/{sid}/tracks', key)
    pts = sorted((t for t in (got if isinstance(got, list) else []) if t.get('timestamp') and t.get('latitude') is not None),
                 key=lambda t: t['timestamp'])
    if done:
        _ivao_tracks[sid] = pts
    return pts


def _utc(v):
    """Instant ISO de l'API (« 2026-10-19T07:40:11.000Z ») → datetime UTC."""
    return datetime.datetime.fromisoformat(str(v).replace('Z', '+00:00'))


def _nm(a, b):
    """Distance en milles nautiques entre deux points de trace IVAO."""
    la1, lo1, la2, lo2 = (math.radians(float(x)) for x in (a['latitude'], a['longitude'], b['latitude'], b['longitude']))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3440.065 * 2 * math.asin(min(1.0, math.sqrt(h)))


def _ivao_same_flight(a, b, key):
    """Sessions consécutives a puis b d'un pilote : même vol coupé par une déconnexion ? Même indicatif, b ouverte au plus
    30 min après la fin de a, a qui ne finit pas au parking (« On Blocks » : vol terminé), et b qui reprend là où a s'est
    arrêtée (distance franchissable pendant la coupure, 600 kt au plus). Le plan de vol ne compte pas : une reconnexion
    peut garder un instant le plan de l'étape précédente."""
    if not a.get('completedAt') or a.get('callsign') != b.get('callsign'):
        return False
    gap = (_utc(b['createdAt']) - _utc(a['completedAt'])).total_seconds()
    if not -60 <= gap <= 1800:
        return False
    pa, pb = _ivao_points(a['id'], key), _ivao_points(b['id'], key, bool(b.get('completedAt')))
    if not pa or not pb or str(pa[-1].get('state') or '') == 'On Blocks':
        return False
    return _nm(pa[-1], pb[0]) <= 5 + max(gap, 0) / 3600 * 600


def ivao_last_flight(vid='', session=''):
    """Sans session : { flights: [{ id, sessions, callsign, dep, arr, start, end, open, trackerUrl }], id, from, to } (vols
    des 7 derniers jours, plus récent d'abord ; un vol coupé par des déconnexions = une entrée, id = ses sessions
    « a,b,c ») ; avec session (une ou plusieurs, dans l'ordre) : détail au format parseIvaoDetails ({ kind, source,
    network, callsign, dep, arr, connected, disconnected, samples, fplText, equipKnown, trackerUrl, sessionIds,
    trackerUrls, gaps, open }) ; { error } sinon."""
    key = ivao_key()
    if not key:
        return IVAO_NO_KEY
    try:
        if session:
            if not re.fullmatch(r'\d{1,12}(,\d{1,12}){0,9}', session):
                return {'error': 'session invalide'}
            hit = _cached('detail', f'ivao:{session}', None)
            if hit:
                return hit
            sids = session.split(',')
            metas = [_ivao_get(f'/tracker/sessions/{sid}', key) for sid in sids]
            s, first = metas[-1], metas[0]
            # plan complet par /flightPlans (la session n'en donne qu'un résumé, /flightPlans/latest tronque les
            # équipements) : dernière révision de la dernière session
            fps = _ivao_get(f'/tracker/sessions/{sids[-1]}/flightPlans', key)
            fps = sorted(fps if isinstance(fps, list) else [], key=lambda f: f.get('revision') or 0)
            fp = fps[-1] if fps else {}
            # traces des sessions mises bout à bout (mise en route depuis la première, arrêt depuis la dernière)
            samples = [{'time': t.get('timestamp'), 'lat': t.get('latitude'), 'lon': t.get('longitude'), 'alt': t.get('altitude'),
                        'gs': t.get('groundSpeed'), 'onGround': t.get('onGround'), 'state': t.get('state')}
                       for m in metas for t in _ivao_points(str(m.get('id')), key, bool(m.get('completedAt')))]
            ids = lambda xs: ''.join(str(x.get('id') or '') if isinstance(x, dict) else str(x) for x in (xs or []))
            equip = '/'.join(x for x in (ids(fp.get('aircraftEquipments')), ids(fp.get('aircraftTransponderTypes'))) if x)
            wake = ((fp.get('aircraft') or {}).get('wakeTurbulence') or '')[:1]
            url = lambda m: f"https://tracker.ivao.aero/sessions/{m.get('id')}"
            out = {
                'kind': 'ivao-details', 'source': 'IVAO', 'network': 'IVAO', 'sessionId': s.get('id'),
                'sessionIds': [m.get('id') for m in metas], 'trackerUrls': [url(m) for m in metas],
                'gaps': [[x.get('completedAt'), y.get('createdAt')] for x, y in zip(metas, metas[1:])],
                'callsign': s.get('callsign') or '', 'dep': fp.get('departureId') or '', 'arr': fp.get('arrivalId') or '',
                'connected': first.get('createdAt'), 'disconnected': s.get('completedAt'), 'open': not s.get('completedAt'),
                'samples': samples, 'equipKnown': bool(equip), 'trackerUrl': url(s),
                'fplText': _fpl_text(s.get('callsign'), fp.get('flightRules'), fp.get('flightType'), fp.get('aircraftId'),
                                     fp.get('aircraftNumber') or 1, wake, equip, fp.get('departureId'), _hhmm(fp.get('departureTime')),
                                     fp.get('speed'), fp.get('level'), fp.get('route'), fp.get('arrivalId'), _hhmm(fp.get('eet')),
                                     fp.get('alternativeId'), fp.get('alternative2Id'), fp.get('remarks'),
                                     _hhmm(fp.get('endurance')), fp.get('peopleOnBoard')) if fp else ''
            }
            if not out['open']:
                _flights['detail'][f'ivao:{session}'] = (time.time(), out)
            return out
        if not re.fullmatch(r'\d{3,8}', vid or ''):
            return {'error': 'VID IVAO manquant ou invalide (Mon profil)'}
        hit = _cached('list', f'ivao:{vid}', 120)
        if hit:
            return hit
        # fenêtre glissante des 7 derniers jours (UTC), indépendante de la page, de la famille et de la date du CR
        d0, d1 = _since()
        items, page = [], 1
        while page <= 5:  # toutes les pages (au plus 250 sessions)
            got = _ivao_get('/tracker/sessions?' + urllib.parse.urlencode({
                'userId': vid, 'connectionType': 'PILOT', 'perPage': 50, 'page': page, 'from': _iso(d0), 'to': _iso(d1)}), key)
            got = got if isinstance(got, dict) else {}
            items += got.get('items') or []
            if page >= int(got.get('pages') or 1):
                break
            page += 1
        # vols : sessions consécutives d'un même vol (déconnexions) regroupées, dans l'ordre
        groups = []
        for s in sorted(items, key=lambda x: str(x.get('createdAt') or '')):
            if groups and _ivao_same_flight(groups[-1][-1], s, key):
                groups[-1].append(s)
            else:
                groups.append([s])
        flights = []
        for g in groups:
            last = g[-1]
            fp = sorted(last.get('flightPlans') or [], key=lambda f: f.get('revision') or 0)
            fp = fp[-1] if fp else {}
            flights.append({'id': ','.join(str(x.get('id')) for x in g), 'sessions': len(g), 'callsign': last.get('callsign') or '',
                            'dep': fp.get('departureId') or '', 'arr': fp.get('arrivalId') or '', 'start': g[0].get('createdAt'),
                            'end': last.get('completedAt'), 'open': not last.get('completedAt'),
                            'trackerUrl': f"https://tracker.ivao.aero/sessions/{last.get('id')}"})
        # requête rappelée dans la réponse : une liste vide dit pour quel VID et quelle période
        out = {'flights': sorted(flights, key=lambda f: f['start'] or '', reverse=True), 'id': vid, 'from': _iso(d0), 'to': _iso(d1)}
        if flights:  # liste vide jamais gardée (nouvel essai aussitôt après une connexion)
            _flights['list'][f'ivao:{vid}'] = (time.time(), out)
        return out
    except (OSError, ValueError) as e:
        return ivao_fail(e)


def _vatsim_get(path):
    req = urllib.request.Request(VATSIM_API + path, headers={'User-Agent': 'SOG-suite', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def _vatsim_level(v):
    """Altitude d'un plan VATSIM (« 24000 », « FL240 », « A045 », « VFR ») → niveau OACI (F240, A045, VFR)."""
    v = str(v or '').strip().upper()
    if re.fullmatch(r'(FL|F)\d{2,3}', v):
        return 'F' + v.lstrip('FL').zfill(3)
    if re.fullmatch(r'\d{3,5}', v):
        n = int(v)
        return f'F{n // 100:03d}' if n >= 1000 else f'F{n:03d}'
    return v


def vatsim_last_flight(cid='', connection=''):
    """Comme ivao_last_flight, pour VATSIM (connexions de pilote : historique public, plans déposés) ; pas de trace : les
    heures sont celles de connexion et de déconnexion."""
    if not re.fullmatch(r'\d{6,8}', cid or ''):
        return {'error': 'CID VATSIM manquant ou invalide (Mon profil)'}
    try:
        hist = _cached('list', f'vatsim:{cid}', 120)
        if not hist:
            got = _vatsim_get(f'/members/{cid}/history?limit=50')
            d0, d1 = _since()
            items = [h for h in (got.get('items') or []) if h.get('type') == 1 and str(h.get('start') or '') >= _iso(d0)]
            fps = _vatsim_get(f'/members/{cid}/flightplans') if items else []
            hist = {'items': items, 'fps': fps if isinstance(fps, list) else [], 'from': _iso(d0), 'to': _iso(d1)}
            if items:  # liste vide jamais gardée
                _flights['list'][f'vatsim:{cid}'] = (time.time(), hist)

        def plan_of(h):
            # plan lié à la connexion, sinon déposé pour cet indicatif au plus tard à la fin de la connexion, au plus tôt 12 h avant son début
            end, start = str(h.get('end') or '9999'), str(h.get('start') or '')
            lo = _iso(datetime.datetime.fromisoformat(start.replace('Z', '+00:00')) - datetime.timedelta(hours=12)) if start else ''
            cands = [f for f in hist['fps'] if f.get('connection_id') == h.get('id')]  # plan lié à la connexion
            cands = cands or [f for f in hist['fps'] if f.get('callsign') == h.get('callsign') and lo <= str(f.get('filed') or '') <= end]
            return max(cands, key=lambda f: str(f.get('filed') or '')) if cands else {}

        if not connection:
            return {'flights': [{'id': h.get('id'), 'callsign': h.get('callsign') or '', 'dep': plan_of(h).get('dep') or '',
                                 'arr': plan_of(h).get('arr') or '', 'start': h.get('start'), 'end': h.get('end'),
                                 'open': not h.get('end')} for h in sorted(hist['items'], key=lambda h: str(h.get('start') or ''), reverse=True)],
                    'id': cid, 'from': hist['from'], 'to': hist['to']}
        h = next((x for x in hist['items'] if str(x.get('id')) == connection), None)
        if not h:
            return {'error': 'connexion VATSIM introuvable (liste à relire)'}
        fp = plan_of(h)
        acft = str(fp.get('aircraft') or '')  # « DH8D/M-SDE2E3FGRY/H » : type/sillage-équipements/transpondeur
        a9, _, equip = acft.partition('-')
        typ, _, wake = a9.partition('/')
        hm = lambda hrs, mins: f'{int(hrs or 0):02d}{int(mins or 0):02d}' if (hrs or mins) else ''
        return {
            'kind': 'ivao-details', 'source': 'VATSIM', 'network': 'VATSIM', 'callsign': h.get('callsign') or '',
            'dep': fp.get('dep') or '', 'arr': fp.get('arr') or '', 'connected': h.get('start'), 'disconnected': h.get('end'),
            'open': not h.get('end'), 'samples': [], 'equipKnown': bool(equip),
            'fplText': _fpl_text(h.get('callsign'), (fp.get('flight_type') or 'I')[:1], '', typ, 1, wake[:1], equip,
                                 fp.get('dep'), str(fp.get('deptime') or '').zfill(4)[:4] if fp.get('deptime') else '',
                                 f"N{int(fp['cruisespeed']):04d}" if str(fp.get('cruisespeed') or '').isdigit() else '',
                                 _vatsim_level(fp.get('altitude')), fp.get('route'), fp.get('arr'),
                                 hm(fp.get('hrsenroute'), fp.get('minenroute')), fp.get('alt'), '', fp.get('rmks'),
                                 hm(fp.get('hrsfuel'), fp.get('minsfuel'))) if fp else ''
        }
    except urllib.error.HTTPError as e:
        return {'error': f'VATSIM : HTTP {e.code}' + (' (trop de demandes : réessayer plus tard)' if e.code == 429 else '')}
    except (OSError, ValueError) as e:
        return {'error': f'VATSIM : {e}'}


_ivao_book = {}  # date → (instant, réservations du jour)


def ivao_bookings(day_from='', day_to='', pre='LF'):
    """Réservations ATC d'IVAO entre deux dates (AAAA-MM-JJ, incluses, 8 jours au plus) : { bookings: [{ id, startDate,
    endDate, training ('training', 'exam'… ou null), atcPosition }] }, positions commençant par un des préfixes OACI
    du périmètre (pre : « LF » ou « ED,ET »… ; le tri fin est fait par la page : SuiteAtc.inPerimeter) ; un appel
    /atc/bookings/daily par jour, gardé 5 minutes ; { error } sans clé ou sans réponse."""
    prefixes = tuple(p for p in str(pre or '').upper().split(',') if re.fullmatch('[A-Z]{1,3}', p)) or ('LF',)
    key = ivao_key()
    if not key:
        return IVAO_NO_KEY
    try:
        d0 = datetime.date.fromisoformat(day_from) if day_from else datetime.date.today()
        d1 = datetime.date.fromisoformat(day_to) if day_to else d0 + datetime.timedelta(days=6)
    except ValueError:
        return {'error': 'dates attendues : from=AAAA-MM-JJ&to=AAAA-MM-JJ'}
    out = []
    for i in range(min((d1 - d0).days + 1, 8)):
        d = (d0 + datetime.timedelta(days=i)).isoformat()
        hit = _ivao_book.get(d)
        if hit and time.time() - hit[0] < 300:
            day = hit[1]
        else:
            try:
                got = _ivao_get(f'/atc/bookings/daily?date={d}', key)
            except (OSError, ValueError) as e:
                return ivao_fail(e)
            day = [{'id': b.get('id'), 'startDate': b.get('startDate'), 'endDate': b.get('endDate'),
                    'training': b.get('training'), 'atcPosition': str(b.get('atcPosition', ''))}
                   for b in (got if isinstance(got, list) else [])]
            _ivao_book[d] = (time.time(), day)  # journée entière gardée : un autre périmètre la relit sans appel
        out.extend(b for b in day if b['atcPosition'].upper().startswith(prefixes))
    return {'bookings': out}


# Repère de cette installation : un jeton tiré à chaque lancement, écrit à la racine et dans les dossiers de données.
# Les pages le lisent par le serveur et dans le dossier autorisé du navigateur (FileAccess) : jetons différents = le
# dossier choisi est une autre copie de la suite (ex. « DEFA - Copy »), signalée. Fichier ignoré par git.
INSTANCE_FILE = '.defa_instance'
INSTANCE_DIRS = ('', 'data', os.path.join('data', 'missions'), os.path.join('data', 'cr'), os.path.join('data', 'sia'),
                 os.path.join('data', 'planner'))


INDEX_LOCK = threading.Lock()

# État de synchronisation (bouton « Synchroniser » de chaque page) : git status, rev-list… prennent 1 à 3 s sur un gros
# dossier data/, et chaque page le demande à l'ouverture. Réponse immédiate avec le dernier état connu ; relu en tâche de
# fond s'il a plus de SYNC_TTL secondes (un seul relevé à la fois) ; relu tout de suite au premier appel, avec
# ?fetch=1 (dépôt distant) et après un passage de synchronisation.
SYNC_TTL = 20
_sync = {'at': 0.0, 'value': None, 'busy': False}
_sync_lock = threading.Lock()


def _sync_refresh(fetch=False):
    """Relève l'état de synchronisation de data/ (dépôt distant compris si fetch) et le met en cache."""
    try:
        value = data_sync.status(DATA, fetch=fetch)
        with _sync_lock:
            _sync.update(at=time.time(), value=value)
    finally:
        with _sync_lock:
            _sync['busy'] = False


def sync_status(fetch=False, fresh=False):
    """fresh : relevé local refait tout de suite (après une écriture de la page) ; fetch : dépôt distant compris."""
    with _sync_lock:
        value, age, busy = _sync['value'], time.time() - _sync['at'], _sync['busy']
        if value is not None and not fetch and not fresh:
            if age > SYNC_TTL and not busy:
                _sync['busy'] = True
                threading.Thread(target=_sync_refresh, daemon=True).start()
            return value
        _sync['busy'] = True
    _sync_refresh(fetch)
    return _sync['value']


def sync_status_reset():
    """Oublie l'état de synchronisation en cache (relu à la demande suivante, après une synchronisation)."""
    with _sync_lock:
        _sync.update(at=0.0, value=None)
# ---- base des types d'aéronefs (OACI Doc 8643, performances EUROCONTROL) : non publiée, complétée sur chaque poste,
# type par type, par AircraftDB/update_aircraft_db.py (--only CODES, puis --apd CODES) : un nouvel appareil, ou une liste
# (flotte, missions de l'ODV et du registre) — Paramètres › Maintenance › Références et dépendances, /__setup/aircraft-db.
# Jamais toute la base EUROCONTROL d'un coup.
AIRCRAFT = {'state': 'idle', 'step': '', 'started': None, 'ended': None, 'log': [], 'codes': [], 'queue': []}
AIRCRAFT_LOCK = threading.Lock()


def aircraft_files():
    """Présence des fichiers de la base des types d'aéronefs (aircraft_db.js, aircraft_perf.js)."""
    d = os.path.join(ROOT, 'AircraftDB')
    return {'db': os.path.exists(os.path.join(d, 'aircraft_db.js')), 'perf': os.path.exists(os.path.join(d, 'aircraft_perf.js'))}


AIRCRAFT_KEEP = ('aircraft_db.js', 'aircraft_perf.js', 'aircraft_db.json', 'aircraft_perf.json')
AIRCRAFT_JSON = {'aircraft_db.json': ('aircraft_db.js', 'AIRCRAFT_DB'), 'aircraft_perf.json': ('aircraft_perf.js', 'AIRCRAFT_PERF')}


def aircraft_json(src, js, name):
    """Texte JSON tiré du littéral « window.NOM = {…}; » d'un .js de la base des types (déjà contrôlé par data_guard) ;
    None s'il n'en est pas un."""
    try:
        text = open(os.path.join(src, js), encoding='utf-8').read()
    except OSError:
        return None
    m = re.search(r'window\.' + name + r'\s*=\s*', text)
    if not m:
        return None
    try:
        return json.dumps(json.loads(text[m.end():].strip().rstrip(';').strip()), ensure_ascii=False, separators=(',', ':'))
    except ValueError:
        return None


def aircraft_publish(author='', apply=False):
    """Base des types publiée dans le dépôt des données (téléphones et site en mode GitHub ; jamais sur le site public :
    tools/build_pages.py ne prend que les fichiers suivis du dépôt de la suite) : data/AircraftDB/ ne garde que
    aircraft_db.js et aircraft_perf.js, copiés depuis AircraftDB/ de la suite (littéraux purs : tools/data_guard.py) ; tout
    le reste du dossier (caches, scripts, __pycache__…) est retiré. apply faux : liste seulement ce qui serait fait (le
    bouton la montre et demande l'accord). apply vrai : fait, commit au nom de author, puis passe de synchronisation.
    Les mêmes bases sont aussi écrites en JSON (aircraft_db.json, aircraft_perf.json : format de la V3, frame/aerodb, qui
    n'exécute aucun script venu du dépôt), à côté des .js tant que la V2 les lit."""
    src, dst = os.path.join(ROOT, 'AircraftDB'), os.path.join(DATA, 'AircraftDB')
    res = {'ok': False, 'remove': [], 'copy': [], 'message': ''}
    if not data_sync.is_repo(DATA):
        res['message'] = 'data/ n’est pas un dépôt git : rien à publier.'
        return res
    missing = [n for n in AIRCRAFT_KEEP if n not in AIRCRAFT_JSON and not os.path.isfile(os.path.join(src, n))]
    if missing:
        res['message'] = 'Base des types absente sur ce poste (' + ', '.join(missing) + ') : la compléter d’abord.'
        return res
    for n in AIRCRAFT_KEEP:
        if n in AIRCRAFT_JSON:
            continue
        ok, why = data_guard.check_file(os.path.join(src, n))
        if not ok:
            res['message'] = f'AircraftDB/{n} refusé ({why}) : rien publié.'
            return res
    if os.path.isdir(dst):
        for d, dirs, files in os.walk(dst):
            for f in files:
                rel = os.path.relpath(os.path.join(d, f), dst).replace(os.sep, '/')
                if rel not in AIRCRAFT_KEEP:
                    res['remove'].append({'path': 'AircraftDB/' + rel, 'size': os.path.getsize(os.path.join(d, f))})
    texts = {}
    for n in AIRCRAFT_KEEP:
        b = os.path.join(dst, n)
        if n in AIRCRAFT_JSON:
            t = aircraft_json(src, *AIRCRAFT_JSON[n])
            if t is None:
                res['message'] = f'AircraftDB/{AIRCRAFT_JSON[n][0]} : littéral illisible en JSON, rien publié.'
                return res
            data = texts[n] = t.encode('utf-8')
        else:
            data = open(os.path.join(src, n), 'rb').read()
        if not os.path.isfile(b) or open(b, 'rb').read() != data:
            res['copy'].append({'path': 'AircraftDB/' + n, 'size': len(data)})
    res['ok'] = True
    if not apply:
        return res
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        return {**res, 'ok': False, 'message': 'Trigramme de l’auteur manquant ou invalide.'}
    for r in res['remove']:
        os.remove(os.path.join(DATA, *r['path'].split('/')))
    for d, dirs, files in os.walk(dst, topdown=False):  # dossiers vidés (caches, __pycache__) retirés
        if d != dst and not os.listdir(d):
            os.rmdir(d)
    os.makedirs(dst, exist_ok=True)
    for c in res['copy']:
        n = os.path.basename(c['path'])
        if n in texts:
            with open(os.path.join(DATA, *c['path'].split('/')), 'wb') as f:
                f.write(texts[n])
        else:
            shutil.copyfile(os.path.join(src, n), os.path.join(DATA, *c['path'].split('/')))
    env = dict(data_sync.git_env(), GIT_AUTHOR_NAME=author, GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local')
    who = ['-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local']
    data_sync.git(DATA, 'add', '-A', '--', 'AircraftDB', check=True)
    code, _ = data_sync.git(DATA, 'diff', '--cached', '--quiet')
    if code:
        data_sync.git(DATA, *who, 'commit', '-m', f'Base des types publiée ({author})', env=env, check=True)
    with SYNC_LOCK:
        res['sync'] = data_sync.run(DATA, author)
    sync_status_reset()
    res['ok'] = res['sync'].get('ok', False)
    res['message'] = res['sync'].get('message', '')
    return res


def aircraft_rebuild(codes, quick=False):
    """Complète la base des types pour les désignateurs donnés : types OACI Doc 8643, performances EUROCONTROL APD,
    puis consommations SimBrief (tous les types de SimBrief, liste en cache une semaine), enfin alias et caractéristiques
    d'Airframe DB (40 fiches au plus par passe). quick : types et performances de ces codes seulement (ajout d'un type
    à la main dans Mon profil › Appareils et simulateurs : une passe de quelques secondes)."""
    d = os.path.join(ROOT, 'AircraftDB')
    script = os.path.join(d, 'update_aircraft_db.py')
    overrides = os.path.join(DATA, 'references', 'aircraft_overrides.json')
    steps = [('types (OACI Doc 8643) : ' + ' '.join(codes), [sys.executable, script, '--only', *codes, '--overrides', overrides]),
             ('performances (EUROCONTROL APD) : ' + ' '.join(codes), [sys.executable, script, '--apd', *codes]),
             # consommation de croisière et masses de tous les types de SimBrief (une requête, cache d'une semaine)
             ('consommations (SimBrief)', [sys.executable, script, '--simbrief']),
             # alias (noms en usage → code OACI) et caractéristiques d'Airframe DB : au plus 40 fiches par passe (≈ 1 min),
             # la base se complète au fil des passes puis se rafraîchit tous les 30 jours
             ('alias et caractéristiques (Airframe DB)', [sys.executable, script, '--airframedb', '40'])]
    if quick:
        steps = steps[:2]
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
    # file d'attente : codes ajoutés à la main pendant la passe (Mon profil), lancés maintenant en passe courte — la page
    # qui les a demandés peut avoir été fermée entre-temps
    with AIRCRAFT_LOCK:
        queued, AIRCRAFT['queue'] = AIRCRAFT.get('queue') or [], []
    if queued:
        aircraft_start(queued, quick=True)


def aircraft_start(codes, quick=False):
    """Complète les types donnés (désignateurs OACI) en tâche de fond ; False si une passe tourne déjà ou si la liste
    est vide ; quick : passe courte (types et performances de ces codes, voir aircraft_rebuild). Une passe courte
    demandée pendant une passe est mise en file (AIRCRAFT['queue']) et part à la fin de celle-ci."""
    codes = sorted({re.sub(r'[^A-Z0-9]', '', str(c).upper())[:8] for c in codes} - {''})[:200]
    if not codes:
        return False
    with AIRCRAFT_LOCK:
        if AIRCRAFT['state'] == 'running':
            if quick:
                AIRCRAFT['queue'] = sorted(set(AIRCRAFT.get('queue') or []) | (set(codes) - set(AIRCRAFT.get('codes') or [])))
            return False
        AIRCRAFT.update(state='running', started=time.time(), ended=None, log=[], codes=codes)
    threading.Thread(target=aircraft_rebuild, args=(codes, quick), daemon=True).start()
    return True


AERO_LOCK = threading.Lock()  # un téléchargement de données aéronautiques à la fois (tools/aero_fetch.py)
_loaded = {}  # module → date du fichier au chargement


def fresh(mod):
    """Module d'outil relu si son fichier a changé depuis le chargement (mise à jour de la suite sans relancer le
    lanceur : sinon un fournisseur ajouté depuis répondait « fournisseur inconnu », comme « nat » des tracks NAT)."""
    import importlib
    try:
        m = os.stat(mod.__file__).st_mtime_ns
    except OSError:
        return mod
    if _loaded.setdefault(mod.__name__, m) != m:
        try:
            mod = importlib.reload(mod)
            _loaded[mod.__name__] = m
            say(f'  {os.path.basename(mod.__file__)} relu (modifié depuis le lancement).')
        except Exception as e:  # fichier en cours d'écriture, erreur de syntaxe : l'ancienne version reste
            say(f'  ⚠ {os.path.basename(mod.__file__)} non relu : {e}')
    return mod
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


INSTANCE_TOKEN = ''


# ---- Git LFS : images, textures, icônes, polices et archives sont suivies par Git LFS (.gitattributes) ; un clone fait
# sans Git LFS installé ne laisse que des pointeurs (texte de 130 octets) — designs sans textures, icônes absentes.
# Contrôlé à chaque lancement, pour la suite et pour data/ : récupérés par « git lfs pull » si Git LFS est là, sinon
# consigne dans la fenêtre du lanceur et sur la page de premier lancement (/__setup/status › lfs), jamais en silence.
LFS = {}  # 'suite' | 'data' → {'missing': n, 'example': chemin, 'tool': bool}
LFS_SKIP = {'.git', '.claude', 'node_modules', '__pycache__', 'dist'}


def lfs_patterns(root):
    """Motifs des fichiers suivis par Git LFS (lignes « motif filter=lfs » du .gitattributes de root)."""
    try:
        lines = open(os.path.join(root, '.gitattributes'), encoding='utf-8', errors='replace').read().splitlines()
    except OSError:
        return []
    return [l.split()[0] for l in lines if 'filter=lfs' in l and l.split() and not l.lstrip().startswith('#')]


def lfs_pointers(root, skip=()):
    """Fichiers de root restés en pointeurs Git LFS (chemins relatifs) ; skip : dossiers de premier niveau à ignorer."""
    pats = lfs_patterns(root)
    out = []
    if not pats:
        return out
    for d, dirs, files in os.walk(root):
        rel_d = os.path.relpath(d, root)
        dirs[:] = [x for x in dirs if x not in LFS_SKIP and not (rel_d == '.' and x in skip)]
        for n in files:
            if not any(fnmatch.fnmatch(n, p) for p in pats):
                continue
            f = os.path.join(d, n)
            try:
                if os.path.getsize(f) > 1024:
                    continue
                with open(f, 'rb') as h:
                    if h.read(len(LFS_POINTER)) == LFS_POINTER:
                        out.append(os.path.relpath(f, root).replace(os.sep, '/'))
            except OSError:
                pass
    return out


def ensure_lfs(root, key, label, skip=()):
    """Contrôle Git LFS d'un dépôt (root) : pointeurs trouvés → « git lfs pull » si Git LFS est installé, sinon consigne.
    Résultat gardé dans LFS[key] pour la page ; vrai si plus aucun pointeur."""
    ptr = lfs_pointers(root, skip)
    git = data_sync.git_exe()
    tool = bool(git) and run([git, 'lfs', 'version'], capture_output=True) == 0
    if ptr and tool and os.path.exists(os.path.join(root, '.git')):
        say(f'  {label} : {len(ptr)} fichier(s) Git LFS pas encore récupéré(s) (images, textures, polices…) : git lfs pull…')
        run([git, 'lfs', 'install', '--local'], cwd=root, capture_output=True)
        run(data_sync.git_cmd('-C', root, 'lfs', 'pull'), cwd=root, timeout=1800, env=git_env())
        ptr = lfs_pointers(root, skip)
        say(f'  {label} : fichiers Git LFS récupérés.' if not ptr else f'  ⚠ {label} : {len(ptr)} fichier(s) Git LFS toujours manquant(s) '
            f'(réseau ou accès au dépôt), ex. {ptr[0]}')
    elif ptr:
        say(f'  ⚠ {label} : {len(ptr)} fichier(s) restés en pointeurs Git LFS (ex. {ptr[0]}) — textures, icônes et polices absentes.')
        say('    Installer Git LFS (https://git-lfs.com), puis relancer le lanceur : les fichiers seront récupérés.' if not tool else
            '    Copie sans dépôt git (pas de .git) : reprendre l’archive complète de la version, ou un clone fait avec Git LFS.')
    LFS[key] = {'missing': len(ptr), 'example': ptr[0] if ptr else '', 'tool': tool, 'repo': os.path.exists(os.path.join(root, '.git'))}
    return not ptr


def mark_instance():
    """Repère de l'installation lancée dans le dossier de l'application et ses dossiers de données. Même jeton pour toute la
    vie du lanceur : rappelé quand les données arrivent après le démarrage (jeu d'essai, dépôt, archive), sinon data/ et
    ses sous-dossiers restaient sans repère et les pages ne pouvaient pas dire s'ils sont ceux de la suite servie."""
    global INSTANCE_TOKEN
    token = INSTANCE_TOKEN = INSTANCE_TOKEN or secrets.token_hex(8)
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
    """Point d'entrée : options, données, serveur local (port libre suivant si besoin), navigateur."""
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
    # fichiers Git LFS (textures, icônes, polices…) de la suite et des données : récupérés ou signalés
    ensure_lfs(ROOT, 'suite', 'Suite', skip=('data',))
    if os.path.isdir(DATA):
        ensure_lfs(DATA, 'data', 'Données')
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
    try:  # localhost rapide (IPv6 locale), seulement si la machine la propose et que le port y est libre
        srv6 = Server6(('::1', port), handler)
        threading.Thread(target=srv6.serve_forever, daemon=True).start()
    except OSError:
        pass
    url = f'http://127.0.0.1:{port}/{a.page}?t={int(time.time())}'  # adresse neuve : page jamais reprise du cache
    say(f'  Suite servie sur http://127.0.0.1:{port}/')
    say('')
    say('3. Navigateur')
    say(f'  {url}')
    say('  Chrome ou Edge conseillés (Brave : voir docs/INSTALL.md).')
    # tutoriel d'installation : dans l'Aide (version de la langue de la suite), ou hors ligne en HTML
    say(f'  Tutoriel d’installation, pas à pas : http://127.0.0.1:{port}/apps/aide/aide.html?doc=tutorial/installation.fr.md')
    say('  (hors ligne : docs/tutorial/installation.fr.html ; English: docs/tutorial/installation.en.html)')
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
