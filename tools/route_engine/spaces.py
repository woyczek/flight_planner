"""SOG-0513 (C a) : les contours d'espaces de la base (FIR, UIR, …) lus par le moteur, de façon BORNÉE.

Le fichier `airspaces.json` d'une zone est une donnée du dépôt des données : jamais digne de confiance. Ici : un fichier lu par `safe_json` (taille bornée, jamais d'exception), au plus MAX_SPACES espaces, MAX_RINGS anneaux par espace, MAX_RING_POINTS sommets par anneau et MAX_POINTS sommets en tout ; des nombres FINIS, une latitude de −90 à 90 et une longitude de −180 à 180 (un sommet hors de ces limites ou un anneau de moins de trois sommets est écarté) ; rien n'est écrit.

`read(folder, types)` → [{ name, type, lower_ft, upper_ft, rings, box }] ; `inside(space, lat, lon)` : dans l'un des anneaux (règle pair-impair : un anneau dans un anneau est un trou) ; `covers(space, lat, lon, ft)` : de plus, dans les limites verticales (une limite inconnue n'est jamais devinée : faux).
Les anneaux de la base sont [lat, lon] (SPEC) ; ceux des FIR et des UIR sont SIMPLIFIÉS à la construction (quelques dizaines de sommets : un repère, jamais une frontière à la minute) : un test à moins de quelques milles d'une limite n'est pas décidé par l'appelant.
"""
import os
import re

try:
    import safe_json
except ImportError:      # le lanceur place tools/ dans le chemin ; sans lui, aucun contour (jamais une exception)
    safe_json = None

MAX_FILE_BYTES = 64 * 1024 * 1024
MAX_SPACES = 30000
MAX_RINGS = 64
MAX_RING_POINTS = 20000
MAX_POINTS = 1500000
LEVEL = re.compile(r'^\s*(?:FL\s*(\d{1,3})|(\d{1,6})\s*(?:FT|F)?\s*(?:AMSL|AGL|ASFC|MSL|ALT)?)\s*$', re.I)


def level_ft(text):
    """La limite verticale d'un espace en pieds : « SFC » / « GND » 0, « FL 245 » 24 500, « 5500 ft AMSL » 5 500 ; None quand elle n'est pas lue (« UNL », un texte libre) : jamais devinée."""
    if isinstance(text, bool) or not isinstance(text, (str, int, float)):
        return None
    if isinstance(text, (int, float)):
        return float(text) if 0 <= text <= 100000 else None      # la comparaison AVANT la conversion : un entier de 400 chiffres est valable pour `<=` et fait lever `float()` ; NaN et l'infini ratent la comparaison d'eux-mêmes
    s = text.strip().upper()
    if s in ('SFC', 'GND', 'GROUND', 'MSL'):
        return 0.0
    m = LEVEL.match(s)
    if not m:
        return None
    return float(int(m.group(1)) * 100) if m.group(1) else float(int(m.group(2)))


def _ring(raw):
    """Un anneau [[lat, lon], …] : une liste de (lat, lon) finis dans leurs limites ; None si illisible ou de moins de trois sommets."""
    if not isinstance(raw, list) or len(raw) > MAX_RING_POINTS:
        return None
    out = []
    for p in raw:
        if not isinstance(p, (list, tuple)) or len(p) < 2:
            return None
        la, lo = p[0], p[1]
        if isinstance(la, bool) or isinstance(lo, bool) or not isinstance(la, (int, float)) or not isinstance(lo, (int, float)):
            return None
        if not (-90 <= la <= 90 and -180 <= lo <= 180):      # bornes AVANT toute conversion (entier géant : valable pour la comparaison, jamais converti) ; NaN et l'infini y échouent
            return None
        out.append((float(la), float(lo)))
    return out if len(out) >= 3 else None


def parse(rows, types=None):
    """Les espaces des lignes `rows` (une liste de la base), bornés ; `types` : les types gardés (None : tous)."""
    out = []
    total = 0
    if not isinstance(rows, list):
        return out
    try:
        for row in rows[:MAX_SPACES]:
            kind = row.get('type') if isinstance(row, dict) else None
            if not isinstance(row, dict) or (types is not None and not (isinstance(kind, str) and kind in types)):      # un type non hachable (une liste) ne lève rien
                continue
            rings = []
            for raw in (row.get('rings') if isinstance(row.get('rings'), list) else [])[:MAX_RINGS]:
                ring = _ring(raw)
                if ring is None:
                    continue
                total += len(ring)
                if total > MAX_POINTS:
                    return out
                rings.append(ring)
            if not rings:
                continue
            lats = [p[0] for r in rings for p in r]
            lons = [p[1] for r in rings for p in r]
            name = row.get('name') if isinstance(row.get('name'), str) else ''
            out.append(dict(name=name[:120], type=str(row.get('type') or '')[:12], lower_ft=level_ft(row.get('lower')), upper_ft=level_ft(row.get('upper')), rings=rings, box=(min(lats), max(lats), min(lons), max(lons))))
    except (OverflowError, ValueError, TypeError, AttributeError):      # revue de Sécurisation : jamais d'exception chez l'appelant sur un fichier du dépôt des données : ce qui est déjà lu est rendu
        return out
    return out


def read(folder, types=None):
    """Les espaces de `folder`/airspaces.json (un dossier de cycle d'une zone de la base) ; [] sans fichier lisible."""
    if safe_json is None:
        return []
    doc, why = safe_json.read(os.path.join(str(folder), 'airspaces.json'), MAX_FILE_BYTES, encoding='utf-8')
    if why or not isinstance(doc, dict):
        return []
    return parse(doc.get('data'), types)


def inside(space, lat, lon):
    """Le point est dans l'espace : règle pair-impair sur tous ses anneaux (un anneau dans un anneau est un trou) ; hors de la boîte : faux sans parcours."""
    if isinstance(lat, bool) or isinstance(lon, bool) or not (isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and -90 <= lat <= 90 and -180 <= lon <= 180):
        return False
    s, n, w, e = space['box']
    if not (s <= lat <= n and w <= lon <= e):
        return False
    hits = 0
    for ring in space['rings']:
        j = len(ring) - 1
        odd = False
        for i in range(len(ring)):
            (la_i, lo_i), (la_j, lo_j) = ring[i], ring[j]
            if (la_i > lat) != (la_j > lat) and lon < (lo_j - lo_i) * (lat - la_i) / (la_j - la_i) + lo_i:
                odd = not odd
            j = i
        hits += odd
    return hits % 2 == 1


def covers(space, lat, lon, ft):
    """Dans l'espace ET entre ses limites verticales (en pieds) ; une limite non lue : faux."""
    lo, hi = space.get('lower_ft'), space.get('upper_ft')
    if lo is None or hi is None or isinstance(ft, bool) or not isinstance(ft, (int, float)) or not lo <= ft <= hi:      # la comparaison d'abord : NaN la rate, un entier géant n'est jamais converti
        return False
    return inside(space, lat, lon)
