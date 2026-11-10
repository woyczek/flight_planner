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

  * the aerodrome's name where its code is, and progressive completion (V3 spec 10.27): one fixed name line under each code field, « inconnu » for a code
    that matches nothing (F44); from two characters seven suggestions at most, ↑ ↓ Enter Esc, tap, closed on blur, the pick written like a typing (F45); no
    overflow and 44 px targets at 390 px (F46); the summary of the step Departure names both aerodromes (F47).

Cases: F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 F13 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F24 F26 F27 F28 F29 F30 F31 F32 F33 F34 F35 F36 F37 F38 F39 F40 F41 F42 F43 F44 F45 F46 F47.  A quote needs a flight: the planned flight of lib.FLIGHT (type C30J, 366 NM) is seeded, so fuel
computes an estimated quote with no sheet and no network.
"""
import json
import datetime
import re
from pathlib import Path

from lib import AERO_CYCLE, ROOT, Fail, Skip, aero_docs, case, flight_docs, norm, synthetic_airways, tx
from fixtures.procedures import proc_docs      # the invented procedures the cases seed (V3 spec 10.29 i)

F = 'modules/fuel/module.js'
PROC_TX = 'modules/fuel/procedures_texts.js'
PT = 'modules/fuel/procedures_texts.js'      # the texts of the procedures card (moved out of module.js, V3 spec 10.29 d)
FUEL = '[data-module="fuel"]'


def row(c, key):
    """A translation row of the screen (module.js) or of the procedures card (procedures_texts.js)."""
    try:
        return tx(F, key, c.lang)
    except RuntimeError:
        return tx(PT, key, c.lang)


def wait_quote(c):
    c.until("!!document.querySelector('[data-module=fuel] .fu-result .f-tiles b')", timeout=15000, what='the quote is computed (result bar with its tiles)')
    c.settle()


@case('F1', 'Opens on the Plan', 'F', tags=('fuel',), screens=False, langs4=True, rule='user "la vue fiches ne devrait pas être active par défaut"')
def f1(c):
    c.open('fuel')
    c.settle()
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
    c.quiet("(document.querySelector('[data-module=fuel] .fu-result .fu-ctx') || {}).textContent")      # the result bar is redrawn, then still
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
    c.settle()
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
  const get = IDBObjectStore.prototype.get, slow = window.__slow = { ms: window.__slowMs || 0, hits: 0, pending: 0 };
  IDBObjectStore.prototype.get = function (key) {
    const q = get.call(this, key);
    if (!slow.ms || !/^(pilot|cache)\\//.test(String(key))) return q;
    slow.hits++; slow.pending++;
    const ms = slow.ms, late = { get result() { return q.result }, get error() { return q.error } };
    q.onsuccess = () => setTimeout(() => { slow.pending--; late.onsuccess && late.onsuccess({ target: late }) }, ms);
    q.onerror = () => setTimeout(() => { slow.pending--; late.onerror && late.onerror({ target: late }) }, ms);
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
    c.until('window.__slow.pending === 0', timeout=8000, what='the first mount\'s late reads have come back (900 ms) while the second is on screen')
    c.until("!!document.querySelector('[data-module=fuel] [data-view]')", what=f'#{final} draws fuel', timeout=8000)
    c.settle()
    shown = c.js("""() => ({ pressed: [...document.querySelectorAll('[data-module=fuel] [data-view]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.view),
        quote: [...document.querySelectorAll('[data-module=fuel] .fu-step, [data-module=fuel] [data-block=result]')].filter(e => window.__t.shown(e)).length,
        sheets: !![...document.querySelectorAll('[data-module=fuel] [data-sheets]')].some(e => window.__t.shown(e)),
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
    c.until_doc('pilot/ABC/current_flight.json', lambda d: [(d.get('route') or {}).get(k) for k in ('dep', 'arr', 'altn')] == ['LFRS', 'LFML', 'LFMT'] and (d.get('level') or {}).get('ft') == 27000,
                'the four fields are written in the flight')
    c.tap(f'{FUEL} [data-do="acopen"]')
    c.page.fill(f'{FUEL} input[data-k="acsearch"]', 'C30J')
    c.js('document.activeElement && document.activeElement.blur && document.activeElement.blur()')
    c.quiet("(document.querySelector('[data-module=fuel] [data-acres]') || {}).innerHTML", quiet=300)   # the list is redrawn on the blur: a tap during it would be lost
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


@case('F8', 'Auto airways: written between the points, open at the level; idempotent, from the pinned points only', 'F', tags=('fuel', 'maps'),
      screens=False, langs4=True,
      rule='user 25 Oct ("Oui pour auto"): a button next to the route writes the airways between its points, open at the planned level; '
      'V3 spec 10.31: the airways and nodes of a previous Auto are never constraints (route.auto, route_text provenance), same pinned '
      'points same text, a leg without a way stays direct and says why (F67 merged here, refactoring 10.33)')
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
    # what Auto wrote is kept as its provenance (§ 10.31): the departure and the arrival pinned, the rest generated
    d = c.until_doc('pilot/ABC/current_flight.json', lambda d: ((d.get('route') or {}).get('auto') or {}).get('seq'), 'the provenance is kept with the route')
    c.eq([(x['w'], x['g']) for x in d['route']['auto']['seq']], [('LFRS', False), ('TSA01', True), ('UT460', True), ('TSA05', True), ('LFML', False)],
         'what Auto wrote is marked generated; the departure and the arrival are pinned', what='route.auto.seq')
    # idempotent: two more taps recompute from the pinned points only and give the same text (no loop growing from Auto to Auto)
    for _ in range(2):
        n0 = c.js("(window.__notes || []).length")
        c.tap(f'{FUEL} [data-do="rauto"]')
        c.until("(n) => (window.__notes || []).length > n", n0, timeout=6000, what='Auto says what it did')
        c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"), 'LFRS TSA01 UT460 TSA05 LFML', 'the same pinned points give the same text',
             what='route text after another tap')
    # FL100: the only airway open is the low one, a detour of more than 40 %; the previous Auto's words are not constraints: Auto
    # replaces them and the text goes back to the pinned points, the line says why
    c.tap(f'{FUEL} .fu-steps button[data-step="0"]')
    c.page.fill(f'{FUEL} .fu-flight [data-k="fl"]', '100')
    c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value === 'LFRS LFML'", timeout=6000,
            what='Auto replaces: the airway of the previous Auto is gone, the leg stays direct')
    none = norm(row(c, 'autoNone')).replace('{a}', 'LFRS').replace('{b}', 'LFML').replace('{more}', '').replace('{why}', norm(row(c, 'autoWhyDetour')).replace('{p}', '40'))
    c.until("(n) => (window.__notes || []).some(x => x.replace(/[\\s\u00a0\u202f]+/g, ' ').trim() === n)", none, timeout=6000, what=f'the notification "{none}"')


@case('F28', 'Auto routes from the end of the chosen SID', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='user, 29 Oct: « un départ FINOT depuis LFBO, premier point GOSAD, ne sort pas GAI via G36 en Auto »; Auto routes from the end of the SID after the departure (PR.endsOf, refactoring 10.33 R-F4b: the text holds it)')
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
    # the SID's name in the text (user, 30 Oct: « LFBO LACOU7B LMG … la route LACOU LMG n'est toujours pas trouvée »): the exit is written after
    # the name, so the leg exit → first point is adjacent and routed (§ 10.31)
    c.page.fill(rt, 'LFRS NTS1A NEPIX LFML')
    c.page.locator(rt).blur()
    c.until(f"/\\([34]\\)/.test(document.querySelector('{FUEL} [data-ptsn]').textContent)", timeout=6000, what='the route with the SID name resolves (its exit may be written after the SID name, § 10.31)')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value === 'LFRS NTS1A NT102 G36 NEPIX LFML'", timeout=8000,
            what='the exit after the SID name, then the airway: « LFRS NTS1A NT102 G36 NEPIX LFML »')


@case('F33', 'Procedure rows drawn before the aircraft registry is read', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='user 29 Oct: « très long à charger avant de faire apparaître les procédures »; the rows depend on the aerodromes and aerodb only, never on refsPending')
def f33(c):
    # aerodb.aircraft() held back 6 s (the real registry, served by the launcher, can take seconds): the rows must not wait for it
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a), ac = db?.aircraft?.bind(db);
          if (ac) try { db.aircraft = () => new Promise(r => setTimeout(r, 6000)).then(ac) } catch (e) {}
          return db } } } }) })()""")
    open_proc(c)
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] select[data-k=\"p-arr-star\"]')", timeout=4000,
            what='the arrival row is drawn within 4 s although the aircraft registry takes 6 s')
    c.ok(c.js("!!document.querySelector('[data-module=fuel] [data-block=result][data-loading]')"), 'the result is already computed',
         'the quote still waits for the registry (the rows did not wait for it)')


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
    """Shows the step `n` (0 Flight ... 4 Departure) of the plan when it is not the one on screen (a phone shows one step at a time), and
    makes sure it stays: its section on screen, outside an inert zone, its first control (if any) shown and active, after the page has
    settled. Measured (F34 at 1280 beside the Map, 2 runs in 10): the step was seen on screen while the module still showed all five steps,
    then the Map's dual view narrowed it to one step at a time and it fell back on the kept step; so the step is tapped again until it holds."""
    sec = f'{FUEL} section.fu-step[data-s="{n}"]'
    ready = """(s) => { const e = document.querySelector(s); if (!e || !window.__t.shown(e) || e.closest('[inert]')) return false;
        const f = [...e.querySelectorAll('input:not([type=hidden]), select, textarea, button')].find(x => window.__t.shown(x));
        return !f || !f.closest('[inert]') }"""
    for attempt in range(4):
        c.settle()
        if not c.shown(sec):
            c.tap(f'{FUEL} .fu-steps button[data-step="{n}"]')
        try:
            c.until(ready, sec, timeout=4000, what=f'the step {n} is on screen')
            c.settle()
            if c.js(ready, sec):
                return
        except Fail:
            pass
    raise Fail(f'the step {n} never held on screen', f'step {n} shown', 'to_step')


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


def title_of(label, *reasons):
    """The title of a list option: its whole label, then its reasons (outdated, conflict), as the card writes it."""
    return norm(' · '.join([label, *reasons]))


def wait_rows(c, side='arr'):
    c.until("(s) => !!document.querySelector('[data-module=fuel] [data-proc=\"' + s + '\"]')", side, timeout=15000, what=f'the {side} procedure row is drawn')
    c.settle()
    unfold(c, side)


def unfold(c, side):
    """Unfolds a side of the procedure card (§ 10.31: two summary lines at opening, one side unfolded at a time) by its ▸ button."""
    if c.js("(s) => !!document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=\"' + s + '\"]')", side):
        # the button is tapped when it is on screen; a card of another step (not shown) is unfolded by a click on it
        if c.shown(f'{FUEL} [data-proc="{side}"] .fu-procfold'):
            c.tap(f'{FUEL} [data-proc="{side}"] .fu-procfold')
        else:
            c.js("(s) => document.querySelector('[data-module=fuel] [data-proc=\"' + s + '\"] .fu-procfold').click()", side)
        c.until("(s) => !document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=\"' + s + '\"]')", side, what=f'the {side} side unfolds')


def pick_proc(c, k, value):
    """Chooses `value` in the procedure list data-k=`k` (p-dep-… / p-arr-…), its side unfolded first."""
    unfold(c, k.split('-')[1])
    c.page.select_option(f'{FUEL} select[data-k="{k}"]', value)


def map_return(c, address, side='arr'):
    """The Map's answer to Fuel as the pilot gets it (location.replace of `address`): the Map mounted and settled before it is left (a Map
    left during its mount throws), then Fuel mounted again and its procedure card of `side` drawn before anything is read. The wait is
    the case's, as to_step's: F41 failed under load three times (Settings, 31 Oct), 4 in 10 alone, on its first trip, which left the
    Map at once; the module is untouched."""
    c.until("() => location.hash.startsWith('#maps') && !!document.querySelector('[data-module=maps]')", timeout=15000, what='the Map is mounted')
    c.settle()
    c.js("(a) => { location.replace(a); return true }", address)
    c.until("() => !!document.querySelector('[data-module=fuel]')", timeout=15000, what='Fuel is mounted again')
    wait_rows(c, side)


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
    pick_proc(c, 'p-arr-rwy', '13R')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]'); return !!s && [...s.options].some(o => /MEN2B.*⚠/.test(o.textContent)) })()",
            what='the STAR of the other runway is marked in conflict with the runway 13R')
    labs = [lab for _, lab in sel_opts(c, 'p-arr-star')]
    c.ok(any(lab.startswith('MEN1A') and '⚠' not in lab for lab in labs), f'STAR options {labs}', 'MEN1A (13R) is not marked')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '13R', 'the runway is written in route.procedures')
    c.eq(d['route']['procedures']['by'], 'fuel', 'by is fuel', what='procedures.by')
    c.ok(c.js("(t) => !isNaN(Date.parse(t))", d['route']['procedures'].get('at')), f"at {d['route']['procedures'].get('at')!r}", 'at is an ISO date')
    # a STAR with a transition offers the transition select; an approach without one does not
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE')
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-arr-trans\"]')", what='the transition select appears with a STAR that has transitions')
    c.eq([lab for _, lab in sel_opts(c, 'p-arr-trans')], ['—', 'NEPIX'], 'the transitions of the chosen STAR', what='transition options')
    pick_proc(c, 'p-arr-app', 'LFML.APP.I13R.RW13R.NONE')
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
    pick_proc(c, 'p-arr-star', '__none')
    d = cf_doc(c, lambda d: 'star' in (procs_of(d, 'arr') or {}) and procs_of(d, 'arr')['star'] is None, '"aucune" writes star: null')
    c.eq(procs_of(d, 'arr').get('app'), 'LFML.APP.I13R.RW13R.NONE', 'the approach is not touched', what='approach')
    c.eq(c.js("document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]').value"), '__none', 'the select shows "aucune"', what='STAR select')
    pick_proc(c, 'p-arr-star', '')
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
    c.eq(norm((o or {}).get('title') or ''), title_of('MAN1A · 13R ⌛', row(c, 'procOutdatedTitle')), 'and the title carries the whole label, then says it was read under an earlier cycle', what='title')
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
    # BUGS SOG, 1 Nov (the user's capture, Aqua): the 44 px box of the link rose 10 px over the title (margin -10px) and the design's button
    # shadow painted it; whatever the design paints on buttons, the link paints nothing, and its line keeps the room of its target
    c.js("document.documentElement.style.cssText += ';--sog-btn-shadow:0 2px 6px rgb(255 0 0);--sog-btn-bg:rgb(255 0 0);--sog-btn-border:2px solid rgb(255 0 0)'")
    c.page.hover(f'{FUEL} [data-do="procfetch"]')
    look = c.js("(() => { const s = getComputedStyle(document.querySelector('[data-module=fuel] [data-do=procfetch]')); return [s.boxShadow, s.backgroundColor, s.borderTopWidth] })()")
    c.eq(look, ['none', 'rgba(0, 0, 0, 0)', '0px'], 'no shadow, background or border on the link, even hovered under a design that paints buttons', what='link look')
    title, btn = c.box(f'{FUEL} [data-proc="dep"] .fu-proctitle'), c.box(f'{FUEL} [data-do="procfetch"]')
    c.ok(btn['t'] >= title['b'] - 0.5, f'button top {btn["t"]:.1f}, title bottom {title["b"]:.1f}', 'the target does not cover the title above it')
    c.tap(f'{FUEL} [data-do="procfetch"]')
    want = norm(tx(PT, "no-launcher'", c.lang, after='procReasons'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, timeout=6000,
            what='the refusal reason (no launcher serves the test page: aerodb answers "no-launcher") is shown in a notification')
    c.until("!!document.querySelector('[data-module=fuel] [data-do=procfetch]:not([disabled])')", what='the button is available again after a refusal')
    # never silent (user, 29 Oct, EIDW: « aucun log. est-ce que ça a marché ? »): the start is said, then the end
    started = norm(row(c, 'procStarted').replace('{icao}', 'LFQQ'))
    c.ok(started in [norm(n) for n in c.note_log()], f'notifications {[norm(n) for n in c.note_log()]}', 'the start of the reading is said')
    # dispatch par État d'aerodb (82eeef3b5) : France par l'eAIP du SIA, État à tables par EAD Basic, sinon 'no-tables' ; plus de
    # « mise en page inconnue »
    src = (ROOT / F).read_text(encoding='utf-8') + (ROOT / PT).read_text(encoding='utf-8')
    c.ok("'unknown-layout'" not in src, 'still there', 'the refusal "unknown layout" is gone (aerodb no longer answers it)')
    c.ok(bool(tx(PT, "no-tables'", c.lang, after='procReasons').strip()), 'missing', '"no procedure tables published for this State" is written in the language of the run')
    for k in ('eaip', 'ead'):
        c.ok(bool(tx(PT, k, c.lang, after='procReadingSrc').strip()), 'missing', f'the reading in progress names its source ({k})')
    # comptes d'une lecture réussie (aerodb stats) : jamais « 0 procédures » seul
    for k in ('procFetchedPages', 'procRejected', 'procDropped', 'procUnnamed'):
        c.ok('{' in tx(PT, k, c.lang), 'missing', f'the success notification wording {k} exists in the language of the run')


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
    c.ok(c.count(f'{FUEL} [data-proc="dep"] select') >= 1, 'no departure select', 'the departure row is editable after the start')
    before, bpath = d['quote'], d['profile']['path']
    pick_proc(c, 'p-arr-star', '__none')
    d2 = cf_doc(c, lambda d: len(((d.get('quote') or {}).get('legs')) or []) != len(before['legs']), 'the legs follow the new choice (no STAR)', timeout=10000)
    q = d2['quote']
    for k in ('block', 'trip', 'minutes', 'levelFt', 'unit', 'taxiMin', 'distanceNm'):
        c.eq(q.get(k), before.get(k), 'the fuel figures do not move after the start', what=f'quote.{k}')
    c.ok(q.get('legsAt') and c.js("(t) => !isNaN(Date.parse(t))", q['legsAt']), f"legsAt {q.get('legsAt')!r}", 'quote.legsAt dates the rewrite')
    c.ok('star' not in [x['origin'] for x in q['legs']], f"origins {[x['origin'] for x in q['legs']]}", 'the legs no longer carry the STAR')
    c.ok(d2['profile']['path'] != bpath, 'profile.path unchanged', 'the vertical path is rewritten')
    c.eq(procs_of(d2, 'arr').get('star'), None, 'route.procedures records the change', what='arr.star')
    c.eq(d2['route']['procedures']['by'], 'fuel', 'by is fuel', what='procedures.by')
    # nothing is locked after the start (challenge of 29 Oct, V3 spec 10.20): a fresh position beyond the end of the SID leaves both rows open
    open_proc(c, procs=V2_PROCS, started=True, actual=(44.9, 2.4))
    c.tap(f'{FUEL} .fu-steps button[data-step="4"]')
    c.until("!!document.querySelector('[data-module=fuel] [data-block=procs]:not(.fu-hide) [data-proc=arr] select')", timeout=15000, what='the arrival row is drawn')
    wait_rows(c, 'dep')
    c.ok(c.count(f'{FUEL} [data-proc="dep"] select') >= 2, f"{c.count(f'{FUEL} [data-proc=dep] select')} selects", 'the SID is passed (position at NEPIX) and the departure row is still editable')
    c.eq(c.count(f'{FUEL} .fu-procpassed'), 0, 'and no sentence says the departure is locked', what='lock sentences')
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
    c.quiet("(document.querySelector('[data-module=fuel] .fu-result') || {}).textContent", quiet=800)      # the mount is over: nothing more is drawn
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


@case('F19', 'Load my OFP: its SID and STAR fill the sides the pilot has not chosen, and only those', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.20 (challenge of 29 Oct): "Load my OFP" proposes: it writes the OFP\'s SID / STAR identifiers (v2) on the sides not chosen yet (absent = not chosen), never over a choice, and notifies only what it filled')
def f19(c):
    ofp = json.loads((ROOT / 'frame/aerodb/test/fixtures/ofp_lfrs_lfml.json').read_text(encoding='utf-8'))
    kinds = lambda k: norm(tx(PT, k, c.lang, after='procKinds: {'))

    def load_ofp(procs):
        c.open('fuel', docs=proc_docs() + proc_flight(procs), airfields=True, identity={'simbrief': '123456'})
        wait_rows(c)
        to_step(c, 1)
        c.page.route('**/www.simbrief.com/**', lambda r: r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(ofp)))
        c.tap(f'{FUEL} .fu-steps button[data-step="1"]')
        c.tap(f'{FUEL} [data-do="simbrief"]')
    # the arrival is the pilot's (a STAR and an approach), the departure is not chosen: the OFP fills the departure only
    mine = {'arr': {'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}
    load_ofp(mine)
    d = cf_doc(c, lambda d: str((procs_of(d, 'dep') or {}).get('sid', '')).startswith('LFRS.SID.LUGE4N'), 'the OFP\'s SID is written on the side not chosen', timeout=15000)
    p = d['route']['procedures']
    c.eq(p['by'], 'fuel', 'by is fuel', what='procedures.by')
    c.eq(p['dep'].get('rwy'), '03', 'the runway of the OFP\'s SID (one runway per record)', what='departure runway')
    c.eq(p['arr'], mine['arr'], 'the arrival the pilot chose is kept as it is (the OFP proposes, it never replaces)', what='route.procedures.arr')
    sid_line = norm(row(c, 'procChange').replace('{side}', row(c, 'dep')).replace('{parts}', f"{kinds('rwy')} → 03 · {kinds('sid')} → LUGE4N"))
    lines = c.quiet("(window.__notes || []).length")
    notes = [norm(n) for n in c.note_log()]
    c.ok(sid_line in notes, f'notifications {notes}', f'one line for the side it filled: {sid_line}')
    changes = [n for n in notes if (norm(row(c, 'dep')) in n and kinds('sid') in n) or (norm(row(c, 'arr')) in n and kinds('star') in n)]
    c.eq(len(changes), 1, 'and none for the side it left', what=f'change lines among {lines} notifications: {changes}')
    # nothing chosen on the departure but "aucune" (null is a choice) and nothing on the arrival: the OFP fills the arrival only
    load_ofp({'dep': None, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    d = cf_doc(c, lambda d: str((procs_of(d, 'arr') or {}).get('star', '')).startswith('LFML.STAR.LERG1R'), 'the OFP\'s STAR is written on the arrival, not chosen yet', timeout=15000)
    p = d['route']['procedures']
    c.eq(p['dep'], None, 'a departure set to "aucune" is a choice: the OFP leaves it', what='route.procedures.dep')
    c.eq(p['arr'].get('rwy'), '13L', 'the arrival takes the runway of the OFP\'s STAR', what='arrival runway')
    star_line = norm(row(c, 'procChange').replace('{side}', row(c, 'arr')).replace('{parts}', f"{kinds('rwy')} → 13L · {kinds('star')} → LERG1R"))
    c.quiet("(window.__notes || []).length")
    notes = [norm(n) for n in c.note_log()]
    c.ok(star_line in notes, f'notifications {notes}', f'one line for the arrival it filled: {star_line}')
    # nothing chosen on either side: both are filled, one line each
    load_ofp(None)
    d = cf_doc(c, lambda d: str((procs_of(d, 'arr') or {}).get('star', '')).startswith('LFML.STAR.LERG1R') and str((procs_of(d, 'dep') or {}).get('sid', '')).startswith('LFRS.SID.LUGE4N'),
               'the OFP fills both sides', timeout=15000)
    c.quiet("(window.__notes || []).length")
    notes = [norm(n) for n in c.note_log()]
    c.ok(sid_line in notes and star_line in notes, f'notifications {notes}', 'one line for each side it filled')


def set_icao(c, side, icao):
    """Types an aerodrome in the departure or arrival field (step Flight), then goes back to the step Route where the rows are."""
    to_step(c, 0)  # the step held on screen (to_step waits for it)
    c.until("(k) => { const i = document.querySelector('[data-module=fuel] input[data-k=\"' + k + '\"]'); return !!i && window.__t.shown(i) && "
            "!i.disabled && !i.readOnly }", side, timeout=10000, what=f'the {side} field is on screen and editable')
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
    pick_proc(c, 'p-arr-app', 'LFML.APP.I13R.RW13R.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFML.APP.I13R.RW13R.NONE', 'the approach is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '13R', 'app': 'LFML.APP.I13R.RW13R.NONE'}, 'the approach serves one runway: it is the runway', what='route.procedures.arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && s.value === '13R' })()", what='the runway select shows 13R')
    c.ok(any('MEN2B' in lab for _, lab in sel_opts(c, 'p-arr-star')), f"STAR options {sel_opts(c, 'p-arr-star')}", 'the STAR of 31L is still listed (marked, not removed)')
    # the hand-read STAR of an old cycle on the chosen runway, joining no point of the approach: ⌛ only (continuity is never a conflict)
    o = opt_info(c, 'p-arr-star', 'MAN1A')
    c.eq(o['label'], 'MAN1A ⌛', 'outdated, a runway is chosen: no runway in the label, the hourglass only, no warning for a STAR that joins no point', what='label')
    c.eq(o['cls'].split(), ['outdated'], 'only the class outdated', what='class')
    c.eq(o['title'], title_of('MAN1A ⌛', row(c, 'procOutdatedTitle')), 'and its whole label then its single reason in the title', what='title')
    # the STAR chosen next, then another runway: both choices are kept, marked ⚠ (no notification: the mark and the title are enough)
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFML.STAR.MEN1A.RW13R.NONE', 'the STAR is written')
    n0 = len(c.note_log())
    pick_proc(c, 'p-arr-rwy', '31L')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '31L', 'the other runway is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '31L', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'app': 'LFML.APP.I13R.RW13R.NONE'},
         'the STAR and the approach that do not serve 31L are kept', what='route.procedures.arr')
    why = norm(row(c, 'procConflictRwy').replace('{rwy}', '31L'))
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /MEN1A.*⚠/.test(o.textContent))", what='the STAR is marked in conflict with 31L')
    c.eq(opt_info(c, 'p-arr-star', 'MEN1A')['title'], title_of('MEN1A ⚠', why), 'the title gives the reason', what='MEN1A title')
    c.eq(c.quiet("(window.__notes || []).length") - n0, 0, 'no notification says the conflict', what='new notifications')
    # a transition belongs to its STAR: another STAR drops it
    open_proc(c, procs={'arr': {'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'trans': 'LFML.STAR.MEN1A.RW.NEPIX'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    wait_rows(c, 'arr')
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN2B.RW31L.NONE')
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
    pick_proc(c, 'p-arr-rwy', '27')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '27', 'a runway of that list is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '27'}, 'it is the pilot\'s choice', what='route.procedures.arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-app\"]'); return !!s && [...s.options].some(o => /⚠/.test(o.textContent)) })()", what='the approaches of the other runway are marked')
    c.eq([lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')], ['RNP27', 'VOR27', 'ILS09 ⚠', 'VOR09 ⚠'], 'runway 27: its approaches first, those of 09 stay in the list after them, marked in conflict', what='approaches')
    # LFVB: the only procedure names no runway; the base gives the axis (95 true, 2 E: 09 and 27)
    set_icao(c, 'arr', 'LFVB')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /BET1A/.test(o.textContent))", what='the row of LFVB is drawn')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '09', '27'], 'the two ends of the runway axis of the base', what='LFVB runways')
    stars = sel_opts(c, 'p-arr-star')
    c.ok(any('BET1A' in lab for _, lab in stars), f'STAR options {stars}', 'a STAR serving every runway is listed')


def run_bench(c, path):
    """Opens a pure bench page (window.__bench = { done, pass, fail, rows }) and requires every one of its checks to pass."""
    c.page.goto(f'{c.base}/{path}', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', path) from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {[x for x in (r['rows'] or []) if not x['ok']][:3]}", 'every check of the bench passes')


@case('F23', 'Vertical path bench: no fold, no jump, no climb back in the descent', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='V3 spec 10.20: profile.path keeps the cruise until the descent from the arrival reaches the first constraint, then never rises and never jumps; the pure bench modules/fuel/test/vertical.html (progress.js verticalPath), run without the page')
def f23(c):
    run_bench(c, 'modules/fuel/test/vertical.html')


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


def opt_info(c, k, start):
    """{ label, class, title } of the first option of the select data-k=`k` whose text starts with `start`, or None."""
    return c.js("""([k, st]) => { const o = [...document.querySelectorAll('[data-module=fuel] select[data-k="' + k + '"] option')].find(x => x.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().startsWith(st));
        return o && { label: o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(), cls: o.className, title: o.title.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() } }""", [k, start])


@case('F26', 'Conflicts are marked ⚠, not forbidden: class, title, the choice kept, no notification', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.23: ⚠ orange = in conflict with the chosen runway only (never the STAR / approach continuity), reason in the title, still selectable, no notification')
def f26(c):
    open_proc(c)
    wait_rows(c, 'arr')
    set_icao(c, 'arr', 'LFVC')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ARR1A/.test(o.textContent))", what='the row of LFVC is drawn')
    c.eq(opt_groups(c, 'p-arr-star'), 0, 'flat list: no group', what='STAR groups')
    # a runway: the STAR and the approach of the other runway stay selectable, marked
    pick_proc(c, 'p-arr-rwy', '27')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ARR2B.*⚠/.test(o.textContent))", what='ARR2B is marked')
    o = opt_info(c, 'p-arr-star', 'ARR2B')
    c.eq(o['label'], 'ARR2B ⚠', 'a runway is chosen: the label ends with the warning, without the runway the procedure serves', what='label')
    c.ok('conflict' in o['cls'].split(), f"class {o['cls']!r}", 'the option carries the class conflict')
    c.eq(o['title'], title_of('ARR2B ⚠', row(c, 'procConflictRwy').replace('{rwy}', '27')), 'the title gives the whole label then the reason', what='title')
    c.eq(opt_info(c, 'p-arr-star', 'ARR1A')['label'], 'ARR1A', 'the STAR of 27 is not marked, nor suffixed', what='ARR1A label')
    # choosing the conflicting STAR keeps the choice and says nothing
    n0 = len(c.note_log())
    pick_proc(c, 'p-arr-star', 'LFVC.STAR.ARR2B.RW09.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFVC.STAR.ARR2B.RW09.NONE', 'the conflicting STAR is written')
    c.eq(procs_of(d, 'arr'), {'rwy': '27', 'star': 'LFVC.STAR.ARR2B.RW09.NONE'}, 'the choice is kept and the runway stays', what='route.procedures.arr')
    c.eq(c.quiet("(window.__notes || []).length") - n0, 0, 'a conflicting choice says nothing: the mark and the title are enough', what='new notifications')
    # the approach of 27 chosen: ARR2B keeps its single runway reason; continuity is never a conflict (ARR2B joins nothing, IC301 is not marked)
    pick_proc(c, 'p-arr-app', 'LFVC.APP.ILS27.RW27.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFVC.APP.ILS27.RW27.NONE', 'the approach is written')
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]')", what='the approach transition select appears')
    o = opt_info(c, 'p-arr-star', 'ARR2B')
    c.eq(o['title'], title_of('ARR2B ⚠', row(c, 'procConflictRwy').replace('{rwy}', '27')), 'the runway is the only reason, even though ARR2B joins no point of the approach', what='ARR2B title')
    c.eq(opt_info(c, 'p-arr-star', 'ARR1A')['label'], 'ARR1A', 'ARR1A is not marked', what='ARR1A label')
    t = opt_info(c, 'p-arr-appTrans', 'via IC301')  # « via » + IAF (§ 10.30, fourth reading); the name is the IAF here
    c.eq(t['label'], 'via IC301', 'a transition that does not start at the end of the chosen STAR is not marked', what='transition label')
    # a STAR that agrees: no warning left on the transition, and no new notification
    n1 = len(c.note_log())
    pick_proc(c, 'p-arr-star', 'LFVC.STAR.ARR1A.RW27.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFVC.STAR.ARR1A.RW27.NONE', 'the agreeing STAR is written')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]'); return !!s && ![...s.options].some(o => /⚠/.test(o.textContent)) })()", what='the transition is no longer marked')
    c.eq(c.quiet("(window.__notes || []).length") - n1, 0, 'a choice without conflict says nothing', what='notifications after ARR1A')


