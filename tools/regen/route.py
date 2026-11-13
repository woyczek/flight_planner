"""Le jeu « route » du lanceur : le calcul de route IFR de simulation et l'import des classeurs EUROCONTROL qu'il lit (SOG-0081, alpha.5) — chargé par regen_jobs.load_verbs().

Le moteur est RouteSim 2 (tools/route_engine : engine, fra, procedures, flight_profile copiés de E:/DEFA/rad sans retouche de fond ; plan.py porte plan() du serveur). Ce jeu ne contient que l'orchestration.

  · `route/compute` { dep, arr, route?, via?, fl, date?, mode?, radius?, dep_runway?, arr_runway?, speed_kt?, terminal_speed_kt?, climb_fpm?, descent_fpm?, allow_levels?, alternatives?, alternative_levels?, enable_fra?,
    level_strategy? } (demande FERMÉE : tout autre champ est refusé, voir route_engine/plan.py check_request ; le contrat de sortie est dans frame/aerodb/INTEGRATION.md « Route computation ») : le plan (route calculée ou
    contrôlée, segments avec leur état, mentions RAD, profil vertical, alternatives) sur la base AeroDB du poste (data/sia/base, data/proc) et les fichiers compilés data/route/rad.json.gz et fra.json.gz.
    Résultat { ok: True, plan, rad: { title, start } | null, fra: { start } | null } ou { ok: False, reason: 'no-rad' | 'invalid' | 'failed', message }.
  · `route/import-rad` { dry?: vrai (par défaut), books?: [{ name, size }] } : lit les classeurs RAD (RAD_<cycle>_v….xlsx) et les points FRA (eurocontrol-airac-<cycle>-fra-points-….xlsx) de Téléchargements (comme base/pickup : le plan
    montre ce qui est là, le pilote choisit, la prise refuse un fichier qui n'est plus celui montré) et les COMPILE dans data/route/rad.json.gz et data/route/fra.json.gz (un cycle du classeur remplace le même cycle ;
    les autres restent : une donnée compilée n'est jamais purgée), UN commit. Rend { ok, dry, files: [{ name, size, kind: 'rad' | 'fra', cycle, title? }], taken: [noms], failed: [{ name, error }], rad: [cycles], fra: [cycles], commit, reason? }.
  · `route/fra-points` { date? } (SOG-0153, lecture seule) : les points du classeur FRA en vigueur à cette date, pour la LECTURE LOCALE de la page : { ok, cycle, count, _points: [[id, lat, lon, FIR]] } (« _points » : pour la page seule, jamais écrit) ; sans classeur { ok: False, reason: 'no-fra' }.
Licence des classeurs : EUROCONTROL NM (RAD et points FRA), usage de la compagnie, publiés dans son dépôt privé seulement ; la page le dit avant la prise (SOURCES, frame/aerodb/DECISIONS.md).
Python : bibliothèque standard (le lecteur de classeurs route_engine/xlsx.py ; pas d'openpyxl).
"""
import json
import os
import re
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs, merge_pending, inside)

MAX_BOOKS = 12
BOOK_MAX = 64 * 1024 * 1024
DATA_REL = ('route',)


def _paths(data):
    folder = os.path.join(data, *DATA_REL)
    return os.path.join(folder, 'rad.json.gz'), os.path.join(folder, 'fra.json.gz')


# ----------------------------------------------------------------------------------------------------------------------- route/compute
def check_compute(a):
    """Contrôle d'arguments (→ 400 si None) : la demande fermée de route_engine.plan.check_request."""
    try:
        from route_engine import plan, view
        if isinstance(a, dict) and 'action' in a:                      # la forme de l'écran de Carburant (route_engine/view.py) : validée par la demande du moteur qu'elle devient
            plan.check_request(view.to_request(a))
            return dict(a)
        return plan.check_request(a)
    except ValueError:
        return None


