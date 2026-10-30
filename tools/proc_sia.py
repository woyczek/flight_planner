"""Le lecteur de l'eAIP du SIA (France) : procédures (SID, STAR, approches RNP), au schéma commun d'aerodb (frame/aerodb/SPEC.md § 5 quinquies).

Source : les pages « AD 2 <OACI> DATA … CODE » de l'eAIP (tables de codage ARINC : une ligne par tronçon) et « AD 2 <OACI>
DATA 01 » (coordonnées des points propres aux procédures). Lecture des PDF par pypdf, dépendance FACULTATIVE de ce
constructeur de poste (jamais du lanceur ni de la page) : python -m pip install pypdf. Le reste est la bibliothèque standard.

  python tools/proc_sia.py LFBD LFAV --eaip https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01 \
      --out data/proc [--cache dossier] [--base-dir dossier_base_sia] [--rows-dir dossier_pour_fixtures]

Écrit <out>/<cycle>/<OACI>.json et <out>/<cycle>/index.json (cycle = date de l'AIRAC lue dans l'adresse). Statut « check »
(à vérifier) : extrait de pages PDF, jamais un fichier officiel. Une ligne illisible est signalée dans `warnings`, jamais devinée.
Les procédures conventionnelles (ILS, VOR) n'ont pas de table de codage : hors de ce constructeur.

Les autres morceaux (V3 § 10.29 (b)) : proc_pdf (lecture des PDF), proc_layouts (les dispositions étrangères), proc_records (lignes → fiches), proc_geometry (le contrôle).
"""
import argparse
import json
import math
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

import outbound  # le User-Agent du lanceur, chaque échec dit en console
import proc_geometry as G
from proc_layouts import BY_NAME, alt_constraint, alt_ft, DASHES, detect_layout, dms, fingerprint, FIXLESS, _is_leg_row, KNOWN_FINGERPRINTS, MONTHS, page_date, PATH_TERMINATORS
from proc_pdf import PDF_NAME, first_page_rows, safe_path, pdf_pages, PdfTimeout, scan_pdf, show_page
from proc_records import build_pdf_dir, page_reason, records


ICAO_RE = re.compile(r'^[A-Z0-9]{4}$')
CODE_PAGE = re.compile(r'^AD_2_([A-Z]{4})_DATA_.*CODE.*\.pdf$')
AIRAC_IN_URL = re.compile(r'AIRAC-(\d{4}-\d{2}-\d{2})')
CHART_KINDS = [('ADC', 'ADC'), ('APDC', 'APDC'), ('GMC', 'GMC'), ('SID', 'SID'), ('STAR', 'STAR'), ('IAC', 'IAC'), ('VAC', 'VAC'),
               ('DATA', 'DATA'), ('MIA', 'MIA'), ('MVA', 'MVA'), ('AOC', 'AOC'), ('ARC', 'ARC'), ('PATC', 'PATC'), ('TEXT', 'TEXT')]


def parse_data01(rows):
    """Coordonnées des points d'une page « DATA 01 » : { identifiant: (lat, lon) } ; les « REF ENR » n'y sont pas. Un point initial d'ILS peut s'imprimer « IG08L ( IF ILS/LOC RWY 08L )  48°58'16.5'' N … »
    (Paris-CDG) : le nom, puis sa fonction entre parenthèses, puis la position."""
    out = {}
    for r in rows:
        m = re.match(r'^(?:[←→]\s*)?([A-Z0-9]{2,6})\s+(?:\(\s*IF [^)]*\)\s+)?(\d.*)$', r)
        c = m and dms(m.group(2))
        if c:
            out[m.group(1)] = c
    return out


FAF_ROW = re.compile(r'^FAF LOC RWY (\d{2}[LRC]?)\s+(.*)$')


def parse_faf(rows):
    """Les points d'approche finale (FAF) des approches ILS / LOC d'une page DATA : { piste : (lat, lon) } d'après les lignes « FAF LOC RWY 06  48°37'50.4'' N 002°03'57.2'' E ». La page ne donne ni
    nom de point ni altitude : le constructeur nomme le point « FAF » + la piste et ne lui met pas d'altitude (with_threshold, proc_records). Les lignes « FAF VOR RWY … » (approches VOR) n'en font pas partie."""
    out = {}
    for r in rows:
        m = FAF_ROW.match(r.strip())
        c = m and dms(m.group(2))
        if c:
            out.setdefault(m.group(1), c)
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


RUNWAY_LIST = re.compile(r'((?:\s*[/-]\s*\d{2}[LRC]?)+)')


def _runway_list(first, rest):
    """Pistes d'un titre : « 14L » suivi de « / 14R » ou « -14R » (« RWY 14L / 14R », « RWY14L-14R », « RWY 20-24-25 »)."""
    m = RUNWAY_LIST.match(rest)
    return [first] + (re.findall(r'\d{2}[LRC]?', m.group(1)) if m else [])


def _own_title(rows):
    """Titre d'une page INA / FNA qui n'est pas « RNP » : la ligne que la page imprime pour elle-même (« INA RNAV (GNSS) RWY 14R », « FNA ILS Z or LOC Z RWY 14L »,
    « FNA ILS CAT I ou / or CAT II et / and CAT III ou / or LOC RWY 07 ») ; les lignes qui la citent (« Linked to FNA RNP RWY 14L ») ne comptent pas. (type, pistes, intitulé) ou None."""
    for r in rows:
        m = re.match(r'^(INA|FNA)\s+(.*?)\s*RWY\s*(\d{2})\s*([LRC]?)(?:\s+[A-Z][A-Z ()-]+)?\s*$', r)          # « RWY 32 L » (INA RNAV(GNSS) RWY 32 L) comme « RWY 32L » ; LFPG : le nom du terrain suit sur la ligne (« INA RNAV RWY 27L PARIS CHARLES DE GAULLE »)
        if not m or (m.group(1) == 'FNA' and m.group(2).startswith('RNP')):
            continue
        rw = m.group(3) + m.group(4)
        mid = re.sub(r'\s*\b(?:ou|et)\s*/\s*(or|and)\b', r' \1', re.sub(r'(\w)\(', r'\1 (', re.sub(r'\s+', ' ', m.group(2))))
        return 'APP', [rw], f'{m.group(1) if m.group(1) == "INA" else ""} {mid} RWY {rw}'.strip().replace('  ', ' ')
    return None


def _title(rows):
    """(type, pistes, intitulé) d'après le titre de la page (« SID RNAV RWY 23 », « SID RNAV RWY 14L / 14R », « RNP RWY 29 », « STAR RNAV RWY ALL », « INA RNAV (GNSS) RWY 14R »,
    « FNA ILS … RWY 14L ») ; le départ POGO (« SID RNAV POGO » puis « POGO RNAV RWY 06-07 ») n'a pas de piste dans son titre de type."""
    own = _own_title(rows)
    if own:
        return own
    for r in rows:
        m = re.search(r'\b(SID|STAR|RNP[A-Z ]*?)\s*(?:RNAV\s+)?RWY\s*(\d{2}[LRC]?|ALL)\b', r)
        if m:
            kind = 'APP' if m.group(1).startswith('RNP') else m.group(1)
            return kind, ([] if m.group(2) == 'ALL' else _runway_list(m.group(2), r[m.end():])), re.sub(r'\s+', ' ', m.group(0)).strip()
    kind = next((m.group(1) for m in (re.match(r'^(SID|STAR)\b', r) for r in rows) if m), None)
    if kind:
        for r in rows:
            m = re.search(r'\bRWY\s*(\d{2}[LRC]?)', r)
            if m:
                return kind, _runway_list(m.group(1), r[m.end():]), re.sub(r'\s+', ' ', r).strip()
        return kind, [], ''
    return None, [], ''
LANE = re.compile(r'^RWY ?(\d{2}[LRC]?)(?: -)? (\d{1,3}) (\d{1,3}\.\d)$')       # « RWY14R 141 142.9 » : en-tête de piste d'un départ à plusieurs pistes (cap magnétique et vrai de la piste) ; « RWY09L - 087 088.4 » (LFPG) : la colonne de l'identifiant de procédure, vide, imprime un tiret


