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
    try:       # pages à ~700 000 opérations de tracé : « LimitReachedError » au-delà de la limite par défaut (pypdf récent seulement ; sinon on ignore)
        from pypdf._configuration import overwrite_configuration
        overwrite_configuration(stream_parsing_work_maximum_count=50_000_000)
    except Exception:
        pass
    import logging
    logging.getLogger('pypdf').setLevel(logging.ERROR)    # l'avertissement « fontTools is required » (polices Type1) se répète à chaque page et n'apprend rien
    return PdfReader(str(path))


def _shifted(text):
    """Polices à codes de caractères décalés de −29 (LA, RP) : les lettres sortent en bruit (« 51$9 » pour RNAV) et les chiffres tombent dans la zone de contrôle 0x13–0x1F,
    que la lecture efface. Heuristique FRAGILE : un fragment dont ≥ 60 % des caractères sont dans 0x13–0x64 et qui porte au moins un caractère 0x13–0x1F est décodé par
    chr(c+29) (codes 0x13–0x64) ; sa police l'est alors pour toute la page (les mots sans chiffre, « Serial Path », n'ont aucun contrôle) ; les contrôles de la suite (formats de lignes, en-têtes) refusent ce qui ne ressemble à rien."""
    n = sum(0x13 <= ord(ch) <= 0x64 for ch in text)
    return n >= 0.6 * len(text) and any(0x13 <= ord(ch) < 0x20 for ch in text)


def _unshift(text):
    """Décode un fragment à codes décalés de −29 (voir `_shifted`) : chr(c+29) pour les codes 0x13–0x64."""
    return ''.join(chr(ord(ch) + 29) if 0x13 <= ord(ch) <= 0x64 else ch for ch in text)


def pdf_pages(path, timeout=None):
    """Lignes de TOUTES les pages d'un PDF : liste (une par page) de listes de lignes ; une page illisible donne [] (rien n'est deviné).
    Lu dans un processus séparé, au plus PDF_TIMEOUT s (limited) : PdfTimeout sinon."""
    return pdf_some_pages(path, None, timeout)[1]


def rows_from_pdf(path, page=0, reader=None):
    """Lignes de texte d'une page PDF (la première), du haut vers le bas : fragments regroupés par ordonnée (2,5 pt) puis
    triés par abscisse. pypdf manque : message clair. Chaque ligne est une chaîne de mots séparés par une espace."""
    if reader is None:
        reader = pdf_reader(path)
    frags, fonts = [], set()
    page = reader.pages[page]

    def visit(text, cm, tm, fd, fs):
        if text.strip():
            font = str((fd or {}).get('/BaseFont'))
            if _shifted(text):
                fonts.add(font)
            text = (font, text)
            # certaines tables sont tournées dans le flux de texte (paysage) : les lignes avancent le long de x ou de y
            if abs(tm[1]) > abs(tm[0]):
                r, c = (tm[4], tm[5]) if tm[1] > 0 else (-tm[4], -tm[5])
            else:
                r, c = (-tm[5], tm[4]) if tm[0] > 0 else (tm[5], -tm[4])
            frags.append((r, c, len(frags), text))
    page.extract_text(visitor_text=visit)
    # caractères de police illisibles (contrôle, zone privée): effacés
    frags = [(r, c, i, re.sub(r'[\x00-\x1f-]', ' ', _unshift(t[1]) if (t[0] in fonts or _shifted(t[1])) else t[1])) for r, c, i, t in frags]
    rows = []
    for y, x, i, t in sorted(frags, key=lambda f: (f[0], f[1], f[2])):
        if rows and abs(rows[-1][0] - y) <= 2.5:
            rows[-1][1].append((x, i, t))
        else:
            rows.append([y, [(x, i, t)]])
    return [' '.join(' '.join(t for _, _, t in sorted(r)).split()) for _, r in rows]


PDF_TIMEOUT = 60  # secondes au plus par document lu par pypdf (pdf_pages, pdf_kind)


class PdfTimeout(Exception):
    """Lecture d'un PDF abandonnée : délai dépassé, processus de lecture tombé ou document illisible."""


