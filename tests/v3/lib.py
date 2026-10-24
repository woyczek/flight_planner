"""Shared machinery of the V3 non-regression suite (tests/v3/PLAN.md).

What lives here:
  * the case registry and the `@case(...)` decorator;
  * `Fail` / `Skip`, the two ways a case ends other than passing;
  * `Ctx`, what a case receives: the page, the design / width / language of the run and measuring helpers;
  * the seeding functions (`seed_flight`, `seed_pending`, `seed_identity`), which write into the frame's IndexedDB
    cache without any launcher;
  * the run loop of one (case, design, width, language, tone) combination and the worker that executes them.

Standard library and Playwright only.  Nothing here knows about the report format (see run.py).
"""
import datetime
import importlib
import json
import os
import re
import sys
import time
import traceback
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent          # tests/v3
ROOT = HERE.parent.parent                       # repository root
SHOTS = HERE / 'shots'


def find_chrome():
    """The Chromium to drive: SOG_CHROME, else the newest Playwright build under /opt/pw-browsers or ~/.cache/ms-playwright,
    else Playwright's own default (None). The build number changes with the container image: never a constant."""
    env = os.environ.get('SOG_CHROME')
    if env:
        return env
    import glob
    found = []
    for root in ('/opt/pw-browsers', os.path.expanduser('~/.cache/ms-playwright')):
        found += glob.glob(os.path.join(root, 'chromium-*', 'chrome-linux', 'chrome'))
        found += glob.glob(os.path.join(root, 'chromium-*', 'chrome-linux*', 'chrome'))
    found = sorted(set(f for f in found if os.access(f, os.X_OK)))
    return found[-1] if found else None


CHROME = find_chrome()


def preflight():
    """Checked once in the main process before any worker starts: a worker that dies in its initializer is recreated by
    multiprocessing.Pool for ever, and the run never ends (seen on 24 Oct 2026). Returns a list of problems (empty = fine)."""
    problems = []
    try:
        import playwright  # noqa: F401
    except Exception:
        problems.append('the Playwright Python package is missing: pip install playwright')
    if CHROME is None:
        problems.append('no Chromium found: set SOG_CHROME=<path to chrome>, or install one with: python3 -m playwright install chromium')
    elif not os.path.exists(CHROME):
        problems.append(f'Chromium not found at {CHROME} (SOG_CHROME)')
    return problems

DESIGNS = ('standard', 'metro', 'swiss', 'cupertino', 'material')
LANGS = ('fr', 'en', 'de', 'es')
LANGS4 = ('en', 'de', 'es')
PHONE = (390, 844)
SCREEN = (1280, 800)
CASE_FILES = ('frame', 'overlay', 'sheet', 'maps', 'atmosphere', 'fuel', 'flightlog', 'designs', 'repo')


# ------------------------------------------------------------------------------------------------------ outcomes
class Fail(Exception):
    """A rule that does not hold: what was measured, what was expected, which rule says so."""

    def __init__(self, measured, expected, rule=''):
        super().__init__(f'{measured} (expected {expected})')
        self.measured, self.expected, self.rule = measured, expected, rule


class Skip(Exception):
    """A case that cannot run here (seeding impossible, feature absent): the reason, never a silent PASS."""

    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


# ------------------------------------------------------------------------------------------------------ registry
REGISTRY = {}                                   # id -> Case, in declaration order


class Case:
    def __init__(self, id, title, area, fn, tags, langs4, screens, phone, designs, static, night, rule, tone=None):
        self.id, self.title, self.area, self.fn = id, title, area, fn
        self.tags, self.langs4, self.screens, self.phone = tuple(tags), langs4, screens, phone
        self.designs, self.static, self.night, self.rule = designs, static, night, rule
        self.tone = tone                        # forces the tone of every run (A10)

    def runs(self):
        """The (width, design, lang, tone) combinations of the case, following PLAN.md section 0."""
        if self.static:
            return [(0, '-', '-', '-')]
        out = []
        if self.phone:
            for d in self.designs or DESIGNS:
                out.append((PHONE[0], d, 'fr', self.tone or 'day'))
            if self.langs4:
                out += [(PHONE[0], 'standard', l, 'day') for l in LANGS4]
            if self.area == 'A' and self.night:
                out.append((PHONE[0], 'standard', 'fr', 'night'))
        if self.screens:
            out.append((SCREEN[0], 'standard', 'fr', self.tone or 'day'))
            if self.langs4 and not self.phone:
                out += [(SCREEN[0], 'standard', l, 'day') for l in LANGS4]
        return out


