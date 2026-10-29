"""Area F - fuel (PLAN.md section F; modules/fuel/SPEC.md, lot `v3-fuel-ergo` and `v3-unites-carburant`).

Rules covered
  * the module opens on the Plan ("Devis") view, not the Sheets view (F1);
  * the sticky result bar is compact: one context line, three one-line tiles, at most 120 px (F2);
  * the display units (kt / km/h, ft / m, NM / km / SM) change the figures and keep flight levels as FL (F3);
  * no horizontal page scroll at 390 and 360 px (F4; the date row overflowed until 24 Oct);
  * the wording "Devis" is not both the tab and a step of the same view (F5; step 4 is now "Résultat");
  * the flight date is one value: the field writes `planned_at` of the current flight (F6);
  * a mount whose address changed while it was still reading writes nothing, and the view follows the address (F7);
  * the "Auto" button writes the airways between the route's points at the planned level (F8);
  * the sheets bench passes: airframe and propulsion deduced from the ICAO catalogue, migration of engineType, missing fields
    named by family (F10);
  * runway, SID, STAR and approach are chosen in the preparation (V3 spec 10.20): two rows filled by aerodb and filtered by the runway
    (F11), "aucune" writes null (F12), X-Plane local last and outdated marked (F13), an aerodrome without data offers the reading and
    shows the refusal (F14), the quote runs on the procedures path with legs and profile.path (F15), after the start only legs, the
    vertical path and the length are rewritten (F16), the Map's `focus=arr` (F17), the v1 record migrated at the next write (F18), "Load my OFP" replaces the choice and says what changed (F19).

  * an aerodrome with approaches only (no SID, no STAR, no runway record) still lists them, by runway, on both rows (F20);
  * a procedure serving one runway sets it when none is chosen; a transition follows its STAR (F21);
  * conflicts are marked, not forbidden (user, 29 Oct): ⚠ at the end of the label (after ⌛), class conflict, the reason as title, the choice kept, one
    notification when the conflict appears; flat lists sorted by runway then name (F26).

  * an aerodrome whose files carry no runway still offers runways: those its procedures name, else the two ends of its axis in the base (F22).

  * the vertical path never folds back: a constraint 23,000 ft under the cruise 4 NM further, then a climb after the approach (a missed approach the
    file does not mark), give a path that keeps the cruise until the descent from the constraint reaches it, never rises again, never jumps (F23);
  * an approach given only by its entries lists the final record once, its transitions are the records that lead to it, and a transition equal to
    the approach is ignored (F24).

Cases: F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 F13 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F24 F25 F26.  A quote needs a flight: the planned flight of lib.FLIGHT (type C30J, 366 NM) is seeded, so fuel
computes an estimated quote with no sheet and no network.
"""
import json

from lib import ROOT, Fail, Skip, case, flight_docs, norm, synthetic_airways, tx

F = 'modules/fuel/module.js'
FUEL = '[data-module="fuel"]'


def row(c, key):
    return tx(F, key, c.lang)


def wait_quote(c):
    c.until("!!document.querySelector('[data-module=fuel] .fu-result .f-tiles b')", timeout=15000, what='the quote is computed (result bar with its tiles)')
    c.settle()


@case('F1', 'Opens on the Plan', 'F', tags=('fuel',), screens=False, langs4=True, rule='user "la vue fiches ne devrait pas être active par défaut"')
def f1(c):
    c.open('fuel')
    c.wait(800)
    seg = c.js("[...document.querySelectorAll('[data-module=fuel] button')].filter(b => b.hasAttribute('aria-pressed')).slice(0, 2).map(b => ({ t: b.textContent.trim(), p: b.getAttribute('aria-pressed') }))")
    c.eq(len(seg), 2, 'a segmented control with two views (Plan, Sheets)', what='view buttons')
    c.eq([s['p'] for s in seg], ['true', 'false'], 'the first button (the Plan) is pressed at mount, not the Sheets view', what=f'view buttons pressed {[s["t"] for s in seg]}')
    c.ok(c.shown('[data-module="fuel"] .fu-step'), 'no Plan step displayed', 'the Plan view (its steps) is the one shown')


