"""Area A - frame: layout and chrome (PLAN.md section A; rules V3_SPECIFICATION.md 7.1, frame/INTEGRATION.md 9).

Rules covered
  * the five modules load in the five designs with no JavaScript error and no horizontal page scroll (A1);
  * phone header: 57 px, name + "i" + gear only, controls of at least 44 px (A2); screen header keeps help and sync (A3);
  * bottom bar: five entries, 44 px, translated (A4); a fixed module fills the view between header and bar (A5);
    a normal module scrolls under a sticky header (A6);
  * group popover on the active "Preparer" tab (A7); "i" pop-up and its last row (A8); "i" badge colours (A9);
  * night tone (A10), help screen (A11), settings screen (A12), the Cupertino bar navigates (A13);
  * the three states of the aeronautical base: loading, access not set, not published (A15, with D5 / D5b of area D).

Cases: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A15.
"""
import json

from lib import Fail, Skip, case, forget, norm, tx

MODULES = ('fuel', 'maps', 'atmosphere', 'report', 'flightlog')
TABS = [  # APP.tabs of frame/app.js: id, label in fr en de es, module the tab opens first
    ('prepare', ('Préparer', 'Prepare', 'Vorbereiten', 'Preparar')),
    ('maps', ('Carte', 'Map', 'Karte', 'Mapa')),
    ('report', ('CR', 'Report', 'Bericht', 'Informe')),
    ('flightlog', ('Vols', 'Flights', 'Flüge', 'Vuelos')),
    ('settings', ('Réglages', 'Settings', 'Einstellungen', 'Ajustes')),
]
LANG_IX = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}
HELP_ROW = {'fr': 'Aide de cet écran', 'en': 'Help for this screen', 'de': 'Hilfe zu diesem Bildschirm', 'es': 'Ayuda de esta pantalla'}
CHAPTER_H1 = {'maps': {'fr': 'Carte', 'en': 'Map', 'de': 'Karte', 'es': 'Mapa'}}


def hscroll(c):
    return c.js('[document.documentElement.scrollWidth, window.innerWidth]')


@case('A1', 'Every module loads', 'A', tags=('smoke',), night=False,
      rule='smoke; V3_SPECIFICATION 7.1 rule 1 (no horizontal scroll)')
def a1(c):
    for m in MODULES:
        c.open(m)
        c.until("(m) => ((document.querySelector('[data-module=\"' + m + '\"]') || {}).innerText || '').trim().length > 0", m,
                what=f'#{m} draws its content')
        sw, iw = hscroll(c)
        design = c.js('document.documentElement.dataset.design')
        c.eq(design, c.design, rule='the design asked is the one applied', what=f'#{m} dataset.design')
        root = c.box(f'[data-module="{m}"]') or c.box('#fView > *')
        inner = c.js("(m) => ((document.querySelector('[data-module=\"' + m + '\"]') || {}).innerText || '').trim().length", m)
        c.ok(root and root['shown'] and root['h'] > 0 and inner > 0, f'#{m}: module root empty or absent', 'a non-empty module root')
        if m == 'fuel' and sw > iw:
            continue                               # the fuel width is the job of F4 (known failure), not repeated here
        c.ok(sw <= iw, f'#{m} scrollWidth {sw} > innerWidth {iw}', 'scrollWidth <= innerWidth (no horizontal page scroll)')


@case('A2', 'Phone header', 'A', screens=False, rule='V3_SPECIFICATION 7.1 rule 3; frame lot of 24 Oct')
def a2(c):
    c.open('maps')
    head = c.box('.f-head')
    c.eq(head['h'], 57, 'header is --f-head-h = 57 px', tol=0.5, what='header height')
    c.eq(c.px('--f-head-h'), 57, '--f-head-h resolves to 57 px', tol=0.5, what='--f-head-h')
    shown = c.js("[...document.querySelectorAll('.f-head > *')].filter(e => window.__t.shown(e)).map(e => e.id)")
    c.eq(sorted(shown), sorted(['fName', 'fInfo', 'fDevice']), 'exactly the name, "i" and gear are displayed', what='displayed header controls')
    for i in ('fSync', 'fWho', 'fLive', 'fHelp', 'fHost'):
        c.ok(not c.shown('#' + i), f'#{i} is displayed', 'not displayed on a phone')
    for i in ('fInfo', 'fDevice'):
        b = c.box('#' + i)
        c.ok(b['w'] >= 43.5 and b['h'] >= 43.5, f'#{i} is {b["w"]:.0f}x{b["h"]:.0f}', 'at least 44x44')


