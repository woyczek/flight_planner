#!/usr/bin/env python3
"""Jeu de test « fantôme » : disponibilités et affectations fictives pour une semaine (ODV, Mes missions, Centre).

À lancer sur une branche de test du dépôt de données (jamais sur main) :
    python tools/jeu_fantome.py                 aperçu (semaine en cours), rien n'est écrit
    python tools/jeu_fantome.py --write         écrit le jeu
    python tools/jeu_fantome.py --clean --write retire tout ce qui est marqué fantôme
Options : --week AAAA-MM-JJ (lundi ; défaut : semaine en cours), --pilots N (déclarations, défaut 24),
--missions N (missions affectées, défaut 8), --seed (défaut : la semaine : même jeu à chaque relance), --data DOSSIER.

Écrit, marqué `phantom: true` (et `by: FANTOME`) :
- data/disponibilites/<TRI>.json : déclaration de la semaine (grille horaire UTC, codes de la légende ODV), appareils
  (types de la référence DEFA du pilote), simulateurs ; pilotes de la référence DEFA qui n'ont pas de déclaration
  réelle (un fichier non fantôme n'est jamais touché) ; index _index.json refait d'après le dossier ;
- data/missions/<dossier>/affectations.yaml, data/missions/affectations.json (index), affectations_log.json
  (journal) : missions du registre qui ont un dossier et ne sont pas encore affectées, confiées à des pilotes fantômes
  disponibles à l'heure du décollage et qui connaissent le type d'appareil (flotte DEFA), parfois en patrouille.
Formats : ceux de shared/assignments.js (saveAvailability, writeAssignment, logEntries). Dépend de PyYAML.
"""
import argparse
import datetime as dt
import json
import random
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
BY = 'FANTOME'
DAYS = 7
SIMS = ['MSFS 2020', 'MSFS 2024', 'X-PLANE 11', 'X-PLANE 12', 'P3D']
DISPO = {'O', 'SC', 'C', 'T', 'S', 'N'}  # codes de catégorie « dispo » (LEGEND de shared/assignments.js)
FIGHTERS = {'RFAL', 'MIR2', 'M2K', 'M2KD', 'M2D', 'PC21'}  # types qui volent en patrouille


def read_js_json(path, pattern):
    """Objet JSON d'un fichier .js de data/references (premier groupe de pattern)."""
    m = re.search(pattern, path.read_text(encoding='utf-8'), re.S)
    if not m:
        sys.exit(f'Format inattendu : {path}')
    return json.loads(m.group(1))


def write_json(path, obj, indent=2):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=indent) + '\n', encoding='utf-8', newline='\n')


def monday(s=None):
    d = dt.date.fromisoformat(s) if s else dt.datetime.now(dt.timezone.utc).date()
    return d - dt.timedelta(days=d.weekday())


def iso(t):
    return t.strftime('%Y-%m-%dT%H:%M:%S.000Z')


def grid_for(rng):
    """Grille d'une semaine (7 × 24 codes, '' : non renseigné) selon un profil de pilote tiré au sort."""
    g = [[''] * 24 for _ in range(DAYS)]

    def put(d, h0, h1, code):
        for h in range(max(0, h0), min(24, h1)):
            g[d][h] = code

    profile = rng.choice(['soirees', 'soirees', 'journee', 'controleur', 'vacances', 'peu'])
    dispo = lambda: rng.choice(['O', 'O', 'O', 'O', 'SC', 'C', 'T', 'N', 'S'])
    for d in range(DAYS):
        weekend = d >= 5
        if profile == 'soirees':
            if weekend:
                put(d, rng.choice([8, 9, 10]), rng.choice([12, 13]), dispo())
                put(d, 14, rng.choice([18, 19, 20]), dispo())
            elif rng.random() < .8:
                put(d, rng.choice([17, 18, 19]), rng.choice([22, 23]), dispo())
            put(d, 0, 7, 'IN') if rng.random() < .3 else None
        elif profile == 'journee':
            if rng.random() < .7:
                put(d, rng.choice([7, 8, 9]), rng.choice([16, 17, 18]), dispo())
            else:
                put(d, 8, 18, rng.choice(['IN', 'IR', 'Q']))
        elif profile == 'controleur':
            if rng.random() < .5:
                put(d, 18, 22, rng.choice(['AT', 'AM']))
            if rng.random() < .6:
                put(d, rng.choice([9, 10, 14]), rng.choice([13, 17]), dispo())
        elif profile == 'vacances':
            if d in (0, 1, 2):
                put(d, 0, 24, 'V')
            elif rng.random() < .8:
                put(d, rng.choice([9, 14, 18]), rng.choice([18, 22, 23]), dispo())
        else:  # peu disponible
            put(d, 0, 24, 'IN')
            if rng.random() < .35:
                put(d, rng.choice([18, 19]), rng.choice([21, 22]), 'O')
        if rng.random() < .08:
            put(d, rng.choice([19, 20]), rng.choice([22, 23]), rng.choice(['G', 'DC']))
    return g