def _pages_of(path, which):
    """(nombre de pages, lignes des pages demandées) : le travail de pdf_pages, fait dans le processus de lecture."""
    reader = pdf_reader(path)
    n = len(reader.pages)
    out = []
    for i in (range(n) if which is None else [i for i in which if 0 <= i < n]):
        try:
            out.append(rows_from_pdf(path, i, reader))
        except Exception:                            # une page illisible n'arrête pas la lecture : [] (rien n'est deviné)
            out.append([])
    return n, out


def _child(module, task, args, kw, conn):
    """Processus de lecture : fait `module.task(*args, **kw)` et renvoie (nature, résultat ou message)."""
    try:
        import importlib
        conn.send(('ok', getattr(importlib.import_module(module), task)(*args, **kw)))
    except SystemExit as e:
        conn.send(('exit', str(e)))
    except Exception as e:
        conn.send(('err', f'{type(e).__name__}: {e}'))
    finally:
        conn.close()


def limited(task, path, *args, timeout=None, module=None, **kw):
    """Fait `task(path, *args)` (une fonction de lecture de `module`, ce module par défaut : pypdf, pypdfium2, OCR) dans un PROCESSUS SÉPARÉ, au plus
    `timeout` s (PDF_TIMEOUT par défaut) : un PDF piégé ou démesuré ne bloque pas l'outil, il lève PdfTimeout et le processus est arrêté ; une
    dépendance facultative qui manque : SystemExit. Bibliothèque standard ; le module doit être importable (dossier tools/ dans sys.path)."""
    import multiprocessing as mp
    timeout = PDF_TIMEOUT if timeout is None else timeout
    a, b = mp.Pipe(duplex=False)
    proc = mp.Process(target=_child, args=(module or (__name__ if __name__ != '__main__' else 'proc_eaip'), task, (str(path), *args), kw, b), daemon=True)
    proc.start()
    b.close()
    try:
        if not a.poll(timeout):
            raise PdfTimeout(f'{Path(path).name}: lecture abandonnée après {timeout} s')
        try:
            kind, val = a.recv()
        except EOFError:
            raise PdfTimeout(f'{Path(path).name}: le processus de lecture s\'est arrêté sans réponse') from None
    finally:
        if proc.is_alive():
            proc.terminate()
        proc.join(5)
        a.close()
    if kind == 'exit':
        raise SystemExit(val)
    if kind == 'err':
        raise PdfTimeout(f'{Path(path).name}: {val}')
    return val


def pdf_some_pages(path, which=None, timeout=None):
    """(nombre de pages, [lignes de chaque page demandée]) d'un PDF, lu sous délai (limited). `which` : numéros à partir de 0 (None : toutes)."""
    return tuple(limited('_pages_of', path, which, timeout=timeout))


def first_page_rows(path):
    """Lignes de la première page d'un PDF, lue sous délai (pdf_pages)."""
    _, pages = pdf_some_pages(path, [0])
    return pages[0] if pages else []


def pdf_kind(path, timeout=None):
    """classify_pdf sous délai (limited)."""
    return limited('classify_pdf', path, timeout=timeout)


def classify_pdf(path):
    """Nature d'un PDF d'AIP d'après TOUTES ses pages (la première est souvent une carte, le tableau de codage vient à la page 2 ou plus) : par page, 'text' (couche de texte lisible :
    disposition reconnue ou ≥ 15 lignes), 'vector' (texte dessiné en tracés), 'image', 'sparse' (presque rien). Le document prend la nature de sa MEILLEURE page (`table_page`, à partir
    de 1 : disposition reconnue d'abord, puis le plus de lignes) ; `page_kinds` donne la nature de chaque page. Sert au relevé des États (tools/proc_ead.py --survey)."""
    reader = pdf_reader(path)
    per = []
    for i, page in enumerate(reader.pages):
        try:                                                 # AVANT la lecture du texte : elle transforme le flux de la page en cache
            cs = page.get_contents()
            data = cs.get_data() if cs is not None else b''
            paths = len(re.findall(rb'(?<=\s)(?:re|l|c|m)(?=\s)', data))
        except Exception:
            paths = 0
        try:
            images = len(page.images)
        except Exception:
            images = 0
        try:
            rows = rows_from_pdf(path, i, reader)
        except Exception:
            rows = []
        layout = detect_layout(rows)
        kind = 'text' if (layout in PARSERS or len(rows) >= 15) else 'vector' if paths > 2000 else 'image' if images else 'sparse'
        per.append({'rows': rows, 'paths': paths, 'images': images, 'layout': layout, 'kind': kind})
    if not per:
        return {'pages': 0, 'text_rows': 0, 'path_ops': 0, 'images': 0, 'kind': 'sparse', 'layout': None, 'fingerprint': None, 'table_page': None, 'page_kinds': []}
    best = max(range(len(per)), key=lambda i: (per[i]['layout'] in PARSERS, per[i]['kind'] == 'text', len(per[i]['rows']) if per[i]['kind'] == 'text' else per[i]['paths'], -i))
    p = per[best]
    return {'pages': len(per), 'text_rows': len(p['rows']), 'path_ops': p['paths'], 'images': p['images'], 'kind': p['kind'], 'layout': p['layout'], 'fingerprint': fingerprint(p['rows']),
            'table_page': best + 1, 'page_kinds': [x['kind'] for x in per]}


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
    total, pages = pdf_some_pages(path, [n - 1])
    if not 1 <= n <= total:
        raise SystemExit(f'page {n} hors du document ({total} page(s))')
    rows = pages[0]
    report(f'Page {n}: {len(rows)} ligne(s)')
    for line in format_rows(rows):
        report(line)


