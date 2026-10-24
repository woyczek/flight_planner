"""Journeys (PLAN.md sections N and O): the functional scope of the Pilot application, as data.

A **journey** is a path the pilot walks through the application, in order, across modules: what the user means by a
"feature".  Each one names

  * `title`  : its name, in French (what the report and the `JOURNEY` line print);
  * `steps`  : the steps in order, as the plan writes them;
  * `paths`  : the globs of the files that carry it, so that a changed file is mapped to the journeys it can break
               (same glob syntax as `domains.py`: `*` stays inside one directory level, `**` crosses directories);
  * `cases`  : the area cases that already guard its screens (`'F1'`, or a range written as the plan writes it, `'B1–B4'`);
  * `e2e`    : the id of its end-to-end case (`cases/journeys.py`), which walks the whole path in one browser.

`run.py --changed` / `--for` map the files to areas (domains.py) and to journeys (here), add the `e2e` case of every
touched journey to the selection and print one `JOURNEY` line per journey; `--journey P1,P3` runs those journeys' guard
cases and end-to-end cases.  A new screen or record of a module adds its file to the journey it serves, here, in the same
commit (README.md, "Journeys").  A glob that matches no file today (`frame/weather/**`, `frame/lib/geo.js`) is kept as the
plan wrote it: it is the place the file will take when it appears.

Standard library only.
"""
import re

from domains import _rx

JOURNEYS = {
    'P1': {
        'title': 'Préparer un vol',
        'steps': [
            'Préparer › Devis: aircraft, departure, arrival, alternate, load',
            'quote (block, trip, time, TOD)',
            'level decision (Fiches / levels)',
            '`current_flight.json` written as *planned*',
            'Carte shows the route, the profile and the title "Profil · FL · NM · vol prévu"',
            'Météo (atmosphere) reads the same flight, "Charger" is the user\'s one shot',
            'back on Carte the Météo chip draws the cut',
        ],
        'paths': ['modules/fuel/**', 'modules/maps/**', 'modules/atmosphere/**', 'frame/app.js', 'frame/lib/sheet.js',
                  'frame/design/primitives.css', 'frame/aerodb/**', 'frame/weather/**'],
        'cases': ['F1', 'F2', 'F3', 'D1', 'D3', 'D4', 'D7', 'C2', 'C5', 'E1', 'E3', 'B1–B4'],
        'e2e': 'J1',
    },
    'P2': {
        'title': 'Voler',
        'steps': [
            'Préparer: "Démarrer le vol" (fuel § 12)',
            '`started = {at, by}`',
            '"i" badge green, pop-up row "Vol en cours › Carte"',
            'Carte: title "vol en cours", Follow shown, position from GPS or none (notification once), progress block in the sheet notes',
            'full screen',
            'end: "Annuler le démarrage" or the report',
        ],
        'paths': ['modules/fuel/progress.js', 'modules/fuel/module.js', 'modules/maps/**', 'frame/app.js', 'frame/lib/geo.js'],
        'cases': ['A8', 'A9', 'D8', 'B5', 'B7', 'B8'],
        'e2e': 'J2',
    },
    'P3': {
        'title': 'Rendre compte',
        'steps': [
            'Vols lists a flight without a report',
            '`pending.json` (schema 2, `handoff`)',
            '"i" badge green, row "CR à écrire"',
            'tap → `pilot/handoff.json` written',
            '`#report` prefilled (family, values)',
            'three steps',
            'save (`sog-report/1`)',
            'record on the website (same gesture; offline: queued, said so)',
            '`started = null`, pending cleared, Vols shows the report',
        ],
        'paths': ['modules/flightlog/**', 'modules/report/**', 'modules/website/**', 'frame/app.js', 'frame/settings/join.js'],
        'cases': ['G1', 'G2', 'G3', 'A8', 'A9'],
        'e2e': 'J3',
    },
    'P4': {
        'title': 'Relire ses vols',
        'steps': [
            'Vols: list, filters (period, aircraft, without report), totals, export',
            'the website log and the network sessions (IVAO / VATSIM) merged when the access is set',
        ],
        'paths': ['modules/flightlog/**', 'modules/website/**'],
        'cases': ['G2'],
        'e2e': 'J4',
    },
    'P5': {
        'title': 'Installer et synchroniser',
        'steps': [
            'first launch without trigram → amber badge',
            'Réglages: trigram, data access (GitHub mode or launcher), join the airline',
            'sync dot (header on a screen, "i" line on a phone)',
            'offline: amber, writes pending',
            'conflicts screen',
            'design and language choice',
            'help',
        ],
        'paths': ['frame/app.js', 'frame/settings/**', 'frame/design/**', 'frame/help/**', 'frame/manifest.webmanifest',
                  'frame/sw.js', 'frame/index.html'],
        'cases': ['A2', 'A3', 'A8', 'A9', 'A10', 'A11', 'A12', 'H1–H3'],
        'e2e': 'J5',
    },
    'P6': {
        'title': 'Carte de mission',
        'steps': [
            'a mission map (from the studio\'s YAML) opened from Carte › Couches "Carte à montrer"',
            'route-edit buttons hidden',
            'the trace unrolled',
            'the sheet shows the mission\'s content',
        ],
        'paths': ['modules/maps/mission.js', 'modules/maps/module.js', 'modules/maps/lib/map_base.js'],
        'cases': ['D10'],
        'e2e': 'J6',
    },
}