@case('F27', 'A row with procedures offers "Read again"', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='user, 29 Oct: « il manque un bouton “rafraîchir” les procédures (avec une date pour le dernier fichier) »; V3 spec 10.20 / 10.23: the date (coverage().read_at) then « Relire » on the one secondary line, same gesture and same code path as the reading on demand')
def f27(c):
    open_proc(c)
    wait_rows(c, 'arr')
    b = f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]'
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] [data-do=procfetch]')", what='the arrival row (it has procedures) offers the reading again')
    c.eq(norm(c.text(b) or ''), norm(row(c, 'procReread')), 'the button says "Read again" in the language of the run', what='button')
    c.ok(c.js("!!document.querySelector('[data-module=fuel] [data-proc=arr] select[data-k=\"p-arr-star\"]')"), 'no STAR list', 'the lists stay next to it')
    # the button is on the secondary line, after the date of the last reading (LFML's file was read by hand on 29 Oct 16:53Z, an earlier cycle)
    c.eq(meta_parts(c, 'arr'), [norm(row(c, 'procFileAt').replace('{d}', '29/10 16:53Z')) + ' ⌛', norm(row(c, 'procReread'))], 'the date of the last reading comes before the button, on one line', what='arrival line')
    c.tap(b)
    want = norm(tx(PT, "no-launcher'", c.lang, after='procReasons'))
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


@case('F31', 'Lists: compatible first, doubtful never listed and counted, runways led by the chosen approach', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=True, rule='V3 spec 10.23 / 10.26: the entries compatible with the choice come first, then the warnings; a record without a name or with status doubt is not in the lists; a line counts the procedures not read')
def f31(c):
    open_proc(c)
    wait_rows(c, 'arr')
    set_icao(c, 'arr', 'LFVD')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ORD1A/.test(o.textContent))", what='the row of LFVD is drawn')
    # the nameless STAR (runway 14) and the doubtful one are in no list, and their runway is not offered
    c.eq([lab for v, lab in sel_opts(c, 'p-arr-star') if v not in ('', '__none')], ['ORD1A · 07', 'ORD2B · 25'], 'only the two named STARs are listed (no nameless one, no doubtful one)', what='STAR options')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '07', '25'], 'and runway 14, named by the nameless record only, is not offered', what='runways')
    # the count of what was not read
    # aerodb itself leaves the status doubt record out; the nameless one is Fuel's own safety belt and is counted
    line = norm(c.text(f'{FUEL} [data-proc="arr"] .fu-procunread') or '')
    c.eq(line, norm(row(c, 'procNotRead1').replace('{n}', '1')), 'the secondary line counts the record not listed that aerodb let through, shortly (singular)', what='unread count')
    c.ok(norm(c.attr(f'{FUEL} [data-proc="arr"] .fu-procunread', 'title')).endswith(norm(row(c, 'procUnread1').replace('{n}', '1'))), 'title missing the sentence', 'and its title says the sentence (after the catalogue label "partly read" when aerodb gives it)')
    c.eq(c.count(f'{FUEL} [data-proc="arr"] .fu-procmeta [data-source-slot]'), 1, 'with the slot the Source link of 10.25 will take, at the end of the same line', what='source slot')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] .fu-procunread'), 0, 'an aerodrome with nothing unread shows no line', what='departure line')
    # compatible first: runway 25 chosen, the STAR and the approach of 25 lead, those of 07 follow marked
    pick_proc(c, 'p-arr-rwy', '25')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-star\"] option')].some(o => /ORD1A.*⚠/.test(o.textContent))", what='the STAR of 07 is marked')
    c.eq([lab for v, lab in sel_opts(c, 'p-arr-star') if v not in ('', '__none')], ['ORD2B', 'ORD1A ⚠'], 'the compatible STAR first, the warning after (a runway is chosen: no runway in the labels)', what='STAR options')
    c.eq([lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')], ['ILS25', 'ILS07 ⚠'], 'and the approaches the same way', what='approach options')
    # the runway list is led by the runway of the chosen approach
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '07', '25'], 'without a chosen SID or approach the runways are in natural order', what='runways')
    pick_proc(c, 'p-arr-app', 'LFVD.APP.ILS25.RW25.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFVD.APP.ILS25.RW25.NONE', 'the approach is written')
    pick_proc(c, 'p-arr-rwy', '')
    cf_doc(c, lambda d: 'rwy' not in (procs_of(d, 'arr') or {'rwy': 1}), 'the runway is cleared')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && s.value === '' })()", what='the runway select is back to not chosen')
    c.eq([v for v, _ in sel_opts(c, 'p-arr-rwy')], ['', '25', '07'], 'the runway of the chosen approach comes first', what='runways')


@case('F32', 'Procedures rules bench', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='frame/lib/procedures.js (V3 spec 10.29 c): the rules shared by Fuel and the Map are pure and their bench passes')
def f32(c):
    c.page.goto(f'{c.base}/frame/lib/test/procedures.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/procedures.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


# ---------------------------------------------------------------------------------------------------------------- F34 - F36
# The "Procédures" card redone (V3 spec 10.29 d, e, f; 10.23): a title with the aerodrome's name, ONE secondary line, a fixed grid
# identical on both sides, lists updated in place, a series of choices written once.
def meta_parts(c, side):
    """The pieces of a side's single secondary line (separators, the Source slot, the « zone manquante » slot of SOG-0143 and the ground slot of
    SOG-0135, F124, left out), or None without the line."""
    return c.js("""(s) => { const m = document.querySelector('[data-module=fuel] [data-proc="' + s + '"] .fu-procmeta');
        return m ? [...m.children].filter(e => !e.classList.contains('fu-sep') && !e.hasAttribute('data-source-slot') && !e.hasAttribute('data-gap-slot') && !e.hasAttribute('data-ground-slot')).map(e => e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()) : null }""", side)


def select_geometry(c):
    """{ data-k: { x, y, w } } of every select of the card, in px."""
    return c.js("""() => Object.fromEntries([...document.querySelectorAll('[data-module=fuel] [data-proc] select')].map(s => {
        const r = s.getBoundingClientRect(); return [s.dataset.k, { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }] }))""")


def narrow_selects(c):
    """The selects of the card narrower than their longest option (text and padding; the arrow is the select's own): [{ k, need, have }]."""
    return c.js("""() => { const cv = document.createElement('canvas').getContext('2d');
        return [...document.querySelectorAll('[data-module=fuel] [data-proc] select')].map(s => { const cs = getComputedStyle(s); cv.font = cs.font;
          const w = Math.max(...[...s.options].map(o => cv.measureText(o.textContent).width));
          return { k: s.dataset.k, need: Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)), have: Math.floor(s.getBoundingClientRect().width) } }).filter(r => r.have < r.need) }""")


@case('F34', 'Procedures card: titled with the name, one secondary line, one fixed grid on both sides, no label cut', 'F', tags=('fuel', 'aerodb', 'layout'),
      designs=('standard',), phone=False, screens=True,
      rule='V3 spec 10.23 / 10.27 / 10.29 d: "Départ LFPO Paris-Orly"; one muted line "lu le … · Relire · N non lues" (Relire outside the grid); runway · procedure · transition on columns identical on both sides; a select as wide as its longest label; one column under 600 px')
def f34(c):
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    wait_rows(c, 'arr')
    # the title: side, code, the name aerodb gives (the seeded base names its aerodromes "<code> TEST")
    # le texte du titre sans son bouton « Sur la carte »
    titles = [norm(t) for t in c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc] .fu-proctitle')].map(e => { const x = e.cloneNode(true); x.querySelectorAll('button, .fu-procsum').forEach(b => b.remove()); return x.textContent })")]  # the summary: F65
    c.eq(titles, [norm(f"{row(c, 'dep')} LFRS Lfrs Test"), norm(f"{row(c, 'arr')} LFML Lfml Test")], 'each side is titled with its side, its code and the aerodrome\'s name', what='titles')
    # ONE secondary line per side; the arrival's file was read by hand (seeded 29 Oct 16:53Z, an earlier cycle: ⌛), the departure's is published (no date)
    c.eq(c.count(f'{FUEL} [data-proc] .fu-procmeta'), 2, 'one secondary line per side, not more', what='secondary lines')
    arr = meta_parts(c, 'arr')
    c.eq(arr, [norm(row(c, 'procFileAt').replace('{d}', '29/10 16:53Z')) + ' ⌛', norm(row(c, 'procReread'))], 'the arrival line: "lu le 29/10 16:53Z ⌛" then "Relire"', what='arrival line')
    c.eq(meta_parts(c, 'dep'), [norm(row(c, 'procReread'))], 'the departure line: "Relire" alone (a published file has no reading date)', what='departure line')
    c.eq(c.js("[...document.querySelectorAll('[data-module=fuel] [data-do=procfetch][data-again]')].map(b => !!b.closest('.fu-procmeta') && !b.closest('.fu-pf'))"), [True, True],
         '"Relire" is a text button of the line, outside the grid', what='Relire in the line')
    c.eq(c.count(f'{FUEL} [data-proc] .fu-procmeta [data-source-slot]'), 2, 'each line ends with the slot of the later "Source" link', what='source slots')
    c.eq(narrow_selects(c), [], 'at 1280, beside the map, no select is narrower than its longest option', what='narrow selects at 1280')
    # beside the map (about 515 px): the three columns from 480 px, unless they would overflow (then one column: never cut)
    fit = c.js("(() => { const b = document.querySelector('[data-module=fuel] .fu-procbox'); return { one: b.classList.contains('fu-one'), over: b.scrollWidth > b.clientWidth + 1, w: b.clientWidth } })()")
    c.ok(not fit['over'], f'{fit}', 'beside the map the card never overflows its width')
    if not fit['one']:
        g0 = select_geometry(c)
        c.ok(g0['p-dep-rwy']['y'] == g0['p-dep-sid']['y'] and g0['p-dep-rwy']['x'] < g0['p-dep-sid']['x'], f'{g0}', 'beside the map the runway and the SID are on one line (the grid)')
    c.page.set_viewport_size({'width': 1920, 'height': 1080})            # a module of 600 px and more: the three columns
    c.settle()
    wait_rows(c, 'arr')
    # the same columns on both sides: runway, procedure, transition; the approach under the STAR
    g = select_geometry(c)
    for a, b, what in (('p-dep-rwy', 'p-arr-rwy', 'runway'), ('p-dep-sid', 'p-arr-star', 'procedure'), ('p-dep-trans', 'p-arr-trans', 'transition')):
        c.eq((g[a]['x'], g[a]['w']), (g[b]['x'], g[b]['w']), f'the {what} column has the same left edge and width on both sides', what=what)
    c.eq((g['p-arr-app']['x'], g['p-arr-app']['w']), (g['p-arr-star']['x'], g['p-arr-star']['w']), 'the approach is under the STAR, on the same column', what='approach column')
    c.ok(g['p-arr-app']['y'] > g['p-arr-star']['y'], f"{g['p-arr-app']} below {g['p-arr-star']}", 'the approach is on the second line of the arrival')
    c.ok(g['p-arr-rwy']['w'] < g['p-arr-star']['w'], f"{g['p-arr-rwy']['w']} vs {g['p-arr-star']['w']}", 'the runway column is narrow, the procedure column wide')
    c.eq(narrow_selects(c), [], 'every select is at least as wide as its longest option label (none is cut)', what='narrow selects at 1920')
    c.ok(c.js("[...document.querySelectorAll('[data-module=fuel] [data-proc] option')].filter(o => o.value !== '' && o.value !== '__none' && !o.parentElement.dataset.k.endsWith('-rwy')).every(o => o.title.startsWith(o.textContent.trim()))"),
         'a title lacks its label', 'the full label of an option is also its title')
    # under 600 px a single column, every select at the full width
    c.page.set_viewport_size({'width': 390, 'height': 844})
    try:
        c.settle()
        to_step(c, 1)
        c.until("(() => { const r = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]'); return !!r && r.getBoundingClientRect().width > 0 })()", what='the card is on screen at 390 px')
        g = select_geometry(c)
        c.eq(len({v['x'] for v in g.values()}), 1, 'one column: every select has the same left edge', what=f'left edges {sorted({v["x"] for v in g.values()})}')
        c.eq(len({v['w'] for v in g.values()}), 1, 'and the same, full width', what=f'widths {sorted({v["w"] for v in g.values()})}')
        ys = [v['y'] for v in g.values()]
        c.ok(len(set(ys)) == len(ys), f'tops {ys}', 'and they are stacked, none beside another')
    finally:
        c.page.set_viewport_size({'width': 1280, 'height': 800})
    # an aerodrome with nothing: the line says so and offers the reading; the title is the code alone when aerodb does not know the aerodrome
    set_icao(c, 'dep', 'LFQQ')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=dep] [data-do=procfetch]:not([data-again])')", what='the departure of LFQQ offers the reading')
    c.eq(meta_parts(c, 'dep'), [norm(row(c, 'procNoData')), norm(row(c, 'procRead').replace('{icao}', 'LFQQ'))], 'without data the line says so and offers the reading', what='departure line')
    c.eq(norm(c.text(f'{FUEL} [data-proc="dep"] .fu-proctitle')), norm(f"{row(c, 'dep')} LFQQ"), 'an aerodrome unknown to aerodb is titled by its code alone', what='title')


@case('F35', 'Procedures card: when only the lists change they are updated in place, the focus stays', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='V3 spec 10.29 e: the options of the existing selects are replaced, the box is never rebuilt, the focus never moves; the structure changes only with the aerodrome, the start or a transition list appearing')
def f35(c):
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'arr')
    wait_rows(c, 'dep')   # one side unfolded at a time (§ 10.31): the departure, where the focus goes
    c.js("""() => { const q = k => document.querySelector('[data-module=fuel] select[data-k="' + k + '"]');
        window.__keep = { sid: q('p-dep-sid'), star: q('p-arr-star'), rwy: q('p-dep-rwy'), box: q('p-dep-sid').closest('.fu-procbox'), dep: q('p-dep-sid').closest('.fu-proc') }; q('p-dep-sid').focus() }""")
    # the departure runway changes by script (no focus move): the SID list is re-marked while the focus is in it
    c.js("""() => { const r = window.__keep.rwy; r.value = '21'; r.dispatchEvent(new Event('change', { bubbles: true })) }""")
    c.until("[...window.__keep.sid.options].some(o => /NTS1A.*⚠/.test(o.textContent))", what='the SID of the other runway is marked in the list the focus is in')
    same = c.js("""() => ({ focus: document.activeElement === window.__keep.sid, sid: window.__keep.sid.isConnected, box: window.__keep.box.isConnected, dep: window.__keep.dep.isConnected,
        star: window.__keep.star.isConnected })""")
    c.eq(same['focus'], True, 'the focus is still on the same SID select after its options changed', what='activeElement')
    c.ok(all(same.values()), f'{same}', 'no node of the card was replaced (box, side, selects)')
    # the other side changes (by script, the arrival is folded) while the focus is in the departure list: the focus stays there
    c.js("""() => { const r = document.querySelector('[data-module=fuel] select[data-k="p-arr-rwy"]'); r.value = '31L'; r.dispatchEvent(new Event('change', { bubbles: true })) }""")
    c.until("[...window.__keep.star.options].some(o => /MEN1A.*⚠/.test(o.textContent))", what='the STAR of the other runway is marked on the folded arrival side')
    c.eq(c.js("() => document.activeElement === window.__keep.sid"), True, 'the focus stays on the departure SID list while the arrival lists change', what='activeElement')
    c.js("""() => { const r = window.__keep.rwy; r.value = '03'; r.dispatchEvent(new Event('change', { bubbles: true })) }""")
    c.until("![...window.__keep.sid.options].some(o => /NTS1A.*⚠/.test(o.textContent))", what='NTS1A is no longer marked, the list is back to the runway 03')
    # a change of structure (the SID removed: its transition list disappears) keeps the focus on its select by name
    c.js("() => { document.querySelector('[data-module=fuel] select[data-k=\"p-dep-sid\"]').focus() }")
    c.js("""() => { const s = document.querySelector('[data-module=fuel] select[data-k="p-dep-sid"]'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })) }""")
    c.until("!document.querySelector('[data-module=fuel] select[data-k=\"p-dep-trans\"]')", what='the transition list of the removed SID disappears')
    # on a computer the select keeps it; on a touch screen (the phone runs) no list gets it back: the native picker would reopen (F40)
    coarse = c.js("() => !!window.matchMedia('(pointer: coarse)').matches")
    c.eq(c.js("() => document.activeElement && document.activeElement.dataset.k || ''"), '' if coarse else 'p-dep-sid',
         'a change of structure keeps the focus on its select on a computer, and gives it to no list on a touch screen', what='activeElement')


@case('F36', 'A series of choices is written once, 400 ms after the last one', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='V3 spec 10.29 f: choices made in a row are written once (one deferred save, one quote); no intermediate state reaches the flight record')
def f36(c):
    open_proc(c)
    wait_rows(c, 'dep')
    wait_rows(c, 'arr')
    # three choices in a row, then watch the flight record until it holds the last one: no state with only the first choices is ever written
    for k, v in (('p-arr-rwy', '13R'), ('p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE'), ('p-arr-app', 'LFML.APP.I13R.RW13R.NONE')):
        c.page.select_option(f'{FUEL} select[data-k="{k}"]', v)
    seen = []
    for _ in range(80):
        arr = (((c.doc('pilot/ABC/current_flight.json') or {}).get('route') or {}).get('procedures') or {}).get('arr')
        st = json.dumps(arr, sort_keys=True)
        if st not in seen:
            seen.append(st)
        if arr and arr.get('app'):
            break
        c.wait(60)
    states = [json.loads(x) for x in seen if x != 'null']
    c.ok(bool(states) and states[-1].get('app') == 'LFML.APP.I13R.RW13R.NONE', f'states seen {seen}', 'the last choice reached the flight record')
    c.eq(len(states), 1, 'and it arrived in one write: no intermediate state (the runway alone, the runway and the STAR) was ever written', what=f'states seen {seen}')


@case('F37', 'Partly read aerodrome: "N non lues" counts the pages and records of coverage().partial', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='aerodb 567b94440: coverage(icao).partial { pages, doubt } (a held aerodrome with pages not read or records to check is orange, reason partial); Fuel shows the sum on its secondary line and does not take orange for "nothing held"')
def f37(c):
    docs = proc_docs()
    for d in docs:
        if d[0] == 'proc/manual/index.json':
            d[1]['aerodromes']['LFML'].update(pages_unread=2, doubt=1)
    c.open('fuel', docs=docs + proc_flight(None), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] .fu-procunread')", what='the arrival line counts what was not read')
    c.eq(norm(c.text(f'{FUEL} [data-proc="arr"] .fu-procunread') or ''), norm(row(c, 'procNotRead').replace('{n}', '3')), '2 pages not read and 1 record to check make "3 non lues"', what='unread count')
    c.ok(c.count(f'{FUEL} [data-proc="arr"] select[data-k="p-arr-star"]') == 1 and c.count(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]') == 1,
         'lists or Relire missing', 'orange (partial) still means held: the lists and "Relire" stay, not the "Lire" button alone')


