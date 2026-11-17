"""Le découpage d'un vol qui traverse l'Atlantique en SECTIONS jointes à des PORTES (SOG-0354, lot L2b (3) ; note de conception docs/technique/V3_ROUTE_GATES.md).

Derrière l'option `sections: true` de la demande. Un vol qui traverse l'Atlantique par une track du jour est une chaîne de trois sections : de l'aérodrome de départ à l'ENTRÉE de la track (l'Europe), la track elle-même (une suite de points PUBLIÉS : la section est connue, elle ne se cherche pas), de la SORTIE de la
track à l'aérodrome d'arrivée (l'Amérique). Chaque recherche est celle de `Nav.search` (A* à labels d'altitude), mais sur une distance trois fois plus courte ; la bande d'altitude finale d'une section est la bande de départ de la suivante (`initial_band`), de sorte que le profil vertical reste continu.

Le SQUELETTE : un petit graphe dont les nœuds sont le départ, l'arrivée et, pour chaque track valide dans le sens du vol, son entrée et sa sortie ; le coût d'une arête « départ → entrée » est une MINORATION (le plus petit coût par NM du graphe × la distance orthodromique : jamais trop grand), celui de la track est exact (la somme des coûts de ses tronçons). Les tracks sont
résolues dans l'ordre de leur minorant ; une chaîne résolue remplace ses estimations par ses coûts réels ; on s'arrête quand le minorant de la suivante dépasse le meilleur coût trouvé (c'est la résolution PARESSEUSE : la recherche chère n'est faite que pour les tracks qu'une meilleure chaîne n'écarte pas). Le résultat est le meilleur vol PAR UNE TRACK ;
il n'est pas, par construction, le meilleur de tous les vols (un vol sans track n'y est pas) : l'option est une demande, pas le défaut.

`solve` rend le chemin (la liste des tronçons, comme Nav.search) ou None (pas applicable : pas de track dans le sens du vol, un vol hors Atlantique, rien de résolu) ; dans ce cas la recherche entière suit, comme sans l'option. Ce que la dernière résolution a fait est dans `nav.sections_info` : les sections (nom, de, à, distance, coût, états développés), la track retenue, les tracks essayées."""
import datetime
import time

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


def _bound():
    """La borne (secondes) de la recherche qui commence : le plafond d'une recherche, ramené à ce qui reste avant la borne de la phase."""
    rest = engine.SEARCH_CAP_S if engine.DEADLINE is None else engine.DEADLINE - time.perf_counter()
    return round(max(0.0, min(engine.SEARCH_CAP_S, rest)), 1)


def _step(nav, name, seconds, bound, hit, **more):
    """SOG-0354 L5 (3) : une étape de la réponse, `timing.sections` : { name, seconds, bound_s, hit } (hit : la borne a coupé l'étape)."""
    info = getattr(nav, 'sections_info', None)
    if info is not None:
        info.setdefault('steps', []).append(dict({'name': name, 'seconds': seconds, 'bound_s': bound, 'hit': bool(hit)}, **more))


def solve(nav, g, start, end):
    """Le meilleur chemin PAR UNE TRACK, en sections (voir l'en-tête) ; None si l'option n'est pas applicable ou si rien n'a pu être résolu. `sections_info['skeleton_s']` : le temps passé HORS des recherches (le choix des tracks, le squelette, la route libre à construire)."""
    began = time.perf_counter()
    path = _solve(nav, g, start, end)
    info = nav.sections_info
    if info is not None:
        info['skeleton_s'] = round(max(0.0, time.perf_counter() - began - sum(s.get('seconds') or 0 for s in info.get('steps', []))), 3)
    return path


