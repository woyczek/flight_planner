"""Area D - maps (PLAN.md section D and the "new" cases D11-D13 of section L; modules/maps/SPEC.md, lot of 24 Oct).

Rules covered
  * the buttons over the map: order, labels in four languages, Follow and the editing buttons hidden when they must be (D1);
  * Edit mode: pressed state, the "+" and Undo buttons, a one-time hint notification, Escape (D2);
  * Layers inside the sheet, flight selector first (D3); the Profile / Weather chips (D4);
  * the "data access not set" / "database not published" notice, once per mount (D5, D5b); the modes panel (D6); the folded attribution (D7);
  * a started flight (D8), no flight (D9), a mission map without data (D10);
  * the map's own controls stay above the sheet, one attribution, one "i" icon (D19); nothing of the map is redrawn, resized or grey while
    a finger drags the sheet (D20);
  * L1 the sheet content is closable and leaves the map half the view (D11); L3 the profile canvas draws one level and no
    green / orange dots (D12); L14 a drag on the map or a wheel on the sheet does not close a content (D13).

Cases: D1 D2 D3 D4 D5 D5b D6 D7 D8 D9 D10 D11 D12 D13 D14 D15 D16 D17 D18 D19 D20 D21-D24 (the profile window) D25 D25b (one window for the cut) D27 (one line per VFR reporting point) D28 (the folded "Aussi ici" line) (the complexity slider, the airline's thresholds, the tuning page's access: 24 Oct).  Seeding: the planned flight of lib.FLIGHT (a started one for D8);
MapLibre runs on an empty style answered by the runner, so the attribution control exists without any network.
"""
import os
import re
import time

from lib import FLIGHT, MAP_JS, ROOT, STUB_STYLE, Fail, Skip, case, forget, norm, tx

M = 'modules/maps/module.js'
APP = 'frame/app.js'
MAPS = '[data-module="maps"]'


def row(c, key, **kw):
    return tx(M, key, c.lang, **kw)


def vis_right(c):
    """Visible buttons of the right column, in order: [{mp, title, pressed, box}]."""
    return c.js("""[...document.querySelectorAll('.f-ov-right > .f-ov-btn')].filter(b => window.__t.shown(b))
        .map(b => ({ mp: b.dataset.mp || (b.classList.contains('f-ov-full') ? 'full' : ''), title: b.title, pressed: b.getAttribute('aria-pressed'),
                     disabled: b.disabled, box: window.__t.box(b) }))""")


def aligned(c, what):
    ov = c.box('.f-overlay')
    for b in vis_right(c):
        c.eq(round(ov['r'] - b['box']['r'], 1), 8, 'right edge at the layer right minus 8 px', tol=1, what=f'{what}: "{b["title"]}" distance to the layer right')


@case('D1', 'Buttons', 'D', tags=('overlay', 'maps'), screens=False, langs4=True, rule='maps lot point 2')
def d1(c):
    c.open('maps', flight=True)
    btns = vis_right(c)
    order = [b['mp'] for b in btns]
    c.eq(order, ['route', 'fit', 'mode', 'edit', 'full'], 'right column: Edit the route, Recentre, mode, Edit (toggle), then the frame\'s full screen', what='visible right buttons in order')
    t = {b['mp']: b for b in btns}
    c.eq(t['route']['title'], row(c, 'edit'), 'the route button is named in the language of the run', what='route button title')
    c.eq(t['fit']['title'], row(c, 'fit'), 'the Recentre button is named in the language of the run', what='fit button title')
    c.ok(norm(t['mode']['title']).startswith(norm(row(c, 'preset'))), f'mode button title {t["mode"]["title"]!r}', f'starts with "{row(c, "preset")}"')
    c.eq(t['edit']['title'], row(c, 'editHelp'), 'the Edit toggle is named in the language of the run', what='edit button title')
    c.eq(t['edit']['pressed'], 'false', 'the Edit button is a toggle, released', what='edit aria-pressed')
    c.eq(t['full']['title'], tx(APP, 'enter', c.lang, after='full: {'), 'the frame\'s full-screen button is named in the language of the run', what='full button title')
    for mp, why in (('follow', 'Follow is hidden without a started flight'), ('add', '"+" is hidden outside Edit mode'), ('undo', 'Undo is hidden outside Edit mode')):
        c.ok(not c.shown(f'[data-mp="{mp}"]'), f'[data-mp={mp}] is displayed', why)


@case('D2', 'Edit mode', 'D', tags=('overlay', 'maps'), screens=False, langs4=True, rule='maps lot points 2, 6, 8')
def d2(c):
    c.open('maps', flight=True)
    hint = norm(row(c, 'editHint'))
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit becomes pressed')
    c.wait(300)
    order = [b['mp'] for b in vis_right(c)]
    c.ok('add' in order and 'undo' in order, f'right column after Edit: {order}', '"+" and Undo appear in the right column')
    c.eq(c.js("document.querySelector('[data-mp=undo]').disabled"), True, 'Undo is disabled with nothing to undo', what='Undo disabled')
    aligned(c, 'Edit mode')
    c.eq(sum(1 for n in c.note_log() if norm(n) == hint), 1, 'the Edit help appears as a notification once', what='Edit hint notifications after the first toggle')
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'false'", what='Edit is released')
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit pressed again')
    c.wait(300)
    c.eq(sum(1 for n in c.note_log() if norm(n) == hint), 1, 'the Edit help is not repeated on a second toggle', what='Edit hint notifications after the second toggle')
    c.key('Escape')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'false'", what='Escape leaves the Edit mode')


def layers_btn(c):
    return '[data-mp="layers"]'                      # the Layers button of the left column (maps)


@case('D3', 'Layers in the sheet', 'D', tags=('sheet', 'maps'), screens=False, langs4=True,
      rule='amendment of 24 Oct (user: "le sélecteur de couche passe par dessus")')
def d3(c):
    c.open('maps', flight=True)
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='the Layers content opens in the sheet')
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok(norm(title).startswith(norm(row(c, 'layers'))), f'sheet title {title!r}', f'starts with "{row(c, "layers")}"')
    first = c.js("""() => { const b = document.querySelector('.mp-dbody'); const e = [...b.querySelectorAll('select, input, button')].find(x => window.__t.shown(x));
        return e ? e.tagName.toLowerCase() + (e.type ? ':' + e.type : '') : null }""")
    c.eq(first, 'select:select-one', 'the flight selector is the first control of the content', what='first control')
    n = c.js("[...document.querySelectorAll('.mp-dbody input[type=checkbox]')].filter(e => window.__t.shown(e.parentElement)).length")
    c.ge(n, 5, 'the layer checkboxes follow the selector', what='visible layer checkboxes')
    c.eq(c.attr(layers_btn(c), 'aria-pressed'), 'true', 'the Layers button is pressed while its content is open', what='Layers aria-pressed')
    c.tap('.f-sheet-close')
    c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='the close button hides')
    c.eq(c.attr(layers_btn(c), 'aria-pressed'), 'false', 'the Layers button is released after the close', what='Layers aria-pressed after the close')
    c.ok(norm(c.grip()).startswith(norm(tx(M, 'dataProfile', c.lang))), 'the profile did not come back (the bare head is not named after it)', 'back to the profile')


@case('D4', 'Profile / Weather chips', 'D', tags=('sheet', 'maps'), screens=False, langs4=True, rule='maps lot point 4')
def d4(c):
    c.open('maps', flight=True, forecast=True)
    c.page.add_style_tag(content='#fNotes{display:none!important}')      # the "data access not set" toast covers the foot of the sheet: this case measures the sheet
    chips = c.boxes('.mp-chip[data-view]')
    c.eq(len(chips), 2, 'two view chips (Profile, Weather)', what='view chips')
    c.eq(c.js("[...document.querySelectorAll('.mp-chip')].at(-1).hasAttribute('data-legend')"), True, 'the "i" legend chip is the last chip', what='last chip')
    fixed_chips(c, 'profile with a forecast', legend=True)
    info = c.js("[...document.querySelectorAll('.mp-chip[data-view]')].map(b => ({ title: b.title, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), hidden: b.hidden }))")
    names = [row(c, 'dataProfile'), row(c, 'wxTitle')]
    c.eq(info[0]['title'], names[0], 'the Profile chip is named in the language of the run', what='Profile chip title')
    c.eq(info[0]['pressed'], 'true', 'the Profile chip is pressed by default', what='Profile chip aria-pressed')
    c.ok(info[1]['pressed'] in ('true', 'false'), f'Weather chip aria-pressed {info[1]["pressed"]!r}', 'a toggle (aria-pressed)')
    c.eq(info[1]['title'], names[1], 'the Weather chip is named in the language of the run', what='Weather chip title')
    for i, ch in enumerate(chips):
        c.ge(round(ch['w']), 28, 'icon chips of the bare line are at least 28 px', what=f'chip {i} width')
    # the chips are in the bare line (V3 spec 7.1.13, fourth refinement): 28 px chips, the primitive's touch zone of 44 px (its top is clipped by the sheet's edge)
    hit = c.js("""() => [...document.querySelectorAll('.mp-chip')].map(b => { const r = b.getBoundingClientRect(), x = r.left + r.width / 2; let lo = null, hi = null;
        for (let y = Math.max(0, r.top - 30); y < r.bottom + 40; y++) { const e = document.elementFromPoint(x, y); if (e && e.closest('.mp-chip') === b) { if (lo === null) lo = y; hi = y } }
        return hi === null ? 0 : hi - lo + 1 })""")
    for i, h in enumerate(hit):
        c.ge(h, 34, f'chip {i}: touch zone {h} px high', 'a touch zone of the primitive: 44 px centred on a 28 px chip, its top clipped by the sheet (36 px)')
    sheet_body_checks(c)
    fixed_chips_without_legend(c)
    fixed_chips_no_forecast(c)


def fixed_chips(c, what, legend, weather=True):
    """V3 spec 7.1.13, fourth refinement (user 25 Oct: "ils doivent rester 3, pas faire d'aller-retour entre 2 et 3"): the three chips (Profile,
    Weather, "i") are always there, shown, in this order; one with nothing to show is `disabled` + `aria-disabled`, never removed or hidden."""
    g = c.js("""() => [...document.querySelectorAll('.f-sheet-head .mp-chip')].map(b => ({ kind: b.dataset.view || 'legend', hidden: b.hidden, shown: window.__t.shown(b),
        disabled: b.disabled, aria: b.getAttribute('aria-disabled') }))""")
    c.eq([x['kind'] for x in g], ['profile', 'weather', 'legend'], 'three chips, always, in the head line, in this order', what=f'{what}: chips')
    c.ok(all(x['shown'] and not x['hidden'] for x in g), f'{what}: {g}', 'no chip is hidden: a chip without content is disabled, never removed')
    c.eq([x['disabled'] for x in g], [False, not weather, not legend], 'only the chips without content are disabled', what=f'{what}: disabled chips')
    c.eq([x['aria'] for x in g], ['false', str(not weather).lower(), str(not legend).lower()], 'aria-disabled follows disabled', what=f'{what}: aria-disabled')


def fixed_chips_without_legend(c):
    """The cut's "i" has nothing to show when atmosphere's `sectionLegend` is not there: the chip stays (three chips), disabled; the Profile one
    keeps its legend, so the count is three on both views.  The module file of atmosphere is served without its `sectionLegend` export."""
    src = (ROOT / 'modules/atmosphere/section.js').read_text(encoding='utf-8')
    gone = src.replace('export function sectionLegend(', 'export function sectionLegendGone(')
    c.ok(gone != src, 'the export sectionLegend of modules/atmosphere/section.js', 'is found (the test removes it to simulate a build without a legend)')
    # the frame's service worker answers the module files itself, out of reach of the page's routes: removed, and not registered again on this page
    c.page.evaluate("""async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        for (const k of await caches.keys()) await caches.delete(k) }""")
    c.page.goto('about:blank')
    c.page.add_init_script("try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined }) } catch (e) {}")
    c.page.route(re.compile(r'/modules/atmosphere/section\.js'), lambda r: r.fulfill(status=200, content_type='text/javascript', body=gone))
    c.open('maps', flight=True, forecast=True)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    fixed_chips(c, 'profile, cut without legend', legend=True)
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", what='the cut is drawn')
    c.wait(300)
    fixed_chips(c, 'cut without legend (Sx.sectionLegend absent)', legend=False)
    c.ok(c.shown('.mp-chip[data-legend]'), 'the "i" chip is not shown', 'the disabled "i" stays in the line')
    o = c.js("() => +getComputedStyle(document.querySelector('.mp-chip[data-legend]')).opacity")
    c.ok(o < 0.8, f'disabled chip opacity {o}', 'a disabled chip looks muted')
    c.page.unroute(re.compile(r'/modules/atmosphere/section\.js'))


def fixed_chips_no_forecast(c):
    """A mission map has no cut to show: still three chips, the Weather one disabled.  Without a seeded mission the sheet is not there: the
    case checks the flight without a forecast (cut: "no forecast kept", Weather chip enabled, "i" disabled on the cut's message)."""
    forget(c.page, c.doc_paths('cache/weather/'), c.base)         # the forecast seeded above is still in this browser's cache
    c.open('maps', flight=True)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    fixed_chips(c, 'profile, no forecast', legend=True)
    c.tap('.mp-chip[data-view="weather"]')
    c.wait(600)
    fixed_chips(c, 'cut, no forecast kept', legend=False)


_GEO_JS = """() => { const q = s => document.querySelector(s), r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, h: b.height, shown: b.height > 0 && getComputedStyle(e).display !== 'none' } };
  const body = q('.mp-dbody'), svg = q('.mp-dbody svg'), cv = q('.mp-pc');
  return { sheet: q('[data-module="maps"]').dataset.sheet, panel: r(q('.f-sheet-panel')), head: r(q('.f-sheet-head')), title: r(q('.f-sheet-title')), bare: q('.f-sheet-head').classList.contains('f-sheet-head-bare'),
           dprof: r(q('.mp-dprof')), cv: r(cv), strip: r(q('.mp-strip')), notes: r(q('.mp-notes')), body: r(body), svg: r(svg),
           scroll: body ? [body.scrollHeight, body.clientHeight] : null, dprofScroll: [q('.mp-dprof').scrollHeight, q('.mp-dprof').clientHeight],
           axis: cv ? [cv.dataset.axis, +cv.dataset.marks] : null, wxAxis: body ? body.dataset.axis : null, svgText: svg ? svg.textContent : '' } }"""


def bare_head(c, what):
    """The head over a drawing is bare (V3 spec 7.1.13): 28 px (the frame's --f-sheet-head-bare), no title, the handle names the drawing."""
    g = c.js(_GEO_JS)
    c.ok(g['bare'], f'{what}: head classes without f-sheet-head-bare', 'the head over a drawing carries .f-sheet-head-bare')
    c.ok(abs(g['head']['h'] + 1 - 28) <= 2, f'{what}: head {g["head"]["h"]:.0f} px high', 'the bare head is 28 px (+-2) high (its border line counted)')
    c.ok(not g['title']['shown'], f'{what}: the title is shown over the drawing', 'no title above a drawing (the drawing already says FL, distance and flight)')
    return g


def titled_head(c, what):
    """Refinement of 7.1.13 (24 Oct, 21:05): expanded, collapsed and in the landscape column the head keeps its title (FL, NM, flight state)."""
    g = c.js(_GEO_JS)
    c.ok(not g['bare'], f'{what}: the head is bare', 'the head keeps its title outside the default position and the portrait')
    c.ok(g['title']['shown'] and g['head']['h'] >= 40, f'{what}: title shown {g["title"]["shown"]}, head {g["head"]["h"]:.0f} px', 'a written title on a normal head (44 px)')
    return g


_CHIPS_JS = """(weather) => { const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } };
  const chips = [...document.querySelectorAll('.mp-chip')].filter(b => !b.hidden).map(r), drawing = document.querySelector(weather ? '.mp-dbody' : '.mp-prof');
  const svg = weather ? document.querySelector('.mp-dbody svg') : document.querySelector('.mp-pc');
  return { chips, head: r(document.querySelector('.f-sheet-head')), panel: r(document.querySelector('.f-sheet-panel')), drawing: r(drawing), ink: r(svg), inHead: !!document.querySelector('.f-sheet-head .mp-chip') } }"""


def chips_layout(c, bare, weather, what, n=None):
    """V3 spec 7.1.13, fourth refinement (25 Oct): the three chips are IN the head line, at its right, on one row, whatever the position (no column at the
    right of the drawing, no row above it): with the bare handle (default position, portrait) the line is 28 px and the chips 28 px high (touch zones
    of 44 px by the primitive); with the title line (expanded, collapsed, landscape column) the line is 44 px and the chips 40 px.  Either way the
    drawing takes the whole width, starts at the left edge of the body and right under the line."""
    g = c.js(_CHIPS_JS, weather)
    ch, d, p, h = g['chips'], g['drawing'], g['panel'], g['head']
    n = n or 3                            # Profile, Weather and the "i" legend chip: three, always
    c.eq(len(ch), n, 'the three chips of the drawing are shown', what=f'{what}: chips')
    c.ok(g['inHead'], f'{what}: chips inside the head {g["inHead"]}', 'the chips are in the head line (no column, no row of their own)')
    c.le(round(d['l'] - p['l'], 1), 8, 'the drawing starts at the left edge of the body (8 px at most)', what=f'{what}: drawing left against sheet left')
    c.le(round(ch[0]['t'] - p['t'], 1), 8, 'the chips are in the line (top of the sheet)', what=f'{what}: chips top against sheet top')
    c.le(round(max(x['b'] for x in ch) - h['b'], 1), 2, 'the chips are inside the head band', what=f'{what}: chips bottom against head bottom')
    c.le(abs(round(ch[0]['t'] - ch[-1]['t'], 1)), 1, 'the chips are on one row', what=f'{what}: chip tops')
    c.ge(round(ch[1]['l'] - ch[0]['r'], 1), 0, 'the second chip is to the right of the first', what=f'{what}: chip gap')
    c.ge(round(ch[-1]['r'] - p['r'] + 8, 1), 0, 'the chips are at the right of the line', what=f'{what}: chips right against sheet right')
    c.ge(round(g['ink']['r'] - p['r'] + 12, 1), 0, 'the drawing takes the whole width (no column at its right)', what=f'{what}: drawing right against sheet right')
    c.ge(round(g['ink']['t'] - h['b'], 1), -1, 'nothing between the head and the drawing', what=f'{what}: drawing top against head bottom')
    c.le(round(g['ink']['t'] - h['b'], 1), 8, 'no row of chips above the drawing', what=f'{what}: drawing top against head bottom')
    hh = round(ch[0]['b'] - ch[0]['t'])
    if bare:
        c.le(abs(hh - 28), 1, 'bare handle: the chips are 28 px high (the primitive sets it)', what=f'{what}: chip height')
        c.le(round(h['b'] - h['t']), 29, 'bare handle: the line is 28 px (one line, the chips in it)', what=f'{what}: head height')
        c.ge(round(g['ink']['b'] - g['ink']['t']), 100, 'the drawing keeps its height under the line', what=f'{what}: drawing height')
    else:
        c.le(abs(hh - 40), 1, 'title line: the chips are 40 px high', what=f'{what}: chip height')


