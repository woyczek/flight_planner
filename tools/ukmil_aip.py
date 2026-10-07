"""UK Military AIP (AIDU, Open Government Licence v3.0) — ENR 5.2 « Military Exercise and Training Areas » : lecture du
PDF publié (https://www.aidu.mod.uk/aip/pdf/enr/ENR-5-2.pdf, adresse fixe, texte) sans bibliothèque externe.

Produit, pour la zone « gb » du dossier SIA (data/sia/zones/gb/, fichiers « ukmil_… » rattachés à la source UK Mil AIP
par shared/aero_zones.js) :
  · ukmil_enr52.geojson : zones de l'ENR 5.2.7 — zones de vol à basse altitude (LFA, type MOA), Valley Aerial Tactics
    Area (VATA, type TRA), MATZ — contours avec arcs, limites verticales, nature et source en propriétés ;
  · ukmil_aara-tracks.xml : zones de ravitaillement en vol (AARA, ENR 5.2.6) en axes IP → CP, au format des axes de la
    MILAIP française (shared/aar_tracks.js, parseTrackXml) ; largeur et côté non publiés (inconnus).

Appelé par tools/aero_fetch.py (fournisseur « ukmil »). Essai : python tools/ukmil_aip.py ENR-5-2.pdf [dossier].
"""
import json, math, os, re, sys, zlib

SOURCE = 'UK Mil AIP ENR 5.2 (AIDU, OGL v3.0)'
URL = 'https://www.aidu.mod.uk/aip/pdf/enr/ENR-5-2.pdf'
COORD = r'(\d{6}(?:\.\d+)?)\s*([NS])\s*(\d{7}(?:\.\d+)?)\s*([EW])'


# ---------------------------------------------------------------- texte du PDF
def _unescape(b):
    """Chaîne littérale PDF « (…) » → texte (échappements, octal, coupure de ligne)."""
    out, i = [], 0
    while i < len(b):
        c = b[i]
        if c == 0x5C and i + 1 < len(b):  # barre oblique inverse
            n = b[i + 1]
            if n in b'nrtbf':
                out.append({0x6E: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12}[n])
                i += 2
            elif n in b'01234567':
                m = re.match(rb'[0-7]{1,3}', b[i + 1:i + 4])
                out.append(int(m.group(0), 8) & 0xFF)
                i += 1 + len(m.group(0))
            elif n in b'\r\n':  # coupure de ligne : ignorée
                i += 2 + (1 if n == 0x0D and b[i + 2:i + 3] == b'\n' else 0)
            else:
                out.append(n)
                i += 2
        else:
            out.append(c)
            i += 1
    # 0x1F : ligature « fi » de la police du document
    return bytes(out).decode('latin1').replace('\x1f', 'fi')


LIT = re.compile(rb'\(((?:\\.|\\\r?\n|[^\\)])*)\)', re.S)


def pdf_text(raw):
    """Texte des opérateurs Tj / TJ de tous les flux (FlateDecode) d'un PDF à polices simples."""
    parts = []
    for m in re.finditer(rb'stream\r?\n(.*?)\r?\nendstream', raw, re.S):
        try:
            data = zlib.decompress(m.group(1))
        except zlib.error:
            continue
        for tj in re.finditer(rb'\[(.*?)\]\s*TJ|(\((?:\\.|\\\r?\n|[^\\)])*\))\s*Tj', data, re.S):
            chunk = tj.group(1) or tj.group(2)
            parts.append(''.join(_unescape(x) for x in LIT.findall(chunk)))
    return re.sub(r'\s+', ' ', ' '.join(parts))


# ---------------------------------------------------------------- géométrie
def _dms(v, deg_len):
    whole, _, frac = v.partition('.')
    d, mi, s = int(whole[:deg_len]), int(whole[deg_len:deg_len + 2]), float(whole[deg_len + 2:] + ('.' + frac if frac else ''))
    return d + mi / 60 + s / 3600


