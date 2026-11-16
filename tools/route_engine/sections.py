"""Le découpage d'un vol qui traverse l'Atlantique en SECTIONS jointes à des PORTES (SOG-0354, lot L2b (3) ; note de conception docs/technique/V3_ROUTE_GATES.md).

Derrière l'option `sections: true` de la demande. Un vol qui traverse l'Atlantique par une track du jour est une chaîne de trois sections : de l'aérodrome de départ à l'ENTRÉE de la track (l'Europe), la track elle-même (une suite de points PUBLIÉS : la section est connue, elle ne se cherche pas), de la SORTIE de la
track à l'aérodrome d'arrivée (l'Amérique). Chaque recherche est celle de `Nav.search` (A* à labels d'altitude), mais sur une distance trois fois plus courte ; la bande d'altitude finale d'une section est la bande de départ de la suivante (`initial_band`), de sorte que le profil vertical reste continu.

Le SQUELETTE : un petit graphe dont les nœuds sont le départ, l'arrivée et, pour chaque track valide dans le sens du vol, son entrée et sa sortie ; le coût d'une arête « départ → entrée » est une MINORATION (le plus petit coût par NM du graphe × la distance orthodromique : jamais trop grand), celui de la track est exact (la somme des coûts de ses tronçons). Les tracks sont
résolues dans l'ordre de leur minorant ; une chaîne résolue remplace ses estimations par ses coûts réels ; on s'arrête quand le minorant de la suivante dépasse le meilleur coût trouvé (c'est la résolution PARESSEUSE : la recherche chère n'est faite que pour les tracks qu'une meilleure chaîne n'écarte pas). Le résultat est le meilleur vol PAR UNE TRACK ;
il n'est pas, par construction, le meilleur de tous les vols (un vol sans track n'y est pas) : l'option est une demande, pas le défaut.

`solve` rend le chemin (la liste des tronçons, comme Nav.search) ou None (pas applicable : pas de track dans le sens du vol, un vol hors Atlantique, rien de résolu) ; dans ce cas la recherche entière suit, comme sans l'option. Ce que la dernière résolution a fait est dans `nav.sections_info` : les sections (nom, de, à, distance, coût, états développés), la track retenue, les tracks essayées."""
import datetime

from . import engine, free_route, nat_layer

WEST_LON, EAST_LON = -35.0, -15.0      # les mêmes limites que plan.crosses_ocean et nat_layer.hint


def oriented_chains(nodes, g, east):
    """{ identifiant de track: { entry, exit, legs: [(u, v, e)], cost } } des tracks du jour présentes dans `g` (celles dont la bande contient le niveau demandé : le graphe est déjà filtré), orientées dans le sens du vol : vers l'est si `east`, sinon vers l'ouest. Une track à sens unique n'est gardée que si
    son sens est celui du vol ; une track dans les deux sens est prise dans le sens du vol. Une chaîne qui se ramifie ou qui ne se suit pas est écartée."""
    by = {}
    for u, es in g.items():
        for v, e in es:
            meta = e.get('nat')
            if meta and not e.get('nat_link') and str(e.get('route', '')).startswith('NAT'):
                by.setdefault(meta['track'], {'direction': meta.get('direction'), 'legs': []})['legs'].append((u, v, e))
    out = {}
    for tid, t in by.items():
        direction = t['direction']
        wanted = 'east' if east else 'west'
        if direction not in (wanted, 'both'):
            continue
        for forward in (True, False):      # a → b, puis b → a (une track dans les deux sens)
            legs = [(u, v, e) for u, v, e in t['legs'] if (u == e['a']) == forward]
            if not legs:
                continue
            nxt = {}
            for u, v, e in legs:
                if u in nxt:
                    nxt = None
                    break
                nxt[u] = (u, v, e)
            if nxt is None:
                continue
            heads = [u for u in nxt if all(v != u for _u, v, _e in legs)]
            if len(heads) != 1:
                continue
            chain, node = [], heads[0]
            while node in nxt and len(chain) <= len(legs):
                chain.append(nxt[node])
                node = nxt[node][1]
            if len(chain) != len(legs):
                continue
            out_ = {'entry': chain[0][0], 'exit': chain[-1][1], 'legs': chain, 'cost': sum(e.get('_cost', e['nm']) for _u, _v, e in chain)}
            if _heading(nodes, out_, east):      # la chaîne avance dans le sens du vol (une track dans les deux sens est prise dans ce sens)
                out.setdefault(tid, []).append(out_)
    return out


