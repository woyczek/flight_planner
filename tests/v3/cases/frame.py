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
  * the data laboratory (#datalab, aerodb, temporary): behind Administration at the Full level only, one line per source, 44 px
    buttons (A20); "Test the address" gives a time and a size and names a CORS block (A21); "From a file" with a small SIA zip runs
    the three modes and fills the report, which is copied and kept (A22); the trial publication is greyed with its reason and
    writes only on the button (A23); with a launcher, "From Downloads" takes the newest SIA cycle by the existing route (A24).
    Pass 2 (27 Oct 2026): a direct link on every line (44 px, target _blank, rel noopener), the long-press help unfolded after a
    "blocked by CORS" test and the import put forward (A20, A21); the EAD Basic line asks for no credential (A21); four publication
    buttons, the 120 s silence written in the report, "Clean" lists what it removes, the ten-line summary opens the report (A21,
    A23); the Administration card carries the absolute address of the laboratory with "Copy the link" (A20).

Cases: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15 A16 A17 A18 A19 A20 A21 A22 A23 A24.
"""
import json
import re

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
MODULE_TITLES = {  # meta.title of the non-fixed modules, fr en de es (rule 16)
    'fuel': ('Carburant et niveau', 'Fuel and level', 'Kraftstoff und Flugfläche', 'Combustible y nivel'),
    'report': ('Compte rendu', 'Mission report', 'Einsatzbericht', 'Informe de misión'),
    'flightlog': ('Mes vols', 'My flights', 'Meine Flüge', 'Mis vuelos'),
}


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


ADMIN_FR = {   # Settings > Administration at the Full level, French (the run's language): one button per administrator page
    'tune': 'Réglage des seuils de la carte', 'edge': 'Limite de la zone du vol', 'roadmap': 'Feuille de route', 'diag': 'Diagnostic',
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
    c.tap('#fDevice')                                  # the control that opened the screen closes it
    c.until("location.hash === '#fuel'", what='the gear again returns to the previous module (#fuel)')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='settings reopen')
    c.key('Escape')
    c.until("location.hash === '#fuel'", what='Escape returns to the previous module (#fuel)')
    # rule 18 at the Full level: one card, one button per administrator page; the airline's thresholds file already holds a mode
    profiles = {'schema': 1, 'updated_at': '2026-10-23T18:00:00Z', 'by': 'maps', 'profiles': {'vfr': {'elements': {'zoom': {'vrp': [9.25, 24]}}}}}
    c.open('settings', docs=[['device/level.json', {'level': 3}, 'cache'], ['airline/map_profiles.json', profiles, 'document']])
    c.until("!!document.querySelector('[data-card=\"admin\"]')", what='the Administration card is drawn at the Full level')
    c.eq(c.count('[data-card="admin"]'), 1, 'one Administration card', what='cards')
    ids = c.js("[...document.querySelectorAll('[data-card=\"admin\"] li[data-admin]')].map(li => li.dataset.admin)")
    for k in ADMIN_FR:
        c.ok(k in ids, f'entries {ids}', f'an entry "{k}"')
    c.ok(not any(k in ids for k in ('maintenance', 'firstLaunch', 'mapStudio', 'cfg')), f'entries {ids}', 'no V2 page without a launcher, no export without an access to export')
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


# ------------------------------------------------------------------------------------------------ data laboratory (#datalab)
# frame/aerodb/lab.js: a temporary administration screen of aerodb (frame/aerodb/SPEC.md "Laboratory"), Full level, reached by the
# "Data laboratory" button of the Administration card.  Everything it calls goes through the page (routes of the suite stand in for
# the servers: the suite's network is closed), the token never reaches it (it receives the data layer's GitHub transport).
LAB = 'frame/aerodb/lab.js'
LEVEL3 = [['device/level.json', {'level': 3}, 'cache']]


def lab_zip():
    """A small zip shaped like the SIA export (synthetic fixtures of frame/aerodb/test/fixtures/lab/), as bytes."""
    import io
    import zipfile
    from lib import ROOT
    fx = ROOT / 'frame/aerodb/test/fixtures/lab'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(fx / 'XML_SIA_sample.xml', 'XML_SIA_2026-10-01.xml')
        z.write(fx / 'AIXM4.5_sample.xml', 'AIXM4.5_all_FR_OM_2026-10-01.xml')
        z.writestr('Lisez_moi.txt', 'synthetic')
    return buf.getvalue()


def lab_open(c, **kw):
    c.open('datalab', docs=LEVEL3, **kw)
    c.until("!!document.querySelector('[data-screen=datalab] li[data-src=cifp]')", timeout=15000, what='the laboratory is drawn')


@case('A20', 'Data laboratory: behind Administration at the Full level only; one line per source', 'A', langs4=True,
      rule='frame/aerodb/SPEC "Laboratory"; docs/technique/V3_DONNEES_REGENERATION 1.2 (15 sources without X-Plane and aircraft); 44 px controls')
def a20(c):
    # Everyday level: no button on any card, and the address itself shows why there is nothing
    c.open('settings')
    c.until("!!document.querySelector('[data-card=\"status\"]')", what='the settings are drawn')
    c.eq(c.count('[data-admin="datalab"], a[href="#datalab"]'), 0, 'the button does not exist below the Full level', what='lab buttons at the Everyday level')
    c.page.evaluate("location.hash = '#datalab'")
    c.until("!!document.querySelector('[data-screen=datalab] [data-lab=level]')", what='the address alone gives the level message, not the screen')
    c.eq(c.count('[data-screen=datalab] li[data-src]'), 0, 'no source line below the Full level', what='source lines')
    c.eq(norm(c.text('[data-lab=level]')), norm(tx(LAB, 'level', c.lang)), 'the message is worded in the run\'s language', what='level message')
    # Full level: the button of the Administration card, then the screen
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"] li[data-admin=\"datalab\"]')", what='the Administration card lists the laboratory')
    btn = c.js("(() => { const e = document.querySelector('[data-admin=\"datalab\"]').firstElementChild; return { tag: e.tagName, cls: e.className, href: e.getAttribute('href'), text: e.textContent.trim(), h: e.getBoundingClientRect().height } })()")
    c.ok(btn['tag'] == 'A' and 'f-btn' in btn['cls'] and btn['href'] == '#datalab', f'{btn}', 'a frame button to #datalab')
    c.eq(norm(btn['text']), norm(tx('frame/settings/admin_links.js', 'title', c.lang, after="id: 'datalab'")), 'the button is worded in the language of the run', what='lab button')
    c.ge(btn['h'], 43.5, 'touch target of the frame', what='lab button height')
    # the published address of the laboratory under its link, built from location, copyable (27 Oct 2026)
    here = c.js("new URL('#datalab', location.href).href")
    c.eq(c.text('[data-admin=datalab] [data-adminurl]'), here, 'the absolute address shown under the link is the one of location (published or local)', what='absolute address')
    c.eq(c.js("document.querySelector('[data-admin=datalab] > a').href"), here, 'the link itself is a real <a href="#datalab"> that resolves to that address', what='link href')
    c.eq(c.attr('[data-admin=datalab] > a', 'href'), '#datalab', 'href', what='link')
    c.eq(norm(c.text('[data-admin=datalab] [data-act=adminCopy]')), norm(tx('frame/settings/settings.js', 'copyLink', c.lang)), 'a "Copy the link" button, worded in the language of the run', what='copy button')
    c.ge(c.box('[data-admin=datalab] [data-act=adminCopy]')['h'], 43.5, 'touch target', what='copy button height')
    c.eq(c.count('[data-admin] [data-adminurl]'), 1, 'only the laboratory carries an address', what='addresses')
    c.tap('[data-admin="datalab"] > a')
    c.until("!!document.querySelector('[data-screen=datalab] li[data-src=cifp]')", timeout=15000, what='the laboratory opens')
    c.eq(c.hash(), '#datalab', 'the address is the screen of the frame', what='hash')
    c.eq(norm(c.text('[data-screen=datalab] h1')), norm(tx(LAB, 'title', c.lang)), 'the title is worded in the language of the run', what='h1')
    ids = c.js("[...document.querySelectorAll('[data-screen=datalab] li[data-src]')].map(e => e.dataset.src)")
    want = ['sia', 'geonames', 'mora', 'dircam', 'ukmil', 'navcan', 'openaip', 'enaire', 'adds', 'nats', 'ead', 'nat', 'vac', 'eaip', 'cifp', 'weather']
    c.eq(ids, want, 'one line per source of the table 1.2 (17 without X-Plane and the aircraft types) plus EAD Basic, after NATS', what='source lines')
    bad = c.js("""[...document.querySelectorAll('[data-screen=datalab] li[data-src] :is(button, a.lab-link, summary)')].map(b => ({ s: b.closest('[data-src]').dataset.src, a: b.dataset.act || b.tagName, h: Math.round(b.getBoundingClientRect().height * 10) / 10 })).filter(b => b.h < 43.5)""")
    c.eq(bad, [], 'every button, link and help title is at least 44 px high', what='short controls')
    # pass 2: a real link on every line, to the real address, never an address to copy
    links = c.js("""[...document.querySelectorAll('[data-screen=datalab] li[data-src]')].map(li => { const a = li.querySelector('a.lab-link'); return { s: li.dataset.src, n: li.querySelectorAll('a.lab-link').length, a: a && a.tagName, href: a && a.href,
        target: a && a.target, rel: a && a.rel, addr: li.querySelector('[data-addr]').textContent, h: a ? a.getBoundingClientRect().height : 0, text: a ? a.textContent.trim() : '' } })""")
    c.eq([l['s'] for l in links if l['n'] != 1], [], 'each line has exactly one link while the next cycle is not asked for', what='lines without a single link')
    c.eq([l['s'] for l in links if l['target'] != '_blank' or 'noopener' not in l['rel']], [], 'every link opens in a new tab with rel=noopener', what='links without target/rel')
    c.eq([l['s'] for l in links if l['href'] != l['addr']], [], 'the link goes to the real address of the line (the one shown), nothing to copy', what='links that differ from the address')
    c.eq([l['s'] for l in links if l['h'] < 43.5], [], 'every link is 44 px high', what='short links')
    # the link of each line goes to the host the table says for that source (27 Oct: "every try went to openAIP" on an iPhone)
    hosts = c.js("""[...document.querySelectorAll('[data-screen=datalab] li[data-src] a.lab-link')].filter(a => {
        const s = AeroLabSources.byId(a.closest('li').dataset.src);
        return new URL(a.href).host !== new URL(AeroLabSources.rawUrl(s)).host || a.getAttribute('href') !== AeroLabSources.rawUrl(s) }).map(a => a.closest('li').dataset.src)""")
    c.eq(hosts, [], 'the href of every link has the host (and the address) of its source in the table', what='links to another host than their source')
    c.eq(len(set(l['href'] for l in links)), len(links), 'no two lines share an address', what='distinct links')
    # a touch on the link opens a new tab on the address of the link, for a page (SIA), a file (CIFP) and a JSON (NAT)
    c.context.route(re.compile(r'^https://(?!api\.github\.com)'), lambda route: route.fulfill(status=200, content_type='text/html', body='<p>external</p>'))
    for sid in ('sia', 'cifp', 'nat'):
        loc = c.page.locator(f'li[data-src={sid}] a.lab-link').first
        want = loc.evaluate('a => a.href')
        loc.scroll_into_view_if_needed()
        try:
            with c.context.expect_page(timeout=6000) as opened:
                c.tap(loc)
            tab = opened.value
            got = tab.url
            tab.close()
        except Fail:
            raise
        except Exception as e:
            got = 'no new tab: ' + str(e).splitlines()[0][:100]
        c.eq(got, want, f'a touch on the link of the {sid} line opens a new tab on that line\'s address', what=f'tab opened by {sid}')
    c.context.unroute(re.compile(r'^https://(?!api\.github\.com)'))
    # the test hook of the addresses (localStorage sogLab:urls) answers on a local page only, and only with an https address
    # (or http to the machine itself: the fake servers of A21); a published site ignores it whatever is stored
    gate = c.js("""(async () => {
        const src = await (await fetch('/frame/aerodb/lab_sources.js')).text(), out = {};
        const load = (host, stored) => { const store = { getItem: () => stored }, w = {};
          new Function('window', 'location', 'localStorage', 'self', src)(w, { hostname: host }, store, w); return w.AeroLabSources; };
        const nat = load('127.0.0.1', null), raw = nat.rawUrl(nat.byId('nat')), cases = {
          absent: null, empty: '{}', nul: 'null', bad: '{oops', arr: '["x"]', str: '"abc"', num: '{"nat": 5}', obj: '{"nat": {"a": 1}}',
          js: '{"nat": "javascript:alert(1)"}', web: '{"nat": "http://example.com/x"}', rel: '{"nat": "/x"}', inh: '{"constructor": "https://x.test/"}' };
        for (const [k, v] of Object.entries(cases)) out[k] = load('127.0.0.1', v).urlOf(load('127.0.0.1', v).byId('nat')) === raw;
        const ok = '{"nat": "https://fake.test/n.json"}', loc = '{"nat": "http://127.0.0.1:9/n.json"}';
        out.local_https = load('localhost', ok).urlOf(nat.byId('nat')) === 'https://fake.test/n.json';
        out.local_http = load('127.0.0.1', loc).urlOf(nat.byId('nat')) === 'http://127.0.0.1:9/n.json';
        out.published = load('defa.example.org', ok).urlOf(nat.byId('nat')) === raw && load('defa.example.org', loc).urlOf(nat.byId('nat')) === raw;
        out.published_login = load('defa.example.org', '{"ead-login": "https://fake.test/l"}').loginOf(nat.byId('ead')) === nat.byId('ead').login;
        return out; })()""")
    c.eq([k for k, v in gate.items() if not v], [], 'the hook gives back the table address unless the page is local and the value an https string; a published site ignores it', what='override cases that fail')
    c.ok(all(norm(l['text']).startswith(norm(tx(LAB, 'link', c.lang))) for l in links), f'{[l["text"] for l in links][:3]}', 'the link is worded in the language of the run')
    c.eq(c.js("[...document.querySelectorAll('[data-screen=datalab] li[data-src]')].filter(li => !li.querySelector('details[data-help]') || li.querySelector('details[data-help]').open).map(li => li.dataset.src)"), [],
         'the long-press help exists on every line and is folded until a test says "blocked by CORS"', what='help folded')
    c.ok(norm(tx(LAB, 'helpPhone', c.lang)) in norm(c.js("document.querySelector('li[data-src=cifp] details[data-help]').textContent")), c.text('li[data-src=cifp] details[data-help]'), 'the help gives the long-press gesture in the language of the run')
    pages = c.js("[...document.querySelectorAll('[data-screen=datalab] li[data-src] details[data-help][data-kind=page]')].map(d => d.closest('li').dataset.src)")
    c.eq(pages, ['sia', 'navcan', 'enaire', 'nats', 'ead', 'eaip'], 'a page that is not a file says what to download there (the expected file name)', what='page helps')
    c.ok(norm(tx('frame/aerodb/lab_sources.js', 'get', c.lang, after="id: 'ead'")) in norm(c.js("document.querySelector('li[data-src=ead] details[data-help]').textContent")), 'EAD help', 'the EAD line tells to log in, download the AD 2 pages, then "From a file"')
    c.eq(c.count('li[data-src=ead] [data-act=login]'), 1, 'the EAD line has "Test the login call (empty)"', what='login buttons')
    c.eq(c.count('[data-act=login]'), 1, 'and only that line', what='login buttons')
    c.eq(norm(c.text('li[data-src=ead] [data-act=login]')), norm(tx(LAB, 'login', c.lang)), 'worded in the language of the run', what='login button')
    c.eq(c.js("document.querySelector('li[data-src=ead] [data-addr]').textContent"), 'https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/login/ead-basic/', 'the public login page of EAD Basic', what='EAD address')
    c.eq(c.count('li[data-src=ead] input'), 0, 'no field for a user name or a password on the line', what='credential fields')
    c.eq(c.js("document.querySelector('[data-lab=back]').getAttribute('href')"), '#settings', 'a link back to Settings › Administration opens the screen', what='back link')
    c.ge(c.box('[data-lab=back]')['h'], 43.5, 'touch target', what='back link height')
    c.eq(norm(c.text('[data-lab=back]')), norm(tx(LAB, 'back', c.lang)), 'worded in the language of the run', what='back link')
    c.eq(c.js("[...document.querySelectorAll('[data-screen=datalab] li[data-src]')].filter(e => !e.querySelector('[data-act=test]') || !e.querySelector('[data-act=file]')).length"), 0,
         'each line has "Test the address" and "From a file"', what='lines missing a button')
    c.eq(norm(c.text('li[data-src=cifp] [data-act=test]')), norm(tx(LAB, 'test', c.lang)), 'the test button is worded in the language of the run', what='test button')
    addr = c.js("[...document.querySelectorAll('[data-screen=datalab] [data-addr]')].map(e => e.textContent)")
    c.ok(all(a.startswith('https://') for a in addr) and any('CIFP_261001.zip' in a for a in addr) and any('eAIP_01_OCT_2026' in a for a in addr),
         f'{addr}', 'real addresses, the CIFP and eAIP ones derived from the cycle in force (2610)')
    human = c.js("[...document.querySelectorAll('[data-screen=datalab] li[data-src=sia] .f-warn, [data-screen=datalab] li[data-src=nats] .f-warn')].map(e => e.textContent)")
    c.eq(len(human), 2, 'the SIA and NATS lines name the human gesture', what='gesture lines')
    c.ok(norm(tx('frame/aerodb/lab_sources.js', 'human', c.lang, after="id: 'sia'")).split(' ')[0] in norm(human[0]), f'{human[0]}', 'the SIA line says where the file comes from, in the run\'s language')
    c.eq(c.count('[data-act=downloads]'), 0, '"From Downloads" exists with a launcher only', what='Downloads buttons without launcher')
    sw, iw = hscroll(c)
    c.le(sw, iw, 'no horizontal scroll', what='page width')
    c.eq(c.js("document.querySelector('li[data-src=sia] [data-addr]').textContent.includes('airac-10-26')"), True, 'the SIA line shows the product page of the cycle in force', what='SIA address')
    c.js("(() => { const s = document.querySelector('[data-cycle]'); s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })) })()")
    c.until("document.querySelector('li[data-src=cifp] [data-addr]').textContent.endsWith('CIFP_261029.zip')", what='the next cycle (2611) changes the derived addresses')
    # the cycle in force and, once the next is asked for, the next: two links on the lines whose address follows the cycle
    two = c.js("Object.fromEntries([...document.querySelectorAll('[data-screen=datalab] li[data-src]')].map(li => [li.dataset.src, [...li.querySelectorAll('a.lab-link')].map(a => a.href)]).filter(x => x[1].length > 1))")
    c.eq(sorted(two), ['cifp', 'eaip', 'sia', 'vac'], 'asking for the next cycle adds its link on the four lines that follow the cycle', what='lines with two links')
    c.ok(two['cifp'][0].endswith('CIFP_261001.zip') and two['cifp'][1].endswith('CIFP_261029.zip') and 'AIRAC-2026-10-01' in two['eaip'][0] and 'AIRAC-2026-10-29' in two['eaip'][1], f"{two['cifp']} {two['eaip']}",
         'the CIFP and eAIP links are derived by cycle: 2610 then 2611')
    c.eq(c.js("[...document.querySelectorAll('li[data-src=cifp] a.lab-link')].map(a => a.textContent.trim().slice(-4))"), ['2610', '2611'], 'each link names its cycle', what='link cycles')
    c.shot(f'A20_{c.design}_{c.width}_{c.lang}.png')



def fake_servers():
    """Two local servers on other ports (so, other origins for the page): `ok` answers with the CORS header, `bare` answers
    without it (what most of the aeronautical sources do); a third port with nobody listening.  Returns (urls, calls, stop)."""
    import http.server
    import socket
    import threading
    class Calls(list):
        posts = None
    calls = Calls()
    calls.posts = []     # what the POSTs carried: (path, body, headers) - EAD's login call must carry empty fields and nothing else

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            calls.append(self.path)
            page = self.path.endswith('.html')
            body = ('<html><title>EAD login</title><a href="x.pdf">x</a></html>' if page else
                    json.dumps({'tracks': ['A', 'B'], 'pad': 'x' * 150000}) if self.path.startswith('/ok') else 'PK').encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html' if page else 'application/json' if self.path.startswith('/ok') else 'application/zip')
            if self.path.startswith('/ok'):
                self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            n = int(self.headers.get('Content-Length') or 0)
            calls.append('POST ' + self.path)
            calls.posts.append((self.path, self.rfile.read(n).decode(), {k.lower(): v for k, v in self.headers.items()}))
            body = json.dumps({'loggedIn': False, 'redirect': ''}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            if self.path.startswith('/ok'):
                self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    dead = socket.socket()
    dead.bind(('127.0.0.1', 0))
    dead_port = dead.getsockname()[1]
    dead.close()
    port = srv.server_address[1]
    urls = {'ok': f'http://127.0.0.1:{port}/ok.json', 'bare': f'http://127.0.0.1:{port}/bare.zip', 'dead': f'http://127.0.0.1:{dead_port}/x.geojson',
            'page': f'http://127.0.0.1:{port}/ok-page.html', 'login_ok': f'http://127.0.0.1:{port}/ok-login', 'login_bare': f'http://127.0.0.1:{port}/bare-login'}
    return urls, calls, srv.shutdown


@case('A21', 'Data laboratory: "Test the address" gives a time, a size, and names a CORS block', 'A', designs=('standard',), night=False, langs4=True,
      rule='the main measure of the laboratory: does the server let this page read its answer (CORS), how long, how big')
def a21(c):
    urls, calls, stop = fake_servers()
    try:
        # the table's addresses are replaced, for the test, by the local servers (localStorage "sogLab:urls", read by lab_sources.js)
        c.context.add_init_script("try { localStorage.setItem('sogLab:urls', JSON.stringify({ nat: %s, cifp: %s, openaip: %s, ead: %s, 'ead-login': %s })) } catch (e) {}" %
                                  (json.dumps(urls['ok']), json.dumps(urls['bare']), json.dumps(urls['dead']), json.dumps(urls['page']), json.dumps(urls['login_ok'])))
        # Web Share level 2 as an iPhone offers it (Chromium on Linux has none): the page must offer "Save the result" and "Share the report"
        c.context.add_init_script("window.__shares = []; navigator.canShare = d => !!(d && d.files && d.files.length); navigator.share = async d => { window.__shares.push({ files: (d.files || []).map(f => ({ name: f.name, size: f.size })), text: d.text || null }) }")
        lab_open(c)
        c.eq(calls, [], 'nothing is called before a button is pressed', what='calls on opening')
        # 1. a server that allows the page: code, size and time on the line, and the JSON read
        c.tap('li[data-src=nat] [data-act=test]')
        c.until("/HTTP 200/.test(document.querySelector('li[data-src=nat] [data-res]').textContent)", timeout=8000, what='the NAT line shows the answer')
        line = norm(c.text('li[data-src=nat] [data-res]'))
        c.ok(re.search(r'HTTP 200 · 14\d,?\.?\d* (Ko|KB)\b', line) or re.search(r'HTTP 200 · 1[45]\d (Ko|KB)', line), line, 'OK, code 200, the size of the body (about 146 KB)')
        c.ok(re.search(r'\d+ ms|\d[.,]\d+ s', line), line, 'a duration')
        c.ok('object{tracks,pad}' in line, line, 'the chain read the JSON and says its shape')
        c.eq(c.attr('li[data-src=nat] [data-res]', 'data-kind'), 'ok', 'the line is marked as a success', what='data-kind')
        first = lambda sid: c.js("document.querySelector('li[data-src=%s] [data-actions]').firstElementChild.dataset.act" % sid)
        c.eq(c.js("document.querySelector('li[data-src=nat] details[data-help]').open"), False, 'a permitted read does not unfold the long-press help', what='help after a permitted test')
        c.eq(first('nat'), 'test', '"Test the address" stays first when the cross-origin read is permitted, and the chain ran directly', what='first control (permitted)')
        # a JSON read that worked can be saved by the share sheet (Web Share level 2), under the name of the source
        c.eq(c.count('li[data-src=nat] [data-act=share]'), 1, '"Save the result" appears for a JSON read when the device can share files', what='share button')
        c.eq(norm(c.text('li[data-src=nat] [data-act=share]')), norm(tx(LAB, 'shareFile', c.lang)), 'worded in the language of the run', what='share button')
        c.tap('li[data-src=nat] [data-act=share]')
        c.until("window.__shares.length === 1", what='the share sheet is asked for the file')
        sh = c.js("window.__shares[0]")
        c.ok(sh['files'][0]['name'] == 'nat.json' and 140000 < sh['files'][0]['size'] < 160000, f'{sh}', 'the file nat.json carries the body that was read')
        # 2. a server that answers but sends no CORS header: the diagnosis says so
        c.tap('li[data-src=cifp] [data-act=test]')
        c.until("document.querySelector('li[data-src=cifp] [data-res]').dataset.kind === 'err'", timeout=8000, what='the CIFP line fails')
        c.eq(norm(c.text('li[data-src=cifp] [data-res]')), norm(tx(LAB, 'cors', c.lang)), 'the CORS block is named, in the language of the run', what='CIFP diagnosis')
        # the long-press help unfolds, the link then the import come first and the import is put forward; the test is last
        c.eq(c.js("document.querySelector('li[data-src=cifp] details[data-help]').open"), True, 'a test that says "blocked by CORS" unfolds the long-press help', what='help after a CORS block')
        c.eq(c.js("[...document.querySelector('li[data-src=cifp] [data-actions]').children].map(e => e.dataset.act)"), ['link', 'file', 'test'], 'the link comes first, then the import, then the test', what='control order (blocked)')
        c.ok(c.js("document.querySelector('li[data-src=cifp] [data-act=file]').classList.contains('primary')"), 'class', '"From a file" is put forward (primary)')
        c.ge(c.box('li[data-src=cifp] a.lab-link')['h'], 43.5, 'the link keeps its 44 px', what='link height after the test')
        c.js("document.querySelector('li[data-src=cifp]').scrollIntoView({ block: 'center' })")
        c.shot(f'A21_blocked_{c.width}_{c.lang}.png')
        c.eq(c.count('li[data-src=cifp] [data-act=share]'), 0, 'no "Save the result" for a read that was blocked', what='share button (blocked)')
        c.ok(c.js("document.querySelector('li[data-src=cifp] a.lab-link').href") == urls['bare'], urls['bare'], 'the link opens the very address that was blocked (nothing to copy)')
        # 3. nothing answers: not called a CORS block
        c.tap('li[data-src=openaip] [data-act=test]')
        c.until("document.querySelector('li[data-src=openaip] [data-res]').dataset.kind === 'err'", timeout=8000, what='the openAIP line fails')
        c.eq(norm(c.text('li[data-src=openaip] [data-res]')), norm(tx(LAB, 'unreachable', c.lang)), 'no answer is not called a CORS block', what='openAIP diagnosis')
        c.eq(c.js("document.querySelector('li[data-src=openaip] details[data-help]').open"), False, 'an unreachable host does not unfold the help (the link would not help either way)', what='help after unreachable')
        c.eq(first('openaip'), 'test', 'the test stays first', what='first control (unreachable)')
        # EAD Basic: the public login page, then the login call with EMPTY fields (nothing else is sent), never a credential
        c.tap('li[data-src=ead] [data-act=test]')
        c.until("/HTTP 200/.test(document.querySelector('li[data-src=ead] [data-res]').textContent)", timeout=8000, what='the EAD login page answers')
        c.ok('EAD login' in c.text('li[data-src=ead] [data-res]'), c.text('li[data-src=ead] [data-res]'), 'the page chain read the HTML (title, links)')
        c.tap('li[data-src=ead] [data-act=login]')
        c.until("/loggedIn/.test(document.querySelector('li[data-src=ead] [data-res]').textContent)", timeout=8000, what='the login call answers')
        c.ok('loggedIn=false' in c.text('li[data-src=ead] [data-res]') and 'redirect' not in c.text('li[data-src=ead] [data-res]'), c.text('li[data-src=ead] [data-res]'), 'only the boolean loggedIn of the answer is shown')
        c.eq(len(calls.posts), 1, 'one POST to the login address', what='posts')
        path, body, hdr = calls.posts[0]
        c.ok(path == '/ok-login' and body == 'j_username=&j_password=' and 'cookie' not in hdr and 'authorization' not in hdr and 'x-requested-with' not in hdr and hdr.get('content-type', '').startswith('application/x-www-form-urlencoded'),
             f'{path} {body!r} {sorted(hdr)}', 'the POST carries empty fields, no cookie, no authorization')
        c.js("(() => { const u = JSON.parse(localStorage.getItem('sogLab:urls')); u['ead-login'] = %s; localStorage.setItem('sogLab:urls', JSON.stringify(u)) })()" % json.dumps(urls['login_bare']))
        c.tap('li[data-src=ead] [data-act=login]')
        c.until("document.querySelector('li[data-src=ead] [data-res]').dataset.kind === 'err'", timeout=8000, what='the second login call is blocked')
        c.eq(norm(c.text('li[data-src=ead] [data-res]')), norm(tx(LAB, 'cors', c.lang)), 'a login call the page may not read is named as a CORS block', what='login diagnosis')
        c.ok(all(b == 'j_username=&j_password=' for _, b, _ in calls.posts) and len(calls.posts) >= 2, f'{[b for _, b, _ in calls.posts]}', 'whatever is sent, the fields are empty')
        # a file from the EAD library goes through the pdf chain (magic, "not readable without pypdf") and is counted
        with c.page.expect_file_chooser() as fc:
            c.tap('li[data-src=ead] [data-act=file]')
        c.ok('pdf' in (fc.value.element.get_attribute('accept') or '') and 'zip' in (fc.value.element.get_attribute('accept') or ''), fc.value.element.get_attribute('accept'), 'the picker takes a PDF or a ZIP')
        fc.value.set_files({'name': 'AD_2_EGLL.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4\n% synthetic, no content\n'})
        c.until("/PDF/.test(document.querySelector('li[data-src=ead] [data-res]').textContent) && /AD_2_EGLL\\.pdf/.test(document.querySelector('li[data-src=ead] [data-res]').textContent)", timeout=8000, what='the PDF is measured')
        # the whole report can be shared by the share sheet when the device has one
        c.tap('[data-act=shareReport]')
        c.until("window.__shares.length === 2", what='the share sheet gets the report')
        c.ok(c.js("window.__shares[1].text").startswith('SOG data lab report\ngenerated: '), c.js("(window.__shares[1].text || '').slice(0, 60)"), 'the shared text is the whole report')
        rep = c.text('[data-report]')
        c.ok(re.search(r'\] probe nat\n\s+url: http://127\.0\.0\.1:\d+/ok\.json\n\s+result: OK HTTP 200 .* 14\d KB', rep), rep[-1100:], 'the NAT test is in the report with its url, code, size and time')
        c.ok('BLOCKED BY CORS' in rep and 'UNREACHABLE' in rep, rep[-900:], 'the CORS block and the unreachable host are named in the report')
        c.ok(rep.count('] probe ') == 6, rep[-900:], 'one entry per test: 3 addresses, the EAD page and the two login calls')
        c.eq(len([x for x in calls if x == '/ok.json']), 1, 'the allowed address was read once', what='calls')
        # the ten-line summary opens the report, counted from the entries
        head = rep.split('== summary ==\n')[1].split('\n\n== device ==')[0].split('\n')
        c.ok(1 <= len(head) <= 10, f'{len(head)} lines', 'at most ten lines')
        j = '\n'.join(head)
        c.ok('sources: 4 of 16 tested; files imported by hand: 1 (EAD Basic (EUROCONTROL))' in j, j, 'the sources tested of the table and the files imported')
        c.ok(re.search(r'allowed to read \(2\): NAT tracks of the day \(FAA\), EAD Basic \(EUROCONTROL\)', j) and re.search(r'blocked by CORS \(1\): FAA CIFP \(ARINC 424-18\)', j) and re.search(r'unreachable \(1\): openAIP', j), j,
             'the names of the sources allowed, blocked and unreachable')
        c.ok('EAD Basic: login page OK (HTTP 200), login call blocked by CORS, files imported 1' in j, j, 'the EAD line: login page, login call, files imported')
        c.ok(j.startswith('parsing of the SIA zip: not measured') and 'publication passed: none' in j, j, 'parsing and publication say they were not measured yet')
        c.ok('web share (share / canShare / files json / files geojson): true / true' in rep, rep[:1500], 'the device block says what Web Share allows')
        sw, iw = hscroll(c)
        c.le(sw, iw, 'no horizontal scroll', what='page width')
        c.shot(f'A21_{c.width}_{c.lang}.png')
        # the browser logs the refusals it was asked to measure (the CORS block, the closed port): expected here, not errors of the page
        c.errors[:] = [e for e in c.errors if 'blocked by CORS policy' not in e and 'ERR_CONNECTION_REFUSED' not in e and 'ERR_FAILED' not in e]
    finally:
        stop()


@case('A22', 'Data laboratory: "From a file" with a small SIA zip runs the three modes and fills the report', 'A', designs=('standard',), night=False, langs4=True,
      rule='the chain of V2 in three measured modes (a main thread, b Worker, c Worker streamed); the report is copied and kept on the device')
def a22(c):
    c.context.grant_permissions(['clipboard-read', 'clipboard-write'])
    lab_open(c)
    c.ok(c.js("document.querySelector('[data-act=mode]').disabled"), 'the mode buttons are active without a file', 'greyed until a SIA zip is chosen')
    c.eq(norm(c.text('[data-zipfile]')), norm(tx(LAB, 'zipNone', c.lang)), 'the card says no zip is chosen, in the language of the run', what='zip card')
    with c.page.expect_file_chooser() as fc:
        c.tap('li[data-src=sia] [data-act=file]')
    fc.value.set_files({'name': 'export_xml_bd_SIA_2026-10-01-v02.zip', 'mimeType': 'application/zip', 'buffer': lab_zip()})
    c.until("(document.querySelector('[data-report]').textContent.match(/\\] mode SIA zip, mode [abc]/g) || []).length === 3", timeout=60000, what='the three modes are in the report')
    c.until("/\\] compare modes against each other/.test(document.querySelector('[data-report]').textContent)", timeout=20000, what='the comparison closes the run')
    rep = c.text('[data-report]')
    modes = re.findall(r'\] mode SIA zip, mode ([abc])', rep)
    c.eq(modes, ['c', 'b', 'a'], 'the order is c, b, a (the hungriest last, so a crash keeps what was measured)', what='modes in the report')
    c.ok('name check: ok · cycle 2610 (2026-10-01)' in rep, rep[:700], 'the cycle is read from the file name')
    c.ok(re.search(r'read from the picker: stream \d+ ms.*ArrayBuffer \d+ ms', rep), rep[:900], 'the time to read the file from the picker is measured (stream and ArrayBuffer)')
    for step in ('inflate aixm', 'parse aixm: DOMParser', 'compile (split by kind, JSON)', 'stream aixm (inflate + decode + parse)', 'decode aixm', 'parse sia: airspaces (strings)'):
        c.ok(step in rep, rep[-1400:], f'the step "{step}" has its time in the report')
    c.ok('compare modes against each other' in rep and 'DIFFERENT' not in rep, rep[-900:], 'the three modes give the same counts per kind')
    c.ok(re.search(r'airspaces\(XML_SIA\)=28 rings=40 points=259 vrp=13', rep), rep[-1400:], 'the counts of the synthetic zip (28 spaces, 13 VFR points)')
    c.ok(re.search(r'peak heap seen (\d+ MB|not measurable on this browser)', rep), rep[-1400:], 'the peak heap is a number or says it is not measurable')
    live = norm(c.text('[data-live]'))
    c.ok(live.startswith(norm(tx(LAB, 'modeEnd', c.lang)).split('{m}')[0].strip()), live, 'the live line says mode a ended, in the run\'s language')
    c.eq(norm(c.text('[data-zipfile]')), norm(tx(LAB, 'zipHave', c.lang).replace('{n}', 'export_xml_bd_SIA_2026-10-01-v02.zip').replace('{b}', c.text('[data-zipfile]').split('·')[1].strip())), 'the card names the file', what='zip card')
    c.ok(not c.js("document.querySelector('[data-act=mode]').disabled"), 'the mode buttons stay greyed', 'active once a file is there')
    # one mode again by its own button
    c.tap('[data-act=mode][data-mode=c]')
    c.until("(document.querySelector('[data-report]').textContent.match(/\\] mode SIA zip, mode c/g) || []).length === 2", timeout=30000, what='mode c runs again alone')
    # a wrong file name is said, and the file is measured anyway
    with c.page.expect_file_chooser() as fc:
        c.tap('li[data-src=nats] [data-act=file]')
    fc.value.set_files({'name': 'data.zip', 'mimeType': 'application/zip', 'buffer': lab_zip()})
    c.until("/UNEXPECTED name/.test(document.querySelector('[data-report]').textContent)", timeout=15000, what='the wrong name is reported')
    c.ok(norm(tx(LAB, 'nameBad', c.lang)).split('{n}')[0].strip() in norm(c.text('li[data-src=nats] [data-res]')), c.text('li[data-src=nats] [data-res]'), 'the line says the name is unexpected')
    c.ok('3 entries' in c.text('li[data-src=nats] [data-res]'), c.text('li[data-src=nats] [data-res]'), 'and the zip is measured anyway (3 entries)')
    # the report: copied, kept on the device (cache policy), reloaded at opening
    c.tap('[data-act=copy]')
    c.until("!!document.querySelector('[data-msg]').textContent", what='the copy says what happened')
    clip = c.js("navigator.clipboard.readText().catch(() => '')")
    shown = c.js("(document.querySelector('.sog-copybox') || {}).value || ''")
    c.ok((clip or shown).startswith('SOG data lab report\ngenerated: '), f'clipboard={clip[:60]!r} shown={shown[:60]!r}', 'the whole report is in the clipboard (or shown selected)')
    c.ok('== device ==' in (clip or shown) and 'userAgent' in (clip or shown) and 'end of report' in (clip or shown), (clip or shown)[:300], 'a structured, dated text with the device block')
    d = c.until_doc('cache/lab/report.json', lambda d: d and len(d.get('entries', [])) >= 8, what='the report is kept on the device')
    c.eq(d.get('schema'), 1, 'schema', what='report document')
    c.page.reload(wait_until='load')
    c.until("(document.querySelector('[data-report]') || {}).textContent && /mode SIA zip, mode a/.test(document.querySelector('[data-report]').textContent)", timeout=15000, what='the report is reloaded at opening')
    # an unfinished run (tab killed): noted at the next opening, once
    c.page.evaluate("localStorage.setItem('sogLab:run-started', JSON.stringify({ at: '2026-10-26T10:00:00.000Z', label: 'SIA zip mode a (x.zip)', step: 'parse aixm: DOMParser' }))")
    c.page.reload(wait_until='load')
    c.until("(document.querySelector('[data-crash]') || {}).hidden === false", timeout=15000, what='the crash is said')
    c.ok('previous run did not finish' in c.text('[data-report]') and 'parse aixm: DOMParser' in c.text('[data-report]'), c.text('[data-report]')[-400:], 'the report notes the run that did not end and its last step')
    c.eq(c.js("localStorage.getItem('sogLab:run-started')"), None, 'the trace is erased once told', what='run-started')
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-screen=datalab] li[data-src=cifp]')", timeout=15000, what='reopened')
    c.eq(c.js("document.querySelector('[data-crash]').hidden"), True, 'told once, not again', what='crash note')
    sw, iw = hscroll(c)
    c.le(sw, iw, 'no horizontal scroll', what='page width')
    c.shot(f'A22_{c.width}_{c.lang}.png')


def fake_api(context):
    """A GitHub API for `sog/data` that keeps the files written by trees (inline content) and answers the tree listing; every POST
    of a tree is recorded.  The page reaches it as it reaches the real one (CORS answered)."""
    state = {'posts': [], 'files': {}, 'head': 'a' * 40, 'calls': [], 'hang': False, 'held': []}
    hdr = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}

    def serve(route):
        req = route.request
        u, m = req.url.split('?')[0], req.method
        state['calls'].append((m, u.split('/repos/' + REPO)[1]))
        ok = lambda body, st=200: route.fulfill(status=st, content_type='application/json', headers=hdr, body=json.dumps(body))
        if m == 'OPTIONS':
            return route.fulfill(status=204, headers=hdr)
        if m == 'GET' and u.endswith('/git/ref/heads/main'):
            return ok({'object': {'sha': state['head']}})
        if m == 'GET' and '/git/commits/' in u:
            return ok({'tree': {'sha': 't' * 40}})
        if m == 'GET' and '/git/trees/' in u:
            return ok({'truncated': False, 'tree': [{'path': p, 'type': 'blob', 'sha': f'{i:040x}'} for i, p in enumerate(state['files'], 1)]})
        if m == 'POST' and u.endswith('/git/trees') and state['hang']:
            state['held'].append(route)      # the API never answers (the request stays open): released later by the test
            return
        if m == 'POST' and u.endswith('/git/trees'):
            body = json.loads(req.post_data)
            state['posts'].append(body)
            for t in body['tree']:
                if 'sha' in t and t['sha'] is None:      # a deletion (sha: null); a file carries its content inline
                    state['files'].pop(t['path'], None)
                else:
                    state['files'][t['path']] = t['content']
            return ok({'sha': 'b' * 40}, 201)
        if m == 'POST' and u.endswith('/git/commits'):
            state['head'] = str(len(state['posts'])).rjust(40, 'c')
            return ok({'sha': state['head']}, 201)
        if m == 'PATCH' and '/git/refs/heads/main' in u:
            return ok({'object': {'sha': state['head']}})
        return ok({'message': 'Not Found'}, 404)
    state['serve'] = serve
    context.route(re.compile(r'^https://api\.github\.com/repos/%s/' % REPO), serve)
    return state


def size_text(lang, mb):
    """The size as the screen writes it: decimal comma in fr / de / es, point in en; Mo in French, MB elsewhere."""
    n = {0.5: '0,5', 2: '2', 5.3: '5,3', 10: '10'}[mb]
    return f"{n if lang != 'en' else n.replace(',', '.')} {'Mo' if lang == 'fr' else 'MB'}"


@case('A23', 'Data laboratory: four publication buttons, greyed with their reason, writing only on the button, silence written in the report', 'A', designs=('standard',), night=False, langs4=True,
      rule='"Rien n\'est publié sans le bouton"; one button per size (0.5 / 2 / 5.3 / 10 MB), each with its result or its error in the report, even without an answer after 120 s; "Clean" lists what it removes; the token stays in the data layer')
def a23(c):
    # no repository, no token: greyed, with the reason, and nothing is called
    state = fake_api(c.context)
    lab_open(c)
    sizes = [(524288, 0.5), (2097152, 2), (5560000, 5.3), (10485760, 10)]
    c.eq(c.js("[...document.querySelectorAll('[data-act=pub]')].map(b => +b.dataset.size)"), [z for z, _ in sizes], 'four buttons, one per size: 0.5, 2, 5.3 (the zone fr) and 10 MB', what='publication buttons')
    c.eq(c.js("[...document.querySelectorAll('[data-act=pub]')].map(b => b.textContent.trim())"), [norm(tx(LAB, 'pubN', c.lang).replace('{s}', size_text(c.lang, m))) for _, m in sizes], 'worded with the size, in the language of the run', what='button labels')
    c.eq(c.count('select[data-size]'), 0, 'no size list any more', what='size list')
    c.ok(c.js("[...document.querySelectorAll('[data-act=pub], [data-act=clean]')].every(b => b.disabled)"), 'a button is active without access', 'all five greyed without a repository and a token')
    c.eq(c.js("[...document.querySelectorAll('[data-act=pub]')].map(b => b.getAttribute('aria-disabled'))"), ['true'] * 4, 'aria-disabled', what='publish buttons')
    c.eq(norm(c.text('[data-why]')), norm(tx(LAB, 'noAccess', c.lang)), 'the reason is written, in the language of the run', what='reason')
    c.eq(state['calls'], [], 'the API is not called', what='calls without access')
    c.ge(c.box('[data-act=pub]')['h'], 43.5, 'touch target', what='publish button height')
    c.shot(f'A23_greyed_{c.width}_{c.lang}.png')
    # with an access: active, a repository line, still nothing sent
    c.context.add_init_script(GITHUB_SET)
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-screen=datalab] li[data-src=cifp]')", timeout=15000, what='reopened with an access')
    c.until("![...document.querySelectorAll('[data-act=pub]')].some(b => b.disabled)", what='the buttons come alive with an access')
    c.ok(REPO in c.text('[data-repo]'), c.text('[data-repo]'), 'the repository is named (never the token)')
    c.eq(c.text('[data-why]'), '', 'no reason when it can', what='reason')
    c.ok('120 s' in c.text('[data-lab=publish] p.f-muted'), c.text('[data-lab=publish] p.f-muted'), 'the hint states the delay without an answer: 120 s')
    c.ok(state['posts'] == [] and not any(m != 'GET' for m, _ in state['calls']), f"{state['calls']}", 'nothing is written by opening the laboratory')
    btn = lambda z: f'[data-act=pub][data-size="{z}"]'
    # asked first, No writes nothing
    c.tap(btn(2097152))
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='the writing is asked to be confirmed')
    c.ok(REPO in c.text('.f-modal'), c.text('.f-modal'), 'the question names the repository')
    c.tap('.f-modal [data-no]')
    c.wait(300)
    c.eq(state['posts'], [], 'No writes nothing', what='posts after a refusal')
    # each button: one block of its size, one tree sent, its own entry in the report
    for i, (z, m) in enumerate(sizes, 1):
        c.tap(btn(z))
        c.until("!!document.querySelector('.f-modal [data-ok]')", what='asked')
        c.tap('.f-modal [data-ok]')
        c.until("(document.querySelector('[data-report]').textContent.match(/\\] publish /g) || []).length === %d" % i, timeout=40000, what=f'the {m} MB publication is in the report')
        c.eq(len(state['posts']), i, 'one tree per button', what='posts')
        tree = state['posts'][-1]['tree']
        c.ok(len(tree) == 1 and re.fullmatch(r'lab/essai-[\dT-]+-bloc-%dk\.json' % round(z / 1024), tree[0]['path']), f"{tree[0]['path']}", f'a block file under lab/essai-… named by its size ({m} MB)')
        n = len(tree[0]['content'].encode('utf-8'))
        c.ok(z - 2000 <= n <= z + 2000, f'{n} bytes', f'the block is {m} MB, as the button says')
        c.ok('"lab-filler"' in tree[0]['content'][:80] and 'ghp_' not in tree[0]['content'][:200], tree[0]['content'][:80], 'filler, no data, no token')
    c.ok(all(not t['path'].startswith(('sia/', 'proc/', 'AircraftDB/')) for p in state['posts'] for t in p['tree']), 'paths', 'nothing outside lab/')
    rep = c.text('[data-report]')
    for _, m in sizes:
        c.ok(re.search(r'publish block of %.1f MB\n\s+1 file\(s\), %.1f MB · OK in' % (m, m), rep), rep[-900:], f'the report has the {m} MB block with size and time')
    c.ok('ghp_test' not in c.js('document.documentElement.innerHTML') and 'ghp_test' not in rep, 'the token appears on the page', 'the token is never shown')
    head = rep.split('== summary ==\n')[1].split('\n\n== device ==')[0]
    c.ok(re.search(r'publication passed: 0\.5 MB in .*, 2\.0 MB in .*, 5\.3 MB in .*, 10\.0 MB in ', head) and 'not tried' not in head and 'publication failed' not in head, head, 'the summary lists the four sizes that passed')
    c.ok('== github api limits' in rep and '100 MB' in rep and 'no maximum request size is documented' in rep, rep[rep.index('== github api'):][:500], 'the report writes the limits found in GitHub\'s documentation')
    # the API never answers: after the delay, "no answer after 1.5 s" is written (report and screen), the screen is usable again
    state['hang'] = True
    c.js("localStorage.setItem('sogLab:pubTimeoutMs', '1500')")      # the 120 s of the screen, shortened for the test (read at each press)
    c.tap(btn(10485760))
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='asked')
    c.tap('.f-modal [data-ok]')
    c.until("(document.querySelector('[data-report]').textContent.match(/\\] publish /g) || []).length === 5", timeout=20000, what='the silence is written in the report')
    rep = c.text('[data-report]')
    c.ok(re.search(r'publish block of 10\.0 MB\n\s+1 file\(s\), 10\.0 MB · NO ANSWER in 1\.50 s', rep) and 'error: no answer after 1.5 s' in rep, rep[-600:], 'the report says NO ANSWER and the delay')
    c.eq(norm(c.text('[data-pubres]')), norm(tx(LAB, 'pubTimeout', c.lang).replace('{s}', '1.5')), 'the screen says it too, in the language of the run', what='silence line')
    c.ok(re.search(r'publication failed: 10\.0 MB \(no answer after 1\.5 s\)', rep.split('== device ==')[0]) and re.search(r'publication passed: 0\.5 MB in .*, 2\.0 MB in .*, 5\.3 MB in', rep.split('== device ==')[0]), rep[:900], 'the summary moves it from passed to failed')
    c.ok(not c.js("document.querySelector('[data-act=pub]').disabled"), 'busy', 'the buttons are usable again after the silence')
    # the answer finally comes: the late result is written too (the write may have succeeded in spite of the silence)
    state['hang'] = False
    for route in state['held']:
        state['serve'](route)
    c.until("/\\] publish block of 10\\.0 MB \\(late answer\\)/.test(document.querySelector('[data-report]').textContent)", timeout=20000, what='the late answer is written')
    rep = c.text('[data-report]')
    c.ok(re.search(r'publication passed: .*10\.0 MB in .* \(late answer\)', rep.split('== device ==')[0]), rep[:900], 'the summary names the late answer')
    # clean: lists what it removes (screen and report), in one commit
    before = list(state['files'])
    nposts = len(state['posts'])
    c.tap('[data-act=clean]')
    c.until("(document.querySelector('[data-report]').textContent.match(/\\] clean /g) || []).length === 1", timeout=15000, what='the cleaning is in the report')
    c.eq(len(state['posts']), nposts + 1, 'the cleaning sends one commit', what='trees sent')
    c.eq(sorted(t['path'] for t in state['posts'][-1]['tree']), sorted(before), 'the cleaning removes every trial file', what='deleted paths')
    c.ok(all(t.get('sha') is None for t in state['posts'][-1]['tree']), f"{state['posts'][-1]['tree']}", 'as deletions')
    c.eq(state['files'], {}, 'nothing is left in the repository', what='files')
    c.eq(norm(c.text('[data-pubres]')), norm(tx(LAB, 'cleanOk', c.lang).replace('{n}', str(len(before))).replace('{l}', ', '.join(before))), 'the line lists the files it removed', what='clean line')
    c.ok(('removed: ' + ', '.join(before)) in c.text('[data-report]'), c.text('[data-report]')[-700:], 'and the report lists them too')
    c.tap('[data-act=clean]')
    c.until("/Nothing|Rien|Nichts|Nada/.test(document.querySelector('[data-pubres]').textContent)", what='a second cleaning finds nothing')
    c.eq(norm(c.text('[data-pubres]')), norm(tx(LAB, 'cleanNone', c.lang)), 'and says so', what='nothing to clean')
    # offline: greyed with its reason
    c.context.set_offline(True)
    c.page.evaluate("window.dispatchEvent(new Event('offline'))")
    c.until("document.querySelector('[data-act=pub]').disabled", what='offline greys the publication')
    c.eq(norm(c.text('[data-why]')), norm(tx(LAB, 'offline', c.lang, after='csp:')), 'and says offline', what='reason offline')
    c.context.set_offline(False)


@case('A24', 'Data laboratory: with a launcher, "From Downloads" takes the newest SIA cycle by the existing route', 'A', designs=('standard',), night=False, langs4=True,
      rule='user 26 Oct 2026: the SIA zip arrives in Downloads; GET /__setup/downloads?glob=…; the name gives the cycle; shown by name and date')
def a24(c):
    zip_bytes = lab_zip()
    asked = []

    def status(route):
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'server': 'sog', 'git': False, 'data': False, 'dataGit': False, 'host': 'test-pc', 'lan': False}))

    def downloads(route):
        url = route.request.url
        asked.append(url.split('/__setup/')[1])
        assert route.request.headers.get('x-sog-setup') == '1', 'the route is called with the launcher header'
        if '&info' in url:
            files = [{'name': 'export_xml_bd_SIA_2026-09-03-v04.zip', 'size': 5800000, 'mtime': 1790000000},
                     {'name': 'export_xml_bd_SIA_2026-10-01-v01.zip', 'size': 5800001, 'mtime': 1790000100},
                     {'name': 'export_xml_bd_SIA_2026-10-01-v02.zip', 'size': len(zip_bytes), 'mtime': 1789000000}]
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': files, 'where': ['Downloads']}))
        route.fulfill(status=200, content_type='application/octet-stream', body=zip_bytes)
    c.context.route(re.compile(r'/__setup/status$'), status)
    c.context.route(re.compile(r'/__setup/downloads\?'), downloads)
    lab_open(c)
    c.eq(c.count('[data-act=downloads]'), 3, 'the SIA, NATS and CIFP lines offer "From Downloads" on a workstation with the launcher', what='Downloads buttons')
    c.eq(c.js("[...document.querySelectorAll('[data-act=downloads]')].map(b => b.closest('li').dataset.src)"), ['sia', 'nats', 'cifp'], 'on the three lines that take a file', what='lines')
    c.eq(norm(c.text('li[data-src=sia] [data-act=downloads]')), norm(tx(LAB, 'fromDownloads', c.lang)), 'worded in the language of the run', what='button')
    c.ge(c.box('li[data-src=sia] [data-act=downloads]')['h'], 43.5, 'touch target', what='button height')
    c.tap('li[data-src=sia] [data-act=downloads]')
    c.until("(document.querySelector('[data-report]').textContent.match(/\\] mode SIA zip, mode [abc]/g) || []).length === 3", timeout=60000, what='the zip taken from Downloads goes through the three modes')
    c.ok(asked[0].startswith('downloads?glob=export_xml_bd_sia_*.zip&info'), f'{asked}', 'the existing route, with the declared pattern, lists first')
    c.ok(any('&name=export_xml_bd_SIA_2026-10-01-v02.zip' in a for a in asked), f'{asked}', 'the newest cycle and version by the date in the name (not by file date) is fetched')
    rep = c.text('[data-report]')
    c.ok('picked from Downloads by the launcher (Downloads)' in rep and 'name check: ok · cycle 2610 (2026-10-01)' in rep, rep[:900], 'the report says where it came from and the cycle read from the name')
    c.ok(norm(c.text('[data-zipfile]')).startswith(norm(tx(LAB, 'zipHave', c.lang)).split('{n}')[0].strip()) and 'export_xml_bd_SIA_2026-10-01-v02.zip' in c.text('[data-zipfile]'), c.text('[data-zipfile]'), 'the card names the file')
