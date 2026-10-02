"""Section « jeux d'icônes skeuomorphes » de shared/block_icons.css : Laiton (brass), Acier (steel), Gel (gel), Aviation (avio).

Deux sortes de jeux, selon le contenu du dossier shared/icons/skeuo/<dossier>/ :

· jeu COMPOSÉ (le dossier contient vierge.webp ou vierge.gris.webp) : chaque icône = fond vide commun + glyphe du
  registre (tracé SVG, shared/icons/repository_icons.js) par-dessus, couleur et ombre réglables (GLYPH) ; le Centre
  (CPCO : pages du Centre, ses entrées de la barre latérale) a son fond (vierge.rouge.webp, cuivre ; à défaut
  vierge.gris.webp) et la couleur de glyphe
  « centre ». Mode « tint » (Aqua) : le fond gris est teinté exactement à la couleur du design (--aq-gel, mélange
  overlay) sur son disque intérieur (le cerclage reste gris), découpé à sa forme ; normal et Centre sur la même bulle.
  Les boutons des blocs (masquer, déplacer) gardent leurs icônes au trait. Seuls les fonds vierges sont utiles.
· jeu PEINT (sinon) : une image par icône (<nom>.webp) découpée dans les planches de maquette
  (tools/icons_from_sheets.html) ou fabriquée dans leur style (tools/icons_skeuo_generator.html), en lieu et place du
  tracé ; chevrons et poignée des blocs en images du jeu ; ALIASES : nom sans image propre → image d'un autre.

Le script inscrit aussi la liste des jeux composés et de leurs fonds dans repository_tree (REPOSITORY_TREE.iconComposed),
lue par la barre latérale (pas d'image peinte à charger) et par la page Apparence (aperçu des jeux).
Relancer après tout ajout ou retrait d'images : python tools/build_skeuo_icons_css.py, puis tools/bump_versions.py.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def skeuo_sets():
    """Jeux d'icônes à matières → dossier d'images, lus dans le registre des designs (repository_tree, designs.list) :
    chaque design marqué skeuo:true fournit son jeu icons:"…", dont les images sont dans shared/icons/skeuo/<id du design>."""
    with open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8') as f:
        tree = f.read()
    sets = {}
    for design, body in re.findall(r'^\s*(\w+):\{([^\n]*)\},?\s*$', tree, re.M):
        icons = re.search(r'icons:"(\w+)"', body)
        if 'skeuo:true' in body and icons:
            sets[icons.group(1)] = design
    assert sets, 'aucun design à matières dans repository_tree (designs.list, skeuo:true)'
    return sets


SETS = skeuo_sets()   # {'brass': 'cabinet', 'steel': 'field', 'gel': 'aqua', 'avio': 'flightlog'}
ALIASES = {'brass': {'save': 'bookmark', 'file': 'file'}, 'steel': {'file': 'file-text'}, 'gel': {'file': 'file-text'}, 'avio': {'save': 'bookmark', 'file': 'file'}}
# jeux composés : couleur du glyphe (normal, Centre), ombre (vers le bas : éclairage par le haut), marge autour du glyphe
# (fraction de la taille de l'icône) ; tint : couleur du fond gris (mode Aqua), core : rayon teinté (% du rayon),
# up / shrink : centre du disque teinté remonté de « up » px et diamètre réduit de « shrink » px (ajustement au cerclage) ;
GLYPH = {
    # centreGel : teinte de la bulle des icônes du Centre (mode tint) — marine : signe propre, lisible sur le gel or des
    # pages du Centre (galons, designs_skeuo.css)
    'gel': {'color': '#ffffff', 'centre': '#ffd23f', 'centreGel': '#1b2440', 'shadow': 'drop-shadow(.5px 1px .6px rgba(0,0,0,.55))', 'pad': .24, 'tint': 'var(--aq-gel,#2473db)', 'core': 86, 'up': 1, 'shrink': 2},
    'brass': {'color': '#f1e4c0', 'centre': '#ffd23f', 'shadow': 'drop-shadow(.5px 1px .6px rgba(0,0,0,.7))', 'pad': .26},
    'steel': {'color': '#e9ecdf', 'centre': '#ffd23f', 'shadow': 'drop-shadow(.5px 1px .6px rgba(0,0,0,.75))', 'pad': .24},
    'avio': {'color': '#f4ecd8', 'centre': '#ffd23f', 'shadow': 'drop-shadow(.5px 1px .6px rgba(0,0,0,.7))', 'pad': .26},
}
BEGIN = '/* ==== JEUX D\'ICÔNES SKEUOMORPHES (généré par tools/build_skeuo_icons_css.py) ==== */'
END = '/* ==== fin des jeux skeuomorphes ==== */'


def disc(g):
    """Disque teinté (mode tint) : couleur jusqu'à core % du rayon, centre remonté de up px, diamètre réduit de shrink px."""
    # (calc() refusé dans la taille de l'ellipse : rayon en %, réduction en px portée par les arrêts de couleur)
    r, d = f'{g["core"] / 2:g}%', g.get('shrink', 0) / 2
    return f'radial-gradient({r} {r} at 50% calc(50% - {g.get("up", 0)}px),{g["tint"]} 0 calc(97% - {d:g}px),transparent calc(100% - {d:g}px))'


