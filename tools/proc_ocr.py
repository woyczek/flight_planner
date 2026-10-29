"""OCR des pages d'AIP dessinées en vecteurs ou en image (sans couche de texte : pypdf ne rend rien) → lignes de texte → document d'interprétation de proc_manual.

  python tools/proc_ocr.py FILE [--page N] [--dpi 300] [--engine tesseract|rapidocr]      lignes lues, numérotées
  python tools/proc_ocr.py --deps                                                         moteurs présents
  python tools/proc_ocr.py FILE --icao XXXX --cycle YYYY-MM-DD --out DIR                  écrit DIR/<OACI>.ocr.json

Décision de l'utilisateur du 28 octobre 2026 (« OCR inclus ») : l'OCR est une dépendance FACULTATIVE des constructeurs de poste (jamais du lanceur ni d'une page), comme pypdf ;
`pypdfium2` (rendu de la page) et un moteur, Tesseract (programme dans le PATH) ou `rapidocr-onnxruntime`. Le moteur n'est pas choisi : les deux sont pris en charge.
Un texte lu par OCR n'est jamais cru : le document n'est installable que par `tools/proc_manual.py` ; le contrôle de géométrie (`tools/proc_geometry.py`) refait caps et distances,
et toute procédure qui échoue est gardée au statut « doubt » avec son code, jamais servie comme sûre. Bibliothèque standard, plus les moteurs importés à la demande.
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
import proc_layouts as L  # noqa: E402
import proc_manual  # noqa: E402
import proc_pdf  # noqa: E402
import proc_records  # noqa: E402
from proc_pdf import OCR_TIMEOUT  # noqa: E402


MAX_DPI = 600      # résolution de rendu au plus (une page A4 à 600 dpi pèse déjà 35 millions de pixels) : au-delà, refus


def dpi_arg(text):
    """Valeur de --dpi : entier entre 1 et MAX_DPI (argparse.ArgumentTypeError sinon)."""
    try:
        n = int(text)
    except ValueError:
        raise argparse.ArgumentTypeError(f'{text!r} n\'est pas un entier') from None
    if not 0 <= n <= MAX_DPI:
        raise argparse.ArgumentTypeError(f'résolution refusée : {n} dpi (au plus {MAX_DPI})')
    return n


def tesseract_path():
    """Chemin ABSOLU du programme tesseract trouvé dans le PATH, ou None. Sous Windows, `which` regarde d'abord le dossier courant : on le lui interdit
    (NoDefaultCurrentDirectoryInExePath, comme tools/data_sync.py) pour qu'un tesseract.exe déposé dans une archive téléchargée ne soit jamais lancé ;
    le programme est ensuite appelé par ce chemin, jamais par son nom."""
    os.environ['NoDefaultCurrentDirectoryInExePath'] = '1'
    return shutil.which('tesseract')


def render_page(path, page=0, dpi=300):
    """Image PIL d'une page de PDF rendue par pypdfium2 ; il manque : message clair (dépendance facultative des constructeurs de poste)."""
    if not 0 < dpi <= MAX_DPI:
        raise SystemExit(f'résolution refusée : {dpi} dpi (entre 1 et {MAX_DPI})')
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
    if tesseract_path():
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
        out = subprocess.run([tesseract_path(), png, '-', '--psm', '6', 'tsv'], capture_output=True, text=True, encoding='utf-8', errors='replace')
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
    if engine == 'tesseract' and tesseract_path():
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


def rows_from_pdf_ocr(path, page=0, dpi=300, engine=None):
    """Lignes de texte d'une page de PDF sans couche de texte : rendu, OCR, regroupement."""
    return rows_from_words(ocr_words(render_page(path, page, dpi), engine))


