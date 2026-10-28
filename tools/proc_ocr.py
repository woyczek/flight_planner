"""OCR des pages d'AIP dessinées en vecteurs ou en image (sans couche de texte : pypdf ne rend rien) → lignes de texte → document d'interprétation de proc_manual.

  python tools/proc_ocr.py FILE [--page N] [--dpi 300] [--engine tesseract|rapidocr]      lignes lues, numérotées
  python tools/proc_ocr.py --deps                                                         moteurs présents
  python tools/proc_ocr.py FILE --icao XXXX --cycle YYYY-MM-DD --out DIR                  écrit DIR/<OACI>.ocr.json

Décision de l'utilisateur du 28 octobre 2026 (« OCR inclus ») : l'OCR est une dépendance FACULTATIVE des constructeurs de poste (jamais du lanceur ni d'une page), comme pypdf ;
`pypdfium2` (rendu de la page) et un moteur, Tesseract (programme dans le PATH) ou `rapidocr-onnxruntime`. Le moteur n'est pas choisi : les deux sont pris en charge.
Un texte lu par OCR n'est jamais cru : le document n'est installable que par `tools/proc_manual.py`, dont le contrôle de géométrie refait caps et distances ; toute table
qui échoue est écartée et signalée. Bibliothèque standard, plus les moteurs importés à la demande.
"""
import argparse
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import proc_eaip  # noqa: E402
import proc_manual  # noqa: E402


OCR_TIMEOUT = 600  # secondes au plus par document lu par OCR (rendu et moteur, plusieurs pages et résolutions) : proc_eaip.limited


def render_page(path, page=0, dpi=300):
    """Image PIL d'une page de PDF rendue par pypdfium2 ; il manque : message clair (dépendance facultative des constructeurs de poste)."""
    try:
        import pypdfium2
    except ImportError:
        raise SystemExit('pypdfium2 manque : python -m pip install pypdfium2 (dépendance facultative des constructeurs de poste, '
                         'voir tools/proc_ocr.py ; ni le lanceur ni la page n\'en ont besoin).')
    pdf = pypdfium2.PdfDocument(str(path))
    try:
        return pdf[page].render(scale=dpi / 72).to_pil()
    finally:
        pdf.close()


def _rapidocr_module():
    """Nom du module rapidocr importable : 'rapidocr_onnxruntime' (paquet rapidocr-onnxruntime, essayé sous Python 3.14.7 le 28 octobre 2026) ou 'rapidocr' (paquet rapidocr 3 et plus,
    non essayé) ; None s'il n'y en a pas."""
    for name in ('rapidocr_onnxruntime', 'rapidocr'):
        try:
            __import__(name)
            return name
        except Exception:
            continue
    return None


def backend():
    """Moteur d'OCR présent : 'tesseract' (programme dans le PATH), sinon 'rapidocr' (module importable), sinon None."""
    if shutil.which('tesseract'):
        return 'tesseract'
    return 'rapidocr' if _rapidocr_module() else None


def _missing():
    return SystemExit('OCR manque : installer Tesseract et le mettre dans le PATH, ou python -m pip install rapidocr-onnxruntime '
                      '(dépendance facultative des constructeurs de poste, voir tools/proc_ocr.py ; ni le lanceur ni la page n\'en ont besoin).')


