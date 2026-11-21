"""SOG-0530 lot B : le contrôle du niveau de croisière contre la règle semi-circulaire de l'AIP de France (ENR 1.7.5), un AVERTISSEMENT, jamais un blocage.

La source est le tableau lu par le lanceur à chaque cycle (tools/sia_enr17.py → data/route/levels_fr.json, lot A) : en dessous du FL195 les niveaux IFR des routes magnétiques 000°–179° (impairs : 10, 30 … 190) et
180°–359° (pairs : 20 … 180) ; dans l'UTA (195 < FL < 660) 090°–269° (210, 230 … 390, 410, 450, 490) et 270°–089° (200, 220 … 400, 430, 470, 510). Rien d'autre n'est lu : pas de table pour un autre État, pas de règle VFR
(la hauteur d'application n'est dans aucune des deux pages lues : le moteur est IFR seulement), pas de sens propre d'une voie (l'ENR 3 et le RAD priment, dit par le tableau lui-même : « sauf indication contraire » : ils ne sont pas lus ici).

Le contrôle porte sur chaque tronçon EN CROISIÈRE (même altitude au début et à la fin, un niveau de vol rond) :
  - l'État du tronçon : la zone de la base d'où vient sa voie (`source_zone`) ; un tronçon d'une cellule FRA de France (`fra_area` « LF… ») est en France ; un direct n'a pas de zone : il prend celle des deux tronçons voisins quand ils sont de la MÊME zone (un direct entre deux voies françaises est en France), celle du seul voisin quand il est au bord de la route (après la SID, avant la STAR), sinon l'État est inconnu (la zone d'une voie est celle de la base d'où elle vient : une voie qui passe la frontière peut n'être qu'en partie dans cet État ; limite connue) ;
  - la route MAGNÉTIQUE : le cap vrai du tronçon moins la variation magnétique (est positive) du milieu du tronçon, ESTIMÉE par la variation des aérodromes voisins de l'index (les trois plus proches, pondérés) : il n'y a pas de modèle magnétique dans le moteur ;
  - la MARGE de cette estimation : 2° + l'écart entre les trois variations (+ 1° si le plus proche est à plus de 300 NM) : une route à moins de la marge d'une coupure (000°/180° sous le FL195, 090°/270° dans l'UTA) n'est PAS décidée (« route proche d'une limite »), jamais un faux avertissement.
Les tronçons consécutifs de même conclusion sont rendus en UNE ligne (de leur premier point au dernier). Le fichier du tableau vient du dépôt de données : il est lu borné (64 Ko) et chaque nombre est contrôlé (10–660, croissant, 60 au plus) ; un fichier qui ne se lit pas n'est pas un tableau.

  check(legs, ads, table) → (avertissements, non vérifiables, notes, stats) : trois listes de { code, values, text } et { cycle, checked } (`checked` = les tronçons de croisière de France jugés conformes ou non, hors doute) ; les NOTES (`level_rule_no_table` : un État sans tableau) ne comptent pas pour le verdict : elles le DISENT seulement
"""
import math
import os
import re

from . import geo

MAX_FILE = 65536
MAX_LEVELS = 60
MAX_RUNS = 20      # au plus ce nombre de lignes par code ; le reste n'est que compté (`more`)
CYCLE = re.compile(r'\d{4}-\d{2}-\d{2}\Z', re.A)
CRUISE_SKIP = {'SID', 'STAR', 'APPROACH_LINK', 'VIA_AD', 'UNRESOLVED_AIRWAY'}
_CACHE = {}


def _series(x):
    ok = isinstance(x, list) and 5 <= len(x) <= MAX_LEVELS and all(isinstance(v, int) and not isinstance(v, bool) and 10 <= v <= 660 for v in x) and x == sorted(set(x))
    return x if ok else None


def load(path):
    """Le tableau du cycle { cycle, lower: [a, b], upper: [a, b] } (les niveaux IFR) ; None quand le fichier est absent ou ne se lit pas (jamais un tableau deviné). Mémorisé par (date, taille) du fichier."""
    try:
        st = os.stat(path)
        key = (str(path), st.st_mtime_ns, st.st_size)
        if key in _CACHE:
            return _CACHE[key]
    except OSError:
        return None
    import safe_json      # SOG-0468 (a) : l'UNE lecture bornée des fichiers JSON du dépôt de données (K469) : jamais d'exception, une raison (absent, trop gros, illisible, NaN) = pas de tableau
    doc, why = safe_json.read(path, MAX_FILE)
    if why:
        return None
    table = None
    try:
        if (isinstance(doc, dict) and doc.get('schema') == 1 and doc.get('zone') == 'fr' and isinstance(doc.get('cycle'), str) and CYCLE.match(doc['cycle'])
                and doc.get('tracks') == {'lower': ['000-179', '180-359'], 'upper': ['090-269', '270-089']}):
            lower = [_series(x) for x in (doc.get('lower') or {}).get('ifr') or []]
            upper = [_series(x) for x in doc.get('upper') or []]
            if len(lower) == 2 and len(upper) == 2 and None not in lower and None not in upper:
                table = dict(cycle=doc['cycle'], lower=lower, upper=upper)
    except (AttributeError, TypeError):
        table = None
    if len(_CACHE) > 8:
        _CACHE.clear()
    _CACHE[key] = table
    return table