def coord(lat, ns, lon, ew):
    return (_dms(lat, 2) * (-1 if ns == 'S' else 1), _dms(lon, 3) * (-1 if ew == 'W' else 1))


def _bearing(c, p):
    """Route (rad) du centre c vers p, dans un plan local (est, nord)."""
    return math.atan2((p[1] - c[1]) * math.cos(math.radians(c[0])), p[0] - c[0])


def arc(c, a, b, clockwise, step=math.radians(5)):
    """Points d'un arc de centre c, de a à b (rayon pris sur a), sens horaire ou non ; a et b exclus."""
    r = math.hypot(a[0] - c[0], (a[1] - c[1]) * math.cos(math.radians(c[0])))
    t0, t1 = _bearing(c, a), _bearing(c, b)
    d = t1 - t0
    if clockwise:  # vu du nord, sens horaire : angle (est = 0 rad au nord) croissant en route
        while d <= 0:
            d += 2 * math.pi
    else:
        while d >= 0:
            d -= 2 * math.pi
    n = max(2, int(abs(d) / step))
    return [(c[0] + r * math.cos(t0 + d * k / n), c[1] + r * math.sin(t0 + d * k / n) / math.cos(math.radians(c[0]))) for k in range(1, n)]


def boundary(text):
    """Contour d'une description « P1 - P2 - clockwise arc centred on C radius 5NM - P3 … » → [(lat, lon)…]."""
    pts, pending = [], None
    tok = re.compile(r'((?:anti-?|counter-?)?clockwise) arc centred on ' + COORD + r'|' + COORD, re.I)
    for m in tok.finditer(text):
        if m.group(1):
            pending = (not m.group(1).lower().startswith(('anti', 'counter')), coord(*m.group(2, 3, 4, 5)))
            continue
        p = coord(*m.group(6, 7, 8, 9))
        if pending and pts:
            pts.extend(arc(pending[1], pts[-1], p, pending[0]))
        pending = None
        pts.append(p)
    return pts


LIMIT = re.compile(r'(FL\s?\d{2,3}|\d{3,5}\s?(?:ft|FT)\s?(?:AMSL|AGL|MSD|ALT|MSL)?|SFC|GND|Surface|Unlimited)\s?[-–]\s?(FL\s?\d{2,3}|\d{3,5}\s?(?:ft|FT)\s?(?:AMSL|AGL|MSD|ALT|MSL)?|SFC|GND|Surface|Unlimited)', re.I)
KINDS = [  # (motif du nom, type de la base, préfixe du nom affiché)
    (r'LOW FLYING AREA', 'MOA', 'LFA'),
    (r'VALLEY AERIAL TACTICS AREA \(VATA\)', 'TRA', 'VATA'),
]  # MATZ et CTZ citées dans les contours (Lakenheath, Édimbourg…) : espaces fournis par NATS, pas des entrées ici


