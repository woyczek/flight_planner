"""Versions de cache (?v=…) des scripts, feuilles de style et images, d'après leur CONTENU : chaque référence reçoit
une empreinte courte du fichier visé (8 caractères de SHA-1). Une version ne change que si son fichier change : les
navigateurs rechargent exactement ce qui a bougé, et une page n'est modifiée que si l'un de ses fichiers l'est.

Usage (à la racine du dépôt) :
    python tools/bump_versions.py

Ce qui est versionné :
- pages HTML : attributs src / href « …?v=… » et @import url("…?v=…") vers un fichier du dépôt (chemin relatif à
  la page) ;
- scripts : chargements « 'fichier.js?v=…' » / « "feuille.css?v=…" » écrits dans le code (chemin relatif au script) ;
- repository_nav.js : table FILE_V des feuilles de design chargées à la demande (designs.list[id].css) ;
- feuilles des designs (designs_skeuo.css, block_icons.css) : images textures / deco / icons/skeuo.
Un script qui versionne ses images avec son propre ?v= (DEPENDANCES) reçoit une empreinte qui couvre aussi ces images.
Les empreintes se propagent : une image modifiée change la feuille qui la nomme, donc la page qui charge la feuille.
Fins de ligne normalisées avant calcul (même empreinte quelle que soit l'extraction git).
"""
import glob, hashlib, io, json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SHARED = os.path.join(ROOT, 'shared')

# scripts qui versionnent des images avec leur propre ?v= : l'empreinte couvre aussi ces images
DEPENDANCES = {
    'shared/design_deco.js': ['shared/deco/**/*.webp'],
    'shared/appearance_page.js': ['shared/textures/**/*.webp', 'shared/icons/skeuo/**/*.webp', 'shared/deco/**/*.webp'],
    'shared/flight_instruments.js': ['shared/deco/**/*.webp', 'shared/textures/**/*.webp'],
    'shared/repository_nav.js': ['shared/icons/skeuo/**/*.webp'],   # icônes de la barre latérale
}
BINAIRE = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2')
_cache = {}


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def lire(path):
    b = open(path, 'rb').read()
    return b if path.lower().endswith(BINAIRE) else b.replace(b'\r\n', b'\n')


def empreinte(path):
    """Empreinte du fichier (et de ses dépendances déclarées) ; 8 caractères hexadécimaux."""
    path = os.path.normpath(path)
    if path in _cache:
        return _cache[path]
    h = hashlib.sha1(lire(path))
    for motif in DEPENDANCES.get(rel(path), []):
        for dep in sorted(glob.glob(os.path.join(ROOT, motif), recursive=True)):
            h.update(rel(dep).encode() + hashlib.sha1(lire(dep)).digest())
    _cache[path] = h.hexdigest()[:8]
    return _cache[path]


def ecrire_si_change(path, avant, apres):
    if apres != avant:
        io.open(path, 'w', encoding='utf-8', newline='').write(apres)
        _cache.clear()   # les empreintes qui en dépendent sont à recalculer
        return True
    return False


absents = set()


def versionner(texte, base, motif):
    """Remplace chaque « chemin?v=… » du motif (groupe 2 : chemin) par l'empreinte du fichier (relatif à base)."""
    def sub(m):
        cible = os.path.normpath(os.path.join(base, m.group(2)))
        if not os.path.isfile(cible):
            absents.add(f'{m.group(2)} (depuis {rel(base)})')
            return m.group(0)
        return f'{m.group(1)}{m.group(2)}?v={empreinte(cible)}'
    return motif.sub(sub, texte)


IMG = re.compile(r'(\(\s*["\']?)((?:textures|deco/[\w/]+|icons/skeuo/[\w/-]+)/[\w-]+\.webp)\?v=\w+')
LIT = re.compile(r'(["\'`])((?:\.{1,2}/)?[\w./-]+\.(?:js|css))\?v=\w+')
ATTR = re.compile(r'((?:src|href)=["\'])([^"\'?#:]+)\?v=\w+')
IMPORT = re.compile(r'(@import url\(["\'])([^"\'?#:]+)\?v=\w+')   # feuilles importées dans une couche (tools/layer_pages.py)

# prompt de génération de missions : régénéré depuis docs/ (tools/build_mission_prompt.py)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_mission_prompt
build_mission_prompt.build(verbose=False)

# 1. images des feuilles des designs
for css in ('designs_skeuo.css', 'block_icons.css'):
    p = os.path.join(SHARED, css)
    s = io.open(p, encoding='utf-8', newline='').read()
    ecrire_si_change(p, s, versionner(s, SHARED, IMG))

# 2. table FILE_V de repository_nav.js (feuilles de design chargées à la demande)
tree = io.open(os.path.join(ROOT, 'repository_tree'), encoding='utf-8').read()
design_css = sorted(set(re.findall(r'css:"([\w.-]+\.css)"', tree)))
# 3. chargements écrits dans les scripts, jusqu'à stabilité (une empreinte changée change le script qui la cite)
scripts = [p for p in glob.glob(os.path.join(ROOT, 'shared', '**', '*.js'), recursive=True) + glob.glob(os.path.join(ROOT, 'apps', '**', '*.js'), recursive=True)
           if not re.search(r'\.min\.js$|maplibre|jspdf', p)]
nav = os.path.join(SHARED, 'repository_nav.js')
for _ in range(8):
    change = False
    for p in scripts:
        s = io.open(p, encoding='utf-8', newline='').read()
        t = versionner(s, os.path.dirname(p), LIT)
        if p == nav:
            table = json.dumps({f: empreinte(os.path.join(SHARED, f)) for f in design_css}, separators=(', ', ': '))
            t = re.sub(r'const FILE_V = \{[^}]*\};', f'const FILE_V = {table};', t)
        change |= ecrire_si_change(p, s, t)
    if not change:
        break

# 4. pages HTML (hors dépôt de données et exemples)
pages = [p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
         if not rel(p).startswith(('data/', 'examples/', '.claude/'))]
changees = 0
for p in pages:
    s = io.open(p, encoding='utf-8', newline='').read()
    changees += ecrire_si_change(p, s, versionner(versionner(s, os.path.dirname(p), ATTR), os.path.dirname(p), IMPORT))
print(f'Versions par empreinte : {changees} page(s) modifiée(s).')
for a in sorted(absents):
    print('  référence vers un fichier absent : ' + a)

# contrôle des images des designs (format réel, poids, images absentes ou orphelines) : rapport seul, sans bloquer
import check_assets
check_assets.controle()
