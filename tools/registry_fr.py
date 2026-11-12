"""Le registre français des immatriculations, lu sur ce poste seulement (SOG-0270) : d'une immatriculation, son type ; d'un type, les immatriculations connues.

RÈGLES (ergonome et Sécurisation, 12 nov. 2026) :
  · le fichier d'origine (export.csv du registre de la DGAC, 13 colonnes dont HUIT sont des tiers : propriétaire, locataire, créancier, personne saisissante et leurs adresses) n'est JAMAIS gardé : seul le dérivé à CINQ colonnes l'est, sous data/local/registry/ (jamais dans le
    dépôt des données, tant que la licence de réutilisation n'a pas été lue) ;
  · liste BLANCHE de cinq colonnes, retrouvées par leur NOM d'en-tête : IMMATRICULATION, CONSTRUCTEUR, MODELE, NUMERO_SERIE, AERODROME_ATTACHE ; les autres colonnes ne sont pas conservées, pas même lues dans une variable gardée ;
  · aucune ligne du fichier dans un message d'erreur, dans le journal ni dans un résultat : les refus disent la RAISON (code), jamais un contenu ;
  · des bornes : taille du fichier, nombre de lignes, longueur d'une ligne physique, longueur d'un champ gardé, forme d'une immatriculation (les lignes hors forme sont comptées, pas gardées).
Le type du registre est un libellé de constructeur et de modèle, pas un code OACI : la correspondance vers nos types est faite par l'appelant (la base locale des types) ; ici, rien n'est deviné. Bibliothèque standard seulement."""
import csv
import json
import os
import re
import time

WHITELIST = ('IMMATRICULATION', 'CONSTRUCTEUR', 'MODELE', 'NUMERO_SERIE', 'AERODROME_ATTACHE')
MAX_BYTES = 40 * 1024 * 1024        # le fichier fait 3,7 Mo (43 260 lignes)
MAX_ROWS = 300000
MAX_LINE = 4096                      # une ligne physique plus longue : refusé (guillemets non fermés, fichier piégé)
MAX_FIELD = 80
MIN_MAKER = 5                         # k-anonymat (Sécurisation, 12 nov. 2026) : la colonne CONSTRUCTEUR de constructeurs AMATEURS porte des NOMS DE PERSONNES PHYSIQUES (« NOM PRÉNOM ») : un constructeur n'est gardé que s'il est partagé par au moins 5 aéronefs du fichier, sinon il est laissé VIDE (l'écran dit « constructeur non précisé »)
REG = re.compile(r'[A-Z0-9]{1,2}-[A-Z0-9]{2,6}|[A-Z0-9]{4,8}')      # « F-BHHH », « HB-ABC », « N12345 »
OUT_NAME = 'fr_immat.json'
CREDIT = 'Registre français des immatriculations, DGAC'


class RegistryError(ValueError):
    """Un refus qui ne dit que sa RAISON (code), jamais un contenu du fichier : 'size', 'headers', 'line', 'rows', 'empty', 'read'."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


def sniff(head):
    """Vrai si les premiers octets sont l'en-tête du registre (IMMATRICULATION, CONSTRUCTEUR, MODELE) : le fichier est reconnu par son CONTENU, quel que soit son nom."""
    try:
        text = bytes(head[:4096]).decode('utf-8-sig', 'ignore').upper()
    except Exception:
        return False
    first = text.split('\n', 1)[0]
    return all(w in first for w in ('IMMATRICULATION', 'CONSTRUCTEUR', 'MODELE')) and ';' in first


def _clean(v):
    return re.sub(r'[\x00-\x1f\x7f]', '', str(v)).strip()[:MAX_FIELD]


def _lines(f):
    n = 0
    for line in f:
        if len(line) > MAX_LINE:
            raise RegistryError('line')
        n += 1
        if n > MAX_ROWS * 3:
            raise RegistryError('rows')
        yield line