def areas(text):
    """Zones de l'ENR 5.2.7 : [{ type, name, rings, upper, lower, remark }]."""
    sec = text[text.find('5.2.7 MILITARY EXERCISE'):]
    head = re.compile(r'(' + '|'.join(k for k, _, _ in KINDS) + r') - ([A-Z0-9][A-Z0-9 ()/-]{0,20}?)\s+(?=' + COORD + ')')
    starts = list(head.finditer(sec))
    out = []
    for i, m in enumerate(starts):
        body = sec[m.end():starts[i + 1].start() if i + 1 < len(starts) else len(sec)]
        kind = next((t, p) for k, t, p in KINDS if re.fullmatch(k, m.group(1).strip()))
        # description du contour : jusqu'au renvoi aux cartes, aux limites verticales ou à l'activation ; les passages en
        # toutes lettres (« follow A351 », « Lyneham CTR Boundary ») deviennent des segments droits (contour approché)
        end = re.search(r'Reference ENR|' + LIMIT.pattern + r'|By NOTAM|Activ', body, re.I)
        geo_text = body[:end.start()] if end else body
        pts = boundary(geo_text)
        if len(pts) < 3:
            continue
        if pts[0] != pts[-1]:
            pts.append(pts[0])
        approx = bool(re.search(r'[A-Za-z]{3,}', re.sub(r'(?:anti-?|counter-?)?clockwise arc centred on|radius|\bNM\b|\bto\b|' + COORD, ' ', geo_text, flags=re.I)))
        lim = LIMIT.search(body)
        if not lim and kind[0] == 'MOA':  # LFA : réseau de vol à basse altitude, sous 2000 ft AGL (ENR 5.2.4)
            lim = re.match(r'(SFC)-(2000FT AGL)', 'SFC-2000FT AGL')
        ident = m.group(2).strip()
        name = f'{kind[1]} {ident}'.strip() if kind[1] and not ident.upper().startswith(kind[1]) else (ident if kind[1] else f'{m.group(1).strip()} {ident}'.strip())
        lo, up = (lim.group(1), lim.group(2)) if lim else ('', '')
        # « FL100-FL285 » : plancher puis plafond ; certains tableaux donnent plafond - plancher
        if lim and _alt(lo) > _alt(up):
            lo, up = up, lo
        remark = re.sub(r'\s+', ' ', body[len(geo_text):])[:300].strip()
        typ = kind[0]
        if ident.upper() == 'TVAA':  # Thames Valley Avoidance Area : zone à éviter en vol à basse altitude
            typ, name = 'R', 'TVAA (Thames Valley Avoidance Area)'
            remark = ('zone d’évitement du réseau de vol à basse altitude (ENR 5.2.4) — ' + remark).strip(' —')
        if approx:
            remark = ('contour approché (limites décrites en toutes lettres dans l’ENR 5.2.7 : segments droits) — ' + remark).strip(' —')
        lim_text = lambda v: re.sub(r'^FL\s+', 'FL', re.sub(r'\s+', ' ', re.sub(r'(\d)(FT)', r'\1 \2', v.upper()))).strip()
        out.append({'type': typ, 'name': name, 'rings': [pts], 'upper': lim_text(up), 'lower': lim_text(lo), 'remark': remark})
    return out


def _alt(v):
    v = v.upper().replace(' ', '')
    if v.startswith('FL'):
        return int(v[2:]) * 100
    m = re.match(r'(\d+)', v)
    return int(m.group(1)) if m else (99999 if 'UNL' in v else 0)


def aara(text):
    """Zones de ravitaillement (ENR 5.2.6) : [{ name, ip, cp, tacan, remark }]."""
    sec = text[text.find('5.2.6 AIR TO AIR REFUELLING AREA'):text.find('5.2.7 MILITARY EXERCISE')]
    out = []
    rows = list(re.finditer(r'AARA (\d+[A-Z]?(?:\s?\([EWNS]\))?)\s+((?:\d+\s+){0,3})' + COORD + r'\s+' + COORD, sec))
    for i, m in enumerate(rows):
        rest = sec[m.end():rows[i + 1].start() if i + 1 < len(rows) else m.end() + 400]
        out.append({'name': 'AARA ' + m.group(1).replace(' ', ''), 'tacan': m.group(2).split(),
                    'ip': coord(*m.group(3, 4, 5, 6)), 'cp': coord(*m.group(7, 8, 9, 10)),
                    'ipText': ' '.join(m.group(3, 4, 5, 6)), 'cpText': ' '.join(m.group(7, 8, 9, 10)),
                    'remark': re.sub(r'\s+', ' ', rest)[:200].strip()})
    return out


# ---------------------------------------------------------------- sorties
def geojson(zones):
    return {'type': 'FeatureCollection', 'features': [{
        'type': 'Feature',
        'properties': {'type': z['type'], 'name': z['name'], 'designator': z['name'], 'upper': z['upper'], 'lower': z['lower'],
                       'remarks': z['remark'], 'source': SOURCE},
        'geometry': {'type': 'Polygon', 'coordinates': [[[round(lon, 6), round(lat, 6)] for lat, lon in r] for r in z['rings']]}
    } for z in zones]}