def scan_pdf(path, report=print):
    """Repère dans un PDF d'AIP (une partie AD 2 entière) les pages à tableau de tronçons (« Path Terminator »…) : titres et mots-clés seulement."""
    if not Path(path).is_file():
        near = sorted(str(f) for f in Path(path).parent.glob('*.pdf*')) if Path(path).parent.is_dir() else []
        raise SystemExit(f'fichier introuvable: {path}' + (f'. PDF présents dans {Path(path).parent}: ' + ', '.join(near) if near else ''))
    try:
        pages = [r or ['(page illisible)'] for r in pdf_pages(path)]   # une page illisible n'arrête pas le repérage
    except PdfTimeout as e:
        raise SystemExit(f'lecture impossible: {e}') from None
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
    if 'arrival coding tables' in low or 'standard instrument arrival' in low and 'coding' in low:       # Royaume-Uni : tables de codage des STAR (dessinées en vecteurs, lues par OCR)
        if 'designator' in low and 'sequence' in low and 'co-ordinates' in low:
            return 'uk-star'
    if 'transition coding table' in low and 'designator' in low and 'path' in low and 'terminator' in low:       # Autriche : tables de codage des transitions RNAV (OCR)
        return 'at-coding'
    if re.search(r'rnav\s*\d\s+(?:star|sid)\s+coding\s+table\s*:', low) and 'path' in low and 'terminator' in low:       # Slovaquie : « RNAV 1 STAR Coding Table: <désignateur> » (avant 'sia-code')
        return 'at-coding'
    if 'waypoints coordinates' in low and 'role of the' in low and 'terminator' in low:       # Belgique : carte IAC « ARINC CODING » (vecteurs, OCR) : liste de points puis tronçons
        return 'be-coding'
    if re.search(r'transition coding tables?\s*-\s*rwy', low) and 'identifier' in low and 'terminator' in low and 'designator' not in low:       # Géorgie : une table par transition (OCR)
        return 'ge-coding'
    if 'coding table of' in low and 'designator' in low and 'route' in low and 'terminator' in low and 'coordinates' in low:       # Arménie : tables par procédure, cellules éclatées
        return 'am-coding'
    words = set(re.findall(r'[a-z]+', low))
    if {'path', 'terminator', 'latitude', 'longitude', 'wpt', 'name', 'upper', 'lower', 'speed', 'limit'} <= words and 'true track' in low and 'magnetic track' in low \
            and re.search(r'fly\s*-\s*by', low):      # Irlande : tableau sur une ligne avec coordonnées
        return 'ei-coding'
    if ('serial number' in low or 'serial no' in low or 'recommended coding tables' in low or 'tabular description' in low or {'magnetic', 'variation'} <= words) \
            and 'path' in words and ('descriptor' in words or 'terminator' in words) and {'waypoint', 'fly', 'course', 'navigation', 'specification'} <= words:
        return 'icao-tab'      # table ICAO imprimée sans coordonnées sur les lignes (Islande, Lituanie, Croatie, Italie, Albanie, Philippines)
    if 'designator' in low and 'significant' in low and 'points' in low and 'track' in low and re.search(r'\bdist', low) and re.search(r'\balt', low) \
            and 'terminator' not in low and 'waypoint' not in low:       # routes SID / STAR décrites en texte, sans coordonnées : Allemagne, Moldavie, Portugal, Pologne
        return 'de-route'
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
KNOWN_FINGERPRINTS = {'sia-code': {'4d7d8e47d5', '96546cf4c0', 'de5a236c1c'}, 'uk-app': {'fc0e4cc8ff'}, 'am-coding': set(), 'de-route': set(), 'uk-star': set(), 'at-coding': set(), 'be-coding': set(), 'ge-coding': set(), 'icao-tab': set(), 'ei-coding': set()}


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


