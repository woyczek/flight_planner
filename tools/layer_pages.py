"""Couches CSS d'une page (docs/technique/REFACTORING_TOOLKIT.md, chantier 3) : ordre lib < page < hors couche (framework,
designs, styles posés par les scripts), pour que les designs à matières l'emportent sans !important.

Usage (à la racine du dépôt) :
    python tools/layer_pages.py apps/…/page.html [autres pages…]
    python tools/layer_pages.py --check apps/…/page.html   → montre ce qui serait fait, sans écrire

Pour chaque page :
- en tête du <head> : <style id="repoLayers">@layer lib, page; et les feuilles de page importées dans leur couche
  (@import url(…) layer(lib|page)) à la place de leurs <link> : bibliothèques (MapLibre) → lib ; mission_core/core.css,
  maintenance.css → page ; repository_nav.css reste hors couche (composants du framework : en couche, ils perdraient
  face aux styles posés par les scripts, qui sont hors couche) ;
- chaque <style> de la page : ses règles dans @layer page { … }, sauf les règles propres aux designs (sélecteur
  html[data-skeuo…], html[data-design…], html[data-tone…], html[data-decor…]) qui restent hors couche (comme les
  feuilles des designs et les styles posés par les scripts) : elles gardent la main sur la page.
Les feuilles des designs (designs.css, designs_skeuo.css, block_icons.css) et les styles injectés par les scripts restent
hors couche. Vérification : tools/skeuo_regression.html (référence avant, comparaison après).
"""
import io, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
COUCHE = {  # feuille partagée (fin du chemin) → couche ; les autres (repository_nav.css : composants du framework,
    # barre latérale, outils des blocs…) restent hors couche, comme les designs et les styles posés par les scripts
    'shared/carto/maplibre-gl.css': 'lib',
    'shared/mission_core/core.css': 'page',
    'shared/maintenance.css': 'page',
}
DESIGN = re.compile(r'^\s*html(?::is\()?\[data-(skeuo|design|tone|decor|icons|app-theme)')


def blocs(css):
    """Découpe une feuille en blocs de premier niveau (commentaires, règles, @media…), texte exact conservé."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = i
        while j < n and css[j].isspace():
            j += 1
        if j >= n:
            out.append(css[i:])
            break
        if css.startswith('/*', j):
            k = css.index('*/', j) + 2
            out.append(css[i:k])
            i = k
            continue
        depth, k, q = 0, j, None
        while k < n:
            c = css[k]
            if q:
                if c == '\\':
                    k += 1
                elif c == q:
                    q = None
            elif c in '"\'':
                q = c
            elif css.startswith('/*', k):
                k = css.index('*/', k) + 1
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    k += 1
                    break
            elif c == ';' and depth == 0:
                k += 1
                break
            k += 1
        out.append(css[i:k])
        i = k
    return out


def est_design(bloc):
    """Règle propre aux designs (sélecteur html[data-…]) ; @media : toutes ses règles le sont."""
    b = bloc.strip()
    if b.startswith('/*'):
        return None   # commentaire : suit le bloc suivant
    if b.startswith('@media') or b.startswith('@supports'):
        inner = b[b.index('{') + 1:b.rindex('}')]
        rules = [x for x in blocs(inner) if x.strip() and not x.strip().startswith('/*')]
        return bool(rules) and all(DESIGN.match(x.strip()) for x in rules)
    sel = b.split('{')[0]
    # sélecteurs de la liste : virgules de premier niveau seulement (pas celles de :is(…), :not(…))
    parts, depth, cur = [], 0, ''
    for c in sel:
        depth += (c == '(') - (c == ')')
        if c == ',' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += c
    parts.append(cur)
    return all(DESIGN.match(s) for s in parts if s.strip())


def partager(css):
    """(règles de la page, règles des designs) : commentaires rattachés au bloc qui les suit."""
    page, design, attente = [], [], []
    for b in blocs(css):
        d = est_design(b)
        if d is None:
            attente.append(b)
            continue
        (design if d else page).extend(attente + [b])
        attente = []
    page.extend(attente)
    return ''.join(page).strip('\n'), ''.join(design).strip('\n')


def migrer(path, check=False):
    s = io.open(path, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    t = s.replace('\r\n', '\n')
    if 'id="repoLayers"' in t:
        return 'déjà en couches'
    imports = []
    for m in list(re.finditer(r'<link rel="stylesheet" href="([^"]+)">', t)):
        href = m.group(1)
        couche = next((c for k, c in COUCHE.items() if href.split('?')[0].endswith(k)), None)
        if couche:
            imports.append(f'@import url("{href}") layer({couche});')
            t = t.replace(m.group(0), '', 1)
    ecarts = []

    def st(m):
        attrs, corps = m.group(1), m.group(2)
        page, design = partager(corps)
        ecarts.append((len(page), len(design)))
        out = ''
        if page.strip():
            out += f'<style{attrs}>\n@layer page {{\n{page}\n}}\n</style>'
        if design.strip():
            out += f'<style{attrs if not page.strip() else ""} data-layer="designs">\n{design}\n</style>'
        return out
    t = re.sub(r'<style([^>]*)>(.*?)</style>', st, t, flags=re.S)
    tete = '<style id="repoLayers">\n@layer lib, page;\n' + '\n'.join(imports) + '\n</style>\n'
    i = t.index('<head>') + len('<head>')
    j = t.find('<meta name="viewport"', i)
    j = t.index('>', j) + 1 if j >= 0 else i
    t = t[:j] + tete + t[j:]
    if not check:
        io.open(path, 'w', encoding='utf-8', newline='').write(t.replace('\n', nl))
    return f'{len(imports)} feuille(s) importée(s), {len(ecarts)} <style> (page / designs : {ecarts})'


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    args = sys.argv[1:]
    check = '--check' in args
    for p in [a for a in args if a != '--check']:
        print(f'{p} : {migrer(os.path.join(ROOT, p), check)}')