def case(id, title, areas, tags=(), langs4=False, screens=True, phone=True, designs=None, static=False, night=True,
         rule='', tone=None):
    """Registers a case.  `areas` is the plan's area letter; `screens`: also once at 1280 in `standard`; `phone`:
    run at 390 in the five designs (`designs` narrows them); `langs4`: also in en, de, es (phone, `standard`);
    `static`: no browser; `night`: (area A only) one extra run with the night tone."""
    def deco(fn):
        if id in REGISTRY:
            raise RuntimeError(f'duplicate case id {id}')
        REGISTRY[id] = Case(id, title, areas, fn, tags, langs4, screens, phone, designs, static, night, rule, tone)
        return fn
    return deco


def load_cases():
    """Imports every file of tests/v3/cases/ (filling REGISTRY) and returns the registry."""
    if str(HERE) not in sys.path:
        sys.path.insert(0, str(HERE))
    for name in CASE_FILES:
        importlib.import_module(f'cases.{name}')
    importlib.import_module('cases.known_failures')
    return REGISTRY


# ------------------------------------------------------------------------------------------------------ seeding
# The frame reads its documents from IndexedDB `sogFrame` (frame/store/frame_data.js: stores docs / pending / meta /
# conflicts) when no launcher answers.  A seed is written there from any same-origin page before the application is
# loaded: `docs` rows { path, text, base, rev, at, policy } are what `FrameData.get()` reads first.
_SEED_JS = """async (docs) => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('sogFrame', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const [n, o] of [['docs', { keyPath: 'path' }], ['pending', { keyPath: 'path' }], ['meta', { keyPath: 'key' }],
                            ['conflicts', { keyPath: 'id', autoIncrement: true }]])
        if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('docs', 'readwrite'), s = tx.objectStore('docs');
    for (const [path, val, policy] of docs) {
      const text = JSON.stringify(val, null, 1) + '\\n';
      s.put({ path, text, base: text, rev: '', at: Date.now(), policy });
    }
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
  db.close();
  return docs.length;
}"""

# The planned flight the maps module draws (same shape as modules/maps/test/index.html writes): LFRS -> LFML, FL270.
FLIGHT = {
    'schema': 1, 'by': 'fuel', 'updated_at': '2026-10-24T10:00:00Z',
    'aircraft': {'type': 'C30J', 'registration': 'F-RAJA'},
    'route': {
        'text': 'LFRS LUGEN NEPIX LFML', 'dep': 'LFRS', 'arr': 'LFML', 'altn': 'LFMT',
        'points': [{'id': 'LFRS', 'lat': 47.1569, 'lon': -1.6078}, {'id': 'LUGEN', 'lat': 46.5833, 'lon': -1.2},
                   {'id': 'NEPIX', 'lat': 44.9, 'lon': 2.4}, {'id': 'LFML', 'lat': 43.4367, 'lon': 5.215}],
        'distanceNm': 366, 'trackDeg': 125},
    'level': {'ft': 27000},
    'profile': {'climbFpm': 1800, 'climbKt': 220, 'descentFpm': 1800, 'descentKt': 280, 'tocNm': 62, 'todNm': 78},
}


def _seed(page, base, docs):
    base = base or _W['base']
    page.goto(base + '/frame/manifest.webmanifest')      # same origin, no script of the application runs
    return page.evaluate(_SEED_JS, docs)


def seed_identity(page, trigram='ABC', base=None):
    """device/identity.json (cache policy): the device's trigram."""
    return _seed(page, base, [['device/identity.json', {'trigram': trigram}, 'cache']])


def flight_docs(started=False, trigram='ABC', steps=False):
    """The documents of a planned flight; `started=True` adds `started.at` = now (a flight under way); `steps=True` climbs
    to FL310 at NEPIX (a point with `alt_ft`: a level step)."""
    f = json.loads(json.dumps(FLIGHT))
    if steps:
        f['route']['points'][2]['alt_ft'] = 31000
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    if started:
        f['started'] = {'at': now}
    f['updated_at'] = now
    return [['device/identity.json', {'trigram': trigram}, 'cache'], [f'pilot/{trigram}/current_flight.json', f, 'document']]