def parse_be_coding(rows):
    """Page « <TYPE> ARINC CODING » de la Belgique (carte IAC dont le codage est dessiné en vecteurs : lue par OCR) → { kind: 'APP', tables: [{ title, kind, name, runways, transition,
    legs }], warnings }. Une table commence à chaque « WAYPOINTS COORDINATES » : la liste des points (« BE123: 50°44.12' N 004°21.34'E - IAF »), puis les tronçons, un par ligne :
    « 003 TF BE123 FAF 12.3 @ 3000 -3.00% » (séquence, type, point, rôle, cap vrai, contrainte d'altitude, vitesse « 210Kts », angle vertical). Ni distance ni cap magnétique ne sont
    imprimés : la porte géométrique ne vérifie que le cap vrai. Les coordonnées viennent de la liste de la table ; un point absent de la liste, ou un TF sans cap vrai, fait rejeter
    la table (« NON retenue »), rien n'est complété. Le titre (« EBBE RNP RWY 09R COORDINATES AND CODING ») nomme la première table ; une table sans titre est nommée d'après
    son point de piste (RWnn). Survol : colonne non lue, `over` None."""
    warnings, tables = [], []
    starts = [i for i, r in enumerate(rows) if re.search(r'(?i)waypoints\s+coordinates', r)]
    titles = [(i, m) for i, r in enumerate(rows) for m in [BE_TITLE.search(r)] if m and re.search(r'(?i)coordinates\s+and\s+coding', r)]
    word = titles[0][1].group(1) if titles else 'RNP'
    for n, s in enumerate(starts):
        end = starts[n + 1] if n + 1 < len(starts) else len(rows)
        block = rows[s:end]
        coords = be_coords(block)
        legs, bad, missed = [], [], False
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
            true = next((float(t) for t in toks if re.fullmatch(r'\d{3}\.\d', t)), None)
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
            if c is None:
                bad.append(f'{ident}: absent de la liste des coordonnées')
            elif tt == 'TF' and true is None:
                bad.append(f'{ident}: tronçon TF sans cap vrai')
            legs.append({'id': ident, 'leg': tt, 'over': None, 'alt': alt, 'kt': int(kt.group(1)) if kt else None, 'lat': c[0] if c else None, 'lon': c[1] if c else None,
                         'crs': None, 'true': true, 'nm': None, 'turn': None, 'seq': len(legs) + 1, 'remark': 'MAPt' if 'MAPT' in role.upper() else ''})
        rw = next((lg['id'] for lg in legs if re.fullmatch(r'RW\d{2}[LRC]?', lg['id'])), None)
        near = [t for t in titles if starts[n - 1] < t[0] < s] if n else [t for t in titles if t[0] < s]
        if near:
            name, runways = f'{near[-1][1].group(1)} RWY {near[-1][1].group(2)}', [near[-1][1].group(2)]
        elif rw:
            name, runways = f'{word} RWY {rw[2:]}', [rw[2:]]
        else:
            name, runways = f'{word} RWY ?', []
        label = f'{name} (table {n + 1})'
        if bad or len(legs) < 2 or legs[0]['leg'] != 'IF':
            warnings.append(f'{label}: {len(legs)} tronçon(s) lu(s)' + (f' ({"; ".join(bad[:3])})' if bad else ', premier tronçon IF attendu') + ', table NON retenue')
            continue
        tables.append({'title': label, 'kind': 'APP', 'name': name, 'runways': runways, 'transition': None, 'legs': legs})
    return {'kind': 'APP', 'tables': tables, 'warnings': warnings}


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
EI_TITLE = re.compile(r'^(\S+)\s+CAT\s+[A-D](?:\s*/\s*[A-D])*\s+(.+)$')
EI_SHORT = re.compile(r'^[A-Z]{2,6} ?\d[A-Z]$')
EI_ROW = re.compile(r'^(R(?:NAV|NP)\s*(?:\d+(?:\.\d+)?|APCH|AR)?)\s+([A-Z]{2})\s+([A-Z0-9]{2,7})\s+(\d(?:\s?\d){5}(?:\.\d+)?)\s*([NS])?\s*/\s*(\d(?:\s?\d){6}(?:\.\d+)?)\s*([EW])?\s+(.*)$')
EI_LIM = r'(?:-|FL ?\d{2,3}|\d{3,5})'
EI_CELLS = re.compile(r'^(Fly ?- ?By|Fly ?- ?Over|-)\s+(\d{1,3}(?:\.\d+)?|-)\s+(?:(\d{3}(?:\.\d+)?)\s*/\s*(\d{3}(?:\.\d+)?)|-(?:\s*/\s*-)?)\s+(?:(' + EI_LIM + r')\s*/\s*(' + EI_LIM + r')|-)\s+(\d{2,3}|-)(?:\s+(.*))?$', re.I)