def folder(d):
    return os.path.join(ROOT, 'shared', 'icons', 'skeuo', d)


def has(d, f):
    return os.path.isfile(os.path.join(folder(d), f))


# jeux composés (fonds vierges) et jeux peints
composed = {k: d for k, d in SETS.items() if has(d, 'vierge.webp') or has(d, 'vierge.gris.webp')}
painted = {k: d for k, d in SETS.items() if k not in composed}
sel = lambda keys: 'html:is(' + ','.join(f'[data-icons="{k}"]' for k in keys) + ')'
ANY = sel(SETS)

out = [BEGIN,
       # tailles communes à tous les jeux skeuomorphes
       f'{ANY} .repo-svg[data-i]{{background-position:center;background-size:contain;background-repeat:no-repeat;--rs:1.6em}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon){{background:none!important;box-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon) .repo-svg[data-i]{{--rs:46px}}',
       f'{ANY} .repo-card-icon .repo-svg[data-i]{{--rs:38px}}',
       f'{ANY} :is(button,.buttonLink,a.mc-button,a.headerButton,summary) .repo-svg[data-i]{{--rs:1.9em}}',
       # l'icône d'un bouton ne l'agrandit pas : son enveloppe garde la hauteur d'une ligne, l'image déborde (centrée)
       f'{ANY} :is(button,.buttonLink,a.mc-button,a.headerButton) .repo-icon{{height:1.25em;overflow:visible;align-items:center}}',
       f'{ANY} .repo-sidenav-item .repo-svg[data-i]{{--rs:50px!important/*garder*/}}',   # après les boutons (« Menu » est un bouton)
       f'{ANY} .repo-dropzone-badge{{background:none!important}}{ANY} .repo-dropzone-badge .repo-svg[data-i]{{--rs:42px}}',
       f'{ANY} .repo-notice>.repo-icon .repo-svg[data-i]{{--rs:30px}}',
       f'{ANY} .repo-sidenav-brand .repo-svg[data-i]{{--rs:40px!important}}']

if painted:
    P = sel(painted)
    out += [f'{P} .repo-svg[data-i]>*{{display:none}}',   # l'image remplace le tracé
            f'{P} :is(.repo-block-icon,.repo-card-icon) .repo-svg[data-i]{{filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}}',
            # boutons des blocs : « Masquer / Afficher » (chevron) et ↕ (déplacer) en images du jeu
            f'{P} .repo-block-heading-rich .repo-toggle::before{{-webkit-mask:none!important;mask:none!important;background:center/contain no-repeat!important;width:20px!important;height:20px!important;vertical-align:-5px!important}}',
            f'{P} .repo-block-hidden>.repo-block-heading-rich .repo-toggle::before{{transform:none!important}}',
            f'{P} .repo-block-tools .repo-drag{{font-size:0!important;min-width:34px;background-position:center!important;background-size:22px!important;background-repeat:no-repeat!important}}']
    for key, d in painted.items():
        names = sorted(f[:-5] for f in os.listdir(folder(d)) if f.endswith('.webp'))
        H = f'html[data-icons="{key}"]'
        out += [f'{H} .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{n}.webp")}}' for n in names]
        if {'chevron-up', 'chevron-down', 'move'} <= set(names):
            out.append(f'{H} .repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}/chevron-up.webp")!important}}')
            out.append(f'{H} .repo-block-hidden>.repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}/chevron-down.webp")!important}}')
            out.append(f'{H} .repo-block-tools .repo-drag{{background-image:url("icons/skeuo/{d}/move.webp")!important}}')
        out += [f'{H} .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{t}.webp")}}' for n, t in ALIASES[key].items() if n not in names and t in names]

