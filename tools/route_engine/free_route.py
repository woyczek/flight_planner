"""La route libre CRÉÉE d'un vol qui traverse l'Atlantique quand aucune route du jour ne lui convient (SOG-0354, lot L5 (2) ; note de conception docs/technique/V3_ROUTE_GATES.md § 13.2).

Une route NAT n'existe que pour les heures du message (ou n'est pas dans le sens du vol) : à 03:00 aucune route n'est valable, et pourtant un vol traverse. Il traverse alors par une route LIBRE, comme un équipage en dépose une : des points posés tous les 10° de longitude, à la latitude du chemin le plus court (le grand cercle), à la latitude ENTIÈRE (« 54/30 », « 52/20 », « 50/10 »),
entre un point d'ENTRÉE et un point de SORTIE océaniques.

Les entrées et les sorties sont celles de TOUTES les routes du jour (les deux extrémités de chaque route du message lu, dans les deux sens) : le message du jour est tout ce que le lanceur garde ; aucune mémoire de la saison n'est lue ni écrite. Le couple (entrée, sortie) est celui dont le coût estimé (minorant) de la chaîne est le plus petit ; l'Europe (ou l'Amérique) est ensuite cherchée par `Nav.search`, comme pour une route NAT.
Une route libre est CALCULÉE, jamais lue dans un texte : ses tronçons portent `origin: 'random'` (la réponse : `sections.free.source`), le contrôle la dit « route libre, créée » (aucune autorisation océanique vérifiée). Quand aucune route du jour ne donne un point océanique connu, on le dit (« aucun point d'entrée océanique connu ») ; on n'en invente pas."""
import math
import time

from . import engine, nat_layer

WEST_LON = -35.0       # la limite entre les deux côtés de l'océan (celle de sections et de nat_layer.hint)
STEP_LON = 10          # un point par 10° de longitude
LOW_FT, HIGH_FT = 28500, 60000      # le plancher de l'espace RVSM / HLA et le plafond : une route libre est une route de croisière
NEED = 2               # la recherche vers un paquet d'entrées s'arrête dès que deux sont atteintes (une entrée inatteignable fait sinon parcourir tout l'espace des états)
FREE_S = 3.0           # le temps de la section (§ 13.4 : 3 s) : les couples (entrée, sortie) sont essayés dans l'ordre de leur minorant, SANS nombre fixe (SOG-0354 L5 4, défaut 3), jusqu'à ce que le minorant du suivant dépasse le meilleur coût trouvé, ou que ce temps (ou la borne de la phase) soit épuisé
EXTRA_SEARCH_S = 0.15   # d1 bis : une recherche de plus (vers les entrées restantes) ne dure pas plus : quand ses buts ne sont pas atteignables elle parcourrait tout l'espace (4,5 s depuis Dublin) ; coupée, elle rend ce qu'elle a atteint
LABEL = 'route libre, créée'
NO_REACH = 'aucune entrée océanique du jour n\'est atteignable depuis le départ à ce niveau'
NO_CHAIN = 'aucune chaîne par une route libre n\'a abouti'
NO_TIME = 'le temps de la route libre est épuisé avant qu\'une chaîne n\'aboutisse'
NO_AVOID = 'tous les points océaniques du jour sont évités par une règle RAD'
NO_POINT = 'aucun point d\'entrée océanique connu : aucune route du jour n\'en donne'


def _name(lat, lon):
    """« 54/30 » (nord, ouest : la forme des routes NAT) ; la forme ICAO « 5N010E » ailleurs."""
    if lat > 0 and lon < 0:
        return f'{lat}/{-lon}'
    return f'{abs(lat)}{"N" if lat >= 0 else "S"}{abs(lon):03d}{"E" if lon >= 0 else "W"}'


