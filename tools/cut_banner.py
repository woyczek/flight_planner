"""Bannière d'en-tête d'un design (Aqua) : découpe d'une planche « sombre en haut, claire en bas » en trois morceaux par
ton — extrémité gauche, milieu uni, extrémité droite — posés dans shared/deco/<design>/header/ ; la feuille
shared/designs_skeuo.css les place en fond de l'en-tête : gauche calée à gauche, droite calée à droite (hauteur de
l'en-tête), milieu étiré sur toute la largeur (métal brossé horizontal : l'étirement ne se voit pas). Ainsi les objets
des extrémités restent entiers quelle que soit la largeur de la fenêtre.

Usage (à la racine du dépôt) :
    python tools/cut_banner.py <planche.png> [--design aqua] [--gauche 560] [--milieu 620:1100] [--droite 1150]

Les bandes sont trouvées d'après les lignes non blanches de la planche (fond blanc entre elles) : la première est le ton
sombre, la seconde le ton clair. Bornes en pixels de la planche. Copie de la planche : docs/planches/banniere_<design>.webp.
"""
import argparse, os, sys
from PIL import Image
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
HAUTEUR = 220  # hauteur des morceaux (px) : l'en-tête mesure 100 à 160 px, écrans denses compris


def bandes(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    pleine = (1 - (a.min(axis=2) > 245).mean(axis=1)) > .5
    out, y0 = [], None
    for y, v in enumerate(pleine):
        if v and y0 is None:
            y0 = y
        if not v and y0 is not None:
            out.append((y0, y))
            y0 = None
    if y0 is not None:
        out.append((y0, len(pleine)))
    return [b for b in out if b[1] - b[0] > 60]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('planche')
    ap.add_argument('--design', default='aqua')
    ap.add_argument('--gauche', type=int, default=560, help='fin de l’extrémité gauche')
    ap.add_argument('--milieu', default='620:1100', help='zone unie étirée au milieu')
    ap.add_argument('--droite', type=int, default=1150, help='début de l’extrémité droite')
    o = ap.parse_args()
    im = Image.open(o.planche).convert('RGB')
    b = bandes(im)
    if len(b) < 2:
        sys.exit(f'deux bandes attendues (sombre puis claire), trouvées : {b}')
    m0, m1 = map(int, o.milieu.split(':'))
    dest = os.path.join(ROOT, 'shared', 'deco', o.design, 'header')
    os.makedirs(dest, exist_ok=True)
    for ton, (y0, y1) in zip(('sombre', 'clair'), b[:2]):
        band = im.crop((0, y0, im.width, y1))
        k = HAUTEUR / band.height
        for nom, box in (('gauche', (0, 0, o.gauche, band.height)), ('milieu', (m0, 0, m1, band.height)),
                         ('droite', (o.droite, 0, band.width, band.height))):
            piece = band.crop(box)
            piece = piece.resize((max(1, round(piece.width * k)), HAUTEUR), Image.LANCZOS)
            p = os.path.join(dest, f'{ton}-{nom}.webp')
            piece.save(p, 'WEBP', quality=86, method=6)
            print(f'{os.path.relpath(p, ROOT)} {piece.size} {os.path.getsize(p) // 1024} ko')
    planches = os.path.join(ROOT, 'docs', 'planches')
    os.makedirs(planches, exist_ok=True)
    p = os.path.join(planches, f'banniere_{o.design}.webp')
    im.save(p, 'WEBP', quality=88, method=6)
    print(f'{os.path.relpath(p, ROOT)} (copie de la planche)')


if __name__ == '__main__':
    main()