def seed_flight(page, started=False, trigram='ABC', base=None):
    """pilot/<trigram>/current_flight.json (+ the identity that names it): the planned flight, started or not."""
    return _seed(page, base, flight_docs(started, trigram))


def pending_doc(flights=1):
    """cache/flightlog/pending.json, schema 2 (frame/INTEGRATION.md section 10.1)."""
    rows = []
    for i in range(flights):
        rows.append({
            'date': f'2026-10-{23 - i:02d}', 'dep': 'LFRS', 'arr': 'LFML', 'registration': 'F-ZBMC', 'source': 'website',
            'handoff': {'family': 'AIRBORNE', 'values': {
                'metadata.date': f'2026-10-{23 - i:02d}', 'aircraft.0.callsign': 'TEST', 'aircraft.0.type': 'C30J',
                'aircraft.0.registration': 'F-ZBMC', 'navigation.dep': 'LFRS', 'navigation.arr': 'LFML'}}})
    return {'schema': 2, 'updated_at': '2026-10-24T10:00:00Z', 'flights': rows}


def forget(page, paths, base=None):
    """Removes seeded documents (to get a state with a pending flight and no identity, for instance)."""
    base = base or _W['base']
    page.goto(base + '/frame/manifest.webmanifest')
    return page.evaluate("""async (paths) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
      await new Promise((res, rej) => { const tx = db.transaction('docs', 'readwrite'); for (const p of paths) tx.objectStore('docs').delete(p);
        tx.oncomplete = res; tx.onerror = () => rej(tx.error) });
      db.close(); return paths.length }""", paths)


def seed_pending(page, flights=1, base=None):
    """cache/flightlog/pending.json (cache policy): `flights` reports still to write."""
    return _seed(page, base, [['cache/flightlog/pending.json', pending_doc(flights), 'cache']])


# JavaScript (argument: a module name) returning the box of the map area of a fixed module's root: the first child that
# grows (flex-grow > 0, at least 40 px high), else the first visible one (frame/INTEGRATION.md section 9.3, placement).
MAP_JS = """(m) => { const root = document.querySelector('[data-module="' + m + '"]');
  const kids = [...root.children].filter(c => c.offsetHeight >= 40 && getComputedStyle(c).position !== 'absolute');
  const el = kids.find(c => getComputedStyle(c).flexGrow > 0) || kids[0]; return window.__t.box(el) }"""

# ------------------------------------------------------------------------------------------------------ page helpers
# Installed on every page: small measuring functions, so that a case reads boxes with one round trip.
_HELPERS_JS = r"""
window.__t = (() => {
  const q = (s, root) => (root || document).querySelector(s);
  const qa = (s, root) => [...(root || document).querySelectorAll(s)];
  const shown = e => {
    if (!e) return false;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const box = e => {
    if (!e) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { x: r.left, y: r.top, w: r.width, h: r.height, l: r.left, t: r.top, r: r.right, b: r.bottom,
             display: cs.display, shown: shown(e), text: (e.textContent || '').trim().slice(0, 200) };
  };
  // every floating notification ever added (text), whatever its lifetime: window.__notes
  window.__notes = [];
  const watch = () => new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes)
    if (n.nodeType === 1 && n.classList.contains('f-note')) window.__notes.push((n.textContent || '').replace(/✕$/, '').trim()) })
    .observe(document, { childList: true, subtree: true });
  watch();
  return { q, qa, shown, box };
})();
"""

STUB_STYLE = json.dumps({'version': 8, 'name': 'test', 'sources': {'base': {
    'type': 'geojson', 'data': {'type': 'FeatureCollection', 'features': []},
    'attribution': '<a href="https://openfreemap.org">OpenFreeMap</a> © OpenMapTiles Data from OpenStreetMap'}},
    'layers': [{'id': 'background', 'type': 'background', 'paint': {'background-color': '#e8eef3'}},
               {'id': 'none', 'type': 'fill', 'source': 'base', 'paint': {'fill-color': '#ccc'}}]})