def compute(job, args, ctx):
    """Le calcul, AVEC le cache des résultats (SOG-0296, route_engine/results_cache.py) : une demande identique, sur la même base, rend le résultat gardé avec `cache: { hit, computedAt, until }` ; un échec n'est jamais gardé."""
    from route_engine import results_cache as RC
    data = ctx['data']
    rad_file, fra_file = _paths(data)
    k = sig = None
    if os.path.isfile(rad_file) and not regen_jobs.merge_pending(ctx):
        try:
            k, sig = RC.key(args), RC.signature(data, rad_file, fra_file if os.path.isfile(fra_file) else None)
        except (OSError, ValueError, TypeError):
            k = sig = None
    if k:
        hit = RC.load(data, k, sig)
        if hit:
            job.step('route : résultat gardé', 1, 1, 'cache')
            return {**hit[0], 'cache': {'hit': True, **hit[1]}}
    res = _compute_fresh(job, args, ctx)
    if k and isinstance(res, dict) and res.get('ok') is True:
        meta = RC.store(data, k, sig, res)
        if meta:
            res = {**res, 'cache': {'hit': False, **meta}}
    return res


def _compute_fresh(job, args, ctx):
    from route_engine import engine, fra, plan
    data = ctx['data']
    rad_file, fra_file = _paths(data)
    if regen_jobs.merge_pending(ctx):
        return {'ok': False, 'reason': 'failed', 'message': 'a merge is pending in data/ (interrupted synchronisation): the data may be incomplete; "Synchronise" settles it'}
    if not os.path.isfile(rad_file):
        return {'ok': False, 'reason': 'no-rad', 'message': 'no RAD imported on this workstation: import the EUROCONTROL RAD workbooks first (job route/import-rad)'}
    job.step('route : lecture de la base et calcul', 0, 1, 'calcul')
    from route_engine import view
    screen = 'action' in args                                          # la forme de l'écran de Carburant (view.py), sinon celle du moteur (plan.py)
    try:
        request = view.to_request(args) if screen else args
        res = plan.compute(request, data, rad_file, fra_file if os.path.isfile(fra_file) else None)
    except ValueError as e:
        return {'ok': False, 'reason': 'invalid', 'message': regen_jobs.clean_error(str(e), ctx)[:300]}
    except (OSError, KeyError, TypeError, IndexError, ZeroDivisionError, AttributeError, RecursionError) as e:       # le moteur est une approximation de simulation : une donnée imprévue est dite, jamais une exception muette
        return {'ok': False, 'reason': 'failed', 'message': regen_jobs.clean_error(f'{type(e).__name__}: {e}', ctx)[:300]}
    if screen:
        return view.to_view(res, request, include_raw=bool(args.get('raw')))
    p = res['primary']
    rad = p.get('rad_source') or {}
    return {'ok': True, 'plan': res, 'rad': {'title': rad.get('title'), 'start': rad.get('start')} if rad else None, 'fra': {'start': (p.get('fra_source') or {}).get('start')} if p.get('fra_source') else None}


# ----------------------------------------------------------------------------------------------------------------------- route/import-rad
def check_import(a):
    """Contrôle d'arguments (→ 400 si None) : { dry?: booléen (vrai par défaut), books?: [{ name, size }] } et rien d'autre."""
    from route_engine import import_books as I
    if not isinstance(a, dict) or not set(a) <= {'dry', 'books'}:
        return None
    dry = a.get('dry', True)
    books = a.get('books')
    if not isinstance(dry, bool) or (books is not None and (not isinstance(books, list) or len(books) > MAX_BOOKS)):
        return None
    shown = []
    for b in books or []:
        if not isinstance(b, dict) or set(b) != {'name', 'size'} or not isinstance(b['name'], str) or not I.PICKUP_NAME.match(b['name']) or '/' in b['name'] or '\\' in b['name'] \
                or not isinstance(b['size'], int) or isinstance(b['size'], bool) or b['size'] < 0:
            return None
        shown.append({'name': b['name'], 'size': b['size']})
    return {'dry': dry, **({'books': shown} if books is not None else {})}


