"""Génère shared/aircraft_fleet.js depuis la page « Flotte virtuelle » de flotte.defa-virtual.fr
enregistrée (navigateur : Enregistrer sous…), fusionnée avec les entrées existantes
(indicatifs supplémentaires, appareils absents de la page).
Usage : python AircraftDB/update_fleet.py <Flotte.html>"""
import re, io, json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
SRC = sys.argv[1] if len(sys.argv) > 1 else 'Flotte.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared', 'aircraft_fleet.js')

OPERATORS = {"Armee de l'Air et de l'Espace": "Armée de l'Air et de l'Espace", 'Sécurite Civile': 'Sécurité civile', 'Marine Nationale': 'Marine nationale',
             'ALAT': 'ALAT', 'SAMU': 'SAMU', 'Gendarmerie Nationale': 'Gendarmerie nationale'}
VARIANTS = {'A332 MRTT': 'A330 MRTT Phénix', 'A332 PAX': 'A330-200', 'A332 VIP': 'A330-200 VIP', 'MIR2 5': 'Mirage 2000-5', 'MIR2 B': 'Mirage 2000B',
            'MIR2 D': 'Mirage 2000D', 'RFAL B': 'Rafale B', 'RFAL C': 'Rafale C', 'RFAL M': 'Rafale M', 'H145 D3': 'H145 D3'}
blank = lambda v: '' if v in ('-', '') else v
def reg(v):
    v = v.strip().upper()
    return f'{v[0]}-{v[1:]}' if re.fullmatch(r'[FD][A-Z]{4}', v) else v

s = io.open(SRC, encoding='utf-8').read()
parts = re.split(r'<h2>(.*?)</h2>', s)
fleet = []
for i in range(1, len(parts), 2):
    operator = OPERATORS.get(parts[i].strip(), parts[i].strip())
    for tr in re.findall(r'<tr>\s*(<td>.*?)</tr>', parts[i + 1], re.S):
        name, registration, code, number, callsign, base, _location, _hours, operational = [re.sub(r'\s+', ' ', x).strip() for x in re.findall(r'<td>(.*?)</td>', tr, re.S)]
        callsigns = [c for c in (blank(callsign).upper().split('/')) if c and ' ' not in c]
        fleet.append({'operator': operator, 'type': name.split()[0], 'variant': VARIANTS.get(name, ''), 'registration': reg(registration),
                      'tacticalNumber': blank(code), 'number': blank(number), 'callsigns': callsigns, 'base': blank(base).upper(),
                      'operational': operational.lower().startswith('oui')})

# Entrées existantes absentes de la page (ou indicatifs supplémentaires).
old = io.open(OUT, encoding='utf-8').read()
known = {a['registration']: a for a in fleet}
added = 0
previous = [(t, r, c) for t, r, c in re.findall(r"\['([^']+)','([^']+)','([^']+)'\]", old)]  # ancien format
for line in re.findall(r'^\s*(\[".*\]),?$', old, re.M):  # format actuel (une ligne JSON par appareil)
    row = json.loads(line)
    previous += [(row[1], row[3], c) for c in row[6]]
for t, r, c in previous:
    if r in known:
        if c not in known[r]['callsigns']: known[r]['callsigns'].append(c)
    else:
        entry = {'operator': 'Sécurité civile' if r.startswith('F-Z') else 'SAMU' if c.startswith('SAMU') else '', 'type': t, 'variant': '', 'registration': r,
                 'tacticalNumber': '', 'number': '', 'callsigns': [c], 'base': '', 'operational': True}
        fleet.append(entry); known[r] = entry; added += 1

cols = ['operator', 'type', 'variant', 'registration', 'tacticalNumber', 'number', 'callsigns', 'base', 'operational']
lines = [json.dumps([a[k] for k in cols], ensure_ascii=False, separators=(',', ':')) for a in fleet]
js = """(() => {
  'use strict';
  // Flotte DEFA Virtual : base commune des appareils connus (CR HEMS / FIRE, Mission Report Core).
  // Source : page « Flotte virtuelle » de flotte.defa-virtual.fr, complétée des
  // entrées historiques. Colonnes : opérateur, type OACI, variante, immatriculation, code
  // (numéro tactique), numéro, indicatifs, base, opérationnel.
  // Régénération : python AircraftDB/update_fleet.py Flotte.html
  window.DEFA_FLEET = [
    %s
  ].map(([operator, type, variant, registration, tacticalNumber, number, callsigns, base, operational]) =>
    ({ operator, type, variant, registration, tacticalNumber, number, callsigns, callsign: callsigns[0] || '', base, operational }));
})();
""" % ',\n    '.join(lines)
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
print(len(fleet), 'appareils,', added, 'entrées historiques ajoutées')
