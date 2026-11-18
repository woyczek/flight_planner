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

from . import engine, fra, fra_floor, layered, nat_layer, planning, recovery

FIELDS = {
    'proposals': bool, 'sections': bool, 'fl_basis': str, 'dep': str, 'arr': str, 'route': str, 'via': (list, str), 'fl': int, 'date': str, 'mode': str, 'radius': (int, float), 'dep_runway': str, 'arr_runway': str,
    'speed_kt': (int, float), 'terminal_speed_kt': (int, float), 'climb_fpm': (int, float), 'descent_fpm': (int, float),
    'allow_levels': bool, 'use_procedures': bool, 'alternatives': bool, 'alternatives_budget': (int, float), 'alternative_levels': (list, str), 'enable_fra': bool, 'level_strategy': str,
    'objective': str, 'traffic': str, 'require_fra': bool, 'unable_rnav': bool, 'fra_preference': (int, float), 'aircraft': str, 'fuel_climb': (int, float), 'fuel_cruise': (int, float), 'fuel_descent': (int, float),     # RouteSim 4 (planning.py)
}
MAX_ROUTE = 600
HEAD_BUDGET_S = 5.0                 # SOG-0371 : la route de TÊTE répond en 5 s au plus (à froid : le chargement du contexte compris) ; ce qui n'a pas abouti se dit « proposition »
TOTAL_BUDGET_S = 15.0               # SOG-0371 : tout le calcul (tête, alternatives, propositions de repli) en 15 s au plus ; AUCUNE recherche ne dépasse la borne de sa phase (engine.DEADLINE)
OCEAN_HEAD_BUDGET_S = 12.0            # SOG-0354 L2b : un vol qui traverse l'Atlantique : la route de tête 12 s (10 s laissait 1 à 1,5 s de marge : décision de l'ergonome), une recherche 12 s, tout 20 s (les alternatives et les propositions seulement s'il reste du temps) — la route d'EIDW → KJFK EXISTE et demande ~7 s de recherche
OCEAN_SEARCH_CAP_S = 12.0
OCEAN_TOTAL_BUDGET_S = 20.0
ALT_BUDGET_S = 8.0                  # SOG-0296 : la recherche des ALTERNATIVES (après la route de tête) tient le poste au plus ce temps (facultatif, `alternatives_budget`, 1 à 25 s) : 25 s pour ne rien trouver de plus n'a pas à le tenir
MAX_ALTERNATIVES = 3
MAX_LEGS = 800
MAX_ISSUES = 300
MAX_PROFILE_CHANGES = 60
MAX_TEXT = 4000
MAX_RAD = 1500                       # SOG-0401 : les mentions RAD de la réponse : la liste ENTIÈRE jusqu'à cette borne (531 pour EDDF → LFMN) ; au-delà, `rad_count` dit le total et `truncated` contient « rad » : jamais une coupe muette
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
        # SOG-0466 lot 2 : un aérodrome (dep, arr) peut être une HÉLISTATION au code de liste du SIA à cinq signes (« LF418 » : deux lettres et trois chiffres) ; les champs de piste gardent leurs quatre signes
        ok = r'[A-Za-z0-9]{1,4}|[A-Za-z]{2}\d{3}' if k in ('dep', 'arr') else r'[A-Za-z0-9]{1,4}'
        if k in out and out[k] and not re.fullmatch(ok, out[k], re.A):
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
    if out.get('fl_basis', 'request') not in ('request', 'default'):
        raise ValueError('fl_basis : request ou default')
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
    """L'empreinte des fichiers que le contexte lit : sia/base, proc (sans le sol), sia/zones/nat, local/xplane, RAD et FRA ; une chaîne courte."""
    items = []
    data = engine.DATA_DIR
    if data:
        for sub, skip in ((('sia', 'base'), ()), (('proc',), ('ground',)), (('sia', 'zones', 'nat'), ()), (('local', 'xplane'), ())):      # SOG-0474 suite : le réseau de repli X-Plane (data/local/xplane/) fait refaire le contexte quand il change
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