def _spelled(run):
    """Mot(s) recomposé(s) d'une suite de caractères que l'extracteur a espacés un à un (« D F P O 2 0 4 Y e s » → DF PO204 Yes ; « F L 1 1 0 F L 1 1 0 2 5 0 » → FL110 FL110 250)."""
    if len(run) > 1 and run[0] in 'LR' and (run[1].isdigit() or run.startswith(('LFL', 'RFL'))):        # le sens du virage collé au nombre qui suit
        return [run[0]] + _spelled(run[1:])
    m = re.fullmatch(r'([A-Z]{2})([A-Z0-9]{2,6}?)(Yes)?', run)
    if m and m.group(1) in PATH_TERMINATORS:
        return [m.group(1), m.group(2)] + (['Yes'] if m.group(3) else [])
    if 'FL' in run and re.fullmatch(r'(?:FL\d{3}|\d+(?:\.\d+)?)+', run):
        return re.findall(r'FL\d{3}|\d+(?:\.\d+)?', run)
    return [run]


def _navspec_last(t):
    """Colonne « Nav Spec » (« RNAV 1 », LFPG SID 08 / 09 et POGO 26) : la page la coupe sur deux lignes et l'extracteur la déplace, en tête de ligne (« RNAV 1CF PG081 … »), collée au
    terminateur, ou après son chiffre (« … 1 RNAV », « 1RNAV »). Les autres cellules gardent leur ordre : le mot est retiré où il est et remis à la fin de la ligne, « RNAV 1 »."""
    s = ' '.join(t)
    m = re.search(r'\bRNAV\s*(\d)(?=[A-Z]|\s|$)', s) or re.search(r'(?<![\d.A-Z])(\d)\s*RNAV\b', s)
    if not m:
        return t
    return (s[:m.start()] + ' ' + s[m.end():]).split() + ['RNAV', m.group(1)]


def _unsplit(res, numbers):
    """Cellules des pages FNA de LFPG dont l'extracteur a espacé un identifiant ou un nombre (« FG26 L », « PG65 0 », « 26 4 265. 7 », « 400 0 ») : rejointes quand la colonne ne laisse
    qu'une lecture. Un identifiant de point (deux lettres et deux chiffres, ou RWnn) suivi de L, R, C ou d'un chiffre seul, puis de la cellule de survol (« - », « Yes », « Y »), est
    un seul mot ; deux chiffres puis un chiffre seul valent un cap magnétique (trois chiffres, jamais deux) ; « 265. » puis un chiffre est un cap vrai ; trois chiffres puis « 0 » sont une
    altitude de quatre chiffres (ces trois dernières règles aux seules pages d'approche, `numbers`) ; un identifiant de quatre lettres suivi d'une lettre seule puis de la cellule de survol
    (« ADAD A - ») est un identifiant de cinq lettres (ADADA, EDOXA : pages DATA 01 à 05)."""
    out, i = [], 0
    while i < len(res):
        w = res[i]
        nxt = res[i + 1] if i + 1 < len(res) else None
        nn = res[i + 2] if i + 2 < len(res) else None
        if out and out[-1] in PATH_TERMINATORS and re.fullmatch(r'(?:[A-Z]{2}|RW)\d{2}', w) and nxt and re.fullmatch(r'[LRC\d]', nxt) and nn in ('-', 'Yes', 'Y'):
            out.append(w + nxt)
            i += 2
        elif out and out[-1] in PATH_TERMINATORS and re.fullmatch(r'[A-Z]{4}', w) and nxt and re.fullmatch(r'[A-Z]', nxt) and nn in ('-', 'Yes', 'Y'):
            out.append(w + nxt)
            i += 2
        elif not numbers:
            out.append(w)
            i += 1
        elif re.fullmatch(r'\d{2}', w) and nxt and re.fullmatch(r'\d', nxt):
            out.append(w + nxt)
            i += 2
        elif re.fullmatch(r'\d{1,3}\.', w) and nxt and re.fullmatch(r'\d', nxt):
            out.append(w + nxt)
            i += 2
        elif re.fullmatch(r'\d{3}', w) and nxt == '0':
            out.append(w + nxt)
            i += 2
        else:
            out.append(w)
            i += 1
    return out


def norm_tokens(row, split=False):
    """Mots d'une ligne de tableau, remis en forme avant lecture : lettres et chiffres espacés un à un recomposés (« Y e s », « 1 . 0 », « D F P O 2 0 4 »), « FL 070 » → FL070,
    terminateur collé à des tirets (« F M-- » → FM --) ou virage collé à des tirets (« L- », « ---L »), virgule décimale → point (« 198,4 » → 198.4), colonne « Nav Spec » remise en fin de ligne
    (_navspec_last), `split` : identifiants et nombres espacés des pages d'approche rejoints (_unsplit). Ne change aucune valeur : elle remet seulement les mots où l'extracteur les avait
    coupés ou collés."""
    t = row.split()
    while t and re.fullmatch(r'[←→↑↓↗↘➔➜►▶]+', t[0]):    # flèche de renvoi en tête de ligne (« → TF DIBES », LFPO STAR RWY20 : AMB 9W) : pas une cellule
        t = t[1:]
    if 'RNAV' in t or any(re.fullmatch(r'\d?RNAV\d?\S*|RNAV\d\S*', w) for w in t):
        t = _navspec_last(t)
    out, i = [], 0
    while i < len(t):
        w = t[i]
        if re.fullmatch(r'-[A-Z]', w) and i + 1 < len(t) and len(t[i + 1]) == 1 and (w[1] + t[i + 1]) in PATH_TERMINATORS:       # « -T F » : la cellule vide de l'identifiant collée au terminateur
            out += ['-', w[1] + t[i + 1]]
            i += 2
            continue
        if len(w) == 1 and w.isalpha() and i + 1 < len(t) and re.fullmatch(r'[A-Z]-+', t[i + 1]) and (w + t[i + 1][0]) in PATH_TERMINATORS:       # « F M-- »
            out += [w + t[i + 1][0], t[i + 1][1:]]
            i += 2
            continue
        if w == 'F' and i + 1 < len(t) and re.fullmatch(r'L\d{3}', t[i + 1]):         # « F L260 » : niveau de vol coupé après le F
            out.append('F' + t[i + 1])
            i += 2
            continue
        j = i
        while j < len(t) and re.fullmatch(r'[A-Za-z0-9.,]', t[j]):
            j += 1
        if j - i >= 2:
            out += _spelled(''.join(t[i:j]))
            i = j
            continue
        out.append(w)
        i += 1
    res = []
    for n, w in enumerate(out):
        m = re.fullmatch(r'([A-Z]{2})(-+)', w)
        if res and res[-1] in PATH_TERMINATORS and re.fullmatch(r'[A-Z]{2}', w) and n + 1 < len(out) and re.fullmatch(r'\d{3}', out[n + 1]):
            res.append(w)                  # point dont le nom est coupé en deux par la page (« PB 096 », « FF 305 » → PB096, FF305) : rejoint ci-dessous
            continue
        if res and re.fullmatch(r'[A-Z]{2}', res[-1]) and n > 1 and res[-2] in PATH_TERMINATORS and re.fullmatch(r'\d{3}', w):
            res[-1] += w
            continue
        if m and m.group(1) in PATH_TERMINATORS:
            res += [m.group(1), m.group(2)]
        elif re.fullmatch(r'[LR]-+', w):
            res += [w[0], w[1:]]
        elif re.fullmatch(r'-+[LR]', w):
            res += [w[:-1], w[-1]]
        elif res and res[-1] == 'FL' and re.fullmatch(r'\d{2,3}', w):
            res[-1] = 'FL' + w
        elif re.fullmatch(r'-?\d+,\d+°?', w):
            res.append(w.replace(',', '.'))
        else:
            res.append(w)
    if res and res[-1] == 'FL':
        res.pop()
    return _unsplit(res, split)


