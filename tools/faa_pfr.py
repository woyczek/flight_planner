"""Les routes PUBLIÉES de la FAA, lues dans l'abonnement NASR complet déjà déposé : routes préférentielles (PFR_BASE.csv, dont les routes nord-américaines « NAR », et leur TRACÉ PFR_SEG.csv) et routes de départ codées (CDR.csv) — SOG-0354, lots L1 et L2b (2).

Un LECTEUR, rien d'autre : il lit un fichier déposé (les octets du zip « CSV_Data/<JJ>_<Mon>_<AAAA>_CSV.zip » que tools/faa_nasr.py sait sortir de l'abonnement) et rend des données ; il n'écrit aucun fichier, ne prend aucun réseau, n'exécute rien. Le fichier est une ENTRÉE NON FIABLE :
  · la lecture des membres passe par faa_nasr.rows (taille du membre bornée, nombre d'entrées de l'annuaire borné AVANT son analyse) puis par `_rows` : tout ce qui ne se lit pas (champ trop long, zip abîmé ou chiffré, texte non UTF-8) est UNE phrase fixe « <fichier> : fichier illisible », jamais le texte de l'exception ;
  · chaque colonne est retrouvée par son NOM d'en-tête (jamais par sa place) et la liste est BLANCHE : seules les colonnes utiles sont gardées ;
  · chaque valeur est validée par un motif strict (identifiant de point, type de route, chaîne de route) : une ligne dont une valeur ne passe pas n'est pas gardée, elle est COMPTÉE (`skipped`), jamais corrigée ;
  · bornes : nombre de lignes (MAX_ROWS), longueur de chaque valeur ; aucune valeur n'est interprétée comme une formule, une adresse ou du code.
Ce que le lecteur a appris du fichier du 29 octobre 2026 (voir docs/technique/V3_ROUTE_GATES.md § 2) : `PFR_TYPE_CODE` = NAR / TEC / H / L / SHD / HPD / SLD ; `NAR_TYPE` = COMMON (765 lignes : un point côtier (océan) et un point intérieur, avec le DÉSIGNATEUR de la route, N503B…) ou NON-COMMON (617 : d'un point
intérieur à un aérodrome, avec la chaîne de la route) ; tous les points que ces routes nomment (275 points et balises) ont une position dans FIX_BASE / NAV_BASE. Bibliothèque standard seulement."""
import csv
import re
import zipfile
import zlib

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
PLAY = re.compile(r'[A-Z0-9][A-Z0-9 _-]{0,24}\Z', re.A)
SEG_VALUE = re.compile(r'[A-Z0-9][A-Z0-9-]{0,15}\Z', re.A)      # un point, une balise, une voie, une procédure (« IMEBA-STAR » compris) ; une radiale ou un FRD sont des valeurs de la même forme
SEG_TYPES = ('FIX', 'NAVAID', 'AIRWAY', 'STAR', 'DP', 'RADIAL', 'FRD')
MAX_SEGMENTS = 200      # par route (le plus long du fichier du 29 octobre : 90 numéros de segment)
HOURS = re.compile(r'([01]\d|2[0-3])[0-5]\d-([01]\d|2[0-3])[0-5]\d\Z', re.A)


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


def _rows(blob, member):
    """faa_nasr.rows, avec UNE phrase fixe pour tout ce qui ne se lit pas (Sécurisation) : un champ de plus de 131 072 signes (csv.Error), un zip qui n'en est pas un ou dont un membre est abîmé (BadZipFile, zlib.error, EOFError), un zip chiffré (RuntimeError), un texte qui n'est pas de l'UTF-8 : ValueError « <fichier> : fichier illisible », jamais le texte de l'exception (il pourrait citer un contenu du fichier)."""
    try:
        yield from faa_nasr.rows(blob, member)
    except (csv.Error, zipfile.BadZipFile, zlib.error, EOFError, RuntimeError, UnicodeError, OSError):
        raise ValueError(f'{member} : fichier illisible') from None


