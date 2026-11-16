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
TRIES = 3              # les couples (entrée, sortie) essayés, dans l'ordre de leur minorant
LABEL = 'route libre, créée'
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


def solve(nav, g, start, end, ratio, resolve):
    """(chaîne, None) ou (None, raison) : la meilleure route libre résolue ; la chaîne : { entry, exit, points: [id], nm, cost, path, sections }. `resolve(g2, start, end, entry, exit, legs)` est celui de sections (même recherche par sections qu'une route NAT) ; le graphe `g2` est celui de `g`
    avec les raccords de l'entrée et de la sortie choisies (des arêtes DCT de simulation, comme nat_layer.add)."""
    a, b = nav.nodes[start], nav.nodes[end]
    start_east = a['lon'] > WEST_LON
    known = ends(nav)
    entries = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) == start_east]
    exits = [k for k in known if (nav.nodes[k]['lon'] > WEST_LON) != start_east]
    if not entries or not exits:
        return None, NO_POINT
    pairs = []
    for i in entries:
        for o in exits:
            pts = interior(nav.nodes[i], nav.nodes[o])
            chain = [nav.nodes[i]] + [{'lat': la, 'lon': lo} for la, lo, _n in pts] + [nav.nodes[o]]
            ocean = sum(engine.nm(x, y) for x, y in zip(chain, chain[1:]))
            pairs.append((ratio * (engine.nm(a, nav.nodes[i]) + ocean + engine.nm(nav.nodes[o], b)), i, o, pts, ocean))
    pairs.sort(key=lambda x: x[0])
    high = getattr(nav, '_nat_high', None)
    if high is None:
        high = nav._nat_high = nat_layer.main_network(nav)
    band = (LOW_FT, HIGH_FT)
    for bound, i, o, pts, ocean in pairs[:TRIES]:
        keys = [i] + [nav.add({'id': n, 'lat': la, 'lon': lo}) for la, lo, n in pts] + [o]
        keys = [k for n, k in enumerate(keys) if n == 0 or k != keys[n - 1]]
        legs = []
        for u, v in zip(keys, keys[1:]):
            d = engine.nm(nav.nodes[u], nav.nodes[v])
            legs.append((u, v, dict(a=u, b=v, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, _cost=d * ratio, zone='nat', origin='random')))
        g2 = engine.RoutingGraph(g)
        g2.__dict__.update(g.__dict__)
        for u, v, e in _links(nav, i, high, True, band) + _links(nav, o, high, False, band):
            e['_cost'] = e['nm'] * ratio
            g2[u] = list(g2.get(u, ())) + [(v, e)]
        resolved = resolve(g2, start, end, i, o, legs)
        if resolved:
            cost, path, sects = resolved
            return {'entry': nav.nodes[i]['id'], 'exit': nav.nodes[o]['id'], 'points': [nav.nodes[k]['id'] for k in keys], 'nm': round(ocean, 1), 'cost': cost, 'path': path, 'sections': sects}, None
    return None, 'aucune chaîne par une route libre n\'a abouti'

