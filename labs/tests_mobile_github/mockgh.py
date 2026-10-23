# Faux GitHub pour Playwright : API contents (brut / JSON, ETag, PUT avec sha, DELETE), branches, arbre ; dépôt = dossier REPO
import base64, hashlib, json, os, re, urllib.parse
REPO = os.path.join(os.path.dirname(__file__), 'repo')
LOG = []
def sha(b): return hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()
def handler(route, request):
    u = urllib.parse.urlparse(request.url); path = urllib.parse.unquote(u.path); h = request.headers
    LOG.append(f'{request.method} {path}')
    cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'ETag'}
    if request.method == 'OPTIONS': return route.fulfill(status=204, headers=cors)
    if 'authorization' not in h or h['authorization'] != 'Bearer TESTTOKEN': return route.fulfill(status=401, headers=cors, json={'message': 'Bad credentials'})
    m = re.match(r'^/repos/([^/]+/[^/]+)(/.*)?$', path)
    rest = m.group(2) or ''
    if rest == '': return route.fulfill(headers=cors, json={'full_name': m.group(1), 'permissions': {'push': True}})
    if rest.startswith('/branches/'): return route.fulfill(headers=cors, json={'name': rest[10:]})
    if rest.startswith('/git/trees/'):
        files = []
        for d, _, fs in os.walk(REPO):
            for f in fs:
                p = os.path.relpath(os.path.join(d, f), REPO).replace(os.sep, '/')
                files.append({'path': p, 'type': 'blob', 'sha': sha(open(os.path.join(d, f), 'rb').read())})
        return route.fulfill(headers=cors, json={'tree': files})
    if rest.startswith('/contents/'):
        rel = rest[10:]; fp = os.path.join(REPO, rel)
        if request.method == 'GET':
            if not os.path.isfile(fp): return route.fulfill(status=404, headers=cors, json={'message': 'Not Found'})
            b = open(fp, 'rb').read(); s = sha(b); et = f'"{s}"'
            if 'raw' in h.get('accept', ''):
                if h.get('if-none-match') == et: return route.fulfill(status=304, headers={**cors, 'ETag': et})
                return route.fulfill(headers={**cors, 'ETag': et, 'Content-Type': 'application/octet-stream'}, body=b)
            return route.fulfill(headers=cors, json={'sha': s, 'content': base64.b64encode(b).decode(), 'download_url': ''})
        body = json.loads(request.post_data or '{}')
        cur = sha(open(fp, 'rb').read()) if os.path.isfile(fp) else None
        if cur != body.get('sha'): return route.fulfill(status=409 if cur else 422, headers=cors, json={'message': 'sha mismatch'})
        if request.method == 'DELETE':
            os.remove(fp); return route.fulfill(headers=cors, json={'commit': {}})
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        data = base64.b64decode(body['content']); open(fp, 'wb').write(data)
        LOG.append(f'  commit « {body.get("message")} »')
        return route.fulfill(status=201 if not cur else 200, headers=cors, json={'content': {'sha': sha(data)}})
    return route.fulfill(status=404, headers=cors, json={'message': 'Not Found'})
