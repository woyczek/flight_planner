"""Les routes PUBLIÉES de la FAA, lues dans l'abonnement NASR complet déjà déposé : routes préférentielles (PFR_BASE.csv, dont les routes nord-américaines « NAR ») et routes de départ codées (CDR.csv) — SOG-0354, lot L1.

Un LECTEUR, rien d'autre : il lit un fichier déposé (les octets du zip « CSV_Data/<JJ>_<Mon>_<AAAA>_CSV.zip » que tools/faa_nasr.py sait sortir de l'abonnement) et rend des données ; il n'écrit aucun fichier, ne prend aucun réseau, n'exécute rien. Le fichier est une ENTRÉE NON FIABLE :
  · la lecture des membres passe par faa_nasr.rows (taille du membre bornée, mise en forme du zip bornée par zip_guard) ;
  · chaque colonne est retrouvée par son NOM d'en-tête (jamais par sa place) et la liste est BLANCHE : seules les colonnes utiles sont gardées ;
  · chaque valeur est validée par un motif strict (identifiant de point, type de route, chaîne de route) : une ligne dont une valeur ne passe pas n'est pas gardée, elle est COMPTÉE (`skipped`), jamais corrigée ;
  · bornes : nombre de lignes (MAX_ROWS), longueur de chaque valeur ; aucune valeur n'est interprétée comme une formule, une adresse ou du code.
Ce que le lecteur a appris du fichier du 29 octobre 2026 (voir docs/technique/V3_ROUTE_GATES.md § 2) : `PFR_TYPE_CODE` = NAR / TEC / H / L / SHD / HPD / SLD ; `NAR_TYPE` = COMMON (765 lignes : un point côtier (océan) et un point intérieur, avec le DÉSIGNATEUR de la route, N503B…) ou NON-COMMON (617 : d'un point
intérieur à un aérodrome, avec la chaîne de la route) ; tous les points que ces routes nomment (275 points et balises) ont une position dans FIX_BASE / NAV_BASE. Bibliothèque standard seulement."""
import re

import faa_nasr

MAX_ROWS = 200_000
TYPES = ('NAR', 'TEC', 'H', 'L', 'SHD', 'HPD', 'SLD', 'HSD', 'LSD', 'LPD')      # PFR_TYPE_CODE connus (HSD / LSD : les anciens noms de HPD / LPD, renommés par la FAA en 2026)
NAR_TYPES = ('', 'COMMON', 'NON-COMMON')
ID = re.compile(r'[A-Z0-9]{1,5}\Z', re.A)
ROUTE = re.compile(r'[A-Z0-9][A-Z0-9 ./-]{0,299}\Z', re.A)
TEXT = re.compile(r'[A-Za-z0-9 ,;:./()&\'+-]{0,150}\Z', re.A)
CODE = re.compile(r'[A-Z0-9]{1,8}\Z', re.A)
ICAO = re.compile(r'[A-Z0-9]{3,4}\Z', re.A)
CENTER = re.compile(r'[A-Z0-9]{2,4}\Z', re.A)
DESIGNATOR = re.compile(r'[A-Z0-9]{1,16}\Z', re.A)


def _v(r, key, limit=300):
    """La valeur d'une colonne : texte sans blancs aux bouts, '' si absente. JAMAIS corrigée : un caractère de commande rend la valeur invalide (elle ne passe aucun motif) et une valeur plus longue que `limit` garde UN signe de trop, que le motif refuse (on ne tronque pas :
    une valeur tronquée dirait autre chose que le fichier)."""
    v = r.get(key)
    if not isinstance(v, str):
        return ''
    if re.search(r'[\x00-\x1f\x7f]', v):
        return '\x00'
    return v.strip()[:limit + 1]


def _row(r):
    return {k.strip().upper(): v for k, v in r.items() if isinstance(k, str)}


def read_pfr(blob):
    """([routes], ignorées) de PFR_BASE.csv : { type, narType, origin, dest, no, designator, inland, coastal, route, alt, hours, dir } ; les valeurs vides sont absentes. `type` est un des TYPES ; `narType` seulement pour une route nord-américaine ;
    `designator` (N503B…) pour une route COMMON ; `route` la chaîne de la route (les routes NON-COMMON et les routes préférentielles). ValueError si le fichier manque ou n'a pas les colonnes (mise en page changée)."""
    out, skipped = [], 0
    seen_header = False
    for n, raw in enumerate(faa_nasr.rows(blob, 'PFR_BASE.csv')):
        if n >= MAX_ROWS:
            raise ValueError('PFR_BASE.csv : trop de lignes')
        r = _row(raw)
        if not seen_header:
            if not {'ORIGIN_ID', 'DSTN_ID', 'PFR_TYPE_CODE', 'NAR_TYPE', 'ROUTE_STRING'} <= set(r):
                raise ValueError('PFR_BASE.csv : colonnes attendues absentes (mise en page changée ?)')
            seen_header = True
        typ, nar = _v(r, 'PFR_TYPE_CODE', 3).upper(), _v(r, 'NAR_TYPE', 20).upper()
        origin, dest = _v(r, 'ORIGIN_ID', 5).upper(), _v(r, 'DSTN_ID', 5).upper()
        route, designator = _v(r, 'ROUTE_STRING').upper(), _v(r, 'DESIGNATOR', 16).upper()
        inland, coastal = _v(r, 'INLAND_FAC_FIX', 5).upper(), _v(r, 'COASTAL_FIX', 5).upper()
        number = _v(r, 'ROUTE_NO', 3)
        ok = (typ in TYPES and nar in NAR_TYPES and ID.fullmatch(origin) and ID.fullmatch(dest) and (not route or ROUTE.fullmatch(route)) and (not designator or DESIGNATOR.fullmatch(designator))
              and all(not x or ID.fullmatch(x) for x in (inland, coastal)) and (not number or (number.isdigit() and len(number) <= 3)))
        texts = {k: _v(r, c, 150) for k, c in (('alt', 'ALT_DESCRIP'), ('hours', 'HOURS'), ('dir', 'ROUTE_DIR_DESCRIP'))}
        if not ok or not all(TEXT.fullmatch(t) for t in texts.values()):
            skipped += 1
            continue
        item = {'type': typ, 'origin': origin, 'dest': dest, 'no': int(number) if number else 0}
        for key, value in (('narType', nar), ('designator', designator), ('inland', inland), ('coastal', coastal), ('route', route), *texts.items()):
            if value:
                item[key] = value
        out.append(item)
    if not seen_header:
        raise ValueError('PFR_BASE.csv : aucune ligne')
    return out, skipped


