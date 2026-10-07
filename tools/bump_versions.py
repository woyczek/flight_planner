"""Versions de cache (?v=…) des scripts, feuilles de style et images, d'après leur CONTENU : chaque référence reçoit
une empreinte courte du fichier visé (8 caractères de SHA-1). Une version ne change que si son fichier change : les
navigateurs rechargent exactement ce qui a bougé, et une page n'est modifiée que si l'un de ses fichiers l'est.

Usage (à la racine du dépôt) :
    python tools/bump_versions.py

Ce qui est versionné :
- pages HTML : attributs src / href « …?v=… », @import url("…?v=…") et images des styles de la page
  url("…image?v=…") vers un fichier du dépôt (chemin relatif à la page) ;
- scripts : chargements « 'fichier.js?v=…' » / « "feuille.css?v=…" » écrits dans le code (chemin relatif au script) ;
- repository_nav.js et config/repository_tree : table FILE_V des feuilles de design (designs.list[id].css) ;
  repository_tree : aussi « ../shared/designs.css?v=… » (feuilles posées dès l'en-tête) ;
- feuilles des designs (designs_skeuo.css, block_icons.css) : images textures / deco / icons/skeuo, polices fonts/*.woff2.
Un script qui versionne ses images avec son propre ?v= (DEPENDANCES) reçoit une empreinte qui couvre aussi ces images
— seulement celles que git suit (index : image ajoutée par « git add »), par leur identifiant git : les images déposées
dans un espace de travail et pas encore ajoutées ne changent rien, et l'empreinte est la même dans tous les espaces
(fichier LFS téléchargé ou non). Sans git : contenu des images présentes, comme avant.
Les empreintes se propagent : une image modifiée change la feuille qui la nomme, donc la page qui charge la feuille.
Fins de ligne normalisées avant calcul (même empreinte quelle que soit l'extraction git).

Écrit aussi repository_tree à la racine : fichier de compatibilité (bloc release seul, lu par le contrôle des mises à
jour des versions 4.6.0 et antérieures, qui ne cherchaient pas encore dans config/). À retirer à partir de la 4.9.
"""
import glob, hashlib, io, json, os, re, subprocess, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SHARED = os.path.join(ROOT, 'shared')

# scripts qui versionnent des images avec leur propre ?v= : l'empreinte couvre aussi ces images
DEPENDANCES = {
    'shared/design_deco.js': ['shared/deco/**/*.webp'],
    'shared/appearance_page.js': ['shared/textures/**/*.webp', 'shared/icons/skeuo/**/*.webp', 'shared/deco/**/*.webp'],
    'shared/flight_instruments.js': ['shared/deco/**/*.webp', 'shared/textures/**/*.webp'],
    'shared/repository_nav.js': ['shared/icons/skeuo/**/*.webp', 'shared/icons/defa/*.webp', 'shared/icons/generic/*.webp'],   # icônes et logo de la barre latérale
}
BINAIRE = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2')
_cache = {}


def rel(path):
    """Chemin relatif à la racine du dépôt, séparateurs « / »."""
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def lire(path):
    """Octets du fichier pour l'empreinte : fins de ligne ramenées à LF, sauf pour les binaires (images, polices)."""
    b = open(path, 'rb').read()
    return b if path.lower().endswith(BINAIRE) else b.replace(b'\r\n', b'\n')


_suivis = None


def suivis():
    """Fichiers suivis par git (index) → identifiant du blob ; None sans git ou hors d'un dépôt."""
    global _suivis
    if _suivis is None:
        try:
            out = subprocess.run(['git', 'ls-files', '-s', '-z', '--', 'shared'], cwd=ROOT, capture_output=True, check=True).stdout
            _suivis = {}
            for ligne in out.decode('utf-8').split('\0'):
                if '\t' in ligne:
                    tete, chemin = ligne.split('\t', 1)
                    _suivis[chemin] = tete.split()[1]
        except (OSError, subprocess.CalledProcessError, IndexError):
            _suivis = False
    return _suivis or None


