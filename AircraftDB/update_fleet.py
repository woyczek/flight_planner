"""Génère data/references/aircraft_fleet.js depuis la page « Flotte virtuelle » de flotte.defa-virtual.fr
enregistrée (navigateur : Enregistrer sous…), fusionnée avec le fichier existant.

Usage : python AircraftDB/update_fleet.py <Flotte.html> [--out=CHEMIN]
  (--out : fichier écrit, data/references/aircraft_fleet.js par défaut ; le lanceur y met son dossier de données)
  Le lanceur le lance aussi lui-même sur la page publique, une fois par jour (shared/defa_site.js).

- Les appareils de la page remplacent ceux du fichier (même immatriculation) ; les
  indicatifs supplémentaires du fichier sont conservés ; les appareils absents de la page
  (ajoutés à la main ou par la page Paramétrage) sont conservés.
- Format : AircraftDB/datafile.py (identique à celui de la page Paramétrage › Bases de
  données, qui permet aussi d'éditer la flotte sans ce script).
"""
import re, io, json, sys, os, datetime
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datafile

_ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
_OUT = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--out=')), '')
SRC = _ARGS[0] if _ARGS else 'Flotte.html'
OUT = os.path.abspath(_OUT) if _OUT else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'references', 'aircraft_fleet.js')  # dépôt de données (v3)
os.makedirs(os.path.dirname(OUT), exist_ok=True)

OPERATORS = {"Armee de l'Air et de l'Espace": "Armée de l'Air et de l'Espace", 'Sécurite Civile': 'Sécurité civile', 'Marine Nationale': 'Marine nationale',
             'ALAT': 'ALAT', 'SAMU': 'SAMU', 'Gendarmerie Nationale': 'Gendarmerie nationale'}
VARIANTS = {'A332 MRTT': 'A330 MRTT Phénix', 'A332 PAX': 'A330-200', 'A332 VIP': 'A330-200 VIP', 'MIR2 5': 'Mirage 2000-5', 'MIR2 B': 'Mirage 2000B',
            'MIR2 D': 'Mirage 2000D', 'RFAL B': 'Rafale B', 'RFAL C': 'Rafale C', 'RFAL M': 'Rafale M', 'H145 D3': 'H145 D3'}
COLS = ['operator', 'type', 'variant', 'registration', 'tacticalNumber', 'number', 'callsigns', 'base', 'operational', 'location', 'locationAt']
# emplacement actuel (colonne « Emplacement » du site) et date à laquelle il a changé : terrain actuel de l'appareil
# (shared/aircraft_positions.js ; seul un CR issu d'un ordre de mission plus récent l'emporte)
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
blank = lambda v: '' if v in ('-', '') else v
def reg(v):
    v = v.strip().upper()
    return f'{v[0]}-{v[1:]}' if re.fullmatch(r'[FD][A-Z]{4}', v) else v


def previous_rows(text):
    """Appareils du fichier existant (format actuel ou formats précédents)."""
    m = re.search(r'let data = (\{.*?\n\});', text, re.S)
    if m:
        return json.loads(m.group(1)).get('rows', [])
    rows = [dict(zip(COLS, json.loads(line))) for line in re.findall(r'^\s*(\[".*\]),?$', text, re.M)]
    rows += [{'type': t, 'registration': r, 'callsigns': [c]} for t, r, c in re.findall(r"\['([^']+)','([^']+)','([^']+)'\]", text)]
    return rows


s = io.open(SRC, encoding='utf-8').read()
parts = re.split(r'<h2>(.*?)</h2>', s)
fleet = []
for i in range(1, len(parts), 2):
    operator = OPERATORS.get(parts[i].strip(), parts[i].strip())
    for tr in re.findall(r'<tr>\s*(<td>.*?)</tr>', parts[i + 1], re.S):
        name, registration, code, number, callsign, base, location, _hours, operational = [re.sub(r'\s+', ' ', x).strip() for x in re.findall(r'<td>(.*?)</td>', tr, re.S)]
        callsigns = [c for c in (blank(callsign).upper().split('/')) if c and ' ' not in c]
        fleet.append({'operator': operator, 'type': name.split()[0], 'variant': VARIANTS.get(name, ''), 'registration': reg(registration),
                      'tacticalNumber': blank(code), 'number': blank(number), 'callsigns': callsigns, 'base': blank(base).upper(),
                      'operational': operational.lower().startswith('oui'), 'location': blank(location).upper()})

known = {a['registration']: a for a in fleet}
added = 0
if os.path.exists(OUT):
    for old in previous_rows(io.open(OUT, encoding='utf-8').read()):
        r = old.get('registration', '')
        if r in known:
            for c in old.get('callsigns', []):
                if c not in known[r]['callsigns']: known[r]['callsigns'].append(c)
            # même emplacement : sa date est gardée (l'appareil n'a pas bougé sur le site) — toutes les lignes de
            # l'immatriculation (une immatriculation peut figurer deux fois sur la page)
            for a in fleet:
                if a['registration'] == r and old.get('location', '') == a.get('location') and old.get('locationAt'):
                    a['locationAt'] = old['locationAt']
        elif r:
            entry = {k: old.get(k, [] if k == 'callsigns' else True if k == 'operational' else '') for k in COLS}
            fleet.append(entry); known[r] = entry; added += 1

for a in fleet:
    if a.get('location') and not a.get('locationAt'):
        a['locationAt'] = NOW

text = datafile.render(
    ["Flotte SO Group Virtual : base commune des appareils connus (CR HEMS / FIRE, Mission Report Core).",
     "Source : page « Flotte virtuelle » de flotte.defa-virtual.fr (python AircraftDB/update_fleet.py Flotte.html),",
     "complétée à la main ou par la page Paramétrage. Colonnes : opérateur, type OACI, variante,",
     "immatriculation, code (numéro tactique), numéro, indicatifs, base, opérationnel, emplacement (site) et date",
     "de son dernier changement."],
    {'rows': [{k: a.get(k, '') for k in COLS} for a in fleet]},
    'dataOverride:fleet:v1',
    "window.DEFA_FLEET = data.rows.map(row => ({ ...row, callsign: (row.callsigns || [])[0] || '' })); window.DEFA_FLEET_META = META; window.DEFA_FLEET_FILE = fileData.rows;")
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
print(len(fleet), 'appareils,', added, 'appareils du fichier conservés (absents de la page)')
