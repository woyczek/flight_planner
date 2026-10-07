"""Planche contact des en-têtes de l'ordre de mission par organisme, pour chaque design à matières.

Lit, dans apps/pilot/mes_missions.html, les règles « html[data-design="X"] #pmDetail[data-family="F"] .pm-book
.pm-head { background-image: url(…order-header-Y.webp) } » (en-tête de l'émetteur selon la famille de la mission),
les tampons « --pm-fam-stamp » (Carnet de vol) et l'en-tête par défaut de chaque design, puis assemble une planche
par design (docs/technique/planches/rubriques_<design>.jpg) et une planche d'ensemble (docs/technique/planches/rubriques_mission.jpg) :
chaque vignette porte l'organisme et les familles de mission qui y mènent.

Usage (à la racine du dépôt) : python tools/planche_rubriques.py
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PAGE = os.path.join(ROOT, 'apps', 'pilot', 'mes_missions.html')
OUT = os.path.join(ROOT, 'docs', 'technique', 'planches')
DESIGNS = {'cabinet': 'Cabinet', 'flightlog': 'Carnet de vol', 'field': 'Durci', 'aqua': 'Aqua'}
NAMES = {
    # Durci
    'ema': 'EMA — état-major des armées', 'bspp': 'BSPP — brigade des sapeurs-pompiers de Paris', 'ssa': 'SSA — service de santé des armées',
    'hia': 'HIA — hôpital d’instruction des armées', 'dcssa': 'DCSSA — direction centrale du SSA', 'emzd': 'EMZD — état-major de zone de défense',
    'dmd': 'DMD — délégation militaire départementale', 'cpco': 'CPCO — centre de planification et de conduite des opérations',
    # Cabinet
    'mn': 'Marine nationale', 'emg': 'EMG — état-major général', 'fam': 'FAM — force de l’aéronautique navale', 'dfam': 'DFAM — direction de la FAM',
    'prefmar': 'Préfecture maritime', 'ban': 'BAN — base d’aéronautique navale', 'escadrille': 'Escadrille', 'embarquee': 'Flottille embarquée',
    # Carnet de vol
    'snpc': 'SNPC — service national de la protection civile', 'marignane': 'Base de Marignane', 'cev': 'CEV — centre d’essais en vol', 'tam': 'TAM — transport aérien militaire',
    'helico': 'Groupement d’hélicoptères', 'sna': 'SNA — service de la navigation aérienne', 'alat': 'ALAT — aviation légère de l’armée de Terre',
    'aeronavale': 'Aéronautique navale',
    # Aqua
    'sdis': 'SDIS — service départemental d’incendie et de secours', 'samu': 'SAMU', 'hopital': 'Centre hospitalier', 'ars': 'ARS — agence régionale de santé',
    'prefet': 'Préfet', 'interieur': 'Ministère de l’Intérieur', 'coz': 'COZ — centre opérationnel de zone',
}
FAMILIES = ['FIRE', 'HEMS', 'SAR', 'AIRLIFT', 'MARITIME', 'HADR', 'AIRBORNE', 'FI', 'SURVEY', 'LE', 'ISR', 'COMMAND', 'SOF', 'SPECIAL', 'AAR', 'COMBAT']


def font(size, bold=False):
    """Police Windows (Georgia, sinon Arial ; grasse avec bold) à la taille donnée ; police par défaut de Pillow à défaut."""
    for name in (('georgiab.ttf' if bold else 'georgia.ttf'), ('arialbd.ttf' if bold else 'arial.ttf')):
        p = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', name)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def mapping():
    """{ design: { 'headers': { id: [familles] }, 'stamps': { id: [familles] }, 'default': chemin } }"""
    css = open(PAGE, encoding='utf-8').read()
    out = {d: {'headers': {}, 'stamps': {}, 'default': None} for d in DESIGNS}
    for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        designs = set(re.findall(r'data-design="(\w+)"', sel))
        fams = re.findall(r'data-family="(\w+)"', sel)
        head = re.search(r'deco/(\w+)/order-header-([\w-]+)\.webp', body)
        stamp = re.search(r'deco/(\w+)/order-stamp-([\w-]+)\.webp', body)
        default = re.search(r'deco/(\w+)/order-header\.webp', body)
        for d in designs & set(DESIGNS):
            if head and fams:
                out[d]['headers'].setdefault(head.group(2), [])
                out[d]['headers'][head.group(2)] += [f for f in fams if f not in out[d]['headers'][head.group(2)]]
            if stamp and fams:
                out[d]['stamps'].setdefault(stamp.group(2), [])
                out[d]['stamps'][stamp.group(2)] += [f for f in fams if f not in out[d]['stamps'][stamp.group(2)]]
            if default and not fams and default.group(1) == d:
                out[d]['default'] = os.path.join(ROOT, 'shared', 'deco', d, 'order-header.webp')
    return out


def tile(path, title, fams, stamp=None, w=520):
    """Vignette : en-tête (et tampon), organisme, familles."""
    img = Image.open(path).convert('RGBA')
    img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
    st = None
    if stamp and os.path.exists(stamp):
        st = Image.open(stamp).convert('RGBA')
        st = st.resize((150, round(st.height * 150 / st.width)), Image.LANCZOS)
    pad = 14
    text_w = w - (st.width + 16 if st else 0)  # texte à gauche du tampon, renvoyé à la ligne
    probe = ImageDraw.Draw(Image.new('RGB', (1, 1)))

    def wrap(s, f):
        """Texte s renvoyé à la ligne pour tenir dans la largeur de texte de la vignette (police f) ; liste des lignes."""
        lines, cur = [], ''
        for word in s.split():
            nxt = (cur + ' ' + word).strip()
            if probe.textlength(nxt, font=f) <= text_w or not cur:
                cur = nxt
            else:
                lines.append(cur)
                cur = word
        return lines + ([cur] if cur else [])
    f_title, f_fam = font(19, True), font(16)
    t_lines = wrap(title, f_title)
    f_lines = wrap(', '.join(fams) if fams else 'autres familles', f_fam)
    text_h = len(t_lines) * 25 + 4 + len(f_lines) * 21
    h = pad + img.height + 10 + max(text_h, st.height if st else 0) + pad
    t = Image.new('RGBA', (w + 2 * pad, h), (250, 247, 240, 255))
    t.alpha_composite(img, (pad, pad))
    y = pad + img.height + 10
    if st:
        t.alpha_composite(st, (pad + w - st.width, y))
    d = ImageDraw.Draw(t)
    for i, line in enumerate(t_lines):
        d.text((pad, y + i * 25), line, font=f_title, fill=(32, 36, 44))
    y2 = y + len(t_lines) * 25 + 4
    for i, line in enumerate(f_lines):
        d.text((pad, y2 + i * 21), line, font=f_fam, fill=(90, 96, 108))
    d.rectangle([0, 0, t.width - 1, t.height - 1], outline=(196, 188, 170), width=2)
    return t


def sheet(design, data, cols=3):
    """Planche d'un design : une vignette par en-tête d'organisme, plus l'en-tête par défaut avec les familles
    restantes ; None sans en-tête."""
    tiles = []
    for hid, fams in data['headers'].items():
        path = os.path.join(ROOT, 'shared', 'deco', design, f'order-header-{hid}.webp')
        if not os.path.exists(path):
            continue
        stamp = os.path.join(ROOT, 'shared', 'deco', design, f'order-stamp-{hid}.webp') if hid in data['stamps'] else None
        order = sorted(fams, key=lambda f: FAMILIES.index(f) if f in FAMILIES else 99)
        tiles.append(tile(path, NAMES.get(hid, hid.upper()), order, stamp))
    used = {f for fams in data['headers'].values() for f in fams}
    if data['default'] and os.path.exists(data['default']):
        rest = [f for f in FAMILIES if f not in used]
        tiles.append(tile(data['default'], 'En-tête par défaut du design', rest))
    if not tiles:
        return None
    gap, head = 18, 70
    tw, th = max(t.width for t in tiles), max(t.height for t in tiles)
    rows = (len(tiles) + cols - 1) // cols
    W, H = cols * tw + (cols + 1) * gap, head + rows * th + (rows + 1) * gap
    im = Image.new('RGBA', (W, H), (236, 231, 220, 255))
    ImageDraw.Draw(im).text((gap, 20), f'{DESIGNS[design]} — en-têtes de l’ordre de mission par organisme', font=font(30, True), fill=(32, 36, 44))
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        im.alpha_composite(t, (gap + c * (tw + gap), head + gap + r * (th + gap)))
    return im.convert('RGB')


def main():
    """Écrit la planche de chaque design et la planche d'ensemble dans docs/technique/planches/."""
    os.makedirs(OUT, exist_ok=True)
    data = mapping()
    sheets = []
    for d in DESIGNS:
        im = sheet(d, data[d])
        if im is None:
            print(f'{d} : aucun en-tête')
            continue
        p = os.path.join(OUT, f'rubriques_{d}.jpg')
        im.save(p, quality=86, optimize=True)
        sheets.append(im)
        print(f'{p} : {len(data[d]["headers"])} organisme(s)')
    if sheets:
        W = max(s.width for s in sheets)
        H = sum(s.height for s in sheets) + 20 * (len(sheets) - 1)
        all_ = Image.new('RGB', (W, H), (236, 231, 220))
        y = 0
        for s in sheets:
            all_.paste(s, (0, y))
            y += s.height + 20
        all_.thumbnail((2400, 10000), Image.LANCZOS)
        p = os.path.join(OUT, 'rubriques_mission.jpg')
        all_.save(p, quality=86, optimize=True)
        print(p)


if __name__ == '__main__':
    main()
