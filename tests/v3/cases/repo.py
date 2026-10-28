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
