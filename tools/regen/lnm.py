"""Le jeu « lnm » du lanceur : les procédures d'UN terrain lues dans la base de Little Navmap de CE poste, rendues à la page pour ce vol (SOG-0210, décision de l'ergonome du 10 nov. 2026) — chargé par regen_jobs.load_verbs().

« Aucune table de procédures publiée pour cet État. Little Navmap a une base sur ce poste. » : le repli était annoncé et n'offrait aucun geste. Un verbe, `proc/lnm` { icao, personal: true } :
  · lit la base SQLite de Little Navmap (little_navmap_<genre>.sqlite du dossier de ce poste, tools/launch.py lnm_db_folder) en LECTURE SEULE (`mode=ro&immutable=1` : ni copie, ni fichier -wal ou -shm créé à côté, ni verrou) ;
  · rend { ok, icao, source: 'lnm', base (le NOM du fichier, jamais un chemin), count, notice, _procedures: [fiches du schéma commun, `status: 'lnm'`, `lnm: true`, `source: { kind: 'lnm', ref: <nom du fichier> }`] } ;
    la clé « _procedures » est pour la page seule (elle n'entre jamais dans tools/.regen_last.json) : la page les garde en MÉMOIRE, marquées « lues de Little Navmap sur ce poste » ; AUCUNE écriture, ni dans data/, ni dans data/local, ni ailleurs ;
  · refus (ok: false, reason, liste fermée) : not-personal (sans la coche « usage personnel » : les données de Little Navmap sont celles de Navigraph / Jeppesen, sous licence personnelle), no-lnm (aucune base sur ce poste), not-found (le terrain n'est dans
    aucune base), no-procedures (le terrain y est, sans procédure), unreadable (SQLite illisible ou schéma inconnu).
Garde : le chemin de la base ne vient JAMAIS de la page (le dossier est celui du lanceur, le fichier un nom de la forme little_navmap_<genre>.sqlite listé ici) ; l'appareil du réseau local est refusé par la route des travaux (403) ; ces fiches ne sont ni compilées dans la base publiée, ni
écrites, ni commitées, ni exportées (licence personnelle : LICENSE.md). Bibliothèque standard seulement (sqlite3)."""
import os
import re
import sqlite3
import urllib.parse

NOTICE = ('Procédures lues de la base de Little Navmap de ce poste (données Navigraph / Jeppesen, licence personnelle) : usage personnel, jamais publiées ni exportées ; non destinées à la navigation.')
SKIP = {'logbook', 'logbook_backup', 'track', 'userdata', 'userdata_backup', 'userairspace', 'onlinedata'}      # les bases de Little Navmap qui ne portent pas de procédures
FILE = re.compile(r'^little_navmap_([a-z0-9_]+)\.sqlite\Z')
PREFER = ('navigraph', 'xp12', 'msfs24', 'msfs', 'p3d', 'fsx', '')                  # l'ordre où les bases sont essayées (les procédures de Navigraph d'abord)
MAX_PROCEDURES = 1500
MAX_LEGS = 250
APP_TYPES = {'LOCB': 'LOC-BC'}


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { icao: quatre lettres ou chiffres, personal?: booléen } et rien d'autre ; aucun chemin."""
    if not isinstance(a, dict) or not set(a) <= {'icao', 'personal'}:
        return None
    icao = a.get('icao')
    personal = a.get('personal', False)
    if not isinstance(icao, str) or not re.fullmatch(r'[A-Za-z0-9]{4}', icao) or not isinstance(personal, bool):
        return None
    return {'icao': icao.upper(), 'personal': personal}


def folder_of(ctx):
    """Le dossier des bases de Little Navmap de ce poste : donné par le lanceur (ctx['lnm_folder']), jamais par la page."""
    f = (ctx or {}).get('lnm_folder')
    return f() if callable(f) else ''