_SWATCH_JS = """() => {
  // computed colours come as rgb()/rgba() or, for a colour-mix(), as color(srgb r g b / a) with channels in 0..1
  const rgba = v => { const m = /(rgba?|color\\(srgb)\\(?\\s*([^)]+)\\)/.exec(v || ''); if (!m) return null; const k = m[1] === 'rgba' || m[1] === 'rgb' ? 1 : 255;
    const a = m[2].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: a[0] * k, g: a[1] * k, b: a[2] * k, a: a.length > 3 ? a[3] : 1 } };
  const paints = (el, pseudo) => { const cs = getComputedStyle(el, pseudo || null), out = [];
    if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return out;
    const bg = rgba(cs.backgroundColor); if (bg && bg.a > 0) out.push(bg);
    for (const side of ['Top', 'Left']) if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') { const c = rgba(cs['border' + side + 'Color']); if (c && c.a > 0) out.push(c) }
    for (const m of (cs.backgroundImage || '').matchAll(/(?:rgba?|color\\(srgb)\\(?[^)]+\\)/g)) { const c = rgba(m[0]); if (c && c.a > 0) out.push(c) }
    return out };
  return [...document.querySelectorAll('.mp-legend li')].map(li => {
    const sw = li.querySelector('.mp-lg-sw'), svg = sw.querySelector('svg'), label = (li.querySelector('span') || {}).textContent || '';
    let cols = [], shapes = [], dashes = [], pairs = [], vertical = false;
    if (svg) {
      for (const e of svg.querySelectorAll('line, rect, circle, path')) {
        const cs = getComputedStyle(e), tag = e.tagName.toLowerCase();
        if (e.closest('defs')) continue;
        shapes.push(tag);
        const st = rgba(cs.stroke), fl = rgba(cs.fill);
        if (cs.stroke !== 'none' && st && st.a > 0) cols.push(st);
        if (cs.fill !== 'none' && fl && fl.a > 0) cols.push(fl);
        else if (/^url\\(/.test(cs.fill)) cols.push({ r: 0, g: 0, b: 1, a: 1, url: true });
        for (const [att, prop] of [['stroke', 'stroke'], ['fill', 'fill']]) { const v = e.getAttribute(att);   // a series colour (--at-*): the cut draws it with the same token
          const d = v && v.startsWith('var(--at-') ? document.querySelector('.mp-dbody svg [' + att + '="' + v + '"]') : null;
          if (d) pairs.push({ att: v, sw: getComputedStyle(e)[prop], drawn: getComputedStyle(d)[prop] }) }
        if (e.getAttribute('stroke-dasharray')) dashes.push(e.getAttribute('stroke-dasharray'));
        if (tag === 'line' && e.getAttribute('x1') === e.getAttribute('x2')) vertical = true;
      }
    } else cols = paints(sw).concat(paints(sw, '::after'));
    // a box whose `--c` is empty falls back on the text colour (the bug's grey-black border): that is not a colour of the series
    const ink = rgba(getComputedStyle(li).color);
    for (const x of cols) x.ink = !!ink && Math.abs(x.r - ink.r) < 2 && Math.abs(x.g - ink.g) < 2 && Math.abs(x.b - ink.b) < 2;
    const size = sw.getBoundingClientRect();
    return { pairs, key: sw.dataset.key || [...sw.classList].find(k => k.startsWith('mp-lg-') && k !== 'mp-lg-sw').slice(6), svg: !!svg, label, cols, shapes, dashes, vertical, w: Math.round(size.width), h: Math.round(size.height) };
  });
}"""
# series that are grey by design (muted / border tokens, a dark ink): only "painted, not transparent" is required of them
_GREY_BY_DESIGN = ('points', 'wind', 'cu', 'isa', 'vdash', 'tri')
# the relief of the cut is a design token (--sog-chart-6 mixed with the chart background): beige in `standard`, grey in `metro` or `swiss`;
# it must be a colour of its own (not the text colour) but may be unsaturated
_UNSATURATED_OK = ('terrain',)


def swatches_painted(c, what, strict=True):
    """User 25 Oct ("Bug : cf screenshot (légende)", the cut's legend on an iPhone: six rows, every colour box empty): in the open legend every
    symbol is PAINTED: at least one computed colour, not transparent and, except for the series that are muted by design, not grey (the box
    fallback #888 of an empty `--c` is what the bug looked like); and a symbol has the size of a symbol.  Returns the rows."""
    rows = c.js(_SWATCH_JS)
    c.ge(len(rows), 1, 'the legend has rows to check', what=f'{what}: legend rows')
    for r in rows:
        tag = f'{what}: row {r["key"]!r} ({r["label"][:30]!r})'
        c.ge(len(r['cols']), 1, 'the symbol is painted (a computed colour that is not transparent)', what=f'{tag}: painted colours')
        if strict and r['key'] not in _GREY_BY_DESIGN:
            col = [x for x in r['cols'] if not x['ink'] and (x.get('url') or r['key'] in _UNSATURATED_OK or max(x['r'], x['g'], x['b']) - min(x['r'], x['g'], x['b']) >= 16)]
            c.ge(len(col), 1, 'the symbol has a colour of its own (not grey, not the text colour)', what=f'{tag}: colours {[(x["r"], x["g"], x["b"]) for x in r["cols"]]}')
        c.ge(r['w'], 20, 'the symbol is a symbol (wide enough)', what=f'{tag}: width')
        c.ge(r['h'], 10, 'the symbol is a symbol (high enough)', what=f'{tag}: height')
        c.ok(bool(r['label'].strip()), f'{tag}: empty label', 'every row has a label')
    return rows


def legend_check(c):
    """V3 spec 7.1.14: the "i" chip (last) shows a legend over the profile: the series actually drawn, with symbol and name in the language of
    the run (produced by the drawing code); closed by Escape, by the chip, by a tap on it."""
    c.eq(c.attr('.mp-chip[data-legend]', 'aria-pressed'), 'false', 'the legend is closed at first', what='legend chip aria-pressed')
    c.ok(c.shown('.mp-chip[data-legend]'), 'the "i" chip is not shown over the profile', 'a legend chip over the profile')
    c.eq(c.attr('.mp-chip[data-legend]', 'title'), row(c, 'legend'), 'the chip is named in the language of the run', what='legend chip title')
    c.tap('.mp-chip[data-legend]')
    c.until("window.__t.shown(document.querySelector('.mp-legend'))", what='the legend opens')
    c.eq(c.attr('.mp-chip[data-legend]', 'aria-pressed'), 'true', 'the chip is pressed while the legend is open', what='legend chip aria-pressed')
    g = c.js("""() => { const l = document.querySelector('.mp-legend'), p = document.querySelector('.mp-prof').getBoundingClientRect(), b = l.getBoundingClientRect();
        return { n: l.querySelectorAll('li').length, first: l.querySelector('li span:last-child').textContent, sw: l.querySelectorAll('li .mp-lg-sw').length,
                 over: b.left <= p.left + 8 && b.right >= p.right - 60 && b.top <= p.top + 4 && b.bottom >= p.bottom - 4 } }""")
    c.ge(g['n'], 3, 'the legend lists at least 3 series (those drawn)', what=f'legend entries ({g["first"]!r}, ...)')
    c.eq(g['sw'], g['n'], 'every entry has its symbol', what='legend symbols')
    c.ok(g['over'], f'legend {g}', 'the legend covers the drawing')
    c.eq(norm(g['first']), norm(row(c, 'lgPlan')), 'the first entry (the planned path) is worded in the language of the run', what='legend first entry')
    pr = swatches_painted(c, 'profile legend')
    kinds = {r['key'] for r in pr}
    c.ok({'line', 'diamond'} <= kinds, f'kinds {sorted(kinds)}', 'the profile legend draws the path as a line and TOC / TOD as a diamond')
    c.key('Escape')
    c.until("!window.__t.shown(document.querySelector('.mp-legend'))", what='Escape closes the legend')
    c.eq(c.attr('.mp-chip[data-legend]', 'aria-pressed'), 'false', 'the chip is released after Escape', what='legend chip aria-pressed')
    c.tap('.mp-chip[data-legend]')
    c.until("window.__t.shown(document.querySelector('.mp-legend'))", what='the legend reopens')
    c.page.mouse.click(*c.js("() => { const b = document.querySelector('.mp-legend').getBoundingClientRect(); return [b.left + 40, b.top + b.height / 2] }"))
    c.until("!window.__t.shown(document.querySelector('.mp-legend'))", what='a tap on the legend closes it')


def cut_legend_check(c):
    """V3 spec 7.1.14 on the weather cut: the "i" chip is shown over the cut too, and its legend lists the series atmosphere's
    `sectionLegend()` reports for the drawn cut (symbol + label), closed by Escape."""
    c.ok(c.shown('.mp-chip[data-legend]'), 'the "i" chip is not shown over the cut', 'a legend chip over the cut')
    c.tap('.mp-chip[data-legend]')
    c.until("window.__t.shown(document.querySelector('.mp-legend'))", what='the cut legend opens')
    g = c.js("() => { const l = document.querySelector('.mp-legend'); return { n: l.querySelectorAll('li').length, sw: l.querySelectorAll('li .mp-lg-sw').length, first: (l.querySelector('li span:last-child') || {}).textContent || '' } }")
    c.ge(g['n'], 3, 'the cut legend lists at least 3 series (from sectionLegend)', what=f'cut legend entries ({g["first"]!r}, ...)')
    c.eq(g['sw'], g['n'], 'every cut legend entry has its symbol', what='cut legend symbols')
    cut_legend_symbols(c)
    c.key('Escape')
    c.until("!window.__t.shown(document.querySelector('.mp-legend'))", what='Escape closes the cut legend')


def cut_legend_symbols(c):
    """The cut's legend (rows of `sectionLegend`, whose `swatch` is a drawn SVG of 28 x 14): each symbol is painted, with the shape the cut
    draws for that series: the computed path a plain line, the planned one dashed '7 4', the requested one dotted '2 4' (the very dashes of the
    cut's own lines), TOC / TOD a disc, the terrain a box, the route points a vertical line; the legend names every series the cut draws."""
    # the colour of a series is the cut's own token (a design may be monochrome: `swiss` draws the computed path black): the check is that
    # the symbol paints what the cut paints, and that in `standard`, whose chart colours differ, no symbol is grey or in the text colour
    rows = swatches_painted(c, 'cut legend', strict=c.design == 'standard')
    for r in rows:
        for pr in r['pairs']:
            c.eq(pr['sw'], pr['drawn'], f'the symbol paints {pr["att"]} as the cut does', what=f'cut legend: row {r["key"]!r}: computed paint of {pr["att"]}')
    c.ge(sum(len(r['pairs']) for r in rows), 4, 'the symbols are compared with the cut\'s own paints (computed, planned, requested, TOC / TOD, relief)', what='cut legend: compared paints')
    by = {r['key']: r for r in rows}
    drawn = set(c.js("() => [...document.querySelectorAll('.mp-dbody svg [stroke-dasharray]')].map(e => e.getAttribute('stroke-dasharray'))"))
    c.ok(all(r['svg'] for r in rows), f'symbols {[(r["key"], r["svg"]) for r in rows]}', 'every cut symbol is the SVG that atmosphere draws (not a Maps box)')
    c.ok({'computed', 'planned', 'requested', 'toc', 'terrain', 'points'} <= set(by), f'keys {sorted(by)}', 'the cut legend names the path, the levels, TOC / TOD, the relief and the route points')
    if {'computed', 'planned', 'requested', 'toc', 'terrain', 'points'} <= set(by):
        c.eq((by['computed']['shapes'], by['computed']['dashes']), (['line'], []), 'the computed path is a plain line', what='computed symbol')
        c.eq(by['planned']['shapes'], ['line'], 'the planned level is a line', what='planned symbol')
        c.eq(by['requested']['shapes'], ['line'], 'the requested level is a line', what='requested symbol')
        for k in ('planned', 'requested'):
            c.ok(by[k]['dashes'] and by[k]['dashes'][0] in drawn, f'{k} dash {by[k]["dashes"]}, dashes of the cut {sorted(drawn)}', f'the {k} symbol has the dash of the line the cut draws')
        c.ok(by['planned']['dashes'] != by['requested']['dashes'], f'{by["planned"]["dashes"]} / {by["requested"]["dashes"]}', 'planned and requested are told apart by their dash')
        c.eq(by['toc']['shapes'], ['circle'], 'TOC / TOD is a disc', what='toc symbol')
        c.eq(by['terrain']['shapes'], ['rect'], 'the relief is a box', what='terrain symbol')
        c.eq((by['points']['shapes'], by['points']['vertical']), (['line'], True), 'the route points are a vertical line', what='points symbol')


def cut_drag(c, what):
    """User 24 Oct ("on peut glisser sur le profil vertical pour voir les espaces, mais pas sur le même en météo"): a drag on the weather cut
    moves the common cursor like on the profile: the map's cursor value follows the finger, and the cut draws its dashed cursor line there."""
    b = c.js("() => { const r = document.querySelector('.mp-dbody svg').getBoundingClientRect(); return { l: r.left, w: r.width, y: r.top + r.height / 2 } }")
    m = c.page.mouse
    x0, x1 = b['l'] + b['w'] * 0.35, b['l'] + b['w'] * 0.8
    m.move(x0, b['y'])
    m.down()
    c.wait(200)
    first = c.attr('.mp-map', 'data-cursor-nm')
    for i in range(1, 11):
        m.move(x0 + (x1 - x0) * i / 10, b['y'])
        c.wait(60)
    c.wait(250)
    last = c.attr('.mp-map', 'data-cursor-nm')
    line = c.js("() => { const l = document.querySelector('.mp-dbody svg line[stroke-dasharray=\"3 2\"]'); if (!l) return null; const s = document.querySelector('.mp-dbody svg').getBoundingClientRect(); return s.left + parseFloat(l.getAttribute('x1')) }")
    m.up()
    c.ok(first not in (None, ''), f'{what}: cursor after the press {first!r}', 'a press on the cut places the common cursor')
    c.ok(last not in (None, '') and float(last) > float(first or 0) + 10, f'{what}: cursor {first!r} -> {last!r} NM', 'a drag along the cut moves the common cursor along the route (the map follows)')
    c.ok(line is not None and abs(line - x1) <= 30, f'{what}: cursor line at x {line} for a finger at {x1:.0f}', 'the cut draws its cursor line where the finger is')


def drawing_fits(c, what, weather):
    """Rule 13 (a): the drawing is drawn at the exact height of the body, its x axis (distances) and its point labels visible, nothing to scroll."""
    if weather:
        c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", what=f'{what}: the cut is drawn (the seeded forecast)')
        c.wait(300)
        g = c.js(_GEO_JS)
        c.le(round(g['body']['b'] - g['panel']['b'], 1), 1, 'the body of the sheet stays inside the sheet', what=f'{what}: body bottom against sheet bottom')
        c.le(abs(round(g['svg']['h'] - g['body']['h'], 1)), 2, 'the cut is drawn at the height of the body', what=f'{what}: cut {g["svg"]["h"]:.0f} px, body {g["body"]["h"]:.0f} px')
        c.le(round(g['svg']['b'] - g['body']['b'], 1), 1, 'the bottom of the cut (distance axis) is inside the body, without scrolling', what=f'{what}: cut bottom against body bottom')
        c.ok(g['scroll'][0] <= g['scroll'][1] + 1, f'{what}: the body scrolls by {g["scroll"][0] - g["scroll"][1]} px', 'a drawing never needs a scroll')
        c.eq(g['wxAxis'], '1', 'the cut reports its axis inside the body (data-axis)', what=f'{what}: .mp-dbody data-axis')
        c.ok(all(p['id'] in g['svgText'] for p in (FLIGHT['route']['points'][0], FLIGHT['route']['points'][-1])), f'{what}: text of the cut {g["svgText"][:80]!r}', 'the labels of the departure and the arrival points are drawn')
    else:
        c.wait(300)
        g = c.js(_GEO_JS)
        c.le(abs(round(g['cv']['h'] - g['dprof']['h'], 1)), 3, 'the profile canvas takes the height of the body', what=f'{what}: canvas {g["cv"]["h"]:.0f} px, body {g["dprof"]["h"]:.0f} px')
        c.le(round(g['cv']['b'] - g['dprof']['b'], 1), 1, 'the canvas (distance axis) ends inside the body', what=f'{what}: canvas bottom against body bottom')
        c.ok(g['dprofScroll'][0] <= g['dprofScroll'][1] + 1, f'{what}: the profile block scrolls by {g["dprofScroll"][0] - g["dprofScroll"][1]} px', 'a drawing never needs a scroll')
        c.eq(g['axis'][0], '1', 'the profile reports its distance axis inside the canvas (data-axis)', what=f'{what}: canvas data-axis')
        c.ge(g['axis'][1], 2, 'the labels of the route points are drawn under the profile (data-marks)', what=f'{what}: points drawn')
    return g


