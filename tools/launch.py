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
3. Navigateur ouvert sur l'appli Pilote (frame/, V3) ; --page apps/settings/premier_lancement.html pour l'assistant V2,
   --page apps/… pour une page V2.

Usage : python tools/launch.py [--port 8000] [--page apps/…] [--no-browser] [--no-data]
Arrêt : fermer la fenêtre, ou Ctrl+C.
"""
import argparse, base64, datetime, fnmatch, glob, hashlib, http.server, io, json, math, os, re, secrets, shutil, socket, subprocess, sys, tempfile, threading, time
import http.client, http.cookies, ipaddress, posixpath, ssl, urllib.parse, urllib.request, webbrowser, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data_sync  # synchronisation git du pool de données (bouton « Synchroniser ») ; git durci (data_sync.git_cmd)
import data_guard  # .js de data/ : servis seulement s'ils suivent le format des fichiers de données
import report_bridge  # pont du registre : comptes rendus V3 (cr/reports/) rejoués dans cr/missions.yaml (V2)
import csp_policy as cspmod  # politique de sécurité du contenu, commune au site sans lanceur (tools/build_pages.py)
import aero_fetch  # données aéronautiques d'autres pays (Paramètres › Maintenance › Données aéronautiques)
from check_binaries import POINTER as LFS_POINTER  # début d'un pointeur Git LFS (fichier non récupéré)
import version_stamps  # empreintes ?v=… posées au moment de servir (pages, scripts, feuilles des designs)
import sim_position  # position du simulateur de ce poste (X-Plane 12, Little Navmap) pour le cadre V3
import device_access  # appareils appairés, réseau local et relais : un code, une liste, une révocation (R-C2)
import vfr_import  # compilation VFR des cartes VAC (tools/report-vfr) importée dans sia/vfr/ du dépôt des données
import outbound  # requêtes sortantes : un User-Agent nommé, chaque échec dit en console (hôte, chemin, code)
import suite_update  # mise à jour de la suite par canal (stable, early, suivi) : plan d'abord, avance rapide seulement
import regen_jobs  # travaux longs du module Données (régénération) : un à la fois, état, annulation ; état du poste

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
PAGE = 'frame/'  # l'appli Pilote (V3) ; la V2 reste servie à ses adresses (apps/…) et depuis Réglages › Administration
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
    # jamais d'identifiant dans une adresse https (« compte:jeton@ », ou le jeton seul : « ghp_…@ ») : il finirait affiché,
    # journalisé, dans data/.git/config ; en ssh (git@hôte:…), l'utilisateur est normal
    url = re.sub(r'^(https?://)[^/@\s]+@', r'\1', url, flags=re.I)
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
            regen_jobs.zip_check(zf)  # taille décompressée plafonnée (2 Go), avant toute lecture
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
    except regen_jobs.TooLarge as e:
        say(f'  Archive des données refusée : {e}')
        return False
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
# routes /__setup/ du lanceur : (méthode, chemin) → (gestionnaire, public, relay) ; public 'lan' : ouverte aussi à un appareil
# appairé du réseau local ; 'poste' (par défaut) : ce poste seulement ; relay : ouverte aussi à un appareil d'un pilote par
# le relais de la compagnie (--relay ; R1a) — les appareils des deux canaux : tools/device_access.py. Une route nouvelle se déclare
# là où elle est écrite (@route), jamais dans une liste à part.
ROUTES = {}
ROUTE_PATHS = set()


def route(method, *paths, public='poste', relay=False):
    """Inscrit une méthode du serveur pour ces chemins ; public : 'lan' ou 'poste' ; relay : ouverte au relais."""
    assert public in ('lan', 'poste'), public
    assert not relay or public == 'lan', 'une route du relais est aussi une route du réseau local'

    def deco(fn):
        for p in paths:
            assert (method, p) not in ROUTES, (method, p)
            ROUTES[(method, p)] = (fn.__name__, public, bool(relay))
            ROUTE_PATHS.add(p)
        return fn
    return deco


class Setup(http.server.SimpleHTTPRequestHandler):
    port = 0
    MAX_UPLOAD = 512 * 1024 * 1024  # archive des données ou journal : 512 Mo au plus

    def log_message(self, *a):
        """Journal des requêtes coupé : la console ne garde que les messages du lanceur."""
        pass

    def _local_host(self):
        """En-tête Host de cette machine : une page d'un autre site qui ferait pointer son nom vers 127.0.0.1
        (« DNS rebinding ») envoie son propre nom et se voit refuser tout le dossier, données comprises."""
        if self._relay():  # relais : l'hôte public déclaré (--relay), venu du proxy inverse sur 127.0.0.1
            return True
        if self._lan():  # serveur du réseau local : l'adresse privée exacte de ce poste (jamais un nom de domaine)
            return self.headers.get('Host') in LAN['hosts']
        return self.headers.get('Host') in (f'127.0.0.1:{self.port}', f'localhost:{self.port}', f'[::1]:{self.port}')

    def _lan(self):
        """Requête reçue par un serveur du réseau local (« Ouvrir aux appareils du réseau local »)."""
        return getattr(self.server, 'lan', False)

    def _relay(self):
        """Requête du relais de la compagnie (--relay <hôte>) : arrivée par le serveur du relais (Relay.start, 127.0.0.1,
        visé par le proxy inverse du NAS seulement), quels que soient Host et les en-têtes ; jamais déduite de Host : un proxy
        qui réécrirait Host sans en-tête de mandataire serait indiscernable du poste sur le port de l'interface."""
        return getattr(self.server, 'relay', False) is True

    def _proxy_belt(self):
        """Ceinture, en relais : une requête sur le port de l'interface venue de 127.0.0.1 avec un en-tête de mandataire
        (Relay.PROXY_HEADERS) est celle d'un proxy qui viserait le mauvais port ou réécrirait Host — refusée (vrai), jamais
        prise pour le poste (secrets, jetons, appareils). Le relais se reconnaît à son port ; ceci n'est qu'un second filet."""
        return (RELAY.on and not self._relay() and not self._lan() and self.client_address[0] in ('127.0.0.1', '::1')
                and any(self.headers.get(h) for h in Relay.PROXY_HEADERS))

    def _client_ip(self):
        """Adresse du client : en relais, la dernière de X-Forwarded-For (posée par le proxy, seul à joindre 127.0.0.1) ;
        sinon celle de la connexion."""
        if self._relay():
            xs = [x.strip() for x in (self.headers.get('X-Forwarded-For') or '').split(',') if x.strip()]
            if xs:
                return xs[-1][:64]
        return self.client_address[0]

    def _relay_gate(self):
        """Appareil d'un pilote par le relais : https vu par le proxy exigé, appareil appairé exigé pour tout (page
        d'appairage pour une page demandée, 401 sinon), puis seulement les routes /__setup/ ouvertes au relais (relay=True)
        et GET / HEAD / POST. Vrai si la requête a reçu sa réponse ici."""
        self.relay_device = None
        if not self._relay():
            if self._proxy_belt():
                self._json({'error': 'relais : le proxy doit garder l’en-tête Host'}, 403)
                return True
            return False
        if not RELAY.on:  # serveur du relais sans hôte public posé : jamais servi, ni comme relais ni comme poste
            self._json({'error': 'relais pas prêt'}, 503)
            return True
        if (self.headers.get('X-Forwarded-Proto') or '').lower() != 'https':
            self._json({'error': 'https seulement'}, 403)
            return True
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if path == '/__relay/pair':
            self._relay_pair()
            return True
        if path == '/__relay/whoami':  # vérification du démarrage (relay_probe) : la requête est bien arrivée en relais
            self._json({'relay': True})
            return True
        jar = http.cookies.SimpleCookie()
        try:
            jar.load(self.headers.get('Cookie') or '')
        except http.cookies.CookieError:
            pass
        name = device_access.RELAY_COOKIE
        dev = device_access.paired(jar[name].value if name in jar else '', 'relay')
        if not dev:
            if self.command == 'GET' and 'text/html' in (self.headers.get('Accept') or '') and not path.startswith('/__setup/'):
                self._relay_page(safe_next(self.path), 401)
            else:
                self._json({'error': 'appareil non appairé'}, 401)
            return True
        if self.command not in ('GET', 'HEAD', 'POST'):
            self._json({'error': 'méthode refusée'}, 405)
            return True
        if path.startswith('/__setup/') and not ROUTES.get((self.command, path), ('', 'poste', False))[2]:
            self._json({'error': 'réservé au poste'}, 403)
            return True
        self.relay_device = dev
        return False

    @route('GET', '/__relay/ivao/callback', public='lan', relay=True)
    def _ivao_callback(self, path=''):
        """Retour d'IVAO (?code&state), route déclarée de la table (R-C3 : un seul lieu ; ouverte au relais, donc au réseau
        local par la règle des routes, mais un appareil du réseau local n'a jamais de demande en cours : refusé ici) ; la
        navigation venue du site d'IVAO passe le contrôle d'origine par _ivao_return seulement. L'état doit être celui d'une
        demande de cet appareil (relais) ou du poste ; le code
        échangé avec le secret du relais ; les jetons remis une fois par le fragment de l'adresse du cadre
        (/frame/index.html#ivao-return?…, jamais envoyé au serveur ni dans un journal ; le cadre les range et remplace
        l'adresse aussitôt) ; une erreur : #ivao-return?error=… seulement."""
        if self._lan():
            return self._json({'error': 'réservé au poste'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        dev = getattr(self, 'relay_device', None) if self._relay() else None
        r = ivao_oauth_finish(q.get('state', [''])[0], q.get('code', [''])[0], q.get('error', [''])[0],
                              dev['id'] if dev else '', self._ivao_redirect())
        if r.get('ok'):
            frag = urllib.parse.urlencode({'access_token': r['access_token'], 'refresh_token': r.get('refresh_token', ''),
                                           'expires_at': r['expires_at'], 'scope': r.get('scope', '')})
        else:
            frag = urllib.parse.urlencode({'error': r.get('error', 'refused')[:60]})
        return self._frame_hop(frag)

    def _frame_hop(self, frag):
        """Vers le cadre (/frame/index.html#ivao-return?<frag>) par une page de cette origine, et non par une redirection : la
        chaîne de redirections venue d'IVAO garde « Sec-Fetch-Site: cross-site » jusqu'au bout, et la garde d'origine refusait
        alors la page du cadre elle-même (31 oct. 2026 : « ça finit par passer après 2 ou 3 essais », le rechargement étant
        de cette origine). Jamais en cache, sans référent."""
        body = frame_hop_page(frag)
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(body)
        return None

    def _ivao_redirect(self):
        """Adresse de retour déclarée chez IVAO : celle du relais (https, hôte public), sinon celle du poste."""
        return ivao_redirects(self.port)['relay' if self._relay() else 'poste']

    def _relay_page(self, nxt, code=200, msg=''):
        """Page d'appairage du relais (sans script : formulaire envoyé à /__relay/pair), dans la langue du navigateur."""
        lg = self._lan_lang()
        tx = {k: v[lg] for k, v in RELAY_TEXT.items()}
        e = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
        body = (f'<!doctype html><html lang="{lg}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<title>{e(tx["title"])}</title><body style="font:17px system-ui,sans-serif;margin:0;padding:24px 16px;max-width:30em">'
                f'<h1 style="font-size:1.3em">{e(tx["title"])}</h1><p>{e(tx["intro"])}</p>'
                + (f'<p role="alert" style="color:#b00020"><b>{e(msg)}</b></p>' if msg else '')
                + f'<form method="post" action="/__relay/pair"><input type="hidden" name="next" value="{e(nxt)}">'
                f'<label>{e(tx["code"])}<br><input name="code" inputmode="numeric" pattern="[0-9]{{8}}" maxlength="8" '
                f'autocomplete="one-time-code" required autofocus style="font-size:1.6em;letter-spacing:.2em;width:8em;margin:8px 0"></label><br>'
                f'<button type="submit" style="font-size:1.1em;padding:8px 20px">{e(tx["pair"])}</button></form>'
                f'<p style="color:#666;font-size:.9em">{e(tx["note"])}</p></body></html>').encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        # page publique du relais : jamais dans un cadre (code saisi sous une page piégée), ni script, ni formulaire ailleurs
        self._strict_csp = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(body)

    def _relay_pair(self):
        """/__relay/pair : GET la page ; POST le code saisi, de cette page seulement (même origine) — bon : jeton en cookie
        (HttpOnly, Secure, SameSite=Lax : un lien suivi arrive appairé ; les écritures exigent déjà la même origine),
        retour à la page demandée ; faux ou trop d'essais : la page avec le motif."""
        tx = {k: v[self._lan_lang()] for k, v in RELAY_TEXT.items()}
        if self.command != 'POST':
            return self._relay_page('/frame/')
        site, origin = self.headers.get('Sec-Fetch-Site'), self.headers.get('Origin')
        if not (site == 'same-origin' or (site is None and origin == RELAY.origin())):
            return self._relay_page('/frame/', 403, tx['origin'])
        try:
            size = min(int(self.headers.get('Content-Length') or 0), 2048)
        except ValueError:
            size = 0
        form = urllib.parse.parse_qs(self.rfile.read(size).decode('utf-8', 'replace') if size > 0 else '')
        nxt = safe_next((form.get('next') or ['/frame/'])[0])
        res, val, tri = device_access.attempt(self._client_ip(), (form.get('code') or [''])[0], self.headers.get('User-Agent') or '', 'relay')
        if res == 'ok':
            self.send_response(303)
            self.send_header('Set-Cookie', f'{device_access.RELAY_COOKIE}={val}; Path=/; Max-Age={device_access.MAX_AGE}; HttpOnly; Secure; SameSite=Lax')
            self.send_header('Location', nxt)
            self.send_header('Content-Length', '0')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            say(f'  Relais : appareil appairé pour {tri}.')
            return None
        if res == 'wait':
            return self._relay_page(nxt, 429, tx['wait'].format(s=val))
        if res == 'closed':
            say('  Relais : trop de codes faux en une heure, appairage fermé (un nouveau code sur le poste le rouvre).')
            return self._relay_page(nxt, 403, tx['closed'])
        if res == 'expired':
            return self._relay_page(nxt, 401, tx['expired'])
        return self._relay_page(nxt, 401, tx['bad'])

    def _lan_gate(self):
        """Appareil du réseau local : adresse privée et hôte exact exigés, appairage (cookie) exigé pour tout — page
        d'appairage pour une page demandée, 401 sinon —, puis seulement les routes /__setup/ de l'appli Pilote
        (tools/device_access.py). Vrai si la requête a reçu sa réponse ici."""
        if not self._lan():
            return False
        if not device_access.private(self.client_address[0]) or not self._local_host():
            self._json({'error': 'refusé'}, 403)
            return True
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if path == '/__lan/pair':
            self._lan_pair()
            return True
        jar = http.cookies.SimpleCookie()
        try:
            jar.load(self.headers.get('Cookie') or '')
        except http.cookies.CookieError:
            pass
        name = device_access.lan_cookie(self.port)
        token = jar[name].value if name in jar else ''
        if not device_access.paired(token, 'lan'):
            if self.command == 'GET' and 'text/html' in (self.headers.get('Accept') or '') and not path.startswith('/__setup/'):
                self._lan_page(safe_next(self.path), 401)
            else:
                self._json({'error': 'appareil non appairé'}, 401)
            return True
        # route /__setup/ ouverte à un appareil appairé : public 'lan' dans la table ROUTES (déclarée par @route) ; PUT : jamais
        if path.startswith('/__setup/') and ROUTES.get((self.command, path), ('', 'poste'))[1] != 'lan':
            self._json({'error': 'réservé au poste'}, 403)
            return True
        return False

    def _lan_lang(self):
        """Langue de la page d'appairage : la première des langues du navigateur que la suite connaît, sinon fr."""
        for part in (self.headers.get('Accept-Language') or '').split(','):
            code = part.split(';')[0].strip()[:2].lower()
            if code in LAN_TEXT['title']:
                return code
        return 'fr'

    def _lan_page(self, nxt, code=200, msg=''):
        """Page d'appairage (sans script : formulaire envoyé à /__lan/pair), dans la langue du navigateur."""
        lg = self._lan_lang()
        tx = {k: v[lg] for k, v in LAN_TEXT.items()}
        e = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
        body = (f'<!doctype html><html lang="{lg}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                f'<title>{e(tx["title"])}</title><body style="font:17px system-ui,sans-serif;margin:0;padding:24px 16px;max-width:30em">'
                f'<h1 style="font-size:1.3em">{e(tx["title"])}</h1><p>{e(tx["intro"].format(host=socket.gethostname()))}</p>'
                + (f'<p role="alert" style="color:#b00020"><b>{e(msg)}</b></p>' if msg else '')
                + f'<form method="post" action="/__lan/pair"><input type="hidden" name="next" value="{e(nxt)}">'
                f'<label>{e(tx["code"])}<br><input name="code" inputmode="numeric" pattern="[0-9]{{8}}" maxlength="8" '
                f'autocomplete="one-time-code" required autofocus style="font-size:1.6em;letter-spacing:.2em;width:9em;margin:8px 0"></label><br>'
                f'<button type="submit" style="font-size:1.1em;padding:8px 20px">{e(tx["pair"])}</button></form>'
                f'<p style="color:#666;font-size:.9em">{e(tx["note"])}</p></body></html>').encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def _lan_pair(self):
        """/__lan/pair : GET la page ; POST le code saisi, de cette page seulement (même origine : sinon un site tiers lie
        l'appareil avec son propre code) — bon : jeton en cookie, retour à la page demandée ; faux ou trop d'essais : la
        page avec le motif."""
        tx = {k: v[self._lan_lang()] for k, v in LAN_TEXT.items()}
        if self.command != 'POST':
            return self._lan_page('/frame/')
        site, origin = self.headers.get('Sec-Fetch-Site'), self.headers.get('Origin')
        if not (site == 'same-origin' or (site is None and origin == f'http://{self.headers.get("Host") or ""}')):
            return self._lan_page('/frame/', 403, tx['origin'])
        try:
            size = min(int(self.headers.get('Content-Length') or 0), 2048)
        except ValueError:
            size = 0
        form = urllib.parse.parse_qs(self.rfile.read(size).decode('utf-8', 'replace') if size > 0 else '')
        nxt = safe_next((form.get('next') or ['/frame/'])[0])
        res, val, _ = device_access.attempt(self.client_address[0], (form.get('code') or [''])[0], self.headers.get('User-Agent') or '', 'lan')
        if res == 'ok':
            self.send_response(303)
            self.send_header('Set-Cookie', f'{device_access.lan_cookie(self.port)}={val}; Path=/; Max-Age={device_access.MAX_AGE}; HttpOnly; SameSite=Strict')
            self.send_header('Location', nxt)
            self.send_header('Content-Length', '0')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            say(f'  Réseau local : appareil appairé ({self.client_address[0]}).')
            return None
        if res == 'wait':
            return self._lan_page(nxt, 429, tx['wait'].format(s=val))
        if res == 'closed':
            say('  Réseau local : trop de codes faux en une heure, appairage fermé (« Nouveau code » sur le poste pour le rouvrir).')
            return self._lan_page(nxt, 403, tx['closed'])
        if res == 'expired':
            return self._lan_page(nxt, 401, tx['expired'])
        return self._lan_page(nxt, 401, tx['bad'])

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
        if self._ivao_return(path):
            return ''
        if not self._same_origin() and not self._relaxed_navigation(path):
            return self._ivao_refusal(path)
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

    def _ivao_return(self, path):
        """Le retour d'IVAO, navigation venue du site d'IVAO donc d'un autre site : servi malgré le contrôle d'origine
        seulement s'il est bien ce retour. Par le relais : ce chemin en GET (l'appareil est appairé, sa porte l'a vérifié ;
        l'état est vérifié au retour). Sur le poste (R1b, essai sans relais) : ce chemin en GET, document de premier plan
        (Sec-Fetch-Dest document, Sec-Fetch-Mode navigate), et l'état d'une demande en cours du poste avec son adresse de
        retour. Jamais pour le réseau local. Rien d'autre n'est ouvert."""
        if path != IVAO_CALLBACK or self.command != 'GET' or self._lan():
            return False
        if self._relay():
            return True
        if self.headers.get('Sec-Fetch-Dest') != 'document' or self.headers.get('Sec-Fetch-Mode') != 'navigate':
            return False
        state = (urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('state') or [''])[0]
        return ivao_state_open(state, '', self._ivao_redirect())

    def _ivao_refusal(self, path):
        """Retour d'IVAO refusé par la garde d'origine : la raison dite au journal du lanceur (en-têtes de navigation, état
        inconnu, expiré ou d'une autre adresse de retour ; jamais l'état lui-même) ; un retour en navigation de premier plan
        dont l'état ne correspond pas va à l'erreur du cadre (« recommencez la connexion », aucun jeton, aucun code
        échangé) ; sinon, et pour tout autre chemin, refusé comme venu d'un autre site."""
        if path != IVAO_CALLBACK:
            return 'autre site'
        hd = {k: self.headers.get(f'Sec-Fetch-{k}') or '-' for k in ('Site', 'Mode', 'Dest')}
        state = (urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('state') or [''])[0]
        why = ivao_state_why(state, '', self._ivao_redirect())
        say(f'  Retour IVAO refusé : {self.command} Site={hd["Site"]} Mode={hd["Mode"]} Dest={hd["Dest"]} état={why or "en cours"}')
        if self.command == 'GET' and hd['Mode'] == 'navigate' and why and not self._lan():
            return 'ivao-state'
        return 'autre site'

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
        if why == 'ivao-state':
            return self._frame_hop(urllib.parse.urlencode({'error': 'state'}))
        if why == 'autre site' and self.headers.get('Sec-Fetch-Mode') == 'navigate':
            # lien suivi depuis un autre site (messagerie web, forum…) : explication et lien vers l'accueil seulement,
            # jamais vers l'adresse demandée (ses paramètres viennent de l'autre site)
            body = ('<!doctype html><meta charset="utf-8"><title>SOG</title><body style="font:16px system-ui;margin:3em">'
                    '<p>Page de la suite ouverte depuis un autre site : refusée, pour que ce site ne puisse rien lire ni '
                    'déclencher.<br><i>Suite page opened from another website: refused.</i></p>'
                    '<p><a href="/frame/">Ouvrir l’appli Pilote (V3) · Open the Pilot app (V3)</a></p>').encode('utf-8')
            self.send_response(403)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
            return None
        return self._json({'error': 'refusé'}, 403)

    def do_PUT(self):
        """PUT /__setup/lnmperf-folder et /__setup/lnmperf (fiches Little Navmap) : mêmes contrôles qu'un POST ; toute
        autre route refuse la méthode."""
        return self.do_POST()

    def _lnmperf(self, body):
        """Dossier des fiches Little Navmap de ce poste (V3 aerodb, frame/aerodb/lnmperf.js) :
        · GET / PUT /__setup/lnmperf-folder : { folder, exists, suggestions } ; PUT { folder } (dossier existant, hors du
          dossier de données ; vide : réglage retiré), gardé dans tools/.lnmperf.json (local, jamais versionné) ;
        · GET /__setup/lnmperf : { folder, files: [{ name, size, mtime, sha }] } (*.lnmperf du dossier, sans sous-dossier) ;
        · GET /__setup/lnmperf?name=… : { name, text, size, mtime, sha } ;
        · PUT /__setup/lnmperf?name=… (texte) : fichier écrit d'un coup (temporaire puis remplacement) → { name, size, mtime,
          sha } ;
        · POST /__setup/lnmperf?name=…&action=retire : fichier rangé dans _removed/ du dossier (jamais effacé).
        Dossier non réglé ou absent : 409. Noms : un nom de fichier .lnmperf seul, sans chemin."""
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == '/__setup/lnmperf-folder':
            if self.command == 'GET':
                f = _read_json(LNMPERF_STATE).get('folder') or ''
                return self._json({'folder': f, 'exists': bool(f) and os.path.isdir(f), 'suggestions': lnmperf_suggestions()})
            if self.command != 'PUT':
                return self._json({'error': 'méthode refusée'}, 405)
            try:
                folder = str((json.loads(body or b'{}') or {}).get('folder') or '').strip()
            except (ValueError, AttributeError):
                return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
            if folder:
                folder = os.path.abspath(os.path.expanduser(folder))
                if not os.path.isdir(folder):
                    return self._json({'ok': False, 'error': 'absent', 'message': 'Dossier absent.'}, 400)
                data = os.path.normcase(os.path.realpath(DATA))
                real = os.path.normcase(os.path.realpath(folder))
                if real == data or real.startswith(data + os.sep):
                    return self._json({'ok': False, 'error': 'data', 'message': 'Dossier de données refusé.'}, 400)
            _write_json(LNMPERF_STATE, {'folder': folder})
            return self._json({'ok': True, 'folder': folder})
        folder = lnmperf_folder()
        if not folder:
            return self._json({'error': 'dossier non réglé', 'folder': ''}, 409)
        name = (q.get('name') or [''])[0]
        if self.command == 'GET' and not name:
            files = [lnmperf_entry(os.path.join(folder, n)) for n in sorted(os.listdir(folder))
                     if LNMPERF_NAME.match(n) and os.path.isfile(os.path.join(folder, n))]
            return self._json({'folder': folder, 'files': files})
        if not LNMPERF_NAME.match(name or ''):
            return self._json({'error': 'nom refusé'}, 400)
        path = os.path.join(folder, name)
        if self.command == 'GET':
            if not os.path.isfile(path):
                return self._json({'error': 'fichier absent'}, 404)
            e = lnmperf_entry(path)
            with open(path, 'rb') as f:
                e['text'] = f.read().decode('utf-8', 'replace')
            return self._json(e)
        if self.command == 'PUT':
            tmp = path + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(body)
            os.replace(tmp, path)
            return self._json(lnmperf_entry(path))
        if (q.get('action') or [''])[0] == 'retire':
            if not os.path.isfile(path):
                return self._json({'ok': True, 'moved': ''})
            out = os.path.join(folder, '_removed')
            os.makedirs(out, exist_ok=True)
            dest = os.path.join(out, name)
            if os.path.exists(dest):
                dest = os.path.join(out, f'{name[:-8]}_{time.strftime("%Y%m%d-%H%M%S")}.lnmperf')
            shutil.move(path, dest)
            return self._json({'ok': True, 'moved': '_removed/' + os.path.basename(dest)})
        return self._json({'error': 'inconnu'}, 404)

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
        # page servie avec sa propre politique (appairage du relais) : jamais encadrée, jamais en cache ; une seule
        # requête (pop : la connexion gardée ouverte sert la suivante avec les en-têtes communs)
        strict = self.__dict__.pop('_strict_csp', '')
        # rien d'ici n'est utilisable par une autre origine : ni encadré (« Synchroniser » cliqué à l'insu du pilote),
        # ni chargé comme script ou image par un autre site (en plus du contrôle Sec-Fetch-Site)
        self.send_header('X-Frame-Options', 'DENY' if strict else 'SAMEORIGIN')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        # requête illisible (TLS sur le port HTTP, version inconnue) : send_error passe par ici avant que path existe
        raw = getattr(self, 'path', '') or ''
        path = raw.split('?', 1)[0].lower()
        sandbox = path.startswith('/data/') and path.endswith(SANDBOXED)
        self.send_header('Content-Security-Policy', strict or ("sandbox; " if sandbox else '') + csp_policy())
        # fichier versionné par son empreinte (?v=…, tools/bump_versions.py : elle change avec le contenu) : gardé tel
        # quel, sans revalidation — une quarantaine d'allers-retours de moins par page, qui retardaient la fin de
        # l'analyse et laissaient voir la page à moitié construite ; le reste (pages, données) : revalidé à chaque fois,
        # jamais de script périmé (ni de type) en cache
        versioned = re.search(r'[?&]v=[0-9a-f]{6,}', raw)
        self.send_header('Cache-Control', 'no-store' if strict else 'public, max-age=31536000, immutable' if versioned else 'no-cache')
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
        if self._lan_gate() or self._relay_gate():
            return None
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
        if self._lan_gate() or self._relay_gate():
            return None
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
        if self.path.split('?')[0] in ROUTE_PATHS:  # routes /__setup/ (table ROUTES : gestionnaire, public)
            r = ROUTES.get(('GET', self.path.split('?')[0]))
            if r:
                return getattr(self, r[0])(self.path.split('?')[0])
            return self._json({'error': 'méthode refusée'}, 405)
        if self._stamped():
            return None
        return super().do_GET()

    def do_POST(self):
        """POST /__setup/… (page servie ici seulement) : synchronisation, secrets, imports, jeu d'essai, clone et dépôt
        des données."""
        if self._lan_gate() or self._relay_gate():
            return None
        path = self.path.split('?')[0]
        if not path.startswith('/__setup/') or not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        try:
            size = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            return self._json({'error': 'taille invalide'}, 400)
        if size < 0 or size > (LAN_MAX_BODY if self._lan() else self.MAX_UPLOAD):
            return self._json({'error': 'fichier trop gros'}, 413)
        body = self.rfile.read(size) if size else b''
        if path in LNMPERF_ROUTES:
            return self._lnmperf(body)
        if self.command != 'POST':
            return self._json({'error': 'méthode refusée'}, 405)
        r = ROUTES.get(('POST', path))  # routes /__setup/ (table ROUTES : gestionnaire, public)
        if r:
            return getattr(self, r[0])(path, body)
        return self._json({'error': 'inconnu'}, 404)

    # ---------------------------------------------------------------- routes /__setup/ (table ROUTES)
    @route('GET', '/__setup/lnmperf-folder', '/__setup/lnmperf', public='lan')
    def _get_lnmperf_folder(self, path):
        return self._lnmperf(b'')

    @route('GET', '/__setup/regen/state', '/__setup/regen/job', '/__setup/regen/verbs', public='poste')
    def _get_regen_state(self, path):
        # module Données (frame/INTEGRATION.md § 15) : état du poste, travail en cours ou id, verbes chargés — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        if path.endswith('/verbs'):  # « jeu/verbe » de chaque travail chargé : la page grise d'avance ce que ce lanceur ignore
            return self._json({'verbs': sorted(f'{a}/{b}' for a, b in regen().registry)})
        if self.path.split('?')[0].endswith('/state'):
            return self._json(regen_jobs.state(DATA, SECRETS, *regen_git()))
        jid = (urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('id') or [''])[0][:40]
        v = regen().view(jid or None)
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('GET', '/__setup/status', public='lan', relay=True)
    def _get_status(self, path):
        # détection du lanceur (frame/store/transport_launcher.js) : la même forme partout, rien de propre au poste ;
        # un appareil appairé du réseau local la lit aussi (lnm : [] pour lui, les bases de Little Navmap sont du poste)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'server': True, 'data': has_data(), 'dataGit': os.path.isdir(os.path.join(DATA, '.git')),
                           'host': socket.gethostname(), 'lan': self._lan(), 'lnm': [] if self._lan() else lnm_db_kinds()})

    @route('GET', '/__setup/workstation', public='poste')
    def _get_workstation(self, path):
        # réglages du poste pour ses propres pages (V2 : premier lancement, Paramètres, cadre de page) : chemin
        # d'installation, git, dépôt distant de data/, Git LFS, politique, navigation détendue — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'server': True, 'root': ROOT, 'git': bool(data_sync.git_exe()), 'data': has_data(),
                           'dataGit': os.path.isdir(os.path.join(DATA, '.git')), 'dataRepo': data_repo_url(), 'lfs': LFS,
                           'csp': True, 'relaxNav': RELAX['nav'], 'host': socket.gethostname()})

    @route('GET', '/__setup/routes', public='poste')
    def _get_routes(self, path):
        # la table des routes du lanceur (R-C4 : une seule liste) : le cadre y vérifie celles qu'un écran déclare, la noreg
        # (I10) ses règles — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'routes': route_table()})

    @route('GET', '/__setup/update', public='poste')
    def _get_update(self, path):
        # « Mise à jour de la suite » (A3) : le plan du canal demandé (?channel=stable|early|suivi), fetch compris, rien de
        # changé — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        ch = (urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('channel') or [''])[0]
        return self._json({**suite_update.plan(ROOT, ch), 'channels': list(suite_update.CHANNELS), 'devBranch': suite_update.DEV_BRANCH})

    @route('POST', '/__setup/update', public='poste')
    def _post_update(self, path, body):
        # la mise à jour du canal { channel } : plan refait, puis extraction de l'étiquette ou avance rapide ; le lanceur en
        # cours n'est pas relancé (dit) ; le dépôt des données jamais touché
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        ch = str(a.get('channel') or '') if isinstance(a, dict) else ''
        if ch not in suite_update.CHANNELS:
            return self._json({'ok': False, 'reason': 'unknown-channel', 'message': 'canal inconnu'}, 400)
        want = update_target(a)
        if want is None:
            return self._json({'ok': False, 'reason': 'bad-target', 'message': 'cible illisible'}, 400)
        r = update_suite(ch, want)
        if r.get('done'):
            say(f'  Suite mise à jour ({ch}) : {r["current"].get("version", "")} — relancez le lanceur.')
        return self._json(r)

    @route('GET', '/__setup/folders', public='poste')
    def _get_folders(self, path):
        # carte « Dossiers » : les dossiers que le lanceur connaît (chemins en lecture seule) — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'folders': folders()})

    @route('POST', '/__setup/folders/open', public='poste')
    def _post_folders_open(self, path, body):
        # « Ouvrir » : l'identifiant d'un dossier connu, jamais un chemin de la page ; ouvert dans l'explorateur de ce poste
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        fid = str(a.get('id') or '') if isinstance(a, dict) else ''
        row = next((f for f in folders() if f['id'] == fid), None)
        if not row:
            return self._json({'ok': False, 'message': 'dossier inconnu'}, 400)
        if not row['exists']:
            return self._json({'ok': False, 'message': 'dossier absent de ce poste'}, 409)
        try:
            FOLDER_OPEN(row['path'])
        except OSError as e:
            return self._json({'ok': False, 'message': f'ouverture impossible ({type(e).__name__})'}, 500)
        return self._json({'ok': True})

    @route('GET', '/__setup/lan', public='poste')
    def _get_lan(self, path):
        # accès des appareils du réseau local (Réglages du poste) : état, adresses, code — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        return self._json(lan_state())

    @route('GET', '/__setup/changes', public='lan', relay=True)
    def _get_changes(self, path):
        # V3 frame : tête de data/ et, si elle a changé depuis since, son arbre (transport « lanceur »)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        since = (urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('since') or [''])[0]
        with FRAME_LOCK:
            # appareil du réseau local : l'arbre calculé il y a moins de 2 s sert de nouveau (un lot l'efface)
            fresh = self._lan() and _tree_memo['v'] and time.monotonic() - _tree_memo['at'] < 2
            if fresh:
                head, tree = _tree_memo['v']
            else:
                head, tree = frame_tree()
                _tree_memo.update(at=time.monotonic(), v=(head, tree))
        return self._json({'head': head, 'same': True} if since == head else {'head': head, 'tree': tree})

    @route('GET', '/__setup/mission-folders', public='poste')
    def _get_mission_folders(self, path):
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

    @route('GET', '/__setup/data-list', public='poste')
    def _get_data_list(self, path):
        # fichiers d'un dossier de données de la liste DATA_LISTS (demandes d'accès des postes, comptes signés) :
        # noms seulement, le contenu se lit comme tout fichier de data/
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        return self._json(data_list(q.get('dir', [''])[0]))

    @route('GET', '/__setup/registre-historique', public='poste')
    def _get_registre_historique(self, path):
        # versions du registre signé des utilisateurs dans l'historique git des données (comptes signés : poste
        # resté hors ligne, refondation) ; contenus seulement, rien n'est vérifié ici (les pages vérifient)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json(registry_history())

    @route('GET', '/__setup/sites', public='poste')
    def _get_sites(self, path):
        # sites que les pages peuvent contacter (connect-src) : liste fixe, configuration, sites autorisés ici
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json(sites_view())

    @route('GET', '/__setup/sync-remote', public='poste')
    def _get_sync_remote(self, path):
        # dépôt git de synchronisation de data/ : adresse actuelle (ou celle du clone par défaut)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        # state : 'absent' (rien : clone), 'plain' (des fichiers sans dépôt : reprise, POST /__setup/adopt), 'repo'
        state = data_sync.data_state(DATA)
        return self._json({**data_sync.remote_info(DATA), 'default': data_repo_url(), 'state': state,
                           'rewritten': state == 'repo' and data_sync.rewritten(DATA)})

    @route('GET', '/__setup/sync-rewritten', public='poste')
    def _get_sync_rewritten(self, path):
        # historique du dépôt des données réécrit : le plan de la reprise (récupéré du dépôt distant, rien changé) — ce poste
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        with SYNC_LOCK:
            return self._json(data_sync.rewritten_plan(DATA))

    @route('POST', '/__setup/sync-rewritten', public='poste')
    def _post_sync_rewritten(self, path, body):
        # « Reprendre le nouvel historique » (geste de l'administrateur, ce poste) : reprise, puis un passage de
        # synchronisation (réception du nouvel historique fiche par fiche, envoi)
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        a = a if isinstance(a, dict) else {}
        author = str(a.get('author') or '').upper()
        with SYNC_LOCK:
            r = data_sync.rewritten_resume(DATA, author, str(a.get('name') or '')[:60])
            if r.get('ok'):
                registry_bridge()
                r['sync'] = data_sync.run(DATA, author, str(a.get('name') or '')[:60], True)
        sync_status_reset()
        if r.get('sync', {}).get('received'):
            with INDEX_LOCK:
                index_availability()
                index_users()
        return self._json(r)

    @route('GET', '/__setup/sync-status', public='poste')
    def _get_sync_status(self, path):
        # synchronisation git du pool (tools/data_sync.py) : état pour le bouton de l'en-tête ; ?fetch=1 : relu
        # sur le dépôt distant (commits à recevoir)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json(sync_status(fetch='fetch=1' in self.path, fresh='fresh=1' in self.path))

    @route('GET', '/__setup/tools', public='poste')
    def _get_tools(self, path):
        # outils de tools/ (sommaire tools/index.html) : nom, sorte, titre et en-tête de chaque fichier
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'tools': tools_inventory()})

    @route('GET', '/__setup/vatsim-bookings', public='poste')
    def _get_vatsim_bookings(self, path):
        # réservations ATC publiques de VATSIM (Planning ODV, shared/atc_sessions.js) : l'API ne permet pas la
        # lecture directe depuis une page (pas d'en-tête CORS) ; relayées ici
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json(vatsim_bookings())

    @route('GET', '/__setup/ivao/oauth', public='lan', relay=True)
    def _get_ivao_oauth(self, path):
        # application IVAO réglée sur ce lanceur (le poste ou le relais) ? La carte « Compte IVAO » éteint son bouton sinon ;
        # aucun secret, seulement sa présence
        return self._json({'app': bool(ivao_oauth_cfg()), 'relay': self._relay()})

    @route('POST', '/__setup/ivao/oauth/start', '/__setup/ivao/oauth/revoke', public='lan', relay=True)
    def _post_ivao_oauth(self, path, body):
        # OpenID d'IVAO par le relais (R1b) : start → l'adresse d'autorisation (PKCE S256, état lié à cet appareil) ;
        # revoke { token } → révoqué chez IVAO (Délier) ; aucun jeton journalisé. Le renouvellement (refresh) reviendra avec
        # le lecteur du tracker qui en aura besoin (R-C3 : sans lecteur, retiré)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        dev = getattr(self, 'relay_device', None) if self._relay() else None
        if path.endswith('/revoke'):
            v = ivao_oauth_revoke(a.get('token'))
        else:
            v = ivao_oauth_start(dev['id'] if dev else '', self._ivao_redirect())
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('GET', '/__setup/devices', public='poste')
    def _get_devices(self, path):
        # appareils appairés des deux canaux (R-C2) : la liste (canal, trigramme, appareil, dates ; jamais une empreinte), les
        # codes en cours (sans leur valeur), l'état du réseau local et du relais — ce poste seulement
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        return self._json({'devices': device_access.listing(), 'pending': device_access.pending(), 'lan': lan_state(),
                           'relay': {'on': RELAY.on, 'host': RELAY.host}})

    @route('POST', '/__setup/devices', '/__setup/devices/revoke', '/__setup/devices/name', public='poste')
    def _post_devices(self, path, body):
        # un code d'appairage pour un pilote (8 chiffres, 10 minutes, une fois, les deux canaux), la révocation d'un appareil,
        # d'un pilote ou d'un canal, ou le trigramme posé sur un appareil appairé par un code de console
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        if path.endswith('/revoke'):
            ch = str(a.get('channel') or '')
            if ch and ch not in device_access.CHANNELS:
                return self._json({'ok': False, 'message': 'canal inconnu'}, 400)
            n = device_access.forget(device_id=str(a.get('id') or '') or None, trigram=str(a.get('trigram') or '') or None,
                                     channel=ch or None, every=a.get('all') is True)
            return self._json({'ok': True, 'removed': n})
        if path.endswith('/name'):
            if not device_access.name(str(a.get('id') or ''), a.get('trigram')):
                return self._json({'ok': False, 'message': 'trigramme attendu, appareil sans trigramme'}, 400)
            return self._json({'ok': True})
        code = device_access.new_code(a.get('trigram'))
        if not code:
            return self._json({'ok': False, 'message': 'trigramme attendu (2 à 5 lettres ou chiffres)'}, 400)
        return self._json({'ok': True, 'code': code, 'trigram': str(a.get('trigram')).upper(), 'expires_in': device_access.CODE_TTL})

    @route('GET', '/__setup/gitlab/tokens', public='poste')
    def _get_gitlab_tokens(self, path):
        # jetons d'accès du projet GitLab (application Maintenance, « Jetons des pilotes ») : noms, portées, dates, jamais une valeur
        if not self._allowed() or self._lan():
            return self._json({'error': 'refusé'}, 403)
        v = gitlab_tokens()
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('POST', '/__setup/gitlab/tokens', '/__setup/gitlab/tokens/revoke', public='poste')
    def _post_gitlab_tokens(self, path, body):
        # création (la valeur rendue une fois) ou révocation d'un jeton de pilote, avec le jeton de l'administrateur du lanceur
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        v = gitlab_token_revoke(a) if path.endswith('/revoke') else gitlab_token_create(a)
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('GET', '/__setup/secrets', public='poste')
    def _get_secrets(self, path):
        # clés et identifiants des services externes (Paramètres : Installation pour la suite, Mon profil pour un
        # utilisateur) : indicateurs seulement (enregistré, 4 derniers caractères), jamais les valeurs secrètes
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        view = secrets_view(q.get('tri', [''])[0])
        # adresses de retour à déclarer chez IVAO pour l'application OpenID (assistant des Réglages) : celle de ce poste,
        # et celle du relais de la compagnie quand son hôte public est réglé ; adresses publiques, aucun secret
        r = ivao_redirects(self.port)
        view['ivaoRedirects'] = [r['poste']] + ([r['relay']] if r['relay'] else [])
        return self._json(view)

    @route('GET', '/__setup/secrets/test', public='poste')
    def _get_secrets_test(self, path):
        # « Tester » d'une carte de Paramètres › Installation › Clés et services externes : un appel de contrôle au
        # service avec la clé enregistrée ; { ok, count } ou { ok: false, key: missing | refused, error }
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        return self._json(secrets_test(q.get('service', [''])[0]))

    @route('GET', '/__setup/ivao-activations', public='poste')
    def _get_ivao_activations(self, path):
        # zones spéciales IVAO activées (Ordres de vols, shared/odv_airspace.js) : NOTAM de la division liés à une
        # zone et horaires publiés des zones de France ; clé d'API locale (ivao_key), jamais transmise à la page
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        return self._json(ivao_activations(q.get('from', [''])[0], q.get('to', [''])[0]))

    @route('GET', '/__setup/defa-site', public='poste')
    def _get_defa_site(self, path):
        # état de la mise à jour de la flotte et du journal DEFA depuis le site (Paramètres › Maintenance)
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json(defa_state())

    @route('GET', '/__setup/ivao/last-flight', '/__setup/vatsim/last-flight', public='poste')
    def _get_ivao_last_flight(self, path):
        # dernier vol du pilote pour le CR (« Mon dernier vol IVAO / VATSIM ») : liste des vols des 7 derniers jours,
        # ou détail d'un vol (session / connection) au format du collage du tracker ; clé IVAO jamais transmise
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        arg = lambda k: (q.get(k) or [''])[0].strip()
        if 'ivao' in self.path.split('?')[0]:
            return self._json(ivao_last_flight(arg('vid'), arg('session')))
        return self._json(vatsim_last_flight(arg('cid'), arg('connection')))

    @route('GET', '/__setup/sim/position', public='lan')
    def _get_sim_position(self, path):
        # V3 frame, position réelle : simulateur de ce poste (X-Plane 12 puis Little Navmap, boucle locale seulement,
        # un passage par seconde au plus) ; 204 sans simulateur
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        fix = sim_position.position()
        if fix:
            return self._json(fix)
        self.send_response(204)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        return None

    @route('GET', '/__setup/ivao-bookings', public='poste')
    def _get_ivao_bookings(self, path):
        # réservations ATC d'IVAO (trainings, examens, réservations ; shared/atc_sessions.js) : API sous clé
        # (ivao_key), jamais transmise à la page
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        return self._json(ivao_bookings(q.get('from', [''])[0], q.get('to', [''])[0], q.get('pre', ['LF'])[0]))

    @route('GET', '/__setup/aircraft-db', public='poste')
    def _get_aircraft_db(self, path):
        if not self._allowed():
            return self._json({'error': 'refusé'}, 403)
        return self._json({**AIRCRAFT, **aircraft_files()})

    @route('GET', '/__setup/downloads', public='poste')
    def _get_downloads(self, path):
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

    @route('GET', '/__setup/sia-zip', public='poste')
    def _get_sia_zip(self, path):
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

    @route('POST', '/__setup/perf', public='poste')
    def _post_perf(self, path, body):
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

    @route('POST', '/__setup/sync-remote', public='poste')
    def _post_sync_remote(self, path, body):
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

    @route('POST', '/__setup/net', public='lan', relay=True)
    def _post_net(self, path, body):
        # V3 frame : appel sortant d'un module relayé (SimBrief, IVAO, VATSIM)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'error': 'JSON invalide'}, 400)
        code, hdrs, out = frame_net(a if isinstance(a, dict) else {}, site_ok=not self._relay())
        self.send_response(code)
        for k, v in hdrs.items():
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(out)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-SOG-Relay', '1')
        self.end_headers()
        self.wfile.write(out)
        return None

    @route('POST', '/__setup/batch', public='lan', relay=True)
    def _post_batch(self, path, body):
        # V3 frame : lot d'écritures de la couche de données, en une fois (frame/store/transport_launcher.js)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        if self._relay() and getattr(self, 'relay_device', None):
            a['author'] = self.relay_device['trigram']  # relais : l'auteur est celui du jeton de l'appareil, jamais de la page
        r, code = frame_batch(a)
        return self._json(r, code)

    @route('POST', '/__setup/sync', public='lan', relay=True)
    def _post_sync(self, path, body):
        # un passage de synchronisation (commit au nom du trigramme, fusion fiche par fiche, envoi), un à la fois
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        with SYNC_LOCK:
            # pont du registre avant (le registre rejoué part dans ce passage) et après (comptes rendus reçus : le
            # registre rejoué partira au passage suivant)
            registry_bridge()
            # gesture : bouton « Synchroniser » (sia/base commitée aussi) ; sinon passage de fond (échange du cadre)
            if self._relay() and getattr(self, 'relay_device', None) and isinstance(a, dict):
                a['author'] = self.relay_device['trigram']  # relais : l'auteur du jeton de l'appareil
            r = data_sync.run(DATA, str(a.get('author') or '').upper(), str(a.get('name') or '')[:60], sync_gesture(a))
            if r.get('received'):
                registry_bridge()
        if (self._lan() or self._relay()) and not r.get('ok'):
            # appareil appairé du réseau local ou du relais : rien du poste (sortie de git, chemins) ; le détail reste dans la console
            say(f"  Synchronisation demandée par un appareil appairé, en échec : {r.get('message', '')}")
            r = {**r, 'message': 'Synchronisation interrompue sur le poste du lanceur : le détail est dans sa console.'}
        sync_status_reset()  # état relu au prochain appel : le bouton reflète le passage qui vient d'avoir lieu
        if r.get('received'):
            with INDEX_LOCK:
                index_availability()
                index_users()
        return self._json(r)

    @route('POST', '/__setup/aircraft-db', public='poste')
    def _post_aircraft_db(self, path, body):
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        return self._json({'started': aircraft_start(a.get('codes') or [], bool(a.get('quick'))), **AIRCRAFT, **aircraft_files()})

    @route('POST', '/__setup/lan', public='poste')
    def _post_lan(self, path, body):
        # ouvrir ou fermer l'accès du réseau local, oublier les appareils appairés — ce poste seulement
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        if a.get('open') is True and RELAY.on:
            # relais de la compagnie : le poste n'écoute que sur 127.0.0.1, jamais aussi sur le réseau local
            return self._json({'error': 'relais : réseau local fermé'}, 409)
        if a.get('open') is True:
            lan_open(bool(a.get('all')))
        elif a.get('open') is False:
            lan_close()
        if a.get('code') and LAN['servers']:
            say(f'  Réseau local : nouveau code d’appairage : {device_access.console_code()} (10 minutes)')
        return self._json(lan_state())

    @route('POST', '/__setup/vfr-import', public='poste')
    def _post_vfr_import(self, path, body):
        # compilation VFR (vfr-compiled.json choisi sur la page) : { apply, author, compiled } ; contrôle strict,
        # plan rendu sans rien écrire (apply faux), puis écriture de sia/vfr/, commit et synchronisation
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'errors': ['JSON illisible.'], 'summary': {}})
        try:
            return self._json(vfr_publish(a.get('compiled'), str(a.get('author') or '').upper(), bool(a.get('apply'))))
        except (OSError, RuntimeError) as e:
            return self._json({'ok': False, 'errors': [str(e)[-600:]], 'summary': {}})

    @route('POST', '/__setup/aircraft-publish', public='poste')
    def _post_aircraft_publish(self, path, body):
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        try:
            return self._json(aircraft_publish(str(a.get('author') or '').upper(), bool(a.get('apply'))))
        except (OSError, RuntimeError) as e:
            return self._json({'ok': False, 'remove': [], 'copy': [], 'message': str(e)[-600:]})

    @route('POST', '/__setup/defa-site', public='poste')
    def _post_defa_site(self, path, body):
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

    @route('POST', '/__setup/secrets', public='poste')
    def _post_secrets(self, path, body):
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        return self._json(secrets_save(a))

    @route('POST', '/__setup/relax', public='poste')
    def _post_relax(self, path, body):
        # débrayage de l'ouverture depuis un autre site ou une extension : activé après confirmation dans la fenêtre du
        # lanceur, jusqu'à sa fermeture ; rétabli sans confirmation
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        return self._json(relax_set(bool(a.get('on'))))

    @route('POST', '/__setup/site-allow', '/__setup/site-remove', public='poste')
    def _post_site_allow(self, path, body):
        # site ajouté à la CSP (connect-src) : confirmé dans la fenêtre du lanceur, qu'aucune page ne peut voir ni
        # valider ; retiré : sans confirmation (la liste ne fait que rétrécir)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        return self._json(site_allow(str(a.get('url') or '')) if path.endswith('allow') else site_remove(str(a.get('url') or '')))

    @route('POST', '/__setup/regen/job', '/__setup/regen/job/cancel', public='poste')
    def _post_regen_job(self, path, body):
        # travaux du module Données : jeu et verbe d'une liste fixe, arguments contrôlés (tools/regen_jobs.py)
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        v = regen().cancel(str(a.get('id') or '')[:40]) if path.endswith('/cancel') else regen().start(
            a.get('set'), a.get('verb'), a.get('args'), a.get('author') or '')
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('POST', '/__setup/regen/job/claim', public='poste')
    def _post_regen_job_claim(self, path, body):
        # jeton du travail en cours remis UNE fois à sa page sans fenêtre (ouverte sur l'adresse http du lanceur avec #job=<id>,
        # sans jeton : Sec-Fetch-Site none), après job.offer() du verbe ; ce poste seulement, rien d'autre ouvert
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        v = regen().claim((a if isinstance(a, dict) else {}).get('job'))
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('POST', '/__setup/regen/job/put', public='poste')
    def _post_regen_job_put(self, path, body):
        # sortie d'une zone rendue par la page sans fenêtre du travail en cours (construction de la base, D5) : jeton du
        # travail, zone de ses arguments, noms et taille bornés ; rien n'est écrit ici (le verbe la reçoit par job.take)
        if self._lan():
            return self._json({'error': 'refusé'}, 403)
        if len(body) > regen_jobs.PUT_MAX + 1024 * 1024:
            return self._json({'ok': False, 'status': 413, 'message': 'too large'}, 413)
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            return self._json({'ok': False, 'message': 'JSON invalide'}, 400)
        a = a if isinstance(a, dict) else {}
        v = regen().put(a.get('job'), a.get('token'), a.get('zone'), a.get('files'))
        return self._json(v, v.get('status', 200) if v.get('ok') is False else 200)

    @route('POST', '/__setup/aero-fetch', public='poste')
    def _post_aero_fetch(self, path, body):
        # données aéronautiques d'autres pays (tools/aero_fetch.py) : téléchargées dans data/sia/<source>/
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        args = [str(x)[:12] for x in (a.get('args') or [])][:40]
        with AERO_LOCK:
            return self._json(fresh(aero_fetch).fetch(DATA, str(a.get('provider') or ''), args))

    @route('POST', '/__setup/jeu-essai', public='poste')
    def _post_jeu_essai(self, path, body):
        ok, log = sample_data()
        if ok:
            mark_instance()  # data/ vient d'être créé : ses repères
            with INDEX_LOCK:
                index_availability()
                index_users()
        return self._json({'ok': ok, 'message': log})

    @route('POST', '/__setup/clone', public='poste')
    def _post_clone(self, path, body):
        try:
            a = json.loads(body or b'{}')
        except ValueError:
            a = {}
        ok, log = clone((a.get('user') or '').strip(), a.get('secret') or '', bool(a.get('remember')), a.get('url'))
        if ok:
            mark_instance()
        return self._json({'ok': ok, 'message': log})

    @route('POST', '/__setup/adopt', public='poste')
    def _post_adopt(self, path, body):
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

    @route('POST', '/__setup/upload', public='poste')
    def _post_upload(self, path, body):
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