# Console errors that are not the page's fault: blocked network (tiles, CDN, the launcher's endpoints under /__).
_NET_RE = re.compile(r'net::ERR_|ERR_BLOCKED|ERR_INTERNET|ERR_NAME|ERR_CONNECTION|ERR_FAILED|ERR_ABORTED|android\.clients\.google\.com'
                     r'|tile|openfreemap|versatiles|amazonaws|unpkg|jsdelivr|cdnjs|open-meteo', re.I)
_CODE_EXT = ('.js', '.mjs', '.css', '.html')


class Asserts:
    """Assertions shared by the browser context and the static one: each raises Fail with the measured value, the expected one
    and the rule."""

    def eq(self, measured, expected, rule='', tol=0, what=''):
        pre = f'{what}: ' if what else ''
        if isinstance(expected, (int, float)) and isinstance(measured, (int, float)):
            if abs(measured - expected) > tol:
                raise Fail(f'{pre}{_r(measured)}', f'{_r(expected)}' + (f' ± {tol}' if tol else ''), rule)
        elif measured != expected:
            raise Fail(f'{pre}{measured!r}', f'{expected!r}', rule)

    def ok(self, cond, measured, expected, rule=''):
        if not cond:
            raise Fail(measured, expected, rule)

    def le(self, measured, limit, rule='', what=''):
        if measured > limit:
            raise Fail(f'{what + ": " if what else ""}{_r(measured)}', f'<= {_r(limit)}', rule)

    def ge(self, measured, limit, rule='', what=''):
        if measured < limit:
            raise Fail(f'{what + ": " if what else ""}{_r(measured)}', f'>= {_r(limit)}', rule)

    def skip(self, reason):
        raise Skip(reason)