def sheet_body_checks(c):
    """Maps lot of 24 Oct (relay) and rule 13 (20:10): the sheet's default position shows the drawing alone (profile or cut), `.mp-strip` and
    `.mp-notes` come only expanded, under the drawing; the head over a drawing is bare (28 px, no title) at the default position and titled expanded, collapsed and in the landscape column; the drawing is drawn at the exact height
    of the body, the x axis visible without scrolling, in portrait, in landscape (column) and in a short window."""
    # default position, profile: the canvas fills the body, no text line, no notes
    g = c.js(_GEO_JS)
    c.eq(g['sheet'], 'default', 'the sheet opens at its default position', what='sheet position')
    c.ge(round(g['cv']['h'] / g['dprof']['h'], 3), 0.9, 'at the default position the profile canvas takes at least 90 % of the body', what='profile canvas / body')
    c.ok(not g['strip']['shown'] and not g['notes']['shown'], f'strip shown {g["strip"]["shown"]}, notes shown {g["notes"]["shown"]}',
         'the text line and the notes are not shown at the default position')
    bare_head(c, 'profile')
    c.ok(norm(c.grip()).startswith(norm(tx(M, 'dataProfile', c.lang))), 'the handle of the bare head does not name the drawing', 'the handle says "Profil vertical" (title and aria-label)')
    c.eq(norm(c.attr('.f-sheet-head .f-sheet-grip', 'aria-label') or '').startswith(norm(tx(M, 'dataProfile', c.lang))), True, 'the aria-label of the handle names the drawing', what='grip aria-label')
    drawing_fits(c, 'profile portrait 390 x 844', False)
    chips_layout(c, True, False, 'profile portrait')
    legend_check(c)
    # collapsed, nothing is drawn: the head takes its title back (the line is the only thing left to read)
    c.tap('.f-sheet-grip')
    c.until("document.querySelector('[data-module=\"maps\"]').dataset.sheet === 'collapsed'", what='a tap on the handle collapses the sheet')
    c.wait(300)
    g = c.js(_GEO_JS)
    c.ok(not g['bare'] and g['title']['shown'], f'collapsed: bare {g["bare"]}, title shown {g["title"]["shown"]}', 'collapsed, the head has its title (nothing is drawn under it)')
    c.tap('.f-sheet-grip')
    c.until("document.querySelector('[data-module=\"maps\"]').dataset.sheet === 'default'", what='a second tap restores the default position')
    c.wait(300)
    bare_head(c, 'profile after collapsing')
    # default position, weather cut: portrait, then landscape (844 x 390: the sheet is a column at the right since the frame's landscape lot)
    c.tap('.mp-chip[data-view="weather"]')
    bare_head(c, 'weather')
    c.ok(norm(c.grip()).startswith(norm(tx(M, 'wxTitle', c.lang))), 'the handle of the bare head does not name the cut', 'the handle says "Coupe météo"')
    g = drawing_fits(c, 'weather portrait 390 x 844', True)
    chips_layout(c, True, True, 'weather portrait')
    cut_drag(c, 'weather portrait')
    cut_legend_check(c)
    c.ok(not g['strip']['shown'] and not g['notes']['shown'], f'strip shown {g["strip"]["shown"]}, notes shown {g["notes"]["shown"]}',
         'the weather cut alone at the default position')
    c.page.set_viewport_size({'width': 844, 'height': 390})
    c.settle()
    titled_head(c, 'weather landscape column')
    drawing_fits(c, 'weather landscape 844 x 390', True)
    chips_layout(c, False, True, 'weather landscape')
    c.tap('.mp-chip[data-view="profile"]')
    c.wait(500)
    titled_head(c, 'profile landscape column')
    drawing_fits(c, 'profile landscape 844 x 390', False)
    chips_layout(c, False, False, 'profile landscape')
    c.tap('.mp-chip[data-view="weather"]')
    # a short phone window (a small screen, the keyboard up): the default panel keeps its 170 px floor, so the body is 142 px: the cut fits it
    c.page.set_viewport_size({'width': 390, 'height': 520})
    c.settle()
    drawing_fits(c, 'weather short window 390 x 520', True)
    c.tap('.mp-chip[data-view="profile"]')
    c.wait(500)
    drawing_fits(c, 'profile short window 390 x 520', False)
    c.tap('.mp-chip[data-view="weather"]')
    c.page.set_viewport_size({'width': 390, 'height': 844})
    c.settle()
    # expanded: the text line and the notes come under the drawing, which keeps the whole remaining height
    c.drag('.f-sheet-grip', -420)
    titled_head(c, 'weather expanded')
    g = drawing_fits(c, 'weather expanded, portrait', True)
    chips_layout(c, False, True, 'weather expanded')
    c.ok(g['notes']['shown'] and g['notes']['t'] >= g['body']['b'] - 1, f'notes {g["notes"]}', 'expanded: the notes are shown under the drawing')
    c.tap('.mp-chip[data-view="profile"]')
    c.wait(400)
    g = c.js(_GEO_JS)
    c.eq(g['sheet'], 'expanded', 'the sheet stays expanded', what='sheet position')
    c.ok(g['strip']['shown'] and g['strip']['t'] >= g['cv']['b'] - 2, f'strip {g["strip"]}, canvas bottom {g["cv"]["b"]:.0f}', 'expanded: the text line is shown under the profile')
    c.ok(g['notes']['shown'] and g['notes']['t'] >= g['strip']['b'] - 1, f'notes {g["notes"]}', 'expanded: the notes are shown under the text line')


@case('D5', 'Status as notification + note', 'D', tags=('maps',), screens=False, langs4=True, rule='maps lot point 5; settings 24 Oct 2026 (the cause is said)')
def d5(c):
    check_base_note(c, 'noAccess', 'data access not set on this device')


@case('D5b', 'Status: access set, base not published', 'D', tags=('maps',), screens=False, langs4=True,
      rule='"database not published" is kept for an access that works (settings 24 Oct 2026)')
def d5b(c):
    # a device with a GitHub access set (the test network answers nothing, so nothing is published): the old message stays
    c.context.add_init_script("try { localStorage.setItem('githubData:frame', JSON.stringify({ repo: 'sog/data', branch: 'main', token: 'ghp_test' })) } catch (e) {}")
    check_base_note(c, 'noBase', 'database not published')


def check_base_note(c, key, what):
    """D5 and D5b: at mount, exactly one notification and the same text in the sheet notes with a link to the settings;
    leaving and coming back says it once more, not twice in the same page life."""
    c.open('maps', flight=True)
    c.wait(1500)
    text = norm(row(c, key))
    shown = [n for n in c.notes() if norm(n).startswith(text)]
    log = [n for n in c.note_log() if norm(n) == text]
    c.eq(len(log), 1, f'exactly one notification "{what}" at mount', what='notifications with that text')
    c.eq(len(shown), 1, 'one such notification on screen (#fNotes)', what='.f-note elements on screen')
    note = c.js("""(t) => { const p = [...document.querySelectorAll('.mp-notes > *')].find(e => e.textContent.replace(/[\\s\u00a0\u202f]+/g, ' ').trim().startsWith(t));
        return p ? { text: p.textContent, links: p.querySelectorAll('a, button, [data-go]').length } : null }""", text)
    c.ok(note is not None, 'the text is absent from .mp-notes', 'the same text stays readable in the sheet notes')
    c.go('fuel')
    c.go('maps')
    c.wait(1500)
    log = [n for n in c.note_log() if norm(n) == text]
    c.eq(len(log), 2, 'a new mount says it once more (one per mount), not twice in the same page life', what='notifications after leaving and coming back')
    # last, so that a missing link does not hide the checks above: the plan wants the note to lead to the settings
    c.ge(note['links'], 1, 'the note carries a link or button to the settings', what=f'links in the "{what}" note')


@case('D6', 'Modes panel', 'D', tags=('overlay', 'maps'), screens=False, rule='maps lot point 2')
def d6(c):
    c.open('maps', flight=True)
    c.tap('[data-mp="mode"]')
    c.until("window.__t.shown(document.getElementById('mp-mode-opts'))", what='the modes panel opens')
    ch = [b for b in c.boxes('.mp-choice') if b['shown']]
    c.eq(len(ch), 6, 'six mode choices', what='visible choices')
    panel = c.box('#mp-mode-opts')
    c.ok(panel['l'] >= 0 and panel['r'] <= c.width and panel['t'] >= 0 and panel['b'] <= c.height, f'panel box {panel["l"]:.0f},{panel["t"]:.0f} - {panel["r"]:.0f},{panel["b"]:.0f}', 'inside the window')
    mode = c.box('[data-mp="mode"]')
    c.ok(abs((panel['t'] + panel['b']) / 2 - (mode['t'] + mode['b']) / 2) < 80, f'panel at y={panel["t"]:.0f}..{panel["b"]:.0f}, button at y={mode["t"]:.0f}', 'next to the mode button')
    c.tap('.mp-choice[data-mode="topo"]')
    c.until("!window.__t.shown(document.getElementById('mp-mode-opts'))", what='the panel closes after a choice')
    c.eq(c.attr('.mp-choice[data-mode="topo"]', 'aria-pressed'), 'true', 'the chosen mode is pressed', what='chosen choice aria-pressed')
    c.tap('[data-mp="mode"]')
    c.until("window.__t.shown(document.getElementById('mp-mode-opts'))", what='the panel reopens')
    c.key('Escape')
    c.ok(not c.shown('#mp-mode-opts'), 'the modes panel is still open after Escape', 'closed')


@case('D7', 'Attribution folded', 'D', tags=('maps', 'overlay'), screens=False, rule='amendment of 24 Oct (one credit, folded)')
def d7(c):
    """The credit is folded from the moment the control exists, not from the map's `load` event.  The base style is held back (its
    request is answered only when the case says so), so the control exists and the map has not loaded: the state is read there,
    then after the load, then after a resize of the map (MapLibre re-opens an unmarked compact control at every resize).  No delay
    anywhere: each step waits on a state (the held request, the control, its text)."""
    for m, root in (('maps', MAPS), ('atmosphere', '[data-module="atmosphere"]')):
        held = []
        c.page.route(re.compile(r'^https://tiles\.openfreemap\.org/styles/'), lambda route, request, held=held: held.append(route))
        c.open(m, flight=True)
        sel = f'{root} .maplibregl-ctrl-attrib'
        try:
            c.page.wait_for_function(f"!!document.querySelector('{sel}')", timeout=10000)
        except Exception:
            raise Skip(f'#{m}: MapLibre did not start with the empty style, so there is no attribution control to measure') from None
        read = f"""(() => {{ const a = document.querySelector('{sel}'); return {{ n: document.querySelectorAll('{sel}').length,
            open: a.hasAttribute('open'), compact: a.classList.contains('maplibregl-compact'), show: a.classList.contains('maplibregl-compact-show'),
            empty: a.classList.contains('maplibregl-attrib-empty'), w: a.getBoundingClientRect().width,
            credit: document.querySelectorAll('{root} .mp-credit').length }} }})()"""
        def check(when):
            a = c.js(read)
            c.eq(a['n'], 1, 'exactly one credit control on the map', what=f'#{m} attribution controls {when}')
            c.ok(a['compact'] and not a['open'] and not a['show'], f'#{m} {when}: attribution compact={a["compact"]} open={a["open"]} shown={a["show"]}', 'compact and folded')
            c.eq(a['credit'], 0, 'no second credit text (.mp-credit)', what=f'#{m} .mp-credit elements {when}')
            return a
        check('before the style loaded')
        deadline = time.time() + 15
        while not held and time.time() < deadline:
            c.page.wait_for_timeout(50)
        c.ok(bool(held), f'#{m}: the base style was never requested', 'MapLibre asks for the style')
        for route in held:
            route.fulfill(status=200, content_type='application/json', body=STUB_STYLE)
        c.page.unroute(re.compile(r'^https://tiles\.openfreemap\.org/styles/'))
        c.until(f"""(() => {{ const a = document.querySelector('{sel}'); return !!a && !a.classList.contains('maplibregl-attrib-empty') }})()""",
                timeout=15000, what=f'#{m} the attribution control carries its text (the style loaded)')
        a = check('after the load')
        c.le(round(a['w']), 40, 'the folded attribution is a small button', what=f'#{m} attribution width')
        c.page.set_viewport_size({'width': c.width, 'height': c.height - 7})      # MapLibre resizes its map on a window resize
        c.settle()
        check('after the map was resized')


@case('D8', 'Started flight', 'D', tags=('maps',), screens=False, langs4=True, rule='maps lot points 4 and 5')
def d8(c):
    c.open('maps', flight=True, started=True)
    c.wait(2000)
    title = c.grip()                                  # the head is bare over a drawing: the state is said by the handle, not written
    c.ok(norm(row(c, 'stFlying')) in norm(title), f'grip label {title!r}', f'contains "{row(c, "stFlying")}"')
    c.ok(c.shown('[data-mp="follow"]'), 'the Follow button is hidden during a started flight', 'Follow shown')
    c.ok(c.attr('[data-mp="follow"]', 'aria-pressed') in ('true', 'false'), 'Follow has no aria-pressed', 'a toggle (aria-pressed)')
    c.tap('[data-mp="follow"]')
    c.until("document.querySelector('[data-mp=follow]').getAttribute('aria-pressed') === 'true'", what='Follow becomes pressed when tapped')
    text = norm(row(c, 'progNoPos'))
    c.eq(sum(1 for n in c.note_log() if norm(n) == text), 1, 'the "GPS or network not enabled" notification fired once', what='GPS notifications')


@case('D9', 'No flight', 'D', tags=('maps',), screens=False, langs4=True, rule='maps lot "choices"')
def d9(c):
    c.open('maps')                                   # no flight document: the map has no demonstration flight
    c.wait(1200)
    card, box = c.box('.mp-empty'), c.box('.mp-box')
    c.ok(card and card['shown'], 'no card in the map area', 'a card says there is no flight')
    c.ok(norm(row(c, 'noFlight')) in norm(card['text']), f'card text {card["text"]!r}', f'contains "{row(c, "noFlight")}"')
    c.eq(round((card['l'] + card['r']) / 2), round((box['l'] + box['r']) / 2), 'the card is centred in the map area', tol=2, what='card centre x')
    c.eq(round((card['t'] + card['b']) / 2), round((box['t'] + box['b']) / 2), 'the card is centred in the map area', tol=2, what='card centre y')
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='the Layers content is still reachable without a flight')
    c.ok(norm(c.text('.f-sheet-head .f-sheet-title') or '').startswith(norm(row(c, 'layers'))), 'the Layers title is not shown', 'the Layers content opens')


@case('D10', 'Mission map', 'D', tags=('maps',), screens=False, langs4=True, rule='maps lot (mission maps)')
def d10(c):
    c.open('maps?mission=NOSUCH1')
    c.wait(1200)
    lb = c.attr(layers_btn(c), 'title')
    c.eq(lb, row(c, 'pick'), 'for a mission the Layers button is named "Carte à montrer"', what='Layers button title')
    for mp in ('route', 'mode', 'edit', 'follow', 'add', 'undo'):
        c.ok(not c.shown(f'[data-mp="{mp}"]'), f'[data-mp={mp}] is displayed on a mission map', 'route-edit buttons are hidden')
    c.ok(c.shown('.mp-empty'), 'no card for a mission without data', 'a card says the mission is not found')


def tap_airspaces(c):
    """Opens the airspaces list: a tap on an empty place of the map under the two airspaces of lib.aero_docs() (retried while
    the seeded base is being read)."""
    mp = c.js(MAP_JS, 'maps')
    x, y = mp['x'] + 0.577 * mp['w'], mp['y'] + 0.4755 * mp['h']      # off the route, inside the CTA and the TMA
    for _ in range(10):
        c.page.mouse.click(x, y)
        c.wait(700)
        if c.shown('.f-sheet-close'):
            return
        c.wait(800)
    raise Fail('a tap on the map under the seeded airspaces opened nothing in 15 s', 'their list opens in the sheet', 'L1 / L14')


_LV_JS = """() => { const q = s => document.querySelector(s), fs = e => parseFloat(getComputedStyle(e).fontSize), li = [...document.querySelectorAll('.mp-lv-list li')];
  return { body: fs(q('.mp-dbody')), list: fs(li[0]), lh: parseFloat(getComputedStyle(li[0]).lineHeight), n: li.length, rows: li.map(e => e.getBoundingClientRect().height),
           width: q('.mp-lv-list').getBoundingClientRect().width, tail: li.map(e => { const t = e.querySelector('.mp-lv-lim'); return t ? t.getBoundingClientRect().right <= e.getBoundingClientRect().right + 1 && t.getBoundingClientRect().width > 0 : false }) } }"""


def lv_text(c, what):
    """User 24 Oct (landscape shot of "3 espaces sur ce point"): the list is in the size of the sheet's body text, one line per airspace
    ("1 · TMA NANTES 4 · FL055|FL065 · D"), never a wrap by word; the levels and the class stay visible.  User 26 Oct ("Bug affichage de
    texte coupé", D29): when the line is too short the entry takes two lines (the name, the levels under it) instead of an ellipsed name."""
    g = c.js(_LV_JS)
    c.le(abs(round(g['list'] - g['body'], 1)), 1, 'the list has the font size of the sheet body (+-1 px)', what=f'{what}: list {g["list"]:.1f} px, body {g["body"]:.1f} px')
    c.ge(g['n'], 2, 'the seeded airspaces are listed', what=f'{what}: entries')
    for i, h in enumerate(g['rows']):
        c.le(round(h / g['lh'], 2), 2.4, f'entry {i + 1} is {h:.0f} px high for a {g["lh"]:.0f} px line', 'one line per airspace, two when the line is too short (never more)')
    c.ok(all(g['tail']), f'levels visible per entry: {g["tail"]}', 'the levels and the class stay visible (the name is ellipsed, not them)')


@case('D11', 'Airspaces list in the sheet', 'D', tags=('sheet', 'maps'), screens=False,
      rule='L1: the airspaces card was hidden under the map buttons, unclosable, 90 % of the map on a phone (23 Oct)')
def d11(c):
    c.open('maps', flight=True, aero=True)
    c.wait(1500)
    tap_airspaces(c)
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok('2' in title, f'sheet title {title!r}', 'the title counts the 2 airspaces under the point')
    c.ok(c.js("!!document.querySelector('.f-sheet-panel .mp-dbody[data-kind=\"lv\"] .mp-lv-list')"), 'no airspaces list inside the sheet panel', 'the list is the sheet\'s content')
    lv_text(c, 'portrait 390')
    c.page.set_viewport_size({'width': 844, 'height': 390})
    c.settle()
    c.wait(500)
    lv_text(c, 'landscape column 844 x 390')
    c.page.set_viewport_size({'width': 390, 'height': 844})
    c.settle()
    c.wait(500)
    close = c.box('.f-sheet-close')
    c.ok(close['l'] >= 0 and close['r'] <= c.width and close['t'] >= 0 and close['b'] <= c.height, f'✕ box {close["l"]:.0f},{close["t"]:.0f}-{close["r"]:.0f},{close["b"]:.0f}', 'inside the window')
    top = c.js("""() => { const b = document.querySelector('.f-sheet-close').getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return e ? (e.closest('.f-sheet-close') ? 'f-sheet-close' : e.tagName + '.' + e.className) : null }""")
    c.eq(top, 'f-sheet-close', 'the element at the centre of ✕ is ✕ itself (not covered by a button or a card)', what='elementFromPoint at the ✕ centre')
    view = c.height - c.box('.f-head')['h'] - c.box('#fTabs')['h']
    mp = c.js(MAP_JS, 'maps')
    c.ge(round(mp['h'] / view, 3), 0.5, 'the map keeps at least half of the view', what=f'map {mp["h"]:.0f} px of a {view:.0f} px view')
    c.tap('.f-sheet-close')
    c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='✕ closes the list')
    c.ok(norm(c.grip()).startswith(norm(tx(M, 'dataProfile', c.lang))), 'the profile did not come back', 'back to the profile')


