"""Archive de livraison d'une version publiée : dist/xplane-web-suite-<version>.zip, son empreinte SHA-256 et sa mention
dans le CHANGELOG.

L'archive contient le code seul : les fichiers suivis par git au tag de la version (v<version>), sous le dossier
xplane-web-suite-<version>/, sans aucune donnée — ni data/ (dépôt séparé, jamais dans le dépôt du code), ni les jeux
d'exemple (examples/ : EXCLUS ci-dessous). Comme « git archive », mais avec les vraies images : les fichiers gérés par Git LFS
(images, polices…) sont pris dans le magasin LFS local (.git/lfs/objects), et non laissés en pointeurs de quelques
octets. Objet LFS absent localement : « git lfs fetch origin v<version> » est lancé une fois, puis l'archive est
refaite ; s'il manque encore, rien n'est écrit.

Les archives ne sont pas versionnées (dist/ est ignoré par git). L'empreinte est écrite à côté
(xplane-web-suite-<version>.zip.sha256, format de sha256sum) et, sauf --sans-changelog, inscrite dans docs/CHANGELOG.md :
rubrique « ### Livraison » en fin de la section « ## [<version>] » (remplacée si l'archive est refaite) ; à commiter.

Paquets de modules (sauf --sans-modules) : pour chaque module de MODULES présent au tag, dist/<nom>-module-<version>.zip
(dossier <nom>-module-<version>/) — ses scripts, sa page d'exemple (scripts chargés à côté d'elle, sans empreinte),
ses prompts de spécification et d'intégration, un README et la licence du code (MPL 2.0) et celle des documents
(CC BY-SA 4.0) ; empreinte à côté, ligne de plus sous « ### Livraison » du CHANGELOG et sous « ### Delivery » de
docs/VERSION.md. Module absent au tag (version plus ancienne) : sauté, avec un message.

Usage (à la racine du dépôt, après la publication de la version : tag v<version> poussé, MANUEL_EXPLOITATION §6) :
    python tools/publish_dist.py                       # version publiée (config/repository_tree › release.version)
    python tools/publish_dist.py 4.8.0                 # une version donnée (tag v4.8.0)
    python tools/publish_dist.py 4.8.0 --dist E:/DEFA/dist   # autre dossier de sortie (défaut : dist/ du dépôt)
    python tools/publish_dist.py 4.8.0 --sans-changelog      # archive et empreinte seulement
    python tools/publish_dist.py 4.8.0 --force               # refaire une archive existante
    python tools/publish_dist.py 4.8.0 --sans-modules        # sans les paquets de modules
    python tools/publish_dist.py --modules-seulement --ref HEAD --sans-changelog --dist <dossier>   # essai d'un paquet
Lanceurs : tools/publish_dist.sh (bash) et tools/publish_dist.cmd (Windows), mêmes arguments.
"""
import argparse, hashlib, io, os, re, subprocess, sys, time, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # tools/version_stamps.py

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PREFIX = 'xplane-web-suite'
# données, même fictives : jamais livrées (le code seul ; les données viennent du dépôt de données, INSTALL.md)
EXCLUS = ('examples/', 'data/')
LFS_HEAD = b'version https://git-lfs.github.com/spec/v1'
# modules livrés à part : chemin dans le paquet → chemin dans le dépôt ; example : page d'exemple dont les scripts du
# dépôt (../shared/x.js?v=0) sont chargés à côté d'elle (x.js)
MODULES = {
    'dispos': {
        'files': {
            'dispos_timeline.js': 'shared/dispos_timeline.js',
            'dispos_formats.js': 'shared/dispos_formats.js',
            'example.html': 'labs/dispos_timeline.html',
            'DISPOS_TIMELINE_SPEC.md': 'docs/technique/DISPOS_TIMELINE_SPEC.md',
            'DISPOS_TIMELINE_INTEGRATION.md': 'docs/technique/DISPOS_TIMELINE_INTEGRATION.md',
            'LICENSE': 'LICENSES/MPL-2.0.txt',
            'LICENSE-docs-CC-BY-SA-4.0.txt': 'LICENSES/CC-BY-SA-4.0.txt',
        },
        'example': 'example.html',
        'readme': '''# Availability timeline module (dispos) — {version}

A self-contained component (no dependency, no build step, plain `<script>` files) to enter a person's availability
for one ISO week on a continuous time axis, in UTC: background bands for the nature of the unavailability,
availability rectangles on top, one state per minute.

- `dispos_timeline.js` — the component (`window.DisposTimeline.mount(host, options)`); English texts by default, any
  other language through the `labels` or `t` option.
- `dispos_formats.js` — readers and writers (`window.DisposFormats`): the native format (schema 3) and the X-Plane Web
  Suite weekly declaration (schema 2); register your own. Load it after the component.
- `example.html` — a working page (French labels, data in this browser's localStorage); open it from this folder.
- `DISPOS_TIMELINE_INTEGRATION.md` — how to put the component into another single-page HTML application: the prompt
  to give an LLM, or the guide to follow by hand. Start here.
- `DISPOS_TIMELINE_SPEC.md` — the complete description of the component (data, rules, gestures, API), enough to
  regenerate it without the code.

From X-Plane Web Suite (DEFA Virtual), <https://framagit.org/asr/flight_planner>. Code: Mozilla Public License 2.0
(`LICENSE`). Documents: CC BY-SA 4.0 (`LICENSE-docs-CC-BY-SA-4.0.txt`), © Gaétan Ryckeboer (RBR) and contributors.
''',
    },
}


