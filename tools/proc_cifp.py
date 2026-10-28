"""Procédures (SID, STAR, approches) du CIFP de la FAA (ARINC 424-18) au schéma commun d'aerodb (frame/aerodb/SPEC.md § 5 quinquies).

Source : FAACIFP18 du paquet CIFP_AAMMJJ.zip de https://aeronav.faa.gov/Upload_313-d/cifp/ (28 jours, États-Unis seulement). Le CIFP n'est
pas soumis au droit d'auteur (avis de la FAA dans le paquet) ; la FAA demande d'indiquer que le produit est fourni « tel quel », sans garantie, et de
signaler toute erreur découverte (accord client du lisez-moi). Bibliothèque standard seulement.

  python tools/proc_cifp.py CIFP_261001.zip --out data/proc [--icao KSEA PANC]      (ou le fichier FAACIFP18 lui-même)

Écrit <out>/<cycle>/<OACI>.json (un fichier par terrain) et fusionne <out>/<cycle>/index.json (celui des autres sources du même cycle est gardé).
Statut « official » (donnée de la FAA reprise telle quelle) : la conversion, elle, laisse de côté les tronçons sans point (VA, VI, CA… : cap
jusqu'à une altitude), signalés en nombre dans `warnings`.
"""
import argparse
import io
import json
import re
import sys
import zipfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

COORD = re.compile(r'[NS]\d{8}[EW]\d{9}')
NOTICE = ('CIFP de la FAA (ARINC 424-18), fourni « tel quel », sans garantie ; non destiné à la navigation. '
          'Under 10 U.S.C. 456, no civil action may be brought against the United States on the basis of the content of a navigational aid '
          'prepared or disseminated by the FAA. Errors: notify the FAA (CIFP Readme).')
APP_TYPES = {'I': 'ILS', 'L': 'LOC', 'B': 'LOC-BC', 'X': 'LDA', 'U': 'SDF', 'Y': 'MLS', 'R': 'RNAV', 'H': 'RNP', 'P': 'GPS', 'V': 'VOR',
             'S': 'VOR', 'D': 'VOR/DME', 'N': 'NDB', 'Q': 'NDB/DME', 'G': 'IGS', 'W': 'MLS', 'T': 'TACAN', 'F': 'FMS', 'J': 'GLS', 'M': 'MLS'}


def airac_date(cycle):
    """Date d'effet d'un cycle AIRAC « AANN » (2610 → 2026-10-01) : le cycle 2601 de 2026 est le 22 janvier, 28 jours entre deux."""
    yy, nn = int(cycle[:2]), int(cycle[2:])
    d = date(2024, 1, 25)                                  # AIRAC 2401
    while True:
        if d.year % 100 == yy and (d - date(d.year, 1, 1)).days < 28 and d.year % 100 == yy:
            return d + timedelta(days=28 * (nn - 1))
        d += timedelta(days=28)


def latlon(text):
    """(lat, lon) d'une zone « N47260734W122183462 » (ddmmsscc, dddmmsscc), ou None."""
    m = COORD.search(text)
    if not m:
        return None
    s = m.group(0)
    lat = int(s[1:3]) + int(s[3:5]) / 60 + int(s[5:9]) / 100 / 3600
    lon = int(s[10:13]) + int(s[13:15]) / 60 + int(s[15:19]) / 100 / 3600
    return round(-lat if s[0] == 'S' else lat, 6), round(-lon if s[9] == 'W' else lon, 6)


def altitude(text):
    """Pieds d'une altitude ARINC « 04000 », « FL180 » ; None sinon."""
    t = text.strip()
    if re.fullmatch(r'\d{5}', t):
        return int(t)
    m = re.fullmatch(r'FL(\d{3})', t)
    return int(m.group(1)) * 100 if m else None


def constraint(code, a1, a2):
    """Contrainte d'altitude du schéma commun d'après la description (col. 83) et les deux altitudes, ou None."""
    x, y = altitude(a1), altitude(a2)
    if code in (' ', '') and x is not None:
        return {'type': 'at', 'ft': x}
    if code == '+' and x is not None:
        return {'type': 'min', 'ft': x}
    if code == '-' and x is not None:
        return {'type': 'max', 'ft': x}
    if code == 'B' and x is not None and y is not None:
        return {'type': 'between', 'ft': y, 'ft2': x}
    return None                                            # codes de pente ou de transition (G, H, I, J, V, X, Y, C) : non repris


def tenths(text):
    t = text.strip()
    if not re.fullmatch(r'\d{4}', t):
        return None
    v = int(t) / 10
    return int(v) if v == int(v) else v


