"""Faux GitHub (bibliothèque standard) pour les essais de la couche de données du cadre V3 (frame/store/).

Sert, sur un seul port :
  · les fichiers de la suite (racine du dépôt du code) : la page d'essai frame/store/test/index.html et ses scripts ;
  · l'API git data d'un dépôt en mémoire, sous /api/repos/<compte>/<dépôt>/git/… : ref (requête conditionnelle :
    ETag, 304), commits, trees (?recursive=1 ; création sur base_tree, suppression par sha: null), blobs (brut ou
    base64), refs (PATCH sans forcer : 422 si la branche a bougé). Empreinte des blobs : celle de git (sha-1 de
    « blob <n>\\0<contenu> ») ; arbres et commits : empreintes stables de leur contenu ;
  · des commandes d'essai, sous /__test/ : reset (dépôt vide, ou fichiers donnés), write (commit d'un autre appareil),
    race (le prochain PATCH de la branche est précédé d'un commit d'un autre appareil : poussée refusée une fois),
    offline (toutes les requêtes de l'API coupées), stats (commits, fichiers de chacun, appels).

Usage : python frame/store/test/fake_github.py [port]   (8790 par défaut ; page : http://127.0.0.1:8790/frame/store/test/)
"""
import base64, hashlib, http.server, json, os, sys, threading, urllib.parse

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
LOCK = threading.Lock()


def sha1(b):
    return hashlib.sha1(b).hexdigest()


class Repo:
    def __init__(self, files=None):
        self.blobs, self.trees, self.commits = {}, {}, {}
        self.head, self.race, self.offline, self.calls = None, None, False, []
        self.commit_files = []  # [(sha, message, [chemins changés])]
        self.head = self.make_commit(self.make_tree({p: self.blob(t) for p, t in (files or {}).items()}), [], 'initial', [])

    def blob(self, text):
        b = text.encode('utf-8')
        s = sha1(b'blob %d\0' % len(b) + b)
        self.blobs[s] = b
        return s

    def make_tree(self, entries):
        s = sha1(('tree ' + json.dumps(sorted(entries.items()))).encode())
        self.trees[s] = dict(entries)
        return s

    def make_commit(self, tree, parents, message, changed):
        s = sha1(('commit ' + json.dumps([tree, parents, message, len(self.commits)])).encode())
        self.commits[s] = {'tree': tree, 'parents': parents, 'message': message}
        self.commit_files.append([s, message, changed])
        return s

    def files(self, commit=None):
        return self.trees[self.commits[commit or self.head]['tree']]

    def write(self, changes, message):
        """Commit direct (autre appareil) : {chemin: texte | None}."""
        entries = dict(self.files())
        for p, t in changes.items():
            if t is None:
                entries.pop(p, None)
            else:
                entries[p] = self.blob(t)
        self.head = self.make_commit(self.make_tree(entries), [self.head], message, sorted(changes))
        return self.head