@case('F2', 'Compact result bar', 'F', tags=('fuel',), screens=False, langs4=True, rule='lot v3-fuel-ergo: about 100 px at 390 px, it was 190')
def f2(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    bar = c.box(f'{FUEL} .fu-result')
    c.le(round(bar['h'], 1), 120, 'the sticky result bar is at most 120 px high', what='result bar height')
    ctx = c.js("""() => { const e = document.querySelector('[data-module=fuel] .fu-result .fu-ctx'); if (!e) return null; const cs = getComputedStyle(e);
        return { ws: cs.whiteSpace, to: cs.textOverflow, ov: cs.overflow, h: e.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, text: e.textContent } }""")
    c.ok(ctx is not None, 'no context line (.fu-ctx) in the result bar', 'one context line')
    c.ok(ctx['ws'] == 'nowrap' and (ctx['ov'] == 'hidden' or ctx['to'] == 'ellipsis'), f'context line white-space {ctx["ws"]}, overflow {ctx["ov"]}, text-overflow {ctx["to"]}', 'nowrap with an ellipsis')
    c.le(round(ctx['h']), round(ctx['lh'] * 1.5), 'the context line is one line', what='context line height')
    tiles = c.js("""[...document.querySelectorAll('[data-module=fuel] .fu-result .f-tiles > *')].map(t => { const cs = getComputedStyle(t), r = t.getBoundingClientRect();
        return { label: (t.firstChild && t.firstChild.nodeType === 3 ? t.firstChild.textContent : '').trim(), value: ((t.querySelector('b') || {}).textContent || '').trim(), ws: cs.whiteSpace, top: Math.round(r.top), h: r.height } })""")
    c.eq(len(tiles), 3, 'three tiles', what='result tiles')
    c.eq([t['label'] for t in tiles], [row(c, 'tripS'), row(c, 'time'), row(c, 'todS')], 'tiles Trip / Time / TOD in the language of the run', what='tile labels')
    c.ok(len({t['top'] for t in tiles}) == 1, f'tile tops {[t["top"] for t in tiles]}', 'the three tiles are on one row')
    for t in tiles:
        c.ok(t['ws'] == 'nowrap' and t['value'], f'tile "{t["label"]}" white-space {t["ws"]}, value {t["value"]!r}', 'label and value on one line each')
        c.le(round(t['h']), 60, 'a tile is two short lines', what=f'tile "{t["label"]}" height')


@case('F3', 'Units', 'F', tags=('fuel',), screens=False, rule='lot v3-unites-carburant')
def f3(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    c.tap(f'{FUEL} [data-block="stepbar"] button[data-step="3"], {FUEL} button[data-step="3"]')
    c.until("window.__t.shown(document.querySelector('[data-module=fuel] details[data-fold=settings]'))", what='the Quote step shows its settings fold')
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=settings]').open"):
        c.tap(f'{FUEL} details[data-fold="settings"] > summary')
    opts = c.js("""() => Object.fromEntries([...document.querySelectorAll('[data-module=fuel] [data-units] select')].map(s => [s.dataset.k, [...s.options].map(o => o.value)]))""")
    c.eq(opts.get('unitSpeed'), ['kt', 'kmh'], 'speed units kt and km/h', what='speed options')
    c.eq(opts.get('unitAlt'), ['ft', 'm'], 'altitude units ft and m', what='altitude options')
    c.eq(opts.get('unitDist'), ['NM', 'km', 'SM'], 'distance units NM, km and SM', what='distance options')
    before = c.text(f'{FUEL} .fu-result .f-tiles > :nth-child(3)') or ''
    c.ok('NM' in before, f'TOD tile {before!r}', 'distances shown in NM by default')
    c.page.select_option(f'{FUEL} [data-units] [data-k="unitDist"]', 'km')
    c.until("(document.querySelector('[data-module=fuel] .fu-result .f-tiles > :nth-child(3)') || {}).textContent.includes('km')", what='the TOD tile switches to km')
    after = c.text(f'{FUEL} .fu-result .f-tiles > :nth-child(3)') or ''
    c.ok('km' in after and 'NM' not in after, f'TOD tile {after!r}', 'the distance figure is in km')
    c.page.select_option(f'{FUEL} [data-units] [data-k="unitAlt"]', 'm')
    c.wait(500)
    ctx = c.text(f'{FUEL} .fu-result .fu-ctx') or ''
    c.ok('FL270' in ctx, f'context line {ctx!r}', 'the level stays a flight level (FL270) whatever the altitude unit')


@case('F4', 'Width', 'F', tags=('fuel', 'layout'), screens=False, rule='CLAUDE.md "pages sans débordement"; the .fu-when row overflowed to 414 px until 24 Oct')
def f4(c):
    for w in (390, 360):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', flight=True)
        wait_quote(c)
        sw, iw = c.js('[document.documentElement.scrollWidth, window.innerWidth]')
        wide = c.js("""(w) => [...document.querySelectorAll('[data-module=fuel] *')].filter(e => e.getBoundingClientRect().right > w + 0.5 && window.__t.shown(e))
            .slice(0, 3).map(e => e.tagName + '.' + e.className + ' right=' + Math.round(e.getBoundingClientRect().right))""", iw)
        c.ok(sw <= iw, f'at {w} px: scrollWidth {sw} > innerWidth {iw}; widest: {wide}', 'no horizontal page scroll')


@case('F5', 'Step tab wording', 'F', tags=('fuel',), screens=False, rule='journal follow-up: the tab "Devis" and step 4 must not share a name')
def f5(c):
    c.open('fuel')
    c.wait(800)
    labels = c.js("""() => { const norm = s => s.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim();
        const tabs = [...document.querySelectorAll('[data-module=fuel] button[aria-pressed]')].slice(0, 2).filter(b => window.__t.shown(b)).map(b => norm(b.textContent));
        const steps = [...document.querySelectorAll('[data-module=fuel] button[data-step]')].filter(b => window.__t.shown(b)).map(b => norm(b.textContent).replace(/^\\d+\\s*/, ''));
        return { tabs, steps } }""")
    both = sorted(set(labels['tabs']) & set(labels['steps']))
    c.ok(not both, f'{both} is both a tab {labels["tabs"]} and a step {labels["steps"]}', 'the tab label and the step names are different words')


@case('F6', 'Flight date is one value', 'F', tags=('fuel', 'maps'), screens=False, langs4=True,
      rule='fuel INTEGRATION 3 (28 Oct): the field writes current_flight.planned_at, the only value (no weather.when copy); a dated flight has no progress: its ETAs are derived from quote.legs by frame/lib/current_flight.js etaOf, as the Map does')
def f6(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    path = 'pilot/ABC/current_flight.json'
    label = c.text(f'{FUEL} .fu-flight .f-field:last-child') or ''
    c.ok(norm(label).startswith(norm(row(c, 'wxDate'))), f'field label {label!r}', 'the field is called "Flight date" in the language of the run')

    def waited(pred, what):
        for _ in range(40):
            r = c.doc(path) or {}
            if pred(r):
                return r
            c.wait(150)
        raise Fail(f'{what}: planned_at {r.get("planned_at")!r}, weather {r.get("weather")!r}, eta {(r.get("progress") or {}).get("eta")!r}', 'the record follows the field')
    c.eq((c.doc(path) or {}).get('planned_at'), None, 'a flight with no date has no planned_at', what='planned_at at start')
    local = c.js("() => { const d = new Date(Date.now() + 36 * 3600e3); d.setSeconds(0, 0); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }")
    want = c.js("(l) => new Date(l).toISOString().slice(0, 19) + 'Z'", local)
    c.page.fill(f'{FUEL} [data-k="wxdate"]', local)
    r = waited(lambda r: r.get('planned_at') == want, 'a typed date is written as ISO UTC')
    c.eq((r.get('weather') or {}).get('when'), None, 'no weather.when copy: planned_at is the only value', what='weather.when')
    r = waited(lambda r: len(((r.get('quote') or {}).get('legs')) or []) == 4, 'the quote writes its legs (minutes from brake release)')
    c.eq(r.get('progress'), None, 'a dated flight that is not started has no progress (the ETAs are derived by the reader)', what='progress')
    eta = c.js("(f) => import('/frame/lib/current_flight.js').then(m => m.etaOf(f))", r)
    c.eq(len(eta or []), 4, 'one ETA per route point, derived by etaOf from quote.legs', what='etaOf')
    c.eq(c.js("(a) => Date.parse(a[1].at) - Date.parse(a[0].at) > 0", eta), True, 'ETAs increase along the route', what='ETA order')
    c.eq(c.js("([t, e]) => Math.round((Date.parse(e) - Date.parse(t)) / 60000)", [want, eta[0]['at']]), 10, 'the first ETA is the date plus the taxi time (10 min)', what='minutes from planned_at to the first ETA')
    c.tap(f'{FUEL} [data-do="when30"]')
    r = waited(lambda r: r.get('planned_at') and r['planned_at'] > want, '"+30" adds 30 min to a future date')
    added = c.js("([a, b]) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)", [want, r['planned_at']])
    c.ok(30 <= added <= 34 and c.js("(t) => Date.parse(t) % 300000 === 0", r['planned_at']), f'{added} min added, planned_at {r["planned_at"]}', '30 minutes more, rounded up to 5 minutes')
    c.tap(f'{FUEL} [data-do="whennow"]')
    r = waited(lambda r: r.get('planned_at') is None, '"Now" empties the date')
    # the field shows the present time, never an empty field (that the browser draws « jj/mm/aaaa »; user, 29 Oct)
    shown = c.js(f"document.querySelector('{FUEL} [data-k=wxdate]').value")
    c.ok(bool(shown) and c.js("(v) => Math.abs(Date.parse(v) - Date.now()) < 5 * 60000", shown), f'field {shown!r}', 'after "Now" the date field shows the present time')
    c.eq((r.get('weather') or {}).get('when'), None, 'still no weather.when copy', what='weather.when after Now')
    c.eq(c.js("(f) => import('/frame/lib/current_flight.js').then(m => m.etaOf(f))", r), None, 'an undated flight has no ETA to promise', what='etaOf after Now')


# a read of the frame's cache that comes back late: only the reads of `pilot/` and `cache/` documents are delayed, by `ms`
# (set per step, 0 = not delayed), and counted; the request is wrapped so that the module sees the slow disk of a busy phone
SLOW_READS = """() => {
  if (window.__slow) return;
  const get = IDBObjectStore.prototype.get, slow = window.__slow = { ms: window.__slowMs || 0, hits: 0 };
  IDBObjectStore.prototype.get = function (key) {
    const q = get.call(this, key);
    if (!slow.ms || !/^(pilot|cache)\\//.test(String(key))) return q;
    slow.hits++;
    const ms = slow.ms, late = { get result() { return q.result }, get error() { return q.error } };
    q.onsuccess = () => setTimeout(() => late.onsuccess && late.onsuccess({ target: late }), ms);
    q.onerror = () => setTimeout(() => late.onerror && late.onerror({ target: late }), ms);
    return late;
  };
}"""


def mount_race(c, first, final, want_sheets):
    """Navigates `#first` while its mount reads slowly, then away and to `#final` without waiting; the screen that stays is
    the one `final` asks for, in the module mounted for it."""
    c.open('atmosphere')
    c.js(SLOW_READS)
    c.js("(h) => { window.__slow.ms = 900; window.__slow.hits = 0; location.hash = h }", '#' + first)
    c.until('window.__slow.hits > 0', what=f'the mount of #{first} has started reading')
    c.js("(h) => { window.__slow.ms = 0; location.hash = '#atmosphere'; location.hash = h }", '#' + final)
    c.wait(2000)                                   # the first mount's reads come back (900 ms) while the second is on screen
    c.until("!!document.querySelector('[data-module=fuel] [data-view]')", what=f'#{final} draws fuel', timeout=8000)
    c.settle()
    shown = c.js("""() => ({ pressed: [...document.querySelectorAll('[data-module=fuel] [data-view]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.view),
        quote: [...document.querySelectorAll('[data-module=fuel] .fu-step, [data-module=fuel] [data-block=result]')].filter(e => window.__t.shown(e)).length,
        sheets: !![...document.querySelectorAll('[data-module=fuel] [data-do=import]')].some(e => window.__t.shown(e)),
        hash: location.hash })""")
    c.eq(shown['pressed'], ['sheets' if want_sheets else 'plan'], f'#{first} then away then #{final}: the view of the last address is the pressed one', what='pressed view')
    c.eq(shown['sheets'], want_sheets, 'the Sheets screen is shown only on #fuel?view=sheets', what='Sheets screen shown')
    c.eq(shown['quote'] > 0, not want_sheets, 'the Quote screen (steps, result bar) is shown only on #fuel', what='Quote elements shown')
    c.eq(shown['hash'], '#' + final, 'the address is the last one asked', what='hash')


@case('F7', 'Mount race', 'F', tags=('fuel',), screens=False, rule='found by A7 (frame/DECISIONS, 24 Oct): a mount still reading must not write once the address changed')
def f7(c):
    mount_race(c, 'fuel', 'fuel?view=sheets', True)
    mount_race(c, 'fuel?view=sheets', 'fuel', False)
    # the internal Quote / Sheets switch writes the address (no navigation, no new mount), so the bar's popover marks the row
    c.open('fuel')
    c.until("!!document.querySelector('[data-module=fuel] .fu-step')", timeout=15000, what='fuel has drawn its Quote screen')
    c.js("() => { window.__sec = document.querySelector('#fView > [data-module=fuel]') }")
    c.eq(c.hash(), '#fuel', 'the Quote screen is #fuel', what='hash on the Quote screen')
    c.tap(f'{FUEL} [data-view="sheets"]')
    c.until("location.hash === '#fuel?view=sheets'", what='the Sheets button writes ?view=sheets in the address')
    c.ok(c.js("() => window.__sec === document.querySelector('#fView > [data-module=fuel]')"), 'the module was mounted again', 'the same section: replaceState does not navigate')
    c.tap('#fTabs a[data-tab="prepare"]')
    c.until("!!document.querySelector('.f-tabpop')", what='the popover opens on a second tap on Préparer')
    cur = c.js("[...document.querySelectorAll('.f-tabpop-row')].filter(r => r.hasAttribute('aria-current')).map(r => r.dataset.id + (r.dataset.view ? ':' + r.dataset.view : ''))")
    c.eq(cur, ['fuel:sheets'], 'after the internal switch the popover marks Fiches', what='aria-current rows')
    c.key('Escape')
    c.tap(f'{FUEL} [data-view="plan"]')
    c.until("location.hash === '#fuel'", what='the Quote button removes ?view from the address')
    c.ok(c.js("() => window.__sec === document.querySelector('#fView > [data-module=fuel]')"), 'the module was mounted again', 'the same section: replaceState does not navigate')
    # a quote typed once the slow reads are over names its level: what is typed while the current flight is still being read
    # is not kept (the screen is inert, completeMount replaces the waiting flight by the one read: the last state read wins)
    c.page.add_init_script('window.__slowMs = 900')
    c.page.add_init_script('(' + SLOW_READS + ')()')
    c.open('fuel', airfields=True, wait=False)
    c.until("window.__t.shown(document.querySelector('[data-module=fuel] .fu-step'))", timeout=15000, what='fuel draws its first screen')
    c.eq(c.js("() => document.querySelector('[data-module=fuel] [data-body]').inert"), True, 'the screen is inert while the flight is read', what='inert body')
    c.page.fill(f'{FUEL} input[data-k="fl"]', '350')         # a typed value reaches the field, not the flight
    c.until("() => !document.querySelector('[data-module=fuel] [data-body]').inert", timeout=15000, what='the current flight is read')
    c.settle()
    c.eq(c.js("() => document.querySelector('[data-module=fuel] input[data-k=fl]').value"), '', 'the field is redrawn from the flight read', what='level typed while loading')
    for k, v in (('dep', 'LFRS'), ('arr', 'LFML'), ('altn', 'LFMT'), ('fl', '270')):
        c.page.fill(f'{FUEL} input[data-k={k}]', v)
    c.js('document.activeElement && document.activeElement.blur && document.activeElement.blur()')
    c.wait(700)
    c.tap(f'{FUEL} [data-do="acopen"]')
    c.page.fill(f'{FUEL} input[data-k="acsearch"]', 'C30J')
    c.js('document.activeElement && document.activeElement.blur && document.activeElement.blur()')
    c.wait(700)                                        # the list is redrawn on the blur: a tap during it would be lost
    c.until("!!document.querySelector('[data-module=fuel] [data-pick=\"free:C30J\"]')", what='the aircraft search offers the type C30J')
    c.tap(f'{FUEL} [data-pick="free:C30J"]')
    c.tap(f'{FUEL} button[data-step="1"]')
    c.page.fill(f'{FUEL} textarea[data-k="rtext"]', 'LFRS LUGEN NEPIX LFML')
    c.js('document.activeElement && document.activeElement.blur && document.activeElement.blur()')
    c.until("/\\d+ NM/.test((document.querySelector('[data-module=fuel] .fu-step:not([hidden])') || {}).innerText || '')", timeout=8000, what='the route resolves to a distance')
    c.tap(f'{FUEL} button[data-step="3"]')
    c.until("!!document.querySelector('[data-module=fuel] .fu-result .fu-ctx')", timeout=15000, what='the quote is computed')
    line = c.text(f'{FUEL} .fu-result .fu-ctx') or ''
    c.ok('FL270' in line and '0 ft' not in line, f'context line {line!r}', 'the quote names FL270, never "0 ft"')


@case('F8', 'Auto airways', 'F', tags=('fuel', 'maps'), screens=False, langs4=True,
      rule='user 25 Oct ("Oui pour auto"): a button next to the route writes the airways between its points, open at the planned level')
def f8(c):
    c.open('fuel', flight=True, airfields=True, airways=synthetic_airways())
    wait_quote(c)
    c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
    rt = f'{FUEL} [data-k="rtext"]'
    c.until(f"window.__t.shown(document.querySelector('{FUEL} [data-do=rauto]'))", what='the Route step shows the Auto button')
    btn = c.box(f'{FUEL} [data-do="rauto"]')
    c.ge(round(btn['h']), 44, 'the Auto button is a 44 px target', what='Auto button height')
    c.ge(round(btn['w']), 44, 'and 44 px wide', what='Auto button width')
    field = c.box(rt)
    c.ok(abs((btn['t'] + btn['b']) / 2 - (field['t'] + field['b']) / 2) < field['h'], f'button at {btn["t"]}..{btn["b"]}, field at {field["t"]}..{field["b"]}',
         'the button is in the line of the route field')
    c.eq(c.attr(f'{FUEL} [data-do="rauto"]', 'title'), row(c, 'rautoHint'), 'the title says what the button writes, in the language of the run', what='Auto title')
    # a bare route: departure and arrival, 366 NM; the three airways of the base are UT460 (FL195 - FL460), UZ99 (from FL330), UL9 (low, a detour)
    c.page.fill(rt, 'LFRS LFML')
    c.page.locator(rt).blur()
    c.until(f"/\\(2\\)/.test(document.querySelector('{FUEL} [data-ptsn]').textContent)", timeout=6000, what='the bare route resolves to two points')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value.includes('UT460')", timeout=6000, what='the route text carries an airway')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"), 'LFRS TSA01 UT460 TSA05 LFML', 'FL270: the upper airway between its two ends, its middle points not written (UZ99 is open from FL330 only)', what='route text')
    c.wait(900)                              # the re-reading of the route (500 ms) and the write of the flight (300 ms)
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: len((d.get('route') or {}).get('points') or []) == 7, 'seven points: both ends, five nodes of the airway')['route']
    c.eq([p['id'] for p in f['points']], ['LFRS', 'TSA01', 'TSA02', 'TSA03', 'TSA04', 'TSA05', 'LFML'], 'the points of the airway are written, middle ones included', what='route.points')
    c.eq([p.get('via') for p in f['points']], [None, None, 'UT460', 'UT460', 'UT460', 'UT460', None], 'the points reached by the airway carry its name', what='route.points via')
    c.eq(f['text'], 'LFRS TSA01 UT460 TSA05 LFML', 'the stored text is the same', what='route.text')
    c.ge(f['distanceNm'], 368, 'the distance follows the airway (the straight line LFRS - LFML is 364 NM)', what='route distance')
    unres = c.text(f'{FUEL} [data-unres]') or ''
    c.eq(unres, '', 'the ends of the airway, unknown to aerodb, are not "unknown points"', what='unknown points line')
    note = [norm(n) for n in c.note_log()]
    want = norm(row(c, 'autoOne')).split('{d}')[0]
    c.ok(any(n.startswith(want) and n.endswith('NM') for n in note), f'notifications {note}', f'a notification "{want}… NM"')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: (d.get('quote') or {}).get('distanceNm') in (None, f['distanceNm']) and bool(d.get('quote')), 'the quote is computed on the new distance')
    # a second tap has nothing to add: the legs left are the airway's entry and exit, short
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.wait(700)
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"), 'LFRS TSA01 UT460 TSA05 LFML', 'a second tap leaves the text as it is', what='route text after a second tap')
    c.ok(norm(row(c, 'autoNoLeg')) in [norm(n) for n in c.note_log()], f'notifications {[norm(n) for n in c.note_log()]}', 'and says there is nothing to fill in')
    # FL100: the only airway open is the low one, a detour of more than 40 %
    c.tap(f'{FUEL} .fu-steps button[data-step="0"]')
    c.page.fill(f'{FUEL} .fu-flight [data-k="fl"]', '100')
    c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
    c.page.fill(rt, 'LFRS LFML')
    c.page.locator(rt).blur()
    c.until(f"/\\(2\\)/.test(document.querySelector('{FUEL} [data-ptsn]').textContent)", timeout=6000, what='the bare route resolves again')
    c.tap(f'{FUEL} [data-do="rauto"]')
    none = norm(row(c, 'autoNone')).replace('{a}', 'LFRS').replace('{b}', 'LFML').replace('{more}', '')
    c.until("(n) => (window.__notes || []).some(x => x.replace(/[\\s\u00a0\u202f]+/g, ' ').trim() === n)", none, timeout=6000, what=f'the notification "{none}"')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"), 'LFRS LFML', 'no airway serves FL100: the text is unchanged', what='route text at FL100')


