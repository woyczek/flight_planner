"""Adherence map (PLAN.md section M): which cases run for which changed path.

A selector is an area letter (`'B'`: every case of area B) or a case id (`'A12'`).  Rules are tried in order and the
first glob that matches a path decides for that path; the answer for a set of paths is the union of their selectors.
A path that matches nothing runs `FALLBACK` (the smoke case and the static rules).

Globs: `*` stays inside one directory level, `**` crosses directories.
"""
import re
import subprocess

FRAME_ALL = list('ABCDEFGHI')
SHEET = ['B', 'C', 'D', 'E', 'I']
HELP = ['I', 'A11', 'A17', 'A18']
TITLED = ['A2', 'A17', 'A18']          # non-fixed modules: title in the phone header, "?" at the right paragraph, how-to card
BASE_DEFAULT = 'origin/v3'

# (glob, selectors, why) -- order matters: specific before general
RULES = [
    ('docs/**', ['I'], 'documents only'),
    ('**/*.md', ['I'], 'documents only'),
    ('frame/help/**', HELP, 'manuals of the frame'),
    ('apps/aide/**', HELP, 'online help bundle'),
    ('modules/*/help/**', HELP, 'manuals of a module'),
    ('frame/lib/sheet.js', SHEET, 'sheet primitive: the two fixed modules'),
    ('frame/design/primitives.css', SHEET, 'sheet and overlay primitives'),
    ('frame/lib/test/weather_store.html', ['A25', 'I'], 'weather layer bench'),
    ('frame/lib/weather_store.js', ['A25', 'A8', 'D', 'E', 'F', 'I'], 'weather layer: its bench, the Status line, its readers, the map cut among them'),
    ('frame/lib/routing.js', ['F', 'I'], "airway path finding: fuel's Auto button"),
    ('frame/lib/test/routing.html', ['F'], 'routing bench'),
    ('frame/lib/test/current_flight.html', ['D', 'I'], 'the flight in time: bench (D38)'),
    ('frame/lib/test/launcher.html', ['A29', 'I'], 'launcher client bench'),
    ('frame/store/test/publish.html', ['A30', 'I'], 'publication bench'),
    ('frame/store/test/revalidate.html', ['A33', 'I'], 'revalidate bench'),
    ('frame/lib/test/**', ['C', 'I'], 'sheet bench'),
    ('modules/hello/**', ['A34', 'I'], 'the example module (ctx.consume)'),
    ('frame/app.js', FRAME_ALL, 'the frame reaches every screen'),
    ('frame/frame.css', FRAME_ALL, 'the frame reaches every screen'),
    ('frame/index.html', FRAME_ALL, 'the frame reaches every screen'),
    ('frame/lib/*.js', FRAME_ALL, 'frame library'),
    ('frame/design/**', ['A', 'H', 'I', 'B2', 'B9'], 'designs and chrome (button look)'),
    ('frame/settings/**', ['A8', 'A12', 'A19', 'A20', 'D5', 'I'], 'settings screen, its Status block and the keys of the device; aerodb warning on maps'),
    ('frame/store/**', ['A12', 'A15', 'A19', 'A30', 'A33', 'I'], 'data layer: settings, access states, keys of the device'),
    ('frame/aerodb/**', ['A12', 'A20', 'D5', 'K', 'I'], 'settings screen; aerodb warning on maps; the aerodb benches; the Sources screen'),
    ('tests/v3/cases/aerodb.py', ['K'], 'the aerodb cases'),
    ('tests/v3/cases/maps_recode.py', ['D'], 'the map cases added with the recode'),
    ('tests/v3/fixtures/missions/**', ['D33', 'D38', 'J6'], 'the synthetic mission of the map tests'),
    ('modules/maps/lib/map_base.js', ['D', 'E', 'B', 'I'], 'shared map base: both map modules'),
    ('modules/maps/**', ['D', 'B', 'C', 'I'], 'the map module and the primitives it uses'),
    ('modules/atmosphere/**', ['E', 'B', 'C', 'I'], 'the atmosphere module and the primitives it uses'),
    ('modules/fuel/**', ['F', 'I', 'A7'] + TITLED, 'fuel (in the Preparer group: the popover)'),
    ('modules/flightlog/**', ['G', 'I', 'A8', 'A9'] + TITLED, 'flightlog (the Status block and the gear read its pending file)'),
    ('modules/report/**', ['G', 'I', 'A8', 'A9'] + TITLED, 'report (the Status block hands over to it)'),
    ('tools/proc_sia.py', ['K', 'I'], 'the SIA eAIP procedures reader (France) and its aerodb cases'),
    ('tools/proc_layouts.py', ['K', 'I'], 'the foreign page layouts (one ordered list) and their aerodb cases'),
    ('tools/proc_records.py', ['K', 'I'], 'lines to records, the common pass of every reader, and its aerodb cases'),
    ('tools/proc_pdf.py', ['K', 'I'], 'PDF reading shared by the readers and its aerodb cases'),
    ('tools/proc_geometry.py', ['K', 'I'], 'the geometry check and the doubt policy and their aerodb cases'),
    ('tools/proc_ocr.py', ['K', 'I'], 'the OCR reader of drawn pages and its aerodb cases'),
    ('tools/ead_probe.py', ['K', 'I'], 'the EAD Basic probe and its aerodb case'),
    ('tools/proc_cifp.py', ['K', 'I'], 'the FAA CIFP procedures builder and its aerodb case'),
    ('tools/proc_ead.py', ['K', 'I'], 'the EAD Basic library (survey, fetch) and its aerodb case'),
    ('tools/proc_manual.py', ['K', 'I'], 'the manual interpretations installer and its aerodb case'),
    ('tools/regen/proc.py', ['K', 'I8', 'I'], "the launcher's reading job for the procedures (one job, a source table) and its aerodb cases"),
    ('tools/regen_jobs.py', ['I8', 'I'], "the launcher's jobs base (Data module)"),
    ('tools/launch.py', ['I8', 'A12', 'A29', 'I'], 'the launcher: its routes, Settings, the client of the frame'),
    ('tools/**', ['I'], 'tooling'),
    ('tests/**', ['I'], 'tooling'),
    ('.github/**', ['I'], 'tooling'),
]
FALLBACK = (['A1', 'I'], 'anything else: smoke and static rules')


