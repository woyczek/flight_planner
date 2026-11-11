"""Area G - flightlog and report (PLAN.md section G; frame/INTEGRATION.md section 10, modules/flightlog and modules/report).

Rules covered
  * a flight still to report, published by flightlog in `cache/flightlog/pending.json` (schema 2): the gear's badge turns
    green, the Status block at the top of Settings offers a row for it (rule 14), a tap writes `pilot/handoff.json` and opens
    `#report?from=flightlog`, and report takes the hand-over (G1);
  * the flight log opens without error, with its filters and totals, and its empty state in four languages (G2);
  * the report has its three steps, the first one active, and 44 px controls; without data the form is empty (G3);
  * the report screen with a prefilled flight is uniform and never overflows on a phone (G4).

Cases: G1 G2 G3 G4.  Seeding: `lib.pending_doc()` (cache policy) through the frame's IndexedDB cache, no launcher.
"""
import json
import os
import re

from lib import ROOT, Fail, Skip, case, norm, tx

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


@case('G5', 'Report: the record carries the code of the current airline (airline)', 'G', tags=('report',), screens=False,
      designs=('standard',), rule='V3 spec 10.38 step 1: the CR names its airline (ctx.airline.code); a record already saved keeps its own')
def g5(c):
    idx = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
           ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air'}, 'document']]
    for docs, want in ((idx, 'aaa'),):   # without an index the code is « default »: the frame's A94 (ctx.airline.code)
        c.open('report', docs=docs)
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
        c.wait(600)   # ctx.airline is read in the background (frame-airline)
        before = set(c.doc_paths('cr/reports/'))
        c.tap('[data-module="report"] [data-do="save"]')
        path = None
        for _ in range(40):
            got = [p for p in c.doc_paths('cr/reports/') if p not in before]
            if got:
                path = got[0]
                break
            c.wait(200)
        c.ok(path, 'no record', 'the report is saved')
        c.eq(c.doc(path).get('airline'), want, f'the record names its airline ({want})', what='airline')


@case('G6', 'Report: « Mesures » reads Fuel Phase Monitor journals, proposes the flight whose registration and UTC times overlap the report, keeps its aggregate once kept',
      'G', tags=('report',), screens=False, designs=('standard',), langs4=True,
      rule='V3 spec 10.37 A step 3: modules/stats/phases.js flights(); the report\'s times are UTC (timeline.tz Z); one aggregate written in the record '
      '(measured: flightId, fuelKg, minutes, phases, cruise) after « Garder ce vol », nothing raw kept; an invented journal, never a file of the user')
def g6(c):
    import tempfile
    from pathlib import Path
    head = ['schema_version', 'flight_id', 'phase', 'aircraft_icao', 'registration', 'start_utc', 'end_utc', 'duration_sec', 'fuel_kg', 'fuel_coverage_pct',
            'mean_fuel_flow_kg_h', 'engine_count', 'engine_fuel_flow_kg_h', 'mean_pressure_altitude_ft', 'mean_ias_kt', 'mean_tas_kt', 'mean_vertical_speed_fpm',
            'mean_engine_rpm', 'quality_flags', 'start_lat', 'start_lon', 'end_lat', 'end_lon']
    rows = [['0.4.1', 'FPM-1', 'CRUISE', 'XTST', 'F-TEST', f'2026-11-09T08:{i:02d}:00Z', f'2026-11-09T08:{i:02d}:15Z', 15, 0.5, 100, 120, 1, 120, 8000, 150, 170, 0, 2300, '',
             45, 1, 45.2, 1.2] for i in range(4)]
    rows += [['0.4.1', 'FPM-0', 'CRUISE', 'XTST', 'F-TEST', '2026-11-08T10:00:00Z', '2026-11-08T10:00:15Z', 15, 0.5, 100, 120, 1, 120, 8000, 150, 170, 0, 2300, '',
              45, 1, 45.2, 1.2]]
    c.open('report')
    c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
    for path, v in (('aircraft.0.registration', 'F-TEST'), ('metadata.date', '2026-11-09'), ('timeline.takeoff', '08:00'), ('timeline.landing', '08:20')):
        c.page.fill(f'[data-module="report"] [data-path="{path}"]', v)
        c.page.locator(f'[data-module="report"] [data-path="{path}"]').blur()
    c.tap('[data-module="report"] .f-steps button[data-step="2"]')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'FuelPhaseMonitor_test.csv'
        f.write_text('\n'.join(','.join(str(x) for x in r) for r in [head] + rows), encoding='utf-8')
        c.page.set_input_files('[data-module="report"] input[data-measfile]', str(f))
        c.until("!!document.querySelector('[data-module=report] [data-measflight]')", what='the matching flight proposed')
    c.eq(c.js("[...document.querySelectorAll('[data-module=report] [data-measflight]')].map(e => e.dataset.measflight)"), ['FPM-1'],
         'only the flight of F-TEST whose UTC times overlap 08:00–08:20Z (not the one of the day before)', what='proposed')
    c.tap('[data-module="report"] [data-do="measkeep"][data-id="FPM-1"]')
    c.until("!!document.querySelector('[data-module=report] [data-measured]')", what='the kept aggregate said')
    before = set(c.doc_paths('cr/reports/'))
    c.tap('[data-module="report"] [data-do="save"]')
    path = None
    for _ in range(40):
        got = [p for p in c.doc_paths('cr/reports/') if p not in before]
        if got:
            path = got[0]
            break
        c.wait(200)
    c.ok(path, 'no record', 'the report is saved')
    m = c.doc(path).get('measured') or {}
    c.eq([m.get('flightId'), m.get('fuelKg'), m.get('minutes'), (m.get('cruise') or {}).get('rpm'), 'rows' in m],
         ['FPM-1', 2.0, 1, 2300, False], 'the aggregate in the record (2 kg, 1 min, 2300 rpm), no raw window', what='measured')