# D26 (user 25 Oct, iPhone 390 px, R 57 near Rennes "800 ASFC|1800 ASFC" drawn from the ground to the top): the airspaces graph and the
# vertical profile read a limit with ONE function (SiaAero.limitRead).  Five airspaces on the tapped point, one per notation.
_BIG = [[44.0, 1.0], [44.0, 3.8], [46.0, 3.8], [46.0, 1.0], [44.0, 1.0]]
D26_AS = [
    {'type': 'R', 'name': 'R 57 TEST', 'lower': '800 ASFC', 'upper': '1800 ASFC', 'rings': [_BIG]},
    {'type': 'TMA', 'name': 'TMA 6 TEST', 'lower': 'SFC', 'upper': 'FL065', 'cls': 'D', 'rings': [_BIG]},
    {'type': 'CTA', 'name': 'CTA 7 TEST', 'lower': 'FL065', 'upper': 'UNL', 'cls': 'D', 'rings': [_BIG]},
    {'type': 'D', 'name': 'D 8 TEST', 'lower': '1500 ASFC', 'upper': 'ABC', 'rings': [_BIG]},
]
# user 25 Oct: "pas d'espace de la surface au plafond" - a SIV, a FIR, a control sector (CTL) with no limits at all (as the published base
# carries them: no lower / upper), and a plain SFC-UNL area: neither in the list nor in the profile
D26_FLAT = [
    {'type': 'SIV', 'name': 'SIV TESTVILLE', 'rings': [_BIG]},
    {'type': 'FIR', 'name': 'FIR TESTVILLE', 'rings': [_BIG]},
    {'type': 'CTL', 'name': 'LM TEST', 'rings': [_BIG]},
    {'type': 'R', 'name': 'R 90 FLAT', 'lower': 'SFC', 'upper': 'UNL', 'rings': [_BIG]},
    {'type': 'D', 'name': 'D 91 FLAT', 'lower': '', 'upper': '', 'rings': [_BIG]},
]
# what the reading must say: text -> [ft, rel, unl, ok]  (top = the text is a ceiling)
D26_READ = [
    ('SFC', 0, 1, 0, 1), ('sfc', 0, 1, 0, 1), ('GND', 0, 1, 0, 1), ('UNL', None, 0, 1, 1), ('unl', None, 0, 1, 1), ('FL065', 6500, 0, 0, 1),
    ('FL 065', 6500, 0, 0, 1), ('fl065', 6500, 0, 0, 1), ('3500', 3500, 0, 0, 1), ('3500 AMSL', 3500, 0, 0, 1), ('3500AMSL', 3500, 0, 0, 1),
    ('1500 ASFC', 1500, 1, 0, 1), ('1500ASFC', 1500, 1, 0, 1), ('1500 asfc', 1500, 1, 0, 1), ('800 AGL', 800, 1, 0, 1), ('800AGL', 800, 1, 0, 1),
    ('2500 FT AMSL', 2500, 0, 0, 1), ('2500 ft asfc', 2500, 1, 0, 1), ('1800 ASFC', 1800, 1, 0, 1), ('FL999', None, 0, 1, 1),
    ('300 M', 984, 0, 0, 1), ('', None, 0, 0, 0), ('ABC', None, 0, 0, 0)]


@case('D26', 'Airspaces graph: ASFC read from the ground, unknown ceiling is not UNL', 'D', tags=('sheet', 'maps'), screens=False, langs4=True,
      rule='user 25 Oct (iPhone, R 57 near Rennes "800 ASFC|1800 ASFC"): "La R57 est affichée plus haut que sa hauteur plafond indiquée"')
def d26(c):
    c.open('maps', flight=True, docs=[['cache/maps/ui.json', {'preset': 'low', 'layers': {}}, 'cache']], airspaces=D26_AS + D26_FLAT)   # IFR low: the low spaces are drawn
    c.wait(1500)
    # the one reading (list graph and vertical profile): every notation of the SIA
    rd = c.js("""(rows) => rows.map(r => [r[0], window.SiaAero.limitRead(r[0], true), window.SiaAero.limitRead(r[0], false)])""", D26_READ)
    for (t, ft, rel, unl, ok), (_, up, lo) in zip(D26_READ, rd):
        c.eq([bool(up['rel']), bool(up['unl']), bool(up['ok'])], [bool(rel), bool(unl), bool(ok)], f'limitRead({t!r}) rel / unl / ok', what=f'reading of {t!r}')
        if ft is not None and ok:
            c.le(abs(up['ft'] - ft), 1, f'limitRead({t!r}) is {ft} ft', what=f'{t!r}: {up["ft"]} ft')
        if not ok:
            c.eq([lo['ft'], up['ft'] == float('inf') or up['ft'] is None], [0, True], f'{t!r} unreadable: a floor of 0 and an open ceiling for a filter', what=f'{t!r}')
    tap_airspaces(c)
    n = c.js("document.querySelectorAll('.mp-lv-list li').length")
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.eq(norm(title), norm(tx(M, 'levelsTitle', c.lang).replace('{n}', str(n))), 'the sheet title counts the airspaces, in the language', what=f'title {title!r}, {n} entries')
    c.eq(n, 4, 'four airspaces (R 57, TMA 6, CTA 7, D 8): the five flat ones are left out and not counted', what=f'{n} entries')
    names = c.js("[...document.querySelectorAll('.mp-lv-list .mp-lv-name')].map(e => e.textContent)")
    c.ok(not [x for x in names if re.search(r'SIV|FIR|LM TEST|FLAT', x)], f'listed: {names}', 'no SIV, FIR, sector without limits or SFC-UNL area in the list')
    c.eq(c.js("document.querySelectorAll('svg.mp-lv rect').length"), n, 'one column per listed airspace', what='columns vs list entries')
    c.eq(c.attr('svg.mp-lv', 'aria-label'), tx(M, 'levelsAxis', c.lang), 'the graph is named in the language', what='svg aria-label')
    cols = c.js("""() => { const li = [...document.querySelectorAll('.mp-lv-list li')];       // the column i is the line i
        return [...document.querySelectorAll('svg.mp-lv rect')].map((r, i) => { const b = r.getBoundingClientRect();
          return { name: li[i] ? li[i].textContent : '', lo: r.dataset.lo, up: r.dataset.up, top: b.top, bot: b.bottom, h: b.height, dash: r.getAttribute('stroke-dasharray') } }) }""")
    by = {m.group(1): x for x in cols for m in [re.search(r'(R 57|TMA 6|CTA 7|D 8) TEST', x['name'])] if m}
    for k in ('R 57', 'TMA 6', 'CTA 7', 'D 8'):
        c.ok(k in by, f'the graph has a column for {k}: {sorted(by)}', 'one column per airspace')
    r57, tma, cta, d8 = by['R 57'], by['TMA 6'], by['CTA 7'], by['D 8']
    per_ft = tma['h'] / 6500                                     # the SFC-FL065 column fixes the scale
    c.le(abs(r57['h'] / per_ft - 1000), 250, 'R 57 is as high as 1,000 ft of the graph\'s axis (not the whole axis)', what=f'R 57 {r57["h"]:.1f} px = {r57["h"] / per_ft:.0f} ft; whole axis {tma["h"] / per_ft:.0f}+ ft')
    c.le(abs((tma['bot'] - r57['bot']) / per_ft - 800), 250, 'R 57 starts 800 ft above the ground line (800 ASFC counted from 0)', what=f'floor {(tma["bot"] - r57["bot"]) / per_ft:.0f} ft')
    c.ge(r57['top'] - tma['top'], 2, 'the top of R 57 is below the top of the SFC-FL065 column', what=f'R 57 top {r57["top"]:.1f}, TMA top {tma["top"]:.1f}')
    c.ok(cta['up'] == 'UNL' and r57['up'] == '1800' and tma['up'] == '6500', f'ceilings: R 57 {r57["up"]}, TMA {tma["up"]}, CTA {cta["up"]}', 'only the UNL ceiling is UNL')
    tops = {k: v['top'] for k, v in by.items()}
    c.ok(cta['top'] == min(tops.values()), f'tops {tops}', 'the UNL column alone reaches the top of the graph')
    c.ok(d8['up'] == '?' and d8['dash'], f'unreadable ceiling column: up={d8["up"]}, dash={d8["dash"]}', 'dotted outline and a "?" mark, not a full UNL column')
    c.eq(c.js("[...document.querySelectorAll('svg.mp-lv text.mp-lv-unk')].map(t => t.textContent)"), ['?'], 'one "?" mark, on the unreadable column', what='"?" marks')
    c.eq(c.js("[...document.querySelectorAll('.mp-lv-list li')].filter(l => /ASFC/.test(l.textContent)).length"), 2, 'the list keeps the SIA notation (800 ASFC|1800 ASFC)', what='list entries with ASFC')
    d26_profile(c)
    d26_many(c)


_D26_PROFILE_JS = """async ([list, level]) => {
  const as = list.map(a => ({ ...a, rings: [[[44.8, 1.5], [44.8, 3.5], [45.2, 3.5], [45.2, 1.5], [44.8, 1.5]]] }));   // a vertex near the route (the cut's box)
  const pts = [{ id: 'A', lat: 45, lon: 0.8 }, { id: 'B', lat: 45, lon: 4.0 }];
  const d = await MapsProfile.build(pts, { levelFt: level, airspaces: as, elevation: null });
  const names = d.crossed.map(c => c.a.name);
  const cv = document.createElement('canvas'); cv.width = 600; cv.height = 400;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 400);
  const g = MapsProfile.draw(ctx, d, { W: 600, H: 400, scale: 1 });
  // rows tinted red on the column in the middle of the route (the R band)
  const x = Math.round(g.padL + (600 - g.padL - g.padR) / 2), rows = [];
  for (let y = 0; y < 400; y++) { const p = ctx.getImageData(x, y, 1, 1).data; if (p[0] - p[1] >= 10 && Math.abs(p[1] - p[2]) <= 6) rows.push(y) }   // the outline and the pale red fill of R (g = b); the terrain is brown (b < g)
  const Y = ft => g.padT + (400 - g.padT - g.padB) * (1 - (Math.min(Math.max(ft, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
  return { names, rows, y800: Y(800), y1800: Y(1800), y0: Y(0), ytop: Y(g.top), top: g.top }
}"""


def d26_profile(c):
    """The vertical profile reads the limits with the same function: R 57 "800 ASFC|1800 ASFC" is drawn between 800 and 1,800 ft above
    the ground (the ground is 0 here: no relief), not over the whole height; the flat ones (SIV, FIR, sector, SFC-UNL) are not in the cut."""
    r57 = [a for a in D26_AS if a['name'].startswith('R 57')]
    r = c.js(_D26_PROFILE_JS, [r57, 1200])
    rows = r['rows']
    c.ok(rows and min(rows) <= r['y1800'] + 2 and max(rows) >= r['y800'] - 2, f'R 57 outline rows {rows[:1]}..{rows[-1:]} for Y(1800)={r["y1800"]:.0f}, Y(800)={r["y800"]:.0f}', 'R 57 is drawn')
    c.ge(min(rows) , r['y1800'] - 3, 'R 57 does not go above its 1,800 ft ceiling', what=f'top row {min(rows)}, Y(1800) {r["y1800"]:.0f}')
    c.le(max(rows), r['y800'] + 3, 'R 57 does not go below its 800 ft floor (not from the ground)', what=f'bottom row {max(rows)}, Y(800) {r["y800"]:.0f}')
    c.ge(r['y800'] - r['y1800'], 4, 'the profile scale shows the 1,000 ft of R 57 as a band', what=f'{r["y800"] - r["y1800"]:.1f} px')
    allc = c.js(_D26_PROFILE_JS, [D26_AS + D26_FLAT, 1200])
    got = set(allc['names'])
    c.ok({'R 57 TEST', 'TMA 6 TEST'} <= got, f'profile spaces {sorted(got)}', 'the readable spaces the route enters (R 57 at 1,200 ft, TMA 6) are in the cut')
    c.ok(not [n for n in got if re.search(r'SIV|FIR|LM TEST|FLAT', n)], f'profile spaces {sorted(got)}', 'no SIV, FIR, sector without limits or SFC-UNL area in the cut')


# thirteen readable spaces on one point (user 25 Oct: "13 espaces" and a graph of 7 columns)
D26_13 = [{'type': 'TMA' if i % 2 else 'CTA', 'name': f'S{i} TEST', 'lower': f'FL{10 + 10 * i:03d}', 'upper': f'FL{50 + 10 * i:03d}', 'rings': [_BIG]} for i in range(13)]


def d26_many(c):
    c.open('maps', flight=True, docs=[['cache/maps/ui.json', {'preset': 'low', 'layers': {}}, 'cache']], airspaces=D26_13 + D26_FLAT)
    c.wait(1500)
    tap_airspaces(c)
    n = c.js("document.querySelectorAll('.mp-lv-list li').length")
    c.eq(n, 13, 'the sheet lists the thirteen readable spaces (the flat ones left out)', what=f'{n} entries')
    g = c.js("""() => { const s = document.querySelector('svg.mp-lv'), w = +s.getAttribute('width');
        return { w, cols: [...s.querySelectorAll('rect')].map(r => { const b = r.getBoundingClientRect(), o = s.getBoundingClientRect(); return [b.left - o.left, b.right - o.left] }) } }""")
    c.eq(len(g['cols']), 13, 'one column per listed space (thirteen)', what=f'{len(g["cols"])} columns')
    c.ok(all(a >= 0 and b <= g['w'] + 0.5 for a, b in g['cols']), f'columns {[round(b) for a, b in g["cols"]]} inside the {g["w"]} px graph', 'no column cut off by the graph\'s edge')


@case('D12', 'Profile canvas: one level, no dots', 'D', tags=('maps',), screens=False,
      rule='L3: the profile drew two levels and green / orange dots at a step (24 Oct)')
def d12(c):
    for steps in (False, True):
        c.open('maps', flight=True, steps=steps)
        c.wait(1200)
        r = c.js("""() => {
          const cv = document.querySelector('.mp-pc'); if (!cv) return null;
          const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
          const rgb = v => { const p = document.createElement('i'); p.style.color = 'var(' + v + ')'; document.body.append(p);
            const m = /(\\d+), (\\d+), (\\d+)/.exec(getComputedStyle(p).color); p.remove(); return m ? [+m[1], +m[2], +m[3]] : null };
          const near = (i, c, t) => d[i + 3] > 150 && Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]) <= t;
          const route = [142, 36, 170], MIN = 40, flag = new Uint8Array(w * h);
          // long horizontal runs of the route colour = a level line (text strokes are short)
          for (let Y = 0; Y < h; Y++) { let X = 0; while (X < w) { if (near((Y * w + X) * 4, route, 90)) { let X2 = X; while (X2 < w && near((Y * w + X2) * 4, route, 90)) X2++;
            if (X2 - X >= MIN) for (let k = X; k < X2; k++) flag[Y * w + k] = 1; X = X2 } else X++ } }
          let one = 0, many = 0;
          for (let X = 0; X < w; X++) { let runs = 0, prev = 0; for (let Y = 0; Y < h; Y++) { const f = flag[Y * w + X]; if (f && !prev) runs++; prev = f } if (runs === 1) one++; else if (runs > 1) many++ }
          const ok = rgb('--sog-ok'), warn = rgb('--sog-warn'); let nok = 0, nwarn = 0;
          for (let i = 0; i < d.length; i += 4) { if (ok && near(i, ok, 40)) nok++; if (warn && near(i, warn, 40)) nwarn++ }
          return { w, h, one, many, nok, nwarn }
        }""")
        if not r:
            raise Fail('no profile canvas (.mp-pc) in the sheet', 'the profile is drawn')
        c.ge(r['one'], 100, 'a level line is drawn (columns with exactly one level)', what=f'steps={steps}: columns with one level line')
        c.eq(r['many'], 0, 'no x column has two level lines in the route colour', what=f'steps={steps}: columns with two or more level lines')
        c.eq(r['nok'], 0, 'no pixel of the "ok" green token on the profile', what=f'steps={steps}: --sog-ok pixels')
        c.eq(r['nwarn'], 0, 'no pixel of the "warn" orange token on the profile', what=f'steps={steps}: --sog-warn pixels')


@case('D13', 'A map drag or a sheet wheel does not close a content', 'D', tags=('sheet', 'maps'), screens=False,
      rule='L14: the sheet closed on wheel / drag, the airspaces card closed by a map drag (23-24 Oct)')
def d13(c):
    c.open('maps', flight=True, aero=True)
    c.wait(1200)
    for content in ('airspaces', 'layers'):
        _d13(c, content)
        if content == 'airspaces':
            c.tap('.f-sheet-close')
            c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='the list closes')


def _d13(c, content):
    if content == 'layers':
        c.tap(layers_btn(c))
        c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='a content opens in the sheet')
    else:
        tap_airspaces(c)
    mp = c.js(MAP_JS, 'maps')
    x, y = mp['x'] + mp['w'] / 2, mp['y'] + mp['h'] / 2
    m = c.page.mouse
    m.move(x, y)
    m.down()
    for i in range(1, 11):
        m.move(x - 8 * i, y + 5 * i)
        c.wait(30)
    m.up()
    c.wait(400)
    c.ok(c.shown('.f-sheet-close'), f'the {content} content closed after a drag on the map', 'the content stays open')
    sh = c.box('.f-sheet-panel')
    m.move(sh['x'] + sh['w'] / 2, sh['y'] + sh['h'] / 2)
    m.wheel(0, 240)
    c.wait(400)
    m.wheel(0, -240)
    c.wait(300)
    c.ok(c.shown('.f-sheet-close'), f'the {content} content closed after a wheel on the sheet', 'the content stays open')
    if content == 'layers':
        c.eq(c.attr(layers_btn(c), 'aria-pressed'), 'true', 'the Layers button stays pressed', what='Layers aria-pressed')


# ------------------------------------------------------------------------------------------------------ D14, D15
# What the map keeps after the zoom thresholds is published on the map element (`data-kept`, JSON: airspaces, byKey = airspaces
# per threshold family, cities...; `data-zoom-eff` = the effective zoom the thresholds are compared with): a counter, not pixels.
KEPT_JS = """() => { const m = document.querySelector('[data-module="maps"] .mp-map');
    return m && m.dataset.kept ? { eff: +m.dataset.zoomEff, kept: JSON.parse(m.dataset.kept) } : null }"""
EUROPE = '-12,40,16,58'                  # a phone's Europe: effective zoom about 2.2 at 390 px


def kept(c, what, still=500, timeout=9000):
    """The published counters once the map has settled (the same reading twice, `still` ms apart): the data comes after the
    first drawing."""
    last, end = None, time.time() + timeout / 1000
    while time.time() < end:
        c.wait(still)
        cur = c.js(KEPT_JS)
        if cur and cur == last:
            return cur
        last = cur
    raise Fail(f'{what}: the counters never settled (last {last})', 'stable data-kept / data-zoom-eff on the map')


