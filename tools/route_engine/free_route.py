"""La route libre CRÉÉE d'un vol qui traverse l'Atlantique quand aucune route du jour ne lui convient (SOG-0354, lot L5 (2) ; note de conception docs/technique/V3_ROUTE_GATES.md § 13.2).

Une route NAT n'existe que pour les heures du message (ou n'est pas dans le sens du vol) : à 03:00 aucune route n'est valable, et pourtant un vol traverse. Il traverse alors par une route LIBRE, comme un équipage en dépose une : des points posés tous les 10° de longitude, à la latitude du chemin le plus court (le grand cercle), à la latitude ENTIÈRE (« 54/30 », « 52/20 », « 50/10 »),
entre un point d'ENTRÉE et un point de SORTIE océaniques.

Les entrées et les sorties sont celles de TOUTES les routes du jour (les deux extrémités de chaque route du message lu, dans les deux sens) : le message du jour est tout ce que le lanceur garde ; aucune mémoire de la saison n'est lue ni écrite. Le couple (entrée, sortie) est celui dont le coût estimé (minorant) de la chaîne est le plus petit ; l'Europe (ou l'Amérique) est ensuite cherchée par `Nav.search`, comme pour une route NAT.
Une route libre est CALCULÉE, jamais lue dans un texte : ses tronçons portent `origin: 'random'` (la réponse : `sections.free.source`), le contrôle la dit « route libre, créée » (aucune autorisation océanique vérifiée). Quand aucune route du jour ne donne un point océanique connu, on le dit (« aucun point d'entrée océanique connu ») ; on n'en invente pas."""
import math

from . import engine, nat_layer

WEST_LON = -35.0       # la limite entre les deux côtés de l'océan (celle de sections et de nat_layer.hint)
STEP_LON = 10          # un point par 10° de longitude
LOW_FT, HIGH_FT = 28500, 60000      # le plancher de l'espace RVSM / HLA et le plafond : une route libre est une route de croisière
CHUNK = 5              # les entrées cherchées ensemble, les plus proches du chemin d'abord
NEED = 2               # la recherche vers un paquet d'entrées s'arrête dès que deux sont atteintes (une entrée inatteignable fait sinon parcourir tout l'espace des états)
TRIES = 3              # les couples (entrée, sortie) essayés, dans l'ordre de leur minorant
LABEL = 'route libre, créée'
NO_REACH = 'aucune entrée océanique du jour n\'est atteignable depuis le départ à ce niveau'
NO_CHAIN = 'aucune chaîne par une route libre n\'a abouti'
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


def solve(nav, g, start, end, ratio, resolve, europe):
    """(chaîne, None) ou (None, raison) : la meilleure route libre résolue ; la chaîne : { entry, exit, points: [id], nm, cost, path, sections }.
    SOG-0354 L5 (2 bis) : UNE seule recherche du départ vers TOUTES les entrées (`europe(g2, start, entries)` → { entrée atteinte : { path, cost, band } }, celle de sections : le mécanisme de L5 1 bis), puis les couples entre entrées ATTEINTES, dans l'ordre de leur minorant (le coût RÉEL de la section d'Europe + le reste estimé) :
    les essais ne sont plus gaspillés sur des entrées que le départ n'atteint pas (LFPO / LFPG → KLAX : les entrées proches du chemin ne s'atteignent pas depuis Paris à FL370) ; une sortie dont la section d'Amérique n'a pas abouti n'est pas reprise. `resolve(g2, start, end, entry, exit, legs, first)` est celui de sections
    (même recherche par sections qu'une route NAT) ; le graphe `g2` est celui de `g` avec les raccords de TOUTES les entrées et sorties (des arêtes DCT de simulation, comme nat_layer.add)."""
    a, b = nav.nodes[start], nav.nodes[end]
    start_east = a['lon'] > WEST_LON
    known = ends(nav)
    entries = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) == start_east]
    exits = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) != start_east]
    if not entries or not exits:
        return None, NO_POINT
    high = getattr(nav, '_nat_high', None)
    if high is None:
        high = nav._nat_high = nat_layer.main_network(nav)
    band = (LOW_FT, HIGH_FT)
    g2 = engine.RoutingGraph(g)
    g2.__dict__.update(g.__dict__)
    for k, into in [(i, True) for i in entries] + [(o, False) for o in exits]:
        for u, v, e in _links(nav, k, high, into, band):
            e['_cost'] = e['nm'] * ratio
            g2[u] = list(g2.get(u, ())) + [(v, e)]
    pts_of = {(i, o): interior(nav.nodes[i], nav.nodes[o]) for i in entries for o in exits}

    def ocean_of(i, o):
        chain = [nav.nodes[i]] + [{'lat': la, 'lon': lo} for la, lo, _n in pts_of[(i, o)]] + [nav.nodes[o]]
        return sum(engine.nm(x, y) for x, y in zip(chain, chain[1:]))
    ocean = {(i, o): ocean_of(i, o) for i in entries for o in exits}
    # les entrées par ordre de leur meilleur minorant (distances orthodromiques) : la recherche vers TOUTES les entrées parcourt tout l'espace dès qu'une n'est pas atteignable (EIDW → KJFK : 13 portes, 31 000 états, 4,8 s, contre 260 états vers l'entrée voulue) :
    # elles sont cherchées PAR PAQUETS de CHUNK, les plus proches du chemin d'abord ; le paquet suivant seulement si le précédent n'a donné aucune route
    rank = sorted(entries, key=lambda i: min(engine.nm(a, nav.nodes[i]) + ocean[(i, o)] + engine.nm(nav.nodes[o], b) for o in exits))
    dead, tried, any_reached = set(), 0, False
    for start_at in range(0, len(rank), CHUNK):
        reached = europe(g2, start, rank[start_at:start_at + CHUNK])
        any_reached = any_reached or bool(reached)
        pairs = sorted(((reached[i]['cost'] + ratio * (ocean[(i, o)] + engine.nm(nav.nodes[o], b)), i, o) for i in reached for o in exits), key=lambda x: x[0])
        for bound, i, o in pairs:
            if tried >= TRIES:
                break
            if o in dead:
                continue
            tried += 1
            keys = [i] + [nav.add({'id': n, 'lat': la, 'lon': lo}) for la, lo, n in pts_of[(i, o)]] + [o]
            keys = [k for n, k in enumerate(keys) if n == 0 or k != keys[n - 1]]
            legs = []
            for u, v in zip(keys, keys[1:]):
                d = engine.nm(nav.nodes[u], nav.nodes[v])
                legs.append((u, v, dict(a=u, b=v, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, _cost=d * ratio, zone='nat', origin='random')))
            resolved = resolve(g2, start, end, i, o, legs, reached[i])
            if resolved:
                cost, path, sects = resolved
                return {'entry': nav.nodes[i]['id'], 'exit': nav.nodes[o]['id'], 'points': [nav.nodes[k]['id'] for k in keys], 'nm': round(ocean[(i, o)], 1), 'cost': cost, 'path': path, 'sections': sects}, None
            dead.add(o)      # la section d'Amérique de cette sortie n'a pas abouti (ou la borne a coupé) : elle n'est pas reprise avec une autre entrée
        if tried >= TRIES:
            break
    if not any_reached:
        return None, NO_REACH
    return None, NO_CHAIN
