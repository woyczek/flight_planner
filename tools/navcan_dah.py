"""NAV CANADA — Designated Airspace Handbook (DAH, TP 1820) : lecture du PDF publié sans bibliothèque externe.

Le DAH est publié tous les 56 jours sous un nom daté (dah<AAAAMMJJ>.pdf), lié depuis la page des guides opérationnels
(PAGE) ; l'édition en vigueur est la plus récente dont la date est passée. Le texte est en polices CID (Identity-H) avec
table ToUnicode, dans des flux d'objets compressés : on reconstitue les objets, on décode chaque police, puis on lit les
lignes dans l'ordre du flux (une ligne de tableau = un opérateur Tj / TJ).

Produit, pour la zone « ca » du dossier SIA (data/sia/zones/ca/, fichiers « navcan_… » rattachés à la source NAV CANADA
par shared/aero_zones.js) :
  · navcan_dah.geojson : partie 5 — zones dangereuses (CYD, type D), réglementées (CYR, type R), consultatives (CYA :
    opérations militaires (M) en type MOA, les autres — voltige, école, parachutage, vol à voile, deltaplane — en type A) ;
    contours avec arcs et cercles, limites verticales (plus bas plancher, plus haut plafond des tranches publiées), horaires
    (TIMESOFUSE) et organisme de contrôle (CONT_AGENT) en propriétés.
La partie 6 (espaces interdits aux seuls drones) n'est pas reprise.

Appelé par tools/aero_fetch.py (fournisseur « navcan »). Essai : python tools/navcan_dah.py dah.pdf [dossier].
"""
import json, math, os, re, sys, zlib, datetime

SOURCE = 'NAV CANADA Designated Airspace Handbook (TP 1820)'
PAGE = 'https://www.navcanada.ca/en/aeronautical-information/operational-guides.aspx'
BASE = 'https://www.navcanada.ca'


def current_url(html, today=None):
    """Adresse du DAH en vigueur d'après la page des guides : plus récente édition déjà entrée en vigueur."""
    today = today or datetime.date.today().strftime('%Y%m%d')
    links = sorted(set(re.findall(r'href="([^"]*?dah(\d{8})\.pdf)"', html, re.I)), key=lambda l: l[1])
    if not links:
        return None
    past = [l for l in links if l[1] <= today]
    href = (past or links)[-1][0]
    return href if href.startswith('http') else BASE + ('' if href.startswith('/') else '/') + href


# ---------------------------------------------------------------- objets du PDF (flux d'objets compris)
def _stream(body):
    m = re.search(rb'stream\r?\n(.*)\r?\nendstream', body, re.S)
    if not m:
        return None
    head = body[:m.start()]
    if b'/FlateDecode' not in head:
        return m.group(1)
    try:
        return zlib.decompressobj().decompress(m.group(1))
    except zlib.error:
        return None


def objects(raw):
    """{ numéro: corps } de tous les objets, y compris ceux rangés dans les flux d'objets (/ObjStm)."""
    objs = {int(m.group(1)): m.group(2) for m in re.finditer(rb'(\d+) 0 obj(.*?)endobj', raw, re.S)}
    for body in list(objs.values()):
        if b'/ObjStm' not in body.split(b'stream')[0]:
            continue
        s = _stream(body)
        n, first = int(re.search(rb'/N (\d+)', body).group(1)), int(re.search(rb'/First (\d+)', body).group(1))
        hdr = list(map(int, s[:first].split()))
        for k in range(n):
            end = hdr[2 * k + 3] if k + 1 < n else len(s) - first
            objs[hdr[2 * k]] = s[first + hdr[2 * k + 1]:first + end]
    return objs


def _ref(body, key):
    m = re.search(rb'/' + key + rb'\s*(\d+) 0 R', body)
    return int(m.group(1)) if m else None


def _cmap(s):
    """Table ToUnicode : { code: texte } (bfchar et bfrange)."""
    s, out = s.decode('latin1'), {}
    for blk in re.findall(r'beginbfchar(.*?)endbfchar', s, re.S):
        for a, u in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            out[int(a, 16)] = bytes.fromhex(u).decode('utf-16-be', 'replace')
    for blk in re.findall(r'beginbfrange(.*?)endbfrange', s, re.S):
        for a, b, u in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            for k in range(int(a, 16), int(b, 16) + 1):
                out[k] = chr(int(u, 16) + k - int(a, 16))
    return out