class Ctx(Asserts):
    """What a case receives.  `page`, `design`, `width`, `lang`, `tone`, plus helpers.  Nothing is hidden: a case may
    use `page` (a Playwright page) directly."""

    def __init__(self, page, context, base, case, width, design, lang, tone):
        self.page, self.context, self.base, self.case = page, context, base, case
        self.width, self.design, self.lang, self.tone = width, design, lang, tone
        self.phone = 0 < width <= 760
        self.errors = []                       # JavaScript errors and failed code files since the page opened
        self.warnings = []                     # not failures: things worth reading in a report
        self.height = PHONE[1] if self.phone else SCREEN[1]
        page.on('pageerror', lambda e: self.errors.append('pageerror: ' + str(e)[:300]))
        page.on('console', self._console)
        page.on('response', self._response)

    # -- error capture
    def _console(self, m):
        if m.type != 'error':
            return
        text, url = m.text or '', (m.location or {}).get('url', '') or ''
        if text.startswith('Failed to load resource'):
            return                               # judged by `_response` (status, host, file type)
        if _NET_RE.search(text) or _NET_RE.search(url):
            return
        self.errors.append('console.error: ' + text[:300])

    def _response(self, r):
        u = urlparse(r.url)
        if r.status < 400 or u.hostname not in ('127.0.0.1', 'localhost'):
            return
        if u.path.startswith('/__') or not u.path.lower().endswith(_CODE_EXT):
            return                               # data endpoints a launcher would answer: not a page error
        self.errors.append(f'missing file {r.status}: {u.path}')

    def check_errors(self):
        if self.errors:
            raise Fail(self.errors[0] + (f' (+{len(self.errors) - 1} more)' if len(self.errors) > 1 else ''),
                       'no JavaScript error from load to the end of the case',
                       'pages rechargées, sans erreur JavaScript (CLAUDE.md, before each commit, 3)')

    # -- navigation and seeding
    def open(self, target='fuel', flight=False, started=False, trigram='ABC', pending=0, wait=True, steps=False, aero=False,
             tone=None):
        """Seeds the cache, then loads `frame/index.html#<target>` and waits for the screen.  `target` is the part after
        '#', e.g. 'maps', 'help?m=maps', 'settings'.  Always seeded: the design and tone of the run (device/design.json,
        which the frame applies over the localStorage mirror; `tone` overrides the run's) and a trigram (`trigram=''`: none,
        and the frame then asks for one in a notification that covers the bottom of the screen).  `flight`: the planned flight; `started`: it
        is under way; `pending`: that many reports still to write."""
        docs = [['device/design.json', {'design': self.design, 'tone': tone or self.tone}, 'cache']]
        if trigram:
            docs.append(['device/identity.json', {'trigram': trigram}, 'cache'])
        if flight:
            docs += flight_docs(started, trigram or 'ABC', steps)
        if aero:
            docs += aero_docs()
        if pending:
            docs.append(['cache/flightlog/pending.json', pending_doc(pending), 'cache'])
        _seed(self.page, self.base, docs)
        self.page.goto(f'{self.base}/frame/index.html#{target}', wait_until='load')
        if wait:
            self.ready(target, sheet=flight)

    def ready(self, target, sheet=False):
        """Waits for the screen of `target` to be drawn: its module root, and its overlay when it is fixed (the sheet
        is not awaited: a map without a flight has none)."""
        name = re.match(r'[a-z]+', target).group(0) if target else ''
        p = self.page
        if name in ('maps', 'atmosphere', 'fuel', 'report', 'flightlog'):
            p.wait_for_function(f"!!document.querySelector('[data-module=\"{name}\"]')", timeout=20000)
        else:
            p.wait_for_function("!!document.querySelector('#fView > *')", timeout=20000)
        if name in ('maps', 'atmosphere'):
            p.wait_for_function("""() => { const o = document.querySelector('.f-overlay');
                return o && o.getBoundingClientRect().width > 0 }""", timeout=20000)
            if sheet:
                p.wait_for_function("() => { const s = document.querySelector('.f-sheet-panel'); return s && s.getBoundingClientRect().height > 0 }", timeout=20000)
        self.settle()

    def settle(self, quiet=350, timeout=6000):
        """Waits until the overlay, the sheet panel and the header stop moving (heights transition for 200 ms)."""
        js = """(quiet) => new Promise(res => {
          const sel = ['.f-head', '.f-overlay', '.f-sheet-panel', '#fTabs'];
          const key = () => sel.map(s => { const e = document.querySelector(s); if (!e) return '-'; const r = e.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height].map(Math.round).join(',') }).join('|');
          let last = key(), since = performance.now();
          const tick = () => { const k = key(); if (k !== last) { last = k; since = performance.now() }
            if (performance.now() - since >= quiet) res(true); else setTimeout(tick, 50) };
          tick(); setTimeout(() => res(false), %d);
        })""" % timeout
        return self.page.evaluate(js, quiet)

    def hash(self):
        return self.page.evaluate('location.hash')

    def go(self, target):
        """Changes the address inside the page (a module change, no reload) and waits for the screen."""
        self.page.evaluate('(h) => { location.hash = h }', '#' + target)
        self.ready(target)

    # -- measuring
    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg) if arg is not None else self.page.evaluate(expr)

    def box(self, sel):
        """Box of the first match of `sel` (or None): x, y, w, h, l, t, r, b, display, shown, text."""
        return self.page.evaluate('(s) => window.__t.box(window.__t.q(s))', sel)

    def boxes(self, sel):
        return self.page.evaluate('(s) => window.__t.qa(s).map(window.__t.box)', sel)

    def shown(self, sel):
        return bool(self.page.evaluate('(s) => window.__t.shown(window.__t.q(s))', sel))

    def count(self, sel):
        return self.page.evaluate('(s) => document.querySelectorAll(s).length', sel)

    def text(self, sel):
        return self.page.evaluate('(s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null }', sel)

    def attr(self, sel, name):
        return self.page.evaluate('([s, n]) => { const e = document.querySelector(s); return e ? e.getAttribute(n) : null }', [sel, name])

    def style(self, sel, prop):
        return self.page.evaluate('([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null }', [sel, prop])

    def var(self, name, sel=':root'):
        """Computed value of a custom property (e.g. '--f-head-h')."""
        return self.page.evaluate('([s, n]) => getComputedStyle(document.querySelector(s)).getPropertyValue(n).trim()', [sel, name])

    def px(self, name, sel=':root'):
        """A length custom property, in px (a probe element resolves calc(), %, var())."""
        return self.page.evaluate("""([s, n]) => { const h = document.querySelector(s), p = document.createElement('div');
          p.style.cssText = 'position:absolute;visibility:hidden;width:var(' + n + ');height:0'; h.append(p);
          const w = p.getBoundingClientRect().width; p.remove(); return w }""", [sel, name])

    def note_log(self):
        """Texts of every notification added since the page opened (a toast lives 6 s: the log keeps them)."""
        return self.page.evaluate('window.__notes || []')

    def notes(self):
        """Texts of the frame's floating notifications (#fNotes)."""
        return self.page.evaluate("[...document.querySelectorAll('#fNotes .f-note')].map(n => n.textContent.trim())")

    def pick(self, by_lang, default=None):
        """The string of the run's language out of a {fr, en, de, es} dict."""
        return by_lang.get(self.lang, by_lang.get('fr') if default is None else default)

    # -- acting
    def tap(self, target, timeout=5000):
        """Touch on a phone, click on a screen, with Playwright's actionability checks: an element covered by
        another one makes the case fail (the tap would not reach it)."""
        loc = self.page.locator(target).first if isinstance(target, str) else target
        try:
            loc.tap(timeout=timeout) if self.phone else loc.click(timeout=timeout)
        except Exception as e:                     # Playwright TimeoutError: not visible, covered, unstable
            raise Fail(f'cannot {"tap" if self.phone else "click"} {target}: {str(e).splitlines()[0][:160]}',
                       'the control is visible, enabled and not covered', 'touch reach') from None
        self.page.wait_for_timeout(120)

    def key(self, name):
        self.page.keyboard.press(name)
        self.page.wait_for_timeout(150)

    def wait(self, ms=200):
        self.page.wait_for_timeout(ms)

    def until(self, expr, arg=None, timeout=4000, what=''):
        """Waits for a JavaScript predicate; Fail if it never holds."""
        try:
            self.page.wait_for_function(expr, arg=arg, timeout=timeout)
        except Exception:
            raise Fail(f'never true within {timeout} ms: {what or expr[:80]}', 'it becomes true') from None

    def shot(self, name):
        SHOTS.mkdir(exist_ok=True)
        path = SHOTS / name
        try:
            self.page.screenshot(path=str(path))
            return f'tests/v3/shots/{name}'
        except Exception:
            return ''

    def mark(self, sel, text, attr='title'):
        """Selector of the element of `sel` whose `attr` (or text) equals `text` once all kinds of spaces (the frame puts a
        narrow no-break space before ':' in French) are collapsed; Fail if there is none."""
        ok = self.page.evaluate("""([sel, text, attr]) => { const n = s => (s || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim();
          document.querySelectorAll('[data-t-mark]').forEach(e => e.removeAttribute('data-t-mark'));
          const e = [...document.querySelectorAll(sel)].find(e => n(attr === 'text' ? e.textContent : e.getAttribute(attr)) === n(text));
          if (e) e.setAttribute('data-t-mark', '1'); return !!e }""", [sel, text, attr])
        if not ok:
            raise Fail(f'no {sel} with {attr} {text!r}', 'a control with the expected label in the language of the run')
        return '[data-t-mark="1"]'

    def drag(self, sel, dy, steps=20, step_ms=50):
        """Slow pointer drag of the centre of `sel` by `dy` px (slower than the 0.8 px/ms flick of the sheet, so the release
        snaps to the nearest position)."""
        b = self.box(sel)
        if not b or not b['shown']:
            raise Fail(f'cannot drag {sel}: not displayed', 'a visible handle')
        x, y = b['x'] + b['w'] / 2, b['y'] + b['h'] / 2
        m = self.page.mouse
        m.move(x, y)
        m.down()
        for i in range(1, steps + 1):
            m.move(x, y + dy * i / steps)
            self.page.wait_for_timeout(step_ms)
        m.up()
        self.page.wait_for_timeout(450)