@case('F38', 'A failed reading says the counts of its stats after the reason', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.29 g: a failure that saw pages carries stats; Fuel words "0 page lue sur 31" after the reason, the launcher\'s refusal read as { reason, wait, message }')
def f38(c):
    # aerodb.fetchProcedures answers a failure with the counts (a launcher in its single refusal form cannot be served by the test page)
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a);
          try { db.fetchProcedures = async () => ({ ok: false, reason: 'failed', message: 'no procedure could be read for this aerodrome', stats: { pages: 31, read: 0, rejected: 31, reasons: [['layout', 31]] } }) } catch (e) {}
          return db } } } }) })()""")
    open_proc(c)
    wait_rows(c, 'arr')
    c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]')
    want = norm(row(c, 'procCountRead1').replace('{read}', '0').replace('{pages}', '31'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", want, timeout=8000, what=f'the failure notification says "{want}"')
    note = next(norm(n) for n in c.note_log() if want in norm(n))
    reason = norm(tx(PT, "none-read'", c.lang, after='procReasons').split('{m}')[0].replace('{icao}', 'LFML'))
    c.ok(note.startswith(reason) and note.index(want) > len(reason) - 1, f'{note!r}', f'the counts come after the reason ({reason!r})')
    c.ok('no procedure could be read' not in note, f'{note!r}', 'with counts, the launcher\'s English message is not repeated')


@case('F39', 'Time bench: fmtDayZ and the other Z formats', 'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='V3 spec 10.29 h: frame/lib/time.js gives "29/10 16:53Z" (UTC, day and month), the one writer of that format; its pure bench passes')
def f39(c):
    run_bench(c, 'frame/lib/test/time.html')



@case('F40', 'Phone: choosing a procedure never gives the focus back to a list (the native picker would reopen)', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, rule='user 29 Oct on a phone: « le choix d\'une procédure réaffiche immédiatement le popdown »; on a coarse pointer, never refocus a select after a change')
def f40(c):
    # a touch screen: (pointer: coarse)
    c.page.add_init_script("""(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /pointer:\\s*coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q) })()""")
    open_proc(c)
    wait_rows(c, 'dep')
    # NTS1A has a transition: choosing it adds the transition list, so the card's structure is redrawn
    # the finger opens the list (it has the focus), then picks: the change comes while the select holds the focus
    c.js("""() => { const s = document.querySelector('[data-module=fuel] select[data-k="p-dep-sid"]'); s.focus(); s.value = 'LFRS.SID.NTS1A.RW03.NONE';
        s.dispatchEvent(new Event('change', { bubbles: true })) }""")
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-dep-trans\"]')", what='the transition list appears')
    c.settle()
    tag = c.js("(() => { const a = document.activeElement; return a && a.closest('[data-proc]') ? a.tagName + ':' + (a.dataset.k || '') : '' })()")
    c.eq(tag, '', 'no list of the card holds the focus after the choice (it would reopen on a phone)', what='focused element')



@case('F41', 'The Map\'s return: « Sur la carte » opens the choice mode; one key or several, applied together, said once and consumed', 'F',
      tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.23 / 10.30: « Sur la carte » in a side\'s title opens #maps?choose=arr&icao=…; the Map comes back with every key of the '
      'side (rwy sid star app apptrans, id or none), Fuel consumes them together at mount, one write, one line says what changed; a missing '
      'key leaves its family as it was; anything not admitted is ignored (F63 merged here, refactoring 10.33)')
def f41(c):
    open_proc(c)
    wait_rows(c, 'arr')
    b = f'{FUEL} [data-proc="arr"] .fu-proctitle [data-do="onmap"]'
    c.eq(norm(c.text(b) or ''), norm(row(c, 'procOnMap')), 'the arrival title carries "Sur la carte"', what='button')
    c.ge(round(c.box(b)['h']), 24, 'a button one can tap', what='button height')
    # the Map consumes its keys at mount: the address the button set is recorded when it changes
    c.js("() => { window.__hashes = []; window.addEventListener('hashchange', () => window.__hashes.push(location.hash)) }")
    c.tap(b)
    c.until("location.hash === '#maps'", what='the tap opens the Map, which takes its keys')
    c.eq(c.js("window.__hashes[0]"), '#maps?choose=arr&icao=LFML', 'in its choice mode, for the arrival aerodrome', what='address')
    # the Map's answer (location.replace): one key per trip
    map_return(c, '#fuel?focus=arr&star=LFML.STAR.MEN2B.RW31L.NONE')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFML.STAR.MEN2B.RW31L.NONE', 'the proposed STAR is written', timeout=12000)
    c.eq((procs_of(d, 'arr') or {}).get('rwy'), '31L', 'as a choice made in Fuel: the STAR serving one runway sets it', what='runway')
    c.until("(w) => (window.__notes || []).some(n => n.includes('MEN2B'))", None, timeout=6000, what='a line says what changed')
    c.until("!/[?&](star|focus)=/.test(location.hash)", what='the proposal and focus keys leave the address (consumed)')
    # several keys of one side in one trip: applied together, one write, one change line naming them; the other side untouched
    dep0 = procs_of(cf_doc(c, lambda d: True, 'the flight record'), 'dep')
    c.js("() => { location.hash = '#maps' }")
    c.until("location.hash === '#maps'", what='the Map is open again')
    c.js("() => { window.__notes = window.__notes || []; window.__n0 = window.__notes.length }")
    map_return(c, '#fuel?focus=arr&rwy=13R&star=LFML.STAR.MEN1A.RW13R.NONE&app=LFML.APP.I13R.RW13R.NONE&apptrans=none')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFML.APP.I13R.RW13R.NONE', 'the proposed approach is written', timeout=12000)
    a = procs_of(d, 'arr') or {}
    c.eq((a.get('rwy'), a.get('star'), a.get('app')), ('13R', 'LFML.STAR.MEN1A.RW13R.NONE', 'LFML.APP.I13R.RW13R.NONE'),
         'the runway, the STAR and the approach of one trip are all written', what='route.procedures.arr')
    c.ok('appTrans' in a and a['appTrans'] is None, f'{a}', 'apptrans=none (lower case in the address) writes « Aucune » in appTrans')
    c.eq(procs_of(d, 'dep'), dep0, 'the other side is untouched', what='route.procedures.dep')
    c.until("!/[?&](rwy|star|app|apptrans|focus)=/.test(location.hash)", what='every key leaves the address (consumed together)')
    c.until("(w) => window.__notes.slice(window.__n0).some(n => n.includes('MEN1A'))", None, timeout=6000, what='a line says what changed')
    c.settle()
    c.wait(700)
    lines = c.js("window.__notes.slice(window.__n0).filter(n => n.includes('MEN1A') || n.includes('I13R'))")
    c.eq(len(lines), 1, f'one change line for the whole trip: {lines}', what='change lines')
    c.ok('MEN1A' in lines[0] and 'I13R' in lines[0], lines[0], 'the line names the STAR and the approach')
    # a missing key leaves its family: a trip with the runway only keeps the STAR and the approach
    c.js("() => { location.hash = '#maps' }")
    c.until("location.hash === '#maps'", what='the Map is open again')
    map_return(c, '#fuel?focus=arr&rwy=31L')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '31L', 'the runway alone is written', timeout=12000)
    a = procs_of(d, 'arr') or {}
    c.eq((a.get('star'), a.get('app')), ('LFML.STAR.MEN1A.RW13R.NONE', 'LFML.APP.I13R.RW13R.NONE'), 'the STAR and the approach stay (keys absent)',
         what='route.procedures.arr')
    # « none »: the departure's SID set to « Aucune » — a real trip goes through the Map (Fuel is mounted again by the frame on its way back)
    c.js("() => { location.hash = '#maps' }")
    c.until("location.hash === '#maps'", what='the Map is open again')
    map_return(c, '#fuel?focus=dep&sid=none', 'dep')
    d = cf_doc(c, lambda d: 'sid' in (procs_of(d, 'dep') or {}) and (procs_of(d, 'dep') or {}).get('sid') is None, '"none" writes « Aucune » (null)', timeout=12000)
    # the address can be edited by any link: only « none », a runway offered for that aerodrome, or a record of the flight's aerodrome on
    # that side (right kind, not doubtful) is admitted; anything else is ignored and nothing is written
    before = procs_of(d, 'arr')
    c.js("() => { location.hash = '#maps' }")
    c.until("location.hash === '#maps'", what='the Map is open again')
    map_return(c, '#fuel?focus=arr&star=LFRS.SID.NTS1A.RW03.NONE&rwy=99&app=%22%3E%3Cimg')
    c.until("!/[?&](star|focus|app|rwy)=/.test(location.hash)", what='the hostile keys are consumed')
    c.settle()
    c.wait(700)
    d2 = cf_doc(c, lambda d: True, 'the flight record')
    c.eq(procs_of(d2, 'arr'), before, 'a SID of the departure aerodrome as a STAR, an unknown runway and a raw string change nothing', what='route.procedures.arr')



@case('F42', '« Cartes » on the secondary line: the aerodrome page of its state official AIP, the address aerodb gives; nothing for a state it does not know',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0024, SOG-0031 (lot C2: aerodb.chartsUrl): the address comes from aerodb alone, never composed in the module: LFML the SIA '
      'eAIP AD 2 page, LEMD ENAIRE, EIDW AirNav Ireland (a published ie zone), a new tab without opener; KJFK: no link, no text')
def f42(c):
    docs = aero_docs(airfields=True)
    for d in docs:
        if d[0] == 'sia/base/index.json':   # a published ie zone (no row of it is read: the address needs its cycle only)
            d[1]['zones']['ie'] = {'cycle': AERO_CYCLE, 'prefixes': ['EI'], 'kb': {}, 'cells': {}}
    docs.append([f'sia/base/ie/{AERO_CYCLE}/meta.json', {'schema': 2, 'zone': 'ie', 'cycle': AERO_CYCLE, 'kind': 'meta', 'parserVersion': 1,
                                                         'data': {}, 'updated_at': f'{AERO_CYCLE}T00:00:00Z'}, 'reference'])
    c.open('fuel', docs=proc_docs() + proc_flight(None, False, None) + docs)
    to_step(c, 1)
    wait_rows(c, 'arr')
    link = "(s) => { const a = document.querySelector('[data-module=fuel] [data-proc=' + s + '] [data-source-slot] [data-charts]'); return a ? { href: a.getAttribute('href'), t: a.target, rel: a.rel, text: a.textContent.trim() } : null }"
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=arr] [data-source-slot] [data-charts]')", what='the charts link of the arrival')
    a = c.js(link, 'arr')
    c.ok(re.match(r'^https://www\.sia\.aviation-civile\.gouv\.fr/media/dvd/eAIP_\d{2}_[A-Z]{3}_\d{4}/FRANCE/AIRAC-\d{4}-\d{2}-\d{2}/html/eAIP/FR-AD-2\.LFML-fr-FR\.html$',
                  a['href'] or ''), a['href'], 'LFML: the eAIP page of the aerodrome, as aerodb gives it')
    c.eq((a['t'], a['rel'], norm(a['text'])), ('_blank', 'noopener noreferrer', norm(tx(PT, 'procCharts', c.lang))), 'a new tab, no opener, « Cartes »', what='link')
    want = {'LEMD': 'https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/LEMD/LE_AD_2_LEMD_en.html',
            'EIDW': f'https://www.airnav.ie/AIRAC/{AERO_CYCLE}-AIRAC/html/eAIP/EI-AD-2.EIDW-en-IE.html'}
    for icao, href in want.items():
        set_icao(c, 'dep', icao)
        c.until("([s, h]) => document.querySelector('[data-module=fuel] [data-proc=' + s + '] [data-charts]')?.getAttribute('href') === h",
                ['dep', href], what=f'{icao}: {href}')
    set_icao(c, 'dep', 'KJFK')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=dep][data-icao=KJFK]')", what='the departure row of KJFK')
    c.settle()
    c.eq(c.js("(document.querySelector('[data-module=fuel] [data-proc=dep] [data-source-slot]')?.textContent || '').trim()"), '',
         'KJFK: no link and no text', what='KJFK')


@case('F43', 'A flight dated in the past says so, without blocking', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.28 (user, 29 Oct): « Vol daté du 26/10, dans le passé : météo et NOTAM ne valent plus », on the Flight step and on the plan; never blocking')
def f43(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    local = c.js("() => { const d = new Date(Date.now() - 50 * 3600e3); d.setSeconds(0, 0); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }")
    c.page.fill(f'{FUEL} [data-k="wxdate"]', local)
    c.page.locator(f'{FUEL} [data-k="wxdate"]').blur()
    want = norm(row(c, 'pastDate').split('{d}')[0])
    c.until("(w) => { const p = document.querySelector('[data-module=fuel] [data-pastdate]'); return !!p && !p.hidden && p.textContent.replace(/[\s\u00a0\u202f]+/g, ' ').trim().startsWith(w) }",
            want, timeout=6000, what='the Flight step says the date is in the past')
    c.ok(norm(c.text(f'{FUEL} [data-block="result"] .fu-pastdate') or '').startswith(want), 'no line', 'and the plan says it too')
    c.ok(c.js("!document.querySelector('[data-module=fuel] [data-block=result] .fu-big').closest('[inert]')"), 'blocked', 'nothing is blocked: the quote stays')
    c.tap(f'{FUEL} [data-do="whennow"]')
    c.until("document.querySelector('[data-module=fuel] [data-pastdate]').hidden", what='"Now" removes the warning')


# ---------------------------------------------------------------------------------------------- F44-F47: the aerodrome's name and the completion
# invented aerodromes (no AIP data): nine "Quarry Field" sharing the code prefix LFQ, and two with a name worth typing
NAMES_BASE = ([{'icao': f'LFQ{i}', 'name': f'Quarry Field {i}', 'lat': 44.0 + i / 10, 'lon': 2.0, 'elev': 100} for i in range(1, 10)]
              + [{'icao': 'LFZO', 'name': 'Zorly-Ville', 'lat': 45.0, 'lon': 3.0, 'elev': 90},
                 {'icao': 'LFZT', 'name': 'Toulzone Test Aerodrome With A Very Long Name Indeed', 'lat': 45.5, 'lon': 3.2, 'elev': 80}])
AD = 'modules/fuel/adnames.js'


def open_names(c, **kw):
    """The planned flight (dep LFRS, arr LFML, altn LFMT) on the step Flight, with the invented aerodromes in the published base."""
    c.open('fuel', flight=True, airfields=True, aero_extra={'aerodromes': NAMES_BASE}, **kw)
    wait_quote(c)
    to_step(c, 0)
    c.until("[...document.querySelectorAll('[data-module=fuel] .fu-adname')].every(e => e.textContent.trim())", timeout=8000, what='the three name lines are filled')


def ad_lines(c):
    """The text and the height of the three name lines of the step Flight."""
    return c.js("[...document.querySelectorAll('[data-module=fuel] .fu-adname')].map(e => [e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(), Math.round(e.getBoundingClientRect().height * 10) / 10])")


def type_in(c, k, text):
    """Empties the field `k` then types `text` key by key, as a pilot does (the field keeps the focus)."""
    sel = f'{FUEL} input[data-k="{k}"]'
    c.page.fill(sel, '')
    c.page.locator(sel).click()
    c.page.keyboard.type(text)


def sug(c):
    """The list of proposed aerodromes: { shown, items: [text] }."""
    return c.js("""(() => { const b = document.querySelector('[data-module=fuel] [data-adsug]');
        return { shown: !!b && !b.hidden && b.getBoundingClientRect().height > 0,
                 items: [...b.querySelectorAll('[role=option]')].map(o => o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()) } })()""")


OPTS = "document.querySelectorAll('[data-module=fuel] [data-adsug] [role=option]').length"
# the list drawn for the text typed, not for a shorter prefix on the way (« LF » proposes seven aerodromes too): every proposal's code
# starts with `p` (F45 was unstable on a loaded run: it read the list of « LF » once one option was there)
SUG_FOR = "(p) => { const o = [...document.querySelectorAll('[data-module=fuel] [data-adsug] [role=option]')]; return o.length > 0 && o.every(x => String(x.dataset.code || '').startsWith(p)) }"


def wait_sug(c, prefix, what):
    """Waits for the list of proposals drawn for the text typed: every code starts with `prefix`."""
    c.until(SUG_FOR, prefix, timeout=8000, what=what)


@case('F44', 'Step Flight: one fixed name line under each aerodrome field, "inconnu" for a code that matches nothing, same height always', 'F', tags=('fuel', 'aerodb', 'layout'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.27: « LFPO — Paris-Orly » once the code resolves; « inconnu » for four characters that resolve to nothing; empty under four; height reserved, ellipsis')
def f44(c):
    open_names(c)
    full = ad_lines(c)
    c.eq([t for t, _ in full], ['LFRS — Lfrs Test', 'LFML — Lfml Test', 'LFMT — Lfmt Test'], 'each field shows its aerodrome\'s name (the base names the seeded ones "<code> TEST")', what='name lines')
    h = {hh for _, hh in full}
    c.ok(len(h) == 1 and next(iter(h)) > 10, f'{full}', 'the three lines share one height')
    # fewer than four characters: empty, same height; four that match nothing: « inconnu »
    c.page.fill(f'{FUEL} input[data-k="dep"]', 'LF')
    c.until("document.querySelector('[data-module=fuel] .fu-adname').textContent === ''", what='under four characters the line is empty')
    c.eq(ad_lines(c)[0][1], full[0][1], 'the empty line keeps its height', what='height when empty')
    c.page.fill(f'{FUEL} input[data-k="dep"]', 'LFXX')
    c.until("document.querySelector('[data-module=fuel] .fu-adname').textContent.trim() !== ''", what='four unknown characters get a line')
    c.eq(norm(ad_lines(c)[0][0]), norm(tx(AD, 'unknown', c.lang)), 'an unknown code says « inconnu »', what='unknown line')
    c.eq(ad_lines(c)[0][1], full[0][1], 'the line keeps its height', what='height when unknown')
    # a name too long for the column: one line, ellipsis, same height, the whole name in the title
    c.page.fill(f'{FUEL} input[data-k="dep"]', 'LFZT')
    c.until("document.querySelector('[data-module=fuel] .fu-adname').textContent.includes('Toulzone')", what='the long name arrives')
    cut = c.js("(() => { const e = document.querySelector('[data-module=fuel] .fu-adname'); return { cut: e.scrollWidth > e.clientWidth, h: Math.round(e.getBoundingClientRect().height * 10) / 10, title: e.title, ell: getComputedStyle(e).textOverflow } })()")
    c.ok(cut['cut'] and cut['ell'] == 'ellipsis' and cut['h'] == full[0][1] and 'Very Long Name' in cut['title'], f'{cut}', 'a long name is cut with an ellipsis on one line, the full name in the title')


@case('F45', 'Completion: from two characters, by code or name, seven at most, keyboard and tap, closed on blur', 'F', tags=('fuel', 'aerodb', 'layout'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.27: aerodb.find, aerodromes only, 7 suggestions « LFPO Paris-Orly »; ↑ ↓ Enter Esc; tap; the list closes on blur; the pick writes the code like a typing')
def f45(c):
    open_names(c)
    type_in(c, 'dep', 'L')
    c.quiet(OPTS)
    c.ok(not sug(c)['shown'], 'one character', 'one character proposes nothing')
    type_in(c, 'dep', 'LFQ')
    wait_sug(c, 'LFQ', 'three characters propose aerodromes')
    s = sug(c)
    c.ok(s['shown'] and len(s['items']) == 7, f'{s}', 'nine aerodromes match LFQ: seven are proposed, not more')
    c.eq(s['items'][0], 'LFQ1 Quarry Field 1', 'each proposal reads « code name »', what='first proposal')
    top = c.js("document.querySelector('[data-module=fuel] .fu-flight').getBoundingClientRect().top")
    box = c.js("(() => { const r = document.querySelector('[data-module=fuel] [data-adsug]').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth } })()")
    c.ok(box['l'] >= 0 and box['r'] <= box['w'] + 0.5, f'{box}', 'the list stays inside the screen')
    c.ok(c.js("[...document.querySelectorAll('[data-module=fuel] [data-adsug] [role=option]')].every(o => o.getBoundingClientRect().height >= 43.5)"), 'small target', 'every proposal is a 44 px target')
    c.eq(c.js("document.querySelector('[data-module=fuel] .fu-flight').getBoundingClientRect().top"), top, 'the list is laid over the page: nothing moves', what='layout while open')
    c.ok(c.js("document.activeElement === document.querySelector('[data-module=fuel] input[data-k=dep]')"), 'focus moved', 'the field keeps the focus while the list is open')
    # keyboard: down, down, up, down: the second proposal; Enter picks it
    for k in ('ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowDown'):
        c.key(k)
    c.eq(c.js("document.querySelector('[data-module=fuel] [data-adsug] [aria-selected=true]')?.dataset.code"), 'LFQ2', '↓ ↓ ↑ ↓ lands on the second proposal', what='active proposal')
    c.key('Enter')
    c.eq(c.js("document.querySelector('[data-module=fuel] input[data-k=dep]').value"), 'LFQ2', 'Enter writes the code in the field', what='field value')
    c.ok(not sug(c)['shown'], 'still open', 'picking closes the list')
    cf_doc(c, lambda d: d['route'].get('dep') == 'LFQ2' and str(d['route'].get('text', '')).startswith('LFQ2'), 'the pick goes the way of a typing: the flight and its route text carry LFQ2')
    c.until("document.querySelector('[data-module=fuel] .fu-adname').textContent.includes('Quarry Field 2')", what='the name line follows the pick')
    # by name, then Escape closes
    type_in(c, 'arr', 'zorl')
    wait_sug(c, 'LFZO', 'a name prefix proposes the aerodrome')
    c.eq(sug(c)['items'], ['LFZO Zorly-Ville'], 'a name proposes its aerodrome', what='by name')
    c.key('Escape')
    c.ok(not sug(c)['shown'], 'still open', 'Escape closes the list')
    # tap (click on a screen): the list closes on blur, but a tap on a proposal still registers
    type_in(c, 'altn', 'LFQ')
    wait_sug(c, 'LFQ', 'the alternate field proposes too')
    c.tap(f'{FUEL} [data-adsug] [data-code="LFQ5"]')
    c.until("document.querySelector('[data-module=fuel] input[data-k=altn]').value === 'LFQ5'", what='a tap on a proposal picks it')
    cf_doc(c, lambda d: d['route'].get('altn') == 'LFQ5', 'the alternate is written')
    # blur closes the list
    type_in(c, 'altn', 'LFQ')
    wait_sug(c, 'LFQ', 'the list opens again')
    c.page.locator(f'{FUEL} input[data-k="altn"]').blur()
    c.until("document.querySelector('[data-module=fuel] [data-adsug]').hidden", what='the list closes when the field loses the focus')
    # a full code typed by hand: no list in the way, the focus stays, the name shows
    type_in(c, 'arr', 'LFZO')
    c.until("document.querySelector('[data-module=fuel] .fu-adname[data-adline=arr]').textContent.includes('Zorly')", what='a code typed in full shows its name')
    c.quiet(OPTS)
    c.ok(not sug(c)['shown'] and c.js("document.activeElement === document.querySelector('[data-module=fuel] input[data-k=arr]')"), 'in the way', 'a complete code leaves no list and keeps the focus')


@case('F46', 'Completion at 390 px: no horizontal overflow, 44 px targets, the list over the page', 'F', tags=('fuel', 'layout'),
      designs=('standard',), screens=False, rule='V3 spec 10.27: touch targets 44 px, no overflow at 390 px')
def f46(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_names(c)
    type_in(c, 'altn', 'LFQ')
    wait_sug(c, 'LFQ', 'proposals under the third field')
    c.until(OPTS + ' === 7', what='seven proposals under the third field')
    r = c.js("""(() => { const iw = innerWidth, b = document.querySelector('[data-module=fuel] [data-adsug]').getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, iw, l: b.left, r: b.right,
                 wide: [...document.querySelectorAll('[data-module=fuel] [data-adsug] *')].filter(e => e.getBoundingClientRect().right > iw + 0.5).length } })()""")
    c.ok(r['sw'] <= r['iw'] and r['l'] >= 0 and r['r'] <= r['iw'] + 0.5 and r['wide'] == 0, f'{r}', 'at 390 px the list and the page do not overflow')
    c.ok(c.js("[...document.querySelectorAll('[data-module=fuel] [data-adsug] [role=option]')].every(o => o.getBoundingClientRect().height >= 43.5)"), 'small', '44 px targets')
    c.tap(f'{FUEL} [data-adsug] [data-code="LFQ7"]')
    c.until("document.querySelector('[data-module=fuel] input[data-k=altn]').value === 'LFQ7'", what='the tap picks')


@case('F47', 'Step Departure: the summary names both aerodromes in full, before and after the start', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=True, rule='V3 spec 10.27: the step Départ recalls the full name of the departure and arrival aerodromes')
def f47(c):
    named = "[...document.querySelectorAll('[data-module=fuel] [data-sum] [data-adtext]')].filter(e => e.textContent.trim()).length === 2"
    dds = "[...document.querySelectorAll('[data-module=fuel] [data-sum] dd')].filter(d => d.querySelector('[data-adtext]')).map(d => d.textContent)"
    c.open('fuel', flight=True, airfields=True)
    wait_quote(c)
    to_step(c, 4)
    c.until(named, what='the summary names both aerodromes')
    c.eq([norm(e) for e in c.js(dds)], [norm('LFRS Lfrs Test'), norm('LFML Lfml Test')], 'the summary: code and name for the departure and for the arrival', what='summary before the start')
    c.open('fuel', docs=proc_flight(None, True), airfields=True)
    wait_quote(c)
    to_step(c, 4)
    c.until(named, what='after the start the summary still names them')
    c.until("document.querySelectorAll('[data-module=fuel] [data-block=summary] [data-do=cancelstart]').length === 1", what='the flight is started (its summary offers the cancel)')


@case('F48', 'The aerodrome field is a search: a full name proposes, only a code reaches the route, leaving it unchosen reverts', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, rule='V3 spec 10.27, decided 29 Oct: no maxlength; route.dep / arr / altn written only for a known 4-character code, a pick, or a code typed on purpose; a typed name never reaches the route')
def f48(c):
    open_names(c)
    saved = c.js("document.querySelector('[data-module=fuel] input[data-k=arr]').value")
    type_in(c, 'arr', 'Zorly-Ville')
    c.until(OPTS + ' > 0', what='a full name proposes its aerodrome')
    c.eq(sug(c)['items'], ['LFZO Zorly-Ville'], 'the full name is a search', what='suggestions')
    d = cf_doc(c, lambda d: True, 'the flight')
    c.eq(d['route'].get('arr'), saved, 'while typing, the route keeps its aerodrome (no name written)', what='route.arr while typing')
    c.key('ArrowDown')
    c.key('Enter')
    cf_doc(c, lambda d: d['route'].get('arr') == 'LFZO', 'the pick writes the code')
    # a name typed, then leaving the field without choosing: the field comes back to the code, nothing written
    type_in(c, 'arr', 'Toulzone')
    c.until(OPTS + ' > 0', what='the other name proposes')
    c.page.locator(f'{FUEL} input[data-k="fl"]').click()
    c.until("document.querySelector('[data-module=fuel] input[data-k=arr]').value === 'LFZO'", what='leaving without a choice brings the field back to the code')
    c.settle()
    c.eq(cf_doc(c, lambda d: True, 'the flight')['route'].get('arr'), 'LFZO', 'and the route still holds it', what='route.arr after blur')


# ---------------------------------------------------------------------------------------------------------------- F60 - F61 (flight plan export)
@case('F60', 'Flight plan writers bench (X-Plane .fms v3 and 1100, MSFS .pln)', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='frame/lib/fms.js (V3 spec 10.28): the writers are pure and their bench passes on the invented flight')
def f60(c):
    c.page.goto(f'{c.base}/frame/lib/test/fms.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/fms.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows.filter(x => !x.ok) })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


@case('F61', 'Flight plan export: three 44 px buttons at the Departure step, disabled without a route, each downloads its file', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.28 (user, 29 Oct): export .fms (X-Plane, two formats) and .pln (MSFS) from Fuel; download in the browser; named LFRS-LFML_<day>.<ext>')
def f61(c):
    sel = f'{FUEL} [data-block="fms"] button[data-fms]'
    # no flight: the buttons exist and are disabled, with the reason in the title
    c.open('fuel')
    c.settle()
    c.eq(c.count(sel), 3, 'three export buttons', what='buttons without a flight')
    st = c.js(f"[...document.querySelectorAll('{sel}')].map(b => ({{ d: b.disabled, t: b.title }}))")
    c.ok(all(s['d'] and s['t'] for s in st), str(st), 'all disabled, with the reason as title, without a route')
    # a planned flight: enabled, 44 px targets, one download each
    c.open('fuel', flight=True)
    wait_quote(c)
    c.tap(f'{FUEL} [data-step="4"]')
    c.until(f"document.querySelectorAll('{sel}').length === 3 && [...document.querySelectorAll('{sel}')].every(b => !b.disabled)", what='the buttons are enabled with a route')
    c.eq(norm(c.text(f'{FUEL} [data-block="fms"] h2') or ''), norm(row(c, 'fmsTitle')), 'the card is titled in the language of the run', what='card title')
    for b in c.js(f"[...document.querySelectorAll('{sel}')].map(b => ({{ k: b.dataset.fms, w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, t: b.textContent.trim() }}))"):
        c.ok(b['h'] >= 44 and b['w'] >= 44, f"{b['k']} is {b['w']:.0f} x {b['h']:.0f}", 'every button is a 44 px target')
    for k, ext, head in (('xp11', 'fms', 'I\r\n1100 Version'), ('xp10', 'fms', 'I\r\n3 version'), ('pln', 'pln', '<?xml')):
        with c.page.expect_download(timeout=10000) as di:
            c.tap(f'{FUEL} [data-block="fms"] button[data-fms="{k}"]')
        d = di.value
        c.ok(re.fullmatch(rf'LFRS-LFML_\d{{4}}-\d{{2}}-\d{{2}}\.{ext}', d.suggested_filename or ''), d.suggested_filename, f'the file is named LFRS-LFML_<day>.{ext}')
        text = Path(d.path()).read_bytes().decode('utf-8')
        c.ok(text.startswith(head), text[:60], f'the {k} file starts with {head!r}')
        if k == 'xp11':
            c.ok('ADEP LFRS' in text and 'ADES LFML' in text and 'NUMENR 4' in text, text[:200], 'the 1100 file names both aerodromes and counts the four route points')
        if k == 'pln':
            c.ok('<DepartureID>LFRS</DepartureID>' in text and text.count('<ATCWaypoint ') == 4, text[:200], 'the .pln has the four waypoints')



@case('F62', 'Wind components bench', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='frame/lib/wind.js (V3 spec 10.30): head / tail and cross wind on a runway, pure, its bench passes')
def f62(c):
    c.page.goto(f'{c.base}/frame/lib/test/wind.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/wind.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


def route_metar(c, items):
    """The METAR of the weather layer, answered by the test: `items` {ICAO: (wdir, wspd)}; aviationweather's JSON (through the launcher's relay or
    not) and metar.vatsim.net's raw text (without a launcher)."""
    import re as _re
    import time as _t
    now = int(_t.time())

    def raw(i, w):
        return f'{i} {_t.strftime("%d%H%M", _t.gmtime(now))}Z {w[0]:03d}{w[1]:02d}KT CAVOK 15/10 Q1015'

    def aw(route):
        route.fulfill(status=200, content_type='application/json', body=json.dumps([
            {'icaoId': i, 'obsTime': now, 'reportTime': now, 'wdir': w[0], 'wspd': w[1], 'visib': '6+', 'clouds': [{'cover': 'CAVOK'}],
             'temp': 15, 'dewp': 10, 'altim': 1015, 'rawOb': raw(i, w), 'fltCat': 'VFR'} for i, w in items.items()]))

    def vatsim(route):
        route.fulfill(status=200, content_type='text/plain', body='\n'.join(raw(i, w) for i, w in items.items()))
    c.context.route(_re.compile(r'aviationweather\.gov(/|%2F)api(/|%2F)data(/|%2F)metar', _re.I), aw)
    c.context.route(_re.compile(r'metar\.vatsim\.net', _re.I), vatsim)


@case('F64', 'Wind on each runway of the procedure card, from the known METAR', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=True, rule='V3 spec 10.30: each runway option ends with "↓ 12 kt · ← 6 kt" (frame/lib/wind.js label: where the wind '
      'blows, runway upward) from the METAR of the Departure step; green / orange / red by wind.severity, the reason in the title; no METAR, no suffix')
def f64(c):
    route_metar(c, {'LFML': (310, 12)})
    open_proc(c)
    wait_rows(c, 'arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && [...s.options].some(o => o.textContent.includes('kt')) })()",
            timeout=20000, what='the runway list gets the wind of the METAR')
    o = c.js("""[...document.querySelector('[data-module=fuel] select[data-k="p-arr-rwy"]').options].map(o => ({ v: o.value, t: o.textContent, cls: o.className, title: o.title,
        color: getComputedStyle(o).color, ok: getComputedStyle(document.querySelector('[data-module=fuel]')).getPropertyValue('--sog-ok').trim() }))""")
    by = {x['v']: x for x in o}
    # the arrows say where the wind blows, the runway drawn upward (§ 10.30, third reading): head wind ↓, tail wind ↑
    c.ok('↓ 12 kt' in by['31L']['t'] and by['31L']['cls'] == 'wind-ok', f"{by['31L']}", 'runway 31L: 12 kt of head wind, « ↓ », green (wind-ok)')
    c.ok('↑ 12 kt' in by['13R']['t'] and by['13R']['cls'] == 'wind-alert', f"{by['13R']}", 'runway 13R: 12 kt of tail wind, « ↑ », red (wind-alert: over 5 kt)')
    c.ok(norm(row(c, 'procWindTail').replace('{kt}', '12').replace('{max}', '5')) in norm(by['13R']['title']), by['13R']['title'], 'the reason in the title, in the language of the run')
    c.ok(by['31L']['color'] != by['13R']['color'], f"{by['31L']['color']} / {by['13R']['color']}", 'the two levels are drawn in two colours (semantic tokens of the design)')
    # the departure (LFRS) has no METAR: no suffix, nothing invented
    dep = c.js("""[...(document.querySelector('[data-module=fuel] select[data-k="p-dep-rwy"]')?.options || [])].map(o => o.textContent)""")
    c.ok(dep and not any('kt' in t for t in dep), f'{dep}', 'no METAR for the departure: no wind on its runways')


@case('F65', 'Each side\'s title ends with the summary of its choice, the rule of the Map\'s pane', 'F', tags=('fuel', 'maps', 'weather'), designs=('standard',),
      screens=False, langs4=True, rule='V3 spec 10.30 (second reading): the side title reads summaryOf: « 13R · ↑ 12 kt », « MEN1A », « I13R »; '
      '« Aucune » said with its kind; the wind of the chosen runway from the known METAR')