def _solve(nav, g, start, end):
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
    hour = depart[0] if depart else None      # None : la demande ne donne pas d'heure : la validité horaire n'est pas vérifiée (le sens et le niveau, si)
    speed = flight.get('speed_kt') or 450
    eta_of = lambda nm_: depart[0] + datetime.timedelta(hours=nm_ / speed)

    def passage(o, to_entry):
        """SOG-0403 : (la distance depuis le départ au passage du 30° OUEST de la route, 'passage') : `to_entry` + la distance le long de la route de son entrée au 30°W ; (`to_entry`, 'entry') si la route ne franchit pas le 30°W."""
        along = 0.0
        for u, v, e in o['legs']:
            lu, lv = nav.nodes[u]['lon'] - nat_layer.MERIDIAN, nav.nodes[v]['lon'] - nat_layer.MERIDIAN
            if lu * lv <= 0 and lu != lv:
                return to_entry + along + e['nm'] * abs(lu) / abs(lu - lv), '30W'
            along += e['nm']
        return to_entry, 'entry'
    rejected = {tid: why for tid, m in meta.items() if (why := nat_layer.check(m, fl, east))}
    if hour is None:      # SOG-0394 : une route gardée d'un message précédent ne se prend pas sans heure de passage
        for tid, m in meta.items():
            if m.get('source') == 'kept' and tid not in rejected:
                rejected[tid] = nat_layer.unknown_hour(m)
    candidates = []
    chains = oriented_chains(nav.nodes, g, east)
    lab = lambda t: (meta.get(t) or {}).get('label') or t      # SOG-0394 : le nom dit d'une route (« R gardée du 17/11 » pour une route gardée d'un message précédent)
    when = {}      # SOG-0391 (a) : track écartée pour l'HEURE (ou le NIVEAU : l'heure n'y est pas jugée, seulement dite) → (heure du passage de son entrée, point d'entrée)
    for tid, (code, _text) in rejected.items():
        if code == 'level' and hour and chains.get(tid):
            o = min(chains[tid], key=lambda o: engine.nm(a, nav.nodes[o['entry']]))      # l'entrée la plus proche du départ
            d, pt = passage(o, engine.nm(a, nav.nodes[o['entry']]))
            when[tid] = (eta_of(d), nav.nodes[o['entry']]['id'], pt, hour)
    avoid = getattr(g, 'rad_avoid', frozenset())      # SOG-0354 L5 (4) défaut 4 : un point que la règle RAD fait éviter (repli) n'est ni l'entrée ni la sortie d'une route NAT
    for tid, options in chains.items():
        if tid in rejected:
            continue
        why = None
        options = [o for o in options if nav.nodes[o['entry']]['id'] not in avoid and nav.nodes[o['exit']]['id'] not in avoid]
        if not options and chains[tid]:
            rejected[tid] = ('rad', f"route NAT {lab(tid)} : son entrée ou sa sortie est un point que la règle RAD fait éviter ({', '.join(sorted(avoid))})")
            continue
        for o in options:
            pt = 'entry'
            eta = None
            if hour and tid in meta:
                d, pt = passage(o, engine.nm(a, nav.nodes[o['entry']]))      # SOG-0403 : l'heure du passage du 30° OUEST (la fenêtre d'un système de routes NAT s'y juge : NAT Doc 007 § 2.1.3), pas de l'entrée
                eta = eta_of(d)
            why = nat_layer.check(meta[tid], fl, east, eta) if eta else None      # l'heure estimée (grand cercle) : elle écarte avant toute recherche
            if not why:
                candidates.append((tid, o))
            elif why[0] == 'time':
                seen = (eta, nav.nodes[o['entry']]['id'], pt, hour)      # SOG-0391 (a) : l'heure du passage dont la track est écartée, dite en champs ; SOG-0403 : au 30°W, avec le point et la marge
        if why and not any(t == tid for t, _o in candidates):
            rejected[tid] = why
            if why[0] == 'time':
                when[tid] = seen
    for tid in meta:
        if tid not in rejected and tid not in {c[0] for c in candidates}:
            rejected[tid] = ('network', f"route NAT {lab(tid)} : ni son entrée ni sa sortie ne se relie au réseau haut à ce niveau")
    info = {'candidates': [], 'tried': [], 'chosen': None, 'sections': [], 'rejected': [], 'depart': ({'time': hour.strftime('%Y-%m-%dT%H:%MZ'), 'basis': depart[1]} if hour else {'time': None, 'basis': 'none', 'text': 'heure de départ non donnée : validité horaire des routes NAT non vérifiée'} if depart else None)}
    nav.sections_info = info
    # SOG-0354 L5 (4) défaut 2 : un autre NIVEAU peut-il changer la réponse ? Seulement si une track écartée POUR LE NIVEAU serait valable (sens, heure au passage de son entrée) à l'un des niveaux qu'elle propose ; sinon la reprise à un niveau plus bas refait la même recherche pour rien (plan.level_matters)
    recoverable = []
    for tid, (code, _text) in sorted(rejected.items()):
        mt = meta.get(tid) or {}
        offered = mt.get('levels_' + ('east' if east else 'west')) or []
        if code != 'level' or not offered:
            continue
        for o in chains.get(tid, []):
            if nat_layer.check(mt, offered[0], east, eta_of(engine.nm(a, nav.nodes[o['entry']])) if hour else None) is None:
                recoverable.append(tid)
                break
    info['level_retry'], info['level_tracks'] = bool(recoverable), recoverable

    nav.nat_rejected = frozenset(rejected)      # la recherche entière qui suit (si rien n'abouti ici) ne prend pas non plus une track écartée pour ce vol

    if meta:
        info['direction'] = 'east' if east else 'west'      # SOG-0391 (a) : le sens du vol tel que le moteur l'a pris pour écarter les routes de l'autre sens (absent quand aucune route NAT n'entre en jeu)
    info['fl'], info['fl_basis'] = fl, getattr(nav, 'fl_basis', 'request')      # SOG-0389 : le niveau PRIS et d'où il vient (`request` ou `default` : FL180 quand la demande n'en donne pas)

    def said():
        info['rejected'] = [dict({'track': tid, 'code': code, 'text': text}, **({'levels': [int(x) for x in ((meta.get(tid) or {}).get('levels_' + ('east' if east else 'west')) or [])]} if code == 'level' else {}), **(nat_layer.time_fields(meta[tid], *when[tid]) if code in ('time', 'level') and tid in when else {'from': (meta.get(tid) or {}).get('from'), 'to': (meta.get(tid) or {}).get('to')} if code in ('time', 'level') else {}), **({'letter': meta[tid]['letter'], 'source': 'kept'} if (meta.get(tid) or {}).get('source') == 'kept' else {}))      # SOG-0389 : une track écartée pour le NIVEAU dit les niveaux qu'elle offre dans ce sens ; SOG-0391 (a) : pour l'HEURE, l'heure du passage de son entrée et la fenêtre du message (des champs, plus seulement la phrase)
                            for tid, (code, text) in sorted(rejected.items())]
    ratio = min((e.get('_cost', e['nm']) / e['nm'] for es in g.values() for _v, e in es if e['nm'] > .00001), default=0)
    if not candidates:
        said()
        info['reason'] = 'Aucune route NAT valable pour ce vol.'
        return _free(nav, g, start, end, ratio, info)
    # SOG-0354 L5 (1 bis) : UNE seule recherche du départ vers TOUTES les entrées à la fois (au lieu d'une recherche par track : 5 recherches d'Europe de ~8 600 états pour EGLL → KDEN, une de ~13 000 pour la recherche entière) : le coût RÉEL de la section d'Europe de chaque entrée
    # (et sa bande d'altitude) est connu avant de choisir ; l'heure au passage de l'entrée est refaite avec la distance RÉELLE ; une entrée que la recherche n'atteint pas (réseau, budget) écarte sa track, dite
    europe = _europe(nav, g, start, sorted({o['entry'] for _t, o in candidates}), info)
    skeleton, lost, lost_when = [], {}, {}
    for tid, o in candidates:
        found = europe.get(o['entry'])
        pt = 'entry'
        eta = None
        if found and hour and tid in meta:
            d, pt = passage(o, sum(x['nm'] for _u, _v, x in found['path']))      # l'heure au passage du 30°W, avec la distance RÉELLE de la section d'Europe (SOG-0403)
            eta = eta_of(d)
        why = ('network', f"route NAT {lab(tid)} : son entrée n'est pas atteignable depuis le départ à ce niveau" + (' (budget de recherche atteint)' if info['europe'].get('truncated') else '')) if not found else \
            (nat_layer.check(meta[tid], fl, east, eta) if eta else None)
        if why:
            lost[tid] = why
            if why[0] == 'time':
                lost_when[tid] = (eta, nav.nodes[o['entry']]['id'], pt, hour)
            continue
        skeleton.append((found['cost'] + ratio * engine.nm(nav.nodes[o['exit']], b) + o['cost'], tid, o))
    for tid, why in lost.items():
        if not any(t == tid for _lb, t, _o in skeleton):
            rejected[tid] = why
            if tid in lost_when:
                when[tid] = lost_when[tid]
    skeleton.sort(key=lambda x: x[0])
    nav.nat_rejected = frozenset(rejected)
    if not skeleton:
        said()
        info['reason'] = 'Aucune route NAT valable pour ce vol.'
        return _free(nav, g, start, end, ratio, info)
    info['candidates'] = [{'track': tid, 'lower_bound': round(lb, 1)} for lb, tid, _o in skeleton]
    best = None
    for lb, tid, o in skeleton:
        if best is not None and lb >= best[0]:
            break      # le minorant des suivantes dépasse déjà le meilleur coût trouvé : leur recherche chère n'est pas faite
        resolved = _resolve(nav, g, start, end, tid, o, first=europe[o['entry']])
        info['tried'].append({'track': tid, 'cost': round(resolved[0], 1) if resolved else None})
        if resolved and (best is None or resolved[0] < best[0]):
            best = resolved + (tid,)
    said()
    if best is None:
        info['reason'] = 'Aucune chaîne par une route NAT valable n\'a abouti.'
        return _free(nav, g, start, end, ratio, info)
    cost, path, sections, tid = best
    info['chosen'], info['sections'], info['cost'] = tid, sections, round(cost, 1)
    _taken(nav, info, tid)
    _entry(nav, g, info)
    return path


