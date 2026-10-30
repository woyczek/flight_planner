"""Lecture des PDF d'AIP, partagée par tous les lecteurs (V3 § 10.29 (b)) : texte par page (pypdf, polices décalées), nature d'un document, listes de coordonnées de points, lecture sous délai.

pypdf est une dépendance FACULTATIVE des constructeurs de poste (jamais du lanceur ni de la page) : python -m pip install pypdf. `limited` fait une lecture dans un PROCESSUS SÉPARÉ, au plus
PDF_TIMEOUT s (OCR_TIMEOUT pour l'OCR) : un PDF piégé ou démesuré ne bloque pas l'outil. proc_ocr, proc_ead, proc_sia et proc_records s'en servent ; aucun ne lit l'autre.
Bibliothèque standard, plus pypdf à la demande.
"""
import re
from pathlib import Path

from proc_layouts import be_coords, detect_layout, fingerprint, PARSERS



# ---------------------------------------------------------------------------------------------------------- lecture PDF
def pdf_reader(path):
    """Lecteur pypdf d'un fichier ; pypdf manque : message clair (dépendance facultative des constructeurs de poste, jamais du lanceur ni de la page)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit('pypdf manque : python -m pip install pypdf (dépendance facultative des constructeurs de poste, '
                         'voir tools/proc_pdf.py ; ni le lanceur ni la page n\'en ont besoin).')
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


PDF_NAME = re.compile(r'^[A-Za-z0-9._-][A-Za-z0-9._ -]*\.pdf$')      # un nom de PDF cité par un serveur : jamais un chemin (ni « / », ni « \ », ni « .. ») ; l'espace intérieur passe (les cartes ILS de LFBO : « CAT_ 1_2_3 »)


def safe_path(folder, name, pattern=PDF_NAME):
    """`folder / name` si `name` est un nom de fichier sûr (le motif `pattern`, jamais seulement des points) ET si le chemin résolu reste SOUS le dossier ; ValueError sinon. Un nom lu dans une
    page ou une réponse du serveur ne sert à écrire ou à lire un fichier qu'après ce contrôle (relecture de sécurité de la scission, V3 § 10.29 (c))."""
    if not isinstance(name, str) or not pattern.fullmatch(name) or set(name) <= {'.'}:
        raise ValueError(f'nom de fichier refusé : {name!r}')
    path = Path(folder) / name
    if Path(folder).resolve() not in path.resolve().parents:
        raise ValueError(f'nom de fichier hors du dossier : {name!r}')
    return path


PDF_TIMEOUT = 60  # secondes au plus par document lu par pypdf (pdf_pages, pdf_kind)
OCR_TIMEOUT = 600  # secondes au plus par document lu par OCR (rendu et moteur, plusieurs pages et résolutions) : limited


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
    proc = mp.Process(target=_child, args=(module or __name__, task, (str(path), *args), kw, b), daemon=True)
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
