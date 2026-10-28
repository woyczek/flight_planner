"""Procédures (SID, STAR, approches RNP) de l'eAIP du SIA, au schéma commun d'aerodb (frame/aerodb/SPEC.md § 5 quinquies).

Source : les pages « AD 2 <OACI> DATA … CODE » de l'eAIP (tables de codage ARINC : une ligne par tronçon) et « AD 2 <OACI>
DATA 01 » (coordonnées des points propres aux procédures). Lecture des PDF par pypdf, dépendance FACULTATIVE de ce
constructeur de poste (jamais du lanceur ni de la page) : python -m pip install pypdf. Le reste est la bibliothèque standard.

  python tools/proc_eaip.py LFBD LFAV --eaip https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01 \
      --out data/proc [--cache dossier] [--base-dir dossier_base_sia] [--rows-dir dossier_pour_fixtures]

Écrit <out>/<cycle>/<OACI>.json et <out>/<cycle>/index.json (cycle = date de l'AIRAC lue dans l'adresse). Statut « check »
(à vérifier) : extrait de pages PDF, jamais un fichier officiel. Une ligne illisible est signalée dans `warnings`, jamais devinée.
Les procédures conventionnelles (ILS, VOR) n'ont pas de table de codage : hors de ce constructeur.
"""
import argparse
import hashlib
import json
import math
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DASHES = '-‐‑‒–—'
PATH_TERMINATORS = {'IF', 'TF', 'CF', 'DF', 'RF', 'AF', 'CA', 'CD', 'CI', 'CR', 'FA', 'FC', 'FD', 'FM', 'HA', 'HF', 'HM', 'PI',
                    'VA', 'VD', 'VI', 'VM', 'VR'}
CODE_PAGE = re.compile(r'^AD_2_([A-Z]{4})_DATA_.*CODE.*\.pdf$')
AIRAC_IN_URL = re.compile(r'AIRAC-(\d{4}-\d{2}-\d{2})')
CHART_KINDS = [('ADC', 'ADC'), ('APDC', 'APDC'), ('GMC', 'GMC'), ('SID', 'SID'), ('STAR', 'STAR'), ('IAC', 'IAC'), ('VAC', 'VAC'),
               ('DATA', 'DATA'), ('MIA', 'MIA'), ('MVA', 'MVA'), ('AOC', 'AOC'), ('ARC', 'ARC'), ('PATC', 'PATC'), ('TEXT', 'TEXT')]
