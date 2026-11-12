"""Le verbe « base/cycle » : la LISTE du cycle — tout ce qui se rafraîchit pour un cycle AIRAC et l'état réel de chaque ligne sur ce poste (jeu « base » du lanceur ; V3, 12 nov. 2026, SOG-0259) — chargé par regen_jobs.load_verbs().

`base/cycle` { personal?: [sources] } — LECTURE SEULE (ni écriture, ni réseau, ni fichier ouvert : les NOMS du premier niveau de Téléchargements seulement, comme base/pickup) ; rend
  { ok, cycle: { inForce, next, ids: { inForce, next } } (l'identifiant AIRAC « 2611 » : année et numéro du cycle),
    items: [ { id (la source), label ×4, regime: 'auto' (le lanceur la prend seul) | 'hand' (attend la main de l'utilisateur) | 'local' (calculée ou lue sur ce poste),
               zones: [identifiants] (celles qu'elle nourrit ; omis pour les sources communes : `zoneCount`), zoneCount, personal: 'licence' | 'xplane' | '' ,
               steps: { download: { state: 'done' | 'late' | 'missing' | 'waiting' | 'unavailable' | 'n/a', cycle (le cycle détenu, pour une source datée), at (ISO UTC du plus récent fichier) },
                        build: { zones: n, upToDate: n }, publish: { published: n, unpublished: n, unknown: n } },
               why (la raison quand une étape manque : 'newer-in-downloads' | 'not-downloaded' | 'older-than-cycle' | 'no-file' | 'unavailable-at-publisher'),
               unavailable: { since } (SOG-0273 : l'éditeur ne publie plus le fichier — DIRCAM, AIP militaire britannique : l'étape n'est NI « en retard » NI « à faire »),
               hand: { link, expected: [motifs de nom], inDownloads: [noms du premier niveau de Téléchargements] } (regime 'hand' seulement) } ],
    next: { cycle, items: [ { id, state: 'in-downloads' | 'to-take' | 'will-be-taken', files: [noms] } ] } (le cycle SUIVANT, à part : ce qui est déjà dans Téléchargements, ce qui reste à prendre ; une source prise seule « sera prise quand il sera en vigueur »),
    unread: [ { id, files: [noms], reason: 'no-reader' | 'format', note? } ] (ce que le poste a vu dans Téléchargements et que la suite ne lit pas encore : une ligne comme les autres, avec sa raison) }.
`late` = pris, mais plus ancien que le cycle en vigueur (distinct de `missing` : aucun fichier). Un fichier reconnu par son NOM qui peut être d'un autre État (EK_ENR_… : le Danemark OU les Féroé) est dit tel quel (`note`) : le contenu n'est jamais ouvert ici.
Les coches sont posées par l'outil seul, d'après l'état réel (base_state, git, les dates des fichiers) ; rien n'est supposé."""
import datetime
import fnmatch
import json
import time
import os
import re
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import aero_cycles  # noqa: E402
import regen_jobs  # noqa: E402
import types  # noqa: E402


def _bs():
    """Les noms du jeu base_state (l'état par zone), chargé par load_verbs avec les autres jeux (il n'est pas importable par son nom)."""
    entry = regen_jobs.REGISTRY.get(('base', 'status'))
    return types.SimpleNamespace(**entry[0].__globals__)

MAX_NAMES = 5000
UNAVAILABLE = {'ukmil': '2025-11'}      # SOG-0273 : les sources « indisponibles chez l'éditeur » (le site ne répond plus depuis environ un an, dit l'utilisateur) : le catalogue (`unavailable`) dit la même chose, K185 les compare
NO_READER_ZONES = {'naviair': ('dk', 'fo', 'gl'), 'navcan_aip': ('ca',)}      # les États dont des fichiers se déposent à la main et ne sont pas encore lus par la suite : la fiche d'un pays le dit (`addWillAsk.noReader`)
EDITION_SOURCES = aero_cycles.EDITION_SOURCES      # publiés par éditions : l'édition détenue n'est jamais « en retard » du seul fait du cycle

