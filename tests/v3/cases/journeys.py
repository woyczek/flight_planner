"""Area J - journeys, end to end (PLAN.md sections N and O; the table is data in tests/v3/journeys.py).

A journey is a path the pilot walks through the application across modules.  Each case below walks one whole path in one
browser, clicking what the pilot clicks, and seeds only what a real backend would give (the airline website, GPS, the
forecast); every such place is said in the case, and a step the suite cannot do is `c.skip_step(reason)`: recorded and
shown under the case in the report, never a silent pass.

  * J1 P1 Préparer un vol        phone (standard, fr) and screen: fill the quote, Carte, Météo, back on Carte;
  * J2 P2 Voler                  phone, four languages: start the flight from fuel, the gear's badge and Status block, Carte, full screen, cancel the start;
  * J3 P3 Rendre compte          phone: a flight without a report, the Status block, handoff, three steps, save, Vols shows it;
  * J4 P4 Relire ses vols        phone: totals, "Without report" filter, search, CSV export of three rows;
  * J5 P5 Installer, synchroniser  phone and screen: no trigram, Réglages, design, offline and back;
  * J6 P6 Carte de mission       SKIP until `tests/v3/fixtures/` holds a mission.

A failure names the step ("P3 step 5 (`#report` prefilled): navigation.dep '' (expected 'LFRS')"): the case stops at the
first failed step.  Seeding goes through lib.py only (`seed_flights`, `seed_plan`, `Ctx.open(flights=, reports=, airfields=)`).
Once per run: no case here is repeated across designs (a journey is slow by nature).
"""
import re

from lib import Fail, Skip, case, norm, tx, ROOT

FU = 'modules/fuel/module.js'
MP = 'modules/maps/module.js'
AT = 'modules/atmosphere/texts.js'
FL = 'modules/flightlog/module.js'
APP = 'frame/app.js'
FUEL = '[data-module="fuel"]'
LANG_IX = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}


# ------------------------------------------------------------------------------------------------------ small helpers
def blur(c):
    """Leaves the field being typed in: the application reads a field on `change` (blur) and redraws, and a tap that arrives
    during that redraw lands on a button that was replaced (the click is lost).  A pilot's tap comes after the blur."""
    c.page.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur()')
    c.wait(700)


def badge(c):
    """('green' | 'amber' | 'off') of the gear (#fDevice, rule 14): data-badge (green) wins over data-attn (amber) in the frame's wording."""
    return c.js("""(() => { const b = document.getElementById('fDevice'); return b.hasAttribute('data-badge') ? 'green' : b.hasAttribute('data-attn') ? 'amber' : 'off' })()""")


def info_rows(c):
    """Rows of the Status block that opens Settings: [{k, text, go}] (Settings opened and closed by the caller)."""
    return c.js("""[...document.querySelectorAll('[data-card="status"] .f-status-list > li')].map(li => ({ k: li.dataset.k, text: (li.innerText || '').replace(/\\s+/g, ' ').trim(),
        go: (li.querySelector('[data-go]') || {}).dataset ? li.querySelector('[data-go]').dataset.go : '' }))""")


def open_info(c):
    """Opens Settings by the gear (the "i" pop-up of the first V3 bar is gone, rule 14) and lists the rows of its Status block."""
    if c.hash() != '#settings':                      # already there (J5 stays in Réglages): the gear would close it
        c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens Réglages')
    c.until("!!document.querySelector('[data-card=\"status\"] .f-status-list > li')", what='the Status block at the top of Réglages lists its rows')
    return info_rows(c)


def close_info(c):
    c.key('Escape')
    c.until("!document.querySelector('[data-card=\"status\"]')", what='Escape closes Réglages and its Status block')


def sheet_title(c):
    """Carte's flight summary: the bare head over the profile writes no title (spec 7.1.13), the handle's label says it."""
    return norm(c.grip())


def design_probe(c):
    """What the design changes in the chrome: the header's and the bar's (or the rail's) colour and font, and the radius token."""
    return c.js("""(() => { const g = (s, ps) => { const e = document.querySelector(s); if (!e) return ''; const cs = getComputedStyle(e); return ps.map(p => cs[p]).join('|') };
        return { head: g('.f-head', ['backgroundColor', 'fontFamily']), nav: g(window.__t.shown(document.getElementById('fTabs')) ? '#fTabs' : '#fNav', ['backgroundColor', 'fontFamily']),
                 radius: getComputedStyle(document.documentElement).getPropertyValue('--sog-radius').trim() } })()""")