@case('A3', 'Screen header', 'A', phone=False, rule='V3_SPECIFICATION 7.1 rule 3 (nothing changes above 760 px)')
def a3(c):
    c.open('fuel')
    for i in ('fHelp', 'fSync'):
        c.ok(c.shown('#' + i), f'#{i} is not displayed at {c.width}', 'displayed on a screen')


@case('A4', 'Bottom bar', 'A', langs4=True, rule='V3_SPECIFICATION 7.1 option A; frame/INTEGRATION 9.1')
def a4(c):
    c.open('fuel')
    if not c.phone:
        c.ok(not c.shown('#fTabs'), 'the bottom bar is displayed at 1280', 'hidden on a screen')
        c.ok(c.shown('#fNav'), 'the rail #fNav is hidden at 1280', 'shown on a screen')
        return
    c.ok(c.shown('#fTabs'), '#fTabs is not displayed at 390', 'displayed')
    tabs = c.boxes('#fTabs a')
    c.eq(len(tabs), 5, 'five entries: Préparer, Carte, CR, Vols, Réglages', what='entries')
    for t in tabs:
        c.ok(t['h'] >= 43.5, f'entry "{t["text"]}" is {t["h"]:.1f} px high', 'at least 44 px')
    labels = [t['text'] for t in tabs]
    want = [lab[LANG_IX[c.lang]] for _, lab in TABS]
    c.eq(labels, want, 'tab labels translated in the language of the run', what=f'labels ({c.lang})')


@case('A5', 'Fixed module fills the view', 'A', screens=False, tags=('layout',),
      rule='frame/INTEGRATION 9.2; user "la vue carte doit être fixe"')
def a5(c):
    for m in ('maps', 'atmosphere'):
        c.open(m, flight=True)
        c.ok('f-fixed' in c.js('document.documentElement.className'), f'#{m}: html class "{c.js("document.documentElement.className")}"', 'html has class f-fixed')
        head, root, bar = c.box('.f-head'), c.box(f'[data-module="{m}"]'), c.box('#fTabs')
        c.eq(root['t'] - head['b'], 0, 'module top is at the header bottom (gap 0)', tol=0.5, what=f'#{m} gap header to module')
        c.eq(root['b'], bar['t'], 'module bottom is at the bar top (measured on the real bar box)', tol=0.5, what=f'#{m} module bottom')
        sh, ih = c.js('[document.scrollingElement.scrollHeight, window.innerHeight]')
        c.ok(sh <= ih, f'#{m}: scrollHeight {sh} > innerHeight {ih}', 'no page scroll (scrollHeight <= innerHeight)')


@case('A6', 'Non-fixed module scrolls normally', 'A', screens=False, rule='frame/INTEGRATION 9.2 (fixed absent is today\'s page)')
def a6(c):
    c.open('fuel')
    c.ok('f-fixed' not in c.js('document.documentElement.className'), 'html has class f-fixed on #fuel', 'no f-fixed')
    c.js('window.scrollTo(0, 400)')
    c.wait(250)
    y = c.js('window.scrollY')
    if y < 100:
        raise Skip(f'the fuel page is only {c.js("document.documentElement.scrollHeight")} px tall: cannot scroll 400 px')
    head = c.box('.f-head')
    c.ok(head['shown'] and head['t'] >= -0.5 and head['b'] > 0, f'header top {head["t"]:.0f} after scrolling {y:.0f} px', 'header still visible (sticky)')