def derive(src, out_dir, today=None):
    """Le dérivé à cinq colonnes de `src` (un export.csv du registre), écrit dans `out_dir`/fr_immat.json (atomique) ; rend { rows, skipped, date, size }. RegistryError (code seul) sinon. `src` n'est ni copié ni gardé."""
    try:
        size = os.path.getsize(src)
    except OSError:
        raise RegistryError('read') from None
    if size > MAX_BYTES:
        raise RegistryError('size')
    rows, skipped, seen = [], 0, set()
    try:
        with open(src, encoding='utf-8-sig', newline='') as f:
            reader = csv.reader(_lines(f), delimiter=';')
            header = next(reader, None)
            if not header:
                raise RegistryError('empty')
            names = [_clean(h).upper() for h in header]
            if any(names.count(k) > 1 for k in WHITELIST):          # un nom de la liste blanche en double : refusé (« index » prendrait le premier : une colonne de tiers renommée avant la vraie y passerait)
                raise RegistryError('headers')
            idx = {k: names.index(k) for k in WHITELIST if k in names}
            if 'IMMATRICULATION' not in idx or 'MODELE' not in idx or 'CONSTRUCTEUR' not in idx:
                raise RegistryError('headers')
            for r in reader:
                cells = [_clean(r[idx[k]]) if k in idx and idx[k] < len(r) else '' for k in WHITELIST]
                cells[0] = cells[0].upper()
                if not REG.fullmatch(cells[0]) or not cells[2]:
                    skipped += 1
                    continue
                key = tuple(cells)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(cells)
                if len(rows) > MAX_ROWS:
                    raise RegistryError('rows')
    except RegistryError:
        raise
    except (OSError, UnicodeDecodeError, csv.Error):
        raise RegistryError('read') from None
    if not rows:
        raise RegistryError('empty')
    makers = {}
    for r in rows:                                    # un passage de comptage AVANT d'écrire : aéronefs (immatriculations distinctes) par constructeur
        makers.setdefault(r[1], set()).add(r[0])
    blanked = 0
    for r in rows:
        if r[1] and len(makers[r[1]]) < MIN_MAKER:
            r[1] = ''
            blanked += 1
    date = time.strftime('%Y-%m-%d', time.localtime(today if today is not None else os.path.getmtime(src)))
    doc = {'schema': 1, 'source': CREDIT, 'date': date, 'columns': list(WHITELIST), 'rows': rows}
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, OUT_NAME)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, path)
    return {'rows': len(rows), 'skipped': skipped, 'makerBlanked': blanked, 'date': date, 'size': size}


_cache = {}


def load(out_dir):
    """Le dérivé gardé (mis en mémoire tant que le fichier ne change pas), ou None."""
    path = os.path.join(out_dir, OUT_NAME)
    try:
        st = os.stat(path)
    except OSError:
        return None
    key = (path, st.st_mtime_ns, st.st_size)
    if _cache.get('key') != key:
        try:
            with open(path, encoding='utf-8') as f:
                doc = json.load(f)
        except (OSError, ValueError):
            return None
        if not isinstance(doc, dict) or doc.get('columns') != list(WHITELIST) or not isinstance(doc.get('rows'), list):
            return None
        _cache['key'], _cache['doc'] = key, doc
    return _cache['doc']


def _norm_reg(s):
    return re.sub(r'[^A-Z0-9]', '', str(s).upper())


def lookup(doc, reg=None, type_=None, limit=50):
    """Les lignes du dérivé : `reg` (immatriculation, avec ou sans tiret : « F-BHHH », « FBHHH ») → ses lignes ; `type_` (mots du constructeur et du modèle, tous requis : « cessna 172 ») → les lignes dont constructeur + modèle les portent,
    `limit` au plus. [{ reg, maker, model, serial, base }] ; jamais une colonne d'un tiers (le dérivé n'en a pas)."""
    out = []
    if doc is None:
        return out
    want = _norm_reg(reg) if reg else ''
    words = [w for w in re.split(r'\s+', str(type_ or '').lower().strip()) if w]
    if not want and not words:
        return out
    for r in doc['rows']:
        if want and _norm_reg(r[0]) != want:
            continue
        if words:
            hay = f'{r[1]} {r[2]}'.lower()
            if not all(w in hay for w in words):
                continue
        out.append({'reg': r[0], 'maker': r[1], 'model': r[2], 'serial': r[3], 'base': r[4]})
        if len(out) >= limit:
            break
    return out