def _col_ok(i, v, rnp, leg, last):
    """La valeur `v` peut-elle tenir dans la colonne `i` de la table (0 point, 1 survol, 2 cap magnétique, 3 cap vrai, 4 distance, 5 virage, 6 mini, 7 maxi, 8 vitesse, [9 angle vertical], dernier :
    précision) ? Sert à rétablir une cellule vide perdue (voir _fit) : on ne place une cellule que là où son type l'admet."""
    if v is None:
        return i != 0 or leg in FIXLESS
    if i == 0:
        return bool(re.fullmatch(r'[A-Z0-9]{2,6}', v))
    if i == 1:
        return v == 'Yes'
    if i == 2:
        return bool(re.fullmatch(r'\d{1,3}', v))
    if i in (3, 4):
        return bool(re.fullmatch(r'\d{1,3}(?:\.\d+)?', v))
    if i == 5:
        return v in ('L', 'R')
    if i in (6, 7):
        return alt_ft(v) is not None
    if i == 8:
        return bool(re.fullmatch(r'\d{2,3}', v))
    if last:
        return bool(re.fullmatch(r'\d+(?:\.\d+)?|RN(?:AV|P).*', v))
    return bool(re.fullmatch(r'@-?[\d.]+/[\d.]+|-?\d+(?:\.\d+)?', v))      # angle vertical (rnp)


def _fit(c, want, rnp, leg):
    """Cellules d'une ligne qui en a de MOINS qu'il n'en faut (la page a perdu un tiret) : les rangées possibles où l'on ajoute des cellules vides de façon que chaque cellule tombe dans
    une colonne de son type. Rend la liste si UNE SEULE disposition convient, None sinon (aucune, ou plusieurs : la ligne n'est pas lue, jamais devinée)."""
    import itertools
    k = want - len(c)
    if not 0 < k <= 4:
        return None
    seen = []
    for pos in itertools.combinations_with_replacement(range(1, len(c) + 1), k):
        d = list(c)
        for p in reversed(pos):
            d.insert(p, None)
        if d not in seen and all(_col_ok(i, v, rnp, leg, i == want - 1) for i, v in enumerate(d)):
            seen.append(d)
    return seen[0] if len(seen) == 1 else None


def _leg(tokens, rnp, warn, lane=None, fixed=None):
    """Tronçon d'une ligne (tokens à partir du type de tronçon) ou None. SID / STAR : 10 cellules après le type ; RNP : 10
    puis la spécification de navigation (texte). `lane` : (cap magnétique, cap vrai) de l'en-tête de piste quand la ligne (CA) ne les porte pas ;
    `fixed` : liste où l'on note une ligne dont une cellule vide perdue a été rétablie (_fit)."""
    text = ' '.join(tokens[1:])
    text = re.sub(r'(-\d+(?:\.\d+)?)\s*°?\s*/\s*(\d+(?:\.\d+)?)', r'@\1/\2', text)
    tok = text.split()
    if not rnp and tokens[0] not in FIXLESS and len(tok) > 1 and tok[0] == '-':      # premier tronçon d'une piste dont l'extracteur a déplacé des cellules (LFPG : « CF - PG091 - - - - », « CF - 1.0 PG270 - - - - ») :
        if re.fullmatch(r'[A-Z][A-Z0-9]{1,5}', tok[1]):                                 # le tiret de la colonne de l'identifiant de procédure précède le point, la précision déplacée est remise en fin de ligne
            tok = tok[1:]
        elif len(tok) > 2 and re.fullmatch(r'\d\.\d', tok[1]) and re.fullmatch(r'[A-Z][A-Z0-9]{1,5}', tok[2]):
            tok = [tok[2]] + tok[3:] + [tok[1]]
        text = ' '.join(tok)
    nav = None
    if rnp:
        m = re.search(r'(?:^|\s)(RN(?:AV|P)(?:\s+\d+(?:\.\d+)?)?(?:\s+(?:APCH|AR))?)$', text)        # « RNP APCH », « RNAV 1 » (colonne « NAV Spec »)
        if m:
            nav, tok = m.group(1), text[:m.start(1)].split()
        else:
            k = len(tok)
            while k > 0 and re.match(r'^[A-Za-z]', tok[k - 1]) and not re.fullmatch(r'Yes|[LR]', tok[k - 1]):
                k -= 1
            nav, tok = ' '.join(tok[k:]) or None, tok[:k]
    else:
        m = re.search(r'(?:^|\s)(RNAV\s+\d+)$', text)         # SID de LFPG : la dernière colonne est la spécification de navigation (« RNAV 1 »), pas une précision en NM
        if m:
            nav, tok = m.group(1), text[:m.start(1)].split()
    c = _cells(tok)
    if nav:
        c.append(nav)
    want = 11 if rnp else 10
    if lane and len(c) == want - 2:
        c[2:2] = list(lane)
    if len(c) == want - 1 and len(c) > 2 and c[2] and re.fullmatch(r'\d{3}\.\d', c[2]) and c[1] in (None, 'Yes'):   # le cap magnétique manque dans la page
        c.insert(2, None)
        warn(f'cap magnétique absent: {" ".join(tokens)}')
    if len(c) != want:
        if c and c[0] and all(x is None for x in c[1:]) and tokens[0] == 'IF':      # point initial sans autre donnée: gardé
            c += [None] * (want - len(c))
        else:
            d = _fit(c, want, rnp, tokens[0]) if len(c) < want else None
            if d is None:
                warn(f'ligne illisible ({len(c)} cellules au lieu de {want}): {" ".join(tokens)}')
                return None
            c = d
            if fixed is not None:
                fixed.append(' '.join(tokens))
    return _leg_of(tokens, c, rnp, warn)


def _leg_of(tokens, c, rnp, warn):
    """Tronçon d'une liste de cellules complète (point, survol, cap magnétique, cap vrai, distance, virage, mini, maxi, vitesse, [angle vertical,] précision)."""
    wpt, over, mag, tru, nm, turn, lo, hi, ias, last, *extra = c
    if not wpt and tokens[0] not in FIXLESS:
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
        nav = last and re.fullmatch(r'RNAV\s+(\d+)', last)          # « RNAV 1 » : précision de 1 NM
        leg['rnp'] = float(last) if last and re.fullmatch(r'\d+(?:\.\d+)?', last) else float(nav.group(1)) if nav else None
    return leg


def _lane_ca(raw, lane, warn):
    """Premier tronçon d'une piste, « CA » (cap jusqu'à une altitude) : la page imprime son cap dans l'en-tête de la piste et l'extracteur brouille parfois l'ordre des cellules de la
    ligne (« -- 1000 - -1 . 0CA - - »). Lue sans tenir compte de l'ordre : le mot CA, une altitude et la précision 1.0 sont les seules cellules non vides, les six tirets restants sont les
    cellules vides ; l'altitude va dans la colonne MNM, comme sur les lignes propres de la même page. Rend le tronçon ou None (la ligne n'est alors pas de cette forme)."""
    s = re.sub(r'\s+', '', raw)
    if s.count('CA') != 1:
        return None
    s = s.replace('CA', '', 1)
    body = s.replace('-', '')
    m = re.fullmatch(r'(\d{3,4}|FL\d{3})(\d\.\d)', body)
    if m:
        alt, acc = m.group(1), m.group(2)
    else:                                             # précision puis altitude : l'ordre peut être inversé
        m = re.fullmatch(r'(\d\.\d)(\d{3,4}|FL\d{3})', body)
        alt, acc = (m.group(2), m.group(1)) if m else (None, None)
    if not alt or s.count('-') != 6:
        return None
    return _leg_of(['CA'], [None, None, lane[0], lane[1], None, None, alt, None, None, acc], False, warn)


def _is_leg_tokens(t):
    """Index du type de tronçon d'une ligne (dans ses 6 premiers mots) si la ligne est une ligne de tronçon (au moins 7 cellules après le type), sinon None."""
    k = next((i for i, w in enumerate(t[:6]) if w in PATH_TERMINATORS and i + 1 < len(t)), None)
    return k if k is not None and len(_cells(t[k + 1:])) >= 7 else None


def _bare_if(t):
    """Point initial (IF) d'une ligne dont l'extracteur a brouillé les cellules (« IF OKIPA - - 1,0- - - 300 - », « --LORNIIF -- - -300 1,0 », « 1,0IF LORNI - - ») : le type et le point sont certains
    (le mot IF et un identifiant), les contraintes (altitudes, vitesse) ne le sont pas et ne sont pas lues. Rend le tronçon, ou None. Une ligne perdue ferait coller le groupe suivant au précédent."""
    s = ' '.join(t)
    m = re.search(r'(?:^|[\s\d,.-])IF\s+([A-Z][A-Z0-9]{1,5})(?=\s|$)', s) or re.search(r'(?:^|[\s-])([A-Z][A-Z0-9]{2,5})IF(?=\s|$)', s)
    if not m:
        return None
    return {'id': m.group(1), 'leg': 'IF', 'over': None, 'crs': None, 'nm': None, 'turn': None, 'alt': None, 'kt': None, 'rnp': None, 'vpa': None, 'bare': True}