@case('F28', 'Auto routes from the end of the chosen SID', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='user, 29 Oct: « un départ FINOT depuis LFBO, premier point GOSAD, ne sort pas GAI via G36 en Auto »; Auto routes on CF.routingChain (the end of the SID after the departure)')
def f28(c):
    # invented airway G36 from the end of the seeded SID NTS1A (NT102) to NEPIX; the route LFRS NEPIX LFML does not name NT102
    fix = {'NT102': (46.8, -1.35), 'G3601': (45.9, 0.6), 'NEPIX': (44.9, 2.4)}

    def seg(a, b):
        import math
        r = math.pi / 180
        h = math.sin((fix[b][0] - fix[a][0]) * r / 2) ** 2 + math.cos(fix[a][0] * r) * math.cos(fix[b][0] * r) * math.sin((fix[b][1] - fix[a][1]) * r / 2) ** 2
        return {'route': 'G36', 'a': {'id': a, 'lat': fix[a][0], 'lon': fix[a][1]}, 'b': {'id': b, 'lat': fix[b][0], 'lon': fix[b][1]},
                'lower': 0, 'upper': 46000, 'nm': round(2 * 3440.065 * math.asin(math.sqrt(h)), 1)}
    procs = {'dep': {'rwy': '03', 'sid': 'LFRS.SID.NTS1A.RW03.NONE'}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-29T08:00:00Z'}
    c.open('fuel', docs=proc_docs() + proc_flight(procs), airfields=True, airways=[seg('NT102', 'G3601'), seg('G3601', 'NEPIX')])
    to_step(c, 1)
    wait_rows(c, 'dep')
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS NEPIX LFML')
    c.page.locator(rt).blur()
    c.until(f"/\\(3\\)/.test(document.querySelector('{FUEL} [data-ptsn]').textContent)", timeout=6000, what='the route resolves to three points')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value.includes('G36')", timeout=8000, what='Auto writes the airway that leaves the SID')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"), 'LFRS NT102 G36 NEPIX LFML',
         'the end of the SID is written after the departure and the airway starts there; LFRS - NT102 is the SID, never routed', what='route text')


