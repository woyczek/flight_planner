"""SOG-0513 lot C (b, c, d) : la LIMITE D'UN DIRECT dans un espace de la RAD (Annex 3B FRA LIM) : l'IFPS (ROUTE165) : « THE DCT SEGMENT HAWKE..NEVIL (29 NM) IS TOO LONG FOR EGTTNFRA:245:999. MAXIMUM IS 0 NM ».

(d) la ligne du RAD : une zone, « above FLnnn », H24, une limite « nNM » (EGTTNFRA : above FL245, 0NM) ; seule la forme « above FLnnn » et « H24 » est lue, le reste est dit « non lu ».
(b) la zone : EGTTNFRA = l'espace de Londres (la UIR, ou la FIR dont elle prend la projection horizontale : mêmes limites latérales) SANS les zones FRA du Royaume-Uni (« EGTT FRA … ») : une zone connue par son nom ; une autre zone n'est pas lue.
(c) le test : un direct de la route (ni procédure, ni raccord, ni tronçon de route libre) dont le NIVEAU atteint dépasse le niveau de la ligne et dont le MILIEU est dans la zone ; le milieu, jamais les bouts (NEVIL est SUR la limite de la FIR : un contour simplifié ne décide pas un point sur une limite) ; un milieu à moins de BOUNDARY_NM d'une limite : « à examiner », jamais décidé ; sans le contour de la FIR (base d'avant le parseur 31 pour la UIR) ou sans la zone FRA : dit, jamais deviné.
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
LEVEL = re.compile(r'^\s*above\s+FL\s*(\d{2,3})\s*$', re.I)
LIMIT = re.compile(r'^\s*(\d{1,4})\s*NM\s*$', re.I)
KNOWN = ('EGTTNFRA',)      # les zones dont la définition est écrite ici


def rows(rad):
    """Les lignes de l'annexe 3B FRA LIM en vigueur de la forme lue : [{ id, area, above_ft, nm }] ; au plus MAX_ROWS lignes."""
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
            area, level, clock, limit = str(v[4])[:80].strip(), LEVEL.match(str(v[5])[:80]), str(v[6])[:40].strip(), LIMIT.match(str(v[7])[:40])
            if area in KNOWN and level and limit and clock == 'H24':
                out.append(dict(id=str(v[3])[:40].strip(), area=area, above_ft=int(level.group(1)) * 100, nm=int(limit.group(1))))
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
    """(l'espace de Londres : la UIR, sinon la FIR de mêmes limites latérales ; les zones FRA du Royaume-Uni) ; None sans contour de Londres."""
    uir = next((s for s in spaces if s['name'] == 'LONDON UIR'), None) or next((s for s in spaces if s['name'] == 'LONDON FIR'), None)
    return uir, [s for s in spaces if s['type'] == 'FRA' and s['name'].upper().startswith('EGTT FRA')]


def candidates(legs, ends=()):
    """Les directs de la route que la limite peut atteindre : via DCT, ni raccord ni procédure ni route libre (ni un tronçon qui touche un des terrains `ends` : le raccord d'un terrain sans procédure lue a sa propre limite, ROUTE135), avec leur niveau atteint (pieds)."""
    out = []
    for n, leg in enumerate(legs or []):
        if len(out) >= MAX_LEGS:
            break
        if not isinstance(leg, dict) or leg.get('via') != 'DCT' or leg.get('connector') or leg.get('kind') in ('SID', 'STAR', 'APPROACH_LINK', 'FRA', 'FRA_GATE') or leg.get('no_network'):
            continue
        top = leg.get('natural_max_ft') if isinstance(leg.get('natural_max_ft'), (int, float)) else leg.get('altitude_max_ft')
        a, b = leg.get('start') or {}, leg.get('end') or {}
        if str(a.get('id', '')).upper() in ends or str(b.get('id', '')).upper() in ends:
            continue
        if not isinstance(top, (int, float)) or not all(isinstance(x.get(k), (int, float)) for x in (a, b) for k in ('lat', 'lon')) or not isinstance(leg.get('nm'), (int, float)):
            continue
        out.append(dict(leg=leg, top=top, mid=((a['lat'] + b['lat']) / 2, (a['lon'] + b['lon']) / 2), a=str(a.get('id', '')), b=str(b.get('id', '')), nm=leg['nm']))
    return out


