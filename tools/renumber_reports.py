"""Renumérotation des CR du registre (data/cr/missions.yaml) au format unifié avec les missions.

  CR d'une mission (metadata.missionNumber = identifiant de la mission, ex. M-016A) : CR + mission + « - » + n° d'essai,
  dans l'ordre des dates : CRM-016A-1, CRM-016A-2…
  CR sans mission : CR + lettre de la famille + « - » + lettre de série et 2 chiffres + « -0 » ; rang = numéro d'origine
  (HEMS-014 → CRM-A14-0, GAAR-007 → CRF-A07-0 ; au-delà de 99 : B01…), ou rang libre suivant.
  Formats intermédiaires repris : CRM016-1 → CRM-016-1, CRM-LIB014 / CRM-A14-1 → CRM-A14-0 ; missionNumber « M016 » → « M-016 ».
Ancien n° gardé dans metadata.formerMissionId (le premier connu) ; updatedAt renouvelé (la version du fichier l'emporte
sur la copie du navigateur) ; trace dans data/cr/RENUMEROTATION_CR.md. Réécriture ligne à ligne (format conservé).
Même règle que MissionVocab.crId (shared/mission_core/vocab.js).
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
MISSION_ID = re.compile(r'^([A-Z])-?(\d{1,3})([A-Z]?)$')
CR_MISSION = re.compile(r'^CR([A-Z])-(\d{3})([A-Z]?)-(\d+)$')
CR_FREE = re.compile(r'^CR([A-Z])-([A-Z])(\d{2})-(\d+)$')
OLD_CR_MISSION = re.compile(r'^CR([A-Z])(\d{3})([A-Z]?)-(\d+)$')
OLD_CR_FREE = re.compile(r'^CR([A-Z])-LIB(\d+)$')


def mission_id(v):
    m = MISSION_ID.match(str(v or '').strip().upper())
    return f'{m.group(1)}-{int(m.group(2)):03d}{m.group(3)}' if m else ''


def free_code(rank):
    return f'{chr(65 + (rank - 1) // 99)}{(rank - 1) % 99 + 1:02d}'


def free_rank(series, nn):
    return (ord(series) - 65) * 99 + int(nn)


def main():
    lines = open(PATH, encoding='utf-8').read().split('\n')
    starts = [i for i, l in enumerate(lines) if re.match(r'^  - ', l)]
    blocks = []
    for k, st in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else len(lines)
        find = lambda key: next((i for i in range(st, e) if re.match(rf'^\s+{key}:', lines[i])), None)
        val = lambda i: re.match(r'^\s+\w+:\s*"?(.*?)"?\s*$', lines[i]).group(1) if i is not None else ''
        fam = next((re.match(r'^\s*-?\s*family:\s*"?(.*?)"?\s*$', lines[i]).group(1) for i in range(st, e) if re.match(r'^\s*-?\s*family:', lines[i])), '')
        blocks.append({'id_line': find('missionId'), 'num_line': find('missionNumber'), 'former_line': find('formerMissionId'),
                       'family': fam, 'id': val(find('missionId')).upper(), 'number': val(find('missionNumber')), 'date': val(find('date'))})
    attempts, free_used = {}, {}
    for b in blocks:                                  # numéros déjà au format final : réservés
        if (m := CR_MISSION.match(b['id'])):
            base = f'{m.group(1)}-{m.group(2)}{m.group(3)}'
            attempts[base] = max(attempts.get(base, 0), int(m.group(4)))
        elif (m := CR_FREE.match(b['id'])) and m.group(4) == '0':
            free_used.setdefault(m.group(1), set()).add(free_rank(m.group(2), m.group(3)))
    table = []
    for b in sorted(blocks, key=lambda x: x['date']):
        fm = CR_FREE.match(b['id'])
        if b['id_line'] is None or CR_MISSION.match(b['id']) or (fm and fm.group(4) == '0'):
            continue
        mid = mission_id(b['number'])
        if (m := OLD_CR_MISSION.match(b['id'])):
            mid = mid or f'{m.group(1)}-{m.group(2)}{m.group(3)}'
        if mid:
            attempts[mid] = attempts.get(mid, 0) + 1
            new = f'CR{mid}-{attempts[mid]}'
        else:
            L = LETTERS.get(b['family'].upper(), 'X')
            used = free_used.setdefault(L, set())
            if fm:                                   # CRM-A14-1 (suffixe d'avant) → CRM-A14-0, même rang
                r = free_rank(fm.group(2), fm.group(3))
                used.discard(r)
            else:
                m = OLD_CR_FREE.match(b['id']) or re.search(r'(\d+)$', b['id'])
                r = int(m.group(2) if OLD_CR_FREE.match(b['id']) else m.group(1)) if m else 0
            r = r if r and r not in used else max(used | {0}) + 1
            used.add(r)
            new = f'CR{L}-{free_code(r)}-0'
        ind = re.match(r'^(\s*)', lines[b['id_line']]).group(1)
        lines[b['id_line']] = f'{ind}missionId: "{new}"' + ('' if b['former_line'] is not None else f'\n{ind}formerMissionId: "{b["id"]}"')
        if mid and b['num_line'] is not None and b['number'] != mid:
            lines[b['num_line']] = f'{ind}missionNumber: "{mid}"'
        table.append((new, b['id'], b['family'], b['date'], mid))
    if not table:
        print('Rien à renuméroter.')
        return
    now = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    text = '\n'.join(lines)
    text = re.sub(r'^updatedAt:.*$', f'updatedAt: "{now}"', text, count=1, flags=re.M)
    text = re.sub(r'^(# schemaVersion \d+ — ).*$', rf'\g<1>{now}', text, count=1, flags=re.M)
    for row in sorted(table):
        print(f'{row[1]:>12} → {row[0]:<14} {row[2]:<8} {row[3]} {row[4]}')
    if DRY:
        print(f'(simulation) {len(table)} CR.')
        return
    open(PATH, 'w', encoding='utf-8', newline='').write(text)
    trace = os.path.join(os.path.dirname(PATH), 'RENUMEROTATION_CR.md')
    head = '' if os.path.exists(trace) else '# Renumérotation des CR\n'
    with open(trace, 'a', encoding='utf-8') as f:
        f.write(head + f'\n## {now[:10]} — format CRM-016-1 (mission + essai), CRM-A01-0 (sans mission)\n\n| Nouveau | Ancien | Famille | Date | Mission |\n|---|---|---|---|---|\n'
                + ''.join(f'| {a} | {b} | {c} | {d} | {e} |\n' for a, b, c, d, e in sorted(table)))
    print(f'{len(table)} CR renumérotés.')


if __name__ == '__main__':
    main()