# ---- réseau local (lot 18, tools/device_access.py) : serveurs sur les adresses privées de ce poste, même port, ouverts sur
# demande et fermés avec le lanceur
LAN = {'servers': [], 'hosts': set(), 'order': [], 'handler': None, 'port': 0}
LAN_MAX_BODY = 16 * 1024 * 1024  # corps d'un POST venu du réseau local (un lot d'écritures, un relais)
_tree_memo = {'at': 0.0, 'v': None}  # dernier arbre de data/ calculé (servi de nouveau à un appareil, 2 s au plus)
LAN_LOCK = threading.Lock()
NB = '\u202f'  # espace fine insécable avant : ; ! ? en français
# ---- OpenID d'IVAO par le relais (R1b) : code + PKCE S256 (le point de jeton d'IVAO n'admet que client_secret_basic /
# post : pas de client public, le secret reste au relais, secrets/ivao_oauth.json) ; adresses lues du document de découverte
# (jamais écrites en dur) ; le pilote reçoit son propre jeton (portée tracker) et le refresh_token, une fois, par le fragment
# d'une page de retour du même origine ; le téléphone lit ensuite le tracker directement
IVAO_CALLBACK = '/__relay/ivao/callback'


def route_table():
    """La table des routes du lanceur, publiée (GET /__setup/routes) : [{ method, path, public ('lan' | 'poste'), relay }],
    triée ; la seule liste (le cadre et la noreg la lisent, R-C4)."""
    return [{'method': m, 'path': p, 'public': v[1], 'relay': v[2]} for (m, p), v in sorted(ROUTES.items())]