@case('F9', 'Routing bench', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, rule='frame/lib/routing.js: the bench passes (41 checks)')
def f9(c):
    c.page.goto(f'{c.base}/frame/lib/test/routing.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/routing.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


@case('F10', 'Sheets bench', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='frame/aerodb/sheets.js: airframe and propulsion come from the ICAO catalogue (DECISIONS 28 Oct 2026), the sheets list names the missing families; the bench passes')
def f10(c):
    c.page.goto(f'{c.base}/modules/fuel/test/sheets.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'modules/fuel/test/sheets.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


# ---------------------------------------------------------------------------------------------------------------- F11 - F18
# Runway, SID, STAR and approach chosen in the preparation (V3_SPECIFICATION 10.20; modules/fuel/SPEC.md section 9).  Seeded procedures
# (aerodb SPEC 5 quinquies): LFRS has two SIDs (one per runway) and a SID transition; LFML two STARs (one per runway), a STAR transition,
# an approach, a hand-read STAR of an old cycle (outdated) and an X-Plane local STAR; LFQQ has nothing.
PROC_CYCLE = '2026-10-01'


def proc_docs(cycle=PROC_CYCLE):
    """The `proc/` documents of the aerodromes LFRS and LFML (published file, hand-read file, X-Plane local file)."""
    def pt(seq, id_, lat, lon, alt=None, **kw):
        return {'seq': seq, 'id': id_, 'lat': lat, 'lon': lon, 'alt': alt, 'phase': kw.pop('phase', 'main'), **kw}

    def rec(icao, kind, name, rws, points, transition=None, status='official', kind_src='eaip', src_cycle=cycle):
        rw = rws[0] if len(rws) == 1 else 'ALL'
        return {'id': f'{icao}.{kind}.{name}.RW{rw}.{transition or "NONE"}', 'icao': icao, 'kind': kind, 'name': name, 'runways': rws,
                'transition': transition, 'points': points, 'status': status,
                'source': {'kind': kind_src, 'ref': 'test', 'cycle': src_cycle, 'at': '2026-10-01'}}

    def file(icao, procs, runways=None, cy=cycle):
        return {'schema': 1, 'icao': icao, 'cycle': cy, 'updated_at': '2026-10-01T00:00:00Z', 'procedures': procs,
                **({'runways': runways} if runways else {})}
    lfrs = [
        rec('LFRS', 'SID', 'NTS1A', ['03'], [pt(1, 'RW03', 47.138, -1.62), pt(2, 'NT101', 47.0, -1.5, {'type': 'min', 'ft': 3000}),
                                             pt(3, 'NT102', 46.8, -1.35, {'type': 'at', 'ft': 5000}, kt=250)]),
        rec('LFRS', 'SID', 'NTS2B', ['21'], [pt(1, 'RW21', 47.17, -1.595), pt(2, 'NT201', 47.3, -1.4, {'type': 'max', 'ft': 4000}),
                                             pt(3, 'NT202', 47.0, -1.1, {'type': 'between', 'ft': 6000, 'ft2': 9000})]),
        rec('LFRS', 'SID', 'NTS1A', [], [pt(1, 'NT102', 46.8, -1.35, phase='trans'), pt(2, 'LUGEN', 46.5833, -1.2, phase='trans')],
            transition='LUGEN'),
    ]
    lfml = [
        rec('LFML', 'STAR', 'MEN1A', ['13R'], [pt(1, 'MEN01', 44.2, 3.6, {'type': 'between', 'ft': 8000, 'ft2': 10000}),
                                               pt(2, 'MEN02', 43.8, 4.5, {'type': 'max', 'ft': 5000}, kt=220),
                                               pt(3, 'MEN03', 43.55, 4.95, {'type': 'at', 'ft': 3000})]),
        rec('LFML', 'STAR', 'MEN2B', ['31L'], [pt(1, 'MEN11', 44.0, 3.9, {'type': 'min', 'ft': 7000}),
                                               pt(2, 'MEN12', 43.6, 5.6, {'type': 'at', 'ft': 4000})]),
        rec('LFML', 'STAR', 'MEN1A', [], [pt(1, 'NEPIX', 44.9, 2.4, phase='trans'), pt(2, 'MEN01', 44.2, 3.6, phase='trans')], transition='NEPIX'),
        rec('LFML', 'APP', 'I13R', ['13R'], [pt(1, 'FAF13', 43.5, 5.0, {'type': 'at', 'ft': 2500}, kt=180), pt(2, 'RW13R', 43.445, 5.19),
                                             pt(3, 'MAP13', 43.38, 5.3, phase='missed')]),
    ]
    # LFVA (invented): approaches only, on two runways, one with a transition; no SID, no STAR, no runway record
    lfva = [
        rec('LFVA', 'APP', 'ILS09', ['09'], [pt(1, 'VA101', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'VA102', 45.02, 3.2, {'type': 'at', 'ft': 2000}),
                                             pt(3, 'RW09', 45.03, 3.4)]),
        rec('LFVA', 'APP', 'ILS09', ['09'], [pt(1, 'VA201', 44.8, 2.7, {'type': 'min', 'ft': 4000}), pt(2, 'VA101', 45.0, 3.0)], transition='VA201'),
        rec('LFVA', 'APP', 'VOR09', ['09'], [pt(1, 'VA111', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'RW09', 45.03, 3.4)]),
        rec('LFVA', 'APP', 'VOR27', ['27'], [pt(1, 'VA127', 45.05, 3.8, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)]),
        # RNP27: no main record, one per entry; VB301 leads to VB127, which is the approach (VB301 -> VB127 -> threshold)
        rec('LFVA', 'APP', 'RNP27', ['27'], [pt(1, 'VB127', 45.06, 3.9, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)], transition='VB127'),
        rec('LFVA', 'APP', 'RNP27', ['27'], [pt(1, 'VB301', 45.2, 4.3, {'type': 'at', 'ft': 5000}), pt(2, 'VB127', 45.06, 3.9)], transition='VB301'),
    ]
    # LFVB (invented): one STAR that names no runway (it serves them all), no runway record; the base knows its runway axis
    lfvb = [rec('LFVB', 'STAR', 'BET1A', [], [pt(1, 'VB101', 45.8, 3.1, {'type': 'max', 'ft': 9000}), pt(2, 'VB102', 45.6, 3.4, {'type': 'at', 'ft': 4000})])]
    # LFVC (invented): the conflicts. ILS27 (runway 27) with a transition IC301 that starts at IC301 and joins IC127; ILS09; ARR1A (27) ends at
    # IC301 (joins the transition), ARR2B (09) ends at ID999 (joins nothing)
    lfvc = [
        rec('LFVC', 'APP', 'ILS27', ['27'], [pt(1, 'IC127', 45.1, 3.8, {'type': 'at', 'ft': 3000}), pt(2, 'RW27', 45.03, 3.45)]),
        rec('LFVC', 'APP', 'ILS27', ['27'], [pt(1, 'IC301', 45.3, 4.3, {'type': 'at', 'ft': 5000}), pt(2, 'IC127', 45.1, 3.8)], transition='IC301'),
        rec('LFVC', 'APP', 'ILS09', ['09'], [pt(1, 'IC109', 45.0, 3.0, {'type': 'at', 'ft': 3000}), pt(2, 'RW09', 45.03, 3.4)]),
        rec('LFVC', 'STAR', 'ARR1A', ['27'], [pt(1, 'IC201', 45.6, 4.7, {'type': 'max', 'ft': 9000}), pt(2, 'IC301', 45.3, 4.3)]),
        rec('LFVC', 'STAR', 'ARR2B', ['09'], [pt(1, 'IC210', 45.7, 4.8, {'type': 'max', 'ft': 9000}), pt(2, 'ID999', 45.5, 4.9)]),
    ]
    rw_lfrs = [{'id': '03', 'lat': 47.138, 'lon': -1.62, 'elev': 90, 'qfu': 30}, {'id': '21', 'lat': 47.17, 'lon': -1.595, 'elev': 60, 'qfu': 210}]
    rw_lfml = [{'id': '13R', 'lat': 43.445, 'lon': 5.19, 'elev': 30, 'qfu': 130}, {'id': '31L', 'lat': 43.41, 'lon': 5.24, 'elev': 20, 'qfu': 310}]
    old = rec('LFML', 'STAR', 'MAN1A', ['13R'], [pt(1, 'MAN01', 44.0, 3.8)], status='check', kind_src='manual', src_cycle='2025-01-01')
    xpl = rec('LFML', 'STAR', 'XPL1A', ['13R'], [pt(1, 'XPL01', 44.0, 3.7)], status='official', kind_src='cifp')
    return [[f'proc/{cycle}/LFRS.json', file('LFRS', lfrs, rw_lfrs), 'reference'], [f'proc/{cycle}/LFML.json', file('LFML', lfml, rw_lfml), 'reference'],
            [f'proc/{cycle}/LFVA.json', file('LFVA', lfva), 'reference'], [f'proc/{cycle}/LFVB.json', file('LFVB', lfvb), 'reference'],
            [f'proc/{cycle}/LFVC.json', file('LFVC', lfvc), 'reference'],
            ['proc/manual/LFML.json', file('LFML', [old], cy='2025-01-01'), 'reference'], ['proc/local/LFML.json', file('LFML', [xpl]), 'reference']]


def proc_flight(procs=None, started=False, actual=None):
    """The planned flight of lib.FLIGHT with `route.procedures` = procs (any shape: v1 or v2); `actual`: a position (lat, lon) the frame wrote
    just now (progress.actual)."""
    docs = flight_docs(started)
    for d in docs:
        if d[0].endswith('current_flight.json'):
            if procs is not None:
                d[1]['route']['procedures'] = procs
            if actual:
                at = (d[1].get('started') or {}).get('at') or d[1]['updated_at']
                d[1]['progress'] = {'actual': {'at': at, 'lat': actual[0], 'lon': actual[1], 'source': 'gps'}}
    return docs


def to_step(c, n):
    """Shows the step `n` (0 Flight ... 4 Departure) of the plan when it is not the one on screen (a phone shows one step at a time)."""
    if not c.shown(f'{FUEL} section.fu-step[data-s="{n}"]'):
        c.tap(f'{FUEL} .fu-steps button[data-step="{n}"]')


def open_proc(c, target='fuel', procs=None, started=False, actual=None, aero_extra=None):
    """Opens fuel on the planned flight with the seeded procedures; the published base knows the route's points (and `aero_extra`).  Before the
    start the procedure rows are in the step Route (user, 29 Oct: « star et sid sont route, pas vol »): the step is shown, unless the address
    asks for a step (focus=)."""
    c.open(target, docs=proc_docs() + proc_flight(procs, started, actual), airfields=True, aero_extra=aero_extra)
    if not started and 'focus=' not in target:
        to_step(c, 1)


def sel_opts(c, k):
    """[(value, label)] of the select data-k=`k`, or None when there is none."""
    return c.js("""(k) => { const s = document.querySelector('[data-module=fuel] select[data-k="' + k + '"]');
        return s ? [...s.options].map(o => [o.value, o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()]) : null }""", k)


def wait_rows(c, side='arr'):
    c.until("(s) => !!document.querySelector('[data-module=fuel] [data-proc=\"' + s + '\"]')", side, timeout=15000, what=f'the {side} procedure row is drawn')
    c.settle()


def cf_doc(c, pred, what, timeout=8000):
    return c.until_doc('pilot/ABC/current_flight.json', pred, what, timeout=timeout)


def procs_of(d, side):
    return (((d.get('route') or {}).get('procedures')) or {}).get(side)


V2_PROCS = {'dep': {'rwy': '03', 'sid': 'LFRS.SID.NTS1A.RW03.NONE'}, 'arr': {'rwy': '13R', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'},
            'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}


@case('F11', 'Departure and arrival rows: runway, SID, STAR, approach', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.20 / fuel SPEC 9: two short rows after the aerodromes, each a select filled by aerodb; a runway filters the lists')
def f11(c):
    open_proc(c)
    wait_rows(c, 'dep')
    wait_rows(c, 'arr')
    heads = c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc] .fu-prochead')].map(e => e.textContent.trim())")
    c.eq(heads, [row(c, 'dep'), row(c, 'arr')], 'the rows are headed Departure and Arrival in the language of the run', what='row heads')
    # the rows are in the step Route (second step, after the route text, the points and the OFP row), not in the step Flight (user, 29 Oct)
    c.eq(c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc]')].map(r => r.closest('section.fu-step').dataset.s)"), ['1', '1'],
         'the Departure and Arrival rows are in step 2 Route', what='steps carrying the rows')
    c.eq(c.count(f'{FUEL} section.fu-step[data-s="0"] [data-proc]'), 0, 'and none in step 1 Flight', what='rows in the Flight step')
    c.ok(c.js("(() => { const card = document.querySelector('[data-module=fuel] [data-procbox=route]').closest('.f-card'); const sec = card.closest('section'); const cards = [...sec.querySelectorAll(':scope > .f-card')]; return cards.at(-1) === card && cards.length === 2 && cards[0].dataset.block === 'route' })()"),
         'card not last', 'the card is the last of the Route step, after the route and the OFP row')
    c.eq(c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc=dep] select')].map(s => s.dataset.k)"), ['p-dep-rwy', 'p-dep-sid'],
         'Departure: runway, SID (the transition select comes with a SID that has transitions)', what='departure selects')
    c.eq(c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc=arr] select')].map(s => s.dataset.k)"), ['p-arr-rwy', 'p-arr-star', 'p-arr-app'],
         'Arrival: runway, STAR, approach', what='arrival selects')
    c.eq([v for v, _ in sel_opts(c, 'p-dep-rwy')], ['', '03', '21'], 'the runways of aerodb (empty = not chosen)', what='departure runways')
    stars = sel_opts(c, 'p-arr-star')
    c.eq([lab for _, lab in stars][:2], ['—', norm(row(c, 'procNone'))], 'empty "—" first, then "aucune"', what='first STAR options')
    names = [lab.split(' ·')[0] for v, lab in stars if v not in ('', '__none')]
    c.ok('MEN1A' in names and 'MEN2B' in names, f'STAR options {stars}', 'without a runway both STARs are offered')
    # a runway does not cut the lists any more: the STAR that does not serve it stays selectable, marked in conflict (F25)
    c.page.select_option(f'{FUEL} select[data-k="p-arr-rwy"]', '13R')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]'); return !!s && [...s.options].some(o => /MEN2B.*⚠/.test(o.textContent)) })()",
            what='the STAR of the other runway is marked in conflict with the runway 13R')
    labs = [lab for _, lab in sel_opts(c, 'p-arr-star')]
    c.ok(any(lab.startswith('MEN1A') and '⚠' not in lab for lab in labs), f'STAR options {labs}', 'MEN1A (13R) is not marked')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '13R', 'the runway is written in route.procedures')
    c.eq(d['route']['procedures']['by'], 'fuel', 'by is fuel', what='procedures.by')
    c.ok(c.js("(t) => !isNaN(Date.parse(t))", d['route']['procedures'].get('at')), f"at {d['route']['procedures'].get('at')!r}", 'at is an ISO date')
    # a STAR with a transition offers the transition select; an approach without one does not
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', 'LFML.STAR.MEN1A.RW13R.NONE')
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-arr-trans\"]')", what='the transition select appears with a STAR that has transitions')
    c.eq([lab for _, lab in sel_opts(c, 'p-arr-trans')], ['—', 'NEPIX'], 'the transitions of the chosen STAR', what='transition options')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-app"]', 'LFML.APP.I13R.RW13R.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFML.APP.I13R.RW13R.NONE', 'the approach is written')
    c.eq(d['route']['procedures']['arr'], {'rwy': '13R', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'},
         'identifiers of the aerodb schema', what='route.procedures.arr')
    c.eq(sel_opts(c, 'p-arr-appTrans'), None, 'no approach transition select when the approach has none', what='approach transition select')


@case('F12', 'Procedures: "aucune" writes null, absent is not chosen', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: null = none (the pilot\'s choice), a field absent = not chosen')
def f12(c):
    open_proc(c, procs=V2_PROCS)
    wait_rows(c)
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]').value"), 'LFML.STAR.MEN1A.RW13R.NONE', 'the chosen STAR is selected', what='STAR select')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', '__none')
    d = cf_doc(c, lambda d: 'star' in (procs_of(d, 'arr') or {}) and procs_of(d, 'arr')['star'] is None, '"aucune" writes star: null')
    c.eq(procs_of(d, 'arr').get('app'), 'LFML.APP.I13R.RW13R.NONE', 'the approach is not touched', what='approach')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]').value"), '__none', 'the select shows "aucune"', what='STAR select')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', '')
    d = cf_doc(c, lambda d: 'star' not in (procs_of(d, 'arr') or {'star': 1}), 'the empty option removes the field')
    c.ok('star' not in procs_of(d, 'arr'), f"arr {procs_of(d, 'arr')}", 'a STAR not chosen is absent, not null')


