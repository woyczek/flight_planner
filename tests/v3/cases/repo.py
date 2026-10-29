"""Area I - repository rules (PLAN.md section I; CLAUDE.md "Avant chaque commit").  Static: no browser.

Rules covered
  * I1 no `?v=<stamp>` other than `?v=0` in tracked html / js / css (`apps/aide/docs_bundle.js` is left out: it is the
    help text, which talks about stamps);
  * I2 no conflict marker in tracked files;
  * I3 every translation row (`key: ['fr', 'en', 'de', 'es']`, `L('fr', 'en', 'de', 'es')`) of the modules and the frame has
    four entries;
  * I4 the help bundle and the help manuals are fresh (a generated file is regenerated in a temporary copy and compared);
  * I5 the sources are formatted (`tools/format_sources.py --check`; scope: frame/ and modules/, or the touched files);
  * I6 each documented module has its SPEC / INTEGRATION / DECISIONS, and the frame its three
    (`modules/hello`, the plain example the frame documents as never changed, is exempt);
  * I7 the CHANGELOG has `## [Unreleased]` with a `### V3` heading in it.

Cases: I1 I2 I3 I4 I5 I6 I7.
"""
import glob
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from lib import Fail, Skip, case

STRING = r"""(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)"""


@case('I1', 'Neutral fingerprints', 'I', static=True, rule='CLAUDE.md before commit 2: references stay at ?v=0')
def i1(c):
    rc, out, err = c.git('grep', '-nP', r'\?v=(?!0(?![0-9A-Za-z]))[0-9A-Za-z]+', '--', '*.html', '*.js', '*.css', ':!apps/aide/docs_bundle.js')
    if rc not in (0, 1):
        raise Fail(f'git grep failed: {err.strip()[:200]}', 'git grep runs')
    hits = [l for l in out.splitlines() if l]
    c.ok(not hits, f'{len(hits)} reference(s) with a stamp, first: {hits[0][:160] if hits else ""}', 'only ?v=0 in html, js and css')


@case('I2', 'No conflict markers', 'I', static=True, rule='CLAUDE.md before commit 5')
def i2(c):
    rc, out, err = c.git('grep', '-l', '-E', '^(<<<<<<<|>>>>>>>) ')
    if rc not in (0, 1):
        raise Fail(f'git grep failed: {err.strip()[:200]}', 'git grep runs')
    c.ok(rc == 1 and not out.strip(), f'conflict markers in: {out.split()[:5]}', 'git grep -l -E "^(<<<<<<<|>>>>>>>) " is empty')


def translation_rows(path):
    """(line, entries) of every translation row of a source file whose entries are not four."""
    src = Path(path).read_text(encoding='utf-8')
    rows = []
    for is_call, rx in ((False, re.compile(r'[:(=?]\s*\[\s*((?:' + STRING + r'\s*,?\s*)+)\]', re.S)),
                        (True, re.compile(r'\bL\(\s*((?:' + STRING + r'\s*,?\s*)+)\)', re.S))):
        for m in rx.finditer(src):
            if re.search(r'\bL4?\(\s*$', src[max(0, m.start() - 8):m.start() + 1]) and src[m.start()] == '(':
                continue                           # the first list of L4([..], [..], [..], [..]): a list of steps per language
            els = re.findall(STRING, m.group(1))
            if len(els) < 2 or len(els) == 4:
                continue
            # a translation row holds phrases; code lists (paths, ids, units) and a language-neutral L('kg', 'kg') are not rows
            phrase = any(re.search(r'\s', e[1:-1]) or re.search(r'[À-ÿ]', e) for e in els)
            pathy = any('/' in e or '.js' in e for e in els)
            if (is_call or phrase) and not pathy and len(set(els)) > 1:
                rows.append((src.count('\n', 0, m.start()) + 1, [e[:28] for e in els]))
    return rows