def _nm(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    return 2 * 3440.065 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))


def _hdg(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    return round((math.degrees(math.atan2(y, x)) + 360) % 360)


def tracks_xml(tracks, edition=''):
    """Axes AARA au format des axes de la MILAIP française (miam:TrackDataset 2.0, lu par AarTracks.parseTrackXml)."""
    x = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;').replace('"', '&quot;')
    pt = lambda name, p, txt, role: (f'      <aixm:DesignatedPoint gml:id="{x(name)}" miam:role="{role}">\n'
                                     f'        <aixm:designator>{x(name)}</aixm:designator>\n'
                                     f'        <aixm:location><aixm:ElevatedPoint gml:id="{x(name)}-location"><gml:pos srsName="EPSG:4326">{p[0]:.6f} {p[1]:.6f}</gml:pos></aixm:ElevatedPoint></aixm:location>\n'
                                     f'        <miam:sourceCoordinate>{x(txt)}</miam:sourceCoordinate>\n      </aixm:DesignatedPoint>')
    body = '\n'.join(
        f'    <miam:Track name="{x(t["name"])}" kind="track" page="0" lengthNm="{_nm(t["ip"], t["cp"]):.1f}" expectedLengthNm="" widthNm="" heading="{_hdg(t["ip"], t["cp"])}" side="unknown"'
        f' remark="{x(("TACAN " + "/".join(t["tacan"]) + " — " if t["tacan"] else "") + t["remark"])}">\n'
        + pt(t['name'].replace(' ', '') + '-IP', t['ip'], t['ipText'], 'ARIP') + '\n'
        + pt(t['name'].replace(' ', '') + '-CP', t['cp'], t['cpText'], 'ARCP') + '\n    </miam:Track>' for t in tracks)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<miam:TrackDataset xmlns:miam="https://example.org/miam/enr-5-7" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:aixm="http://www.aixm.aero/schema/4.5" version="2.0">
  <miam:metadata>
    <miam:sourceTitle>{x(SOURCE)} - Air to Air Refuelling Areas</miam:sourceTitle>
    <miam:sourceEdition>{x(edition)}</miam:sourceEdition>
    <miam:rules>Axe de l'Initial Point (IP) au Control Point (CP) publiés ; largeur et côté du circuit non publiés.</miam:rules>
    <miam:coordinateReferenceSystem>WGS 84 (EPSG:4326), gml:pos order latitude longitude</miam:coordinateReferenceSystem>
    <miam:tracks>{len(tracks)}</miam:tracks>
  </miam:metadata>
  <miam:tracksList>
{body}
  </miam:tracksList>
  <miam:issues>
  </miam:issues>
</miam:TrackDataset>
'''


def convert(raw):
    """PDF de l'ENR 5.2 → (geojson, xml des axes, édition, nombres)."""
    text = pdf_text(raw)
    edition = (re.findall(r'AIRAC (\d{2}/\d{2})', text) or [''])[-1]
    zones, tracks = areas(text), aara(text)
    return geojson(zones), tracks_xml(tracks, f'AIRAC {edition}' if edition else ''), edition, {'zones': len(zones), 'aara': len(tracks)}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    g, xml, edition, n = convert(open(sys.argv[1], 'rb').read())
    print(f'édition {edition or "?"} : {n["zones"]} zones, {n["aara"]} AARA')
    if len(sys.argv) > 2:
        os.makedirs(sys.argv[2], exist_ok=True)
        json.dump(g, open(os.path.join(sys.argv[2], 'ukmil_enr52.geojson'), 'w', encoding='utf-8'), ensure_ascii=False)
        open(os.path.join(sys.argv[2], 'ukmil_aara-tracks.xml'), 'w', encoding='utf-8', newline='\n').write(xml)
    return 0


if __name__ == '__main__':
    sys.exit(main())