def _r(v):
    return round(v, 2) if isinstance(v, float) else v


# ------------------------------------------------------------------------------------------------------ one run
def init_script(design, tone, lang):
    d = json.dumps({'design': design, 'tone': tone})
    return (f"try {{ localStorage.setItem('sogFrame:design', {json.dumps(d)}); "
            f"localStorage.setItem('sogFrame:lang', {json.dumps(lang)}) }} catch (e) {{}}")


def run_one(browser, base, case_id, width, design, lang, tone, timeout=15000):
    """Executes one combination of one case in a fresh browser context; returns a result dict."""
    case = REGISTRY[case_id]
    res = {'id': case_id, 'width': width, 'design': design, 'lang': lang, 'tone': tone, 'status': 'PASS'}
    t0 = time.time()
    if case.static:
        c = None
        try:
            case.fn(StaticCtx())
        except Skip as s:
            res.update(status='SKIP', reason=s.reason)
        except Fail as f:
            res.update(status='FAIL', measured=str(f.measured), expected=str(f.expected), rule=f.rule or case.rule)
        except Exception:
            res.update(status='ERROR', measured=traceback.format_exc()[-600:], expected='no exception in the test', rule='')
        res['secs'] = round(time.time() - t0, 1)
        return res
    w, h = (PHONE if width <= 760 else SCREEN)
    opts = dict(viewport={'width': w, 'height': h}, locale={'fr': 'fr-FR', 'en': 'en-US', 'de': 'de-DE', 'es': 'es-ES'}[lang])
    if width <= 760:
        opts.update(device_scale_factor=2, has_touch=True, is_mobile=False)
    ctx = browser.new_context(**opts)
    page = ctx.new_page()
    page.set_default_timeout(timeout)
    # no network: tiles, CDN and the rest never answer in the cloud, and a test must not depend on them
    ctx.route(re.compile(r'^https?://(?!127\.0\.0\.1|localhost)'), lambda route: route.abort('blockedbyclient'))
    # the base map style is answered with an empty one (a background only): MapLibre runs, as with tiles, with nothing to fetch
    ctx.route(re.compile(r'^https://tiles\.openfreemap\.org/styles/'),
              lambda route: route.fulfill(status=200, content_type='application/json', body=STUB_STYLE))
    page.add_init_script(_HELPERS_JS)
    page.add_init_script(init_script(design, tone, lang))
    c = Ctx(page, ctx, base, case, width, design, lang, tone)
    try:
        case.fn(c)
        c.check_errors()
    except Skip as s:
        res.update(status='SKIP', reason=s.reason)
    except Fail as f:
        res.update(status='FAIL', measured=str(f.measured), expected=str(f.expected), rule=f.rule or case.rule)
        if c.errors and not str(f.measured).startswith(c.errors[0][:20]):
            res['errors'] = c.errors[:3]
    except Exception as e:
        if c.errors:                              # a page error often explains a later timeout: say it first
            res.update(status='FAIL', measured=c.errors[0], expected='no JavaScript error', rule=case.rule)
        else:
            res.update(status='ERROR', measured=f'{type(e).__name__}: {str(e).splitlines()[0][:200]}',
                       expected='no exception in the test', rule='', trace=traceback.format_exc()[-800:])
    if res['status'] in ('FAIL', 'ERROR') or case.id == 'A1':
        name = f'{case.id}_{design}_{width}' + (f'_{lang}' if lang != 'fr' else '') + ('_night' if tone == 'night' else '') + '.png'
        shot = c.shot(name)
        if shot:
            res['shot'] = shot
    try:
        ctx.close()
    except Exception:
        pass
    res['secs'] = round(time.time() - t0, 1)
    return res