def f65(c):
    route_metar(c, {'LFML': (310, 12)})
    open_proc(c, procs={'dep': {'rwy': '03', 'sid': None}, 'arr': {'rwy': '13R', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'trans': 'LFML.STAR.MEN1A.RWALL.NEPIX',
                                                                    'app': 'LFML.APP.I13R.RW13R.NONE'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    wait_rows(c, 'arr')
    parts = "(s) => [...document.querySelectorAll('[data-module=fuel] [data-proc=\"' + s + '\"] .fu-procsum > span')].map(e => e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim())"
    c.until(f"(() => ({parts})('arr').some(t => t.includes('kt')))()", timeout=20000, what='the arrival summary gets the wind of the METAR')
    arr = c.js(f"({parts})('arr')")
    # the runway's axis is the Map's rule since the refactoring R-F1 (§ 10.33): threshold → opposite threshold before the QFU; the invented
    # thresholds of LFML give 134° (their QFU says 130°), hence the 1 kt of crosswind
    c.eq(arr, ['13R · ↑ 12 kt · ← 1 kt', 'MEN1A via NEPIX', 'I13R'], 'runway with its wind (tail: « ↑ »), STAR via its transition, approach', what='arrival summary')
    c.eq(c.js("document.querySelector('[data-module=fuel] [data-proc=arr] .fu-procsum > span').className"), 'wind-alert', 'the runway of the summary carries the colour of its wind', what='class')
    dep = c.js(f"({parts})('dep')")
    c.eq(dep, ['03', norm(f"{row(c, 'procSid')} {row(c, 'procNone')}")], 'no METAR: the runway alone; « Aucune » said with its kind', what='departure summary')


@case('F66', 'Approaches the SIA way: initial segments are transitions of every final of the runway, short labels', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.30 (fourth reading): "INA RNAV RWY 06" records are never rows but the transitions of every final of runway 06, '
      '"via OKAPI 1A", by IAF; a final reads "ILS 06", "RNP 06", its published name in the title; apptrans is the segment\'s id')
def f66(c):
    open_proc(c)
    wait_rows(c, 'arr')
    set_icao(c, 'arr', 'LFVE')
    c.until("[...document.querySelectorAll('[data-module=fuel] select[data-k=\"p-arr-app\"] option')].some(o => /LFVE/.test(o.value))", what='the approach list of LFVE is drawn')
    apps = [(v, lab) for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')]
    c.eq([lab for _, lab in apps], ['ILS 06', 'RNP 06'], 'two finals, short labels; no row "INA RNAV RWY 06" (the six identical rows of LFPO)', what='approach options')
    ils = apps[0][0]
    t = c.js("(v) => [...document.querySelector('[data-module=fuel] select[data-k=\"p-arr-app\"]').options].find(o => o.value === v).title", ils)
    c.ok('ILS CAT I or CAT II or CAT III RWY 06' in t, t, 'the published name in the title')
    pick_proc(c, 'p-arr-app', ils)
    c.until("!!document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]')", what='the final has transitions: the segments of its runway')
    tr = [(v, lab) for v, lab in sel_opts(c, 'p-arr-appTrans') if v]
    c.eq([lab for _, lab in tr], ['via ALPAG 1E', 'via BISON 1E', 'via OKAPI 1A'], 'the segments by their published name, which starts with the IAF, by IAF', what='transition options')
    c.eq(sel_opts(c, 'p-arr-appTrans')[0][0], '', 'no transition (direct to the IF) stays the first choice', what='first option')
    okapi = tr[2][0]
    pick_proc(c, 'p-arr-appTrans', okapi)
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('appTrans') == okapi, 'the segment is written as the approach transition')
    c.eq((procs_of(d, 'arr') or {}).get('app'), ils, 'with its final', what='approach')
    # the other final of the runway offers the same segments
    pick_proc(c, 'p-arr-app', apps[1][0])
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-appTrans\"]'); return !!s && s.options.length === 4 })()", what='the RNP offers the same three segments')
    c.until("[...document.querySelectorAll('[data-module=fuel] [data-proc=arr] .fu-procsum > span')].some(e => e.textContent.trim() === 'RNP 06')", what='the summary says the short label')


@case('F68', 'A typed airway between two points is an airway, never a point of the same name elsewhere; followed only along its own nodes', 'F',
      tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31 (user, 30 Oct: « A3 » read as a point near Gibraltar, 1 871 NM): « A VOIE B » is an airway when the base has one of '
      'that name nearby; it is followed only when A and B are nodes joined along it in the leg corridor; else the leg is direct and a line says so')
def f68(c):
    import math

    def gc(a, b):
        r = math.pi / 180
        h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
        return round(2 * 3440.065 * math.asin(math.sqrt(h)), 1)
    # invented positions (no AIP content); « A3 » is ALSO the identifier of a point far away, as in the user's base
    fix = {'LACOU': (44.3, 0.9), 'LMG': (45.8, 1.0), 'BALAN': (46.5, 1.0), 'OLINO': (46.9, 1.05), 'AMB': (47.4, 1.06), 'GILUX': (47.7, 1.74),
           'PIMOS': (46.9, 2.6), 'MOTAL': (47.58, 2.22), 'OLZOM': (48.16, 2.26), 'KOTAP': (48.28, 2.3), 'A3': (43.3, -1.4)}

    def seg(route, a, b):
        return {'route': route, 'a': {'id': a, 'lat': fix[a][0], 'lon': fix[a][1]}, 'b': {'id': b, 'lat': fix[b][0], 'lon': fix[b][1]},
                'lower': 0, 'upper': 46000, 'nm': gc(fix[a], fix[b])}
    pts = [{'id': k, 'lat': v[0], 'lon': v[1], 'type': 'RNAV'} for k, v in fix.items()]
    ads = [{'icao': 'LFBO', 'name': 'LFBO TEST', 'lat': 43.63, 'lon': 1.37, 'elev': 500}, {'icao': 'LFPO', 'name': 'LFPO TEST', 'lat': 48.72, 'lon': 2.38, 'elev': 300}]
    c.open('fuel', flight=True, airfields=True, airways=[seg('A3', 'PIMOS', 'MOTAL'), seg('J18', 'MOTAL', 'OLZOM'), seg('J18', 'OLZOM', 'KOTAP')],
           aero_extra={'points': pts, 'aerodromes': ads})
    wait_quote(c)
    set_icao(c, 'dep', 'LFBO')
    set_icao(c, 'arr', 'LFPO')
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFBO LACOU7B LACOU LMG BALAN OLINO AMB GILUX A3 MOTAL J18 KOTAP LFPO')
    c.page.locator(rt).blur()
    d = c.until_doc('pilot/ABC/current_flight.json', lambda d: [p['id'] for p in (d.get('route') or {}).get('points') or []][-2:] == ['KOTAP', 'LFPO'],
                    'the route is read', timeout=10000)
    ids = [p['id'] for p in d['route']['points']]
    c.ok('A3' not in ids, f'{ids}', 'the airway word A3 is never the point « A3 » of the base (far away)')
    c.eq(ids[ids.index('MOTAL'):], ['MOTAL', 'OLZOM', 'KOTAP', 'LFPO'], 'MOTAL J18 KOTAP: the airway is followed along its node OLZOM', what='points after MOTAL')
    c.ok(ids[ids.index('GILUX') + 1] == 'MOTAL', f'{ids}', 'A3 does not join GILUX to MOTAL: the leg is direct, no node of A3 elsewhere')
    c.ok(0 < (d['route'].get('distanceNm') or 0) < 450, f"distance {d['route'].get('distanceNm')}", 'the distance stays that of the route (not 1 871 NM)')
    line = norm(row(c, 'awyBad')).replace('{w}', 'A3').replace('{a}', 'GILUX').replace('{b}', 'MOTAL')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\u00a0\u202f]+/g, ' ').trim() === w)", line, timeout=6000, what=f'the line « {line} »')
    c.ok('A3' in c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value").split(), 'text', 'the word the pilot typed stays in the text')


@case('F80', 'Fuel\'s pure benches: quote, levels, winds aloft, METAR and TAF, progress, current flight', 'F', tags=('fuel',), designs=('standard',),
      screens=False, rule='modules/fuel SPEC 2-3 (quote), 7 (levels), 10 (weather), 11 (winds aloft), 12 (progress), 4 (current flight): '
      'each bench of modules/fuel/test/ passes; before this case no case ran them (refactoring 10.33, SPEC as a state)')
def f80(c):
    for page in ('quote', 'levels', 'winds', 'metar', 'progress', 'current_flight'):
        c.page.goto(f'{c.base}/modules/fuel/test/{page}.html', wait_until='load')
        # these benches write their verdict in the title: « fuel — quote bench: OK (63/63) » or « … FAIL (…) »
        try:
            c.page.wait_for_function("/: (OK|FAIL) \\(/.test(document.title)", timeout=30000)
        except Exception:
            raise Fail(f'the {page} bench never wrote its verdict in its title', 'a finished bench', f'modules/fuel/test/{page}.html') from None
        t = c.js('document.title')
        c.ok(': OK (' in t, t, f'every check of the {page} bench passes')


@case('F69', 'Route text and route model benches', 'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='frame/lib/route_text.js (V3 spec 10.31): provenance of an Auto, ICAO form with DCT, SID / STAR names rendered and read back; '
      'frame/lib/route_model.js (refactoring 10.33 R-F4): the route read from its text on an invented base; both benches pass')
def f69(c):
    for page in ('route_text', 'route_model'):
        c.page.goto(f'{c.base}/frame/lib/test/{page}.html', wait_until='load')
        try:
            c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
        except Exception:
            raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', f'frame/lib/test/{page}.html') from None
        r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
        c.ok(r['fail'] == 0 and r['pass'] > 0, f"{page}: {r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}",
             f'every check of the {page} bench passes')


@case('F70', 'The route text is a view of the procedures: a choice writes its name, an edit sets or clears the choice', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31: the SID name and its exit after the departure, the STAR entry and name before the arrival, never the approach; a SID '
      'joined by a direct is said (« NTS1A sort à NT102 : NT102 DCT LUGEN »); a name typed sets the choice, its absence clears it')
def f70(c):
    # the exit of NTS1A and the entries of the STARs are points of the base (as in a real one): they are read as points
    open_proc(c, aero_extra={'points': [{'id': 'NT102', 'lat': 46.8, 'lon': -1.35, 'type': 'RNAV'}, {'id': 'MEN01', 'lat': 44.2, 'lon': 3.6, 'type': 'RNAV'},
                                        {'id': 'MEN11', 'lat': 44.0, 'lon': 3.9, 'type': 'RNAV'}]})
    wait_rows(c, 'dep')
    rt = f"document.querySelector('{FUEL} [data-k=rtext]').value"
    pick_proc(c, 'p-dep-sid', 'LFRS.SID.NTS1A.RW03.NONE')
    c.until(f"{rt} === 'LFRS NTS1A NT102 DCT LUGEN DCT NEPIX LFML'", timeout=8000,
            what='the SID name then its exit after the departure, in ICAO form: « LFRS NTS1A NT102 DCT LUGEN DCT NEPIX LFML »')
    line = norm(row(c, 'procExitDct')).replace('{sid}', 'NTS1A').replace('{exit}', 'NT102').replace('{next}', 'LUGEN')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\u00a0\u202f]+/g, ' ').trim() === w)", line, timeout=6000, what=f'the line « {line} »')
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE')
    c.until(f"{rt}.endsWith('NEPIX DCT MEN01 MEN1A LFML')", timeout=8000, what='the STAR entry then its name before the arrival')
    pick_proc(c, 'p-arr-app', 'LFML.APP.I13R.RW13R.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == 'LFML.APP.I13R.RW13R.NONE', 'the approach is written')
    c.settle()
    c.ok('I13R' not in c.js(rt), c.js(rt), 'the approach never appears in the text (not an item of the flight plan)')
    # an edit of the text: the SID name removed clears the SID; a STAR name typed sets that STAR
    field = f'{FUEL} [data-k="rtext"]'
    c.page.fill(field, 'LFRS LUGEN NEPIX MEN2B LFML')
    c.page.locator(field).blur()
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFML.STAR.MEN2B.RW31L.NONE', 'the STAR named in the text is chosen', timeout=8000)
    c.ok('sid' not in (procs_of(d, 'dep') or {}), f"{procs_of(d, 'dep')}", 'the SID whose name left the text is no longer chosen')


@case('F71', 'Aerodrome names bench', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='frame/lib/adnames.js (V3 spec 10.27): one text rule for the aerodrome name next to its code, « LFPO Paris-Orly », shared by fuel and the Map; its bench passes')
def f71(c):
    c.page.goto(f'{c.base}/frame/lib/test/adnames.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/adnames.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


@case('F72', 'The procedure card opens folded: two summary lines, one side unfolded at a time by a tap on its line', 'F', tags=('fuel', 'layout'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31 (user: « l\'étape procédures doit se lire sans défiler, pire sur téléphone »): two summary lines with one « Sur la carte » each, '
      'the lists and the secondary line folded under them; a tap on a line unfolds that side and folds the other; fewer than seven things visible')
def f72(c):
    open_proc(c, procs=V2_PROCS)
    c.until("(s) => !!document.querySelector('[data-module=fuel] [data-proc=\"arr\"]')", None, timeout=15000, what='the card is drawn')
    c.settle()
    vis = """() => { const box = [...document.querySelectorAll('[data-module=fuel] .fu-procbox')].find(b => b.offsetParent);
        const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' };
        return { selects: [...box.querySelectorAll('select')].filter(shown).length, controls: [...box.querySelectorAll('button, select, a')].filter(shown).length,
                 meta: [...box.querySelectorAll('.fu-procmeta')].filter(shown).length, onmap: [...box.querySelectorAll('[data-do=onmap]')].filter(shown).length } }"""
    v = c.js(vis)
    c.eq((v['selects'], v['meta']), (0, 0), 'at opening no list and no secondary line is visible: the two summary lines only', what='visible lists, lines')
    c.eq(v['onmap'], 2, 'one « Sur la carte » per side', what='visible « Sur la carte »')
    c.ok(v['controls'] < 7, f'{v}', 'fewer than seven controls visible at opening')
    c.ok(not c.js("!!document.querySelector('[data-module=fuel] .fu-proctitle [data-do=procfetch], [data-module=fuel] .fu-proctitle [data-source-slot]')"), 'title',
         '« Relire » and « Source » are not in the summary line')
    # a tap on the arrival line (not on a button) unfolds it; then the departure line unfolds the departure and folds the arrival
    c.tap(f'{FUEL} [data-proc="arr"] .fu-prochead')
    c.until("!document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=arr]')", what='the arrival unfolds')
    c.eq(c.js(vis)['selects'], 4, 'the arrival lists are visible (runway, STAR, its transition, approach)', what='visible lists')
    c.tap(f'{FUEL} [data-proc="dep"] .fu-prochead')
    c.until("!document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=dep]') && !!document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=arr]')",
            what='the departure unfolds and the arrival folds: one side at a time')
    c.eq(c.attr(f'{FUEL} [data-proc="dep"] .fu-procfold', 'aria-expanded'), 'true', 'the button says the side is unfolded', what='aria-expanded')


@case('F73', 'A chosen procedure is one group row of the points list, its fixes folded under it', 'F', tags=('fuel', 'maps'), designs=('standard',),
      screens=False, langs4=True, rule='V3 spec 10.31 (confirmed by the user): « SID NTS1A · 3 points », « STAR MEN1A via NEPIX · 4 points », « I13R »; the '
      'fixes under a tap, never at the rank of the typed points; « Points (N) » counts the pilot\'s points and the groups')
def f73(c):
    open_proc(c, procs={'dep': {'rwy': '03', 'sid': 'LFRS.SID.NTS1A.RW03.NONE'},
                        'arr': {'rwy': '13R', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'trans': 'LFML.STAR.MEN1A.RWALL.NEPIX', 'app': 'LFML.APP.I13R.RW13R.NONE'},
                        'by': 'fuel', 'at': '2026-10-28T09:00:00Z'},
              aero_extra={'points': [{'id': 'NT102', 'lat': 46.8, 'lon': -1.35, 'type': 'RNAV'}]})
    rows = f"[...document.querySelectorAll('{FUEL} [data-pts] > *')].map(e => e.matches('.fu-ptgrp') ? 'G:' + e.dataset.kind + ':' + e.querySelector('summary').textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() : 'P:' + (e.querySelector('.fu-ptid b') || {{}}).textContent)"
    c.until(f"{rows}.filter(x => x.startsWith('G:')).length === 3", timeout=15000, what='three group rows: the SID, the STAR, the approach')
    r = c.js(rows)
    n = norm(row(c, 'ptsGroupN'))
    c.eq(r[:2], ['P:LFRS', 'G:sid:' + norm('SID NTS1A · ' + n.replace('{n}', '2'))], 'after the departure, the SID as one group (its fixes NT101 NT102)', what='first rows')
    c.eq(r[-3:], ['G:star:' + norm('STAR MEN1A via NEPIX · ' + n.replace('{n}', '4')), 'G:app:' + norm('I13R · ' + norm(row(c, 'ptsGroup1'))), 'P:LFML'],
         'before the arrival, the STAR via its transition and the approach as groups', what='last rows')
    c.ok(not any(x in ('P:NT102', 'P:NEPIX') for x in r), f'{r}', 'no fix of a procedure at the rank of the typed points (the exit NT102, the entry NEPIX)')
    pilot = [x for x in r if x.startswith('P:')]
    c.ok(norm(c.text(f'{FUEL} [data-ptsn]') or '').startswith(norm(row(c, 'ptsN').replace('{n}', str(len(pilot) + 3)))), c.text(f'{FUEL} [data-ptsn]'),
         '« Points (N) » counts the pilot\'s points and the three groups')
    c.ok(c.js(f"!document.querySelector('{FUEL} .fu-ptgrp[data-kind=sid]').open"), 'open', 'a group row is folded: its fixes under a tap')
    # refonte § 10.33 R-F3 : la teinte d'un groupe est le jeton du design que la Carte partage, aucune copie de couleur
    hues = c.js(f"(() => {{ const t = document.createElement('i'); document.querySelector('{FUEL}').append(t); const out = ['sid', 'star', 'app'].map(k => {{ "
                f"t.style.color = 'var(--sog-map-' + k + ')'; const g = document.querySelector('{FUEL} .fu-ptgrp[data-kind=' + k + ']'); "
                f"return [getComputedStyle(t).color, g && getComputedStyle(g).borderLeftColor]; }}); t.remove(); return out; }})()")
    c.ok(all(x[0] and x[0] == x[1] for x in hues), f'{hues}', 'each group\'s hue is the design token --sog-map-<kind> (shared with the Map)')


@case('F74', 'A leg left direct names the airway that joins its points and why it is closed at the leg\'s level, with its open band', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31 (user, 30 Oct: « AGN A34 LACOU … LMG », « pas de voie près de LACOU » at FL260 while A34 stops at FL195): « A34 relie LACOU '
      'à LMG, fermée au FL260 (ouverte de 6 500 ft au FL195) : tronçon direct »; never « follow it anyway »')
def f74(c):
    import math

    def gc(a, b):
        r = math.pi / 180
        h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
        return round(2 * 3440.065 * math.asin(math.sqrt(h)), 1)
    # invented: a lower airway Z34 LACOU - RUMEL - LMG (6 500 ft - FL195), the flight at FL270; the legs to and from the aerodromes are short
    fix = {'LACOU': (46.9, -1.3), 'RUMEL': (45.4, 1.8), 'LMG': (43.7, 4.9)}

    def seg(a, b):
        return {'route': 'Z34', 'a': {'id': a, 'lat': fix[a][0], 'lon': fix[a][1]}, 'b': {'id': b, 'lat': fix[b][0], 'lon': fix[b][1]},
                'lower': 6500, 'upper': 19500, 'nm': gc(fix[a], fix[b])}
    c.open('fuel', flight=True, airfields=True, airways=[seg('LACOU', 'RUMEL'), seg('RUMEL', 'LMG')],
           aero_extra={'points': [{'id': k, 'lat': v[0], 'lon': v[1], 'type': 'RNAV'} for k, v in fix.items()]})
    wait_quote(c)
    to_step(c, 1)
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS LACOU LMG LFML')
    c.page.locator(rt).blur()
    c.until(f"/\\(4\\)/.test(document.querySelector('{FUEL} [data-ptsn]').textContent)", timeout=6000, what='the route resolves to four points')
    c.tap(f'{FUEL} [data-do="rauto"]')
    head = norm(row(c, 'autoWhyClosed').split('{lvl}')[0].replace('{w}', 'Z34').replace('{a}', 'LACOU').replace('{b}', 'LMG'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\u00a0\u202f]+/g, ' ').trim().startsWith(w))", head, timeout=8000,
            what=f'a line naming the airway: « {head}… »')
    line = next(norm(n) for n in c.note_log() if norm(n).startswith(head))
    c.ok('FL195' in line and '6' in line.split('FL195')[0], line, 'the line gives the open band (6 500 ft to FL195) so that the pilot decides')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value").replace(' DCT', ''), 'LFRS LACOU LMG LFML', 'the leg stays direct: never « follow it anyway »', what='route text')


@case('F75', 'The route field completes at the cursor: procedure names, nearby airways, points; the word is written at the cursor', 'F',
      tags=('fuel', 'aerodb', 'layout'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31 part 4: from two characters at the cursor, seven proposals at most — SID / STAR names of the two aerodromes, airways '
      'around the previous point, points and navaids — the § 10.27 component (↑ ↓ Enter Esc, tap, closed on blur); picking writes the word')
def f75(c):
    open_proc(c)
    wait_rows(c, 'dep')
    rt = f'{FUEL} [data-k="rtext"]'
    items = f"[...document.querySelectorAll('{FUEL} [data-rtsug] [role=option]')].map(o => o.dataset.token)"
    c.page.locator(rt).click()
    c.page.fill(rt, 'LFRS NT')
    c.until(f"{items}.includes('NTS1A')", timeout=6000, what='« NT » proposes the SID NTS1A of the departure')
    c.ok(len(c.js(items)) <= 7, f'{c.js(items)}', 'seven proposals at most')
    c.ok(c.js(f"document.querySelector('{FUEL} [data-k=rtext]').getAttribute('aria-expanded')") == 'true', 'aria', 'the field says its list is open')
    box = c.js(f"(() => {{ const r = document.querySelector('{FUEL} [data-rtsug]').getBoundingClientRect(); return {{ l: r.left, r: r.right, w: innerWidth }} }})()")
    c.ok(box['l'] >= 0 and box['r'] <= box['w'] + 0.5, f'{box}', 'the list stays inside the screen')
    k = c.js(items).index('NTS1A')
    for _ in range(k + 1):
        c.key('ArrowDown')
    c.key('Enter')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value === 'LFRS NTS1A '", what='Enter writes the name at the cursor, followed by a space')
    c.ok(c.js(f"document.querySelector('{FUEL} [data-rtsug]').hidden"), 'list', 'picking closes the list')
    # a point of the base, by a tap
    c.page.keyboard.type('LU')
    c.until(f"{items}.includes('LUGEN')", timeout=6000, what='« LU » proposes the point LUGEN')
    c.tap(f'{FUEL} [data-rtsug] [data-token="LUGEN"]')
    c.until(f"document.querySelector('{FUEL} [data-k=rtext]').value === 'LFRS NTS1A LUGEN '", what='a tap writes the point at the cursor')
    c.ok(c.js(f"document.activeElement === document.querySelector('{FUEL} [data-k=rtext]')"), 'focus', 'the field keeps the focus after a tap')
    # Escape closes; one character proposes nothing
    c.page.keyboard.type('N')
    c.quiet(f"{items}.length")
    c.ok(c.js(f"document.querySelector('{FUEL} [data-rtsug]').hidden"), 'list', 'one character proposes nothing')


@case('F79', 'The Sheets view of Fuel is read-only: the list, the sheet of the flight marked, links to the editor of Maintenance', 'F', tags=('fuel', 'aerodb'),
      designs=('standard', 'cupertino'), screens=False, langs4=True,
      rule='V3 spec 10.34 (lot A2, step 5): one editor, in Maintenance; Fuel keeps the list, « Utiliser » and plain links to ?app=maintenance#aircraft?sheet=<id>; '
      'at 390 px the text of a row takes the width and its actions go under it (user, 30 Oct, iPhone: the text squeezed to one word a line)')
def f79(c):
    ec25 = {'id': 'EC25', 'name': 'EC25', 'icao': 'EC25', 'usableFuel': 2000, 'maxCrosswindKt': 17, 'cruise': {'tasKt': 141, 'fuelFlowPerHour': 650}}
    c25 = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000}}
    c.open('fuel?view=sheets', docs=[['aircraft/sheets/EC25.json', ec25, 'document'], ['aircraft/sheets/C30J.json', c25, 'document']])
    c.until(f"() => document.querySelectorAll('{FUEL} [data-sheets] [data-id]').length === 2", what='the two sheets are listed')
    c.tap(f'{FUEL} [data-id="EC25"] [data-do="use"]')
    cf_doc(c, lambda d: ((d.get('aircraft') or {}).get('sheetId') == 'EC25'), 'the flight uses EC25')
    c.tap(f'{FUEL} [data-view="sheets"]')
    c.until(f"() => document.querySelectorAll('{FUEL} [data-sheets] [data-id]').length === 2", what='back on the list')
    lay = c.js(f"""() => [...document.querySelectorAll('{FUEL} [data-sheets] [data-id]')].map(r => {{ const b = r.getBoundingClientRect(),
        t = r.firstElementChild.getBoundingClientRect(), a = r.querySelector('.f-row').getBoundingClientRect();
        return [r.dataset.id, Math.round(100 * t.width / b.width), a.top >= t.bottom - 1] }})""")
    c.ok(all(w >= 80 and under for _, w, under in lay), f'{lay}', 'at 390 px the text of a row takes the width (80 % or more) and its actions go under it')
    r = c.js(f"""() => ({{ inputs: document.querySelectorAll('{FUEL} [data-sheets] input, {FUEL} [data-sheets] select, {FUEL} [data-sheets] textarea, {FUEL} [data-sheets] [data-path]').length,
        rows: [...document.querySelectorAll('{FUEL} [data-sheets] [data-id]')].map(r => [r.dataset.id, [...r.querySelectorAll('a')].map(a => a.getAttribute('href')),
                                                                                   !!r.querySelector('[data-used]'), !!r.querySelector('[data-do=use]')]) }})""")
    c.eq(r['inputs'], 0, 'no field to type in: the list is read-only', what='inputs of the Sheets view')
    want = {row[0]: row for row in r['rows']}
    for sid in ('EC25', 'C30J'):
        c.ok(want[sid][1] and all(h == f'?app=maintenance#aircraft?sheet={sid}' for h in want[sid][1]), f'{want[sid][1]}', f'the links of {sid} open its editor in Maintenance')
        c.ok(want[sid][3], 'no « Utiliser »', f'{sid} can still be chosen for the flight')
    c.eq([want['EC25'][2], want['C30J'][2]], [True, False], 'only the sheet of the flight is marked', what='used marks')
    c.eq(c.js(f"() => document.querySelectorAll('{FUEL} [data-do=import], {FUEL} [data-do=edit], {FUEL} [data-do=new], {FUEL} [data-do=del]').length"), 0,
         'no import, edit, new or remove gesture is left', what='editor gestures')
    c.tap(f'{FUEL} [data-id="C30J"] [data-do="use"]')
    c.until(f"() => !document.querySelector('{FUEL} [data-sheets]') && !!document.querySelector('{FUEL} .fu-step, {FUEL} [data-block=result]')", what='« Utiliser » goes back to the quote')
    d = cf_doc(c, lambda d: ((d.get('aircraft') or {}).get('sheetId') == 'C30J'), 'the flight now uses C30J')


@case('F81', '« Cancel the start » after a question: the flight is no longer started, its progress cleared, « Start the flight » back', 'F',
      tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='modules/fuel SPEC 9.7 and 12: a started flight ends with its report or with « Cancel the start », after a question; « No » changes '
      'nothing; « Yes » writes started = null and progress = null (null, not removed: the write merges with the kept record)')
def f81(c):
    c.open('fuel', flight=True, started=True)
    wait_quote(c)
    # a started flight writes its progress: the cancellation must clear it, not only the start
    cf_doc(c, lambda d: bool((d.get('started') or {}).get('at')) and bool(d.get('progress')), 'the started flight has its progress', timeout=12000)
    to_step(c, 4)
    c.until(f"!!document.querySelector('{FUEL} [data-startrow] [data-do=cancelstart]')", what='a started flight offers « Annuler le départ »')
    c.tap(f'{FUEL} [data-do="cancelstart"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a question is asked')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='« Non » closes the question')
    c.wait(500)
    d = cf_doc(c, lambda d: True, 'the flight record')
    c.ok(bool((d.get('started') or {}).get('at')) and bool(d.get('progress')), f"started={d.get('started')}", '« Non » changes nothing: still started')
    c.tap(f'{FUEL} [data-do="cancelstart"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='asked again')
    c.tap('.f-modal [data-ok]')
    d = cf_doc(c, lambda d: 'started' in d and d['started'] is None and 'progress' in d and d['progress'] is None,
               'started = null and progress = null (null, not removed)')
    c.until(f"!!document.querySelector('{FUEL} [data-startrow] [data-do=start]')", what='« Démarrer le vol » is offered again')



# invented aerodromes beside the seeded route LFRS LUGEN NEPIX LFML (positions computed off its legs; no AIP content)
CORRIDOR_ADS = [{'icao': 'XQAA', 'name': 'XQAA TEST', 'lat': 45.811, 'lon': 0.668, 'elev': 100},    # 5 NM off LUGEN-NEPIX
                {'icao': 'XQBB', 'name': 'XQBB TEST', 'lat': 44.222, 'lon': 3.864, 'elev': 100},    # 4 NM off NEPIX-LFML
                {'icao': 'XQCC', 'name': 'XQCC TEST', 'lat': 46.155, 'lon': 1.01, 'elev': 100},     # 30 NM off LUGEN-NEPIX
                {'icao': 'XQDD', 'name': 'XQDD TEST', 'lat': 45.70, 'lon': 0.56, 'elev': 100}]      # 3 NM off, but no METAR


@case('F82', 'The weather corridor: the aerodromes within the radius of the route, sorted along it, those without a message left out; folded beyond two',
      'F', tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=True,
      rule='modules/fuel SPEC 10: aerodb aerodromes of each leg\'s box widened by the radius (wxRadiusNm, 10 NM by default), kept within that radius '
      'of the route, departure and arrival excluded, sorted by distance along the route, recomputed when the radius changes; an aerodrome without '
      'METAR or TAF is left out; more than two are folded under « n aerodromes along the route »')
def f82(c):
    route_metar(c, {'LFRS': (270, 10), 'LFML': (300, 12), 'XQAA': (280, 15), 'XQBB': (290, 10), 'XQCC': (250, 8)})
    c.open('fuel', flight=True, airfields=True, aero_extra={'aerodromes': CORRIDOR_ADS})
    wait_quote(c)
    to_step(c, 2)
    mids = f"""(() => [...document.querySelectorAll('{FUEL} [data-wx] .fu-wx .f-row b')].map(b => b.textContent.trim())
        .filter(id => /^XQ/.test(id)))()"""
    c.until(f"{mids}.length === 2", timeout=15000, what='the two aerodromes within 10 NM of the route are in the weather card')
    c.eq(c.js(mids), ['XQAA', 'XQBB'], 'within 10 NM, sorted along the route; 30 NM off (XQCC) left out; without METAR (XQDD) left out', what='corridor')
    c.eq(c.count(f'{FUEL} [data-wx] [data-wxmids]'), 0, 'two aerodromes: shown, not folded', what='fold')
    # the radius of the quote settings: 50 NM takes XQCC in; three aerodromes are folded under one line
    to_step(c, 3)
    c.js(f"document.querySelectorAll('{FUEL} details').forEach(d => {{ if (d.querySelector('[data-k=wxRadius]')) d.open = true }})")
    c.page.fill(f'{FUEL} [data-k="wxRadius"]', '50')
    c.page.locator(f'{FUEL} [data-k="wxRadius"]').blur()
    to_step(c, 2)
    c.until(f"!!document.querySelector('{FUEL} [data-wx] [data-wxmids]')", timeout=15000, what='three aerodromes: folded under one line')
    c.eq(sorted(c.js(mids)), ['XQAA', 'XQBB', 'XQCC'], 'within 50 NM: XQCC too; XQDD (no METAR) still left out', what='corridor at 50 NM')
    c.eq(norm(c.text(f'{FUEL} [data-wx] [data-wxmids] summary') or ''), norm(row(c, 'wxMids').replace('{n}', '3')), 'the line says how many',
         what='fold line')


@case('F77', 'The route text stays the same after two returns from the Map, with a SID whose published name has a space', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.31 (BUGS SOG walk, 30 Oct: « LFBO AMOLO 7A AMOLO 7A AMOLO DCT AMB … » after two returns): procsToText is idempotent, '
      'names written as ICAO designators without a space, the exit never added twice')
def f77(c):
    from fixtures.procedures import pt, rec
    docs = proc_docs()
    lfrs = next(d for d in docs if d[0].endswith('/LFRS.json'))
    lfrs[1] = {**lfrs[1], 'procedures': [*lfrs[1]['procedures'], {**rec('LFRS', 'SID', 'LUGEN 2B', ['21'], [pt(1, 'RW21', 47.17, -1.595), pt(2, 'NT201', 47.3, -1.4),
                                                                                                                 pt(3, 'LUGEN', 46.5833, -1.2)]), 'id': 'LFRS.SID.LUGEN2B.RW21.NONE'}]}
    c.open('fuel', docs=docs + proc_flight({'dep': {'rwy': '21'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'dep')
    rt = f"document.querySelector('{FUEL} [data-k=rtext]').value"
    want = 'LFRS LUGEN2B LUGEN DCT NEPIX LFML'
    for n in (1, 2):
        c.js("() => { location.hash = '#maps' }")
        c.until("location.hash === '#maps'", what='the Map is open')
        c.settle()
        c.js("() => location.replace('#fuel?focus=dep&sid=LFRS.SID.LUGEN2B.RW21.NONE')")
        cf_doc(c, lambda d: (procs_of(d, 'dep') or {}).get('sid') == 'LFRS.SID.LUGEN2B.RW21.NONE', 'the SID is chosen', timeout=12000)
        c.until(f"{rt} === '{want}'", timeout=10000, what=f'return {n}: « {want} » (one SID name, no space, its exit LUGEN already on the route)')
    c.settle()
    c.wait(600)
    c.eq(c.js(rt), want, 'two returns, the same text: nothing repeated', what='route text')


@case('F78', 'One distance with procedures, said; same-name SIDs of two runways make one row with their runways', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=True,
      rule='BUGS SOG walk, 30 Oct (anomalies 13 and 11): the route line gives the extended path\'s distance « procédures comprises »; never two '
      'identical labels in a list (« AMOLO 7A » for 14L and for 14R → « AMOLO 7A · 14L/14R »)')
def f78(c):
    from fixtures.procedures import pt, rec
    docs = proc_docs()
    lfrs = next(d for d in docs if d[0].endswith('/LFRS.json'))
    twin = lambda rw, a: {**rec('LFRS', 'SID', 'TWIN 7A', [rw], [pt(1, f'RW{rw}', *a), pt(2, 'LUGEN', 46.5833, -1.2)]), 'id': f'LFRS.SID.TWIN7A.RW{rw}.NONE'}
    lfrs[1] = {**lfrs[1], 'procedures': [*lfrs[1]['procedures'], twin('03', (47.138, -1.62)), twin('21', (47.17, -1.595))]}
    c.open('fuel', docs=docs + proc_flight({'dep': {'rwy': '03', 'sid': 'LFRS.SID.NTS1A.RW03.NONE'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'dep')
    # 13: the extended path (the SID included): the route line says « procédures comprises »
    want = norm(tx('modules/fuel/module.js', 'procs', c.lang, after='rsrc: {'))
    c.until(f"(w) => (document.querySelector('{FUEL} [data-rinfo]') || {{}}).textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", want,
            timeout=10000, what=f'the route line: « … {want} »')
    # 11: one row for the two records named TWIN 7A
    opts = [lab for v, lab in sel_opts(c, 'p-dep-sid') if v not in ('', '__none')]
    c.eq(len(opts), len(set(opts)), f'no two identical labels: {opts}', what='SID labels')
    twins = [o for o in opts if o.startswith('TWIN 7A')]
    c.eq(len(twins), 1, f'one row for TWIN 7A, its runways said: {twins}', what='TWIN 7A rows')
    c.ok('03/21' in twins[0], twins[0], 'the row lists the runways 03/21')
    val = c.js("[...document.querySelector('[data-module=fuel] select[data-k=\"p-dep-sid\"]').options].find(o => o.textContent.startsWith('TWIN 7A')).value")
    c.eq(val, 'LFRS.SID.TWIN7A.RW03.NONE', 'its value is the record that serves the chosen runway 03', what='TWIN 7A value')


# A new device joined by link + token (GitLab), its first synchronisation slow or failing: the screen must not wait for it without end
_GITLAB_PILOT = ("try { localStorage.setItem('githubData:frame', JSON.stringify({ provider: 'gitlab', repo: 'grp/data', api: 'https://gitlab.com/api/v4', "
                 "branch: 'main', token: 'glpat_test' })) } catch (e) {}")


@case('F84', 'A new device whose first synchronisation never answers or is refused: the step Route works, the wait is said in the screen',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='Simplification 1 Nov (a pilot enrolled the same day: « bloqué sur la page ROUTE, aucun bouton ne fonctionne »; measured: '
      'aerodb.aircraft() never answers while the GitLab API hangs, and Fuel awaited it before freeing the screen): the screen never waits '
      'for the aircraft registry; the current flight of a new device is awaited FLIGHT_WAIT_MS at most, the wait said above the step; the '
      'registry REFS_WAIT_MS at most, then « Base des aéronefs indisponible » instead of an endless « Chargement »; a refused '
      'synchronisation (403) frees the screen at once. The late line (lateFlight) has no case: in the suite the store answers a new '
      'device\'s first read of the flight at once')
def f84(c):
    held = []
    c.context.add_init_script(_GITLAB_PILOT)
    # the GitLab API never answers (a first tree that does not come): every request held until the end of the case
    c.context.route(re.compile(r'^https://gitlab\.com/'), lambda r: held.append(r))
    c.open('fuel', wait=False)
    c.until("!!document.querySelector('[data-module=fuel] [data-body]')", timeout=15000, what='Fuel is drawn')
    wait = norm(tx(F, 'waitFlight', c.lang))
    c.until("(w) => { const p = document.querySelector('[data-module=fuel] [data-wait]'); const b = document.querySelector('[data-module=fuel] [data-body]');"
            " return !!p && !p.hidden && p.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w || (!!b && !b.inert) }", wait,
            what='while the controls wait, the wait is said above the step')
    c.until("() => { const b = document.querySelector('[data-module=fuel] [data-body]'); return !!b && !b.inert }", timeout=8000,
            what='the screen is free a few seconds later, though the synchronisation never answered')
    loading = norm(tx(F, 'loadingRefs', c.lang))
    c.until("(w) => { const a = document.querySelector('[data-module=fuel] [data-acsel]'); return !!a && !!a.textContent.trim() && !a.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w) }",
            loading, timeout=15000, what='the aircraft registry that never comes ends the « loading » line (REFS_WAIT_MS)')
    to_step(c, 1)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')   # the fold of the points, closed on a new device
    c.page.fill(f'{FUEL} [data-k="addpt"]', 'TSTA 45 1')
    c.tap(f'{FUEL} [data-do="addpt"]')
    c.until("document.querySelectorAll('[data-module=fuel] [data-pts] [data-do=\"ptdel\"]').length === 1", what='a point added on the step Route')
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'TSTA TSTB')
    c.ok(c.js("document.querySelector('[data-module=fuel] [data-k=rtext]').value") == 'TSTA TSTB', '', 'the route field takes the text')
    c.ok(len(held) > 0, f'{len(held)} requests held', 'the synchronisation was asked and never answered')
    # a refused synchronisation (GitLab 403): nothing to wait for, the screen is free at once and nothing is said in it
    c.context.unroute(re.compile(r'^https://gitlab\.com/'))
    for r in held:
        try:
            r.abort()
        except Exception:
            pass
    c.context.route(re.compile(r'^https://gitlab\.com/'), lambda r: r.fulfill(status=403, content_type='application/json',
                                                                          body=json.dumps({'message': '403 Forbidden'})))
    c.open('fuel', wait=False, docs=[['device/level.json', {'level': 1}, 'cache']])
    c.until("() => { const b = document.querySelector('[data-module=fuel] [data-body]'); return !!b && !b.inert }", timeout=8000,
            what='a refused synchronisation frees the screen')
    to_step(c, 1)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')   # the fold of the points, closed on a new device
    c.page.fill(f'{FUEL} [data-k="addpt"]', 'TSTA 45 1')
    c.tap(f'{FUEL} [data-do="addpt"]')
    c.until("document.querySelectorAll('[data-module=fuel] [data-pts] [data-do=\"ptdel\"]').length === 1", what='a point added after a 403')


@case('F85', 'titleOf: the readable title of a pending document of Fuel, Aircraft and Missions (the Synchronisation card)', 'F',
      tags=('fuel', 'aircraft', 'missions'), designs=('standard',), screens=False,
      rule='Simplification 1 Nov: each module that owns a kind of document declares meta.titleOf(path, value) → [fr, en, de, es] or null '
      '(value absent or unreadable, another path), pure: Fuel « Vol LFBO → LFPO du 1/11 », Aircraft « Fiche H145 » / the fleet, '
      'Missions « A-001A Titre »')
def f85(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest')
    got = c.js("""async () => {
      const [F, A, M] = await Promise.all(['fuel', 'aircraft', 'missions'].map(m => import(`/modules/${m}/module.js`).then(x => x.meta.titleOf)));
      return {
        flight: F('pilot/ABC/current_flight.json', { route: { dep: 'XTST', arr: 'XTSU' }, planned_at: '2026-11-01T10:00:00Z' }),
        flightNoRoute: F('pilot/ABC/current_flight.json', { route: {} }),
        flightNull: F('pilot/ABC/current_flight.json', null),
        settings: F('pilot/ABC/fuel.json', {}),
        fuelOther: F('pilot/ABC/other.json', {}),
        sheet: A('aircraft/sheets/H145.json', { id: 'H145', name: 'H145' }),
        sheetNull: A('aircraft/sheets/H145.json', null),
        fleet: A('airline/fleet.json', { aircraft: [{}, {}] }),
        fleetBad: A('airline/fleet.json', { aircraft: 'x' }),
        mission: M('missions/X_TEST/X-002A/missionX-002A.yaml', 'mission: { id: X-002A, type: T }\\ntitle: Second essai\\n'),
        missionNoText: M('missions/X_TEST/X-002A/missionX-002A.yaml', null),
        missionOther: M('missions/mission_registry.yaml', 'missions: []')
      } }""")
    c.eq(got['flight'], ['Vol XTST → XTSU du 1/11', 'Flight XTST → XTSU of 1/11', 'Flug XTST → XTSU vom 1/11', 'Vuelo XTST → XTSU del 1/11'],
         'Fuel: the flight, its leg and day', what='flight')
    c.eq([got['flightNoRoute'], got['flightNull'], got['fuelOther']], [None, None, None], 'no leg, no value or another path: null', what='flight null')
    c.eq(got['settings'][0], 'Réglages du devis', 'the quote settings', what='settings')
    c.eq(got['sheet'][0], 'Fiche H145', 'Aircraft: a sheet', what='sheet')
    c.eq([got['sheetNull'], got['fleetBad']], [None, None], 'an absent or unreadable value: null', what='aircraft null')
    c.eq(got['fleet'][0], 'Flotte de la compagnie (2 appareils)', 'the fleet', what='fleet')
    c.eq(got['mission'], ['X-002A Second essai'] * 4, 'Missions: id and title', what='mission')
    c.eq([got['missionNoText'], got['missionOther']], [None, None], 'no text, or not a mission file: null', what='mission null')


# an invented aerodrome far from the seeded flight (more than 150 NM from LFML), in the LF zone of the published base
FAR_AD = {'aerodromes': [{'icao': 'LFZZ', 'name': 'LFZZ TEST', 'lat': 50.7, 'lon': 2.2, 'elev': 60}], 'cells': {'50': [[0, 4]]}}


def flight_doc(c):
    return c.doc('pilot/ABC/current_flight.json') or {}


@case('F86', 'A new pair of aerodromes clears the old route, procedures and OFP; a near one keeps it; « Nouveau vol » clears all but the aircraft',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='Simplification 1 Nov (the user: after LFST → LFBO, a KSET → KDOV kept the route of France): an aerodrome changed for one more than '
      '150 NM away, or both ends changed since the route was written, is a new pair: route (text, points), procedures and OFP cleared, said '
      'in one line; nearer, the aerodrome is replaced in the text; « Nouveau vol » (head of Préparer) asks, then empties the flight, the '
      'aircraft kept')
def f86(c):
    open_proc(c, procs=V2_PROCS, aero_extra=FAR_AD)
    # near (LFML → LFMT, about 70 NM): the route stays, the arrival replaced in its text
    set_icao(c, 'arr', 'LFMT')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d['route']['arr'] == 'LFMT', 'the near arrival is written')
    c.ok('NEPIX' in f['route']['text'] and f['route']['text'].split()[-1].startswith('LFMT'), f['route']['text'], 'a near aerodrome keeps the route')
    # far (LFMT → LFZZ, more than 150 NM): a new pair
    c.js('window.__notes = []')
    set_icao(c, 'arr', 'LFZZ')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and d['route']['arr'] == 'LFZZ' and 'NEPIX' not in (d['route'].get('text') or ''),
                    'the far arrival clears the old route', timeout=10000)
    c.eq([[p['id'] for p in f['route'].get('points') or [] if p['id'] not in ('LFRS', 'LFZZ')], f['route'].get('procedures'), f.get('ofp')],
         [[], None, None], 'no old point, no procedure, no OFP', what='new pair')
    want = norm(row(c, 'newPair').replace('{dep}', 'LFRS').replace('{arr}', 'LFZZ'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, what='said in one line')
    # « Nouveau vol »: the question, then everything empty but the aircraft
    c.tap(f'{FUEL} [data-do="newflight"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a flight with a route: the question first')
    c.tap('.f-modal [data-ok]')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not d['route'].get('dep') and not d['route'].get('arr'), 'the flight is emptied')
    c.eq([f['route'].get('text'), f['route'].get('points'), (f.get('level') or {}).get('ft'), (f.get('aircraft') or {}).get('type')],
         ['', [], None, 'C30J'], 'route, points and level empty; the aircraft kept', what='new flight')
    c.until(f"!!document.querySelector('{FUEL} section.fu-step[data-s=\"0\"]') && window.__t.shown(document.querySelector('{FUEL} section.fu-step[data-s=\"0\"]'))",
            what='back on the step Flight')
    # an empty flight: « Nouveau vol » asks nothing
    c.tap(f'{FUEL} [data-do="newflight"]')
    c.settle()
    c.eq(c.count('.f-modal'), 0, 'an empty flight: no question', what='no question')


@case('F87', 'A route name the base does not know but the chosen SID carries is resolved; an unknown name says when the zone has no points',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0012 (EIDW BEPA4E BEPAN: BEPAN unknown though the SID is read): the points of the chosen procedures are a fallback of the '
      'route text after aerodb; a name still unknown near an aerodrome around which the base has no published point says so (the zone '
      'is missing, not the point)')
def f87(c):
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    # NT102, the last point of the chosen SID NTS1A, is in no base: the SID gives its position
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'LFRS NTS1A NT102 NEPIX LFML')
    c.page.press(f'{FUEL} [data-k="rtext"]', 'Tab')
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and any(p['id'] == 'NT102' for p in d['route'].get('points') or []),
                    'NT102 is a point of the route', timeout=10000)
    nt = next(p for p in f['route']['points'] if p['id'] == 'NT102')
    c.eq([round(nt['lat'], 3), round(nt['lon'], 3)], [46.8, -1.35], 'at the position the SID gives', what='NT102')
    c.until("!(document.querySelector('[data-module=fuel] [data-unres]')?.textContent || '').trim()", what='no « Points inconnus » line')
    # a name nobody knows, around LFRS where the seeded base has no published point: the zone is said
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'LFRS QQQQQ NEPIX LFML')
    c.page.press(f'{FUEL} [data-k="rtext"]', 'Tab')
    tail = norm(row(c, 'noPointsNear').replace('{icao}', 'LFRS').replace('{st}', 'LF'))
    c.until("(w) => (document.querySelector('[data-module=fuel] [data-unres]')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)",
            tail.strip(), timeout=10000, what='QQQQQ unknown: the line says the zone around LFRS has no point')


# another writer of the current flight, as the Map is one (its route gesture): the frame's data layer itself, declared like a module
_OTHER_WRITER = """async ([path, text, pts]) => { const d = FrameData.adapter({ id: 'maps', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
  const cur = (await d.get(path)) || {};
  await d.put(path, { ...cur, route: { ...(cur.route || {}), text, points: pts }, by: 'maps', updated_at: new Date().toISOString() }); return true }"""


@case('F88', 'Two writers of the current flight: a level typed in Fuel never brings back the route another writer has just written', 'F',
      tags=('fuel',), designs=('standard',), screens=False,
      rule='SOG-0013 (an old plan comes back between screens) and R-F4: Fuel writes only the route and level keys it changed since it read '
      'the record (frame/lib/current_flight.js applyChanges); a route written meanwhile by another writer (the Map) stays; on the record, '
      'not on a copy')
def f88(c):
    c.open('fuel', flight=True, airfields=True)
    to_step(c, 0)
    path = 'pilot/ABC/current_flight.json'
    # the level typed in Fuel (its write waits 300 ms), and in that window another writer puts a new route on the record
    c.page.fill(f'{FUEL} [data-k="fl"]', '310')
    c.page.press(f'{FUEL} [data-k="fl"]', 'Tab')
    c.js(_OTHER_WRITER, [path, 'LFRS TSTZZ LFML', [{'id': 'LFRS', 'lat': 47.1569, 'lon': -1.6078}, {'id': 'TSTZZ', 'lat': 46.0, 'lon': 1.0},
                                                    {'id': 'LFML', 'lat': 43.4367, 'lon': 5.215}]])
    d = c.until_doc(path, lambda d: d and (d.get('level') or {}).get('ft') == 31000, 'the level typed in Fuel is written', timeout=8000)
    c.wait(800)
    d = c.doc(path)
    c.eq([p['id'] for p in d['route']['points']], ['LFRS', 'TSTZZ', 'LFML'], 'the route of the other writer stays (not the old one)', what='points')
    c.eq((d.get('level') or {}).get('ft'), 31000, 'the level of Fuel is written', what='level')


@case('F89', 'Side by side: a point level changed in Fuel is read again by the Map at once', 'F', tags=('fuel', 'maps'), designs=('standard',),
      screens=True, phone=False,
      rule='SOG-0004: in Fuel beside the Map, a level typed on a point of the step Route is written to the record and the Map reads the record '
      'again (its live view, maps:live), without a reload')
def f89(c):
    c.open('fuel?with=maps', flight=True, airfields=True)
    c.until("!!document.querySelector('.f-pane [data-module=maps]') || !!document.querySelector('[data-module=maps]')", timeout=15000,
            what='the Map beside Fuel')
    c.wait(1500)
    to_step(c, 1)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')
    before = c.js("performance.getEntriesByName('maps:live').length")
    sel = f'{FUEL} [data-pts] input[data-k="ptalt"][data-i="2"]'
    c.page.fill(sel, '310')
    c.page.press(sel, 'Tab')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and any(p.get('alt_ft') == 31000 for p in d['route']['points']),
                'the point level is written', timeout=8000)
    c.until(f"performance.getEntriesByName('maps:live').length > {before}", timeout=8000, what='the Map reads the flight again')
    # the plan level (step Flight): written, read again by the Map, shown in its header
    to_step(c, 0)
    before = c.js("performance.getEntriesByName('maps:live').length")
    c.page.fill(f'{FUEL} [data-k="fl"]', '330')
    c.page.press(f'{FUEL} [data-k="fl"]', 'Tab')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and (d.get('level') or {}).get('ft') == 33000, 'the plan level is written', timeout=8000)
    c.until(f"performance.getEntriesByName('maps:live').length > {before}", timeout=8000, what='the Map reads the new plan level')
    c.until("[...document.querySelectorAll('.f-pane, .f-pane *')].some(e => /FL ?330/.test(e.getAttribute?.('title') || '') || /FL ?330/.test(e.textContent || ''))", timeout=8000, what='the Map shows FL330')