def check(rad, legs, spaces, typed, dep=None, arr=None):
    """[(niveau, texte)] : les directs trop longs pour la zone (ERREUR pour une route tapée, REVUE sinon) et ce qui n'est pas décidé (REVUE) ; `spaces` : les espaces de la base de Londres (`spaces.read`) ou une fonction qui les rend (lue seulement si un direct est assez haut)."""
    lines = rows(rad)
    if not lines:
        return []
    cand = candidates(legs, tuple(str(x).upper() for x in (dep, arr) if x))
    issues = []
    loaded = None
    left = WORK      # le budget est PARTAGÉ par les lignes du RAD (un classeur de 2 000 lignes ne le multiplie pas)
    for line in lines:
        high = [c for c in cand if c['top'] > line['above_ft'] + .5]
        if not high:
            continue
        if loaded is None:      # les contours ne sont lus que si un direct est assez haut
            loaded = london((spaces() if callable(spaces) else spaces) or [])
        uir, fras = loaded
        weight = sum(len(r) for s in ([uir, *fras] if uir else []) for r in s['rings']) if uir else 0
        room = max(1, left // max(1, weight))      # combien de directs ces contours permettent d'examiner (chaque direct parcourt leurs sommets quelques fois)
        if len(high) > room and uir is not None and fras:
            skipped, high = high[room:], high[:room]
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}) : {len(skipped)} direct(s) au-dessus de FL{line['above_ft'] // 100} non décidé(s) : les contours de l'espace sont trop lourds ({weight} sommets) pour tous les examiner."))
        if uir is None:
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}, au-dessus de FL{line['above_ft'] // 100}) non décidée : la base n'a pas le contour de la FIR / UIR de Londres ; {len(high)} direct(s) au-dessus de ce niveau : " + ', '.join(f"{c['a']}..{c['b']}" for c in high[:6])))
            continue
        if not fras:
            issues.append(('REVUE', f"Limite des directs {line['area']} (RAD {line['id']}) non décidée : la base n'a pas la zone FRA du Royaume-Uni (« hors de la route libre » n'est pas définissable) ; directs au-dessus de FL{line['above_ft'] // 100} : " + ', '.join(f"{c['a']}..{c['b']}" for c in high[:6])))
            continue
        left -= weight * len(high)
        for c in high:
            lat, lon = c['mid']
            if any((edge_nm(s, lat, lon) or 999.0) < BOUNDARY_NM for s in [uir, *fras]):
                issues.append(('REVUE', f"Direct {c['a']}..{c['b']} ({c['nm']:.0f} NM) : le milieu est à moins de {BOUNDARY_NM:g} NM d'une limite de {line['area']} : la limite du RAD (RAD {line['id']}, {line['nm']} NM) n'est pas décidée."))
                continue
            if S.inside(uir, lat, lon) and not any(S.inside(f, lat, lon) for f in fras) and c['nm'] > line['nm'] + .5:
                issues.append(('ERREUR' if typed else 'REVUE', f"ROUTE165 (RAD {line['id']}, annexe 3B FRA LIM) : le direct {c['a']}..{c['b']} ({c['nm']:.0f} NM) est trop long pour {line['area']} au-dessus de FL{line['above_ft'] // 100} : la limite est de {line['nm']} NM."))
    return issues


def spaces_of(nav):
    """Les espaces (FIR, UIR, FRA) de la zone gb de la base du Nav ; [] sans fichier ; gardés sur le Nav."""
    cache = getattr(nav, '_london_spaces', None)
    if cache is None:
        cycle = (getattr(nav, 'cycles', None) or {}).get('gb')
        folder = os.path.join(str(nav.data_dir), 'sia', 'base', 'gb', str(cycle)) if cycle else ''
        cache = nav._london_spaces = S.read(folder, ('FIR', 'UIR', 'FRA')) if folder else []
    return cache
