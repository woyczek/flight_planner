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
GUARD_S = 120.0                     # SOG-0524 : le GARDE-FOU de TEMPS de tout le calcul (secondes) : large, il ne décide de rien ; passé, le calcul est « interrompu » (le poste est trop lent), jamais « impossible » ni « proposition ». Les budgets se comptent en ÉTATS (le compteur `states_total` du Nav) : la même demande rend la même réponse quelle que soit la charge du poste
HEAD_STATES = 250_000               # SOG-0524 : la route de TÊTE et ses reprises RAD (avant : 5 s) ; mesuré à vide : 450 à 13 500 états pour les vols de référence, 27 000 avec les alternatives
TOTAL_STATES = 750_000              # SOG-0524 : tout le calcul : tête, alternatives, propositions de repli (avant : 15 s)
STATES_PER_S = 50_000               # SOG-0524 : la vitesse d'une recherche à vide (états par seconde, mesurée : 50 000) ; sert à lire en états une durée de l'ancien contrat (`alternatives_budget` en secondes, la réserve et la tentative des vols océaniques)
OCEAN_HEAD_STATES = 600_000         # SOG-0524 : un vol qui traverse l'Atlantique : la route de tête (avant : 12 s)
OCEAN_TOTAL_STATES = 1_000_000      # SOG-0524 : tout le calcul d'un vol océanique (avant : 20 s)
ALT_BUDGET_S = 8.0                  # SOG-0296 : la recherche des ALTERNATIVES (après la route de tête) : `alternatives_budget` (1 à 25) en SECONDES de l'ancien contrat, lues en états (× STATES_PER_S : 400 000 par défaut) ; SOG-0524 : plus une durée mesurée
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
    for k, lo, hi in (('speed_kt', 50, 1000), ('terminal_speed_kt', 50, 1000), ('climb_fpm', 100, 10000), ('descent_fpm', 100, 10000)):      # SOG-0532 (Sécurisation) : les vitesses (50 à 1 000 kt) et les taux (100 à 10 000 ft/min) bornés : la recherche et le profil divisent par la vitesse
        if k in out and not lo <= out[k] <= hi:
            raise ValueError(f'{k} : de {lo} à {hi}')
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
    date = dt.datetime.fromisoformat(str(request.get('date') or engine.today()).replace('Z', '+00:00'))      # SOG-0532 (7) : sans date, celle du jour
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
    """Les bornes de ce calcul : { ocean, head_states, total_states, guard_s } — SOG-0524 : des ÉTATS (250 000 pour la route de tête, 750 000 pour tout le calcul ; 600 000 / 1 000 000 pour un vol qui traverse l'Atlantique en CALCUL) et un garde-fou de temps large (120 s) ; un CONTRÔLE (une route saisie) garde les siennes. La réponse les rend (`budget`)."""
    long_ = bool(ocean) and request.get('mode', 'calculate') == 'calculate'
    return {'ocean': long_, 'head_states': OCEAN_HEAD_STATES if long_ else HEAD_STATES, 'total_states': OCEAN_TOTAL_STATES if long_ else TOTAL_STATES, 'guard_s': GUARD_S}


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
        if bounds['ocean'] and getattr(nav, 'states_total', 0) - bounds.get('s0', 0) > bounds['head_states']:      # SOG-0354 L2b / SOG-0524 : un vol océanique ne reprend pas la route de tête après son budget d'états (chaque reprise refait un graphe et une recherche)
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

    limit = {'ceil': 0, 'what': f'Budget global de recherche atteint ({TOTAL_STATES:,} états)'.replace(',', ' ')}      # SOG-0524 : le plafond du compteur d'états du Nav (posé plus bas, quand le contexte est lu)

    next_attempt = {'cost': 0}      # SOG-0354 L2b / SOG-0524 : le coût d'une tentative de plus, en états (un graphe et une recherche) : un vol océanique n'en commence pas une qui ne finirait pas dans son budget

    def check_budget():
        if getattr(nav, 'states_total', 0) > limit['ceil'] - next_attempt['cost']:
            raise SearchBudget(limit['what'] + '. Les propositions déjà contrôlées sont conservées ; la recherche n’est pas exhaustive.')
    request = dict(request, root=root)
    if not request.get('date'):
        request['date'] = engine.today()      # SOG-0532 (7) : la date du vol, à défaut celle du jour (jamais une date figée dans le code)
    context_began = time.perf_counter()
    nav, rad = context(request, root)
    nav.fra_floors = fra_floor.floors(rad) if fra_floor.CAP_SEARCH else {}      # SOG-0401 (lot 3) : les planchers de route libre de la Suisse et de l'Italie (RAD, annexe 3B) : le graphe de la recherche y ramène le plafond des voies SEULEMENT si CAP_SEARCH (faux par défaut : la route la plus courte est gardée)
    # RouteSim libère les caches du graphe à la fin de chaque plan (release_graph_caches) : ici le contexte (le Nav et ses caches : le graphe de la dernière demande, celui d'avant les règles, la mémoire des virages) est GARDÉ d'une demande à la suivante (au plus MAX_CONTEXTS, IDLE_S) et ses caches sont bornés (un graphe de chaque sorte, TURN_CACHE_MAX virages)
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
    request['_level_lock'] = request.get('allow_levels') is not True      # SOG-0532 (1) : le niveau est CONSTANT par défaut : une voie hors de son étendue est EXCLUE de la recherche (hors montée et descente, avec marge) ; des paliers seulement si l'utilisateur les demande (`allow_levels: true`)
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
    reserve = 4 * STATES_PER_S if bounds['ocean'] else 0      # SOG-0354 L2b / SOG-0524 : un vol océanique réserve la fin de son budget aux propositions de repli (4 s de l'ancien contrat, en états)
    s0 = getattr(nav, 'states_total', 0)      # le compteur du Nav au début de CE calcul : les budgets s'y ajoutent
    bounds['s0'] = s0
    limit['ceil'], limit['what'] = s0 + bounds['total_states'] - reserve, f"Budget global de recherche atteint ({bounds['total_states']:,} états)".replace(',', ' ')
    engine.SEARCH_CAP_S = bounds['guard_s']
    engine.DEADLINE = started + bounds['guard_s']      # SOG-0524 : le garde-fou de temps du calcul entier (large) ; les phases se bornent en états
    engine.STATE_CEIL = s0 + bounds['head_states']      # la route de tête et ses reprises RAD ; la phase suivante pose la sienne
    if request.get('objective') == 'economical':
        request['alternatives'] = True
    interrupted = False      # SOG-0524 : le garde-fou de temps a joué (le poste est trop lent) : ni « impossible » ni « proposition », et plus aucune phase
    try:
        primary = engine.assess(request, nav, rad)
    except engine.Interrupted as e:
        interrupted = True
        primary = dict(ok=False, status='CALCUL INTERROMPU', error=str(e), route=request.get('route', ''), legs=[], issues=[])
    except ValueError as e:
        hint = nat_layer.hint(nav, str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper()) if request.get('mode', 'calculate') == 'calculate' else ''      # SOG-0263 : traversée sans track dans le sens du vol
        primary = dict(ok=False, status='CALCUL IMPOSSIBLE', error=str(e) + (' ' + hint if hint else ''), route=request.get('route', ''), legs=[], issues=[])
    rad_retries = []
    avoids = []
    head_nm = primary.get('distance_nm')
    # A route-dependent RAD condition can only be decided after its SID, route and STAR are known. Retry with the implicated procedure / links excluded.
    if request.get('mode', 'calculate') == 'calculate':
        try:
            primary, avoids, rad_retries = rad_repairs(request, nav, rad, primary, check_budget, bounds, started)
        except engine.Interrupted as e:      # SOG-0524 : la route de tête reste rendue, la reprise interrompue est dite
            interrupted = True
            rad_retries = [dict(excluded=[], error=str(e))]
    if request.get('mode', 'calculate') == 'calculate' and not primary.get('ok') and not request.get('_rad_fallback') and not interrupted and 'Budget de recherche atteint' not in str(primary.get('error') or '') and rad.blocks(str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper(), None):
        # SOG-0401 (règle de l'ergonome, 17 nov.) : « le calcul ne perd jamais une route à cause d'une règle qu'il sait décider » : aucune route n'a été trouvée avec les interdictions décidées comme blocs : la recherche est refaite SANS ces blocs, la meilleure route est rendue et les règles qu'elle enfreint sont dites (REVUE) ; « proposition » seulement quand rien ne relie les deux terrains
        try:
            check_budget()
            fallback = engine.assess(dict(request, _rad_fallback=True), nav, rad)
            if fallback.get('ok'):
                primary = fallback
                request['_rad_fallback'] = True
        except engine.Interrupted:
            interrupted = True
        except (ValueError, SearchBudget):
            pass
    if request.get('mode', 'calculate') == 'calculate' and primary.get('ok'):
        # SOG-0532 (3) (l'ergonome, 20 nov.) : plus de rétrogradation. Une règle CONNUE enfreinte est une ERREUR, pour une route calculée comme pour une route tapée ; si les reprises RAD n'ont rien trouvé de conforme, le moteur le DIT (une revue avec le nombre de règles) et rend la meilleure route, marquée fautive (`verdict: violates`) : elle n'est jamais « valide » et « Auto » ne la retient pas
        broken = [i for i in primary.get('issues', []) if i['level'] == 'ERREUR' and i.get('code') in ('rad_block', 'rad_rule')]
        if broken and not any(i.get('code') == 'no_conforming_route' for i in primary['issues']):
            primary['issues'].insert(0, {'level': 'REVUE', 'code': 'no_conforming_route', 'values': {'violations': len(broken)}, 'text': f'Aucune route sans infraction aux règles RAD que le contrôle sait décider : la meilleure route est rendue, elle enfreint {len(broken)} règle(s) connue(s) (listées dans les erreurs) : Eurocontrol refusera ce plan.'})
    for x in avoids if request.get('mode', 'calculate') == 'calculate' else []:      # SOG-0354 L5 (4) défaut 4 : un point écarté est un DÉTOUR : la réponse le dit, avec les deux distances
        if x.get('fallback') and primary.get('distance_nm') and head_nm:
            primary.setdefault('issues', []).append({'level': 'REVUE', 'text': f"Point {x['point']} écarté (règle RAD {x['id']} : passer par le point obligatoire n'a pas abouti) : détour de {primary['distance_nm'] - head_nm:+.0f} NM ({head_nm:.0f} → {primary['distance_nm']:.0f} NM)."})
    first_info = getattr(nav, 'sections_info', None) if nav.sections else None      # SOG-0354 L5 (4) : les sections et le temps de la réponse sont ceux du niveau DEMANDÉ (de la route de tête et de ses reprises RAD) : les autres tentatives écrasaient `nav.sections_info`
    first_graph_s = getattr(nav, 'graph_seconds', None)
    retries = []      # les reprises à d'autres niveaux, listées à part : { fl, seconds, found }
    engine.STATE_CEIL = limit['ceil']
    rejected = not primary['ok'] or bool(primary.get('data_gaps')) or any(i['level'] == 'ERREUR' for i in primary['issues'])
    if bounds['ocean'] and rejected:      # SOG-0354 L2b : une route de tête refusée : chaque tentative de plus refait un graphe (~4 s) et une recherche ; elle ne commence pas si elle ne finirait pas dans le budget (les alternatives d'une BONNE route de tête, elles, sont peu coûteuses : inchangées)
        next_attempt['cost'] = int(6.5 * STATES_PER_S)
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
    if (rejected or request.get('alternatives')) and not coverage_gaps and not budget_hit and not check_only and not interrupted:
        if not rejected:          # SOG-0296 : la route de tête est bonne, les alternatives sont un PLUS : leur recherche a son propre budget (8 s, `alternatives_budget`) ; un plan refusé garde les 25 s (ses propositions sont son recours)
            secs = float(request.get('alternatives_budget', ALT_BUDGET_S))
            states = int(secs * STATES_PER_S)      # SOG-0524 : le budget des alternatives en états (`alternatives_budget` : les secondes de l'ancien contrat × STATES_PER_S)
            limit['ceil'] = min(limit['ceil'], getattr(nav, 'states_total', 0) + states)
            limit['what'] = f'Budget de recherche des alternatives atteint ({states:,} états)'.replace(',', ' ')
            engine.STATE_CEIL = limit['ceil']
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
        except engine.Interrupted as e:      # SOG-0524 : les alternatives interrompues : la route de tête reste rendue
            interrupted = True
            failures.append(str(e))
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
    if rejected and not alternatives and not check_only and not interrupted:
        engine.STATE_CEIL = s0 + bounds['total_states']      # les propositions de repli ont la fin du budget
        nav._routing_cache.clear()
        try:
            repli = recovery.propose(request, nav, rad)
        except engine.Interrupted as e:
            interrupted = True
            repli = dict(proposals=[], pieces=[], note='Repli interrompu : ' + str(e))
        except (ValueError, KeyError) as e:
            repli = dict(proposals=[], pieces=[], note='Repli : ' + str(e))
        if repli.get('proposals'):
            message = 'Calcul réseau incomplet : ' + str(len(repli['proposals'])) + ' propositions de repli, dont ' + str(repli.get('fra_pieces', 0)) + ' portion(s) FRA. Les raccords DCT restent non validés.'
    if interrupted and primary.get('ok'):      # SOG-0524 : une phase de plus (reprise RAD, alternatives, repli) a été interrompue : la route de tête est rendue, la réponse le dit
        primary.setdefault('issues', []).insert(0, {'level': 'REVUE', 'text': 'Calcul interrompu : le poste est trop lent (plus de ' + format(bounds['guard_s'], 'g') + ' s) pendant une reprise RAD, les alternatives ou le repli : la route rendue est celle de tête, sans ce qui n\u2019a pas pu être cherché ; relancer le calcul.'})
    for r in [primary, *alternatives, *((repli or {}).get('proposals') or [])]:        # SOG-0161 : chaque tronçon classé (contrôlé / incomplet / repli / erreur), par couche, et le pourcentage de la distance contrôlée
        layered.annotate(r, rad)
    info = first_info
    level_retry = {'tried': bool(retries), 'matters': level_ok, 'why': level_why, 'levels': retries} if rejected and request.get('mode', 'calculate') == 'calculate' else None
    timing = {'context_s': context_s, 'tracks_s': (getattr(nav, 'nat', None) or {}).get('seconds'), 'graph_s': first_graph_s, 'skeleton_s': (info or {}).get('skeleton_s'), 'sections': list((info or {}).get('steps') or []), 'retries': retries, 'total_s': round(time.perf_counter() - started, 3)}      # SOG-0354 L5 (3) : où le temps est passé, étape par étape, avec la borne de chacune
    return dict(budget=bounds, interrupted=interrupted, states=getattr(nav, 'states_total', 0) - s0, timing=timing, sections=info, level_retry=level_retry, primary=primary, alternatives=alternatives, recovery=repli, coverage_gaps=coverage_gaps, rad_search_attempts=rad_retries, alternative_message=message, alternative_failures=list(dict.fromkeys(failures)),
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
    except engine.Interrupted as e:      # SOG-0524 : le garde-fou de temps a joué hors des phases que `plan` rattrape (la lecture du contexte, les sections) : la réponse est « interrompu », jamais une exception qui sort
        return bound_result(dict(budget=budgets(request, False), interrupted=True, states=0, timing={}, sections=None, level_retry=None, primary=dict(ok=False, status='CALCUL INTERROMPU', error=str(e), route=request.get('route', ''), legs=[], issues=[]), alternatives=[], recovery=None, coverage_gaps=[], rad_search_attempts=[], alternative_message='', alternative_failures=[],
                                 search=dict(algorithm='A* avec labels altitude ; variantes par pénalisation des liens', last=None, total_seconds=None), automatic_alternatives=False, alternative_attempts=[], input_route=request.get('route', ''), via=request.get('via', []), dep=request.get('dep'), arr=request.get('arr')))
    finally:
        engine.DATA_DIR = engine.RAD_FILE = fra.FRA_FILE = engine.DEADLINE = engine.STATE_CEIL = None
        engine.SEARCH_CAP_S = 120.0


MAX_LEVELS = 12      # SOG-0529 (le niveau « Auto » de Carburant) : au plus douze niveaux par appel


def check_levels(levels):
    """La liste des niveaux d'un appel `levels` : [entiers de 10 à 660], 1 à MAX_LEVELS, sans doublon (l'ordre est celui de l'appelant : il est celui de ses préférences) ; ValueError sinon."""
    if not isinstance(levels, list) or not 1 <= len(levels) <= MAX_LEVELS:
        raise ValueError(f'levels : une liste de 1 à {MAX_LEVELS} niveaux')
    out = []
    for x in levels:
        if isinstance(x, bool) or not isinstance(x, int) or not 10 <= x <= 660:
            raise ValueError('levels : des entiers de 10 à 660 (FL010 à FL660)')
        if x not in out:
            out.append(x)
    return out


def semicircular(p):
    """SOG-0530 lot B : le contrôle du niveau de croisière d'un niveau, en un mot : 'warning' (un niveau qui ne suit pas la règle semi-circulaire de l'AIP de France), 'undecided' (une route trop près d'une coupure, ou sans variation magnétique), 'ok' (des tronçons de France jugés, aucun avertissement), 'no_table' (aucun tronçon de France jugé : un autre État, ou le tableau n'est pas lu) ; None sans contrôle. Jamais un blocage : `valid` ne la lit pas."""
    rule = p.get('level_rule')
    if not isinstance(rule, dict):
        return None
    return 'warning' if rule.get('warnings') else 'undecided' if rule.get('undecided') else 'ok' if rule.get('checked') else 'no_table'


def level_summary(level, res):
    """Une ligne par niveau, pour l'appelant (SOG-0529) : { fl, ok, valid, status, distance_nm, route, connector, reason, errors, states, interrupted }.
    `valid` : une route trouvée, un contrôle SANS erreur et aucune limite de raccord du RAD dépassée (un raccord direct que l'IFPS refusera n'est JAMAIS une route valide : `reason` le dit) ;
    `connector` : 'procedure' (chaque extrémité qui a des procédures publiées en utilise une), 'direct' (une extrémité a des procédures publiées mais est volée par un raccord DCT : aucune n'est volable à ce niveau) ou 'none' (aucune extrémité n'a de procédure publiée : le raccord direct est le seul)."""
    p = res['primary']
    errors = [i['text'] for i in p.get('issues') or [] if i['level'] == 'ERREUR']
    exceeded = [x for x in ((p.get('dct_limits') or {}).get('checked') or []) if x.get('state') == 'exceeded']
    kinds = {l.get('kind') for l in p.get('legs') or []}
    coverage = p.get('procedure_coverage') or {}
    ends = [(p.get('dep'), 'SID' in kinds), (p.get('arr'), bool(kinds & {'STAR', 'APPROACH_LINK'}))]
    have = [(ad, used) for ad, used in ends if ad and any(k.endswith('_total') and v for k, v in (coverage.get(ad) or {}).items())]
    connector = 'none' if not have else 'procedure' if all(used for _ad, used in have) else 'direct'
    ok = bool(p.get('ok'))
    valid = ok and not errors and not exceeded and not res.get('interrupted')
    if res.get('interrupted'):
        reason = 'calcul interrompu : le poste est trop lent'
    elif not ok:
        reason = str(p.get('error') or p.get('status') or 'aucune route').split('. ')[0][:200]
    elif exceeded:
        x = exceeded[0]
        reason = f"raccord direct de {x['leg_nm']:g} NM à {'l’arrivée' if x['end'] == 'arr' else 'au départ'} au-delà de la limite de {x['limit_nm']:g} NM du RAD ({x['rule']}) : à examiner, jamais une route valide"
    elif errors:
        reason = errors[0][:200]
    else:
        reason = 'route valide'
    return {'fl': level, 'ok': ok, 'valid': valid, 'status': p.get('status'), 'distance_nm': p.get('distance_nm'), 'route': p.get('route') or '', 'connector': connector, 'reason': reason,
            'errors': [e[:160] for e in errors[:3]], 'verdict': p.get('verdict'), 'warnings': len(p.get('warnings') or []), 'semicircular': semicircular(p), 'states': res.get('states'), 'interrupted': bool(res.get('interrupted'))}      # SOG-0532 (3) : `verdict` (violates | unverifiable | conform) : le même mot que la réponse de route/compute


LEVELS_BUDGET_S = 300      # SOG-0529 (relecture de Sécurisation) : le temps de l'appel ENTIER (douze niveaux de 120 s au pire tiendraient le verrou des calculs pendant 24 minutes) ; testé AVANT chaque niveau


def levels(template, levels, data, rad_file, fra_file, first_valid=False, stop=None, budget_s=LEVELS_BUDGET_S, clock=time.monotonic):
    """SOG-0529 : le calcul d'UNE demande à chaque niveau de `levels` (dans l'ordre de l'appelant), en un appel : { levels: [level_summary], first_valid: le premier niveau VALIDE ou None, stopped: 'first-valid' | 'end' | 'cancelled' | 'time', asked }.
    Chaque niveau est la route de TÊTE seule (ni alternatives ni propositions) avec le budget d'états de la tête (HEAD_STATES : `compute` le pose à chaque appel) ; `first_valid` : on s'arrête au premier niveau valide.
    `stop` (le `job.cancelled` du lanceur) et `budget_s` (le temps de l'appel entier) sont testés AVANT chaque niveau : l'arrêt rend les niveaux déjà calculés (`stopped` 'cancelled' ou 'time' ; `asked` dit combien étaient demandés)."""
    wanted = check_levels(levels)
    out, first, why = [], None, 'end'
    begin = clock()
    for level in wanted:
        if stop is not None and stop():
            why = 'cancelled'
            break
        if clock() - begin >= budget_s:
            why = 'time'
            break
        res = compute(dict(template, fl=level, alternatives=False), data, rad_file, fra_file)
        row = level_summary(level, res)
        out.append(row)
        if row['valid'] and first is None:
            first = level
            if first_valid:
                why = 'first-valid'
                break
    conforming = [r['fl'] for r in out if r.get('semicircular') == 'ok']      # SOG-0530 lot C : les niveaux ESSAYÉS qui suivent la règle semi-circulaire de la France
    first_ok = next((r['fl'] for r in out if r['valid'] and r.get('semicircular') == 'ok'), None)      # le premier niveau VALIDE qui la suit
    off_rule = next((r['fl'] for r in out if r['valid'] and r.get('semicircular') == 'warning'), None)      # un niveau valide qui ne la suit pas
    return {'levels': out, 'first_valid': first, 'stopped': why, 'asked': len(wanted), 'conforming_tried': conforming[:MAX_LEVELS], 'first_valid_conforming': first_ok,      # SOG-0530 lot C : `no_conforming_valid` : des niveaux conformes ont été essayés, AUCUN n'a de route valide, et un niveau valide hors règle existe : c'est la raison pour laquelle « Auto » garde un niveau hors de la règle (l'écran ne le déduit pas)
            'no_conforming_valid': bool(conforming) and first_ok is None and off_rule is not None}