def read_cdr(blob):
    """([routes], ignorées) de CDR.csv (les routes de départ codées de la FAA) : { code, orig, dest, depfix, route, dcntr, acntr, length? } ; les mêmes règles que read_pfr."""
    out, skipped = [], 0
    seen_header = False
    for n, raw in enumerate(faa_nasr.rows(blob, 'CDR.csv')):
        if n >= MAX_ROWS:
            raise ValueError('CDR.csv : trop de lignes')
        r = _row(raw)
        if not seen_header:
            if not {'RCODE', 'ORIG', 'DEST', 'ROUTE STRING'} <= set(r):
                raise ValueError('CDR.csv : colonnes attendues absentes (mise en page changée ?)')
            seen_header = True
        code, orig, dest = _v(r, 'RCODE', 8).upper(), _v(r, 'ORIG', 4).upper(), _v(r, 'DEST', 4).upper()
        depfix, route = _v(r, 'DEPFIX', 6).upper(), _v(r, 'ROUTE STRING', 200).upper()
        dcntr, acntr, length = _v(r, 'DCNTR', 4).upper(), _v(r, 'ACNTR', 4).upper(), _v(r, 'LENGTH', 6)
        if not (CODE.fullmatch(code) and ICAO.fullmatch(orig) and ICAO.fullmatch(dest) and (not depfix or ID.fullmatch(depfix)) and ROUTE.fullmatch(route)
                and all(not x or CENTER.fullmatch(x) for x in (dcntr, acntr)) and (not length or (length.isdigit() and len(length) <= 6))):
            skipped += 1
            continue
        item = {'code': code, 'orig': orig, 'dest': dest, 'route': route}
        for key, value in (('depfix', depfix), ('dcntr', dcntr), ('acntr', acntr)):
            if value:
                item[key] = value
        if length:
            item['length'] = int(length)
        out.append(item)
    if not seen_header:
        raise ValueError('CDR.csv : aucune ligne')
    return out, skipped


def read(blob):
    """{ pfr: [routes], cdr: [routes], skipped: { pfr, cdr }, counts: { pfr: { type: n }, nar: { COMMON: n, NON-COMMON: n }, cdr: n } } du zip des jeux CSV (octets, tels que faa_nasr.sub_blobs les rend). ValueError, avec la raison, si un fichier manque ou change de mise en page."""
    pfr, skip_pfr = read_pfr(blob)
    cdr, skip_cdr = read_cdr(blob)
    types, nars = {}, {}
    for r in pfr:
        types[r['type']] = types.get(r['type'], 0) + 1
        if r.get('narType'):
            nars[r['narType']] = nars.get(r['narType'], 0) + 1
    return {'pfr': pfr, 'cdr': cdr, 'skipped': {'pfr': skip_pfr, 'cdr': skip_cdr}, 'counts': {'pfr': dict(sorted(types.items())), 'nar': dict(sorted(nars.items())), 'cdr': len(cdr)}}


def from_subscription(path):
    """read() d'un abonnement complet déposé (`28DaySubscription_Effective_AAAA-MM-JJ.zip`, tools/faa_nasr.sub_blobs) ; ValueError s'il n'en est pas un."""
    return read(faa_nasr.sub_blobs(path)[0])


def point_names(routes):
    """L'ensemble des noms de points (cinq lettres) que nomment les routes : le point côtier et le point intérieur des routes COMMON, et les mots de cinq lettres des chaînes — pour vérifier qu'ils ont une position (FIX_BASE, NAV_BASE)."""
    out = set()
    for r in routes:
        for k in ('inland', 'coastal'):
            if r.get(k):
                out.add(r[k])
        for w in str(r.get('route', '')).split():
            if re.fullmatch(r'[A-Z]{5}', w, re.A):
                out.add(w)
    return out


def located(blob):
    """{ nom } des points et balises qui ont une position dans le même zip (FIX_BASE.csv : FIX_ID ; NAV_BASE.csv : NAV_ID), et { nom } de ceux du Canada (COUNTRY_CODE = CA) : (tous, canadiens)."""
    every, canada = set(), set()
    for member, key in (('FIX_BASE.csv', 'FIX_ID'), ('NAV_BASE.csv', 'NAV_ID')):
        for raw in faa_nasr.rows(blob, member):
            r = _row(raw)
            name = _v(r, key, 8).upper()
            if name:
                every.add(name)
                if _v(r, 'COUNTRY_CODE', 3).upper() == 'CA':
                    canada.add(name)
    return every, canada