@case('D14', 'Complexity slider', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'cupertino'), langs4=True,
      rule='user 24 Oct: the slider first in Layers, "Complexité", acts only as a different zoom, goes low enough (SPEC § 4 quinquies)')
def d14(c):
    c.open('maps?view=' + EUROPE, flight=True, aero=True)
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='the Layers content shows the slider')
    order = c.js("""() => [...document.querySelectorAll('.mp-dbody select, .mp-dbody input, .mp-dbody button')].filter(e => window.__t.shown(e) || e.type === 'range')
        .map(e => e.tagName.toLowerCase() + (e.type ? ':' + e.type : ''))""")
    c.eq(order[:2], ['select:select-one', 'input:range'], 'the Complexity slider comes right after the flight selector, before any checkbox', what='first controls of the Layers content')
    label = norm(c.text('.mp-l-detail') or '')
    c.ok(label.startswith(norm(row(c, 'detail'))), f'slider label {label!r}', f'starts with "{row(c, "detail")}"')
    c.ok(not re.search(r'essai|trial|test|prueba', label, re.I), f'slider label {label!r}', 'no "(trial)" any more: the function is assumed')
    c.eq(norm(c.text('#mp-detail-help') or ''), norm(row(c, 'detailHelp')), 'the help says it acts as if the zoom were different (four languages)', what='slider help')
    lo, hi = c.js("(() => { const r = document.querySelector('input[data-layer=detail]'); return [+r.min, +r.max] })()")
    c.ok(lo <= -3 and hi >= 3, f'slider range {lo}..{hi}', 'at least -3..+3')
    # an empty Layers sheet leaves the map the room to be measured: close, then read the counters at each step
    c.tap('.f-sheet-close')
    base = kept(c, 'step 0')
    c.ge(base['kept']['airspaces'], 3, 'at step 0, on a phone zoomed out on Europe, the three seeded airspaces (built-in IFR thresholds: from 0) are drawn', what='airspaces kept at step 0')

    def at(step):
        c.tap(layers_btn(c))
        c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='slider shown')
        c.js("""(d) => { const r = document.querySelector('input[data-layer=detail]'); r.value = d;
            r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })) }""", step)
        c.tap('.f-sheet-close')
        return kept(c, f'step {step}')
    low = at(-2)
    c.eq(round(low['eff'] - base['eff'], 1), -2.0, 'one step of the slider = one whole zoom level, nothing else changes', tol=0.1, what='effective zoom shift at step -2')
    mn = at(lo)
    c.eq(mn['kept']['airspaces'], 0, f'at the minimum ({lo}), zoomed out on Europe, no airspace passes its thresholds', what='airspaces kept at the minimum')
    c.le(mn['eff'], 0, 'the minimum puts the effective zoom at or below 0 on Europe (every range starts at 0 or more)', what='effective zoom at the minimum')
    mx = at(hi)
    c.ge(mx['kept']['airspaces'], base['kept']['airspaces'], 'the maximum shows at least what step 0 shows', what='airspaces kept at the maximum')
    c.eq(round(mx['eff'] - base['eff'], 1), float(hi), 'the shift is the step count in zoom levels', tol=0.1, what='effective zoom shift at the maximum')
    # kept on the device, as before: the value is back after a reload
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='slider shown')
    c.js("""(d) => { const r = document.querySelector('input[data-layer=detail]'); r.value = d;
        r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })) }""", -2)
    c.wait(800)
    c.page.reload(wait_until='load')
    c.ready('maps', sheet=True)
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='slider shown after reload')
    c.eq(c.js("document.querySelector('input[data-layer=detail]').value"), '-2', 'the slider value is kept on the device', what='slider value after a reload')


# The two thresholds of the airline's file that D15 checks, copied from the file the administrator saved on 23 Oct (VFR: P from
# 5 to 10, D from 7.75 to 10); the built-in VFR values are P 7.5 and D 6.5, the built-in IFR ones P 5.25 and D 4.75 (module.js
# ZOOM_VFR, ZOOM_IFR).  A P and a D zone sit on the seeded route's middle (NEPIX).
TUNED = {'schema': 1, 'by': 'maps', 'updated_at': '2026-10-23T15:18:05.219Z', 'profiles': {'vfr': {'elements': {'zoom': {
    'asP': [5, 10], 'asD': [7.75, 10], 'asFir': [0, 7]}}}}}
TEST_AS = [
    {'type': 'P', 'name': 'P 5 TEST', 'lower': 'SFC', 'upper': 'FL 100', 'rings': [[[44.6, 2.1], [44.6, 2.7], [45.2, 2.7], [45.2, 2.1], [44.6, 2.1]]]},
    {'type': 'D', 'name': 'D 7 TEST', 'lower': 'SFC', 'upper': 'FL 100', 'rings': [[[44.7, 2.2], [44.7, 2.6], [45.1, 2.6], [45.1, 2.2], [44.7, 2.2]]]},
]
# four views of 10, 3, 1.2 and 0.5 degrees of longitude: effective zoom about 3.5, 5.5, 7.1 and 8.1 on a phone
D15_VIEWS = ('-2.6,43.4,7.4,46.4', '0.9,43.9,3.9,45.9', '1.8,44.4,3.0,45.4', '2.15,44.65,2.65,45.15')


def present(rng, eff, margin=0.12):
    """True / False if `eff` is clearly inside / outside rng (None: too close to a bound to say)."""
    lo, hi = rng
    if min(abs(eff - lo), abs(eff - hi)) < margin:
        return None
    return lo <= eff <= hi


def d15_variant(c, preset, tuned, expect, label):
    ui = ['cache/maps/ui.json', {'preset': preset, 'layers': {}}, 'cache']
    if not tuned:
        forget(c.page, ['airline/map_profiles.json'], c.base)       # the previous variant's file is still in this browser's cache
    c.open('maps?view=' + D15_VIEWS[0], flight=True, docs=[ui] + ([['airline/map_profiles.json', TUNED, 'document']] if tuned else []), airspaces=TEST_AS)
    seen = set()
    for v in D15_VIEWS:
        c.go('maps?view=' + v)
        r = kept(c, f'{label} view {v}')
        for key, rng in expect.items():
            want = present(rng, r['eff'])
            if want is None:
                continue
            got = r['kept']['byKey'].get(key, 0) > 0
            seen.add((key, want))
            c.eq(got, want, f'{label}: {key} {"drawn" if want else "not drawn"} at effective zoom {r["eff"]} (thresholds {rng})', what=f'{key} at effective zoom {r["eff"]}')
    for key in expect:
        c.ok((key, True) in seen and (key, False) in seen, f'{label}: {key} seen drawn={ (key, True) in seen}, not drawn={(key, False) in seen}', 'the views cover both sides of the thresholds (the case must not pass empty)')


@case('D15', 'Tuned thresholds applied', 'D', tags=('maps',), screens=False, designs=('standard', 'cupertino'),
      rule='user 24 Oct: "trop laxes" - the airline file\'s thresholds govern what each zoom shows; a mode never tuned follows the tuned one')
def d15(c):
    # the file served, VFR (tuned): the file's two thresholds, P 5..10 and D 7.75..10
    d15_variant(c, 'vfr', True, {'asP': (5, 10), 'asD': (7.75, 10)}, 'VFR with the airline file')
    # no file: the built-in VFR thresholds (P from 7.5, D from 6.5)
    d15_variant(c, 'vfr', False, {'asP': (7.5, 24), 'asD': (6.5, 24)}, 'VFR without the file')
    # IFR low, never tuned in the file (it holds VFR only): it takes VFR's, instead of its looser built-in ones (the cause of
    # the 24 Oct report: Auto kept the built-in IFR thresholds, P from 5.25 and D from 4.75)
    d15_variant(c, 'low', True, {'asP': (5, 10), 'asD': (7.75, 10)}, 'IFR low with a file that holds VFR only')
    d15_variant(c, 'low', False, {'asP': (5.25, 24), 'asD': (4.75, 24)}, 'IFR low without the file')


@case('D16', 'Tuning page reachable from Settings', 'D', tags=('maps', 'settings'), screens=False, designs=('standard', 'cupertino'), langs4=True,
      rule='user 24 Oct: the thresholds page was "formerly in the very advanced settings": a button in the Administration card (Full level)')
def d16(c):
    link = 'frame/settings/admin_links.js'
    # the card is the Full level's: absent at the everyday level
    c.open('settings', docs=[['device/level.json', {'level': 2}, 'cache']])
    c.wait(600)
    c.eq(c.count('[data-card="admin"]'), 0, 'the Administration card is the Full level\'s', what='Administration cards at level 2')
    c.open('settings', docs=[['device/level.json', {'level': 3}, 'cache']])
    c.until("!!document.querySelector('[data-admin=tune] a')", what='the tuning button in the Administration card')
    c.eq(norm(c.text('[data-admin="tune"] a') or ''), norm(tx(link, 'title', c.lang)), 'the button is named "Map threshold tuning" in the language of the run', what='tuning button')
    c.ok('f-btn' in (c.attr('[data-admin="tune"] a', 'class') or ''), 'the tuning link is a link', 'drawn as a button')
    c.tap('[data-admin="tune"] a')
    c.until("location.hash === '#maps?tune=1' && !!document.querySelector('.mp-tune .mp-tune-row')", timeout=9000, what='the tuning page opens')
    c.ge(c.count('.mp-tune-row'), 20, 'one line per element on the tuning page', what='tuning rows')
    c.page.go_back()
    c.until("location.hash === '#settings'", what='the normal way back returns to Settings')


@case('D17', 'Complexity block is one compact line', 'D', tags=('sheet', 'maps'), screens=False, langs4=True,
      rule='user 24 Oct (iPhone shot of Layers): "Réduire l\'espace jaune (slider de couches des cartes)": label, value and slider on one 44 px line, the help out of the page')
def d17(c):
    c.open('maps', flight=True)
    c.tap(layers_btn(c))
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='the Layers content shows the slider')
    c.wait(300)
    g = c.js("""() => { const r = e => { const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, h: b.height, l: b.left, r: b.right } };
        const lab = document.querySelector('.mp-l-detail'), inp = lab.querySelector('input'), val = lab.querySelector('[data-detail-v]'), help = document.getElementById('mp-detail-help'), nxt = document.querySelector('.mp-l-main');
        return { lab: r(lab), inp: r(inp), val: r(val), help: r(help), nxt: r(nxt), described: inp.getAttribute('aria-describedby') } }""")
    c.le(round(g['lab']['h']), 56, 'the whole Complexity block (label, value, slider) is at most 56 px high at 390 px', what=f'{c.design}: block {g["lab"]["h"]:.0f} px')
    c.ge(round(g['inp']['h']), 40, 'the slider keeps a finger-sized height', what='slider height')
    c.le(round(abs(g['val']['t'] + g['val']['b'] - g['inp']['t'] - g['inp']['b']) / 2), 4, 'the value is on the slider\'s line (label · value · slider on one row)', what='value against slider, vertical centres')
    c.ge(round(g['inp']['r'] - g['inp']['l']), 90, 'the slider keeps a usable width beside its label', what='slider width')
    c.le(round(g['help']['h']), 2, 'the help sentence reserves no height (it is the label\'s tooltip and the slider\'s description)', what='help box height')
    c.ok(g['described'] == 'mp-detail-help', f'aria-describedby {g["described"]!r}', 'the slider is still described by the help sentence')
    c.le(round(g['nxt']['t'] - g['lab']['b']), 12, 'the first checkbox follows the block closely (no gap)', what='gap under the block')


_AWY_ORDER_JS = """() => {
  const R = window.MapsRender, W = 560, H = 560, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const raw = cv.getContext('2d'), log = [];
  const ctx = new Proxy(raw, {
    get(o, p) {
      if (p === 'stroke') return a => { log.push(['stroke', o.strokeStyle]); return a ? o.stroke(a) : o.stroke() };
      if (p === 'fillText') return (s, x, y) => { log.push(['text', String(s), o.fillStyle]); return o.fillText(s, x, y) };
      const v = o[p]; return typeof v === 'function' ? v.bind(o) : v;
    },
    set(o, p, v) { o[p] = v; return true }
  });
  const route = [{ id: 'XXAA', lat: 46.9, lon: 0.4 }, { id: 'XXZZ', lat: 44.3, lon: 5.1 }], fit = R.bboxOf(route, 25), { toC, shown } = R.mercator(fit, W, H, 12);
  // two long airways far from the route and from each other (a label is not laid on the route's labels): with strokes and names drawn
  // in turn, the first airway's name was written before the second airway's stroke
  const awy = (route, a, b) => ({ route, lower: 3500, a: { id: 'P' + a, lat: a[0], lon: a[1] }, b: { id: 'Q' + b, lat: b[0], lon: b[1] } });
  const airways = [awy('XA10', [44.2, 0.4], [45.0, 2.4]), awy('XB20', [47.2, 2.5], [46.4, 4.8])];
  R.draw(ctx, { toC, W, H, scale: 1, bbox: shown, profile: R.routeProfile(12000), data: { airspaces: [], aerodromes: [], navaids: [], airways, moraCells: [] }, route, marks: R.marks(route), theme: R.tokens() });
  const strokes = log.map((e, i) => [e, i]).filter(([e]) => e[0] === 'stroke' && /^#(1f6fb2|6a3fa0)$/i.test(String(e[1]))).map(([, i]) => i);
  const names = log.map((e, i) => [e, i]).filter(([e]) => e[0] === 'text' && /^(XA10|XB20)$/.test(e[1])).map(([e, i]) => [e[1], i]);
  return { lastStroke: strokes.length ? Math.max(...strokes) : -1, strokes: strokes.length, firstName: names.length ? Math.min(...names.map(n => n[1])) : -1, names: names.map(n => n[0]) }
}"""


@case('D18', 'Airway names above the strokes', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='user 24 Oct: "Afficher les noms des AWY au-dessus des traits, pas l\'inverse" (maps render.js, drawAirways)')
def d18(c):
    c.page.goto(f'{c.base}/modules/maps/test/render.html', wait_until='load')
    c.until("() => window.MapsRender && document.getElementById('out') && document.getElementById('out').textContent.length > 20", what='the render bench is drawn')
    r = c.js(_AWY_ORDER_JS)
    c.ge(r['strokes'], 2, 'the two test airways are stroked', what='airway strokes')
    c.ge(len(r['names']), 2, 'at least two airway names are written', what=f'airway names {r["names"]}')
    c.ok(r['lastStroke'] < r['firstName'], f'last airway stroke at call {r["lastStroke"]}, first airway name at call {r["firstName"]}',
         'every airway stroke is drawn before any airway name: no stroke crosses a name')


# ------------------------------------------------------------------------------------------------------ D19
_CHROME_JS = """() => { const panel = document.querySelector('.f-sheet-panel').getBoundingClientRect(), box = document.querySelector('.mp-map').getBoundingClientRect();
  const ctrls = [...document.querySelectorAll('[data-module="maps"] .maplibregl-ctrl')].filter(e => window.__t.shown(e)).map(e => { const r = e.getBoundingClientRect();
    return { cls: e.className, l: r.left, r: r.right, t: r.top, b: r.bottom } });
  const sm = document.querySelector('[data-module="maps"] .maplibregl-ctrl-attrib summary');
  return { panel: { l: panel.left, r: panel.right, t: panel.top, b: panel.bottom }, box: { t: box.top, b: box.bottom, h: box.height }, ctrls,
           attribs: document.querySelectorAll('[data-module="maps"] .maplibregl-ctrl-attrib').length, sheet: document.querySelector('[data-module="maps"]').dataset.sheet,
           summary: sm ? { h: sm.getBoundingClientRect().height, before: getComputedStyle(sm, '::before').content, repeat: getComputedStyle(sm).backgroundRepeat } : null } }"""


def chrome_check(c, what, side=False):
    """Rule 17: every visible MapLibre control ends above the sheet (portrait: its bottom is above the sheet's top; landscape column: it does not
    touch the column); one attribution control and one "i" icon (the frame's `summary` rule must not stretch MapLibre's 24 px button: the icon was
    repeated under itself)."""
    g = c.js(_CHROME_JS)
    c.ge(len(g['ctrls']), 1, 'the map shows its controls (the attribution at least)', what=f'{what}: visible MapLibre controls')
    p = g['panel']
    for k in g['ctrls']:
        if side:
            ok = k['r'] <= p['l'] + 1 or k['b'] <= p['t'] + 1
            c.ok(ok, f'{what}: control {k["cls"]!r} at {k["l"]:.0f}-{k["r"]:.0f} x {k["t"]:.0f}-{k["b"]:.0f}, sheet column from x {p["l"]:.0f}', 'a control does not touch the sheet')
        else:
            c.le(round(k['b'] - p['t'], 1), 1, 'the bottom of a MapLibre control is above the top of the sheet', what=f'{what}: control {k["cls"]!r} bottom against sheet top')
    c.eq(g['attribs'], 1, 'one attribution control', what=f'{what}: attribution controls')
    s = g['summary']
    c.ok(s is not None and s['h'] <= 26, f'{what}: attribution button {s}', 'MapLibre\'s "i" button is 24 px high: one icon, not repeated under itself')
    c.ok(s is not None and s['before'] in ('none', 'normal'), f'{what}: attribution button ::before {s and s["before"]!r}', 'no chevron of the frame\'s `summary` on the "i"')


@case('D19', 'Map chrome above the sheet', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'metro', 'cupertino'),
      rule='V3 spec 7.1 rule 17 (user 25 Oct: "le double i, invisible. Masque par le volet"); map_base.setBottomInset')
def d19(c):
    c.open('maps', flight=True, forecast=True)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    try:
        c.page.wait_for_function("!!document.querySelector('[data-module=\"maps\"] .maplibregl-ctrl-attrib')", timeout=10000)
    except Exception:
        raise Skip('MapLibre did not start with the empty style: no control to measure') from None
    c.wait(500)
    chrome_check(c, 'default position')
    # the map keeps the module's size under the sheet (the sheet covers the foot of the map): the controls follow the sheet, whatever its position
    c.page.add_style_tag(content='[data-module="maps"] .mp-box{margin-bottom:-110px}')
    c.settle()
    c.wait(500)
    g = c.js(_CHROME_JS)
    c.ge(round(g['box']['b'] - g['panel']['t']), 100, 'the map reaches under the sheet in this check', what='map foot under the sheet (px)')
    chrome_check(c, 'default position, map under the sheet')
    c.drag('.f-sheet-grip', -420)
    c.wait(600)
    c.eq(c.js(_CHROME_JS)['sheet'], 'expanded', 'the sheet is expanded', what='sheet position')
    chrome_check(c, 'expanded, map under the sheet')
    c.tap('.f-sheet-grip')
    c.until("document.querySelector('[data-module=\"maps\"]').dataset.sheet === 'default'", what='a tap on the handle brings the sheet back to the default position')
    c.tap('.f-sheet-grip')
    c.until("document.querySelector('[data-module=\"maps\"]').dataset.sheet === 'collapsed'", what='a second tap collapses the sheet')
    c.wait(600)
    chrome_check(c, 'collapsed, map under the sheet')
    c.tap('.f-sheet-grip')
    c.until("document.querySelector('[data-module=\"maps\"]').dataset.sheet === 'default'", what='back to the default position')
    c.page.set_viewport_size({'width': 844, 'height': 390})
    c.settle()
    c.wait(600)
    chrome_check(c, 'landscape column', side=True)