def lfvf_docs():
    """LFVF (invented, the shape of LFPO's hand-read file): one STAR « VFF9E » per runway (02, 06, 07), status check, hand-read; six runways."""
    from fixtures.procedures import file as pfile, pt, rec
    stars = [rec('LFVF', 'STAR', 'VFF9E', [rw], [pt(1, 'VFF01', 49.2, 1.9), pt(2, 'VFF02', 48.9, 2.2)], status='check', kind_src='manual',
                 src_cycle='2026-10-29') for rw in ('02', '06', '07')]
    rws = [{'id': i, 'lat': 48.72, 'lon': 2.37, 'elev': 90, 'qfu': q} for i, q in (('02', 20), ('20', 200), ('06', 60), ('24', 240), ('07', 70), ('25', 250))]
    idx = {'schema': 1, 'aerodromes': {'LFML': {'STAR': 1, 'cycle': '2025-01-01', 'updated_at': '2026-10-29T16:53:00Z'},
                                       'LFVF': {'STAR': 3, 'cycle': '2026-10-29', 'updated_at': '2026-10-29T16:53:00Z'}}}
    return [['proc/manual/LFVF.json', pfile('LFVF', stars, rws, cy='2026-10-29'), 'reference'], ['proc/manual/index.json', idx, 'reference']]


@case('F90', 'A STAR published once per runway is offered for each of its runways, 07 included, and the choice is the record of that runway',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      rule='SOG-0021 (BOBSA 9E for LFPO 07 not offered though LFPO.STAR.BOBSA9E.RW07 is in the base): one row « VFF9E · 02/06/07 »; with the '
      'runway 07 chosen the row is offered and its value is the RW07 record')
def f90(c):
    c.open('fuel', docs=proc_docs() + proc_flight() + lfvf_docs(), airfields=True,
           aero_extra={'aerodromes': [{'icao': 'LFVF', 'name': 'LFVF TEST', 'lat': 48.72, 'lon': 2.37, 'elev': 90}], 'cells': {'48': [[0, 4]]}})
    set_icao(c, 'arr', 'LFVF')
    wait_rows(c, 'arr')
    c.until("(document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]')?.options.length || 0) > 2", timeout=15000,
            what='the runways of LFVF are listed')
    pick_proc(c, 'p-arr-rwy', '07')
    c.until("[...(document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]')?.options || [])].some(o => o.value.includes('VFF9E'))",
            timeout=10000, what='VFF9E is offered for the runway 07')
    val = c.js("[...document.querySelector('[data-module=fuel] select[data-k=\"p-arr-star\"]').options].find(o => o.value.includes('VFF9E')).value")
    c.eq(val, 'LFVF.STAR.VFF9E.RW07.NONE', 'the row is the record of the runway 07', what='value')
    pick_proc(c, 'p-arr-star', val)
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('star') == 'LFVF.STAR.VFF9E.RW07.NONE', 'the RW07 record is written')
    # the other order (« ou l'associe à une autre piste »): the STAR first, without a runway (its first record, RW02, sets the runway 02),
    # then the runway 07: the record of the runway 07 replaces it, no conflict left
    pick_proc(c, 'p-arr-rwy', '')
    pick_proc(c, 'p-arr-star', '')
    cf_doc(c, lambda d: not (procs_of(d, 'arr') or {}).get('star'), 'the STAR is cleared')
    c.settle()
    pick_proc(c, 'p-arr-star', 'LFVF.STAR.VFF9E.RW02.NONE')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '02', 'the STAR alone sets its first runway, 02')
    c.settle()
    pick_proc(c, 'p-arr-rwy', '07')
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '07', 'the runway 07 is written')
    c.eq(procs_of(d, 'arr').get('star'), 'LFVF.STAR.VFF9E.RW07.NONE', 'the STAR follows the runway: the record of the 07', what='star after rwy')


@case('F91', 'Points at a level, the plan at another: said beside the level, with the climb and cruise it makes, and one gesture to align',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0020 (« 5 mn de vol » on EIDW–LFPO: points at FL180, plan higher, the climb eating the route): one line beside the level, '
      '« Points à FL180, plan à FL320 : m:ss de montée pour m:ss de croisière », and « Aligner les points sur le plan », nothing modal')
def f91(c):
    docs = flight_docs()
    f = docs[1][1]
    f['level'] = {'ft': 32000}
    for p in f['route']['points'][1:-1]:
        p['alt_ft'] = 18000
    f['route']['text'] = 'LFRS LUGEN/F180 NEPIX/F180 LFML'   # the levels written in the route, as the user's
    c.open('fuel', docs=docs, airfields=True)
    to_step(c, 0)
    c.until("(() => { const p = document.querySelector('[data-module=fuel] [data-lvlmix]'); return !!p && !p.hidden })()", timeout=10000,
            what='the line beside the level')
    line = norm(c.text(f'{FUEL} [data-lvlmix]') or '')
    c.ok(line.startswith(norm(row(c, 'lvlMix').replace('{p}', 'FL180').replace('{l}', 'FL320'))), line, 'points at FL180, plan at FL320')
    c.tap(f'{FUEL} [data-do="alignlvl"]')
    d = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not any(p.get('alt_ft') for p in d['route']['points']),
                    'the point levels are removed', timeout=8000)
    c.until("document.querySelector('[data-module=fuel] [data-lvlmix]').hidden", what='the line goes away')


@case('F92', 'A level forced on a point of the chosen STAR: written, the vertical path follows it; above the ceiling or too steep: said, not set',
      'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0003 (« forcer un spath » on a point of NARAK 8S; level only, a published speed comes from the data): each point of a chosen '
      'procedure has a level field; the level is written (route.constraints) and the vertical path passes the point at it; a level the '
      'sheet cannot reach from or to the aerodrome is said and not set')