def blocks(g, need_h):
    """Plages disponibles d'au moins need_h heures : [(jour, heure de début)]."""
    out = []
    for d in range(DAYS):
        h = 0
        while h < 24:
            if g[d][h] in DISPO:
                e = h
                while e < 24 and g[d][e] in DISPO:
                    e += 1
                if e - h >= need_h:
                    out.append((d, h))
                h = e
            else:
                h += 1
    return out


def fleet_rows_for(mission, fleet):
    """Appareils de la flotte qui correspondent aux types de la mission (désignateur OACI ou variante)."""
    text = ' '.join(mission.get('aircraftTypes') or []).upper()
    words = {w for w in re.split(r'[^A-Z0-9-]+', text) if len(w) >= 3}
    rows = [r for r in fleet if r.get('registration') and (r['type'].upper() in words or any(w in (r.get('variant') or '').upper() for w in words if not w.isdigit()))]
    return rows


def clean(data, write):
    dis, mis = data / 'disponibilites', data / 'missions'
    n_decl = 0
    for f in sorted(dis.glob('*.json')):
        if f.name.startswith('_'):
            continue
        try:
            if json.loads(f.read_text(encoding='utf-8')).get('phantom'):
                n_decl += 1
                if write:
                    f.unlink()
        except ValueError:
            pass
    n_aff = 0
    for f in sorted(mis.glob('*/*/affectations.yaml')):
        doc = yaml.safe_load(f.read_text(encoding='utf-8')) or {}
        if doc.get('phantom'):
            n_aff += 1
            if write:
                f.unlink()
    idx_p, log_p = mis / 'affectations.json', mis / 'affectations_log.json'
    idx = json.loads(idx_p.read_text(encoding='utf-8'))
    log = json.loads(log_p.read_text(encoding='utf-8'))
    n_idx = sum(1 for a in idx['assignments'] if a.get('phantom'))
    n_log = sum(1 for e in log['entries'] if e.get('phantom'))
    if write:
        idx['assignments'] = [a for a in idx['assignments'] if not a.get('phantom')]
        log['entries'] = [e for e in log['entries'] if not e.get('phantom')]
        write_json(idx_p, idx)
        write_json(log_p, log, indent=1)
        write_index(dis)
    print(f"Fantômes {'retirés' if write else 'à retirer'} : {n_decl} déclaration(s), {n_aff} affectations.yaml, "
          f"{n_idx} ligne(s) d'index, {n_log} ligne(s) de journal.")