def _heading(nodes, chain, east):
    a, b = nodes[chain['entry']]['lon'], nodes[chain['exit']]['lon']
    return b > a if east else b < a


def solve(nav, g, start, end):
    """Le meilleur chemin PAR UNE TRACK, en sections (voir l'en-tête) ; None si l'option n'est pas applicable ou si rien n'a pu être résolu."""
    nav.sections_info = None
    flight = getattr(g, 'flight', None)
    if not flight:
        return None
    a, b = nav.nodes[start], nav.nodes[end]
    east = a['lon'] < b['lon']
    if not ((a['lon'] < WEST_LON and b['lon'] > EAST_LON) or (b['lon'] < WEST_LON and a['lon'] > EAST_LON)):
        return None      # pas un vol qui traverse l'Atlantique
    # SOG-0354 L5 (1) : une track n'est une porte que si elle est VALABLE POUR CE VOL (sens, niveau de sa liste, heure estimée au passage de l'entrée dans la validité du message) ; chaque track écartée est dite avec sa raison
    fl = int(round((flight.get('ceiling') or 0) / 100))
    meta = (getattr(nav, 'nat', None) or {}).get('meta') or {}
    depart = getattr(nav, 'depart', None)
    speed = flight.get('speed_kt') or 450
    eta_of = lambda nm_: depart[0] + datetime.timedelta(hours=nm_ / speed)
    rejected = {tid: why for tid, m in meta.items() if (why := nat_layer.check(m, fl, east))}
    candidates = []
    for tid, options in oriented_chains(nav.nodes, g, east).items():
        if tid in rejected:
            continue
        for o in options:
            why = nat_layer.check(meta[tid], fl, east, eta_of(engine.nm(a, nav.nodes[o['entry']]))) if depart and tid in meta else None
            if why:
                rejected[tid] = why
                continue
            candidates.append((tid, o))
    for tid in meta:
        if tid not in rejected and tid not in {c[0] for c in candidates}:
            rejected[tid] = ('network', f"route NAT {tid} : ni son entrée ni sa sortie ne se relie au réseau haut à ce niveau")
    info = {'candidates': [], 'tried': [], 'chosen': None, 'sections': [], 'rejected': [], 'depart': ({'time': depart[0].strftime('%Y-%m-%dT%H:%MZ'), 'basis': depart[1]} if depart else None)}
    nav.sections_info = info

    nav.nat_rejected = frozenset(rejected)      # la recherche entière qui suit (si rien n'abouti ici) ne prend pas non plus une track écartée pour ce vol

    def said():
        info['rejected'] = [{'track': tid, 'code': code, 'text': text} for tid, (code, text) in sorted(rejected.items())]
    ratio = min((e.get('_cost', e['nm']) / e['nm'] for es in g.values() for _v, e in es if e['nm'] > .00001), default=0)
    if not candidates:
        said()
        info['reason'] = 'Aucune route NAT valable pour ce vol.'
        return _free(nav, g, start, end, ratio, info)
    skeleton = sorted(((ratio * (engine.nm(a, nav.nodes[o['entry']]) + engine.nm(nav.nodes[o['exit']], b)) + o['cost'], tid, o) for tid, o in candidates), key=lambda x: x[0])
    info['candidates'] = [{'track': tid, 'lower_bound': round(lb, 1)} for lb, tid, _o in skeleton]
    best = None
    for lb, tid, o in skeleton:
        if best is not None and lb >= best[0]:
            break      # le minorant des suivantes dépasse déjà le meilleur coût trouvé : leur recherche chère n'est pas faite
        resolved = _resolve(nav, g, start, end, tid, o)
        if resolved and depart:      # l'heure au passage de l'entrée, refaite avec la distance RÉELLE de la section d'Europe
            why = nat_layer.check(meta[tid], fl, east, eta_of(resolved[2][0]['nm'])) if tid in meta else None
            if why:
                rejected[tid] = why
                nav.nat_rejected = frozenset(rejected)
                resolved = None
        info['tried'].append({'track': tid, 'cost': round(resolved[0], 1) if resolved else None})
        if resolved and (best is None or resolved[0] < best[0]):
            best = resolved + (tid,)
    said()
    if best is None:
        info['reason'] = 'Aucune chaîne par une route NAT valable n\'a abouti.'
        return _free(nav, g, start, end, ratio, info)
    cost, path, sections, tid = best
    info['chosen'], info['sections'], info['cost'] = tid, sections, round(cost, 1)
    return path