DESIGNATOR = re.compile(r'^[A-Z]{3,6} \d[A-Z]$')
# intitulé d'une STAR seul sur sa ligne : « ROYAN 6P », « ENORI 9W (UIR FIR) », « BIBAX 9V (Utilisable uniquement sur instruction du contrôle / Use on ATC instruction only ) » ; les parenthèses
# portent l'espace aérien du point d'entrée (« FIR », « UIR ») et les conditions d'emploi (réacteurs seulement, sur instruction) : elles ne font pas partie du nom
STAR_TITLE = re.compile(r'[A-Z]{2,5} ?\d[A-Z](?: \(.*\))?')


def _arc_of(legs):
    """Tronçons de séquencement d'un « point merge » (LFPG : BIBAX → BIBA1 … BIBA5 → KOLIV) : indices dans `legs` de la suite d'au moins trois TF qui suivent le point initial et portent
    un identifiant « radical du point initial + chiffre » numérotés de 1 en 1 (BIBA1, BIBA2, … pour BIBAX ; LUKI1 … pour LUKIP), suivie d'un tronçon vers un point (le point de fusion, KOLIV) ;
    None sinon. Le nom des points est la seule trace de l'arc dans la table (aucune colonne, aucune remarque) : la règle est donc stricte et ne retient que cette forme."""
    if len(legs) < 5 or not legs[0]['id'] or legs[0]['leg'] != 'IF':
        return None
    entry, run = legs[0]['id'], []
    for n, l in enumerate(legs[1:], 1):
        m = re.fullmatch(r'([A-Z]{3,5})(\d)', l['id'] or '')
        if m and l['leg'] == 'TF' and m.group(1) != entry and entry.startswith(m.group(1)) and int(m.group(2)) == len(run) + 1:
            run.append(n)
        else:
            break
    return run if len(run) >= 3 and run[-1] + 1 < len(legs) and legs[run[-1] + 1]['id'] else None


def split_point_merge(groups, warnings):
    """Retire des STAR d'une page les tronçons de séquencement d'un point merge (_arc_of) : ce ne sont pas des tronçons de route (l'arc est parcouru sur instruction du contrôle, les points
    BIBA1 … BIBA5 sont des positions de repère le long de l'arc), les garder dessinait un zigzag. Le tronçon vers le point de fusion, dont le cap et la distance imprimés partent du dernier point
    de l'arc, devient un « DF » sans cap ni distance : la STAR va du point d'entrée au point de fusion. Rend [{ name (le point d'entrée), merge, arc: [identifiants dans l'ordre] }]."""
    out = []
    for g in groups:
        run = _arc_of(g['legs'])
        if not run:
            continue
        legs = g['legs']
        ids = [legs[n]['id'] for n in run]
        merge = legs[run[-1] + 1]
        out.append({'name': legs[0]['id'], 'merge': merge['id'], 'arc': ids})
        g['legs'] = legs[:run[0]] + [{**merge, 'leg': 'DF', 'crs': None, 'nm': None, 'turn': None}] + legs[run[-1] + 2:]
        warnings.append(f'{g["label"]}: tronçons de séquencement d\'un point merge ({", ".join(ids)}) retirés de la route, mémorisés à part ; le tronçon vers {merge["id"]} devient un DF '
                        '(le cap et la distance imprimés partent du dernier point de l\'arc)')
    return out


