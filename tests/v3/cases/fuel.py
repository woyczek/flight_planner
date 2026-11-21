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
import time
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
    head, _, note = row(c, 'wxDate').partition(' (')
    c.ok(norm(label).startswith(norm(head)), f'field label {label!r}', 'the field is called "Flight date" in the language of the run')
    # SOG-0393: « device's local time » under the field, no longer in the label
    c.eq(norm(c.text(f'{FUEL} .fu-flight [data-datenote]')), norm(note.rstrip(')')), 'the time zone said under the field', what='date note')

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


def show_list(c, k):
    """Opens the line of the procedure list data-k=`k` by its « Changer » (SOG-0308: each line's list opens at its place), its side
    unfolded first; nothing when the list is already shown."""
    unfold(c, k.split('-')[1])
    if not c.shown(f'{FUEL} select[data-k="{k}"]'):
        c.js("(k) => document.querySelector('[data-module=fuel] select[data-k=\"' + k + '\"]').closest('.fu-prow').querySelector('[data-do=procchange]').click()", k)
        c.until("(k) => window.__t.shown(document.querySelector('[data-module=fuel] select[data-k=\"' + k + '\"]'))", k, what=f'the list {k} is open')


def open_foot(c, side):
    """Opens the foot « Source et cartes » of a side (SOG-0308: the reading line, « Relire », the ground, the aerodrome's charts are folded
    under it) by a tap on its summary, the side unfolded first."""
    unfold(c, side)
    sel = f'{FUEL} [data-proc="{side}"] [data-procfoot]'
    if c.js(f"!!document.querySelector('{sel}') && !document.querySelector('{sel}').open"):
        c.tap(f'{sel} > summary')
        c.until(f"document.querySelector('{sel}').open", what=f'the foot of {side} is open')


def pick_proc(c, k, value):
    """Chooses `value` in the procedure list data-k=`k` (p-dep-… / p-arr-…), its side unfolded and its line opened first."""
    show_list(c, k)
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
    c.eq(norm(c.text(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]') or ''), norm(row(c, 'procRead').replace('{icao}', 'LFQQ')), 'the button names the aerodrome', what='button')
    c.ge(round(c.box(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]')['h']), 44, 'a 44 px target', what='button height')
    # BUGS SOG, 1 Nov (the user's capture, Aqua): the 44 px box of the link rose 10 px over the title (margin -10px) and the design's button
    # shadow painted it; whatever the design paints on buttons, the link paints nothing, and its line keeps the room of its target
    c.js("document.documentElement.style.cssText += ';--sog-btn-shadow:0 2px 6px rgb(255 0 0);--sog-btn-bg:rgb(255 0 0);--sog-btn-border:2px solid rgb(255 0 0)'")
    c.page.hover(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]')
    look = c.js("(() => { const s = getComputedStyle(document.querySelector('[data-module=fuel] [data-proc=dep] [data-do=procfetch]')); return [s.boxShadow, s.backgroundColor, s.borderTopWidth] })()")
    c.eq(look, ['none', 'rgba(0, 0, 0, 0)', '0px'], 'no shadow, background or border on the link, even hovered under a design that paints buttons', what='link look')
    title, btn = c.box(f'{FUEL} [data-proc="dep"] .fu-proctitle'), c.box(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]')
    c.ok(btn['t'] >= title['b'] - 0.5, f'button top {btn["t"]:.1f}, title bottom {title["b"]:.1f}', 'the target does not cover the title above it')
    c.tap(f'{FUEL} [data-proc="dep"] [data-do="procfetch"]')
    want = norm(tx(PT, "no-launcher'", c.lang, after='procReasons'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, timeout=6000,
            what='the refusal reason (no launcher serves the test page: aerodb answers "no-launcher") is shown in a notification')
    c.until("!!document.querySelector('[data-module=fuel] [data-proc=dep] [data-do=procfetch]:not([disabled])')", what='the button is available again after a refusal')
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
    open_foot(c, 'arr')
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


@case('F34', 'Procedures card: titled with the name, one secondary line (in the foot), never wider than its place', 'F', tags=('fuel', 'aerodb', 'layout'),
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
    # SOG-0308: the grid of three columns gave way to lines (F209); the card never overflows its width, beside the map nor on a phone
    for w in (1280, 390):
        c.page.set_viewport_size({'width': w, 'height': 844 if w < 600 else 800})
        c.settle()
        to_step(c, 1)
        wait_rows(c, 'arr')
        fit = c.js("(() => { const b = [...document.querySelectorAll('[data-module=fuel] .fu-procbox')].find(x => x.offsetParent); return { over: b.scrollWidth > b.clientWidth + 1, w: b.clientWidth } })()")
        c.ok(not fit['over'], f'{fit}', f'{w} px: the card never overflows its width')
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
    show_list(c, 'p-dep-sid')   # SOG-0308: a list is shown by its line's « Changer »
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
        pick_proc(c, k, v)
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
    open_foot(c, 'arr')
    c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]')
    want = norm(row(c, 'procCountRead1').replace('{read}', '0').replace('{pages}', '31'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", want, timeout=8000, what=f'the failure notification says "{want}"')
    note = next(norm(n) for n in c.note_log() if want in norm(n))
    reason = norm(tx(PT, "none-read'", c.lang, after='procReasons').split('{m}')[0].replace('{icao}', 'LFML'))
    c.ok(note.startswith(reason) and note.index(want) > len(reason) - 1, f'{note!r}', f'the counts come after the reason ({reason!r})')
    c.ok('no procedure could be read' not in note, f'{note!r}', 'with counts, the launcher\'s English message is not repeated')


@case('F258', 'A reading that read nothing, said in the screen\'s language from the launcher\'s code (« none-read »), counts and coded reasons — '
      'never the launcher\'s English sentence', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0433 (the user: « no procedure could be read for this aerodrome: 9 document(s), 0 of 9 page(s) read » shown in English); '
      'AeroDB bf397af95: { reason: failed, code: none-read, counts { docs, read, pages }, reasons [[code, n]] }, the English sentence kept in '
      '`message` as the fallback of an older launcher; the reasons by AeroCatalogue.READ_REASONS')
def f258(c):
    # aerodb.fetchProcedures answers the coded failure, without stats (the form that showed the English sentence)
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a);
          try { db.fetchProcedures = async () => ({ ok: false, reason: 'failed', code: 'none-read', counts: { docs: 9, read: 0, pages: 9 },
            reasons: [['layout', 9], ['<b>x</b>', 2]],
            message: 'no procedure could be read for this aerodrome: 9 document(s), 0 of 9 page(s) read (mise en page non reconnue ×9)' }) } catch (e) {}
          return db } } } }) })()""")
    open_proc(c)
    wait_rows(c, 'arr')
    open_foot(c, 'arr')
    c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]')
    layout = norm(tx('frame/aerodb/catalogue.js', 'layout', c.lang, after='READ_REASONS = {'))
    # the sentence carries « (s) » plurals the frame resolves on display (« 9 documents »): its head is awaited, then its numbers and reason
    head = norm(tx(PT, 'procNoneRead', c.lang).split('{d}')[0].replace('{icao}', 'LFML'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", head, timeout=8000,
            what=f'the failure said « {head} … »')
    note = next(norm(n) for n in c.note_log() if head in norm(n))
    c.ok(note.startswith(head) and f'({layout} ×9)' in note and len(re.findall(r'\b9\b', note)) >= 3 and re.search(r'\b0\b', note) is not None,
         note, 'in the screen\'s language: 9 documents, 0 page read of 9, the reason by the catalogue')
    c.ok('could be read' not in note and 'for this aerodrome' not in note, note, 'never the launcher\'s English sentence')
    c.ok('<b>' not in note, note, 'a reason code outside the form is dropped')


@case('F265', 'aerodb.adoptProcRead: a reopened page finds the procedures reading the launcher is still running for ITS aerodrome (eaip, '
      'EAD, UK package), follows it and ends it like a reading started here (files revalidated, a second reading « busy » meanwhile); '
      'another aerodrome, another verb or a launcher without `current` is left alone; a job released by the launcher says « released »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0438 (SOG-0430: a page closed in the middle of proc/ukpkg-fetch left the job running, the reopened page read again or was '
      'refused « busy », never got the result); V3 Frame 137c85453: launcher.current(route); the exception the ergonomist granted Features '
      'SOG in frame/aerodb/aerodb.js for this resume only')
def f265(c):
    c.open('fuel', docs=flight_docs())
    got = c.js("""async () => {
      const mk = (cur, end) => {
        const seen = { resumed: 0, revalidated: [] };
        let release;
        const gate = new Promise(r => { release = r });
        const launcher = { info: () => ({ lnm: [] }), job: async () => ({ ok: false, status: 409 }), current: async () => seen.ended ? null : cur,
          resume: async (route, o = {}) => { seen.resumed++; o.onProgress?.({ step: 'cartes', done: 5, total: 9 }); await gate; seen.ended = true; return end } };
        const reader = { read: async () => null, list: async () => [], watch: () => () => {}, revalidate: async paths => { seen.revalidated.push(...paths) } };
        return { db: AeroDB.create({ reader, lnmperf: false, launcher }), seen, release };
      };
      const ok = { job: 'j1', state: 'done', ok: true, result: { ok: true, warnings: [], stats: { pages: 9, read: 9 } } };
      const out = {};
      // the same aerodrome, the UK package verb: adopted, followed, ended like a reading started here
      let m = mk({ id: 'j1', set: 'proc', verb: 'ukpkg-fetch', args: { icao: 'EGZZ' }, step: 'cartes', done: 2, total: 9 }, ok);
      const prog = [], a = await m.db.adoptProcRead('egzz', { onProgress: p => prog.push(p) });
      out.adopted = a && [a.icao, a.source, a.done, a.total];
      out.busy = (await m.db.fetchProcedures('EGZZ', { source: 'ukpkg' })).reason;
      m.release();
      const r = await a.result;
      out.result = [r.ok, r.source, m.seen.revalidated.sort()];
      out.progress = prog.map(p => [p.done, p.total, p.source]);
      out.again = await m.db.adoptProcRead('EGZZ');
      // another aerodrome, another verb, nothing running: left alone, nothing followed
      m = mk({ id: 'j2', set: 'proc', verb: 'eaip-fetch', args: { icao: 'LFAA' } }, ok);
      out.otherAd = [await m.db.adoptProcRead('LFZZ'), m.seen.resumed];
      m = mk({ id: 'j3', set: 'base', verb: 'build', args: { icao: 'LFZZ' } }, ok);
      out.otherVerb = [await m.db.adoptProcRead('LFZZ'), m.seen.resumed];
      m = mk(null, ok);
      out.none = await m.db.adoptProcRead('LFZZ');
      // a job released by the launcher (SOG-0432 c): « released », nothing read again
      m = mk({ id: 'j4', set: 'proc', verb: 'ead-fetch', args: { icao: 'EDZZ' } }, { state: 'cancelled', result: { reason: 'released' } });
      const b = await m.db.adoptProcRead('EDZZ');
      m.release();
      out.released = [b.source, (await b.result).reason];
      // Sécurisation: resume follows ANOTHER job (started or ended between current and resume): « released », nothing of it shown
      m = mk({ id: 'j5', set: 'proc', verb: 'eaip-fetch', args: { icao: 'LFRS' } },
        { job: 'j9', verb: 'base-fetch', state: 'done', ok: true, result: { ok: true, warnings: ['OTHER'], stats: { pages: 1 }, commit: 'zz' } });
      const d = await m.db.adoptProcRead('LFRS');
      m.release();
      const dr = await d.result;
      out.otherJob = [dr.ok, dr.reason, JSON.stringify(dr).includes('OTHER'), m.seen.revalidated.length];
      // a launcher without current (before V3 Frame 137c85453): nothing
      const old = AeroDB.create({ reader: { read: async () => null, list: async () => [], watch: () => () => {} }, lnmperf: false,
        launcher: { info: () => ({}), job: async () => null } });
      out.oldLauncher = await old.adoptProcRead('EGZZ');
      return out;
    }""")
    c.eq(got['adopted'], ['EGZZ', 'ukpkg', 2, 9], 'the running reading of THIS aerodrome found: its source and its progress', what='adopted')
    c.eq(got['busy'], 'busy', 'while it is followed, a second reading of the aerodrome is « busy » (never a second job)', what='busy')
    c.eq(got['result'], [True, 'ukpkg', ['proc/manual/EGZZ.json', 'proc/manual/index.json']],
         'its end like a reading started here: ok, the two files revalidated', what='end')
    c.eq(got['progress'], [[5, 9, 'ukpkg']], 'its progress passed on', what='progress')
    c.eq(got['again'], None, 'ended: nothing left to adopt', what='again')
    c.eq(got['otherAd'], [None, 0], 'another aerodrome\'s reading: not touched, not followed', what='other aerodrome')
    c.eq(got['otherVerb'], [None, 0], 'another job: not touched', what='other verb')
    c.eq(got['none'], None, 'nothing running: nothing', what='nothing')
    c.eq(got['released'], ['ead', 'released'], 'a job released by the launcher: « released », not read again', what='released')
    c.eq(got['otherJob'], [False, 'released', False, 0], 'resume followed another job: « released », nothing of it shown, no file '
         'revalidated (Sécurisation)', what='other job')
    c.eq(got['oldLauncher'], None, 'a launcher without current: nothing (and nothing breaks)', what='old launcher')


# SOG-0438: the procedures card of a reopened page — aerodb.adoptProcRead stubbed: LFML's reading is found running (eaip, 3/12), its end
# given by window.__adoptEnd(res)
_ADOPT_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { db.adoptProcRead = async (icao, o = {}) => { if (String(icao).toUpperCase() !== 'LFML') return null;
          window.__adoptProgress = o.onProgress;
          return { icao: 'LFML', source: 'eaip', step: 'pages', done: 3, total: 12, result: new Promise(r => { window.__adoptEnd = r }) } } } catch (e) {}
      return db } } } }) })()"""


@case('F266', 'Procedures card of a reopened page: the reading the launcher is still running for the arrival is found again — « reading … '
      '3/12 » on its button, said found again, its progress followed — and its end said like a reading started here; released by the '
      'launcher: « à relire »', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0438; aerodb.adoptProcRead stubbed (the aerodb part is F265)')
def f266(c):
    PTX = 'modules/fuel/procedures_texts.js'
    c.page.add_init_script(_ADOPT_STUB)
    c.page.set_viewport_size({'width': 390, 'height': 844})
    open_proc(c)
    c.until('typeof window.__adoptEnd === "function"', timeout=15000, what='the running reading of LFML found at mount')
    open_foot(c, 'arr')   # the reading line is under the foot « Source et cartes » (SOG-0308)
    found = norm(tx(PTX, 'procResumed', c.lang)).split('{icao}')[0].strip()
    c.until(_NOTE, found, timeout=5000, what='said found again')
    btn = f'{FUEL} [data-do="procfetch"][data-icao="LFML"]'
    c.until(f"/3\\/12/.test(document.querySelector('{btn}')?.textContent || '')", timeout=8000, what='its button: the reading and 3/12')
    c.js("window.__adoptProgress({ source: 'eaip', done: 7, total: 12 })")
    c.until(f"/7\\/12/.test(document.querySelector('{btn}')?.textContent || '')", timeout=5000, what='its progress followed: 7/12')
    c.js(f"document.querySelector('{btn}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F266_{c.design}_390_{c.lang}_found.png')   # the line and its notification « … retrouvée », for the ergonomist
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js("window.__adoptEnd({ ok: false, reason: 'released' })")
    rel = norm(tx(PTX, 'released', c.lang, after='procReasons')).replace('{icao}', 'LFML')[:30]
    c.until(_NOTE, rel, timeout=5000, what='released by the launcher: « à relire »')


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
AD = 'frame/lib/ad_field.js'  # the field's texts: the shared block since SOG-0465 (modules/fuel/adnames.js is its wrapper)


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
    not) and metar.vatsim.net's raw text (without a launcher). SOG-0527 (3): a third value, (wdir, wspd, age_s), makes that
    observation age_s seconds old."""
    import re as _re
    import time as _t
    now = int(_t.time())

    def at(w):
        return now - (int(w[2]) if len(w) > 2 else 0)

    def raw(i, w):
        return f'{i} {_t.strftime("%d%H%M", _t.gmtime(at(w)))}Z {w[0]:03d}{w[1]:02d}KT CAVOK 15/10 Q1015'

    def aw(route):
        route.fulfill(status=200, content_type='application/json', body=json.dumps([
            {'icaoId': i, 'obsTime': at(w), 'reportTime': at(w), 'wdir': w[0], 'wspd': w[1], 'visib': '6+', 'clouds': [{'cover': 'CAVOK'}],
             'temp': 15, 'dewp': 10, 'altim': 1015, 'rawOb': raw(i, w), 'fltCat': 'VFR'} for i, w in items.items()]))

    def vatsim(route):
        route.fulfill(status=200, content_type='text/plain', body='\n'.join(raw(i, w) for i, w in items.items()))
    c.context.route(_re.compile(r'aviationweather\.gov(/|%2F)api(/|%2F)data(/|%2F)metar', _re.I), aw)
    c.context.route(_re.compile(r'metar\.vatsim\.net', _re.I), vatsim)


@case('F64', 'Wind on each runway of the procedure card, from the known METAR', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=True, rule='V3 spec 10.30, in words since SOG-0308 (the mock-up: « face 12 kt · travers 6 kt », no arrow alone; the Map keeps '
      'wind.label) from the METAR of the Departure step; green / orange / red by wind.severity, the reason in the title; no METAR, no suffix')
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
    head, tail = norm(tx(PT, 'windHead', c.lang).replace('{kt}', '12')), norm(tx(PT, 'windTail', c.lang).replace('{kt}', '12'))
    c.ok(head in norm(by['31L']['t']) and by['31L']['cls'] == 'wind-ok', f"{by['31L']}", 'runway 31L: 12 kt of head wind, in words, green (wind-ok)')
    c.ok(tail in norm(by['13R']['t']) and by['13R']['cls'] == 'wind-alert', f"{by['13R']}", 'runway 13R: 12 kt of tail wind, in words, red (wind-alert: over 5 kt)')
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
    v = "(k) => (document.querySelector('[data-module=fuel] [data-proc=arr] [data-r=v-' + k + ']')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()"
    c.until(f"({v})('rwy').includes('kt')", timeout=20000, what='the arrival runway line gets the wind of the METAR')
    arr = [c.js(f"({v})('{k}')") for k in ('rwy', 'main', 'app')]
    # the runway's axis is the Map's rule since the refactoring R-F1 (§ 10.33): threshold → opposite threshold before the QFU; the invented
    # thresholds of LFML give 134° (their QFU says 130°), hence the 1 kt of crosswind
    want = ['13R — ' + norm(tx(PT, 'windTail', c.lang).replace('{kt}', '12')) + ' · ' + norm(tx(PT, 'windCross', c.lang).replace('{kt}', '1')),
            'MEN1A · ' + norm(tx(PT, 'procTransWord', c.lang)) + ' NEPIX', 'ILS 13R']
    c.eq([norm(x) for x in arr], want, 'runway with its wind in words, STAR with its transition, approach', what='arrival lines')
    c.ok(c.js("document.querySelector('[data-module=fuel] [data-proc=arr] [data-prow=rwy]').classList.contains('fu-pwarn')"), 'no warning',
         'a tail wind over the limits: the runway line is a warning')
    dep = norm(c.text(f'{FUEL} [data-proc="dep"] [data-procsum] .fu-sumtext') or '')
    c.eq(dep, norm(tx(PT, 'procRwyWord', c.lang).replace('{r}', '03') + ' · ' + f"{row(c, 'procSid')} {row(c, 'procNone')}"),
         'folded, no METAR: the runway alone; « Aucune » said with its kind', what='departure sentence')


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
    c.until("(document.querySelector('[data-module=fuel] [data-proc=arr] [data-r=v-app]')?.textContent || '').trim().startsWith('RNP 06')", what='the approach line says the short label')


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
    # SOG-0354 (the ergonomist, 16 Nov: « une notification passe, une ligne reste »): a fixed muted line under the route, like the NAT one
    line = norm(row(c, 'awyBad')).replace('{w}', 'A3')
    W = f'{FUEL} [data-awywarn]'
    c.until(f"(e => !!e && !e.hidden)(document.querySelector('{W}'))", timeout=6000, what=f'the line « {line} »')
    c.eq(norm(c.text(W)), line, '« Voie A3 : non reliée dans la base, tronçon tracé en direct »', what='line')
    c.ok(c.js(f"document.querySelector('{W}').classList.contains('f-muted')"), '', 'muted, like the NAT line')
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.js(f"document.querySelector('{W}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F68_{c.design}_390_{c.lang}_awyline.png')
    c.ok(not any('A3' in n for n in (c.js('window.__notes || []') or [])), c.js('window.__notes || []'), 'no passing notification any more')
    c.ok('A3' in c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value").split(), 'text', 'the word the pilot typed stays in the text')
    c.page.fill(rt, 'LFBO LACOU7B LACOU LMG BALAN OLINO AMB GILUX MOTAL J18 KOTAP LFPO')
    c.page.locator(rt).blur()
    c.until(f"document.querySelector('{W}')?.hidden === true", timeout=8000, what='the line leaves with the airway')


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
    # SOG-0089: NTS1A serves runway 03 only, which it sets; the chosen runway is written after its aerodrome
    c.until(f"{rt} === 'LFRS/03 NTS1A NT102 DCT LUGEN DCT NEPIX LFML'", timeout=8000,
            what='the runway, the SID name then its exit after the departure, in ICAO form: « LFRS/03 NTS1A NT102 DCT LUGEN DCT NEPIX LFML »')
    line = norm(row(c, 'procExitDct')).replace('{sid}', 'NTS1A').replace('{exit}', 'NT102').replace('{next}', 'LUGEN')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\u00a0\u202f]+/g, ' ').trim() === w)", line, timeout=6000, what=f'the line « {line} »')
    pick_proc(c, 'p-arr-star', 'LFML.STAR.MEN1A.RW13R.NONE')
    c.until(f"{rt}.endsWith('NEPIX DCT MEN01 MEN1A LFML/13R')", timeout=8000, what='the STAR entry then its name before the arrival (and its runway 13R)')
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
    c.eq(v['onmap'], 2, 'one « Choisir sur la carte » per side', what='visible « Choisir sur la carte »')
    c.ok(v['controls'] < 7, f'{v}', 'fewer than seven controls visible at opening')
    c.ok(not c.js("!!document.querySelector('[data-module=fuel] .fu-proctitle [data-do=procfetch], [data-module=fuel] .fu-proctitle [data-source-slot]')"), 'title',
         '« Relire » and « Source » are not in the summary line')
    # a tap on the arrival line (not on a button) unfolds it; then the departure line unfolds the departure and folds the arrival
    c.tap(f'{FUEL} [data-proc="arr"] .fu-prochead')
    c.until("!document.querySelector('[data-module=fuel] .fu-proc.fu-folded[data-proc=arr]')", what='the arrival unfolds')
    c.eq(c.js(vis)['selects'], 0, 'SOG-0308: the arrival\'s three lines, no list until a « Changer »', what='visible lists')
    c.eq(c.count(f'{FUEL} [data-proc="arr"] [data-do="procchange"]'), 3, 'one « Changer » per line', what='Changer')
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
    want = 'LFRS/21 LUGEN2B LUGEN DCT NEPIX LFML'   # SOG-0089: the chosen runway after its aerodrome
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
    # SOG-0337 (l'ergonome, 14/11) : pendant une limite de GitLab, la ligne ne promet plus « quelques secondes » : elle dit seulement l'attente
    c.ok(not any(x in wait.lower() for x in ('seconde', 'second', 'sekunde', 'segundo')), wait, 'the wait promises no duration (a GitLab limit can hold it)')
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
    c.eq(got['fleet'][0], 'Flotte de la compagnie (2 aéronefs)', 'the fleet', what='fleet')
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
_SLOT_JS = """(s) => { const e = document.querySelector('[data-module=fuel] [data-proc=' + s + ']'); return e ? {
    charts: !!e.querySelector('[data-source-slot] [data-charts]'),
    chart: [...e.querySelectorAll('[data-chart-slot] [data-chart]')].map(a => [a.dataset.chart, a.getAttribute('href'), a.target, a.rel, a.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()]) } : null }"""


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
    one = norm(tx(PT, 'procChartOne', c.lang))
    want = [['RWY', 'https://charts.invalid/LFRS.RWY.03.pdf', '_blank', 'noopener noreferrer', one],
            ['SID', 'https://charts.invalid/LFRS.SID.NTS1A.RW03.NONE.pdf', '_blank', 'noopener noreferrer', one]]
    c.until("(s) => document.querySelectorAll('[data-module=fuel] [data-proc=' + s + '] [data-chart-slot] [data-chart]').length === 2", 'dep',
            what='the two charts of the departure')
    c.eq(c.js(_SLOT_JS, 'dep'), {'charts': True, 'chart': want}, 'one « Carte » on the line of each choice (SOG-0308), its address as aerodb gives it; '
         '« Toutes les cartes du terrain » at the foot', what='departure with chartUrl')
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
    c.until("document.querySelectorAll('[data-module=fuel] [data-procbox=start] [data-proc=dep] [data-chart-slot] [data-chart]').length === 2",
            what='the two charts of the departure in flight')
    c.eq(c.js(_SLOT_JS, 'dep'), {'charts': True, 'chart': want}, 'in flight: the same « Carte » links', what='in-flight departure')


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
    # SOG-0296: the first request (no `alternatives`) answers the head route only; the second (alternatives true) all of them; a refused
    # plan's proposals come at once (its recourse); st['delay_alt'], st['fail_alt'], st['cache'] shape the second / both
    phase = lambda lst, a: lst if a.get('alternatives') or (lst and lst[0].get('proposal')) else lst[:1]
    alts = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]),
            _alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, [_seg('LFRS', 'NEPIX'), _seg('NEPIX', 'LFML')]),
            _alt(3, 'Direct · FL190', 'LFRS LUGEN LFML', 380, 190, [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'LFML', {'kind': 'ceiling', 'text': 'plafond 19500 ft', 'deltaFt': 500})],
                 sid=False)]
    checked = _alt(1, 'Direct', 'LFRS LUGEN NEPIX LFML', 370, 270,
                   [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX', {'kind': 'RAD', 'text': 'Interdiction RAD LF9999', 'ruleId': 'LF9999'}),
                    _seg('NEPIX', 'LFML', {'kind': 'ceiling', 'text': 'plafond 19500 ft, prévu 27000 ft', 'deltaFt': 7500})], sid=False)
    common = {'rad': {'title': 'RAD test', 'start': '2026-10-29'}, 'fra': None, 'report': '', 'limitation': 'Précontrôle de simulation, jamais une validation IFPS.',
              'gaps': [{'name': 'RAD complet', 'reason': 'Seules les interdictions simples H24.'}]}

    def polled():
        """The job a GET follows (?id=jN), else the last one posted (SOG-0529: two jobs at once never mix)."""
        i = urllib.parse.parse_qs(urllib.parse.urlparse(polled.url).query).get('id', [''])[0]
        n = int(i[1:]) if i[:1] == 'j' and i[1:].isdigit() else 0
        return st['posts'][n - 1] if 1 <= n <= len(st['posts']) else (st['posts'][-1] if st['posts'] else {})

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        polled.url = req.url
        body = {}
        if st.get('down') and '/__setup/regen/' in u.path:   # SOG-0208: the launcher stopped after the mount, its jobs do not answer
            return route.abort()
        if u.path.endswith('/__setup/status'):
            body = _LAUNCHER_STATUS
        elif u.path.endswith('/__setup/regen/verbs'):
            body = {'verbs': st['verbs']}
        elif u.path.endswith('/__setup/folders'):
            body = {'folders': st.get('folders', [])}   # the launcher's shape (tools/launch.py _get_folders)
        elif u.path.endswith('/__setup/regen/job') and req.method == 'POST' and st.get('busy'):
            route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'reason': 'busy', 'message': 'a job is already running', 'job': 'g1'}))
            return
        elif u.path.endswith('/__setup/regen/job') and req.method == 'POST':
            st['posts'].append(json.loads(req.post_data or '{}'))
            st['t'] = time.time()
            body = {'job': 'j' + str(len(st['posts']))}
        elif u.path.endswith('/__setup/regen/job/cancel'):
            st.setdefault('cancels', []).append(json.loads(req.post_data or '{}'))
            body = {'ok': True}
        elif u.path.endswith('/__setup/regen/job') and req.method != 'POST' and st['posts'] and 'levels' in (polled().get('args') or {}):
            # SOG-0529: route/levels — the answer given by the case's rule for the levels asked (st['levels_rule'])
            asked = (polled().get('args') or {}).get('levels') or []
            rule = st.get('levels_rule')
            res = rule(asked) if rule else {'ok': False, 'reason': 'failed', 'message': 'no rule'}
            jid = urllib.parse.parse_qs(u.query).get('id', ['j' + str(len(st['posts']))])[0]
            body = {'id': jid, 'state': 'running', 'step': '', 'done': 0, 'total': 1, 'unit': '', 'log': []} if res is None \
                else {'id': jid, 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': '', 'log': [], 'result': res}
        elif u.path.endswith('/__setup/regen/job') and st['posts'] and (st['posts'][-1].get('args') or {}).get('alternatives') \
                and time.time() - st.get('t', 0) < st.get('delay_alt', 0):
            body = {'id': 'j' + str(len(st['posts'])), 'state': 'running', 'step': '', 'done': 0, 'total': 1, 'unit': '', 'log': []}
        elif u.path.endswith('/__setup/regen/job') and time.time() - st.get('t', 0) < st.get('delay', 0):
            # SOG-0134: a slow launcher (st['delay'] seconds after the request): the job says « running » until then
            body = {'id': 'j' + str(len(st['posts'])), 'state': 'running', 'step': '', 'done': 0, 'total': 1, 'unit': '', 'log': []}
        elif u.path.endswith('/__setup/regen/job'):
            last = (st['posts'][-1].get('args') or {}) if st['posts'] else {}
            a = (polled().get('args') or {}) if 'levels' in last else last  # SOG-0529: a route/levels job posted after it never answers for it
            res = {'ok': False, 'reason': 'no-rad', 'message': 'no RAD imported on this workstation: import the EUROCONTROL RAD workbooks first (job route/import-rad)'} \
                if st['norad'] else {'ok': False, 'reason': 'failed', 'message': 'search stopped'} if a.get('action') == 'compute' and a.get('alternatives') and st.get('fail_alt') else \
                dict(dict(common, ok=True, alternatives=phase(st.get('alts') or alts, a), segments=alts[0]['segments'], issues=[], message='2 alternative(s).',
                     **({'cache': st['cache']} if st.get('cache') else {})), **(st.get('extra') or {})) if a.get('action') == 'compute' else \
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
    c.eq(c.count(f'{FUEL} [data-rengnone]:not([hidden])'), 0, 'with the launcher: no « demande le lanceur » line', what='with launcher')
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
    bare = lambda t: [w for w in str(t).split() if w != 'DCT']  # the field's text and the flight's normalised one (« DCT » written in) are one route
    c.eq([chk['adep'], chk['adest'], bare(chk['route']), chk['fl']], ['LFRS', 'LFML', bare(typed), 270], 'the typed route sent as it is', what='check args')
    # Calculer A → B: the typed points are imposed; the computed route and two alternatives; « Prendre » the first alternative
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='the computed route and two alternatives')
    comps = [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'compute']
    comp = comps[0]
    # SOG-0517: the route already in the field (not typed by the pilot) imposes nothing — it never carries itself over (F284)
    c.eq([sorted(comp), comp['via'], comp['proposals'], comps[1]], [sorted(['action', 'adep', 'adest', 'via', 'date', 'fl', 'proposals']), [], True, dict(comp, alternatives=True)],
         'a route already in the field imposes no passage (SOG-0517) and the proposals of an impossible plan asked (AeroDB 9a7f1dde3); the alternatives in a second request (SOG-0296)', what='compute args')
    names = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-altname]')].map(e => e.textContent.trim())")
    c.eq(names, ['Via UN10', 'Direct · FL250', 'Direct · FL190'], 'each route named by the launcher', what='names')
    before = cf_doc(c, lambda d: True, 'the flight')['route']['text']
    c.tap(f'{FUEL} [data-alt="1"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: 'LUGEN' not in [p.get('id') for p in (d.get('route') or {}).get('points') or []] and procs_of(d, 'dep').get('sid') == _SID
               and procs_of(d, 'arr').get('star') == _STAR, 'route, SID and STAR of the taken route written', timeout=10000)
    c.ok(before != d['route']['text'], d['route']['text'], 'the route text changed only after « Prendre »')
    # SOG-0224 (user, 11/11: « faire disparaitre les alternatives »): the others are gone at once, one line says the route taken
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rtaken]')", timeout=5000, what='the line « Itinéraire pris »')
    c.eq(c.count(f'{FUEL} [data-routealts] [data-alt]'), 0, 'the other routes are gone, without changing screen', what='alternatives')
    c.ok('Direct · FL250' in (c.text(f'{FUEL} [data-rtaken]') or ''), c.text(f'{FUEL} [data-rtaken]'), 'the line names the route taken')
    c.js(f"document.querySelector('{FUEL} [data-rtaken]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F109_taken_{c.design}_390_{c.lang}_delivered.png')
    # without the job: no buttons
    st['verbs'] = []
    open_proc(c)
    c.settle()
    c.eq(c.count(f'{FUEL} [data-reng]:not([hidden])'), 0, 'no job route/compute: no buttons', what='no launcher job')
    # SOG-0322 (the user, from the published site: « pas de compute A-B ? que faut-il pour ça ? ») : the screen says why
    c.until(f"!!document.querySelector('{FUEL} [data-rengnone]:not([hidden])')", timeout=8000, what='« Le calcul d’itinéraire demande le lanceur »')
    c.ok(norm(tx('modules/fuel/module.js', 'rNeedLauncher', c.lang)) in norm(c.text(f'{FUEL} [data-rengnone]')), c.text(f'{FUEL} [data-rengnone]'), 'said in words')


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


@case('F114', 'Route step: the proposed routes published for the Map (event and document), the hovered row and the choice too; a route touched on the Map is shown, not taken',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 (a), voie (i) decided by the ergonomics session on 9 Nov (one map, the real one): Fuel resolves and publishes '
      '(fuel-route-alts, cache/fuel/route_alts.json, modules/fuel/INTEGRATION.md § 3 bis), draws nothing; maps-route-alt-show shows a route (SOG-0134 refused '
      'on 10 Nov: « si on clique sur l\'itinéraire (carte ou fuel), ça l\'affiche, mais ne le choisit pas »), « Choisir » and #fuel?ralt= take it')
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
    # a route touched on the Map (double view): SHOWN here (marked, published), not taken; « Choisir » takes it
    before = (c.doc('pilot/ABC/current_flight.json') or {}).get('route', {}).get('text', '')
    c.js("window.dispatchEvent(new CustomEvent('maps-route-alt-show', { detail: { index: 1 } }))")
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt=\"1\"][data-shown]') && ({_ALTS_LAST} || {{}}).shown === 1", what='the route touched on the Map is shown')
    c.settle()
    c.eq((c.doc('pilot/ABC/current_flight.json') or {}).get('route', {}).get('text', ''), before, 'shown, not taken: the route of the flight unchanged', what='not taken')
    c.js("window.dispatchEvent(new CustomEvent('maps-route-alt-show', { detail: { index: 7 } }))")
    c.settle()
    c.eq(c.js(_ALTS_LAST)['shown'], 1, 'an index outside the list is ignored', what='bad index')
    # a Map alone: #fuel?ralt=2 takes the third route from the document (before any « Choisir »: a choice clears the alternatives)
    c.go('fuel?ralt=2')
    cf_doc(c, lambda d: [w for w in str((d.get('route') or {}).get('text', '')).split() if w != 'DCT'][:3] == ['LFRS', 'LUGEN', 'LFML'], 'the address ralt=2 takes the third route', timeout=12000)
    # « Choisir » (SOG-0224, user 11/11: « valider l'itinéraire, modifier la route, et faire disparaitre les alternatives »): a new
    # computation, then the choice: route written, the alternatives published EMPTY (event and document: the Map clears them), the list gone
    c.js(_ALTS_LISTEN)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the buttons again')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='three routes again')
    c.tap(f'{FUEL} [data-alt="1"] [data-do="rtake"]')
    cf_doc(c, lambda d: 'LUGEN' not in [q.get('id') for q in (d.get('route') or {}).get('points') or []] and procs_of(d, 'dep').get('sid') == _SID,
           '« Choisir » takes it (route, SID)', timeout=10000)
    c.until(f"(() => {{ const d = {_ALTS_LAST}; return !!d && Array.isArray(d.alternatives) && d.alternatives.length === 0 }})()", timeout=5000,
            what='the alternatives published empty at once (the Map clears its layer and its legend)')
    c.until_doc('cache/fuel/route_alts.json', lambda x: x is not None and len(x.get('alternatives') or []) == 0, 'the document too', timeout=8000)
    c.eq(c.count(f'{FUEL} [data-routealts] [data-alt]'), 0, 'the other routes gone in Fuel, same screen', what='alternatives in Fuel')
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
      'launcher\'s answer; route_alts.json carries control per segment for the Map\'s layer (BUGS SOG); a fake launcher; SOG-0532 (the ergonomist, 20 Nov): « le partage n\'est montré que sous 100 % » — expectation changed on purpose')
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
    full['nat'] = {'tracks': ['A'], 'issued': '13/11', 'stale': True}   # SOG-0263: the engine took the NAT tracks of the day, stale
    st['alts'] = [part, full]
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 2", what='two routes')
    shares = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-share]')].map(e => e.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim())")
    # SOG-0532 (the ergonomist, 20 Nov — expectation changed on purpose): the share is shown only under 100 %, each number with its word
    # (« distance contrôlée : 22 % · données incomplètes : 65 % · sans réseau : 14 % »), the null parts left out
    c.eq(len(shares), 1, 'only the route under 100 % says its share', what='shares')
    c.ok(shares[0].count('%') == 3 and '22 %' in shares[0] and '65 %' in shares[0] and '14 %' in shares[0] and shares[0].count(':') >= 3, shares,
         'three numbers, each with its word: 22 / 65 / 14')
    c.eq(c.count(f'{FUEL} [data-altlist] [data-alt="1"] [data-share]'), 0, 'at 100 %: no share beside the route (never read as a green light)',
         what='100 %')
    # SOG-0263 (user, 12 Nov: the NAT tracks): the route that takes them says « via NAT A », and « périmée » when they are
    nat = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt]')].map(e => [e.querySelector('[data-nat]')?.textContent || '', "
               f"!!e.querySelector('[data-natstale]')])")
    c.eq(nat[0], ['', False], 'a route without NAT says nothing of them', what='no NAT')
    c.ok('NAT A' in nat[1][0] and '13/11' in nat[1][0] and nat[1][1], nat, '« via NAT A » and « périmée : routes NAT du 13/11 »')
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
    open_foot(c, 'arr')
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
      'alternatives `proposal` / `incomplete` with their `control`): never mixed with the checked routes, never « contrôlé » alone even at 100 %; a fake launcher; SOG-0532 (the ergonomist, 20 Nov): « le partage n\'est montré que sous 100 % » — expectation changed on purpose')
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
    # SOG-0532 (the ergonomist, 20 Nov — expectation changed on purpose): the share only under 100 %; never « contrôlé » alone
    c.ok(len(shares) == 1 and '40 %' in shares[0] and '60 %' in shares[0], shares,
         'the proposal under 100 % says its share in numbers; the one at 100 % shows none')
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
    c.until(f"(() => {{ const e = document.querySelector('{FUEL} [data-proc=arr] [data-appaid]'); return !!e && !e.hidden && /110[.,]30/.test(e.textContent) }})()", timeout=10000,
            what='the aid line of the chosen ILS')
    # SOG-0308: the line says « TST 110,30 » (the ident, the frequency with the language's decimal sign); the whole aid line in its title
    c.ok(norm(c.text(f'{FUEL} [data-proc="arr"] [data-appaid]')).startswith('TST 110'), c.text(f'{FUEL} [data-proc="arr"] [data-appaid]'), 'the ident and the frequency on the line')
    line = norm(c.attr(f'{FUEL} [data-proc="arr"] [data-appaid]', 'title'))
    want = norm(tx(PT, 'appAid', c.lang).replace('{type}', 'ILS').replace('{rwy}', '13R').replace('{id}', 'TST').replace('{freq}', '110.30').replace('{axis}', '134') + ' · DME')
    c.eq(line, want, '« ILS 13R · TST 110.30 · axe 134° · DME »: type and runway, ident and frequency, axis, DME', what='aid line')
    c.js(f"document.querySelector('{FUEL} [data-proc=arr] [data-appaid]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F127_{c.design}_{c.width}_{c.lang}.png')
    # the folded summary of the arrival says the ident and the frequency (the full line is under the lists, off screen when folded)
    c.ok(c.js(f"!!document.querySelector('{FUEL} [data-proc=arr] [data-prow=app] [data-appaid]')"), 'elsewhere', 'SOG-0308: the aid is the source of the approach line')
    summ = "[document.querySelector('[data-module=fuel] [data-proc=arr] [data-r=v-app]').textContent.trim()]"
    # the same approach, no ILS of LFML in the base (its navaids rewritten: an ILS of another aerodrome only): no line, no dash
    other = _ils_extra()
    other['navaids'][0].update(ad='LFMT', name='LFMT 13R')
    open_proc(c, procs=_ILS_PROCS, aero_extra=other)
    wait_rows(c, 'arr')
    c.settle()
    c.page.wait_for_timeout(1500)
    c.eq(c.js(f"(() => {{ const e = document.querySelector('{FUEL} [data-proc=arr] [data-appaid]'); return e ? [e.hidden, e.textContent.trim()] : null }})()"), [True, ''],
         'without an ILS in the base: no line (hidden, empty)', what='[hidden, text]')
    c.ok('ILS 13R' in c.js(summ) and not any('110' in x for x in c.js(summ)), c.js(summ), 'and the approach line says the approach alone')


@case('F128', 'Fuel beside the Map: after « New flight » the Map beside it is still pannable and the pane still resizable (SOG-0194)', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=True, phone=False, night=False,
      rule='SOG-0194 (2) — NOT reproduced here, kept as a guard of the path —, the user: « carburant -> devis -> vol -> nouveau vol … lfpo / lfmt -> la carte en sidecar s’affiche. impossible de la resizer ni de la bouger »: after « New flight » in Fuel with the dual view, the Map beside it answers a drag (the pan) and the pane keeps its handle; no element covers it, nothing is inert')
def f128(c):
    c.open('fuel', flight=False, docs=proc_flight(started=True, actual=(46.2, 1.4)), airfields=True,
           aero_extra={'aerodromes': [{'icao': 'LFPO', 'name': 'LFPO TEST', 'lat': 48.7233, 'lon': 2.3794, 'elev': 90}], 'cells': {'48': [[0, 4]]}})
    c.until("!!document.querySelector('.f-pane [data-module=maps] .maplibregl-canvas')", timeout=20000, what='the Map beside Fuel')
    c.wait(1500)
    c.js("async () => { window.__mp = await import('/modules/maps/state.js'); return true }")
    probe = """() => { const pane = document.querySelector('.f-pane'), cv = pane?.querySelector('.maplibregl-canvas'), S = window.__mp.S;
      if (!pane || !cv) return { ok: false };
      const r = cv.getBoundingClientRect(), pts = [[.5, .5], [.3, .3], [.7, .7]].map(([a, b]) => document.elementFromPoint(r.left + r.width * a, r.top + r.height * b));
      const covered = pts.filter(e => !e || !pane.contains(e)).length;
      const inert = [...pane.querySelectorAll('[inert]')].length + (pane.hasAttribute('inert') ? 1 : 0) + (document.getElementById('fView').hasAttribute('inert') ? 1 : 0);
      const c = S.map?.getCenter?.();
      return { ok: true, covered, inert, modal: document.querySelectorAll('.f-modal').length, center: c ? [+c.lng.toFixed(5), +c.lat.toFixed(5)] : null,
        pe: getComputedStyle(cv).pointerEvents, w: Math.round(r.width), h: Math.round(r.height), rect: [Math.round(r.left), Math.round(r.top)],
        drag: S.map?.dragPan?.isEnabled?.(), zoom: S.map?.scrollZoom?.isEnabled?.() } }"""
    drag = """async () => { const S = window.__mp.S, cv = document.querySelector('.f-pane .maplibregl-canvas'), r = cv.getBoundingClientRect(), a = S.map.getCenter();
      return [r.left + r.width / 2, r.top + r.height / 2, a.lng, a.lat] }"""
    before = c.js(probe)
    c.ok(before['ok'] and before['covered'] == 0 and before['inert'] == 0, str(before), 'at the start the Map beside Fuel is reachable')

    def pan():
        x, y, lng, lat = c.js(drag)
        c.page.mouse.move(x, y)
        c.page.mouse.down()
        c.page.mouse.move(x + 90, y + 40, steps=8)
        c.page.mouse.up()
        c.wait(400)
        n = c.js("() => { const c = window.__mp.S.map.getCenter(); return [c.lng, c.lat] }")
        return abs(n[0] - lng) + abs(n[1] - lat) > 1e-6
    c.ok(pan(), str(c.js(probe)), 'the Map beside Fuel answers a drag')
    # the pane’s handle (the sheet of the Map, frame/lib/sheet.js): a tap on it changes the position; a drag moves it
    sheet = "() => { const r = document.querySelector('.f-pane [data-module=maps]'); return r ? [r.dataset.sheet || '', !!r.querySelector('.f-sheet-head')] : null }"

    def handle():
        s0 = c.js(sheet)
        c.page.locator('.f-pane [data-module=maps] .f-sheet-head').first.evaluate("el => el.scrollIntoView({ block: 'nearest' })")
        b = c.page.locator('.f-pane [data-module=maps] .f-sheet-head').first.bounding_box()
        x, y = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
        c.page.mouse.move(x, y)
        c.page.mouse.down()
        c.page.mouse.move(x, y - 120, steps=8)
        c.page.mouse.up()
        c.wait(600)
        return [s0, c.js(sheet)]
    c.ok(c.js(sheet) and c.js(sheet)[1], str(c.js("() => [document.querySelector('.f-pane')?.className, [...document.querySelectorAll('.f-pane *')].slice(0, 12).map(e => e.tagName + '.' + e.className + '[' + (e.dataset.sheet || '') + ']')]")), 'the Map beside Fuel has its sheet and its handle')
    h0 = handle()
    c.ok(h0[0][0] != h0[1][0], str(h0), 'at the start a drag on the handle changes the sheet’s position')
    # the user’s path: a quote, the flight started, « New flight », two aerodromes
    c.tap(f'{FUEL} [data-do="newflight"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a started flight: the question')
    c.tap('.f-modal [data-ok]')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and not d['route'].get('dep') and not d['route'].get('arr'), 'the flight is emptied', timeout=10000)
    c.wait(1200)
    mid = c.js(probe)
    c.ok(mid['ok'] and mid['covered'] == 0 and mid['inert'] == 0 and mid['modal'] == 0, str(mid), 'after « New flight »: the Map is not covered, nothing inert, no dialog left')
    set_icao(c, 'dep', 'LFPO')
    set_icao(c, 'arr', 'LFMT')
    c.wait(2500)
    after = c.js(probe)
    c.ok(after['ok'] and after['covered'] == 0 and after['inert'] == 0, str(after), 'after the two aerodromes: the Map is still reachable')
    c.ok(pan(), str(c.js(probe)), 'after « New flight » and two aerodromes, the Map beside Fuel still answers a drag')
    h1 = handle()
    c.ok(h1[0][0] != h1[1][0], str(h1), 'after « New flight » and two aerodromes, the handle of the sheet still answers a drag')
    # the pane resized with the window: the Map’s canvas follows (the Map reads the size of its element again)
    w1 = c.js("() => document.querySelector('.f-pane .maplibregl-canvas').getBoundingClientRect().width")
    c.page.set_viewport_size({'width': 1100, 'height': 800})
    c.wait(1200)
    w2 = c.js("() => { const p = document.querySelector('.f-pane .maplibregl-canvas'); return p ? p.getBoundingClientRect().width : -1 }")
    c.page.set_viewport_size({'width': 1500, 'height': 800})
    c.wait(1200)
    w3 = c.js("() => { const p = document.querySelector('.f-pane .maplibregl-canvas'); return p ? p.getBoundingClientRect().width : -1 }")
    c.ok(w2 != w1 and w3 > w2, f'{w1} {w2} {w3}', 'after « New flight », resizing the window resizes the Map beside Fuel')
    c.check_errors()


@case('F129', '« Nouveau vol » leaves nothing of the old flight for the Map: the proposed routes are withdrawn from route_alts.json and from the step Route at the tap',
      'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0194 (user: « comment annuler une mission en cours de planif ? … nouveau vol. rien ne disparaît »): « Nouveau vol » empties the '
      'flight, the steps and what the Map draws from Fuel (INTEGRATION § 3 bis: route_alts.json); a fake launcher')
def f129(c):
    _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='the proposed routes')
    c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 3, 'the routes published for the Map', timeout=8000)
    c.tap(f'{FUEL} [data-do="newflight"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='« Nouveau vol » asks first')
    c.tap('.f-modal [data-ok]')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x is not None and not (x.get('alternatives') or []), 'the routes withdrawn for the Map', timeout=4000)
    c.eq(doc.get('alternatives'), [], 'route_alts.json holds no route: the Map draws none', what='alternatives')
    c.eq(c.count(f'{FUEL} [data-altlist] [data-alt]'), 0, 'and the step Route lists none', what='listed routes')
    c.eq(c.js(f"document.querySelector('{FUEL} input[data-k=dep]')?.value || ''"), '', 'the step Flight is empty at once', what='departure')



# the tap made by the page itself the moment the body waits (the wait of a new device is short and uneven: a tap from the case could land after
# it); the button's state just after the tap kept in window.__nb
_TAP_WHILE_READING = """(() => { window.__nb = null; const o = new MutationObserver(() => { const m = document.querySelector('[data-module=fuel]'),
  b = m?.querySelector('[data-body]'), x = m?.querySelector('[data-do=newflight]');
  if (window.__nb || !b?.inert || !x) return;
  x.click(); window.__nb = { busy: x.hasAttribute('aria-busy'), off: x.disabled, t: x.textContent.trim() }; o.disconnect() });
  o.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['inert'] }) })()"""


@case('F130', '« Nouveau vol » tapped while the current flight is still being read is never lost: the button says the wait at once, and the new flight is made as soon as the flight is read',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0194 (the ergonomist: « rien ne disparaît » — a tap during flightPending returned without a word, the button being outside the inert '
      'body): the wait of F84 (a first synchronisation that never answers, FLIGHT_WAIT_MS), a tap on « Nouveau vol » during it')
def f130(c):
    held = []
    c.context.add_init_script(_GITLAB_PILOT)
    c.context.add_init_script(_TAP_WHILE_READING)
    c.context.route(re.compile(r'^https://gitlab\.com/'), lambda r: held.append(r))
    c.open('fuel', flight=False, wait=False)
    c.until("!!window.__nb", timeout=15000, what='« Nouveau vol » tapped while the flight is being read (the body waits)')
    b = c.js('window.__nb')
    c.ok(b['busy'] and b['off'] and b['t'] == tx(F, 'newWaiting', c.lang), b, 'the button says the wait at once (busy, « Vol en cours de lecture… »)')
    want = norm(tx(F, 'newFlightDone', c.lang))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, timeout=12000,
            what='the new flight is made as soon as the flight is read')
    b = c.js("(() => { const b = document.querySelector('[data-module=fuel] [data-do=newflight]'); return { busy: b.hasAttribute('aria-busy'), off: b.disabled, t: b.textContent.trim() } })()")
    c.ok(not b['busy'] and not b['off'] and b['t'] == tx(F, 'newFlight', c.lang), b, 'the button is back to « Nouveau vol »')


@case('F200', 'Route step: a check the launcher refuses (another job runs: 409) says WHY and offers « Réessayer », never a bare « n’a pas répondu » (SOG-0206)',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0206 (10 Nov 2026): after the choice of a route, a runway and a SID, « Contrôler » answered « le contrôle n’a pas répondu »: the launcher had refused the job (409, the ground of the terrain being read in the background) and the screen kept the refusal to itself; the reason is now said (busy, offline, stopped, failed) with « Réessayer », which asks again')
def f200(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons (the launcher has the job)')
    st['busy'] = True
    c.tap(f'{FUEL} [data-do="rcheck"]')
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rrefused=busy]')", what='the refusal says its reason')
    c.ok(c.js(f"!!document.querySelector('{FUEL} [data-routealts] [data-rrefused=busy] [data-rretry]')"), 'no retry', 'with « Réessayer »')
    txt = c.js(f"document.querySelector('{FUEL} [data-routealts] [data-rrefused=busy]').textContent")
    c.ok('répondu' not in txt and 'answer' not in txt.lower().replace('another operation', ''), txt, 'and never « n’a pas répondu »')
    st['busy'] = False
    c.tap(f'{FUEL} [data-rrefused=busy] [data-rretry]')
    c.until(f"document.querySelectorAll('{FUEL} [data-segerr]').length === 2", what='« Réessayer » asks again: the check answers')


# a second Fuel on the same flight (another tab, another synchronised device): its own profile written over ours (SOG-0209)
_SECOND_FUEL = """async ([path, i]) => { const d = FrameData.adapter({ id: 'fuel-b', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
  const cur = (await d.get(path)) || {}, at = new Date().toISOString();
  await d.put(path, { ...cur, profile: { climbFpm: 1200 + i, climbKt: 220, descentFpm: 1500, descentKt: 250, tocNm: 20, todNm: 30 }, by: 'fuel', updated_at: at });
  return at }"""


@case('F132', 'No write of the current flight without a gesture: Fuel left alone writes nothing, and never rewrites its profile in answer to another writer\'s (another tab or device); a write that would only change updated_at is not made',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0209 (user: « synchronisation clignote, procédures clignotent… synchronisation ne s\'arrête pas »; his data repository: 50 commits of '
      'current_flight.json in a burst, most changing only updated_at, the four fields of the profile alternating between two sets): two Fuel '
      'answered each other; the rule: Fuel writes the flight on a gesture or when a result it owns changed, never in answer to another writer')
def f132(c):
    path = 'pilot/ABC/current_flight.json'
    c.open('fuel', docs=flight_docs())
    wait_quote(c)
    c.wait(2500)
    a = (c.doc(path) or {}).get('updated_at')
    c.wait(5000)
    c.eq((c.doc(path) or {}).get('updated_at'), a, 'alone and without a gesture, Fuel writes nothing for 5 s', what='updated_at')
    # the second Fuel writes its own profile four times, 4 s apart: Fuel never writes back
    for i in range(4):
        at = c.js(_SECOND_FUEL, [path, i])
        c.wait(4000)
        d = c.doc(path) or {}
        c.eq([d.get('updated_at'), (d.get('profile') or {}).get('climbFpm')], [at, 1200 + i],
             f'write {i + 1} of the other Fuel: the record is still its own, Fuel did not answer', what='[updated_at, climbFpm]')


@case('F131', '« Calculer A → B » and « Contrôler » check the launcher at the tap: stopped, the step Route says « Disponible avec le lanceur du poste (il ne répond pas) » with « Réessayer », which works once it answers again; no tap without an effect',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0208 (user: « lfpo lfrs, le bouton calculer a-> b n\'a aucun effet ? pourquoi ? » then « trouvé. pas de lanceur. »): the buttons are '
      'decided at the mount; a launcher stopped afterwards left a tap with no effect said in place; a fake launcher whose jobs stop answering')
def f131(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons (the launcher answered at the mount)')
    st['down'] = True
    for act in ('rcompute', 'rcheck'):
        c.tap(f'{FUEL} [data-reng] [data-do="{act}"]')
        c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rnolauncher]')", timeout=12000, what=f'{act}: the stopped launcher said in place')
        said = norm(c.text(f'{FUEL} [data-routealts] [data-rnolauncher]'))
        c.ok(said.startswith(norm(tx(F, 'rNoLauncher', c.lang))) and c.count(f'{FUEL} [data-routealts] [data-rretry]') == 1, said,
             f'{act}: « Disponible avec le lanceur du poste (il ne répond pas) » and « Réessayer »')
    c.shot(f'F131_{c.design}_{c.width}_{c.lang}.png')
    # the launcher answers again: « Réessayer » does the gesture
    st['down'] = False
    c.tap(f'{FUEL} [data-routealts] [data-rretry]')
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rcheck], {FUEL} [data-routealts] [data-faults]')", timeout=12000,
            what='« Réessayer » checks the route once the launcher answers')



@case('F133', 'The alternate typed on the step Flight is taken at once: its name under the field, written with the flight (for the Map beside), its weather in the step Weather — without any navigation',
      'F', tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0205 (user: « à quel moment l\'AD de dégagement est-il rafraîchi ? pas après sa saisie, pour sûr. un a/r cartes -> fuel règle le souci »): '
      'setAd skipped the weather for the alternate; read again only at a remount')
def f133(c):
    route_metar(c, {'LFRS': (270, 10), 'LFML': (300, 12), 'LFMT': (320, 18)})
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route']['altn'] = ''
    c.open('fuel', docs=docs, airfields=True)
    wait_quote(c)
    to_step(c, 2)
    rows = f"[...document.querySelectorAll('{FUEL} [data-wx] .fu-wx .f-row b')].map(b => b.textContent.trim())"
    c.until(f"{rows}.includes('LFML')", timeout=15000, what='the weather of the flight')
    c.ok('LFMT' not in c.js(rows), c.js(rows), 'no alternate yet: LFMT not in the weather')
    to_step(c, 0)
    c.page.fill(f'{FUEL} input[data-k="altn"]', 'LFMT')
    c.until_doc('pilot/ABC/current_flight.json', lambda d: d and (d.get('route') or {}).get('altn') == 'LFMT', 'the alternate written with the flight', timeout=8000)
    c.until(f"(document.querySelector('{FUEL} [data-adline=altn]')?.textContent || '').toLowerCase().includes('lfmt test')", timeout=8000, what='its name under the field')
    to_step(c, 2)
    c.until(f"{rows}.includes('LFMT')", timeout=12000, what='the weather of the alternate, without leaving Fuel')



@case('F134', 'Coordinates are route points in every ICAO form — ddmmNdddmmW, ddNdddW and the North Atlantic five-character forms (« 5520N », « 55N20 ») —: read, placed and counted in the distance, never « unknown »',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0211 (user\'s route « KDEN 4959N08712W DCT 5520N06712W DCT 5645N04039W DCT 5308N01717W LFRS »: « Point inconnu dans AeroDB » — the '
      'launcher\'s engine, AeroDB told; Fuel\'s reader read the first two forms, not the ARINC 424 five-character ones)')
def f134(c):
    c.open('fuel', docs=flight_docs(), airfields=True)
    wait_quote(c)
    to_step(c, 1)
    text = 'LFRS 4600N00100W DCT 46N002W DCT 4602N LFML'
    c.page.fill(f'{FUEL} textarea[data-k="rtext"]', text)
    c.page.locator(f'{FUEL} textarea[data-k="rtext"]').blur()
    f = c.until_doc('pilot/ABC/current_flight.json', lambda d: d and len((d.get('route') or {}).get('points') or []) == 5, 'the five points of the route', timeout=10000)
    pts = f['route']['points']
    c.eq([p['id'] for p in pts], ['LFRS', '4600N00100W', '46N002W', '4602N', 'LFML'], 'each coordinate is a point of the route', what='points')
    nat = pts[3]
    c.ok(abs(nat['lat'] - 46) < 1e-6 and abs(nat['lon'] + 2) < 1e-6, nat, '« 4602N » is 46°N 002°W (the quadrant N: north / west)')
    c.ok(f['route']['distanceNm'] > 400, f['route']['distanceNm'], 'the distance goes through them (LFRS → 1°W → 2°W → LFML, about 460 NM: more than the 364 NM direct)')
    c.eq(c.count(f'{FUEL} [data-unres] [data-unresrow], {FUEL} [data-unres] li'), 0, 'nothing said unknown', what='unknown points')



@case('F135', 'Proposed routes: a tap on a row SHOWS it (marked, its detail unfolded, published to the Map), it does not take it; « Choisir » takes it; then the other routes go, « Itinéraire pris » stays, also after the step is drawn again',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 refused on 10 Nov (« un second calcul successif n\'affiche pas la carte… si on clique sur un itinéraire sur la carte en sidecar, ça fait '
      'disparaître leur version texte à gauche. … 1/ si on clique sur l\'itinéraire (carte ou fuel), ça l\'affiche, mais ne le choisit pas ; 2/ il faut '
      'spécifiquement le bouton « choisir » pour valider »); since SOG-0224 (user, 12 Nov: the other routes disappear at once on « Choisir ») the list gives way to the line '
      'of the route taken; the Map is BUGS SOG\'s (maps-route-alt-show); captures 390 and 1 280')
def f135(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        st = _route_launcher(c, ['route/compute'])
        open_proc(c)
        c.js(_ALTS_LISTEN)
        c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
        c.tap(f'{FUEL} [data-do="rcompute"]')
        c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", timeout=8000, what='three routes')
        # the words of the route, without « DCT »: opening a flight reads and normalises its route (ICAO form « … DCT … ») and writes it
        # at about 2 s, before or after this read (the ergonomist, 12 Nov: F135 red one run in three); a tap that takes would change the WORDS
        words = lambda: [x for x in str((c.doc('pilot/ABC/current_flight.json') or {}).get('route', {}).get('text', '')).split() if x != 'DCT']
        before = words()
        c.tap(f'{FUEL} [data-altlist] [data-alt="2"] [data-altname]')
        c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt=\"2\"][data-shown]')", what=f'{w} px: the tapped row is shown')
        c.ok(c.js(f"!!document.querySelector('{FUEL} [data-alt=\"2\"] details[data-faults][open], {FUEL} [data-alt=\"2\"] details[data-sections][open]')"), '',
             f'{w} px: its detail unfolded')
        c.until(f"({_ALTS_LAST} || {{}}).shown === 2", what='shown to the Map')
        c.settle()
        c.eq(words(), before, f'{w} px: a tap does not take', what='not taken')
        c.eq(norm(c.text(f'{FUEL} [data-alt="2"] [data-do=rtake]')), norm(row(c, 'rTake')), 'its button says « Choisir »', what='button')
        c.shot(f'F135_{c.design}_{w}_{c.lang}.png')
        c.tap(f'{FUEL} [data-alt="2"] [data-do="rtake"]')
        cf_doc(c, lambda d: [x for x in str((d.get('route') or {}).get('text', '')).split() if x != 'DCT'][:3] == ['LFRS', 'LUGEN', 'LFML'], '« Choisir » takes it', timeout=10000)
        c.until(f"!document.querySelector('{FUEL} [data-altlist] [data-alt]') && !!document.querySelector('{FUEL} [data-rtaken]')",
                what=f'{w} px: the other routes go at once, « Itinéraire pris » said (SOG-0224)')
        # the step drawn again (another step, then back): the routes do not come back
        to_step(c, 0)
        to_step(c, 1)
        c.settle()
        c.ok(not c.js(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt]')"), '', f'{w} px: the other routes do not come back when the step is drawn again')



# SOG-0142 (refused 10 Nov): invented positions — the only PAM of the base across the ocean (on the user's machine, the Dutch base of the cycle
# in force had no points: the only PAM left was in the United States)
_FAR_EXTRA = {'points': [{'id': 'PAM', 'lat': 39.0, 'lon': -76.0, 'type': 'VOR'}]}


@case('F136', 'Route reader: a name whose only known place is far from the route (more than 2 × the direct distance + 400 NM) is not placed — said under the route —, never taken from the flight\'s own earlier points',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0142 refused on 10 Nov (« LFRS PAM LFBD passe toujours pas les USA »): the Dutch base of the cycle in force had no points, the only PAM '
      'was in the United States and « the nearest homonym » took it; the engine\'s rule of AeroDB (1aa2ceb62) applied to Fuel\'s reader; invented positions')
def f136(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        docs = flight_docs()
        # the flight read before, with PAM placed across the ocean (what the user's flight holds): never taken back
        fl = docs[1][1]
        fl['route']['text'] = 'LFRS PAM LFML'
        fl['route']['points'] = [p for p in fl['route']['points'] if p.get('id') in ('LFRS', 'LFML')]
        fl['route']['points'].insert(1, {'id': 'PAM', 'lat': 39.0, 'lon': -76.0})
        c.open('fuel', docs=docs, airfields=True, aero_extra=_FAR_EXTRA)
        wait_quote(c)
        _route_typed(c, 'LFRS PAM LFML')
        d = cf_doc(c, lambda d: [q.get('id') for q in (d.get('route') or {}).get('points') or []] == ['LFRS', 'LFML'], f'{w} px: PAM not placed', timeout=10000)
        c.ok(0 < d['route']['distanceNm'] < 450, d['route']['distanceNm'], 'the distance is the route\'s, not a crossing of the ocean')
        c.until(f"[...document.querySelectorAll('{FUEL} [data-rwarn] [data-rw]')].some(e => e.textContent.includes('PAM') && /\d/.test(e.textContent))",
                what=f'{w} px: « PAM : le seul lieu connu est à … NM de la route — non placé »')
        c.js(f"document.querySelector('{FUEL} [data-rwarn]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F136_{c.design}_{w}_{c.lang}.png')



@case('F137', 'Route: the fold « Points (n) » is closed when Fuel opens, even after it was opened — it is not remembered; the other folds keep their state',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0222 (user: « « points » fermé par défaut. c\'était le cas « avant » »): since f917841cd (23 Oct) every fold of Fuel was remembered on the '
      'device (cache/fuel/ui.json), so a « Points » opened once opened every time; captures 390 and 1 280')
def f137(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        # the state of a device where « Points » and « Réglages » were left open
        c.open('fuel', docs=flight_docs() + [['cache/fuel/ui.json', {'open': {'pts': True, 'settings': True}}, 'cache']])
        wait_quote(c)
        to_step(c, 1)
        c.eq(c.js(f"document.querySelector('{FUEL} details[data-fold=pts]').open"), False, f'{w} px: « Points » closed at the opening', what='pts')
        c.eq(c.js(f"document.querySelector('{FUEL} details[data-fold=settings]').open"), True, 'another fold keeps its state', what='settings')
        c.js(f"document.querySelector('{FUEL} details[data-fold=pts]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F137_{c.design}_{w}_{c.lang}.png')
        c.tap(f'{FUEL} details[data-fold=pts] > summary')
        c.until(f"document.querySelector('{FUEL} details[data-fold=pts]').open", what='opened by hand')
        c.go('flightlog')
        c.go('fuel')
        wait_quote(c)
        to_step(c, 1)
        c.eq(c.js(f"document.querySelector('{FUEL} details[data-fold=pts]').open"), False, f'{w} px: opened by hand, closed again at the next opening', what='pts again')



# SOG-0225: the named flight of the ergonomist (LFPO → LFST, alternate LFRN), at invented test positions (no AIP content)
_ALT_PTS = {'LFPO': (48.70, 2.40), 'LFST': (48.50, 7.60), 'LFRN': (48.10, -1.70)}
_ALT_EXTRA = {'aerodromes': [{'icao': k, 'name': k + ' TEST', 'lat': v[0], 'lon': v[1], 'elev': 100} for k, v in _ALT_PTS.items()]}
# (SOG-0399: the parts of the alternate, tr[data-altnpart], are left out — the rows of the totals only)
_ROWS_JS = f"""[...document.querySelectorAll('{FUEL} [data-details] table tr:not([data-altnpart]), {FUEL} [data-fold=details] table tr:not([data-altnpart])')].map(tr => [tr.dataset.altnrow || '',
  tr.children[0]?.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() || '', (tr.children[3]?.textContent || '').replace(/[^0-9]/g, '')])"""


def _rhumb_nm(a, b):
    """The rhumb-line distance (NM) between two (lat, lon), as frame/lib/geo.js rhumbNm."""
    import math
    r = math.pi / 180
    dphi = (b[0] - a[0]) * r
    dpsi = math.log(math.tan(math.pi / 4 + b[0] * r / 2) / math.tan(math.pi / 4 + a[0] * r / 2))
    q = dphi / dpsi if abs(dpsi) > 1e-12 else math.cos(a[0] * r)
    dl = ((b[1] - a[1] + 540) % 360 - 180) * r
    return math.hypot(dphi, q * dl) * 3440.065


def _alt_flight(altn):
    docs = flight_docs()
    f = docs[1][1]
    f['route'] = {'text': 'LFPO LFST', 'dep': 'LFPO', 'arr': 'LFST', 'altn': altn,
                  'points': [{'id': 'LFPO', 'lat': 48.70, 'lon': 2.40}, {'id': 'LFST', 'lat': 48.50, 'lon': 7.60}], 'distanceNm': 207, 'trackDeg': 95}
    f['wind'] = None
    f['windSource'] = None
    return docs + [['cache/fuel/ui.json', {'open': {'details': True}, 'step': 3}, 'cache']]


@case('F138', 'Quote: the alternate fuel is computed and added to the block — taxi + trip + contingency + ALTERNATE + final reserve —, its line says where the figure comes from and the wind; no alternate or no position: said, nothing counted',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0225 (user: « OUI »; rule validated by the ergonomist on 10 Nov): distance arrival → alternate, the sheet\'s alternate flow and TAS else the '
      'model of the trip at min(cruise, ceiling, distance × 100 ft on the semicircular FL, FL050 at least); the wind at the arrival end, else nil, said; '
      'LFPO → LFST, alternate LFRN at invented positions; capture 390')
def f138(c):
    nm = round(_rhumb_nm(_ALT_PTS['LFST'], _ALT_PTS['LFRN']))   # SOG-0399: the straight line (rhumb line), the rule of a direct
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=_alt_flight('LFRN'), airfields=True, aero_extra=_ALT_EXTRA)
        wait_quote(c)
        to_step(c, 3)
        c.until(f"!!document.querySelector('{FUEL} [data-altnrow=ok]')", timeout=12000, what=f'{w} px: the alternate line, computed')
        rows = c.js(_ROWS_JS)
        alt = [x for x in rows if x[0] == 'ok'][0]
        leg = norm(c.text(f'{FUEL} tr[data-altnpart="leg"] > td') or '')
        c.ok('LFRN' in alt[1] and 'LFRN' in leg and f'{nm} NM' in leg, [alt, leg], f'{w} px: « Dégagement LFRN », its leg « … {nm} NM … »')
        c.ok(norm(row(c, 'altnModel')) in leg and norm(row(c, 'altnNoWind')) in leg, leg, 'the leg says climb, cruise, descent computed and « vent inconnu »')
        nums = [int(x[2]) for x in rows if x[2]]
        # the rows with a fuel: taxi, climb, cruise, descent, trip, contingency, alternate, reserve, block
        taxi, trip, cont, altn, res, block = nums[0], nums[-5], nums[-4], nums[-3], nums[-2], nums[-1]
        c.ok(altn > 0 and abs(block - (taxi + trip + cont + altn + res)) <= 3, nums, f'{w} px: block = taxi + trip + contingency + alternate + reserve')
        if w == 390:
            c.js(f"document.querySelector('{FUEL} [data-altnrow]').scrollIntoView({{block: 'center'}})")
            c.shot(f'F138_{c.design}_{w}_{c.lang}.png')
    # no alternate entered: said, nothing added
    c.open('fuel', docs=_alt_flight(''), airfields=True, aero_extra=_ALT_EXTRA)
    wait_quote(c)
    to_step(c, 3)
    c.until(f"!!document.querySelector('{FUEL} [data-altnrow=none]')", timeout=10000, what='« Dégagement : aucun terrain saisi »')
    nums = [int(x[2]) for x in c.js(_ROWS_JS) if x[2]]
    c.ok(abs(nums[-1] - (nums[0] + nums[-4] + nums[-3] + nums[-2])) <= 3, nums, 'without alternate: block = taxi + trip + contingency + reserve')
    # an alternate the base does not place: said, not counted
    c.open('fuel', docs=_alt_flight('LFZZ'), airfields=True, aero_extra=_ALT_EXTRA)
    wait_quote(c)
    to_step(c, 3)
    c.until(f"!!document.querySelector('{FUEL} [data-altnrow=unknown]')", timeout=12000, what='« Dégagement LFZZ : position inconnue, non compté »')



def _doubt_docs():
    """The seeded procedures plus an invented approach of LFML read in doubt (status doubt, reasons unread and geometry)."""
    from fixtures.procedures import pt, rec
    docs = proc_docs()
    dub = rec('LFML', 'APP', 'RNP 31L', ['31L'], [pt(1, 'FAF31', 43.30, 5.40, {'type': 'at', 'ft': 2000}), pt(2, 'RW31L', 43.42, 5.23)], status='doubt')
    dub['doubt'] = 'unread,geometry'
    for d in docs:
        if d[0].endswith('/LFML.json') and d[0].startswith('proc/') and '/manual/' not in d[0] and '/local/' not in d[0]:
            # an approach the AIP gives only as a chart (an IAC without a coding table, invented): « Carte seulement dans l'AIP »
            charts = d[1].get('charts') or {'base': 'https://www.sia.aviation-civile.gouv.fr/test/eAIP/', 'items': []}
            d[1] = {**d[1], 'procedures': [*d[1]['procedures'], dub],
                    'charts': {**charts, 'items': [*charts.get('items', []), {'path': 'Cartes/LFML/AD_2_LFML_IAC_RWY31R_VOR.pdf', 'kind': 'IAC'}]}}
    return docs, dub['id']


@case('F139', 'Procedures: an approach read in doubt is LISTED with « à vérifier » and its reason, chosen only by hand (kept as the flight\'s), never taken by a proposal of an address',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0232 phase 1 (user, 10 Nov: « oui, ajouter les approches en doute, mais avec un panonceau »; LFST: 8 of 11 approaches hidden as doubt, '
      '« pas d\'approche ??? »): aerodb.procedures(icao, { doubt: true }); the reasons from the closed list of aerodb (DOUBT_CODES); an invented approach; captures 390 and 1 280')
def f139(c):
    docs, dub = _doubt_docs()
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=docs + proc_flight(V2_PROCS), airfields=True)
        to_step(c, 1)
        wait_rows(c, 'arr')
        opts = c.js(f"[...document.querySelectorAll('{FUEL} select[data-k=\"p-arr-app\"] option')].map(o => [o.value, o.textContent.trim(), o.className, o.title])")
        mine = [o for o in opts if o[0] == dub]
        c.ok(mine, opts, f'{w} px: the approach in doubt is listed')
        c.ok(norm(tx('modules/fuel/procedures_texts.js', 'procDoubt', c.lang)) in norm(mine[0][1]) and 'doubt' in mine[0][2], mine,
             '« ⚑ à vérifier » on its line, class doubt')
        c.ok('⚠' not in mine[0][1], mine[0][1], 'one panonceau only: never « ⚠ » after « ⚑ à vérifier » (retouche)')
        why = tx('modules/fuel/procedures_texts.js', 'unread', c.lang, after='doubtWhy')
        c.ok(norm(why) in norm(mine[0][3]), mine[0][3], 'its reason in clear words in the tooltip')
        c.eq(procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr').get('app'), 'LFML.APP.I13R.RW13R.NONE', 'the approach of the flight unchanged (nothing taken by itself)', what='kept')
        c.until(f"!!document.querySelector('{FUEL} [data-chartonly]:not([hidden]) a[data-chartonly-item]')", what=f"{w} px: « Carte seulement dans l'AIP » and its chart")
        href = c.js(f"document.querySelector('{FUEL} [data-chartonly] a[data-chartonly-item]').getAttribute('href')")
        c.ok(href.endswith('Cartes/LFML/AD_2_LFML_IAC_RWY31R_VOR.pdf') and href.startswith('https://www.sia.aviation-civile.gouv.fr/'), href, 'its link, composed by aerodb')
        # chosen by hand: the flight's approach, its line says « à vérifier »
        pick_proc(c, 'p-arr-app', dub)
        cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == dub, f'{w} px: chosen by hand, it is the flight\'s', timeout=8000)
        # its reason said in clear words under the list (no hover on a phone), and the panonceau in the folded summary (retouches)
        c.until(f"!!document.querySelector('{FUEL} [data-proc=arr] [data-doubtline]:not([hidden])')", timeout=8000, what=f'{w} px: the line under the list')
        line = norm(c.text(f'{FUEL} [data-proc="arr"] [data-doubtline]') or '')
        c.ok(norm(tx('modules/fuel/procedures_texts.js', 'procDoubt', c.lang)) in line and norm(why) in line and line.startswith('⚑'), line,
             f'{w} px: « ⚑ à vérifier : <its reason> » under the list')
        summ = c.text(f'{FUEL} [data-proc="arr"] .fu-procsum') or ''
        c.ok('⚑' in summ, summ, f'{w} px: the folded summary carries the panonceau')
        c.js(f"document.querySelector('{FUEL} [data-proc=arr] [data-doubtline]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F139_{c.design}_{w}_{c.lang}_delivered.png')
    # never by a proposal of an address (the Map's « choix » mode): ignored, the flight keeps its approach
    c.open('fuel?focus=arr&app=' + dub, docs=docs + proc_flight(V2_PROCS), airfields=True)
    wait_rows(c, 'arr')
    c.settle()
    c.wait(800)
    c.eq(procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr').get('app'), 'LFML.APP.I13R.RW13R.NONE', 'an address cannot propose an approach in doubt', what='proposal')



def _aids_extra():
    """The invented ILS of the test LFML and an invented VOR at the route's point LUGEN (made-up frequency; not an AIP value)."""
    import lib
    p = next(x for x in lib.FLIGHT['route']['points'] if x['id'] == 'LUGEN')
    e = _ils_extra()
    e['navaids'] = [*e['navaids'], {'kind': 'VOR', 'id': 'LUGEN', 'name': 'LUGEN TEST', 'freq': '113.50', 'lat': p['lat'], 'lon': p['lon']}]
    e['cells'] = {'46': [[-2, 4]]}  # the base's index covers LUGEN (west of the default cells)
    return e


@case('F140', 'Step Departure: a block « Aides radio » — the ILS of the chosen approach first (runway, ident, frequency, axis, DME), then the route\'s VOR / DME folded, each with its leg; nothing invented, « aucune aide » said',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0200 (user: « sur l\'écran 5 : la liste des VORs qui servent à guider, c\'est une option, mais surtout l\'ILS choisie. un seul coup d\'œil, les infos utiles »): '
      'aerodb.navaids near each route point that carries the name; an invented ILS and VOR; captures 390 and 1 280')
def f140(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        open_proc(c, procs=_ILS_PROCS, aero_extra=_aids_extra())
        to_step(c, 4)
        c.until(f"/110\.30/.test(document.querySelector('{FUEL} [data-aids] [data-aidils]')?.textContent || '')", timeout=12000, what=f'{w} px: the ILS of the approach first')
        ils = norm(c.text(f'{FUEL} [data-aids] [data-aidils]'))
        c.ok('13R' in ils and 'TST' in ils and '134' in ils and 'DME' in ils, ils, 'runway, ident, frequency, axis, DME')
        c.until(f"!!document.querySelector('{FUEL} [data-aids] [data-aidsroute] [data-aid=LUGEN]')", timeout=12000, what='the VOR of the route')
        c.eq(c.js(f"document.querySelector('{FUEL} [data-aidsroute]').open"), False, 'the route\'s VOR / DME folded by default', what='folded')
        vor = norm(c.js(f"document.querySelector('{FUEL} [data-aid=LUGEN]').textContent"))
        c.ok('113.50' in vor and 'LFRS' in vor and 'NEPIX' in vor, vor, 'ident, kind, frequency and its leg (LFRS → NEPIX)')
        # SOG-0247 (user: « le chevron de visibilité (aides radio) se referme tout seul dès qu'on l'ouvre »): opened, it stays open through
        # the redraws of the step (a level changed: the quote and the summary drawn again)
        c.tap(f'{FUEL} [data-aidsroute] > summary')
        c.until(f"document.querySelector('{FUEL} [data-aidsroute]').open === true", timeout=3000, what=f'{w} px: the fold opens')
        c.js(f"""(() => {{ const i = document.querySelector('{FUEL} input[data-k=fl]'); i.value = '250'; i.dispatchEvent(new Event('input', {{ bubbles: true }}));
          i.dispatchEvent(new Event('change', {{ bubbles: true }})) }})()""")
        c.wait(1500)
        c.eq(c.js(f"document.querySelector('{FUEL} [data-aidsroute]')?.open"), True, f'{w} px: still open after the step is drawn again', what='fold open')
        c.js(f"document.querySelector('{FUEL} [data-block=aids]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F140_{c.design}_{w}_{c.lang}_delivered.png')
    # no aid in the base for this flight: said, nothing invented
    open_proc(c, procs={'dep': {'rwy': '03'}, 'arr': {'rwy': '13R'}, 'by': 'fuel', 'at': '2026-10-28T09:00:00Z'})
    to_step(c, 4)
    c.until(f"!!document.querySelector('{FUEL} [data-aids] [data-aidsnone]')", timeout=12000, what='« Aucune aide radio en base pour ce vol »')



@case('F141', 'Procedures: the warnings of a reading are said in text under the aerodrome\'s line (a fold listing them), not only counted in a notification',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0203 (user: « bug lfoe » — « LFOE : aucune procédure lue. 0 page lue sur 2. 2 avertissements. », and nothing of them): the reader\'s warnings, '
      'escaped; invented warnings; captures 390 and 1 280')
def f141(c):
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a);
          try { db.fetchProcedures = async () => ({ ok: false, reason: 'failed', message: 'no procedure could be read for this aerodrome', stats: { pages: 2, read: 0 },
            warnings: ['AD_2_TEST_DATA_01.pdf : ligne illisible (9 cellules au lieu de 11) <b>x</b>', 'AD_2_TEST_DATA_02.pdf : coordonnées introuvables'] }) } catch (e) {}
          return db } } } }) })()""")
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        open_proc(c)
        wait_rows(c, 'arr')
        open_foot(c, 'arr')
        c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]')
        c.until(f"!!document.querySelector('{FUEL} [data-proc=arr] [data-procwarn]')", timeout=10000, what=f'{w} px: the warnings under the line')
        items = c.js(f"[...document.querySelectorAll('{FUEL} [data-proc=arr] [data-procwarn] li')].map(e => e.textContent)")
        c.eq(len(items), 2, 'both warnings listed', what='warnings')
        c.ok('ligne illisible' in items[0] and '<b>x</b>' in items[0] and c.count(f'{FUEL} [data-procwarn] li b') == 0, items, 'said as text, escaped (never markup)')
        c.js(f"(() => {{ const d = document.querySelector('{FUEL} [data-proc=arr] [data-procwarn]'); d.open = true; d.scrollIntoView({{block: 'center'}}) }})()")
        c.shot(f'F141_{c.design}_{w}_{c.lang}_delivered.png')



@case('F142', 'A reading of the route is never lost when the flight is taken again meanwhile (another writer, a stored echo): its points reach the record',
      'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='Challenge of 11 Nov (N13 / N24 under load: « the direct mission has a distance » never came): resolveRoute kept the route object '
      'of its start and wrote the points read there after its wait; each save of the flight (writeFlight, 300 ms after a change) and each '
      'flight taken from the record make a new object, so a reading longer than 300 ms left its points on the old one and nothing read again. '
      'A slow base (every lookup 1.5 s) and another writer (the level only) during the reading')
def f142(c):
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a);
          try { const slow = f => f && (async (...x) => { await new Promise(r => setTimeout(r, window.__slowBase ? 1500 : 0)); return f.apply(db, x) });
            db.coords = slow(db.coords); if (db.coordsAll) db.coordsAll = slow(db.coordsAll) } catch (e) {}
          return db } } } }) })()""")
    c.open('fuel', flight=True, airfields=True)
    to_step(c, 1)
    path = 'pilot/ABC/current_flight.json'
    c.js('window.__slowBase = true')
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS 4600N00100E LFML')
    c.page.press(rt, 'Tab')
    c.wait(700)  # the reading has started (its 250 ms timer), the slow base holds it
    # another writer during the reading: the level only, the route text Fuel wrote stays
    c.js("""async ([path]) => { const d = FrameData.adapter({ id: 'maps', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
      const cur = (await d.get(path)) || {};
      await d.put(path, { ...cur, level: { ft: 25000 }, by: 'maps', updated_at: new Date().toISOString() }); return true }""", [path])
    try:
        d = c.until_doc(path, lambda d: d and '4600N00100E' in [x.get('id') for x in (d.get('route') or {}).get('points') or []],
                        'the points of the reading reach the record', timeout=12000)
    except Fail:   # say the route as it was (the generic message stops before it)
        r = (c.doc(path) or {}).get('route') or {}
        shown = c.js("[...document.querySelectorAll('[data-module=fuel] [data-pts] .fu-pt b')].map(b => b.textContent)")
        raise Fail(f"route text {r.get('text')!r}, points {[x.get('id') for x in r.get('points') or []]}; in Fuel: {shown}",
                   'the points of the reading on the record')
    c.eq([x.get('id') for x in d['route']['points']], ['LFRS', '4600N00100E', 'LFML'], 'the route read, on the record', what='points')
    c.eq((d.get('level') or {}).get('ft'), 25000, 'the other writer\'s level stays', what='level')



# SOG-0210 N2: an invented SID « read from Little Navmap » at LFRS, its only point LNMXA known to no published base
_LNM_STUB = """(() => { const rec = { id: 'LFRS.SID.LNM1A.RW03', icao: 'LFRS', kind: 'SID', name: 'LNM1A', runways: ['03'], transition: null,
    status: 'lnm', lnm: true, local: true, source: { kind: 'lnm', ref: 'little_navmap_test.sqlite' },
    points: [{ id: 'LNMXA', lat: 47.45, lon: -1.25, seq: 1, phase: 'main' }] };
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const ps = db.procedures, p1 = db.procedure;
        db.procedures = async (icao, q) => { const l = await ps.call(db, icao, q); return String(icao).toUpperCase() === 'LFRS' ? [...(l || []), rec] : l };
        db.procedure = async (id, q) => id === rec.id ? rec : p1.call(db, id, q) } catch (e) {}
      return db } } } }) })()"""


@case('F143', 'Little Navmap: a procedure read on this device gives no position to the flight (data/), and the FMS / PLN files carry it; the list says « Little Navmap, lue sur ce poste »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0210 N2 (Sécurisation, 10/11: « rien d\'écrit dans data/ » for what is read from Little Navmap): the flight keeps the reference only '
      '(the chosen id), never the position of an lnm point (route.points, synchronised); the exports carry them (SOG-0238, user 11/11: « tout ce '
      'qui vient de la bdd peut partir vers le simu »); an '
      'lnm record is no longer labelled « X-Plane, local ». Invented SID LNM1A / point LNMXA')
def f143(c):
    c.page.add_init_script(_LNM_STUB)
    procs = {'dep': {'rwy': '03', 'sid': 'LFRS.SID.LNM1A.RW03'}, 'arr': {}, 'by': 'fuel', 'at': '2026-11-11T08:00:00Z'}
    open_proc(c, procs=procs)
    wait_rows(c, 'dep')
    lnm = tx('modules/fuel/procedures_texts.js', 'procSrcLnm', c.lang)
    xp = tx('modules/fuel/procedures_texts.js', 'procXplane', c.lang)
    c.until(f"[...document.querySelectorAll('{FUEL} [data-proc=dep] option')].some(o => o.textContent.includes('LNM1A'))", timeout=10000,
            what='the Little Navmap SID is listed')
    lab = c.js(f"[...document.querySelectorAll('{FUEL} [data-proc=dep] option')].find(o => o.textContent.includes('LNM1A')).textContent")
    c.ok(lnm in lab and xp not in lab, lab, 'the SID read from Little Navmap says so (never « X-Plane, local »)')
    # the SID's point typed in the route: no position from the lnm record reaches the flight (it stays a word)
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS LNM1A LNMXA NEPIX LFML')
    c.page.locator(rt).blur()
    path = 'pilot/ABC/current_flight.json'
    d = c.until_doc(path, lambda d: d and 'LNMXA' in ((d.get('route') or {}).get('text') or '') and 'NEPIX' in [p.get('id') for p in d['route'].get('points') or []],
                    'the typed route is read and written', timeout=10000)
    c.wait(600)
    d = c.doc(path)
    ids = [p.get('id') for p in d['route']['points']]
    c.ok('LNMXA' not in ids and not any(abs((p.get('lat') or 0) - 47.45) < 1e-6 for p in d['route']['points']), ids,
         'no position of the Little Navmap point in the flight (data/)')
    c.eq(((d['route'].get('procedures') or {}).get('dep') or {}).get('sid'), 'LFRS.SID.LNM1A.RW03', 'the flight keeps the reference (the chosen id)', what='reference')
    # the export carries the lnm SID and its point (SOG-0238), taken on the device; the record still holds no position of it
    c.tap(f'{FUEL} [data-step="4"]')
    sel = f'{FUEL} [data-block="fms"] button[data-fms="xp11"]'
    c.until(f"!document.querySelector('{sel}')?.disabled", timeout=10000, what='the export is offered')
    with c.page.expect_download(timeout=10000) as di:
        c.tap(sel)
    text = Path(di.value.path()).read_bytes().decode('utf-8')
    c.ok('SID LNM1A' in text and 'ADEP LFRS' in text, repr(text[:400]), 'the .fms 1100 names the SID read from Little Navmap')
    # the version 3 file writes the whole path, procedures included: the SID's point, at its position taken on the device
    with c.page.expect_download(timeout=10000) as di:
        c.tap(f'{FUEL} [data-block="fms"] button[data-fms="xp10"]')
    text = Path(di.value.path()).read_bytes().decode('utf-8')
    c.ok('LNMXA' in text and '47.450000' in text, repr(text[:500]), 'the .fms version 3 carries the point of the SID read from Little Navmap')
    d = c.doc(path)
    c.ok('LNMXA' not in [p.get('id') for p in d['route']['points']] and not any(abs((p.get('lat') or 0) - 47.45) < 1e-6 for p in d['route']['points']),
         [p.get('id') for p in d['route']['points']], 'still no position of the Little Navmap point in the flight (data/)')



# SOG-0210: LFML has no procedure in the base and its reading says a Little Navmap database is here; fetchLnm records what it is asked
# (never a launcher job): held until window.__lnmGo(), « paired » when window.__lnmPaired
_LNM_GESTURE_STUB = """(() => { window.__lnm = []; let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const ps = db.procedures;
        db.procedures = async (icao, q) => String(icao).toUpperCase() === 'LFML' ? [] : ps.call(db, icao, q);
        const rw = db.runways; db.runways = async (icao, ...q) => String(icao).toUpperCase() === 'LFML' ? [] : rw.call(db, icao, ...q);
        db.fetchProcedures = async icao => ({ ok: false, reason: 'no-tables', lnm: true, icao });
        db.lnmAvailable = () => sessionStorage.getItem('lnmOn') === '1';
        db.fetchLnm = async (...x) => { window.__lnm.push(JSON.parse(JSON.stringify(x)));
          if (window.__lnmPaired) return { ok: false, reason: 'paired' };
          await new Promise(r => { window.__lnmGo = r }); return { ok: true, icao: x[0], count: 3 } } } catch (e) {}
      return db } } } }) })()"""
_PERSONAL_PUT = """async () => { const d = FrameData.adapter({ id: 'data', reads: ['cache/data/'], writes: [{ prefix: 'cache/data/', policy: 'cache' }] });
  await d.put('cache/data/personal.json', { certified: true, updated_at: new Date().toISOString() }); return true }"""
_NOTE = "(h) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(h))"


@case('F144', 'Little Navmap: « Lire depuis Little Navmap » only where the base has no procedure and a Little Navmap database is said here; personal-use box first, one aerodrome at a time, this device only, nothing but the code and personal asked',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0210 (user: « Lire depuis Little Navmap », KDEN; ergonomist 11/11: one aerodrome at a time, this device only and said, the personal-use box '
      'required, the database path never from the page, nothing in data/ (F143), never the default proposal): fetchLnm stubbed (no launcher job); '
      'captures 390 and 1 280')
def f144(c):
    c.page.add_init_script(_LNM_GESTURE_STUB)
    open_proc(c)
    btn = f'{FUEL} [data-proc="arr"] [data-do="proclnm"]'
    c.until(f"!!document.querySelector('{FUEL} [data-proc=arr][data-nodata] [data-do=procfetch]')", timeout=15000, what='LFML without procedure: « Lire » offered')
    # the reading says « Little Navmap has a database here », but this device cannot read it (AeroDb.lnmAvailable false): no gesture
    c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"]')
    c.until(f"!document.querySelector('{FUEL} [data-proc=arr] [data-do=procfetch][aria-busy]')", timeout=10000, what='the reading ends')
    c.settle()
    c.eq(c.count(btn), 0, 'no Little Navmap gesture on a device that cannot read it (AeroDb.lnmAvailable false), whatever the reading said',
         what='gesture without a database')
    # a device that can read it (the launcher found a database): offered at once on the aerodrome without procedure, not at LFRS
    c.js("sessionStorage.setItem('lnmOn', '1')")
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{btn}')", timeout=15000, what='« Lire depuis Little Navmap » offered on a device that can read it')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] [data-do="proclnm"]'), 0, 'not on LFRS, which has its procedures', what='gesture at departure')
    c.eq(norm(c.text(btn) or ''), norm(tx('modules/fuel/procedures_texts.js', 'procLnmRead', c.lang)), 'the gesture is named', what='button')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # the notes of the reading, gone for the captures
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.js(f"document.querySelector('{btn}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F144_{c.design}_{w}_{c.lang}_delivered.png')
    # the box not ticked: a line says where, nothing asked of the launcher
    head = tx('modules/fuel/procedures_texts.js', 'procLnmPersonal', c.lang).split('›')[0][:30]
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # a floating note must not cover the gesture
    c.tap(btn)
    c.until(_NOTE, head, timeout=5000, what='the line says where to tick personal use')
    c.eq(c.js('window.__lnm'), [], 'no reading without the personal-use box', what='fetchLnm calls')
    # ticked: asked once, with the code and personal only (never a path from the page); one aerodrome at a time
    c.js(_PERSONAL_PUT)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # a floating note must not cover the gesture
    c.tap(btn)
    c.until('window.__lnm.length === 1', timeout=5000, what='fetchLnm asked once')
    c.eq(c.js('window.__lnm'), [['LFML', {'personal': True}]], 'asked with the code and personal: true, nothing else', what='fetchLnm arguments')
    c.until(f"document.querySelector('{btn}')?.disabled === true", timeout=5000, what='the gesture is busy during the reading')
    c.js(f"document.querySelector('{btn}').disabled = false; document.querySelector('{btn}').click()")
    c.wait(300)
    c.eq(len(c.js('window.__lnm')), 1, 'a second gesture during the reading asks nothing (one aerodrome at a time)', what='fetchLnm calls')
    c.js('window.__lnmGo()')
    done = tx('modules/fuel/procedures_texts.js', 'procLnmDone', c.lang).split('{n}')[0].replace('{icao}', 'LFML') + '3'
    c.until(_NOTE, done, timeout=5000, what='the count of the reading is said')
    # a device of the local network: refused, and the screen says it
    c.js('window.__lnmPaired = true')
    c.until(f"!!document.querySelector('{btn}') && !document.querySelector('{btn}').disabled", timeout=5000, what='the gesture is free again')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # a floating note must not cover the gesture
    c.tap(btn)
    paired = tx('modules/fuel/procedures_texts.js', 'paired', c.lang, after='procLnmWhy').replace('{icao}', 'LFML')[:20]
    c.until(_NOTE, paired, timeout=5000, what='a paired device is refused, and said')



@case('F145', 'A direct leg is flown on its rhumb line: the position of the flight, the point that picks the weather model and the corridor of the route are on it (KDEN DCT LFST, invented codes)',
      'F', tags=('fuel', 'maps'), designs=('standard',), screens=False,
      rule='SOG-0243 (user, 11 Nov: « orthodromie n\'est pas le cas nominal. un direct se fait au compas. »): progress.js position(), flight_path.js '
      'routeMidpoint and progress.js alongRoute on frame/lib/geo.js rhumbAt (BUGS SOG 59ab1737e); before, latitude and longitude interpolated in '
      'a straight line: 89 NM off the rhumb line at mid-route; the quote\'s distance and course unchanged (Q-0019)')
def f145(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js("""async () => {
      const [PG, FP, G] = await Promise.all([import('/modules/fuel/progress.js'), import('/frame/lib/flight_path.js'), import('/frame/lib/geo.js')]);
      const A = { lat: 39.86, lon: -104.67 }, B = { lat: 48.54, lon: 7.63 };   // XDEN, XLST: invented codes at rounded positions
      const gc = (a, b) => { const r = Math.PI / 180, d = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) *
        Math.sin((b.lon - a.lon) * r / 2) ** 2; return 2 * 3440.065 * Math.asin(Math.sqrt(d)) };
      const L = gc(A, B), out = { pos: [], mid: 0, along: null, off: null };
      for (const f of [0.1, 0.25, 0.5, 0.75, 0.9]) out.pos.push(gc(PG.position([A, B], [0, L], L * f), G.rhumbAt(A, B, f)));
      out.mid = gc(FP.routeMidpoint([A, B]), G.rhumbAt(A, B, 0.5));
      const m = G.rhumbAt(A, B, 0.5), a = PG.alongRoute ? PG.alongRoute([A, B], m) : null, o = PG.alongRoute ? PG.alongRoute([A, B], { lat: m.lat + 0.5, lon: m.lon }) : null;
      out.along = a && [a.cross, a.along / G.rhumbNm(A, B)]; out.off = o && o.cross;   // along: by compass, as the quote (Q-0019)
      return out }""")
    c.ok(all(x < 0.5 for x in r['pos']), [round(x, 2) for x in r['pos']], 'the position of the flight at 10 to 90 % of the leg is on its rhumb line')
    c.ok(r['mid'] < 0.5, round(r['mid'], 2), 'the point that picks the weather model is on the rhumb line')
    c.ok(r['along'] and r['along'][0] < 0.5 and abs(r['along'][1] - 0.5) < 0.01, r['along'], 'a place on the rhumb line is on the route, at mid-length')
    c.ok(r['off'] and 28 < r['off'] < 32, r['off'], 'a place 30 NM north of it is 30 NM off the route (the corridor of the weather)')



@case('F146', 'Step Flight: the aircraft comes first, before the aerodromes, the level and the family (nothing is computed without it)', 'F',
      tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0131 (a) (the ergonomics pass; the user, 11 Nov: « oui »): the aircraft block right under the title of the step; captures 390 and 1 280')
def f146(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', flight=True)
        to_step(c, 0)
        order = c.js("""(() => { const card = document.querySelector('[data-module=fuel] [data-block=flight]');
          const at = sel => { const e = card.querySelector(sel); return e ? [...card.querySelectorAll('*')].indexOf(e) : -1 };
          return { ac: at('[data-block=aircraft]'), dep: at('input[data-k=dep]'), fl: at('input[data-k=fl]'), th: at('[data-themes]') } })()""")
        c.ok(0 <= order['ac'] < order['dep'] < order['fl'] and order['ac'] < order['th'], order, f'{w} px: the aircraft first, then the aerodromes, the level, the family')
        c.js("(() => { document.querySelector('[data-module=fuel] [data-block=flight]').scrollIntoView({block: 'start'}); scrollBy(0, -140) })()")
        c.shot(f'F146_{c.design}_{w}_{c.lang}_delivered.png')



def _direct_flight(a, b, text=None):
    """The planned flight of lib.FLIGHT on a direct a → b ((id, lat, lon), invented codes), its two points known by the flight."""
    from lib import flight_docs
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            r = d[1]['route']
            r.update({'dep': a[0], 'arr': b[0], 'altn': '', 'text': text or f'{a[0]} {b[0]}', 'procedures': None,
                      'points': [{'id': a[0], 'lat': a[1], 'lon': a[2]}, {'id': b[0], 'lat': b[1], 'lon': b[2]}]})
            r.pop('procedures', None)
            r.pop('distanceNm', None)
    return docs


def _gc_coords(a, b, n):
    """n points on the great circle between a and b, written as ICAO coordinates to the minute (what « Calculer A → B » would place)."""
    import math
    r = math.pi / 180
    p1, l1, p2, l2 = a[1] * r, a[2] * r, b[1] * r, b[2] * r
    d = 2 * math.asin(math.sqrt(math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin((l2 - l1) / 2) ** 2))
    out = []
    for i in range(1, n + 1):
        f = i / (n + 1)
        A, B = math.sin((1 - f) * d) / math.sin(d), math.sin(f * d) / math.sin(d)
        x = A * math.cos(p1) * math.cos(l1) + B * math.cos(p2) * math.cos(l2)
        y = A * math.cos(p1) * math.sin(l1) + B * math.cos(p2) * math.sin(l2)
        z = A * math.sin(p1) + B * math.sin(p2)
        la, lo = math.atan2(z, math.hypot(x, y)) / r, math.atan2(y, x) / r

        def dm(v):
            v = abs(v)
            dd, mm = int(v), round((v - int(v)) * 60)
            return (dd + 1, 0) if mm == 60 else (dd, mm)
        (ld, lm), (od, om) = dm(la), dm(lo)
        out.append(f"{ld:02d}{lm:02d}{'N' if la >= 0 else 'S'}{od:03d}{om:02d}{'E' if lo >= 0 else 'W'}")
    return out


@case('F147', 'A direct leg counts its rhumb-line distance (by compass); more than 2 % above its great circle, a line under the route says « ajoutez des points intermédiaires »',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='Q-0019 (the user, 11 Nov 12 h 25: « Oui, et un avertissement quand un direct au compas dépasse de plus de 2 % le grand cercle (« ajoutez des '
      'points intermédiaires ») »): rhumbNm / rhumbCourse of frame/lib/geo.js for each direct leg; invented codes at rounded public positions; '
      'the intermediate points are those a great-circle route would place; captures 390 and 1 280')
def f147(c):
    path = 'pilot/ABC/current_flight.json'
    den, stb, ory = ('XTDN', 39.8617, -104.6731), ('XTSB', 48.5383, 7.6281), ('XTPO', 48.7233, 2.3794)
    warn = f'{FUEL} [data-rhumb]'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=_direct_flight(den, stb))
        to_step(c, 1)
        d = c.until_doc(path, lambda d: d and abs(((d.get('route') or {}).get('distanceNm') or 0) - 4849) <= 1, f'{w} px: the transatlantic direct, by compass',
                        timeout=12000)
        c.until(f"!!document.querySelector('{warn}:not([hidden])')", timeout=8000, what=f'{w} px: the line « ajoutez des points intermédiaires »')
        line = norm(c.text(warn) or '')
        c.ok('XTDN → XTSB' in line and '+10' in line and ('4 849' in line or '4,849' in line or '4.849' in line or '4849' in line), line, f'{w} px: the leg, its two distances and the excess')
        c.js(f"document.querySelector('{warn}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F147_{c.design}_{w}_{c.lang}_delivered.png')
    # the same route with intermediate points on the great circle: no line, a shorter route
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, ' '.join(['XTDN', *_gc_coords(den, stb, 7), 'XTSB']))
    c.page.locator(rt).blur()
    d = c.until_doc(path, lambda d: d and ((d.get('route') or {}).get('distanceNm') or 0) < 4500, 'the route by the intermediate points', timeout=12000)
    c.ok(4400 <= d['route']['distanceNm'] <= 4450, d['route']['distanceNm'], 'close to the great circle (4 401 NM)')
    c.until(f"!!document.querySelector('{warn}[hidden]')", timeout=8000, what='no more line with intermediate points')
    # a short direct: the same number as before (rhumb line and great circle coincide at 0.1 NM)
    c.open('fuel', docs=_direct_flight(ory, stb))
    d = c.until_doc(path, lambda d: d and ((d.get('route') or {}).get('distanceNm') or 0) > 0, 'the short direct', timeout=12000)
    c.eq(d['route']['distanceNm'], 209, 'XTPO DCT XTSB: 209 NM, as by the great circle (208.53 → 208.57)', what='short direct')
    c.eq(c.js(f"document.querySelector('{warn}')?.hidden"), True, 'no line on a short direct', what='line')



@case('F148', 'Procedures: the probable runway from the METAR is SAID at the head of the lists with « Prendre la piste probable », never set by itself; calm wind: nothing',
      'F', tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0090 (the user, Q-0033 / Q-0034): the runway of the strongest head wind without a red (tail or cross over the limits); calm or variable '
      'wind: nothing said; captures 390 and 1 280')
def f148(c):
    route_metar(c, {'LFML': (310, 12)})
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        open_proc(c)
        wait_rows(c, 'arr')
        line = f'{FUEL} [data-proc="arr"] [data-rwyprob]'
        c.until(f"!!document.querySelector('{line}:not([hidden])')", timeout=20000, what=f'{w} px: the probable runway said')
        txt = norm(c.text(line) or '')
        c.ok(norm(tx(PT, 'procRwyTakeHead', c.lang).replace('{rwy}', '31L')) in txt, txt, f'{w} px: « Prendre la 31L (vent de face) » (SOG-0308)')
        c.ok('310' in (c.text(f'{FUEL} [data-proc="arr"] [data-r="src-rwy"]') or ''), c.text(f'{FUEL} [data-proc="arr"] [data-r="src-rwy"]'),
             f'{w} px: the METAR said as the source of the runway line')
        c.ok((procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr') or {}).get('rwy') != '31L', procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr'),
             'never set by itself')
        c.js(f"document.querySelector('{line}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F148_{c.design}_{w}_{c.lang}_delivered.png')
    c.tap(f'{line} [data-do="rwyprob"]')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '31L', 'taken by the gesture', timeout=8000)
    c.until(f"!!document.querySelector('{line}[hidden]')", timeout=5000, what='said no more once it is the flight\'s')


@case('F149', 'Procedures: calm wind (under 3 kt): no probable runway said', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=False,
      rule='SOG-0090 (the user, Q-0033: « vent calme ou variable : rien »)')
def f149(c):
    route_metar(c, {'LFML': (310, 2)})
    open_proc(c)
    wait_rows(c, 'arr')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && [...s.options].some(o => o.textContent.includes('kt')) })()",
            timeout=20000, what='the METAR read')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-proc=arr] [data-rwyprob]')?.hidden"), True, 'nothing said by a calm wind', what='probable runway')



def _chartonly_docs():
    """The seeded procedures of LFML (invented) plus a « finale seule » ILS 31R (FAF and threshold, synthetic) and three IAC charts: VOR 31R
    and NDB 13L (charts only), ILS 31R (carried by the final-only record: never a second line)."""
    from fixtures.procedures import pt, rec
    docs = proc_docs()
    fin = rec('LFML', 'APP', 'ILS RWY 31R', ['31R'], [{**pt(1, 'FAF31R', 43.30, 5.40), 'synthetic': 'faf'}, {**pt(2, 'RW31R', 43.42, 5.23), 'synthetic': 'threshold'}],
              status='check')
    for d in docs:
        if d[0].endswith('/LFML.json') and d[0].startswith('proc/') and '/manual/' not in d[0] and '/local/' not in d[0]:
            charts = d[1].get('charts') or {'base': 'https://www.sia.aviation-civile.gouv.fr/test/eAIP/', 'items': []}
            d[1] = {**d[1], 'procedures': [*d[1]['procedures'], fin],
                    'charts': {**charts, 'items': [*charts.get('items', []), *[{'path': f'Cartes/LFML/AD_2_LFML_IAC_{n}.pdf', 'kind': 'IAC'}
                                                                                  for n in ('RWY31R_VOR', 'RWY13L_NDB', 'RWY31R_ILS')]]}}
    return docs, fin['id']


@case('F150', 'Procedures: the coded approaches, then one line per approach charted only in the AIP (its chart; chosen since slice 3b, F213), read with the list open; a « finale seule » named so and never doubled by a chart line',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0248 / SOG-0232 (user, recette: « aucune ils, aucune vor, aucune loc. pourtant existantes »): AeroDb.approachSummary / chartOnly (AeroDB '
      '6cc170b8e, K163); an invented aerodrome; captures 390 and 1 280')
def f150(c):
    docs, fin = _chartonly_docs()
    T = 'modules/fuel/procedures_texts.js'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=docs + proc_flight(V2_PROCS), airfields=True)
        to_step(c, 1)
        wait_rows(c, 'arr')
        c.until(f"document.querySelectorAll('{FUEL} [data-proc=arr] [data-chartline]').length >= 2", timeout=15000, what=f'{w} px: one line per chart-only approach')
        lines = [norm(x) for x in c.js(f"[...document.querySelectorAll('{FUEL} [data-proc=arr] [data-chartline]')].map(l => l.textContent)")]
        one = norm(tx(T, 'procChartOnlyOne', c.lang).split('{name}')[1])
        c.ok(len(lines) == 2 and all(one in l for l in lines) and any('VOR' in l and '31R' in l for l in lines) and any('NDB' in l and '13L' in l for l in lines),
             lines, 'VOR 31R and NDB 13L, each « — carte seulement dans l\'AIP », each with its chart')
        c.ok(not any('ILS' in l and '31R' in l for l in lines), lines, 'the ILS 31R chart is carried by the final-only record: no second line')
        opts = c.js(f"[...document.querySelectorAll('{FUEL} select[data-k=\"p-arr-app\"] option')].map(o => [o.value, o.textContent.trim(), o.disabled])")
        fo = [o for o in opts if o[0] == fin]
        c.ok(fo and norm(tx(T, 'procFinalOnly', c.lang)) in norm(fo[0][1]), fo, 'the final-only ILS named « — finale seule », selectable')
        # SOG-0308 tranche 3b : elles se choisissent désormais (« __chart:<rang> », F213)
        dis = [o for o in opts if o[0].startswith('__chart:')]
        c.ok(len(dis) == 2 and all(one in norm(o[1]) and not o[2] for o in dis), dis, 'the two chart-only approaches listed after the coded ones, selectable (slice 3b)')
        # leurs lignes et leurs liens se lisent la liste ouverte (« Changer » de l'approche), comme la maquette
        c.tap(f'{FUEL} [data-proc=arr] [data-do=procchange][data-row=app]')
        c.until(f"getComputedStyle(document.querySelector('{FUEL} [data-proc=arr] [data-chartonly]')).display !== 'none'", what=f'{w} px: the chart lines, the list open')
        c.js(f"document.querySelector('{FUEL} [data-proc=arr] [data-chartonly]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F150_{c.design}_{w}_{c.lang}_delivered.png')



@case('F153', 'Display settings live on the device (cache/fuel/display.json): copied from fuel.json at the first read, without loss; a change '
      'is written there only; fuel.json loses its display keys at its next write; the device document wins over fuel.json',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0279 (3) (V3 Frame\'s contract, frame/DECISIONS.md: displayAlt, displayDist, displaySpeed, displayUnit and wxRadiusNm move from '
      'pilot/<tri>/fuel.json to cache/fuel/display.json; the Map reads displayAlt there, BUGS SOG a9758e03a)')
def f153(c):
    D, FJ = 'cache/fuel/display.json', 'pilot/ABC/fuel.json'
    keys = ('displayUnit', 'displaySpeed', 'displayAlt', 'displayDist', 'wxRadiusNm')
    old = {'schema': 1, 'displayUnit': 'lb', 'displayAlt': 'm', 'displayDist': 'km', 'wxRadiusNm': 20, 'displaySpeed': 'bad', 'taxiMin': 12, 'entries': {}}
    c.open('fuel', docs=flight_docs() + [[FJ, old, 'document']])
    wait_quote(c)
    d = c.until_doc(D, lambda d: bool(d), 'the device document is written at the first read')
    c.eq({k: d.get(k) for k in keys if k in d}, {'displayUnit': 'lb', 'displayAlt': 'm', 'displayDist': 'km', 'wxRadiusNm': 20},
         'the values of fuel.json copied, none invented (a value off the list is not taken)', what='copied')
    to_step(c, 3)
    c.ok('lb' in norm(c.text(f'{FUEL} [data-settingssum]') or ''), c.text(f'{FUEL} [data-settingssum]'), 'the quote is in lb, as before')
    # a change of a quote setting: fuel.json written without its display keys
    c.js(f"document.querySelector('{FUEL} details[data-fold=settings]').open = true")
    c.page.fill(f'{FUEL} input[data-k="taxiMin"]', '15')
    c.page.locator(f'{FUEL} input[data-k="taxiMin"]').blur()
    f = c.until_doc(FJ, lambda d: d and d.get('taxiMin') == 15, 'fuel.json written with the new taxi time')
    c.eq([k for k in keys if k in f], [], 'fuel.json has no display key any more', what='fuel.json keys')
    # a change of the fuel unit: the device document only
    c.page.select_option(f'{FUEL} select[data-k="unit"]', 'kg')
    d = c.until_doc(D, lambda d: d and d.get('displayUnit') == 'kg', 'the unit written on the device')
    c.settle()
    c.eq([k for k in keys if k in (c.doc(FJ) or {})], [], 'still nothing of the display in fuel.json', what='fuel.json after the unit')
    # the device document wins over an old fuel.json (another device that has not migrated yet wrote it)
    c.open('fuel', docs=flight_docs() + [[FJ, {**old, 'displayUnit': 'kg'}, 'document'], [D, {'schema': 1, 'displayUnit': 'lb'}, 'cache']])
    wait_quote(c)
    to_step(c, 3)
    c.ok('lb' in norm(c.text(f'{FUEL} [data-settingssum]') or ''), c.text(f'{FUEL} [data-settingssum]'), 'the device document says lb: lb')

@case('F151', 'Departure step: the flight held on this device says so and offers « Envoyer ce vol à mes appareils »; the gesture sends it at once '
      '(one commit with the flight), then « Vol envoyé à vos appareils à … »',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0279 (the user: one grouped send every five minutes, the current flight kept on the device until its gesture; V3 Frame 6286277f6: '
      'FrameData.sendNow, the held class); a fake launcher transport (/__setup/changes and /__setup/batch answered here, never a real one); captures 390 and 1 280')
def f151(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        posts = []
        c.context.route(re.compile(r'/__setup/changes'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'head': 'h1', 'tree': {}})))
        c.context.route(re.compile(r'/__setup/batch'), lambda r: (posts.append(json.loads(r.request.post_data or '{}')),
                                                                  r.fulfill(status=200, content_type='application/json', body=json.dumps({'head': f'h{len(posts) + 1}'}))))
        c.open('fuel', docs=flight_docs())
        wait_quote(c)
        # the workstation transport (a launcher that answers): writes are grouped, the current flight is HELD
        c.js("""() => { FrameData.configure({ transport: { ...FrameData.launcher({}), quick: true }, identity: { trigram: 'ABC' } });
          window.__w = FrameData.adapter({ id: 'testwriter', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] }) }""")
        f = c.doc('pilot/ABC/current_flight.json') or {}
        c.js("(d) => window.__w.put('pilot/ABC/current_flight.json', d)", {**f, 'updated_at': '2026-11-12T18:00:00Z'})
        to_step(c, 4)
        c.until(f"!!document.querySelector('{FUEL} [data-send]:not([hidden]) [data-do=sendflight]:not([disabled])')", timeout=10000,
                what=f'{w} px: the flight held, its gesture offered')
        c.eq(norm(c.text(f'{FUEL} [data-sendsays]') or ''), norm(tx(F, 'sendHeld', c.lang)), 'said: on this device until it is sent', what='held line')
        c.eq(norm(c.text(f'{FUEL} [data-do=sendflight]') or ''), norm(tx(F, 'sendBtn', c.lang)), '« Envoyer ce vol à mes appareils »', what='button')
        c.eq(len(posts), 0, 'nothing sent before the gesture (the flight is held)', what='no commit')
        c.js(f"document.querySelector('{FUEL} [data-send]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F151_{c.design}_{w}_{c.lang}_delivered.png')
        c.tap(f'{FUEL} [data-do="sendflight"]')
        c.until(f"!!document.querySelector('{FUEL} [data-send] [data-sent]')", timeout=10000, what=f'{w} px: « Vol envoyé à vos appareils à … »')
        paths = sorted({ch['path'] for p in posts for ch in p.get('changes', [])})
        c.ok(len(posts) == 1 and 'pilot/ABC/current_flight.json' in paths, [len(posts), paths], 'one commit, with the flight')
        c.ok(norm(tx(F, 'sentAt', c.lang).split('{t}')[0]) in norm(c.text(f'{FUEL} [data-sent]') or ''), c.text(f'{FUEL} [data-sent]'), 'the line says it left, and when')
        c.ok(not c.js(f"!!document.querySelector('{FUEL} [data-do=sendflight]')"), '', 'no button once the flight left')
        c.context.unroute(re.compile(r'/__setup/changes'))
        c.context.unroute(re.compile(r'/__setup/batch'))



def _atis_feeds(c, vatsim_text, vatsim_age_min=12, ivao_lines=None):
    """FAKE public feeds (c.context.route on the two hosts the suite already reads, never the real ones), in the shapes of the survey of
    12 Nov: VATSIM `atis[]` (callsign, atis_code, last_updated, text_atis; a name and a cid that must never be read) and IVAO
    `clients.atcs[].atis` (lines, revision, timestamp; a userId). The calls are counted in st['calls']."""
    now = datetime.datetime.now(datetime.timezone.utc)
    iso = lambda m: (now - datetime.timedelta(minutes=m)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    vat = {'controllers': [], 'atis': [{'callsign': 'LFML_ATIS', 'atis_code': 'F', 'last_updated': iso(vatsim_age_min), 'text_atis': vatsim_text,
                                        'name': 'Invented Person', 'cid': 1000001, 'frequency': '128.500'}]}
    iv = {'clients': {'atcs': [{'callsign': 'LFML_TWR', 'userId': 200001, 'atcSession': {'frequency': 118.1},
                                'atis': {'lines': ivao_lines or [], 'revision': 'D', 'timestamp': iso(5)}}]}}
    st = {'calls': []}

    def handler(route):
        u = route.request.url
        st['calls'].append(u)
        route.fulfill(status=200, content_type='application/json', body=json.dumps(vat if 'vatsim' in u else iv))
    c.context.route(re.compile(r'https://(data\.vatsim\.net|api\.ivao\.aero)/'), handler)
    return st


def _atis_open(c, networks):
    """Fuel on the flight with the seeded procedures (LFML arrival), a company whose networks are `networks`, a pilot with both identities."""
    c.open('fuel', docs=proc_docs() + proc_flight(None) + [['airline/settings.json', {'name': 'Test', 'networks': networks}, 'document']],
           airfields=True, identity={'vatsim': '1000001', 'ivao': '200001'})
    to_step(c, 1)
    wait_rows(c, 'arr')


@case('F152', 'Procedures: the runway in use from the ATIS of the flight\'s networks, its gesture the only one (the wind suggestion only without an ATIS '
      'runway; SOG-0325), its letter, QNH and wind; the traps of the survey give no runway; an offline company reads nothing; an ATIS over 90 min is not said',
      'F', tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0090 second lot (the ergonomist\'s GO, 12 Nov: a closed list of phrasings, a runway kept only if the aerodrome has it, a clash or a '
      'phrasing off the list = nothing, never a timer, the age shown, 90 min at most; the networks of the current company crossed with the pilot\'s '
      'identities, Q-0038); invented feeds in the shapes of the survey; captures 390 and 1 280')
def f152(c):
    T = 'modules/fuel/procedures_texts.js'
    traps = ['LFML_TWR', 'ATTN RWY 31L RENAMED TO RWY 13R', 'VISUAL OPS RWY 31L', 'LFML 121700Z 31012KT 2000 R13R/1100U', 'RMK VOR 13R']
    route_metar(c, {'LFML': (310, 12)})
    line = f'{FUEL} [data-proc="arr"] [data-rwyprob]'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        st = _atis_feeds(c, ['MARSEILLE INFORMATION F', 'EXPECT ILS APCH RWY 13R. RWY IN USE 13R', 'TRL 70'], ivao_lines=traps)
        _atis_open(c, {'vatsim': True, 'ivao': True})
        c.until(f"!!document.querySelector('{line} [data-atisline=vatsim]')", timeout=20000, what=f'{w} px: the ATIS line')
        c.settle()
        atis = norm(c.text(f'{line} [data-atisline=vatsim]') or '')
        # SOG-0325 : la ligne de l'ATIS porte tout, « ATIS F · VATSIM · piste 13R · …Z »
        c.ok(atis.startswith('ATIS F · VATSIM · ' + norm(tx(T, 'procRwyWord', c.lang).replace('{r}', '13R'))) and 'Z' in atis and norm(tx(T, 'procAtisTake', c.lang)) in atis
             and 'RWY IN USE' not in atis and 'Invented' not in atis, atis, f'{w} px: « ATIS F · VATSIM · piste 13R · …Z », its gesture; never the text, never a name')
        ivao = norm(c.text(f'{line} [data-atisline=ivao]') or '')
        c.ok(not c.js(f"!!document.querySelector('{line} [data-atisline=ivao] [data-do=rwyprob]')") and '13R' not in ivao and '31L' not in ivao, ivao,
             'the IVAO ATIS made only of traps (renamed, visual ops, RVR, RMK) gives no runway (its METAR group gives its wind: SOG-0325)')
        order = c.js(f"[...document.querySelectorAll('{line} .fu-rwyline')].map(e => e.hasAttribute('data-atisline') ? 'atis' : 'metar')")
        # retouche de l'ergonome (23 h 36) : une ATIS qui donne une piste en service, « Prendre la piste de l'ATIS » est le SEUL geste (le
        # choix du contrôle) ; la suggestion par le vent (« Prendre la 31L ») ne revient que sans ATIS
        c.eq(order, ['atis', 'atis'], 'an ATIS gives the runway in use: no wind suggestion beside it (two gestures that contradict)', what='order')
        c.eq(c.count(f'{line} [data-do=rwyprob]'), 1, 'one gesture only: the ATIS runway', what='gestures')
        c.ok(sorted({u.split('/')[2] for u in st['calls']}) == ['api.ivao.aero', 'data.vatsim.net'], st['calls'], 'the two feeds the suite already reads, no other host')
        c.js(f"document.querySelector('{line}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F152_{c.design}_{w}_{c.lang}_delivered.png')
        c.context.unroute(re.compile(r'https://(data\.vatsim\.net|api\.ivao\.aero)/'))
    c.tap(f'{line} [data-atisline=vatsim] [data-do="rwyprob"]')
    cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('rwy') == '13R', 'the ATIS runway taken by the gesture', timeout=8000)
    # SOG-0325 : la ligne reste (elle porte aussi le QNH et le vent), sans son geste une fois sa piste celle du vol
    c.until(f"!document.querySelector('{line} [data-atisline=vatsim] [data-do=rwyprob]')", timeout=5000, what='no gesture once the ATIS runway is the flight\'s')
    # agreeing with the METAR: the ATIS alone
    _atis_feeds(c, ['RWY IN USE 31L'])
    _atis_open(c, {'vatsim': True})
    c.until(f"!!document.querySelector('{line} [data-atisline=vatsim]')", timeout=20000, what='the ATIS 31L')
    c.ok(not c.js(f"!!document.querySelector('{line} [data-metarline]')"), '', 'the METAR line is quiet when it agrees with the ATIS')
    c.context.unroute(re.compile(r'https://(data\.vatsim\.net|api\.ivao\.aero)/'))
    # an ATIS older than 90 min: nothing; the METAR line alone
    _atis_feeds(c, ['RWY IN USE 13R'], vatsim_age_min=100)
    _atis_open(c, {'vatsim': True})
    c.until(f"!!document.querySelector('{line} [data-metarline]')", timeout=20000, what='the METAR line')
    c.settle()
    c.ok(not c.js(f"!!document.querySelector('{line} [data-atisline]')"), '', 'an ATIS of 100 min is not said')
    c.context.unroute(re.compile(r'https://(data\.vatsim\.net|api\.ivao\.aero)/'))
    # a company offline only: nothing asked
    st = _atis_feeds(c, ['RWY IN USE 13R'])
    _atis_open(c, {'offline': True})
    c.until(f"!!document.querySelector('{line} [data-metarline]')", timeout=20000, what='the METAR line')
    c.settle()
    c.eq(st['calls'], [], 'a company offline only reads no ATIS feed', what='calls')
    c.context.unroute(re.compile(r'https://(data\.vatsim\.net|api\.ivao\.aero)/'))



_PT4 = '4600N00030W'


def _direct_docs(started=True, actual=True):
    """The planned flight (LFRS LUGEN NEPIX LFML) with a point imposed by the mission between LUGEN and NEPIX (PT4, in coordinates, 10 min on
    area), started, and a real position of now just after LUGEN (the frame's progress.actual, as the simulator gives it). Invented."""
    docs = flight_docs(started)
    f = docs[1][1]
    r = f['route']
    r['text'] = f'LFRS LUGEN {_PT4} NEPIX LFML'
    r['points'].insert(2, {'id': _PT4, 'lat': 46.0, 'lon': -0.5, 'lock': 'mission', 'mission': 'PT4'})
    r['locks'] = [{'id': _PT4, 'mid': 'PT4', 'name': 'PT4'}]
    r['holds'] = {_PT4: {'min': 5, 'max': 40, 'count': 10, 'name': 'PT4'}}
    if actual:
        now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        f['progress'] = {'actual': {'at': now, 'lat': 46.45, 'lon': -1.0, 'altFt': 27000, 'gsKt': 300, 'trackDeg': 125, 'source': 'xplane'}}
    return docs


@case('F154', 'Direct to a point on instruction of the controller: the Map\'s address opens the panel (from the real position, the points '
      'skipped, the imposed one in red, its time on area removed), a second confirmation for the imposed point, the route rewritten with the '
      'trace for the report, « Annuler le direct » gives the route back; a passed point is refused; a flight not started: the point in « Ajouter »',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0088 (the ergonomist\'s GO, 12 Nov: contract #fuel?direct=<ID>[&lat&lon] given to BUGS SOG; (a) an imposed point may be skipped, '
      'said in red, second confirmation, the report keeps « non survolé : direct du contrôle »; (b) its time on area removed and said; (c) the '
      'real position under 2 min, else the planned one, else the last point passed; a point farther than the rest of the route refused; undo); '
      'captures 390 and 1 280')
def f154(c):
    path = 'pilot/ABC/current_flight.json'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel?direct=NEPIX', docs=_direct_docs())
        c.until(f"!!document.querySelector('{FUEL} [data-block=direct]:not([hidden]) [data-directsays]')", timeout=15000,
                what=f'{w} px: the panel of the direct, from the address')
        says = norm(c.text(f'{FUEL} [data-directsays]') or '')
        frm = norm(tx(F, 'directFromActual', c.lang).split('(')[0])
        c.ok('NEPIX' in says and frm in says and 'PT4' in says and _PT4 not in says, says, f'{w} px: « Direct NEPIX depuis votre position (…) : PT4 sauté · … » (its mission name)')
        c.eq(c.js(f"document.querySelector('{FUEL} input[data-k=direct]').value"), 'NEPIX', 'the asked point in the field', what='field')
        c.eq(norm(c.text(f'{FUEL} [data-directlock]') or ''), norm(tx(F, 'directLock', c.lang).replace('{id}', 'PT4')), 'the imposed point named, in red',
             what='lock line')
        c.ok(c.js(f"document.querySelector('{FUEL} [data-directlock]').dataset.kind") == 'err', '', 'said as an error (red)')
        c.ok('10' in (c.text(f'{FUEL} [data-directhold]') or '') and 'PT4' in (c.text(f'{FUEL} [data-directhold]') or ''), c.text(f'{FUEL} [data-directhold]'),
             'its 10 min on area said removed, by its name')
        c.eq([x for x in str((c.doc(path) or {}).get('route', {}).get('text', '')).split() if x != 'DCT'], ['LFRS', 'LUGEN', _PT4, 'NEPIX', 'LFML'],
             'nothing written before « Appliquer »', what='not yet')
        c.js(f"document.querySelector('{FUEL} [data-block=direct]').scrollIntoView({{block: 'start'}})")
        c.shot(f'F154_{c.design}_{w}_{c.lang}_delivered.png')
    # apply: the second confirmation, then the route rewritten from the position, the lock and the hold gone with the point, the trace
    c.tap(f'{FUEL} [data-do="directapply"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='the second confirmation (an imposed point skipped)')
    c.tap('.f-modal [data-ok]')
    d = cf_doc(c, lambda d: 'NEPIX' in str((d.get('route') or {}).get('text', '')) and _PT4 not in str((d.get('route') or {}).get('text', '')),
               'the route rewritten', timeout=10000)
    r = d['route']
    ids = [p['id'] for p in r['points']]
    c.ok(ids[:2] == ['LFRS', 'LUGEN'] and ids[-2:] == ['NEPIX', 'LFML'] and len(ids) == 5 and re.fullmatch(r'\d{4}[NS]\d{5}[EW]', ids[2]), ids,
         'LFRS LUGEN <the position, in ICAO coordinates> NEPIX LFML')
    c.ok(not r.get('locks') and not (r.get('holds') or {}).get(_PT4), [r.get('locks'), r.get('holds')], 'the lock and the time on area left with the point')
    tr = (r.get('directs') or [{}])[-1]
    c.ok(tr.get('to') == 'NEPIX' and tr.get('from') == 'actual' and tr.get('notOverflown') == ['PT4'] and tr.get('skipped') == [_PT4], tr,
         'the trace for the report: PT4 not overflown, direct from ATC')
    c.until(f"!!document.querySelector('{FUEL} [data-do=directundo]')", what='« Annuler le direct »')
    c.tap(f'{FUEL} [data-do="directundo"]')
    words = lambda d: [x for x in str((d.get('route') or {}).get('text', '')).split() if x != 'DCT']
    cf_doc(c, lambda d: words(d) == ['LFRS', 'LUGEN', _PT4, 'NEPIX', 'LFML'] and (d.get('route') or {}).get('locks') and ((d.get('route') or {}).get('holds') or {}).get(_PT4),
           'the route of before, its lock and its time on area back', timeout=10000)
    # a point already passed: refused, said
    c.page.fill(f'{FUEL} input[data-k="direct"]', 'LUGEN')
    c.tap(f'{FUEL} [data-do="directprep"]')
    c.until(f"!!document.querySelector('{FUEL} [data-directwhy]')", what='the refusal')
    c.eq(norm(c.text(f'{FUEL} [data-directwhy]') or ''), norm(tx(F, 'directWhyPassed', c.lang).replace('{id}', 'LUGEN')), 'LUGEN is already passed',
         what='passed')
    # a flight not started: the step Route, the name in « Ajouter un point »
    c.open('fuel?direct=NEPIX', docs=_direct_docs(started=False, actual=False))
    c.until(f"document.querySelector('{FUEL} [data-k=addpt]')?.value === 'NEPIX'", timeout=15000, what='the point in « Ajouter un point »')
    c.ok(c.js(f"document.querySelector('{FUEL} [data-block=direct]').hidden"), '', 'no direct on a flight not started')



@case('F155', 'Route in the format of the flight plans of the tools: « LFRS/21 NTS2B … MEN2B LFML/31L » typed sets the runways, the SID and the '
      'STAR; a runway chosen in the list is written after its aerodrome; a runway the aerodrome does not have is said, nothing chosen',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0089 (roadmap: « Route au format FPL avec piste et procédures (LFPO/07 OPAL2E OPALE DCT …) : lue et écrite »): the reader dropped '
      '« /07 » without a word; the text is a view of the model (§ 10.31); seeded invented procedures (LFRS 03/21, LFML 13R/31L); captures 390 and 1 280')
def f155(c):
    path = 'pilot/ABC/current_flight.json'
    words = lambda d: [x for x in str((d.get('route') or {}).get('text', '')).split() if x != 'DCT']
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        open_proc(c)
        wait_rows(c, 'dep')
        wait_rows(c, 'arr')
        # no procedure in the text first: only the text can give the runways (a SID serving one runway would set it by itself)
        _route_typed(c, 'LFRS/21 LUGEN NEPIX LFML/13R')
        cf_doc(c, lambda d: (procs_of(d, 'dep') or {}).get('rwy') == '21' and (procs_of(d, 'arr') or {}).get('rwy') == '13R',
               f'{w} px: runways 21 and 13R set by the text alone', timeout=12000)
        _route_typed(c, 'LFRS/21 NTS2B LUGEN NEPIX MEN2B LFML/31L')
        d = cf_doc(c, lambda d: (procs_of(d, 'dep') or {}).get('rwy') == '21' and (procs_of(d, 'arr') or {}).get('rwy') == '31L'
                   and str((procs_of(d, 'dep') or {}).get('sid', '')).startswith('LFRS.SID.NTS2B') and str((procs_of(d, 'arr') or {}).get('star', '')).startswith('LFML.STAR.MEN2B'),
                   f'{w} px: runways 21 and 31L, SID NTS2B, STAR MEN2B set by the text', timeout=12000)
        c.until(f"(() => {{ const v = document.querySelector('{FUEL} [data-k=rtext]').value.trim().split(/\\s+/); return v[0] === 'LFRS/21' && v.at(-1) === 'LFML/31L' }})()",
                timeout=8000, what=f'{w} px: the text keeps « LFRS/21 … LFML/31L » after its normalisation')
        c.js(f"document.querySelector('{FUEL} [data-k=rtext]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F155_{c.design}_{w}_{c.lang}_delivered.png')
    # a runway chosen in the list: written after its aerodrome
    unfold(c, 'dep')
    pick_proc(c, 'p-dep-rwy', '03')
    cf_doc(c, lambda d: words(d)[:1] == ['LFRS/03'], 'the runway chosen in the list written « LFRS/03 »', timeout=10000)
    # a runway the aerodrome does not have: said, nothing chosen
    n0 = c.js("(window.__notes || []).length")
    _route_typed(c, 'LFRS/09 LUGEN NEPIX LFML')
    c.until("(n) => (window.__notes || []).slice(n).some(x => /LFRS\/09/.test(x))", n0, timeout=8000, what='« LFRS/09 : piste inconnue »')
    c.settle()
    c.eq((procs_of(c.doc(path), 'dep') or {}).get('rwy'), '03', 'the runway chosen stays (09 is not a runway of LFRS)', what='rwy kept')

    # a pasted flight plan with its speed / level group in front: the group is said ignored, it never hides « LFRS/21 »
    n0 = c.js("(window.__notes || []).length")
    _route_typed(c, 'N0450F350 LFRS/21 LUGEN NEPIX LFML')
    c.until("(n) => (window.__notes || []).slice(n).some(x => /N0450F350/.test(x))", n0, timeout=8000, what='« N0450F350 : … ignoré »')
    cf_doc(c, lambda d: (procs_of(d, 'dep') or {}).get('rwy') == '21', 'the runway after the group read', timeout=8000)


@case('F156', 'A flight of before the runway in the text (runway chosen, text without « /RW »): the text is redone from the model at the opening '
      '(« LFRS/03 … »); then « /03 » erased removes the runway, said', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=False, rule='SOG-0089 (the ergonomist, 12 Nov: one rule for all the text carries, erasing « /07 » removes the runway; the text of an '
      'old flight redone at the opening, so that erasing is a wanted gesture)')
def f156(c):
    words = lambda d: [x for x in str((d.get('route') or {}).get('text', '')).split() if x != 'DCT']
    open_proc(c, procs=V2_PROCS)   # route text « LFRS LUGEN NEPIX LFML », runway 03 at LFRS and 13R at LFML chosen
    wait_rows(c, 'dep')
    cf_doc(c, lambda d: words(d)[:1] == ['LFRS/03'] and words(d)[-1:] == ['LFML/13R'], 'the text redone at the opening: « LFRS/03 … LFML/13R »', timeout=12000)
    n0 = c.js("(window.__notes || []).length")
    txt = c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value")
    _route_typed(c, txt.replace('LFRS/03', 'LFRS'))
    cf_doc(c, lambda d: not (procs_of(d, 'dep') or {}).get('rwy'), '« /03 » erased: the departure runway removed', timeout=8000)
    c.until("(n) => (window.__notes || []).slice(n).some(x => /LFRS/.test(x))", n0, timeout=6000, what='« Piste de départ retirée (LFRS) »')



@case('F157', 'Route computation: the wait is visible from the tap (both buttons busy, then the seconds), a second tap starts nothing; over 3 s '
      'the line says where the time went (« Calculé en 4,6 s — dont 4,2 s chez le lanceur ») with « Copier le diagnostic »; under 3 s nothing',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0134 refused on 11 Nov (« toujours pareil. instable, lent. »), the ergonomist on 12 Nov: the user\'s workstation gives the facts '
      '(four instants, kept on the device, cache/fuel/route_timing.json, no route beyond departure → arrival); a fake launcher delayed by 4 s; '
      'the route engine untouched; captures 390 and 1 280')
def f157(c):
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        st = _route_launcher(c, ['route/compute'])
        st['delay'] = 4.0
        open_proc(c)
        c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
        c.tap(f'{FUEL} [data-do="rcompute"]')
        c.until(f"document.querySelector('{FUEL} [data-do=rcompute]').disabled && document.querySelector('{FUEL} [data-do=rcheck]').disabled "
                f"&& !!document.querySelector('{FUEL} [data-rbusy]')", timeout=3000, what=f'{w} px: busy from the tap')
        c.js(f"document.querySelector('{FUEL} [data-do=rcompute]').click()")   # a second tap: a disabled button, nothing starts
        c.until(f"/\\d/.test(document.querySelector('{FUEL} [data-rbusy]')?.textContent || '')", timeout=4000, what='the seconds after 2 s')
        c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", timeout=15000, what='three routes')
        c.until(f"!!document.querySelector('{FUEL} [data-rtime]:not([hidden])')", timeout=5000, what=f'{w} px: the line of the duration')
        line = norm(c.text(f'{FUEL} [data-rtime]') or '')
        head = norm(tx(F, 'rTimeLauncher', c.lang).split('{t}')[0])
        c.ok(line.startswith(head) and c.js(f"document.querySelector('{FUEL} [data-rtime]').dataset.part") == 'launcher'
             and norm(tx(F, 'rTimeCopy', c.lang)) in line, line, 'said in words, the launcher\'s part first, « Copier le diagnostic »')
        c.eq(len([p for p in st['posts'] if ((p.get('args') or {}).get('action') == 'calculate' or p.get('verb') == 'compute') and not (p.get('args') or {}).get('alternatives')]), 1,
             'one computation only (the second tap started nothing)', what='posts')
        d = c.until_doc('cache/fuel/route_timing.json', lambda d: bool(d and (d.get('ms') or {}).get('total')), 'the durations kept on the device')
        c.ok(d['ms']['launcher'] >= 3500 and d['ms']['total'] > 3000 and d['route'] == 'LFRS → LFML' and set(d) <= {'schema', 'at', 'action', 'route', 'ms'},
             d, 'milliseconds, departure → arrival only')
        c.ok(not c.js(f"document.querySelector('{FUEL} [data-do=rcompute]').disabled"), '', 'the buttons free again')
        c.js(f"document.querySelector('{FUEL} [data-rtime]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F157_{c.design}_{w}_{c.lang}_delivered.png')
        c.context.unroute(re.compile(r'/__setup/'))
    n0 = c.js("(window.__notes || []).length")
    c.tap(f'{FUEL} [data-do="rtimecopy"]')
    c.until("(n) => (window.__notes || []).length > n", n0, timeout=4000, what='« Diagnostic du calcul copié. »')
    # a quick launcher: nothing said
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", timeout=15000, what='three routes')
    c.settle()
    c.ok(c.js(f"document.querySelector('{FUEL} [data-rtime]').hidden"), '', 'under 3 s: nothing said')



@case('F158', 'The route text of a flight of before the runway in the text is redone at the opening, before its first draw (« LFRS/03 … »); a '
      'text being typed in the field is never replaced', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0089, the ergonomist (12 Nov): ONE rewrite, synchronous with the opening (before the first draw of the step Route), never while '
      'the field has the focus or an unsaved entry, never a write of the flight of its own')
def f158(c):
    rt = f"document.querySelector('{FUEL} [data-k=rtext]')"
    # the FIRST text the field shows, from the page load (a watch at each frame, installed before the opening)
    c.page.add_init_script("""(() => { const look = () => { const e = document.querySelector('[data-module=fuel] [data-k=rtext]');
      if (e && e.value && !window.__firstRt) window.__firstRt = e.value; if (!window.__firstRt) requestAnimationFrame(look) }; look() })()""")
    open_proc(c, procs=V2_PROCS)   # route text « LFRS LUGEN NEPIX LFML », runways 03 and 13R chosen: a flight of before
    first = c.js("window.__firstRt || ''")
    c.ok(first.split()[:1] == ['LFRS/03'] and first.split()[-1:] == ['LFML/13R'], first,
         'the FIRST text the field shows is already « LFRS/03 … LFML/13R » (never changed under the pilot\'s eyes a second later)')
    # typing in the field (focus, no exit): the text stays what the pilot types, whatever the screen reads or computes meanwhile
    c.page.locator(f'{FUEL} [data-k="rtext"]').click()
    c.page.keyboard.press('End')
    c.page.keyboard.type(' ')
    typed = c.js(f"{rt}.value")
    c.wait(3000)
    c.eq(c.js(f"{rt}.value"), typed, 'the text being typed is not replaced', what='typed')
    c.ok(c.js(f"document.activeElement === {rt}"), '', 'the field kept the focus')



@case('F159', 'Route timing: a departure that is not a code (a flight written by another device: 4 000 signs) is kept as « ? » on the device',
      'F', tags=('fuel', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0283 (Sécurisation, audit 170 on 53c265b03): only a recognised code (letters and digits, 12 at most) enters cache/fuel/route_timing.json')
def f159(c):
    st = _route_launcher(c, ['route/compute'])
    docs = proc_docs() + proc_flight(None)
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route']['dep'] = '<b>' + 'X' * 4000
    c.open('fuel', docs=docs, airfields=True)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    d = c.until_doc('cache/fuel/route_timing.json', lambda d: bool(d and d.get('route')), 'the durations kept on the device', timeout=15000)
    c.eq(d['route'], '? → LFML', 'the hostile departure kept as « ? »', what='route')



@case('F160', 'Quote: the wind counted leg by leg on a dog-legged route (full wind triangle: a strong crosswind slows too), said « vent par '
      'tronçon »; the cruise time of the quote is the sum of the plan\'s, to the same rounding', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0281 (the ergonomist\'s GO, 12 Nov): ONE function for the time of a leg read by the quote and the plan; the full triangle; the '
      'rhumb course of each leg; the leg\'s wind = its ends\' when read, else the flight\'s; an invented dog-legged route LFRS → 48°N 3°E → LFML, '
      'a typed wind 345°/60 kt (across the first branch, behind the second)')
def f160(c):
    path = 'pilot/ABC/current_flight.json'
    docs = flight_docs()
    f = docs[1][1]
    r = f['route']
    r['text'] = 'LFRS 4800N00300E LFML'
    r['points'] = [r['points'][0], {'id': '4800N00300E', 'lat': 48.0, 'lon': 3.0}, r['points'][-1]]
    r.pop('distanceNm', None)
    f['wind'] = {'dirDeg': 345, 'speedKt': 60}
    f['windSource'] = {'kind': 'typed'}
    c.open('fuel', docs=docs)
    wait_quote(c)
    word = norm(tx(F, 'windByLeg', c.lang))
    c.until(f"(w) => (document.querySelector('{FUEL} [data-block=result]')?.title || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w) || "
            f"[...document.querySelectorAll('{FUEL} [data-block=result] *')].some(e => (e.title || e.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))",
            word, timeout=12000, what='the quote says « vent par tronçon »')
    d = c.until_doc(path, lambda d: bool(((d or {}).get('quote') or {}).get('legs')), 'the quote written with the plan\'s times', timeout=12000)
    q = d['quote']
    c.ok(abs(q['legs'][-1]['min'] - q['minutes']) <= 0.6, [q['legs'][-1], q['minutes']],
         'the time at the arrival in the plan equals the quote\'s flight time (the same legs, the same ground speed)')



@case('F201', 'Route step, a choice made on a Map alone (#fuel?ralt=): the alternatives are published EMPTY (document and event: the Map clears its '
      'layer); back in Fuel without any choice, the proposals of the document come back (same pair, nothing chosen)', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0224, Fuel side (ergonomist\'s queue of 13 Nov): altsFromAddress set S.alts to null before taking the route, so altsClear '
      'published nothing — the Map alone kept the proposals; a return to Fuel without a choice showed no list although the document held one')
def f201(c):
    _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until_doc('cache/fuel/route_alts.json', lambda x: x and len(x.get('alternatives') or []) == 3, 'three routes in the document', timeout=8000)
    # back in Fuel without a choice (another screen, then Fuel): the list of the document again
    c.go('maps')
    c.go('fuel')
    to_step(c, 1)
    c.until(f"document.querySelectorAll('{FUEL} [data-routealts] [data-alt]').length === 3", timeout=10000,
            what='the three proposals back from the document, nothing chosen')
    # a choice made on a Map alone: the route taken, the document emptied (the Map clears its layer)
    c.js(_ALTS_LISTEN)
    c.go('fuel?ralt=2')
    cf_doc(c, lambda d: [w for w in str((d.get('route') or {}).get('text', '')).split() if w != 'DCT'][:3] == ['LFRS', 'LUGEN', 'LFML'],
           'the address ralt=2 takes the third route', timeout=12000)
    c.until_doc('cache/fuel/route_alts.json', lambda x: x is not None and len(x.get('alternatives') or []) == 0,
                'the document published empty after a choice from the Map alone', timeout=8000)



_CH_WIND = """[...document.querySelectorAll('[data-module="maps"] .mp-ch-row[data-fam=rwy]')].map(b => [b.dataset.id, (b.querySelector('.mp-ch-wind') || {}).textContent || ''])"""


@case('F202', 'The arrival runway chosen « Sur la carte »: each runway of the Map\'s choice says its head and cross wind from the METAR Fuel has '
      'read, end to end from Fuel — a METAR missing at the mount is read before the Map opens', 'F', tags=('fuel', 'maps', 'weather'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0306 (user, 13 Nov: « le choix des pistes d\'arrivée, via le bouton « sur la carte » : plus d\'infos de vent face/travers. comment '
      'choisir !? c\'était présent avant. ») — the Map reads the METAR from the frame\'s weather cache only')
def f202(c):
    # the METAR is not there when Fuel mounts (its one reading of the mount fails: no answer yet), it answers later
    c.context.route(re.compile(r'aviationweather\.gov|metar\.vatsim\.net', re.I), lambda route: route.abort())
    open_proc(c)
    wait_rows(c, 'arr')
    c.settle()
    c.eq(c.doc('cache/weather/metar/LFML.json'), None, 'no METAR kept at the mount', what='cache')
    c.context.unroute(re.compile(r'aviationweather\.gov|metar\.vatsim\.net', re.I))
    route_metar(c, {'LFML': (310, 12)})
    c.tap(f'{FUEL} [data-proc="arr"] .fu-proctitle [data-do="onmap"]')
    c.until("""document.querySelectorAll('[data-module="maps"] .mp-ch-row[data-fam=rwy]').length > 0""", timeout=15000, what='the runways of the choice')
    rows = c.js(_CH_WIND)
    rw = [r for r in rows if r[0] != 'none']  # « Aucune » is not a runway
    c.ok(rw and all(w for _, w in rw), rows, 'every runway of the choice says its head and cross wind')



# SOG-0210 (refused 13 Nov): LFML's procedures as if read from Little Navmap on this device (status lnm), the others untouched
_LNM_RECORDS_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const ps = db.procedures;
        db.procedures = async (icao, q) => { const r = await ps.call(db, icao, q);
          return String(icao).toUpperCase() === 'LFML' ? (r || []).map(x => ({ ...x, status: 'lnm' })) : r } } catch (e) {}
      return db } } } }) })()"""


@case('F203', 'Little Navmap: a procedure read from Little Navmap says so where it is chosen (a warning line under the lists: source, personal '
      'use) and where it is seen (a mark on the summary line of the side, folded too)', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0210 refused on 13 Nov (user: « pas de warn qui dit que la procédure vient de little nav map ? ») — the source was only in '
      'the options of the list')
def f203(c):
    c.page.add_init_script(_LNM_RECORDS_STUB)
    open_proc(c)
    wait_rows(c, 'arr')
    star = [v for v, l in sel_opts(c, 'p-arr-star') or [] if 'MEN1A' in l]
    c.ok(bool(star), sel_opts(c, 'p-arr-star'), 'a STAR of LFML in the list')
    pick_proc(c, 'p-arr-star', star[0])
    line = f'{FUEL} [data-proc="arr"] [data-lnmline]'
    c.until(f"(() => {{ const e = document.querySelector('{line}'); return !!e && !e.hidden }})()", timeout=8000, what='the warning line under the lists')
    t = norm(c.text(line) or '')
    c.ok('Little Navmap' in t and 'MEN1A' in t and 'personnel' in t, t, 'it names the source, the procedure and the personal use')
    c.ok(c.count(f'{FUEL} [data-proc="arr"] .fu-procsum [data-lnmflag]') == 1, c.text(f'{FUEL} [data-proc="arr"] .fu-procsum'),
         'the summary line of the side carries the mark')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] [data-lnmflag]'), 0, 'not on the departure (its procedures are the base\'s)', what='departure')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('F203_390_lnm.png')



@case('F204', '« Démarrer le vol » starts the flight at the FIRST tap, even when the weather answers slowly: the button stays busy and is not '
      'offered again until the start is written, then « Annuler le départ » is offered', 'F', tags=('fuel',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0088 refused on 13 Nov (user: « il faut démarrer plusieurs fois. étrange. »)')
def f204(c):
    import time as _t

    def slow(route):
        _t.sleep(4)
        route.fulfill(status=200, content_type='application/json', body='[]')
    c.context.route(re.compile(r'aviationweather\.gov|metar\.vatsim\.net', re.I), slow)
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.open('fuel', flight=True)
    wait_quote(c)
    to_step(c, 4)
    c.until(f"!!document.querySelector('{FUEL} [data-startrow] [data-do=start]')", what='« Démarrer le vol »')
    c.tap(f'{FUEL} [data-startrow] [data-do="start"]')
    seen = []
    for _ in range(40):   # 10 s: what the pilot sees while the weather answers
        st = c.js(f"""(() => {{ const b = document.querySelector('{FUEL} [data-startrow] [data-do=start]');
          return b ? (b.disabled || b.getAttribute('aria-busy') === 'true' ? 'busy' : 'free') : document.querySelector('{FUEL} [data-startrow] [data-do=cancelstart]') ? 'started' : 'none' }})()""")
        if not seen or seen[-1] != st:
            seen.append(st)
        if st == 'started':
            break
        c.wait(250)
    c.ok('free' not in seen and seen[-1] == 'started', seen, 'one tap: busy until the start is written, never offered again meanwhile')
    cf_doc(c, lambda d: bool((d.get('started') or {}).get('at')), 'the flight is written started', timeout=8000)



@case('F205', 'Direct, refusal of 13 Nov: a point of the route asked by its mission name (« PT4 ») is on the route; a point far off the route '
      '(farther than the rest of it) is allowed, with a warning that says its distance to the route', 'F', tags=('fuel',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0088 refused on 13 Nov (user: « le contrôle peut donner un direct vers un point autre que la route. un warn, avec la distance '
      'à la route. ici, sur lfop lfbd, le direct PT m\'est refusé. pourtant, c\'est sur la route (ou presque). »)')
def f205(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel?direct=PT4', docs=_direct_docs())
    c.until(f"!!document.querySelector('{FUEL} [data-block=direct]:not([hidden]) [data-directsays], {FUEL} [data-directwhy]')", timeout=15000,
            what='the panel of the direct to PT4')
    c.eq(c.count(f'{FUEL} [data-directwhy]'), 0, 'PT4 (the mission name of a point in coordinates) is not refused', what='refusal')
    c.eq(c.count(f'{FUEL} [data-directoff]'), 0, 'it is on the route: no warning', what='warning')
    # a point far off the route, given by the Map with its position (farther than the rest of the route): allowed, said
    c.open('fuel?direct=XFAR&lat=40.0&lon=10.0', docs=_direct_docs())
    c.until(f"!!document.querySelector('{FUEL} [data-block=direct]:not([hidden]) [data-directsays], {FUEL} [data-directwhy]')", timeout=15000,
            what='the panel of the direct to XFAR')
    c.eq(c.count(f'{FUEL} [data-directwhy]'), 0, 'a point off the route is never refused for its distance', what='refusal')
    t = norm(c.text(f'{FUEL} [data-directoff]') or '')
    c.ok('XFAR' in t and 'NM' in t, t, 'a warning says its distance to the route')
    c.ok(c.count(f'{FUEL} [data-do=directapply]') == 1, 'no apply', '« Appliquer » offered')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{FUEL} [data-block=direct]').scrollIntoView({{block: 'start'}})")
    c.shot('F205_390_off.png')



@case('F206', 'Fuel left at once after opening the procedures (its ATIS read still running): no page error — the read is ignored once Fuel is '
      'unmounted', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0317 (found by BUGS SOG, D202: « Cannot read properties of null (reading \'ctx\') », flightNetworks ← atisRead): a read running '
      'when Fuel is left reads the state after its await')
def f206(c):
    errors = []
    c.page.on('pageerror', lambda e: errors.append(str(e)))
    c.page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    # FrameData.airline() answers late: the read of the networks is still waiting when Fuel is left
    c.page.add_init_script("(() => { const t = setInterval(() => { const F = window.FrameData; if (!F || !F.airline || F.__slow) return; const a = F.airline.bind(F);"
                           " F.airline = (...x) => new Promise(r => setTimeout(() => r(a(...x)), 1500)); F.__slow = true; clearInterval(t) }, 5) })()")
    for _ in range(3):
        c.open('fuel', docs=proc_docs() + proc_flight(None, False, None), airfields=True)
        c.js(f"() => {{ const b = document.querySelector('{FUEL} [data-step=\"1\"], {FUEL} [data-tostep=\"1\"]'); b?.click(); location.hash = '#maps' }}")
        c.until("() => !!document.querySelector('[data-module=maps]')", timeout=15000, what='the Map')
        c.wait(2500)
    c.eq([e for e in errors if 'ctx' in e or 'null' in e], [], 'no error from a read of the left Fuel', what='page errors')



# SOG-0301: LFRS (bench) where runway 21 has no SID left (NTS2B removed), the wind 240/8 favouring 21
_NO_SID_21_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const ps = db.procedures;
        db.procedures = async (icao, q) => { const r = await ps.call(db, icao, q);
          return String(icao).toUpperCase() === 'LFRS' ? (r || []).filter(x => !(x.kind === 'SID' && (x.runways || []).some(w => /21/.test(String(w))))) : r } } catch (e) {}
      return db } } } }) })()"""


@case('F207', 'Departure: on an aerodrome that publishes SIDs, a runway without any SID is never the probable runway, whatever the wind',
      'F', tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0301 (LFPO: « la piste 02 n\'a aucun départ publié et ne doit pas être la piste probable au départ »; the ergonomist: on an '
      'aerodrome that publishes SIDs, a runway without any SID is never probable at departure, the same rule at arrival with STARs) — the '
      'rule only, the screen waits for the mock-up of SOG-0308')
def f207(c):
    route_metar(c, {'LFRS': (240, 8), 'LFML': (310, 12)})
    c.page.add_init_script(_NO_SID_21_STUB)
    open_proc(c)
    wait_rows(c, 'dep')
    c.settle()
    line = c.text(f'{FUEL} [data-proc="dep"] [data-rwyprob]') or ''
    c.ok('21' not in line, line, 'runway 21 has no SID left: never said probable, although the wind favours it')
    # the arrival keeps its rule: 31L has its STAR, it stays probable with the wind from 310
    unfold(c, 'arr')
    c.settle()
    c.ok('31L' in (c.text(f'{FUEL} [data-proc="arr"] [data-rwyprob]') or ''), c.text(f'{FUEL} [data-proc="arr"] [data-rwyprob]'),
         'a runway with its STAR stays probable')



@case('F208', 'Route step, back in Fuel without a choice: the proposals of the document are given to the Map in their checked form — points '
      'bounded, segment states, airways and layers from their closed lists, no foreign field', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=False,
      rule='Audit 193 note (Sécurisation, 13 Nov): altsFromDoc gave the Map d.alternatives.slice(0, 3) without the validation of raltsOfDoc; '
      'the document is written by any device (an untrusted entry)')
def f208(c):
    bad = {'name': 'Direct', 'route': 'LFRS LUGEN LFML', 'sid': 'LFRS.SID.<b>', 'star': '', 'ids': ['LFRS', '<img src=x>', 'LFML'],
           'points': [[47.15, -1.6], [999, 5], 'x', [45.0, 2.0], [43.43, 5.21]], 'faulty': [0, 77, 'z'],
           'control': ['controlled', 'evil', 'error'], 'via': ['<b>', 'UN10', 'FRA'], 'layer': ['LOW', 'X', 'HIGH'],
           'proposal': 'yes', 'script': '<script>'}
    doc = {'schema': 1, 'dep': 'LFRS', 'arr': 'LFML', 'mode': 'compute', 'alternatives': [bad], 'chosen': None, 'hovered': None}
    c.open('fuel', docs=proc_docs() + proc_flight(None) + [['cache/fuel/route_alts.json', doc, 'cache']], airfields=True)
    to_step(c, 1)
    c.until(f"document.querySelectorAll('{FUEL} [data-routealts] [data-alt]').length === 1", timeout=10000, what='the proposal of the document')
    c.js(_ALTS_LISTEN)
    c.tap(f'{FUEL} [data-routealts] [data-alt="0"] [data-altname]')
    c.until("(window.__alts || []).length > 0", timeout=5000, what='the route shown, published to the Map')
    a = c.js(_ALTS_LAST)['alternatives'][0]
    c.eq(sorted(a), sorted(['index', 'name', 'route', 'sid', 'star', 'ids', 'points', 'faulty', 'control', 'via', 'layer', 'proposal']),
         'the fields of altsPublish only', what='fields')
    c.eq(a['points'], [[47.15, -1.6], [45.0, 2.0], [43.43, 5.21]], 'the points out of bounds or out of shape left', what='points')
    c.eq([a['sid'], a['ids'][1], a['faulty'], a['control'], a['via'], a['layer'], a['proposal']],
         ['', '', [0], ['controlled', None], ['', 'UN10'], ['LOW', ''], False], 'each value from its closed list', what='checked')



@case('F209', 'Procedures, the block of the validated mock-up (first slice): one side open; folded, a sentence and a mark; open, three lines '
      '(name, value in words, its source, ONE « Changer » that opens the list of THAT line at its place); « Choisir sur la carte » alone in '
      'the head; « Source et cartes » folded at the foot', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=True, langs4=False,
      rule='SOG-0308 (mock-up modules/fuel/maquette/procedures.html validated by the user, Q-0047: « RÀS ! du boulot comme ça, j\'aime. »; '
      'the ergonomist\'s two touches: on a phone « Choisir sur la carte » under the aerodrome\'s name; the folded sentence without '
      '« Départ LFRS ») — the block was a code summary line, four stacked lists and five links in a row')
def f209(c):
    route_metar(c, {'LFRS': (210, 9), 'LFML': (130, 12)})
    open_proc(c)
    wait_rows(c, 'arr')
    A = f'{FUEL} [data-proc="arr"]'
    D = f'{FUEL} [data-proc="dep"]'
    # the head: one gesture, renamed
    c.eq(norm(c.text(f'{A} .fu-proctitle [data-do="onmap"]')), norm(tx(PT, 'procOnMap', c.lang)), 'the head has « Choisir sur la carte »', what='onmap')
    # open: three lines, each with its name and ONE « Changer »; no list shown until it is asked
    rows = c.js(f"[...document.querySelectorAll('{A} [data-prow]')].map(r => [r.dataset.prow, r.querySelectorAll('[data-do=procchange]').length])")
    c.eq(rows, [['rwy', 1], ['main', 1], ['app', 1]], 'three lines: runway, arrival (STAR), approach — one « Changer » each', what='rows')
    c.eq(c.js(f"[...document.querySelectorAll('{A} select')].filter(e => window.__t.shown(e)).length"), 0, 'no list shown before « Changer »', what='lists')
    # « Changer » opens the list of THAT line only, at its place; another « Changer » closes the first
    c.tap(f'{A} [data-prow="rwy"] [data-do="procchange"]')
    shown = c.js(f"[...document.querySelectorAll('{A} select')].filter(e => window.__t.shown(e)).map(e => e.dataset.k)")
    c.eq(shown, ['p-arr-rwy'], 'the runway list alone', what='rwy list')
    opts = c.js(f"[...document.querySelectorAll('{A} select[data-k=p-arr-rwy] option')].map(o => o.textContent)")
    c.ok(any('13R' in o and norm(tx(PT, 'windHead', c.lang)).split('{')[0].strip() in norm(o) for o in opts), opts, 'the runways say their wind in words')
    c.ok(not any(a in o for o in opts for a in '↓↑←→'), opts, 'no arrow alone')
    c.tap(f'{A} [data-prow="main"] [data-do="procchange"]')
    shown = c.js(f"[...document.querySelectorAll('{A} select')].filter(e => window.__t.shown(e)).map(e => e.dataset.k)")
    c.eq(shown[:1], ['p-arr-star'], 'the STAR list, the runway list closed', what='star list')
    c.tap(f'{A} [data-prow="main"] [data-do="procchange"]')
    # a choice: the runway's value in words, the METAR as its source
    pick_proc(c, 'p-arr-rwy', '13R')
    c.until(f"(document.querySelector('{A} [data-r=v-rwy]')?.textContent || '').includes('13R')", what='the runway line says 13R')
    v = c.text(f'{A} [data-r="v-rwy"]')
    c.ok(norm(tx(PT, 'windHead', c.lang)).split('{')[0].strip() in norm(v), v, 'the runway with its wind in words')
    c.ok('130' in (c.text(f'{A} [data-r="src-rwy"]') or ''), c.text(f'{A} [data-r="src-rwy"]'), 'its source: the METAR, 130° / 12 kt')
    # the foot: « Source et cartes », folded, holds « Relire »
    c.ok(not c.js(f"document.querySelector('{A} [data-procfoot]').open"), 'open', 'the foot is folded')
    c.ok(not c.shown(f'{A} [data-do="procfetch"]'), c.js(f"[...document.querySelectorAll('{A} [data-do=procfetch]')].map(e => [e.closest('details') ? 'details' : e.parentElement.className, window.__t.shown(e)])"), '« Relire » is in the foot, not on the lines')
    # the other side, folded: a sentence and a mark, without « Départ LFRS » (already in its head)
    sm = c.js(f"(() => {{ const e = document.querySelector('{D} [data-procsum]'); return {{ shown: window.__t.shown(e), mark: e.querySelector('[data-mark]')?.dataset.mark, "
              f"text: e.textContent }} }})()")
    c.ok(sm['shown'] and sm['mark'] in ('ok', 'todo', 'old'), sm, 'folded: a sentence and its mark')
    c.ok('LFRS' not in sm['text'] and norm(tx(PT, 'dep', c.lang)) not in norm(sm['text']), sm, 'the sentence does not repeat « Départ LFRS »')
    # on a phone, « Choisir sur la carte » is under the aerodrome's name
    name, btn = c.box(f'{A} .fu-procad'), c.box(f'{A} [data-do="onmap"]')
    if c.width < 480:
        c.ok(btn['y'] >= name['y'] + name['h'] - 2, [name, btn], 'on a phone, « Choisir sur la carte » under the name')
    # the complete arrival (the mock-up's first state), every list closed
    pick_proc(c, 'p-arr-star', _STAR)
    pick_proc(c, 'p-arr-app', 'LFML.APP.I13R.RW13R.NONE')
    c.tap(f'{A} [data-prow="app"] [data-do="procchange"]')
    c.until(f"[...document.querySelectorAll('{A} select')].every(e => !window.__t.shown(e))", what='every list closed')
    c.until(f"(document.querySelector('{A} [data-r=v-app]')?.textContent || '').includes('13R')", what='the approach line says its approach')
    c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F209_complet_{c.design}_{c.width}_{c.lang}.png')
    # the runway against the wind: the line turns to a warning, with the gesture to take the runway into the wind
    pick_proc(c, 'p-arr-rwy', '31L')
    c.until(f"!!document.querySelector('{A} [data-prow=rwy].fu-pwarn [data-do=rwyprob]')", what='the warning line with « Prendre la 13R »')
    c.ok('13R' in (c.text(f'{A} [data-prow=rwy] [data-do=rwyprob]') or ''), c.text(f'{A} [data-prow=rwy] [data-do=rwyprob]'), 'the gesture names the runway into the wind')
    c.tap(f'{A} [data-prow="rwy"] [data-do="procchange"]')
    c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F209_arriere_{c.design}_{c.width}_{c.lang}.png')
    # the ergonomist's touches (15 h 27): every « Changer » on one right edge, the warning's too; on a phone the lines start at the card's
    # edge (as the head), the folded sentence too
    rights = c.js(f"[...document.querySelectorAll('{A} [data-do=procchange]')].map(b => Math.round(b.getBoundingClientRect().right))")
    c.ok(max(rights) - min(rights) <= 1, rights, 'every « Changer » on one right edge, the warning line\'s too')
    if c.width < 480:
        edge = c.box(f'{A} .fu-proctitle')['l']
        c.ok(abs(c.box(f'{A} .fu-prows')['l'] - edge) <= 1, [c.box(f'{A} .fu-prows')['l'], edge], 'on a phone the lines start at the card\'s edge')
        c.ok(abs(c.box(f'{D} [data-procsum]')['l'] - edge) <= 1, [c.box(f'{D} [data-procsum]')['l'], edge], 'and the folded sentence')



@case('F210', 'Route step: a point of the route list hovered (or reached by the keyboard) is said to the Map — route-point-hover { id } — and '
      'nothing once the pointer leaves the list', 'F', tags=('fuel', 'maps'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0321 (user: « au survol d\'un point sur la route, surlignement du point ou du tronçon sur la carte »; the Map listens since '
      '6db4e07cc, D223) — the list emitted nothing')
def f210(c):
    c.page.set_viewport_size({'width': 1280, 'height': 800})   # a pointer that hovers: the desktop
    open_proc(c)
    c.js("() => { window.__pth = []; window.addEventListener('route-point-hover', e => window.__pth.push(e.detail ? e.detail.id : 'none')); return true }")
    c.until(f"!!document.querySelector('{FUEL} [data-pts] [data-hover-pt]')", timeout=10000, what='the points of the route listed')
    first = c.js(f"document.querySelector('{FUEL} [data-pts] [data-hover-pt]').dataset.hoverPt")
    c.js(f"document.querySelector('{FUEL} [data-pts] [data-hover-pt]').scrollIntoView({{block: 'center'}})")
    over = "(s) => { document.querySelector(s).dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); return true }"
    c.js(over, f'{FUEL} [data-pts] [data-hover-pt="{first}"] .fu-ptid')
    c.js(over, f'{FUEL} [data-pts] [data-hover-pt="{first}"] b')   # within the same row: nothing new
    c.until("(w) => (window.__pth || []).includes(w)", first, timeout=4000, what=f'route-point-hover {{ id: {first} }}')
    c.js(over, f'{FUEL} [data-proc="arr"] .fu-proctitle')
    c.until("(window.__pth || []).at(-1) === null", timeout=4000, what='route-point-hover { id: null } once out of the list')
    c.eq(len([x for x in c.js('window.__pth') if x == first]), 1, 'one event per change, not one per pixel', what='events')



@case('F211', 'Procedures, the runway list (second slice of the mock-up): the best oriented first and said, then by head wind; a tail wind '
      'said in words; a runway that no published SID serves last, « aucun départ publié »', 'F', tags=('fuel', 'weather'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0308 (mock-up validated, Q-0047: « Pistes : la mieux orientée en tête, chaque piste avec son vent en mots, le vent arrière '
      'marqué ; une piste sans aucun départ publié en dernier, « aucun départ publié » ») and SOG-0301 — the list kept the order of the '
      'procedures, the wind in arrows')
def f211(c):
    route_metar(c, {'LFRS': (240, 8), 'LFML': (310, 12)})
    c.page.add_init_script(_NO_SID_21_STUB)
    open_proc(c)
    wait_rows(c, 'arr')
    opts = lambda k: [o for o in c.js(f"[...document.querySelectorAll('{FUEL} select[data-k={k}] option')].map(o => o.textContent.trim())") if o != '—']
    c.until(f"[...document.querySelectorAll('{FUEL} select[data-k=p-arr-rwy] option')].some(o => o.textContent.includes('kt'))", timeout=20000, what='the METAR read')
    arr = opts('p-arr-rwy')
    best, tail = norm(tx(PT, 'procRwyBest', c.lang)), norm(tx(PT, 'procRwyTailMark', c.lang))
    c.ok(arr[0].startswith('31L') and best in norm(arr[0]), arr, 'the best oriented first, said')
    c.ok(all(tail in norm(o) for o in arr if o.startswith('13')) and min(i for i, o in enumerate(arr) if o.startswith('13')) > max(i for i, o in enumerate(arr) if o.startswith('31')), arr,
         'the runways of 13 after those of 31, « vent arrière »')
    wait_rows(c, 'dep')
    dep = opts('p-dep-rwy')
    c.ok(dep and dep[-1].startswith('21') and norm(tx(PT, 'procRwyNoSid', c.lang)) in norm(dep[-1]), dep,
         'runway 21, which no SID serves any more, last, « aucun départ publié » — although the wind favours it')



@case('F212', 'Procedures, the approach line (slice 3a of the mock-up): the approach in words — a CIFP name « I13R » reads « ILS 13R », in '
      'the list too —, its source the navaid\'s ident and frequency « TST 110,30 », the whole aid line in its title', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0308 (mock-up validated, Q-0047: « Ligne APPROCHE : « ILS 31L » avec l\'indicatif et la fréquence du moyen (« ML 110,30 ») ; '
      'lien « Carte » »), SOG-0298 (navaidsOf) — the line said « I13R » and the aid as a separate sentence')
def f212(c):
    open_proc(c, procs=_ILS_PROCS, aero_extra=_ils_extra())
    wait_rows(c, 'arr')
    A = f'{FUEL} [data-proc="arr"]'
    c.until(f"(document.querySelector('{A} [data-r=v-app]')?.textContent || '').trim() === 'ILS 13R'", timeout=10000, what='the approach line says « ILS 13R »')
    c.until(f"(document.querySelector('{A} [data-appaid]')?.textContent || '').trim() === 'TST 110,30'", timeout=10000, what='its source « TST 110,30 »')
    t = c.js(f"document.querySelector('{A} [data-appaid]').title")
    c.ok('110.30' in t and '134' in t and 'DME' in t, t, 'the whole aid line (axis, DME) in its title')
    c.ok(norm(c.text(f'{A} [data-procsum]') or '') == '' or 'ILS 13R' in norm(c.text(f'{A} [data-procsum]') or ''), c.text(f'{A} [data-procsum]'), 'the folded sentence in words too')
    show_list(c, 'p-arr-app')
    labs = [lab for v, lab in sel_opts(c, 'p-arr-app') if v not in ('', '__none')]
    c.ok(any(l.startswith('ILS 13R') for l in labs), labs, 'the list says « ILS 13R »')



# SOG-0330: the LFRS SID's record carries its data page (source.url); chartUrl answers a DRAWN chart for it, and for the arrival's STAR
# the data page itself (a numbered DATA page taken for the chart: the fault of LFLC ILS 26)
_DATA_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      const data = id => 'https://data.invalid/' + id + '_DATA_01.pdf';
      try { const ps = db.procedures;
        db.procedures = async (icao, q) => (await ps.call(db, icao, q) || []).map(r => r && (r.kind === 'SID' || r.kind === 'STAR')
          ? { ...r, source: { ...(r.source || {}), url: data(r.id) } } : r);
        db.chartUrl = async p => p.kind === 'SID' ? 'https://charts.invalid/' + p.id + '_IAC.pdf' : p.kind === 'STAR' ? data(p.id) : null } catch (e) {}
      return db } } } }) })()"""


@case('F214', 'Procedures: « Carte » opens the DRAWN chart, « Données » the data page of the procedure — two links on its line; a « chart » '
      'that is only the data page is not said « Carte »', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0330 (user: « ILS 26 sur LFLC ne donne pas la carte de l\'ILS, mais le tableau des data »; AeroDB 5e1cc406a: the chart index; '
      'Fuel: « Carte » = chartUrl when it differs from source.url, « Données » = source.url) — one link, which could be the data page')
def f214(c):
    c.page.add_init_script(_DATA_STUB)
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    D = f'{FUEL} [data-proc="dep"] [data-prow="main"]'
    c.until(f"!!document.querySelector('{D} [data-procdata=SID]')", timeout=10000, what='« Données » on the SID line')
    links = c.js(f"[...document.querySelectorAll('{D} [data-chart-slot] a')].map(a => [a.textContent.trim(), a.getAttribute('href')])")
    c.ok(any(t == norm(tx(PT, 'procChartOne', c.lang)) and h.endswith('_IAC.pdf') for t, h in links), links, '« Carte »: the drawn chart')
    c.ok(any(t == norm(tx(PT, 'procDataOne', c.lang)) and h.endswith('_DATA_01.pdf') for t, h in links), links, '« Données »: the data page')
    wait_rows(c, 'arr')
    A = f'{FUEL} [data-proc="arr"] [data-prow="main"]'
    c.until(f"!!document.querySelector('{A} [data-procdata=STAR]')", timeout=10000, what='« Données » on the STAR line')
    c.settle()
    c.eq(c.count(f'{A} [data-chart=STAR]'), 0, 'a chart that is only the data page is not « Carte »', what='STAR « Carte »')



@case('F215', 'Route step, the proposals in progress survive (SOG-0224, schema 2 of route_alts.json): compute, open the detail of the second, '
      'leave Fuel and come back, reload — the list and the open detail are there WITHOUT the launcher, with « Calculé à … »; « Fermer les '
      'propositions » ends them; another aircraft ends them; another AIRAC « périmé » with « Recalculer », never erased', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0224 refused on 13 Nov (« je voulais pouvoir choisir et conserver le détail […] on regarde quelles sont les contraintes de faire '
      'survive au changement de page, et on code »); the ergonomist\'s specification (16 h 31) and answers (16 h 53: schema 2, '
      'aircraft in the key; 17 h 14: stale at a new AIRAC, a changed base, or the next day for a NAT route) — the detail lived in memory '
      'only')
def f215(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", what='three routes')
    c.tap(f'{FUEL} [data-altlist] [data-alt="1"] [data-altname]')
    c.until(f"!!document.querySelector('{FUEL} [data-alt=\"1\"][data-shown]')", what='the detail of the second open')
    before = norm(c.text(f'{FUEL} [data-altlist] [data-alt="1"]') or '')
    doc = c.until_doc('cache/fuel/route_alts.json', lambda x: x and x.get('schema') == 2 and x.get('open') == 1, 'schema 2, the second open', timeout=8000)
    c.ok(doc.get('computed_at') and doc.get('answer') and doc.get('aircraft') is not None, sorted(doc), 'computed_at, answer, aircraft in the object')
    # the launcher gone: nothing can be computed again
    st['down'] = True
    for how in ('away', 'reload'):
        if how == 'away':
            c.go('maps')
            c.go('fuel')
        else:
            c.page.reload()
        to_step(c, 1)
        c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 3", timeout=12000, what=f'{how}: the three routes back')
        c.until(f"!!document.querySelector('{FUEL} [data-alt=\"1\"][data-shown]')", what=f'{how}: the second still open')
        c.eq(norm(c.text(f'{FUEL} [data-altlist] [data-alt="1"]') or ''), before, f'{how}: its detail as computed (distance, level, share)', what='detail')
        c.ok(norm(tx(F, 'rAge', c.lang).split('{')[0]) in norm(c.text(f'{FUEL} [data-rage]') or ''), c.text(f'{FUEL} [data-rage]'), f'{how}: « Calculé à … »')
    # computed under another AIRAC cycle (the user's rule, 17 h 14): « périmé », « Recalculer », not erased
    old = dict(doc, computed_at='2026-01-01T08:00:00.000Z')
    c.open('fuel', docs=proc_docs() + proc_flight(None) + [['cache/fuel/route_alts.json', old, 'cache']], airfields=True)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-rage][data-stale]')", timeout=12000, what='« Périmé » said')
    c.eq(c.count(f'{FUEL} [data-altlist] [data-alt]'), 3, 'a stale list is not erased', what='routes')
    c.eq(c.count(f'{FUEL} [data-rage] [data-do="rcompute"]'), 1, 'with « Recalculer »', what='recompute')
    # « Fermer les propositions » ends them: the list and the document emptied
    c.tap(f'{FUEL} [data-do="rclose"]')
    c.until_doc('cache/fuel/route_alts.json', lambda x: x is not None and not (x.get('alternatives') or []), 'the object emptied', timeout=8000)
    c.eq(c.count(f'{FUEL} [data-altlist] [data-alt]'), 0, 'the list gone', what='routes')
    # another aircraft: an object of the old one is not shown, and emptied
    other = dict(doc, aircraft='F-ZZZZ')
    c.open('fuel', docs=proc_docs() + proc_flight(None) + [['cache/fuel/route_alts.json', other, 'cache']], airfields=True)
    to_step(c, 1)
    c.until_doc('cache/fuel/route_alts.json', lambda x: x is not None and not (x.get('alternatives') or []), 'the object of another aircraft emptied', timeout=8000)
    c.eq(c.count(f'{FUEL} [data-altlist] [data-alt]'), 0, 'nothing shown for another aircraft', what='routes')



@case('F216', 'Route text: a NAT point written as in the NMS message — « 51/20 », « 5030/30 » — is a coordinate (north, west), its name kept as '
      'written; out of the North Atlantic bounds the slash keeps its old sense', 'F', tags=('fuel', 'maps'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0332 (user\'s capture 16 h 51: a NAT route taken wrote « 51 5030 49 H4842 4630 » → « Points inconnus »; the ergonomist\'s bounds: '
      'latitude 20 to 75, longitude 5 to 80) — tokenize cut every word at « / »')
def f216(c):
    open_proc(c)
    got = c.js("""async () => { const RT = await import('/frame/lib/route_text.js');
        return RT.tokenize('LFPO 51/20 5030/30 4630/50 1910/20 LFBO/32L NTS/F280').map(t => [t.kind, t.id, t.lat ?? null, t.lon ?? null]) }""")
    c.eq(got[1], ['coord', '51/20', 51, -20], '« 51/20 »: 51° N 020° W, its name as written', what='51/20')
    c.eq(got[2], ['coord', '5030/30', 50.5, -30], '« 5030/30 »: 50° 30\' N 030° W', what='5030/30')
    c.eq(got[3], ['coord', '4630/50', 46.5, -50], '« 4630/50 »', what='4630/50')
    c.ok(got[4][0] != 'coord', got[4], '« 1910/20 »: latitude out of the North Atlantic bounds, not a coordinate')
    c.eq(got[5][:2], ['name', 'LFBO'], 'a runway after the slash keeps its sense', what='LFBO/32L')
    c.eq(got[6][:2], ['name', 'NTS'], 'a level after the slash keeps its sense', what='NTS/F280')
    # in the route field: no « point inconnu » for the NAT points
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'LFRS 51/20 5030/30 LFML')
    c.page.keyboard.press('Tab')
    c.settle()
    c.eq(c.js(f"[...document.querySelectorAll('{FUEL} [data-unres-pt]')].map(e => e.dataset.unresPt)"), [], 'no unknown point', what='unknown points')
    # SOG-0408: read AFTER the resolution — the text written again from the resolved points (its « DCT » set between the two points); read
    # before it, the case passed alone and failed under load
    c.until(f"(document.querySelector('{FUEL} [data-k=rtext]')?.value || '').includes(' DCT ')", timeout=12000, what='the text normalised')
    v = c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value") or ''
    c.ok('51/20' in v and '5030/30' in v and '5100N' not in v, v, 'once resolved, the text keeps « 51/20 » and « 5030/30 »')
    # the red run of 72a59c9d0's parent read « … 5030N03000W LFML LFML »: the arrival written twice — a guard
    c.eq(v.split().count('LFML'), 1, 'the arrival once in the resolved text', what='arrival once')


_BPS_JS = r"""() => { const out = new Set(); const walk = rules => { for (const r of rules) { if (r.conditionText && /min-width/.test(r.conditionText) && r.constructor.name.includes('Container')) { const m = /min-width:\s*(\d+)px/.exec(r.conditionText); if (m) out.add(+m[1]); } if (r.cssRules) walk(r.cssRules); } };
  for (const s of document.styleSheets) { try { walk(s.cssRules) } catch (e) {} } return [...out].sort((a, b) => a - b) }"""


def _no_breakpoint_lost(c, mod, upto=1300):
    """La règle d'A191 (SOG-0331) sur un module : une fois le module large de N px (N, un seuil @container des styles chargés), il le
    reste quand la fenêtre grandit — la barre de gauche qui passe de 56 à 210 px à 1 100 px ne doit pas lui reprendre un seuil."""
    bps = c.js(f"({_BPS_JS})()")
    c.ok(bps, bps, 'the container breakpoints of the loaded styles are read')
    got = []
    for w in range(780, upto, 5):
        c.page.set_viewport_size({'width': w, 'height': 800})
        c.page.wait_for_timeout(60)
        got.append([w, c.js(f"(document.querySelector('[data-module={mod}]') || {{}}).clientWidth || 0")])
    bad = []
    for b in bps:
        if b > 1400:
            continue
        seen = False
        for w, cw in got:
            if cw >= b:
                seen = True
            elif seen:
                bad.append((b, w, cw))
                break
    c.eq(bad, [], 'once the module is N px wide it stays at least N px wide while the window grows', what=f'{mod}: {got[60:68]}')
    c.page.set_viewport_size({'width': 1280, 'height': 800})


@case('F217', "Growing the window never takes Fuel's container breakpoint away: all the steps side by side from 850 px of module, kept when the "
      "left bar becomes the whole bar at 1 100 px of window (SOG-0331)", 'F', tags=('fuel', 'layout'), designs=('standard',), screens=False,
      langs4=False,
      rule="SOG-0331 (the ergonomist, 18 h 47: Fuel had `@container (min-width: 900px)`; at 1 100 px of window the module falls from 1 010 to "
      "858 px and lost its wide layout as the window grew, as Missions did): the threshold is 850 px, the frame's `.f-cols` one")
def f217(c):
    c.page.set_viewport_size({'width': 1000, 'height': 800})
    open_proc(c)
    # jusqu'à 1 195 px : dès 1 200 px de fenêtre, Carburant passe en vue double (la Carte à côté) — une autre mise en page, dite à l'ergonome
    _no_breakpoint_lost(c, 'fuel', upto=1200)



@case('F213', 'Procedures, an approach known by its chart only is CHOSEN (slice 3b): written as route.procedures.arr.appChart { name, runway }, '
      'never an identifier in app; the line says « VOR 31R — par sa carte : ni tracé ni distance » with its chart; a coded approach removes it '
      'and the other way round; it survives a write of the route by the Map; a chart no longer in the base is said, nothing erased', 'F',
      tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0298 (user: « on doit pouvoir les choisir, même si on n\'a pas le tracé »), SOG-0308 slice 3b — the ergonomist\'s five conditions '
      '(13 Nov, 16 h 04): the name from the base\'s charts, the frequency read at display, coded and chart exclusive, survives another '
      'module\'s write, a chart gone is said')
def f213(c):
    docs, fin = _chartonly_docs()
    c.open('fuel', docs=docs + proc_flight(V2_PROCS), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    A = f'{FUEL} [data-proc="arr"]'
    show_list(c, 'p-arr-app')
    opts = c.js(f"[...document.querySelectorAll('{A} select[data-k=p-arr-app] option[data-chartopt]')].map(o => [o.value, o.textContent.trim(), o.disabled])")
    vor = [o for o in opts if 'VOR' in o[1]]
    c.ok(vor and not vor[0][2] and vor[0][0].startswith('__chart:'), opts, 'the chart-only approaches can be chosen')
    c.page.select_option(f'{A} select[data-k="p-arr-app"]', vor[0][0])
    d = cf_doc(c, lambda d: bool(((procs_of(d, 'arr') or {}).get('appChart') or {}).get('name')), 'appChart written', timeout=8000)
    arr = procs_of(d, 'arr')
    c.ok('VOR' in arr['appChart']['name'] and arr['appChart']['runway'] == '31R' and 'app' not in arr, arr,
         '{ name, runway } from the base\'s chart, no identifier in app')
    c.ok(set(arr['appChart']) == {'name', 'runway'}, arr['appChart'], 'no frequency kept in the flight')
    v = norm(c.text(f'{A} [data-r="v-app"]') or '')
    c.ok('VOR 31R' in v and norm(tx(PT, 'procByChart', c.lang)) in v, v, '« VOR 31R — par sa carte : ni tracé ni distance »')
    c.until(f"!!document.querySelector('{A} [data-prow=app] [data-chart=APPCHART]')", what='its chart on its line')
    # another module writes the route (the Map's setRoute: route.text changed): appChart survives
    # the Map's write (modules/maps/edit.js saveRoute: changesOf from its read, applyChanges in setRoute) of a new route text, on the
    # flight as written
    kept = c.js("""async (f) => { const CF = await import('/frame/lib/current_flight.js');
        const ch = CF.changesOf(CF.routeBase(f), { route: { ...f.route, text: 'LFRS NEPIX LFML' }, level: f.level ?? null });
        return CF.applyChanges(f, ch).route.procedures.arr.appChart || null }""", d)
    c.eq(kept, arr['appChart'], 'a write of the route by the Map keeps appChart as it was', what="appChart after the Map's write")
    # a coded approach removes it
    pick_proc(c, 'p-arr-app', fin)
    d = cf_doc(c, lambda d: (procs_of(d, 'arr') or {}).get('app') == fin, 'the coded approach written', timeout=8000)
    c.ok('appChart' not in procs_of(d, 'arr'), procs_of(d, 'arr'), 'the coded approach removes appChart')
    # a flight read again whose chart is no longer in the base: said, nothing erased
    gone = {'dep': {}, 'arr': {'rwy': '31R', 'appChart': {'name': 'VOR RWY 31R OLD', 'runway': '31R'}}, 'by': 'fuel', 'at': '2026-11-13T10:00:00Z'}
    c.open('fuel', docs=docs + proc_flight(gone), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until(f"(document.querySelector('{A} [data-r=v-app]')?.textContent || '').includes('OLD')", timeout=10000, what='the gone chart said on the line')
    c.ok(norm(tx(PT, 'procChartGone', c.lang)) in norm(c.text(f'{A} [data-r="v-app"]')), c.text(f'{A} [data-r="v-app"]'), '« sa carte n\'est plus dans la base »')
    c.settle()
    c.ok(((procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr') or {}).get('appChart') or {}).get('name') == 'VOR RWY 31R OLD',
         procs_of(c.doc('pilot/ABC/current_flight.json'), 'arr'), 'nothing erased')



@case('F218', 'Route step, two requests: the head route at once without alternatives with « Variantes en recherche… », then the same request '
      'with alternatives whose variants are ADDED under it (never replaced); a failure keeps the first and says so; « du cache, calculé à … » '
      'for each; an input changed during the second cancels it and asks the first again', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0296, the cause (the user: « il faut traiter la root cause »; measured by AeroDB, LFOE → KDEN: 3.0 s without alternatives, '
      '25.3 s with, the same head route; `alternatives_budget` da64b03c9); the ergonomist\'s way (13 Nov, 21 h 36): (a) the first without '
      'alternatives, shown at once; (b) the second, same fields plus alternatives, ADDS; (c) a changed input cancels it and asks (a) again; '
      '(d) « du cache, calculé à … » for each; route_alts.json follows the two times')
def f218(c):
    F = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    st['delay_alt'] = 3.0
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    comps = lambda: [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'compute']
    rows = f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length"
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"{rows} === 1 && !!document.querySelector('{FUEL} [data-rmore=busy]')", timeout=8000, what='(a) the head route at once, « Variantes en recherche… »')
    c.ok('alternatives' not in comps()[0], comps()[0], '(a) the first request without alternatives')
    c.ok(norm(tx(F, 'rMoreBusy', c.lang)) in norm(c.text(f'{FUEL} [data-rmore]')), c.text(f'{FUEL} [data-rmore]'), 'said in words')
    c.until(f"{rows} === 3 && !document.querySelector('{FUEL} [data-rmore=busy]')", timeout=12000, what='(b) the variants added')
    c.eq(comps()[1], dict(comps()[0], alternatives=True), '(b) the second request: the same fields plus alternatives', what='second request')
    names = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-altname]')].map(e => e.textContent.trim())")
    c.eq(names, ['Via UN10', 'Direct · FL250', 'Direct · FL190'], 'the first kept at the head, the variants added under it', what='names')
    c.until_doc('cache/fuel/route_alts.json', lambda d: bool(d) and len(d.get('alternatives') or []) == 3 and len((d.get('answer') or {}).get('alternatives') or []) == 3,
                'route_alts.json follows the second time (schema 2: alternatives and answer)')
    # a failure of the second keeps the first and says so
    st['delay_alt'], st['fail_alt'] = 0, True
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rmore=fail]')", timeout=10000, what='the failure of the second said')
    c.eq(c.js(rows), 1, 'the head route kept', what='kept')
    c.ok(norm(tx(F, 'rMoreFail', c.lang)) in norm(c.text(f'{FUEL} [data-rmore]')), c.text(f'{FUEL} [data-rmore]'), 'said in words')
    # (d) « du cache, calculé à … » for each request
    st['fail_alt'] = False
    st['cache'] = {'hit': True, 'computedAt': '2026-11-13T13:32:00Z', 'until': None}
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rage][data-cache]') && !!document.querySelector('{FUEL} [data-rmore=cache]')", timeout=10000,
            what='(d) « du cache » for the first and for the second')
    head = norm(c.text(f'{FUEL} [data-rage]') or '')
    c.ok(norm(tx(F, 'rCache', c.lang).split('{t}')[0]) in head, head, '« Du cache, calculé à … »')
    st.pop('cache')
    # (c) a changed input during the second cancels it and asks the first again
    st['delay_alt'] = 8.0
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rmore=busy]')", timeout=8000, what='the second under way')
    n = len(comps())
    to_step(c, 0)
    c.page.fill(f'{FUEL} input[data-k="fl"]', '250')
    c.page.keyboard.press('Tab')
    for _ in range(80):
        if st.get('cancels') and any(a.get('fl') == 250 and 'alternatives' not in a for a in comps()[n:]):
            break
        c.wait(100)
    c.ok(st.get('cancels'), st.get('cancels'), '(c) the second request cancelled (regen/job/cancel)')
    c.ok(any(a.get('fl') == 250 and 'alternatives' not in a for a in comps()[n:]), comps()[n:], '(c) the first asked again with the new level')



@case('F219', 'Procedures, arrival: a « Terrain » line — the elevation from the base, the QNH of the ATIS first then the METAR\'s when they '
      'differ, « QNH inconnu » without either — and the ATIS line carries everything: letter, network, runway, QNH, wind, time', 'F',
      tags=('fuel', 'weather'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0325 (the user, 13 Nov 15 h 49: « dans les données de vol, il faut le qnh d\'arrivée, l\'information ATIS (lettre, piste, qnh, vents) '
      'si contrôlée, et l\'altitude du terrain »), the ergonomist\'s line « Altitude 69 ft · QNH 1016 (METAR de 14 h 25 Z) » and « ATIS K · IVAO · '
      'piste 13R · QNH 1016 · 130° / 12 kt »; SOG-0308 slice 4; nothing invented; invented feeds')
def f219(c):
    T = 'modules/fuel/procedures_texts.js'
    A = f'{FUEL} [data-proc="arr"]'
    # no METAR for the arrival, no ATIS: « QNH inconnu », nothing invented
    route_metar(c, {'LFRS': (30, 5)})
    _atis_open(c, {'offline': True})
    c.until(f"!!document.querySelector('{A} [data-terrain]') && /100/.test(document.querySelector('{A} [data-terrain]').textContent)", timeout=20000, what='the Terrain line')
    c.settle()
    t = norm(c.text(f'{A} [data-terrain]'))
    c.ok(norm(tx(T, 'procQnhUnknown', c.lang)) in t and 'METAR' not in t, t, '« QNH inconnu »')
    c.context.unroute(re.compile(r'aviationweather\.gov(/|%2F)api(/|%2F)data(/|%2F)metar', re.I))
    c.context.unroute(re.compile(r'metar\.vatsim\.net', re.I))
    route_metar(c, {'LFRS': (30, 5), 'LFML': (310, 12)})   # QNH 1015 in the invented METAR
    _atis_feeds(c, ['MARSEILLE INFORMATION F', 'RWY IN USE 13R', 'WIND 130/12KT', 'QNH 1016'])
    _atis_open(c, {'vatsim': True})
    c.until(f"/1016/.test(document.querySelector('{A} [data-terrain]')?.textContent || '') && /1015/.test(document.querySelector('{A} [data-terrain]')?.textContent || '')",
            timeout=20000, what='the Terrain line with the ATIS QNH and the METAR QNH')
    t = norm(c.text(f'{A} [data-terrain]'))
    elev = norm(tx(T, 'procElev', c.lang).replace('{e}', '100'))
    c.ok(t.startswith(elev), t, '« Altitude 100 ft » first (the base)')
    c.ok(t.index('QNH 1016') < t.index('QNH 1015') and 'VATSIM F' in t and 'METAR' in t, t, 'both QNH, the ATIS first, then the METAR with its time')
    atis = norm(c.text(f'{A} [data-rwyprob] [data-atisline=vatsim]') or '')
    c.ok(atis.startswith('ATIS F · VATSIM · ') and 'QNH 1016' in atis and '130° / 12 kt' in atis and 'Z' in atis, atis, '« ATIS F · VATSIM · piste 13R · QNH 1016 · 130° / 12 kt · …Z »')
    c.js(f"document.querySelector('{A} [data-terrain]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F219_{c.design}_{c.width}_{c.lang}_delivered.png')



@case('F220', 'The arrival data kept in the flight (arr_info): written on a gesture only (« Lire la météo des terrains »), never on opening '
      'nor on a METAR read by itself; the elevation, each QNH with its source and time (the ATIS first), the ATIS without its text; nothing '
      'written when nothing changed; read back bounded by CF.arrInfoOf', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0325, the ergonomist\'s contract of 13 Nov, 23 h 00: arr_info { icao, elev_ft, elev_src, qnh [{ hpa, src, net?, letter?, at }], '
      'atis { net, letter, rwy, qnh, wind, at } | null, updated_at }, written on a gesture only (SOG-0209: one commit per write), never the '
      'ATIS text, bounded on read (hPa 850 to 1090, wind 0 to 360 and 0 to 150 kt, letter A to Z, runway by its pattern)')
def f220(c):
    route_metar(c, {'LFML': (310, 12)})   # QNH 1015
    _atis_feeds(c, ['MARSEILLE INFORMATION F', 'RWY IN USE 13R', 'WIND 130/12KT', 'QNH 1016'])
    _atis_open(c, {'vatsim': True})
    A = f'{FUEL} [data-proc="arr"]'
    c.until(f"/1016/.test(document.querySelector('{A} [data-terrain]')?.textContent || '') && /1015/.test(document.querySelector('{A} [data-terrain]')?.textContent || '')",
            timeout=20000, what='the screen shows the ATIS and the METAR')
    c.settle()
    c.eq((c.doc('pilot/ABC/current_flight.json') or {}).get('arr_info'), None, 'nothing written on opening, nor on the METAR read by itself', what='no gesture')
    c.js(f"document.querySelector('{FUEL} [data-do=wx]').click()")
    d = cf_doc(c, lambda d: bool((d.get('arr_info') or {}).get('qnh')), 'arr_info written by the gesture', timeout=15000)
    a = d['arr_info']
    c.eq([a['icao'], a['elev_ft'], a['elev_src']], ['LFML', 100, 'base'], 'the elevation from the base', what='elevation')
    c.eq([[q['hpa'], q['src'], q.get('net'), q.get('letter')] for q in a['qnh']], [[1016, 'atis', 'vatsim', 'F'], [1015, 'metar', None, None]],
         'each QNH with its source, the ATIS first', what='qnh')
    c.ok(all(q.get('at') for q in a['qnh']), a['qnh'], 'each QNH with its time')
    c.eq({k: a['atis'][k] for k in ('net', 'letter', 'rwy', 'qnh', 'wind')}, {'net': 'vatsim', 'letter': 'F', 'rwy': '13R', 'qnh': 1016, 'wind': {'dir': 130, 'kt': 12}},
         'the ATIS: letter, runway, QNH, wind', what='atis')
    c.ok('MARSEILLE' not in json.dumps(a) and 'Invented' not in json.dumps(a), a, 'never the ATIS text, never a name')
    # the same gesture again, nothing changed: nothing written
    at = a['updated_at']
    c.js(f"document.querySelector('{FUEL} [data-do=wx]').click()")
    c.wait(2500)
    c.settle()
    c.eq(c.doc('pilot/ABC/current_flight.json')['arr_info']['updated_at'], at, 'the same values: nothing written again', what='no write')
    # read back bounded (a flight written by any device is an untrusted input)
    got = c.js("""async () => { const CF = await import('/frame/lib/current_flight.js');
        return CF.arrInfoOf({ arr_info: { icao: 'lfml', elev_ft: '1e9', text: 'SECRET', qnh: [{ hpa: 2000, src: 'metar' }, { hpa: 1016, src: 'atis', net: 'x' },
          { hpa: 1013, src: 'metar', at: 'never', name: 'P' }], atis: { net: 'ivao', letter: 'KK', rwy: '99', qnh: 1016, wind: { dir: 400, kt: 5 }, text: 'X' } } }) }""")
    c.eq(got, {'icao': 'LFML', 'elev_ft': None, 'elev_src': None, 'qnh': [{'hpa': 1013, 'src': 'metar', 'at': None}],
               'atis': {'net': 'ivao', 'letter': '', 'rwy': None, 'qnh': 1016, 'wind': None, 'at': None}, 'updated_at': None},
         'bounded on read: out-of-range values dropped, no text, no unknown key', what='arrInfoOf')



@case('F221', 'Procedures: the runway line is a warning only for a TAILWIND — a headwind runway that is not the best keeps a calm line, the best '
      'offered under it; an RNAV / RNP approach reads in words (« H31LZ » → « RNP AR 31L Z »)', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=False,
      rule='The two touches read by the ergonomist on the user\'s captures of 16 h 52 / 16 h 53 (with SOG-0332): KDEN « 16L — face 3 kt » in '
      'warning with « Prendre la 25 » — the warning is for a tailwind; KTPA « H01LZ » still coded — slice 3a\'s words must cover RNAV / RNP')
def f221(c):
    import copy
    docs = proc_docs()
    for d in docs:
        if d[0].startswith('proc/') and d[0].endswith('/LFML.json') and '/manual/' not in d[0] and '/local/' not in d[0]:
            f = d[1]
            f['runways'] = f['runways'] + [{'id': '04', 'lat': 43.43, 'lon': 5.20, 'elev': 25, 'qfu': 40}]
            star = copy.deepcopy(next(p for p in f['procedures'] if p['kind'] == 'STAR' and p['runways'] == ['13R']))
            star.update(id='LFML.STAR.MEN4A.RW04.NONE', name='MEN4A', runways=['04'])
            app = copy.deepcopy(star)
            app.update(id='LFML.APP.H31LZ.RW31L.NONE', kind='APP', name='H31LZ', runways=['31L'])
            f['procedures'] = f['procedures'] + [star, app]
    route_metar(c, {'LFML': (80, 12)})   # 04: headwind 9 kt (the best); 13R: headwind 8 kt; 31L: tailwind
    A = f'{FUEL} [data-proc="arr"]'
    c.open('fuel', docs=docs + proc_flight({'dep': {'rwy': '03'}, 'arr': {'rwy': '13R'}}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until(f"!!document.querySelector('{A} [data-metarline]')", timeout=20000, what='the best runway offered (« Prendre la 04 »)')
    c.ok(not c.js(f"document.querySelector('{A} [data-prow=rwy]').classList.contains('fu-pwarn')"), c.text(f'{A} [data-prow=rwy]'),
         'a headwind runway that is not the best: a calm line, no warning')
    # an RNAV / RNP approach in words
    show_list(c, 'p-arr-app')
    opts = [norm(o) for o in c.js(f"[...document.querySelectorAll('{A} select[data-k=p-arr-app] option')].map(o => o.textContent)")]
    c.ok(any(o.startswith('RNP AR 31L Z') for o in opts) and not any('H31LZ' in o for o in opts), opts, '« H31LZ » reads « RNP AR 31L Z »')
    # a tailwind runway keeps its warning
    c.open('fuel', docs=docs + proc_flight({'dep': {'rwy': '03'}, 'arr': {'rwy': '31L'}}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until(f"document.querySelector('{A} [data-prow=rwy]')?.classList.contains('fu-pwarn')", timeout=20000, what='a tailwind runway: the warning')



@case('F222', 'Procedures: a side whose METAR was not in the first weather read asks for it — the Piste line « à choisir » then says the '
      'METAR and offers the best runway, without waiting for a first choice', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0210 refused on 13 Nov 16 h 53 (KDEN: « pas de meteo sur la piste… Une fois qu\'on a choisi la piste conseillée, la météo '
      'apparaît »; captures 165228 / 165309: the weather of the mount came from the reserve, without the arrival\'s METAR, and only a '
      'runway choice read it again): one attempt every 15 s at most, 4 per aerodrome and opening')
def f222(c):
    import time as _tt
    seen = {'t0': 0.0}
    # the arrival's METAR exists only 6 s after the first read: the reads of the opening never get it (the reserve of the user's case)
    has = lambda: bool(seen['t0']) and _tt.time() - seen['t0'] > 6

    def aw(route):
        import time as _t
        now = int(_t.time())
        rows = [{'icaoId': 'LFRS', 'obsTime': now, 'wdir': 30, 'wspd': 5, 'visib': '6+', 'clouds': [{'cover': 'CAVOK'}], 'temp': 15, 'dewp': 10,
                 'altim': 1015, 'rawOb': f'LFRS {_t.strftime("%d%H%M", _t.gmtime(now))}Z 03005KT CAVOK 15/10 Q1015', 'fltCat': 'VFR'}]
        seen['t0'] = seen['t0'] or _tt.time()
        if has():
            rows.append({'icaoId': 'LFML', 'obsTime': now, 'wdir': 310, 'wspd': 12, 'visib': '6+', 'clouds': [{'cover': 'CAVOK'}], 'temp': 15, 'dewp': 10,
                         'altim': 1015, 'rawOb': f'LFML {_t.strftime("%d%H%M", _t.gmtime(now))}Z 31012KT CAVOK 15/10 Q1015', 'fltCat': 'VFR'})
        route.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
    c.context.route(re.compile(r'aviationweather\.gov(/|%2F)api(/|%2F)data(/|%2F)metar', re.I), aw)
    def vat(route):
        import time as _t
        stamp = _t.strftime('%d%H%M', _t.gmtime())
        seen['t0'] = seen['t0'] or _tt.time()
        lines = [f'LFRS {stamp}Z 03005KT CAVOK 15/10 Q1015'] + ([f'LFML {stamp}Z 31012KT CAVOK 15/10 Q1015'] if has() else [])
        route.fulfill(status=200, content_type='text/plain', body='\n'.join(lines))
    c.context.route(re.compile(r'metar\.vatsim\.net', re.I), vat)
    A = f'{FUEL} [data-proc="arr"]'
    c.open('fuel', docs=proc_docs() + proc_flight({'dep': {}, 'arr': {}}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until(f"/METAR/.test(document.querySelector('{A} [data-r=src-rwy]')?.textContent || '') && !!document.querySelector('{A} [data-metarline] [data-do=rwyprob]')",
            timeout=30000, what='the arrival\'s METAR read without a gesture: said on the Piste line « à choisir », the best runway offered')
    c.ok(c.js(f"document.querySelector('{A} [data-r=v-rwy]').hasAttribute('data-todo')"), c.text(f'{A} [data-r=v-rwy]'), 'no runway chosen')



@case('F223', 'Little Navmap, before any choice: the side says its procedures come from Little Navmap (the warning line, always on screen) and '
      'the Arrivée line says « Little Navmap, lue sur ce poste » — never a notification alone', 'F', tags=('fuel',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0210 refused on 13 Nov 16 h 53 (« rien ne me dit que les données viennent de lnm. normal ? ah si, une popup discrète qui disparaît. '
      'rien sur la zone de choix »); the ergonomist: the source written ON the line and its list; LFML read as from Little Navmap (stub)')
def f223(c):
    c.page.add_init_script(_LNM_RECORDS_STUB)
    A = f'{FUEL} [data-proc="arr"]'
    c.open('fuel', docs=proc_docs() + proc_flight({'dep': {}, 'arr': {}}), airfields=True)
    to_step(c, 1)
    wait_rows(c, 'arr')
    c.until(f"(() => {{ const e = document.querySelector('{A} [data-lnmline]'); return !!e && !e.hidden }})()", timeout=8000,
            what='the warning line, nothing chosen yet')
    T = 'modules/fuel/procedures_texts.js'
    c.ok(norm(tx(T, 'procLnmLists', c.lang)) in norm(c.text(f'{A} [data-lnmline]')), c.text(f'{A} [data-lnmline]'), 'it says the lists come from Little Navmap')
    c.ok(norm(tx(T, 'procSrcLnm', c.lang)) in norm(c.text(f'{A} [data-r=src-main]') or ''), c.text(f'{A} [data-prow=main]'),
         'the Arrivée line says its source, nothing chosen')
    c.eq(c.count(f'{FUEL} [data-proc="dep"] [data-lnmline]:not([hidden])'), 0, 'not on the departure (the base\'s)', what='departure')



_PROC_HANG_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { for (const f of ['procedures', 'runways', 'coverage', 'coords']) { const o = db[f];
        db[f] = (icao, ...r) => String(icao).toUpperCase() === 'LFML' ? new Promise(() => {}) : o.call(db, icao, ...r) } } catch (e) {}
      return db } } } }) })()"""


@case('F224', 'Procedures on a phone, an aerodrome whose reads never answer: never a bare title — the departure is painted as soon as it is '
      'read, the arrival says « Lecture des procédures de LFML… », then, at the bound, « pas encore lues ; elles se lisent depuis le poste »',
      'F', tags=('fuel',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0345 (the user\'s iPhone photo, 14 Nov 11 h 15: the block reduced to its title; the survey: render() waited for every read of '
      'both sides, some unbounded); the ergonomist\'s agreement at 12 h 21: what the device has first, a waiting line for what is missing, '
      'the GitLab limit\'s sentence under the limit, a bound on the whole side — never a title alone; LFML\'s reads held (stub)')
def f224(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.add_init_script(_PROC_HANG_STUB)
    T = 'modules/fuel/procedures_texts.js'
    D, A = f'{FUEL} [data-proc="dep"]', f'{FUEL} [data-proc="arr"]'
    c.open('fuel', docs=proc_docs() + proc_flight({'dep': {}, 'arr': {}}), airfields=True)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{D}:not([data-procwait]) [data-r=sum]') && !!document.querySelector('{A}[data-procwait]')", timeout=15000,
            what='the departure painted while the arrival waits')
    c.ok(norm(tx(T, 'procWaiting', c.lang).replace('{icao}', 'LFML')) in norm(c.text(f'{A} [data-procwaittext]')), c.text(A), '« Lecture des procédures de LFML… »')
    c.until(f"(document.querySelector('{A} [data-procwaittext]')?.textContent || '').includes('LFML') && "
            f"!/…|\\.\\.\\./.test(document.querySelector('{A} [data-procwaittext]').textContent)", timeout=15000, what='the bound reached')
    c.ok(norm(tx(T, 'procNotYet', c.lang).replace('{icao}', 'LFML')) in norm(c.text(f'{A} [data-procwaittext]')), c.text(A),
         '« LFML : procédures pas encore lues ; elles se lisent depuis le poste »')
    c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F224_{c.design}_390_{c.lang}_delivered.png')



def _nat_flight():
    """The planned flight of lib.FLIGHT, sent across the North Atlantic: EINN → CYYT (positions given, route set by hand)."""
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'EINN CYYT', 'dep': 'EINN', 'arr': 'CYYT', 'manual': True,
                             'points': [{'id': 'EINN', 'lat': 52.70, 'lon': -8.92}, {'id': 'CYYT', 'lat': 47.62, 'lon': -52.75}]}
    return docs


@case('F225', 'Route step, a flight across the North Atlantic: before « Calculer A → B », a line says the state of the NAT tracks; with the '
      'launcher, ONE gesture « Lire les routes NAT du jour » (the launcher\'s base/update of the nat zone); without it, the published copy\'s '
      'date and no gesture; nothing for a flight that does not cross', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0352 (the ergonomist, 14 Nov, with AeroDB\'s line: the NAT message is read by the LAUNCHER from the FAA and published with the '
      'base; a phone without launcher reads only that copy and cannot refresh it): the validity read in the message, never a fixed duration; '
      'the reminder leaves the monthly Data screen (Réglages\' file, untouched)')
def f225(c):
    L = f'{FUEL} [data-natline]'
    T = 'modules/fuel/module.js'
    # without the launcher: the line, no gesture
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.until(f"(() => {{ const e = document.querySelector('{L}'); return !!e && !e.hidden }})()", timeout=15000, what='the NAT line, no launcher')
    c.ok(norm(tx(T, 'natNoCopy', c.lang)) in norm(c.text(L)), c.text(L), 'no copy published: said')
    c.eq(c.count(f'{L} [data-do=natread]'), 0, 'without the launcher, no gesture', what='no gesture')
    # with the launcher: « Lire les routes NAT du jour » starts the launcher's job for the nat zone
    st = _route_launcher(c, ['route/compute'])
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.until(f"!!document.querySelector('{L}:not([hidden]) [data-do=natread]')", timeout=15000, what='with the launcher: the gesture')
    c.ok(norm(tx(T, 'natNone', c.lang)) in norm(c.text(L)), c.text(L), '« Routes NAT pas lues aujourd’hui »')
    c.ok(c.js(f"!!(document.querySelector('{L}').compareDocumentPosition(document.querySelector('{FUEL} [data-do=rcompute]')) & Node.DOCUMENT_POSITION_FOLLOWING)"), '', 'the line before « Calculer A → B »')
    c.js(f"document.querySelector('{L}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F225_{c.design}_390_{c.lang}_delivered.png')
    c.tap(f'{L} [data-do="natread"]')
    for _ in range(80):
        if any(p.get('set') == 'base' and (p.get('args') or {}).get('zones') == ['nat'] for p in st['posts']):
            break
        c.wait(100)
    c.ok(any(p.get('set') == 'base' and (p.get('args') or {}).get('zones') == ['nat'] for p in st['posts']), [p.get('set') for p in st['posts']],
         'the launcher\'s job for the nat zone was asked')
    c.context.unroute(re.compile(r'/__setup/'))
    # a flight that does not cross: nothing
    open_proc(c)
    c.settle()
    c.ok(c.js(f"document.querySelector('{L}')?.hidden !== false"), c.text(L), 'LFRS → LFML: no NAT line')



# SOG-0372: aerodb's natState / natEnsure held by the case — natEnsure answers when the case says (window.__nat.go(answer))
_NAT_STUB = """(() => { window.__nat = { st: { present: true, count: 1, from: '2026-11-14T11:30:00.000Z', validUntil: '2026-11-14T19:00:00.000Z', expired: true, current: 0 }, go: null, asks: 0 };
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { db.natState = async () => window.__nat.st; db.nat = async () => window.__nat.tracks ? { tracks: window.__nat.tracks } : null;
        db.natEnsure = () => { window.__nat.asks++; return new Promise(res => window.__nat.go = r => { window.__nat.go = null; if (r && r.present && r.expired === false) window.__nat.st = r; res(r); }); }; } catch (e) {}
      return db } } } }) })()"""


@case('F227', 'Route step, « Lire les routes NAT du jour »: the line is rewritten WITHOUT reloading — while reading it says only the reading, '
      'a failure is said with its reason, success gives the date and validity; then a proposal through NAT tracks of another day is removed '
      'and the line offers to compute again', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0372 (the user\'s workstation, 16 Nov 8 h 30: « la lecture des nats du jour semble réussir, mais échoue silencieusement » — the '
      'line still said the tracks of 14/11 « périmées » until the page was reloaded; the ergonomist: never the old sentence left, a '
      'proposal through tracks of another day removed as soon as newer ones are read); aerodb\'s NAT state held by the case (stub)')
def f227(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.add_init_script(_NAT_STUB)
    L = f'{FUEL} [data-natline]'
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('EINN', 'MALOT', 'controlled', 'HIGH'), _ctl_seg('MALOT', 'CYYT', 'fallback', 'NAT', 'track NAT du jour, périmée')]
    by_nat = dict(_alt(1, 'Via NAT G', 'EINN MALOT NATG 54/50 CYYT', 1700, 340, segs, sid=False), nat={'tracks': ['G'], 'issued': '14/11', 'stale': True})
    other = _alt(2, 'Direct', 'EINN MALOT CYYT', 1710, 350, [_ctl_seg('EINN', 'MALOT', 'controlled', 'HIGH'), _ctl_seg('MALOT', 'CYYT', 'controlled', 'HIGH')], sid=False)
    st['alts'] = [by_nat, other]
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.until(f"!!document.querySelector('{L}:not([hidden]) [data-do=natread]')", timeout=15000, what='the NAT line with its gesture')
    old = norm(tx(T, 'natStale', c.lang).replace('{d}', '14/11'))
    c.ok(old in norm(c.text(L)), c.text(L), 'before: the tracks of 14/11, stale')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 2", timeout=15000, what='both routes, one through NAT G')
    c.eq(c.count(f'{FUEL} [data-alt] [data-natstale]'), 1, 'one route through the stale tracks of 14/11', what='stale route')
    # (a) while reading: the reading only, never the old sentence beside it
    c.tap(f'{L} [data-do="natread"]')
    c.until("window.__nat.go !== null", timeout=8000, what='natEnsure asked')
    c.until(f"!!document.querySelector('{L} [data-natstate=reading]')", timeout=5000, what='the line says the reading')
    c.ok(old not in norm(c.text(L)), c.text(L), 'while reading, the old sentence is not left')
    c.ok(norm(tx(T, 'natReading', c.lang)) in norm(c.text(L)), c.text(L), '« Lecture des routes NAT… »')
    # a failure: said in the line, with its reason
    c.js("window.__nat.go({ ...window.__nat.st, refreshed: true, ok: false })")
    c.until(f"!!document.querySelector('{L} [data-natfail=fail]')", timeout=5000, what='the failure said')
    c.ok(norm(tx(T, 'natFail', c.lang)) in norm(c.text(L)), c.text(L), '« Les routes NAT n’ont pas pu être lues. »')
    # too soon after a failure: said with the time of the next try
    c.tap(f'{L} [data-do="natread"]')
    c.until("window.__nat.go !== null", timeout=8000, what='natEnsure asked again')
    c.js("window.__nat.go({ ...window.__nat.st, refreshed: false, retryAt: '2026-11-16T08:35:00.000Z' })")
    c.until(f"!!document.querySelector('{L} [data-natfail=retry]')", timeout=5000, what='the next try said')
    c.ok('08:35Z' in c.text(L), c.text(L), 'with its time')
    # success: the date and validity, without reloading; (b) the route through NAT G of 14/11 goes, the line offers to compute again
    c.tap(f'{L} [data-do="natread"]')
    c.until("window.__nat.go !== null", timeout=8000, what='natEnsure asked a third time')
    c.js("window.__nat.go({ present: true, count: 1, from: '2026-11-16T11:30:00.000Z', validUntil: '2026-11-16T19:00:00.000Z', expired: false, current: 1, refreshed: true, ok: true })")
    c.until(f"!!document.querySelector('{L} [data-natstate=ok]')", timeout=5000, what='the new tracks said')
    c.ok(norm(tx(T, 'natValid', c.lang).replace('{d}', '16/11').replace('{t}', '19:00Z')) in norm(c.text(L)), c.text(L), '« Routes NAT du 16/11, valides jusqu’à 19:00Z »')
    c.eq(c.count(f'{L} [data-natfail]') + c.count(f'{L} [data-do=natread]'), 0, 'no failure left, no gesture', what='clean line')
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length === 1", timeout=5000, what='the route through NAT G removed')
    c.eq(c.count(f'{FUEL} [data-alt] [data-natstale]'), 0, 'no route through the tracks of another day left', what='removed')
    c.ok(norm(tx(T, 'natDropped', c.lang).replace('{d}', '16/11')) in norm(c.text(f'{FUEL} [data-natdropped]') or ''), c.text(f'{FUEL} [data-routealts]'), 'said')
    c.eq(c.count(f'{FUEL} [data-natdropped] [data-do=rcompute]'), 1, 'with « Recalculer »', what='recompute')
    c.js(f"document.querySelector('{L}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F227_{c.design}_390_{c.lang}_delivered.png')


_NAT_TAKEN = 'EGLL DCT DIDZA L9 OKSAW N14 OKTAD DCT MALOT NATG 54/50 DCT NICSO ALLEX Q822 ENE PARCH4 KJFK'


@case('F228', 'Route field, a route taken through the North Atlantic: the name of a NAT track (« NAT » and one letter, between two points) '
      'and the name of the STAR chosen in Procédures are kept as written, never said « inconnus »; a word that only looks like a procedure '
      'stays a point', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0372 (c) (the user\'s capture, 16 Nov 8 h 36: « Points inconnus : NATG, NICSO, PARCH4 » after « Prendre cette proposition »); '
      'the ergonomist\'s decision at 9 h 00: (1) NAT + one letter between two points is a NAT track; (2) a word EQUAL to the chosen SID or '
      'STAR is that procedure — by equality with the choice, never by a general pattern for the American form; (3) the engine\'s positions '
      'wait for AeroDB')
def f228(c):
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': _NAT_TAKEN, 'dep': 'EGLL', 'arr': 'KJFK', 'manual': True,
                             'points': [{'id': 'EGLL', 'lat': 51.47, 'lon': -0.46}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}],
                             'procedures': {'arr': {'star': 'KJFK.STAR.PARCH4.RWALL.NONE'}, 'by': 'fuel', 'at': '2026-11-16T08:30:00Z'}}
    # an invented STAR of KJFK (its name only matters; nothing from an AIP or a database)
    from fixtures.procedures import rec as _prec, file as _pfile, pt as _ppt, PROC_CYCLE as _PCY
    star = _prec('KJFK', 'STAR', 'PARCH4', [], [_ppt(1, 'XPA01', 41.2, -72.0), _ppt(2, 'XPA02', 40.9, -73.2)])
    docs.append([f'proc/{_PCY}/KJFK.json', _pfile('KJFK', [star]), 'reference'])
    c.open('fuel', docs=docs)
    to_step(c, 1)
    U = f'{FUEL} [data-unres]'
    # the text as « Prendre cette proposition » writes it (routeTake: input then change on the field)
    c.js(f"(t => {{ t.value = {_NAT_TAKEN!r}; t.dispatchEvent(new Event('input', {{bubbles: true}})); t.dispatchEvent(new Event('change', {{bubbles: true}})); }})(document.querySelector('{FUEL} [data-k=rtext]'))")
    c.until(f"(document.querySelector('{U}')?.textContent || '').includes('NICSO')", timeout=15000, what='the unknown points said (NICSO: no position yet)')
    said = c.text(U)
    c.ok('NATG' not in said, said, '« NATG » (NAT track G, between MALOT and 54/50) is not an unknown point')
    c.ok('PARCH4' not in said, said, '« PARCH4 » (the STAR chosen in Procédures) is not an unknown point')
    # (2) by equality with the choice only: a word of the same American form that is not the chosen STAR stays an unknown point
    c.js(f"(t => {{ t.value = t.value.replace('PARCH4', 'ZZZZZ5'); t.dispatchEvent(new Event('input', {{bubbles: true}})); t.dispatchEvent(new Event('change', {{bubbles: true}})); }})(document.querySelector('{FUEL} [data-k=rtext]'))")
    c.until(f"(document.querySelector('{U}')?.textContent || '').includes('ZZZZZ5')", timeout=10000, what='a word that is not the chosen STAR')
    c.ok('NATG' not in c.text(U), c.text(U), 'NATG still kept')
    # (1) between two points only: « NATG » at the end, before the arrival alone, is not a track
    c.js(f"(t => {{ t.value = 'EGLL MALOT KJFK NATG'; t.dispatchEvent(new Event('input', {{bubbles: true}})); t.dispatchEvent(new Event('change', {{bubbles: true}})); }})(document.querySelector('{FUEL} [data-k=rtext]'))")
    c.until(f"(document.querySelector('{U}')?.textContent || '').includes('NATG')", timeout=10000, what='NATG after the arrival: not between two points')
    c.js(f"document.querySelector('{U}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F228_{c.design}_1280_{c.lang}_delivered.png')


@case('F229', 'Route step, a proposal taken: the points the engine placed for it (its `points`) become known points of the Route field — a '
      'point absent from the zones the browser reads is not « inconnu »; read as an untrusted input (a point out of bounds stays unknown)',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0372 (c) point 3 (the user\'s capture: NICSO « inconnu » after « Prendre cette proposition »; AeroDB afac50be9: each route of the '
      'answer carries points [{id, lat, lon}], in order, 600 at most); the ergonomist at 9 h 30: bounded numbers, identifier by pattern, '
      '600 at most, own properties; kept with the answer on the device, nothing more written to data/; a simulated answer (fake launcher)')
def f229(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('EINN', 'MALOT', 'controlled', 'HIGH'), _ctl_seg('MALOT', 'CYYT', 'controlled', 'HIGH')]
    pts = [{'id': 'EINN', 'lat': 52.70, 'lon': -8.92}, {'id': 'MALOT', 'lat': 53.0, 'lon': -15.0}, {'id': 'XQZNA', 'lat': 50.5, 'lon': -45.25},
           {'id': 'BADPT', 'lat': 999, 'lon': 0}, {'id': 'CYYT', 'lat': 47.62, 'lon': -52.75}]
    st['alts'] = [dict(_alt(1, 'Via XQZNA', 'EINN MALOT XQZNA BADPT CYYT', 1700, 350, segs, sid=False), points=pts)]
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-do=rtake]')", timeout=12000, what='the route, with « Choisir »')
    c.tap(f'{FUEL} [data-altlist] [data-do=rtake]')
    U = f'{FUEL} [data-unres]'
    c.until(f"(document.querySelector('{U}')?.textContent || '').includes('BADPT')", timeout=10000, what='the point out of bounds said')
    said = c.text(U)
    c.ok('XQZNA' not in said and 'MALOT' not in said, said, 'the points the engine placed are known: none of them « inconnu »')
    c.ok(c.js(f"(document.querySelector('{FUEL} [data-k=rtext]')?.value || '').includes('XQZNA')"), '', 'the taken route is in the field')
    c.js(f"document.querySelector('{U}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F229_{c.design}_1280_{c.lang}_delivered.png')


@case('F230', 'Route field, a NAT track written in the route whose letter is not in the day\'s tracks READ: a calm line « Route NAT G : absente '
      'des routes du 16/11 », never « point inconnu »; a track of the day, unfolded: nothing; tracks not read (stale): the crossing drawn '
      'direct, said', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0372, the ergonomist\'s decision at 9 h 37 (the capture\'s proposal went through NAT G of 14/11; the tracks of 16/11 are A to E, '
      'S to Z), and at 15 h 10 (tracks not read: direct, and the line SAYS it); aerodb\'s NAT state and tracks held by the case (stub)')
def f230(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.add_init_script(_NAT_STUB)
    T = 'modules/fuel/module.js'
    W, U = f'{FUEL} [data-natwarn]', f'{FUEL} [data-unres]'
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.js("window.__nat.st = { present: true, count: 2, from: '2026-11-16T11:30:00.000Z', validUntil: '2026-11-16T19:00:00.000Z', expired: false, current: 2 }; "
         "window.__nat.tracks = [{ id: 'A', route: ['55/15', '55/20', '54/50'] }, { id: 'S', route: ['57/15', '57/50'] }]")

    def typed(text):
        c.js(f"(t => {{ t.value = {text!r}; t.dispatchEvent(new Event('input', {{bubbles: true}})); t.dispatchEvent(new Event('change', {{bubbles: true}})); }})(document.querySelector('{FUEL} [data-k=rtext]'))")
    typed('EINN MALOT NATG 54/50 CYYT')
    c.until(f"(e => !!e && !e.hidden)(document.querySelector('{W}'))", timeout=10000, what='the calm line')
    c.eq(norm(c.text(W)), norm(tx(T, 'natTrackGone', c.lang).replace('{l}', 'G').replace('{d}', '16/11')), '« Route NAT G : absente des routes du 16/11 »', what='line')
    c.ok('NATG' not in (c.text(U) or ''), c.text(U), 'never « point inconnu »')
    c.ok(c.js(f"document.querySelector('{W}').classList.contains('f-muted')"), '', 'calm, not a warning colour')
    c.js(f"document.querySelector('{W}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F230_{c.design}_390_{c.lang}_delivered.png')
    # a track of the day, its entry and its exit on it (unfolded): nothing
    typed('EINN 55/15 NATA 54/50 CYYT')
    c.until(f"document.querySelector('{W}')?.hidden === true", timeout=10000, what='a track of the day: no line')
    # the tracks not read (stale): the crossing is a direct, and the line says it (the ergonomist at 15 h 10: never silent)
    c.js("window.__nat.st = { ...window.__nat.st, expired: true }")
    typed('EINN MALOT NATG 54/50 CYYT')
    c.until(f"(document.querySelector('{W}')?.textContent || '').includes('G')", timeout=10000, what='the line of the tracks not read')
    c.eq(norm(c.text(W)), norm(tx(T, 'natUnread', c.lang).replace('{l}', 'G')), '« Route NAT G : routes du jour non lues, traversée tracée en direct »',
         what='not read')


# SOG-0374: aerodb.fetchProcedures(icao, { source: 'ukpkg' }) held by the case (window.__uk.go(answer)); the other sources unchanged
_UK_STUB = """(() => { window.__uk = { go: null, asked: [] };
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const f = db.fetchProcedures; db.fetchProcedures = (icao, o = {}) => o && o.source === 'ukpkg'
        ? (window.__uk.asked.push(String(icao)), new Promise(res => window.__uk.go = r => { window.__uk.go = null; res(r); })) : f.call(db, icao, o); } catch (e) {}
      return db } } } }) })()"""


def _uk_docs():
    """EGLL → KJFK, with an invented EGLL: a published approach (the card has data) and, read by hand earlier from the UK package, two SIDs
    read IN PART (one point: the exit, its level, its position; cycle unknown, written 1970-01-01). Nothing from an AIP."""
    from fixtures.procedures import rec as _prec, file as _pfile, pt as _ppt, PROC_CYCLE as _PCY
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'EGLL KJFK', 'dep': 'EGLL', 'arr': 'KJFK', 'manual': True,
                             'points': [{'id': 'EGLL', 'lat': 51.47, 'lon': -0.46}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}]}
    app = _prec('EGLL', 'APP', 'I27L', ['27L'], [_ppt(1, 'XEG27', 51.47, 0.1, {'type': 'at', 'ft': 2500}), _ppt(2, 'RW27L', 51.46, -0.43)])
    sids = []
    for name, rw, pid, lat, lon in (('XMODA1J', '09L', 'XMODA', 51.6, -0.9), ('XMAXI1F', '27R', 'XMAXI', 51.8, -0.6)):
        r = _prec('EGLL', 'SID', name, [rw], [_ppt(1, pid, lat, lon, {'type': 'min', 'ft': 6000})], status='check', kind_src='manual',
                  src_cycle='1970-01-01')
        r['source'].update(ref='ukpkg', cycle_unknown=True)
        r['partial'] = {'read': ['exit', 'level', 'position'], 'unread': ['path'], 'note': 'SID lue en partie'}
        sids.append(r)
    return docs + [[f'proc/{_PCY}/EGLL.json', _pfile('EGLL', [app]), 'reference'],
                   ['proc/manual/EGLL.json', _pfile('EGLL', sids, cy='1970-01-01'), 'reference'],
                   ['proc/manual/index.json', {'schema': 1, 'aerodromes': {'EGLL': {'SID': 2, 'partial': 2, 'cycle': '1970-01-01', 'updated_at': '2026-11-16T09:00:00Z'}}}, 'reference']]


@case('F231', 'Procedures, departure from an aerodrome of the United Kingdom with the workstation\'s launcher: in « Source et cartes », the '
      'gesture « Lire les départs dans le paquet du Royaume-Uni » (fetchProcedures source ukpkg); its answer said IN the line (read, personal '
      'use, no package, the launcher\'s failure escaped); a SID read in part is chosen like another and says so; an unknown cycle is « cycle '
      'inconnu », never 1970; without the launcher, no gesture', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0374 (the user: « pas de SID sur EGLL ? »; AeroDB 9fd52890c: the SIDs of EGLL read in part from the UK eAIP package the user '
      'unzipped in Downloads; no screen called it); the ergonomist at 10 h 02; aerodb\'s answer held by the case (stub), invented EGLL records')
def f231(c):
    T = 'modules/fuel/procedures_texts.js'
    D = f'{FUEL} [data-proc="dep"]'
    L = f'{D} [data-ukline]'
    # without the launcher: no gesture
    c.page.add_init_script(_UK_STUB)
    c.open('fuel', docs=_uk_docs())
    to_step(c, 1)
    open_foot(c, 'dep')
    c.until(f"!!document.querySelector('{D} [data-r=meta] [data-do=procfetch]')", timeout=15000, what='the reading line of EGLL')
    c.eq(c.count(f'{D} [data-do=procukpkg]'), 0, 'without the launcher: no gesture', what='no launcher')
    # with the launcher
    _route_launcher(c, ['route/compute'])
    c.open('fuel', docs=_uk_docs())
    to_step(c, 1)
    open_foot(c, 'dep')
    c.until(f"!!document.querySelector('{D} [data-do=procukpkg]')", timeout=15000, what='the gesture in « Source et cartes » of the departure')
    # SOG-0374 (lot du 18/11) : cet appareil DÉTIENT déjà deux SID du paquet (le fixture) : le geste est « Relire » (F269 le prouve)
    c.eq(norm(c.text(f'{D} [data-do=procukpkg]')), norm(tx(T, 'procUkReread', c.lang)), '« Relire les départs dans le paquet du Royaume-Uni » '
         '(two SIDs held)', what='label')
    c.eq(c.count(f'{FUEL} [data-proc="arr"] [data-do=procukpkg]'), 0, 'not on the arrival (KJFK)', what='arrival')

    def answer(ans, what):
        c.tap(f'{D} [data-do=procukpkg]')
        c.until("window.__uk.go !== null", timeout=8000, what=f'asked ({what})')
        c.js(f"window.__uk.go({ans})")
        c.until(f"!!document.querySelector('{L} [data-ukres]')", timeout=8000, what=f'the answer in the line ({what})')
        return norm(c.text(f'{L} [data-ukres]'))
    got = answer("{ ok: false, reason: 'not-personal' }", 'personal use')
    c.eq(got, norm(tx(T, 'procUkPersonal', c.lang)), '« Cochez l’usage personnel dans Données… »', what='not-personal')
    got = answer("{ ok: false, reason: 'no-package' }", 'no package')
    c.eq(got, norm(tx(T, 'procUkNoPkg', c.lang)), '« Aucun paquet eAIP du Royaume-Uni dans Téléchargements… »', what='no-package')
    # audit 219: the format marks (Cf: U+202E reverses the text, U+200B hides itself) taken out like the control characters
    got = answer("{ ok: false, reason: 'failed', message: '<b>pypdf\\u202e 6.21.3</b> trop ancienne : pip\\u200b install -U pypdf\\u2066' }", 'failure')
    c.ok('pypdf 6.21.3' in got and 'pip install' in got, got, 'the launcher\'s sentence said')
    c.eq(c.count(f'{L} [data-ukres] b'), 0, 'escaped, never markup', what='escaped')
    c.eq(c.js(f"[...document.querySelector('{L} [data-ukres]').textContent].filter(ch => /\\p{{Cf}}/u.test(ch)).length"), 0,
         'no format mark (U+202E, U+200B, U+2066) in the line', what='format marks')
    c.eq(c.js("window.__uk.asked"), ['EGLL', 'EGLL', 'EGLL'], 'aerodb asked for EGLL, source ukpkg', what='asked')
    sids = "[{ kind: 'SID', id: 'EGLL.SID.XMODA1J.RW09L.NONE', partial: {} }, { kind: 'SID', id: 'EGLL.SID.XMAXI1F.RW27R.NONE', partial: {} }, { kind: 'APP', id: 'x' }]"
    got = answer(f"{{ ok: true, icao: 'EGLL', procedures: {sids} }}", 'read')
    c.eq(got, norm(tx(T, 'procUkOk', c.lang).replace('{n}', '2')), '« 2 SID lues en partie (point de sortie et niveaux) »', what='ok')
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.js(f"document.querySelector('{L}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F231_{c.design}_390_{c.lang}_line.png')
    # a SID read in part: chosen like another, says so; the cycle unknown never 1970
    opts = sel_opts(c, 'p-dep-sid') or []
    part = [x for x in opts if x[0] == 'EGLL.SID.XMODA1J.RW09L.NONE']
    c.ok(part and norm(tx(T, 'procPartialShort', c.lang)) in norm(part[0][1]), opts, 'in the list, marked « en partie »')
    pick_proc(c, 'p-dep-sid', 'EGLL.SID.XMODA1J.RW09L.NONE')
    c.until(f"(document.querySelector('{D} [data-r=src-main]')?.textContent || '').length > 0", timeout=8000, what='the SID line says its source')
    src = norm(c.text(f'{D} [data-r=src-main]'))
    c.ok(norm(tx(T, 'procPartial', c.lang)) in src, src, '« lue en partie : point de sortie et niveaux ; tracé non lu, voir la carte »')
    c.ok(norm(tx(T, 'procCycleUnknown', c.lang)) in src, src, '« cycle inconnu »')
    c.ok('1970' not in (c.text(D) or ''), c.text(D), 'never 1970')
    c.js(f"document.querySelector('{D} [data-r=src-main]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F231_{c.design}_390_{c.lang}_partial.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.js(f"document.querySelector('{D}').scrollIntoView({{block: 'start'}})")
    c.shot(f'F231_{c.design}_1280_{c.lang}_partial.png')


_S0380_ROUTE = 'EGLL MAY Y47 DRAKE DCT SITET A34 LGL H20 BOBSA BOBSA9E LFPO/02'


@case('F233', '« Contrôler »: the route sent to the engine never carries the « aerodrome/runway » word of the field (« LFPO/02 »): the aerodrome '
      'alone in the text, the runway in its own field (rwyArr / rwyDep); the STAR\'s name stays', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0380 (the user, 14 h 39, 24595511f: « Point inconnu dans AeroDB : LFPO/02 » on « Contrôler »; the ergonomist: in a route, the '
      'name of a SID or a STAR and the « aerodrome/runway » word are never looked for as points); the route of his report, a fake launcher')
def f233(c):
    st = _route_launcher(c, ['route/compute'])
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': _S0380_ROUTE, 'dep': 'EGLL', 'arr': 'LFPO', 'manual': True,
                             'points': [{'id': 'EGLL', 'lat': 51.47, 'lon': -0.46}, {'id': 'LFPO', 'lat': 48.72, 'lon': 2.38}],
                             'procedures': {'dep': {}, 'arr': {'rwy': '02'}, 'by': 'fuel', 'at': '2026-11-16T13:00:00Z'}}
    c.open('fuel', docs=docs)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcheck]')", timeout=10000, what='« Contrôler » (the launcher has the job)')
    c.tap(f'{FUEL} [data-do="rcheck"]')
    for _ in range(50):
        if any((p.get('args') or {}).get('action') == 'check' for p in st['posts']):
            break
        c.wait(200)
    chk = [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'check'][-1]
    words = str(chk.get('route', '')).split()
    c.ok(not any('/' in w for w in words), chk.get('route'), 'no « aerodrome/runway » word in the route sent')
    c.eq([words[0], words[-1]], ['EGLL', 'LFPO'], 'the aerodromes alone at both ends', what='ends')
    c.ok('BOBSA9E' in words, words, 'the STAR\'s name kept (the engine reads it as a procedure)')
    c.eq(chk.get('rwyArr'), '02', 'the arrival runway in its own field', what='rwyArr')
    # the pure request: a runway written only in the text goes to its field; another aerodrome's « XXXX/NN » is not touched
    got = c.js("""async () => { const RE = await import('/modules/fuel/route_engine.js');
      return RE.request({ action: 'check', dep: 'EGLL', arr: 'LFPO', text: 'EGLL/27L MAY Y47 DRAKE LFOB/12 LFPO/02', date: '2026-11-16T14:00' }) }""")
    c.eq([got.get('route'), got.get('rwyDep'), got.get('rwyArr')], ['EGLL MAY Y47 DRAKE LFOB/12 LFPO', '27L', '02'],
         'the runways of the text to their fields, the aerodromes alone', what='request')


# SOG-0375: aerodb answers XPLAN (unknown to the base) from the user's X-Plane folder, as aerodb.coords / coordsAll do: `local: true, source:
# 'xplane'`; every other name unchanged. Invented point and position.
_XP_LAT, _XP_LON = 46.3125, 0.6875
_XP_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const c = db.coords, ca = db.coordsAll, hit = id => String(id || '').trim().toUpperCase() === 'XPLAN';
        db.coords = async (id, o) => hit(id) ? { lat: %s, lon: %s, name: 'XPLAN', kind: 'point', local: true, source: 'xplane' } : c.call(db, id, o);
        if (ca) db.coordsAll = async (id, o) => hit(id) ? [{ kind: 'point', item: { id: 'XPLAN', lat: %s, lon: %s, name: 'XPLAN' }, zone: 'xplane',
          local: true, source: 'xplane' }] : ca.call(db, id, o) } catch (e) {}
      return db } } } }) })()""" % (_XP_LAT, _XP_LON, _XP_LAT, _XP_LON)


def _xp_written(c, d, what):
    """The written flight names XPLAN, says where its position stays, and holds no position of it (nor its numbers anywhere)."""
    pts = (d.get('route') or {}).get('points') or []
    xp = [p for p in pts if p.get('id') == 'XPLAN']
    c.ok(len(xp) == 1, [p.get('id') for p in pts], f'{what}: the point is written by its name')
    c.ok(xp and 'lat' not in xp[0] and 'lon' not in xp[0] and xp[0].get('local') == 'xplane', xp, f'{what}: never its position, « local: xplane »')
    raw = json.dumps(d)
    c.ok(str(_XP_LAT) not in raw and str(_XP_LON) not in raw, '', f'{what}: its latitude and longitude nowhere in the record')


@case('F232', 'A point placed from the user\'s X-Plane folder (aerodb: local, source xplane): the flight written with the group keeps its '
      'name, never its position; Carburant keeps the position in memory on this device (the distance counts it). « Ajouter un point », the '
      'route field, « Direct vers »', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0375 (the user, Q-0061: « corriger », 16/11 14 h 27; SOG-0153: data read on the device from Navigraph / Jeppesen stays in memory, '
      'never written nor exported); aerodb\'s answer held by the case, invented point XPLAN')
def f232(c):
    path = 'pilot/ABC/current_flight.json'
    c.page.add_init_script(_XP_STUB)
    # « Ajouter un point »
    c.open('fuel', docs=flight_docs())
    to_step(c, 1)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')
    before = c.doc(path)['route']
    k0 = c.count(f'{FUEL} [data-pts] [data-do="ptdel"]')
    c.page.fill(f'{FUEL} [data-k="addpt"]', 'XPLAN')
    c.tap(f'{FUEL} [data-do="addpt"]')
    d = cf_doc(c, lambda d: 'XPLAN' in [p.get('id') for p in (d.get('route') or {}).get('points') or []], 'the added point written', timeout=10000)
    _xp_written(c, d, '« Ajouter un point »')
    c.eq(c.count(f'{FUEL} [data-pts] [data-do="ptdel"]'), k0 + 1, 'listed on the screen like the others', what='listed')
    c.ok(float(d['route'].get('distanceNm') or 0) > float(before.get('distanceNm') or 0) + 1, [before.get('distanceNm'), d['route'].get('distanceNm')],
         'the distance counts its position, kept on this device')
    c.wait(600)
    _xp_written(c, c.doc(path), 'after the next writes')
    # the route field
    rt = f'{FUEL} [data-k="rtext"]'
    c.page.fill(rt, 'LFRS LUGEN XPLAN NEPIX LFML')
    c.page.locator(rt).blur()
    d = cf_doc(c, lambda d: 'XPLAN' in str((d.get('route') or {}).get('text')) and 'XPLAN' in [p.get('id') for p in (d.get('route') or {}).get('points') or []]
               and 'LUGEN' in [p.get('id') for p in (d.get('route') or {}).get('points') or []], 'the typed route written', timeout=10000)
    _xp_written(c, d, 'the route field')
    c.eq(norm(c.text(f'{FUEL} [data-unres]') or ''), '', 'never an unknown point on this device', what='known')
    # « Direct vers », a flight under way
    c.open('fuel?direct=XPLAN', docs=_direct_docs())
    c.until(f"(document.querySelector('{FUEL} [data-block=direct]:not([hidden]) [data-directsays]')?.textContent || '').includes('XPLAN')", timeout=15000,
            what='the panel of the direct, for XPLAN')
    c.tap(f'{FUEL} [data-do="directapply"]')   # at once: the reading of the route of the mount may still be in progress (F235)
    # the point imposed by the mission (PT4) is skipped: the second confirmation comes after the tap (ctx.ask), waited for, never raced
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='the second confirmation (an imposed point skipped)')
    c.tap('.f-modal [data-ok]')
    d = cf_doc(c, lambda d: 'XPLAN' in [p.get('id') for p in (d.get('route') or {}).get('points') or []], 'the direct written', timeout=10000)
    _xp_written(c, d, '« Direct vers »')


# F235: while window.__hold is set, aerodb's answer for NEPIX waits for window.__go() (a route reading held in progress); window.__held
# says it is waiting; every other name at once
_HOLD_STUB = """(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const late = (f, id) => window.__hold && String(id || '').toUpperCase() === 'NEPIX'
          ? new Promise(r => { window.__held = true; window.__go = () => { window.__hold = false; window.__held = false; r() } }).then(f) : f();
        const c = db.coords, ca = db.coordsAll;
        db.coords = (id, o) => late(() => c.call(db, id, o), id);
        if (ca) db.coordsAll = (id, o) => late(() => ca.call(db, id, o), id) } catch (e) {}
      return db } } } }) })()"""


@case('F235', 'Route step: a point added while the route is being read again is kept — the reading in progress, started on the text of '
      'before and ending before the write (the route object changed in place), never writes its points and its text over the newer route',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0375 follow-up (F232 red 3 times in 3 at Sécurisation, 3 in 5 at the ergonomist: « Direct vers » applied while the reading of '
      'the route of the mount was in progress was lost); the reading kept the route OBJECT across its wait and compared it with itself, and '
      '« Ajouter un point » / « Direct vers » change that object in place; the reading held by the case (aerodb stub), released at once')
def f235(c):
    c.page.add_init_script(_HOLD_STUB)
    c.open('fuel', docs=flight_docs())
    to_step(c, 1)
    if not c.js("document.querySelector('[data-module=fuel] details[data-fold=pts]')?.open"):
        c.tap(f'{FUEL} details[data-fold="pts"] > summary')
    c.settle()
    c.js("window.__hold = true")
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'LFRS LUGEN DCT NEPIX LFML')   # a reading starts 500 ms later, held on NEPIX
    c.until("window.__held === true", timeout=8000, what='the reading of the route in progress (held)')
    c.page.fill(f'{FUEL} [data-k="addpt"]', 'TSTA 45 1')
    c.tap(f'{FUEL} [data-do="addpt"]')              # the route changed in place while the reading waits
    c.js("window.__go()")                           # the reading ends before the write (300 ms) replaces the flight's object
    c.wait(2500)
    d = cf_doc(c, lambda d: True, 'the flight')
    ids = [p.get('id') for p in (d.get('route') or {}).get('points') or []]
    words = str((d.get('route') or {}).get('text') or '').split()
    c.ok('TSTA' in ids and 'TSTA' in words, [ids, words], 'the point added is kept, in the points and in the text written')
    c.ok('TSTA' in (c.text(f'{FUEL} [data-pts]') or ''), c.text(f'{FUEL} [data-pts]'), 'and on the screen')


# SOG-0372 (unfolded crossing): aerodb's NAT state and placed tracks held by the case (window.__natx.st, window.__natx.tracks); an invented
# track G (positions of the NAT message form, not of a real day)
_NATX_STUB = """(() => { window.__natx = { st: { present: true, count: 1, from: '2026-11-16T11:30:00.000Z', validUntil: '2026-11-16T19:00:00.000Z',
    expired: false, current: 1 }, tracks: [{ id: 'G', points: [{ id: '53/15', lat: 53, lon: -15 }, { id: '53/20', lat: 53, lon: -20 },
    { id: '54/30', lat: 54, lon: -30 }, { id: '56/40', lat: 56, lon: -40 }, { id: '54/50', lat: 54, lon: -50 }, { id: 'XNICS', lat: 49.5, lon: -55 }] }] };
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { db.natState = async () => window.__natx.st;
        db.nat = async () => window.__natx.st.present ? { tracks: window.__natx.tracks.map(t => ({ id: t.id })) } : null;
        db.natTracks = async () => window.__natx.st.present ? JSON.parse(JSON.stringify(window.__natx.tracks)) : [] } catch (e) {}
      return db } } } }) })()"""


def _natx_docs(text):
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': text, 'dep': 'EGLL', 'arr': 'KJFK', 'manual': True,
                             'points': [{'id': 'EGLL', 'lat': 51.47, 'lon': -0.46}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}]}
    return docs


@case('F236', 'Route field, a NAT track of the day written between its entry and its exit (« 53/15 NATG 54/50 »): its points read that day '
      'are put in between (the Map, the distance and the quote follow the track); the day\'s tracks not read, or the entry or the exit not on '
      'the track: the crossing stays direct and the line SAYS it', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0372 (the user\'s refusal, 14 h 53: « les nats sont bonnes, mais on a toujours des tracés directs entre Dublin et JFK »); the '
      'ergonomist at 15 h 10: unfold by aerodb.natTracks(), bounded points, only when they frame the entry and the exit; not read: direct and '
      'said, never silent; aerodb\'s tracks held by the case (stub), an invented track')
def f236(c):
    path = 'pilot/ABC/current_flight.json'
    T = 'modules/fuel/module.js'
    W = f'{FUEL} [data-natwarn]'
    c.page.add_init_script(_NATX_STUB)
    rt = f'{FUEL} [data-k="rtext"]'

    def typed(text):
        c.js(f"(t => {{ t.value = {text!r}; t.dispatchEvent(new Event('input', {{bubbles: true}})); t.dispatchEvent(new Event('change', {{bubbles: true}})); }})(document.querySelector('{rt}'))")

    def pts_of(d):
        return [(p.get('id'), p.get('lat'), p.get('lon')) for p in (d.get('route') or {}).get('points') or []]
    c.open('fuel', docs=_natx_docs('EGLL 53/15 NATG 54/50 KJFK'))
    to_step(c, 1)
    # the day's track G read: its points between 53/15 and 54/50
    typed('EGLL 53/15 NATG 54/50 KJFK')
    d = cf_doc(c, lambda d: any(abs((p[1] or 0) - 56) < 1e-6 and abs((p[2] or 0) + 40) < 1e-6 for p in pts_of(d)), 'the track unfolded', timeout=10000)
    ids = [p[0] for p in pts_of(d)]
    c.eq(ids, ['EGLL', '53/15', '53/20', '54/30', '56/40', '54/50', 'KJFK'], 'the track\'s points between its entry and its exit, in order', what='unfolded')
    unfolded_nm = float(d['route'].get('distanceNm') or 0)
    c.ok('NATG' in str(d['route'].get('text')), d['route'].get('text'), 'the text keeps « NATG » (the points are not written in it)')
    c.ok(c.js(f"document.querySelector('{W}')?.hidden !== false"), c.text(W), 'nothing said: the crossing follows the track')
    # the entry not on the track: direct, said
    typed('EGLL 52/15 NATG 54/50 KJFK')
    d = cf_doc(c, lambda d: '52/15' in [p[0] for p in pts_of(d)], 'the route with another entry', timeout=10000)
    c.eq([p[0] for p in pts_of(d)], ['EGLL', '52/15', '54/50', 'KJFK'], 'not unfolded: the entry is not on the track', what='ends')
    c.until(f"!document.querySelector('{W}')?.hidden", timeout=8000, what='the line says it')
    c.eq(norm(c.text(W)), norm(tx(T, 'natEnds', c.lang).replace('{l}', 'G').replace('{d}', '16/11')), '« … entrée ou sortie hors de la route du 16/11, traversée tracée en direct »', what='ends line')
    # the day's tracks not read: direct, said
    c.js("window.__natx.st = { present: false, count: 0, from: null, validUntil: null, expired: null, current: 0 }")
    typed('EGLL 53/15 NATG 54/50 KJFK')
    d = cf_doc(c, lambda d: '53/15' in [p[0] for p in pts_of(d)] and '56/40' not in [p[0] for p in pts_of(d)], 'the route, tracks not read', timeout=10000)
    c.eq([p[0] for p in pts_of(d)], ['EGLL', '53/15', '54/50', 'KJFK'], 'not unfolded: the day\'s tracks not read', what='unread')
    c.ok(unfolded_nm > float(d['route'].get('distanceNm') or 0) + 10, [unfolded_nm, d['route'].get('distanceNm')], 'the distance followed the unfolded track')
    c.until(f"(document.querySelector('{W}')?.textContent || '').includes('G')", timeout=8000, what='the line says it')
    c.eq(norm(c.text(W)), norm(tx(T, 'natUnread', c.lang).replace('{l}', 'G')), '« Route NAT G : routes du jour non lues, traversée tracée en direct »', what='unread line')
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.js(f"document.querySelector('{W}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F236_{c.design}_390_{c.lang}_unread.png')


# SOG-0377: what a choice asks — aerodb's calls by aerodrome (`procedures`, `runways`, `coverage`, `chartOnly`: the drawing of a side), and the
# writes of the flight in the device's store (its records keep their path); window.__s377.reset() starts a gesture
_S0377_SPY = """(() => { const W = window.__s377 = { asks: [], puts: 0, reset() { this.asks = []; this.puts = 0 } };
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...a) { if (/current_flight\\.json$/.test(String(a[1] ?? a[0]?.path ?? ''))) W.puts++; return put.apply(this, a) };
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      for (const k of ['procedures', 'coverage', 'chartOnly', 'approachSummary']) if (typeof db[k] === 'function') {
        const f = db[k]; db[k] = function (...x) { W.asks.push(k + ':' + String(x[0] ?? '').toUpperCase()); return f.apply(this, x) } }
      return db } } } }) })()"""


@case('F234', 'Procedures, a SID or a STAR changed: its side alone is drawn again, once (aerodb is asked nothing about the other aerodrome), the '
      'weather that comes back does not draw the card again when the wind is the same, and the flight is written once', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0377 (the user, 9 h 16: « après avoir choisi ou modifié une star / sid sur un trajet, il y a une longue phase de refresh ») ; the '
      'survey of 16/11 (two writes, the card drawn whole at the choice and again at 2.1 s on the weather\'s return); the ergonomist\'s yes to (a), (b), (c)')
def f234(c):
    route_metar(c, {'LFRS': (40, 8), 'LFML': (130, 10), 'LFMT': (130, 8)})
    c.page.add_init_script(_S0377_SPY)
    open_proc(c, procs=V2_PROCS)
    wait_rows(c, 'dep')
    c.until("(() => { const s = document.querySelector('[data-module=fuel] select[data-k=\"p-arr-rwy\"]'); return !!s && [...s.options].some(o => o.textContent.includes('kt')) })()",
            timeout=20000, what='the METAR read (the wind on the runways)')
    c.wait(3000)
    for side, k, other in (('dep', 'p-dep-sid', 'LFML'), ('arr', 'p-arr-star', 'LFRS')):
        unfold(c, side)
        c.wait(1500)
        opts = [v for v, _ in (sel_opts(c, k) or []) if v and v != '__none']
        cur = c.js(f"document.querySelector('{FUEL} select[data-k=\"{k}\"]')?.value")
        new = next((v for v in opts if v != cur), None)
        c.ok(new, opts, f'{k}: another procedure to choose')
        c.js("window.__s377.reset()")
        pick_proc(c, k, new)
        c.wait(4000)   # the whole sequence: settle (400 ms), the route read again (500 ms), the weather (1.2 s), the writes
        got = c.js("({ asks: window.__s377.asks, puts: window.__s377.puts })")
        mine = 'LFRS' if side == 'dep' else 'LFML'
        c.eq([a for a in got['asks'] if a.endswith(':' + other)], [], f'{k}: aerodb asked nothing about {other}', what='other aerodrome')
        c.eq(len([a for a in got['asks'] if a == 'coverage:' + mine]), 1, f'{k}: its side drawn once ({got["asks"]})', what='one drawing')
        c.eq(got['puts'], 1, f'{k}: the flight written once', what='writes')


@case('F237', 'Route step, « Calculer A → B » for a flight across the Atlantic (one end west of 35° W, the other east of 15° W): while the '
      'engine searches, the waiting line also says « Vol transocéanique : la recherche peut prendre jusqu\'à 20 secondes »; nothing of it for '
      'a flight that does not cross, nothing left once the answer is drawn', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0354 (AeroDB: Dublin → New York now FOUND in about 16 s instead of a proposal in 8; the answer carries budget.ocean, known only '
      'at the answer); the ergonomist: the same criterion as the engine, four languages, a capture at 390 × 667; a slow fake launcher')
def f237(c):
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    st['delay'] = 4
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'EIDW KJFK', 'dep': 'EIDW', 'arr': 'KJFK', 'manual': True,
                             'points': [{'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}]}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='« Calculer A → B »')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rbusy]')", timeout=5000, what='the waiting line')
    c.until(f"!!document.querySelector('{FUEL} [data-rocean]')", timeout=3000, what='the transoceanic sentence while waiting')
    c.eq(norm(c.text(f'{FUEL} [data-rocean]')), norm(tx(T, 'rBusyOcean', c.lang)), '« Vol transocéanique : la recherche peut prendre jusqu’à 20 secondes »',
         what='ocean')
    c.js(f"document.querySelector('{FUEL} [data-rocean]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F237_{c.design}_390_{c.lang}_wait.png')
    c.until(f"!document.querySelector('{FUEL} [data-rbusy]')", timeout=15000, what='the answer drawn')
    c.eq(c.count(f'{FUEL} [data-rocean]'), 0, 'nothing more once the route is there', what='after')
    # a flight that does not cross (LFRS → LFML): never said
    st['delay'] = 3
    c.open('fuel', docs=flight_docs())
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='« Calculer A → B »')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rbusy]')", timeout=5000, what='the waiting line')
    c.wait(1500)
    c.eq(c.count(f'{FUEL} [data-rocean]'), 0, 'a flight over Europe: no transoceanic sentence', what='not crossing')


# SOG-0354 (L2b 3): the engine's answer for an ocean flight with the option `sections` — an invented route by the NAT track E of 16/11
_OCEAN_ALT = {'id': 'alt1', 'name': 'Via NAT E', 'route': 'EIDW DOGAL NATE 54/50 DCT NICSO KJFK', 'distanceNm': 3023, 'fl': 370,
              'profile': [{'nm': 0, 'ft': 500}, {'nm': 3023, 'ft': 400}], 'sid': None, 'star': None, 'faults': 0,
              'nat': {'tracks': ['E'], 'issued': '16/11', 'stale': False},
              'segments': [_seg('EIDW', 'DOGAL'), _seg('DOGAL', '54/50'), _seg('54/50', 'NICSO'), _seg('NICSO', 'KJFK')]}
_OCEAN_SECTIONS = {'candidates': [{'track': 'E', 'lower_bound': 2626.0}], 'tried': [{'track': 'E', 'cost': 2880.0}], 'chosen': 'E', 'cost': 2880.0,
                   'sections': [{'name': 'europe', 'from': 'EIDW', 'to': 'DOGAL', 'nm': 612.4, 'cost': 600.0, 'expanded': 260, 'seconds': 0.015, 'proof': 'computed'},
                                {'name': 'track E', 'from': 'DOGAL', 'to': '54/50', 'nm': 1505.0, 'cost': 1500.0, 'expanded': 5, 'seconds': 0.0, 'proof': 'published'},
                                {'name': 'amérique', 'from': '54/50', 'to': 'KJFK', 'nm': 905.6, 'cost': 780.0, 'expanded': 16, 'seconds': 0.008, 'proof': 'computed'},
                                {'name': 'track Z', 'from': '<b>X</b>', 'to': 'KJFK', 'nm': 1, 'proof': 'published'},
                                {'name': 'track Y', 'from': 'AAAAA', 'to': 'BBBBB', 'nm': 1, 'proof': 'forged'}]}


def _ocean_docs():
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'EIDW KJFK', 'dep': 'EIDW', 'arr': 'KJFK', 'manual': True,
                             'points': [{'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}]}
    return docs


def _compute_now(c, st):
    """« Calculer A → B » tapped, then the NEW answer drawn: a new compute request posted and the waiting line gone (a list kept on the
    device from an earlier computation is never read for this one)."""
    n0 = len(st['posts'])
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]:not([disabled])')", timeout=10000, what='« Calculer A → B »')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    for _ in range(75):
        if any((p.get('args') or {}).get('action') == 'compute' for p in st['posts'][n0:]):
            break
        c.wait(200)
    c.until(f"!document.querySelector('{FUEL} [data-rbusy]') && !!document.querySelector('{FUEL} [data-altlist] [data-alt]')", timeout=15000,
            what='the new answer drawn')
    return [p['args'] for p in st['posts'][n0:] if (p.get('args') or {}).get('action') == 'compute']


@case('F238', 'Route step, « Calculer A → B » for a flight across the Atlantic: the request asks `sections: true`; the computed route says '
      'the proof of each of its sections on its line — « EIDW–DOGAL : calculée · DOGAL–54/50 : publiée, route NAT E du 16/11 · 54/50–KJFK : '
      'calculée »; a section of another proof or with an unreadable end is left out; without the option applied (sections null), nothing; '
      'a flight over Europe never asks it', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0354 L2b (3) (AeroDB 39e81766c: route/compute `sections`, view.sections = { candidates, tried, chosen, cost, sections: [{ name, '
      'from, to, nm, cost, expanded, seconds, proof: computed | published }] }, null when not applied); the user\'s priority: the route '
      'computation; the ergonomist: the proof said in the existing list, a capture at 390 × 667; a fake launcher in the shape of the contract')
def f238(c):
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _OCEAN_SECTIONS}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    comps = _compute_now(c, st)
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt=\"0\"] [data-proof]')", timeout=15000, what='the proof on the line of the route')
    c.ok(comps and all(a.get('sections') is True for a in comps), comps, 'an ocean flight asks `sections: true`')
    got = c.js(f"[...document.querySelectorAll('{FUEL} [data-alt=\"0\"] [data-proof] [data-proofsec]')].map(e => [e.dataset.proofsec, e.textContent])")
    want = [['computed', tx(T, 'rProofComp', c.lang).replace('{a}', 'EIDW').replace('{b}', 'DOGAL')],
            ['published', tx(T, 'rProofPub', c.lang).replace('{a}', 'DOGAL').replace('{b}', '54/50').replace('{t}', 'E').replace('{d}', '16/11')],
            ['computed', tx(T, 'rProofComp', c.lang).replace('{a}', '54/50').replace('{b}', 'KJFK')]]
    c.eq([[k, norm(v)] for k, v in got], [[k, norm(v)] for k, v in want], 'each section and its proof, in order; the forged ones left out', what='proof')
    c.eq(c.count(f'{FUEL} [data-proof] b'), 0, 'an end that is markup is never drawn', what='escaped')
    c.js(f"document.querySelector('{FUEL} [data-alt=\"0\"]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F238_{c.design}_390_{c.lang}_proof.png')
    # the option not applied (sections null): nothing more on the line
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': None}
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    c.eq(c.count(f'{FUEL} [data-proof]'), 0, 'sections null: no proof line', what='null')
    # a flight over Europe: never asked
    st['extra'] = None
    c.open('fuel', docs=flight_docs())
    to_step(c, 1)
    europe = _compute_now(c, st)
    c.ok(europe and all('sections' not in a for a in europe), europe, 'LFRS → LFML: no `sections` in the request')


# the engine's answer when no NAT track of the day suits: a FREE route created between the entry and the exit (proof « created »), the
# tracks set aside and why, no departure time in the request (basis « none »: the time validity of the tracks not checked); invented, in the
# form AeroDB announced (basis « request » | « none », never « now »: the decision of 16/11 in the evening)
_FREE_SECTIONS = {'source': 'random', 'chosen': None, 'cost': 2950.0, 'depart': {'time': None, 'basis': 'none'},
                  'free': {'label': 'free', 'ok': True, 'entry': 'DOGAL', 'exit': '54/50', 'points': [], 'nm': 1510.0},
                  'sections': [{'name': 'europe', 'from': 'EIDW', 'to': 'DOGAL', 'nm': 612.4, 'proof': 'computed'},
                               {'name': 'free', 'from': 'DOGAL', 'to': '54/50', 'nm': 1510.0, 'proof': 'created'},
                               {'name': 'amérique', 'from': '54/50', 'to': 'KJFK', 'nm': 905.6, 'proof': 'computed'}],
                  'rejected': [{'track': 'E', 'code': 'time', 'text': 'route NAT E : non valide à 0341Z (valide de 1130Z à 1900Z)'},
                               {'track': 'A', 'code': 'direction', 'text': 'sens contraire'},
                               {'track': 'B', 'code': 'level', 'text': 'FL370 non proposé vers l\'ouest'},
                               {'track': 'C', 'code': 'x', 'text': '<img src=x onerror="window.__pwn=1">'},
                               {'track': 'D', 'code': 'x', 'text': 'quatre'}, {'track': 'F', 'code': 'x', 'text': 'cinq'},
                               {'track': 'G', 'code': 'x', 'text': 'sept : au-delà de six, jamais dit'}]}


@case('F239', 'Route step, a flight across the Atlantic that no NAT track of the day suits: the line of the computed route says the FREE route '
      'created (« DOGAL–54/50 : route libre, créée »); the tracks set aside in a CLOSED fold « 6 routes NAT du jour écartées », one reason '
      'each once open (six at most, escaped); without a departure time « Heure de départ non donnée : validité horaire des routes NAT non '
      'vérifiée »; « 0 écart » and « via NAT E » are never glued', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0354 (AeroDB, the next step of the engine: proof « created », sections.source « random », sections.free, sections.rejected '
      '[{ track, code, text }], sections.depart { time, basis: request | none }); the ergonomist: the reasons in a closed fold (the user: « trop '
      'd\'infos tue l\'info »), six at most, bounded and escaped; the capture of F238 showed « écartvia NAT E »; a fake launcher in the shape announced')
def f239(c):
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _FREE_SECTIONS}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    R0 = f'{FUEL} [data-altlist] [data-alt="0"]'
    c.until(f"!!document.querySelector('{R0} [data-proof]')", timeout=15000, what='the proof on the line of the route')
    got = c.js(f"[...document.querySelectorAll('{R0} [data-proof] [data-proofsec]')].map(e => [e.dataset.proofsec, e.textContent])")
    want = [['computed', tx(T, 'rProofComp', c.lang).replace('{a}', 'EIDW').replace('{b}', 'DOGAL')],
            ['created', tx(T, 'rProofFree', c.lang).replace('{a}', 'DOGAL').replace('{b}', '54/50')],
            ['computed', tx(T, 'rProofComp', c.lang).replace('{a}', '54/50').replace('{b}', 'KJFK')]]
    c.eq([[k, norm(v)] for k, v in got], [[k, norm(v)] for k, v in want], 'the free route created said, between the computed sections', what='proof')
    # the tracks set aside: a CLOSED fold that says how many; one reason each once open
    F = f'{R0} [data-proofrejs]'
    c.ok(c.js(f"document.querySelector('{F}')?.open === false"), c.js(f"document.querySelector('{F}')?.outerHTML?.slice(0, 200)"), 'the fold is closed')
    c.eq(norm(c.text(f'{F} > summary') or ''), norm(tx(T, 'rProofRejN', c.lang).replace('{n}', '6')), '« 6 routes NAT du jour écartées »', what='fold')
    c.js(f"document.querySelector('{F}').open = true")
    rej = c.js(f"[...document.querySelectorAll('{R0} [data-proofrej]')].map(e => [e.dataset.proofrej, e.textContent])")
    line = lambda t, w: norm(tx(T, 'rProofRejected', c.lang).replace('{t}', t).replace('{w}', w))
    c.eq([r[0] for r in rej], ['E', 'A', 'B', 'C', 'D', 'F'], 'each track set aside, six at most', what='rejected')
    c.eq(norm(rej[0][1]), line('E', 'non valide à 0341Z (valide de 1130Z à 1900Z)'), 'the reason of E, its « route NAT E : » not repeated', what='E')
    c.eq(norm(rej[1][1]), line('A', 'sens contraire'), 'the reason of A', what='A')
    c.eq(c.js(f"document.querySelectorAll('{R0} img').length + (window.__pwn ? 100 : 0)"), 0, 'a reason that is markup is text, never run', what='escaped')
    c.eq(norm(c.text(f'{R0} [data-proofnotime]') or ''), norm(tx(T, 'rProofNoTime', c.lang)),
         '« Heure de départ non donnée : validité horaire des routes NAT non vérifiée »', what='no time')
    # « 0 écart » and « via NAT E » never glued: a space before the NAT mention
    c.ok(c.js(f"(n => !!n && /\\s$/.test(n.previousSibling?.textContent || ''))(document.querySelector('{R0} [data-nat]'))"),
         c.js(f"document.querySelector('{R0}').textContent"), 'a space before « via NAT E »')
    c.js(f"document.querySelector('{R0}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F239_{c.design}_390_{c.lang}_free.png')


@case('F241', 'Route step, the NAT message of the day read (westbound tracks valid from 16/11 at 11:30Z, eastbound ones of the night valid '
      'from 17/11): the routes the launcher computed through the EASTBOUND tracks (issued 17/11, not stale) stay — never removed as « of '
      'another day », never left to the direct of the flight; a route through an older message (issued 15/11) is still removed, and said; '
      'the same after a reload', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0389 (the user, KABQ → EGLL FL350 at 21:35Z: « une route apparaît furtivement, puis disparaît. 3 variantes, qui '
      'disparaissent également. au final, direct entre adep et adest. »; two GOOD answers of the launcher, through NAT V, R, S issued 17/11; '
      'route_alts.json rewritten empty); the ergonomist: a route given by the launcher is never replaced by a direct without the screen '
      'saying why; invented answers of the same form, aerodb\'s NAT state held by the case (stub)')
def f241(c):
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.page.add_init_script(_NAT_STUB)
    # the message of the day: its earliest validity (westbound) 16/11 at 11:30Z, its latest (eastbound of the night) 17/11 at 08:00Z
    c.page.add_init_script("window.__nat.st = { present: true, count: 6, from: '2026-11-16T11:30:00.000Z', validUntil: "
                           "'2026-11-17T08:00:00.000Z', expired: false, current: 3 }")
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    seg2 = lambda a, b: [_seg('EINN', a), _seg(a, b), _seg(b, 'CYYT')]
    east = [dict(_alt(i, f'Via NAT {k}', f'EINN {a} NAT{k} {b} CYYT', 1700 + i, 350, seg2(a, b), sid=False),
                 nat={'tracks': [k], 'issued': '17/11', 'stale': False})
            for i, (k, a, b) in enumerate([('V', 'MALOT', '54/50'), ('R', 'LIMRI', '53/50')], 1)]
    older = dict(_alt(3, 'Via NAT Z', 'EINN BEXET NATZ 51/50 CYYT', 1750, 350, seg2('BEXET', '51/50'), sid=False),
                 nat={'tracks': ['Z'], 'issued': '15/11', 'stale': False})
    st['alts'] = [east[0], older, east[1]]  # three at most: the older one among them
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    L = f'{FUEL} [data-natline]'
    c.until(f"!!document.querySelector('{L} [data-natstate=ok]')", timeout=15000, what='the NAT line: the tracks of 16/11 valid')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    names = f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt] [data-altname]')].map(e => e.textContent)"
    c.until(f"{names}.length >= 1", timeout=15000, what='the computed route drawn')
    c.until(f"{names}.length === 2 && !!document.querySelector('{FUEL} [data-natdropped]')", timeout=15000,
            what='the routes through the eastbound tracks, the older one removed')
    c.wait(1500)  # the NAT line is redrawn at each refresh: the list must hold
    c.eq(c.js(names), ['Via NAT V', 'Via NAT R'], 'the routes through the eastbound tracks of the message read stay',
         what='kept')
    c.ok(norm(tx(T, 'natDropped', c.lang).replace('{d}', '16/11')) in norm(c.text(f'{FUEL} [data-natdropped]') or ''),
         c.text(f'{FUEL} [data-routealts]'), 'the route through the message of 15/11 removed, and said')
    c.js(f"document.querySelector('{FUEL} [data-routealts]').scrollIntoView({{block: 'start'}})")
    c.shot(f'F241_{c.design}_390_{c.lang}_eastbound.png')
    # kept on the device the same: read again after a reload, the routes stay
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{L} [data-natstate=ok]') && {names}.length >= 1", timeout=15000, what='the list read again')
    c.wait(1500)
    c.eq(c.js(names), ['Via NAT V', 'Via NAT R'], 'after a reload, the same routes', what='kept after reload')


@case('F242', 'Route step, a route of the launcher through a COMPOUND airway name (« N12A-N34B », the form of the North American routes): '
      'the token is kept in the route line, after a reload, and in the route taken into the flight, airway by airway, as text; a '
      'longer chain or a token that is markup is left out', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0390 (seen on the KABQ → EGLL answers of 16/11: « N71B-N90B » dropped by the page\'s pattern ^[A-Z0-9/]{1,16}$, the route '
      'taken would have read « TUSKY RAFIN » without its airway); the ergonomist: the text of the route kept in the flight is the '
      'launcher\'s, airway by airway; a compound name accepted, bounded, shown as text; invented answer, a fake launcher')
def f242(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg('LFRS', 'LUGEN'), dict(_seg('LUGEN', 'NEPIX'), via='N12A-N34B'), _seg('NEPIX', 'LFML')]
    st['alts'] = [_alt(1, 'Via N12A-N34B', 'LFRS NTS1A LUGEN N12A-N34B NEPIX A1-B2-C3-D4-E5 <b>X</b> MEN1A LFML', 370, 270, segs)]
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=flight_docs())
    to_step(c, 1)
    _compute_now(c, st)
    R0 = f'{FUEL} [data-altlist] [data-alt="0"] .fu-raltroute'
    want = 'LFRS NTS1A LUGEN N12A-N34B NEPIX MEN1A LFML'
    c.eq(c.text(R0), want, 'the compound airway kept in the route line; a chain of five parts and markup left out', what='route line')
    c.eq(c.count(f'{R0} *'), 0, 'no markup of the answer drawn: the route line is text', what='markup')
    # « 0 écart » never cut between the number and the word (the capture of F241 at 390 px): a no-break space
    # (the frame resolves « (s) » by the number, frame/lib/plural.js: the screen is checked, never the template)
    row = c.js(f"document.querySelector('{FUEL} [data-altlist] [data-alt=\"0\"]').textContent") or ''
    c.ok(re.search(r'(?:^|[\s·])0\u00a0[^\s·]', row) is not None, row, '« 0 écart » held together by a no-break space')
    c.js(f"document.querySelector('{FUEL} [data-altlist] [data-alt=\"0\"]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F242_{c.design}_390_{c.lang}_compound.png')
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{R0}')", timeout=15000, what='the list read again from the device')
    c.eq(c.text(R0), want, 'after a reload, the same route text', what='route line after reload')
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: 'N12A-N34B' in str((d.get('route') or {}).get('text') or ''), 'the route taken into the flight')
    c.ok(' LUGEN N12A-N34B NEPIX ' in f" {d['route']['text']} ", d['route']['text'], 'the flight keeps the launcher\'s text, airway by airway')


@case('F240', 'Route step, a flight WITHOUT level: the engine computes at its default level (FL180, the request sends no `fl`); a line at '
      'the head of the route says it (« Niveau non donné : route calculée à FL180 par défaut ») and leads to the Level field; the grey FL of '
      'the route line says « par défaut », never passes for the level of the flight; kept on reload; the engine read keeps the code and the '
      'levels of each NAT track set aside', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0389 (b) (the user: « KABQ → EGLL … La route ne prend pas les nats. »; AeroDB measured: no level in the flight, no `fl` '
      'sent, FL180 taken, every NAT track set aside for the level); the ergonomist, 16/11 at 22 h 43: the line and its way to the field, '
      'proofOf keeps code and levels; the line « Aucune route NAT à FLxxx » and « Recalculer » wait for Q-0072; a fake launcher')
def f240(c):
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    # the engine's level when the request has none (invented answer, no `sections`: the page knows it sent no level)
    st['alts'] = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 180,
                       [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')])]
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['level'] = {'ft': None}
            # SOG-0517: no sheet either (a sheet's reference level would be sent): the engine's default is the only level
            d[1]['aircraft'] = {'type': 'ZZ9Z', 'registration': 'F-ZZZZ'}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    to_step(c, 1)
    sent = _compute_now(c, st)
    c.eq(str(sent[0].get('fl')), 'None', 'no level in the flight nor in a sheet: the head route is asked without `fl`', what='request')
    # SOG-0517 (the user: « il faut le fixer ») : the level the engine took is written in the flight; the variants leave with it
    cf_doc(c, lambda d: (d.get('level') or {}).get('ft') == 18000, 'the engine\'s FL180 written in the flight')
    c.ok(all(str(a.get('fl')) == '180' for a in sent[1:]), [a.get('fl') for a in sent], 'the variants leave with the level written (FL180)')
    # SOG-0517: the flight now carries the level of its route: no « Niveau non donné » line, the FL of the route line plain (never « par
    # défaut »), after a reload too
    L = f'{FUEL} [data-routealts] [data-rnolevel]'
    R0 = f'{FUEL} [data-altlist] [data-alt="0"]'
    c.until(f"!!document.querySelector('{R0}')", timeout=10000, what='the route line')
    c.eq(c.count(L), 0, 'the level written: no « Niveau non donné » line', what='no line')
    c.ok('FL180' in norm(c.text(R0) or '') and norm(tx(T, 'rFlDefault', c.lang).replace('{fl}', '180')) not in norm(c.text(R0) or ''),
         c.text(R0), 'the FL of the route line is the flight\'s, never « par défaut »')
    c.js(f"document.querySelector('{R0}').scrollIntoView({{block: 'center'}})")  # never under the fixed header
    c.shot(f'F240_{c.design}_390_{c.lang}_nolevel.png')
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{R0}')", timeout=15000, what='the route line, after a reload')
    c.eq(c.count(L), 0, 'after a reload: still no line (the flight has its level)', what='no line after reload')
    to_step(c, 0)  # the Flight step, its Level field
    # a flight WITH level: no line, the FL plain
    st['alts'] = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270,
                       [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')])]
    c.page.fill(f'{FUEL} input[data-k="fl"]', '270')
    cf_doc(c, lambda d: (d.get('level') or {}).get('ft') == 27000, 'the level written with the flight')
    to_step(c, 1)
    sent = _compute_now(c, st)
    c.eq(sorted({str(a.get('fl')) for a in sent}), ['270'], 'the level of the flight sent, by each request', what='request with level')
    c.eq(c.count(L), 0, 'a flight with its level: no line', what='line with level')
    # the engine read: sections.fl / fl_basis said first; each NAT track set aside keeps its code and its levels (bounded)
    got = c.js("""() => import('/modules/fuel/route_engine.js').then(m => {
      const alt = { name: 'x', route: 'KABQ DCT EGLL', distanceNm: 4300, fl: 180, segments: [{ from: 'KABQ', to: 'EGLL' }] },
        n = m.normalize({ ok: true, alternatives: [alt], issues: [], sections: { fl: 180, fl_basis: 'default', sections: [],
          rejected: [{ track: 'V', code: 'level', text: "route NAT V : FL180 non proposé vers l'est (FL340 à FL400)",
            levels: [340, 350, 360, 370, 380, 390, 400] }, { track: 'W', code: 'evil<b>', text: 'x', levels: ['1e9', 99999, -5, 410] }] } },
          'compute', { fl: 270 });
      return { level: n.level, rej: n.plans[0].proof.rejected.map(r => [r.track, r.code, r.levels]) };
    })""")
    c.eq(got['level'], {'fl': 180, 'basis': 'default'}, 'the engine’s basis said first (sections.fl_basis)', what='level')
    c.eq(got['rej'], [['V', 'level', [340, 350, 360, 370, 380, 390, 400]], ['W', '', [410]]],
         'the code (known codes only) and the levels (FL10 to FL660) of each track set aside', what='rejected')


@case('F226', 'Route step, an answer without a computed route (status « proposal »): never presented as a route — « Pas de route calculée », '
      'the engine\'s reason, then the proposals apart with their controlled share; their button says « Prendre cette proposition »', 'F',
      tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0161, its rests (AeroDB 329847a19: the answer carries status computed | proposal | none and, for proposal, « Aucune route '
      'calculée : <raison>. Propositions de repli à examiner… »); EIDW → KBOS, a simulated answer (fake launcher)')
def f226(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('EIDW', 'MALOT', 'controlled', 'HIGH'), _ctl_seg('MALOT', 'KBOS', 'fallback', 'NAT', 'raccord direct : aucun chemin contrôlé')]
    p1 = dict(_alt(1, '', 'EIDW MALOT KBOS', 2600, 370, segs, sid=False), proposal=True, incomplete=True,
              control={'controlledPct': 30, 'incompletePct': 0, 'fallbackPct': 70, 'errorPct': 0, 'sections': []})
    st['alts'] = [p1]
    why = 'Aucune route calculée : budget de recherche atteint. Propositions de repli à examiner : routes partielles, une part n’est pas contrôlée.'
    st['extra'] = {'status': 'proposal', 'message': why}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'EIDW KBOS', 'dep': 'EIDW', 'arr': 'KBOS', 'manual': True,
                             'points': [{'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}, {'id': 'KBOS', 'lat': 42.36, 'lon': -71.0}]}
    c.open('fuel', docs=docs)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{FUEL} [data-proposals] [data-alt]').length === 1", timeout=12000, what='the proposal, apart')
    c.eq(norm(c.text(f'{FUEL} [data-rnoroute]') or ''), norm(row(c, 'rNoRoute')), 'titled « Pas de route calculée »', what='title')
    c.ok(norm(why) in norm(c.text(f'{FUEL} [data-rnone]') or ''), c.text(f'{FUEL} [data-rnone]'), 'the engine\'s reason said')
    c.eq(c.count(f'{FUEL} [data-altlist]:not([data-proposals]) [data-alt]'), 0, 'no route presented as computed', what='routes')
    c.ok('%' in (c.text(f'{FUEL} [data-proposals] [data-share]') or ''), c.text(f'{FUEL} [data-proposals] [data-share]'), 'its controlled share')
    c.eq(norm(c.text(f'{FUEL} [data-proposals] [data-do=rtake]')), norm(row(c, 'rTakeProposal')), '« Prendre cette proposition »', what='take')
    share = c.js(f"(r => r.children[0].getBoundingClientRect().width / r.getBoundingClientRect().width)(document.querySelector('{FUEL} [data-proposals] [data-alt]'))")
    c.ok(share > 0.8, share, 'on a phone the text of the proposal takes the width of its row, its button under it')
    c.js(f"document.querySelector('{FUEL} [data-rnoroute]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F226_{c.design}_390_{c.lang}_delivered.png')


# (its own name: a second _ROWS_JS here replaced the one of F138 for the whole module — F138 then failed on every run)
_FLIGHT_ROWS_JS = f"""(() => {{ const q = s => document.querySelector('{FUEL} ' + s), r = e => e.getBoundingClientRect(), R = e => {{ const b = r(e);
    return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] }};
  const fl = q('input[data-k="fl"]'), dt = q('input[data-k="wxdate"]'), labs = [...q('.fu-flight').querySelectorAll(':scope > .f-field')],
    heads = labs.map(l => {{ const t = document.createRange(); t.setStart(l, 0); t.setEnd(l, 1); return t.getBoundingClientRect() }}),
    lv = q('[data-lvlauto]'), nt = q('[data-datenote]'), ads = ['dep', 'arr', 'altn'].map(k => q(`input[data-k="${{k}}"]`)),
    names = ['dep', 'arr', 'altn'].map(k => q(`[data-adline="${{k}}"]`)), th = q('[data-themes]');
  return {{ headTops: heads.map(h => Math.round(h.top)), headH: heads.map(h => Math.round(h.height)), fl: R(fl), dt: R(dt),
    auto: R(q('[data-do="levelauto"]')), b30: R(q('[data-do="when30"]')), bnow: R(q('[data-do="whennow"]')),
    note: nt ? [R(nt), nt.textContent.trim(), nt.scrollHeight <= nt.clientHeight + 1] : null, lvl: R(lv),
    ads: ads.map(e => Math.round(r(e).width * 10) / 10), adsBottom: Math.round(Math.max(...names.map(e => r(e).bottom))),
    flightTop: Math.round(r(q('.fu-flight')).top), rowBottom: Math.round(Math.max(r(lv).bottom, nt ? r(nt).bottom : 0)),
    themesTop: Math.round(r(th).top), sw: document.documentElement.scrollWidth, iw: innerWidth }} }})()"""


@case('F243', 'Step Flight, rows aligned (SOG-0393): « Level (FL) » and « Flight date » labels on ONE line at the same top, the two fields from '
      'the same top, « device\'s local time » UNDER the date field, the buttons as high as the fields, « Auto » clear of the date, the three '
      'aerodrome fields of one width, a space between the rows', 'F', tags=('fuel', 'layout'),
      designs=('standard', 'metro', 'swiss', 'cupertino', 'material'), screens=False, langs4=True,
      rule='SOG-0393 (user, 17 Nov, metro on a computer: « arranger les champs décalés »): the date note wrapped under its label and pushed '
      'the field down; « auto · 1:49 » touched « Famille »; the row may fold at 390 px, never shift')
def f243(c):
    hi = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
            d[1]['level'] = {'ft': 27000, 'auto': True}
    note = row(c, 'wxDate').partition(' (')[2].rstrip(')')
    for w in (390, 630, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', hi, 'document']])
        wait_quote(c)
        to_step(c, 0)
        c.until(f"(document.querySelector('{FUEL} [data-lvlauto]')?.textContent || '').includes('auto')", timeout=10000, what='the auto help line')
        m = c.js(_FLIGHT_ROWS_JS)
        c.ok(abs(m['headTops'][0] - m['headTops'][1]) <= 1 and max(m['headH']) < 2 * min(m['headH']), m,
             f'{w} px: the two labels on one line, at the same top')
        c.ok(abs(m['fl'][1] - m['dt'][1]) <= 1, m, f'{w} px: the level field and the date field start at the same top')
        c.ok(m['note'] is not None and norm(m['note'][1]) == norm(note) and m['note'][2] and m['note'][0][1] >= m['dt'][1] + m['dt'][3], m,
             f'{w} px: « {note} » on one line UNDER the date field')
        hs = [m[k][3] for k in ('fl', 'auto', 'dt', 'b30', 'bnow')]
        c.ok(max(hs) - min(hs) <= 1, m, f'{w} px: the buttons of the row as high as its fields')
        c.ok(abs(m['auto'][1] - m['fl'][1]) <= 1, m, f'{w} px: « Auto » in the line of the level field')
        c.ok(m['auto'][0] + m['auto'][2] + 4 <= m['dt'][0], m, f'{w} px: « Auto » clear of the date field')
        c.ok(max(m['ads']) - min(m['ads']) <= 1, m, f'{w} px: departure, arrival and alternate of one width')
        c.ok(m['flightTop'] - m['adsBottom'] >= 6, m, f'{w} px: a space between the aerodromes and the level row')
        c.ok(m['themesTop'] - m['rowBottom'] >= 6, m, f'{w} px: a space between the level row and Family / Series')
        c.le(m['sw'], m['iw'], f'{w} px: no horizontal scroll', what='scrollWidth')
        c.page.evaluate(f"document.querySelector('{FUEL} .fu-ads').scrollIntoView({{block: 'center'}})")
        c.shot(f'F243_{c.design}_{w}_{c.lang}.png')


_PARTS_JS = f"""[...document.querySelectorAll('{FUEL} tr[data-altnpart], {FUEL} tr[data-altnrow]')].map(tr => [tr.dataset.altnpart || 'total:' + tr.dataset.altnrow,
  tr.children[0]?.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() || '', (tr.children[1]?.textContent || '').trim(),
  +(tr.children[3]?.textContent || '').replace(/[^0-9]/g, '') || 0])"""


@case('F246', 'Quote: the alternate fuel counts the GO-AROUND at the destination (flat minutes at the climb flow) and the APPROACH at the '
      'alternate (flat minutes at the holding flow), each said « forfait », around the leg that says its nature; the total is their sum; '
      'the sheet sets the two allowances', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0399 (user: « vérifier que l\'emport supplémentaire couvre bien la remise des gaz, la montée et la croisière, la descente '
      'et l\'approche »; reading of 17/11: the go-around and the approach were never counted — a defect of the quote); the ergonomist, 17/11 '
      'at 9 h 56: 5 and 10 min by default (named constants, Q-0076 pending), settable in the sheet; LFPO → LFST, alternate LFRN, invented positions')
def f246(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    # 1. the default allowances: 5 min of go-around, 10 min of approach, said « forfait »
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=_alt_flight('LFRN'), airfields=True, aero_extra=_ALT_EXTRA)
    wait_quote(c)
    to_step(c, 3)
    c.until(f"!!document.querySelector('{FUEL} tr[data-altnpart=goaround]')", timeout=12000, what='the parts of the alternate')
    rows = c.js(_PARTS_JS)
    c.eq([r[0] for r in rows], ['goaround', 'leg', 'approach', 'total:ok'], 'go-around, leg, approach, then the alternate total', what='rows')
    flat = tx(T, 'altnFlat', L)
    want_ga = tx(T, 'altnGoAround', L).replace('{a}', 'LFST').replace('{m}', '5').replace('{k}', flat)
    want_ap = tx(T, 'altnApproach', L).replace('{id}', 'LFRN').replace('{m}', '10').replace('{k}', flat)
    c.eq(norm(rows[0][1]), norm(want_ga), '« Remise des gaz à LFST : 5 min au débit de montée, forfait »', what='go-around')
    c.eq(norm(rows[2][1]), norm(want_ap), '« Approche à LFRN : 10 min au débit d’attente, forfait »', what='approach')
    c.ok(norm(tx(T, 'altnModel', L)) in norm(rows[1][1]), rows[1][1], 'the leg says its nature: climb, cruise, descent computed')
    ga, leg, ap, tot = (r[3] for r in rows)
    c.ok(ga > 0 and ap > 0 and leg > 0 and abs(tot - (ga + leg + ap)) <= 3, rows, 'the alternate total is the sum of its three parts')
    c.js(f"document.querySelector('{FUEL} tr[data-altnpart=goaround]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F246_{c.design}_390_{L}_default.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})   # the same detail on a computer
    c.js(f"document.querySelector('{FUEL} tr[data-altnpart=goaround]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F246_{c.design}_1280_{L}_default.png')
    # 2. the sheet sets them: 3 min of go-around, 15 min of approach, said « forfait de la fiche »; the approach at the holding flow
    #    (no holding flow in the sheet: 65 % of the cruise flow, the final reserve's) — 15 min × 1 300 kg/h = 325 kg
    hi = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
          'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}, 'alternate': {'goAroundMin': 3, 'approachMin': 15}}
    docs = _alt_flight('LFRN')
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', hi, 'document']], airfields=True, aero_extra=_ALT_EXTRA)
    wait_quote(c)
    to_step(c, 3)
    fs = tx(T, 'altnFlatSheet', L)
    c.until(f"(document.querySelector('{FUEL} tr[data-altnpart=approach]')?.textContent || '').includes(' 15 ')", timeout=12000,
            what='the approach of the sheet')
    rows = c.js(_PARTS_JS)
    c.eq(norm(rows[0][1]), norm(tx(T, 'altnGoAround', L).replace('{a}', 'LFST').replace('{m}', '3').replace('{k}', fs)),
         '« Remise des gaz à LFST : 3 min …, forfait de la fiche »', what='go-around sheet')
    c.eq(norm(rows[2][1]), norm(tx(T, 'altnApproach', L).replace('{id}', 'LFRN').replace('{m}', '15').replace('{k}', fs)),
         '« Approche à LFRN : 15 min …, forfait de la fiche »', what='approach sheet')
    c.ok(abs(rows[2][3] - 325) <= 2, rows[2], 'the approach at the holding flow: 15 min × 1 300 kg/h ≈ 325 kg')
    ga, leg, ap, tot = (r[3] for r in rows)
    c.ok(abs(tot - (ga + leg + ap)) <= 3, rows, 'the total, the sum of the three parts')


# SOG-0391 (b): a FREE route created because no track of the flight's direction is valid at the ocean entry — invented, in the form of
# AeroDB 779cae699: each track set aside for the TIME carries `at`, `entry`, `from`, `to`; `sections.entry` the ocean entry of the route
# taken; the departure the engine took (`depart.time`, never the clock of the page). A westbound flight (EIDW → KJFK).
def _free_time_sections(level=False, fl=None, basis='request', direction='west'):
    win = {'entry': 'DOGAL', 'from': '2026-11-17T11:30:00Z', 'to': '2026-11-17T19:00:00Z'}
    rej = [dict({'track': t, 'code': 'time', 'text': f'route NAT {t} : non valide', 'at': f'2026-11-17T09:1{i}Z'}, **win)
           for i, t in enumerate('ABC')]
    rej += [{'track': t, 'code': 'direction', 'text': 'sens contraire'} for t in 'VW']
    if level:
        rej.append({'track': 'D', 'code': 'level', 'text': 'FL370 non proposé', 'levels': [310, 320]})
    return dict({'source': 'random', 'chosen': None, 'depart': {'time': '2026-11-17T07:57Z', 'basis': 'request'},
                 'entry': {'point': 'DOGAL', 'time': '2026-11-17T09:21Z', 'nm': 612.4, 'speed_kt': 450},
                 'sections': [{'name': 'europe', 'from': 'EIDW', 'to': 'DOGAL', 'nm': 612.4, 'proof': 'computed'},
                              {'name': 'free', 'from': 'DOGAL', 'to': '54/50', 'nm': 1510.0, 'proof': 'created'},
                              {'name': 'amérique', 'from': '54/50', 'to': 'KJFK', 'nm': 905.6, 'proof': 'computed'}],
                 'rejected': rej}, **({'fl': fl, 'fl_basis': basis} if fl else {}), **({'direction': direction} if direction else {}))


def _zt(lang, hh, mm, bare=False):
    """An hour as the screen says it: « 09 h 21 Z » in French, « 09:21Z » otherwise."""
    return (f'{hh} h {mm}' if lang == 'fr' else f'{hh}:{mm}') + ('' if bare else ' Z' if lang == 'fr' else 'Z')


@case('F244', 'Route step, a FREE route created because no NAT track of the flight\'s direction suits: one line at the head, without a fold, '
      'says why from the FIELDS of the answer — the time (« Route libre : aucune route NAT valable à l\'entrée de l\'océan vers 09 h 21 Z '
      '(routes vers l\'ouest : 11 h 30 – 19 h 00 Z) »), the level, or both with their number; a flight without time ends it with « Départ '
      'pris à 07 h 57 Z (maintenant). », the hour of the REQUEST kept with the answer; under « Calculé à … », above « Niveau non donné »; '
      'kept on reload; no line for a route through a track of the day', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0391 (b) (the user, 17 Nov: « surpris par le trajet, à cheval entre NAT echo et NAT romeo »: the free route followed the rule, '
      'nothing said it without opening a fold); the ergonomist, 17/11 at 9 h 08: the place, one line per computation from the head route, '
      'the departure taken « (maintenant) » for a flight without time; AeroDB 779cae699: at, entry, from, to, sections.entry; a fake launcher')
def f244(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    t = lambda k: tx(T, k, L)
    west = tx(T, 'west', L, after='rFreeDir:')
    win = f'{_zt(L, "11", "30", True)} – {_zt(L, "19", "00")}'
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _free_time_sections(fl=180, basis='default')}
    # 1. a flight without time nor level: the cause is the time; the departure taken « now »; the line « Niveau non donné » stays, below
    docs = _ocean_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['level'] = {'ft': None}
            d[1].pop('planned_at', None)
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    to_step(c, 1)
    _compute_now(c, st)
    F = f'{FUEL} [data-routealts] [data-rfree]'
    c.until(f"!!document.querySelector('{F}')", timeout=15000, what='the line « Route libre … » at the head')
    want = (t('rFreeTime').replace('{at}', _zt(L, '09', '21')).replace('{dw}', ' (' + t('rFreeWin').replace('{dir}', west).replace('{win}', win) + ')')
            + '. ' + t('rFreeNow').replace('{t}', _zt(L, '07', '57')))
    c.eq(norm(c.text(f'{F} > span') or ''), norm(want), 'the time said from the fields, the departure taken « now »', what='time')
    if L == 'fr':   # an hour never cut at the end of a line (the capture at 390 px cut « 11 h / 30 »)
        raw = c.text(f'{F} > span') or ''
        c.ok(all(x in raw for x in ('09\u00a0h\u00a021\u00a0Z', '11\u00a0h\u00a030', '19\u00a0h\u00a000\u00a0Z')), raw,
             'each hour held together by no-break spaces')
    c.eq(c.js(f"document.querySelector('{F}').dataset.cause"), 'time', 'the cause: the time', what='cause')
    c.eq(c.count(f'{F} button'), 0, 'no button on the line (Q-0072: only for the level)', what='button')
    order = c.js(f"[...document.querySelector('{FUEL} [data-routealts]').children].map(e => e.hasAttribute('data-rage') ? 'age' : "
                 f"e.hasAttribute('data-rfree') ? 'free' : e.hasAttribute('data-rnolevel') ? 'nolevel' : '').filter(Boolean)")
    c.eq(order[:3], ['age', 'free', 'nolevel'], 'under « Calculé à … », above « Niveau non donné »', what='place')
    c.js(f"document.querySelector('{F}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F244_{c.design}_390_{L}_time.png')
    # kept: read again from the device, the same words — the hour of the request kept with the answer, never the clock of the drawing
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{F}')", timeout=15000, what='the line, after a reload')
    c.eq(norm(c.text(f'{F} > span') or ''), norm(want), 'the same line after a reload', what='reload')
    # 2. a flight WITH its time and level: the time AND the level, with their number; no departure said; the engine says no direction:
    # nothing guessed (« routes NAT »)
    docs = _ocean_docs()
    when = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).strftime('%Y-%m-%dT06:00:00Z')
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = when
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _free_time_sections(level=True, fl=370, direction=None)}
    c.open('fuel', docs=docs)
    to_step(c, 1)
    _compute_now(c, st)
    c.until(f"document.querySelector('{F}')?.dataset.cause === 'both'", timeout=15000, what='the line with both causes')
    tp = f" ({t('rFreeAt').replace('{at}', _zt(L, '09', '21'))}, {t('rFreeValid').replace('{win}', win)})"
    want = (t('rFreeBoth').replace('{dir}', tx(T, 'none', L, after='rFreeDir:')).replace('{nt}', '3').replace('{tp}', tp).replace('{nl}', '1').replace('{fl}', '370'))
    c.eq(norm(c.text(f'{F} > span') or ''), norm(want), 'the time and the level with their number; the departure not said (the flight has its time)',
         what='both')
    c.js(f"document.querySelector('{F}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F244_{c.design}_390_{L}_both.png')
    # 3. the head route through a track of the day: no line (the fold of a variant keeps the rest)
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _OCEAN_SECTIONS}
    _compute_now(c, st)
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt=\"0\"] [data-proof]')", timeout=15000, what='the proof of the track')
    c.eq(c.count(F), 0, 'a route through a track of the day: no line', what='published')
    # the engine read: the fields of the time bounded, a foreign offset refused, the departure not said when the engine took no time
    got = c.js("""() => import('/modules/fuel/route_engine.js').then(m => {
      const alt = { name: 'x', route: 'EIDW DCT KJFK', distanceNm: 3000, fl: 370, segments: [{ from: 'EIDW', to: 'KJFK' }] },
        sec = { depart: { time: null, basis: 'none' }, sections: [{ name: 'free', from: 'DOGAL', to: '54/50', nm: 1, proof: 'created' }],
          rejected: [{ track: 'A', code: 'time', text: 'x', at: '2026-11-17T09:10+02:00', entry: '<b>', from: 'hier', to: '2026-11-17T19:00:00.000Z' }] },
        n = m.normalize({ ok: true, alternatives: [alt], issues: [], sections: sec }, 'compute', { date: '2026-11-17T07:57', now: true });
      const r = n.plans[0].proof.rejected[0];
      return { at: r.at, entry: r.entry, from: r.from, to: r.to, depart: n.depart, cause: n.plans[0].proof.cause.time };
    })""")
    c.eq(got, {'at': '', 'entry': '', 'from': '', 'to': '2026-11-17T19:00Z', 'depart': None, 'cause': 1},
         'the fields read as untrusted input; no departure said when the engine took none', what='engine read')


@case('F245', 'Route step, a FREE route created with the LEVEL in cause: the line at the head carries « Recalculer à FLxxx » if and only if a '
      'track set aside for the level passes its entry within its window (or has no such fields), the nearest level among THEIR `levels`; a '
      'tap sets the level of the flight and computes again, nothing else; refused when every such track passes outside its window',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0391 (b bis), Q-0072 answered by the user (choice 0); the rule of the ergonomist, 17/11 at 9 h 23 (track Z, set aside for '
      'the level, passed outside its window: no button); AeroDB adds at / entry / from / to to the code level; a fake launcher, invented levels')
def f245(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    st = _route_launcher(c, ['route/compute'])
    win = {'entry': 'DOGAL', 'from': '2026-11-17T11:30:00Z', 'to': '2026-11-17T19:00:00Z'}
    out_ = dict(win, at='2026-11-17T09:10Z')     # its entry passed before its window opens
    in_ = dict(win, at='2026-11-17T12:10Z')      # within its window

    def level_only(*rows):
        sec = _free_time_sections(fl=350)
        sec['rejected'] = [r for r in sec['rejected'] if r['code'] == 'direction'] + list(rows)
        return sec
    # 1. button expected: D (FL360, outside its window) is left out of the choice; E has no time fields (validity not checked)
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': level_only(
        dict({'track': 'D', 'code': 'level', 'text': 'FL350 non proposé', 'levels': [360]}, **out_),
        {'track': 'E', 'code': 'level', 'text': 'FL350 non proposé', 'levels': [330, 340, 'x', 99999]})}
    docs = _ocean_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['level'] = {'ft': 35000}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    to_step(c, 1)
    _compute_now(c, st)
    F = f'{FUEL} [data-routealts] [data-rfree]'
    c.until(f"document.querySelector('{F}')?.dataset.cause === 'level'", timeout=15000, what='the line, the level in cause')
    B = f'{F} [data-do="rgofl"]'
    c.eq(c.js(f"document.querySelector('{B}')?.dataset.fl"), '340',
         'FL340, the nearest among the tracks that can be taken (FL360 of D, outside its window, left out — it would win the tie)', what='nearest')
    c.eq(norm(c.text(B) or ''), norm(tx(T, 'rFreeRecalc', L).replace('{fl}', '340')), '« Recalculer à FL340 »', what='label')
    c.js(f"document.querySelector('{F}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F245_{c.design}_390_{L}_level.png')
    # the tap: the level of the flight set, then a new computation at that level
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': _OCEAN_SECTIONS}
    n0 = len(st['posts'])
    c.tap(B)
    cf_doc(c, lambda d: (d.get('level') or {}).get('ft') == 34000, 'the level of the flight set to FL340')
    for _ in range(75):
        if any((p.get('args') or {}).get('action') == 'compute' for p in st['posts'][n0:]):
            break
        c.wait(200)
    sent = [p['args'] for p in st['posts'][n0:] if (p.get('args') or {}).get('action') == 'compute']
    c.ok(sent and all(p.get('fl') == 340 for p in sent), [p.get('fl') for p in sent], 'computed again at FL340')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-k=\"fl\"]').value"), '340', 'the Level field says 340', what='field')
    # 2. button refused: every track set aside for the level passes outside its window
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': level_only(
        dict({'track': 'Z', 'code': 'level', 'text': 'FL340 non proposé', 'levels': [320, 360]}, **out_))}
    _compute_now(c, st)
    c.until(f"document.querySelector('{F}')?.dataset.cause === 'level'", timeout=15000, what='the line, the level in cause again')
    c.eq(c.count(B), 0, 'the only track of the level passes outside its window: no « Recalculer »', what='refused')
    # 3. the time AND the level in cause: the button still, from the track of the level within its window
    sec = _free_time_sections(fl=370)
    sec['rejected'].append(dict({'track': 'D', 'code': 'level', 'text': 'FL370 non proposé', 'levels': [310, 320]}, **in_))
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': sec}
    _compute_now(c, st)
    c.until(f"document.querySelector('{F}')?.dataset.cause === 'both'", timeout=15000, what='the line, time and level in cause')
    c.eq(c.js(f"document.querySelector('{B}')?.dataset.fl"), '320', 'the time in cause too: « Recalculer à FL320 » all the same', what='both')


@case('F248', 'Route step, an itinerary TAKEN while the variants are being searched: the search is stopped (its job cancelled) and NO new '
      'computation is asked; the route taken stays', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0400 (cause proved by V3 Frame, 17 Nov: a choice made during the search of the variants relaunched a computation — '
      'altsMoreCheck saw the input changed by the take and asked « compute » again); a fake launcher whose second request is slow')
def f248(c):
    st = _route_launcher(c, ['route/compute'])
    st['delay_alt'] = 6.0
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    comps = lambda: [p['args'] for p in st['posts'] if (p.get('args') or {}).get('action') == 'compute']
    c.tap(f'{FUEL} [data-do="rcompute"]')
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt]') && !!document.querySelector('{FUEL} [data-rmore=busy]')", timeout=8000,
            what='the head route, « Variantes en recherche… »')
    n = len(comps())
    c.eq(n, 2, 'two requests: the head route, then the variants', what='before the take')
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    c.until(f"!!document.querySelector('{FUEL} [data-rtaken]')", timeout=5000, what='the route taken')
    c.wait(2500)   # the write of the flight (300 ms) and its check have run
    c.eq(len(comps()), n, 'no new computation after the take', what='after the take')
    c.ok(len(st.get('cancels') or []) >= 1, st.get('cancels'), 'the search of the variants is cancelled')
    c.ok('NEPIX' in (c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value") or ''), c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value"),
         'the route taken stays in the field')



@case('F249', 'Quote at the opening, the aircraft register held back by the network: the result leaves « Chargement des aéronefs et des '
      'fiches… » after 3 s (not 8) and is drawn with what exists; the times of the opening (mount, flight read, choice applied, result drawn) '
      'are written in the device document; the register arriving later is read and said', 'F', tags=('fuel',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0400, the part of Fuel (measured by V3 Frame: the result said « Chargement des aéronefs et fiches… » for 8.3 s when the '
      'register did not answer); the ergonomist, 17/11: the wait brought to 3 s, the quote drawn without it, the markers as routeTiming')
def f249(c):
    held = []
    c.context.route(re.compile(r'/frame/aerodb/registry\.js'), lambda route: held.append(route))   # never answered until released
    t0 = time.time()
    c.open('fuel', docs=flight_docs(), wait=False)
    c.page.wait_for_function("() => !!document.querySelector('[data-module=fuel] [data-block=result]')", timeout=20000)
    c.until(f"(() => {{ const r = document.querySelector('{FUEL} [data-block=result]'); return !!r && !r.hasAttribute('data-loading') }})()",
            timeout=15000, what='the result out of its waiting line')
    waited = time.time() - t0
    c.ok(held, len(held), 'the register is indeed held back (its script asked, not answered)')
    c.ok(waited < 6.5, round(waited, 1), 'the result drawn after about 3 s, not 8 (the register wait is 3 s)')
    d = c.until_doc('cache/fuel/mount_timing.json', lambda d: bool(d) and (d.get('ms') or {}).get('result') is not None,
                    'the times of the opening written')
    ms = d['ms']
    c.eq(d.get('registry'), 'late', 'the register said late', what='registry')
    c.ok(all(isinstance(ms.get(k), int) for k in ('mount', 'flight', 'choice', 'result')) and ms['mount'] <= ms['result']
         and 2800 <= ms['choice'] < 6500, ms, 'mount, flight read, choice applied (after the 3 s wait), result drawn')
    # the register released: read, said in the document
    for r in held:
        try:
            r.continue_()
        except Exception:
            pass
    c.until_doc('cache/fuel/mount_timing.json', lambda d: bool(d) and d.get('registry') == 'arrived' and (d.get('ms') or {}).get('registry'),
                'the register arrived later, read and said')


# SOG-0402: the ICAO flight plan expected, character by character (Doc 4444, appendix 2) — two invented flights: a European one with a
# SID and a level change, an Atlantic one through a NAT track and coordinates « 54/50 »
_FPL_EU = ('(FPL-CHECK01-IG\n-C30J/M-SDGRWY/S\n-LFPO0930\n-N0330F270 OPAL2E OPALE UN491 NEPIX DCT LUGEN/N0330F250 DCT TOU\n'
           '-LFML0115 LFMT\n-PBN/B2D2 DOF/261118 REG/FZZAB)')
_FPL_NAT = ('(FPL-ABC123-IG\n-B744/H-SDGRWY/S\n-EIDW2355\n-N0480F350 DOGAL NATE 54N050W DCT NICSO N71B ZZEND\n'
            '-KJFK0712\n-PBN/B2D2 DOF/261231 REG/EIZZC)')


@case('F247', 'Route step, « Copier pour Eurocontrol »: the ICAO flight plan of the flight (Doc 4444, appendix 2) — a neutral identification '
      'that can be changed, item 15 converted (no aerodromes, DCT between two points off an airway, « 54/50 » as « 54N050W », a speed-level '
      'group at the head and at each level change), the assumed equipment and what is not checked said in a fold; the form rules checked '
      'before copying', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0402 (user, 17 Nov: « tu pourrait génerer un copy paste vers eurocontrol, au bon format »); the ergonomist\'s version 2: IG, '
      'the flight\'s time else now rounded up to five minutes, neutral identification, the shortest equipment that passes (no data link, '
      'no invented address), never an invented SID or STAR, NAT and North American routes said unchecked; invented flights')
def f247(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    # 1. the writer, character by character
    c.open('fuel', docs=flight_docs())
    wait_quote(c)
    got = c.js("""() => import('/modules/fuel/fpl.js').then(F => [
      F.message({ type: 'C30J', wake: 'M', dep: 'LFPO', arr: 'LFML', altn: 'LFMT', reg: 'F-ZZAB', eobt: F.eobtOf('2026-11-18T09:30:00Z'),
        speedKt: 330, levelFt: 27000, routeText: 'LFPO OPAL2E OPALE UN491 NEPIX LUGEN/F250 TOU LFML', eetMin: 75 }).text,
      F.message({ id: 'abc123', type: 'B744', wake: 'H', dep: 'EIDW', arr: 'KJFK', reg: 'EI-ZZC', eobt: F.eobtOf('2026-12-31T23:55:00Z'),
        speedKt: 480, levelFt: 35000, routeText: 'EIDW DOGAL NATE 54/50 DCT NICSO N71B-N90B ZZEND KJFK', eetMin: 432 }).text,
      F.message({ type: 'C30J', wake: 'M', dep: 'LFPO', arr: 'LFML', reg: 'F-ZZAB', eobt: F.eobtOf('2026-11-18T09:30:00Z'), speedKt: 330,
        levelFt: 27000, routeText: 'LFPO LFML', eetMin: 75 }).errors,
      F.eobtOf(null, Date.parse('2026-11-17T10:51:10Z')).at.toISOString(),
      F.item15('EIDW DOGAL 54/20 55/30 KJFK', { dep: 'EIDW', arr: 'KJFK', speedKt: 470, levelFt: 37000 }).oceanic ])""")
    c.eq(got[0], _FPL_EU, 'a European flight: SID kept, DCT between points, the level change with its speed-level group', what='EU')
    c.eq(got[1], _FPL_NAT, 'an Atlantic flight: the NAT track, « 54/50 » as « 54N050W », the compound airway by its first designator (SOG-0422), the registration in item 18, the identification in capitals', what='NAT')
    # SOG-0529 (2), CHANGED EXPECTATION (the IFPS: « EFPM214: MISSING ROUTE DATA »): a route of the two aerodromes only is a direct, its
    # item 15 « DCT » — no longer refused as « route vide » (F288 proves the DCT, the fold's words and the copy)
    c.eq(got[2], [], 'a route of the two aerodromes only: a direct, item 15 « DCT », no longer refused (SOG-0529 (2))', what='empty route')
    c.eq(got[3], '2026-11-17T10:55:00.000Z', 'no time in the flight: now, rounded up to the next five minutes', what='now')
    c.eq(got[4], True, 'North Atlantic coordinates: said unchecked by Eurocontrol', what='oceanic')
    # 2. the screen: the button, the fold, the identification that can be changed
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = '2026-11-18T09:30:00Z'
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    c.eq(norm(c.text(f'{FUEL} [data-fpl] [data-do=fplcopy]') or ''), norm(tx(T, 'fplCopy', L)), '« Copier pour Eurocontrol »', what='button')
    c.js(f"document.querySelector('{FUEL} details[data-fplfold]').open = true")
    text = c.js(f"document.querySelector('{FUEL} [data-fpltext]').textContent")
    lines = text.split('\n')
    c.eq(lines[0], '(FPL-CHECK01-IG', 'the neutral identification by default, IG', what='item 7-8')
    c.ok(re.fullmatch(r'-C30J/[LMH]-SDGRWY/S', lines[1] or '') is not None, lines[1], 'the type, its wake category, the assumed equipment')
    c.eq(lines[2], '-LFRS0930', 'the departure at the flight\'s time', what='item 13')
    c.ok(re.fullmatch(r'-N0\d{3}F270 LUGEN DCT NEPIX', lines[3] or '') is not None, lines[3], 'item 15: no aerodromes, DCT between the two points')
    c.ok(re.fullmatch(r'-LFML\d{4} LFMT', lines[4] or '') is not None, lines[4], 'the arrival, the estimated time, the alternate')
    c.eq(lines[5], '-PBN/B2D2 DOF/261118 REG/FRAJA)', 'the PBN mention, the date of flight, the registration of the sheet', what='item 18')
    notes = norm(c.text(f'{FUEL} [data-fplnotes]') or '')
    for k in ('fplEquip', 'fplNoSid', 'fplNoStar'):
        c.ok(norm(tx(T, k, L)).split('{')[0].strip() in notes, notes, f'the fold says {k}')
    c.page.fill(f'{FUEL} input[data-k="fplid"]', 'f-raja')
    c.until(f"document.querySelector('{FUEL} [data-fpltext]').textContent.startsWith('(FPL-FRAJA-IG')", timeout=5000, what='the identification changed')
    c.js(f"document.querySelector('{FUEL} [data-fpl]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F247_{c.design}_390_{L}.png')
    c.tap(f'{FUEL} [data-do=fplcopy]')
    c.until(f"(window.__notes || []).some(x => x.includes({json.dumps(norm(tx(T, 'fplCopied', L))[:11])}))", timeout=5000,
            what='« Plan de vol copié »')


@case('F256', 'Route step, « Copier pour Eurocontrol »: item 15 never carries a hyphen (a segment the data name after two airways joined by '
      'a hyphen, « N12C-N34D », the same track, is written by its first designator and the choice said: the hyphen would open a new item '
      'of the message), never writes a speed-level group identical to the one in force, never « DCT » before a STAR at the end of the route '
      '(« ZZSTA3 », a STAR without a route letter); an element not in ICAO form is never copied: the button says which; the registration '
      'required in item 18 (REG/), neutral and said when the sheet has none; an oceanic route without HF in the equipment said by the ONE '
      'notification of the copy', 'F', tags=('fuel',),
      designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0422 (the user pasted the plan of a crossing to Eurocontrol: refused, five syntax errors from column 140 of the route, '
      'one cause: two North American airways joined by a hyphen); the second paste: REG required (EUIFPS002A), HF in oceanic airspace '
      '(EUROEGGX1A), never invented; AeroDB: the joined name comes from the AIXM source, both designators the same track; invented routes, '
      'never the user\'s flight')
def f256(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    c.open('fuel', docs=flight_docs())
    wait_quote(c)
    got = c.js("""() => import('/modules/fuel/fpl.js').then(F => {
      const ok = F.message({ type: 'B744', wake: 'H', dep: 'EIDW', arr: 'KJFK', reg: 'EI-ZZD', eobt: F.eobtOf('2026-12-31T23:55:00Z'),
          speedKt: 480, levelFt: 35000, routeText: 'EIDW ZZONE/F350 ZZTWO NATE 54/50 DCT ZZNIC N12C-N34D ZZALX DCT ZZARV ZZSTA3 KJFK',
          eetMin: 432 }),
        bad = F.message({ type: 'B744', wake: 'H', dep: 'EIDW', arr: 'KJFK', reg: 'EI-ZZD', eobt: F.eobtOf('2026-12-31T23:55:00Z'),
          speedKt: 480, levelFt: 35000, routeText: 'EIDW ZZONE ZZ-AB ZZTWO KJFK', eetMin: 432 }),
        noreg = F.message({ type: 'B744', wake: 'H', dep: 'EIDW', arr: 'KJFK', eobt: F.eobtOf('2026-12-31T23:55:00Z'), speedKt: 480,
          levelFt: 35000, routeText: 'EIDW ZZONE ZZTWO KJFK', eetMin: 432 });
      return [ok.text.split('\\n')[3], ok.errors, ok.notes.star, ok.notes.oceanic, bad.errors, bad.notes.bad, ok.notes.joined,
        ok.notes.hf, ok.text.split('\\n')[5], [noreg.errors, noreg.notes.regNeutral, noreg.text.split('\\n')[5]]];
    })""")
    c.eq(got[0], '-N0480F350 ZZONE DCT ZZTWO NATE 54N050W DCT ZZNIC N12C ZZALX DCT ZZARV ZZSTA3',
         'item 15: the joined airways by the first designator, no group repeated at ZZONE, the STAR after its point without DCT', what='item 15')
    c.ok('-' not in (got[0] or '')[1:], got[0], 'no hyphen in the route line')
    c.eq(got[1], [], 'the message passes its form rules', what='errors')
    c.eq(got[2], True, 'the STAR without a route letter at the end is known as a STAR (the fold does not say « no STAR »)', what='star')
    c.eq(got[3], True, 'the joined North American airways still said unchecked by Eurocontrol', what='oceanic')
    c.ok('routeword' in (got[4] or []), got[4], 'an element with a hyphen: the message refuses it')
    c.eq(got[5], ['ZZ-AB'], 'the element not in ICAO form named', what='bad')
    c.eq(got[6], ['N12C-N34D'], 'the joined name kept to be said', what='joined')
    c.eq(got[7], True, 'an oceanic route, no H in the assumed equipment: said', what='hf')
    c.eq(got[8], '-PBN/B2D2 DOF/261231 REG/EIZZD)', 'the registration in item 18, letters and digits only', what='REG')
    c.eq(got[9], [[], True, '-PBN/B2D2 DOF/261231 REG/CHECK01)'], 'no registration: a neutral one, said; the copy not blocked',
         what='no REG')
    # the screen: a route text with an element not in ICAO form; the button says it instead of copying
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = '2026-11-18T09:30:00Z'
            d[1]['route']['text'] = 'LFRS LUGEN ZZ-AB NEPIX LFML'
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    # the message fails: the button carries aria-disabled (Playwright will not tap it) but still answers a press, saying why
    c.eq(c.js(f"document.querySelector('{FUEL} [data-do=fplcopy]').getAttribute('aria-disabled')"), 'true', 'the button said unavailable',
         what='aria-disabled')
    c.js(f"document.querySelector('{FUEL} [data-do=fplcopy]').click()")
    want = norm(tx(T, 'routeword', L)).split('{')[0].strip()
    c.until(f"(window.__notes || []).some(x => x.replace(/\\s+/g, ' ').includes({json.dumps(want)}))", timeout=5000, what='the button says the element')
    bad = norm(c.text(f'{FUEL} [data-fplbad]') or '')
    c.ok(want in bad and 'ZZ-AB' in bad, bad, 'the fold says the element not in ICAO form, named')
    c.ok(not any(norm(tx(T, 'fplCopied', L))[:11] in norm(x) for x in (c.js('window.__notes || []') or [])), 'copied', 'nothing copied')
    c.js(f"document.querySelector('{FUEL} [data-fpl]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F256_{c.design}_390_{L}.png')
    # an oceanic route: copied, the missing HF said; the fold names the joined airways
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = '2026-11-18T09:30:00Z'
            d[1]['route']['text'] = 'LFRS LUGEN 54/20 ZZNIC N12C-N34D ZZALX NEPIX LFML'
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    c.tap(f'{FUEL} [data-do=fplcopy]')
    once = norm(tx(T, 'fplCopiedHf', L))
    c.until(f"(window.__notes || []).some(x => x.replace(/\\s+/g, ' ').includes({json.dumps(once[:40])}))", timeout=5000,
            what='the copy says the missing HF itself')
    seen = [norm(x) for x in (c.js('window.__notes || []') or [])]
    c.ok(norm(tx(T, 'fplCopied', L)) not in seen and not any(norm(tx(T, 'fplNoHf', L))[:24] in x for x in seen), seen,
         'ONE notification: no plain « copied », no second HF note waiting behind it')
    hf = norm(tx(T, 'fplNoHf', L))[:24]
    notes = norm(c.text(f'{FUEL} [data-fplnotes]') or '')
    c.ok(norm(tx(T, 'fplJoined', L)).split('(')[0].strip() in notes and 'N12C-N34D' in notes, notes, 'the fold says the joined airways')
    c.ok(hf in notes, notes, 'the fold says the missing HF')
    c.js(f"document.querySelector('{FUEL} [data-fpl]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F256_{c.design}_390_{L}_ocean.png')


# SOG-0398 lot 1: an invented alternate (XQAL, ~70 NM west of the seeded arrival), its record, its procedures' coverage, its TAF
_ALT_ID = 'XQAL'


def _altn_taf(cat, now):
    """An invented TAF of XQAL (aviationweather's JSON) valid from an hour ago for a day, one base group of the given category."""
    vis = {'VFR': '6+', 'IFR': '2', 'LIFR': '0.5'}[cat]
    cl = {'VFR': [{'cover': 'FEW', 'base': 4000}], 'IFR': [{'cover': 'OVC', 'base': 800}], 'LIFR': [{'cover': 'OVC', 'base': 200}]}[cat]
    lo, hi = now - 3600, now + 30 * 3600
    return {'icaoId': _ALT_ID, 'validTimeFrom': lo, 'validTimeTo': hi, 'rawTAF': f'TAF {_ALT_ID} TEST',
            'fcsts': [{'timeFrom': lo, 'timeTo': hi, 'fcstChange': None, 'wdir': 270, 'wspd': 8, 'visib': vis, 'clouds': cl}]}


def _altn_open(c, hard_m, app, cat, min_ft=5000, more_ads=(), held=True, typed=False, wx_down=False):
    """The seeded flight with XQAL as alternate, a C30J sheet (minimum runway `min_ft`, none if None), XQAL's hard runway `hard_m` (m),
    `app` instrument approaches held in proc/manual/ beside one SID and one STAR (an index entry without any procedure is not « held »:
    aerodb's coverage table), its TAF of category `cat` kept fresh in the weather store (the test server has no
    launcher: the store asks a TAF of avwx.rest only with a key; a kept one is read first, cache/weather/taf/); the weather read by the gesture.
    `more_ads`: more invented aerodromes of the base (SOG-0528: a far arrival); `held=False`: XQAL out of the procedures index (its
    procedures not held by the base, SOG-0527); `typed=True`: the flight opened WITHOUT its aerodromes, typed after the opening, and
    no gesture « Lire la météo » (SOG-0527 (2): the page reads what it lacks by itself); `wx_down=True`: the METAR sources do not
    answer (aborted), the read fails."""
    import time as _t
    now = int(_t.time())
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'lb', 'usableFuel': 40000,
             'cruise': {'tasKt': 330, 'fuelFlowPerHour': 7300}, 'runwayType': 'HARD'}
    if min_ft is not None:
        sheet['minRunwayLengthFt'] = min_ft
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
            d[1]['route']['altn'] = _ALT_ID
            d[1]['planned_at'] = _t.strftime('%Y-%m-%dT%H:00:00Z', _t.gmtime(now + 2 * 3600))
    docs += [['aircraft/sheets/C30J.json', sheet, 'document']]
    if held:
        docs += [['proc/manual/index.json', {'schema': 1, 'aerodromes': {_ALT_ID: {'SID': 1, 'STAR': 1, 'APP': app, 'cycle': '2026-10-01',
                                                                                   'updated_at': '2026-11-01T09:00:00Z'}}}, 'reference']]
    if not wx_down:  # a source that answers nothing: no TAF kept either (SOG-0527 (2), F290)
        docs.append([f'cache/weather/taf/{_ALT_ID}.json', {'at': 4102444800000, 'source': 'launcher', 'data': _altn_taf(cat, now)}, 'cache'])
    if typed:
        for d in docs:
            if d[0].endswith('current_flight.json'):
                for k in ('dep', 'arr', 'altn'):
                    d[1]['route'].pop(k, None)
    if wx_down:
        import re as _re
        c.context.route(_re.compile(r'aviationweather\.gov|metar\.vatsim\.net|avwx\.rest', _re.I), lambda r: r.abort())
    else:
        route_metar(c, {'LFRS': (270, 10), 'LFML': (300, 12), _ALT_ID: (270, 8)})
    c.open('fuel', docs=docs, airfields=True, aero_extra={'aerodromes': [{'icao': _ALT_ID, 'name': 'XQAL TEST', 'lat': 43.45, 'lon': 3.62,
                                                                           'elev': 50, 'hardLen': hard_m}, *more_ads]})
    if typed:
        to_step(c, 0)
        for k, v in (('dep', 'LFRS'), ('arr', 'LFML'), ('altn', _ALT_ID)):
            c.page.fill(f'{FUEL} input[data-k="{k}"]', v)
            c.page.locator(f'{FUEL} input[data-k="{k}"]').dispatch_event('change')
        return
    wait_quote(c)
    to_step(c, 0)
    c.js(f"document.querySelector('{FUEL} [data-do=wx]').click()")


@case('F257', 'Flight step, under the aerodromes: the line of the alternate — a sign, a sentence (the worst criterion, the good and the '
      'unchecked counted), the three criteria in a fold: RUNWAY (the sheet\'s minimum runway length against the longest runway of the right '
      'surface), AIDS (« visual only » when the base holds the aerodrome\'s procedures without an approach; not held: not checked), WEATHER '
      '(the worst category of the TAF an hour before and after the arrival at the alternate, an INDICATOR); four states: green, orange, red, '
      'grey « not checked » with what is missing — never a green check on what could not be checked', 'F', tags=('fuel', 'weather'),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0398 lot 1 (the user, 17/11: « vérifier les critères … une check verte si c\'est ok, un warn …, une croix rouge »; the '
      'ergonomist\'s specification version 2; Q-0075: green VFR or MVFR, orange IFR or no instrument approach, red LIFR, grey no TAF; Q-0086: '
      '« le terrain de dégagement d\'abord »); invented aerodrome, sheet and TAF')
def f257(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    # 1. the criteria, computed (modules/fuel/altn_check.js)
    c.open('fuel', docs=flight_docs())
    got = c.js("""() => import('/modules/fuel/altn_check.js').then(A => {
      const taf = (fc, from = 0, to = 86400) => ({ validTimeFrom: from, validTimeTo: to, fcsts: fc }),
        g = (from, to, vis, base, change = null) => ({ timeFrom: from, timeTo: to, fcstChange: change, visib: vis, clouds: base == null ? [] :
          [{ cover: 'BKN', base }] });
      return [
        A.runwayOf({ hardLen: 2500 }, 5000, 'HARD').state, A.runwayOf({ hardLen: 1000 }, 5000, 'HARD').code,
        A.runwayOf({ hardLen: 0 }, 5000, 'HARD').code, A.runwayOf({ hardLen: 2500 }, null, 'HARD').code, A.runwayOf({}, 5000, 'HARD').code,
        A.runwayOf({ hardLen: 2500 }, 5000, 'WATER').state, A.runwayOf(null, 5000).code,
        A.aidsOf({ level: 'green', counts: { APP: 3 } }).state, A.aidsOf({ level: 'green', counts: { APP: 0 } }).code,
        A.aidsOf({ level: 'orange', reason: 'sia' }).code, A.aidsOf({ level: 'orange', partial: { pages: 2 }, counts: { APP: 0 } }).code,
        A.weatherOf(taf([g(0, 86400, '6+', 4000)]), 36000).v.c,
        A.weatherOf(taf([g(0, 86400, '6+', 4000), g(39000, 43200, '2', 800, 'TEMPO')]), 36000).v.c,
        A.weatherOf(taf([g(0, 86400, '6+', 4000), g(41000, 43200, '0.5', 200, 'TEMPO')]), 36000).v.c,
        A.weatherOf(taf([g(0, 86400, '0.5', 200)]), 36000).state, A.weatherOf(taf([g(0, 3600, '6+', 4000)], 0, 3600), 36000).code,
        A.weatherOf(null, 36000).code, A.weatherOf(null, 36000, { noTaf: true }).code, A.weatherOf(null, 36000, { read: false }).code,
        A.weatherOf(taf([]), null).code,
        A.judge([{ state: 'ok' }, { state: 'grey' }, { state: 'ok' }]), A.judge([{ state: 'grey' }, { state: 'warn' }]).state,
        A.judge([{ state: 'err' }, { state: 'warn' }]).state ];
    })""")
    c.eq(got[:7], ['ok', 'rwyShort', 'rwyNoHard', 'rwyNoSheet', 'rwyNoData', 'grey', 'rwyNoAd'],
         'runway: long enough, short, no hard runway, no minimum in the sheet, no length in the base, a surface not read, no aerodrome',
         what='runway')
    c.eq(got[7:11], ['ok', 'aidsVisual', 'aidsNoBase', 'aidsPartial'],
         'aids: approaches held, none held (visual only), procedures not held, partly read without approach', what='aids')
    c.eq(got[11:14], ['VFR', 'IFR', 'VFR'], 'weather: the worst group within an hour around the arrival, a TEMPO beyond the hour left out',
         what='window')
    c.eq(got[14:20], ['err', 'wxOutside', 'wxNoTaf', 'wxNoKey', 'wxNotRead', 'wxNoTime'],
         'weather: LIFR red; outside the TAF, no TAF, no TAF on this device, not read, no time: not checked', what='weather')
    c.eq(got[20], {'state': 'grey', 'ok': 2, 'grey': 1}, 'one criterion not checked: never green, counted apart', what='judge')
    c.eq(got[21:], ['warn', 'err'], 'the worst state gives the sign', what='worst')
    # 2. the screen: the four states, at 390 and 1280
    head = lambda k, w=None: norm(tx(T, k, L, after='altnChk: {')).replace('{id}', _ALT_ID).replace('{w}', w or '')
    K = lambda k: norm(tx(T, k, L, after='altnK: {'))
    states = [('ok', 2500, 2, 'VFR', 5000, head('ok')), ('warn', 2500, 0, 'VFR', 5000, head('warn', K('aids'))),
              ('err', 1000, 2, 'VFR', 5000, head('err', K('rwy'))), ('grey', 2500, 2, 'VFR', None, head('grey', K('rwy')))]
    for state, hard, app, cat, min_ft, want in states:
        c.page.set_viewport_size({'width': 390, 'height': 844})
        _altn_open(c, hard, app, cat, min_ft)
        line = f'{FUEL} [data-altnchk] .fu-altnline'
        c.until(f"document.querySelector('{line}')?.dataset.state === {json.dumps(state)} && "
                f"!!document.querySelector('{FUEL} [data-altnchk] li[data-crit=wx][data-state=ok]')", timeout=20000,
                what=f'the line in state {state}, the weather read')
        got_head = norm(c.text(f'{FUEL} [data-altnchk] [data-altnhead]') or '')
        c.ok(got_head.startswith(want), got_head, f'the sentence of the state {state}')
        if state == 'ok':
            c.eq(c.count(f'{FUEL} [data-altnchk] [data-altncount]'), 0, 'all good: no count', what='count')
        else:
            cnt = norm(c.text(f'{FUEL} [data-altnchk] [data-altncount]') or '')
            unchecked = norm(tx(T, 'altnCount', L)).split('{g}')[1].split('(')[0].strip()
            # the unchecked counted only when there are some (the ergonomist: « 2 bons », never « 0 non vérifié »)
            c.ok((unchecked in cnt) == (state == 'grey') and cnt.startswith('2'), cnt, 'the good counted, the unchecked only when not zero')
        crit = c.js(f"[...document.querySelectorAll('{FUEL} [data-altnchk] li[data-crit]')].map(li => [li.dataset.crit, li.dataset.state])")
        c.eq([k for k, _ in crit], ['rwy', 'aids', 'wx'], 'three criteria in the fold, in order', what='criteria')
        c.ok(c.count(f'{FUEL} [data-altnchk] li') <= 7, 'fold', 'seven elements at most in the fold')
        wx = norm(c.text(f'{FUEL} [data-altnchk] li[data-crit=wx]') or '')
        c.ok(norm(tx(T, 'wxCat', L)).split('{')[0].strip() in wx and 'VFR' in wx, wx, 'the weather said an indicator, with its category')
        c.ok(norm(tx(T, 'altnWxNote', L))[:30] in norm(c.text(f'{FUEL} [data-altnchk] [data-altnnote]') or ''), 'note',
             'never « compliant »: the indicator note')
        c.js(f"document.querySelector('{FUEL} [data-altnchk] details[data-altnfold]').open = true")
        c.js(f"document.querySelector('{FUEL} [data-altnchk]').scrollIntoView({{block: 'center'}})")
        # the chevron of the opened fold turned (its transition is 0.15 s: a capture taken before showed « > » on an open fold)
        c.until(f"(() => {{ const m = /matrix\\(([^,]+), ([^,]+)/.exec(getComputedStyle(document.querySelector('{FUEL} [data-altnchk] details[data-altnfold] > summary'), '::before').transform); return !!m && +m[2] > 0.5 }})()",
                timeout=3000, what='the chevron says the fold is open')
        c.shot(f'F257_{c.design}_390_{L}_{state}.png')
        c.page.set_viewport_size({'width': 1280, 'height': 900})
        c.settle()
        c.js(f"document.querySelector('{FUEL} [data-altnchk]').scrollIntoView({{block: 'center'}})")
        # the chevron of the opened fold turned (its transition is 0.15 s: a capture taken before showed « > » on an open fold)
        c.until(f"(() => {{ const m = /matrix\\(([^,]+), ([^,]+)/.exec(getComputedStyle(document.querySelector('{FUEL} [data-altnchk] details[data-altnfold] > summary'), '::before').transform); return !!m && +m[2] > 0.5 }})()",
                timeout=3000, what='the chevron says the fold is open')
        c.shot(f'F257_{c.design}_1280_{L}_{state}.png')


@case('F259', 'Route step, « Copier pour Eurocontrol »: the level of a speed-level group goes in steps of ten — « F205 » is written « F200 » '
      '(rounded DOWN), the fold says it, the copy is not blocked', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0431 (Eurocontrol refused « NOHAT/N0405F205 », SYN101: invalid level in the route; the user corrected F205 by hand: « Bingo »); '
      'the ergonomist: rounded down, said in the fold, the copy not blocked; invented routes')
def f259(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    c.open('fuel', docs=flight_docs())
    wait_quote(c)
    got = c.js("""() => import('/modules/fuel/fpl.js').then(F => {
      const m = F.message({ type: 'C30J', wake: 'M', dep: 'LFPO', arr: 'LFML', reg: 'F-ZZAB', eobt: F.eobtOf('2026-11-18T09:30:00Z'), speedKt: 330,
        levelFt: 20500, routeText: 'LFPO ZZONE ZZTWO/F205 ZZTRE/F270 ZZFOU/F335 LFML', eetMin: 75 });
      return [m.text.split('\\n')[3], m.notes.rounded, m.errors, F.levelTens(20500), F.levelTens(27000), F.levelTens(9990)];
    })""")
    c.eq(got[0], '-N0330F200 ZZONE DCT ZZTWO DCT ZZTRE/N0330F270 DCT ZZFOU/N0330F330',
         'every level in tens: the head F205 written F200, ZZTWO\'s F205 the same group (not repeated), F335 written F330', what='item 15')
    c.eq(got[1], [['F205', 'F200'], ['F335', 'F330']], 'each rounding kept once, to be said', what='rounded')
    c.eq(got[2], [], 'the copy is not blocked', what='errors')
    c.eq(got[3:], [20000, 27000, 10000], 'rounded down to the ten below, after the hundred of feet (9 990 ft is FL100)', what='levelTens')
    # the screen: a flight whose route carries « /F205 »: the fold says the level written
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = '2026-11-18T09:30:00Z'
            d[1]['route']['text'] = 'LFRS LUGEN/F205 NEPIX LFML'
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-fpltext]')", timeout=10000, what='the flight plan in its fold')
    c.js(f"document.querySelector('{FUEL} details[data-fplfold]').open = true")
    text = c.js(f"document.querySelector('{FUEL} [data-fpltext]').textContent")
    c.ok('F205' not in text and 'LUGEN/N0' in text and 'F200' in text, text, 'the route writes LUGEN at F200, never F205')
    want = norm(tx(T, 'fplLevelTens', L).replace('{a}', 'F205').replace('{b}', 'F200'))
    notes = norm(c.text(f'{FUEL} [data-fplnotes]') or '')
    c.ok(want in notes, notes, 'the fold says the level written')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-do=fplcopy]').getAttribute('aria-disabled')"), None, 'the copy not blocked', what='button')
    c.js(f"document.querySelector('{FUEL} [data-fpl]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F259_{c.design}_390_{L}.png')


# SOG-0432: the gesture's stub (as _LNM_GESTURE_STUB) whose fetchLnm hangs, or answers the launcher's « busy » when window.__lnmMode is
# 'busy'; Date.now shifted by window.__skew (ms) to age the page's mark without waiting
_LNM_LOCK_STUB = """(() => { window.__lnm = []; window.__skew = 0; const now = Date.now.bind(Date); Date.now = () => now() + (window.__skew || 0);
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try { const ps = db.procedures;
        db.procedures = async (icao, q) => String(icao).toUpperCase() === 'LFML' ? [] : ps.call(db, icao, q);
        const rw = db.runways; db.runways = async (icao, ...q) => String(icao).toUpperCase() === 'LFML' ? [] : rw.call(db, icao, ...q);
        db.fetchProcedures = async icao => ({ ok: false, reason: 'no-tables', lnm: true, icao });
        db.lnmAvailable = () => true;
        db.fetchLnm = async (...x) => { window.__lnm.push(x[0]);
          if (window.__lnmMode === 'busy') return { ok: false, reason: 'busy' };
          await new Promise(() => {}) } } catch (e) {}
      return db } } } }) })()"""


@case('F260', 'Little Navmap: the page\'s reading mark has an owner and an age — a second gesture says « this page is already reading LFML '
      'for 3 s »; a mark older than its bound is released by itself and the gesture reads again; the launcher\'s refusal (« busy ») is said '
      'apart: « the launcher already has six readings running »', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=True,
      rule='SOG-0432 (the user: « LQSA : une lecture de Little Navmap est déjà en cours » while nothing ran, « un vieux lock qui traîne »); '
      'the rule of the fiche: a lock has an owner and an age, released at the end, on failure, and by itself when its work is gone; the '
      'note says since when; two sentences (the page / the launcher); fetchLnm stubbed (no launcher job)')
def f260(c):
    PTX = 'modules/fuel/procedures_texts.js'
    c.page.add_init_script(_LNM_LOCK_STUB)
    open_proc(c)
    c.js(_PERSONAL_PUT)
    btn = f'{FUEL} [data-proc="arr"] [data-do="proclnm"]'
    c.until(f"!!document.querySelector('{btn}')", timeout=15000, what='« Lire depuis Little Navmap » offered')
    c.tap(btn)
    c.until('window.__lnm.length === 1', timeout=5000, what='the reading asked')
    # a second gesture during the reading: this page, its aerodrome and since when
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{btn}').disabled = false; document.querySelector('{btn}').click()")
    page = norm(tx(PTX, 'procLnmBusyPage', c.lang)).split('{t}')[0].replace('{icao}', 'LFML').strip()
    c.until(_NOTE, page, timeout=5000, what='the page says its own reading')
    note = next(norm(n) for n in c.note_log() if page in norm(n))
    age = norm(tx(PTX, 'procAgeS', c.lang)).split('{n}')[1].strip()
    c.ok(re.search(r'\d+ ' + re.escape(age), note) is not None, note, 'with its age')
    c.eq(c.js('window.__lnm.length'), 1, 'nothing asked again', what='calls')
    # the mark older than its bound (150 s): released by itself, the gesture reads again
    c.js('window.__skew = 200000')
    c.js(f"document.querySelector('{btn}').disabled = false; document.querySelector('{btn}').click()")
    c.until('window.__lnm.length === 2', timeout=5000, what='a stale mark released: the reading asked again')
    # the launcher's refusal, said apart (a fresh page: no mark)
    c.js("window.__lnmMode = 'busy'")
    c.js('window.__skew = 400000')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{btn}').disabled = false; document.querySelector('{btn}').click()")
    launcher = norm(tx(PTX, 'busy', c.lang, after='procLnmWhy')).replace('{icao}', 'LFML')[:40]
    c.until(_NOTE, launcher, timeout=5000, what='the launcher\'s refusal said apart')


@case('F261', 'aerodb.fetchLnm is bounded in time: a reading that never ends at the launcher answers « timeout » (its job asked to stop), '
      'releases its aerodrome, and a reading of the caller cancelled stays « cancelled »', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0432 (b): the exception the ergonomist granted Features SOG in frame/aerodb/aerodb.js for this bound only (120 s, `maxMs` '
      'shorter for a test, 1 s at least); a fake launcher whose job ends only when aborted')
def f261(c):
    c.open('fuel', docs=flight_docs())
    got = c.js("""async () => {
      let calls = 0;
      const launcher = { info: () => ({ lnm: ['x'] }), job: (route, body, o = {}) => new Promise(res => { calls++;
          o.signal?.addEventListener('abort', () => res({ ok: false, cancelled: true }), { once: true }) }) },
        db = AeroDB.create({ reader: { read: async () => null, list: async () => [], watch: () => () => {} }, lnmperf: false, launcher }),
        cap = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ reason: 'hung' }), ms))]),
        t0 = Date.now(),
        first = await cap(db.fetchLnm('ZZLN', { personal: true, maxMs: 1000 }), 6000),
        took = Date.now() - t0,
        again = await cap(db.fetchLnm('ZZLN', { personal: true, maxMs: 1000 }), 6000),
        asked = calls,
        ctl = new AbortController(),
        p = db.fetchLnm('ZZLM', { personal: true, signal: ctl.signal });
      setTimeout(() => ctl.abort(), 200);
      const user = await cap(p, 6000);
      return [first.reason, took < 4000, again.reason, asked, user.reason];
    }""")
    c.eq(got[0], 'timeout', 'a reading that never ends: « timeout »', what='bound')
    c.ok(got[1], got, 'within its bound (1 s asked)')
    c.eq(got[2:4], ['timeout', 2], 'the aerodrome released: a second reading is asked (not « busy »)', what='released')
    c.eq(got[4], 'cancelled', 'the caller\'s own cancel stays « cancelled »', what='cancel')


@case('F263', 'A started flight: the frame\'s write of its progression (every 5 s) recomputes nothing — no quote, no layout measurement; '
      'the « Progression prévue » card stays, rewritten only when its text changes', 'F', tags=('fuel',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0435 (V3 Frame\'s measure: Fuel redid the whole quote on each echo, 35 ms on the workstation, about 300 ms on a modest phone: '
      'a jolt every 5 s); the user\'s rule: the quote depends only on the route, the level, the aircraft and the departure')
def f263(c):
    c.open('fuel', flight=True, started=True)
    wait_quote(c)
    to_step(c, 4)
    c.until(f"!!document.querySelector('{FUEL} [data-progcard]:not(.fu-hide) [data-prog] p')", timeout=10000, what='the progress card')
    # counters: the quotes computed (FuelModel.quote) and the layout measurements (getBoundingClientRect, offset sizes)
    c.js("""() => { window.__q = 0; window.__lay = 0; const M = window.FuelModel, q = M.quote; M.quote = (...a) => (window.__q++, q.apply(M, a));
      const g = Element.prototype.getBoundingClientRect; Element.prototype.getBoundingClientRect = function () { window.__lay++; return g.call(this) };
      for (const k of ['offsetWidth', 'offsetHeight']) { const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k);
        Object.defineProperty(HTMLElement.prototype, k, { configurable: true, get() { window.__lay++; return d.get.call(this) } }) } }""")
    c.wait(1500)
    quiet = c.js('[window.__q, window.__lay]')
    c.js('window.__q = 0; window.__lay = 0')
    # the frame writes the progression (its own key progress.actual, by: frame), as it does every 5 s
    c.js("""async () => { const d = FrameData.adapter({ id: 'frame-test', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
      const cur = (await d.get('pilot/ABC/current_flight.json')) || {};
      await d.put('pilot/ABC/current_flight.json', { ...cur, progress: { ...(cur.progress || {}), actual: { lat: 46.0, lon: 0.5, at: new Date().toISOString() } },
        by: 'frame', updated_at: new Date().toISOString() }); return true }""")
    c.wait(1500)
    echo = c.js('[window.__q, window.__lay]')
    c.eq(echo[0], 0, f'no quote recomputed on the echo (a quiet window of the same length: {quiet[0]})', what='quotes')
    c.ok(echo[1] <= quiet[1], f'echo {echo[1]} / quiet {quiet[1]}', 'no more layout measurement than a quiet window')
    c.ok(c.count(f'{FUEL} [data-progcard]:not(.fu-hide) [data-prog] p') == 1, 'card', 'the progress card is still there')


@case('F264', 'The quote is computed once per signature of its inputs: a refresh that changes none of them (another module\'s write that '
      'leaves the plan as it is) computes no quote, no level series, no climb; a change of level computes again', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0435, second part; the ergonomist: each family of inputs computes again when it changes, one by one (V3 Frame\'s profile: compute() 89 % of a refresh, the level series a full trip per flight level, the climb '
      'solved at each call; the user\'s design: a signature of the inputs before compute())')
def f264(c):
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'lb', 'usableFuel': 40000, 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 7300}}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', sheet, 'document']], airfields=True)
    wait_quote(c)
    c.js("""() => { window.__q = 0; const M = window.FuelModel, q = M.quote; M.quote = (...a) => (window.__q++, q.apply(M, a)) }""")
    # another module writes the flight without touching the plan: Fuel refreshes (its echo), nothing of the quote changed
    c.js("""async () => { const d = FrameData.adapter({ id: 'maps', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
      const cur = (await d.get('pilot/ABC/current_flight.json')) || {};
      await d.put('pilot/ABC/current_flight.json', { ...cur, view: { zoom: 7 }, by: 'maps', updated_at: new Date().toISOString() }); return true }""")
    c.wait(1500)
    c.eq(c.js('window.__q'), 0, 'a refresh with the same inputs: no quote computed', what='same signature')
    # each family of inputs, one at a time, computes again (the ergonomist: a quote kept wrongly would be worse than the jolt)
    def field(k, v, what):   # set by the page (the field may sit in another step or a closed fold), as typed: input then change
        c.js('window.__q = 0')
        c.js("([k, v]) => { const i = document.querySelector(`[data-module=fuel] input[data-k=\"${k}\"]`); i.focus(); i.value = v; "
             "i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); i.blur() }", [k, v])
        c.until('window.__q > 0', timeout=8000, what=f'{what}: the quote computed again')
    to_step(c, 0)
    field('fl', '250', 'the level')
    field('wdir', '270', 'the wind direction')
    field('wkt', '40', 'the wind speed')
    field('isa', '10', 'the ISA deviation')
    field('wxdate', '2026-12-01T10:00', 'the date of the flight')
    field('altn', 'LFRS', 'the alternate')
    field('taxiMin', '25', 'the taxi time')
    field('reserveMin', '45', 'the final reserve')
    field('contPct', '7', 'the contingency')
    field('entry', '3000', 'the fuel flow of this flight (the sheet\'s load: there is no mass input in the quote)')
    # the route, written by another module (its points): computed again
    c.js('window.__q = 0')
    c.js("""async () => { const d = FrameData.adapter({ id: 'maps', reads: ['pilot/'], writes: [{ prefix: 'pilot/', merge: 'record' }] });
      const cur = (await d.get('pilot/ABC/current_flight.json')) || {}, pts = (cur.route?.points || []).slice();
      pts.splice(1, 0, { id: 'ZZMID', lat: 46.0, lon: 0.0 });
      await d.put('pilot/ABC/current_flight.json', { ...cur, route: { ...cur.route, points: pts, text: pts.map(p => p.id).join(' ') }, by: 'maps',
        updated_at: new Date().toISOString() }); return true }""")
    c.until('window.__q > 0', timeout=8000, what='the route changed by the Map: the quote computed again')
    # the sheet of the aircraft changed (its cruise flow): computed again
    c.js('window.__q = 0')
    c.js("""async () => { const d = FrameData.adapter({ id: 'aircraft', reads: ['aircraft/'], writes: [{ prefix: 'aircraft/', merge: 'record' }] });
      const cur = (await d.get('aircraft/sheets/C30J.json')) || {};
      await d.put('aircraft/sheets/C30J.json', { ...cur, cruise: { ...(cur.cruise || {}), fuelFlowPerHour: 8100 } }); return true }""")
    c.until('window.__q > 0', timeout=8000, what='the sheet changed: the quote computed again')


# SOG-0398 lot 2: invented aerodromes around the seeded arrival (LFML 43.44N 5.22E), each one testing a rule of the selection
_PROP_ADS = [
    {'icao': 'XQPA', 'name': 'XQPA TEST', 'lat': 43.90, 'lon': 5.20, 'elev': 50, 'hardLen': 2500},    # 28 NM: too near
    {'icao': 'XQPB', 'name': 'XQPB TEST', 'lat': 44.10, 'lon': 5.10, 'elev': 50, 'hardLen': 2500},    # 40 NM, approaches: green
    {'icao': 'XQPC', 'name': 'XQPC TEST', 'lat': 43.60, 'lon': 4.30, 'elev': 50, 'hardLen': 2600},    # 41 NM, no approach: visual only
    {'icao': 'XQPD', 'name': 'XQPD TEST', 'lat': 44.30, 'lon': 5.60, 'elev': 50, 'hardLen': 900},     # 55 NM, runway too short
    {'icao': 'XQPE', 'name': 'XQPE TEST', 'lat': 44.50, 'lon': 4.90, 'elev': 50, 'hardLen': 2400},    # 65 NM, TAF LIFR
    {'icao': 'XQPF', 'name': 'XQPF <b>TEST</b>', 'lat': 44.80, 'lon': 5.50, 'elev': 50, 'hardLen': 3000},  # 83 NM, weather not read
    {'icao': 'XQPG', 'name': 'XQPG TEST', 'lat': 44.00, 'lon': 5.40, 'elev': 50, 'hardLen': 2500, 'type': 'HP'},  # a heliport
    {'icao': 'XQPH', 'name': 'XQPH TEST', 'lat': 45.00, 'lon': 6.00, 'elev': 50, 'hardLen': 2500},    # 100 NM, procedures not held
]
_PROP_HELD = {'XQPB': {'SID': 1, 'STAR': 1, 'APP': 2}, 'XQPC': {'SID': 1, 'STAR': 1, 'APP': 0}, 'XQPE': {'SID': 1, 'APP': 1},
              'XQPF': {'SID': 1, 'APP': 1}}


def _prop_open(c, target='fuel', more=(), held=None, tafs=None, planned=True):
    """The seeded flight (alternate LFMT) with a C30J sheet asking 5000 ft, the aerodromes above, their coverage (`held`, _PROP_HELD by
    default), TAFs kept fresh (`tafs` {ICAO: category}; by default XQPB, XQPC, XQPF VFR and XQPE LIFR); `planned=False` (SOG-0544): the
    flight without its date."""
    held = _PROP_HELD if held is None else held
    tafs = {'XQPB': 'VFR', 'XQPC': 'VFR', 'XQPE': 'LIFR', 'XQPF': 'VFR'} if tafs is None else tafs
    import time as _t
    now = int(_t.time())
    sheet = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'lb', 'usableFuel': 40000,
             'cruise': {'tasKt': 330, 'fuelFlowPerHour': 7300}, 'runwayType': 'HARD', 'minRunwayLengthFt': 5000}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
            d[1]['planned_at'] = _t.strftime('%Y-%m-%dT%H:00:00Z', _t.gmtime(now + 2 * 3600))
            if not planned:
                d[1].pop('planned_at', None)
    docs += [['aircraft/sheets/C30J.json', sheet, 'document'],
             ['proc/manual/index.json', {'schema': 1, 'aerodromes': {k: {**v, 'cycle': '2026-10-01', 'updated_at': '2026-11-01T09:00:00Z'}
                                                                       for k, v in held.items()}}, 'reference']]
    for icao, cat in tafs.items():
        t = _altn_taf(cat, now)
        t['icaoId'] = icao
        docs.append([f'cache/weather/taf/{icao}.json', {'at': 4102444800000, 'source': 'launcher', 'data': t}, 'cache'])
    c.open(target, docs=docs + list(more), airfields=True,
           aero_extra={'aerodromes': _PROP_ADS, 'cells': {str(y): [[-2, 7]] for y in range(43, 47)}})
    wait_quote(c)
    to_step(c, 0)


@case('F262', 'Flight step, « Proposer un dégagement »: the aerodromes 30 to 300 NM from the arrival kept on the RUNWAY and the AIDS, the '
      'three closest listed with distance and alternate fuel, their weather read (an indicator: LIFR red, without « Prendre »), the others '
      '« weather not read »; the local document of the Map (seven at most, ok before warn, never data/); a touch on the Map PROPOSES '
      '(« Proposé : … — Prendre »); the field is written only by « Prendre »', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0398 lot 2 (the ergonomist\'s specification version 2, part D; Features SOG\'s contract of 17/11 with BUGS SOG: '
      'cache/fuel/altn_candidates.json, fuel-altn-candidates, maps-altn-pick { icao }, #fuel?altn=<ICAO>); invented aerodromes and TAFs')
def f262(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    c.page.set_viewport_size({'width': 390, 'height': 844})
    _prop_open(c)
    c.js("window.__altnDocs = []; window.addEventListener('fuel-altn-candidates', e => window.__altnDocs.push(e.detail))")
    B = f'{FUEL} [data-altnchk]'
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.eq(norm(c.text(f'{B} [data-do=altnpropose]') or ''), norm(tx(T, 'altnPropose', L)), 'the gesture named', what='button')
    c.tap(f'{B} [data-do=altnpropose]')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000, what='three aerodromes listed')
    rows = c.js(f"[...document.querySelectorAll('{B} [data-altnprop] li[data-cand]')].map(li => [li.dataset.cand, li.dataset.state, "
                f"!!li.querySelector('[data-do=altntake]'), li.textContent])")
    c.eq([r[0] for r in rows], ['XQPB', 'XQPC', 'XQPE'], 'the three closest CHECKED first: XQPA too near, XQPD too short, the heliport '
         'left out; XQPH (procedures not held) and LFMT (no runway length) offered after them (SOG-0494)', what='list')
    c.eq([r[1] for r in rows], ['ok', 'warn', 'err'], 'green; visual only orange; LIFR red', what='signs')
    c.eq([r[2] for r in rows], [True, True, False], '« Prendre » except on the red one', what='take')
    c.ok(norm(tx(T, "aids-visual'", L, after='altnPropWhy')) in norm(rows[1][3]), rows[1][3], 'the reservation said: visual only')
    row0 = norm(rows[0][3])   # « 1 490 kg » (fr), « 1.490 kg » (de), « 1,490 kg » (en) ; « Prendre » collé après l'unité dans le texte
    c.ok(re.search(r'\b\d+ NM\b', row0) is not None and re.search(r'\d (lb|kg)', row0) is not None, row0,
         'its distance and its alternate fuel')
    more = norm(c.text(f'{B} [data-altnmore]') or '')
    c.ok(more.startswith('3 '), more, 'the three others (XQPF, LFMT and XQPH not checked) said on the Map')
    # the ergonomist: a fold with a chevron (the component of « Critères du dégagement »), closed by its heading; no « Fermer »
    c.eq(c.js(f"[document.querySelector('{B} details[data-altnprop]')?.open, !!document.querySelector('{B} details[data-altnprop] > summary'), "
              f"document.querySelectorAll('{B} [data-do=altnpropclose]').length]"), [True, True, 0], 'a fold, open, no « Fermer »', what='fold')
    c.eq(c.js(f"getComputedStyle(document.querySelector('{B} li[data-cand=XQPC] .fu-nowrap:last-child')).whiteSpace"), 'nowrap',
         '« visual only » never cut', what='nowrap')
    # the document for the Map: seven at most, ok before warn, the LIFR one left out, codes only, the name a cleaned text
    d = c.until_doc('cache/fuel/altn_candidates.json', lambda d: bool(d) and len(d.get('list') or []) > 0, 'the document of the Map',
                    timeout=10000)
    c.eq([(x['icao'], x['state'], x['why']) for x in d['list']],
         [('XQPB', 'ok', []), ('XQPF', 'ok', []), ('XQPC', 'warn', ['aids-visual']),
          ('LFMT', 'warn', ['rwy-unread', 'aids-unread', 'wx-unread']), ('XQPH', 'warn', ['aids-unread', 'wx-unread'])],
         'ok before warn, then by distance; XQPE (LIFR) not offered to the Map; what is not checked said (SOG-0494); SOG-0544 (the relay, '
         '21 Nov): the weather of the seven read, XQPF read and good — expectation changed on purpose', what='document')
    c.eq([d['schema'], d['arr']], [1, 'LFML'], 'schema 1, the arrival', what='head')
    # SOG-0549: in the unit Fuel shows (the display in kg by default, the sheet in lb) — expectation changed on purpose
    c.ok(all(x['fuel'] and x['fuel']['unit'] == 'kg' and x['fuel']['amount'] > 0 for x in d['list']), d['list'], 'the alternate fuel of each')
    c.ok(c.js('window.__altnDocs.length') >= 1, 'event', 'the event fuel-altn-candidates sent')
    c.eq(c.doc('pilot/ABC/current_flight.json')['route']['altn'], 'LFMT', 'nothing taken: the field unchanged', what='field')
    c.js(f"document.querySelector('{B}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F262_{c.design}_390_{L}_list.png')
    c.tap(f'{B} details[data-altnprop] > summary')
    c.until(f"document.querySelector('{B} details[data-altnprop]')?.open === false", timeout=3000, what='closed by its heading')
    c.eq(len((c.doc('cache/fuel/altn_candidates.json') or {}).get('list') or []), 5, 'closed, the Map keeps the proposal', what='closed')
    # a touch on the Map beside (maps-altn-pick): PROPOSED, its weather read, nothing taken; the fold reopened
    c.js("window.dispatchEvent(new CustomEvent('maps-altn-pick', { detail: { icao: 'XQPF' } }))")
    c.until(f"!!document.querySelector('{B} li[data-proposed][data-cand=XQPF]')", timeout=8000, what='« Proposé : XQPF »')
    c.eq(c.js(f"document.querySelector('{B} details[data-altnprop]')?.open"), True, 'reopened on the aerodrome touched', what='reopened')
    prop = norm(c.text(f'{B} li[data-proposed] > span:nth-child(2)') or '')   # the line without its sign (« ✓ ») and its button
    # the name of the base (« XQPF <b>TEST</b> », invented) shown as TEXT: escaped, read as it is, no <b> element made of it
    c.ok(prop.startswith(norm(tx(T, 'altnProposed', L)).replace('{icao}', 'XQPF')) and 'XQPF <b>TEST</b>' in prop
         and c.count(f'{B} li[data-proposed] b') == 0, prop, 'proposed, the name as text')
    c.until(f"document.querySelector('{B} li[data-proposed]')?.dataset.state === 'ok'", timeout=8000, what='its weather read: green')
    c.js("window.dispatchEvent(new CustomEvent('maps-altn-pick', { detail: { icao: 'ZZZZ' } }))")
    c.wait(300)
    c.eq(c.count(f'{B} li[data-proposed][data-cand=ZZZZ]'), 0, 'a code outside the proposal ignored', what='foreign code')
    c.eq(c.doc('pilot/ABC/current_flight.json')['route']['altn'], 'LFMT', 'still nothing taken', what='field')
    c.page.set_viewport_size({'width': 1280, 'height': 900})
    c.settle()
    c.js(f"document.querySelector('{B}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F262_{c.design}_1280_{L}_proposed.png')
    c.page.set_viewport_size({'width': 390, 'height': 844})
    c.settle()
    c.js(f"document.querySelector('{B}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F262_{c.design}_390_{L}_proposed.png')
    # « Prendre »: the field written, the proposal closed, the Map told (an empty list)
    c.tap(f'{B} li[data-proposed] [data-do=altntake]')
    cf_doc(c, lambda d: d['route'].get('altn') == 'XQPF', 'the alternate taken: XQPF', timeout=10000)
    c.until_doc('cache/fuel/altn_candidates.json', lambda d: bool(d) and d.get('list') == [], 'the Map told: an empty list', timeout=10000)
    c.eq(c.js(f"document.querySelector('{FUEL} input[data-k=altn]').value"), 'XQPF', 'the field shows it', what='input')
    # a Map alone: #fuel?altn=<ICAO> proposes from the document of the same arrival and aircraft
    keep = {'schema': 1, 'updated_at': '2026-11-17T17:00:00Z', 'arr': 'LFML', 'key': 'LFRS>LFML>C30J',
            'list': [{'icao': 'XQPB', 'name': 'XQPB TEST', 'lat': 44.1, 'lon': 5.1, 'nm': 40.1, 'state': 'ok', 'why': [],
                      'fuel': {'amount': 2100, 'unit': 'lb', 'min': 28}}]}
    _prop_open(c, target='fuel?altn=XQPB', more=[['cache/fuel/altn_candidates.json', keep, 'cache']])
    c.until(f"!!document.querySelector('{B} li[data-proposed][data-cand=XQPB]')", timeout=15000, what='« Proposé : XQPB » from the address')
    c.eq(c.doc('pilot/ABC/current_flight.json')['route']['altn'], 'LFMT', 'proposed, not taken', what='field')


@case('F269', 'Procedures, departure from an aerodrome of the United Kingdom: what the device HOLDS from the UK package is said after a '
      'reload — « 2 SID lues en partie le 16/11 09:00Z » from the aerodrome\'s records (source ukpkg) and the date of the last hand '
      'reading — and the gesture is « Relire les départs… » when a reading exists; without a reading, « Lire les départs… » and nothing said',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0374 (the user, 16 Nov: « ça lit, n\'affiche rien, ne garde rien »; the measure of « Procédures »: after a reload the line '
      'no longer said « n SID lues » — ukDone lived in the page\'s memory only — and « Lire » was offered again as if nothing was read); '
      'the invented EGLL of F231 (two SIDs read in part, the index dated 16/11 09:00Z)')
def f269(c):
    T = 'modules/fuel/procedures_texts.js'
    D = f'{FUEL} [data-proc="dep"]'
    L = f'{D} [data-ukline]'
    c.page.add_init_script(_UK_STUB)
    _route_launcher(c, ['route/compute'])
    # first a device that holds nothing from the package: « Lire », nothing said (the browser's storage keeps the files of an opening,
    # so the empty device comes first)
    docs = [d for d in _uk_docs() if not d[0].startswith('proc/manual/')]
    c.open('fuel', docs=docs)
    to_step(c, 1)
    open_foot(c, 'dep')
    c.until(f"!!document.querySelector('{D} [data-do=procukpkg]')", timeout=15000, what='the gesture')
    c.eq([norm(c.text(f'{D} [data-do=procukpkg]')), c.count(f'{L} [data-ukres]')], [norm(tx(T, 'procUkRead', c.lang)), 0],
         'without a reading: « Lire les départs… » and nothing said', what='nothing held')
    # then the device holds the two SIDs read earlier from the package: a fresh page (as after a reload) says so at once
    c.open('fuel', docs=_uk_docs())
    to_step(c, 1)
    open_foot(c, 'dep')
    c.until(f"!!document.querySelector('{L} [data-ukres]')", timeout=15000, what='the line says what the device holds')
    want = norm(tx(T, 'procUkHeldAt', c.lang).replace('{n}', '2'))
    got = norm(c.text(f'{L} [data-ukres]'))
    c.ok(got.startswith(want.split('{d}')[0].strip()) and '16/11' in got, got, '« 2 SID lues en partie le 16/11 … » after a reload')
    c.eq(norm(c.text(f'{D} [data-do=procukpkg]')), norm(tx(T, 'procUkReread', c.lang)), '« Relire les départs… » when a reading exists',
         what='reread')
    c.eq(c.js("window.__uk.asked"), [], 'nothing asked of aerodb: the line reads what the device holds', what='asked')


@case('F267', 'The suggestion list under a field, a shared block (frame/lib/suggest_list.js): on a page without any module, three '
      'suggestions under the field, ↓ ↑ Enter Escape, a touch; a choice writes the field and gives it back its « input » without '
      'reopening the list; only the last request is alive', 'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='SOG-0465 (the user: « tout ce qui peut être constitué de modules doit être constitué de modules ; KISS, oui, mais reuse »): '
      'modules/fuel/suggest.js moved as it is into frame/lib (V3 Frame granted the file), re-exported for routecomplete.js and Aircraft')
def f267(c):
    run_bench(c, 'frame/lib/test/suggest_list.html')


@case('F268', 'The aerodrome field, a shared block (frame/lib/ad_field.js): on a page without any module, with an invented aerodb given '
      'by the context — the keys given by the screen, the completion by the code, the choice written, « XTST — Base Test » under the '
      'field, « inconnu » for a code the base does not know, the fallback value of a key without a field; its imports stay in frame/lib; '
      'a helipad\'s list code (two letters and three digits) is a full code: proposed, written, named',
      'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='SOG-0465 (the user, in the mission workshop: « les champs adep / adest ne sont pas uniformes avec les autres, pas de complétion ; '
      'on réutilise l\'existant »): the core of modules/fuel/adnames.js moved into frame/lib, Fuel keeps a wrapper of its three fields; '
      'aerodb only through the context, never a global (V3 Frame\'s condition)')
def f268(c):
    run_bench(c, 'frame/lib/test/ad_field.html')


# SOG-0401: what the RAD check decided and left to examine, in the form of AeroDB 9929e1afa (invented numbers and identifiers)
_RAD_VIEW = {'title': 'RAD test', 'start': '2026-10-29', 'decided': 412, 'review': 37, 'findings': 0, 'total': 449, 'listed': 449, 'cut': False,
             'unknown_spaces': [{'space': 'LS100A', 'rules': ['LS2815A', 'LS2816A']}, {'space': 'EDUU100E', 'rules': []}],
             'items': [{'sheet': 'Annex 2B', 'row': 3, 'id': 'LSLI1008A', 'reason': 'route interdite au-dessus du FL245', 'assessment': 'À interpréter',
                        'validity': '', 'values': []},
                       {'sheet': 'Annex 2B', 'row': 9, 'id': 'ED3518A', 'reason': '<b>markup</b>', 'assessment': 'review', 'validity': '', 'values': []},
                       {'sheet': 'Annex 2B', 'row': 12, 'id': 'LF9999', 'reason': 'décidée', 'assessment': 'decided', 'validity': '', 'values': []}]}


@case('F250', 'Route step, under « Calculé à … », one grey line without a fold says what the simulation checked and did not — « Contrôle '
      'de simulation : 412 conditions RAD vérifiées, 37 non vérifiées, 2 espaces inconnus — ce n\'est pas une validation » —, each itinerary '
      'says « 0 écart contrôlé », the fold « Ce que le contrôle ne couvre pas » writes the unknown spaces and the conditions left to examine '
      'only when opened; a free route judged at 30° west says « au 30° ouest vers … »', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0401 (the user: « validité ifps : échec », 22 errors of route on a proposal said « sans incompatibilité détectée »); the '
      'ergonomist, 17/11: the line from the numbers of AeroDB 9929e1afa, « 0 écart contrôlé », the detail in the fold read at its opening; '
      'SOG-0403 R1 (AeroDB 733af8fbf): the hour judged at 30° west, the field `point`; a fake launcher; SOG-0532 (the ergonomist, 20 Nov, choice (a)): the line « Contrôle de simulation : … » is REMOVED — expectation changed on purpose')
def f250(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'rad': _RAD_VIEW}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='« Calculer A → B »')
    _compute_now(c, st)
    # SOG-0532 (the ergonomist, 20 Nov, choice (a) — expectation changed on purpose): the line « Contrôle de simulation : 412 … » is removed
    # (its counts, those of the whole computation, repeated and contradicted the groups of the verdicts)
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rage]')", timeout=10000, what='« Calculé à … »')
    c.eq(c.count(f'{FUEL} [data-radline]'), 0, 'no line « Contrôle de simulation » any more', what='removed')
    rows = c.js(f"[...document.querySelectorAll('{FUEL} [data-altlist] [data-alt]')].map(e => e.textContent)")
    c.ok(rows and all(norm(tx(T, 'rFaults0', L)) in norm(r) for r in rows), rows, '« 0 écart contrôlé » on each itinerary')
    # the fold: written only when opened
    F = f'{FUEL} details[data-rlimits]'
    c.eq(c.js(f"document.querySelector('{F} [data-radlist]')?.innerHTML ?? null"), '', 'the detail is not written before the fold opens', what='closed')
    c.tap(f'{F} > summary')
    c.until(f"!!document.querySelector('{F} [data-radspaces]')", timeout=5000, what='the detail written at the opening')
    spaces = c.js(f"[...document.querySelectorAll('{F} [data-radspaces] li')].map(e => e.textContent)")
    c.ok(len(spaces) == 2 and 'LS100A' in spaces[0] and 'LS2815A' in spaces[0] and 'EDUU100E' in spaces[1], spaces, 'the unknown spaces and their rules')
    rev = c.js(f"[...document.querySelectorAll('{F} [data-radreview] li')].map(e => e.textContent)")
    c.ok(any('LSLI1008A' in x for x in rev) and any('ED3518A' in x for x in rev) and not any('LF9999' in x for x in rev), rev,
         'the conditions left to examine, not the decided ones')
    c.eq(c.count(f'{F} [data-radreview] li b'), len(rev), 'a reason that is markup is text (one <b>, the identifier, per line)', what='escaped')
    c.js(f"document.querySelector('{FUEL} [data-routealts] [data-rage]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F250_{c.design}_390_{L}.png')
    # SOG-0403 R1: the free route whose tracks were judged at 30° west says so
    sec = _free_time_sections()
    for r in sec['rejected']:
        if r['code'] == 'time':
            r['point'] = '30W'
    st['extra'] = {'alternatives': [_OCEAN_ALT], 'sections': sec, 'rad': _RAD_VIEW}
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    Fr = f'{FUEL} [data-routealts] [data-rfree]'
    c.until(f"!!document.querySelector('{Fr}')", timeout=15000, what='the free route line')
    west = tx(T, 'west', L, after='rFreeDir:')
    win = f'{_zt(L, "11", "30", True)} – {_zt(L, "19", "00")}'
    want = tx(T, 'rFreeTime30', L).replace('{at}', _zt(L, '09', '10')).replace('{dw}', ' (' + tx(T, 'rFreeWin', L).replace('{dir}', west).replace('{win}', win) + ')')
    c.ok(norm(c.text(f'{Fr} > span') or '').startswith(norm(want)), c.text(f'{Fr} > span'), '« … au 30° ouest vers 09 h 10 Z (routes vers l\'ouest : …) »')


@case('F251', 'Route step, a route through a coordinate point (« 51/50 »): the list of its sections names the point at both ends '
      '(« RESNO–51/50 », « 51/50–NICSO », never « RESNO– »); a NAT track set aside for the time by less than an hour says by how much and '
      'the departure limit (« à 9 min près : partir au plus tôt à 07 h 31 Z »)', 'F', tags=('fuel', 'aerodb'), designs=('standard',),
      screens=False, langs4=True,
      rule='SOG-0411 (the user tried R1, NAT track F taken: the sections read « HIGH · RESNO– · incomplet » and a track set aside for nine '
      'minutes said nothing of it); AeroDB 733af8fbf: `near` = { minutes, side, depart_until | depart_from }; a fake launcher')
def f251(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    st = _route_launcher(c, ['route/compute'])
    segs = [_ctl_seg('EIDW', 'RESNO', 'controlled', 'HIGH'), _ctl_seg('RESNO', '51/50', 'incomplete', 'HIGH'), _ctl_seg('51/50', 'NICSO', 'fallback', 'HIGH'),
            _ctl_seg('NICSO', 'KJFK', 'controlled', 'HIGH')]
    alt = dict(_alt(1, 'Via 51/50', 'EIDW RESNO 51/50 NICSO KJFK', 3000, 350, segs, sid=False),
               control={'controlledPct': 40, 'incompletePct': 45, 'fallbackPct': 15, 'errorPct': 0,
                        'sections': [{'layer': g['layer'], 'control': g['control'], 'from': g['from'], 'to': g['to'], 'nm': 300, 'reason': ''} for g in segs]})
    sec = _free_time_sections()
    sec['rejected'][0]['near'] = {'minutes': 9, 'side': 'early', 'depart_from': '2026-11-17T07:31Z'}
    st['extra'] = {'alternatives': [alt], 'sections': sec}
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    R0 = f'{FUEL} [data-altlist] [data-alt="0"]'
    c.until(f"!!document.querySelector('{R0} [data-sections]')", timeout=15000, what='the sections of the route')
    c.js(f"document.querySelector('{R0} [data-sections]').open = true")
    rows = c.js(f"[...document.querySelectorAll('{R0} [data-sections] [data-section]')].map(e => e.textContent)")
    c.ok(any('RESNO–51/50' in r for r in rows) and any('51/50–NICSO' in r for r in rows) and not any(re.search(r'–\s*·|·\s*–', r) for r in rows),
         rows, 'the coordinate point named at both ends of its sections')
    # the track set aside by nine minutes: by how much, and the departure limit
    c.js(f"document.querySelector('{R0} [data-proofrejs]').open = true")
    near = c.text(f'{R0} [data-proofrej="A"] [data-proofnear]') or ''
    want = tx(T, 'early', L, after='rProofNear:').replace('{m}', '9').replace('{t}', _zt(L, '07', '31'))
    c.ok(norm(want) in norm(near), near, '« à 9 min près : partir au plus tôt à 07 h 31 Z »')
    c.eq(c.count(f'{R0} [data-proofrej="B"] [data-proofnear]'), 0, 'a track set aside by more than an hour says nothing of it', what='far')
    c.js(f"document.querySelector('{R0} [data-proofrej=\"A\"]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F251_{c.design}_390_{L}.png')


# a route COMPUTED whose profile imposes level changes (the ceilings of the airways), written in its text the way the screen writes them
# (AeroDB 0e62754dc) — invented names and positions
_STEPS_PTS = [('ABCDE', 49.0, 1.0), ('FGHIJ', 50.0, -1.0), ('KLMNO', 51.0, -3.0), ('PQRST', 52.0, -4.5), ('UVWXY', 53.0, -5.5)]
_STEPS_ROUTE = 'LFPO DCT ABCDE B1 FGHIJ/F195 B1 KLMNO A1 PQRST/F350 B2 UVWXY DCT EIDW'


@case('F252', 'Route step, « Prendre » a computed route that writes its level changes (« FGHIJ/F195 … PQRST/F350 »): the Route field keeps '
      'them, the flight carries them as level steps of its points, and « Copier pour Eurocontrol » writes them as speed-level groups — '
      'the half level FL195 as « FGHIJ/N0nnnF190 », the usable level below, said in the fold (SOG-0431)', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=False,
      rule='AeroDB 0e62754dc (not yet pushed when written): the level changes imposed by the ceilings of the airways written in the route '
      'text; the ergonomist, 17/11: check that « Prendre » keeps them, that the quote reads them as steps, that the SOG-0402 writer gives '
      'them speed-level groups; then SOG-0431 (3558a13d8, Eurocontrol refused « NOHAT/N0405F205 », SYN101): a level of item 15 goes in '
      'steps of ten, rounded DOWN — FL195 is written F190, the flight keeps 19 500 ft (SOG-0451: this case followed the decision); the '
      'fake launcher keeps « FGHIJ/F195 » on purpose, the route text of a launcher before AeroDB da1ead3f7; a fake launcher, invented names')
def f252(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg(a, b) for a, b in zip(['LFPO'] + [x[0] for x in _STEPS_PTS], [x[0] for x in _STEPS_PTS] + ['EIDW'])]
    alt = dict(_alt(1, 'Via B1', _STEPS_ROUTE, 380, 350, segs, sid=False),
               points=[{'id': 'LFPO', 'lat': 48.72, 'lon': 2.38}] + [{'id': n, 'lat': la, 'lon': lo} for n, la, lo in _STEPS_PTS]
               + [{'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}])
    st['extra'] = {'alternatives': [alt]}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'LFPO EIDW', 'dep': 'LFPO', 'arr': 'EIDW', 'manual': True,
                             'points': [{'id': 'LFPO', 'lat': 48.72, 'lon': 2.38}, {'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}]}
            d[1]['level'] = {'ft': 35000}
    c.open('fuel', docs=docs)
    to_step(c, 1)
    _compute_now(c, st)
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    c.until(f"/FGHIJ\\/F195/.test(document.querySelector('{FUEL} [data-k=rtext]')?.value || '') && "
            f"/PQRST\\/F350/.test(document.querySelector('{FUEL} [data-k=rtext]')?.value || '')", timeout=10000, what='the level changes kept in the field')
    d = cf_doc(c, lambda d: any(p.get('id') == 'FGHIJ' and p.get('alt_ft') == 19500 for p in (d.get('route') or {}).get('points') or []),
               'the flight carries FGHIJ at FL195', timeout=10000)
    alts = {p.get('id'): p.get('alt_ft') for p in (d.get('route') or {}).get('points') or []}
    c.eq([alts.get('FGHIJ'), alts.get('PQRST')], [19500, 35000], 'the two level steps on their points', what='steps')
    c.js(f"document.querySelector('{FUEL} details[data-fplfold]').open = true")
    c.until(f"/FGHIJ\\/N0\\d{{3}}F190/.test(document.querySelector('{FUEL} [data-fpltext]')?.textContent || '')", timeout=8000,
            what='the flight plan writes the speed-level group at FGHIJ, FL195 at the usable level below (SOG-0431)')
    item = (c.js(f"document.querySelector('{FUEL} [data-fpltext]').textContent") or '').split('\n')[3]
    c.ok(re.search(r'ABCDE B1 FGHIJ/N0\d{3}F190 B1 KLMNO A1 PQRST/N0\d{3}F350 B2 UVWXY$', item) is not None, item,
         'item 15: the airways kept, a speed-level group at each change (FL195 written F190), no DCT between a point and its airway')
    note = c.js(f"[...document.querySelectorAll('{FUEL} [data-fplnotes] li')].map(x => x.textContent).find(t => /F195/.test(t) && /F190/.test(t)) || ''")
    c.ok(bool(note), note, 'the fold says F195 written F190 (SOG-0431), the copy not blocked')
    c.eq(c.js(f"document.querySelectorAll('{FUEL} [data-fplbad]').length"), 0, 'no error: the rounding never blocks the copy', what='no error')


@case('F253', 'aerodb.natEnsure: NAT tracks read again when stale, when FORCED, or when their last read is more than an hour old (readAt: '
      'the meta.json of the zone) — the same job of the launcher; the job\'s `unchanged` given back; never from a paired phone', 'F',
      tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0413 (the user: « on n\'a toujours pas de NATS retour … est-ce à ma main ? », then « on a pourtant une source … on peut donc '
      'boucher les trous »: the source carries the message IN FORCE only); the option and the age rule granted by the ergonomist in '
      'frame/aerodb/aerodb.js; AeroDB\'s three traps (force skips the « valid » test only; the anti-bounce is the failure\'s; unchanged said); '
      'a fake launcher')
def f253(c):
    c.open('fuel', docs=flight_docs())
    got = c.js("""async () => {
      const mk = (info, ageMin, unchanged) => { let jobs = 0;
        const launcher = { job: async () => { jobs++; return { result: { ok: true, files: [{ unchanged }] } } }, info: () => info, request: async () => null },
          db = window.AeroDB.create({ launcher });
        db.natState = async () => ({ present: true, readAt: ageMin === null ? null : new Date(Date.now() - ageMin * 60000).toISOString(), count: 6,
          from: '2026-11-17T11:30:00Z', validUntil: '2026-11-17T19:00:00Z', expired: false, current: 6 });
        return { db, jobs: () => jobs } };
      const A = mk({}, 10, false), a = await A.db.natEnsure(), B = mk({}, 120, false), b = await B.db.natEnsure(),
        C = mk({}, 10, true), c1 = await C.db.natEnsure({ force: true }), c2 = await C.db.natEnsure({ force: true }), // SOG-0470: a minute
        D = mk({ lan: true }, 120, false), E = mk({}, null, false), e = await E.db.natEnsure();
      await D.db.natEnsure({ force: true });
      return { a: [A.jobs(), a.refreshed], b: [B.jobs(), b.refreshed, b.unchanged], c: [C.jobs(), c1.refreshed, c1.unchanged, c2.refreshed, !!c2.retryAt], d: D.jobs(),
        e: [E.jobs(), e.refreshed] } }""")
    c.eq(got['a'], [0, False], 'valid tracks read 10 min ago, not forced: nothing asked of the launcher', what='recent')
    c.eq(got['b'], [1, True, False], 'valid tracks read 2 h ago: read again (the age rule), changed', what='old')
    c.eq(got['c'], [1, True, True, False, True], 'forced twice in a row: one read, the message said unchanged; the second refused with its '
         'retryAt (SOG-0470, Sécurisation: a minute between two forced reads)', what='forced')
    c.eq(got['d'], 0, 'a paired phone never asks the launcher', what='paired')
    c.eq(got['e'], [0, False], 'valid tracks whose read time is unknown (no updated_at): nothing asked — the age rule needs a known time', what='unknown age')



@case('F270', 'aerodb.natEnsure, the spacing (SOG-0470): tracks read more than an hour ago and a job that finds the message unchanged (it does '
      'not rewrite the read time): two calls in a row run ONE job, the second refused with its retryAt five minutes after; after five '
      'minutes, a new job; a FORCED call waits one minute only; a failed job counts as a job', 'F', tags=('fuel', 'aerodb', 'security'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0470 (Sécurisation, review of the NAT chain of 17 Nov: the guard « not two tries within 5 minutes » played only after a '
      'failure; an unchanged job leaves readAt old, so past an hour EVERY mount of Fuel or the Map launched a fetch to the NAT source); '
      'AeroDB granted this change of natEnsure only; a fake launcher and a fake clock')
def f270(c):
    c.open('fuel', docs=flight_docs())
    got = c.js("""async () => {
      let t = Date.parse('2026-11-18T12:00:00Z');
      const mk = fail => { let jobs = 0;
        const launcher = { job: async () => { jobs++; if (fail) return { result: { ok: false } }; return { result: { ok: true, files: [{ unchanged: true }] } } },
            info: () => ({}), request: async () => null },
          db = window.AeroDB.create({ launcher, now: () => t });
        // the read time stays two hours old: an unchanged job does not rewrite it
        db.natState = async () => ({ present: true, readAt: new Date(t - 7200000).toISOString(), count: 6, from: '2026-11-18T11:30:00Z',
          validUntil: '2026-11-18T19:00:00Z', expired: false, current: 6 });
        return { db, jobs: () => jobs } };
      const A = mk(false), a1 = await A.db.natEnsure(), a2 = await A.db.natEnsure(), j2 = A.jobs();
      t += 4 * 60000; const a3 = await A.db.natEnsure(), j3 = A.jobs();
      t += 61000; const a4 = await A.db.natEnsure(), j4 = A.jobs();
      const f1 = await A.db.natEnsure({ force: true }), jf1 = A.jobs();
      t += 61000; const f2 = await A.db.natEnsure({ force: true }), jf2 = A.jobs();
      const B = mk(true), b1 = await B.db.natEnsure(); t += 2 * 60000; const b2 = await B.db.natEnsure();
      return { pair: [j2, a1.refreshed, a2.refreshed, a2.retryAt || null], four: [j3, !!a3.retryAt], five: [j4, a4.refreshed],
        force: [jf1, !!f1.retryAt, jf2, f2.refreshed], failed: [B.jobs(), b1.ok, !!b2.retryAt] } }""")
    c.eq(got['pair'], [1, True, False, '2026-11-18T12:05:00.000Z'], 'two calls in a row, readAt old, job unchanged: ONE job; the second '
         'refused with its retryAt five minutes after', what='pair')
    c.eq(got['four'], [1, True], 'four minutes later: still refused, nothing asked', what='four minutes')
    c.eq(got['five'], [2, True], 'past five minutes: a new job', what='five minutes')
    c.eq(got['force'], [2, True, 3, True], 'forced at once after a job: refused; a minute later: a job (one minute for the gesture)',
         what='forced')
    c.eq(got['failed'], [1, False, True], 'a failed job counts as a job: two minutes later, refused with its retryAt', what='failed')

_KEPT_JS = """async () => { const RE = await import('/modules/fuel/route_engine.js'), J = JSON.stringify;
  const near = { minutes: 10, side: 'late', depart_until: '2026-11-18T10:00:00Z', x: 1 };
  const v = { sections: [{ proof: 'published', from: 'XAAA', to: 'XBBB', name: 'track A', nm: 812, junk: { deep: 'x'.repeat(100000) } }],
    rejected: [{ track: 'B', text: 'route NAT B : niveau', code: 'level', levels: [340, 350], entry: 'XAAA', at: '2026-11-18T12:00:00Z', point: '30W',
      from: '2026-11-18T11:30:00Z', to: '2026-11-18T19:00:00Z', near, big: 'y'.repeat(50000) }],
    depart: { basis: 'asked', time: '2026-11-18T10:00:00Z', now: false, o: { a: 1 } }, entry: { point: 'XAAA', time: '2026-11-18T12:00:00Z', z: 9 },
    direction: 'west', fl: 350, fl_basis: 'asked', noise: 1 };
  const k = RE.sectionsKept(v);
  return { size: J(k).length, section: k.sections[0], rejected: Object.keys(k.rejected[0]).sort(), near: k.rejected[0].near, depart: k.depart,
    entry: k.entry, noise: 'noise' in k, idem: J(RE.sectionsKept(k)) === J(k),
    hostile: RE.sectionsKept({ sections: [null, 'x', { from: { a: 1 }, nm: Infinity }], rejected: 'x', depart: [], fl: { a: 1 } }) } }"""


@case('F271', 'Route step, two hardenings of Sécurisation (SOG-0470): what the page keeps of the engine\'s `sections` (route_alts.json) is '
      'a WHITE LIST — the fields the proof, the level and the departure read, each a bounded simple value, nothing else (a 100 000-sign '
      'object gone); and a NAT window without its two times is not written (the direction alone, never « NaN h NaN »)', 'F',
      tags=('fuel', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0470 (Sécurisation, review of the NAT chain of 17 Nov: « sectionsKept garde des objets bruts non bornés : liste blanche des '
      'champs »; « une fenêtre sans dates affiche NaN h NaN : omets-la »); invented answers, aerodb\'s NAT state held by the case (stub)')
def f271(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_KEPT_JS)
    c.ok(r['size'] < 1500, r['size'], 'the kept sections are small: the 100 000- and 50 000-sign values are gone')
    c.eq(r['section'], {'proof': 'published', 'from': 'XAAA', 'to': 'XBBB', 'name': 'track A', 'nm': 812}, 'a section: its five read fields',
         what='section')
    c.eq(r['rejected'], ['at', 'code', 'entry', 'from', 'levels', 'near', 'point', 'text', 'to', 'track'], 'a rejected track: its read fields',
         what='rejected')
    c.eq([r['near'], r['depart'], r['entry'], r['noise'], r['idem']],
         [{'minutes': 10, 'side': 'late', 'depart_until': '2026-11-18T10:00:00Z'}, {'basis': 'asked', 'time': '2026-11-18T10:00:00Z', 'now': False},
          {'point': 'XAAA', 'time': '2026-11-18T12:00:00Z'}, False, True], 'near, departure, entry reduced to their fields; nothing else kept; '
         'kept twice gives the same', what='others')
    c.eq(r['hostile'], {'sections': [{'from': None, 'nm': None}], 'rejected': [], 'depart': None, 'entry': None, 'direction': None, 'fl': None,
                        'fl_basis': None}, 'hostile values: no throw, nothing but simple values', what='hostile')
    # a NAT window without its times: the direction alone
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.add_init_script(_NAT_STUB_ARGS)
    c.page.add_init_script("""(() => { const t = setInterval(() => { if (!window.__nat) return; clearInterval(t);
      window.__nat.st = { present: true, readAt: '2026-11-17T08:02:00.000Z', count: 2, from: '2026-11-17T11:30:00.000Z', validUntil: '2026-11-17T19:00:00.000Z', expired: false, current: 2 };
      window.__nat.tracks = [{ id: 'A', west: ['340'], east: [] }, { id: 'B', west: ['350'], east: [], from: 'not a date' }]; }, 5) })()""")
    _route_launcher(c, ['route/compute'])
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    Lx = f'{FUEL} [data-natline]'
    c.until(f"!!document.querySelector('{Lx}:not([hidden]) [data-natstate=ok]')", timeout=15000, what='the NAT line, tracks valid')
    line = c.text(f'{Lx} [data-natstate]') or ''
    c.ok('NaN' not in line and norm(tx('modules/fuel/module.js', 'natW', c.lang).replace('{t}', '').strip()) in norm(line), line,
         'westbound tracks without their times: the direction alone, no « NaN »')

# SOG-0470: the writes of route_alts.json counted where the frame's data layer stores them (IndexedDB « docs », the document's path)
_ALTS_PUTS = """(() => { window.__altsPuts = 0; const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (v, ...a) { try { if (v && v.path === 'cache/fuel/route_alts.json') window.__altsPuts++ } catch (e) {}
    return put.call(this, v, ...a) } })()"""


@case('F272', 'Route step, the list of proposed routes (SOG-0470): three quick touches on three lines tell the Map each line at once (its '
      'event) but write cache/fuel/route_alts.json ONCE, after the touches stop — never a rewrite of the whole answer per touch; the line '
      'last shown is the one written', 'F', tags=('fuel', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0470 (Sécurisation, review of the NAT chain of 17 Nov: « radOf (1 500 éléments) réécrit route_alts.json à chaque clic »); '
      'the ergonomist: a case for each hardening; a fake launcher, invented names')
def f272(c):
    c.page.add_init_script(_ALTS_PUTS)
    c.page.add_init_script("window.__altsShown = []; window.addEventListener('fuel-route-alts', e => window.__altsShown.push(e.detail?.shown ?? null))")
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'alternatives': [dict(_alt(i, f'Via {i}', _STEPS_ROUTE, 380, 350, [], sid=False)) for i in (1, 2, 3)]}
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['route'] = {'text': 'LFPO EIDW', 'dep': 'LFPO', 'arr': 'EIDW', 'manual': True,
                             'points': [{'id': 'LFPO', 'lat': 48.72, 'lon': 2.38}, {'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}]}
    c.open('fuel', docs=docs)
    to_step(c, 1)
    _compute_now(c, st)
    c.until(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length >= 2", timeout=10000, what='the proposed routes')
    c.wait(2000)  # the arrival's own write, settled
    before = c.js("window.__altsPuts")
    n = c.js(f"document.querySelectorAll('{FUEL} [data-altlist] [data-alt]').length")
    order = [1, 0, 1] if n >= 2 else [0]
    for i in order:
        c.js(f"document.querySelector('{FUEL} [data-altlist] [data-alt=\"{i}\"] [data-do=\"rshow\"], {FUEL} [data-altlist] [data-alt=\"{i}\"]').click()")
        c.wait(150)
    c.wait(2500)
    after = c.js("window.__altsPuts")
    c.eq(after - before, 1, 'three quick touches: route_alts.json written ONCE', what='writes')
    shown = (c.doc('cache/fuel/route_alts.json') or {}).get('open')
    c.eq(shown, order[-1], 'the line last shown is the one written', what='open')
    c.ok(len(c.js("window.__altsShown")) >= len(order), c.js("window.__altsShown"), 'the Map told at each touch (its event)')


# SOG-0413: the NAT stub, its natEnsure keeping the argument it received (force)
_NAT_STUB_ARGS = _NAT_STUB.replace('db.natEnsure = () => { window.__nat.asks++;', 'db.natEnsure = (o) => { window.__nat.asks++; window.__nat.args = o || null;')
_NAT_W = [{'id': t, 'west': ['340', '350'], 'east': [], 'from': '2026-11-17T11:30:00Z', 'to': '2026-11-17T19:00:00Z'} for t in 'ABCDEF']
_NAT_E = [{'id': t, 'east': ['350', '360'], 'west': [], 'from': '2026-11-18T01:00:00Z', 'to': '2026-11-18T08:00:00Z'} for t in 'RSTUVWXY']


@case('F254', 'Route step, the NAT line: the directions present and their window (« Routes NAT du 17/11 : vers l\'ouest 11 h 30 – 19 h 00 Z ; '
      'aucune vers l\'est »); « Relire les routes NAT » always there with the launcher, a FORCED read, what it brought said (« 8 routes '
      'ajoutées vers l\'est », « rien de nouveau à la source »), five minutes between two reads said', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0413 (the user: « on n\'a toujours pas de NATS retour. le bug a été corrigé ? il faut un refresh ? est-ce à ma main ? » — the line '
      'said « valides jusqu\'à 19:00Z » without saying only the westbound were there, and offered no reading while they were valid); '
      'aerodb\'s NAT state held by the case (stub)')
def f254(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.page.add_init_script(_NAT_STUB_ARGS)
    c.page.add_init_script("""(() => { const t = setInterval(() => { if (!window.__nat) return; clearInterval(t);
      window.__nat.st = { present: true, readAt: '2026-11-17T08:02:00.000Z', count: 6, from: '2026-11-17T11:30:00.000Z', validUntil: '2026-11-17T19:00:00.000Z', expired: false, current: 6 };
      window.__nat.tracks = %s; }, 5) })()""" % json.dumps(_NAT_W))
    _route_launcher(c, ['route/compute'])
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    Lx = f'{FUEL} [data-natline]'
    c.until(f"!!document.querySelector('{Lx}:not([hidden]) [data-natstate=ok]')", timeout=15000, what='the NAT line, tracks valid')
    want = (tx(T, 'natDirs', L).replace('{d}', '17/11').replace('{w}', tx(T, 'natW', L).replace('{t}', f'{_zt(L, "11", "30", True)} – {_zt(L, "19", "00")}'))
            .replace('{e}', tx(T, 'natE0', L)))
    c.eq(norm(c.text(f'{Lx} [data-natstate]') or ''), norm(want), 'the directions present and their window', what='line')
    c.eq(norm(c.text(f'{Lx} [data-do=natreread]') or ''), norm(tx(T, 'natReread', L)), '« Relire les routes NAT » with valid tracks', what='reread')
    # the time of the last read, outside any reread (the ergonomist's reading of the capture: not shown)
    c.ok(norm(tx(T, 'natReadAt', L).replace('{t}', _zt(L, '08', '02'))) in norm(c.text(f'{Lx} [data-natreadat]') or ''), c.text(Lx),
         '« lues à 08 h 02 Z »')
    c.js(f"document.querySelector('{Lx}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F254_{c.design}_390_{L}_readat.png')
    # the forced read, the message unchanged: said with its time and day
    c.tap(f'{Lx} [data-do="natreread"]')
    c.until("window.__nat.args && window.__nat.args.force === true && window.__nat.go !== null", timeout=8000, what='a FORCED natEnsure asked')
    c.js("window.__nat.go({ ...window.__nat.st, refreshed: true, ok: true, unchanged: true })")
    c.until(f"document.querySelector('{Lx} [data-natfail]')?.dataset.natfail === 'unchanged'", timeout=5000, what='the message said unchanged')
    c.ok(norm(tx(T, 'natUnchanged', L).split('{t}')[0]) in norm(c.text(f'{Lx} [data-natfail]') or '') and '17/11' in (c.text(f'{Lx} [data-natfail]') or ''),
         c.text(Lx), '« Relu à … : message du 17/11 inchangé. »')
    # one minute between two successful reads, on the screen: said, nothing asked of the source
    asks = c.js("window.__nat.asks")
    c.tap(f'{Lx} [data-do="natreread"]')
    c.until(f"document.querySelector('{Lx} [data-natfail]')?.dataset.natfail === 'soon'", timeout=5000, what='the minute said')
    c.eq(c.js("window.__nat.asks"), asks, 'nothing asked of the source within the minute', what='restraint')
    # a new opening: the forced read brings the eight eastbound tracks of the night
    c.open('fuel', docs=_nat_flight())
    to_step(c, 1)
    c.until(f"!!document.querySelector('{Lx}:not([hidden]) [data-do=natreread]')", timeout=15000, what='the line again')
    c.tap(f'{Lx} [data-do="natreread"]')
    c.until("window.__nat.args && window.__nat.args.force === true && window.__nat.go !== null", timeout=8000, what='a FORCED natEnsure asked')
    c.js("window.__nat.tracks = %s; window.__nat.go({ ...window.__nat.st, refreshed: true, ok: true })" % json.dumps(_NAT_W + _NAT_E))
    c.until(f"document.querySelector('{Lx} [data-natfail]')?.dataset.natfail === 'added'", timeout=5000, what='what the read brought')
    added = re.sub(r'\((s|n|es)\)', r'\1', tx(T, 'natAddedE', L)).replace('{n}', '8')
    c.ok(norm(added) in norm(c.text(f'{Lx} [data-natfail]') or ''), c.text(Lx), '« Relu : 8 routes ajoutées vers l\'est. »')
    # on ITS line, with its time (the ergonomist: it was glued to the sentence)
    c.ok(norm(tx(T, 'natAdded', L).split('{t}')[0]) in norm(c.text(f'{Lx} [data-natfail]') or ''), c.text(Lx), 'with the time of the read')
    c.eq(c.js(f"getComputedStyle(document.querySelector('{Lx} [data-natfail]')).display"), 'block', 'on its own line', what='own line')
    c.ok(norm(tx(T, 'natE', L).split('{t}')[0]) in norm(c.text(f'{Lx} [data-natstate]') or ''), c.text(Lx), 'the line now says the eastbound ones')
    c.js(f"document.querySelector('{Lx}').scrollIntoView({{block: 'center'}})")
    c.shot(f'F254_{c.design}_390_{L}.png')


@case('F255', 'Route step, a computed route through a point whose POSITION comes from the X-Plane of the workstation (`local: \'xplane\'` in '
      'the answer): « Prendre » it, and current_flight.json — written to the group\'s repository — carries the point\'s NAME without '
      'latitude nor longitude (marked local: xplane); the other points keep theirs', 'F', tags=('fuel', 'aerodb', 'security'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0397, Q-0079 (the X-Plane fallback of the route engine, Navigraph data: never written to the group\'s repository, SOG-0375 / '
      'Q-0061); Sécurisation: Fuel would have written the position; a fake launcher in the form of AeroDB\'s K330 (invented names and '
      'positions); counter-test: red on the parent (the position written)')
def f255(c):
    st = _route_launcher(c, ['route/compute'])
    pts = [{'id': 'EIDW', 'lat': 53.42, 'lon': -6.27}, {'id': 'ZZENA', 'lat': 54.0, 'lon': -10.0},
           {'id': 'ZZEXA', 'lat': 55.512345, 'lon': -15.123456, 'local': 'xplane'}, {'id': 'KJFK', 'lat': 40.64, 'lon': -73.78}]
    segs = [_seg('EIDW', 'ZZENA'), _seg('ZZENA', 'ZZEXA'), _seg('ZZEXA', 'KJFK')]
    alt = dict(_alt(1, 'Via ZZEXA', 'EIDW ZZENA ZZEXA KJFK', 2900, 350, segs, sid=False), points=pts)
    st['extra'] = {'alternatives': [alt], 'sections': {'taken': {'points': pts}}}
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: any(p.get('id') == 'ZZEXA' for p in (d.get('route') or {}).get('points') or []), 'the route taken, written', timeout=12000)
    pts_w = {p.get('id'): p for p in (d.get('route') or {}).get('points') or []}
    z = pts_w.get('ZZEXA') or {}
    c.ok('lat' not in z and 'lon' not in z and z.get('local') == 'xplane', z, 'ZZEXA written by name only, marked local: xplane — no position from X-Plane')
    c.ok(isinstance((pts_w.get('ZZENA') or {}).get('lat'), (int, float)), pts_w.get('ZZENA'), 'a point of the base keeps its position')
    c.ok('15.12' not in json.dumps(d) and '55.51' not in json.dumps(d), 'position text', 'no trace of the X-Plane position anywhere in the record')
    # on this workstation, the page keeps it: the route still drawn from the position held in memory
    c.ok('ZZEXA' in (c.js(f"document.querySelector('{FUEL} [data-k=rtext]').value") or ''), 'route text', 'the route keeps the point by name')
    # the path « page reloaded »: XP_SEEN empty, the route taken from the answer kept on the device (route_alts.json, raltsOfDoc) —
    # still without the position (Sécurisation's request)
    c.open('fuel', docs=_ocean_docs())
    to_step(c, 1)
    _compute_now(c, st)
    # the answer kept on the device first (route_alts.json is written after the drawing): a reload before it would find nothing to read
    c.until_doc('cache/fuel/route_alts.json', lambda d: bool(d) and 'ZZEXA' in json.dumps((d.get('answer') or {}).get('alternatives') or []),
                'the answer kept on the device', timeout=12000)
    c.page.reload(wait_until='load')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-altlist] [data-alt=\"0\"] [data-do=rtake]')", timeout=15000, what='the list read again from the device')
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: any(p.get('id') == 'ZZEXA' for p in (d.get('route') or {}).get('points') or []), 'the route taken after a reload', timeout=12000)
    z = {p.get('id'): p for p in (d.get('route') or {}).get('points') or []}.get('ZZEXA') or {}
    c.ok('lat' not in z and 'lon' not in z and '15.12' not in json.dumps(d), z, 'after a reload too: ZZEXA by name only')


# SOG-0465: an invented helipad under its list code (two letters and three digits), in the published base beside the named aerodromes
_HELI = {'icao': 'LF999', 'name': 'Helistation Test', 'lat': 45.6, 'lon': 3.1, 'elev': 200, 'type': 'HP'}


@case('F273', 'Step Flight: a helipad\'s list code (« LF999 », two letters and three digits) is a full code — proposed from its start, '
      'named under the field once typed, and written into the flight\'s route like a four-sign code', 'F', tags=('fuel', 'aerodb'),
      designs=('standard',), screens=False,
      rule='SOG-0465 (the user: the aerodrome fields « seront parfaits avec leur complétion » once the helipads are in the base); '
      'AeroDB\'s pattern ^(?:[A-Z0-9]{4}|[A-Z]{2}[0-9]{3})$ (SOG-0466 lots 1-2, route/compute ccb61fcc7); red before: the field and the '
      'route took four signs only')
def f273(c):
    c.open('fuel', flight=True, airfields=True, aero_extra={'aerodromes': NAMES_BASE + [_HELI]})
    wait_quote(c)
    to_step(c, 0)
    c.until("[...document.querySelectorAll('[data-module=fuel] .fu-adname')].every(e => e.textContent.trim())", timeout=8000,
            what='the three name lines are filled')
    # its start proposes it
    type_in(c, 'altn', 'LF99')
    wait_sug(c, 'LF99', 'the start of the list code proposes the helipad')
    c.ok(any(x.startswith('LF999') for x in sug(c)['items']), sug(c), 'LF999 is proposed')
    c.key('Escape')
    # typed in full by hand: named, then written into the route
    type_in(c, 'arr', 'LF999')
    c.until("document.querySelector('[data-module=fuel] .fu-adname[data-adline=arr]').textContent.includes('Helistation Test')",
            what='the name line names the helipad')
    cf_doc(c, lambda d: d['route'].get('arr') == 'LF999', 'the flight\'s arrival is the helipad')


@case('F274', 'The callsign field, a shared block (frame/lib/callsign_field.js): on a page without any module, with an invented aircraft '
      'registry given by the context — from two characters the callsigns that hold the text, those that start with it first, seven at '
      'most; the pick writes the callsign and fills the type with its input event; a callsign of two types fills nothing; third-party '
      'text never read as HTML; its imports stay in frame/lib', 'F', tags=('aircraft',), designs=('standard',), screens=False,
      rule='SOG-0488 (the user: « quand on saisit un callsign, on est censé avoir une complétion pour trouver le callsign et le type… en '
      'fonction de la flotte connue »; the ergonomist: a common field reused by the workshop and the assignment form); aerodb only '
      'through the context (V3 Frame\'s condition)')
def f274(c):
    run_bench(c, 'frame/lib/test/callsign_field.html')


@case('F275', 'Flight step, « Proposer un dégagement » around an arrival whose base holds NO procedures: the aerodromes are offered all '
      'the same — the closest first, « moyens non vérifiés » in their line —, never « Aucun terrain … »', 'F', tags=('fuel', 'weather'),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0494 (the user, EGGW → LQSA: « Aucun terrain entre 30 et 300 NM de l\'arrivée ne passe la piste et les moyens » — 82 '
      'aerodromes passed the runway, none had procedures in the base); the relay: an ABSENT datum never removes an aerodrome, « non '
      'vérifié » rather than nothing; invented aerodromes')
def f275(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    _prop_open(c, held={})
    B = f'{FUEL} [data-altnchk]'
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.tap(f'{B} [data-do=altnpropose]')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000,
            what='three aerodromes listed although no procedure is held')
    rows = c.js(f"[...document.querySelectorAll('{B} [data-altnprop] li[data-cand]')].map(li => [li.dataset.cand, li.textContent])")
    c.eq([r[0] for r in rows], ['XQPB', 'XQPC', 'XQPE'], 'the closest, by distance (all equally unchecked on the aids)', what='list')
    want = norm(tx(T, "aids-unread'", L, after='altnPropWhy'))
    c.ok(all(want in norm(r[1]) for r in rows), [r[1] for r in rows], 'each line says « moyens non vérifiés »')
    c.eq(c.count(f'{B} [data-altnprop][data-msg]'), 0, 'never « Aucun terrain … » (no message in place of the list)', what='none')


@case('F276', 'Procedures, the line of the UK package: a reading that finds no procedure says it in the screen\'s language, with its counts '
      '(« EGLL : aucune procédure lue — 9 document(s), 0 page(s) lue(s) sur 12 ») — never the launcher\'s English sentence; an older '
      'launcher without codes: « EGLL : aucune procédure lue. »', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=True,
      rule='the relay, 18/11 (the user saw on EGGW « no procedure could be read for this aerodrome: 9 document(s)… »): the UK line reuses '
      'the rendering already made for the codes (procNoneRead: none-read, counts, reasons; SOG-0433), no new text; invented answers')
def f276(c):
    T = 'modules/fuel/procedures_texts.js'
    D = f'{FUEL} [data-proc="dep"]'
    L = f'{D} [data-ukline]'
    c.page.add_init_script(_UK_STUB)
    _route_launcher(c, ['route/compute'])
    c.open('fuel', docs=_uk_docs())
    to_step(c, 1)
    open_foot(c, 'dep')
    c.until(f"!!document.querySelector('{D} [data-do=procukpkg]')", timeout=15000, what='the gesture of the UK package')

    def answer(ans, what):
        c.tap(f'{D} [data-do=procukpkg]')
        c.until("window.__uk.go !== null", timeout=8000, what=f'asked ({what})')
        c.js(f"window.__uk.go({ans})")
        c.until(f"!!document.querySelector('{L} [data-ukres]')", timeout=8000, what=f'the answer in the line ({what})')
        return norm(c.text(f'{L} [data-ukres]'))
    english = "no procedure could be read for this aerodrome: 9 document(s), 0 of 12 page(s) read"
    got = answer("{ ok: false, reason: 'failed', code: 'none-read', counts: { docs: 9, read: 0, pages: 12 }, reasons: [], message: '"
                 + english + "' }", 'none read, with codes')
    want = norm(tx(T, 'procNoneRead', c.lang).replace('{icao}', 'EGLL').replace('{d}', '9').replace('{read}', '0').replace('{pages}', '12')
                .replace('{why}', '').replace('{wn}', ''))
    # the frame agrees « document(s) », « page(s) lue(s) », « Dokument(e) » with the number on screen: each « (x) » of the text optional
    pat = re.sub(r'\\\(([^()\\]+)\\\)', r'(?:\1)?', re.escape(want))
    c.ok(re.fullmatch(pat, got) is not None, [got, want], 'the sentence of the card, its counts, in the screen\'s language')
    c.ok('no procedure could be read' not in got, got, 'never the launcher\'s English sentence')
    got = answer("{ ok: false, reason: 'failed', message: '" + english + "' }", 'older launcher, no codes')
    want = norm(tx(T, "none-read'", c.lang, after='procReasons').replace('{icao}', 'EGLL').replace('{m}', '').replace('{c}', '')
                .replace('{wn}', ''))
    c.eq(got, want, 'an older launcher: the short sentence of the card, never its English', what='old launcher')


@case('F277', 'The ICAO flight plan of a flight from, to or diverting to a helipad (a list code « XH418 », no ICAO indicator): ZZZZ in '
      'items 13 and 16, DEP/, DEST/ and ALTN/ in item 18 with the position and the name the base gives, in the order of appendix 2; a '
      'real ICAO indicator kept; a helipad code without any place refused', 'F', tags=('fuel',), designs=('standard',), screens=False,
      rule='SOG-0483 (the ergonomist: ZZZZ in item 13 or 16, DEP/ or DEST/ in item 18 with the name and the position as the base gives '
      'them; a real ICAO indicator first); an invented helipad')
def f277(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')  # an origin for the import of the pure module
    got = c.js("""() => import('/modules/fuel/fpl.js').then(F => {
      const base = { type: 'EC45', wake: 'L', reg: 'F-ZZHH', eobt: F.eobtOf('2026-12-31T23:55:00Z'), speedKt: 120, levelFt: 3000, eetMin: 90 },
        heli = { name: 'Hélistation Test (centre)', lat: 45.7025, lon: 4.8075 },
        a = F.message({ ...base, dep: 'XH418', arr: 'LFZZ', routeText: 'XH418 ZZPTA ZZPTB LFZZ', places: { dep: heli } }),
        b = F.message({ ...base, dep: 'LFZZ', arr: 'XH418', altn: 'XH419', routeText: 'LFZZ ZZPTA ZZPTB XH418',
          places: { arr: heli, altn: { name: 'Autre Test' } } }),
        none = F.message({ ...base, dep: 'XH418', arr: 'LFZZ', routeText: 'XH418 ZZPTA ZZPTB LFZZ' });
      const L = m => m.text.split('\\n');
      return { a: [L(a)[2], L(a)[3], L(a)[5], a.errors], b: [L(b)[4], L(b)[5], b.errors], none: none.errors,
        word: [F.placeWord(heli), F.placeWord({ lat: -33.5, lon: -70.25 }), F.placeWord({}), F.placeWord({ name: '<b>x</b>' })] };
    })""")
    c.eq(got['a'], ['-ZZZZ2355', '-N0120F030 ZZPTA DCT ZZPTB', '-PBN/B2D2 DEP/4542N00448E HELISTATION TEST CENTRE DOF/261231 REG/FZZHH)', []],
         'a departure from a helipad: ZZZZ in item 13, DEP/ with its position and its name in item 18, before DOF/; the route without it',
         what='departure')
    c.eq(got['b'], ['-ZZZZ0130 ZZZZ', '-PBN/B2D2 DEST/4542N00448E HELISTATION TEST CENTRE DOF/261231 REG/FZZHH ALTN/AUTRE TEST)', []],
         'an arrival and an alternate at helipads: ZZZZ twice in item 16; DEST/ before DOF/, ALTN/ after REG/ (a name alone when the '
         'position is unknown)', what='arrival')
    c.ok('dep' in got['none'], got['none'], 'a helipad code with no place at all: refused, never « DEP/ » empty')
    c.eq(got['word'], ['4542N00448E HELISTATION TEST CENTRE', '3330S07015W', '', 'B X B'],
         'the place: degrees and minutes always (eleven signs), the name in the message\'s alphabet', what='placeWord')


@case('F278', 'Route step, the fold of the deviations with EIGHT lines: seven, then « 1 autre » — agreed by the frame, never « 1 autres »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0468 (5), the relay: Fuel follows the plural rule of the frame (frame/lib/plural.js) instead of « n === 1 »; « {n} autres » '
      'said « 1 autres » for a list of eight; a fake launcher')
def f278(c):
    T = 'modules/fuel/module.js'
    st = _route_launcher(c, ['route/compute'])
    R = lambda kind, text, rule=None: dict({'kind': kind, 'text': text}, **({'ruleId': rule} if rule else {}))
    # F113's deviations, one fewer: eight lines
    st['check'] = _alt(1, 'Direct', 'LFRS LUGEN NEPIX LFML', 370, 270, [
        _seg('LFRS', 'LUGEN', R('RAD', 'Interdiction RAD LF1001', 'LF1001')),
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
        return {{ all: d.querySelectorAll('[data-fault]').length, more: d.querySelector('[data-faultmore] > summary')?.textContent || '' }} }})()""")
    c.eq(f['all'], 8, 'eight lines for eight deviations', what='lines')
    # the words written here, not read from the module's texts: an expectation drawn from the texts followed the defect (« {n} autres »
    # gave « 1 autres » on both sides; Essais, 18/11)
    want = {'fr': '1 autre', 'en': '1 more', 'de': '1 weitere', 'es': '1 más'}[c.lang]
    c.eq(norm(f['more']), want, '« 1 autre » / « 1 more »: the singular, agreed by the frame — never « 1 autres »', what='more')


# SOG-0374 lot C: aerodb's chart answers for an EG.. aerodrome, held by the case (invented addresses under example.test, never NATS): the
# STAR and SID charts the aerodrome's file lists (chartOnly with a kind), the chart of a choice (chartUrl), the aerodrome's page (chartsUrl,
# null until the package is read); the UK package's reading answered by the case, as in _UK_STUB
_UK_CHART_STUB = """(() => { window.__ukc = { go: null, read: false, asked: { charts: 0, only: [] } };
  const U = 'https://charts.example.test/EGLL/';
  let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
    real = v && { ...v, create: (...a) => { const db = v.create(...a);
      try {
        const f = db.fetchProcedures, eg = k => /^EG[A-Z]{2}$/.test(String(k || '').toUpperCase());
        db.fetchProcedures = (icao, o = {}) => o && o.source === 'ukpkg'
          ? new Promise(res => window.__ukc.go = r => { window.__ukc.go = null; window.__ukc.read = !!r.ok; res(r); }) : f.call(db, icao, o);
        const only = db.chartOnly, url = db.chartUrl, page = db.chartsUrl;
        db.chartOnly = (icao, o = {}) => {
          if (!eg(icao)) return only.call(db, icao, o);
          const k = o && o.kind || 'IAC';
          window.__ukc.asked.only.push(k);
          return Promise.resolve(k === 'SID' ? [{ name: 'AD 2.EGLL-6-3', runway: '', url: U + '63.pdf' }]
            : k === 'STAR' ? [{ name: 'AD 2.EGLL-7-1', runway: '', url: U + '71.pdf' }, { name: 'AD 2.EGLL-7-2', runway: '', url: U + '72.pdf' },
              { name: 'AD 2.EGLL-7-9', runway: '', url: 'javascript:alert(1)' }] : []);
        };
        db.chartUrl = proc => !eg(proc && proc.icao) ? url.call(db, proc) : Promise.resolve(proc.kind === 'RWY' ? U + 'adc.pdf'
          : proc.kind === 'SID' ? U + 'sid-' + String(proc.id).split('.')[2] + '.pdf' : null);
        db.chartsUrl = icao => !eg(icao) ? page.call(db, icao) : (window.__ukc.asked.charts++, Promise.resolve(window.__ukc.read ? U + 'page.html' : null));
      } catch (e) {}
      return db } } } }) })()"""


@case('F279', 'Procedures, an aerodrome of the United Kingdom: the SID charts (departure) and the STAR charts (arrival) of its AIP listed '
      'under the SID / STAR line, each a link named by its label, opened in a new tab — none chosen (nothing is read from them), an '
      'address other than https never a link; the chart of the runway and of a SID read in part on their line; after the package is '
      'read, the aerodrome\'s page and the charts asked again', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False,
      langs4=True,
      rule='SOG-0374 lot C (the ergonomist; Procédures 00fdedbd0: aerodb.chartOnly(icao, {kind}) and chartUrl for EG.. from the NATS file, '
      'chartsUrl null until the package is read); aerodb\'s answers held by the case, invented records and addresses')
def f279(c):
    T = 'modules/fuel/procedures_texts.js'
    D = f'{FUEL} [data-proc="dep"]'
    A = f'{FUEL} [data-proc="arr"]'
    c.page.add_init_script(_UK_CHART_STUB)
    _route_launcher(c, ['route/compute'])
    docs = _uk_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):  # a local flight: EGLL is the arrival too (its STAR charts)
            d[1]['route'].update(text='EGLL EGLL', arr='EGLL', points=[{'id': 'EGLL', 'lat': 51.47, 'lon': -0.46},
                                                                      {'id': 'EGLL', 'lat': 51.47, 'lon': -0.46}])
    c.open('fuel', docs=docs)
    to_step(c, 1)
    unfold(c, 'dep')
    c.until(f"!!document.querySelector('{D} [data-kindcharts]:not([hidden]) a[data-kindchart]')", timeout=15000,
            what='the SID charts of EGLL under the SID line')
    lab = lambda kind: norm(tx(T, 'procKindCharts', c.lang).replace('{kind}', kind))
    links = lambda sel: c.js(f"[...document.querySelectorAll('{sel} [data-kindcharts] a')].map(a => [a.textContent, a.getAttribute('href'), "
                             f"a.target, a.rel])")
    c.ok(norm(c.text(f'{D} [data-kindcharts]')).startswith(lab('SID')), c.text(f'{D} [data-kindcharts]'), '« Cartes SID de l’AIP : » '
         'in the screen\'s language')
    c.eq(links(D), [['AD 2.EGLL-6-3', 'https://charts.example.test/EGLL/63.pdf', '_blank', 'noopener noreferrer']],
         'one link per chart, named by its label, new tab, noopener', what='SID charts')
    c.eq(c.count(f'{D} select option[value^="__chart"]'), 0,
         'never a choice of the list', what='not chosen')
    unfold(c, 'arr')
    c.until(f"!!document.querySelector('{A} [data-kindcharts]:not([hidden]) a[data-kindchart]')", timeout=15000,
            what='the STAR charts of EGLL under the STAR line')
    c.ok(norm(c.text(f'{A} [data-kindcharts]')).startswith(lab('STAR')), c.text(f'{A} [data-kindcharts]'), '« Cartes STAR de l’AIP : »')
    c.eq([x[:2] for x in links(A)], [['AD 2.EGLL-7-1', 'https://charts.example.test/EGLL/71.pdf'],
                                     ['AD 2.EGLL-7-2', 'https://charts.example.test/EGLL/72.pdf']],
         'the two https charts; « javascript: » never a link', what='STAR charts')
    c.eq(c.count(f'{FUEL} [data-kindcharts] a[href^="javascript"]'), 0, 'no javascript: address anywhere', what='guard')
    asked = c.js("window.__ukc.asked.only")
    c.ok('SID' in asked and 'STAR' in asked, asked, 'aerodb asked for the SID and STAR charts of EGLL (chartOnly with a kind)')
    # the runway and the SID read in part: their chart on their line (chartUrl, as for the SIA)
    pick_proc(c, 'p-dep-sid', 'EGLL.SID.XMODA1J.RW09L.NONE')
    if not c.js(f"document.querySelector('{D} select[data-k=p-dep-rwy]')?.value"):  # the SID's runway, when the SID did not set it
        pick_proc(c, 'p-dep-rwy', c.js(f"[...document.querySelectorAll('{D} select[data-k=p-dep-rwy] option')].map(o => o.value)"
                                       f".find(v => /09L/.test(v)) || ''"))
    c.until(f"!!document.querySelector('{D} [data-chart-slot=rwy] a[data-chart=RWY]') && "
            f"!!document.querySelector('{D} [data-chart-slot=main] a[data-chart=SID]')", timeout=10000, what='the chart of the runway and of the SID')
    c.eq([c.js(f"document.querySelector('{D} [data-chart-slot={r}] a').getAttribute('href')") for r in ('rwy', 'main')],
         ['https://charts.example.test/EGLL/adc.pdf', 'https://charts.example.test/EGLL/sid-XMODA1J.pdf'], 'ADC and the SID\'s chart',
         what='chosen charts')
    # one side unfolded at a time (§ 10.31): the departure for its shots, then the arrival unfolded for its own (the STAR line SEEN)
    c.js(f"document.querySelector('{D} [data-kindcharts]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F279_{c.design}_390_{c.lang}_dep.png')
    unfold(c, 'arr')
    c.ok(c.shown(f'{A} [data-kindcharts]'), 'hidden', 'the STAR charts SEEN once the arrival is unfolded')
    c.js(f"document.querySelector('{A} [data-kindcharts]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F279_{c.design}_390_{c.lang}_arr.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'start'}})")
    c.shot(f'F279_{c.design}_1280_{c.lang}_arr.png')
    unfold(c, 'dep')
    c.js(f"document.querySelector('{D}').scrollIntoView({{block: 'start'}})")
    c.shot(f'F279_{c.design}_1280_{c.lang}_dep.png')
    # before the package is read: no « Cartes » page (chartsUrl null); after a reading, asked again and shown
    open_foot(c, 'dep')
    c.eq(c.count(f'{D} [data-source-slot] a[data-charts]'), 0, 'no page of the aerodrome before the package is read', what='before')
    n = c.js("window.__ukc.asked.charts")
    c.tap(f'{D} [data-do=procukpkg]')
    c.until("window.__ukc.go !== null", timeout=8000, what='the package asked')
    c.js("window.__ukc.go({ ok: true, procedures: [] })")
    c.until(f"!!document.querySelector('{D} [data-source-slot] a[data-charts]')", timeout=10000,
            what='the page of the aerodrome, asked again after the reading')
    c.ok(c.js("window.__ukc.asked.charts") > n, c.js("window.__ukc.asked.charts"), 'chartsUrl asked again after the reading')


# SOG-0468 (1): a browser where copying cannot work (a tablet outside a secure context: no navigator.clipboard, execCommand refused)
_NO_COPY = """(() => { try { Object.defineProperty(navigator, 'clipboard', { get: () => undefined, configurable: true }) } catch (e) {}
  document.execCommand = () => false })()"""


@case('F280', 'Route step, « Copier pour Eurocontrol » where copying cannot work (no clipboard, the fallback refused): the text is SHOWN '
      'and the one notification says « copiez-le à la main » as a warning — never « Plan de vol copié »', 'F', tags=('fuel',),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0468 (1) (V3 Frame, the relay: Fuel said « ok » on \'shown\'; copyAndTell of frame/lib/clipboard.js, 0ac4d975b); the copy '
      'of the diagnostic goes through copyAndTell; invented flight')
def f280(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    c.page.add_init_script(_NO_COPY)
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['planned_at'] = '2026-11-18T09:30:00Z'
    c.page.set_viewport_size({'width': 390, 'height': 667})
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    c.eq(c.js("[typeof navigator.clipboard, document.execCommand('copy')]"), ['undefined', False], 'the browser cannot copy (the case\'s '
         'set-up)', what='set-up')
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{FUEL} [data-do=fplcopy]')
    c.until("(window.__notes || []).length > window.__n0", timeout=5000, what='the notification of the copy')
    got = [norm(x) for x in c.js("(window.__notes || []).slice(window.__n0)")]
    want = {'fr': 'Copie impossible ici : le texte est affiché, copiez-le à la main.',
            'en': 'Copying is not possible here: the text is shown, copy it by hand.',
            'de': 'Kopieren ist hier nicht möglich: Der Text wird angezeigt, kopieren Sie ihn von Hand.',
            'es': 'No se puede copiar aquí: el texto se muestra, cópielo a mano.'}[L]
    c.eq(len(got), 1, 'ONE notification (SOG-0422 a)', what='one note')
    c.ok(got[0].startswith(norm(want)), got, '« copiez-le à la main », the words written here (never read from the module)')
    copied = {'fr': 'Plan de vol copié', 'en': 'Flight plan copied', 'de': 'Flugplan kopiert', 'es': 'Plan de vuelo copiado'}[L]
    c.ok(copied not in got[0], got, 'never « Plan de vol copié »')


@case('F282', 'The ICAO flight plan keeps the airways whose name looks like a speed — « M189 », « N866 », « M140 » — between their points: never '
      '« DCT » in their place; the true speed-level groups (« N0236F270 », « M082F350 ») stay groups', 'F', tags=('fuel', 'maps'),
      designs=('standard',), screens=False,
      rule='SOG-0513 (the user\'s IFPS of 19 Nov, ROUTE165 « DCT HAWKE..NEVIL »; AeroDB\'s replay: the engine wrote « HAWKE M189 NEVIL »): '
      'frame/lib/route_text.js read a bare « M189 » as a speed group and dropped it; invented points around real airway names')
def f282(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')  # an origin for the import of the pure modules
    got = c.js("""() => Promise.all([import('/modules/fuel/fpl.js'), import('/frame/lib/route_text.js')]).then(([F, RT]) => [
      F.item15('XDEP DCT XPA L612 XPB M189 XPC/F270 N866 XPD M140 XPE DCT XARR', { dep: 'XDEP', arr: 'XARR', speedKt: 236, levelFt: 27000 }).route,
      RT.tokenize('N0236F270 XPA M082F350 XPB K0800A045 XPC N0450 XPD M189 XPE').map(t => t.kind === 'group' ? 'group' : t.id)])""")
    c.eq(got[0], 'N0236F270 XPA L612 XPB M189 XPC N866 XPD M140 XPE', 'item 15: each airway between its points, no DCT in place of M189, N866, '
         'M140 (the group of XPC is the one in force: not written twice)', what='item 15')
    c.eq(got[1], ['group', 'XPA', 'group', 'XPB', 'group', 'XPC', 'group', 'XPD', 'M189', 'XPE'], 'the true groups stay groups, a bare « M189 » is '
         'a name', what='tokens')


# SOG-0517: AeroDB's answer for the user's flight (EGLL → LFRN, FL270, 236 kt)
_S0517_ENGINE = ('EGLL DCT MID L612 BOGNA L612 BENBO L612 HAWKE M189 NEVIL/F270 UZ273 ANGLO/F190 UZ273 DIKRO G273 RAVIG T501 LUKEM T493 '
                 'UPALO V20 LUVOP DCT LFRN')


@case('F283', 'Route step: « Calculer A → B » computes at the flight\'s level — the level of the flight, else the one of the quote (the sheet\'s '
      'reference level), sent as `fl`; a flight with no level at all takes the level the engine computed at (FL180 by default), written '
      'in the flight and said; a route taken keeps the engine\'s text, and its flight plan its airways and level changes', 'F',
      tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0517 (measured in the user\'s Chrome: an empty route computed with NO level — the engine took FL180 while the flight was '
      'filed at FL270, its low airways wrong at FL270; the user: « il faut le fixer, s\'il est vide, puisque la route est calculée à ce '
      'niveau »); fake launcher, invented flight and sheet')
def f283(c):
    # 1. the flight plan of AeroDB's answer, as it is: each airway, the change to F190 as « ANGLO/N0236F190 » (speed AND level, ICAO)
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    fpl = c.js("""(t) => import('/modules/fuel/fpl.js').then(F => F.item15(t, { dep: 'EGLL', arr: 'LFRN', speedKt: 236, levelFt: 27000 }).route)""",
               _S0517_ENGINE)
    c.eq(fpl, 'N0236F270 MID L612 BOGNA L612 BENBO L612 HAWKE M189 NEVIL UZ273 ANGLO/N0236F190 UZ273 DIKRO G273 RAVIG T501 LUKEM T493 UPALO '
         'V20 LUVOP', 'item 15 of the engine\'s text: M189 kept, the change to F190 with its speed (NEVIL/F270, the level in force, not '
         'written twice)', what='item 15')
    st = _route_launcher(c, ['route/compute'])

    def opened(level, aircraft, extra):
        docs = proc_flight()
        for d in docs:
            if d[0].endswith('current_flight.json'):
                d[1]['aircraft'] = aircraft
                if level:
                    d[1]['level'] = {'ft': level}
                else:
                    d[1].pop('level', None)
        open_docs = proc_docs() + docs + extra
        c.open('fuel', docs=open_docs, airfields=True)
        to_step(c, 1)
        c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')

    def asked():
        n = len(st['posts'])
        c.tap(f'{FUEL} [data-do="rcompute"]')
        for _ in range(40):
            got = [p.get('args') or {} for p in st['posts'][n:] if (p.get('args') or {}).get('action') == 'compute']
            if got:
                return got[0]
            c.wait(150)
        raise Fail('no compute request', 'a request to route/compute', 'none')
    # 2a. the flight's level is sent
    opened(27000, {'type': 'C30J', 'registration': 'F-RAJA'}, [])
    c.eq(asked().get('fl'), 270, 'the flight\'s level FL270 sent', what='flight level')
    # 2b. no level in the flight: the quote's (the sheet's reference level, FL250) is sent — never the engine's default in silence
    sheet = {'id': 'XT1', 'name': 'Essai', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
             'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'refAltFt': 25000}}
    opened(0, {'type': 'C30J', 'sheetId': 'XT1', 'registration': 'F-RAJA'}, [['aircraft/sheets/XT1.json', sheet, 'document']])
    c.eq(asked().get('fl'), 250, 'no level in the flight: the level of the quote (FL250) sent', what='quote level')
    # 2c. no level and no quote: the engine takes its own (FL180), written in the flight and said
    st['extra'] = {'sections': {'fl': 180, 'fl_basis': 'default', 'sections': []}}
    opened(0, {'type': 'ZZ9Z', 'registration': 'F-ZZZZ'}, [])
    c.js("window.__n0 = (window.__notes || []).length")
    a = asked()
    c.eq(a.get('fl'), None, 'no level anywhere: none sent (the engine takes its own)', what='no fl')
    d = cf_doc(c, lambda d: ((d.get('level') or {}).get('ft') or 0) == 18000, 'the level the engine computed at, written in the flight')
    c.eq((d.get('level') or {}).get('ft'), 18000, 'the flight now carries FL180, the level of its route', what='written')
    c.until("(window.__notes || []).slice(window.__n0).some(x => x.includes('FL180'))", timeout=5000, what='said (FL180)')
    st['extra'] = None
    c.js(f"document.querySelector('{FUEL} [data-reng]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F283_{c.design}_390_{c.lang}_level.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.js(f"document.querySelector('{FUEL} [data-reng]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F283_{c.design}_1280_{c.lang}_level.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    # 3. a route taken keeps the engine's text word for word
    c.until(f"!!document.querySelector('{FUEL} [data-alt=\"0\"] [data-do=rtake]')", timeout=10000, what='the first route of the answer')
    c.tap(f'{FUEL} [data-alt="0"] [data-do="rtake"]')  # data-alt counts from 0: the first route, « Via UN10 »
    d = cf_doc(c, lambda d: ((d.get('route') or {}).get('from') == 'engine'), 'the route taken, written')
    c.eq((d.get('route') or {}).get('text'), 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 'the engine\'s text kept word for word', what='verbatim')


@case('F284', 'Route step: only the points the pilot TYPED (and the mission locks) are imposed on « Calculer A → B » — a route already in the '
      'field never carries itself over, a route taken imposes nothing on the next computation; the line under the buttons names the imposed '
      'passages', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0517 (AeroDB: routeArgs sent every point of the Route field as `via`, an old route carried itself over; the relay, 10 h: '
      '« seuls les noms tapés et les verrous de mission »); fake launcher, invented flight')
def f284(c):
    st = _route_launcher(c, ['route/compute'])
    open_proc(c)
    c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')

    def via():
        n = len(st['posts'])
        c.tap(f'{FUEL} [data-do="rcompute"]')
        for _ in range(40):
            # the head request only: the request of the VARIANTS of an earlier computation (alternatives: true) may arrive later, with the
            # input of its own time
            got = [p.get('args') or {} for p in st['posts'][n:] if (p.get('args') or {}).get('action') == 'compute'
                   and not (p.get('args') or {}).get('alternatives')]
            if got:
                return got[0].get('via', [])
            c.wait(150)
        raise Fail('no compute request', 'a request to route/compute', 'none')
    # the route already in the field (LUGEN, NEPIX): nothing typed, nothing imposed
    c.eq(via(), [], 'a route already in the field: no imposed passage (it does not carry itself over)', what='old route')
    c.eq(c.count(f'{FUEL} [data-rvia]:not([hidden])'), 0, 'no « Passages imposés » line', what='no line')
    # the pilot types a passage: imposed, and named
    c.page.fill(f'{FUEL} [data-k="rtext"]', '')
    c.page.fill(f'{FUEL} [data-k="rtext"]', 'LFRS LUGEN LFML')
    c.page.locator(f'{FUEL} [data-k="rtext"]').blur()
    c.until(f"!!document.querySelector('{FUEL} [data-rvia]:not([hidden])')", timeout=8000, what='the line of the imposed passages')
    c.ok('LUGEN' in (c.text(f'{FUEL} [data-rvia]') or ''), c.text(f'{FUEL} [data-rvia]'), 'the line names LUGEN')
    c.js(f"document.querySelector('{FUEL} [data-reng]').scrollIntoView({{block: 'center'}})")
    c.shot(f'F284_{c.design}_390_{c.lang}_imposed.png')
    c.eq(via(), ['LUGEN'], 'a passage the pilot typed is imposed', what='typed')
    # a route taken: nothing imposed next time
    c.until(f"!!document.querySelector('{FUEL} [data-alt=\"1\"] [data-do=rtake]')", timeout=10000, what='the first route of the answer')
    c.tap(f'{FUEL} [data-alt="1"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: ((d.get('route') or {}).get('from') == 'engine'), 'the route taken, written')
    c.eq((d.get('route') or {}).get('typed'), [], 'a route taken imposes nothing', what='typed reset')
    c.until(f"!document.querySelector('{FUEL} [data-rvia]:not([hidden])')", timeout=8000, what='no « Passages imposés » line after a route taken')
    c.eq(via(), [], 'the next computation is free: the route taken does not carry itself over', what='after take')


# SOG-0514: an invented BE9L sheet (a slow turboprop: cruise 220 kt, climb about 1 200 ft/min, descent 1 000 ft/min)
_BE9L = {'id': 'BE9L', 'name': 'BE9L (essai)', 'icao': 'BE9L', 'unit': 'kg', 'usableFuel': 1200,
         'cruise': {'tasKt': 220, 'fuelFlowPerHour': 250, 'ceilingFt': 30000},
         'climb': {'rateFpm': 1200, 'tasKt': 160, 'fuelFlowPerHour': 300},
         'descent': {'rateFpm': 1000, 'tasKt': 200, 'fuelFlowPerHour': 150}}


# the frame's floating notes closed (their ✕), until none comes for 0.6 s: a capture for the relay shows the screen, not the notes
_F281_NOTES_OFF = """async () => { let calm = 0; for (let i = 0; i < 40 && calm < 4; i++) { const x = document.querySelector('#fNotes .f-note [data-x]');
  if (x) { x.click(); calm = 0 } else calm++; await new Promise(r => setTimeout(r, 150)) } return document.querySelectorAll('#fNotes .f-note').length }"""


@case('F281', 'Route step, « Calculer » and « Contrôler » send the aircraft\'s speeds to the engine: speed_kt (cruise TAS, no wind), climb_fpm and '
      'descent_fpm (the AVERAGE rate up to the filed level, the same figures as the profile written for the Map) — whole numbers; an aircraft '
      'without known performance sends NONE of them (the engine\'s defaults) and the screen says « vitesses par défaut du moteur »', 'F',
      tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0514 (AeroDB, 19 Nov, reproducing the IFPS of SOG-0513: without them the engine takes 2 000 ft/min and judges a slow aircraft '
      'as a fast one); AeroDB\'s answer: the average rate up to the filed level, the TAS without wind; invented sheet, fake launcher')
def f281(c):
    st = _route_launcher(c, ['route/compute'])

    def opened(aircraft, extra):
        docs = proc_flight()
        for d in docs:
            if d[0].endswith('current_flight.json'):
                d[1]['aircraft'] = aircraft
                d[1]['level'] = {'ft': 20000}
        c.open('fuel', docs=proc_docs() + docs + extra, airfields=True)
        to_step(c, 1)
        c.until(f"!!document.querySelector('{FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')

    def asked(act):
        n = len(st['posts'])
        c.tap(f'{FUEL} [data-do="{"rcompute" if act == "compute" else "rcheck"}"]')
        for _ in range(40):
            got = [p.get('args') or {} for p in st['posts'][n:] if (p.get('args') or {}).get('action') == act]
            if got:
                return got[0]
            c.wait(150)
        raise Fail(f'no {act} request', 'a request to route/compute', 'none')

    keys = ('speed_kt', 'climb_fpm', 'descent_fpm', 'terminal_speed_kt')
    # 1. a BE9L with its sheet: the four... three fields (no APD in the base of the case: no terminal speed, nothing invented)
    opened({'type': 'BE9L', 'sheetId': 'BE9L', 'registration': 'F-ZZBE'}, [['aircraft/sheets/BE9L.json', _BE9L, 'document']])
    d = cf_doc(c, lambda d: bool((d.get('profile') or {}).get('climbFpm')), 'the profile of the quote written for the Map')
    prof = d['profile']
    for act in ('compute', 'check'):
        a = asked(act)
        got = {k: a.get(k) for k in keys}
        c.ok(all(isinstance(got[k], int) and got[k] > 0 for k in keys[:3]), got, f'{act}: speed_kt, climb_fpm, descent_fpm, whole positive numbers')
        c.ok(150 <= got['speed_kt'] <= 260, got, f'{act}: the cruise TAS of the BE9L (about 220 kt), never the engine\'s 450')
        c.ok(abs(got['climb_fpm'] - prof['climbFpm']) <= 10 and abs(got['descent_fpm'] - prof['descentFpm']) <= 10, [got, prof],
             f'{act}: the average rates up to the filed level, the same as the profile written for the Map')
        c.ok(got['climb_fpm'] < 2000 and got['descent_fpm'] < 2000, got, f'{act}: a slow aircraft, never the engine\'s 2 000 ft/min')
        c.eq(got['terminal_speed_kt'], None, f'{act}: no APD sheet in the base: no terminal speed (nothing invented)', what=f'{act} terminal')
    c.eq(c.count(f'{FUEL} [data-rdefperf]'), 0, 'with its performance: no « vitesses par défaut »', what='no default line')
    c.js(_F281_NOTES_OFF)
    c.shot(f'F281_{c.design}_{c.lang}_perf.png')  # for the relay: the route step with the aircraft's speeds (no line)
    # 2. an aircraft whose performance is unknown (no sheet): no field at all, and the screen says the engine's defaults are used
    opened({'type': 'ZZ9Z', 'registration': 'F-ZZZZ'}, [])
    a = asked('compute')
    c.eq({k: a.get(k) for k in keys if k in a}, {}, 'without performance: none of the four fields (the engine\'s defaults)', what='no fields')
    c.until(f"!!document.querySelector('{FUEL} [data-rdefperf]')", timeout=8000, what='« vitesses par défaut du moteur » said')
    want = {'fr': 'Vitesses par défaut du moteur', 'en': 'Engine default speeds', 'de': 'Standardgeschwindigkeiten der Engine',
            'es': 'Velocidades por defecto del motor'}[c.lang]
    c.ok(norm(want) in norm(c.text(f'{FUEL} [data-rdefperf]') or ''), c.text(f'{FUEL} [data-rdefperf]'), 'said in words (written here, never read from the module)')
    c.js(_F281_NOTES_OFF)
    c.js(f"document.querySelector('{FUEL} [data-rdefperf]').scrollIntoView({{ block: 'center' }})")  # the line on screen, clear of the sticky bar
    c.wait(300)
    c.shot(f'F281_{c.design}_{c.lang}_default.png')  # for the relay: the line « Vitesses par défaut du moteur »


@case('F286', 'Route step, a flight whose level was emptied: « Calculer A → B » leaves at the level of the aircraft sheet (FL250), and that '
      'level is WRITTEN in the flight — the Level field of the first step shows it, the variants leave with it, and it is said',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0517, refused at acceptance (the user, 19 Nov: « j\'ai vidé le niveau de vol. j\'ai calculé. accepté. le niveau de vol n\'est '
      'pas renseigné dans la page 1. le profil est donc incohérent »); the relay: the level sent to the computation is ALWAYS written in '
      'the flight and shown on the first step, from the sheet or the engine\'s FL180, with the notification; fake launcher, invented sheet')
def f286(c):
    st = _route_launcher(c, ['route/compute'])
    sheet = {'id': 'XT1', 'name': 'Essai', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
             'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'refAltFt': 25000}}
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J', 'sheetId': 'XT1', 'registration': 'F-RAJA'}
            d[1].pop('level', None)  # the level emptied
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs + [['aircraft/sheets/XT1.json', sheet, 'document']], airfields=True)
    to_step(c, 1)
    c.js("window.__n0 = (window.__notes || []).length")
    sent = _compute_now(c, st)
    c.eq(sent[0].get('fl'), 250, 'the level of the sheet (FL250) sent', what='sent')
    d = cf_doc(c, lambda d: ((d.get('level') or {}).get('ft') or 0) == 25000, 'the level sent, written in the flight')
    c.eq((d.get('level') or {}).get('ft'), 25000, 'the flight carries FL250, the level its route was computed at', what='written')
    c.until("(window.__notes || []).slice(window.__n0).some(x => x.includes('FL250'))", timeout=5000, what='said (FL250)')
    c.ok(all(a.get('fl') == 250 for a in sent[1:]), [a.get('fl') for a in sent], 'the variants leave with FL250')
    to_step(c, 0)  # the first step: its Level field
    F = f'{FUEL} input[data-k="fl"]'
    c.until(f"!!document.querySelector('{F}')", timeout=8000, what='the Level field')
    c.ok('250' in (c.js(f"document.querySelector('{F}').value") or ''), c.js(f"document.querySelector('{F}').value"),
         'the Level field of the first step shows FL250')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)  # the notes closed: the capture shows the field
        c.js(f"document.querySelector('{F}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F286_{c.design}_{w}_{c.lang}_level.png')


@case('F285', 'A reading whose procedures were ALL refused by the check, said in the screen\'s language from the launcher\'s code '
      '(« all-refused »): how many were refused, how many pages were read, the reasons — never « La lecture a échoué »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0374 (c) (the user\'s case: EGLL, 6 pages read of 15, 24 procedures refused, said « La lecture de EGLL a échoué »); the contract '
      'of Procédures: { reason: failed, code: all-refused, counts { docs, read, pages, refused }, reasons [[code, n]] }, the same form as '
      '« none-read » (F258) with `refused`; the expected sentence WRITTEN here, its plurals agreed with the number before them')
def f285(c):
    c.page.add_init_script("""(() => { let real; Object.defineProperty(window, 'AeroDB', { configurable: true, get: () => real, set: v => {
        real = v && { ...v, create: (...a) => { const db = v.create(...a);
          try { db.fetchProcedures = async () => ({ ok: false, reason: 'failed', code: 'all-refused', counts: { docs: 15, read: 6, pages: 15, refused: 24 },
            reasons: [['no-legs', 4], ['<b>x</b>', 2]], message: 'every procedure read was refused by the check' }) } catch (e) {}
          return db } } } }) })()""")
    open_proc(c)
    wait_rows(c, 'arr')
    open_foot(c, 'arr')
    c.tap(f'{FUEL} [data-proc="arr"] [data-do="procfetch"][data-again]')
    want = {'fr': 'LFML : 24 procédures lues mais refusées par le contrôle — 6 pages lues sur 15',
            'en': 'LFML: 24 procedures read but refused by the check — 6 of 15 pages read',
            'de': 'LFML: 24 Verfahren gelesen, aber von der Prüfung abgelehnt — 6 von 15 Seiten gelesen',
            'es': 'LFML: 24 procedimientos leídos pero rechazados por el control — 6 de 15 páginas leídas'}[c.lang]
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", norm(want), timeout=8000,
            what=f'the failure said « {want} … »')
    note = next(norm(n) for n in c.note_log() if norm(want) in norm(n))
    legs = norm(tx('frame/aerodb/catalogue.js', "no-legs'", c.lang, after='READ_REASONS = {'))
    c.ok(f'({legs} ×4)' in note, note, 'the reason by the catalogue, with its count')
    c.ok('<b>' not in note and 'every procedure' not in note, note, 'a reason code outside the form dropped; never the launcher\'s English sentence')


# SOG-0528: an invented arrival far from the alternate XQAL (43.45, 3.62): about 420 NM, beyond the 300 NM of an alternate
_FAR_AD = {'icao': 'XQNR', 'name': 'XQNR TEST', 'lat': 50.5, 'lon': 3.1, 'elev': 40, 'hardLen': 2500}


@case('F287', 'Flight step: the alternate already chosen is judged again when the arrival changes — beyond 300 NM of the new arrival (the '
      'rule of the proposal), its line says « ne convient pas » with the reason « distance »; the alternate stays in the flight, marked, '
      'never removed; back to the first arrival, the line is good again', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=True, langs4=True,
      rule='SOG-0528 (the user, 19 Nov: « LFMT - LFRN - LFFI, c\'est valable. si on change lfrn par lfqq, lffi n\'est pas annoncé comme '
      'non valable »); the relay: every change of departure, arrival, aircraft or time judges the chosen alternates again with the existing '
      'rules; one no longer suitable is MARKED with its reason, never removed in silence; invented aerodrome XQAL, sheet and TAF')
def f287(c):
    T = 'modules/fuel/module.js'
    line = f'{FUEL} [data-altnchk] .fu-altnline'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 844})
        _altn_open(c, 2500, 2, 'VFR', 5000, more_ads=[_FAR_AD])  # LFRS → LFML, alternate XQAL about 70 NM from LFML: good
        c.until(f"document.querySelector('{line}')?.dataset.state === 'ok'", timeout=20000, what=f'{w} px: the line good with LFML')
        c.eq(c.count(f'{FUEL} [data-altnchk] li[data-crit=dist]'), 0, 'within the bounds: nothing said of the distance', what='in range')
        # the arrival changed to XQNR (invented, about 420 NM from XQAL): the alternate is judged again
        c.page.fill(f'{FUEL} input[data-k="arr"]', 'XQNR')
        c.page.locator(f'{FUEL} input[data-k="arr"]').dispatch_event('change')
        c.until(f"document.querySelector('{line}')?.dataset.state === 'err'", timeout=20000, what=f'{w} px: the line « ne convient pas »')
        c.eq(c.js(f"document.querySelector('{FUEL} [data-altnchk] li[data-crit=dist]')?.dataset.state"), 'err',
             'the reason: the distance from the new arrival', what='dist')
        head = norm(c.text(f'{FUEL} [data-altnchk] [data-altnhead]') or '')
        c.ok(norm(tx(T, 'dist', c.lang, after='altnK: {')) in head, head, 'the sentence names the distance')
        d = cf_doc(c, lambda d: ((d.get('route') or {}).get('arr') == 'XQNR'), 'the arrival written')
        c.eq((d.get('route') or {}).get('altn'), _ALT_ID, 'the alternate stays in the flight, marked, never removed', what='kept')
        c.js(f"document.querySelector('{FUEL} [data-altnchk]').scrollIntoView({{block: 'center'}})")
        c.js(_F281_NOTES_OFF)
        c.shot(f'F287_{c.design}_{w}_{c.lang}_far.png')
        # back to LFML: good again
        c.page.fill(f'{FUEL} input[data-k="arr"]', 'LFML')
        c.page.locator(f'{FUEL} input[data-k="arr"]').dispatch_event('change')
        c.until(f"document.querySelector('{line}')?.dataset.state === 'ok'", timeout=20000, what=f'{w} px: good again with LFML')


@case('F288', 'Route step, « Copier pour Eurocontrol »: item 15 is NEVER empty — a route that is only the departure and the arrival is a '
      'direct, written « DCT »; the fold and the copy say what to do (« no route computed between … : compute one or type it ») and that '
      'its length, directs being limited by Eurocontrol according to the region (no prediction: the own sentences of the route check when it '
      'judged the route)', 'F', tags=('fuel',), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0529 (2) (the user passed the IFPS a plan with an EMPTY route field, LFBY → LFST at FL090: « EFPM214: MISSING ROUTE DATA »; '
      'the copy had refused « route vide », but the review fold showed the whole text, its item 15 ending at the speed-level group, and '
      'it was copied from there by hand); the relay: never written empty, « DCT » for a direct, say what to do; nothing invented: the '
      'judgement of the route check of AeroDB when there is one, else the length only')
def f288(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js("""() => import('/modules/fuel/fpl.js').then(F => {
      const r = F.item15('LFBY LFST', { dep: 'LFBY', arr: 'LFST', speedKt: 236, levelFt: 9000 }),
        m = F.message({ type: 'C30J', wake: 'M', dep: 'LFBY', arr: 'LFST', reg: 'F-RAJA', eobt: F.eobtOf('2026-12-31T10:00:00Z'),
          speedKt: 236, levelFt: 9000, routeText: 'LFBY LFST', eetMin: 120 });
      return [r.route, r.direct, m.errors, m.text.split('\\n')[3], m.notes.direct,
        F.item15('LFBY XPA LFST', { dep: 'LFBY', arr: 'LFST', speedKt: 236, levelFt: 9000 }).direct];
    })""")
    c.eq(got[:2], ['N0236F090 DCT', True], 'a route of the departure and the arrival only: item 15 « DCT », said direct', what='item 15')
    c.ok('route' not in got[2], got[2], 'never refused as « route vide » any more: the field is never empty')
    c.eq(got[3], '-N0236F090 DCT', 'the message line of item 15 is never the speed-level group alone', what='message')
    c.eq(got[4:], [True, False], 'a route through a point is no direct', what='direct')
    # the screen: the flight LFRS → LFML (about 370 NM) with the route of its two ends only
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            pts = d[1]['route']['points']
            d[1]['route']['text'] = 'LFRS LFML'
            d[1]['route']['points'] = [pts[0], pts[-1]]
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=docs)
    wait_quote(c)
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    c.js(f"document.querySelector('{FUEL} [data-fpl] details[data-fplfold]').open = true")
    text = c.text(f'{FUEL} [data-fpl] [data-fpltext]') or ''
    c.ok(any(re.fullmatch(r'-N\d{4}F\d{3} DCT', l.strip()) for l in text.split('\n')), text, 'the review fold: item 15 « DCT », never empty')
    want = {'fr': ('Aucune route calculée entre LFRS et LFML : calculez-en une ou saisissez-la',
                   'les directs sont limités par Eurocontrol selon la région'),
            'en': ('No route computed between LFRS and LFML: compute one or type it',
                   'directs are limited by Eurocontrol according to the region'),
            'de': ('Keine Route zwischen LFRS und LFML berechnet: berechnen oder eingeben',
                   'Direktflüge sind von Eurocontrol je nach Region begrenzt'),
            'es': ('Ninguna ruta calculada entre LFRS y LFML: calcule una o escríbala', 'Eurocontrol limita los directos según la región')}[c.lang]
    notes = norm(c.text(f'{FUEL} [data-fpl] [data-fplnotes]') or '')
    c.ok(all(norm(w) in notes for w in want), notes, 'the fold says what to do, and the length of the direct (no prediction)')
    c.ok(re.search(r'\b3[5-9]\d NM\b', notes) is not None and 'probab' not in notes.lower(), notes,
         'the length of the direct said (LFRS → LFML, about 370 NM), never « probably refused »')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]').getAttribute('aria-disabled')"), None,
         'the copy is offered (a direct is a route)', what='copy')
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{FUEL} [data-fpl] [data-do="fplcopy"]')
    c.until("(w) => (window.__notes || []).slice(window.__n0).some(n => n.replace(/[\s\u00a0\u202f]+/g, ' ').includes(w))", norm(want[0]),
            timeout=6000, what='the copy says what to do')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{FUEL} [data-fpl]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F288_{c.design}_{w}_{c.lang}_direct.png')


@case('F289', 'Flight step, the line of the alternate: when its AIDS are not checked because the base does not hold its procedures, the '
      'reading gesture of the Procedures card is offered right there (« Lire les procédures de XQAL »: the same words, the same call); '
      'a tap starts the reading of that aerodrome', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0527 (1) (the user, LFFI: « la base ne tient pas les procédures à jour » — « pourquoi il n\'y a pas un bouton ou un lien '
      '« relire » alors ? »); the ergonomist: the existing « Relire » gesture offered in place, no new word; invented aerodrome XQAL')
def f289(c):
    want = {'fr': 'Lire les procédures de XQAL', 'en': 'Read the procedures of XQAL', 'de': 'Verfahren von XQAL lesen',
            'es': 'Leer los procedimientos de XQAL'}[c.lang]
    A = f'{FUEL} [data-altnchk] li[data-crit=aids]'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 844})
        _altn_open(c, 2500, 2, 'VFR', 5000, held=False)  # XQAL: its procedures not held by the base
        c.until(f"document.querySelector('{A}')?.dataset.state === 'grey'", timeout=20000, what=f'{w} px: the aids not checked')
        c.js(f"document.querySelector('{FUEL} [data-altnchk] details[data-altnfold]').open = true")
        c.until(f"!!document.querySelector('{A} [data-do=procfetch][data-icao=XQAL]')", timeout=8000, what=f'{w} px: the reading gesture in place')
        c.eq(norm(c.text(f'{A} [data-do=procfetch]') or ''), norm(want), 'the same words as the Procedures card', what='words')
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F289_{c.design}_{w}_{c.lang}_read.png')
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{A} [data-do="procfetch"]')
    c.until("(window.__notes || []).slice(window.__n0).some(n => n.includes('XQAL'))", timeout=8000,
            what='the reading of XQAL started (its start, then its answer, said)')
    c.check_errors()


@case('F290', 'Flight step, the line of the alternate: the weather of the aerodromes is read BY THE PAGE when it lacks — a flight opened '
      'without its aerodromes, then the departure, arrival and alternate typed: no gesture « Lire la météo », the TAF of the alternate is read '
      'and its weather judged; never « pas encore lue (étape Météo) » left on screen', 'F', tags=('fuel', 'weather'), designs=('standard',),
      screens=True, langs4=True,
      rule='SOG-0527 (2) (the user: « la page sait ce qui lui manque pour les N terrains de dégagement, pour avoir la bonne météo ou le metar. '
      'pas l\'utilisateur. »); the ergonomist: Fuel asks itself what is missing or aged, once per need, the cache respected; before, a '
      'change of aerodrome read the weather again only when it had been read already; invented aerodrome XQAL, sheet and TAF')
def f290(c):
    # 1. the weather does not answer: the alternate's criterion says the read failed and its cause — never « pas encore lue (étape
    # Météo) », which sent the pilot to a gesture that would fail the same way (red before: that sentence)
    failed = {'fr': 'Météo : non vérifiée — lecture impossible', 'en': 'Weather: not checked — could not be read',
              'de': 'Wetter: nicht geprüft — konnte nicht gelesen werden', 'es': 'Meteorología: no comprobada — no se pudo leer'}[c.lang]
    W = f'{FUEL} [data-altnchk] li[data-crit=wx]'
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 844})
        _altn_open(c, 2500, 2, 'VFR', 5000, wx_down=True)
        c.until(f"(document.querySelector('{W}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes({json.dumps(norm(failed))})",
                timeout=25000, what=f'{w} px: the failure of the read said, with its cause')
        txt = norm(c.text(W) or '')
        c.ok(norm(failed) + ' (' in txt, txt, f'{w} px: the cause in brackets')
        # for the relay: the screen this case proves — the failure and its cause, the fold open, the notes closed
        c.js(f"document.querySelector('{FUEL} [data-altnchk] details[data-altnfold]').open = true")
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{FUEL} [data-altnchk]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F290_{c.design}_{w}_{c.lang}_failed.png')
    # 2. the aerodromes typed after the opening: their weather read without a gesture (non-regression)
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 844})
        _altn_open(c, 2500, 2, 'VFR', 5000, typed=True)
        c.until(f"document.querySelector('{FUEL} [data-altnchk] li[data-crit=wx]')?.dataset.state === 'ok'", timeout=25000,
                what=f'{w} px: the weather of the alternate read without a gesture, and judged')
        c.js(f"document.querySelector('{FUEL} [data-altnchk] details[data-altnfold]').open = true")
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{FUEL} [data-altnchk]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F290_{c.design}_{w}_{c.lang}_wx.png')
    c.check_errors()


@case('F291', 'Fuel, every wind or weather value shown says its SOURCE and its AGE: the METAR card of each aerodrome (« METAR 14:20Z · il y '
      'a 5 min »); beyond 12 h the age is an alert (« plus de 12 h »)', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=True,
      langs4=True,
      rule='SOG-0527 (3), the ergonomist: « toute valeur de vent ou de météo affichée dans Carburant (vents de la route, METAR, TAF) dit sa '
      'SOURCE et son ÂGE, en alerte au-delà de 12 h »; invented METAR, one of them 14 h old (the test answers the weather layer)')
def f291(c):
    ago = {'fr': 'il y a', 'en': 'ago', 'de': 'vor', 'es': 'hace'}[c.lang]
    old = {'fr': 'plus de 12 h', 'en': 'over 12 h', 'de': 'über 12 h', 'es': 'más de 12 h'}[c.lang]
    route_metar(c, {'LFRS': (270, 10, 300), 'LFML': (300, 12, 14 * 3600), 'LFMT': (270, 8, 300)})
    c.open('fuel', docs=flight_docs(), airfields=True)
    wait_quote(c)
    to_step(c, 2)  # the Weather step: the cards of the aerodromes
    c.js(f"document.querySelector('{FUEL} [data-do=wx]')?.click()")
    c.until(f"document.querySelectorAll('{FUEL} [data-wx] .fu-wx [data-age]').length >= 2", timeout=20000, what='the cards say their age')
    card = lambda i: c.js(f"""(() => {{ const b = [...document.querySelectorAll('{FUEL} [data-wx] .fu-wx')].find(x => x.querySelector('b')?.textContent === '{i}');
      const a = b?.querySelector('[data-age]'); return b ? [a?.dataset.age || '', a?.textContent || '', b.querySelector('.f-row')?.textContent || ''] : null }})()""")
    rs, ml = card('LFRS'), card('LFML')
    c.ok(bool(rs) and rs[0] == 'ok' and ago in rs[1] and old not in rs[1] and 'METAR' in rs[2], rs, 'LFRS (5 min): its source and its age, quiet')
    c.ok(bool(ml) and ml[0] == 'old' and old in ml[1], ml, 'LFML (14 h): its age is an alert, « plus de 12 h »')
    c.js(_F281_NOTES_OFF)
    c.js(f"document.querySelector('{FUEL} [data-wx]').scrollIntoView({{block: 'start'}})")
    c.shot(f'F291_{c.design}_{c.lang}_age.png')
    c.check_errors()


# SOG-0529: the answers of route/levels for F292 (invented reasons: never a real RAD identifier)
def _lv(fl, valid, connector='procedure', reason=''):
    return {'fl': fl, 'ok': True, 'valid': valid, 'status': 'ok', 'distance_nm': 370.0, 'route': 'LFRS DCT LFML', 'connector': connector,
            'reason': reason or ('route valide' if valid else ''), 'errors': [], 'states': 40, 'interrupted': False}


_LV_DIRECT = 'raccord direct de 64,2 NM à l’arrivée au-delà de la limite de 0 NM du RAD (XX_LIM_AD) : à examiner, jamais une route valide'
_LV_NONE = 'Aucune route trouvée sur le réseau disponible à ce niveau'


@case('F292', '« Auto » level: only a level where the route engine finds a VALID route is taken — the cheapest one the engine refuses is set '
      'aside and its reason said; a published arrival is preferred to a direct connector, which is said; no valid level: the level is not '
      'changed and it is said', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0529 (the user: FL090 chosen by « Auto », the plan refused by the IFPS); AeroDB a357bed08, route/levels (12 levels at most, '
      'first_valid false: the choice stays in Fuel); the relay\'s agreement, points (1) to (7); a fake launcher, invented sheet and reasons')
def f292(c):
    st = _route_launcher(c, ['route/compute', 'route/levels'])
    hi = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
          'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}}
    valid = {'fr': 'le moins gourmand avec une route valide', 'en': 'the lowest burn with a valid route',
             'de': 'geringster Verbrauch mit gültiger Route', 'es': 'el de menor consumo con ruta válida'}[c.lang]
    none = {'fr': 'Auto : aucun niveau avec une route valide', 'en': 'Auto: no level with a valid route',
            'de': 'Auto: keine Fläche mit gültiger Route', 'es': 'Auto: ningún nivel con ruta válida'}[c.lang]
    direct = {'fr': 'raccord direct (aucune procédure volable à ce niveau)', 'en': 'direct connector (no procedure flyable at this level)',
              'de': 'Direktanschluss (kein Verfahren auf dieser Fläche fliegbar)',
              'es': 'enlace directo (ningún procedimiento volable a este nivel)'}[c.lang]
    fl = f'{FUEL} input[data-k="fl"]'
    L = f'{FUEL} [data-lvlwhy]'  # the explanation of the choice, under the row Level / Date (the short line « auto · 1:12 » stays)

    def auto_with(rule, w=390):
        st['levels_rule'] = rule
        c.page.set_viewport_size({'width': w, 'height': c.height})
        docs = flight_docs()
        for d in docs:
            if d[0].endswith('current_flight.json'):
                d[1]['aircraft']['sheetId'] = 'C30J'
        c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', hi, 'document']], airfields=True)
        wait_quote(c)
        to_step(c, 0)
        n0 = len(st['posts'])
        c.tap(f'{FUEL} [data-do="levelauto"]')
        for _ in range(60):
            got = [p.get('args') or {} for p in st['posts'][n0:] if 'levels' in (p.get('args') or {})]
            if got:
                return got[0]
            c.wait(200)
        raise Fail('no route/levels request', 'a request', 'none')

    # 1. the cheapest candidate refused by the engine (a direct connector beyond the RAD limit): the next one, valid, is taken
    a = auto_with(lambda lv: {'ok': True, 'levels': [_lv(lv[0], False, 'direct', _LV_DIRECT)] + [_lv(x, True) for x in lv[1:]],
                              'first_valid': lv[1] if len(lv) > 1 else None, 'stopped': 'end', 'asked': len(lv)})
    lv = a.get('levels') or []
    c.ok(1 < len(lv) <= 12 and 'fl' not in a and 'route' not in a and a.get('first_valid') is False, a,
         'one request: the candidates in the order of preference (12 at most), without fl nor route, first_valid false')
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(lv[1]), what='the second candidate taken (the first refused)')
    c.until(f"(w) => (document.querySelector('{L}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", norm(valid),
            timeout=8000, what='the line says why')
    line = norm(c.text(L) or '')  # textContent: the reason folded is read too
    c.ok(norm(_LV_DIRECT) in line and f'{lv[0]:03d}' in line, line, 'the cheaper level set aside, with the engine\'s reason as it is')
    c.eq(norm(c.text(f'{L} [data-lvlreason]') or ''), norm(_LV_DIRECT), 'the reason of the engine in the fold, as it is', what='fold')
    c.eq(c.js(f"document.querySelector('{L} [data-lvlfold]').open"), False, 'the fold of the reason closed until it is touched', what='closed')
    for w in (390, 1280):  # the captures with the fold CLOSED (the relay): the reason unfolds on a touch
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{fl}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F292_{c.design}_{w}_{c.lang}_valid.png')
    # 2. no valid level: the level of the flight is not changed, and it is said
    before = 270  # lib.FLIGHT: FL270
    auto_with(lambda lv: {'ok': True, 'levels': [_lv(x, False, 'none', _LV_NONE) for x in lv], 'first_valid': None, 'stopped': 'end',
                          'asked': len(lv)})
    c.until(f"(w) => (document.querySelector('{L}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", norm(none),
            timeout=8000, what='« no level with a valid route » said')
    c.eq(c.js(f"document.querySelector('{fl}').value"), str(before), 'no valid level: the level of the flight is not changed', what='kept')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{fl}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F292_{c.design}_{w}_{c.lang}_none.png')  # the fold closed
    # 3. only a direct connector is valid: it is taken, and said
    a = auto_with(lambda lv: {'ok': True, 'levels': [_lv(lv[0], False, 'none', _LV_NONE), _lv(lv[1], True, 'direct')] +
                              [_lv(x, False, 'none', _LV_NONE) for x in lv[2:]], 'first_valid': lv[1], 'stopped': 'end', 'asked': len(lv)})
    lv = a.get('levels') or []
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(lv[1]), what='the only valid level, a direct connector, taken')
    c.until(f"(w) => (document.querySelector('{L}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", norm(direct),
            timeout=8000, what='the direct connector said')
    # 4. (Sécurisation) a flight WITHOUT planned time, drawn again two minutes later (the clock of the page moved on): ONE call only —
    # the key never holds the date taken from the clock (red before: one more call at each new minute)
    auto_with(lambda lv: {'ok': True, 'levels': [_lv(x, True) for x in lv], 'first_valid': lv[0], 'stopped': 'end', 'asked': len(lv)})
    c.until(f"(document.querySelector('{L}')?.textContent || '').includes('(auto)')", timeout=8000, what='the auto level judged')
    calls = lambda: sum(1 for p in st['posts'] if 'levels' in (p.get('args') or {}))
    n1 = calls()
    c.js("(() => { const t = Date.now, d = 120000; Date.now = () => t() + d })()")  # two minutes later
    # a change outside the request (the wind, on another step: set by its event): a new drawing
    c.js(f"""(() => {{ const i = document.querySelector('{FUEL} input[data-k="wdir"]'); i.value = '270';
      i.dispatchEvent(new Event('input', {{ bubbles: true }})); i.dispatchEvent(new Event('change', {{ bubbles: true }})) }})()""")
    c.wait(2500)
    c.eq(calls(), n1, 'a new minute: no new route/levels call (the key without the date of the clock)', what='one call')
    # 5. (Sécurisation) a search of « Auto » running (the launcher does not answer yet), « Calculer A → B » tapped: the search is
    # cancelled first, the computation leaves (the user's gesture before a search nobody asked for)
    auto_with(lambda lv: None)
    c.until(f"(document.querySelector('{L}')?.textContent || '').length > 0", timeout=8000, what='the search under way said')
    n_cancel = len(st.get('cancels') or [])
    to_step(c, 1)
    sent = _compute_now(c, st)
    c.ok(len(sent) >= 1, sent, 'the computation left')
    c.ok(len(st.get('cancels') or []) > n_cancel, st.get('cancels'), 'the search of « Auto » cancelled (regen/job/cancel) before it')
    c.check_errors()


@case('F293', 'Route step: a route taken keeps the level of ITS computation — the level changed afterwards marks it « computed for FL270 — '
      'compute again » under the route, and « Copier pour Eurocontrol » says it BEFORE copying (a line above the button) and in the '
      'copy\'s notification; computed again at the new level and taken, the level of the computation and the level of the flight plan '
      'are the same number', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0533 (AeroDB\'s diagnosis of SOG-0532: a route computed at FL350, the flight plan filed at FL330 with « F330 » at its head '
      'and « /F350 » further on — the level was changed after the computation); a fake launcher, invented sheet, no callsign nor '
      'registration')
def f293(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]
    # the engine writes its level on the point where the cruise begins (« LUGEN/N0330F270 »)
    st['alts'] = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN/N0330F270 UN10 NEPIX MEN1A LFML', 370, 270, segs)]
    stale = {'fr': ('Route calculée pour le FL270 — à recalculer : le vol est au FL250',
                    'Plan de vol au FL250 sur une route calculée pour le FL270 : recalculez la route avant de copier'),
             'en': ('Route computed for FL270 — compute again: the flight is at FL250',
                    'Flight plan at FL250 on a route computed for FL270: compute the route again before copying'),
             'de': ('Route für FL270 berechnet — neu berechnen: der Flug ist auf FL250',
                    'Flugplan auf FL250 mit einer für FL270 berechneten Route: Route vor dem Kopieren neu berechnen'),
             'es': ('Ruta calculada para el FL270 — volver a calcular: el vuelo está en el FL250',
                    'Plan de vuelo en el FL250 con una ruta calculada para el FL270: vuelva a calcular la ruta antes de copiar')}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}  # no registration: the flight plan writes the neutral one
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)

    def item15():
        c.js(f"document.querySelector('{FUEL} [data-fpl] details[data-fplfold]').open = true")
        t = c.text(f'{FUEL} [data-fpl] [data-fpltext]') or ''
        c.js(f"document.querySelector('{FUEL} [data-fpl] details[data-fplfold]').open = false")
        return next((x.strip() for x in t.split('\n') if re.match(r'-N\d{4}F\d{3}\b', x.strip())), '')

    # 1. computed at FL270 and taken: the head of item 15 and the engine's level are one number; nothing said
    sent = _compute_now(c, st)
    c.eq(sent[0].get('fl'), 270, 'computed at the flight\'s level, FL270', what='sent')
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    d = cf_doc(c, lambda d: (d.get('route') or {}).get('from') == 'engine', 'the route taken, written')
    c.eq((d.get('route') or {}).get('calcFl'), 270, 'the route keeps the level of its computation', what='calcFl')
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]')", timeout=10000, what='« Copier pour Eurocontrol »')
    c.ok(item15().startswith('-N') and 'F270 ' in item15()[:12] and '/N' not in item15(), item15(),
         'item 15 at FL270, the engine\'s level not written twice')
    c.ok(not c.shown(f'{FUEL} [data-rstale]') and c.count(f'{FUEL} [data-fplstale]') == 0, 'nothing said', 'the same level: nothing said')
    # 2. the level changed after the computation (reproduced: « F250 » at the head, « /F270 » further on): said under the route, and
    # above « Copier pour Eurocontrol », before copying
    to_step(c, 0)
    c.page.fill(f'{FUEL} input[data-k="fl"]', '250')
    c.page.locator(f'{FUEL} input[data-k="fl"]').dispatch_event('change')
    to_step(c, 1)
    c.until(f"!!document.querySelector('{FUEL} [data-rstale]:not([hidden])')", timeout=8000, what='the route marked « à recalculer »')
    c.eq(norm(c.text(f'{FUEL} [data-rstale] [data-rstaletext]') or ''), norm(stale[0]), 'under the route: computed for FL270, to compute again',
         what='route')
    c.eq(norm(c.text(f'{FUEL} [data-rstale] [data-do=rcompute]') or ''), norm({'fr': 'Recalculer', 'en': 'Compute again',
         'de': 'Neu berechnen', 'es': 'Recalcular'}[c.lang]), 'with « Recalculer »', what='button')
    fpl = item15()
    # the group of the engine written again with the quote's speed (the speed of the flight plan): its level, F270, is the engine's
    c.ok('F250 ' in fpl[:12] and re.search(r'LUGEN/N\d{4}F270\b', fpl) is not None, fpl,
         'reproduced: item 15 « F250 » at its head and « /F270 » further on')
    c.eq(norm(c.text(f'{FUEL} [data-fpl] [data-fplstale]') or ''), norm(stale[1]), 'above « Copier pour Eurocontrol »: said before copying',
         what='before')
    c.ok(c.js(f"""(() => {{ const p = document.querySelector('{FUEL} [data-fpl] [data-fplstale]'),
        b = document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]');
        return !!(p.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) }})()"""), 'after', 'the line comes before the button')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]').getAttribute('aria-disabled')"), None,
         'the copy stays permitted', what='copy')
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{FUEL} [data-fpl] [data-do="fplcopy"]')
    c.until("(w) => (window.__notes || []).slice(window.__n0).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", norm(stale[1]),
            timeout=6000, what='the copy says it too')
    c.js(f"document.querySelector('{FUEL} [data-fpl] details[data-fplfold]').open = false")
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{FUEL} [data-rstale]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F293_{c.design}_{w}_{c.lang}_stale.png')
        c.js(f"document.querySelector('{FUEL} [data-fpl] [data-fplstale]').scrollIntoView({{block: 'center'}})")  # above the copy button
        c.shot(f'F293_{c.design}_{w}_{c.lang}_copy.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    # 3. « Recalculer »: computed at FL250, taken — the level of the computation and of the flight plan are the same number, nothing said
    st['alts'] = [_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN/N0330F250 UN10 NEPIX MEN1A LFML', 370, 250, segs)]
    n0 = len(st['posts'])
    c.tap(f'{FUEL} [data-rstale] [data-do="rcompute"]')
    c.until(f"!document.querySelector('{FUEL} [data-rbusy]') && !!document.querySelector('{FUEL} [data-altlist] [data-alt] [data-do=rtake]')",
            timeout=15000, what='the new answer drawn')
    again = [p['args'] for p in st['posts'][n0:] if (p.get('args') or {}).get('action') == 'compute']
    c.eq(again[0].get('fl') if again else None, 250, 'computed again at the new level, FL250', what='again')
    c.tap(f'{FUEL} [data-altlist] [data-alt="0"] [data-do="rtake"]')
    cf_doc(c, lambda d: (d.get('route') or {}).get('calcFl') == 250, 'the route taken at FL250, written')
    c.until(f"!document.querySelector('{FUEL} [data-rstale]:not([hidden])') && !document.querySelector('{FUEL} [data-fplstale]')",
            timeout=8000, what='nothing said any more')
    fpl = item15()
    c.ok('F250 ' in fpl[:12] and '/N' not in fpl, fpl, 'item 15 at FL250, one level from its head to its end')
    c.check_errors()


@case('F294', 'Route step: the best route returned FAULTY by the engine (no conforming route: alternatives[0].faulty, verdict « violates », '
      'a violation that is no segment — a direct connector beyond the RAD limit) is never said « 0 écart contrôlé » nor « contrôlé » in '
      'green: its line and its taking say « enfreint 1 règle connue »; above « Copier pour Eurocontrol »: « 1 règle connue enfreinte — '
      'Eurocontrol refusera ce plan », the copy stays permitted', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True,
      langs4=True,
      rule='SOG-0532 (3), (4) (AeroDB 63f7aebc9: a known rule broken is an ERROR, the best route returned marked faulty, status « faulty »); '
      'the relay: the defect first, alone — the ergonomist\'s words of § 3, points 3 and 4; a fake launcher, invented rule and values, no '
      'callsign nor registration')
def f294(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]  # every segment ok: the violation is no segment
    bad = dict(_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, segs), faults=1, faulty=True, verdict='violates',
               violations=[{'code': 'connector_limit', 'values': {'ad': 'LFML', 'end': 'arr', 'nm': 48, 'limit_nm': 30, 'rule': 'XX9999',
                                                                    'point': 'NEPIX'},
                            'text': 'Raccord NEPIX–LFML : direct de 48 NM à l’arrivée, au-delà de la limite de 30 NM du RAD (XX9999)'}],
               unverifiable=[], control={'controlledPct': 100, 'incompletePct': 0, 'fallbackPct': 0, 'errorPct': 0, 'sections': []})
    st['alts'] = [bad]
    st['extra'] = {'status': 'faulty'}
    want = {'fr': ('enfreint 1 règle connue', 'Itinéraire pris — il enfreint 1 règle connue : Eurocontrol refusera ce plan.',
                   '1 règle connue enfreinte — Eurocontrol refusera ce plan'),
            'en': ('breaks 1 known rule', 'Route taken — it breaks 1 known rule: Eurocontrol will refuse this plan.',
                   '1 known rule broken — Eurocontrol will refuse this plan'),
            'de': ('verletzt 1 bekannte Regel', 'Route übernommen — sie verletzt 1 bekannte Regel: Eurocontrol wird diesen Plan ablehnen.',
                   '1 bekannte Regel verletzt — Eurocontrol wird diesen Plan ablehnen'),
            'es': ('infringe 1 regla conocida', 'Itinerario tomado: infringe 1 regla conocida; Eurocontrol rechazará este plan.',
                   '1 regla conocida infringida: Eurocontrol rechazará este plan')}[c.lang]
    zero = {'fr': '0 écart contrôlé', 'en': '0 checked deviations', 'de': '0 geprüfte Abweichungen', 'es': '0 desviaciones controladas'}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}  # no registration: the flight plan writes the neutral one
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    R = f'{FUEL} [data-altlist] [data-alt="0"]'
    c.until(f"!!document.querySelector('{R} [data-do=rtake]')", timeout=10000, what='the faulty route, with « Choisir »')
    line = norm(c.text(R) or '')
    c.ok(norm(zero) not in line, line, 'a faulty route is never said « 0 écart contrôlé »')
    c.eq(norm(c.text(f'{R} [data-faulty]') or ''), norm(want[0]), 'its line says it breaks 1 known rule', what='line')
    c.ok(c.js(f"document.querySelector('{R}').classList.contains('fu-raltbad')") is True, 'not marked',
         'its line is marked faulty, never accepted')
    share = norm(c.text(f'{R} [data-share]') or '')
    c.ok(share != norm({'fr': 'contrôlé', 'en': 'checked', 'de': 'geprüft', 'es': 'controlado'}[c.lang]), share,
         'never « contrôlé » alone')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{R}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F294_{c.design}_{w}_{c.lang}_line.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    # taken: the notification says it, never a green « contrôlé »
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{R} [data-do="rtake"]')
    c.until("(w) => (window.__notes || []).slice(window.__n0).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", norm(want[1]),
            timeout=6000, what='the taking says it breaks 1 known rule')
    d = cf_doc(c, lambda d: (d.get('route') or {}).get('from') == 'engine', 'the route taken, written')
    c.eq((d.get('route') or {}).get('violations'), 1, 'the route keeps the number of known rules it breaks', what='kept')
    # above « Copier pour Eurocontrol », before copying; the copy stays permitted and says it too
    c.until(f"!!document.querySelector('{FUEL} [data-fpl] [data-fplviolations]')", timeout=8000, what='the sentence above the copy button')
    c.eq(norm(c.text(f'{FUEL} [data-fpl] [data-fplviolations]') or ''), norm(want[2]), 'said before copying', what='before')
    c.ok(c.js(f"""(() => {{ const p = document.querySelector('{FUEL} [data-fpl] [data-fplviolations]'),
        b = document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]');
        return !!(p.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) }})()"""), 'after', 'the sentence comes before the button')
    c.eq(c.js(f"document.querySelector('{FUEL} [data-fpl] [data-do=fplcopy]').getAttribute('aria-disabled')"), None,
         'the copy stays permitted', what='copy')
    c.js("window.__n0 = (window.__notes || []).length")
    c.tap(f'{FUEL} [data-fpl] [data-do="fplcopy"]')
    c.until("(w) => (window.__notes || []).slice(window.__n0).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w))", norm(want[2]),
            timeout=6000, what='the copy says it too')
    c.js(f"document.querySelector('{FUEL} [data-fpl] details[data-fplfold]').open = false")
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{FUEL} [data-fpl] [data-fplviolations]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F294_{c.design}_{w}_{c.lang}_copy.png')
    st['extra'] = None
    c.check_errors()


_F295_YOYO = 'Yoyo de niveau : F240 puis F270 en LUGEN.'


@case('F295', 'Route step: three verdicts, never confused, on each computed route — « enfreint N règles connues », « Non vérifiable : N '
      'point(s) », « conforme à ce que nous savons lire » — and under the route the two groups « Règles connues enfreintes » and « Non '
      'vérifiable » when they have lines, each line composed in the language of the screen from { code, values }, starting with the '
      'place of the route, without sheet nor row; seven lines at most, then « et N autre(s) »; an engine text without its values shown '
      'with the mention of its language outside French', 'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0532 (3), SOG-0531 (the contract of frame/aerodb/INTEGRATION.md « three verdicts », « what the check could NOT verify »); '
      'the ergonomist\'s words of 20 Nov (ergonome_MOTS_CODES_SOG-0532_CORRIGES.md); a fake launcher, an invented route, rules and values')
def f295(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]
    violates = [
        {'code': 'rad_rule', 'values': {'id': 'XX9001', 'sheet': 'Annexe X', 'row': 12, 'target': 'LUGEN–NEPIX'}, 'text': 'Règle XX9001'},
        {'code': 'rad_block', 'values': {'id': 'XX9002', 'sheet': 'Annexe X', 'row': 13}, 'text': 'Interdiction XX9002'},
        {'code': 'connector_limit', 'values': {'ad': 'LFML', 'end': 'arr', 'nm': 48.5, 'limit_nm': 30, 'rule': 'XX9003', 'point': 'NEPIX'},
         'text': 'Raccord NEPIX–LFML'},
        {'code': 'level_yoyo', 'values': {'point': 'LUGEN', 'down_fl': 240, 'up_fl': 270, 'filed_fl': 270}, 'text': _F295_YOYO}]
    unverif = [
        {'code': 'connector_unknown', 'values': {'ad': 'LFRS', 'end': 'dep', 'nm': 12, 'reason': 'no_limit', 'rule': 'XX9004'}, 'text': 'x'},
        {'code': 'network_gap', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'nm': 61}, 'text': 'y'}]
    many = [{'code': 'network_gap', 'values': {'from_point': f'XQP{i}', 'to_point': f'XQQ{i}', 'nm': 20 + i}, 'text': 'z'} for i in range(9)]
    st['alts'] = [
        dict(_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, segs), faults=4, faulty=True, verdict='violates',
             violations=violates, unverifiable=unverif),
        dict(_alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, segs), verdict='unverifiable', violations=[], unverifiable=many,
             # SOG-0532 (the ergonomist, 20 Nov): « le partage n'est montré que sous 100 % » — fixture changed on purpose (was 100 %)
             control={'controlledPct': 80, 'incompletePct': 20, 'fallbackPct': 0, 'errorPct': 0, 'sections': []}),
        dict(_alt(3, 'Direct · FL190', 'LFRS LUGEN LFML', 380, 190, segs, sid=False), verdict='conform', violations=[], unverifiable=[])]
    want = {
        # SOG-0545 (mock-up v2): « conforme » in one word on the route, explained once above the list — changed on purpose
        'fr': {'v': 'enfreint 4 règles connues', 'u': 'Non vérifiable : 9 points', 'c': 'conforme',
               'gv': 'Règles connues enfreintes', 'gu': 'Non vérifiable : 2 points', 'more': 'et 2 autres',
               'lines': ['LUGEN–NEPIX : règle du RAD non respectée (XX9001)', 'Route interdite par le RAD (XX9002)',
                         'Arrivée à LFML : direct de 48,5 NM depuis NEPIX, limite 30 NM (RAD XX9003)', _F295_YOYO,
                         'Départ de LFRS : direct de 12 NM — limite du RAD non lue pour ce terrain',
                         'Aucune voie dans la base entre LUGEN et NEPIX : direct de 61 NM']},
        'en': {'v': 'breaks 4 known rules', 'u': 'Cannot be verified: 9 points', 'c': 'conforms',
               'gv': 'Known rules broken', 'gu': 'Cannot be verified: 2 points', 'more': 'and 2 others',
               'lines': ['LUGEN–NEPIX: RAD rule not met (XX9001)', 'Route prohibited by the RAD (XX9002)',
                         'Arrival at LFML: direct of 48.5 NM from NEPIX, limit 30 NM (RAD XX9003)', 'engine text, in French: ' + _F295_YOYO,
                         'Departure from LFRS: direct of 12 NM — RAD limit not read for this aerodrome',
                         'No airway in the base between LUGEN and NEPIX: direct of 61 NM']},
        'de': {'v': 'verletzt 4 bekannte Regeln', 'u': 'Nicht prüfbar: 9 Punkte', 'c': 'konform',
               'gv': 'Verletzte bekannte Regeln', 'gu': 'Nicht prüfbar: 2 Punkte', 'more': 'und 2 weitere',
               'lines': ['LUGEN–NEPIX: RAD-Regel nicht eingehalten (XX9001)', 'Route durch das RAD verboten (XX9002)',
                         'Ankunft in LFML: Direktstrecke von 48,5 NM ab NEPIX, Grenze 30 NM (RAD XX9003)',
                         'Text der Routenberechnung, auf Französisch: ' + _F295_YOYO,
                         'Abflug von LFRS: Direktstrecke von 12 NM — RAD-Grenze für diesen Flugplatz nicht gelesen',
                         'Keine Luftstraße in der Basis zwischen LUGEN und NEPIX: Direktstrecke von 61 NM']},
        'es': {'v': 'infringe 4 reglas conocidas', 'u': 'No verificable: 9 puntos', 'c': 'conforme',
               'gv': 'Reglas conocidas infringidas', 'gu': 'No verificable: 2 puntos', 'more': 'y 2 otros',
               'lines': ['LUGEN–NEPIX: regla del RAD no respetada (XX9001)', 'Ruta prohibida por el RAD (XX9002)',
                         'Llegada a LFML: directo de 48,5 NM desde NEPIX, límite 30 NM (RAD XX9003)', 'texto del motor, en francés: ' + _F295_YOYO,
                         'Salida de LFRS: directo de 12 NM — límite del RAD no leído para este aeródromo',
                         'Ninguna aerovía en la base entre LUGEN y NEPIX: directo de 61 NM']}}[c.lang]
    zero = {'fr': '0 écart contrôlé', 'en': '0 checked deviations', 'de': '0 geprüfte Abweichungen', 'es': '0 desviaciones controladas'}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    A = f'{FUEL} [data-altlist]'
    c.until(f"document.querySelectorAll('{A} [data-alt]').length === 3", timeout=10000, what='the three routes')
    words = [norm(c.text(f'{A} [data-alt="{i}"] [data-verdict]') or '') for i in range(3)]
    c.eq(words, [norm(want['v']), norm(want['u']), norm(want['c'])], 'the three verdicts, one per route, never confused', what='verdicts')
    c.ok(all(norm(zero) not in norm(c.text(f'{A} [data-alt="{i}"]') or '') for i in range(3)), zero, 'no « 0 écart contrôlé » beside a verdict')
    # the groups of the faulty route: both shown, the lines composed from { code, values }, starting with the place, no sheet nor row
    R0 = f'{A} [data-alt="0"]'
    c.js(f"document.querySelectorAll('{R0} details[data-reasons]').forEach(d => d.open = true)")
    heads = [norm(x) for x in c.js(f"[...document.querySelectorAll('{R0} details[data-reasons] > summary')].map(e => e.textContent)")]
    c.eq(heads, [norm(want['gv']), norm(want['gu'])], 'the two groups, each with its title', what='groups')
    got = [norm(x) for x in c.js(f"[...document.querySelectorAll('{R0} details[data-reasons] li')].map(e => e.textContent)")]
    c.eq(got, [norm(x) for x in want['lines']], 'each line in the language of the screen, from its code and values', what='lines')
    c.ok(not any('Annexe' in x for x in got), got, 'neither sheet nor row of the workbook')
    # the relay: the share of the check (« contrôlé 100 % · … ») never reads as a verdict — under the route text, away from the verdict
    c.ok(c.js(f"""(() => {{ const r = document.querySelector('{A} [data-alt="1"] .fu-raltroute'),
        s = document.querySelector('{A} [data-alt="1"] [data-share]');
        return !!(r && s && (r.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)) }})()"""), 'before', 'the share under the route text')
    # nine unverifiable lines: seven, then « et 2 autres »
    R1 = f'{A} [data-alt="1"]'
    c.eq(c.count(f'{R1} details[data-reasons="unverifiable"] > ul > li'), 7, 'seven lines at most', what='seven')
    c.eq(norm(c.text(f'{R1} [data-reasonsmore] > summary') or ''), norm(want['more']), 'then « et 2 autres », which opens the rest',
         what='more')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelectorAll('{R0} details[data-reasons]').forEach(d => d.open = true)")
        c.js(f"document.querySelector('{R0} details[data-reasons]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F295_{c.design}_{w}_{c.lang}_groups.png')
        c.js(f"document.querySelector('{A}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F295_{c.design}_{w}_{c.lang}_verdicts.png')
    c.check_errors()


@case('F296', 'Route step, the rules of the RAD not verified: ONE line per State whose rules apply to the route — « Belgique : 9 règles du '
      'RAD portent sur cette route » —, the line itself opens its list « {target} — {reason} ({id}) » (« {id} — {reason} » without a '
      'target), seven then « et N autres »; the rules that only apply to airspaces are ONE note under the group, out of the count, even '
      'under « conforme »; « Non vérifiable : N point(s) » counts the lines; the share of the check only under 100 %, each number with its word',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0532 lot 2 (AeroDB c93f3cb25: `rad_unread` { state, flown, spaces_only }, `notVerified` per State, items { id, reason }); '
      'the ergonomist\'s words decided on 20 Nov (ergonome_MOTS_RAD_UNREAD_SOG-0532_DECIDES.md); SOG-0538 (the ergonomist, 21 Nov: the note '
      'of the spaces without its number — the engine counts States the route does not cross, SOG-0537) — expectation changed on purpose; '
      'a fake launcher, invented rules')
def f296(c):
    st = _route_launcher(c, ['route/compute'])
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]
    why = ['zone_state', 'schedule_airac', 'level_along_points', 'aircraft', 'space_unread', 'schedule_dst', 'schedule_days',
           'schedule_list', 'something_new']
    items = [dict({'id': f'XX{9100 + i}', 'sheet': 'Annexe X', 'row': 40 + i, 'reason': r}, **({'target': 'LUGEN–NEPIX'} if i == 0 else {}))
             for i, r in enumerate(why)]
    unverif = [{'code': 'rad_unread', 'values': {'state': 'be', 'flown': 9, 'spaces_only': 5}, 'text': 'RAD non lu'},
               {'code': 'stale_cycle', 'values': {'zone': 'be', 'cycle': '2026-10-01', 'routes': ['XQ1']}, 'text': 'cycle'},
               {'code': 'network_gap', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'nm': 61}, 'text': 'gap'}]
    spaces = [{'code': 'rad_unread', 'values': {'state': 'be', 'flown': 0, 'spaces_only': 4}, 'text': 'RAD non lu'}]
    # the relay (20 Nov): a share « en infraction » goes with a known rule broken — the route breaks one, its unverifiable lines stay
    st['alts'] = [dict(_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, segs), faults=1, faulty=True, verdict='violates',
                       violations=[{'code': 'rad_rule', 'values': {'id': 'XX9001', 'target': 'LUGEN–NEPIX'}, 'text': 'Règle XX9001'}],
                       unverifiable=unverif, notVerified=[{'state': 'BE', 'flown': 9, 'spaces_only': 5, 'items': items}],
                       control={'controlledPct': 60, 'incompletePct': 30, 'fallbackPct': 0, 'errorPct': 10, 'sections': []}),
                  dict(_alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, segs), verdict='unverifiable', violations=[],
                       unverifiable=spaces, control={'controlledPct': 100, 'incompletePct': 0, 'fallbackPct': 0, 'errorPct': 0, 'sections': []})]
    want = {
        # SOG-0545 (mock-up v2): « conforme » in one word on the route, explained once above the list — changed on purpose
        'fr': {'title': 'Non vérifiable : 3 points', 'state': 'Belgique : 9 règles du RAD portent sur cette route',
               'first': 'LUGEN–NEPIX — dépend de l’activité d’une zone — à vérifier le jour du vol (XX9100)',
               'second': 'XX9101 — horaire que nous ne savons pas lire', 'unknown': 'XX9108 — règle que nous ne savons pas lire',
               'more': 'et 2 autres', 'conform': 'conforme',
               'note': 'Les règles du RAD qui ne portent que sur des espaces ne sont pas vérifiées.',
               'share': 'en infraction : 10 % · distance contrôlée : 60 % · données incomplètes : 30 %'},
        'en': {'title': 'Cannot be verified: 3 points', 'state': 'Belgium: 9 RAD rules apply to this route',
               'first': 'LUGEN–NEPIX — depends on the activity of an area — to check on the day of the flight (XX9100)',
               'second': 'XX9101 — schedule we cannot read', 'unknown': 'XX9108 — rule we cannot read',
               'more': 'and 2 others', 'conform': 'conforms',
               'note': 'The RAD rules that only apply to airspaces are not verified.',
               'share': 'in breach: 10 % · distance checked: 60 % · incomplete data: 30 %'},
        'de': {'title': 'Nicht prüfbar: 3 Punkte', 'state': 'Belgien: 9 RAD-Regeln betreffen diese Route',
               'first': 'LUGEN–NEPIX — hängt von der Aktivität eines Gebiets ab — am Flugtag zu prüfen (XX9100)',
               'second': 'XX9101 — Zeitplan, den wir nicht lesen können', 'unknown': 'XX9108 — Regel, die wir nicht lesen können',
               'more': 'und 2 weitere', 'conform': 'konform',
               'note': 'Die RAD-Regeln, die nur Lufträume betreffen, werden nicht geprüft.',
               'share': 'regelwidrig: 10 % · geprüfte Strecke: 60 % · unvollständige Daten: 30 %'},
        'es': {'title': 'No verificable: 3 puntos', 'state': 'Bélgica: 9 reglas del RAD se aplican a esta ruta',
               'first': 'LUGEN–NEPIX — depende de la actividad de una zona — a comprobar el día del vuelo (XX9100)',
               'second': 'XX9101 — horario que no sabemos leer', 'unknown': 'XX9108 — regla que no sabemos leer',
               'more': 'y 2 otros', 'conform': 'conforme',
               'note': 'Las reglas del RAD que solo se aplican a espacios no se verifican.',
               'share': 'en infracción: 10 % · distancia controlada: 60 % · datos incompletos: 30 %'}}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    A = f'{FUEL} [data-altlist]'
    c.until(f"document.querySelectorAll('{A} [data-alt] [data-verdict]').length === 2", timeout=10000, what='the verdicts of the two routes')
    R0, R1 = f'{A} [data-alt="0"]', f'{A} [data-alt="1"]'
    # 1. one count, the lines of the group (a State line and a stale cycle are points)
    c.eq(norm(c.text(f'{R0} [data-verdict]') or ''), norm({'fr': 'enfreint 1 règle connue', 'en': 'breaks 1 known rule',
         'de': 'verletzt 1 bekannte Regel', 'es': 'infringe 1 regla conocida'}[c.lang]), 'the most serious verdict on the line', what='verdict')
    c.eq(norm(c.text(f'{R0} [data-share]') or ''), norm(want['share']), 'under 100 %: each number with its word, the part in breach first, the null part left out',
         what='share')
    c.js(f"document.querySelectorAll('{R0} details[data-reasons]').forEach(d => d.open = true)")
    G = f'{R0} details[data-reasons="unverifiable"]'
    c.eq(norm(c.text(f'{G} > summary') or ''), norm(want['title']), 'the group says the same count', what='group')
    # 2. the State line IS the button of its list
    c.eq(norm(c.text(f'{G} li[data-reason=rad_unread] > details[data-staterules] > summary') or ''), norm(want['state']),
         'one line for the State, which opens its list', what='state')
    c.js(f"document.querySelector('{G} [data-staterules]').open = true")
    rules = [norm(x) for x in c.js(f"[...document.querySelectorAll('{G} [data-staterules] > ul > li')].map(e => e.textContent)")]
    c.eq([len(rules)] + rules[:2], [7, norm(want['first']), norm(want['second'])],
         'the place first, the reference last; without a place, the reference first; the schedules say one sentence', what='rules')
    c.eq(norm(c.text(f'{G} [data-rulesmore] > summary') or ''), norm(want['more']), '« et 2 autres »', what='more')
    rest = [norm(x) for x in c.js(f"[...document.querySelectorAll('{G} [data-rulesmore] li')].map(e => e.textContent)")]
    c.eq(rest[-1:], [norm(want['unknown'])], 'an unknown reason: « règle que nous ne savons pas lire »', what='unknown')
    c.ok(not any('Annexe' in x for x in rules + rest), rules, 'neither sheet nor row of the workbook')
    # 3. the spaces only: one note under the group, out of the count — SOG-0538: without a number (expectation changed on purpose)
    c.eq(norm(c.text(f'{R0} [data-spacesonly]') or ''), norm(want['note']), 'one note under the group, out of the count, without a number',
         what='note')
    # 4. spaces only: never « non vérifiable » by itself — « conforme », the note under it; at 100 %, no share
    c.eq(norm(c.text(f'{R1} [data-verdict]') or ''), norm(want['conform']), 'the spaces alone never make the route unverifiable',
         what='conform')
    c.eq(norm(c.text(f'{R1} [data-spacesonly]') or ''), norm(want['note']), 'the note under « conforme » too, without a number',
         what='note conform')
    c.eq(c.count(f'{R1} [data-share]'), 0, 'at 100 %: no share', what='100 %')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelectorAll('{R0} details[data-reasons], {G} [data-staterules]').forEach(d => d.open = true)")
        c.js(f"document.querySelector('{G}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F296_{c.design}_{w}_{c.lang}_states.png')
        c.js(f"document.querySelector('{R0} [data-share]').scrollIntoView({{block: 'center'}})")  # the part in breach, first on the line
        c.shot(f'F296_{c.design}_{w}_{c.lang}_share.png')
        c.js(f"document.querySelector('{R1}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F296_{c.design}_{w}_{c.lang}_spaces.png')
    c.check_errors()


@case('F297', 'Route step: under the ONLY verdict « conforme à ce que nous savons lire », a short visible line « Seul Eurocontrol valide un '
      'plan. » (never in a fold); nothing under « enfreint » nor « non vérifiable »; the line « Contrôle de simulation : … » is gone',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0532 (the ergonomist, 20 Nov, choice (a): the line of the counts of the whole computation removed, « Seul Eurocontrol valide '
      'un plan. » under « conforme » only); a fake launcher, an invented route and rule')
def f297(c):
    st = _route_launcher(c, ['route/compute'])
    st['extra'] = {'rad': _RAD_VIEW}
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]
    st['alts'] = [
        # AeroDB 6c0987086 (lot 2 bis): the values of the full sentences — {target}, the two points of the yoyo, space_dct_limit
        dict(_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, segs), faults=4, faulty=True, verdict='violates',
             violations=[{'code': 'rad_rule', 'values': {'id': 'XX9001', 'target': 'LUGEN–NEPIX'}, 'text': 'Règle XX9001'},
                         {'code': 'rad_block', 'values': {'id': 'XX9002', 'sheet': 'Annexe X', 'row': 3, 'target': 'XQ1 LUGEN–NEPIX'}, 'text': 'x'},
                         {'code': 'level_yoyo', 'values': {'down_point': 'LUGEN', 'down_fl': 240, 'up_point': 'NEPIX', 'up_fl': 270,
                                                           'filed_fl': 270}, 'text': 'y'},
                         {'code': 'space_dct_limit', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'nm': 48, 'limit_nm': 30,
                                                                'space': 'XQTA'}, 'text': 'z'}], unverifiable=[]),
        dict(_alt(2, 'Direct · FL250', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 250, segs), verdict='unverifiable', violations=[],
             unverifiable=[{'code': 'network_gap', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'nm': 61}, 'text': 'gap'}]),
        dict(_alt(3, 'Direct · FL190', 'LFRS LUGEN LFML', 380, 190, segs, sid=False), verdict='conform', violations=[], unverifiable=[])]
    want = {'fr': 'Seul Eurocontrol valide un plan.', 'en': 'Only Eurocontrol validates a plan.', 'de': 'Nur Eurocontrol validiert einen Plan.',
            'es': 'Solo Eurocontrol valida un plan.'}[c.lang]
    full = {'fr': ['LUGEN–NEPIX : règle du RAD non respectée (XX9001)', 'XQ1 LUGEN–NEPIX : route interdite par le RAD (XX9002)',
                   'Descente au FL240 à LUGEN, puis remontée au FL270 à NEPIX (« yoyo »)', 'LUGEN–NEPIX : direct de 48 NM, limite 30 NM dans XQTA'],
            'en': ['LUGEN–NEPIX: RAD rule not met (XX9001)', 'XQ1 LUGEN–NEPIX: route prohibited by the RAD (XX9002)',
                   'Descent to FL240 at LUGEN, then climb back to FL270 at NEPIX (“yoyo”)', 'LUGEN–NEPIX: direct of 48 NM, limit 30 NM in XQTA'],
            'de': ['LUGEN–NEPIX: RAD-Regel nicht eingehalten (XX9001)', 'XQ1 LUGEN–NEPIX: Route durch das RAD verboten (XX9002)',
                   'Sinkflug auf FL240 bei LUGEN, dann Steigflug zurück auf FL270 bei NEPIX („Jo-Jo“)',
                   'LUGEN–NEPIX: Direktstrecke von 48 NM, Grenze 30 NM in XQTA'],
            'es': ['LUGEN–NEPIX: regla del RAD no respetada (XX9001)', 'XQ1 LUGEN–NEPIX: ruta prohibida por el RAD (XX9002)',
                   'Descenso al FL240 en LUGEN, y luego subida al FL270 en NEPIX («yoyó»)', 'LUGEN–NEPIX: directo de 48 NM, límite 30 NM en XQTA']}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    A = f'{FUEL} [data-altlist]'
    c.until(f"document.querySelectorAll('{A} [data-alt] [data-verdict]').length === 3", timeout=10000, what='the three verdicts')
    # SOG-0545 (the ergonomist, mock-up v2) — expectation changed on purpose: « Seul Eurocontrol valide un plan. » once, under « Calculé à »,
    # with the meaning of « conforme »; no more under each route
    c.eq(c.count(f'{A} [data-onlyeuro]'), 0, 'no more under a route', what='only')
    c.ok(norm(want) in norm(c.text(f'{FUEL} [data-conformline]') or ''), c.text(f'{FUEL} [data-conformline]'), 'once, above the list')
    c.ok(c.js(f"""(() => {{ const e = document.querySelector('{FUEL} [data-conformline]');
        return !!e && !e.closest('details') && e.getBoundingClientRect().height > 0 }})()"""), 'folded', 'visible, never in a fold')
    c.eq(c.count(f'{FUEL} [data-radline]'), 0, 'no line « Contrôle de simulation » any more', what='removed')
    # the full sentences now that the engine gives their values (AeroDB 6c0987086): never the fallback
    c.js(f"document.querySelectorAll('{A} [data-alt=\"0\"] details[data-reasons]').forEach(d => d.open = true)")
    lines = [norm(x) for x in c.js(f"[...document.querySelectorAll('{A} [data-alt=\"0\"] details[data-reasons=violates] li')].map(e => e.textContent)")]
    c.eq(lines, [norm(x) for x in full], 'the full sentences: the place of the rule, the two points of the yoyo, the direct in its space',
         what='full')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{A} [data-alt=\"2\"]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F297_{c.design}_{w}_{c.lang}_conform.png')
        c.js(f"document.querySelectorAll('{A} [data-alt=\"0\"] details[data-reasons]').forEach(d => d.open = true)")
        c.js(f"document.querySelector('{A} [data-alt=\"0\"]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F297_{c.design}_{w}_{c.lang}_faulty.png')
    c.check_errors()


# SOG-0530: the warnings of the cruising level (AeroDB lot B, e45662187: (a), (b), (c) in `warnings`, never the verdict; the note and
# {n} from `levelRule`). Invented points (XQNOR, XQSUD) placed so that the tracks said are those of the drawn legs (the relay, 21 Nov):
# LUGEN → NEPIX runs 124° true (about 123° magnetic, the half 090–269 of the UTA: ODD levels — FL260 is the warned one); NEPIX → XQNOR
# runs due east (088° magnetic: next to the cut at 090°)
_LVL_PTS = {'LFRS': (47.1569, -1.6078), 'LUGEN': (46.5833, -1.2), 'NEPIX': (44.9, 2.4), 'XQNOR': (44.9, 3.6), 'XQSUD': (44.1, 4.4),
            'LFML': (43.4367, 5.215)}
_LVL_A = {'code': 'level_semicircular', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'legs': 1, 'fl': 260, 'regime': 'IFR',
                                                   'state': 'fr', 'source': 'ENR 1.7.5', 'cycle': '2026-11-26', 'track_deg': 123,
                                                   'range': '090-269', 'expected': 'odd', 'suggested': [250, 270]}, 'text': 'a'}
_LVL_B = {'code': 'level_rule_near_limit', 'values': {'from_point': 'NEPIX', 'to_point': 'XQNOR', 'legs': 1, 'fl': 260, 'track_deg': 88,
                                                      'margin_deg': 3, 'limit_deg': 90}, 'text': 'b'}
_LVL_C = {'code': 'level_rule_no_variation', 'values': {'from_point': 'XQNOR', 'to_point': 'XQSUD', 'legs': 1, 'fl': 250}, 'text': 'c'}


def _lvl_alt(i, name, ids, fl, **more):
    """An alternative of F298 whose segments and points are the invented geometry above."""
    segs = [_seg(a, b) for a, b in zip(ids, ids[1:])]
    a = _alt(i, name, ' '.join(ids), 370, fl, segs, sid=False)
    a['points'] = [{'id': p, 'lat': _LVL_PTS[p][0], 'lon': _LVL_PTS[p][1]} for p in ids]
    return dict(a, violations=[], **more)


def _lvl_rule(warnings=0, undecided=0, zones=(), table_missing=False):
    return {'cycle': '2026-11-26', 'checked': 0 if table_missing else 3, 'warnings': warnings, 'undecided': undecided, 'zones': list(zones),
            'unlocated': 0, 'legs': 3, 'table_missing': table_missing}


@case('F298', 'Route step: the group « Niveau de croisière : {n} avertissement(s) » AFTER « Non vérifiable », in the warning tone, never '
      'changing the verdict — its lines (a) a level outside the semicircular rule, (b) a track too near a cut, (c) a declination unknown; '
      '{n} = levelRule.warnings, the title without a count when there is none; the note « Règle semi-circulaire : vérifiée en France '
      'seulement. » out of the count, under the group or alone, and « … tableau de la France non lu … » in a computation of its own; the '
      'mark « hors règle semi-circulaire » on the row of the warned route only',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0530 (the ergonomist, 21 Nov, ergonome_MOTS_SOG-0530_DECIDES.md: the place, the sentences (a) to (d), no count when n = 0, '
      'the mark on the row of the route; the relay\'s reading of the captures: the tracks of the drawn legs, the parity of the table, the '
      'table not read never next to checked routes); AeroDB lot B e45662187; a fake launcher, an invented route, points and values')
def f298(c):
    st = _route_launcher(c, ['route/compute'])
    st['alts'] = [
        _lvl_alt(1, 'Via UN10', ['LFRS', 'LUGEN', 'NEPIX', 'XQNOR', 'LFML'], 260, verdict='conform', unverifiable=[],
                 warnings=[_LVL_A, _LVL_B], levelRule=_lvl_rule(1, 1, ['be'])),
        _lvl_alt(2, 'Direct · FL250', ['LFRS', 'NEPIX', 'XQNOR', 'XQSUD', 'LFML'], 250, verdict='unverifiable',
                 unverifiable=[{'code': 'network_gap', 'values': {'from_point': 'LFRS', 'to_point': 'NEPIX', 'nm': 61}, 'text': 'gap'}],
                 warnings=[_LVL_C], levelRule=_lvl_rule(0, 1)),
        _lvl_alt(3, 'Direct · FL190', ['LFRS', 'LUGEN', 'LFML'], 190, verdict='conform', unverifiable=[], warnings=[], levelRule=_lvl_rule())]
    want = {'fr': {'title': ['Niveau de croisière : 1 avertissement', 'Niveau de croisière'],
                   'a': 'LUGEN → NEPIX, route au 123° : un niveau impair est attendu — FL250 ou FL270',
                   'b': 'NEPIX → XQNOR, route au 088° : trop près de 090° pour dire si le FL260 convient',
                   'c': 'XQNOR → XQSUD : déclinaison magnétique inconnue',
                   'abroad': 'Règle semi-circulaire : vérifiée en France seulement.',
                   'missing': 'Règle semi-circulaire : tableau de la France non lu — mettre les données à jour.',
                   'mark': 'hors règle semi-circulaire'},
            'en': {'title': ['Cruising level: 1 warning', 'Cruising level'],
                   'a': 'LUGEN → NEPIX, track 123°: an odd level is expected — FL250 or FL270',
                   'b': 'NEPIX → XQNOR, track 088°: too close to 090° to tell whether FL260 fits',
                   'c': 'XQNOR → XQSUD: magnetic declination unknown',
                   'abroad': 'Semicircular rule: checked in France only.',
                   'missing': 'Semicircular rule: table of France not read — update the data.',
                   'mark': 'outside the semicircular rule'},
            # « Reiseflugfläche »: the word of Fuel's German for the cruise level (TX.level), not « Reiseflughöhe » (the relay)
            'de': {'title': ['Reiseflugfläche: 1 Warnung', 'Reiseflugfläche'],
                   'a': 'LUGEN → NEPIX, Kurs 123°: eine ungerade Flugfläche wird erwartet — FL250 oder FL270',
                   'b': 'NEPIX → XQNOR, Kurs 088°: zu nah an 090°, um zu sagen, ob FL260 passt',
                   'c': 'XQNOR → XQSUD: Ortsmissweisung unbekannt',
                   'abroad': 'Halbkreisregel: nur in Frankreich geprüft.',
                   'missing': 'Halbkreisregel: Tabelle Frankreichs nicht gelesen — Daten aktualisieren.',
                   'mark': 'außerhalb der Halbkreisregel'},
            'es': {'title': ['Nivel de crucero: 1 aviso', 'Nivel de crucero'],
                   'a': 'LUGEN → NEPIX, rumbo 123°: se espera un nivel impar — FL250 o FL270',
                   'b': 'NEPIX → XQNOR, rumbo 088°: demasiado cerca de 090° para saber si el FL260 conviene',
                   'c': 'XQNOR → XQSUD: declinación magnética desconocida',
                   'abroad': 'Regla semicircular: verificada solo en Francia.',
                   'missing': 'Regla semicircular: tabla de Francia no leída — actualizar los datos.',
                   'mark': 'fuera de la regla semicircular'}}[c.lang]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}
            d[1]['level'] = {'ft': 26000}  # the level of the warned route
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    A = f'{FUEL} [data-altlist]'
    c.until(f"document.querySelectorAll('{A} [data-alt] [data-verdict]').length === 3", timeout=10000, what='the three verdicts')
    G = lambda i: f'{A} [data-alt="{i}"] details[data-reasons=level]'
    c.eq([norm(c.text(f'{G(i)} > summary') or '') for i in range(3)], [norm(want['title'][0]), norm(want['title'][1]), ''],
         '{n} = levelRule.warnings; without one, the title has no count; no line, no group', what='titles')
    c.eq([norm(x) for x in c.js(f"[...document.querySelectorAll('{G(0)} li, {G(1)} li')].map(e => e.textContent)")],
         [norm(want['a']), norm(want['b']), norm(want['c'])], 'the lines (a), (b), (c): the place first, the degrees on three figures',
         what='lines')
    # never the verdict: the engine's word stays, (b) and (c) are never « Non vérifiable »
    c.eq([c.js(f"document.querySelector('{A} [data-alt=\"{i}\"] [data-verdict]')?.dataset.verdict") for i in range(3)],
         ['conform', 'unverifiable', 'conform'], 'the verdicts of the engine unchanged by the group', what='verdict')
    c.eq(c.count(f'{A} [data-alt="1"] details[data-reasons=unverifiable] li'), 1, '(c) is not a line of « Non vérifiable »', what='apart')
    c.eq(c.js(f"[...document.querySelectorAll('{A} [data-alt=\"1\"] details[data-reasons]')].map(d => d.dataset.reasons)"),
         ['unverifiable', 'level'], 'the group after « Non vérifiable » (the least serious last)', what='order')
    c.ok(c.js(f"document.querySelector('{G(0)} > summary').classList.contains('f-warn')"), 'tone', 'the warning tone of the suite')
    c.eq([norm(c.text(f'{A} [data-alt="{i}"] [data-levelnote]') or '') for i in range(3)], [norm(want['abroad']), '', ''],
         'the note « France only » under the group of the route that leaves France, nothing otherwise', what='note')
    c.eq(c.count(f'{G(2)}'), 0, 'no group without a line (a), (b) or (c)', what='no group')
    c.eq([norm(c.text(f'{A} [data-alt="{i}"] [data-semicirc]') or '') for i in range(3)], [norm(want['mark']), '', ''],
         'the mark on the row of the route whose level is outside the rule, nothing on the others', what='mark')
    # the captures: the row of the route with its mark at the top, its group open under it (the relay: the mark was scrolled off)
    top = lambda i: c.js(f"""(() => {{ const e = document.querySelector('{A} [data-alt="{i}"]'); e.style.scrollMarginTop = '96px';
        e.scrollIntoView({{block: 'start'}}) }})()""")
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelectorAll('{A} details[data-reasons=level]').forEach(d => d.open = true)")
        top(0)
        c.ok(c.js(f"""(() => {{ const r = document.querySelector('{A} [data-alt="0"] [data-semicirc]').getBoundingClientRect();
            return r.top >= 0 && r.bottom <= innerHeight && r.height > 0 }})()"""), 'off', 'the mark in the capture')
        c.shot(f'F298_{c.design}_{w}_{c.lang}_warned.png')
        top(1)
        c.shot(f'F298_{c.design}_{w}_{c.lang}_nocount.png')
    # the table of France not read: a computation of its own (the table is the same for every route), the note alone under each
    st['alts'] = [_lvl_alt(1, 'Via UN10', ['LFRS', 'LUGEN', 'NEPIX', 'XQNOR', 'LFML'], 260, verdict='conform', unverifiable=[], warnings=[],
                           levelRule=_lvl_rule(table_missing=True)),
                  _lvl_alt(2, 'Direct · FL190', ['LFRS', 'LUGEN', 'LFML'], 190, verdict='conform', unverifiable=[], warnings=[],
                           levelRule=_lvl_rule(table_missing=True))]
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    _compute_now(c, st)
    c.until(f"document.querySelectorAll('{A} [data-alt] [data-verdict]').length === 2", timeout=10000, what='the new computation')
    c.eq([norm(c.text(f'{A} [data-alt="{i}"] [data-levelnote]') or '') for i in range(2)], [norm(want['missing'])] * 2,
         'the table not read: the note alone under every route, no group', what='table not read')
    c.eq(c.count(f'{A} details[data-reasons=level]'), 0, 'no group without a line', what='no group (table)')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        top(0)
        c.shot(f'F298_{c.design}_{w}_{c.lang}_notable.png')
    c.check_errors()


_XQNE = {'id': 'XQNE', 'lat': 50.5, 'lon': 5.0}  # an invented arrival to the north-east of LFRS: 053° true, 330 NM
_C30J_HI = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'unit': 'kg', 'usableFuel': 20000,
            'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000, 'ceilingFt': 25000}}


def _auto_ne(c, st, rule, min_ft):
    """« Auto » on the flight LFRS → XQNE (053°), the levels from `min_ft` to the ceiling of the sheet (FL250; a constraint of the
    route gives the floor); `rule(levels)` answers route/levels. Returns the levels asked."""
    st['levels_rule'] = rule
    docs = flight_docs()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft']['sheetId'] = 'C30J'
            r = d[1]['route']
            r.update(arr='XQNE', text='LFRS XQNE', points=[r['points'][0], _XQNE], distanceNm=330, trackDeg=53,
                     constraints={'XQNE': min_ft})
    c.open('fuel', docs=docs + [['aircraft/sheets/C30J.json', _C30J_HI, 'document']], airfields=True,
           aero_extra={'aerodromes': [{'icao': 'XQNE', 'name': 'XQNE TEST', 'lat': _XQNE['lat'], 'lon': _XQNE['lon'], 'elev': 100}]})
    wait_quote(c)
    to_step(c, 0)
    n0 = len(st['posts'])
    c.tap(f'{FUEL} [data-do="levelauto"]')
    for _ in range(60):
        got = [p.get('args') or {} for p in st['posts'][n0:] if 'levels' in (p.get('args') or {})]
        if got:
            return got[0].get('levels') or []
        c.wait(200)
    raise Fail('no route/levels request', 'a request', 'none')


def _ne_semi(x):
    """The table of France on 053° (about 052° magnetic): below FL195 the half 000–179 (odd), above it the half 270–089 (even)."""
    return 'ok' if (x // 10 % 2 == 1) == (x < 195) else 'warning'


def _ne_answer(lv, valid=lambda x: True, connector=lambda x: 'procedure'):
    """route/levels after AeroDB lot C: each level judged, conforming_tried, first_valid_conforming, no_conforming_valid."""
    levels = [dict(_lv(x, valid(x), connector(x) if valid(x) else 'none', '' if valid(x) else _LV_NONE), semicircular=_ne_semi(x),
                   warnings=int(_ne_semi(x) == 'warning')) for x in lv]
    tried = [x['fl'] for x in levels if x['semicircular'] == 'ok']
    ok = [x['fl'] for x in levels if x['valid']]
    fvc = next((x for x in tried if x in ok), None)
    return {'ok': True, 'levels': levels, 'first_valid': ok[0] if ok else None, 'conforming_tried': tried, 'first_valid_conforming': fvc,
            'no_conforming_valid': bool(tried) and fvc is None and bool(ok), 'stopped': 'end', 'asked': len(lv)}


@case('F299', '« Auto » level: when the level kept is outside the semicircular rule and no conforming level was tried (route/levels: '
      'semicircular « warning », conforming_tried empty), its sentence ends with « — hors règle semi-circulaire »; the choice does not '
      'change; nothing for a level that follows the rule',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0530 (the ergonomist, 21 Nov: the suffix when no level conforms; the relay\'s reading of the captures: a level the table '
      'really refuses); AeroDB lots B and C; a fake launcher, an invented sheet and an invented arrival XQNE to the north-east (053° true); '
      'lot C (the candidates of both parities, the relay, 21 Nov): the floor of the route at FL250, the ceiling of the sheet, so FL250 '
      '(odd, the UTA half 270–089 expects even) is the only level tried — fixture changed on purpose')
def f299(c):
    st = _route_launcher(c, ['route/compute', 'route/levels'])
    mark = {'fr': '— hors règle semi-circulaire', 'en': '— outside the semicircular rule', 'de': '— außerhalb der Halbkreisregel',
            'es': '— fuera de la regla semicircular'}[c.lang]
    fl = f'{FUEL} input[data-k="fl"]'
    L = f'{FUEL} [data-lvlwhy]'
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    lv = _auto_ne(c, st, _ne_answer, 25000)
    c.eq(lv, [250], 'the only level between the floor of the route and the ceiling of the sheet', what='levels')
    c.until(f"(v) => document.querySelector('{fl}').value === v", '250', what='FL250 taken (the choice unchanged)')
    c.until(f"(document.querySelector('{L} [data-lvlmain]')?.textContent || '').includes('(auto)')", timeout=8000, what='the sentence')
    c.ok(norm(mark) in norm(c.text(f'{L} [data-lvlmain]') or ''), c.text(f'{L} [data-lvlmain]'), 'the suffix at the end of the sentence')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{fl}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F299_{c.design}_{w}_{c.lang}_outside.png')
    _auto_ne(c, st, lambda lv: dict(_ne_answer(lv), levels=[dict(x, semicircular='ok', warnings=0) for x in _ne_answer(lv)['levels']],
                                    conforming_tried=list(lv), first_valid_conforming=lv[0]), 25000)
    c.until(f"(document.querySelector('{L} [data-lvlmain]')?.textContent || '').includes('(auto)')", timeout=8000, what='the sentence')
    c.ok(norm(mark) not in norm(c.text(f'{L} [data-lvlmain]') or ''), c.text(f'{L} [data-lvlmain]'), 'nothing for a level that follows the rule')
    c.check_errors()


@case('F300', '« Auto » level after AeroDB lot C: Fuel sends the levels of BOTH parities (it no longer deduces the semicircular rule from '
      'the true track) and keeps the first valid level the engine says conforms — on 053° above FL195, an EVEN level; a conforming level '
      'reached by a direct connector before a level outside the rule with a procedure (the connector said); when only levels outside the '
      'rule are valid (no_conforming_valid), the first valid one and « — aucun niveau conforme à la règle semi-circulaire n\'a de route '
      'valide »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0530 lot C (the ergonomist, point 4 of the fiche: « le moteur ne propose pas de lui-même un niveau qui enfreint la règle '
      'quand un niveau conforme valide aussi »; the relay, 21 Nov: both parities, conformity first, then the procedure); AeroDB e3f5f476f; '
      'a fake launcher, an invented sheet and an invented arrival XQNE to the north-east (053° true)')
def f300(c):
    st = _route_launcher(c, ['route/compute', 'route/levels'])
    none = {'fr': '— aucun niveau conforme à la règle semi-circulaire n’a de route valide',
            'en': '— no level that follows the semicircular rule has a valid route',
            'de': '— keine Flugfläche nach der Halbkreisregel hat eine gültige Route',
            'es': '— ningún nivel conforme a la regla semicircular tiene ruta válida'}[c.lang]
    mark = {'fr': 'hors règle semi-circulaire', 'en': 'outside the semicircular rule', 'de': 'außerhalb der Halbkreisregel',
            'es': 'fuera de la regla semicircular'}[c.lang]
    direct = {'fr': 'raccord direct', 'en': 'direct connector', 'de': 'Direktanschluss', 'es': 'enlace directo'}[c.lang]
    fl = f'{FUEL} input[data-k="fl"]'
    M = f'{FUEL} [data-lvlwhy] [data-lvlmain]'
    said = lambda: norm(c.text(M) or '')

    def shots(tag):
        for w in (390, 1280):
            c.page.set_viewport_size({'width': w, 'height': c.height})
            c.settle()
            c.js(_F281_NOTES_OFF)
            c.js(f"document.querySelector('{fl}').scrollIntoView({{block: 'center'}})")
            c.shot(f'F300_{c.design}_{w}_{c.lang}_{tag}.png')
        c.page.set_viewport_size({'width': 390, 'height': c.height})

    c.page.set_viewport_size({'width': 390, 'height': c.height})
    # 1. every level valid: the first conforming one, EVEN above FL195 on 053° (red before: only odd levels were sent)
    lv = _auto_ne(c, st, _ne_answer, 20000)
    c.ok({x // 10 % 2 for x in lv} == {0, 1} and all(200 <= x <= 250 for x in lv), lv, 'the levels of both parities, from the floor to the ceiling')
    even = [x for x in lv if x // 10 % 2 == 0]
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(even[0]), what='the first conforming level taken: an even one')
    c.until(f"(document.querySelector('{M}')?.textContent || '').includes('(auto)')", timeout=8000, what='the sentence')
    c.ok(norm(mark) not in said() and norm(none) not in said(), said(), 'a conforming level: neither the mark nor the sentence')
    shots('conform')
    # 2. conformity first, then the procedure: a conforming level reached by a direct connector beats a level outside the rule with one
    lv = _auto_ne(c, st, lambda lv: _ne_answer(lv, connector=lambda x: 'direct' if x // 10 % 2 == 0 else 'procedure'), 20000)
    even = [x for x in lv if x // 10 % 2 == 0]
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(even[0]), what='the conforming level, by a direct connector')
    c.until(f"(w) => (document.querySelector('{M}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", norm(direct),
            timeout=8000, what='the direct connector said')
    # 3. only the levels outside the rule are valid: the engine says so (no_conforming_valid), the first valid level is kept, in plain words
    lv = _auto_ne(c, st, lambda lv: _ne_answer(lv, valid=lambda x: x // 10 % 2 == 1), 20000)
    odd = [x for x in lv if x // 10 % 2 == 1]
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(odd[0]), what='the first valid level, outside the rule')
    c.until(f"(w) => (document.querySelector('{M}')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(w)", norm(none),
            timeout=8000, what='« aucun niveau conforme … » said')
    c.ok(norm(mark) not in said(), said(), 'the plain sentence instead of the suffix')
    shots('noconform')
    c.check_errors()


@case('F301', '« Auto » level: the VERDICT of each level first — a level « conforme » is kept before a level « non vérifiable », even '
      'when both follow the semicircular rule; a level that breaks a known rule is never kept; THEN the semicircular rule, THEN the '
      'published connector',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0540 (the ergonomist, 21 Nov: « conforme avant non vérifiable, une route en infraction jamais gardée, puis la règle '
      'semi-circulaire, puis le raccord publié »); route/levels `verdict` per level (AeroDB SOG-0532 (3)); a fake launcher, an invented '
      'sheet and an invented arrival XQNE to the north-east (053° true: the even levels follow the rule above FL195)')
def f301(c):
    st = _route_launcher(c, ['route/compute', 'route/levels'])
    fl = f'{FUEL} input[data-k="fl"]'
    M = f'{FUEL} [data-lvlwhy] [data-lvlmain]'

    def answer(lv, verdict):
        res = _ne_answer(lv)
        for x in res['levels']:
            x['verdict'] = verdict(x['fl'])
        return res

    c.page.set_viewport_size({'width': 390, 'height': c.height})
    ev = lambda lv: [x for x in lv if x // 10 % 2 == 0]  # the levels asked are read from the request (_auto_ne), never from the rule
    # the first even level (it follows the rule) is « non vérifiable », the next even one « conforme »: the second is kept
    lv = _auto_ne(c, st, lambda lv: answer(lv, lambda x: 'unverifiable' if x == ev(lv)[0] else 'conform'), 20000)
    even = ev(lv)
    c.ok(len(even) >= 2, even, 'two even levels asked (from FL200 to FL250)')
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(even[1]), what='the level « conforme » kept before the « non vérifiable » one')
    c.until(f"(document.querySelector('{M}')?.textContent || '').includes('(auto)')", timeout=8000, what='the sentence')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(_F281_NOTES_OFF)
        c.js(f"document.querySelector('{fl}').scrollIntoView({{block: 'center'}})")
        c.shot(f'F301_{c.design}_{w}_{c.lang}_verdict.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    # the verdict before the rule: every even level « non vérifiable », the odd ones « conforme » (outside the rule): an odd one is kept
    lv = _auto_ne(c, st, lambda lv: answer(lv, lambda x: 'unverifiable' if x // 10 % 2 == 0 else 'conform'), 20000)
    c.until(f"(v) => document.querySelector('{fl}').value === v", str([x for x in lv if x // 10 % 2 == 1][0]),
            what='the verdict before the semicircular rule')
    # a level that breaks a known rule is never kept, even « valid » in an answer that says so (a defensive reading)
    lv = _auto_ne(c, st, lambda lv: answer(lv, lambda x: 'violates' if x == lv[0] else 'unverifiable'), 20000)
    c.until(f"(v) => document.querySelector('{fl}').value === v", str(ev(lv[1:])[0]), what='a level in breach never kept')
    c.check_errors()


def _prop_net(c, tafs=None, fail=False):
    """SOG-0544: a FAKE launcher (never a real one, no real network): /__setup/status says a launcher is here, and its relay /__setup/net
    answers the TAFs of aviationweather with `tafs` {ICAO: TAF} (an aerodrome left out: no TAF, the read took place) or, `fail`, a 500
    (the read failed: W.taf rejects); everything else falls back to the fake launcher of the route. Returns the ids of each TAF call."""
    import urllib.parse
    _route_launcher(c, [])
    calls = []

    def net(route):
        try:
            url = json.loads(route.request.post_data or '{}').get('url') or ''
        except ValueError:
            url = ''
        u = urllib.parse.urlparse(url)
        if u.hostname != 'aviationweather.gov' or not u.path.endswith('/taf'):
            return route.fallback()
        ids = [x for x in (urllib.parse.parse_qs(u.query).get('ids', [''])[0]).split(',') if x]
        calls.append(ids)
        if fail:
            return route.fulfill(status=500, headers={'x-sog-reason': 'http-500'}, content_type='application/json', body='{}')
        route.fulfill(status=200, content_type='application/json', body=json.dumps([dict(tafs[i], icaoId=i) for i in ids if i in (tafs or {})]))
    c.context.route(re.compile(r'/__setup/net'), net)
    return calls


_HHMM = re.compile(r'^\d{2}:\d{2}Z$')


@case('F302', '« Proposer un dégagement »: the weather of the SEVEN aerodromes proposed is read in one call of the weather layer; a terrain '
      'whose weather is not known is never « ok » (the Map would draw it green) and comes after those whose weather is read and good; '
      '« météo non lue » only for a read that did not take place (a failed read: with its reason, never « aucun TAF »); the other cases '
      'say their own word (wx-notaf, wx-notime, wx-outside, wx-nocat, with the existing sentences), in Fuel and in the document of the Map '
      '(wxv: the hours HH:MMZ)', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0544 (the user: « « météo non lue » pour les terrains de dégagement, à traiter en priorité. c\'est idiot. »; the ergonomist\'s '
      'criterion: a terrain whose weather is not known is never drawn as a good one and comes after those whose weather is read and good; '
      'the relay, 21 Nov: option (a), the whole existing sentences, wxv { at } | { a, b }); a fake launcher, invented aerodromes and TAFs')
def f302(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    B = f'{FUEL} [data-altnchk]'
    D = 'cache/fuel/altn_candidates.json'
    now = int(time.time())
    vfr = _altn_taf('VFR', now)
    # 1. the launcher answers: XQPF (4th, never read before) without a TAF, XQPH with a TAF that gives neither ceiling nor visibility,
    #    LFMT with a TAF that ends before the arrival
    calls = _prop_net(c, {'XQPH': dict(vfr, fcsts=[dict(vfr['fcsts'][0], visib=None, clouds=[])]),
                          'LFMT': dict(vfr, validTimeFrom=now - 3600, validTimeTo=now + 1800)})
    c.page.set_viewport_size({'width': 390, 'height': 844})
    _prop_open(c, tafs={'XQPB': 'VFR', 'XQPC': 'VFR', 'XQPE': 'LIFR'})
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.tap(f'{B} [data-do=altnpropose]')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000, what='three aerodromes listed')
    d = c.until_doc(D, lambda d: bool(d) and len(d.get('list') or []) == 5, 'the document of the Map', timeout=10000)
    xq = [ids for ids in calls if any(i.startswith('XQ') for i in ids)]
    c.eq(len(xq), 1, 'ONE call of the weather layer for the terrains proposed (red before: none, the fourth and later never read)',
         what=str(calls))
    c.ok({'XQPF', 'XQPH', 'LFMT'} <= set(xq[0]), xq[0], 'the terrains without a kept TAF asked together, the seventh as the first')
    by = {x['icao']: x for x in d['list']}
    c.eq((by['XQPF']['state'], by['XQPF']['why']), ('warn', ['wx-notaf']),
         'read, no TAF: « wx-notaf », and « warn », never « ok » (red before: ok, « wx-unread »)', what='XQPF')
    c.eq((by['XQPH']['state'], by['XQPH']['why']), ('warn', ['aids-unread', 'wx-nocat']), 'a TAF without ceiling nor visibility: wx-nocat',
         what='XQPH')
    c.ok(bool(_HHMM.match(str((by['XQPH'].get('wxv') or {}).get('a'))) and _HHMM.match(str((by['XQPH'].get('wxv') or {}).get('b')))),
         by['XQPH'], 'its hours in the document: wxv { a, b }, HH:MMZ')
    c.eq(by['LFMT']['why'][-1], 'wx-outside', 'the arrival outside the validity of the TAF: wx-outside', what=str(by['LFMT']))
    c.ok(bool(_HHMM.match(str((by['LFMT'].get('wxv') or {}).get('at')))), by['LFMT'], 'its hour in the document: wxv { at }, HH:MMZ')
    st = [x['state'] for x in d['list']]
    c.eq(st, sorted(st, key=lambda s: s != 'ok'), 'the good ones first', what=str(st))
    c.eq([x['icao'] for x in d['list'] if x['state'] == 'ok'], ['XQPB'], 'only the terrain whose weather is read and good is « ok »',
         what=str(d['list']))
    # the sentence of each code, said in Fuel: XQPF touched on the Map (proposed)
    c.js("window.dispatchEvent(new CustomEvent('maps-altn-pick', { detail: { icao: 'XQPF' } }))")
    c.until(f"!!document.querySelector('{B} li[data-proposed][data-cand=XQPF]')", timeout=8000, what='« Proposé : XQPF »')
    row = norm(c.text(f'{B} li[data-proposed]') or '')
    c.ok(norm(tx(T, 'wxNoTaf', L, after='altnWhy')) in row and norm(tx(T, "wx-unread'", L, after='altnPropWhy')) not in row, row,
         'XQPF says « no TAF read for this aerodrome », the existing sentence, not « météo non lue »')
    c.eq(c.js(f"document.querySelector('{B} li[data-proposed]').dataset.state"), 'grey', 'its sign: not checked (?), never ✓', what='sign')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 900})
        c.settle()
        c.js(f"document.querySelector('{B} details[data-altnprop]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F302_{c.design}_{w}_{L}_codes.png')
    c.js("window.dispatchEvent(new CustomEvent('maps-altn-pick', { detail: { icao: 'LFMT' } }))")
    c.until(f"!!document.querySelector('{B} li[data-proposed][data-cand=LFMT]')", timeout=8000, what='« Proposé : LFMT »')
    at = by['LFMT']['wxv']['at']
    row = norm(c.text(f'{B} li[data-proposed]') or '')
    c.ok(norm(tx(T, 'wxOutside', L, after='altnWhy').replace('{at}', at)) in row, row, 'LFMT says the arrival outside the validity, its hour')
    c.check_errors()


@case('F303', '« Proposer un dégagement »: a FAILED read of the weather says « météo non lue » with its reason (« source météo injoignable »), '
      'never « aucun TAF lu »; the terrain is « warn » in the document of the Map and comes after the terrains whose weather is read; a '
      'flight without its date: « wx-notime », the existing sentence', 'F', tags=('fuel', 'weather'), designs=('standard',), screens=True,
      langs4=True,
      rule='SOG-0544 (the relay, 21 Nov: « je vérifierai au go qu\'un W.taf en échec dit la lecture manquée (« météo non lue » avec sa '
      'raison), jamais « aucun TAF » »); a fake launcher whose relay answers 500, invented aerodromes and TAFs')
def f303(c):
    T = 'modules/fuel/module.js'
    L = c.lang
    B = f'{FUEL} [data-altnchk]'
    D = 'cache/fuel/altn_candidates.json'
    calls = _prop_net(c, fail=True)
    c.page.set_viewport_size({'width': 390, 'height': 844})
    # XQPB (the closest, checked) without a kept TAF: its read fails
    _prop_open(c, tafs={'XQPC': 'VFR', 'XQPE': 'LIFR', 'XQPF': 'VFR'})
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.tap(f'{B} [data-do=altnpropose]')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000, what='three aerodromes listed')
    d = c.until_doc(D, lambda d: bool(d) and len(d.get('list') or []) == 5, 'the document of the Map', timeout=10000)
    c.ok(any('XQPB' in ids for ids in calls), str(calls), 'XQPB asked (the fake relay answers 500)')
    by = {x['icao']: x for x in d['list']}
    c.eq((by['XQPB']['state'], by['XQPB']['why']), ('warn', ['wx-unread']),
         'a failed read: « wx-unread », « warn » (red before: « ok », the Map drew it green)', what='XQPB')
    near = c.js(f"[...document.querySelectorAll('{B} [data-altnprop] li[data-cand]')].map(li => li.dataset.cand)")
    c.eq(near, ['XQPC', 'XQPE', 'XQPF'], 'the terrains whose weather is read first: XQPB, unknown, after them (red before: XQPB first)',
         what='list')
    c.js("window.dispatchEvent(new CustomEvent('maps-altn-pick', { detail: { icao: 'XQPB' } }))")
    c.until(f"!!document.querySelector('{B} li[data-proposed][data-cand=XQPB]')", timeout=8000, what='« Proposé : XQPB »')
    c.wait(600)   # the second read of the touched terrain fails too
    row = norm(c.text(f'{B} li[data-proposed]') or '')
    c.ok(norm(tx(T, "wx-unread'", L, after='altnPropWhy')) in row and norm(tx(T, 'wxUnreachable', L, after='altnWhy')) in row, row,
         '« météo non lue » and its reason, « source météo injoignable »')
    c.ok(norm(tx(T, 'wxNoTaf', L, after='altnWhy')) not in row, row, 'never « aucun TAF lu pour ce terrain » (red before)')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': 900})
        c.settle()
        c.js(f"document.querySelector('{B} details[data-altnprop]').scrollIntoView({{block: 'center'}})")
        c.shot(f'F303_{c.design}_{w}_{L}_failed.png')
    # a flight without its date: no hour of arrival at the alternate, « wx-notime » for every terrain
    _prop_open(c, tafs={'XQPB': 'VFR', 'XQPC': 'VFR', 'XQPE': 'LIFR', 'XQPF': 'VFR'}, planned=False)
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.tap(f'{B} [data-do=altnpropose]')
    d = c.until_doc(D, lambda d: bool(d) and len(d.get('list') or []) > 0 and d.get('key') and all(x['why'] for x in d['list']),
                    'the document of the Map', timeout=20000)
    c.ok(all(x['state'] == 'warn' and x['why'][-1] == 'wx-notime' for x in d['list']), d['list'],
         'no date: every terrain « warn » with « wx-notime » (red before: « ok », « wx-unread »)')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000, what='three aerodromes listed')
    row = norm(c.text(f'{B} [data-altnprop] li[data-cand]') or '')
    c.ok(norm(tx(T, 'wxNoTime', L, after='altnWhy')) in row, row, 'the existing sentence of a missing date')
    c.check_errors()


def _altn_fuel_shown(c, icao):
    """The alternate fuel Fuel shows on the line of `icao` in the list of the proposal: (digits, unit), whatever the language's
    grouping (« 1 490 », « 1,490 », « 1.490 »)."""
    t = c.js(f"[...document.querySelectorAll('{FUEL} [data-altnchk] li[data-cand={icao}] .fu-nowrap')].map(s => s.textContent)"
             ".find(t => / (kg|lb)$/.test(t)) || ''")
    m = re.match(r'^([\d\s.,\u00a0\u202f]+) (kg|lb)$', t.strip())
    return (int(re.sub(r'\D', '', m.group(1))), m.group(2)) if m else (None, t)


@case('F304', '« Proposer un dégagement »: the alternate fuel of the document of the Map is in the unit Fuel SHOWS (the setting, else the '
      'sheet\'s), already converted and rounded as on Fuel\'s line — the Map converts nothing; changing the setting writes the document '
      'again', 'F', tags=('fuel',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0549 (BUGS SOG, fiche of the relay, 21 Nov: the Map said « 2 600 lb » where Fuel said kg; contract: fuel.amount in the '
      'displayed unit, as fuelTxt rounds it, unit = that unit); invented aerodromes, a sheet in lb, the display in kg (the default)')
def f304(c):
    B = f'{FUEL} [data-altnchk]'
    D = 'cache/fuel/altn_candidates.json'
    c.page.set_viewport_size({'width': 390, 'height': 844})
    _prop_open(c)
    c.until(f"!!document.querySelector('{B} [data-do=altnpropose]')", timeout=15000, what='« Proposer un dégagement »')
    c.tap(f'{B} [data-do=altnpropose]')
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=20000, what='three listed')
    d = c.until_doc(D, lambda d: bool(d) and len(d.get('list') or []) == 5, 'the document of the Map', timeout=10000)
    shown = _altn_fuel_shown(c, 'XQPB')
    f = {x['icao']: x for x in d['list']}['XQPB']['fuel']
    c.eq((f['amount'], f['unit']), shown, 'the document says what Fuel shows: kg, converted (red before: lb, the sheet\'s amount)',
         what='kg')
    # the setting changed to lb: the document follows, the line of Fuel too
    to_step(c, 3)
    c.js("""() => { const s = document.querySelector('[data-module=fuel] select[data-k="unit"]'); s.value = 'lb';
      s.dispatchEvent(new Event('change', { bubbles: true })); return true }""")
    d = c.until_doc(D, lambda d: bool(d) and len(d.get('list') or []) == 5 and d['list'][0]['fuel']['unit'] == 'lb',
                    'the document written again in lb', timeout=10000)
    to_step(c, 0)
    c.until(f"document.querySelectorAll('{B} [data-altnprop] li[data-cand]').length === 3", timeout=10000, what='the list again')
    shown = _altn_fuel_shown(c, 'XQPB')
    f = {x['icao']: x for x in d['list']}['XQPB']['fuel']
    c.eq((f['amount'], f['unit']), shown, 'in lb, the same number as Fuel\'s line', what='lb')
    c.check_errors()


# SOG-0545: the words of the list of routes, written in clear (never read from the texts of the module)
_RT_WORDS = {
    'fr': {'cols': ['Distance', 'Temps', 'Étape'], 'line': '« conforme » : conforme à ce que nous savons lire. Seul Eurocontrol valide un plan.',
           'conform': 'conforme', 'fast': 'la plus rapide', 'eco': 'la plus économe', 'chosen': 'choisie', 'take': 'Choisir'},
    'en': {'cols': ['Distance', 'Time', 'Trip'], 'line': '“conforms”: conforms to what we can read. Only Eurocontrol validates a plan.',
           'conform': 'conforms', 'fast': 'fastest', 'eco': 'most economical', 'chosen': 'chosen', 'take': 'Choose'},
    'de': {'cols': ['Entfernung', 'Zeit', 'Reise'], 'line': '„konform“: entspricht dem, was wir lesen können. Nur Eurocontrol validiert einen Plan.',
           'conform': 'konform', 'fast': 'die schnellste', 'eco': 'die sparsamste', 'chosen': 'gewählt', 'take': 'Auswählen'},
    'es': {'cols': ['Distancia', 'Tiempo', 'Etapa'], 'line': '«conforme»: conforme a lo que sabemos leer. Solo Eurocontrol valida un plan.',
           'conform': 'conforme', 'fast': 'la más rápida', 'eco': 'la más económica', 'chosen': 'elegida', 'take': 'Elegir'},
}
# invented positions of the points of the three routes (the engine's `points`, view.points_of)
_RT_PTS = {'LFRS': (47.15, -1.61), 'LUGEN': (46.6, -0.9), 'NEPIX': (45.0, 2.5), 'BOSUP': (45.9, 1.2), 'LFML': (43.44, 5.22)}


def _rt_pts(*ids):
    return [{'id': i, 'lat': _RT_PTS[i][0], 'lon': _RT_PTS[i][1]} for i in ids]


def _rt_mins(t):
    """« 1 h 28 » or « 1 h 24–1 h 33 » → the highest number of minutes (the order of the ranges: the high end first)."""
    m = [int(h) * 60 + int(mm) for h, mm in re.findall(r'(\d+) h (\d{2})', t)]
    return max(m) if m else None


def _rt_fuel(t):
    """« 3 255 kg », « 3,255 kg », « 3 150–3 380 kg » → the highest amount (digits of the grouping removed)."""
    parts = [int(re.sub(r'\D', '', x)) for x in re.split(r'[–-]', re.sub(r'\s*(kg|lb)\s*$', '', t)) if re.sub(r'\D', '', x)]
    return max(parts) if parts else None


@case('F305', 'Route step, level fixed: each route of the list says its DISTANCE, TIME and TRIP FUEL (the quote of Fuel applied to its '
      'points at its level), in columns named once above the list; « la plus rapide » and « la plus économe » on the best figures, never '
      'on a route that breaks a known rule; the order: the chosen route, then « conforme », « non vérifiable », « enfreint », then by '
      'fuel; « conforme » in one word, explained once under « Calculé à »; the chosen route marked « choisie », without « Choisir »',
      'F', tags=('fuel', 'aerodb'), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0545 (c) (the mock-up v2 approved by the ergonomist, 21 Nov: modules/fuel/maquette/routes.html, #fixed; criteria a, b, c '
      'and e of the fiche; « choisie » instead of « pris »); a fake launcher, invented routes, positions and rules')
def f305(c):
    st = _route_launcher(c, ['route/compute'])
    W = _RT_WORDS[c.lang]
    segs = [_seg('LFRS', 'LUGEN'), _seg('LUGEN', 'NEPIX'), _seg('NEPIX', 'LFML')]
    st['alts'] = [
        dict(_alt(1, 'Via UN10', 'LFRS NTS1A LUGEN UN10 NEPIX MEN1A LFML', 370, 270, segs), faults=1, faulty=True, verdict='violates',
             violations=[{'code': 'rad_rule', 'values': {'id': 'XX9001', 'target': 'LUGEN–NEPIX'}, 'text': 'Règle XX9001'}], unverifiable=[],
             points=_rt_pts('LFRS', 'LUGEN', 'NEPIX', 'LFML')),
        dict(_alt(2, 'Direct', 'LFRS NTS1A NEPIX MEN1A LFML', 365, 270, segs), verdict='unverifiable', violations=[],
             unverifiable=[{'code': 'network_gap', 'values': {'from_point': 'LUGEN', 'to_point': 'NEPIX', 'nm': 61}, 'text': 'gap'}],
             points=_rt_pts('LFRS', 'NEPIX', 'LFML')),
        dict(_alt(3, 'Via UM728', 'LFRS NTS1A LUGEN UM728 BOSUP MEN1A LFML', 382, 270, segs), verdict='conform', violations=[], unverifiable=[],
             points=_rt_pts('LFRS', 'LUGEN', 'BOSUP', 'LFML'))]
    docs = proc_flight()
    for d in docs:
        if d[0].endswith('current_flight.json'):
            d[1]['aircraft'] = {'type': 'C30J'}
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.open('fuel', docs=proc_docs() + docs, airfields=True)
    wait_quote(c)
    to_step(c, 1)
    _compute_now(c, st)
    A = f'{FUEL} [data-altlist]'
    c.until(f"document.querySelectorAll('{A} [data-alt] [data-figs]').length === 3", timeout=10000,
            what='the three routes with their figures (red before: no figures)')
    rows = c.js(f"""[...document.querySelectorAll('{A} [data-alt]')].map(e => ({{ i: +e.dataset.alt, name: e.querySelector('[data-altname]').textContent,
        nm: e.querySelector('[data-fignm]')?.textContent || '', min: e.querySelector('[data-figmin]')?.textContent || '',
        trip: e.querySelector('[data-figtrip]')?.textContent || '', fast: !!e.querySelector('[data-fastest]'), eco: !!e.querySelector('[data-cheapest]'),
        verdict: e.querySelector('[data-verdict]')?.dataset.verdict || '', conform: e.querySelector('[data-verdict=conform]')?.textContent || '' }}))""")
    c.eq([r['name'] for r in rows], ['Via UM728', 'Direct', 'Via UN10'], 'the order: « conforme », « non vérifiable », « enfreint »', what='order')
    c.eq([norm(r['nm']) for r in rows], ['382 NM', '365 NM', '370 NM'], 'the distance of each route', what='distance')
    c.ok(all(re.fullmatch(r'\d+ h \d{2}(–\d+ h \d{2})?', norm(r['min'])) for r in rows), [r['min'] for r in rows], 'the time « 1 h 28 »')
    c.ok(all(_rt_fuel(r['trip']) and norm(r['trip']).endswith((' kg', ' lb')) for r in rows), [r['trip'] for r in rows], 'the trip fuel')
    c.eq(norm(rows[0]['conform']), norm(W['conform']), '« conforme » in one word on the route', what='conform word')
    c.eq(c.count(f'{FUEL} [data-onlyeuro]'), 0, 'never under a route any more', what='under')
    c.eq(norm(c.text(f'{FUEL} [data-conformline]') or ''), norm(W['line']), '« conforme » explained once, under « Calculé à »', what='line')
    c.eq([norm(x) for x in c.js(f"[...document.querySelectorAll('{FUEL} [data-figcols] span')].map(e => e.textContent)")],
         [norm(x) for x in W['cols']], 'the three figures named once, above the list', what='columns')
    ok = [r for r in rows if r['verdict'] != 'violates']
    best_t = min(_rt_mins(r['min']) for r in ok)
    best_f = min(_rt_fuel(r['trip']) for r in ok)
    c.eq([r['name'] for r in rows if r['fast']], [r['name'] for r in ok if _rt_mins(r['min']) == best_t][:1],
         '« la plus rapide » on the best time of the routes that break nothing', what='fastest')
    c.eq([r['name'] for r in rows if r['eco']], [r['name'] for r in ok if _rt_fuel(r['trip']) == best_f][:1],
         '« la plus économe » on the least trip fuel', what='cheapest')
    c.ok(not rows[2]['fast'] and not rows[2]['eco'], rows[2], 'never a mention on « enfreint »')
    marks = [norm(x) for x in c.js(f"[...document.querySelectorAll('{A} [data-fastest], {A} [data-cheapest]')].map(e => e.textContent)")]
    c.ok(set(marks) <= {norm(W['fast']), norm(W['eco'])} and marks, marks, 'the words of the mentions')
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.settle()
        c.js(f"document.querySelector('{FUEL} [data-routealts]').scrollIntoView({{block: 'start'}})")
        c.shot(f'F305_{c.design}_{w}_{c.lang}_fixed.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    # « Choisir » on « Direct »: the list gives way to one line (SOG-0224), with « choisi »
    c.tap(f'{A} [data-alt="1"] [data-do=rtake]')
    c.until(f"!!document.querySelector('{FUEL} [data-routealts] [data-rtaken]')", timeout=8000, what='the route taken')
    taken = {'fr': 'Itinéraire choisi : Direct. La route est modifiée.', 'en': 'Route chosen: Direct. The route is changed.',
             'de': 'Route gewählt: Direct. Die Route ist geändert.', 'es': 'Itinerario elegido: Direct. La ruta se ha cambiado.'}[c.lang]
    c.eq(norm(c.text(f'{FUEL} [data-rtaken]') or ''), norm(taken), '« choisi », the word of « Choisir » (no more « pris »)', what='taken')
    c.check_errors()