def _scan(ctx):
    """Les classeurs de Téléchargements qui suivent un motif d'EUROCONTROL : { nom: chemin } (le plus récent d'un même nom), sans lien ni dossier."""
    from route_engine import import_books as I
    found = {}
    for d in list((ctx.get('downloads') or (lambda: []))()):
        try:
            entries = list(os.scandir(d))
        except OSError:
            continue
        for e in entries:
            if I.PICKUP_NAME.match(e.name) and e.is_file(follow_symlinks=False) and not e.is_symlink():
                if e.name not in found or os.path.getmtime(e.path) > os.path.getmtime(found[e.name]):
                    found[e.name] = e.path
    return dict(sorted(found.items())[:MAX_BOOKS])


def write_index(data, now=None):
    """data/route/index.json : { rad: [cycles], fra: [cycles], at } — les cycles des classeurs compilés (une date AAAA-MM-JJ par classeur, triées), relus des fichiers eux-mêmes ; `at` : l'heure de cet import (UTC). Rend son chemin relatif à data/."""
    import datetime
    from route_engine import import_books as I
    rad_file, fra_file = _paths(data)
    index = {'rad': sorted({b['start'] for b in I.load(rad_file)}), 'fra': sorted({b['start'] for b in I.load(fra_file)}),
             'at': (now or datetime.datetime.now(datetime.timezone.utc)).strftime('%Y-%m-%dT%H:%M:%SZ')}
    path = os.path.join(os.path.dirname(rad_file), 'index.json')
    with open(path + '.tmp', 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(index, indent=1) + '\n')
    os.replace(path + '.tmp', path)
    return 'route/index.json'


def import_rad(job, args, ctx):
    from route_engine import import_books as I
    data, dry = ctx['data'], args['dry']
    if not dry and regen_jobs.merge_pending(ctx):
        return {'ok': False, 'reason': 'failed', 'dry': dry, 'message': 'a merge is pending in data/ (interrupted synchronisation): nothing written; "Synchronise" settles it', 'files': [], 'taken': [], 'failed': []}
    files, entries, failed = [], {}, []
    scanned = _scan(ctx)
    for n, (name, path) in enumerate(scanned.items()):
        if job.cancelled():
            break
        job.step(f'{name}', n, len(scanned), 'classeurs')
        try:
            size = os.path.getsize(path)
            if size > BOOK_MAX:
                raise ValueError('too-large')
            kind, entry = I.read_book(path)
            entries[name] = (kind, entry, size)
            files.append({'name': name, 'size': size, 'kind': kind, 'cycle': entry['start'], **({'title': entry['title']} if kind == 'rad' else {})})
        except (ValueError, OSError, KeyError) as e:
            failed.append({'name': name, 'error': str(e)[:100]})
    taken = []
    rad_new, fra_new = [], []
    commit = None
    if not dry and not job.cancelled():
        want = args.get('books')
        if want is None:
            return {'ok': False, 'reason': 'not-shown', 'dry': dry, 'message': 'no book chosen: ask for the plan (dry) first, then pass the books to take', 'files': files, 'taken': [], 'failed': failed}
        for b in want:
            got = entries.get(b['name'])
            if got is None or got[2] != b['size']:
                failed.append({'name': b['name'], 'error': 'changed' if got else 'not-found'})       # un autre fichier que celui que le plan a montré, ou plus là : rien n'est pris
                continue
            (rad_new if got[0] == 'rad' else fra_new).append(got[1])
            taken.append(b['name'])
        rad_file, fra_file = _paths(data)
        base = os.path.realpath(data)
        if rad_new or fra_new:
            if not regen_jobs.inside(os.path.dirname(rad_file), base):
                return {'ok': False, 'reason': 'failed', 'dry': dry, 'message': 'unsafe path', 'files': files, 'taken': [], 'failed': failed}
            if rad_new:
                I.write(rad_file, I.merge(I.load(rad_file), rad_new))
            if fra_new:
                I.write(fra_file, I.merge(I.load(fra_file), fra_new))
            paths = [f'route/{n}' for n, new in (('rad.json.gz', rad_new), ('fra.json.gz', fra_new)) if new]
            paths.append(write_index(data))            # le petit index des cycles présents, que la page lit (publication().route) sans ouvrir les .gz
            done = regen_jobs.commit_outputs(ctx, getattr(job, 'author', ''), paths, f":card_file_box: RAD et points FRA d'EUROCONTROL compilés ({', '.join(sorted({e['start'] for e in rad_new + fra_new}))})")
            commit = done.get('commit')
            if done.get('warning'):
                job.log('git: ' + done['warning'])
    chosen = {b['name'] for b in (args.get('books') or [])}
    relevant = [f for f in failed if f['name'] in chosen]       # un classeur illisible de Téléchargements que le pilote n'a pas choisi n'est pas un échec de la prise
    reason = 'cancelled' if job.cancelled() else 'failed' if relevant and not taken and not dry else 'partial' if relevant and not dry else None
    res = {'ok': reason is None, 'dry': dry, 'files': files, 'taken': taken, 'failed': failed, 'rad': sorted(e['start'] for e in rad_new), 'fra': sorted(e['start'] for e in fra_new), 'commit': commit}
    if reason:
        res['reason'] = reason
    return res


