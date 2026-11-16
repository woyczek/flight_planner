"""L'eAIP d'Islande (Avians, ex-Isavia) : les pages de points (ENR 4.4) et de routes (ENR 3.2), leur lecture et leur reconnaissance (SOG-0368, 16 nov. 2026). La prise sur le site est dans avians_site.py.

Les faits (lus sur le site par l'ergonome le 16 nov. 2026, puis relus page par page) : la page des éditions (https://eaip.avians.is/) lie chaque édition par une adresse ABSOLUE sur l'un des deux hôtes (eaip.isavia.is, eaip.avians.is), la date dans le segment
sous la forme AAAA_MM_JJ (« A_10-2026_2026_10_29 ») ; les pages sont sous <édition>/eAIP/, le sommaire sous <édition>/eAIP/menu.html (5 Mo, ~6 800 liens, deux langues) ; les noms de pages portent des ESPACES (« BI-ENR 4.4-en-GB.html » : « %20 » dans l'adresse) ;
l'ENR 3.1, 3.3 et 3.4 sont vides (« [NIL] ») ; l'ENR 3.2 (routes de navigation de surface) est à UNE PAGE PAR ROUTE : « BI-ENR 3.2 UT587-en-GB.html » (31 pages), toutes liées depuis menu.html ; AUCUNE de ces pages n'a de <title>, et leurs tableaux n'ont pas les
classes « Table-row-type-… » du Portugal : l'ENR 4.4 est une ligne par point (`<tr id="ABETUENR44">` : nom, coordonnées, routes, remarques), une page de route est un tableau (`ENR_3_2_table`) dont les lignes sont, pour chaque point, UNE ligne de point (« ∆ NOM 665803N 0505630W », parfois « NOM 'SF' »)
puis UNE ligne de tronçon (cap, distance, limites haute et basse). Le noyau d'Annexe 15 (eaip_annexe15.py) ne les lit donc pas : ce module les lit.
Entrée non fiable : les pages sont des textes d'un site tiers ou d'un fichier de l'utilisateur : bornes, aucun nom de fichier ni adresse pris d'une page (sauf les noms de routes du sommaire, par un motif strict). Bibliothèque standard seulement."""
import datetime
import html as htmllib
import os
import re
import urllib.parse
from html.parser import HTMLParser

import eaip_annexe15 as core

HOST = 'eaip.avians.is'
HOSTS = (HOST, 'eaip.isavia.is')
EDITIONS_URL = f'https://{HOST}/'
EDITION_SEG = re.compile(r'A_\d{2}-\d{4}_(\d{4})_(\d{2})_(\d{2})', re.A)      # re.A : \d ne lit que 0-9 (jamais les chiffres arabes ou autres de l'Unicode)
POINTS_PAGE = 'BI-ENR 4.4-en-GB.html'
MENU_PAGE = 'menu.html'
ROUTE_PAGE = 'BI-ENR 3.2 {}-en-GB.html'
# SOG-0368 : le VRAI sommaire écrit ses liens entre APOSTROPHES (href='BI-ENR 3.2 UT587-en-GB.html#ENR-3.2-UT587') ; les deux formes sont lues, la fermeture est du même signe que l'ouverture (\1)
_ROUTE_HREF = re.compile(r'href\s*=\s*(["\'])BI-ENR(?:%20| )3\.2(?:%20| )([A-Z]{1,2}\d{1,4}[A-Z]?)-en-GB\.html(?:#[^"\'<>]*)?\1', re.A)
_ANY_HREF = re.compile(r'href\s*=\s*(?:"([^"]{1,300})"|\'([^\']{1,300})\')')
_TABLE_CLASS = re.compile(r'class\s*=\s*(?:"[^"]*?|\'[^\']*?)\bENR_3_2_([A-Z]{1,2}\d{1,4}[A-Z]?)\b', re.A)
DESIGNATOR = re.compile(r'[A-Z]{1,2}\d{1,4}[A-Z]?', re.A)
MAX_ROUTE_PAGES = 100
MIN_POINTS = 20                       # l'ENR 4.4 d'Islande en compte ~295 : sous ce nombre, ce n'est pas la page attendue
PAGE_MAX = 4 * 1024 * 1024            # l'ENR 4.4 fait 0,6 Mo, une page de route 0,15 Mo
MAX_TABLE_DEPTH = 12
MAX_ROWS = 20000
_SYMBOLS = '∆▲△Δ▽▼◊ \t\xa0'
_BREAKS = ('td', 'th', 'tr', 'br', 'div', 'p', 'table')      # une frontière de cellule ou de ligne est une espace : « ∆ » puis « NOM » puis « 665803N … » ne se collent pas
_COORDS = re.compile(r'(\d{6,7}(?:\.\d+)?[NS])\s*(\d{6,8}(?:\.\d+)?[EW])', re.A)
_LIMIT = re.compile(r'FL ?\d{2,3}|\d{3,5} ?(?:FT|ft)|GND|SFC|UNL')
DEPOSIT = re.compile(r'avians_is_enr_(?:4\.4|3\.2_[A-Z]{1,2}\d{1,4}[A-Z]?)\.html\Z', re.A)
SOURCE = 'Avians Iceland eAIP (ENR 4.4, ENR 3.2)'


