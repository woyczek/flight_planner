"""Référence anonymisée (committée) à partir du journal des vols (non committé).

Usage : python tools/defa_reference.py "Stub/Log des vols.html"  [--dry-run]

Entrée : page « Log des vols » de la DEFA enregistrée (tableau à 9 colonnes : date, durée,
trigramme, indicatif, immatriculation, appareil, départ, arrivée, mission).
Sortie : data/references/defa_reference.js (format commun des fichiers de données, éditable dans
Paramétrage › Bases de données) — seulement des informations agrégées :
  pilots   : trigramme, première / dernière activité, nombre de vols, types pilotés ;
  aircraft : immatriculation, type, variante, fiche flotte, indicatifs utilisés,
             première / dernière activité, nombre de vols, dernier terrain connu (lastAd),
             terrain de rattachement (homeAd : départ le plus fréquent).
Ni les vols eux-mêmes, ni les missions (le journal reste dans le navigateur : Base).
Les entrées existantes sont complétées, jamais supprimées (base « lâche », non exhaustive) ;
les champs modifiés à la main (homeAd, notes…) sont conservés.
"""
import collections
import html
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'AircraftDB'))
import datafile  # noqa: E402

TARGET = ROOT / 'data' / 'references' / 'defa_reference.js'  # dépôt de données (v3)
OVERRIDE = 'dataOverride:defaReference:v1'
COMMENT = [
    "Référence anonymisée : pilotes (trigrammes), appareils (immatriculation, type, indicatifs",
    "utilisés, dernier terrain connu, terrain de rattachement), sans les vols ni les missions.",
    "Générée par tools/defa_reference.py depuis le journal des vols (non committé) ; complétée",
    "à la main dans Paramétrage › Bases de données. Base « lâche » : aide à la saisie, non exhaustive.",
]


def fmt_reg(value):
    reg = re.sub(r'[^A-Z0-9]', '', value.upper())
    if re.match(r'^[A-Z]{5}$', reg):
        return reg[0] + '-' + reg[1:]
    return reg


def read_log(path):
    s = io.open(path, encoding='utf-8', errors='replace').read()
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', s, flags=re.S)
    out = []
    for r in rows:
        tds = re.findall(r'<td[^>]*>(.*?)</td>', r, flags=re.S)
        if len(tds) < 9:
            continue
        cell = [html.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', c))).strip() for c in tds]
        if not re.match(r'\d{4}-\d{2}-\d{2}', cell[0]):
            continue
        fleet = re.search(r'[?&]id=(\d+)', tds[4])
        kind = cell[5].upper().split()
        out.append({'date': cell[0][:10], 'trigram': cell[2].upper(), 'callsign': re.sub(r'\s+', ' ', cell[3].upper()),
                    'registration': fmt_reg(cell[4]), 'type': kind[0] if kind else '', 'variant': ' '.join(kind[1:]),
                    'dep': cell[6].upper(), 'arr': cell[7].upper(), 'fleetId': fleet.group(1) if fleet else ''})
    return out


def current():
    if not TARGET.exists():
        return {'pilots': [], 'aircraft': []}
    body = re.search(r'let data = (\{.*?\n\});', TARGET.read_text(encoding='utf-8'), flags=re.S).group(1)
    return json.loads(body)


def build(flights, base):
    pilots = {p['trigram']: p for p in base.get('pilots', [])}
    aircraft = {re.sub(r'[^A-Z0-9]', '', a['registration']): a for a in base.get('aircraft', [])}
    by_pilot, by_reg = collections.defaultdict(list), collections.defaultdict(list)
    for f in flights:
        if f['trigram']:
            by_pilot[f['trigram']].append(f)
        if f['registration']:
            by_reg[re.sub(r'[^A-Z0-9]', '', f['registration'])].append(f)
    for tri, fl in by_pilot.items():
        p = pilots.setdefault(tri, {'trigram': tri})
        types = collections.Counter(f['type'] for f in fl if f['type'])
        p.update({'first': min(f['date'] for f in fl), 'last': max(f['date'] for f in fl), 'flights': len(fl),
                  'types': [t for t, _ in types.most_common(6)]})
    for key, fl in by_reg.items():
        fl.sort(key=lambda f: f['date'])
        a = aircraft.setdefault(key, {'registration': fl[-1]['registration']})
        types = collections.Counter((f['type'], f['variant']) for f in fl if f['type'])
        (t, v), _ = types.most_common(1)[0] if types else (('', ''), 0)
        calls = collections.Counter(re.sub(r'\s+', '', f['callsign']) for f in fl if f['callsign'] and not re.match(r'^/+$', f['callsign']))
        deps = collections.Counter(f['dep'] for f in fl if f['dep'])
        a.update({'type': a.get('type') or t, 'variant': a.get('variant') or v, 'fleetId': a.get('fleetId') or next((f['fleetId'] for f in fl if f['fleetId']), ''),
                  'callsigns': [c for c, _ in calls.most_common(12)], 'first': fl[0]['date'], 'last': fl[-1]['date'], 'flights': len(fl),
                  'lastAd': fl[-1]['arr'] or fl[-1]['dep']})
        a.setdefault('homeAd', deps.most_common(1)[0][0] if deps else '')  # modifiable : jamais écrasé
    return {'pilots': sorted(pilots.values(), key=lambda p: p['trigram']),
            'aircraft': sorted(aircraft.values(), key=lambda a: a['registration'])}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    flights = read_log(args[0])
    data = build(flights, current())
    print(f"{len(flights)} vols lus ; {len(data['pilots'])} pilotes ; {len(data['aircraft'])} appareils")
    if '--dry-run' in sys.argv:
        return 0
    text = datafile.render(COMMENT, data, OVERRIDE, 'window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };')
    TARGET.write_text(text, encoding='utf-8', newline='\n')
    print('écrit', TARGET.relative_to(ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
