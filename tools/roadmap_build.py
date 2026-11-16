"""Build the user's roadmap (frame/help/roadmap.json, screen #roadmap) from the organisation's files — SOG-0062.

One source: the fiches of BACKLOG.md (one card each) and the « Jalons » table of ROADMAP.md (the milestones), both in the
organisation folder (not in this repository). Nobody edits roadmap.json by hand: the integrator runs this script at each
pushed lot and at the evening pass, and commits the result.

    python tools/roadmap_build.py [--org E:/DEFA/organisation] [--out frame/help/roadmap.json] [--check]

Schema: ``sog-roadmap/1`` kept for the help build's check (every text in four languages, known states) with ``version: 2``
and the fields the screen reads when present — ``apps`` (pilote, compagnie, maintenance, stats), ``milestones``, and on each
item ``id``, ``kind`` (feature | bug), ``milestone``, ``rank`` (the user's order) and ``test: true`` on a delivered item
whose recette test still waits for his verdict (SOG-0256: « in test » is not yet « delivered » for him). The historical lanes of the previous file are kept with their
translations (``legacy: true``) and ranged by application. Translations of the fiches' titles come from
``<org>/roadmap_i18n.json`` (``{"SOG-0045": {"en": …, "de": …, "es": …}}``); a missing one copies the French text and is
listed by ``--check`` so a helper translates it.

SOG-0386: when ``<org>/CAPACITES.json`` exists, the document also carries a ``capabilities`` block (the overview at the head of the screen: whole, four groups, 14 functions, 116 capacities with their
percentage); the translations of the capacities are read from the same ``roadmap_i18n.json`` under the key ``cap:<French phrase>``.
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import subprocess
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LANGS = ('fr', 'en', 'de', 'es')
STATES = ('done', 'doing', 'planned', 'later')

APPS = [
    ('pilote', {'fr': 'Pilote', 'en': 'Pilot', 'de': 'Pilot', 'es': 'Piloto'}, 'doing'),
    ('compagnie', {'fr': 'Compagnie', 'en': 'Airline', 'de': 'Gesellschaft', 'es': 'Compañía'}, 'doing'),
    ('maintenance', {'fr': 'Maintenance', 'en': 'Maintenance', 'de': 'Wartung', 'es': 'Mantenimiento'}, 'doing'),
    ('stats', {'fr': 'Statistiques', 'en': 'Statistics', 'de': 'Statistiken', 'es': 'Estadísticas'}, 'planned'),
]
# Theme of a fiche → application (the first match wins, in this order).
APP_RULES = [
    ('compagnie', ('compagnie', 'company', 'mission', 'flotte', 'site', 'import')),
    ('maintenance', ('données', 'donnees', 'base', 'zone', 'synchro', 'lanceur', 'fiches appareil', 'fiche appareil',
                     'réglages', 'reglages', 'cadre', 'sécurité', 'securite', 'suite', 'roadmap', 'maintenance')),
    ('stats', ('statisti',)),
]
# Lane labels for the first word of a theme (fallback: the French word in every language).
LANE_LABELS = {
    'carburant': ('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
    'route': ('Route', 'Route', 'Route', 'Ruta'),
    'carte': ('Carte', 'Map', 'Karte', 'Mapa'),
    'cartes officielles': ('Cartes officielles', 'Official charts', 'Amtliche Karten', 'Cartas oficiales'),
    'profil': ('Profil', 'Profile', 'Profil', 'Perfil'),
    'météo': ('Météo', 'Weather', 'Wetter', 'Meteo'),
    'en vol': ('En vol', 'In flight', 'Im Flug', 'En vuelo'),
    'compte rendu': ('Compte rendu', 'Report', 'Bericht', 'Informe'),
    'aide': ('Aide', 'Help', 'Hilfe', 'Ayuda'),
    'compagnie': ('Compagnie', 'Airline', 'Gesellschaft', 'Compañía'),
    'missions': ('Missions', 'Missions', 'Missionen', 'Misiones'),
    'données': ('Données', 'Data', 'Daten', 'Datos'),
    'base': ('Base aéro', 'Aero base', 'Aero-Basis', 'Base aero'),
    'procédures': ('Procédures', 'Procedures', 'Verfahren', 'Procedimientos'),
    'synchronisation': ('Synchronisation', 'Synchronisation', 'Synchronisation', 'Sincronización'),
    'lanceur': ('Lanceur', 'Launcher', 'Launcher', 'Lanzador'),
    'fiches appareil': ('Fiches appareil', 'Aircraft sheets', 'Flugzeugdatenblätter', 'Fichas de aeronave'),
    'cadre': ('Cadre', 'Frame', 'Rahmen', 'Marco'),
    'statistiques': ('Statistiques', 'Statistics', 'Statistiken', 'Estadísticas'),
    'suite': ('Suite', 'Suite', 'Suite', 'Suite'),
    'sécurité': ('Sécurité', 'Security', 'Sicherheit', 'Seguridad'),
    'exports': ('Exports', 'Exports', 'Exporte', 'Exportaciones'),
    'fiches': ('Fiches appareil', 'Aircraft sheets', 'Flugzeugdatenblätter', 'Fichas de aeronave'),
    'appareils': ('Fiches appareil', 'Aircraft sheets', 'Flugzeugdatenblätter', 'Fichas de aeronave'),
    'carburant et fiches': ('Carburant et fiches', 'Fuel and sheets', 'Kraftstoff und Datenblätter', 'Combustible y fichas'),
    'procédures et route': ('Procédures et route', 'Procedures and route', 'Verfahren und Route', 'Procedimientos y ruta'),
    'état du vol': ('État du vol', 'Flight state', 'Flugzustand', 'Estado del vuelo'),
    'profil et espaces': ('Profil et espaces', 'Profile and airspaces', 'Profil und Lufträume', 'Perfil y espacios aéreos'),
    'guidage pilote': ('Guidage pilote', 'Pilot guidance', 'Pilotenführung', 'Guía del piloto'),
    'exports simulateurs': ('Exports simulateurs', 'Simulator exports', 'Simulator-Exporte', 'Exportaciones a simuladores'),
    'maintenance v3': ('Maintenance V3', 'Maintenance V3', 'Wartung V3', 'Mantenimiento V3'),
    'company': ('Compagnie', 'Airline', 'Gesellschaft', 'Compañía'),
}
# Historical lanes of the previous file → application.
LEGACY_APP = {'frame': 'maintenance', 'settings': 'maintenance', 'aerodb': 'maintenance', 'design': 'maintenance',
              'help': 'maintenance', 'tests': 'maintenance', 'fuel': 'pilote', 'maps': 'pilote', 'atmosphere': 'pilote',
              'report': 'pilote', 'flightlog': 'pilote', 'website': 'pilote', 'v2': 'compagnie'}
MILESTONE_STATE = {'livré': 'done', 'livre': 'done', 'en cours': 'doing', 'prévu': 'planned', 'prevu': 'planned',
                   'plus tard': 'later'}

FICHE = re.compile(r'^### (SOG-\d{4}) — (.+?)\s*$', re.M)
FIELD = re.compile(r'\*\*(Nature|Thème|État|Lot) :\*\*\s*(.+?)(?=\s\*\*(?:Nature|Thème|État|Lot|Responsable) :\*\*|\n|$)')   # a value may hold its own emphasis (« **Prêt 8b92d3d6b** ») : only the next field ends it


def read(p):
    return io.open(p, encoding='utf-8').read()


def fold(s):
    """Lower case without accents, for the rules."""
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', fold(s)).strip('-') or 'autre'


DONE_WORDS = ('livre', 'valide', 'a valider', 'corrige', 'clos', 'repondu', 'cause trouvee et corrigee')
DOING_WORDS = ('en cours', 'dispatche', 'bloqu', 'releve fait')


def state_of(etat):
    """The state of a fiche from its « État » line as the backlog really writes it: emphasis marks and a leading « (a) » are
    ignored; delivered words first (« Livré, à valider », « Validé », « Corrigé », « Clos », « Répondu »), then work in
    progress (« en cours », « dispatché », « bloquant »), then « prêt <sha> » = pushed, hence delivered, unless the same line
    still says « en cours »; a bare « Prêt » or « Planifié » is planned; the rest is later."""
    e = re.sub(r'^\s*\([a-z]\)\s*', '', fold(etat).replace('*', '')).strip()
    head = e[:240]
    if e.startswith(DONE_WORDS):
        return 'done'
    if any(w in head for w in DOING_WORDS):
        return 'doing'
    if re.search(r'\bpret(e|s|es)? [0-9a-f]{7,}', head):
        return 'done'
    if e.startswith('pret') or e.startswith('planifie') or 'conception ecrite' in head or 'conception a ecrire' in head:
        return 'planned'
    return 'later'


def kind_of(nature):
    return 'bug' if 'bug' in fold(nature) else 'feature'


def app_of(theme):
    t = fold(theme)
    for app, keys in APP_RULES:
        if any(fold(k) in t for k in keys):
            return app
    return 'pilote'


def lane_of(app, theme):
    first = theme.split('/')[0].strip()
    key = fold(first)
    folded = {fold(k): v for k, v in LANE_LABELS.items()}
    lab = folded.get(key) or folded.get(key.rstrip('s'))
    if not lab:
        lab = (first, first, first, first)
    return app + '-' + slug(first), dict(zip(LANGS, lab))


def parse_fiches(backlog):
    """The fiches of BACKLOG.md: id, title, nature, theme, state, lot."""
    out = []
    heads = list(FICHE.finditer(backlog))
    for n, m in enumerate(heads):
        end = heads[n + 1].start() if n + 1 < len(heads) else len(backlog)
        body = backlog[m.end():end]
        fields = {k: v.strip().rstrip('.') for k, v in FIELD.findall(body)}
        out.append({'id': m.group(1), 'fr': m.group(2).strip(), 'nature': fields.get('Nature', ''),
                    'theme': fields.get('Thème', ''), 'etat': fields.get('État', ''), 'lot': fields.get('Lot', '')})
    return out


def parse_milestones(roadmap):
    """The « Jalons » table of ROADMAP.md."""
    i = roadmap.find('## Jalons')
    if i < 0:
        return []
    section = roadmap[i:]
    j = section.find('\n## ', 3)
    section = section[:j] if j > 0 else section
    out = []
    for line in section.splitlines():
        if not line.startswith('|') or line.startswith('|---') or line.startswith('| Jalon'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 5:
            continue
        name, date, state, ids, content = cells[:5]
        st = MILESTONE_STATE.get(fold(state), 'planned')
        out.append({'id': name, 'label': {l: name for l in LANGS}, 'date': date if re.match(r'\d{4}-\d{2}-\d{2}$', date) else None,
                    'state': st, 'items': re.findall(r'SOG-\d{4}', ids), 'content': {l: content for l in LANGS}})
    return out


def read_priorities(org):
    """<org>/PRIORITES.json → {id: {milestone?, rank?}}, bounded and filtered (an untrusted file like the screen reads it)."""
    p = os.path.join(org, 'PRIORITES.json')
    if not os.path.isfile(p):
        return {}
    try:
        d = json.loads(read(p))
    except ValueError:
        return {}
    out = {}
    for fid, v in list((d.get('items') or {}).items())[:500]:
        if not re.match(r'^SOG-\d{4}$', str(fid)) or not isinstance(v, dict):
            continue
        e = {}
        if isinstance(v.get('milestone'), str) and len(v['milestone']) <= 40:
            e['milestone'] = v['milestone']
        if isinstance(v.get('rank'), int) and 1 <= v['rank'] <= 99999:
            e['rank'] = v['rank']
        if e:
            out[fid] = e
    return out


def tests_to_do(org):
    """The fiches delivered whose recette test still waits for the user's verdict (state « todo » of recette_build): they are
    « in test », not yet « delivered » for him (SOG-0256). recette_build imports this module, hence the late import."""
    import recette_build
    return {t['id'] for t in recette_build.build(org).get('tests') or [] if t.get('state') == 'todo'}


def git_short(path):
    try:
        return subprocess.check_output(['git', '-C', path, 'rev-parse', '--short', 'HEAD'], text=True).strip()
    except Exception:
        return None


# SOG-0386 (Q-0069, the user, 16 Nov 2026): the overview at the head of the roadmap — ONE line (« Ensemble : N % »), then four folded
# groups, each opening on its functions (their percentage), a function opening on its capacities (done / not done). The source is
# <org>/CAPACITES.json (the ergonomist's list: one capacity = one verb, a state each); the groups and the short names of the functions
# are written here (the user chose them), the four-language text of each capacity comes from roadmap_i18n.json under the key
# « cap:<the French phrase> » (a missing one copies the French and is listed by --check, like a fiche).
CAP_GROUPS = [
    ('fly', {'fr': 'Préparer et voler', 'en': 'Prepare and fly', 'de': 'Vorbereiten und fliegen', 'es': 'Preparar y volar'}, ('fuel', 'maps', 'atmosphere')),
    ('company', {'fr': 'Missions et compagnie', 'en': 'Missions and airline', 'de': 'Missionen und Gesellschaft', 'es': 'Misiones y compañía'},
     ('missions', 'odv', 'report', 'website')),
    ('follow', {'fr': 'Suivre', 'en': 'Follow up', 'de': 'Nachverfolgen', 'es': 'Seguimiento'}, ('flightlog', 'stats', 'landing', 'aircraft')),
    ('base', {'fr': 'Socle', 'en': 'Foundation', 'de': 'Grundlage', 'es': 'Base'}, ('data', 'settings', 'help')),
]
CAP_FUNCS = {
    'fuel': {'fr': 'Carburant et route', 'en': 'Fuel and route', 'de': 'Treibstoff und Route', 'es': 'Combustible y ruta'},
    'maps': {'fr': 'Carte', 'en': 'Map', 'de': 'Karte', 'es': 'Mapa'},
    'atmosphere': {'fr': 'Météo', 'en': 'Weather', 'de': 'Wetter', 'es': 'Meteorología'},
    'missions': {'fr': 'Missions', 'en': 'Missions', 'de': 'Missionen', 'es': 'Misiones'},
    'odv': {'fr': 'Ordres de vol', 'en': 'Flight orders', 'de': 'Flugaufträge', 'es': 'Órdenes de vuelo'},
    'report': {'fr': 'Compte rendu', 'en': 'Mission report', 'de': 'Missionsbericht', 'es': 'Informe de misión'},
    'website': {'fr': 'Site', 'en': 'Website', 'de': 'Website', 'es': 'Sitio web'},
    'flightlog': {'fr': 'Mes vols', 'en': 'My flights', 'de': 'Meine Flüge', 'es': 'Mis vuelos'},
    'stats': {'fr': 'Statistiques', 'en': 'Statistics', 'de': 'Statistiken', 'es': 'Estadísticas'},
    'landing': {'fr': 'Atterrissages', 'en': 'Landings', 'de': 'Landungen', 'es': 'Aterrizajes'},
    'aircraft': {'fr': 'Aéronefs', 'en': 'Aircraft', 'de': 'Luftfahrzeuge', 'es': 'Aeronaves'},
    'data': {'fr': 'Données', 'en': 'Data', 'de': 'Daten', 'es': 'Datos'},
    'settings': {'fr': 'Réglages', 'en': 'Settings', 'de': 'Einstellungen', 'es': 'Ajustes'},
    'help': {'fr': 'Aide', 'en': 'Help', 'de': 'Hilfe', 'es': 'Ayuda'},
}
# The state of a capacity in CAPACITES.json → what the screen shows: done (counts 1), part (counts one half), todo (counts 0).
CAP_STATE = {'v3': 'done', 'valide': 'done', 'v3-partiel': 'part'}
CAP_MAX = 500  # capacities kept, in all (the file lists about a hundred)


def pct(done, part, total):
    """The percentage of a set of capacities: those done, a partial one for one half, over the total (to the nearest integer; 0 for an empty set)."""
    return int((100 * (done + part / 2) / total) + 0.5) if total else 0


def capabilities(org, i18n):
    """(block, missing) — the `capabilities` block of roadmap.json from <org>/CAPACITES.json, or (None, []) when the file is absent or unreadable;
    `missing` lists the capacities without all three translations. A function of the file that no group names is not shown (listed in `unplaced`)."""
    p = os.path.join(org, 'CAPACITES.json')
    try:
        src = json.loads(read(p))
    except (OSError, ValueError):
        return None, []
    if not isinstance(src, dict):
        return None, []
    by_id = {f.get('id'): f for f in src.get('fonctions') or [] if isinstance(f, dict)}
    missing, total_n = [], 0
    groups, sum_all = [], [0, 0, 0]
    for gid, glabel, fids in CAP_GROUPS:
        funcs, sum_g = [], [0, 0, 0]
        for fid in fids:
            f = by_id.get(fid)
            if not f:
                continue
            items = []
            for c in f.get('capacites') or []:
                phrase = (c.get('phrase') or '').strip() if isinstance(c, dict) else ''
                if not phrase or total_n >= CAP_MAX:
                    continue
                total_n += 1
                tr = i18n.get('cap:' + phrase) or {}
                it = {'fr': phrase}
                for l in ('en', 'de', 'es'):
                    it[l] = (tr.get(l) or '').strip() or phrase
                if not all((tr.get(l) or '').strip() for l in ('en', 'de', 'es')):
                    missing.append(phrase)
                it['s'] = CAP_STATE.get(c.get('etat'), 'todo')
                items.append(it)
            n = [sum(1 for i in items if i['s'] == k) for k in ('done', 'part', 'todo')]
            for k in range(3):
                sum_g[k] += n[k]
            funcs.append({'id': fid, 'label': CAP_FUNCS[fid], 'pct': pct(n[0], n[1], len(items)), 'done': n[0], 'part': n[1],
                          'total': len(items), 'items': items})
        for k in range(3):
            sum_all[k] += sum_g[k]
        groups.append({'id': gid, 'label': glabel, 'pct': pct(sum_g[0], sum_g[1], sum(sum_g)), 'done': sum_g[0], 'part': sum_g[1],
                       'total': sum(sum_g), 'functions': funcs})
    placed = {fid for _, _, fids in CAP_GROUPS for fid in fids}
    asof = src['fait_le'] if isinstance(src.get('fait_le'), str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', src['fait_le']) else ''
    return {'asof': asof, 'pct': pct(sum_all[0], sum_all[1], sum(sum_all)), 'done': sum_all[0], 'part': sum_all[1], 'total': sum(sum_all),
            'groups': groups, 'unplaced': sorted(x for x in by_id if x not in placed and isinstance(x, str))}, missing


def build(org, previous):
    backlog = read(os.path.join(org, 'BACKLOG.md'))
    roadmap = read(os.path.join(org, 'ROADMAP.md'))
    i18n_p = os.path.join(org, 'roadmap_i18n.json')
    i18n = json.loads(read(i18n_p)) if os.path.isfile(i18n_p) else {}
    prio = read_priorities(org)
    caps, caps_missing = capabilities(org, i18n)
    fiches = parse_fiches(backlog)
    milestones = parse_milestones(roadmap)
    by_id = {}
    for m in milestones:
        for fid in m['items']:
            by_id.setdefault(fid, m['id'])
    known_ms = {m['id'] for m in milestones}
    for fid, pr in prio.items():
        if pr.get('milestone') in known_ms:
            by_id[fid] = pr['milestone']
        elif pr.get('milestone') == '':      # the user took the card out of every milestone (Backlog column, SOG-0256)
            by_id.pop(fid, None)
    for m in milestones:
        m['items'] = [fid for fid in m['items'] if by_id.get(fid) == m['id']] + \
            [fid for fid, ms in by_id.items() if ms == m['id'] and fid not in m['items']]
    in_test = tests_to_do(org)
    lanes = {}
    missing = []
    for f in fiches:
        app = app_of(f['theme'])
        lid, label = lane_of(app, f['theme'])
        lane = lanes.setdefault(lid, {'id': lid, 'app': app, 'label': label, 'items': []})
        tr = i18n.get(f['id']) or {}
        item = {'id': f['id'], 'kind': kind_of(f['nature']), 'state': state_of(f['etat']), 'fr': f['fr']}
        for l in ('en', 'de', 'es'):
            item[l] = (tr.get(l) or '').strip() or f['fr']
        if not all((tr.get(l) or '').strip() for l in ('en', 'de', 'es')):
            missing.append(f['id'])
        if by_id.get(f['id']):
            item['milestone'] = by_id[f['id']]
        if isinstance(prio.get(f['id'], {}).get('rank'), int):
            item['rank'] = prio[f['id']]['rank']
        if item['state'] == 'done' and f['id'] in in_test:
            item['test'] = True  # delivered, waiting for the user's verdict: the « En test » column of the screen (SOG-0256)
        lane['items'].append(item)
    for lane in lanes.values():
        lane['items'].sort(key=lambda it: (it.get('rank', 10 ** 6), it['id']))
    # historical lanes, kept with their translations
    legacy = []
    for lane in (previous or {}).get('lanes') or []:
        if lane.get('legacy') or lane.get('id') in LEGACY_APP:
            app = lane.get('app') if lane.get('legacy') else LEGACY_APP[lane['id']]
            # the items not yet delivered became fiches on 9 Nov (SOG-0086…): the lane keeps its delivered ones only
            items = [dict(it, kind=it.get('kind', 'feature')) for it in (lane.get('items') or [])
                     if it.get('state') == 'done' or it.get('id')]
            legacy.append({'id': lane['id'], 'app': app, 'label': lane['label'], 'legacy': True, 'items': items})
    order = [a[0] for a in APPS]
    all_lanes = sorted(lanes.values(), key=lambda l: (order.index(l['app']), l['label']['fr'])) + \
        sorted(legacy, key=lambda l: (order.index(l['app']), l['label']['fr']))
    doc = {
        'schema': 'sog-roadmap/1', 'version': 2,
        'updated': dt.date.today().isoformat(),
        'generated': {'tool': 'tools/roadmap_build.py', 'organisation': git_short(org), 'fiches': len(fiches),
                      'untranslated': len(missing), 'priorities': len(prio)},
        'owner': (previous or {}).get('owner') or 'ergonomics session (Simplification interface et ergonomie)',
        'note': (previous or {}).get('note'),
        'states': (previous or {}).get('states') or {
            'done': {'fr': 'Livré', 'en': 'Delivered', 'de': 'Geliefert', 'es': 'Entregado'},
            'doing': {'fr': 'En cours', 'en': 'In progress', 'de': 'In Arbeit', 'es': 'En curso'},
            'planned': {'fr': 'Prévu', 'en': 'Planned', 'de': 'Geplant', 'es': 'Previsto'},
            'later': {'fr': 'Plus tard', 'en': 'Later', 'de': 'Später', 'es': 'Más tarde'}},
        'apps': [{'id': a, 'label': lab, 'state': st} for a, lab, st in APPS],
        'milestones': milestones,
        'lanes': all_lanes,
    }
    if caps:
        doc['capabilities'] = caps
        doc['generated']['capabilities_untranslated'] = len(caps_missing)
    return doc, missing + ['cap:' + x for x in caps_missing]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--org', default=os.environ.get('SOG_ORGANISATION', 'E:/DEFA/organisation'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'frame', 'help', 'roadmap.json'))
    ap.add_argument('--check', action='store_true', help='say what would change and the untranslated fiches; write nothing')
    a = ap.parse_args(argv)
    previous = json.loads(read(a.out)) if os.path.isfile(a.out) else None
    doc, missing = build(a.org, previous)
    text = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
    n_items = sum(len(l['items']) for l in doc['lanes'])
    print(f"roadmap: {doc['generated']['fiches']} fiches, {len(doc['lanes'])} lanes, {n_items} items, "
          f"{len(doc['milestones'])} milestones, {len(missing)} untranslated")
    if missing:
        print('untranslated:', ' '.join(missing))
    if a.check:
        same = previous is not None and json.dumps(previous, ensure_ascii=False, sort_keys=True) == json.dumps(doc, ensure_ascii=False, sort_keys=True)
        print('up to date' if same else 'would change')
        return 0 if same else 1
    io.open(a.out, 'w', encoding='utf-8', newline='\n').write(text)
    print('written', os.path.relpath(a.out, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