def _europe(nav, g, start, entries, info, key='europe', need=None, track=None, max_states=None):
    """{ entrée: { path, cost, band, expanded, seconds } } : UNE recherche (`Nav.search(goals=…)`) du départ vers toutes les entrées ; `info[key]` dit ce qu'elle a fait (portes, atteintes, états, secondes, coupée par le budget) ; `europe_free` et `track='libre'` pour la route libre (L5 2 bis) ; `need` : s'arrêter dès que ce nombre d'entrées est atteint."""
    bound = _bound()
    found = nav.search(g, start, entries[0], (), False, False, None, gate=True, goals=entries, **({'need': need} if need else {}), **({'max_states': max_states} if max_states else {})) or {}
    ls = nav.last_search or {}
    for x in found.values():
        x['expanded'], x['seconds'] = ls.get('expanded'), ls.get('seconds')
    _step(nav, 'europe' if nav.nodes[start]['lon'] > WEST_LON else 'amérique', ls.get('seconds') or 0.0, bound, ls.get('truncated'), shared=True, goals=len(entries), reached=len(found), **({'track': track} if track else {}))
    info[key] = {'goals': len(entries), 'reached': len(found), 'expanded': ls.get('expanded'), 'seconds': ls.get('seconds'), 'truncated': bool(ls.get('truncated'))}
    return found