def _tab(c, tab_id):
    return f'#fTabs a[data-tab="{tab_id}"]'


@case('A7', 'Group popover', 'A', screens=False, rule='frame/INTEGRATION 9.1; V3_SPECIFICATION 7.1 rule 4')
def a7(c):
    c.open('fuel')
    pop = '.f-tabpop'
    c.tap(_tab(c, 'prepare'))                       # a second tap: the tab is already the active one
    c.until("!!document.querySelector('.f-tabpop')", what='the popover opens on a second tap on Préparer')
    rows = c.boxes('.f-tabpop-row')
    c.eq(len(rows), 2, 'rows Carburant and Atmosphère', what='popover rows')
    bar = c.box('#fTabs')
    for r in rows:
        c.ok(r['h'] >= 43.5, f'row "{r["text"]}" is {r["h"]:.1f} px high', 'at least 44 px')
        c.ok(r['l'] >= 0 and r['r'] <= c.width and r['t'] >= 0, f'row "{r["text"]}" box {r["l"]:.0f}..{r["r"]:.0f}', 'inside the window')
        c.ok(r['b'] <= bar['t'] + 0.5, f'row bottom {r["b"]:.0f} > bar top {bar["t"]:.0f}', 'above the bar')
    cur = c.js("[...document.querySelectorAll('.f-tabpop-row')].filter(r => r.hasAttribute('aria-current')).map(r => r.dataset.id)")
    c.eq(cur, ['fuel'], 'the current row (fuel) carries aria-current', what='aria-current rows')
    c.tap('.f-tabpop-row[data-id="atmosphere"]')
    c.until("location.hash === '#atmosphere'", what='hash becomes #atmosphere')
    c.ok(c.count(pop) == 0, 'popover still open after choosing Atmosphère', 'closed')
    # Escape closes
    c.go('fuel')
    c.tap(_tab(c, 'prepare'))
    c.until("!!document.querySelector('.f-tabpop')", what='popover reopens')
    c.key('Escape')
    c.ok(c.count(pop) == 0, 'popover still open after Escape', 'closed')
    # a tap outside closes
    c.tap(_tab(c, 'prepare'))
    c.until("!!document.querySelector('.f-tabpop')", what='popover reopens')
    c.page.touchscreen.tap(195, 300)
    c.wait(200)
    c.ok(c.count(pop) == 0, 'popover still open after a tap outside', 'closed')
    # a single-module tab: a second tap does nothing and keeps hash and query
    c.open('maps?x=1')
    c.tap(_tab(c, 'maps'))
    c.wait(300)
    c.eq(c.hash(), '#maps?x=1', 'a second tap on a single-module tab keeps the hash and query', what='hash')
    c.ok(c.count(pop) == 0, 'a popover opened on the single-module tab Carte', 'no popover')


@case('A8', '"i" pop-up', 'A', screens=False, langs4=True, rule='frame lot: the "?" is the last line of the "i" pop-up')
def a8(c):
    c.open('fuel')
    c.tap('#fInfo')
    c.until("!!document.querySelector('.f-info-modal .f-info-row')", what='the "i" pop-up opens')
    rows = c.boxes('.f-info-row')
    for r in rows:
        c.ok(r['h'] >= 43.5, f'row "{r["text"][:40]}" is {r["h"]:.1f} px high', 'at least 44 px')
    c.eq(rows[-1]['text'], HELP_ROW[c.lang], 'the last row is "Help for this screen" translated', what='last row')
    c.key('Escape')
    c.ok(c.count('.f-info-modal') == 0, 'pop-up still open after Escape', 'closed')
    c.tap('#fInfo')
    c.until("!!document.querySelector('.f-info-modal .f-info-row')", what='the pop-up reopens')
    c.tap('.f-info-row[data-go="help"]')
    c.until("location.hash.startsWith('#help')", what='hash goes to #help')
    c.eq(c.hash(), '#help?m=fuel', 'the help row opens the chapter of the screen it was opened from', what='hash')


