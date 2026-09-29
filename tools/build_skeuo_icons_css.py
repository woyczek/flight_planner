"""Section « jeux d'icônes skeuomorphes » de shared/block_icons.css : Laiton (brass), Acier (steel), Gel (gel).

Chaque icône du registre a une image dans shared/icons/skeuo/<dossier>/<nom>.webp : découpée dans les planches de
maquette (tools/icons_from_sheets.html) ou fabriquée dans leur style (tools/icons_skeuo_generator.html). En jeu
skeuomorphe (html[data-icons="brass" | "steel" | "gel"], quel que soit le design), l'image remplace le tracé
(svg.repo-svg[data-i]) partout, un peu plus grande que le trait. ALIASES : nom sans image propre → image d'un autre.
Jeux du Centre (CPCO) : shared/icons/skeuo/<dossier>-cpco/ (copies à retoucher aux couleurs du Centre) ; utilisés sur
les pages du Centre (html[data-app-theme="cpco"]) et pour les entrées du Centre de la barre latérale (repository_nav.js).
Une icône absente du jeu du Centre garde l'image du jeu ordinaire.
Relancer après une nouvelle découpe ou génération : python tools/build_skeuo_icons_css.py, puis bump_versions.py.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS = {'brass': 'cabinet', 'steel': 'field', 'gel': 'aqua', 'avio': 'flightlog'}
ALIASES = {'brass': {'save': 'bookmark', 'file': 'file'}, 'steel': {'file': 'file-text'}, 'gel': {'file': 'file-text'}, 'avio': {'save': 'bookmark', 'file': 'file'}}
BEGIN = '/* ==== JEUX D\'ICÔNES SKEUOMORPHES (généré par tools/build_skeuo_icons_css.py) ==== */'
END = '/* ==== fin des jeux skeuomorphes ==== */'
ANY = 'html:is([data-icons="brass"],[data-icons="steel"],[data-icons="gel"],[data-icons="avio"])'
out = [BEGIN,
       f'{ANY} .repo-svg[data-i]{{background-position:center;background-size:contain;background-repeat:no-repeat;--rs:1.6em}}',
       f'{ANY} .repo-svg[data-i]>*{{display:none}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon){{background:none!important;box-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon) .repo-svg[data-i]{{--rs:46px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}}',
       f'{ANY} .repo-card-icon .repo-svg[data-i]{{--rs:38px}}',
       f'{ANY} :is(button,.buttonLink,a.mc-button,a.headerButton,summary) .repo-svg[data-i]{{--rs:2.2em;margin:-.35em 0}}',
       f'{ANY} .repo-sidenav-item .repo-svg[data-i]{{--rs:50px!important;margin:0}}',   # après les boutons (« Menu » est un bouton)
       f'{ANY} .repo-dropzone-badge{{background:none!important}}{ANY} .repo-dropzone-badge .repo-svg[data-i]{{--rs:42px}}',
       f'{ANY} .repo-notice>.repo-icon .repo-svg[data-i]{{--rs:30px}}',
       f'{ANY} .repo-sidenav-brand .repo-svg[data-i]{{--rs:40px!important}}',
       # boutons des blocs : « Masquer / Afficher » (chevron) et ↕ (déplacer) en images du jeu
       f'{ANY} .repo-block-heading-rich .repo-toggle::before{{-webkit-mask:none!important;mask:none!important;background:center/contain no-repeat!important;width:20px!important;height:20px!important;vertical-align:-5px!important}}',
       f'{ANY} .repo-block-hidden>.repo-block-heading-rich .repo-toggle::before{{transform:none!important}}',
       f'{ANY} .repo-block-tools .repo-drag{{font-size:0!important;min-width:34px;background-position:center!important;background-size:22px!important;background-repeat:no-repeat!important}}']
for key, d in SETS.items():
    folder = os.path.join(ROOT, 'shared', 'icons', 'skeuo', d)
    names = sorted(f[:-5] for f in os.listdir(folder) if f.endswith('.webp'))
    for n in names:
        out.append(f'html[data-icons="{key}"] .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{n}.webp")}}')
    if {'chevron-up', 'chevron-down', 'move'} <= set(names):
        out.append(f'html[data-icons="{key}"] .repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}/chevron-up.webp")!important}}')
        out.append(f'html[data-icons="{key}"] .repo-block-hidden>.repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}/chevron-down.webp")!important}}')
        out.append(f'html[data-icons="{key}"] .repo-block-tools .repo-drag{{background-image:url("icons/skeuo/{d}/move.webp")!important}}')
    for n, target in ALIASES[key].items():
        if n not in names and target in names:
            out.append(f'html[data-icons="{key}"] .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{target}.webp")}}')
    # jeu du Centre : pages du Centre, hors barre latérale (ses entrées choisissent leur image elles-mêmes)
    cfolder = os.path.join(ROOT, 'shared', 'icons', 'skeuo', d + '-cpco')
    if os.path.isdir(cfolder):
        cnames = sorted(f[:-5] for f in os.listdir(cfolder) if f.endswith('.webp'))
        C = f'html[data-app-theme="cpco"][data-icons="{key}"]'
        for n in cnames:
            out.append(f'{C} .repo-svg[data-i="{n}"]:not(.repo-sidenav .repo-svg){{background-image:url("icons/skeuo/{d}-cpco/{n}.webp")}}')
        if {'chevron-up', 'chevron-down', 'move'} <= set(cnames):
            out.append(f'{C} .repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}-cpco/chevron-up.webp")!important}}')
            out.append(f'{C} .repo-block-hidden>.repo-block-heading-rich .repo-toggle::before{{background-image:url("icons/skeuo/{d}-cpco/chevron-down.webp")!important}}')
            out.append(f'{C} .repo-block-tools .repo-drag{{background-image:url("icons/skeuo/{d}-cpco/move.webp")!important}}')
        for n, target in ALIASES[key].items():
            if n not in cnames and target in cnames:
                out.append(f'{C} .repo-svg[data-i="{n}"]:not(.repo-sidenav .repo-svg){{background-image:url("icons/skeuo/{d}-cpco/{target}.webp")}}')
out.append(END)
p = os.path.join(ROOT, 'shared', 'block_icons.css')
raw = open(p, 'rb').read().decode('utf-8'); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
if BEGIN in s:
    s = s[:s.index(BEGIN)] + s[s.index(END) + len(END):].lstrip('\n')
s = s.rstrip('\n') + '\n' + '\n'.join(out) + '\n'
open(p, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
print(f'{len(out) - 2} règles')
