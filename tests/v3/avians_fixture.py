"""Les pages de l'eAIP d'Islande des essais : les FORMES lues sur le site le 16 nov. 2026 (adresses, noms avec espaces, lignes sans classe, tableaux imbriqués, aucun <title>), avec des points et des routes INVENTÉS (aucune page d'Avians n'est copiée)."""

EDITIONS = ('<html><head><title>eAIP ICELAND</title></head><body><h1>eAIP Issues</h1>'
            '<a href="https://www.icetra.is/">Icelandic Transport Authority</a>'
            '<a href="https://eaip.isavia.is/A_10-2026_2026_10_29/">29 OCT 2026</a>'
            '<a href="https://eaip.avians.is/A_11-2026_2026_11_26/">26 NOV 2026</a>'
            '<a>21 JAN 2026</a></body></html>')

POINTS = {'ABETU': ('661910N', '0230938W', '', 'IAF BIIS'), 'ABIBA': ('720000N', '0571052W', 'UT587', 'See AIP Greenland'), 'LILGO': ('672611N', '0512553W', 'UT587', ''),
          'GINAG': ('674822N', '0514955W', 'UT587', ''), 'NYGAR': ('681356N', '0521841W', 'UT587', ''), 'KEFLA': ('634000N', '0223600W', 'Y23', ''), 'GRIMS': ('660000N', '0180000W', 'Y23', ''),
          'BELUG': ('640000N', '0200000W', '', ''), 'CLOVE': ('650100N', '0210200W', '', ''), 'DUNAR': ('651500N', '0201500W', '', ''), 'EDRAM': ('652500N', '0192500W', '', ''),
          'FALKO': ('653500N', '0183500W', '', ''), 'GALMA': ('654500N', '0173500W', '', ''), 'HEKLA': ('655500N', '0163500W', '', ''), 'ISKUR': ('656500N', '0153500W', '', ''),
          'JOKUL': ('657500N', '0143500W', '', ''), 'KATLA': ('658500N', '0133500W', '', ''), 'LAKIS': ('659500N', '0123500W', '', ''), 'MYVAT': ('660500N', '0113500W', '', ''),
          'NJORD': ('661500N', '0103500W', '', ''), 'ODINN': ('662500N', '0093500W', '', ''), 'PYRAM': ('663500N', '0083500W', '', ''), 'QUILT': ('664500N', '0073500W', '', ''), 'RAFNA': ('665500N', '0063500W', '', ''),
          'SKOGA': ('666500N', '0053500W', '', '')}


def _cell(text):
    return f'<td space="preserve" rowspan="1" colspan="1"><a id="x" space="preserve" shape="rect"></a><span space="preserve"><span style="font-size:11px;">{text}</span></span></td>'


def points_page(points=POINTS):
    rows = ''.join(f'<tr id="{n}ENR44" valign="top" space="preserve">{_cell(n)}{_cell(a + " " + b)}{_cell(r)}{_cell(m)}</tr>' for n, (a, b, r, m) in points.items())
    return ('<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title></title></head><body>'
            '<table class="CenteredTable w90pc ENR_4_4"><tr><td><table class="IndSubTable ENR_4_4_table ENR_4_4_IndSubTable ENR_4.4_ENR4_4_TABLE" border="1">'
            '<tr id="ENR4.4_H1"><th class="Table-row-type-1">Name-code designator</th><th>Coordinates</th><th>ATS route</th><th>Remarks</th></tr>' + rows + '</table></td></tr></table></body></html>')