def _literal(b):
    """Chaîne littérale PDF « (…) » → octets (échappements, octal, coupure de ligne)."""
    out, i = bytearray(), 0
    while i < len(b):
        c = b[i]
        if c == 0x5C and i + 1 < len(b):
            n = b[i + 1]
            if n in b'nrtbf':
                out.append({0x6E: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12}[n])
                i += 2
            elif n in b'01234567':
                m = re.match(rb'[0-7]{1,3}', b[i + 1:i + 4])
                out.append(int(m.group(0), 8) & 0xFF)
                i += 1 + len(m.group(0))
            elif n in b'\r\n':
                i += 2
            else:
                out.append(n)
                i += 2
        else:
            out.append(c)
            i += 1
    return bytes(out)


TOK = re.compile(rb'\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|/[^\s/\[\]()<>]+|[-+]?\d*\.?\d+|[A-Za-z\'"*]+', re.S)


def pages_text(raw):
    """Lignes de chaque page dans l'ordre du flux : [[ligne…]…]."""
    objs, fonts = objects(raw), {}

    def font(n):
        if n not in fonts:
            b, tu = objs.get(n, b''), _ref(objs.get(n, b''), rb'ToUnicode')
            fonts[n] = (_cmap(_stream(objs[tu]) or b'') if tu else None, b'Identity-H' in b)
        return fonts[n]

    def decode(bs, f):
        cm, two = f or (None, False)
        codes = [int.from_bytes(bs[k:k + 2], 'big') for k in range(0, len(bs) - 1, 2)] if two else list(bs)
        return bytes(c for c in codes if c < 256).decode('latin1') if cm is None else ''.join(cm.get(c, '') for c in codes)

    def kids(n):
        b = objs[n]
        if re.search(rb'/Type\s*/Pages', b):
            for k in re.findall(rb'(\d+) 0 R', re.search(rb'/Kids\s*\[(.*?)\]', b, re.S).group(1)):
                yield from kids(int(k))
        else:
            yield n

    cat = next(b for b in objs.values() if re.search(rb'/Type\s*/Catalog', b))
    out = []
    for pn in kids(_ref(cat, rb'Pages')):
        pb, names = objs[pn], {}
        fm = re.search(rb'/Font\s*<<(.*?)>>', pb, re.S)
        if fm:
            names = {k: int(v) for k, v in re.findall(rb'/([^\s/]+)\s*(\d+) 0 R', fm.group(1))}
        cs = re.search(rb'/Contents\s*(\[[^\]]*\]|\d+ 0 R)', pb)
        data = b''.join(_stream(objs[int(x)]) or b'' for x in re.findall(rb'(\d+) 0 R', cs.group(1))) if cs else b''
        lines, stack, f = [], [], None
        for t in TOK.findall(data):
            if t[:1] in b'(<[]/' or re.match(rb'[-+\d.]', t):
                stack.append(t)
                continue
            if t == b'Tf' and len(stack) >= 2 and stack[-2][1:] in names:
                f = font(names[stack[-2][1:]])
            elif t in (b'Tj', b'TJ', b"'", b'"'):
                s = ''
                for a in stack:
                    if a[:1] == b'(':
                        s += decode(_literal(a[1:-1]), f)
                    elif a[:1] == b'<':
                        s += decode(bytes.fromhex(re.sub(rb'\s', b'', a[1:-1]).decode()), f)
                    elif re.match(rb'[-+\d.]', a) and float(a) < -200:  # crénage large dans un TJ : espace
                        s += ' '
                lines.append(s)
            stack = []
        out.append(lines)
    return out


def body_lines(pages):
    """Lignes du document sans les en-têtes et pieds de page (jusqu'à la ligne de droits « Source of Canadian Airspace Data »)."""
    out = []
    for lines in pages:
        cut = next((i for i, l in enumerate(lines[:12]) if l.startswith('Source of Canadian Airspace Data')), -1)
        out += [l.strip() for l in lines[cut + 1:] if l.strip()]
    return out