TOUCHED = None          # paths chosen by --changed / --for (None: the whole tree); set by run.py for the static cases


class StaticCtx(Asserts):
    """What a static case (no browser) receives: the repository root, a git helper and `touched`, the changed paths when
    the run was chosen by --changed / --for (None otherwise: check the whole tree)."""
    root = ROOT

    @property
    def touched(self):
        return TOUCHED

    def git(self, *args):
        import subprocess
        p = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True)
        return p.returncode, p.stdout, p.stderr


# ------------------------------------------------------------------------------------------------------ workers
_W = {}


def worker_init(base):
    """Starts a Playwright browser in a worker process (one browser per worker, one fresh context per run)."""
    from playwright.sync_api import sync_playwright
    load_cases()
    pw = sync_playwright().start()
    _W.update(pw=pw, base=base, browser=pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else pw.chromium.launch(args=['--no-sandbox']))


def worker_run(job):
    case_id, width, design, lang, tone = job
    try:
        return run_one(_W['browser'], _W['base'], case_id, width, design, lang, tone)
    except Exception as e:                        # browser crash: restart it once, report the run as an error
        try:
            _W['browser'].close()
        except Exception:
            pass
        _W['browser'] = _W['pw'].chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else _W['pw'].chromium.launch(args=['--no-sandbox'])
        return {'id': case_id, 'width': width, 'design': design, 'lang': lang, 'tone': tone, 'status': 'ERROR',
                'measured': f'browser crashed: {type(e).__name__}: {str(e)[:160]}', 'expected': 'no crash', 'rule': '', 'secs': 0}


