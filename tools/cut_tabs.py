"""Découpe des onglets de page d'un design à matières (docs/ASSETS_A_FOURNIR.md § 6) depuis sa planche.

Planche source : docs/planches/onglets_<design>.webp (fond transparent ; poussoir relâché, poussoir enfoncé, rail),
cadrages en pixels de la planche dans CONFIG ci-dessous (à mesurer à l'arrivée d'une planche). Sortie :
shared/deco/<design>/tabs/rail.webp, tab.webp, tab-on.webp — sans texte (libellés posés par la page), en résolution
d'origine (la feuille de style les met à l'échelle par border-image).

Deux montages :
- « plaques » (Cabinet) : chaque onglet est la plaque de la planche, posée sur le rail ; rail = embout gauche + milieu
  uni répété (section lisse, sans rivet : il s'étire sur toute la largeur de la page) + embout droit ;
- « cellules » (Carnet de vol) : le rail fourni a des fenêtres ; chaque onglet est une cellule du rail (demi-séparateur,
  fenêtre élargie à la longueur du bouton, demi-séparateur) avec le bouton de la planche dedans (relâché, ou allumé
  avec une lueur sur le bord de la fenêtre) ; les cellules accolées refont le rail, ses embouts (rail.webp : embout
  gauche, milieu transparent, embout droit) le ferment.

Usage (racine du dépôt) : python tools/cut_tabs.py [design…]   (défaut : tous les designs de CONFIG)
Puis : python tools/bump_versions.py. Les découpes à 9 parties sont dans la section du design de
shared/designs_skeuo.css (« ONGLETS DE PAGE ») ; les largeurs utiles sont affichées ici. Dépend de Pillow.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# boîtes (x0, y0, x1, y1), bornes incluses, en pixels de la planche
CONFIG = {
    'flightlog': {
        'sheet': 'onglets_flightlog.webp',
        'mode': 'cellules',
        # cellule du rail : du milieu d'un séparateur au milieu du suivant ; fenêtre (transparente) dedans
        'cell': (570, 362, 999, 558),
        'window': (600, 398, 970, 530),
        # boutons (sans leur plaque) dans les poussoirs relâché et allumé de la planche
        'button': (255, 117, 863, 263),
        'button_on': (1147, 117, 1755, 263),
        'glow': (255, 170, 40),
        # embouts du rail, chacun jusqu'au milieu de séparateur équivalent
        'rail_left': (46, 362, 137, 558),
        'rail_right': (1862, 362, 1953, 558),
    },
    'cabinet': {
        'sheet': 'onglets_cabinet.webp',
        'mode': 'plaques',
        'tab': (76, 120, 958, 388),
        'tab_on': (1041, 120, 1923, 388),
        'rail_left': (78, 450, 176, 593),
        'rail_right': (1824, 450, 1923, 593),
        'rail_fill': (250, 450, 550, 593),
    },
}
FILL_W = 240  # largeur du milieu du rail


def crop(im, box):
    x0, y0, x1, y1 = box
    return im.crop((x0, y0, x1 + 1, y1 + 1))


def rail_of(left, right, fill=None):
    h = left.size[1]
    if right.size[1] != h or (fill and fill.size[1] != h):
        sys.exit('embouts et milieu du rail de hauteurs différentes')
    rail = Image.new('RGBA', (left.size[0] + FILL_W + right.size[0], h), (0, 0, 0, 0))
    rail.paste(left, (0, 0))
    if fill:
        for x in range(0, FILL_W, fill.size[0]):
            rail.paste(fill, (left.size[0] + x, 0))
    rail.paste(right, (left.size[0] + FILL_W, 0))
    return rail


def cells(im, c):
    """Cellules relâchée et allumée : fenêtre de la cellule élargie à la longueur du bouton (mis à la hauteur de la
    fenêtre), bouton dessous, bord de la cellule par-dessus ; lueur sur le bord pour la cellule allumée."""
    cx0, cy0, cx1, cy1 = c['cell']
    wx0, wy0, wx1, wy1 = c['window']
    cell = crop(im, c['cell'])
    lw, rw = wx0 - cx0 + 12, cx1 - wx1 + 12  # parties gardées de chaque côté (bord arrondi de la fenêtre compris)
    wh = wy1 - wy0 + 1
    out = []
    for key, lit in (('button', False), ('button_on', True)):
        b = crop(im, c[key])
        bh = wh - 2
        bw = round(b.size[0] * bh / b.size[1])
        b = b.resize((bw, bh), Image.LANCZOS)
        mid_w = bw + 4 - (wx1 - wx0 + 1 - 24)  # milieu ajouté pour que la fenêtre fasse la largeur du bouton
        mid_src = cell.crop((cell.size[0] // 2 - 1, 0, cell.size[0] // 2 + 1, cell.size[1]))  # colonne du milieu
        W = lw + max(0, mid_w) + (wx1 - wx0 + 1 - 24) + rw
        frame = Image.new('RGBA', (W, cell.size[1]), (0, 0, 0, 0))
        left = cell.crop((0, 0, lw + (wx1 - wx0 + 1 - 24) // 2, cell.size[1]))
        right = cell.crop((cell.size[0] - rw - (wx1 - wx0 + 1 - 24 + 1) // 2, 0, cell.size[0], cell.size[1]))
        frame.paste(left, (0, 0))
        frame.paste(right, (W - right.size[0], 0))
        for x in range(left.size[0], W - right.size[0], mid_src.size[0]):
            frame.paste(mid_src, (x, 0))
        img = Image.new('RGBA', frame.size, (0, 0, 0, 0))
        win_x0 = wx0 - cx0
        win_x1 = W - (cx1 - wx1) - 1
        # fond du creux, noir comme dans les poussoirs de la planche (la fenêtre du rail est transparente)
        ImageDraw.Draw(img).rounded_rectangle((win_x0, wy0 - cy0, win_x1, wy1 - cy0), radius=16, fill=(12, 10, 8, 255))
        img.paste(b, (round((win_x0 + win_x1 - bw) / 2), wy0 - cy0 + 1), b)
        img = Image.alpha_composite(img, frame)
        if lit:  # lueur ambrée sur le bord de la fenêtre et le haut du bouton
            glow = Image.new('L', img.size, 0)
            ImageDraw.Draw(glow).rounded_rectangle((win_x0 - 2, wy0 - cy0 - 2, win_x1 + 2, wy1 - cy0 + 2), radius=18, outline=255, width=7)
            glow = glow.filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * .75))
            layer = Image.new('RGBA', img.size, c['glow'] + (0,))
            layer.putalpha(glow)
            layer.putalpha(Image.composite(glow, Image.new('L', img.size, 0), img.getchannel('A')))
            img = Image.alpha_composite(img, layer)
        out.append(img)
        print(f'  cellule {"allumée" if lit else "relâchée"} : {W} × {cell.size[1]} ; fenêtre x {win_x0}–{win_x1} ; bouton {bw} × {bh}')
    return out


def cut(design):
    c = CONFIG[design]
    im = Image.open(os.path.join(ROOT, 'docs', 'planches', c['sheet'])).convert('RGBA')
    out = os.path.join(ROOT, 'shared', 'deco', design, 'tabs')
    os.makedirs(out, exist_ok=True)
    left, right = crop(im, c['rail_left']), crop(im, c['rail_right'])
    if c['mode'] == 'cellules':
        tab, on = cells(im, c)
        rail = rail_of(left, right)
    else:
        tab, on = crop(im, c['tab']), crop(im, c['tab_on'])
        rail = rail_of(left, right, crop(im, c['rail_fill']))
    if tab.size != on.size:
        sys.exit(f'{design} : onglets relâché {tab.size} et enfoncé {on.size} de tailles différentes')
    for name, img in (('tab.webp', tab), ('tab-on.webp', on), ('rail.webp', rail)):
        img.save(os.path.join(out, name), 'WEBP', quality=88, method=6)
        print(f'{design}/tabs/{name} : {img.size[0]} × {img.size[1]}')
    print(f'  rail : embouts {left.size[0]} et {right.size[0]} px, hauteur {rail.size[1]} px')


if __name__ == '__main__':
    for d in sys.argv[1:] or CONFIG:
        cut(d)