@case('A9', '"i" badge', 'A', rule='frame lot ("pastille verte et orange")')
def a9(c):
    if not c.phone:
        c.open('fuel', trigram='ABC', pending=1)           # at 1280 no badge logic is required: the page just loads
        return

    def state():
        return c.js("(() => { const b = document.getElementById('fInfo'); const probe = v => { const p = document.createElement('i');"
                    " p.style.background = 'var(' + v + ')'; document.body.append(p); const col = getComputedStyle(p).backgroundColor; p.remove(); return col };"
                    " return { attn: b.hasAttribute('data-attn'), badge: b.hasAttribute('data-badge'),"
                    " dot: getComputedStyle(b, '::after').backgroundColor, warn: probe('--sog-warn'), ok: probe('--sog-ok') } })()")
    c.open('fuel', trigram='')
    s = state()
    c.ok(s['attn'] and not s['badge'], f'nothing seeded: data-attn={s["attn"]} data-badge={s["badge"]}', 'amber (data-attn) only')
    c.eq(s['dot'], s['warn'], 'the dot is the amber token --sog-warn', what='dot colour, nothing seeded')
    c.open('fuel', trigram='ABC', pending=1)
    s = state()
    c.ok(s['badge'] and not s['attn'], f'identity + pending flight: data-attn={s["attn"]} data-badge={s["badge"]}', 'green (data-badge) only')
    c.eq(s['dot'], s['ok'], 'the dot is the green token --sog-ok', what='dot colour, identity + pending')
    forget(c.page, ['device/identity.json'], base=c.base)      # a pending flight and no trigram: both, amber wins
    c.open('fuel', pending=1, trigram='')
    s = state()
    c.ok(s['badge'] and s['attn'], f'pending flight, no identity: data-attn={s["attn"]} data-badge={s["badge"]}', 'both attributes set')
    c.eq(s['dot'], s['warn'], 'amber wins over green when both apply', what='dot colour, both')


@case('A10', 'Night tone', 'A', screens=False, designs=('standard',), night=False, tone='night',
      rule='design: dataset.tone = night, dark background')
def a10(c):
    c.open('fuel')
    c.eq(c.js('document.documentElement.dataset.tone'), 'night', 'the frame applies the night tone', what='dataset.tone')
    lum = c.js("""(() => { const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/.exec(getComputedStyle(document.body).backgroundColor);
        if (!m) return -1; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) };
        return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]) })()""")
    c.ok(0 <= lum < 0.2, f'body background luminance {lum:.3f}', 'below 0.2 (dark)')


@case('A11', 'Help screen', 'A', langs4=True, rule='help block: the manual of the module, in the language, closable')
def a11(c):
    c.open('maps')
    c.tap('#fInfo') if c.phone else c.tap('#fHelp')
    if c.phone:
        c.until("!!document.querySelector('.f-info-row[data-go=\"help\"]')", what='"i" pop-up with its help row')
        c.tap('.f-info-row[data-go="help"]')
    c.until("location.hash.startsWith('#help')", what='the help screen opens')
    c.eq(c.hash(), '#help?m=maps', 'help opened from #maps asks the maps chapter', what='hash')
    c.until("!!document.querySelector('[data-chapter=\"maps\"]')", timeout=8000, what='the maps chapter of the manual is drawn')
    sec = c.box('[data-chapter="maps"]')
    c.ok(sec and sec['h'] > 50 and len(sec['text']) > 100, f'chapter text {len(sec["text"]) if sec else 0} characters', 'non-empty manual')
    h1 = c.text('[data-chapter="maps"] h1') or ''
    c.eq(h1.split('#')[0].strip(), CHAPTER_H1['maps'][c.lang], 'the chapter title is in the current language', what='chapter heading')
    c.key('Escape')
    c.until("location.hash === '#maps'", what='Escape returns to #maps')
    c.open('maps')
    c.tap('#fInfo') if c.phone else c.tap('#fHelp')
    if c.phone:
        c.until("!!document.querySelector('.f-info-row[data-go=\"help\"]')", what='"i" pop-up')
        c.tap('.f-info-row[data-go="help"]')
    c.until("location.hash.startsWith('#help')", what='help reopens')
    c.page.go_back()                                  # the browser's back button
    c.until("location.hash === '#maps'", what='the back button returns to #maps')