# ---------------------------------------------------------------- géométrie
COORD = r'([NS])\s*(\d{1,2})°\s*(\d{1,2})[\'’′]\s*([\d.]+)\s*(?:["”″]|\'\'|’’)?\s*([EW])\s*(\d{1,3})°\s*(\d{1,2})[\'’′]\s*([\d.]+)'
DIST = r'(\d+(?:\.\d+)?)\s*(?:nautical\s+)?(?:miles?|NM)\b'
NM = 1 / 60  # degré de latitude par mille nautique


def coord(ns, d, m, s, ew, D, M, S):
    lat = int(d) + int(m) / 60 + float(s) / 3600
    lon = int(D) + int(M) / 60 + float(S.rstrip('.')) / 3600
    return (-lat if ns == 'S' else lat, -lon if ew == 'W' else lon)


def _bearing(c, p):
    return math.atan2((p[1] - c[1]) * math.cos(math.radians(c[0])), p[0] - c[0])


def circle(c, r_nm, n=72):
    k = math.cos(math.radians(c[0]))
    return [(c[0] + r_nm * NM * math.cos(2 * math.pi * i / n), c[1] + r_nm * NM * math.sin(2 * math.pi * i / n) / k) for i in range(n)] + \
        [(c[0] + r_nm * NM, c[1])]


def arc(c, a, b, clockwise, step=math.radians(5)):
    """Points d'un arc de centre c, de a à b (rayon pris sur a) ; a et b exclus."""
    k = math.cos(math.radians(c[0]))
    r = math.hypot(a[0] - c[0], (a[1] - c[1]) * k)
    t0, d = _bearing(c, a), _bearing(c, b) - _bearing(c, a)
    if clockwise:
        while d <= 0:
            d += 2 * math.pi
    else:
        while d >= 0:
            d -= 2 * math.pi
    n = max(2, int(abs(d) / step))
    return [(c[0] + r * math.cos(t0 + d * i / n), c[1] + r * math.sin(t0 + d * i / n) / k) for i in range(1, n)]


def hull(pts):
    """Enveloppe convexe (Andrew) de points (lat, lon), fermée."""
    p = sorted(set(pts), key=lambda q: (q[1], q[0]))
    cross = lambda o, a, b: (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1])
    lo, up = [], []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0:
            lo.pop()
        lo.append(q)
    for q in reversed(p):
        while len(up) >= 2 and cross(up[-2], up[-1], q) <= 0:
            up.pop()
        up.append(q)
    h = lo[:-1] + up[:-1]
    return h + h[:1]


def boundary(text):
    """Contour décrit (ligne brisée avec arcs, cercle, ou lignes tangentes à deux cercles) → ([(lat, lon)…], approché)."""
    pts = [coord(*m.groups()) for m in re.finditer(COORD, text)]
    dists = [float(d) for d in re.findall(DIST, text, re.I)]
    if not pts:
        return [], False
    if re.search(r'tangent to (?:the )?circles', text, re.I) and len(pts) >= 2 and dists:
        r1, r2 = dists[0], dists[1] if len(dists) > 1 else dists[0]
        return hull(circle(pts[0], r1) + circle(pts[1], r2)), False
    if re.search(r'bounded by a circle', text, re.I) and dists:
        return circle(pts[0], dists[0]), False
    # ligne brisée : coordonnées dans l'ordre ; « thence (counter-)clockwise along the arc of a circle of R radius centred
    # on C » : C est le centre, la coordonnée suivante l'extrémité de l'arc
    tok = re.compile(r'thence\s+((?:counter|anti)[\s-]*)?clockwise\s+(?:along|around)\s+(?:the|a)\s+arc|' + COORD, re.I)
    out, sense, center = [], None, None
    for m in tok.finditer(text):
        if m.group(0).lower().startswith('thence'):
            sense, center = not m.group(1), None
            continue
        p = coord(*m.groups()[1:])
        if sense is not None and center is None:  # coordonnée qui suit l'annonce de l'arc : son centre
            center = p
            continue
        if center is not None and out:
            out.extend(arc(center, out[-1], p, sense))
        sense, center = None, None
        out.append(p)
    # le long d'un parallèle ou d'un méridien : segment exact en latitude / longitude ; le long d'une frontière, d'une côte… :
    # contour approché par un segment droit
    approx = bool(re.search(r'thence\s+(?!(?:counter|anti)?[\s-]*clockwise)[\w\s]*?along\s+(?!(?:the\s+)?(?:latitude|longitude|parallel|meridian)\b)', text, re.I))
    return out, approx