# ce que le poste voit dans Téléchargements et que la suite ne lit pas encore : (id, motifs de nom, raison, note)
UNREAD = (
    ('navcan_aip', ('enreng*-*-*.pdf', 'adeng*-*-*.pdf', 'complete-version-of-published-sups.pdf'), 'no-reader', 'AIP Canada (NAV CANADA), ENR / AD / SUP : pas encore lu par la suite'),
    ('naviair', ('EK_ENR_*.pdf', 'BG_ENR_*.pdf', 'EK_AD_*.pdf', 'BG_AD_*.pdf'), 'no-reader', 'AIP Naviair : EK_ = le Danemark OU les Féroé (le contenu le dit), BG_ = le Groenland ; pas encore lu par la suite'),
    ('aip_fr_datasets', ('ObstaclesDataZone1MFRANCE_*.xlsx', 'AD.2.10_MIL*.zip', 'LF_Amdt_*_AIP_en.pdf'), 'no-reader', 'AIP de France, éditions du SIA : Dataset ENR 5.4 (obstacles), Dataset AD 2.10 MIL (obstacles des terrains militaires), AIP AMDT en PDF : pas encore lus par la suite (la base se construit sur l’export XML du SIA)'),
    ('openaip_xml', ('??_apt.xml', '??_asp.xml', '??_nav.xml', '??_rpp.xml', '??_hot.xml'), 'format', 'exports openAIP au format XML 1.1 : la suite lit le GeoJSON (le lanceur le prend seul)'),
)
# les fichiers que le poste prend et qui se reconnaissent par le nom, pour le cycle suivant : (id, motif de nom → date ou identifiant du cycle)
NEXT_NAMES = (
    ('sia', re.compile(r'^export_xml_bd_SIA_(\d{4}-\d{2}-\d{2})(?:-v\d+)?(?: \(\d+\))?\.zip\Z', re.I)),
    ('nats', re.compile(r'^EG_[A-Z_0-9]*?DS_(?:[A-Z0-9_]*?_)?(\d{8})_XML(?: \(\d+\))?\.zip\Z', re.I)),
    ('eurocontrol_rad', re.compile(r'^RAD_(\d{4})_v[\d_]+\.xlsx\Z', re.I)),
    ('eurocontrol_rad', re.compile(r'^eurocontrol-airac-(\d{4})-fra-points[^/]*\.xlsx\Z', re.I)),
)


def airac_id(iso):
    """L'identifiant EUROCONTROL d'un cycle : « 2611 » pour le 29 oct. 2026 (année sur deux chiffres, numéro du cycle dans l'année)."""
    d = datetime.date.fromisoformat(iso)
    first = datetime.date.fromisoformat(aero_cycles.airac_start(datetime.date(d.year, 1, 1)))
    if first.year < d.year:
        first += datetime.timedelta(days=28)
    return f'{d.year % 100:02d}{(d - first).days // 28 + 1:02d}'


def check(a):
    """{ personal?: [sources], zone?: identifiant } et rien d'autre (→ 400 si None) : `zone` ajoute la vue PAR ZONE (`zoneView`)."""
    if not isinstance(a, dict) or not set(a) <= {'personal', 'zone'}:
        return None
    if 'zone' in a and not (isinstance(a['zone'], str) and re.fullmatch(r'[a-z0-9_-]{2,12}', a['zone'])):
        return None
    p = a.get('personal', [])
    if not isinstance(p, list) or len(p) > 20 or not all(isinstance(x, str) and re.fullmatch(r'[a-z0-9_]{2,20}', x) for x in p):
        return None
    return {'personal': sorted(set(p)), **({'zone': a['zone']} if 'zone' in a else {})}


def _names(ctx):
    """Les NOMS du premier niveau des dossiers de téléchargement du lanceur : { dossier d'abord } sans doublon ; rien n'est ouvert."""
    out, seen = [], set()
    for folder in (ctx['downloads']() if callable(ctx.get('downloads')) else []):
        try:
            for n in sorted(os.listdir(folder))[:MAX_NAMES]:
                if n not in seen:
                    seen.add(n)
                    out.append(n)
        except OSError:
            continue
    return out


