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
FREE_STATES = 60000      # d1 ter : le budget de TOUTE la route libre, en ÉTATS (la somme des états de toutes ses recherches)
EXTRA_STATES = 7000    # d1 bis (d) : une recherche de plus (vers les entrées restantes qui peuvent encore faire plus COURT) ne parcourt pas plus d'ÉTATS : quand ses buts ne sont pas atteignables elle parcourrait tout l'espace (14 000 états, 4,5 s depuis Dublin) ; coupée, elle rend ce qu'elle a atteint ; une borne en ÉTATS est déterministe (un temps ne l'est pas : la même demande rendrait deux routes selon la charge du poste) ; 7 000 : la plus petite valeur mesurée qui rend aux vols EDDF / EGLL « hors fenêtre » leur distance (1 500 en perdait 72 à 97 NM, 5 000 encore 76)
GATE_EAST = ((42.0, 62.0, -15.6, -14.4), (43.0, 48.5, -9.6, -7.9))      # SOG-0396 : les repères nommés près de la limite des régions océaniques (la ligne de 15°W) et de l'entrée du golfe de Gascogne : (lat min, lat max, lon min, lon max)
GATE_EAST_COORD = (-15.0, range(38, 61))      # SOG-0396 (mesure) : la base n'a que 2 ou 3 repères nommés sur le réseau haut près de 15°W : des coordonnées NAT à degrés entiers le long de 15°W (44-60°N), comme côté Amérique
GATE_WEST = (-50.0, range(34, 59))      # SOG-0396 : des coordonnées NAT à degrés entiers le long de 50°W (NAT Doc 007, § 4.1.2), raccordées par les DCT de simulation
MAX_GATES = 40      # au plus quarante entrées / sorties permanentes ; SOG-0417 : retenues par leur PROXIMITÉ du grand cercle du vol (vingt de chaque côté), pas par leur rang
FIR_BOUNDS = (20.0, 62.0, -35.0, -8.0)      # SOG-0417 : un point marqué « limite de FIR » (drapeau d'une donnée NON FIABLE) n'est une porte que dans la bande océanique est : (lat min, lat max, lon min, lon max) ; hors d'elle le drapeau est ignoré
MAX_FIR_POINTS = 120      # au plus autant de points marqués examinés (un drapeau mis sur tout un fichier ne coûte pas plus)
MAX_FIR_KEPT = 6      # au plus six points marqués RETENUS de chaque côté : les portes permanentes les plus proches gardent leurs places (Sécurisation : un fichier falsifié ne chasse pas les permanentes)
LABEL = 'route libre, créée'
NO_REACH = 'aucune entrée océanique du jour n\'est atteignable depuis le départ à ce niveau'
NO_CHAIN = 'aucune chaîne par une route libre n\'a abouti'
NO_STATES = 'le budget d\'états de la route libre est épuisé avant qu\'une chaîne n\'aboutisse'
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


def _levelled(nav, level_ft):
    """Les nœuds qui touchent une voie (hors routes NAT) dont la bande contient le niveau : un repère de la base qui n'est que sur des voies basses n'est pas une entrée à ce niveau."""
    key = ('_gate_nodes', level_ft)
    if key not in nav.__dict__:
        nodes = set()
        for e in getattr(nav, 'edges', ()):
            if not e.get('nat') and not e.get('nat_link') and isinstance(e.get('lower'), (int, float)) and isinstance(e.get('upper'), (int, float)) and e['lower'] <= level_ft <= e['upper']:
                nodes.update((e['a'], e['b']))
        nav.__dict__[key] = nodes
    return nav.__dict__[key]


def _cross(a, p):
    """SOG-0417 : l'écart (NM) du point `p` au grand cercle de `a` (un triplet (x, y, z) unitaire de la normale) : asin(|p · n|)."""
    return math.degrees(math.asin(min(1.0, abs(p[0] * a[0] + p[1] * a[1] + p[2] * a[2])))) * 60


def _vec(n):
    la, lo = math.radians(n['lat']), math.radians(n['lon'])
    return (math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la))


