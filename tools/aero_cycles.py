"""Cycles AIRAC des sources datées du dossier SIA (V3, 1er nov. 2026) : quel cycle le poste détient pour chaque source qui en a un.

Une source cyclée porte la date de son cycle dans le nom de ses fichiers : le SIA (France : AIXM4.5_all_FR_OM_AAAA-MM-JJ.xml,
XML_SIA_AAAA-MM-JJ.xml, sia-airspaces-AAAA-MM-JJ.xml), NATS (Royaume-Uni : zones/gb/EG_…_AAAAMMJJ.xml). ENAIRE (Espagne : aixm5/LE_Amdt_…_AIP_DS_FULL_(Airspace|EnRoute).xml)
ne date pas son cycle dans le nom : « A_2026_10 » est le 10e amendement AIRAC d'ENAIRE de 2026, pas le cycle 2610 (le jeu valable dès le 29 oct. 2026, cycle 2611, porte « A_2026_10 » :
SOG-0025, 5 nov. 2026) ; le cycle d'un jeu ENAIRE est celui de la plus récente date de début de validité (gml:validTime › gml:beginPosition, jusqu'à aujourd'hui) que le fichier porte.
Les autres sources (openAIP, GeoNames, relief, UK Mil, NAV CANADA, NAT, X-Plane, MORA…) n'ont pas de cycle AIRAC : jamais « dépassées ».
Le cycle d'une zone est celui de SA source cyclée (fr : sia, gb : nats, es : enaire) ; une zone sans source cyclée n'a pas de cycle.

Utilisé par tools/regen/base_sources.py (base/fetch) et tools/regen/base.py (base/build). Bibliothèque standard seulement.
"""
import datetime
import os
import re

REF = datetime.date(2024, 1, 25)  # AIRAC 2401
CYCLED = {'sia': 'fr', 'nats': 'gb', 'enaire': 'es', 'airnav': 'ie'}  # source cyclée → sa zone (modules : shared/aero_zones.js, catalogue.js)
ZONE_SOURCE = {z: s for s, z in CYCLED.items()}
_SIA = re.compile(r'^(?:AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)(\d{4})-(\d{2})-(\d{2})\.xml$', re.I)
_NATS = re.compile(r'^zones/gb/EG_AIP_DS_[A-Za-z0-9_]*?(\d{4})(\d{2})(\d{2})\.xml$')     # l'AIP seul date le cycle (SOG-0077) : un jeu de zones de drones ou d'obstacles daté d'un cycle PLUS TARD (EG_UAS_…_20261126) ne dit rien de l'AIP
_AIRNAV = re.compile(r'^zones/ie/airnav_ie_enr_(\d{4})(\d{2})(\d{2})\.geojson$')       # la date de l'édition de l'eAIP d'Irlande (tools/airnav_eaip.py)
_ENAIRE = re.compile(r'^aixm5/LE_[A-Za-z0-9_]*_AIP_DS_FULL_(?:Airspace|EnRoute)\.xml$')
_VALID = re.compile(rb'<gml:validTime>\s*<gml:TimePeriod[^>]*>\s*<gml:beginPosition>(\d{4})-(\d{2})-(\d{2})')
ENAIRE_MAX = 64 * 1024 * 1024  # un jeu ENAIRE fait une dizaine de Mo : au-delà, il n'est pas lu pour son cycle