@case('A12', 'Settings screen', 'A', rule='settings block')
def a12(c):
    c.open('fuel')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens #settings')
    c.until("!!document.querySelector('#fView > .f-screen input')", what='the settings form is drawn')
    n = c.js("[...document.querySelectorAll('#fView > .f-screen input[type=text]')].filter(i => /ABC/.test(i.placeholder || '')).length")
    c.ok(n >= 1, 'no text field with the trigram placeholder (ABC)', 'a trigram field')
    c.eq(c.attr('#fDevice', 'aria-pressed'), 'true', 'the gear is pressed while the settings are open', what='gear aria-pressed')
    c.tap('#fDevice')                                  # the control that opened the screen closes it
    c.until("location.hash === '#fuel'", what='the gear again returns to the previous module (#fuel)')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='settings reopen')
    c.key('Escape')
    c.until("location.hash === '#fuel'", what='Escape returns to the previous module (#fuel)')


@case('A13', 'Cupertino bar navigates', 'A', screens=False, designs=('cupertino',), night=False,
      rule='L16: touch emulation with is_mobile on broke taps on the Cupertino bar')
def a13(c):
    c.open('fuel')
    seen = []
    for tab_id, _ in TABS[1:] + TABS[:1]:
        before = c.hash()
        c.tap(_tab(c, tab_id))
        c.wait(400)
        after = c.hash()
        seen.append(after)
        c.ok(after != before, f'tapping tab "{tab_id}" in cupertino left the hash at {before}', 'the hash changes to the tab\'s screen')


FRAME = 'frame/app.js'
MAPS_M = 'modules/maps/module.js'
REPO = 'sog/data'
GITHUB_SET = ("try { localStorage.setItem('githubData:frame', JSON.stringify({ repo: '%s', branch: 'main', token: 'ghp_test' })) } catch (e) {}" % REPO)


def fake_github(context, docs):
    """A minimal GitHub API for the repository `sog/data` serving `docs` (lib.aero_docs rows) as files of one commit; answers
    are held until `release()` is called (a slow network at the first launch), then served. Returns (release, waiting)."""
    import re
    files = {path: json.dumps(val) for path, val, _ in docs}
    sha = {p: f'{i:040x}' for i, p in enumerate(files, 1)}
    text = {sha[p]: t for p, t in files.items()}
    state = {'hold': True, 'waiting': []}

    def serve(route):
        u = route.request.url.split('?')[0]
        ok = lambda body, ct='application/json': route.fulfill(status=200, content_type=ct, body=body)
        if u.endswith('/git/ref/heads/main'):
            return ok(json.dumps({'object': {'sha': 'c' * 40}}))
        if '/git/commits/' in u:
            return ok(json.dumps({'tree': {'sha': 't' * 40}}))
        if '/git/trees/' in u:
            return ok(json.dumps({'truncated': False, 'tree': [{'path': p, 'type': 'blob', 'sha': sha[p]} for p in files]}))
        m = re.search(r'/git/blobs/(\w+)$', u)
        if m and m.group(1) in text:
            return ok(text[m.group(1)], 'text/plain')
        return route.fulfill(status=404, content_type='application/json', body='{"message":"Not Found"}')

    def handler(route):
        if state['hold']:
            state['waiting'].append(route)
        else:
            serve(route)

    def release():
        state['hold'] = False
        for r in state.pop('waiting'):
            serve(r)
        state['waiting'] = []

    context.route(re.compile(r'^https://api\.github\.com/repos/%s/' % REPO), handler)
    return release, state


