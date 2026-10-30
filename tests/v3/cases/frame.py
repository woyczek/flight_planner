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

  * one module in the view: navigations that arrive during a mount cancel it, the last address wins (A16);
  * the device's keys (trigram, GitHub token, weather key) survive a relaunch of the browser, even when it clears
    localStorage and keeps IndexedDB, as Safari did on 25 Oct 2026 (A19);
  * non-fixed modules on a phone (rule 16): the module's title is in the header (A2), the "?" lands on the paragraph of the
    step shown and highlights it once (A17), the "How to use" card is dismissed once and for good, with a way back (A18);
  * the data sources (#sources, aerodb; it replaced the data laboratory on 28 Oct 2026): behind Administration at the Full level
    only, one line per source with a real link (44 px, a new tab), its status, its licence and the cycle in force; the screen
    fetches nothing (A20).

  * the weather layer (frame/lib/weather_store.js, INTEGRATION 14): its bench passes (A25);
  * a store script lost on the way: asked again once, the frame starts; lost for good, the page says why with a Reload button (A28);
  * the frame's launcher and publication services: their benches pass (A29, A30); the end-of-cycle line of the Status block, ×4 (A31).

  * the launcher's keys panel gives the EAD Basic user name and password once, and never reads them back (A32).
  * the IVAO application assistant (Settings, Administration group): the steps at IVAO, the return addresses with a Copy button each, the
    Client ID and Secret given once to the launcher and never read back, Test, Erase, the card alone by its address (A43).
  * the data repository's provider is read from its address (`SogConfig.providerOf`), never a setting: the remote panel names it and
    proposes what fits (GitLab: the pilots' tokens; GitHub: a GitLab project), the exported configuration carries it, the pilot's Access
    card follows it (A49).

Cases: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15 A16 A17 A18 A19 A20 A25 A26 A27 A28 A29 A30 A31 A32 A33 A34 A43 A48 A49.
"""
import json
import re
import urllib.parse

from lib import MAP_JS, ROOT, Fail, Skip, case, forget, norm, tx

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
MODULE_TITLES = {  # meta.title of the non-fixed modules, fr en de es (rule 16)
    'fuel': ('Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel'),
    'report': ('Compte rendu', 'Mission report', 'Einsatzbericht', 'Informe de misión'),
    'flightlog': ('Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'),
}


def hscroll(c):
    return c.js('[document.documentElement.scrollWidth, window.innerWidth]')


# A module drawn and settled: its root holds text and that text has not changed for `quiet` ms (a module may empty its box
# before drawing it again — the report does — so « some text once » is not enough under load); then one reading of the root
# (shown, height, text length) in the same evaluation. Gives the last reading on timeout, never raises.
_DRAWN_JS = """([m, quiet, timeout]) => new Promise(res => {
  const read = () => { const e = document.querySelector('[data-module="' + m + '"]'), r = e && e.getBoundingClientRect();
    return { text: e ? (e.innerText || '').trim().length : 0, h: r ? r.height : 0, shown: !!e && !!(e.offsetParent || e.getClientRects().length) } };
  let last = read(), since = performance.now();
  const t0 = since, tick = () => { const now = read();
    if (now.text !== last.text || now.text === 0) { last = now; since = performance.now() }
    if (now.text > 0 && performance.now() - since >= quiet) return res({ ...now, settled: true });
    if (performance.now() - t0 >= timeout) return res({ ...now, settled: false });
    setTimeout(tick, 50) };
  tick() })"""


@case('A1', 'Every module loads', 'A', tags=('smoke',), night=False,
      rule='smoke; V3_SPECIFICATION 7.1 rule 1 (no horizontal scroll)')
def a1(c):
    for m in MODULES:
        c.open(m)
        got = c.page.evaluate(_DRAWN_JS, [m, 400, 20000])
        c.ok(got['settled'], f'#{m}: {got}', f'#{m} draws its content and settles (text unchanged for 400 ms)')
        sw, iw = hscroll(c)
        design = c.js('document.documentElement.dataset.design')
        c.eq(design, c.design, rule='the design asked is the one applied', what=f'#{m} dataset.design')
        c.ok(got['shown'] and got['h'] > 0 and got['text'] > 0, f'#{m}: module root empty or absent ({got})', 'a non-empty module root')
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
    # the name is the application switcher's button (#fApp: its icon and #fName, SPEC 3.1, 30 Oct 2026)
    c.eq(sorted(shown), sorted(['fApp', 'fHelp', 'fDevice']), 'exactly the name, "?" and gear are displayed', what='displayed header controls')
    c.ok(c.shown('#fName'), '', 'the name is shown inside its button')
    for i in ('fSync', 'fWho', 'fLive', 'fHost'):
        c.ok(not c.shown('#' + i), f'#{i} is displayed', 'not displayed on a phone')
    c.eq(c.count('#fInfo'), 0, 'the "i" button no longer exists (its lines are the status block of Settings)', what='#fInfo elements')
    for i in ('fHelp', 'fDevice'):
        b = c.box('#' + i)
        c.ok(b['w'] >= 43.5 and b['h'] >= 43.5, f'#{i} is {b["w"]:.0f}x{b["h"]:.0f}', 'at least 44x44')
    # rule 16: a fixed module keeps the application's name; a non-fixed one puts its own title in the header and its page loses
    # the big title row (the h1 stays for screen readers, 1 px clipped)
    app = c.text('#fName')
    c.ok(app and app not in MODULE_TITLES['fuel'], f'the header of #maps says {app!r}', 'the name of the application')
    for m in ('fuel', 'report', 'flightlog'):
        c.open(m)
        c.eq(c.text('#fName'), c.pick(dict(zip(('fr', 'en', 'de', 'es'), MODULE_TITLES[m]))), 'the header carries the title of the module', what=f'#{m} header name')
        h1 = c.box(f'[data-module="{m}"] h1')
        c.ok(h1 and h1['w'] <= 1.5 and h1['h'] <= 1.5, f'#{m}: the h1 is {h1 and h1["w"]:.0f}x{h1 and h1["h"]:.0f}', 'clipped to 1 px (kept for screen readers)')
        c.eq(h1['text'], c.pick(dict(zip(('fr', 'en', 'de', 'es'), MODULE_TITLES[m]))), 'the h1 text is still the title', what=f'#{m} h1')
        c.ok(c.js('document.documentElement.classList.contains("f-titled")'), 'html has no f-titled', 'html.f-titled')
    c.tap('#fDevice')                                      # a screen of the frame over a module: the name of the application
    c.until("location.hash === '#settings'", what='the gear opens Settings')
    c.eq(c.text('#fName'), app, 'over Settings the header says the name of the application again', what='#fName over Settings')


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
    # last action: the data line leads to the card that holds the answer (Usages here: no exchange, no pending write), under the header;
    # at the Everyday level that card sits in the folded "Data" group, which the line opens first (SPEC § 1)
    c.eq(c.js("!!document.querySelector('[data-card=\"status\"]').closest('details')"), False, 'the status block is outside the groups', what='status in a group')
    # the Data group may be open by itself (attention: no bases in the suite): folded here so that the tap has to open it
    c.js("document.querySelector('[data-card=\"usages\"]').closest('details.f-group').open = false")
    c.tap('[data-card="status"] li[data-k="data"] [data-go]')
    c.until("document.querySelector('[data-card=\"usages\"]').closest('details.f-group').open", what='the data line opens the group of its card')
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


ADMIN_FR = {   # Settings > Administration at the Full level, French (the run's language): one button per administrator page
    'tune': 'Réglage des seuils de la carte', 'edge': 'Limite de la zone du vol', 'runwayZoom': 'Seuils de piste sur la carte',
    'roadmap': 'Feuille de route', 'diag': 'Diagnostic',
}


@case('A12', 'Settings screen', 'A', rule='settings block; V3_SPECIFICATION 7.1 rule 18 (administration behind one button)')
def a12(c):
    c.open('fuel')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens #settings')
    c.until("!!document.querySelector('#fView > .f-screen input')", what='the settings form is drawn')
    n = c.js("[...document.querySelectorAll('#fView > .f-screen input[type=text]')].filter(i => /ABC/.test(i.placeholder || '')).length")
    c.ok(n >= 1, 'no text field with the trigram placeholder (ABC)', 'a trigram field')
    c.eq(c.attr('#fDevice', 'aria-pressed'), 'true', 'the gear is pressed while the settings are open', what='gear aria-pressed')
    c.eq(c.count('#fView > .f-screen [data-card="status"]'), 1, 'the Status block opens the screen', what='status blocks')
    c.eq(c.count('[data-card="admin"]'), 0, 'rule 18: the Administration card is for the Full level only', what='Administration cards at the Everyday level')
    c.eq(c.count('[data-admin], [data-adminpanel], a[href="#maps?tune=1"]'), 0, 'rule 18: nothing of the administrator\'s on the ordinary cards', what='administrator controls at the Everyday level')
    # SPEC § 1 at the Everyday level: the cards under seven titles at most, in the order of the path, the status block outside
    groups = c.js("[...document.querySelectorAll('#fView > .f-screen > details.f-group')].map(g => g.dataset.group)")
    order = ['identity', 'access', 'data', 'device', 'display', 'admin', 'help']
    c.ok(1 <= len(groups) <= 7, f'groups {groups}', 'between one and seven groups')
    c.eq(groups, [g for g in order if g in groups], 'the groups follow the order of the path', what='group order')
    c.eq(c.js("[...document.querySelectorAll('#fView > .f-screen > [data-card]')].map(k => k.dataset.card)"), ['status'], 'only the status block is outside the groups (no card of circumstance here)', what='cards outside groups')
    c.ok(c.js("[...document.querySelectorAll('details.f-group')].every(g => g.open === !g.querySelector(':scope > summary > .f-status-dot').hidden)"),
         'a group is open exactly when its title carries the attention dot', 'folded unless it needs attention')
    c.eq(c.js("document.querySelector('[data-card=\"identity\"]').closest('details.f-group').dataset.group"), 'identity', 'Identity is in its group', what='identity group')
    sw, iw = hscroll(c)
    c.le(sw, iw, 'no horizontal scroll on a phone with the groups', what='page width, Everyday')
    c.tap('#fDevice')                                  # the control that opened the screen closes it
    c.until("location.hash === '#fuel'", what='the gear again returns to the previous module (#fuel)')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='settings reopen')
    c.key('Escape')
    c.until("location.hash === '#fuel'", what='Escape returns to the previous module (#fuel)')
    # SPEC § 1 at the Discovery level: no groups, seven cards at most, flat, in the order of the path
    c.open('settings', docs=[['device/level.json', {'level': 1}, 'cache']])
    c.until("!!document.querySelector('[data-card=\"identity\"]')", what='settings drawn at the Discovery level')
    # opened directly (no module mounted) the screen is drawn in #fView itself: the root is the Identity card's parent
    flat = c.js("[...document.querySelector('[data-card=\"identity\"]').parentElement.children].filter(k => k.dataset.card && k.dataset.card !== 'status').map(k => k.dataset.card)")
    c.eq(c.count('details.f-group'), 0, 'no groups at the Discovery level', what='groups at Discovery')
    c.ok(len([k for k in flat if not c.js("(k) => document.querySelector('[data-card=\"' + k + '\"]').hidden", k)]) <= 7, f'cards {flat}', 'seven visible cards at most at Discovery')
    c.eq([k for k in flat if k in ('backup', 'offline', 'wx', 'lan', 'lnmperf', 'admin')], [], 'backup, offline data, weather key, computer access, Little Navmap start at Everyday', what='cards above Discovery')
    c.eq([k for k in flat if k in ('identity', 'access', 'usages', 'level', 'design', 'about')], ['identity', 'access', 'usages', 'level', 'design', 'about'], 'the Discovery cards in the order of the path', what='Discovery order')
    # rule 18 at the Full level: one card, one button per administrator page; the airline's thresholds file already holds a mode
    profiles = {'schema': 1, 'updated_at': '2026-10-23T18:00:00Z', 'by': 'maps', 'profiles': {'vfr': {'elements': {'zoom': {'vrp': [9.25, 24]}}}}}
    c.open('settings', docs=[['device/level.json', {'level': 3}, 'cache'], ['airline/map_profiles.json', profiles, 'document']])
    c.until("!!document.querySelector('[data-card=\"admin\"]')", what='the Administration card is drawn at the Full level')
    c.eq(c.count('[data-card="admin"]'), 1, 'one Administration card', what='cards')
    c.eq(c.js("document.querySelector('[data-card=\"admin\"]').closest('details.f-group')?.dataset.group"), 'admin', 'the card sits in the Administration group', what='admin group')
    if not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    c.until("document.querySelector('[data-group=\"admin\"]').open", what='the Administration group opens on its title')
    ids = c.js("[...document.querySelectorAll('[data-card=\"admin\"] li[data-admin]')].map(li => li.dataset.admin)")
    for k in ADMIN_FR:
        c.ok(k in ids, f'entries {ids}', f'an entry "{k}"')
    c.ok(not any(k in ids for k in ('maintenance', 'firstLaunch', 'mapStudio', 'cfg', 'remote', 'keys')), f'entries {ids}',
         'no V2 page nor launcher setting without a launcher, no export without an access to export')
    for k, label in ADMIN_FR.items():
        btn = c.js("(k) => { const e = document.querySelector('[data-card=\"admin\"] li[data-admin=\"' + k + '\"]').firstElementChild; "
                   "return { tag: e.tagName, cls: e.className, text: e.textContent.trim(), h: e.getBoundingClientRect().height } }", k)
        c.ok(btn['tag'] in ('BUTTON', 'A') and 'f-btn' in btn['cls'], f'{k}: {btn}', f'the first thing of the "{k}" line is a button')
        c.eq(norm(btn['text']), norm(label), f'the "{k}" button is worded in the language of the run', what=f'{k} button')
        c.ge(btn['h'], 43.5, 'touch target of the frame', what=f'{k} button height')
    c.eq(c.attr('[data-admin="tune"] > a', 'href'), '#maps?tune=1', 'the thresholds button opens the tuning page of the map', what='tune href')
    c.eq(c.count('[data-card]:not([data-card="admin"]) a[href="#maps?tune=1"]'), 0, 'rule 18: the thresholds button is on no other card', what='tune links elsewhere')
    c.ok(c.js("[...document.querySelectorAll('[data-card=\"admin\"] li[data-admin]')].filter(li => ['primitives', 'aerodbBench'].includes(li.dataset.admin)).every(li => li.firstElementChild.disabled)"),
         'a bench button is active without a launcher', 'benches are greyed without a launcher')
    sw, iw = hscroll(c)
    c.le(sw, iw, 'no horizontal scroll on a phone', what='page width')
    # the flight zone limit: a panel under its button, shown by default, saved with the thresholds under the key `edge`
    c.ok(not c.shown('[data-adminpanel="edge"]'), 'the panel is open before the tap', 'the panel opens on its button')
    c.tap('[data-admin="edge"] > button')
    c.until("window.__t.shown(document.querySelector('[data-adminpanel=\"edge\"]'))", what='the flight zone limit panel opens')
    c.eq(c.attr('[data-admin="edge"] > button', 'aria-expanded'), 'true', 'the button says the panel is open', what='aria-expanded')
    c.eq(c.js("document.querySelector('[data-edge]').checked"), True, 'the edge line is shown by default (no `edge` key in the file)', what='edge box')
    c.tap('[data-edge]')
    d = c.until_doc('airline/map_profiles.json', lambda d: d and (d.get('edge') or {}).get('show') is False, what='edge.show is false (hidden)')
    c.eq(d.get('profiles'), profiles['profiles'], 'saving the edge option leaves the thresholds of the file as they were', what='profiles')
    c.eq(d.get('schema'), 1, 'the file keeps its schema', what='schema')
    c.tap('[data-edge]')
    c.until_doc('airline/map_profiles.json', lambda d: d and (d.get('edge') or {}).get('show') is True, what='edge.show is true again (shown)')
    c.tap('[data-admin="edge"] > button')
    c.until("!window.__t.shown(document.querySelector('[data-adminpanel=\"edge\"]'))", what='a second tap folds the panel')
    # the runway thresholds zoom (V3 § 10.30, maps.runwayZoom): a list 8–16, 11 by default, saved at once under `runwayZoom`
    c.tap('[data-admin="runwayZoom"] > button')
    c.until("window.__t.shown(document.querySelector('[data-adminpanel=\"runway\"]'))", what='the runway thresholds panel opens')
    opts = c.js("[...document.querySelectorAll('[data-runway-zoom] option')].map(o => +o.value)")
    c.eq([opts[0], opts[-1], len(opts)], [8, 16, 9], 'the zoom is chosen from 8 to 16', what='zoom options')
    c.eq(c.js("+document.querySelector('[data-runway-zoom]').value"), 11, 'no `runwayZoom` in the file: 11', what='default zoom')
    c.js("() => { const s = document.querySelector('[data-runway-zoom]'); s.value = '13'; s.dispatchEvent(new Event('change', { bubbles: true })) }")
    d = c.until_doc('airline/map_profiles.json', lambda d: d and d.get('runwayZoom') == 13, what='runwayZoom is 13')
    c.eq([d.get('profiles'), (d.get('edge') or {}).get('show')], [profiles['profiles'], True], 'saving the zoom keeps the thresholds and the edge option', what='rest of the file')


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
MAPS_M = 'modules/maps/texts.js'
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
    # the access lives in device/keys.json (taken over from localStorage at the first launch): cutting it is forgetting that file
    forget(c.page, [p for p, _, _ in aero_docs()] + ['device/keys.json'], base=c.base)
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


@case('A19', 'Keys survive a relaunch', 'A', screens=False, designs=('standard',), night=False,
      rule='V3_SPECIFICATION 7.1 rule 18 / 10.16: the GitHub token and the weather key persist like the identity (frame/settings/DECISIONS.md, 25 Oct 2026, relais cloud)')
def a19(c):
    """The trigram, the GitHub access and the weather key are set from Settings; the browser is closed with its storage kept and
    reopened: the three are there. Then again after a relaunch that lost localStorage and kept IndexedDB, which is what Safari
    did on 25 Oct 2026 (the token and the key, which lived in localStorage, were gone while the trigram, in IndexedDB, stayed).
    A persistent Chromium context stands for the browser that is closed and opened again."""
    import shutil
    import tempfile
    from lib import CHROME, _W
    home = tempfile.mkdtemp(prefix='a19-')
    errors = []

    def launch():
        kw = dict(viewport={'width': 390, 'height': 844}, locale='fr-FR', args=['--no-sandbox'])
        if CHROME:
            kw['executable_path'] = CHROME
        ctx = _W['pw'].chromium.launch_persistent_context(home, **kw)
        ctx.route(re.compile(r'^https?://(?!127\.0\.0\.1|localhost)'), lambda route: route.abort('blockedbyclient'))
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.set_default_timeout(15000)
        page.on('pageerror', lambda e: errors.append(str(e)[:200]))
        return ctx, page

    def settings(page):
        page.goto(f'{c.base}/frame/index.html#settings', wait_until='load')
        page.wait_for_selector('[data-card="access"] [data-f="repo"]', state='attached')
        page.evaluate("document.querySelectorAll('details.f-group').forEach(d => d.open = true)")   # cards in folded groups (SPEC 1)
        page.wait_for_selector('[data-card="access"] [data-f="repo"]')
        page.wait_for_selector('[data-card="wx"]')
        page.wait_for_timeout(600)               # the device files are read: the cards are drawn from them

    def state(page):
        return page.evaluate("""() => ({
          trigram: document.querySelector('[data-f="trigram"]').value,
          token: !!document.querySelector('[data-card="access"] [data-act="cut"]'),
          repo: document.querySelector('[data-card="access"] [data-f="repo"]').value,
          weather: !document.querySelector('[data-card="wx"] [data-act="wxTest"]').disabled })""")

    want = {'trigram': 'ABC', 'token': True, 'repo': 'sog/data', 'weather': True}
    try:
        c.step('A19', 1, 'set the trigram, the GitHub access and the weather key from Settings')
        ctx, page = launch()
        settings(page)
        page.fill('[data-f="trigram"]', 'abc')
        page.locator('[data-act="identity"]').click()
        page.wait_for_timeout(500)
        page.fill('[data-card="access"] [data-f="repo"]', 'sog/data')
        page.fill('[data-card="access"] [data-f="token"]', 'ghp_relaunch')
        page.locator('[data-card="access"] [data-act="access"]').click()
        page.wait_for_selector('[data-card="access"] [data-act="cut"]')
        page.fill('[data-card="wx"] [data-f="wxKey"]', 'avwx_relaunch')
        page.locator('[data-card="wx"] [data-act="wxSave"]').click()
        page.wait_for_function("!document.querySelector('[data-card=\"wx\"] [data-act=\"wxTest\"]').disabled")
        page.wait_for_timeout(600)               # the writes to the device are done
        c.eq(state(page), want, 'the three settings are in the cards that set them', what='state before closing')
        ctx.close()

        c.step('A19', 2, 'the browser is closed and opened again, its storage kept')
        ctx, page = launch()
        settings(page)
        c.eq(state(page), want, 'the trigram, the token and the weather key are gone after a relaunch', what='state after a relaunch')
        ctx.close()

        c.step('A19', 3, 'the relaunch lost localStorage and kept IndexedDB (Safari, 25 Oct 2026)')
        ctx, page = launch()
        page.goto(f'{c.base}/frame/manifest.webmanifest')
        page.evaluate('localStorage.clear(); sessionStorage.clear()')
        ctx.close()
        ctx, page = launch()
        settings(page)
        c.eq(state(page), want, 'the token and the weather key follow localStorage, not the identity', what='state after a relaunch without localStorage')
        # the keys are in the device file, never in a backup of the device
        dump = page.evaluate("FrameData.dump().then(d => d.text)")
        c.ok('ghp_relaunch' not in dump and 'avwx_relaunch' not in dump and 'device/keys.json' not in dump,
             'the backup of the device holds the token or the weather key', 'neither the token nor the key is in a backup (invariant 1 of frame/settings/SPEC.md)')
        ctx.close()
    finally:
        shutil.rmtree(home, ignore_errors=True)
    c.ok(not errors, errors[:1], 'no JavaScript error in the relaunched browsers')


@case('A17', 'Help lands on the right paragraph', 'A', screens=False, langs4=True, designs=('standard',), night=False,
      rule='V3_SPECIFICATION 7.1 rule 16 (user, 25 Oct: "bien vérifier que l\'aide contextuelle arrive sur le bon paragraphe")')
def a17(c):
    # (module, button of the step to show, anchor the "?" must ask)
    for m, step, anchor in (('fuel', '.fu-steps button[data-step="2"]', 'fuel-step-3'), ('report', '.f-steps button[data-step="1"]', 'report-step-2'),
                            ('flightlog', None, 'flightlog-list')):
        c.open(m, flight=True, flights=3, reports=2)
        if step:
            c.tap(step)
        c.tap('#fHelp')
        c.until("location.hash.startsWith('#help')", what='the help screen opens')
        c.eq(c.hash(), f'#help?m={m}&a={anchor}', 'the "?" asks the chapter at the paragraph of the screen shown', what=f'#{m} help address')
        c.until("(a) => !!document.querySelector('.f-screen [id=\"' + a + '\"]')", anchor, timeout=8000, what=f'the anchor {anchor} is in the manual')
        c.until("(a) => document.querySelector('.f-screen [id=\"' + a + '\"]').closest('p, li, h1, h2, h3').classList.contains('f-hl')", anchor,
                what='the paragraph is highlighted on arrival')
        c.settle()
        r = c.js("""(a) => { const n = document.querySelector('.f-screen [id="' + a + '"]').closest('p, li, h1, h2, h3'), r = n.getBoundingClientRect();
            return { top: r.top, head: document.querySelector('.f-head').getBoundingClientRect().bottom, vh: innerHeight } }""", anchor)
        c.ok(r['head'] - 2 <= r['top'] < r['vh'] - 40, f'#{m}: the paragraph starts at {r["top"]:.0f} (header bottom {r["head"]:.0f}, window {r["vh"]})',
             'inside the window, under the header')
        c.until("!document.querySelector('.f-screen .f-hl')", timeout=4000, what='the highlight goes after 1.5 s')
        c.key('Escape')
        c.until(f"location.hash === '#{m}'", what=f'Escape returns to #{m}')
    # an anchor the chapter does not have falls back on the start of the chapter, without highlight
    c.go('help?m=fuel&a=nope')
    c.until("!!document.querySelector('[data-chapter=\"fuel\"]')", timeout=8000, what='the chapter is drawn')
    c.wait(300)
    c.eq(c.count('.f-hl'), 0, 'an unknown anchor highlights nothing', what='.f-hl elements')
    # a plain chapter request (no anchor) does not highlight either
    c.go('help?m=report')
    c.until("!!document.querySelector('[data-chapter=\"report\"]')", timeout=8000, what='the chapter is drawn')
    c.wait(300)
    c.eq(c.count('.f-hl'), 0, 'a chapter without anchor highlights nothing', what='.f-hl elements')


@case('A18', 'How-to card dismissed once', 'A', screens=False, designs=('standard',), night=False,
      rule='V3_SPECIFICATION 7.1 rule 16 (user, 25 Oct: "une fois lu, ça disparaît, c\'est redondant avec le bouton aide contextuelle")')
def a18(c):
    c.open('fuel', flight=True)
    c.until("!!document.querySelector('[data-help=\"fuel\"]')", timeout=8000, what='the "How to use" card is drawn')
    x = c.box('[data-help="fuel"] [data-x]')
    c.ok(x and x['w'] >= 43.5 and x['h'] >= 43.5, f'the cross is {x and x["w"]:.0f}x{x and x["h"]:.0f}', 'at least 44x44')
    c.tap('[data-help="fuel"] [data-x]')
    c.eq(c.count('[data-help="fuel"]'), 0, 'the card is gone at once', what='cards after the cross')
    c.until_doc('device/help.json', lambda d: d and d.get('hidden', {}).get('fuel') is True, what='the device keeps the card hidden')
    c.page.reload(wait_until='load')
    c.ready('fuel')
    c.wait(800)                                            # the card is added after the module; give it its time
    c.eq(c.count('[data-help="fuel"]'), 0, 'after a reload the card is still absent', what='cards after the reload')
    # it is per module: the report card is still there
    c.go('report')
    c.until("!!document.querySelector('[data-help=\"report\"]')", timeout=8000, what='the card of another module is drawn')
    # the way back: the module's chapter in the help carries "Show the first steps again"
    c.go('help?m=fuel')
    c.until("!!document.querySelector('[data-howto-show=\"fuel\"]')", timeout=8000, what='the chapter offers the way back')
    c.eq(c.count('[data-howto-show]'), 1, 'only the dismissed module offers it', what='way-back links')
    link = c.box('[data-howto-show="fuel"]')
    c.ok(link['h'] >= 43.5, f'the link is {link["h"]:.0f} px high', 'at least 44 px')
    c.tap('[data-howto-show="fuel"]')
    c.until("location.hash === '#fuel'", what='the link returns to the module')
    c.until("!!document.querySelector('[data-help=\"fuel\"]')", timeout=8000, what='the card is back')
    c.ok(c.js("document.querySelector('[data-help=\"fuel\"]').open"), 'the card is folded', 'unfolded when it comes back')
    c.until_doc('device/help.json', lambda d: d and d.get('hidden', {}).get('fuel') is False, what='the device forgets the dismissal')


# ------------------------------------------------------------------------------------------------ data sources (#sources)
# The screen that replaced the data laboratory on 28 Oct 2026 (user's decision): links only, nothing fetched, parsed or published.
SRC = 'frame/aerodb/sources.js'
DATA = 'frame/aerodb/catalogue.js'
LEVEL3 = [['device/level.json', {'level': 3}, 'cache']]


@case('A20', 'Data sources: behind Administration at the Full level only; one line per source with its link, status and licence', 'A', langs4=True,
      rule='frame/aerodb/SPEC 5 sexies (Sources screen); user 28 Oct 2026 ("la transformation du lab en « sources » avec les liens"); 44 px controls; no fetch')
def a20(c):
    # Everyday level: no button on any card, and the address itself gives the frame's level message, not the screen
    c.open('settings')
    c.until("!!document.querySelector('[data-card=\"status\"]')", what='the settings are drawn')
    c.eq(c.count('[data-admin="sources"], a[href="#sources"], [data-admin="datalab"], a[href="#datalab"]'), 0,
         'no Sources (nor laboratory) button below the Full level', what='buttons at the Everyday level')
    c.page.evaluate("location.hash = '#sources'")
    c.until("/" + re.escape(norm(tx('frame/app.js', 'screenLevel', c.lang))[:20]).replace('/', '\\/') + "/.test(document.body.innerText.replace(/[\\s\\u00a0\\u202f]+/g, ' '))",
            what='the address alone gives the level message of the frame')
    c.eq(c.count('[data-screen=sources]'), 0, 'no Sources screen below the Full level', what='screen')
    # Full level: the button of the Administration card (a real link, its absolute address, "Copy the link"), then the screen
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"] li[data-admin=\"sources\"]')", what='the Administration card lists the Sources')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')     # Settings: the card sits in a folded group (SPEC 1)
    c.eq(c.count('[data-admin="datalab"], a[href="#datalab"]'), 0, 'the laboratory is gone', what='laboratory button')
    btn = c.js("(() => { const e = document.querySelector('[data-admin=\"sources\"]').firstElementChild; return { tag: e.tagName, cls: e.className, href: e.getAttribute('href'), text: e.textContent.trim(), h: e.getBoundingClientRect().height } })()")
    c.ok(btn['tag'] == 'A' and 'f-btn' in btn['cls'] and btn['href'] == '#sources', f'{btn}', 'a frame button to #sources')
    c.eq(norm(btn['text']), norm(tx('frame/settings/admin_links.js', 'title', c.lang, after="id: 'sources'")), 'the button is worded in the language of the run', what='Sources button')
    c.ge(btn['h'], 43.5, 'touch target of the frame', what='Sources button height')
    here = c.js("new URL('#sources', location.href).href")
    c.eq(c.text('[data-admin=sources] [data-adminurl]'), here, 'the absolute address shown under the link is the one of location', what='absolute address')
    # the screen: every request made from here on is recorded (the screen fetches nothing)
    c.js("window.__srcReq = []; new PerformanceObserver(l => l.getEntries().forEach(e => window.__srcReq.push(e.name))).observe({ type: 'resource', buffered: false }); 1")
    c.tap('[data-admin="sources"] > a')
    c.until("!!document.querySelector('[data-screen=sources] li[data-src]')", timeout=15000, what='the Sources screen is drawn')
    c.eq(norm(c.text('[data-screen=sources] h1')), norm(tx(SRC, 'title', c.lang)), 'the title in the language of the run', what='h1')
    c.eq(c.attr('[data-src-back]', 'href'), '#settings', 'a way back to Settings', what='back link')
    src = (ROOT / DATA).read_text(encoding='utf-8')
    ids = re.findall(r"^\s{4}id: '([a-z0-9]+)',", src, re.M)
    rows = c.js("[...document.querySelectorAll('[data-screen=sources] li[data-src]')].map(li => ({ id: li.dataset.src, status: li.dataset.status, chip: li.querySelector('.src-status').textContent.trim(), a: (a => a && { href: a.getAttribute('href'), target: a.target, rel: a.rel, h: a.getBoundingClientRect().height, text: a.textContent.trim() })(li.querySelector('a[data-open]')), text: li.innerText }))")
    c.eq(sorted(r['id'] for r in rows), sorted(ids), 'one line per source of the catalogue', what='source lines')
    for want in ('sia', 'eaip', 'cifp', 'ead', 'dfs', 'enaire', 'nats'):
        c.ok(want in [r['id'] for r in rows], [r['id'] for r in rows], f'the line {want} is there (the table of the laboratory, EAD Basic, the national AIPs)')
    order = {'used': 0, 'candidate': 1, 'abandoned': 2}
    c.eq([r['status'] for r in rows], sorted([r['status'] for r in rows], key=order.get), 'used first, then candidates, then set aside', what='status order')
    for st in ('used', 'candidate', 'abandoned'):
        r = next((r for r in rows if r['status'] == st), None)
        c.ok(r is not None, st, f'at least one source is {st}')
        c.eq(norm(r['chip']), norm(tx(SRC, st, c.lang)), f'the status {st} is worded in the language of the run', what=f'status {st}')
    for r in rows:
        a = r['a']
        c.ok(a and a['href'].startswith('https://') and a['target'] == '_blank' and 'noopener' in a['rel'], f"{r['id']}: {a}", f"the line {r['id']} has a real link opening a new tab, https only")
        c.ge(a['h'], 43.5, 'touch target', what=f"{r['id']} link height")
        c.eq(norm(a['text']), norm(tx(SRC, 'open', c.lang)), 'the link is worded in the language of the run', what=f"{r['id']} link label")
        c.ok(norm(tx(SRC, 'lic', c.lang).split('{l}')[0]) in norm(r['text']), r['text'][:200], f"the line {r['id']} says its licence")
    # the cycle in force: the dated lines carry it in their address (eAIP folder of its effective date, CIFP of its date)
    cyc = c.js("AeroSources.cycleOf()")
    c.ok(cyc['id'] in c.text('[data-cycle]'), c.text('[data-cycle]'), 'the AIRAC cycle in force is written')
    eaip = next(r for r in rows if r['id'] == 'eaip')['a']['href']
    y, m, d = cyc['date'].split('-')
    c.ok(f'AIRAC-{cyc["date"]}' in eaip and next(r for r in rows if r['id'] == 'cifp')['a']['href'].endswith(f'CIFP_{y[2:]}{m}{d}.zip'), eaip,
         'the eAIP and CIFP links are the ones of the cycle in force')
    # links only: no external host; of aerodb, only the screen's two scripts and its sheet
    c.wait(500)
    req = c.js('window.__srcReq')
    ext = [u for u in req if not u.startswith(c.js('location.origin'))]
    c.eq(ext, [], 'the screen calls no external host (links only)', what='external requests')
    c.ok(all('/aerodb/' not in u or re.search(r'/frame/aerodb/(sources\.(js|css)|catalogue\.js|airac\.js)', u) for u in req), f'{req}', "of aerodb, only the screen's own files are asked for")
    sw, iw = hscroll(c)
    c.le(sw, iw, 'no horizontal scroll', what='page width')
    c.shot(f'A20_{c.design}_{c.width}_{c.lang}.png')


@case('A26', 'Design card: a computer-only design on a phone', 'A', screens=False, designs=('standard',), night=False,
      rule='frame/settings SPEC 3 item 3b: applied differs from design → one line, the applied thumbnail marked, no Aqua thumbnail')
def a26(c):
    if not c.phone:
        c.skip('a phone only')
    c.open('settings', docs=[['device/design.json', {'design': 'aqua', 'tone': 'auto'}, 'cache']])
    c.until("!!document.querySelector('[data-card=\"design\"]')", what='the Design card is drawn')
    # until the frame gives design().applied (Aqua's lot, origin/v3-aqua), there is nothing to check
    if not c.js("fetch(new URL('/frame/app.js', location.href)).then(r => r.text()).then(t => t.includes('appliedDesign'))"):
        c.skip('the frame does not give design().applied yet (Aqua not integrated)')
    c.eq(c.count('[data-design-pick="aqua"]'), 0, 'no Aqua thumbnail on a phone (designs() leaves it out)', what='Aqua thumbnails')
    c.eq(c.attr('[data-design-pick="standard"]', 'aria-pressed'), 'true', 'Standard, the design applied, is marked as set', what='Standard aria-pressed')
    line = c.text('[data-card="design"] [data-design-applied]') or ''
    c.ok('Aqua' in line and 'Standard' in line, f'line {line!r}', 'one line names Aqua and Standard')
    c.ok(c.js("(() => { const p = document.querySelector('[data-design-applied]'); return !!p.previousElementSibling?.matches('.f-designs') })()"),
         'the line is not right after the thumbnails', 'the line sits under the thumbnails')


@case('A27', 'A card reached by its address, whatever the level', 'A', screens=False, designs=('standard',), night=False,
      rule='frame/settings SPEC 1: a card reached by its address is shown whatever the level; the level only filters the list')
def a27(c):
    if not c.phone:
        c.skip('a phone only')
    c.open('settings?offline=1', docs=[['device/level.json', {'level': 1}, 'cache']])
    c.until("!!document.querySelector('[data-card=\"offline\"]')", what='the offline data card is drawn at the Discovery level')
    c.ok(c.shown('[data-card="offline"]'), 'the card is hidden', 'the card reached by its address is visible')
    others = c.js("[...document.querySelectorAll('[data-card]')].map(k => k.dataset.card).filter(k => k !== 'offline')")
    c.eq(others, [], 'the card is alone on the screen', what='other cards')
    c.eq(c.attr('[data-settings-back]', 'href'), '#settings', 'a "← Settings" link back to the list', what='back link')
    c.tap('[data-settings-back]')
    c.until("!!document.querySelector('[data-card=\"identity\"]')", what='the list is drawn again')
    c.eq(c.count('[data-card="offline"]'), 0, 'back in the list at Discovery, the offline data card is not there', what='offline in the Discovery list')


@case('A25', 'Weather layer bench', 'A', tags=('weather',), designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 14; the bench reported 73/73')
def a25(c):
    c.page.goto(f'{c.base}/frame/lib/test/weather_store.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__weatherBench && window.__weatherBench.done', timeout=60000)
    except Exception:
        raise Fail('the bench never reported done (window.__weatherBench.done)', 'a finished bench', 'frame/lib/test/weather_store.html') from None
    r = c.js('({ pass: window.__weatherBench.pass, fail: window.__weatherBench.fail, rows: window.__weatherBench.rows })')
    bad = [x for x in (r['rows'] or []) if str(x).startswith('FAIL')][:3]
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}", 'every assertion of the bench passes')


@case('A28', 'A store script lost on the way', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/SPEC 3 (start): a store script lost once is asked again and the frame starts; lost for good, the page says why')
def a28(c):
    # lost once (the network, a service worker without its copy): asked again, the frame starts as usual
    lost = {'n': 0}

    def once(route):
        if lost['n'] == 0:
            lost['n'] += 1
            return route.abort()
        route.continue_()
    c.context.route(re.compile(r'/frame/store/transport_launcher\.js'), once)
    c.open('atmosphere')
    c.eq(lost['n'], 1, 'the first load of the launcher transport was lost', what='lost loads')
    c.eq(c.count('#fView section[data-module]'), 1, 'one module in the view after the second try', what='modules mounted')
    c.eq(c.count('#fView .f-err'), 0, 'no failure message once the file came', what='failure messages')
    # lost for good (a fresh context, no service worker to serve its copy): no blank page, the reason and a Reload button
    ctx = c.context.browser.new_context(viewport=c.page.viewport_size, service_workers='block')
    try:
        ctx.route(re.compile(r'/frame/store/transport_github\.js'), lambda route: route.abort())
        p, errs = ctx.new_page(), []
        p.on('pageerror', lambda e: errs.append(str(e)[:200]))
        p.goto(f'{c.base}/frame/index.html#atmosphere', wait_until='load')
        p.wait_for_selector('#fView .f-err[role=alert]', timeout=8000)
        msg = p.inner_text('#fView .f-err')
        c.ok('store/transport_github.js' in msg, msg, 'the message names the lost file')
        c.ge(p.locator('#fView .f-err button').bounding_box()['height'], 43.5, "a Reload button of the frame's touch size", what='Reload button height')
        c.eq(p.locator('#fView section[data-module]').count(), 0, 'no module is mounted on a frame without its store', what='modules mounted')
        c.eq(errs, [], 'no JavaScript error, the store missing', what='page errors')
    finally:
        ctx.close()


def _bench(c, page, var):
    c.page.goto(f'{c.base}/{page}', wait_until='load')
    try:
        c.page.wait_for_function(f'window.{var} && window.{var}.done', timeout=60000)
    except Exception:
        raise Fail(f'the bench never reported done (window.{var}.done)', 'a finished bench', page) from None
    r = c.js(f'({{ pass: window.{var}.pass, fail: window.{var}.fail, rows: window.{var}.rows }})')
    bad = [x for x in (r['rows'] or []) if str(x).startswith('FAIL')][:3]
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}", 'every assertion of the bench passes')


@case('A29', 'Launcher client bench', 'A', tags=('launcher',), designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 15.1; the bench reported 32/32')
def a29(c):
    _bench(c, 'frame/lib/test/launcher.html', '__launcherBench')


@case('A30', 'Publication bench', 'A', tags=('launcher',), designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 15.2; the bench reported 12/12')
def a30(c):
    _bench(c, 'frame/store/test/publish.html', '__publishBench')


@case('A31', 'End-of-cycle line', 'A', langs4=True, designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 15.3; modules/data/SPEC 6.3: the base published for an older cycle than the one in force is said in the Status block, amber, on every device')
def a31(c):
    # the real aerodb.publication() (cycles as an object { date: {...} }) on a base seeded for the previous AIRAC cycle
    import datetime
    from lib import aero_docs
    ref = datetime.date(2024, 1, 25)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    cur = ref + datetime.timedelta(days=(today - ref).days // 28 * 28)
    prev = cur - datetime.timedelta(days=28)
    first = ref + datetime.timedelta(days=-(-(datetime.date(prev.year, 1, 1) - ref).days // 28) * 28)
    name = f'{prev.year % 100:02d}{(prev - first).days // 28 + 1:02d}'
    first_cur = ref + datetime.timedelta(days=-(-(datetime.date(cur.year, 1, 1) - ref).days // 28) * 28)
    name_cur = f'{cur.year % 100:02d}{(cur - first_cur).days // 28 + 1:02d}'
    c.open('settings', docs=aero_docs(cycle=prev.isoformat()))
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"cycle-base\"]')", timeout=15000, what='the end-of-cycle line of the base')
    want = tx('frame/app.js', 'cycleOld', c.lang).replace('{s}', tx('frame/app.js', 'cycleBase', c.lang)).replace('{c}', name).replace('{n}', name_cur)
    c.eq(norm(c.text('[data-card="status"] li[data-k="cycle-base"] .f-status-txt span')), norm(want),
         'worded in the language of the run: the published cycle out of date, to rebuild for the one in force (never « publication »)', what='base line')
    c.ok(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"cycle-base\"] .f-status-dot').hasAttribute('data-attn')"), 'no amber dot', 'an amber dot (attention)')
    c.eq(c.count('[data-card="status"] li[data-k="cycle-proc"]'), 0, 'no procedures index published: no procedures line', what='proc lines')
    c.eq(c.count('[data-card="status"] li[data-k="cycle-base"] [data-go]'), 0, 'no launcher here: nothing to press', what='links on the line')
    # the base of the cycle in force (the suite's own seed, lib.AERO_CYCLE): no line
    c.open('settings', aero=True)
    c.wait(1500)
    c.eq(c.count('[data-card="status"] li[data-k^="cycle-"]'), 0, 'a base of the cycle in force: no end-of-cycle line', what='cycle lines')


def _watch_console(c):
    """Every console line of the page from now on (text only), for the secrets cases."""
    logs = []
    c.page.on('console', lambda m: logs.append(m.text or ''))
    return logs


def _no_secret(c, logs, *values):
    """A secret typed in a card is nowhere afterwards: not in the markup (attributes included, not only the text), not in a console line."""
    html = c.js('document.documentElement.outerHTML')
    for v in values:
        c.ok(v not in html, 'a secret is in the markup', 'the value is in no element, no attribute')
        c.ok(not any(v in line for line in logs), 'a secret is in the console', 'the value is in no console line')


@case('A32', 'EAD Basic credentials in the launcher keys panel', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 9: given once, never read back')
def a32(c):
    # the suite has no launcher: a fake one answers the routes the Settings screen asks for (detect(), secrets, the rest empty)
    posts = []
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}
    secrets = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}},
                       'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}
    logs = _watch_console(c)
    refuse = {'once': False, 'seen': []}               # the launcher refuses the next secrets call once (HTTP 500)

    def launcher(route):
        req = route.request
        path = urllib.parse.urlparse(req.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/secrets'):
            if req.method == 'POST' and refuse['once']:
                refuse['once'] = False
                refuse['seen'].append(json.loads(req.post_data or '{}'))
                return route.fulfill(status=500, content_type='application/json', body=json.dumps({'ok': False}))
            if req.method == 'POST':
                posts.append(json.loads(req.post_data or '{}'))
                body = {'ok': True, **secrets}
            else:
                body = secrets
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"] li[data-admin=\"keys\"]')", what='the Administration card lists the keys panel')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    c.tap('[data-admin="keys"] > button')
    c.until("!!document.querySelector('[data-adminpanel=\"keys\"]:not([hidden]) [data-card=\"ead\"]')", what='the EAD Basic block is shown')
    ead = '[data-adminpanel="keys"] [data-card="ead"]'
    c.eq(norm(c.text(f'{ead} h3')), norm(tx('frame/settings/launcher.js', 'eadTitle', c.lang)), 'the block is titled', what='EAD title')
    c.eq(norm(c.text(f'{ead} p.f-msg[data-kind="warn"]')), norm(tx('frame/settings/launcher.js', 'eadNotice', c.lang)),
         'the notice (demonstration tool, simulation use) is worded in the language of the run', what='EAD notice')
    c.until(f"document.querySelector('{ead} [data-ead]').textContent.trim() !== '…'", what='the state of the credentials is painted')
    c.eq(norm(c.text(f'{ead} [data-ead]')), norm(tx('frame/settings/launcher.js', 'eadMissing', c.lang)), 'nothing saved yet: missing', what='EAD state')
    c.eq(c.count(f'{ead} input[data-f="eadUser"]'), 1, 'a user name field', what='user field')
    c.eq(c.attr(f'{ead} input[data-f="eadPassword"]', 'type'), 'password', 'the password field hides what is typed', what='password type')
    # both are required: one alone calls nothing
    c.page.fill(f'{ead} input[data-f="eadUser"]', 'test-user')
    c.tap(f'{ead} [data-act="eadSave"]')
    c.wait(300)
    c.eq(len(posts), 0, 'a user name without a password is refused in the card, no call', what='posts')
    c.eq(norm(c.text(f'{ead} [data-msg]')), norm(tx('frame/settings/launcher.js', 'eadBoth', c.lang)), 'the card says what is missing', what='EAD message')
    # a call the launcher refuses: the fields stay empty, the card says why, nothing is sent again with a kept value
    c.page.fill(f'{ead} input[data-f="eadPassword"]', 'test-pass')
    refuse['once'] = True
    c.tap(f'{ead} [data-act="eadSave"]')
    for _ in range(30):
        if refuse['seen']:
            break
        c.wait(100)
    c.eq(refuse['seen'], [{'scope': 'app', 'service': 'ead', 'values': {'user': 'test-user', 'password': 'test-pass'}}], 'the refused call was the one made', what='refused call')
    c.until(f"document.querySelector('{ead} [data-msg]').textContent.trim() !== ''", what='the card says the call failed')
    c.eq(c.js(f"[...document.querySelectorAll('{ead} input[data-f]')].map(i => i.value)"), ['', ''], 'after a refusal the fields stay empty: nothing is kept', what='fields after refusal')
    c.wait(600)
    c.eq([len(posts), len(refuse['seen'])], [0, 1], 'no second call: nothing retries with a kept value', what='calls after refusal')
    _no_secret(c, logs, 'test-user', 'test-pass')
    # save: the launcher receives both values, the page keeps none (the user types them again)
    c.page.fill(f'{ead} input[data-f="eadUser"]', 'test-user')
    c.page.fill(f'{ead} input[data-f="eadPassword"]', 'test-pass')
    c.tap(f'{ead} [data-act="eadSave"]')
    for _ in range(30):                           # the call is sent once the fields are emptied
        if posts:
            break
        c.wait(100)
    c.eq(posts, [{'scope': 'app', 'service': 'ead', 'values': {'user': 'test-user', 'password': 'test-pass'}}],
         'one call to the launcher with the scope, the service and both values', what='posts')
    c.eq(c.js(f"[...document.querySelectorAll('{ead} input[data-f]')].map(i => i.value)"), ['', ''], 'both fields are emptied: the page keeps no secret', what='fields after save')
    c.ok('test-pass' not in c.js('document.body.innerText') and 'test-user' not in c.js('document.body.innerText'), 'a value is shown', 'the values are shown nowhere')
    _no_secret(c, logs, 'test-user', 'test-pass')
    # the IVAO API key: same rule, sent once with its service, nowhere in the page or the console afterwards
    key = '[data-adminpanel="keys"] input[data-f="ivaoKey"]'
    c.page.fill(key, 'test-ivao-key')
    c.tap('[data-adminpanel="keys"] [data-act="keySave"]')
    for _ in range(30):
        if len(posts) == 2:
            break
        c.wait(100)
    c.eq(posts[1:], [{'scope': 'app', 'service': 'ivao', 'values': {'apiKey': 'test-ivao-key'}}], 'one call with the scope, the service and the key', what='key post')
    c.wait(500)                                   # the card is drawn again from the launcher's state
    _no_secret(c, logs, 'test-ivao-key')


@case('A33', 'Revalidate bench', 'A', tags=('data',), designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 4 (data.revalidate); the bench reported 14/14')
def a33(c):
    _bench(c, 'frame/store/test/revalidate.html', '__revalidateBench')


@case('A34', 'An address request consumed once', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 6.1 (ctx.consume): the keys a module takes leave the address in one write, the frame keys stay, a reload does not replay them')
def a34(c):
    c.page.add_init_script("localStorage.setItem('sogFrame:dev', '1')")  # le module d'exemple (modules/hello) s'en sert
    c.open('hello?note=bonjour%20%3Cb%3E&from=fuel', wait=False)
    c.until("!!document.querySelector('[data-module=hello] [data-asked]')", timeout=15000, what='the example module took the request')
    c.ok('bonjour <b>' in c.text('[data-module=hello] [data-asked]'), c.text('[data-module=hello] [data-asked]'), 'the value given to the module, shown as text')
    c.eq(c.js('location.hash'), '#hello?from=fuel', 'the consumed key leaves the address, the frame key (from) stays', what='address')
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-module=hello]')", timeout=15000, what='the module after a reload')
    c.wait(800)
    c.eq(c.count('[data-module=hello] [data-asked]'), 0, 'a reload does not replay the request', what='request after reload')


@case('A35', 'Flown track', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 6 (29 Oct; local since 30 Oct): the track on the device (device/trail.json, ctx.live.trail()), one point per NM or per minute, turns kept, 500 points at most, never carried to another start, never in the shared flight')
def a35(c):
    c.open('fuel', wait=False)
    c.until("!!document.querySelector('[data-module=fuel]')", timeout=15000, what='the frame is up')
    r = c.js("""() => import('/frame/lib/trail.js').then(T => {
      const S = '2026-10-29T20:00:00Z', t0 = Date.parse(S);
      const fix = (s, lat, lon, alt) => ({ at: new Date(t0 + s * 1000).toISOString(), lat, lon, altFt: alt });
      let tr = []; for (let s = 0; s <= 600; s += 10) tr = T.next(tr, fix(s, 48 + s / 1800, 2, 3000), S);   // 120 kt plein nord
      const straight = tr.length, gaps = [...new Set(tr.slice(1).map((p, i) => p[3] - tr[i][3]))];
      for (let s = 610; s <= 700; s += 10) tr = T.next(tr, fix(s, 48 + 600 / 1800, 2 + (s - 600) / 1800 / Math.cos(48.33 * Math.PI / 180), 3000), S);
      const corner = tr.some(p => p[3] === 600 || p[3] === 610);
      let slow = []; for (let s = 0; s <= 300; s += 10) slow = T.next(slow, fix(s, 48 + s / 360000, 2, 0), S);   // roulage, 10 kt
      let big = []; for (let s = 0; s <= 8 * 3600; s += 10) big = T.next(big, fix(s, 40 + s / 1800, 1 + 0.5 * Math.sin(s / 1800), 5000), S);
      return { straight, gaps, corner, slow: slow.length, cap: big.length, ends: [big[0][3], big[big.length - 1][3]],
        point: tr[1], before: T.next([], fix(-30, 48, 2, 0), S).length, junk: T.next([['x'], [1, 2, 3, -5]], fix(0, 48, 2, 0), S).length };
    })""")
    c.eq((r['straight'], r['gaps']), (21, [30]), 'a straight leg at 120 kt: one point per NM', what='straight leg')
    c.ok(r['corner'], str(r), 'a 90° turn keeps its corner')
    c.eq(r['slow'], 6, 'a slow taxi: one point per minute', what='taxi points over 5 min')
    c.eq((r['cap'], r['ends']), (500, [0, 28800]), 'an 8 h flight: 500 points, the first and the last kept', what='cap')
    c.eq(r['point'], [48.017, 2, 3000, 30], 'a point is [lat, lon, altFt, s since the start], to about 100 m', what='point shape')
    c.eq((r['before'], r['junk']), (0, 1), 'a position before the start is not a point; a malformed track is dropped', what='guards')
    src = (ROOT / 'frame' / 'app.js').read_text(encoding='utf-8')
    c.ok("base = liveTrail.from === cur.started.at ? liveTrail.trail" in src and 'trail: TR.next(base, a, cur.started.at)' in src, '',
         'the frame carries on only a track of the same start (from = started.at, exactly)')
    c.ok("trailFrom: cur.started.at" not in src and "actual: {\n          ...a\n        }" in src.replace('\r\n', '\n'), '',
         'the shared flight gets the position only, never the track')
    fd = (ROOT / 'frame' / 'store' / 'frame_data.js').read_text(encoding='utf-8')
    c.ok("path !== TRAIL" in fd and "const TRAIL = 'device/trail.json'" in fd, '', 'the device track is never in a backup')


@case('A37', "A module publishes on the user’s gesture", 'A', designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 4 (29 Oct): data.sync({ gesture: true }) is a manual pass; data.sync.gesture tells the capacity; the launcher’s report without paths')
def a37(c):
    c.open('fuel', wait=False)
    c.until("!!window.FrameData", timeout=15000, what='the data layer')
    c.eq(c.js("() => FrameData.adapter({ id: 'x', writes: ['pilot/'] }).sync.gesture"), True, 'the capacity is announced on the function', what='sync.gesture')
    r = c.js("() => FrameData.adapter({ id: 'x', writes: ['pilot/'] }).sync({ gesture: true }).then(r => ({ ok: !!r, ex: 'exchange' in r }))")
    c.eq(r, {'ok': True, 'ex': False}, 'a gesture pass runs; without a launcher, no report of an exchange', what='gesture pass without a launcher')
    src = (ROOT / 'frame' / 'store' / 'frame_data.js').read_text(encoding='utf-8')
    c.ok("reason: o?.gesture === true ? 'manual' : 'module'" in src, '', 'only gesture === true makes a manual pass')
    c.ok('conflicts: Array.isArray(r.conflicts) ? r.conflicts.length' in src and 'message: String(r.message ||' in src, '',
         'the report keeps numbers and the message, never the conflicting paths')
@case('A36', 'Applications', 'A', designs=('standard',), night=False,
      rule='frame SPEC 3.1 (29 Oct): an application is a named set of modules of the same frame, chosen by ?app= (pilot by default); Maintenance opens everywhere, read only without a launcher')
def a36(c):
    rail = "() => [...document.querySelectorAll('#fMenu a')].map(a => a.dataset.id || a.dataset.link)"
    tabs = "() => [...document.querySelectorAll('#fTabs a')].map(a => a.dataset.tab)"
    c.open('fuel', docs=LEVEL3)
    c.ok('data' not in c.js(rail), str(c.js(rail)), 'Pilot has no Données in its rail')
    c.page.goto(f'{c.base}/frame/index.html#data', wait_until='load')
    c.until("!!document.querySelector('[data-module=fuel]')", timeout=15000, what='#data in Pilot: its first module')
    c.eq(c.count('[data-module=data]'), 0, 'Pilot does not mount Données', what='Données in Pilot')
    # Maintenance au niveau par défaut de l'appareil : son plancher (Complet), son rail entier, pas l'accueil de Pilote
    c.page.evaluate("() => new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').delete('device/level.json'); tx.objectStore('docs').delete('device/help.json'); tx.oncomplete = () => res(); }; r.onerror = () => rej(r.error) })")
    c.page.goto(f'{c.base}/frame/index.html?app=maintenance#data', wait_until='load')
    c.until("!!document.querySelector('[data-module=data]')", timeout=15000, what='Maintenance mounts Données, without a launcher too')
    c.wait(800)
    c.eq(c.count('[data-welcome]'), 0, 'no welcome card of Pilot in Maintenance', what='welcome cards')
    c.eq(c.js(rail), ['data', 'aircraft', 'admin', 'help'], 'Maintenance without a launcher: Données, Appareils (§ 10.34 A2), Administration, Aide (no V2 page)', what='rail')
    c.eq(c.js(tabs), ['data', 'admin', 'help'], 'the phone bar of Maintenance', what='tabs')
    c.eq(c.js("[...document.querySelectorAll('[data-verb]')].filter(b => !b.disabled).length"), 0, 'read only without a launcher: every action grey', what='enabled [data-verb]')
    c.ok(c.js('document.title').split(' — ')[0] in ('Maintenance', 'Wartung', 'Mantenimiento'), c.js('document.title'), 'the page is named after the application')
    c.page.goto(f'{c.base}/frame/index.html?app=__proto__#fuel', wait_until='load')
    c.until("!!document.querySelector('[data-module=fuel]')", timeout=15000, what='an unknown application: Pilot')
    c.ok('fuel' in c.js(rail) and 'data' not in c.js(rail), str(c.js(rail)), 'an unknown app is Pilot')


@case('A38', 'GitLab transport bench', 'A', tags=('data',), designs=('standard',), screens=False, night=False,
      rule='frame/INTEGRATION 4 (29 Oct): the data repository on a GitLab instance, same form as GitHub; the bench reported all pass')
def a38(c):
    _bench(c, 'frame/store/test/gitlab.html', '__gitlabBench')


@case('A39', 'Pilots’ tokens screen bench', 'A', designs=('standard',), screens=False, night=False,
      rule='frame G2 (29 Oct): Maintenance › Pilots’ tokens: without a launcher, without a secret, list, a token shown once, revoke after the question')
def a39(c):
    _bench(c, 'frame/settings/test/pilot_tokens.html', '__tokensBench')


@case('A40', 'Devices screen bench (one list for the local network and the relay)', 'A', designs=('standard',), screens=False, night=False,
      rule='frame R1a (29 Oct), one pairing R-C2 (30 Oct): Maintenance › Appareils: without a launcher, both channels’ state, each device with its channel, « code de console » and « Nommer », a code shown once (valid on both channels) and wiped when the screen is left, revoke a device or a pilot after the question')
def a40(c):
    _bench(c, 'frame/settings/test/devices.html', '__devicesBench')
    # the old address leads to the new screen
    c.open('settings', app='maintenance', docs=LEVEL3)
    c.go('relay-devices')
    c.until("location.hash === '#devices'", what='#relay-devices is replaced by #devices')


@case('A41', 'IVAO sign-in return through the relay', 'A', designs=('standard',), screens=False, night=False,
      rule='frame R1b (29 Oct): #ivao-return?… (set by the launcher after the OpenID exchange): tokens kept with the device keys, the address replaced at once; an error is said, nothing kept')
def a41(c):
    import time as _t
    exp = int(_t.time()) + 3600
    c.open('fuel', wait=False)
    c.until("!!window.FrameData", timeout=15000, what='the frame')
    c.page.goto(f'{c.base}/frame/index.html#ivao-return?access_token=AT-secret&refresh_token=RT-secret&expires_at={exp}&scope=tracker', wait_until='load')
    c.until("location.hash === '#settings?card=ivao'", timeout=15000, what='the address replaced by the settings')
    c.ok('secret' not in c.js('location.href'), c.js('location.href'), 'no token left in the address')
    keys = c.js("""() => new Promise(res => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => { const q = r.result.transaction('docs').objectStore('docs').get('device/keys.json');
      q.onsuccess = () => res(q.result ? JSON.parse(q.result.text).ivao : null) } })""")
    c.ok(keys and keys.get('access_token') == 'AT-secret' and keys.get('refresh_token') == 'RT-secret', str(keys)[:80], 'the tokens kept with the device keys')
    c.page.goto(f'{c.base}/frame/index.html#ivao-return?error=denied', wait_until='load')
    c.until("location.hash === '#settings?card=ivao'", timeout=15000, what='the address replaced after an error')
    c.until("window.__notes && window.__notes.some(n => /IVAO/.test(n))", timeout=5000, what='the refusal said')


@case('A43', 'IVAO application assistant', 'A', langs4=True, designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 9: the airline registers an IVAO application; the Client ID and Secret go once to the launcher (secrets/ivao_oauth.json), never read back')
def a43(c):
    posts = []
    logs = _watch_console(c)
    file = 'frame/settings/launcher.js'

    def t(key):
        return tx(file, key, c.lang)
    redirects = ['http://127.0.0.1:8000/__relay/ivao/callback', 'https://relay.example.test/__relay/ivao/callback']
    unset = {'clientId': {'set': False, 'at': ''}, 'clientSecret': {'set': False, 'at': ''}}
    state = {'oauth': unset, 'redirects': redirects, 'test': {'ok': True}}
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}

    def secrets():
        view = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}},
                        'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}},
                        'ivao_oauth': state['oauth']}, 'user': {}}
        if state['redirects'] is not None:
            view['ivaoRedirects'] = state['redirects']
        return view

    def launcher(route):
        req = route.request
        path = urllib.parse.urlparse(req.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/secrets/test'):
            body = state['test']
        elif path.endswith('/__setup/secrets'):
            if req.method == 'POST':
                post = json.loads(req.post_data or '{}')
                posts.append(post)
                vals = post.get('values') or {}
                full = bool(vals.get('clientId')) and bool(vals.get('clientSecret'))
                state['oauth'] = {k: {'set': full, 'at': '2026-10-30T10:00:00Z' if full else ''} for k in ('clientId', 'clientSecret')}
                body = {'ok': True, **secrets()}
            else:
                body = secrets()
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-group=\"admin\"] [data-card=\"ivaoapp\"]')", what='the card is in the Administration group at the Full level')
    if not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    card = '[data-card="ivaoapp"]'
    msg = f"document.querySelector('{card} [data-msg]').textContent.trim()"
    c.eq(norm(c.text(f'{card} h2')), norm(t('ivaoAppTitle')), 'the card is titled', what='title')
    c.eq(c.count(f'{card} ol[data-ivao-steps] > li'), 4, 'four steps', what='steps')
    link = f'{card} [data-ivao-steps] a'
    c.eq(c.attr(link, 'href'), 'https://developers.ivao.aero/create', "a real link to IVAO's application form", what='link')
    c.ok('noopener' in c.attr(link, 'rel') and c.attr(link, 'target') == '_blank', f"{c.attr(link, 'rel')} {c.attr(link, 'target')}", 'a new tab, noopener')
    # the return addresses, filled from the one read of the secrets
    c.until(f"document.querySelectorAll('{card} [data-ivao-redirects] li code').length === 2", what='both return addresses are listed')
    c.eq(c.js(f"[...document.querySelectorAll('{card} [data-ivao-redirects] li code')].map(e => e.textContent)"), redirects, 'this workstation first, then the relay', what='addresses')
    c.eq(c.js(f"[...document.querySelectorAll('{card} [data-ivao-redirects] li button[data-act=\"ivaoCopy\"]')].map(b => b.dataset.text)"), redirects, 'a Copy button for each, carrying the address as it is', what='copy buttons')
    c.until(f"document.querySelector('{card} [data-ivaoapp]').textContent.trim() !== '…'", what='the state is painted')
    c.eq(norm(c.text(f'{card} [data-ivaoapp]')), norm(t('ivaoAppMissing')), 'nothing saved yet: absent', what='state')
    c.eq(c.attr(f'{card} input[data-f="ivaoClientSecret"]', 'type'), 'password', 'the secret is hidden while typed', what='secret type')
    # one field alone: refused in the card, no call
    c.page.fill(f'{card} input[data-f="ivaoClientId"]', 'test-client-id')
    c.tap(f'{card} [data-act="ivaoAppSave"]')
    c.wait(300)
    c.eq(len(posts), 0, 'a Client ID without a Secret is refused in the card, no call', what='posts')
    c.eq(norm(c.text(f'{card} [data-msg]')), norm(t('ivaoAppBoth')), 'the card says what is missing', what='message')
    # both: ONE call, the fields emptied, the values shown nowhere, the state follows
    c.page.fill(f'{card} input[data-f="ivaoClientSecret"]', 'test-client-secret')
    c.tap(f'{card} [data-act="ivaoAppSave"]')
    for _ in range(30):
        if posts:
            break
        c.wait(100)
    c.eq(posts, [{'scope': 'app', 'service': 'ivao_oauth', 'values': {'clientId': 'test-client-id', 'clientSecret': 'test-client-secret'}}],
         'one call with the scope, the service and both values', what='posts')
    c.eq(c.js(f"[...document.querySelectorAll('{card} input[data-f]')].map(i => i.value)"), ['', ''], 'both fields are emptied: the page keeps no secret', what='fields')
    c.until(f"/2026/.test(document.querySelector('{card} [data-ivaoapp]').textContent)", what='the state says when the application was saved')
    body = c.js('document.body.innerText')
    c.ok('test-client-id' not in body and 'test-client-secret' not in body, 'a value is shown', 'the values are shown nowhere')
    _no_secret(c, logs, 'test-client-id', 'test-client-secret')
    c.ok(norm(c.text(f'{card} [data-ivaoapp]')).startswith(norm(t('ivaoAppSet').split('{d}')[0])), c.text(f'{card} [data-ivaoapp]'), 'saved on <date>')
    # Test: the discovery answers, then the application is missing, then IVAO does not answer
    def tested(answer, key, what):
        state['test'] = answer
        before = c.js(msg)
        c.tap(f'{card} [data-act="ivaoAppTest"]')
        c.until(f"{msg} !== {json.dumps(before)}", what=f'the test answers: {what}')
        c.eq(norm(c.text(f'{card} [data-msg]')), norm(t(key)), what, what='test message')
    tested({'ok': True}, 'ivaoAppTestOk', 'the discovery document answered: the application is ready')
    tested({'ok': False, 'key': 'missing'}, 'ivaoAppTestMissing', 'no application: save it first')
    tested({'ok': False, 'error': 'URLError'}, 'ivaoAppTestFail', 'IVAO did not answer: saved, try signing in')
    # Erase: asked, then a call with empty values
    c.tap(f'{card} [data-act="ivaoAppErase"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='the question is asked')
    c.eq(len(posts), 1, 'nothing is erased before the answer', what='posts')
    c.tap('.f-modal [data-ok]')
    for _ in range(30):
        if len(posts) == 2:
            break
        c.wait(100)
    c.eq(posts[1:], [{'scope': 'app', 'service': 'ivao_oauth', 'values': {'clientId': '', 'clientSecret': ''}}], 'one call with empty values', what='erase post')
    c.until(f"document.querySelector('{card} [data-ivaoapp]').textContent.trim() === {json.dumps(t('ivaoAppMissing'))}", what='the state is absent again')
    # the card alone by its address
    c.page.evaluate("location.hash = '#settings?card=ivaoapp'")
    c.until("!!document.querySelector('#fView [data-settings-back]')", what='the card shown alone')
    c.eq(c.count('#fView [data-card]'), 1, 'only the card under the back link', what='cards')
    c.eq(norm(c.text('#fView [data-settings-back]')), norm(tx('frame/settings/settings.js', 'backToList', c.lang)), 'the way back to the settings', what='back link')
    c.until(f"document.querySelectorAll('{card} [data-ivao-redirects] li code').length === 2", what='the addresses are painted when the card is alone')
    # an older launcher: no ivaoRedirects, one line says to update it
    state['redirects'] = None
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('#fView [data-ivao-old]')", timeout=15000, what='the update line')
    c.eq(norm(c.text('#fView [data-ivao-old]')), norm(t('ivaoRedirOld')), 'update the launcher to see the return address', what='old launcher')
    c.eq(c.count('#fView [data-ivao-redirects] button'), 0, 'no address, no Copy button', what='copy buttons')


@case('A44', 'IVAO account without an application: the button off, nothing leaves; « state » only for a real stray return', 'A', designs=('standard',),
      screens=False, night=False, rule='user 30 Oct (the button stayed on, the page left and came back with « state »): without secrets/ivao_oauth.json the button is disabled (title = the reason) and nothing leaves; a stray return says what happened, never « state » alone')
def a44(c):
    starts, app = [], {'on': False}
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}

    def launcher(route):
        req = route.request
        path = urllib.parse.urlparse(req.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/ivao/oauth'):
            body = {'app': app['on'], 'relay': False}
        elif path.endswith('/__setup/ivao/oauth/start'):
            starts.append(1)
            body = {'ok': False, 'status': 409, 'message': 'no IVAO application here', 'redirect': 'http://127.0.0.1:8000/__relay/ivao/callback', 'relay': False}
            return route.fulfill(status=409, content_type='application/json', body=json.dumps(body))
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings?card=ivao', docs=LEVEL3)
    btn = '[data-card="ivao"] [data-act="ivaoConnect"]'
    c.until(f"!!document.querySelector('{btn}') && document.querySelector('{btn}').disabled", what='the button is off without an application')
    why = norm(tx('frame/settings/settings.js', 'ivaoNoAppHere', c.lang))
    c.eq(norm(c.attr(btn, 'title')), why, 'its title says why (this workstation, the file missing)', what='button title')
    c.eq(norm(c.text('[data-card="ivao"] [data-msg]')), why, 'the card says it too', what='card message')
    c.ok(c.js("!document.querySelector('[data-card=\"ivao\"] [data-ivao-app]').hidden"), '', 'the link to the IVAO application assistant (Administration)')
    c.eq(c.attr('[data-card="ivao"] [data-ivao-app] a', 'href'), '#settings?card=ivaoapp', 'the link goes to Settings\u2019 assistant', what='link')
    c.page.click(btn, force=True)                                   # even forced, a disabled button sends nothing
    c.wait(300)
    c.eq((len(starts), c.js('location.hash').split('?')[0]), (0, '#settings'), 'nothing leaves: no start, the page stays', what='after a click')
    # with an application: the button is on
    app['on'] = True
    c.go('help')
    c.go('settings?card=ivao')
    c.until(f"!!document.querySelector('{btn}')", what='the card is drawn again')
    c.wait(400)
    c.ok(not c.js(f"document.querySelector('{btn}').disabled"), '', 'with an application the button is on')
    # a stray return: the plain sentence, never the word « state »
    c.js("() => { location.hash = '#ivao-return?error=state' }")
    c.until("location.hash.startsWith('#settings')", what='the return is taken and the address replaced')
    c.until("[...document.querySelectorAll('.f-note')].some(n => n.textContent.trim())", what='a notification')
    note = norm(c.js("[...document.querySelectorAll('.f-note')].map(n => n.textContent).join(' ')"))
    c.ok(norm(tx('frame/app.js', 'ivaoFailState', c.lang)) in note and '(state)' not in note, note[:200], 'a stray return says what happened, never « (state) »')


@case('A45', 'Floating notes above a view\u2019s sticky bar', 'A', designs=('standard',), screens=False, night=False,
      rule='Features SOG 30 Oct (BUGS SOG walk, anomaly 10): on a phone Fuel\u2019s result bar (.f-bar) lay under the notes; the frame lifts .f-notes above a .f-bar stuck at the bottom while a note is shown (--f-bar-clear), never a module')
def a45(c):
    c.open('fuel', trigram='')                                      # no trigram: the frame asks in a note that stays (an action)
    c.until("!!document.querySelector('#fNotes .f-note')", what='a note is shown')
    # a bar stuck at the foot of the view, as a module draws it (.f-bar), then a resize: the frame measures it again
    c.js("""() => { const b = document.createElement('div'); b.className = 'f-bar'; b.dataset.testBar = '';
                    b.style.cssText = 'position:fixed;left:0;right:0;bottom:var(--f-tab-space,0px);height:72px';
                    b.textContent = 'Bloc'; document.getElementById('fView').append(b); dispatchEvent(new Event('resize')) }""")
    c.until("""() => { const n = document.getElementById('fNotes').getBoundingClientRect(), b = document.querySelector('[data-test-bar]').getBoundingClientRect();
                       return n.bottom <= b.top - 7 }""", what='the notes sit above the bar')
    clear = c.js("document.getElementById('fNotes').style.getPropertyValue('--f-bar-clear')")
    # the highest bar wholly in view in the lower half: this one, or the module's own when it is drawn there (Fuel's
    # « no sheet » line, now that the help goes below the module, A52)
    top = c.js("""() => Math.min(...[...document.querySelectorAll('.f-bar')].map(b => b.getBoundingClientRect())
                 .filter(r => r.height && r.top > innerHeight / 2 && r.bottom <= innerHeight + 1).map(r => r.top))""")
    c.ok(top <= c.box('[data-test-bar]')['t'] + 1, f'{top}', 'the test bar is among the bars measured')
    c.eq(float(clear.replace('px', '')), round(c.page.viewport_size['height'] - top + 8), 'the distance from the highest bar’s top to the foot, plus 8 px',
         tol=1, what='--f-bar-clear')
    # the bar taller: followed while the note is there
    c.js("() => { document.querySelector('[data-test-bar]').style.height = '120px' }")
    c.until("""() => { const n = document.getElementById('fNotes').getBoundingClientRect(), b = document.querySelector('[data-test-bar]').getBoundingClientRect();
                       return n.bottom <= b.top - 7 }""", what='the notes follow a taller bar')
    # the last note gone: nothing left on .f-notes
    c.js("() => document.querySelectorAll('#fNotes .f-note [data-x]').forEach(x => x.click())")
    c.until("!document.querySelector('#fNotes .f-note') && !document.getElementById('fNotes').style.getPropertyValue('--f-bar-clear')",
            what='no note: --f-bar-clear removed')


@case('A46', 'Applications: each one’s identity in the header, and a switcher on its name', 'A', designs=('standard',), screens=False, night=False, langs4=True,
      rule='frame/SPEC 3.1 (the user 30 Oct, Simplification’s rule): icon and tint declared in APPS (Maintenance: the plane in --sog-err, tab icon too); the name opens the list of applications, one above the device’s level greyed with its level, a tap replaces the page with ?app=… and its first module')
def a46(c):
    rows = "[...document.querySelectorAll('.f-tabpop.f-down [data-app]')].map(b => ({ id: b.dataset.app, off: b.disabled, cur: b.getAttribute('aria-current'), need: (b.querySelector('small') || {}).textContent || '' }))"
    c.open('data', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('#fApp #fAppIco svg')", what='the application’s icon in the header')
    name = tx('frame/app.js', 'name', c.lang, after='APPS.maintenance')
    titled = "document.documentElement.classList.contains('f-titled')"  # on a phone a module's title takes the name's place (rule 16)
    if not c.js(titled):
        c.eq(norm(c.text('#fName')), norm(name), 'the header names the application', what='header name')
    c.eq(c.js('document.title'), f'{name} — SOG', 'the page’s title', what='title')
    err = c.js("(() => { const p = document.createElement('i'); p.style.color = 'var(--sog-err)'; document.body.append(p); const v = getComputedStyle(p).color; p.remove(); return v })()")
    c.eq(c.js("getComputedStyle(document.getElementById('fAppIco')).color"), err, 'Maintenance’s plane is in --sog-err', what='icon tint')
    c.until("(document.querySelector('link[rel=icon]').getAttribute('href') || '').startsWith('data:image/svg+xml')", what='the tab icon is drawn in the tint')
    fav = urllib.parse.unquote(c.js("document.querySelector('link[rel=icon]').getAttribute('href')"))
    c.ok(err.replace(' ', '') in fav.replace(' ', '') and '<path' in fav, fav[:200], 'the suite’s plane, its path in the tint')
    # the switcher: Pilot and Maintenance, the current one marked; a tap on Pilot replaces the page
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop.f-down')", what='the list of applications opens under the name')
    c.eq(c.attr('#fApp', 'aria-expanded'), 'true', 'the button says it is open', what='aria-expanded')
    c.eq([(r['id'], r['off'], r['cur']) for r in c.js(rows)], [('pilot', False, None), ('maintenance', False, 'page')], 'both applications, Maintenance marked', what='rows')
    c.tap('.f-tabpop.f-down [data-app="pilot"]')
    c.until("location.search === '' && location.hash === '#fuel' && !!document.querySelector('#fApp #fAppIco svg')", timeout=15000,
            what='Pilot opens on its first module, without ?app=')
    c.eq(c.js('document.title'), f"{tx('frame/app.js', 'name', c.lang, after='APPS.pilot')} — SOG", 'the page is Pilot’s', what='title after the switch')
    c.ok(not c.js("(document.querySelector('link[rel=icon]').getAttribute('href') || '').startsWith('data:')"), '', 'Pilot keeps the file’s tab icon')
    # the device at the Full level (seeded above): Maintenance offered; at the everyday level it is greyed with its level
    c.open('fuel', docs=[['device/level.json', {'level': 2}, 'cache']])
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop.f-down')", what='the list opens')
    got = c.js(rows)
    need = tx('frame/app.js', 'appNeeds', c.lang).split('{l}')[0]
    c.eq([(r['id'], r['off'], r['cur']) for r in got], [('pilot', False, 'page'), ('maintenance', True, None)], 'below the Full level, Maintenance is greyed', what='rows at level 2')
    c.ok(norm(got[1]['need']).startswith(norm(need)), got[1]['need'], 'its level is said under it')
    c.page.keyboard.press('Escape')
    c.until("!document.querySelector('.f-tabpop')", what='Escape closes the list')
    c.eq(c.attr('#fApp', 'aria-expanded'), None, 'the button is no longer expanded', what='aria-expanded after Escape')


@case('A47', 'Administration › Folders of this computer: read-only paths, « Ouvrir » by id', 'A', designs=('standard',), screens=False, night=False, langs4=True,
      rule='V3 § 10.34 A3 « Dossiers »: the local folders the launcher knows (suite, data/, downloads, Little Navmap databases and sheets, X-Plane unknown), read only, where each comes from, « Ouvrir » sends the id only')
def a47(c):
    opened = []
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}
    rows = [{'id': 'suite', 'path': 'C:\\SOG', 'exists': True, 'from': 'install'}, {'id': 'data', 'path': 'C:\\SOG\\data', 'exists': True, 'from': 'data-option'},
            {'id': 'downloads', 'path': 'C:\\Users\\p\\Downloads', 'exists': True, 'from': 'system'},
            {'id': 'lnmdb', 'path': 'C:\\Users\\p\\AppData\\Roaming\\ABarthel\\little_navmap_db', 'exists': False, 'from': 'lnm'},
            {'id': 'lnmperf', 'path': '', 'exists': False, 'from': 'lnmperf-setting'}, {'id': 'xplane', 'path': '', 'exists': False, 'from': 'unknown'}]

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/folders'):
            body = {'folders': rows}
        elif path.endswith('/__setup/folders/open'):
            opened.append(json.loads(route.request.post_data or '{}'))
            body = {'ok': True}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings?card=admin', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-act=\"adminPanel\"][data-panel=\"folders\"]')", what='the « Dossiers du poste » entry (with a launcher)')
    c.tap('[data-act="adminPanel"][data-panel="folders"]')
    c.until("document.querySelectorAll('[data-folder]').length === 6", what='six folders listed')
    c.eq(c.js("[...document.querySelectorAll('[data-folder]')].map(li => li.dataset.folder)"), ['suite', 'data', 'downloads', 'lnmdb', 'lnmperf', 'xplane'],
         'the suite, data/, downloads, Little Navmap\u2019s databases and sheets, X-Plane', what='folders')
    c.eq(c.text('[data-folder="data"] [data-folder-path]'), 'C:\\SOG\\data', 'the path as the launcher gives it, read only (no field)', what='data path')
    c.eq(c.count('[data-card="folders"] input'), 0, 'nothing to type: paths are changed where they come from', what='inputs')
    c.eq(c.js("[...document.querySelectorAll('[data-act=folderOpen]')].map(b => b.dataset.id)"), ['suite', 'data', 'downloads'],
         '« Ouvrir » only for a folder present on the computer', what='open buttons')
    c.ok(norm(tx('frame/settings/launcher.js', 'unknown', c.lang, after='folderFrom')) in norm(c.text('[data-folder="xplane"]')), c.text('[data-folder="xplane"]'),
         'X-Plane: unknown to the launcher, said')
    c.tap('[data-act="folderOpen"][data-id="data"]')
    c.wait(300)
    c.eq(opened, [{'id': 'data'}], 'the id only goes to the launcher, never a path', what='open request')


@case('A48', 'A service screen and an older launcher: said, never a broken screen', 'A', designs=('standard',), screens=False, night=False, langs4=True,
      rule='R-C4 (30 Oct 2026, one list of routes): the frame reads the launcher’s published table (GET /__setup/routes, once); a service screen whose declared routes are not all published says the launcher is older; a launcher without the table: nothing checked')
def a48(c):
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}
    table = {'routes': [{'method': 'GET', 'path': '/__setup/devices', 'public': 'poste', 'relay': False},
                        {'method': 'POST', 'path': '/__setup/devices/revoke', 'public': 'poste', 'relay': False}]}
    asked = []

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/routes'):
            asked.append(1)
            if table is None:
                return route.fulfill(status=404, content_type='application/json', body='{"error": "inconnu"}')
            body = table
        elif path.endswith('/__setup/devices'):
            body = {'devices': [], 'pending': [], 'lan': {'on': False}, 'relay': {'on': False, 'host': ''}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    # « devices/name » not published: the screen says the launcher is older, nothing drawn from it
    c.open('devices', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-screen-old=\"devices\"]')", what='an older launcher is said')
    c.eq(norm(c.text('[data-screen-old="devices"]')), norm(tx('frame/app.js', 'screenOld', c.lang)), 'in the language of the run', what='message')
    c.eq(c.count('[data-devices]'), 0, 'the screen is not drawn', what='screen')
    # the whole table: the screen is drawn; the table is read once
    table['routes'].append({'method': 'POST', 'path': '/__setup/devices/name', 'public': 'poste', 'relay': False})
    c.open('devices', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-devices]')", what='the screen is drawn when every route is published')
    c.go('help')
    c.go('devices')
    c.until("!!document.querySelector('[data-devices]')", what='drawn again')
    c.eq(len(asked), 2, 'the table read once per page load', what='table reads')
    # a launcher without a table (older still): nothing checked, the screen as before
    table = None
    c.open('devices', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-devices]')", what='no table: the screen as before')
@case('A49', 'Provider of the data repository: read from its address, never a setting', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 6: providerOf(url) is the one classification; the remote panel names the provider; the exported configuration carries it; the pilot’s Access card follows it')
def a49(c):
    launcher_file = 'frame/settings/launcher.js'
    access_file = 'frame/settings/access.js'
    state = {'up': True, 'url': ''}
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}

    def launcher(route):
        if not state['up']:
            return route.abort()
        req = route.request
        path = urllib.parse.urlparse(req.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and req.method == 'GET':
            body = {'repo': True, 'remote': 'origin', 'url': state['url'], 'branch': 'main', 'state': 'repo', 'default': ''}
        elif path.endswith('/__setup/secrets'):
            body = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}}, 'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)

    # the pure helper: https, ssh, scp-like, framagit, a host that contains « gitlab », github, other, credentials never kept
    state['url'] = 'https://gitlab.com/grp/proj.git'
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogConfig && !!SogConfig.providerOf", what='the configuration helper is loaded')
    fixtures = [
        ('https://gitlab.com/grp/proj.git', 'gitlab', 'https://gitlab.com/grp/proj', 'grp/proj'),
        ('git@gitlab.com:grp/proj.git', 'gitlab', 'https://gitlab.com/grp/proj', 'grp/proj'),
        ('ssh://git@gitlab.mycorp.test:2222/grp/sub/proj.git', 'gitlab', 'https://gitlab.mycorp.test/grp/sub/proj', 'grp/sub/proj'),
        ('https://framagit.org/asr/flight_planner_data.git', 'gitlab', 'https://framagit.org/asr/flight_planner_data', 'asr/flight_planner_data'),
        ('https://github.com/acme/data', 'github', 'https://github.com/acme/data', 'acme/data'),
        ('git@github.com:acme/data.git', 'github', 'https://github.com/acme/data', 'acme/data'),
        ('ssh://git@git.example.org:2222/acme/data.git', 'other', 'https://git.example.org/acme/data', 'acme/data'),
        ('https://bitbucket.org/acme/data.git', 'other', 'https://bitbucket.org/acme/data', 'acme/data'),
        ('not an address', 'other', '', ''),
    ]
    for url, provider, web, project in fixtures:
        got = c.js("(u) => SogConfig.providerOf(u)", url)
        c.eq([got['provider'], got['web'], got['project']], [provider, web, project], 'provider, web page and project read from the address', what=url)
    got = c.js("(u) => JSON.stringify(SogConfig.providerOf(u))", 'https://oauth2:SECRET-TOKEN@gitlab.com/grp/proj.git')
    c.ok('SECRET' not in got and 'oauth2' not in got, got, 'credentials of an address are never kept')
    c.eq(json.loads(got)['web'], 'https://gitlab.com/grp/proj', 'the web page of an address with credentials', what='web')
    # the provider table: one frozen, closed reference (nested objects too); an unknown provider is brought back to « other » at the entry
    tab = c.js("() => { const T = SogConfig.PROVIDER_TABLE; return { ids: Object.keys(T), frozen: Object.isFrozen(T) && Object.values(T).every(e => Object.isFrozen(e) && Object.isFrozen(e.capabilities)), projectTokens: Object.fromEntries(Object.entries(T).map(([k, e]) => [k, e.capabilities.projectTokens])), labels: Object.values(T).map(e => e.label), odd: SogConfig.kind({ host: 'git.example.org', provider: 'bitbucket' }), proto: SogConfig.kind({ host: 'git.example.org', provider: '__proto__' }) } }")
    c.eq(tab, {'ids': ['github', 'gitlab', 'other'], 'frozen': True, 'projectTokens': {'github': False, 'gitlab': True, 'other': False},
               'labels': ['GitHub', 'GitLab', ''], 'odd': 'other', 'proto': 'other'}, 'a closed, deeply frozen table; GitLab alone welcomes by project token; an unknown id is other', what='provider table')
    # the exported configuration carries the provider; one read without it falls back on the host
    cfg = c.js("() => SogConfig.build({ data: { host: 'gitlab.mycorp.test', repo: 'grp/proj' }, trigram: 'ABC' }).data")
    c.eq(cfg['provider'], 'gitlab', 'the configuration carries the provider', what='build')
    ok = c.js("() => { const r = SogConfig.validate({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { host: 'github.com', repo: 'a/b' } }); return r.ok && r.cfg.data.provider }")
    c.eq(ok, 'github', 'a configuration without provider gets the one of its host', what='validate')

    def panel():
        c.until("!!document.querySelector('[data-admin=\"remote\"]')", what='the Administration card lists the remote repository')
        if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
            c.tap('[data-group="admin"] > summary')
        c.tap('[data-admin="remote"] > button')
        c.until("!!document.querySelector('[data-adminpanel=\"remote\"]:not([hidden]) [data-provider]')", what='the provider line is drawn')

    def first(sel):
        return norm(c.js(f"document.querySelector('{sel}')?.textContent || ''"))

    def txl(key):
        return norm(tx(launcher_file, key, c.lang))
    box = '[data-adminpanel="remote"] [data-provider]'
    # GitLab: the project is a link, « Pilots' tokens » leads to the Maintenance screen, one sentence on the welcome
    state['url'] = 'https://oauth2:SECRET-TOKEN@gitlab.com/grp/proj.git'
    c.page.reload(wait_until='load')
    panel()
    c.eq(c.attr(box, 'data-provider'), 'gitlab', 'the provider is read from the remote address', what='gitlab provider')
    line = txl('providerLine').replace('{p}', 'GitLab').replace('{j}', 'grp/proj')
    c.eq(first(f'{box} > p:first-child'), line, 'the line names the provider and the project', what='provider line')
    link = f'{box} a[href="https://gitlab.com/grp/proj"]'
    c.eq(c.count(link), 1, 'the project is a link to its page', what='project link')
    c.ok('noopener' in c.attr(link, 'rel'), c.attr(link, 'rel'), 'the project link has rel noopener')
    c.eq(first(f'{box} a[href="#pilot-tokens"]'), txl('providerTokens'), 'the link to the pilots’ tokens', what='tokens link')
    c.ok(txl('providerGitlab') in first(box), first(box), 'the sentence on the welcome by a project access token')
    c.ok('SECRET' not in c.js(f"document.querySelector('{box}').outerHTML"), 'a secret is shown', 'the credentials of the address are shown nowhere in the line')
    # GitHub: the sentence that proposes GitLab, no link to the tokens
    state['url'] = 'git@github.com:acme/data.git'
    c.page.reload(wait_until='load')
    panel()
    c.eq(c.attr(box, 'data-provider'), 'github', 'GitHub is read from the address', what='github provider')
    c.ok(txl('providerGithub') in first(box), first(box), 'the sentence proposing a GitLab project')
    c.eq(c.count(f'{box} a[href="#pilot-tokens"]'), 0, 'no pilots’ tokens link for GitHub', what='tokens link')
    c.eq(c.count('[data-card="remote"] [data-act="remoteSave"]'), 1, 'the way to change the repository is the existing one (the launcher’s window)', what='save button')
    # other: not recognised, nothing else
    state['url'] = 'https://git.example.org/acme/data.git'
    c.page.reload(wait_until='load')
    panel()
    c.eq(c.attr(box, 'data-provider'), 'other', 'an unknown host', what='other provider')
    c.eq(first(box), txl('providerOther'), 'provider not recognised, nothing else', what='other text')
    c.eq(c.count(f'{box} a'), 0, 'no link', what='links')

    # the pilot’s Access card (no launcher): GitLab's field and hint for a GitLab access, GitHub's otherwise
    state['up'] = False

    def keys(github):
        return [['device/keys.json', {'schema': 1, 'github': github, 'avwx': '', 'ivao': None, 'updated_at': '2026-10-30T10:00:00Z'}, 'cache']]

    def access(github):
        c.open('settings', docs=LEVEL3 + keys(github))
        c.until("!!document.querySelector('[data-card=\"access\"] input[data-f=\"repo\"]')", what='the Access card')
        return c.js("""() => { const k = document.querySelector('[data-card="access"]');
          return { ph: k.querySelector('input[data-f="repo"]').placeholder, label: k.querySelector('input[data-f="repo"]').closest('label').textContent.trim(),
                   hint: k.querySelector('p.f-msg[data-msg]').previousElementSibling.textContent.trim() } }""")
    gl = access({'provider': 'gitlab', 'api': 'https://gitlab.test/api/v4', 'repo': 'grp/proj', 'branch': 'main', 'token': 'test-token'})
    c.eq([gl['ph'], norm(gl['label']), norm(gl['hint'])],
         ['https://gitlab.com/group/project', norm(tx(access_file, 'repoGl', c.lang)), norm(tx(access_file, 'tokenHintGl', c.lang))],
         'GitLab: the field expects the project address and the hint describes the project token', what='GitLab access card')
    gh = access({'repo': 'acme/data', 'branch': 'main', 'token': 'test-token'})
    c.eq([gh['ph'], norm(gh['label']), norm(gh['hint'])],
         ['compte/flight_planner_data', norm(tx(access_file, 'repo', c.lang)), norm(tx(access_file, 'tokenHint', c.lang))],
         'GitHub keeps today’s field and hint', what='GitHub access card')


@case('A50', 'Status block: every line leads somewhere; the dot is a ringed disc in the design\'s token', 'A', designs=('standard',), screens=False,
      night=False, rule='user captures of 30 Oct (ergonomics session): the Weather line had no chevron; the warning dot read as a dirty icon')
def a50(c):
    # every status item built by the frame carries a destination (go): no line without a chevron
    src = (ROOT / 'frame' / 'app.js').read_text(encoding='utf-8')
    body = src[src.index('function statusItems()'):src.index('const statusRows')]
    pushes = re.findall(r"items\.push\(\{\s*k: '([\w-]+)'(.*?)\n    \}\)", body, re.S)
    c.ok(len(pushes) >= 5, [k for k, _ in pushes], 'the status items are found in frame/app.js')
    c.eq([k for k, rest in pushes if 'go:' not in rest], [], 'every status line has a destination (go)', what='lines without go')
    # the dot: the design's token, filled, ringed by 1 px of the same tint (a visible dot if any, else a hidden one shown for the measure)
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"status\"] .f-status-dot')", what='the status block is drawn')
    d = c.js(DOT_JS)
    c.eq([d['bg'], d['color']], [d['want'], d['want']], "the dot takes the design's token", what=f"dot colour ({d['tok']})")
    c.ok(d['ring'] not in ('', 'none') and d['want'].replace(' ', '') in d['ring'].replace(' ', ''), d['ring'], 'the dot is ringed by its own tint')
    c.check_errors()


DOT_JS = """() => { const sel = '[data-card="status"] .f-status-dot';
  const e = document.querySelector(sel + ':not([hidden])') || document.querySelector(sel); e.hidden = false;
  const s = getComputedStyle(e), tok = e.hasAttribute('data-attn') ? '--sog-warn' : '--sog-ok';
  const probe = document.createElement('i'); probe.style.color = 'var(' + tok + ')'; document.body.append(probe);
  const want = getComputedStyle(probe).color; probe.remove();
  return { bg: s.backgroundColor, color: s.color, want, ring: s.boxShadow, tok } }"""


@case('A51', 'Administration › Update the suite: channel, plan, update, the launcher to restart', 'A', designs=('standard',), screens=False, night=False, langs4=True,
      rule='V3 § 10.34 A3 « Mise à jour de la suite »: a channel, « Vérifier » (the plan, nothing changed), « Mettre à jour » only when there is something to do, after a question; a refusal said; the launcher to restart by hand')
def a51(c):
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}
    plans = {'stable': {'ok': False, 'reason': 'dirty', 'target': 'v5.4.0', 'commits': 0, 'current': {'version': 'v6.0.0-alpha.2'}},
             'early': {'ok': True, 'target': 'v6.0.0-beta.1', 'sha': 'b' * 40, 'commits': 5, 'current': {'version': 'v6.0.0-alpha.2'}}}
    posted = []

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url)
        body = {}
        if u.path.endswith('/__setup/status'):
            body = status
        elif u.path.endswith('/__setup/update') and route.request.method == 'GET':
            ch = urllib.parse.parse_qs(u.query).get('channel', [''])[0]
            body = {**plans.get(ch, {'ok': False, 'reason': 'no-target'}), 'channel': ch, 'channels': ['stable', 'early', 'suivi'], 'devBranch': 'v3'}
        elif u.path.endswith('/__setup/update'):
            posted.append(json.loads(route.request.post_data or '{}'))
            body = {'ok': True, 'done': True, 'current': {'version': 'v6.0.0-beta.1', 'branch': ''}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings?card=admin', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-act=\"adminPanel\"][data-panel=\"update\"]')", what='the « Mise à jour de la suite » entry (with a launcher)')
    c.tap('[data-act="adminPanel"][data-panel="update"]')
    c.until("!!document.querySelector('[data-card=\"update\"] [data-up-channel]')", what='the channel')
    c.ok(c.js("document.querySelector('[data-card=\"update\"] [data-act=\"upGo\"]').disabled"), '', '« Mettre à jour » is off before any plan')
    # stable: refused (local changes), said, nothing to press
    c.tap('[data-card="update"] [data-act="upCheck"]')
    c.until("!!document.querySelector('[data-card=\"update\"] [data-msg]').textContent.trim()", what='the plan is said')
    c.eq(norm(c.text('[data-card="update"] [data-msg]')), norm(tx('frame/settings/launcher.js', 'dirty', c.lang, after='upWhy')), 'a refusal said in words', what='refusal')
    c.ok(c.js("document.querySelector('[data-card=\"update\"] [data-act=\"upGo\"]').disabled"), '', 'still nothing to press')
    # early: the plan, then the update after the question
    c.page.select_option('[data-card="update"] [data-up-channel]', 'early')
    c.tap('[data-card="update"] [data-act="upCheck"]')
    c.until("!document.querySelector('[data-card=\"update\"] [data-act=\"upGo\"]').disabled", what='something to do: « Mettre à jour » on')
    c.ok('v6.0.0-beta.1' in c.text('[data-card="update"] [data-msg]') and 'v6.0.0-alpha.2' in c.text('[data-card="update"] [data-up-now]'), c.text('[data-card="update"]'),
         'the target and the installed version said')
    c.tap('[data-card="update"] [data-act="upGo"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a question first')
    c.tap('.f-modal [data-ok]')
    c.until("(document.querySelector('[data-card=\"update\"] [data-msg]').textContent || '').includes('v6.0.0-beta.1') && !document.querySelector('.f-modal')",
            what='done, said')
    c.eq(posted, [{'channel': 'early', 'target': 'b' * 40}], 'the channel and the version the check showed go to the launcher', what='request')
    c.ok('lancer.cmd' in c.text('[data-card="update"] [data-msg]'), c.text('[data-card="update"] [data-msg]'), 'the launcher to restart by hand, said')


@case('A52', 'The help panel and the welcome card go below the module: nothing moves after its first drawing', 'A', designs=('standard',), screens=False,
      night=False, rule='Simplification 30 Oct (Features SOG: M2 / M3 tapped the wrong row because the help panel pushed the page down once it arrived): the « Comment s’en servir » panel and the welcome card after the module’s element, never before it; a control of the module keeps its place when they arrive')
def a52(c):
    c.open('flightlog', flights=3)
    m = '[data-module="flightlog"]'
    c.until(f"!!document.querySelector('{m}') && !!document.querySelector('{m}').parentElement.querySelector(':scope > .f-help')", timeout=15000,
            what='the module and its help panel')
    order = c.js(f"[...document.querySelector('{m}').parentElement.children].map(e => e.matches('{m}') ? 'module' : e.matches('.f-help') ? 'help' : e.matches('[data-welcome]') ? 'welcome' : e.className)")
    c.ok(order.index('module') < order.index('help') and ('welcome' not in order or order.index('module') < order.index('welcome') < order.index('help')),
         str(order), 'the module first, then the welcome card (first opening), then the help panel')
    # a control of the module: the same place with and without what the help adds
    sel = f'{m} button, {m} a, {m} input'
    before = c.js(f"Math.round(document.querySelector('{sel}').getBoundingClientRect().top + scrollY)")
    c.js(f"() => document.querySelector('{m}').parentElement.querySelectorAll(':scope > .f-help, :scope > [data-welcome]').forEach(e => e.remove())")
    after = c.js(f"Math.round(document.querySelector('{sel}').getBoundingClientRect().top + scrollY)")
    c.eq(after, before, 'the help’s arrival moves nothing of the module', tol=0.5, what='first control top')


@case('A53', 'The frame\u2019s own benches: geometry, data layer, QR code', 'A', designs=('standard',), screens=False, night=False,
      rule='I28 (every bench opened by a case): frame/lib/test/geo.html (window.__geoBench), frame/store/test/index.html (« run », window.__results) and frame/lib/test/qr.html (its grids read back by the independent decoder qr_check.py) had no case')
def a53(c):
    import os
    import subprocess
    import sys
    import tempfile
    _bench(c, 'frame/lib/test/geo.html', '__geoBench')
    # the data layer bench runs against its own fake GitHub (frame/store/test/fake_github.py), which serves the page too
    import socket
    with socket.socket() as so:
        so.bind(('127.0.0.1', 0))
        port = so.getsockname()[1]
    fake = subprocess.Popen([sys.executable, '-I', str(ROOT / 'frame' / 'store' / 'test' / 'fake_github.py'), str(port)], cwd=str(ROOT),
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        import time
        for _ in range(100):  # the fake GitHub answers within 10 s
            try:
                socket.create_connection(('127.0.0.1', port), timeout=0.5).close()
                break
            except OSError:
                time.sleep(0.1)
        c.page.goto(f'http://127.0.0.1:{port}/frame/store/test/index.html', wait_until='load')
        c.page.click('#run')
        c.page.wait_for_function('window.__results', timeout=90000)
        r = c.js('({ total: window.__results.total, failed: window.__results.failed.map(x => x.name).slice(0, 3) })')
    finally:
        fake.kill()
        fake.wait(10)
    c.ok(r['total'] > 0 and not r['failed'], f"{r['total']} checks, first failures: {r['failed']}", 'every check of the data layer bench passes')
    c.page.goto(f'{c.base}/frame/lib/test/qr.html', wait_until='load')
    grids = c.js("document.getElementById('rows').textContent")
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f:
        f.write(grids)
    try:
        out = subprocess.run([sys.executable, '-I', str(ROOT / 'frame' / 'lib' / 'test' / 'qr_check.py'), f.name], capture_output=True,
                             text=True, encoding='utf-8', timeout=120).stdout.splitlines()
    finally:
        os.unlink(f.name)
    codes = [x for x in out if x.startswith('v')]
    bad = [x for x in out if 'OK' not in x]
    c.ok(len(codes) == 10 and not bad, f'{len(codes)} codes; {bad[:3]}', 'each QR code of the bench is read back with its text by the independent decoder')