# G4: what the screen of a prefilled report measures (one round trip).  Fields are the inputs and selects of the grids of the
# visible step; a "card" is the `.f-card` that holds them; the grid's font sizes are those of its labels and its controls.
_G4_JS = r"""() => {
  const root = document.querySelector('[data-module=report]'), W = window.innerWidth, r2 = Math.round;
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' };
  const steps = [...root.querySelectorAll('.rp-step')].filter(s => !s.hidden && s.offsetParent);
  const out = { sw: document.documentElement.scrollWidth, iw: W, over: [], cards: [], sizes: [], badges: 0, h2: [], bar: null };
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e) || e.closest('.f-scroll')) continue;
    const r = e.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) out.over.push(e.tagName.toLowerCase() + '.' + (e.className || '') + ' right=' + r2(r.right));
  }
  const sizes = new Set();
  for (const st of steps) {
    for (const c of st.querySelectorAll('.f-card')) {
      if (!vis(c)) continue;
      const hs = [...c.querySelectorAll('.f-grid input:not([type=hidden]), .f-grid select')].filter(vis).map(i => i.getBoundingClientRect().height);
      if (hs.length) out.cards.push({ n: hs.length, min: Math.min(...hs), max: Math.max(...hs), t: (c.querySelector('h2, summary') || {}).textContent });
      c.querySelectorAll('.f-grid label > span, .f-grid input, .f-grid select').forEach(e => { if (vis(e)) sizes.add(getComputedStyle(e).fontSize) });
    }
    st.querySelectorAll('h2').forEach(h => { if (vis(h)) out.h2.push(getComputedStyle(h).fontSize) });
    out.badges += st.querySelectorAll('.f-grid .f-badge, label .f-badge').length;
  }
  out.sizes = [...sizes];
  const bar = root.querySelector('.f-bar');
  if (bar) {
    const bs = [...bar.querySelectorAll('button')];
    out.bar = { h: bar.getBoundingClientRect().height, btns: bs.map(b => ({ t: b.textContent.trim(), h: b.getBoundingClientRect().height, fs: getComputedStyle(b).fontSize,
      fw: getComputedStyle(b).fontWeight, right: b.getBoundingClientRect().right })) };
  }
  out.prefill = root.querySelectorAll('.rp-src').length;
  return out;
}"""


@case('G4', 'Report screen uniform, no overflow', 'G', tags=('report',), langs4=True, rule='modules/report/SPEC 2; frame/design/SPEC 2 (tokens)')
def g4(c):
    where = lambda w, tone, step: f'{w}px {tone} step {step + 1}'
    widths = (390, 360) if c.phone else (c.width,)
    for w in widths:
        for tone in ('day', 'night'):
            c.page.set_viewport_size({'width': w, 'height': 780 if w == 360 else c.height})
            c.open('report', flight=True, tone=tone)
            c.until("!!document.querySelector('[data-module=report] [data-do=current]')", what='the current-flight card is offered')
            c.tap('[data-module="report"] [data-do="current"]')
            c.until("[...document.querySelectorAll('[data-module=report] input')].some(i => i.value === 'F-RAJA')", what='the flight prefills the form')
            c.settle()
            for step in (0, 1, 2) if c.phone else (0,):
                if step:
                    c.tap(f'[data-module="report"] .f-steps button[data-step="{step}"]')
                    c.settle()
                m = c.js(_G4_JS)
                at = where(w, tone, step)
                c.le(m['sw'], m['iw'], f'no horizontal scroll ({at})', what='scrollWidth')
                c.ok(not m['over'], f'{at}: {m["over"][:3]}', 'no element beyond the right edge of the window', 'modules/report/SPEC 2')
                c.ok(not m['badges'], f'{at}: {m["badges"]} source badge(s) in the field grids', 'no badge in the grid (one muted line under the title)')
                for k in m['cards']:
                    c.le(round(k['max'] - k['min'], 1), 2, f'the fields of a card have one height ({at}, card "{(k["t"] or "").strip()[:24]}")', what='height spread (px)')
                    c.ge(round(k['min']), 44, f'a field is at least 44 px high ({at})', what='field height')
                c.ok(len(m['sizes']) <= 2, f'{at}: {m["sizes"]}', 'at most two font sizes in the grids (label, value)')
                c.ok(len(set(m['h2'])) <= 1, f'{at}: {sorted(set(m["h2"]))}', 'one size for the card titles (h2 of the frame)')
                if m['bar']:
                    b = m['bar']
                    c.le(round(b['h']), 112, f'the save bar is low ({at})', what='bar height')
                    for x in b['btns']:
                        c.ok(x['h'] <= 48, f'{at}: "{x["t"]}" is {round(x["h"])} px high', 'one line of 44 px per button, never folded')
                        c.ge(round(x['right']), 1, 'the button is drawn')
                    c.ok(len({(x['fs'], x['fw']) for x in b['btns']}) == 1, f'{at}: {[(x["fs"], x["fw"]) for x in b["btns"]]}', 'both save buttons have the same font size and weight')
            if tone == 'day' and w == widths[0]:
                c.ok(m['prefill'] >= 1, 'no provenance line', 'a muted line "Prefilled from: ..." under a card title')
    own = re.findall(r'font-size\s*:\s*(?!var\(--sog-size)[^;}"]+', (ROOT / 'modules/report/module.js').read_text(encoding='utf-8'))
    c.ok(not own, f'font-size of the module: {own[:3]}', 'no font-size of its own, only --sog-size-* tokens')
    c.check_errors()


