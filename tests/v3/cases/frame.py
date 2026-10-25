"""Area A - frame: layout and chrome (PLAN.md section A; rules V3_SPECIFICATION.md 7.1, frame/INTEGRATION.md 9).

Rules covered
  * the five modules load in the five designs with no JavaScript error and no horizontal page scroll (A1);
  * phone header (rule 14): 57 px, name + "?" + gear only, controls of at least 44 px, no "i" (A2); screen header keeps help
    and sync (A3);
  * bottom bar: five entries (Préparer, Carte, CR, Vols, Météo; Settings is the gear), 44 px, translated (A4); a fixed
    module fills the view between header and bar (A5); a normal module scrolls under a sticky header (A6);
  * group popover on the active "Preparer" tab: Carburant and Fiches (A7); the "Status" block at the top of Settings, its
    lines and actions (A8); the badge colours, on the gear (A9);
  * night tone (A10), help screen (A11), settings screen (A12), the Cupertino bar navigates (A13);
  * the three states of the aeronautical base: loading, access not set, not published (A15, with D5 / D5b of area D);
  * landscape on a phone, 844 x 390: the bar becomes a 44 px rail on the left, the sheet a right column, the map takes the
    rest at full height, the overlay buttons stay in one column, full screen keeps the column and has no exit chip (A14).

  * one module in the view: navigations that arrive during a mount cancel it, the last address wins (A16).

Cases: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15 A16.
"""
import json

from lib import MAP_JS, Fail, Skip, case, forget, norm, tx

MODULES = ('fuel', 'maps', 'atmosphere', 'report', 'flightlog')
TABS = [  # APP.tabs of frame/app.js: id, label in fr en de es, module the tab opens first
    ('prepare', ('Préparer', 'Prepare', 'Vorbereiten', 'Preparar')),
    ('maps', ('Carte', 'Map', 'Karte', 'Mapa')),
    ('report', ('CR', 'Report', 'Bericht', 'Informe')),
    ('flightlog', ('Vols', 'Flights', 'Flüge', 'Vuelos')),
    ('weather', ('Météo', 'Weather', 'Wetter', 'Meteo')),
]
LANG_IX = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}
STATUS_TITLE = {'fr': 'État', 'en': 'Status', 'de': 'Status', 'es': 'Estado'}
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


@case('A2', 'Phone header', 'A', screens=False, rule='V3_SPECIFICATION 7.1 rule 14 (amends 3)')
def a2(c):
    c.open('maps')
    head = c.box('.f-head')
    c.eq(head['h'], 57, 'header is --f-head-h = 57 px', tol=0.5, what='header height')
    c.eq(c.px('--f-head-h'), 57, '--f-head-h resolves to 57 px', tol=0.5, what='--f-head-h')
    shown = c.js("[...document.querySelectorAll('.f-head > *')].filter(e => window.__t.shown(e)).map(e => e.id)")
    c.eq(sorted(shown), sorted(['fName', 'fHelp', 'fDevice']), 'exactly the name, "?" and gear are displayed', what='displayed header controls')
    for i in ('fSync', 'fWho', 'fLive', 'fHost'):
        c.ok(not c.shown('#' + i), f'#{i} is displayed', 'not displayed on a phone')
    c.eq(c.count('#fInfo'), 0, 'the "i" button no longer exists (its lines are the status block of Settings)', what='#fInfo elements')
    for i in ('fHelp', 'fDevice'):
        b = c.box('#' + i)
        c.ok(b['w'] >= 43.5 and b['h'] >= 43.5, f'#{i} is {b["w"]:.0f}x{b["h"]:.0f}', 'at least 44x44')


@case('A3', 'Screen header', 'A', phone=False, rule='V3_SPECIFICATION 7.1 rule 3 (nothing changes above 760 px)')
def a3(c):
    c.open('fuel')
    for i in ('fHelp', 'fSync'):
        c.ok(c.shown('#' + i), f'#{i} is not displayed at {c.width}', 'displayed on a screen')
    c.eq(c.count('#fInfo'), 0, 'no "i" button on a screen either (rule 14)', what='#fInfo elements')