def _taken(nav, info, tid):
    """SOG-0394 : `sections.taken` = la route NAT PRISE : { track (la lettre), key, source ('last' : la dernière publication ; 'kept' : une route gardée d'un message précédent), from, to, issued, points: [{ id, lat, lon }] } : l'écran n'a pas à lire le second fichier."""
    m = ((getattr(nav, 'nat', None) or {}).get('meta') or {}).get(tid) or {}
    info['taken'] = {'track': m.get('letter') or tid, 'key': tid, 'source': 'kept' if m.get('source') == 'kept' else 'last', 'from': m.get('from'), 'to': m.get('to'), 'issued': m.get('issued'),
                     'points': list(((getattr(nav, 'nat', None) or {}).get('points') or {}).get(tid) or [])}


def _entry(nav, g, info):
    """SOG-0391 (a) : `sections.entry` dit l'heure estimée du passage de l'entrée de l'océan de la route PRISE (une route du jour ou la route libre créée) : { point, time (« 2026-11-17T13:32Z »), nm (la section d'extrémité, au sens de sa distance réelle), speed_kt } ; rien quand la demande ne donne pas d'heure de départ (alors `depart.time` est None) et la validité horaire n'est pas vérifiée."""
    depart, secs = getattr(nav, 'depart', None), info.get('sections') or []
    if not depart or depart[0] is None or not secs:      # sans heure de départ (`depart` = (None, 'none')) : pas d'heure d'entrée
        return
    speed = (getattr(g, 'flight', None) or {}).get('speed_kt') or 450      # la même vitesse que l'heure au passage des routes écartées
    first = secs[0]
    info['entry'] = {'point': first['to'], 'time': (depart[0] + datetime.timedelta(hours=first['nm'] / speed)).strftime('%Y-%m-%dT%H:%MZ'), 'nm': first['nm'], 'speed_kt': speed}