def _ei_deg(digits, hemi, lon):
    """« 0074918.3 » (chiffres éventuellement séparés) et hémisphère → degrés décimaux."""
    s = re.sub(r'\s', '', digits)
    d = 3 if lon else 2
    v = int(s[:d]) + int(s[d:d + 2]) / 60 + float(s[d + 2:]) / 3600
    return round(-v if hemi in ('S', 'W') else v, 6)


def parse_ei_coding(rows):
    """Table de codage de l'Irlande (vue le 28 octobre 2026) : un tronçon par ligne avec les coordonnées « RNAV 1 TF GIVOL 520440.4 / 0082549.6 Fly - By 29.5 311.6 / 315 - / 6000 - - »
    → { kind: 'MIXED', tables: [{ title, kind, name, runways, transition, legs }], warnings }. Bloc : « ELTIG1R CAT A/B/C/D STAR RWY16 » (type et piste), « ELTI1R » (désignateur court), un
    en-tête sur 3 lignes (hémisphères dans « Latitude (N), Longitude (W) »), puis les lignes. Les groupes de chiffres éclatés d'une coordonnée sont rejoints. Cap vrai / magnétique, distance et
    coordonnées sont lus (cap et distance sont ensuite contrôlés par check_geometry) ; limite supérieure = maximum, inférieure = minimum, égales = à l'altitude. Une ligne illisible rejette le bloc."""
    warnings, tables, blocks, cur = [], [], [], None
    for i, r in enumerate(' '.join(re.sub('[' + DASHES + ']', '-', x).replace('T F', 'TF').split()) for x in rows):
        m = EI_TITLE.match(r)
        if m and not r.startswith(('RNAV', 'RNP')) and i + 1 < len(rows) and EI_SHORT.match(rows[i + 1].strip()):
            cur = {'title': r, 'name': rows[i + 1].strip(), 'head': [], 'rows': [], 'open': True}
            blocks.append(cur)
        elif cur is not None and cur['open'] and not EI_SHORT.match(r):
            if re.match(r'^R(?:NAV|NP)\b', r):
                cur['rows'].append(r)
            elif cur['rows']:
                cur['open'] = False
            else:
                cur['head'].append(r)
    for b in blocks:
        head = ' '.join(b['head'])
        hs = re.search(r'Latitude \(([NS])\)', head)
        hw = re.search(r'Longitude \(([EW])\)', head)
        kinds = [k for k, rx in (('STAR', r'\bSTAR\b'), ('SID', r'\bSID\b'), ('APP', r'\b(?:APP|APPROACH|IAP|IAC)\b')) if re.search(rx, b['title'].upper())]
        rw = list(dict.fromkeys(re.findall(r'\bRWY ?(\d{2}[LRC]?)\b', b['title'].upper())))
        legs, bad = [], []
        for n, line in enumerate(b['rows']):
            m = EI_ROW.match(line)
            c = EI_CELLS.match(m.group(8).strip()) if m else None
            if not c:
                bad.append(f'ligne illisible ({line[:40]})')
                continue
            lat = _ei_deg(m.group(4), m.group(5) or (hs.group(1) if hs else 'N'), False)
            lon = _ei_deg(m.group(6), m.group(7) or (hw.group(1) if hw else 'E'), True)
            up, lo = c.group(5), c.group(6)                                                  # « limite supérieure / limite inférieure »
            fl = lambda v: None if v is None or v == '-' else re.sub(r'\s', '', v).upper()
            nm = None if c.group(2) == '-' else float(c.group(2))
            if m.group(2) == 'TF' and n and (nm is None or c.group(3) is None):
                bad.append(f'{m.group(3)}: tronçon TF sans distance ou sans cap')
            legs.append({'id': m.group(3), 'leg': m.group(2), 'over': True if re.search('over', c.group(1), re.I) else None, 'alt': alt_constraint(fl(lo), fl(up)),
                         'kt': None if c.group(7) == '-' else int(c.group(7)), 'lat': lat, 'lon': lon, 'crs': round(float(c.group(4))) if c.group(4) else None,
                         'true': float(c.group(3)) if c.group(3) else None, 'nm': nm, 'turn': None, 'seq': n + 1, 'remark': (c.group(8) or '').strip('- ')[:40], 'nav': m.group(1)})
        if len(kinds) != 1:
            bad.append('type de procédure introuvable ou ambigu')
        if not b['rows']:
            bad.append('aucune ligne de tronçon')
        if bad:
            warnings.append(f'{b["name"]}: {len(legs)}/{len(b["rows"])} tronçon(s) lu(s) ({"; ".join(bad[:3])}), table NON retenue')
            continue
        tables.append({'title': b['title'], 'kind': kinds[0], 'name': b['name'], 'runways': rw, 'transition': None, 'legs': legs})
    return {'kind': 'MIXED', 'tables': tables, 'warnings': warnings}