# ----------------------------------------------------------------------------------------------------------------------- les éditions, le sommaire
def editions(page):
    """[(AAAA-MM-JJ, segment)] des éditions que la page des éditions LIE : une adresse https sur l'un des deux hôtes, sans port ni paramètre, dont le chemin est exactement « /A_nn-AAAA_AAAA_MM_JJ/ » (la date dans le segment, valide) ; rien d'autre n'est pris (une adresse
    d'un autre hôte, avec un paramètre, avec « .. »). Triées par date, sans doublon."""
    out = {}
    for dq, sq in _ANY_HREF.findall(page):
        href = dq or sq
        try:
            u = urllib.parse.urlsplit(urllib.parse.urljoin(EDITIONS_URL, htmllib.unescape(href).strip()))
            port = u.port
        except ValueError:
            continue
        if u.scheme != 'https' or u.hostname not in HOSTS or port or u.username or u.password or u.query or u.fragment:
            continue
        m = re.fullmatch(r'/(' + EDITION_SEG.pattern + r')/?', u.path, re.A)
        if not m:
            continue
        try:
            iso = datetime.date(int(m.group(2)), int(m.group(3)), int(m.group(4))).isoformat()
        except ValueError:
            continue
        out[iso] = m.group(1)
    return sorted(out.items())


def pick_edition(found, today=None):
    """(AAAA-MM-JJ, base) de l'édition EN VIGUEUR (la plus récente qui n'est pas après `today`), ou None ; la base est lue, jamais construite : « https://eaip.avians.is/<segment>/eAIP/ » (les deux hôtes servent les mêmes pages)."""
    today = (today or datetime.date.today()).isoformat()
    cur = [e for e in found if e[0] <= today]
    if not cur:
        return None
    iso, seg = cur[-1]
    return iso, f'https://{HOST}/{seg}/eAIP/'


def page_url(base, name):
    """L'adresse d'une page sous la base : le nom encodé (« BI-ENR 4.4-en-GB.html » → « BI-ENR%204.4-en-GB.html »)."""
    return base + urllib.parse.quote(name)


def route_names(menu):
    """Les noms des pages de routes (ENR 3.2) LUS dans le sommaire : « BI-ENR 3.2 <route>-en-GB.html », le nom strict (espace ou %20), triés, sans doublon ; ValueError au-delà de MAX_ROUTE_PAGES (un sommaire qui n'est pas celui attendu)."""
    found = sorted({m.group(2) for m in _ROUTE_HREF.finditer(menu)})
    if len(found) > MAX_ROUTE_PAGES:
        raise ValueError(f'plus de {MAX_ROUTE_PAGES} pages de routes dans le sommaire : ce n’est pas le sommaire attendu')
    return [ROUTE_PAGE.format(d) for d in found]


