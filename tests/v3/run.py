#!/usr/bin/env python3
"""Runner of the V3 non-regression suite (tests/v3/PLAN.md; how-to in tests/v3/README.md).

    python3 tests/v3/run.py                       # --all
    python3 tests/v3/run.py --changed [<base>]    # cases chosen by the files changed since <base> (default origin/v3)
    python3 tests/v3/run.py --for modules/atmosphere/module.js docs/x.md
    python3 tests/v3/run.py --grep B2             # an id, or text of a title / tag; commas for several
    python3 tests/v3/run.py --designs standard,metro --widths 390 --langs fr --tag overlay

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
import socket
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import domains  # noqa: E402
import lib  # noqa: E402

ROOT = lib.ROOT


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
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(ROOT)],
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
    p = subprocess.run(['git', 'log', '-1', '--format=%h %s'], cwd=ROOT, capture_output=True, text=True)
    b = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], cwd=ROOT, capture_output=True, text=True)
    return f'{b.stdout.strip()} @ {p.stdout.strip()[:90]}'


def select_cases(args, registry):
    """(cases, header) following --all / --changed / --for, then --grep and --tag."""
    cases = list(registry.values())
    header = 'all areas'
    if args.changed is not None:
        paths = domains.changed_paths(ROOT, args.changed or None)
        if not paths:
            return [], 'no changed path since ' + (args.changed or domains.BASE_DEFAULT)
        sel, why = domains.select(paths)
        cases = [c for c in cases if domains.matches(c, sel)]
        header = f'--changed {args.changed or domains.BASE_DEFAULT}: ' + '; '.join(why[:12]) + (f' (+{len(why) - 12} more)' if len(why) > 12 else '')
    elif args.paths:
        sel, why = domains.select(args.paths)
        cases = [c for c in cases if domains.matches(c, sel)]
        header = '--for: ' + '; '.join(why)
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
    return cases, header


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
        if case.id in known:
            out['note'] = 'known failure fixed: remove it from cases/known_failures.py'
        shots = [r['shot'] for r in runs if r.get('shot')]
        if shots:
            out['shot'] = shots[0]
    else:
        out.update(status='SKIP', reason=runs[0].get('reason', ''))
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
              'E': 'Atmosphere', 'F': 'Fuel', 'G': 'Flightlog and report', 'H': 'Designs', 'I': 'Repository rules (static)'}


def md_cell(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def write_reports(results, n, header, args, dur):
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    meta = {'date': stamp, 'commit': git_head(), 'selection': header, 'counts': n, 'seconds': round(dur),
            'options': {k: v for k, v in vars(args).items() if v not in (None, False, [], '')}}
    (HERE / 'report.json').write_text(json.dumps({'meta': meta, 'cases': results}, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    L = [f'**Areas run: {header}**', '',
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
            L.append(f"| {r['id']} | {md_cell(r['title'])} | {md_cell(status_text(r))} | {md_cell(detail)} | {r.get('shot', '')} |")
        L.append('')
    (HERE / 'report.md').write_text('\n'.join(L) + '\n', encoding='utf-8')


# ------------------------------------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--all', action='store_true', help='every case (the default)')
    ap.add_argument('--changed', nargs='?', const='', default=None, metavar='BASE', help='cases chosen by the files changed since BASE (default origin/v3, plus the working tree)')
    ap.add_argument('--for', dest='paths', nargs='+', metavar='PATH', help='cases chosen by these paths')
    ap.add_argument('--grep', help='case id, or text of a title or tag (commas for several)')
    ap.add_argument('--designs', help='comma list, e.g. standard,metro')
    ap.add_argument('--widths', help='comma list, e.g. 390,1280')
    ap.add_argument('--langs', help='comma list, e.g. fr,en')
    ap.add_argument('--tag', help='run the cases carrying one of these tags')
    ap.add_argument('--keep-server', action='store_true', help='leave the static server running and print its address')
    ap.add_argument('--jobs', type=int, default=3, help='worker processes (default 3; 1 runs in this process)')
    ap.add_argument('--list', action='store_true', help='list the selected cases and exit')
    args = ap.parse_args()

    registry = lib.load_cases()
    from cases.known_failures import KNOWN
    cases, header = select_cases(args, registry)
    if args.changed is not None:
        lib.TOUCHED = domains.changed_paths(ROOT, args.changed or None)
    elif args.paths:
        lib.TOUCHED = [p.replace('\\', '/') for p in args.paths]
    cases, jobs = jobs_for(cases, args)
    if args.list:
        for c in cases:
            print(f'{c.id:5} {c.title}  [{len(c.runs())} runs]')
        print(f'{len(cases)} case(s); selection: {header}')
        return 0
    if not cases:
        print(f'nothing selected ({header})')
        return 0

    t0 = time.time()
    server, base = start_server()
    if not args.keep_server:
        atexit.register(stop_server, server)
    else:
        print(f'static server kept running: {base}  (pid {server.pid})')
    all_runs = {}
    try:
        static = [j for j in jobs if registry[j[0]].static]
        browser_jobs = [j for j in jobs if not registry[j[0]].static]
        for j in static:                          # the repository rules need no browser
            all_runs.setdefault(j[0], []).append(lib.run_one(None, base, *j))
        if browser_jobs:
            n_workers = max(1, min(args.jobs, len(browser_jobs)))
            if n_workers == 1:
                lib.worker_init(base)
                try:
                    for j in browser_jobs:
                        all_runs.setdefault(j[0], []).append(lib.worker_run(j))
                finally:
                    lib.worker_close()
            else:
                mp = multiprocessing.get_context('spawn')
                with mp.Pool(n_workers, initializer=lib.worker_init, initargs=(base,)) as pool:
                    for r in pool.imap_unordered(lib.worker_run, browser_jobs, chunksize=1):
                        all_runs.setdefault(r['id'], []).append(r)
                    pool.close()
                    pool.join()
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
        if r['status'] in ('FAIL', 'ERROR'):
            print(f"      [{r['where']}] measured: {r['measured']}\n      expected: {r['expected']}" + (f"\n      rule: {r['rule']}" if r.get('rule') else '')
                  + (f"\n      failing runs: {', '.join(r['failing'][:6])}" + (' ...' if len(r['failing']) > 6 else '') if len(r['failing']) > 1 else '')
                  + (f"\n      screenshot: {r['shot']}" if r.get('shot') else ''))
            if r['status'] == 'ERROR' and r.get('trace'):
                print('      ' + '\n      '.join(r['trace'].strip().split('\n')[-2:]))
    n = counts(results)
    dur = time.time() - t0
    write_reports(results, n, header, args, dur)
    print(f"\n{len(results)} case(s): pass {n['pass']}, fail {n['fail']}, known {n['known']}, skip {n['skip']}" + (f", error {n['error']}" if n['error'] else '')
          + f" in {round(dur)} s  (tests/v3/report.md, report.json)")
    return 1 if (n['fail'] or n['error']) else 0


if __name__ == '__main__':
    sys.exit(main())
