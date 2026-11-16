#!/usr/bin/env python3
"""Matrice de vols de l'Atlantique Nord (SOG-0354, lot L5 point 4, § 13.3 de docs/technique/V3_ROUTE_GATES.md).

144 demandes (6 aérodromes d'Europe x 6 d'Amérique du Nord x 2 sens x 2 heures) sur la VRAIE base de l'utilisateur, en LECTURE SEULE :
  - UN seul processus, les demandes l'une après l'autre, priorité basse (IDLE_PRIORITY_CLASS), par paquets de 12 (une pause et un fichier d'arrêt entre deux paquets) ;
  - AUCUN accès au réseau (les connexions sont refusées dans ce processus) : les routes NAT sont celles DÉJÀ lues dans la base (périmées ou non, la réponse le dit) ;
  - le cache des résultats est coupé, les caches du graphe sont vidés avant chaque demande (le pire cas : c'est lui que la borne de 20 s doit tenir) ;
  - le chargement du contexte (la base, le RAD) est mesuré À PART, une fois par date de vol, avant les demandes ;
  - rien n'est corrigé pendant la passe : les défauts sont listés.
Le détail (une ligne JSON par demande, AVEC le texte de la route) va dans le dossier --out (data/local/route_matrix/, jamais commité) ; une ligne d'avancement par demande
dans progress.txt du même dossier ; `--summary` écrit le tableau réduit SANS texte de route (table.md) et le résumé. Bibliothèque standard seulement.

Les heures : « dans la fenêtre » = l'heure de PASSAGE à l'entrée de l'océan tombe au milieu de la fenêtre du message de ce sens (la règle du 16/11 : l'heure d'une route NAT se lit au
passage de l'entrée, pas au départ) ; le départ est le milieu de la fenêtre moins le temps estimé jusqu'à l'entrée (distance / 450 kt). « Hors fenêtre » : 12 h plus tôt (sens
Europe → Amérique) ou 12 h plus tard (sens Amérique → Europe), le même jour que le message.
"""
import argparse
import datetime as dt
import json
import math
import os
import socket
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

EUROPE = ['EIDW', 'EGLL', 'LFPG', 'EHAM', 'EDDF', 'LEMD']
AMERICA = ['KJFK', 'KBOS', 'KORD', 'CYYZ', 'KLAX', 'KSFO']
FL = 370
PACK = 12
PAUSE_S = 5.0
LIMIT_S, HARD_S = 5.0, 20.0
GROUND_KT = 450.0
SHORT = {'computed': 'c', 'published': 'p', 'created': 'r', 'direct': 'd'}      # preuves : c calculée, p publiée, r créée (route libre), d direct
# l'entrée approximative de l'océan, seulement pour calculer l'heure de départ (lat, lon)
GATE_WEST, GATE_EAST = (55.0, -15.0), (47.0, -50.0)


def nm(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 3440.065 * math.asin(math.sqrt(h))


def no_network():
    """Refuse toute connexion réseau dans ce processus (les routes NAT viennent de la base)."""
    def refuse(*a, **k):
        raise OSError('réseau refusé : la matrice de vols ne lit que la base')
    socket.socket.connect = refuse
    socket.socket.connect_ex = refuse
    socket.create_connection = refuse


def low_priority():
    try:
        import ctypes
        ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x00000040)      # IDLE_PRIORITY_CLASS
        return 'idle'
    except Exception:
        try:
            os.nice(19)
            return 'nice19'
        except Exception:
            return 'normale (non réglée)'


def windows(data):
    """{ 'W': (de, à), 'E': (de, à) } : la fenêtre des messages de la base pour chaque sens (W = Europe → Amérique : les routes qui vont vers l'ouest)."""
    with open(os.path.join(data, 'sia', 'zones', 'nat', 'nat_tracks.json'), encoding='utf-8') as f:
        tracks = json.load(f).get('tracks') or []
    out = {}
    for sense, key in (('W', 'west'), ('E', 'east')):
        ws = [(t['from'], t['to']) for t in tracks if t.get(key) and t.get('from') and t.get('to')]
        if ws:
            out[sense] = (min(a for a, _ in ws), max(b for _, b in ws))
    return out


def stamp(text):
    return dt.datetime.fromisoformat(text.replace('Z', '+00:00')).astimezone(dt.timezone.utc).replace(tzinfo=None)