@case('I3', 'Four languages', 'I', static=True, rule='CLAUDE.md conventions: interface in four languages (fr, en, de, es)')
def i3(c):
    files = sorted(set(glob.glob(str(c.root / 'modules/*/module.js')) + glob.glob(str(c.root / 'modules/*/texts.js'))
                       + glob.glob(str(c.root / 'modules/*/vocab.js')) + [str(c.root / 'frame/app.js')]
                       + glob.glob(str(c.root / 'frame/settings/*.js')) + glob.glob(str(c.root / 'frame/help/*.js'))))
    bad = []
    empty = []
    for f in files:
        for line, els in translation_rows(f):
            bad.append(f'{os.path.relpath(f, c.root)}:{line} has {len(els)} entries {els[:3]}')
        src = Path(f).read_text(encoding='utf-8')
        for m in re.finditer(r"\b[\w$]+\s*:\s*\[\s*((?:" + STRING + r"\s*,?\s*){4})\]", src):
            els = re.findall(STRING, m.group(1))
            if any(e[1:-1] == '' for e in els) and any(re.search(r'\s', e[1:-1]) for e in els):
                empty.append(f'{os.path.relpath(f, c.root)}:{src.count(chr(10), 0, m.start()) + 1}')
    c.ok(not bad, f'{len(bad)} row(s) without four entries, first: {bad[0] if bad else ""}', 'four entries (fr, en, de, es) per translation row')
    c.ok(not empty, f'{len(empty)} row(s) with an empty entry, first: {empty[0] if empty else ""}', 'no empty translation')


@case('I4', 'Help bundle fresh', 'I', static=True, rule='CLAUDE.md: the manuals and apps/aide/docs_bundle.js go with the feature')
def i4(c):
    tmp = Path(tempfile.mkdtemp(prefix='sog-bundle-'))
    try:
        (tmp / 'tools').mkdir()
        (tmp / 'apps' / 'aide').mkdir(parents=True)
        shutil.copy(c.root / 'tools/build_docs_bundle.py', tmp / 'tools/build_docs_bundle.py')
        for p in (c.root / 'docs').rglob('*.md'):
            dest = tmp / 'docs' / p.relative_to(c.root / 'docs')
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(p, dest)
        p = subprocess.run([sys.executable, str(tmp / 'tools/build_docs_bundle.py')], capture_output=True, text=True, cwd=str(tmp))
        if p.returncode != 0:
            raise Fail(f'build_docs_bundle.py failed: {p.stderr.strip()[-200:]}', 'the bundle builds')
        # line endings normalised: a Windows checkout (core.autocrlf, text=auto) writes CRLF where the builder writes LF
        built = (tmp / 'apps/aide/docs_bundle.js').read_bytes().replace(b'\r\n', b'\n')
        have = (c.root / 'apps/aide/docs_bundle.js').read_bytes().replace(b'\r\n', b'\n')
        c.ok(built == have, f'apps/aide/docs_bundle.js differs from a fresh build ({len(have)} bytes against {len(built)})', 'a byte-identical bundle')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    p = subprocess.run([sys.executable, 'frame/help/build_help.py', '--check'], capture_output=True, text=True, cwd=str(c.root))
    m = re.search(r'(\d+) fichier\(s\) à écrire', p.stdout)
    c.ok(p.returncode == 0 and m is not None, f'build_help.py --check exited {p.returncode}: {(p.stdout + p.stderr).strip()[-200:]}', 'the manuals check without refusal')
    c.eq(int(m.group(1)), 0, 'build_help.py writes 0 files (the manuals are assembled)', what='files build_help.py would write')


@case('I5', 'Format', 'I', static=True, rule='CLAUDE.md before commit 1: tools/format_sources.py leaves the sources unchanged')
def i5(c):
    try:
        import cssbeautifier, jsbeautifier  # noqa: F401
    except ImportError:
        raise Skip('jsbeautifier / cssbeautifier are not installed (pip install jsbeautifier cssbeautifier): tools/format_sources.py cannot run') from None
    if c.touched is None:
        files = []                                 # whole tree of the application: frame/ and modules/
        scope = 'frame/ and modules/'
        rc, out, err = c.git('ls-files', 'frame', 'modules')
        files = [f for f in out.split() if f.endswith(('.js', '.css', '.html'))]
    else:
        files = [f for f in c.touched if f.endswith(('.js', '.css', '.html')) and (c.root / f).exists()]
        scope = 'the touched files'
        if not files:
            raise Skip('no touched js / css / html file in this selection')
    def generated(f):                              # a generated file says so in its first lines and is never edited by hand
        head = (c.root / f).read_text(encoding='utf-8', errors='replace')[:400]
        return 'GÉNÉRÉ' in head or 'GENERATED' in head
    files = [f for f in files if not generated(f)]
    if c.touched is not None and not files:
        raise Skip('the touched js / css / html files are all generated (docs_bundle.js…): nothing to format')
    p = subprocess.run([sys.executable, 'tools/format_sources.py', '--check', *files], capture_output=True, text=True, cwd=str(c.root))
    out = (p.stdout + p.stderr).strip()
    m = re.search(r'(\d+) fichier\(s\) à mettre en forme', out)
    if p.returncode not in (0,) and not m:
        raise Fail(f'format_sources.py --check failed: {out[-240:]}', 'the check runs')
    n = int(m.group(1)) if m else 0
    names = [l.strip() for l in out.splitlines()[out.splitlines().index(next(l for l in out.splitlines() if 'à mettre en forme' in l)) + 1:]] if n else []
    c.ok(n == 0, f'{n} file(s) would change in {scope}: {names[:4]}', 'no file to reformat (generated files excluded)')


