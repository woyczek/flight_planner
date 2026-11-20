"""SOG-0513 lot C (b, c, d) : la LIMITE D'UN DIRECT dans un espace de la RAD (Annex 3B FRA LIM) : l'IFPS (ROUTE165) : « THE DCT SEGMENT HAWKE..NEVIL (29 NM) IS TOO LONG FOR EGTTNFRA:245:999. MAXIMUM IS 0 NM » (au-dessus de FL245) et « … EGTTNFRA:105:245 … » (entre FL105 et FL245).

(d) les lignes du RAD : une zone, une tranche de niveaux (« above FLnnn », « Between FLaaa..FLbbb », « below FLnnn »), H24, une limite « nNM » (EGTTNFRA : above FL245 0NM, Between FL105..FL245 0NM, below FL105 100NM ; EGTTNFRAW : les mêmes sous la FRA ouest) ; le reste (un horaire, une autre zone) n'est pas lu.
(b) les zones : EGTTNFRA = l'espace de Londres (la UIR, ou la FIR dont elle prend la projection horizontale : mêmes limites latérales) SANS les zones FRA (au-dessus de FL245) ou SANS la FRA ouest (en dessous : « sans l'espace EGTTNFRAW ») ; EGTTNFRAW = l'espace sous la FRA ouest (son contour latéral), en dessous de FL245.
(c) le test : un direct de la route (ni procédure, ni raccord, ni tronçon de route libre) dont les niveaux atteints SUR le tronçon recoupent la tranche de la ligne et dont le MILIEU est dans la zone ; le milieu, jamais les bouts (NEVIL est SUR la limite de la FIR : un contour simplifié ne décide pas un point sur une limite) ; un milieu à moins de BOUNDARY_NM d'une limite : « à examiner », jamais décidé ; sans le contour de la FIR (base d'avant le parseur 31 pour la UIR) ou sans la zone FRA : dit, jamais deviné.
Une route TAPÉE : ERREUR (comme l'IFPS) ; une route calculée : REVUE.
"""
import math
import os
import re

from . import spaces as S

SHEET = 'Annex 3B FRA LIM'
MAX_ROWS = 2000
MAX_LEGS = 400
WORK = 1000000      # revue de Sécurisation : le travail (sommets × directs) de `check` ; au-delà, les directs suivants sont dits « non décidés » (des contours lourds ne font pas tomber le calcul)
BOUNDARY_NM = 3.0
TOP_FT = 99900      # « FL999 »
ABOVE = re.compile(r'^\s*above\s+FL\s*(\d{2,3})\s*$', re.I)
BETWEEN = re.compile(r'^\s*between\s+FL\s*(\d{2,3})\s*\.\.\s*FL\s*(\d{2,3})\s*$', re.I)
BELOW = re.compile(r'^\s*below\s+FL\s*(\d{2,3})\s*$', re.I)
LIMIT = re.compile(r'^\s*(\d{1,4})\s*NM\s*$', re.I)
KNOWN = ('EGTTNFRA', 'EGTTNFRAW')      # les zones dont la définition est écrite ici


def band(text):
    """(du pied, au pied) de la tranche « above FL245 », « Between FL105..FL245 », « below FL105 » ; None sinon."""
    t = str(text)[:80]
    m = ABOVE.match(t)
    if m:
        return int(m.group(1)) * 100, TOP_FT
    m = BETWEEN.match(t)
    if m and int(m.group(1)) < int(m.group(2)):
        return int(m.group(1)) * 100, int(m.group(2)) * 100
    m = BELOW.match(t)
    if m:
        return 0, int(m.group(1)) * 100
    return None


def rows(rad):
    """Les lignes de l'annexe 3B FRA LIM en vigueur de la forme lue : [{ id, area, lo_ft, hi_ft, nm }] ; au plus MAX_ROWS lignes."""
    book = getattr(rad, 'book', None)
    out = []
    if not book:
        return out
    sheet = (book.get('sheets') or {}).get(SHEET) if isinstance(book, dict) and isinstance(book.get('sheets'), dict) else None
    for r in (sheet if isinstance(sheet, list) else [])[:MAX_ROWS]:
        try:      # revue de Sécurisation : un classeur mal formé ne fait pas tomber `assess`
            v = r.get('v') if isinstance(r, dict) else None
            if not isinstance(v, (list, tuple)) or len(v) < 8 or v[0] == 'DEL' or not rad.active(r):
                continue
            area, tranche, clock, limit = str(v[4])[:80].strip(), band(v[5]), str(v[6])[:40].strip(), LIMIT.match(str(v[7])[:40])
            if area in KNOWN and tranche and limit and clock == 'H24':
                out.append(dict(id=str(v[3])[:40].strip(), area=area, lo_ft=tranche[0], hi_ft=tranche[1], nm=int(limit.group(1))))
        except (TypeError, ValueError, AttributeError, KeyError, IndexError):
            continue
    return out