@case('A4', 'Bottom bar', 'A', langs4=True, rule='V3_SPECIFICATION 7.1 option A, rule 14; frame/INTEGRATION 9.1')
def a4(c):
    c.open('fuel')
    if not c.phone:
        c.ok(not c.shown('#fTabs'), 'the bottom bar is displayed at 1280', 'hidden on a screen')
        c.ok(c.shown('#fNav'), 'the rail #fNav is hidden at 1280', 'shown on a screen')
        return
    c.ok(c.shown('#fTabs'), '#fTabs is not displayed at 390', 'displayed')
    tabs = c.boxes('#fTabs a')
    c.eq(len(tabs), 5, 'five entries: Préparer, Carte, CR, Vols, Météo', what='entries')
    for t in tabs:
        c.ok(t['h'] >= 43.5, f'entry "{t["text"]}" is {t["h"]:.1f} px high', 'at least 44 px')
    labels = [t['text'] for t in tabs]
    want = [lab[LANG_IX[c.lang]] for _, lab in TABS]
    c.eq(labels, want, 'tab labels translated in the language of the run', what=f'labels ({c.lang})')
    c.eq(c.count('#fTabs a[data-tab="settings"]'), 0, 'Settings is not in the bar (the gear of the header opens it)', what='settings entries in the bar')


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


@case('A7', 'Group popover', 'A', screens=False, rule='frame/INTEGRATION 9.1; V3_SPECIFICATION 7.1 rules 4 and 14')
def a7(c):
    c.open('fuel')
    pop = '.f-tabpop'
    c.tap(_tab(c, 'prepare'))                       # a second tap: the tab is already the active one
    c.until("!!document.querySelector('.f-tabpop')", what='the popover opens on a second tap on Préparer')
    rows = c.boxes('.f-tabpop-row')
    c.eq(len(rows), 2, 'rows Carburant and Fiches', what='popover rows')
    bar = c.box('#fTabs')
    for r in rows:
        c.ok(r['h'] >= 43.5, f'row "{r["text"]}" is {r["h"]:.1f} px high', 'at least 44 px')
        c.ok(r['l'] >= 0 and r['r'] <= c.width and r['t'] >= 0, f'row "{r["text"]}" box {r["l"]:.0f}..{r["r"]:.0f}', 'inside the window')
        c.ok(r['b'] <= bar['t'] + 0.5, f'row bottom {r["b"]:.0f} > bar top {bar["t"]:.0f}', 'above the bar')
    keys = c.js("[...document.querySelectorAll('.f-tabpop-row')].map(r => r.dataset.id + (r.dataset.view ? ':' + r.dataset.view : ''))")
    c.eq(keys, ['fuel', 'fuel:sheets'], 'the rows are the module and its Sheets view', what='row keys')
    c.eq([norm(r['text']) for r in rows], [norm(tx('frame/app.js', 'label', c.lang, after="id: 'fuel'")),
                                           norm(tx('frame/app.js', 'label', c.lang, after="id: 'sheets'"))], 'the rows read Carburant and Fiches in the language of the run', what='row labels')
    cur = c.js("[...document.querySelectorAll('.f-tabpop-row')].filter(r => r.hasAttribute('aria-current')).map(r => r.dataset.id + (r.dataset.view ? ':' + r.dataset.view : ''))")
    c.eq(cur, ['fuel'], 'the current row (fuel, the Quote screen) carries aria-current', what='aria-current rows')
    c.tap('.f-tabpop-row[data-view="sheets"]')
    c.until("location.hash === '#fuel?view=sheets'", what='hash becomes #fuel?view=sheets')
    c.ok(c.count(pop) == 0, 'popover still open after choosing Fiches', 'closed')
    c.until("(document.querySelector('[data-module=\"fuel\"] [data-view=\"sheets\"]') || document.body).getAttribute('aria-pressed') === 'true'",
            what='fuel opens on its Sheets screen')
    c.eq(c.count('#fBack:not([hidden])'), 0, 'a popover choice is a menu choice: no "←"', what='back buttons')
    c.tap(_tab(c, 'prepare'))
    c.until("!!document.querySelector('.f-tabpop')", what='the popover opens again')
    cur = c.js("[...document.querySelectorAll('.f-tabpop-row')].filter(r => r.hasAttribute('aria-current')).map(r => r.dataset.id + (r.dataset.view ? ':' + r.dataset.view : ''))")
    c.eq(cur, ['fuel:sheets'], 'on #fuel?view=sheets the current row is Fiches', what='aria-current rows on the Sheets view')
    c.tap('.f-tabpop-row[data-id="fuel"]:not([data-view])')
    c.until("location.hash === '#fuel'", what='hash goes back to #fuel')
    # Météo is its own tab now: one row, a second tap does nothing
    c.tap(_tab(c, 'weather'))
    c.until("location.hash === '#atmosphere'", what='the Météo tab opens #atmosphere')
    c.eq(c.attr(_tab(c, 'weather'), 'aria-current'), 'page', 'the Météo tab is the selected one on #atmosphere', what='Météo aria-current')
    c.tap(_tab(c, 'weather'))
    c.wait(300)
    c.ok(c.count(pop) == 0, 'a popover opened on the single-entry tab Météo', 'no popover')
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