def leg_of(l, coords, apt):
    """Tronçon d'un enregistrement de procédure : (point du schéma commun sans seq, clé de fix) ou (None, raison)."""
    ident = l[29:34].strip()
    pt = l[47:49]
    if not ident:
        return None, 'sans point'
    sec, reg = l[36:38], l[34:36]
    if sec == 'EA':
        c = coords['E'].get((ident, reg)) or coords['E'].get(ident)
    elif sec in ('D ', 'DB'):
        c = coords['N'].get((ident, reg)) or coords['N'].get(ident)
    else:                                                   # PC, PG, PN, PA : propres au terrain, sinon repli sur les points en route
        c = coords['T'].get((apt, ident)) or coords['E'].get((ident, reg)) or coords['N'].get((ident, reg))
    p = {'id': ident, 'lat': c[0] if c else None, 'lon': c[1] if c else None, 'alt': constraint(l[82], l[84:89], l[89:94]), 'leg': pt}
    if l[43] in 'LR':
        p['turn'] = l[43]
    if re.fullmatch(r'\d{3}', l[44:47]) and l[44:47] != '000':
        p['rnp'] = round(int(l[44:46]) * 10 ** -int(l[46]), 4)
    if pt not in ('HM', 'HA', 'HF'):
        crs, nm = tenths(l[70:74]), tenths(l[74:78])
        if crs is not None:
            p['crs'] = crs
        if nm is not None:
            p['nm'] = nm
    if re.fullmatch(r'\d{3}', l[99:102]):
        p['kt'] = int(l[99:102])
    if re.fullmatch(r'-?\d{3}', l[102:106].strip()) or re.fullmatch(r'-\d{3}', l[103:106]):
        p['vpa'] = int(l[102:106]) / 100
    if l[40] == 'Y':
        p['over'] = True
    p['_missed'] = l[42] == 'M'
    p['_found'] = c is not None
    return p, None


def parse(lines):
    """Lignes ARINC 424-18 → ({ terrain: fichier }, cycle 'AANN'). `lines` : chaînes de 132 caractères (sans fin de ligne)."""
    coords = {'T': {}, 'E': {}, 'N': {}}
    proc = {}
    cycle = None
    for l in lines:
        if l.startswith('HDR01'):
            m = re.search(r'(\d{4})\s{2}\d\d-[A-Z]{3}-\d{4}', l)
            cycle = m.group(1) if m else None
            continue
        if len(l) < 106 or l[0] not in 'ST':
            continue
        s2 = l[4:6]
        if l[4] == 'P' and l[12] in 'CGNA':
            c = latlon(l[32:51])
            if c:
                coords['T'][(l[6:10].strip(), l[6:10].strip() if l[12] == 'A' else l[13:18].strip())] = c
        elif s2 == 'EA':
            c = latlon(l[32:51])
            if c:
                coords['E'][(l[13:18].strip(), l[19:21])] = c
                coords['E'].setdefault(l[13:18].strip(), c)
        elif s2 in ('D ', 'DB'):
            c = latlon(l[32:])
            if c:
                coords['N'][(l[13:17].strip(), l[19:21])] = c
                coords['N'].setdefault(l[13:17].strip(), c)
        elif l[4] == 'P' and l[5] == ' ' and l[12] in 'DEF' and l[38] == '0':
            proc.setdefault(l[6:10].strip(), []).append(l)
    return {apt: build(apt, ls, coords) for apt, ls in proc.items()}, cycle


def _seq(legs):
    return sorted(legs, key=lambda x: x[0])