PARSERS = {'uk-app': parse_uk_app, 'uk-star': parse_uk_star, 'am-coding': parse_am_coding, 'at-coding': parse_at_coding, 'de-route': parse_de_route,
           'icao-tab': parse_icao_tab, 'ei-coding': parse_ei_coding, 'be-coding': parse_be_coding, 'ge-coding': parse_ge_coding}


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
        if b.get('leg') != 'TF' or None in (a.get('lat'), b.get('lat')):
            continue
        if b.get('true') is None:
            # pas de cap vrai imprimé (ex. Allemagne : cap magnétique et distance arrondie) : cohérence large seulement, variation magnétique ≤ 30° et distance à 0,55 NM près
            if b.get('crs') is None and b.get('nm') is None:
                continue
            brg, nm = bearing_nm((a['lat'], a['lon']), (b['lat'], b['lon']))
            if b.get('crs') is not None and abs((brg - b['crs'] + 180) % 360 - 180) > 30:
                bad.append(f'{a["id"]} → {b["id"]}: cap calculé {brg:.1f}° pour {b["crs"]}° magnétique imprimé')
            if b.get('nm') is not None and abs(nm - b['nm']) > 0.55:
                bad.append(f'{a["id"]} → {b["id"]}: distance calculée {nm:.2f} NM pour {b["nm"]} imprimés')
            continue
        brg, nm = bearing_nm((a['lat'], a['lon']), (b['lat'], b['lon']))
        d = abs((brg - b['true'] + 180) % 360 - 180)
        if d > tol_deg:
            bad.append(f'{a["id"]} → {b["id"]}: cap calculé {brg:.1f}° pour {b["true"]}° imprimé')
        if b.get('nm') is not None and abs(nm - b['nm']) > tol_nm:
            bad.append(f'{a["id"]} → {b["id"]}: distance calculée {nm:.2f} NM pour {b["nm"]} imprimés')
    return bad


def records_uk_app(icao, parsed, source, cycle, at=None, state='UK'):
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
            if lg.get('nm') is not None:
                p['nm'] = lg['nm']
            if lg.get('turn'):
                p['turn'] = lg['turn']
            if lg.get('coords_from'):
                p['coords_from'] = lg['coords_from']
            if lg['over']:
                p['over'] = True
            if missed:
                p['phase'] = 'missed'
            if re.fullmatch(r'RW\d{2}[LRC]?', lg['id']) or 'MAPt' in lg['remark']:
                missed = True
            pts.append(p)
        if any(p['lat'] is None for p in pts):
            warnings.append(f'{t["title"][:60]}: coordonnées absentes de la page, à résoudre par aerodb (base des points)')
        name = t['name']
        rw = f'RW{t["runways"][0]}' if len(t['runways']) == 1 else 'RWALL'
        norm = lambda v: re.sub(r'[\s-]+', '', (v or '').upper())
        kind = t.get('kind', 'APP')
        out.append({'id': '.'.join([icao, kind, norm(name), rw] + ([norm(t['transition'])] if t['transition'] else [])), 'icao': icao, 'kind': kind, 'name': name,
                    'runways': t['runways'], 'transition': t['transition'], 'points': pts,
                    'source': {'kind': 'ead-basic', 'ref': f'ead-basic/{state}/{source}', 'cycle': cycle, 'at': at}, 'status': 'check'})
    return out, warnings


