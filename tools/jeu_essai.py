#!/usr/bin/env python3
"""Jeu d'essai : installe un dossier de données minimal (data/) pour découvrir ou tester la suite.

    python tools/jeu_essai.py --data data                       installe le jeu dans data/ (dossier vide ou absent)
    python tools/jeu_essai.py --data data --force               réinstalle par-dessus un jeu d'essai (dates à jour)
    python tools/jeu_essai.py --data DOSSIER --week 2026-10-12  jour de référence (défaut : aujourd'hui)

Contenu fixe (tools/jeu_essai/) : douze missions générées, traduites en anglais —
  · BOXING GLOVES (A-001 Z, A–E) : exercice organisé (A-001Z), deux éléments Rafale, un ravitailleur, deux chiffons
    (pistes adverses jouées) révélés par des événements radio à l'heure dite ;
  · EYE OF SOLOGNE (I-001 A–C) : E-3F AWACS (« le grand disque »), ravitailleur, patrouille Rafale ;
  · S-001 (SAR, H160), N-001 (maritime, Caracal), T-001 (transport, A400M) ;
quatre pilotes fictifs (ALF, BRV, CHL, DLT : fiches utilisateurs, référence), flotte des types de ces missions,
indicatifs, corrections OACI, configuration (catégories de disponibilité, mode develop).
Écrit à l'installation, daté d'après le jour de référence (le jeu reste actuel) :
  · disponibilités des quatre pilotes, semaine du jour de référence et suivante
    (data/disponibilites/<TRI>/<AAAA>-Wnn.json, appareils et simulateurs compris) ;
  · cinq affectations (A-001C, A-001A, A-001D : l'exercice, le lendemain, heure H 19:00Z ; I-001A à J+2 ; N-001 à J+3) :
    affectations.yaml de chaque mission, index data/missions/affectations.json, journal affectations_log.json ; chaque
    pilote affecté a une plage de disponibilité qui couvre son vol.
Le lanceur refait les index (disponibilités, utilisateurs) ; le registre des missions se construit dans la page
Registre (lecture du dossier des missions). --force ne remplace jamais d'autres données qu'un jeu d'essai (repère
data_tree.js : jeu_essai: true). Bibliothèque standard seule.
"""
import argparse
import datetime as dt
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(ROOT, 'tools', 'jeu_essai')
VA = 'SOG'

# appareils de la flotte du jeu (tools/jeu_essai/references/aircraft_fleet.js) : type, variante, base
AC = {
    'F-UHIB': ('RFAL', 'Rafale B', 'LFBM'), 'F-UHFP': ('RFAL', 'Rafale B', 'LFSI'), 'F-UHGC': ('RFAL', 'Rafale C', 'LFBM'),
    'F-UGJO': ('MIR2', 'Mirage 2000B', 'LFBM'), 'F-UGIE': ('MIR2', 'Mirage 2000B', 'LFBM'),
    'F-UJCR': ('A332', 'A330 MRTT Phénix', 'LFMI'), 'F-UJCH': ('A332', 'A330 MRTT Phénix', 'LFMI'),
    'F-UJCD': ('E3CF', '', 'LFOA'), 'F-UJCC': ('E3CF', '', 'LFOA'),
    'F-MCAF': ('EC25', '', 'LFBP'), 'F-HMRE': ('H160', '', 'LFRC'), 'F-RBAX': ('A400', '', 'LFOJ'),
}
# pilotes : types possédés / maîtrisés, simulateurs, semaine type (jour 0 = lundi : [(début, fin, catégorie)], heures UTC ;
# None = journée entière). Catégories : data/config/disponibilites.json.
PILOTS = {
    'ALF': {'own': ['RFAL', 'MIR2'], 'master': ['RFAL'], 'sims': ['X-PLANE 12'],
            'week': {0: [('17:00', '22:00', 'defense')], 1: [('18:00', '23:00', 'tout')], 2: [('16:00', '23:00', 'exercice_vol')],
                     3: [('19:00', '22:00', 'defense_perso')], 4: [(None, None, 'irl')],
                     5: [('09:00', '12:00', 'tout'), ('14:00', '18:00', 'vol_hors')], 6: [('14:00', '20:00', 'tout')]}},
    'BRV': {'own': ['A332', 'E3CF', 'A400'], 'master': ['A332', 'E3CF'], 'sims': ['MSFS 2024'],
            'week': {0: [('08:00', '12:00', 'dcs'), ('18:00', '23:00', 'tout')], 1: [(None, None, 'conges')],
                     2: [('15:00', '23:00', 'exercice_vol')], 3: [('17:00', '23:00', 'tout')], 4: [('16:00', '23:00', 'defense')],
                     5: [('08:00', '13:00', 'ctrl_hors')]}},
    'CHL': {'own': ['EC25', 'H160', 'RFAL'], 'master': ['EC25', 'H160'], 'sims': ['X-PLANE 12', 'MSFS 2020'],
            'week': {0: [('07:00', '11:00', 'secu')], 1: [('07:00', '11:00', 'secu'), ('18:00', '21:00', 'secu_perso')],
                     2: [('17:00', '22:00', 'exercice_ctrl')], 3: [('07:00', '12:00', 'tout')], 4: [('18:00', '23:00', 'secu')],
                     5: [(None, None, 'recup')], 6: [('10:00', '16:00', 'secu')]}},
    'DLT': {'own': ['MIR2', 'A400', 'H160'], 'master': ['MIR2', 'A400'], 'sims': ['MSFS 2020'],
            'week': {0: [(None, None, 'indispo')], 1: [('19:00', '23:00', 'tout')], 2: [('16:30', '22:30', 'exercice_vol')],
                     3: [('20:00', '23:00', 'ctrl_hors')], 4: [('17:00', '23:00', 'tout')], 5: [('08:00', '18:00', 'tout')],
                     6: [(None, None, 'conges')]}},
}
# affectations : mission, dossier, pilote, indicatif, appareil, départ, jour (après le jour de référence), heure de
# décollage UTC, durée bloc (min), exercice. L'exercice A-001 : heure H le lendemain à 19:00Z (A-001C H-55, A-001A H-20,
# A-001D H). Titre : celui du YAML de la mission.
ASSIGN = [
    ('A-001C', 'A_COMBAT/A-001C', 'BRV', 'COTAM3510', 'F-UJCR', 'LFMI', 1, '18:05', 190, True),
    ('A-001A', 'A_COMBAT/A-001A', 'ALF', 'MERCURE31', 'F-UHIB', 'LFBM', 1, '18:40', 102, True),
    ('A-001D', 'A_COMBAT/A-001D', 'DLT', 'CHIFFON401', 'F-UGJO', 'LFBM', 1, '19:00', 67, True),
    ('I-001A', 'I_ISR/I-001A', 'BRV', 'CYRANO01', 'F-UJCD', 'LFOA', 2, '18:00', 175, False),
    ('N-001', 'N_MARITIME/N-001', 'CHL', 'VAILLANT21', 'F-MCAF', 'LFRL', 3, '18:30', 120, False),
]


