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
      'the load belongs to the flight\'s category, not to the draft (another, none or unknown removes it)')
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
            c.eq(got, [], f'an unknown category ({cat}) is ignored: no load asked', what='unknown category')
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
    c.eq(c.count('[data-module="report"] [data-loadcard]'), 0, 'a flight without category: the draft\'s load is removed', what='no load card')
    c.until_doc('cache/report/draft.json', lambda d: 'load' not in ((d or {}).get('mission') or {}), 'the draft without load', timeout=8000)



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
        bad = [o for o in opts if not o[1].startswith(o[0] + ' · ') or not o[1][len(o[0]) + 3:].strip() or re.match(re.escape(o[0]) + r'\s*[/—–-]', o[1][len(o[0]) + 3:].upper())]
        c.eq(bad, [], f'{w} px: each option « SIGLE · Nom long », the acronym not repeated', what='options not « SIGLE · long »')
        sar = dict(opts).get('SAR', '')
        c.ok(sar.startswith('SAR · ') and sar[6:7].isupper(), sar, f'{w} px: « SAR · Récupération de personnel »')
        c.js("document.querySelector('[data-module=report] select[data-family]').scrollIntoView({block: 'center'})")
        c.shot(f'G8_{c.design}_{w}_{c.lang}.png')