def empreinte(path):
    """Empreinte du fichier (et de ses dépendances déclarées) ; 8 caractères hexadécimaux."""
    path = os.path.normpath(path)
    if path in _cache:
        return _cache[path]
    h = hashlib.sha1(lire(path))
    idx = suivis()
    for motif in DEPENDANCES.get(rel(path), []):
        for dep in sorted(glob.glob(os.path.join(ROOT, motif), recursive=True)):
            if idx is None:  # sans git : contenu des images présentes
                h.update(rel(dep).encode() + hashlib.sha1(lire(dep)).digest())
            elif rel(dep) in idx:  # image suivie : son identifiant git (le même partout)
                h.update(rel(dep).encode() + idx[rel(dep)].encode())
    _cache[path] = h.hexdigest()[:8]
    return _cache[path]


def ecrire_si_change(path, avant, apres):
    """Écrit le texte s'il diffère de l'original (et vide le cache des empreintes) ; vrai si le fichier a été écrit."""
    if apres != avant:
        io.open(path, 'w', encoding='utf-8', newline='').write(apres)
        _cache.clear()   # les empreintes qui en dépendent sont à recalculer
        return True
    return False


absents = set()


def versionner(texte, base, motif):
    """Remplace chaque « chemin?v=… » du motif (groupe 2 : chemin) par l'empreinte du fichier (relatif à base)."""
    def sub(m):
        """Référence avec l'empreinte du fichier visé ; fichier absent : laissée telle quelle et signalée (absents)."""
        cible = os.path.normpath(os.path.join(base, m.group(2)))
        if not os.path.isfile(cible):
            absents.add(f'{m.group(2)} (depuis {rel(base)})')
            return m.group(0)
        return f'{m.group(1)}{m.group(2)}?v={empreinte(cible)}'
    return motif.sub(sub, texte)


IMG = re.compile(r'(\(\s*["\']?)((?:textures|deco/[\w/]+|icons/skeuo/[\w/-]+)/[\w.-]+\.webp|fonts/[\w.-]+\.woff2)\?v=\w+')  # noms à point compris (rail.vierge.webp) ; polices des designs (Tactique)
LIT = re.compile(r'(["\'`])((?:\.{1,2}/)?[\w./-]+\.(?:js|css))\?v=\w+')
ATTR = re.compile(r'((?:src|href)=["\'])([^"\'?#:]+)\?v=\w+')
IMPORT = re.compile(r'(@import url\(["\'])([^"\'?#:]+)\?v=\w+')   # feuilles importées dans une couche (tools/layer_pages.py)
PAGEIMG = re.compile(r'(url\(["\']?)([^"\'()?#:]+\.(?:webp|png|jpe?g|svg))\?v=\w+')   # images des styles d'une page

# prompt de génération de missions : régénéré depuis docs/ (tools/build_mission_prompt.py)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_mission_prompt
build_mission_prompt.build(verbose=False)
# documents de l'Aide pour l'ouverture en fichier local (tools/build_docs_bundle.py)
import build_docs_bundle
build_docs_bundle.build(verbose=False)

# 1. images des feuilles des designs
for css in ('designs_skeuo.css', 'block_icons.css'):
    p = os.path.join(SHARED, css)
    s = io.open(p, encoding='utf-8', newline='').read()
    ecrire_si_change(p, s, versionner(s, SHARED, IMG))