@case('I6', 'Module documents', 'I', static=True, rule='CLAUDE.md roles: each module and the frame keep SPEC, INTEGRATION and DECISIONS')
def i6(c):
    missing = []
    for d in sorted(p for p in (c.root / 'modules').iterdir() if p.is_dir()):
        if d.name == 'hello':
            continue                              # the plain example: frame/INTEGRATION 9.2 says it is never changed
        for n in ('SPEC.md', 'INTEGRATION.md', 'DECISIONS.md'):
            if not (d / n).exists():
                missing.append(f'modules/{d.name}/{n}')
    for n in ('SPEC.md', 'INTEGRATION.md', 'DECISIONS.md'):
        if not (c.root / 'frame' / n).exists():
            missing.append(f'frame/{n}')
    c.ok(not missing, f'missing: {missing}', 'SPEC.md, INTEGRATION.md and DECISIONS.md in every module and in frame/')


@case('I7', 'CHANGELOG', 'I', static=True, rule='CLAUDE.md before commit 4: an entry under "Unreleased" in English')
def i7(c):
    text = (c.root / 'docs' / 'CHANGELOG.md').read_text(encoding='utf-8')
    m = re.search(r'^## \[Unreleased\]\s*$', text, re.M)
    c.ok(m is not None, 'no "## [Unreleased]" section in docs/CHANGELOG.md', 'an Unreleased section')
    rest = text[m.end():]
    nxt = re.search(r'^## ', rest, re.M)
    block = rest[:nxt.start()] if nxt else rest
    c.ok(re.search(r'^### V3\s*$', block, re.M) is not None, 'the Unreleased section has no "### V3" heading', 'a "### V3" heading under Unreleased')


@case('I8', 'Launcher jobs (regen)', 'I', static=True,
      rule='frame/INTEGRATION 15.1: one job at a time from a fixed list, arguments checked, cancel, the last job readable; the state of the workstation never shows a secret')