def git(*args, binary=False):
    r = subprocess.run(['git', *args], cwd=ROOT, capture_output=True)
    if r.returncode:
        raise SystemExit(f"git {' '.join(args)} : {r.stderr.decode('utf-8', 'replace').strip()}")
    return r.stdout if binary else r.stdout.decode('utf-8')


def released_version():
    """Version publiée d'après config/repository_tree (bloc release)."""
    tree = io.open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8').read()
    block = re.search(r'release\s*:\s*\{([^}]*)\}', tree)
    m = block and re.search(r'version\s*:\s*"([^"]+)"', block.group(1))
    if not m:
        raise SystemExit('version publiée introuvable (config/repository_tree › release.version)')
    return m.group(1)


def lfs_store():
    common = git('rev-parse', '--git-common-dir').strip()
    return os.path.join(common if os.path.isabs(common) else os.path.join(ROOT, common), 'lfs', 'objects')


def lfs_object(pointer, store):
    """Contenu réel d'un pointeur LFS (None si l'objet n'est pas dans le magasin local)."""
    m = re.search(rb'oid sha256:([0-9a-f]{64})', pointer)
    if not m:
        return None
    oid = m.group(1).decode()
    p = os.path.join(store, oid[:2], oid[2:4], oid)
    if not os.path.isfile(p):
        return None
    data = open(p, 'rb').read()
    return data if hashlib.sha256(data).hexdigest() == oid else None


def entries(tag):
    """(chemin, mode, sha du blob) de tous les fichiers suivis au tag (sous-modules exclus)."""
    out = []
    for line in git('ls-tree', '-r', '-z', '--full-tree', tag).split('\0'):
        if not line:
            continue
        meta, path = line.split('\t', 1)
        mode, kind, sha = meta.split()
        if kind == 'blob' and not path.startswith(EXCLUS):
            out.append((path, mode, sha))
    return out


def build(version, tag, out_zip):
    """Écrit l'archive ; retourne la liste des objets LFS manquants (archive non écrite s'il en manque)."""
    store = lfs_store()
    files = entries(tag)
    when = time.localtime(int(git('log', '-1', '--format=%ct', tag).strip()))[:6]  # date du commit tagué
    missing, buf = [], io.BytesIO()
    # les fichiers du tag sont d'abord extraits dans un dossier temporaire : les empreintes de livraison (?v=…) se
    # calculent d'un fichier à l'autre (une page dépend de ses scripts, un script de ses images), comme le lanceur les
    # pose en servant (tools/version_stamps.py) — le dépôt, lui, reste à « ?v=0 »
    import tempfile
    import version_stamps as vs
    tmp = tempfile.mkdtemp(prefix='sog-dist-')
    kept = []
    for path, mode, sha in files:
        data = git('cat-file', 'blob', sha, binary=True)
        if data.startswith(LFS_HEAD) and len(data) < 1024:
            real = lfs_object(data, store)
            if real is None:
                missing.append(path)
                continue
            data = real
        full = os.path.join(tmp, *path.split('/'))
        os.makedirs(os.path.dirname(full), exist_ok=True)
        open(full, 'wb').write(data)
        kept.append((path, mode, full))
    vs.ROOT, vs.SHARED = tmp, os.path.join(tmp, 'shared')
    vs._memo.clear()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path, mode, full in kept:
            data = vs.serve(full)[0] if vs.stamped(full) else open(full, 'rb').read()
            info = zipfile.ZipInfo(f'{PREFIX}-{version}/{path}', date_time=when)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100755 if mode == '100755' else 0o100644) << 16
            z.writestr(info, data)
    if not missing:
        os.makedirs(os.path.dirname(out_zip), exist_ok=True)
        open(out_zip, 'wb').write(buf.getvalue())
    return len(files), missing