def f92(c):
    open_proc(c, procs=V2_PROCS)
    d0 = cf_doc(c, lambda d: bool((d.get('profile') or {}).get('path')), 'a vertical path along the procedures', timeout=15000)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')
    c.until("!!document.querySelector('[data-module=fuel] .fu-ptgrp[data-kind=star]')", timeout=10000, what='the STAR group of the points')
    c.js("document.querySelector('[data-module=fuel] .fu-ptgrp[data-kind=star]').open = true")
    sel = f'{FUEL} input[data-k="pcon"][data-fix="MEN01"]'
    c.page.fill(sel, '90')
    c.page.press(sel, 'Tab')
    d = cf_doc(c, lambda d: ((d.get('route') or {}).get('constraints') or {}).get('MEN01') == 9000, 'the forced level is written')
    d = cf_doc(c, lambda d: (d.get('profile') or {}).get('path') != d0['profile']['path'], 'the vertical path follows the forced level')
    # too steep: FL300 on the last point of the STAR, a few NM from the aerodrome
    c.js('window.__notes = []')
    sel3 = f'{FUEL} input[data-k="pcon"][data-fix="MEN03"]'
    c.page.fill(sel3, '300')
    c.page.press(sel3, 'Tab')
    head = norm(tx(F, 'pconSlope', c.lang).split('{fl}')[0].replace('{id}', 'MEN03'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().startsWith(w))", head, what='too steep: said')
    c.wait(600)
    c.ok('MEN03' not in (((c.doc('pilot/ABC/current_flight.json') or {}).get('route') or {}).get('constraints') or {}), '', 'and not set')
    c.eq(c.js(f"document.querySelector('{sel3}').value"), '', 'the field is emptied', what='field')


def pts_listed(c):
    """The identifiers of the list of points (step Route), in order, the unresolved names included."""
    return c.js("[...document.querySelectorAll('[data-module=fuel] [data-pts] > .fu-pt .fu-ptid b')].map(b => b.textContent)")


@case('F93', 'An aerodrome is never a point of the route: the old departure left at the head of the text is not listed, not routed, not written back',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0033 (« l’ADEP reste dans la liste des points ») and SOG-0034 (« EIDW revient » ; Auto: « aucune route entre EIDW et LFLL » '
      'with LFPO as ADEP): the text of the route, as another writer can leave it, still starts with the old departure LFRS while the flight '
      'goes from LFZZ: the list starts with LFZZ then the first point of the route; a STAR choice, Auto and the text never bring LFRS back')
def f93(c):
    docs = proc_docs() + proc_flight(V2_PROCS)
    f = next(d for d in docs if d[0] == 'pilot/ABC/current_flight.json')[1]
    f['route'].update({'dep': 'LFZZ', 'procedures': None})   # the departure changed, the text and the points still those of LFRS
    c.open('fuel', docs=docs, airfields=True, aero_extra=FAR_AD)
    to_step(c, 1)
    c.until("(() => { const b = document.querySelector('[data-module=fuel] [data-pts] .fu-ptid b'); return !!b && b.textContent === 'LFZZ' })()",
            timeout=10000, what='the list starts with the departure of the flight')
    c.settle()
    c.eq(pts_listed(c)[:2], ['LFZZ', 'LUGEN'], 'then the first point of the route: the old departure is not a point', what='list')
    d = cf_doc(c, lambda d: 'LFRS' not in [p['id'] for p in d['route'].get('points') or []], 'LFRS is not a point of the record', timeout=10000)
    # a STAR chosen: the text written with it never brings LFRS back
    wait_rows(c, 'arr')
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE')
    d = cf_doc(c, lambda d: ((d['route'].get('procedures') or {}).get('arr') or {}).get('star'), 'the STAR is written')
    c.wait(800)
    d = c.doc('pilot/ABC/current_flight.json')
    c.ok('LFRS' not in (d['route'].get('text') or '').split(), d['route'].get('text'), 'the text does not bring LFRS back')
    # Auto: no leg from LFRS
    c.js('window.__notes = []')
    c.tap(f'{FUEL} [data-do="rauto"]')
    c.wait(2500)
    notes = c.js('window.__notes || []')
    c.ok(not any('LFRS' in n for n in notes), notes, 'Auto routes from the departure of the flight, never from LFRS')
    c.eq(pts_listed(c)[0], 'LFZZ', 'the list still starts with LFZZ', what='first')


@case('F94', 'The list of points is a view of the route: a name without a position is listed at its place, with its reason, never left out',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0035 (« bien que la route comporte des points, ils n’apparaissent pas dans la liste ») : every word of the route that is a '
      'point is a row, in the order of the text; one the base does not know says « inconnu de la base » (or that the zone around the '
      'aerodrome has no published point)')
def f94(c):
    c.open('fuel', flight=True, airfields=True)
    to_step(c, 1)
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS LUGEN QQQQQ NEPIX LFML')
    c.page.locator(rt).blur()
    c.until("!!document.querySelector('[data-module=fuel] [data-pts] [data-unres-pt=QQQQQ]')", timeout=10000, what='QQQQQ is a row of the list')
    c.eq(pts_listed(c), ['LFRS', 'LUGEN', 'QQQQQ', 'NEPIX', 'LFML'], 'every point at its place, the unknown one included', what='list')
    why = norm(c.text(f'{FUEL} [data-unres-pt="QQQQQ"] small') or '')
    c.ok(why == norm(row(c, 'ptUnres')) or why.startswith(norm(row(c, 'ptUnresZone').split('{icao}')[0])), why, 'with its reason')
    c.eq(norm(c.text(f'{FUEL} [data-ptsn]') or ''), norm(row(c, 'ptsN').replace('{n}', '5')), 'counted', what='count')


# a stand-in for aerodb's chartUrl (SOG-0045, owned by AeroDB): an invented address (.invalid, never fetched) for the departure's choices
# (LFRS: its runway, its SID), null for the arrival's (LFML); every call kept in window.__chartCalls
_CHART_STUB = """(() => { let ab; window.__chartCalls = [];
  const patch = (A) => { A.chartUrl = async (p) => { window.__chartCalls.push({ icao: p.icao, kind: p.kind, id: p.id, runways: p.runways || null });
    return p.icao === 'LFRS' ? 'https://charts.invalid/' + p.id + '.pdf' : null }; return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__chart) { const o = v.create; v.__chart = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()"""
_SLOT_JS = """(s) => { const e = document.querySelector('[data-module=fuel] [data-proc=' + s + '] [data-source-slot]'); return e ? {
    charts: !!e.querySelector('[data-charts]'),
    chart: [...e.querySelectorAll('[data-chart]')].map(a => [a.dataset.chart, a.getAttribute('href'), a.target, a.rel, a.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()]) } : null }"""


@case('F95', '« Carte » per chosen procedure: the chart aerodb gives for the runway, SID, STAR or approach; else the aerodrome page; nothing new without the function',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0045, V3 spec 10.39 (user, 6 Nov: « accès direct à la carte de la procédure … via l\'onglet procédures ou en vol »): the address is '
      'aerodb.chartUrl(proc) alone, feature-detected; one link per chosen runway / procedure it answers, a new tab without opener; the aerodrome '
      'page of SOG-0031 for a choice it does not know (null); no function: the line as before; the same links on the in-flight step')
def f95(c):
    # 1. aerodb without chartUrl (today): the aerodrome page alone, no « Carte »
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    c.until("(s) => !!document.querySelector('[data-module=fuel] [data-proc=' + s + '] [data-source-slot] [data-charts]')", 'dep', what='the aerodrome page of LFRS')
    c.eq(c.js(_SLOT_JS, 'dep'), {'charts': True, 'chart': []}, 'no function: the aerodrome page alone', what='departure without chartUrl')
    # 2. a chartUrl that knows the departure's charts and none of the arrival's
    c.page.add_init_script(_CHART_STUB)
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    want = [['RWY', 'https://charts.invalid/LFRS.RWY.03.pdf', '_blank', 'noopener noreferrer', norm(tx(PT, 'procChart', c.lang).replace('{k}', '03'))],
            ['SID', 'https://charts.invalid/LFRS.SID.NTS1A.RW03.NONE.pdf', '_blank', 'noopener noreferrer', norm(tx(PT, 'procChart', c.lang).replace('{k}', 'SID'))]]
    c.until("(s) => document.querySelectorAll('[data-module=fuel] [data-proc=' + s + '] [data-source-slot] [data-chart]').length === 2", 'dep',
            what='the two charts of the departure')
    c.eq(c.js(_SLOT_JS, 'dep'), {'charts': False, 'chart': want}, 'one « Carte » per choice, its address as aerodb gives it; every choice has its chart: no aerodrome page',
         what='departure with chartUrl')
    calls = c.js('window.__chartCalls')
    c.ok({'icao': 'LFRS', 'kind': 'RWY', 'id': 'LFRS.RWY.03', 'runways': ['03']} in calls, calls, 'the runway asked as { icao, kind RWY, id, runways }')
    c.ok(any(x['id'] == 'LFRS.SID.NTS1A.RW03.NONE' and x['kind'] == 'SID' and x['icao'] == 'LFRS' for x in calls), calls, 'the SID asked with its record')
    unfold(c, 'arr')
    c.until("(s) => { const e = document.querySelector('[data-module=fuel] [data-proc=' + s + '] [data-source-slot]'); return !!e && !!e.querySelector('[data-charts]') }",
            'arr', what='the aerodrome page of LFML')
    c.until("() => window.__chartCalls.filter(x => x.icao === 'LFML').length >= 3", what='the arrival runway, STAR and approach were asked')
    c.settle()
    c.eq(c.js(_SLOT_JS, 'arr'), {'charts': True, 'chart': []}, 'chartUrl answers null: the aerodrome page, no « Carte »', what='arrival, chartUrl null')
    # 3. in flight: the same links on the Departure step
    open_proc(c, procs=V2_PROCS, started=True)
    c.tap(f'{FUEL} .fu-steps button[data-step="4"]')
    c.until("!!document.querySelector('[data-module=fuel] [data-block=procs]:not(.fu-hide) [data-proc=dep]')", timeout=10000, what='the procedures on the in-flight step')
    unfold(c, 'dep')
    c.until("document.querySelectorAll('[data-module=fuel] [data-procbox=start] [data-proc=dep] [data-source-slot] [data-chart]').length === 2",
            what='the two charts of the departure in flight')
    c.eq(c.js(_SLOT_JS, 'dep'), {'charts': False, 'chart': want}, 'in flight: the same « Carte » links', what='in-flight departure')


def _curve_sheet(alts):
    """An invented C30J sheet whose cruise comes from its RPM table at 2400 rpm: with alts, two curves (4000 ft: 38 / 46 kg/h at 2300 /
    2500 rpm; 8000 ft: 34 / 40), else the 4000 ft rows without altitude."""
    rows = [{'rpm': 2300, 'altFt': 4000, 'fuelFlowPerHour': 38}, {'rpm': 2500, 'altFt': 4000, 'fuelFlowPerHour': 46}]
    if alts:
        rows += [{'rpm': 2300, 'altFt': 8000, 'fuelFlowPerHour': 34}, {'rpm': 2500, 'altFt': 8000, 'fuelFlowPerHour': 40}]
    else:
        rows = [dict(r, altFt=None) for r in rows]
    return {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
            'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'rpmNominal': 2400}, 'rpmFuelCurve': rows}


def _curve_open(c, alts):
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['level'] = {'ft': 6000}
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', _curve_sheet(alts), 'document']])
    wait_quote(c)
    c.settle()
    return norm(c.js("document.querySelector('[data-module=fuel] [data-src]').textContent"))


@case('F96', '« Source » of the cruise says which rows of the RPM table it read: the two rpm around the cruise rpm, the two altitude curves around the level',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0028, V3 spec 10.37 C: between two altitudes the computation interpolates on the altitude, within a curve on the rpm (FlightPerfModel.mapAt, '
      'unchanged), and « Source » says the two points used; a sheet whose table has no altitude reads as before, the rpm rows alone said')
def f96(c):
    kind = tx(F, 'kinds', c.lang) if False else None  # (the texts are read from module.js below)
    got = _curve_open(c, True)
    rpm2 = norm(tx(F, 'usedRpm', c.lang).replace('{r}', '2400').replace('{a}', '2300').replace('{b}', '2500'))
    alt2 = norm(tx(F, 'usedAlt', c.lang).replace('{a}', '4000').replace('{b}', '8000'))
    c.ok(got.endswith(f'({rpm2}, {alt2})'), got, 'the level 6000 ft between the curves of 4000 and 8000 ft, 2400 rpm between 2300 and 2500 rpm')
    got = _curve_open(c, False)
    c.ok(got.endswith(f'({rpm2})'), got, 'a table without altitude: the rpm rows alone, no curve said')


@case('F97', 'The sheet\'s cruise flow is used when its RPM table does not frame the cruise rpm: a single row, or another power reference, is never stretched',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0053 (user, 6 Nov: « le carbu et les courbes que je mets à jour sont toujours mauvais, les calculs de vol toujours mauvais »; '
      'the S210 sheet: cruise 7300 lb/h at 7250 rpm typed, one table row 6700 rpm → 11500 lb/h, the quote took 11500): the table is read '
      'only when two rows frame the rpm or one is at it; else the cruise flow of the sheet')
def f97(c):
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'lb', 'usableFuel': 40000,
             'cruise': {'tasKt': 330, 'fuelFlowPerHour': 7300, 'rpmNominal': 7250},
             'rpmFuelCurve': [{'rpm': 3500, 'altFt': None, 'fuelFlowPerHour': None}, {'rpm': 6700, 'altFt': None, 'fuelFlowPerHour': 11500},
                              {'rpm': 8000, 'altFt': None, 'fuelFlowPerHour': None}]}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', sheet, 'document']])
    wait_quote(c)
    c.settle()
    got = norm(c.js("document.querySelector('[data-module=fuel] [data-src]').textContent"))
    want = norm(tx(F, 'source', c.lang).replace('{s}', tx(F, 'profile', c.lang, after='kinds: {')))
    c.eq(got, want, 'the typed cruise flow of the sheet, not the single table row stretched to 7250 rpm', what='cruise source')


@case('F98', 'Level windows bench: a Fuel Phase Monitor journal read, its steady cruise windows grouped per altitude and rpm, compared with the curve of the same altitude',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False,
      rule='SOG-0052, V3 spec 10.37 A and C (« Proposer depuis les mesures », step 1): modules/stats/phases.js, pure, ported from the FuelDashboard '
      '(parseCSV, eligible, the weighted median); an invented journal, never a file of the user; the bench passes')
def f98(c):
    c.page.goto(f'{c.base}/modules/stats/test/phases.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'modules/stats/test/phases.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}", 'every check of the bench passes')


@case('F99', '« Débit de ce vol » is typed in the unit of the quote and says it; kept in kg/h, converted by the frame rules',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0059 (user, 6 Nov: « la case débit de ce vol prend sa valeur en kg/h, ou en unité sélectionnée ? »; his settings: unit lb, '
      'an entry 6000 read as kg/h): the field is in the unit chosen (lb/h here), its label says it; 7300 lb/h typed = 3311.2 kg/h kept')
def f99(c):
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'lb', 'usableFuel': 40000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 5000}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    docs.append(['pilot/ABC/fuel.json', {'schema': 1, 'displayUnit': 'lb', 'entries': {}}, 'document'])
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', sheet, 'document']])
    wait_quote(c)
    to_step(c, 3)
    c.js("document.querySelector('[data-module=fuel] details[data-fold=settings]').open = true")
    sel = '[data-module=fuel] [data-entrybox] input[data-k=entry]'
    c.until(f"!!document.querySelector('{sel}')", what='the field « débit de ce vol »')
    lab = norm(c.js(f"document.querySelector('{sel}').closest('label').textContent"))
    c.ok('(lb/h' in lab, lab, 'the label says lb/h, the unit of the quote')
    c.page.fill(sel, '7300')
    c.page.locator(sel).blur()
    d = c.until_doc('pilot/ABC/fuel.json', lambda d: d and (d.get('entries') or {}).get('C30J'), 'the entry is kept')
    c.eq(round(d['entries']['C30J'], 1), 3311.2, '7300 lb/h kept as 3311.2 kg/h (frame/lib/fuel_units.js)', what='kept')


@case('F100', '« Réglages du devis · lb/h » heads the Result step, folded, the fuel unit of the quote in its title',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0059 (2) (user, 6 Nov: « le bloc réglage du devis est pertinent, mais invisible … tellement caché dans le bas de la 5e page »): '
      'the first fold of the step, closed at opening, « Réglages du devis · lb/h »; the step keeps its six cards (rule 13)')
def f100(c):
    docs = flight_docs() + [['pilot/ABC/fuel.json', {'schema': 1, 'displayUnit': 'lb', 'entries': {}}, 'document']]
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 3)
    r = c.js("""() => { const s = document.querySelector('[data-module=fuel] section.fu-step[data-s="3"]'), first = s.firstElementChild;
        return { fold: first?.dataset.fold || null, open: !!first?.open, title: (first?.querySelector('summary')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim(),
                 cards: s.querySelectorAll(':scope > .f-card').length } }""")
    want = norm(tx(F, 'settings', c.lang)) + ' · lb/h'
    c.eq([r['fold'], r['open'], norm(r['title']), r['cards']], ['settings', False, want, 6], 'first, folded, the unit in its title, six cards', what='settings fold')


@case('F101', 'The aircraft of the quote is said in clear at the head of the result bar, « FA50 · estimation du type »; a tap opens the aircraft choice',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0060 (user, 9 Nov: « apparemment, j\'ai planifié un vol en F50 ? Où est-ce écrit !? »): type and registration on the bar seen at '
      'every step, the type estimate said; a tap goes to the step Flight with the aircraft search open and focused')
def f101(c):
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'FA50', 'registration': 'F-GXXX', 'sheetId': '', 'name': 'FA50'}
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 2)
    line = f'{FUEL} .fu-result [data-do="acgo"]'
    c.until(f"!!document.querySelector('{line}')", what='the aircraft line of the result bar')
    want = norm(f"FA50 · F-GXXX · {tx(F, 'estimate', c.lang, after='via: {')}")
    c.eq(norm(c.text(line)), want, 'type, registration and the estimate said', what='aircraft line')
    c.tap(line)
    c.until(f"window.__t.shown(document.querySelector('{FUEL} section.fu-step[data-s=\"0\"]')) && !document.querySelector('{FUEL} [data-acpanel]').classList.contains('fu-hide')",
            what='the step Flight with the aircraft search open')
    c.until(f"document.activeElement === document.querySelector('{FUEL} [data-k=acsearch]')", what='the search field has the focus')


@case('F102', 'The TAS of the RPM table rows is read like their flow: two rows framing the cruise rpm at the level\'s curve; else the sheet\'s cruise TAS',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False,
      rule='SOG-0028 (4): tasKt optional per row of rpmFuelCurve, read when present (tableAt), else cruise.tasKt; the performance model takes it (modelSheet)')
def f102(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    r = c.js("""() => { const M = window.FuelModel, mk = rows => M.normalizeSheet({ id: 'X', unit: 'kg', cruise: { tasKt: 140, fuelFlowPerHour: 40, rpmNominal: 2400 }, rpmFuelCurve: rows });
        const two = mk([{ rpm: 2300, altFt: 4000, fuelFlowPerHour: 38, tasKt: 150 }, { rpm: 2500, altFt: 4000, fuelFlowPerHour: 46, tasKt: 170 }]),
          one = mk([{ rpm: 2300, altFt: 4000, fuelFlowPerHour: 38, tasKt: 150 }, { rpm: 2500, altFt: 4000, fuelFlowPerHour: 46 }]),
          a = M.cruiseSource({ sheet: two, altFt: 4000 }), b = M.cruiseSource({ sheet: one, altFt: 4000 });
        return [Math.round(a.tas), a.tasKind, Math.round(M.modelSheet(two, a).cruise.tasKt), Math.round(b.tas), b.tasKind] }""")
    c.eq(r, [160, 'map', 160, 140, 'profile'], 'framed: 160 kt from the rows, taken by the model; a single row with a TAS: the sheet\'s 140 kt', what='TAS')


@case('F103', 'The Sheets view of Fuel has the aircraft search of the step Flight: same search, same rows; a row picked is the flight\'s aircraft',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0060 (b) (user, 9 Nov: « s\'il faut passer par le bouton fiches, il faut le même moteur de recherche que dans les paramètres »): '
      'the field « Rechercher un appareil » (aircraft().search, the rows of acResults) on the Sheets view; a pick writes the aircraft like the step Flight')
def f103(c):
    ec25 = {'id': 'EC25', 'name': 'EC25', 'icao': 'EC25', 'usableFuel': 2000, 'cruise': {'tasKt': 141, 'fuelFlowPerHour': 650}}
    c25 = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000}}
    c.open('fuel?view=sheets', docs=flight_docs() + [['aircraft/sheets/EC25.json', ec25, 'document'], ['aircraft/sheets/C30J.json', c25, 'document']])
    field = f'{FUEL} [data-sheets]'
    c.until(f"!!document.querySelector('{FUEL} input[data-k=acsearch]') && !!document.querySelector('{field}')", what='the search field on the Sheets view')
    c.page.fill(f'{FUEL} input[data-k=acsearch]', 'EC25')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-acres] [data-pick]')].some(b => b.textContent.includes('EC25'))", what='the search lists EC25')
    c.tap(f"{FUEL} [data-acres] [data-pick]:has-text('EC25')")
    cf_doc(c, lambda d: ((d.get('aircraft') or {}).get('type') == 'EC25'), 'the flight takes the aircraft picked')


@case('F104', 'The climb instructions say the sheet\'s climb rpm in their title, « Consignes de montée · Montée : 8000 rpm »; nothing without it',
      'F', tags=('fuel', 'aircraft'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0061 (user, 9 Nov: « au moins pour la caravelle : les gaz impliquent directement les RPMs. « full » = 8000+. on a les yeux rivés sur les '
      'rpms »): the target is climb.rpmNominal of the sheet, never invented; read in the fold\'s title without opening it')
def f104(c):
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000},
             'climb': {'rpmNominal': 8000, 'fuelFlowPerHour': 2600, 'rateFpm': 1500, 'iasKt': 220}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', sheet, 'document']])
    wait_quote(c)
    want = norm(f"{tx(F, 'climbGuide', c.lang)} · {tx(F, 'climbRpm', c.lang).replace('{r}', '8000')}")
    c.until("(w) => (document.querySelector('[data-module=fuel] details[data-fold=climb] > summary')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w",
            want, what='the climb rpm of the sheet in the fold\'s title')


@case('F105', 'Weather card and quote settings: one grid, label left in a fixed column, value right; a long label wraps without moving the fields',
      'F', tags=('fuel', 'layout'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0058 (user, 6 Nov: « carbu et opération : les cases ne sont pas alignées (multiples longueurs de texte) »; the ergonomics session\'s '
      'criteria): the same two-column grid on both cards, checked at 390 and 1280: every field starts at the same distance from its label\'s left, '
      'centred on its label, inside the card')
def f105(c):
    c.open('fuel', flight=True)
    wait_quote(c)
    geo = """() => [...document.querySelectorAll('[data-module=fuel] .fu-pairs > label.f-field')].filter(l => l.offsetParent).map(l => {
        const r = l.getBoundingClientRect(), f = l.querySelector('input, select').getBoundingClientRect();
        return [Math.round(f.left - r.left), Math.round(Math.abs((f.top + f.bottom) / 2 - (r.top + r.bottom) / 2)), Math.round(r.right - f.right)] })"""
    seen = []
    for n in (2, 3):
        to_step(c, n)
        if n == 3:
            c.js("document.querySelector('[data-module=fuel] details[data-fold=settings]').open = true")
            c.settle()
        seen += c.js(geo)
    c.ok(len(seen) >= 10, seen, 'the fields of both cards are measured')
    c.eq(sorted({x[0] for x in seen}), [seen[0][0]], 'every field at the same distance from its label\'s left (one grid on both cards)', what='offsets')
    c.ok(all(x[1] <= 2 for x in seen), seen, 'every field centred on its label (a wrapped label does not push it down)')
    c.ok(all(x[2] >= -1 for x in seen), seen, 'no field beyond its row')

# § 10.38 step 1: two invented airlines of one repository (aaa: an EC25, bbb: a C-130J), the index the migration writes
def airline_docs(index=True):
    """The documents of two airlines (never the user's): index, settings and fleet of aaa and bbb; index=False: the airline of today only."""
    if not index:
        return []
    return [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-AAAA', 'type': 'EC25'}]}, 'document'],
            ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air'}, 'document'],
            ['airline/bbb/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-BBBB', 'type': 'C30J'}]}, 'document']]


def set_airline(c, code):
    """Chooses the current airline as Réglages › Compagnie does (FrameData.setAirline: the event frame-data-airline)."""
    c.eq(c.js("(code) => window.FrameData.setAirline(code)", code), True, f'the airline {code} is chosen', what='setAirline')


@case('F106', 'Sheets view and aircraft choice follow the current airline\'s fleet: its aircraft first, the other sheets folded; without an index, as before',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.38 step 1 (FrameData.airline().fleet): the sheets of the fleet\'s types first (« Flotte de Alpha Air »), the others in « Autres fiches (n) »; '
      'the fleet\'s registrations first in the search; a change of airline (frame-data-airline) redraws; no index: the list of today')
def f106(c):
    ec25 = {'id': 'EC25', 'name': 'EC25', 'icao': 'EC25', 'usableFuel': 2000, 'cruise': {'tasKt': 141, 'fuelFlowPerHour': 650}}
    c25 = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000}}
    sheets = [['aircraft/sheets/EC25.json', ec25, 'document'], ['aircraft/sheets/C30J.json', c25, 'document']]
    view = """() => ({ head: (document.querySelector('[data-module=fuel] [data-cosheets]')?.textContent || '').trim(),
        ours: [...document.querySelectorAll('[data-module=fuel] [data-sheets] > [data-id]')].map(e => e.dataset.id),
        others: [...document.querySelectorAll('[data-module=fuel] [data-othersheets] [data-id]')].map(e => e.dataset.id),
        folded: !document.querySelector('[data-module=fuel] [data-othersheets]')?.open })"""
    c.open('fuel?view=sheets', docs=flight_docs() + sheets + airline_docs())
    c.until("!!document.querySelector('[data-module=fuel] [data-cosheets]')", what='the fleet of the current airline heads the sheets')
    c.eq(c.js(view), {'head': norm(tx(F, 'coSheets', c.lang).replace('{a}', 'Alpha Air')), 'ours': ['EC25'], 'others': ['C30J'], 'folded': True},
         'Alpha Air: its EC25 first, the C-130J in the folded « Autres fiches »', what='aaa')
    c.page.fill(f'{FUEL} input[data-k=acsearch]', 'F-')
    c.until(f"(document.querySelector('{FUEL} [data-acres] [data-pick]')?.textContent || '').includes('F-AAAA')", what='the airline\'s registration first in the search')
    set_airline(c, 'bbb')
    c.until("(document.querySelector('[data-module=fuel] [data-sheets] > [data-id]')?.dataset.id) === 'C30J'", what='Bravo Air: its C-130J first')
    c.eq(c.js(view)['others'], ['EC25'], 'the EC25 among the other sheets', what='bbb')
    # without an index (before the migration) the list is the one of today: F79 and F103, which seed no index


@case('F107', '« Auto » level: the semicircular level that burns the least on the route, « FL… (auto) » with the trip time; a typed level holds; a change of route or aircraft recomputes',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0056, V3 spec 10.37 D (user, 6 Nov: « on doit saisir un niveau, mais on ne le connaîtra que plus tard. mettre un bouton auto »): a loop over '
      'the quote\'s level series, odd thousands eastbound, FL030 to the sheet ceiling, ties at 2 % to the lower; typing turns (auto) off; the aircraft changes → again')
def f107(c):
    hi = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
          'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}}
    lo = {'id': 'XLOW', 'name': 'XLOW', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
          'cruise': {'tasKt': 300, 'fuelFlowPerHour': 2200, 'ceilingFt': 9000}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', hi, 'document'], ['aircraft/sheets/XLOW.json', lo, 'document']], airfields=True)
    wait_quote(c)
    to_step(c, 0)
    fl = f'{FUEL} input[data-k="fl"]'
    c.tap(f'{FUEL} [data-do="levelauto"]')
    c.until(f"() => (document.querySelector('{FUEL} [data-lvlauto]')?.textContent || '').includes('auto')", what='« auto · 1:28 » said under the field')
    auto = int(c.js(f"document.querySelector('{fl}').value"))
    c.ok(auto % 10 == 0 and auto // 10 % 2 == 1 and 30 <= auto <= 250, auto, 'an odd thousand (eastbound, track 125°) between FL030 and the ceiling FL250')
    d = cf_doc(c, lambda d: (d.get('level') or {}).get('auto') is True and (d.get('quote') or {}).get('levelFt') == auto * 100, 'the auto level written with its quote')
    trip_auto = d['quote']['trip']
    # a typed level holds and turns (auto) off; it burns more
    c.page.fill(fl, '100')
    c.page.locator(fl).blur()
    d = cf_doc(c, lambda d: (d.get('quote') or {}).get('levelFt') == 10000, 'the quote at FL100')
    c.ok(not (d.get('level') or {}).get('auto'), d.get('level'), 'typing turns (auto) off')
    c.ok(d['quote']['trip'] > trip_auto, f"FL100 {d['quote']['trip']} vs auto {trip_auto}", 'FL100 burns more than the auto level')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-lvlauto]').textContent.trim()"), '', 'no « (auto) » for a typed level', what='typed')
    # Auto again, then another route (shorter, same ends): the quote follows it at an auto level, (auto) kept
    c.tap(f'{FUEL} [data-do="levelauto"]')
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(auto), what='Auto again: the auto level')
    nm0 = cf_doc(c, lambda d: (d.get('level') or {}).get('auto') is True, 'the auto flight')['route'].get('distanceNm')
    to_step(c, 1)
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS NEPIX LFML')
    c.page.locator(rt).blur()
    d = cf_doc(c, lambda d: (d.get('route') or {}).get('distanceNm') not in (None, nm0) and (d.get('level') or {}).get('auto') is True
               and (d.get('quote') or {}).get('levelFt') == (d.get('level') or {}).get('ft'), 'another route: the quote recomputed at an auto level, (auto) kept', timeout=10000)
    c.eq(d['level']['ft'] // 1000 % 2, 1, 'the auto level of the new route: an odd thousand (eastbound)', what='route change')
    to_step(c, 0)
    # then another aircraft (ceiling 9000 ft): recomputed
    c.tap(f'{FUEL} [data-view="sheets"]')
    c.until(f"!!document.querySelector('{FUEL} [data-id=\"XLOW\"] [data-do=use]')", what='the Sheets view')
    c.tap(f'{FUEL} [data-id="XLOW"] [data-do="use"]')
    c.until(f"!!document.querySelector('{FUEL} [data-view=\"plan\"]')", what='the plan button')
    if not c.js(f"!!document.querySelector('{fl}')"):
        c.tap(f'{FUEL} [data-view="plan"]')
    d = cf_doc(c, lambda d: (d.get('aircraft') or {}).get('sheetId') == 'XLOW' and (d.get('level') or {}).get('auto') is True
               and 0 < ((d.get('level') or {}).get('ft') or 0) <= 9000, 'another aircraft, ceiling 9000 ft: the auto level recomputed', timeout=10000)
    c.eq(d['level']['ft'] // 1000 % 2, 1, 'still an odd thousand', what='recomputed')


@case('F108', 'The fuel unit is said on the result bar\'s context line, after the aircraft (« … · lb · lb/h · Bloc · FL270 »); it follows the unit chosen',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0074 (user, 9 Nov: « afficher [l\'unité] globalement sur le header ? »; challenged: the unit is the module\'s, not the frame\'s): the sticky '
      'line of the module says it, never the frame\'s header')
def f108(c):
    docs = flight_docs() + [['pilot/ABC/fuel.json', {'schema': 1, 'displayUnit': 'lb', 'entries': {}}, 'document']]
    c.open('fuel', docs=docs)
    wait_quote(c)
    c.until("(document.querySelector('[data-module=fuel] .fu-result [data-ctxunit]')?.textContent || '') === 'lb · lb/h'", what='lb · lb/h on the context line')
    c.eq(c.count('header [data-ctxunit], #fHead [data-ctxunit]'), 0, 'not in the frame\'s header', what='header')
    to_step(c, 3)
    c.js("document.querySelector('[data-module=fuel] details[data-fold=settings]').open = true")
    c.page.select_option(f'{FUEL} select[data-k="unit"]', 'kg')
    c.until("(document.querySelector('[data-module=fuel] .fu-result [data-ctxunit]')?.textContent || '') === 'kg · kg/h'", what='kg · kg/h once kg is chosen')


_LAUNCHER_STATUS = {'server': True, 'root': '', 'git': True, 'data': False, 'dataGit': False, 'dataRepo': '', 'lfs': False, 'csp': True,
                    'relaxNav': False, 'host': 'TEST', 'lan': False}
_SID = 'LFRS.SID.NTS1A.RW03.NONE'
_STAR = 'LFML.STAR.MEN1A.RW13R.NONE'


def _seg(a, b, *reasons):
    """A segment in the form of the Fuel screen (frame/aerodb/INTEGRATION.md « Route computation › The form of the Fuel screen »)."""
    return {'from': a, 'to': b, 'via': 'DCT', 'state': 'error' if reasons else 'ok', 'reasons': [dict(r) for r in reasons]}


def _alt(i, name, route, nm, fl, segs, sid=True):
    return {'id': f'alt{i}', 'name': name, 'route': route, 'distanceNm': nm, 'fl': fl, 'profile': [{'nm': 0, 'ft': 500}, {'nm': nm, 'ft': 400}],
            'sid': {'id': _SID, 'name': 'NTS1A', 'runway': '03'} if sid else None, 'star': {'id': _STAR, 'name': 'MEN1A', 'runway': '13R'} if sid else None,
            'faults': sum(1 for s in segs if s['state'] == 'error'), 'segments': segs}


def _route_launcher(c, verbs):
    """A FAKE launcher (c.context.route on /__setup/, never a real one, never RouteSim): regen/verbs lists `verbs`; the job route/compute
    answers in the form of the Fuel screen: a computed route and two alternatives to `compute`, two faulty segments to `check`; the posted
    bodies are kept."""
    import urllib.parse
    st = {'posts': [], 'verbs': verbs, 'norad': False}
    alts = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]),
            _alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, [_seg('LFRS', 'NEPIX'), _seg('NEPIX', 'LFML')]),
            _alt(3, 'Direct · FL190', 'LFRS LUGEN LFML', 380, 190, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'LFML', {'kind': 'ceiling', 'text': 'plafond 19500 ft', 'deltaFt': 500})],
                 sid=False)]
    checked = _alt(1, 'Direct', 'LFRS LUGEN NEPIX LFML', 370, 270,
                   [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX', {'kind': 'RAD', 'text': 'Interdiction RAD LF9999', 'ruleId': 'LF9999'}),
                    _seg('NEPIX', 'LFML', {'kind': 'ceiling', 'text': 'plafond 19500 ft, prévu 27000 ft', 'deltaFt': 7500})], sid=False)
    common = {'rad': {'title': 'RAD test', 'start': '2026-10-29'}, 'fra': None, 'report': '', 'limitation': 'Précontrôle de simulation, jamais une validation IFPS.',
              'gaps': [{'name': 'RAD complet', 'reason': 'Seules les interdictions simples H24.'}]}

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        body = {}
        if u.path.endswith('/__setup/status'):
            body = _LAUNCHER_STATUS
        elif u.path.endswith('/__setup/regen/verbs'):
            body = {'verbs': st['verbs']}
        elif u.path.endswith('/__setup/folders'):
            body = {'folders': st.get('folders', [])}   # the launcher's shape (tools/launch.py _get_folders)
        elif u.path.endswith('/__setup/regen/job') and req.method == 'POST':
            st['posts'].append(json.loads(req.post_data or '{}'))
            body = {'job': 'j' + str(len(st['posts']))}
        elif u.path.endswith('/__setup/regen/job'):
            a = (st['posts'][-1].get('args') or {}) if st['posts'] else {}
            res = {'ok': False, 'reason': 'no-rad', 'message': 'no RAD imported on this workstation: import the EUROCONTROL RAD workbooks first (job route/import-rad)'} \
                if st['norad'] else dict(common, ok=True, alternatives=st.get('alts') or alts, segments=alts[0]['segments'], issues=[], message='2 alternative(s).') if a.get('action') == 'compute' else \
                dict(common, ok=True, alternatives=[st.get('check') or checked], segments=(st.get('check') or checked)['segments'],
                     issues=st.get('issues') or [{'level': 'error', 'text': 'RAD LF9999', 'kind': 'RAD'}], message='')
            body = {'id': 'j' + str(len(st['posts'])), 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': '', 'log': [], 'result': res}
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), handler)
    return st


@case('F109', 'Route step: « Calculer A → B » lists the launcher\'s routes, « Prendre » writes route, SID and STAR; « Contrôler » marks the faulty segments red with their reason',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0080 / SOG-0081 (user: the route choice, « frein majeur de la première tâche du pilotage »): the job route/compute of the launcher '
      '(AeroDB, RouteSim; its closed request in the form of the Fuel screen), detected by regen/verbs; the pilot\'s typing is never replaced without « Prendre »; what '
      'is not checked is shown; a fake launcher, never the real engine')
def f109(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons (the launcher has the job)')
    # Contrôler: the typed route as it is (action check)
    c.tap(f'{FUEL} [data-do="rcheck"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-segerr]').length === 2", what='two faulty segments red in the list of points')
    why = c.js(f"[...document.querySelectorAll('{FUEL} [data-segerr]')].map(e => [e.dataset.segerr, (e.querySelector('[data-segwhy]')?.textContent || '').trim()])")
    c.eq([w[0] for w in why], ['LUGEN-NEPIX', 'NEPIX-LFML'], 'the two segments', what='segments')
    c.ok('RAD' in why[0][1] and 'LF9999' in why[0][1] and 'ceiling' in why[1][1], why, 'each with its reason (RAD rule, ceiling)')
    c.until(f"(document.querySelector('{FUEL} .fu-result [data-ctxfaults]')?.textContent || '').includes('2')", what='the count on the context line')
    c.ok(c.js(f"!!document.querySelector('{FUEL} [data-routealts] [data-rlimits]')"), 'no limits', 'what the check does not cover is shown')
    chk = [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'check'][0]
    typed = cf_doc(c, lambda d: True, 'the flight')['route']['text']
    c.eq(sorted(chk), sorted(['action', 'adep', 'adest', 'route', 'date', 'fl']), 'a closed request: the contract\'s fields only, none null', what='fields')
    c.eq([chk['adep'], chk['adest'], chk['route'], chk['fl']], ['LFRS', 'LFML', typed, 270], 'the typed route sent as it is', what='check args')
    # Calculer A → B: the typed points are imposed; the computed route and two alternatives; « Prendre » the first alternative
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='the computed route and two alternatives')
    comp = [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'compute'][0]
    c.eq([sorted(comp), comp['via'], comp['alternatives'], comp['proposals']], [sorted(['action', 'adep', 'adest', 'via', 'date', 'fl', 'alternatives', 'proposals']), ['LUGEN', 'NEPIX'], True, True],
         'the typed points as imposed passages, alternatives and the proposals of an impossible plan asked (AeroDB 9a7f1dde3)', what='compute args')
    names = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-altname]')].map(e => e.textContent.trim())")
    c.eq(names, ['Via UN10', 'Direct · FL250', 'Direct · FL190'], 'each route named by the launcher', what='names')
    before = cf_doc(c, lambda d: True, 'the flight')['route']['text']
    c.tap(f'{FUEL} [data-alt="1"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: 'LUGEN' not in [p.get('id') for p in (d.get('route') or {}).get('points') or []] and procs_of(d, 'dep').get('sid') == _SID
               and procs_of(d, 'arr').get('star') == _STAR, 'route, SID and STAR of the taken route written', timeout=10000)
    c.ok(before != d['route']['text'], d['route']['text'], 'the route text changed only after « Prendre »')
    c.ok(c.js(f"!!document.querySelector('{FUEL} [data-alt=\"1\"][aria-current]')"), 'not marked', 'the taken route is marked')
    # without the job: no buttons
    st['verbs'] = []
    open_proc(c)
    c.settle()
    c.eq(c.count(f'{FUEL} [data-reng]:not([hidden])'), 0, 'no job route/compute: no buttons', what='no launcher job')