assert ('GET', IVAO_CALLBACK) in ROUTES  # le retour d'IVAO est une route déclarée (Setup._ivao_callback)


def ivao_redirects(port):
    """Les adresses de retour d'IVAO, calculées ici seulement (démarrage, retour, refus 409, assistant des Réglages) :
    { poste: http://127.0.0.1:<port>/…, relay: https://<hôte public>/… ou '' sans relais }."""
    return {'poste': f'http://127.0.0.1:{port}{IVAO_CALLBACK}', 'relay': RELAY.origin() + IVAO_CALLBACK if RELAY.on else ''}
IVAO_DISCOVERY = 'https://api.ivao.aero/.well-known/openid-configuration'
IVAO_SCOPE = 'openid tracker'
IVAO_STATE_TTL = 600
_ivao_oidc = {'meta': None, 'at': 0.0, 'pending': {}}
def ivao_oauth_cfg():
    """(clientId, clientSecret, document de découverte) de secrets/ivao_oauth.json, ou None."""
    s = _read_json(_secret_file('app', service='ivao_oauth'))
    cid, sec = str(s.get('clientId') or '').strip(), str(s.get('clientSecret') or '').strip()
    disc = str(s.get('discovery') or IVAO_DISCOVERY).strip()
    return (cid, sec, disc) if cid and sec and disc.startswith('https://') else None