def read_pfr(blob):
    """([routes], ignorées) de PFR_BASE.csv : { type, narType, origin, dest, no, designator, inland, coastal, route, alt, hours, dir } ; les valeurs vides sont absentes. `type` est un des TYPES ; `narType` seulement pour une route nord-américaine ;
    `designator` (N503B…) pour une route COMMON ; `route` la chaîne de la route (les routes NON-COMMON et les routes préférentielles). ValueError si le fichier manque ou n'a pas les colonnes (mise en page changée)."""
    out, skipped = [], 0
    seen_header = False
    for n, raw in enumerate(_rows(blob, 'PFR_BASE.csv')):
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
        texts = {k: _v(r, c, 150) for k, c in (('alt', 'ALT_DESCRIP'), ('hours', 'HOURS'), ('dir', 'ROUTE_DIR_DESCRIP'), ('aircraft', 'AIRCRAFT'), ('area', 'SPECIAL_AREA_DESCRIP'))}
        if not ok or not all(TEXT.fullmatch(t) for t in texts.values()):
            skipped += 1
            continue
        item = {'type': typ, 'origin': origin, 'dest': dest, 'no': int(number) if number else 0}
        for key, value in (('narType', nar), ('designator', designator), ('inland', inland), ('coastal', coastal), ('route', route), *texts.items()):
            if value:
                item[key] = value
        cond = conditions(item)
        if cond:
            item['conditions'] = cond
        out.append(item)
    if not seen_header:
        raise ValueError('PFR_BASE.csv : aucune ligne')
    return out, skipped


def read_cdr(blob):
    """([routes], ignorées) de CDR.csv (les routes de départ codées de la FAA) : { code, orig, dest, depfix, route, dcntr, acntr, length? } ; les mêmes règles que read_pfr."""
    out, skipped = [], 0
    seen_header = False
    for n, raw in enumerate(_rows(blob, 'CDR.csv')):
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
        equip, coord, play = _v(r, 'NAVEQP', 1), _v(r, 'COORDREQ', 1).upper(), _v(r, 'PLAY', 25).upper()
        if not (CODE.fullmatch(code) and ICAO.fullmatch(orig) and ICAO.fullmatch(dest) and (not depfix or ID.fullmatch(depfix)) and ROUTE.fullmatch(route)
                and all(not x or CENTER.fullmatch(x) for x in (dcntr, acntr)) and (not length or (length.isdigit() and len(length) <= 6))
                and (not equip or equip.isdigit()) and coord in ('', 'Y', 'N') and (not play or PLAY.fullmatch(play))):
            skipped += 1
            continue
        item = {'code': code, 'orig': orig, 'dest': dest, 'route': route}
        for key, value in (('depfix', depfix), ('dcntr', dcntr), ('acntr', acntr)):
            if value:
                item[key] = value
        if length:
            item['length'] = int(length)
        if equip:
            item['navEqp'] = int(equip)      # 1, 2 ou 3 dans le fichier : l'équipement de navigation que la route exige (le sens de chaque valeur est celui de la FAA : « CDR DATA LAYOUT.pdf »)
        if coord:
            item['coordReq'] = coord == 'Y'
        if play:
            item['play'] = play
        out.append(item)
    if not seen_header:
        raise ValueError('CDR.csv : aucune ligne')
    return out, skipped


def conditions(item):
    """Ce que la route PUBLIÉE demande de plus, en peu de signes (SOG-0354 L2b) : { hoursUtc: [de, à] (HHMM, « 1100-0300 »), jet / prop / single / rnav1 (vrai quand le texte des aéronefs le dit) } — le texte brut reste dans `aircraft`, `alt`, `dir`, `area`, `hours` de la route : une condition que ce relevé ne sait pas dire n'est JAMAIS tenue pour absente (le moteur traite un texte non vide qu'il n'interprète pas comme une restriction). Vide si la route n'en a aucune."""
    out = {}
    m = HOURS.fullmatch(item.get('hours', ''))
    if m:
        out['hoursUtc'] = [item['hours'][:4], item['hours'][5:]]
    air = item.get('aircraft', '').upper()
    for flag, pattern in (('jet', r'\bJETS?\b|\bTURBOJETS?\b'), ('prop', r'\bPROPS?\b'), ('single', r'SINGLE ENGINE'), ('rnav1', r'RNAV ?1\b')):
        if air and re.search(pattern, air):
            out[flag] = True
    return out


