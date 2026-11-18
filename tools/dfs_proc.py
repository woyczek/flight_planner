"""Les procédures (SID, STAR, approches) de la DFS : le jeu « ED Procedure » (AIXM 5.1, 83 Mo) au schéma commun d'aerodb (frame/aerodb/SPEC.md § 5 quinquies).

Un fichier par terrain `<out>/<cycle>/<OACI>.json` (le fichier d'une AUTRE source n'est jamais écrasé) et l'index du cycle, statut « official » (donnée de la DFS reprise telle quelle : CC BY 4.0, crédit DFS ;
Q-0114). Bibliothèque standard seulement. Le fichier est de la DFS (somme SHA-512 vérifiée par aero_fetch) mais reste une ENTRÉE NON FIABLE : lecture EN FLUX (`iterparse`, chaque élément vidé après lecture : la
mémoire ne croît pas avec le fichier), DOCTYPE et entités refusés, un budget d'éléments, de temps, de procédures, de tronçons par procédure et de points au total ; aucun nom de fichier, chemin ni adresse n'est tiré
du contenu ; chaque champ est validé ; la sortie est écrite d'un bloc (fichier temporaire puis remplacement), à nom fixe, de taille bornée.

Ce que la conversion fait : chaque procédure d'un terrain donne un enregistrement par piste (et par transition) comme le CIFP de la FAA (tools/proc_cifp.py) ; un tronçon a son terminateur ARINC (`leg`), son point
(identifiant, position), son altitude (`alt`), son cap (`trk` vrai ou `crs` magnétique), sa distance (`nm`), sa vitesse (`kt`), son sens de virage (`turn`), le survol (`over`), la phase `missed`. Ce qu'elle ne fait PAS :
les attentes (HM, HA, HF : le schéma n'a pas de clé pour elles, décision du relais) sont comptées et dites dans `warnings` ; un arc à rayon constant (RF) garde son terminateur sans centre, la fiche est en doute
`rf-arc` ; un tronçon sans point dont le terminateur en demande un est en doute `unresolved`, jamais un point inventé.
"""
import json
import os
import re
import time
import xml.etree.ElementTree as ET

import safe_json
from datetime import datetime, timezone