def edge_nm(space, lat, lon):
    """Distance (NM) du point au bord le plus proche des anneaux de l'espace (plan local : un degré de latitude = 60 NM) ; borné par la taille des anneaux (déjà bornée par `spaces`)."""
    best = None
    k = math.cos(math.radians(max(-85.0, min(85.0, lat))))
    for ring in space['rings']:
        for i in range(len(ring)):
            (la1, lo1), (la2, lo2) = ring[i - 1], ring[i]
            ax, ay, bx, by = (lo1 - lon) * k * 60, (la1 - lat) * 60, (lo2 - lon) * k * 60, (la2 - lat) * 60
            dx, dy = bx - ax, by - ay
            n = dx * dx + dy * dy
            t = 0.0 if n == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / n))
            d = math.hypot(ax + t * dx, ay + t * dy)
            best = d if best is None or d < best else best
    return best


def london(spaces):
    """(l'espace de Londres : la UIR, sinon la FIR de mêmes limites latérales ; les zones FRA du Royaume-Uni ; la FRA ouest) ; None sans contour de Londres."""
    uir = next((s for s in spaces if s['name'] == 'LONDON UIR'), None) or next((s for s in spaces if s['name'] == 'LONDON FIR'), None)
    fras = [s for s in spaces if s['type'] == 'FRA' and s['name'].upper().startswith('EGTT FRA')]
    return uir, fras, [s for s in fras if 'WEST' in s['name'].upper()]


def candidates(legs, ends=()):
    """Les directs de la route que la limite peut atteindre : via DCT, ni raccord ni procédure ni route libre (ni un tronçon qui touche un des terrains `ends` : le raccord d'un terrain sans procédure lue a sa propre limite, ROUTE135), avec les niveaux atteints SUR le tronçon (pieds : `top`, `low`)."""
    out = []
    for n, leg in enumerate(legs or []):
        if len(out) >= MAX_LEGS:
            break
        if not isinstance(leg, dict) or leg.get('via') != 'DCT' or leg.get('connector') or leg.get('kind') in ('SID', 'STAR', 'APPROACH_LINK', 'FRA', 'FRA_GATE') or leg.get('no_network'):
            continue
        top = leg.get('natural_max_ft') if isinstance(leg.get('natural_max_ft'), (int, float)) else leg.get('altitude_max_ft')
        ends_ft = [x for x in (leg.get('natural_start_ft'), leg.get('natural_end_ft')) if isinstance(x, (int, float))]
        low = min(ends_ft) if len(ends_ft) == 2 else leg.get('altitude_min_ft') if isinstance(leg.get('altitude_min_ft'), (int, float)) else top
        a, b = leg.get('start') or {}, leg.get('end') or {}
        if str(a.get('id', '')).upper() in ends or str(b.get('id', '')).upper() in ends:
            continue
        if not isinstance(top, (int, float)) or not isinstance(low, (int, float)) or not all(isinstance(x.get(k), (int, float)) for x in (a, b) for k in ('lat', 'lon')) or not isinstance(leg.get('nm'), (int, float)):
            continue
        out.append(dict(leg=leg, top=top, low=min(low, top), mid=((a['lat'] + b['lat']) / 2, (a['lon'] + b['lon']) / 2), a=str(a.get('id', '')), b=str(b.get('id', '')), nm=leg['nm']))
    return out


def words(line):
    """La tranche de la ligne, dite : « au-dessus de FL245 », « entre FL105 et FL245 », « au-dessous de FL105 »."""
    lo, hi = line['lo_ft'] // 100, line['hi_ft'] // 100
    return f'au-dessus de FL{lo}' if hi >= TOP_FT // 100 else f'au-dessous de FL{hi}' if lo == 0 else f'entre FL{lo} et FL{hi}'


def inside_area(line, uir, fras, west, lat, lon):
    """Le point est dans la zone de la ligne (b) : EGTTNFRAW : sous la FRA ouest ; EGTTNFRA au-dessus de FL245 : Londres sans AUCUNE zone FRA ; en dessous : Londres sans la FRA ouest."""
    if line['area'] == 'EGTTNFRAW':
        return any(S.inside(f, lat, lon) for f in west)
    out = fras if line['lo_ft'] >= 24500 else west
    return S.inside(uir, lat, lon) and not any(S.inside(f, lat, lon) for f in out)


