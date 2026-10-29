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

Cases: A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15 A16 A17 A18 A19 A20 A25 A26 A27 A28 A29 A30 A31 A32 A33 A34.
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
    c.open('settings', docs=aero_docs(cycle=prev.isoformat()))
    c.until("!!document.querySelector('[data-card=\"status\"] li[data-k=\"cycle-base\"]')", timeout=15000, what='the end-of-cycle line of the base')
    want = tx('frame/app.js', 'cycleOld', c.lang).replace('{s}', tx('frame/app.js', 'cycleBase', c.lang)).replace('{c}', name)
    c.eq(norm(c.text('[data-card="status"] li[data-k="cycle-base"] .f-status-txt span')), norm(want), 'worded in the language of the run, the AIRAC name of the published cycle', what='base line')
    c.ok(c.js("document.querySelector('[data-card=\"status\"] li[data-k=\"cycle-base\"] .f-status-dot').hasAttribute('data-attn')"), 'no amber dot', 'an amber dot (attention)')
    c.eq(c.count('[data-card="status"] li[data-k="cycle-proc"]'), 0, 'no procedures index published: no procedures line', what='proc lines')
    c.eq(c.count('[data-card="status"] li[data-k="cycle-base"] [data-go]'), 0, 'no launcher here: nothing to press', what='links on the line')
    # the base of the cycle in force (the suite's own seed, lib.AERO_CYCLE): no line
    c.open('settings', aero=True)
    c.wait(1500)
    c.eq(c.count('[data-card="status"] li[data-k^="cycle-"]'), 0, 'a base of the cycle in force: no end-of-cycle line', what='cycle lines')


@case('A32', 'EAD Basic credentials in the launcher keys panel', 'A', designs=('standard',), screens=False, night=False,
      rule='frame/settings SPEC 3 item 9: given once, never read back')
def a32(c):
    # the suite has no launcher: a fake one answers the routes the Settings screen asks for (detect(), secrets, the rest empty)
    posts = []
    status = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
              'relaxNav': False, 'host': 'TEST', 'lan': False}
    secrets = {'app': {'ivao': {'apiKey': {'set': False, 'hint': ''}},
                       'ead': {'user': {'set': False, 'at': ''}, 'password': {'set': False, 'at': ''}}}, 'user': {}}

    def launcher(route):
        req = route.request
        path = urllib.parse.urlparse(req.url).path
        body = {}
        if path.endswith('/__setup/status'):
            body = status
        elif path.endswith('/__setup/secrets'):
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
    # save: the launcher receives both values, the page keeps none
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
      rule='frame/INTEGRATION 6 (29 Oct): progress.actual.trail, one point per NM or per minute, turns kept, 500 points at most, never carried to another start')
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
    c.eq(r['point'], [48.01667, 2, 3000, 30], 'a point is [lat, lon, altFt, s since the start]', what='point shape')
    c.eq((r['before'], r['junk']), (0, 1), 'a position before the start is not a point; a malformed track is dropped', what='guards')
    src = (ROOT / 'frame' / 'app.js').read_text(encoding='utf-8')
    c.ok("TR.next(prev?.at && String(prev.at) >= String(cur.started.at) ? prev.trail : []" in src, '', 'the frame carries on only a track of the same start')