def _tesseract_words(image):
    """Mots d'une image par le programme tesseract (sortie TSV, niveau 5 = mot)."""
    with tempfile.TemporaryDirectory() as td:
        png = os.path.join(td, 'page.png')
        image.save(png)
        out = subprocess.run([shutil.which('tesseract'), png, '-', '--psm', '6', 'tsv'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if out.returncode:
        raise SystemExit('tesseract a échoué : ' + (out.stderr or '').strip()[:300])
    words = []
    for line in out.stdout.splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12 or f[0].strip() != '5':
            continue
        text = '\t'.join(f[11:]).strip()
        if not text:
            continue
        x, y, w, h = (int(float(v)) for v in f[6:10])
        try:
            conf = float(f[10])
        except ValueError:
            conf = None
        words.append({'x0': x, 'y0': y, 'x1': x + w, 'y1': y + h, 'text': text, 'conf': conf})
    return words


_RAPID = {}


def _rapidocr_words(image):
    """Lignes d'une image par rapidocr (pas de boîte par mot : la boîte de la ligne fait un « mot »). Les deux paquets rendent des résultats de forme différente :
    rapidocr-onnxruntime, un tuple (liste de [boîte, texte, score], durées) ; rapidocr 3 et plus, un objet à `boxes`, `txts` et `scores`. Le moteur est chargé une fois."""
    name = _rapidocr_module()
    if not name:
        raise ImportError('rapidocr')
    import numpy
    if 'engine' not in _RAPID:
        _RAPID['engine'] = __import__(name).RapidOCR()
    res = _RAPID['engine'](numpy.asarray(image.convert('RGB')))
    if hasattr(res, 'txts'):
        items = list(zip(res.boxes if res.boxes is not None else [], res.txts or [], res.scores or []))
    else:
        items = res[0] or []
    words = []
    for box, text, score in items:
        xs, ys = [p[0] for p in box], [p[1] for p in box]
        if str(text).strip():
            words.append({'x0': float(min(xs)), 'y0': float(min(ys)), 'x1': float(max(xs)), 'y1': float(max(ys)), 'text': str(text).strip(), 'conf': float(score) * 100})
    return words


def ocr_words(image, engine=None):
    """Mots {x0, y0, x1, y1, text, conf} d'une image. `engine` : 'tesseract' ou 'rapidocr' ; None = celui qui est présent. Aucun moteur : message clair."""
    engine = engine or backend()
    if engine == 'tesseract' and shutil.which('tesseract'):
        return _tesseract_words(image)
    if engine == 'rapidocr':
        try:
            return _rapidocr_words(image)
        except ImportError:
            pass
    raise _missing()


def rows_from_words(words, tol=None):
    """Lignes de texte du haut vers le bas : mots regroupés par centre vertical (tolérance 0,4 × la hauteur médiane des mots si `tol` est None), triés par abscisse dans la ligne."""
    ws = [w for w in words if str(w.get('text', '')).strip()]
    if not ws:
        return []
    if tol is None:
        tol = 0.4 * statistics.median(max(w['y1'] - w['y0'], 1) for w in ws)
    rows = []
    for w in sorted(ws, key=lambda w: (w['y0'] + w['y1']) / 2):
        cy = (w['y0'] + w['y1']) / 2
        if rows and abs(rows[-1]['cy'] - cy) <= tol:
            r = rows[-1]
            r['words'].append(w)
            r['cy'] = sum((v['y0'] + v['y1']) / 2 for v in r['words']) / len(r['words'])
        else:
            rows.append({'cy': cy, 'words': [w]})
    return [' '.join(' '.join(w['text'].split()) for w in sorted(r['words'], key=lambda w: w['x0'])) for r in rows]


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
        if not m or m.group(3) not in proc_eaip.PATH_TERMINATORS:
            out.append(r)
            continue
        des, tc, name = m.group(1), m.group(3), m.group(4)
        seq = int(m.group(2)) if m.group(2) else last.get(des, 0) + 1
        last[des] = seq
        rest = m.group(5)
        lat = proc_eaip.UK_LAT.search(rest)
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
        k = next((i for i, t in enumerate(toks) if proc_eaip.uk_constraint(t)), None)
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
        if m and m.group(3) in proc_eaip.PATH_TERMINATORS:
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


# normalisation propre à chaque disposition lue par OCR (celles qui n'y figurent pas sont lues telles quelles)
NORMALIZERS = {'uk-app': normalize_uk_app, 'uk-star': normalize_uk_star, 'at-coding': normalize_at_coding, 'be-coding': normalize_be_coding, 'ge-coding': normalize_ge_coding}

# dispositions lisibles par OCR : celles dont chaque tronçon porte ou retrouve ses coordonnées dans la page (la porte géométrique les contrôle toutes)
OCR_LAYOUTS = {'uk-app', 'uk-star', 'am-coding', 'at-coding', 'ei-coding', 'be-coding', 'ge-coding'}


def rows_from_pdf_ocr(path, page=0, dpi=300, engine=None):
    """Lignes de texte d'une page de PDF sans couche de texte : rendu, OCR, regroupement."""
    return rows_from_words(ocr_words(render_page(path, page, dpi), engine))


def document_from_rows(icao, file, rows, cycle, state=None):
    """Document d'interprétation (forme de proc_manual) d'après les lignes OCR d'une page. Disposition connue → analyse, puis contrôle de géométrie table par table
    (une table incohérente est écartée, signalée « NON retenue ») ; disposition inconnue → rien de deviné. Le document n'est qu'un candidat : proc_manual.verify le contrôle
    et l'installe."""
    state = state or icao[:2]
    layout = proc_eaip.detect_layout(rows)
    fp = proc_eaip.fingerprint(rows)
    procs, warnings, problems = [], [], []
    if layout in OCR_LAYOUTS:
        parsed = proc_eaip.PARSERS[layout](NORMALIZERS.get(layout, lambda r: r)(rows))
        warnings += [f'{file}: {x}' for x in parsed['warnings']]
        problems += [x for x in parsed['warnings'] if 'NON retenue' in x]
        at = proc_eaip.page_date(rows)
        for t in parsed['tables']:
            recs, w = proc_eaip.records_uk_app(icao, {'tables': [t], 'warnings': []}, file, cycle, at, state)
            warnings += [f'{file}: {x}' for x in w]
            problems += [x for x in w if 'NON retenue' in x]
            for rec in recs:
                for p, lg in zip(rec['points'], t['legs']):
                    if lg.get('true') is not None:
                        p['trk'] = lg['true']       # cap vrai imprimé : proc_manual le recalcule d'après les positions
                rec['source']['ref'] = 'ocr:' + rec['source']['ref']
                procs.append(rec)
        ok = bool(procs) and not problems
        if not procs:
            problems.append('aucune table lue')
    elif layout == 'sia-code':
        ok = False
        problems.append('disposition sia-code lue par le constructeur eAIP, pas par OCR')
        warnings.append(f'{file}: page NON lue, disposition sia-code lue par le constructeur eAIP, pas par OCR')
    else:
        ok = False
        problems.append('disposition non reconnue (rien de deviné)')
        warnings.append(f'{file}: page NON lue, disposition non reconnue')
    doc = {'schema': 1, 'icao': icao, 'cycle': cycle, 'procedures': procs,
           'formats': [{'file': file, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems, 'via': 'ocr'}], 'warnings': warnings}
    warnings += [f'verify: {x}' for x in proc_manual.verify(doc)]
    return doc


def page_count(path):
    """Nombre de pages d'un PDF (pypdfium2)."""
    try:
        import pypdfium2
    except ImportError:
        raise SystemExit('pypdfium2 manque : python -m pip install pypdfium2 (dépendance facultative des constructeurs de poste, voir tools/proc_ocr.py).')
    pdf = pypdfium2.PdfDocument(str(path))
    try:
        return len(pdf)
    finally:
        pdf.close()


def read_document(path, icao, cycle, file=None, pages=None, dpis=(300, 500, 200), engine=None):
    """Document d'interprétation de TOUTES les pages d'un PDF (ou de `pages`, numéros à partir de 0) lues par OCR. L'OCR n'est pas déterministe d'une résolution à l'autre : une ligne
    de liste peut manquer à 300 dpi et être là à 500. Pour chaque page, la lecture est refaite aux résolutions suivantes de `dpis` tant que la page n'est pas entièrement lue
    (au moins une table retenue, aucune rejetée) ; la meilleure lecture est gardée (le plus de procédures retenues). Une page de disposition inconnue n'est lue qu'une fois.
    Les pages sont fusionnées : procédures (sans doublon d'identifiant), formats (avec leur numéro de page), avertissements."""
    file = file or Path(path).name
    merged = {'schema': 1, 'icao': icao, 'cycle': cycle, 'procedures': [], 'formats': [], 'warnings': []}
    have = set()
    for n in (range(page_count(path)) if pages is None else pages):
        best = None
        for dpi in dpis:
            doc = document_from_rows(icao, file, rows_from_pdf_ocr(path, n, dpi, engine), cycle)
            f = doc['formats'][0]
            if best is None or (len(doc['procedures']), f['ok']) > (len(best[0]['procedures']), best[0]['formats'][0]['ok']):
                best = (doc, dpi)
            if f['ok'] or f['layout'] is None:
                break
        doc, dpi = best
        doc['formats'][0].update({'page': n + 1, 'dpi': dpi})
        merged['formats'] += doc['formats']
        merged['warnings'] += [f'p.{n + 1}: {x}' for x in doc['warnings']]
        for rec in doc['procedures']:
            if rec['id'] not in have:
                have.add(rec['id'])
                merged['procedures'].append(rec)
    return merged


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('file', nargs='?')
    ap.add_argument('--page', type=int, default=None, help='numéro de page à partir de 0 (sans --icao : première page ; avec --icao : toutes les pages si absent)')
    ap.add_argument('--dpi', type=int, default=0, help='résolution du rendu (défaut : 300 pour afficher les lignes ; 300, 500 puis 200 selon la page pour écrire un document)')
    ap.add_argument('--engine', choices=['tesseract', 'rapidocr'])
    ap.add_argument('--deps', action='store_true', help='indique les moteurs présents')
    ap.add_argument('--icao')
    ap.add_argument('--cycle')
    ap.add_argument('--out')
    a = ap.parse_args(argv)
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if a.deps:
        try:
            import pypdfium2  # noqa: F401
            pdfium = True
        except ImportError:
            pdfium = False
        print(f'pypdfium2: {"présent" if pdfium else "absent"}')
        print(f'tesseract: {"présent" if shutil.which("tesseract") else "absent"}')
        print(f'rapidocr: {_rapidocr_module() or "absent"}')
        print(f'moteur retenu: {backend() or "aucun"}')
        return
    if not a.file:
        ap.error('FILE requis (ou --deps)')
    if not (a.icao or a.cycle or a.out):
        print('\n'.join(proc_eaip.format_rows(rows_from_pdf_ocr(a.file, a.page or 0, a.dpi or 300, a.engine))))
        return
    if not (a.icao and a.cycle and a.out):
        ap.error('--icao, --cycle et --out vont ensemble')
    a.icao = a.icao.strip().upper()
    if not re.fullmatch(r'[A-Z0-9]{4}', a.icao):                  # il nomme le fichier écrit : jamais un chemin
        ap.error('--icao : 4 lettres ou chiffres')
    # rendu et OCR dans un processus séparé, au plus OCR_TIMEOUT s (un PDF piégé ou démesuré ne bloque pas l'outil)
    try:
        doc = proc_eaip.limited('read_document', a.file, a.icao, a.cycle, module='proc_ocr', timeout=OCR_TIMEOUT,
                                pages=None if a.page is None else [a.page], dpis=(a.dpi,) if a.dpi else (300, 500, 200), engine=a.engine)
    except proc_eaip.PdfTimeout as e:
        raise SystemExit(f'lecture impossible: {e}') from None
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    dest = out / f'{a.icao}.ocr.json'
    dest.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{dest}: {len(doc["procedures"])} procédure(s), {len(doc["warnings"])} avertissement(s) ; installer par python tools/proc_manual.py {dest} --out <dépôt de données>/proc')


if __name__ == '__main__':
    main()
