"""Faux GitLab (bibliothèque standard + le programme openssl) pour jouer l'assistant « Rejoindre la compagnie » d'un projet GitLab sans réseau.

Sur le modèle de fake_github.py. Sert, sur un seul port, en HTTPS (le transport GitLab de la page refuse tout autre schéma : api https://<hôte>/api/v4) :
  · les fichiers du dépôt du code (la page frame/index.html et ses scripts) ;
  · l'API REST v4 d'un projet en mémoire, `test-airline/data`, branche `main` : GET /user (un robot de projet, bot: true),
    GET /personal_access_tokens/self (droits api et write_repository, expiration dans 90 jours), la branche, l'arbre (?recursive, une page), les fichiers bruts,
    POST /repository/commits (create / update / delete) ; le reste répond 404. Tout jeton « glpat-… » est accepté (jamais un vrai : celui d'essai est inventé) ;
    sans lui, ou sans l'en-tête PRIVATE-TOKEN, 401 ;
  · des commandes d'essai, sous /__test/ : reset (projet vide, ou fichiers donnés), stats (commits, fichiers, appels).
Le certificat est jetable : généré à chaque lancement dans un dossier temporaire par `openssl req -x509` (le programme d'OpenSSL, celui de Git pour Windows convient) ; le navigateur d'essai est
lancé avec --ignore-certificate-errors et --host-resolver-rules="MAP <hôte> 127.0.0.1:<port>" (frame/help/tutorial/capture.py --kind gitlab) : aucun réseau réel.

Usage : python frame/store/test/fake_gitlab.py [port]   (8782 par défaut ; hôte fictif : gitlab.example.test, que seul le navigateur d'essai résout, vers 127.0.0.1)
"""
import hashlib, http.server, json, os, shutil, ssl, subprocess, sys, tempfile, threading, urllib.parse, datetime

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8782
HOST = 'gitlab.example.test'
PROJECT = 'test-airline/data'
BRANCH = 'main'
LOCK = threading.Lock()


def sha1(b):
    return hashlib.sha1(b).hexdigest()


class Project:
    """Un projet en mémoire : des commits (chacun l'arbre entier { chemin: texte }) sur une branche."""

    def __init__(self, files=None):
        self.commits = []   # [{ id, parent, files, message, changed }]
        self.calls = []
        self.commit({p: t for p, t in (files or {}).items()}, 'initial', [])

    @property
    def head(self):
        return self.commits[-1]

    def commit(self, files, message, changed):
        parent = self.commits[-1]['id'] if self.commits else None
        cid = sha1(json.dumps([parent, message, sorted(files.items()), len(self.commits)]).encode())
        self.commits.append({'id': cid, 'parent': parent, 'files': dict(files), 'message': message, 'changed': changed})
        return cid

    @staticmethod
    def blob_id(text):
        b = text.encode('utf-8')
        return sha1(b'blob %d\0' % len(b) + b)

    def blob(self, bid):
        for c in reversed(self.commits):
            for t in c['files'].values():
                if self.blob_id(t) == bid:
                    return t
        return None