def parse_code_table(rows):
    """Page « CODE » → { kind, runways, title, groups: [{ label, runway?, legs }], warnings, amdt, rows, read }.
    SID / STAR : l'intitulé d'un groupe est la ligne seule qui précède ses tronçons (« ROYAN 6P »). Un départ à plusieurs pistes (« SID RNAV RWY 14L / 14R ») porte, sous son
    intitulé, un en-tête par piste (« RWY14R 141 142.9 », cap magnétique et vrai de la piste) : les tronçons listés sous l'en-tête d'une piste sont propres à cette piste, ceux qui
    suivent l'en-tête de la DERNIÈRE piste sont la route commune ; la page ne les sépare pas autrement. Un groupe est rendu par piste (`runway`), ses tronçons propres puis la route
    commune. Le départ POGO imprime la piste devant son premier tronçon (« RWY07 CF PO081 »).
    RNP et INA : un groupe commence à chaque point initial (IF) ; le dernier, qui porte le point de piste (RWnn) ou, pour une page ILS, le renvoi « See chart » (les tronçons entre
    le point initial et la piste ne sont pas codés : ce qui suit est l'approche interrompue, `phase: missed`, le premier tronçon `gap`), est l'approche finale (« APCH »), les autres
    sont les transitions d'approche initiale (« INA X »), nommées par leur désignateur de STAR (« VEBEK 1E ») quand la page les imprime dans l'ordre des groupes, sinon par leur point
    initial ; deux transitions de même point initial sans désignateur lisible ne sont pas retenues (`skip`).
    Les lignes d'attente (HLDG, sans type de tronçon) sont laissées de côté. `rows` / `read` : lignes de tronçon vues / lues, chacune une fois (contrôle des 85 %)."""
    warnings = []
    kind, runways, title = _title(rows)
    rnp = kind == 'APP'
    ina = title.startswith('INA')
    start = next((i for i, r in enumerate(rows) if re.search(r'Accuracy \(NM\)|NAV Spec|Navigation|Accuracy', r)), -1)
    groups, cur = [], None
    seen = read = lost = 0                # lost : lignes de tronçon non lues d'un groupe qui n'existe pas encore (reprises par le premier groupe)
    fixed, designators = [], []

    def place(leg, label, rw):
        """Range un tronçon lu dans le groupe courant, en ouvrant un groupe à chaque point initial (pages d'approche) ou à chaque intitulé (SID / STAR)."""
        nonlocal cur, lost
        if rnp:
            if leg['leg'] == 'IF' and cur and cur['legs']:
                cur = None
            if cur is None:
                cur = {'label': None, 'legs': [], 'lost': lost}
                groups.append(cur)
                lost = 0
            cur['gap_open'] = False
        elif cur is None or label:
            cur = {'label': re.sub(r'\s*\(\*\)$', '', label) or None, 'legs': [], 'lost': lost}
            groups.append(cur)
            lost = 0
        if rw and not rnp:
            cur['runway'] = rw
        (cur['lanes'][-1]['legs'] if cur.get('lanes') else cur['legs']).append(leg)

    def miss():
        """Une ligne de tronçon n'a pas pu être lue : le groupe (la procédure) est marqué, il ne sera pas présenté comme complet."""
        nonlocal lost
        if cur is not None:
            cur['lost'] = cur.get('lost', 0) + 1
        else:
            lost += 1
    for r in rows[start + 1:]:
        t = norm_tokens(r, split=rnp)
        if not t:
            continue
        lane = LANE.match(' '.join(t)) if not rnp else None
        if lane:
            if cur is None:
                warnings.append(f'en-tête de piste sans procédure: {r}')
            else:
                cur.setdefault('lanes', []).append({'runway': lane.group(1), 'mm': (lane.group(2), lane.group(3)), 'legs': []})
            continue
        if rnp and re.search(r'(?i)\bsee chart\b', r):                 # page ILS : ce que la table ne code pas entre le point initial et la piste
            if cur is None:
                cur = {'label': None, 'legs': []}
                groups.append(cur)
            cur['gap'] = len(cur['legs'])
            cur['gap_open'] = True
            continue
        laned = cur['lanes'][-1] if not rnp and cur is not None and cur.get('lanes') else None
        if laned and not laned['legs']:                                 # premier tronçon de la piste : « CA », cellules parfois brouillées
            leg = _lane_ca(r, laned['mm'], warnings.append)
            if leg:
                seen += 1
                read += 1
                laned['legs'].append(leg)
                continue
        k = _is_leg_tokens(t)
        if k is None and rnp and t[0] != 'HLDG' and not (cur is not None and cur.get('gap_open')):
            leg = _bare_if(t)
            if leg:                                                     # point initial dont les cellules sont brouillées : le groupe qui suit ne doit pas coller au précédent
                seen += 1
                read += 1
                warnings.append(f'point initial {leg["id"]}: cellules brouillées par la page, contraintes (altitudes, vitesse) non lues: {r}')
                place(leg, '', None)
                continue
        if k is None and rnp and cur is not None and cur.get('gap_open') and t[0] != 'HLDG':
            # page ILS : le renvoi « See chart » recouvre le type du premier tronçon d'après (« - BO512 - 143 144.6 5.7 … ») ; TF s'il imprime un cap ET une distance, sinon non lu
            i = 0
            while i < len(t) and t[i] in ('-', 'APCH', '(*)'):
                i += 1
            rest = t[i:]
            cand = _leg(['TF'] + rest, True, lambda *_: None) if rest else None
            if cand and cand['id'] and cand['crs'] is not None and cand['nm'] is not None:
                seen += 1
                read += 1
                cur['gap_open'] = False
                cur['legs'].append(cand)
                warnings.append(f'type de tronçon absent (recouvert par le renvoi « See chart »), TF déduit du cap et de la distance imprimés: {r}')
            elif rest and re.fullmatch(r'[A-Z0-9]{2,6}', rest[0]):
                warnings.append(f'ligne sans type de tronçon, non lue: {r}')
            continue
        if k is not None:
            seen += 1
            prefix = [w for w in t[:k] if not all(c in DASHES for c in w)]
            rw = next((m.group(1) for m in (re.fullmatch(r'RWY(\d{2}[LRC]?)', w) for w in prefix) if m), None)
            prefix = [w for w in prefix if not re.fullmatch(r'RWY\d{2}[LRC]?', w)]
            label = ' '.join(prefix)
            if rnp:
                if len(prefix) >= 2 and DESIGNATOR.match(' '.join(prefix[-2:])):
                    designators.append(' '.join(prefix[-2:]))
                leg = _leg(t[k:], True, warnings.append, fixed=fixed)
            else:
                leg = _leg(t[k:], False, warnings.append, laned['mm'] if laned and t[k] == 'CA' else None, fixed)
            if not rnp and label and cur is not None and not cur['legs'] and not any(x['legs'] for x in cur.get('lanes', [])):
                label = ''
            if not leg and rnp and t[k] == 'IF':
                leg = _bare_if(t[k:])
                if leg:
                    warnings.append(f'point initial {leg["id"]}: cellules brouillées par la page, contraintes (altitudes, vitesse) non lues: {r}')
            if not leg:
                miss()
                continue
            read += 1
            place(leg, label, rw)
        elif not rnp and STAR_TITLE.fullmatch(re.sub(r'^[←→↑↓↗↘➔➜►▶]+\s*', '', r)):         # intitulé d'une STAR : « ENORI 9W », suivi entre parenthèses de l'espace aérien du point d'entrée et des conditions d'emploi (LFPG)
            cur = {'label': re.match(r'[A-Z]{2,5} ?\d[A-Z]', ' '.join(t)).group(0), 'legs': [], 'lost': lost}
            groups.append(cur)
            lost = 0
        elif rnp and DESIGNATOR.match(' '.join(t)):
            designators.append(' '.join(t))
    # départs à plusieurs pistes : un groupe par piste
    spread, notes = [], []
    for g in groups:
        if not g.get('lanes'):
            spread.append(g)
            continue
        common = g['lanes'][-1]['legs']
        if g['legs']:
            warnings.append(f'{g["label"]}: tronçons avant le premier en-tête de piste, non lus')
        for ln in g['lanes']:
            own = [] if ln is g['lanes'][-1] else ln['legs']
            spread.append({'label': g['label'], 'runway': ln['runway'], 'legs': own + [dict(x) for x in common], 'lost': g.get('lost', 0)})
        notes.append(', '.join(ln['runway'] for ln in g['lanes']))
    groups = [g for g in spread if g['legs']]
    if notes:
        warnings.append(f'départs à plusieurs pistes ({"; ".join(dict.fromkeys(notes))}): tronçons sous l\'en-tête d\'une piste lus comme propres à cette piste, ceux qui suivent '
                        'l\'en-tête de la dernière piste comme la route commune (la page ne les sépare pas autrement)')
    if fixed:
        warnings.append(f'{len(fixed)} ligne(s) dont une cellule vide manquait, rétablie parce qu\'une seule disposition des cellules convenait au type de chaque colonne')
    if rnp:
        final = next((g for g in reversed(groups) if any(re.fullmatch(r'RW\d{2}[LRC]?', l['id'] or '') for l in g['legs'])), None) \
            or next((g for g in groups if g.get('gap') is not None), None)
        if final is None:           # ni point de piste ni renvoi « See chart » : le groupe qui porte l'angle vertical (le seuil) est l'approche finale (records le dit)
            final = next((g for g in reversed(groups) if any(l.get('vpa') is not None for l in g['legs'])), None)
        others = [g for g in groups if g is not final]
        first_id = lambda g: next((l['id'] for l in g['legs'] if l['id']), '?')
        named = len(designators) == len(others) and all(d.split()[0] == first_id(g) for d, g in zip(designators, others))
        counts = {}
        for g in others:
            counts[first_id(g)] = counts.get(first_id(g), 0) + 1
        for g in groups:
            if g is final:
                g['label'] = 'APCH'
            elif named:
                g['label'] = f'INA {designators[others.index(g)]}'
            elif counts[first_id(g)] > 1:
                g['label'], g['skip'] = f'INA {first_id(g)}', True
            else:
                g['label'] = f'INA {first_id(g)}'
        for g in groups:
            if g.get('skip'):
                warnings.append(f'{g["label"]}: plusieurs transitions partent de ce point et la page ne dit pas laquelle est laquelle (désignateurs de STAR non lus dans l\'ordre): non retenue')
            if g is final and g.get('gap') is not None:
                for i, l in enumerate(g['legs']):
                    if i >= g['gap']:
                        l['phase'] = 'missed'
                if g['gap'] < len(g['legs']):
                    g['legs'][g['gap']]['gap'] = True
                warnings.append('tronçons entre le point initial et la piste non codés (renvoi « See chart »): les tronçons lus après sont l\'approche interrompue')
        if not final and not ina:
            warnings.append('point de piste (RWnn) introuvable: approche finale non reconnue')
    pm = split_point_merge(groups, warnings) if kind == 'STAR' else []
    return {'kind': kind, 'runways': runways, 'title': title, 'groups': groups, 'warnings': warnings,
            'amdt': page_date(rows), 'rows': seen, 'read': read, 'point_merge': pm}


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
        # lignes de tronçon vues / lues, chacune UNE fois (parse_code_table) : les tronçons d'un départ à plusieurs pistes sont rendus une fois par piste, ils ne comptent pas double
        want = table['rows'] if 'rows' in table else sum(1 for r in rows if _is_leg_row(r))
        got = table['read'] if 'read' in table else sum(len(g['legs']) for g in table['groups'])
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


def chart_kind(file):
    """Type d'une carte d'après son nom (AD_2_LFBD_SID_RWY23_RNAV.pdf → SID)."""
    parts = re.sub(r'^AD_2_[A-Z]{4}_', '', file).split('_')
    return next((k for p in parts for w, k in CHART_KINDS if p == w), 'OTHER')


def vac_url(base_url, icao):
    """Adresse de la carte VAC d'un terrain dans l'atlas VFR du même disque eAIP (…/eAIP_01_OCT_2026/Atlas-VAC/…), ou None."""
    m = re.match(r'^(.*?/eAIP_[^/]+)/', base_url.rstrip('/') + '/')
    return f'{m.group(1)}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.{icao}.pdf' if m else None