def iso(t):
    return t.strftime('%Y-%m-%dT%H:%M:%S.000Z')


def hhmm(t):
    return f'{t.hour:02d}:{t.minute // 15 * 15:02d}'


def week_id(d):
    y, w, _ = d.isocalendar()
    return f'{y}-W{w:02d}'


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def q(v):
    """Scalaire YAML (chaînes entre apostrophes, comme les fichiers écrits par la suite)."""
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def mission_file(folder):
    """(nom du YAML de la mission, titre) dans le contenu fixe du jeu."""
    d = os.path.join(STATIC, 'missions', folder)
    name = next(n for n in sorted(os.listdir(d)) if n.startswith('mission') and n.endswith('.yaml'))
    with open(os.path.join(d, name), encoding='utf-8') as f:
        for line in f:
            if line.startswith('title:'):
                return name, line[6:].strip().strip('"\'').replace("''", "'")
    return name, ''


def install(data, ref, now):
    shutil.copytree(STATIC, data, dirs_exist_ok=True)
    stamp = iso(now)
    monday = ref - dt.timedelta(days=ref.weekday())
    planned = []
    for row in ASSIGN:
        h, m = map(int, row[7].split(':'))
        planned.append((row, dt.datetime.combine(ref + dt.timedelta(days=row[6]), dt.time(h, m), tzinfo=dt.timezone.utc)))
    # plage couvrant chaque vol affecté : une heure avant le décollage, jusqu'à 30 min après l'arrivée (même jour)
    extra = {}
    for row, takeoff in planned:
        end = min(takeoff + dt.timedelta(minutes=row[8] + 30),
                  dt.datetime.combine(takeoff.date(), dt.time(23, 45), tzinfo=dt.timezone.utc))
        extra.setdefault((row[2], takeoff.date().isoformat()), []).append(
            {'debut': hhmm(takeoff - dt.timedelta(hours=1)), 'fin': hhmm(end), 'categorie': 'exercice_vol' if row[9] else 'tout'})
    # disponibilités : semaine du jour de référence et suivante
    for tri, p in PILOTS.items():
        for k in range(2):
            mon = monday + dt.timedelta(days=7 * k)
            dispos = {}
            for day in range(7):
                d = (mon + dt.timedelta(days=day)).isoformat()
                fly = extra.get((tri, d), [])
                # jour d'un vol affecté : pas d'indisponibilité sur la journée entière (congés, récupération…)
                slots = [{'debut': a, 'fin': b, 'categorie': c} for a, b, c in p['week'].get(day, [])
                         if not (fly and a is None and c in ('indispo', 'conges', 'recup', 'irl'))] + fly
                if slots:
                    dispos[d] = slots
            write_json(os.path.join(data, 'disponibilites', tri, f'{week_id(mon)}.json'), {
                'schema': 2, 'va': VA, 'pilote': tri, 'semaine': week_id(mon), 'updated_at': stamp, 'by': tri,
                'dispos': dispos, 'appareils': {'possedes': p['own'], 'maitrises': p['master']}, 'simulateurs': p['sims']})
    # affectations (formats de shared/assignments.js : writeAssignment, index, journal)
    index, log = [], []
    for (mid, folder, tri, cs, reg, dep, _day, _hm, block, _ex), takeoff in planned:
        typ, var, base = AC[reg]
        yaml_name, title = mission_file(folder)
        ferry = None if base == dep else {'from': base, 'to': dep, 'baseKnown': True, 'minutes': 45,
                                         'takeoff': iso(takeoff - dt.timedelta(minutes=105)), 'pilot': tri}
        part = {'pilot': tri, 'callsign': cs, 'aircraft': {'registration': reg, 'type': typ, 'variant': var, 'base': base},
                'departure': dep, 'takeoff': iso(takeoff), 'ferry': ferry, 'block_min': block, 'status': 'affectée'}
        lines = [f'# Affectations de la mission {mid} — docs/AFFECTATION_MISSIONS.md', f'mission: {mid}', f'updated_at: {q(stamp)}',
                 f'by: {tri}', 'h_hour: null', 'participants:', f'  - pilot: {tri}', f'    callsign: {cs}', '    aircraft:',
                 f'      registration: {reg}', f'      type: {typ}', f'      variant: {q(var)}', f'      base: {base}',
                 f'    departure: {dep}', f'    takeoff: {q(iso(takeoff))}']
        lines += (['    ferry:'] + [f'      {k}: {q(v)}' for k, v in ferry.items()]) if ferry else ['    ferry: null']
        lines += [f'    block_min: {block}', f"    status: {q('affectée')}", 'alert: null']
        with open(os.path.join(data, 'missions', folder, 'affectations.yaml'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(lines) + '\n')
        index.append({'mission': mid, 'title': title, 'type': folder.split('/')[0].split('_', 1)[1], 'folder': folder,
                      'files': {'yaml': yaml_name, 'md': '', 'maps': []}, 'h_hour': None, 'alert': None, 'updated_at': stamp,
                      'by': tri, **part, 'role': 'mission'})
        log.append({'at': stamp, 'by': tri, 'action': 'affecte', 'mission': mid, 'title': title, 'pilot': tri,
                    'aircraft': f'{typ} {reg}', 'callsign': cs, 'takeoff': iso(takeoff), 'role': 'mission'})
    write_json(os.path.join(data, 'missions', 'affectations.json'), {'assignments': index, 'updatedAt': stamp})
    write_json(os.path.join(data, 'missions', 'affectations_log.json'), {'entries': log, 'updatedAt': stamp})
    return monday


def is_stub(data):
    """Vrai si data/ est un jeu d'essai (repère data_tree.js : jeu_essai: true)."""
    try:
        with open(os.path.join(data, 'data_tree.js'), encoding='utf-8') as f:
            return 'jeu_essai: true' in f.read()
    except OSError:
        return False


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', required=True, help='dossier des données à créer (data/ de l’application)')
    ap.add_argument('--week', help='jour de référence AAAA-MM-JJ : affectations les jours suivants, disponibilités de sa '
                                   'semaine et de la suivante (défaut : aujourd’hui)')
    ap.add_argument('--force', action='store_true', help='réinstaller par-dessus un jeu d’essai (dates remises à jour) ; '
                                                         'jamais par-dessus d’autres données')
    a = ap.parse_args()
    data = os.path.abspath(a.data)
    if os.path.isfile(os.path.join(data, 'data_tree.js')) and not (a.force and is_stub(data)):
        print(f'{data} contient déjà des données (data_tree.js) : rien n’est écrit'
              + (' (--force pour réinstaller le jeu d’essai).' if is_stub(data) else ' (--force ne remplace qu’un jeu d’essai).'))
        return 2
    now = dt.datetime.now(dt.timezone.utc)
    ref = dt.date.fromisoformat(a.week) if a.week else now.date()
    monday = install(data, ref, now)
    print(f'Jeu d’essai installé dans {data} : 12 missions, 4 pilotes (ALF, BRV, CHL, DLT), disponibilités '
          f'{week_id(monday)} et {week_id(monday + dt.timedelta(days=7))}, 5 affectations (exercice BOXING GLOVES le '
          f'{(ref + dt.timedelta(days=1)).isoformat()}, heure H 19:00Z).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