def airac_start(d=None):
    """Début (AAAA-MM-JJ) du cycle AIRAC qui contient le jour d (aujourd'hui sans d) : calendrier de 28 jours depuis AIRAC 2401."""
    d = d or datetime.date.today()
    return (REF + datetime.timedelta(days=28 * ((d - REF).days // 28))).isoformat()


def enaire_cycle(path, today=None):
    """Le cycle d'un jeu AIXM 5.1 d'ENAIRE : le début du cycle AIRAC qui contient la plus récente date de début de validité (gml:validTime › gml:beginPosition) du fichier, sans dépasser
    aujourd'hui ; None si le fichier est illisible, trop gros ou sans date. Le fichier est celui d'un poste : jamais exécuté, lu en octets, borné."""
    today = today or datetime.date.today()
    try:
        if os.path.getsize(path) > ENAIRE_MAX:
            return None
        with open(path, 'rb') as f:
            raw = f.read()
    except OSError:
        return None
    best = None
    for m in _VALID.finditer(raw):
        try:
            d = datetime.date(*map(int, m.groups()))
        except ValueError:
            continue
        if d <= today and (best is None or d > best):
            best = d
    return airac_start(best) if best else None


def cycled(rel, root=None, today=None):
    """(source, cycle) d'un fichier de data/sia/ (chemin relatif avec « / ») qui porte la date de son cycle ; None sinon. root : le dossier data/sia/, pour lire le cycle d'un jeu ENAIRE
    dans le fichier."""
    rel = str(rel).replace('\\', '/')
    try:
        m = _SIA.match(rel)
        if m:
            return 'sia', airac_start(datetime.date(*map(int, m.groups())))
        m = _NATS.match(rel)
        if m:
            return 'nats', airac_start(datetime.date(*map(int, m.groups())))
        m = _AIRNAV.match(rel)
        if m:
            return 'airnav', airac_start(datetime.date(*map(int, m.groups())))
        if root and _ENAIRE.match(rel):
            c = enaire_cycle(os.path.join(root, *rel.split('/')), today)
            return ('enaire', c) if c else None
    except ValueError:  # une date impossible dans un nom : pas de cycle
        return None
    return None


def report(rels, today=None, root=None):
    """{ source cyclée: { cycle (le plus récent de ses fichiers présents, None sans fichier), current, stale } } pour un ensemble de
    chemins relatifs de data/sia/ (root : ce dossier, pour lire le cycle des jeux ENAIRE) ; stale : un cycle connu plus ancien que le cycle en vigueur."""
    current = airac_start(today)
    best = dict.fromkeys(CYCLED)
    for rel in rels:
        hit = cycled(rel, root, today)
        if hit and (best[hit[0]] is None or hit[1] > best[hit[0]]):
            best[hit[0]] = hit[1]
    return {s: {'cycle': c, 'current': current, 'stale': bool(c and c < current)} for s, c in best.items()}


PERSONAL_CYCLED = ('nats', 'enaire', 'airnav')    # les sources datées sous licence d'usage personnel : lues seulement si la case « personnel » les déclare (shared/aero_zones.js, personal: 'licence' ; base/build, argument personal)


def used_sources(sources, personal=()):
    """Les sources datées (report) dont la construction a LU les fichiers : le SIA toujours, une source sous licence d'usage personnel seulement si `personal` la déclare. Une zone construite sans elle n'a pas son cycle
    (SOG-0077 : gb construite sans NATS portait le cycle d'un fichier NATS qu'elle n'avait pas lu, et masquait la base d'avant, qui avait les routes)."""
    return {s: v for s, v in sources.items() if s not in PERSONAL_CYCLED or s in set(personal or ())}


def zone_cycle(zone, sources):
    """Le cycle d'une zone : celui de sa source cyclée (report), None si elle n'en a pas ou si aucun fichier ne le dit."""
    s = ZONE_SOURCE.get(zone)
    return sources.get(s, {}).get('cycle') if s else None


# ---------------------------------------------------------------------------------------------------------- où sont les XML bruts du SIA (DATA_MAP § 4, lot C2)
SIA_RAW = re.compile(r'^(?:AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)(\d{4}-\d{2}-\d{2})\.xml\Z', re.I | re.A)   # les XML bruts du SIA (la racine de data/sia/ avant le déplacement)
LOCAL_SOURCES = 'local/sources'                                                                              # data/local/sources/<source>/<cycle>/ : l'emplacement des sources brutes datées (DATA_MAP § 4)


def sia_raw_dir(data):
    """data/local/sources/sia/ : un dossier par cycle (AAAA-MM-JJ), les XML bruts du SIA dedans."""
    return os.path.join(data, *LOCAL_SOURCES.split('/'), 'sia')


def moved_sources(data):
    """Les XML bruts du SIA de l'emplacement nouveau : { nom: (cycle, chemin absolu) }, le dossier de cycle le plus récent l'emporte pour un même nom. Ni lien, ni nom hors de la règle des
    XML du SIA, ni dossier de cycle qui n'est pas une date."""
    out = {}
    try:
        cycles = sorted(e.name for e in os.scandir(sia_raw_dir(data)) if e.is_dir(follow_symlinks=False) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', e.name))
    except OSError:
        return out
    for cy in cycles:
        try:
            with os.scandir(os.path.join(sia_raw_dir(data), cy)) as it:
                for e in it:
                    if SIA_RAW.match(e.name) and not e.is_symlink() and e.is_file(follow_symlinks=False):
                        out[e.name] = (cy, e.path)
        except OSError:
            continue
    return out