def crosses_ocean(a, b):
    """Vrai si le vol traverse l'Atlantique : un bout à l'ouest de 35°W et l'autre à l'est de 15°W (le critère de nat_layer.hint), décidé AVANT la recherche (aucune route n'est connue encore). a et b : des positions { lon }."""
    try:
        return (a['lon'] < -35 and b['lon'] > -15) or (b['lon'] < -35 and a['lon'] > -15)
    except (KeyError, TypeError):
        return False


def budgets(request, ocean):
    """Les bornes de ce calcul : { ocean, head_s, search_s, total_s } — 5 s / 6 s / 15 s (SOG-0371), 12 s / 12 s / 20 s pour un vol qui traverse l'Atlantique en CALCUL ; un CONTRÔLE (une route saisie) garde les siennes. La réponse les rend (`budget`) : l'écran dit qu'il cherche plus longtemps."""
    long_ = bool(ocean) and request.get('mode', 'calculate') == 'calculate'
    return {'ocean': long_, 'head_s': OCEAN_HEAD_BUDGET_S if long_ else HEAD_BUDGET_S, 'search_s': OCEAN_SEARCH_CAP_S if long_ else 6.0, 'total_s': OCEAN_TOTAL_BUDGET_S if long_ else TOTAL_BUDGET_S}


def depart_of(request, now=None):
    """(l'instant de départ UTC sans fuseau, 'request') : l'heure que la demande DONNE ; (None, 'none') quand elle n'en donne pas (une date seule, « 2026-11-16 ») : on ne suppose RIEN (décision de l'ergonomie, 16 nov. : la règle du 13/11, « même si on n'a pas la bonne nat, on essaie tout de même de les utiliser »), la validité horaire des routes NAT n'est alors pas vérifiée et la réponse le dit (`sections.depart`) ; `now` n'est plus utilisé (gardé pour les appelants)."""
    if len(str(request.get('date', ''))) > 10:
        return nav_time(request), 'request'
    return None, 'none'


LEVEL_WORDS = re.compile(r'\bFL ?\d|\bRFL\b|niveau|altitude|plancher|plafond|profil', re.I)


def level_matters(primary, info):
    """(vrai ou faux, la raison dite) : la raison du PREMIER échec (au niveau demandé) est-elle une affaire de NIVEAU ? Une reprise à un niveau plus bas n'est tentée que si oui (SOG-0354 L5 4, défaut 2) ; sinon la réponse part tout de suite avec sa raison.
    Oui : une ERREUR du contrôle qui parle de niveau, d'altitude, de plancher, de plafond ou de profil (un vol trop court pour son niveau, RFL NOT ABV FL275) ; sans route, une track écartée pour le NIVEAU qui serait valable à un niveau qu'elle propose (`sections.level_retry`) ; sans route et sans découpage par sections (un vol hors océan), le message « à ce niveau » du moteur.
    Non : une ERREUR d'une autre nature (une règle RAD d'itinéraire), une track écartée par le sens, l'heure ou le réseau, une route libre qui n'a pas abouti."""
    errors = [i['text'] for i in primary.get('issues') or [] if i.get('level') == 'ERREUR']
    for text in errors:
        if LEVEL_WORDS.search(text):
            return True, 'erreur de niveau : ' + text[:120]
    if primary.get('ok') and errors:
        return False, 'erreur qui n\'est pas une affaire de niveau : ' + errors[0][:120]
    if info is not None:
        if info.get('level_retry'):
            return True, 'une route NAT écartée pour le niveau est valable à un autre niveau : ' + ', '.join(info.get('level_tracks') or [])
        return False, 'aucune route NAT écartée pour le seul niveau : un autre niveau ne change pas la réponse'
    text = str(primary.get('error') or '')
    if 'à ce niveau' in text or LEVEL_WORDS.search(text):
        return True, 'le réseau est coupé à ce niveau'
    return False, 'la raison du premier échec n\'est pas une affaire de niveau : ' + text[:120]