MAX_BYTES = 120 * 1024 * 1024
MAX_ELEMENTS = 40_000_000
MAX_POINT_ELEMENTS = 12_000_000      # les fichiers de points (ED Waypoints, ED Navaids : 15 Mo), du dossier SYNCHRONISÉ
MAX_SECONDS = 600.0
MAX_PROCEDURES = 20_000
MAX_LEGS_PER_PROCEDURE = 600
MAX_POINTS_TOTAL = 400_000
MAX_LEGS = 200_000
MAX_POINTS_FILE = 20_000_000
MAX_OUT_BYTES = 24 * 1024 * 1024
ICAO = re.compile(r'[A-Z]{4}\Z', re.A)
IDENT = re.compile(r'[A-Z0-9]{1,12}\Z', re.A)
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z', re.A)
RWY = re.compile(r'\d{2}[LRCB]?\Z', re.A)
HOLDS = ('HM', 'HA', 'HF')
FIXLESS = ('CA', 'CD', 'CI', 'CR', 'VA', 'VD', 'VI', 'VM', 'VR', 'FM')      # les terminateurs dont le tronçon n'a pas de point : le cap jusqu'à une altitude, une distance, un radial, un guidage
LEG_TAGS = ('DepartureLeg', 'ArrivalLeg', 'InitialLeg', 'IntermediateLeg', 'FinalLeg', 'MissedApproachLeg', 'ArrivalFeederLeg')
PROC_TAGS = {'StandardInstrumentDeparture': 'SID', 'StandardInstrumentArrival': 'STAR', 'InstrumentApproachProcedure': 'APP'}
DIGITS = {'ZERO': '0', 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9'}
LETTERS = {w: w[0] for w in ('ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER', 'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM',
                                                'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU')}
LETTERS.update({'JULIETT': 'J', 'X-RAY': 'X'})
APP_TYPES = (('ILS', 'ILS'), ('LOC', 'LOC'), ('RNP', 'RNP'), ('RNAV', 'RNAV'), ('GNSS', 'RNAV'), ('LPV', 'RNAV'), ('VOR', 'VOR'), ('NDB', 'NDB'))
NOTICE = ('Procédures de la DFS Deutsche Flugsicherung GmbH (jeu « ED Procedure », AIXM 5.1), CC BY 4.0, crédit DFS ; données reprises telles quelles, non destinées à la navigation ; '
          'la fiche du jeu avertit que des tronçons de certaines procédures peuvent être incomplets.')


_DOCTYPE = re.compile(rb'<!(?:DOCTYPE|ENTITY)', re.I)


def _has_doctype(path):
    """Vrai si le fichier contient, N'IMPORTE OÙ, une déclaration de DOCTYPE ou d'entité (`<!DOCTYPE`, `<!ENTITY` : une entité n'est jamais définie ailleurs) : lu en entier par blocs de 1 Mo, un chevauchement de 12 octets (un DOCTYPE après 100 Ko de commentaires est vu). L'analyseur
    d'ElementTree (C) n'expose pas les rappels d'expat : le refus se fait AVANT lui, et la protection d'expat contre l'amplification reste la seconde garde. Un AIXM de la DFS n'a ni l'un ni l'autre."""
    tail = b''
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(1 << 20)
            if not chunk:
                return False
            buf = tail + chunk
            if _DOCTYPE.search(buf):
                return True
            tail = buf[-12:]


def _local(tag):
    return tag.rsplit('}', 1)[-1]


def _attr(el, name):
    for k, v in el.attrib.items():
        if k.rsplit('}', 1)[-1] == name:
            return v
    return ''


def _uuid(href):
    h = (href or '').rsplit(':', 1)[-1]
    return h if UUID.fullmatch(h) else ''


def _first(el, name):
    for c in el.iter():
        if _local(c.tag) == name:
            return c
    return None


def _text(el, name):
    c = _first(el, name) if el is not None else None
    return (c.text or '').strip() if c is not None else ''


def _num(text):
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    return v if v == v and abs(v) < 1e9 else None


def _feet(el):
    """Une limite verticale (pieds) d'un élément `lowerLimitAltitude` / `upperLimitAltitude` ; None si absente ou invalide."""
    if el is None:
        return None
    v = _num((el.text or '').strip())
    if v is None:
        return None
    u = (el.get('uom') or '').upper()
    ft = v * 100 if u == 'FL' else v * 3.28084 if u == 'M' else v
    return int(round(ft)) if -2000 <= ft <= 99900 else None


def _posend(leg):
    """La dernière position (lat, lon) de la courbe d'un tronçon ; None si elle manque ou est invalide."""
    for c in leg.iter():
        if _local(c.tag) == 'posList':
            try:
                n = [float(x) for x in (c.text or '').split()]
            except ValueError:
                return None
            if len(n) >= 4 and len(n) % 2 == 0 and -90 <= n[-2] <= 90 and -180 <= n[-1] <= 180:
                return (round(n[-2], 6), round(n[-1], 6))
    return None


def designator(name, icao):
    """Le nom déposé d'une SID / STAR d'après le titre de la DFS : « EDBH PEROM TWO GOLF » → « PEROM2G » (le terrain en tête est retiré, le chiffre et la lettre dits en toutes lettres sont écrits) ; un titre qui n'a pas cette forme est gardé tel quel."""
    toks = [t for t in re.split(r'\s+', (name or '').strip().upper()) if t]
    if toks and toks[0] == icao:
        toks = toks[1:]
    if len(toks) >= 3 and toks[-2] in DIGITS and toks[-1] in LETTERS:
        return ''.join(toks[:-2]) + DIGITS[toks[-2]] + LETTERS[toks[-1]]
    if len(toks) >= 2 and toks[-1] in DIGITS:
        return ''.join(toks[:-1]) + DIGITS[toks[-1]]
    return ' '.join(toks)


def points_of(paths):
    """({ uuid : (désignateur, lat, lon) }, raison) des DesignatedPoint et des Navaid des fichiers donnés (ED Waypoints, ED Navaids : du dossier SYNCHRONISÉ, que n'importe quel pilote peut remplacer : refusés comme le fichier des procédures) ; lat, lon None quand le fichier ne les donne pas ;
    un fichier absent est ignoré ; raison : None, doctype, too-big, too-many, too-slow, unreadable (le premier refus : les points lus jusque-là sont rendus, le verbe s'arrête)."""
    out = {}
    began, count = time.monotonic(), 0
    for path in paths:
        try:
            if os.path.getsize(path) > MAX_BYTES:
                return out, 'too-big'
            if _has_doctype(path):
                return out, 'doctype'
            root = None
            for ev, el in ET.iterparse(path, events=('start', 'end')):
                count += 1
                if count > MAX_POINT_ELEMENTS:
                    return out, 'too-many'
                if count % 100_000 == 0 and time.monotonic() - began > MAX_SECONDS:
                    return out, 'too-slow'
                if ev == 'start':
                    root = el if root is None else root
                    continue
                n = _local(el.tag)
                if n in ('DesignatedPoint', 'Navaid'):
                    u = _text(el, 'identifier')
                    d = _text(el, 'designator')
                    if UUID.fullmatch(u) and IDENT.fullmatch(d) and len(out) < MAX_POINTS_FILE:
                        pos = None
                        loc = _first(el, 'location')
                        p = _first(loc, 'pos') if loc is not None else None
                        if p is not None:
                            v = [_num(x) for x in (p.text or '').split()]
                            if len(v) >= 2 and None not in v[:2] and -90 <= v[0] <= 90 and -180 <= v[1] <= 180:
                                pos = (round(v[0], 6), round(v[1], 6))
                        out[u] = (d, pos[0] if pos else None, pos[1] if pos else None)
                if n == 'hasMember':
                    el.clear()
                    if root is not None:
                        root.clear()
        except ValueError:
            return out, 'doctype'
        except (ET.ParseError, MemoryError, RecursionError):
            return out, 'unreadable'
        except OSError:
            continue
    return out, None


def _constraint(el, lower, upper):
    """La contrainte d'altitude du schéma commun d'après l'interprétation AIXM et les deux limites ; None si rien de clair."""
    kind = _text(el, 'altitudeInterpretation')
    if kind in ('ABOVE_LOWER', 'ATORABOVE_LOWER') and lower is not None:
        return {'type': 'min', 'ft': lower}
    if kind == 'AT_LOWER' and lower is not None:
        return {'type': 'at', 'ft': lower}
    if kind in ('BELOW_UPPER', 'ATORBELOW_UPPER') and upper is not None:
        return {'type': 'max', 'ft': upper}
    if kind == 'AT_UPPER' and upper is not None:
        return {'type': 'at', 'ft': upper}
    if kind == 'BETWEEN' and lower is not None and upper is not None:
        return {'type': 'between', 'ft': upper, 'ft2': lower}
    return None


def _leg(el, tag, names):
    """Le tronçon d'un élément de tronçon : (uuid, tronçon) ; le point est résolu par `names` (uuid → (désignateur, lat, lon)) ; None si le tronçon n'a pas d'identifiant."""
    u = _text(el, 'identifier')
    if not UUID.fullmatch(u):
        return None
    term = _text(el, 'legTypeARINC')
    ref = ''
    for side in ('endPoint', 'startPoint'):      # le point du tronçon (son terminateur ARINC) : `endPoint` quand la DFS le donne, sinon `startPoint` (c'est ainsi que la DFS code la plupart des DF et des TF : 1 569 tronçons de départ sur 2 821 n'ont que celui-là)
        ep = _first(el, side)
        if ep is not None:
            for c in ep.iter():
                if _local(c.tag).startswith('pointChoice_'):
                    ref = _uuid(_attr(c, 'href'))
                    break
        if ref:
            break
    name, lat, lon = names.get(ref, (None, None, None)) if ref else (None, None, None)
    curve = _posend(el)
    if lat is None and curve and ref:
        lat, lon = curve
    low, up = _feet(_first(el, 'lowerLimitAltitude')), _feet(_first(el, 'upperLimitAltitude'))
    p = {'id': name, 'lat': lat, 'lon': lon, 'alt': _constraint(el, low, up), 'leg': term}
    crs = _num(_text(el, 'course'))
    if crs is not None and 0 <= crs <= 360:
        p['trk' if _text(el, 'courseType') == 'TRUE_BRG' else 'crs'] = round(crs % 360, 1)
    ln = _num(_text(el, 'length'))
    if ln is not None and 0 <= ln < 1000:
        p['nm'] = round(ln, 2)
    kt = _num(_text(el, 'speedLimit'))
    if kt is not None and 0 < kt < 600:
        p['kt'] = int(kt)
    va = _num(_text(el, 'verticalAngle'))
    if va is not None and 0 < abs(va) < 15:
        p['vpa'] = round(va, 2)
    td = _text(el, 'turnDirection')
    if td in ('LEFT', 'RIGHT'):
        p['turn'] = td[0]
    if _text(el, 'flyOver') == 'YES':
        p['over'] = True
    if tag == 'MissedApproachLeg':
        p['phase'] = 'missed'
    p['_ref'] = bool(ref)
    return u, p


def _transition(el):
    """{ id, type, runway, legs: [(seq, uuid)] } d'une transition de procédure."""
    rwy = ''
    for c in el.iter():
        if _local(c.tag) == 'runway':
            t = _attr(c, 'title').strip().upper()
            rwy = t if RWY.fullmatch(t) else rwy
    legs = []
    for tl in el.iter():
        if _local(tl.tag) == 'ProcedureTransitionLeg':
            seq = _num(_text(tl, 'seqNumberARINC'))
            sl = _first(tl, 'theSegmentLeg')
            u = _uuid(_attr(sl, 'href')) if sl is not None else ''
            if u and seq is not None and len(legs) < MAX_LEGS_PER_PROCEDURE:
                legs.append((seq, u))
    t = _text(el, 'transitionId')
    return {'id': t if IDENT.fullmatch(t) else '', 'type': _text(el, 'type'), 'runway': rwy, 'legs': sorted(legs)}


def _procedure(el, kind):
    icao = ''
    for c in el.iter():
        if _local(c.tag) == 'airportHeliport':
            icao = _attr(c, 'title').strip().upper()
            break
    if not ICAO.fullmatch(icao):
        return None
    ts = [_transition(t) for t in el.iter() if _local(t.tag) == 'ProcedureTransition']
    return {'icao': icao, 'kind': kind, 'title': _text(el, 'name')[:120], 'transitions': ts}


def read(path, names):
    """({ uuid : tronçon }, [procédure]) du fichier ED Procedure ; (None, motif) si le fichier est refusé : missing, too-big, doctype, unreadable, too-many, too-slow."""
    try:
        size = os.path.getsize(path)
        refused = size <= MAX_BYTES and _has_doctype(path)
    except OSError:
        return None, 'missing'
    if size > MAX_BYTES:
        return None, 'too-big'
    if refused:
        return None, 'doctype'
    legs, procs = {}, []
    began, count, root = time.monotonic(), 0, None
    try:
        for ev, el in ET.iterparse(path, events=('start', 'end')):
            count += 1
            if count > MAX_ELEMENTS:
                return None, 'too-many'
            if count % 100_000 == 0 and time.monotonic() - began > MAX_SECONDS:
                return None, 'too-slow'
            if ev == 'start':
                root = el if root is None else root
                continue
            n = _local(el.tag)
            if n in LEG_TAGS:
                r = _leg(el, n, names)
                if r and len(legs) < MAX_LEGS:
                    legs[r[0]] = r[1]
            elif n in PROC_TAGS:
                p = _procedure(el, PROC_TAGS[n])
                if p and len(procs) < MAX_PROCEDURES:
                    procs.append(p)
            if n == 'hasMember':
                el.clear()
                if root is not None:
                    root.clear()
    except ValueError:
        return None, 'doctype'
    except (ET.ParseError, MemoryError, RecursionError):
        return None, 'unreadable'
    return (legs, procs), None


def _points(transition, legs, stats, local):
    """Les points d'une transition, dans l'ordre ; les attentes sont comptées et laissées de côté."""
    out = []
    for _, u in transition['legs']:
        p = legs.get(u)
        if p is None:
            stats['missing'] += 1
            local['missing'] += 1
            continue
        if p['leg'] in HOLDS:
            stats['holds'] += 1
            continue
        out.append(dict(p))
    return out


def _clean(points, stats, doubts):
    out = []
    for i, p in enumerate(points, 1):
        ref = p.pop('_ref', False)
        if p['leg'] in FIXLESS or (p['id'] is None and p['lat'] is None):
            if p['leg'] not in FIXLESS:
                doubts.add('unresolved')
                stats['unresolved'] += 1
            else:
                stats['fixless'] += 1
        elif p['id'] is None and ref:
            doubts.add('unresolved')
            stats['unresolved'] += 1
        if p['leg'] == 'RF':
            doubts.add('rf-arc')
            stats['rf'] += 1
        p['seq'] = i
        out.append(p)
    return out


def _app_type(title):
    up = (title or '').upper()
    for key, val in APP_TYPES:
        if re.search(r'\b' + key, up):
            return val
    return None


def build(legs, procs):
    """({ OACI : { procedures, runways, warnings } }, comptes) : les procédures du fichier au schéma commun."""
    docs, stats = {}, {'holds': 0, 'missing': 0, 'fixless': 0, 'unresolved': 0, 'rf': 0, 'procedures': 0, 'points': 0}
    for pr in procs:
        icao, kind = pr['icao'], pr['kind']
        by = lambda *types: [t for t in pr['transitions'] if t['type'] in types]
        recs = []
        local = {'missing': 0}      # les tronçons cités par une transition de CETTE procédure et absents du fichier

        def add(name, runways, trans, seqs, extra=None):
            doubts = set()
            pts = [p for s in seqs for p in s]
            if not pts or stats['points'] + len(pts) > MAX_POINTS_TOTAL:
                return
            pts = _clean(pts, stats, doubts)
            if local['missing']:
                doubts.add('unresolved')
            norm = re.sub(r'[^A-Z0-9]', '', name.upper())      # Security : rien d'autre que des lettres et des chiffres du titre de la DFS dans un identifiant
            if not norm:
                return
            rw = f'RW{runways[0]}' if len(runways) == 1 else 'RWALL'
            rec = {'id': '.'.join([icao, kind, norm, rw] + ([trans] if trans else [])), 'icao': icao, 'kind': kind, 'name': name, 'runways': runways, 'transition': trans or None, 'points': pts,
                   'source': {'kind': 'dfs', 'ref': 'ED Procedure'}, 'status': 'doubt' if doubts else 'official'}
            if doubts:
                rec['doubt'] = ','.join(sorted(doubts))
            if extra:
                rec.update(extra)
            recs.append(rec)
            stats['points'] += len(pts)
        if kind in ('SID', 'STAR'):
            name = designator(pr['title'], icao)
            if not name:
                continue
            common = by('COMMON')
            rwys = by('RWY') or [None]
            enr = by('EN_ROUTE', 'ENROUTE', 'ENROUTE_TRANSITION', 'TRANSITION')
            for r in rwys:
                part = [_points(r, legs, stats, local)] if r else []
                cm = [_points(c, legs, stats, local) for c in common]
                seqs = part + cm if kind == 'SID' else cm + part
                add(name, [r['runway']] if r and r['runway'] else [], None, seqs)
            for e in enr:
                if e['id']:
                    add(name, [], e['id'], [_points(e, legs, stats, local)])
        else:
            title = (pr['title'] or '').split(':', 1)[-1].strip() or pr['title']
            final = by('FINAL')
            miss = by('MISSED', 'MISS')
            trans = by('APPROACH')
            runway = next((t['runway'] for t in final + trans if t['runway']), '')
            extra = {'type': _app_type(pr['title'])} if _app_type(pr['title']) else {}
            fl = [_points(f, legs, stats, local) for f in final] + [_points(m, legs, stats, local) for m in miss]
            add(title, [runway] if runway else [], None, fl, extra)
            main = [p for s in [_points(f, legs, stats, local) for f in final] for p in s]
            for t in trans:
                if t['id']:
                    tl = _points(t, legs, stats, local)
                    rest = main[1:] if tl and main and tl[-1]['id'] and tl[-1]['id'] == main[0]['id'] else main
                    add(title, [runway] if runway else [], t['id'], [tl, [dict(p) for p in rest]] + [_points(m, legs, stats, local) for m in miss], extra)
        if recs:
            d = docs.setdefault(icao, {'procedures': [], 'runways': [], 'warnings': []})
            d['procedures'].extend(recs)
            stats['procedures'] += len(recs)
    for d in docs.values():
        n = {'SID': 0, 'STAR': 0, 'APP': 0}
        for p in d['procedures']:
            n[p['kind']] += 1
        d['counts'] = n
    return docs, stats


def warnings_of(stats):
    w = []
    if stats['holds']:
        w.append(f"{stats['holds']} attente(s) (HM, HA, HF) NON lue(s) : le schéma n'a pas de clé pour elles")
    if stats['fixless']:
        w.append(f"{stats['fixless']} tronçon(s) sans point (cap jusqu'à une altitude, une distance, un radial) gardés sans position")
    if stats['unresolved']:
        w.append(f"{stats['unresolved']} tronçon(s) dont le point n'est pas résolu : fiche en doute `unresolved`")
    if stats['rf']:
        w.append(f"{stats['rf']} arc(s) à rayon constant (RF) gardés sans centre : fiche en doute `rf-arc`")
    if stats['missing']:
        w.append(f"{stats['missing']} tronçon(s) cités par une transition et absents du fichier (données incomplètes de la DFS) : non retenus")
    return w


def write(out, docs, effective, stats):
    """Écrit `<out>/<effective>/<OACI>.json` et fusionne l'index ; rend { terrains, procedures, gardés (fichiers d'une autre source) }."""
    folder = os.path.join(out, effective)
    os.makedirs(folder, exist_ok=True)
    idx_path = os.path.join(folder, 'index.json')
    index = {'schema': 1, 'cycle': effective, 'aerodromes': {}}
    old, why = safe_json.read(idx_path, MAX_OUT_BYTES, encoding='utf-8')      # le dossier data/proc/ est SYNCHRONISÉ : un index lu comme une entrée non fiable (borné, profondeur, valeurs)
    if not why and isinstance(old, dict) and isinstance(old.get('aerodromes'), dict):
        for k, v in list(old['aerodromes'].items())[:5000]:
            if isinstance(k, str) and ICAO.fullmatch(k) and isinstance(v, dict):
                index['aerodromes'][k] = {kk: vv for kk, vv in v.items() if kk in ('SID', 'STAR', 'APP') and isinstance(vv, int) and not isinstance(vv, bool) and 0 <= vv < 10 ** 6} | (
                    {'status': v['status']} if isinstance(v.get('status'), str) and re.fullmatch(r'[a-z]{1,16}', v['status']) else {})
    written, kept = 0, []
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    warn = warnings_of(stats)
    for icao, d in sorted(docs.items()):
        path = os.path.join(folder, f'{icao}.json')
        prev, why = safe_json.read(path, MAX_OUT_BYTES, encoding='utf-8')
        if why not in ('missing',):
            first = ((prev.get('procedures') or [{}])[0] if isinstance(prev, dict) and isinstance(prev.get('procedures'), list) else {})
            if why or not isinstance(first, dict) or not isinstance(first.get('source'), dict) or first['source'].get('kind') != 'dfs':      # le fichier d'une autre source, ou illisible : gardé
                kept.append(icao)
                continue
        for p in d['procedures']:
            p['source'].update({'cycle': effective, 'at': effective})
        doc = {'schema': 1, 'icao': icao, 'cycle': effective, 'updated_at': now, 'procedures': d['procedures'], 'runways': d['runways'], 'warnings': warn, 'notice': NOTICE}
        text = json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n'
        if len(text.encode('utf-8')) > MAX_OUT_BYTES:
            continue
        tmp = path + '.part'
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(text)
        os.replace(tmp, path)
        index['aerodromes'][icao] = {**d['counts'], 'status': 'official'}
        written += 1
    tmp = idx_path + '.part'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, idx_path)
    return {'aerodromes': written, 'procedures': stats['procedures'], 'kept': kept}