def _oidc_json(req):
    with NO_REDIRECT_OPEN(req, timeout=20, what='IVAO') as r:
        return json.loads(r.read() or b'{}')


def ivao_oidc_meta(disc):
    """Points d'autorisation et de jeton d'IVAO (document de découverte, gardé une heure) ; https seulement."""
    if _ivao_oidc['meta'] and time.time() - _ivao_oidc['at'] < 3600:
        return _ivao_oidc['meta']
    m = _oidc_json(urllib.request.Request(disc, headers={'Accept': 'application/json'}))
    meta = {k: str(m.get(k) or '') for k in ('authorization_endpoint', 'token_endpoint')}
    if not all(v.startswith('https://') for v in meta.values()):
        raise ValueError('IVAO discovery: https endpoints expected')
    rev = str(m.get('revocation_endpoint') or '')  # facultatif (RFC 7009) : https seulement, sinon pas de révocation
    meta['revocation_endpoint'] = rev if rev.startswith('https://') else ''
    _ivao_oidc.update(meta=meta, at=time.time())
    return meta


def ivao_oauth_start(device, redirect):
    """Adresse d'autorisation d'IVAO pour cet appareil : { ok, url } ; état aléatoire lié à l'appareil, vérificateur PKCE
    gardé ici (10 minutes)."""
    cfg = ivao_oauth_cfg()
    if not cfg:
        # l'adresse de retour exacte à déclarer chez IVAO (celle du poste ou du relais) : la page la montre avec la marche à suivre
        return {'ok': False, 'status': 409, 'message': 'no IVAO application here (secrets/ivao_oauth.json)', 'redirect': redirect,
                'relay': redirect.startswith('https://')}
    try:
        meta = ivao_oidc_meta(cfg[2])
    except (OSError, ValueError) as e:
        return {'ok': False, 'status': 502, 'message': f'IVAO discovery: {outbound.reason(e)}'}
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    state = secrets.token_urlsafe(24)
    now = time.time()
    pend = {k: v for k, v in _ivao_oidc['pending'].items() if now - v['at'] < IVAO_STATE_TTL}
    if len(pend) >= 100 or sum(1 for v in pend.values() if v['device'] == device) >= 3:  # 100 en tout, 3 par appareil
        return {'ok': False, 'status': 429, 'message': 'too many sign-ins in progress'}
    pend[state] = {'verifier': verifier, 'device': device, 'redirect': redirect, 'at': now}
    _ivao_oidc['pending'] = pend
    q = urllib.parse.urlencode({'response_type': 'code', 'client_id': cfg[0], 'redirect_uri': redirect, 'scope': IVAO_SCOPE,
                                'state': state, 'code_challenge': challenge, 'code_challenge_method': 'S256'})
    return {'ok': True, 'url': f'{meta["authorization_endpoint"]}?{q}'}