def open_status(c):
    """Opens Settings by the gear and returns the rows of its Status block: [{k, text, go}]."""
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens #settings')
    c.until("!!document.querySelector('#fView > .f-screen [data-card=\"status\"] .f-status-list > li')", what='the Status block lists its rows')
    return c.js("""[...document.querySelectorAll('[data-card="status"] .f-status-list > li')].map(li => ({ k: li.dataset.k,
        text: (li.innerText || '').replace(/\\s+/g, ' ').trim(), go: (li.querySelector('[data-go]') || { dataset: {} }).dataset.go || '' }))""")


@case('A8', 'Status block at the top of Settings', 'A', screens=False, langs4=True,
      rule='V3_SPECIFICATION 7.1 rule 14: the lines of the former "i" pop-up are the first card of Settings')
def a8(c):
    c.open('fuel', trigram='', pending=1)                       # no trigram (amber line) and a flight to report (green line)
    rows = open_status(c)
    c.eq(c.js("document.querySelector('#fView > .f-screen [data-card]').dataset.card"), 'status', 'the status block is the first card of Settings', what='first card')
    c.eq(norm(c.text('[data-card="status"] h2') or ''), STATUS_TITLE[c.lang], 'the block is titled in the language of the run', what='block title')
    keys = [r['k'] for r in rows]
    for k in ('report', 'who', 'data'):
        c.ok(k in keys, f'rows {keys}', f'a "{k}" row')
    c.ok(keys.index('report') < keys.index('who') < keys.index('data'), f'rows {keys}', 'in the order: report, trigram, data')
    c.ok('help' not in keys and c.count('[data-card="status"] [data-go="help"]') == 0, f'rows {keys}', 'no "Help for this screen" row (the "?" of the header is that)')
    for r in c.boxes('[data-card="status"] .f-status-row'):
        c.ok(r['h'] >= 43.5, f'row "{r["text"][:40]}" is {r["h"]:.1f} px high', 'at least 44 px')
    who = next(r for r in rows if r['k'] == 'who')
    c.eq(norm(who['text']).startswith(norm(tx(FRAME, 'who', c.lang, after='info: {'))), True, 'the trigram line is worded in the language of the run', what=f'row {who["text"]!r}')
    # last action: the data line leads to the card that holds the answer (Usages here: no exchange, no pending write), under the header
    c.tap('[data-card="status"] li[data-k="data"] [data-go]')
    c.until("(() => { const r = document.querySelector('[data-card=\"usages\"]').getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight / 2 })()", what='the data line brings the Usages card to the top of the screen')
    c.eq(c.hash(), '#settings', 'a line that leads to a card keeps the address', what='hash')
    c.tap('[data-card="status"] li[data-k="who"] [data-go]')
    c.until("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.f === 'trigram'", what='the trigram line puts the cursor in the trigram field')
    c.key('Escape')
    c.until("location.hash === '#fuel'", what='Escape returns to #fuel')
    c.ok(c.count('[data-card="status"]') == 0, 'the Status block is still on the page after Escape', 'gone with the screen')