def rad_repairs(request, nav, rad, primary, check_budget, bounds, started, assess=None):
    """Les reprises RAD d'une route de tête (au plus trois) : (la route, les exclusions APPLIQUÉES, les tentatives). Une reprise qui échoue (aucune route, budget) n'applique RIEN : ses exclusions ne sont ni dites ni gardées (SOG-0504 : le message « Point Y écarté » ne se disait que pour une reprise réussie) ; un ordre « passer par X à côté de Y » qui échoue est suivi du repli « Y écarté » (SOG-0354 L5 (4) défaut 4), jamais d'un abandon."""
    import time
    assess = assess or engine.assess
    rad_retries = []
    avoids = []
    tried = set()      # SOG-0504 : les ordres « passer par X » dont la recherche a ÉCHOUÉ : plus rejoués, le repli (Y écarté) prend la suite
    for attempt in range(3):
        findings = primary.get('rad_summary', {}).get('findings', [])
        extra = primary.get('rad_summary', {}).get('search_exclusions', [])
        compelled = {(x.get('id'), x.get('before')) for x in avoids if x.get('kind') == 'compel'} | tried
        extra = [x for x in extra if not (x.get('kind') == 'compel' and (x.get('id'), x.get('before')) in tried)]
        extra = [x for x in extra if not x.get('fallback') or (x.get('id'), x.get('point')) in compelled]      # SOG-0354 L5 (4) défaut 4 : Y n'est écarté que si le passage par X à côté de Y a déjà été tenté
        if not findings or not extra:
            break
        fresh = [x for x in extra if json.dumps(x, sort_keys=True) not in {json.dumps(y, sort_keys=True) for y in avoids}]
        if not fresh:      # une reprise qui n'exclut (n'impose) rien de NEUF refait la même recherche : elle n'est JAMAIS jouée
            rad_retries.append(dict(excluded=avoids, error='reprise RAD non faite : elle n\'exclurait rien de neuf'))
            break
        wanted = list({json.dumps(x, sort_keys=True): x for x in [*avoids, *extra]}.values())
        if bounds['ocean'] and time.perf_counter() > started + bounds['head_s']:      # SOG-0354 L2b : un vol océanique ne reprend pas la route de tête après sa borne (chaque reprise refait un graphe et une recherche : 6 s) — le total de 20 s tient
            rad_retries.append(dict(excluded=wanted, error='reprise RAD non faite : la borne de la route de tête est atteinte'))
            break
        try:
            check_budget()
            candidate = assess(dict(request, _rad_avoid=wanted), nav, rad)
            rad_retries.append(dict(excluded=wanted, route=candidate['route'], errors=[i['text'] for i in candidate['issues'] if i['level'] == 'ERREUR']))
            primary = candidate
            avoids = wanted
            request['_rad_avoid'] = avoids
        except (ValueError, SearchBudget) as e:
            rad_retries.append(dict(excluded=wanted, error=str(e)))
            orders = [x for x in fresh if x.get('kind') == 'compel']
            if orders and not isinstance(e, SearchBudget):      # SOG-0504 : « passer par X à côté de Y » ne trouve aucune route (un virage trop serré, une voie fermée) : le repli (Y écarté) est TENTÉ avant de rendre la route de tête avec ses infractions
                tried |= {(x.get('id'), x.get('before')) for x in orders}
                continue
            break
    return primary, avoids, rad_retries