def step_btn(c, n):
    """Selector of the fuel step button n (0 = Vol ... 4 = Départ)."""
    return f'{FUEL} button[data-step="{n}"]'


# ------------------------------------------------------------------------------------------------------ J1
@case('J1', 'P1 Préparer un vol', 'J', tags=('journey', 'P1', 'fuel', 'maps', 'atmosphere'), designs=('standard',), screens=True, rule='PLAN N, P1')
def j1(c):
    P = 'P1'
    # the published base knows LFRS, LFML, LFMT and the two fixes: a typed route resolves (the suite has no aerodb otherwise)
    c.step(P, 1, 'Préparer › Devis: aircraft, departure, arrival, alternate, level')
    c.open('fuel', airfields=True)
    c.until("window.__t.shown(document.querySelector('[data-module=fuel] .fu-step'))", timeout=8000, what='Préparer opens on the Devis view (a step is displayed)')
    for k, v in (('dep', 'LFRS'), ('arr', 'LFML'), ('altn', 'LFMT'), ('fl', '270')):
        c.page.fill(f'{FUEL} input[data-k={k}]', v)
    blur(c)
    c.tap(f'{FUEL} [data-do="acopen"]')
    c.page.fill(f'{FUEL} input[data-k="acsearch"]', 'C30J')
    blur(c)
    c.until("!!document.querySelector('[data-module=fuel] [data-pick=\"free:C30J\"]')", what='the aircraft search offers the type C30J')
    c.tap(f'{FUEL} [data-pick="free:C30J"]')
    c.until("(document.querySelector('[data-module=fuel] [data-acpanel]') || {}).className.includes('fu-hide')", what='the aircraft panel closes on a pick')

    c.step(P, 2, 'Route typed, resolved by the published base')
    c.tap(step_btn(c, 1))
    c.page.fill(f'{FUEL} textarea[data-k="rtext"]', 'LFRS LUGEN NEPIX LFML')
    blur(c)
    c.until("/\\d+ NM/.test((document.querySelector('[data-module=fuel] .fu-step:not([hidden])') || {}).innerText || '')", what='the route resolves to a distance (NM)', timeout=8000)
    route_nm = int(re.search(r'(\d+) NM', c.text(f'{FUEL} .fu-step:not([hidden])') or '').group(1))
    c.ok(300 <= route_nm <= 450, f'route distance {route_nm} NM', 'LFRS LUGEN NEPIX LFML is about 370 NM')

    c.step(P, 3, 'Quote: block, trip, time, TOD')
    c.tap(step_btn(c, 3))
    c.until("!!document.querySelector('[data-module=fuel] .fu-result .f-tiles b')", timeout=15000, what='the quote is computed (result bar with its tiles)')
    tiles = c.js("[...document.querySelectorAll('[data-module=fuel] .fu-result .f-tiles > *')].map(t => ({ label: (t.firstChild && t.firstChild.nodeType === 3 ? t.firstChild.textContent : '').trim(), value: ((t.querySelector('b') || {}).textContent || '').trim() }))")
    c.eq([t['label'] for t in tiles], [tx(FU, 'tripS', c.lang), tx(FU, 'time', c.lang), tx(FU, 'todS', c.lang)], 'the quote shows Trip / Time / TOD', what='quote tiles')
    c.ok(all(re.search(r'\d', t['value']) for t in tiles), f'tile values {[t["value"] for t in tiles]}', 'a figure in each of Trip, Time and TOD')
    big = c.text(f'{FUEL} .fu-result .fu-big') or ''
    c.ok(re.search(r'\d', big), f'block fuel {big!r}', 'a block fuel figure')
    ctx_line = c.text(f'{FUEL} .fu-result .fu-ctx') or ''
    fl = re.search(r'FL(\d+)', ctx_line)
    c.ok(fl, f'quote context line {ctx_line!r}', 'the quote names its flight level (FL270)')
    quote_fl = int(fl.group(1))
    c.eq(quote_fl, 270, 'the level typed is the level of the quote', what='quote FL')

    c.step(P, 4, 'Level decision')
    c.ok(norm(tx(FU, 'decision', c.lang)) in norm(c.text(f'{FUEL} .fu-step:not([hidden])') or ''), 'the quote step has no level decision card', f'the card "{tx(FU, "decision", c.lang)}" is on the quote step')

    c.step(P, 5, 'current_flight.json written as planned')
    cf = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d.get('by') == 'fuel' and d.get('route', {}).get('points') and d['route'].get('arr') == 'LFML',
                     what='written by fuel with the resolved route')
    c.eq([cf['route']['dep'], cf['route']['arr'], cf['level']['ft'], cf['aircraft'].get('type')], ['LFRS', 'LFML', 27000, 'C30J'], 'the planned flight carries what was typed', what='current_flight (dep, arr, level, type)')
    c.ok(not (cf.get('started') or {}).get('at'), f'started {cf.get("started")}', 'a planned flight is not started')
    c.le(abs(cf['route']['distanceNm'] - route_nm), 1, 'the record carries the distance of the quote', what='distanceNm vs the route step')

    c.step(P, 6, 'Carte: route, profile, title "Profil · FL · NM · vol prévu"')
    c.go('maps')
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-grip') && /FL\\d+/.test(document.querySelector('.f-sheet-head .f-sheet-grip').title)", timeout=10000, what='the sheet title names the flight')
    title = sheet_title(c)
    m = re.search(r'FL(\d+) · (\d+) NM', title)
    c.ok(m, f'sheet title {title!r}', 'Profil · FL<level> · <distance> NM · vol prévu')
    c.eq(int(m.group(1)), quote_fl, 'the map title carries the quote\'s level', what=f'Carte title {title!r}: FL')
    c.eq(int(m.group(2)), route_nm, 'the map title carries the quote\'s distance (±1 NM)', tol=1, what=f'Carte title {title!r}: NM')
    c.ok(norm(tx(MP, 'stPlanned', c.lang)) in title, f'grip label {title!r}', f'contains "{tx(MP, "stPlanned", c.lang)}" (planned, not started)')
    c.ok(c.shown('.mp-box') or c.shown('.f-overlay'), 'no map area drawn', 'the map is drawn')

    c.step(P, 7, 'Météo: the same flight; "Charger" is the one shot, not clicked')
    c.go('atmosphere')
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-title') && /→/.test(document.querySelector('.f-sheet-head .f-sheet-title').textContent)", timeout=10000, what='the atmosphere title names the flight')
    atitle = norm(c.text('.f-sheet-head .f-sheet-title') or '')   # atmosphere keeps its written title
    c.ok('LFRS → LFML' in atitle, f'atmosphere title {atitle!r}', 'names the same flight: LFRS → LFML')
    c.ok(f'FL{quote_fl}' in atitle, f'atmosphere title {atitle!r}', f'carries the same level FL{quote_fl}')
    load = tx(AT, 'load', c.lang)
    c.ok(c.js("(t) => [...document.querySelectorAll('.f-ov-btn')].some(b => window.__t.shown(b) && b.title.replace(/[\\s\\u00a0\\u202f]+/g, ' ') === t)", norm(load)),
         f'no overlay button titled {load!r}', '"Charger" exists (the user\'s one shot per flight, network blocked: not clicked)')
    c.tap(c.mark('.f-ov-btn', tx(AT, 'infoTitle', c.lang)))
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='Details opens')
    notloaded = norm(tx(AT, 'notLoaded', c.lang)).split('{')[0].strip()[:24]
    c.ok(notloaded in norm(c.text('[data-at="dbody"]') or ''), 'the "forecast not loaded" message is missing from the body', 'the body says the forecast is not loaded')
    c.tap('.f-sheet-close')

    c.step(P, 8, 'back on Carte: the Météo chip')
    c.go('maps')
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-title')", what='Carte is drawn again')
    chip = c.js("(() => { const b = document.querySelector('.mp-chip[data-view=\"weather\"]'); return b ? { hidden: b.hidden, shown: window.__t.shown(b), pressed: b.getAttribute('aria-pressed') } : null })()")
    c.ok(chip is not None, 'no Weather chip in the sheet head', 'the Météo chip is present (shown or hidden, never absent)')
    c.ok(chip['pressed'] in ('true', 'false'), f'Weather chip aria-pressed {chip["pressed"]!r}', 'a toggle (aria-pressed)')
    if chip['shown']:
        c.tap('.mp-chip[data-view="weather"]')               # the cut is drawn from the forecast: none here, but the tap must not break
        c.wait(600)