_DRAG_JS = """() => {
  const r = document.querySelector('[data-module="maps"]'), ev = window.__dragEv = [];
  window.__dragOn = false;
  const watch = (el, name) => { if (!el) return;
    for (const k of ['width', 'height']) { const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, k);
      Object.defineProperty(el, k, { get() { return d.get.call(this) }, set(v) { ev.push({ on: window.__dragOn, k: name + ' ' + k }); d.set.call(this, v) }, configurable: true }) } };
  watch(r.querySelector('.maplibregl-canvas'), 'map canvas');
  watch(r.querySelector('canvas.mp-over'), 'overlay canvas');
  watch(r.querySelector('canvas.mp-pc'), 'profile canvas');
  if (window.maplibregl && !window.maplibregl.__dragWrapped) { const o = maplibregl.Map.prototype.resize;
    maplibregl.Map.prototype.resize = function () { ev.push({ on: window.__dragOn, k: 'map.resize' }); return o.apply(this, arguments) };
    window.maplibregl.__dragWrapped = true }
  new MutationObserver(() => ev.push({ on: window.__dragOn, k: 'sheet body rewritten' })).observe(r.querySelector('.mp-dbody'), { childList: true });
}"""
_SAMPLE_JS = """() => { const r = document.querySelector('[data-module="maps"]'), q = s => r.querySelector(s), rc = e => { const b = e.getBoundingClientRect();
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height } };
  const m = q('.maplibregl-canvas'), o = q('canvas.mp-over');
  return { panel: rc(q('.f-sheet-panel')), box: rc(q('.mp-box')), map: m ? rc(m) : null, ocw: o.width, och: o.height, sheet: r.dataset.sheet,
           base: getComputedStyle(q('.mp-box')).backgroundColor } }"""


def still_drag(c, side):
    """One slow drag of the grip, the finger always down: to the lower end, then up to the upper end, then back; a sample after every move."""
    g = c.box(f'{MAPS} .f-sheet-grip')
    x, y = g['x'] + g['w'] / 2, g['y'] + g['h'] / 2
    path = [0, 5, 10, 15, 20, 25, 30, 35, 30, 20, 10, 0, -10, -20, -30, -35, -30, -20, -10, 0]       # steps of 14 px from the start
    m = c.page.mouse
    m.move(x, y)
    m.down()
    c.js('() => { window.__dragOn = true; window.__dragEv.length = 0 }')
    samples = []
    for i, s in enumerate(path):
        # portrait: the finger goes down (+y) to lower the sheet; landscape: it goes right (+x) to narrow the column
        pos = (x + s * 14, y) if side else (x, y + s * 14)
        m.move(*pos)
        c.wait(60 if i % 4 else 230)                              # now and then longer than onSettle (120 ms): still nothing
        smp = c.js(_SAMPLE_JS)
        smp['f'] = pos[0] if side else pos[1]
        # the frame of the map grows while the sheet goes down, the map keeps its size (nothing is redrawn): the strip it shows beyond the
        # map's own edge must be the map's background colour, never the page's grey
        gap = (smp['box']['r'] - smp['map']['r']) if side else (smp['box']['b'] - smp['map']['b']) if smp['map'] else 0
        if smp['map'] and gap >= 14:
            if side:
                pts = [(smp['map']['r'] - 8, smp['box']['t'] + 4), (smp['box']['r'] - 6, smp['box']['t'] + 4)]
            else:
                pts = [(3, smp['map']['b'] - 10), (3, smp['box']['b'] - 6)]
            smp['inside'], smp['strip'] = c.pixels(pts)
        samples.append(smp)
    during = c.js('() => window.__dragEv.filter(e => e.on).map(e => e.k)')
    m.up()
    c.js('() => { window.__dragOn = false }')
    return samples, during


@case('D20', 'Still during a sheet drag', 'D', tags=('sheet', 'maps'), screens=False,
      rule='user 24-25 Oct "Déplacer le volet par la poignée fait clignoter et apparaître une zone grise" (V3 spec 7.1 rule 19): the map is not redrawn or resized while the finger drags the sheet, and no grey strip shows')
def d20(c):
    c.open('maps', flight=True, forecast=True)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    c.wait(1200)
    c.settle()
    strips = 0
    for side in (False, True):
        what = 'landscape column' if side else 'portrait'
        if side:
            c.page.set_viewport_size({'width': 844, 'height': 390})
            c.until("document.documentElement.classList.contains('f-land')", what='the frame switches to the landscape column')
            c.wait(600)
            c.settle()
        c.js(_DRAG_JS)
        samples, during = still_drag(c, side)
        # nothing is redrawn, resized or rewritten while the finger is down (map, overlay, profile, sheet body)
        tally = {k: during.count(k) for k in dict.fromkeys(during)}
        c.eq(tally, {}, f'{what}: nothing is redrawn while the finger drags the sheet (map, overlay, profile)', what=f'{what}: events during the drag (count by kind)')
        s0 = samples[0]
        for k, s in enumerate(samples):
            # the map's frame stays against the sheet (no hole between them), the map's own canvas keeps its size (it is not resized)
            gap = (s['panel']['l'] - s['box']['r']) if side else (s['panel']['t'] - s['box']['b'])
            c.ok(abs(gap) <= 1.5, f'{what}: sample {k}: {gap:.1f} px between the map frame and the sheet', 'the map frame stays against the sheet')
            if s['map']:
                c.ok(abs(s['map']['w'] - s0['map']['w']) <= .5 and abs(s['map']['h'] - s0['map']['h']) <= .5,
                     f'{what}: sample {k}: MapLibre canvas {s["map"]["w"]:.0f}x{s["map"]["h"]:.0f} (was {s0["map"]["w"]:.0f}x{s0["map"]["h"]:.0f})', 'the MapLibre canvas is not resized')
            c.ok(s['ocw'] == s0['ocw'] and s['och'] == s0['och'], f'{what}: sample {k}: overlay bitmap {s["ocw"]}x{s["och"]} (was {s0["ocw"]}x{s0["och"]})', 'the overlay bitmap keeps its size')
            if 'strip' in s:
                strips += 1
                d = max(abs(a - b) for a, b in zip(s['inside'], s['strip']))
                c.ok(d <= 6, f'{what}: sample {k}: the strip beyond the map is rgb{s["strip"]}, the map rgb{s["inside"]} (frame background {s["base"]})',
                     'the strip the frame shows beyond the map has the map\'s background colour, not the page\'s grey')
        # the sheet follows the finger: its size changes with the finger's travel, never against it
        key = 'w' if side else 'h'
        for a, b in zip(samples, samples[1:]):
            df, dp = b['f'] - a['f'], b['panel'][key] - a['panel'][key]
            up, down = df < 0, df > 0                              # finger up (portrait) or left (column): a bigger sheet
            c.ok(not (up and dp < -1.5) and not (down and dp > 1.5), f'{what}: finger moved {df:+.0f} px, sheet {a["panel"][key]:.0f} -> {b["panel"][key]:.0f} px',
                 'the sheet size is monotone with the finger')
        lo, hi = min(s['panel'][key] for s in samples), max(s['panel'][key] for s in samples)
        c.ok(hi - lo > 60, f'{what}: the sheet only moved from {lo:.0f} to {hi:.0f} px', 'the drag moves the sheet by more than 60 px')
        c.settle()
        c.wait(400)
        # released: one resize of the map, one size of the overlay bitmap (the size settled), no more
        after = c.js('() => window.__dragEv.filter(e => !e.on).map(e => e.k)')
        c.le(after.count('map.resize'), 1, 'at most one map.resize after the release', what=f'{what}: map.resize calls after the release ({after})')
        c.le(after.count('overlay canvas width'), 1, 'the overlay bitmap is sized once after the release', what=f'{what}: overlay canvas resets after the release')
        end = c.js(_SAMPLE_JS)
        c.ok(end['map'] is None or (abs(end['map']['w'] - end['box']['w']) <= 2 and abs(end['map']['h'] - end['box']['h'] + 2) <= 3),
             f'{what}: settled: MapLibre canvas {end["map"] and round(end["map"]["w"])}x{end["map"] and round(end["map"]["h"])} in a frame of {end["box"]["w"]:.0f}x{end["box"]["h"]:.0f}',
             'after the settle the MapLibre canvas fills its frame')
    c.ok(strips > 0, 'no sample showed the strip beyond the map', 'the drag lowers the sheet far enough for the frame to outgrow the map (the colour check ran)')


# ---------------------------------------------------------------------------------------------------------- D21-D24: the profile window
# V3 spec 7.1 rule 20 (user 25 Oct, 14:30: "Trouver le moyen de zoomer (pour être précis) le profil vertical"): a window on the distance axis.
# The planned flight of lib.FLIGHT climbs to FL270 over 62 NM (no terrain offline: the climb starts at 0 ft), so the vertical scale of a window
# near the departure is lower than the whole flight's; the canvas says what it drew (data-window NM, data-scale ft, data-plot px, data-ticks NM).
def hide_notes(c):
    c.page.add_style_tag(content='#fNotes{display:none!important}')      # the "data access not set" toast covers the foot of the sheet


def win_state(c):
    """What the profile canvas says it drew: the window (NM), the vertical scale (ft), the plot frame (px of the canvas), the distance marks (NM)."""
    return c.js("""() => { const d = document.querySelector('.mp-pc').dataset, n = k => (d[k] || '').split(',').filter(Boolean).map(Number);
        const w = n('window'), s = n('scale'), p = n('plot');
        return { from: w[0], to: w[1], bottom: s[0], top: s[1], x0: p[0], x1: p[1], ticks: n('ticks') } }""")


def plan_alt(nm):
    """Planned altitude (ft) of the seeded flight at nm from the departure: a straight climb to FL270 over 62 NM (Carburant's tocNm), from 0 ft."""
    return 27000 * min(nm, 62) / 62


def px_of(c, st, nm):
    """Page x of a distance of the window; the page y of the profile's middle."""
    cb = c.box('.mp-pc')
    return cb['x'] + st['x0'] + (nm - st['from']) / (st['to'] - st['from']) * (st['x1'] - st['x0'])


def prof_y(c):
    cb = c.box('.mp-pc')
    return cb['y'] + cb['h'] / 2


def touch(c, kind, pts):
    """One CDP touch event with the given points ([(x, y), ...]; none for the end): real pointer events, two fingers at once."""
    s = getattr(c, '_cdp', None)
    if s is None:
        s = c._cdp = c.context.new_cdp_session(c.page)
    s.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i + 1} for i, (x, y) in enumerate(pts)]})


def pinch(c, cx, cy, d0, d1, steps=8):
    """Two fingers on the profile, centred on (cx, cy), their distance going from d0 to d1 px (the centre stays), then both lifted."""
    pair = lambda d: [(cx - d / 2, cy), (cx + d / 2, cy)]
    touch(c, 'touchStart', pair(d0))
    for k in range(1, steps + 1):
        touch(c, 'touchMove', pair(d0 + (d1 - d0) * k / steps))
        c.wait(30)
    touch(c, 'touchEnd', [])
    c.wait(250)


def zoom_start(c, nm=12, factor=8):
    """Opens the map on the seeded flight and pinches the profile around `nm`; returns (whole state, zoomed state)."""
    c.open('maps', flight=True, forecast=True)
    hide_notes(c)
    c.wait(1500)
    c.settle()
    whole = win_state(c)
    pinch(c, px_of(c, whole, nm), prof_y(c), 24, 24 * factor)
    return whole, win_state(c)


@case('D21', 'Profile window: pinch, scale, cursor, whole flight', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'cupertino'), langs4=True,
      rule='V3 spec 7.1 rule 20 (user 25 Oct 14:30: "Trouver le moyen de zoomer (pour être précis) le profil vertical"): a pinch zooms the profile around its centre, one finger stays the cursor')
def d21(c):
    c.open('maps', flight=True, forecast=True)
    hide_notes(c)
    c.wait(1500)
    c.settle()
    whole = win_state(c)
    c.ok(whole['from'] == 0 and whole['to'] > 360, f'window {whole["from"]}..{whole["to"]} NM', 'the whole flight (0 to its 366 NM) before any gesture')
    c.ok(not c.shown('.mp-whole'), 'the "whole flight" button is displayed on a whole flight', 'nothing in the legend row when the window is whole')
    # a pinch around 12 NM, fingers 24 px then 192 px apart: eight times closer
    cx, cy = px_of(c, whole, 12), prof_y(c)
    pinch(c, cx, cy, 24, 192)
    st = win_state(c)
    span = st['to'] - st['from']
    c.ok(span < whole['to'] / 5 and span >= 5, f'window {st["from"]}..{st["to"]} NM ({span:.1f} NM)', 'the window tightened to a fraction of the flight (at least 5 NM) by the pinch')
    under = st['from'] + (cx - c.box('.mp-pc')['x'] - st['x0']) / (st['x1'] - st['x0']) * span
    c.eq(round(under, 1), 12, 'the distance under the fingers\' centre stays under it (zoom around the centre)', tol=1.5, what='NM under the pinch centre after the zoom')
    c.ok(st['from'] >= 0 and st['to'] <= whole['to'] + .1, f'window {st["from"]}..{st["to"]} NM', 'never outside the flight')
    # the vertical scale fits what is visible: the top follows the climb at the window's end, not the whole flight's FL270
    c.ge(st['top'], plan_alt(st['to']), 'the vertical scale reaches the highest altitude of the window', what=f'top {st["top"]} ft, planned {plan_alt(st["to"]):.0f} ft at {st["to"]} NM')
    c.le(st['top'], whole['top'] - 1000, 'the vertical scale is lower than the whole flight\'s (it refits to what is visible)', what=f'top {st["top"]} ft (whole flight {whole["top"]} ft)')
    c.le(st['top'], plan_alt(st['to']) + 1500 + 1000 + 300, 'with the usual margin (1500 ft, rounded up to 1000) and no more', what=f'top {st["top"]} ft')
    # graduations of the axis fall inside the window, regularly spaced, and more than the whole flight's two or three
    tk = st['ticks']
    c.ge(len(tk), 3, 'distance marks in the window', what=f'marks {tk}')
    c.ok(all(st['from'] - .01 <= t <= st['to'] + .01 for t in tk), f'marks {tk} in {st["from"]}..{st["to"]}', 'every distance mark is inside the window')
    c.ok(len({round(b - a, 3) for a, b in zip(tk, tk[1:])}) == 1, f'marks {tk}', 'a round, regular step')
    # one finger is still the cursor: a tap in the middle of the window reads the distance there
    mid = (st['from'] + st['to']) / 2
    c.page.touchscreen.tap(px_of(c, st, mid), prof_y(c))
    c.wait(250)
    cur = float(c.attr('.mp-map', 'data-cursor-nm') or 'nan')
    c.eq(round(cur, 1), round(mid, 1), 'one finger places the cursor at the distance under it, in the window', tol=.6, what='common cursor (NM)')
    read = re.findall(r'\d+(?:[.,]\d+)?', c.js("document.querySelector('.mp-strip').textContent") or '')
    c.ok(read and abs(float(read[0].replace(',', '.')) - cur) <= .6, f'strip {read[:2]}, cursor {cur}', 'the line under the profile reads the same distance (MapsProfile.at of the cursor)')
    # the legend row offers the way back: a text button, visible, finger-sized
    b = c.box('.mp-whole')
    c.ok(b and b['shown'], 'the "whole flight" button is not displayed while zoomed', 'a button in the head line while the window is tight')
    c.eq(b['text'].strip(), row(c, 'winWhole'), 'its label is in the language of the run', what='button label')
    c.eq(c.attr('.mp-whole', 'title'), row(c, 'winWholeHelp'), 'its help is in the language of the run', what='button title')
    hit = c.js("""() => { const b = document.querySelector('.mp-whole'), r = b.getBoundingClientRect(), x = r.left + r.width / 2; let lo = null, hi = null;
        for (let y = Math.max(0, r.top - 30); y < r.bottom + 40; y++) { const e = document.elementFromPoint(x, y); if (e && e.closest('.mp-whole') === b) { if (lo === null) lo = y; hi = y } }
        return hi === null ? 0 : hi - lo + 1 }""")
    c.ge(hit, 34, 'the touch zone is the primitive\'s 44 px centred on the 28 px button, its top clipped by the sheet\'s edge (36 px)', what='touch zone height')
    c.ge(b['w'], 44, 'finger-sized wide too', what='button width')
    c.tap('.mp-whole')
    c.wait(250)
    after = win_state(c)
    c.eq([after['from'], after['to']], [0, whole['to']], 'a tap on it brings the whole flight back', what='window after the tap')
    c.eq(after['top'], whole['top'], 'and the vertical scale of the whole flight', what='top after the tap')
    c.ok(not c.shown('.mp-whole'), 'the button is still displayed on the whole flight', 'it is hidden again')
    # a double tap does the same
    pinch(c, px_of(c, whole, 40), prof_y(c), 24, 120)
    c.ok(win_state(c)['to'] < whole['to'] / 2, 'the second pinch did not tighten the window', 'zoomed again')
    x, y = px_of(c, win_state(c), 40), prof_y(c)
    c.page.touchscreen.tap(x, y)
    c.page.touchscreen.tap(x, y)
    c.wait(250)
    c.eq([win_state(c)['from'], win_state(c)['to']], [0, whole['to']], 'a double tap on the profile comes back to the whole flight', what='window after the double tap')


@case('D22', 'Profile window: a sheet drag does not touch it', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'cupertino'),
      rule='V3 spec 7.1 rules 19 and 20: the window is kept and the profile is not redrawn under the finger while the sheet is dragged')
