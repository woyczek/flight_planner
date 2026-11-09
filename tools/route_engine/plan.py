"""Le plan d'une demande de route : le calcul, le contrôle et les alternatives (jusqu'à trois), ce que le serveur de RouteSim 2 (server.py, plan()) faisait derrière /api/plan (SOG-0081).

PORT de `plan()` de RouteSim 2 : la logique est celle du serveur (l'utilisateur la fait évoluer dans E:/DEFA/rad : le diff s'applique ici tel quel) ; ce qui change : pas de serveur, une demande FERMÉE (`check_request` : champs
connus, types et bornes) au lieu d'un dictionnaire libre, un résultat BORNÉ (`bound_result`), les chemins des données donnés par l'appelant (RAD_FILE, FRA_FILE, racine des données).

Entrée (`compute(request, root, rad_file, fra_file)`) : voir check_request. Sortie : { primary, alternatives, alternative_message, alternative_failures, automatic_alternatives, alternative_attempts, input_route, via, dep, arr } ;
primary et chaque alternative sont les résultats de engine.assess : { ok, status, route, fl, date, distance_nm, issues [{level, text}], legs [{start, end, via, nm, lower, upper, altitude_*_ft, speed_kt, alerts…}], gaps, rad, profile, … }.
"""
import datetime as dt
import re

from . import engine, fra

FIELDS = {
    'dep': str, 'arr': str, 'route': str, 'via': (list, str), 'fl': int, 'date': str, 'mode': str, 'radius': (int, float), 'dep_runway': str, 'arr_runway': str,
    'speed_kt': (int, float), 'terminal_speed_kt': (int, float), 'climb_fpm': (int, float), 'descent_fpm': (int, float),
    'allow_levels': bool, 'use_procedures': bool, 'alternatives': bool, 'alternative_levels': (list, str), 'enable_fra': bool, 'level_strategy': str,
}
MAX_ROUTE = 600
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
    if out.get('level_strategy', 'natural') not in ('natural', 'adapt'):
        raise ValueError('level_strategy : natural ou adapt')
    if isinstance(out.get('via'), list) and (len(out['via']) > 8 or any(not isinstance(x, str) for x in out['via'])):
        raise ValueError('via : jusqu’à 8 identifiants de points')
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


def context(request, root):
    """Les données de navigation et le RAD de la date : relus à CHAQUE demande (la base, les procédures et les classeurs changent sous le lanceur ; le serveur de RouteSim 2 gardait trois contextes, ici l'économie
    ne vaut pas une donnée périmée : ~2 s)."""
    date = dt.datetime.fromisoformat(str(request.get('date', '2026-11-09T12:00')).replace('Z', '+00:00'))
    if date.tzinfo:
        date = date.astimezone(dt.timezone.utc)
    date = date.date()
    return engine.Nav(root, date), engine.Rad(date)


def plan(request, root):
    """Le plan, tel que server.plan() de RouteSim 2 le fait (voir l'en-tête du module)."""
    request = dict(request, root=root)
    request.setdefault('date', '2026-11-09T12:00')
    nav, rad = context(request, root)
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
        request['via'] = [w for w in words if w != 'DCT' and w not in airways and w not in procedure_names]
    if request.get('mode', 'calculate') == 'calculate' and request.get('allow_levels', True):
        request.setdefault('level_strategy', 'adapt')
    try:
        primary = engine.assess(request, nav, rad)
    except ValueError as e:
        primary = dict(ok=False, status='CALCUL IMPOSSIBLE', error=str(e), route=request.get('route', ''), legs=[], issues=[])
    rejected = not primary['ok'] or any(i['level'] == 'ERREUR' for i in primary['issues'])
    alternatives = []
    failures = []
    tested = []
    if rejected or request.get('alternatives'):
        try:
            dep = str(request['dep']).strip().upper()
            arr = str(request['arr']).strip().upper()
            fl = int(request['fl'])
            radius = float(request.get('radius', 40))
            blocks = rad.blocks(dep, arr, fl)
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

            def consider(route, level, strategy):
                r = engine.assess(dict(request, mode='validate', route=route, fl=level, level_strategy=strategy), nav, rad)
                errs = [i['text'] for i in r['issues'] if i['level'] == 'ERREUR']
                tested.append(dict(fl=level, strategy=strategy, route=route, errors=errs))
                if errs:
                    return
                sig = signature(r)
                if sig in seen:
                    return
                seen.add(sig)
                r['generated'] = True
                r['alternative_kind'] = 'Profil avec paliers adaptés' if strategy == 'adapt' else 'Palier de croisière FL' + str(level)
                r['report'] = engine.report(r)
                alternatives.append(r)
            if allow_levels and explicit_levels:
                for level in levels:
                    if len(alternatives) >= 3:
                        break
                    try:
                        route, _ = nav.generate(dep, arr, level, radius, rad.blocks(dep, arr, level), options, allow_steps=True, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                        consider(route, level, 'adapt')
                    except ValueError as e:
                        failures.append(f'FL{level}: ' + str(e))
            if len(alternatives) < 3 and allow_levels and primary.get('ok'):
                consider(primary['route'], fl, 'adapt')
            # A stepped route can connect airway bands even when the target-FL graph is disconnected.
            if allow_levels and len(alternatives) < 3:
                try:
                    route, _ = nav.generate(dep, arr, fl, radius, blocks, options, True, mandatory, nav_time(request), request.get('enable_fra', True), request)
                    consider(route, fl, 'adapt')
                except ValueError as e:
                    failures.append(str(e))
            if len(alternatives) < 3:
                try:
                    routes = nav.alternate_routes(dep, arr, fl, radius, blocks, count=4, profile_options=options, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                    for route in routes:
                        consider(route, fl, 'natural')
                        if len(alternatives) == 3:
                            break
                except ValueError as e:
                    failures.append(str(e))
            if allow_levels:
                for level in levels:
                    if len(alternatives) >= 3:
                        break
                    try:
                        route, _ = nav.generate(dep, arr, level, radius, rad.blocks(dep, arr, level), options, allow_steps=True, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                        consider(route, level, 'adapt')
                    except ValueError as e:
                        failures.append(f'FL{level}: ' + str(e))
        except ValueError as e:
            failures.append(str(e))
    wanted = rejected or bool(request.get('alternatives'))
    if not alternatives:
        failures.extend(e for t in tested for e in t['errors'])
    message = (f'{len(alternatives)} alternative(s) sans incompatibilité détectée. Le niveau et les paliers de chaque proposition sont affichés.'
               if alternatives else 'Aucune alternative trouvée. Consulter les niveaux essayés et leurs motifs d’échec.') if wanted else ''
    return dict(primary=primary, alternatives=alternatives, alternative_message=message, alternative_failures=list(dict.fromkeys(failures)),
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
    return out


def compute(request, data, rad_file, fra_file):
    """Le plan d'une demande fermée sur le dossier des données `data` (sia/base, proc) et les fichiers compilés RAD et FRA. ValueError : demande refusée ou calcul impossible (le message est dit)."""
    request = check_request(request)
    engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE = data, rad_file, fra_file
    try:
        return bound_result(plan(request, data))
    finally:
        engine.DATA_DIR = engine.RAD_FILE = fra.FRA_FILE = None
