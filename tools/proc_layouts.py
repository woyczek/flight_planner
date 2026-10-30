"""Les dispositions de pages « CODE » des AIP : UNE liste ordonnée (`LAYOUTS`), un analyseur par disposition, les mots que partagent les analyseurs (V3 § 10.29 (b)).

Une page de table de codage est reconnue par `detect_layout(rows)` : la première entrée de `LAYOUTS` qui la reconnaît (l'ordre compte : uk-star avant uk-app, at-coding et be-coding avant
sia-code, icao-tab avant de-route). Chaque entrée dit tout de sa disposition : `detect` (sa reconnaissance), `read` (son analyseur : lignes → { kind, tables, warnings }), `fingerprints`
(empreintes d'en-tête vues), `ocr_normaliser` et `ocr_readable` (ce que l'OCR corrige et si elle sait la lire), `tolerances` (ce que la source imprime : cap vrai ou magnétique, voir
proc_geometry) et ce que l'analyseur reprend des autres pages du document (`kind_hint`, `known_names`). `read` vaut None pour sia-code : la table du SIA est lue par proc_sia.
Ajouter une disposition, c'est écrire son analyseur et UNE entrée ; ce module n'importe aucun autre module de proc_*. Bibliothèque standard seulement.
"""
import hashlib
import re
from collections import namedtuple



DASHES = '-‐‑‒–—'
PATH_TERMINATORS = {'IF', 'TF', 'CF', 'DF', 'RF', 'AF', 'CA', 'CD', 'CI', 'CR', 'FA', 'FC', 'FD', 'FM', 'HA', 'HF', 'HM', 'PI',
                    'VA', 'VD', 'VI', 'VM', 'VR'}