def build_aerodrome(icao, files, rows_of, base_url, cycle, resolve=None, vac=None, ad2=None):
    """Fichier d'un terrain : { procedures, charts, warnings }. `files` : noms des PDF de Cartes/<OACI>/ ; `rows_of(nom)` : lignes
    d'un PDF ; `resolve(id)` : (lat, lon) d'un point en route, ou None."""
    coords, warnings, procs, used, formats = {}, [], [], [], []
    merges, dropped = {}, []             # points merge (clé : entrée, fusion, arc) ; procédures retirées (un bloc sans titre qui en répète une nommée)
    faf = {}                              # piste → position du FAF LOC (pages DATA), pour les approches ILS
    for f in sorted(files):
        if re.search(r'_DATA_0\d\.pdf$', f):
            data_rows = rows_of(f)
            coords.update(parse_data01(data_rows))
            for rw, pos in parse_faf(data_rows).items():
                faf.setdefault(rw, pos)
    ad_runways = ad2 if isinstance(ad2, list) else (ad212_runways(ad2, icao, warnings) if ad2 else [])
    for r in ad_runways:                  # AVANT la lecture des pages : les points RWnn des tables RNP (« TF RW06 ») prennent le seuil d'atterrissage de la page AD 2.12
        coords.setdefault('RW' + r['id'], landing_position(r))
    for f in sorted(files):
        if not CODE_PAGE.match(f) or 'FASDB' in f:
            continue
        rows = rows_of(f)
        table = parse_code_table(rows) if detect_layout(rows) else None
        ok, problems, fp, layout = verify_page(rows, table)
        formats.append({'file': f, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems, **({} if ok else {'reason': page_reason(problems)})})
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
                if leg['id'] and leg['id'] not in coords and resolve and resolve(leg['id']):
                    coords[leg['id']] = resolve(leg['id'])
        recs, w = records(icao, table, coords, f, cycle, {'faf': faf, 'true': {r['id']: r.get('true') for r in ad_runways}})
        for m in table.get('point_merge', []):          # le système est le même sur toutes les pistes qui l'utilisent : une entrée, la liste des pistes
            e = merges.setdefault((m['name'], m['merge'], tuple(m['arc'])), {**m, 'runways': [], 'source': {'file': f}})
            e['runways'] = sorted(set(e['runways']) | set(table['runways']))
        have = {p['id'] for p in procs}
        for r in recs:
            if r['id'] in have:               # deux pages donnent le même identifiant (même nom, même piste) : la première est gardée
                warnings.append(f'{f}: {r["id"]} déjà lu à une page précédente, ignoré')
            else:
                have.add(r['id'])
                procs.append(r)
        warnings += [f'{f}: {x}' for x in w]
        used.append(f)
    # un bloc sans titre (procédure commencée en bas de la page précédente et reprise en tête de la suivante, LFPO SID RWY07 _05) qui
    # répète, point pour point, une procédure nommée du même type et de la même piste : c'est elle, il est retiré ; sinon il reste « NONAME »
    named = {(p['kind'], tuple(p['runways']), tuple(q['id'] for q in p['points'])) for p in procs if '.NONAME.' not in p['id']}
    for p in [p for p in procs if '.NONAME.' in p['id']]:
        if (p['kind'], tuple(p['runways']), tuple(q['id'] for q in p['points'])) in named:
            procs.remove(p)
            dropped.append({'id': p['id'], 'reason': 'name', 'file': p['source'].get('ref')})
            warnings.append(f'{p["source"].get("ref")}: bloc sans titre identique à une procédure nommée de la même piste, retiré ({p["id"]})')
        else:
            warnings.append(f'{p["source"].get("ref")}: bloc sans titre gardé sous {p["id"]}, À VÉRIFIER (aucune procédure nommée ne lui ressemble)')
    # la politique (proc_geometry.review) : une procédure sans nom, qui repasse par un point hors attente, qui fait un zigzag ou dont la géométrie imprimée ne colle pas avec les positions
    # n'est JAMAIS donnée pour sûre ni purgée : elle reste dans le fichier, statut « doubt » et la raison en code dans `doubt` ; le lecteur ne la sert que sur demande (SPEC § 5 quinquies,
    # { doubt: true }). Les positions encore absentes (points en route) sont celles qu'aerodb résout à la lecture : le contrôle les saute.
    for p in procs:
        warnings += [f'{p["source"].get("ref")}: {x}' for x in G.review(p, basis=BY_NAME['sia-code'].tolerances)]
    charts = [{'path': f'Cartes/{icao}/{f}', 'kind': chart_kind(f)} for f in sorted(files)]
    doc = {'schema': 1, 'icao': icao, 'cycle': cycle, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
           'procedures': procs, 'charts': {'base': base_url.rstrip('/') + '/html/eAIP/', 'items': charts, 'vac': vac},
           'pages': used, 'formats': formats, 'warnings': warnings}
    if merges:
        doc['point_merge'] = list(merges.values())
    if dropped:
        doc['dropped'] = dropped
    runways = ad_runways or runways_of(coords)       # la page AD 2.12 d'abord (complète) ; sinon les points RWnn positionnés par les pages DATA ou la base
    if runways:
        doc['runways'] = runways
    return doc


def runways_of(coords):
    """Pistes de l'aérodrome d'après les points RWnn dont la position est connue (page DATA ou base) : { id, lat, lon (seuil), elev null, qfu (numéro × 10, pas le relèvement mesuré), displaced /
    length / width null, source 'eaip' }, au format des fichiers du FAA CIFP (proc_cifp). Une piste dont le seuil n'est pas positionné n'y est pas : les pages DATA du SIA renvoient souvent
    les seuils à la page AD 2.12 (« REF AD 2 LFPO.12 + THR 02 »), qu'aucun constructeur ne lit ; aerodb déduit alors les pistes des listes `runways` des procédures."""
    out = []
    for k, v in sorted(coords.items()):
        m = re.fullmatch(r'RW(\d{2})([LRC]?)', k)
        if m and 1 <= int(m.group(1)) <= 36 and v and v[0] is not None:
            out.append({'id': m.group(1) + m.group(2), 'lat': v[0], 'lon': v[1], 'elev': None, 'qfu': int(m.group(1)) * 10, 'displaced': None, 'length': None, 'width': None,
                        'source': 'eaip'})
    return out


def landing_position(r):
    """(lat, lon) du point d'atterrissage d'une piste de ad212_runways, celui que les tables de codage appellent RWnn : le seuil décalé (DTHR) quand la piste en a un, sinon le seuil (THR).
    Mesure (29 octobre 2026, cycle 2026-10-01, tronçons « TF RWnn » des pages RNP, distance calculée depuis le point précédent moins distance imprimée) : Orly 06, THR −0,20 NM contre DTHR −0,03 NM ;
    Orly 25, THR −0,31 NM contre DTHR −0,08 NM ; les huit autres pistes, sans seuil décalé, s'accordent à ±0,06 NM (la page imprime le dixième de NM) : le THR s'écarte de 3 à 4 fois cet
    arrondi, le DTHR s'y tient. Le point RWnn des tables est donc l'extrémité de la zone d'atterrissage, pas le début de la piste."""
    d = r.get('dthr')
    return (d['lat'], d['lon']) if d else (r['lat'], r['lon'])


class _SectionTables(HTMLParser):
    """Les tableaux d'UNE section de la page AD 2 (la `<div id="LFPO-AD-2.12">`), chacun une liste de lignes, chaque ligne une liste de cellules en texte : les `<br/>` y deviennent
    un retour à la ligne, les autres espacements une seule espace. La section est repérée par son identifiant et suivie par la profondeur des `<div>` : rien d'autre de la page n'est lu."""

    def __init__(self, section_id):
        super().__init__(convert_charrefs=True)
        self.section_id, self.depth, self.tables, self.row, self.cell = section_id, 0, [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'div':
            if self.depth:
                self.depth += 1
            elif dict(attrs).get('id') == self.section_id:
                self.depth = 1
            return
        if not self.depth:
            return
        if tag == 'table':
            self.tables.append([])
        elif tag == 'tr' and self.tables:
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = []
        elif tag == 'br' and self.cell is not None:
            self.cell.append('\n')

    def handle_endtag(self, tag):
        if tag == 'div' and self.depth:
            self.depth -= 1
        elif tag in ('td', 'th') and self.cell is not None and self.row is not None:
            text = ''.join(self.cell).replace('\xa0', ' ')
            self.row.append('\n'.join(' '.join(part.split()) for part in text.split('\n')).strip())
            self.cell = None
        elif tag == 'tr' and self.row is not None and self.tables:
            self.tables[-1].append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)


