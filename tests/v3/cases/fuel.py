"""Area F - fuel (PLAN.md section F; modules/fuel/SPEC.md, lot `v3-fuel-ergo` and `v3-unites-carburant`).

Rules covered
  * the module opens on the Plan ("Devis") view, not the Sheets view (F1);
  * the sticky result bar is compact: one context line, three one-line tiles, at most 120 px (F2);
  * the display units (kt / km/h, ft / m, NM / km / SM) change the figures and keep flight levels as FL (F3);
  * no horizontal page scroll at 390 and 360 px (F4; the date row overflowed until 24 Oct);
  * the wording "Devis" is not both the tab and a step of the same view (F5; step 4 is now "Résultat");
  * the flight date is one value: the field writes `planned_at` of the current flight (F6).

Cases: F1 F2 F3 F4 F5 F6.  A quote needs a flight: the planned flight of lib.FLIGHT (type C30J, 366 NM) is seeded, so fuel
computes an estimated quote with no sheet and no network.
"""
from lib import Fail, Skip, case, norm, tx

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
      rule='fuel INTEGRATION 3 (24 Oct): the field writes current_flight.planned_at; weather.when is its copy; the Map reads the ETA from it')
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
    c.eq((r.get('weather') or {}).get('when'), local, 'weather.when is the same date in the device time', what='weather.when')
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
    c.eq((r.get('weather') or {}).get('when'), '', 'weather.when is empty too', what='weather.when after Now')
    r = waited(lambda r: not (r.get('progress') or {}).get('eta'), 'an undated flight has no ETA to promise')