@case('F13', 'Procedures list: X-Plane local last, outdated marked', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.20: an xplane record comes last with "X-Plane, local"; an outdated one ends with the symbol ⌛ (user, 29 Oct: a short symbol rather than the word), class outdated and a title')
def f13(c):
    open_proc(c)
    wait_rows(c)
    opts = [lab for v, lab in sel_opts(c, 'p-arr-star') if v not in ('', '__none')]
    c.eq(opts[-1], f"XPL1A · 13R · {norm(row(c, 'procXplane'))}", 'the X-Plane local STAR is the last (sorted last, no group), with its runway and its mention', what='last STAR option')
    old = next((lab for lab in opts if lab.startswith('MAN1A')), None)
    c.eq(old, 'MAN1A · 13R ⌛', 'the hand-read STAR of an old cycle (one runway: in the label) ends with the hourglass, without the word', what='outdated STAR option')
    o = c.js("(() => { const o = [...document.querySelectorAll('[data-module=fuel] [data-k=\"p-arr-star\"] option')].find(x => x.textContent.startsWith('MAN1A')); return o && { cls: o.className, title: o.title } })()")
    c.eq((o or {}).get('cls'), 'outdated', 'the option carries the class outdated (grey on the computer)', what='class')
    c.eq(norm((o or {}).get('title') or ''), norm(row(c, 'procOutdatedTitle')), 'and the title says it was read under an earlier cycle', what='title')
    c.ok(opts.index(old) < len(opts) - 1, f'order {opts}', 'the outdated one is before the X-Plane one')


@case('F14', 'Aerodrome without data: reading offered, refusal shown', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.20: "aucune procédure publiée" and one button; fetchProcedures refused with a reason, shown in a floating notification, never silent')
def f14(c):
    open_proc(c)
    wait_rows(c)
    set_icao(c, 'dep', 'LFQQ')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=dep] [data-do=procfetch]')", what='the departure row offers the reading')
    txt = norm(c.text(f'{FUEL} [data-proc="dep"]') or '')
    c.ok(norm(row(c, 'procNoData')) in txt, f'row {txt!r}', '"aucune procédure publiée" in the language of the run')
    c.eq(norm(c.text(f'{FUEL} [data-do="procfetch"]') or ''), norm(row(c, 'procRead').replace('{icao}', 'LFQQ')), 'the button names the aerodrome', what='button')
    c.ge(round(c.box(f'{FUEL} [data-do="procfetch"]')['h']), 44, 'a 44 px target', what='button height')
    c.tap(f'{FUEL} [data-do="procfetch"]')
    want = norm(tx(F, "no-launcher'", c.lang, after='procReasons'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, timeout=6000,
            what='the refusal reason (no launcher serves the test page: aerodb answers "no-launcher") is shown in a notification')
    c.until("!!document.querySelector('[data-module=fuel] [data-do=procfetch]:not([disabled])')", what='the button is available again after a refusal')
    # dispatch par État d'aerodb (82eeef3b5) : France par l'eAIP du SIA, État à tables par EAD Basic, sinon 'no-tables' ; plus de
    # « mise en page inconnue »
    src = (ROOT / F).read_text(encoding='utf-8')
    c.ok("'unknown-layout'" not in src, 'still there', 'the refusal "unknown layout" is gone (aerodb no longer answers it)')
    c.ok(bool(tx(F, "no-tables'", c.lang, after='procReasons').strip()), 'missing', '"no procedure tables published for this State" is written in the language of the run')
    for k in ('eaip', 'ead'):
        c.ok(bool(tx(F, k, c.lang, after='procReadingSrc').strip()), 'missing', f'the reading in progress names its source ({k})')
    # comptes d'une lecture réussie (aerodb stats) : jamais « 0 procédures » seul
    for k in ('procFetchedPages', 'procRejected', 'procDropped', 'procUnnamed'):
        c.ok('{' in tx(F, k, c.lang), 'missing', f'the success notification wording {k} exists in the language of the run')


@case('F15', 'Quote on the procedures path: legs with origins, profile.path', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: the quote runs on flownPath(expandedPath); quote.legs = one entry per point with its origin; profile.path [{ nm, ft }]')
def f15(c):
    open_proc(c, procs=V2_PROCS)
    wait_quote(c)
    d = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) > 4 and bool((d.get('profile') or {}).get('path')),
               'the quote writes legs on the path and profile.path', timeout=15000)
    legs, q, path = d['quote']['legs'], d['quote'], d['profile']['path']
    ids = [x['id'] for x in legs]
    c.eq(ids[0], 'LFRS', 'the path starts at the departure aerodrome', what='first leg')
    c.eq(ids[-1], 'LFML', 'and ends at the arrival aerodrome', what='last leg')
    c.eq(legs[0]['origin'], 'route', 'the aerodrome is a route point', what='first origin')
    origins = [x['origin'] for x in legs]
    c.ok('sid' in origins and 'star' in origins and 'app' in origins, f'origins {origins}', 'the SID, the STAR and the approach points are in the legs')
    c.ok(origins.index('sid') < origins.index('route', 1) < origins.index('star') < origins.index('app'), f'origins {origins}',
         'in flight order: route, SID, route, STAR, approach')
    c.ok('RW03' in ids and 'RW13R' in ids, f'ids {ids}', 'the chosen runway thresholds are points of the path')
    mins = [x['min'] for x in legs]
    c.ok(all(b >= a for a, b in zip(mins, mins[1:])) and mins[0] == 0, f'minutes {mins}', 'minutes from brake release grow along the path')
    c.ok(all(b['nm'] >= a['nm'] for a, b in zip(path, path[1:])) and path[0]['nm'] == 0, f'path {path[:4]}', 'profile.path is [{ nm, ft }] by growing distance from 0')
    c.eq(round(path[-1]['nm'], 1), q['distanceNm'], 'the vertical path ends at the quote\'s distance (the last point\'s nm)', what='path end', tol=0.11)
    c.ok(any(p['ft'] == 5000 for p in path), f'path {path}', 'the "at 5000 ft" constraint of the SID is on the path')
    c.ok(any(p['ft'] <= 3000 for p in path[len(path) // 2:]), f'path {path}', 'the arrival is brought down by the STAR\'s constraints')
    # the same flight without procedures: legs of the route only, no profile.path
    open_proc(c)
    wait_quote(c)
    d2 = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) == 4, 'the quote of the plain route has 4 legs')
    c.eq([x['origin'] for x in d2['quote']['legs']], ['route'] * 4, 'legs of a route without procedures all say "route"', what='origins')
    c.eq((d2.get('profile') or {}).get('path'), None, 'and no profile.path', what='profile.path')
    c.ok(q['distanceNm'] > d2['quote']['distanceNm'], f"{q['distanceNm']} vs {d2['quote']['distanceNm']}", 'the quote counts the distance flown on the procedures')


@case('F16', 'After the start: arrival editable, only legs and the vertical path are rewritten', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20 second refinement: legs, profile.path, length and legsAt change; block, trip and minutes do not; no new quote')
def f16(c):
    open_proc(c, procs=V2_PROCS, started=True)
    d = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) > 4 and bool((d.get('profile') or {}).get('path')),
               'a quote with legs on the path', timeout=15000)
    c.tap(f'{FUEL} .fu-steps button[data-step="4"]')
    c.until("!!document.querySelector('[data-module=fuel] [data-block=procs]:not(.fu-hide) [data-proc=arr] select')", timeout=10000,
            what='after the start the Departure step carries the arrival row')
    c.eq(c.count(f'{FUEL} [data-procbox="route"] select'), 0, 'the step Route no longer carries the rows after the start', what='rows in the Route step')
    c.ok(c.count(f'{FUEL} [data-proc="dep"] select') >= 1, 'no departure select', 'the departure row is editable while the SID is not passed')
    before, bpath = d['quote'], d['profile']['path']
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', '__none')
    d2 = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) != len(before['legs']), 'the legs follow the new choice (no STAR)', timeout=10000)
    q = d2['quote']
    for k in ('block', 'trip', 'minutes', 'levelFt', 'unit', 'taxiMin', 'distanceNm'):
        c.eq(q.get(k), before.get(k), 'the fuel figures do not move after the start', what=f'quote.{k}')
    c.ok(q.get('legsAt') and c.js("(t) => !isNaN(Date.parse(t))", q['legsAt']), f"legsAt {q.get('legsAt')!r}", 'quote.legsAt dates the rewrite')
    c.ok('star' not in [x['origin'] for x in q['legs']], f"origins {[x['origin'] for x in q['legs']]}", 'the legs no longer carry the STAR')
    c.ok(d2['profile']['path'] != bpath, 'profile.path unchanged', 'the vertical path is rewritten')
    c.eq(procs_of(d2, 'arr').get('star'), None, 'route.procedures records the change', what='arr.star')
    c.eq(d2['route']['procedures']['by'], 'fuel', 'by is fuel', what='procedures.by')
    # the departure stays editable while the SID is not passed: a fresh position beyond its end freezes the row, the arrival stays open
    open_proc(c, procs=V2_PROCS, started=True, actual=(44.9, 2.4))
    c.tap(f'{FUEL} .fu-steps button[data-step="4"]')
    c.until("!!document.querySelector('[data-module=fuel] [data-block=procs]:not(.fu-hide) [data-proc=arr] select')", timeout=15000, what='the arrival row is drawn')
    c.wait(500)
    c.eq(c.count(f'{FUEL} [data-proc="dep"] select'), 0, 'the SID is passed (position at NEPIX): the departure row is no longer editable', what='departure selects')
    c.ok(norm(row(c, 'procPassed')) in norm(c.text(f'{FUEL} [data-procbox="start"]') or ''), 'no sentence', 'and says why')
    c.ok(c.count(f'{FUEL} [data-proc="arr"] select') >= 1, 'no arrival select', 'the arrival stays editable')


