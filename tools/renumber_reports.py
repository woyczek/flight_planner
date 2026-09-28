"""Renumérotation des CR du registre (data/cr/missions.yaml) au format unifié avec les missions.

  CR d'une mission (metadata.missionNumber = identifiant de la mission, ex. M016A) : CR + mission + « - » + n° d'essai,
  dans l'ordre des dates : CRM016A-1, CRM016A-2…
  CR sans mission : CR + lettre de la famille + « -LIB » + numéro d'origine (HEMS-014 → CRM-LIB014, GAAR-007 →
  CRF-LIB007), ou numéro libre suivant si l'ancien n'a pas de numéro.
Ancien n° gardé dans metadata.formerMissionId ; updatedAt renouvelé (la version du fichier l'emporte sur la copie du
navigateur) ; trace dans data/cr/RENUMEROTATION_CR.md. Déjà au nouveau format : inchangé. Réécriture ligne à ligne
(format du fichier conservé). Même règle que MissionVocab.crId (shared/mission_core/vocab.js).
Usage (racine de l'application) : python tools/renumber_reports.py [--dry-run]
"""
import datetime as dt, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from family_letters import FAMILY_LETTERS

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PATH = os.path.join(ROOT, 'data', 'cr', 'missions.yaml')
DRY = '--dry-run' in sys.argv
LETTERS = {**FAMILY_LETTERS, 'DEMO': 'D'}
MISSION_ID = re.compile(r'^[A-Z]\d{3}[A-Z]?$')
NEW = re.compile(r'^CR([A-Z]\d{3}[A-Z]?-\d+|[A-Z]-LIB\d+)$')


def main():
    lines = open(PATH, encoding='utf-8').read().split('\n')
    # blocs de mission : « - schemaVersion » au premier niveau de missions:
    starts = [i for i, l in enumerate(lines) if re.match(r'^  - ', l)]
    blocks = []
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else len(lines)
        get = lambda key: next((re.match(rf'^\s+{key}:\s*"?(.*?)"?\s*$', lines[i]).group(1) for i in range(s, e) if re.match(rf'^\s+{key}:', lines[i])), '')
        idl = next((i for i in range(s, e) if re.match(r'^\s+missionId:', lines[i])), None)
        fam = next((re.match(r'^\s*-?\s*family:\s*"?(.*?)"?\s*$', lines[i]).group(1) for i in range(s, e) if re.match(r'^\s*-?\s*family:', lines[i])), '')
        blocks.append({'line': idl, 'family': fam, 'id': get('missionId'), 'number': get('missionNumber').upper(), 'date': get('date')})
    table, attempts, free_used = [], {}, {}
    for b in blocks:
        m = NEW.match(b['id'].upper())
        if m and '-LIB' in b['id'].upper():
            L, n = re.match(r'^CR([A-Z])-LIB(\d+)$', b['id'].upper()).groups()
            free_used.setdefault(L, set()).add(int(n))
        elif m:
            base, n = b['id'].upper()[2:].rsplit('-', 1)
            attempts[base] = max(attempts.get(base, 0), int(n))
    for b in sorted(blocks, key=lambda x: x['date']):
        if b['line'] is None or NEW.match(b['id'].upper()):
            continue
        if MISSION_ID.match(b['number']):
            attempts[b['number']] = attempts.get(b['number'], 0) + 1
            new = f"CR{b['number']}-{attempts[b['number']]}"
        else:
            L = LETTERS.get(b['family'].upper(), 'X')
            used = free_used.setdefault(L, set())
            old = re.search(r'(\d+)$', b['id'])
            n = int(old.group(1)) if old and int(old.group(1)) not in used else max(used | {0}) + 1
            used.add(n)
            new = f'CR{L}-LIB{n:03d}'
        indent = re.match(r'^(\s*)', lines[b['line']]).group(1)
        lines[b['line']] = f'{indent}missionId: "{new}"\n{indent}formerMissionId: "{b["id"]}"'
        table.append((new, b['id'], b['family'], b['date'], b['number']))
    if not table:
        print('Rien à renuméroter.')
        return
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    text = '\n'.join(lines)
    text = re.sub(r'^updatedAt:.*$', f'updatedAt: "{now}"', text, count=1, flags=re.M)
    text = re.sub(r'^(# schemaVersion \d+ — ).*$', rf'\g<1>{now}', text, count=1, flags=re.M)
    for row in sorted(table, key=lambda r: r[0]):
        print(f'{row[1]:>12} → {row[0]:<14} {row[2]:<8} {row[3]} {row[4]}')
    if DRY:
        print(f'(simulation) {len(table)} CR.')
        return
    open(PATH, 'w', encoding='utf-8', newline='').write(text)
    trace = os.path.join(os.path.dirname(PATH), 'RENUMEROTATION_CR.md')
    head = '' if os.path.exists(trace) else ('# Renumérotation des CR\n\nFormat : CR + mission + n° d’essai (CRM016-1) ; '
                                             'CR sans mission : CR + lettre + -LIB + numéro (CRM-LIB001). Ancien n° : metadata.formerMissionId.\n')
    with open(trace, 'a', encoding='utf-8') as f:
        f.write(head + f'\n## {now[:10]}\n\n| Nouveau | Ancien | Famille | Date | Mission |\n|---|---|---|---|---|\n'
                + ''.join(f'| {a} | {b} | {c} | {d} | {e} |\n' for a, b, c, d, e in sorted(table)))
    print(f'{len(table)} CR renumérotés.')


if __name__ == '__main__':
    main()