def interior(a, b):
    """[(lat, lon, id)] : les points de la route libre entre `a` et `b` (deux points {lat, lon}), un par multiple de STEP_LON strictement entre leurs longitudes, de a vers b ; la latitude est celle du grand cercle, arrondie au degré entier."""
    la1, lo1, la2, lo2 = math.radians(a['lat']), math.radians(a['lon']), math.radians(b['lat']), math.radians(b['lon'])
    if abs(lo2 - lo1) < 1e-9 or abs(abs(b['lon'] - a['lon']) - 180) < 1e-6:
        return []
    low, high = sorted((a['lon'], b['lon']))
    lons = [x for x in range(int(math.floor(low / STEP_LON)) * STEP_LON, int(math.ceil(high / STEP_LON)) * STEP_LON + 1, STEP_LON) if low < x < high]
    if a['lon'] > b['lon']:
        lons.reverse()
    out = []
    for lon in lons:
        lo = math.radians(lon)
        lat = round(math.degrees(math.atan((math.tan(la1) * math.sin(lo2 - lo) + math.tan(la2) * math.sin(lo - lo1)) / math.sin(lo2 - lo1))))
        if -89 <= lat <= 89:
            out.append((lat, lon, _name(lat, lon)))
    return out


def ends(nav):
    """Les nœuds d'entrée / sortie océaniques : les deux extrémités de chaque route du message lu (`nav.nat['ends']`), sans doublon."""
    seen, out = set(), []
    for pair in ((getattr(nav, 'nat', None) or {}).get('ends') or {}).values():
        for k in pair:
            if k in nav.nodes and k not in seen:
                seen.add(k)
                out.append(k)
    return out


def _links(nav, node, high, into, band):
    """Les raccords DCT de simulation d'un point océanique au réseau haut : les LINK_NODES nœuds les plus proches à moins de LINK_NM NM (comme nat_layer.add) ; [] si le point touche déjà le réseau."""
    if node in high:
        return []
    p = nav.nodes[node]
    near = sorted((engine.nm(p, nav.nodes[k]), k) for k in high if k != node and abs(nav.nodes[k]['lat'] - p['lat']) < nat_layer.LINK_NM / 60 + .1)
    near = [(d, k) for d, k in near if d <= nat_layer.LINK_NM][:nat_layer.LINK_NODES]
    return [(k, node, dict(a=k, b=node, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, zone='nat', nat_link='entry')) if into else
            (node, k, dict(a=node, b=k, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, zone='nat', nat_link='exit')) for d, k in near]


