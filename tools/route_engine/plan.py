"""Le plan d'une demande de route : le calcul, le contrôle et les alternatives (jusqu'à trois), ce que le serveur de RouteSim 2 (server.py, plan()) faisait derrière /api/plan (SOG-0081).

PORT de `plan()` de RouteSim 2 : la logique est celle du serveur (l'utilisateur la fait évoluer dans E:/DEFA/rad : le diff s'applique ici tel quel) ; ce qui change : pas de serveur, une demande FERMÉE (`check_request` : champs
connus, types et bornes) au lieu d'un dictionnaire libre, un résultat BORNÉ (`bound_result`), les chemins des données donnés par l'appelant (RAD_FILE, FRA_FILE, racine des données).

Entrée (`compute(request, root, rad_file, fra_file)`) : voir check_request. Sortie : { primary, alternatives, alternative_message, alternative_failures, automatic_alternatives, alternative_attempts, input_route, via, dep, arr } ;
primary et chaque alternative sont les résultats de engine.assess : { ok, status, route, fl, date, distance_nm, issues [{level, text}], legs [{start, end, via, nm, lower, upper, altitude_*_ft, speed_kt, alerts…}], gaps, rad, profile, … }.
"""
import collections
import datetime as dt
import hashlib
import os
import re
import time

import json
import threading

from . import engine, fra, layered, nat_layer, planning, recovery

FIELDS = {
    'proposals': bool, 'dep': str, 'arr': str, 'route': str, 'via': (list, str), 'fl': int, 'date': str, 'mode': str, 'radius': (int, float), 'dep_runway': str, 'arr_runway': str,
    'speed_kt': (int, float), 'terminal_speed_kt': (int, float), 'climb_fpm': (int, float), 'descent_fpm': (int, float),
    'allow_levels': bool, 'use_procedures': bool, 'alternatives': bool, 'alternatives_budget': (int, float), 'alternative_levels': (list, str), 'enable_fra': bool, 'level_strategy': str,
    'objective': str, 'traffic': str, 'require_fra': bool, 'unable_rnav': bool, 'fra_preference': (int, float), 'aircraft': str, 'fuel_climb': (int, float), 'fuel_cruise': (int, float), 'fuel_descent': (int, float),     # RouteSim 4 (planning.py)
}
MAX_ROUTE = 600
ALT_BUDGET_S = 8.0                  # SOG-0296 : la recherche des ALTERNATIVES (après la route de tête) tient le poste au plus ce temps (facultatif, `alternatives_budget`, 1 à 25 s) : 25 s pour ne rien trouver de plus n'a pas à le tenir
MAX_ALTERNATIVES = 3
MAX_LEGS = 800
MAX_ISSUES = 300
MAX_TEXT = 4000
MAX_RAD = 100
MAX_REPORT = 120000


