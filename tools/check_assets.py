"""Contrôle des images des designs à matières (shared/deco, shared/textures, shared/icons/skeuo) : format réel conforme à
l'extension, poids raisonnable, images nommées par le code présentes, images que plus rien ne nomme.

Usage (à la racine du dépôt) :
    python tools/check_assets.py          → rapport ; code de sortie 1 s'il y a une erreur (format, image absente)
Appelé aussi par tools/bump_versions.py (rapport seul, sans bloquer).

Règles :
- format : les premiers octets du fichier doivent correspondre à l'extension (un PNG renommé en .webp est refusé :
  il pèse souvent 10 à 30 fois plus) ;
- poids : avertissement au-delà de POIDS_MAX (ko) pour une image de décor ou d'icône ;
- présence : chaque image nommée dans design_deco.js (SETS, PROPS, device…) et chaque url() des feuilles des designs
  doit exister ;
- orphelines : image suivie (git) de shared/deco que ni le code ni les feuilles ne nomment (panneaux panel-* et fonds
  bg-<thème> nommés par motif : comptés comme utilisés). Les planches sources (PNG non suivis) ne sont pas concernées.
"""
import os, re, subprocess, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
POIDS_MAX = 400   # ko
DOSSIERS = ('shared/deco', 'shared/textures', 'shared/icons/skeuo')
SIGNATURES = {
    '.webp': lambda b: b[:4] == b'RIFF' and b[8:12] == b'WEBP',
    '.png': lambda b: b[:8] == bytes([137, 80, 78, 71, 13, 10, 26, 10]),
    '.jpg': lambda b: b[:3] == bytes([255, 216, 255]),
    '.jpeg': lambda b: b[:3] == bytes([255, 216, 255]),
}


def suivis(prefix):
    out = subprocess.run(['git', 'ls-files', prefix], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout
    return [f for f in out.split('\n') if f]


def sources():
    """Texte du code et des feuilles (hors images, bibliothèques minifiées et dossiers de données)."""
    text = []
    for base in ('shared', 'apps', 'tools'):
        for dp, dn, fn in os.walk(os.path.join(ROOT, base)):
            dn[:] = [d for d in dn if d not in ('deco', 'textures', 'skeuo', '__pycache__')]
            for f in fn:
                if f.endswith(('.js', '.css', '.html', '.py')) and not f.endswith('.min.js') and f != 'check_assets.py':
                    text.append(open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read())
    text.append(open(os.path.join(ROOT, 'index.html'), encoding='utf-8', errors='ignore').read())
    return '\n'.join(text)


def controle(verbose=True):
    """Renvoie (erreurs, avertissements) ; affiche le rapport si verbose."""
    erreurs, avert = [], []
    fichiers = [f for d in DOSSIERS for f in suivis(d) if os.path.splitext(f)[1].lower() in SIGNATURES]
    for f in fichiers:
        chemin = os.path.join(ROOT, f)
        if not os.path.exists(chemin):
            continue
        with open(chemin, 'rb') as h:
            tete = h.read(16)
        if not SIGNATURES[os.path.splitext(f)[1].lower()](tete):
            erreurs.append(f'format réel ≠ extension : {f}')
        ko = os.path.getsize(chemin) // 1024
        if ko > POIDS_MAX:
            avert.append(f'{ko} ko (> {POIDS_MAX}) : {f}')
    src = sources()
    # images nommées par design_deco.js : DECO(<design>)(<nom>) → shared/deco/<design>/<nom>.webp
    deco = open(os.path.join(ROOT, 'shared', 'design_deco.js'), encoding='utf-8').read()
    for bloc in ('SETS', 'PROPS'):
        debut = deco.index(f'const {bloc} = {{')
        fin = deco.index('\n  };', debut)
        design = None
        for ligne in deco[debut:fin].split('\n'):
            m = re.match(r'\s{4}(\w+): [\[{]', ligne)
            if m:
                design = m.group(1)
            if re.match(r'\s*foot:', ligne):
                continue   # frise : noms de composants (FOOT), pas des images
            for nom in re.findall(r"\['([\w-]+)',", ligne) + re.findall(r"img\('([\w-]+)'\)", ligne) + re.findall(r"/, '([\w-]+)'", ligne):
                if design and not os.path.exists(os.path.join(ROOT, 'shared', 'deco', design, nom + '.webp')):
                    erreurs.append(f'absente : shared/deco/{design}/{nom}.webp (design_deco.js, {bloc})')
    # url() des feuilles partagées (chemins relatifs à shared/)
    for css in ('designs_skeuo.css', 'designs.css', 'block_icons.css'):
        texte = open(os.path.join(ROOT, 'shared', css), encoding='utf-8').read()
        for u in sorted(set(re.findall(r'url\("((?:deco|textures|icons)/[^"?]+)', texte))):
            if not os.path.exists(os.path.join(ROOT, 'shared', u)):
                erreurs.append(f'absente : shared/{u} ({css})')
    # orphelines de shared/deco
    cles_bg = set(re.findall(r'data-deco-bg="([\w-]+)"', src))
    for f in suivis('shared/deco'):
        if not f.endswith('.webp'):
            continue
        rel = f[len('shared/deco/'):]
        nom = os.path.basename(rel)[:-5]
        cite = rel in src or rel[:-5] in src or f'{nom}.webp' in src or re.search(r"['\"`]" + re.escape(nom) + r"['\"`]", src)
        motif = nom.startswith('panel-') or (nom.startswith('bg-') and nom[3:] in cles_bg)
        if not (cite or motif):
            avert.append(f'orpheline (plus rien ne la nomme) : {f}')
    erreurs, avert = list(dict.fromkeys(erreurs)), list(dict.fromkeys(avert))   # une ligne par problème
    if verbose:
        print(f'Images des designs : {len(fichiers)} contrôlées, {len(erreurs)} erreur(s), {len(avert)} avertissement(s).')
        for e in erreurs:
            print('  ERREUR  ' + e)
        for a in avert:
            print('  avert.  ' + a)
    return erreurs, avert


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    e, _ = controle()
    sys.exit(1 if e else 0)