def _ivao_post(url, form):
    """POST au point d'IVAO, client_secret_basic (en-tête jamais recopié : l'ouvreur ne suit aucune redirection)."""
    cid, sec, _ = ivao_oauth_cfg()
    basic = base64.b64encode(f'{urllib.parse.quote(cid, safe="")}:{urllib.parse.quote(sec, safe="")}'.encode()).decode()
    req = urllib.request.Request(url, method='POST', data=urllib.parse.urlencode(form).encode(),
                                 headers={'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'})
    req.add_unredirected_header('Authorization', f'Basic {basic}')
    return req


def _ivao_token(form):
    """Point de jeton d'IVAO, client_secret_basic : { access_token, refresh_token, expires_in, scope } ou ValueError."""
    j = _oidc_json(_ivao_post(ivao_oidc_meta(ivao_oauth_cfg()[2])['token_endpoint'], form))
    if not isinstance(j, dict) or not j.get('access_token'):
        raise ValueError('no access_token')
    return j


def _ivao_tokens(j):
    return {'ok': True, 'access_token': str(j['access_token']), 'refresh_token': str(j.get('refresh_token') or ''),
            'scope': str(j.get('scope') or ''), 'expires_at': int(time.time()) + max(60, int(j.get('expires_in') or 3600))}


def ivao_state_why(state, device, redirect):
    """Pourquoi cet état n'ouvre pas le retour ('' : il l'ouvre) : 'inconnu' (jamais émis, déjà consommé, lanceur relancé),
    'expiré', 'autre appareil', 'autre adresse de retour'. Ne consomme rien."""
    p = _ivao_oidc['pending'].get(str(state or ''))
    if not p:
        return 'inconnu'
    if time.time() - p['at'] >= IVAO_STATE_TTL:
        return 'expiré'
    if p['device'] != device:
        return 'autre appareil'
    return 'autre adresse de retour' if p['redirect'] != redirect else ''


def ivao_state_open(state, device, redirect):
    """Vrai si cet état est celui d'une demande en cours de cet appareil, avec cette adresse de retour (sans le consommer)."""
    return not ivao_state_why(state, device, redirect)


def frame_hop_page(frag):
    """Page qui ouvre le cadre à /frame/index.html#ivao-return?<frag> depuis cette origine (balise meta refresh, sans script :
    la politique de contenu n'en autorise pas en ligne) ; frag déjà encodé (urlencode), échappé pour l'attribut."""
    url = f'/frame/index.html#ivao-return?{frag}'
    e = url.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
    return (f'<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer">'
            f'<meta http-equiv="refresh" content="0;url={e}"><title>SOG</title>'
            f'<body style="font:16px system-ui;margin:3em"><p><a href="{e}">IVAO → SOG</a></p>').encode('utf-8')


def ivao_oauth_revoke(token):
    """Délier : le jeton (refresh_token d'abord) révoqué chez IVAO, revocation_endpoint de la découverte (RFC 7009, https,
    client_secret_basic) : { ok, revoked } ; revoked faux sans point de révocation ou s'il refuse — l'appareil efface quand
    même son jeton et dit au pilote de retirer l'accès dans son compte IVAO."""
    if not isinstance(token, str) or not 8 <= len(token) <= 4096:
        return {'ok': False, 'status': 400, 'message': 'token expected'}
    cfg = ivao_oauth_cfg()
    if not cfg:
        return {'ok': True, 'revoked': False}
    try:
        url = ivao_oidc_meta(cfg[2]).get('revocation_endpoint') or ''
        if not url:
            return {'ok': True, 'revoked': False}
        with NO_REDIRECT_OPEN(_ivao_post(url, {'token': token, 'token_type_hint': 'refresh_token'}), timeout=20, what='IVAO') as r:
            r.read()
        return {'ok': True, 'revoked': True}
    except (OSError, ValueError):
        return {'ok': True, 'revoked': False}


def ivao_oauth_finish(state, code, error, device, redirect):
    """Retour d'IVAO : l'état d'une demande en cours, du même appareil et de la même adresse de retour ; le code échangé.
    { ok, access_token, refresh_token, expires_at, scope } ou { ok: False, error }."""
    p = _ivao_oidc['pending'].pop(str(state or ''), None)
    ours = bool(p) and time.time() - p['at'] < IVAO_STATE_TTL and p['device'] == device and p['redirect'] == redirect
    if not ours:  # aucune connexion en cours de cet appareil : même un « error=… » n'est pas d'IVAO (un lien tiers le forgerait)
        return {'ok': False, 'error': 'state'}
    if error:  # IVAO a refusé une connexion de cet appareil (client inconnu, adresse de retour, accès refusé) : son code
        return {'ok': False, 'error': 'ivao:' + (re.sub(r'[^a-z0-9_]', '', str(error).lower())[:40] or 'denied')}
    if not code:
        return {'ok': False, 'error': 'code'}
    if not ivao_oauth_cfg():
        return {'ok': False, 'error': 'config'}
    try:
        return _ivao_tokens(_ivao_token({'grant_type': 'authorization_code', 'code': code, 'redirect_uri': redirect,
                                         'code_verifier': p['verifier']}))
    except (OSError, ValueError, KeyError):
        return {'ok': False, 'error': 'exchange'}




class Relay:
    """Le relais de la compagnie (R1a, --relay <hôte public> ; une seule identité, refonte R-C1) : l'hôte public que le
    proxy inverse du NAS transmet, le port qu'il vise (--relay-port, sinon celui de l'interface + 1) et le serveur qui y
    écoute (127.0.0.1 seulement), posés ensemble par start() avant toute écoute. Une requête est du relais si elle arrive
    par ce serveur (Setup._relay), jamais d'après Host ; sur le port de l'interface, un en-tête de mandataire est refusé
    (Setup._proxy_belt, la ceinture)."""
    # en-têtes posés par un mandataire (la ceinture)
    PROXY_HEADERS = ('X-Forwarded-For', 'X-Forwarded-Proto', 'X-Forwarded-Host', 'Forwarded', 'X-Real-IP')

    def __init__(self):
        self.host, self.port, self.server = '', 0, None

    @property
    def on(self):
        """Vrai une fois l'hôte public posé (start) : le lanceur tourne en relais."""
        return bool(self.host)

    def origin(self):
        """L'origine publique du relais (https://<hôte>) ; '' sans relais."""
        return f'https://{self.host}' if self.host else ''

    def start(self, host, port, handler):
        """Pose l'hôte et le port, puis écoute (127.0.0.1:port) : aucune requête du relais n'arrive sans son hôte."""
        self.host, self.port = host.lower(), port
        srv = Server(('127.0.0.1', port), handler)
        srv.relay = True
        self.server = srv
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv


RELAY = Relay()


def relay_probe():
    """Au démarrage en relais : une requête sur l'hôte public, par le proxy, doit revenir ici par le port du relais
    (/__relay/whoami) ; le résultat est dit dans la console (le proxy qui vise le port de l'interface est refusé : 403)."""
    url = RELAY.origin() + '/__relay/whoami'
    try:
        with NO_REDIRECT_OPEN(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=10, what='relais') as r:
            ok = json.loads(r.read() or b'{}').get('relay') is True
        say('  Relais vérifié : une requête sur l’hôte public revient ici comme relais.' if ok else
            f'  ATTENTION relais : {url} ne répond pas comme ce relais.')
    except urllib.error.HTTPError as e:
        say(f'  ATTENTION relais : {url} répond {e.code}' + ('' if e.code != 403 else
                                                               f' — le proxy doit viser le port du relais ({RELAY.port}) et garder l’en-tête Host.'))
    except (OSError, ValueError) as e:
        say(f'  Relais : vérification impossible ({type(e).__name__}) — l’hôte public doit mener à ce poste.')