def check(rad, legs, spaces, typed, dep=None, arr=None, coded=False):
    """[(niveau, texte)] : les directs trop longs pour la zone (ERREUR pour une route tapée, REVUE sinon) et ce qui n'est pas décidé (REVUE) ; `spaces` : les espaces de la base de Londres (`spaces.read`) ou une fonction qui les rend (lue seulement si un direct est dans la tranche d'une ligne)."""
    lines = rows(rad)
    if not lines:
        return []
    cand = candidates(legs, tuple(str(x).upper() for x in (dep, arr) if x))
    issues = []
    loaded = None
    left = WORK      # le budget est PARTAGÉ par les lignes du RAD (un classeur de 2 000 lignes ne le multiplie pas)
    for line in lines:
        high = [c for c in cand if c['top'] > line['lo_ft'] + .5 and c['low'] < line['hi_ft'] - .5]      # les niveaux atteints SUR le tronçon recoupent la tranche
        if not high:
            continue
        if loaded is None:      # les contours ne sont lus que si un direct est dans une tranche
            loaded = london((spaces() if callable(spaces) else spaces) or [])
        uir, fras, west = loaded
        listed = ', '.join(f"{c['a']}..{c['b']}" for c in high[:6])
        if uir is None:
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}, {words(line)}) non décidée : la base n'a pas le contour de la FIR / UIR de Londres ; {len(high)} direct(s) dans cette tranche : {listed}"))
            continue
        if not (west if line['area'] == 'EGTTNFRAW' or line['lo_ft'] < 24500 else fras):
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}, {words(line)}) non décidée : la base n'a pas la zone FRA du Royaume-Uni (« hors de la route libre » n'est pas définissable) ; directs dans cette tranche : {listed}"))
            continue
        weight = sum(len(r) for s in [uir, *fras] for r in s['rings'])
        room = max(0, left) // max(1, weight)      # combien de directs ces contours permettent d'examiner (chaque direct parcourt leurs sommets quelques fois) ; SOG-0517 (note de Sécurisation) : le budget épuisé n'en laisse AUCUN (avant : un direct par ligne restait examiné)
        if len(high) > room:
            skipped, high = high[room:], high[:room]
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}) : {len(skipped)} direct(s) dans la tranche {words(line)} non décidé(s) : les contours de l'espace sont trop lourds ({weight} sommets) pour tous les examiner."))
        left -= weight * len(high)
        for c in high:
            lat, lon = c['mid']
            if any((edge_nm(s, lat, lon) or 999.0) < BOUNDARY_NM for s in [uir, *fras]):
                issues.append(('REVUE', f"Direct {c['a']}..{c['b']} ({c['nm']:.0f} NM) : le milieu est à moins de {BOUNDARY_NM:g} NM d'une limite de {line['area']} : la limite du RAD (RAD {line['id']}, {line['nm']} NM) n'est pas décidée."))
                continue
            if inside_area(line, uir, fras, west, lat, lon) and c['nm'] > line['nm'] + .5:
                issues.append(('ERREUR' if typed else 'REVUE', f"ROUTE165 (RAD {line['id']}, annexe 3B FRA LIM) : le direct {c['a']}..{c['b']} ({c['nm']:.0f} NM) est trop long pour {line['area']} {words(line)} : la limite est de {line['nm']} NM.", *([{'code': 'space_dct_limit', 'values': {'from_point': str(c['a'])[:40], 'to_point': str(c['b'])[:40], 'nm': round(c['nm']), 'limit_nm': line['nm'], 'space': str(line['area'])[:40]}}] if coded and typed else [])))      # SOG-0532 lot 2 bis : le code et ses valeurs (l'écran compose la phrase)
    return issues


def spaces_of(nav):
    """Les espaces (FIR, UIR, FRA) de la zone gb de la base du Nav ; [] sans fichier ; gardés sur le Nav."""
    cache = getattr(nav, '_london_spaces', None)
    if cache is None:
        cycle = (getattr(nav, 'cycles', None) or {}).get('gb')
        folder = os.path.join(str(nav.data_dir), 'sia', 'base', 'gb', str(cycle)) if cycle else ''
        cache = nav._london_spaces = S.read(folder, ('FIR', 'UIR', 'FRA')) if folder else []
    return cache
