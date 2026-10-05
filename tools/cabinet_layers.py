"""Calques du range-dossier Cabinet, pour l'animation d'ouverture de Mes missions.

La couverture fermée (shared/deco/cabinet/mission-cover.webp, 720 x 1015) montre la liasse de la mission glissée
dans le range-dossier : coins hauts et poche basse par-dessus. Ce script la découpe en trois calques de même toile
(fond, liasse, avant) pour que la liasse puisse sortir du range-dossier et y rentrer :

  mission-wallet-back.webp   le range-dossier vide (la place de la liasse remplie de carton)
  mission-sheets.webp        la liasse détourée, entière (la partie cachée par la poche reconstituée)
  mission-wallet-front.webp  coins hauts et poche basse seuls (transparent ailleurs)

Les mesures (en px de la couverture) sont reprises en JS (mes_missions.html, SHEET) : les changer aux deux endroits.

    python tools/cabinet_layers.py
"""
import os
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECO = os.path.join(ROOT, 'shared', 'deco', 'cabinet')

# liasse : rectangle visible (haut, gauche, droite) et bas caché sous la poche
SX0, SY0, SX1, SY1 = 87, 40, 678, 990
POCKET_TOP = 717
# coins hauts et poche basse (avant), polygones en px de la couverture
FRONT = [
    [(0, 0), (128, 0), (128, 17), (22, 118), (0, 118)],  # coin haut gauche
    [(586, 0), (720, 0), (720, 124), (690, 121), (586, 18)],  # coin haut droit
    [(0, 620), (13, 623), (103, 716), (606, 716), (705, 629), (720, 626), (720, 1015), (0, 1015)],  # poche
]


def mask(size, polys, feather=1.2):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon(p, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def main():
    cover = Image.open(os.path.join(DECO, 'mission-cover.webp')).convert('RGBA')
    W, H = cover.size
    front_mask = mask((W, H), FRONT)

    # avant : coins et poche seuls
    front = cover.copy()
    front.putalpha(front_mask)
    front.save(os.path.join(DECO, 'mission-wallet-front.webp'), quality=88)

    # liasse : partie visible, coins hauts comblés de papier (copie décalée vers le bas), bas reconstitué à partir du
    # milieu de la feuille (raccord en fondu)
    vis = cover.crop((SX0, SY0, SX1, POCKET_TOP))
    w, hv = vis.size
    h = SY1 - SY0
    sheet = Image.new('RGBA', (w, h))
    sheet.paste(vis, (0, 0))
    corners = mask((W, H), FRONT[:2], 2).crop((SX0, SY0, SX1, POCKET_TOP))
    patch = cover.crop((SX0, SY0 + 130, SX1, POCKET_TOP + 130))
    sheet.paste(patch, (0, 0), corners)
    low = cover.crop((SX0, POCKET_TOP - (h - hv) - 60, SX1, POCKET_TOP - 60))
    band = 40
    grad = Image.linear_gradient('L').resize((w, band)).point(lambda v: v)  # 0 en haut → 255 en bas
    under = Image.new('RGBA', (w, h - hv + band))
    under.paste(low.crop((0, max(0, low.height - (h - hv) - band), w, low.height)).resize((w, h - hv + band)), (0, 0))
    m = Image.new('L', under.size, 255)
    m.paste(grad, (0, 0))
    sheet.paste(under, (0, hv - band), m)
    sheet.save(os.path.join(DECO, 'mission-sheets.webp'), quality=88)

    # fond : la place de la liasse en carton (teinte de la bande de carton à gauche, grain, ombre sur les bords)
    strip = cover.crop((48, 160, 82, 600)).convert('RGB')
    px = list(strip.getdata())
    base = tuple(sum(c[i] for c in px) // len(px) for i in range(3))
    rnd = random.Random(7)
    card = Image.new('RGB', (SX1 - SX0, POCKET_TOP - SY0 + 40), base)
    noise = Image.effect_noise(card.size, 18).convert('L')
    card = Image.composite(card.point(lambda v: min(255, v + 10)), card.point(lambda v: max(0, v - 10)), noise)
    for _ in range(140):  # piqûres du carton
        x, y = rnd.randrange(card.width), rnd.randrange(card.height)
        ImageDraw.Draw(card).ellipse((x, y, x + rnd.randint(1, 3), y + rnd.randint(1, 3)), fill=tuple(max(0, c - 40) for c in base))
    card = card.filter(ImageFilter.GaussianBlur(.6))
    shade = Image.new('L', card.size, 0)
    ImageDraw.Draw(shade).rectangle((0, 0, card.width - 1, card.height - 1), outline=255, width=10)
    shade = shade.filter(ImageFilter.GaussianBlur(9))
    card = Image.composite(card.point(lambda v: int(v * .78)), card, shade)
    back = cover.copy()
    back.paste(card.convert('RGBA'), (SX0, SY0))
    back.save(os.path.join(DECO, 'mission-wallet-back.webp'), quality=88)
    print('ok', front.size, sheet.size, back.size)


if __name__ == '__main__':
    main()