def build_module(name, version, ref, out_dir):
    """Paquet d'un module (fichiers lus au ref, horodatage de son commit) : chemin du zip, ou None si le module n'existe
    pas au ref."""
    mod = MODULES[name]
    present = set(git('ls-tree', '-r', '--name-only', '--full-tree', ref).splitlines())
    absent = [p for p in mod['files'].values() if p not in present]
    if absent:
        print(f'module {name} : absent de {ref} ({absent[0]}…), paquet sauté.')
        return None
    when = time.localtime(int(git('log', '-1', '--format=%ct', ref).strip()))[:6]
    base = f'{name}-module-{version}'
    out_zip = os.path.join(out_dir, f'{base}.zip')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:

        def put(path, data):
            info = zipfile.ZipInfo(f'{base}/{path}', date_time=when)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, data)

        for path, src in mod['files'].items():
            data = git('show', f'{ref}:{src}', binary=True)
            if path == mod.get('example'):  # scripts du dépôt chargés à côté de la page, sans empreinte
                data = re.sub(rb'src="(?:\.\./)+shared/([\w.-]+\.js)(?:\?v=[^"]*)?"', rb'src="\1"', data)
            put(path, data)
        put('README.md', mod['readme'].format(version=version).encode('utf-8'))
    os.makedirs(out_dir, exist_ok=True)
    open(out_zip, 'wb').write(buf.getvalue())
    return out_zip


def version_md(version, lines):
    """Sous-rubrique « ### Delivery » en fin de la section de la version dans docs/VERSION.md (remplacée)."""
    p = os.path.join(ROOT, 'docs', 'VERSION.md')
    s = io.open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    head = re.search(r'^## ' + re.escape(version) + r'\b[^\n]*\n', s, re.M)
    if not head:
        print(f'VERSION.md : section « ## {version} » introuvable, rien ajouté.')
        return
    nxt = re.search(r'^## ', s[head.end():], re.M)
    end = head.end() + (nxt.start() if nxt else len(s) - head.end())
    body = s[head.end():end]
    d = re.search(r'^### Delivery\s*$', body, re.M)
    if d:  # rubrique précédente retirée (jusqu'à la rubrique suivante)
        after = re.search(r'^### ', body[d.end():], re.M)
        body = body[:d.start()] + (body[d.end() + after.start():] if after else '')
    section = body.strip('\r\n')
    out = s[:head.end()] + nl + section + nl + nl + '### Delivery' + nl + nl + nl.join(lines) + nl + nl + s[end:]
    io.open(p, 'w', encoding='utf-8', newline='').write(out)
    print(f'VERSION.md : rubrique « Delivery » de la section {version} écrite (à commiter).')