def _free(nav, g, start, end, ratio, info):
    """SOG-0354 L5 (2) : aucune route du jour ne convient : la route libre CRÉÉE (free_route), résolue par les mêmes sections ; `info['free']` dit ce qui a été fait (ou pourquoi rien : « aucun point d'entrée océanique connu »), `info['source']` vaut 'random' ; None si rien n'a abouti (la recherche entière suit)."""
    report = {}
    made, why = free_route.solve(nav, g, start, end, ratio, lambda g2, s, e, entry, exit_, legs, first: _resolve(nav, g2, s, e, None, {'entry': entry, 'exit': exit_, 'legs': legs}, True, first=first),
                                 lambda g2, s, entries, max_states=None: _europe(nav, g2, s, entries, info, 'europe_free', free_route.NEED, 'libre', max_states), report)
    if not made:
        info['free'] = {'source': 'random', 'label': free_route.LABEL, 'ok': False, 'reason': why, **report}
        info['reason'] = (info.get('reason') or '') + ' Route libre : ' + why + ' ; la recherche entière suit.'
        return None
    info['free'] = {'source': 'random', 'label': free_route.LABEL, 'ok': True, 'entry': made['entry'], 'exit': made['exit'], 'points': made['points'], 'nm': made['nm'], 'tried': made.get('tried'), 'stopped': made.get('stopped'), 'searches': made.get('searches'), 'states': made.get('states')}
    if made.get('stopped') in ('time', 'states'):      # d1 ter : la route libre a été COUPÉE (le temps de sécurité, ou le budget d'états) : la réponse le dit
        info['free']['cut'] = made['stopped']
        info['reason'] = (info.get('reason') or '') + (' Route libre coupée par le temps de sécurité' if made['stopped'] == 'time' else ' Route libre coupée par son budget d\'états') + ' : elle peut être plus longue que la meilleure.'
    info['source'], info['sections'], info['cost'] = 'random', made['sections'], round(made['cost'], 1)
    _entry(nav, g, info)
    info['reason'] = (info.get('reason') or '') + ' Route libre créée : ' + ' '.join(made['points']) + '.'
    return made['path']


def _sub(g, legs):
    """Le graphe réduit à la suite de tronçons d'une track (les attributs de g gardés : le vol, la zone FRA exigée) : la recherche d'une section « track » n'a qu'un chemin, celui qui est publié, mais passe par le même code que les autres (mêmes bandes d'altitude, mêmes coûts)."""
    sub = engine.RoutingGraph()
    sub.__dict__.update(g.__dict__)
    for u, v, e in legs:
        sub.setdefault(u, []).append((v, e))
    return sub


def _resolve(nav, g, start, end, tid, o, created=False, first=None):
    """(coût, chemin, sections) de la chaîne départ → entrée → track → sortie → arrivée, ou None (une section n'a pas abouti, ou le budget est atteint)."""
    spans = ((None, g, start, o['entry'], None, True), ('route libre' if created else 'track ' + tid, _sub(g, o['legs']), o['entry'], o['exit'], 'band', True), (None, g, o['exit'], end, 'band', False))
    path, total, band, sections = [], 0.0, None, []
    for number, (name, graph, s, e, use_band, is_gate) in enumerate(spans):
        if name is None:      # une section d'extrémité porte le nom de son côté de l'océan (le vol peut aller dans les deux sens)
            name = 'europe' if nav.nodes[s if s == start else e]['lon'] > WEST_LON else 'amérique'
        if number == 0 and first:      # la section d'Europe de cette entrée vient de la recherche vers toutes les entrées (_europe)
            part, ls = first['path'], {'band': first['band'], 'cost': first['cost'], 'expanded': first.get('expanded'), 'seconds': first.get('seconds'), 'shared': True}
        else:
            bound = _bound()
            try:
                part = nav.search(graph, s, e, (), False, False, band if use_band else None, gate=is_gate)
            except ValueError:
                _step(nav, name, (nav.last_search or {}).get('seconds') or 0.0, bound, True, track=tid or 'libre')
                return None      # le budget de cette recherche est atteint : cette chaîne n'est pas prouvée
            ls = nav.last_search
            _step(nav, name, ls.get('seconds') or 0.0, bound, False, track=tid or 'libre')
            if part is None:
                return None
        band = ls.get('band')
        total += ls['cost']
        path.extend(part)
        sections.append({'name': name, 'from': nav.nodes[s]['id'], 'to': nav.nodes[e]['id'], 'nm': round(sum(x['nm'] for _u, _v, x in part), 1), 'cost': round(ls['cost'], 1), 'expanded': ls.get('expanded'), 'seconds': ls.get('seconds'), 'shared': bool(ls.get('shared')),
                         'proof': 'created' if created and name == 'route libre' else 'published' if name.startswith('track') else 'computed'})
    return total, path, sections