def positions(data):
    """{ icao: (lat, lon) } des aérodromes de la matrice, lus dans l'index aéro de la base (zones sia/base) ; absent : None."""
    found = {}
    base = os.path.join(data, 'sia', 'base')
    for zone in sorted(os.listdir(base)):
        zdir = os.path.join(base, zone)
        if not os.path.isdir(zdir):
            continue
        for cycle in sorted(os.listdir(zdir)):
            f = os.path.join(zdir, cycle, 'aeroindex.json')
            if not os.path.isfile(f):
                continue
            try:
                with open(f, encoding='utf-8') as fh:
                    rows = json.load(fh)['data']
            except (OSError, ValueError, KeyError):
                continue
            names = rows['fields']
            for r in rows['rows']:
                d = dict(zip(names, r))
                if d.get('icao') in EUROPE + AMERICA:
                    found[d['icao']] = (d['lat'], d['lon'])
    return found


def requests_of(data):
    win = windows(data)
    pos = positions(data)
    items = []
    for sense, origins, dests in (('W', EUROPE, AMERICA), ('E', AMERICA, EUROPE)):
        if sense not in win:
            continue
        a, b = stamp(win[sense][0]), stamp(win[sense][1])
        mid = a + (b - a) / 2
        gate = GATE_WEST if sense == 'W' else GATE_EAST
        for dep in origins:
            for arr in dests:
                if dep not in pos or arr not in pos:
                    t_est = 0.0
                else:
                    t_est = nm(pos[dep], gate) / GROUND_KT
                inside = mid - dt.timedelta(hours=t_est)
                inside = inside.replace(minute=(inside.minute // 10) * 10, second=0, microsecond=0)
                outside = inside + dt.timedelta(hours=-12 if sense == 'W' else 12)
                for slot, when in (('in', inside), ('out', outside)):
                    items.append({'id': f'{dep}-{arr}-{sense}-{slot}', 'dep': dep, 'arr': arr, 'sense': sense, 'slot': slot, 'date': when.strftime('%Y-%m-%dT%H:%M'),
                                  'window': [win[sense][0], win[sense][1]], 'est_to_entry_h': round(t_est, 2)})
    items.sort(key=lambda x: (x['date'][:10], x['sense'], x['dep'], x['arr'], x['slot']))      # par date de vol : les deux contextes restent chauds
    return items


def code_of(res, view):
    """Un code court de la raison quand il n'y a pas de route calculée ; '' sinon."""
    primary = res.get('primary') or {}
    sec = res.get('sections') or {}
    free = sec.get('free') or {}
    text = ' '.join(str(x) for x in (primary.get('error'), sec.get('reason'), free.get('reason'), view.get('message')) if x)
    if 'udget' in text:
        return 'budget'
    for key, code in (('aucun point d\'entrée', 'no_point'), ('atteignable', 'no_reach'), ('aucune chaîne', 'no_chain'), ('Aucune route NAT valable', 'no_valid_track')):
        if key in text:
            return code
    return 'other' if text else 'unknown'


def one(P, view, item, root, rad, fra_file):
    args = {'action': 'compute', 'adep': item['dep'], 'adest': item['arr'], 'fl': FL, 'date': item['date'], 'alternatives': False, 'proposals': True}
    rec = dict(item, started=dt.datetime.now().isoformat(timespec='seconds'))
    for v in P._CONTEXTS.values():          # le pire cas : le graphe est construit à chaque demande
        v['nav'].release_graph_caches()
    t0 = time.perf_counter()
    try:
        request = view.to_request(args)
        res = P.compute(request, root, rad, fra_file)
        rec['wall_s'] = round(time.perf_counter() - t0, 2)
        v = view.to_view(res, request)
    except Exception as e:      # une demande refusée ou en panne : notée, la passe continue
        rec.update(wall_s=round(time.perf_counter() - t0, 2), status='error', ok=False, error=f'{type(e).__name__}: {str(e)[:300]}', code='error')
        return rec
    p = res.get('primary') or {}
    sec = res.get('sections') or {}
    tim = res.get('timing') or {}
    legs = p.get('legs') or []
    proofs = [(s.get('name'), s.get('proof'), s.get('nm')) for s in sec.get('sections') or []]
    steps = tim.get('sections') or []
    directs = [{'from': (l.get('start') or {}).get('id'), 'to': (l.get('end') or {}).get('id'), 'nm': l.get('nm'), 'nat_link': bool(l.get('nat_link')), 'origin': l.get('origin'), 'fra': bool(l.get('fra_area'))}
               for l in legs if l.get('via') == 'DCT' and (l.get('nm') or 0) > 200]
    rec.update(
        status=v.get('status'), ok=bool(p.get('ok')), nm=p.get('distance_nm'), route=p.get('route'), error=p.get('error'), message=v.get('message'),
        source=sec.get('source') or (('track ' + str(sec.get('chosen'))) if sec.get('chosen') else None), chosen=sec.get('chosen'), proofs=proofs, free=sec.get('free'), depart=sec.get('depart'),
        rejected=[(r.get('track'), r.get('code')) for r in sec.get('rejected') or []],
        timing={k: tim.get(k) for k in ('context_s', 'tracks_s', 'graph_s', 'skeleton_s', 'total_s')}, steps=steps,
        hit=[s.get('name') for s in steps if s.get('hit')], budget=res.get('budget'),
        proposals=len((res.get('recovery') or {}).get('proposals') or []), directs=directs,
        directs_unexplained=[d for d in directs if not d['nat_link'] and d['origin'] != 'random'],
        code=('' if v.get('status') == 'computed' else code_of(res, v)))
    return rec


def run(args):
    no_network()
    prio = low_priority()
    data = os.path.abspath(args.data)
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    from route_engine import plan as P, view, engine, results_cache, fra
    results_cache.ENABLED = False
    root = data
    rad = os.path.join(data, 'route', 'rad.json.gz')
    fra_file = os.path.join(data, 'route', 'fra.json.gz')
    items = requests_of(data)
    if args.limit:
        items = items[:args.limit]
    detail = os.path.join(out, 'detail.jsonl')
    progress = os.path.join(out, 'progress.txt')
    stop = os.path.join(out, 'STOP')
    done = set()
    if os.path.isfile(detail):
        with open(detail, encoding='utf-8') as f:
            for line in f:
                try:
                    done.add(json.loads(line)['id'])
                except ValueError:
                    pass
    todo = [x for x in items if x['id'] not in done]

    def log(text):
        with open(progress, 'a', encoding='utf-8') as f:
            f.write(dt.datetime.now().strftime('%H:%M:%S') + ' ' + text + '\n')
    log(f'DÉBUT {len(todo)} demandes à faire sur {len(items)} (déjà faites : {len(done)}), priorité {prio}, base {data}, une demande après l\'autre, réseau refusé, cache des résultats coupé')
    # le chargement du contexte, mesuré à part, une fois par date de vol
    contexts = {}
    engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE = data, rad, fra_file
    try:
        for day in sorted({x['date'][:10] for x in todo}):
            t = time.perf_counter()
            P.context({'date': day + 'T12:00'}, root)
            contexts[day] = round(time.perf_counter() - t, 2)
            log(f'CONTEXTE {day} chargé en {contexts[day]} s (mesuré à part)')
    finally:
        engine.DATA_DIR = engine.RAD_FILE = fra.FRA_FILE = engine.DEADLINE = None
    with open(os.path.join(out, 'contexts.json'), 'w', encoding='utf-8') as f:
        json.dump(contexts, f)
    for n, item in enumerate(todo, 1):
        if os.path.exists(stop):
            log('ARRÊT demandé (fichier STOP) : la passe s\'arrête ici, on peut la reprendre')
            return 2
        rec = one(P, view, item, root, rad, fra_file)
        with open(detail, 'a', encoding='utf-8') as f:
            f.write(json.dumps(rec, ensure_ascii=False, default=str) + '\n')
        proof = '+'.join(str(p[1])[:1] for p in rec.get('proofs') or []) or '-'
        log(f"{len(done) + n:3d}/{len(items)} {item['id']:22s} {item['date']} {rec.get('status'):9s} {rec['wall_s']:6.1f} s {rec.get('nm') or '-':>7} NM preuves {proof:8s} source {rec.get('source') or '-'}"
            + (f" raison {rec.get('code')}" if rec.get('code') else '') + (' BORNE' if rec.get('hit') or rec['wall_s'] >= HARD_S else ''))
        if n % PACK == 0 and n < len(todo):
            log(f'paquet de {PACK} fini, pause de {PAUSE_S:.0f} s')
            time.sleep(PAUSE_S)
    log('FIN')
    return 0


def summary(args):
    detail = os.path.join(args.out, 'detail.jsonl')
    recs = []
    with open(detail, encoding='utf-8') as f:
        recs = [json.loads(x) for x in f if x.strip()]
    ctx = {}
    try:
        with open(os.path.join(args.out, 'contexts.json'), encoding='utf-8') as f:
            ctx = json.load(f)
    except OSError:
        pass
    lines = ['| pair | sense | departure (UTC) | route | s | NM | proofs | reason |', '|---|---|---|---|---:|---:|---|---|']
    for r in recs:
        proof = '+'.join(SHORT.get(str(p[1]), '?') for p in r.get('proofs') or []) or '-'
        lines.append(f"| {r['dep']}–{r['arr']} | {'EU→NA' if r['sense'] == 'W' else 'NA→EU'} | {r['date'][5:10]} {r['date'][11:]}Z {r['slot']} | {'yes' if r.get('status') == 'computed' else 'no' if r.get('status') == 'none' else r.get('status')} | {r['wall_s']:.1f} | {r.get('nm') or '-'} | {proof} | {r.get('code') or ''} |")
    n = len(recs)
    ok = [r for r in recs if r.get('status') == 'computed']
    none = [r for r in recs if r.get('status') == 'none']
    prop = [r for r in recs if r.get('status') == 'proposal']
    err = [r for r in recs if r.get('status') == 'error']
    over5 = [r for r in recs if r['wall_s'] > LIMIT_S]
    over20 = [r for r in recs if r['wall_s'] > HARD_S]
    hit = [r for r in recs if r.get('hit')]
    direct = [r for r in ok if any(not d['fra'] for d in r.get('directs_unexplained') or [])]      # seulement les réponses AVEC route
    direct_fra = [r for r in ok if any(d['fra'] for d in r.get('directs_unexplained') or [])]
    walls = sorted(r['wall_s'] for r in recs)
    p = lambda q: walls[min(len(walls) - 1, int(q * len(walls)))] if walls else 0
    text = [f'{n} demandes ; avec route : {len(ok)} ; sans route : {len(none)} ; « proposition » : {len(prop)} ; en erreur : {len(err)} ; au-delà de {LIMIT_S:.0f} s : {len(over5)} ; au-delà de {HARD_S:.0f} s : {len(over20)} ; borne atteinte (étape coupée) : {len(hit)} ; direct de plus de 200 NM sans raison hors zone FRA : {len(direct)} (dans une zone FRA, où le direct est publié : {len(direct_fra)})',
            f'temps (s) : médiane {p(0.5):.1f}, 90e centile {p(0.9):.1f}, maximum {walls[-1] if walls else 0:.1f} ; chargement du contexte (à part) : ' + ', '.join(f'{k} {v} s' for k, v in sorted(ctx.items()))]
    srcs = {}
    for r in ok:
        srcs[r.get('source')] = srcs.get(r.get('source'), 0) + 1
    text.append('sources des routes avec route : ' + ', '.join(f'{k} {v}' for k, v in sorted(srcs.items(), key=lambda x: str(x[0]))))
    codes = {}
    for r in recs:
        if r.get('code'):
            codes[r['code']] = codes.get(r['code'], 0) + 1
    text.append('raisons : ' + (', '.join(f'{k} {v}' for k, v in sorted(codes.items())) or 'aucune'))
    for label, group in (('au-delà de 5 s', over5), ('sans route', none), ('proposition', prop), ('en erreur', err), ('direct de plus de 200 NM sans raison hors zone FRA', direct), ('direct de plus de 200 NM dans une zone FRA', direct_fra)):
        if group:
            text.append(label + ' : ' + ', '.join(f"{r['id']} ({r['wall_s']:.1f} s{', ' + r['code'] if r.get('code') else ''})" for r in group))
    with open(os.path.join(args.out, 'table.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n\n' + '\n'.join(text) + '\n')
    print('\n'.join(text))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('SOG_DATA', os.path.join(os.path.dirname(HERE), 'data')), help='dossier des données (lecture seule)')
    ap.add_argument('--out', default=None, help='dossier de sortie (défaut : <data>/local/route_matrix)')
    ap.add_argument('--limit', type=int, default=0, help='seulement les N premières demandes (essai)')
    ap.add_argument('--summary', action='store_true', help='écrit table.md et le résumé à partir de detail.jsonl')
    ap.add_argument('--list', action='store_true', help='liste les demandes sans les jouer')
    args = ap.parse_args()
    args.out = args.out or os.path.join(args.data, 'local', 'route_matrix')
    if args.list:
        for x in requests_of(os.path.abspath(args.data)):
            print(x['id'], x['date'], x['est_to_entry_h'])
        return 0
    return summary(args) if args.summary else run(args)


if __name__ == '__main__':
    sys.exit(main())