def candidates(folder):
    """[(genre, chemin)] des bases qui peuvent porter des procédures, dans l'ordre d'essai ; ni lien ni dossier."""
    try:
        names = os.listdir(folder)
    except OSError:
        return []
    out = []
    for n in names:
        m = FILE.match(n)
        p = os.path.join(folder, n)
        if m and m.group(1) not in SKIP and os.path.isfile(p) and not os.path.islink(p):
            out.append((m.group(1), p))
    return sorted(out, key=lambda x: (PREFER.index(x[0]) if x[0] in PREFER else len(PREFER) - 1, x[0]))


def _alt(code, a1, a2):
    """Contrainte d'altitude du schéma commun d'après la description de Little Navmap et ses deux altitudes (ft), ou None."""
    a1 = float(a1 or 0)
    a2 = float(a2 or 0)
    code = (code or '').strip()
    if code in ('+',) and a1 > 0:
        return {'type': 'min', 'ft': round(a1)}
    if code in ('-',) and a1 > 0:
        return {'type': 'max', 'ft': round(a1)}
    if code in ('A', '@') and a1 > 0:
        return {'type': 'at', 'ft': round(a1)}
    if code == 'B' and a1 > 0 and a2 > 0:
        return {'type': 'between', 'ft': round(min(a1, a2)), 'ft2': round(max(a1, a2))}
    return None


def _leg(r):
    """Un tronçon (approach_leg ou transition_leg) → un point du schéma commun, sans seq ni phase. r : dict des colonnes."""
    p = {'id': (r['fix_ident'] or None), 'lat': r['fix_laty'] if r['fix_ident'] else None, 'lon': r['fix_lonx'] if r['fix_ident'] else None, 'alt': _alt(r['alt_descriptor'], r['altitude1'], r['altitude2']), 'leg': r['type']}
    if p['id'] is None:
        p['lat'] = p['lon'] = None
    if (r['turn_direction'] or '') in ('L', 'R'):
        p['turn'] = r['turn_direction']
    if r['rnp'] and float(r['rnp']) > 0:
        p['rnp'] = round(float(r['rnp']), 4)
    if r['type'] not in ('HM', 'HA', 'HF'):
        if r['course'] and float(r['course']) > 0:
            c = float(r['course'])
            p['crs'] = int(c) if c == int(c) else round(c, 1)
        if r['distance'] and float(r['distance']) > 0:
            d = float(r['distance'])
            p['nm'] = int(d) if d == int(d) else round(d, 1)
    if r['speed_limit'] and float(r['speed_limit']) > 0:
        p['kt'] = int(r['speed_limit'])
    if r['vertical_angle'] and float(r['vertical_angle']) != 0:
        p['vpa'] = round(float(r['vertical_angle']), 2)
    if r['is_flyover']:
        p['over'] = True
    return p


LEG_COLS = 'type, alt_descriptor, turn_direction, rnp, fix_ident, fix_lonx, fix_laty, is_flyover, course, distance, altitude1, altitude2, speed_limit, vertical_angle'


def _rows(con, sql, args=()):
    cur = con.execute(sql, args)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def _runways(name):
    m = re.fullmatch(r'(?:RW)?(\d\d)([LRCB]?)', (name or '').strip().upper())
    if not m:
        return []
    return [m.group(1) + 'L', m.group(1) + 'R'] if m.group(2) == 'B' else [m.group(1) + m.group(2)]


