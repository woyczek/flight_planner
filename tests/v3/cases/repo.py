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
  * I7 the CHANGELOG has `## [Unreleased]` with a `### V3` heading in it;
  * I8 the launcher's jobs (regen); I9 the data synchronisation: a git warning is never read as a path, a pending merge
    is concluded or cancelled, a launcher commit checks it first.

Cases: I1 I2 I3 I4 I5 I6 I7 I8 I9.
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
        # une BaseException (arrêt du fil) : le travail finit en erreur, jamais « running » pour toujours
        def killed(job, args, ctx):
            raise KeyboardInterrupt
        JK = R.Jobs({('t', 'killed'): (killed, lambda a: {})}, {})
        jk = JK.start('t', 'killed', {})
        for _ in range(200):
            if JK.view(jk['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq((JK.view(jk['job'])['state'], bool(JK.view(jk['job'])['ended'])), ('error', True), 'a BaseException ends the job in error', what='killed job')
        # page sans fenêtre d'un travail : sortie d'une zone rendue par POST /__setup/regen/job/put (Jobs.put), reçue par job.take
        def build(job, args, ctx):
            got = job.take('fr', timeout=10)
            return {'got': sorted(got) if got else None}
        JB = R.Jobs({('base', 'build'): (build, lambda a: {'zones': ['fr', 'ie']})}, {})
        bj = JB.start('base', 'build', {})
        tok = JB.cur.token
        # réclamation du jeton par la page sans fenêtre : après l'offre du verbe, une seule fois
        c.eq(JB.claim(bj['job'])['status'], 409, 'nothing to claim before the verb offers it', what='claim before offer')
        JB.cur.offer({'zones': ['fr', 'ie'], 'cycle': '2026-10-29'})
        cl = JB.claim(bj['job'])
        c.eq((cl.get('ok'), cl.get('token') == tok, cl.get('zones'), cl.get('cycle')), (True, True, ['fr', 'ie'], '2026-10-29'),
             'the token and what the verb offered, once', what='claim')
        c.eq([JB.claim(bj['job'])['status'], JB.claim('nope')['status']], [409, 409], 'a second claim, another job: refused', what='claim again')
        try:
            JB.cur.offer({'token': 'x'})
            c.ok(False, '', 'an offer cannot override the token')
        except ValueError:
            pass
        c.eq([JB.put('nope', tok, 'fr', {'a.json': '{}'})['status'], JB.put(bj['job'], 'wrong', 'fr', {'a.json': '{}'})['status'],
              JB.put(bj['job'], tok, 'gb', {'a.json': '{}'})['status'], JB.put(bj['job'], tok, 'fr', {'../a.json': '{}'})['status'],
              JB.put(bj['job'], tok, 'fr', {'a.json': 'x' * (R.PUT_MAX + 1)})['status']], [409, 403, 400, 400, 413],
             'the output is refused: another job, a wrong token, a zone outside the job, a path, too large', what='put refusals')
        c.ok(JB.put(bj['job'], tok, 'fr', {'airports.json': '[]', 'navaids.json': '[]'})['ok'], '', 'the running job takes a zone\'s output')
        for _ in range(200):
            if JB.view(bj['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq(JB.view(bj['job'])['result'], {'got': ['airports.json', 'navaids.json']}, 'the verb receives the output by job.take', what='taken output')
        c.ok(tok not in str(JB.view()) and tok not in str(JB.view(bj['job'])), '', 'the job\'s token is never in its view')
        bj2 = None
        for _ in range(100):
            bj2 = JB.start('base', 'build', {})
            if bj2.get('ok'):
                break
            time.sleep(0.02)
        tok2 = JB.cur.token
        c.ok(JB.put(bj2['job'], tok2, 'ie', {'a.json': '[]'})['ok'], '', 'a zone is delivered')
        c.eq(JB.put(bj2['job'], tok2, 'ie', {'a.json': '[]'})['status'], 409, 'a zone is delivered once per job', what='second put of a zone')
        JB.cancel(bj2['job'])
        for _ in range(300):
            if JB.view(bj2['job'])['state'] != 'running':
                break
            time.sleep(0.02)
        c.eq(len(JB.cur._inbox), 0, 'the outputs not taken are dropped at the end of the job', what='inbox after the job')

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


@case('I9', 'Data sync: git warnings, pending merge', 'I', static=True,
      rule="tools/data_sync.py: a git warning is never read as a path; a failed pass never leaves a merge pending; a pending merge is concluded or cancelled, never left to the user; a launcher commit checks it first; sia/base is committed by the user's gesture only")
def i9(c):
    import json
    sys.path.insert(0, str(c.root / 'tools'))
    import data_sync as DS
    import regen_jobs as R
    tmp = Path(tempfile.mkdtemp(prefix='sog-sync-'))
    kept = DS.git_cmd, DS.resolve
    warn = "warning: in the working copy of 'references\\\\aircraft_fleet.js', LF will be replaced by CRLF the next time Git touches it"
    try:
        remote, a, b = (str(tmp / x) for x in ('remote.git', 'A', 'B'))
        sh = lambda *args, cwd=str(tmp): subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True)
        sh('init', '--bare', '-b', 'main', remote)
        sh('clone', '-q', remote, a)

        def put(root, rel, obj):
            p = Path(root, *rel.split('/'))
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json.dumps(obj), encoding='utf-8')
        week, other = 'disponibilites/AAA/2026-W44.json', 'disponibilites/AAA/2026-W45.json'
        put(a, week, {'updated_at': '2026-10-29T10:00:00Z', 'dispos': {'lun': 1}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'first pass of A')
        sh('clone', '-q', remote, b)
        for d in (a, b):
            sh('config', 'user.name', 'essai', cwd=d)
            sh('config', 'user.email', 'essai@example.invalid', cwd=d)
        # git qui écrit un avertissement CRLF sur sa sortie d'erreur à chaque commande (le cas du poste de l'utilisateur)
        shim = tmp / 'shim.py'
        shim.write_text('import subprocess, sys\nsys.stderr.write(%r + "\\n")\nsys.exit(subprocess.run(sys.argv[1:]).returncode)\n' % warn,
                        encoding='utf-8')
        DS.git_cmd = lambda *args: [sys.executable, str(shim), *kept[0](*args)]
        c.eq(DS.git(b, 'rev-parse', '--abbrev-ref', 'HEAD'), (0, 'main'), 'a warning on stderr is not part of the output', what='git() output')
        Path(b, 'references').mkdir()
        Path(b, 'references', 'aircraft_fleet.js').write_text('window.X = 1\n', encoding='utf-8')  # hors du pool, non suivi : intact
        # conflit sur la même fiche des deux côtés
        put(a, week, {'updated_at': '2026-10-29T11:00:00Z', 'dispos': {'lun': 'A'}})
        put(b, week, {'updated_at': '2026-10-29T12:00:00Z', 'dispos': {'lun': 'B'}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'A sends its version')
        r = DS.run(b, 'BBB')
        c.ok(r['ok'] and r['conflicts'], str(r)[:300], 'the conflict is resolved with git warnings in the output')
        c.ok(not Path(b, '.git', 'MERGE_HEAD').exists(), '', 'no merge left pending')
        c.ok(not [p for p in Path(b).iterdir() if p.name.startswith('warning')], str(list(Path(b).iterdir())), 'no file named after a git warning')
        # une erreur du lanceur pendant la résolution (OSError, comme open() sur une ligne d'avertissement) : fusion annulée
        sh('pull', '-q', cwd=a)
        put(a, week, {'updated_at': '2026-10-29T13:00:00Z', 'dispos': {'lun': 'A2'}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'A sends again')
        put(b, week, {'updated_at': '2026-10-29T14:00:00Z', 'dispos': {'lun': 'B2'}})
        head = lambda d: subprocess.run(['git', '-C', d, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()

        def boom(data, path):
            raise OSError(22, 'Invalid argument', path)
        DS.resolve = boom
        r = DS.run(b, 'BBB')
        DS.resolve = kept[1]
        c.ok(not r['ok'] and 'Erreur du lanceur' in r['message'], r['message'][:300], 'an exception ends the pass with a message for the page')
        c.ok(not Path(b, '.git', 'MERGE_HEAD').exists() and not DS.unmerged(b), '', 'the merge is cancelled, the repository is clean')
        c.eq(Path(b, 'references', 'aircraft_fleet.js').read_text(encoding='utf-8'), 'window.X = 1\n', 'a file outside the pool is untouched', what='outside file')
        c.ok(DS.run(b, 'BBB')['ok'], '', 'the next pass succeeds')
        # fusion laissée en attente, avec un fichier en conflit : annulée puis refaite
        sh('pull', '-q', cwd=a)
        put(a, week, {'updated_at': '2026-10-29T15:00:00Z', 'dispos': {'lun': 'A3'}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'A sends a third time')
        put(b, week, {'updated_at': '2026-10-29T16:00:00Z', 'dispos': {'lun': 'B3'}})
        sh('commit', '-qam', 'B3', cwd=b)
        sh('fetch', '-q', cwd=b)
        subprocess.run(['git', '-C', b, 'merge', 'origin/main'], capture_output=True)
        c.ok(Path(b, '.git', 'MERGE_HEAD').exists() and DS.unmerged(b) == [week], str(DS.unmerged(b)), 'a merge with a conflict is pending')
        c.ok(DS.merge_pending(b), '', 'merge_pending says so')
        cm = R.commit_outputs({'data': b, 'git_cmd': kept[0], 'git_env': DS.git_env}, 'BBB', ['sia/base/x.json'], 'x')
        c.ok(cm['commit'] is None and 'merge is pending' in (cm['warning'] or ''), str(cm), 'a launcher job does not commit during a pending merge')
        r = DS.run(b, 'BBB')
        c.ok(r['ok'] and r['settled'] == 'annulée' and 'annulée' in r['message'], str(r)[:300], 'a pending merge with conflicts is cancelled, then redone')
        c.ok(not Path(b, '.git', 'MERGE_HEAD').exists(), '', 'no merge left pending')
        # fusion laissée en attente sans conflit, avec un fichier hors du pool indexé avant l'interruption : annulée (jamais
        # conclue : le commit de fusion emporterait l'index), le fichier reste sur le poste, la fusion est refaite
        sh('pull', '-q', cwd=a)
        put(a, other, {'updated_at': '2026-10-29T17:00:00Z', 'dispos': {}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'A sends another week')
        sh('fetch', '-q', cwd=b)
        sh('merge', '--no-commit', '--no-ff', 'origin/main', cwd=b)
        put(b, 'AircraftDB/x.json', {'staged': True})
        sh('add', 'AircraftDB/x.json', cwd=b)
        c.ok(Path(b, '.git', 'MERGE_HEAD').exists() and not DS.unmerged(b), '', 'a merge without conflict is pending')
        r = DS.update(b, 'BBB')
        c.ok(r['ok'] and r['settled'] == 'annulée' and Path(b, *other.split('/')).is_file() and 'annulée' in r['message'], str(r)[:300],
             'a pending merge without conflict is cancelled, never concluded, then redone')
        tracked = subprocess.run(['git', '-C', b, 'cat-file', '-e', 'HEAD:AircraftDB/x.json'], capture_output=True).returncode == 0
        c.ok(not tracked and Path(b, 'AircraftDB', 'x.json').is_file(), f'tracked {tracked}', 'a file staged before the interruption stays on the computer, not committed')
        c.ok(not Path(b, '.git', 'MERGE_HEAD').exists(), '', 'no merge left pending')
        # sia/base : seul le geste « Synchroniser » la commite ; un passage de fond la garde sur le poste
        zone = 'sia/base/fr/2026-10-29/airports.json'
        put(b, zone, [1])
        r = DS.update(b, 'BBB')
        c.ok(r['ok'] and r['held'] == 1 and zone in DS.pool_changes(b), str(r)[:300], 'the update at start keeps sia/base on the computer')
        r = DS.run(b, 'BBB')
        c.ok(r['ok'] and r['held'] == 1 and zone in DS.pool_changes(b) and 'sia/base' in r['message'], str(r)[:300],
             'a background pass keeps sia/base on the computer and says so')
        r = DS.run(b, 'BBB', gesture=True)
        c.ok(r['ok'] and r['committed'] == 1 and not DS.pool_changes(b), str(r)[:300], 'the "Synchronise" gesture sends sia/base')
        c.ok('gesture: true' in (c.root / 'shared' / 'sync.js').read_text(encoding='utf-8'), '', 'the V2 button is a gesture')
        c.ok("gesture: reason === 'manual'" in (c.root / 'frame' / 'store' / 'frame_data.js').read_text(encoding='utf-8'), '',
             "the frame's exchange is a gesture only for a manual pass")
        # texte de git rendu à la page : ni identifiant d'adresse, ni chemin du poste ; chemins en conflit : la règle de data_file
        t = DS.clean_text(f'fatal: unable to access https://pilot:ghp_secret@example.invalid/x.git in {b}{os.sep}.git', b)
        c.ok('ghp_secret' not in t and 'pilot:' not in t and str(b) not in t and 'data' in t, t, 'git text cleaned of credentials and local paths')
        c.eq([DS.data_path(b, x) for x in ('a\\b.json', 'C:x.json', '../x.json', 'con.json', 'a/./b.json', '/x.json')], [''] * 6,
             'conflicting paths follow the data_file rule', what='refused paths')
        src = (c.root / 'tools' / 'launch.py').read_text(encoding='utf-8')
        pub = src[src.index('def aircraft_publish'):src.index('def vfr_publish')]
        c.ok(pub.index('merge_pending') < pub.index('copyfile'), '', 'the aircraft base checks for a pending merge before writing into data/')
        c.ok('détail est dans sa console' in src, '', 'a paired device gets a generic message on a failed synchronisation')
        # adresse https : aucune partie identifiant, le jeton seul en nom d'utilisateur compris (ssh : git@ reste normal)
        c.eq([bool(DS.REMOTE_RE.match(u)) for u in ('https://ghp_secret@github.com/a/b.git', 'https://u:p@host/a.git',
                                                     'https://github.com/a/b.git', 'git@github.com:a/b.git')], [False, False, True, True],
             'a https address with credentials is refused; ssh keeps its user', what='REMOTE_RE')
        sh('remote', 'set-url', 'origin', 'https://ghp_secret@example.invalid/x.git', cwd=b)
        c.ok('ghp_secret' not in DS.remote_info(b)['url'], DS.remote_info(b)['url'], 'the remote address given to the page has no token')
        sh('remote', 'set-url', 'origin', remote, cwd=b)
        # le drapeau gesture est une intention : un travail du module Données en cours garde sia/base quel que soit le drapeau
        import importlib
        L = importlib.import_module('launch')
        kept_regen = L.REGEN

        class Running:
            def view(self, id_=None):
                return {'job': {'id': 'x', 'set': 'base', 'verb': 'build', 'state': 'running'}}
        import time
        kept_data = L.DATA
        try:
            L.REGEN, L.DATA = None, b
            c.eq((L.sync_gesture({'gesture': True}), L.sync_gesture({'gesture': 'yes'}), L.sync_gesture({})), (True, False, False),
                 'the gesture flag counts only as true', what='sync_gesture without a job')
            L.REGEN = Running()
            c.eq(L.sync_gesture({'gesture': True}), False, 'a running job of the Data module keeps sia/base whatever the flag', what='sync_gesture during a job')
            # construction par la page V2 (dossier autorisé, sans le lanceur) : vue par l'heure des fichiers de sia/base
            L.REGEN = None
            zone2 = 'sia/base/ie/2026-10-29/airports.json'
            put(b, zone2, [2])
            c.eq(L.sync_gesture({'gesture': True}), False, 'a sia/base file written less than 10 min ago keeps sia/base', what='sync_gesture during a build')
            old = time.time() - 700
            os.utime(Path(b, *zone2.split('/')), (old, old))
            c.eq(L.sync_gesture({'gesture': True}), True, 'an older write is no build any more', what='sync_gesture after a build')
        finally:
            L.REGEN, L.DATA = kept_regen, kept_data
        # chemin réel de data/ (jonction des espaces de travail) retiré des textes de git
        j = tmp / 'J'
        if os.name == 'nt' and subprocess.run(['cmd', '/c', 'mklink', '/J', str(j), str(b)], capture_output=True).returncode == 0:
            t = DS.clean_text(f'error in {os.path.realpath(j)}{os.sep}x.json', str(j))
            c.ok(os.path.realpath(j) not in t, t, 'the real path behind a junction is cleaned too')
            os.rmdir(j)
        # fusion impossible à annuler (fichier apporté par la fusion, modifié depuis) : la page dit lequel mettre de côté
        sh('pull', '-q', cwd=a)
        put(a, other, {'updated_at': '2026-10-29T18:00:00Z', 'dispos': {'mar': 1}})
        c.ok(DS.run(a, 'AAA')['ok'], '', 'A sends a last change')
        sh('fetch', '-q', cwd=b)
        sh('merge', '--no-commit', '--no-ff', 'origin/main', cwd=b)
        put(b, other, {'updated_at': '2026-10-29T18:30:00Z', 'dispos': {'mer': 1}})
        r = DS.run(b, 'BBB')
        c.ok(not r['ok'] and other in r['message'] and 'copier ailleurs' in r['message'], r['message'][:300],
             'a merge that cannot be cancelled names the file to set aside')
        c.ge(src.count('data_sync.merge_pending(DATA)'), 3, 'the launcher\'s commits check for a pending merge first', what='merge_pending calls')
    finally:
        DS.git_cmd, DS.resolve = kept
        shutil.rmtree(tmp, ignore_errors=True)


@case('I10', 'Launcher routes', 'I', static=True,
      rule='frame/INTEGRATION 6.1: every /__setup/ route is declared once in the table ROUTES with its public; a paired device reaches the lan routes only')
def i10(c):
    import importlib
    sys.path.insert(0, str(c.root / 'tools'))
    L = importlib.import_module('launch')
    lan = sorted(k for k, v in L.ROUTES.items() if v[1] == 'lan')
    c.eq(sorted(k for k, v in L.ROUTES.items() if v[2]), sorted([('GET', '/__setup/status'), ('GET', '/__setup/changes'), ('POST', '/__setup/batch'),
                                                            ('POST', '/__setup/sync'), ('POST', '/__setup/net'),
                                                            ('POST', '/__setup/ivao/oauth/start'), ('POST', '/__setup/ivao/oauth/refresh'),
                                                            ('POST', '/__setup/ivao/oauth/revoke')]),
         'the routes open to the relay: status, changes, batch, sync, net, and the IVAO sign-in (R1b)', what='relay routes')
    c.eq(lan, sorted([('GET', '/__setup/status'), ('GET', '/__setup/changes'), ('GET', '/__setup/sim/position'),
                      ('GET', '/__setup/lnmperf'), ('GET', '/__setup/lnmperf-folder'), ('POST', '/__setup/batch'),
                      ('POST', '/__setup/sync'), ('POST', '/__setup/net'), ('POST', '/__setup/ivao/oauth/start'),
                      ('POST', '/__setup/ivao/oauth/refresh'), ('POST', '/__setup/ivao/oauth/revoke')]),
         'the routes open to a paired device are the Pilot app\'s (and the IVAO sign-in, R1b)', what='lan routes')
    missing = [f'{m} {p} -> {v[0]}' for (m, p), v in L.ROUTES.items() if not callable(getattr(L.Setup, v[0], None))]
    c.eq(missing, [], 'each route names a method of the server', what='routes without handler')
    src = (c.root / 'tools' / 'launch.py').read_text(encoding='utf-8')
    body = src[src.index('    def do_GET('):src.index('    # ---------------------------------------------------------------- routes /__setup/')]
    left = re.findall(r"if (?:path|self\.path\.split\('\?'\)\[0\]) == '(/__setup/[^']+)'", body)
    c.eq(left, [], 'no /__setup/ route written outside the table in do_GET / do_POST', what='routes outside the table')
    used = set(re.findall(r"""['"`](?:/)?__setup/([a-z][a-z0-9/-]*)""", '\n'.join(
        Path(f).read_text(encoding='utf-8', errors='replace') for f in glob.glob(str(c.root / 'frame' / '**' / '*.js'), recursive=True))))
    known = {p[len('/__setup/'):] for _, p in L.ROUTES} | {'lnmperf', 'lnmperf-folder', 'upload'}
    c.eq(sorted(u for u in used if u.rstrip('/') not in known and not u.endswith('/')), [], 'every route the frame calls is in the table',
         what='frame routes unknown to the launcher')
    c.ok(L.data_repo_url.__doc__ and 'jeton' in src[src.index('def data_repo_url'):src.index('def run(')], '', 'the data repository address never carries credentials')



@case('I11', 'GitLab secret of the launcher', 'I', static=True,
      rule='frame G1 (29 Oct): secrets/gitlab.json (instance, project, token) is registered like ead: the page gets « set » and the date, never a character')
def i11(c):
    import importlib
    import json
    sys.path.insert(0, str(c.root / 'tools'))
    L = importlib.import_module('launch')
    tmp = Path(tempfile.mkdtemp(prefix='sog-secrets-'))
    kept = L.SECRETS
    try:
        L.SECRETS = str(tmp)
        (tmp / 'gitlab.json').write_text(json.dumps({'instance': 'https://gitlab.example', 'project': 'grp/data', 'token': 'glpat-SECRETVALUE1234',
                                                     'savedAt': {'token': '2026-10-29T22:00:00Z'}}), encoding='utf-8')
        v = L.secrets_view()['app']['gitlab']
        c.eq(sorted(v), ['instance', 'project', 'token'], 'the three fields of the service', what='fields')
        c.eq(v['token'], {'set': True, 'at': '2026-10-29T22:00:00Z'}, 'the token: set and when, nothing else', what='token view')
        text = json.dumps(L.secrets_view())
        c.ok('SECRETVALUE' not in text and '1234' not in text and 'grp/data' not in text and 'gitlab.example' not in text, text[:300],
             'not one character of the secret reaches the page')
    finally:
        L.SECRETS = kept
        shutil.rmtree(tmp, ignore_errors=True)


@case('I12', 'GitLab project tokens of the pilots (launcher)', 'I', static=True,
      rule='frame G2 (29 Oct): the launcher creates, lists and revokes project access tokens with the administrator’s token, never handed back; a pilot’s token returned once')
def i12(c):
    import importlib
    import io
    import json
    import urllib.error
    sys.path.insert(0, str(c.root / 'tools'))
    L = importlib.import_module('launch')
    tmp = Path(tempfile.mkdtemp(prefix='sog-g2-'))
    kept = L.SECRETS, L.GITLAB_OPEN
    calls = []

    class Resp:
        def __init__(self, status, body):
            self.status, self.body = status, body

        def read(self):
            return self.body

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake(req, timeout=0):
        calls.append((req.get_method(), req.full_url, req.get_header('Private-token'), json.loads(req.data) if req.data else None))
        if req.get_method() == 'POST':
            return Resp(201, json.dumps({'id': 7, 'name': 'ABC', 'expires_at': '2027-10-29', 'token': 'glpat-PILOT'}).encode())
        if req.get_method() == 'DELETE':
            raise urllib.error.HTTPError(req.full_url, 403, 'Forbidden', {}, io.BytesIO(b'{"message": "403 glpat-ADMIN-SECRET refused"}'))
        return Resp(200, json.dumps([{'id': 7, 'name': 'ABC', 'scopes': ['api'], 'access_level': 30, 'active': True, 'revoked': False,
                                      'token': 'should-not-leak'}]).encode())
    try:
        L.SECRETS, L.GITLAB_OPEN = str(tmp), fake
        c.eq(L.gitlab_tokens().get('status'), 409, 'no secret on the workstation: refused', what='without secret')
        (tmp / 'gitlab.json').write_text(json.dumps({'instance': 'http://gitlab.example', 'project': 'grp/data', 'token': 'glpat-ADMIN-SECRET'}), encoding='utf-8')
        c.eq(L.gitlab_tokens().get('status'), 409, 'an instance that is not https: refused', what='http instance')
        (tmp / 'gitlab.json').write_text(json.dumps({'instance': 'https://gitlab.example', 'project': 'grp/data', 'token': 'glpat-ADMIN-SECRET'}), encoding='utf-8')
        lst = L.gitlab_tokens()
        c.ok(lst['ok'] and lst['tokens'][0]['name'] == 'ABC' and 'should-not-leak' not in json.dumps(lst), json.dumps(lst)[:200], 'the list: names and dates, never a value')
        cr = L.gitlab_token_create({'trigram': 'abc', 'days': 365})
        m, url, tok, body = calls[-1]
        c.ok(cr['ok'] and cr['token'] == 'glpat-PILOT' and url.endswith('/projects/grp%2Fdata/access_tokens') and tok == 'glpat-ADMIN-SECRET'
             and body['name'] == 'ABC' and body['access_level'] == 30 and body['scopes'] == ['api'], str((url, body)), 'a Developer token with api scope, named after the trigram, returned once')
        c.eq([L.gitlab_token_create({'trigram': 'x'}).get('status'), L.gitlab_token_create({'trigram': 'ABC', 'days': 400}).get('status'),
              L.gitlab_token_revoke({'id': 'x'}).get('status')], [400, 400, 400], 'refused: a bad trigram, over 365 days, an id that is not a number', what='checks')
        rv = L.gitlab_token_revoke({'id': 7})
        c.ok(rv['ok'] is False and 'glpat-ADMIN-SECRET' not in json.dumps(rv), json.dumps(rv), 'a refusal never shows the administrator’s token')
        # un jeton qui n'est pas celui d'un pilote (nom hors trigramme) : jamais révoqué ici
        L.GITLAB_OPEN = lambda req, timeout=0: Resp(200, json.dumps({'id': 9, 'name': 'owner-bot'}).encode())
        c.eq(L.gitlab_token_revoke({'id': 9}).get('status'), 403, 'only a pilot token is revoked', what='revoke another token')
        # le vrai ouvreur du lanceur : une redirection n'est jamais suivie, le jeton n'arrive jamais à un autre hôte
        import http.server
        import threading
        got = []

        class Other(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                got.append(self.headers.get('PRIVATE-TOKEN'))
                self.send_response(200)
                self.end_headers()

            def log_message(self, *a):
                pass

        other = http.server.HTTPServer(('127.0.0.1', 0), Other)

        class Hop(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(302)
                self.send_header('Location', f'http://127.0.0.1:{other.server_port}/steal')
                self.end_headers()

            def log_message(self, *a):
                pass

        hop = http.server.HTTPServer(('127.0.0.1', 0), Hop)
        for s_ in (other, hop):
            threading.Thread(target=s_.serve_forever, daemon=True).start()
        try:
            try:
                L.GITLAB_OPENER.open(L._gitlab_request(f'http://127.0.0.1:{hop.server_port}/x', 'GET', None, 'glpat-ADMIN-SECRET'), timeout=5)
                followed = True
            except urllib.error.HTTPError as e:
                followed = e.code != 302
            c.ok(not followed and got == [], str(got), 'a 302 to another host is an error, the token never reaches it')
        finally:
            hop.shutdown()
            other.shutdown()
        src = (c.root / 'tools' / 'launch.py').read_text(encoding='utf-8')
        c.ok("@route('GET', '/__setup/gitlab/tokens', public='poste')" in src and "'/__setup/gitlab/tokens/revoke', public='poste'" in src, '', 'workstation-only routes')
    finally:
        L.SECRETS, L.GITLAB_OPEN = kept
        shutil.rmtree(tmp, ignore_errors=True)


@case('I13', 'Relay mode of the launcher (R1a)', 'I', static=True,
      rule='frame R1a (29 Oct): behind the reverse proxy on 127.0.0.1, https only, a paired device only, the relay routes only, the author from the device token, codes issued on the workstation, revocable; never with the local network; the pairing page never framed, same origin only; a dedicated port for the relay (everything on it is the relay), a proxy request on the interface port refused')
def i13(c):
    sys.path.insert(0, str(c.root / 'tests' / 'v3'))
    import importlib
    T = importlib.import_module('relay_trial')
    T.run(lambda name, ok, info='': c.ok(ok, str(info), name), str(c.root))


@case('I14', 'IVAO OpenID through the relay (launcher)', 'I', static=True,
      rule='frame R1b (29 Oct): code + PKCE S256, the secret on the relay only (client_secret_basic), the state bound to the device and used once, endpoints from the discovery, refresh by the relay')
def i14(c):
    import base64
    import hashlib
    import importlib
    import json
    import urllib.parse
    sys.path.insert(0, str(c.root / 'tools'))
    L = importlib.import_module('launch')
    tmp = Path(tempfile.mkdtemp(prefix='sog-oidc-'))
    kept = L.SECRETS, L.OIDC_OPEN, dict(L._ivao_oidc)
    seen, ch, rev = [], [''], ['yes']

    class Resp:
        def __init__(self, b):
            self.b = b

        def read(self):
            return self.b

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake(req, timeout=20):
        seen.append((req.full_url, req.get_header('Authorization'), req.data))
        if 'well-known' in req.full_url:
            return Resp(json.dumps({'authorization_endpoint': 'https://sso.ivao.test/authorize', 'token_endpoint': 'https://api.ivao.test/oauth/token',
                                    **({'revocation_endpoint': 'https://api.ivao.test/oauth/revoke'} if rev[0] else {})}).encode())
        if req.full_url.endswith('/revoke'):
            if rev[0] == 'refuse':
                raise L.urllib.error.HTTPError(req.full_url, 400, 'bad', {}, None)
            return Resp(b'')
        f = urllib.parse.parse_qs(req.data.decode())
        if f['grant_type'][0] == 'authorization_code':
            assert base64.urlsafe_b64encode(hashlib.sha256(f['code_verifier'][0].encode()).digest()).decode().rstrip('=') == ch[0], 'PKCE'
        return Resp(json.dumps({'access_token': 'AT', 'refresh_token': 'RT', 'expires_in': 3600, 'scope': 'tracker'}).encode())
    try:
        L.SECRETS, L.OIDC_OPEN = str(tmp), fake
        L._ivao_oidc.update(meta=None, at=0.0, pending={})
        c.eq(L.ivao_oauth_start('d1', 'https://relay/__relay/ivao/callback').get('status'), 409, 'no IVAO application on the relay: refused', what='without secret')
        (tmp / 'ivao_oauth.json').write_text(json.dumps({'clientId': 'cid', 'clientSecret': 'S3CRET', 'discovery': 'https://ivao.test/.well-known/openid-configuration'}), encoding='utf-8')
        s = L.ivao_oauth_start('d1', 'https://relay/__relay/ivao/callback')
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(s['url']).query)
        ch[0] = q['code_challenge'][0]
        c.ok(s['ok'] and s['url'].startswith('https://sso.ivao.test/authorize?') and q['code_challenge_method'] == ['S256'] and 'S3CRET' not in s['url']
             and q['redirect_uri'] == ['https://relay/__relay/ivao/callback'], s['url'][:160], 'the authorization address from the discovery, PKCE S256, never the secret')
        c.eq(L.ivao_oauth_finish(q['state'][0], 'C', '', 'd2', 'https://relay/__relay/ivao/callback'), {'ok': False, 'error': 'state'},
             'another device cannot use the state', what='state of another device')
        s = L.ivao_oauth_start('d1', 'https://relay/__relay/ivao/callback')
        q = urllib.parse.parse_qs(urllib.parse.urlsplit(s['url']).query)
        ch[0] = q['code_challenge'][0]
        r = L.ivao_oauth_finish(q['state'][0], 'C', '', 'd1', 'https://relay/__relay/ivao/callback')
        auth = seen[-1][1] or ''
        c.ok(r['ok'] and r['access_token'] == 'AT' and auth.startswith('Basic ') and base64.b64decode(auth[6:]).decode() == 'cid:S3CRET',
             str(r)[:120], 'the code exchanged with client_secret_basic and the PKCE verifier')
        c.eq(L.ivao_oauth_finish(q['state'][0], 'C', '', 'd1', 'https://relay/__relay/ivao/callback').get('error'), 'state', 'a state is used once', what='state again')
        rf = L.ivao_oauth_refresh('RT-long-enough')
        c.ok(rf['ok'] and rf['access_token'] == 'AT', str(rf)[:120], 'the refresh by the relay')
        c.eq(L.ivao_oauth_refresh('x').get('status'), 400, 'a refresh token is checked', what='short refresh token')
        # Délier : révocation chez IVAO (RFC 7009), client authentifié ; sans point de révocation ou refusée : revoked faux
        rv = L.ivao_oauth_revoke('RT-long-enough')
        last = seen[-1]
        c.ok(rv == {'ok': True, 'revoked': True} and last[0] == 'https://api.ivao.test/oauth/revoke' and (last[1] or '').startswith('Basic ')
             and urllib.parse.parse_qs(last[2].decode()).get('token') == ['RT-long-enough'], str((rv, last[0])), 'unlink revokes the token at IVAO, client authenticated')
        rev[0] = 'refuse'
        c.eq(L.ivao_oauth_revoke('RT-long-enough'), {'ok': True, 'revoked': False}, 'a refused revocation is said', what='revocation refused')
        rev[0] = ''
        L._ivao_oidc.update(meta=None, at=0.0)
        c.eq(L.ivao_oauth_revoke('RT-long-enough'), {'ok': True, 'revoked': False}, 'no revocation endpoint: said, the device erases anyway',
             what='no revocation endpoint')
        # 3 demandes en cours au plus par appareil (100 en tout)
        c.eq([bool(L.ivao_oauth_start('d3', 'https://relay/__relay/ivao/callback').get('ok')) for _ in range(4)], [True, True, True, False],
             'three sign-ins in progress per device at most', what='pending per device')
        # retour sur le poste : l'état d'une demande en cours du poste, sans le consommer
        s = L.ivao_oauth_start('', 'http://127.0.0.1:8000/__relay/ivao/callback')
        st = urllib.parse.parse_qs(urllib.parse.urlsplit(s['url']).query)['state'][0]
        c.ok(L.ivao_state_open(st, '', 'http://127.0.0.1:8000/__relay/ivao/callback') and not L.ivao_state_open(st, 'd1', 'http://127.0.0.1:8000/__relay/ivao/callback')
             and not L.ivao_state_open(st, '', 'https://relay/__relay/ivao/callback') and not L.ivao_state_open('nope', '', 'http://127.0.0.1:8000/__relay/ivao/callback')
             and L.ivao_state_open(st, '', 'http://127.0.0.1:8000/__relay/ivao/callback'), '', 'the workstation return needs a state of the workstation in progress, not consumed by the check')
        # l'exception de _refused, sur un gestionnaire du poste : toutes les conditions, sinon refusé comme avant
        def refused(path, method='GET', **hd):
            h = L.Setup.__new__(L.Setup)
            h.command, h.path, h.port, h.client_address = method, path, 8000, ('127.0.0.1', 50000)
            h.server = type('Srv', (), {})()
            h.headers = {'Host': '127.0.0.1:8000', 'Sec-Fetch-Site': 'cross-site', **hd}
            return h._refused()
        nav = {'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate'}
        cb = f'{L.IVAO_CALLBACK}?state={st}&code=C'
        c.eq([refused(cb, **nav), refused(cb, **{**nav, 'Sec-Fetch-Mode': 'no-cors'}), refused(cb, **{**nav, 'Sec-Fetch-Dest': 'image'}),
              refused(cb, 'POST', **nav), refused(f'{L.IVAO_CALLBACK}?state=nope&code=C', **nav), refused('/frame/index.html', **nav),
              refused(cb, **{**nav, 'Host': 'evil.example'})],
             ['', 'autre site', 'autre site', 'autre site', 'autre site', 'autre site', 'hôte'],
             'IVAO\'s return on the workstation: exact path, GET, document navigation, a state of the workstation; nothing else opened',
             what='workstation return')
        c.eq(L.ROUTES[('POST', '/__setup/ivao/oauth/start')][1:], ('lan', True), 'start and refresh are relay routes', what='route public')
        src = (c.root / 'tools' / 'launch.py').read_text(encoding='utf-8')
        c.ok("loc = f'/frame/index.html#ivao-return?{frag}'" in src and "'Referrer-Policy', 'no-referrer'" in src, '', 'the tokens leave by the fragment of the frame address, no referrer')
    finally:
        L.SECRETS, L.OIDC_OPEN = kept[0], kept[1]
        L._ivao_oidc.clear()
        L._ivao_oidc.update(kept[2])
        shutil.rmtree(tmp, ignore_errors=True)