# ---------------------------------------------------------------- limites verticales
def _alt(v):
    """« Surface », « 5000´ », « 13,500´ ASL », « FL230 », « unlimited » → (texte de la base, pieds pour comparer)."""
    v = v.strip().replace(',', '')
    if re.match(r'(surface|sfc|gnd|ground)', v, re.I):
        return 'SFC', 0
    if re.match(r'unl', v, re.I):
        return 'UNL', 99999
    m = re.match(r'FL\s*(\d{2,3})', v, re.I)
    if m:
        return f'FL {int(m.group(1))}', int(m.group(1)) * 100
    m = re.match(r'(\d+)', v)
    if not m:
        return '', None
    ft = int(m.group(1))
    return f'{ft} ft {"ASFC" if re.search(r"AGL", v, re.I) else "AMSL"}', ft + (0.5 if re.search(r'AGL', v, re.I) else 0)


VAL = r'(?:Surface|SFC|GND|FL\s*\d{2,3}|\d[\d,]*\s*[´\']?\s*(?:ASL|AGL|MSL)?)'
# « Surface to 5000´ », « Above 1500´ to 3000´ », « From FL230 to FL600 », « 7000´ to below 18,000´ », « 18,000´ and above »,
# « 12,500´ to as specified by NOTAM » (plafond inconnu)
LIM = re.compile(r'(?:From\s+|Above\s+)?(' + VAL + r')\s+(?:to\s+(?:below\s+)?(' + VAL + r'|unlimited|UNL|as specified by NOTAM)|and\s+(above))', re.I)


def limits(text):
    """Plus bas plancher et plus haut plafond des tranches d'un texte d'altitudes → (plancher, plafond) au format de la base."""
    lo, up = None, None
    for m in LIM.finditer(text):
        a = _alt(m.group(1))
        b = ('UNL', 99999) if m.group(3) else ('', None) if re.match(r'as specified', m.group(2), re.I) else _alt(m.group(2))
        if a[1] is not None and (lo is None or a[1] < lo[1]):
            lo = a
        if b[1] is not None and (up is None or b[1] > up[1]):
            up = b
    return (lo or ('', 0))[0], (up or ('', 0))[0]


# ---------------------------------------------------------------- fiches de la partie 5
HEAD = re.compile(r'^(CY([DRA])\d{3,4}((?:\([A-Z]\))*))\s+(.+)$')
AIR = re.compile(r'(?:The|An?)\s+[A-Za-z ]{0,40}?airspace within')  # « The airspace within », « A military operations airspace within »
FIELDS = r'Designated Altitude|Time of Designation|User Agency|Controlling Agency|User/Controlling Agency|Operating Procedures'


def _field(text, key):
    m = re.search(r'(?<!/)\b' + key + r'\s*[–-]\s*(.*?)(?=\s(?:' + FIELDS + r')\b|$)', text)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''