@case('F110', 'Route step without a RAD on the workstation: « Aucun RAD importé » and a link to its line in Data, never an import from Fuel',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0125 (user: « je ne trouve pas où importer les classeurs RAD »): the RAD is a data source like the others; route/compute\'s no-rad '
      'leads to its line of Data (Maintenance, source eurocontrol_rad); the launcher\'s message, which names a job, is not shown; a fake launcher')
def f110(c):
    st = _route_launcher(c, ['route/compute'])
    st['norad'] = True
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons (the launcher has the job)')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rrefused=\"no-rad\"]')", what='the no-rad sentence')
    href = c.js(f"document.querySelector('{FUEL} [data-rrefused=\"no-rad\"] a[data-radlink]')?.getAttribute('href') || ''")
    c.eq(href, '?app=maintenance#data?source=eurocontrol_rad', 'a link to the RAD line of Data', what='link')
    said = c.js(f"document.querySelector('{FUEL} [data-routealts]').textContent")
    c.ok('route/import-rad' not in said and 'EUROCONTROL RAD workbooks' not in said, said, 'the launcher\'s message (a job name) not shown')
    c.eq(c.count(f'{FUEL} [data-routealts] button'), 0, 'no import button in Fuel', what='no import from Fuel')


@case('F111', 'Step Flight: « ⇄ » between departure and arrival swaps them, the names follow, the old route, procedures and OFP are cleared',
      'F', tags=('fuel', 'aerodb', 'layout'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0127 (user, from RouteSim: « intéressante »): one button between the two fields; both ends change, so a new pair '
      '(the rule of 1 Nov: nothing of the old flight survives; a route is never read backwards); 44 px target, nothing over the edge at 390 px')
def f111(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_names(c)
    before = cf_doc(c, lambda d: d['route'].get('dep') == 'LFRS', 'the flight')
    c.ok(bool(before['route'].get('text')), before['route'], 'the seeded flight has a route (the swap must clear it)')
    sel = f'{FUEL} [data-do="adswap"]'
    c.eq(c.count(sel), 1, 'one ⇄ button on the step Flight', what='the button')
    box = c.js(f"(() => {{ const b = document.querySelector('{sel}').getBoundingClientRect(), d = document.querySelector('{FUEL} input[data-k=dep]').getBoundingClientRect(), a = document.querySelector('{FUEL} input[data-k=arr]').getBoundingClientRect(); return {{ w: b.width, h: b.height, between: b.left >= d.right - 0.5 && b.right <= a.left + 0.5, r: b.right, iw: innerWidth }} }})()")
    c.ok(box['between'] and box['r'] <= box['iw'], box, '⇄ between departure and arrival, inside the screen (its 44 px target: F112, SOG-0140)')
    c.eq(c.js("document.documentElement.scrollWidth <= innerWidth"), True, 'nothing over the edge at 390 px', what='overflow')
    c.tap(sel)
    d = cf_doc(c, lambda d: d['route'].get('dep') == 'LFML' and d['route'].get('arr') == 'LFRS', 'departure and arrival swapped in the flight', timeout=8000)
    c.ok(not d['route'].get('text') and not (d['route'].get('points') or []) and not d['route'].get('procedures') and not d.get('ofp'), d['route'],
         'a new pair: the old route, procedures and OFP are cleared, never read backwards')
    c.eq([c.js(f"document.querySelector('{FUEL} input[data-k=dep]').value"), c.js(f"document.querySelector('{FUEL} input[data-k=arr]').value")], ['LFML', 'LFRS'], 'the fields show the swap', what='fields')
    c.until("document.querySelector('[data-module=fuel] .fu-adname[data-adline=dep]').textContent.includes('Lfml')", what='the name under the departure follows')
    c.eq(d['route'].get('altn'), 'LFMT', 'the alternate stays', what='alternate')


@case('F112', 'Step Flight: « ⇄ » drawn at the size of the text (≤ 28 px), its target still 44 px, the row unchanged',
      'F', tags=('fuel', 'layout'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0140 (user: « le bouton ⇄ est tellement trop gros ! »): an icon button of the text\'s size, no solid border, a muted tint; '
      'the tap target stays 44 px through a pseudo-element; nothing else moves in the row')
def f112(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_names(c)
    m = c.js(f"""(() => {{ const b = document.querySelector('{FUEL} [data-do="adswap"]'), r = b.getBoundingClientRect(), cs = getComputedStyle(b),
        bf = getComputedStyle(b, '::before'), cx = r.left + r.width / 2, cy = r.top + r.height / 2,
        hit = (x, y) => document.elementFromPoint(x, y) === b,
        d = document.querySelector('{FUEL} input[data-k=dep]').getBoundingClientRect(), a = document.querySelector('{FUEL} input[data-k=arr]').getBoundingClientRect();
      return {{ h: r.height, w: r.width, border: parseFloat(cs.borderTopWidth) || 0, bg: cs.backgroundColor,
        target: [hit(cx - 21, cy), hit(cx + 21, cy), hit(cx, cy - 21), hit(cx, cy + 21)], pseudo: bf.content !== 'none' && bf.position === 'absolute',
        depFree: document.elementFromPoint(d.right - 2, d.top + d.height / 2)?.dataset?.k === 'dep', arrFree: document.elementFromPoint(a.left + 2, a.top + a.height / 2)?.dataset?.k === 'arr',
        between: r.left >= d.right && r.right <= a.left, sw: document.documentElement.scrollWidth, iw: innerWidth }} }})()""")
    c.le(round(m['h']), 28, 'the button is drawn at the size of the text', what='drawn height (px)')
    c.ok(m['border'] == 0 and m['bg'] in ('rgba(0, 0, 0, 0)', 'transparent'), m, 'no solid border, no fill')
    c.ok(all(m['target']) and m['pseudo'], m, 'the target reaches 44 px around it (a pseudo-element)')
    c.ok(m['depFree'] and m['arrFree'] and m['between'], m, 'the fields keep their edges: the target stays in its column')
    c.le(m['sw'], m['iw'], 'no horizontal scroll at 390 px', what='scrollWidth')
    c.shot(f'F112_{c.design}_{c.width}_{c.lang}.png')
    c.tap(f'{FUEL} [data-do="adswap"]')
    cf_doc(c, lambda d: d['route'].get('dep') == 'LFML' and d['route'].get('arr') == 'LFRS', 'the swap still works', timeout=8000)


@case('F113', 'Route step: « N écarts aux règles » is never a number alone — a fold lists each deviation with its segment, its rule and the engine\'s sentence, seven then « N autres »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 (b) (user: « 9 écarts aux règles » and nothing else to act on): one line per deviation — the segment, the RAD or FRA rule id '
      '(else its kind), the engine\'s own sentence; the engine\'s errors without a segment on a « — » line; a fake launcher')
def f113(c):
    st = _route_launcher(c, ['route/compute'])
    R = lambda kind, text, rule=None: dict({'kind': kind, 'text': text}, **({'ruleId': rule} if rule else {}))
    st['check'] = _alt(1, 'Direct', 'LFRS LUGEN NEPIX LFML', 370, 270, [
        _seg('LFRS', 'LUGEN', R('RAD', 'Interdiction RAD LF1001', 'LF1001'), R('ceiling', 'plafond 19500 ft, prévu 27000 ft')),
        _seg('LUGEN', 'NEPIX', R('FRA', 'Point FRA de sortie non respecté', 'LFFRA2')),
        _seg('NEPIX', 'PT1', R('RAD', 'Interdiction RAD LF1002', 'LF1002'), R('RAD', 'Interdiction RAD LF1003', 'LF1003')),
        _seg('PT1', 'PT2', R('direction', 'Sens interdit sur UN10'), R('floor', 'plancher FL195, prévu FL180')),
        {'from': 'PT2', 'to': 'LFML', 'via': 'DCT', 'state': 'error', 'reasons': []}], sid=False)
    st['issues'] = [{'level': 'error', 'text': 'Continuité : PT2 absent de la base'}, {'level': 'error', 'text': 'Interdiction RAD LF1001'}]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcheck]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcheck"]')
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-faults]')", what='the fold of the deviations')
    f = c.js(f"""(() => {{ const d = document.querySelector('{FUEL} [data-routealts] [data-faults]');
        return {{ sum: d.querySelector(':scope > summary').textContent, top: [...d.querySelectorAll(':scope > ul > [data-fault]')].map(e => e.textContent.trim()),
          all: d.querySelectorAll('[data-fault]').length, more: d.querySelector('[data-faultmore] > summary')?.textContent || '' }} }})()""")
    c.ok('9' in f['sum'], f['sum'], 'the fold says the count: nine deviations')
    c.eq([len(f['top']), f['all']], [7, 9], 'seven lines, then the others folded: nine lines for nine deviations', what='lines')
    c.ok('2' in f['more'], f['more'], '« 2 autres »')
    c.ok(f['top'][0].startswith('LFRS–LUGEN') and 'LF1001' in f['top'][0] and 'Interdiction RAD LF1001' in f['top'][0], f['top'][0],
         'a line: the segment, the rule id, the engine\'s sentence')
    c.ok('LFFRA2' in f['top'][2] and 'LUGEN–NEPIX' in f['top'][2], f['top'][2], 'a FRA rule by its point')
    c.js(f"document.querySelector('{FUEL} [data-faults]').open = true; document.querySelector('{FUEL} [data-faultmore]').open = true")
    rest = c.js(f"[...document.querySelectorAll('{FUEL} [data-faultmore] [data-fault]')].map(e => e.textContent.trim())")
    c.ok(rest[0].startswith('PT2–LFML') and rest[1].startswith('—') and 'Continuité' in rest[1], rest,
         'a faulty segment without reason has its line; the engine\'s error without segment on a « — » line; an error already said is not repeated')
    # the alternatives of « Calculer » carry their own fold when they deviate
    st.pop('check')
    st.pop('issues')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='three routes')
    c.eq(c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt]')].map(e => e.querySelectorAll('[data-fault]').length)"), [0, 0, 1],
         'the deviating route lists its deviation', what='per route')


_ALTS_LISTEN = "() => { window.__alts = []; window.addEventListener('fuel-route-alts', e => window.__alts.push(e.detail)); return true }"
_ALTS_LAST = "(() => (window.__alts || []).at(-1) || null)()"


@case('F114', 'Route step: the proposed routes published for the Map (event and document), the hovered row and the choice too; a route touched on the Map is taken',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 (a), voie (i) decided by the ergonomics session on 9 Nov (one map, the real one): Fuel resolves and publishes '
      '(fuel-route-alts, cache/fuel/route_alts.json, modules/fuel/INTEGRATION.md § 3 bis), draws nothing; maps-route-alt and #fuel?ralt= take a route')
def f114(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.js(_ALTS_LISTEN)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"(() => {{ const d = {_ALTS_LAST}; return !!d && d.alternatives.length === 3 }})()", timeout=8000, what='three routes published')
    d = c.js(_ALTS_LAST)
    c.eq([d['schema'], d['mode'], d['dep'], d['arr'], d['chosen'], d['hovered']], [1, 'compute', 'LFRS', 'LFML', 0, None], 'the head of the object', what='head')
    a = d['alternatives']
    c.ok(all(len(x['points']) == len(x['ids']) >= 2 and all(len(q) == 2 for q in x['points']) for x in a), a, 'each route as positions, with its ids')
    c.eq(a[2]['ids'], ['LFRS', 'LUGEN', 'LFML'], 'the third route resolved', what='ids')
    c.eq([x['faulty'] for x in a], [[], [], [1]], 'the faulty segment LUGEN–LFML of the third: segment 1', what='faulty')
    c.eq([a[0]['sid'], a[0]['star']], [_SID, _STAR], 'the procedures of a route', what='procedures')
    c.eq(c.count(f'{FUEL} svg[data-rsketch], {FUEL} [data-rsketch]'), 0, 'Fuel draws no sketch: the Map draws', what='no sketch')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 3, 'the document for a Map opened later', timeout=8000)
    c.eq([doc['hovered'], [x['faulty'] for x in doc['alternatives']]], [None, [[], [], [1]]], 'the document: the same routes, never a hover', what='doc')
    # hover: published by the event only
    c.page.hover(f'{FUEL} [data-altlist] [data-alt="1"]')
    c.until(f"({_ALTS_LAST} || {{}}).hovered === 1", what='hovering a row publishes it')
    c.eq(c.doc('cache/fuel/route_alts.json').get('hovered'), None, 'the document is not written on hover', what='doc hover')
    # a route touched on the Map (double view): taken as « Prendre »
    c.js("window.dispatchEvent(new CustomEvent('maps-route-alt', { detail: { index: 1 } }))")
    cf_doc(c, lambda d: 'LUGEN' not in [q.get('id') for q in (d.get('route') or {}).get('points') or []] and procs_of(d, 'dep').get('sid') == _SID,
           'the route touched on the Map is taken (route, SID)', timeout=10000)
    c.until(f"({_ALTS_LAST} || {{}}).chosen === 1", what='the choice published')
    c.js("window.dispatchEvent(new CustomEvent('maps-route-alt', { detail: { index: 7 } }))")
    c.settle()
    c.eq(c.js(_ALTS_LAST)['chosen'], 1, 'an index outside the list is ignored', what='bad index')
    # a Map alone: #fuel?ralt=2 takes the third route from the document
    c.go('fuel?ralt=2')
    cf_doc(c, lambda d: [w for w in str((d.get('route') or {}).get('text', '')).split() if w != 'DCT'][:3] == ['LFRS', 'LUGEN', 'LFML'], 'the address ralt=2 takes the third route', timeout=12000)
    # « Contrôler »: the typed route published in mode check
    c.js(_ALTS_LISTEN)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcheck]')", timeout=10000, what='the buttons again')
    c.tap(f'{FUEL} [data-do="rcheck"]')
    c.until(f"(() => {{ const d = {_ALTS_LAST}; return !!d && d.mode === 'check' && d.alternatives.length === 1 }})()", timeout=8000, what='the checked route published')


# SOG-0142: invented names and positions only (no AIP content) — two homonyms PAX (one on the route's side, one across the ocean), a resolved
# point in Sweden's frame (SWEPT, a zone not published), an invented aerodrome in Corsica (LFZZ) with no published point around it
_HOMONYM_EXTRA = {'points': [{'id': 'PAX', 'lat': 45.8, 'lon': 1.9, 'type': 'RNAV'}, {'id': 'PAX', 'lat': 39.0, 'lon': -76.0, 'type': 'RNAV'},
                             {'id': 'SWEPT', 'lat': 59.3, 'lon': 18.0, 'type': 'RNAV'}],
                  'aerodromes': [{'icao': 'LFZZ', 'name': 'LFZZ TEST', 'lat': 42.3, 'lon': 9.2, 'elev': 50}]}
_HOMONYM_ROUTE = 'LFRS PAX NEPIX SWEPT UNKSE LFZZ UNKCO LFML'


def _route_typed(c, text):
    to_step(c, 1)
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, text)
    c.page.locator(rt).blur()


_UNRES_JS = f"""(() => [...document.querySelectorAll('{FUEL} [data-unres-pt]')].map(e => [e.dataset.unresPt, e.dataset.zone || '', e.dataset.zstate || '',
  (e.querySelector('small')?.textContent || '').trim(),
  document.querySelector(`{FUEL} [data-zonegaps] [data-zonegap="${{e.dataset.zone}}"] a[data-zonelink]`)?.getAttribute('href') || '']))()"""


@case('F115', 'Route reader: a name with homonyms resolves to the nearest of the previous point, long jumps are said; an unknown point says its zone and the zone\'s state, with the gesture that fits',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0142 (user: a route through PAM in the United States and ALS in Morocco): the nearest homonym, never the first found; a jump of more '
      'than 1 000 NM said; an unknown point never a silent DCT — its probable zone and its state (not installed / installed without points or '
      'airways / cycle file missing: to rebuild), a link to Données on that zone; invented names and positions only')
def f115(c):
    # first (the browser's store outlives c.open): a base whose files are all of an older cycle — « à reconstruire », the link to update it
    old = (datetime.date.fromisoformat(AERO_CYCLE) - datetime.timedelta(days=56)).isoformat()
    c.open('fuel', docs=flight_docs() + aero_docs(cycle=old, airfields=True, extra=_HOMONYM_EXTRA))
    wait_quote(c)
    _route_typed(c, 'LFRS LUGEN UNKFR NEPIX LFML')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-unres-pt][data-zstate]')].length === 1", timeout=10000, what='the unknown point with its zone')
    u = {x[0]: x for x in c.js(_UNRES_JS)}
    c.eq([u['UNKFR'][1], u['UNKFR'][2], u['UNKFR'][4]], ['fr', 'stale', '?app=maintenance#data?zone=fr'], 'UNKFR: France installed, its cycle file missing: to rebuild', what='stale')
    # then the base of the cycle in force
    c.open('fuel', docs=flight_docs(), airfields=True, aero_extra=_HOMONYM_EXTRA)
    wait_quote(c)
    _route_typed(c, _HOMONYM_ROUTE)
    d = cf_doc(c, lambda d: 'PAX' in [q.get('id') for q in (d.get('route') or {}).get('points') or []], 'the route read', timeout=10000)
    pax = [q for q in d['route']['points'] if q.get('id') == 'PAX'][0]
    c.ok(abs(pax['lat'] - 45.8) < 0.01 and abs(pax['lon'] - 1.9) < 0.01, pax, 'PAX resolved to the homonym near the route, not the one across the ocean')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-rwarn] [data-rw]')].some(e => e.textContent.includes('PAX') && e.textContent.includes('2'))",
            what='« PAX : 2 homonymes, le plus proche gardé »')
    c.ok(c.js(f"[...document.querySelectorAll('{FUEL} [data-rwarn] [data-rw]')].some(e => e.textContent.includes('NEPIX') && e.textContent.includes('SWEPT'))"),
         c.text(f'{FUEL} [data-rwarn]'), 'the jump NEPIX → SWEPT (more than 1 000 NM) said')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-unres-pt][data-zstate]')].length === 2", timeout=10000, what='the two unknown points with their zone')
    u = {x[0]: x for x in c.js(_UNRES_JS)}
    c.eq([u['UNKSE'][1], u['UNKSE'][2], u['UNKSE'][4]], ['se', 'absent', '?app=maintenance#data?zone=se'], 'UNKSE: Sweden, not installed, a link to add it', what='absent')
    c.eq([u['UNKCO'][1], u['UNKCO'][2], u['UNKCO'][4]], ['fr', 'empty', ''], 'UNKCO: France installed but no point around: no gesture in Données', what='empty')



@case('F116', '« Zone manquante » on an aerodrome without procedures: what is missing, the gesture (Données), the external fallbacks (Little Navmap when on this computer, Navigraph, ChartFox)',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0143 (user: « ESPAGNE : aucune base installée… proposer un moyen de télécharger, expliquer ce qui manque, fallback LittleNavMap, '
      'Navigraph, ChartFox ; valable pour TOUS les pays »): one line in three parts, three elements; links, never data copied; an invented '
      'aerodrome (a prefix the catalogue does not survey, so its procedures are not judged) placed in a zone that is not installed; a fake launcher')
def f116(c):
    st = _route_launcher(c, [])
    st['folders'] = [{'id': 'lnmdb', 'path': '', 'exists': True, 'from': 'lnm'}]
    docs = flight_docs()
    f = docs[1][1]
    f['route']['arr'] = 'XSZZ'
    f['route']['text'] = 'LFRS LUGEN NEPIX XSZZ'
    f['route']['points'][-1] = {'id': 'XSZZ', 'lat': 59.6, 'lon': 17.9}
    c.open('fuel', docs=docs, airfields=True, aero_extra={'aerodromes': [{'icao': 'XSZZ', 'name': 'XSZZ TEST', 'lat': 59.6, 'lon': 17.9, 'elev': 30}],
                                                               'cells': {'46': [[-2, 6]], '47': [[-2, 6]]}})   # the index covers LFRS (its points are around it)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-proc][data-icao=\"XSZZ\"] [data-gap-slot] [data-zonegap]')", timeout=12000,
            what='the line « zone manquante » of the aerodrome without procedures')
    g = c.js(f"""(() => {{ const z = document.querySelector('{FUEL} [data-proc][data-icao="XSZZ"] [data-zonegap]');
        return {{ zone: z.dataset.zonegap, state: z.dataset.zstate, parts: z.children.length, link: z.querySelector('a[data-zonelink]')?.getAttribute('href') || '',
          ext: [...z.querySelectorAll('[data-ext]')].map(e => [e.dataset.ext, e.getAttribute('href') || '', e.getAttribute('rel') || '']) }} }})()""")
    c.eq([g['zone'], g['state'], g['parts']], ['se', 'absent', 3], 'the zone of the aerodrome, not installed: three parts', what='line')
    c.eq(g['link'], '?app=maintenance#data?zone=se', 'the gesture: Données on that zone', what='gesture')
    c.eq([x[0] for x in g['ext']], ['lnm', 'Navigraph', 'ChartFox'], 'the external fallbacks, Little Navmap first since its databases are on this computer', what='fallbacks')
    c.eq([g['ext'][1][1], g['ext'][2][1]], ['https://charts.navigraph.com/airport/XSZZ', 'https://chartfox.org/XSZZ'], 'links on the aerodrome', what='links')
    c.ok(all('noreferrer' in x[2] for x in g['ext'][1:]), g['ext'], 'external links without referrer (nothing sent, nothing copied)')
    c.eq(c.count(f'{FUEL} [data-proc][data-icao="LFRS"] [data-zonegap]'), 0, 'an aerodrome whose zone is there: no line', what='zone present')



@case('F117', 'Route step: a route whose check is incomplete for missing data is marked « contrôle incomplet » (muted, in its line and its fold), never shown as checked; « Prendre » says it',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0081 (RouteSim of 9 Nov 17 h 05: incomplete: true per alternative, its reasons as « revue » issues): what could not be checked is '
      'neither a deviation nor a validated route; a fake launcher')
def f117(c):
    st = _route_launcher(c, ['route/compute'])
    st['alts'] = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]),
                  dict(_alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, [_seg('LFRS', 'NEPIX'), _seg('NEPIX', 'LFML')]), incomplete=True)]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 2", what='two routes')
    r = c.js(f"""[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt]')].map(e => [e.hasAttribute('data-incomplete'), e.classList.contains('fu-raltinc'),
        !!e.querySelector('[data-faults] [data-incomplete]'), (e.querySelector('.f-muted')?.textContent || '')])""")
    c.eq([x[:3] for x in r], [[False, False, False], [True, True, True]], 'the incomplete route marked: attribute, muted tint, a line in its fold', what='rows')
    c.ok(tx(F, 'rIncomplete', c.lang) in r[1][3] and tx(F, 'rIncomplete', c.lang) not in r[0][3], r, 'the word in its line, not in the checked one')
    c.tap(f'{FUEL} [data-alt="1"] [data-do="rtake"]')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", norm(tx(F, 'rTakenIncomplete', c.lang))[:30],
            what='« Prendre » says the check is incomplete')
    # « Contrôler » an incomplete check: never « aucun écart détecté »
    st['check'] = dict(_alt(1, 'Direct', 'LFRS LUGEN NEPIX LFML', 370, 270, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')], sid=False), incomplete=True)
    st['issues'] = [{'level': 'review', 'text': 'Voie UN10 absente des segments chargés'}]
    c.tap(f'{FUEL} [data-do="rcheck"]')
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-faults] [data-incomplete]')", what='the incomplete check said')
    c.ok('UN10' in c.text(f'{FUEL} [data-routealts] [data-incomplete]'), c.text(f'{FUEL} [data-routealts] [data-incomplete]'), 'with its « revue » reason')
    c.eq(c.count(f'{FUEL} [data-routealts] p[data-rcheck]'), 0, 'never « aucun écart détecté » for an incomplete check', what='not checked')



@case('F118', 'Route reader: an aerodrome\'s ICAO code resolves to the aerodrome, never « homonymes »; departure and arrival never said as homonyms',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0154 (user: « LFLL : 2 homonymes, le plus proche gardé. LFPO : 2 homonymes »): a point of the same name is not a homonym of an '
      'aerodrome; homonyms are said for route points only; invented positions')
def f118(c):
    # an invented point named like the departure aerodrome, far away, and a real homonym pair for a route point (PAX)
    extra = {'points': [{'id': 'LFRS', 'lat': 30.0, 'lon': -20.0, 'type': 'RNAV'}, {'id': 'LFML', 'lat': 60.0, 'lon': 30.0, 'type': 'RNAV'},
                        {'id': 'PAX', 'lat': 45.8, 'lon': 1.9, 'type': 'RNAV'}, {'id': 'PAX', 'lat': 39.0, 'lon': -76.0, 'type': 'RNAV'}]}
    c.open('fuel', docs=flight_docs(), airfields=True, aero_extra=extra)
    wait_quote(c)
    _route_typed(c, 'LFRS PAX NEPIX LFML')
    d = cf_doc(c, lambda d: 'PAX' in [q.get('id') for q in (d.get('route') or {}).get('points') or []], 'the route read', timeout=10000)
    pts = {q['id']: q for q in d['route']['points']}
    c.ok(abs(pts['LFRS']['lat'] - 47.1569) < 0.01 and abs(pts['LFML']['lat'] - 43.4367) < 0.01, pts, 'departure and arrival: the aerodromes, not the points of the same name')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-rwarn] [data-rw]')].some(e => e.textContent.includes('PAX'))", what='the route point PAX said as homonyms')
    said = c.text(f'{FUEL} [data-rwarn]')
    c.ok('LFRS' not in said and 'LFML' not in said, said, 'never « homonymes » for the departure or the arrival')



@case('F119', 'Completion: a town\'s name proposes the aerodromes around it, the town in the line',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0158 (user: « je voudrais pouvoir trouver « stockholm » dans la liste de saisie des ADEP / ADEST »): aerodb.find gives the town, '
      'the aerodromes around it follow (40 NM), seven at most; an invented town and an invented aerodrome whose name does not contain it')
def f119(c):
    c.open('fuel', flight=True, airfields=True, aero_extra={'aerodromes': NAMES_BASE + [{'icao': 'LFZV', 'name': 'TESTFIELD', 'lat': 45.95, 'lon': 2.0, 'elev': 200}],
                                                            'cities': [{'name': 'ZORLVILLE', 'lat': 45.9, 'lon': 1.95, 'pop': 90000}]})
    wait_quote(c)
    to_step(c, 0)
    type_in(c, 'arr', 'zorlv')
    c.until(f"[...document.querySelectorAll('{FUEL} [data-adsug] [role=option]')].some(o => o.dataset.code === 'LFZV')", timeout=8000,
            what='the aerodrome near the town is proposed')
    o = c.js(f"[...document.querySelectorAll('{FUEL} [data-adsug] [role=option]')].map(o => [o.dataset.code, o.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])")
    lf = [x for x in o if x[0] == 'LFZV'][0]
    c.ok('TESTFIELD' in lf[1].upper() and 'ZORLVILLE' in lf[1].upper(), lf, 'the line: code, the aerodrome\'s name and the town')
    c.le(len(o), 7, 'seven proposals at most', what='proposals')



def _proc_line_docs(arr, lat, lon):
    """The planned flight to an invented aerodrome `arr` (its prefix says its State), no procedure seeded anywhere."""
    docs = flight_docs()
    f = docs[1][1]
    f['route']['arr'] = arr
    f['route']['text'] = f'LFRS LUGEN NEPIX {arr}'
    f['route']['points'][-1] = {'id': arr, 'lat': lat, 'lon': lon}
    return docs, {'aerodromes': [{'icao': arr, 'name': arr + ' TEST', 'lat': lat, 'lon': lon, 'elev': 30}], 'cells': {'46': [[-2, 6]], '47': [[-2, 6]]}}


_PROC_LINE_JS = f"""(icao) => {{ const p = document.querySelector(`{FUEL} [data-proc][data-icao="${{icao}}"]`); if (!p) return null;
  const g = p.querySelector('[data-procgap]');
  return {{ read: p.querySelector('[data-do=procfetch]')?.textContent.trim() ?? null, reason: g?.dataset.preason || '',
    ext: g ? [...g.querySelectorAll('[data-ext]')].map(e => [e.dataset.ext, e.getAttribute('href') || '']) : [] }} }}"""


@case('F120', 'Procedures: an aerodrome of a State whose procedures cannot be read says why (as Données says it) with the external fallbacks and no futile « Lire »; a State readable on demand offers « Lire à la demande »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0157 (user: « toujours ce bug aucune table des procédures publiées, sans plan B, ni consigne de téléchargement »): the State\'s '
      'state of « Procédures par État » (coverageByState); never a sentence without a gesture; invented aerodromes of the ES (labels only) and '
      'EB (EAD Basic) prefixes')
def f120(c):
    docs, extra = _proc_line_docs('ESZZ', 59.6, 17.9)
    c.open('fuel', docs=docs, airfields=True, aero_extra=extra)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-proc][data-icao=\"ESZZ\"] [data-procgap]')", timeout=12000, what='the State\'s state on ESZZ\'s line')
    e = c.js(_PROC_LINE_JS, 'ESZZ')
    c.eq(e['reason'], 'labels', 'Spain\'s state: labels only, no table', what='reason')
    c.eq(e['read'], None, 'no « Lire » that would fail again', what='no futile read')
    c.eq([x[0] for x in e['ext']], ['Navigraph', 'ChartFox'], 'the external fallbacks on the aerodrome', what='fallbacks')
    c.ok(e['ext'][0][1].endswith('/ESZZ') and e['ext'][1][1].endswith('/ESZZ'), e['ext'], 'links on ESZZ')
    c.until(f"(() => {{ const b = document.querySelector('{FUEL} [data-proc][data-icao=\"LFRS\"] [data-do=procfetch]'); return !!b && b.textContent.trim() === {repr(tx(PROC_TX, 'procReadDemand', c.lang))} }})()",
            timeout=8000, what='LFRS (the SIA\'s eAIP, readable on demand): « Lire à la demande »')
    # a State read through EAD Basic
    docs, extra = _proc_line_docs('EBZZ', 50.9, 4.5)
    c.open('fuel', docs=docs, airfields=True, aero_extra=extra)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"(() => {{ const b = document.querySelector('{FUEL} [data-proc][data-icao=\"EBZZ\"] [data-do=procfetch]'); return !!b && b.textContent.trim() === {repr(tx(PROC_TX, 'procReadDemand', c.lang))} }})()",
            timeout=12000, what='EBZZ (EAD Basic): « Lire à la demande »')
    c.eq(c.count(f'{FUEL} [data-proc][data-icao="EBZZ"] [data-procgap]'), 0, 'a readable State: no line of fallbacks', what='readable')