def _number(x, bound):
    """Un nombre fini, pas un booléen, de valeur absolue au plus `bound`."""
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) and abs(x) <= bound


def _zone(z):
    """Une zone de la base (« fr », « gb » : 2 à 4 lettres minuscules) ; None sinon : la zone vient de la base (non fiable), sans type ni longueur (revue de Sécurisation)."""
    return z if isinstance(z, str) and re.fullmatch(r'[a-z]{2,4}', z) else None


def variation(mid, ads):
    """(variation magnétique en degrés, positive à l'est ; marge en degrés) estimée au point `mid` { lat, lon } par les trois aérodromes de l'index les plus proches qui portent une variation ; None quand il n'y en a aucun à moins de 600 NM."""
    near = []
    for ad in ads.values():
        v = ad.get('magVar')
        if _number(v, 40) and _number(ad.get('lat'), 90) and _number(ad.get('lon'), 180):      # l'index vient de la base (non fiable) : des nombres FINIS (un inf ferait lever math.sin), jamais un booléen, dans leurs bornes (revue de Sécurisation)
            near.append((geo.nm(mid, ad), float(v)))
    near.sort(key=lambda x: x[0])
    near = near[:3]
    if not near or near[0][0] > 600:
        return None
    weights = [1 / (d + 20) for d, _v in near]
    var = sum(w * v for w, (_d, v) in zip(weights, near)) / sum(weights)
    spread = max(v for _d, v in near) - min(v for _d, v in near)
    return var, 2.0 + spread + (1.0 if near[0][0] > 300 else 0.0)


def _zones(legs):
    """L'État (la zone de la base) de chaque tronçon : celle de sa voie ; un direct ou un tronçon de FRA prend celle de ses deux voisins de voie quand elle est la même ; sinon None."""
    own = [_zone(l.get('source_zone')) or (('fr' if str(l.get('fra_area') or '').upper().startswith('LF') else None) if l.get('kind') == 'FRA' else None) for l in legs]      # un tronçon d'une cellule FRA de France (« LFFRASW ») est en France : ses points sont ceux de la cellule, y compris ses points de sortie à la frontière
    out = []
    for i, z in enumerate(own):
        if z:
            out.append(z)
            continue
        before = next((own[j] for j in range(i - 1, -1, -1) if own[j]), None)
        after = next((own[j] for j in range(i + 1, len(legs)) if own[j]), None)
        out.append(before if before and before == after else (before or after) if not (before and after) else None)      # un direct au bord de la route (aucune voie d'un côté : la SID, l'aérodrome) prend la zone de la voie de l'autre côté ; entre deux zones différentes : inconnue
    return out


def _cruise_level(leg):
    a, b = leg.get('altitude_start_ft'), leg.get('altitude_end_ft')
    if leg.get('kind') in CRUISE_SKIP or leg.get('data_gap') or not all(isinstance(x, (int, float)) and math.isfinite(x) for x in (a, b)) or abs(a - b) >= 1:
        return None
    level = round(a / 100)
    return level if abs(a - level * 100) < 1 and 10 <= level <= 660 else None


def _label(leg):
    return f"{leg.get('via') or 'DCT'} {leg['start']['id']}–{leg['end']['id']}" if leg.get('via') not in (None, 'DCT') else f"{leg['start']['id']}–{leg['end']['id']}"