def gates(nav, high, level_ft, a=None, b=None):
    """SOG-0396 : les entrées / sorties océaniques PERMANENTES : [(nœud, 'point' | 'coordinate')], au plus MAX_GATES ; 'point' : un repère nommé de la base, dans une des bandes GATE_EAST, sur le réseau haut ET sur une voie qui porte le niveau du vol ; 'coordinate' : une coordonnée NAT (« 47/50 ») le long de GATE_WEST, créée dans le graphe.
    Fixes : le même vol rend les mêmes portes, quel que soit le message NAT, l'heure ou l'horloge."""
    ok = _levelled(nav, level_ft)
    named = sorted((nav.nodes[k]['id'], k) for k in high if k in ok and any(la0 <= nav.nodes[k]['lat'] <= la1 and lo0 <= nav.nodes[k]['lon'] <= lo1 for la0, la1, lo0, lo1 in GATE_EAST))
    coords = [nav.add({'id': f'{lat}/{int(-lon)}', 'lat': float(lat), 'lon': lon}) for lon, lats in (GATE_WEST, GATE_EAST_COORD) for lat in lats]
    out = [(k, 'coordinate') for k in coords] + [(k, 'point') for _n, k in named]
    if a is None or b is None:
        return out[:MAX_GATES]
    # SOG-0417 : les points que la source dit à la limite d'une FIR s'ajoutent (une donnée NON FIABLE : dans la bande océanique est seulement, au plus MAX_FIR_POINTS, jamais un nœud qui n'a pas de position valide), puis les portes sont retenues par leur PROXIMITÉ du grand cercle du vol : vingt de chaque côté de l'océan, les plus proches
    seen = {k for k, _kind in out}
    la0, la1, lo0, lo1 = FIR_BOUNDS
    flagged = sorted((nav.nodes[k]['id'], k) for k in getattr(nav, 'fir_keys', ()) if k in nav.nodes and k not in seen and la0 <= nav.nodes[k]['lat'] <= la1 and lo0 <= nav.nodes[k]['lon'] <= lo1)[:MAX_FIR_POINTS]
    va, vb = _vec(a), _vec(b)
    normal = (va[1] * vb[2] - va[2] * vb[1], va[2] * vb[0] - va[0] * vb[2], va[0] * vb[1] - va[1] * vb[0])
    size = math.sqrt(sum(x * x for x in normal))
    if size < 1e-9:
        return out[:MAX_GATES]
    normal = tuple(x / size for x in normal)
    side = lambda k: 'west' if nav.nodes[k]['lon'] < WEST_LON else 'east'
    near = lambda k: (round(_cross(normal, _vec(nav.nodes[k])), 1), nav.nodes[k]['id'], k)
    kept = []
    for which in ('west', 'east'):
        marked = [near(k) for _n, k in flagged if side(k) == which][:]
        marked.sort()
        marked = marked[:MAX_FIR_KEPT]      # les marqués : les plus proches, six au plus
        room = MAX_GATES // 2 - len(marked)      # les permanentes d'abord : elles gardent au moins toutes les places que les marqués ne prennent pas
        mine = sorted(near(k) + (kind,) for k, kind in out if side(k) == which)
        kept += [(k, kind) for _x, _i, k, kind in mine[:room]] + [(k, 'point') for _x, _i, k in marked]
    return kept


def _links(nav, node, high, into, band):
    """Les raccords DCT de simulation d'un point océanique au réseau haut : les LINK_NODES nœuds les plus proches à moins de LINK_NM NM (comme nat_layer.add) ; [] si le point touche déjà le réseau."""
    if node in high:
        return []
    p = nav.nodes[node]
    near = sorted((engine.nm(p, nav.nodes[k]), k) for k in high if k != node and abs(nav.nodes[k]['lat'] - p['lat']) < nat_layer.LINK_NM / 60 + .1)
    near = [(d, k) for d, k in near if d <= nat_layer.LINK_NM][:nat_layer.LINK_NODES]
    return [(k, node, dict(a=k, b=node, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, zone='nat', nat_link='entry')) if into else
            (node, k, dict(a=node, b=k, route='DCT', lower=band[0], upper=band[1], dir='F', nm=d, zone='nat', nat_link='exit')) for d, k in near]