def _closed_zone_docs(zones, fr_extra=None, major=()):
    """The published base of the flight (zone fr, opened by the flight; `fr_extra`: more of its aerodromes) and more zones, published but
    never opened by the flight: for each, its index entry (cycle, prefixes, kb, cells) and its split files (meta, aerodromes, aeroindex as
    { fields, rows }, cities) in the shapes aerodb reads (frame/aerodb/aerodb.js listZones, part, liteAerodromes, nameCities), checked
    read-only against the user's data/sia/base; plus the world's major towns (cities_major.json, { data }). Every value is invented
    (SOG-0158: the proof without copying data). `zones`: { id: { prefix, cells, aerodromes, towns } }."""
    docs = aero_docs(airfields=True, extra={'aerodromes': list(fr_extra or [])} if fr_extra else None)
    idx = [d for d in docs if d[0] == 'sia/base/index.json'][0][1]
    fields = ['icao', 'name', 'lat', 'lon', 'elev', 'bearing', 'magVar', 'hardLen']   # aeroindex of parser 25 (hardLen, frame/aerodb SOG-0158)
    for zone, z in zones.items():
        idx['zones'][zone] = {'cycle': AERO_CYCLE, 'prefixes': [z['prefix']], 'kb': {'meta': 1, 'aerodromes': 2, 'aeroindex': 1, 'cities': 1},
                              'cells': z['cells']}

        def kind(k, data, zone=zone):
            return [f'sia/base/{zone}/{AERO_CYCLE}/{k}.json', {'schema': 2, 'zone': zone, 'cycle': AERO_CYCLE, 'kind': k, 'parserVersion': 1,
                                                               'data': data, 'updated_at': f'{AERO_CYCLE}T00:00:00Z'}, 'reference']
        ads = z['aerodromes']
        docs += [kind('meta', {}), kind('aerodromes', list(ads)),
                 kind('aeroindex', {'fields': fields, 'rows': [[a.get(f) for f in fields] for a in ads]}), kind('cities', list(z.get('towns', [])))]
    docs.append(['sia/base/cities_major.json', {'schema': 1, 'kind': 'cities_major', 'data': list(major)}, 'reference'])
    return docs


def _ad(icao, name, lat, lon, kind='AD', hard=None):
    return {'id': icao, 'icao': icao, 'name': name, 'type': kind, 'lat': lat, 'lon': lon, 'elev': 20, 'public': True, 'magVar': 5, 'bearing': 10,
            'hardLen': hard, 'water': False}


_TOWN = {'name': 'Stockholm', 'lat': 59.33, 'lon': 18.07, 'population': 1500000}
_SE = {'prefix': 'ES', 'cells': {'57': [[11, 13]], '59': [[17, 19]], '68': [[15, 17]]}, 'towns': [_TOWN],
       'aerodromes': [_ad('ESZA', 'STOCKHOLM/NORDFIELD', 59.65, 17.92, hard=3300), _ad('ESZB', 'STOCKHOLM/TESTFIELD', 59.35, 17.95, hard=1600),
                      _ad('ESZH', 'STOCKHOLM/HOSPITAL', 59.33, 18.07, 'HP'), _ad('ESZM', 'MILBASE', 59.9, 17.6, 'MIL', 3500)]
       + [_ad(f'ESZ{c}', f'SMALLFIELD {c}', 57.7, 12.0 + n / 10, hard=800) for n, c in enumerate('CDEFG')]}
_US = {'prefix': 'K', 'cells': {'39': [[-106, -103]], '34': [[-119, -117]]},
       'aerodromes': [_ad('KZZA', 'TEST INTL', 39.8, -104.7, hard=4000), _ad('KZZB', 'TEST FIELD', 39.7, -104.9, hard=1500),
                      _ad('KZZM', 'TEST AFB', 34.9, -117.9, 'MIL', 4500)]}
_NO = {'prefix': 'EN', 'cells': {'68': [[15, 17]]}, 'aerodromes': [_ad('ENZZ', 'NORDNORGE', 68.4, 16.0, hard=2800)]}
# aerodromes of the opened zone whose names hold the typed letters in their middle (they crowded the list out: DUNKESWELL, LAMPEDUSA)
_FR_NOISE = [_ad('LFZW', 'DUNKESWELL TEST', 45.5, 2.5, hard=1200), _ad('LFZQ', 'LAMPEDUSA TEST', 45.6, 2.6, hard=1200)]
_OPTS_JS = f"[...document.querySelectorAll('{FUEL} [data-adsug] [role=option]')].map(o => o.dataset.code)"


@case('F121', 'Completion across the installed zones: « stoc » (a town), « usa » (an alias), « swe » (a country) propose the main aerodromes of zones the flight has not opened, before names that merely hold the letters',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0158, refused at acceptance (user, 10 Nov: « SWE… fonctionne. STOC… ne fonctionne pas. USA non plus. »): aerodb.suggest across '
      'the published zones (code, country by names, endonym or initials, name or word), then the aerodromes around a town found by find, then '
      'names holding the letters; zones published and never opened, in the shapes aerodb reads (aeroindex of parser 25); invented values')
def f121(c):
    docs = flight_docs() + _closed_zone_docs({'se': _SE, 'us': _US, 'no': _NO}, fr_extra=_FR_NOISE, major=[_TOWN])
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 0)

    def opts(text, want, what):
        type_in(c, 'arr', text)
        c.until(f"(w) => {{ const o = {_OPTS_JS}; return o.length > 0 && o[0] === w }}", want, timeout=20000, what=what)   # the first question reads every zone's light index (cold)
        return c.js(_OPTS_JS)
    o = opts('stoc', 'ESZA', '« stoc »: the main aerodrome named after the town first')
    c.eq(o[:3], ['ESZA', 'ESZB', 'ESZH'], '« stoc »: the aerodromes named after the town, civil by runway, the heliport after', what='stoc')
    c.ok('ESZM' in o, o, 'and the aerodrome around the town that does not carry its name (the town found by find)')
    o = opts('usa', 'KZZA', '« usa »: the United States (by its initials), the main civil aerodrome first')
    c.eq(o[:3], ['KZZA', 'KZZB', 'KZZM'], '« usa »: civil by runway, then the military base', what='usa')
    c.ok('LFZQ' not in o or o.index('LFZQ') > 2, o, '« LAMPEDUSA » (usa in the middle of a name) after the country')
    o = opts('swe', 'ESZA', '« swe »: Sweden\'s main civil aerodrome first')
    c.ok('ENZZ' not in o, o, 'a Norwegian aerodrome is not Sweden\'s')
    c.ok('LFZW' not in o[:6], o, '« DUNKESWELL » (swe in the middle of a name) after the country')



_FLIGHT_ROW_JS = f"""(() => {{ const r = e => e ? e.getBoundingClientRect() : null, fl = document.querySelector('{FUEL} input[data-k="fl"]'),
    lv = fl.closest('.f-field'), dt = document.querySelector('{FUEL} input[data-k="wxdate"]').closest('.f-field'),
    au = document.querySelector('{FUEL} [data-do="levelauto"]'), help = document.querySelector('{FUEL} [data-lvlauto]'),
    acb = document.querySelector('{FUEL} [data-acsel] [data-do="acopen"]'), prev = acb?.previousElementSibling;
  const card = dt.closest('.f-card'), pad = card ? parseFloat(getComputedStyle(card).paddingRight) || 0 : 0;
  return {{ dtRight: r(document.querySelector('{FUEL} input[data-k="wxdate"]')).right, cardIn: card ? r(card).right - pad : innerWidth, lvTop: r(lv).top, dtTop: r(dt).top, flIn: r(fl).top, dtIn: r(document.querySelector('{FUEL} input[data-k="wxdate"]')).top, autoTop: r(au).top, flTop: r(fl).top, autoLeft: r(au).left, flRight: r(fl).right,
    help: help.textContent.trim(), helpH: r(help).height, helpLines: help.scrollHeight > help.clientHeight + 1 || getComputedStyle(help).whiteSpace !== 'nowrap',
    acLabel: (acb?.textContent || '').trim(), acGap: acb && prev ? r(acb).left - r(prev).right : null,
    acH: acb ? r(acb).height : null, acFrame: acb ? [getComputedStyle(acb).borderTopWidth, getComputedStyle(acb).backgroundColor] : null,
    acTarget: acb ? [parseFloat(getComputedStyle(acb, '::before').height) || 0, parseFloat(getComputedStyle(acb, '::before').width) || 0] : null,
    acRightAlone: acb ? getComputedStyle(acb).marginLeft === 'auto' : null, sw: document.documentElement.scrollWidth, iw: innerWidth }} }})()"""


@case('F122', 'Step Flight: Level and Flight date side by side on one top line, « Auto » in the row of the level field, one help line under it; the aircraft line carries « Changer » right after its text',
      'F', tags=('fuel', 'layout'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0056 and SOG-0060 refused at acceptance (user, 10 Nov: « mauvais placement du label, écran devenu brouillon »; « le bouton de '
      'recherche est au bout du monde (le seul à être aligné à droite) et on ne le voit pas ») — captures 390 and 1 280 looked at')
def f122(c):
    hi = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
            d[1]['level'] = {'ft': 27000, 'auto': True}
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', hi, 'document']])
        wait_quote(c)
        to_step(c, 0)
        c.until(f"(document.querySelector('{FUEL} [data-lvlauto]')?.textContent || '').includes('auto')", timeout=10000, what='the auto help line')
        m = c.js(_FLIGHT_ROW_JS)
        c.ok(abs(m['lvTop'] - m['dtTop']) < 1.5, m, f'{w} px: Level and Flight date start on the same top line')
        c.ok(abs(m['flIn'] - m['dtIn']) < 1.5, m, f'{w} px: the two fields on one line too (the date label on one line)')
        c.ok(m['dtRight'] <= m['cardIn'] + 0.5, m, f'{w} px: the date field stays inside the card')
        c.ok(abs(m['autoTop'] - m['flTop']) < 4 and m['autoLeft'] >= m['flRight'] - 1, m, f'{w} px: « Auto » in the row of the level field, on its right')
        c.ok(not m['helpLines'] and m['helpH'] < 26 and not m['help'].startswith('FL'), m, f'{w} px: one help line « auto · time » under the level')
        c.ok(m['acLabel'] and m['acGap'] is not None and m['acGap'] < 16 and not m['acRightAlone'], m, f'{w} px: « Changer » follows the aircraft line, with a label')
        # retouche (ergonomist, 10 Nov, the user's remark on ⇄ and « Ajouter »): drawn at the size of the text, no frame, a 44 px target
        c.ok(m['acH'] <= 28 and m['acFrame'][0] in ('0px', '') and m['acFrame'][1] in ('rgba(0, 0, 0, 0)', 'transparent'), m,
             f'{w} px: « Changer » drawn at the size of the text (≤ 28 px, no frame)')
        c.ok(m['acTarget'][0] >= 44 and m['acTarget'][1] >= 44, m, f'{w} px: its target stays 44 px')
        c.le(m['sw'], m['iw'], f'{w} px: no horizontal scroll', what='scrollWidth')
        c.shot(f'F122_{c.design}_{w}_{c.lang}.png')



def _ctl_seg(a, b, control, layer, reason=''):
    """A segment of the screen's form with its control (SOG-0161: controlled | incomplete | fallback | error, and its layer)."""
    return dict(_seg(a, b), control=control, layer=layer, controlReason=reason)


@case('F123', 'Route step: each proposed route says its share — controlled / incomplete / fallback in three words and three numbers, never « contrôlé » alone before 100 % —, its sections by layer, « Prendre » repeats it, the Map gets the control of each segment',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0161 (AeroDB: the longest controlled route; reference ESSB → LEMO 22 / 65 / 14): control per route and per section, from the '
      'launcher\'s answer; route_alts.json carries control per segment for the Map\'s layer (BUGS SOG); a fake launcher')
def f123(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('LFRS', 'LUGEN', 'fallback', 'SID', 'connecteur de simulation : aucune SID lue'),
            _ctl_seg('LUGEN', 'NEPIX', 'incomplete', 'FRA', 'lien FRA : rôles et niveaux contrôlés, volumes non lus'),
            _ctl_seg('NEPIX', 'LFML', 'fallback', 'STAR', 'connecteur de simulation : aucune STAR lue')]
    part = dict(_alt(1, 'Direct FRA', 'LFRS LUGEN NEPIX LFML', 370, 270, segs, sid=False),
                control={'controlledPct': 22, 'incompletePct': 65, 'fallbackPct': 14, 'errorPct': 0,
                         'sections': [{'layer': g['layer'], 'control': g['control'], 'from': g['from'], 'to': g['to'], 'nm': 120, 'reason': g['controlReason']} for g in segs]})
    full = dict(_alt(2, 'Via UN10', 'LFRS LUGEN NEPIX LFML', 372, 270, [_ctl_seg('LFRS', 'LUGEN', 'controlled', 'SID'), _ctl_seg('LUGEN', 'NEPIX', 'controlled', 'HIGH'),
                                                                        _ctl_seg('NEPIX', 'LFML', 'controlled', 'STAR')], sid=False),
                control={'controlledPct': 100, 'incompletePct': 0, 'fallbackPct': 0, 'errorPct': 0, 'sections': []})
    st['alts'] = [part, full]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 2", what='two routes')
    shares = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-share]')].map(e => e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim())")
    c.eq(len(shares), 2, 'each route says its share', what='shares')
    c.ok(shares[0].count('%') == 3 and '22 %' in shares[0] and '65 %' in shares[0] and '14 %' in shares[0], shares, 'three words and three numbers: 22 / 65 / 14')
    c.ok('%' not in shares[1] and shares[1], shares, '« contrôlé » alone only at 100 %')
    c.js(f"document.querySelector('{FUEL} [data-alt=\"0\"] [data-sections]').open = true")
    sec = c.js(f"[...document.querySelectorAll('{FUEL} [data-alt=\"0\"] [data-sections] [data-section]')].map(e => [e.dataset.layer, e.dataset.section])")
    c.eq(sec, [['SID', 'fallback'], ['FRA', 'incomplete'], ['STAR', 'fallback']], 'the sections by layer with their state', what='sections')
    c.js(f"document.querySelector('{FUEL} [data-alt=\"0\"]').scrollIntoView({{ block: 'start' }})")
    c.shot(f'F123_{c.design}_{c.width}_{c.lang}.png')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 2, 'the routes published for the Map', timeout=8000)
    c.eq(doc['alternatives'][0].get('control'), ['fallback', 'incomplete', 'fallback'], 'the control of each segment, for the Map\'s layer', what='control')
    c.tap(f'{FUEL} [data-alt="0"] [data-do="rtake"]')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", '22 %', what='« Prendre » repeats the share')



# AeroDb.groundStatus / fetchGround of the test page: a state per aerodrome (window.__gst), fetchGround counted and slow, the procedures
# reading counted (« Réessayer » reads the ground alone), the change listeners kept to announce a failure as aerodb does
_GROUND_INIT = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { window.__gst = { LFML: { state: 'failed', reason: 'too-soon', message: 'Overpass answered <b>HTTP 429</b>\\nretry later' } };
        window.__gtries = 0; window.__ptries = 0; window.__gon = [];
        db.groundStatus = async icao => ({ ...(window.__gst[icao] || { state: 'none' }) });
        db.fetchGround = async icao => { window.__gtries++; window.__gst[icao] = { state: 'reading' }; await new Promise(r => setTimeout(r, 900));
          window.__gst[icao] = { state: 'ok' }; return { ok: true } };
        const fp = db.fetchProcedures; db.fetchProcedures = (...x) => { window.__ptries++; return fp.apply(db, x) };
        const on = db.on; db.on = (ev, fn) => { if (ev === 'change') window.__gon.push(fn); return on.call(db, ev, fn) };
      } catch (e) {}
      return db } } } }) })()"""


@case('F124', 'Procedures card: the discreet line of a read aerodrome says its ground reading in the Map\'s words — « Sol non lu : <raison> · Réessayer », « Lecture du sol en cours… », « Sol lu » —, « Réessayer » reads the ground alone, a failure announced by aerodb is said at once',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0135 (a failed ground reading is never silent) on the Procedures card, after the Map\'s Ground panel (BUGS SOG, same four '
      'sentences: modules/maps/texts.js gReading, gFailed, gWhy, gRetry, agreed 10 Nov); AeroDb.groundStatus(icao) and on(change, '
      '{ ground, groundFailed }); nothing while the ground is neither read nor tried')
def f124(c):
    c.page.add_init_script(_GROUND_INIT)
    open_proc(c)
    # the two tables say the same words (BUGS SOG changes a word → this case is red, and Fuel follows)
    same = c.js("""async () => { const M = (await import('/modules/maps/texts.js')).TX, P = (await import('/modules/fuel/procedures_texts.js')).TX;
      const j = JSON.stringify; return [j(M.gReading) === j(P.groundReading), j(M.gFailed) === j(P.groundFailed), j(M.gRetry) === j(P.groundRetry),
        j(M.gWhy) === j(P.groundWhy)] }""")
    c.eq(same, [True, True, True, True], 'the same four sentences as the Map\'s Ground panel', what='texts')
    wait_rows(c, 'arr')
    arr = f'{FUEL} [data-proc="arr"] .fu-procmeta'
    c.until(f"!!document.querySelector('{arr} [data-ground=\"failed\"]')", timeout=8000, what='the failed ground reading is said on the line')
    why = tx(PT, "too-soon'", c.lang, after='groundWhy')
    want = norm(tx(PT, 'groundFailed', c.lang).replace('{r}', why))
    c.eq(norm(c.text(f'{arr} [data-ground="failed"]')), want, '« Sol non lu : <raison> », the reason in words', what='failure')
    title = c.js(f"document.querySelector('{arr} [data-ground=\"failed\"]').title")
    c.ok('429' in title and '<' not in title and '\n' not in title, title, 'the launcher\'s own words in its title, without < > nor line breaks')
    c.eq(norm(c.text(f'{arr} [data-do="groundretry"]') or ''), norm(tx(PT, 'groundRetry', c.lang)), 'and « Réessayer »', what='retry')
    c.js(f"document.querySelector('{arr}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F124_{c.design}_{c.width}_{c.lang}.png')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] [data-ground]'), 0, 'nothing on a line whose ground is neither read nor tried', what='departure')
    c.tap(f'{arr} [data-do="groundretry"]')
    c.until(f"!!document.querySelector('{arr} [data-ground=\"reading\"]')", timeout=3000, what='« Lecture du sol en cours… » at once')
    c.eq(norm(c.text(f'{arr} [data-ground="reading"]')), norm(tx(PT, 'groundReading', c.lang)), 'in the Map\'s words', what='reading')
    c.until(f"!!document.querySelector('{arr} [data-ground=\"ok\"]')", timeout=8000, what='« Sol lu » once read')
    c.eq(norm(c.text(f'{arr} [data-ground="ok"]')), norm(tx(PT, 'groundOk', c.lang)), '« Sol lu »', what='read')
    c.eq(c.js('[window.__gtries, window.__ptries]'), [1, 0], '« Réessayer » read the ground once, not the procedures', what='[ground, procedures] readings')
    c.eq(c.count(f'{arr} [data-do="groundretry"]'), 0, 'no « Réessayer » once read', what='retry')
    # aerodb announces a failure (on('change', { ground, groundFailed })): the line says it without another gesture
    c.js("() => { window.__gst.LFML = { state: 'failed', reason: 'mystery', message: '' }; for (const f of window.__gon) f({ ground: 'LFML', groundFailed: true }); return true }")
    c.until(f"!!document.querySelector('{arr} [data-ground=\"failed\"]')", timeout=6000, what='the announced failure is said')
    c.eq(norm(c.text(f'{arr} [data-ground="failed"]')), norm(tx(PT, 'groundFailed', c.lang).replace('{r}', tx(PT, 'failed', c.lang, after='groundWhy'))),
         'an unknown reason is said « la lecture a échoué »', what='failure')



@case('F125', 'Route step: an impossible plan lists the engine\'s fallback proposals apart, under « Propositions non validées », each with its share and sections, never said « contrôlé »; « Prendre » says « proposition non validée : à vérifier »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0161 continued (AeroDB 9a7f1dde3: the request field `proposals: true`; without a computed route the recovery proposals come back as '
      'alternatives `proposal` / `incomplete` with their `control`): never mixed with the checked routes, never « contrôlé » alone even at 100 %; a fake launcher')
def f125(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('LFRS', 'LUGEN', 'controlled', 'SID'), _ctl_seg('LUGEN', 'LFML', 'fallback', 'FRA', 'raccord direct : aucun chemin contrôlé')]
    p1 = dict(_alt(1, '', 'LFRS LUGEN LFML', 372, 270, segs, sid=False), proposal=True, incomplete=True,
              control={'controlledPct': 40, 'incompletePct': 0, 'fallbackPct': 60, 'errorPct': 0,
                       'sections': [{'layer': g['layer'], 'control': g['control'], 'from': g['from'], 'to': g['to'], 'nm': 150, 'reason': g['controlReason']} for g in segs]})
    p2 = dict(_alt(2, '', 'LFRS LFML', 364, 270, [_ctl_seg('LFRS', 'LFML', 'controlled', 'FRA')], sid=False), proposal=True, incomplete=True,
              control={'controlledPct': 100, 'incompletePct': 0, 'fallbackPct': 0, 'errorPct': 0, 'sections': []})
    st['alts'] = [p1, p2]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-proposals] [data-alt]').length === 2", timeout=8000, what='the two proposals, apart')
    c.eq((st['posts'][-1].get('args') or {}).get('proposals'), True, 'the Route step asks for the proposals', what='request proposals')
    c.eq(norm(c.text(f'{FUEL} [data-proposals-head]')), norm(row(c, 'rProposals')), 'under « Propositions non validées »', what='heading')
    c.eq(c.count(f'{FUEL} [data-altlist]:not([data-proposals]) [data-alt]'), 0, 'never mixed with checked routes (none here)', what='checked routes')
    c.eq(c.count(f'{FUEL} [data-rnone]'), 1, 'the engine\'s message stays said above', what='message')
    shares = c.js(f"[...document.querySelectorAll('{FUEL} [data-proposals] [data-alt] [data-share]')].map(e => e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim())")
    c.ok(len(shares) == 2 and all('%' in x for x in shares), shares, 'each proposal says its share in numbers, never « contrôlé » alone (even at 100 %)')
    c.eq(c.count(f'{FUEL} [data-proposals] [data-alt="0"] [data-sections] [data-section]'), 2, 'and its sections', what='sections')
    names = c.js(f"[...document.querySelectorAll('{FUEL} [data-proposals] [data-altname]')].map(e => e.textContent.trim())")
    c.eq(names, [row(c, 'rProposal').replace('{n}', '1'), row(c, 'rProposal').replace('{n}', '2')], 'named « Proposition 1 », « Proposition 2 »', what='names')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 2, 'the proposals published for the Map', timeout=8000)
    c.eq([a.get('proposal') for a in doc['alternatives']], [True, True], 'the Map knows they are proposals', what='proposal')
    c.js(f"const h = document.querySelector('{FUEL} [data-proposals-head]'); h.scrollIntoView({{block: 'start'}}); window.scrollBy(0, -160); document.querySelector('{FUEL} [data-proposals-head]').closest('[class*=scroll], main')?.scrollBy?.(0, -160)")
    c.shot(f'F125_{c.design}_{c.width}_{c.lang}.png')
    c.tap(f'{FUEL} [data-proposals] [data-alt="0"] [data-do="rtake"]')
    want = norm(row(c, 'rTakenProposal').split('{share}')[0])
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", want, what='« Prendre » says « proposition non validée : à vérifier »')



_LEGEND_JS = """async (lang) => { const L = await import('/frame/lib/route_legend.js');
  return { natures: L.NATURES.map(n => n.id), labels: L.NATURES.map(n => n.label[Math.max(0, L.LANGS.indexOf(lang))]),
    dashes: L.NATURES.map(n => n.dash.join(' ')) } }"""


@case('F126', 'Route step: the nature of each section — airway, DCT, FRA, SID, STAR, approach, deviation — with the same words and strokes as the Map (one legend, frame/lib/route_legend.js); route_alts.json gives the Map the airway and the layer of each segment',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 refused at acceptance (« on ne voit ni les points ni les awy, ni si c\'est du DCT, du FRA… même couleur, très gros, sans '
      'légende »): one table of natures, words ×4 and strokes read by Fuel and by the Map (BUGS SOG draws); via / layer per segment k in '
      'route_alts.json, as control; a fake launcher')
def f126(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [dict(_ctl_seg('LFRS', 'LUGEN', 'controlled', 'SID'), via='NTS1A'), dict(_ctl_seg('LUGEN', 'NEPIX', 'controlled', 'HIGH'), via='UN10'),
            dict(_ctl_seg('NEPIX', 'LFML', 'incomplete', 'FRA', 'lien FRA'), via='DCT')]
    st['alts'] = [dict(_alt(1, 'Via UN10', 'LFRS LUGEN NEPIX LFML', 370, 270, segs, sid=False),
                       control={'controlledPct': 70, 'incompletePct': 30, 'fallbackPct': 0, 'errorPct': 0,
                                'sections': [{'layer': g['layer'], 'control': g['control'], 'from': g['from'], 'to': g['to'], 'nm': 120, 'reason': g['controlReason']} for g in segs]})]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 1", what='the route')
    table = c.js(_LEGEND_JS, c.lang)
    leg = c.js(f"""[...document.querySelectorAll('{FUEL} [data-rlegend] [data-nature]')].map(e => [e.dataset.nature, e.firstElementChild?.nextSibling?.textContent.trim() || '',
        e.querySelector('line')?.getAttribute('stroke-dasharray') || ''])""")
    c.eq([x[0] for x in leg], table['natures'], 'the legend lists the natures of the common table, in its order', what='legend natures')
    c.eq([x[1] for x in leg], table['labels'], 'with its words, in the language of the screen', what='legend words')
    c.eq([x[2] for x in leg], table['dashes'], 'and its strokes (DCT dashed, FRA dotted, the others solid)', what='legend strokes')
    c.js(f"document.querySelector('{FUEL} [data-alt=\"0\"] [data-sections]').open = true")
    nat = c.js(f"[...document.querySelectorAll('{FUEL} [data-alt=\"0\"] [data-sections] [data-section]')].map(e => [e.dataset.nature, !!e.querySelector('[data-nature] line')])")
    c.eq(nat, [['sid', True], ['awy', True], ['fra', True]], 'each section says its nature with the stroke of the legend', what='sections')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 1, 'the route published for the Map', timeout=8000)
    a = doc['alternatives'][0]
    c.eq([a.get('via'), a.get('layer')], [['NTS1A', 'UN10', 'FRA'], ['SID', 'HIGH', 'FRA']], 'the airway (a direct of the FRA layer is FRA) and the layer of each segment, for the Map', what='[via, layer]')
    c.js(f"document.querySelector('{FUEL} [data-rlegend]').open = true; document.querySelector('{FUEL} [data-rlegend]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F126_{c.design}_{c.width}_{c.lang}.png')



# an invented ILS of the published base (SOG-0176): the runway 13R of the test LFML, made-up identifier and frequency, its position
# near the aerodrome of the route (lib.FLIGHT); not an AIP value
def _ils_extra():
    import lib
    p = next(x for x in lib.FLIGHT['route']['points'] if x['id'] == 'LFML')
    return {'navaids': [{'kind': 'ILS', 'id': 'TST', 'name': 'LFML 13R', 'freq': '110.30', 'ad': 'LFML', 'rwy': '13R', 'bearing': 134, 'dme': True,
                         'lat': p['lat'] + 0.02, 'lon': p['lon'] - 0.02}]}


_ILS_PROCS = {'dep': {'rwy': '03', 'sid': None}, 'arr': {'rwy': '13R', 'star': 'LFML.STAR.MEN1A.RW13R.NONE', 'trans': 'LFML.STAR.MEN1A.RWALL.NEPIX',
                                                          'app': 'LFML.APP.I13R.RW13R.NONE'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'}


@case('F127', 'Procedures: the chosen ILS approach says its aid when the published base carries it — « ILS 13R · TST 110.30 · axe 134° · DME » —; an aerodrome without an ILS in the base has no line, nothing invented',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0176 (user: « les fréquences d\'ILS sont prévues ? codées ? affichées ? »; AeroDB: the base carries the SIA\'s ILS — ident, '
      'frequency, runway, axis, DME —, France only): the approach\'s aid from aerodb.navaids, never invented; an invented ILS in the test base')
def f127(c):
    open_proc(c, procs=_ILS_PROCS, aero_extra=_ils_extra())
    wait_rows(c, 'arr')
    c.until(f"(() => {{ const e = document.querySelector('{FUEL} [data-proc=arr] [data-appaid]'); return !!e && !e.hidden && /110\\.30/.test(e.textContent) }})()", timeout=10000,
            what='the aid line of the chosen ILS')
    line = norm(c.text(f'{FUEL} [data-proc="arr"] [data-appaid]'))
    want = norm(tx(PT, 'appAid', c.lang).replace('{type}', 'ILS').replace('{rwy}', '13R').replace('{id}', 'TST').replace('{freq}', '110.30').replace('{axis}', '134') + ' · DME')
    c.eq(line, want, '« ILS 13R · TST 110.30 · axe 134° · DME »: type and runway, ident and frequency, axis, DME', what='aid line')
    c.js(f"document.querySelector('{FUEL} [data-proc=arr] [data-appaid]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F127_{c.design}_{c.width}_{c.lang}.png')
    # the same approach, no ILS of LFML in the base (its navaids rewritten: an ILS of another aerodrome only): no line, no dash
    other = _ils_extra()
    other['navaids'][0].update(ad='LFMT', name='LFMT 13R')
    open_proc(c, procs=_ILS_PROCS, aero_extra=other)
    wait_rows(c, 'arr')
    c.settle()
    c.page.wait_for_timeout(1500)
    c.eq(c.js(f"(() => {{ const e = document.querySelector('{FUEL} [data-proc=arr] [data-appaid]'); return e ? [e.hidden, e.textContent.trim()] : null }})()"), [True, ''],
         'without an ILS in the base: no line (hidden, empty)', what='[hidden, text]')
