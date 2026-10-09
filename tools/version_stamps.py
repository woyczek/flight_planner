"""Empreintes de version (?v=…) posées au moment où le lanceur sert un fichier, au lieu d'être écrites dans le dépôt.

Dans le dépôt, les références portent une empreinte quelconque (à terme ?v=0) ; quand tools/launch.py sert une page HTML,
un script ou une feuille de design, chaque « chemin?v=… » reçoit l'empreinte réelle du fichier visé (8 caractères de
SHA-1) — mêmes références que tools/bump_versions.py (attributs src / href, @import, images des styles, chargements écrits
dans les scripts, table FILE_V des feuilles de design). L'empreinte d'un fichier texte est celle de son contenu SERVI
(références déjà posées) : une image ou une feuille modifiée change le script qui la cite, donc la page qui le charge, et le
navigateur, qui garde les fichiers versionnés sans les revalider, recharge exactement ce qui a bougé.

Rien n'est écrit sur le disque. Résultats gardés en mémoire tant qu'aucun des fichiers dont ils dépendent n'a changé
(date et taille relues à chaque demande).
"""
import glob
import hashlib
import json
import os
import re
import threading
import time

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SHARED = os.path.join(ROOT, 'shared')

# scripts qui versionnent des images avec leur propre ?v= : l'empreinte couvre aussi ces images (comme bump_versions.py)
DEPENDANCES = {
    'shared/design_deco.js': ['shared/deco/**/*.webp'],
    'shared/appearance_page.js': ['shared/textures/**/*.webp', 'shared/icons/skeuo/**/*.webp', 'shared/deco/**/*.webp'],
    'shared/flight_instruments.js': ['shared/deco/**/*.webp', 'shared/textures/**/*.webp'],
    'shared/repository_nav.js': ['shared/icons/skeuo/**/*.webp', 'shared/icons/defa/*.webp', 'shared/icons/generic/*.webp'],
}
BINAIRE = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2')

IMG = re.compile(r'(\(\s*["\']?)((?:textures|deco/[\w/]+|icons/skeuo/[\w/-]+)/[\w.-]+\.webp|fonts/[\w.-]+\.woff2)\?v=\w+')
LIT = re.compile(r'(["\'`])((?:\.{1,2}/)?[\w./-]+\.(?:js|css))\?v=\w+')
ATTR = re.compile(r'((?:src|href)=["\'])([^"\'?#:]+)\?v=\w+')
IMPORT = re.compile(r'(@import url\(["\'])([^"\'?#:]+)\?v=\w+')
PAGEIMG = re.compile(r'(url\(["\']?)([^"\'()?#:]+\.(?:webp|png|jpe?g|svg))\?v=\w+')
FILE_V = re.compile(r'\bFILE_V = \{[^}]*\};')

_lock = threading.RLock()
_memo = {}  # chemin → (empreinte, octets servis ou None, signatures des fichiers dont ils dépendent)
_globs = {}  # motif → (instant, fichiers) : listes des dépendances relues au plus toutes les 5 s


def rel(path):
    """Chemin relatif à la racine du dépôt, séparateurs « / »."""
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


_sigs = {}  # chemin → (instant, signature) : un fichier relu au plus une fois par seconde (une page = 60 demandes)


def _sig(path):
    """Signature d'un fichier (date en ns, taille) ; None s'il a disparu. Relevé gardé une seconde."""
    now = time.monotonic()
    hit = _sigs.get(path)
    if hit and now - hit[0] < 1:
        return hit[1]
    try:
        st = os.stat(path)
        s = (st.st_mtime_ns, st.st_size)
    except OSError:
        s = None
    _sigs[path] = (now, s)
    return s


def _glob(motif):
    """Fichiers d'un motif de DEPENDANCES (liste gardée 5 s : des centaines d'images)."""
    t, files = _globs.get(motif, (0, None))
    if files is None or time.time() - t > 5:
        files = sorted(glob.glob(os.path.join(ROOT, motif), recursive=True))
        _globs[motif] = (time.time(), files)
    return files