def check_request(request):
    """La demande, fermée : { champs connus → valeurs de leur type } ou ValueError. Rien d'autre n'est accepté (une clé inconnue est refusée : un champ de plus est un changement du contrat)."""
    if not isinstance(request, dict):
        raise ValueError('demande : un objet')
    unknown = sorted(set(request) - set(FIELDS))
    if unknown:
        raise ValueError('champ inconnu : ' + unknown[0])
    out = {}
    for k, v in request.items():
        t = FIELDS[k]
        if isinstance(v, bool) and t is not bool:
            raise ValueError(f'{k} : type invalide')
        if not isinstance(v, t):
            raise ValueError(f'{k} : type invalide')
        out[k] = v
    for k in ('dep', 'arr', 'dep_runway', 'arr_runway'):
        if k in out and out[k] and not re.fullmatch(r'[A-Za-z0-9]{1,4}', out[k]):
            raise ValueError(f'{k} : code invalide')
    if len(out.get('route', '')) > MAX_ROUTE:
        raise ValueError('route : trop longue')
    if out.get('mode', 'calculate') not in ('calculate', 'validate'):
        raise ValueError('mode : calculate ou validate')
    if out.get('objective', 'distance') not in ('distance', 'fastest', 'economical'):
        raise ValueError('objective : distance, fastest ou economical')
    if str(out.get('traffic', 'IFR')).upper() != 'IFR':
        raise ValueError('traffic : IFR seulement (le calcul VFR de RouteSim 4, vfr.py, n’est pas porté)')
    if len(out.get('aircraft', '')) > 20:
        raise ValueError('aircraft : 20 signes au plus')
    if out.get('level_strategy', 'natural') not in ('natural', 'adapt'):
        raise ValueError('level_strategy : natural ou adapt')
    if isinstance(out.get('via'), list) and (len(out['via']) > 8 or any(not isinstance(x, str) for x in out['via'])):
        raise ValueError('via : jusqu’à 8 identifiants de points')
    if 'alternatives_budget' in out and not (isinstance(out['alternatives_budget'], (int, float)) and 1 <= out['alternatives_budget'] <= 25):
        raise ValueError('alternatives_budget : de 1 à 25 secondes')
    if isinstance(out.get('alternative_levels'), list) and (len(out['alternative_levels']) > 12 or any(isinstance(x, bool) or not isinstance(x, int) for x in out['alternative_levels'])):
        raise ValueError('alternative_levels : jusqu’à 12 niveaux')
    if 'date' in out:
        try:
            dt.datetime.fromisoformat(out['date'].replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('date : ISO 8601') from None
    return out


def nav_time(request):
    value = dt.datetime.fromisoformat(request['date'].replace('Z', '+00:00'))
    return value.astimezone(dt.timezone.utc).replace(tzinfo=None) if value.tzinfo else value


# SOG-0296 : le contexte chargé (la base, le moteur initialisé, le RAD) est GARDÉ d'un calcul à l'autre : relire 507 fichiers JSON et refaire l'init prenait ~1,7 s à chaque demande. Ce qui le garde valable : l'EMPREINTE
# des fichiers qu'il a lus (chemin, date de modification, taille : sia/base, proc, la couche NAT, les deux classeurs) ; un fichier qui change, s'ajoute ou disparaît (une base reconstruite, une procédure relue, un
# classeur importé, un nouveau message NAT) donne une autre empreinte : le contexte est refait. Bornes : MAX_CONTEXTS contextes (un par date de vol et par jeu de fichiers, les moins récents partent), IDLE_S secondes
# sans usage (le plus gros morceau de mémoire du lanceur ne reste pas des jours). Sûr parce que les calculs sont en série (SOLVER_LOCK) ; les caches de graphe du moteur (un seul de chaque, bornés par lui) restent
# d'un calcul à l'autre : leur clé porte tout ce dont le graphe dépend.
MAX_CONTEXTS = 2
IDLE_S = 3600
MAX_FILES = 200_000                    # fichiers comptés au plus dans l'empreinte (un dossier de données hors norme ne la fait pas durer)
_CONTEXTS = collections.OrderedDict()   # (racine, données, RAD, FRA, date) → { sig, nav, rad, at }
CONTEXT_STATS = {'built': 0, 'reused': 0}      # pour le diagnostic et les essais


def _walk(path, out, skip=()):
    """Les fichiers .json / .gz sous `path` : (chemin, date de modification en ns, taille) ajoutés à `out` ; les dossiers de `skip` ne sont pas parcourus ; aucun lien suivi ; borné."""
    try:
        it = os.scandir(path)
    except OSError:
        return
    with it:
        for e in it:
            if len(out) >= MAX_FILES:
                return
            try:
                if e.is_dir(follow_symlinks=False):
                    if e.name not in skip:
                        _walk(e.path, out)
                elif e.name.endswith(('.json', '.gz')):
                    st = e.stat()
                    out.append((e.path, st.st_mtime_ns, st.st_size))
            except OSError:
                continue


def fingerprint():
    """L'empreinte des fichiers que le contexte lit : sia/base, proc (sans le sol), sia/zones/nat, RAD et FRA ; une chaîne courte."""
    items = []
    data = engine.DATA_DIR
    if data:
        for sub, skip in ((('sia', 'base'), ()), (('proc',), ('ground',)), (('sia', 'zones', 'nat'), ())):
            _walk(os.path.join(str(data), *sub), items, skip)
    for f in (engine.RAD_FILE, fra.FRA_FILE):
        try:
            if f:
                st = os.stat(f)
                items.append((str(f), st.st_mtime_ns, st.st_size))
        except OSError:
            items.append((str(f), 0, -1))
    return hashlib.sha1(repr(sorted(items)).encode('utf-8', 'replace')).hexdigest()


def drop_contexts():
    """Vide les contextes gardés (le lanceur peut l'appeler après une reconstruction : l'empreinte le ferait de toute façon au calcul suivant)."""
    _CONTEXTS.clear()


def context(request, root):
    """Les données de navigation et le RAD de la date, GARDÉS d'un calcul à l'autre tant que l'empreinte de leurs fichiers ne change pas (voir plus haut, SOG-0296) ; refaits sinon."""
    date = dt.datetime.fromisoformat(str(request.get('date', '2026-11-09T12:00')).replace('Z', '+00:00'))
    if date.tzinfo:
        date = date.astimezone(dt.timezone.utc)
    date = date.date()
    now = time.monotonic()
    for k in [k for k, v in _CONTEXTS.items() if now - v['at'] > IDLE_S]:
        del _CONTEXTS[k]
    key = (str(root), str(engine.DATA_DIR), str(engine.RAD_FILE), str(fra.FRA_FILE), date)
    sig = fingerprint()
    hit = _CONTEXTS.get(key)
    if hit and hit['sig'] == sig:
        hit['at'] = now
        _CONTEXTS.move_to_end(key)
        CONTEXT_STATS['reused'] += 1
        return hit['nav'], hit['rad']
    _CONTEXTS.pop(key, None)          # l'ancien (empreinte changée) part avant que le neuf soit construit : jamais deux Nav pour la même clé en mémoire
    nav, rad = engine.Nav(root, date), engine.Rad(date)
    CONTEXT_STATS['built'] += 1
    _CONTEXTS[key] = {'sig': sig, 'nav': nav, 'rad': rad, 'at': now}
    while len(_CONTEXTS) > MAX_CONTEXTS:
        _CONTEXTS.popitem(last=False)
    return nav, rad


class SearchBudget(Exception):
    pass


def plan(request, root):
    """Le plan, tel que server.plan() de RouteSim 4 le fait (voir l'en-tête du module). Le mode VFR (vfr.py) n'est pas porté : la demande IFR seule est acceptée (check_request)."""
    import time
    started = time.perf_counter()

    limit = {'until': started + 25, 'what': 'Budget global de recherche atteint (25 s)'}

    def check_budget():
        if time.perf_counter() > limit['until']:
            raise SearchBudget(limit['what'] + '. Les propositions déjà contrôlées sont conservées ; la recherche n’est pas exhaustive.')
    request = dict(request, root=root)
    request.setdefault('date', '2026-11-09T12:00')
    nav, rad = context(request, root)      # RouteSim libère les caches du graphe à la fin de chaque plan (release_graph_caches) : ici le contexte est refait à chaque demande et disparaît avec elle
    entered = str(request.get('route', '')).strip().upper()
    words = entered.split()
    airways = {e['route'] for e in nav.edges}
    if words and re.fullmatch(r'[NK]\d{4}F\d{3}', words[0]):
        words = words[1:]
    if len(words) >= 2 and words[0] in nav.ads and words[-1] in nav.ads:
        request.update(dep=words[0], arr=words[-1])
        words = words[1:-1]
    elif words:
        if words[0] == request.get('dep', '').upper():
            words = words[1:]
        if words and words[-1] == request.get('arr', '').upper():
            words = words[:-1]
    if entered:
        for ad in [request.get('dep'), request.get('arr')]:
            if ad in nav.ads:
                nav.procedures.prepare(ad)
        procedure_names = {p['token'] for p in nav.procedures.items}
        request['via'] = [w for w in words if not engine.route_connector(w, nav, airways, procedure_names)]
        if request.get('mode', 'calculate') == 'validate':
            request['via'] = []        # SOG-0081 : le contrôle d'une route saisie n'impose aucun passage (ses points sont les extrémités de ses airways ; plus de 8 d'entre eux refusaient toute route longue)
    if request.get('mode', 'calculate') == 'calculate' and request.get('allow_levels', True):
        request.setdefault('level_strategy', 'adapt')
    request = planning.normalize(request, root)
    request['_deadline'] = started + 25
    if request.get('objective') == 'economical':
        request['alternatives'] = True
    try:
        primary = engine.assess(request, nav, rad)
    except ValueError as e:
        hint = nat_layer.hint(nav, str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper()) if request.get('mode', 'calculate') == 'calculate' else ''      # SOG-0263 : traversée sans track dans le sens du vol
        primary = dict(ok=False, status='CALCUL IMPOSSIBLE', error=str(e) + (' ' + hint if hint else ''), route=request.get('route', ''), legs=[], issues=[])
    rad_retries = []
    # A route-dependent RAD condition can only be decided after its SID, route and STAR are known. Retry with the implicated procedure / links excluded.
    if request.get('mode', 'calculate') == 'calculate':
        avoids = []
        for attempt in range(3):
            findings = primary.get('rad_summary', {}).get('findings', [])
            extra = primary.get('rad_summary', {}).get('search_exclusions', [])
            if not findings or not extra:
                break
            avoids = list({json.dumps(x, sort_keys=True): x for x in [*avoids, *extra]}.values())
            try:
                check_budget()
                candidate = engine.assess(dict(request, _rad_avoid=avoids), nav, rad)
                rad_retries.append(dict(excluded=avoids, route=candidate['route'], errors=[i['text'] for i in candidate['issues'] if i['level'] == 'ERREUR']))
                primary = candidate
                request['_rad_avoid'] = avoids
            except (ValueError, SearchBudget) as e:
                rad_retries.append(dict(excluded=avoids, error=str(e)))
                break
    rejected = not primary['ok'] or bool(primary.get('data_gaps')) or any(i['level'] == 'ERREUR' for i in primary['issues'])
    coverage_gaps = recovery.terminal_gaps(request, nav) if rejected else []
    alternatives = []
    failures = list(coverage_gaps)
    tested = []
    # SOG-0161 : une route de tête refusée parce que sa RECHERCHE a atteint son budget (« Budget de recherche atteint ») : chercher d'autres niveaux refait la même recherche (6 s chacune : EIDW → KBOS rendait une proposition en 35 s) :
    # les propositions de repli viennent tout de suite
    budget_hit = rejected and 'Budget de recherche atteint' in str(primary.get('error') or '')
    if budget_hit and not coverage_gaps:
        failures.append('Alternatives non cherchées : la recherche de la route de tête a atteint son budget (elles en auraient épuisé un autre à chaque niveau).')
    if (rejected or request.get('alternatives')) and not coverage_gaps and not budget_hit:
        if not rejected:          # SOG-0296 : la route de tête est bonne, les alternatives sont un PLUS : leur recherche a son propre budget (8 s, `alternatives_budget`) ; un plan refusé garde les 25 s (ses propositions sont son recours)
            secs = float(request.get('alternatives_budget', ALT_BUDGET_S))
            limit['until'] = min(limit['until'], time.perf_counter() + secs)
            limit['what'] = f'Budget de recherche des alternatives atteint ({secs:g} s)'
            request['_deadline'] = limit['until']
        try:
            dep = str(request['dep']).strip().upper()
            arr = str(request['arr']).strip().upper()
            fl = int(request['fl'])
            radius = float(request.get('radius', 40))
            blocks = rad.blocks(dep, arr, None)
            if not 1 <= radius <= 100 or not 10 <= fl <= 660:
                raise ValueError('Niveau ou rayon hors limites.')
            options = engine.profile_options(request)
            mandatory = engine.via_points(request)
            allow_levels = request.get('allow_levels', True)
            levels = request.get('alternative_levels', [])
            explicit_levels = bool(levels)
            if isinstance(levels, str):
                levels = [int(x.strip().upper().replace('FL', '')) for x in levels.split(',') if x.strip()]
            if any(not 10 <= int(x) <= 660 for x in levels):
                raise ValueError('Paliers alternatifs : FL010 à FL660.')
            levels = list(dict.fromkeys(map(int, levels))) if levels else list(range(fl - 20, max(50, fl - 200) - 1, -20))

            def signature(r):
                return (r.get('route'), tuple((round(l.get('altitude_start_ft', 0) / 100), round(l.get('altitude_end_ft', 0) / 100), round(l.get('altitude_min_ft', 0) / 100), round(l.get('altitude_max_ft', 0) / 100)) for l in r.get('legs', [])))
            seen = {signature(primary)} if primary.get('ok') else set()

            def consider(route, level, strategy, path=None, conditions=None):
                check_budget()
                r = engine.assess(dict(conditions or request, mode='validate', route=route, fl=level, level_strategy=strategy), nav, rad, _path=path)
                errs = [i['text'] for i in r['issues'] if i['level'] == 'ERREUR']
                tested.append(dict(fl=level, strategy=strategy, route=route, errors=errs))
                if errs or r.get('data_gaps'):
                    return
                sig = signature(r)
                if sig in seen:
                    return
                seen.add(sig)
                r['generated'] = True
                r['alternative_kind'] = ('FRA · ' + ', '.join(r['fra_stats']['areas'])) if r['fra_stats']['segments'] else 'Profil avec paliers adaptés' if strategy == 'adapt' else 'Palier de croisière FL' + str(level)
                r['report'] = engine.report(r)
                alternatives.append(r)
            # Reserve a genuinely FRA-constrained candidate before filling the list with level variants.
            if request.get('enable_fra', True) and not request.get('unable_rnav') and (rejected or not primary.get('fra_stats', {}).get('segments')):
                forced = dict(request, require_fra=True, enable_fra=True)
                try:
                    check_budget()
                    route, path = nav.generate(dep, arr, fl, radius, blocks, options, True, mandatory, nav_time(request), True, forced)
                    consider(route, fl, 'adapt', path, forced)
                except ValueError as e:
                    failures.append('Recherche FRA imposée : ' + str(e))
            if allow_levels and explicit_levels:
                for level in levels:
                    if len(alternatives) >= 3:
                        break
                    try:
                        check_budget()
                        route, path = nav.generate(dep, arr, level, radius, rad.blocks(dep, arr, None), options, allow_steps=True, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                        consider(route, level, 'adapt', path)
                    except ValueError as e:
                        failures.append(f'FL{level}: ' + str(e))
            if len(alternatives) < 3 and allow_levels and primary.get('ok') and (rejected or request.get('mode') == 'validate'):
                consider(primary['route'], fl, 'adapt')
            # A stepped route can connect airway bands even when the target-FL graph is disconnected.
            if allow_levels and len(alternatives) < 3 and (rejected or request.get('mode') == 'validate'):
                try:
                    check_budget()
                    route, path = nav.generate(dep, arr, fl, radius, blocks, options, True, mandatory, nav_time(request), request.get('enable_fra', True), request)
                    consider(route, fl, 'adapt', path)
                except ValueError as e:
                    failures.append(str(e))
            if len(alternatives) < 3:
                try:
                    routes = nav.alternate_routes(dep, arr, fl, radius, blocks, count=4, profile_options=options, allow_steps=bool(allow_levels), via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request, return_paths=True)
                    for route, path in routes:
                        consider(route, fl, 'adapt' if allow_levels else 'natural', path)
                        if len(alternatives) == 3:
                            break
                except ValueError as e:
                    failures.append(str(e))
            if allow_levels:
                for level in levels:
                    if len(alternatives) >= 3:
                        break
                    try:
                        check_budget()
                        route, path = nav.generate(dep, arr, level, radius, rad.blocks(dep, arr, None), options, allow_steps=True, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                        consider(route, level, 'adapt', path)
                    except ValueError as e:
                        failures.append(f'FL{level}: ' + str(e))
        except (ValueError, SearchBudget) as e:
            failures.append(str(e))
    wanted = rejected or bool(request.get('alternatives'))
    if not alternatives:
        failures.extend(e for t in tested for e in t['errors'])
    alternatives.sort(key=lambda r: r.get('objective_score', r['distance_nm']))
    if request.get('mode', 'calculate') == 'calculate' and primary.get('ok') and not primary.get('data_gaps') and not any(i['level'] == 'ERREUR' for i in primary['issues']) and request.get('objective') in ['fastest', 'economical']:
        pool = [primary, *alternatives]
        pool.sort(key=lambda r: r.get('objective_score', r['distance_nm']))
        primary = pool[0]
        alternatives = pool[1:4]
    message = (f'{len(alternatives)} alternative(s) sans incompatibilité détectée. Le niveau et les paliers de chaque proposition sont affichés.'
               if alternatives else 'Aucune alternative trouvée. Consulter les niveaux essayés et leurs motifs d’échec.') if wanted else ''
    repli = None
    if rejected and not alternatives:
        nav._routing_cache.clear()
        try:
            repli = recovery.propose(request, nav, rad)
        except (ValueError, KeyError) as e:
            repli = dict(proposals=[], pieces=[], note='Repli : ' + str(e))
        if repli.get('proposals'):
            message = 'Calcul réseau incomplet : ' + str(len(repli['proposals'])) + ' propositions de repli, dont ' + str(repli.get('fra_pieces', 0)) + ' portion(s) FRA. Les raccords DCT restent non validés.'
    for r in [primary, *alternatives, *((repli or {}).get('proposals') or [])]:        # SOG-0161 : chaque tronçon classé (contrôlé / incomplet / repli / erreur), par couche, et le pourcentage de la distance contrôlée
        layered.annotate(r, rad)
    return dict(primary=primary, alternatives=alternatives, recovery=repli, coverage_gaps=coverage_gaps, rad_search_attempts=rad_retries, alternative_message=message, alternative_failures=list(dict.fromkeys(failures)),
                search=dict(algorithm='A* avec labels altitude ; variantes par pénalisation des liens', last=nav.last_search if hasattr(nav, 'last_search') else None, total_seconds=round(time.perf_counter() - started, 3)),
                automatic_alternatives=rejected, alternative_attempts=tested, input_route=request.get('route', ''), via=request.get('via', []), dep=request.get('dep'), arr=request.get('arr'))


def _cut(text):
    return text[:MAX_TEXT] if isinstance(text, str) else text


def _bound_one(r):
    """Un résultat de assess, borné : segments, remarques et textes à leur plafond (`truncated` le dit)."""
    r = dict(r)
    cut = []
    if len(r.get('legs', [])) > MAX_LEGS:
        r['legs'] = r['legs'][:MAX_LEGS]
        cut.append('legs')
    if len(r.get('issues', [])) > MAX_ISSUES:
        r['issues'] = r['issues'][:MAX_ISSUES]
        cut.append('issues')
    if len(r.get('rad', [])) > MAX_RAD:                      # les mentions RAD à examiner : les premières, le total dit (`rad_count`), sans les en-têtes répétés de chaque mention
        r['rad_count'] = len(r['rad'])
        r['rad'] = r['rad'][:MAX_RAD]
        cut.append('rad')
    r['rad'] = [{k: v for k, v in m.items() if k != 'headers'} for m in r.get('rad', [])]
    if isinstance(r.get('report'), str):
        r['report'] = r['report'][:MAX_REPORT]
    for k in ('route', 'status', 'error', 'limitation'):
        if k in r:
            r[k] = _cut(r[k])
    if cut:
        r['truncated'] = cut
    return r


def bound_result(res):
    """Le plan, borné : trois alternatives au plus, segments, remarques et essais plafonnés."""
    out = dict(res)
    out['primary'] = _bound_one(res['primary'])
    out['alternatives'] = [_bound_one(a) for a in res['alternatives'][:MAX_ALTERNATIVES]]
    out['alternative_failures'] = [_cut(x) for x in res['alternative_failures'][:40]]
    out['alternative_attempts'] = [dict(a, errors=[_cut(e) for e in a['errors'][:10]]) for a in res['alternative_attempts'][:40]]
    out['coverage_gaps'] = [_cut(x) for x in (res.get('coverage_gaps') or [])[:20]]
    out['rad_search_attempts'] = [{k: (v[:20] if isinstance(v, list) else _cut(v)) for k, v in x.items()} for x in (res.get('rad_search_attempts') or [])[:3]]
    if isinstance(res.get('recovery'), dict):          # le repli (recovery.py) : trois propositions au plus, chacune bornée comme un résultat
        rec = dict(res['recovery'])
        rec['proposals'] = [_bound_one(x) for x in (rec.get('proposals') or [])[:MAX_ALTERNATIVES]]
        rec['pieces'] = (rec.get('pieces') or [])[:60]
        rec['note'] = _cut(rec.get('note'))
        out['recovery'] = rec
    return out


SOLVER_LOCK = threading.RLock()        # un seul calcul à la fois (RouteSim 4 : SOLVER_LOCK)


def compute(request, data, rad_file, fra_file):
    """Le plan d'une demande fermée sur le dossier des données `data` (sia/base, proc) et les fichiers compilés RAD et FRA. ValueError : demande refusée ou calcul impossible (le message est dit)."""
    request = check_request(request)
    engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE = data, rad_file, fra_file
    try:
        with SOLVER_LOCK:
            return bound_result(plan(request, data))
    finally:
        engine.DATA_DIR = engine.RAD_FILE = fra.FRA_FILE = None