def _cycle_of_name(ident, value, current_iso):
    """Le cycle AIRAC (AAAA-MM-JJ) que dit un nom de fichier : une date (SIA, NATS) ou l'identifiant « 2612 » (EUROCONTROL) ; None si illisible."""
    try:
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
            return aero_cycles.airac_start(datetime.date.fromisoformat(value))
        if re.fullmatch(r'\d{8}', value):
            return aero_cycles.airac_start(datetime.date(int(value[:4]), int(value[4:6]), int(value[6:])))
        if re.fullmatch(r'\d{4}', value):       # « 2612 » : on cherche, autour du cycle en vigueur, celui qui porte cet identifiant
            cur = datetime.date.fromisoformat(current_iso)
            for k in range(-14, 15):
                c = aero_cycles.airac_start(cur + datetime.timedelta(days=28 * k))
                if airac_id(c) == value:
                    return c
    except ValueError:
        return None
    return None


def run(job, args, ctx):
    data = ctx['data']
    today = ctx.get('today')
    current = aero_cycles.airac_start(today)
    nxt = aero_cycles.airac_start(datetime.date.fromisoformat(current) + datetime.timedelta(days=28))
    base_state = _bs()
    B, S = base_state._ns(('base', 'build')), base_state._ns(('base', 'fetch'))
    zones_all = args.get('zones') or base_state._zones_default(data)
    states = base_state.zone_states(data, zones_all, args['personal'], ctx)
    inputs = B.list_inputs(data)
    cycles = aero_cycles.report(S.sia_rels(data), today, root=os.path.join(data, 'sia'))
    latest = base_state.download_times(data, inputs, S)
    names = _names(ctx)
    start = datetime.datetime.combine(datetime.date.fromisoformat(current), datetime.time(0, 0), datetime.timezone.utc).timestamp()
    iso = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    dl_cycles = {}
    for sid, rx in NEXT_NAMES:
        for n in names:
            m = rx.match(n)
            cy = _cycle_of_name(sid, m.group(1), current) if m else None
            if cy:
                dl_cycles.setdefault(sid, set()).add(cy)
    def make_item(sid, src, zones, only=None):
        """Une ligne de la liste : la source, son régime, ses trois étapes (pour toutes les zones qu'elle nourrit, ou pour la seule zone `only`)."""
        kind = src['kind']
        regime = 'auto' if kind == 'download' else 'hand' if kind in ('manual', 'pdf') else 'local'
        common = sid in S.COMMON
        mine = [states[z] for z in zones if z in states]
        built = sum(1 for z in mine if z['state'] == 'up-to-date')
        pub = {'published': 0, 'unpublished': 0, 'unknown': 0}
        for z in mine:
            p = z.get('publish')
            if p:
                pub[p['state']] = pub.get(p['state'], 0) + 1
        ats = [t for (z, s), t in latest.items() if s == sid and (only is None or z == only)]
        at = max(ats) if ats else None
        held = (cycles.get(sid) or {}).get('cycle') if sid in aero_cycles.CYCLED else None
        files_in_dl = []
        hand = None
        if regime == 'hand':
            pat = S.PICKUP.get(sid)
            pats = [pat['zip']] if pat and pat.get('zip') else []
            if pat and pat.get('sets'):
                pats = list(pat['sets'].values())
            files_in_dl = [n for n in names if any(fnmatch.fnmatchcase(n.lower(), p.lower()) for p in pats)]
            hand = {'link': src.get('link', ''), 'expected': pats, 'inDownloads': files_in_dl[:20]}
        why = None
        if at is None and held is None:
            state, why = ('waiting', 'newer-in-downloads') if files_in_dl else (('n/a', None) if regime == 'local' else ('missing', 'no-file' if regime == 'hand' else 'not-downloaded'))
        elif held is not None and held < current and sid not in EDITION_SOURCES:
            state, why = 'late', 'older-than-cycle'
        elif held is None and at is not None and at < start and regime != 'local':
            state, why = 'late', 'older-than-cycle'
        else:
            state = 'done'
        if sid in UNAVAILABLE and state in ('late', 'missing'):
            state, why = 'unavailable', 'unavailable-at-publisher'      # rangée à part : rien à faire tant que l'éditeur ne publie pas
        if state == 'late' and current in dl_cycles.get(sid, ()) and (held is None or held < current):
            why = 'newer-in-downloads'      # un fichier du cycle en vigueur attend déjà dans Téléchargements (par son nom) : à prendre
        item = {'id': sid, 'label': list(src['label']), 'regime': regime, 'personal': src.get('personal', ''), 'zoneCount': len(zones), **({} if common else {'zones': zones}),
                'steps': {'download': {'state': state, **({'cycle': held} if held else {}), 'at': iso(at) if at else None}, 'build': {'zones': len(mine), 'upToDate': built}, 'publish': pub}}
        if why:
            item['why'] = why
        if sid in UNAVAILABLE:
            item['unavailable'] = {'since': UNAVAILABLE[sid]}
        if hand:
            item['hand'] = hand
        return item
    items = [make_item(sid, src, [z for z in zones_all if sid in S.sources_of(z)]) for sid, src in S.SOURCES.items()]
    local = [{'id': it['id'], 'label': it['label'], 'at': it['steps']['download']['at'], 'personal': it['personal'], 'zoneCount': it['zoneCount']} for it in items if it['regime'] == 'local']      # SOG-0273 / 12 Nov : les sources calculées ou lues sur ce poste (MORA, X-Plane…) ne sont pas des choses « à faire » : « quand ça change », avec leur date
    items = [it for it in items if it['regime'] != 'local']
    try:                                    # SOG-0270 : le registre français des immatriculations (dérivé à cinq colonnes, ce poste seulement) : une ligne « quand ça change », avec la date du fichier pris
        rp = os.path.join(str(data), 'local', 'registry', 'fr_immat.json')
        if os.path.isfile(rp):
            local.append({'id': 'registry_fr', 'label': ['Registre français des immatriculations (DGAC)', 'French aircraft registry (DGAC)', 'Französisches Luftfahrzeugregister (DGAC)', 'Registro francés de matrículas (DGAC)'],
                          'at': iso(os.path.getmtime(rp)), 'personal': '', 'zoneCount': 0})
    except OSError:
        pass
    # le cycle suivant : ce que le poste a déjà reçu pour lui (par les noms), ce qui reste à prendre
    nxt_files = {}
    for sid, rx in NEXT_NAMES:
        for n in names:
            m = rx.match(n)
            if m and _cycle_of_name(sid, m.group(1), current) == nxt:
                nxt_files.setdefault(sid, []).append(n)
    next_items = []
    for it in items:
        if it['id'] in nxt_files:
            next_items.append({'id': it['id'], 'state': 'in-downloads', 'files': nxt_files[it['id']][:20]})
        elif it['id'] in UNAVAILABLE:
            next_items.append({'id': it['id'], 'state': 'unavailable', 'files': []})
        elif it['regime'] == 'hand':
            next_items.append({'id': it['id'], 'state': 'to-take', 'files': []})
        elif it['regime'] == 'auto':
            next_items.append({'id': it['id'], 'state': 'will-be-taken', 'files': []})
    if 'eurocontrol_rad' in nxt_files:
        next_items.append({'id': 'eurocontrol_rad', 'state': 'in-downloads', 'files': nxt_files['eurocontrol_rad'][:20]})
    unread = []
    for uid, pats, reason, note in UNREAD:
        seen = [n for n in names if any(fnmatch.fnmatchcase(n.lower(), p.lower()) for p in pats)]
        if seen:
            unread.append({'id': uid, 'files': seen[:40], 'reason': reason, 'note': note})
    zone_view = None
    if args.get('zone'):
        zid = args['zone']
        if zid not in set(B.zone_ids()):
            zone_view = {'zone': zid, 'known': False}
        else:
            zs = states.get(zid) or base_state.zone_states(data, [zid], args['personal'], ctx).get(zid)
            srcs = [make_item(sid, S.SOURCES[sid], [zid], zid) for sid in S.sources_of(zid)]
            for it in srcs:
                it['steps']['build'] = {'zones': 1, 'upToDate': 1 if zs and zs['state'] == 'up-to-date' else 0}
                it['steps']['publish'] = {'published': 0, 'unpublished': 0, 'unknown': 0, **({zs['publish']['state']: 1} if zs and zs.get('publish') else {})}
            zone_view = {'zone': zid, 'known': True, 'inCoverage': zid in zones_all,
                         'state': {k: zs.get(k) for k in ('state', 'builtCycle', 'builtAt', 'expectedCycle', 'publish', 'notices')} | {'reasons': [r['code'] for r in zs['reasons']]} if zs else None,
                         'sources': srcs,
                         'addWillAsk': {'sources': [i['id'] for i in srcs], 'auto': [i['id'] for i in srcs if i['regime'] == 'auto'],
                                        'hand': [{'id': i['id'], 'expected': (i.get('hand') or {}).get('expected', [])} for i in srcs if i['regime'] == 'hand'],
                                        'personal': [i['id'] for i in srcs if i['personal'] == 'licence'], 'noReader': [u for u, zl in NO_READER_ZONES.items() if zid in zl]}}
    return {'ok': True, **({'zoneView': zone_view} if zone_view else {}), 'cycle': {'inForce': current, 'next': nxt, 'ids': {'inForce': airac_id(current), 'next': airac_id(nxt)}}, 'items': items, 'local': local, 'datasets': datasets(data, current, time.time()), 'unavailable': [it['id'] for it in items if it['id'] in UNAVAILABLE], 'next': {'cycle': nxt, 'items': next_items}, 'unread': unread}