def d22(c):
    whole, st = zoom_start(c)
    c.ok(st['to'] - st['from'] < whole['to'] / 5, f'window {st["from"]}..{st["to"]}', 'the profile is zoomed before the drag')
    c.js(_DRAG_JS)
    c.js("""() => { window.__pfill = 0; const o = CanvasRenderingContext2D.prototype.fillRect;
        CanvasRenderingContext2D.prototype.fillRect = function () { if (window.__dragOn && this.canvas && this.canvas.classList.contains('mp-pc')) window.__pfill++; return o.apply(this, arguments) } }""")
    samples, during = still_drag(c, False)
    c.eq({k: during.count(k) for k in dict.fromkeys(during)}, {}, 'nothing is redrawn or resized while the finger drags the sheet', what='events during the drag')
    c.eq(c.js('window.__pfill'), 0, 'the zoomed profile is not painted under the finger', what='profile paints during the drag')
    c.ok(any(abs(s['panel']['h'] - samples[0]['panel']['h']) > 40 for s in samples), 'the sheet did not move', 'the drag moved the sheet')
    c.settle()
    c.wait(500)
    end = win_state(c)
    c.eq([end['from'], end['to']], [st['from'], st['to']], 'the window is the same after the drag (the profile was redrawn at its new size, same window)', what='window after the drag')


@case('D23', 'Profile window: kept for the page, reset with the route', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 spec 7.1 rule 20: the window lives as long as the page and is never stored; a different route starts whole again')
def d23(c):
    whole, st = zoom_start(c)
    c.ok(st['to'] - st['from'] < whole['to'] / 5, f'window {st["from"]}..{st["to"]}', 'zoomed')
    c.go('fuel')
    c.wait(400)
    c.go('maps')
    c.wait(1500)
    c.settle()
    back = win_state(c)
    c.eq([back['from'], back['to']], [st['from'], st['to']], 'leaving the Map and coming back keeps the window (same route, same page)', what='window after the round trip')
    c.eq(c.js("[...Object.keys(localStorage), ...[]].filter(k => /window|axis|zoom/i.test(k))"), [], 'nothing about the window is stored on the device', what='localStorage keys')
    # another route written to the current flight (Fuel next door): the profile starts whole again
    path = 'pilot/ABC/current_flight.json'
    f = c.doc(path)
    f['route']['points'] = [f['route']['points'][0], {'id': 'LFBO', 'lat': 43.629, 'lon': 1.364}]
    f['route']['text'] = 'LFRS LFBO'
    f['route']['arr'] = 'LFBO'
    f['updated_at'] = '2099-01-01T00:00:00Z'
    c.js("""(a) => window.FrameData.adapter({ id: 't-d23', reads: ['pilot/'], writes: ['pilot/'] }).put(a[0], a[1])""", [path, f])
    c.until("() => { const w = (document.querySelector('.mp-pc').dataset.window || '').split(',').map(Number); return w[0] === 0 && w[1] > 200 && w[1] < 300 }",
            timeout=8000, what='the profile of the new, shorter route is drawn')
    new = win_state(c)
    c.eq(new['from'], 0, 'the new route\'s window starts at its departure', what='window start')
    c.ok(not c.shown('.mp-whole'), 'the "whole flight" button is displayed on the new route', 'the window was reset with the route')


@case('D24', 'Profile window on a screen: Ctrl + wheel, drag, double click', 'D', tags=('maps',), phone=False, screens=True,
      rule='V3 spec 7.1 rule 20: on a screen the wheel with Ctrl zooms around the pointer, a drag pans, a double click comes back to the whole flight')
def d24(c):
    c.open('maps', flight=True, forecast=True)
    hide_notes(c)
    c.wait(1500)
    c.settle()
    whole = win_state(c)
    c.ok(c.shown('.mp-pc'), 'no profile canvas at 1280', 'the profile is shown')
    x, y = px_of(c, whole, 100), prof_y(c)
    c.page.mouse.move(x, y)
    c.page.mouse.wheel(0, -300)                                       # no Ctrl: the page's wheel, nothing zooms
    c.wait(250)
    c.eq(win_state(c)['to'], whole['to'], 'the wheel alone leaves the window whole', what='window after a plain wheel')
    c.page.keyboard.down('Control')
    for _ in range(3):
        c.page.mouse.wheel(0, -200)
        c.wait(80)
    c.page.keyboard.up('Control')
    c.wait(250)
    st = win_state(c)
    span = st['to'] - st['from']
    c.ok(span < whole['to'] * .6, f'window {st["from"]}..{st["to"]}', 'Ctrl + wheel tightens the window')
    under = st['from'] + (x - c.box('.mp-pc')['x'] - st['x0']) / (st['x1'] - st['x0']) * span
    c.eq(round(under, 1), 100, 'the distance under the pointer stays under it', tol=2, what='NM under the pointer')
    c.ok(c.shown('.mp-whole'), 'no "whole flight" button once zoomed', 'the button is shown')
    # a drag pans (the pointer moves right: the window moves toward the departure)
    m = c.page.mouse
    m.move(x, y)
    m.down()
    for k in range(1, 9):
        m.move(x + 12 * k, y)
        c.wait(20)
    m.up()
    c.wait(250)
    pan = win_state(c)
    c.eq(round(pan['to'] - pan['from'], 1), round(span, 1), 'a drag keeps the window\'s width', tol=.3, what='window width after the drag')
    c.ok(pan['from'] < st['from'] - 5, f'window {pan["from"]}..{pan["to"]} (was {st["from"]}..{st["to"]})', 'a drag to the right moves the window toward the departure')
    # Ctrl + wheel the other way, and the double click
    m.dblclick(x, y)
    c.wait(250)
    c.eq([win_state(c)['from'], win_state(c)['to']], [0, whole['to']], 'a double click on the profile comes back to the whole flight', what='window after the double click')
    c.ok(not c.shown('.mp-whole'), 'the button is displayed on the whole flight', 'hidden again')


# ---------------------------------------------------------------------------------------------------------- D25: one window for the profile and the cut
# V3 spec 7.1 rule 20 (same gesture on the profile and on the weather cut): the Map keeps ONE window per route; the cut is drawn by atmosphere's
# drawSection(..., { window }) and says what it drew on the sheet's body (data-window NM, data-top ft, data-strips).
def cut_state(c):
    """What the cut says it drew (.mp-dbody): the window (NM), the height scale's top (ft), the surface strips, the distance marks (NM, the svg's
    integer labels under the plot), and whether the "Whole flight" button is shown."""
    return c.js("""() => { const b = document.querySelector('.mp-dbody'), svg = b.querySelector('svg'), t = svg ? [...svg.querySelectorAll('text')] : [],
        w = (b.dataset.window || '').split(',').filter(Boolean).map(Number);
      return { kind: b.dataset.kind, from: w.length ? w[0] : null, to: w.length ? w[1] : null, top: +b.dataset.top, strips: b.dataset.strips,
        ticks: t.filter(x => /^\\d+$/.test(x.textContent) && x.getAttribute('dominant-baseline') === 'hanging').map(x => +x.textContent),
        whole: window.__t.shown(document.querySelector('.mp-whole')) } }""")


def cut_xy(c, frac=.4):
    """A point of the cut (page px) on its plot: `frac` of the svg's width, the middle of the part of the svg a bar or a hint does not cover."""
    return c.js("""(f) => { const s = document.querySelector('.mp-dbody svg'), r = s.getBoundingClientRect(); return [r.left + r.width * f, r.top + r.height * .4] }""", frac)


def open_cut(c):
    c.open('maps', flight=True, forecast=True)
    hide_notes(c)
    c.wait(1200)
    c.settle()
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", timeout=10000, what='the cut is drawn')
    c.settle()
    c.wait(300)


def legend_keys(c):
    """The keys of the legend rows the cut shows (the "i" chip opened, then closed)."""
    c.tap('.mp-chip[data-legend]')
    c.wait(200)
    keys = c.js("() => [...document.querySelectorAll('.mp-legend [data-key]')].map(e => e.dataset.key)")
    c.tap('.mp-chip[data-legend]')
    c.wait(200)
    return keys


@case('D25', 'One window for the profile and the cut', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'cupertino'), langs4=True,
      rule='V3 spec 7.1 rule 20 (user 25 Oct: "zoomer (pour être précis) le profil vertical"): the same gesture on the weather cut, ONE window per route shared by both drawings')
def d25(c):
    open_cut(c)
    whole = cut_state(c)
    c.eq(whole['kind'], 'weather', 'the cut is in the sheet', what='sheet content')
    c.ok(whole['to'] is not None and whole['from'] == 0 and whole['to'] > 360 and not whole['whole'], f'cut {whole}', 'the cut is whole (0 to its 366 NM) and has no "Whole flight" button before any gesture')
    keys0 = legend_keys(c)
    c.eq('strips' in keys0, whole['strips'] == '1', 'the legend lists the surface strips exactly when the cut drew them (geo.strips)', what=f'legend {keys0}, strips drawn {whole["strips"]}')
    # a pinch on the cut around 12 NM of the plot: eight times closer
    x, y = cut_xy(c)
    pinch(c, x, y, 24, 192)
    st = cut_state(c)
    span = st['to'] - st['from']
    c.ok(5 <= span < whole['to'] / 5, f'cut window {st["from"]}..{st["to"]} ({span:.1f} NM)', 'a pinch tightens the cut to a fraction of the flight (5 NM at least)')
    c.ok(st['from'] >= 0 and st['to'] <= whole['to'] + .1, f'{st["from"]}..{st["to"]}', 'inside the flight')
    c.ge(len(st['ticks']), 2, 'distance marks in the cut window', what=f'marks {st["ticks"]}')
    c.ok(all(st['from'] - .01 <= t <= st['to'] + .01 for t in st['ticks']), f'marks {st["ticks"]} in {st["from"]}..{st["to"]}', 'every distance mark of the cut is inside the window')
    c.le(st['top'], whole['top'] - 1000, 'the cut\'s height scale refits to what is visible (lower than the whole cut\'s)', what=f'top {st["top"]} ft (whole {whole["top"]} ft)')
    c.ok(st['whole'], 'the "Whole flight" button is not displayed on the zoomed cut', 'the button is shown in the head line')
    c.eq(c.text('.mp-whole').strip(), row(c, 'winWhole'), 'its label is in the language of the run', what='button label')
    c.eq(c.attr('.mp-whole', 'title'), row(c, 'winWholeHelp'), 'its help is in the language of the run', what='button title')
    hit = c.js("""() => { const b = document.querySelector('.mp-whole'), r = b.getBoundingClientRect(), x = r.left + r.width / 2; let lo = null, hi = null;
        for (let y = Math.max(0, r.top - 30); y < r.bottom + 40; y++) { const e = document.elementFromPoint(x, y); if (e && e.closest('.mp-whole') === b) { if (lo === null) lo = y; hi = y } }
        return hi === null ? 0 : hi - lo + 1 }""")
    c.ge(hit, 34, 'the touch zone is the primitive\'s 44 px centred on the 28 px button, its top clipped by the sheet\'s edge', what='touch zone height')
    c.ge(c.box('.mp-whole')['w'], 44, 'finger-sized wide too', what='button width')
    keys1 = legend_keys(c)
    c.eq('strips' in keys1, st['strips'] == '1', 'the legend still says what the zoomed cut drew', what=f'legend {keys1}, strips drawn {st["strips"]}')
    # to the profile: the same window; back to the weather: still there
    c.tap('.mp-chip[data-view="profile"]')
    c.until("() => !!document.querySelector('.mp-pc') && document.querySelector('.mp-dbody').hidden", what='the profile is back')
    c.wait(300)
    p = win_state(c)
    c.eq([round(p['from'], 1), round(p['to'], 1)], [round(st['from'], 1), round(st['to'], 1)], 'the profile shows the same window as the cut', tol=.15, what='profile window after the switch')
    c.ok(c.shown('.mp-whole'), 'the "Whole flight" button is not displayed on the profile', 'the button stays while the window is tight')
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", what='the cut is back')
    c.wait(300)
    back = cut_state(c)
    c.eq([round(back['from'], 1), round(back['to'], 1)], [round(st['from'], 1), round(st['to'], 1)], 'back on the cut: still the same window', tol=.15, what='cut window after the round trip')
    # a pinch on the profile is seen on the cut too (one window, not two)
    c.tap('.mp-chip[data-view="profile"]')
    c.until("() => !!document.querySelector('.mp-pc') && document.querySelector('.mp-dbody').hidden", what='the profile again')
    c.wait(300)
    p0 = win_state(c)
    pinch(c, px_of(c, p0, (p0['from'] + p0['to']) / 2), prof_y(c), 24, 120)
    p1 = win_state(c)
    c.ok(p1['to'] - p1['from'] < (p0['to'] - p0['from']) * .8, f'profile {p0["from"]}..{p0["to"]} -> {p1["from"]}..{p1["to"]}', 'the profile tightens further')
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", what='the cut is back')
    c.wait(300)
    q = cut_state(c)
    c.eq([round(q['from'], 1), round(q['to'], 1)], [round(p1['from'], 1), round(p1['to'], 1)], 'the cut follows what was done on the profile', tol=.15, what='cut window')
    # the button gives everything back
    c.tap('.mp-whole')
    c.wait(300)
    w = cut_state(c)
    c.eq([w['from'], w['top']], [0, whole['top']], 'a tap on "Whole flight" gives the whole cut and its scale back', what='window start and top after the tap')
    c.ok(abs(w['to'] - whole['to']) < .1 and not w['whole'], f'{w}', 'and hides itself')
    c.tap('.mp-chip[data-view="profile"]')
    c.until("() => !!document.querySelector('.mp-pc') && document.querySelector('.mp-dbody').hidden", what='the profile')
    c.wait(300)
    c.ok(abs(win_state(c)['to'] - whole['to']) < .2 and win_state(c)['from'] == 0, f'{win_state(c)}', 'the profile is whole too')
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", what='the cut')
    c.wait(300)
    # a double tap on the zoomed cut: whole again, and nothing else opens (no slice: the sheet still shows the cut)
    x, y = cut_xy(c)
    pinch(c, x, y, 24, 160)
    c.ok(cut_state(c)['to'] < whole['to'] / 2, 'the second pinch did not tighten the cut', 'zoomed again')
    c.page.touchscreen.tap(x, y)
    c.page.touchscreen.tap(x, y)
    c.wait(500)
    d = cut_state(c)
    c.ok(d['from'] == 0 and abs(d['to'] - whole['to']) < .1, f'{d}', 'a double tap on the cut brings the whole flight back')
    c.eq(d['kind'], 'weather', 'and opens nothing: the sheet still shows the cut', what='sheet content after the double tap')


@case('D25b', 'One window: a sheet drag keeps it on the cut', 'D', tags=('sheet', 'maps'), screens=False, designs=('standard', 'cupertino'),
      rule='V3 spec 7.1 rules 19 and 20: the zoomed cut is not redrawn under the finger while the sheet is dragged, and keeps its window')
def d25b(c):
    open_cut(c)
    x, y = cut_xy(c)
    pinch(c, x, y, 24, 192)
    st = cut_state(c)
    c.ok(st['to'] - st['from'] < 80, f'{st}', 'the cut is zoomed before the drag')
    c.js(_DRAG_JS)
    samples, during = still_drag(c, False)
    c.eq({k: during.count(k) for k in dict.fromkeys(during)}, {}, 'nothing is redrawn or rewritten while the finger drags the sheet (cut included)', what='events during the drag')
    c.ok(any(abs(s['panel']['h'] - samples[0]['panel']['h']) > 40 for s in samples), 'the sheet did not move', 'the drag moved the sheet')
    c.settle()
    c.wait(500)
    end = cut_state(c)
    c.eq([round(end['from'], 1), round(end['to'], 1)], [round(st['from'], 1), round(st['to'], 1)], 'the window is the same after the drag', what='cut window after the drag')
    c.ok(end['whole'], 'the "Whole flight" button is gone after the drag', 'still shown')


# ------------------------------------------------------------------------------------------------------ D27
# LFQN (Saint-Omer Wizernes), as the real published base and the real VAC extraction have it: the SIA XML lists each VRP twice, "QT-N" with its
# description and "N" bare with the code for name, at the same place (the bare one 5 decimals, the other 6); the aerodrome's own prefix "QN" is
# not the VRPs' (they carry LFQT's "QT"), so the card takes the VRPs within 15 NM.  The VAC file of the aerodrome has the code twice ("NA", "na":
# the table of the points and the label of the chart), W 1.2 NM from the base's, and a point X the base does not have.
LFQN = {'icao': 'LFQN', 'name': 'SAINT-OMER WIZERNES', 'lat': 50.7289, 'lon': 2.2386, 'elev': 66, 'hardLen': 1100, 'public': True}
LFQN_VRP = [('QT-N', 'Relais hertzien 2 NM Sud Steenvoorde', 50.775278, 2.563889), ('QT-NA', 'Château de La Motte-au-Bois', 50.683333, 2.570833),
            ('QT-W', "Silos à l'Est d'Aires-sur-la-Lys", 50.646111, 2.408056), ('QT-WA', 'Intersection RD 916 et rivière Lys', 50.626389, 2.551111)]
LFQN_BASE = [{'id': i, 'name': n, 'lat': la, 'lon': lo} for i, n, la, lo in LFQN_VRP] + [
    {'id': i.split('-')[1], 'name': i.split('-')[1], 'lat': round(la, 5), 'lon': round(lo, 5)} for i, n, la, lo in LFQN_VRP]
LFQN_VAC = {'schema': 2, 'ad': 'LFQN', 'status': 'candidate', 'label': 'Extrait des VAC, à vérifier', 'analysis': None,
            'source': {'file': 'test.json', 'sha256': '0', 'cycle': '2026-10-15'}, 'generatedAt': '2026-10-25T00:00:00Z', 'notes': [], 'routes': [],
            'points': [{'code': 'AD', 'vrp': None, 'lat': 50.7289, 'lon': 2.2386, 'role': 'aerodrome_reference_point', 'origin': 'published',
                        'page': 1, 'text': '', 'restrictions': []}] + [
                {'code': k, 'vrp': None, 'lat': la, 'lon': lo, 'role': 'reporting_point', 'origin': 'published', 'page': 1, 'text': '', 'restrictions': rs}
                for k, la, lo, rs in [('N', 50.775278, 2.563889, []), ('NA', 50.683333, 2.570833, []), ('na', 50.683333, 2.570833, []),
                                      ('W', 50.666111, 2.408056, []), ('WA', 50.626389, 2.551111, ['ATC instruction only']), ('X', 50.7, 2.4, [])]]}
# the overlay's text and the map's instance, seen from the page: the labels of the last overlay frame, the MapLibre map
_D27_HOOK = """(() => {
  window.__ft = { cur: [], last: [] };
  const P = CanvasRenderingContext2D.prototype, cl = P.clearRect, ft = P.fillText, over = c => c.canvas && c.canvas.classList.contains('mp-over');
  P.clearRect = function (...a) { if (over(this)) { window.__ft.last = window.__ft.cur; window.__ft.cur = [] } return cl.apply(this, a) };
  P.fillText = function (t, ...a) { if (over(this)) window.__ft.cur.push(String(t)); return ft.call(this, t, ...a) };
  let ml; Object.defineProperty(window, 'maplibregl', { configurable: true, get() { return ml },
    set(v) { ml = v; if (v && v.Map && !v.Map.__cap) { const o = v.Map.prototype.project; v.Map.__cap = 1;
      v.Map.prototype.project = function (...a) { window.__mlMap = this; return o.apply(this, a) } } } });
})()"""