def write_index(dis):
    """data/disponibilites/_index.json d'après le dossier (comme saveAvailability)."""
    pilots = {f.stem.upper(): True for f in sorted(dis.glob('*.json')) if not f.name.startswith('_')}
    write_json(dis / '_index.json', {'updated_at': iso(dt.datetime.now(dt.timezone.utc)), 'pilots': pilots}, indent=1)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=str(ROOT / 'data'))
    ap.add_argument('--week')
    ap.add_argument('--pilots', type=int, default=24)
    ap.add_argument('--missions', type=int, default=8)
    ap.add_argument('--seed')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--clean', action='store_true')
    a = ap.parse_args()
    data = Path(a.data)
    if a.clean:
        return clean(data, a.write)

    week = monday(a.week)
    rng = random.Random(a.seed or week.isoformat())
    now = dt.datetime.now(dt.timezone.utc)
    dis, mis = data / 'disponibilites', data / 'missions'
    ref = read_js_json(data / 'references' / 'defa_reference.js', r'let data = (\{.*?\n\});')
    fleet = read_js_json(data / 'references' / 'aircraft_fleet.js', r'let data = (\{.*?\n\});')['rows']
    known = {r['type'] for r in fleet}

    # ---- déclarations
    def real(tri):
        f = dis / f'{tri}.json'
        if not f.exists():
            return False
        try:
            return not json.loads(f.read_text(encoding='utf-8')).get('phantom')
        except ValueError:
            return True

    free = [p for p in ref['pilots'] if p.get('trigram') and not real(p['trigram'])]
    chosen = rng.sample(free, min(a.pilots, len(free)))
    decls = {}
    for p in sorted(chosen, key=lambda x: x['trigram']):
        tri = p['trigram'].upper()
        types = [t for t in p.get('types') or [] if t in known] or rng.sample(sorted(known), 2)
        g = grid_for(rng)
        decls[tri] = {
            'pilot': tri,
            'granularity_min': 60,
            'timezone': 'UTC',
            'legend': 'ODV (Code couleur)',
            'updated_at': iso(now),
            'grid': [[''] * 24 for _ in range(DAYS)],
            'weeks': {week.isoformat(): g},
            'aircraft': {'owned': types, 'mastered': rng.sample(types, max(1, len(types) // 2))},
            'sims': rng.sample(SIMS, rng.choice([1, 1, 2, 3])),
            'phantom': True,
            'by': BY,
        }

    # ---- affectations : missions du registre avec dossier, non affectées
    reg = yaml.safe_load((mis / 'mission_registry.yaml').read_text(encoding='utf-8'))
    idx_p, log_p = mis / 'affectations.json', mis / 'affectations_log.json'
    idx = json.loads(idx_p.read_text(encoding='utf-8'))
    log = json.loads(log_p.read_text(encoding='utf-8'))
    taken = {x['mission'] for x in idx['assignments']}
    cands = [m for m in reg['missions'] if m.get('folder') and m['id'] not in taken and (mis / m['folder']).is_dir()
             and not (mis / m['folder'] / 'affectations.yaml').exists() and m.get('aircraftTypes')]
    rng.shuffle(cands)
    busy = {}  # TRI → [(début, fin)]
    planes = {}  # immatriculation → [(début, fin)] : affectations existantes, puis fantômes
    for x in idx['assignments']:
        t = x.get('takeoff')
        reg_ = (x.get('aircraft') or {}).get('registration')
        if t and reg_:
            s = dt.datetime.fromisoformat(t.replace('Z', '+00:00'))
            planes.setdefault(reg_, []).append((s, s + dt.timedelta(minutes=(x.get('block_min') or 120) + 30)))
    free_plane = lambda r, s, e: not any(a < e and s < b for a, b in planes.get(r['registration'], []))
    out = []
    for m in cands:
        if len(out) >= a.missions:
            break
        rows = fleet_rows_for(m, fleet)
        if not rows:
            continue
        block = rng.choice([90, 120, 150, 180])
        need = -(-(block + 30) // 60)
        options = []
        for tri, d in decls.items():
            if not any(r['type'] in d['aircraft']['owned'] for r in rows):
                continue
            for day, h in blocks(d['weeks'][week.isoformat()], need):
                t0 = dt.datetime.combine(week + dt.timedelta(days=day), dt.time(h), dt.timezone.utc)
                t1 = t0 + dt.timedelta(minutes=block + 30)
                if not any(s < t1 and t0 < e for s, e in busy.get(tri, [])):
                    options.append((tri, t0, t1))
        if not options:
            continue
        tri, t0, t1 = rng.choice(options)
        crew = [(tri, t0, t1)]
        # patrouille (chasseurs seulement) : un second pilote libre au même moment, une fois sur trois
        mates = [o for o in options if o[0] != tri and o[1] == t0]
        if mates and rng.random() < .33 and any(r['type'] in FIGHTERS for r in rows):
            crew.append(rng.choice(mates))
        origin = m.get('origin') or ''
        icao = re.search(r'\(([A-Z0-9]{4})\)', origin)
        folder = mis / m['folder']
        yml = next((f.name for f in sorted(folder.glob('mission*.y*ml'))), f"mission{m['id']}.yaml")
        md = next((f.name for f in sorted(folder.glob('summary*.md'))), '')
        maps = [f.name for f in sorted(folder.glob('*.png')) if f.name != 'carte_assemblage.png']
        callsigns = m.get('callsigns') or ['FANTOME']
        used = set()
        parts = []
        for i, (pt, a0, a1) in enumerate(crew):
            owned = decls[pt]['aircraft']['owned']
            ok = [r for r in rows if r['registration'] not in used and free_plane(r, a0, a1)]
            pick = [r for r in ok if r['type'] in owned] or ok
            if not pick:
                break  # plus d'appareil libre : équipage réduit (au pire, mission laissée)
            r = rng.choice(pick)
            used.add(r['registration'])
            planes.setdefault(r['registration'], []).append((a0, a1))
            cs = callsigns[0].split('/')[i] if '/' in callsigns[0] and i < len(callsigns[0].split('/')) else (callsigns[0] + (chr(65 + i) if i else ''))
            parts.append({
                'pilot': pt,
                'callsign': cs,
                'aircraft': {'registration': r['registration'], 'type': r['type'], 'variant': r.get('variant') or '', 'base': r.get('base') or ''},
                'departure': icao.group(1) if icao else (r.get('base') or ''),
                'takeoff': iso(a0),
                'ferry': None,
                'block_min': block,
                'status': 'affectée',
                'phantom': True,
            })
        if not parts:
            continue
        crew = crew[:len(parts)]
        for pt, s, e in crew:
            busy.setdefault(pt, []).append((s, e))
        out.append((m, folder, {'yaml': yml, 'md': md, 'maps': maps}, parts))

    # ---- aperçu / écriture
    print(f"Semaine du {week.isoformat()} — {len(decls)} déclaration(s) fantôme(s) "
          f"({len(free)} pilote(s) de la référence sans déclaration réelle), {len(out)} mission(s) affectée(s) :")
    for m, folder, files, parts in out:
        print(f"  {m['id']:7} {m.get('family', ''):9} " + ' + '.join(
            f"{p['pilot']} {p['aircraft']['type']} {p['aircraft']['registration']} {p['takeoff'][5:16].replace('T', ' ')}Z" for p in parts))
    if not a.write:
        print('Aperçu seulement : --write pour écrire.')
        return
    dis.mkdir(exist_ok=True)
    for tri, d in decls.items():
        write_json(dis / f'{tri}.json', d)
    write_index(dis)
    at = iso(now)
    for m, folder, files, parts in out:
        doc = {'mission': m['id'], 'updated_at': at, 'by': BY, 'h_hour': None, 'participants': parts, 'alert': None, 'phantom': True}
        (folder / 'affectations.yaml').write_text(
            f"# Affectations de la mission {m['id']} — docs/AFFECTATION_MISSIONS.md (jeu de test fantôme)\n"
            + yaml.safe_dump(doc, allow_unicode=True, sort_keys=False, width=10000), encoding='utf-8', newline='\n')
        common = {'mission': m['id'], 'title': m.get('title') or '', 'type': m.get('family') or m.get('type') or '',
                  'folder': m['folder'], 'files': files, 'h_hour': None, 'alert': None, 'updated_at': at, 'by': BY}
        for p in parts:
            idx['assignments'].append({**common, **p, 'role': 'mission'})
            log['entries'].append({'at': at, 'by': BY, 'action': 'affecte', 'mission': m['id'], 'title': m.get('title') or '',
                                      'pilot': p['pilot'], 'aircraft': f"{p['aircraft']['type']} {p['aircraft']['registration']}",
                                      'callsign': p['callsign'], 'takeoff': p['takeoff'], 'role': 'mission', 'phantom': True})
    idx['updatedAt'] = at
    log['updatedAt'] = at
    write_json(idx_p, idx)
    write_json(log_p, log, indent=1)
    print('Écrit.')


if __name__ == '__main__':
    main()