def _json(path):
    try:
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        return d if isinstance(d, dict) else None
    except (OSError, ValueError):
        return None


def datasets(data, current, now):
    """Les AUTRES jeux de l'écran Données (SOG-0273, Réglages) : une ligne par jeu, `{ id, label[4], state: 'up-to-date' | 'todo' | 'n/a', at (ISO UTC ou null), why?: code, ...ce que le jeu dit de lui }`, lue SUR LE POSTE, sans réseau. `n/a` : le jeu existe et n'a pas de notion d'échéance (sa date seule est dite) ;
    `todo` : absent (`why: 'absent'`) ou en retard d'après ce que le jeu sait de lui (`why: 'older-than-cycle' | 'expired' | 'old'`). Procédures : le cycle CIFP le plus récent contre le cycle en vigueur ; météo du monde : le run GFS (un run toutes les 6 h : « en retard » au-delà de 12 h) ; routes NAT : la fin de validité de leurs messages ; points VFR, aéronefs, fiches de performances : leur date (aucune échéance).
    L'échec de la dernière opération vient de `base/last` (le journal persistant), pas d'ici."""
    iso = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    mt = lambda *p: (os.path.getmtime(os.path.join(str(data), *p)) if os.path.isfile(os.path.join(str(data), *p)) else None)
    L = lambda *x: list(x)
    out = []
    # procédures : le cycle CIFP le plus récent (data/proc/<cycle>/index.json) et les terrains lus à la main (data/proc/manual/index.json)
    cycles = sorted((c for c in os.listdir(os.path.join(str(data), 'proc')) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', c)), reverse=True) if os.path.isdir(os.path.join(str(data), 'proc')) else []
    man = _json(os.path.join(str(data), 'proc', 'manual', 'index.json'))
    held = len((man or {}).get('aerodromes') or {})
    cifp = len((_json(os.path.join(str(data), 'proc', cycles[0], 'index.json')) or {}).get('aerodromes') or {}) if cycles else 0
    at = max([t for t in (mt('proc', 'manual', 'index.json'), mt('proc', cycles[0], 'index.json') if cycles else None) if t] or [0]) or None
    state, why = ('todo', 'absent') if not (cycles or held) else ('todo', 'older-than-cycle') if cycles and cycles[0] < current and not held else ('up-to-date', None)
    out.append({'id': 'procedures', 'label': L('Procédures', 'Procedures', 'Verfahren', 'Procedimientos'), 'state': state, **({'why': why} if why else {}), 'at': iso(at) if at else None, 'cycle': cycles[0] if cycles else None, 'counts': {'cifp': cifp, 'eaip': held}})
    # météo du monde (synoptique GFS) : l'index de data/weather/world/
    w = _json(os.path.join(str(data), 'weather', 'world', 'index.json'))
    built = w.get('built') if w and isinstance(w.get('built'), (int, float)) else None
    state, why = ('todo', 'absent') if not w else ('todo', 'old') if built and now - built > 12 * 3600 else ('up-to-date', None)
    out.append({'id': 'weather', 'label': L('Météo du monde (synoptique)', 'World weather (synoptic)', 'Weltwetter (Synoptik)', 'Meteorología mundial (sinóptico)'), 'state': state, **({'why': why} if why else {}), 'at': iso(built) if built else None, 'run': iso(w['run']) if w and isinstance(w.get('run'), (int, float)) else None})
    # routes NAT : la fin de validité de leurs messages
    nat = _json(os.path.join(str(data), 'sia', 'zones', 'nat', 'nat_tracks.json'))
    ends = []
    for m in (nat or {}).get('messages') or []:
        try:
            ends.append(datetime.datetime.strptime(m.get('to', ''), '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc).timestamp())
        except (ValueError, AttributeError, TypeError):
            pass
    until = max(ends) if ends else None
    state, why = ('todo', 'absent') if not nat else ('todo', 'expired') if until is not None and until < now else ('up-to-date', None) if until is not None else ('n/a', None)
    out.append({'id': 'nat', 'label': L('Routes NAT du jour', 'Today’s NAT tracks', 'NAT-Tracks des Tages', 'Tracks NAT del día'), 'state': state, **({'why': why} if why else {}), 'at': iso(mt('sia', 'zones', 'nat', 'nat_tracks.json')) if mt('sia', 'zones', 'nat', 'nat_tracks.json') else None, 'validUntil': iso(until) if until else None})
    # points VFR, aéronefs, fiches de performances : un fichier et sa date, aucune échéance
    vfr = _json(os.path.join(str(data), 'sia', 'vfr', 'index.json'))
    for sid, label, rel, extra in (
            ('vfr', L('Points VFR', 'VFR points', 'VFR-Punkte', 'Puntos VFR'), ('sia', 'vfr', 'index.json'), {'counts': {'aerodromes': len((vfr or {}).get('aerodromes') or [])}, 'generatedAt': (vfr or {}).get('generatedAt')}),
            ('aircraft', L('Aéronefs (types, performances)', 'Aircraft (types, performance)', 'Luftfahrzeuge (Typen, Leistung)', 'Aeronaves (tipos, rendimiento)'), ('AircraftDB', 'aircraft_db.js'), {}),
            ('sheets', L('Fiches de performances', 'Performance sheets', 'Leistungsblätter', 'Fichas de rendimiento'), ('planner', 'flight_performance_database_merged.fpdb.json'), {})):
        t = mt(*rel)
        out.append({'id': sid, 'label': label, 'state': 'n/a' if t else 'todo', **({} if t else {'why': 'absent'}), 'at': iso(t) if t else None, **extra})
    return out


def check_last(a):
    """base/last : aucun argument (→ 400 si autre chose)."""
    return {} if a in (None, {}) else None


def last(job, args, ctx):
    """base/last (lecture seule) : le dernier résultat de pickup, fetch, build et update, tel que le lanceur l'a gardé (data/local/last_results.json) : { ok, results: { 'base/pickup': { job, state, ended, ok, reason, args, result }, … } } ; { ok, results: {} } sans journal."""
    try:
        with open(os.path.join(str(ctx['data']), 'local', 'last_results.json'), encoding='utf-8') as f:
            doc = json.load(f)
    except (OSError, ValueError):
        doc = {}
    return {'ok': True, 'results': {k: v for k, v in doc.items() if k in ('base/pickup', 'base/fetch', 'base/build', 'base/update') and isinstance(v, dict)} if isinstance(doc, dict) else {}}


VERBS = {('base', 'cycle'): (run, check), ('base', 'last'): (last, check_last)}
