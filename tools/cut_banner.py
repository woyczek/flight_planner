"""Bandeau du bas de page d'un design (frise « strip » de shared/design_deco.js) : planche « sombre en haut, claire en
bas » sur fond blanc → shared/deco/<design>/footer-sombre.webp et footer-clair.webp (une bande entière par ton) ; le
design les déclare dans SETS (footTones: true) : bandeau sombre en ton sombre, clair en ton clair.

Usage (à la racine du dépôt) :
    python tools/cut_banner.py <planche.png> [--design aqua] [--largeur 2000]

Les bandes sont trouvées d'après les lignes non blanches de la planche (fond blanc entre elles) : la première est le ton
sombre, la seconde le ton clair. Copie de la planche : docs/planches/banniere_<design>.webp.
"""
import argparse, os, sys
from PIL import Image
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


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
    ap.add_argument('--largeur', type=int, default=2000, help='largeur des bandeaux (px)')
    o = ap.parse_args()
    im = Image.open(o.planche).convert('RGB')
    b = bandes(im)
    if len(b) < 2:
        sys.exit(f'deux bandes attendues (sombre puis claire), trouvées : {b}')
    dest = os.path.join(ROOT, 'shared', 'deco', o.design)
    for ton, (y0, y1) in zip(('sombre', 'clair'), b[:2]):
        band = im.crop((0, y0, im.width, y1))
        k = min(1, o.largeur / band.width)
        band = band.resize((round(band.width * k), round(band.height * k)), Image.LANCZOS)
        p = os.path.join(dest, f'footer-{ton}.webp')
        band.save(p, 'WEBP', quality=86, method=6)
        print(f'{os.path.relpath(p, ROOT)} {band.size} {os.path.getsize(p) // 1024} ko')
    planches = os.path.join(ROOT, 'docs', 'planches')
    os.makedirs(planches, exist_ok=True)
    p = os.path.join(planches, f'banniere_{o.design}.webp')
    im.save(p, 'WEBP', quality=88, method=6)
    print(f'{os.path.relpath(p, ROOT)} (copie de la planche)')


if __name__ == '__main__':
    main()
