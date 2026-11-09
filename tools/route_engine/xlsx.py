"""Lecteur minimal de classeurs .xlsx, bibliothèque standard seulement (zipfile + xml.etree) — pour l'import des classeurs RAD et FRA d'EUROCONTROL (SOG-0081).

Pourquoi pas openpyxl : le lanceur et ses travaux n'ont que la bibliothèque standard (CLAUDE.md : seules exceptions déclarées, pypdf et l'OCR) ; ce lecteur rend ce que l'import d'origine (RouteSim 2,
import_rad.py, openpyxl) lisait : les VALEURS en cache (data_only), le texte BARRÉ retiré (style de la cellule, ou passage barré d'un texte riche), les lignes avec leur numéro. Un classeur est une
entrée non fiable : taille, nombre de feuilles, de lignes et de colonnes bornés, aucune expansion externe (xml.etree n'expanse que les entités internes ; les DOCTYPE sont refusés).

API : sheets(path) → [(nom, [ligne…])] où une ligne est (numéro, [cellules]) et une cellule (valeur texte, barrée) ; les valeurs sont celles qu'openpyxl rendrait, écrites par str()."""
import datetime as dt
import re
import zipfile
import xml.etree.ElementTree as ET

MAX_BYTES = 64 * 1024 * 1024        # taille d'un classeur
MAX_PART = 256 * 1024 * 1024        # taille décompressée d'une partie XML
MAX_ROWS = 200_000
MAX_COLS = 200
MAX_SHEETS = 40
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PKG_REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'
EPOCH = dt.datetime(1899, 12, 30)
BUILTIN_DATE_IDS = set(range(14, 23)) | {27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58}
DATE_FMT = re.compile(r'(?<![\\_*"\[])[dmyhs]', re.I)


class XlsxError(ValueError):
    pass


def _parse(zf, name):
    info = zf.getinfo(name)
    if info.file_size > MAX_PART:
        raise XlsxError(f'partie trop grande : {name}')
    data = zf.read(name)
    if b'<!DOCTYPE' in data[:2048] or b'<!ENTITY' in data[:4096]:
        raise XlsxError('DOCTYPE refusé')
    return ET.fromstring(data)


def _strike(rpr):
    """Une propriété de police porte-t-elle <strike/> (et pas val="0") ?"""
    if rpr is None:
        return False
    s = rpr.find(NS + 'strike')
    return s is not None and s.get('val') not in ('0', 'false')


def _shared(zf):
    """Chaînes partagées : [(texte, texte sans les passages barrés, barré ?)]."""
    if 'xl/sharedStrings.xml' not in zf.namelist():
        return []
    out = []
    for si in _parse(zf, 'xl/sharedStrings.xml').findall(NS + 'si'):
        runs = si.findall(NS + 'r')
        if runs:
            parts = [(''.join(t.text or '' for t in r.findall(NS + 't')), _strike(r.find(NS + 'rPr'))) for r in runs]
            out.append((''.join(p for p, s in parts), ''.join(p for p, s in parts if not s), any(s for p, s in parts)))
        else:
            t = ''.join(x.text or '' for x in si.iter(NS + 't'))
            out.append((t, t, False))
    return out


def _styles(zf):
    """Par indice de style de cellule (cellXfs) : (police barrée ?, format de date ?)."""
    if 'xl/styles.xml' not in zf.namelist():
        return []
    root = _parse(zf, 'xl/styles.xml')
    fonts = [(f.find(NS + 'strike') is not None and f.find(NS + 'strike').get('val') not in ('0', 'false')) for f in (root.find(NS + 'fonts') if root.find(NS + 'fonts') is not None else [])]
    custom = {}
    nf = root.find(NS + 'numFmts')
    for x in (nf if nf is not None else []):
        custom[int(x.get('numFmtId'))] = x.get('formatCode') or ''
    out = []
    xfs = root.find(NS + 'cellXfs')
    for xf in (xfs if xfs is not None else []):
        fid, nid = int(xf.get('fontId') or 0), int(xf.get('numFmtId') or 0)
        code = custom.get(nid)
        is_date = nid in BUILTIN_DATE_IDS if code is None else bool(DATE_FMT.search(re.sub(r'"[^"]*"', '', code)))
        out.append((fonts[fid] if fid < len(fonts) else False, is_date))
    return out


def _col(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n


def _number(text):
    """La valeur numérique comme openpyxl la rend : entier s'il n'a ni point ni exposant."""
    if re.fullmatch(r'-?\d+', text):
        return int(text)
    return float(text)


def sheets(path):
    """[(nom de feuille, [(numéro de ligne, [(texte, barré)…])…])…] ; la ligne est complétée jusqu'à la dernière colonne de la feuille par des cellules vides ('', False)."""
    import os
    if os.path.getsize(path) > MAX_BYTES:
        raise XlsxError('classeur trop gros')
    try:
        zf = zipfile.ZipFile(path)
    except zipfile.BadZipFile as e:
        raise XlsxError('pas un classeur .xlsx') from e
    with zf:
        names = zf.namelist()
        if 'xl/workbook.xml' not in names:
            raise XlsxError('pas un classeur .xlsx')
        shared, styles = _shared(zf), _styles(zf)
        rels = {r.get('Id'): r.get('Target') for r in _parse(zf, 'xl/_rels/workbook.xml.rels').findall(PKG_REL + 'Relationship')}
        out = []
        listed = _parse(zf, 'xl/workbook.xml').find(NS + 'sheets')
        for sh in list(listed if listed is not None else [])[:MAX_SHEETS]:
            target = rels.get(sh.get(REL + 'id'), '')
            part = target.lstrip('/') if target.startswith('/') else 'xl/' + target
            if part not in names:
                continue
            rows, width = [], 0
            for row in _parse(zf, part).iter(NS + 'row'):
                if len(rows) >= MAX_ROWS:
                    raise XlsxError('trop de lignes')
                cells = {}
                for c in row.findall(NS + 'c'):
                    n = _col(c.get('r'))
                    if n > MAX_COLS:
                        continue
                    t, v = c.get('t'), c.find(NS + 'v')
                    style_struck, is_date = styles[int(c.get('s') or 0)] if styles and int(c.get('s') or 0) < len(styles) else (False, False)
                    struck = style_struck
                    text = ''
                    if t == 's' and v is not None:
                        full, kept, any_strike = shared[int(v.text)]
                        text = kept if any_strike else full
                        struck = struck or any_strike          # un passage barré d'un texte riche : retiré du texte, et la ligne le dit (strike_removed)
                    elif t == 'inlineStr':
                        text = ''.join(x.text or '' for x in c.iter(NS + 't'))
                    elif t == 'b' and v is not None:
                        text = 'True' if v.text == '1' else 'False'
                    elif t in ('str', 'e') and v is not None:
                        text = v.text or ''
                    elif v is not None and v.text not in (None, ''):
                        num = _number(v.text)
                        text = str(EPOCH + dt.timedelta(days=num)) if is_date else str(num)
                    if style_struck:
                        text = ''                          # police barrée sur toute la cellule : sa valeur est retirée
                    cells[n] = (text, struck)
                    width = max(width, n)
                rows.append((int(row.get('r')), cells))
            out.append((sh.get('name'), [(r, [cells.get(i, ('', False)) for i in range(1, width + 1)]) for r, cells in rows]))
        return out