def build(apt, lines, coords):
    """Fichier d'un terrain : { procedures, warnings } d'après ses enregistrements PD / PE / PF."""
    groups = {}
    for l in lines:
        groups.setdefault((l[12], l[13:19].strip(), l[19], l[20:25].strip()), []).append(l)
    skipped = 0
    missing = set()

    def legs(key):
        nonlocal skipped
        out, missed = [], False
        for l in sorted(groups[key], key=lambda x: x[26:29]):
            p, why = leg_of(l, coords, apt)
            if p is None:
                skipped += 1
                missed = missed or l[42] == 'M'
                continue
            if not p.pop('_found'):
                missing.add(p['id'])
            m = p.pop('_missed')
            if missed:
                p['phase'] = 'missed'
            if m:
                missed = True
            out.append(p)
        return out
    names = sorted({(k[0], k[1]) for k in groups})
    procs = []

    def add(sub, name, runways, trans, pts, kind, extra=None, rwtag=None):
        if not pts:
            return
        for i, p in enumerate(pts, 1):
            p['seq'] = i
        norm = re.sub(r'[\s-]+', '', name.upper())
        rw = f'RW{runways[0]}' if len(runways) == 1 else (rwtag or 'RWALL')
        rec = {'id': '.'.join([apt, kind, norm, rw] + ([re.sub(r'[\s-]+', '', trans.upper())] if trans else [])), 'icao': apt, 'kind': kind,
               'name': name, 'runways': runways, 'transition': trans or None, 'points': pts,
               'source': {'kind': 'cifp', 'ref': 'FAACIFP18'}, 'status': 'official'}
        if extra:
            rec.update(extra)
        procs.append(rec)
    def rwy(t):
        m = re.fullmatch(r'RW(\d\d)([LRCB]?)', t)
        if not m:
            return []
        return [m.group(1) + 'L', m.group(1) + 'R'] if m.group(2) == 'B' else [m.group(1) + m.group(2)]
    for sub, name in names:
        keys = [k for k in groups if k[0] == sub and k[1] == name]
        by = lambda types: sorted([k for k in keys if k[2] in types], key=lambda k: k[3])
        if sub in 'DE':
            kind = 'SID' if sub == 'D' else 'STAR'
            rw_t, com, en_t = (by('14T'), by('25'), by('36V')) if sub == 'D' else (by('36'), by('25'), by('14'))
            if sub == 'D' and not rw_t:
                pass
            commons = [k for k in com]
            for r in rw_t or [None]:
                run = rwy(r[3]) if r else []
                part = [legs(r)] if r else []
                cm = []
                for c in commons:
                    if c[3] in ('', 'ALL') or (r and c[3] == r[3]) or not r:
                        cm.append(legs(c))
                        if not r:
                            run = rwy(c[3]) or run
                seqs = (part + cm) if sub == 'D' else (cm + part)
                pts = [p for s in seqs for p in s]
                add(sub, name, run, None, pts, kind, rwtag=(r[3] if r else None))
            for e in en_t:
                add(sub, name, [], e[3], legs(e), kind)
        else:
            finals = [k for k in keys if k[2] != 'A']
            trans = [k for k in keys if k[2] == 'A']
            for f in finals:
                fl = legs(f)
                run = sorted({p['id'][2:] for p in fl if re.fullmatch(r'RW\d\d[LRC]?', p['id'])}) or []
                m = re.search(r'(\d\d[LRC]?)', name)
                run = run[-1:] or ([m.group(1)] if m else [])
                add(sub, name, run, None, fl, 'APP', {'type': APP_TYPES.get(f[2], f[2])})
                for t in trans:
                    tl = legs(t)
                    if tl and fl and tl[-1]['id'] == fl[0]['id']:
                        fl2 = fl[1:]
                    else:
                        fl2 = fl
                    add(sub, name, run, t[3], tl + [dict(p) for p in fl2], 'APP', {'type': APP_TYPES.get(f[2], f[2])})
            if not finals:
                for t in trans:
                    add(sub, name, [], t[3], legs(t), 'APP')
    warnings = []
    if skipped:
        warnings.append(f'{skipped} tronçon(s) sans point (cap ou montée jusqu\'à une altitude) laissés de côté')
    if missing:
        warnings.append(f'coordonnées introuvables: {", ".join(sorted(missing))}')
    return {'procedures': procs, 'warnings': warnings}


def lines_of(path):
    """Lignes du fichier FAACIFP18, ou de celui d'un paquet .zip."""
    p = Path(path)
    if p.suffix.lower() == '.zip':
        z = zipfile.ZipFile(p)
        name = next(n for n in z.namelist() if n.upper().startswith('FAACIFP'))
        return io.TextIOWrapper(z.open(name), encoding='latin-1')
    return open(p, encoding='latin-1')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('source', help='CIFP_AAMMJJ.zip ou FAACIFP18')
    ap.add_argument('--out', default='data/proc')
    ap.add_argument('--icao', nargs='*', default=None, help='terrains à écrire (tous par défaut)')
    a = ap.parse_args(argv)
    docs, cycle = parse(l.rstrip('\r\n') for l in lines_of(a.source))
    if not cycle:
        raise SystemExit('cycle introuvable dans l\'en-tête (HDR01)')
    eff = airac_date(cycle).isoformat()
    out = Path(a.out) / eff
    out.mkdir(parents=True, exist_ok=True)
    idx_path = out / 'index.json'
    index = json.loads(idx_path.read_text(encoding='utf-8')) if idx_path.exists() else {'schema': 1, 'cycle': eff, 'aerodromes': {}}
    wanted = {i.upper() for i in a.icao} if a.icao else None
    n = 0
    for apt, d in sorted(docs.items()):
        if wanted and apt not in wanted or not d['procedures']:
            continue
        f = out / f'{apt}.json'
        if f.exists() and json.loads(f.read_text(encoding='utf-8')).get('procedures', [{}])[0].get('source', {}).get('kind') != 'cifp':
            print(f'{apt}: fichier d\'une autre source gardé', file=sys.stderr)
            continue
        for p in d['procedures']:
            p['source'].update({'cycle': eff, 'at': eff})
        doc = {'schema': 1, 'icao': apt, 'cycle': eff, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
               'procedures': d['procedures'], 'warnings': d['warnings'], 'notice': NOTICE}
        f.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        c = {'SID': 0, 'STAR': 0, 'APP': 0}
        for p in d['procedures']:
            c[p['kind']] += 1
        index['aerodromes'][apt] = {**c, 'status': 'official'}
        n += 1
    idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{n} terrain(s) écrit(s) dans {out} (cycle {cycle} = {eff})', file=sys.stderr)


if __name__ == '__main__':
    main()