@case('F17', '#fuel?focus=arr focuses the arrival row', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: the Map\'s "Changer" opens the step with the arrival row (Route before the start, Départ after) and focuses its first select')
def f17(c):
    open_proc(c, target='fuel?focus=arr', procs=V2_PROCS)
    c.until("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k === 'p-arr-rwy'", timeout=15000,
            what='the first select of the arrival row has the focus')
    c.until("(() => { const e = document.querySelector('[data-module=fuel] [data-procbox=route]'); return !!e && e.offsetParent !== null })()", timeout=6000, what='the step Route is the one shown')
    open_proc(c, target='fuel?focus=arr', procs=V2_PROCS, started=True)
    c.until("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k === 'p-arr-rwy'", timeout=15000,
            what='after the start the Departure step is opened and its arrival row focused')
    c.until("(() => { const e = document.querySelector('[data-module=fuel] [data-procbox=start]'); return !!e && e.offsetParent !== null })()", timeout=6000, what='the Departure step is the one shown')


@case('F18', 'route.procedures v1 is read, not rewritten at mount; v2 at the next write', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: migration by proceduresOf; nothing written at mount; the next ordinary write puts v2 and drops a side whose aerodrome changed')
def f18(c):
    v1 = {'sid': {'id': 'LFRS.SID.NTS1A.RW03.NONE', 'icao': 'LFRS', 'kind': 'SID', 'name': 'NTS1A', 'runways': ['03'], 'points': [], 'status': 'ofp'},
          'star': {'id': 'LFXX.STAR.ZZZ1A.RWALL.NONE', 'icao': 'LFXX', 'kind': 'STAR', 'name': 'ZZZ1A', 'runways': [], 'points': [], 'status': 'ofp'}}
    # no aircraft, no profile, no points and a typed distance: no quote, no route to read and no forecast to apply, so nothing at mount has a reason to write the flight
    docs = proc_docs() + flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route']['procedures'] = v1
            d[1].pop('aircraft', None)
            d[1].pop('profile', None)
            d[1]['route'].pop('text', None)
            d[1]['route']['manual'] = True                       # a distance typed by hand: the route is not read again at mount
            d[1]['route'].pop('points', None)                    # and no points: no winds aloft to fetch and write at mount
    c.open('fuel', docs=docs, airfields=True)
    wait_rows(c, 'dep')
    c.wait(1500)
    c.eq(c.doc('pilot/ABC/current_flight.json')['route']['procedures'], v1, 'a v1 record is left as it is at mount', what='route.procedures after mount')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-dep-sid\"]').value"), 'LFRS.SID.NTS1A.RW03.NONE',
         'the SID of the v1 record is shown (proceduresOf)', what='SID select')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-dep-rwy\"]').value"), '03', 'and its single runway', what='runway select')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]').value"), '',
         'a STAR of another aerodrome than the route\'s arrival is not chosen', what='STAR select')
    c.page.fill(f'{FUEL} input[data-k="fl"]', '250')                 # an ordinary write
    d = cf_doc(c, lambda d: (d.get('level') or {}).get('ft') == 25000 and 'dep' in ((d.get('route') or {}).get('procedures') or {}),
               'the next write migrates route.procedures to v2')
    p = d['route']['procedures']
    c.eq(p['dep'], {'rwy': '03', 'sid': 'LFRS.SID.NTS1A.RW03.NONE'}, 'v2 departure: identifiers and the single runway', what='dep')
    c.eq(p['arr'], {}, 'the side of another aerodrome is dropped', what='arr')
    c.eq(p['by'], 'fuel', 'by is fuel', what='by')


@case('F19', 'Load my OFP: its SID and STAR replace the choice and the change is said', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.20: "Load my OFP" writes the OFP\'s SID / STAR identifiers (v2) over the pilot\'s choice and notifies one line per side')
def f19(c):
    ofp = json.loads((ROOT / 'frame/aerodb/test/fixtures/ofp_lfrs_lfml.json').read_text(encoding='utf-8'))
    procs = {'dep': {'sid': 'LFRS.SID.NTS1A.RW03.NONE'}, 'arr': {'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}
    c.open('fuel', docs=proc_docs() + proc_flight(procs), airfields=True, identity={'simbrief': '123456'})
    wait_rows(c)
    to_step(c, 1)
    c.page.route('**/www.simbrief.com/**', lambda r: r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(ofp)))
    c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
    c.tap(f'{FUEL} [data-do="simbrief"]')
    d = cf_doc(c, lambda d: str((procs_of(d, 'arr') or {}).get('star', '')).startswith('LFML.STAR.LERG1R'), 'the OFP\'s STAR is written', timeout=15000)
    p = d['route']['procedures']
    c.eq(p['by'], 'fuel', 'by is fuel', what='procedures.by')
    c.ok(str(p['dep'].get('sid', '')).startswith('LFRS.SID.LUGE4N'), f"dep {p['dep']}", 'the OFP\'s SID replaces the pilot\'s')
    c.eq((p['dep'].get('rwy'), p['arr'].get('rwy')), ('03', '13L'), 'the runways of the OFP (one runway per record)', what='runways')
    c.ok('app' not in p['arr'], f"arr {p['arr']}", 'the pilot\'s approach is replaced with the rest of the side')
    notes = [norm(n) for n in c.note_log()]
    kinds = lambda k: norm(tx(F, k, c.lang, after='procKinds: {'))
    star_line = norm(row(c, 'procChange').replace('{side}', row(c, 'arr')).replace('{parts}', f"{kinds('rwy')} — → 13L · {kinds('star')} MEN1A → LERG1R · {kinds('app')} I13R → —"))   # continuity is never a conflict (29 Oct): no ⚠ on the replaced STAR
    sid_line = norm(row(c, 'procChange').replace('{side}', row(c, 'dep')).replace('{parts}', f"{kinds('rwy')} — → 03 · {kinds('sid')} NTS1A → LUGE4N"))
    c.ok(star_line in notes, f'notifications {notes}', f'one line for the arrival: {star_line}')
    c.ok(sid_line in notes, f'notifications {notes}', f'one line for the departure: {sid_line}')


def set_icao(c, side, icao):
    """Types an aerodrome in the departure or arrival field (step Flight), then goes back to the step Route where the rows are."""
    to_step(c, 0)
    c.page.fill(f'{FUEL} input[data-k="{side}"]', icao)
    to_step(c, 1)


def opt_groups(c, k):
    """Number of <optgroup> in the select data-k=`k` (the lists are flat: none)."""
    return c.js("""(k) => document.querySelectorAll('[data-module=fuel] select[data-k="' + k + '"] optgroup').length""", k)


@case('F20', 'Aerodrome with approaches only: they are listed, in one flat list sorted by runway, on both rows', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=True, rule='V3 spec 10.20-10.23: a row lists all the procedures of the aerodrome in one flat list ordered by runway then name; the approaches show without a STAR')
def f20(c):
    open_proc(c)
    wait_rows(c, 'arr')
    # arrival: an aerodrome with approaches only; the row is not "no published procedure", the approaches are grouped by runway
    set_icao(c, 'arr', 'LFVA')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-app\"] option')].some(o => /LFVA/.test(o.value))", what='the approach list of LFVA is drawn')
    txt = norm(c.text(f'{FUEL} [data-proc="arr"]') or '')
    c.ok(norm(row(c, 'procNoData')) not in txt, f'row {txt!r}', 'an aerodrome with approaches only is not "no published procedure"')
    c.eq(c.count(f'{FUEL} [data-proc="arr"] [data-do="procfetch"]:not([data-again])'), 0, 'and offers no first reading (only « Relire »)', what='reading buttons')
    c.eq(opt_groups(c, 'p-arr-app'), 0, 'the list is flat: no group per runway', what='approach groups')
    apps = [lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')]
    c.eq(apps, ['ILS09', 'VOR09', 'RNP27', 'VOR27'], 'the approaches without transition and the one given by its entries (listed once), sorted by runway then name; the name already says the runway', what='approach options')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-star')], ['', '__none'], 'the STAR list is empty (— and none): the approach does not wait for a STAR', what='STAR options')
    # departure: the same aerodrome has no SID, the row still shows (runway, SID "none") and not the reading
    set_icao(c, 'dep', 'LFVA')
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-dep-sid\"]')", what='the departure row of LFVA is drawn')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]:not([data-again])'), 0, 'the departure row of an aerodrome with approaches only offers no reading', what='reading buttons')
    # a file installed after a first empty answer is seen at the next question (an empty answer is not kept)
    set_icao(c, 'arr', 'LFQQ')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] [data-do=procfetch]')", what='LFQQ has nothing: the reading is offered')
    set_icao(c, 'arr', 'LFVA')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-app\"] option')].some(o => /LFVA/.test(o.value))", what='back on LFVA the approaches are listed again')