def areas(lines):
    """Fiches des parties 5.1 à 5.3 : [{ type, name, designator, rings, upper, lower, time, agency, remark }] ; une fiche à
    plusieurs contours (« AREA 1: … AREA 2: … », chacun avec ses altitudes) donne un espace par contour."""
    try:
        start = next(i for i, l in enumerate(lines) if l.startswith('5.1 DANGER AREAS'))
        end = next(i for i, l in enumerate(lines) if i > start and l.startswith('6. DESIGNATION'))
    except StopIteration:
        return []
    sec = [l for l in lines[start:end] if not re.fullmatch(r'5\.\d [A-Z ]+', l)]
    # titre de fiche : suivi (éventuellement après un sous-titre « AIR WEAPONS RANGE: », « AREA 1: ») de « The airspace … »
    heads = [i for i, l in enumerate(sec) if HEAD.match(l) and any(AIR.match(x) for x in sec[i + 1:i + 3])]
    out = []
    for n, i in enumerate(heads):
        m = HEAD.match(sec[i])
        text = ' '.join(sec[i + 1:heads[n + 1] if n + 1 < len(heads) else len(sec)])
        kind, flags = m.group(2), m.group(3)
        typ = {'D': 'D', 'R': 'R'}.get(kind) or ('MOA' if '(M)' in flags else 'A')
        time = _field(text, 'Time of Designation')
        agency = _field(text, 'Controlling Agency') or _field(text, 'User/Controlling Agency')
        all_lo, all_up = limits(' '.join(_field(x, 'Designated Altitude') for x in re.split(r'(?=Designated Altitude)', text)))
        starts = [x.start() for x in AIR.finditer(text)]
        parts = []
        for k, s0 in enumerate(starts):
            label = re.search(r'([A-Z][A-Za-z0-9 ]{0,30}):\s*$', text[:s0])  # « AREA 1: » juste avant le contour
            part = text[s0:starts[k + 1] if k + 1 < len(starts) else len(text)]
            if k + 1 < len(starts):  # le sous-titre du contour suivant n'appartient pas à celui-ci
                nxt = re.search(r'([A-Z][A-Za-z0-9 ]{0,30}):\s*$', part)
                part = part[:nxt.start()] if nxt else part
            cut = re.search(r'\bDesignated Altitude\b', part)
            geo = part[:cut.start()] if cut else part
            excl = re.search(r'\bExcluding\b', geo)
            pts, approx = boundary(geo[:excl.start()] if excl else geo)
            if len(pts) < 3:
                continue
            if pts[0] != pts[-1]:
                pts.append(pts[0])
            lo, up = limits(' '.join(_field(x, 'Designated Altitude') for x in re.split(r'(?=Designated Altitude)', part)))
            remark = []
            if excl:
                remark.append(re.sub(r'\s+', ' ', geo[excl.start():]).strip())
            if approx:
                remark.append('contour approché (limites décrites en toutes lettres dans le DAH : segments droits)')
            if re.search(r'as specified by NOTAM', part, re.I):
                remark.append('plafond fixé par NOTAM')
            parts.append((label.group(1).strip() if label and k else label.group(1).strip() if label else '', pts, lo or all_lo,
                          up or all_up, remark))
        for k, (label, pts, lo, up, remark) in enumerate(parts):
            suffix = '' if len(parts) == 1 else f' ({label or k + 1})'
            out.append({'type': typ, 'designator': m.group(1) + suffix, 'name': f'{m.group(1)} {m.group(4).strip()}{suffix}',
                        'rings': [pts], 'upper': up, 'lower': lo, 'time': time, 'agency': agency, 'remark': ' — '.join(remark)})
    return out


def geojson(zones):
    return {'type': 'FeatureCollection', 'features': [{
        'type': 'Feature',
        'properties': {'type': z['type'], 'name': z['name'], 'designator': z['designator'], 'upper': z['upper'], 'lower': z['lower'],
                       'TIMESOFUSE': z['time'], 'CONT_AGENT': z['agency'], 'remarks': z['remark'], 'source': SOURCE},
        'geometry': {'type': 'Polygon', 'coordinates': [[[round(lon, 6), round(lat, 6)] for lat, lon in r] for r in z['rings']]}
    } for z in zones]}


MONTHS = {m: i + 1 for i, m in enumerate(['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER',
                                          'OCTOBER', 'NOVEMBER', 'DECEMBER'])}


def convert(raw):
    """PDF du DAH → (geojson, édition AAAA-MM-JJ, nombres par type)."""
    pages = pages_text(raw)
    first = ' '.join(l for p in pages[:12] for l in p)
    m = re.search(r'Effective \d{4}Z (\d{1,2}) ([A-Z]+) (\d{4})', first)
    edition = f'{m.group(3)}-{MONTHS.get(m.group(2), 0):02d}-{int(m.group(1)):02d}' if m else ''
    zones = areas(body_lines(pages))
    count = {}
    for z in zones:
        count[z['type']] = count.get(z['type'], 0) + 1
    return geojson(zones), edition, {'zones': len(zones), **count}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    g, edition, n = convert(open(sys.argv[1], 'rb').read())
    print(f'édition {edition or "?"} : {n}')
    if len(sys.argv) > 2:
        os.makedirs(sys.argv[2], exist_ok=True)
        json.dump(g, open(os.path.join(sys.argv[2], 'navcan_dah.geojson'), 'w', encoding='utf-8'), ensure_ascii=False)
    return 0


if __name__ == '__main__':
    sys.exit(main())