def solve(nav, g, start, end, ratio, resolve, europe, report=None, skip=frozenset(), limit=None):
    """(chaîne, None) ou (None, raison) : la meilleure route libre résolue ; la chaîne : { entry, exit, points: [id], nm, cost, path, sections }.
    SOG-0354 L5 (2 bis) : UNE seule recherche du départ vers TOUTES les entrées (`europe(g2, start, entries)` → { entrée atteinte : { path, cost, band } }, celle de sections : le mécanisme de L5 1 bis), puis les couples entre entrées ATTEINTES, dans l'ordre de leur minorant (le coût RÉEL de la section d'Europe + le reste estimé) :
    les essais ne sont plus gaspillés sur des entrées que le départ n'atteint pas (LFPO / LFPG → KLAX : les entrées proches du chemin ne s'atteignent pas depuis Paris à FL370) ; une sortie dont la section d'Amérique n'a pas abouti n'est pas reprise. `resolve(g2, start, end, entry, exit, legs, first)` est celui de sections
    SOG-0354 L5 (4) défaut 3 : les couples sont essayés dans l'ordre de leur minorant SANS nombre fixe (trois essais ne suffisaient pas : CYYZ → EDDF aboutit à la cinquième sortie, les quatre premières échouent chacune en 0,01 s) ; arrêt quand le minorant du suivant dépasse le meilleur coût trouvé, ou quand FREE_S (ou la borne de la phase) est épuisé ; `report` (un dict) reçoit { tried, stopped : 'bound' | 'time' | 'end' } : la réponse dit combien ont été essayés.
    (même recherche par sections qu'une route NAT) ; le graphe `g2` est celui de `g` avec les raccords de TOUTES les entrées et sorties (des arêtes DCT de simulation, comme nat_layer.add)."""
    a, b = nav.nodes[start], nav.nodes[end]
    start_east = a['lon'] > WEST_LON
    kinds = {k: 'track' for k in ends(nav)}
    if hasattr(nav, 'edges'):      # un graphe réel (un faux de cas n'a pas de base : il n'a que les extrémités qu'il donne)
        high = getattr(nav, '_nat_high', None)
        if high is None:
            high = nav._nat_high = nat_layer.main_network(nav)
        for k, kind in gates(nav, high, int((getattr(g, 'flight', None) or {}).get('ceiling') or 0), a, b):      # SOG-0396 : les portes PERMANENTES s'ajoutent aux extrémités des routes du message
            kinds.setdefault(k, kind)
    known = [k for k in kinds if nav.nodes[k]['id'] not in skip and k not in skip]      # SOG-0396 : le bout d'une route du sens contraire EN VIGUEUR n'est ni entrée ni sortie (`skip`, posé par sections)
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
    high_band = getattr(nav, '_nat_high_band', None)
    if high_band is None:
        high_band = nav._nat_high_band = nat_layer.main_network(nav, LOW_FT) if hasattr(nav, 'edges') else frozenset()      # un faux de cas n'a pas de base
    g2 = engine.RoutingGraph(g)
    g2.__dict__.update(g.__dict__)
    for k, into in [(i, True) for i in entries] + [(o, False) for o in exits]:
        got = _links(nav, eff(k), high, into, band)      # SOG-0396 (selection) : les trois nœuds les plus proches du réseau « haut » (voies au plafond FL245) ET les trois du réseau qui ATTEINT la bande de la route libre (FL285) : un nœud de voie plafonnée à FL255 n'est atteint que de bas, jamais à la bande du raccord ; sans les seconds, la porte n'avait aucun raccord utilisable (KORD → EIDW : 6 085 NM au lieu de 3 508)
        seen_links = {(x[0], x[1]) for x in got}
        got = got + [x for x in _links(nav, eff(k), high_band, into, band) if (x[0], x[1]) not in seen_links]
        for u, v, e in got:
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
    report.update(tried=0, searches=0, stopped='end', entries=len(entries), exits=len(exits), reached=[], pairs=[])      # SOG-0396 : le DIAGNOSTIC PAR PAIRE : combien d'entrées et de sorties, quelles entrées la recherche d'Europe a atteintes, chaque couple essayé et son résultat
    began = time.perf_counter()
    s0 = getattr(nav, 'states_total', None)      # d1 ter : les états déjà comptés ; un moteur sans compteur (un faux) : la somme des `expanded` des recherches vues
    fake = {'n': 0}

    def spent():
        t = getattr(nav, 'states_total', None)
        return (t - s0) if (t is not None and s0 is not None) else fake['n']

    def note():
        if s0 is None:
            fake['n'] += (getattr(nav, 'last_search', None) or {}).get('expanded') or 0
    tail_real = {}      # d1 ter : la section d'Amérique RÉELLE d'une sortie, une fois résolue (elle ne dépend presque pas de l'entrée) : elle remplace le grand cercle dans l'estimation des couples suivants
    tail_est = lambda o: tail_real.get(o, tail(o))
    pack_bound = lambda i: min(head(i) + ocean[(i, o)] + tail_est(o) for o in exits)      # le minorant, en NM, du meilleur couple de cette entrée : les distances orthodromiques (un minorant EXACT : aucune route n'est plus courte)
    nm_of = lambda path: sum(x['nm'] for _u, _v, x in path)

    def out_of_time():      # d1 ter : 'states' (le budget d'états de TOUTE la route libre : déterministe) ou 'time' (FREE_S et la borne de la phase : la sécurité de dernier recours, dite quand elle coupe)
        if spent() >= FREE_STATES:
            return 'states'
        now = time.perf_counter()
        return 'time' if (now - began > FREE_S or (engine.DEADLINE is not None and now >= engine.DEADLINE)) else None
    def cap():      # SOG-0450 (B) : la borne des couples : le meilleur trouvé ; ET, quand l'appelant ne demande que « existe-t-il une route libre d'au plus `limit` NM ? » (la comparaison avec la route NAT), `limit` : un couple dont le minorant dépasse `limit` ne peut pas répondre « oui » ; dès qu'un couple l'atteint, le meilleur trouvé le remplace : la MEILLEURE route libre reste cherchée comme avant
        vals = [x for x in (best['total_nm'] if best else None, None if limit is None else limit + 1e-6) if x is not None]
        return min(vals) if vals else None
    remaining = list(rank)      # SOG-0354 L5 (4) d1 : une recherche d'Europe vers TOUTES les entrées candidates (need = NEED : elle s'arrête dès que NEED sont atteintes, quelles qu'elles soient : un but inatteignable ne fait plus parcourir tout l'espace) ; d1 bis : une recherche de plus vers les entrées restantes tant que leur minorant est SOUS le meilleur coût trouvé et qu'il reste du temps à la section
    while remaining:
        if cap() is not None and pack_bound(remaining[0]) >= cap():      # les entrées qui restent ne peuvent pas être plus COURTES
            report['stopped'] = 'bound'
            break
        why = out_of_time()
        if why:
            report['stopped'] = why
            break
        useful = [i for i in remaining if cap() is None or pack_bound(i) < cap()]      # seules les entrées qui peuvent encore faire plus COURT sont des buts (les autres ne feraient que détourner la recherche)
        if not useful:
            report['stopped'] = 'bound'
            break
        reached = europe(g2, start, [eff(i) for i in useful], **({'max_states': max(1, min(EXTRA_STATES, FREE_STATES - spent()))} if report.get('searches') else {}))      # SOG-0354 L5 (4) d1 bis : une recherche de plus (vers les entrées restantes) est bornée en ÉTATS (d1 ter : et par ce qui reste du budget de la route libre)
        note()
        report['searches'] = report.get('searches', 0) + 1
        any_reached = any_reached or bool(reached)
        report['reached'] = sorted(set(report['reached']) | {nav.nodes[k]['id'] for k in reached})[:80]
        pack = [i for i in useful if eff(i) in reached]
        pairs = sorted(((nm_of(reached[eff(i)]['path']) + lead_nm(i) + ocean[(i, o)] + tail(o), i, o) for i in pack if eff(i) in reached for o in exits), key=lambda x: x[0])      # le minorant en NM : la section d'Europe RÉELLE + le reste orthodromique
        for bound, i, o in pairs:
            if cap() is not None and bound - tail(o) + tail_est(o) >= cap():      # ce couple ne peut pas être plus court que le meilleur trouvé (la section d'Amérique de sa sortie est connue quand elle a été résolue : l'estimation est alors presque exacte)
                report['stopped'] = 'bound'
                continue
            if o in dead:
                continue
            why = out_of_time()
            if why:
                report['stopped'] = why
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
            note()
            if len(report['pairs']) < 60:
                report['pairs'].append({'entry': nav.nodes[i]['id'], 'exit': nav.nodes[o]['id'], 'ok': bool(resolved)})      # SOG-0396 : `ok` faux : la section de la route libre ou celle d'Amérique de ce couple n'a pas abouti
            if resolved:
                cost, path, sects = resolved
                total = nm_of(path)
                tail_real[o] = lead_nm(o) + sects[-1]['nm']
                if best is None or total < best['total_nm']:      # la route libre la plus COURTE en NM (la distance que l'utilisateur voit) parmi les couples essayés
                    best = {'gates': {'entry': kinds.get(i), 'exit': kinds.get(o)}, 'entry': nav.nodes[i]['id'], 'exit': nav.nodes[o]['id'], 'points': [nav.nodes[k]['id'] for k in keys], 'nm': round(ocean[(i, o)], 1), 'cost': cost, 'total_nm': total, 'path': path, 'sections': sects}
                continue
            dead.add(o)      # la section d'Amérique de cette sortie n'a pas abouti (ou la borne a coupé) : elle n'est pas reprise avec une autre entrée
        if report['stopped'] in ('time', 'states'):
            break
        if len(reached) < NEED:      # moins de NEED atteintes : la recherche a parcouru tout l'espace atteignable, les autres entrées ne sont pas atteignables
            break
        remaining = [i for i in useful if eff(i) not in reached]      # les entrées qui n'ont pas été atteintes (la recherche s'est arrêtée avant) : une recherche de plus seulement si aucune chaîne n'a abouti
    report['states'] = spent()
    if best:
        return dict(best, tried=tried, stopped=report['stopped'], searches=report['searches'], states=report['states']), None
    if report['stopped'] == 'states':
        return None, NO_STATES
    if report['stopped'] == 'time':
        return None, NO_TIME
    if not any_reached:
        return None, NO_REACH
    return None, NO_CHAIN
