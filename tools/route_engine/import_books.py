"""Import des classeurs EUROCONTROL du calcul de route (SOG-0081) : le RAD (Route Availability Document, « Rolling RAD ») et les points significatifs FRA, vers les deux fichiers compilés que le moteur lit,
data/route/rad.json.gz et data/route/fra.json.gz. Bibliothèque standard seulement (xlsx.py).

Formats (ceux de RouteSim 2, import_rad.py, que ce module reproduit à l'identique) :
  rad.json.gz : [ { file, title, start (AAAA-MM-JJ, « Valid From » de la couverture), end_exclusive (start + 28 j), sha256 (du classeur), headers { feuille: [en-têtes] }, sheets { feuille: [ { row, v: [textes], strike_removed } ] } } ]
  fra.json.gz : [ { file, start (« Effective Date » de la couverture), sha256, rows: [ { row, v: [15 textes] } ] } ]
Le texte barré est retiré (la ligne reste, `strike_removed` le dit). Un cycle déjà dans le fichier compilé est REMPLACÉ par le classeur du même cycle ; les cycles que le classeur ne porte pas restent (une donnée compilée
n'est jamais purgée). Licence : documents EUROCONTROL NM (RAD, FRA points) : usage de la compagnie, données publiées dans son dépôt privé seulement (SOURCES).
"""
import datetime as dt
import gzip
import hashlib
import json
import os
import re

from . import xlsx

MONTHS = {m: i + 1 for i, m in enumerate(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'])}
RAD_NAME = re.compile(r'^RAD_\d{4}_v[\d_]+\.xlsx$', re.I)
FRA_NAME = re.compile(r'^eurocontrol-airac-\d{4}-fra-points-[A-Za-z0-9-]+\.xlsx$', re.I)
PICKUP_NAME = re.compile(RAD_NAME.pattern + '|' + FRA_NAME.pattern, re.I)


def kind_of(sheet_names):
    """'rad' (feuilles Cover et Annex …), 'fra' (feuille « FRA Points »), None sinon."""
    names = {n.strip().lower() for n in sheet_names}
    if 'fra points' in names:
        return 'fra'
    if 'cover' in names and any(n.startswith('annex') for n in names):
        return 'rad'
    return None


def _sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def _texts(cells):
    return [t.replace('_x000D_', '').strip() for t, struck in cells]


def rad_book(path, book):
    """L'entrée du RAD d'un classeur déjà lu (xlsx.sheets)."""
    by = dict(book)
    cover = by.get('Cover') or by.get('COVER')
    if cover is None:
        raise ValueError('feuille Cover absente')
    flat = [t for _, cells in cover for t, _s in cells if t]
    title = flat[0] if flat else ''
    m = re.search(r'Valid From\s+(\d{2}/\d{2}/\d{4})', ' '.join(flat))
    if not m:
        raise ValueError('date de couverture absente (Valid From)')
    start = dt.datetime.strptime(m.group(1), '%d/%m/%Y').date()
    out = {'file': os.path.basename(path), 'title': title, 'start': str(start), 'end_exclusive': str(start + dt.timedelta(days=28)), 'sha256': _sha(path), 'sheets': {}, 'headers': {}}
    for name, rows in book:
        if name.lower() == 'cover':
            continue
        header = next((cells for r, cells in rows if r == 1), [])
        out['headers'][name] = [t.replace('\n', ' ') for t, _s in header]
        records = []
        for r, cells in rows:
            if r < 2:
                continue
            values = _texts(cells)
            if any(values):
                records.append({'row': r, 'v': values, 'strike_removed': any(s for _t, s in cells)})
        out['sheets'][name] = records
    return out


def fra_book(path, book):
    """L'entrée des points FRA d'un classeur déjà lu."""
    by = {n.lower(): rows for n, rows in book}
    cover = by.get('cover', [])
    flat = ' '.join(t for _, cells in cover for t, _s in cells if t)
    m = re.search(r'Effective Date\s*-\s*(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})', flat)
    if not m or m.group(2).upper() not in MONTHS:
        raise ValueError('date d’entrée en vigueur absente (Effective Date)')
    start = dt.date(int(m.group(3)), MONTHS[m.group(2).upper()], int(m.group(1)))
    rows = []
    for r, cells in by['fra points']:
        if r < 2:
            continue
        values = _texts(cells)
        if any(values):
            rows.append({'row': r, 'v': values})
    return {'file': os.path.basename(path), 'start': str(start), 'sha256': _sha(path), 'rows': rows}


def read_book(path):
    """('rad' | 'fra', entrée) d'un classeur ; ValueError s'il n'est ni l'un ni l'autre ou s'il est illisible."""
    book = xlsx.sheets(path)
    kind = kind_of([n for n, _ in book])
    if kind == 'rad':
        return kind, rad_book(path, book)
    if kind == 'fra':
        return kind, fra_book(path, book)
    raise ValueError('ni un classeur RAD (feuilles Cover et Annex), ni des points FRA (feuille FRA Points)')


def load(path):
    try:
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            v = json.load(f)
        return v if isinstance(v, list) else []
    except (OSError, ValueError):
        return []


def merge(old, entries):
    """Les entrées déjà compilées, remplacées par celles du même cycle (`start`), triées par cycle."""
    by = {b['start']: b for b in old if isinstance(b, dict) and 'start' in b}
    for e in entries:
        by[e['start']] = e
    return [by[k] for k in sorted(by)]


def write(path, books):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.new'
    with gzip.open(tmp, 'wt', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, path)