# ----------------------------------------------------------------------------------------------------------------------- les tableaux
class _Tables(HTMLParser):
    """Les tableaux d'une page : [(classes, [{ id, th, cells: [texte] }])] ; le texte d'une cellule porte celui des tableaux qu'elle contient (aplati)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.done, self.rows = [], [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in _BREAKS:
            self.handle_data(' ')
        if tag == 'table':
            if len(self.stack) >= MAX_TABLE_DEPTH:
                raise ValueError('tableaux imbriqués trop profonds')
            self.stack.append({'cls': a.get('class') or '', 'rows': [], 'row': None, 'cell': None})
        elif self.stack and tag == 'tr':
            self.rows += 1
            if self.rows > MAX_ROWS:
                raise ValueError('trop de lignes')
            self.stack[-1]['row'] = {'id': a.get('id') or '', 'th': True, 'cells': []}
        elif self.stack and tag in ('td', 'th') and self.stack[-1]['row'] is not None:
            self.stack[-1]['cell'] = []
            if tag == 'td':
                self.stack[-1]['row']['th'] = False

    def handle_endtag(self, tag):
        if tag in _BREAKS:
            self.handle_data(' ')
        if not self.stack:
            return
        t = self.stack[-1]
        if tag in ('td', 'th') and t['cell'] is not None and t['row'] is not None:
            t['row']['cells'].append(re.sub(r'\s+', ' ', ''.join(t['cell'])).strip())
            t['cell'] = None
        elif tag == 'tr' and t['row'] is not None:
            t['rows'].append(t['row'])
            t['row'] = None
        elif tag == 'table':
            self.done.append((t['cls'], t['rows']))
            self.stack.pop()

    def handle_data(self, data):
        for t in self.stack:
            if t['cell'] is not None:
                t['cell'].append(data)


def tables(page):
    """[(classes, lignes)] de la page, dans l'ordre où les tableaux se ferment ; ValueError si la page est démesurée ou illisible."""
    p = _Tables()
    try:
        p.feed(page)
        p.close()
    except (ValueError, AssertionError, RecursionError) as e:
        raise ValueError(f'page illisible : {e}') from None
    return p.done


def parse_points(page):
    """Les points de l'ENR 4.4 : [{ id, lat, lon, remarks }] ; une ligne `<tr id="…ENR44">` de quatre cellules (nom-code de 2 à 6 lettres ou chiffres, coordonnées « 661910N 0230938W », routes, remarques)."""
    out = []
    for cls, rows in tables(page):
        for r in rows:
            c = r['cells']
            if not r['id'].endswith('ENR44') or len(c) < 2 or r['th']:
                continue
            m = _COORDS.fullmatch(c[1])
            la, lo = (core.dms(m.group(1)), core.dms(m.group(2))) if m else (None, None)
            if re.fullmatch(r'[A-Z0-9]{2,6}', c[0]) and la is not None and lo is not None:
                out.append({'id': c[0], 'lat': la, 'lon': lo, 'remarks': (c[3] if len(c) > 3 else '')[:200]})
    return out


def _point_id(name):
    """L'identifiant d'un point de route : « LILGO » → LILGO ; « SØNDRE STRØMFJORD NDB 'SF' » → SF (le code entre apostrophes d'une balise) ; '' sans code lisible."""
    t = re.sub(r'\s+', ' ', name or '').strip().upper()
    m = re.search(r"'([A-Z0-9]{2,5})'$", t)
    if m:
        return m.group(1)
    return t if re.fullmatch(r'[A-Z0-9]{2,6}', t) else ''