# ----------------------------------------------------------------------------------------------------------------------- route/fra-points
def check_fra_points(a):
    """Contrôle d'arguments (→ 400 si None) : aucun, ou { date?: AAAA-MM-JJ } (le cycle du classeur est celui de cette date, aujourd'hui par défaut)."""
    if not isinstance(a, dict) or set(a) - {'date'}:
        return None
    d = a.get('date')
    if d is not None and not (isinstance(d, str) and re.fullmatch(r'\d{4}-\d\d-\d\d', d)):
        return None
    return dict(a)


def fra_points(job, args, ctx):
    """Les points du classeur FRA d'EUROCONTROL en vigueur, pour la LECTURE LOCALE de la page (SOG-0153) : { ok, cycle, count, _points: [[id, lat, lon, FIR]] }. Rien n'est écrit : la clé « _points » est pour la page seule (regen_jobs ne
    l'écrit pas dans tools/.regen_last.json) et ces points n'entrent jamais dans data/sia/base (licence : voir l'en-tête du module). Sans classeur : { ok: False, reason: 'no-fra' }."""
    import datetime as dt
    from route_engine import fra as fra_module, import_books
    _, fra_file = _paths(ctx['data'])
    if not os.path.isfile(fra_file):
        return {'ok': False, 'reason': 'no-fra', 'message': 'no EUROCONTROL FRA points imported on this workstation (job route/import-rad)'}
    try:
        books = import_books.load(fra_file)
    except (OSError, ValueError) as e:
        return {'ok': False, 'reason': 'failed', 'message': regen_jobs.clean_error(f'{type(e).__name__}: {e}', ctx)[:300]}
    when = args.get('date') or dt.date.today().isoformat()
    books = [b for b in books if isinstance(b, dict) and isinstance(b.get('start'), str) and isinstance(b.get('rows'), list)]
    if not books:
        return {'ok': False, 'reason': 'no-fra', 'message': 'the FRA file holds no book'}
    inforce = [b for b in books if b['start'] <= when]
    book = max(inforce or books, key=lambda b: b['start'])        # le cycle de la date, à défaut le plus récent qui la précède, à défaut le plus ancien
    seen, points = set(), []
    for r in book['rows']:
        v = r.get('v') if isinstance(r, dict) else None
        if not isinstance(v, list) or len(v) < 14 or not isinstance(v[2], str) or not v[2] or v[0] == 'DEL':
            continue
        lat, lon = fra_module.coord(str(v[3])), fra_module.coord(str(v[4]))
        if lat is None or lon is None:
            continue
        key = (v[2].strip().upper(), round(lat, 4), round(lon, 4))
        if key in seen:
            continue
        seen.add(key)
        points.append([key[0], round(lat, 5), round(lon, 5), str(v[13]).split(',')[0][:4]])
    return {'ok': True, 'cycle': book['start'], 'count': len(points), '_points': points}


VERBS = {('route', 'compute'): (compute, check_compute), ('route', 'import-rad'): (import_rad, check_import), ('route', 'fra-points'): (fra_points, check_fra_points)}