def _cat_docs(category, draft=False):
    """An invented airline of kind « va » (its commercial group is active: frame/lib/mission_categories.js) and the planned flight of a
    mission of that category (current_flight.missionCategory, written by Fuel from the mission); draft=True keeps the report's draft."""
    from lib import flight_docs
    docs = flight_docs()
    docs[1][1]['mission'] = 'X-201A'
    docs[1][1]['missionCategory'] = category
    return docs + [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
                   ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
                   # an empty draft: each scenario starts a new report (the browser's store outlives c.open, and a draft is the report in progress)
                   *([] if draft else [['cache/report/draft.json', {}, 'cache']])]


@case('G7', 'Report: a flight of a mission of category « fret » asks the freight carried, « passagers » the passengers; an unknown category is ignored',
      'G', tags=('report', 'missions'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.38 / SOG-0041: the report of a commercial flight carries the load its category says (freight in kg, passengers), '
      'nothing else; categories.json absent = the common base; a category the airline does not know is ignored, nothing invented; '
      'SOG-0202 T2 (§ 10.48): the category is read as its theme and series (fret → COMMERCIAL / CARGO), the load is the series\' and the report has '
      'the last word on its family and series: a flight without theme keeps them')
def g7(c):
    for cat, want in (('fret', 'freight'), ('passagers', 'passengers'), ('zzz-inconnue', None)):
        c.open('report', docs=_cat_docs(cat))
        c.until("!!document.querySelector('[data-module=report] [data-do=current]')", timeout=10000, what='the current-flight card is offered')
        c.wait(400)   # the airline's categories are read at mount
        c.tap('[data-module="report"] [data-do="current"]')
        c.until("[...document.querySelectorAll('[data-module=report] input')].some(i => i.value === 'F-RAJA')", what='the flight prefills the form')
        c.settle()
        got = c.js("[...document.querySelectorAll('[data-module=report] [data-loadcard]')].map(e => [e.dataset.loadcard, [...e.querySelectorAll('input[data-load]')].map(i => i.dataset.load)])")
        if want is None:
            fam = c.js("[document.querySelector('[data-module=report] select[data-family]')?.value || '', (document.querySelector('[data-module=report] [data-path=series]') || {}).value || '']")
            c.ok(fam[0] != 'ZZZ-INCONNUE' and 'zzz' not in str(fam).lower(), fam, f'an unknown category ({cat}) invents no family nor series')
            exp = [['freight', ['freightKg']]] if fam == ['COMMERCIAL', 'CARGO'] else [['passengers', ['passengers']]] if fam[0] == 'COMMERCIAL' and fam[1] in ('PASSENGERS', 'VIP') else []
            c.eq(got, exp, 'the load asked is the series\' only (nothing from the unknown category)', what='unknown category')
            continue
        c.eq(got, [[want, ['freightKg' if want == 'freight' else 'passengers']]], f'the category {cat} asks one field: its load', what=cat)
        if want == 'freight':
            if c.js("!!document.querySelector('[data-module=report] .f-steps button[data-step=\"2\"]')?.offsetParent"):
                c.tap('[data-module="report"] .f-steps button[data-step="2"]')   # a phone: one step at a time, the load is on the third
                c.settle()
            sel = '[data-module="report"] input[data-load="freightKg"]'
            c.page.fill(sel, '1200')
            c.page.locator(sel).dispatch_event('input')
            before = set(c.doc_paths('cr/reports/'))
            c.tap('[data-module="report"] [data-do="save"]')
            path = None
            for _ in range(40):
                new = [p for p in c.doc_paths('cr/reports/') if p not in before]
                if new:
                    path = new[0]
                    break
                c.wait(200)
            c.ok(path, 'no record', 'the report is saved')
            c.eq(c.doc(path).get('load'), {'category': 'fret', 'freightKg': 1200}, 'the record carries the category and the freight, nothing else', what='load')
    # the load belongs to the flight's category, not to the draft (Simplification, 9 Nov): a draft of a freight flight (1 200 kg), then a flight
    # without category taken: the load is gone
    c.open('report', docs=_cat_docs('fret'))
    c.until("!!document.querySelector('[data-module=report] [data-do=current]')", timeout=10000, what='the current-flight card (freight)')
    c.wait(400)
    c.tap('[data-module="report"] [data-do="current"]')
    c.until("!!document.querySelector('[data-module=report] input[data-load=freightKg]')", what='the freight field')
    c.page.locator('[data-module="report"] input[data-load="freightKg"]').evaluate("e => { e.value = '1200'; e.dispatchEvent(new Event('input', { bubbles: true })) }")
    c.until_doc('cache/report/draft.json', lambda d: ((d or {}).get('mission') or {}).get('load') == {'category': 'fret', 'freightKg': 1200}, 'the draft keeps the freight', timeout=8000)
    c.open('report', docs=_cat_docs('', draft=True))
    c.until("!!document.querySelector('[data-module=report] [data-do=current]')", timeout=10000, what='the current-flight card (no category)')
    c.wait(400)
    c.tap('[data-module="report"] [data-do="current"]')
    c.until("[...document.querySelectorAll('[data-module=report] input')].some(i => i.value === 'F-RAJA')", what='the flight prefills the form')
    c.settle()
    # SOG-0202 T2: the report has the last word on its family and series; a flight without theme keeps them, and the load follows the series
    c.eq(c.js("document.querySelector('[data-module=report] select[data-family]')?.value"), 'COMMERCIAL', 'a flight without theme: the report keeps its family', what='family kept')
    c.eq(c.count('[data-module="report"] [data-loadcard="freight"]'), 1, 'the load follows the series (CARGO: freight)', what='load card')



@case('G8', 'Report: the family list says each family by its acronym first, then its long name (« SAR · Récupération de personnel »), never the long name alone, never the acronym twice',
      'G', tags=('report',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0179 (user, 10 Nov: « le nom abrégé a disparu. c\'est pourtant comme ça que l\'utilisateur mémorise une looooongue catégorie »): '
      'the V2 wrote « SAR — … » (shared/mission_core/core.js familyOptions); in a native list the acronym leads, as plain text; captures 390 and 1 280')
def g8(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('report')
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the three steps are drawn')
        c.tap('[data-module="report"] .f-steps button[data-step="1"]')
        c.until("!!document.querySelector('[data-module=report] select[data-family]')", what='the family list')
        opts = c.js("[...document.querySelectorAll('[data-module=report] select[data-family] option')].map(o => [o.value, o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])")
        c.ge(len(opts), 16, f'{w} px: the sixteen families', what='options')
        short = lambda v: 'CAT' if v == 'COMMERCIAL' else v  # the acronym of a theme (SOG-0202: COMMERCIAL is said CAT)
        bad = [o for o in opts if not o[1].startswith(short(o[0]) + ' · ') or not o[1][len(short(o[0])) + 3:].strip() or re.match(re.escape(short(o[0])) + r'\s*[/—–-]', o[1][len(short(o[0])) + 3:].upper())]
        c.eq(bad, [], f'{w} px: each option « SIGLE · Nom long », the acronym not repeated', what='options not « SIGLE · long »')
        sar = dict(opts).get('SAR', '')
        c.ok(sar.startswith('SAR · ') and sar[6:7].isupper(), sar, f'{w} px: « SAR · Récupération de personnel »')
        c.js("document.querySelector('[data-module=report] select[data-family]').scrollIntoView({block: 'center'})")
        c.shot(f'G8_{c.design}_{w}_{c.lang}.png')



_CO_IDX = [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
           ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'sog'}, 'document'],
           ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air', 'kind': 'va'}, 'document']]
_KIND_JS = """async (lang) => { const M = await import('/frame/lib/mission_categories.js'), i = Math.max(0, M.LANGS.indexOf(lang));
  return { sog: M.KIND_NAMES.sog[i], va: M.KIND_NAMES.va[i] } }"""
_CO_LINE_JS = """() => { const e = document.querySelector('[data-module=report] [data-crairline]'); return e ? { text: e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(),
  saved: e.dataset.saved, href: e.querySelector('a')?.getAttribute('href') || '', shown: !e.hidden && e.getBoundingClientRect().height > 0 } : null }"""


def _save_report(c):
    before = set(c.doc_paths('cr/reports/'))
    c.tap('[data-module="report"] [data-do="save"]')
    for _ in range(40):
        got = [p for p in c.doc_paths('cr/reports/') if p not in before]
        if got:
            return got[0]
        c.wait(200)
    raise Fail('the report is not saved')


@case('G9', 'Report: the header says the airline of the report — « Alpha Air · Escadrille SO » —, « Changer » beside it until it is saved; a saved report keeps its own airline; « Mes vols » says the airline of each report when there is more than one',
      'G', tags=('report', 'flightlog'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0181 (user: « on ne sait pas pour quelle compagnie on fait le cr »): the airline of the aircraft when the report is created, its '
      'name and kind written with the record and never changed after; the kind read where Settings writes it (settings.json kind, '
      'mission_categories KIND_NAMES); captures 390 and 1 280')
def g9(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('report', docs=_CO_IDX)
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
        c.js("async () => { await window.FrameData.setAirline('aaa'); return true }")
        words = c.js(_KIND_JS, c.lang)
        c.until("(w) => (document.querySelector('[data-module=report] [data-crairline]')?.textContent || '').includes(w)", f'Alpha Air · {words["sog"]}', timeout=8000,
                what='the header says the current airline and its kind')
        line = c.js(_CO_LINE_JS)
        c.ok(line['shown'] and line['saved'] == '0' and c.count('[data-module=report] [data-crairline] [data-crairline-change]') == 1, line,
             f'{w} px: shown under the title, « Changer » beside it while not saved (SOG-0181: chosen here)')
        c.shot(f'G9_{c.design}_{w}_{c.lang}.png')
        path = _save_report(c)
        doc = c.doc(path)
        c.eq([doc.get('airline'), doc.get('airlineName'), doc.get('airlineKind')], ['aaa', 'Alpha Air', 'sog'], 'the record keeps the airline, its name and its kind', what='record')
        c.until("() => document.querySelector('[data-module=report] [data-crairline]')?.dataset.saved === '1'", what='saved: the airline of the record, no gesture')
        # the current airline changes: the saved report keeps its own; a new report takes the current one
        c.js("async () => { await window.FrameData.setAirline('bbb'); return true }")
        c.wait(800)
        line = c.js(_CO_LINE_JS)
        c.ok(f'Alpha Air · {words["sog"]}' in line['text'] and not line['href'] and c.count('[data-module=report] [data-crairline-change]') == 0, line,
             'the saved report keeps its airline when the current one changes, no « Changer »')
        c.tap('[data-module="report"] [data-do="new"]')
        c.until("(w) => (document.querySelector('[data-module=report] [data-crairline]')?.textContent || '').includes(w)", f'Bravo Air · {words["va"]}', timeout=8000,
                what='a new report: the current airline')
        # Mes vols: two airlines exist, each report line says its own
        c.open('flightlog', docs=_CO_IDX)
        c.until("!!document.querySelector('[data-module=flightlog] [data-flairline]')", timeout=10000, what='the airline on the report line')
        got = c.js("[...document.querySelectorAll('[data-module=flightlog] [data-flairline]')].map(e => e.textContent.trim())")
        c.ok(f'Alpha Air · {words["sog"]}' in got, got, f'{w} px: « Mes vols » says the airline of the report')
        c.shot(f'G9_flightlog_{c.design}_{w}_{c.lang}.png')



_LISTS_JS = """async () => {
  const V = await import('/modules/report/vocab.js'), T = await import('/frame/lib/mission_themes.js');
  const files = ['aar', 'airborne', 'airlift', 'combat', 'command', 'fire', 'flight_inspection', 'hadr', 'hems', 'isr', 'law_enforcement', 'maritime', 'sar', 'sof', 'special', 'survey'];
  const families = {};
  for (const f of files) {
    const F = (await import(`/modules/report/families/${f}.js`)).default;
    families[F.id] = { title: F.title, series: (F.series || []).map(s => ({ value: s.value, label: s.label })) };
  }
  const com = T.themeOf('COMMERCIAL');
  return {
    lists: JSON.parse(JSON.stringify({ familyLabels: V.familyLabels, familyLetters: V.familyLetters, families })),
    themes: T.THEMES.map(t => t.id), military: T.MILITARY.length,
    commercial: com && { short: com.short, letter: com.letter, military: com.military, series: com.series.map(s => s.value), load: Object.fromEntries(com.series.filter(s => s.load).map(s => [s.value, s.load])) },
    chosen: { va: T.defaultChosen('va'), sog: T.defaultChosen('sog').length, perso: T.defaultChosen('perso').length, none: T.defaultChosen('').length },
    fileChosen: T.chosenOf({ schema: 1, chosen: ['sar', 'commercial', 'NOPE'] }, 'va'), noFile: T.chosenOf(null, 'va'),
    clean: T.cleanThemes({ schema: 1, added: { themes: [{ id: 'SAR', short: 'SAR', labels: ['Autre SAR'] }, { id: 'GLIDER', short: 'GLD', labels: ['Planeur <b>x</b>'] },
      ...Array.from({ length: 12 }, (_, i) => ({ id: `EXTRA_${i}`, short: `X${i}`, labels: ['Extra ' + 'y'.repeat(80)] }))],
      series: { SAR: [{ value: 'SAR-LAND', labels: ['Doublon'] }, { value: 'MOUNTAIN', labels: ['Montagne'] }], UNKNOWN: [{ value: 'A', labels: ['A'] }] } } }),
    frozen: (() => { try { T.THEMES[0].series.push({}); return false } catch { return Object.isFrozen(T.THEMES[0].labels) } })(),
    bounds: { label: T.LABEL_MAX, themes: T.ADDED_MAX.themes, series: T.ADDED_MAX.seriesPerTheme }
  };
}"""


@case('G10', 'Mission themes: one table (frame/lib/mission_themes.js) — the report\'s families, letters and series ×4 read from it are those of the V2, unchanged; COMMERCIAL is the 17th theme, pre-ticked by the airline\'s kind; an airline\'s file is filtered and bounded',
      'G', tags=('report', 'missions'), designs=('standard',), screens=False,
      rule='SOG-0202 T1 (user, 10 Nov 15 h 20: « airlift et special sont des thèmes militaires. « commercial » est un grand thème … »; V3_SPECIFICATION § 10.48): '
      'the lists moved from modules/report/vocab.js and families/*.js are equal to tests/v3/fixtures/report_lists_v2.json (taken before the move); '
      'the report still offers its sixteen families (no visible change); captures 390 and 1 280')
def g10(c):
    want = json.loads((ROOT / 'tests/v3/fixtures/report_lists_v2.json').read_text(encoding='utf-8'))
    c.open('report')
    got = c.js(_LISTS_JS)
    lists = got['lists']
    fams = lists['families']
    c.eq(sorted(fams), sorted(want['families']), 'the sixteen families', what='families')
    diff = {k: {'now': [s for s in fams[k]['series'] if s not in v['series']] or fams[k]['title'], 'v2': [s for s in v['series'] if s not in fams[k]['series']] or v['title']}
            for k, v in want['families'].items() if k in fams and fams[k] != v}
    c.eq(diff, {}, 'each family: the same title ×4 and the same series (value, label ×4), in the same order', what='families that differ')
    c.eq({k: v for k, v in lists['familyLabels'].items() if k in want['familyLabels']}, want['familyLabels'], 'the sixteen family names ×4 unchanged', what='family names')
    c.eq(sorted(set(lists['familyLabels']) - set(want['familyLabels'])), ['COMMERCIAL'], 'the only new family name is COMMERCIAL', what='new names')
    c.eq({k: v for k, v in lists['familyLetters'].items() if k in want['familyLetters']}, want['familyLetters'], 'the report number letters unchanged', what='letters')
    c.ok(lists['familyLetters'].get('COMMERCIAL') not in want['familyLetters'].values(), lists['familyLetters'].get('COMMERCIAL'), 'COMMERCIAL\'s letter is not one of the sixteen')
    c.eq(len(got['themes']), 17, 'seventeen themes', what='themes')
    c.eq(got['military'], 16, 'sixteen military themes', what='military')
    c.eq(got['commercial'], {'short': 'CAT', 'letter': 'E', 'military': False, 'series': ['CARGO', 'PASSENGERS', 'EMPTY_LEG', 'VIP', 'TRAINING', 'TRANSIT', 'FLIGHT_TEST'],
                             'load': {'CARGO': 'freight', 'PASSENGERS': 'passengers', 'VIP': 'passengers'}}, 'COMMERCIAL and its seven series, the load as a series attribute', what='COMMERCIAL')
    c.eq(got['chosen'], {'va': ['COMMERCIAL'], 'sog': 16, 'perso': 17, 'none': 17}, 'pre-ticked by kind: va → COMMERCIAL, sog → the sixteen, perso and none → all', what='defaults')
    c.eq(got['fileChosen'], ['SAR', 'COMMERCIAL'], 'an airline\'s file says its themes (unknown ids dropped)', what='chosen')
    c.eq(got['noFile'], ['COMMERCIAL'], 'without a file, the kind\'s defaults (nothing written)', what='no file')
    cl = got['clean']['added']
    ids = [t['id'] for t in cl['themes']]
    c.ok('SAR' not in ids and ids[0] == 'GLIDER' and len(ids) == got['bounds']['themes'], ids, 'an added theme never replaces a known id; at most ADDED_MAX.themes')
    c.ok('<' not in cl['themes'][0]['labels'][0] and all(len(l) <= got['bounds']['label'] for t in cl['themes'] for l in t['labels']), cl['themes'][:2], 'labels cleaned and bounded (LABEL_MAX)')
    c.eq(cl['series'], {'SAR': [{'value': 'MOUNTAIN', 'labels': ['Montagne'] * 4}]}, 'an added series never replaces a known one; a series of an unknown theme is dropped', what='series')
    c.ok(got['frozen'], got['frozen'], 'the table cannot be changed by a reader')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('report')
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the three steps are drawn')
        c.tap('[data-module="report"] .f-steps button[data-step="1"]')
        c.until("!!document.querySelector('[data-module=report] select[data-family]')", what='the family list')
        vals = c.js("[...document.querySelectorAll('[data-module=report] select[data-family] option')].map(o => o.value)")
        c.eq(vals, list(want['familyLabels']) + ['COMMERCIAL'], f'{w} px: the report offers its sixteen families in the same order, then COMMERCIAL (T2: no kind = the seventeen themes)', what='options')
        c.js("document.querySelector('[data-module=report] select[data-family]').scrollIntoView({block: 'center'})")
        c.shot(f'G10_{c.design}_{w}_{c.lang}.png')



@case('G11', 'Site: leaving it while it is still reading (another page chosen at once) leaves no JavaScript error — the mount stops, nothing is set on an unmounted module',
      'G', tags=('website',), designs=('standard',), screens=False,
      rule='A66 red one run in two on origin/v3 (Simplification and V3 Frame, 10 Nov): « TypeError: Cannot set properties of null (setting \'onAirline\') '
      'at Module.mount (modules/website/module.js:398) »: the mount went on after its reads although unmount had set S to null')
def g11(c):
    c.open('fuel', flight=True)
    # the Site's reads made slow, so that the page is left during them every time (the race of A66, made certain)
    c.js("""() => { const d = window.FrameData; if (!d || d.__slowSite) return; d.__slowSite = true;
      const ad = d.adapter; d.adapter = decl => { const a = ad(decl); if (decl?.id !== 'website') return a;
        const get = a.get; return { ...a, get: (p, o) => new Promise(r => setTimeout(r, 400)).then(() => get(p, o)) } } }""")
    for _ in range(3):
        c.js("() => { location.hash = '#website' }")
        c.wait(60)
        c.js("() => { location.hash = '#fuel' }")
        c.wait(700)
    c.js("() => { location.hash = '#website' }")
    c.until("!!document.querySelector('[data-module=website] [data-body]')", timeout=10000, what='the Site, mounted to the end, still works')
    c.wait(600)
    c.eq([e for e in c.errors if 'onAirline' in e or 'website' in e], [], 'no error of the Site module', what='errors')



@case('G12', 'Report: the airline is chosen ON the report (« Changer » beside « Compte rendu pour … »): the draft stays as it was, the screen stays the report; a saved report of another airline is said in the header (« BBB ≠ AAA »)',
      'G', tags=('report',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0181 refused on 10 Nov (« on peut bien choisir en sortie, mais on ne revient pas sur l\'écran « CR » »): the choice is made on the report '
      '(FrameData.setAirline, as the header\'s selector of SOG-0213), never by leaving it; ctx.workAirline (frame INTEGRATION § 15.5); captures 390 and 1 280')
def g12(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('report', docs=_CO_IDX)
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
        c.js("async () => { await window.FrameData.setAirline('aaa'); return true }")
        c.until("!!document.querySelector('[data-module=report] [data-crairline]:not([hidden])')", timeout=8000, what='the airline line')
        if c.js("document.querySelector('[data-module=report] [data-crairline]')?.dataset.saved === '1'"):
            c.tap('[data-module="report"] [data-do="new"]')  # a report saved by an earlier run of this browser: a new one
        c.until("!!document.querySelector('[data-module=report] [data-crairline-change]')", timeout=8000, what='« Changer » beside the airline')
        # a draft: a field typed
        path = c.js("(() => { const i = [...document.querySelectorAll('[data-module=report] input[data-path]')].find(x => x.type === 'text' && x.getClientRects().length && !x.value); return i ? i.dataset.path : '' })()")
        c.ok(path, path, 'an empty text field of the report')
        sel = f'[data-module=report] input[data-path="{path}"]'
        c.page.fill(sel, 'BROUILLON 42')
        c.page.locator(sel).blur()
        c.tap('[data-module="report"] [data-crairline-change]')
        c.until("!!document.querySelector('[data-module=report] select[data-crairline-pick]')", what='the airlines, on the report')
        c.eq(c.js("[...document.querySelectorAll('[data-module=report] select[data-crairline-pick] option')].map(o => o.value)"), ['aaa', 'bbb', 'perso'],
             'the airlines of the index, then Personnel', what='choices')
        c.shot(f'G12_{c.design}_{w}_{c.lang}.png')
        c.page.select_option('[data-module=report] select[data-crairline-pick]', 'bbb')
        c.until("(document.querySelector('[data-module=report] [data-crairline]')?.textContent || '').includes('Bravo Air')", timeout=8000, what=f'{w} px: the report is now for Bravo Air')
        c.ok(c.js("location.hash").startswith('#report'), c.js("location.hash"), f'{w} px: still on the report')
        c.until(f"(document.querySelector('{sel}')?.value || '') === 'BROUILLON 42'", what=f'{w} px: the draft as it was')
        # saved for Bravo Air, then the current airline changes: the header says the report keeps its own
        c.page.fill(sel, 'BROUILLON 43')  # typed just before saving: its draft timer must not write the draft back after the save
        _save_report(c)
        c.until("() => document.querySelector('[data-module=report] [data-crairline]')?.dataset.saved === '1'", what='saved')
        c.wait(900)
        c.eq(c.doc('cache/report/draft.json'), None, f'{w} px: no draft left after the save (a pending draft is not written back)', what='draft')
        c.js("async () => { await window.FrameData.setAirline('aaa'); return true }")
        c.until("(() => { const e = document.getElementById('fCo'); return !!e && e.hasAttribute('data-differs') && /AAA\s*≠/.test(e.textContent) && /BBB/.test(e.title) })()", timeout=8000,
                what=f'{w} px: the header says « AAA ≠ BBB » (current ≠ the report\'s)')
        c.go('flightlog')
        c.until("(() => { const e = document.getElementById('fCo'); return !!e && !e.hasAttribute('data-differs') })()", timeout=8000, what='another screen: no longer said')



@case('G13', 'Report: it takes the theme and sub-theme of the flight (COMMERCIAL / PASSENGERS) and can change them — it has the last word; the family list offers the airline\'s themes; the load follows the sub-theme; a COMMERCIAL report is numbered E',
      'G', tags=('report',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0202 T2 (user, 10 Nov: « à quel moment le cr match ce choix ? que faire si j\'ai oublié de choisir au départ du vol… ? »): the report takes them '
      'at « Utiliser » and can change them; COMMERCIAL: family of its own, letter E (CRE-…), sigle CAT; captures 390 and 1 280')
def g13(c):
    from lib import flight_docs
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        docs = flight_docs()
        docs[1][1]['theme'] = 'COMMERCIAL'
        docs[1][1]['series'] = 'PASSENGERS'
        docs += [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
                 ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
                 ['cache/report/draft.json', {}, 'cache']]
        c.open('report', docs=docs)
        c.until("!!document.querySelector('[data-module=report] [data-do=current]')", timeout=10000, what='the current-flight card')
        c.wait(400)  # the airline's themes are read at mount
        c.tap('[data-module="report"] [data-do="current"]')
        c.tap('[data-module="report"] .f-steps button[data-step="1"]')  # the step Mission (a phone shows one step at a time)
        c.until("document.querySelector('[data-module=report] select[data-family]')?.value === 'COMMERCIAL'", what=f'{w} px: the flight\'s theme taken')
        c.eq(c.js("(document.querySelector('[data-module=report] [data-path=series]') || {}).value"), 'PASSENGERS', 'its sub-theme taken', what='series')
        c.eq(c.js("[...document.querySelectorAll('[data-module=report] select[data-family] option')].map(o => o.value)"), ['COMMERCIAL'],
             'a commercial airline: its themes only', what='families')
        c.ok(c.js("(document.querySelector('[data-module=report] select[data-family] option') || {}).textContent || ''").startswith('CAT · '), '', 'said by its sigle CAT')
        c.until("!!document.querySelector('[data-module=report] [data-loadcard=passengers]')", what='PASSENGERS asks the passengers')
        c.shot(f'G13_{c.design}_{w}_{c.lang}.png')
        # the report has the last word: another sub-theme, the load follows
        c.page.select_option('[data-module=report] [data-path=series]', 'CARGO')
        c.until("!!document.querySelector('[data-module=report] [data-loadcard=freight]')", what=f'{w} px: CARGO chosen in the report asks the freight')
        path = _save_report(c)
        c.ok(path.split('/')[-1].startswith('CRE-'), path, f'{w} px: a COMMERCIAL report is numbered E')
        d = c.doc(path)
        c.eq([d.get('family'), d.get('series')], ['COMMERCIAL', 'CARGO'], 'the record keeps the report\'s choice', what='record')



@case('G14', 'The V2 report ledgers file refused by the data guard (code after its literal) is repaired by tools/repair_ledger_defaults.py: the correction moved into the literal, the code removed, nothing written without --write, the original kept',
      'G', static=True, rule='SOG-0219 (3) (the launcher wrote seven times « Fichier de données refusé … data\cr\mission_ledger_defaults.js — texte après le littéral »): '
      'the V2 file of 23 Sep, migrated as it was, ends with a block of code fixing « 1:50 » → « 19:50 »; tools/data_guard.py refuses any code after the literal; '
      'invented ledger texts in a temporary folder, never the user\'s data')
def g14(c):
    import base64, subprocess, sys, tempfile
    sys.path.insert(0, str(ROOT / 'tools'))
    import data_guard
    led = base64.b64encode('"missionId";"time"\n"X-001";"1:50";"ok"\n'.encode('utf-8')).decode('ascii')
    gaar = base64.b64encode('"missionId";"risk"\n"X-002";"low"\n'.encode('utf-8')).decode('ascii')
    text = ('// Registres CSV embarqués (essai, inventés).\nwindow.MissionLedgerDefaultsB64={\ngaarLedgerName:"' + gaar + '",\nledgerName:"' + led + '"\n};\n'
            '// Preserve the exact value.\n{\n  const binary=atob(window.MissionLedgerDefaultsB64.ledgerName);\n}\n')
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, 'mission_ledger_defaults.js')
        open(path, 'w', encoding='utf-8', newline='\n').write(text)
        try:
            data_guard.check(text)
            refused = ''
        except data_guard.Refused as e:
            refused = str(e)
        c.eq(refused, 'texte après le littéral', 'the file as the V2 left it is refused by the guard', what='before')
        tool = [sys.executable, '-I', str(ROOT / 'tools/repair_ledger_defaults.py'), path]
        p = subprocess.run(tool, capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
        c.eq([p.returncode, open(path, encoding='utf-8').read() == text], [0, True], 'without --write: said, nothing written', what='dry run')
        p = subprocess.run(tool + ['--write'], capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
        out = open(path, encoding='utf-8').read()
        c.eq(data_guard.check(out), 'literal', 'the repaired file passes the guard', what='after')
        c.ok('"19:50"' in base64.b64decode(re.search(r'\nledgerName:"([^"]*)"', out).group(1)).decode('utf-8'), out[:200], 'the correction is in the literal: « 19:50 »')
        c.ok(out.startswith('// Registres CSV embarqués') and os.path.exists(path + '.avant'), p.stdout[-300:], 'the head comment kept, the original kept beside (.avant)')



@case('G15', 'Report: a family the airline ADDED (Settings) is offered with its families, said « SIGLE · Nom », with its added series; the common form only, no load card',
      'G', tags=('report',), designs=('standard',), screens=False, langs4=True,
      rule='Refactoring day 11 Nov (ergonomist\'s queue, after Settings\' T3b): « une famille ajoutée est aussi une famille du compte rendu : formulaire commun seul, '
      'sans charge propre »; an invented family GLD of an invented airline; captures 390 and 1 280')
def g15(c):
    from lib import flight_docs
    th = {'schema': 1, 'chosen': ['COMMERCIAL', 'GLD'], 'added': {'themes': [{'id': 'GLD', 'short': 'GLD', 'labels': ['Planeur', 'Glider', 'Segelflug', 'Planeador']}],
                                                               'series': {'GLD': [{'value': 'WINCH', 'labels': ['Treuil', 'Winch', 'Winde', 'Torno']}]}}}
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        docs = flight_docs() + [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
                                ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
                                ['airline/aaa/themes.json', th, 'document'], ['cache/report/draft.json', {}, 'cache']]
        c.open('report', docs=docs)
        c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
        c.js("async () => { await window.FrameData.setAirline('aaa'); return true }")
        c.tap('[data-module="report"] .f-steps button[data-step="1"]')
        c.until("[...document.querySelectorAll('[data-module=report] select[data-family] option')].some(o => o.value === 'GLD')", timeout=8000,
                what=f'{w} px: the added family offered')
        opts = c.js("[...document.querySelectorAll('[data-module=report] select[data-family] option')].map(o => [o.value, o.textContent.trim()])")
        c.ok(['GLD', {'fr': 'GLD · Planeur', 'en': 'GLD · Glider', 'de': 'GLD · Segelflug', 'es': 'GLD · Planeador'}[c.lang]] in opts, opts, 'said « SIGLE · Nom »')
        c.page.select_option('[data-module=report] select[data-family]', 'GLD')
        c.until("(document.querySelector('[data-module=report] [data-path=series]') || {}).value === 'WINCH'", what='its added series')
        c.eq(c.count('[data-module="report"] [data-loadcard]'), 0, 'no load card of its own', what='load')
        c.js("document.querySelector('[data-module=report] select[data-family]').scrollIntoView({block: 'center'})")
        c.shot(f'G15_{c.design}_{w}_{c.lang}_delivered.png')
        path = _save_report(c)
        d = c.doc(path)
        c.eq([d.get('family'), d.get('series')], ['GLD', 'WINCH'], f'{w} px: the report saved with its family and series', what='record')



@case('G16', 'Report: a Commercial report starts on the series « Passagers » (a default series said by the family), the other families on their first series',
      'G', tags=('report',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0239 (user, 11 Nov: « passagers », not Fret: a new report after a Commercial one asked for freight): defaultSeries of the common '
      'table (frame/lib/mission_themes.js); the order of the series unchanged')
def g16(c):
    from lib import flight_docs
    th = {'schema': 1, 'chosen': ['COMMERCIAL', 'HEMS']}
    docs = flight_docs() + [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}]}, 'document'],
                            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air', 'kind': 'va'}, 'document'],
                            ['airline/aaa/themes.json', th, 'document'], ['cache/report/draft.json', {}, 'cache']]
    c.open('report', docs=docs)
    c.until("document.querySelectorAll('[data-module=report] .f-steps button').length === 3", what='the report is drawn')
    c.js("async () => { await window.FrameData.setAirline('aaa'); return true }")
    c.tap('[data-module="report"] .f-steps button[data-step="1"]')
    fam = '[data-module=report] select[data-family]'
    ser = "(document.querySelector('[data-module=report] [data-path=series]') || {}).value"
    c.until(f"[...document.querySelectorAll('{fam} option')].some(o => o.value === 'COMMERCIAL')", timeout=8000, what='Commercial offered')
    c.page.select_option(fam, 'COMMERCIAL')
    c.until(f"{ser} === 'PASSENGERS'", timeout=5000, what='Commercial starts on « Passagers »')
    order = c.js("[...document.querySelectorAll('[data-module=report] [data-path=series] option')].map(o => o.value).filter(Boolean)")
    c.eq(order[:2], ['CARGO', 'PASSENGERS'], 'the order of the series is unchanged', what='series order')
    c.page.select_option(fam, 'HEMS')
    first = c.js("[...document.querySelectorAll('[data-module=report] [data-path=series] option')].map(o => o.value).filter(Boolean)[0]")
    c.until(f"(v) => {ser} === v", first, timeout=5000, what='another family keeps its first series')
    # a new report after a Commercial one: « Nouveau » keeps the family, on « Passagers »
    c.page.select_option(fam, 'COMMERCIAL')
    c.until(f"{ser} === 'PASSENGERS'", timeout=5000, what='Commercial again')
    c.tap('[data-module="report"] [data-do="new"]')
    c.tap('[data-module="report"] .f-steps button[data-step="1"]')
    c.until(f"{ser} === 'PASSENGERS'", timeout=5000, what='a new report after a Commercial one starts on « Passagers », never asking for freight first')