MONTHS = {m: i + 1 for i, m in enumerate('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split())}


# ---------------------------------------------------------------------------------------------------------- lecture PDF
def pdf_reader(path):
    """Lecteur pypdf d'un fichier ; pypdf manque : message clair (dépendance facultative des constructeurs de poste, jamais du lanceur ni de la page)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit('pypdf manque : python -m pip install pypdf (dépendance facultative des constructeurs de poste, '
                         'voir tools/proc_eaip.py ; ni le lanceur ni la page n\'en ont besoin).')
    return PdfReader(str(path))


def rows_from_pdf(path, page=0, reader=None):
    """Lignes de texte d'une page PDF (la première), du haut vers le bas : fragments regroupés par ordonnée (2,5 pt) puis
    triés par abscisse. pypdf manque : message clair. Chaque ligne est une chaîne de mots séparés par une espace."""
    if reader is None:
        reader = pdf_reader(path)
    frags = []
    page = reader.pages[page]

    def visit(text, cm, tm, fd, fs):
        if text.strip():
            # certaines tables sont tournées dans le flux de texte (paysage) : les lignes avancent le long de x ou de y
            if abs(tm[1]) > abs(tm[0]):
                r, c = (tm[4], tm[5]) if tm[1] > 0 else (-tm[4], -tm[5])
            else:
                r, c = (-tm[5], tm[4]) if tm[0] > 0 else (tm[5], -tm[4])
            frags.append((r, c, len(frags), re.sub(r'[\x00-\x1f]', ' ', text)))   # caractères de police illisibles: effacés
    page.extract_text(visitor_text=visit)
    rows = []
    for y, x, i, t in sorted(frags, key=lambda f: (f[0], f[1], f[2])):
        if rows and abs(rows[-1][0] - y) <= 2.5:
            rows[-1][1].append((x, i, t))
        else:
            rows.append([y, [(x, i, t)]])
    return [' '.join(' '.join(t for _, _, t in sorted(r)).split()) for _, r in rows]


# ---------------------------------------------------------------------------------------------------------- repérage dans un PDF
SCAN_KEYS = [('Path Terminator', r'path\s*terminator'), ('Fly Over', r'fly\s*over'), ('Coding', r'coding'), ('Waypoint Identification', r'waypoint\s*identification'),
             ('SID', r'\bSID\b'), ('STAR', r'\bSTAR\b'), ('RNAV', r'\bRNAV\b'), ('RNP', r'\bRNP\b'), ('Approach', r'instrument\s+approach|\bIAC\b|\bILS\b')]


def scan_rows(pages):
    """Repérage page par page (sans copier de contenu) : [(n, titre, [mots-clés])] d'après les lignes de texte de chaque page (liste de lignes)."""
    out = []
    for n, rows in enumerate(pages, 1):
        text = ' '.join(rows)
        keys = [k for k, rx in SCAN_KEYS if re.search(rx, text, re.I)]
        title = next((r for r in rows[:8] if re.search(r'\bAD\b|\b[A-Z]{4}\b.*(?:CHART|SID|STAR|APPROACH)', r)), rows[0] if rows else '')
        out.append((n, re.sub(r'\s+', ' ', title)[:110], keys))
    return out


def context_lines(pages, wanted, rx=r'coding|ARINC|path\s*terminator|fly[- ]?(?:by|over)|leg\s+type|waypoint\s+list|tabular', limit=6):
    """Pour les pages demandées (numéros à partir de 1), les lignes — au plus `limit`, 140 caractères — qui portent un mot du codage : de quoi savoir de quoi parle la page."""
    out = {}
    for n in wanted:
        out[n] = [re.sub(r'\s+', ' ', r)[:140] for r in pages[n - 1] if re.search(rx, r, re.I)][:limit]
    return out


def format_rows(rows, limit=90):
    """Lignes d'une page numérotées, 160 caractères au plus chacune, `limit` lignes au plus : pour voir la disposition d'une table."""
    return [f'{i:3d} | {re.sub(chr(32) + "+", chr(32), r)[:160]}' for i, r in enumerate(rows[:limit], 1)] + ([f'... ({len(rows) - limit} ligne(s) de plus)'] if len(rows) > limit else [])


def show_page(path, n, report=print):
    """Affiche les lignes de texte de la page n (à partir de 1) d'un PDF, comme le lecteur les voit (même ordre que les analyseurs)."""
    reader = pdf_reader(path)
    if not 1 <= n <= len(reader.pages):
        raise SystemExit(f'page {n} hors du document ({len(reader.pages)} page(s))')
    rows = rows_from_pdf(path, n - 1, reader)
    report(f'Page {n}: {len(rows)} ligne(s)')
    for line in format_rows(rows):
        report(line)


def scan_pdf(path, report=print):
    """Repère dans un PDF d'AIP (une partie AD 2 entière) les pages à tableau de tronçons (« Path Terminator »…) : titres et mots-clés seulement."""
    if not Path(path).is_file():
        near = sorted(str(f) for f in Path(path).parent.glob('*.pdf*')) if Path(path).parent.is_dir() else []
        raise SystemExit(f'fichier introuvable: {path}' + (f'. PDF présents dans {Path(path).parent}: ' + ', '.join(near) if near else ''))
    reader = pdf_reader(path)
    pages = []
    for i in range(len(reader.pages)):
        try:
            pages.append(rows_from_pdf(path, i, reader))
        except Exception as e:                       # une page illisible n'arrête pas le repérage
            pages.append([f'(page illisible: {type(e).__name__})'])
    info = scan_rows(pages)
    report(f'{len(info)} page(s). Pages portant chaque mot-clé:')
    for k, _ in SCAN_KEYS:
        ns = [n for n, _, ks in info if k in ks]
        report(f'  {k}: {len(ns)}', ns[:40])
    tab = [(n, t, ks) for n, t, ks in info if 'Path Terminator' in ks or 'Coding' in ks]
    report(f'Pages à tableau de tronçons probable ({len(tab)}):')
    for n, t, ks in tab[:80]:
        report(f'  p{n} | {t} | {", ".join(ks)}')
    report('Lignes à mot de codage des pages ci-dessus (au plus 6 par page, 140 caractères):')
    for n, lines in context_lines(pages, [n for n, _, _ in tab[:20]]).items():
        for ln in lines:
            report(f'  p{n} | {ln}')
    report('Titres des pages SID / STAR / approche (aperçu):')
    for n, t, ks in [x for x in info if {'SID', 'STAR', 'Approach'} & set(x[2])][:150]:
        report(f'  p{n} | {t}')
    return info


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


def parse_data01(rows):
    """Coordonnées des points d'une page « DATA 01 » : { identifiant: (lat, lon) } ; les « REF ENR » n'y sont pas."""
    out = {}
    for r in rows:
        m = re.match(r'^(?:[←→]\s*)?([A-Z0-9]{2,6})\s+(\d.*)$', r)
        c = m and dms(m.group(2))
        if c:
            out[m.group(1)] = c
    return out


# ---------------------------------------------------------------------------------------------------------- tables de codage
def _cells(tokens):
    """Cellules d'une ligne : un mot de tirets vaut autant de cellules vides que de tirets (la page colle les vides)."""
    out = []
    for t in tokens:
        if all(c in DASHES for c in t):
            out += [None] * len(t)
        else:
            out.append(t)
    return out


def _title(rows):
    """(type, pistes, intitulé) d'après le titre de la page (« SID RNAV RWY 23 », « RNP RWY 29 », « STAR RNAV RWY ALL »)."""
    for r in rows:
        m = re.search(r'\b(SID|STAR|RNP[A-Z ]*?)\s*(?:RNAV\s+)?RWY\s*(\d{2}[LRC]?|ALL)\b', r)
        if m:
            kind = 'APP' if m.group(1).startswith('RNP') else m.group(1)
            return kind, ([] if m.group(2) == 'ALL' else [m.group(2)]), re.sub(r'\s+', ' ', m.group(0)).strip()
    return None, [], ''


def _leg(tokens, rnp, warn):
    """Tronçon d'une ligne (tokens à partir du type de tronçon) ou None. SID / STAR : 10 cellules après le type ; RNP : 10
    puis la spécification de navigation (texte)."""
    text = ' '.join(tokens[1:])
    text = re.sub(r'(-\d+(?:\.\d+)?)\s*°?\s*/\s*(\d+(?:\.\d+)?)', r'@\1/\2', text)
    tok = text.split()
    nav = None
    if rnp:
        k = len(tok)
        while k > 0 and re.match(r'^[A-Za-z]', tok[k - 1]) and not re.fullmatch(r'Yes|[LR]', tok[k - 1]):
            k -= 1
        nav, tok = ' '.join(tok[k:]) or None, tok[:k]
    c = _cells(tok)
    if nav:
        c.append(nav)
    want = 11 if rnp else 10
    if len(c) == want - 1 and len(c) > 2 and c[2] and re.fullmatch(r'\d{3}\.\d', c[2]):   # le cap magnétique manque dans la page
        c.insert(2, None)
        warn(f'cap magnétique absent: {" ".join(tokens)}')
    if len(c) != want:
        if c and c[0] and all(x is None for x in c[1:]) and tokens[0] == 'IF':      # point initial sans autre donnée: gardé
            c += [None] * (want - len(c))
        else:
            warn(f'ligne illisible ({len(c)} cellules au lieu de {want}): {" ".join(tokens)}')
            return None
    wpt, over, mag, tru, nm, turn, lo, hi, ias, last, *extra = c
    if not wpt:
        warn(f'point sans identifiant: {" ".join(tokens)}')
        return None
    leg = {'id': wpt, 'leg': tokens[0], 'over': True if over == 'Yes' else None,
           'crs': int(mag) if mag and mag.isdigit() else None,
           'nm': float(nm) if nm and re.fullmatch(r'\d+(?:\.\d+)?', nm) else None,
           'turn': turn if turn in ('L', 'R') else None,
           'alt': alt_constraint(lo, hi),
           'kt': int(ias) if ias and ias.isdigit() else None}
    if rnp:
        m = last and re.fullmatch(r'@(-?[\d.]+)/([\d.]+)', last)
        leg['vpa'] = float(m.group(1)) if m else None
        tail = extra[0] if extra else None
        leg['rnp'] = float(tail) if tail and re.fullmatch(r'\d+(?:\.\d+)?', tail) else None
    else:
        leg['rnp'] = float(last) if last and re.fullmatch(r'\d+(?:\.\d+)?', last) else None
    return leg


def parse_code_table(rows):
    """Page « CODE » → { kind, runways, title, groups: [{ label, legs }], warnings, amdt }.
    SID / STAR : l'intitulé d'un groupe est la ligne seule qui précède ses tronçons (« ROYAN 6P »).
    RNP : un groupe commence à chaque point initial (IF) ; le dernier, qui porte le point de piste (RWnn), est l'approche
    finale (« APCH »), les autres sont les transitions d'approche initiale (« INA X »), nommées par leur point initial.
    Les lignes d'attente (HLDG, sans type de tronçon) sont laissées de côté."""
    warnings = []
    kind, runways, title = _title(rows)
    rnp = kind == 'APP'
    start = next((i for i, r in enumerate(rows) if re.search(r'Accuracy \(NM\)|NAV Spec|Navigation|Accuracy', r)), -1)
    groups, cur = [], None
    for r in rows[start + 1:]:
        t = r.split()
        k = next((i for i, w in enumerate(t[:6]) if w in PATH_TERMINATORS and i + 1 < len(t)), None)
        if k is not None:
            leg = _leg(t[k:], rnp, warnings.append)
            label = ' '.join(w for w in t[:k] if not all(c in DASHES for c in w))
            if not rnp and label and cur is not None and not cur['legs']:
                label = ''
            if not leg:
                continue
            if rnp:
                if leg['leg'] == 'IF' and cur and cur['legs']:
                    cur = None
                if cur is None:
                    cur = {'label': None, 'legs': []}
                    groups.append(cur)
            elif cur is None or label:
                cur = {'label': re.sub(r'\s*\(\*\)$', '', label) or None, 'legs': []}
                groups.append(cur)
            cur['legs'].append(leg)
        elif not rnp and re.fullmatch(r'[A-Z]{3,5} ?\d[A-Z](?: \(\*\))?', r):
            cur = {'label': re.sub(r'\s*\(\*\)$', '', r), 'legs': []}
            groups.append(cur)
    groups = [g for g in groups if g['legs']]
    if rnp:
        final = next((g for g in reversed(groups) if any(re.fullmatch(r'RW\d{2}[LRC]?', l['id']) for l in g['legs'])), None)
        for g in groups:
            g['label'] = 'APCH' if g is final else f'INA {g["legs"][0]["id"]}'
        if not final:
            warnings.append('point de piste (RWnn) introuvable: approche finale non reconnue')
    return {'kind': kind, 'runways': runways, 'title': title, 'groups': groups, 'warnings': warnings,
            'amdt': page_date(rows)}


# ---------------------------------------------------------------------------------------------------------- vérification du format des pages
# Un format de page change sans prévenir (une colonne ajoutée, un en-tête reformulé, une page tournée) : avant de lire une page, on vérifie par script
# qu'elle a la disposition que l'analyseur connaît, et après l'avoir lue, que l'analyseur en a bien tiré tout ce qu'elle porte. Une page qui échoue
# n'est PAS lue (rien de deviné), elle est signalée ; l'empreinte de son en-tête dit si l'en-tête a changé depuis les pages vues.
HEADER_WORDS = r'path|terminator|waypoint|identification|leg sequence|altitude|direction|distance|turn|fly|accuracy|nav spec|vertical|speed|ias'


def _is_leg_row(row):
    t = row.split()
    k = next((i for i, w in enumerate(t[:6]) if w in PATH_TERMINATORS and i + 1 < len(t)), None)
    return k is not None and len(t) - k >= 9


def detect_layout(rows):
    """Nom de la disposition connue d'une page « CODE », ou None. 'sia-code' : table ARINC du SIA (en-tête « Path Terminator » ou « Leg sequence » et « Waypoint »)."""
    text = ' '.join(rows)
    low = text.lower()
    if ('path' in low and 'terminator' in low or 'leg sequence' in low) and 'waypoint' in low and ('fly' in low or 'altitude' in low):      # mots répartis sur plusieurs lignes selon la page
        return 'sia-code'
    if 'instrument approach procedure coding tables' in low and 'designator' in low and 'sequence' in low and 'co-ordinates' in low:
        return 'uk-app'
    return None


def fingerprint(rows):
    """Empreinte de l'en-tête d'une page : les mots des lignes d'en-tête (sans les valeurs), triés ; deux pages de même disposition ont la même."""
    words = sorted({w.lower() for r in rows if re.search(HEADER_WORDS, r, re.I) and not _is_leg_row(r) for w in re.findall(r'[A-Za-z]{3,}', r)})
    return hashlib.sha1(' '.join(words).encode()).hexdigest()[:10]


# empreintes des en-têtes vus (cycle AIRAC 2026-10-01, pages de LFBD et de LFAV) ; une autre est signalée « en-tête inconnu », pas bloquante
KNOWN_FINGERPRINTS = {'sia-code': {'4d7d8e47d5', '96546cf4c0', 'de5a236c1c'}, 'uk-app': {'fc0e4cc8ff'}}


def verify_page(rows, table=None):
    """(ok, problèmes, empreinte, disposition) d'une page : disposition reconnue ; si la page a été lue (`table`), au moins 85 % de ses lignes de tronçon
    ont été lues, des groupes et un type (SID / STAR / APP) ont été trouvés."""
    layout = detect_layout(rows)
    fp = fingerprint(rows)
    problems = []
    if not layout:
        return False, ['disposition non reconnue (en-tête de la table absent ou reformulé)'], fp, None
    if fp not in KNOWN_FINGERPRINTS.get(layout, set()):
        problems.append(f'info: en-tête inconnu (empreinte {fp}): format changé depuis les pages vues ?')
    ok = True
    if table is not None:
        want = sum(1 for r in rows if _is_leg_row(r))
        got = sum(len(g['legs']) for g in table['groups'])
        if not table['kind']:
            ok = False
            problems.append('titre de la page non reconnu (SID / STAR / RNP)')
        if not table['groups']:
            ok = False
            problems.append('aucun groupe de tronçons lu')
        if want and got < 0.85 * want:
            ok = False
            problems.append(f'{got} tronçon(s) lu(s) sur {want} lignes de tronçon: moins de 85 %')
    return ok, problems, fp, layout


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


def bearing_nm(a, b):
    """(cap vrai en degrés, distance en NM) du grand cercle de a à b, points (lat, lon) en degrés décimaux."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return (math.degrees(math.atan2(y, x)) + 360) % 360, 2 * 3440.065 * math.asin(math.sqrt(h))


def check_geometry(legs, tol_deg=0.25, tol_nm=0.2):
    """Contrôle de cohérence d'une table lue (par texte, par OCR ou à la main) : pour chaque tronçon TF, le cap vrai (et la distance, si elle est imprimée) recalculés
    d'après les coordonnées des deux points doivent être ceux de la page. Rend la liste des écarts ; vide = la table est cohérente."""
    bad = []
    for a, b in zip(legs, legs[1:]):
        if b.get('leg') != 'TF' or b.get('true') is None or None in (a.get('lat'), b.get('lat')):
            continue
        brg, nm = bearing_nm((a['lat'], a['lon']), (b['lat'], b['lon']))
        d = abs((brg - b['true'] + 180) % 360 - 180)
        if d > tol_deg:
            bad.append(f'{a["id"]} → {b["id"]}: cap calculé {brg:.1f}° pour {b["true"]}° imprimé')
        if b.get('nm') is not None and abs(nm - b['nm']) > tol_nm:
            bad.append(f'{a["id"]} → {b["id"]}: distance calculée {nm:.2f} NM pour {b["nm"]} imprimés')
    return bad


def records_uk_app(icao, parsed, source, cycle, at=None):
    """Procédures du schéma commun d'une page UK « Instrument Approach Procedure Coding Tables » ; statut « check », source ead-basic/UK."""
    out, warnings = [], list(parsed['warnings'])
    for t in parsed['tables']:
        bad = check_geometry(t['legs'])
        if bad:
            warnings.append(f'{t["title"][:60]}: incohérence caps/coordonnées, table NON retenue: ' + '; '.join(bad))
            continue
        pts, missed = [], False
        for lg in t['legs']:
            p = {'seq': len(pts) + 1, 'id': lg['id'], 'lat': lg['lat'], 'lon': lg['lon'], 'alt': lg['alt'], 'leg': lg['leg']}
            if lg['kt']:
                p['kt'] = lg['kt']
            if lg['crs'] is not None:
                p['crs'] = lg['crs']
            if lg['over']:
                p['over'] = True
            if missed:
                p['phase'] = 'missed'
            if re.fullmatch(r'RW\d{2}[LRC]?', lg['id']) or 'MAPt' in lg['remark']:
                missed = True
            pts.append(p)
        name = t['name']
        rw = f'RW{t["runways"][0]}' if len(t['runways']) == 1 else 'RWALL'
        norm = lambda v: re.sub(r'[\s-]+', '', (v or '').upper())
        out.append({'id': '.'.join([icao, 'APP', norm(name), rw] + ([norm(t['transition'])] if t['transition'] else [])), 'icao': icao, 'kind': 'APP', 'name': name,
                    'runways': t['runways'], 'transition': t['transition'], 'points': pts,
                    'source': {'kind': 'ead-basic', 'ref': f'ead-basic/UK/{source}', 'cycle': cycle, 'at': at}, 'status': 'check'})
    return out, warnings


def build_pdf_dir(icao, pdfs, rows_of, cycle):
    """Fichier d'un terrain d'après des PDF d'AIP déjà téléchargés à la main ou par la sonde EAD (dossier de PDF) : chaque PDF passe par la détection de disposition ;
    une disposition connue est lue, une inconnue est signalée (rien de deviné) ; le Royaume-Uni « uk-app » est de plus contrôlé par la géométrie (caps et coordonnées).
    `pdfs` : noms ; `rows_of(nom)` : lignes de la première page."""
    procs, warnings, formats = [], [], []
    for f in sorted(pdfs):
        rows = rows_of(f)
        layout = detect_layout(rows)
        fp = fingerprint(rows)
        if layout == 'uk-app':
            parsed = parse_uk_app(rows)
            recs, w = records_uk_app(icao, parsed, f, cycle, page_date(rows))
            ok = bool(recs) and len(recs) == len(parsed['tables'])
            problems = [x for x in w if 'NON retenue' in x] + ([] if recs else ['aucune table lue'])
            if fp not in KNOWN_FINGERPRINTS['uk-app']:
                problems.append(f'info: en-tête inconnu (empreinte {fp}): format changé depuis les pages vues ?')
            formats.append({'file': f, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems})
            procs += recs
            warnings += [f'{f}: {x}' for x in w]
        else:
            n = len(rows)
            formats.append({'file': f, 'layout': layout, 'fingerprint': fp, 'ok': False,
                            'problems': ['disposition non reconnue' + (' (très peu de texte: tableau dessiné en vecteurs ou image ? ' + str(n) + ' ligne(s))' if n < 8 else '')]})
            warnings.append(f'{f}: page NON lue, disposition non reconnue' + (' (texte absent: tables dessinées sans couche de texte)' if n < 8 else ''))
    return {'schema': 1, 'icao': icao, 'cycle': cycle, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'procedures': procs, 'formats': formats,
            'warnings': warnings, 'notice': 'Source : AIP du Royaume-Uni (CAA) via EAD Basic ; à vérifier, pour la simulation seulement, jamais pour la navigation.'}


# ---------------------------------------------------------------------------------------------------------- schéma commun
def _id_of(icao, kind, name, runways, trans):
    norm = lambda v: re.sub(r'[\s-]+', '', (v or '').upper())
    rw = f'RW{runways[0]}' if len(runways) == 1 else 'RWALL'
    return '.'.join([icao, kind, norm(name) or 'NONAME', rw] + ([norm(trans)] if norm(trans) else []))


def _points(icao, legs, coords, warnings, missed_after=None):
    pts, seen_rw = [], False
    missing = []
    for leg in legs:
        c = coords.get(leg['id'])
        if not c and leg['id'] not in missing:
            missing.append(leg['id'])
        p = {'seq': len(pts) + 1, 'id': leg['id'], 'lat': c[0] if c else None, 'lon': c[1] if c else None,
             'alt': leg['alt'], 'leg': leg['leg']}
        for k in ('turn', 'crs', 'nm', 'kt', 'rnp', 'vpa'):
            if leg.get(k) is not None:
                p[k] = leg[k]
        if leg['over']:
            p['over'] = True
        if seen_rw:
            p['phase'] = 'missed'
        if missed_after and re.fullmatch(r'RW\d{2}[LRC]?', leg['id']):
            seen_rw = True
        pts.append(p)
    if missing:
        warnings.append(f'coordonnées introuvables (page DATA ni base, à résoudre à la lecture par aerodb): {", ".join(missing)}')
    return pts


def records(icao, table, coords, source, cycle):
    """Procédures du schéma commun d'une table lue (parse_code_table), statut « check »."""
    out, warnings = [], list(table['warnings'])
    src = {'kind': 'eaip', 'ref': source, 'cycle': cycle, 'at': table.get('amdt')}
    if table['kind'] in ('SID', 'STAR'):
        for g in table['groups']:
            name = g['label'] or None
            out.append({'id': _id_of(icao, table['kind'], name, table['runways'], None), 'icao': icao, 'kind': table['kind'],
                        'name': name, 'runways': table['runways'], 'transition': None,
                        'points': _points(icao, g['legs'], coords, warnings), 'source': src, 'status': 'check'})
    elif table['kind'] == 'APP':
        final = next((g for g in reversed(table['groups']) if g['label'] == 'APCH'), None)
        inas = [g for g in table['groups'] if g is not final and (g['label'] or '').startswith('INA ')]
        name = table['title']
        for g in inas or [None]:
            legs = (g['legs'] if g else []) + ([l for l in final['legs'] if not (g and l is final['legs'][0] and
                                                                                  g['legs'][-1]['id'] == l['id'])] if final else [])
            trans = g['label'][4:] if g else None
            out.append({'id': _id_of(icao, 'APP', name, table['runways'], trans), 'icao': icao, 'kind': 'APP', 'name': name,
                        'runways': table['runways'], 'transition': trans,
                        'points': _points(icao, legs, coords, warnings, missed_after=True), 'source': src, 'status': 'check'})
    return out, warnings


def chart_kind(file):
    """Type d'une carte d'après son nom (AD_2_LFBD_SID_RWY23_RNAV.pdf → SID)."""
    parts = re.sub(r'^AD_2_[A-Z]{4}_', '', file).split('_')
    return next((k for p in parts for w, k in CHART_KINDS if p == w), 'OTHER')


def vac_url(base_url, icao):
    """Adresse de la carte VAC d'un terrain dans l'atlas VFR du même disque eAIP (…/eAIP_01_OCT_2026/Atlas-VAC/…), ou None."""
    m = re.match(r'^(.*?/eAIP_[^/]+)/', base_url.rstrip('/') + '/')
    return f'{m.group(1)}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.{icao}.pdf' if m else None


def build_aerodrome(icao, files, rows_of, base_url, cycle, resolve=None, vac=None):
    """Fichier d'un terrain : { procedures, charts, warnings }. `files` : noms des PDF de Cartes/<OACI>/ ; `rows_of(nom)` : lignes
    d'un PDF ; `resolve(id)` : (lat, lon) d'un point en route, ou None."""
    coords, warnings, procs, used, formats = {}, [], [], [], []
    for f in sorted(files):
        if re.search(r'_DATA_0\d\.pdf$', f):
            coords.update(parse_data01(rows_of(f)))
    for f in sorted(files):
        if not CODE_PAGE.match(f) or 'FASDB' in f:
            continue
        rows = rows_of(f)
        table = parse_code_table(rows) if detect_layout(rows) else None
        ok, problems, fp, layout = verify_page(rows, table)
        formats.append({'file': f, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems})
        if not ok:
            warnings.append(f'{f}: page NON lue, format à vérifier: ' + '; '.join(p for p in problems if not p.startswith('info:')))
            continue
        if any(p.startswith('info:') for p in problems):
            warnings.append(f'{f}: ' + next(p for p in problems if p.startswith('info:')))
        if not table['kind']:
            warnings.append(f'{f}: titre non reconnu')
            continue
        for g in table['groups']:
            for leg in g['legs']:
                if leg['id'] not in coords and resolve and resolve(leg['id']):
                    coords[leg['id']] = resolve(leg['id'])
        recs, w = records(icao, table, coords, f, cycle)
        procs += recs
        warnings += [f'{f}: {x}' for x in w]
        used.append(f)
    charts = [{'path': f'Cartes/{icao}/{f}', 'kind': chart_kind(f)} for f in sorted(files)]
    return {'schema': 1, 'icao': icao, 'cycle': cycle, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'procedures': procs, 'charts': {'base': base_url.rstrip('/') + '/html/eAIP/', 'items': charts, 'vac': vac},
            'pages': used, 'formats': formats, 'warnings': warnings}


def index_of(files_by_icao, cycle):
    """index.json du cycle : { cycle, aerodromes: { OACI: { SID, STAR, APP } } }."""
    ad = {}
    for icao, doc in files_by_icao.items():
        n = {'SID': 0, 'STAR': 0, 'APP': 0}
        for p in doc['procedures']:
            n[p['kind']] += 1
        ad[icao] = {**n, 'status': 'check'}
    return {'schema': 1, 'cycle': cycle, 'aerodromes': ad}


# ---------------------------------------------------------------------------------------------------------- réseau et CLI
def fetch(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SOG-aerodb-builder'}), timeout=timeout) as r:
        return r.read()


def pdf_names(icao, page_html):
    """Noms des PDF de Cartes/<OACI>/ cités par la page de l'aérodrome."""
    return sorted(set(re.findall(rf'Cartes/{icao}/([^"\'<>]+?\.pdf)', page_html)))


def icao_list(menu_html):
    """Codes OACI des terrains du menu de l'eAIP (liens FR-AD-2.<OACI>-fr-FR.html), dans l'ordre alphabétique."""
    return sorted(set(re.findall(r'FR-AD-2\.([A-Z]{4})-fr-FR\.html', menu_html)))


def base_resolver(base_dir):
    """Position d'un point en route (REF ENR 4.x) d'après les fichiers de la base SIA d'un dossier (navaids.json, points.json) ;
    None sans dossier."""
    if not base_dir:
        return None
    pos = {}
    for kind in ('navaids', 'points'):
        p = Path(base_dir) / f'{kind}.json'
        if p.exists():
            doc = json.loads(p.read_text(encoding='utf-8'))
            for x in doc.get('data', doc) if isinstance(doc, dict) else doc:
                if x.get('id') and x.get('lat') is not None:
                    pos.setdefault(x['id'], (x['lat'], x['lon']))
    return pos.get


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('icao', nargs='*', help='codes OACI ; vide avec --all')
    ap.add_argument('--all', action='store_true', help='tous les terrains du menu de l\'eAIP (une page de 0,7 Mo chacun)')
    ap.add_argument('--delay', type=float, default=0.0, help='pause entre deux terrains, en secondes')
    ap.add_argument('--scan-pdf', default=None, help='repère les pages à tableau de tronçons d\'un PDF AD 2 déjà téléchargé (titres et mots-clés seulement)')
    ap.add_argument('--pdf-dir', default=None, help='dossier de PDF d\'AIP déjà téléchargés (sonde EAD) : écrit proc/<cycle>/<OACI>.json (avec --cycle et un code OACI)')
    ap.add_argument('--cycle', default=None, help='cycle AIRAC AAAA-MM-JJ (avec --pdf-dir)')
    ap.add_argument('--check', action='store_true', help='vérifie seulement le format des pages (rien n\'est écrit) ; code de sortie 1 si une page n\'est pas lisible')
    ap.add_argument('--page', type=int, default=None, help='avec --scan-pdf : affiche les lignes de cette page (à partir de 1) au lieu du repérage')
    ap.add_argument('--eaip', default=None, help='adresse du dossier AIRAC de l\'eAIP (…/FRANCE/AIRAC-AAAA-MM-JJ)')
    ap.add_argument('--out', default='data/proc')
    ap.add_argument('--cache', default=None, help='dossier des PDF téléchargés (gardés, pour ne pas recharger)')
    ap.add_argument('--base-dir', default=None, help='dossier de la base SIA du cycle (navaids.json, points.json)')
    ap.add_argument('--rows-dir', default=None, help='écrit les lignes de chaque PDF lu (fixtures de test)')
    a = ap.parse_args(argv)
    if a.pdf_dir:
        if len(a.icao) != 1 or not a.cycle:
            raise SystemExit('--pdf-dir demande UN code OACI et --cycle AAAA-MM-JJ')
        names = sorted(f.name for f in Path(a.pdf_dir).glob('*.pdf'))
        doc = build_pdf_dir(a.icao[0].upper(), names, lambda n: rows_from_pdf(Path(a.pdf_dir) / n, 0), a.cycle)
        for fm in doc['formats']:
            print(f'  {"OK " if fm["ok"] else "NON"} {fm["file"]} | {fm["layout"]} | {fm["fingerprint"]}' + ''.join(f' | {x}' for x in fm['problems']), file=sys.stderr)
        print(f'{len(doc["procedures"])} procédure(s) ; {len(doc["warnings"])} avertissement(s)', file=sys.stderr)
        if a.check:
            raise SystemExit(1 if any(not f['ok'] for f in doc['formats']) else 0)
        out = Path(a.out) / a.cycle
        out.mkdir(parents=True, exist_ok=True)
        (out / f'{a.icao[0].upper()}.json').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        return
    if a.scan_pdf:
        if a.page:
            show_page(a.scan_pdf, a.page)
        else:
            scan_pdf(a.scan_pdf)
        return
    if not a.eaip:
        raise SystemExit('--eaip est requis (adresse du dossier AIRAC de l\'eAIP), ou --scan-pdf FICHIER')
    m = AIRAC_IN_URL.search(a.eaip)
    if not m:
        raise SystemExit('adresse sans « AIRAC-AAAA-MM-JJ »: cycle inconnu')
    cycle = m.group(1)
    cache = Path(a.cache or '.proc_cache') / cycle
    cache.mkdir(parents=True, exist_ok=True)
    resolve, docs, bad_pages = base_resolver(a.base_dir), {}, []
    codes = [i.upper() for i in a.icao]
    if a.all:
        codes = icao_list(fetch(f'{a.eaip}/html/eAIP/FR-menu-fr-FR.html').decode('utf-8', 'replace'))
    if not codes:
        raise SystemExit('aucun terrain: donner des codes OACI ou --all')
    for n, icao in enumerate(codes):
        if n and a.delay:
            time.sleep(a.delay)
        page = fetch(f'{a.eaip}/html/eAIP/FR-AD-2.{icao}-fr-FR.html').decode('utf-8', 'replace')
        files = pdf_names(icao, page)
        if not any(CODE_PAGE.match(f) for f in files):      # rien à lire (cartes seules) : pas de fichier
            print(f'{icao}: aucune table de codage', file=sys.stderr)
            continue

        def rows_of(name, icao=icao):
            p = cache / name
            if not p.exists():
                p.write_bytes(fetch(f'{a.eaip}/html/eAIP/Cartes/{icao}/{name}'))
            rows = rows_from_pdf(p)
            if a.rows_dir:
                Path(a.rows_dir).mkdir(parents=True, exist_ok=True)
                (Path(a.rows_dir) / (p.stem + '.rows.txt')).write_text('\n'.join(rows) + '\n', encoding='utf-8')
            return rows
        vac = vac_url(a.eaip, icao)
        try:                                                  # carte VAC : seulement si l'atlas VFR la publie
            urllib.request.urlopen(urllib.request.Request(vac, method='HEAD', headers={'User-Agent': 'SOG-aerodb-builder'}), timeout=30)
        except Exception:
            vac = None
        docs[icao] = build_aerodrome(icao, files, rows_of, a.eaip, cycle, resolve, vac)
        d = docs[icao]
        print(f'{icao}: {len(d["procedures"])} procédure(s), {len(d["warnings"])} avertissement(s)', file=sys.stderr)
        for fm in d['formats']:
            print(f'  {"OK " if fm["ok"] else "NON"} {fm["file"]} | {fm["layout"]} | {fm["fingerprint"]}' + ''.join(f' | {x}' for x in fm['problems']), file=sys.stderr)
        bad_pages += [f'{icao}/{fm["file"]}' for fm in d['formats'] if not fm['ok']]
    if a.check:                                           # vérification seulement : rien n'est écrit ; sortie 1 si une page n'est pas lisible
        print(f'{len(bad_pages)} page(s) à format non reconnu ou mal lu' + (': ' + ', '.join(bad_pages) if bad_pages else ''), file=sys.stderr)
        raise SystemExit(1 if bad_pages else 0)
    if bad_pages:
        print(f'ATTENTION: {len(bad_pages)} page(s) NON lues (format à vérifier): ' + ', '.join(bad_pages), file=sys.stderr)
    out = Path(a.out) / cycle
    out.mkdir(parents=True, exist_ok=True)
    for icao, d in docs.items():
        (out / f'{icao}.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (out / 'index.json').write_text(json.dumps(index_of(docs, cycle), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
