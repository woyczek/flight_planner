"""Découpe d'une feuille de registre (fond des blocs de tableau des registres, design_deco.js › SHEETS) en morceaux
WebP pour shared/designs_skeuo.css (.repo-deco-sheet) : coins fixes aux bords intérieurs fondus, tranches répétées
raccordables (fondu enchaîné), pièces d'en-tête facultatives, papier de fond uni (lignes effacées).

Une configuration par design (CONFIGS) : planche source (non versionnée, dans shared/deco/<design>/), coordonnées des
morceaux dans la planche. Le script écrit shared/deco/<design>/sheet-*.webp et affiche les jetons de géométrie
(--sh-*, en px de planche) à reporter dans designs_skeuo.css pour ce design. Les accessoires posés sur le bord gauche
(ficelle de Cabinet, crayon de Durci : sheet-string.webp) sont des images transparentes livrées à part, non produites
ici.

Usage (ImageMagick 7, à la racine du dépôt) :
  python tools/cut_register_sheet.py cabinet|flightlog|field
Puis python tools/bump_versions.py et vérification dans une page à registre (ton clair).
"""
import os, subprocess, sys, tempfile

# Coordonnées en px de la planche : crop (x, y, largeur, hauteur) ; fondu des bords intérieurs (px) ; bandes : largeur
# (ou hauteur) du motif répété et chevauchement o du fondu enchaîné.
CONFIGS = {
    # dossier « Aéronautique navale » : pages qui dépassent du livre en haut à gauche, dos à gauche, pages empilées à
    # droite ; en-tête en deux pièces (logos ; N° et tampon)
    'cabinet': {
        'src': 'ChatGPT Image 30 Sept 2026, 11_48_14.png',
        'tl': ((40, 45, 720, 115), dict(right=60, bottom=40)),
        'tr': ((880, 45, 225, 155), dict(left=50, bottom=40)),
        'bl': ((40, 1232, 260, 98), dict(right=50, top=20)),
        'br': ((880, 1232, 225, 98), dict(left=50, top=24)),
        'top': ((780, 45, 120, 115, 40, 'x'), dict(bottom=40)),
        'bot': ((420, 1232, 160, 98, 40, 'x'), dict(top=30)),
        'left': ((40, 900, 210, 280, 40, 'y'), dict(right=40)),
        'right': ((1000, 490, 105, 360, 40, 'y'), dict(left=30)),
        'pieces': {
            # logos et « Marine nationale » ; bout du tampon effacé (x, y, largeur, hauteur dans la pièce)
            'head': ((230, 150, 300, 270), [(260, 220, 40, 50)], dict(left=50, right=60, top=40, bottom=50)),
            # N° et tampon ; fin de « Aéronautique navale » effacée
            'stamp': ((480, 190, 530, 300), [(0, 0, 42, 62)], dict(left=60, right=40, top=30, bottom=50)),
        },
        # papier : zone réglée (pointillés effacés), à la couleur du papier de l'en-tête
        'paper': ((405, 665, 540, 540), (525, 100, 250, 170)),
    },
    # carnet de terrain de Durci : pochette olive à fermeture éclair, bloc de papier réglé ; crayon dans son étui
    # élastique livré à part (sheet-string.webp), posé à gauche
    # carnet de vol (Carnet de vol) : couverture toilée, dos à gauche, pages empilées à droite, coin corné en haut à droite ;
    # en-tête imprimé (Marianne, ministère, « Carnet de vol ») en une pièce ; ficelle et cachet livrés à part
    'flightlog': {
        'src': 'ChatGPT Image 30 Sept 2026, 15_29_25.png',
        'tl': ((39, 84, 240, 130), dict(right=30, bottom=30), dict(erase=[(105, 30, 135, 100)])),
        'tr': ((840, 84, 184, 200), dict(left=30, bottom=30), dict(erase=[(0, 90, 110, 110)])),
        'bl': ((39, 1300, 240, 167), dict(right=30, top=30), dict(erase=[(105, 0, 135, 120)])),
        'br': ((840, 1300, 184, 167), dict(left=30, top=30), dict(erase=[(0, 0, 110, 110)])),
        'top': ((420, 84, 120, 70, 40, 'x'), dict(bottom=20)),
        'bot': ((420, 1395, 140, 72, 40, 'x'), dict(top=20)),
        'left': ((39, 500, 110, 300, 40, 'y'), dict(right=20)),
        'right': ((918, 500, 106, 300, 40, 'y'), dict(left=20)),
        'pieces': {
            'head': ((160, 145, 745, 185), [], dict(left=40, right=40, top=30, bottom=30)),
        },
        # papier : intérieur du tableau (filets pointillés effacés) ; couleur : papier de l'en-tête (droite de « République
        # française ») : pas de rectangle visible autour de l'en-tête
        'paper': ((300, 400, 600, 600), (740, 150, 140, 45)),
    },
    'field': {
        'src': 'ChatGPT Image 30 Sept 2026, 15_10_41.png',
        # coins larges : les pattes de cuir entières, fondu étroit posé sur la toile unie ; intérieur du papier (filets du
        # tableau) effacé en douceur, le papier uni de fond le remplace
        'tl': ((60, 30, 500, 260), dict(right=30, bottom=30), dict(erase=[(90, 165, 410, 95)])),
        'tr': ((700, 30, 324, 350), dict(left=30, bottom=30), dict(erase=[(0, 165, 100, 185)], shear=0.02, y0=685)),
        'bl': ((60, 1220, 360, 280), dict(right=30, top=30), dict(erase=[(90, 0, 270, 116)])),
        'br': ((700, 1220, 324, 280), dict(left=30, top=30), dict(erase=[(0, 0, 100, 116)], shear=0.02, y0=685)),
        'top': ((560, 30, 120, 168, 40, 'x'), dict(bottom=30)),
        'bot': ((420, 1335, 140, 165, 40, 'x'), dict(top=24)),
        'left': ((60, 420, 116, 360, 40, 'y'), dict(right=30)),
        # bord droit évasé dans la planche (+18 px sur 900) : redressé avant le raccord, et les coins droits avec lui
        # (même hauteur de référence y0) : coins et bande sur une même verticale
        'right': ((800, 520, 224, 330, 40, 'y'), dict(left=30), dict(shear=0.02, y0=685)),
        'pieces': {},
        'paper': ((300, 320, 480, 480), (300, 320, 480, 480)),
    },
}
Q = ['-quality', '86', '-define', 'webp:alpha-quality=92']
T = tempfile.mkdtemp()   # fichiers intermédiaires


