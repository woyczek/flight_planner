"""Le registre français des immatriculations, lu sur ce poste seulement (SOG-0270) : d'une immatriculation, son type ; d'un type, les immatriculations connues.

RÈGLES (ergonome et Sécurisation, 12 nov. 2026) :
  · le fichier d'origine (export.csv du registre de la DGAC, 13 colonnes dont HUIT sont des tiers : propriétaire, locataire, créancier, personne saisissante et leurs adresses) n'est JAMAIS gardé : seul le dérivé à CINQ colonnes l'est, sous data/local/registry/ (jamais dans le
    dépôt des données, tant que la licence de réutilisation n'a pas été lue) ;
  · liste BLANCHE de cinq colonnes, retrouvées par leur NOM d'en-tête : IMMATRICULATION, CONSTRUCTEUR, MODELE, NUMERO_SERIE, AERODROME_ATTACHE ; les autres colonnes ne sont pas conservées, pas même lues dans une variable gardée ;
  · aucune ligne du fichier dans un message d'erreur, dans le journal ni dans un résultat : les refus disent la RAISON (code), jamais un contenu ;
  · des bornes : taille du fichier, nombre de lignes, longueur d'une ligne physique, longueur d'un champ gardé, forme d'une immatriculation (les lignes hors forme sont comptées, pas gardées).
  · PUBLICATION (SOG-0341, Q-0060 : oui, le 16 nov. 2026 — la règle « jamais dans le dépôt des données » ci-dessus est levée pour CE fichier seulement) : `publish` écrit registry/fr_immat.json dans le dépôt privé du groupe, pour que le téléphone l'ait ; les
    cinq colonnes, rien d'autre, REVALIDÉES au moment d'écrire (le fichier n'est pas recopié : il est reconstruit ligne à ligne, k-anonymat du constructeur recompté) ; jamais l'exploitant (Q-0056), jamais le fichier d'origine.
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
MIN_MAKER = 10                        # k-anonymat (Sécurisation, 12 nov. 2026) : la colonne CONSTRUCTEUR de constructeurs AMATEURS porte des NOMS DE PERSONNES PHYSIQUES (« NOM PRÉNOM ») : un constructeur n'est gardé que s'il est partagé par au moins 10 aéronefs du fichier, sinon il est laissé VIDE (l'écran dit « constructeur non précisé »)
REG = re.compile(r'[A-Z0-9]{1,2}-[A-Z0-9]{2,6}|[A-Z0-9]{4,8}')      # « F-BHHH », « HB-ABC », « N12345 »
OUT_NAME = 'fr_immat.json'
REPO_FOLDER = 'registry'               # sous data/ (le dépôt des données du groupe) : registry/fr_immat.json (SOG-0341)
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


def _is_link(p):
    """Vrai pour un lien symbolique ou une jonction Windows (os.path.isjunction : Python 3.12 et plus ; avant, la comparaison des chemins réels de publish couvre le dossier)."""
    return os.path.islink(p) or bool(getattr(os.path, 'isjunction', lambda _p: False)(p))


def rebuild(doc):
    """(lignes, constructeurs vidés, date) d'un document du registre reconstruits comme une ENTRÉE NON FIABLE (SOG-0341) : exactement cinq cellules de texte par ligne, bornées et nettoyées, une immatriculation de la forme attendue, un type présent ; le k-anonymat du constructeur
    recompté ; la date AAAA-MM-JJ ou ''. Sert à publier (ce que le poste écrit) et à lire le fichier publié (ce que n'importe quel pilote a pu écrire). RegistryError('headers' | 'rows' | 'empty') sinon."""
    if not isinstance(doc, dict) or doc.get('columns') != list(WHITELIST) or not isinstance(doc.get('rows'), list):
        raise RegistryError('headers')
    if len(doc['rows']) > MAX_ROWS:
        raise RegistryError('rows')
    rows = []
    for r in doc['rows']:
        if not isinstance(r, list) or len(r) != len(WHITELIST) or not all(isinstance(x, str) for x in r):
            continue
        cells = [_clean(x) for x in r]
        if not REG.fullmatch(cells[0]) or not cells[2]:
            continue
        rows.append(cells)
    if not rows:
        raise RegistryError('empty')
    makers = {}
    for r in rows:
        makers.setdefault(r[1], set()).add(r[0])
    blanked = 0
    for r in rows:
        if r[1] and len(makers[r[1]]) < MIN_MAKER:
            r[1] = ''
            blanked += 1
    date = doc.get('date') if isinstance(doc.get('date'), str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', doc['date'], re.A) else ''
    return rows, blanked, date


def publish(local_dir, data_dir):
    """Le dérivé gardé sur ce poste (`local_dir`/fr_immat.json) publié dans le dépôt des données : `data_dir`/registry/fr_immat.json (SOG-0341), atomique. Rend { published: True, rows, makerBlanked, size } ; RegistryError (code seul : 'read', 'headers', 'rows',
    'empty', 'size') sinon, rien d'écrit. Le fichier publié n'est PAS une copie : il est reconstruit ligne à ligne depuis le dérivé — exactement les cinq colonnes, chaque cellule du texte borné et nettoyé, l'immatriculation de la forme attendue, le type
    présent, un constructeur partagé par moins de MIN_MAKER aéronefs laissé vide (recompté ici : on ne se fie pas à l'étape précédente) — et rien d'autre n'y entre (ni date d'une autre sorte, ni champ inconnu du dérivé)."""
    src = os.path.join(local_dir, OUT_NAME)
    try:
        if os.path.getsize(src) > MAX_BYTES:
            raise RegistryError('size')
        with open(src, encoding='utf-8') as f:
            doc = json.load(f)
    except RegistryError:
        raise
    except (OSError, ValueError, RecursionError, MemoryError):      # un JSON imbriqué sur des dizaines de milliers de niveaux lève RecursionError (Sécurisation) : un refus à code, jamais une exception qui échappe
        raise RegistryError('read') from None
    rows, blanked, date = rebuild(doc)
    out = {'schema': 1, 'source': CREDIT, 'date': date, 'columns': list(WHITELIST), 'rows': rows}
    folder = os.path.join(data_dir, REPO_FOLDER)
    path = os.path.join(folder, OUT_NAME)
    tmp = path + '.tmp'
    # data/registry peut être un LIEN commité par un pilote (le dépôt est ouvert à tous) : ni le dossier, ni la destination, ni le .tmp ne sont des liens (ni des jonctions Windows), et le dossier réel reste sous le dossier réel de data/
    try:
        if any(_is_link(x) for x in (folder, path, tmp)) or (os.path.lexists(folder) and not os.path.isdir(folder)):
            raise RegistryError('write')
        root = os.path.normcase(os.path.realpath(data_dir))
        os.makedirs(folder, exist_ok=True)
        if os.path.normcase(os.path.realpath(folder)) != os.path.join(root, REPO_FOLDER):
            raise RegistryError('write')
        try:
            with open(tmp, 'w', encoding='utf-8') as f:
                json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
            os.replace(tmp, path)
        finally:
            try:
                if os.path.lexists(tmp):
                    os.remove(tmp)
            except OSError:
                pass
    except OSError:
        raise RegistryError('write') from None
    return {'published': True, 'rows': len(rows), 'makerBlanked': blanked, 'size': os.path.getsize(path)}


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
