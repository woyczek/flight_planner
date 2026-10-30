#!/usr/bin/env python3
"""Runner of the V3 non-regression suite (tests/v3/PLAN.md; how-to in tests/v3/README.md).

    python tests/v3/run.py                       # --all
    python tests/v3/run.py --changed [<base>]    # cases chosen by the files changed since <base> (default origin/v3)
    python tests/v3/run.py --touched [<base>]    # the same, plus the smoke base (domains.SMOKE): the pass before a push
    python tests/v3/run.py --for modules/atmosphere/module.js docs/x.md
    python tests/v3/run.py --grep B2             # an id, or text of a title / tag; commas for several
    python tests/v3/run.py --journey P1,P3       # the guard cases and the end-to-end case of those journeys (PLAN.md section N)
    python tests/v3/run.py --for modules/fuel/progress.js --list     # the areas and the journeys of a change, nothing run
    python tests/v3/run.py --failed [B2,D5]      # replay the failed cases of the last report, in the combinations that failed
    python tests/v3/run.py --failed-scope [BASE] # their full scope: every area and journey they belong to + the files changed since BASE
    python tests/v3/run.py --designs standard,metro --widths 390 --langs fr --tag overlay

Starts a static server (standard library) on a free port of 127.0.0.1 at the repository root, runs the selected cases
in Chromium (Playwright) in a few worker processes, writes tests/v3/report.md and report.json, prints one line per case
and a summary, kills the server, and exits 0 only if no case failed outside cases/known_failures.py.
Standard library and Playwright only.
"""
import argparse
import atexit
import datetime
import json
import multiprocessing
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import domains  # noqa: E402
import journeys  # noqa: E402
import lib  # noqa: E402