def document_from_rows(icao, file, rows, cycle, state=None):
    """Document d'interprétation (forme de proc_manual) d'après les lignes OCR d'une page. Disposition connue → analyse, puis contrôle de géométrie table par table
    (proc_geometry, tolérance du cap vrai : une table incohérente est GARDÉE, sa procédure au statut « doubt » et au code « geometry » ; seule une table dont les comptes ne tiennent
    pas est écartée, signalée « NON retenue ») ; disposition inconnue → rien de deviné. Le document n'est qu'un candidat : proc_manual le contrôle et l'installe."""
    state = state or icao[:2]
    layout = L.detect_layout(rows)
    fp = L.fingerprint(rows)
    procs, warnings, problems = [], [], []
    if layout in L.OCR_LAYOUTS:
        parsed = L.read_page(layout, L.NORMALIZERS.get(layout, lambda r: r)(rows))
        warnings += [f'{file}: {x}' for x in parsed['warnings']]
        problems += [x for x in parsed['warnings'] if 'NON retenue' in x]
        at = L.page_date(rows)
        for t in parsed['tables']:
            recs, w = proc_records.records_uk_app(icao, {'tables': [t], 'warnings': []}, file, cycle, at, state)
            warnings += [f'{file}: {x}' for x in w]
            problems += [x for x in w if 'NON retenue' in x]
            for rec in recs:
                rec['source']['ref'] = 'ocr:' + rec['source']['ref']        # le cap vrai imprimé (`trk`) est déjà sur les points : records_uk_app l'y pose, proc_geometry le contrôle
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
    merged = {'schema': 1, 'icao': icao, 'cycle': cycle, 'procedures': [], 'formats': [], 'warnings': [], 'notice': proc_records.ead_notice(icao)}
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
    ap.add_argument('--dpi', type=dpi_arg, default=0, help=f'résolution du rendu, au plus {MAX_DPI} (défaut : 300 pour afficher les lignes ; 300, 500 puis 200 selon la page pour écrire un document)')
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
        print(f'tesseract: {"présent" if tesseract_path() else "absent"}')
        print(f'rapidocr: {_rapidocr_module() or "absent"}')
        print(f'moteur retenu: {backend() or "aucun"}')
        return
    if not a.file:
        ap.error('FILE requis (ou --deps)')
    if not (a.icao or a.cycle or a.out):
        # affichage des lignes : lui aussi dans un processus séparé, au plus OCR_TIMEOUT s (un PDF piégé ou démesuré ne bloque pas l'outil)
        try:
            rows = proc_pdf.limited('rows_from_pdf_ocr', a.file, a.page or 0, a.dpi or 300, a.engine, module='proc_ocr', timeout=OCR_TIMEOUT)
        except proc_pdf.PdfTimeout as e:
            raise SystemExit(f'lecture impossible: {e}') from None
        print('\n'.join(proc_pdf.format_rows(rows)))
        return
    if not (a.icao and a.cycle and a.out):
        ap.error('--icao, --cycle et --out vont ensemble')
    a.icao = a.icao.strip().upper()
    if not re.fullmatch(r'[A-Z0-9]{4}', a.icao):                  # il nomme le fichier écrit : jamais un chemin
        ap.error('--icao : 4 lettres ou chiffres')
    # rendu et OCR dans un processus séparé, au plus OCR_TIMEOUT s (un PDF piégé ou démesuré ne bloque pas l'outil)
    try:
        doc = proc_pdf.limited('read_document', a.file, a.icao, a.cycle, module='proc_ocr', timeout=OCR_TIMEOUT,
                                pages=None if a.page is None else [a.page], dpis=(a.dpi,) if a.dpi else (300, 500, 200), engine=a.engine)
    except proc_pdf.PdfTimeout as e:
        raise SystemExit(f'lecture impossible: {e}') from None
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    dest = out / f'{a.icao}.ocr.json'
    dest.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{dest}: {len(doc["procedures"])} procédure(s), {len(doc["warnings"])} avertissement(s) ; installer par python tools/proc_manual.py {dest} --out <dépôt de données>/proc')


if __name__ == '__main__':
    main()