# listes de coordonnées de points (« WAYPOINTS », « Waypoint coordinates », page DATA « Coordonnées »…)
_HEMI_END = r'(?![A-Za-z])'
_LAT = re.compile(r'(?:([NS])\s*)?(\d{2})\s*°?\s*(\d{2})\s*[\'′]?\s*(\d{2}(?:[.,]\d+)?)\s*["″]?(?:\s*([NS])' + _HEMI_END + ')?')
_LON = re.compile(r'(?:([EW])\s*)?(\d{3})\s*°?\s*(\d{2})\s*[\'′]?\s*(\d{2}(?:[.,]\d+)?)\s*["″]?(?:\s*([EW])' + _HEMI_END + ')?')
_IDENT = re.compile(r'^(?:[A-Z]{3,5}|RW\d{2}[LRC]?)$')


def _one_coord(rx, text, lon):
    """Une coordonnée (degrés décimaux, fin) au début de `text`, ou None ; hémisphère avant OU après, jamais les deux ni aucun."""
    m = rx.match(text)
    if not m:
        return None
    h1, d, mi, se, h2 = m.groups()
    if bool(h1) == bool(h2):
        return None
    d, mi, se = int(d), int(mi), float(se.replace(',', '.'))
    if mi >= 60 or se >= 60 or d > (180 if lon else 90):
        return None
    v = d + mi / 60 + se / 3600
    return (-v if (h1 or h2) in ('S', 'W') else v), m.end()


def waypoint_coords(rows):
    """Coordonnées imprimées en LISTE (et non sur les lignes de tronçons) : {identifiant: (lat, lon)}. Sur toute ligne, un identifiant (3 à 5 capitales ou RW18L…) suivi, sur la
    même ligne ou les 2 suivantes, d'une latitude puis d'une longitude : « DD MM SS.sN DDD MM SS.sE », « DDMMSS.sN DDDMMSS.sE », « DD°MM'SS.ss"N », « NDD MM SS.s »,
    « NDDMMSS.ss »… (virgule décimale et tirets de séparation admis). La première valeur lue d'un identifiant est gardée. Rien n'est deviné : une coordonnée douteuse
    (minutes ou secondes ≥ 60) n'est pas lue ; le contrôle géométrique de build_pdf_dir juge ensuite l'ensemble."""
    out = {}
    for i, row in enumerate(rows):
        tail = ' '.join(rows[i + 1:i + 3])
        for m in re.finditer(r'\S+', row):
            if not _IDENT.match(m.group(0)):
                continue
            rest = re.sub(r'^[\s:;,/–—-]+', '', row[m.end():] + ' ' + tail)
            la = _one_coord(_LAT, rest, False)
            if not la:
                continue
            rest = re.sub(r'^[\s:;,/–—-]+', '', rest[la[1]:])
            lo = _one_coord(_LON, rest, True)
            if lo:
                out.setdefault(m.group(0), (round(la[0], 6), round(lo[0], 6)))
    for k, v in be_coords(rows).items():       # forme « BE123: 50°44.12' N 004°21.34'E » (degrés et minutes décimales)
        out.setdefault(k, v)
    return out