RELAY_TEXT = {
    'title': {'fr': 'Appairer cet appareil', 'en': 'Pair this device', 'de': 'Dieses Gerät koppeln', 'es': 'Vincular este dispositivo'},
    'intro': {'fr': 'L’appli Pilote de la compagnie, par son relais. Saisissez le code à 8 chiffres que l’administrateur vous a donné'
                    + NB + ': une seule fois pour cet appareil.',
              'en': 'The airline’s Pilot application, through its relay. Enter the 8-digit code the administrator gave you: only once for this device.',
              'de': 'Die Pilot-App der Fluggesellschaft über ihr Relais. Geben Sie den 8-stelligen Code ein, den Ihnen der Administrator gegeben hat: nur einmal für dieses Gerät.',
              'es': 'La aplicación Piloto de la aerolínea, por su relé. Introduzca el código de 8 cifras que le dio el administrador: una sola vez para este dispositivo.'},
    'code': {'fr': 'Code d’appairage', 'en': 'Pairing code', 'de': 'Kopplungscode', 'es': 'Código de vinculación'},
    'pair': {'fr': 'Appairer', 'en': 'Pair', 'de': 'Koppeln', 'es': 'Vincular'},
    'bad': {'fr': 'Code incorrect.', 'en': 'Wrong code.', 'de': 'Falscher Code.', 'es': 'Código incorrecto.'},
    'expired': {'fr': 'Pas de code en cours (un code sert une fois et dure 10 minutes)' + NB + ': demandez-en un à l’administrateur.',
                'en': 'No code in progress (a code works once and lasts 10 minutes): ask the administrator for one.',
                'de': 'Kein Code aktiv (ein Code gilt einmal und 10 Minuten): Bitten Sie den Administrator um einen.',
                'es': 'Ningún código en curso (un código sirve una vez y dura 10 minutos): pida uno al administrador.'},
    'wait': {'fr': 'Trop d’essais' + NB + ': réessayez dans {s} s.', 'en': 'Too many tries: try again in {s} s.',
             'de': 'Zu viele Versuche: in {s} s erneut versuchen.', 'es': 'Demasiados intentos: vuelva a intentarlo en {s} s.'},
    'closed': {'fr': 'Appairage fermé après trop de codes faux' + NB + ': demandez un nouveau code à l’administrateur.',
               'en': 'Pairing closed after too many wrong codes: ask the administrator for a new code.',
               'de': 'Kopplung nach zu vielen falschen Codes geschlossen: Bitten Sie den Administrator um einen neuen Code.',
               'es': 'Vinculación cerrada tras demasiados códigos erróneos: pida un código nuevo al administrador.'},
    'origin': {'fr': 'Saisissez le code sur cette page.', 'en': 'Enter the code on this page.', 'de': 'Geben Sie den Code auf dieser Seite ein.',
               'es': 'Introduzca el código en esta página.'},
    'note': {'fr': 'Cet appareil reçoit un jeton gardé par le navigateur, révocable par l’administrateur ; vos écritures sont signées de votre trigramme.',
             'en': 'This device gets a token kept by the browser, revocable by the administrator; your writes are signed with your trigram.',
             'de': 'Dieses Gerät erhält ein vom Browser verwahrtes Token, das der Administrator widerrufen kann; Ihre Änderungen tragen Ihr Kürzel.',
             'es': 'Este dispositivo recibe un token guardado por el navegador, revocable por el administrador; sus escrituras llevan su trigrama.'},
}
LAN_TEXT = {
    'title': {'fr': 'Appairer cet appareil', 'en': 'Pair this device', 'de': 'Dieses Gerät koppeln', 'es': 'Vincular este dispositivo'},
    'intro': {'fr': 'L’appli Pilote du poste « {host} », sur le réseau local. Saisissez le code à 6 chiffres affiché sur le poste '
                    '(fenêtre du lanceur, ou Réglages › Accès du poste)' + NB + ': une seule fois pour cet appareil.',
              'en': 'The Pilot application of the computer “{host}”, on the local network. Enter the 6-digit code shown on the '
                    'computer (the launcher window, or Settings › Computer access): only once for this device.',
              'de': 'Die Pilot-App des Rechners „{host}“ im lokalen Netz. Geben Sie den 6-stelligen Code ein, der auf dem Rechner '
                    'angezeigt wird (Fenster des Starters oder Einstellungen › Zugang des Rechners): nur einmal für dieses Gerät.',
              'es': 'La aplicación Piloto del equipo «{host}», en la red local. Introduzca el código de 6 cifras que muestra el '
                    'equipo (ventana del lanzador, o Ajustes › Acceso del equipo): una sola vez para este dispositivo.'},
    'code': {'fr': 'Code d’appairage', 'en': 'Pairing code', 'de': 'Kopplungscode', 'es': 'Código de vinculación'},
    'pair': {'fr': 'Appairer', 'en': 'Pair', 'de': 'Koppeln', 'es': 'Vincular'},
    'bad': {'fr': 'Code incorrect.', 'en': 'Wrong code.', 'de': 'Falscher Code.', 'es': 'Código incorrecto.'},
    'expired': {'fr': 'Pas de code en cours (un code sert une fois et dure 10 minutes)' + NB + ': demandez-en un sur le poste, Réglages › Accès du poste, « Nouveau code ».',
                'en': 'No code in progress (a code works once and lasts 10 minutes): ask for one on the computer, Settings › Computer access, “New code”.',
                'de': 'Kein gültiger Code (ein Code gilt einmal und 10 Minuten): fordern Sie auf dem Rechner einen an, Einstellungen › Zugang des Rechners, „Neuer Code“.',
                'es': 'No hay código en curso (un código sirve una vez y dura 10 minutos): pida uno en el equipo, Ajustes › Acceso del equipo, «Código nuevo».'},
    'closed': {'fr': 'Appairage fermé après trop de codes faux' + NB + ': il se rouvre par « Nouveau code » sur le poste (Réglages › Accès du poste).',
               'en': 'Pairing closed after too many wrong codes: it reopens with “New code” on the computer (Settings › Computer access).',
               'de': 'Kopplung nach zu vielen falschen Codes geschlossen: Sie öffnet sich wieder mit „Neuer Code“ auf dem Rechner (Einstellungen › Zugang des Rechners).',
               'es': 'Vinculación cerrada tras demasiados códigos erróneos: se vuelve a abrir con «Código nuevo» en el equipo (Ajustes › Acceso del equipo).'},
    'wait': {'fr': 'Trop d’essais' + NB + ': réessayez dans {s} s.', 'en': 'Too many attempts: try again in {s} s.',
             'de': 'Zu viele Versuche: in {s} s erneut versuchen.', 'es': 'Demasiados intentos: vuelva a intentarlo en {s} s.'},
    'origin': {'fr': 'Saisissez le code sur cette page.', 'en': 'Enter the code on this page.', 'de': 'Geben Sie den Code auf dieser Seite ein.',
               'es': 'Introduzca el código en esta página.'},
    'note': {'fr': 'Réseau local en http' + NB + ': à n’utiliser que sur un réseau de confiance (à la maison), jamais sur un wifi public.',
             'en': 'Local network over http: use it only on a trusted network (at home), never on public wifi.',
             'de': 'Lokales Netz über http: nur in einem vertrauenswürdigen Netz (zu Hause) verwenden, nie in einem öffentlichen WLAN.',
             'es': 'Red local en http: úsela solo en una red de confianza (en casa), nunca en una wifi pública.'},
}


def safe_next(p):
    """Page où revenir après l'appairage : un chemin de ce serveur, jamais un autre site — ni //, ni \\, ni espace ou
    caractère de contrôle (« /<tabulation>/hôte » : le navigateur retire la tabulation et lit //hôte), ni /__."""
    p = str(p or '')
    return p if re.fullmatch(r'/[^\s\x00-\x1f\x7f\\]*', p) and not p.startswith('//') and not p.startswith('/__') else '/frame/'


def lan_state():
    """État de l'accès du réseau local : ouvert, adresses de l'appli Pilote (la principale d'abord), code, appareils
    appairés, nom du poste."""
    on = bool(LAN['servers'])
    cs = device_access.console_state() if on else {}
    return {'on': on, 'urls': [f'http://{h}/frame/' for h in LAN['order']] if on else [],
            'available': device_access.addresses(), 'code': cs.get('code', ''), 'expires': cs.get('expires', 0),
            'closed': bool(cs.get('closed')), 'devices': len(lan := device_access.listing('lan')), 'paired': lan,
            'host': socket.gethostname()}


def lan_open(every=False):
    """Ouvre l'accès du réseau local sur l'adresse privée de la route par défaut (toutes les adresses privées de ce
    poste si every : VPN, machines virtuelles…), même port, avec un nouveau code ; déjà ouvert, every ajoute les autres
    adresses sans toucher au code (ni en émettre un, ni rouvrir un appairage fermé après 30 codes faux : seul « Nouveau
    code » le fait)."""
    with LAN_LOCK:
        if not LAN['handler'] or (LAN['servers'] and not every):
            return lan_state()
        was_open = bool(LAN['servers'])
        order = list(LAN['order'])
        for ip in device_access.addresses()[:None if every else 1]:
            if f'{ip}:{LAN["port"]}' in LAN['hosts']:
                continue
            try:
                srv = Server((ip, LAN['port']), LAN['handler'])
            except OSError as e:
                say(f'  Réseau local : {ip}:{LAN["port"]} indisponible ({e}).')
                continue
            srv.lan = True
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            LAN['servers'].append(srv)
            order.append(f'{ip}:{LAN["port"]}')
        LAN.update(hosts=set(order), order=order)
        if not order:
            say('  Réseau local : aucune adresse privée sur ce poste (réseau 10.x, 172.16-31.x ou 192.168.x).')
            return lan_state()
        if was_open:
            say(f'  Réseau local : adresses ouvertes : {", ".join(order)}')
            return lan_state()
        code = device_access.console_code()
        say('')
        say(f'  Réseau local ouvert : http://{order[0]}/frame/ — code d’appairage : {code} (une fois, 10 minutes)')
        say('  Windows peut demander d’autoriser Python : acceptez pour les réseaux privés seulement.')
        say('  À n’utiliser que sur un réseau de confiance (http, sans chiffrement). Fermé avec le lanceur.')
        say('')
    return lan_state()


def lan_close():
    """Ferme l'accès du réseau local (les appareils appairés le restent pour la prochaine ouverture)."""
    with LAN_LOCK:
        for srv in LAN['servers']:
            srv.shutdown()
            srv.server_close()
        if LAN['servers']:
            say('  Réseau local fermé.')
        LAN.update(servers=[], hosts=set(), order=[])
        device_access.clear_console()
    return lan_state()


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
        req = urllib.request.Request(VATSIM_BOOKINGS, headers={'Accept': 'application/json'})
        with outbound.urlopen(req, timeout=15) as r:
            data = json.load(r)
    except (OSError, ValueError) as e:
        return {'error': str(e)}
    _vatsim.update(at=time.time(), data={'bookings': data if isinstance(data, list) else []})
    return _vatsim['data']


IVAO_API = 'https://api.ivao.aero/v2'
_ivao = {'at': 0.0, 'areas': None}


# ---- secrets locaux (dossier secrets/ à la racine de la suite, exclu de git, hors des données et des sauvegardes) :
#   secrets/<service>.json            clés de la suite (IVAO : apiKey, savedAt ; EAD Basic : user, password, savedAt) — Paramètres › Installation › Clés et services externes
#   secrets/users/<TRI>.json          identifiants d'un utilisateur ({ ivao: { clientId, clientSecret } }) — Mon profil
# Champs admis par service et portée ; écrits par POST /__setup/secrets, jamais relus par la page (indicateurs seuls).
# gitlab : instance, projet et jeton d'accès du dépôt des données sur GitLab (secrets/gitlab.json, posé à la main sur le poste
# de l'administrateur ; G2, la page « Jetons des pilotes », s'en servira) — comme ead, jamais un caractère vers la page
SECRET_FIELDS = {'app': {'ivao': {'apiKey': True}, 'ead': {'user': True, 'password': True},
                         'gitlab': {'instance': True, 'project': True, 'token': True},
                         # application OpenID d'IVAO du relais (R1b) : le secret reste ici, jamais un caractère vers la page
                         'ivao_oauth': {'clientId': True, 'clientSecret': True}},
                 'user': {'ivao': {'clientId': False, 'clientSecret': True}}}
SECRET_BLIND = ('ead', 'gitlab', 'ivao_oauth')  # services dont la page ne reçoit que « réglé » et la date, jamais un caractère
SECRETS = os.path.join(ROOT, 'secrets')


def _secret_file(scope, tri='', service=''):
    """Fichier d'un secret : secrets/<service>.json (portée app) ou secrets/users/<TRI>.json (portée utilisateur)."""
    if scope == 'app':
        return os.path.join(SECRETS, f'{service}.json')
    return os.path.join(SECRETS, 'users', f'{tri}.json')


LNMPERF_STATE = os.path.join(ROOT, 'tools', '.lnmperf.json')  # dossier des fiches .lnmperf de ce poste (jamais versionné)
LNMPERF_ROUTES = ('/__setup/lnmperf-folder', '/__setup/lnmperf')
LNMPERF_NAME = re.compile(r'^(?!\.)[^\\/:*?"<>|\x00-\x1f]{1,120}\.lnmperf$', re.I)  # un nom de fichier seul


def lnmperf_folder():
    """Dossier des fiches Little Navmap réglé sur ce poste, '' s'il ne l'est pas ou n'existe plus."""
    f = _read_json(LNMPERF_STATE).get('folder') or ''
    return f if f and os.path.isdir(f) else ''


def lnmperf_suggestions():
    """Dossiers habituels de Little Navmap présents sur ce poste (Documents, OneDrive compris)."""
    home = os.path.expanduser('~')
    docs = [os.path.join(home, 'Documents'), os.path.join(home, 'OneDrive', 'Documents')]
    out = []
    for d in docs:
        for sub in ('Little Navmap Files', 'Little Navmap'):
            p = os.path.join(d, sub)
            if os.path.isdir(p) and p not in out:
                out.append(p)
    return out


def lnm_db_folder():
    """Dossier des bases de Little Navmap de ce poste (%APPDATA%/ABarthel/little_navmap_db sous Windows,
    ~/.config/ABarthel/little_navmap_db ailleurs), qu'il existe ou non."""
    home = os.path.expanduser('~')
    base = (os.environ.get('APPDATA') or os.path.join(home, 'AppData', 'Roaming')) if sys.platform == 'win32' else os.path.join(home, '.config')
    return os.path.join(base, 'ABarthel', 'little_navmap_db')


# carte « Dossiers » (Maintenance › Administration, A3) : les dossiers que le lanceur connaît, en lecture seule. Chaque
# dossier a un identifiant fixe et dit d'où il vient (« from », traduit par la page) ; « Ouvrir » ne reçoit que
# l'identifiant, jamais un chemin de la page. X-Plane : le lanceur ne connaît pas son dossier (il lit la position du
# simulateur par la boucle locale, 127.0.0.1), la ligne le dit.
FOLDER_IDS = ('suite', 'data', 'downloads', 'lnmdb', 'lnmperf', 'xplane')


def folders():
    """[{ id, path ('' : inconnu), exists, from }] des dossiers de ce poste, dans l'ordre de FOLDER_IDS."""
    dl = next((d for d in downloads_dirs() if os.path.normcase(d) != os.path.normcase(ROOT)), '')
    rows = {'suite': (ROOT, 'install'), 'data': (DATA, 'data-option'), 'downloads': (dl, 'system'), 'lnmdb': (lnm_db_folder(), 'lnm'),
            'lnmperf': (lnmperf_folder(), 'lnmperf-setting'), 'xplane': ('', 'unknown')}
    return [{'id': k, 'path': rows[k][0], 'exists': bool(rows[k][0]) and os.path.isdir(rows[k][0]), 'from': rows[k][1]} for k in FOLDER_IDS]


def _open_folder(path):
    """Le dossier ouvert dans l'explorateur de fichiers de ce poste (Explorateur Windows, Finder, xdg-open)."""
    if sys.platform == 'win32':
        os.startfile(path, 'explore')  # l'Explorateur imposé, quoi que devienne le chemin entre isdir() et l'appel
    else:
        subprocess.Popen(['open' if sys.platform == 'darwin' else 'xdg-open', path], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                         stderr=subprocess.DEVNULL, env=regen_jobs.child_env())


FOLDER_OPEN = _open_folder  # remplacé par les essais (rien n'est ouvert)


def lnm_db_kinds():
    """Genres de bases de données de Little Navmap présents sur ce poste, triés (« navigraph », « userdata »…) : les fichiers
    little_navmap_<genre>.sqlite de %APPDATA%/ABarthel/little_navmap_db (Windows) ou ~/.config/ABarthel/little_navmap_db.
    Des noms seulement, jamais un chemin ni un contenu ; [] si le dossier est absent ; ne lève jamais. Sert d'indice à aerodb
    (frame/aerodb : « Little Navmap a ces données ») ; la lecture de ces bases n'est pas faite ici (V3 § 10.21)."""
    try:
        found = (re.fullmatch(r'little_navmap_([a-z0-9_]+)\.sqlite', n) for n in os.listdir(lnm_db_folder()))
        return sorted({m.group(1) for m in found if m})
    except Exception:
        return []


