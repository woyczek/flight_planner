"""Release page on framagit (GitLab) for a published version: the version's CHANGELOG section as description, the
delivery archives (suite and module packages from dist/) uploaded to the project and linked as release assets.

Usage (at the repository root, after the tag v<version> is pushed and tools/publish_dist.py has built dist/):
    set FRAMAGIT_TOKEN=<personal access token, scope api>      (Windows)   /   export FRAMAGIT_TOKEN=…   (bash)
    python tools/framagit_release.py                 # version of config/repository_tree › release.version
    python tools/framagit_release.py 5.3.0           # a given version
    python tools/framagit_release.py 5.3.0 --dry-run # prints what would be sent, sends nothing

The token is read from the environment only: never written, never printed, never stored. An existing release of the
same tag is updated (description and links). Project: the "origin" or "framagit" remote of the repository.

Archives go to the project's generic package registry (packages/generic/<name>/<version>/<file>: no size limit of the
upload form, which refuses the 96 MB suite archive with HTTP 413); a file the registry refuses is tried as a project
upload (small files only), and a file that cannot be sent is reported, the release being created without it.
"""
import argparse, io, json, mimetypes, os, re, subprocess, sys, urllib.parse, urllib.request, uuid

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PREFIX = 'xplane-web-suite'


def remote_project():
    """GitLab host and project path (asr/flight_planner) from the framagit or origin remote."""
    out = subprocess.run(['git', 'remote', '-v'], cwd=ROOT, capture_output=True, text=True).stdout
    for name in ('framagit', 'origin'):
        m = re.search(r'^%s\s+(?:git@|https://)([^:/]+)[:/](.+?)(?:\.git)?\s+\(push\)' % name, out, re.M)
        if m:
            return m.group(1), m.group(2)
    sys.exit('no framagit / origin remote found')


def tree_version():
    """Published version in config/repository_tree › release.version."""
    s = io.open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8').read()
    m = re.search(r'release:\{[^}]*version:"([^"]+)"', s)
    return m.group(1) if m else sys.exit('release.version not found in config/repository_tree')


def changelog_section(version):
    """The CHANGELOG section of the version (without its heading), as the release description."""
    s = io.open(os.path.join(ROOT, 'docs', 'CHANGELOG.md'), encoding='utf-8').read().replace('\r\n', '\n')
    m = re.search(r'^## \[%s\][^\n]*\n(.*?)(?=^## \[|\Z)' % re.escape(version), s, re.M | re.S)
    return m.group(1).strip() if m else sys.exit('section ## [%s] not found in docs/CHANGELOG.md' % version)