@case('F21', 'A procedure serving one runway sets it; a choice is kept when another one conflicts; a transition follows its STAR', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='V3 spec 10.23: a runway chosen after a STAR and an approach that do not serve it removes nothing (route.procedures keeps them) and says the conflict once')
def f21(c):
    # the approach first: it serves one runway (13R), which becomes the runway; the STAR of the other runway stays in the list
    open_proc(c)
    wait_rows(c, 'arr')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-app"]', 'LFML.APP.I13R.RW13R.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFML.APP.I13R.RW13R.NONE', 'the approach is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '13R', 'app': 'LFML.APP.I13R.RW13R.NONE'}, 'the approach serves one runway: it is the runway', what='route.procedures.arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && s.value === '13R' })()", what='the runway select shows 13R')
    c.ok(any('MEN2B' in lab for _, lab in sel_opts(c, 'p-arr-star')), f"STAR options {sel_opts(c, 'p-arr-star')}", 'the STAR of 31L is still listed (marked, not removed)')
    # the hand-read STAR of an old cycle on the chosen runway, joining no point of the approach: ⌛ only (continuity is never a conflict)
    o = opt_info(c, 'p-arr-star', 'MAN1A')
    c.eq(o['label'], 'MAN1A · 13R ⌛', 'outdated, on the chosen runway: the hourglass only, no warning for a STAR that joins no point', what='label')
    c.eq(o['cls'].split(), ['outdated'], 'only the class outdated', what='class')
    c.eq(o['title'], norm(row(c, 'procOutdatedTitle')), 'and its single reason in the title', what='title')
    # the STAR chosen next, then another runway: both choices are kept, one line says they conflict
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', 'LFML.STAR.MEN1A.RW13R.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFML.STAR.MEN1A.RW13R.NONE', 'the STAR is written')
    n0 = len(c.note_log())
    c.page.select_option(f'{FUEL} select[data-k="p-arr-rwy"]', '31L')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '31L', 'the other runway is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '31L', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'},
         'the STAR and the approach that do not serve 31L are kept', what='route.procedures.arr')
    c.until("(n) => (window.__notes || []).length > n", n0, timeout=6000, what='one notification says the conflict')
    c.wait(600)
    notes = [norm(n) for n in c.note_log()[n0:]]
    why = norm(row(c, 'procConflictRwy').replace('{rwy}', '31L'))
    c.eq(len(notes), 1, 'and only one', what=f'notifications {notes}')
    c.ok(notes[0].startswith('⚠') and 'MEN1A' in notes[0] and 'I13R' in notes[0] and why in notes[0], f'notification {notes[0]!r}', f'it names both procedures and the reason "{why}"')
    # a transition belongs to its STAR: another STAR drops it
    open_proc(c, procs={'arr': {'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'trans': 'LFML.STAR.MEN1A.RW.NEPIX'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    wait_rows(c, 'arr')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', 'LFML.STAR.MEN2B.RW31L.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFML.STAR.MEN2B.RW31L.NONE', 'the other STAR is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '31L', 'star': 'LFML.STAR.MEN2B.RW31L.NONE'}, 'another STAR drops the transition and sets its single runway', what='route.procedures.arr')


@case('F22', 'No runway record: the runways are those of the procedures, else the two ends of the axis', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: aerodb.runways may answer []; fuel still offers the runways the procedures name, then the axis of the base (it reads, never writes)')
def f22(c):
    base = {'aerodromes': [{'icao': 'LFVB', 'name': 'LFVB TEST', 'lat': 45.5, 'lon': 3.5, 'elev': 400, 'bearing': 95.0, 'magVar': 2.0}]}
    open_proc(c, aero_extra=base)
    wait_rows(c, 'arr')
    # LFVA: no runway in its file; its approaches name 09 and 27
    set_icao(c, 'arr', 'LFVA')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-rwy\"] option')].some(o => o.value === '09')", what='the runways of LFVA are offered')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '09', '27'], 'the runways named by the procedures (the file has no runway record)', what='LFVA runways')
    set_icao(c, 'dep', 'LFVA')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-dep-rwy\"] option')].some(o => o.value === '09')", what='the departure runways of LFVA are offered')
    c.eq([v for v, _ in sel_opts(c, 'p-dep-rwy')], ['', '09', '27'], 'and on the departure row, although LFVA has no SID', what='LFVA departure runways')
    c.page.select_option(f'{FUEL} select[data-k="p-arr-rwy"]', '27')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '27', 'a runway of that list is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '27'}, 'it is the pilot\'s choice', what='route.procedures.arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-app\"]'); return !!s && [...s.options].some(o => /⚠/.test(o.textContent)) })()", what='the approaches of the other runway are marked')
    c.eq([lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')], ['ILS09 ⚠', 'VOR09 ⚠', 'RNP27', 'VOR27'], 'runway 27: the approaches of 09 stay in the list, marked in conflict', what='approaches')
    # LFVB: the only procedure names no runway; the base gives the axis (95 true, 2 E: 09 and 27)
    set_icao(c, 'arr', 'LFVB')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /BET1A/.test(o.textContent))", what='the row of LFVB is drawn')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '09', '27'], 'the two ends of the runway axis of the base', what='LFVB runways')
    stars = sel_opts(c, 'p-arr-star')
    c.ok(any('BET1A' in lab for _, lab in stars), f'STAR options {stars}', 'a STAR serving every runway is listed')


VERTICAL_JS = """async () => {
  const PG = await import('/modules/fuel/progress.js');
  // a flown path, nm from the departure: the route to 296 NM, a STAR fix at 300 (at 3000 ft: 23,000 ft under the cruise, 4 NM further),
  // the approach (floor, then "at 1600"), then what the file does not mark as the missed approach: a climb to 7000 ft, then the aerodrome
  const at = ft => ({ type: 'at', ft }), min = ft => ({ type: 'min', ft });
  const fp = [{ id: 'AAAA', nm: 0 }, { id: 'BBBB', nm: 150 }, { id: 'CCCC', nm: 296 }, { id: 'E1', nm: 300, alt: at(3000) }, { id: 'I1', nm: 310, alt: min(1600) },
    { id: 'F1', nm: 314, alt: at(1600) }, { id: 'M1', nm: 330 }, { id: 'M2', nm: 360, alt: at(7000) }, { id: 'XXAD', nm: 380 }];
  const q = { levelFt: 26000, climb: { nm: 60 }, descent: { nm: 78 } };
  return { fp: fp.map(p => [p.id, p.nm]), vp: PG.verticalPath(fp, q), up: 26000 / 60, dn: 26000 / 78 };
}"""


@case('F23', 'Vertical path: no fold, no jump, no climb back in the descent', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: profile.path keeps the cruise until the descent from the arrival reaches the first constraint, then never rises and never jumps')
def f23(c):
    c.open('fuel')
    r = c.js(VERTICAL_JS)
    vp, fp = r['vp'], dict(r['fp'])
    nms = [p['nm'] for p in vp]
    c.ok(all(b > a for a, b in zip(nms, nms[1:])), f'nm {nms}', 'the path grows in distance, strictly')
    grad = max(abs(b['ft'] - a['ft']) / (b['nm'] - a['nm']) for a, b in zip(vp, vp[1:]))
    c.le(round(grad), round(max(r['up'], r['dn']) * 1.05), 'no vertical jump: no slope steeper than the model\'s climb or descent', what=f'steepest slope {grad:.0f} ft/NM, path {vp}')
    top = next(i for i, p in enumerate(vp) if p['ft'] >= 26000)
    after = [p['ft'] for p in vp[top:]]
    first_down = next(i for i, ft in enumerate(after) if ft < 26000)
    down = after[first_down - 1:]
    c.ok(all(b <= a for a, b in zip(down, down[1:])), f'altitudes {down}', 'once the descent has started the path never rises again (the climb of the missed approach is not drawn)')
    by = {p['nm']: p['ft'] for p in vp}
    c.eq(by[fp['BBBB']], 26000, 'the cruise is kept at BBBB (the first constraint is far: the descent has not started)', what='altitude at BBBB')
    c.le(by[fp['E1']], 3000, 'the "at 3000" constraint holds at E1', what='altitude at E1')
    c.le(by[fp['CCCC']], 26000 - 2000, 'the descent has started before CCCC: the constraint 4 NM later does not drop 23,000 ft at once', what='altitude at CCCC')
    c.ge(by[fp['I1']], 1600, 'the approach floor holds at I1', what='altitude at I1')
    c.eq(vp[-1]['ft'], 0, 'the path ends on the ground', what='last altitude')
    c.ge(min(p['ft'] for p in vp), 0, 'and never below it', what='lowest altitude')


@case('F24', 'An approach given by its entries: listed once, its transitions lead to it, a transition equal to it is ignored', 'F', tags=('fuel', 'aerodb', 'maps'), designs=('standard',),
      screens=False, rule='V3 spec 10.20: the eAIP gives some approaches as one record per entry; the final one is the approach, the records that lead to it are its transitions; never the same record twice')
def f24(c):
    app, trans = 'LFVA.APP.RNP27.RW27.VB127', 'LFVA.APP.RNP27.RW27.VB301'
    docs = proc_flight({'arr': {'rwy': '27', 'app': app, 'appTrans': app}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    for d in docs:                          # the flight lands at LFVA (invented), 44 NM from its last route point
        if d[0].endswith('current_flight.json'):
            d[1]['route'].update(arr='LFVA')
            d[1]['route']['points'][-1] = {'id': 'LFVA', 'lat': 45.03, 'lon': 3.45}
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_rows(c, 'arr')
    apps = [lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')]
    c.eq(apps.count('RNP27'), 1, 'the approach given by its entries is listed once (not once per entry)', what=f'approach options {apps}')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-appTrans')], ['', trans], 'its transitions are the records that lead to it, not itself', what='approach transition options')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]').value"), '', 'a stored transition equal to the approach is shown as not chosen', what='approach transition select')
    d = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) > 3, 'the quote runs on the procedures path', timeout=15000)
    ids = [x['id'] for x in d['quote']['legs']]
    c.eq(len(ids), len(set(ids)), 'no fix is flown twice', what=f'legs {ids}')


_SHEETS_REPLY = {'sheets': [{'id': 'EC25', 'engineType': 'turboprop', 'pressurized': False, 'jetFuel': True, 'usableFuel': 2277,
                             'cruise': {'tasKt': 141, 'fuelFlowPerHour': 650, 'ceilingFt': 19135, 'rpmNominal': 265},
                             'climb': {'tasKt': 80, 'rateFpm': 1362, 'rpmNominal': 265}}]}


@case('F25', 'A pasted { "sheets": [...] } gives its sheets, never a "sheets" field', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, rule='user 29 Oct: the ChatGPT reply pasted as JSON showed one field "sheets" with the whole array in the review')
def f25(c):
    # une fiche EC25 déjà là (sa croisière inconnue) : la fiche collée s'y fond, champ par champ
    old = {'id': 'EC25', 'name': 'EC25', 'icao': 'EC25', 'usableFuel': 2000, 'cruise': {'tasKt': None}}
    c.open('fuel?view=sheets', docs=[['aircraft/sheets/EC25.json', old, 'document']])
    c.page.click(f'{FUEL} button[data-do="paste"]')
    c.page.fill(f'{FUEL} textarea[data-k="pastetext"]', json.dumps(_SHEETS_REPLY))
    c.page.click(f'{FUEL} button[data-do="pasteread"]')
    c.until(f"() => !!document.querySelector('{FUEL} [data-do=\"apply\"]')", what='the review of the pasted sheet')
    paths = c.js(f"() => [...document.querySelectorAll('{FUEL} input[data-path]')].map(i => i.dataset.path)")
    c.ok(not any(p == 'sheets' or p.startswith('sheets.') for p in paths), f'{paths}', 'no "sheets" field is proposed')
    c.ok('cruise.tasKt' in paths and 'usableFuel' in paths, f'{paths}', 'the fields of the sheet inside are proposed one by one')


def opt_info(c, k, start):
    """{ label, class, title } of the first option of the select data-k=`k` whose text starts with `start`, or None."""
    return c.js("""([k, st]) => { const o = [...document.querySelectorAll('[data-module=fuel] select[data-k="' + k + '"] option')].find(x => x.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().startsWith(st));
        return o && { label: o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(), cls: o.className, title: o.title.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() } }""", [k, start])


@case('F26', 'Conflicts are marked ⚠, not forbidden: class, title, the choice kept, one notification', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.23: ⚠ orange = in conflict with the chosen runway only (never the STAR / approach continuity), reason as title, still selectable, said once')
def f26(c):
    open_proc(c)
    wait_rows(c, 'arr')
    set_icao(c, 'arr', 'LFVC')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ARR1A/.test(o.textContent))", what='the row of LFVC is drawn')
    c.eq(opt_groups(c, 'p-arr-star'), 0, 'flat list: no group', what='STAR groups')
    # a runway: the STAR and the approach of the other runway stay selectable, marked
    c.page.select_option(f'{FUEL} select[data-k="p-arr-rwy"]', '27')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ARR2B.*⚠/.test(o.textContent))", what='ARR2B is marked')
    o = opt_info(c, 'p-arr-star', 'ARR2B')
    c.eq(o['label'], 'ARR2B · 09 ⚠', 'the label ends with the warning after the runway the procedure serves', what='label')
    c.ok('conflict' in o['cls'].split(), f"class {o['cls']!r}", 'the option carries the class conflict')
    c.eq(o['title'], norm(row(c, 'procConflictRwy').replace('{rwy}', '27')), 'the title gives the reason', what='title')
    c.eq(opt_info(c, 'p-arr-star', 'ARR1A')['label'], 'ARR1A · 27', 'the STAR of 27 is not marked', what='ARR1A label')
    # choosing the conflicting STAR keeps the choice and says it once
    n0 = len(c.note_log())
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', 'LFVC.STAR.ARR2B.RW09.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFVC.STAR.ARR2B.RW09.NONE', 'the conflicting STAR is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '27', 'star': 'LFVC.STAR.ARR2B.RW09.NONE'}, 'the choice is kept and the runway stays', what='route.procedures.arr')
    c.until("(n) => (window.__notes || []).length > n", n0, timeout=6000, what='a notification says the conflict')
    c.wait(600)
    notes = [norm(n) for n in c.note_log()[n0:]]
    c.eq(len(notes), 1, 'one notification', what=f'notifications {notes}')
    c.ok(notes[0].startswith('⚠') and 'ARR2B' in notes[0] and norm(row(c, 'procConflictRwy').replace('{rwy}', '27')) in notes[0], f'notification {notes[0]!r}', 'it names the STAR and the reason')
    # the approach of 27 chosen: ARR2B keeps its single runway reason; continuity is never a conflict (ARR2B joins nothing, IC301 is not marked)
    c.page.select_option(f'{FUEL} select[data-k="p-arr-app"]', 'LFVC.APP.ILS27.RW27.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFVC.APP.ILS27.RW27.NONE', 'the approach is written')
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]')", what='the approach transition select appears')
    o = opt_info(c, 'p-arr-star', 'ARR2B')
    c.eq(o['title'], norm(row(c, 'procConflictRwy').replace('{rwy}', '27')), 'the runway is the only reason, even though ARR2B joins no point of the approach', what='ARR2B title')
    c.eq(opt_info(c, 'p-arr-star', 'ARR1A')['label'], 'ARR1A · 27', 'ARR1A is not marked', what='ARR1A label')
    t = opt_info(c, 'p-arr-appTrans', 'IC301')
    c.eq(t['label'], 'IC301', 'a transition that does not start at the end of the chosen STAR is not marked', what='transition label')
    # a STAR that agrees: no warning left on the transition, and no new notification
    n1 = len(c.note_log())
    c.page.select_option(f'{FUEL} select[data-k="p-arr-star"]', 'LFVC.STAR.ARR1A.RW27.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFVC.STAR.ARR1A.RW27.NONE', 'the agreeing STAR is written')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]'); return !!s && ![...s.options].some(o => /⚠/.test(o.textContent)) })()", what='the transition is no longer marked')
    c.wait(600)
    c.eq(len(c.note_log()) - n1, 0, 'a choice without conflict says nothing', what='notifications after ARR1A')