def lnmperf_entry(path):
    """{ name, size, mtime (ISO, UTC), sha (SHA-1 du contenu) } d'un fichier .lnmperf."""
    with open(path, 'rb') as f:
        b = f.read()
    mt = datetime.datetime.fromtimestamp(os.path.getmtime(path), datetime.timezone.utc)
    return {'name': os.path.basename(path), 'size': len(b), 'mtime': mt.isoformat().replace('+00:00', 'Z'),
            'sha': hashlib.sha1(b).hexdigest()}


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
        if service in SECRET_BLIND:  # EAD Basic, GitLab : jamais le moindre caractère vers la page (réglé ou non, et quand)
            out['app'][service] = {k: {'set': bool(cur.get(k)), 'at': str(saved.get(k) or '') if cur.get(k) else ''} for k in fields}
            continue
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


# ---- jetons d'accès de projet GitLab des pilotes (G2, application Maintenance) : créés, listés et révoqués par le lanceur
# avec le jeton de l'administrateur (secrets/gitlab.json : instance https, projet, jeton) ; le jeton de l'administrateur ne
# quitte jamais le lanceur ; celui d'un pilote est rendu UNE fois, à sa création, pour que l'administrateur le lui donne
GITLAB_TIMEOUT = 20
GITLAB_LEVEL = 30  # Developer : écrit la branche si elle l'admet (Protected branches : « Developers + Maintainers »), jamais
#                    les réglages du projet ; un jeton Maintainer pourrait les changer par l'API
GITLAB_SCOPES = ['api']  # l'API REST (arbre, blobs, commits) : write_repository ne vaut que pour git en HTTP
class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Jamais une redirection suivie : un 30x est une erreur (le pendant, côté lanceur, du redirect: 'error' des transports
    du navigateur ; HTTPRedirectHandler recopierait un en-tête d'autorisation vers n'importe quel hôte)."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


# un seul ouvreur sans redirection (R-C3) : l'OpenID d'IVAO (découverte, jeton, révocation), l'API GitLab avec le jeton de
# l'administrateur, la vérification du relais au démarrage ; le service est dit en console par l'appel (what=…).
# NO_REDIRECT_OPEN est remplacé par les essais (aucun appel réel)
NO_REDIRECT = outbound.opener(_NoRedirect)
NO_REDIRECT_OPEN = NO_REDIRECT.open


def _gitlab_request(url, method, body, tok):
    """Requête de l'API GitLab : le jeton en en-tête jamais recopié par une redirection (add_unredirected_header)."""
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json'} if body is not None else {})
    req.add_unredirected_header('PRIVATE-TOKEN', tok)
    return req


def gitlab_cfg():
    """(api, projet encodé, jeton) de secrets/gitlab.json, ou None : instance en https seulement."""
    s = _read_json(_secret_file('app', service='gitlab'))
    inst, proj, tok = str(s.get('instance') or '').strip().rstrip('/'), str(s.get('project') or '').strip().strip('/'), str(
        s.get('token') or '').strip()
    if not (re.fullmatch(r'https://[A-Za-z0-9.-]+(?::\d+)?', inst) and re.fullmatch(r'[\w.-]+(?:/[\w.-]+)+', proj) and tok):
        return None
    return f'{inst}/api/v4', urllib.parse.quote(proj, safe=''), tok


def gitlab_call(method, path, body=None):
    """Appel de l'API GitLab du projet avec le jeton de l'administrateur : (statut, JSON) ; (0, message) sans réseau. Le
    jeton n'apparaît dans aucun message rendu."""
    cfg = gitlab_cfg()
    if not cfg:
        return 409, {'message': 'no GitLab secret on this workstation (secrets/gitlab.json: https instance, project, token)'}
    api, proj, tok = cfg
    req = _gitlab_request(f'{api}/projects/{proj}{path}', method, body, tok)
    try:
        with NO_REDIRECT_OPEN(req, timeout=GITLAB_TIMEOUT, what='GitLab') as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        try:
            j = json.loads(e.read() or b'{}')
        except ValueError:
            j = {}
        msg = j.get('message') or j.get('error') or e.reason
        return e.code, {'message': data_sync.clean_text(str(msg if isinstance(msg, str) else json.dumps(msg)))[:300].replace(tok, '…')}
    except (OSError, ValueError) as e:
        return 0, {'message': data_sync.clean_text(str(e))[:200].replace(tok, '…')}


def gitlab_tokens():
    """Jetons d'accès du projet : [{ id, name, scopes, level, active, revoked, created, expires, used }] — jamais une valeur."""
    code, j = gitlab_call('GET', '/access_tokens?per_page=100')
    if code != 200 or not isinstance(j, list):
        return {'ok': False, 'status': code or 502, 'message': (j or {}).get('message', 'GitLab') if isinstance(j, dict) else 'GitLab'}
    return {'ok': True, 'tokens': [{'id': t.get('id'), 'name': str(t.get('name') or '')[:60], 'scopes': t.get('scopes') or [],
                                    'level': t.get('access_level'), 'active': bool(t.get('active')), 'revoked': bool(t.get('revoked')),
                                    'created': t.get('created_at'), 'expires': t.get('expires_at'), 'used': t.get('last_used_at')}
                                   for t in j if isinstance(t, dict)]}


def gitlab_token_create(a):
    """{ trigram, days (1 à 365) } → un jeton d'accès de projet nommé par le trigramme ; { ok, id, name, expires, token } : la
    valeur rendue cette fois seulement (jamais gardée ni journalisée par le lanceur)."""
    tri = str(a.get('trigram') or '').upper()
    if not re.fullmatch(r'[A-Z0-9]{2,5}', tri):
        return {'ok': False, 'status': 400, 'message': 'trigram expected (2 to 5 letters or digits)'}
    try:
        days = int(a.get('days') or 365)
    except (TypeError, ValueError):
        days = 0
    if not 1 <= days <= 365:
        return {'ok': False, 'status': 400, 'message': 'days: 1 to 365'}
    expires = (datetime.date.today() + datetime.timedelta(days=days)).isoformat()
    code, j = gitlab_call('POST', '/access_tokens', {'name': tri, 'scopes': GITLAB_SCOPES, 'access_level': GITLAB_LEVEL,
                                                     'expires_at': expires})
    if code not in (200, 201) or not isinstance(j, dict) or not j.get('token'):
        return {'ok': False, 'status': code or 502, 'message': (j or {}).get('message', 'GitLab') if isinstance(j, dict) else 'GitLab'}
    return {'ok': True, 'id': j.get('id'), 'name': j.get('name'), 'expires': j.get('expires_at'), 'token': j['token']}


def gitlab_token_revoke(a):
    """{ id } → jeton révoqué ; { ok }. Seulement un jeton de pilote (nom = un trigramme) : jamais un autre jeton du projet
    (celui de l'administrateur, d'un service), quelle que soit la page qui le demande."""
    try:
        tid = int(a.get('id'))
    except (TypeError, ValueError):
        return {'ok': False, 'status': 400, 'message': 'id expected'}
    code, j = gitlab_call('GET', f'/access_tokens/{tid}')
    if code != 200 or not isinstance(j, dict):
        return {'ok': False, 'status': code or 502, 'message': (j or {}).get('message', 'GitLab') if isinstance(j, dict) else 'GitLab'}
    if not re.fullmatch(r'[A-Z0-9]{2,5}', str(j.get('name') or '')):
        return {'ok': False, 'status': 403, 'message': 'only a pilot token (named after a trigram) is revoked here'}
    code, j = gitlab_call('DELETE', f'/access_tokens/{tid}')
    return {'ok': True} if code in (200, 204) else {'ok': False, 'status': code or 502, 'message': (j or {}).get('message', 'GitLab')}


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
    if service == 'ivao_oauth':
        # application OpenID d'IVAO : le document de découverte est relu (cache vidé) avec l'adresse enregistrée ; jamais un
        # secret dans la réponse
        cfg = ivao_oauth_cfg()
        if not cfg:
            return {'ok': False, 'key': 'missing'}
        _ivao_oidc.update(meta=None, at=0.0)
        try:
            ivao_oidc_meta(cfg[2])
        except (OSError, ValueError) as e:
            return {'ok': False, 'error': f'IVAO discovery: {outbound.reason(e)}'}
        return {'ok': True}
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
# d'avant restauration, index régénérés, repère du lanceur, sources du SIA (seules sia/base/, la base publiée, et
# sia/vfr/, les points VFR tirés des VAC, sont vues).
FRAME_SKIP = re.compile(r'(^|/)(\.git|_conflits|_avant_restauration)(/|$)|^local(/|$)|(^|/)_index\.json$|^\.defa_instance$|^sia/(?=.)(?!(base|vfr)(/|$))')
FRAME_LOCK = threading.Lock()
_frame_memo = {}  # chemin → ((taille, date), empreinte)


def frame_tree():
    """(tête, arbre) de data/ : empreinte git de chaque fichier (relue seulement si sa taille ou sa date change) ; ni
    lien ni jonction suivis (un dossier relié ailleurs ferait sortir l'arbre de data/, ou le ferait boucler)."""
    out = {}
    linked = lambda p: os.path.islink(p) or getattr(os.path, 'isjunction', lambda q: False)(p)  # isjunction : Python 3.12+
    for d, dirs, files in os.walk(DATA):
        rel_d = os.path.relpath(d, DATA).replace(os.sep, '/')
        rel_d = '' if rel_d == '.' else rel_d + '/'
        dirs[:] = [x for x in dirs if not FRAME_SKIP.search(rel_d + x + '/') and not linked(os.path.join(d, x))]
        for f in files:
            rel = rel_d + f
            if FRAME_SKIP.search(rel):
                continue
            full = os.path.join(d, f)
            if linked(full):
                continue
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


BATCH_MAX = 5000  # changements par lot
# fichiers que la page peut écrire dans data/ (une suppression : tout fichier de données) : texte et données, jamais une
# page, une image vectorielle ni un XML, que le navigateur exécuterait servis de la même origine que /__setup/
DATA_WRITE_EXT = ('.json', '.yaml', '.yml', '.md', '.txt', '.csv', '.geojson', '.fms', '.js')
WIN_RESERVED = re.compile(r'(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)(\..*)?', re.I)


def data_file(rel):
    """Fichier de data/ nommé par une page (« a/b/c.json », séparateur « / ») → son chemin sous data/, ou '' (refusé) :
    ni « \\ » (séparateur de Windows), ni « : » (lecteur, flux NTFS), ni caractère de contrôle, ni chemin absolu, ni
    composant vide, « . » ou « .. », ni composant finissant par un point ou une espace (Windows les retire), ni nom de
    périphérique de Windows ; puis le chemin réel (liens, jonctions) doit rester sous data/."""
    if not isinstance(rel, str) or not rel or len(rel) > 400 or rel.startswith('/') or any(c in rel for c in '\\:') or any(
            ord(c) < 32 for c in rel):
        return ''
    parts = rel.split('/')
    if any(x in ('', '.', '..') or x != x.rstrip('. ') or WIN_RESERVED.fullmatch(x) for x in parts):
        return ''
    full = os.path.join(DATA, *parts)
    base = os.path.normcase(os.path.realpath(DATA))
    return full if os.path.normcase(os.path.realpath(full)).startswith(base + os.sep) else ''


def frame_batch(a):
    """Lot d'écritures du frame { parent, message, author, changes: [{ path, text | null }] } : refusé si la tête a changé
    depuis parent (conflict) ou si un chemin sort de data/ ou est exclu ; .js au format des données seulement
    (tools/data_guard.py) ; écrit, puis commit local au nom de l'auteur si data/ est un dépôt git. Rend { ok, head }."""
    changes = a.get('changes') if isinstance(a.get('changes'), list) else []
    author = str(a.get('author') or '').upper()
    if len(changes) > BATCH_MAX:
        return {'ok': False, 'message': f'lot trop grand : {len(changes)} changements ({BATCH_MAX} au plus)'}, 400
    # un lot a un auteur : sans trigramme, l'appli garde ses écritures sur l'appareil (frame/SPEC.md § 2)
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author) or author == 'ANON':
        return {'ok': False, 'message': 'trigramme de l’auteur manquant : rien n’est écrit sans lui'}, 400
    with FRAME_LOCK:
        _tree_memo['v'] = None
        head, _ = frame_tree()
        if str(a.get('parent') or '') != head:
            return {'ok': False, 'conflict': True, 'head': head, 'message': 'data/ a changé depuis la dernière lecture'}, 409
        todo, fulls = [], {}
        for c in changes if all(isinstance(c, dict) for c in changes) else [{}]:
            # chemin pris tel quel, jamais normalisé : un chemin qu'il faudrait normaliser est refusé (data_file)
            rel = c.get('path') if isinstance(c.get('path'), str) else ''
            full = data_file(rel)
            if not full or rel.startswith('.') or '/.' in rel or FRAME_SKIP.search(rel):
                return {'ok': False, 'message': f'chemin refusé : {str(c.get("path"))[:200]}', 'path': rel}, 400
            text = c.get('text')
            if text is not None and rel.startswith('pilot/ANON/'):
                return {'ok': False, 'message': f'{rel} : document sans trigramme, gardé sur l’appareil', 'path': rel}, 400
            if text is not None and (not isinstance(text, str) or not rel.lower().endswith(DATA_WRITE_EXT)):
                return {'ok': False, 'message': f'type de fichier refusé : {rel} ({", ".join(DATA_WRITE_EXT)})', 'path': rel}, 400
            fulls[rel] = full
            if text is not None and rel.lower().endswith('.js'):
                with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
                    f.write(text)
                    tmp = f.name
                ok, why = data_guard.check_file(tmp)
                os.remove(tmp)
                if not ok:
                    return {'ok': False, 'message': f'{rel} : pas au format des données ({why})', 'path': rel}, 400
            todo.append((rel, text))
        for rel, text in todo:
            full = fulls[rel]
            if text is None:
                if os.path.isfile(full):
                    os.remove(full)
                continue
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
        bridged = registry_bridge()  # registre V2 à jour des comptes rendus, dans le même commit
        # fusion en attente dans data/ : pas de commit (git le refuserait, ou il la conclurait), et le lot le dit
        pending = data_sync.merge_pending(DATA) if todo and os.path.isdir(os.path.join(DATA, '.git')) else ''
        if todo and not pending and os.path.isdir(os.path.join(DATA, '.git')) and re.fullmatch(r'[A-Z0-9]{2,5}', author):
            paths = [r for r, _ in todo] + (['/'.join(report_bridge.REGISTRY)] if bridged else [])
            # chaque chemin est un nom de fichier, jamais un motif (« [ab].json » n'emporte pas a.json)
            env = dict(data_sync.git_env(), GIT_AUTHOR_NAME=author, GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local', GIT_LITERAL_PATHSPECS='1')
            data_sync.git(DATA, 'add', '-A', '--', *paths, env=env)
            data_sync.git(DATA, '-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local', 'commit', '-q', '-m',
                          str(a.get('message') or f'{author} : lot du frame')[:500], '--', *paths, env=env)
        head, _ = frame_tree()
        _tree_memo['v'] = None
    if any(r.startswith('disponibilites/') for r, _ in todo):
        with INDEX_LOCK:
            index_availability()
    if any(r.startswith('utilisateurs/') for r, _ in todo):
        with INDEX_LOCK:
            index_users()
    return {'ok': True, 'head': head, **({'warning': pending} if pending else {})}, 200


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
             'aviationweather.gov': '', 'metar.vatsim.net': '', 'api.open-meteo.com': ''}
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