def parse_route(page):
    """Les tronçons d'UNE page de route de l'ENR 3.2 : (désignateur, [{ route, a, b, lower, upper, nm, trk }]) ; désignateur None si la page n'est pas une page de route. Les lignes du tableau `ENR_3_2_table` : le désignateur (« UT587 (RNAV) »), puis par point sa ligne
    (« ∆ NOM 665803N 0505630W ») et la ligne du tronçon qui part de lui (cap vrai « 338° T », distance « 30.5 NM », limites « FL 285 FL 195 » : la haute d'abord) ; un tronçon dont un point est illisible n'est pas rendu."""
    rows = next((r for cls, r in tables(page) if 'ENR_3_2_table' in cls.split()), None)
    if rows is None:
        return None, []
    route, prev, pend, out = None, None, None, []
    for r in rows:
        c = r['cells']
        if r['th'] or not c:
            continue
        if route is None:
            m = re.fullmatch(r'(' + DESIGNATOR.pattern + r')(?:\s*\(.*\))?', c[0], re.A)
            if m and not _COORDS.search(c[0]):
                route = m.group(1)
            continue
        m = re.fullmatch(r'(.*?)\s*' + _COORDS.pattern + r'\s*', c[0], re.A)
        if m and len(c) <= 2:               # une ligne de point : le nom (précédé d'un signe), les coordonnées
            name = m.group(1).strip(_SYMBOLS)
            la, lo = core.dms(m.group(2)), core.dms(m.group(3))
            pid = _point_id(name)
            pt = {'id': pid, 'lat': la, 'lon': lo} if pid and la is not None and lo is not None else None
            if pt and prev and pend:
                out.append({'route': route, 'a': prev, 'b': pt, 'lower': pend['lower'], 'upper': pend['upper'], 'nm': pend['nm'], 'trk': pend['trk']})
            prev, pend = pt, None
        elif prev is not None and len(c) >= 4:       # la ligne du tronçon qui part du point précédent
            dist = re.search(r'([\d.]+)\s*NM', c[2])
            lim = [core.level_ft(x.replace('ft', 'FT')) for x in _LIMIT.findall(c[3])[:2]]
            trk = re.search(r'(\d{1,3})\s*° ?T', c[2])
            pend = {'upper': lim[0] if len(lim) == 2 else None, 'lower': lim[1] if len(lim) == 2 else None, 'nm': float(dist.group(1)) if dist else None, 'trk': int(trk.group(1)) if trk else None}
    return route, out


def designator_of(page):
    """Le désignateur d'une page de route par la classe de son tableau (« ENR_3_2_UT587 ») : sert à RECONNAÎTRE une page déposée par son contenu ; None si ce n'en est pas une."""
    m = _TABLE_CLASS.search(page)
    return m.group(1) if m else None


def recognise(page):
    """('points', None) pour une ENR 4.4 d'Islande, ('route', désignateur) pour une page de route de l'ENR 3.2, ou None : reconnu par le CONTENU (jamais par le nom du fichier)."""
    if len(page) > PAGE_MAX:
        return None
    d = designator_of(page)
    if d:
        route, segs = parse_route(page)
        return ('route', d) if route == d and segs else None
    if 'ENR_4_4' in page and len(parse_points(page)) >= MIN_POINTS:
        return ('points', None)
    return None


def convert(points_page, route_pages, issue, pages=None):
    """(GeoJSON, nombre de points, nombre de tronçons) : les points de l'ENR 4.4, les tronçons des pages de routes (les points qu'une route nomme et que l'ENR 4.4 ne liste pas sont ajoutés). ValueError si l'ENR 4.4 ne donne pas MIN_POINTS points ou si aucune route n'est lue.
    `pages` : { read, of, missing } écrit dans le fichier."""
    points = parse_points(points_page)
    if len(points) < MIN_POINTS:
        raise ValueError(f'ENR 4.4 : {len(points)} point(s) lu(s) (mise en page changée ?)')
    segments, unnamed = [], 0
    for page in route_pages:
        route, segs = parse_route(page)
        if route is None:
            unnamed += 1
        segments.extend(segs)
    if route_pages and not segments:
        raise ValueError('aucun tronçon lu dans les pages de routes (mise en page changée ?)')
    known = {p['id'] for p in points}
    for s in segments:
        for p in (s['a'], s['b']):
            if p['id'] not in known:
                known.add(p['id'])
                points.append({'id': p['id'], 'lat': p['lat'], 'lon': p['lon'], 'remarks': ''})
    if len(points) > core.MAX_POINTS or len(segments) > core.MAX_SEGMENTS:
        raise ValueError('trop d’objets : ce ne sont pas les pages attendues')
    g = core.to_geojson('avians_is_enr', SOURCE, points, segments, issue, extra=('nm', 'trk'))
    if pages:
        g['pages'] = pages
    if unnamed:
        g['skipped'] = {'pages_not_routes': unnamed}
    return g, len(points), len(segments)