MONTHS = {m: i + 1 for i, m in enumerate('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split())}


# ---------------------------------------------------------------------------------------------------------- valeurs
def alt_ft(text):
    """« 5000 » → 5000 ; « FL120 » → 12000 ; autre chose ou tiret → None."""
    m = re.fullmatch(r'FL(\d{2,3})', text or '')
    if m:
        return int(m.group(1)) * 100
    return int(text) if re.fullmatch(r'\d{3,5}', text or '') else None


def alt_constraint(lo, hi):
    """Contrainte d'altitude du schéma commun d'après les colonnes mini et maxi, ou None."""
    a, b = alt_ft(lo), alt_ft(hi)
    if a is not None and b is not None:
        return {'type': 'at', 'ft': a} if a == b else {'type': 'between', 'ft': a, 'ft2': b}
    if a is not None:
        return {'type': 'min', 'ft': a}
    return {'type': 'max', 'ft': b} if b is not None else None


def dms(text):
    """Latitude et longitude d'un texte « 45°16'36.1'' N 000°01'20.1'' W » (guillemets de toute forme) ; None sinon."""
    m = re.search(r"(\d{1,2})°\s*(\d{1,2})'\s*([\d.]+)\s*(?:''|\"|’’|”)?\s*([NS])\s*(\d{1,3})°\s*(\d{1,2})'\s*([\d.]+)\s*(?:''|\"|’’|”)?\s*([EW])",
                  text)
    if not m:
        return None
    la = int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600
    lo = int(m.group(5)) + int(m.group(6)) / 60 + float(m.group(7)) / 3600
    return (round(-la if m.group(4) == 'S' else la, 6), round(-lo if m.group(8) == 'W' else lo, 6))


def page_date(rows):
    """Date de la page (« 16 MAY 24 » en en-tête) en AAAA-MM-JJ, ou None."""
    for r in rows[:6]:
        m = re.search(r'\b(\d{1,2}) ([A-Z]{3}) (\d{2})\b', r)
        if m and m.group(2) in MONTHS:
            return f'20{m.group(3)}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}'
    return None


FIXLESS = {'CA', 'VA', 'VI', 'VM', 'VR', 'FM', 'CI'}       # tronçons sans point : un cap jusqu'à une altitude ou à un vecteur (id null, SPEC § 5 quinquies)


# ---------------------------------------------------------------------------------------------------------- vérification du format des pages
# Un format de page change sans prévenir (une colonne ajoutée, un en-tête reformulé, une page tournée) : avant de lire une page, on vérifie par script
# qu'elle a la disposition que l'analyseur connaît, et après l'avoir lue, que l'analyseur en a bien tiré tout ce qu'elle porte. Une page qui échoue
# n'est PAS lue (rien de deviné), elle est signalée ; l'empreinte de son en-tête dit si l'en-tête a changé depuis les pages vues.
HEADER_WORDS = r'path|terminator|waypoint|identification|leg sequence|altitude|direction|distance|turn|fly|accuracy|nav spec|vertical|speed|ias'


def _is_leg_row(row):
    t = row.split()
    k = next((i for i, w in enumerate(t[:6]) if w in PATH_TERMINATORS and i + 1 < len(t)), None)
    return k is not None and len(t) - k >= 9


def fingerprint(rows):
    """Empreinte de l'en-tête d'une page : les mots des lignes d'en-tête (sans les valeurs), triés ; deux pages de même disposition ont la même."""
    words = sorted({w.lower() for r in rows if re.search(HEADER_WORDS, r, re.I) and not _is_leg_row(r) for w in re.findall(r'[A-Za-z]{3,}', r)})
    return hashlib.sha1(' '.join(words).encode()).hexdigest()[:10]


# ---------------------------------------------------------------------------------------------------------- Royaume-Uni (UK AIP, via EAD Basic)
# AD 2.<OACI>-8-13 « Instrument Approach Procedure Coding Tables » : texte lisible. Une ligne de tronçon « R09L 001 IF ABAVI - - - 3000 - IF / 10NM » est encadrée
# de la latitude (ligne avant, avec le cap magnétique « 088° ») et de la longitude (ligne après, avec le cap vrai « (089.46°) »).
# AD 2.<OACI>-7-13 à -7-17 (tables de codage des STAR) : texte DESSINÉ EN VECTEURS, sans couche de texte : illisible pour pypdf, voir EAD_BASIC.md § 6 undecies.
UK_LEG = re.compile(r'^([A-Z]\d{2}[LRC]?)\s+(\d{3})\s+([A-Z]{2})\s+(\S+)\s*(.*)$')
UK_LAT = re.compile(r'(\d{6}(?:\.\d+)?)([NS])\b')
UK_LON = re.compile(r'(\d{7}(?:\.\d+)?)([EW])\b')


def uk_dms(text, lon=False):
    """« 512834.45N » / « 0004505.67W » (ddmmss.ss, dddmmss.ss) en degrés décimaux, ou None."""
    m = (UK_LON if lon else UK_LAT).search(text)
    if not m:
        return None
    v, h = m.group(1), m.group(2)
    d = 3 if lon else 2
    val = int(v[:d]) + int(v[d:d + 2]) / 60 + float(v[d + 2:]) / 3600
    return round(-val if h in 'SW' else val, 6)


def uk_constraint(tok):
    """Contrainte d'altitude d'une cellule « Level Constraint » : « 3000 » / « FL270 » à l'altitude, « +… » au moins, « -… » au plus ; None sans valeur."""
    m = re.fullmatch(r'([+-]?)(FL(\d{2,3})|\d{3,5})', tok or '')
    if not m:
        return None
    ft = int(m.group(3)) * 100 if m.group(3) else int(m.group(2))
    return {'type': {'+': 'min', '-': 'max', '': 'at'}[m.group(1)], 'ft': ft}


def parse_uk_app(rows):
    """Page « Instrument Approach Procedure Coding Tables » du Royaume-Uni → { kind: 'APP', tables: [{ title, runways, name, transition, legs }], warnings }.
    Chaque tronçon : { id, leg, over, alt, kt, lat, lon, crs (magnétique), true, remark }."""
    warnings, tables, cur = [], [], None
    for i, r in enumerate(rows):
        m = re.match(r'^[A-Za-z ]+?\s+(RNP|RNAV|ILS|LOC|VOR|NDB)\b.*?Instrument Approach Procedure(?: via (\S+))?', r)
        if m and 'Coding Tables' not in r:
            rwm = re.search(r'\bRWY\s*(\d{2}[LRC]?)', r)
            name = re.sub(r'\s+-\s+Instrument Approach Procedure.*', '', r)
            name = re.sub(r'^.*? (RNP|RNAV|ILS|LOC|VOR|NDB)\b', r'\1', name).strip()
            cur = {'title': r, 'name': name, 'runways': [rwm.group(1)] if rwm else [], 'transition': m.group(2), 'legs': []}
            tables.append(cur)
            continue
        lg = UK_LEG.match(r)
        if not (lg and cur is not None):
            continue
        rest = lg.group(5).split()
        before = rows[i - 1] if i else ''
        after = rows[i + 1] if i + 1 < len(rows) else ''
        lat, lon = uk_dms(before), uk_dms(after, True)
        mag = re.search(r'(\d{3})°', before)
        true = re.search(r'\((\d{3}(?:\.\d+)?)°\)', after)
        name = lg.group(4)
        k = 0
        over = rest[0] == 'Y' if rest else False
        level = next((uk_constraint(t) for t in rest[:6] if uk_constraint(t)), None)
        speed = next((int(t.lstrip('+-')) for t in rest[:6] if re.fullmatch(r'[+-]\d{3}', t)), None)
        if name == '-' or lat is None or lon is None:
            warnings.append(f'{lg.group(1)} {lg.group(2)} {lg.group(3)}: pas de point ({name}) ou coordonnées absentes: tronçon sans point laissé de côté')
            continue
        cur['legs'].append({'id': name, 'leg': lg.group(3), 'over': over or None, 'alt': level, 'kt': speed, 'lat': lat, 'lon': lon,
                            'crs': int(mag.group(1)) if mag else None, 'true': float(true.group(1)) if true else None, 'seq': int(lg.group(2)),
                            'remark': ' '.join(rest[3:])[:40]})
    return {'kind': 'APP', 'tables': [t for t in tables if t['legs']], 'warnings': warnings}


UK_STAR_LEG = re.compile(r'^([A-Z]{3,5}\d[A-Z])\s+(\d{3})\s+([A-Z]{2})\s+(\S+)\s*(.*)$')
UK_STAR_TITLE = re.compile(r'\b([A-Z]{3,5})\s*(\d[A-Z])\s*$')


def parse_uk_star(rows):
    """Page « Standard Instrument Arrival Coding Tables » du Royaume-Uni (AD 2.<OACI>-7-13 à -7-17, texte dessiné en vecteurs : lue par OCR seulement, voir tools/proc_ocr.py)
    → { kind: 'STAR', tables: [{ title, kind, name, runways, transition, legs }], warnings }. Chaque tronçon tient sur trois lignes : la latitude et le cap magnétique
    (« 512834.45N 088° ») avant, la ligne du tronçon (« OTMET1H 002 TF SOKDU 1.2 12.3 LEFT +3000 -250 RNAV1 » : désignateur, séquence, type, point, variation magnétique, distance, sens
    de virage en toutes lettres, niveau, vitesse, performance), la longitude et le cap vrai (« 0004505.67W (089.46°) ») après. Une ligne de tronçon sans latitude avant, sans longitude
    après, ou un tronçon TF sans cap vrai fait rejeter la table (« NON retenue ») : rien n'est complété. Le survol n'est pas lisible par OCR : `over` vaut None (un avertissement par table)."""
    warnings, tables, cur = [], [], None
    for i, r in enumerate(rows):
        lg = UK_STAR_LEG.match(r)
        if lg and lg.group(3) in PATH_TERMINATORS:
            if cur is None or cur['des'] != lg.group(1):
                cur = {'title': next((x for x in reversed(rows[max(0, i - 12):i]) if UK_STAR_TITLE.search(x) and 'designator' not in x.lower() and not UK_STAR_LEG.match(x)), lg.group(1)),
                       'des': lg.group(1), 'legs': [], 'bad': [], 'rest': []}
                tables.append(cur)
            cur['rest'].append((i, lg))
    out = []
    for t in tables:
        name = t['des']
        m = UK_STAR_TITLE.search(t['title'])
        if m:
            name = f'{m.group(1)} {m.group(2)}'
        elif re.fullmatch(r'[A-Z]{3,5}\d[A-Z]', name):
            name = f'{name[:-2]} {name[-2:]}'
        rwy = re.findall(r'\bRWY\s*(\d{2}[LRC]?)', t['title'])
        legs, bad = [], []
        for n, (i, lg) in enumerate(t['rest']):
            before = rows[i - 1] if i else ''
            after = rows[i + 1] if i + 1 < len(rows) else ''
            lat, lon = uk_dms(before), uk_dms(after, True)
            mag = re.search(r'(?<![\d.])(\d{3})\D*$', UK_LAT.sub(' ', before)) if lat is not None else None
            true = re.search(r'\(\s*(\d{3}(?:\.\d+)?)', after)
            toks = lg.group(5).split()
            decs = [float(x) for x in toks if re.fullmatch(r'\d{1,3}\.\d', x)]
            turn = next(({'LEFT': 'L', 'RIGHT': 'R'}[x.upper()] for x in toks if x.upper() in ('LEFT', 'RIGHT')), None)
            speed = next((int(x.lstrip('+-')) for x in toks if re.fullmatch(r'[+-]?\d{3}', x)), None)
            level = next((uk_constraint(x) for x in toks if re.fullmatch(r'[+-]?(?:FL\d{2,3}|\d{4,5})', x)), None)
            tf = lg.group(3) == 'TF'
            if lat is None or lon is None:
                bad.append(f'{lg.group(1)} {lg.group(2)}: latitude avant ou longitude après absente')
            elif tf and (true is None or not decs):
                bad.append(f'{lg.group(1)} {lg.group(2)}: tronçon TF sans cap vrai ou sans distance')
            legs.append({'id': lg.group(4), 'leg': lg.group(3), 'over': None, 'alt': level, 'kt': speed, 'lat': lat, 'lon': lon, 'crs': int(mag.group(1)) if mag else None,
                         'true': float(true.group(1)) if true else None, 'nm': decs[-1] if tf and decs else None, 'turn': turn, 'seq': int(lg.group(2)), 'remark': ''})
        if bad:
            warnings.append(f'{t["title"][:60]}: {len(bad)} tronçon(s) incomplet(s) ({"; ".join(bad[:3])}), table NON retenue')
            continue
        if len(legs) < 2 or legs[0]['leg'] != 'IF':
            warnings.append(f'{t["title"][:60]}: {len(legs)} tronçon(s) lu(s), premier tronçon {legs[0]["leg"] if legs else "absent"} (IF attendu), table NON retenue')
            continue
        warnings.append(f'{t["title"][:60]}: survol non lu (OCR)')
        out.append({'title': t['title'], 'kind': 'STAR', 'name': name, 'runways': sorted(set(rwy)), 'transition': None, 'legs': legs})
    return {'kind': 'STAR', 'tables': out, 'warnings': warnings}


AM_TERMINATORS = {'IF', 'TF', 'CF', 'DF', 'RF', 'AF', 'FA', 'FC', 'FD', 'FM', 'HA', 'HF', 'HM', 'PI', 'CA', 'CD', 'CI', 'CR', 'VA', 'VD', 'VI', 'VM', 'VR'}
AM_ROLES = {'IAF', 'FAF', 'FAP', 'MAPT', 'MAHF', 'IF'}
AM_HEADER = {w.lower() for w in 'Waypoint Course/ Constraints Navigation Path DIST Turn Fly Over Coordinates Track Terminator NM Direction Specification Remarks Identifier Mag(True) Level IAS'.split()}
AM_LAT = re.compile(r'([NS])(\d{2}) (\d{2}) (\d{2}(?:\.\d+)?)')
AM_LON = re.compile(r'([EW])(\d{3}) (\d{2}) (\d{2}(?:\.\d+)?)')
AM_CRS = re.compile(r'(\d{3})°\s*\(T(\d{3}(?:\.\d+)?)°?\)')


def _am_deg(m):
    v = int(m.group(2)) + int(m.group(3)) / 60 + float(m.group(4)) / 3600
    return round(-v if m.group(1) in 'SW' else v, 6)


def parse_am_coding(rows):
    """Page de tables de codage « RNAV STAR / SID CODING TABLE OF <nom> » (Arménie, vue le 28 octobre 2026) → { tables: [{ title, kind, name, runways, legs }], warnings }.
    Les cellules d'un tronçon sont éclatées sur plusieurs lignes dans un ordre qui varie d'une table à l'autre : on ne s'appuie donc pas sur les lignes mais sur l'ordre des
    valeurs : les n coordonnées, les caps (« 347° (T354.3°) ») et les distances viennent dans l'ordre des tronçons ; si leur nombre ne colle pas avec celui des
    terminaisons de chemin (IF, TF…), la table est rejetée et signalée, jamais complétée."""
    warnings, tables, rw = [], [], []
    blocks, cur = [], None
    for r in rows:
        m = re.match(r'(?i)^(?:RNAV\s+)?(STAR|SID)\s+CODING TABLE OF\s+(.+?)\s*$', r.replace('RNAV STAR', 'STAR').replace('RNAV SID', 'SID'))
        if re.match(r'(?i)^standard (arrival|departure)', r):
            rw = re.findall(r'\bRWY\s*(\d{2}[LRC]?)', r)
        if m:
            cur = {'title': r, 'kind': m.group(1).upper(), 'name': m.group(2), 'runways': list(rw), 'lines': []}
            blocks.append(cur)
        elif cur is not None:
            if r.startswith('Designator Route') or r.startswith('____') or r.startswith('©'):
                cur = None
            elif not all(w.lower() in AM_HEADER for w in r.split()):
                cur['lines'].append(r)
    for b in blocks:
        text = ' '.join(b['lines'])
        lats = [_am_deg(m) for m in AM_LAT.finditer(text)]
        lons = [_am_deg(m) for m in AM_LON.finditer(text)]
        text = AM_LON.sub(' ', AM_LAT.sub(' ', text))
        crs = [(int(m.group(1)), float(m.group(2))) for m in AM_CRS.finditer(text)]
        text = AM_CRS.sub(' ', text)
        dists = [float(x) for x in re.findall(r'(?<!\S)(\d{1,3}\.\d)(?!\S)', text)]
        text = re.sub(r'(?<!\S)\d{1,3}\.\d(?!\S)', ' ', text)
        toks = text.split()
        idx = [i for i, t in enumerate(toks) if t in AM_TERMINATORS and (i == 0 or toks[i - 1].upper() not in ('IAF', 'FAF'))]
        legs = []
        segs = [toks[i + 1:(idx[k + 1] if k + 1 < len(idx) else len(toks))] for k, i in enumerate(idx)]
        for k in range(1, len(segs)):
            # l'identifiant du point peut précéder le terminateur (« IAF AMGIK … » puis « TF N 18.0 … ») : il est alors en queue du tronçon précédent
            if segs[k][:1] in (['N'], ['Y']):
                j = next((n for n in range(len(segs[k - 1]) - 1, -1, -1) if segs[k - 1][n].upper() in AM_ROLES - {'IF'}), None)
                if j is not None and j + 1 < len(segs[k - 1]):
                    segs[k] = [segs[k - 1][j + 1]] + segs[k]
                    segs[k - 1] = segs[k - 1][:j]
        for k, i in enumerate(idx):
            seg = segs[k]
            while seg and seg[0].upper() in AM_ROLES - {'IF'}:
                seg = seg[1:]
            if not seg:
                continue
            leg = {'id': seg[0], 'leg': toks[i], 'over': (seg[1:2] == ['Y']) or None, 'alt': None, 'kt': None, 'crs': None, 'true': None, 'nm': None,
                   'turn': next((t for t in seg[1:3] if t in ('L', 'R')), None)}
            for t in seg[1:]:
                m = re.fullmatch(r'(FL(\d{2,3})|A(\d{3,5}))([+-]?)', t)
                if m and leg['alt'] is None:
                    leg['alt'] = {'type': {'+': 'min', '-': 'max', '': 'at'}[m.group(4)], 'ft': int(m.group(2)) * 100 if m.group(2) else int(m.group(3))}
                m = re.fullmatch(r'K(\d{3})([+-]?)', t)
                if m and leg['kt'] is None:
                    leg['kt'] = int(m.group(1))
            legs.append(leg)
        tf = [lg for lg in legs if lg['leg'] == 'TF']
        if not legs or len(lats) != len(legs) or len(lons) != len(legs) or len(crs) != len(tf) or (dists and len(dists) != len(tf)):
            warnings.append(f'{b["name"]}: {len(legs)} tronçon(s), {len(lats)}/{len(lons)} coordonnée(s), {len(crs)} cap(s), {len(dists)} distance(s): comptes incohérents, table NON retenue')
            continue
        for n, lg in enumerate(legs):
            lg['lat'], lg['lon'], lg['seq'], lg['remark'] = lats[n], lons[n], n + 1, ''
        for lg, c, d in zip(tf, crs, dists or [None] * len(tf)):
            lg['crs'], lg['true'], lg['nm'] = c[0], c[1], d
        tables.append({'title': b['title'], 'kind': b['kind'], 'name': b['name'], 'runways': b['runways'], 'transition': None, 'legs': legs})
    return {'kind': 'MIXED', 'tables': tables, 'warnings': warnings}


AT_LAT = re.compile(r'(?<![\w.])([NS])(\d{2})(\d{2})(\d{2}(?:\.\d+)?)(?!\d)')
AT_LON = re.compile(r'(?<![\w.])([EW])(\d{3})(\d{2})(\d{2}(?:\.\d+)?)(?!\d)')
AT_LEG = re.compile(r'^([A-Z]{2})\s+(\S+)\s+(no|yes)\b\s*(.*)$', re.I)


def at_dms(text, lon=False):
    """« N471234.56 » / « E0150123.45 » (hddmmss.ss, hdddmmss.ss, hémisphère devant) en degrés décimaux, ou None."""
    m = (AT_LON if lon else AT_LAT).search(text or '')
    if not m:
        return None
    v = int(m.group(2)) + int(m.group(3)) / 60 + float(m.group(4)) / 3600
    return round(-v if m.group(1) in 'SW' else v, 6)


AT_TITLE = re.compile(r'(?i)(?:transition\s+)?coding\s+table(?:\s+of|\s*:)\s+(.+?)\s*$')
AT_SYM_LAT = re.compile(r'(\d{2})\s*°\s*(\d{2})\s*[\'′]\s*(\d{2})(?:\s*[,.]\s*(\d(?:\s*\d)*))?\s*["″]\s*([NS])\b')
AT_SYM_LON = re.compile(r'(\d{3})\s*°\s*(\d{2})\s*[\'′]\s*(\d{2})(?:\s*[,.]\s*(\d(?:\s*\d)*))?\s*["″]\s*([EW])\b')


def at_norm(row):
    """Ligne d'une page at-coding ramenée à la forme canonique : coordonnées « 48°37'14 , 9 4 "N » (virgule décimale, chiffres espacés) → « N483714.94 » ; virgules décimales
    « 12,7 » → « 12.7 » ; « ( 258,7 °) » → « (258.7°) » ; « A 6000+ » → « A6000+ » ; « 187 ° » → « 187° ». Rien d'autre n'est modifié."""
    def lat(m):
        return f'{m.group(5)}{m.group(1)}{m.group(2)}{m.group(3)}' + ('.' + re.sub(r'\s+', '', m.group(4)) if m.group(4) else '')
    r = AT_SYM_LON.sub(lat, AT_SYM_LAT.sub(lat, row))
    r = re.sub(r'\(\s*T?\s*(\d{3}(?:[.,]\d+)?)\s*°?\s*\)', lambda m: f'({m.group(1).replace(",", ".")}°)', r)
    r = re.sub(r'(?<=\d),(?=\d)', '.', r)
    r = re.sub(r'\b(A|FL)\s+(?=\d)', r'\1', r)
    return re.sub(r'(?<=\d)\s+°', '°', r)


def parse_at_coding(rows):
    """Page « RNAV Transition Coding Table of <nom> » de l'Autriche ou « RNAV 1 STAR Coding Table: <nom> » de la Slovaquie → { kind: 'STAR', tables: [{ title, kind, name, runways,
    transition, legs }], warnings }. Deux ordres de lignes : celui de l'OCR (tables dessinées en vecteurs) et celui de la couche de texte du PDF, où les lignes d'un tronçon
    s'intercalent. Une table commence à son titre ; les pistes viennent de la ligne « TRANSITION to RWY 16C and RWY 34C » de la page. Chaque tronçon se compose de trois morceaux :
    latitude (+ cap magnétique « 088° »), « TF IDENT no 12.3 left A5000+ K220- RNAV 1 » (type, point, survol no / yes, distance, sens de virage en toutes lettres, altitude « A… » ou
    « FL… », vitesse « K… »), longitude (+ cap vrai « (089.5°) »). Les lignes entre deux lignes de tronçon sont rangées par leur contenu : avec une latitude, ou un cap magnétique
    seul → avant le tronçon suivant ; sinon (longitude, cap vrai, distance, virage, niveau) → après le tronçon précédent (les coordonnées peuvent aussi être sur la ligne du tronçon).
    Un tronçon sans latitude ou sans longitude, ou un TF sans cap vrai ni distance, fait rejeter la table (« NON retenue ») : rien n'est complété. Survol : « yes » → True, « no » → None."""
    rows = [at_norm(r) for r in rows]
    warnings, tables, cur, rw = [], [], None, []
    for i, r in enumerate(rows):
        if re.search(r'(?i)transition\s+to\s+RWY', r) and not rw:
            rw = list(dict.fromkeys(re.findall(r'\bRWY\s*(\d{2}[LRC]?)', r)))
        m = AT_TITLE.search(r)
        if m:
            cur = {'title': r, 'name': re.sub(r'\s+', ' ', m.group(1)), 'rows': [], 'kind': 'SID' if re.search(r'\bSID\b', r) else 'STAR'}
            tables.append(cur)
        elif cur is not None:
            if re.match(r'(?i)^(?:designator\s+route|rnav holding|airac|aip\b)', r):
                cur = None
            else:
                cur['rows'].append(r)
    out = []
    for t in tables:
        legs, bad = [], []
        pos = [k for k, r in enumerate(t['rows']) if (lg := AT_LEG.match(r)) and lg.group(1).upper() in PATH_TERMINATORS]
        for n, k in enumerate(pos):
            lg = AT_LEG.match(t['rows'][k])
            lo_k = pos[n - 1] if n else -1
            hi_k = pos[n + 1] if n + 1 < len(pos) else len(t['rows'])
            side = lambda x: 'b' if (AT_LAT.search(x) or re.fullmatch(r'\s*\d{3}\s*°?\s*', x)) else 'a'       # « avant » le tronçon suivant ou « après » le précédent
            before = [x for x in t['rows'][lo_k + 1:k] if side(x) == 'b']
            after_all = [x for x in t['rows'][k + 1:hi_k] if side(x) == 'a']
            after = after_all[:2]
            own = lg.group(4)
            btxt, atxt = ' '.join(before), ' '.join(after)
            lat, lon = at_dms(btxt + ' ' + own), at_dms(own + ' ' + atxt, True)
            mag = re.search(r'(?<![\d.])(\d{3})\D*$', AT_LAT.sub(' ', btxt)) if lat is not None else None
            true = re.search(r'\(\s*T?\s*(\d{3}(?:\.\d+)?)', atxt)
            toks = (AT_LON.sub(' ', AT_LAT.sub(' ', own)) + ' ' + re.sub(r'\([^)]*\)', ' ', atxt)).split()
            decs = [float(x) for x in toks if re.fullmatch(r'\d{1,3}\.\d', x)]
            turn = next(({'left': 'L', 'right': 'R'}[x.lower()] for x in toks if x.lower() in ('left', 'right')), None)
            alt = next((a for a in (re.fullmatch(r'(A|FL)(\d{2,5})([+-]?)', x) for x in toks) if a), None)
            kt = next((k2 for k2 in (re.fullmatch(r'K(\d{3})[+-]?', x) for x in toks) if k2), None)
            tf = lg.group(1).upper() == 'TF'
            if lat is None or lon is None:
                bad.append(f'{lg.group(2)}: latitude avant ou longitude après absente')
            elif tf and (true is None or not decs):
                bad.append(f'{lg.group(2)}: tronçon TF sans cap vrai ou sans distance')
            legs.append({'id': lg.group(2), 'leg': lg.group(1).upper(), 'over': True if lg.group(3).lower() == 'yes' else None,
                         'alt': {'type': {'+': 'min', '-': 'max', '': 'at'}[alt.group(3)], 'ft': int(alt.group(2)) * (100 if alt.group(1) == 'FL' else 1)} if alt else None,
                         'kt': int(kt.group(1)) if kt else None,
                         'lat': lat, 'lon': lon, 'crs': int(mag.group(1)) if mag else None, 'true': float(true.group(1)) if true else None,
                         'nm': decs[-1] if tf and decs else None, 'turn': turn, 'seq': len(legs) + 1, 'remark': ''})
        if bad or len(legs) < 2 or legs[0]['leg'] != 'IF':
            warnings.append(f'{t["name"]}: {len(legs)} tronçon(s) lu(s)' + (f' ({"; ".join(bad[:3])})' if bad else ', premier tronçon IF attendu') + ', table NON retenue')
            continue
        out.append({'title': t['title'], 'kind': t['kind'], 'name': t['name'], 'runways': list(rw), 'transition': None, 'legs': legs})
    return {'kind': out[0]['kind'] if out else 'STAR', 'tables': out, 'warnings': warnings}


BE_COORD = re.compile(r"^([A-Z]{2}\d{3}|RW\d{2}[LRC]?|[A-Z]{3,5})\s*:\s*(\d{2})\s*°\s*(\d{2}(?:[.,]\d+)?)\s*['′]?\s*([NS])\s*(\d{3})\s*°\s*(\d{2}(?:[.,]\d+)?)\s*['′]?\s*([EW])\b")
BE_LEG = re.compile(r'(?<![\d.])(\d{3})\s+(IF|TF|CF|DF|RF|CA|FA|CD|CI|CR|HM|HA|HF|VA|VI|VM)\s+([A-Z]{2}\d{3}|RW\d{2}[LRC]?|[A-Z]{3,5})\s+(.*)$')
BE_LEG_NOSEQ = re.compile(r'^(IF|TF|CF|DF|RF|CA|FA|CD|CI|CR|HM|HA|HF|VA|VI|VM)\s+([A-Z]{2}\d{3}|RW\d{2}[LRC]?|[A-Z]{3,5})\s+(.*)$')
BE_TITLE = re.compile(r'\b(RNP|RNAV)\s+RWY\s*(\d{2}[LRC]?)\b')


def be_coords(rows):
    """Liste « WAYPOINTS COORDINATES » de la page belge (« BE123: 50°44.12' N 004°21.34'E - IAF », degrés et minutes décimales) → {identifiant: (lat, lon)}. La première valeur lue
    d'un identifiant est gardée ; des minutes ≥ 60 ne sont pas lues."""
    out = {}
    for r in rows:
        m = BE_COORD.match(r.strip())
        if not m:
            continue
        id_, d1, m1, h1, d2, m2, h2 = m.groups()
        a, b = float(m1.replace(',', '.')), float(m2.replace(',', '.'))
        if a >= 60 or b >= 60 or int(d1) > 90 or int(d2) > 180:
            continue
        la, lo = int(d1) + a / 60, int(d2) + b / 60
        out.setdefault(id_, (round(-la if h1 == 'S' else la, 6), round(-lo if h2 == 'W' else lo, 6)))
    return out


BE_SIDTITLE = re.compile(r'\b(SID|STAR)\s+([A-Z]{2}\s?\d{2}[A-Z])\b')
BE_SIMPLE_LEGS = {'IF', 'TF', 'CF', 'DF'}


def parse_be_coding(rows):
    """Page « <TYPE> ARINC CODING » de la Belgique (carte IAC ou SID dont le codage est dessiné en vecteurs : lue par OCR) → { kind, tables: [{ title, kind, name, runways, transition,
    legs }], warnings }. Une table commence à chaque « WAYPOINTS COORDINATES » : la liste des points (« BE123: 50°44.12' N 004°21.34'E - IAF », degrés et minutes décimales), puis
    les tronçons, un par ligne : « 003 TF BE123 FAF 12.3 @ 3000 -3.00% » (séquence, type, point, rôle, cap vrai, contrainte d'altitude, vitesse « 210Kts », angle vertical). Ni distance
    ni cap magnétique ne sont imprimés : le contrôle de géométrie ne vérifie que le cap vrai des TF. Les coordonnées viennent de la liste de la table ; un identifiant présent dans
    plusieurs listes de la page doit y avoir les mêmes coordonnées, sinon les tables concernées sont rejetées (lectures concurrentes : jamais de choix entre deux valeurs).
    Un point absent de la liste n'est plus un motif de rejet (§ 10.29 (c)) : le tronçon est gardé sans position, les listes des autres documents peuvent la donner (build_pdf_dir), sinon la procédure
    reste au statut « doubt », code « unresolved » (proc_geometry, positions requises).
    Approche (« EBBE RNP RWY 09R COORDINATES AND CODING ») : premier tronçon IF, chaque TF porte son cap vrai, sinon la table est rejetée (« NON retenue »). Une table sans titre
    est nommée d'après son point de piste (RWnn).
    SID / STAR (« SID BE 04F (RNAV1) COORDINATES AND CODING ») : la page n'imprime le cap vrai que de certains TF (et celui d'un CF, qui n'est pas contrôlable : aucun point avant lui). RÈGLE :
    la table est gardée, avec l'avertissement « cap non imprimé : géométrie non contrôlable » (nombre de tronçons concernés), si son
    premier tronçon est IF ou CF, si tous ses tronçons sont IF, TF, CF ou DF (une chaîne de points nommés, sans arc, attente ni tronçon sans point) et si les caps imprimés passent le contrôle de
    géométrie ; sinon elle est rejetée. Le sens de virage et le survol (cellules d'une lettre) ne sont pas lus par OCR : `turn` et `over` valent None."""
    warnings, tables = [], []
    starts = [i for i, r in enumerate(rows) if re.search(r'(?i)waypoints\s+coordinates', r)]
    titles = []                                  # (ligne, type, nom, pistes)
    for i, r in enumerate(rows):
        if not re.search(r'(?i)coordinates\s+and\s+coding', r):
            continue
        m, sm = BE_TITLE.search(r), BE_SIDTITLE.search(r)
        if sm:
            titles.append((i, sm.group(1), re.sub(r'\s+', ' ', sm.group(2)), []))
        elif m:
            titles.append((i, 'APP', f'{m.group(1)} RWY {m.group(2)}', [m.group(2)]))
    word = next((m.group(1) for r in rows for m in [BE_TITLE.search(r)] if m), 'RNP')
    lists = [be_coords(rows[s:(starts[n + 1] if n + 1 < len(starts) else len(rows))]) for n, s in enumerate(starts)]
    clash = {k for a in lists for k, v in a.items() for b in lists if k in b and b[k] != v}      # même identifiant, deux coordonnées différentes dans la page
    for n, s in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(rows)
        block = rows[s:end]
        coords = lists[n]
        legs, bad = [], []
        for r in block:
            if re.match(r'(?i)^missed approach', r.strip()):
                continue
            lg = BE_LEG.search(r) or BE_LEG_NOSEQ.match(r.strip())
            if not lg:
                continue
            g = lg.groups()
            tt, ident, rest = (g[1], g[2], g[3]) if len(g) == 4 else (g[0], g[1], g[2])
            toks = rest.split()
            role = toks[0] if toks else ''
            true = next((float(t) for t in toks if re.fullmatch(r'\d{3}\.\d', t)), None) if tt == 'TF' else None
            alt = None
            for k, t in enumerate(toks):
                if re.fullmatch(r'\d{3,5}/\d{3,5}', t):
                    lo, hi = t.split('/')
                    alt = alt_constraint(lo, hi)
                elif t == '@' and k + 1 < len(toks) and re.fullmatch(r'\d{3,5}', toks[k + 1]):
                    alt = {'type': 'at', 'ft': int(toks[k + 1])}
                elif re.fullmatch(r'[+-]\d{3,5}', t) and alt is None:
                    alt = {'type': 'min' if t[0] == '+' else 'max', 'ft': int(t[1:])}
                if alt:
                    break
            kt = re.search(r'(\d{2,3})\s*Kts', rest)
            c = coords.get(ident)
            if c is not None and ident in clash:
                bad.append(f'{ident}: coordonnées différentes dans deux listes de la page')
            legs.append({'id': ident, 'leg': tt, 'over': None, 'alt': alt, 'kt': int(kt.group(1)) if kt else None, 'lat': c[0] if c else None, 'lon': c[1] if c else None,
                         'crs': None, 'true': true, 'nm': None, 'turn': None, 'seq': len(legs) + 1, 'remark': 'MAPt' if 'MAPT' in role.upper() else ''})
        near = [t for t in titles if (starts[n - 1] if n else -1) < t[0] < s]
        rw = next((lg['id'] for lg in legs if re.fullmatch(r'RW\d{2}[LRC]?', lg['id'])), None)
        if near:
            kind, name, runways = near[-1][1], near[-1][2], near[-1][3]
        elif rw:
            kind, name, runways = 'APP', f'{word} RWY {rw[2:]}', [rw[2:]]
        else:
            kind, name, runways = 'APP', f'{word} RWY ?', []
        label = f'{name} (table {n + 1})'
        first = {'APP': ('IF',)}.get(kind, ('IF', 'CF'))
        unchecked = 0
        if kind == 'APP':
            bad += [f'{lg["id"]}: tronçon TF sans cap vrai' for lg in legs if lg['leg'] == 'TF' and lg['true'] is None]
        else:
            bad += [f'{lg["id"]}: tronçon {lg["leg"]} hors de IF / TF / CF / DF' for lg in legs if lg['leg'] not in BE_SIMPLE_LEGS]
            unchecked = sum(1 for lg in legs if lg['leg'] != 'IF' and lg['true'] is None)
        if bad or len(legs) < 2 or legs[0]['leg'] not in first:
            warnings.append(f'{label}: {len(legs)} tronçon(s) lu(s)' + (f' ({"; ".join(bad[:3])})' if bad else f', premier tronçon {"/".join(first)} attendu') + ', table NON retenue')
            continue
        if unchecked:
            warnings.append(f'{label}: cap non imprimé : géométrie non contrôlable ({unchecked} tronçon(s) sur {len(legs)})')
        tables.append({'title': label, 'kind': kind, 'name': name, 'runways': runways, 'transition': None, 'legs': legs})
    return {'kind': tables[0]['kind'] if tables else 'APP', 'tables': tables, 'warnings': warnings}


GE_LEG = re.compile(r'^(IF|TF|CF|DF|RF|CA|FA|CD|CI|CR)\s+(\S+)\s+(.*)$')


def parse_ge_coding(rows):
    """Page « RNAV Transition Coding Tables - RWY 07 ILSz » de la Géorgie (dessinée en vecteurs : lue par OCR) → { kind: 'APP', tables: [{ title, kind, name, runways, transition,
    legs }], warnings }. Une table par transition (« LANNU transition »), un tronçon par ligne avec ses coordonnées en degrés-minutes-secondes
    (« TF KO123 41°39'12.3"N 044°56'01.2"E 087°(087.4°) 9.9 +A3000 -220 RNAV1 » : type, point, latitude, longitude, cap magnétique et vrai, distance, virage éventuel en toutes
    lettres, altitude « A… » signée, vitesse signée). Un tronçon sans coordonnées, un TF sans cap vrai ni distance, ou un premier tronçon qui n'est pas IF fait rejeter la table
    (« NON retenue »). Le nom est celui de la procédure d'approche (« RNAV RWY 07 ILSz »), la transition le point initial ; survol non lu (None)."""
    rows = [at_norm(r) for r in rows]
    warnings, tables, cur, name, rw = [], [], None, None, []
    for r in rows:
        m = re.search(r'(?i)(RNAV)\s+transition\s+coding\s+tables?\s*-\s*(RWY\s*(\d{2}[LRC]?))\s*(\S*)', r)
        if m:
            name, rw = re.sub(r'\s+', ' ', f'{m.group(1)} {m.group(2)} {m.group(4)}').strip(), [m.group(3)]
            continue
        t = re.match(r'(?i)^([A-Z]{3,5}|[A-Z]{2}\d{3})\s+transition\s*$', r.strip())
        if t:
            cur = {'trans': t.group(1).upper(), 'rows': []}
            tables.append(cur)
        elif cur is not None:
            if re.match(r'(?i)^(?:rnav\s+holding|airac|aip\b|@)', r.strip()):
                cur = None
            else:
                cur['rows'].append(r)
    out = []
    for t in tables:
        legs, bad = [], []
        for r in t['rows']:
            lg = GE_LEG.match(r.strip())
            if not lg:
                continue
            body = lg.group(3)
            lat, lon = at_dms(body), at_dms(body, True)
            rest = AT_LON.sub(' ', AT_LAT.sub(' ', body))
            true = re.search(r'\(\s*(\d{3}(?:\.\d+)?)', rest)
            mag = re.search(r'(?<![\d.(])(\d{3})\s*°', rest)
            toks = re.sub(r'\([^)]*\)', ' ', rest).split()
            decs = [float(x) for x in toks if re.fullmatch(r'\d{1,3}\.\d', x)]
            turn = next(({'left': 'L', 'right': 'R'}[x.lower()] for x in toks if x.lower() in ('left', 'right')), None)
            alt = next((a for a in (re.fullmatch(r'([+-]?)(A|FL)(\d{2,5})([+-]?)', x) for x in toks) if a), None)
            kt = next((k for k in (re.fullmatch(r'[+-](\d{3})', x) for x in toks) if k), None)
            tf = lg.group(1) == 'TF'
            if lat is None or lon is None:
                bad.append(f'{lg.group(2)}: coordonnées absentes')
            elif tf and (true is None or not decs):
                bad.append(f'{lg.group(2)}: tronçon TF sans cap vrai ou sans distance')
            sign = (alt.group(1) or alt.group(4)) if alt else ''
            legs.append({'id': lg.group(2), 'leg': lg.group(1), 'over': None,
                         'alt': {'type': {'+': 'min', '-': 'max', '': 'at'}[sign], 'ft': int(alt.group(3)) * (100 if alt.group(2) == 'FL' else 1)} if alt else None,
                         'kt': int(kt.group(1)) if kt else None, 'lat': lat, 'lon': lon, 'crs': int(mag.group(1)) if mag else None,
                         'true': float(true.group(1)) if true else None, 'nm': decs[-1] if tf and decs else None, 'turn': turn, 'seq': len(legs) + 1, 'remark': ''})
        label = f'{name or "RNAV"} {t["trans"]} transition'
        if bad or len(legs) < 2 or legs[0]['leg'] != 'IF':
            warnings.append(f'{label}: {len(legs)} tronçon(s) lu(s)' + (f' ({"; ".join(bad[:3])})' if bad else ', premier tronçon IF attendu') + ', table NON retenue')
            continue
        out.append({'title': label, 'kind': 'APP', 'name': name or 'RNAV', 'runways': list(rw), 'transition': t['trans'], 'legs': legs})
    return {'kind': 'APP', 'tables': out, 'warnings': warnings}


DE_DESIGNATOR = re.compile(r'^([A-Z]{3,5})\s?(\d[A-Z])(?:\s+(.+))?$')
DE_FIX = re.compile(r'^(?:/\S+\s+)?([A-Z]{3,5})$')
DE_NAVAID = re.compile(r'^(?:/\S+\s+)?(\S.*?\s+(NDB|VORDME|VOR|DME|LOC))$')
DE_LEG = re.compile(r'^(\d{3})\s+(\d+(?:\.\d+)?)(?:\s+(.*))?$')
DE_CONSTRAINT = re.compile(r'(FL(\d{2,3})|A(\d{3,5}))([+-]?)')
DE_ARROWS = '▲∆Δ△▼▽'
DE_GLYPH = re.compile(r'^(?:(?:/\S+|[' + DE_ARROWS + r'])\s+)+')       # jetons parasites en tête de ligne : « /g83 », « /L50773 », « ▲ »
DE_ROLE = re.compile(r'^(?:IAF|IF|FAF)(?:/(?:IAF|IF|FAF))*\s+')
DE_TYPE = re.compile(r'^(DVOR/DME|VOR/DME|VORDME|DVOR|VOR|DME|NDB|TACAN|REP)\s+')
DE_TRIPLE = re.compile(r'(?<![\w.])(\d{3})\s*°?\s+(?:(\d{3}(?:\.\d+)?)\s*°\s+)?(\d{1,3}(?:\.\d+)?)\s+([+-]?)(?:FL\s?(\d{2,3})|(\d{3,5}))(?:\s?(?:ft|FT))?(?![\w.])')


def _de_values(text, minimum=False):
    """Valeurs d'un tronçon lues dans un texte : cap magnétique (3 chiffres, « ° » facultatif), cap vrai « 008.4° » facultatif, distance, contrainte d'altitude (« 3500FT »,
    « +6000 ft », « +FL100 », « 4000 »), les remarques « Note … » exclues ; ou, si les nombres suivent la remarque (« 3500FT Note - … 078 126 »), les deux derniers nombres.
    → { crs, true, nm, alt } ou None. Une altitude sans signe vaut « min » quand l'en-tête de la page parle d'altitude minimale, sinon « at »."""
    head = re.split(r'\bNote\b', text, maxsplit=1)[0]
    m = DE_TRIPLE.search(head)
    if m:
        crs, true, nm, sign, fl, ft = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6)
    else:
        alt = re.search(r'(?<![\w.])(\d{3,5})\s?(?:FT|ft)\b', head)
        tail = re.search(r'(?<![\d.])(\d{3})\s+(\d{1,3}(?:\.\d+)?)\s*$', text)
        if not (alt and tail):
            return None
        crs, true, nm, sign, fl, ft = tail.group(1), None, tail.group(2), '', None, alt.group(1)
    kind = {'+': 'min', '-': 'max', '': 'min' if minimum else 'at'}[sign]
    return {'crs': int(crs), 'true': float(true) if true else None, 'nm': float(nm), 'alt': {'type': kind, 'ft': int(fl) * 100 if fl else int(ft)}}


def _de_row(r, items, minimum):
    """Range une ligne de la zone de table dans `items` : ('fix', identifiant, type de balise ou None, flèche) pour un point, ('leg', valeurs) pour un tronçon. Un point est : une ligne
    précédée de jetons parasites (« /g83 », « ▲ »), avec rôle « IAF / IF » et type « REP / DVOR/DME » facultatifs puis l'identifiant ; ou, sans jeton, un identifiant seul (3 à 5
    capitales) ou « nom NDB ». Un tronçon : « cap distance [contrainte] » ou des valeurs trouvées par `_de_values` sur une ligne qui commence par un nombre ; les valeurs qui
    suivent un identifiant sur la ligne d'un point sont lues aussi."""
    g = DE_GLYPH.match(r)
    if g:
        arrow = any(ch in g.group(0) for ch in DE_ARROWS)
        body = DE_ROLE.sub('', r[g.end():])
        tm = DE_TYPE.match(body)
        nav = tm.group(1) if tm else None
        body = DE_ROLE.sub('', body[tm.end():] if tm else body)
        nv = DE_NAVAID.match(body)
        if nv:
            items.append(('fix', nv.group(1), nv.group(2), arrow))
            return
        m = re.match(r'^([A-Z][A-Z0-9]{2,5})(?:\s+(.*))?$', body)
        if m:
            items.append(('fix', m.group(1), None if nav == 'REP' else nav, arrow))
            v = _de_values(m.group(2) or '', minimum)
            if v:
                items.append(('leg', v))
        return
    lg = DE_LEG.match(r)
    if lg:
        v = {'crs': int(lg.group(1)), 'true': None, 'nm': float(lg.group(2)), 'alt': None}
        c = DE_CONSTRAINT.search(lg.group(3) or '')
        if c:
            v['alt'] = {'type': {'+': 'min', '-': 'max', '': 'at'}[c.group(4)], 'ft': int(c.group(2)) * 100 if c.group(2) else int(c.group(3))}
        else:
            w = _de_values(r, minimum)
            v['alt'] = w['alt'] if w else None
        items.append(('leg', v))
        return
    fx, nv = DE_FIX.match(r), DE_NAVAID.match(r)
    if fx:
        items.append(('fix', fx.group(1), None, False))
    elif nv:
        items.append(('fix', nv.group(1), nv.group(2), False))
    elif r[:1].isdigit():
        v = _de_values(r, minimum)
        if v:
            items.append(('leg', v))


def parse_de_route(rows):
    """Page de routes SID / STAR décrites en texte, sans coordonnées → { kind, tables: [{ title, kind, name, runways, transition, legs }], warnings }. Trois familles de pages
    (vues le 28 octobre 2026) : l'Allemagne (« STANDARD INSTRUMENT ARRIVAL / DEPARTURE ROUTES » : une ligne « BEBEX 2T BEBEX TWO TANGO », puis en alternance un point
    « /L50773 Altenburg NDB » et un tronçon « cap distance [contrainte] »), la Moldavie (une ligne « ERADA1B ERADA ONE BRAVO », puis des lignes « /g85 ERADA 001° 008.4° 26.9 4000 » et
    « /g85 IAF BM301 »), le Portugal (« ▲ BEKUN », « BEKUN 3C 245 110 3500FT Note - … », « ▲ VSM », nombres parfois après la remarque) et la Pologne (« ▲ REP GOBNI -- +FL100 »,
    « ∆ REP RECEZ 222 9.82 +6000 ft », désignateur parfois au milieu du bloc). Lecture tolérante : dans un bloc on relève, dans l'ordre, les points puis, séparément, les triplets de valeurs
    (cap, distance, contrainte) où qu'ils soient ; le bloc n'est retenu que si points = tronçons + 1, sinon « NON retenue », jamais complété. Le bloc d'un désignateur imprimé APRÈS
    son premier point (Portugal, Pologne) commence à ce point (une flèche « ▲ » suivie du même identifiant). La page n'imprime AUCUNE coordonnée : lat / lon valent None (à résoudre
    par aerodb) ; le tronçon n porte les valeurs entre le point n et le point n + 1 et la contrainte est portée par son point d'arrivée."""
    warnings, kind, rw = [], None, []
    items, blocks, on = [], [], False
    minimum = any(re.search(r'(?i)minimum|mnm', r) and re.search(r'(?i)\balt', r) for r in rows)
    for r in (x.strip() for x in rows):
        up = r.upper()
        if kind is None and 'INSTRUMENT ARRIVAL ROUTES' in up:
            kind = 'STAR'
        elif kind is None and 'INSTRUMENT DEPARTURE ROUTES' in up:
            kind = 'SID'
        elif kind is None and not on and re.search(r'\(STAR\)|STANDARD (?:INSTRUMENT )?ARRIVAL|\bSTAR\b', up):
            kind = 'STAR'
        elif kind is None and not on and re.search(r'\(SID\)|STANDARD (?:INSTRUMENT )?DEPARTURE|\bSID\b', up):
            kind = 'SID'
        m = re.match(r'^RWY\s*(\d{2}[LRC]?(?:\s*/\s*\d{2}[LRC]?)*)', up)
        if m and not on:
            rw = [x.strip() for x in m.group(1).split('/')]
        elif not on and not rw:
            m = re.search(r'\b(?:RWY|RUNWAY)\s*(\d{2}[LRC]?(?:\s*/\s*\d{2}[LRC]?)*)', up)
            if m:
                rw = [x.strip() for x in m.group(1).split('/')]
        if re.search(r'significant', r, re.I) and re.search(r'designator|identification', r, re.I):
            on = True
            continue
        if not on:
            continue
        if re.search(r'\bAMDT\b', up) or '©' in r:
            on = False
            continue
        if re.fullmatch(r'\d{1,2}(?:\s+\d)*', r):                       # ligne de numérotation des colonnes « 12 3 4 5 6 »
            continue
        d = DE_DESIGNATOR.match(r)
        if d:
            blocks.append({'title': r, 'name': f'{d.group(1)} {d.group(2)}', 'ident': d.group(1), 'at': len(items)})
            if d.group(3):
                _de_row(d.group(3), items, minimum)
            continue
        _de_row(r, items, minimum)
    if kind is None:
        return {'kind': None, 'tables': [], 'warnings': ['type de la page non reconnu (ARRIVAL / DEPARTURE ROUTES): page NON lue']}
    starts = []
    for k, b in enumerate(blocks):                       # un désignateur imprimé après son premier point : le bloc commence à ce point (flèche, même identifiant)
        lo = starts[-1] if starts else 0
        late = [j for j in range(lo, b['at']) if items[j][0] == 'fix' and items[j][3] and items[j][1] == b['ident']]
        starts.append(late[-1] if late else b['at'])
    tables = []
    for k, b in enumerate(blocks):
        part = items[starts[k]:starts[k + 1] if k + 1 < len(blocks) else len(items)]
        fixes = [i for i in part if i[0] == 'fix']
        legs = [i[1] for i in part if i[0] == 'leg']
        if not fixes or len(fixes) != len(legs) + 1:
            warnings.append(f'{b["name"]}: {len(fixes)} point(s), {len(legs)} tronçon(s): comptes incohérents, table NON retenue')
            continue
        out = []
        for n, f in enumerate(fixes):
            g = legs[n - 1] if n else {'crs': None, 'true': None, 'nm': None, 'alt': None}
            out.append({'id': f[1], 'leg': 'IF' if n == 0 else 'TF', 'over': None, 'alt': g['alt'], 'kt': None, 'crs': g['crs'], 'true': g['true'], 'nm': g['nm'], 'turn': None,
                        'lat': None, 'lon': None, 'seq': n + 1, 'remark': '', 'navaid': f[2]})
        tables.append({'title': b['title'], 'kind': kind, 'name': b['name'], 'runways': list(rw), 'transition': None, 'legs': out})
    return {'kind': kind, 'tables': tables, 'warnings': warnings}


# ---------------------------------------------------------------------------------------------------------- « icao-tab » : table ICAO imprimée sans coordonnées
TAB_TITLE = re.compile(r'^([A-Z]{2,6}) ?(\d[A-Z])(?=\s|$|\()(.*)$')
TAB_NAVSPEC = re.compile(r'\s+((?:RNP|RNAV)\s*[A-Z0-9.]*(?:\s+(?:APCH|AR))?)\s*$')
TAB_COURSE = re.compile(r'(?<![\d.])(\d{3})\s*°?\s*\(\s*(\d{3}(?:\.\d+)?)\s*°?\s*\)')
TAB_NOMATCH = object()


def _tab_text(row):
    """Ligne normalisée d'une table ICAO : tirets de toute forme ramenés à « - », « FL 70 » joint, « 6.5 E » joint, « / » sans espaces."""
    row = re.sub('[' + DASHES + '−­]', '-', row)
    row = re.sub(r'\bFL\s+(\d)', r'FL\1', row)
    row = re.sub(r'(\d\.\d)\s+([EW])(?=\s|$)', r'\1\2', row)
    return ' '.join(re.sub(r'(?<=\S)\s+/\s+(?=\S)', '/', row).split())


def _tab_alt_part(tok):
    """((mini, maxi) en pieds) d'une cellule d'altitude simple « +FL110 » « -FL110 » « A7000+ » « F100+ » « 5000 » « +5000 » « -3000 », ou None si ce n'en est pas une."""
    m = re.fullmatch(r'([+-]?)(FL|F|A)?(\d{2,5})([+-]?)', tok)
    if not m or (m.group(1) and m.group(4)):
        return None
    pre, unit, digits, post = m.groups()
    if not unit and not (len(digits) >= 4 or (pre == '+' and len(digits) >= 3)):
        return None                                                    # « -230 » est une vitesse, « 10 » une variation
    if unit in ('FL', 'F') and len(digits) > 3:
        return None
    ft = int(digits) * 100 if unit in ('FL', 'F') else int(digits)
    sign = pre or post
    return (ft, None) if sign == '+' else (None, ft) if sign == '-' else (ft, ft)


def _tab_alt(tok):
    """Contrainte d'altitude (schéma commun) d'une cellule « -FL110/+FL080 », « A7000+ »… ; None pour un tiret ; TAB_NOMATCH si ce n'est pas une altitude."""
    if tok == '-':
        return None
    lo = hi = None
    for part in tok.split('/'):
        p = _tab_alt_part(part)
        if p is None:
            return TAB_NOMATCH
        lo = p[0] if p[0] is not None else lo
        hi = p[1] if p[1] is not None else hi
    if lo is not None and hi is not None:
        return {'type': 'at', 'ft': lo} if lo == hi else {'type': 'between', 'ft': min(lo, hi), 'ft2': max(lo, hi)}
    return {'type': 'min', 'ft': lo} if lo is not None else {'type': 'max', 'ft': hi}


def _tab_value(col, tok, is_if):
    """Valeur d'une cellule de la colonne `col` (None pour un tiret) ou TAB_NOMATCH si le jeton ne peut pas être de cette colonne. Sur un tronçon IF, cap, distance et virage ne portent que des tirets."""
    if tok == '-':
        return None
    if col == 'fly':
        return True if tok.upper() in ('Y', 'YES') else None if tok.upper() in ('N', 'NO') else TAB_NOMATCH
    if is_if and col in ('crs', 'dist', 'turn'):
        return TAB_NOMATCH
    if col == 'crs':
        return tok if tok == '@C' else TAB_NOMATCH
    if col == 'var':
        return float(re.sub('[EW]', '', tok)) if re.fullmatch(r'[+-]?\d{1,2}(?:\.\d)?[EW]?', tok) else TAB_NOMATCH
    if col == 'dist':
        return float(tok) if re.fullmatch(r'\d{1,3}(?:\.\d{1,2})?', tok) else TAB_NOMATCH
    if col == 'turn':
        return {'L': 'L', 'LEFT': 'L', 'R': 'R', 'RIGHT': 'R'}.get(tok.upper(), TAB_NOMATCH)
    if col == 'alt':
        return _tab_alt(tok)
    m = re.fullmatch(r'-(\d{2,3})|K(\d{2,3})[+-]?', tok)               # col == 'spd'
    return int(m.group(1) or m.group(2)) if m else TAB_NOMATCH


def _tab_assign(cols, toks, is_if):
    """Toutes les façons (dict valeurs → dict) d'affecter les jetons, dans l'ordre, à des colonnes distinctes (des colonnes peuvent rester vides) ; chacune sous forme de dict colonne → valeur (tirets omis).
    L'affectation est sûre si toutes les façons donnent les mêmes valeurs (un tiret n'en change aucune) ; sinon la ligne est ambiguë."""
    found = {}

    def walk(i, c, acc):
        if i == len(toks):
            found[repr(sorted((k, repr(v)) for k, v in acc.items() if v is not None))] = {k: v for k, v in acc.items() if v is not None}
            return
        for j in range(c, len(cols)):
            v = _tab_value(cols[j], toks[i], is_if)
            if v is not TAB_NOMATCH:
                walk(i + 1, j + 1, {**acc, cols[j]: v})
    walk(0, 0, {})
    return found


def _tab_row(line, cols):
    """Tronçon (dict du schéma commun, sans coordonnées) d'une ligne de table ICAO ; ValueError (message) si elle ne se découpe pas sans ambiguïté.
    Forme : [route] [numéro de série] terminaison point [sur-vol] [cap (cap vrai)] [variation] [distance] [virage] [altitude] [vitesse] [spécification de navigation]."""
    nav = TAB_NAVSPEC.search(line)
    if nav:
        line = line[:nav.start()]
    toks = line.split()
    j = next((k for k in range(min(3, len(toks) - 1)) if toks[k] in PATH_TERMINATORS and re.fullmatch(r'[A-Z0-9]{2,7}', toks[k + 1])), None)
    if j is None:
        raise ValueError('terminaison de chemin ou point introuvable')
    serial = next((int(t) for t in toks[:j] if re.fullmatch(r'\d{3}', t)), None)
    rest = ' '.join(toks[j + 2:])
    course = TAB_COURSE.findall(rest)
    if len(course) > 1:
        raise ValueError('deux caps sur la ligne')
    rest = TAB_COURSE.sub(' @C ', rest)
    is_if = toks[j] == 'IF'
    found = _tab_assign(cols, rest.split(), is_if)
    if len(found) != 1:
        raise ValueError('ligne ambiguë' if found else 'cellules illisibles')
    vals = next(iter(found.values()))
    got = vals.get
    over = got('fly')
    return {'id': toks[j + 1], 'leg': toks[j], 'over': True if over else None, 'alt': got('alt'), 'kt': got('spd'), 'lat': None, 'lon': None,
            'crs': int(course[0][0]) if course else None, 'true': float(course[0][1]) if course else None, 'nm': got('dist'), 'turn': got('turn'),
            'seq': serial, 'remark': '', 'nav': nav.group(1) if nav else None}


def _tab_kinds(text):
    """Types de procédure cités par un texte : STAR, SID ou approche (« RNP » / « RNAV » seuls ne comptent que si le texte ne cite ni STAR ni SID)."""
    up = text.upper()
    kinds = [k for k, rx in (('STAR', r'\b(STAR|ARRIVALS?)\b'), ('SID', r'\b(SID|DEPARTURES?)\b')) if re.search(rx, up)]
    if re.search(r'\b(APPROACH|APCH|IAC|ILS|LOC|VOR|NDB)\b', up) or (not kinds and re.search(r'\bRNP\b|\bRNAV\b', up)):
        kinds.append('APP')
    return kinds


def parse_icao_tab(rows, kind_hint=None):
    """Table ICAO « de description en tableau pour le codage de la base de données de navigation » imprimée dans l'AIP SANS coordonnées sur les lignes de tronçon (Islande, Lituanie, Croatie,
    Italie, Albanie, Philippines ; vue le 28 octobre 2026) → { kind: 'MIXED', tables: [{ title, kind, name, runways, transition, legs }], warnings }. Un bloc = une ligne seule « NOM 1M »
    (désignateur), un en-tête sur 2 ou 3 lignes, puis un tronçon par ligne : [route] [série] terminaison point [sur-vol] [cap (cap vrai)] [variation] [distance] [virage] [altitude] [vitesse]
    [spécification]. Les colonnes présentes viennent de l'en-tête ; chaque cellule est lue par son type et son rang, une ligne qui se découpe de plusieurs façons différentes est ambiguë et
    rejette le bloc (« NON retenue »), jamais devinée. lat / lon valent None : aerodb les résout par la liste des points. Type : titre du bloc, sinon titre de la page, sinon `kind_hint`
    (type lu sur la page précédente du même document, que build_pdf_dir transmet : le mot STAR / SID n'est imprimé qu'à la première page) ; pistes : « RWY nn »."""
    warnings, tables, blocks, cur = [], [], [], None
    pre = []
    rows = [_tab_text(r) for r in rows]
    for i, r in enumerate(rows):
        is_row = lambda x: any(t in PATH_TERMINATORS for t in x.split()[:3]) and len(x.split()) >= 3 and _tab_start(x)
        m = TAB_TITLE.match(r)
        title = False
        if m and ',' not in r and not is_row(r):
            for x in rows[i + 1:i + 7]:
                if is_row(x) or TAB_TITLE.match(x):
                    break
                if re.search(r'(?i)\bserial\b|\bpath\b|\bterminator\b|\bdescriptor\b|\bwaypoint\b', x):
                    title = True
                    break
        if title:
            cur = {'title': r, 'name': f'{m.group(1)} {m.group(2)}', 'head': [], 'rows': [], 'open': True}
            blocks.append(cur)
        elif cur is None:
            pre.append(r)
        elif cur['open']:
            if is_row(r):
                cur['rows'].append(r)
            elif cur['rows']:
                cur['open'] = False
            else:
                cur['head'].append(r)
    page_kinds = _tab_kinds(' '.join(pre))
    page_rw = list(dict.fromkeys(re.findall(r'\bRWY ?(\d{2}[LRC]?)\b', ' '.join(pre).upper())))
    for b in blocks:
        head = ' '.join(b['head']).lower()
        cols = [c for c, w in (('fly', 'fly'), ('crs', ''), ('var', 'variation'), ('dist', ''), ('turn', 'turn'), ('alt', ''), ('spd', 'speed')) if not w or w in head]
        kinds = _tab_kinds(b['title']) or (page_kinds if len(page_kinds) == 1 else []) or ([kind_hint] if kind_hint else [])
        rw = list(dict.fromkeys(re.findall(r'\bRWY ?(\d{2}[LRC]?)\b', b['title'].upper()))) or page_rw
        legs, bad = [], []
        for n, line in enumerate(b['rows']):
            try:
                lg = _tab_row(line, cols)
                lg['seq'] = lg['seq'] if lg['seq'] is not None else n + 1
                legs.append(lg)
            except ValueError as e:
                bad.append(f'{e} ({line[:40]})')
        seqs = [lg['seq'] for lg in legs]
        if len(kinds) != 1:
            bad.append('type de procédure (STAR, SID, approche) introuvable ou ambigu')
        if not b['rows']:
            bad.append('aucune ligne de tronçon')
        if seqs != sorted(set(seqs)):
            bad.append('numéros de série non croissants')
        if bad:
            warnings.append(f'{b["name"]}: {len(legs)}/{len(b["rows"])} tronçon(s) lu(s) ({"; ".join(bad[:3])}), table NON retenue')
            continue
        tables.append({'title': b['title'], 'kind': kinds[0], 'name': b['name'], 'runways': rw, 'transition': None, 'legs': legs})
    return {'kind': 'MIXED', 'tables': tables, 'warnings': warnings}


def _tab_start(line):
    """Vrai si la ligne commence par [route] [série] puis une terminaison de chemin suivie d'un point (forme d'un tronçon)."""
    toks = line.split()
    return any(toks[k] in PATH_TERMINATORS and re.fullmatch(r'[A-Z0-9]{2,7}', toks[k + 1]) and all(re.fullmatch(r'[A-Z0-9]+', t) for t in toks[:k])
               for k in range(min(3, len(toks) - 1)))


# ---------------------------------------------------------------------------------------------------------- « ei-coding » : table de codage irlandaise sur une ligne
EI_SHORT = re.compile(r'^[A-Z]{2,6} ?\d[A-Z]$')
EI_CAT = re.compile(r'^(.+?)\s*CAT\s+[A-D](?:\s*/\s*[A-D])*\s+(.+)$')                       # « ABIDO1B CAT A/B SID RWY28L », « KERAV 1T INITIAL APPROACH CAT A/B/C/D ILS RWY16 »
EI_SHORT_TITLE = re.compile(r'^[A-Z]{3,6} ?\d[A-Z]\s+(?:STAR|SID)\s+RWY\b')                 # « NIMAT 4L STAR RWY 28L/R » (sans CAT), suivi du désignateur court
EI_APP_TITLE = re.compile(r'^(?=.*\bRWY ?\d{2})(?=.*\b(?:RNP|ILS|VOR|LOC|APP|APPROACH)\b)[^/]{6,90}$')       # « Dublin RNP RWY 28L via DUB », « KERAV 1T RWY16 VOR » : suivi d'un en-tête
EI_NAV = r'R(?:NAV|NP)\s*(?:\d+(?:\.\d+)?|APCH|AR)?'
EI_NAME = r'[A-Z0-9]{2,7}(?: [A-Z0-9]{1,4})?'          # un nom que la couche de texte a coupé (« DW0 24 ») : admis seulement s'il est confirmé (parse_ei_coding)
EI_COORD = r'(?P<la>\d(?:\s?\d){5}(?:\.\d+)?)\s*(?P<lah>[NS])?\s*/\s*(?P<lo>\d(?:\s?\d){6}(?:\.\d+)?)\s*(?P<loh>[EW])?'
EI_ROW_A = re.compile(r'^(?P<nav>' + EI_NAV + r')\s+(?P<term>[A-Z]{2})\s+(?P<name>' + EI_NAME + r')\s+' + EI_COORD + r'\s+(?P<rest>.*)$')           # 28 octobre : nav, TERMINAISON, nom, lat / lon, …
EI_ROW_B = re.compile(r'^(?P<nav>' + EI_NAV + r')\s+(?P<name>' + EI_NAME + r'|-)\s+(?:' + EI_COORD + r'|-)\s+(?P<term>[A-Z]{2})\s+(?P<rest>.*)$')        # Dublin : nav, nom, lat / lon (ou « - »), TERMINAISON, …
EI_NUM = r'\d(?:\s?\d){2,3}'                                                                 # 750, 3000, « 4 000 », « 30 00 », « 600 0 » (3 ou 4 chiffres : 5 avalerait les chiffres de la vitesse)
EI_LIMV = r'(?:(?:[+-]\s?)?(?:A\s?' + EI_NUM + r'|FL\s?\d(?:\s?\d){1,2})|\+\s?' + EI_NUM + r'|' + EI_NUM + r')(?:\s?\+)?'       # « A 4000 », « +A3000 », « -FL100 », « A750 + », « FL 19 0 », « 6000 »
EI_FLY = r'(?i:(?P<over>Fly ?- ?Over)|Fly ?- ?By|-)'
EI_TRK = r'(?:(?P<true>\d(?:\s?\d){2}(?:\.\d+)?)\s*/\s*(?P<mag>\d(?:\s?\d){2})|-(?:\s*/\s*-)?)'     # cap vrai / cap magnétique (chiffres parfois séparés), ou « - »
EI_DIST = r'(?P<nm>\d(?:\s?\d){0,2}(?:\.\d+)?|-)'                                           # « 9.7 », « 31.5 », « 1 0.6 » (chiffres séparés)
EI_LIMS = r'(?:(?P<up>' + EI_LIMV + r'|-)\s*/\s*(?P<lw>' + EI_LIMV + r'|-)|-)'               # limite supérieure / limite inférieure
EI_END = r'\s+' + EI_LIMS + r'(?:\s+(?P<spd>\d(?:\s?\d){1,2}|-)|(?=\s+Turn\b|$))'          # la vitesse manque quand le texte a perdu le dernier tiret avant « Turn L » ou la fin de ligne
EI_VPA = r'(?:\s+(?:(?P<vpa>\d+(?:\.\d+)?)\s*/\s*(?P<tch>\d+|-)|-)(?=\s|$))?'                 # angle vertical / hauteur de franchissement (pages RNP et ILS)
EI_REM = r'(?:\s+(?P<rem>.*))?$'
EI_TAILS = {(order, vpa): re.compile('^' + EI_FLY + r'\s+' + (EI_DIST + r'\s+' + EI_TRK if order == 'A' else EI_TRK + r'\s+' + EI_DIST) + EI_END + (EI_VPA if vpa else '') + EI_REM)
            for order in 'AB' for vpa in (True, False)}
EI_STOP = re.compile(r'^(?:Hold(?:ing)? Identification|Descent Angle|Fix Coordinates|SBAS FAS|AIRAC Amdt)', re.I)
EI_KINDS = (('STAR', r'\bSTAR\b'), ('SID', r'\bSID\b'), ('APP', r'\b(?:APP|APPROACH|IAP|IAC)\b'))


def _ei_deg(digits, hemi, lon):
    """« 0074918.3 » (chiffres éventuellement séparés) et hémisphère → degrés décimaux."""
    s = re.sub(r'\s', '', digits)
    d = 3 if lon else 2
    v = int(s[:d]) + int(s[d:d + 2]) / 60 + float(s[d + 2:]) / 3600
    return round(-v if hemi in ('S', 'W') else v, 6)


def _ei_is_row(line):
    """Vrai si la ligne commence par une spécification de navigation (RNAV 1, RNAV1, RNP APCH…) et porte au moins quatre mots : une ligne de tronçon."""
    return bool(re.match(r'^R(?:NAV|NP)(?![A-Z])', line)) and len(line.split()) >= 4


def _ei_runways(text):
    """Pistes d'un titre : « RWY28L », « RWY 10 L », « RWY 28L/R » (28L et 28R)."""
    out = []
    for m in re.finditer(r'\bRWY\s?(\d{2})\s?([LRC])?((?:\s?/\s?[LRC])*)\b', text.upper()):
        out += [m.group(1) + s for s in [m.group(2) or ''] + re.findall(r'[LRC]', m.group(3))]
    return list(dict.fromkeys(out))


def _ei_title(lines, i):
    """Titre de bloc à la ligne i : { title, name, kinds, runways } ou None. Trois formes : « ABIDO1B CAT A/B SID RWY28L » puis le désignateur court (le nom est ce désignateur) ;
    « NIMAT 4L STAR RWY 28L/R » (sans CAT) puis le désignateur court ; un titre d'approche suivi d'un en-tête (« KERAV 1T INITIAL APPROACH CAT A/B/C/D ILS RWY16 », « Dublin RNP RWY 28L via DUB »,
    « KERAV 1T RWY16 VOR »), dont le nom est le titre sans « CAT … » ni nom de terrain. Une approche interrompue seule (« MISSED APP ») a le type 'MISSED' : elle n'est pas une procédure."""
    r = lines[i]
    if _ei_is_row(r) or len(r) > 140:
        return None
    nxt = lines[i + 1] if i + 1 < len(lines) else ''
    kinds_of = lambda t: [k for k, rx in EI_KINDS if re.search(rx, t.upper())]
    cat = EI_CAT.match(r)
    if (cat or EI_SHORT_TITLE.match(r)) and EI_SHORT.match(nxt):                        # départ ou arrivée : titre, puis désignateur court
        return {'title': r, 'name': nxt, 'kinds': kinds_of(r), 'runways': _ei_runways(r)}
    if (cat or EI_APP_TITLE.match(r)) and not EI_SHORT.match(nxt) and any(re.search(r'Latitude|WPT|Nav\.', x) for x in lines[i + 1:i + 6]):
        name = re.sub(r'\s+', ' ', re.sub(r'\s*CAT\s+[A-D](?:\s*/\s*[A-D])*', ' ', r)).strip()
        name = re.sub(r'^[A-Z][a-z]+ (?=[A-Z])', '', name)                              # « Dublin RNP RWY 28L via DUB » → « RNP RWY 28L via DUB »
        return {'title': r, 'name': name, 'kinds': ['MISSED'] if 'MISSED APP' in r.upper() else ['APP'], 'runways': _ei_runways(r)}
    return None


def _ei_lines(rows):
    """Lignes d'une page irlandaise remises d'aplomb : tirets et « T F » normalisés, chiffres décimaux recollés (« 3 . 7 », « 0054744. 1 »), « R NAV » rejoint, trio « RNP / ligne / APCH » (la
    spécification de navigation coupée au-dessus et au-dessous de la ligne) rejoint en une ligne. Le texte de la page peut aussi venir À L'ENVERS (pages de STAR de Dublin : les lignes de chaque
    bloc d'abord, puis son en-tête, son désignateur court et son titre) : si une ligne de tronçon précède le premier titre, l'ordre de toute la page est inversé."""
    out = [' '.join(re.sub('[' + DASHES + ']', '-', x).replace('T F', 'TF').split()) for x in rows]
    out = [re.sub(r'(?<=\d)\s*\.\s*(?=\d)', '.', re.sub(r'^R NAV\b', 'RNAV', x)) for x in out]
    merged, i = [], 0
    while i < len(out):
        if out[i] == 'RNP' and i + 2 < len(out) and out[i + 2] in ('APCH', 'AR'):
            merged.append(f'RNP {out[i + 2]} {out[i + 1]}')
            i += 3
        else:
            merged.append(out[i])
            i += 1
    titled = lambda ls: next((k for k in range(len(ls)) if _ei_title(ls, k)), None)
    first_row = lambda ls: next((k for k, x in enumerate(ls) if _ei_is_row(x)), None)
    straight = lambda ls: titled(ls) is not None and (first_row(ls) is None or titled(ls) < first_row(ls))
    return merged[::-1] if not straight(merged) and straight(merged[::-1]) else merged


def _ei_cells(line, vpa):
    """Une ligne de tronçon → dict des cellules (texte brut), ou (None, motif). Deux ordres de colonnes, reconnus à la ligne elle-même : A (28 octobre) « RNAV 1 TF GIVOL lat / lon Fly - By distance
    cap / cap magnétique limites vitesse remarques » ; B (Dublin, 29 octobre) « RNAV1 GIVOL lat / lon TF Fly - By cap / cap magnétique distance limites vitesse [angle / hauteur] remarques »,
    la première ligne d'un départ sans point (« RNAV1 RWY28 - CA … ») ayant « - » pour coordonnées. La terminaison est avant le nom (A) ou après les coordonnées (B) : une ligne que les deux
    motifs liraient est ambiguë, de même qu'une ligne dont la fin se lirait de deux façons (distance et cap permutés) : elle n'est pas lue."""
    a, b = EI_ROW_A.match(line), EI_ROW_B.match(line)
    a = a if a and a.group('term') in PATH_TERMINATORS else None
    b = b if b and b.group('term') in PATH_TERMINATORS else None
    if a and b:
        return None, 'ligne ambiguë (deux ordres de colonnes lisibles)'
    head = a or b
    if not head:
        return None, 'ligne illisible'
    reads = [t.groupdict() for t in (EI_TAILS[(o, vpa)].match(head.group('rest').strip()) for o in ('A', 'B')) if t]
    if not reads:
        return None, 'cellules illisibles'
    if any(r != reads[0] for r in reads):
        return None, 'cellules ambiguës (distance et cap lisibles dans les deux ordres)'
    return {**head.groupdict(), **reads[0]}, None


def _ei_limit(cell, column):
    """Une limite « A 4000 », « +A3000 », « -FL100 », « A750 + », « FL080 », « 6000 » → ('FL100' | '4000', ou None si « - » ou absente). Le signe (+ à partir de, - jusqu'à) doit être celui de la
    colonne (limite supérieure : -, inférieure : +) ; un signe contraire lève ValueError (ligne non lue)."""
    s = re.sub(r'\s', '', cell or '-')
    if s == '-':
        return None
    sign = '+' if '+' in s else '-' if s.startswith('-') else ''
    if sign and sign != ('-' if column == 'up' else '+'):
        raise ValueError(f'signe {sign} dans la colonne {"supérieure" if column == "up" else "inférieure"}')
    s = s.replace('+', '').replace('-', '')
    v = re.sub(r'^A', '', s)
    if not (v.startswith('FL') and int(v[2:]) % 5 == 0 or v.isdigit() and int(v) % 50 == 0):      # 750, 3000, FL190 : une valeur qui n'est pas un palier courant est un chiffre avalé ou perdu, pas lue
        raise ValueError(f'limite invraisemblable: {cell.strip()}')
    return v


def ei_names(rows):
    """{ (lat, lon): {noms} } des lignes de tronçon d'une page irlandaise dont le nom n'est PAS coupé : de quoi confirmer un nom que la couche de texte a coupé (« DW0 24 » = DW024 si les
    mêmes coordonnées portent ailleurs « DW024 »). Les pages du terrain se confirment entre elles ; un point renommé d'un cycle à l'autre (DW024 devenu ATGOW) a les deux noms."""
    out = {}
    for line in _ei_lines(rows):
        if _ei_is_row(line):
            c = _ei_cells(line, False)[0] or _ei_cells(line, True)[0]
            if c and c.get('la') and ' ' not in c['name']:
                out.setdefault((_ei_deg(c['la'], 'N', False), _ei_deg(c['lo'], 'E', True)), set()).add(c['name'])
    return out


def parse_ei_coding(rows, known=None):
    """Tables de codage de l'Irlande (vues le 28 octobre 2026, puis à Dublin le 29) : un tronçon par ligne, avec ses coordonnées → { kind: 'MIXED', tables: [{ title, kind, name, runways,
    transition, legs }], warnings }. Deux ordres de colonnes (voir _ei_cells) ; blocs « ABIDO1B CAT A/B SID RWY28L » + désignateur court, « NIMAT 4L STAR RWY 28L/R » (page à l'envers), titres
    d'approche (voir _ei_title) ; un en-tête sur 2 ou 3 lignes (hémisphères dans « Latitude (N), Longitude (W) », colonne « VPA » pour les pages RNP et ILS). Les groupes de chiffres éclatés
    d'une coordonnée ou d'un cap sont rejoints (un cap vrai / magnétique, une distance et des coordonnées sont ensuite contrôlés par proc_geometry). Limite supérieure = maximum, inférieure =
    minimum, égales = à l'altitude (« A750 + » : au moins 750 ft). La première ligne d'un départ « RWY28 - CA » est un tronçon sans point : id None, cap de la piste, altitude. « Turn L / R » (ou « L »,
    « R » seul) des remarques = virage vers ce tronçon. Un nom coupé (« DW0 24 ») n'est lu que si les mêmes coordonnées portent ailleurs, non coupé, le même nom (`known` : { (lat, lon): nom } des
    autres pages ; la page elle-même sert aussi) ; sinon, comme toute ligne illisible, ambiguë ou contraire à elle-même (signe d'une limite, piste du CA différente du titre), elle rejette le
    bloc (« NON retenue »). Une ligne de tronçon hors de tout bloc titré, ou un bloc d'approche interrompue seul (qui ne forme pas une procédure), est signalé."""
    warnings, tables, blocks, cur, orphans = [], [], [], None, 0
    lines = _ei_lines(rows)
    twins = {k: set(v) for k, v in (known or {}).items()}
    for k, v in ei_names(rows).items():
        twins.setdefault(k, set()).update(v)
    for i, r in enumerate(lines):
        t = _ei_title(lines, i)
        if t:
            cur = {**t, 'head': [], 'rows': [], 'open': True}
            blocks.append(cur)
        elif _ei_is_row(r):
            if cur is not None and cur['open']:
                cur['rows'].append(r)
            else:
                orphans += 1
        elif EI_STOP.match(r):
            if cur is not None:
                cur['open'] = False
        elif cur is not None and cur['open'] and not cur['rows'] and not EI_SHORT.match(r):
            cur['head'].append(r)
    if orphans:
        warnings.append(f'{orphans} ligne(s) de tronçon hors d\'un bloc titré, NON retenue(s)')
    for b in blocks:
        head = ' '.join(b['head'])
        hs = re.search(r'Latitude \(([NS])\)', head)
        hw = re.search(r'Longitude \(([EW])\)', head)
        vpa = bool(re.search(r'\bVPA\b', head))
        legs, bad, partial = [], [], []
        if b['kinds'] == ['MISSED']:
            warnings.append(f'{b["title"][:60]}: approche interrompue seule, non lue (elle n\'est pas rattachée à une approche)')
            continue
        for n, line in enumerate(b['rows']):
            c, why = _ei_cells(line, vpa)
            if not c:
                bad.append(f'{why} ({line[:40]})')
                continue
            try:
                name = c['name']
                fixless = c['la'] is None
                if name == '-' and not fixless:
                    raise ValueError('coordonnées sans nom')
                if ' ' in name:
                    if name.replace(' ', '') not in twins.get((_ei_deg(c['la'], 'N', False), _ei_deg(c['lo'], 'E', True)), ()):
                        raise ValueError(f'nom coupé non confirmé: {name}')
                    name = name.replace(' ', '')
                rw = re.fullmatch(r'RWY(\d{2})', name)
                if fixless and c['term'] not in FIXLESS:
                    raise ValueError(f'{name}: tronçon {c["term"]} sans coordonnées')
                if fixless and rw and rw.group(1) not in {x[:2] for x in b['runways']}:
                    raise ValueError(f'{name}: piste différente de celle du titre')
                if not fixless:
                    if not (hs or c['lah']) or not (hw or c['loh']):
                        raise ValueError('hémisphères non lus')
                    lat = _ei_deg(c['la'], c['lah'] or hs.group(1), False)
                    lon = _ei_deg(c['lo'], c['loh'] or hw.group(1), True)
                else:
                    lat = lon = None
                up, lw = _ei_limit(c['up'], 'up'), _ei_limit(c['lw'], 'lw')
                nm = None if c['nm'] in (None, '-') else float(re.sub(r'\s', '', c['nm']))
                true = float(re.sub(r'\s', '', c['true'])) if c['true'] else None
                crs = round(float(re.sub(r'\s', '', c['mag']))) if c['mag'] else None
                rem = (c['rem'] or '').strip('- ')[:40]
                turn = re.search(r'\bTurn\s*([LR])\b', rem)
                turn = turn.group(1) if turn else rem if rem in ('L', 'R') else None
                if c['term'] == 'TF' and n and (nm is None or true is None):
                    raise ValueError(f'{name}: tronçon TF sans distance ou sans cap')
                if c['spd'] is None:
                    partial.append(name if not fixless else c['term'])
                legs.append({'id': None if fixless else name, 'leg': c['term'], 'over': True if c['over'] else None, 'alt': alt_constraint(lw, up),
                             'kt': None if c['spd'] in (None, '-') else int(re.sub(r'\s', '', c['spd'])), 'lat': lat, 'lon': lon, 'crs': crs, 'true': true, 'nm': nm,
                             'turn': turn, 'seq': n + 1, 'remark': rem, 'nav': c['nav'], **({'vpa': -abs(float(c['vpa']))} if c.get('vpa') else {})})
            except ValueError as e:
                bad.append(f'{e} ({line[:40]})')
        if len(b['kinds']) != 1:
            bad.append('type de procédure introuvable ou ambigu')
        if not b['rows']:
            bad.append('aucune ligne de tronçon')
        if bad:
            warnings.append(f'{b["name"]}: {len(legs)}/{len(b["rows"])} tronçon(s) lu(s) ({"; ".join(bad[:3])}), table NON retenue')
            continue
        if partial:
            warnings.append(f'{b["name"]}: colonne de vitesse absente de la ligne de {", ".join(partial)} (cellule perdue par le texte de la page), vitesse non lue')
        tables.append({'title': b['title'], 'kind': b['kinds'][0], 'name': b['name'], 'runways': b['runways'], 'transition': None, 'legs': legs})
    return {'kind': 'MIXED', 'tables': tables, 'warnings': warnings}


# ---------------------------------------------------------------------------------------------------------- normalisation des lignes lues par OCR
def normalize_uk_app(rows):
    """Lignes OCR d'une page « uk-app » remises dans la forme que lit parse_uk_app (celle de pypdf). L'OCR ne rend pas la page comme le texte : les tirets des cellules vides
    sont perdus, le « Y » de survol aussi parfois, le numéro de séquence peut manquer, et la latitude et le cap magnétique sont sur la ligne du tronçon (pypdf les met sur la ligne
    d'avant). Chaque ligne de tronçon devient donc « cap° latitude » (ligne d'avant) puis « désignateur séquence type point survol - - altitude - remarque » ; un numéro absent
    est celui du tronçon précédent plus 1. Les autres lignes (en-têtes, longitude, cap vrai) sont gardées ; un « o » pris pour un zéro dans « RWY o9L » est corrigé."""
    leg = re.compile(r'^([A-Z]\d{2}[LRC]?)\s+(?:(\d{3})\s+)?([A-Z]{2})\s+(\S+)\s*(.*)$')
    out, last = [], {}
    for r in rows:
        r = re.sub(r'\bRWY\s*[oO](\d)', r'RWY 0\1', r)
        m = leg.match(r)
        if not m or m.group(3) not in PATH_TERMINATORS:
            out.append(r)
            continue
        des, tc, name = m.group(1), m.group(3), m.group(4)
        seq = int(m.group(2)) if m.group(2) else last.get(des, 0) + 1
        last[des] = seq
        rest = m.group(5)
        lat = UK_LAT.search(rest)
        crs = re.search(r'(\d{3})\s*[°º]', rest)
        before = ' '.join(x for x in (crs.group(0) if crs else '', lat.group(0) if lat else '') if x)
        for cut in (lat, crs):
            if cut:
                rest = rest.replace(cut.group(0), ' ', 1)
        toks = rest.split()
        over = bool(toks) and toks[0] == 'Y'
        if over:
            toks = toks[1:]
        toks = [t for t in toks if t != '-']
        k = next((i for i, t in enumerate(toks) if uk_constraint(t)), None)
        level = toks.pop(k) if k is not None else '-'
        if before:
            out.append(before)
        out.append(' '.join([des, f'{seq:03d}', tc, name, 'Y' if over else '-', '-', '-', level, '-'] + toks))
    return out


_COORD_CELL = re.compile(r'^(?:[NSEW][\dOoIl]{6,7}(?:\.[\dOoIl]+)?|[\dOoIl]{6,7}(?:\.[\dOoIl]+)?[NSEW])$')


def fix_numeric_cells(rows):
    """Coordonnées dont l'OCR a pris un chiffre pour une lettre (« o » ou « O » pour 0, « I » ou « l » pour 1) : corrigées, et seulement dans les cellules qui ont la forme d'une
    coordonnée (hémisphère devant ou derrière, 6 ou 7 chiffres) ; rien d'autre n'est touché."""
    def fix(tok):
        if not _COORD_CELL.match(tok):
            return tok
        h = tok[0] if tok[0] in 'NSEW' else ''
        t = tok[len(h):]
        t2 = t[:-1] if t[-1:] in ('N', 'S', 'E', 'W') else t
        tail = t[len(t2):]
        return h + t2.translate(str.maketrans('OoIl', '0011')) + tail
    return [' '.join(fix(t) for t in r.split()) for r in rows]


def normalize_uk_star(rows):
    """Lignes OCR d'une page « uk-star » (tables de codage des STAR du Royaume-Uni) remises dans la forme que lit parse_uk_star : coordonnées corrigées (fix_numeric_cells), numéro
    de séquence manquant d'une ligne de tronçon rétabli (celui du tronçon précédent du même désignateur plus 1). L'OCR garde ici les trois lignes par tronçon (latitude, tronçon,
    longitude) : rien d'autre à réordonner."""
    leg = re.compile(r'^([A-Z]{3,5}\d[A-Z])\s+(?:(\d{3})\s+)?([A-Z]{2})\s+(\S.*)$')
    out, last = [], {}
    for r in fix_numeric_cells(rows):
        m = leg.match(r)
        if m and m.group(3) in PATH_TERMINATORS:
            seq = int(m.group(2)) if m.group(2) else last.get(m.group(1), 0) + 1
            last[m.group(1)] = seq
            r = f'{m.group(1)} {seq:03d} {m.group(3)} {m.group(4)}'
        out.append(r)
    return out


def normalize_at_coding(rows):
    """Lignes OCR d'une page « at-coding » (tables de codage des transitions RNAV d'Autriche) : coordonnées corrigées (fix_numeric_cells) ; la forme à trois lignes par tronçon
    est déjà celle que lit parse_at_coding."""
    return fix_numeric_cells(rows)


def normalize_be_coding(rows):
    """Lignes OCR d'une page « be-coding » (carte IAC belge, codage ARINC) : les identifiants « BE123 » et « RW22R » dont l'OCR a pris un chiffre pour une lettre (« O » pour 0, « I » ou
    « l » pour 1) sont corrigés, dans la liste des coordonnées comme sur les lignes de tronçon ; rien d'autre n'est touché."""
    def fix(tok):
        m = re.fullmatch(r'(BE|RW)([\dOIl]{2,3})([LRC]?)(:?)(.*)', tok)
        if not m or not re.search(r'\d', m.group(2)) and m.group(1) == 'BE':
            return tok
        return m.group(1) + m.group(2).translate(str.maketrans('OIl', '011')) + m.group(3) + m.group(4) + m.group(5)
    return [' '.join(fix(t) for t in r.split()) for r in rows]


def normalize_ge_coding(rows):
    """Lignes OCR d'une page « ge-coding » (Géorgie) : les secondes d'arc rendues « '' » ou « ” » (au lieu de « " ») sont ramenées à « " » pour que les coordonnées se lisent."""
    return [re.sub(r"(?<=\d)\s*(?:''|[”″’]{1,2})\s*(?=[NSEW]\b)", '"', r) for r in rows]


# ---------------------------------------------------------------------------------------------------------- les dispositions : UNE liste ordonnée
# Une page « CODE » est reconnue par sa disposition, dans CET ordre (le premier qui reconnaît la page gagne) : uk-star avant uk-app, at-coding et be-coding avant sia-code, icao-tab avant
# de-route. Chaque entrée porte tout ce que la disposition demande : sa reconnaissance (`detect`), son analyseur (`read`), les empreintes d'en-tête déjà vues (`fingerprints` :
# une autre est signalée « en-tête inconnu », pas bloquante), ce que l'OCR doit corriger avant de la lire (`ocr_normaliser`), si l'OCR sait la lire (`ocr_readable` : chaque tronçon porte ou
# retrouve ses coordonnées dans la page), ce que la source imprime pour le contrôle de géométrie (`tolerances` : clé de proc_geometry.TOLERANCES, « true » ou « magnetic ») et ce que
# l'analyseur reprend des autres pages du document (`kind_hint` : le type SID / STAR / APP lu à la page précédente ; `known_names` : les noms coupés confirmés d'une page à l'autre).
# `tolerances` sert aussi de REPLI : un tronçon qui n'imprime ni cap vrai ni cap magnétique, seulement une distance, est jugé à la tolérance de sa disposition (proc_geometry.check_legs).
# `positions` : « required » quand la page doit donner la position de chaque point (la liste de la carte belge : un point absent, après les listes des autres documents, est un doute « unresolved » et
# non plus un bloc refusé) ; « deferred » sinon (aerodb résout encore les points en route à la lecture).
# `read` vaut None pour sia-code : la table du SIA est lue par proc_sia.parse_code_table (un tableau à groupes, pas une liste de tables).
Layout = namedtuple('Layout', 'name detect read fingerprints ocr_normaliser ocr_readable tolerances kind_hint known_names positions',
                    defaults=(None, None, frozenset(), None, False, 'true', False, False, 'deferred'))


def _view(rows):
    text = ' '.join(rows)
    return text, text.lower()


def _detect_uk_star(rows):
    low = _view(rows)[1]
    # Royaume-Uni : tables de codage des STAR (dessinées en vecteurs, lues par OCR)
    return ('arrival coding tables' in low or 'standard instrument arrival' in low and 'coding' in low) and 'designator' in low and 'sequence' in low and 'co-ordinates' in low


def _detect_at_coding(rows):
    low = _view(rows)[1]
    # Autriche : tables de codage des transitions RNAV (OCR) ; Slovaquie : « RNAV 1 STAR Coding Table: <désignateur> » (avant 'sia-code')
    return ('transition coding table' in low and 'designator' in low and 'path' in low and 'terminator' in low) \
        or bool(re.search(r'rnav\s*\d\s+(?:star|sid)\s+coding\s+table\s*:', low) and 'path' in low and 'terminator' in low)


def _detect_be_coding(rows):
    low = _view(rows)[1]
    # Belgique : carte IAC « ARINC CODING » (vecteurs, OCR) : liste de points puis tronçons
    return 'waypoints coordinates' in low and 'role of the' in low and 'terminator' in low


def _detect_ge_coding(rows):
    low = _view(rows)[1]
    # Géorgie : une table par transition (OCR)
    return bool(re.search(r'transition coding tables?\s*-\s*rwy', low)) and 'identifier' in low and 'terminator' in low and 'designator' not in low


def _detect_am_coding(rows):
    low = _view(rows)[1]
    # Arménie : tables par procédure, cellules éclatées
    return 'coding table of' in low and 'designator' in low and 'route' in low and 'terminator' in low and 'coordinates' in low


def _detect_ei_coding(rows):
    text, low = _view(rows)
    words = set(re.findall(r'[a-z]+', low))
    # Irlande : tableau sur une ligne avec coordonnées (« Mag track » à Dublin, « Magnetic track » ailleurs ; « Term » ou « Terminator »)
    return {'path', 'latitude', 'longitude', 'name', 'upper', 'lower', 'speed', 'limit', 'true', 'track'} <= words and ('wpt' in words or 'w pt' in low) and ({'terminator', 'term', 'descriptor'} & words) \
        and ({'mag', 'magnetic'} & words) and bool(re.search(r'fly\s*-\s*by', low)) \
        and bool(re.search(r'\d(?:\s?\d){5}(?:\s*\.\s*\d+)?\s*[NS]?\s*/\s*\d(?:\s?\d){6}', text))


def _detect_icao_tab(rows):
    low = _view(rows)[1]
    words = set(re.findall(r'[a-z]+', low))
    # table ICAO imprimée sans coordonnées sur les lignes (Islande, Lituanie, Croatie, Italie, Albanie, Philippines)
    return ('serial number' in low or 'serial no' in low or 'recommended coding tables' in low or 'tabular description' in low or {'magnetic', 'variation'} <= words) \
        and 'path' in words and ('descriptor' in words or 'terminator' in words) and {'waypoint', 'fly', 'course', 'navigation', 'specification'} <= words


def _detect_de_route(rows):
    low = _view(rows)[1]
    # routes SID / STAR décrites en texte, sans coordonnées : Allemagne, Moldavie, Portugal, Pologne
    return 'designator' in low and 'significant' in low and 'points' in low and 'track' in low and bool(re.search(r'\bdist', low)) and bool(re.search(r'\balt', low)) \
        and 'terminator' not in low and 'waypoint' not in low


def _detect_sia_code(rows):
    low = _view(rows)[1]
    # table ARINC du SIA (en-tête « Path Terminator » ou « Leg sequence » et « Waypoint » ; mots répartis sur plusieurs lignes selon la page)
    return ('path' in low and 'terminator' in low or 'leg sequence' in low) and 'waypoint' in low and ('fly' in low or 'altitude' in low)


def _detect_uk_app(rows):
    low = _view(rows)[1]
    return 'instrument approach procedure coding tables' in low and 'designator' in low and 'sequence' in low and 'co-ordinates' in low


LAYOUTS = [
    Layout('uk-star', _detect_uk_star, parse_uk_star, frozenset(), normalize_uk_star, True),
    Layout('at-coding', _detect_at_coding, parse_at_coding, frozenset(), normalize_at_coding, True),
    Layout('be-coding', _detect_be_coding, parse_be_coding, frozenset(), normalize_be_coding, True, positions='required'),
    Layout('ge-coding', _detect_ge_coding, parse_ge_coding, frozenset(), normalize_ge_coding, True),
    Layout('am-coding', _detect_am_coding, parse_am_coding, frozenset(), None, True),
    Layout('ei-coding', _detect_ei_coding, parse_ei_coding, frozenset(), None, True, known_names=True),
    Layout('icao-tab', _detect_icao_tab, parse_icao_tab, frozenset(), None, False, kind_hint=True),
    Layout('de-route', _detect_de_route, parse_de_route, frozenset(), None, False, 'magnetic'),
    # empreintes des en-têtes vus (cycle AIRAC 2026-10-01, pages de LFBD, LFAV, LFBO et LFPO ; cycle 2026-10-29, LFPG : colonne « Nav Spec » des SID 08 / 09, identifiant de procédure vide, pages INA et FNA à cellules espacées, toutes lues ; mêmes colonnes, une faute (« Identifcation »), des mots coupés (« V er ti ca l ») ou une colonne « NAV Spec »)
    Layout('sia-code', _detect_sia_code, None, frozenset({'4d7d8e47d5', '96546cf4c0', 'de5a236c1c', '32bceb3062', '30a2533e69', 'd4e263c080', '5abb2f38c4', 'a6e2a3ca47',
                                                         '2a61bb49b1', '1f4d62dd72', '71818f794d', '98fd783174', 'a43004fbdd', 'f1aa6bb8c7', 'b3f1a81baf', '6fa86c2e12', 'db625c6cfb'}),
           None, False, 'magnetic'),
    Layout('uk-app', _detect_uk_app, parse_uk_app, frozenset({'fc0e4cc8ff'}), normalize_uk_app, True),
]
BY_NAME = {e.name: e for e in LAYOUTS}
PARSERS = {e.name: e.read for e in LAYOUTS if e.read}                                       # les dispositions étrangères (sia-code est lue par proc_sia)
KNOWN_FINGERPRINTS = {e.name: set(e.fingerprints) for e in LAYOUTS}
NORMALIZERS = {e.name: e.ocr_normaliser for e in LAYOUTS if e.ocr_normaliser}               # normalisation propre à chaque disposition lue par OCR (les autres sont lues telles quelles)
OCR_LAYOUTS = {e.name for e in LAYOUTS if e.ocr_readable}                                   # dispositions lisibles par OCR (le contrôle de géométrie les contrôle toutes)


def detect_layout(rows):
    """Nom de la disposition connue d'une page « CODE », ou None : la première entrée de LAYOUTS qui la reconnaît. 'sia-code' : table ARINC du SIA."""
    return next((e.name for e in LAYOUTS if e.detect(rows)), None)


def read_page(name, rows, kind_hint=None, known=None):
    """La page lue par l'analyseur de sa disposition : { kind, tables, warnings }. `kind_hint` (type lu à la page précédente du document) et `known` (noms confirmés d'une page à l'autre)
    ne sont passés qu'aux analyseurs qui les reprennent."""
    e = BY_NAME[name]
    return e.read(rows, kind_hint=kind_hint) if e.kind_hint else e.read(rows, known=known) if e.known_names else e.read(rows)