def run(*a):
    subprocess.run(['magick', *a], check=True)


def size(path):
    return tuple(map(int, subprocess.run(['magick', 'identify', '-format', '%w %h', path], capture_output=True, text=True).stdout.split()))


def crop(src, box, out):
    x, y, w, h = box
    run(src, '-crop', f'{w}x{h}+{x}+{y}', '+repage', out)


def feather(inp, out, left=0, right=0, top=0, bottom=0):
    """Transparence progressive sur les bords indiqués (px) : raccord doux avec la bande voisine ou le papier."""
    w, h = size(inp)
    m = ['-size', f'{w}x{h}', 'xc:white']
    if left: m += ['(', '-size', f'{h}x{left}', 'gradient:black-white', '-rotate', '-90', ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite']
    if right: m += ['(', '-size', f'{h}x{right}', 'gradient:black-white', '-rotate', '90', ')', '-geometry', f'+{w - right}+0', '-compose', 'multiply', '-composite']
    if top: m += ['(', '-size', f'{w}x{top}', 'gradient:black-white', ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite']
    if bottom: m += ['(', '-size', f'{w}x{bottom}', 'gradient:white-black', ')', '-geometry', f'+0+{h - bottom}', '-compose', 'multiply', '-composite']
    # (-geometry remis à zéro : le décalage du dernier fondu ne doit pas déplacer le masque)
    run(inp, '(', '+clone', '-alpha', 'extract', '(', *m, ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite', ')',
        '-alpha', 'off', '-geometry', '+0+0', '-compose', 'copy_opacity', '-composite', *Q, out)


def erase(path, rects):
    """Rectangles (x, y, largeur, hauteur dans le morceau) rendus transparents, bords adoucis : le papier uni du fond
    remplace l'intérieur réglé du papier."""
    w, h = size(path)
    m = ['-size', f'{w}x{h}', 'xc:white', '-fill', 'black']
    for x, y, ew, eh in rects:
        m += ['-draw', f'rectangle {x},{y} {x + ew - 1},{y + eh - 1}']
    run(path, '(', '+clone', '-alpha', 'extract', '(', *m, '-blur', '0x5', ')', '-compose', 'multiply', '-composite', ')',
        '-alpha', 'off', '-compose', 'copy_opacity', '-composite', path)


def sheared(src, x, y0=0):
    """Planche redressée horizontalement (x' = x - pente × (y - y0)) si le morceau le demande (shear, y0), sinon telle
    quelle."""
    if not x.get('shear'):
        return src
    s, y0 = x['shear'], x.get('y0', y0)
    out = f'{T}/shear-{s}-{y0}.png'
    if not os.path.exists(out):
        run(src, '-virtual-pixel', 'transparent', '-distort', 'AffineProjection', f'1,0,{-s},1,{s * y0},0', out)
    return out


def seamless(src, box, out):
    """Bande raccordable : les o premiers px (colonnes ou lignes) fondus avec les o px qui suivent la bande dans la
    planche, pour que la dernière colonne (ligne) enchaîne sur la première."""
    x, y, w, h, o, axis = box
    if axis == 'x':
        crop(src, (x, y, w + o, h), f'{T}/s.png')
        run(f'{T}/s.png', '-crop', f'{w}x{h}+0+0', '+repage', f'{T}/a.png')
        run(f'{T}/s.png', '-crop', f'{o}x{h}+{w}+0', '+repage', f'{T}/b.png')
        run('-size', f'{h}x{o}', 'gradient:white-black', '-rotate', '-90', f'{T}/g.png')   # 1 à gauche → 0 à droite
    else:
        crop(src, (x, y, w, h + o), f'{T}/s.png')
        run(f'{T}/s.png', '-crop', f'{w}x{h}+0+0', '+repage', f'{T}/a.png')
        run(f'{T}/s.png', '-crop', f'{w}x{o}+0+{h}', '+repage', f'{T}/b.png')
        run('-size', f'{w}x{o}', 'gradient:white-black', f'{T}/g.png')
    # suite de la bande estompée posée sur son début ; transparences respectées (pas de noir)
    run(f'{T}/b.png', '(', '+clone', '-alpha', 'extract', f'{T}/g.png', '-compose', 'multiply', '-composite', ')',
        '-alpha', 'off', '-compose', 'copy_opacity', '-composite', f'{T}/bf.png')
    run(f'{T}/a.png', f'{T}/bf.png', '-geometry', '+0+0', '-compose', 'over', '-composite', out)


def main(design):
    c = CONFIGS[design]
    folder = os.path.join('shared', 'deco', design)
    src = os.path.join(folder, c['src'])
    out = lambda n: os.path.join(folder, f'sheet-{n}.webp')
    for n in ('tl', 'tr', 'bl', 'br'):
        box, f, x = (*c[n], {})[:3]
        crop(sheared(src, x), box, f'{T}/{n}.png')
        if x.get('erase'):
            erase(f'{T}/{n}.png', x['erase'])
        feather(f'{T}/{n}.png', out(n), **f)
    for n in ('top', 'bot', 'left', 'right'):
        box, f, x = (*c[n], {})[:3]
        seamless(sheared(src, x, box[1] + box[3] / 2), box, f'{T}/{n}.png')
        feather(f'{T}/{n}.png', out(n), **f)
    for n, (box, holes, f) in c['pieces'].items():
        crop(src, box, f'{T}/{n}.png')
        for ex, ey, ew, eh in holes:
            run(f'{T}/{n}.png', '(', '-size', f'{ew}x{eh}', 'xc:none', ')', '-geometry', f'+{ex}+{ey}', '-compose', 'copy', '-composite', f'{T}/{n}.png')
        feather(f'{T}/{n}.png', out(n), **f)
    # papier : lignes effacées (médiane verticale), éclairage aplani, couleur moyenne de la zone de référence
    (px, py, pw, ph), (mx, my, mw, mh) = c['paper']
    mean = subprocess.run(['magick', src, '-alpha', 'off', '-crop', f'{mw}x{mh}+{mx}+{my}', '+repage', '-scale', '1x1!',
                           '-format', '%[pixel:p{0,0}]', 'info:'], capture_output=True, text=True).stdout
    run(src, '-alpha', 'off', '-crop', f'{pw}x{ph}+{px}+{py}', '+repage', '-statistic', 'Median', '1x13', f'{T}/p.png')
    run(f'{T}/p.png', '(', '+clone', '-blur', '0x40', ')', '-compose', 'DivideSrc', '-composite', '(', '-size', f'{pw}x{ph}',
        f'xc:{mean}', ')', '-compose', 'Multiply', '-composite', '-quality', '86', out('paper'))
    # jetons de géométrie (px de planche) : tailles des coins et des motifs ; arrêts des bandes = coin moins son fondu
    g = {n: c[n][0] for n in ('tl', 'tr', 'bl', 'br', 'top', 'bot', 'left', 'right')}
    fd = {n: c[n][1] for n in ('tl', 'tr', 'bl', 'br')}
    tok = {
        'tl-w': g['tl'][2], 'tl-h': g['tl'][3], 'tr-w': g['tr'][2], 'tr-h': g['tr'][3],
        'bl-w': g['bl'][2], 'bl-h': g['bl'][3], 'br-w': g['br'][2], 'br-h': g['br'][3],
        'top-w': g['top'][2], 'top-h': g['top'][3], 'bot-w': g['bot'][2], 'bot-h': g['bot'][3],
        'left-w': g['left'][2], 'left-h': g['left'][3], 'right-w': g['right'][2], 'right-h': g['right'][3],
        'top-l': g['tl'][2] - fd['tl'].get('right', 0), 'top-r': g['tr'][2] - fd['tr'].get('left', 0),
        'bot-l': g['bl'][2] - fd['bl'].get('right', 0), 'bot-r': g['br'][2] - fd['br'].get('left', 0),
        'left-t': g['tl'][3] - fd['tl'].get('bottom', 0), 'left-b': g['bl'][3] - fd['bl'].get('top', 0),
        'right-t': g['tr'][3] - fd['tr'].get('bottom', 0), 'right-b': g['br'][3] - fd['br'].get('top', 0),
    }
    print(f'papier {mean}')
    print(';'.join(f'--sh-{k}:{v}' for k, v in tok.items()))


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in CONFIGS:
        sys.exit(f'usage : python tools/cut_register_sheet.py {"|".join(CONFIGS)}')
    main(sys.argv[1])