@case('D27', 'One line per VFR reporting point', 'D', tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='user 25 Oct: "Bug LFQN. Points de report VFR doublonnés": a point is one line and one label, whatever the sources that name it (the SIA base lists it twice, the VAC file once or twice)')
def d27(c):
    c.page.add_init_script(_D27_HOOK)
    c.open('maps?view=1.9,50.5,2.9,51.0', flight=True, airfields=True, aero_extra={'aerodromes': [LFQN], 'vrp': LFQN_BASE, 'cells': {'49': [[1, 4]], '50': [[1, 4]], '51': [[1, 4]]}},
           docs=[['sia/vfr/LFQN.json', LFQN_VAC, 'reference'], ['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']])
    c.until("() => !!window.__mlMap", timeout=20000, what='the map instance is seen')
    c.settle()
    c.wait(1500)
    xy = c.js("""() => { const m = window.__mlMap, p = m.project([2.2386, 50.7289]), r = m.getCanvas().getBoundingClientRect(); return [r.left + p.x, r.top + p.y] }""")
    c.page.mouse.click(xy[0], xy[1])
    c.until("() => !!document.querySelector('.mp-vfr-pts')", timeout=10000, what='the aerodrome card lists its points')
    c.settle()
    c.wait(800)
    rows = c.js("() => [...document.querySelectorAll('.mp-vfr-pts li')].map(l => ({ code: l.querySelector('b').textContent, text: l.textContent.trim() }))")
    codes = [r['code'] for r in rows]
    c.eq(codes, ['N', 'NA', 'W', 'WA', 'X'], 'one line per code (ten lines before: the base twice, the VAC file twice, W at both places)', what='codes listed')
    c.eq(norm(c.text('.mp-dbody b')), norm(row(c, 'vfrPoints').replace('{n}', '5')), 'the count is the number of lines', what='card heading')
    byc = {r['code']: r['text'] for r in rows}
    for code, name in (('N', LFQN_VRP[0][1]), ('NA', LFQN_VRP[1][1]), ('W', LFQN_VRP[2][1]), ('WA', LFQN_VRP[3][1])):
        c.ok(name in byc[code], f'{code}: {byc[code]!r}', f'the row keeps the description "{name}" (not the code twice)')
    c.ok(not re.search(r'\b(N|NA|W|WA|X)\s+\1\b', ' | '.join(byc.values())), ' | '.join(byc.values()), 'no row repeats its own code as its description')
    far = row(c, 'vfrVacOff').replace('{n}', '1.2' if c.lang == 'en' else '1,2')  # the number in the language of the run
    c.ok(far in byc['W'], f'W: {byc["W"]!r}', f'W says in one mention that the VAC puts it elsewhere: "{far}"')
    c.eq([k for k, t in byc.items() if far in t], ['W'], 'only W is more than 0.5 NM from its VAC position', what='rows with the VAC position mention')
    c.ok('ATC instruction only' in byc['WA'], f'WA: {byc["WA"]!r}', 'the VAC restriction of WA is kept on the one line')
    if os.environ.get('D27_SHOT'): c.page.screenshot(path=os.environ['D27_SHOT'])
    # the chart: one label per point in the last frame the overlay drew
    c.wait(300)
    last = c.js('() => window.__ft.cur')
    c.eq({k: last.count(k) for k in ('N', 'NA', 'W', 'WA', 'X')}, {'N': 1, 'NA': 1, 'W': 1, 'WA': 1, 'X': 1}, 'one label per point on the chart (the base twice, the highlight and the layer both drew them before)',
         what=f'labels in the last overlay frame {last}')


# ------------------------------------------------------------------------------------------------------ D28
# D28 (user 26 Oct: "SIV FIR etc. C'était un workaround pour ne pas avoir de colonnes nonsense. Soit une coche active tout (FIR ?) soit ça
# n'a pas d'intérêt. Objectif ergonomie et infos pertinentes"; relay: no checkbox, one folded line): the spaces left out of the graph and the
# profile by SiaAero.surfaceToCeiling (FIR, UIR, SIV, control sectors, any space from the surface to the ceiling) are named on one folded
# line "Aussi ici (n)" at the end of the "n espaces sur ce point" sheet and on a last grey line of the hover bubble; not a column, not
# counted in the title.  RULE decided here: EVERY space left out goes in the line (not only the service types FIR / UIR / SIV / CTL): an
# R SFC-UNL or a D with no limits exists and the pilot must know it; they come after FIR, UIR, SIV, by name; one entry per name.
D28_ALSO = D26_FLAT + [
    {'type': 'UIR', 'name': 'UIR TESTVILLE', 'rings': [_BIG]},
    {'type': 'FIR', 'name': 'FIR TESTVILLE', 'rings': [[[43.0, 0.0], [43.0, 5.0], [47.0, 5.0], [47.0, 0.0], [43.0, 0.0]]]},   # the same FIR twice (two rings): one name
    {'type': 'TMA', 'name': 'TMA FAR', 'lower': 'SFC', 'upper': 'FL100', 'rings': [[[50.0, 8.0], [50.0, 9.0], [51.0, 9.0], [51.0, 8.0], [50.0, 8.0]]]},   # not on the point
]
D28_NAMES = ['FIR FIR TESTVILLE', 'UIR UIR TESTVILLE', 'SIV SIV TESTVILLE', 'CTL LM TEST', 'D D 91 FLAT', 'R R 90 FLAT']


@case('D28', 'Airspaces sheet and hover: one folded "Aussi ici" line for the spaces left out', 'D', tags=('sheet', 'maps'), designs=('standard',), langs4=True,
      rule='user 26 Oct: "SIV FIR etc. C\'était un workaround pour ne pas avoir de colonnes nonsense" (rule 21 amended: no checkbox, one folded line)')
def d28(c):
    c.open('maps', flight=True, docs=[['cache/maps/ui.json', {'preset': 'low', 'layers': {}}, 'cache']], airspaces=D26_AS + D28_ALSO)
    c.wait(1500)
    want = ' · '.join(D28_NAMES)
    if c.width >= 1000:
        # the hover bubble (screen, mouse) over the label of a drawn space: the usual lines, then a grey "Aussi ici : ..." line, no fold
        # (the bubble opens on a label, a wind barb or an airway cartouche, not on an empty place: the labels are found by scanning the map)
        mp = c.js(MAP_JS, 'maps')
        tip = None
        for _ in range(8):                                                          # the base is read asynchronously
            for gy in range(24):
                for gx in range(40):
                    c.page.mouse.move(mp['x'] + (gx + 0.5) * mp['w'] / 40, mp['y'] + (gy + 0.5) * mp['h'] / 24)
                    tip = c.js("""() => { const t = document.querySelector('[data-module="maps"] .mp-tip.mp-hover'); if (!t || t.hidden || !/TEST/.test(t.textContent)) return null;
                        return { lines: [...t.children].map(e => e.textContent), cls: [...t.children].map(e => e.className), col: [...t.children].map(e => getComputedStyle(e).color) } }""")
                    if tip:
                        break
                if tip:
                    break
            if tip:
                break
            c.wait(700)
        c.ok(bool(tip), 'no hover bubble over a space label of the seeded base', 'a bubble opens on a label')
        exp = tx(M, 'tipAlso', c.lang).replace('{l}', want)
        c.eq(norm(tip['lines'][-1]), norm(exp), 'the last line of the bubble names the spaces left out, in the language, FIR UIR SIV then the others by name, once each', what=f'lines {tip["lines"]}')
        c.ok(tip['cls'][-1] == 'mp-also' and tip['col'][-1] != tip['col'][0], f'classes {tip["cls"]}, colours {tip["col"]}', 'the line is greyed (not the colour of the first line)')
        c.ok(len(tip['lines']) <= 3, f'lines {tip["lines"]}', 'at most the two usual lines and "Aussi ici"')
        c.page.mouse.move(mp['x'] + 2, mp['y'] + 2)
    tap_airspaces(c)
    n = c.js("document.querySelectorAll('.mp-lv-list li').length")
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.eq(n, 4, 'the list and the graph hold the four drawn spaces only', what=f'{n} entries')
    c.eq(norm(title), norm(tx(M, 'levelsTitle', c.lang).replace('{n}', '4')), 'the title counts the drawn spaces (4), not the ones named on the line', what=f'title {title!r}')
    c.eq(c.js("document.querySelectorAll('svg.mp-lv rect').length"), 4, 'no column for the spaces left out', what='columns')
    d = c.js("""() => { const q = document.querySelector('.mp-dbody[data-kind="lv"] details.mp-lv-also'); if (!q) return null; const s = q.querySelector('summary'), r = s.getBoundingClientRect(),
        l = document.querySelector('.mp-lv-body').getBoundingClientRect();
        return { open: q.open, summary: s.textContent, h: r.height, p: q.querySelector('p') ? q.querySelector('p').textContent : null, hiddenP: q.querySelector('p') ? q.querySelector('p').getBoundingClientRect().height === 0 : true,
                 after: r.top >= l.bottom - 1, inList: !!document.querySelector('.mp-lv-list details'), n: document.querySelectorAll('details.mp-lv-also').length } }""")
    c.ok(d is not None, 'no details.mp-lv-also in the sheet', 'a folded "Aussi ici (n)" line ends the sheet')
    c.eq(d['n'], 1, 'one "Aussi ici" line', what=f'{d["n"]} found')
    c.eq(d['open'], False, 'the line is folded by default', what=f'open={d["open"]}')
    c.eq(norm(d['summary']), norm(tx(M, 'levelsAlso', c.lang).replace('{n}', str(len(D28_NAMES)))), 'the summary says "Aussi ici (n)" in the language, n = names (once each)', what=f'summary {d["summary"]!r}')
    c.ge(round(d['h']), 44, 'the summary is a 44 px target', what=f'{d["h"]:.1f} px')
    c.ok(d['after'] and not d['inList'], f'after-list {d["after"]}, in the list {d["inList"]}', 'after the graph and the list, not a line of the list')
    c.eq(c.js("[...document.querySelectorAll('.mp-lv-list .mp-lv-name')].some(e => /SIV|FIR|UIR|LM TEST|FLAT/.test(e.textContent))"), False, 'none of the spaces left out is in the list', what='list names')
    sh = os.environ.get('D28_SHOT')
    if sh:
        c.page.screenshot(path=f'{sh}_{c.lang}_{c.width}_folded.png')
    c.tap('details.mp-lv-also > summary')
    c.until("document.querySelector('details.mp-lv-also').open", what='a tap on the line unfolds it')
    t = c.js("document.querySelector('details.mp-lv-also > p').textContent")
    c.eq(t, want, 'the unfolded line names the spaces left out: type prefix as the base gives it, FIR UIR SIV first then the others by name, once each, separated by " · "', what=f'content {t!r}')
    c.ok('TMA FAR' not in t and 'TMA 6' not in t, f'content {t!r}', 'only spaces on the point, only spaces left out')
    if sh:
        c.page.screenshot(path=f'{sh}_{c.lang}_{c.width}_open.png')
    # a point with no space left out has no line
    c.tap('.f-sheet-close')
    c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='✕ closes the list')
    c.open('maps', flight=True, docs=[['cache/maps/ui.json', {'preset': 'low', 'layers': {}}, 'cache']], airspaces=D26_AS)
    c.wait(1500)
    tap_airspaces(c)
    c.eq(c.js("document.querySelectorAll('.mp-lv-list li').length"), 4, 'the four drawn spaces', what='entries')
    c.eq(c.js("document.querySelectorAll('details.mp-lv-also').length"), 0, 'nothing left out on this point: no "Aussi ici" line', what='lines')


# ------------------------------------------------------------------------------------------------------ D29
# D29 (user 26 Oct, iPhone in landscape, sheet "4 espaces sur ce point" in the column of html.f-land: "Bug affichage de texte coupé"): the graph kept
# its width and the names of the list were cut to ONE character ("T · 4500|FL065 · E") while the levels and the class stayed whole.  The graph
# takes the width its columns need, at most 40 % of the body; a name is never cut under 8 characters: when the line is too short it takes two
# lines (the name, then the levels and the class under it); the ellipsis stays for very long names on a full line.
_D29_JS = """() => {
  const q = s => document.querySelector(s), body = q('.mp-dbody'), br = body.getBoundingClientRect(), svg = q('svg.mp-lv'), also = q('details.mp-lv-also');
  const shown = e => { const t = e.firstChild, r = e.getBoundingClientRect(); if (!t || t.nodeType !== 3) return 0; const trunc = e.scrollWidth > e.clientWidth + 1, rg = document.createRange(); let n = 0;
    for (let i = 0; i < t.length; i++) { rg.setStart(t, i); rg.setEnd(t, i + 1); const b = rg.getBoundingClientRect(); if (b.right <= r.right + 0.5 && b.left >= r.left - 0.5) n++ }
    return trunc ? Math.max(0, n - 1) : t.length };      // an ellipsis takes the place of the last character that fits
  const li = [...document.querySelectorAll('.mp-lv-list li')];
  const out = li.filter(l => { const r = l.getBoundingClientRect(); return r.right > br.right + 0.5 || [...l.querySelectorAll('*')].some(e => e.getBoundingClientRect().right > br.right + 0.5) }).length;
  const ar = also ? also.getBoundingClientRect() : null;
  return { pos: q('[data-module="maps"]').dataset.sheet, land: document.documentElement.classList.contains('f-land'), bodyW: body.clientWidth, bodyScrollW: body.scrollWidth, svgW: svg.getBoundingClientRect().width, svgH: svg.getBoundingClientRect().height,
    cols: getComputedStyle(q('.mp-lv-list')).columnCount, names: [...document.querySelectorAll('.mp-lv-name')].map(e => [e.textContent, shown(e), e.textContent.length]), out,
    rows: li.map(l => l.getBoundingClientRect().height), lh: parseFloat(getComputedStyle(li[0]).lineHeight),
    under: li.map(l => { const n = l.querySelector('.mp-lv-name'), t = l.querySelector('.mp-lv-lim'); return t && n.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1 ? Math.abs(t.getBoundingClientRect().left - n.getBoundingClientRect().left) : -1 }),
    also: ar ? { top: ar.top, bottom: ar.bottom, h: ar.height } : null, body: { top: br.top, bottom: br.bottom } } }"""


def d29_pos(c, want):
    """Brings the sheet to a position ('default', 'expanded'): a tap on the handle in the landscape column (two positions), a drag in portrait."""
    cur = c.js("document.querySelector('[data-module=\"maps\"]').dataset.sheet")
    if cur == want:
        return
    if c.js("document.documentElement.classList.contains('f-land')"):
        c.tap('.f-sheet-grip')
    else:
        c.drag('.f-sheet-grip', -420 if want == 'expanded' else 420)
    c.until(f"document.querySelector('[data-module=\"maps\"]').dataset.sheet === '{want}'", what=f'the sheet goes to {want}')
    c.settle()
    c.wait(400)


def d29_check(c, what, fixture_also):
    g = c.js(_D29_JS)
    c.ge(g['bodyW'], 200, 'the body of the sheet has a width', what=f'{what}: body {g["bodyW"]} px')
    c.le(round(g['svgW'] / g['bodyW'], 3), 0.401, 'the graph is at most 40 % of the body', what=f'{what}: graph {g["svgW"]:.0f} px of {g["bodyW"]} px')
    c.le(g['bodyScrollW'], g['bodyW'] + 1, 'no horizontal scroll in the body', what=f'{what}: scrollWidth {g["bodyScrollW"]}, clientWidth {g["bodyW"]}')
    c.eq(g['out'], 0, 'no line of the list goes out of the body', what=f'{what}: {g["out"]} lines')
    for name, shown, n in g['names']:
        c.ge(shown, min(8, n), 'a name shows at least 8 characters (all of it when shorter)', what=f'{what}: {name!r} shows {shown} of {n}')
    for i, h in enumerate(g['rows']):
        c.le(round(h / g['lh'], 2), 2.4, 'an entry is at most two lines', what=f'{what}: entry {i + 1} is {h:.0f} px for a {g["lh"]:.0f} px line')
        if h / g['lh'] > 1.4:
            c.le(g['under'][i], 1, 'on two lines the levels are aligned under the name', what=f'{what}: entry {i + 1} levels start {g["under"][i]:.1f} px off the name')
    if fixture_also:
        a = g['also']
        c.ok(a is not None and a['h'] >= 40, f'{what}: "Aussi ici" {a}', 'the "Aussi ici" line is there, a 44 px target')
        # visible without scrolling, unless the list alone fills the body (thirteen entries, or two lines for each on a small default sheet: the body scrolls)
        if max(g['svgH'], sum(g['rows']) + 2 * len(g['rows'])) + 54 <= g['body']['bottom'] - g['body']['top'] - 18:
            c.ok(a['top'] >= g['body']['top'] - 1 and a['bottom'] <= g['body']['bottom'] + 1, f'{what}: "Aussi ici" {a}, body {g["body"]}', 'the "Aussi ici" line stays visible under the list')
    return g


@case('D29', 'Airspaces sheet: names never cut to one character, graph at most 40 % (landscape column, narrow portrait)', 'D', tags=('sheet', 'maps'), screens=False,
      rule='user 26 Oct (iPhone landscape, "4 espaces sur ce point"): "Bug affichage de texte coupé"')
def d29(c):
    docs = [['cache/maps/ui.json', {'preset': 'low', 'layers': {}}, 'cache']]
    for fixture, also, label in ((D26_AS + D28_ALSO, True, '4 spaces + Aussi ici'), (D26_13 + D26_FLAT, True, '13 spaces')):
        for w, h in ((844, 390), (390, 844), (360, 780)):
            c.page.set_viewport_size({'width': w, 'height': h})
            c.open('maps', flight=True, docs=docs, airspaces=fixture)
            c.wait(1500)
            c.settle()
            tap_airspaces(c)
            c.settle()
            c.wait(400)
            c.eq(c.js("document.documentElement.classList.contains('f-land')"), w > h, 'the landscape column (html.f-land) in 844 x 390 only', what=f'{w} x {h}')
            for pos in ('default', 'expanded'):
                d29_pos(c, pos)
                sh = os.environ.get('D29_SHOT')
                if sh:
                    c.page.screenshot(path=f'{sh}_{c.design}_{label[:2].strip()}_{w}x{h}_{pos}.png')
                d29_check(c, f'{label}, {w} x {h}, {pos}', also)