def api(host, path, token, method='GET', data=None, files=None, raw=None, strict=True):
    """One GitLab API call; JSON in, JSON out. files = {field: path} → multipart upload ; raw = path → body is the file
    itself (generic package registry). strict=False returns None on an HTTP error instead of exiting."""
    url = 'https://%s/api/v4/%s' % (host, path)
    headers = {'PRIVATE-TOKEN': token}
    body = None
    if raw:
        body = open(raw, 'rb').read()
        headers['Content-Type'] = 'application/octet-stream'
    elif files:
        boundary = uuid.uuid4().hex
        parts = []
        for field, fpath in files.items():
            name = os.path.basename(fpath)
            ctype = mimetypes.guess_type(name)[0] or 'application/octet-stream'
            parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: %s\r\n\r\n' % (
                boundary, field, name, ctype)).encode('utf-8') + open(fpath, 'rb').read() + b'\r\n')
        body = b''.join(parts) + ('--%s--\r\n' % boundary).encode('utf-8')
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
    elif data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            return json.loads(r.read().decode('utf-8') or 'null')
    except urllib.error.HTTPError as e:
        msg = '%s %s → HTTP %s: %s' % (method, path, e.code, e.read().decode('utf-8', 'replace')[:400])
        if strict:
            sys.exit(msg)
        print('  ', msg)
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('version', nargs='?', default=None)
    ap.add_argument('--dist', default=os.path.join(ROOT, 'dist'), help='archives folder (default dist/)')
    ap.add_argument('--dry-run', action='store_true', help='print what would be sent, send nothing')
    a = ap.parse_args()
    version = a.version or tree_version()
    tag = 'v' + version
    host, project = remote_project()
    pid = urllib.parse.quote(project, safe='')
    description = changelog_section(version)
    archives = [p for p in (os.path.join(a.dist, '%s-%s.zip' % (PREFIX, version)),) if os.path.isfile(p)]
    archives += sorted(os.path.join(a.dist, f) for f in os.listdir(a.dist) if re.match(r'.+-module-%s\.zip$' % re.escape(version), f)) if os.path.isdir(a.dist) else []
    print('project %s on %s · tag %s · %d archive(s) · description %d characters' % (project, host, tag, len(archives), len(description)))
    for p in archives:
        print('  ', os.path.basename(p), '%d KB' % (os.path.getsize(p) // 1024))
    if a.dry_run:
        print(description[:600] + ('…' if len(description) > 600 else ''))
        return
    token = os.environ.get('FRAMAGIT_TOKEN') or os.environ.get('GITLAB_TOKEN')
    if not token:
        sys.exit('FRAMAGIT_TOKEN (or GITLAB_TOKEN) is not set: a personal access token with the "api" scope, read from the environment only')
    # uploads (project markdown uploads), then release create-or-update, then asset links
    links, missing = [], []
    for p in archives:
        name = os.path.basename(p)
        # 1. generic package registry (large files accepted) ; 2. project upload (small files) ; 3. reported as missing
        pkg = 'projects/%s/packages/generic/%s/%s/%s' % (pid, PREFIX, version, urllib.parse.quote(name, safe=''))
        if api(host, pkg, token, 'PUT', raw=p, strict=False) is not None:
            links.append({'name': name, 'url': 'https://%s/api/v4/%s' % (host, pkg), 'link_type': 'package'})
            print('uploaded to the package registry', name)
            continue
        up = api(host, 'projects/%s/uploads' % pid, token, 'POST', files={'file': p}, strict=False)
        if up:
            url = up.get('full_path') or up.get('url')
            if url and url.startswith('/'):
                url = 'https://%s%s' % (host, url)
            links.append({'name': name, 'url': url, 'link_type': 'package'})
            print('uploaded as a project file', name)
        else:
            missing.append(name)
            print('NOT uploaded', name, '(too large for this server: attach it by hand, or publish it elsewhere and add the link)')
    existing = None
    try:
        existing = api(host, 'projects/%s/releases/%s' % (pid, urllib.parse.quote(tag, safe='')), token)
    except SystemExit:
        existing = None
    payload = {'name': 'Version %s' % version, 'tag_name': tag, 'description': description}
    if existing:
        api(host, 'projects/%s/releases/%s' % (pid, urllib.parse.quote(tag, safe='')), token, 'PUT', payload)
        print('release updated')
        old = api(host, 'projects/%s/releases/%s/assets/links' % (pid, urllib.parse.quote(tag, safe='')), token) or []
        for l in old:
            api(host, 'projects/%s/releases/%s/assets/links/%s' % (pid, urllib.parse.quote(tag, safe=''), l['id']), token, 'DELETE')
    else:
        payload['assets'] = {'links': links}
        api(host, 'projects/%s/releases' % pid, token, 'POST', payload)
        print('release created')
        links = []
    for l in links:
        api(host, 'projects/%s/releases/%s/assets/links' % (pid, urllib.parse.quote(tag, safe='')), token, 'POST', l)
    print('https://%s/%s/-/releases/%s' % (host, project, tag))
    if missing:
        print('missing on the release page:', ', '.join(missing))


if __name__ == '__main__':
    main()