ROOT = lib.ROOT
# workers by default: the physical cores less two (os.cpu_count() counts the logical ones, two per core); measured on the
# 12-core workstation (DECISIONS, 30 Oct 2026)
DEFAULT_JOBS = max(1, (os.cpu_count() or 4) // 2 - 2)
SLOWEST = 20  # report.md: the slowest cases, to replace their fixed waits by waits on a condition
# one heavy pass at a time on this computer (two at 10 workers each crashed a browser driver, 30 Oct 2026): a full pass, or
# any pass of more than HEAVY cases (an area with --grep, a large --touched); the lock lives in the computer's temp folder,
# not in the repository, so that the sessions' worktrees see each other's; a lock older than two hours or whose process is
# gone is ignored
HEAVY = 30
FULL_LOCK = Path(tempfile.gettempdir()) / 'sog-noreg-full.lock'
LOCK_STALE = 2 * 3600


def pid_alive(pid):
    """True while the process runs.  On Windows os.kill(pid, 0) would end it: the process is asked through the API."""
    if not isinstance(pid, int) or pid <= 0:
        return False
    if os.name == 'nt':
        import ctypes
        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_ulong()
        ok = k.GetExitCodeProcess(h, ctypes.byref(code))
        k.CloseHandle(h)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def lock_holder():
    """The running full pass that holds the lock ({ pid, at, cwd }), or None (no lock, stale, or its process gone)."""
    try:
        h = json.loads(FULL_LOCK.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None
    if not isinstance(h, dict) or time.time() - float(h.get('at') or 0) > LOCK_STALE or not pid_alive(h.get('pid')):
        return None
    return h


def take_lock(wait=False):
    """Takes the full-pass lock; True when taken.  Held by another running pass: False at once, or (wait) once it is free."""
    said = False
    while True:
        try:
            fd = os.open(FULL_LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            h = lock_holder()
            if h is None:  # stale, or its process gone: removed, then taken again
                try:
                    FULL_LOCK.unlink()
                except OSError:
                    pass
                continue
            if not wait:
                print(f"another heavy pass is running (pid {h.get('pid')}, since {time.strftime('%H:%M', time.localtime(h.get('at', 0)))}, "
                      f"{h.get('cwd', '?')}): --wait to start after it")
                return False
            if not said:
                print(f"waiting for the heavy pass of pid {h.get('pid')} ({h.get('cwd', '?')}) to end…")
                said = True
            time.sleep(10)
            continue
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump({'pid': os.getpid(), 'at': time.time(), 'cwd': str(ROOT)}, f)
        atexit.register(drop_lock)
        return True


def drop_lock():
    """Removes the lock if it is this process's."""
    try:
        if json.loads(FULL_LOCK.read_text(encoding='utf-8')).get('pid') == os.getpid():
            FULL_LOCK.unlink()
    except (OSError, ValueError, AttributeError):
        pass


def full_pass(args):
    """A full pass: no selector and no filter (the targeted passes, --touched first, stay free)."""
    # --changed, --touched, --failed, --failed-scope without a value are '' (given), not None (absent)
    return (all(getattr(args, k, None) is None for k in ('changed', 'touched', 'failed', 'failed_scope'))
            and not any(getattr(args, k, None) for k in ('paths', 'grep', 'designs', 'widths', 'langs', 'tag', 'journey')))


# ------------------------------------------------------------------------------------------------------ server
def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def start_server():
    """Static server of the repository root; returns (Popen, base url).  The caller terminates it."""
    port = free_port()
    # our own server (static_server.py): python -m http.server lost loads at random under Windows (its queue of 5)
    proc = subprocess.Popen([sys.executable, str(Path(__file__).with_name('static_server.py')), str(port), str(ROOT)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=str(ROOT))
    base = f'http://127.0.0.1:{port}'
    for _ in range(100):                         # wait until it answers
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    return proc, base


def stop_server(proc):
    if proc and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


# ------------------------------------------------------------------------------------------------------ selection
def csv(v):
    return [x.strip() for x in v.split(',') if x.strip()] if v else []


def git_head():
    p = subprocess.run(['git', 'log', '-1', '--format=%h %s'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    b = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                       errors='replace')
    return f'{b.stdout.strip()} @ {p.stdout.strip()[:90]}'


def select_cases(args, registry):
    """(cases, header, touched) following --all / --changed / --for / --journey, then --grep and --tag.  `touched` is the
    journeys the paths map to ({id: [paths]}, PLAN.md section O), None when the run is not chosen by paths or by --journey."""
    cases = list(registry.values())
    header = 'all areas'
    touched = None
    paths = None
    if args.touched is not None:
        args.changed = args.touched
    if args.changed is not None:
        paths = domains.changed_paths(ROOT, args.changed or None)
        if not paths and not args.journey:
            if args.touched is not None:  # nothing changed: the smoke base still runs
                return [registry[i] for i in domains.SMOKE if i in registry], '--touched: no changed path, smoke base only', {}
            return [], 'no changed path since ' + (args.changed or domains.BASE_DEFAULT), {}
        sel, why = domains.select(paths)
        header = f'--changed {args.changed or domains.BASE_DEFAULT}: ' + '; '.join(why[:12]) + (f' (+{len(why) - 12} more)' if len(why) > 12 else '')
    elif args.paths:
        paths = args.paths
        sel, why = domains.select(paths)
        header = '--for: ' + '; '.join(why)
    if paths is not None:
        touched = journeys.touched(paths)
        ids = {journeys.JOURNEYS[j]['e2e'] for j in touched}                  # the end-to-end case of each journey touched is added
        if args.touched is not None:
            ids |= set(domains.SMOKE)
            header = header.replace('--changed', '--touched', 1) + ' | + smoke base'
        cases = [c for c in cases if domains.matches(c, sel) or c.id in ids]
    if args.journey:
        wanted = [j.upper() for j in csv(args.journey)]
        bad = [j for j in wanted if j not in journeys.JOURNEYS]
        if bad:
            raise SystemExit(f'--journey: unknown journey {", ".join(bad)} (known: {", ".join(journeys.JOURNEYS)})')
        ids = set(journeys.journey_cases(wanted))
        if paths is None:
            cases = [c for c in registry.values() if c.id in ids]
            header = f'--journey {",".join(wanted)}'
        else:                                                    # with --changed / --for: those too
            cases = cases + [c for c in registry.values() if c.id in ids and c not in cases]
            header += f' | --journey {",".join(wanted)}'
        touched = dict(touched or {})
        for j in wanted:
            touched.setdefault(j, [])
    if args.grep:
        toks = [t.lower() for t in csv(args.grep)]
        def hit(c):
            for t in toks:
                if t == c.id.lower() or t == c.area.lower():
                    return True
                if len(t) >= 3 and (t in c.title.lower() or t in ' '.join(c.tags).lower()):
                    return True
            return False
        cases = [c for c in cases if hit(c)]
        header += f' | --grep {args.grep}'
    if args.tag:
        tags = set(csv(args.tag))
        cases = [c for c in cases if tags & set(c.tags)]
        header += f' | --tag {args.tag}'
    return cases, header, touched


def areas_text(sel):
    """`F I (+A7)`: the area letters of a selection, then the single cases it adds (PLAN.md section M)."""
    letters = sorted(x for x in sel if len(x) == 1)
    ids = sorted((x for x in sel if len(x) > 1), key=lambda x: (x[0], int(x[1:]) if x[1:].isdigit() else 0))
    return ' '.join(letters) + (' (+' + ' +'.join(ids) + ')' if ids else '')


def journey_lines(touched):
    """The `JOURNEY P1 Préparer un vol — <files>` lines of a run chosen by paths or by --journey (PLAN.md section O); nothing
    for a full run (touched is None).  A journey named by --journey alone has no file: it says so."""
    if touched is None:
        return []
    if not touched:
        return ['JOURNEY none (areas only)']
    return [journeys.line(j, files or ['(named by --journey)']) for j, files in touched.items()]


# ------------------------------------------------------------------------------------------------------ replaying failures
REPORT = HERE / 'report.json'
PREV_SECS = {}  # id -> seconds per run in the last report (order of the browser jobs)


def parse_label(label):
    """The (width, design, lang, tone) of a run label as `run_label` wrote it: `390/metro/fr`, `390/standard/fr/night`, `static`."""
    if label == 'static':
        return (0, '-', '-', '-')
    p = label.split('/')
    return (int(p[0]), p[1], p[2], 'night' if len(p) > 3 and p[3] == 'night' else 'day')


def failures_of(results):
    """The failures of a run: [{id, status, known, runs}] (FAIL and ERROR; `known`: the mark of cases/known_failures.py or None)."""
    return [{'id': r['id'], 'status': r['status'], 'known': r.get('known'), 'runs': list(r.get('failing', []))}
            for r in results if r['status'] in ('FAIL', 'ERROR')]


def previous_report():
    """(report dict, None) or (None, why) for the last tests/v3/report.json."""
    if not REPORT.exists():
        return None, 'no previous report (tests/v3/report.json): run the suite first, then replay what failed'
    try:
        return json.loads(REPORT.read_text(encoding='utf-8')), None
    except ValueError:
        return None, 'tests/v3/report.json is not readable: run the suite again'


def previous_failures(report):
    """The failures the last report tracks.  A replay or scope run carries the failures it replays (`meta.failed`), so that the two
    commands of the routine (`--failed`, then `--failed-scope`) can follow one another even when the first one passes."""
    tracked = (report.get('meta') or {}).get('failed')
    return tracked if tracked is not None else failures_of(report.get('cases', []))


def select_failed(args, registry, report):
    """(cases, header, touched, jobs) for --failed [IDS]: the failed cases of the last report, in the combinations that failed."""
    tracked = previous_failures(report)
    wanted = [i.upper() for i in csv(args.failed)]
    if wanted:
        unknown = [i for i in wanted if i not in {f['id'] for f in tracked}]
        if unknown:
            print(f'--failed: {", ".join(unknown)} did not fail in the last report; failed there: {", ".join(f["id"] for f in tracked) or "nothing"}')
        tracked = [f for f in tracked if f['id'] in wanted]
    tracked = [f for f in tracked if f['id'] in registry]
    jobs = [(f['id'], *parse_label(lab)) for f in tracked for lab in f['runs']]
    cases = [registry[f['id']] for f in tracked]
    ids = ', '.join(f['id'] for f in tracked)
    return cases, f'Replay of {report["meta"].get("date", "?")} : {ids}', None, jobs


def select_scope(args, registry, report):
    """(cases, header, touched, paths) for --failed-scope [BASE]: every area and journey the failed cases belong to, in the full
    grid, plus the cases chosen by the files changed since BASE (the files of the fix)."""
    tracked = [f for f in previous_failures(report) if f['id'] in registry]
    ids = [f['id'] for f in tracked]
    areas = sorted({registry[i].area for i in ids} - {'J'})      # a journey case belongs to its journey, not to a whole area J
    js = [j for j, d in journeys.JOURNEYS.items() if any(i in journeys.guard_cases(j) + [d['e2e']] for i in ids)]
    selected = {c.id for c in registry.values() if c.area in areas} | set(journeys.journey_cases(js)) | set(ids)
    try:
        paths = domains.changed_paths(ROOT, args.failed_scope or None)
        base_err = ''
    except SystemExit as e:
        paths, base_err = [], str(e)
    sel, _ = domains.select(paths) if paths else (set(), [])
    touched = journeys.touched(paths)
    selected |= {c.id for c in registry.values() if domains.matches(c, sel)} | {journeys.JOURNEYS[j]['e2e'] for j in touched}
    cases = [c for c in registry.values() if c.id in selected]
    for j in js:                                       # a journey reached by a failed case, not by a file: the line says which case
        own = [i for i in ids if i in journeys.guard_cases(j) + [journeys.JOURNEYS[j]['e2e']]]
        touched.setdefault(j, []).append('failed case ' + ' '.join(own))
    touched = {j: touched[j] for j in journeys.JOURNEYS if j in touched}
    shown = ', '.join(paths[:6]) + (f' (+{len(paths) - 6} more)' if len(paths) > 6 else '') if paths else ('none' + (f' ({base_err})' if base_err else ''))
    header = (f'Scope of failures {" ".join(ids) or "(none)"}: areas {" ".join(areas) or "-"}, journeys {" ".join(js) or "-"}, changed: {shown}')
    return cases, header, touched, paths


def jobs_for(cases, args):
    designs, widths, langs = set(csv(args.designs)), {int(w) for w in csv(args.widths)}, set(csv(args.langs))
    jobs, kept = [], []
    for c in cases:
        runs = [r for r in c.runs()
                if c.static or ((not widths or r[0] in widths) and (not designs or r[1] in designs) and (not langs or r[2] in langs))]
        if runs:
            kept.append(c)
            jobs += [(c.id, *r) for r in runs]
    return kept, jobs


# ------------------------------------------------------------------------------------------------------ aggregation
def run_label(r):
    if r['width'] == 0:
        return 'static'
    return f"{r['width']}/{r['design']}/{r['lang']}" + ('/night' if r['tone'] == 'night' else '')


def aggregate(case, runs, known):
    """One result per case from its runs: ERROR > FAIL > PASS > SKIP."""
    runs = sorted(runs, key=lambda r: (r['width'] == 0, -r['width'], lib.DESIGNS.index(r['design']) if r['design'] in lib.DESIGNS else 9,
                                       r['lang'], r['tone']))
    bad = [r for r in runs if r['status'] in ('FAIL', 'ERROR')]
    out = {'id': case.id, 'title': case.title, 'area': case.area, 'tags': list(case.tags), 'rule': case.rule,
           'runs': len(runs), 'secs': round(sum(r.get('secs', 0) for r in runs), 1), 'known': None}
    if bad:
        first = bad[0]
        out.update(status='ERROR' if any(r['status'] == 'ERROR' for r in bad) else 'FAIL',
                   measured=first.get('measured', ''), expected=first.get('expected', ''), rule=first.get('rule') or case.rule,
                   where=run_label(first), failing=[run_label(r) for r in bad], shot=first.get('shot', ''))
        if first['status'] == 'ERROR' and first.get('trace'):
            out['trace'] = first['trace']
        if case.id in known and out['status'] == 'FAIL':
            out['known'] = known[case.id]
    elif any(r['status'] == 'PASS' for r in runs):
        out.update(status='PASS', skipped_runs=[run_label(r) for r in runs if r['status'] == 'SKIP'])
        steps = sorted({x for r in runs if r['status'] == 'PASS' for x in r.get('skipped_steps', [])})
        if steps:
            out['skipped_steps'] = steps
        if case.id in known:
            out['note'] = 'known failure fixed: remove it from cases/known_failures.py'
        shots = [r['shot'] for r in runs if r.get('shot')]
        if shots:
            out['shot'] = shots[0]
    else:
        out.update(status='SKIP', reason=runs[0].get('reason', ''))
    retried = [f"{run_label(r)}: {r['retried']}" for r in runs if r.get('retried')]
    if retried:
        out['retried'] = retried
    return out


def status_text(r):
    if r['status'] == 'FAIL' and r['known']:
        return f"FAIL (known: {r['known']})"
    if r['status'] == 'PASS' and r.get('note'):
        return f"PASS ({r['note']})"
    return r['status']


def counts(results):
    n = {'pass': 0, 'fail': 0, 'known': 0, 'skip': 0, 'error': 0}
    for r in results:
        if r['status'] == 'PASS':
            n['pass'] += 1
        elif r['status'] == 'SKIP':
            n['skip'] += 1
        elif r['status'] == 'ERROR':
            n['error'] += 1
        elif r['known']:
            n['known'] += 1
        else:
            n['fail'] += 1
    return n


# ------------------------------------------------------------------------------------------------------ reports
AREA_NAMES = {'A': 'Frame: layout and chrome', 'B': 'Overlay layer and full screen', 'C': 'Sheet primitive', 'D': 'Maps',
              'E': 'Atmosphere', 'F': 'Fuel', 'G': 'Flightlog and report', 'H': 'Designs', 'I': 'Repository rules (static)',
              'J': 'Journeys (end to end)'}


def md_cell(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def write_reports(results, n, header, args, dur, touched=None, tracked=None, replay_of=None):
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    jl = journey_lines(touched)
    slow = sorted(results, key=lambda r: -r.get('secs', 0))[:SLOWEST]
    meta = {'date': stamp, 'commit': git_head(), 'selection': header, 'counts': n, 'seconds': round(dur), 'jobs': args.jobs,
            'case_seconds': round(sum(r.get('secs', 0) for r in results)),
            'slowest': [{'id': r['id'], 'runs': r['runs'], 'secs': r.get('secs', 0)} for r in slow],
            'failed': tracked if tracked is not None else failures_of(results), 'replay_of': replay_of,
            'journeys': None if touched is None else [{'id': j, 'title': journeys.JOURNEYS[j]['title'], 'files': f, 'e2e': journeys.JOURNEYS[j]['e2e']} for j, f in touched.items()],
            'options': {k: v for k, v in vars(args).items() if v not in (None, False, [], '')}}
    (HERE / 'report.json').write_text(json.dumps({'meta': meta, 'cases': results}, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    replay = header.startswith(('Replay of', 'Scope of'))
    L = [f'**{header if replay else "Areas run: " + header}**', '',
         f'**Journeys touched: {"; ".join(l[len("JOURNEY "):] for l in jl) if jl else "not chosen by paths (the combinations that failed)" if replay else "all (full run)"}**', '',
         f'# V3 non-regression report', '',
         f'- date: {stamp}   - commit: `{meta["commit"]}`   - duration: {round(dur)} s',
         f'- **pass {n["pass"]} - fail {n["fail"]} - known {n["known"]} - skip {n["skip"]}**' + (f' - error {n["error"]}' if n['error'] else ''), '']
    for a in sorted({r['area'] for r in results}):
        L += [f'## {a}. {AREA_NAMES.get(a, a)}', '', '| Id | Case | Result | Measured vs expected | Screenshot |', '|---|---|---|---|---|']
        for r in [x for x in results if x['area'] == a]:
            detail = ''
            if r['status'] in ('FAIL', 'ERROR'):
                detail = f"[{r['where']}] measured: {r['measured']} - expected: {r['expected']}"
                if r.get('rule'):
                    detail += f" - rule: {r['rule']}"
                if len(r['failing']) > 1:
                    detail += f" - failing runs: {', '.join(r['failing'][:8])}" + (' ...' if len(r['failing']) > 8 else '')
            elif r['status'] == 'SKIP':
                detail = r.get('reason', '')
            elif r.get('skipped_runs'):
                detail = 'skipped runs: ' + ', '.join(r['skipped_runs'][:6])
            if r['status'] == 'PASS' and r.get('skipped_steps'):
                detail = (detail + ' - ' if detail else '') + 'skipped steps: ' + ' / '.join(r['skipped_steps'])
            if r.get('retried'):
                detail = (detail + ' - ' if detail else '') + 'played twice (load failure of the static server): ' + ', '.join(r['retried'][:4])
            L.append(f"| {r['id']} | {md_cell(r['title'])} | {md_cell(status_text(r))} | {md_cell(detail)} | {r.get('shot', '')} |")
        L.append('')
    L += [f'## The {len(slow)} slowest cases', '', f'Seconds of the case summed over its runs ({args.jobs} workers, wall time {round(dur)} s, '
          f'{meta["case_seconds"]} s of cases). Their fixed waits go first: wait for a condition, never for a delay.', '',
          '| Id | Case | Runs | Seconds | Per run |', '|---|---|---|---|---|']
    L += [f"| {r['id']} | {md_cell(r['title'])} | {r['runs']} | {r.get('secs', 0)} | {round(r.get('secs', 0) / max(1, r['runs']), 1)} |" for r in slow]
    L.append('')
    (HERE / 'report.md').write_text('\n'.join(L) + '\n', encoding='utf-8')


# ------------------------------------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--all', action='store_true', help='every case (the default)')
    ap.add_argument('--changed', nargs='?', const='', default=None, metavar='BASE', help='cases chosen by the files changed since BASE (default origin/v3, plus the working tree)')
    ap.add_argument('--touched', nargs='?', const='', default=None, metavar='BASE', help='--changed BASE plus the smoke base (domains.SMOKE): the pass before a push')
    ap.add_argument('--for', dest='paths', nargs='+', metavar='PATH', help='cases chosen by these paths')
    ap.add_argument('--grep', help='case id, or text of a title or tag (commas for several)')
    ap.add_argument('--designs', help='comma list, e.g. standard,metro')
    ap.add_argument('--widths', help='comma list, e.g. 390,1280')
    ap.add_argument('--langs', help='comma list, e.g. fr,en')
    ap.add_argument('--failed', nargs='?', const='', default=None, metavar='IDS', help='replay the failed cases of the last report.json, in the combinations (design, width, language, tone) that failed; IDS (commas) limits them')
    ap.add_argument('--failed-scope', nargs='?', const='', default=None, metavar='BASE', help='the full scope of the failed cases: every area and journey they belong to, in the full grid, plus the cases chosen by the files changed since BASE (default origin/v3)')
    ap.add_argument('--tag', help='run the cases carrying one of these tags')
    ap.add_argument('--journey', help='the guard cases and the end-to-end case of these journeys (P1..P6, commas), added to --changed / --for if given')
    ap.add_argument('--keep-server', action='store_true', help='leave the static server running and print its address')
    ap.add_argument('--wait', action='store_true', help='a full pass waits for the heavy pass already running on this computer instead of refusing to start')
    ap.add_argument('--jobs', type=int, default=DEFAULT_JOBS, help=f'worker processes (default {DEFAULT_JOBS}: the physical cores less two; 1 runs in this process)')
    ap.add_argument('--list', action='store_true', help='show the areas, the journeys and the cases chosen, and exit (nothing runs)')
    args = ap.parse_args()

    registry = lib.load_cases()
    from cases.known_failures import KNOWN
    for pb in journeys.check_cases(registry):
        print('JOURNEYS TABLE', pb)
    if args.failed is not None and args.failed_scope is not None:
        raise SystemExit('--failed and --failed-scope are two steps: run them one after the other (PLAN.md section P)')
    replay, prev_date, jobs_override = None, None, None
    if args.failed is not None or args.failed_scope is not None:
        prev, why = previous_report()
        if prev is None:
            print('--failed:' if args.failed is not None else '--failed-scope:', why)
            return 2
        prev_date = prev['meta'].get('date', '?')
        replay = previous_failures(prev)
        if args.failed is not None:
            cases, header, touched, jobs_override = select_failed(args, registry, prev)
        else:
            cases, header, touched, scope_paths = select_scope(args, registry, prev)
        if not replay:
            print(f'nothing failed in the last report ({prev_date}): nothing to replay')
            return 0
    else:
        cases, header, touched = select_cases(args, registry)
    if args.changed is not None:
        lib.TOUCHED = domains.changed_paths(ROOT, args.changed or None)
    elif args.paths:
        lib.TOUCHED = [p.replace('\\', '/') for p in args.paths]
    elif args.failed_scope is not None and scope_paths:
        lib.TOUCHED = scope_paths
    if jobs_override is not None:
        cases, jobs = cases, jobs_override
    else:
        cases, jobs = jobs_for(cases, args)
    if args.list:                                   # no browser needed: areas, journeys, cases
        paths = lib.TOUCHED
        if jobs_override is not None:
            print('Replay: ' + ', '.join(f'{j[0]}[{run_label({"width": j[1], "design": j[2], "lang": j[3], "tone": j[4]})}]' for j in jobs))
        if paths and args.failed_scope is None:
            print('Paths: ' + ', '.join(paths))
            print('Areas: ' + areas_text(domains.select(paths)[0]))
        for l in journey_lines(touched):
            print(l)
        for c in cases:
            n_runs = sum(1 for j in jobs if j[0] == c.id)
            print(f'{c.id:5} {c.title}  [{n_runs} runs]')
        print(f'{len(cases)} case(s); selection: {header}')
        return 0
    problems = lib.preflight()
    if problems:
        for pb in problems:
            print('PREFLIGHT', pb)
        print('nothing ran: fix the environment above (exit 2)')
        return 2
    if not cases:
        for l in journey_lines(touched):
            print(l)
        print(f'nothing selected ({header})')
        return 0
    for l in journey_lines(touched):                # PLAN.md section O: before the first case
        print(l)

    # a heavy pass takes the lock: a full one refuses when another runs (unless --wait), a targeted one (--touched before a
    # push) waits for its turn
    full = full_pass(args)
    if (full or len(cases) > HEAVY) and not take_lock(args.wait or not full):
        return 3
    t0 = time.time()
    try:  # seconds per run of each case in the last report: the slowest jobs are given out first
        PREV_SECS.update({c['id']: c.get('secs', 0) / max(1, c.get('runs', 1)) for c in json.loads(REPORT.read_text(encoding='utf-8'))['cases']})
    except (OSError, ValueError, KeyError, TypeError):
        pass
    server, base = start_server()
    if not args.keep_server:
        atexit.register(stop_server, server)
    else:
        print(f'static server kept running: {base}  (pid {server.pid})')
    all_runs = {}
    try:
        static = [j for j in jobs if registry[j[0]].static]
        browser_jobs = [j for j in jobs if not registry[j[0]].static]
        static_runs = []

        def run_static():
            for j in static:                      # the repository rules need no browser: one after the other, in this process
                static_runs.append(lib.run_one(None, base, *j))
        # the static cases (a sixth of the full pass, one after the other) run beside the browser workers, not before them
        st = threading.Thread(target=run_static, daemon=True)
        st.start()
        if browser_jobs and args.jobs > 1:
            n_workers = max(1, min(args.jobs, len(browser_jobs)))
            mp = multiprocessing.get_context('spawn')
            # the longest jobs first (last report's seconds per run): a slow case never starts last, alone
            browser_jobs.sort(key=lambda j: -PREV_SECS.get(j[0], 0))
            with mp.Pool(n_workers, initializer=lib.worker_init, initargs=(base,)) as pool:
                for r in pool.imap_unordered(lib.worker_run, browser_jobs, chunksize=1):
                    all_runs.setdefault(r['id'], []).append(r)
                pool.close()
                pool.join()
        st.join()
        if browser_jobs and args.jobs <= 1:  # one worker: in this process, after the static cases (Playwright's sync API)
            lib.worker_init(base)
            try:
                for j in browser_jobs:
                    all_runs.setdefault(j[0], []).append(lib.worker_run(j))
            finally:
                lib.worker_close()
        for r in static_runs:
            all_runs.setdefault(r['id'], []).append(r)
    finally:
        if not args.keep_server:
            stop_server(server)

    results = [aggregate(c, all_runs[c.id], KNOWN) for c in cases if c.id in all_runs]
    results.sort(key=lambda r: list(registry).index(r['id']))
    for r in results:
        line = f"{status_text(r):<38} {r['id']:<4} {r['title']}"
        if r['status'] == 'SKIP':
            line += f"  -- {r.get('reason', '')}"
        print(line)
        for st in r.get('skipped_steps', []) if r['status'] == 'PASS' else []:
            print(f'      skipped step: {st}')
        for rt in r.get('retried', []):
            print(f'      played twice (load failure of the static server): {rt}')
        if r['status'] in ('FAIL', 'ERROR'):
            print(f"      [{r['where']}] measured: {r['measured']}\n      expected: {r['expected']}" + (f"\n      rule: {r['rule']}" if r.get('rule') else '')
                  + (f"\n      failing runs: {', '.join(r['failing'][:6])}" + (' ...' if len(r['failing']) > 6 else '') if len(r['failing']) > 1 else '')
                  + (f"\n      screenshot: {r['shot']}" if r.get('shot') else ''))
            if r['status'] == 'ERROR' and r.get('trace'):
                print('      ' + '\n      '.join(r['trace'].strip().split('\n')[-2:]))
    n = counts(results)
    dur = time.time() - t0
    tracked = replay if replay is not None else failures_of(results)       # a replay carries the failures it replays
    write_reports(results, n, header, args, dur, touched, tracked, prev_date)
    print(f"\n{len(results)} case(s): pass {n['pass']}, fail {n['fail']}, known {n['known']}, skip {n['skip']}" + (f", error {n['error']}" if n['error'] else '')
          + f" in {round(dur)} s  (tests/v3/report.md, report.json)")
    return 1 if (n['fail'] or n['error']) else 0


if __name__ == '__main__':
    # case titles and commit subjects in UTF-8 (→, ✕…): a Windows console or an output redirected in cp1252 no longer crashes
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    sys.exit(main())