# ------------------------------------------------------------------------------------------------------ J2
@case('J2', 'P2 Voler', 'J', tags=('journey', 'P2', 'fuel', 'maps'), designs=('standard',), screens=False, langs4=True, rule='PLAN N, P2')
def j2(c):
    P = 'P2'
    c.step(P, 1, 'a planned flight, not started: gear badge off')
    c.open('fuel', flight=True, airfields=True)                       # seed_plan: the planned flight and the base that knows its route
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d is not None, what='the planned flight is in the cache')
    c.wait(500)
    c.eq(badge(c), 'off', 'a planned flight alone gives no badge', what='gear badge')

    c.step(P, 2, 'Préparer › Départ: "Démarrer le vol"')
    c.tap(step_btn(c, 4))
    want = tx(FU, 'start', c.lang)
    c.until("!!document.querySelector('[data-module=fuel] [data-do=start]')", what='the Départ step offers the start button')
    c.eq(norm(c.text(f'{FUEL} [data-do="start"]') or ''), norm(want), 'the start button is worded in the language of the run', what='start button')
    c.tap(f'{FUEL} [data-do="start"]')                                # the real button: the forecast read is blocked (offline path), the start goes on

    c.step(P, 3, 'started = {at, by: fuel} written')
    cf = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and (d.get('started') or {}).get('at'), what='started.at written by the start', timeout=15000)
    c.eq(cf['started'].get('by'), 'fuel', 'the start is written by fuel', what='started.by')
    c.until("location.hash.startsWith('#maps')", timeout=10000, what='the start leads to Carte (#maps?from=fuel)')
    nopos = norm(tx(MP, 'progNoPos', c.lang))
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-title')", timeout=10000, what='Carte is drawn after the start')
    c.until("window.__notes.length > 0", what='Carte says something at mount', timeout=6000)
    c.wait(800)
    c.eq(sum(1 for n in c.note_log() if norm(n) == nopos), 1, 'no GPS, no network: the notification is said once at the mount of Carte', what='no-position notifications after the start')

    c.step(P, 4, 'gear badge green, Status row "Vol en cours › Carte"')
    c.until("document.getElementById('fDevice').hasAttribute('data-badge')", timeout=8000, what='the gear\'s badge turns green once the flight is started')
    rows = open_info(c)
    flight = next((r for r in rows if r['k'] == 'flight'), None)
    c.ok(flight, f'Status rows {[r["k"] for r in rows]}', 'a row "flight" (Vol en cours › Carte)')
    maps_label = tx(APP, 'label', c.lang, after="id: 'maps'")
    c.eq(norm(flight['text']), norm(tx(APP, 'flight', c.lang, after='info: {').replace('{m}', maps_label)), 'the row is worded in the language of the run', what='Status row')
    c.eq(flight['go'], '#maps', 'the row leads to Carte', what='row address')
    c.tap('.f-status-row[data-go="#maps"]')
    c.until("location.hash.startsWith('#maps')", what='a tap on the row opens Carte')

    c.step(P, 5, 'Carte: title "vol en cours", Follow shown, GPS notification once')
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-grip') && /FL\\d+/.test(document.querySelector('.f-sheet-head .f-sheet-grip').title)", timeout=10000, what='the sheet title names the flight')
    flying = tx(MP, 'stFlying', c.lang)
    c.ok(norm(flying) in sheet_title(c), f'sheet title {sheet_title(c)!r}', f'contains "{flying}"')
    c.ok(c.shown('[data-mp="follow"]'), 'the Follow button is not displayed in a started flight', 'Follow shown')
    c.wait(1500)
    c.eq(sum(1 for n in c.note_log() if norm(n) == nopos), 2, 'once per mount of Carte: the start mounted it, the tap on the row mounted it again', what='no-position notifications after the second mount')

    c.step(P, 6, 'sheet notes: the planned progress')
    notes = norm(c.text('.mp-notes') or '')
    c.ok(notes, 'the sheet notes of a started flight are empty', 'the notes carry the planned progress or the position line')

    c.step(P, 7, 'full screen')
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen on')
    c.ok(c.shown('.f-ov-btn') and not c.shown('#fTabs'), 'the bottom bar is displayed in full screen', 'full screen hides the bar and keeps the overlay buttons')
    c.key('Escape')
    c.until("!document.documentElement.classList.contains('f-full')", what='Escape leaves full screen')

    c.step(P, 8, 'end: "Annuler le démarrage" from fuel')
    c.go('fuel')
    c.tap(step_btn(c, 4))
    cancel = tx(FU, 'cancelStart', c.lang)
    c.until("!!document.querySelector('[data-module=fuel] [data-do=cancelstart]')", what='the Départ step offers the cancel button for a started flight')
    c.eq(norm(c.text(f'{FUEL} [data-do="cancelstart"]') or ''), norm(cancel), 'the cancel button is worded in the language of the run', what='cancel button')
    c.tap(f'{FUEL} [data-do="cancelstart"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='the cancellation asks to be confirmed')
    c.tap('.f-modal [data-ok]')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not (d.get('started') or {}).get('at'), what='started null after the cancellation', timeout=8000)

    c.step(P, 9, 'title back to "vol prévu", badge off')
    c.go('maps')
    c.until("!!document.querySelector('.f-sheet-head .f-sheet-grip') && /FL\\d+/.test(document.querySelector('.f-sheet-head .f-sheet-grip').title)", timeout=10000, what='the sheet title names the flight')
    planned = tx(MP, 'stPlanned', c.lang)
    c.ok(norm(planned) in sheet_title(c), f'sheet title {sheet_title(c)!r}', f'contains "{planned}" again')
    c.ok(norm(flying) not in sheet_title(c), f'sheet title {sheet_title(c)!r}', f'no longer "{flying}"')
    c.until("!document.getElementById('fDevice').hasAttribute('data-badge')", timeout=8000, what='the gear\'s badge goes off after the cancellation')
    c.eq(badge(c), 'off', 'nothing to see after the cancellation', what='gear badge')


