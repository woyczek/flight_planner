"""Section « jeux d'icônes skeuomorphes » de shared/block_icons.css : Laiton (brass), Acier (steel), Gel (gel).

Chaque icône du registre a une image dans shared/icons/skeuo/<dossier>/<nom>.webp : découpée dans les planches de
maquette (tools/icons_from_sheets.html) ou fabriquée dans leur style (tools/icons_skeuo_generator.html). En jeu
skeuomorphe (html[data-icons="brass" | "steel" | "gel"], quel que soit le design), l'image remplace le tracé
(svg.repo-svg[data-i]) partout, un peu plus grande que le trait. ALIASES : nom sans image propre → image d'un autre.
Relancer après une nouvelle découpe ou génération : python tools/build_skeuo_icons_css.py, puis bump_versions.py.
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS = {'brass': 'cabinet', 'steel': 'field', 'gel': 'aqua'}
ALIASES = {'brass': {'save': 'bookmark', 'file': 'file'}, 'steel': {'file': 'file-text'}, 'gel': {'file': 'file-text'}}
BEGIN = '/* ==== JEUX D\'ICÔNES SKEUOMORPHES (généré par tools/build_skeuo_icons_css.py) ==== */'
END = '/* ==== fin des jeux skeuomorphes ==== */'
ANY = 'html:is([data-icons="brass"],[data-icons="steel"],[data-icons="gel"])'
out = [BEGIN,
       f'{ANY} .repo-svg[data-i]{{background-position:center;background-size:contain;background-repeat:no-repeat;--rs:1.6em}}',
       f'{ANY} .repo-svg[data-i]>*{{display:none}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon){{background:none!important;box-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important}}',
       f'{ANY} :is(.repo-block-icon,.repo-card-icon) .repo-svg[data-i]{{--rs:46px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}}',
       f'{ANY} .repo-card-icon .repo-svg[data-i]{{--rs:38px}}',
       f'{ANY} .repo-sidenav-item .repo-svg[data-i]{{--rs:36px}}',
       f'{ANY} .repo-dropzone-badge{{background:none!important}}{ANY} .repo-dropzone-badge .repo-svg[data-i]{{--rs:42px}}',
       f'{ANY} .repo-notice>.repo-icon .repo-svg[data-i]{{--rs:30px}}',
       f'{ANY} .repo-sidenav-brand .repo-svg[data-i]{{--rs:34px}}']
for key, d in SETS.items():
    folder = os.path.join(ROOT, 'shared', 'icons', 'skeuo', d)
    names = sorted(f[:-5] for f in os.listdir(folder) if f.endswith('.webp'))
    for n in names:
        out.append(f'html[data-icons="{key}"] .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{n}.webp")}}')
    for n, target in ALIASES[key].items():
        if n not in names and target in names:
            out.append(f'html[data-icons="{key}"] .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{target}.webp")}}')
out.append(END)
p = os.path.join(ROOT, 'shared', 'block_icons.css')
raw = open(p, 'rb').read().decode('utf-8'); crlf = '\r\n' in raw; s = raw.replace('\r\n', '\n')
if BEGIN in s:
    s = s[:s.index(BEGIN)] + s[s.index(END) + len(END):].lstrip('\n')
s = s.rstrip('\n') + '\n' + '\n'.join(out) + '\n'
open(p, 'wb').write((s.replace('\n', '\r\n') if crlf else s).encode('utf-8'))
print(f'{len(out) - 2} règles')