def stamped(path):
    """Vrai si le fichier reçoit des empreintes quand il est servi : pages HTML, scripts, feuilles des designs et
    config/repository_tree — hors données (data/), exemples et bibliothèques minifiées."""
    r = rel(path)
    if r.startswith(('data/', 'examples/', '.')) or r.endswith('.min.js') or 'maplibre' in r or 'jspdf' in r:
        return False
    return r.endswith(('.html', '.js')) or r == 'config/repository_tree' or r in ('shared/designs_skeuo.css',
                                                                                   'shared/block_icons.css')


def _design_css(text):
    """Feuilles de design nommées par config/repository_tree (designs.list[id].css)."""
    return sorted(set(re.findall(r'css:"([\w.-]+\.css)"', text)))


def _stamp(text, path, deps, stack):
    """Texte servi : chaque référence « chemin?v=… » porte l'empreinte du fichier visé ; deps reçoit leurs signatures."""
    base = os.path.dirname(path)

    def sub_from(origin):
        def sub(m):
            cible = os.path.normpath(os.path.join(origin, m.group(2)))
            if not os.path.isfile(cible):
                return m.group(0)
            return f'{m.group(1)}{m.group(2)}?v={_hash(cible, deps, stack)}'
        return sub

    r = rel(path)
    if r.endswith('.html'):
        for motif in (ATTR, IMPORT, PAGEIMG):
            text = motif.sub(sub_from(base), text)
    elif r in ('shared/designs_skeuo.css', 'shared/block_icons.css'):
        text = IMG.sub(sub_from(SHARED), text)
    else:  # scripts, config/repository_tree
        text = LIT.sub(sub_from(base), text)
        if r in ('shared/repository_nav.js', 'config/repository_tree'):
            tree = os.path.join(ROOT, 'config', 'repository_tree')
            src = text if r == 'config/repository_tree' else open(tree, encoding='utf-8').read()
            deps.append((tree, _sig(tree)))
            table = json.dumps({f: _hash(os.path.join(SHARED, f), deps, stack) for f in _design_css(src)}, separators=(', ', ': '))
            text = FILE_V.sub(lambda _m: f'FILE_V = {table};', text)
    return text


def _hash(path, deps, stack=()):
    """Empreinte d'un fichier (contenu servi pour un fichier à empreintes) ; ajoute ses dépendances à deps."""
    path = os.path.normpath(path)
    if path in stack:  # cycle (A charge B qui charge A) : contenu brut, sans rien garder en mémoire
        deps.append((path, _sig(path)))
        return hashlib.sha1(open(path, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()[:8]
    h, _, own = _serve(path, stack)
    deps.extend(own)
    return h


def _serve(path, stack=()):
    """Calcule (ou reprend en mémoire) l'empreinte et les octets servis de path."""
    with _lock:
        hit = _memo.get(path)
        if hit and all(_sig(p) == s for p, s in hit[2]):
            return hit
        deps = [(path, _sig(path))]
        raw = open(path, 'rb').read()
        body = None
        if stamped(path):
            text = raw.decode('utf-8', errors='surrogateescape')
            body = _stamp(text, path, deps, stack + (path,)).encode('utf-8', errors='surrogateescape')
            h = hashlib.sha1(body.replace(b'\r\n', b'\n'))
        else:  # binaire ou autre fichier : contenu brut
            h = hashlib.sha1(raw if path.lower().endswith(BINAIRE) else raw.replace(b'\r\n', b'\n'))
        for motif in DEPENDANCES.get(rel(path), []):
            for dep in _glob(motif):
                s = _sig(dep)
                deps.append((dep, s))
                h.update(rel(dep).encode() + repr(s).encode())
        _memo[path] = (h.hexdigest()[:8], body, deps)
        return _memo[path]


def serve(path):
    """(octets servis, empreinte) d'un fichier à empreintes : références posées, empreinte du contenu servi."""
    path = os.path.normpath(path)
    h, body, _ = _serve(path)
    return (body if body is not None else open(path, 'rb').read()), h