def read_seg(blob):
    """({ (origine, destination, type, numéro): [{ seq, value, type, country? }] triés par seq }, ignorées) de PFR_SEG.csv : le TRACÉ de chaque route publiée (les points, les voies, les procédures dans l'ordre), pour les routes qui en ont — toutes, sauf la plupart des routes COMMON (222 sur 765 : un point côtier,
    un point intérieur et un désignateur seulement). Mêmes règles que read_pfr : colonnes par nom, motifs stricts, une ligne refusée est comptée."""
    out, skipped = {}, 0
    seen_header = False
    for n, raw in enumerate(_rows(blob, 'PFR_SEG.csv')):
        if n >= MAX_ROWS:
            raise ValueError('PFR_SEG.csv : trop de lignes')
        r = _row(raw)
        if not seen_header:
            if not {'ORIGIN_ID', 'DSTN_ID', 'PFR_TYPE_CODE', 'ROUTE_NO', 'SEGMENT_SEQ', 'SEG_VALUE', 'SEG_TYPE'} <= set(r):
                raise ValueError('PFR_SEG.csv : colonnes attendues absentes (mise en page changée ?)')
            seen_header = True
        origin, dest, typ = _v(r, 'ORIGIN_ID', 5).upper(), _v(r, 'DSTN_ID', 5).upper(), _v(r, 'PFR_TYPE_CODE', 3).upper()
        number, seq, value, kind = _v(r, 'ROUTE_NO', 3), _v(r, 'SEGMENT_SEQ', 4), _v(r, 'SEG_VALUE', 16).upper(), _v(r, 'SEG_TYPE', 6).upper()
        country = _v(r, 'COUNTRY_CODE', 2).upper()
        if not (typ in TYPES and ID.fullmatch(origin) and ID.fullmatch(dest) and number.isdigit() and len(number) <= 3 and seq.isdigit() and len(seq) <= 4 and SEG_VALUE.fullmatch(value) and kind in SEG_TYPES
                and (not country or re.fullmatch(r'[A-Z]{2}', country, re.A))):
            skipped += 1
            continue
        key = (origin, dest, typ, int(number))
        bucket = out.setdefault(key, [])
        if len(bucket) >= MAX_SEGMENTS:
            skipped += 1
            continue
        bucket.append({'seq': int(seq), 'value': value, 'type': kind, **({'country': country} if country else {})})
    if not seen_header:
        raise ValueError('PFR_SEG.csv : aucune ligne')
    for bucket in out.values():
        bucket.sort(key=lambda s: s['seq'])
    return out, skipped


def read(blob):
    """{ pfr: [routes, chacune avec son tracé `segments` et ses `conditions`], cdr: [routes], skipped: { pfr, cdr, seg }, counts: { pfr: { type: n }, nar: { COMMON: n, NON-COMMON: n }, cdr: n, withSegments: n } } du zip des jeux CSV (octets, tels que faa_nasr.sub_blobs les rend). ValueError, avec la raison, si un fichier manque ou change de mise en page."""
    pfr, skip_pfr = read_pfr(blob)
    cdr, skip_cdr = read_cdr(blob)
    segments, skip_seg = read_seg(blob)
    types, nars, with_segments = {}, {}, 0
    for r in pfr:
        seg = segments.get((r['origin'], r['dest'], r['type'], r['no']))
        if seg:
            r['segments'] = seg      # le tracé de la route publiée
            with_segments += 1
        types[r['type']] = types.get(r['type'], 0) + 1
        if r.get('narType'):
            nars[r['narType']] = nars.get(r['narType'], 0) + 1
    return {'pfr': pfr, 'cdr': cdr, 'skipped': {'pfr': skip_pfr, 'cdr': skip_cdr, 'seg': skip_seg}, 'counts': {'pfr': dict(sorted(types.items())), 'nar': dict(sorted(nars.items())), 'cdr': len(cdr), 'withSegments': with_segments}}


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
        for raw in _rows(blob, member):
            r = _row(raw)
            name = _v(r, key, 8).upper()
            if name:
                every.add(name)
                if _v(r, 'COUNTRY_CODE', 3).upper() == 'CA':
                    canada.add(name)
    return every, canada