def build_pdf_dir(icao, pdfs, rows_of, cycle):
    """Fichier d'un terrain d'après des PDF d'AIP déjà téléchargés à la main ou par la sonde EAD (dossier de PDF) : CHAQUE page de chaque PDF passe par la détection de disposition
    (le tableau de codage est souvent à la page 2 ou plus, la première étant une carte) ; une disposition connue est lue, une inconnue est signalée (rien de deviné) ; chaque
    table est contrôlée par la géométrie (caps et coordonnées). Les points sans coordonnées sont complétés par les listes de coordonnées de TOUS les PDF du terrain
    (`waypoint_coords`, marque `coords_from: 'liste'`) AVANT le contrôle géométrique, qui juge donc la procédure complétée.
    `pdfs` : noms ; `rows_of(nom)` : liste des pages, chacune une liste de lignes (une liste de chaînes = ancien contrat, première page seulement)."""
    procs, warnings, formats = [], [], []
    pages_of, failed = {}, {}
    for f in sorted(pdfs):
        try:
            got = rows_of(f)
        except PdfTimeout as e:                      # lecture abandonnée (délai, document illisible) : le fichier est signalé, l'outil continue
            failed[f] = str(e)
            got = []
        pages_of[f] = [list(got)] if got and isinstance(got[0], str) else [list(x) for x in got]
        if not pages_of[f]:
            pages_of[f] = [[]]
    coords = {}
    for f in sorted(pdfs):
        for rows in pages_of[f]:
            for k, v in waypoint_coords(rows).items():
                coords.setdefault(k, v)
    for f in sorted(pdfs):
        known = 0
        last_kind = None                      # type de procédure lu à la page précédente du document (le mot STAR / SID n'est parfois imprimé qu'à la première page)
        for n, rows in enumerate(pages_of[f], 1):
            layout = detect_layout(rows)
            if layout not in PARSERS:
                continue
            known += 1
            fp = fingerprint(rows)
            parsed = PARSERS[layout](rows, kind_hint=last_kind) if layout == 'icao-tab' else PARSERS[layout](rows)
            kinds_read = {t.get('kind') for t in parsed['tables']}
            if len(kinds_read) == 1 and None not in kinds_read:
                last_kind = kinds_read.pop()
            for t in parsed['tables']:
                for lg in t['legs']:
                    if lg.get('lat') is None and lg['id'] in coords:
                        lg['lat'], lg['lon'] = coords[lg['id']]
                        lg['coords_from'] = 'liste'
            recs, w = records_uk_app(icao, parsed, f, cycle, page_date(rows), icao[:2])
            ok = bool(recs) and len(recs) == len(parsed['tables']) and not any('NON retenue' in x for x in w)
            problems = [x for x in w if 'NON retenue' in x] + ([] if recs else ['aucune table lue'])
            if fp not in KNOWN_FINGERPRINTS[layout]:
                problems.append(f'info: en-tête inconnu (empreinte {fp}): format changé depuis les pages vues ?')
            formats.append({'file': f, 'page': n, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems})
            procs += recs
            warnings += [f'{f} p.{n}: {x}' for x in w]
        if f in failed:
            formats.append({'file': f, 'pages': 0, 'layout': None, 'fingerprint': None, 'ok': False, 'problems': [failed[f]]})
            warnings.append(f'{f}: NON lu, {failed[f]}')
            continue
        if not known:
            most = max(len(r) for r in pages_of[f])
            first = pages_of[f][0]
            formats.append({'file': f, 'pages': len(pages_of[f]), 'layout': detect_layout(first), 'fingerprint': fingerprint(first), 'ok': False,
                            'problems': ['disposition non reconnue' + (' (très peu de texte: tableau dessiné en vecteurs ou image ? ' + str(most) + ' ligne(s))' if most < 8 else '')]})
            warnings.append(f'{f}: {len(pages_of[f])} page(s) NON lue(s), disposition non reconnue' + (' (texte absent: tables dessinées sans couche de texte)' if most < 8 else ''))
    return {'schema': 1, 'icao': icao, 'cycle': cycle, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'procedures': procs, 'formats': formats,
            'warnings': warnings, 'notice': ead_notice(icao)}


def ead_notice(icao):
    """Mention portée par tout fichier de procédures issu d'EAD Basic (décision de l'utilisateur, 28 octobre 2026 ; EAD_BASIC.md § 1) : EAD Basic
    n'est pas relié à la base opérationnelle d'EAD et ses informations « shall not be used for operational purposes »."""
    return (f'Source : AIP de l\'État ({icao[:2]}) via EAD Basic (EUROCONTROL) ; données NON OPÉRATIONNELLES (« shall not be used for operational '
            'purposes ») : à vérifier, pour la simulation seulement, jamais pour la navigation.')


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
            try:
                rows = first_page_rows(p)
            except PdfTimeout as e:                       # document non lu : signalé, la page est vide pour le constructeur
                print(f'{icao}: {e}', file=sys.stderr)
                rows = []
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