@case('F27', 'A row with procedures offers "Read again"', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='user, 29 Oct: « il manque un bouton “rafraîchir” les procédures (avec une date pour le dernier fichier) »; V3 spec 10.20: date (coverage().read_at) then « Relire », same gesture as the reading on demand')
def f27(c):
    open_proc(c)
    wait_rows(c, 'arr')
    b = f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]'
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] [data-do=procfetch]')", what='the arrival row (it has procedures) offers the reading again')
    c.eq(norm(c.text(b) or ''), norm(row(c, 'procReread')), 'the button says "Read again" in the language of the run', what='button')
    c.ok(c.js("!!document.querySelector('[data-module=fuel] [data-proc=arr] select[data-k=\"p-arr-star\"]')"), 'no STAR list', 'the lists stay next to it')
    # the date: aerodb's coverage().read_at when it gives it (UTC); without it, the button alone
    at = c.js("(async () => { const v = await (window.__sogAerodb || {}).coverage?.('LFML'); return v ? v.read_at ?? null : undefined })()")
    if at:
        c.ok(norm(c.text(f'{FUEL} [data-proc="arr"] .fu-procfile') or '').startswith(norm(row(c, 'procFileAt').split('{d}')[0])), 'no date', 'the date of the last reading is shown before the button')
    c.tap(b)
    want = norm(tx(F, "no-launcher'", c.lang, after='procReasons'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, timeout=6000,
            what='the same gesture as the reading on demand: its refusal is said (no launcher on the test page)')


@case('F29', 'Winds aloft along the route at the altitude of the profile, not at the cruise level everywhere', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=False, rule='user 29 Oct: "à LFPO on n’est pas encore au FL260, à BAGIT on n’y est plus"')
def f29(c):
    c.open('fuel', flight=True, forecast=True)
    d = cf_doc(c, lambda d: all(((p.get('wind') or {}).get('levelFt') is not None) for p in d['route']['points'][1:-1]), 'the winds of the route written',
               timeout=15000)
    lv = {p['id']: p['wind']['levelFt'] for p in d['route']['points'] if p.get('wind')}
    c.ok(lv.get('LUGEN', 27000) < 27000, f'{lv}', 'LUGEN, in the climb (before the top of climb at 62 NM), takes its wind below the cruise level')
    c.ok(max(lv.values()) <= 27000, f'{lv}', 'no wind above the cruise level')


def _climb_airway():
    """A low airway LZ1 (6 500 - 19 500 ft) from LFRS to LUGEN (38 NM, inside the climb: the top of climb is at 62 NM), on the line."""
    import math
    fix = {'TSB0': (47.1569, -1.6078), 'TSB1': (46.87, -1.404), 'LUGEN': (46.5833, -1.2)}

    def gc(a, b):
        r = math.pi / 180
        h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
        return round(2 * 3440.065 * math.asin(math.sqrt(h)), 1)
    return [{'route': 'LZ1', 'a': {'id': a, 'lat': fix[a][0], 'lon': fix[a][1]}, 'b': {'id': b, 'lat': fix[b][0], 'lon': fix[b][1]},
             'lower': 6500, 'upper': 19500, 'nm': gc(fix[a], fix[b])} for a, b in [('TSB0', 'TSB1'), ('TSB1', 'LUGEN')]]


@case('F30', 'Auto: a leg in the climb is routed at the altitude of the profile, not at the cruise level', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=False, rule='user 29 Oct (LFPO → EIDW): the legs of the climb and the descent were routed at FL260, those of the cruise as low')
def f30(c):
    c.open('fuel', flight=True, airfields=True, airways=_climb_airway())
    wait_quote(c)
    c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
    rt = f'{FUEL} [data-k="rtext"]'
    c.until(f"window.__t.shown(document.querySelector('{FUEL} [data-do=rauto]'))", what='the Route step shows the Auto button')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value.includes('LZ1')", timeout=6000,
            what='LFRS → LUGEN (38 NM, in the climb to FL270) takes the low airway LZ1, open at the altitude of the climb')