def check(legs, ads, table):
    """Les avertissements, les non-vérifiables et les notes du contrôle du niveau de croisière de la route `legs` : trois listes de { code, values, text } et les chiffres { cycle, checked } ; voir l'en-tête du module pour les codes et leurs valeurs."""
    zones = _zones(legs)
    runs = []      # (clé, premier tronçon, dernier tronçon, nombre de tronçons, valeurs)
    foreign = {}      # zone → nombre de tronçons de croisière d'un État sans tableau
    unlocated = 0
    checked = 0      # les tronçons de croisière de France jugés (conformes ou non)
    cells = {}      # les variations déjà estimées, par carré de 0,5°
    missing = 0      # les tronçons d'un État dont le tableau est connu mais n'a pas pu être lu
    for i, leg in enumerate(legs):
        level = _cruise_level(leg)
        if level is None or not isinstance(leg.get('start'), dict) or not isinstance(leg.get('end'), dict) or not all(_number(leg[k].get(c), 180) for k in ('start', 'end') for c in ('lat', 'lon')):
            continue
        zone = zones[i]
        if zone != 'fr':
            if zone:
                foreign[zone] = foreign.get(zone, 0) + 1
            else:
                unlocated += 1
            continue
        if table is None:
            missing += 1      # l'État est connu, mais son tableau n'est pas lu
            continue
        if level == 195:
            continue      # ni dans « en dessous du FL195 » ni dans « 195 < FL < 660 » : pas dans le tableau
        mid = dict(lat=(leg['start']['lat'] + leg['end']['lat']) / 2, lon=(leg['start']['lon'] + leg['end']['lon']) / 2)
        cell = (round(mid['lat'] * 2), round(mid['lon'] * 2))      # la variation change de moins d'un degré sur 100 NM : une estimation par carré de 0,5° (au centre du carré), et non un parcours de l'index entier par tronçon
        if cell not in cells:
            cells[cell] = variation(dict(lat=cell[0] / 2, lon=cell[1] / 2), ads)
        var = cells[cell]
        if var is None:
            runs.append((('unknown', level), i, i, 1, {}))
            continue
        track = (geo.bearing(leg['start'], leg['end']) - var[0]) % 360
        upper = level > 195
        limits = (90, 270) if upper else (0, 180)
        gap = min(abs((track - x + 180) % 360 - 180) for x in limits)
        if gap < var[1]:
            runs.append((('near', level, upper), i, i, 1, dict(track_deg=round(track), margin_deg=round(var[1], 1), limit_deg=min(limits, key=lambda x: abs((track - x + 180) % 360 - 180)))))
            continue
        half = (0 if 90 <= track < 270 else 1) if upper else (0 if track < 180 else 1)
        listed = (table['upper'] if upper else table['lower'])[half]
        if upper and level > max(max(x) for x in table['upper']):
            continue      # au-dessus de ce que le tableau écrit : il finit par « etc. », rien n'est prolongé
        names = ('090-269', '270-089') if upper else ('000-179', '180-359')
        checked += 1
        if level in listed:
            continue
        lo = max((x for x in listed if x < level), default=None)
        hi = min((x for x in listed if x > level), default=None)
        runs.append((('warn', level, upper, half), i, i, 1, dict(fl=level, track_deg=round(track), range=names[half], expected='odd' if (listed[0] // 10) % 2 else 'even', suggested=[x for x in (lo, hi) if x is not None])))
    merged = []
    for run in runs:
        if merged and merged[-1][0] == run[0] and merged[-1][2] == run[1] - 1:
            merged[-1] = (run[0], merged[-1][1], run[2], merged[-1][3] + 1, merged[-1][4])
        else:
            merged.append(run)
    warnings, unverifiable, notes = [], [], []
    for key, first, last, count, values in merged:
        a, b = legs[first], legs[last]
        where = dict(from_point=str(a['start']['id'])[:40], to_point=str(b['end']['id'])[:40], legs=count)
        level = key[1]
        if key[0] == 'warn':
            v = dict(where, fl=level, regime='IFR', state='fr', source='ENR 1.7.5', cycle=table['cycle'], **{k: values[k] for k in ('track_deg', 'range', 'expected', 'suggested')})
            sug = ' ou '.join(f'FL{x:03d}' for x in values['suggested'])
            text = f"{_label(a)} : FL{level:03d} sur une route magnétique de {values['track_deg']:03d}° ({values['range']}, IFR) : un niveau {'impair' if values['expected'] == 'odd' else 'pair'} est attendu" + (f' ({sug})' if sug else '') + ' (AIP de France, ENR 1.7.5). Avertissement : la route reste valide.'
            warnings.append(dict(code='level_semicircular', values=v, text=text[:300]))
        elif key[0] == 'near':
            v = dict(where, fl=level, **values)
            text = f"{_label(a)} : route magnétique estimée à {values['track_deg']:03d}° à ±{values['margin_deg']:g}° près, trop près de la limite de {values['limit_deg']:03d}° pour dire si FL{level:03d} suit la règle des niveaux (variation magnétique estimée, non vérifiable)."
            unverifiable.append(dict(code='level_rule_near_limit', values=v, text=text[:300]))
        else:
            unverifiable.append(dict(code='level_rule_no_variation', values=dict(where, fl=level), text=f"{_label(a)} : aucune variation magnétique connue à proximité : la règle des niveaux n'est pas vérifiée pour FL{level:03d}."[:300]))
    warnings, unverifiable = warnings[:MAX_RUNS], unverifiable[:MAX_RUNS]
    if missing:
        notes.append(dict(code='level_rule_no_table', values=dict(zones=['fr'], legs=missing, unlocated=0, table_missing=True), text="Règle des niveaux de croisière non vérifiée : le tableau de la France n'est pas lu (la mise à jour des données le range une fois par cycle)."[:300]))
    if foreign or unlocated:
        zones_named = sorted(foreign)[:10]
        text = 'Règle des niveaux de croisière non vérifiée : ' + (f"aucun tableau pour {', '.join(z.upper() for z in zones_named)}" if zones_named else '') + (' ; ' if zones_named and unlocated else '') + (f"{unlocated} tronçon(s) dont l'État n'est pas connu" if unlocated else '') + ' (seul le tableau de la France est lu).'
        notes.append(dict(code='level_rule_no_table', values=dict(zones=zones_named, legs=sum(foreign.values()), unlocated=unlocated), text=text[:300]))
    return warnings, unverifiable, notes[:MAX_RUNS], dict(cycle=table['cycle'] if table else None, checked=checked, zones=sorted(foreign)[:10], unlocated=unlocated, legs=sum(foreign.values()), table_missing=bool(missing))