def plan(request, root):
    """Le plan, tel que server.plan() de RouteSim 4 le fait (voir l'en-tête du module). Le mode VFR (vfr.py) n'est pas porté : la demande IFR seule est acceptée (check_request)."""
    import time
    started = time.perf_counter()

    limit = {'until': started + TOTAL_BUDGET_S, 'what': f'Budget global de recherche atteint ({TOTAL_BUDGET_S:g} s)'}

    next_attempt = {'cost': 0.0}      # SOG-0354 L2b : le coût d'une tentative de plus (un graphe de ~4 s et une recherche) : un vol océanique n'en commence pas une qui ne finirait pas dans son budget

    def check_budget():
        if time.perf_counter() > limit['until'] - next_attempt['cost']:
            raise SearchBudget(limit['what'] + '. Les propositions déjà contrôlées sont conservées ; la recherche n’est pas exhaustive.')
    request = dict(request, root=root)
    request.setdefault('date', '2026-11-09T12:00')
    context_began = time.perf_counter()
    nav, rad = context(request, root)
    nav.fra_floors = fra_floor.floors(rad) if fra_floor.CAP_SEARCH else {}      # SOG-0401 (lot 3) : les planchers de route libre de la Suisse et de l'Italie (RAD, annexe 3B) : le graphe de la recherche y ramène le plafond des voies SEULEMENT si CAP_SEARCH (faux par défaut : la route la plus courte est gardée)
    # RouteSim libère les caches du graphe à la fin de chaque plan (release_graph_caches) : ici le contexte est refait à chaque demande et disparaît avec elle
    entered = str(request.get('route', '')).strip().upper()
    words = [engine.split_level(w)[0] for w in entered.split()]      # SOG-0401 : « POINT/Fnnn » est le point POINT (le groupe de niveau se lit dans engine.assess)
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
    if request.get('allow_levels', True):      # SOG-0371 (aller-retour) : le contrôle lit la route avec le MÊME modèle vertical que la recherche qui l'a écrite (une route du moteur n'est pas refusée au contrôle pour une montée que la recherche adaptait)
        request.setdefault('level_strategy', 'adapt')
    request = planning.normalize(request, root)
    nav.nat_rejected = frozenset((getattr(nav, 'nat', None) or {}).get('kept') or ())      # SOG-0394 : une route GARDÉE d'un message précédent est fermée à toute recherche tant que `sections.solve` ne l'a pas jugée valable à l'heure de son passage
    nav.fl_basis = request.get('fl_basis', 'request')      # SOG-0389 : d'où vient le niveau : `request` (la demande le donne) ou `default` (le défaut du moteur, FL180 : sans niveau) ; dit dans `sections.fl_basis`
    nav.sections_info = None      # SOG-0354 L5 (4) : rien d'une demande précédente (le contexte est gardé) ne passe dans la réponse de celle-ci
    nav._graph_cost = 0.0      # SOG-0475 : le coût du plus lent des graphes de CE calcul (engine.routing_graph)
    nav.depart = depart_of(request)      # SOG-0354 L5 (1) : l'heure de départ que la demande donne (sans heure : (None, 'none'), la validité horaire n'est pas vérifiée, dit)
    context_s = round(time.perf_counter() - context_began, 3)
    crossing = crosses_ocean(nav.ads.get(str(request.get('dep', '')).upper()) or {}, nav.ads.get(str(request.get('arr', '')).upper()) or {})
    # SOG-0354 L2b (3) : l'option de la demande (posée à CHAQUE plan : le contexte gardé d'un calcul à l'autre ne porte jamais l'option d'une demande précédente) ; L5 (3) : PAR DÉFAUT pour un vol qui traverse l'Atlantique en calcul (`sections: false` la refuse)
    nav.sections = bool(request['sections']) if request.get('sections') is not None else crossing and request.get('mode', 'calculate') == 'calculate'
    bounds = budgets(request, crossing)      # SOG-0354 L2b : un vol qui traverse l'Atlantique cherche plus longtemps
    reserve = 4.0 if bounds['ocean'] else 0.0      # SOG-0354 L2b : un vol océanique réserve la fin de ses 20 s aux propositions de repli ; les alternatives (un graphe de 4 s et une recherche chacune) s'arrêtent avant
    limit['until'], limit['what'] = started + bounds['total_s'] - reserve, f"Budget global de recherche atteint ({bounds['total_s']:g} s)"
    engine.SEARCH_CAP_S = bounds['search_s']
    engine.GRAPH_MIN_S = 5.0 if bounds['ocean'] else 0.0      # SOG-0354 L5 (3) : un graphe (~4 s) n'est pas commencé quand il reste moins de 5 s avant la borne
    request['_deadline'] = started + bounds['head_s']
    engine.DEADLINE = started + bounds['head_s']       # SOG-0371 : la route de tête et ses reprises RAD ; la phase suivante pose la sienne
    engine.DEADLINE_CEIL = limit['until']      # SOG-0475 : la borne de tête peut s'étendre après un graphe lent, jamais au-delà de la fin du calcul
    if request.get('objective') == 'economical':
        request['alternatives'] = True
    try:
        primary = engine.assess(request, nav, rad)
    except ValueError as e:
        hint = nat_layer.hint(nav, str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper()) if request.get('mode', 'calculate') == 'calculate' else ''      # SOG-0263 : traversée sans track dans le sens du vol
        primary = dict(ok=False, status='CALCUL IMPOSSIBLE', error=str(e) + (' ' + hint if hint else ''), route=request.get('route', ''), legs=[], issues=[])
    rad_retries = []
    avoids = []
    head_nm = primary.get('distance_nm')
    # A route-dependent RAD condition can only be decided after its SID, route and STAR are known. Retry with the implicated procedure / links excluded.
    if request.get('mode', 'calculate') == 'calculate':
        primary, avoids, rad_retries = rad_repairs(request, nav, rad, primary, check_budget, bounds, started)
    if request.get('mode', 'calculate') == 'calculate' and not primary.get('ok') and not request.get('_rad_fallback') and 'Budget de recherche atteint' not in str(primary.get('error') or '') and rad.blocks(str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper(), None):
        # SOG-0401 (règle de l'ergonome, 17 nov.) : « le calcul ne perd jamais une route à cause d'une règle qu'il sait décider » : aucune route n'a été trouvée avec les interdictions décidées comme blocs : la recherche est refaite SANS ces blocs, la meilleure route est rendue et les règles qu'elle enfreint sont dites (REVUE) ; « proposition » seulement quand rien ne relie les deux terrains
        try:
            check_budget()
            fallback = engine.assess(dict(request, _rad_fallback=True), nav, rad)
            if fallback.get('ok'):
                primary = fallback
                request['_rad_fallback'] = True
                primary.setdefault('issues', []).insert(0, {'level': 'REVUE', 'text': 'Aucune route sans infraction aux règles RAD que le contrôle sait décider : la meilleure route est rendue et les règles qu’elle enfreint sont dites ci-dessous (à examiner).'})
        except (ValueError, SearchBudget):
            pass
    if request.get('mode', 'calculate') == 'calculate' and primary.get('ok'):
        # SOG-0401 (règle de l'ergonome) : une route CALCULÉE reste rendue quand les reprises RAD n'ont pas écarté toutes ses infractions : les règles décidées qu'elle enfreint sont DITES (REVUE), jamais un refus qui ferait perdre la route
        ids = {f['id'] for f in (primary.get('rad_summary') or {}).get('findings', [])}
        broken = [i for i in primary.get('issues', []) if i['level'] == 'ERREUR' and (i['text'].startswith('Interdiction RAD explicite') or any(i['text'].startswith(f'RAD {x} (') for x in ids))]
        if broken:
            for i in broken:
                i['level'], i['text'] = 'REVUE', 'Règle RAD enfreinte (aucune route sans infraction, la meilleure est rendue) : ' + i['text']
            primary['issues'].insert(0, {'level': 'REVUE', 'text': 'Aucune route sans infraction aux règles RAD que le contrôle sait décider : la meilleure route est rendue et les règles qu’elle enfreint sont dites ci-dessous (à examiner).'})
            if not any(i['level'] == 'ERREUR' for i in primary['issues']):
                primary['status'] = 'CONTRÔLE INCOMPLET — DONNÉES MANQUANTES' if primary.get('data_gaps') else 'CONTRÔLE PARTIEL — À VÉRIFIER'
    for x in avoids if request.get('mode', 'calculate') == 'calculate' else []:      # SOG-0354 L5 (4) défaut 4 : un point écarté est un DÉTOUR : la réponse le dit, avec les deux distances
        if x.get('fallback') and primary.get('distance_nm') and head_nm:
            primary.setdefault('issues', []).append({'level': 'REVUE', 'text': f"Point {x['point']} écarté (règle RAD {x['id']} : passer par le point obligatoire n'a pas abouti) : détour de {primary['distance_nm'] - head_nm:+.0f} NM ({head_nm:.0f} → {primary['distance_nm']:.0f} NM)."})
    first_info = getattr(nav, 'sections_info', None) if nav.sections else None      # SOG-0354 L5 (4) : les sections et le temps de la réponse sont ceux du niveau DEMANDÉ (de la route de tête et de ses reprises RAD) : les autres tentatives écrasaient `nav.sections_info`
    first_graph_s = getattr(nav, 'graph_seconds', None)
    retries = []      # les reprises à d'autres niveaux, listées à part : { fl, seconds, found }
    engine.DEADLINE = limit['until']
    rejected = not primary['ok'] or bool(primary.get('data_gaps')) or any(i['level'] == 'ERREUR' for i in primary['issues'])
    if bounds['ocean'] and rejected:      # SOG-0354 L2b : une route de tête refusée : chaque tentative de plus refait un graphe (~4 s) et une recherche ; elle ne commence pas si elle ne finirait pas dans le budget (les alternatives d'une BONNE route de tête, elles, sont peu coûteuses : inchangées)
        next_attempt['cost'] = 6.5
    # SOG-0371 : en CONTRÔLE (une route saisie, sans `alternatives` demandées) la réponse dit ce qui est refusé, dans la borne de la route de tête : ni variantes d'office ni propositions de repli (c'est « Calculer A → B » qui cherche)
    check_only = request.get('mode', 'calculate') == 'validate' and not request.get('alternatives')
    coverage_gaps = recovery.terminal_gaps(request, nav) if rejected else []
    alternatives = []
    failures = list(coverage_gaps)
    tested = []
    # SOG-0161 : une route de tête refusée parce que sa RECHERCHE a atteint son budget (« Budget de recherche atteint ») : chercher d'autres niveaux refait la même recherche (6 s chacune : EIDW → KBOS rendait une proposition en 35 s) :
    # les propositions de repli viennent tout de suite
    budget_hit = rejected and 'Budget de recherche atteint' in str(primary.get('error') or '')
    level_ok, level_why = level_matters(primary, first_info) if rejected and request.get('mode', 'calculate') == 'calculate' else (True, '')      # SOG-0354 L5 (4) défaut 2 : sans affaire de niveau, ni reprise à un autre niveau ni palier adapté ; la réponse part avec sa raison
    if budget_hit and not coverage_gaps:
        failures.append('Alternatives non cherchées : la recherche de la route de tête a atteint son budget (elles en auraient épuisé un autre à chaque niveau).')
    if (rejected or request.get('alternatives')) and not coverage_gaps and not budget_hit and not check_only:
        if not rejected:          # SOG-0296 : la route de tête est bonne, les alternatives sont un PLUS : leur recherche a son propre budget (8 s, `alternatives_budget`) ; un plan refusé garde les 25 s (ses propositions sont son recours)
            secs = float(request.get('alternatives_budget', ALT_BUDGET_S))
            limit['until'] = min(limit['until'], time.perf_counter() + secs)
            limit['what'] = f'Budget de recherche des alternatives atteint ({secs:g} s)'
            request['_deadline'] = limit['until']
            engine.DEADLINE = limit['until']
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
            if allow_levels and level_ok and len(alternatives) < 3 and (rejected or request.get('mode') == 'validate'):
                try:
                    check_budget()
                    route, path = nav.generate(dep, arr, fl, radius, blocks, options, True, mandatory, nav_time(request), request.get('enable_fra', True), request)
                    consider(route, fl, 'adapt', path)
                except ValueError as e:
                    failures.append(str(e))
            if len(alternatives) < 3 and (level_ok or primary.get('ok')):      # une route trouvée avec une ERREUR a des variantes par pénalisation de liens ; sans route (et sans affaire de niveau) elles ne peuvent rien
                try:
                    routes = nav.alternate_routes(dep, arr, fl, radius, blocks, count=4, profile_options=options, allow_steps=bool(allow_levels), via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request, return_paths=True)
                    for route, path in routes:
                        consider(route, fl, 'adapt' if allow_levels else 'natural', path)
                        if len(alternatives) == 3:
                            break
                except ValueError as e:
                    failures.append(str(e))
            if allow_levels and level_ok:
                for level in levels:
                    if len(alternatives) >= 3:
                        break
                    began = time.perf_counter()
                    found = False
                    try:
                        check_budget()
                        route, path = nav.generate(dep, arr, level, radius, rad.blocks(dep, arr, None), options, allow_steps=True, via=mandatory, when=nav_time(request), enable_fra=request.get('enable_fra', True), terminal=request)
                        found = True
                        consider(route, level, 'adapt', path)
                    except ValueError as e:
                        failures.append(f'FL{level}: ' + str(e))
                    retries.append({'fl': level, 'seconds': round(time.perf_counter() - began, 3), 'found': found})
        except (ValueError, SearchBudget) as e:
            failures.append(str(e))
    wanted = (rejected or bool(request.get('alternatives'))) and not check_only
    if not alternatives:
        failures.extend(e for t in tested for e in t['errors'])
    alternatives.sort(key=lambda r: r.get('objective_score', r['distance_nm']))
    if request.get('mode', 'calculate') == 'calculate' and primary.get('ok') and not primary.get('data_gaps') and not any(i['level'] == 'ERREUR' for i in primary['issues']) and request.get('objective') in ['fastest', 'economical']:
        pool = [primary, *alternatives]
        pool.sort(key=lambda r: r.get('objective_score', r['distance_nm']))
        primary = pool[0]
        alternatives = pool[1:4]
    message = ('' if alternatives else 'Aucune alternative trouvée. Consulter les niveaux essayés et leurs motifs d’échec.') if wanted else ''      # SOG-0401 : « sans incompatibilité détectée » n'est plus rendu (c'était un 0 constat sur les seules conditions décidables, 95 contre 555 à examiner) : l'écran compose sa phrase avec `rad.decided` et `rad.review`
    repli = None
    if rejected and not alternatives and not check_only:
        engine.DEADLINE = started + bounds['total_s']      # les propositions de repli ont la fin du budget
        nav._routing_cache.clear()
        try:
            repli = recovery.propose(request, nav, rad)
        except (ValueError, KeyError) as e:
            repli = dict(proposals=[], pieces=[], note='Repli : ' + str(e))
        if repli.get('proposals'):
            message = 'Calcul réseau incomplet : ' + str(len(repli['proposals'])) + ' propositions de repli, dont ' + str(repli.get('fra_pieces', 0)) + ' portion(s) FRA. Les raccords DCT restent non validés.'
    for r in [primary, *alternatives, *((repli or {}).get('proposals') or [])]:        # SOG-0161 : chaque tronçon classé (contrôlé / incomplet / repli / erreur), par couche, et le pourcentage de la distance contrôlée
        layered.annotate(r, rad)
    info = first_info
    level_retry = {'tried': bool(retries), 'matters': level_ok, 'why': level_why, 'levels': retries} if rejected and request.get('mode', 'calculate') == 'calculate' else None
    timing = {'context_s': context_s, 'tracks_s': (getattr(nav, 'nat', None) or {}).get('seconds'), 'graph_s': first_graph_s, 'skeleton_s': (info or {}).get('skeleton_s'), 'sections': list((info or {}).get('steps') or []), 'retries': retries, 'total_s': round(time.perf_counter() - started, 3)}      # SOG-0354 L5 (3) : où le temps est passé, étape par étape, avec la borne de chacune
    return dict(budget=bounds, timing=timing, sections=info, level_retry=level_retry, primary=primary, alternatives=alternatives, recovery=repli, coverage_gaps=coverage_gaps, rad_search_attempts=rad_retries, alternative_message=message, alternative_failures=list(dict.fromkeys(failures)),
                search=dict(algorithm='A* avec labels altitude ; variantes par pénalisation des liens', last=nav.last_search if hasattr(nav, 'last_search') else None, total_seconds=round(time.perf_counter() - started, 3)),
                automatic_alternatives=rejected and not check_only, alternative_attempts=tested, input_route=request.get('route', ''), via=request.get('via', []), dep=request.get('dep'), arr=request.get('arr'))


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
    if len(r.get('profile_changes') or []) > MAX_PROFILE_CHANGES:      # SOG-0401 : les changements de palier du profil ; `profile_changes_total` dit le total
        r['profile_changes'] = r['profile_changes'][:MAX_PROFILE_CHANGES]
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
        engine.DATA_DIR = engine.RAD_FILE = fra.FRA_FILE = engine.DEADLINE = engine.DEADLINE_CEIL = None
        engine.SEARCH_CAP_S = 6.0