# ------------------------------------------------------------------------------------------------------ J3
@case('J3', 'P3 Rendre compte', 'J', tags=('journey', 'P3', 'flightlog', 'report'), designs=('standard',), screens=False, rule='PLAN N, P3')
def j3(c):
    P = 'P3'
    c.step(P, 1, 'Vols lists a flight without a report')
    c.open('flightlog', flights=1, reports=0)                          # one line of the website log, no report of its own
    c.until("!!document.querySelector('[data-module=flightlog] .f-tiles')", what='the totals are drawn')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 1", what='one flight is listed')
    tiles = c.js("[...document.querySelectorAll('[data-module=flightlog] .f-tiles > div')].map(d => d.querySelector('b').textContent.trim())")
    c.eq(tiles[2], '1', 'the third total counts the flight without a report', what='"sans CR" total')
    c.ok(c.shown('[data-module="flightlog"] .f-list .f-dot'), 'no warning dot on the line', 'a flight without a report carries the dot')

    c.step(P, 2, 'pending.json (schema 2, handoff) published by flightlog')
    pend = c.until_doc('cache/flightlog/pending.json', lambda d: d and len(d.get('flights') or []) == 1, what='one pending flight published', timeout=8000)
    c.eq(pend.get('schema'), 2, 'the pending record is schema 2', what='pending.json schema')
    fl = pend['flights'][0]
    c.eq([fl['dep'], fl['arr'], fl['registration']], ['LFRS', 'LFML', 'F-ZBMA'], 'the pending flight is the one of the log', what='pending flight (dep, arr, registration)')
    c.eq(fl['source'], 'website', 'its source is the website log', what='pending source')
    c.ok(fl.get('handoff', {}).get('family') and fl['handoff'].get('values', {}).get('navigation.dep') == 'LFRS',
         f'handoff {fl.get("handoff")}', 'a handoff with a family and the values of the flight')

    c.step(P, 3, 'gear badge green, Status row "CR à écrire"')
    c.until("document.getElementById('fDevice').hasAttribute('data-badge')", timeout=8000, what='the gear\'s badge turns green when a report is to write')
    rows = open_info(c)
    row = next((r for r in rows if r['k'] == 'report'), None)
    c.ok(row, f'Status rows {[r["k"] for r in rows]}', 'a row "report" (CR à écrire pour le vol du …)')
    lead = norm(tx(APP, 'report', c.lang, after='info: {').split('{')[0])
    c.ok(norm(row['text']).startswith(lead) and 'LFRS' in row['text'] and 'LFML' in row['text'], f'row {row["text"]!r}', f'starts with "{lead}" and names LFRS and LFML')

    c.step(P, 4, 'tap: pilot/handoff.json written, #report opens')
    c.js("""() => { window.__puts = []; const o = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) {
        try { if (v && v.path) window.__puts.push({ path: v.path, text: String(v.text || '') }) } catch (e) {} return o.call(this, v, k) } }""")
    c.tap(f'.f-status-row[data-go="{row["go"]}"]')
    c.until("location.hash === '#report?from=flightlog'", what='a tap on the row opens #report?from=flightlog')
    c.until("window.__puts.some(p => p.path === 'pilot/handoff.json')", what='pilot/handoff.json is written by the frame')
    import json
    rec = json.loads(next(p for p in c.js('window.__puts') if p['path'] == 'pilot/handoff.json')['text'])
    c.eq([rec.get('to'), rec.get('from')], ['report', 'flightlog'], 'the handoff names its target and origin', what='handoff to / from')

    c.step(P, 5, '#report prefilled (family, values)')
    c.until("[...document.querySelectorAll('[data-module=report] input')].some(i => i.value === 'LFRS')", timeout=8000, what='#report takes the handoff')
    fields = c.js("Object.fromEntries([...document.querySelectorAll('[data-module=report] [data-path]')].map(i => [i.dataset.path, i.value]))")
    day = rec.get('values', {}).get('metadata.date')
    c.ok(re.match(r'\d{4}-\d\d-\d\d$', str(day)), f'handoff date {day!r}', 'the handoff carries the date of the flight')
    for path, want in (('navigation.dep', 'LFRS'), ('navigation.arr', 'LFML'), ('aircraft.0.registration', 'F-ZBMA'), ('aircraft.0.callsign', 'TEST 1'), ('metadata.date', day)):
        c.eq(fields.get(path), want, '`#report` is prefilled from the handoff', what=f'report field {path}')
    c.eq(c.js("document.querySelector('[data-module=report] [data-family]').value"), 'AIRLIFT', 'the family proposed by flightlog (C30J, TRANSPORT)', what='report family')

    c.step(P, 6, 'the three steps')
    steps = c.js("[...document.querySelectorAll('[data-module=report] .f-steps button')].map(b => ({ s: +b.dataset.step, cur: b.getAttribute('aria-current') }))")
    c.eq([s['cur'] for s in steps], ['step', None, None], 'the report opens on step 1', what='steps (aria-current)')
    for hhmm, p in (('09:10', 'timeline.takeoff'), ('10:05', 'timeline.landing')):
        c.page.fill(f'[data-module="report"] [data-path="{p}"]', hhmm)
    blur(c)
    for n in (1, 2):
        c.tap(f'[data-module="report"] .rp-next button[data-step="{n}"]')
        c.until(f"document.querySelector('[data-module=report] .f-steps button[data-step=\"{n}\"]').getAttribute('aria-current') === 'step'", what=f'step {n + 1} becomes active')
    outcome = c.js("[...document.querySelectorAll('[data-module=report] [data-path=\"results.outcome\"] option')].map(o => o.value).filter(Boolean)")
    c.ok(outcome, 'the outcome list is empty', 'an outcome to choose')
    c.page.select_option('[data-module="report"] [data-path="results.outcome"]', outcome[0])
    blur(c)

    c.step(P, 7, 'save (sog-report/1)')
    c.tap('[data-module="report"] [data-do="save"]')
    path = None
    for _ in range(30):
        got = [p for p in c.doc_paths('cr/reports/')]
        if got:
            path = got[0]
            break
        c.wait(200)
    c.ok(path, 'no cr/reports/ record after Enregistrer', 'the report is in the local cache')
    rep = c.doc(path)
    c.eq(rep.get('schema'), 'sog-report/1', 'the record is a sog-report/1', what='report schema')
    c.eq([rep['navigation']['dep'], rep['navigation']['arr'], rep['metadata']['reportedBy']], ['LFRS', 'LFML', 'ABC'], 'the record carries the flight and its author', what='report (dep, arr, reportedBy)')
    c.eq(rep['timeline'].get('takeoff') is not None and rep['timeline'].get('landing') is not None, True, 'the times typed are kept', what='report timeline')

    c.step(P, 8, 'record on the website (same gesture)')
    site = c.js("(() => { const b = document.querySelector('[data-module=report] [data-do=savesite]'); return b ? { disabled: b.disabled, title: b.title } : null })()")
    c.ok(site is not None, 'no "Enregistrer et inscrire sur le site" button', 'the report offers the website recording')
    c.skip_step('no website in the suite: the airline site address is not set (the button is disabled: '
                f'{site["title"]!r}) and no site answers; the recording and its offline queue are not walked here')

    c.step(P, 9, 'Vols shows the report, pending cleared, badge off')
    c.go('flightlog')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 1", what='the flight is still listed')
    c.until("!document.querySelector('[data-module=flightlog] .f-list .f-dot')", what='the flight no longer carries the warning dot')
    tiles = c.js("[...document.querySelectorAll('[data-module=flightlog] .f-tiles > div')].map(d => d.querySelector('b').textContent.trim())")
    c.eq(tiles[2], '0', 'no flight without a report is left', what='"sans CR" total')
    c.until_doc('cache/flightlog/pending.json', lambda d: d is not None and (d.get('flights') or []) == [], what='an empty pending list', timeout=8000)
    c.until("!document.getElementById('fDevice').hasAttribute('data-badge')", timeout=8000, what='the gear\'s badge goes off once nothing is left to report')
    c.eq(badge(c), 'off', 'nothing to see once the report is written', what='gear badge')