REPO = Repo()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, obj, code=200, extra=None):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}') if n else {}

    def _api(self, method):
        global REPO
        u = urllib.parse.urlparse(self.path)
        parts = u.path.split('/')  # '', 'api', 'repos', owner, repo, 'git', kind, ...
        if REPO.offline:
            self.close_connection = True
            self.connection.shutdown(2)  # réseau coupé
            return
        if not self.headers.get('Authorization', '').startswith('Bearer '):
            return self._json({'message': 'Bad credentials'}, 401)
        kind, rest = parts[6], parts[7:]
        REPO.calls.append(f'{method} {kind}')
        if kind == 'ref' and method == 'GET':
            etag = '"%s"' % REPO.head
            if self.headers.get('If-None-Match') == etag:
                self.send_response(304)
                self.end_headers()
                return
            return self._json({'ref': 'refs/heads/' + '/'.join(rest[1:]), 'object': {'sha': REPO.head, 'type': 'commit'}}, extra={'ETag': etag})
        if kind == 'commits' and method == 'GET':
            c = REPO.commits.get(rest[0])
            return self._json({'sha': rest[0], 'tree': {'sha': c['tree']}, 'parents': [{'sha': p} for p in c['parents']], 'message': c['message']}) if c else self._json({'message': 'Not Found'}, 404)
        if kind == 'trees' and method == 'GET':
            t = REPO.trees.get(rest[0])
            if t is None:
                return self._json({'message': 'Not Found'}, 404)
            return self._json({'sha': rest[0], 'truncated': False, 'tree': [{'path': p, 'mode': '100644', 'type': 'blob', 'sha': s} for p, s in sorted(t.items())]})
        if kind == 'blobs' and method == 'GET':
            b = REPO.blobs.get(rest[0])
            if b is None:
                return self._json({'message': 'Not Found'}, 404)
            if 'raw' in (self.headers.get('Accept') or ''):
                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Length', str(len(b)))
                self.end_headers()
                self.wfile.write(b)
                return
            return self._json({'sha': rest[0], 'encoding': 'base64', 'content': base64.b64encode(b).decode()})
        if kind == 'trees' and method == 'POST':
            body = self._body()
            entries = dict(REPO.trees.get(body.get('base_tree'), {}))
            for e in body.get('tree', []):
                if e.get('sha', 1) is None:
                    if e['path'] not in entries:
                        return self._json({'message': f"path {e['path']} not in base tree"}, 422)
                    entries.pop(e['path'])
                else:
                    entries[e['path']] = REPO.blob(e['content']) if 'content' in e else e['sha']
            return self._json({'sha': REPO.make_tree(entries)}, 201)
        if kind == 'commits' and method == 'POST':
            body = self._body()
            base = REPO.trees[REPO.commits[body['parents'][0]]['tree']] if body.get('parents') else {}
            new = REPO.trees[body['tree']]
            changed = sorted({p for p in set(base) | set(new) if base.get(p) != new.get(p)})
            return self._json({'sha': REPO.make_commit(body['tree'], body.get('parents', []), body.get('message', ''), changed)}, 201)
        if kind == 'refs' and method == 'PATCH':
            body = self._body()
            if REPO.race:  # un autre appareil pousse juste avant
                REPO.write(REPO.race, 'autre appareil (course)')
                REPO.race = None
            if REPO.commits.get(body['sha'], {}).get('parents', [None])[0] != REPO.head and not body.get('force'):
                return self._json({'message': 'Update is not a fast forward'}, 422)
            REPO.head = body['sha']
            return self._json({'object': {'sha': REPO.head}})
        return self._json({'message': 'Not Found'}, 404)

    def _test(self, method):
        global REPO
        u = urllib.parse.urlparse(self.path)
        cmd = u.path.split('/')[2]
        body = self._body() if method == 'POST' else {}
        if cmd == 'reset':
            REPO = Repo(body.get('files'))
            return self._json({'head': REPO.head})
        if cmd == 'write':
            return self._json({'head': REPO.write(body['files'], body.get('message', 'autre appareil'))})
        if cmd == 'race':
            REPO.race = body['files']
            return self._json({'ok': True})
        if cmd == 'offline':
            REPO.offline = bool(body.get('on'))
            return self._json({'offline': REPO.offline})
        if cmd == 'stats':
            return self._json({'head': REPO.head, 'commits': REPO.commit_files, 'files': {p: REPO.blobs[s].decode('utf-8') for p, s in REPO.files().items()}, 'calls': REPO.calls})
        return self._json({'message': 'unknown'}, 404)

    def _route(self, method):
        p = urllib.parse.urlparse(self.path).path
        with LOCK:
            if p.startswith('/api/repos/'):
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

    def do_PATCH(self):
        self._route('PATCH')


if __name__ == '__main__':
    print(f'faux GitHub et suite : http://127.0.0.1:{PORT}/frame/store/test/')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