def _free(nav, g, start, end, ratio, info):
    """SOG-0354 L5 (2) : aucune route du jour ne convient : la route libre CRÉÉE (free_route), résolue par les mêmes sections ; `info['free']` dit ce qui a été fait (ou pourquoi rien : « aucun point d'entrée océanique connu »), `info['source']` vaut 'random' ; None si rien n'a abouti (la recherche entière suit)."""
    made, why = free_route.solve(nav, g, start, end, ratio, lambda g2, s, e, entry, exit_, legs: _resolve(nav, g2, s, e, None, {'entry': entry, 'exit': exit_, 'legs': legs}, True))
    if not made:
        info['free'] = {'source': 'random', 'label': free_route.LABEL, 'ok': False, 'reason': why}
        info['reason'] = (info.get('reason') or '') + ' Route libre : ' + why + ' ; la recherche entière suit.'
        return None
    info['free'] = {'source': 'random', 'label': free_route.LABEL, 'ok': True, 'entry': made['entry'], 'exit': made['exit'], 'points': made['points'], 'nm': made['nm']}
    info['source'], info['sections'], info['cost'] = 'random', made['sections'], round(made['cost'], 1)
    info['reason'] = (info.get('reason') or '') + ' Route libre créée : ' + ' '.join(made['points']) + '.'
    return made['path']


def _sub(g, legs):
    """Le graphe réduit à la suite de tronçons d'une track (les attributs de g gardés : le vol, la zone FRA exigée) : la recherche d'une section « track » n'a qu'un chemin, celui qui est publié, mais passe par le même code que les autres (mêmes bandes d'altitude, mêmes coûts)."""
    sub = engine.RoutingGraph()
    sub.__dict__.update(g.__dict__)
    for u, v, e in legs:
        sub.setdefault(u, []).append((v, e))
    return sub


def _resolve(nav, g, start, end, tid, o, created=False):
    """(coût, chemin, sections) de la chaîne départ → entrée → track → sortie → arrivée, ou None (une section n'a pas abouti, ou le budget est atteint)."""
    spans = ((None, g, start, o['entry'], None, True), ('route libre' if created else 'track ' + tid, _sub(g, o['legs']), o['entry'], o['exit'], 'band', True), (None, g, o['exit'], end, 'band', False))
    path, total, band, sections = [], 0.0, None, []
    for name, graph, s, e, use_band, is_gate in spans:
        if name is None:      # une section d'extrémité porte le nom de son côté de l'océan (le vol peut aller dans les deux sens)
            name = 'europe' if nav.nodes[s if s == start else e]['lon'] > WEST_LON else 'amérique'
        try:
            part = nav.search(graph, s, e, (), False, False, band if use_band else None, gate=is_gate)
        except ValueError:
            return None      # le budget de cette recherche est atteint : cette chaîne n'est pas prouvée
        if part is None:
            return None
        ls = nav.last_search
        band = ls.get('band')
        total += ls['cost']
        path.extend(part)
        sections.append({'name': name, 'from': nav.nodes[s]['id'], 'to': nav.nodes[e]['id'], 'nm': round(sum(x['nm'] for _u, _v, x in part), 1), 'cost': round(ls['cost'], 1), 'expanded': ls.get('expanded'), 'seconds': ls.get('seconds'),
                         'proof': 'created' if created and name == 'route libre' else 'published' if name.startswith('track') else 'computed'})
    return total, path, sections