def changelog(version, name, digest, modules=()):
    """Sous-rubrique « ### Livraison » en fin de la section de la version : ligne de l'archive (remplacée si déjà là)."""
    p = os.path.join(ROOT, 'docs', 'CHANGELOG.md')
    s = io.open(p, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    head = re.search(r'^## \[' + re.escape(version) + r'\][^\n]*\n', s, re.M)
    if not head:
        print(f'CHANGELOG : section « ## [{version}] » introuvable, rien ajouté.')
        return
    nxt = re.search(r'^## \[', s[head.end():], re.M)
    end = head.end() + (nxt.start() if nxt else len(s) - head.end())
    # rubrique et ligne d'une archive précédente retirées (archive refaite : une seule ligne)
    lines = [x for x in s[head.end():end].splitlines() if x.strip() != '### Livraison' and not x.startswith(('- Archive de livraison : ', '- Module package: '))]
    section = nl.join(lines).strip('\r\n')
    line = nl.join([f'- Archive de livraison : `{name}` — SHA-256 `{digest}` (code seul, hors dépôt : dossier `dist/`).', *module_lines(modules)])
    out = s[:head.end()] + nl + section + nl + nl + '### Livraison' + nl + nl + line + nl + nl + s[end:]
    io.open(p, 'w', encoding='utf-8', newline='').write(out)
    print(f'CHANGELOG : rubrique « Livraison » de la section {version} écrite (à commiter).')


def module_lines(modules):
    """Lignes « Livraison » / « Delivery » des paquets de modules : [(nom du zip, empreinte)]."""
    return [f'- Module package: `{n}` — SHA-256 `{d}` (outside the repository: `dist/` folder).' for n, d in modules]


def sha_file(path):
    """Empreinte SHA-256 d'un fichier, écrite à côté (format de sha256sum)."""
    digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    io.open(path + '.sha256', 'w', encoding='utf-8', newline='\n').write(f'{digest}  {os.path.basename(path)}\n')
    return digest


def main():
    ap = argparse.ArgumentParser(description='Archive de livraison d’une version publiée (dist/).')
    ap.add_argument('version', nargs='?', help='version (x.y.z) ; défaut : version publiée de config/repository_tree')
    ap.add_argument('--dist', default=os.path.join(ROOT, 'dist'), help='dossier de sortie (défaut : dist/ du dépôt)')
    ap.add_argument('--sans-changelog', action='store_true', help='ne pas écrire la ligne dans docs/CHANGELOG.md')
    ap.add_argument('--force', action='store_true', help='refaire une archive existante')
    ap.add_argument('--sans-modules', action='store_true', help='sans les paquets de modules (MODULES)')
    ap.add_argument('--modules-seulement', action='store_true', help='les paquets de modules seuls, sans l’archive')
    ap.add_argument('--ref', help='révision lue pour les paquets de modules (défaut : le tag ; essai : HEAD)')
    o = ap.parse_args()
    version = (o.version or released_version()).lstrip('v')
    tag = f'v{version}'
    dist = os.path.abspath(o.dist)
    if o.modules_seulement:
        for mname in MODULES:
            z = build_module(mname, version, o.ref or tag, dist)
            if z:
                print(f'{z} : SHA-256 {sha_file(z)}')
        return
    if subprocess.run(['git', 'rev-parse', '-q', '--verify', f'refs/tags/{tag}'], cwd=ROOT, capture_output=True).returncode:
        raise SystemExit(f'tag {tag} introuvable : publier la version d’abord (MANUEL_EXPLOITATION §6), ou git fetch --tags')
    name = f'{PREFIX}-{version}.zip'
    out_zip = os.path.join(dist, name)
    if os.path.exists(out_zip) and not o.force:
        raise SystemExit(f'{out_zip} existe déjà (--force pour le refaire)')
    n, missing = build(version, tag, out_zip)
    if missing:
        print(f'{len(missing)} objet(s) LFS absent(s) localement : git lfs fetch origin {tag}…')
        subprocess.run(['git', 'lfs', 'fetch', 'origin', tag], cwd=ROOT)
        n, missing = build(version, tag, out_zip)
    if missing:
        raise SystemExit(f'archive non écrite : {len(missing)} objet(s) LFS introuvable(s), ex. {missing[0]}')
    digest = sha_file(out_zip)
    print(f'{out_zip} : {n} fichiers, {os.path.getsize(out_zip) / 1e6:.1f} Mo')
    print(f'SHA-256 {digest}')
    modules = []
    for mname in ([] if o.sans_modules else MODULES):
        z = build_module(mname, version, o.ref or tag, dist)
        if z:
            modules.append((os.path.basename(z), sha_file(z)))
            print(f'{z} : SHA-256 {modules[-1][1]}')
    if not o.sans_changelog:
        changelog(version, name, digest, modules)
        version_md(version, [f'- Delivery archive: `{name}` — SHA-256 `{digest}` (code only, outside the repository: `dist/` folder).', *module_lines(modules)])


if __name__ == '__main__':
    main()