class NotPublic(OSError):
    """Hôte relayé qui mène à une adresse non publique (réseau du poste, boucle locale) : refusé."""


def relay_host(host):
    """Hôte que le relais peut joindre : un site de l'appli (NET_HOSTS) ou le site de la compagnie."""
    return bool(host) and (host in NET_HOSTS or host == airline_host())


class _RelayHTTPS(http.client.HTTPSConnection):
    """Connexion du relais : l'adresse réellement jointe doit être publique, vérifiée avant le TLS et à chaque saut
    (un nom peut pointer vers 192.168.x ou 127.0.0.1, ou changer entre deux résolutions)."""

    def connect(self):
        http.client.HTTPConnection.connect(self)
        ip = self.sock.getpeername()[0]
        if not ipaddress.ip_address(ip.split('%')[0]).is_global:
            self.sock.close()
            raise NotPublic(f'adresse non publique : {ip}')
        self.sock = self._context.wrap_socket(self.sock, server_hostname=self._tunnel_host or self.host)


class _RelayHTTPSHandler(urllib.request.HTTPSHandler):
    def https_open(self, req):
        return self.do_open(_RelayHTTPS, req, context=self._context)


class _RelayRedirect(urllib.request.HTTPRedirectHandler):
    """Redirection suivie seulement vers un hôte que le relais peut joindre, en https ; la clé d'IVAO ne suit pas vers
    un autre hôte. Sinon la réponse de redirection est rendue telle quelle à la page."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u, o = urllib.parse.urlparse(newurl), urllib.parse.urlparse(req.full_url)
        if u.scheme != 'https' or not relay_host(u.hostname):
            return None
        new = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new is not None and u.hostname != o.hostname:
            new.remove_header('Apikey')
        return new


NET_OPENER = outbound.opener(_RelayRedirect(), _RelayHTTPSHandler(context=ssl.create_default_context()), what='relais')


def frame_net(a, site_ok=True):
    """Relais d'un appel { url, method, accept, contentType, body } : (statut, en-têtes, corps). site_ok faux (relais de la
    compagnie) : la liste blanche NET_HOSTS seule, jamais le site de la compagnie (aucun hôte choisi par la page)."""
    url = str(a.get('url') or '')
    u = urllib.parse.urlparse(url)
    site = site_ok and u.scheme == 'https' and bool(u.hostname) and u.hostname not in NET_HOSTS and u.hostname == airline_host()
    if u.scheme != 'https' or not (u.hostname in NET_HOSTS or site):
        return 403, {'Content-Type': 'application/json'}, json.dumps({'error': 'site non relayé'}).encode()
    method = str(a.get('method') or 'GET').upper()
    if method not in (('GET',) if site else ('GET', 'POST')):
        return 405, {'Content-Type': 'application/json'}, json.dumps({'error': 'méthode refusée'}).encode()
    headers = {'Accept': str(a.get('accept') or '*/*')}  # User-Agent : celui du lanceur (outbound)
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
        with NET_OPENER.open(req, timeout=20) as r:
            return r.status, {'Content-Type': r.headers.get('Content-Type') or 'application/octet-stream'}, r.read(NET_MAX)
    except urllib.error.HTTPError as e:
        return e.code, {'Content-Type': e.headers.get('Content-Type') or 'text/plain'}, e.read(NET_MAX)
    except urllib.error.URLError as e:
        if isinstance(e.reason, NotPublic):
            return 403, {'Content-Type': 'application/json'}, json.dumps({'error': str(e.reason)}).encode()
        return 502, {'Content-Type': 'text/plain', 'X-SOG-Offline': '1'}, b'unreachable'
    except NotPublic as e:
        return 403, {'Content-Type': 'application/json'}, json.dumps({'error': str(e)}).encode()
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
    req = urllib.request.Request(IVAO_API + path, headers={'Accept': 'application/json', 'apiKey': key})
    with outbound.urlopen(req, timeout=20) as r:
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
                with outbound.urlopen(urllib.request.Request(url), timeout=30) as f:
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
    req = urllib.request.Request(VATSIM_API + path, headers={'Accept': 'application/json'})
    with outbound.urlopen(req, timeout=20) as r:
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
    if data_sync.merge_pending(DATA):  # avant toute écriture dans data/ (comme l'import VFR)
        res['message'] = data_sync.merge_pending(DATA)
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


def vfr_publish(compiled, author='', apply=False):
    """Compilation VFR des cartes VAC dans le dépôt des données (tools/vfr_import.py) : apply faux, le plan seulement
    (erreurs, ou résumé : terrains, points, séquences, consignes, points non rapprochés des VRP, fichiers changés et
    retirés) ; apply vrai, écriture de sia/vfr/, commit au nom de author, puis passe de synchronisation."""
    if not data_sync.is_repo(DATA):
        return {'ok': False, 'errors': ['data/ n’est pas un dépôt git : rien à importer.'], 'summary': {}}
    p = vfr_import.plan(compiled, DATA)
    res = {'ok': p['ok'], 'errors': p['errors'], 'summary': p['summary']}
    if not p['ok'] or not apply:
        return res
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        return {**res, 'ok': False, 'errors': ['Trigramme de l’auteur manquant ou invalide.']}
    if data_sync.merge_pending(DATA):
        return {**res, 'ok': False, 'errors': [data_sync.merge_pending(DATA)]}
    vfr_import.write(p, DATA)
    env = dict(data_sync.git_env(), GIT_AUTHOR_NAME=author, GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local')
    who = ['-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local']
    data_sync.git(DATA, 'add', '-A', '--', 'sia/vfr', check=True)
    code, _ = data_sync.git(DATA, 'diff', '--cached', '--quiet')
    if code:
        s = p['summary']
        data_sync.git(DATA, *who, 'commit', '-m', f"Points de report VFR des VAC importés ({s['aerodromes']} terrains, {s['routes']} séquences ; {author})",
                      env=env, check=True)
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
REGEN = None  # travaux du module Données (tools/regen_jobs.py) : créés au premier appel (DATA est réglé au démarrage)


def regen_git():
    """git durci et son environnement pour l'état du poste ; (None, dict) sans git."""
    return (data_sync.git_cmd, data_sync.git_env) if data_sync.git_exe() else (None, dict)


def sync_gesture(a):
    """Geste « Synchroniser » d'une demande de passage (POST /__setup/sync) : le drapeau gesture de la page est une
    intention, pas une autorisation (un appareil appairé peut l'envoyer) ; tant qu'une construction de la base est en
    cours, sia/base reste sur le poste quel que soit le drapeau : un travail du module Données tourne sur ce lanceur, ou
    un fichier de sia/base non commité a été écrit il y a moins de 10 min (data_sync.building : la page V2 écrit la base
    par son dossier autorisé, sans passer par le lanceur)."""
    if not isinstance(a, dict) or a.get('gesture') is not True:
        return False
    job = ((REGEN.view() or {}).get('job') or {}) if REGEN is not None else {}
    return job.get('state') != 'running' and not data_sync.building(DATA)


UPDATE_BUSY = {'ok': False, 'done': False, 'reason': 'busy',
               'message': 'un travail du module Données ou une synchronisation est en cours : réessayez quand il est fini'}


def update_target(a):
    """La cible renvoyée par « Mettre à jour » ({ target } : le sha que « Vérifier » a montré) : '' sans elle, None si elle
    n'est pas un sha de 40 caractères hexadécimaux (→ 400)."""
    t = a.get('target', '') if isinstance(a, dict) else ''
    if t == '':
        return ''
    return t if isinstance(t, str) and suite_update.SHA.match(t) else None


def update_suite(channel, want=''):
    """« Mettre à jour » (POST /__setup/update) : refusé (reason 'busy') pendant un travail du module Données ou une
    synchronisation de data/, l'extraction changeant tools/ alors qu'un sous-processus peut encore en importer un module
    (relecture Sécurisation de 4fc473e5d). Le plan et son git fetch (jusqu'à 120 s) d'abord, hors de tout verrou ; puis
    les départs de travaux suspendus (jobs.hold : l'état, « Arrêter » et la page sans fenêtre répondent toujours) et
    SYNC_LOCK pris pour la seule écriture (plan refait sans fetch, extraction ou avance rapide) ; les deux rendus à la fin
    (relecture Sécurisation de 2a02aedde, ligne 103). want : le sha que « Vérifier » a montré ; une autre cible est refusée
    ('changed'), ici après le fetch et de nouveau au moment d'écrire (ligne 105)."""
    p = suite_update.plan(ROOT, channel)
    if no := suite_update.changed(p, want):
        return no
    if not p.get('ok') or p.get('reason') == 'up-to-date':
        return {**p, 'done': False}
    jobs = regen()
    if not jobs.hold('updating'):
        return dict(UPDATE_BUSY)
    try:
        if not SYNC_LOCK.acquire(blocking=False):
            return dict(UPDATE_BUSY)
        try:
            return suite_update.apply(ROOT, channel, fetch=False, want=want)
        finally:
            SYNC_LOCK.release()
    finally:
        jobs.release()


def regen():
    """Les travaux du module Données de ce lanceur (un à la fois)."""
    global REGEN
    if REGEN is None:
        g, env = regen_git()
        for name, why in regen_jobs.load_verbs():  # tools/regen/<jeu>.py : les verbes de chaque jeu
            say(f'  Données : {name} laissé de côté ({why}).')
        # aircraft_publish : la publication de la base des types (verbe aircraft/publish, tools/regen/aircraft.py) reste ici, avec
        # la synchronisation qu'elle déclenche ; le jeu la reçoit par son contexte
        REGEN = regen_jobs.Jobs(regen_jobs.REGISTRY, {'data': DATA, 'secrets': SECRETS, 'git_cmd': g, 'git_env': env,
                                                      'aircraft_publish': aircraft_publish, 'downloads': downloads_dirs},
                                store=os.path.join(ROOT, 'tools', '.regen_last.json'))
    return REGEN
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
    ap.add_argument('--relay', metavar='HÔTE', default='',
                    help='relais de la compagnie (R1a) derrière un proxy inverse https sur ce poste : nom public transmis par le '
                         'proxy (en-tête Host) ; jamais exposé sans le proxy, jamais sans revue de sécurité')
    ap.add_argument('--relay-port', type=int, default=0, metavar='PORT',
                    help='port du relais sur 127.0.0.1, que vise le proxy (défaut : celui de l’interface + 1)')
    ap.add_argument('--lan', action='store_true',
                    help='ouvrir aussi aux appareils du réseau local (adresses privées, code d’appairage ; jusqu’à la fermeture)')
    a = ap.parse_args()
    if a.relay and a.lan:
        ap.error('--lan et --relay ne vont pas ensemble : le relais n’écoute que sur 127.0.0.1')
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
    # base des types : à la racine (V2) ou publiée dans le dépôt des données (V3, AircraftDB/ en .json ou .js)
    published = any(os.path.exists(os.path.join(DATA, 'AircraftDB', f)) for f in ('aircraft_db.json', 'aircraft_db.js'))
    if not aircraft_files()['db'] and not published:
        say("  Base des types d'aéronefs absente : la compléter dans Paramètres › Maintenance › Références et dépendances.")
    handler = lambda *x, **k: Setup(*x, directory=ROOT, **k)
    srv = Server(('127.0.0.1', port), handler)
    try:  # localhost rapide (IPv6 locale), seulement si la machine la propose et que le port y est libre
        srv6 = Server6(('::1', port), handler)
        threading.Thread(target=srv6.serve_forever, daemon=True).start()
    except OSError:
        pass
    LAN.update(handler=handler, port=port)
    url = f'http://127.0.0.1:{port}/{a.page}?t={int(time.time())}'  # adresse neuve : page jamais reprise du cache
    say(f'  Suite servie sur http://127.0.0.1:{port}/')
    if a.lan:
        lan_open()
    if a.relay:  # --lan avec --relay : refusé plus haut
        rport = a.relay_port or port + 1
        # refus au démarrage : hôte invalide, port du relais égal à celui de l'interface (celui du réseau local aussi, fermé
        # en relais), hors limites ou occupé — jamais un relais à moitié ouvert
        if not re.fullmatch(r'[A-Za-z0-9.-]+(?::\d+)?', a.relay):
            say('  Relais : hôte invalide, lanceur arrêté.')
            return 2
        if rport == port or not 0 < rport < 65536 or not free(rport):
            say(f'  Relais : port {rport} refusé (celui de l’interface, hors limites ou occupé), lanceur arrêté.')
            return 2
        # écoute à part, 127.0.0.1 seulement : tout ce qui y arrive est du relais ; l'interface du poste reste sur son port
        RELAY.start(a.relay, rport, handler)
        say(f'  Relais de la compagnie : hôte public {RELAY.host}, sur 127.0.0.1:{rport} que vise le proxy inverse (https).')
        threading.Thread(target=relay_probe, daemon=True).start()
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