def solve(nav, g, start, end, ratio, resolve, europe, report=None):
    """(chaîne, None) ou (None, raison) : la meilleure route libre résolue ; la chaîne : { entry, exit, points: [id], nm, cost, path, sections }.
    SOG-0354 L5 (2 bis) : UNE seule recherche du départ vers TOUTES les entrées (`europe(g2, start, entries)` → { entrée atteinte : { path, cost, band } }, celle de sections : le mécanisme de L5 1 bis), puis les couples entre entrées ATTEINTES, dans l'ordre de leur minorant (le coût RÉEL de la section d'Europe + le reste estimé) :
    les essais ne sont plus gaspillés sur des entrées que le départ n'atteint pas (LFPO / LFPG → KLAX : les entrées proches du chemin ne s'atteignent pas depuis Paris à FL370) ; une sortie dont la section d'Amérique n'a pas abouti n'est pas reprise. `resolve(g2, start, end, entry, exit, legs, first)` est celui de sections
    SOG-0354 L5 (4) défaut 3 : les couples sont essayés dans l'ordre de leur minorant SANS nombre fixe (trois essais ne suffisaient pas : CYYZ → EDDF aboutit à la cinquième sortie, les quatre premières échouent chacune en 0,01 s) ; arrêt quand le minorant du suivant dépasse le meilleur coût trouvé, ou quand FREE_S (ou la borne de la phase) est épuisé ; `report` (un dict) reçoit { tried, stopped : 'bound' | 'time' | 'end' } : la réponse dit combien ont été essayés.
    (même recherche par sections qu'une route NAT) ; le graphe `g2` est celui de `g` avec les raccords de TOUTES les entrées et sorties (des arêtes DCT de simulation, comme nat_layer.add)."""
    a, b = nav.nodes[start], nav.nodes[end]
    start_east = a['lon'] > WEST_LON
    known = ends(nav)
    entries = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) == start_east]
    exits = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) != start_east]
    if not entries or not exits:
        return None, NO_POINT
    avoid = getattr(g, 'rad_avoid', frozenset())      # SOG-0354 L5 (4) défaut 4 : les points que la règle RAD fait éviter (le repli : le passage par X n'a pas abouti) ne sont ni entrée ni sortie ; l'entrée suivante est prise
    entries = [k for k in entries if nav.nodes[k]['id'] not in avoid]
    exits = [k for k in exits if nav.nodes[k]['id'] not in avoid]
    if not entries or not exits:
        return None, NO_AVOID
    # « X obligatoire pour le trafic par Y » (LF2096 : ETIKI pour REGHI) : une entrée Y est atteinte PAR X (la recherche d'Europe va à X, puis un DCT créé X → Y), une sortie Y est quittée VERS X (Y → X, puis la recherche d'Europe part de X)
    compel = getattr(g, 'rad_compel', {})
    lead = {}
    if compel:
        by_id = {n['id']: k for k, n in nav.nodes.items()}
        for k in entries + exits:
            x = by_id.get(compel.get(nav.nodes[k]['id']))
            if x is not None and x != k:
                lead[k] = x
    eff = lambda k: lead.get(k, k)
    lead_nm = lambda k: engine.nm(nav.nodes[k], nav.nodes[lead[k]]) if k in lead else 0.0
    head = lambda i: engine.nm(a, nav.nodes[eff(i)]) + lead_nm(i)
    tail = lambda o: lead_nm(o) + engine.nm(nav.nodes[eff(o)], b)
    high = getattr(nav, '_nat_high', None)
    if high is None:
        high = nav._nat_high = nat_layer.main_network(nav)
    band = (LOW_FT, HIGH_FT)
    g2 = engine.RoutingGraph(g)
    g2.__dict__.update(g.__dict__)
    for k, into in [(i, True) for i in entries] + [(o, False) for o in exits]:
        for u, v, e in _links(nav, eff(k), high, into, band):
            e['_cost'] = e['nm'] * ratio
            g2[u] = list(g2.get(u, ())) + [(v, e)]
    pts_of = {(i, o): interior(nav.nodes[i], nav.nodes[o]) for i in entries for o in exits}

    def ocean_of(i, o):
        chain = [nav.nodes[i]] + [{'lat': la, 'lon': lo} for la, lo, _n in pts_of[(i, o)]] + [nav.nodes[o]]
        return sum(engine.nm(x, y) for x, y in zip(chain, chain[1:]))
    ocean = {(i, o): ocean_of(i, o) for i in entries for o in exits}
    # les entrées par ordre de leur meilleur minorant (distances orthodromiques) : cet ordre ne sert qu'au CHOIX DES COUPLES et à l'arrêt par la borne ; la recherche d'Europe est UNE seule, vers toutes les entrées, avec need = NEED (L5 4 d1) :
    # elle s'arrête dès que NEED entrées sont atteintes, quelles qu'elles soient (un but inatteignable ne fait plus parcourir tout l'espace : EIDW → KJFK 7,4 → 2,1 s) ; une autre recherche, vers les entrées restantes, seulement si aucune chaîne n'a abouti
    rank = sorted(entries, key=lambda i: min(head(i) + ocean[(i, o)] + tail(o) for o in exits))
    dead, tried, any_reached, best = set(), 0, False, None
    report = report if report is not None else {}
    report.update(tried=0, searches=0, stopped='end')
    began = time.perf_counter()
    pack_bound = lambda i: min(head(i) + ocean[(i, o)] + tail(o) for o in exits)      # le minorant, en NM, du meilleur couple de cette entrée : les distances orthodromiques (un minorant EXACT : aucune route n'est plus courte)
    nm_of = lambda path: sum(x['nm'] for _u, _v, x in path)

    def out_of_time():
        now = time.perf_counter()
        return now - began > FREE_S or (engine.DEADLINE is not None and now >= engine.DEADLINE)
    remaining = list(rank)      # SOG-0354 L5 (4) d1 : une recherche d'Europe vers TOUTES les entrées candidates (need = NEED : elle s'arrête dès que NEED sont atteintes, quelles qu'elles soient : un but inatteignable ne fait plus parcourir tout l'espace) ; d1 bis : une recherche de plus vers les entrées restantes tant que leur minorant est SOUS le meilleur coût trouvé et qu'il reste du temps à la section
    while remaining:
        if best and pack_bound(remaining[0]) >= best['total_nm']:      # les entrées qui restent ne peuvent pas être plus COURTES
            report['stopped'] = 'bound'
            break
        if out_of_time():
            report['stopped'] = 'time'
            break
        saved_cap = engine.SEARCH_CAP_S      # SOG-0354 L5 (4) d1 bis : une recherche de plus (vers les entrées restantes, dont le minorant est sous le meilleur coût) ne dure pas plus que le temps qui reste à la section
        if report.get('searches'):
            engine.SEARCH_CAP_S = min(saved_cap, EXTRA_SEARCH_S, max(0.1, FREE_S - (time.perf_counter() - began)))
        try:
            reached = europe(g2, start, [eff(i) for i in remaining])
        finally:
            engine.SEARCH_CAP_S = saved_cap
        report['searches'] = report.get('searches', 0) + 1
        any_reached = any_reached or bool(reached)
        pack = [i for i in remaining if eff(i) in reached]
        pairs = sorted(((nm_of(reached[eff(i)]['path']) + lead_nm(i) + ocean[(i, o)] + tail(o), i, o) for i in pack if eff(i) in reached for o in exits), key=lambda x: x[0])      # le minorant en NM : la section d'Europe RÉELLE + le reste orthodromique
        for bound, i, o in pairs:
            if best and bound >= best['total_nm']:      # les couples suivants ne peuvent pas être plus courts que le meilleur trouvé
                report['stopped'] = 'bound'
                break
            if o in dead:
                continue
            if out_of_time():
                report['stopped'] = 'time'
                break
            tried += 1
            report['tried'] = tried
            keys = [eff(i)] + ([i] if eff(i) != i else []) + [nav.add({'id': n, 'lat': la, 'lon': lo}) for la, lo, n in pts_of[(i, o)]] + [o] + ([eff(o)] if eff(o) != o else [])
            keys = [k for n, k in enumerate(keys) if n == 0 or k != keys[n - 1]]
            legs = []
            for u, v in zip(keys, keys[1:]):
                d = engine.nm(nav.nodes[u], nav.nodes[v])
                legs.append((u, v, dict(a=u, b=v, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, _cost=d * ratio, zone='nat', origin='random')))
            resolved = resolve(g2, start, end, eff(i), eff(o), legs, reached[eff(i)])
            if resolved:
                cost, path, sects = resolved
                total = nm_of(path)
                if best is None or total < best['total_nm']:      # la route libre la plus COURTE en NM (la distance que l'utilisateur voit) parmi les couples essayés
                    best = {'entry': nav.nodes[i]['id'], 'exit': nav.nodes[o]['id'], 'points': [nav.nodes[k]['id'] for k in keys], 'nm': round(ocean[(i, o)], 1), 'cost': cost, 'total_nm': total, 'path': path, 'sections': sects}
                continue
            dead.add(o)      # la section d'Amérique de cette sortie n'a pas abouti (ou la borne a coupé) : elle n'est pas reprise avec une autre entrée
        if report['stopped'] == 'time':
            break
        if len(reached) < NEED:      # moins de NEED atteintes : la recherche a parcouru tout l'espace atteignable, les autres entrées ne sont pas atteignables
            break
        remaining = [i for i in remaining if eff(i) not in reached]      # les entrées qui n'ont pas été atteintes (la recherche s'est arrêtée avant) : une recherche de plus seulement si aucune chaîne n'a abouti
    if best:
        return dict(best, tried=tried, stopped=report['stopped'], searches=report['searches']), None
    if report['stopped'] == 'time':
        return None, NO_TIME
    if not any_reached:
        return None, NO_REACH
    return None, NO_CHAIN