# ------------------------------------------------------------------------------------------------------ J4
@case('J4', 'P4 Relire ses vols', 'J', tags=('journey', 'P4', 'flightlog'), designs=('standard',), screens=False, rule='PLAN N, P4')
def j4(c):
    P = 'P4'
    from lib import flight_rows
    rows = flight_rows(3, 2)                                            # three flights: 60, 90 and 120 min; the oldest has no report
    block = sum(r['durationMin'] for r in rows)
    c.step(P, 1, 'Vols: three flights, totals')
    c.open('flightlog', flights=3, reports=2)
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 3", timeout=8000, what='three flights are listed')
    tiles = c.js("[...document.querySelectorAll('[data-module=flightlog] .f-tiles > div')].map(d => d.querySelector('b').textContent.trim())")
    c.eq(tiles[0], '3', 'the first total counts the flights', what='flights total')
    m = re.match(r'(\d+):(\d\d)$', tiles[1])
    c.ok(m, f'block total {tiles[1]!r}', 'hours as H:MM')
    c.eq(int(m.group(1)) * 60 + int(m.group(2)), block, 'the block hours are the sum of the three flights (±1 min)', tol=1, what='block total (min)')
    c.eq(tiles[2], '1', 'one flight lacks a report', what='"sans CR" total')

    c.step(P, 2, 'filter "Without report"')
    c.tap('[data-module="flightlog"] input[data-k="noReport"]')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 1", what='the "Without report" filter keeps one flight')
    c.ok('TEST 3' in (c.text('[data-module="flightlog"] .f-list') or ''), f'list {c.text("[data-module=flightlog] .f-list")!r}', 'the flight kept is the one without a report (TEST 3)')
    c.tap('[data-module="flightlog"] input[data-k="noReport"]')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 3", what='unticking brings the three flights back')

    c.step(P, 3, 'filters: search and period')
    c.page.fill('[data-module="flightlog"] input[data-k="find"]', 'F-ZBMB')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 1", what='the search by registration keeps one flight')
    c.page.fill('[data-module="flightlog"] input[data-k="find"]', '')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 3", what='clearing the search brings the three flights back')
    c.page.select_option('[data-module="flightlog"] select[data-k="days"]', '7')
    c.until("document.querySelectorAll('[data-module=flightlog] .f-list [data-key]').length === 3", what='the 7-day period still holds the three flights (1 to 3 days old)')
    c.page.select_option('[data-module="flightlog"] select[data-k="days"]', '365')

    c.step(P, 4, 'export (CSV)')
    c.tap('[data-module="flightlog"] details > summary')
    c.until("window.__t.shown(document.querySelector('[data-module=flightlog] [data-do=csv]'))", what='"Plus" shows the export button')
    with c.page.expect_download(timeout=8000) as dl:
        c.tap('[data-module="flightlog"] [data-do="csv"]')
    name = dl.value.suggested_filename
    c.ok(re.match(r'my_flights_\d{4}-\d\d-\d\d\.csv$', name), f'download {name!r}', 'my_flights_<date>.csv')
    text = open(dl.value.path(), encoding='utf-8-sig', newline='').read()
    lines = [l for l in text.split('\r\n') if l.strip()]
    c.eq(len(lines), 4, 'the export holds the header and three rows', what='CSV lines')
    c.ok(all(f'TEST {i}' in text for i in (1, 2, 3)), f'CSV {text[:200]!r}', 'a row for each of the three flights')

    c.step(P, 5, 'network sessions (IVAO / VATSIM) merged')
    c.skip_step('no IVAO / VATSIM identifier set and no network in the suite: the merge of the network sessions is not walked here')