def worker_close():
    try:
        _W['browser'].close()
        _W['pw'].stop()
    except Exception:
        pass


# ------------------------------------------------------------------------------------------------------ texts
_STR = re.compile(r"""'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`""", re.S)
_UNESC = {'n': '\n', 't': '\t', "'": "'", '"': '"', '\\': '\\', '`': '`'}
_TX_CACHE = {}


def _unesc(s):
    return re.sub(r'\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)', lambda m: chr(int(m.group(1)[1:], 16)) if m.group(1)[0] in 'ux' and len(m.group(1)) > 1
                  else _UNESC.get(m.group(1), m.group(1)), s)


def tx_row(path, key, after=None, n=0):
    """The four translations (fr, en, de, es) a module or the frame writes as `key: ['..', '..', '..', '..']` in its
    source file (a path relative to the repository).  The tests then check that the screen shows the row of the run's
    language, whatever the wording is.  `after`: a text to find first (a table whose key names repeat); `n`: which
    occurrence after it (0 = first)."""
    src = _TX_CACHE.setdefault(path, (ROOT / path).read_text(encoding='utf-8'))
    start = src.index(after) if after else 0
    hits = list(re.finditer(r'\b' + re.escape(key) + r'\s*:\s*\[', src[start:]))
    if len(hits) <= n:
        raise RuntimeError(f'translation row {key!r} not found in {path}')
    i = start + hits[n].end()
    out = []
    while len(out) < 4:
        m = _STR.search(src, i)
        if not m:
            break
        gap = src[i:m.start()]
        if re.search(r'[\]\[{}]', gap):
            break
        out.append(_unesc(next(g for g in m.groups() if g is not None)))
        i = m.end()
    if len(out) != 4:
        raise RuntimeError(f'translation row {key!r} of {path} has {len(out)} entries, not 4')
    return tuple(out)


def tx(path, key, lang, **kw):
    """One translation of `tx_row` in the language `lang` ('fr', 'en', 'de', 'es')."""
    return tx_row(path, key, **kw)[LANGS.index(lang)]


def norm(s):
    """Text with every kind of space (the frame writes a narrow no-break space before ':' in French) collapsed to one blank."""
    return re.sub(r'[\s  ]+', ' ', s or '').strip()


# A tiny published SIA base (zone `fr`, split format, frame/aerodb/SPEC.md section 2): three airspaces over the middle of the
# seeded route (around NEPIX, 44.9N 2.4E), nothing else.  With it the map offers airspace lists and the "database not
# published" notice goes away.
def aero_docs(cycle='2026-10-15'):
    def ring(lat0, lat1, lon0, lon1):
        return [[lat0, lon0], [lat0, lon1], [lat1, lon1], [lat1, lon0], [lat0, lon0]]
    airspaces = [   # levels above FL195: the seeded flight is at FL270, so the "IFR route" display profile draws these
        {'type': 'CTA', 'cls': 'C', 'name': 'TESTVILLE CTA 1', 'lower': 'FL195', 'upper': 'FL460', 'rings': [ring(44.0, 46.0, 1.0, 3.8)]},
        {'type': 'TMA', 'cls': 'D', 'name': 'TESTVILLE TMA 2', 'lower': 'FL200', 'upper': 'FL300', 'rings': [ring(44.4, 45.6, 1.6, 3.2)]},
        {'type': 'R', 'name': 'R 99 TEST', 'lower': 'SFC', 'upper': 'UNL', 'rings': [ring(44.6, 45.2, 2.0, 2.8)]},
    ]
    cells = {str(y): [[0, 4]] for y in range(43, 47)}

    def kind(k, data):
        return [f'sia/base/fr/{cycle}/{k}.json', {'schema': 2, 'zone': 'fr', 'cycle': cycle, 'kind': k, 'parserVersion': 1,
                                                  'data': data, 'updated_at': '2026-10-15T00:00:00Z'}, 'reference']
    return [['sia/base/index.json', {'zones': {'fr': {'cycle': cycle, 'prefixes': ['LF'], 'kb': {}, 'cells': cells}}}, 'reference'],
            kind('meta', {}), kind('airspaces', airspaces)]