PROJ = Project()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}') if n else {}

    def _api(self, method):
        u = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(x) for x in u.path.split('/')[3:]]  # '', 'api', 'v4', …
        if not self.headers.get('PRIVATE-TOKEN', '').startswith('glpat-'):
            return self._json({'message': '401 Unauthorized'}, 401)
        PROJ.calls.append(f'{method} {"/".join(parts[:4])}')
        if parts == ['user'] and method == 'GET':
            return self._json({'id': 7, 'username': 'project_1_bot_tst', 'bot': True})
        if parts == ['personal_access_tokens', 'self'] and method == 'GET':
            return self._json({'id': 3, 'user_id': 7, 'scopes': ['api', 'write_repository'], 'expires_at': (datetime.date.today() + datetime.timedelta(days=90)).isoformat()})
        if len(parts) >= 3 and parts[0] == 'projects' and parts[1] == PROJECT:
            rest = parts[2:]
            if rest[:2] == ['repository', 'branches'] and method == 'GET':
                return self._json({'name': BRANCH, 'commit': {'id': PROJ.head['id']}}) if rest[2:] == [BRANCH] else self._json({'message': '404 Branch Not Found'}, 404)
            if rest == ['repository', 'tree'] and method == 'GET':
                files = PROJ.head['files']
                return self._json([{'id': PROJ.blob_id(t), 'name': p.rsplit('/', 1)[-1], 'type': 'blob', 'path': p, 'mode': '100644'} for p, t in sorted(files.items())])
            if rest[:2] == ['repository', 'blobs'] and rest[-1] == 'raw' and method == 'GET':
                t = PROJ.blob(rest[2])
                if t is None:
                    return self._json({'message': '404 Not Found'}, 404)
                b = t.encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Length', str(len(b)))
                self.end_headers()
                self.wfile.write(b)
                return
            if rest == ['repository', 'commits'] and method == 'POST':
                body = self._body()
                files, changed = dict(PROJ.head['files']), []
                for a in body.get('actions', []):
                    p = a.get('file_path')
                    if a.get('action') == 'delete':
                        files.pop(p, None)
                    elif a.get('action') in ('create', 'update'):
                        c = a.get('content', '')
                        if a.get('encoding') == 'base64':
                            import base64
                            c = base64.b64decode(c).decode('utf-8', 'replace')
                        files[p] = c
                    changed.append(p)
                parent = PROJ.head['id']
                cid = PROJ.commit(files, body.get('commit_message', ''), sorted(changed))
                return self._json({'id': cid, 'parent_ids': [parent]}, 201)
        return self._json({'message': '404 Not Found'}, 404)

    def _test(self, method):
        global PROJ
        cmd = urllib.parse.urlparse(self.path).path.split('/')[2]
        body = self._body() if method == 'POST' else {}
        if cmd == 'reset':
            PROJ = Project(body.get('files'))
            return self._json({'head': PROJ.head['id']})
        if cmd == 'stats':
            return self._json({'head': PROJ.head['id'], 'commits': [[c['id'], c['message'], c['changed']] for c in PROJ.commits], 'files': PROJ.head['files'], 'calls': PROJ.calls})
        return self._json({'message': 'unknown'}, 404)

    def _route(self, method):
        p = urllib.parse.urlparse(self.path).path
        with LOCK:
            if p.startswith('/api/v4/'):
                return self._api(method)
            if p.startswith('/__test/'):
                return self._test(method)
        if method == 'GET':
            return super().do_GET()
        self.send_error(405)

    def do_GET(self):
        self._route('GET')

    def do_POST(self):
        self._route('POST')


def openssl():
    """Le programme openssl : dans le PATH, sinon celui de Git pour Windows."""
    exe = shutil.which('openssl')
    if exe:
        return exe
    for p in (r'C:\Program Files\Git\usr\bin\openssl.exe', r'C:\Program Files\Git\mingw64\bin\openssl.exe'):
        if os.path.isfile(p):
            return p
    sys.exit('openssl introuvable : le faux GitLab sert en HTTPS (certificat jetable)')


def tls_context(folder):
    """Un certificat auto-signé jetable (hôte gitlab.example.test, 2 jours), jamais gardé."""
    key, crt = os.path.join(folder, 'k.pem'), os.path.join(folder, 'c.pem')
    subprocess.run([openssl(), 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '2', '-subj', f'/CN={HOST}',
                    '-addext', f'subjectAltName=DNS:{HOST}'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(crt, key)
    return ctx


if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='sog-fake-gitlab-') as folder:
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H)
        srv.socket = tls_context(folder).wrap_socket(srv.socket, server_side=True)
        print(f'faux GitLab : https://{HOST}/ (le navigateur d\'essai le résout vers 127.0.0.1:{PORT})')
        srv.serve_forever()