@case('A9', 'Gear badge', 'A', rule='V3_SPECIFICATION 7.1 rule 14: the badge of the former "i" moved to the gear')
def a9(c):
    if not c.phone:
        c.open('fuel', trigram='ABC', pending=1)           # at 1280 no badge logic is required: the page just loads
        return

    def state():
        return c.js("(() => { const b = document.getElementById('fDevice'); const probe = v => { const p = document.createElement('i');"
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


@case('A11', 'Help screen', 'A', langs4=True, rule='help block: the manual of the module, in the language, closable; rule 14: the "?" is in the phone header')
def a11(c):
    c.open('maps')
    c.tap('#fHelp')                                   # the same button on a phone and on a screen (rule 14)
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
    c.tap('#fHelp')
    c.until("location.hash.startsWith('#help')", what='help reopens')
    c.page.go_back()                                  # the browser's back button
    c.until("location.hash === '#maps'", what='the back button returns to #maps')
    # over Settings the "?" asks the chapter of Settings, not the one of the module underneath
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens #settings')
    c.tap('#fHelp')
    c.until("location.hash === '#help?m=settings'", what='"?" over Settings asks the Settings chapter')


@case('A12', 'Settings screen', 'A', rule='settings block')
def a12(c):
    c.open('fuel')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens #settings')
    c.until("!!document.querySelector('#fView > .f-screen input')", what='the settings form is drawn')
    n = c.js("[...document.querySelectorAll('#fView > .f-screen input[type=text]')].filter(i => /ABC/.test(i.placeholder || '')).length")
    c.ok(n >= 1, 'no text field with the trigram placeholder (ABC)', 'a trigram field')
    c.eq(c.attr('#fDevice', 'aria-pressed'), 'true', 'the gear is pressed while the settings are open', what='gear aria-pressed')
    c.eq(c.count('#fView > .f-screen [data-card="status"]'), 1, 'the Status block opens the screen', what='status blocks')
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
    """Text of the row `k` of the Status block of Settings, or None (Settings are opened by the gear, then closed)."""
    c.tap('#fDevice')
    c.until("!!document.querySelector('[data-card=\"status\"] .f-status-row')", what='the Status block of Settings is drawn')
    row = c.js("(k) => { const l = document.querySelector('[data-card=\"status\"] li[data-k=\"' + k + '\"]'); return l ? l.querySelector('.f-status-txt > span').textContent : null }", k)
    c.key('Escape')
    c.until("location.hash.startsWith('#maps')", what='Escape returns to the map')
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
    c.eq(info_row(c, 'base'), norm(tx(FRAME, 'loading', c.lang, after='base: {')), 'the Status block says the same, in the language of the run', what='Status row')
    c.ok(norm(tx(MAPS_M, 'noBase', c.lang)) not in [norm(n) for n in c.note_log()], 'a notification already says "not published"', 'no notification before the read ends')
    c.step('P5', 2, 'the read ends: the note is gone')
    release()
    c.until("![...document.querySelectorAll('.mp-notes > *')].some(e => /(non publi|not published|nicht ver|no publicada|non r.gl|not set|nicht eingerichtet|no configurado|cours de charg|loading|wird geladen|carg.ndose)/i.test(e.textContent))",
            timeout=10000, what='the loading note is replaced by nothing (the base is there)')
    c.eq(info_row(c, 'base'), None, 'a line for the base is still in the Status block', what='Status row after the read')
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
    c.eq(info_row(c, 'base'), norm(tx(FRAME, 'noaccess', c.lang, after='base: {')), 'the Status block says it too', what='Status row')
SLOW = """() => {
  if (window.__slow) return;
  const get = IDBObjectStore.prototype.get, slow = window.__slow = { ms: 0 };
  IDBObjectStore.prototype.get = function (key) {
    const q = get.call(this, key);
    if (!slow.ms || !/^(pilot|cache)\\//.test(String(key))) return q;
    const ms = slow.ms, late = { get result() { return q.result }, get error() { return q.error } };
    q.onsuccess = () => setTimeout(() => late.onsuccess && late.onsuccess({ target: late }), ms);
    q.onerror = () => setTimeout(() => late.onerror && late.onerror({ target: late }), ms);
    return late;
  };
}"""


@case('A16', 'One module in the view', 'A', screens=False, designs=('standard',), night=False,
      rule='frame/INTEGRATION 2: the frame never mounts two modules in the view; a navigation that arrives during a mount cancels it (frame/DECISIONS, 24 Oct 2026, relais cloud)')
def a16(c):
    c.open('atmosphere', flight=True)
    c.js(SLOW)
    # three changes of address in one task, modules not yet loaded (import) and cache reads that come back late (mount)
    c.js("() => { window.__slow.ms = 700; location.hash = '#fuel'; location.hash = '#flightlog'; location.hash = '#maps' }")
    c.wait(3500)                                       # the abandoned imports and mounts come back while the last is on screen
    c.js("() => { window.__slow.ms = 0 }")
    shown = c.js("""() => ({ view: [...document.querySelectorAll('#fView section[data-module]')].map(e => e.dataset.module),
        all: [...document.querySelectorAll('[data-module]')].map(e => e.dataset.module), overlays: document.querySelectorAll('.f-overlay').length,
        sheets: document.querySelectorAll('.f-sheet-panel').length, hash: location.hash })""")
    c.eq(shown['view'], ['maps'], 'three addresses in one task: the view holds the section of the last one only', what='section[data-module] in #fView')
    c.eq(shown['all'], ['maps'], 'no other module is anywhere in the page', what='[data-module] in the page')
    c.eq(shown['overlays'], 1, 'one overlay layer, the one of the live section', what='.f-overlay')
    c.eq(shown['sheets'], 1, 'one sheet, the one of the live section', what='.f-sheet-panel')
    c.eq(shown['hash'], '#maps', 'the address is the last one asked', what='hash')
    c.ready('maps', sheet=True)
    c.ok(c.js(MAP_JS, 'maps') is not None, 'no map box', 'the module of the last address is mounted and its map is drawn')
    # one address per task (each route() starts before the previous mount ended), three different modules, still reading slowly
    c.js("""() => { window.__slow.ms = 700; const next = ['#flightlog', '#atmosphere'];
        location.hash = '#fuel'; const go = () => { const h = next.shift(); if (h) { location.hash = h; setTimeout(go, 0) } }; setTimeout(go, 0) }""")
    c.wait(3500)
    c.js("() => { window.__slow.ms = 0 }")
    c.eq(c.js("() => [...document.querySelectorAll('#fView section[data-module]')].map(e => e.dataset.module)"), ['atmosphere'], 'then one address per task: the view holds the last module only', what='section[data-module] after #fuel, #flightlog, #atmosphere')
    c.eq(c.js("() => document.querySelectorAll('.f-overlay').length"), 1, 'one overlay layer again', what='.f-overlay')
    c.ready('atmosphere')


LAND = (844, 390)           # an iPhone in landscape (CSS pixels); the frame's `html.f-land` is "wider than high and under 1024"
PORTRAIT = (390, 844)


def _land_open(c, m):
    c.page.set_viewport_size({'width': LAND[0], 'height': LAND[1]})
    c.open(m, flight=True)
    c.until("document.documentElement.classList.contains('f-land')", what='html gets f-land at 844 x 390')
    c.settle()


@case('A14', 'Landscape on a phone', 'A', screens=False, night=False, rule='V3_SPECIFICATION 7.1 rule 7; frame/INTEGRATION 9.1-9.4, 11')
def a14(c):
    W, H = LAND
    head_h, rail_w = 57, 44
    for m in ('maps', 'atmosphere'):
        _land_open(c, m)
        # the header stays, the bar is a rail on the left (five icons, no label, a name for each), the rail of 210 px is gone
        head, rail = c.box('.f-head'), c.box('#fTabs')
        c.eq(head['h'], head_h, 'the header stays at --f-head-h = 57 px', tol=0.5, what=f'#{m} header height')
        c.ok(rail and rail['shown'], f'#{m}: #fTabs is not displayed in landscape', 'the rail is displayed')
        c.eq(round(rail['l']), 0, 'the rail is at the left edge', tol=1, what=f'#{m} rail left')
        c.eq(round(rail['w']), rail_w, 'the rail is --f-rail-w = 44 px wide', tol=1, what=f'#{m} rail width')
        c.eq(round(rail['t']), head_h, 'the rail starts under the header', tol=1, what=f'#{m} rail top')
        c.eq(round(rail['h']), H - head_h, 'the rail takes the full height under the header', tol=1, what=f'#{m} rail height')
        c.ok(not c.shown('#fNav'), f'#{m}: the 210 px rail #fNav is displayed in landscape', 'hidden (the bar became the rail)')
        entries = c.boxes('#fTabs a')
        c.eq(len(entries), 5, 'five entries in the rail', what=f'#{m} rail entries')
        c.eq(c.js("[...document.querySelectorAll('#fTabs a')].map(a => a.dataset.tab)"), ['prepare', 'maps', 'report', 'flightlog', 'weather'],
             'the rail has the bar\'s entries, Météo last and no Settings', what=f'#{m} rail tabs')
        c.eq(c.js("[...document.querySelectorAll('#fTabs a[aria-current=page]')].map(a => a.dataset.tab)"), ['maps' if m == 'maps' else 'weather'],
             'the entry of the module shown is the selected one', what=f'#{m} selected rail entry')
        for e in entries:
            c.ok(e['shown'] and e['h'] >= 43.5 and e['w'] >= 43.5, f'#{m}: a rail entry is {e["w"]:.0f} x {e["h"]:.0f}', 'at least 44 x 44')
        c.ok(not any(b['shown'] for b in c.boxes('.f-tab-lbl')), f'#{m}: a rail label is displayed', 'icons only')
        names = c.js("[...document.querySelectorAll('#fTabs a')].map(a => a.getAttribute('aria-label') || '')")
        c.ok(all(names), f'#{m}: rail entries without aria-label: {names}', 'every entry has its label as aria-label')
        c.eq(c.px('--f-tab-space'), 0, '--f-tab-space is 0 in landscape', tol=0.5, what='--f-tab-space')
        c.eq(c.px('--f-view-h'), H - head_h, '--f-view-h = window - header', tol=0.5, what='--f-view-h')
        # the view is right of the rail; the sheet is a column at the right of the map, full height; the map takes the rest
        view, root = c.box('#fView'), c.box(f'[data-module="{m}"]')
        c.eq(round(view['l']), rail_w, 'the view starts at the right of the rail', tol=1, what=f'#{m} view left')
        c.eq(round(view['w']), W - rail_w, 'the view is calc(100vw - 44 px) wide', tol=1, what=f'#{m} view width')
        c.eq(round(root['h']), H - head_h, 'the module root fills the view height', tol=1, what=f'#{m} root height')
        mp, panel, head_row = c.js(MAP_JS, m), c.box('.f-sheet-panel'), c.box('.f-sheet-head')
        c.eq(round(mp['t']), head_h, 'the map starts under the header', tol=1, what=f'#{m} map top')
        c.eq(round(mp['l']), rail_w, 'the map starts right of the rail', tol=1, what=f'#{m} map left')
        c.eq(round(mp['h']), H - head_h, 'the map has the full view height (333 px)', tol=1, what=f'#{m} map height')
        c.ge(panel['w'], 279.5, 'the column is at least --f-sheet-side-min = 280 px', what=f'#{m} column width')
        c.eq(round(panel['w']), round((W - rail_w) * .4), 'the column is --f-sheet-side = 40 % of the view', tol=1, what=f'#{m} column width')
        c.eq(round(panel['h']), H - head_h, 'the column is as high as the view', tol=1, what=f'#{m} column height')
        c.eq(round(panel['t']), head_h, 'the column starts under the header', tol=1, what=f'#{m} column top')
        c.eq(round(panel['r']), W, 'the column is at the right edge', tol=1, what=f'#{m} column right')
        c.eq(round(mp['w']), W - rail_w - round(panel['w']), 'the map takes the width the column leaves', tol=1, what=f'#{m} map width')
        c.eq(round(head_row['t']), round(panel['t']), 'the handle line is at the top of the column', tol=1, what=f'#{m} handle top')
        inner = c.js("""() => { const p = document.querySelector('.f-sheet-panel'), r = p.getBoundingClientRect();
          return [...p.children].filter(e => !e.classList.contains('f-sheet-head') && window.__t.shown(e))
            .map(e => { const b = e.getBoundingClientRect(); return { h: b.height, bottom: b.bottom - r.bottom, oy: getComputedStyle(e).overflowY } }) }""")
        c.ok(inner and max(e['h'] for e in inner) > 100, f'#{m}: the column content {inner}', 'a content area, as high as the column allows')
        c.ok(all(e['bottom'] <= 1 for e in inner), f'#{m}: the column content leaves the column by {max(e["bottom"] for e in inner):.0f} px', 'content inside the column (it scrolls there)')
        sw, iw = hscroll(c)
        c.ok(sw <= iw, f'#{m}: horizontal page scroll {sw} > {iw}', 'none')
        c.ok(c.js('document.scrollingElement.scrollHeight') <= H, f'#{m}: the page scrolls vertically', 'no page scroll')
        # the overlay columns stay on the map and never double up at this height
        ov, right = c.box('.f-overlay'), [b for b in c.boxes('.f-ov-right .f-ov-btn') if b['shown']]
        c.ok(ov and ov['r'] <= panel['l'] + 1, f'#{m}: the layer reaches {ov["r"]:.0f}, the column starts at {panel["l"]:.0f}', 'the layer is the map, never over the column')
        c.ok(len(right) >= 3, f'#{m}: {len(right)} buttons in the right column', 'the right column has its buttons')
        c.eq(len({round(b['l']) for b in right}), 1, 'the right buttons share one x (one column, not two)', what=f'#{m} right column x positions')
        c.eq(len(c.boxes('.f-ov-exit')), 0, 'there is no exit chip', what=f'#{m} .f-ov-exit elements')
        # a tap on the handle: expanded to 60 %, and back
        c.tap('.f-sheet-grip')
        c.until("document.querySelector('.f-sheet').dataset.sheet === 'expanded'", what='a tap on the handle expands the column')
        c.settle()
        big = c.box('.f-sheet-panel')
        c.eq(round(big['w']), round((W - rail_w) * .6), 'the expanded column is --f-sheet-side-max = 60 %', tol=1, what=f'#{m} expanded width')
        c.eq(round(c.js(MAP_JS, m)['w']), W - rail_w - round(big['w']), 'the map shrinks to what the column leaves', tol=1, what=f'#{m} map width expanded')
        c.tap('.f-sheet-grip')
        c.until("document.querySelector('.f-sheet').dataset.sheet === 'default'", what='a second tap brings the column back')
        c.settle()
        c.eq(round(c.box('.f-sheet-panel')['w']), round(panel['w']), 'the column is back at its default width', tol=1, what=f'#{m} default width')
        # full screen: header and rail hidden, the column stays, the map takes the rest
        c.tap('.f-ov-full')
        c.until("document.documentElement.classList.contains('f-full')", what='html gets f-full')
        c.settle()
        c.ok(not c.shown('.f-head'), f'#{m}: the header is displayed in full screen', 'hidden')
        c.ok(not c.shown('#fTabs'), f'#{m}: the rail is displayed in full screen', 'hidden')
        root, panel, mp = c.box(f'[data-module="{m}"]'), c.box('.f-sheet-panel'), c.js(MAP_JS, m)
        c.eq((round(root['l']), round(root['t']), round(root['w']), round(root['h'])), (0, 0, W, H), 'the module fills the window', what=f'#{m} root in full screen')
        c.ok(panel['shown'] and round(panel['h']) == H, f'#{m}: column {panel["w"]:.0f} x {panel["h"]:.0f}', 'the column stays, full height')
        c.eq((round(mp['l']), round(mp['t']), round(mp['h'])), (0, 0, H), 'the map takes all the rest', what=f'#{m} map in full screen')
        c.eq(len(c.boxes('.f-ov-exit')), 0, 'there is no exit chip in full screen', what=f'#{m} .f-ov-exit elements')
        c.key('Escape')
        c.until("!document.documentElement.classList.contains('f-full')", what='Escape leaves the full screen')
    # the phone turns back: the bar is at the bottom again, the sheet under the map
    c.page.set_viewport_size({'width': PORTRAIT[0], 'height': PORTRAIT[1]})
    c.until("!document.documentElement.classList.contains('f-land')", what='f-land is removed in portrait')
    c.settle()
    bar, panel = c.box('#fTabs'), c.box('.f-sheet-panel')
    c.eq(round(bar['b']), PORTRAIT[1], 'the bar is at the bottom of the window in portrait', tol=1, what='bar bottom')
    c.eq(round(bar['w']), PORTRAIT[0], 'the bar spans the window in portrait', tol=1, what='bar width')
    c.eq(round(panel['w']), PORTRAIT[0], 'the sheet is under the map, full width, in portrait', tol=1, what='sheet width')
