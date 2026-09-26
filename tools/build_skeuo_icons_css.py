"""Section « jeux d'icônes raster » de shared/designs_skeuo.css : une règle par icône découpée dans les planches
(tools/icons_from_sheets.html → shared/icons/skeuo/<design>/<nom>.webp) ; SETS : nom du registre → image (alias
permis, ex. save → bookmark). Relancer après une nouvelle découpe : python tools/build_skeuo_icons_css.py
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
SETS = {
    'cabinet': {'book': 'book', 'plus': 'plus', 'bookmark': 'bookmark', 'save': 'bookmark', 'refresh': 'refresh', 'sparkles': 'sparkles',
                'download': 'download', 'printer': 'printer', 'x': 'x', 'info': 'info'},
    'field': {'file-text': 'file-text', 'file': 'file-text', 'book': 'book', 'x': 'x', 'settings': 'settings', 'map': 'map', 'plane': 'plane',
              'target': 'target', 'refresh': 'refresh', 'info': 'info', 'alert': 'alert', 'globe': 'globe', 'sparkles': 'sparkles'},
    'aqua': {'settings': 'settings', 'folder': 'folder', 'pin': 'pin', 'file-text': 'file-text', 'file': 'file-text', 'users': 'users',
             'info': 'info', 'check': 'check', 'alert': 'alert', 'x': 'x'},
}
CTX = ':is(.repo-block-icon,.repo-card-icon,.repo-sidenav-item,.repo-icon-only,.repo-dropzone-badge,.repo-notice,.repo-raster)'
out = ['''/* ================================================================================================ JEUX D'ICÔNES RASTER
   Jeu « Matière » : icônes découpées dans les planches de maquette (tools/icons_from_sheets.html →
   shared/icons/skeuo/<design>/), substituées au tracé (svg[data-i]) dans les emplacements d'icône « posée » : blocs,
   sous-cartes, barre latérale, boutons à icône seule, zones de dépôt, bandeaux. Icônes sans image : médaillon
   (Cabinet), plaque d'acier (Durci) ou bulle (Aqua) dessinés, même allure. Section générée : liste des images. */''']
for d, m in SETS.items():
    names = sorted(m)
    sel = ','.join(f'[data-i="{n}"]' for n in names)
    pre = f'html[data-design="{d}"][data-icons="matter"]'
    for n in names:
        out.append(f'{pre} {CTX} .repo-svg[data-i="{n}"]{{background-image:url("icons/skeuo/{d}/{m[n]}.webp")!important}}')
    out.append(f'{pre} {CTX} .repo-svg:is({sel}){{background-position:center!important;background-size:contain!important;background-repeat:no-repeat!important}}')
    out.append(f'{pre} {CTX} .repo-svg:is({sel})>g{{display:none}}')
    out.append(f'{pre} :is(.repo-block-icon,.repo-card-icon):has(>.repo-svg:is({sel})){{background:none!important;box-shadow:none!important;border-radius:0!important}}')
    out.append(f'{pre} :is(.repo-block-icon,.repo-card-icon):has(>.repo-svg:is({sel}))>.repo-svg{{--rs:44px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))}}')
    out.append(f'{pre} .repo-sidenav-item .repo-svg:is({sel}){{--rs:36px;padding:0!important;box-shadow:none!important;border-radius:0!important;background-color:transparent!important}}')
    out.append(f'{pre} :is(.repo-icon-only,.repo-dropzone-badge,.repo-notice) .repo-svg:is({sel}){{--rs:28px}}')
p = ROOT + 'shared/designs_skeuo.css'
s = open(p, encoding='utf-8').read()
start = s.find('/* ================================================================================================ JEUX D\'ICÔNES RASTER')
if start >= 0:
    end = s.find('/* ---- fin des jeux raster */', start); s = s[:start] + s[end + len('/* ---- fin des jeux raster */\n'):]
s = s.rstrip('\n') + '\n' + '\n'.join(out) + '\n/* ---- fin des jeux raster */\n'
open(p, 'w', encoding='utf-8', newline='\n').write(s)
print(len(out))