def base_notes(c):
    """Texts of the sheet notes of the map (`.mp-notes`), spaces collapsed."""
    return [norm(t) for t in c.js("[...document.querySelectorAll('.mp-notes > *')].map(e => e.textContent)")]


def info_row(c, k):
    """Text of the row `k` of the "i" pop-up, or None (the pop-up is opened, then closed)."""
    c.tap('#fInfo')
    c.until("!!document.querySelector('.f-info-modal .f-info-row')", what='the "i" pop-up opens')
    row = c.js("(k) => { const l = document.querySelector('.f-info-list li[data-k=\"' + k + '\"]'); return l ? l.querySelector('.f-info-txt > span').textContent : null }", k)
    c.key('Escape')
    return None if row is None else norm(row)


@case('A15', 'Aerodb loading state', 'A', screens=False, designs=('standard',), night=False, langs4=True,
      rule='P5: three distinct states of the aeronautical base (frame/settings/DECISIONS.md, 24 Oct 2026, relais cloud)')
def a15(c):
    from lib import aero_docs
    pre = lambda key: norm(tx(MAPS_M, key, c.lang)).split('{z}')[0]
    c.step('P5', 1, 'access set, base not cached, the read is slow')
    c.context.add_init_script(GITHUB_SET)
    release, _ = fake_github(c.context, aero_docs())
    c.open('maps', flight=True, wait=False)           # trigram ABC + a planned flight; nothing of the base in the cache
    c.until("[...document.querySelectorAll('.mp-notes > *')].length > 0", what='the sheet has a note while the base is read')
    notes = base_notes(c)
    c.ok(any(n.startswith(pre('loading')) for n in notes), f'notes {notes!r}', 'one says the base is loading')
    c.ok(not any(n.startswith(norm(tx(MAPS_M, 'noBase', c.lang))) or n.startswith(norm(tx(MAPS_M, 'noAccess', c.lang))) for n in notes),
         f'notes {notes!r}', 'none says "not published" or "access not set" while the read is going on')
    c.eq(info_row(c, 'base'), norm(tx(FRAME, 'loading', c.lang, after='base: {')), 'the "i" pop-up says the same, in the language of the run', what='"i" row')
    c.ok(norm(tx(MAPS_M, 'noBase', c.lang)) not in [norm(n) for n in c.note_log()], 'a notification already says "not published"', 'no notification before the read ends')
    c.step('P5', 2, 'the read ends: the note is gone')
    release()
    c.until("![...document.querySelectorAll('.mp-notes > *')].some(e => /(non publi|not published|nicht ver|no publicada|non r.gl|not set|nicht eingerichtet|no configurado|cours de charg|loading|wird geladen|carg.ndose)/i.test(e.textContent))",
            timeout=10000, what='the loading note is replaced by nothing (the base is there)')
    c.eq(info_row(c, 'base'), None, 'a line for the base is still in the "i" pop-up', what='"i" row after the read')
    c.step('P5', 3, 'the access is cut and the base not kept: it says the access is not set')
    c.page.evaluate("localStorage.removeItem('githubData:frame')")
    forget(c.page, [p for p, _, _ in aero_docs()], base=c.base)
    c.context.add_init_script("try { localStorage.removeItem('githubData:frame') } catch (e) {}")
    c.page.goto(f'{c.base}/frame/index.html#maps', wait_until='load')
    c.ready('maps', sheet=True)
    c.wait(1500)
    notes = base_notes(c)
    want = norm(tx(MAPS_M, 'noAccess', c.lang))
    c.ok(any(n.startswith(want) for n in notes), f'notes {notes!r}', f'one says "{want}"')
    btn = c.js("[...document.querySelectorAll('.mp-notes [data-go=\"settings\"]')].map(b => b.textContent)")
    c.eq([norm(b) for b in btn], [norm(tx(MAPS_M, 'toAccess', c.lang))], 'the note carries one button to Settings', what='buttons')
    c.eq(info_row(c, 'base'), norm(tx(FRAME, 'noaccess', c.lang, after='base: {')), 'the "i" pop-up says it too', what='"i" row')
