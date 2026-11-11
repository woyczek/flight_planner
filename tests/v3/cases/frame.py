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
import socket
import urllib.parse
from pathlib import Path

from lib import MAP_JS, ROOT, Fail, Skip, case, flight_docs, forget, norm, tx

MODULES = ('fuel', 'maps', 'atmosphere', 'report', 'flightlog')
TABS = [  # APP.tabs of frame/app.js: id, label in fr en de es, module the tab opens first
    ('prepare', ('Préparer', 'Prepare', 'Vorbereiten', 'Preparar')),
    ('maps', ('Carte', 'Map', 'Karte', 'Mapa')),
    ('weather', ('Météo', 'Weather', 'Wetter', 'Meteo')),
    ('report', ('CR', 'Report', 'Bericht', 'Informe')),
    ('flightlog', ('Vols', 'Flights', 'Flüge', 'Vuelos')),
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
    c.eq(len(rows), 2, 'rows Carburant and Fiches (Missions is the Company application since 1 Nov)', what='popover rows')
    bar = c.box('#fTabs')
    for r in rows:
        c.ok(r['h'] >= 43.5, f'row "{r["text"]}" is {r["h"]:.1f} px high', 'at least 44 px')
        c.ok(r['l'] >= 0 and r['r'] <= c.width and r['t'] >= 0, f'row "{r["text"]}" box {r["l"]:.0f}..{r["r"]:.0f}', 'inside the window')
        c.ok(r['b'] <= bar['t'] + 0.5, f'row bottom {r["b"]:.0f} > bar top {bar["t"]:.0f}', 'above the bar')
    keys = c.js("[...document.querySelectorAll('.f-tabpop-row')].map(r => r.dataset.id + (r.dataset.view ? ':' + r.dataset.view : ''))")
    c.eq(keys, ['fuel', 'fuel:sheets'], 'the rows are the module and its Sheets view', what='row keys')
    c.eq([norm(r['text']) for r in rows], [norm(tx('frame/app.js', 'label', c.lang, after="id: 'fuel'")),
                                           norm(tx('frame/app.js', 'label', c.lang, after="id: 'sheets'"))],
         'the rows read Carburant and Fiches in the language of the run', what='row labels')
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
    # the base's three notes in the run's language, by their own texts: a loose pattern (« nicht ver ») also caught the
    # terrain note « Gelände nicht verfügbar … », which comes when the bench has no relief (A15's hazard, German only)
    base3 = [pre('loading'), norm(tx(MAPS_M, 'noBase', c.lang)), norm(tx(MAPS_M, 'noAccess', c.lang))]
    c.until("""base3 => ![...document.querySelectorAll('.mp-notes > *')].some(e => {
               const t = e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(); return base3.some(b => t.startsWith(b)) })""", base3,
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
        c.eq(c.js("[...document.querySelectorAll('#fTabs a')].map(a => a.dataset.tab)"), ['prepare', 'maps', 'weather', 'report', 'flightlog'],
             'the rail has the bar\'s entries, Météo after the Map and no Settings', what=f'#{m} rail tabs')
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
    ids = re.findall(r"^\s{4}id: '([a-z0-9_]+)',", src, re.M)
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
    # the line says to download the sources of the cycle in force first (rebuilding from the old ones gives the old cycle again)
    got = norm(c.text('[data-card="status"] li[data-k="cycle-base"] .f-status-txt span'))
    word = {'fr': 'téléchargez les sources', 'en': 'download the sources', 'de': 'Quellen', 'es': 'descargue las fuentes'}[c.lang]
    c.ok(word in got and got.index(name_cur) > got.index(word) - 40 and got.count(name_cur) == 1, got, 'the sources of the cycle in force to download first, then rebuild')
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
    c.eq(c.js(rail), ['data', 'aircraft', 'admin', 'legacy'], 'Maintenance without a launcher: Données, Appareils (§ 10.34 A2), Administration, then the one entry of the V2 pages, last (SOG-0166; the help is the « ? »)', what='rail')
    c.eq(c.js(tabs), ['data', 'aircraft'], 'the phone bar of Maintenance: its modules only (help and settings are « ? » and ⚙, 31 Oct 2026)', what='tabs')
    c.eq(c.js("[...document.querySelectorAll('[data-verb]')].filter(b => !b.disabled).map(b => b.dataset.verb)"), [], 'read only without a launcher: every action grey', what='enabled [data-verb]')
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
    # the switcher: Pilot, Company and Maintenance, the current one marked; a tap on Pilot replaces the page
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop.f-down')", what='the list of applications opens under the name')
    c.eq(c.attr('#fApp', 'aria-expanded'), 'true', 'the button says it is open', what='aria-expanded')
    c.eq([(r['id'], r['off'], r['cur']) for r in c.js(rows)], [('pilot', False, None), ('company', False, None), ('maintenance', False, 'page')],
         'the three applications, Maintenance marked', what='rows')
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
    c.eq([(r['id'], r['off'], r['cur']) for r in got], [('pilot', False, 'page'), ('company', False, None), ('maintenance', True, None)],
         'below the Full level, Maintenance is greyed (Company has Missions’ level)', what='rows at level 2')
    c.ok(norm(got[2]['need']).startswith(norm(need)), got[2]['need'], 'its level is said under it')
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

    # the pure helper: https, ssh, scp-like, the public hosts (github.com, gitlab.com, framagit.org), no guess for any other host (a name that contains « gitlab » proves nothing), credentials never kept
    state['url'] = 'https://gitlab.com/grp/proj.git'
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogConfig && !!SogConfig.providerOf", what='the configuration helper is loaded')
    fixtures = [
        ('https://gitlab.com/grp/proj.git', 'gitlab', 'https://gitlab.com/grp/proj', 'grp/proj'),
        ('git@gitlab.com:grp/proj.git', 'gitlab', 'https://gitlab.com/grp/proj', 'grp/proj'),
        ('ssh://git@gitlab.mycorp.test:2222/grp/sub/proj.git', None, 'https://gitlab.mycorp.test/grp/sub/proj', 'grp/sub/proj'),
        ('https://framagit.org/asr/flight_planner_data.git', 'gitlab', 'https://framagit.org/asr/flight_planner_data', 'asr/flight_planner_data'),
        ('https://github.com/acme/data', 'github', 'https://github.com/acme/data', 'acme/data'),
        ('git@github.com:acme/data.git', 'github', 'https://github.com/acme/data', 'acme/data'),
        ('ssh://git@git.example.org:2222/acme/data.git', None, 'https://git.example.org/acme/data', 'acme/data'),
        ('https://bitbucket.org/acme/data.git', None, 'https://bitbucket.org/acme/data', 'acme/data'),
        ('not an address', None, '', ''),
    ]
    for url, provider, web, project in fixtures:
        got = c.js("(u) => SogConfig.providerOf(u)", url)
        c.eq([got['provider'], got['web'], got['project']], [provider, web, project], 'provider, web page and project read from the address', what=url)
    got = c.js("(u) => JSON.stringify(SogConfig.providerOf(u))", 'https://oauth2:SECRET-TOKEN@gitlab.com/grp/proj.git')
    c.ok('SECRET' not in got and 'oauth2' not in got, got, 'credentials of an address are never kept')
    c.eq(json.loads(got)['web'], 'https://gitlab.com/grp/proj', 'the web page of an address with credentials', what='web')
    # the provider table: one frozen, closed reference (nested objects too), no « other »
    tab = c.js("() => { const T = SogConfig.PROVIDER_TABLE; return { ids: Object.keys(T), frozen: Object.isFrozen(T) && Object.values(T).every(e => Object.isFrozen(e) && Object.isFrozen(e.capabilities) && Object.isFrozen(e.hosts)), projectTokens: Object.fromEntries(Object.entries(T).map(([k, e]) => [k, e.capabilities.projectTokens])), labels: Object.values(T).map(e => e.label) } }")
    c.eq(tab, {'ids': ['github', 'gitlab'], 'frozen': True, 'projectTokens': {'github': False, 'gitlab': True},
               'labels': ['GitHub', 'GitLab']}, 'a closed, deeply frozen table; GitLab alone welcomes by project token', what='provider table')
    # the exported configuration carries the provider it is given (A55 covers the rest of build and validate)
    cfg = c.js("() => SogConfig.build({ data: { host: 'gitlab.mycorp.test', repo: 'grp/proj', provider: 'gitlab' }, trigram: 'ABC' }).data")
    c.eq(cfg['provider'], 'gitlab', 'the configuration carries the provider', what='build')

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
    c.eq(first(f'{box} a[href="?app=maintenance#pilot-tokens"]'), norm(tx('frame/settings/kit.js', 'providerTokens', c.lang)), 'the link to the pilots’ tokens', what='tokens link')
    c.ok(txl('providerGitlab') in first(box), first(box), 'the sentence on the welcome by a project access token')
    c.ok('SECRET' not in c.js(f"document.querySelector('{box}').outerHTML"), 'a secret is shown', 'the credentials of the address are shown nowhere in the line')
    # GitHub: the sentence that proposes GitLab, no link to the tokens
    state['url'] = 'git@github.com:acme/data.git'
    c.page.reload(wait_until='load')
    panel()
    c.eq(c.attr(box, 'data-provider'), 'github', 'GitHub is read from the address', what='github provider')
    c.ok(txl('providerGithub') in first(box), first(box), 'the sentence proposing a GitLab project')
    c.eq(c.count(f'{box} a[href="?app=maintenance#pilot-tokens"]'), 0, 'no pilots’ tokens link for GitHub', what='tokens link')
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
      rule='I28 (every bench opened by a case): frame/lib/test/geo.html (window.__geoBench), frame/store/test/index.html (« run », window.__results; SOG-0029: FrameData.lastPushed names what the last send took, on a fake repository) and frame/lib/test/qr.html (its grids read back by the independent decoder qr_check.py) had no case')
def a53(c):
    import os
    import subprocess
    import sys
    import tempfile
    _bench(c, 'frame/lib/test/geo.html', '__geoBench')
    _bench(c, 'frame/lib/test/fuel_units.html', '__fuelUnitsBench')
    _bench(c, 'frame/lib/test/sw_update.html', '__swUpdateBench')
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
        # the detail too (a stack for a scenario that threw): the bench's rare failures under load are read from the report
        r = c.js("({ total: window.__results.total, failed: window.__results.failed.map(x => x.name + ' — ' + String(x.detail || '').slice(0, 300)).slice(0, 2) })")
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


@case('A54', 'The side pane closed before its module arrived: no error, never mounted afterwards', 'A', phone=False, night=False,
      rule='BUGS SOG 31 Oct (D86, the cause of F41’s hazard): on a wide screen Fuel opens the Map beside it; a navigation while the Map’s module was still loading read pane.mod (null) in closePane; the frame closes a pane whose module has not arrived without touching it, and openPane, seeing its pane gone, mounts nothing')
def a54(c):
    if not c.js("matchMedia('(min-width: 980px)').matches"):
        raise Skip('the side pane exists on a wide screen only')
    held = []
    c.context.route(re.compile(r'/modules/maps/module\.js'), lambda route: held.append(route))
    c.open('fuel', flight=True)
    if c.js("!document.querySelector('.f-pane')"):
        c.tap('#fPane')
    c.until("!!document.querySelector('.f-pane')", what='the side pane opened, its module loading')
    c.ok(held, '', 'the Map’s module is held on its way')
    c.js("() => { location.hash = '#atmosphere' }")       # the route closes the pane before its module came
    c.until("!document.querySelector('.f-pane') && !!document.querySelector('#fView section[data-module=\"atmosphere\"]')", what='the pane closed, the next module shown')
    c.context.unroute(re.compile(r'/modules/maps/module\.js'))
    for r in held:
        r.continue_()
    c.wait(800)                                            # the module comes back after its pane is gone
    shown = c.js("() => ({ view: [...document.querySelectorAll('#fView section[data-module]')].map(e => e.dataset.module), panes: document.querySelectorAll('.f-pane').length, maps: document.querySelectorAll('[data-module=\"maps\"]').length })")
    c.eq(shown, {'view': ['atmosphere'], 'panes': 0, 'maps': 0}, 'the late module is never mounted: no pane, no Map anywhere', what='after the late module')


@case('A55', 'The provider is chosen, never deduced: validate, export, remote panel, Access card', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 5: a configuration carries provider github | gitlab; without it only github.com is read as github (legacy, before 48079d78f); anything else is refused at validate; the export never writes « other »; a GitLab configuration is applied like a GitHub one')
def a51(c):
    launcher_file = 'frame/settings/launcher.js'
    settings_file = 'frame/settings/settings.js'
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
    state['url'] = 'https://git.example.org/acme/data.git'
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogConfig && !!SogConfig.validate", what='the configuration helper is loaded')

    # validate: the field is the provider; without it only github.com is read (legacy); the rest is refused at the entry
    got = c.js("""() => { const mk = d => SogConfig.validate({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: d });
      const f = r => r.ok ? r.cfg.data.provider + '|' + r.cfg.data.host : r.error;
      return { legacy: f(mk({ host: 'github.com', repo: 'a/b' })), noProvider: f(mk({ host: 'git.example.test', repo: 'a/b' })),
        bitbucket: f(mk({ host: 'bitbucket.org', repo: 'a/b', provider: 'bitbucket' })), other: f(mk({ host: 'github.com', repo: 'a/b', provider: 'other' })),
        selfHosted: f(mk({ host: 'git.example.test', repo: 'grp/proj', provider: 'gitlab' })), github: f(mk({ host: 'github.com', repo: 'a/b', provider: 'github' })) } }""")
    c.eq(got, {'legacy': 'github|github.com', 'noProvider': 'provider', 'bitbucket': 'provider', 'other': 'provider',
               'selfHosted': 'gitlab|git.example.test', 'github': 'github|github.com'},
         'no provider + github.com: github; no provider elsewhere, bitbucket, other: refused; a self-hosted GitLab: accepted with its host', what='validate')
    # build: always a provider, github or gitlab, never other
    got = c.js("""() => { const err = d => { try { SogConfig.build({ data: d, trigram: 'ABC' }); return 'written' } catch (e) { return e.message } };
      return { none: err({ host: 'x.org', repo: 'a/b' }), other: err({ host: 'x.org', repo: 'a/b', provider: 'other' }),
        gitlab: SogConfig.build({ data: { host: 'git.example.test', repo: 'a/b', provider: 'gitlab' }, trigram: 'ABC' }).data.provider,
        github: SogConfig.build({ data: { host: 'github.com', repo: 'a/b', provider: 'github' }, trigram: 'ABC' }).data.provider } }""")
    c.eq(got, {'none': 'provider', 'other': 'provider', 'gitlab': 'gitlab', 'github': 'github'}, 'the export writes github or gitlab, refuses the rest', what='build')
    # the table has no « other »; the address reader gives none when it does not know
    got = c.js("""() => ({ ids: Object.keys(SogConfig.PROVIDER_TABLE), unknown: SogConfig.providerOf('https://git.example.test/grp/proj.git').provider,
      known: SogConfig.providerOf('https://git.example.test/grp/proj.git', SogConfig.knownProviders({ provider: 'gitlab', host: 'git.example.test' }, null)).provider,
      knownOther: SogConfig.providerOf('https://git.example.test/grp/proj.git', SogConfig.knownProviders({ provider: 'gitlab', host: 'git.other.test' }, null)).provider })""")
    c.eq(got, {'ids': ['github', 'gitlab'], 'unknown': None, 'known': 'gitlab', 'knownOther': None}, 'no « other » in the table; a self-hosted remote is known by the device configuration only, for the same host', what='table')

    # an imported configuration without a provider, on another host: refused with the message, nothing changed
    link = c.js("() => SogConfig.pack({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { host: 'git.example.test', repo: 'grp/proj', branch: 'main' } })")
    c.page.goto(f'{c.base}/frame/index.html#settings?config={link}', wait_until='load')
    c.until("!!document.querySelector('[data-card=\"cfg\"] .f-msg')", timeout=15000, what='the refusal is shown')
    c.eq(norm(c.text('[data-card="cfg"] .f-msg')), norm(tx('frame/settings/kit.js', 'providerUnknown', c.lang)), 'the refusal says the provider is unknown (github or gitlab)', what='refusal')

    # remote panel: a self-hosted GitLab remote is recognised from the device configuration (same host), « non reconnu » otherwise
    def panel():
        c.until("!!document.querySelector('[data-admin=\"remote\"]')", what='the Administration card lists the remote repository')
        if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
            c.tap('[data-group="admin"] > summary')
        c.tap('[data-admin="remote"] > button')
        c.until("!!document.querySelector('[data-adminpanel=\"remote\"]:not([hidden]) [data-provider]')", what='the provider line is drawn')
    box = '[data-adminpanel="remote"] [data-provider]'

    def keys(api):
        return [['device/keys.json', {'schema': 1, 'github': {'provider': 'gitlab', 'api': api, 'repo': 'grp/proj', 'branch': 'main', 'token': 'test-token'},
                                      'avwx': '', 'ivao': None, 'updated_at': '2026-10-30T10:00:00Z'}, 'cache']]
    state['url'] = 'https://git.example.test/grp/proj.git'
    c.open('settings', docs=LEVEL3)
    panel()
    c.eq([c.attr(box, 'data-provider'), norm(c.text(box))], ['other', norm(tx(launcher_file, 'providerOther', c.lang))], 'a self-hosted remote the device does not know: not recognised', what='unknown remote')
    c.open('settings', docs=LEVEL3 + keys('https://git.example.test/api/v4'))
    panel()
    c.eq(c.attr(box, 'data-provider'), 'gitlab', 'the device configuration says gitlab on the same host: recognised', what='known remote')
    c.open('settings', docs=LEVEL3 + keys('https://git.other.test/api/v4'))
    panel()
    c.eq(c.attr(box, 'data-provider'), 'other', 'another host: not recognised', what='other host')

    # export from the workstation: refused for an unknown remote, written with provider gitlab for a known one
    def export(app='https://example.test/v3/frame/'):
        c.tap('[data-admin="addPilot"] > button')
        c.page.fill('[data-adminpanel="addPilot"] input[data-f="apTri"]', 'ABC')
        c.page.fill('[data-adminpanel="addPilot"] input[data-f="apApp"]', app)
        c.tap('[data-adminpanel="addPilot"] [data-act="pilotMake"]')
        c.wait(800)

    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-admin=\"addPilot\"]')", what='the « Ajouter un pilote » line (the export)')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    export()
    c.eq(norm(c.js("document.querySelector('[data-adminpanel=\"addPilot\"] [data-xmsg]').textContent")), norm(tx('frame/settings/kit.js', 'providerUnknown', c.lang)), 'an unknown source: the export is refused with the message', what='export refusal')
    c.eq(c.js("document.querySelector('[data-adminpanel=\"addPilot\"] [data-cfgout]').hidden"), True, 'nothing is written', what='export output')
    c.open('settings', docs=LEVEL3 + keys('https://git.example.test/api/v4'))
    c.until("!!document.querySelector('[data-admin=\"addPilot\"]')", what='the « Ajouter un pilote » line (the export)')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    export()
    out = c.js("document.querySelector('[data-adminpanel=\"addPilot\"] [data-cfglink]').value")
    cfg = c.js("(l) => SogConfig.unpack(l.split('config=')[1])", out)
    c.eq([cfg['data']['provider'], cfg['data']['host'], cfg['data']['repo']], ['gitlab', 'git.example.test', 'grp/proj'], 'the export writes the provider the device configuration gave', what='exported data')

    # the Access side without a launcher: a GitLab configuration is applied on the device, like a GitHub one
    state['up'] = False
    got = c.js("""() => SogConfig.validate({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { host: 'git.example.test', repo: 'grp/proj', branch: 'main', provider: 'gitlab' } }).cfg""")
    sent = _gl_instance(c, 'git.example.test', who={'bot': True, 'scopes': ['api'], 'expires': '2099-01-01'})   # the instance answers branch, user and token alike
    c.open('settings', docs=LEVEL3 + [['device/join.json', {'cfg': got, 'step': 5, 'done': {}}, 'cache']])
    c.page.evaluate("location.hash = '#settings?join=1'")
    c.until("!!document.querySelector('[data-jact=\"test\"]')", timeout=15000, what='the token step is offered (the steps of an access set here)')
    c.eq(norm(c.text('[data-jact="test"]')), ('Tester', 'Test', 'Testen', 'Probar')[LANG_IX[c.lang]], 'the button tests the token (a device access), it does not clone', what='step 5 button')
    c.page.fill('input[data-f="jToken"]', 'test-token')
    c.tap('[data-jact="test"]')
    c.until("!!window.FrameData?.github?.config()", timeout=15000, what='the access is saved')
    saved = c.js("(() => { const g = FrameData.github.config(); return { provider: g.provider, api: g.api, repo: g.repo } })()")
    c.eq(saved, {'provider': 'gitlab', 'api': 'https://git.example.test/api/v4', 'repo': 'grp/proj'}, 'the device now reads the GitLab project of the configuration', what='saved access')
    c.ok(sent and all(x[1] == 'test-token' for x in sent), str(sent), 'the token was sent to the configuration’s host, and only there (the route catches that host alone)')


@case('A56', 'A configuration never imports an api: a forged « Join » link cannot send the pilot\u2019s token to another host', 'A', designs=('standard',), screens=False,
      night=False, rule='frame/settings SPEC 5 (security review, line 118): a received configuration carries no api, not even a local one; github is api.github.com and any other api refuses the configuration; gitlab recomputes its API from data.host and ignores any api; the export never writes api; Join passes no received api to the transport')
def a56(c):
    settings_file = 'frame/settings/settings.js'
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())  # no launcher: the token is tested by the device itself
    # two benches on free ports, both must receive nothing: another host (127.0.0.2) and a service of the pilot\u2019s workstation (127.0.0.1)
    benches = []
    for ip in ('127.0.0.2', '127.0.0.1'):
        srv = socket.socket()
        srv.bind((ip, 0))
        srv.listen(4)
        srv.settimeout(0.5)
        benches.append(srv)
    foreign, local = f'https://127.0.0.2:{benches[0].getsockname()[1]}', f'http://127.0.0.1:{benches[1].getsockname()[1]}'
    seen = []
    ports = [str(b.getsockname()[1]) for b in benches]
    c.context.on('request', lambda r: seen.append(r.url) if 'evil.example' in r.url or urllib.parse.urlparse(r.url).port in [int(p) for p in ports] else None)
    try:
        c.open('settings', docs=LEVEL3)
        c.until("!!window.SogConfig && !!SogConfig.validate", what='the configuration helper is loaded')
        got = c.js("""([f, l]) => { const mk = d => SogConfig.validate({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { repo: 'a/b', ...d } });
          const r = x => x.ok ? 'ok:' + (x.cfg.data.api ?? '-') : x.error + ':' + (x.field || '');
          return { evil: r(mk({ host: 'github.com', provider: 'github', api: 'https://evil.example' })),
            foreign: r(mk({ host: 'github.com', provider: 'github', api: f })),
            legacy: r(mk({ host: 'github.com', api: 'https://evil.example/api' })),
            local: r(mk({ host: 'github.com', provider: 'github', api: l })),
            localhost: r(mk({ host: 'github.com', provider: 'github', api: 'http://localhost:8811/api' })),
            official: r(mk({ host: 'github.com', provider: 'github', api: 'https://api.github.com' })),
            gitlab: r(mk({ host: 'git.example.test', provider: 'gitlab', api: 'https://evil.example/api/v4' })),
            gitlabLocal: r(mk({ host: 'git.example.test', provider: 'gitlab', api: l })) } }""", [foreign, local])
        c.eq(got, {'evil': 'field:data.api', 'foreign': 'field:data.api', 'legacy': 'field:data.api', 'local': 'field:data.api',
                   'localhost': 'field:data.api', 'official': 'ok:-', 'gitlab': 'ok:-', 'gitlabLocal': 'ok:-'},
             'github: only api.github.com (nothing kept), any other api refused, a local one too; gitlab: any api ignored', what='validate')
        got = c.js("""() => ['github', 'gitlab'].map(p => SogConfig.build({ data: { host: p === 'github' ? 'github.com' : 'git.example.test', repo: 'a/b',
          provider: p, api: 'https://evil.example' }, trigram: 'ABC' }).data.api ?? '-')""")
        c.eq(got, ['-', '-'], 'the export never writes api', what='build')

        # a forged « Join » link with an api (another host, a local service): refused with the field named, nothing saved
        for api in (foreign, local):
            link = c.js("""(a) => SogConfig.pack({ schema: 'sog-config/1', identity: { trigram: 'ABC' },
              data: { host: 'github.com', repo: 'acme/data', branch: 'main', provider: 'github', api: a } })""", api)
            c.page.goto(f'{c.base}/frame/index.html#settings?config={link}', wait_until='load')
            c.until("!!document.querySelector('[data-card=\"cfg\"] .f-msg')", timeout=15000, what='the refusal is shown')
            c.eq(norm(c.text('[data-card="cfg"] .f-msg')), norm(tx(settings_file, 'cfgBadField', c.lang).replace('{f}', 'data.api')),
                 'the forged link is refused, the field is named', what=f'refusal ({api})')
            c.eq(c.js("!window.FrameData?.github?.config()"), True, 'no access is saved', what=f'nothing saved ({api})')

        # Join itself (a configuration that got past validate, as if forged in the device state): no received api reaches the
        # transport, the token goes to api.github.com only
        sent = []
        c.context.route(re.compile(r'https://api\.github\.com/'), lambda r: (sent.append([urllib.parse.urlparse(r.request.url).path, r.request.headers.get('authorization')]),
                                                                            r.fulfill(status=200, content_type='application/json', body=json.dumps({'object': {'sha': 'abc123'}})))[1])
        for api in (foreign, local):
            sent.clear()
            cfg = {'schema': 'sog-config/1', 'identity': {'trigram': 'ABC'}, 'data': {'host': 'github.com', 'repo': 'acme/data', 'branch': 'main', 'provider': 'github', 'api': api}}
            c.open('settings', docs=LEVEL3 + [['device/join.json', {'cfg': cfg, 'step': 5, 'done': {}}, 'cache']])
            c.page.evaluate("location.hash = '#settings?join=1'")
            c.until("!!document.querySelector('[data-jact=\"test\"]')", timeout=15000, what='the token step is offered')
            c.page.fill('input[data-f="jToken"]', 'test-token')
            c.tap('[data-jact="test"]')
            for _ in range(100):
                if sent:
                    break
                c.wait(100)
            c.until("!!window.FrameData?.github?.config()", timeout=15000, what='the access is saved')
            c.eq(c.js("FrameData.github.config().api ?? '-'"), '-', 'the saved access has no api: api.github.com', what=f'saved access ({api})')
            c.ok(['/repos/acme/data/git/ref/heads/main', 'Bearer test-token'] in sent and all(x[1] == 'Bearer test-token' for x in sent), str(sent[:3]),
                 f'the token was tested against api.github.com, and only there ({api})')
        reached = []
        for srv in benches:
            try:
                srv.accept()[0].close()
                reached.append(True)
            except (socket.timeout, TimeoutError):
                reached.append(False)
        c.eq([reached, seen], [[False, False], []], 'nothing went out to a received api: no bench received a connection, the page made no request', what='no call out')
    finally:
        for srv in benches:
            srv.close()


# the airline's first read held for ever, and a module that hands over its ctx. Since 9 Nov 2026 (§ 10.38) the frame reads the current airline
# with FrameData.airline() (it was the adapter « frame-airline »): that is the call held; the adapter's get too, for the files it still reads
HOLD_AIRLINE = """(() => { let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set(v) {
  const adapter = v.adapter; v.adapter = cfg => { const a = adapter(cfg);
    if (cfg && cfg.id === 'frame-airline') a.get = () => new Promise(() => {}); return a };
  v.airline = () => new Promise(() => {});
  fd = v } }) })()"""
CTX_MODULE = "export const meta = { id: 'atmosphere' }; export function mount(el, ctx) { window.__ctx = ctx; el.textContent = 'ctx' }; export function unmount() {}"


@case('A57', 'Outgoing calls while the airline is still being read: tiles leave at once, an unlisted host is refused within 3 s, never allowed', 'A',
      designs=('standard',), screens=False, night=False,
      rule='Simplification 31 Oct (BUGS SOG, D86 / D87: the Map’s section sometimes never built under load; not reproduced): ctx.net.fetch waits for the airline’s first read only for a host that could be its site, 3 s at most; a DIRECT_PATHS host (relief tiles) never waits; after the wait the decision is the one without an airline site: an unlisted host is refused (503), never allowed by default')
def a57(c):
    import time as _t
    asked = []
    c.context.add_init_script(HOLD_AIRLINE)
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=CTX_MODULE))
    c.context.route(re.compile(r'https://s3\.amazonaws\.com/elevation-tiles-prod/.*'), lambda r: (asked.append('tile'), r.fulfill(status=200, body=b'png'))[1])
    c.context.route(re.compile(r'https://unlisted\.example/.*'), lambda r: (asked.append('unlisted'), r.fulfill(status=200, body='ok'))[1])
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    t0 = _t.time()
    # each call bounded here at 8 s: without a bound in the frame, it never answers (« hung »)
    call = "(u) => Promise.race([window.__ctx.net.fetch(u).then(r => r.status), new Promise(r => setTimeout(() => r('hung'), 8000))])"
    tile = c.js(call, 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/1/0/0.png')
    t1 = _t.time()
    c.eq((tile, 'tile' in asked), (200, True), 'a relief tile leaves at once while the airline is still being read', what='tile')
    c.ok(t1 - t0 < 1.5, f'{t1 - t0:.1f} s', 'the tile did not wait for the airline')
    first = c.js(call, 'https://unlisted.example/a')
    t2 = _t.time()
    again = c.js(call, 'https://unlisted.example/b')
    c.eq((first, again, 'unlisted' in asked), (503, 503, False), 'an unlisted host: refused during and after the wait, never asked', what='unlisted host')
    c.ok(2.5 < t2 - t1 < 4, f'{t2 - t1:.1f} s', 'the wait for the airline is bounded (3 s), then the decision is taken without it')


@case('A58', 'The IVAO number field says « VID IVAO », and its digits-only refusal names it', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings DECISIONS 31 Oct (debt of R-S9 2/2): the identity field of the IVAO number had the account card\u2019s title as its label; one key per meaning, kit.js ivaoVid for the field (identity and Join), ivao for the card')
def a58(c):
    # written here, not read from a text key: the case must fail while the field borrows another key
    vid = {'fr': 'VID IVAO', 'en': 'IVAO VID', 'de': 'IVAO-VID', 'es': 'VID IVAO'}[c.lang]
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"identity\"] input[data-f=\"ivao\"]')", what='the identity card is drawn')
    c.js("document.querySelector('[data-card=identity]').closest('details')?.setAttribute('open', '')")
    label = c.js("document.querySelector('[data-card=\"identity\"] input[data-f=\"ivao\"]').closest('label').firstChild.textContent")
    c.eq(norm(label), norm(vid), 'the field of the IVAO number is labelled with its VID', what='identity field')
    c.page.fill('[data-card="identity"] input[data-f="ivao"]', '12a')
    c.tap('[data-card="identity"] [data-act="identity"]')
    c.until("!!document.querySelector('[data-card=\"identity\"] .f-msg')?.textContent", what='the refusal is said')
    c.ok(vid in c.text('[data-card="identity"] .f-msg'), c.text('[data-card="identity"] .f-msg'), 'the digits-only refusal names the VID field')


@case('A59', 'One active entry; « ? » and ⚙ top right in every application; the help of the shown application', 'A', designs=('standard',),
      screens=False, night=False, langs4=True,
      rule='Simplification 31 Oct, corrected after the user\u2019s return on cc6503ee0: (1) « ? » and \u2699 are top right in every application, Maintenance included, the state dot on \u2699; (2) an application\u2019s bar carries its modules only (Maintenance: Data, Aircraft at its level), a one-entry bar stays shown and marked; (3) one active entry: the module shown, none of the bar over the help or the settings; (4) the help is the shown application\u2019s manual, at the module\u2019s chapter, without Pilot\u2019s tutorials')
def a59(c):
    current = "[...document.querySelectorAll('#fTabs a[aria-current=\"page\"]')].map(a => a.dataset.tab)"
    tabs = "[...document.querySelectorAll('#fTabs a[data-tab]')].map(a => a.dataset.tab)"
    shown = "id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' }"
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('#fTabs a[data-tab=\"data\"]')", timeout=15000, what='the bar of Maintenance')
    c.ok(set(c.js(tabs)) <= {'data', 'aircraft'} and 'data' in c.js(tabs), str(c.js(tabs)), 'the bar carries Maintenance\u2019s modules only (no Administration, no Help)')
    c.eq(c.js(current), ['data'], 'on the Data module: Data, marked', what='active tabs on Data')
    c.eq([c.js(shown, 'fHelp'), c.js(shown, 'fDevice')], [True, True], '« ? » and \u2699 top right, as in Pilot', what='header buttons')
    # the help: nothing of the bar marked; Maintenance's manual at the Data chapter, without Pilot's tutorials
    c.tap('#fHelp')
    c.until("location.hash.startsWith('#help') && !!document.querySelector('#fView [data-chapter]')", timeout=10000, what='the help screen')
    c.eq(c.js(current), [], 'on the help: no entry of the bar marked (the pressed « ? » is the active one)', what='active tabs on Help')
    title = (ROOT / 'frame' / 'help' / f'intro-maintenance.{c.lang}.md').read_text(encoding='utf-8').splitlines()[0].lstrip('# ').strip()
    got = c.js("""() => ({ title: (document.querySelector('#fView [data-doc] h1') || {}).textContent || '', chapters: [...document.querySelectorAll('#fView [data-chapter]')].map(s => s.dataset.chapter),
        start: !!document.querySelector('#fView [data-start]'), hash: location.hash })""")
    c.eq(norm(got['title']).rstrip('#\u00b6 ').strip(), norm(title), 'the manual of Maintenance, not Pilot\u2019s', what='manual title')
    c.ok('data' in got['chapters'] and 'fuel' not in got['chapters'] and 'settings' in got['chapters'], str(got['chapters']), 'its chapters: Data, Aircraft, Settings; no Pilot module')
    c.ok(not got['start'], '', 'no « Start with… » of Pilot\u2019s tutorials')
    c.ok('m=data' in got['hash'], got['hash'], 'opened at the chapter of the module shown')
    # the settings: nothing of the bar marked
    c.tap('#fDevice')
    c.until("location.hash.startsWith('#settings')", timeout=10000, what='the settings screen')
    c.eq(c.js(current), [], 'on the settings: no entry of the bar marked (the pressed \u2699 is the active one)', what='active tabs on Settings')
    # Pilot: the same header, its help marks no tab
    c.open('fuel', wait=False)
    c.until("!!document.querySelector('#fTabs a[data-tab=\"prepare\"]')", timeout=15000, what='the bar of Pilot')
    c.eq([c.js(shown, 'fHelp'), c.js(shown, 'fDevice')], [True, True], 'Pilot: « ? » and \u2699 in its header', what='Pilot header buttons')
    c.tap('#fHelp')
    c.until("location.hash.startsWith('#help')", timeout=10000, what='Pilot\u2019s help')
    c.eq(c.js(current), [], 'Pilot\u2019s help: no tab marked', what='active tabs on Pilot help')


@case('A60', 'With a launcher, the Access card says where the repository and its provider are, and its link opens that panel', 'A', designs=('standard',), screens=False,
      night=False, rule='frame/settings SPEC 3 (user, 31 Oct: « je ne trouve plus le setting gitlab vs github sur un terminal avec lanceur »): no setting, the provider is read from the remote\u2019s address; the Access card names the place and links to Administration › Remote repository of data/, which names the provider')
def a60(c):
    launcher_file = 'frame/settings/launcher.js'
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and route.request.method == 'GET':
            body = {'repo': True, 'remote': 'origin', 'url': 'https://gitlab.com/acme/data.git', 'branch': 'main', 'state': 'repo', 'default': ''}
        elif path.endswith('/__setup/secrets'):
            body = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}}, 'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings', docs=[['device/level.json', {'level': 1}, 'cache']])
    c.until("!!document.querySelector('[data-card=access] [data-provider-where] a')", timeout=15000, what='the Access card names the place')
    c.eq(norm(c.text('[data-card="access"] [data-provider-where]')), norm(tx(launcher_file, 'accessProvider', c.lang)),
         'the Access card says where the repository and its provider are', what='where')
    c.eq(c.attr('[data-card="access"] [data-provider-where] a', 'href'), '#settings?card=admin&panel=remote', 'a direct link to the panel', what='link')
    c.tap('[data-card="access"] [data-provider-where] a')
    c.until("!!document.querySelector('[data-adminpanel=remote]:not([hidden]) [data-provider]')", timeout=15000, what='the remote panel is open')
    c.eq(c.attr('[data-adminpanel="remote"] [data-provider]', 'data-provider'), 'gitlab', 'the panel names the provider read from the address', what='provider')
    c.eq(c.attr('[data-act="adminPanel"][data-panel="remote"]', 'aria-expanded'), 'true', 'its button says it is open', what='expanded')
    word = {'fr': 'GitHub ou GitLab', 'en': 'GitHub or GitLab', 'de': 'GitHub oder GitLab', 'es': 'GitHub o GitLab'}[c.lang]
    c.ok(word in c.text('[data-admin="remote"]'), c.text('[data-admin="remote"]')[:200], 'the panel\u2019s line says the provider is read from the address')


@case('A61', 'Access card: a repository address is normalised before anything is written, its provider said under the field', 'A', designs=('standard',),
      screens=False, night=False, rule='frame/settings SPEC 3 (bug, 31 Oct: « framagit.org/asr/flight_planner » typed on a phone was taken for a GitHub repository): host/account/repo, https://, .git and git@host: give one canonical https://host/path.git; incomplete or unknown provider refused with its reason, nothing written; after saving, « Synchronise now » is the button of the saved note, never a blocking question')
def a61(c):
    access_file = 'frame/settings/access.js'
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())  # a phone: no launcher
    c.context.route(re.compile(r'https://(framagit\.org|api\.github\.com)/'), lambda r: r.abort())  # nothing leaves in the case
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogConfig && !!document.querySelector('[data-card=access] [data-f=repo]')", timeout=15000, what='the Access card')
    c.js("document.querySelector('[data-card=access]').closest('details')?.setAttribute('open', '')")
    got = c.js("""() => ['framagit.org/asr/flight_planner', 'https://framagit.org/asr/flight_planner', 'https://framagit.org/asr/flight_planner.git',
      'git@framagit.org:asr/flight_planner.git', 'acme/data', 'framagit.org/asr', 'bitbucket.org/acme/data']
      .map(v => { const n = SogConfig.normalizeRepo(v, []); return n.ok ? [n.url, n.provider, n.value] : n.error })""")
    canon = ['https://framagit.org/asr/flight_planner.git', 'gitlab', 'https://framagit.org/asr/flight_planner']
    c.eq(got, [canon, canon, canon, canon, ['https://github.com/acme/data.git', 'github', 'acme/data'], 'incomplete', 'provider'],
         'four forms give one canonical address and GitLab; account/repo alone is GitHub; an incomplete address and an unknown host are refused', what='normalise')

    # the line under the field says the provider before saving, or why it is refused
    line = '[data-card="access"] [data-repo-provider]'
    c.page.fill('[data-card="access"] [data-f="repo"]', 'framagit.org/asr/flight_planner')
    c.eq(norm(c.text(line)), norm(tx(access_file, 'repoProvider', c.lang).replace('{p}', 'GitLab').replace('{u}', canon[0])), 'the provider and the canonical address under the field', what='provider line')
    c.eq(c.js("document.querySelector('[data-card=access] [data-repo-warn]').hidden"), True, 'a public GitLab host: no warning', what='no warning')
    # refused: nothing written
    c.page.fill('[data-card="access"] [data-f="repo"]', 'framagit.org/asr')
    c.eq(c.attr(line, 'data-state'), 'incomplete', 'an incomplete address is said at once', what='incomplete line')
    c.page.fill('[data-card="access"] [data-f="token"]', 'test-token')
    c.tap('[data-card="access"] [data-act="access"]')
    c.until("!!document.querySelector('[data-card=access] [data-msg]')?.textContent", what='the refusal is said')
    c.eq(norm(c.text('[data-card="access"] [data-msg]')), norm(tx(access_file, 'repoIncomplete', c.lang)), 'refused with its reason', what='refusal')
    c.eq(c.js("!FrameData.github.config()"), True, 'nothing is written', what='nothing saved')
    # saved in its canonical form, then « Synchronise now » offered
    c.page.fill('[data-card="access"] [data-f="repo"]', 'git@framagit.org:asr/flight_planner.git')
    c.page.fill('[data-card="access"] [data-f="token"]', 'test-token')
    c.tap('[data-card="access"] [data-act="access"]')
    c.until("[...document.querySelectorAll('.f-note [data-act]')].some(b => b.textContent.trim())", timeout=15000, what='the note after saving')
    c.eq([norm(b) for b in c.js("[...document.querySelectorAll('.f-note [data-act]')].map(b => b.textContent)")], [norm(tx(access_file, 'syncNow', c.lang))],
         '« Synchronise now » is offered by the note\u2019s button after saving, never a blocking question', what='sync offered')
    c.eq(c.count('.f-modal'), 0, 'no blocking question', what='no modal')
    saved = c.js("(() => { const g = FrameData.github.config(); return [g.provider, g.api, g.repo] })()")
    c.eq(saved, ['gitlab', 'https://framagit.org/api/v4', 'asr/flight_planner'], 'the device reads the GitLab project, whatever form was typed', what='saved access')
    # a self-hosted GitLab the device's access names (same host): accepted, warned under the field, never refused
    keys = [['device/keys.json', {'schema': 1, 'github': {'provider': 'gitlab', 'api': 'https://git.example.test/api/v4', 'repo': 'grp/proj', 'branch': 'main',
                                                          'token': 'test-token'}, 'avwx': '', 'ivao': None, 'updated_at': '2026-10-31T10:00:00Z'}, 'cache']]
    c.open('settings', docs=LEVEL3 + keys)
    c.until("!!document.querySelector('[data-card=access] [data-f=repo]')", timeout=15000, what='the Access card again')
    c.js("document.querySelector('[data-card=access]').closest('details')?.setAttribute('open', '')")
    # a token is already saved: the field says it in SHORT (its placeholder), the line under it says it in full — two meanings, two texts (R-S9 debt)
    c.eq([norm(c.js("document.querySelector('[data-card=access] [data-f=token]').placeholder")), norm(c.text('[data-card=access] [data-token-set]'))], [norm(tx(access_file, 'tokenKept', c.lang)), norm(tx(access_file, 'tokenSet', c.lang))], 'a saved token: the field’s placeholder is the short text, the line under it the long one', what='token texts')
    c.page.fill('[data-card="access"] [data-f="repo"]', 'git.example.test/grp/proj')
    c.eq([c.attr(line, 'data-state'), c.js("document.querySelector('[data-card=access] [data-repo-warn]').hidden"),
          norm(c.text('[data-card="access"] [data-repo-warn]'))], ['gitlab', False, norm(tx(access_file, 'repoOtherGitlab', c.lang))],
         'another GitLab host: accepted as GitLab, with the warning that the page reaches only the providers it allows', what='self-hosted warned')


# a GitLab setting whose api has no scheme (typed by hand): the transport cannot be built
GITLAB_BAD = ("try { localStorage.setItem('githubData:frame', JSON.stringify({ provider: 'gitlab', repo: 'grp/proj', api: 'gitlab.example/api/v4', "
              "branch: 'main', token: 'glpat_test' })) } catch (e) {}")


@case('A62', 'Synchronisation errors named: « offline » only when the browser says so, an invalid repository address, one note per key', 'A',
      designs=('standard',), screens=False, night=False,
      rule='Simplification 31 Oct (the user’s phone: « offline » while online since the day before, two identical notes stacked): an exception of fetch while online is « repository unreachable (host) », never offline; an address the transport cannot use is a named configuration error whose status line leads to the Access card; the same note replaces the one shown')
def a62(c):
    c.context.add_init_script(GITLAB_BAD)
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=CTX_MODULE))
    c.open('atmosphere', wait=False, docs=[['device/usages.json', {'devices': True}, 'cache']])
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    # an address the transport cannot call: a named configuration error, never « offline »
    c.eq(c.js("() => FrameData.sync().then(r => r.error)"), 'invalid repository address', 'an invalid address is a named configuration error', what='sync error')
    c.eq(c.js("() => FrameData.status().then(s => s.lastError)"), 'invalid repository address', 'kept as the last error', what='last error')
    # a fetch that fails while online: named, with the host only
    call = """() => FrameData.git.caller({ headers: () => ({}), refuse: () => ({}) })('https://sog-unreachable.invalid/a/b?token=x')
        .then(() => 'answered', e => ({ offline: !!e.offline, unreachable: !!e.unreachable, msg: e.message }))"""
    c.eq(c.js(call), {'offline': False, 'unreachable': True, 'msg': 'unreachable: sog-unreachable.invalid (TypeError)'},
         'online, a failing fetch is « unreachable: <host> », never offline, never the whole address', what='online failure')
    c.context.set_offline(True)
    try:
        got = c.js(call)
    finally:
        c.context.set_offline(False)
    c.eq(got.get('offline'), True, '« offline » when the browser says so', what='offline')
    # one note per key
    c.js("() => { window.__ctx.notify('SOG note x', 'warn'); window.__ctx.notify('SOG note x', 'warn'); window.__ctx.notify('SOG note y', 'warn') }")
    shown = "[...document.querySelectorAll('#fNotes .f-note')].map(n => n.textContent).filter(t => t.includes('SOG note'))"
    if c.phone:     # one floating note at a time on a phone (SOG-0131): the same note replaced the one shown, the other waits its turn
        c.eq(len(c.js(shown)), 1, 'the same note replaces the one shown; another note waits (one at a time on a phone)', what='notes')
        c.js("() => document.querySelector('#fNotes .f-note [data-x]').click()")
        c.eq(len(c.js(shown)), 1, 'it appears when the first is closed', what='second note')
    else:
        c.eq(len(c.js(shown)), 2, 'the same note replaces the one shown; another note stays', what='notes')



@case('A63', 'The repository’s real answer: status, a phrase for the frequent cases, the last five failures kept', 'A', designs=('standard',),
      screens=False, night=False,
      rule='Simplification 31 Oct (the user, GitLab still failing « without the log of the error »): the last error says the provider, the HTTP status and the server’s message cut at 120 signs, never the token; 404, 401, 403 and a 400 on the branch said in words; the diagnostic keeps the last five failures')
def a63(c):
    answer = {'status': 404, 'message': 'Not Found'}
    c.context.add_init_script(GITHUB_SET)
    c.context.route(re.compile(r'^https://api\.github\.com/'), lambda r: r.fulfill(status=answer['status'], content_type='application/json',
                                                                                   body=json.dumps({'message': answer['message']})))
    c.open('atmosphere', wait=False, docs=[['device/usages.json', {'devices': True}, 'cache']])
    c.until('!!window.FrameData && FrameData.status', timeout=15000, what='the data layer')
    for _ in range(100):  # the device's GitHub transport plugged in (loadDevice), before the first pass
        if c.js("() => FrameData.status().then(s => s.transport)") == 'github':
            break
        c.wait(100)
    row = "() => { const b = document.querySelector('[data-card=\"status\"] [data-k=\"data\"]'); return b ? b.textContent : '' }"
    got = []
    for status, message in ((404, 'Not Found'), (401, 'Bad credentials')):
        answer.update(status=status, message=message)
        err = c.js("() => FrameData.sync().then(r => r.error)")
        c.page.evaluate("location.hash = '#settings'")
        c.until("!!document.querySelector('[data-card=\"status\"] [data-k=\"data\"]')", timeout=10000, what='the Status block')
        got.append((err, norm(c.js(row))))
        c.page.evaluate("location.hash = '#atmosphere'")
    c.eq([g[0] for g in got], ['GitHub 404: Not Found', 'GitHub 401: Bad credentials'], 'the last error: provider, status, server’s message (never « offline »)',
         what='errors')
    c.ok('dépôt introuvable ou jeton sans accès (GitHub 404)' in got[0][1] and 'jeton refusé ou expiré (GitHub 401)' in got[1][1], str([g[1] for g in got]),
         'the Status block says the phrase of the status and the provider')
    c.ok(all('ghp_test' not in g[1] for g in got), '', 'never the token')
    fails = c.js("() => FrameData.diagnostic().then(d => d.failures.map(f => f.error))")
    c.eq(fails[:2], ['GitHub 401: Bad credentials', 'GitHub 404: Not Found'], 'the diagnostic keeps the last failures, the newest first', what='failures')



# a self-hosted GitLab repository: a host the page does not allow (connect-src)
GITLAB_SELF = ("try { localStorage.setItem('githubData:frame', JSON.stringify({ provider: 'gitlab', repo: 'grp/proj', api: 'https://gitlab.example/api/v4', "
               "branch: 'main', token: 'glpat_test' })) } catch (e) {}")


@case('A64', 'A repository host the page does not allow (CSP): said as such, naming the host only', 'A', designs=('standard',), screens=False,
      night=False, langs4=True,
      rule='Sécurisation 31 Oct: a self-hosted GitLab stays blocked by the static site’s CSP (wanted, a second barrier); the error says « host not allowed by the page (CSP) » naming the host only, in the run’s language')
def a64(c):
    def strict(route):
        r = route.fetch()
        route.fulfill(response=r, headers={**r.headers, 'content-security-policy': "connect-src 'self' https://api.github.com https://gitlab.com"})
    c.context.route(re.compile(r'/frame/index\.html'), strict)
    c.context.add_init_script(GITLAB_SELF)
    c.open('atmosphere', wait=False, docs=[['device/usages.json', {'devices': True}, 'cache']])
    c.until('!!window.FrameData && FrameData.status', timeout=15000, what='the data layer')
    for _ in range(100):
        if c.js("() => FrameData.status().then(s => s.transport)") == 'gitlab':
            break
        c.wait(100)
    c.eq(c.js("() => FrameData.sync().then(r => r.error)"), 'unreachable: gitlab.example (TypeError)', 'the call never left: an exception', what='error')
    c.page.evaluate("location.hash = '#settings'")
    c.until("!!document.querySelector('[data-card=\"status\"] [data-k=\"data\"]')", timeout=10000, what='the Status block')
    want = norm(tx('frame/app.js', 'csp', c.lang).replace('{h}', 'gitlab.example'))
    got = norm(c.js("() => document.querySelector('[data-card=\"status\"] [data-k=\"data\"]').textContent"))
    c.ok(want in got and 'glpat' not in got and '/api/v4' not in got, got, 'the CSP said, the host only, in the run’s language')
    logged = c.js("() => FrameData.diagnostic().then(d => d.failures.map(f => f.error).filter(e => e.startsWith('csp: ')))")
    # another host the run’s page also blocks (map tiles, when a map drew in the run) is written too, as it should: only the
    # repository’s host is counted here, and every line keeps the form « csp: <host> (<directive>) »
    c.eq([e for e in logged if 'gitlab.example' in e], ['csp: gitlab.example (connect-src)'],
         'the violation is written once to the failures of the diagnostic: host and directive only', what='diagnostic')
    c.ok(all(re.fullmatch(r'csp: [A-Za-z0-9.-]+(:\d+)? \([a-z-]+\)', e) for e in logged), str(logged), 'every logged violation: the host and the directive, nothing else')
    # the browser's own lines for the blocked calls are what this case provokes; any other error still counts
    c.errors[:] = [e for e in c.errors if 'gitlab.example' not in e or 'Content Security Policy' not in e]



@case('A65', 'A new version: the note comes back at calm moments, a Status line until the reload, never a reload without a gesture', 'A',
      designs=('standard',), screens=False, night=False,
      rule='Simplification 31 Oct (the user: « I defer the reload during a critical operation, and the note is never offered again »): a deferred note comes back at the next calm moment (module change, app back to the front), at most every 5 minutes, until the reload; the Status block carries « New version available · Reload » meanwhile; the note says the flight and the pending writes are kept; never an automatic reload')
def a65(c):
    c.open('fuel', flight=True)
    note = "[...document.querySelectorAll('#fNotes .f-note')].filter(n => n.dataset.key === 'frame-update').length"
    c.js("() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'sog-frame-update' } }))")
    c.until(f"{note} === 1", timeout=5000, what='the new version said')
    text = norm(c.js("document.querySelector('#fNotes .f-note[data-key=\"frame-update\"]').textContent"))
    c.ok(norm(tx('frame/app.js', 'update', c.lang, after='const U = {')) in text, text, 'the note says the flight and the pending writes are kept')
    href = c.js('location.href')
    c.tap('#fNotes .f-note[data-key="frame-update"] [data-x]')
    c.eq(c.js(note), 0, 'deferred: the note goes', what='after ✕')
    # a calm moment within 5 minutes: not yet; after 5 minutes: the note comes back
    c.js("() => { location.hash = '#maps' }")
    c.wait(400)
    c.eq(c.js(note), 0, 'within 5 minutes of the last one: not offered again', what='soon after')
    c.js("() => { const real = Date.now.bind(Date); Date.now = () => real() + 6 * 60e3; location.hash = '#flightlog' }")
    c.until(f"{note} === 1", timeout=20000 if c.phone else 5000, what='the note offered again at a module change, after 5 minutes')    # on a phone it waits for the shown note to leave (SOG-0131)
    # the Status block keeps a line until the reload; the page was never reloaded by itself
    c.js("() => { location.hash = '#settings' }")
    c.until("!!document.querySelector('[data-card=\"status\"] [data-k=\"update\"]')", timeout=10000, what='the Status line')
    c.ok(norm(tx('frame/app.js', 'line', c.lang, after='const U = {')) in norm(c.js("document.querySelector('[data-card=\"status\"] [data-k=\"update\"]').textContent")),
         '', 'the Status block says « New version available · Reload »')
    c.eq(c.js('performance.getEntriesByType("navigation")[0].type') != 'reload' and c.js('location.href').split('#')[0] == href.split('#')[0], True,
         'never a reload without a gesture', what='no reload')



@case('A66', 'Selecting an entry moves no entry of the rail, the bar or the header', 'A', night=False,
      rule='Simplification 31 Oct (the user, Pilot on a computer: « the row of icons moves at each selection »): the marked state of an entry changes its colour, never the position nor the size of any entry of the left column, the bottom bar or the header (its « ? » and ⚙ stay right when the back button takes the name’s place), in every module and design, aqua included on a computer')
def a66(c):
    c.open('fuel', flight=True)
    boxes = """() => [...document.querySelectorAll('#fMenu a, #fTabs a, .f-head > button:not(.f-back):not(#fApp)')].filter(a => a.getClientRects().length).map(a => {
        const r = a.getBoundingClientRect(), i = [...a.querySelectorAll('.f-icon')].find(x => x.getClientRects().length);
        const q = i ? i.getBoundingClientRect() : r;
        return [a.dataset.id || a.dataset.tab || a.dataset.link || a.id, Math.round(r.left * 2) / 2, Math.round(r.top * 2) / 2, Math.round(r.width * 2) / 2,
                Math.round(r.height * 2) / 2, Math.round(q.left * 2) / 2, Math.round(q.top * 2) / 2] })"""
    # on a computer the run is in standard: the designs are tried here, aqua (a computer’s design) included
    designs = ['standard', 'metro', 'swiss', 'cupertino', 'material', 'aqua'] if c.page.viewport_size['width'] >= 1000 else [None]
    moved = []
    for d in designs:
        if d:
            c.js(f"() => {{ document.documentElement.dataset.design = '{d}'; location.hash = '#fuel' }}")
            c.wait(400)
        before = c.js(boxes)
        c.ok(len(before) >= 3, str(before), 'the entries are drawn')
        for target in ('maps', 'report', 'flightlog', 'atmosphere', 'website', 'fuel'):
            c.js(f"() => {{ location.hash = '#{target}' }}")
            c.until(f"!!document.querySelector('#fMenu a[data-id=\"{target}\"][aria-current], #fTabs a[aria-current]')", timeout=10000,
                    what=f'{target} marked')
            c.wait(300)  # transitions of the marked state
            after = c.js(boxes)
            was, now = {x[0]: x[1:] for x in before}, {x[0]: x[1:] for x in after}
            moved += [f'{d or "-"} {target}: {k} {was[k]} → {now[k]}' for k in was if k in now and was[k] != now[k]]
    c.eq(moved, [], 'no entry moves nor changes size when another is selected (box and icon)', what='moved entries')


# ------------------------------------------------------------------------------------------------------ A67 .. A69
_AP_FILE = 'frame/settings/admin.js'
_AP_APP = 'https://example.test/v3/frame/'


def _ap_keys(provider, api, repo):
    """The device's repository access (device/keys.json) for a GitLab or a GitHub repository: what « Ajouter un pilote » reads without a launcher."""
    g = {'provider': provider, 'repo': repo, 'branch': 'main', 'token': 'test-token'}
    if api:
        g['api'] = api
    return [['device/keys.json', {'schema': 1, 'github': g, 'avwx': '', 'ivao': None, 'updated_at': '2026-10-30T10:00:00Z'}, 'cache']]


def _ap_launcher(c, url, secrets=None, tokens=None, admin=None):
    """A fake launcher whose data/ remote is `url` (as A55 and A60): status, the remote, no secret (or `secrets`, merged into `app` of GET secrets), and, given `tokens`, the answer of GET gitlab/tokens/count."""
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and route.request.method == 'GET':
            body = {'repo': True, 'remote': 'origin', 'url': url, 'branch': 'main', 'state': 'repo', 'default': ''}
        elif path.endswith('/__setup/secrets'):
            body = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}}, 'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}, **(secrets or {})}, 'user': {}}
        elif path.endswith('/__setup/routes'):
            body = {'routes': [{'method': m, 'path': '/__setup/' + r, 'public': 'poste', 'relay': False} for m, r in (('GET', 'gitlab/tokens'), ('POST', 'gitlab/tokens'), ('POST', 'gitlab/tokens/revoke'), ('GET', 'gitlab/admin'), ('POST', 'gitlab/admin'), ('POST', 'gitlab/admin/branch'))]}
        elif path.endswith('/__setup/gitlab/tokens/count') and tokens is not None:
            body = tokens
        elif path.endswith('/__setup/gitlab/admin') and admin is not None:
            body = admin
        elif path.endswith('/__setup/gitlab/tokens') and route.request.method == 'GET':
            body = {'ok': True, 'tokens': []}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)


def _ap_prepare(c, tri='abc', name='Léa', lang=None):
    """Opens the Administration card's « Ajouter un pilote » panel, fills it and presses « Préparer »."""
    c.until("!!document.querySelector('[data-admin=\"addPilot\"]')", timeout=15000, what='the « Ajouter un pilote » line is in the Administration card')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    c.tap('[data-admin="addPilot"] > button')
    c.until("!!document.querySelector('[data-adminpanel=\"addPilot\"]:not([hidden]) [data-addpilot]')", what='the panel is open')
    box = '[data-adminpanel="addPilot"]'
    c.page.fill(f'{box} input[data-f="apTri"]', tri)
    if name:
        c.page.fill(f'{box} input[data-f="apName"]', name)
    if lang:
        c.page.select_option(f'{box} select[data-f="apLang"]', lang)
    c.page.fill(f'{box} input[data-f="apApp"]', _AP_APP)
    c.tap(f'{box} [data-act="pilotMake"]')
    c.until(f"!!document.querySelector('{box} [data-cfglink]')?.value && !!document.querySelector('{box} [data-apsteps] h3')", timeout=15000, what='the link, the steps and the message are drawn')


def _ap_msg(code, name, link):
    """The message the panel must write in the language `code`: the greeting (with the name), the app address, the link (rows read from the source, indexed by the chosen language)."""
    hello = tx(_AP_FILE, 'apHello', code).replace('{n}', name) if name else tx(_AP_FILE, 'apHelloNo', code)
    return hello + chr(10) * 2 + tx(_AP_FILE, 'apMsg', code).replace('{app}', _AP_APP).replace('{link}', link)


@case('A67', 'Add a pilot, GitLab repository, no launcher: the link, the steps by hand, the message in the chosen language, never a token', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 and 5 (« Ajouter un pilote », § 10.36): the configuration link of the export, the administrator\u2019s steps (access tokens page of the project, name = trigram, expiry today + 90 d, Developer, api, the branch, revoke, the token sent apart), a message in the language chosen; nothing written, no token')
def a67(c):
    import datetime
    c.open('settings', docs=LEVEL3 + _ap_keys('gitlab', 'https://gitlab.com/api/v4', 'acme/data'))
    _ap_prepare(c)
    box = '[data-adminpanel="addPilot"]'
    link = c.js(f"document.querySelector('{box} [data-cfglink]').value")
    c.ok(link.startswith(_AP_APP + '#settings?config='), link[:80], 'the link is the export\u2019s: the app address and #settings?config=…')
    cfg = c.js("(l) => SogConfig.unpack(l.split('config=')[1])", link)
    c.eq([cfg['data']['provider'], cfg['data']['host'], cfg['data']['repo'], cfg['identity']['trigram']], ['gitlab', 'gitlab.com', 'acme/data', 'ABC'], 'the configuration carries the real repository (gitlab) and the trigram, upper case', what='configuration')
    c.eq(norm(c.text(f'{box} [data-apforms]')), norm(tx(_AP_FILE, 'apForms', c.lang).replace('{f}', 'sog-config-ABC.json')), 'the three forms of the same configuration are said, above them', what='three forms')
    order = c.js(f"(() => {{ const q = s => document.querySelector('{box} ' + s), after = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING); return [after('[data-f=apName]', '[data-apforms]'), after('[data-apforms]', '[data-cfgout]'), after('[data-cfgout]', '[data-apsteps]'), after('[data-apsteps]', '[data-apmessage]')] }})()")
    c.eq(order, [True, True, True, True], 'the order: the fields, the three forms (QR, link, file), the steps, the message', what='order')
    steps = c.text(f'{box} [data-apsteps]')
    day = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=90)).isoformat()
    c.eq(c.attr(f'{box} [data-apsteps] ol a', 'href'), 'https://gitlab.com/acme/data/-/settings/access_tokens', 'the direct link of the project\u2019s access tokens page', what='access tokens link')
    c.eq([c.count(f'{box} [data-apsteps] details'), c.count(f'{box} [data-aptoken]')], [0, 0], 'no launcher: the steps by hand are open and there is no link to the tokens screen', what='no launcher')
    for key in ('apS3', 'apS4', 'apS5', 'apS6'):
        c.ok(norm(tx(_AP_FILE, key, c.lang)) in norm(steps), steps, f'the step {key} is said')
    values = norm(steps)
    c.ok(all(v in values for v in ('ABC', day, 'api', 'Developer')), values, 'the values to type: the trigram, the date today + 90 days, the scope api, the role Developer')
    c.ok('365' in values and 'Protected branches' in values and 'Allowed to push and merge' in values and 'Revoke' in values, values, 'the 365-day limit, the protected branch and the revocation are said')
    # the message: the chosen language (the screen\u2019s by default), the greeting, the link; never a token
    sel = c.js(f"document.querySelector('{box} select[data-f=\"apLang\"]').value")
    c.eq(sel, c.lang, 'the message language defaults to the screen language', what='language default')
    msg = c.js(f"document.querySelector('{box} [data-apmsg]').value")
    c.eq(msg, _ap_msg(c.lang, 'Léa', link), 'the message greets by name, gives the app address and the link, in the language of the screen', what='message')
    c.ok('glpat-' not in msg and 'test-token' not in msg and 'token' not in link.lower().replace('config', ''), msg[:120], 'never a token in the message or the link')
    other = 'de' if c.lang != 'de' else 'en'
    c.page.select_option(f'{box} select[data-f="apLang"]', other)
    msg2 = c.js(f"document.querySelector('{box} [data-apmsg]').value")
    c.eq(msg2, _ap_msg(other, 'Léa', link), 'changing the language changes the message, read from the chosen language\u2019s row', what='message language')
    c.ok(msg2 != msg, msg2[:80], 'and it is another text')
    c.page.fill(f'{box} input[data-f="apName"]', '')
    c.eq(c.js(f"document.querySelector('{box} [data-apmsg]').value"), _ap_msg(other, '', link), 'without a name, the greeting has none', what='no name')
    c.check_errors()


@case('A68', 'Add a pilot, GitLab repository with a launcher: a link to the tokens screen with the trigram, the steps by hand folded, the screen takes the trigram', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 and 5 (« Ajouter un pilote », § 10.36): with a launcher the administrator creates the token on #pilot-tokens?tri=<TRI> (the launcher uses the administrator\u2019s token); the steps by hand stay, folded; the screen fills its trigram field from the address')
def a68(c):
    _ap_launcher(c, 'https://gitlab.com/acme/data.git')
    c.open('settings', docs=LEVEL3)
    _ap_prepare(c, name='')
    box = '[data-adminpanel="addPilot"]'
    c.eq(c.attr(f'{box} [data-aptoken]', 'href'), '?app=maintenance#pilot-tokens?tri=ABC', 'the link to the tokens screen carries the trigram and its application (the screen is Maintenance’s)', what='token link')
    c.eq(norm(c.text(f'{box} [data-aptoken]')), norm(tx(_AP_FILE, 'apTokenLink', c.lang)), 'it is worded « Créer son jeton »', what='token link text')
    c.eq([c.count(f'{box} [data-apmanual]'), c.js(f"document.querySelector('{box} [data-apmanual]').open")], [1, False], 'the steps by hand are there, folded', what='manual folded')
    c.eq(c.attr(f'{box} [data-apmanual] ol a', 'href'), 'https://gitlab.com/acme/data/-/settings/access_tokens', 'and they carry the same access tokens link', what='manual link')
    # touched from the Settings of the Pilot application: the link changes application and opens the screen with the trigram
    c.tap(f'{box} [data-aptoken]')
    c.until("!!document.querySelector('[data-tokens-body] [data-f=tri]')", timeout=15000, what='the tokens screen opens from the Settings link')
    c.eq(c.js("document.querySelector('[data-tokens-body] [data-f=tri]').value"), 'ABC', 'the link opens the tokens screen with the trigram filled', what='link opens the screen')
    # the screen: the trigram of the address fills its field
    c.open('pilot-tokens?tri=abc', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-tokens-body] [data-f=tri]')", timeout=15000, what='the pilot tokens screen is drawn')
    c.eq(c.js("document.querySelector('[data-tokens-body] [data-f=tri]').value"), 'ABC', 'the trigram field is filled from #pilot-tokens?tri=…, upper case', what='prefill')
    c.open('pilot-tokens', app='maintenance', docs=LEVEL3)
    c.until("!!document.querySelector('[data-tokens-body] [data-f=tri]')", timeout=15000, what='the screen without a trigram')
    c.eq(c.js("document.querySelector('[data-tokens-body] [data-f=tri]').value"), '', 'without it the field stays empty', what='no prefill')
    c.check_errors()


@case('A69', 'Add a pilot, GitHub repository: the GitHub steps of the export, no GitLab step', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 and 5 (« Ajouter un pilote », § 10.36): for a GitHub repository the steps are the export\u2019s (invite, create the file, send); the access tokens page and the Developer role are GitLab\u2019s only; the message and the link are the same')
def a69(c):
    c.open('settings', docs=LEVEL3 + _ap_keys('github', None, 'acme/data'))
    _ap_prepare(c)
    box = '[data-adminpanel="addPilot"]'
    steps = norm(c.text(f'{box} [data-apsteps]'))
    c.ok(norm(tx(_AP_FILE, 'cfgStepExport', c.lang)) in steps and norm(tx(_AP_FILE, 'cfgStepSend', c.lang)) in steps, steps, 'the GitHub steps of the export are there (the file, the sending)')
    c.eq([c.count(f'{box} [data-apsteps] li'), c.count(f'{box} [data-apmanual]'), c.count(f'{box} [data-aptoken]')], [3, 0, 0], 'three steps, as the export says them: no fold, no tokens screen', what='steps')
    c.ok('access_tokens' not in c.js(f"document.querySelector('{box} [data-apsteps]').innerHTML") and 'Developer' not in steps, steps, 'nothing of GitLab: no access tokens page, no Developer role')
    link = c.js(f"document.querySelector('{box} [data-cfglink]').value")
    cfg = c.js("(l) => SogConfig.unpack(l.split('config=')[1])", link)
    c.eq([cfg['data']['provider'], cfg['data']['repo']], ['github', 'acme/data'], 'the configuration carries the real repository (github)', what='configuration')
    c.eq(c.js(f"document.querySelector('{box} [data-apmsg]').value"), _ap_msg(c.lang, 'Léa', link), 'the message is the same', what='message')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ A70 .. A72
def _gl_instance(c, host, who):
    """A stub of a GitLab instance (https://<host>/api/v4/) as the transport reads it: the branch, `/user` (bot) and `/personal_access_tokens/self` (scopes, expires_at).
    `who` { bot, scopes, expires } is read at each call (a case changes it between steps); returns the list of [path, private-token] seen."""
    calls = []

    def handler(route):
        path = urllib.parse.urlparse(route.request.url).path
        calls.append([path, route.request.headers.get('private-token')])
        if path.endswith('/user'):
            body = {'id': 7, 'username': 'project_1_bot', 'bot': who['bot']}
        elif path.endswith('/personal_access_tokens/self'):
            body = {'scopes': who['scopes'], 'expires_at': who['expires']}
        else:
            body = {'commit': {'id': 'abc123'}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(rf'https://{re.escape(host)}/api/v4/'), handler)
    return calls


def _gl_join(c, step=1):
    """Opens « Rejoindre la compagnie » for a GitLab configuration (gitlab.com, acme/data, trigram ABC) on a device with no launcher, the device\u2019s own trigram and IDs seeded."""
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogConfig && !!SogConfig.validate", what='the configuration helper is loaded')
    cfg = c.js("() => SogConfig.validate({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { host: 'gitlab.com', repo: 'acme/data', branch: 'main', provider: 'gitlab' } }).cfg")
    c.open('settings', docs=LEVEL3 + [['device/join.json', {'cfg': cfg, 'step': step, 'done': {}}, 'cache']], trigram='ZZZ', identity={'ivao': '1234', 'vatsim': '5678', 'simbrief': 'sb'})
    c.page.evaluate("location.hash = '#settings?join=1'")
    c.until(f"!!document.querySelector('[data-card=\"join\"][data-step=\"{step}\"]')", timeout=15000, what=f'the assistant is at step {step}')


def _gl_counter(c):
    """The « Step n of m » line of the assistant, as [n, m]."""
    n, m = c.js("(() => { const t = document.querySelector('[data-card=\"join\"] > p.f-muted').textContent; return t.match(/\\d+/g).map(Number) })()")
    return [n, m]


def _gl_test(c, token='test-token'):
    """At step 5, types the token and presses « Tester »."""
    c.page.fill('input[data-f="jToken"]', token)
    c.tap('[data-jact="test"]')


@case('A70', 'Join the airline, a GitLab configuration on a device: steps 1, 5, 7; the token the administrator sent, a project token accepted without a question, the trigram written', 'A', designs=('standard',),
      screens=False, night=False, rule='frame/settings SPEC 7 (§ 10.36 part 3): no account, no invitation, no token to create for a GitLab project: step 1, step 5 (the trigram read from the configuration, the token pasted), step 7; a project token (bot, api, 90 days) is accepted with no question, the access and the trigram are written, IVAO / VATSIM / SimBrief stay')
def a70(c):
    import datetime
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())
    soon = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=90)).isoformat()
    calls = _gl_instance(c, 'gitlab.com', {'bot': True, 'scopes': ['api'], 'expires': soon})
    _gl_join(c)
    c.eq(_gl_counter(c), [1, 3], 'three steps: the configuration read, the token, the end', what='steps')
    c.tap('[data-jact="next"]')
    c.until("!!document.querySelector('[data-card=\"join\"][data-step=\"5\"]')", what='step 1 leads to step 5')
    c.eq(_gl_counter(c), [2, 3], 'step 5 is the second of three', what='counter')
    c.eq(c.text('[data-card="join"] [data-jtri]'), 'ABC', 'the trigram is read from the configuration, shown and not typed', what='trigram')
    c.eq(c.count('[data-card="join"] input[data-f="jTri"], [data-card="join"] input[data-f="jUser"]'), 0, 'no field for it, no account name', what='no fields')
    _gl_test(c)
    c.until("!!document.querySelector('[data-card=\"join\"] [data-msg]')?.textContent", timeout=15000, what='the test answers')
    c.eq([c.count('.f-modal'), c.attr('[data-card="join"] [data-msg]', 'data-kind')], [0, 'ok'], 'a project token: no question, no warning', what='project token')
    saved = c.js("(() => { const g = FrameData.github.config(); return [g?.provider, g?.api, g?.repo] })()")
    c.eq(saved, ['gitlab', 'https://gitlab.com/api/v4', 'acme/data'], 'the access is saved on the GitLab project', what='saved access')
    ident = c.doc('device/identity.json')
    c.eq([ident['trigram'], ident['ivao'], ident['vatsim'], ident['simbrief']], ['ABC', '1234', '5678', 'sb'], 'the trigram of the configuration is written; the IDs of the device stay', what='identity')
    c.ok(any(x[0].endswith('/user') for x in calls) and any(x[0].endswith('/personal_access_tokens/self') for x in calls) and all(x[1] == 'test-token' for x in calls), str(calls),
         'the token was asked who it is (user, token), and sent to gitlab.com only')
    c.eq(c.js("document.querySelector('input[data-f=\"jToken\"]').value"), '', 'the token does not stay in the page', what='token wiped')
    c.tap('[data-jact="next"]')
    c.until("!!document.querySelector('[data-card=\"join\"][data-step=\"7\"]')", what='step 5 leads to step 7')
    c.eq(_gl_counter(c), [3, 3], 'the last step is the third', what='last step')
    c.check_errors()


@case('A71', 'Join the airline, a GitLab token that says what it is: a personal token is a question (No saves nothing), no expiry or too many rights is a warning', 'A', designs=('standard',),
      screens=False, night=False, rule='frame/settings SPEC 7 (§ 10.36 part 3, the token check): whoami before accepting; a personal token asks, No keeps nothing and Yes saves; an expiry missing or beyond a year, rights beyond api / read / write repository: said, not blocking')
def a71(c):
    import datetime
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())
    soon = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=90)).isoformat()
    who = {'bot': False, 'scopes': ['api'], 'expires': soon}
    _gl_instance(c, 'gitlab.com', who)
    K = 'frame/settings/kit.js'
    # a personal token: the question, the words of the user
    _gl_join(c, 5)
    _gl_test(c)
    c.until("!!document.querySelector('.f-modal [data-no]')", timeout=15000, what='a personal token is a question')
    c.eq(norm(c.text('.f-modal p')), norm(tx(K, 'tokenPersonal', c.lang) + ' ' + tx(K, 'tokenContinue', c.lang)), 'the question says it is a personal token and asks to continue', what='question')
    c.tap('.f-modal [data-no]')
    c.wait(500)
    c.eq([c.js('!FrameData.github.config()'), c.doc('device/identity.json')['trigram'], c.js("document.querySelector('[data-card=\"join\"] [data-msg]').textContent")], [True, 'ZZZ', ''],
         'No: no access saved, the trigram not written, nothing said', what='No')
    c.tap('[data-jact="test"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=10000, what='asked again (the token field is kept until it is accepted)')
    c.tap('.f-modal [data-ok]')
    c.until("!!window.FrameData?.github?.config()", timeout=15000, what='Yes saves the access')
    c.eq(c.doc('device/identity.json')['trigram'], 'ABC', 'and writes the trigram', what='Yes')
    # a project token with no expiry: a warning, saved anyway
    who.update({'bot': True, 'expires': None})
    _gl_join(c, 5)
    _gl_test(c)
    c.until("!!document.querySelector('[data-card=\"join\"] [data-msg]')?.textContent", timeout=15000, what='the test answers')
    c.eq([c.attr('[data-card="join"] [data-msg]', 'data-kind'), norm(tx(K, 'tokenExpiry', c.lang)) in norm(c.text('[data-card="join"] [data-msg]')), c.count('.f-modal'), c.js('!!FrameData.github.config()')],
         ['warn', True, 0, True], 'no expiry: a warning line, no question, saved', what='no expiry')
    # an expiry beyond a year, and rights beyond what the transport uses
    far = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=400)).isoformat()
    who.update({'expires': far, 'scopes': ['api', 'sudo']})
    _gl_join(c, 5)
    _gl_test(c)
    c.until("!!document.querySelector('[data-card=\"join\"] [data-msg]')?.textContent", timeout=15000, what='the test answers')
    text = norm(c.text('[data-card="join"] [data-msg]'))
    c.ok(norm(tx(K, 'tokenExpiry', c.lang)) in text and norm(tx(K, 'tokenScopes', c.lang).replace('{s}', 'sudo')) in text, text, 'more than a year away: the expiry warning; scopes beyond api: the rights warning naming them')
    c.check_errors()


@case('A72', 'Access card, a personal GitLab token: a warning in the card, saved anyway; a project token in order, nothing said', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 (§ 10.36 part 3): the Access card tests and saves a GitLab token whatever it is (the user alone with their repository needs a personal one); it warns, in its message, of a personal token, an expiry missing or beyond a year')
def a72(c):
    import datetime
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())
    soon = (datetime.datetime.now(datetime.timezone.utc).date() + datetime.timedelta(days=90)).isoformat()
    who = {'bot': False, 'scopes': ['api'], 'expires': None}
    _gl_instance(c, 'gitlab.com', who)
    K = 'frame/settings/kit.js'
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=access] [data-f=repo]')", timeout=15000, what='the Access card')
    c.js("document.querySelector('[data-card=access]').closest('details')?.setAttribute('open', '')")
    c.page.fill('[data-card="access"] [data-f="repo"]', 'gitlab.com/acme/data')
    c.page.fill('[data-card="access"] [data-f="token"]', 'test-token')
    c.tap('[data-card="access"] [data-act="test"]')
    c.until("!!document.querySelector('[data-card=access] [data-msg]')?.textContent.trim() && document.querySelector('[data-card=access] [data-msg]').textContent !== '…'", timeout=15000, what='the test answers')
    text = norm(c.text('[data-card="access"] [data-msg]'))
    c.ok(c.attr('[data-card="access"] [data-msg]', 'data-kind') == 'warn' and norm(tx(K, 'tokenPersonal', c.lang)) in text and norm(tx(K, 'tokenExpiry', c.lang)) in text, text,
         'Test: the personal token and the missing expiry are said as a warning, not an error')
    c.page.fill('[data-card="access"] [data-f="token"]', 'test-token')
    c.tap('[data-card="access"] [data-act="access"]')
    c.until("!!window.FrameData?.github?.config()", timeout=15000, what='the access is saved')
    c.until("!!document.querySelector('[data-card=access] [data-msg]')?.textContent.trim()", timeout=15000, what='the warning is in the card after saving')
    c.ok(norm(tx(K, 'tokenPersonal', c.lang)) in norm(c.text('[data-card="access"] [data-msg]')) and c.count('.f-modal') == 0, c.text('[data-card="access"] [data-msg]'), 'Save: saved anyway, the warning said in the card, no question')
    # a project token in order: nothing to say
    who.update({'bot': True, 'expires': soon})
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=access] [data-f=repo]')", timeout=15000, what='the Access card again')
    c.js("document.querySelector('[data-card=access]').closest('details')?.setAttribute('open', '')")
    c.page.fill('[data-card="access"] [data-f="repo"]', 'gitlab.com/acme/data2')
    c.page.fill('[data-card="access"] [data-f="token"]', 'test-token')
    c.tap('[data-card="access"] [data-act="test"]')
    c.until("!!document.querySelector('[data-card=access] [data-msg]')?.textContent.trim() && document.querySelector('[data-card=access] [data-msg]').textContent !== '…'", timeout=15000, what='the test answers')
    c.eq([c.attr('[data-card="access"] [data-msg]', 'data-kind'), norm(c.text('[data-card="access"] [data-msg]'))], ['ok', norm(tx('frame/settings/access.js', 'testOk', c.lang).replace('{b}', 'main'))],
         'a project token with an expiry: the plain « branch read » message', what='plain')
    c.check_errors()


@case('A73', 'One way to enrol: « Ajouter un pilote » is the only export; the Access card has one entry « Rejoindre la compagnie… », the assistant takes a pasted link or a file', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3, 5, 7 (the user, 1 Nov 2026: « deux chemins pour le QR code, le JSON et le lien »): one path; Administration has no « Exporter une configuration » any more; Access has one join entry and no import button; the assistant without a configuration pastes a link (the whole address is enough) or picks the file; #settings?import=1 opens it')
def a73(c):
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())
    settings_file = 'frame/settings/settings.js'
    c.open('settings', docs=LEVEL3 + _ap_keys('gitlab', 'https://gitlab.com/api/v4', 'acme/data'))
    c.until("!!document.querySelector('[data-admin=\"addPilot\"]') && !!document.querySelector('[data-card=access]')", timeout=15000, what='the Administration and Access cards')
    c.eq([c.count('[data-admin="cfg"]'), c.count('[data-adminpanel="cfg"]'), c.count('[data-admin="addPilot"]')], [0, 0, 1], 'Administration: « Ajouter un pilote » only, no second export', what='administration')
    c.js("document.querySelector('[data-card=access]').closest('details')?.setAttribute('open', '')")
    entries = c.js("[...document.querySelectorAll('[data-card=access] [data-act]')].map(b => b.dataset.act).filter(a => /^cfg/.test(a))")
    c.eq([entries, c.count('[data-cfgfile]')], [['cfgJoin'], 0], 'the Access card has one join entry: no import button, no hidden file input of its own', what='access')
    c.eq(norm(c.text('[data-card=access] [data-act="cfgJoin"]')), norm(tx(settings_file, 'cfgJoin', c.lang)), 'it is « Rejoindre la compagnie… »', what='join text')
    c.tap('[data-card=access] [data-act="cfgJoin"]')
    c.until("!!document.querySelector('[data-jlink]')", timeout=15000, what='the assistant without a configuration')
    c.eq([c.count('[data-jact="paste"]'), c.count('[data-jact="pick"]'), c.count('[data-card="join"][data-step]')], [1, 1, 0], 'it offers the pasted link and the file picker on one screen', what='no configuration')
    # a link that is nothing: said, nothing started
    c.page.fill('[data-jlink]', 'not a link')
    c.tap('[data-jact="paste"]')
    c.wait(600)
    c.eq(c.count('[data-card="join"][data-step]'), 0, 'a link that is not one starts nothing', what='bad link')
    # the whole address of the link pasted, as a pilot copies it from a message: the assistant starts
    link = c.js("() => SogConfig.pack({ schema: 'sog-config/1', identity: { trigram: 'ABC' }, data: { host: 'gitlab.com', repo: 'acme/data', branch: 'main', provider: 'gitlab' } })")
    c.page.fill('[data-jlink]', f'Bonjour ! https://example.test/v3/frame/#settings?config={link} a bientot')
    c.tap('[data-jact="paste"]')
    c.until("!!document.querySelector('[data-card=\"join\"][data-step=\"1\"]')", timeout=15000, what='the pasted link starts the assistant')
    c.eq(c.doc('device/join.json')['cfg']['data']['repo'], 'acme/data', 'the configuration of the link is the one the assistant works on', what='started')
    # the welcome card\u2019s address opens the same screen, and the file picker starts it too
    c.open('settings?import=1', docs=LEVEL3 + [['device/join.json', {}, 'cache']], wait=False)   # no assistant under way
    c.until("!!document.querySelector('[data-jlink]')", timeout=15000, what='#settings?import=1 opens the assistant without a configuration')
    cfg = c.js("() => SogConfig.build({ data: { host: 'gitlab.com', repo: 'acme/other', branch: 'main', provider: 'gitlab' }, trigram: 'XYZ' })")
    with c.page.expect_file_chooser() as fc:
        c.tap('[data-jact="pick"]')
    fc.value.set_files(files=[{'name': 'sog-config-XYZ.json', 'mimeType': 'application/json', 'buffer': json.dumps(cfg).encode('utf-8')}])
    c.until("!!document.querySelector('[data-card=\"join\"][data-step=\"1\"]')", timeout=15000, what='the chosen file starts the assistant')
    c.eq(c.doc('device/join.json')['cfg']['data']['repo'], 'acme/other', 'the file\u2019s configuration is the one the assistant works on', what='file started')


def _land_launcher(c, data_git, url, name):
    """A fake launcher for the landing of Maintenance: data/ a git repository or not, its remote, the airline's name."""
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': data_git, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    airline = {'name': name} if name else {}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and route.request.method == 'GET':
            body = {'repo': data_git, 'remote': 'origin' if url else '', 'url': url, 'branch': 'main', 'state': 'repo' if data_git else 'absent', 'default': ''}
        elif path.endswith('/__setup/changes'):
            body = {'head': 'h1', 'tree': {'airline/settings.json': 'r1'} if name else {}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

    def data(route):
        if route.request.url.split('?')[0].endswith('/data/airline/settings.json') and name:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(airline))
        route.fulfill(status=404, body='')
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.context.route(re.compile(r'/data/airline/'), data)


@case('A74', 'Maintenance opens on the administrator’s assistant until the airline is installed', 'A', designs=('standard',), screens=False, night=False,
      rule='Réglages 1 Nov (§ 10.36, validated by Simplification): with this workstation’s launcher, Maintenance opened without an address lands on #settings?card=assistant while data/ is not a git repository with a remote or airline/settings.json has no name; installed, it opens as before; an address asked for is served as is')
def a74(c):
    hash_ = "location.hash"
    for data_git, url, name, want in ((False, '', '', '#settings?card=assistant'), (True, '', '', '#settings?card=assistant'),
                                      (True, 'https://gitlab.com/acme/data.git', '', '#settings?card=assistant')):
        _land_launcher(c, data_git, url, name)
        c.open('', app='maintenance', docs=LEVEL3)
        c.until(f"location.hash === '{want}'", timeout=15000, what=f'lands on the assistant (dataGit {data_git}, remote {bool(url)}, name {bool(name)})')
    # installed: data/ a repository with a remote, the airline named — Maintenance opens as before (its first module)
    _land_launcher(c, True, 'https://gitlab.com/acme/data.git', 'Acme')
    c.open('', app='maintenance', docs=LEVEL3 + [['airline/settings.json', {'name': 'Acme'}, 'document']])
    c.until("!!document.querySelector('[data-module=\"data\"]')", timeout=20000, what='installed: Maintenance opens on Données, its first module')
    c.wait(3500)  # the bound of the airline read: no late landing either
    c.ok(not c.js(hash_).startswith('#settings') and c.count('[data-module="data"]') == 1, c.js(hash_), 'installed: Données stays, no landing on the assistant')
    # an address asked for is served as is, installed or not
    _land_launcher(c, False, '', '')
    c.open('help', app='maintenance', docs=LEVEL3)
    c.wait(500)
    c.eq(c.js(hash_), '#help', 'an address asked for is never replaced', what='asked address')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ A75 .. A77
_AS_HREF = {'repo': '#settings?card=admin&panel=remote', 'airline': './#website', 'base': '?app=maintenance#data', 'pilot': '#settings?card=admin&panel=addPilot',
            'devices': '#settings?card=lan', 'keys': '#settings?card=admin&panel=keys'}   # the workstation’s own Access card, where devices are paired


def _as_steps(c):
    """The assistant card as { step: [state, href of its button or None, button is primary] } in the order drawn."""
    return c.js("""() => Object.fromEntries([...document.querySelectorAll('[data-card="assistant"] [data-step]')].map(li => {
      const a = li.querySelector('a.f-btn'); return [li.dataset.step, [li.dataset.state, a ? a.getAttribute('href') : null, !!a && a.classList.contains('primary')]] }))""")


@case('A75', 'Administrator\u2019s assistant on an empty airline: seven lines at most, each state read, the first step to do primary, every button to the card that exists', 'A', designs=('standard',),
      screens=False, night=False, rule='frame/settings SPEC 3 item 12 (§ 10.36, « une page d\u2019assistant, qui prend par la main l\u2019admin »): #settings?card=assistant, alone, at any level; at most seven steps, each with a state read (done, to do, optional, unknown), a sentence and one button to an existing card; the highest step to do has the primary button; it writes nothing')
def a75(c):
    settings_file = 'frame/settings/settings.js'
    _ap_launcher(c, '')   # a launcher whose data/ has no remote (the count of tokens is not answered: the pilot step is unknown)
    c.open('settings?card=assistant', docs=[['device/level.json', {'level': 1}, 'cache']])
    c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant is drawn (at the Discovery level too)')
    steps = _as_steps(c)
    c.eq(list(steps), ['repo', 'airline', 'base', 'pilot', 'devices', 'keys', 'done'], 'at most seven lines, in the order of the installation', what='steps')
    c.eq({k: v[0] for k, v in steps.items()}, {'repo': 'todo', 'airline': 'todo', 'base': 'todo', 'pilot': 'unknown', 'devices': 'optional', 'keys': 'optional', 'done': 'todo'},
         'no remote, no airline name, no zone: three to do; the pilot count is not exposed (unknown); devices and keys optional', what='states')
    c.eq({k: v[1] for k, v in steps.items() if k != 'done'}, _AS_HREF, 'each button leads to the card that exists', what='hrefs')
    c.eq([k for k, v in steps.items() if v[2]], ['repo'], 'the highest step to do has the primary button, and only it', what='primary')
    words = c.js("[...document.querySelectorAll('[data-card=\"assistant\"] [data-step] [data-st]')].map(b => b.textContent)")
    c.eq([norm(w) for w in words], [norm(tx(settings_file, k, c.lang, after='asState: {')) for k in ('todo', 'todo', 'todo', 'unknown', 'optional', 'optional', 'todo')], 'the state words, in the language of the run', what='state words')
    c.eq([c.count('[data-card="assistant"] p'), c.count('[data-card="assistant"] [data-card="status"]')], [1, 1], 'one introductory sentence, and the frame\u2019s status block at the end', what='nothing else')
    # not in the list of cards: only by its address; the Administration card has a line for it
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"]')", timeout=15000, what='the list of cards')
    c.eq([c.count('[data-card="assistant"]'), c.attr('[data-admin="assistant"] a', 'href')], [0, '#settings?card=assistant'], 'the assistant is not in the list; the Administration card links to it', what='not in the list')
    # no launcher: the repository step cannot be read here
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), lambda r: r.abort())
    c.open('settings?card=assistant', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant without a launcher')
    steps = _as_steps(c)
    c.eq([steps['repo'][0], steps['airline'][0], [k for k, v in steps.items() if v[2]]], ['unknown', 'todo', ['airline']], 'without a launcher the repository is unknown; the first one to do is the airline', what='no launcher')
    c.check_errors()


@case('A76', 'Administrator\u2019s assistant on a filled airline: the first three steps done, nothing primary while nothing is to do', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 12: done is read, never typed: a remote and (GitLab) the administrator\u2019s token for the repository, a name in airline/settings.json for the airline, a published zone for the base, the key set for the keys')
def a76(c):
    settings_file = 'frame/settings/settings.js'
    _ap_launcher(c, 'https://gitlab.com/acme/data.git', tokens={'ok': True, 'active': 1}, secrets={'gitlab': {'instance': {'set': True, 'at': '2026-11-01'}, 'project': {'set': True, 'at': '2026-11-01'}, 'token': {'set': True, 'at': '2026-11-01'}},
                                                         'ivao': {'apiKey': {'set': True, 'hint': '••••'}}})
    c.open('settings?card=assistant', docs=LEVEL3 + [['airline/settings.json', {'schema': 1, 'name': 'ACME Air', 'site': 'https://example.test'}, 'document']], aero=True)
    c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant is drawn')
    c.wait(800)
    steps = _as_steps(c)
    c.eq({k: v[0] for k, v in steps.items()}, {'repo': 'done', 'airline': 'done', 'base': 'done', 'pilot': 'done', 'devices': 'optional', 'keys': 'done', 'done': 'done'},
         'a GitLab remote with the administrator\u2019s token, an airline name, a published zone, an active project token, the IVAO key: done', what='states')
    c.eq([k for k, v in steps.items() if v[2]], [], 'nothing is to do: no primary button', what='no primary')
    c.eq(c.count('[data-card="assistant"] [data-step]'), 7, 'seven lines', what='seven')
    # no project token yet: the pilot step is to do, and primary (the first three are done); the launcher refusing for lack of the administrator\u2019s token: unknown, and the sentence says it
    for answer, want in (({'ok': True, 'active': 0}, ['todo', ['pilot']]), ({'ok': False, 'status': 409, 'reason': 'secret'}, ['unknown', []])):
        c.context.unroute(re.compile(r'/__setup/'))
        _ap_launcher(c, 'https://gitlab.com/acme/data.git', tokens=answer, secrets={'gitlab': {'instance': {'set': True}, 'project': {'set': True}, 'token': {'set': True}}})
        c.open('settings?card=assistant', docs=LEVEL3 + [['airline/settings.json', {'schema': 1, 'name': 'ACME Air'}, 'document']], aero=True)
        c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant with the count answered')
        c.wait(800)
        steps = _as_steps(c)
        c.eq([steps['pilot'][0], [k for k, v in steps.items() if v[2]]], want, f'the count of tokens answered {answer}', what='token count')
    c.eq(norm(c.text('[data-card="assistant"] [data-step="pilot"] .f-muted')), norm(tx(settings_file, 'asPilotSecret', c.lang)), 'without the administrator\u2019s token the sentence says so (the first step\u2019s matter)', what='secret sentence')
    # the GitLab token of the administrator missing: the repository is to do again, the first step
    c.context.unroute(re.compile(r'/__setup/'))
    _ap_launcher(c, 'https://gitlab.com/acme/data.git', {'gitlab': {'instance': {'set': True}, 'project': {'set': True}, 'token': {'set': False}}})
    c.open('settings?card=assistant', docs=LEVEL3 + [['airline/settings.json', {'schema': 1, 'name': 'ACME Air'}, 'document']], aero=True)
    c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant again')
    c.wait(800)
    steps = _as_steps(c)
    c.eq([steps['repo'][0], [k for k, v in steps.items() if v[2]], steps['keys'][0]], ['todo', ['repo'], 'optional'], 'a GitLab remote without the administrator\u2019s token: the repository is to do, first and primary; keys unset: optional', what='token missing')
    # the data branch closed to Developers (GET gitlab/admin, V3 Frame c6f3bc38b): the repository is to do, said, and the button leads to
    # the pilots' tokens screen where it opens; the assistant writes nothing
    c.context.unroute(re.compile(r'/__setup/'))
    _ap_launcher(c, 'https://gitlab.com/acme/data.git', {'gitlab': {'instance': {'set': True}, 'project': {'set': True}, 'token': {'set': True}}},
                 tokens={'ok': True, 'active': 1}, admin={'ok': True, 'branch': {'name': 'main', 'protected': True, 'open': False}})
    c.open('settings?card=assistant', docs=LEVEL3 + [['airline/settings.json', {'schema': 1, 'name': 'ACME Air'}, 'document']], aero=True)
    c.until("!!document.querySelector('[data-card=\"assistant\"] [data-step=\"done\"]')", timeout=20000, what='the assistant with the branch read')
    c.wait(800)
    steps = _as_steps(c)
    c.eq([steps['repo'][0], c.attr('[data-card="assistant"] [data-step="repo"] a', 'href'), norm(c.text('[data-card="assistant"] [data-step="repo"] .f-muted'))],
         ['todo', '?app=maintenance#pilot-tokens', norm(tx(settings_file, 'asRepoBranch', c.lang).replace('{b}', 'main'))],
         'the data branch closed to Developers: the repository is to do, said, and the button opens the pilots\u2019 tokens screen', what='branch closed')
    c.check_errors()


@case('A77', 'Administrator\u2019s assistant, every state the page can read: the pilot count, devices, keys, GitLab token, unknown reads', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 12: states from what Settings reads (pure on its reads): a pilot token count when the frame gives one, a paired device, the IVAO key or both EAD fields, an unreadable read is unknown, never typed')
def a77(c):
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogSettingsParts?.cards?.assistant && !!window.SogConfig", timeout=15000, what='the card builders are loaded')
    got = c.js("""() => {
      const t = r => r[0], known = [];
      const draw = (L, remote, assist) => { const h = SogSettingsParts.cards.assistant({ c: { status: null }, t, focus: 'assistant', L, remote, known, assist });
        const d = new DOMParser().parseFromString(h, 'text/html'); return [...d.querySelectorAll('[data-step]')].map(li => li.dataset.step + ':' + li.dataset.state + (li.querySelector('a.primary') ? '*' : '')).join(' ') };
      const sec = (o = {}) => ({ app: { gitlab: { token: { set: false } }, ivao: { apiKey: { set: false } }, ead: { user: { set: false }, password: { set: false } }, ...o } });
      const ok = { airline: { name: 'A' }, zones: 3, lan: true, devices: 0, tokens: null, secrets: sec() };
      const gl = { url: 'https://gitlab.com/a/b.git' }, gh = { url: 'https://github.com/a/b.git' };
      return {
        none: draw(null, null, { ...ok, secrets: null }),
        github: draw({}, gh, ok),
        gitlabToken: draw({}, gl, { ...ok, secrets: sec({ gitlab: { token: { set: true } } }) }),
        gitlabNoSecret: draw({}, gl, { ...ok, secrets: null }),
        pilotTodo: draw({}, gh, { ...ok, tokens: { ok: true, active: 0 } }),
        pilotDone: draw({}, gh, { ...ok, tokens: { ok: true, active: 2 } }),
        pilotRefused: draw({}, gh, { ...ok, tokens: { ok: false, status: 409, reason: 'secret' } }),
        pilotSentence: (() => { const h = SogSettingsParts.cards.assistant({ c: { status: null }, t, focus: 'assistant', L: {}, remote: gh, known, assist: { ...ok, tokens: { ok: false, status: 409, reason: 'secret' } } });
          return new DOMParser().parseFromString(h, 'text/html').querySelector('[data-step=pilot] .f-muted').textContent })(),
        device: draw({}, gh, { ...ok, devices: 2 }),
        ead: draw({}, gh, { ...ok, secrets: sec({ ead: { user: { set: true }, password: { set: true } } }) }),
        eadHalf: draw({}, gh, { ...ok, secrets: sec({ ead: { user: { set: true }, password: { set: false } } }) }),
        noBase: draw({}, gh, { ...ok, zones: null }),
        emptyBase: draw({}, gh, { ...ok, zones: 0 }),
      } }""")
    c.eq(got['none'], 'repo:unknown airline:done base:done pilot:unknown devices:optional keys:optional done:todo', 'no launcher: the repository is unknown and the end is not reached', what='none')
    c.eq(got['github'], 'repo:done airline:done base:done pilot:unknown devices:optional keys:optional done:done', 'a GitHub remote is done by itself', what='github')
    c.eq([got['gitlabToken'].split(' ')[0], got['gitlabNoSecret'].split(' ')[0]], ['repo:done', 'repo:unknown'], 'a GitLab remote needs the administrator\u2019s token; secrets that cannot be read: unknown', what='gitlab')
    c.eq(got['pilotTodo'].split(' ')[3], 'pilot:todo*', 'a pilot token count of zero: to do, and the first one to do has the primary button', what='pilot todo')
    c.eq(got['pilotDone'].split(' ')[3], 'pilot:done', 'a pilot token active: done', what='pilot done')
    c.eq([got['pilotRefused'].split(' ')[3], got['pilotSentence']], ['pilot:unknown', tx('frame/settings/settings.js', 'asPilotSecret', 'fr')], 'a refusal of the count for want of the administrator\u2019s token: unknown, and the sentence says the token is missing', what='pilot refused')
    c.eq([got['device'].split(' ')[4], got['ead'].split(' ')[5], got['eadHalf'].split(' ')[5]], ['devices:done', 'keys:done', 'keys:optional'], 'a paired device: done; both EAD fields (or the IVAO key): keys done; one only: optional', what='optional steps')
    c.eq([got['noBase'].split(' ')[2], got['emptyBase'].split(' ')[2]], ['base:unknown', 'base:todo*'], 'an unreadable base is unknown, an empty one is to do (first, so primary)', what='base')
    c.check_errors()



GITLAB_COM = ("try { localStorage.setItem('githubData:frame', JSON.stringify({ provider: 'gitlab', repo: 'grp/data', api: 'https://gitlab.com/api/v4', "
              "branch: 'main', token: 'glpat_test' })) } catch (e) {}")


@case('A78', 'A pilot’s token refused on a protected GitLab branch: the cause and the remedy said', 'A', designs=('standard',), screens=False,
      night=False, langs4=True,
      rule='Simplification 1 Nov (the user: « Synchronisation failed: token without write access (GitLab 403) »): a GitLab 403 « not allowed to push into this branch » says the branch is not open to Developers and where the administrator opens it; another 403 keeps the plain phrase')
def a78(c):
    answer = {'message': '403 Forbidden - You are not allowed to push into this branch'}
    c.context.add_init_script(GITLAB_COM)
    c.context.route(re.compile(r'^https://gitlab\.com/api/v4/'), lambda r: r.fulfill(status=403, content_type='application/json',
                                                                                    body=json.dumps({'message': answer['message']})))
    c.open('atmosphere', wait=False, docs=[['device/usages.json', {'devices': True}, 'cache']])
    c.until('!!window.FrameData && FrameData.status', timeout=15000, what='the data layer')
    for _ in range(100):
        if c.js("() => FrameData.status().then(s => s.transport)") == 'gitlab':
            break
        c.wait(100)
    row = "() => { const b = document.querySelector('[data-card=\"status\"] [data-k=\"data\"]'); return b ? b.textContent : '' }"
    got = []
    for message in ('403 Forbidden - You are not allowed to push into this branch', 'insufficient_scope'):
        answer['message'] = message
        c.js("() => FrameData.sync().then(r => r.error)")
        c.page.evaluate("location.hash = '#settings'")
        c.until("!!document.querySelector('[data-card=\"status\"] [data-k=\"data\"]')", timeout=10000, what='the Status block')
        got.append(norm(c.js(row)))
        c.page.evaluate("location.hash = '#atmosphere'")
    want = norm(tx('frame/app.js', 'gitlabBranch', c.lang).replace('{b}', 'main')) + ' (GitLab 403)'
    c.ok(want in got[0], got[0], 'a protected branch: the cause (the branch main not open to Developers) and the remedy (Pilots’ tokens › Open the branch)')
    c.ok(norm(tx('frame/app.js', 'http403', c.lang)) + ' (GitLab 403)' in got[1] and want not in got[1], got[1], 'another 403: the plain phrase')
    c.ok(all('glpat_test' not in g for g in got), '', 'never the token')



@case('A79', 'Pilot’s entries follow the pilot’s sequence: prepare, map, weather, report, flights', 'A', designs=('standard',), screens=False, night=False,
      rule='Simplification 1 Nov (the user: « the weather button should come right after the map: we look at the weather before writing a report »): the bar and the left column of Pilot follow Préparer · Carte · Météo · CR · Vols, then Site in the column')
def a79(c):
    c.open('fuel', docs=LEVEL3)
    tabs = c.js("[...document.querySelectorAll('#fTabs a')].map(a => a.dataset.tab)")
    c.eq(tabs, ['prepare', 'maps', 'weather', 'report', 'flightlog'], 'the bar: Préparer, Carte, Météo, CR, Vols', what='bar')
    rail = [x for x in c.js("[...document.querySelectorAll('#fMenu a[data-id]')].map(a => a.dataset.id)") if x]
    want = ['fuel', 'maps', 'atmosphere', 'report', 'flightlog', 'website']
    c.eq([x for x in want if x in rail], [x for x in rail if x in want], 'the column: Carburant, Carte, Météo, Compte rendu, Mes vols, Site (Missions is the Company application)', what='column')
    c.ok(rail.index('atmosphere') == rail.index('maps') + 1 and rail.index('report') == rail.index('atmosphere') + 1, str(rail), 'Météo right after the Map, before the report')


@case('A80', 'One door named « Aide » per screen: the « ? », the manual with its contents and « All help » at the head', 'A', designs=('standard',), screens=False, night=False,
      rule='Simplification 1 Nov (the user: two « help » pages in Maintenance): one entry « Aide » — the « ? » of the header — opens the manual of the application at the chapter of the module shown, with the contents of the manual and a link « Toute l’aide » (the index of the manuals and tutorials) at the head')
def a80(c):
    c.open('data', app='maintenance', docs=LEVEL3)
    rail = c.js("[...document.querySelectorAll('#fMenu a, #fTabs a')].map(a => a.dataset.id || a.dataset.link || a.dataset.tab)")
    c.ok('help' not in rail and c.count('#fMenu a[href="#help"], #fTabs a[href="#help"]') == 0, str(rail), 'no « Aide » entry in the column nor the bar of Maintenance')
    c.ok(c.shown('#fHelp'), 'the « ? » is not shown', 'the « ? » of the header is the door')
    c.tap('#fHelp')
    c.until("location.hash.startsWith('#help') && !!document.querySelector('[data-help-all]')", timeout=15000, what='the manual opens from the « ? »')
    c.ok('m=data' in c.js('location.hash'), c.js('location.hash'), 'at the chapter of the module shown')
    head = c.js("[...document.querySelector('.f-help-all').parentElement.children].slice(0, 2).map(k => k.matches('.f-help-all') ? 'all' : k.matches('[data-toc]') ? 'toc' : k.className)")
    c.eq(head, ['all', 'toc'], 'at the head: « Toute l’aide », then the contents of this manual', what='head')
    c.tap('[data-help-all]')
    c.until("!!document.querySelector('[data-help-index]')", timeout=15000, what='the index of all the help')
    apps = c.js("[...document.querySelectorAll('[data-help-manuals] a')].map(a => a.dataset.app)")
    c.eq(sorted(apps), ['company', 'maintenance', 'pilot'], 'the manuals of the applications the device opens', what='manuals')
    c.ok(c.js("[...document.querySelectorAll('[data-help-manuals] a')].every(a => a.getAttribute('href').endsWith('#help'))"), '', 'each manual at its application’s address')
    tut = c.js("[...document.querySelectorAll('[data-help-tutorials] a')].map(a => a.getAttribute('href'))")
    c.ok(len(tut) >= 1 and all('#help?t=' in h and 'app=maintenance' not in h for h in tut), str(tut), 'the tutorials (Pilot’s), at Pilot’s address')
    c.check_errors()



@case('A81', 'The suite’s version: the last line of the Status block and the head of the copyable diagnostic', 'A', designs=('standard',), screens=False, night=False,
      rule='Simplification 1 Nov (the user: no « About », no footer, no version in Diagnostics): the version is written once — by the launcher (its status) or by build_pages (version.json of the site without a launcher) — and shown as the last line of the Status block « SOG <git describe> · <date> », and at the head of the copyable diagnostic')
def a81(c):
    ver = {'version': '6.0.0-alpha.2-25-g1a2b3c4', 'date': '2026-11-01', 'web': 'https://framagit.org/asr/flight_planner'}
    c.context.route(re.compile(r'/version\.json(\?|$)'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(ver)))
    c.context.add_init_script("""window.__copied = []; try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async s => { window.__copied.push(String(s)) } } }) } catch (e) {}""")
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]')", timeout=15000, what='the version line')
    keys = c.js("[...document.querySelectorAll('[data-card=\"status\"] li[data-k]')].map(l => l.dataset.k)")
    c.eq(keys[-1], 'version', 'the version is the last line of the Status block', what='last line')
    text = norm(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]').textContent"))
    c.ok(text.startswith('SOG 6.0.0-alpha.2-25-g1a2b3c4 · ') and len(text) > len('SOG 6.0.0-alpha.2-25-g1a2b3c4 · '), text, 'SOG, git describe, the date of the commit')
    c.eq(c.count('footer, .f-foot'), 0, 'no footer', what='footer')
    # the copyable diagnostic: the suite's version at its head
    c.js("() => { const d = document.querySelector('[data-diagbox]'); if (d) { d.open = true; d.closest('details.f-group')?.setAttribute('open', '') } }")
    c.until("!!document.querySelector('[data-diagbox] [data-act=\"copy\"]')", timeout=10000, what='the diagnostic’s copy button')
    c.wait(800)
    c.js("() => document.querySelector('[data-diagbox] [data-act=\"copy\"]').click()")
    c.until("(window.__copied || []).length > 0", timeout=10000, what='the diagnostic copied')
    got = json.loads(c.js("window.__copied.at(-1)"))
    keys = [k for k in got if k not in ('at', 'app')]
    c.eq([keys[0], got.get('suite')], ['suite', ver], 'the head of the diagnostic: the suite’s version', what='diagnostic')


def location_has(c):
    return 'mission=X-1' in c.js('location.hash')


@case('A82', 'The Company application: Missions then the Fleet (SOG-0231), in the switcher, its manual; « Prepare this flight » goes to Fuel in Pilot', 'A', designs=('standard',), screens=False, night=False,
      rule='Simplification 1 Nov (the user: « the Missions module is the first, and for now only, module of the airline pilot »): a third application `company` « Compagnie » ×4, Missions alone in its bar and column (a one-entry bar stays shown and marked), its manual (company.*: the Missions chapter); Missions leaves Pilot; #fuel from Company opens Fuel in Pilot, #missions in Pilot opens Company')
def a82(c):
    c.open('missions', app='company', docs=LEVEL3, wait=False)
    c.until("!!document.querySelector('[data-module=missions]')", timeout=20000, what='Company mounts Missions')
    rail = c.js("[...document.querySelectorAll('#fMenu a[data-id]')].map(a => a.dataset.id)")
    tabs = c.js("[...document.querySelectorAll('#fTabs a')].map(a => a.dataset.tab)")
    # SOG-0231 (the user, 10 Nov: « 2 entrées »): the Fleet is the second entry of Company (the module `aircraft` on its view `fleet`); it was Missions alone
    c.eq([[x for x in rail if x], tabs], [['missions', 'aircraft'], ['missions', 'fleet']], 'Company: Missions then the Fleet, in the column and the bar', what='entries')
    c.eq(c.js("[...document.querySelectorAll('#fTabs a[aria-current], #fMenu a[aria-current]')].length >= 1"), True, 'the current entry is marked', what='marked')
    c.ok(c.js('document.title').startswith(tx('frame/app.js', 'name', c.lang, after='APPS.company = {')), c.js('document.title'), 'the application’s name in the page title')
    # the switcher lists the three applications
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop [data-app]')", what='the switcher opens')
    c.eq(c.js("[...document.querySelectorAll('.f-tabpop [data-app]')].map(b => b.dataset.app)"), ['pilot', 'company', 'maintenance'], 'Pilot, Company, Maintenance', what='switcher')
    c.js("() => document.querySelector('.f-tabpop')?.remove()")
    # its manual: the Missions chapter
    c.page.goto(f'{c.base}/frame/index.html?app=company#help?m=missions', wait_until='load')
    c.until("!!document.querySelector('[data-chapter=\"missions\"]')", timeout=20000, what='the Company manual has the Missions chapter')
    c.eq(c.count('[data-chapter="fuel"]'), 0, 'and not Pilot’s chapters', what='chapters')
    # Pilot has no Missions; its old address goes to Company; Fuel from Company goes to Pilot
    c.page.goto(f'{c.base}/frame/index.html#fuel', wait_until='load')
    c.until("!!document.querySelector('[data-module=fuel]')", timeout=20000, what='Pilot')
    c.eq(c.count('#fMenu a[data-id="missions"], #fTabs a[data-tab="missions"]'), 0, 'Missions is not in Pilot', what='Pilot entries')
    c.page.goto(f'{c.base}/frame/index.html#missions', wait_until='load')
    c.until("location.search.includes('app=company') && !!document.querySelector('[data-module=missions]')", timeout=20000, what='#missions in Pilot opens Company')
    c.page.goto(f'{c.base}/frame/index.html?app=company#fuel?mission=X-1', wait_until='load')
    c.until("!location.search.includes('app=company') && location.hash.startsWith('#fuel') && !!document.querySelector('[data-module=fuel]')", timeout=20000,
            what='#fuel?mission= in Company opens Fuel in Pilot')
    # the query reaches Pilot (Fuel may consume it at once: the address the page arrived at says it)
    arrived = c.js("(performance.getEntriesByType('navigation')[0] || {}).name || ''")
    c.ok('#fuel?mission=X-1' in arrived or location_has(c), arrived, 'the query kept across the applications')



def _logo_launcher(c, logo, name='Air Dalton', path='airline/logo.png'):
    """A fake launcher whose data/ holds the airline's settings and its logo (bytes, or None: no file)."""
    status = {'server': True, 'data': True, 'dataGit': True, 'host': 'TEST', 'lan': False, 'lnm': []}
    # each scenario its own revisions (the settings and the head): the next pass brings them, as a real repository would
    rev = 'r-%s-%d' % (path or 'none', len(logo or b''))
    tree = {'airline/settings.json': rev, **({path: rev} if logo is not None and path else {})}

    def launcher(route):
        p = urllib.parse.urlparse(route.request.url).path
        body = status if p.endswith('/__setup/status') else {'head': 'h-' + rev, 'tree': tree} if p.endswith('/__setup/changes') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

    def data(route):
        p = urllib.parse.urlparse(route.request.url).path
        if p.endswith('/data/' + path) and logo is not None:
            return route.fulfill(status=200, content_type='application/octet-stream', body=logo)
        if p.endswith('/data/airline/settings.json'):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'name': name, **({'logo': path} if path else {})}))
        route.fulfill(status=404, body='')
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.unroute(re.compile(r'/data/airline/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.context.route(re.compile(r'/data/airline/'), data)
    return [['airline/settings.json', {'name': name, **({'logo': path} if path else {})}, 'document']]


@case('A83', 'The airline’s logo: the icon of the Company application, fitted, never cropped; none or unreadable, the tinted plane', 'A', designs=('standard',), screens=False, night=False,
      rule='Simplification 1 Nov (the user: not a tinted plane but the airline’s logo): a file of the data repository named in airline/settings.json (png, svg, webp; 512 KB at most), read by the data layer, shown in the header (28 px), the switcher (48 px) and the browser tab of Company, fitted (contain) and centred; a wide logo shrinks, never cropped; none, unreadable or too big: the tinted plane, without an error')
def a83(c):
    fix = ROOT / 'tests' / 'v3' / 'fixtures' / 'airline'
    ico = "(() => { const i = document.querySelector('#fAppIco img.f-logo'); if (!i) return null; const b = i.getBoundingClientRect(), s = getComputedStyle(i); return { w: Math.round(b.width), h: Math.round(b.height), fit: s.objectFit, nat: i.naturalWidth, src: i.getAttribute('src').slice(0, 5), fav: (document.querySelector('link[rel=icon]').getAttribute('href') || '').slice(0, 5) } })()"
    for name, f in (('dalton', 'logo-dalton.png'), ('rm', 'logo-rm.png')):
        docs = _logo_launcher(c, (fix / f).read_bytes())
        c.open('missions', app='company', docs=LEVEL3 + docs, wait=False)
        c.until("!!document.querySelector('#fAppIco img.f-logo') && document.querySelector('#fAppIco img.f-logo').naturalWidth > 0", timeout=20000, what=f'the {name} logo in the header')
        got = c.js(ico)
        c.eq([got['w'], got['h'], got['fit'], got['src'], got['fav']], [28, 28, 'contain', 'blob:', 'blob:'],
             f'{name}: 28 px, fitted (contain: never cropped, never deformed), from the device (blob:), the browser tab too', what=f'{name} header')
        c.tap('#fApp')
        c.until("!!document.querySelector('.f-tabpop [data-app=\"company\"] img.f-logo')", what=f'the {name} logo in the switcher')
        box = c.js("(() => { const b = document.querySelector('.f-tabpop [data-app=\"company\"] .f-app-ico').getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)] })()")
        c.eq(box, [48, 48], f'{name}: 48 px in the switcher', what=f'{name} switcher')
        c.ok('Air Dalton' in c.js("document.querySelector('.f-tabpop [data-app=\"company\"]').textContent"), '', 'the airline’s name as the subtitle')
        c.js("() => document.querySelector('.f-tabpop')?.remove()")
    # no file, an unreadable file, a file too big: the tinted plane, no error
    svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><script>window.__svgRan = 1</script><circle cx="32" cy="32" r="30"/></svg>'
    for what, logo, path in (('absent', None, ''), ('unreadable', b'this is not an image', 'airline/bad.png'),
                             ('too big', b'\x89PNG\r\n\x1a\n' + b'\0' * (513 * 1024), 'airline/big.png'),
                             ('svg (never: opened as a document it would run in the suite’s origin)', svg, 'airline/logo.svg'),
                             ('svg named .png', svg, 'airline/svg.png')):
        docs = _logo_launcher(c, logo, path=path)
        c.open('missions', app='company', docs=LEVEL3 + docs, wait=False)
        c.until("!!document.querySelector('[data-module=missions]')", timeout=20000, what='Company is drawn')
        c.wait(1500)
        c.eq([c.count('#fAppIco img'), c.count('#fAppIco svg'), c.js('window.__svgRan || 0')], [0, 1, 0], f'{what}: the tinted plane', what=f'{what} icon')
        if logo is not None:
            c.until("[...document.querySelectorAll('.f-note')].some(n => /png/.test(n.textContent) && /webp/.test(n.textContent) && /512/.test(n.textContent))",
                    timeout=15000, what=f'{what}: the refusal said to the administrator (png or webp, 512 KB at most)')
    c.check_errors()


@case('A84', 'The « À propos » card: the version and its date first, the licence, the roadmap; no second door to the help', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 (one door « Aide » per screen, 9377637d6; the version by ctx.version(), e0715d83b): the group « Aide » is « À propos »; its card says the version and its date at the top, the licence and the roadmap, and links to the help no more')
def a84(c):
    diag = 'frame/settings/diagnostic.js'
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False,
              'host': 'TEST', 'lan': False, 'version': {'version': '6.0.0-alpha.2-25-g1a2b3c4', 'date': '2026-11-01'}}
    c.context.route(re.compile(r'/__setup/'), lambda r: r.fulfill(status=200, content_type='application/json',
                                                                   body=json.dumps(status if urllib.parse.urlparse(r.request.url).path.endswith('/__setup/status') else {})))
    c.open('settings?card=about', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"about\"] [data-version]')", timeout=15000, what='the About card with its version')
    c.eq(norm(c.text('[data-card="about"] [data-version]')), norm(tx(diag, 'aboutVersion', c.lang).replace('{v}', '6.0.0-alpha.2-25-g1a2b3c4').replace('{d}', '2026-11-01')),
         'the version and its date, first', what='version')
    c.eq([c.count('[data-card="about"] [data-licence]'), c.count('[data-card="about"] a[href="#roadmap"]'), c.count('[data-card="about"] a[href^="#help"]')], [1, 1, 0],
         'the licence and the roadmap; no link to the help (its one door is the « ? » of the header)', what='links')
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-group=\"help\"] > summary')", timeout=15000, what='the settings groups')
    c.eq(norm(c.text('[data-group="help"] > summary')).startswith(norm(tx('frame/settings/groups.js', 'help', c.lang))), True, 'the group is named « À propos »', what='group name')


# ------------------------------------------------------------------------------------------------------ A85
# FrameData.pendingList() answered by the test (window.FrameData is patched the moment the frame defines it): the list is read from sessionStorage '__pend' at each call
_SYNC_STUB = """(() => { let FD; const patch = v => { if (v && typeof v.pendingList === 'function' && !v.__stub) { v.__stub = 1; v.pendingList = async () => JSON.parse(sessionStorage.getItem('__pend') || '[]'); v.lastPushed = async () => JSON.parse(sessionStorage.getItem('__pushed') || '[]') } return v };
  Object.defineProperty(window, 'FrameData', { configurable: true, get() { return FD }, set(v) { FD = patch(v) } }) })()"""
# a document written as it is (a YAML text), the way the cache keeps a mission: the seed helper writes JSON
_RAW_SEED_JS = """async ([path, text]) => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame');
    r.onupgradeneeded = () => { const d = r.result; for (const [n, o] of [['docs', { keyPath: 'path' }], ['pending', { keyPath: 'path' }], ['meta', { keyPath: 'key' }], ['conflicts', { keyPath: 'id', autoIncrement: true }]]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o) };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  await new Promise((res, rej) => { const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ path, text, base: text, rev: '', at: Date.now(), policy: 'cache' }); tx.oncomplete = res; tx.onerror = () => rej(tx.error) });
  db.close() }"""
_SHEET_TITLE = {'fr': 'Fiche A320 Navy', 'en': 'Sheet A320 Navy', 'de': 'Datenblatt A320 Navy', 'es': 'Ficha A320 Navy'}
_FLIGHT_TITLE = {'fr': 'Vol LFPO → LFBO du 3/11', 'en': 'Flight LFPO → LFBO of 3/11', 'de': 'Flug LFPO → LFBO vom 3/11', 'es': 'Vuelo LFPO → LFBO del 3/11'}
_SYNC_DOCS = [['aircraft/sheets/DB_A320.json', {'id': 'DB_A320', 'name': 'A320 Navy'}, 'cache'],
              ['aircraft/sheets/DB_EVIL.json', {'id': 'DB_EVIL', 'name': '<img src=x onerror=alert(1)>'}, 'cache'],
              ['pilot/ABC/current_flight.json', {'route': {'dep': 'LFPO', 'arr': 'LFBO'}, 'planned_at': '2026-11-03T08:00:00Z'}, 'cache']]
_SYNC_MISSION = ('missions/2026-11/missionA-001A.yaml', 'id: A-001A\ntitle: Vol de nuit\n')


def _sync_item(path, at='2026-10-30T08:30:00.000Z', deletion=False, error=''):
    """One element of FrameData.pendingList(): the path, the module, the time, a deletion, the error that holds the queue."""
    return {'path': path, 'module': '', 'at': at, 'deletion': deletion, 'error': error}


def _sync_open(c, pend, status=None, pushed=None, extra=()):
    """Opens the Synchronisation card at 390 with the device's cache seeded (the titles read it), pendingList answering `pend`, and a launcher stub answering sync-status with `status` (None: no launcher)."""
    c.page.add_init_script(_SYNC_STUB)
    c.page.goto(f'{c.base}/frame/manifest.webmanifest')
    c.page.evaluate("(p) => sessionStorage.setItem('__pend', JSON.stringify(p))", pend)
    c.page.evaluate("(p) => sessionStorage.setItem('__pushed', JSON.stringify(p))", pushed or [])
    from lib import _seed
    _seed(c.page, c.base, [['device/level.json', {'level': 3}, 'cache'], ['device/usages.json', {'devices': True}, 'cache']] + _SYNC_DOCS + list(extra))
    c.page.evaluate(_RAW_SEED_JS, list(_SYNC_MISSION))
    if status is not None:
        full = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
        c.context.route(re.compile(r'/__setup/'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(
            full if urllib.parse.urlparse(r.request.url).path.endswith('/__setup/status') else
            status if urllib.parse.urlparse(r.request.url).path.endswith('/__setup/sync-status') else {})))
    c.page.goto(f'{c.base}/frame/index.html#settings?card=sync', wait_until='load')
    c.until("!!document.querySelector('[data-card=\"sync\"] [data-sync-head]')", timeout=20000, what='the Synchronisation card')
    c.until("document.querySelector('[data-card=\"sync\"] [data-sync-head]').textContent.includes(':') && !document.querySelector('[data-card=\"sync\"]').hidden", timeout=15000, what='the card is drawn')


@case('A85', 'The Synchronisation card as the sync summary: one count per kind, a folded list per kind with readable titles, the reason of an error, seven items at most; with a launcher, changed here and to send', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='frame/settings SPEC 3 item 7 (the user, 1 Nov 2026: « je ne sais pas quelles fiches appareil sont synchro et lesquelles ne le sont pas »): no new screen, the card is the summary; titles by meta.titleOf of the module that owns the kind, escaped; paths are text')
def a85(c):
    lang = c.lang
    sj = 'frame/settings/sync_summary.js'
    kind = lambda k: tx(sj, k, lang, after='kind: {')
    head = lambda n: norm(f"{tx('frame/settings/access.js', 'pending', lang)} : " + ' · '.join(f'{kind(k)} : {v}' for k, v in n if v or k != 'other'))
    sheet, mission, flight = _sheet_path, _mission_path, _flight_path = 'aircraft/sheets/DB_A320.json', _SYNC_MISSION[0], 'pilot/ABC/current_flight.json'
    # ---- A: three kinds waiting (a sheet, a mission, a flight held by an error), one of them a hostile title and a hostile path
    pend = [_sync_item(flight, error='HTTP 503'), _sync_item(mission, at='2026-10-29T08:00:00.000Z'), _sync_item(sheet), _sync_item('aircraft/sheets/DB_EVIL.json'),
            _sync_item('x"><script>window.__pwn=1</script>.json', deletion=True)]
    _sync_open(c, pend)
    c.eq(norm(c.text('[data-card="sync"] [data-sync-head]')), head([('sheets', 2), ('missions', 1), ('flights', 1), ('fleet', 0), ('other', 1)]),
         'the head: one count per kind, « Autres » only when it is not zero', what='head')
    c.eq(c.js("[...document.querySelectorAll('[data-card=\"sync\"] details[data-kind-list]')].map(d => [d.dataset.kindList, d.open])"), [['sheets', False], ['missions', False], ['flights', False], ['other', False]],
         'one folded list per kind that has something waiting', what='folded lists')
    c.js("document.querySelectorAll('[data-card=\"sync\"] details[data-kind-list]').forEach(d => d.open = true)")
    titles = c.js("[...document.querySelectorAll('[data-card=\"sync\"] li[data-item]')].map(li => [li.querySelector('[data-title]')?.textContent || li.querySelector('code')?.textContent, li.querySelector('[data-reason]')?.textContent || ''])")
    evil = {'fr': 'Fiche', 'en': 'Sheet', 'de': 'Datenblatt', 'es': 'Ficha'}[lang] + ' <img src=x onerror=alert(1)>'
    c.eq(titles, [[_SHEET_TITLE[lang], ''], [evil, ''], ['A-001A Vol de nuit', ''], [_FLIGHT_TITLE[lang], 'HTTP 503'], ['x"><script>window.__pwn=1</script>.json', '']],
         'readable titles from the modules (sheet, mission, flight), the path when there is none, the reason of the error on the held item', what='titles')
    c.ok('onerror' in titles[1][0] and c.count('[data-card="sync"] img') == 0 and c.js("window.__pwn === undefined"), titles[1], 'a hostile title is text: no element, nothing runs')
    c.eq([c.count('[data-card="sync"] script'), c.count('[data-card="sync"] a:not([href="#conflicts"])'), c.count('[data-card="sync"] li[data-item] [aria-label]')], [0, 0, 1],
         'a path is text (no link, no element), a deletion is marked once', what='paths as text')
    c.eq(c.js("(() => { const b = document.querySelector('[data-card=\"sync\"] [data-act=sync]'); return [b.classList.contains('primary'), b.textContent.trim(), b.getBoundingClientRect().height >= 44] })()"),
         [True, tx(sj, 'sendAll', lang), True], '« Tout envoyer » is the primary button, at touch height', what='send all')
    # ---- B: more than seven waiting: seven at most visible, the rest said
    docs_n = [_sync_item(f'aircraft/sheets/DB_S{i}.json') for i in range(5)] + [_sync_item(f'missions/2026-11/missionB-00{i}.yaml') for i in range(2)] + [_sync_item(flight), _sync_item('airline/settings.json')]
    c.page.evaluate("(p) => sessionStorage.setItem('__pend', JSON.stringify(p))", docs_n)
    c.page.reload(wait_until='load')
    c.until("document.querySelector('[data-card=\"sync\"] [data-sync-head]')?.textContent.includes('5')", timeout=15000, what='the card shows the second queue')
    c.js("document.querySelectorAll('[data-card=\"sync\"] details[data-kind-list]').forEach(d => d.open = true)")
    c.eq(norm(c.text('[data-card="sync"] [data-sync-head]')), head([('sheets', 5), ('missions', 2), ('flights', 1), ('fleet', 0), ('other', 1)]), 'the head counts everything waiting', what='head 9')
    c.eq([c.count('[data-card="sync"] li[data-item]'), [norm(x) for x in c.js("[...document.querySelectorAll('[data-card=\"sync\"] [data-more]')].map(m => m.textContent)")]],
         [7, [norm(tx('frame/settings/access.js', 'queueMore', lang).replace('{n}', '1'))] * 2], 'seven items visible at most in all; the others are said (« … and 1 more ») under their kind', what='seven at most')
    # ---- C: with a launcher: what data/ holds back, changed here and to send, a path once
    status = {'repo': True, 'changes': 2, 'changed': [sheet, mission], 'changedTotal': 2, 'toPush': [sheet, flight], 'toPushTotal': 2, 'ahead': 1, 'behind': 0, 'merging': False}
    c.page.evaluate("() => sessionStorage.setItem('__pend', '[]')")
    _sync_open(c, [], status)
    c.until("document.querySelectorAll('[data-card=\"sync\"] li[data-item]').length > 0 || document.querySelector('[data-card=\"sync\"] [data-sync-head]').textContent.includes('1')", timeout=15000, what='the launcher\u2019s lists')
    c.js("document.querySelectorAll('[data-card=\"sync\"] details[data-kind-list]').forEach(d => d.open = true)")
    c.eq(norm(c.text('[data-card="sync"] [data-sync-head]')), head([('sheets', 1), ('missions', 1), ('flights', 1), ('fleet', 0), ('other', 0)]), 'a path in both lists counts once', what='head launcher')
    items = c.js("[...document.querySelectorAll('[data-card=\"sync\"] li[data-item]')].map(li => [li.querySelector('[data-title]')?.textContent, [...li.querySelectorAll('[data-flag]')].map(f => f.textContent)])")
    ch, push = tx(sj, 'flagChanged', lang), tx(sj, 'flagPush', lang)
    c.eq(items, [[_SHEET_TITLE[lang], [ch, push]], ['A-001A Vol de nuit', [ch]], [_FLIGHT_TITLE[lang], [push]]],
         'modified here (not committed) and to send (commits to push), the two for a path that is in both', what='launcher items')
    c.check_errors()


@case('A86', 'A saved sheet is two files waiting (the sheet and its mirror): counted together under the sheets, the mirror named', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='frame/settings SPEC 3 item 7 (SOG-0023 b, 5 Nov 2026): aerodb writes aircraft/sheets/<id>.json AND the mirror planner/flight_performance_database_merged.fpdb.json with every saved sheet; the Synchronisation card counts both under the sheets, no « Autres » line nothing explains, and names the mirror as the copy of the saved sheets')
def a86(c):
    lang = c.lang
    sj = 'frame/settings/sync_summary.js'
    kind = lambda k: tx(sj, k, lang, after='kind: {')
    head = lambda n: norm(f"{tx('frame/settings/access.js', 'pending', lang)} : " + ' · '.join(f'{kind(k)} : {v}' for k, v in n if v or k != 'other'))
    mirror = 'planner/flight_performance_database_merged.fpdb.json'
    _sync_open(c, [_sync_item('aircraft/sheets/DB_A320.json'), _sync_item(mirror)])
    c.eq(norm(c.text('[data-card="sync"] [data-sync-head]')), head([('sheets', 2), ('missions', 0), ('flights', 0), ('fleet', 0), ('other', 0)]),
         'a saved sheet is two files waiting, counted under the sheets and no « Autres » line', what='mirror head')
    c.js("document.querySelectorAll('[data-card=\"sync\"] details[data-kind-list]').forEach(d => d.open = true)")
    got = c.js("[...document.querySelectorAll('[data-card=\"sync\"] li[data-item]')].map(li => li.querySelector('[data-title]')?.textContent || li.querySelector('code')?.textContent)")
    c.eq(got[1], {'fr': 'Base des fiches (copie des fiches enregistrées)', 'en': 'Sheets database (copy of the saved sheets)',
                  'de': 'Datenblatt-Datenbank (Kopie der gespeicherten Datenblätter)', 'es': 'Base de fichas (copia de las fichas guardadas)'}[lang],
         'the mirror is named as the copy of the saved sheets, not left as a bare path', what='mirror title')
    c.check_errors()


@case('A87', 'The Synchronisation card says what has just left (FrameData.lastPushed): one line with a count per kind, the refusals first with their reason, seven items at most, nothing when nothing left', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='frame/settings SPEC 3 item 7 (SOG-0029, V3 Frame 536ea9ec5: lastPushed() = [{ path, at, result }], the last send): « parti à 18 h 04 : fiches 2, missions 1 », titles by meta.titleOf, the reason of a refusal, folded beyond seven; a reason is text (audit 157)')
def a87(c):
    import datetime
    lang = c.lang
    sj = 'frame/settings/sync_summary.js'
    kind = lambda k: tx(sj, k, lang, after='kind: {')
    sheet, mission, flight = 'aircraft/sheets/DB_A320.json', _SYNC_MISSION[0], 'pilot/ABC/current_flight.json'
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    pushed = lambda paths_results: [{'path': p, 'at': now, 'result': r} for p, r in paths_results]
    line = lambda: norm(c.text('[data-card="sync"] details[data-pushed] > summary'))
    # ---- A: nothing waiting, four files left (one refused with a hostile reason): the card is shown for them, one line, refusals first
    evil = '403 <img src=x onerror=window.__pwn=1>'
    _sync_open(c, [], pushed=pushed([(sheet, 'ok'), (mission, 'ok'), (flight, evil), ('airline/settings.json', 'ok')]))
    c.until("!!document.querySelector('[data-card=\"sync\"] details[data-pushed]')", timeout=15000, what='the line of what has just left')
    prefix = norm(tx(sj, 'pushedAt', lang).split('{t}')[0])
    tail = ' · '.join(f'{kind(k)} : {v}' for k, v in [('sheets', 1), ('missions', 1), ('flights', 1), ('other', 1)]) + f" ({norm(tx(sj, 'pushedRefused', lang).replace('{n}', '1').replace('(s)', ''))})"
    got = line()
    c.ok(got.startswith(prefix) and got.endswith(tail), got, 'one line: the time, a count per kind, how many were refused')
    c.eq(c.js("[...document.querySelectorAll('[data-card=\"sync\"] details[data-pushed]')].map(d => [d.open, d.dataset.count, d.dataset.refused])"), [[False, '4', '1']], 'folded, four files, one refused', what='folded')
    c.js("document.querySelector('[data-card=\"sync\"] details[data-pushed]').open = true")
    items = c.js("[...document.querySelectorAll('[data-card=\"sync\"] li[data-pushed-item]')].map(li => [li.dataset.pushedItem, li.querySelector('[data-title]')?.textContent || li.querySelector('code')?.textContent, li.querySelector('[data-reason]')?.textContent || ''])")
    c.eq(items, [['refused', _FLIGHT_TITLE[lang], evil], ['ok', _SHEET_TITLE[lang], ''], ['ok', 'A-001A Vol de nuit', ''], ['ok', 'airline/settings.json', '']],
         'the refusal first with its reason, then the others by their readable title (the path when there is none)', what='items')
    c.ok(c.count('[data-card="sync"] details[data-pushed] img') == 0 and c.js("window.__pwn === undefined"), items[0], 'a reason is text: no element, nothing runs')
    # ---- B: nine files left: seven at most, the rest said
    nine = [(f'aircraft/sheets/DB_S{i}.json', 'ok') for i in range(9)]
    c.page.evaluate("(p) => sessionStorage.setItem('__pushed', JSON.stringify(p))", pushed(nine))
    c.page.reload(wait_until='load')
    c.until("document.querySelector('[data-card=\"sync\"] details[data-pushed]')?.dataset.count === '9'", timeout=15000, what='the nine files')
    c.js("document.querySelector('[data-card=\"sync\"] details[data-pushed]').open = true")
    c.eq([c.count('[data-card="sync"] li[data-pushed-item]'), [norm(x) for x in c.js("[...document.querySelectorAll('[data-card=\"sync\"] details[data-pushed] [data-more]')].map(m => m.textContent)")]],
         [7, [norm(tx('frame/settings/access.js', 'queueMore', lang).replace('{n}', '2'))]], 'seven at most, the others said', what='seven')
    # ---- C: nothing left (before the first send): no line
    c.page.evaluate("() => sessionStorage.setItem('__pushed', '[]')")
    c.page.reload(wait_until='load')
    c.settle()
    c.eq(c.count('[data-card="sync"] details[data-pushed]'), 0, 'nothing left, nothing said', what='none')
    # ---- D: the pure reading, a hostile or malformed list says nothing wrong
    c.until('!!window.SogSyncSummary', timeout=8000, what='the module of the card is loaded')
    r = c.js("""() => { const S = window.SogSyncSummary; return [S.pushedItems(null).items.length, S.pushedItems([{ path: '', result: 'ok' }, 5, null, { path: 'a.json', result: 'ok', at: 'nope' }, { path: 'a.json', result: 'ok' }]).items.map(i => [i.path, i.ok, i.kind]),
      S.pushedItems([{ path: 'x', result: 'y'.repeat(900), at: '2026-11-05T10:00:00Z' }]).items[0].result.length, S.pushedItems([{ path: 'x', result: 'ok', at: '2026-11-05T10:00:00Z' }]).at,
      S.pushedItems([{ path: 'x', result: 'ok' }, { path: 'z', result: '' }]).items.map(i => [i.path, i.ok])] }""")
    c.eq(r, [0, [['a.json', True, 'other']], 200, '2026-11-05T10:00:00Z', [['z', False], ['x', True]]],
         'no list, no path, a repeated path, a long reason (200 at most), no result is not a success, the refusals first', what='pushedItems')
    c.check_errors()


# ---- SOG-0013, the frame's half (V3 Frame): the writer of the real position reads the flight again just before it writes.
# The data layer is wrapped before the frame starts (FrameData is assigned once, `adapter` is a plain property): the frame's own put of the
# device track (the wait between its first reading of the flight and its write) runs a hook first; the frame-live adapter's get can be
# made to answer « nothing ». Nothing of the application is replaced: the hook only plays the other writer (Fuel, the Map) at the worst moment.
_LIVE_HOOK = """(() => { let fd;
  Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set(v) {
    fd = v;
    if (!v || typeof v.adapter !== 'function' || v.__wrapped) return;
    const adapter = v.adapter; v.__wrapped = true;
    v.adapter = function (decl) {
      const a = adapter.apply(this, arguments);
      if (decl && decl.id === 'frame') { const put = a.put; a.put = async function (path) { if (path === 'device/trail.json') await window.__between?.(); return put.apply(this, arguments) } }
      if (decl && decl.id === 'frame-live') { const get = a.get; a.get = async function () { const r = await get.apply(this, arguments); return window.__getAs ? window.__getAs(r) : r } }
      return a } } }) })();"""
_FLIGHT_PATH = 'pilot/ABC/current_flight.json'


def _started_flight():
    """The seeded flight under way, its start written as Fuel writes it (toISOString, with milliseconds, 10 s ago): a start to the second
    would sort after a position of the same second (« …50Z » after « …50.149Z »), and the frame would take the position for a left-over."""
    import datetime
    d = [x for x in flight_docs(False) if x[0] == _FLIGHT_PATH][0]
    d[1]['started'] = {'at': (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=10)).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z', 'by': 'fuel'}
    return d


@case('A88', 'The real position is written on the flight read again: a route and a level written meanwhile stay', 'A', tags=('data',), designs=('standard',),
      screens=False, night=False,
      rule='SOG-0013, the frame’s half (frame/app.js onFix, V3 Frame): the position writer reads the flight again after its waits (the device track) and writes progress.actual alone on that reading; what another writer (Fuel, the Map) wrote in the meantime stays, and the departure of a flight that ended meanwhile is not brought back')
def a88(c):
    c.page.add_init_script(_LIVE_HOOK + """
      window.__between = async () => {            // the other writer, in the frame's wait: the route and the level of the flight change
        if (window.__betweenDone) return;
        window.__betweenDone = 1;
        const w = FrameData.adapter({ id: 'between', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
        const f = await w.get('pilot/ABC/current_flight.json');
        // second part: the flight ends in the wait (« Cancel the start »: started and progress null), otherwise the route and the level change
        const ends = sessionStorage.getItem('__ender') === '1';
        await w.put('pilot/ABC/current_flight.json', ends ? { ...f, by: 'fuel', started: null, progress: null, updated_at: new Date().toISOString() }
          : { ...f, by: 'fuel', route: { ...f.route, text: 'LFRS DCT LFML', between: true }, level: { ft: 31000 }, updated_at: new Date().toISOString() });
      };""")
    c.page.context.grant_permissions(['geolocation'])
    c.page.context.set_geolocation({'latitude': 47.0, 'longitude': -1.0})
    c.open('flightlog', flight=False, docs=[['device/live.json', {'gps': True}, 'cache'], _started_flight()])
    got = c.until_doc(_FLIGHT_PATH, lambda d: bool(d and (d.get('progress') or {}).get('actual')), what='the frame wrote the position', timeout=20000)
    c.ok(c.js('window.__betweenDone === 1'), 'the other writer never ran', 'the other writer wrote inside the frame’s wait (otherwise nothing is proved)')
    c.eq(got['progress']['actual']['source'], 'gps', 'the position is the device’s', what='source')
    c.eq((got['route'].get('between'), got['route'].get('text'), got['level']), (True, 'LFRS DCT LFML', {'ft': 31000}),
         'the route and the level written during the wait are still there after the position', what='route and level')
    c.eq(got['route']['points'][0]['id'], 'LFRS', 'the rest of the route is the record’s', what='points')
    # a flight that ends in the wait keeps its end: the writer works on the flight read again (no start: it returns), never on the earlier
    # reading, which would bring the departure back (the `flying` guard alone is not isolated here: the next reading of the frame would take
    # a position left on an ended flight off again)
    c.page.evaluate("() => sessionStorage.setItem('__ender', '1')")
    c.open('flightlog', flight=False, docs=[['device/live.json', {'gps': True}, 'cache'], _started_flight()])
    c.until('window.__betweenDone === 1', timeout=20000, what='the flight ended inside the frame’s wait')
    c.wait(1500)
    ended = c.doc(_FLIGHT_PATH)
    c.eq((ended.get('started'), (ended.get('progress') or {}).get('actual')), (None, None),
         'the flight that ended in the wait keeps its end and carries no position', what='flight ended in the wait')
    c.page.evaluate("() => sessionStorage.removeItem('__ender')")
    c.check_errors()


@case('A89', 'The position removed from a flight is removed from the flight read again; nothing to remove, nothing written', 'A', tags=('data',), designs=('standard',),
      screens=False, night=False,
      rule='SOG-0013, the frame’s half (frame/app.js clearActual, V3 Frame): the removal of a left-over position reads the flight again; when it has no position any more (removed elsewhere, record unreadable) the earlier reading is never written back')
def a89(c):
    import datetime
    old = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=30)).strftime('%Y-%m-%dT%H:%M:%SZ')

    def flight(with_actual):
        d = [x for x in flight_docs(False) if x[0] == _FLIGHT_PATH][0]
        d[1]['route']['text'] = 'LFRS LUGEN NEPIX LFML'
        if with_actual:
            d[1]['progress'] = {'actual': {'at': old, 'lat': 46.0, 'lon': 1.0, 'source': 'gps'}, 'phase': 'cruise'}
        return d
    # A: a flight not under way that still carries a position: the position goes, the rest stays (progress.phase, the route)
    c.open('flightlog', flight=False, docs=[flight(True)])
    got = c.until_doc(_FLIGHT_PATH, lambda d: bool(d and not (d.get('progress') or {}).get('actual')), what='the left-over position is removed', timeout=15000)
    c.eq(((got.get('progress') or {}).get('phase'), got['route']['text'], got.get('by')), ('cruise', 'LFRS LUGEN NEPIX LFML', 'frame'),
         'only progress.actual is removed; the rest of the record stays', what='the record after the removal')
    # B: the flight read again has no position (the layer answers « nothing » to the second reading): nothing is written back
    c.page.add_init_script(_LIVE_HOOK + """
      window.__nulls = 0;      // from the first reading that carries the position on: the layer answers « nothing » (record unreadable)
      window.__getAs = r => { if (window.__armed) { window.__nulls++; return null }
        if (r && r.progress && r.progress.actual) window.__armed = 1;
        return r };""")
    c.open('flightlog', flight=False, docs=[flight(True)])
    c.until('window.__nulls >= 1', timeout=15000, what='the flight read again answered nothing')
    c.wait(1200)
    kept = c.doc(_FLIGHT_PATH)
    c.ok(bool((kept.get('progress') or {}).get('actual')), str(kept.get('progress')), 'the earlier reading is not written back over a flight the layer could not read again')
    c.check_errors()


@case('A90', 'A position is compared with the start by instants, not as text: a start to the second or in +02:00 never takes a later position for a left-over', 'A',
      tags=('data',), designs=('standard',), screens=False, night=False,
      rule='SOG-0037 (frame/app.js liveCheck, V3 Frame): « position older than the start » is decided on the instants (Date.parse, as `flying` does), not on the text of two ISO dates written in different forms (seconds or milliseconds, Z or +02:00)')
def a90(c):
    import datetime
    t0 = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=60)).replace(microsecond=0)
    z = lambda d, ms=False: d.strftime('%Y-%m-%dT%H:%M:%S') + (f'.{d.microsecond // 1000:03d}' if ms else '') + 'Z'
    plus2 = lambda d: (d + datetime.timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M:%S') + '+02:00'
    ms = lambda n: datetime.timedelta(milliseconds=n)
    # (what is said, the start, the position, is the position removed?)
    scenes = [
        ('a start to the second, a position 400 ms later in milliseconds (« …50Z » sorts after « …50.400Z »): kept', z(t0), z(t0 + ms(400), True), False),
        ('a start in +02:00, a position 5 s later in Z: kept (« 09:… » sorts after « 07:… »)', plus2(t0), z(t0 + ms(5000), True), False),
        ('a start in milliseconds, a position 500 ms before it, to the second (« …50Z » sorts after « …50.500Z »): removed', z(t0 + ms(500), True), z(t0), True),
        ('a start in +02:00, a position 10 min before it, in Z: removed', plus2(t0), z(t0 - ms(600000), True), True),
    ]
    for what, started, at, removed in scenes:
        d = [x for x in flight_docs(False) if x[0] == _FLIGHT_PATH][0]
        d[1]['started'] = {'at': started, 'by': 'fuel'}
        d[1]['progress'] = {'actual': {'at': at, 'lat': 46.0, 'lon': 1.0, 'source': 'gps'}, 'phase': 'cruise'}
        c.open('flightlog', flight=False, docs=[d])
        if removed:
            got = c.until_doc(_FLIGHT_PATH, lambda x: bool(x and not (x.get('progress') or {}).get('actual')), what=what, timeout=15000)
        else:
            c.wait(1800)
            got = c.doc(_FLIGHT_PATH)
            c.ok(bool((got.get('progress') or {}).get('actual')), str(got.get('progress')), what)
        c.eq((got['started']['at'], (got.get('progress') or {}).get('phase')), (started, 'cruise'), 'the start and the rest of the progress are untouched', what=what[:40])
    c.check_errors()


@case('A91', 'The documents kept before the trigram are taken up by instants: the later one wins, whatever the form of its date', 'A', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0043 (frame/app.js adoptAnon, V3 Frame): a document present under pilot/ANON/ and under the trigram keeps the later one (instant of updated_at, FrameData.isNewer), the other goes to the conflicts; never compared as text (+02:00 against Z, a second against milliseconds)')
def a91(c):
    docs = [
        # the anonymous one is 09:00+02:00 = 07:00Z, the trigram's is 07:30Z: the trigram's is later (as text, « 09 » sorts after « 07 »)
        ['pilot/ANON/reports/r1.json', {'schema': 1, 'v': 'anon', 'updated_at': '2026-11-06T09:00:00+02:00'}, 'document'],
        ['pilot/ABC/reports/r1.json', {'schema': 1, 'v': 'abc', 'updated_at': '2026-11-06T07:30:00.000Z'}, 'document'],
        # the anonymous one is 400 ms after the trigram's: the anonymous one is later (as text, « …50Z » sorts after « …50.400Z »)
        ['pilot/ANON/reports/r2.json', {'schema': 1, 'v': 'anon', 'updated_at': '2026-11-06T07:00:50.400Z'}, 'document'],
        ['pilot/ABC/reports/r2.json', {'schema': 1, 'v': 'abc', 'updated_at': '2026-11-06T07:00:50Z'}, 'document'],
    ]
    c.open('flightlog', flight=False, docs=docs)
    c.until_doc('pilot/ANON/reports/r1.json', lambda d: d is None, what='the anonymous documents are taken up', timeout=15000)
    c.until_doc('pilot/ANON/reports/r2.json', lambda d: d is None, what='the second anonymous document is taken up', timeout=15000)
    c.eq(c.doc('pilot/ABC/reports/r1.json')['v'], 'abc', 'the trigram’s document is the later instant (07:30Z against 07:00Z): kept', what='r1')
    c.eq(c.doc('pilot/ABC/reports/r2.json')['v'], 'anon', 'the anonymous document is 400 ms later: it replaces the trigram’s', what='r2')
    lost = c.js("() => FrameData.conflicts().then(cs => cs.filter(x => x.path.startsWith('pilot/ABC/reports/')).map(x => [x.path, JSON.parse(x.lost).v]).sort())")
    c.eq(lost, [['pilot/ABC/reports/r1.json', 'anon'], ['pilot/ABC/reports/r2.json', 'abc']], 'the loser of each is kept in the conflicts', what='conflicts')
    c.check_errors()


@case('A92', 'Conflicts: « Mark all as seen (n) » clears the old ones in one click; the Synchronisation card’s count falls to zero', 'A', tags=('data',),
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0043 (frame/app.js renderConflicts, V3 Frame): a button with the count of the unseen conflicts marks them all seen (conflictSeen on each); absent when there is none; the count of the Synchronisation card falls to zero at once; « Seen » of each conflict and « Take this version back » unchanged')
def a92(c):
    c.open('settings')
    c.js("""async () => { for (let i = 0; i < 8; i++) await FrameData.noteConflict({ path: `pilot/ABC/old/${i}.json`, kept: '{"v":"kept"}', lost: '{"v":"lost"}', side: 'remote' }) }""")
    # the count of the Synchronisation card (access.js: « See the conflicts (n) ») and of the status button is FrameData.status().conflicts
    c.eq(c.js("() => FrameData.status().then(s => s.conflicts)"), 8, 'eight old conflicts kept on the device', what='status before')
    c.page.evaluate("() => { location.hash = '#conflicts' }")
    c.until("!!document.querySelector('[data-allseen]')", timeout=10000, what='the button of the unseen conflicts')
    btn = c.text('[data-allseen]')
    n = lambda: c.count('#fView .f-card[data-id]')
    c.eq(n(), 8, 'eight cards, each with « Seen » and « Take this version back »', what='cards')
    c.eq((c.count('#fView .f-card[data-id] [data-seen]'), c.count('#fView .f-card[data-id] [data-restore]')), (8, 8), 'the buttons of each conflict stay', what='per-conflict buttons')
    c.ok('8' in btn, btn, 'the button carries the count of the unseen conflicts (8)')
    c.page.click('[data-allseen]')
    c.until("!document.querySelector('[data-allseen]')", timeout=10000, what='the button is gone once none is left')
    c.eq(c.js("() => FrameData.status().then(s => s.conflicts)"), 0, 'the count falls to zero at once', what='status after')
    c.eq(n(), 0, 'the list is empty (the seen ones are behind the checkbox)', what='cards after')
    c.page.check('[data-all]')
    c.until("document.querySelectorAll('#fView .f-card[data-id]').length === 8", timeout=10000, what='the seen ones are still kept')
    c.eq(c.count('[data-allseen]'), 0, 'no button while none is unseen, even with the seen ones shown', what='button absent')
    c.check_errors()


_NOUNS = {'aircraft': {'fr': ('aéronef', 'aéronefs'), 'en': ('aircraft', 'aircraft'), 'de': ('Luftfahrzeug', 'Luftfahrzeuge'), 'es': ('aeronave', 'aeronaves')},
          'theme': {'fr': ('famille', 'familles'), 'en': ('family', 'families'), 'de': ('Familie', 'Familien'), 'es': ('familia', 'familias')},
          'operator': {'fr': ('opérateur', 'opérateurs'), 'en': ('operator', 'operators'), 'de': ('Betreiber', 'Betreiber'), 'es': ('operador', 'operadores')}}


def _noun(lang, key, n):
    """« 1 appareil », « 0 appareil », « 2 appareils »: the number and its noun in the right form (fr: 0 and 1 singular; the others: only 1) — never « appareil(s) »."""
    one = (0 <= n < 2) if lang == 'fr' else n == 1
    return f"{n} {_NOUNS[key][lang][0 if one else 1]}"


def _airline_code(c, want, timeout=8000):
    """The code of the current airline once it is `want` (FrameData may not exist yet right after a navigation: the wait is explicit, never a direct read); '' if it never is."""
    got = ''
    for _ in range(timeout // 200):
        got = c.js("window.FrameData && typeof FrameData.airline === 'function' ? FrameData.airline().then(a => (a && a.code) || '').catch(() => '') : ''")
        if got == want:
            break
        c.wait(200)
    return got


@case('A93', 'The current airline: FrameData.airline() / setAirline, the event, the choice that survives a reload, the « default » fallback without an index', 'A',
      tags=('data',), designs=('standard',), screens=False, night=False,
      rule='V3_SPECIFICATION 10.38 step 1 (V3 Frame): FrameData.airline() = { code, name, settings, fleet } of the current airline, setAirline(code), the event frame-data-airline when it changes, the choice a setting of the device kept through a reload; no data/airline/index.json yet: the airline of today (code default)')
def a93(c):
    docs = [
        ['airline/index.json', {'airlines': [{'code': 'aiv', 'name': 'Air Inter Va'}, {'code': 'dfa', 'name': 'DEFA Virtual'}]}, 'document'],
        ['airline/aiv/settings.json', {'name': 'Air Inter Va'}, 'document'],
        ['airline/aiv/fleet.json', {'schema': 1, 'aircraft': [{'reg': 'F-AIVA'}]}, 'document'],
        ['airline/dfa/settings.json', {'name': 'DEFA Virtual'}, 'document'],
    ]
    c.open('flightlog', flight=False, docs=docs)
    c.js("() => { window.__ev = []; window.addEventListener('frame-data-airline', e => window.__ev.push(e.detail.code)) }")
    got = c.js("() => FrameData.airline().then(a => [a.code, a.name, a.fleet && a.fleet.aircraft.length])")
    c.eq(got, ['aiv', 'Air Inter Va', 1], 'no choice yet: the first airline of the index, with its settings and fleet', what='airline()')
    c.eq(c.js("() => FrameData.setAirline('dfa')"), True, 'a known code is accepted', what='setAirline')
    c.eq(c.js("() => window.__ev"), ['dfa'], 'the change is announced once', what='event')
    c.eq(c.js("() => FrameData.setAirline('nope')"), False, 'an unknown code is refused', what='unknown')
    c.page.reload(wait_until='load')
    c.until("!!window.FrameData", timeout=15000, what='the frame after the reload')
    c.eq(c.js("() => FrameData.airline().then(a => [a.code, a.name])"), ['dfa', 'DEFA Virtual'], 'the choice survives a reload (a setting of the device)', what='after reload')
    # without an index (before the migration): the airline of today, code default
    c.js("() => FrameData.reset()")   # the cache and the device's choices of the first part gone
    c.open('flightlog', flight=False, docs=[['airline/settings.json', {'name': 'DEFA Virtual'}, 'document']])
    c.eq(c.js("() => FrameData.airline().then(a => [a.code, a.name])"), ['default', 'DEFA Virtual'], 'without index.json: the airline of today (default)', what='default')


@case('A95', 'Settings › Company (SOG-0039): the airlines of data/airline/index.json and « Personnel », the choice (FrameData.setAirline, greyed without it), « Add an airline » writes the folder and the index; every file read is untrusted', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='V3_SPECIFICATION 10.38 step 1: Réglages › Compagnie lists the folders found plus « personnel », seven elements at most, the choice calls FrameData.setAirline (detected: absent, the button is grey and said), « Ajouter une compagnie » writes data/airline/<code>/ and index.json; codes ^[a-z0-9]{2,8}$, names escaped, twenty airlines at most (10.36)')
def a95(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    evil = '<img src=x onerror=window.__pwn=1>'
    index = {'schema': 1, 'airlines': [{'code': 'dfa', 'name': 'DEFA Virtual'}, {'code': 'aiv', 'name': 'Air Inter VA'}, {'code': evil, 'name': 'x'}, {'code': 'AB', 'name': 'upper'}, {'code': 'dfa', 'name': 'twice'}, {'code': 'perso', 'name': 'no'}]}
    docs = [['device/level.json', {'level': 3}, 'cache'], ['airline/index.json', index, 'document'],
            ['airline/dfa/settings.json', {'schema': 1, 'name': 'DEFA Virtual', 'networks': {'ivao': True, 'vatsim': False, 'offline': False}}, 'document'],
            ['airline/dfa/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-AAAA'}, {'registration': 'F-BBBB'}, {'registration': 'F-CCCC'}]}, 'document'],
            ['airline/aiv/settings.json', {'schema': 1, 'name': evil, 'networks': {'ivao': True, 'vatsim': True, 'offline': 'yes'}}, 'document']]
    rows = lambda: c.js("[...document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]')].map(li => [li.dataset.airline, li.hasAttribute('data-current'), li.querySelector('b').textContent, !!li.querySelector('input') && li.querySelector('input').disabled])")
    # ---- 0: the real frame (FrameData.airlines / setAirline, V3 Frame 837f2d2fa): the list is the frame's, the choice is kept by the frame
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 3", timeout=15000, what='the three lines of the real frame')
    c.eq([r[0] for r in rows()], ['dfa', 'aiv', 'perso'], 'the list of the frame itself: the airlines of the index, then personal', what='real list')
    c.tap('[data-card="company"] [data-airlines] [data-airline="perso"] input')
    code = ''
    for _ in range(30):
        code = c.js("FrameData.airline().then(a => a && a.code)")
        if code == 'perso':
            break
        c.wait(150)
    c.eq(code, 'perso', 'the choice is kept by the frame: FrameData.airline() answers the chosen code', what='real choice')
    # ---- A: a frame that has not the contract yet (an old one): the list is read from the index, « Choose » is grey and said
    c.page.add_init_script("""(() => { let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; delete v.setAirline; delete v.airline; delete v.airlines } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 3", timeout=15000, what='the three lines: dfa, aiv, personal')
    got = rows()
    c.eq([[r[0], r[2]] for r in got], [['dfa', 'DEFA Virtual'], ['aiv', evil], ['perso', T('perso')]], 'the folders found, in order, then « personnel »; a hostile code, an upper-case code, a repeated one and « perso » itself are dropped; a name is text', what='lines')
    c.ok(c.count('[data-card="company"] img') == 0 and c.js("window.__pwn === undefined"), got, 'a hostile name is text: no element, nothing runs')
    line = lambda code: norm(c.text(f'[data-card="company"] [data-airlines] [data-airline="{code}"]'))
    c.ok(norm(_noun(lang, 'aircraft', 3)) in line('dfa') and 'IVAO' in line('dfa') and 'VATSIM' not in line('dfa'), line('dfa'), 'a line: the name, the code, the networks read as booleans, the fleet count')
    c.ok('IVAO' in line('aiv') and 'VATSIM' in line('aiv') and norm(_noun(lang, 'aircraft', 0)) in line('aiv'), line('aiv'), 'no fleet file: 0; a network that is not exactly true is not shown')
    c.eq([r[3] for r in got], [True, True, True], 'without FrameData.setAirline every choose button is grey', what='grey')
    c.eq(norm(c.text('[data-card="company"] [data-airline-note]')), norm(T('unavailable')), 'and it says why', what='note')
    # ---- B: with the contract (FrameData.airline / setAirline): the current one marked, the choice sent
    c.page.add_init_script("""(() => { let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; v.airline = () => ({ code: 'aiv' }); v.setAirline = async code => { window.__chosen = code } } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 3", timeout=15000, what='the lines again')
    got = rows()
    c.eq([[r[0], r[1], r[3]] for r in got], [['dfa', False, False], ['aiv', True, False], ['perso', False, False]], 'the current airline is marked and has no button; the others can be chosen', what='current')
    c.tap('[data-card="company"] [data-airlines] [data-airline="perso"] input')
    c.until("window.__chosen === 'perso'", what='setAirline is called with the code')
    # ---- C: add an airline: the folder and the index; a taken or bad code writes nothing
    c.js("document.querySelector('[data-airline-add]').open = true")
    seeded = c.doc('airline/dfa/settings.json')
    fill = lambda name, code: (c.page.fill('[data-card="company"] [data-f="co-name"]', name), c.page.fill('[data-card="company"] [data-f="co-code"]', code))
    fill('Taken', 'dfa')
    c.tap('[data-act="companyNext"]')
    c.until(f"document.querySelector('[data-card=\"company\"] [data-msg]').textContent.trim() !== ''", what='a message')
    c.eq([norm(c.text('[data-card="company"] [data-msg]')), c.doc('airline/dfa/settings.json') == seeded], [norm(T('taken')), True], 'a taken code: said, the existing folder is not overwritten', what='taken')
    fill('Bad', 'BAD!')
    c.tap('[data-act="companyNext"]')
    c.wait(400)
    c.eq(norm(c.text('[data-card="company"] [data-msg]')), norm(T('badCode')), 'a bad code: said', what='bad msg')
    c.eq(c.doc('airline/bad/settings.json'), None, 'a bad code writes nothing', what='bad')
    fill('Air Test', 'atx')
    c.page.check('[data-card="company"] [data-co-net="ivao"]')
    c.tap('[data-act="companyNext"]')
    c.until("!document.querySelector('[data-wizard] [data-step-pane=themes]').hidden", timeout=6000, what='the themes step')
    c.tap('[data-act="companyNext"]')
    c.until("!document.querySelector('[data-wizard] [data-step-pane=fleet]').hidden", timeout=6000, what='the fleet step')
    c.tap('[data-act="companyNext"]')
    c.until("!document.querySelector('[data-wizard] [data-step-pane=summary]').hidden", timeout=6000, what='the summary step')
    c.tap('[data-act="companyAdd"]')
    d = c.until_doc('airline/atx/settings.json', lambda d: bool(d), what='the settings of the new airline')
    c.eq([d.get('name'), d.get('networks'), (c.until_doc('airline/atx/fleet.json', lambda f: bool(f), what='its empty fleet') or {}).get('aircraft')], ['Air Test', {'ivao': True, 'vatsim': False, 'offline': False}, []], 'the folder: settings (name, networks as booleans) and an empty fleet', what='new folder')
    idx = c.until_doc('airline/index.json', lambda i: i and any(a.get('code') == 'atx' for a in i.get('airlines', [])), what='the index lists it')
    c.eq([a['code'] for a in idx['airlines'] if a['code'] in ('dfa', 'aiv', 'atx')], ['dfa', 'aiv', 'atx'], 'the index keeps the others and lists the new one', what='index')
    c.check_errors()


def _airlines_launcher(c, files):
    """A fake launcher whose data/ holds `files` ({path: dict (JSON) or bytes}): the tree of the pass, every file served, the JSON ones also seeded
    in the cache; returns the seed documents."""
    status = {'server': True, 'data': True, 'dataGit': True, 'host': 'TEST', 'lan': False, 'lnm': []}
    raw = {k: (v if isinstance(v, bytes) else json.dumps(v).encode()) for k, v in files.items()}
    rev = 'r-airlines-%d' % sum(len(v) for v in raw.values())
    tree = {k: 'r-%s-%d' % (k, len(v)) for k, v in raw.items()}

    def launcher(route):
        p = urllib.parse.urlparse(route.request.url).path
        body = status if p.endswith('/__setup/status') else {'head': 'h-' + rev, 'tree': tree} if p.endswith('/__setup/changes') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

    def data(route):
        p = urllib.parse.urlparse(route.request.url).path
        for k, v in raw.items():
            if p.endswith('/data/' + k):
                return route.fulfill(status=200, content_type='application/octet-stream', body=v)
        route.fulfill(status=404, body='')
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.unroute(re.compile(r'/data/airline/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.context.route(re.compile(r'/data/airline/'), data)
    return [[k, v, 'document'] for k, v in files.items() if not isinstance(v, bytes)]


@case('A94', 'The frame follows the current airline: the name, the site, the networks and the logo change with the choice; a logo outside the airline’s folder is refused', 'A',
      designs=('standard',), screens=False, night=False,
      rule='V3_SPECIFICATION 10.38 step 1 (V3 Frame): ctx.airline reads FrameData.airline() (name, site, logo, networks, relay) instead of airline/settings.json alone and follows frame-data-airline; the logo stays png / webp checked (audit 157), taken in the airline’s own folder only; without an index, the airline of today (A83)')
def a94(c):
    fix = ROOT / 'tests' / 'v3' / 'fixtures' / 'airline'
    files = {
        'airline/index.json': {'airlines': [{'code': 'aiv', 'name': 'Air Inter Va'}, {'code': 'dfa', 'name': 'DEFA Virtual'}, {'code': 'zzz', 'name': 'Zed'}]},
        'airline/aiv/settings.json': {'name': 'Air Inter Va', 'site': 'https://aiv.example/', 'logo': 'logo.png', 'networks': {'ivao': 'AIV', 'vatsim': True, 'x': {'no': 1}}},
        'airline/aiv/logo.png': (fix / 'logo-dalton.png').read_bytes(),
        'airline/dfa/settings.json': {'name': 'DEFA Virtual', 'site': 'https://dfa.example/', 'logo': 'airline/dfa/logo.png'},
        'airline/dfa/logo.png': (fix / 'logo-rm.png').read_bytes(),
        'airline/zzz/settings.json': {'name': 'Zed', 'logo': 'airline/aiv/logo.png'},   # a logo of another airline: refused
    }
    docs = _airlines_launcher(c, files)
    c.page.add_init_script("window.__airs = []; window.addEventListener('frame-airline', e => window.__airs.push(e.detail))")
    c.open('missions', app='company', docs=LEVEL3 + docs, wait=False)
    logo = "(() => { const i = document.querySelector('#fAppIco img.f-logo'); return i && i.naturalWidth > 0 ? i.src : null })()"
    c.until(f"!!{logo}", timeout=20000, what='the first airline of the index: its logo')
    last = lambda: c.js("() => window.__airs[window.__airs.length - 1] || null")
    a = last()
    c.eq((a['code'], a['name'], a['site'], a['networks']), ('aiv', 'Air Inter Va', 'https://aiv.example/', {'ivao': 'AIV', 'vatsim': True}),
         'no choice yet: the first airline of the index, its site and its networks (simple fields only)', what='aiv')
    first = c.js(logo)
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop [data-app=\"company\"] img.f-logo')", what='the logo in the switcher')
    c.ok('Air Inter Va' in c.js("document.querySelector('.f-tabpop [data-app=\"company\"]').textContent"), '', 'the switcher’s subtitle: the airline’s name')
    c.tap('#fApp')
    c.until("!document.querySelector('.f-tabpop')", what='the switcher closed')
    # the choice of another airline: name, site and logo follow, at once
    c.eq(c.js("() => FrameData.setAirline('dfa')"), True, 'dfa is chosen', what='setAirline dfa')
    c.until("window.__airs[window.__airs.length - 1]?.code === 'dfa'", timeout=15000, what='the frame follows the choice')
    a = last()
    c.eq((a['name'], a['site']), ('DEFA Virtual', 'https://dfa.example/'), 'the name and the site of the chosen airline', what='dfa')
    c.until(f"!!{logo} && {logo} !== {json.dumps(first)}", timeout=15000, what='its own logo (a full path in its own folder is taken)')
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop [data-app=\"company\"] img.f-logo')", what='the logo in the switcher')
    c.ok('DEFA Virtual' in c.js("document.querySelector('.f-tabpop [data-app=\"company\"]').textContent"), '', 'the switcher’s subtitle follows')
    c.tap('#fApp')
    c.until("!document.querySelector('.f-tabpop')", what='the switcher closed')
    # a logo named in the folder of another airline: refused, the tinted plane
    c.eq(c.js("() => FrameData.setAirline('zzz')"), True, 'zzz is chosen', what='setAirline zzz')
    c.until("window.__airs[window.__airs.length - 1]?.code === 'zzz'", timeout=15000, what='the frame follows the third choice')
    c.until("document.querySelectorAll('#fAppIco img').length === 0 && document.querySelectorAll('#fAppIco svg').length === 1", timeout=15000,
            what='a logo of another airline’s folder is refused: the tinted plane')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ A96
def _rm_fixture():
    """A sog-roadmap/2 file of the test: four applications, two milestones, features and bugs, delivered or not, one hostile text, one item without de/es."""
    lab = lambda fr, en: {'fr': fr, 'en': en, 'de': en + ' (de)', 'es': en + ' (es)'}
    item = lambda state, fr, en, **kw: {'state': state, 'fr': fr, 'en': en, 'de': en + ' (de)', 'es': en + ' (es)', **kw}
    evil = '<img src=x onerror=window.__pwn=1>'
    return {'schema': 'sog-roadmap/1', 'version': 2, 'updated': '2026-11-09', 'generated': {'organisation': 'abc1234', 'fiches': 7}, 'note': lab('Note FR', 'Note EN'),
            'states': {'done': lab('Livré', 'Delivered'), 'doing': lab('En cours', 'In progress'), 'planned': lab('Prévu', 'Planned'), 'later': lab('Plus tard', 'Later')},
            'apps': [{'id': 'pilote', 'label': lab('Pilote', 'Pilot'), 'state': 'doing'}, {'id': 'compagnie', 'label': lab('Compagnie', 'Company'), 'state': 'doing'},
                     {'id': 'maintenance', 'label': lab('Maintenance', 'Maintenance'), 'state': 'doing'}, {'id': 'stats', 'label': lab('Stats', 'Stats'), 'state': 'planned'}],
            'milestones': [{'id': 'alpha.4', 'label': lab('alpha 4', 'alpha 4'), 'date': '2026-11-02', 'state': 'done', 'items': ['SOG-0001', 'SOG-0005', 'SOG-0003']},
                           {'id': 'alpha.5', 'label': lab('alpha 5', 'alpha 5'), 'date': '2026-11-09', 'state': 'doing', 'items': ['SOG-0002', 'SOG-0004']}],
            'lanes': [{'id': 'fuel', 'app': 'pilote', 'label': lab('Carburant', 'Fuel'), 'items': [
                          item('done', 'F1 livrée', 'F1 delivered', id='SOG-0001', milestone='alpha.4', delivered='2026-11-01'),
                          {'state': 'doing', 'fr': evil, 'en': evil, 'id': 'SOG-0002', 'milestone': 'alpha.5', 'since': '2026-11-05'},
                          {'state': 'planned', 'fr': 'F3 sans traduction', 'en': 'F3 english only'},
                          item('done', 'B1 livré', 'B1 delivered', id='SOG-0003', kind='bug', milestone='alpha.4'),
                          item('doing', 'B2 en cours', 'B2 in progress', id='SOG-0004', kind='bug', milestone='alpha.5')]},
                      {'id': 'data', 'app': 'maintenance', 'label': lab('Données', 'Data'), 'items': [
                          item('done', 'F4 livrée', 'F4 delivered', id='SOG-0005', milestone='alpha.4'),
                          item('later', 'F5 plus tard', 'F5 later', id='SOG-0006')]},
                      {'id': 'stat', 'app': 'stats', 'label': lab('Statistiques', 'Statistics'), 'items': [item('planned', 'F6 prévue', 'F6 planned')]}]}


@case('A96', 'The roadmap, schema 2: Features | Bugs tabs with counts, the application filter, « Hide delivered » (checked, remembered by device), the milestone strip that filters', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='frame/help SPEC 5 (sog-roadmap/2, SOG-0062): two tabs by `kind`, the filter by application (the file\'s `apps`, in order), a delivered item hidden by default with its count told in the lane header, a strip of milestones (current one marked, a touch filters the kanban), a text in the language or English or French, every text escaped')
def a96(c):
    lang = c.lang
    T = lambda k: tx('frame/help/roadmap.js', k, lang, after='const T = {')
    fixture = _rm_fixture()
    c.context.route(re.compile(r'/frame/help/roadmap\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fixture)))
    c.open('roadmap', docs=[['device/level.json', {'level': 3}, 'cache'], ['device/roadmap.json', {'view': 'themes'}, 'cache']])
    c.until("!!document.querySelector('[data-kanban]')", timeout=15000, what='the schema 2 screen')
    tabs = lambda: [norm(t) for t in c.js("[...document.querySelectorAll('[role=tab]')].map(b => b.textContent)")]
    lanes = lambda: c.js("[...document.querySelectorAll('[data-lane]')].map(l => l.dataset.lane)")
    cards = lambda: c.js("[...document.querySelectorAll('[data-kanban] .f-rm-item')].map(i => i.querySelector('.f-rm-id') ? i.querySelector('.f-rm-id').textContent : i.textContent.trim().slice(0, 14))")
    # ---- defaults: Features, every application, delivered hidden; the counts say what the tab shows
    c.eq(tabs(), [norm(f"{T('feature')} (4)"), norm(f"{T('bug')} (1)")], 'two tabs, the count of what each shows (delivered hidden)', what='tabs')
    c.eq(c.js("[...document.querySelectorAll('[data-apps] [data-app]')].map(b => b.dataset.app)"), ['', 'pilote', 'compagnie', 'maintenance', 'stats'], 'the filter: all, then the file\'s applications in order', what='apps')
    c.eq(c.js("document.querySelector('input[data-hide]').checked"), True, '« Hide delivered » is checked by default', what='hide default')
    c.eq(lanes(), ['fuel', 'data', 'stat'], 'the three lanes of features still showing something', what='lanes')
    c.eq(norm(c.text('[data-lane="fuel"] [data-done-count]')), norm(T('doneOne').replace('{n}', '1')), 'the lane header tells how many delivered are hidden', what='done count')
    c.ok(c.count('[data-kanban] .f-rm-item[data-state="done"]') == 0, c.count('[data-kanban] .f-rm-item[data-state="done"]'), 'no delivered card while they are hidden')
    c.ok(c.count('[data-kanban] .f-rm-col') == 12 and c.count('[data-kanban] .f-rm-head span[data-state]') == 4, c.count('[data-kanban] .f-rm-col'), 'the four state columns are kept (three lanes)')
    # ---- text: hostile is text, a missing language falls back to English then French; id and milestone on the card
    c.ok(c.count('[data-kanban] img') == 0 and c.js("window.__pwn === undefined"), 'img', 'a hostile text is text: no element, nothing runs')
    c.eq(norm(c.js("[...document.querySelectorAll('[data-lane=\"fuel\"] .f-rm-item')].find(i => i.textContent.includes('F3')).textContent")),
         norm({'fr': 'F3 sans traduction'}.get(lang, 'F3 english only')), 'a text without this language is the English one (French for French)', what='fallback')
    c.eq(norm(c.js("document.querySelector('[data-lane=\"fuel\"] .f-rm-item .f-rm-id').parentElement.textContent")).startswith('SOG-0002'), True, 'a card carries its identifier first', what='id')
    c.ok(norm(c.js("document.querySelector('[data-lane=\"fuel\"] .f-rm-item .f-rm-ms').textContent")) == 'alpha 5' + ('' if lang in ('fr', 'en') else f' ({lang})'), 'ms', 'and its milestone')
    # ---- tabs
    c.tap('[data-kind="bug"]')
    c.eq((cards(), tabs()[1]), (['SOG-0004'], norm(f"{T('bug')} (1)")), 'the Bugs tab: its one open bug', what='bugs')
    c.tap('[data-kind="feature"]')
    # ---- application filter
    c.tap('[data-app="maintenance"]')
    c.eq((lanes(), tabs()), (['data'], [norm(f"{T('feature')} (1)"), norm(f"{T('bug')} (0)")]), 'one application: only its lanes, the counts follow', what='filter')
    c.tap('[data-app=""]')
    # ---- the milestone strip: current marked, a touch filters, the delivered ones show (a chosen milestone beats the hiding)
    c.eq(c.js("[...document.querySelectorAll('[data-ms][data-current]')].map(b => b.dataset.ms)"), ['alpha.5'], 'the strip marks the current milestone (the one in progress)', what='current')
    c.tap('[data-ms="alpha.4"]')
    c.eq(sorted(cards()), ['SOG-0001', 'SOG-0005'], 'a touched milestone filters the kanban on its items, delivered ones included', what='milestone')
    c.ok(c.count('[data-done-count]') == 0, c.count('[data-done-count]'), 'no hidden count while a milestone is chosen')
    c.tap('[data-ms="alpha.4"]')
    c.eq(len(cards()), 4, 'touched again: the filter goes', what='cleared')
    # ---- hide delivered: unchecked, remembered on the device; no horizontal scroll, the strip is one line on a phone
    c.page.uncheck('input[data-hide]')
    c.eq(c.until_doc('device/roadmap.json', lambda d: d and d.get('hideDone') is False, what='the choice stored'), {'view': 'themes', 'hideDone': False}, 'the choice is stored in device/roadmap.json', what='stored')
    c.eq((tabs()[0], c.count('[data-done-count]')), (norm(f"{T('feature')} (6)"), 0), 'delivered shown: the count counts them, no « delivered » line', what='shown')
    c.page.reload()  # a new visit: nothing seeded again, the choice comes from the device store
    c.until("!!document.querySelector('[data-kanban]')", timeout=15000, what='the screen again')
    c.eq(c.js("document.querySelector('input[data-hide]').checked"), False, 'a new visit finds the choice again', what='remembered')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll of the page', what='scroll')
    if c.phone:
        c.eq(c.js("(() => { const s = getComputedStyle(document.querySelector('.f-rm-time')); return [s.flexWrap, s.overflowX] })()"), ['nowrap', 'auto'], 'on a phone the strip is one line that scrolls by itself', what='strip')
    c.check_errors()


@case('A97', 'The roadmap, schema 1 (no `version`): drawn as before — no tab, no filter, no strip, no checkbox; the applications list and every item, delivered ones included', 'A',
      designs=('standard',), screens=True, night=False,
      rule='frame/help SPEC 5: sog-roadmap/2 is backward compatible, an item without `kind` is a feature and a file without `milestones` has no strip; a schema 1 file keeps its screen (counter-test of A96)')
def a97(c):
    fixture = _rm_fixture()
    old = {'schema': 'sog-roadmap/1', 'updated': '2026-11-02', 'note': fixture['note'], 'states': fixture['states'], 'apps': fixture['apps'][:1],
           'lanes': [{'id': 'frame', 'app': 'pilote', 'label': fixture['lanes'][0]['label'], 'items': [{'state': 'done', 'fr': 'Ancien livré', 'en': 'Old delivered'}, {'state': 'planned', 'fr': 'Ancien prévu', 'en': 'Old planned'}]}]}
    c.context.route(re.compile(r'/frame/help/roadmap\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(old)))
    c.open('roadmap', docs=LEVEL3)
    c.until("!!document.querySelector('.f-rm-lane')", timeout=15000, what='the schema 1 screen')
    c.eq([c.count('[role=tab]'), c.count('[data-app]'), c.count('.f-rm-time'), c.count('input[data-hide]'), c.count('.f-rm-apps .f-rm-item'), c.count('.f-rm-lane .f-rm-item')], [0, 0, 0, 0, 1, 2],
         'a schema 1 file: no tab, no filter, no strip, no checkbox; the apps list and both items, delivered included, as before', what='schema 1')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll of the page', what='scroll')
    c.check_errors()


@case('A98', 'build_help.py checks a sog-roadmap/2 file: a good one passes; an unknown kind, milestone, state or application, or a milestone citing a missing item, is refused', 'A',
      static=True, rule='frame/help SPEC 5: the build refuses a roadmap file the screen would draw wrongly (kind feature|bug, milestones with a known state and four texts, items cited that exist, lanes of a known application); a schema 1 file keeps passing')
def a98(c):
    import copy
    import importlib.util
    spec = importlib.util.spec_from_file_location('build_help_t', ROOT / 'frame' / 'help' / 'build_help.py')
    bh = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bh)
    good = _rm_fixture()
    for lane in good['lanes']:  # the screen's fixture leaves a language out on purpose (its fallback is tested there); the build wants all four
        for it in lane['items']:
            it.setdefault('de', it['en'])
            it.setdefault('es', it['en'])
    c.eq((bh.roadmap_errors(copy.deepcopy(good)), bh.roadmap_errors({**copy.deepcopy(good), 'schema': 'sog-roadmap/2'})), ([], []), 'a good schema 2 file passes, written as schema 1 with version 2 (what roadmap_build.py writes) or as sog-roadmap/2', what='good')
    def bad(f):
        d = copy.deepcopy(good)
        f(d)
        return bh.roadmap_errors(d)
    cases = [('kind', lambda d: d['lanes'][0]['items'][0].update(kind='wish'), 'genre inconnu'), ('milestone of an item', lambda d: d['lanes'][0]['items'][0].update(milestone='nope'), 'jalon inconnu'),
             ('milestone state', lambda d: d['milestones'][0].update(state='soon'), 'état inconnu'), ('milestone text', lambda d: d['milestones'][0]['label'].pop('de'), 'sans texte'),
             ('cited item', lambda d: d['milestones'][0]['items'].append('SOG-9999'), 'absent des voies'), ('application of a lane', lambda d: d['lanes'][0].update(app='nope'), 'application inconnue')]
    for what, f, word in cases:
        c.ok(any(word in e for e in bad(f)), bad(f), f'a bad {what} is refused ({word})')
    old = {k: v for k, v in copy.deepcopy(good).items() if k != 'milestones'}
    old.pop('version')
    c.eq(bh.roadmap_errors(old), [], 'a schema 1 file keeps passing (the lanes of a schema 1 file are not checked against the applications)', what='schema 1')
    c.ok(any('jalons' in e for e in bh.roadmap_errors({k: v for k, v in copy.deepcopy(good).items() if k != 'version'})), 'milestones in schema 1', 'milestones demand schema 2')


@case('A99', 'The roadmap as shipped (frame/help/roadmap.json, built by roadmap_build.py): the strip, both tabs with counts, every application, delivered hidden, no horizontal scroll', 'A',
      designs=('standard',), screens=True, night=False,
      rule='frame/help SPEC 5: the real file is read as schema 2 (sog-roadmap/1 with version 2); a lane of the file shows for its application; the delivered ones are hidden by default')
def a99(c):
    doc = json.loads((ROOT / 'frame' / 'help' / 'roadmap.json').read_text(encoding='utf-8'))
    c.open('roadmap', docs=LEVEL3)
    c.until("!!document.querySelector('[data-kanban]')", timeout=15000, what='the screen')
    n = lambda kind, hide=True: sum(1 for l in doc['lanes'] for i in l['items'] if (i.get('kind') or 'feature') == kind and (not hide or i['state'] != 'done'))
    c.eq([int(re.search(r'\((\d+)\)', t).group(1)) for t in c.js("[...document.querySelectorAll('[role=tab]')].map(b => b.textContent)")], [n('feature'), n('bug')], 'the tabs count the open features and bugs of the file', what='counts')
    c.eq(c.js("[...document.querySelectorAll('[data-apps] [data-app]')].map(b => b.dataset.app)"), [''] + [a['id'] for a in doc['apps']], 'the filter: all, then the applications of the file', what='apps')
    c.eq(c.count('.f-rm-time [data-ms]'), len(doc['milestones']), 'one point per milestone on the strip', what='strip')
    c.ok(c.count('[data-kanban] .f-rm-item[data-state="done"]') == 0, c.count('[data-kanban] .f-rm-item[data-state="done"]'), 'delivered cards hidden by default')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll of the page', what='scroll')

@case('A100', 'The launcher’s tree of data/ is read once per load, and not again when it has not changed (the head of the last pass is kept between two loads)', 'A',
      tags=('data',), designs=('standard',), screens=False, night=False,
      rule='SOG-0063 (V3 Frame, 9 Nov 2026): GET /__setup/changes?since= was asked twice per load, 946 KB each; now one request in flight for every transport of the page, and the head kept by the data layer (meta remote) is sent as since: an unchanged data/ answers « same » with no tree; a changed one still arrives')
def a100(c):
    state = {'head': 'h1', 'name': 'Air One', 'calls': [], 'delay': 0}
    big = {f'fake/f{i}.json': f'r{i}' for i in range(600)}     # a tree of some 30 KB: the weight of the real one (946 KB) in small

    def tree():
        return {**big, 'airline/settings.json': 'rs-' + state['name']}

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url)
        if u.path.endswith('/__setup/changes'):
            since = urllib.parse.parse_qs(u.query).get('since', [''])[0]
            body = {'same': True, 'head': state['head']} if since == state['head'] else {'head': state['head'], 'tree': tree()}
            state['calls'].append(('same' if since == state['head'] else 'full', len(json.dumps(body))))

        elif u.path.endswith('/__setup/status'):
            body = {'server': True, 'data': True, 'dataGit': True, 'host': 'TEST', 'lan': False, 'lnm': []}
        else:
            body = {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

    def data(route):
        if route.request.url.endswith('/data/airline/settings.json'):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'name': state['name']}))
        route.fulfill(status=404, body='')
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.unroute(re.compile(r'/data/airline/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.context.route(re.compile(r'/data/airline/'), data)
    # the repository answers late when the page asks (sessionStorage __delay, ms): the page, not the test, waits
    c.page.add_init_script("(() => { const f = window.fetch; window.fetch = async (u, o) => { const d = +sessionStorage.getItem('__delay'); if (d && String(u).includes('__setup/changes')) await new Promise(r => setTimeout(r, d)); return f(u, o) } })()")
    done = "() => FrameData.status().then(s => !!s.lastSync)"
    name = "() => FrameData.airline().then(a => a.name)"
    def settle():
        for _ in range(60):          # the new page asks the launcher for the head: wait for it, then let the pass end
            if state['calls']:
                break
            c.wait(250)
        c.wait(2500)
    # load 1: the whole tree, once
    c.open('flightlog', flight=False, wait=False)
    c.page.wait_for_function("() => window.FrameData && window.FrameData.status", timeout=20000)
    settle()
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air One')", timeout=20000)
    full1 = [n for k, n in state['calls'] if k == 'full']
    c.ok(len(full1) == 1, f'{state["calls"]}', 'the tree is read once per load (one request in flight for the whole page)')
    # load 2: nothing changed: « same », no tree
    state['calls'].clear()
    c.page.reload(wait_until='load')
    settle()
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air One')", timeout=20000)
    kinds = [k for k, _ in state['calls']]
    c.ok(kinds and 'full' not in kinds, str(state['calls']), 'unchanged: every answer is « same », the tree is not downloaded again')
    c.ok(sum(n for _, n in state['calls']) < 0.05 * full1[0], str(state['calls']), 'and the bytes of the loads fall to about nothing (against the ' + str(full1[0]) + ' B of the tree)')
    # load 3: a change at the other end still arrives
    state['head'], state['name'] = 'h2', 'Air Two'
    state['calls'].clear()
    c.page.reload(wait_until='load')
    settle()
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air Two')", timeout=20000)
    c.ok(any(k == 'full' for k, _ in state['calls']), str(state['calls']), 'a changed data/ is read in full, and the change arrives')
    c.eq(len(state['calls']), 1, 'only one call at opening, even when the head changed (SOG-0164: a second one, since=<the new head>, followed the first one for nothing)', what='calls on a changed load: ' + str(state['calls']))
    # a list drawn at opening does not wait for the repository: the tree of the last pass answers at once, its head is checked behind (SOG-0164)
    c.page.evaluate("() => sessionStorage.setItem('__delay', '1500')")
    c.page.reload(wait_until='load')
    c.page.wait_for_function("() => window.FrameData && window.FrameData.adapter", timeout=20000)
    ms = c.js("""async () => { const d = FrameData.adapter({ id: 'probe', reads: ['fake/'] }); const t = performance.now(); const l = await d.list('fake/');
      return [Math.round(performance.now() - t), l ? l.length : null] }""")
    c.page.evaluate("() => sessionStorage.removeItem('__delay')")
    c.ok(ms[1] and ms[0] < 600, str(ms), 'the list of a screen is answered by the known tree without waiting 1.5 s for the repository head')
    c.check_errors()
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ A101
def _prio_launcher(c, root, verb=('roadmap', 'priorities'), ctx=None):
    """A FAKE launcher for the roadmap's priorities: /__setup/status says there is one, and regen/job runs the REAL verb roadmap/priorities (tools/regen/roadmap.py) on `root`
    (a temporary suite root with organisation/ and frame/help/roadmap.json).  The dict it returns: `posts` (what the page asked), `up` (False: the job start fails), `detect`
    (False: no launcher answers /__setup/status), `raw` (a result given for every `get`, to test a hostile answer)."""
    import importlib
    import sys
    tools = str(ROOT / 'tools')
    if tools not in sys.path:
        sys.path.insert(0, tools)
    RJ = importlib.import_module('regen_jobs')
    if verb not in RJ.REGISTRY:
        RJ.load_verbs()
    fn, check = RJ.REGISTRY[verb]
    st = {'posts': [], 'up': True, 'detect': True, 'raw': None, 'views': {}, 'n': 0}
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        code, body = 200, {}
        if u.path.endswith('/__setup/status'):
            code, body = (200, status) if st['detect'] else (404, {})
        elif u.path.endswith('/__setup/regen/job'):
            if req.method == 'POST':
                post = json.loads(req.post_data or '{}')
                st['posts'].append(post)
                if not st['up']:
                    code, body = 500, {'ok': False, 'message': 'down'}
                elif st.get('unknown'):     # a launcher started before the verb existed: the job does not start (400)
                    code, body = 400, {'ok': False, 'status': 400, 'message': f'unknown operation {verb[0]}/{verb[1]}'}
                else:
                    st['n'] += 1
                    args = check(post.get('args'))
                    res = fn(RJ.Job(verb[0], verb[1], {}), args, ctx or {'root': str(root)}) if args else {'ok': False, 'reason': 'bad-args'}
                    if st['raw'] is not None and args and (verb != ('roadmap', 'priorities') or args['action'] == 'get'):
                        res = st['raw']
                    st['views'][f"j{st['n']}"] = {'id': f"j{st['n']}", 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': '', 'log': [], 'result': res, 'zones': {}, 'set': verb[0], 'verb': verb[1], 'args': post.get('args')}
                    body = {'job': f"j{st['n']}"}
            elif 'id=' in u.query:
                body = st['views'].get(urllib.parse.parse_qs(u.query)['id'][0], {})
        route.fulfill(status=code, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), handler)
    return st


@case('A101', 'The roadmap priorities (SOG-0066): the identifier first and copied (right click, long touch), a card dragged in its column = its rank, dragged onto the strip = its milestone, both written by the launcher; without a launcher kept on the device « not sent » and sent later; a hostile answer ignored', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0066: a card starts with its SOG-nnnn identifier (the text size), copied with its title by a right click or a long touch; dragging (mouse after 6 px, touch after a long press) in a column writes the ranks, dragging onto a milestone writes the milestone, in organisation/PRIORITES.json through the launcher verb roadmap/priorities; no launcher or a failed write: kept in device/roadmap.json and told on the card; what is read from the launcher is filtered')
def a101(c):
    import tempfile
    from pathlib import Path
    lang = c.lang
    T = lambda k: tx('frame/help/roadmap.js', k, lang, after='const T = {')
    fx = _rm_fixture()
    # the priorities view (SOG-0160): « backlog » = the cards without a current or next milestone; the cards without identifier leave the test, a backlog milestone is added to drop on
    fx['milestones'] += [{'id': 'alpha.6', 'label': {'fr': 'alpha 6', 'en': 'alpha 6', 'de': 'alpha 6 (de)', 'es': 'alpha 6 (es)'}, 'date': '', 'state': 'planned', 'items': []},
                         {'id': 'beta.1', 'label': {'fr': 'beta 1', 'en': 'beta 1', 'de': 'beta 1 (de)', 'es': 'beta 1 (es)'}, 'date': '', 'state': 'later', 'items': []}]
    for l in fx['lanes']:
        if l['id'] in ('fuel', 'stat'):
            l['items'] = [i for i in l['items'] if i.get('id')]
    lab = lambda fr, en: {'fr': fr, 'en': en, 'de': en + ' (de)', 'es': en + ' (es)'}
    data_lane = next(l for l in fx['lanes'] if l['id'] == 'data')
    for n, nm in ((7, 'F7'), (8, 'F8')):
        data_lane['items'].append({'state': 'later', 'id': f'SOG-000{n}', **lab(f'{nm} plus tard', f'{nm} later')})
    title = lambda en, fr: fr if lang == 'fr' else en if lang == 'en' else f'{en} ({lang})'
    c.context.route(re.compile(r'/frame/help/roadmap\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    c.page.add_init_script("""(() => { window.__clip = []; const w = async t => { window.__clip.push(t) };
      try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: w } }) } catch (e) {} })()""")
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'frame' / 'help').mkdir(parents=True)
        (root / 'frame' / 'help' / 'roadmap.json').write_text(json.dumps(fx), encoding='utf-8')
        (root / 'organisation').mkdir()
        prio = root / 'organisation' / 'PRIORITES.json'
        written = lambda: json.loads(prio.read_text(encoding='utf-8'))['items'] if prio.exists() else None
        st = _prio_launcher(c, root)
        NOTE = "(w) => (window.__notes || []).some(n => n.replace(/[\s  ]+/g, ' ').includes(w))"
        col = '[data-col="backlog"] li[data-id]'
        ids = lambda: c.js("[...document.querySelectorAll('[data-col=\"backlog\"] li[data-id]')].map(l => l.dataset.id)")
        open_ = lambda: (c.open('roadmap', docs=LEVEL3 + [['device/roadmap.json', {'col': 'backlog', 'view': 'priorities'}, 'cache']]), c.until("!!document.querySelector('[data-kanban] li[data-id]')", timeout=15000, what='the cards with an identifier'))
        open_()
        c.eq(ids(), ['SOG-0006', 'SOG-0007', 'SOG-0008'], 'the file\'s order at first', what='first order')
        # ---- the identifier, in clear, the text\'s size; copied with the title by a right click
        sz = c.js("(() => { const li = document.querySelector('" + col + "'); return [getComputedStyle(li.querySelector('.f-rm-id')).fontSize, getComputedStyle(li).fontSize, li.textContent.trim().startsWith('SOG-0006')] })()")
        c.eq((sz[0] == sz[1], sz[2]), (True, True), 'a card starts with its identifier, at the size of the text', what='identifier')
        c.page.click(col + ':nth-child(1)', button='right')
        c.until("window.__clip.length === 1", what='the clipboard written')
        c.eq(norm(c.js("window.__clip[0]")), norm('SOG-0006 — ' + title('F5 later', 'F5 plus tard')), 'a right click copies « identifier — title »', what='copied')
        c.until(NOTE, norm(T('copied')), what='the notification « copied »')
        c.eq(written(), None, 'copying writes nothing', what='nothing written')

        def drag(src, dst=None, where='before', steps=10, hold=None):
            """Mouse drag of the card `src` onto the card or button `dst` (the upper or the lower half of a card), pressing at its middle."""
            c.js("document.querySelectorAll('.f-note').forEach(n => n.remove())")  # a toast must not cover the card
            c.page.locator(src).evaluate("el => el.scrollIntoView({ block: 'center' })")
            c.wait(150)
            a = c.page.locator(src).bounding_box()
            c.page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8)   # the top of the card: on a phone the bottom holds the buttons (monter, descendre, envoyer)
            c.page.mouse.down()
            c.page.mouse.move(a['x'] + a['width'] / 2 + 10, a['y'] + 18, steps=2)
            if hold:
                hold()
            b = c.page.locator(dst).bounding_box()
            y = b['y'] + (4 if where == 'before' else b['height'] - 4) if where in ('before', 'after') else b['y'] + b['height'] / 2
            c.page.mouse.move(b['x'] + b['width'] / 2, y, steps=steps)
            c.page.mouse.up()

        # ---- a card dragged above another one of its column: the ranks, written by the launcher
        drag(col + ':nth-child(3)', col + ':nth-child(1)', 'before')
        c.until("[...document.querySelectorAll('[data-col=\"backlog\"] li[data-id]')].map(l => l.dataset.id)[0] === 'SOG-0008'", what='SOG-0008 on top')
        c.eq(ids(), ['SOG-0008', 'SOG-0006', 'SOG-0007'], 'dropped above the first: the column follows at once', what='new order')
        pri = None
        for _ in range(40):
            pri = written()
            if pri:
                break
            c.wait(250)
        c.ok(bool(pri) and pri['SOG-0008']['rank'] < pri['SOG-0006']['rank'] < pri['SOG-0007']['rank'], pri, 'the launcher wrote organisation/PRIORITES.json: the ranks follow the new order')
        c.eq([p['args']['action'] for p in st['posts']], ['get', 'set'], 'one read at the opening, one write for the gesture', what='posts')
        c.until("document.querySelectorAll('[data-unsent]').length === 0", what='written: no « not sent » left on any card')
        # ---- onto a point of the strip: the milestone (the strip is far above: the page scrolls by itself near the top edge)
        def up_to_strip():
            for _ in range(60):
                c.page.mouse.move(60, 20)
            c.js("document.querySelector('[data-ms=\"beta.1\"]').scrollIntoView({ block: 'nearest', inline: 'center' })")   # the strip scrolls on a phone
        drag(col + ':nth-child(3)', '[data-ms="beta.1"]', 'on', hold=up_to_strip)
        for _ in range(40):
            pri = written()
            if pri and pri.get('SOG-0007', {}).get('milestone'):
                break
            c.wait(250)
        c.eq(pri['SOG-0007'].get('milestone'), 'beta.1', 'dropped on a milestone: its milestone is written', what='milestone')
        c.eq(norm(c.js("document.querySelector('[data-id=\"SOG-0007\"] .f-rm-ms').textContent")), 'beta 1' + ('' if lang in ('fr', 'en') else f' ({lang})'), 'and the card says it', what='card milestone')
        # ---- a reload: the order and the milestone come back from the file (the launcher is read at the opening)
        c.page.reload()
        c.until("!!document.querySelector('[data-kanban] li[data-id]')", timeout=15000, what='the screen again')
        c.until("[...document.querySelectorAll('[data-col=\"backlog\"] li[data-id]')].map(l => l.dataset.id)[0] === 'SOG-0008'", timeout=15000, what='the order read back')
        c.eq(ids(), ['SOG-0008', 'SOG-0006', 'SOG-0007'], 'after a reload the order holds', what='reload')

        # ---- a long touch (synthetic pointer events, the touch way): a release without moving copies; a drag after the hold moves; a move before the hold is a scroll
        touch = lambda kind, sel, dx=0, dy=0, to=None: c.js("""([k, sel, dx, dy, to]) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const t = to ? document.querySelector(to).getBoundingClientRect() : null;
          const x = t ? t.left + t.width / 2 : r.left + r.width / 2 + dx, y = t ? t.top + 4 : r.top + r.height / 2 + dy;
          const o = { pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y };
          (k === 'down' ? el : document).dispatchEvent(new PointerEvent('pointer' + k, o)); return true }""", [kind, sel, dx, dy, to])
        card7 = '[data-id="SOG-0007"]'
        touch('down', card7); c.wait(120); touch('move', card7, dy=40)
        c.eq(c.js("document.querySelector('" + card7 + "').hasAttribute('data-drag')"), False, 'a move before the long hold does not start a drag (the page scrolls instead)', what='no drag')
        touch('up', card7)
        c.eq(len(c.js("window.__clip")), 0, 'a move before the long hold is a scroll: nothing copied, nothing dragged', what='scroll')
        touch('down', card7); c.wait(600)
        c.ok(c.js("document.querySelector('" + card7 + "').hasAttribute('data-armed')"), 'armed', 'after the hold the card is armed')
        touch('up', card7)
        c.eq(c.js("window.__clip.length"), 1, 'released without moving after the hold: copied', what='touch copy')
        touch('down', card7); c.wait(600); touch('move', card7, dy=-10); touch('move', card7, to='[data-id="SOG-0008"]'); touch('up', card7)
        c.until("[...document.querySelectorAll('[data-col=\"backlog\"] li[data-id]')].map(l => l.dataset.id)[0] === 'SOG-0007'", what='SOG-0007 on top by a touch drag')
        c.eq(ids(), ['SOG-0007', 'SOG-0008', 'SOG-0006'], 'a drag after the long hold moves the card (above the first)', what='touch drag')
        c.wait(3000)  # the sends of the opening and of this move are over (the launcher client polls a job once a second)

        # ---- the write fails: the order stays on the device, « not sent » on the card, said
        st['up'] = False
        drag(col + ':nth-child(3)', col + ':nth-child(1)', 'before')
        c.until("document.querySelectorAll('[data-unsent]').length === 1", what='« not sent » on the moved card')
        c.eq(norm(c.text('[data-unsent]')), norm(T('unsent')), 'the moved card says « not sent »', what='unsent')
        c.until(NOTE, norm(T('noWrite')), what='the failure said')
        local = c.until_doc('device/roadmap.json', lambda d: d and d.get('pri') and d.get('unsent'), what='the order kept on the device')
        c.eq((local['unsent'], 'rank' in local['pri'][local['unsent'][0]]), (['SOG-0006'], True), 'kept in device/roadmap.json with the moved id', what='local')
        # ---- no launcher at all: the same, nothing said about a launcher; back with a launcher at the next opening: sent
        st['up'], st['detect'] = True, False
        c.page.reload()
        c.until("!!document.querySelector('[data-kanban] li[data-id]')", timeout=15000, what='the screen without launcher')
        c.eq((ids()[0], c.count('[data-unsent]')), ('SOG-0006', 1), 'without launcher the device\'s order shows, the moved card « not sent »', what='offline')
        st['detect'] = True
        before = len(st['posts'])
        c.page.reload()
        c.until("!!document.querySelector('[data-kanban] li[data-id]')", timeout=15000, what='the screen with the launcher back')
        c.until("document.querySelectorAll('[data-unsent]').length === 0", timeout=15000, what='the pending order sent')
        c.eq(written()['SOG-0006']['rank'] < written()['SOG-0007']['rank'], True, 'at the next opening with a launcher what the device kept is sent', what='sent later')
        c.eq(c.until_doc('device/roadmap.json', lambda d: d is not None and not d.get('unsent'), what='the device store emptied').get('pri'), {}, 'and the device forgets it', what='forgot')
        # ---- a hostile answer of the launcher: filtered (ids, ranks, milestones)
        st['raw'] = {'ok': True, 'action': 'get', 'exists': True, 'items': {'SOG-0008': {'rank': 1}, '<img src=x onerror=window.__pwn=1>': {'rank': 2}, 'SOG-0007': {'milestone': 'nope', 'rank': 'a'}, 'SOG-0006': {'milestone': 'beta.1<x>', 'rank': 2.5}}}
        c.page.reload()
        c.until("!!document.querySelector('[data-kanban] li[data-id]')", timeout=15000, what='the screen with a hostile answer')
        c.wait(1500)
        c.ok(c.js("window.__pwn === undefined") and c.count('[data-kanban] img') == 0, 'img', 'a hostile identifier is ignored: nothing in the page, nothing runs')
        c.eq(ids()[0], 'SOG-0008', 'only the valid entry counts (SOG-0008 first); an unknown milestone or a non-integer rank is dropped', what='hostile')
        # and what the page writes back carries none of it: the next gesture is accepted by the launcher (a hostile key would refuse the whole set)
        n = len(st['posts'])
        drag(col + ':nth-child(3)', col + ':nth-child(1)', 'before')
        for _ in range(40):
            if len(st['posts']) > n:
                break
            c.wait(250)
        keys = list(st['posts'][-1]['args'].get('items', {}))
        c.ok(len(st['posts']) > n and keys and all(re.fullmatch(r'SOG-\d{4}', k) for k in keys), keys, 'the set written back holds only SOG-nnnn identifiers (the hostile one was filtered out)')
    c.check_errors()


@case('A102', 'Settings › Company: « Migrate » (airline/migrate): the plan first, then the migration, from the launcher; hidden without launcher; a hostile answer is never drawn', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0039 follow-up: the Company card shows, on the launcher computer and while the airline is still at the root of data/airline/, a code field, « See what would be done » (the plan: the code, the files and their size, the fleet said empty) then « Migrate to <code> »; the result is read as a closed list')
def a102(c):
    import os
    import tempfile
    from pathlib import Path
    lang = c.lang
    T = lambda k: tx('frame/settings/access.js', k, lang, after='const TA = {')
    NOTE = "(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))"
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        data = Path(td) / 'data'
        (data / 'airline').mkdir(parents=True)
        (data / 'airline' / 'settings.json').write_text(json.dumps({'name': 'DEFA Virtual', 'networks': {'ivao': True}}), encoding='utf-8')
        (data / 'airline' / 'map_profiles.json').write_text('{"schema": 1, "profiles": []}', encoding='utf-8')
        st = _prio_launcher(c, Path(td), verb=('airline', 'migrate'), ctx={'data': str(data)})
        docs = LEVEL3 + [['airline/settings.json', {'name': 'DEFA Virtual', 'networks': {'ivao': True}}, 'document']]
        box = '[data-card="company"] [data-mig]'
        plan_btn, go_btn = f'{box} [data-act="companyPlan"]', f'{box} [data-act="companyMigrate"]'
        c.open('settings?card=company', docs=docs)
        c.until("(() => { const b = document.querySelector('" + plan_btn + "'); return !!b && !b.closest('[data-mig]').hidden })()", timeout=15000, what='the migration block (airline still at the root, launcher here)')
        c.eq(c.count(f'{box} [data-f="mig-code"]'), 1, 'a code field, empty (the code is proposed)', what='field')
        # ---- the plan: nothing written
        c.tap(plan_btn)
        c.until("!!document.querySelector('" + go_btn + "')", timeout=15000, what='the plan and its « Migrate » button')
        plan = norm(c.text(f'{box} [data-mig-plan]'))
        c.ok(all(x in plan for x in ('DEFA Virtual', 'defa', 'settings.json', 'map_profiles.json', 'fleet.json')) and norm(T('migFleet')) in plan, plan, 'the plan: the name, the code proposed, the three files, the fleet said empty')
        c.eq(c.js("document.querySelector('[data-card=\"company\"] [data-f=\"mig-code\"]').value"), 'defa', 'the proposed code fills the field', what='proposed')
        c.ok(not (data / 'airline' / 'defa').exists() and not (data / 'airline' / 'index.json').exists(), sorted(os.listdir(data / 'airline')), 'the plan wrote nothing')
        c.eq(norm(c.text(go_btn)), norm(T('migGo').replace('{c}', 'defa')), 'the button names the folder', what='button')
        # ---- the migration
        c.tap(go_btn)
        for _ in range(40):
            if (data / 'airline' / 'defa' / 'settings.json').exists() and (data / 'airline' / 'index.json').exists():
                break
            c.wait(250)
        idx = json.loads((data / 'airline' / 'index.json').read_text(encoding='utf-8'))
        c.eq((sorted(os.listdir(data / 'airline' / 'defa')), idx['airlines'], (data / 'airline' / 'settings.json').exists()), (['fleet.json', 'map_profiles.json', 'settings.json'], [{'code': 'defa', 'name': 'DEFA Virtual'}], True),
             'the folder, an empty fleet, the index; the old settings.json stays as a copy', what='migrated')
        c.until(NOTE, norm(T('migDone').replace('{c}', 'defa')), what='the notification « migrated »')
        # ---- a second plan on the same code: refused, said (nothing overwritten)
        before = (data / 'airline' / 'defa' / 'settings.json').read_bytes()
        c.tap(plan_btn)
        c.until("document.querySelector('[data-card=\"company\"] [data-mig] [data-msg]').textContent.trim() !== ''", timeout=15000, what='a message')
        c.eq((norm(c.text('[data-card="company"] [data-mig] [data-msg]')) != '', (data / 'airline' / 'defa' / 'settings.json').read_bytes() == before), (True, True), 'a second plan: the airline already has its folder, said; nothing overwritten', what='exists')
        # ---- a hostile answer: only the closed list is read, nothing runs
        st['raw'] = {'ok': True, 'dry': True, 'code': '<img src=x onerror=window.__pwn=1>', 'name': '<img src=x onerror=window.__pwn=1>', 'files': [{'name': '../../x', 'bytes': 5}, {'name': 'settings.json', 'bytes': 'a'}], 'reason': '<b>x</b>'}
        c.page.fill('[data-card="company"] [data-f="mig-code"]', '')
        c.tap(plan_btn)
        c.wait(2000)
        c.ok(c.js("window.__pwn === undefined") and c.count('[data-card="company"] img') == 0, 'img', 'a hostile code or name is never drawn: no element, nothing runs')
        c.eq(c.count(go_btn), 0, 'an answer without a valid code offers no « Migrate »', what='no button')
        # ---- no launcher: the block is not there
        st['detect'], st['raw'] = False, None
        c.page.reload()
        c.until("!!document.querySelector('[data-card=\"company\"] [data-airlines] [data-airline]')", timeout=15000, what='the card without launcher')
        c.wait(500)
        c.eq(c.js("(() => { const m = document.querySelector('" + box + "'); return !m || m.hidden })()"), True, 'without launcher the migration block is hidden', what='no launcher')
    c.check_errors()


@case('A103', 'The roadmap lanes fold with a touch on their title: folded by default when no card is left undelivered in the current view, the count kept in the title, the choice remembered per device', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0069: each lane folds on its title (a button, aria-expanded); folded by default when it has no undelivered card in the view (tab, filter, milestone); the state is kept in device/roadmap.json; the number of cards stays in the folded title')
def a103(c):
    lang = c.lang
    T = lambda k: tx('frame/help/roadmap.js', k, lang, after='const T = {')
    fx = _rm_fixture()
    c.context.route(re.compile(r'/frame/help/roadmap\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    c.open('roadmap', docs=[['device/level.json', {'level': 3}, 'cache'], ['device/roadmap.json', {'view': 'themes'}, 'cache']])
    c.until("!!document.querySelector('[data-kanban] [data-lane]')", timeout=15000, what='the lanes')
    folded = lambda: c.js("[...document.querySelectorAll('[data-lane]')].map(l => [l.dataset.lane, l.hasAttribute('data-folded')])")
    shown = lambda lane: c.js("(() => { const col = document.querySelector('[data-lane=\"" + lane + "\"] .f-rm-col[data-state]:not([data-empty])'); return !!col && getComputedStyle(col).display !== 'none' })()")
    c.eq(folded(), [['fuel', False], ['data', False], ['stat', False]], 'every lane has an undelivered card in the default view: none is folded', what='default')
    c.eq(norm(c.text('[data-lane="fuel"] [data-lane-count]')), '(2)', 'the number of cards stays in the title', what='count')
    # ---- a milestone whose items are all delivered: its lanes fold by themselves, the count stays
    c.tap('[data-ms="alpha.4"]')
    c.eq(folded(), [['fuel', True], ['data', True]], 'only delivered cards in the view: the lanes are folded by default', what='folded by default')
    c.eq((shown('fuel'), norm(c.text('[data-lane="fuel"] [data-lane-count]'))), (False, '(1)'), 'a folded lane shows no column, its title says how many cards', what='folded')
    c.tap('[data-fold="fuel"]')
    c.eq((folded()[0], shown('fuel'), c.js("document.querySelector('[data-fold=\"fuel\"]').getAttribute('aria-expanded')")), (['fuel', False], True, 'true'), 'a touch on the title unfolds it', what='unfold')
    c.tap('[data-ms="alpha.4"]')
    # ---- a lane folded by hand stays folded, on this device
    c.tap('[data-fold="data"]')
    c.eq((folded()[1], shown('data'), c.js("document.querySelector('[data-fold=\"data\"]').getAttribute('aria-expanded')")), (['data', True], False, 'false'), 'a touch on a lane\'s title folds it', what='fold')
    c.eq(c.until_doc('device/roadmap.json', lambda d: d and d.get('fold', {}).get('data') is True, what='the choice stored').get('fold'), {'fuel': False, 'data': True}, 'the choices are kept in device/roadmap.json', what='stored')
    c.page.reload()
    c.until("!!document.querySelector('[data-kanban] [data-lane]')", timeout=15000, what='the lanes again')
    c.eq(folded(), [['fuel', False], ['data', True], ['stat', False]], 'after a reload the lane folded by hand is still folded', what='remembered')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll', what='scroll')
    c.check_errors()


@case('A104', 'Mission categories of an airline (SOG-0041): the common base, the groups active for the airline’s kind, categories.json read as untrusted input', 'A', tags=('airline',), designs=('standard',), screens=False, night=False,
      rule='V3_SPECIFICATION § 10.38 (mission categories): frame/lib/mission_categories.js — without a file the base (commercial: cargo, passengers, VIP, training, transit, test flights, positioning; virtual: the airline’s own); commercial only for a « va » or the personal airline; every id, name, load and bound of the file filtered (§ 10.36)')
def a104(c):
    _bench(c, 'frame/lib/test/mission_categories.html', '__catBench')


@case('A105', 'Settings › Company (SOG-0041, step A): a list of radio buttons with the kind said in words, choosing replaces no node of the list, the chosen airline’s sheet (kind radios, mission themes) is open under it, three gestures below; a hostile file is text', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='SOG-0041 (refused at the recipe: « plutôt qu’un bouton choisir, un bouton radio — on ne sait pas si c’est un sog ou une compagnie commerciale — ça clignote au choix — où est catégorie de missions ? »): a line = radio, name, kind in words, fleet; the choice applies at the tap and only the radios change; the sheet of the CHOSEN airline holds the kind (two radios with a line each) and the mission themes (SOG-0202 T3), visible; « Créer », « Rejoindre », the migration; everything read is untrusted')
def a105(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    KN = lambda: c.js("import('/frame/lib/airline.js').then(m => m.KIND_NAMES)")   # the words of the kind: one source, shared with the report and Mes vols (SOG-0181)
    K = lambda k: KN()[k][['fr', 'en', 'de', 'es'].index(lang)]
    evil = '<img src=x onerror=window.__pwn=1>'
    hostile = {'schema': 1, 'chosen': ['HEMS', 'NOPE', evil, 'bad id'], 'added': {'themes': [{'id': 'BAD', 'short': 'BAD', 'labels': [evil]}, {'id': 'x', 'labels': ['y']}], 'series': {'HEMS': [{'value': evil, 'labels': [evil]}]}}}
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document'],
            ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air', 'kind': 'sog'}, 'document'],
            ['airline/bbb/themes.json', hostile, 'document']]
    row = lambda code, extra='': f'[data-card="company"] [data-airlines] [data-airline="{code}"] {extra}'.strip()
    fiche = lambda extra='': f'[data-card="company"] [data-airline-fiche] {extra}'.strip()
    ready = lambda: c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 3 && !!document.querySelector('[data-airline-fiche] [data-kind-set]')", timeout=15000, what='the lines and the sheet of the chosen airline')
    mark = lambda: c.js("[...document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]')].forEach(n => { n.__kept = true })")
    kept = lambda: c.js("[...document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]')].map(n => [n.dataset.airline, !!n.__kept])")
    meta = lambda code: norm(c.text(row(code, '[data-co-meta]')))
    checked = lambda sel: c.js(f"[...document.querySelectorAll('{sel}')].map(i => [i.value, i.checked])")
    c.open('settings?card=company', docs=docs)
    ready()
    c.shot(f"A105_standard_{c.page.viewport_size['width']}_delivered.png")   # the delivered state, read by the ergonomist
    # ---- the list: radio buttons, the kind in words, no « Choose » button
    c.eq(c.count('[data-card="company"] [data-airlines] button'), 0, 'no « Choose » button in the list', what='buttons')
    c.eq(c.count('[data-card="company"] [data-airlines] input[type=radio]'), 3, 'one radio button per line (two airlines and « personal »)', what='radios')
    c.ok(norm(K('none')) in meta('aaa') and norm(K('sog')) in meta('bbb') and norm(K('perso')) in meta('perso'), [meta('aaa'), meta('bbb'), meta('perso')], 'the kind is said in words on each line: not chosen yet, squadron, personal')
    c.le(c.js(f"document.querySelector('{row('aaa')}').children.length"), 7, 'a line has seven elements at most', what='elements')
    c.eq(checked('[data-card="company"] [data-airlines] input'), [['aaa', True], ['bbb', False], ['perso', False]], 'the current airline (the first of the index, no choice yet) is the checked radio', what='checked')
    # ---- the sheet of the CHOSEN airline is open under the list: kind radios with a line each, the themes visible without unfolding
    c.eq([c.count('[data-card="company"] [data-airline-fiche] details'), c.count('[data-card="company"] [data-airlines] details')], [2, 0], 'nothing to unfold in the list; in the sheet only the two folded forms « Ajouter un thème… » and « Ajouter une série… » (SOG-0202 T3b)', what='details')
    c.ok(norm(T('ficheTitle').replace('{n}', 'Alpha Air')) in norm(c.text(fiche('h3'))), norm(c.text(fiche('h3'))), 'the sheet is titled with the chosen airline')
    c.eq(checked(fiche('[data-act=companyKind]')), [['va', False], ['sog', False]], 'the kind: two radio buttons, none chosen yet', what='kind radios')
    c.eq(c.count(fiche('.f-kind .f-muted')), 2, 'each kind has its line of explanation', what='explanations')
    c.ok(c.js(f"(() => {{ const h = document.querySelector('{fiche('[data-themes-title]')}'); return !!h && h.offsetParent !== null }})()"), None, 'the title « Mission themes » is visible without a tap')
    c.eq(norm(c.text(fiche('[data-themes-title]'))), norm(T('themeSummary').replace('{n}', '17').replace('{m}', '17')), 'no kind and no file: the seventeen themes are ticked in advance', what='no kind count')
    c.eq(c.count(fiche('li[data-theme]')), 17, 'seventeen themes listed, one box each', what='listed')
    c.eq(c.js(f"document.querySelector('{fiche('li[data-theme]')}').dataset.theme"), 'COMMERCIAL', 'COMMERCIAL first in the list shown (the table carries it 17th: only the file is written in the table order)', what='first')
    g = c.js(f"(() => {{ const u = document.querySelector('{fiche('[data-themes]')}'), cs = getComputedStyle(u); return [cs.listStyleType, cs.gridTemplateColumns.trim().split(/\s+/).length, u.scrollWidth <= u.clientWidth + 1] }})()")
    c.eq(g, ['none', 2 if c.width >= 700 else 1, True], 'no bullet before a box; two columns from 700 px, one below', what='layout')
    c.js(f"document.querySelector('{fiche('[data-themes-title]')}').scrollIntoView({{ block: 'start' }})")
    c.shot(f"A105_standard_{c.width}_themes_delivered.png")   # the themes of the sheet, read by the ergonomist
    c.js("window.scrollTo(0, 0)")
    # ---- the kind: written in settings.json, the rest of the file kept; the other lines are not redrawn
    mark()
    c.tap(fiche('[data-act=companyKind][data-kind=va]'))
    d = c.until_doc('airline/aaa/settings.json', lambda d: bool(d and d.get('kind') == 'va'), what='the kind written')
    c.ok(d['name'] == 'Alpha Air' and d['networks'] == {'ivao': True} and d.get('by') is not None, d, 'the rest of settings.json is kept')
    c.until(f"document.querySelector('{fiche('[data-themes-title]')}').textContent.replace(/\\D+/g, ' ').trim() === '1 17'", what='a commercial airline: one theme of seventeen ticked in advance')
    c.eq(checked(fiche('[data-act=companyKind]')), [['va', True], ['sog', False]], 'the commercial radio is the checked one', what='va checked')
    c.ok(norm(K('va')) in meta('aaa'), meta('aaa'), 'and its line says « Commercial »')
    c.eq(kept(), [['aaa', True], ['bbb', True], ['perso', True]], 'the line whose words changed has its grey text replaced IN PLACE (SOG-0218): no node of the list is replaced', what='kept after kind')
    c.eq(c.js(f"[...document.querySelectorAll('{fiche('input[data-theme]')}')].filter(i => i.checked).map(i => i.dataset.theme)"), ['COMMERCIAL'], 'only the Commercial theme is ticked in advance', what='ticked')
    c.eq(c.doc('airline/aaa/themes.json'), None, 'nothing is written until a box is ticked', what='no file')
    # ---- choosing: no node of the list is replaced; only the radios and the sheet change
    mark()
    c.tap(row('bbb', 'input'))
    c.until("document.querySelector('[data-airline-fiche] h3') && document.querySelector('[data-airline-fiche] h3').textContent.includes('Bravo Air')", what='the sheet of the chosen airline')
    c.eq(kept(), [['aaa', True], ['bbb', True], ['perso', True]], 'choosing replaces no line of the list (nothing blinks)', what='kept after choice')
    c.eq(checked('[data-card="company"] [data-airlines] input'), [['aaa', False], ['bbb', True], ['perso', False]], 'only the state of the radios changed', what='checked after')
    c.eq(c.js("[...document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]')].filter(n => n.hasAttribute('data-current')).map(n => n.dataset.airline)"), ['bbb'], 'data-current moved with it', what='current')
    c.eq(_airline_code(c, 'bbb'), 'bbb', 'the frame keeps the choice (FrameData.airline)', what='frame')
    c.eq(c.count(fiche('[data-kind-set]')), 1, 'only the chosen airline has a sheet', what='one sheet')
    c.eq(checked(fiche('[data-act=companyKind]')), [['va', False], ['sog', True]], 'a squadron: the squadron radio is checked', what='sog checked')
    c.eq(c.js(f"[...document.querySelectorAll('{fiche('input[data-theme]')}')].filter(i => i.checked).map(i => i.dataset.theme)"), ['HEMS'], 'the file of the squadron is read: its chosen themes, the unknown and hostile ids dropped', what='ticked squadron')
    c.ok(c.count(fiche('img')) == 0 and c.js('window.__pwn === undefined'), None, 'a hostile name is text: no element, nothing runs')
    # ---- « Personal »: a line of words, nothing to set
    mark()
    c.tap(row('perso', 'input'))
    c.until("!!document.querySelector('[data-airline-fiche] [data-fiche-perso]')", what='the personal note')
    c.eq([c.count(fiche('[data-kind-set]')), c.count(fiche('[data-act=companyTheme]')), kept()], [0, 0, [['aaa', True], ['bbb', True], ['perso', True]]], '« Personal »: no kind, no theme to set, still no line replaced', what='perso')
    # ---- ticking a theme writes themes.json (the table order, `added` kept); the last one cannot be unticked
    c.tap(row('aaa', 'input'))
    c.until("document.querySelector('[data-airline-fiche] [data-themes]')", what='the commercial sheet again')
    c.tap(fiche('[data-act=companyTheme][data-code=aaa][data-theme=HEMS]'))
    doc = c.until_doc('airline/aaa/themes.json', lambda d: bool(d and d.get('chosen')), what='themes.json written')
    c.eq([doc['schema'], doc['chosen'], doc['added']], [1, ['HEMS', 'COMMERCIAL'], {'themes': [], 'series': {}}], 'the chosen themes in the order of the table, nothing added', what='file')
    c.until(f"document.querySelector('{fiche('[data-themes-title]')}').textContent.replace(/\\D+/g, ' ').trim() === '2 17'", what='the title counts two')
    c.tap(fiche('[data-act=companyTheme][data-code=aaa][data-theme=COMMERCIAL]'))
    c.until_doc('airline/aaa/themes.json', lambda d: bool(d) and d['chosen'] == ['HEMS'], what='unticked')
    before = c.doc('airline/aaa/themes.json')
    c.js("document.querySelector('[data-fiche-msg]').textContent = ''")
    c.tap(fiche('[data-act=companyTheme][data-code=aaa][data-theme=HEMS]'))
    c.until("document.querySelector('[data-fiche-msg]').textContent.trim() !== ''", timeout=6000, what='the refusal themeOne')
    c.eq(norm(c.text('[data-fiche-msg]')), norm(T('themeOne')), 'the last theme cannot be unticked: said under the sheet', what='refusal')
    c.eq(c.doc('airline/aaa/themes.json'), before, 'and nothing is written', what='refused')
    # ---- the three gestures under the sheet, in this order
    c.eq([norm(x) for x in c.js("[...document.querySelectorAll('[data-card=\"company\"] > details > summary')].map(s => s.textContent)")], [norm(T('add')), norm(T('join'))], '« Create an airline », then « Join an airline » (the migration after them when it applies)', what='gestures')
    c.check_errors()


# the layout shifts of a page (Layout Instability API), from the first byte: the sum of the shifts without a recent input, and what moved
CLS_PROBE = """(() => { window.__cls = { value: 0, items: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__cls.value += e.value;
    window.__cls.items.push([+e.value.toFixed(4), (e.sources || []).map(s => (s.node && (s.node.nodeType === 1 ? s.node : s.node.parentElement) || {}).className || (s.node || {}).nodeName || '?').slice(0, 3)]) } })
    .observe({ type: 'layout-shift', buffered: true }) } catch (e) {} })()"""


_HOLD_MODULE = """export const meta = { id: 'atmosphere' };
export function mount(el, ctx) {
  el.innerHTML = '<div id="a"></div><p id="a2">below A</p><div id="b"></div><p id="b2">below B</p>';
  const A = el.querySelector('#a'), B = el.querySelector('#b'), top = id => Math.round(el.querySelector(id).getBoundingClientRect().top);
  const done = typeof ctx.placeholder === 'function' ? ctx.placeholder(A, 120) : () => {};
  window.__first = { a2: top('#a2'), b2: top('#b2'), wait: getComputedStyle(A, '::before').content, busy: A.getAttribute('aria-busy'), h: Math.round(A.getBoundingClientRect().height) };
  setTimeout(() => {   // the content arrives: A (held at 120) and B (not held) both take 120 px
    A.innerHTML = '<div style="height:120px">A</div>'; done(); B.innerHTML = '<div style="height:120px">B</div>';
    window.__after = { a2: top('#a2'), b2: top('#b2'), busy: A.getAttribute('aria-busy'), cls: A.className };
  }, 700);
}
export function unmount() {}"""


@case('A110', 'Screens that do not move: ctx.placeholder reserves the place of a block whose content arrives later; Settings at load shifts nothing', 'A', designs=('standard',),
      screens=False, night=False,
      rule='V3_SPECIFICATION 7.1 rule 22 (SOG-0132): a block whose content arrives after the first render is laid out at its final or minimum height from the first render (ctx.placeholder(el, height): the height, a discreet « … », aria-busy), never empty then filled; the cumulative layout shift of a screen at load is under 0.1')
def a110(c):
    c.page.add_init_script(CLS_PROBE)
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=_HOLD_MODULE))
    c.open('atmosphere', wait=False)
    c.until('!!window.__after', timeout=20000, what='the content of the blocks has arrived')
    first, after = c.js('() => window.__first'), c.js('() => window.__after')
    c.eq((first['h'], first['busy'], first['wait']), (120, 'true', '"…"'), 'at the first render the block already has its height, a discreet « … » and aria-busy', what='first render')
    c.eq(after['a2'] - first['a2'], 0, 'the held block did not move what is under it when its content arrived', what='shift under the held block')
    c.ok(after['b2'] - first['b2'] >= 120, f"{after['b2'] - first['b2']} px", 'the same block without the reservation moves what is under it by its whole height (at least)')
    c.eq((after['busy'], after['cls']), (None, ''), 'done(): the « … » and the reserved height are gone', what='after done')
    # a real screen: Settings at load (CLS of the page, from the first byte)
    c.context.unroute(re.compile(r'/modules/atmosphere/module\.js'))
    c.open('settings', docs=LEVEL3, wait=False)
    c.until("!!document.querySelector('#fView > *')", timeout=20000, what='the settings screen')
    c.wait(3000)
    got = c.js("() => window.__cls")
    c.ok(got['value'] < 0.1, f"CLS {got['value']:.3f}: {got['items']}", 'the cumulative layout shift of Settings at load is under 0.1')


@case('A106', 'Settings: the screen is drawn at once; the data repository (read from the launcher, slow) arrives after, in a line of fixed height, and the screen is drawn once more', 'A', tags=('settings',), designs=('standard',), screens=False, night=False,
      rule='SOG-0133: « plusieurs secondes avant d\u2019afficher l\u2019écran des settings, alors que la version du git est un paramètre accessoire » — the first drawing does not wait for sync-remote (120 ms at most); the line « Dépôt des données » is « … » then the value, same height; what depends on the repository is drawn when it arrives')
def a106(c):
    lang = c.lang
    sj = 'frame/settings/launcher.js'
    T = lambda k: tx(sj, k, lang, after='Object.assign(T, {')
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    remote = {'repo': True, 'remote': 'origin', 'url': 'https://example.test/acme/data.git', 'branch': 'main', 'state': 'repo', 'default': ''}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and route.request.method == 'GET':
            body = remote
        elif path.endswith('/__setup/secrets'):
            body = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}}, 'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    # the repository read takes 1.5 s (git on the workstation: measured 1.4 s on the user\u2019s data/)
    c.page.add_init_script(CLS_PROBE)   # the layout shifts of the page (frame rule 22, A110)
    c.page.add_init_script("""(() => { const f = window.fetch; window.fetch = function (u, o) { const url = String((u && u.url) || u); const slow = /sync-remote/.test(url) && (!o || !o.method || o.method === 'GET');
      return slow ? new Promise(ok => setTimeout(ok, 1500)).then(() => f.apply(this, arguments)) : f.apply(this, arguments) } })()""")
    c.open('settings?card=access', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"access\"] [data-git-line]')", timeout=8000, what='the Access card is drawn')
    t_first = c.js("(() => { const m = performance.getEntriesByName('sog-settings-first').pop(), s = performance.getEntriesByName('sog-settings-start').pop(); return m && s ? m.startTime - s.startTime : null })()")
    c.ok(t_first is not None and t_first < 300, t_first, 'the first drawing took less than 300 ms although the repository takes 1.5 s (measured: sog-settings-start → sog-settings-first)')
    line = lambda: c.js("(() => { const e = document.querySelector('[data-git-line]'); const r = e.getBoundingClientRect(); return [e.textContent.trim(), Math.round(r.height), Math.round(r.top)] })()")
    first = line()
    c.eq([c.js("document.querySelector('[data-git-line]').getAttribute('aria-busy')"), c.js("getComputedStyle(document.querySelector('[data-git-line]'), '::before').content")], ['true', '"…"'],
         'until the launcher answers the line is the frame’s reserve (f-hold, aria-busy): « … » at its final height', what='pending reserve')
    c.eq(c.count('[data-card="remote"]'), 0, 'what depends on the repository is not drawn yet', what='no remote panel')
    # the value arrives: same height, same place; then the screen is drawn once more with the repository (the panel of the remote repository is in the Administration card)
    c.until("document.querySelector('[data-git-line]').textContent.includes('example.test')", timeout=8000, what='the repository arrives')
    second = line()
    c.eq([second[1], second[2]], [first[1], first[2]], 'the line does not move nor change height when the value arrives', what='fixed block')
    c.eq(norm(second[0]), norm(T('gitLine').replace('{v}', 'https://example.test/acme/data.git (main)')), 'the value: address and branch', what='value')
    c.eq(c.js("document.querySelector('[data-git-line]').hasAttribute('aria-busy')"), False, 'the reserve is released when the value is in place', what='released')
    c.wait(300)
    cls = c.js('window.__cls')
    c.ok(cls['value'] < 0.1, cls, 'the cumulative layout shift of the screen at load, repository included, stays under 0.1 (rule 22)')
    c.check_errors()


@case('A111', 'Conflicts screen: an entry shows what differs between the two versions (the real diff); a blank version says « (empty) », never a blank block', 'A', tags=('data',),
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0136 (frame/app.js renderConflicts): « What differs (− set aside, + kept) » lists the lines that differ; two versions that say the same thing say so; an empty version is written « (empty) »')
def a111(c):
    lang = c.lang
    C = lambda k: tx('frame/app.js', k, lang, after='const C = {')
    kept = '{\n "route": "LFLL BUSIL LFPO",\n "level": 180\n}\n'
    lost = '{\n "route": "LFLL LFPO",\n "level": 180\n}\n'
    c.open('settings')
    c.js("async ([k, l]) => { await FrameData.noteConflict({ path: 'pilot/ABC/current_flight.json', kept: k, lost: l, side: 'remote' }); await FrameData.noteConflict({ path: 'pilot/ABC/empty.json', kept: '', lost: ' ', side: 'remote' }); await FrameData.noteConflict({ path: 'pilot/ABC/same.json', kept: k, lost: k.replace(/\\n/g, '\\r\\n'), side: 'remote' }) }", [kept, lost])
    c.page.evaluate("() => { location.hash = '#conflicts' }")
    c.until("document.querySelectorAll('#fView .f-card[data-id]').length === 3", timeout=10000, what='the three entries')
    pick = "(n) => [...document.querySelectorAll('#fView .f-card[data-id]')].find(x => x.querySelector('b').textContent === n)"
    diff = lambda name: norm(c.js(f"(n) => ({pick})(n).querySelector('[data-diff]').textContent", name))
    c.eq(diff('pilot/ABC/current_flight.json'), norm('− "route": "LFLL LFPO", + "route": "LFLL BUSIL LFPO",'), 'the diff names the line set aside (−) and the line kept (+), nothing else', what='diff')
    c.eq(diff('pilot/ABC/same.json'), norm(C('sameText')), 'two versions that differ by their line endings only say the same thing', what='same')
    empty = c.js(f"(n) => [...({pick})(n).querySelectorAll('pre:not([data-diff])')].map(p => p.textContent.trim())", 'pilot/ABC/empty.json')
    c.eq(empty, [norm(C('emptyText'))] * 2, 'a blank version is written « (empty) » in both blocks: never a blank block', what='empty blocks')
    c.check_errors()


def _tm_status(total, steps, at=None, git=(12, 1000), sent=38912):
    """A sync-status answer whose `last` pass carries timings (SOG-0149); a path waits so that the card is shown."""
    import datetime
    now = at or datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    return {'repo': True, 'changes': 1, 'changed': ['aircraft/sheets/DB_A320.json'], 'changedTotal': 1, 'toPush': [], 'toPushTotal': 0, 'ahead': 0, 'behind': 0, 'merging': False,
            'last': {'at': now, 'ok': True, 'timings': {'steps': steps, 'totalMs': total, 'gitCalls': git[0], 'gitMs': git[1], 'sentBytes': sent}}}


@case('A112', 'Settings › Synchronisation: the time of the last pass and the longest of the day, in seconds, step by step (SOG-0149); a shorter pass does not replace the longest, another day does; a hostile answer is only numbers', 'A', tags=('settings',),
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0149 (V3 Frame 12cad5326: data_sync.run writes timings in sync.json; the launcher gives them in sync-status last.timings): the card says how long the last pass took and the longest of the day, in seconds, per step; the longest is kept on the device (the launcher keeps the last only); closed list of steps, bounded numbers, no text from the answer')
def a112(c):
    lang = c.lang
    sj = 'frame/settings/sync_summary.js'
    L = lambda k, after=None: norm(tx(sj, k, lang, after=after) if after else tx(sj, k, lang))
    step = lambda k: L(k, 'tmStep: {')
    git = lambda n, sec: L('tmGit').replace('{n}', str(n)).replace('{s}', sec)
    sent = lambda b: L('tmSent').replace('{b}', b)
    line = lambda total, parts: f'{total} s' + (' — ' + ' · '.join(parts) if parts else '')
    dd = lambda which: norm(c.js(f"document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm={which}]')?.textContent || ''"))
    dt = lambda: [norm(x) for x in c.js("[...document.querySelectorAll('[data-card=\"sync\"] [data-sync-timings] dt')].map(d => d.textContent)")]
    long_pass = {'commit': 1000, 'receive': 2000, 'push': 4000, 'settle': 20}
    # ---- A: the first pass of the day is the last and the longest: whole seconds per step, git commands, bytes sent; a step under 50 ms is not said
    _sync_open(c, [], _tm_status(8000, long_pass))
    c.until("!!document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm=longest]')", timeout=15000, what='the timings')
    first = norm(line(8, [f"{step('commit')} 1 s", f"{step('receive')} 2 s", f"{step('push')} 4 s", git(12, '1 s'), sent('38 Ko')]))
    c.ok(dd('last').startswith(first), dd('last'), 'the last pass: total, then the steps in order, the git commands, the bytes sent (a 20 ms step is not said)')
    c.ok(dd('longest').startswith(first), dd('longest'), 'the first pass of the day is also the longest')
    c.eq(dt(), [L('tmLast'), L('tmLongest')], 'the two lines are named', what='labels')
    # ---- B: a shorter pass later in the day: the last changes, the longest stays (kept on the device across the reload)
    _sync_open(c, [], _tm_status(3000, {'push': 3000}, git=(4, 0), sent=0))
    c.until("document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm=last]')?.textContent.trim().startsWith('3 s')", timeout=15000, what='the shorter pass')
    c.eq(dd('last').startswith(norm(line(3, [f"{step('push')} 3 s", git(4, '0 s')]))), True, 'the last pass is the shorter one, without bytes when nothing was sent', what='last 3')
    c.ok(dd('longest').startswith(first), dd('longest'), 'the longest of the day stays the 8 s pass: a shorter pass does not replace it')
    # ---- C: a longer pass replaces it; the record of another day is not today's longest
    _sync_open(c, [], _tm_status(12000, {'receive': 12000}, git=(2, 0), sent=0))
    c.until("document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm=longest]')?.textContent.trim().startsWith('12 s')", timeout=15000, what='a longer pass')
    old_day = ['device/sync_timings.json', {'day': '2000-01-01', 'at': '2000-01-01T08:00:00Z', 'totalMs': 600000, 'steps': {'push': 600000}, 'gitCalls': 1, 'gitMs': 1, 'sentBytes': 1}, 'cache']
    _sync_open(c, [], _tm_status(5000, {'commit': 5000}, git=(1, 0), sent=0), extra=[old_day])
    c.until("document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm=longest]')?.textContent.trim().startsWith('5 s')", timeout=15000, what='the day changed')
    c.ok('600' not in dd('longest'), dd('longest'), 'the longest of another day is forgotten: today\u2019s pass is the longest of today')
    # ---- D: a hostile answer: a number written as text, a string, a negative number, an unknown step: only numbers are said, nothing becomes an element
    bad = _tm_status(5000, {'commit': '9000', 'receive': '<img src=x onerror=window.__pwn=1>', 'push': -5, 'evil<b>': 1000}, git=('x', 'y'), sent='a')
    _sync_open(c, [], bad)
    c.until("!!document.querySelector('[data-card=\"sync\"] [data-sync-timings] [data-tm=last]')", timeout=15000, what='the hostile pass')
    c.eq(dd('last').split(' (')[0], '5 s', 'only the total is said: no step, no git, no bytes from a hostile answer', what='hostile')
    c.ok(c.count('[data-card="sync"] [data-sync-timings] img, [data-card="sync"] [data-sync-timings] b') == 0 and c.js('window.__pwn === undefined'), None, 'nothing from the answer becomes an element')
    # ---- E: no timings in the answer (an older launcher): nothing is drawn, nothing is invented
    old = _tm_status(1000, {})
    del old['last']['timings']
    _sync_open(c, [], old)
    c.wait(500)
    c.eq([c.count('[data-card="sync"] [data-sync-timings] [data-tm=last]'), c.count('[data-card="sync"] [data-sync-timings] [data-tm=longest]')], [0, 1],
         'a launcher without timings: no « last » line, nothing invented; the longest of today, kept on the device, stays', what='old launcher')
    c.check_errors()


@case('A113', 'The launcher transport commits the queue without a ReferenceError: a synchronisation that goes through POST /__setup/batch ends with the new head (« last is not defined » on 10 Nov 2026)', 'A', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0063 moved the transport’s last read into `shared.last`; commit() still wrote the old closure variable `last = null`: every sync that sent something failed with « refused by the server: last is not defined » (frame/app.js errs.other)')
def a113(c):
    c.context.route(re.compile(r'/__setup/batch'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'head': 'h2'})))
    c.open('settings')
    c.until("!!(window.FrameData && FrameData.launcher)", timeout=15000, what='the launcher transport')
    r = c.js("""async () => { try { const t = FrameData.launcher({}); return { head: await t.commit([{ path: 'x.json', text: '{}' }], 'm', 'h1') } } catch (e) { return { error: String(e && e.message || e), name: e && e.name } } }""")
    c.eq(r, {'head': 'h2'}, 'commit() answers the head the launcher gave, with no ReferenceError', what='commit')
    c.check_errors()


def _prio_fixture():
    """A roadmap file for the priorities view (SOG-0160): milestones alpha.4 (done), alpha.5 (in progress), alpha.6 (planned), beta.1 (later); two themes of two backlog cards each and one card in integration."""
    lab = lambda fr, en: {'fr': fr, 'en': en, 'de': en + ' (de)', 'es': en + ' (es)'}
    item = lambda state, n, **kw: {'state': state, 'id': f'SOG-{n:04d}', **lab(f'Carte {n}', f'Card {n}'), **kw}
    stone = lambda i, st: {'id': i, 'label': lab(i, i), 'date': '', 'state': st, 'items': []}
    return {'schema': 'sog-roadmap/1', 'version': 2, 'updated': '2026-11-10', 'generated': {'organisation': 'abc1234', 'fiches': 5}, 'note': lab('Note', 'Note'),
            'states': {'done': lab('Livré', 'Delivered'), 'doing': lab('En cours', 'In progress'), 'planned': lab('Prévu', 'Planned'), 'later': lab('Plus tard', 'Later')},
            'apps': [{'id': 'pilote', 'label': lab('Pilote', 'Pilot'), 'state': 'doing'}],
            'milestones': [stone('alpha.4', 'done'), stone('alpha.5', 'doing'), stone('alpha.6', 'planned'), stone('beta.1', 'later')],
            'lanes': [{'id': 'fuel', 'app': 'pilote', 'label': lab('Thème A', 'Theme A'), 'items': [item('doing', 15, milestone='alpha.5'), item('planned', 11), item('planned', 12)]},
                      {'id': 'data', 'app': 'pilote', 'label': lab('Thème B', 'Theme B'), 'items': [item('planned', 13), item('planned', 14)]}]}


@case('A114', 'The roadmap opens « Par thème »; « Priorités » is a mode you choose (kept on the device): three columns (in integration, in development, backlog), the cards flat by rank with their theme as a label; a card of theme B above a card of theme A, sent to development, held after a reload; « Par thème » is the read-only secondary view', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0160 (the user, 10 Nov 2026, then refused: « oui, mais par thème par défaut. c’est un « mode priorités », pas un default »): the roadmap opens « Par thème »; « Priorités » is a mode the user chooses and the device keeps; that view is a flat list in three columns drawn from the milestones, a drag (a phone: Monter, Descendre, Envoyer vers…) writes the rank and the milestone in organisation/PRIORITES.json; « Par thème » keeps today’s lanes, without dragging')
def a114(c):
    import tempfile
    from pathlib import Path
    lang = c.lang
    T = lambda k: tx('frame/help/roadmap.js', k, lang, after='const T = {')
    fx = _prio_fixture()
    c.context.route(re.compile(r'/frame/help/roadmap\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'frame' / 'help').mkdir(parents=True)
        (root / 'frame' / 'help' / 'roadmap.json').write_text(json.dumps(fx), encoding='utf-8')
        (root / 'organisation').mkdir()
        prio = root / 'organisation' / 'PRIORITES.json'
        written = lambda: json.loads(prio.read_text(encoding='utf-8'))['items'] if prio.exists() else None
        _prio_launcher(c, root)
        ids = lambda col: c.js("(k) => [...document.querySelectorAll('[data-col=\"' + k + '\"] li[data-id]')].map(l => l.dataset.id)", col)
        cols = lambda: {k: ids(k) for k in ('integration', 'development', 'backlog')}
        views = "[...document.querySelectorAll('[data-view]')].map(b => [b.dataset.view, b.getAttribute('aria-pressed')])"
        c.open('roadmap', docs=LEVEL3)
        # ---- the default view is « Par thème » (the lanes); « Priorités » is chosen, then kept (the reload below reads it back)
        c.until("document.querySelectorAll('[data-lane]').length > 0", timeout=15000, what='the lanes (« Par thème » by default)')
        c.eq([c.js(views), c.count('[data-priorities]')], [[['priorities', 'false'], ['themes', 'true']], 0], '« Par thème » is the default: lanes, no column', what='default')
        c.tap('[data-view=priorities]')
        c.until("!!document.querySelector('[data-priorities] li[data-id]')", timeout=15000, what='the priorities view')
        # ---- the chosen view: the priorities, three columns from the milestones, no lane, the theme on the card
        c.eq(c.js(views), [['priorities', 'true'], ['themes', 'false']], 'two views, « Priorités » chosen', what='views')
        c.eq(norm(c.text('[data-view=priorities]')), norm(T('vPrio')), 'worded in the language of the run', what='view label')
        c.eq(c.count('[data-lane]'), 0, 'the lanes are effaced', what='no lane')
        c.eq(cols(), {'integration': ['SOG-0015'], 'development': [], 'backlog': ['SOG-0011', 'SOG-0012', 'SOG-0013', 'SOG-0014']},
             'the cards by milestone: the one in progress, the next one, the rest', what='columns')
        c.eq([norm(c.js(f"document.querySelector('[data-col={k}] h3').firstChild.textContent")) for k in ('integration', 'development', 'backlog')], [norm(T('colIntegration')), norm(T('colDevelopment')), norm(T('colBacklog'))], 'the three columns, named', what='column names')
        c.eq(norm(c.js("document.querySelector('[data-id=\"SOG-0013\"] [data-theme]').textContent")), 'Thème B' if lang == 'fr' else 'Theme B' + ('' if lang == 'en' else f' ({lang})'), 'the theme is a label on the card', what='theme tag')
        c.shot(f'A114_priorities_{c.width}_{lang}.png')
        if c.phone:
            c.tap('[data-col-pick=backlog]')
        # ---- a card of theme B above a card of theme A
        if c.phone:
            for _ in range(3):
                c.tap('[data-id="SOG-0014"] [data-up]')
        else:
            c.js("document.querySelectorAll('.f-note').forEach(n => n.remove())")
            c.page.locator('[data-id="SOG-0014"]').evaluate("el => el.scrollIntoView({ block: 'center' })")
            a = c.page.locator('[data-id="SOG-0014"]').bounding_box()
            b = c.page.locator('[data-id="SOG-0011"]').bounding_box()
            c.page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8)
            c.page.mouse.down()
            c.page.mouse.move(a['x'] + a['width'] / 2 + 10, a['y'] + 18, steps=2)
            c.page.mouse.move(b['x'] + b['width'] / 2, b['y'] + 4, steps=10)
            c.page.mouse.up()
        c.until("document.querySelector('[data-col=backlog] li[data-id]').dataset.id === 'SOG-0014'", what='SOG-0014 on top of the backlog')
        c.eq(ids('backlog'), ['SOG-0014', 'SOG-0011', 'SOG-0012', 'SOG-0013'], 'the theme-B card is above the theme-A cards: the themes do not block the order', what='order')
        # ---- sent to development: its milestone is written
        if c.phone:
            c.page.select_option('[data-id="SOG-0011"] select[data-send]', 'development')
        else:
            c.js("document.querySelectorAll('.f-note').forEach(n => n.remove())")
            a = c.page.locator('[data-id="SOG-0011"]').bounding_box()
            d = c.page.locator('[data-col=development]').bounding_box()
            c.page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8)
            c.page.mouse.down()
            c.page.mouse.move(a['x'] + a['width'] / 2 + 10, a['y'] + 18, steps=2)
            c.page.mouse.move(d['x'] + d['width'] / 2, d['y'] + d['height'] / 2, steps=10)
            c.page.mouse.up()
        c.until("document.querySelector('[data-col=development] li[data-id]')", what='the card in development')
        c.eq(cols(), {'integration': ['SOG-0015'], 'development': ['SOG-0011'], 'backlog': ['SOG-0014', 'SOG-0012', 'SOG-0013']}, 'sent to development: the next milestone’s column', what='sent')
        pri = None
        for _ in range(40):
            pri = written()
            if pri and pri.get('SOG-0011', {}).get('milestone'):
                break
            c.wait(250)
        c.eq([pri['SOG-0011'].get('milestone'), pri['SOG-0014']['rank'] < pri['SOG-0012']['rank']], ['alpha.6', True], 'the launcher wrote the milestone (the next one) and the ranks', what='written')
        c.wait(2500)    # the send is over
        # ---- a reload: held (read back from the launcher's file)
        c.page.reload()
        c.until("!!document.querySelector('[data-priorities] li[data-id]')", timeout=15000, what='the screen again')
        c.until("document.querySelector('[data-col=development] li[data-id]')", timeout=15000, what='the order read back')
        c.eq(cols(), {'integration': ['SOG-0015'], 'development': ['SOG-0011'], 'backlog': ['SOG-0014', 'SOG-0012', 'SOG-0013']}, 'after a reload the columns hold', what='reload')
        # ---- « Par thème »: today’s lanes, read only
        c.tap('[data-view=themes]')
        c.until("document.querySelectorAll('[data-lane]').length === 2", what='the lanes')
        c.eq([c.count('[data-priorities]'), c.js("[...document.querySelectorAll('[data-lane]')].map(l => l.dataset.lane)")], [0, ['fuel', 'data']], '« Par thème »: the lanes of today, no column', what='themes')
        n = len(written() or {})
        c.page.locator('[data-lane=data] [data-id="SOG-0013"]').evaluate("el => el.scrollIntoView({ block: 'center' })")
        a = c.page.locator('[data-lane=data] [data-id="SOG-0013"]').bounding_box()
        c.page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 8)
        c.page.mouse.down()
        c.page.mouse.move(a['x'] + a['width'] / 2 + 12, a['y'] + 60, steps=6)
        c.page.mouse.up()
        c.wait(800)
        c.eq(c.js("document.querySelectorAll('[data-lane] [data-drag]').length"), 0, 'no drag in « Par thème »', what='no drag')
        c.eq(len(written() or {}), n, 'nothing written by a gesture in the read-only view', what='nothing written')
    c.check_errors()


def _rc_fixture():
    """A frame/help/recette.json (sog-recette/1): nine new tests, one older than the last recette, one known defect, one passed, one failed, a hostile title."""
    lab = lambda fr, en: {'fr': fr, 'en': en, 'de': en + ' (de)', 'es': en + ' (es)'}
    test = lambda n, app='pilote', state='todo', since='2026-11-10', **kw: {'id': f'SOG-{n:04d}', 'app': app, 'title': lab(f'Titre {n}', f'Title {n}'), 'test': f'Aller au test {n}, faire, voir.', 'since': since, 'state': state, **kw}
    tests = [test(n) for n in range(301, 310)]
    tests[0]['title'] = lab('<img src=x onerror=window.__pwn=1>', '<img src=x onerror=window.__pwn=1>')
    tests += [test(310, 'maintenance', since='2026-11-08'), test(311, 'maintenance', 'known'), test(312, 'compagnie', 'ok', since='2026-11-09', at='2026-11-09T18:00:00Z'),
              test(313, 'compagnie', 'ko', since='2026-11-09', at='2026-11-09T18:05:00Z', comment='le bouton reste gris')]
    return {'schema': 'sog-recette/1', 'generated': {'tool': 'tools/recette_build.py', 'at': '2026-11-10', 'tests': len(tests), 'verdicts': 2}, 'apps': ['pilote', 'compagnie', 'maintenance', 'stats'], 'tests': tests}


@case('A115', 'The Recette screen (SOG-0167): the functional tests of the delivered cards, the day\u2019s first, seven visible; « Validé » / « Refusé » with a comment (required for a refusal), written by the launcher in RECETTE.json, kept on the device « not sent » otherwise; a known defect says « do not retest »', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0167: the user needs a list of daily manual tests with his comments and a passed / failed status; the launcher verb recette/verdict (same path and bounds as roadmap/priorities) writes organisation/RECETTE.json; a refusal without comment is not sent; a defect already known is said on its test so that it is not reported twice')
def a115(c):
    import tempfile
    from pathlib import Path
    lang = c.lang
    T = lambda k: tx('frame/help/recette.js', k, lang, after='const T = {')
    fx = _rc_fixture()
    c.context.route(re.compile(r'/frame/help/recette\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'organisation').mkdir()
        f = root / 'organisation' / 'RECETTE.json'
        # the launcher's file already holds the two verdicts of the generated list (it is what the list was generated from)
        f.write_text(json.dumps({'schema': 'sog-recette/1', 'updated': '2026-11-09T18:05:00Z', 'items': {'SOG-0312': {'verdict': 'ok', 'at': '2026-11-09T18:00:00Z'}, 'SOG-0313': {'verdict': 'ko', 'comment': 'le bouton reste gris', 'at': '2026-11-09T18:05:00Z'}}}), encoding='utf-8')
        written = lambda: json.loads(f.read_text(encoding='utf-8'))['items'] if f.exists() else None
        st = _prio_launcher(c, root, verb=('recette', 'verdict'))
        open_ = lambda: (c.open('recette', docs=LEVEL3), c.until("!!document.querySelector('[data-section=today] li[data-id]')", timeout=15000, what='the tests'))
        ids = lambda sec: c.js("(k) => [...document.querySelectorAll('[data-section=\"' + k + '\"] li[data-id]')].map(l => l.dataset.id)", sec)
        open_()
        # ---- the sections: the day\u2019s first, seven visible, the rest behind a button; the older, the known and the seen folded
        c.shot(f'A115_recette_{c.width}_{lang}.png')
        c.eq(len(ids('today')), 7, 'nine new tests: seven visible', what='seven')
        c.eq(norm(c.text('[data-more=today]')), norm(T('more').replace('{n}', '2')), 'then « Voir les 2 autres »', what='more')
        c.eq([c.count('[data-section=older]'), c.count('[data-section=known]'), c.count('[data-section=seen]')], [1, 1, 1], 'the older, the known and the seen are sections', what='sections')
        c.eq(c.js("[...document.querySelectorAll('details[data-section]')].map(d => d.open)"), [False, False, False], 'folded', what='folded')
        c.eq(norm(c.text('[data-summary]')), norm(T('summary').replace('{a}', '10').replace('{b}', '1').replace('{c}', '1').replace('{d}', '1')), 'the summary counts them', what='summary')
        c.ok(c.count('[data-section=today] img') == 0 and c.js('window.__pwn === undefined'), 'img', 'a hostile title is text')
        c.js("document.querySelector('[data-section=known] summary').click()")
        c.eq([c.count('[data-section=known] [data-ok]'), norm(c.text('[data-section=known] [data-known]'))], [0, norm(T('knownLine'))], 'a known defect says « do not retest » and has no verdict button', what='known')
        # ---- a refusal without comment is not sent: the line says it
        first = ids('today')[0]
        c.tap(f'[data-ko="{first}"]')
        c.until(f"!!document.querySelector('[data-id=\"{first}\"] [data-need]')", what='the comment is asked')
        c.eq([norm(c.text(f'[data-id="{first}"] [data-need]')), sorted(written()), len(st['posts'])], [norm(T('need')), ['SOG-0312', 'SOG-0313'], 1], 'asked for a comment; nothing is written (only the first read was made)', what='need')
        # ---- with a comment: written by the launcher, the test moves to « Déjà vus »
        c.page.fill(f'[data-comment="{first}"]', 'Le bouton reste gris')
        c.tap(f'[data-ko="{first}"]')
        pri = None
        for _ in range(40):
            pri = written()
            if pri and first in pri:
                break
            c.wait(250)
        c.eq([pri[first]['verdict'], pri[first]['comment'], bool(re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ', pri[first]['at']))], ['ko', 'Le bouton reste gris', True], 'the launcher wrote the refusal, its comment and its date', what='written ko')
        c.until(f"!document.querySelector('[data-section=today] [data-id=\"{first}\"]')", what='the test left the day\u2019s list')
        second = ids('today')[0]
        c.tap(f'[data-ok="{second}"]')
        for _ in range(40):
            pri = written()
            if pri and second in pri:
                break
            c.wait(250)
        c.eq([pri[second]['verdict'], 'comment' in pri[second]], ['ok', False], 'a validation needs no comment', what='written ok')
        c.wait(2500)    # the sends are over
        # ---- a reload: the verdicts come back from the launcher (the seen section holds the four)
        c.page.reload()
        c.until("!!document.querySelector('[data-section=today] li[data-id]')", timeout=15000, what='the screen again')
        c.until("document.querySelectorAll('[data-section=seen] li[data-id]').length === 4", timeout=15000, what='the verdicts read back')
        c.eq(sorted(ids('seen')), sorted([first, second, 'SOG-0312', 'SOG-0313']), 'after a reload the verdicts hold', what='reload')
        # ---- the launcher cannot write: the verdict stays on the device, « not sent »
        st['up'] = False
        third = ids('today')[0]
        c.tap(f'[data-ok="{third}"]')
        c.until(f"document.querySelector('[data-id=\"{third}\"] [data-unsent]')", what='« not sent » on the test')
        local = c.until_doc('device/recette.json', lambda d: d and d.get('pending') and d.get('unsent'), what='kept on the device')
        c.eq([local['unsent'], local['pending'][third]['verdict']], [[third], 'ok'], 'kept in device/recette.json', what='local')
        # ---- « Remettre à tester » takes a verdict back
        st['up'] = True
        c.js("document.querySelector('[data-section=seen]').open = true")
        c.tap(f'[data-redo="{second}"]')
        c.until(f"!!document.querySelector('[data-section=today] [data-id=\"{second}\"], [data-section=older] [data-id=\"{second}\"]')", what='back to test')
        c.eq(c.count(f'[data-section=seen] [data-id="{second}"]'), 0, 'taken back: the test is to do again', what='redo')

@case('A116', 'The V2 pages are one last entry « Old pages (V2) » of every application, nothing from V2 among the V3 entries; the entry opens the pages by group, each in a new tab', 'A',
      designs=('standard',), night=False, langs4=True,
      rule='SOG-0166 / V3_SPECIFICATION 7.1 rule 23 (V3 Frame): one entry « Old pages (V2) » at the very bottom of the navigation column of each application, a hairline above and a muted tint; on a phone, the last row of the application menu; it opens #legacy, the V2 pages by group (Fuel, Missions, Maintenance, Route, Statistics, Canadair), each in a new tab; no V2 page anywhere else in the navigation')
def a116(c):
    sj = ROOT / 'frame' / 'legacy.js'
    groups = ['fuel', 'missions', 'maintenance', 'route', 'stats', 'canadair']
    title = {'fr': 'Anciennes pages (V2)', 'en': 'Old pages (V2)', 'de': 'Alte Seiten (V2)', 'es': 'Páginas antiguas (V2)'}[c.lang]   # written here: the case fails while a text key is wrong
    for app in (None, 'company', 'maintenance'):
        c.open('fuel' if app is None else ('missions' if app == 'company' else 'data'), app=app, docs=LEVEL3, wait=False)
        c.until("!!document.querySelector('#fView > *')", timeout=20000, what=f'the application {app or "pilot"} is drawn')
        if c.phone:
            c.tap('#fApp')
            c.until("!!document.querySelector('.f-tabpop .f-legacy')", what='the application menu')
            rows = c.js("[...document.querySelectorAll('.f-tabpop > *')].map(r => r.className.includes('f-legacy'))")
            c.eq([rows[-1], rows.count(True)], [True, 1], 'on a phone the last row of the application menu is the V2 pages, and only one', what=f'phone menu ({app})')
            c.tap('.f-tabpop .f-legacy')
        else:
            items = c.js("[...document.querySelectorAll('#fMenu li')].map(li => [li.className, li.querySelector('a').getAttribute('href')])")
            c.eq([items[-1][0], items[-1][1]], ['f-legacy', '#legacy'], 'the last entry of the column is « Old pages (V2) »', what=f'last entry ({app})')
            c.eq(len([i for i in items if '/apps/' in i[1] or i[1].endswith('.html')]), 0, 'no V2 page among the entries', what=f'V2 hrefs in the column ({app})')
            c.ok(c.js("getComputedStyle(document.querySelector('#fMenu li.f-legacy')).borderTopWidth") != '0px', '', 'a hairline above the entry')
            c.tap('#fMenu li.f-legacy a')
        c.until("!!document.querySelector('[data-screen=legacy]')", timeout=10000, what='the V2 pages screen')
        c.eq(c.js("[...document.querySelectorAll('[data-screen=legacy] [data-group]')].map(g => g.dataset.group)"), groups, 'the six groups', what=f'groups ({app})')
        links = c.js("[...document.querySelectorAll('[data-screen=legacy] a[data-legacy]')].map(a => [a.target, a.rel, new URL(a.href).pathname])")
        c.ok(len(links) >= 20 and all(t == '_blank' and 'noopener' in r and '/apps/' in h for t, r, h in links), str(links[:3]), 'every V2 page opens in a new tab, noopener')
        c.eq(c.text('[data-screen=legacy] h1'), title, 'the title says what it is', what=f'title ({app})')
        # the pelican sites tool (SOG-0083) is the Canadair group; the fire reports are under Missions
        peli = c.js("[...document.querySelectorAll('[data-screen=legacy] [data-group=canadair] a[data-legacy]')].map(a => new URL(a.href).pathname.replace(/^.*\/apps\//, 'apps/'))")
        fire = c.js("[...document.querySelectorAll('[data-screen=legacy] [data-group=missions] a[data-legacy]')].map(a => new URL(a.href).pathname.replace(/^.*\/apps\//, 'apps/')).filter(p => /FIRE/.test(p))")
        c.eq((peli, fire), (['apps/outils/pelicandromes/index.html'], ['apps/cr/FIRE/fire_cr.html', 'apps/cr/FIRE/fire_reporting.html']),
             'the Canadair group carries the pelican sites tool, the fire reports are under Missions', what=f'Canadair group ({app})')
    # the tool: the user's file kept as it came (original.html, not linked), index.html the adapted copy (MapLibre and js-yaml from the repository, the launcher's content
    # policy blocking the CDN scripts), calling only the vector tiles and the satellite tiles (SOG-0083; DECISIONS)
    d = ROOT / 'apps' / 'outils' / 'pelicandromes'
    orig, tool = (d / 'original.html').read_text(encoding='utf-8'), (d / 'index.html').read_text(encoding='utf-8')
    hosts = lambda t: sorted(set(re.findall(r'https://([a-z0-9.-]+)/', t)) - {'www.w3.org'})
    c.eq(hosts(orig), ['cdn.jsdelivr.net', 'server.arcgisonline.com', 'tiles.openfreemap.org', 'unpkg.com'], 'the original is kept as it came: it calls the CDN libraries, the vector tiles and the satellite tiles', what='original hosts')
    c.eq(hosts(tool), ['server.arcgisonline.com', 'tiles.openfreemap.org'], 'the page opened takes MapLibre and js-yaml from the repository: only the tiles are called', what='tool hosts')
    if c.width == 1280 and c.lang == 'fr':
        c.context.route(re.compile(r'^https://'), lambda r: r.abort())     # nothing outside: the libraries must be the repository's
        c.page.goto(f'{c.base}/apps/outils/pelicandromes/index.html', wait_until='load')
        c.until("typeof maplibregl === 'object' && typeof jsyaml === 'object'", timeout=15000, what='MapLibre and js-yaml from the repository')
        c.until("document.querySelectorAll('#list .item').length > 20", timeout=10000, what='the list of sites')
        with c.page.expect_download() as dl:
            c.page.click('#export')
        out = Path(dl.value.path()).read_text(encoding='utf-8')
        c.ok(dl.value.suggested_filename == 'pelicandromes_positions.yaml' and out.startswith('schema: pelicandromes') and 'LFTW' in out, out[:80], 'the YAML export produces its file')
        c.page.evaluate("() => document.dispatchEvent(new SecurityPolicyViolationEvent('securitypolicyviolation', { blockedURI: 'https://server.arcgisonline.com/x', violatedDirective: 'connect-src' }))")
        c.eq(c.js("() => !document.getElementById('satnote').hidden"), True, 'a blocked satellite background says it in one line, beside the choice', what='satellite note')
    c.check_errors()


@case('A117', 'The version served is readable (SHA and time of the commit) and a page older than the launcher says so, with the way out', 'A', designs=('standard',),
      screens=False, night=False, langs4=True,
      rule='SOG-0168 (V3 Frame): the Status block gives the version of the suite with the time of its commit; when the stamp the launcher puts on frame/app.js today is not the one this page loaded with, one line says « this page is older than the launcher: reload » and a tap reloads; with no stamp from the launcher, or the same one, nothing is said')
def a117(c):
    ver = {'version': '6.0.0-alpha.5-3-g0a1b2c3', 'date': '2026-11-10', 'time': '09:40', 'web': 'https://framagit.org/asr/flight_planner'}
    stale = {'fr': 'Cette page est plus ancienne que le lanceur : recharger', 'en': 'This page is older than the launcher: reload',
             'de': 'Diese Seite ist älter als der Starter: neu laden', 'es': 'Esta página es más antigua que el lanzador: recargar'}[c.lang]
    state = {'app': 'abcd1234'}

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url).path
        body = {'server': True, 'data': False, 'dataGit': False, 'host': 'TEST', 'lan': False, 'lnm': [], 'version': ver,
                **({'app': state['app']} if state['app'] else {})} if u.endswith('/__setup/status') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    # the page served is the one the case writes: no service worker here (its copy would answer a navigation before the network route does)
    c.page.add_init_script("Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined })")
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    # the page loaded with another stamp than the launcher's today: the line, last but the version
    c.open('settings', docs=LEVEL3, wait=False)
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]')", timeout=15000, what='the version line')
    keys = c.js("[...document.querySelectorAll('[data-card=\"status\"] li[data-k]')].map(l => l.dataset.k)")
    c.eq(keys[-2:], ['stale', 'version'], 'the stale line comes before the version, the version stays the last line', what='lines')
    c.ok(norm(stale) in norm(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"stale\"]').textContent")), '', 'the line says the page is older than the launcher')
    c.eq(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"stale\"] [data-go]')?.dataset.go"), 'reload', 'a tap reloads', what='go')
    text = norm(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]').textContent"))
    c.ok(text.startswith('SOG 6.0.0-alpha.5-3-g0a1b2c3 · ') and text.endswith(' 09:40'), text, 'the version gives the SHA and the time of the commit')
    # no stamp from the launcher (an older launcher): nothing is said
    state['app'] = ''
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]')", timeout=15000, what='the version line again')
    c.eq(c.count('[data-card="status"] li[data-k="stale"]'), 0, 'a launcher that gives no stamp: nothing is said', what='no stamp')
    # the same stamp as the page: nothing is said (the page is served with the stamp the launcher puts today)
    own = 'abcd1234'
    state['app'] = own
    page = (ROOT / 'frame' / 'index.html').read_text(encoding='utf-8')
    c.context.route(re.compile(r'/frame/index\.html'), lambda r: r.fulfill(status=200, content_type='text/html', body=page.replace('app.js?v=0', f'app.js?v={own}')))
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"version\"]')", timeout=15000, what='the version line, same stamp')
    c.eq(c.count('[data-card="status"] li[data-k="stale"]'), 0, 'the same stamp as the launcher: nothing is said', what='same stamp')
    c.check_errors()


@case('A118', 'The « Old version · Reload » cartouche in the header: square, white on the alert red, only when the page is older than the launcher (or a next version is ready); absent, it takes nothing and the header does not move', 'A',
      designs=('standard',), night=False, langs4=True,
      rule='SOG-0168 + Simplification 10 Nov (the user: « un petit label blanc sur cartouche rouge sombre », not a banner: a banner pushes the screen, rule 22): a small square-cornered cartouche beside the sync button, white text on the design’s alert red (contrast AA), « Old version · Reload », a tap reloads; shown only when the page is older than the launcher (or the next version is ready on a device without launcher); hidden otherwise, no reserved place, the header keeps its height')
def a118(c):
    label = {'fr': 'Version ancienne · Recharger', 'en': 'Old version · Reload', 'de': 'Alte Version · Neu laden', 'es': 'Versión antigua · Recargar'}[c.lang]
    state = {'app': 'abcd1234'}

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url).path
        body = {'server': True, 'data': False, 'dataGit': False, 'host': 'TEST', 'lan': False, 'lnm': [], **({'app': state['app']} if state['app'] else {})}             if u.endswith('/__setup/status') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    info = """() => { const e = document.getElementById('fStale'), cs = getComputedStyle(e), h = document.querySelector('.f-head').getBoundingClientRect().height,
      d = document.documentElement; const rgb = x => (x.match(/\d+/g) || []).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) };
      const L1 = lum(rgb(cs.color)), L2 = lum(rgb(cs.backgroundColor));
      return { shown: e.getClientRects().length > 0, text: e.textContent, radius: cs.borderTopLeftRadius, color: cs.color, h, tall: Math.round(e.getBoundingClientRect().height),
        contrast: +((Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05)).toFixed(2), overflow: d.scrollWidth > d.clientWidth } }"""
    # the page is older than the launcher
    c.open('settings', docs=LEVEL3, wait=False)
    c.until("document.getElementById('fStale') && !document.getElementById('fStale').hidden", timeout=15000, what='the cartouche')
    on = c.js(info)
    short = {'fr': 'Recharger', 'en': 'Reload', 'de': 'Neu laden', 'es': 'Recargar'}[c.lang]
    c.eq((on['shown'], norm(on['text']) in (norm(label), norm(short), ''), on['radius'], on['color']), (True, True, '0px', 'rgb(255, 255, 255)'),
         'a square cartouche, its label (whole, or shortened when the header is tight: A122), white text', what='cartouche')
    c.eq(norm(c.js("document.getElementById('fStale').getAttribute('aria-label')")), norm(label), 'the whole label stays in aria-label', what='aria-label')
    c.ok(on['contrast'] >= 4.5, str(on['contrast']), 'white on the alert red: contrast AA (4.5)')
    c.ok(on['tall'] <= 40 and not on['overflow'], str(on), 'small, and the page does not scroll sideways')
    c.js("() => { window.__survives = 1 }")
    c.tap('#fStale')
    c.until("window.__survives === undefined", timeout=15000, what='a tap reloads the page')
    # the same stamp as the launcher: absent, the header the same height (nothing reserved)
    state['app'] = ''
    c.page.reload(wait_until='load')
    c.until("!!document.getElementById('fSync')", timeout=15000, what='the header')
    c.wait(600)
    off = c.js(info)
    c.eq(off['shown'], False, 'without a stamp, the cartouche is absent and takes nothing', what='absent')
    c.eq(off['h'], on['h'], 'the header does not change height', what='header height')
    # no launcher, a next version ready (the service worker says so): the same cartouche, and a tap takes the version
    c.js("() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { type: 'sog-frame-update' } }))")
    c.until("!document.getElementById('fStale').hidden", timeout=10000, what='the cartouche for a ready version')
    c.eq(c.js("document.getElementById('fStale').dataset.go"), 'update', 'a ready version: the cartouche takes it', what='ready version')
    c.eq(c.js(info)['h'], on['h'], 'the header still does not change height', what='header height with the cartouche')

@case('A119', 'The « Sources et licences » page (SOG-0162): in Maintenance, one line per catalogue source with its publisher, licence, date and, for X-Plane and EUROCONTROL, « read on this workstation only »', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0162 (the user, 10 Nov 2026): « tu collectes bien toutes les licences et les sources, dans la page ad hoc »; the guard: what is proprietary (X-Plane, EUROCONTROL) stays read on this workstation and never enters the published base nor an export, box ticked or not — the page says it per source')
def a119(c):
    lang = c.lang
    T = lambda k: tx('frame/aerodb/sources.js', k, lang, after='const T = {')
    c.open('sources', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-screen=sources] li[data-src]')", timeout=20000, what='the page in Maintenance')
    c.eq(norm(c.text('[data-screen=sources] h1')), norm(T('title')), 'the page is titled « Sources et licences »', what='title')
    ids = re.findall(r"^\s{4}id: '([a-z0-9_]+)',", (ROOT / 'frame/aerodb/catalogue.js').read_text(encoding='utf-8'), re.M)
    rows = c.js("""() => [...document.querySelectorAll('[data-screen=sources] li[data-src]')].map(li => ({ id: li.dataset.src, pub: !!li.querySelector('[data-pub]'), lic: !!li.querySelector('[data-lic]'),
      local: !!li.querySelector('[data-local-only]'), text: li.textContent.replace(/\\s+/g, ' ').trim() }))""")
    c.eq(sorted(r['id'] for r in rows), sorted(ids), 'one line per source of the catalogue', what='lines')
    c.ok(all(r['pub'] and r['lic'] for r in rows), [r['id'] for r in rows if not (r['pub'] and r['lic'])], 'every line says its publisher and its licence')
    cat = (ROOT / 'frame/aerodb/catalogue.js').read_text(encoding='utf-8')
    local = sorted(i for i, flag in re.findall(r"^\s{4}id: '([a-z0-9_]+)',.*?localOnly: (true|false)", cat, re.M | re.S) if flag == 'true')   # read from the catalogue: the case no longer breaks at each source added (Naviair, SOG-0162)
    c.ok(len(local) >= 4 and 'xpcifp' in local and 'eurocontrol' in local, local, 'the catalogue names X-Plane and EUROCONTROL as read on this workstation only (guard)')
    c.eq(sorted(r['id'] for r in rows if r['local']), local, 'every source the catalogue marks localOnly says « read on this workstation only »; no other', what='local only')
    acc = c.js("[...document.querySelectorAll('[data-screen=sources] li[data-src]')].filter(li => li.querySelector('[data-account] a')).map(li => [li.dataset.src, li.querySelector('[data-account] a').getAttribute('href')]).sort()")
    c.eq(acc, [['eurocontrol', 'https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/ead-solutions/ead-basic'], ['eurocontrol_rad', 'https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/ead-solutions/ead-basic']], 'the EUROCONTROL sources say where to register (SOG-0237): the EAD Basic page, in a link, on those two lines only', what='account lines')
    sia = next(r for r in rows if r['id'] == 'sia')
    c.ok(norm(T('pub').split('{p}')[0]) in norm(sia['text']) and 'SIA France' in sia['text'], sia['text'][:160], 'the publisher is the start of the name when the catalogue gives none')
    c.ok(norm(T('date').split('{d}')[0]) in norm(sia['text']), sia['text'][:200], 'a dated source (the AIRAC cycle) says its date')
    c.check_errors()


@case('A120', 'Settings › Administration: no direct button to a V2 page (Maintenance V2, First launch, Map studio) even with a launcher: they live in the « Anciennes pages (V2) » screen (SOG-0166)', 'A',
      designs=('standard',), screens=False, night=False,
      rule='SOG-0166 (the user: « je passe mon temps à cliquer dessus par erreur »): the three V2 buttons of the Administration card are gone; #legacy lists them; a launcher no longer brings them back')
def a120(c):
    full = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    c.context.route(re.compile(r'/__setup/status'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(full)))
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"]')", timeout=15000, what='the Administration card')
    c.wait(600)
    ids = c.js("[...document.querySelectorAll('[data-card=\"admin\"] li[data-admin]')].map(li => li.dataset.admin)")
    c.ok(len(ids) > 0 and not any(k in ids for k in ('maintenance', 'firstLaunch', 'mapStudio')), f'entries {ids}', 'with a launcher the card still carries no V2 page button')
    c.eq(c.count('[data-card="admin"] a[href*="apps/settings/"], [data-card="admin"] a[href*="apps/cpco/"]'), 0, 'no link to a page of apps/ in the card', what='no V2 link')
    c.check_errors()


@case('A121', 'The tree of data/ is read from IndexedDB a handful of times per load, not dozens (each read clones the whole tree)', 'A', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0169 (V3 Frame, BUGS SOG’s trace of the Map alone on the user’s launcher: 1.3 s in the IndexedDB request callback, 10 339 files): the meta « remote » (head and tree of data/) is kept in memory and written through, so a load reads it from IndexedDB a few times instead of about fifty; what a pass learns is still seen (a change at the other end arrives)')
def a121(c):
    state = {'head': 'h1', 'name': 'Air One'}
    big = {f'fake/f{i}.json': f'r{i}' for i in range(3000)}

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url)
        if u.path.endswith('/__setup/changes'):
            since = urllib.parse.parse_qs(u.query).get('since', [''])[0]
            body = {'same': True, 'head': state['head']} if since == state['head'] else {'head': state['head'], 'tree': {**big, 'airline/settings.json': 'rs-' + state['name']}}
        elif u.path.endswith('/__setup/status'):
            body = {'server': True, 'data': True, 'dataGit': True, 'host': 'TEST', 'lan': False, 'lnm': []}
        else:
            body = {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

    def data(route):
        if route.request.url.endswith('/data/airline/settings.json'):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'name': state['name']}))
        route.fulfill(status=404, body='')
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.unroute(re.compile(r'/data/airline/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.context.route(re.compile(r'/data/airline/'), data)
    c.page.add_init_script("""(() => { window.__remoteReads = 0; const o = IDBObjectStore.prototype.get; IDBObjectStore.prototype.get = function (k) {
      if (this.name === 'meta' && k === 'remote') window.__remoteReads++; return o.apply(this, arguments) } })()""")
    c.open('flightlog', flight=False, wait=False)
    c.page.wait_for_function("() => window.FrameData && window.FrameData.status", timeout=20000)
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air One')", timeout=20000)
    c.wait(2500)
    c.page.reload(wait_until='load')          # a second load: the tree is known
    c.page.wait_for_function("() => window.FrameData && window.FrameData.status", timeout=20000)
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air One')", timeout=20000)
    c.wait(3000)
    n = c.js('window.__remoteReads')
    c.ok(n <= 8, f'{n} reads of the tree from IndexedDB', 'a load reads the head and tree of data/ from IndexedDB a handful of times (it was about fifty, each a structured clone of the whole tree)')
    # what the pass learns is still seen: a change at the other end arrives
    state['head'], state['name'] = 'h2', 'Air Two'
    c.page.reload(wait_until='load')
    c.page.wait_for_function("() => window.FrameData && window.FrameData.status", timeout=20000)
    c.page.wait_for_function("() => FrameData.airline().then(a => a.name === 'Air Two')", timeout=20000)
    c.check_errors()


@case('A122', 'The « Old version » cartouche has its own cell: with a long sync state and the cartouche present, no rectangle of the header cuts another, at 390, 768 and 1280', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0168, the user’s refusal of 10 Nov (« le cartouche rouge est mal placé, le texte déborde largement »; the capture: the cartouche and the sync button on one another): the cartouche is a cell of the header that never covers a neighbour; when there is not enough room it shrinks by steps — the whole label, « Reload », a square dot (the label stays in its tooltip and aria-label); square, white on the dark red, one line')
def a122(c):
    short = {'fr': 'Recharger', 'en': 'Reload', 'de': 'Neu laden', 'es': 'Recargar'}[c.lang]
    full = {'fr': 'Version ancienne · Recharger', 'en': 'Old version · Reload', 'de': 'Alte Version · Neu laden', 'es': 'Versión antigua · Recargar'}[c.lang]
    # the longest sync state (« Offline · 11 pending »): the layer says eleven writes wait, the device is offline
    c.page.add_init_script("""(() => { let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set(v) {
      if (v && typeof v.status === 'function' && !v.__w) { v.__w = 1; const st = v.status, on = v.onStatus;
        v.status = async () => ({ ...(await st.apply(v)), transport: 'github', syncing: false, online: false, lastError: '', conflicts: 0, pending: 11, queue: [] }); v.onStatus = fn => on.call(v, s => fn({ ...s, transport: 'github', syncing: false, online: false, lastError: '', conflicts: 0, pending: 11, queue: [] })) }
      fd = v } }) })()""")
    state = {'app': 'abcd1234'}

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url).path
        body = {'server': True, 'data': False, 'dataGit': False, 'host': 'TEST', 'lan': False, 'lnm': [], 'app': state['app']} if u.endswith('/__setup/status') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings', docs=LEVEL3, wait=False)
    c.until("document.getElementById('fStale') && !document.getElementById('fStale').hidden", timeout=15000, what='the cartouche')
    c.until("/11/.test(document.querySelector('#fSync .f-lbl').textContent)", timeout=15000, what='the long sync state')
    probe = """() => { const head = document.querySelector('.f-head'), e = document.getElementById('fStale');
      const boxes = [...head.children].filter(x => !x.hidden && x.getClientRects().length).map(x => [x.id || x.className, x.getBoundingClientRect()]);
      const clash = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i][1], b = boxes[j][1];
        if (a.left < b.right - .5 && b.left < a.right - .5 && a.top < b.bottom - .5 && b.top < a.bottom - .5) clash.push(boxes[i][0] + ' / ' + boxes[j][0]) }
      const cs = getComputedStyle(e); const d = document.documentElement;
      const nm = document.getElementById('fName'), cut = [...head.children].filter(x => x !== e && !x.hidden && x.getClientRects().length && x.scrollWidth > x.clientWidth + 1).map(x => x.id || x.className);
      return { clash, cut, nameCut: !!nm && nm.scrollWidth > nm.clientWidth + 1, tier: e.dataset.tier, text: e.textContent, clipped: (() => { const g = document.createRange(); g.selectNodeContents(e); return g.getBoundingClientRect().width > e.getBoundingClientRect().width + 1 })(), overflow: head.scrollWidth > head.clientWidth + 1 || d.scrollWidth > d.clientWidth,
        radius: cs.borderTopLeftRadius, color: cs.color, nowrap: cs.whiteSpace, label: e.getAttribute('aria-label'), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) } }"""
    for width in (390, 768, 1280):
        c.page.set_viewport_size({'width': width, 'height': 900})
        c.wait(900)
        r = c.js(probe)
        if c.lang == 'fr' and width in (390, 768, 1280):      # the capture of the header (read by the ergonomics session)
            (ROOT / 'tests' / 'v3' / 'shots').mkdir(parents=True, exist_ok=True)
            c.page.screenshot(path=str(ROOT / 'tests' / 'v3' / 'shots' / f'A122_header_{width}.png'), clip={'x': 0, 'y': 0, 'width': width, 'height': 72})
        c.eq(r['clash'], [], f'at {width}: no rectangle of the header cuts another', what=f'overlaps at {width}')
        c.eq((r['cut'], r['nameCut']), ([], False), f'at {width}: no neighbour has its text cut, the application name is whole', what=f'cut texts at {width}')
        c.ok(not r['clipped'] and not r['overflow'], str(r), f'at {width}: the cartouche is not cut and the header does not overflow')
        c.ok(r['tier'] in ('0', '1', '2') and r['text'] == [full, short, ''][int(r['tier'])], str(r), f'at {width}: the cartouche shows its whole label, « {short} », or a dot')
        c.eq((r['radius'], r['color'], r['nowrap']), ('0px', 'rgb(255, 255, 255)', 'nowrap'), 'square corners, white text, one line', what=f'look at {width}')
        c.ok(bool(r['label']) and full in r['label'], str(r['label']), 'the label stays in aria-label whatever the step')
    # the steps themselves: a narrow header takes the dot, a wide one the whole label
    c.page.set_viewport_size({'width': 250, 'height': 900})
    c.wait(900)
    narrow = c.js(probe)
    c.page.set_viewport_size({'width': 1280, 'height': 900})
    c.wait(900)
    wide = c.js(probe)
    c.ok(wide['tier'] == '0' and int(narrow['tier']) > 0, f"wide {wide['tier']}, narrow {narrow['tier']}", 'a wide header shows the whole label, a narrow one a shorter step')
    c.eq(narrow['clash'], [], 'at 250: still no overlap', what='overlaps at 250')

@case('A123', 'Settings: the second drawing (the repository arrives) touches only the blocks that depend on it — the other cards and the groups keep their nodes; the layout shift stays under 0.1 with a slow launcher (SOG-0172)', 'A', tags=('settings',), designs=('standard',), screens=True, night=False,
      rule='SOG-0172 (« retour des clignotements sur la page réglages a minima »; frame rule 22): since SOG-0133 the screen is drawn at once and drawn again when the repository arrives; the second drawing replaced the whole screen; it must replace only the blocks whose HTML changed (access, usages, administration), keeping every other node and the open groups')
def a123(c):
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    remote = {'repo': True, 'remote': 'origin', 'url': 'https://example.test/acme/data.git', 'branch': 'main', 'state': 'repo', 'default': ''}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/sync-remote') and route.request.method == 'GET':
            body = remote
        elif path.endswith('/__setup/secrets'):
            body = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}}, 'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.page.add_init_script(CLS_PROBE)
    c.page.add_init_script("""(() => { const f = window.fetch; window.fetch = function (u, o) { const url = String((u && u.url) || u); const slow = /sync-remote/.test(url) && (!o || !o.method || o.method === 'GET');
      return slow ? new Promise(ok => setTimeout(ok, 1500)).then(() => f.apply(this, arguments)) : f.apply(this, arguments) } })()""")
    c.open('settings', docs=LEVEL3)
    c.until("document.querySelectorAll('[data-card]').length > 6 && !!document.querySelector('[data-git-line][aria-busy=true]')", timeout=10000, what='the first drawing, the repository still pending')
    tagged = c.js("""() => { window.__tag = []; document.querySelectorAll('[data-card], details.f-group').forEach((e, i) => { e.__id = i; window.__tag.push(e) }); return window.__tag.length }""")
    c.ok(tagged >= 8, tagged, 'the first drawing has its cards and its groups')
    c.js("() => { window.__cls.value = 0; window.__cls.items = [] }")   # the arrival of the repository is what is measured: the shifts of the opening itself are A110’s
    c.until("(performance.getEntriesByName('sog-settings-start').length >= 2) && !!document.querySelector('[data-card=\"remote\"]')", timeout=10000, what='the screen is drawn a second time with the repository')
    c.wait(300)
    res = c.js("""() => { const dep = new Set(['access', 'usages', 'admin', 'remote', 'hist', 'assistant', 'keys', 'ead', 'update', 'folders', 'ivaoapp']);   // the Administration card and its panels, the cards that read the repository
      const lost = window.__tag.filter(e => !dep.has(e.dataset.card) && !e.isConnected).map(e => e.dataset.card || 'group:' + e.dataset.group);
      const still = window.__tag.filter(e => !dep.has(e.dataset.card) && e.isConnected).length;
      const changed = window.__tag.filter(e => dep.has(e.dataset.card) && !e.isConnected).map(e => e.dataset.card);
      return { lost, still, changed, renders: performance.getEntriesByName('sog-settings-start').length } }""")
    c.ok(not res['lost'] and res['still'] >= 6, res, 'the cards that do not depend on the repository and the groups kept their nodes through the second drawing')
    cls = c.js('window.__cls')
    c.ok(cls['value'] < 0.1, cls, 'the cumulative layout shift stays under 0.1 (rule 22)')
    c.check_errors()


@case('A124', 'The Recette screen: a test delivered again after its verdict goes back to « à tester », first, and says why; a later verdict is in force again', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0167 (the user: « Je ne vois pas de màj de la page de recette, normal ? »: eleven refused tests delivered again stayed « Refusé »): a verdict older than the card’s last delivery (`delivered`) is not in force, whichever file it comes from (generated, the device’s, the launcher’s); the test returns to « à tester », the day’s section, first of its application, with one line above the buttons — « Relivré depuis votre refus du <date> : « <comment> » » (or « validation »); a verdict later than `delivered` is in force as usual; the summary counts it as to test; `delivered` and `previous` are untrusted (format checked, bounded)')
def a124(c):
    lang = c.lang
    lab = lambda n: {'fr': f'Titre {n}', 'en': f'Title {n}', 'de': f'Titel {n}', 'es': f'Título {n}'}
    mk = lambda n, **kw: {'id': f'SOG-{n:04d}', 'app': 'pilote', 'title': lab(n), 'test': f'Aller au test {n}, faire, voir.', 'since': '2026-11-09', 'state': 'todo', **kw}
    D = '2026-11-10T09:30:00Z'
    tests = [
        mk(500),                                                                                       # a plain new test
        mk(501, state='ko', at='2026-11-10T08:00:00Z', comment='le bouton reste gris', delivered=D),    # generated: refused, delivered again after
        mk(502, delivered=D, previous={'verdict': 'ko', 'comment': 'texte coupé', 'at': '2026-11-10T07:00:00Z'}),   # what the generator says
        mk(503, state='ko', at='2026-11-10T10:00:00Z', comment='toujours gris', delivered=D),          # refused AFTER the delivery: still refused
        mk(504, state='ok', at='2026-11-09T18:00:00Z', delivered=D),                                   # passed, delivered again after
        mk(505, delivered=D),                                                                          # the device holds an older refusal
        mk(506, delivered=D),                                                                          # the device holds a later pass
        mk(507, delivered='javascript:alert(1)', previous={'verdict': 'ko', 'comment': '<img src=x onerror=window.__pwn=1>', 'at': 'nope'}),  # hostile
        mk(508, app='maintenance', delivered=D, previous={'verdict': 'ko', 'comment': 'x' * 900, 'at': '2026-11-10T06:00:00Z'}),
    ]
    doc = {'schema': 'sog-recette/1', 'generated': {'tool': 'tools/recette_build.py', 'at': '2026-11-10', 'tests': len(tests), 'verdicts': 3},
           'apps': ['pilote', 'compagnie', 'maintenance', 'stats'], 'tests': tests}
    c.context.route(re.compile(r'/frame/help/recette\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(doc)))
    store = {'pending': {'SOG-0505': {'verdict': 'ko', 'comment': 'cassé hier', 'at': '2026-11-10T07:00:00Z'}, 'SOG-0506': {'verdict': 'ok', 'at': '2026-11-10T12:00:00Z'}},
             'unsent': [], 'open': {}}
    c.open('recette', docs=LEVEL3 + [['device/recette.json', store, 'cache']], wait=False)
    c.until("!!document.querySelector('[data-section=today] li[data-id]')", timeout=15000, what='the tests')
    c.shot(f'A124_recette_{c.width}_{lang}.png')
    why = lambda i: c.js("(i) => document.querySelector('[data-id=\"' + i + '\"] [data-redelivered]')?.textContent || null", i)
    state = lambda i: c.js("(i) => document.querySelector('[data-id=\"' + i + '\"]')?.dataset.state || null", i)
    sec = lambda i: c.js("(i) => document.querySelector('[data-id=\"' + i + '\"]')?.closest('[data-section]')?.dataset.section || null", i)
    rows = {
        'ko': {'fr': 'Relivré depuis votre refus du {d} : « {c} »', 'en': 'Delivered again since your failure of {d}: “{c}”',
               'de': 'Erneut geliefert seit Ihrer Ablehnung vom {d}: „{c}“', 'es': 'Entregada de nuevo desde su rechazo del {d}: «{c}»'},
        'ok': {'fr': 'Relivré depuis votre validation du {d}', 'en': 'Delivered again since your pass of {d}',
               'de': 'Erneut geliefert seit Ihrer Bestätigung vom {d}', 'es': 'Entregada de nuevo desde su validación del {d}'}}
    say = lambda k, **v: norm(rows[k][lang].format(**v))
    # a refusal older than the delivery (generated): back to test, the reason said
    c.eq([state('SOG-0501'), sec('SOG-0501'), norm(why('SOG-0501') or '')], ['todo', 'today', say('ko', d='2026-11-10', c='le bouton reste gris')],
         'a refusal older than the delivery: to test, in the day’s list, with the reason', what='0501')
    c.eq([state('SOG-0502'), norm(why('SOG-0502') or '')], ['todo', say('ko', d='2026-11-10', c='texte coupé')], 'what the generator says it replaced is said too', what='0502')
    c.eq([state('SOG-0503'), why('SOG-0503')], ['ko', None], 'a refusal later than the delivery stays « Refusé »', what='0503')
    c.eq([state('SOG-0504'), sec('SOG-0504'), norm(why('SOG-0504') or '')], ['todo', 'today', say('ok', d='2026-11-09')],
         'a validation older than the delivery: to test, « depuis votre validation »', what='0504')
    c.eq([state('SOG-0505'), norm(why('SOG-0505') or '')], ['todo', say('ko', d='2026-11-10', c='cassé hier')], 'the device’s older refusal is not in force either', what='0505')
    c.eq([state('SOG-0506'), why('SOG-0506')], ['ok', None], 'the device’s later pass is in force', what='0506')
    # the redelivered ones come first in their application
    first = c.js("[...document.querySelectorAll('[data-section=today] li[data-id]')].map(l => l.dataset.id)")
    c.ok(first[0] in ('SOG-0501', 'SOG-0502', 'SOG-0504', 'SOG-0505', 'SOG-0507'), str(first), 'a redelivered test is first of the day’s list')
    # the summary: the redelivered ones are to test
    nums = [int(x) for x in re.findall(r'\d+', c.text('[data-summary]'))]
    c.eq(nums[0], 7, 'the summary counts them as to test (7: 500, 501, 502, 504, 505, 507, 508)', what='summary to test')
    # untrusted entries: a bad `delivered` is ignored, a bad `at` dropped, a long comment bounded, nothing runs
    c.ok(c.count('[data-section=today] img') == 0 and c.js('window.__pwn === undefined'), 'img', 'a hostile comment is text')
    long = why('SOG-0508') or ''
    c.ok(0 < len(long) < 700, str(len(long)), 'a long comment is bounded')
    c.eq(state('SOG-0507'), 'todo', 'a delivered that is not a date is ignored: the test is still to test', what='0507')
@case('A125', 'Settings › Company › « Créer une compagnie » (SOG-0041, step B1): a stepper on the same screen (identity, summary), nothing written before the last button, then settings, fleet and the INDEX last; an interruption says what is done and « Reprendre » finishes without overwriting', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.38 bis (accepted by the ergonomist, 10 Nov): « Créer » is a stepper that never jumps (one block, panes shown and hidden, « Retour » keeps every value), the code is proposed from the name until touched, the kind is chosen (commercial preselected), nothing is written before « Créer la compagnie », the index is written last so an airline is listed only when complete, a failure half-way says what is done and offers « Reprendre » (never a second Create, never an overwrite)')
def a124(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    KN = lambda: c.js("import('/frame/lib/airline.js').then(m => m.KIND_NAMES)")
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document']]
    # the puts of the adapters are recorded, and the first write of the index can be made to fail (an interruption half-way)
    c.page.add_init_script("""(() => { let fd; window.__puts = []; window.__failIndex = false; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; const a = v.adapter; v.adapter = function () { const ad = a.apply(this, arguments); const put = ad.put; ad.put = async function (p) { window.__puts.push(p); if (window.__failIndex && p === 'airline/index.json') { window.__failIndex = false; throw new Error('x') } return put.apply(this, arguments) }; return ad } } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 2 && !!document.querySelector('[data-wizard]')", timeout=15000, what='the card and its stepper')
    w = lambda extra='': f'[data-wizard] {extra}'.strip()
    c.js("document.querySelector('[data-airline-add]').open = true")
    c.eq(c.js("[...document.querySelectorAll('[data-wizard] [data-step-pane]')].map(p => [p.dataset.stepPane, p.hidden])"), [['identity', False], ['themes', True], ['fleet', True], ['summary', True], ['done', True]], 'one block, the first pane shown', what='panes')
    c.eq(c.count(w('[data-step-dot]')), 4, 'four steps named in the header (identity, themes, fleet, summary)', what='dots')
    c.eq(c.js("[...document.querySelectorAll('[data-wizard] input[name=wz-kind]')].map(i => [i.value, i.checked])"), [['va', True], ['sog', False]], 'the kind: two radio buttons, commercial preselected', what='kind')
    c.eq(c.count(w('[data-wz-kind] .f-muted')), 2, 'each with its sentence', what='sentences')
    c.eq([norm(c.text(w('[data-kind-name=va]'))), norm(c.text(w('[data-kind-name=sog]')))], [norm(KN()['va'][['fr', 'en', 'de', 'es'].index(lang)]), norm(KN()['sog'][['fr', 'en', 'de', 'es'].index(lang)])], 'named by the one source of the kind words', what='kind names')
    # ---- the code is proposed from the name until it is touched
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Rennes Motoculture')
    c.eq(c.js("document.querySelector('[data-wizard] [data-f=co-code]').value"), 'rennes', 'the code is proposed from the first word of the name', what='proposed')
    c.page.fill('[data-wizard] [data-f="co-code"]', 'rmo')
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Rennes Motoculture SA')
    c.eq(c.js("document.querySelector('[data-wizard] [data-f=co-code]').value"), 'rmo', 'a code the user typed is never replaced', what='kept code')
    c.page.check('[data-wizard] [data-co-net="ivao"]')
    # ---- a refusal stays on the step and writes nothing
    c.page.fill('[data-wizard] [data-f="co-name"]', '')
    c.tap('[data-act="companyNext"]')
    c.until(f"document.querySelector('[data-wizard] [data-msg]').textContent.trim() !== ''", timeout=6000, what='a refusal')
    c.eq([norm(c.text(w('[data-msg]'))), c.js("document.querySelector('[data-wizard]').dataset.step")], [norm(T('badName')), 'identity'], 'an empty name: said, still on the identity step', what='bad name')
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Rennes Motoculture')
    # ---- the summary, in a pilot's words; nothing is written yet
    c.js("document.querySelector('[data-wizard] [data-msg]').textContent = ''")   # the refusal above is gone with the next gesture
    top = "document.querySelector('[data-airline-join]').getBoundingClientRect().top + scrollY"
    hh = "document.querySelector('[data-wizard]').getBoundingClientRect().height"
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'themes'", timeout=6000, what='the themes step')
    h_cats, below = c.js(hh), c.js(top)   # the themes pane is taller than the identity one: the block grew once
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'fleet'", timeout=6000, what='the fleet step')
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'summary'", timeout=6000, what='the summary step')
    c.ok(abs(c.js(top) - below) <= 1 and c.js(hh) >= h_cats - 1, [h_cats, below], 'the block never gets shorter from one step to the next: what is under it does not move (rule 22)')
    c.eq(norm(c.text(w('[data-wz-summary]'))), norm('Rennes Motoculture · ' + KN()['va'][['fr', 'en', 'de', 'es'].index(lang)] + ' · IVAO · ' + _noun(lang, 'theme', 1) + ' · ' + _noun(lang, 'aircraft', 0)), 'name · kind · networks · number of categories, in words (no file name)', what='summary')
    c.eq([c.doc('airline/rmo/settings.json'), c.js('window.__puts.length')], [None, 0], 'nothing is written before the last button', what='nothing written')
    if c.width in (390, 1280):
        c.shot(f'A125_standard_{c.width}_{lang}_summary_delivered.png')
    # ---- « Retour » keeps every value
    c.tap('[data-act="companyBack"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'fleet'", timeout=6000, what='back to the fleet')
    c.tap('[data-act="companyBack"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'themes'", timeout=6000, what='back to the themes')
    c.tap('[data-act="companyBack"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'identity'", timeout=6000, what='back to identity')
    c.eq([c.js("document.querySelector('[data-wizard] [data-f=co-name]').value"), c.js("document.querySelector('[data-wizard] [data-f=co-code]').value"), c.js("document.querySelector('[data-wizard] [data-co-net=ivao]').checked")], ['Rennes Motoculture', 'rmo', True], 'back keeps the name, the code and the networks', what='kept values')
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'themes'", timeout=6000, what='the themes again')
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'fleet'", timeout=6000, what='the fleet again')
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'summary'", timeout=6000, what='the summary again')
    # ---- an interruption at the index: what is done is said, « Reprendre » finishes without overwriting
    c.js('window.__failIndex = true')
    c.tap('[data-act="companyAdd"]')
    c.until("!document.querySelector('[data-act=companyResume]').hidden", timeout=8000, what='« Reprendre » offered')
    c.eq([c.js('window.__puts'), c.js("document.querySelector('[data-act=companyAdd]').hidden")], [['airline/rmo/settings.json', 'airline/rmo/fleet.json', 'airline/index.json'], True], 'settings, then the fleet, then the index (which failed): no second « Créer », only « Reprendre »', what='order and resume')
    said = norm(c.text(w('[data-msg]')))
    c.ok('rmo' not in c.js("(document.querySelector('[data-card=company] [data-airlines]').textContent)") and not any('rmo' == r for r in c.js("[...document.querySelectorAll('[data-card=company] [data-airlines] [data-airline]')].map(n => n.dataset.airline)")), said, 'the airline is not in the list yet: it is listed only when complete')
    settings = c.doc('airline/rmo/settings.json')
    c.tap('[data-act="companyResume"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'done'", timeout=8000, what='the end step')
    idx = c.until_doc('airline/index.json', lambda i: i and any(a.get('code') == 'rmo' for a in i.get('airlines', [])), what='the index lists it')
    c.eq([a['code'] for a in idx['airlines']], ['aaa', 'rmo'], 'the index keeps the others and lists the new one', what='index')
    c.eq([c.doc('airline/rmo/settings.json') == settings, c.js('window.__puts.slice(3)')], [True, ['airline/index.json']], 'the files already written were not written again: only the index', what='no overwrite')
    c.eq([settings['name'], settings['kind'], settings['networks']], ['Rennes Motoculture', 'va', {'ivao': True, 'vatsim': False, 'offline': False}], 'the settings: name, kind, networks', what='settings')
    c.eq((c.doc('airline/rmo/fleet.json') or {}).get('aircraft'), [], 'an empty fleet', what='fleet')
    c.until("document.querySelectorAll('[data-card=company] [data-airlines] [data-airline]').length === 3", timeout=8000, what='the list shows the new airline')
    # ---- the end: « Voler pour cette compagnie »
    c.tap('[data-act="companyFly"]')
    c.until("location.hash.startsWith('#missions')", timeout=8000, what='Missions')
    c.eq(_airline_code(c, 'rmo'), 'rmo', 'the new airline is the current one', what='current')
    c.check_errors()


@case('A126', 'Settings › Company › « Créer une compagnie » (SOG-0041 step B2, SOG-0202 T3): the themes of the kind are ticked in advance, themes.json is written only when the ticks differ from the kind’s default, between the settings and the fleet', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.38 bis step 2 + § 10.48 (SOG-0202 T3): the seventeen themes (frame/lib/mission_themes.js) are listed; a commercial airline comes with COMMERCIAL ticked, a squadron with the sixteen military, « Retour » keeps the ticks; themes.json is written only when the ticks differ from defaultChosen(kind) (settings, themes, fleet, index); nothing ticked differently: no file')
def a126(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document']]
    c.page.add_init_script("""(() => { let fd; window.__puts = []; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; const a = v.adapter; v.adapter = function () { const ad = a.apply(this, arguments); const put = ad.put; ad.put = async function (p) { window.__puts.push(p); return put.apply(this, arguments) }; return ad } } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 2 && !!document.querySelector('[data-wizard]')", timeout=15000, what='the card and its stepper')
    c.js("document.querySelector('[data-airline-add]').open = true")
    nxt = lambda to: (c.tap('[data-act="companyNext"]'), c.until(f"document.querySelector('[data-wizard]').dataset.step === '{to}'", timeout=6000, what=f'the {to} step'))
    pane = '[data-step-pane=themes]'
    ticked = lambda: c.js(f"[...document.querySelectorAll('{pane} [data-wz-theme]')].filter(i => i.checked).map(i => i.dataset.wzTheme)")
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Rennes Motoculture')
    nxt('themes')
    c.eq(c.count(pane + ' [data-wz-theme]'), 17, 'the seventeen themes, one box each', what='listed')
    c.eq(ticked(), ['COMMERCIAL'], 'a commercial airline: the Commercial theme ticked in advance', what='default ticked')
    c.eq(c.js(f"document.querySelector('{pane} [data-wz-theme]').dataset.wzTheme"), 'COMMERCIAL', 'COMMERCIAL first in the list shown', what='first')
    # tick one more, untick none
    c.js(f"document.querySelector('{pane} [data-wz-theme=HEMS]').click()")
    if c.width in (390, 1280):
        c.shot(f'A126_standard_{c.width}_{lang}_themes_delivered.png')
    # « Retour » keeps the ticks
    c.tap('[data-act="companyBack"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'identity'", timeout=6000, what='back')
    nxt('themes')
    c.eq(sorted(ticked()), ['COMMERCIAL', 'HEMS'], 'back and forth keeps the ticks', what='kept')
    nxt('fleet')
    nxt('summary')
    c.eq(norm(c.text('[data-wz-summary]')).split(' · ')[-2], norm(_noun(lang, 'theme', 2)), 'the summary counts the themes kept: two', what='count')
    c.eq(c.js('window.__puts.length'), 0, 'nothing is written yet', what='no put')
    c.tap('[data-act="companyAdd"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'done'", timeout=8000, what='created')
    c.eq(c.js('window.__puts'), ['airline/rennes/settings.json', 'airline/rennes/themes.json', 'airline/rennes/fleet.json', 'airline/index.json'], 'the settings, the themes, the fleet, and the index last', what='order')
    doc = c.doc('airline/rennes/themes.json')
    c.eq([doc['schema'], doc['chosen'], doc['added']], [1, ['HEMS', 'COMMERCIAL'], {'themes': [], 'series': {}}], 'themes.json: the ticked themes, in the order of the table', what='file')
    # a squadron: the sixteen military themes ticked in advance; nothing changed: no file
    c.tap('[data-act="companyStay"]')
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Escadrille Test')
    c.js("document.querySelector('[data-wizard] input[name=wz-kind][value=sog]').click()")
    nxt('themes')
    c.eq([len(ticked()), 'COMMERCIAL' in ticked()], [16, False], 'a squadron: the sixteen military themes, not the commercial one', what='squadron')
    nxt('fleet')
    nxt('summary')
    c.tap('[data-act="companyAdd"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'done'", timeout=8000, what='the squadron created')
    c.eq([p for p in c.js('window.__puts') if 'escadril' in p], ['airline/escadril/settings.json', 'airline/escadril/fleet.json'], 'ticks as the kind’s default: no themes.json (the kind stays the rule)', what='no file')
    c.check_errors()


@case('A127', 'Settings › Company › « Créer une compagnie » (SOG-0041, step B3): the fleet from the sheets base — search by type or name, the registration typed, a running list with « Retirer », the title says the count, « Plus tard » allowed; the aircraft are written with the fleet\u2019s own normalisation', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.38 bis step 3 (accepted: « la base » = the aircraft sheets of data/aircraft, the registration typed by the airline): a search over the sheets (aerodb aircraft().sheets.list()), a type chosen then a registration (2 to 10 letters, digits, dashes; once), a running list, the title « Flotte · n appareils », « Plus tard » at the same level; fleet.json gets the aircraft normalised like Maintenance › Aircraft; everything read is text')
def a127(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    evil = '<img src=x onerror=window.__pwn=1>'
    sheets = [{'id': 'A320', 'name': 'A320', 'icao': 'A320', 'usableFuel': 18000, 'updated_at': '2026-10-26T10:00:00Z', 'cruise': {'tasKt': 450, 'fuelFlowPerHour': 2400}},
              {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'usableFuel': 20000, 'updated_at': '2026-10-27T10:00:00Z', 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000}},
              {'id': 'EVIL', 'name': evil, 'icao': 'EVIL', 'usableFuel': 1000, 'updated_at': '2026-10-27T10:00:00Z', 'cruise': {'tasKt': 100, 'fuelFlowPerHour': 100}}]
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document']] + [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in sheets]
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 2 && !!document.querySelector('[data-wizard]')", timeout=15000, what='the card and its stepper')
    c.js("document.querySelector('[data-airline-add]').open = true")
    nxt = lambda to: (c.tap('[data-act="companyNext"]'), c.until(f"document.querySelector('[data-wizard]').dataset.step === '{to}'", timeout=6000, what=f'the {to} step'))
    pane = '[data-step-pane=fleet]'
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Rennes Motoculture')
    nxt('themes')
    nxt('fleet')
    c.eq(norm(c.text('[data-wz-fleet-title]')), norm(tx(sj, 'fleet', lang, after='    steps: {')), 'with no aircraft the title is the name of the step', what='title empty')
    c.until(f"document.querySelectorAll('{pane} [data-wz-results] button').length === 3", timeout=8000, what='the sheets of the base are listed')
    c.ok(c.count(pane + ' img') == 0 and c.js('window.__pwn === undefined'), None, 'a hostile sheet name is text: no element, nothing runs')
    # ---- search, choose a type, type the registrations
    c.page.fill('[data-wizard] [data-f="wz-sheet-q"]', 'a32')
    c.until(f"document.querySelectorAll('{pane} [data-wz-results] button').length === 1", timeout=6000, what='one sheet matches « a32 »')
    c.tap(f"{pane} [data-wz-results] button[data-id=A320]")
    c.until(f"!document.querySelector('{pane} [data-wz-pick]').hidden", timeout=6000, what='the type waits for its registration')
    c.page.fill('[data-wizard] [data-f="wz-reg"]', 'x')
    c.tap('[data-act="companyWzReg"]')
    c.eq(norm(c.text('[data-wizard] [data-msg]')), norm(T('wzRegBad')), 'a bad registration: said', what='bad reg')
    for reg in ('f-gkxa', 'F-GKXB'):
        c.page.fill('[data-wizard] [data-f="wz-reg"]', reg)
        c.tap('[data-act="companyWzReg"]')
        c.until(f"!!document.querySelector('{pane} [data-wz-fleet] li[data-reg=\"{reg.upper()}\"]')", timeout=6000, what=f'{reg} listed')
    c.page.fill('[data-wizard] [data-f="wz-reg"]', 'F-GKXA')
    c.tap('[data-act="companyWzReg"]')
    c.eq(norm(c.text('[data-wizard] [data-msg]')), norm(T('wzRegDup')), 'the same registration twice: said', what='dup')
    c.eq(norm(c.text('[data-wz-fleet-title]')), norm(T('wzFleetTitle').replace('{x}', _noun(lang, 'aircraft', 2))), 'the title of the step says how many aircraft are added', what='title count')
    c.ok(norm(T('wzFleetTitle').replace('{x}', _noun(lang, 'aircraft', 2))) in norm(c.text('[data-step-dot=fleet]')), norm(c.text('[data-step-dot=fleet]')), 'and so does its dot in the header')
    c.eq(c.js(f"document.querySelector('{pane} [data-act=companyWzLater]').hidden"), True, '« Plus tard » is only there while the list is empty', what='later hidden')
    # a second type, then one removed
    c.page.fill('[data-wizard] [data-f="wz-sheet-q"]', 'c-130')
    c.until(f"document.querySelectorAll('{pane} [data-wz-results] button').length === 1", timeout=6000, what='C-130J found by its name')
    c.tap(f"{pane} [data-wz-results] button[data-id=C30J]")
    c.page.fill('[data-wizard] [data-f="wz-reg"]', 'F-RJAA')
    c.tap('[data-act="companyWzReg"]')
    c.until(f"document.querySelectorAll('{pane} [data-wz-fleet] li').length === 3", timeout=6000, what='three aircraft')
    c.tap(f"{pane} [data-wz-fleet] li[data-reg=F-GKXB] button")
    c.until(f"document.querySelectorAll('{pane} [data-wz-fleet] li').length === 2", timeout=6000, what='« Retirer »')
    if c.width in (390, 1280):
        c.shot(f'A127_standard_{c.width}_{lang}_fleet_delivered.png')
    nxt('summary')
    c.eq(norm(c.text('[data-wz-summary]')).split(' · ')[-1], norm(_noun(lang, 'aircraft', 2)), 'the summary counts the aircraft', what='summary count')
    c.tap('[data-act="companyAdd"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'done'", timeout=8000, what='created')
    fl = c.doc('airline/rennes/fleet.json')
    c.eq([[a['registration'], a['type'], a['variant']] for a in fl['aircraft']], [['F-GKXA', 'A320', 'A320'], ['F-RJAA', 'C30J', 'C-130J']], 'the aircraft in the file: registration, type of the sheet, variant (its name), in the order added', what='fleet file')
    c.ok(all(a.get('operational') is True and a.get('callsigns') == [] for a in fl['aircraft']), fl, 'normalised like Maintenance › Aircraft (operational, callsigns)')
    # ---- « Plus tard »: no aircraft, an empty fleet
    c.tap('[data-act="companyStay"]')
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Bravo Air')
    nxt('themes')
    nxt('fleet')
    c.tap(f"{pane} [data-act=companyWzLater]")
    c.until("document.querySelector('[data-wizard]').dataset.step === 'summary'", timeout=6000, what='« Plus tard » goes on to the summary')
    c.tap('[data-act="companyAdd"]')
    c.until("document.querySelector('[data-wizard]').dataset.step === 'done'", timeout=8000, what='created later')
    c.eq((c.doc('airline/bravo/fleet.json') or {}).get('aircraft'), [], 'an empty fleet, to fill later', what='empty fleet')
    c.check_errors()


@case('A128', 'Settings › Company › « Rejoindre une compagnie » (SOG-0041, step B4): the fleet page of the website pasted, read on this device and SHOWN before anything is written, then settings, fleet and the index last; an airline already in the list is not joined again; the page is untrusted', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.38 bis, use case 2 (accepted): « Rejoindre » = paste the fleet page (the Website module\u2019s own parser), see « n appareils · m opérateurs », the name and the code proposed, the kind (squadron by default), networks, the address of the site (https, optional); « Rejoindre » writes the settings (kind, site), the fleet read and the index last, never over an existing file; an airline already listed is refused with the way to refresh it; hostile text stays text')
def a128(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    evil = '<img src=x onerror=window.__pwn=1>'
    page = '\n'.join(['SO Group',
                      'A400M Atlas\tF-RBAA\t01\t1\tCOTAM1\tLFOB\tLFOB\t-\toui',
                      'A400M Atlas\tF-RBAB\t02\t2\tCOTAM2/COTAM3\tLFOB\tLFOB\t-\toui',
                      'Autre Escadre',
                      'C130J Hercules\tF-RJAA\t03\t3\tHERC1\tLFRK\tLFRK\t-\tnon',
                      evil,
                      'PC12 Pilatus\tF-ZZZZ\t04\t4\t-\tLFRN\tLFRN\t-\toui'])
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document'],
            # the registry of the missions (the count of « Rejoindre », SOG-0202 B4): two at the code « so », one personal (no airline), one at another code, one organisation
            ['missions/mission_registry.yaml', {'missions': [{'id': 'F-001', 'folder': 'F_FIRE/F-001', 'airline': 'so'}, {'id': 'F-002', 'folder': 'F_FIRE/F-002', 'airline': 'so'}, {'id': 'F-003', 'folder': 'F_FIRE/F-003'},
                                                              {'id': 'F-004', 'folder': 'F_FIRE/F-004', 'airline': 'other'}, {'id': 'F-005Z', 'folder': 'F_FIRE/F-005Z', 'airline': 'so'}]}, 'document']]
    c.page.add_init_script("""(() => { let fd; window.__puts = []; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; const a = v.adapter; v.adapter = function () { const ad = a.apply(this, arguments); const put = ad.put; ad.put = async function (p) { window.__puts.push(p); return put.apply(this, arguments) }; return ad } } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 2 && !!document.querySelector('[data-join]')", timeout=15000, what='the card and the joining assistant')
    c.js("document.querySelector('[data-airline-join]').open = true")
    step = lambda: c.js("document.querySelector('[data-join]').dataset.step")
    msg = lambda: norm(c.text('[data-join] [data-jn-msg]'))
    # ---- nothing pasted: said
    c.tap('[data-act="companyJnNext"]')
    c.until("document.querySelector('[data-join] [data-jn-msg]').textContent.trim() !== ''", timeout=6000, what='a refusal')
    c.eq([msg(), step()], [norm(T('jnEmpty')), 'site'], 'nothing pasted: said, still on the page step', what='empty')
    c.page.fill('[data-join] [data-f="jn-page"]', 'Opérateur\nrien qui ressemble à une flotte')
    c.tap('[data-act="companyJnNext"]')
    c.until("document.querySelector('[data-join] [data-jn-msg]').textContent.trim() !== ''", timeout=6000, what='nothing readable')
    c.eq([msg(), step()], [norm(T('jnNone')), 'site'], 'a page with no aircraft: said', what='none')
    # ---- the page is read and shown before anything is written
    c.page.fill('[data-join] [data-f="jn-page"]', page)
    c.tap('[data-act="companyJnNext"]')
    c.until("document.querySelector('[data-join]').dataset.step === 'read'", timeout=8000, what='what was read')
    parsed = c.js("(page) => import('/modules/website/model.js').then(m => { const l = m.parseFleet(page); const ops = {}; for (const a of l) ops[a.operator] = (ops[a.operator] || 0) + 1; return [l.length, Object.keys(ops).length, Object.entries(ops).sort((x, y) => y[1] - x[1])[0][0]] })", page)
    c.eq(norm(c.text('[data-join] [data-jn-counts]')), norm(T('jnCounts').replace('{a}', _noun(lang, 'aircraft', parsed[0])).replace('{b}', _noun(lang, 'operator', parsed[1]))), 'the number of aircraft and of operators, as the Website parser reads them', what='counts')
    c.eq([c.js("document.querySelector('[data-join] [data-f=jn-name]').value"), c.js("document.querySelector('[data-join] [data-f=jn-code]').value")], [parsed[2][:60], c.js("(n) => n.split(/\\s+/)[0].normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8)", parsed[2][:60])], 'the name is the operator with most aircraft, the code is proposed from it', what='proposed')
    c.eq(c.js("[...document.querySelectorAll('[data-join] input[name=jn-kind]')].map(i => [i.value, i.checked])"), [['va', False], ['sog', True]], 'a joined airline is a squadron by default, editable', what='kind')
    # ---- the missions of the registry already at this code (Features SOG's rule: a named airline, else personal; organisations apart): counted on this device, following the code typed
    ms = lambda: norm(c.text('[data-join] [data-jn-missions]'))
    c.until(f"document.querySelector('[data-join] [data-jn-missions]').textContent.includes('2')", timeout=8000, what='the count of the missions at the proposed code')
    c.eq(ms(), norm(T('jnMissionsN').replace('{n}', '2').replace('(s)', 's' if lang in ('fr', 'en', 'es') else '').replace('(en)', 'en').replace('(es)', 'es')), 'two missions of the registry are already at the code « so » (the organisation, the personal one and the other airline’s are not)', what='count so')
    c.page.fill('[data-join] [data-f="jn-code"]', 'other')
    c.until("document.querySelector('[data-join] [data-jn-missions]').textContent.includes('1')", timeout=8000, what='one at another code')
    c.page.fill('[data-join] [data-f="jn-code"]', 'zzz')
    c.until(f"document.querySelector('[data-join] [data-jn-missions]').textContent.includes({json.dumps(norm(T('jnMissionsNone'))[:14])})", timeout=8000, what='none at an unused code')
    c.eq(ms(), norm(T('jnMissionsNone')), 'no mission of the registry at an unused code: said, with where to change a mission’s airline', what='count none')
    c.page.fill('[data-join] [data-f="jn-code"]', 'so')
    c.until("document.querySelector('[data-join] [data-jn-missions]').textContent.includes('2')", timeout=8000, what='back to the proposed code')
    c.ok(c.count('[data-join] img') == 0 and c.js('window.__pwn === undefined'), None, 'a hostile line of the page is text: no element, nothing runs')
    c.eq(c.js('window.__puts.length'), 0, 'nothing is written while it is only shown', what='no put')
    if c.width in (390, 1280):
        c.shot(f'A128_standard_{c.width}_{lang}_read_delivered.png')
    # ---- refusals: an airline already in the list, a bad address
    c.page.fill('[data-join] [data-f="jn-code"]', 'aaa')
    c.tap('[data-act="companyJnGo"]')
    c.until("document.querySelector('[data-join] [data-jn-msg]').textContent.trim() !== ''", timeout=6000, what='already listed')
    c.eq(msg(), norm(T('jnTaken')), 'an airline already in the list is not joined again: said, with the way to refresh its fleet', what='taken')
    c.page.fill('[data-join] [data-f="jn-code"]', 'sog')
    c.page.fill('[data-join] [data-f="jn-site"]', 'http://sog.example/flotte')
    c.tap('[data-act="companyJnGo"]')
    c.until(f"document.querySelector('[data-join] [data-jn-msg]').textContent.trim() !== ''", timeout=6000, what='bad address')
    c.eq([msg(), c.js('window.__puts.length')], [norm(T('jnBadSite')), 0], 'an address that is not https: said, nothing written', what='bad site')
    # ---- joining
    c.page.fill('[data-join] [data-f="jn-site"]', 'https://sog.example/flotte/')
    c.page.check('[data-join] [data-jn-net="ivao"]')
    # at 390 px the touch that follows a fill and a check was lost now and then (the message of the previous refusal stayed, joinGo never ran): scrolled to the middle and tapped again until the button has acted, as a pilot would
    for _try in range(3):
        c.js("document.querySelectorAll('#fNotes .f-note button').forEach(b => b.click()); document.querySelector('[data-act=companyJnGo]').scrollIntoView({ block: 'center' })")
        c.tap('[data-act="companyJnGo"]')
        for _ in range(15):
            if c.js("document.querySelector('[data-join]').dataset.step === 'done' || !document.querySelector('[data-join] [data-jn-msg]').textContent.trim()"):
                break
            c.wait(200)
        else:
            continue
        break
    c.until("document.querySelector('[data-join]').dataset.step === 'done'", timeout=8000, what='joined')
    c.eq(c.js('window.__puts'), ['airline/sog/settings.json', 'airline/sog/fleet.json', 'airline/index.json'], 'the settings, the fleet read, and the index last', what='order')
    st = c.doc('airline/sog/settings.json')
    c.eq([st['name'], st['kind'], st['networks'], st['site']], [parsed[2][:60], 'sog', {'ivao': True, 'vatsim': False, 'offline': False}, 'https://sog.example/flotte'], 'the settings: name, kind, networks, the address of the site (https, no final slash)', what='settings')
    fl = c.doc('airline/sog/fleet.json')
    c.eq(sorted(a['registration'] for a in fl['aircraft']), sorted(['F-RBAA', 'F-RBAB', 'F-RJAA', 'F-ZZZZ']), 'the aircraft of the page, by registration', what='fleet')
    c.eq([[a['type'], a['operational'], a['callsigns']] for a in fl['aircraft'] if a['registration'] == 'F-RBAB'], [['A400M', True, ['COTAM2', 'COTAM3']]], 'with their type, state and callsigns', what='one aircraft')
    c.until("document.querySelectorAll('[data-card=company] [data-airlines] [data-airline]').length === 3", timeout=8000, what='the list shows the joined airline')
    c.tap('[data-act="companyJnFly"]')
    c.until("location.hash.startsWith('#missions')", timeout=8000, what='Missions')
    c.eq(_airline_code(c, 'sog'), 'sog', 'the joined airline is the current one', what='current')
    c.check_errors()


# the fake launcher of A129: /__setup/status says a launcher is here; /__setup/net is answered by the page itself (a patched fetch), after a delay, so that
# the calls overlap and the case can count how many are in flight at once, per host and in all
FAKE_RELAY = """(() => {
  const real = window.fetch.bind(window), st = window.__relay = { cur: 0, max: 0, host: {}, maxHost: 0, log: [], busy: {} };
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || String(input);
    if (!url.includes('__setup/net')) return real(input, init);
    const a = JSON.parse(init.body), u = new URL(a.url), key = u.hostname + u.pathname;
    st.cur++; st.max = Math.max(st.max, st.cur); st.host[u.hostname] = (st.host[u.hostname] || 0) + 1; st.maxHost = Math.max(st.maxHost, st.host[u.hostname]);
    st.log.push(key);
    return new Promise((res, rej) => { init.signal?.addEventListener('abort', () => { st.cur--; st.host[u.hostname]--; rej(new DOMException('aborted', 'AbortError')) }, { once: true }); setTimeout(() => {
      if (init.signal?.aborted) return;
      st.cur--; st.host[u.hostname]--;
      const mk = (status, headers, body = 'ok') => res(new Response(body, { status, headers }));
      if (u.pathname === '/busyonce' && (st.busy[key] = (st.busy[key] || 0) + 1) === 1) return mk(503, { 'X-SOG-Reason': 'busy', 'Retry-After': '0' });
      if (u.pathname === '/busy') return mk(503, { 'X-SOG-Reason': 'busy', 'Retry-After': '0' });
      if (u.pathname === '/timeout') return mk(502, { 'X-SOG-Offline': '1', 'X-SOG-Reason': 'timeout' }, 'unreachable');
      if (u.pathname === '/refused') return mk(502, { 'X-SOG-Offline': '1', 'X-SOG-Reason': 'refused' }, 'unreachable');
      if (u.pathname === '/http404') return mk(404, { 'X-SOG-Reason': 'http-404' }, 'no');
      mk(200, {}, 'ok');
    }, u.pathname.startsWith('/slow') ? 1500 : 60) });
  };
})()"""


@case('A129', 'ctx.net: the calls to one host queue in the frame (two at a time, four in all), a « busy » is replayed, the launcher’s reason reaches the caller (SOG-0198)', 'A',
      designs=('standard',), screens=False, night=False,
      rule='SOG-0198 (the user saw « Carte : prévision de la grille injoignable (hors ligne) » with the network up): the launcher refuses a relay beyond two per host and four in all (503, X-SOG-Reason: busy, Retry-After) and no page read it; the frame now queues the calls (the callers never see « busy »), replays a « busy » received anyway (Retry-After, three times at most), and returns the launcher’s reason as it is (X-SOG-Reason: busy, timeout, reset, refused, unreachable, http-<code>); X-SOG-Offline stays the only sign of « offline »')
def a129(c):
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    c.context.add_init_script(FAKE_RELAY)
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=CTX_MODULE))
    c.context.route(re.compile(r'/__setup/status'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(status)))
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    c.until('!!window.__relay', what='the fake relay')
    # a launcher is here (the frame reads /__setup/status once at the start)
    c.wait(1500)
    call = """async (urls) => { const rs = await Promise.all(urls.map(u => window.__ctx.net.fetch(u))); return rs.map(r => [r.status, r.headers.get('x-sog-offline'), r.headers.get('x-sog-reason')]) }"""
    one = 'https://api.open-meteo.com/v1/forecast?n='
    res = c.js(call, [one + str(i) for i in range(10)])
    st = c.js('window.__relay')
    c.eq([r[0] for r in res], [200] * 10, 'ten calls to one host: all succeed, none refused', what='ten calls')
    c.ok(st['maxHost'] <= 2 and st['max'] <= 2, str(st), 'never more than two at once for one host')
    c.ok(len(st['log']) == 10, str(len(st['log'])), 'each call reached the launcher once')
    # two hosts, six calls each: two per host, four in all
    c.js('() => { window.__relay.max = 0; window.__relay.maxHost = 0; window.__relay.log = [] }')
    res = c.js(call, [f'https://api.open-meteo.com/a?n={i}' for i in range(6)] + [f'https://aviationweather.gov/b?n={i}' for i in range(6)] + [f'https://api.vatsim.net/c?n={i}' for i in range(2)])
    st = c.js('window.__relay')
    c.eq([r[0] for r in res], [200] * 14, 'three hosts, fourteen calls: all succeed', what='three hosts')
    c.ok(st['maxHost'] <= 2 and 2 < st['max'] <= 4, str(st), 'at most two per host and four in all, and the slots are used (more than two at once)')
    # a « busy » received anyway (another tab) is replayed
    c.js('() => { window.__relay.log = [] }')
    res = c.js(call, ['https://api.open-meteo.com/busyonce'])
    c.eq([res[0][0], c.js('window.__relay.log.length')], [200, 2], 'a « busy » from the launcher is replayed: the caller gets the answer', what='busy once')
    c.js('() => { window.__relay.log = [] }')
    res = c.js(call, ['https://api.open-meteo.com/busy'])
    c.eq([res[0][0], res[0][1], res[0][2], c.js('window.__relay.log.length')], [503, None, 'busy', 4], 'always « busy »: replayed three times, then rendered as it is (503, busy, not « offline »)', what='busy always')
    # the reason reaches the caller; « offline » is the sign of the network only
    res = c.js(call, ['https://api.open-meteo.com/timeout', 'https://api.open-meteo.com/refused', 'https://api.open-meteo.com/http404'])
    c.eq(res, [[503, '1', 'timeout'], [503, '1', 'refused'], [404, None, 'http-404']], 'timeout, refused: offline with their reason; an HTTP error: its status and reason, not offline', what='reasons')
    c.check_errors()


@case('A130', 'ctx.ask with sections: texts only, bounded, a scrolling group is reachable by keyboard, a plain question is unchanged (SOG-0197 review)', 'A',
      designs=('standard',), screens=False, night=False,
      rule='review of the `sections` option of ctx.ask (Settings, 8fd6f63a0): a title, a line or the note is a text (escaped, bounded: 120, 300, 500 characters), a null section is skipped, six groups and 500 lines at most; a group that scrolls (more than seven lines) takes the focus (tabindex) and is named by its title; a question without sections has the same markup as before')
def a130(c):
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=CTX_MODULE))
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    c.js("""() => { window.__q = window.__ctx.ask('Question ?', { ok: 'Go', cancel: 'Non', note: 'x'.repeat(900) + '<img src=x onerror=window.__pwn=1>',
      sections: [null, { id: 'a"><b>', title: '<img src=x onerror=window.__pwn=1>' + 'T'.repeat(300), lines: ['ligne <b>1</b>', 'l'.repeat(900), 3, 4, 5, 6, 7, 8] },
        { id: 'b', title: 'Court', lines: ['un', 'deux'] }, ...Array.from({ length: 7 }, (_, i) => ({ id: 's' + i, title: 'S' + i, lines: [] }))] }); return true }""")
    c.until("!!document.querySelector('.f-modal [data-ask-section]')", what='the question with groups')
    r = c.js("""() => { const m = document.querySelector('.f-modal'), g = [...m.querySelectorAll('[data-ask-section]')], first = g[0], second = g[1];
      return { groups: g.length, img: m.querySelectorAll('img, b').length, pwn: window.__pwn === undefined, title: first.querySelector('h4').textContent.length,
        long: Math.max(...[...first.querySelectorAll('li')].map(l => l.textContent.length)), lines: first.querySelectorAll('li').length,
        tab: [first.querySelector('ul').getAttribute('tabindex'), second.querySelector('ul').getAttribute('tabindex')], label: first.querySelector('ul').getAttribute('aria-label').length,
        note: m.querySelector('p.f-muted').textContent.length, id: first.dataset.askSection } }""")
    c.eq([r['groups'], r['img'], r['pwn']], [6, 0, True], 'six groups at most, a null one skipped, nothing is markup, nothing runs', what='groups')
    c.eq([r['title'], r['long'], r['lines'], r['note'], r['label']], [120, 300, 8, 500, 120], 'a title, a line and the note are bounded', what='bounds')
    c.eq(r['tab'], ['0', None], 'the group that scrolls takes the focus, the short one does not', what='tabindex')
    c.tap('.f-modal [data-ok]')
    ok = c.js('() => window.__q')
    c.eq(ok, True, 'OK answers true', what='ok')
    c.js("() => { window.__p = window.__ctx.ask('Simple ?'); return true }")
    c.until("!!document.querySelector('.f-modal')", what='the plain question')
    c.eq([c.count('.f-modal [data-ask-section]'), c.count('.f-modal .f-muted'), c.count('.f-modal [data-ok]'), c.count('.f-modal [data-no]')], [0, 0, 1, 1], 'a question without sections: the same markup as before', what='plain')
    c.tap('.f-modal [data-no]')
    c.check_errors()

@case('A131', 'The agreement of a noun with its number (frame/lib/plural.js): fr 0 and 1 singular, en / de / es only 1; the marks (s) (x) (es) (en) (n) (e) of a text are resolved by the number that precedes them', 'A', tags=('settings',),
      designs=('standard',), screens=False, night=False,
      rule='ergonomist, 10 Nov: no more « (s) » on screen — « 2 appareils », « 1 appareil », « 0 appareil » (fr) — by a small pure function; the bench reports every assertion')
def a131(c):
    _bench(c, 'frame/lib/test/plural.html', '__pluralBench')



LAUNCHER_MODULE = "export const meta = { id: 'atmosphere', launcher: { routes: ['calc'] } }; export function mount(el, ctx) { window.__ctx = ctx; window.__ev = []; window.addEventListener('frame-launcher', e => window.__ev.push(e.detail.state)); el.textContent = 'ctx' }; export function unmount() {}"
LAUNCHER_TEXTS = {
    'none': {'fr': 'Cette fonction passe par le lanceur du poste, et aucun lanceur ne sert cette page : ouvrez la suite par le lanceur de votre ordinateur.',
             'en': 'This function goes through the workstation’s launcher, and no launcher serves this page: open the suite through your computer’s launcher.',
             'de': 'Diese Funktion läuft über den Starter des Arbeitsplatzes, und diese Seite wird von keinem Starter ausgeliefert: Öffnen Sie die Suite über den Starter Ihres Rechners.',
             'es': 'Esta función pasa por el lanzador del puesto y ningún lanzador sirve esta página: abra la suite desde el lanzador de su ordenador.'},
    'down': {'fr': 'Le lanceur du poste ne répond pas : relancez-le, puis réessayez.', 'en': 'The workstation’s launcher is not answering: start it again, then retry.',
             'de': 'Der Starter des Arbeitsplatzes antwortet nicht: Starten Sie ihn neu und versuchen Sie es erneut.', 'es': 'El lanzador del puesto no responde: vuelva a iniciarlo y reintente.'},
    'lan': {'fr': 'Cette fonction n’est offerte que sur l’ordinateur qui porte le lanceur, pas sur un appareil appairé.',
            'en': 'This function is offered only on the computer that runs the launcher, not on a paired device.',
            'de': 'Diese Funktion gibt es nur auf dem Rechner, auf dem der Starter läuft, nicht auf einem gekoppelten Gerät.',
            'es': 'Esta función solo se ofrece en el ordenador que ejecuta el lanzador, no en un dispositivo emparejado.'},
    'back': {'fr': 'Le lanceur répond de nouveau.', 'en': 'The launcher is answering again.', 'de': 'Der Starter antwortet wieder.', 'es': 'El lanzador responde de nuevo.'},
    'retry': {'fr': 'Réessayer', 'en': 'Retry', 'de': 'Erneut versuchen', 'es': 'Reintentar'},
    'label': {'fr': 'Lanceur injoignable', 'en': 'Launcher not answering', 'de': 'Starter antwortet nicht', 'es': 'Lanzador sin respuesta'},
    'line': {'fr': 'Le lanceur du poste ne répond plus', 'en': 'The workstation’s launcher is not answering any more', 'de': 'Der Starter des Arbeitsplatzes antwortet nicht mehr',
             'es': 'El lanzador del puesto ya no responde'},
}
LAUNCHER_NOTES = "() => [...document.querySelectorAll('#fNotes .f-note')].map(n => [n.querySelector('span')?.textContent || '', n.querySelector('[data-act]')?.textContent || null])"
LAUNCHER_STATUS = {'server': True, 'root': '', 'git': True, 'data': False, 'dataGit': False, 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False, 'lnm': []}


@case('A132', 'A gesture that needs the launcher is never mute: ctx.needLauncher says why, with « Retry »; the header and the status block say when the launcher has gone (SOG-0208)', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0208 (the user: « le bouton calculer A → B n’a aucun effet ? … trouvé. pas de lanceur. »): ctx.launcherState() (up, down, none, lan) and the window event `frame-launcher`; ctx.needLauncher({ retry }) returns the module’s launcher or null with one notification for every module (the reason; « Retry » looks for the launcher again and calls retry); when a launcher that answered stops, the sync button says « launcher not answering » (not « offline ») and the status block has a line that retries; a call that answers finds it again')
def a132(c):
    L = LAUNCHER_TEXTS
    lang = c.lang
    live = {'up': True}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        if not live['up']:
            return route.abort()
        body = LAUNCHER_STATUS if path.endswith('/__setup/status') else {'ok': True}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=LAUNCHER_MODULE))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    c.wait(1500)
    # up: the launcher of the module, nothing said
    c.eq(c.js('() => window.__ctx.launcherState()'), 'up', 'a launcher serves the page: up', what='up')
    c.eq(c.js('() => { const l = window.__ctx.needLauncher({}); return !!l && typeof l.call === "function" }'), True, 'needLauncher gives the module’s launcher', what='need up')
    c.eq(c.js(LAUNCHER_NOTES), [], 'and says nothing', what='no note')
    # the launcher stops: a call fails, the state goes down, the event is sent once
    live['up'] = False
    c.js('async () => { await window.__ctx.launcher.call("calc") }')
    c.until("window.__ctx.launcherState() === 'down'", what='down')
    c.eq(c.js('() => window.__ev'), ['down'], 'the event frame-launcher says « down », once', what='event')
    label = norm(c.js("document.querySelector('#fSync .f-lbl').textContent"))
    c.ok(norm(L['label'][lang]) in label, label, 'the sync button says « launcher not answering » (not « offline »)')
    # the gesture: needLauncher says why, with Retry, the same note for every module
    c.eq(c.js('() => { window.__retried = 0; return window.__ctx.needLauncher({ retry: () => { window.__retried++ } }) }'), None, 'a gesture that needs it: null', what='need down')
    got = c.js(LAUNCHER_NOTES)
    c.eq([[norm(got[0][0]), norm(got[0][1] or '')]] if got else [], [[norm(L['down'][lang]), norm(L['retry'][lang])]], 'one note: the reason and « Retry »', what='note down')
    # the status block says it too (Settings): a line that retries
    c.js("() => { location.hash = '#settings' }")
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"launcher-down\"]')", timeout=10000, what='the status line')
    line = c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"launcher-down\"]').textContent")
    c.ok(norm(L['line'][lang]) in norm(line), line, 'the status block says the launcher has gone')
    c.eq(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"launcher-down\"] [data-go]')?.dataset.go"), 'retry-launcher', 'a tap retries', what='go')
    # Retry while it is still gone: nothing is retried
    c.tap('#fNotes .f-note [data-act]')
    c.wait(800)
    c.eq(c.js('() => window.__retried'), 0, 'Retry while it is still gone: nothing is retried', what='retried 0')
    # it comes back: Retry finds it, says so, calls retry; the state, the header and the block follow
    live['up'] = True
    c.tap('#fNotes .f-note [data-act]')
    c.until('window.__retried === 1', timeout=8000, what='retried')
    c.until("window.__ctx.launcherState() === 'up'", what='up again')
    c.eq(c.js('() => window.__ev'), ['down', 'up'], 'the event says « up » again', what='event up')
    c.until("!document.querySelector('[data-card=\"status\"] li[data-k=\"launcher-down\"]')", what='the line is gone')
    c.ok(norm(L['label'][lang]) not in norm(c.js("document.querySelector('#fSync .f-lbl').textContent")), '', 'the sync button no longer says it')
    # a launcher that stops and comes back is found again by a call that answers
    live['up'] = False
    c.js('async () => { await window.__ctx.launcher.call("calc") }')
    c.until("window.__ctx.launcherState() === 'down'", what='down again')
    live['up'] = True
    c.js('async () => { await window.__ctx.launcher.call("calc") }')
    c.until("window.__ctx.launcherState() === 'up'", timeout=10000, what='found again by a call that answers')
    # and by itself, without any call: the frame looks for it every 8 s while it is gone
    if lang == 'fr':
        live['up'] = False
        c.js('async () => { await window.__ctx.launcher.call("calc") }')
        c.until("window.__ctx.launcherState() === 'down'", what='down a third time')
        live['up'] = True
        c.until("window.__ctx.launcherState() === 'up'", timeout=14000, what='found again by the watch (8 s)')
    c.check_errors()


@case('A133', 'ctx.needLauncher without a launcher (a site, the file opened by hand) and on a paired device says why, in the language of the app (SOG-0208)', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0208: no launcher serves the page → « none » (and « Retry » looks for one, finds none, says so again); a paired device of the local network (lan) → « lan », without Retry (the routes are refused there); ctx.launcher stays null, as before')
def a133(c):
    L = LAUNCHER_TEXTS
    lang = c.lang
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=LAUNCHER_MODULE))
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    c.wait(1200)
    c.eq([c.js('() => window.__ctx.launcherState()'), c.js('() => window.__ctx.launcher')], ['none', None], 'no launcher: « none », ctx.launcher null as before', what='none')
    c.eq(c.js('() => window.__ctx.needLauncher({})'), None, 'the gesture: null', what='need none')
    got = c.js(LAUNCHER_NOTES)
    c.eq([[norm(got[0][0]), norm(got[0][1] or '')]] if got else [], [[norm(L['none'][lang]), norm(L['retry'][lang])]], 'a note says no launcher serves the page, with « Retry »', what='note none')
    c.tap('#fNotes .f-note [data-act]')
    c.wait(900)
    got = c.js(LAUNCHER_NOTES)
    c.eq([norm(got[0][0])] if got else [], [norm(L['none'][lang])], 'Retry finds none: the reason again', what='still none')
    # a paired device: the launcher is there but its routes are refused
    status = {**LAUNCHER_STATUS, 'lan': True}
    c.context.route(re.compile(r'/__setup/'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(status)))
    c.page.reload(wait_until='load')
    c.until('!!window.__ctx', timeout=15000, what='the module again')
    c.wait(1500)
    c.eq([c.js('() => window.__ctx.launcherState()'), c.js('() => window.__ctx.launcher')], ['lan', None], 'a paired device: « lan », ctx.launcher null', what='lan')
    c.js('() => { window.__ctx.needLauncher({}) }')
    got = c.js(LAUNCHER_NOTES)
    c.eq([[norm(got[0][0]), got[0][1]]] if got else [], [[norm(L['lan'][lang]), None]], 'a note says it is the computer’s function, without Retry', what='note lan')
    c.check_errors()


LOOP_TEXT = {'fr': 'Rechargements en série arrêtés', 'en': 'Chain of reloads stopped', 'de': 'Serie von Neuladungen angehalten', 'es': 'Serie de recargas detenida'}


@case('A134', 'A cause of reload that repeats does not reload more than twice: the third in ten seconds is refused, the page stays and says why (SOG-0209)', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0209 (the user, 15:20: « refresh en boucle »): the reloads and redirects the frame makes itself (new version, redirect from one application to the other, moved screen) are noted in sessionStorage; the third in ten seconds without a gesture is refused — the page stays, a notification says « Chain of reloads stopped: <cause> », the cause is kept in the page diagnostic (page.reloads, window.SogFrame.reloads())')
def a134(c):
    # a loop made on purpose: Company sends #missions back to Pilot, which sends it to Company (the real table has no such cycle)
    app = (ROOT / 'frame' / 'app.js').read_text(encoding='utf-8')
    old = "elsewhere: {\n      fuel: 'pilot'\n    }"
    if old not in app:
        old = re.search(r"elsewhere: \{\s*fuel: 'pilot'\s*\}", app).group(0)
    looped = app.replace(old, "elsewhere: { fuel: 'pilot', missions: 'pilot' }")
    c.context.route(re.compile(r'/frame/app\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=looped))
    loads = []
    c.page.on('load', lambda: loads.append(c.page.url))
    c.page.add_init_script("Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined })")
    c.open('missions', docs=LEVEL3, wait=False)
    c.until("!!document.querySelector('#fNotes .f-note')", timeout=20000, what='the note that stops the series')
    c.wait(2500)    # a fourth page load would show here
    text = norm(c.js("[...document.querySelectorAll('#fNotes .f-note span')].map(s => s.textContent).join(' | ')"))
    c.ok(norm(LOOP_TEXT[c.lang]) in text and 'redirect: elsewhere missions' in text, text, 'the note says the series is stopped and why')
    pages = [u for u in loads if '/frame/index.html' in u]
    c.ok(len(pages) == 3, str(pages), 'the page loaded three times (Pilot, Company, Pilot: two redirects), then stayed')
    r = c.js('() => window.SogFrame.reloads()')
    c.ok(r['stopped'] and 'redirect: elsewhere' in r['stopped']['cause'], str(r['stopped']), 'the cause is kept for the diagnostic')
    c.ok(len([e for e in r['recent'] if e['k'] == 'self']) == 2 and len(r['routes']) >= 1, str(r), 'two redirects were made, the routes are listed')
@case('A135', 'Settings: the texts of the Settings screens carry no « (s) » on screen: the kit hands the screens a `t` that agrees the marks with the number before them (« 1 appareil révoqué », « 3 appareils révoqués »)', 'A', langs4=True, tags=('settings',),
      designs=('standard',), screens=False, night=False,
      rule='ergonomist, 10 Nov: no more « (s) »; frame/lib/plural.js through SogSettingsKit.agreeT, used by Settings, Devices, the pilot tokens and the backup messages')
def a135(c):
    lang = c.lang
    c.open('settings', docs=LEVEL3)
    c.until("!!window.SogSettingsKit && !!window.SogFrame && !!window.SogFrame.t", timeout=15000, what='the kit and the frame')
    row = ['{k} appareil(s) révoqué(s).', '{k} device(s) revoked.', '{k} Gerät(e) widerrufen.', '{k} dispositivo(s) revocado(s).']
    got = c.js("async (row) => { await SogSettingsKit.plReady; const t = SogSettingsKit.agreeT(SogFrame.t); return [0, 1, 3].map(k => t(row, { k })) }", row)
    want = {'fr': ['0 appareil révoqué.', '1 appareil révoqué.', '3 appareils révoqués.'], 'en': ['0 devices revoked.', '1 device revoked.', '3 devices revoked.'],
            'de': ['0 Geräte widerrufen.', '1 Gerät widerrufen.', '3 Geräte widerrufen.'], 'es': ['0 dispositivos revocados.', '1 dispositivo revocado.', '3 dispositivos revocados.']}[lang]
    c.eq([norm(x) for x in got], [norm(x) for x in want], 'the marks are resolved by the number: fr 0 and 1 singular, the others only 1', what='agreed')
    c.ok(not any('(' in x for x in got), got, 'no « (s) » is left')
    c.check_errors()


@case('A136', 'The frame’s own texts agree with their number: « {n} conflit(s) » gives « 1 conflit » and « 2 conflits »; without a number a text is left as it is (ctx.t, SOG)', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='ergonomist, 10 Nov (no more « (s) » on screen): t() of frame/app.js — the ctx.t every module receives — resolves the marks (s) (x) (es) (en) (n) (e) by frame/lib/plural.js, from the number {n} that precedes them, only when the caller gives a number; fr: 0 and 1 singular, en / de / es: only 1')
def a136(c):
    c.open('fuel', wait=False)
    c.until('!!window.SogFrame', timeout=15000, what='the frame')
    c.wait(800)
    rows = {'fr': ['{n} conflit(s) à examiner', 'x', 'x', 'x'], 'en': ['x', '{n} conflict(s) to review', 'x', 'x'], 'de': ['x', 'x', '{n} Konflikt(e) zu prüfen', 'x'],
            'es': ['x', 'x', 'x', '{n} conflicto(s) por revisar']}[c.lang]
    ask = "(n) => window.SogFrame.t(%s, { n })" % json.dumps(rows)
    got = {n: norm(c.js(ask, n)) for n in (0, 1, 2)}
    want = {'fr': {0: '0 conflit à examiner', 1: '1 conflit à examiner', 2: '2 conflits à examiner'},
            'en': {0: '0 conflicts to review', 1: '1 conflict to review', 2: '2 conflicts to review'},
            'de': {0: '0 Konflikte zu prüfen', 1: '1 Konflikt zu prüfen', 2: '2 Konflikte zu prüfen'},
            'es': {0: '0 conflictos por revisar', 1: '1 conflicto por revisar', 2: '2 conflictos por revisar'}}[c.lang]
    c.eq(got, want, '0, 1 and 2 agree (fr: 0 and 1 singular; en, de, es: only 1)', what='agreement')
    c.eq(norm(c.js("() => window.SogFrame.t(['Le fichier (s)', 'The file (s)', 'x', 'x'])")), 'Le fichier (s)' if c.lang == 'fr' else 'The file (s)' if c.lang == 'en' else 'x',
         'without a number the text is left as it is', what='no number')
    c.check_errors()


@case('A137', 'Redirects made by the user’s own moves are never stopped: Pilot ↔ Company four times in a row, no « chain of reloads » note (SOG-0209 regression: N4, N13, N14)', 'A',
      designs=('standard',), screens=False, night=False,
      rule='SOG-0209 + Features SOG (bf27aaec3 turned N4, N13 and N14 red): the loop-breaker refuses only a redirect that is a link of a chain — made at the first routing of a page that was itself born of a redirect of the frame (less than 5 s) — never an address change made in the page (« Prepare this flight » from Company to Pilot and back, several times in a few seconds)')
def a137(c):
    c.page.add_init_script("Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined })")
    c.open('missions', docs=LEVEL3, wait=False, app='company')
    c.until("!!document.querySelector('[data-module=missions]')", timeout=20000, what='Missions in Company')
    for _ in range(2):
        c.js("() => { location.hash = '#fuel' }")                 # Company sends Fuel to Pilot: a page load
        c.until("!location.search.includes('app=company') && !!document.querySelector('[data-module=fuel]')", timeout=20000, what='Fuel in Pilot')
        c.js("() => { location.hash = '#missions' }")             # Pilot sends Missions to Company
        c.until("location.search.includes('app=company') && !!document.querySelector('[data-module=missions]')", timeout=20000, what='Missions in Company again')
    notes = c.js("[...document.querySelectorAll('#fNotes .f-note span')].map(s => s.textContent).join(' | ')")
    c.ok('Rechargements' not in notes and 'Chain of reloads' not in notes and 'Neuladungen' not in notes and 'recargas' not in notes, notes, 'no note says a series was stopped')
    c.eq(c.js('() => window.SogFrame.reloads().stopped'), None, 'nothing is marked stopped', what='stopped')
    c.check_errors()


@case('A138', 'A launcher that is started again is found by the open page, with no Shift + F5: the state comes back, and if it serves a newer version the « Old version · Reload » cartouche appears by itself (SOG-0215)', 'A',
      designs=('standard',), screens=False, night=False,
      rule='SOG-0215 (the user: « quand le lanceur revient, il faut shift + f5, alerte cartouche rouge « application dépassée - recharger », et là ça marche enfin »): a launcher that stopped is looked for every 8 s (state down → up); the page that was open takes the new launcher’s survey (version stamp, data) and shows the cartouche when its own stamp differs; a launcher restarted between two passes is seen again at the next return to the foreground (and every minute); never Shift + F5')
def a138(c):
    live = {'up': True, 'app': ''}

    def launcher(route):
        path = urllib.parse.urlparse(route.request.url).path
        if not live['up']:
            return route.abort()
        body = {**LAUNCHER_STATUS, **({'app': live['app']} if live['app'] else {})} if path.endswith('/__setup/status') else {'ok': True}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=LAUNCHER_MODULE))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.page.add_init_script("Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined })")
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx', timeout=15000, what='the module and its ctx')
    c.wait(1500)
    stale = "() => !document.getElementById('fStale').hidden"
    c.eq([c.js('() => window.__ctx.launcherState()'), c.js(stale)], ['up', False], 'a launcher serves the page, it gives no stamp: no cartouche', what='start')
    # the launcher stops, then comes back with a newer version: found by itself, the cartouche appears
    live['up'] = False
    c.js('async () => { await window.__ctx.launcher.call("calc") }')
    c.until("window.__ctx.launcherState() === 'down'", what='down')
    live.update(up=True, app='abcd1234')
    c.until("window.__ctx.launcherState() === 'up'", timeout=14000, what='found again by the page (no Shift + F5)')
    c.until(stale, timeout=5000, what='the cartouche appears by itself')
    c.eq(c.js("document.getElementById('fStale').dataset.go"), 'reload', 'a tap reloads', what='go')
    # a restart between two passes (never seen down): at the next return to the foreground the new version is taken
    live['app'] = 'abcd1234'
    c.page.reload(wait_until='load')
    c.until('!!window.__ctx', timeout=15000, what='the module again')
    c.wait(1200)
    c.eq(c.js(stale), True, 'the page loaded with another stamp than the launcher’s: the cartouche is there', what='stale at load')
    live['app'] = ''
    c.js('() => document.dispatchEvent(new Event("visibilitychange"))')
    c.until("document.getElementById('fStale').hidden", timeout=8000, what='the launcher no longer gives a stamp: the cartouche goes (the survey was taken again)')
    c.check_errors()


WORK_MODULE = "export const meta = { id: 'atmosphere' }; export function mount(el, ctx) { window.__ctx = ctx; el.textContent = 'ctx' }; export function unmount() {}"
CO_KINDS = {'va': {'fr': 'Commerciale', 'en': 'Commercial', 'de': 'Kommerziell', 'es': 'Comercial'}, 'sog': {'fr': 'Escadrille SO', 'en': 'SO squadron', 'de': 'SO-Staffel', 'es': 'Escuadrón SO'},
            'perso': {'fr': 'Personnel', 'en': 'Personal', 'de': 'Persönlich', 'es': 'Personal'}}


def _co_docs(n=2):
    codes = ['aiv', 'dfa', 'itf', 'sog', 'rmc', 'xyz', 'abc', 'def', 'ghi'][:n]
    index = {'airlines': [{'code': k, 'name': {'aiv': 'Air Inter Va', 'dfa': 'DEFA Virtual'}.get(k, f'Compagnie {k.upper()}')} for k in codes]}
    docs = [['device/level.json', {'level': 3}, 'cache'], ['airline/index.json', index, 'document']]
    for k in codes:
        docs.append([f'airline/{k}/settings.json', {'name': index['airlines'][codes.index(k)]['name'], 'kind': 'sog' if k == 'dfa' else 'va'}, 'document'])
    return docs


CO_HEAD = """() => { const h = document.querySelector('.f-head'), kids = [...h.children].filter(e => !e.hidden && e.getClientRects().length), co = document.getElementById('fCo');
  const r = kids.map(e => [e.id || e.className, e.getBoundingClientRect()]); const clash = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i][1], b = r[j][1];
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) clash.push([r[i][0], r[j][0]]) }
  const nm = document.getElementById('fName'), cut = kids.filter(e => e !== co && e.id !== 'fStale' && e.scrollWidth > e.clientWidth + 1).map(e => e.id || e.className);
  return { shown: !co.hidden, text: co.textContent, title: co.title, aria: co.getAttribute('aria-label') || '', tag: co.tagName, one: co.getBoundingClientRect().height < parseFloat(getComputedStyle(co).fontSize) * 2.2,
    over: h.scrollWidth > h.clientWidth, clash, cut, nameCut: !!nm && nm.scrollWidth > nm.clientWidth + 1 } }"""


@case('A139', 'The header says the current airline by a chip beside the application’s name, only when at least two airlines exist (« Personnel » counts); a tap on the chip opens the list of the airlines as radio buttons (seven at most) and a choice changes the airline without leaving the screen; nothing is added to the application selector; the chip says when the work shown is for another airline (SOG-0213)', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0213 (the user: « oui pour ta contre-proposition »): (1) a chip with the code of the device’s airline beside the application’s name, shown only when at least two airlines exist (« Personnel » counts) and this one has a code; the whole name and the kind in the tooltip and the accessible name; (2) a tap on the chip opens the airlines as radio buttons (seven at most, « Personnel » last), a choice changes the device’s airline and stays on the screen; NOTHING is added to the application selector; (3) ctx.workAirline(code): when the work shown is for another airline the chip says it (a mark « ≠ » and the tooltip « this flight or report is for X ») and nothing is rewritten; (4) the words of the kind come from frame/lib/mission_categories.js, one source')
def a139(c):
    lang = c.lang
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=WORK_MODULE))
    c.open('atmosphere', docs=_co_docs(2), wait=False)
    c.until('!!window.__ctx', timeout=20000, what='the module')
    c.wait(2500)
    r = c.js(CO_HEAD)
    c.ok(r['shown'], str(r), 'the chip is shown')
    c.eq([r['tag'], r['text'], r['one'], r['over'], r['clash'], r['cut'], r['nameCut']], ['BUTTON', 'AIV', True, False, [], [], False], '(1) a chip with the code of the device’s airline: a button, in one piece, nothing overlaps, nothing is cut', what='chip')
    c.ok('Air Inter Va' in r['title'] and 'Air Inter Va' in r['aria'] and norm(CO_KINDS['va'][lang]) in norm(r['aria']), str(r), 'the whole name and the kind are in the tooltip and the accessible name')
    c.shot(f'A139_header_{c.width}_{lang}.png')
    # the application selector holds the applications only
    c.tap('#fApp')
    c.until("!!document.querySelector('.f-tabpop [data-app]')", what='the application selector')
    c.eq(c.count('.f-tabpop [data-co]'), 0, 'nothing about the airlines is added to the application selector', what='no airline in the app selector')
    c.tap('#fApp')
    c.until("!document.querySelector('.f-tabpop')", what='closed')
    # (2) the chip opens the list
    c.tap('#fCo')
    c.until("!!document.querySelector('.f-tabpop [data-co]')", what='the list of the airlines')
    rows = c.js("[...document.querySelectorAll('.f-tabpop [data-co]')].map(b => [b.dataset.co, b.getAttribute('role'), b.getAttribute('aria-checked'), b.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq([[x[0], x[1], x[2]] for x in rows], [['aiv', 'radio', 'true'], ['dfa', 'radio', 'false'], ['perso', 'radio', 'false']], '(2) the airlines of the index, then « Personnel », as radio buttons, the current one checked', what='rows')
    c.ok(norm(CO_KINDS['va'][lang]) in norm(rows[0][3]) and norm(CO_KINDS['sog'][lang]) in norm(rows[1][3]) and norm(CO_KINDS['perso'][lang]) in norm(rows[2][3]), str(rows), 'the words of the kind are the single source of mission_categories.js')
    c.shot(f'A139_list_{c.width}_{lang}.png')
    hash0 = c.hash()
    c.tap('.f-tabpop [data-co="dfa"]')
    c.until("document.getElementById('fCo').textContent === 'DFA'", what='the chip follows the choice')
    c.eq([c.count('.f-tabpop'), c.hash(), _airline_code(c, 'dfa')], [0, hash0, 'dfa'], 'a choice changes the airline, closes the list and stays on the screen', what='changed')
    # (3) the work shown is for another airline: the chip says it, nothing is rewritten
    c.js("() => window.__ctx.workAirline('aiv')")
    c.until("document.getElementById('fCo').dataset.differs !== undefined", what='the difference is said')
    r = c.js(CO_HEAD)
    c.eq([r['text'], r['clash'], r['over'], r['nameCut']], ['DFA ≠', [], False, False], '(3) the chip carries a mark when the work shown is for another airline', what='differs')
    c.ok('AIV' in r['title'] and 'DFA' in r['title'], r['title'], 'the tooltip says which airline the work is for and which is the device’s')
    c.shot(f'A139_differs_{c.width}_{lang}.png')
    c.js("() => window.__ctx.workAirline('')")
    c.until("document.getElementById('fCo').dataset.differs === undefined", what='no difference left')
    c.eq(c.js("document.getElementById('fCo').textContent"), 'DFA', 'back to the code alone', what='cleared')
    # seven at most, « Personnel » included
    c.js("() => FrameData.reset()")
    c.open('atmosphere', docs=_co_docs(9), wait=False)
    c.until('!!window.__ctx && !document.getElementById("fCo").hidden', timeout=20000, what='nine airlines')
    c.tap('#fCo')
    c.until("!!document.querySelector('.f-tabpop [data-co]')", what='the list')
    codes = c.js("[...document.querySelectorAll('.f-tabpop [data-co]')].map(b => b.dataset.co)")
    c.eq([len(codes), codes[-1]], [7, 'perso'], 'nine airlines known: seven rows, « Personnel » is the last', what='seven')
    # without an index (one airline, code default): no chip
    c.js("() => FrameData.reset()")
    c.open('atmosphere', docs=[['device/level.json', {'level': 3}, 'cache'], ['airline/settings.json', {'name': 'DEFA Virtual'}, 'document']], wait=False)
    c.until('!!window.__ctx', timeout=20000, what='the module, no index')
    c.wait(1200)
    c.eq(c.js("document.getElementById('fCo').hidden"), True, 'a single airline without an index (code default): no chip', what='no chip')
    c.check_errors()

@case('A140', 'Settings › Company (SOG-0218): the list of airlines is drawn from the index at once although the files of each airline arrive late (a slow device or relay); the grey lines are filled after, in place, nothing moves', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='SOG-0218 (the user: « « compagnie de cet appareil » met 8\u2033 à s\u2019afficher. c\u2019est lent. »): the lines come from the index (name, radio) in the first second; the kind, the fleet and the sheet of the chosen airline are completed afterwards, each line keeping its node and its height (rule 22)')
def a140(c):
    lang = c.lang
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}, {'code': 'ccc', 'name': 'Charlie Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': [{'type': 'A320', 'registration': 'F-AAAA'}, {'type': 'A320', 'registration': 'F-AAAB'}]}, 'document'],
            ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air', 'kind': 'sog'}, 'document'],
            ['airline/bbb/fleet.json', {'schema': 1, 'aircraft': [{'type': 'C30J', 'registration': 'F-RAJA'}]}, 'document'],
            ['airline/ccc/settings.json', {'schema': 1, 'name': 'Charlie Air', 'kind': 'va'}, 'document']]
    # the files of each airline (settings, fleet, themes) come back 2.5 s late, the index at once: a slow device, a relay (the data adapter reads them from the page’s store)
    c.page.add_init_script(CLS_PROBE)
    c.page.add_init_script("""(() => { const get = IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get = function (key) { const q = get.call(this, key);
        if (!/^airline\\/[a-z0-9_-]+\\/(settings|fleet|themes)\\.json$/.test(String(key))) return q;
        const late = { get result() { return q.result }, get error() { return q.error } };
        q.onsuccess = () => setTimeout(() => late.onsuccess && late.onsuccess({ target: late }), 2500);
        q.onerror = () => setTimeout(() => late.onerror && late.onerror({ target: late }), 2500);
        return late } })()""")
    rows = "[data-card=\"company\"] [data-airlines] [data-airline]"
    c.open('settings?card=company', docs=docs, wait=False)
    t0 = c.js("performance.now()")
    c.until(f"document.querySelectorAll('{rows}').length === 4", timeout=15000, what='the lines, from the index')
    t_rows = c.js("performance.now()") - t0
    c.ok(t_rows < 1500, t_rows, 'the list is drawn in less than 1.5 s although the files of each airline take 2.5 s')
    names = lambda: c.js(f"[...document.querySelectorAll('{rows}')].map(n => [n.dataset.airline, n.querySelector('.f-co-name, [data-co-name]')?.textContent.trim() || n.textContent.trim().slice(0, 30)])")
    c.eq([n[0] for n in names()], ['aaa', 'bbb', 'ccc', 'perso'], 'every airline of the index and « personal », in order', what='codes')
    c.ok(c.js(f"document.querySelectorAll('{rows} input[type=radio]').length") == 4, None, 'each with its radio button, already')
    h0 = c.js(f"[...document.querySelectorAll('{rows}')].map(n => Math.round(n.getBoundingClientRect().height))")
    top0 = c.js(f"Math.round(document.querySelector('{rows}').getBoundingClientRect().top)")
    c.js(f"[...document.querySelectorAll('{rows}')].forEach(n => {{ n.__kept = true }})")
    c.shot(f"A140_standard_{c.page.viewport_size['width']}_early.png")
    meta = lambda: c.js(f"[...document.querySelectorAll('{rows} [data-co-meta]')].map(n => n.textContent.trim())")
    # ---- the details arrive: the grey lines are filled in place, the lines keep their node, their height and their place
    c.until(f"[...document.querySelectorAll('{rows} [data-co-meta]')].some(n => /A320|2|F-/.test(n.textContent) && n.textContent.trim().length > 3)", timeout=15000, what='the grey lines are completed')
    c.wait(300)
    c.eq(c.js(f"[...document.querySelectorAll('{rows}')].map(n => !!n.__kept)"), [True, True, True, True], 'every line keeps its node when its details arrive', what='kept')
    c.eq(c.js(f"[...document.querySelectorAll('{rows}')].map(n => Math.round(n.getBoundingClientRect().height))"), h0, 'and its height', what='heights')
    c.eq(c.js(f"Math.round(document.querySelector('{rows}').getBoundingClientRect().top)"), top0, 'and its place', what='top')
    c.until("!!document.querySelector('[data-airline-fiche] [data-kind-set]')", timeout=15000, what='the sheet of the chosen airline')
    cls = c.js('window.__cls')
    c.ok(cls['value'] < 0.1, cls, 'the layout shift of the screen at load, details included, stays under 0.1 (rule 22)')
    c.shot(f"A140_standard_{c.page.viewport_size['width']}_delivered.png")


@case('A141', 'The airline chip with the « Old version » cartouche and a long sync state: nothing overlaps, nothing is cut, at 390, 768 and 1280; the chip gives way as a last resort (SOG-0213)', 'A',
      designs=('standard',), screens=False, night=False, langs4=True,
      rule='SOG-0213 + SOG-0168: the header has one row; the cartouche and the sync state come first; the chip disappears only when even the cartouche’s smallest step does not fit; at every width no rectangle of the header cuts another and the header does not overflow')
def a141(c):
    c.page.add_init_script("""(() => { let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set(v) {
      if (v && typeof v.status === 'function' && !v.__w) { v.__w = 1; const st = v.status, on = v.onStatus;
        v.status = async () => ({ ...(await st.apply(v)), transport: 'github', syncing: false, online: false, lastError: '', conflicts: 0, pending: 11, queue: [] }); v.onStatus = fn => on.call(v, s => fn({ ...s, transport: 'github', syncing: false, online: false, lastError: '', conflicts: 0, pending: 11, queue: [] })) }
      fd = v } }) })()""")

    def launcher(route):
        u = urllib.parse.urlparse(route.request.url).path
        body = {'server': True, 'data': False, 'dataGit': False, 'host': 'TEST', 'lan': False, 'lnm': [], 'app': 'abcd1234'} if u.endswith('/__setup/status') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    c.open('settings', docs=_co_docs(2), wait=False)
    c.until("document.getElementById('fStale') && !document.getElementById('fStale').hidden", timeout=15000, what='the cartouche')
    c.until("/11/.test(document.querySelector('#fSync .f-lbl').textContent)", timeout=15000, what='the long sync state')
    c.wait(900)
    for width in (390, 768, 1280):
        c.page.set_viewport_size({'width': width, 'height': 900})
        c.wait(900)
        r = c.js(CO_HEAD)
        if c.lang == 'fr':
            (ROOT / 'tests' / 'v3' / 'shots').mkdir(parents=True, exist_ok=True)
            c.page.screenshot(path=str(ROOT / 'tests' / 'v3' / 'shots' / f'A140_header_{width}.png'), clip={'x': 0, 'y': 0, 'width': width, 'height': 72})
        c.eq([r['clash'], r['over'], r['nameCut']], [[], False, False], f'at {width}: no rectangle of the header cuts another, it does not overflow, the application name is whole', what=f'fit at {width}')
        if width >= 768:
            c.ok(r['shown'], str(r), f'at {width}: there is room, the chip is there beside the cartouche and the sync state')

    c.check_errors()


@case('A142', 'Settings › Company (SOG-0202 T3b): « Ajouter un thème » and « Ajouter une série » on the sheet — written in themes.json (`added`, one label copied into the four languages), bounded and refused in words, removable; what is typed is text', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.48 (SOG-0202): the airline adds its own themes (acronym 2 to 8, name 1 to 40, eight at most, never an acronym already taken) and series (name 1 to 40, twenty per theme, never twice in a theme); themes.json { chosen, added: { themes: [{ id, short, labels ×4 }], series: { THEME: [{ value, labels ×4 }] } } } is written by Settings only; a name typed is text (no < >)')
def a142(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document']]
    fiche = lambda extra='': f'[data-card="company"] [data-airline-fiche] {extra}'.strip()
    c.open('settings?card=company', docs=docs)
    c.until("!!document.querySelector('[data-airline-fiche] [data-theme-add]')", timeout=15000, what='the sheet with its two folded forms')
    c.eq(c.js("[...document.querySelectorAll('[data-airline-fiche] [data-theme-add], [data-airline-fiche] [data-series-add]')].map(d => [d.tagName, d.open])"), [['DETAILS', False], ['DETAILS', False]], 'the two forms are folded behind « Ajouter un thème… » and « Ajouter une série… »', what='folded')
    opn = lambda sel: c.js(f"document.querySelector('[data-airline-fiche] {sel}').open = true")
    doc = lambda: c.doc('airline/aaa/themes.json')
    say = lambda: norm(c.text('[data-fiche-msg]'))

    def refuse(act, fields, key):
        before = doc()
        opn('[data-theme-add]' if act == 'companyThemeAdd' else '[data-series-add]')
        c.js("document.querySelector('[data-fiche-msg]').textContent = ''")
        for f, v in fields.items():
            (c.page.select_option if f.startswith('sr-theme') else c.page.fill)(f'[data-f="{f}"]', v)
        c.tap(fiche(f'[data-act={act}]'))
        c.until("document.querySelector('[data-fiche-msg]').textContent.trim() !== ''", timeout=6000, what=f'the refusal {key}')
        c.eq(say(), norm(T(key)), f'refused in words: {key}', what=f'refusal {key}')
        c.eq(doc(), before, 'and nothing is written', what=f'unchanged after {key}')
    # ---- a theme of our own: written (one label in the four languages), listed, ticked, removable
    opn('[data-theme-add]')
    c.eq(c.count(fiche('[data-theme-add] label.f-field')), 3, 'opened: three fields (acronym, name, letter), each with a visible label', what='labels')
    c.page.fill('[data-f="th-short-aaa"]', 'rsc')
    c.page.fill('[data-f="th-name-aaa"]', 'Courrier <b>express</b>')
    c.tap(fiche('[data-act=companyThemeAdd]'))
    d = c.until_doc('airline/aaa/themes.json', lambda d: bool(d and d.get('added', {}).get('themes')), what='the theme written')
    c.eq([d['schema'], d['chosen'], d['added']['themes'][0]['id'], d['added']['themes'][0]['short'], len(set(d['added']['themes'][0]['labels']))], [1, ['COMMERCIAL', 'RSC'], 'RSC', 'RSC', 1], 'the Commercial theme of the kind and the new one chosen; id = acronym; one label copied four times', what='theme file')
    c.ok('<' not in d['added']['themes'][0]['labels'][0] and c.count(fiche('[data-themes] b')) == 0, d['added']['themes'][0]['labels'], 'what is typed is text: no < >, no element drawn')
    c.until("!!document.querySelector('[data-airline-fiche] li[data-theme=RSC] input:checked')", what='the new theme is listed and ticked')
    c.eq(c.js("document.querySelector('[data-airline-fiche] [data-theme-add]').open"), False, 'the form is folded again after the addition', what='refolded')
    c.eq(norm(c.text(fiche('[data-themes-title]'))), norm(T('themeSummary').replace('{n}', '2').replace('{m}', '18')), 'two of eighteen', what='count')
    c.eq(c.js(f"[...document.querySelectorAll('{fiche('[data-themes] > li')}')].map(l => l.dataset.theme).slice(-2)"), ['SPECIAL', 'RSC'], 'the added theme comes after the table’s', what='order')
    # ---- a series of our own, in a built-in theme (the value without accent, the label as typed)
    opn('[data-series-add]')
    c.page.select_option('[data-f="sr-theme-aaa"]', 'HEMS')
    c.page.fill('[data-f="sr-name-aaa"]', 'Évacuation sanitaire')
    c.tap(fiche('[data-act=companySeriesAdd]'))
    d = c.until_doc('airline/aaa/themes.json', lambda d: bool(d and d.get('added', {}).get('series')), what='the series written')
    c.eq([d['added']['series']['HEMS'][0]['value'], d['added']['series']['HEMS'][0]['labels'][0], len(set(d['added']['series']['HEMS'][0]['labels']))], ['Evacuation sanitaire', 'Évacuation sanitaire', 1], 'the value is the name without accent (the permitted form), the label is the name as typed, copied four times', what='series file')
    c.until("!!document.querySelector('[data-airline-fiche] [data-series-list=HEMS] li')", what='the series is listed under its theme')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll with the added theme and its two small forms', what='scroll')
    if c.width in (390, 1280):
        opn('[data-theme-add]')
        c.js(f"document.querySelector('{fiche('[data-theme-add]')}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'A142_standard_{c.width}_{lang}_delivered.png')   # the theme form opened, its labels visible
        c.js("document.querySelector('[data-airline-fiche] [data-theme-add]').open = false")
    # ---- refusals, each in words, nothing written
    refuse('companyThemeAdd', {'th-short-aaa': '1', 'th-name-aaa': 'X'}, 'themeBad')
    refuse('companyThemeAdd', {'th-short-aaa': 'hems', 'th-name-aaa': 'Autre'}, 'themeDup')
    refuse('companySeriesAdd', {'sr-theme-aaa': 'HEMS', 'sr-name-aaa': 'Evacuation Sanitaire'}, 'seriesDup')
    refuse('companySeriesAdd', {'sr-name-aaa': '   '}, 'seriesBad')
    # ---- removing: the series, then the theme (with its place in the choice)
    c.tap(fiche('[data-act=companySeriesDel][data-theme=HEMS]'))
    c.until_doc('airline/aaa/themes.json', lambda d: bool(d) and not d['added']['series'], what='the series removed')
    c.tap(fiche('[data-act=companyThemeDel][data-theme=RSC]'))
    d = c.until_doc('airline/aaa/themes.json', lambda d: bool(d) and not d['added']['themes'], what='the theme removed')
    c.eq([d['chosen'], d['added']], [['COMMERCIAL'], {'themes': [], 'series': {}}], 'the theme leaves the file and the choice', what='removed')
    c.check_errors()


@case('A149', 'Settings › Company (SOG-0202, letters): « Ajouter une famille » proposes a free letter for the reports (the first free one), refuses a taken one in words (the table’s, M, D, X, another added family) and writes it in themes.json; a family added before the letters gets a proposal, written only on a gesture', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='V3_SPECIFICATION § 10.48 (SOG-0202), the user on 11/11: « oui, avec anti recouvrement »; added.themes[i].letter, written by Settings only; frame/lib/mission_themes.js freeLetters / takenLetters / letterOf (Features SOG, 507a028ea); the proposal is freeLetters(doc)[0]; nothing is written without a gesture')
def a149(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    old = {'schema': 1, 'chosen': ['COMMERCIAL', 'OLD'], 'added': {'themes': [{'id': 'OLD', 'short': 'OLD', 'labels': ['Ancienne'] * 4}], 'series': {}}}
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/themes.json', old, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document']]
    fiche = lambda extra='': f'[data-card="company"] [data-airline-fiche] {extra}'.strip()
    c.open('settings?card=company', docs=docs)
    c.until("!!document.querySelector('[data-airline-fiche] [data-theme-add]')", timeout=15000, what='the sheet with its forms')
    # the free letters, from the library (the same rule as the report), for the document as it is in the file
    free = lambda raw, keep='': c.js("""async ([raw, keep]) => { const MT = await import('/frame/lib/mission_themes.js'); return MT.freeLetters(raw, keep) }""", [raw, keep])
    f0 = free(old)
    c.ok(len(f0) >= 2, f0, 'the library has free letters to propose')
    doc = lambda: c.doc('airline/aaa/themes.json')
    say = lambda: norm(c.text('[data-fiche-msg]'))
    opn = lambda: c.js("document.querySelector('[data-airline-fiche] [data-theme-add]').open = true")
    # ---- the proposals: the form (first free letter) and the family added before the letters (a free letter, nothing written)
    opn()
    c.eq(c.count(fiche('[data-theme-add] label.f-field')), 3, 'opened: three fields (acronym, name, letter), each with a visible label', what='labels')
    c.eq(c.js("document.querySelector('[data-f=th-letter-aaa]').value"), f0[0], 'the form proposes the first free letter', what='proposal form')
    c.eq(c.js("document.querySelector('[data-letter-set=OLD] input').value"), f0[0], 'the family added before the letters gets a free letter proposed', what='proposal old')
    c.eq(doc(), old, 'and nothing is written by the proposals', what='unchanged')

    def refuse(fields, key, l='', fr=None):
        before = doc()
        opn()
        c.js("document.querySelector('[data-fiche-msg]').textContent = ''")
        for f, v in fields.items():
            c.page.fill(f'[data-f="{f}"]', v)
        c.tap(fiche('[data-act=companyThemeAdd]'))
        c.until("document.querySelector('[data-fiche-msg]').textContent.trim() !== ''", timeout=6000, what=f'the refusal {key}')
        c.eq(say(), norm(T(key).replace('{l}', l).replace('{free}', ' '.join(fr or []))), f'refused in words: {key}', what=f'refusal {key}')
        c.eq(doc(), before, 'and nothing is written', what=f'unchanged after {key}')
    # ---- refusals: a letter of the table (M), not a letter, nothing
    refuse({'th-short-aaa': 'tst', 'th-name-aaa': 'Essai', 'th-letter-aaa': 'm'}, 'themeLetterTaken', 'M', f0)
    refuse({'th-short-aaa': 'tst', 'th-name-aaa': 'Essai', 'th-letter-aaa': '1'}, 'themeLetterBad')
    refuse({'th-short-aaa': 'tst', 'th-name-aaa': 'Essai', 'th-letter-aaa': ''}, 'themeLetterBad')
    # ---- a family with the proposed letter: written
    c.page.fill('[data-f="th-short-aaa"]', 'rsc')
    c.page.fill('[data-f="th-name-aaa"]', 'Courrier')
    c.page.fill('[data-f="th-letter-aaa"]', f0[0].lower())
    c.tap(fiche('[data-act=companyThemeAdd]'))
    d = c.until_doc('airline/aaa/themes.json', lambda d: bool(d) and len(d['added']['themes']) == 2, what='the family written with its letter')
    c.eq([[t['id'], t.get('letter', '')] for t in d['added']['themes']], [['OLD', ''], ['RSC', f0[0]]], 'the letter is written in added.themes[i].letter, in capital', what='written')
    c.until("!!document.querySelector('[data-airline-fiche] li[data-theme=RSC] [data-letter]')", what='the letter shown on its line')
    c.eq(norm(c.text(fiche('li[data-theme=RSC] [data-letter]'))), norm(T('themeLetterOf').replace('{l}', f0[0])), 'its line says its letter', what='letter shown')
    # ---- the letter is now taken: refused with the free ones left; the form proposes the next free one
    f1 = free(d)
    c.ok(f0[0] not in f1 and f1 == f0[1:], f1, 'the library no longer offers it')
    opn()
    c.eq(c.js("document.querySelector('[data-f=th-letter-aaa]').value"), f1[0], 'the form proposes the next free letter', what='proposal after')
    refuse({'th-short-aaa': 'zzz', 'th-name-aaa': 'Autre', 'th-letter-aaa': f0[0]}, 'themeLetterTaken', f0[0], f1)
    # ---- the old family: its proposed letter, written on the gesture only
    c.eq(c.js("document.querySelector('[data-letter-set=OLD] input').value"), f1[0], 'the old family’s proposal follows', what='proposal old after')
    c.page.fill('[data-letter-set=OLD] input', f0[0])
    c.js("document.querySelector('[data-fiche-msg]').textContent = ''")
    before = doc()
    c.tap(fiche('[data-act=companyThemeLetter][data-theme=OLD]'))
    c.until("document.querySelector('[data-fiche-msg]').textContent.trim() !== ''", timeout=6000, what='the refusal of the taken letter')
    c.eq([say(), doc()], [norm(T('themeLetterTaken').replace('{l}', f0[0]).replace('{free}', ' '.join(f1))), before], 'a taken letter is refused for the old family too, nothing written', what='old refused')
    c.page.fill('[data-letter-set=OLD] input', f1[0].lower())
    c.tap(fiche('[data-act=companyThemeLetter][data-theme=OLD]'))
    d = c.until_doc('airline/aaa/themes.json', lambda d: bool(d) and any(t['id'] == 'OLD' and t.get('letter') for t in d['added']['themes']), what='the old family’s letter written')
    c.eq([[t['id'], t.get('letter', '')] for t in d['added']['themes']], [['OLD', f1[0]], ['RSC', f0[0]]], 'both letters written, none twice', what='both')
    c.until("!document.querySelector('[data-letter-set]')", what='no proposal left')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth + 1"), True, 'no horizontal scroll with the letters', what='scroll')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-airline-fiche] [data-theme-add]').open = true")
        c.js(f"document.querySelector('{fiche('[data-theme-add]')}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'A149_standard_{c.width}_{lang}_delivered.png')   # the family form with its letter, the families with their letters
    c.check_errors()


@case('A150', 'Vocabulary (SOG-0242): the French texts of the fleet step of « Créer une compagnie », of « Rejoindre » and of the fleet count say « aéronef » for an aircraft; « appareil » stays the phone, the tablet or the computer', 'A', screens=False, tags=('airline',),
      rule='ergonomist, 11 Nov (SOG-0242, the user): in French an aeroplane or a helicopter is an « aéronef », a « appareil » is the phone, the tablet or the workstation (« Compagnie de cet appareil », « Appareils connectés » unchanged); the module’s own name « Appareils » (capital) is the rail’s label until its owner renames it')
def a150(c):
    sj = 'frame/settings/access.js'
    keys = ['wzFleetTitle', 'wzFleetHint', 'wzSheetQ', 'wzReg', 'wzRegAdd', 'wzLater', 'wzNoSheets', 'wzNoHit', 'wzPickFirst', 'jnPage', 'jnNone', 'jnCounts']
    bad = {}
    for k in keys:
        fr = tx(sj, k, 'fr', after='const TA = {')
        if re.search(r'\bappareils?\b', fr):   # lower case: the capital « Appareils » is the name of the module in the rail
            bad[k] = fr
    c.eq(bad, {}, 'no « appareil » in the French texts of the fleet step and of the fleet page', what='keys')
    c.ok('cet appareil' in tx(sj, 'jnHint', 'fr', after='const TA = {'), '', 'and « cet appareil » stays the device in the hint of « Rejoindre »')
    src = (ROOT / sj).read_text(encoding='utf-8')
    m = re.search(r"noun:\s*\{\s*aircraft:\s*\[\s*\[([^\]]*)\]", src)
    c.ok(bool(m) and "'aéronef'" in m.group(1) and 'appareil' not in m.group(1), m.group(1) if m else '', 'the count of the fleet agrees « aéronef » / « aéronefs »')


@case('A143', 'In the rail of an application, never two entries with the same label, in the four languages; the paired devices are « Appareils connectés » in French (SOG-0213 follow-up: the user’s capture of Maintenance’s rail)', 'A',
      designs=('standard',), screens=True, night=False, langs4=True, phone=False,
      rule='ergonomist, 10 Nov 18:06 (the user’s capture of Maintenance’s rail: « Appareils » twice — the aircraft and the paired devices): the rail of every application never carries two entries with the same label; in French the paired devices are « Appareils connectés » (frame/app.js, the title of frame/settings/devices.js), the aircraft keep « Appareils » for now (their place is decided with SOG-0231)')
def a143(c):
    def launcher(route):
        u = urllib.parse.urlparse(route.request.url).path
        body = {'server': True, 'data': True, 'dataGit': False, 'host': 'TEST', 'lan': False, 'lnm': []} if u.endswith('/__setup/status') else {}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.unroute(re.compile(r'/__setup/'))
    c.context.route(re.compile(r'/__setup/'), launcher)
    seen = {}
    for app, target in (('maintenance', 'data'), ('company', 'missions'), (None, 'fuel')):
        c.open(target, app=app, docs=LEVEL3, wait=False)
        c.until("document.querySelectorAll('#fMenu li').length > 1", timeout=20000, what=f'the rail of {app or "pilot"}')
        c.wait(1200)       # the entries that need the launcher arrive with its survey
        labels = c.js("[...document.querySelectorAll('#fMenu li a')].map(a => a.textContent.replace(/\\s+/g, ' ').trim()).filter(Boolean)")
        dup = sorted({x for x in labels if labels.count(x) > 1})
        c.eq(dup, [], f'the rail of {app or "pilot"} has no two entries with the same label', what=f'duplicates ({app})')
        seen[app] = labels
    if c.lang == 'fr':
        c.ok('Appareils connectés' in seen['maintenance'] and seen['maintenance'].count('Appareils') <= 1, str(seen['maintenance']), 'Maintenance’s rail: the paired devices are « Appareils connectés », the aircraft « Appareils »')
    c.check_errors()


@case('A144', 'Settings › Company › « Créer une compagnie » (SOG-0235): a code whose folder exists but which is missing from the list offers « Reprendre cette compagnie » — the airline goes back into the list, nothing else is written', 'A', langs4=True, tags=('airline',),
      designs=('standard',), screens=True, night=False,
      rule='SOG-0235 (the user: « defa a (encore ?) sauté. mais si je veux la recréer : « Un dossier existe déjà pour ce code : choisissez-en un autre. » »): the folder airline/<code>/ exists, the index does not list it: the assistant says so and offers « Reprendre cette compagnie », which writes the index only (name read from the folder\u2019s settings.json) instead of sending the pilot to another code')
def a144(c):
    lang = c.lang
    sj = 'frame/settings/access.js'
    T = lambda k: tx(sj, k, lang, after='const TA = {')
    docs = [['device/level.json', {'level': 3}, 'cache'],
            ['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'networks': {'ivao': True}, 'kind': 'va'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': []}, 'document'],
            # the folder of an airline that the index lost (SOG-0235)
            ['airline/zed/settings.json', {'schema': 1, 'name': 'Zed Air <b>x</b>', 'networks': {}, 'kind': 'sog'}, 'document'],
            ['airline/zed/fleet.json', {'schema': 1, 'aircraft': []}, 'document']]
    c.page.add_init_script("""(() => { let fd; window.__puts = []; Object.defineProperty(window, 'FrameData', { configurable: true, get: () => fd, set: v => { fd = v; const a = v.adapter; v.adapter = function () { const ad = a.apply(this, arguments); const put = ad.put; ad.put = async function (p) { window.__puts.push(p); return put.apply(this, arguments) }; return ad } } }) })()""")
    c.open('settings?card=company', docs=docs)
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 2 && !!document.querySelector('[data-wizard]')", timeout=15000, what='the card and its stepper')
    c.js("document.querySelector('[data-airline-add]').open = true")
    c.page.fill('[data-wizard] [data-f="co-name"]', 'Zed Air')
    c.page.fill('[data-wizard] [data-f="co-code"]', 'zed')
    c.tap('[data-act="companyNext"]')
    c.until("document.querySelector('[data-wizard] [data-msg]').textContent.trim() !== ''", timeout=8000, what='the folder exists: said')
    c.eq(norm(c.text('[data-wizard] [data-msg]')), norm(T('dirExists')), 'the code of an existing folder: said, with what to do', what='message')
    c.eq([c.js("document.querySelector('[data-wizard] [data-adopt]').hidden"), norm(c.text('[data-wizard] [data-adopt] button'))], [False, norm(T('adopt'))], '« Reprendre cette compagnie » is offered', what='button')
    c.eq(c.js('window.__puts.length'), 0, 'nothing is written by the refusal', what='no put')
    c.eq([c.js("document.querySelector('[data-wizard] [data-msg]').dataset.kind || null"), c.js("document.querySelector('[data-wizard] [data-adopt] button').classList.contains('primary')"), c.js("document.querySelector('[data-wizard] [data-act=companyNext]').classList.contains('primary')")], [None, True, False], 'an OFFER, not an error: the text is neutral (not red), « Reprendre cette compagnie » is the main action and « Suivant » the secondary one', what='offer look')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-wizard] [data-adopt]').scrollIntoView({ block: 'center' })")
        c.shot(f'A144_standard_{c.width}_{lang}_delivered.png')
    c.tap('[data-wizard] [data-adopt] button')
    idx = c.until_doc('airline/index.json', lambda d: bool(d) and any(a.get('code') == 'zed' for a in d.get('airlines', [])), what='the airline is back in the index')
    c.eq([a['code'] for a in idx['airlines']], ['aaa', 'zed'], 'the index keeps the others and lists the folder\u2019s airline', what='index')
    c.ok('<' not in [a for a in idx['airlines'] if a['code'] == 'zed'][0]['name'], idx['airlines'], 'its name is read from the folder, as text (no < >)')
    c.eq(c.js('window.__puts'), ['airline/index.json'], 'nothing but the index is written (the folder is left as it is)', what='puts')
    c.until("document.querySelectorAll('[data-card=\"company\"] [data-airlines] [data-airline]').length === 3", timeout=8000, what='listed')
    c.eq(c.js("document.querySelector('[data-wizard] [data-adopt]').hidden"), True, 'the offer goes away', what='offer gone')
    c.check_errors()


@case('A145', 'ctx.net: a relayed call the caller gave up (signal) frees its place at once, queued or in flight; nothing is sent for one abandoned while it waits', 'A',
      designs=('standard',), screens=False, night=False,
      rule='challenge à rebours of the frame (11 Nov): a caller that aborts (leaving a screen) kept its place in the relay queue and its request until the launcher answered (15 s at most): the next calls waited behind it or were refused « busy »; now an abort rejects the request of the page, answers « offline: aborted » and gives the place back; a call abandoned while it waits leaves the queue and never reaches the launcher')
def a145(c):
    status = {'server': True, 'root': '', 'git': True, 'data': False, 'dataGit': False, 'lfs': False, 'csp': True, 'relaxNav': False, 'host': 'TEST', 'lan': False}
    c.context.add_init_script(FAKE_RELAY)
    c.context.route(re.compile(r'/modules/atmosphere/module\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=CTX_MODULE))
    c.context.route(re.compile(r'/__setup/status'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(status)))
    c.open('atmosphere', wait=False)
    c.until('!!window.__ctx && !!window.__relay', timeout=15000, what='the module and the fake relay')
    c.wait(1500)
    res = c.js("""async () => {
      const t0 = performance.now(), ac = new AbortController(), host = 'https://api.open-meteo.com/slow?n=';
      // two slow calls take the two places of the host; a third waits; the fourth is abandoned while it waits
      const a = window.__ctx.net.fetch(host + 1), b = window.__ctx.net.fetch(host + 2), w = window.__ctx.net.fetch(host + 3, { signal: ac.signal });
      await new Promise(r => setTimeout(r, 200));
      ac.abort();
      const waited = await w, tw = performance.now() - t0;
      const ac2 = new AbortController(), inflight = window.__ctx.net.fetch(host + 4, { signal: ac2.signal });
      await Promise.all([a, b]);
      const t1 = performance.now(), flying = window.__ctx.net.fetch(host + 5, { signal: ac2.signal });
      await new Promise(r => setTimeout(r, 200));
      ac2.abort();
      const f = await flying, tf = performance.now() - t1, i = await inflight;
      return { waited: [waited.status, waited.headers.get('x-sog-offline'), waited.headers.get('x-sog-reason'), Math.round(tw)], flying: [f.status, f.headers.get('x-sog-reason'), Math.round(tf)], sent: window.__relay.log.filter(k => k.endsWith('/slow')).length, inflight: i.headers.get('x-sog-reason') } }""")
    c.eq(res['waited'][:3], [503, '1', 'aborted'], 'a call abandoned while it waits answers « offline: aborted »', what='aborted while waiting')
    c.ok(res['waited'][3] < 900, str(res), 'at once (the slow calls ahead of it last 1.5 s)')
    c.ok(res['flying'][2] < 900 and res['flying'][1] == 'aborted', str(res), 'a call abandoned in flight answers at once, not at the end of the launcher’s answer')
    c.ok(res['sent'] <= 4, str(res), 'the one abandoned while it waited never reached the launcher (at most the four others)')
    c.check_errors()


@case('A146', 'Compagnie has an entry « Flotte » that opens the aircraft module on its Fleet view alone, Maintenance keeps « Fiches » (the Sheets view alone): the entries carry their view, in the rail and in the phone bar (SOG-0231)', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0231 (the user: « 2 entrées » de Compagnie): the fleet of the current airline is an entry of the Company application (« Flotte », #aircraft?view=fleet), Maintenance keeps the performance sheets only (« Fiches », #aircraft?view=sheets); an entry may carry a `query` that opens its module on a view (the rail, the phone bar and its menu); « Registre des missions » has no screen: nothing coded for it')
def a146(c):
    lang = c.lang
    word = {'fleet': {'fr': 'Flotte', 'en': 'Fleet', 'de': 'Flotte', 'es': 'Flota'}, 'sheets': {'fr': 'Fiches', 'en': 'Sheets', 'de': 'Datenblätter', 'es': 'Fichas'}}
    for app, view, target in (('maintenance', 'sheets', 'settings'), ('company', 'fleet', 'missions')):
        c.open(target, app=app, docs=LEVEL3, wait=False)
        c.until("!!document.querySelector('#fView > *')", timeout=20000, what=f'the application {app}')
        sel = f'a[href$="#aircraft?view={view}"]'
        c.until(f"[...document.querySelectorAll('#fMenu {sel}, #fTabs {sel}')].some(a => a.getClientRects().length)", timeout=10000, what=f'the entry of {app}')
        label = norm(c.js(f"[...document.querySelectorAll('#fMenu {sel}, #fTabs {sel}')].find(a => a.getClientRects().length).textContent"))
        c.eq(label, norm(word[view][lang]), f'{app}: the entry says « {word[view][lang]} »', what=f'label ({app})')
        labels = c.js("[...document.querySelectorAll('#fMenu li a, #fTabs a')].filter(a => a.getClientRects().length).map(a => a.textContent.replace(/\\s+/g, ' ').trim())")
        c.ok('Appareils' not in labels and 'Aircraft' not in labels, str(labels), f'{app}: no entry called « Appareils » any more')
        c.js(f"() => [...document.querySelectorAll('#fMenu {sel}, #fTabs {sel}')].find(a => a.getClientRects().length).click()")
        c.until("location.hash.startsWith('#aircraft')", timeout=10000, what='the aircraft module')
        c.until("!!document.querySelector('[data-module=aircraft]')", timeout=15000, what='the module is drawn')
        c.wait(600)
        c.eq(c.count('[data-module=aircraft] [data-view]'), 0, f'{app}: the entry opens the module on its view alone, no bar of two views', what=f'view ({app})')
        c.shot(f'A146_{app}_{c.width}_{lang}_delivered.png')
    c.check_errors()


def _dq_fixture():
    """A frame/help/recette.json (sog-recette/1) with `decisions`: two to decide (the first with a recommended answer), one answered by the generator, a hostile one, one with a single option (dropped)."""
    fx = _rc_fixture()
    fx['decisions'] = [
        {'id': 'Q-0001', 'fiche': 'SOG-0229', 'app': 'maintenance', 'question': 'Un seul bouton « Mettre à jour » ?', 'context': 'La refonte de l’écran de la base propose un état en une phrase et un seul bouton.\nLes nombres se déplient sur place.',
         'options': ['Oui, un seul bouton', 'Non, garder les trois', 'Un bouton, plus un détail replié'], 'recommended': 0, 'since': '2026-11-11', 'state': 'todo'},
        {'id': 'Q-0002', 'fiche': 'SOG-0236', 'app': 'pilote', 'question': 'Où lister les approches en doute ?', 'context': 'Une page dédiée, ou le panneau de la fiche du terrain.',
         'options': ['Une page dédiée', 'Dans la fiche du terrain'], 'recommended': None, 'since': '2026-11-10', 'state': 'todo'},
        {'id': 'Q-0003', 'fiche': 'SOG-0231', 'app': 'compagnie', 'question': 'Le registre des missions : un écran ?', 'context': 'Il n’a pas d’écran aujourd’hui.',
         'options': ['Oui', 'Non'], 'recommended': 1, 'since': '2026-11-09', 'state': 'answered', 'choice': 1, 'text': 'pas avant jeudi', 'at': '2026-11-10T20:00:00Z'},
        {'id': 'Q-0004', 'fiche': 'SOG-0001', 'app': 'pilote', 'question': '<img src=x onerror=window.__pwn=1> ?', 'context': '<b>x</b>', 'options': ['<img src=x onerror=window.__pwn=1>', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'recommended': 9, 'since': '2026-11-08', 'state': 'todo'},
        {'id': 'Q-0005', 'fiche': 'SOG-0002', 'app': 'pilote', 'question': 'Une seule réponse ?', 'context': 'x', 'options': ['seule'], 'since': '2026-11-08', 'state': 'todo'},
    ]
    return fx


@case('A147', 'The Recette screen, tab « À trancher » (SOG-0241): a card per question (the card, its context, the answers as radio buttons, the one the ergonomist recommends said, a free field), the unanswered first; « Répondre » is written by the launcher (recette/decision → organisation/DECISIONS_REPONSES.json), an answered one shows its answer and « Modifier »; without the launcher: « non envoyé »', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0241 (the user: « comme pour la recette, un qcm + choix libre des points à trancher (dans la page recette ?) »): frame/help/recette.json carries `decisions` (id Q-nnnn, fiche, question, context, 2 to 6 options, recommended, state answered with choice / text / at); the screen shows them in a second tab « À trancher (n) », same template as the tests; an answer is kept on the device first and sent by the verb recette/decision (the launcher’s file organisation/DECISIONS_REPONSES.json, same guards as the verdicts); a file and a launcher’s answer are untrusted input (escaped, bounded, filtered)')
def a147(c):
    import tempfile
    from pathlib import Path
    lang = c.lang
    W = {'tab': {'fr': 'À trancher ({n})', 'en': 'To decide ({n})', 'de': 'Zu entscheiden ({n})', 'es': 'Por decidir ({n})'},
         'proposed': {'fr': 'proposé par l’ergonome', 'en': 'proposed by the ergonomist', 'de': 'von der Ergonomie vorgeschlagen', 'es': 'propuesta por la ergonomía'},
         'answer': {'fr': 'Répondre', 'en': 'Answer', 'de': 'Antworten', 'es': 'Responder'}, 'modify': {'fr': 'Modifier', 'en': 'Change', 'de': 'Ändern', 'es': 'Modificar'}}
    unsent = norm(tx('frame/help/recette.js', 'unsent', lang, after='const T = {'))
    fx = _dq_fixture()
    c.context.route(re.compile(r'/frame/help/recette\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'organisation').mkdir()
        f = root / 'organisation' / 'DECISIONS_REPONSES.json'
        # the launcher's file already holds the answer of the generated list (it is what the list was generated from)
        f.write_text(json.dumps({'schema': 'sog-decisions/1', 'updated': '2026-11-10T20:00:00Z', 'items': {'Q-0003': {'choice': 1, 'text': 'pas avant jeudi', 'at': '2026-11-10T20:00:00Z'}}}), encoding='utf-8')
        written = lambda: json.loads(f.read_text(encoding='utf-8'))['items'] if f.exists() else None
        st = _prio_launcher(c, root, verb=('recette', 'decision'))
        c.open('recette', docs=LEVEL3)
        c.until("!!document.querySelector('[data-tabs]')", timeout=15000, what='the two tabs')
        tabs = c.js("[...document.querySelectorAll('[data-tabs] [data-tab]')].map(b => [b.dataset.tab, b.getAttribute('aria-pressed'), b.textContent.trim()])")
        c.eq([[x[0], x[1]] for x in tabs], [['tests', 'true'], ['decisions', 'false']], 'two tabs, the tests first', what='tabs')
        c.eq(norm(tabs[1][2]), norm(W['tab'][lang].replace('{n}', '3')), 'the tab counts the questions without an answer (Q-0001, Q-0002 and the hostile one)', what='count')
        c.tap('[data-tab=decisions]')
        c.until("!!document.querySelector('[data-decisions] li[data-q]')", what='the cards')
        order = c.js("[...document.querySelectorAll('[data-decisions] li[data-q]')].map(l => [l.dataset.q, l.dataset.state])")
        c.eq(order, [['Q-0001', 'todo'], ['Q-0002', 'todo'], ['Q-0004', 'todo'], ['Q-0003', 'answered']], 'the unanswered first (the most recent first), then the answered; a question with one option is dropped', what='order')
        c.eq(c.js("[...document.querySelectorAll('[data-q=Q-0001] input[type=radio]')].map(r => r.value)"), ['0', '1', '2'], 'the answers are radio buttons', what='radios')
        c.eq(norm(c.text('[data-q=Q-0001] [data-proposed]')), norm(f"({W['proposed'][lang]})"), 'the answer the ergonomist recommends is said', what='proposed')
        c.eq(c.count('[data-q=Q-0002] [data-proposed]'), 0, 'a question without a recommendation says nothing', what='no proposal')
        c.eq(c.js("document.querySelector('[data-q=Q-0001] [data-copy]').dataset.copy"), 'SOG-0229', 'the card names its fiche, copiable', what='copy')
        c.eq(c.js("[...document.querySelectorAll('[data-q=Q-0004] input[type=radio]')].length"), 6, 'six answers at most', what='six')
        c.ok(c.count('[data-decisions] img') == 0 and c.js('window.__pwn === undefined'), 'img', 'a hostile question is text')
        c.eq('Non · pas avant jeudi' in norm(c.text('[data-q=Q-0003] [data-answer]')), True, 'an answered question (given by the generator) shows its answer', what='answered')
        c.shot(f'A147_decisions_{c.width}_{lang}_delivered.png')
        # an empty answer is refused, said
        c.tap('[data-dok=Q-0001]')
        c.until("!!document.querySelector('[data-q=Q-0001] [data-need]')", what='a need')
        # answer: a choice and a free text, written by the launcher
        c.page.check('[data-q=Q-0001] input[value="2"]')
        c.page.fill('[data-q=Q-0001] [data-dtext]', 'mais « Mettre à jour » reste en haut')
        c.tap('[data-dok=Q-0001]')
        c.until("document.querySelector('[data-q=Q-0001]')?.dataset.state === 'answered'", what='the question is answered')
        got = None
        for _ in range(40):
            got = written()
            if got and 'Q-0001' in got:
                break
            c.wait(250)
        c.eq([got['Q-0001']['choice'], got['Q-0001']['text'], bool(got['Q-0001'].get('at'))], [2, 'mais « Mettre à jour » reste en haut', True], 'the launcher wrote the answer in organisation/DECISIONS_REPONSES.json', what='written')
        c.eq(c.js("[...document.querySelectorAll('[data-decisions] li[data-q]')].map(l => l.dataset.q)"), ['Q-0002', 'Q-0004', 'Q-0001', 'Q-0003'], 'it joins the answered ones', what='moved')
        c.eq(norm(c.js("document.querySelector('[data-tab=decisions]').textContent")), norm(W['tab'][lang].replace('{n}', '2')), 'the count goes down', what='count after')
        # modify
        c.tap('[data-dmod=Q-0001]')
        c.until("!!document.querySelector('[data-q=Q-0001] input[type=radio]')", what='the form again')
        c.eq(c.js("document.querySelector('[data-q=Q-0001] input[value=\"2\"]').checked"), True, 'the form holds the answer given', what='prefilled')
        c.tap('[data-q=Q-0001] [data-dok]')
        c.until("document.querySelector('[data-q=Q-0001]')?.dataset.state === 'answered'", what='answered again')
        # a reload: the answer is read back from the launcher's file
        c.page.reload()
        c.until("!!document.querySelector('[data-tabs]')", timeout=15000, what='the screen again')
        c.until("document.querySelector('[data-tab=decisions]') && /\\b2\\b/.test(document.querySelector('[data-tab=decisions]').textContent)", timeout=15000, what='the answer is read back')
        # without the launcher's job: kept on the device, « not sent »
        st['up'] = False
        c.tap('[data-tab=decisions]')
        c.until("!!document.querySelector('[data-decisions] li[data-q=Q-0002]')", what='cards')
        c.page.check('[data-q=Q-0002] input[value="1"]')
        c.tap('[data-dok=Q-0002]')
        c.until("!!document.querySelector('[data-q=Q-0002] [data-unsent]')", what='not sent')
        c.eq(norm(c.text('[data-q=Q-0002] [data-unsent]')), unsent, 'an answer the launcher did not take stays on the device, said « not sent »', what='unsent')
        c.eq('Q-0002' in (written() or {}), False, 'and is not in the file', what='not written')
    c.check_errors()


@case('A148', 'The « À trancher » answers kept on the device are SEEN and leave by themselves: with a launcher that does not know the verb yet each card and the head of the tab say « not sent: restart the launcher » with the count; when the launcher is back (or at the next opening) they are sent (SOG-0241 fix)', 'A',
      designs=('standard',), screens=True, night=False, langs4=True,
      rule='SOG-0241 (the user answered 14 questions with a launcher started before recette/decision existed: the answers stayed in device/recette.json › dpending, nothing told him): an answer kept on the device is said on its card and at the head of the tab with the number (« n answer(s) kept on this device, not sent yet »), with the reason when the launcher does not know the verb (« restart it ») or does not answer; the frame sends them by itself when the launcher is back (event frame-launcher up) and at the next opening of the screen; the unsent mark comes from the kept answers themselves')
def a148(c):
    import tempfile
    from pathlib import Path
    lang = c.lang
    W = {'kept': {'fr': '{n} réponse(s) gardée(s) sur cet appareil, pas encore envoyée(s).', 'en': '{n} answer(s) kept on this device, not sent yet.', 'de': '{n} Antwort(en) auf diesem Gerät behalten, noch nicht gesendet.',
                  'es': '{n} respuesta(s) guardada(s) en este dispositivo, aún no enviada(s).'},
         'kept1': {'fr': '1 réponse gardée sur cet appareil, pas encore envoyée.', 'en': '1 answer kept on this device, not sent yet.', 'de': '1 Antwort auf diesem Gerät behalten, noch nicht gesendet.',
                   'es': '1 respuesta guardada en este dispositivo, aún no enviada.'},
         'unknown': {'fr': 'Non envoyé : le lanceur de ce poste ne connaît pas encore ce geste, relancez-le.', 'en': 'Not sent: this workstation’s launcher does not know this gesture yet, restart it.',
                     'de': 'Nicht gesendet: Der Starter dieses Arbeitsplatzes kennt diese Funktion noch nicht, starten Sie ihn neu.', 'es': 'No enviado: el lanzador de este puesto aún no conoce este gesto, reinícielo.'}}
    fx = _dq_fixture()
    c.context.route(re.compile(r'/frame/help/recette\.json'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(fx)))
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as td:
        root = Path(td)
        (root / 'organisation').mkdir()
        f = root / 'organisation' / 'DECISIONS_REPONSES.json'
        written = lambda: json.loads(f.read_text(encoding='utf-8'))['items'] if f.exists() else None
        st = _prio_launcher(c, root, verb=('recette', 'decision'))
        st['unknown'] = True                              # a launcher started before the verb existed
        c.open('recette', docs=LEVEL3)
        c.until("!!document.querySelector('[data-tabs]')", timeout=15000, what='the tabs')
        c.tap('[data-tab=decisions]')
        c.until("!!document.querySelector('[data-decisions] li[data-q=Q-0001]')", what='the cards')
        c.eq(c.count('[data-dbanner]'), 0, 'nothing kept: no banner', what='no banner')
        c.page.check('[data-q=Q-0001] input[value="0"]')
        c.tap('[data-dok=Q-0001]')
        c.until("!!document.querySelector('[data-q=Q-0001] [data-unsent]')", what='the card says it is not sent')
        c.eq(norm(c.text('[data-q=Q-0001] [data-unsent]')), norm(W['unknown'][lang]), 'the card says why: the launcher does not know the gesture yet, restart it', what='card')
        c.page.check('[data-q=Q-0002] input[value="1"]')
        c.tap('[data-dok=Q-0002]')
        c.until("document.querySelectorAll('[data-unsent]').length === 2", what='two kept')
        banner = norm(c.text('[data-dbanner]'))
        c.ok('2' in banner, banner, 'the head of the tab counts them')
        c.ok(norm(W['unknown'][lang]) in banner, banner, 'and gives the reason')
        c.shot(f'A148_unsent_{c.width}_{lang}_delivered.png')
        kept = c.doc('device/recette.json') or {}
        c.eq(sorted((kept.get('dpending') or {}).keys()), ['Q-0001', 'Q-0002'], 'the answers are on the device', what='dpending')
        c.eq(written() and 'Q-0001' in written(), None, 'nothing is written by the launcher', what='nothing written')
        # the launcher is started again: the event says it, the answers leave by themselves
        st['unknown'] = False
        c.js("() => window.dispatchEvent(new CustomEvent('frame-launcher', { detail: { state: 'up' } }))")
        got = None
        for _ in range(40):
            got = written()
            if got and 'Q-0001' in got and 'Q-0002' in got:
                break
            c.wait(250)
        c.eq(sorted(got or {}), ['Q-0001', 'Q-0002'], 'the launcher is back: both answers are written, nobody clicked again', what='sent by itself')
        c.until("document.querySelectorAll('[data-unsent]').length === 0 && !document.querySelector('[data-dbanner]')", what='the marks go')
        # the next opening sends what was kept (answers seeded on the device, the launcher knows the verb)
        f.unlink()
        seed = {'dpending': {'Q-0001': {'choice': 1, 'text': '', 'at': '2026-11-11T08:00:00Z'}, 'Q-0002': {'choice': 0, 'text': 'oui', 'at': '2026-11-11T08:01:00Z'}}, 'dunsent': [], 'tab': 'decisions'}
        c.open('recette', docs=LEVEL3 + [['device/recette.json', seed, 'cache']])
        got = None
        for _ in range(40):
            got = written()
            if got and len(got) >= 2:
                break
            c.wait(250)
        c.eq([sorted(got or {}), (got or {}).get('Q-0002', {}).get('text')], [['Q-0001', 'Q-0002'], 'oui'], 'answers kept (even with « unsent » empty in the store) leave at the next opening', what='at opening')
    c.check_errors()


@case('A151', 'On a phone only one floating note at a time: the next waits until the previous one leaves or is closed, an error goes in front of an information; on a screen they stack as before (SOG-0131)', 'A',
      designs=('standard',), screens=True, night=False,
      rule='SOG-0131 (the user: « une seule note flottante à la fois sur un téléphone »; two notes stacked covered a third of the screen at 390 px, captures D173, L68, A142): at 390 px AppFramework.notify shows one note, queues the others (eight at most, the same key replaces its queued note) and shows the next when the shown one is closed or leaves; an error is shown at once, the information it hid waits at the head of the queue; above 760 px the notes stack')
def a149(c):
    c.open('fuel', wait=False)
    c.until('!!window.SogFrame', timeout=15000, what='the frame')
    c.wait(1500)
    c.js("() => document.querySelectorAll('.f-note [data-x]').forEach(b => b.click())")
    texts = "() => [...document.querySelectorAll('#fNotes .f-note span')].map(s => s.textContent)"
    close = "() => document.querySelector('#fNotes .f-note [data-x]')?.click()"
    c.js("() => { const n = window.SogFrame.notify; n('one', 'info', { key: 'k1' }); n('two', 'ok', { key: 'k2' }); n('three', 'warn', { key: 'k3' }) }")
    if c.phone:
        c.eq(c.js(texts), ['one'], 'at 390 px: one note, the others wait', what='one at a time')
        c.shot(f'A151_note_{c.width}_delivered.png')
        c.js(close)
        c.eq(c.js(texts), ['two'], 'the next appears when the shown one is closed', what='next')
        c.js("() => window.SogFrame.notify('boom', 'err', { key: 'e1' })")
        c.eq(c.js(texts), ['boom'], 'an error goes in front of an information', what='error first')
        c.js("() => window.SogFrame.notify('three again', 'warn', { key: 'k3' })")
        c.js(close)
        c.eq(c.js(texts), ['two'], 'the information the error hid comes back first', what='comes back')
        c.js(close)
        c.eq(c.js(texts), ['three again'], 'a note of the same key replaced its queued one (not twice)', what='replaced')
        c.js(close)
        c.eq(c.js(texts), [], 'nothing left, nothing stuck', what='empty')
    else:
        c.eq(c.js(texts), ['one', 'two', 'three'], 'above 760 px the notes stack as before', what='stacked')
    c.check_errors()


@case('A152', 'The « First time? Start with a short tutorial » card appears ONCE, on the first screen opened, then only in the help (SOG-0131)', 'A',
      designs=('standard',), screens=True, night=False,
      rule='SOG-0131 (the user, answering the questionnaire: « oui, UNE seule fois »): the welcome card of Pilot (frame/help/help.js) is put on the first screen opened and never again on the next ones nor after a reload (it was shown on every module until it was closed or a tutorial opened); the tutorials stay at the top of the help')
def a150(c):
    c.open('flightlog', flights=2, wait=False)
    c.until("!!document.querySelector('[data-module=flightlog]')", timeout=20000, what='the first screen')
    c.until("!!document.querySelector('[data-welcome]')", timeout=15000, what='the welcome card on the first screen')
    c.wait(800)                     # the « seen » mark is written
    c.go('settings')
    c.go('fuel')
    c.wait(1500)
    c.eq(c.count('[data-welcome]'), 0, 'the next screens do not show it again', what='second screen')
    c.page.reload()
    c.until("!!document.querySelector('[data-module=fuel]')", timeout=20000, what='the screen after a reload')
    c.wait(1500)
    c.eq(c.count('[data-welcome]'), 0, 'nor after a reload', what='after reload')
    # the tutorials stay in the help
    c.go('help')
    c.until("!!document.querySelector('[data-screen=help], #fView .f-doc')", timeout=15000, what='the help')
    c.ok(c.count('#fView a[href*="t="]') >= 1 or 'tutorial' in c.js("document.getElementById('fView').innerHTML.toLowerCase()") or 'tutoriel' in c.js("document.getElementById('fView').innerHTML.toLowerCase()"), '', 'the tutorials are still reachable in the help')
    c.check_errors()