# ----------------------------------------------------------------------------------------------------------------------- le repli : les pages déposées à la main
def deposited(folders, today=None):
    """Les pages DÉPOSÉES (data/local/upload/avians_is_enr_*.html, rangées sous leur nom canonique par la reconnaissance du CONTENU) : ({ 'points': page, désignateur: page }, date AAAA-MM-JJ) ; rien si l'ENR 4.4 ou toute route manque. Les noms ne sont jamais pris d'ailleurs ;
    chaque page est re-reconnue par son contenu avant d'être gardée ; au plus MAX_ROUTE_PAGES routes (les suivantes sont ignorées). La DATE est celle du DÉPÔT du plus récent fichier, PLAFONNÉE à aujourd'hui : les pages ne disent pas la leur, ce n'est pas la date de l'édition."""
    got, newest = {}, 0.0
    for folder in folders:
        try:
            names = sorted(os.listdir(folder))
        except OSError:
            continue
        for n in names:
            p = os.path.join(folder, n)
            if not DEPOSIT.fullmatch(n) or os.path.islink(p) or not os.path.isfile(p) or os.path.getsize(p) > PAGE_MAX:
                continue
            try:
                with open(p, encoding='utf-8', errors='replace') as f:
                    page = f.read(PAGE_MAX + 1)
                rec = recognise(page)
            except (OSError, ValueError):
                continue
            if not rec:
                continue
            key = 'points' if rec[0] == 'points' else rec[1]
            if key != 'points' and key not in got and sum(1 for k in got if k != 'points') >= MAX_ROUTE_PAGES:      # au plus MAX_ROUTE_PAGES routes
                continue
            got[key] = page
            newest = max(newest, os.path.getmtime(p))
    if 'points' not in got or len(got) < 2:
        return {}, None
    day = datetime.datetime.fromtimestamp(newest).date()
    return got, min(day, today or datetime.date.today()).isoformat()      # une date du futur (horloge, copie) n'est jamais une édition


def deposit_name(day):
    """Le nom du fichier d'un dépôt à la main : « avians_is_enr_dep_20261116.geojson ». Il ne porte PAS le nom d'une édition (avians_is_enr_AAAAMMJJ) : aero_cycles n'y lit aucun cycle, un dépôt ne dit jamais « à jour »."""
    return core.out_name('avians_is_enr_dep', day)


def from_deposit(folders, today=None):
    """Le GeoJSON des pages déposées : ([entrée], [erreurs]). L'entrée n'a PAS d'`edition` (les pages ne disent pas la leur) : `deposited` = la date du dépôt (plafonnée à aujourd'hui), `datedBy: 'file'` ; le fichier s'appelle deposit_name(), jamais un nom d'édition."""
    import json
    label = SOURCE.split(' (')[0]
    got, day = deposited(folders, today)
    if not got:
        return [], [f'{label} : aucune page déposée à la main (l’ENR 4.4 et au moins une page de route sont nécessaires)']
    routes = [v for k, v in sorted(got.items()) if k != 'points']
    pages = {'read': len(routes), 'of': len(routes)}
    try:
        g, n, m = convert(got['points'], routes, day, pages)
    except ValueError as e:
        return [], [f'{label} : {e}']
    g['datedBy'] = 'file'
    return [{'name': deposit_name(day), 'deposited': day, 'features': n + m, 'pages': pages, 'from': 'pages déposées', 'datedBy': 'file',
             'body': json.dumps(g, ensure_ascii=False).encode('utf-8')}], []
