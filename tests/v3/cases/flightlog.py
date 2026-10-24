"""Area G - flightlog and report (PLAN.md section G; frame/INTEGRATION.md section 10, modules/flightlog and modules/report).

Rules covered
  * a flight still to report, published by flightlog in `cache/flightlog/pending.json` (schema 2): the gear's badge turns
    green, the Status block at the top of Settings offers a row for it (rule 14), a tap writes `pilot/handoff.json` and opens
    `#report?from=flightlog`, and report takes the hand-over (G1);
  * the flight log opens without error, with its filters and totals, and its empty state in four languages (G2);
  * the report has its three steps, the first one active, and 44 px controls; without data the form is empty (G3).

Cases: G1 G2 G3.  Seeding: `lib.pending_doc()` (cache policy) through the frame's IndexedDB cache, no launcher.
"""
from lib import Fail, Skip, case, norm, tx

FL = 'modules/flightlog/module.js'


@case('G1', 'Pending record', 'G', tags=('frame', 'flightlog'), screens=False, langs4=True, rule='frame/INTEGRATION 10')
def g1(c):
    c.open('fuel', pending=1)
    c.wait(1200)
    c.eq(c.js("document.getElementById('fDevice').hasAttribute('data-badge')"), True, 'the gear\'s badge is green when a report is to write', what='gear data-badge')
    c.js("""() => { window.__puts = []; const o = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v, k) {
        try { if (v && v.path) window.__puts.push({ path: v.path, text: String(v.text || '') }) } catch (e) {} return o.call(this, v, k) } }""")
    c.tap('#fDevice')
    c.until("!!document.querySelector('[data-card=\"status\"] .f-status-row[data-go=\"report:0\"]')", what='the Status block of Settings has a row for the flight to report')
    rowtext = c.text('.f-status-row[data-go="report:0"]') or ''
    c.ok('LFRS' in rowtext and 'LFML' in rowtext, f'row text {rowtext!r}', 'the row names the flight (LFRS, LFML)')
    c.tap('.f-status-row[data-go="report:0"]')
    c.until("location.hash === '#report?from=flightlog'", what='a tap on the row opens #report?from=flightlog')
    c.until("window.__puts.some(p => p.path === 'pilot/handoff.json')", what='pilot/handoff.json is written')
    import json
    rec = json.loads(next(p for p in c.js('window.__puts') if p['path'] == 'pilot/handoff.json')['text'])
    c.eq([rec.get('to'), rec.get('from'), rec.get('family')], ['report', 'flightlog', 'AIRBORNE'], 'the hand-over names its target, origin and family', what='handoff to / from / family')
    c.eq(rec.get('source'), tx('frame/app.js', 'label', c.lang, after="id: 'flightlog'"), 'the source is "My flights" in the language of the run', what='handoff source')
    c.eq(rec['values'].get('navigation.dep'), 'LFRS', 'the values carry the flight', what='handoff navigation.dep')
    c.until("[...document.querySelectorAll('[data-module=report] input')].some(i => i.value === 'LFRS')", what='report takes the hand-over (its departure field shows LFRS)')
    vals = c.js("Object.fromEntries([...document.querySelectorAll('[data-module=report] input')].map(i => [i.name || i.dataset.path || '', i.value]))")
    c.eq([vals.get('metadata.date'), vals.get('aircraft.0.registration'), vals.get('navigation.arr')], ['2026-10-23', 'F-ZBMC', 'LFML'], 'report is prefilled from the hand-over', what='report fields (date, registration, arrival)')


@case('G2', 'Flightlog loads', 'G', tags=('flightlog',), langs4=True, rule='modules/flightlog/SPEC')
def g2(c):
    c.open('flightlog')
    c.until("!!document.querySelector('[data-module=flightlog] .f-tiles')", what='the totals are drawn')
    tiles = c.boxes('[data-module="flightlog"] .f-tiles > div')
    c.eq(len(tiles), 3, 'three totals (flights, block hours, without report)', what='total tiles')
    c.ok(c.count('[data-module="flightlog"] .f-tools select[data-k="days"]') == 1 and c.count('[data-module="flightlog"] .f-tools input[data-k="find"]') == 1
         and c.count('[data-module="flightlog"] .f-tools input[data-k="noReport"]') == 1, 'a filter is missing from .f-tools', 'period, search and "without report" filters')
    empty = c.text('[data-module="flightlog"] .f-list') or ''
    c.eq(norm(empty), norm(tx(FL, 'empty', c.lang)), 'the empty state is worded in the language of the run', what='empty-state text')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='page fits the window')


@case('G3', 'Report three steps', 'G', tags=('report',), rule='modules/report/SPEC')
def g3(c):
    c.open('report')
    c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the three steps are drawn')
    steps = c.js("[...document.querySelectorAll('[data-module=report] .f-steps button')].map(b => ({ t: b.textContent.trim(), cur: b.getAttribute('aria-current'), h: b.getBoundingClientRect().height }))")
    c.eq([s['cur'] for s in steps], ['step', None, None], 'the first step is the active one', what=f'steps {[s["t"] for s in steps]}')
    nxt = c.box('[data-module="report"] .rp-next, [data-module="report"] button[data-next]') or c.js("(() => { const b = [...document.querySelectorAll('[data-module=report] button')].find(b => /→/.test(b.textContent) && window.__t.shown(b)); return b ? window.__t.box(b) : null })()")
    if c.phone:
        c.ok(nxt and nxt['shown'], 'no next control on the first step', 'a "Next" button')
        c.ge(round(nxt['h']), 44, 'the next control is at least 44 px high', what='next control height')
        c.tap(f'[data-module="report"] .f-steps button[data-step="1"]')
        c.until("document.querySelector('[data-module=report] .f-steps button[data-step=\"1\"]').getAttribute('aria-current') === 'step'", what='the second step becomes active')
        prev = c.js("(() => { const b = [...document.querySelectorAll('[data-module=report] button')].find(b => /←/.test(b.textContent) && window.__t.shown(b)); return b ? window.__t.box(b) : null })()")
        if prev:
            c.ge(round(prev['h']), 44, 'the previous control is at least 44 px high', what='previous control height')
    filled = c.js("[...document.querySelectorAll('[data-module=report] input[name^=\"aircraft.0\"], [data-module=report] input[name^=\"navigation.\"]')].filter(i => i.value && i.type !== 'hidden').map(i => i.name + '=' + i.value)")
    c.ok(not filled, f'fields filled without any data: {filled}', 'an empty form')