# 2. table FILE_V de repository_nav.js (feuilles de design chargées à la demande)
tree = io.open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8').read()
COMPAT = '''/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════
   Vous cherchez la configuration de la suite DEFA ? Elle a déménagé : config/repository_tree.

   Ce petit fichier ne sert qu'aux installations en 4.6.0 et avant : leur contrôle des mises à jour lit encore ici la
   version publiée (le bloc tout en bas). Il disparaîtra dans quelques versions. Rien d'autre à voir…

   … sauf pour les curieux.

                      ___|___
          ===========(___o___)===========
                  ____|_____|____             « SOG 01, ici le Centre : vous êtes dans un fichier de
                 /  _    ___    _ \              compatibilité. Remettez les gaz, tour de piste à gauche,
            ====|  |_|  |___|  |_| |====          rappelez vent arrière config/. »
                 \_______________/
                     |_|   |_|

   Message chiffré pour les plus obstinés (code de César, décalage de 13 — les Romains ne volaient pas, mais ils chiffraient) :
   {egg}

   Vous en êtes venu à bout ? Alors vous lisez aussi les notices de montage. Respect.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
window.REPOSITORY_TREE_COMPAT = {{ release:{{date:"{date}",version:"{version}",id:"{id}"}} }};
'''
EGG = 'Ovra wbhé, phevrhk. Ibhf nirm gebhié yr svpuvre frperg qh PCPB : qrznaqrm ibger pnsé nh Prager, zbg qr cnffr « gbhe qr cvfgr ».'
release_block = re.search(r'release\s*:\s*\{([^}]*)\}', tree).group(1)
field = lambda k: (re.search(k + r'\s*:\s*"([^"]*)"', release_block) or [None, ''])[1]
compat = COMPAT.format(egg=EGG, date=field('date'), version=field('version'), id=field('id'))
compat_path = os.path.join(ROOT, 'repository_tree')
if not os.path.isfile(compat_path) or io.open(compat_path, encoding='utf-8').read() != compat:
    io.open(compat_path, 'w', encoding='utf-8').write(compat)  # fin de ligne du système (comme la copie de travail)
    print('repository_tree (compatibilité 4.6.0) écrit.')
design_css = sorted(set(re.findall(r'css:"([\w.-]+\.css)"', tree)))
# 3. chargements écrits dans les scripts, jusqu'à stabilité (une empreinte changée change le script qui la cite)
scripts = [p for p in glob.glob(os.path.join(ROOT, 'shared', '**', '*.js'), recursive=True) + glob.glob(os.path.join(ROOT, 'apps', '**', '*.js'), recursive=True)
           if not re.search(r'\.min\.js$|maplibre|jspdf|docs_bundle\.js$', p)]  # docs_bundle.js : texte des documents, pas des chargements
# config/repository_tree : feuilles du design posées dès l'en-tête (designs.css, table FILE_V)
tree_path = os.path.join(ROOT, 'config', 'repository_tree')
scripts.append(tree_path)
nav = os.path.join(SHARED, 'repository_nav.js')
for _ in range(8):
    change = False
    for p in scripts:
        s = io.open(p, encoding='utf-8', newline='').read()
        t = versionner(s, os.path.dirname(p), LIT)
        if p in (nav, tree_path):
            table = json.dumps({f: empreinte(os.path.join(SHARED, f)) for f in design_css}, separators=(', ', ': '))
            t = re.sub(r'\bFILE_V = \{[^}]*\};', f'FILE_V = {table};', t)
        change |= ecrire_si_change(p, s, t)
    if not change:
        break

# 4. pages HTML (hors dépôt de données et exemples)
pages = [p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
         if not rel(p).startswith(('data/', 'examples/', '.claude/'))]
changees = 0
for p in pages:
    s = io.open(p, encoding='utf-8', newline='').read()
    d = os.path.dirname(p)
    changees += ecrire_si_change(p, s, versionner(versionner(versionner(s, d, ATTR), d, IMPORT), d, PAGEIMG))
print(f'Versions par empreinte : {changees} page(s) modifiée(s).')
for a in sorted(absents):
    print('  référence vers un fichier absent : ' + a)

# contrôle des images des designs (format réel, poids, images absentes ou orphelines) : rapport seul, sans bloquer
import check_assets
check_assets.controle()