def _rx(glob):
    out, i = '', 0
    while i < len(glob):
        if glob.startswith('**/', i):
            out += '(?:.*/)?'
            i += 3
        elif glob.startswith('**', i):
            out += '.*'
            i += 2
        elif glob[i] == '*':
            out += '[^/]*'
            i += 1
        else:
            out += re.escape(glob[i])
            i += 1
    return re.compile('^' + out + '$')


_COMPILED = [(_rx(g), sel, why, g) for g, sel, why in RULES]


def selectors_for(path):
    """(selectors, why, glob) for one repository-relative path."""
    p = path.replace('\\', '/').lstrip('./')
    for rx, sel, why, g in _COMPILED:
        if rx.match(p):
            return sel, why, g
    return FALLBACK[0], FALLBACK[1], '*'


def select(paths):
    """(set of selectors, [explanations]) for a list of paths."""
    chosen, why = set(), []
    for p in paths:
        sel, w, g = selectors_for(p)
        chosen.update(sel)
        why.append(f'{p} -> {" ".join(sel)} ({w})')
    return chosen, why


def matches(case, selectors):
    """True if the case is chosen by one of the selectors (area letter, case id)."""
    return case.area in selectors or case.id in selectors


def changed_paths(root, base=None):
    """Paths changed since `base` (default origin/v3): commits `base...HEAD`, plus the working tree and untracked files."""
    base = base or BASE_DEFAULT

    def run(*a):
        p = subprocess.run(['git', *a], cwd=root, capture_output=True, text=True, encoding='utf-8', errors='replace')
        return p.returncode, p.stdout.split('\n')
    rc, committed = run('diff', '--name-only', f'{base}...HEAD')
    if rc != 0:
        rc, committed = run('diff', '--name-only', f'{base}..HEAD')
    if rc != 0:
        raise SystemExit(f'--changed: cannot diff against {base!r} (is the ref known? try --changed <base>)')
    paths = set(committed)
    paths.update(run('diff', '--name-only', 'HEAD')[1])
    paths.update(run('ls-files', '--others', '--exclude-standard')[1])
    return sorted(p for p in paths if p)