tree = {}
for key, d in composed.items():
    g, H = GLYPH[key], f'html[data-icons="{key}"]'
    normal = f'{d}/vierge.webp' if has(d, 'vierge.webp') else f'{d}/vierge.gris.webp'
    # fond du Centre, par convention de nom : vierge.rouge.webp (cuivre / rouge), sinon vierge.gris.webp, sinon le fond normal
    centre = next((f'{d}/{f}' for f in ('vierge.rouge.webp', 'vierge.gris.webp') if has(d, f)), normal)
    CENTRE = f'html[data-app-theme="cpco"][data-icons="{key}"] .repo-svg[data-i]:not(.repo-sidenav .repo-svg),{H} .repo-sidenav-cpco .repo-svg[data-i]'
    common = f'box-sizing:border-box;padding:calc(var(--rs,1.15em) * {g["pad"]});color:var(--ico-glyph,{g["color"]})!important;overflow:visible'
    if g.get('tint'):
        # bulle grise teintée sur son disque intérieur (le cerclage reste gris), découpée à sa forme, glyphe non filtré
        shape = f'url("icons/skeuo/{centre}") center/contain no-repeat'
        out.append(f'{H} .repo-svg[data-i]{{background:url("icons/skeuo/{centre}") center/contain no-repeat,{disc(g)} center/contain no-repeat!important;background-color:transparent!important;background-blend-mode:overlay,normal!important;-webkit-mask:{shape};mask:{shape};filter:none!important;{common}}}')
        # bulle du Centre : teinte propre et disque recentré (up remonte le disque : visible sur une teinte sombre)
        gel = f'--aq-gel:{g["centreGel"]};background:url("icons/skeuo/{centre}") center/contain no-repeat,{disc({**g, "up": -0.5})} center/contain no-repeat!important;' if g.get('centreGel') else ''
        out.append(f'{CENTRE}{{{gel}color:var(--ico-glyph-centre,{g["centre"]})!important}}')
        tree[key] = {'normal': centre, 'centre': centre, 'disc': disc(g), 'glyph': g['color'], 'glyphCentre': g['centre']}
    else:
        out.append(f'{H} .repo-svg[data-i]{{background-image:url("icons/skeuo/{normal}")!important;{common}}}')
        out.append(f'{CENTRE}{{background-image:url("icons/skeuo/{centre}")!important;color:var(--ico-glyph-centre,{g["centre"]})!important}}')
        tree[key] = {'normal': normal, 'centre': centre, 'glyph': g['color'], 'glyphCentre': g['centre']}
    out.append(f'{H} .repo-svg[data-i]>*{{display:inline;filter:var(--ico-glyph-shadow,{g["shadow"]})}}')
    # boutons des blocs (masquer : chevron ; déplacer : ↕) sur le fond vierge du jeu, symbole par-dessus (couleur du glyphe)
    T = f'{H} .repo-block .repo-block-tools button:is(.repo-drag,.repo-toggle)'
    if g.get('tint'):
        shape = f'url("icons/skeuo/{centre}") center/contain no-repeat'
        out.append(f'{T}{{background:url("icons/skeuo/{centre}") center/contain no-repeat,{disc(g)} center/contain no-repeat!important;background-color:transparent!important;background-blend-mode:overlay,normal!important;-webkit-mask:{shape};mask:{shape};width:28px!important;height:28px!important;color:{g["color"]}!important;opacity:1}}')
    else:
        out.append(f'{T}{{background:url("icons/skeuo/{normal}") center/contain no-repeat!important;width:28px!important;height:28px!important;color:{g["color"]}!important;opacity:1}}')
    out.append(f'{T}:is(:hover,:focus-visible){{filter:brightness(1.12)}}')
    out.append(f'{H} .repo-block .repo-block-tools .repo-drag{{font-size:15px!important;line-height:1;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.55)}}')
    out.append(f'{H} .repo-block .repo-block-tools .repo-toggle::before{{background-color:currentColor!important;width:13px!important;height:13px!important;filter:drop-shadow(0 1px .6px rgba(0,0,0,.55))}}')
    out.append(f'html[data-app-theme="cpco"][data-icons="{key}"] .repo-block .repo-block-tools button:is(.repo-drag,.repo-toggle){{color:{g["centre"]}!important}}')
    # ombre du bloc portée par le conteneur (la découpe de la bulle la couperait)
    out.append(f'{H} :is(.repo-block-icon,.repo-card-icon){{filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}}')
out.append(END)

p = os.path.join(ROOT, 'shared', 'block_icons.css')
raw = open(p, 'rb').read().decode('utf-8'); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
if BEGIN in s:
    s = s[:s.index(BEGIN)] + s[s.index(END) + len(END):].lstrip('\n')
# !important convertis en règles renforcées « :not(#imp) » (designs hors couche ; étape 4 des couches CSS,
# docs/REFACTORING_TOOLKIT.md) ; restent ceux suivis de /*garder*/ (taille en ligne des icônes de la barre)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from strip_page_important import bump_css
s = s.rstrip('\n') + '\n' + bump_css('\n'.join(out), designs=True)[0] + '\n'
open(p, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))

# jeux composés → repository_tree (barre latérale, page Apparence)
p = os.path.join(ROOT, 'config', 'repository_tree')
raw = open(p, 'rb').read().decode('utf-8'); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
line = f'// jeux d\'icônes composés (fond vierge + glyphe), écrit par tools/build_skeuo_icons_css.py\nwindow.REPOSITORY_TREE.iconComposed={json.dumps(tree, ensure_ascii=False, separators=(",", ":"))};\n'
s = re.sub(r"// jeux d'icônes composés \(fond vierge \+ glyphe\), écrit par tools/build_skeuo_icons_css\.py\nwindow\.REPOSITORY_TREE\.iconComposed=.*;\n", '', s)
i = s.index('// Préférences d\'affichage posées dès l\'en-tête')
s = s[:i] + line + s[i:]
open(p, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
print(f'{len(out) - 2} règles ; jeux composés : {", ".join(composed) or "aucun"} ; jeux peints : {", ".join(painted) or "aucun"}')