_D = r'[°º˚]'
_SEC = r'''\s*(?:["″”]|'')?'''
_THR_LAT = re.compile(rf"(\d{{2}})\s*{_D}\s*(\d{{2}})\s*['′’]\s*(\d{{2}}(?:[.,]\d+)?){_SEC}\s*([NS])")
_THR_LON = re.compile(rf"(\d{{3}})\s*{_D}\s*(\d{{2}})\s*['′’]\s*(\d{{2}}(?:[.,]\d+)?){_SEC}\s*([EW])")
_THR_POS = re.compile(_THR_LAT.pattern + r'\s*[/,;]?\s*' + _THR_LON.pattern)


def _pos_of(m):
    """(lat, lon) en degrés décimaux d'une `_THR_POS` (latitude puis longitude), ou None si minutes ou secondes ≥ 60 ou degrés hors limites."""
    g = m.groups()
    out = []
    for k, (hemi_neg, top) in enumerate((('S', 90), ('W', 180))):
        d, mi, se, h = g[4 * k], g[4 * k + 1], g[4 * k + 2], g[4 * k + 3]
        d, mi, se = int(d), int(mi), float(se.replace(',', '.'))
        if mi >= 60 or se >= 60 or d > top:
            return None
        v = d + mi / 60 + se / 3600
        out.append(round(-v if h == hemi_neg else v, 6))
    return tuple(out)


def ad212_runways(html, icao=None, warnings=None):
    """Pistes de la section « AD 2.12 Caractéristiques physiques des pistes / Runway physical characteristics » de la page AD 2 du SIA (FR-AD-2.<OACI>-fr-FR.html), seule source qui
    positionne les seuils (les pages DATA y renvoient : « REF AD 2 LFPO.12 + THR 02 »). Rend [{ id, lat, lon (THR), elev (ft, THR), qfu (cap magnétique imprimé, °), true (cap vrai), length, width (m),
    displaced (ft, 0 sans seuil décalé : le même champ que le CIFP), dthr: None | { lat, lon, elev } (le seuil décalé, DTHR, imprimé entre parenthèses sous le THR), source: 'eaip' }]. La section est repérée par son identifiant (`<div id="LFPO-AD-2.12">`), le
    tableau par l'en-tête de ses colonnes (« Position GEO THR », « THR elevation »…), jamais par la place d'une cellule ; une valeur qui ne se lit pas reste None. Rien n'est deviné : une piste dont la
    position du THR ne se lit pas, ou dont le cap vrai s'écarte de plus de 30° du numéro, est écartée et signalée dans `warnings` (liste, facultative)."""
    warn = (warnings if warnings is not None else []).append
    if not icao:
        found = re.search(r'id="([A-Z0-9]{3,4})-AD-2\.12"', html or '')
        icao = found.group(1) if found else None
    if not icao:
        warn('AD 2.12: section introuvable (aucun identifiant « <OACI>-AD-2.12 » dans la page)')
        return []
    parser = _SectionTables(f'{icao}-AD-2.12')
    parser.feed(html)
    out, seen_table = [], False
    for rows in parser.tables:
        head = next((r for r in rows if any(re.search(r'(?i)position', c) for c in r)), None)
        if head is None:
            continue
        seen_table = True
        col = {}
        for i, c in enumerate(head):
            if re.search(r'(?i)elevation|élévation|altitude', c):
                col.setdefault('elev', i)
            elif re.search(r'(?i)position', c):
                col.setdefault('pos', i)
            elif re.search(r'(?i)bearing|relèvement|gisement', c):
                col.setdefault('brg', i)
            elif re.search(r'(?i)dimensions', c) and not re.search(r'(?i)swy|cwy|strip', c):
                col.setdefault('dim', i)
        if 'pos' not in col or 'brg' not in col:
            warn('AD 2.12: en-têtes du tableau des pistes non reconnus (colonnes « position » et « bearing » introuvables): pistes NON lues')
            continue
        for r in rows[rows.index(head) + 1:]:
            if not r or not re.fullmatch(r'\d{2}[LRC]?', r[0] or ''):
                continue
            rid, cell = r[0], lambda k: r[col[k]] if k in col and col[k] < len(r) else ''
            pairs = list(_THR_POS.finditer(cell('pos')))
            pos = _pos_of(pairs[0]) if pairs else None
            if not pos:
                warn(f'AD 2.12: piste {rid}: position du seuil (THR) illisible, piste écartée')
                continue
            brg = re.match(r'\s*(\d{1,3}(?:[.,]\d+)?)', cell('brg'))
            mag = re.search(r'\(\s*(\d{1,3})\s*\)', cell('brg'))
            true = float(brg.group(1).replace(',', '.')) if brg else None
            if true is not None and abs((true - int(rid[:2]) * 10 + 180) % 360 - 180) > 30:
                warn(f'AD 2.12: piste {rid}: cap vrai {true}° incompatible avec le numéro, piste écartée')
                continue
            dim = re.search(r'(\d{3,5})\s*x\s*(\d{2,3})', cell('dim'))
            elev = re.search(r'(?<![A-Z])THR\s*:\s*(-?\d+)\s*ft', cell('elev'), re.I)
            displaced, dthr = 0, None
            if len(pairs) > 1 and '(' in cell('pos')[pairs[0].end():pairs[1].start()]:
                dpos = _pos_of(pairs[1])
                if dpos:
                    delev = re.search(r'DTHR\s*:\s*(-?\d+)\s*ft', cell('elev'), re.I)
                    dthr = {'lat': dpos[0], 'lon': dpos[1], 'elev': int(delev.group(1)) if delev else None}
                    # distance THR → DTHR en pieds, comme le champ `displaced` du CIFP (un seul type pour toutes les sources)
                    la1, la2, dl = math.radians(pos[0]), math.radians(dpos[0]), math.radians(dpos[1] - pos[1])
                    displaced = round(math.degrees(math.acos(min(1, math.sin(la1) * math.sin(la2) + math.cos(la1) * math.cos(la2) * math.cos(dl)))) * 60
                                      * 6076.12)
                else:
                    warn(f'AD 2.12: piste {rid}: position du seuil décalé (DTHR) illisible, seuil décalé ignoré')
            out.append({'id': rid, 'lat': pos[0], 'lon': pos[1], 'elev': int(elev.group(1)) if elev else None, 'qfu': int(mag.group(1)) if mag else None, 'true': true,
                        'length': int(dim.group(1)) if dim else None, 'width': int(dim.group(2)) if dim else None, 'displaced': displaced, 'dthr': dthr, 'source': 'eaip'})
    if not seen_table:
        warn('AD 2.12: tableau des pistes introuvable dans la section')
    return out


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
    with outbound.urlopen(urllib.request.Request(url), timeout=timeout) as r:
        return r.read()


def pdf_names(icao, page_html, skipped=None):
    """Noms des PDF de Cartes/<OACI>/ cités par la page de l'aérodrome. Un nom qui n'est pas un simple nom de fichier (une barre oblique ou inverse, `..`, tout ce qui sort de [A-Za-z0-9._-]) n'est pas gardé : la page
    est celle d'un serveur, ses noms ne deviennent jamais un chemin ; les noms refusés sont ajoutés à `skipped` (une liste) pour que le lecteur le dise."""
    names = sorted(set(re.findall(rf'Cartes/{icao}/([^"\'<>]+?\.pdf)', page_html)))
    if skipped is not None:
        skipped += [n for n in names if not PDF_NAME.fullmatch(n)]
    return [n for n in names if PDF_NAME.fullmatch(n)]


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


MONTHS_EN = tuple(MONTHS)    # JAN … DEC, dans l'ordre : le mois d'une adresse eAIP s'écrit en anglais, jamais dans la langue du poste


def eaip_url(cycle):
    """Dossier AIRAC de l'eAIP du SIA d'un cycle donné par sa date (« 2026-10-01 ») : …/media/dvd/eAIP_01_OCT_2026/FRANCE/AIRAC-2026-10-01.
    Même adresse que eaipBase() de frame/aerodb/catalogue.js."""
    m = re.fullmatch(r'(\d{4})-(\d{2})-(\d{2})', str(cycle))
    if not m or not 1 <= int(m.group(2)) <= 12:
        raise ValueError(f'cycle AIRAC « AAAA-MM-JJ » attendu, reçu : {cycle!r}')
    y, mo, d = m.groups()
    return f'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_{d}_{MONTHS_EN[int(mo) - 1]}_{y}/FRANCE/AIRAC-{y}-{mo}-{d}'


