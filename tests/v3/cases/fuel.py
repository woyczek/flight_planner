"""Area F - fuel (PLAN.md section F; modules/fuel/SPEC.md, lot `v3-fuel-ergo` and `v3-unites-carburant`).

Rules covered
  * the module opens on the Plan ("Devis") view, not the Sheets view (F1);
  * the sticky result bar is compact: one context line, three one-line tiles, at most 120 px (F2);
  * the display units (kt / km/h, ft / m, NM / km / SM) change the figures and keep flight levels as FL (F3);
  * no horizontal page scroll at 390 and 360 px (F4; the date row overflowed until 24 Oct);
  * the wording "Devis" is not both the tab and a step of the same view (F5; step 4 is now "Résultat");
  * the flight date is one value: the field writes `planned_at` of the current flight (F6);
  * a mount whose address changed while it was still reading writes nothing, and the view follows the address (F7);
  * the "Auto" button writes the airways between the route's points at the planned level (F8).

Cases: F1 F2 F3 F4 F5 F6 F7 F8 F9.  A quote needs a flight: the planned flight of lib.FLIGHT (type C30J, 366 NM) is seeded, so fuel
computes an estimated quote with no sheet and no network.
"""
from lib import Fail, Skip, case, norm, synthetic_airways, tx

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
      rule='fuel INTEGRATION 3 (28 Oct): the field writes current_flight.planned_at, the only value (no weather.when copy); the Map reads the ETA fuel writes for a dated flight (debt until the recoded Map)')
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
    r = waited(lambda r: (r.get('progress') or {}).get('eta'), 'a dated flight that is not started carries the ETAs the Map draws')
    eta = r['progress']['eta']
    c.eq(len(eta), 4, 'one ETA per route point', what='progress.eta')
    c.eq(r['progress'].get('phase'), None, 'no phase before the start', what='progress.phase')
    c.eq(c.js("(a) => Date.parse(a[1].at) - Date.parse(a[0].at) > 0", eta), True, 'ETAs increase along the route', what='ETA order')
    c.eq(c.js("([t, e]) => Math.round((Date.parse(e) - Date.parse(t)) / 60000)", [want, eta[0]['at']]), 10, 'the first ETA is the date plus the taxi time (10 min)', what='minutes from planned_at to the first ETA')
    c.tap(f'{FUEL} [data-do="when30"]')
    r = waited(lambda r: r.get('planned_at') and r['planned_at'] > want, '"+30" adds 30 min to a future date')
    added = c.js("([a, b]) => Math.round((Date.parse(b) - Date.parse(a)) / 60000)", [want, r['planned_at']])
    c.ok(30 <= added <= 34 and c.js("(t) => Date.parse(t) % 300000 === 0", r['planned_at']), f'{added} min added, planned_at {r["planned_at"]}', '30 minutes more, rounded up to 5 minutes')
    c.tap(f'{FUEL} [data-do="whennow"]')
    r = waited(lambda r: r.get('planned_at') is None, '"Now" empties the date')
    c.eq((r.get('weather') or {}).get('when'), None, 'still no weather.when copy', what='weather.when after Now')
    r = waited(lambda r: not (r.get('progress') or {}).get('eta'), 'an undated flight has no ETA to promise')


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


@case('F9', 'Routing bench', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, rule='modules/maps/lib/routing.js: the bench passes (41 checks)')
def f9(c):
    c.page.goto(f'{c.base}/modules/maps/test/routing.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'modules/maps/test/routing.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')