_COMPILED = {j: [(_rx(g), g) for g in d['paths']] for j, d in JOURNEYS.items()}
_ID = re.compile(r'^([A-Z])(\d+)$')


def expand(entry):
    """Case ids of a `cases` entry: `'F1'` is itself, `'B1–B4'` (en dash or hyphen) is B1 B2 B3 B4."""
    parts = re.split(r'\s*[–-]\s*', entry.strip())
    if len(parts) == 1:
        return [parts[0]]
    a, b = _ID.match(parts[0]), _ID.match(parts[1])
    if not (a and b and a.group(1) == b.group(1)):
        raise ValueError(f'journeys.py: bad case range {entry!r}')
    return [f'{a.group(1)}{n}' for n in range(int(a.group(2)), int(b.group(2)) + 1)]


def guard_cases(journey):
    """The area cases that guard the journey's screens, ranges expanded, in the plan's order."""
    out = []
    for e in JOURNEYS[journey]['cases']:
        out += [x for x in expand(e) if x not in out]
    return out


def journey_cases(ids):
    """Guard cases and end-to-end cases of the journeys `ids` (for `--journey`)."""
    out = []
    for j in ids:
        out += [x for x in guard_cases(j) + [JOURNEYS[j]['e2e']] if x not in out]
    return out


def touched(paths):
    """{journey id: [the changed paths that map to it]} for a list of repository-relative paths, journeys in table order.
    A path can map to several journeys (`frame/app.js` carries P1, P2, P3 and P5); one that maps to none is only an area."""
    hit = {}
    for raw in paths:
        p = raw.replace('\\', '/').lstrip('./')
        for j, rxs in _COMPILED.items():
            if any(rx.match(p) for rx, _ in rxs):
                hit.setdefault(j, []).append(raw)
    return {j: hit[j] for j in JOURNEYS if j in hit}


def line(journey, files):
    """The `JOURNEY P1 Préparer un vol — <files>` line printed before the first case and written in the report."""
    return f'JOURNEY {journey} {JOURNEYS[journey]["title"]} — {", ".join(files)}'


def check_cases(registry):
    """Problems of the table against the registered cases (an unknown id, a missing end-to-end case): the runner prints them,
    so that a renamed case does not silently leave a journey unguarded."""
    out = []
    for j, d in JOURNEYS.items():
        for cid in guard_cases(j) + [d['e2e']]:
            if cid not in registry:
                out.append(f'journey {j}: case {cid} is not registered')
    return out