def route_page(designator, pts, limits=('FL 285', 'FL 195'), name_of=lambda p: p):
    """Une page de route : l'en-tête (th), la ligne du désignateur, puis par point une ligne de point (tableau imbriqué : signe, nom, coordonnées) et la ligne du tronçon qui part de lui (tableaux imbriqués : caps, distance ; limites)."""
    head = ('<tr id="ENR3.3_H1"><th class="Table-row-type-1" rowspan="2">Route designator Navigation specification Name of Significant points Coordinates</th><th class="Table-row-type-1">Track</th></tr>'
            '<tr id="ENR3.3_H3"><th>1</th><th>2</th></tr>')
    rows = f'<tr id="ENR33_12"><td colspan="2">{designator}<br/>(RNAV)</td><td>TOT DIST 100 NM</td><td colspan="5"></td></tr>'
    for i, (pid, (lat, lon)) in enumerate(pts):
        rows += (f'<tr id="ENR33_1{pid}"><td><div class="dynamic"><table class="IndSubTable ENR_3_2_title ENR_3_2_{designator}_IndSubTable" border="0">'
                 f'<tr><td>∆</td><td>{name_of(pid)}</td></tr><tr><td>{lat} {lon}</td></tr></table></div></td><td colspan="7"></td></tr>')
        if i < len(pts) - 1:
            rows += (f'<tr id="ENR33_2{pid}"><td></td><td></td><td><table class="IndSubTable"><tr><td>338° T</td><td>006°</td></tr><tr><td>158° T</td><td>186°</td></tr><tr><td>{30 + i}.5 NM</td></tr></table></td>'
                     f'<td><table class="IndSubTable"><tr><td>{limits[0]}</td></tr><tr><td>{limits[1]}</td></tr></table></td><td>↓</td><td>↑</td><td>(RNP 2 or GNSS)</td><td>Reykjavík OAC 124.400 H24</td></tr>')
    return ('<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title></title></head><body>'
            f'<table class="CenteredTable w90pc ENR_3_2_Generic ENR_3_2_{designator}"><tr><td><table class="IndSubTable ENR_3_2_table ENR_3_2_{designator}_IndSubTable ENR_3.2_ENR3_1_TABLE" border="1">'
            + head + rows + '</table></td></tr></table></body></html>')


def pts_of(*names):
    return [(n, (POINTS[n][0], POINTS[n][1])) for n in names]


UT587 = route_page('UT587', pts_of('ABIBA', 'LILGO', 'GINAG', 'NYGAR'), name_of=lambda p: f"{p} NDB 'QQ'" if p == 'GINAG' else p)
Y23 = route_page('Y23', pts_of('KEFLA', 'GRIMS'), limits=('FL 195', '5000 ft'))
Y25 = route_page('Y25', pts_of('KEFLA', 'BELUG', 'CLOVE'))
ROUTES = {'UT587': UT587, 'Y23': Y23, 'Y25': Y25}


def menu(designators=('UT587', 'Y23', 'Y25'), extra=''):
    """Le sommaire : des liens vers les deux langues (« is-IS » et « en-GB »), le nom AVEC espaces (comme getAttribute le rend) ou avec « %20 », l'ancre, et du bruit."""
    links = ''.join(f'<a href="BI-ENR 3.2 {d}-is-IS.html#ENR-3.2-{d}">{d}</a><a href="BI-ENR 3.2 {d}-en-GB.html#ENR-3.2-{d}">{d}</a><a href="BI-ENR%203.2%20{d}-en-GB.html">{d}</a>' for d in designators)
    return ('<html><head><title>Menu AIP</title></head><body><a href="../eAIP/menu.html">AIP</a><a href="BI-ENR 3.1-en-GB.html#ENR-3.1">ENR 3.1 [NIL]</a><a href="BI-ENR 4.4-en-GB.html#ENR-4.4">ENR 4.4</a>'
            + links + extra + '</body></html>')


BASE = 'https://eaip.avians.is/A_10-2026_2026_10_29/eAIP/'
SITE = {'https://eaip.avians.is/': EDITIONS.encode(), BASE + 'menu.html': menu().encode(), BASE + 'BI-ENR%204.4-en-GB.html': points_page().encode(),
        **{BASE + f'BI-ENR%203.2%20{d}-en-GB.html': p.encode() for d, p in ROUTES.items()}}