def procedures_of(con, icao, ref):
    """Les fiches d'un terrain de cette base : (liste, terrain trouvé). Une fiche par procédure et par piste, et par transition (la transition suivie des tronçons de la procédure, comme le CIFP)."""
    ap = _rows(con, 'select airport_id from airport where ident = ? or icao = ?', (icao, icao))
    if not ap:
        return [], False
    out = []
    for a in _rows(con, 'select approach_id, runway_name, type, suffix, arinc_name, fix_ident from approach where airport_id = ? order by approach_id', (ap[0]['airport_id'],)):
        if len(out) >= MAX_PROCEDURES:
            break
        suffix = (a['suffix'] or '').strip().upper()
        kind = 'SID' if suffix == 'D' else 'STAR' if suffix == 'A' else 'APP'
        name = (a['fix_ident'] if kind != 'APP' else a['arinc_name'] or f'{a["type"]}{a["runway_name"] or ""}{suffix}').strip()
        if not name:
            continue
        runways = _runways(a['runway_name']) or _runways(a['arinc_name']) if kind != 'APP' else (_runways(a['runway_name']) or _runways(re.sub(r'^[A-Z]', '', a['arinc_name'] or '')))
        norm = re.sub(r'[\s-]+', '', name.upper())
        rw = f'RW{runways[0]}' if len(runways) == 1 else 'RWALL'
        legs = _rows(con, f'select is_missed, {LEG_COLS} from approach_leg where approach_id = ? order by approach_leg_id limit ?', (a['approach_id'], MAX_LEGS))
        main = []
        missed = False
        for r in legs:
            p = _leg(r)
            missed = missed or bool(r['is_missed'])
            p['phase'] = 'missed' if missed else 'main'
            main.append(p)
        extra = {'type': APP_TYPES.get(a['type'], a['type'])} if kind == 'APP' else {}
        base = {'icao': icao, 'kind': kind, 'name': name, 'runways': runways, 'source': {'kind': 'lnm', 'ref': ref}, 'status': 'lnm', 'lnm': True, **extra}

        def rec(trans, pts):
            for i, p in enumerate(pts, 1):
                p['seq'] = i
            out.append({'id': '.'.join([icao, kind, norm, rw] + ([re.sub(r'[\s-]+', '', trans.upper())] if trans else [])), **base, 'transition': trans or None, 'points': pts})
        if main:
            rec(None, main)
        for t in _rows(con, 'select transition_id, fix_ident from transition where approach_id = ? order by transition_id', (a['approach_id'],)):
            if len(out) >= MAX_PROCEDURES:
                break
            tl = []
            for r in _rows(con, f'select {LEG_COLS} from transition_leg where transition_id = ? order by transition_leg_id limit ?', (t['transition_id'], MAX_LEGS)):
                p = _leg(r)
                p['phase'] = 'trans'
                tl.append(p)
            if tl and (t['fix_ident'] or '').strip():
                joined = tl + [dict(p) for p in (main[1:] if main and main[0]['id'] and tl[-1]['id'] == main[0]['id'] else main)]
                rec(t['fix_ident'].strip(), joined)
    return out, True


def run(job, args, ctx):
    icao = args['icao']
    if not args['personal']:
        return {'ok': False, 'reason': 'not-personal', 'icao': icao}
    folder = folder_of(ctx)
    found = candidates(folder) if folder else []
    if not found:
        return {'ok': False, 'reason': 'no-lnm', 'icao': icao}
    seen = unreadable = 0
    for n, (kind, path) in enumerate(found):
        job.step(f'{icao}: little_navmap_{kind}.sqlite', n, len(found), 'bases')
        if job.cancelled():
            return {'ok': False, 'reason': 'unreadable', 'icao': icao}
        try:
            uri = 'file:' + urllib.parse.quote(path.replace('\\', '/'), safe='/:') + '?mode=ro&immutable=1'      # tout le chemin est échappé (SQLite décode l'URI : un dossier « 100%41 » devenait « 100A »)
            con = sqlite3.connect(uri, uri=True, timeout=5)
            try:
                procs, there = procedures_of(con, icao, os.path.basename(path))
            finally:
                con.close()
        except (sqlite3.Error, OSError, ValueError, KeyError):
            unreadable += 1
            continue
        if there:
            seen += 1
        if procs:
            return {'ok': True, 'icao': icao, 'source': 'lnm', 'base': os.path.basename(path), 'count': len(procs), 'notice': NOTICE, '_procedures': procs}
    if seen:
        return {'ok': False, 'reason': 'no-procedures', 'icao': icao}
    if unreadable == len(found):
        return {'ok': False, 'reason': 'unreadable', 'icao': icao}
    return {'ok': False, 'reason': 'not-found', 'icao': icao}


VERBS = {('proc', 'lnm'): (run, check)}
