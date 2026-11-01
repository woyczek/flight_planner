"""Cycles AIRAC des sources datées du dossier SIA (V3, 1er nov. 2026) : quel cycle le poste détient pour chaque source qui en a un.

Une source cyclée porte la date de son cycle dans le nom de ses fichiers : le SIA (France : AIXM4.5_all_FR_OM_AAAA-MM-JJ.xml,
XML_SIA_AAAA-MM-JJ.xml, sia-airspaces-AAAA-MM-JJ.xml), NATS (Royaume-Uni : zones/gb/EG_…_AAAAMMJJ.xml), ENAIRE (Espagne :
aixm5/LE_Amdt_A_AAAA_NN_…, l'amendement AIRAC NN de l'année, lu comme le cycle AANN ; un nom sans « A_AAAA_NN » ne dit pas son cycle).
Les autres sources (openAIP, GeoNames, relief, UK Mil, NAV CANADA, NAT, X-Plane, MORA…) n'ont pas de cycle AIRAC : jamais « dépassées ».
Le cycle d'une zone est celui de SA source cyclée (fr : sia, gb : nats, es : enaire) ; une zone sans source cyclée n'a pas de cycle.

Utilisé par tools/regen/base_sources.py (base/fetch) et tools/regen/base.py (base/build). Bibliothèque standard seulement.
"""
import datetime
import re

REF = datetime.date(2024, 1, 25)  # AIRAC 2401
CYCLED = {'sia': 'fr', 'nats': 'gb', 'enaire': 'es'}  # source cyclée → sa zone (modules : shared/aero_zones.js, catalogue.js)
ZONE_SOURCE = {z: s for s, z in CYCLED.items()}
_SIA = re.compile(r'^(?:AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)(\d{4})-(\d{2})-(\d{2})\.xml$', re.I)
_NATS = re.compile(r'^zones/gb/EG_[A-Za-z0-9_]*?_(\d{4})(\d{2})(\d{2})\.xml$')
_ENAIRE = re.compile(r'^aixm5/LE_(?:Amdt_)?A_(\d{4})_(\d{2})_[A-Za-z0-9_]*\.xml$')


def airac_start(d=None):
    """Début (AAAA-MM-JJ) du cycle AIRAC qui contient le jour d (aujourd'hui sans d) : calendrier de 28 jours depuis AIRAC 2401."""
    d = d or datetime.date.today()
    return (REF + datetime.timedelta(days=28 * ((d - REF).days // 28))).isoformat()


def cycle_start(year, n):
    """Début du cycle AIRAC n de l'année (1 à 13 ou 14) : le premier cycle qui commence dans l'année, plus 28 jours par rang ; None hors
    de l'année."""
    first = REF + datetime.timedelta(days=28 * -(-(datetime.date(year, 1, 1) - REF).days // 28))
    d = first + datetime.timedelta(days=28 * (n - 1))
    return d.isoformat() if n >= 1 and d.year == year else None


def cycled(rel):
    """(source, cycle) d'un fichier de data/sia/ (chemin relatif avec « / ») qui porte la date de son cycle ; None sinon."""
    rel = str(rel).replace('\\', '/')
    try:
        m = _SIA.match(rel)
        if m:
            return 'sia', airac_start(datetime.date(*map(int, m.groups())))
        m = _NATS.match(rel)
        if m:
            return 'nats', airac_start(datetime.date(*map(int, m.groups())))
        m = _ENAIRE.match(rel)
        if m:
            c = cycle_start(int(m.group(1)), int(m.group(2)))
            return ('enaire', c) if c else None
    except ValueError:  # une date impossible dans un nom : pas de cycle
        return None
    return None


def report(rels, today=None):
    """{ source cyclée: { cycle (le plus récent de ses fichiers présents, None sans fichier), current, stale } } pour un ensemble de
    chemins relatifs de data/sia/ ; stale : un cycle connu plus ancien que le cycle en vigueur."""
    current = airac_start(today)
    best = dict.fromkeys(CYCLED)
    for rel in rels:
        hit = cycled(rel)
        if hit and (best[hit[0]] is None or hit[1] > best[hit[0]]):
            best[hit[0]] = hit[1]
    return {s: {'cycle': c, 'current': current, 'stale': bool(c and c < current)} for s, c in best.items()}


def zone_cycle(zone, sources):
    """Le cycle d'une zone : celui de sa source cyclée (report), None si elle n'en a pas ou si aucun fichier ne le dit."""
    s = ZONE_SOURCE.get(zone)
    return sources.get(s, {}).get('cycle') if s else None