def i8(c):
    import subprocess
    import sys
    import tempfile
    import threading
    import time
    sys.path.insert(0, str(c.root / 'tools'))
    import regen_jobs as R
    tmp = Path(tempfile.mkdtemp(prefix='sog-regen-'))
    kept = dict(R.REGISTRY), dict(R.MIN_GAP)  # les globales du module, partagées par les cas statiques : rendues telles quelles
    try:
        data, sec = tmp / 'data', tmp / 'secrets'
        for p, t in {'sia/base/fr/2026-10-01/airports.json': '[]', 'sia/base/fr/2026-10-29/airports.json': '[1]', 'proc/2026-10-29/LFRS.json': '{}',
                     'sia/openaip/fr.json': 'x' * 10, 'local/xp.json': '{}'}.items():
            (data / p).parent.mkdir(parents=True, exist_ok=True)
            (data / p).write_text(t, encoding='utf-8')
        sec.mkdir()
        (sec / 'ead.json').write_text('{"user": "u", "password": "p"}', encoding='utf-8')
        st = R.state(str(data), str(sec))
        base = st['outputs']['sia/base/']
        c.eq((base['files'], base['cycles']), (2, ['2026-10-01', '2026-10-29']), 'files and cycles of the base', what='sia/base/')
        c.eq(st['outputs']['sia/vfr/'], None, 'an absent output is null', what='sia/vfr/')
        c.eq(sorted(st['caches']), ['openaip'], 'source caches under sia/, outputs excluded', what='caches')
        c.eq(st['caches']['openaip']['bytes'], 10, 'cache size', what='openaip bytes')
        c.eq(st['ead'], True, 'EAD credentials present', what='ead')
        c.ok('password' not in str(st) and '"p"' not in str(st), str(st)[:300], 'no secret value in the state')
        gate = threading.Event()

        def slow(job, args, ctx):
            for i in range(50):
                if job.cancelled():
                    return None
                job.step(f'part {i}', i, 50, 'parts')
                job.log(f'line {i}')
                gate.wait(0.02)
            return {'n': args['n']}
        J = R.Jobs({('t', 'slow'): (slow, lambda a: {'n': int(a['n'])} if isinstance(a.get('n'), int) else None),
                    ('t', 'boom'): (lambda job, a, ctx: 1 / 0, lambda a: {})})
        c.eq(J.start('x', 'rm', {})['status'], 400, 'an operation outside the list is refused', what='unknown operation')
        c.eq(J.start('t', 'slow', {'n': '1; rm'})['status'], 400, 'arguments are checked', what='bad arguments')
        a = J.start('t', 'slow', {'n': 3})
        c.ok(a['ok'] and a['job'], str(a), 'a job starts')
        c.eq(J.start('t', 'slow', {'n': 4})['status'], 409, 'one job at a time', what='second job')
        c.eq(J.cancel(a['job'])['ok'], True, 'cancel is accepted', what='cancel')
        for _ in range(100):
            if J.view(a['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq(J.view(a['job'])['state'], 'cancelled', 'the job stops on cancel', what='state after cancel')
        b = J.start('t', 'slow', {'n': 5})
        for _ in range(300):
            if J.view(b['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        v = J.view(b['job'])
        c.eq((v['state'], v['result'], v['done'], v['total'], v['unit']), ('done', {'n': 5}, 49, 50, 'parts'), 'done, result and progress', what='finished job')
        c.eq(J.view()['job']['id'], b['job'], 'without id: the last job (a reloaded page finds it)', what='last job')
        c.eq(J.view('nope')['status'], 410, 'an unknown id', what='unknown id')
        e = J.start('t', 'boom', {})
        for _ in range(100):
            if J.view(e['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq(J.view(e['job'])['state'], 'error', 'an exception ends the job in error, the launcher goes on', what='failing job')
        c.ok(('state', 'scan') in R.REGISTRY, str(list(R.REGISTRY)), 'the D0 list holds state/scan')

        def leaky(job, args, ctx):
            job.step('login as eaduser with s3cretPW')
            job.log('session https://u:p@ead.example/x?jsessionid=ABC123 user eaduser pw s3cretPW')
            return {}
        (sec / 'ead.json').write_text('{"user": "eaduser", "password": "s3cretPW"}', encoding='utf-8')
        K = R.Jobs({('t', 'leak'): (leaky, lambda a: {})}, {'secrets': str(sec)})
        k = K.start('t', 'leak', {})
        for _ in range(100):
            if K.view(k['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        v = K.view(k['job'])
        seen = v['step'] + ' ' + ' '.join(v['log'])
        c.ok('s3cretPW' not in seen and 'eaduser' not in seen and 'ABC123' not in seen and 'u:p@' not in seen, seen,
             'a verb cannot leave a credential in the journal or the step (Job.log, Job.step cleaned)')

        # les jeux : tools/regen/<jeu>.py exporte VERBS et MIN_GAP, fusionnés ; un fichier en échec laissé de côté
        folder = tmp / 'regen'
        folder.mkdir()
        (folder / 'demo.py').write_text("VERBS = {('demo', 'noop'): (lambda job, a, ctx: {'ok': 1}, lambda a: {})}\n"
                                        "MIN_GAP = {('demo', 'noop'): 60}\n", encoding='utf-8')
        (folder / 'broken.py').write_text('raise RuntimeError("boom")\n', encoding='utf-8')
        (folder / 'demo2.py').write_text("VERBS = {('demo', 'noop'): (lambda job, a, ctx: {'ok': 2}, lambda a: {})}\n"
                                         "MIN_GAP = {('demo', 'noop'): 10}\n", encoding='utf-8')
        (folder / '_private.py').write_text('raise RuntimeError("never loaded")\n', encoding='utf-8')
        errs = R.load_verbs(str(folder))
        c.ok(('demo', 'noop') in R.REGISTRY and R.MIN_GAP.get(('demo', 'noop')) == 60, str(list(R.REGISTRY)), 'a set file adds its verbs and its gaps')
        c.eq([n for n, _ in errs], ['broken.py', 'demo2.py'], 'a failing set file is left aside, named; a verb already defined is refused, never overwritten; « _… » files are not loaded', what='load errors')
        c.eq(R.MIN_GAP.get(('demo', 'noop')), 60, 'a set file never lowers a gap', what='gap after a second file')

        # l'état gardé : un travail qui courait devient « interrupted » ; le délai vaut par-delà un redémarrage ; l'auteur
        store = str(tmp / 'last.json')
        J1 = R.Jobs(R.REGISTRY, {}, store=store)
        a1 = J1.start('demo', 'noop', {}, 'ABC')
        for _ in range(100):
            if J1.view(a1['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq((J1.view(a1['job'])['author'], J1.view(a1['job'])['state']), ('ABC', 'done'), 'the author of the page kept with the job', what='author')
        c.eq(R.Jobs(R.REGISTRY, {}).start('demo', 'noop', {}, 'abc; rm')['ok'], True, 'a bad author is dropped, not refused', what='bad author')
        J2 = R.Jobs(R.REGISTRY, {}, store=store)
        c.eq(J2.view()['job']['id'], a1['job'], 'a restarted launcher finds the last job', what='last job after restart')
        r = J2.start('demo', 'noop', {}, 'ABC')
        c.eq((r.get('status'), r.get('reason')), (429, 'too-soon'), 'the gap holds across a restart', what='gap after restart')
        import json as _json
        v = _json.loads(Path(store).read_text(encoding='utf-8'))
        v['job']['state'] = 'running'
        Path(store).write_text(_json.dumps(v), encoding='utf-8')
        c.eq(R.Jobs(R.REGISTRY, {}, store=store).view()['job']['state'], 'interrupted', 'a job running when the launcher stopped is said interrupted', what='state after restart')

        # commit_outputs : chemins des sorties seulement, trigramme exigé, auteur de la page, rien d'autre
        git = shutil.which('git')
        if git:
            repo = tmp / 'repo'
            (repo / 'proc' / 'manual').mkdir(parents=True)
            run = lambda *a: subprocess.run([git, '-C', str(repo), *a], capture_output=True, text=True)
            run('init', '-q')
            run('-c', 'user.name=T', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init')
            (repo / 'proc' / 'manual' / 'LFRS.json').write_text('{}', encoding='utf-8')
            (repo / 'other.txt').write_text('x', encoding='utf-8')
            ctx = {'data': str(repo), 'git_cmd': lambda *a: [git, *a], 'git_env': dict}
            c.ok('refused path' in R.commit_outputs(ctx, 'ABC', ['other.txt'], 'm')['warning'], 'other.txt committed', 'a path outside the outputs is refused')
            c.ok('refused path' in R.commit_outputs(ctx, 'ABC', ['proc/../other.txt'], 'm')['warning'], '.. accepted', 'a path that climbs out is refused')
            c.ok('refused path' in R.commit_outputs(ctx, 'ABC', ['proc/*'], 'm')['warning'], 'a pattern accepted', 'a pathspec pattern is refused (literal paths only)')
            c.ok('no trigram' in R.commit_outputs(ctx, '', ['proc/manual/LFRS.json'], 'm')['warning'], 'committed without author', 'no trigram, no commit')
            res = R.commit_outputs(ctx, 'AB12', ['proc/manual/LFRS.json'], ':card_file_box: test')
            who = run('log', '-1', '--format=%an %ae %s').stdout.strip()
            files = run('show', '--name-only', '--format=', 'HEAD').stdout.split()
            c.ok(res['commit'] and who == 'AB12 ab12@defa.local :card_file_box: test' and files == ['proc/manual/LFRS.json'],
                 f'{res} | {who} | {files}', 'one commit, the page trigram as author (the common rule: 2 to 5 signs), only the given path')
            c.eq(R.commit_outputs(ctx, 'ABC', ['proc/manual/LFRS.json'], 'm')['commit'], None, 'nothing changed: no commit', what='second commit')
        else:
            pass  # git absent de ce poste : commit_outputs n'est pas essayé ici (le reste du cas l'est)
    finally:
        R.REGISTRY.clear()
        R.REGISTRY.update(kept[0])
        R.MIN_GAP.clear()
        R.MIN_GAP.update(kept[1])
        shutil.rmtree(tmp, ignore_errors=True)