def url_exists(url, timeout=30):
    """L'adresse répond-elle à une requête HEAD ? (faux au moindre échec : sert à savoir si une carte est publiée)."""
    try:
        outbound.urlopen(urllib.request.Request(url, method='HEAD'), timeout=timeout, absent_ok=True)  # une carte absente n'est pas un échec
        return True
    except Exception:
        return False


def page_name(icao):
    """Nom de la page AD 2 d'un terrain dans l'eAIP, et dans le cache du poste (download_aerodrome)."""
    return f'FR-AD-2.{icao}-fr-FR.html'


def download_aerodrome(eaip, icao, cache, get=None):
    """Télécharge seulement (sans rien lire) ce que read_aerodrome lira d'UN terrain : sa page AD 2 et les PDF de ses tables de codage et
    pages DATA, dans `cache` (le dossier du cycle) ; un fichier déjà là n'est pas redemandé. Rend { fetched, unchanged, tables } (tables faux :
    la page ne cite aucune table de codage, rien d'autre n'est demandé). `get(url)` : les octets d'une adresse (fetch par défaut)."""
    if not ICAO_RE.fullmatch(str(icao)):
        raise ValueError(f'code OACI refusé : {icao!r} (quatre lettres ou chiffres)')
    get, cache = get or fetch, Path(cache)
    fetched = unchanged = 0
    page_file = cache / page_name(icao)
    if page_file.is_file():
        page, unchanged = page_file.read_bytes(), unchanged + 1
    else:
        page = get(f'{eaip}/html/eAIP/{page_name(icao)}')
        tmp = page_file.with_suffix('.tmp')
        tmp.write_bytes(page)
        tmp.replace(page_file)
        fetched += 1
    files = pdf_names(icao, page.decode('utf-8', 'replace'))
    if not any(CODE_PAGE.match(f) for f in files):
        return {'fetched': fetched, 'unchanged': unchanged, 'tables': False}
    for name in [f for f in files if re.search(r'_DATA_0\d\.pdf$', f) or (CODE_PAGE.match(f) and 'FASDB' not in f)]:
        p = safe_path(cache, name)  # le nom vient d'une page du serveur : un nom sûr, sous le dossier du cache
        if p.exists():
            unchanged += 1
            continue
        body = get(f'{eaip}/html/eAIP/Cartes/{icao}/{name}')
        tmp = p.with_suffix('.tmp')
        tmp.write_bytes(body)
        tmp.replace(p)
        fetched += 1
    return {'fetched': fetched, 'unchanged': unchanged, 'tables': True}


def read_aerodrome(eaip, icao, cache, resolve=None, say=print, rows_dir=None, step=None, get=None, vac_exists=None):
    """Fichier d'UN terrain lu dans l'eAIP (page AD 2, pages DATA et CODE) : build_aerodrome, ou None si la page ne cite aucune table de
    codage (rien à lire : cartes seules). `eaip` : dossier AIRAC (…/FRANCE/AIRAC-AAAA-MM-JJ) ; `cache` : dossier (existant) des PDF déjà
    téléchargés ; `resolve(id)` : position d'un point en route ; `say(texte)` : messages ; `rows_dir` : lignes de chaque PDF (fixtures) ;
    `step(texte, fait, total)` : avancement (le lanceur) ; `get(url)` : les octets d'une adresse (fetch par défaut ; le travail proc/build
    passe une lecture du cache seul) ; `vac_exists(url)` : la carte VAC est-elle publiée (url_exists par défaut). Les erreurs réseau (urllib)
    et pypdf manquant remontent à l'appelant."""
    if not ICAO_RE.fullmatch(str(icao)):
        raise ValueError(f'code OACI refusé : {icao!r} (quatre lettres ou chiffres)')
    get, vac_exists = get or fetch, vac_exists or url_exists
    cycle = AIRAC_IN_URL.search(eaip)
    if not cycle:
        raise ValueError('adresse sans « AIRAC-AAAA-MM-JJ »: cycle inconnu')
    cache = Path(cache)
    if step:
        step(f'{icao}: page AD 2', 0, 0)
    page = get(f'{eaip}/html/eAIP/{page_name(icao)}').decode('utf-8', 'replace')
    skipped = []
    files = pdf_names(icao, page, skipped)
    for n in skipped:
        say(f'{icao}: nom de PDF refusé (pas un simple nom de fichier), ignoré : {n[:80]!r}')
    if not any(CODE_PAGE.match(f) for f in files):      # rien à lire (cartes seules) : pas de fichier
        say(f'{icao}: aucune table de codage')
        return None
    wanted = [f for f in files if re.search(r'_DATA_0\d\.pdf$', f) or (CODE_PAGE.match(f) and 'FASDB' not in f)]
    seen = set()

    def rows_of(name):
        p = safe_path(cache, name)                    # le nom vient d'une page du serveur : un nom sûr, sous le dossier du cache
        if step:
            step(f'{icao}: {name}', len(seen), len(wanted))
        seen.add(name)
        if not p.exists():
            p.write_bytes(get(f'{eaip}/html/eAIP/Cartes/{icao}/{name}'))
        try:
            rows = first_page_rows(p)
        except PdfTimeout as e:                       # document non lu : signalé, la page est vide pour le constructeur
            say(f'{icao}: {e}')
            rows = []
        if rows_dir:
            Path(rows_dir).mkdir(parents=True, exist_ok=True)
            (Path(rows_dir) / (p.stem + '.rows.txt')).write_text('\n'.join(rows) + '\n', encoding='utf-8')
        return rows
    vac = vac_url(eaip, icao)
    if vac and not vac_exists(vac):                      # carte VAC : seulement si l'atlas VFR la publie
        vac = None
    return build_aerodrome(icao, files, rows_of, eaip, cycle.group(1), resolve, vac, page)       # la page AD 2 déjà lue donne aussi les pistes (section AD 2.12)


def default_cache():
    """Le dossier des PDF téléchargés quand --cache manque : le cache du travail du lanceur, <dépôt>/data/local/eaip (jamais publié), si le dossier des données existe ; sinon `.proc_cache` dans le
    dossier courant (ignoré par Git)."""
    data = Path(__file__).resolve().parent.parent / 'data'
    return str(data / 'local' / 'eaip') if data.is_dir() else '.proc_cache'


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):              # console cp1252 : un caractère exotique ne doit pas faire échouer l'affichage
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
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
        if not ICAO_RE.fullmatch(a.icao[0].upper()):
            raise SystemExit(f'code OACI refusé : {a.icao[0]!r} (quatre lettres ou chiffres, comme EGLL)')
        names = sorted(f.name for f in Path(a.pdf_dir).glob('*.pdf'))
        doc = build_pdf_dir(a.icao[0].upper(), names, lambda n: pdf_pages(Path(a.pdf_dir) / n), a.cycle)
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
    cache = Path(a.cache or default_cache()) / cycle
    cache.mkdir(parents=True, exist_ok=True)
    resolve, docs, bad_pages = base_resolver(a.base_dir), {}, []
    codes = [i.upper() for i in a.icao]
    wrong = [i for i in codes if not ICAO_RE.fullmatch(i)]
    if wrong:
        raise SystemExit(f'code OACI refusé : {wrong[0]!r} (quatre lettres ou chiffres, comme LFBD)')
    if a.all:
        codes = icao_list(fetch(f'{a.eaip}/html/eAIP/FR-menu-fr-FR.html').decode('utf-8', 'replace'))
    if not codes:
        raise SystemExit('aucun terrain: donner des codes OACI ou --all')
    for n, icao in enumerate(codes):
        if n and a.delay:
            time.sleep(a.delay)
        d = read_aerodrome(a.eaip, icao, cache, resolve, lambda *t: print(*t, file=sys.stderr), a.rows_dir)   # le corps par terrain, partagé avec le travail du lanceur (regen_jobs._eaip_fetch)
        if d is None:
            continue
        docs[icao] = d
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
