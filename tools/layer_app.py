"""Couches CSS, modèle « app » (docs/REFACTORING_TOOLKIT.md, phase 3) : socle, styles des scripts et styles des pages
dans UNE couche « app » (ordre et spécificité entre eux inchangés), bibliothèques dans « lib » en dessous, designs hors
couche au-dessus : les designs l'emportent sur l'application sans !important.

Usage (à la racine du dépôt) :
    python tools/layer_app.py --css            → shared/repository_nav.css, mission_core/core.css, maintenance.css, block_icons.css
    python tools/layer_app.py apps/…/page.html […]   → pages (blocs <style> et lien MapLibre)
    --check : montre ce qui serait fait, sans écrire

- feuilles du socle : règles dans @layer app { … } ; repository_nav.css déclare l'ordre « @layer lib, app; » en tête
  (première feuille de chaque page) ; les règles propres aux designs (html[data-skeuo|design|tone|decor…]) restent
  hors couche, après le bloc ;
- pages : chaque <style> devient <style data-layer="app">@layer app { … }</style>, ses règles des designs passent dans
  un <style data-layer="designs"> hors couche ; le <link> de maplibre-gl.css devient, à la même place,
  <style data-layer="lib">@import url(…) layer(lib);</style> ;
- styles posés par les scripts : rangés dans « app » par shared/kit.js (tout <style> sans data-layer).
Déjà migré (data-layer présent, ou feuille commençant par « @layer ») : rien n'est fait. Vérification :
tools/skeuo_regression.html (référence avant, comparaison après).
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer_pages import partager

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SOCLE = ['shared/repository_nav.css', 'shared/mission_core/core.css', 'shared/maintenance.css', 'shared/block_icons.css']
ORDRE = '@layer lib, app;'


def lire(p):
    s = io.open(p, encoding='utf-8', newline='').read()
    return s, ('\r\n' if '\r\n' in s else '\n')


def feuille(rel, check):
    p = os.path.join(ROOT, rel)
    s, nl = lire(p)
    t = s.replace('\r\n', '\n')
    if t.lstrip().startswith('@layer') or '\n@layer app {' in t:
        return f'{rel} : déjà en couche'
    # commentaire d'en-tête gardé en tête
    m = re.match(r'\s*/\*.*?\*/\s*', t, re.S)
    tete, corps = (m.group(0), t[m.end():]) if m else ('', t)
    page, design = partager(corps)
    out = tete + (ORDRE + '\n' if rel.endswith('repository_nav.css') else '') + '@layer app {\n' + page + '\n}\n'
    if design.strip():
        out += '/* règles propres aux designs : hors couche (au-dessus de l\'application) */\n' + design + '\n'
    if not check:
        io.open(p, 'w', encoding='utf-8', newline='').write(out.replace('\n', nl))
    return f'{rel} : {len(page)} car. en couche app, {len(design)} car. de règles des designs hors couche'


def page(rel, check):
    p = os.path.join(ROOT, rel)
    s, nl = lire(p)
    t = s.replace('\r\n', '\n')
    n = {'style': 0, 'designs': 0, 'lib': 0}

    def st(m):
        attrs, corps = m.group(1), m.group(2)
        if 'data-layer' in attrs or corps.lstrip().startswith('@layer'):
            return m.group(0)
        app, design = partager(corps)
        out = ''
        if app.strip():
            n['style'] += 1
            out += f'<style{attrs} data-layer="app">\n@layer app {{\n{app}\n}}\n</style>'
        if design.strip():
            n['designs'] += 1
            out += f'<style{attrs if not app.strip() else ""} data-layer="designs">\n{design}\n</style>'
        return out
    t = re.sub(r'<style([^>]*)>(.*?)</style>', st, t, flags=re.S)

    def lib(m):
        n['lib'] += 1
        return f'<style data-layer="lib">@import url("{m.group(1)}") layer(lib);</style>'
    t = re.sub(r'<link rel="stylesheet" href="([^"]*maplibre-gl\.css[^"]*)">', lib, t)
    if not check and t != s.replace('\r\n', '\n'):
        io.open(p, 'w', encoding='utf-8', newline='').write(t.replace('\n', nl))
    return f'{rel} : {n["style"]} <style> en couche app, {n["designs"]} de règles des designs, {n["lib"]} lien(s) MapLibre en lib'


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    check = '--check' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--css' in sys.argv:
        for rel in SOCLE:
            print(feuille(rel, check))
    for rel in args:
        print(page(rel, check))


if __name__ == '__main__':
    main()