# ------------------------------------------------------------------------------------------------------ J5
@case('J5', 'P5 Installer et synchroniser', 'J', tags=('journey', 'P5', 'frame', 'settings'), designs=('standard',), screens=True, rule='PLAN N, P5')
def j5(c):
    P = 'P5'
    c.step(P, 1, 'first launch without trigram: amber badge and the trigram line')
    c.open('fuel', trigram='')
    c.wait(1200)
    c.eq(badge(c), 'amber', 'nothing set: the gear\'s badge is amber', what='gear badge')
    rows = open_info(c)
    who = next((r for r in rows if r['k'] == 'who'), None)
    c.ok(who, f'Status rows {[r["k"] for r in rows]}', 'a row "who" (Trigramme non réglé)')
    c.eq(norm(who['text']).startswith(norm(tx(APP, 'who', c.lang, after='info: {'))), True, 'the line says the trigram is not set', what=f'row {who["text"]!r}')
    close_info(c)
    if not c.phone:
        c.ok(c.shown('#fWho') and c.shown('#fSync'), '#fWho / #fSync are not both displayed at 1280', 'a screen keeps the "Trigramme ?" pastille and the sync dot in its header')

    c.step(P, 2, 'Réglages: the trigram ABC')
    c.tap('#fDevice')
    c.until("location.hash === '#settings'", what='the gear opens Réglages')
    c.until("!!document.querySelector('[data-f=trigram]')", what='the identity card has its trigram field')
    c.page.fill('[data-f="trigram"]', 'abc')
    blur(c)
    c.tap('[data-act="identity"]')
    c.until_doc('device/identity.json', lambda d: d and d.get('trigram') == 'ABC', what='the trigram ABC is written (capitalised)', timeout=8000)
    c.until("!document.getElementById('fDevice').hasAttribute('data-attn') && !document.getElementById('fDevice').hasAttribute('data-badge')", timeout=8000, what='the gear\'s badge goes off once the trigram is set')
    if not c.phone:
        c.until("!window.__t.shown(document.getElementById('fWho'))", timeout=8000, what='the "Trigramme ?" pastille goes away once the trigram is set')

    c.step(P, 3, 'data access and joining the airline')
    c.ok(c.shown('[data-card="access"]'), 'no access card in Réglages', 'Réglages offers the data access (GitHub mode or launcher)')
    c.skip_step('no data repository, token or launcher in the suite: the access setting and "Rejoindre la compagnie" (frame/settings/join.js) are not walked here')

    c.step(P, 4, 'design from Réglages, without reload')
    c.page.evaluate('window.__noReload = 1')
    before = design_probe(c)
    c.tap('[data-design-pick="metro"]')
    c.until("document.documentElement.dataset.design === 'metro'", what='the frame applies the design chosen')
    c.wait(500)
    after = design_probe(c)
    c.eq(c.js('window.__noReload'), 1, 'the page was reloaded by the design choice', what='page life marker')
    c.ok(after['head'] != before['head'], f'header style {after["head"]} (was {before["head"]})', 'the header follows the design chosen')
    c.ok(after['nav'] != before['nav'] or after['radius'] != before['radius'], f'bar style {after["nav"]}, radius {after["radius"]} (was {before["nav"]}, {before["radius"]})', 'the bar or the tokens follow the design chosen')
    c.until_doc('device/design.json', lambda d: d and d.get('design') == 'metro', what='the design is kept on the device', timeout=6000)

    c.step(P, 5, 'language from Réglages')
    c.skip_step('Réglages has no language control (the frame reads sogFrame:lang / repositoryLanguageMode, set by the landing page): '
                'the switch to en without reload is not walked')

    c.step(P, 6, 'offline: amber and the Status line say offline')
    c.context.set_offline(True)
    c.until("document.getElementById('fDevice').hasAttribute('data-attn')", timeout=8000, what='the gear\'s badge turns amber when the device goes offline')
    c.ok('offline' in [r['k'] for r in open_info(c)], 'no "offline" row in the Status block', 'the Status block says the device is offline')
    off = next(r for r in info_rows(c) if r['k'] == 'offline')
    c.eq(norm(off['text']), norm(tx(APP, 'offline', c.lang, after='info: {')), 'the line is the frame\'s offline text', what='offline row')
    close_info(c)

    c.step(P, 7, 'back online: it clears')
    c.context.set_offline(False)
    c.until("!document.getElementById('fDevice').hasAttribute('data-attn')", timeout=10000, what='the amber badge clears when the device is back online')
    c.ok('offline' not in [r['k'] for r in open_info(c)], 'the "offline" row is still there', 'the Status block no longer says offline')
    close_info(c)

    c.step(P, 8, 'conflicts screen and help')
    c.go('conflicts')
    c.ok(c.js("!!document.querySelector('#fView > *')"), 'no conflicts screen drawn', '#conflicts opens')
    c.go('help?m=fuel')
    c.until("((document.querySelector('#fView') || {}).innerText || '').trim().length > 50", what='the help of the module is shown')


# ------------------------------------------------------------------------------------------------------ J6
@case('J6', 'P6 Carte de mission', 'J', tags=('journey', 'P6', 'maps'), designs=('standard',), screens=False, rule='PLAN N, P6')
def j6(c):
    fixtures = ROOT / 'tests' / 'v3' / 'fixtures'
    found = sorted(fixtures.glob('*mission*')) if fixtures.is_dir() else []
    if not found:
        raise Skip('no mission fixture in tests/v3/fixtures/ (a mission YAML of the studio and the way to serve it): '
                   'the mission map is only checked without data by D10')
    raise Skip(f'a fixture is there ({found[0].name}) but the walk is not written yet: add the steps of P6 here')
