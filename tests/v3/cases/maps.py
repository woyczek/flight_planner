"""Area D - maps (PLAN.md section D and the "new" cases D11-D13 of section L; modules/maps/SPEC.md, lot of 24 Oct).

Rules covered
  * the buttons over the map: order, labels in four languages, Follow and the editing buttons hidden when they must be (D1);
  * Edit mode: pressed state, the "+" and Undo buttons, a one-time hint notification, Escape (D2);
  * Layers inside the sheet, flight selector first (D3); the Profile / Weather chips (D4);
  * the "data access not set" / "database not published" notice, once per mount (D5, D5b); the modes panel (D6); the folded attribution (D7);
  * a started flight (D8), no flight (D9), a mission map without data (D10);
  * L1 the sheet content is closable and leaves the map half the view (D11); L3 the profile canvas draws one level and no
    green / orange dots (D12); L14 a drag on the map or a wheel on the sheet does not close a content (D13).

Cases: D1 D2 D3 D4 D5 D5b D6 D7 D8 D9 D10 D11 D12 D13 D14 D15 D16 D17 D18 (the complexity slider, the airline's thresholds, the tuning page's access: 24 Oct).  Seeding: the planned flight of lib.FLIGHT (a started one for D8);
MapLibre runs on an empty style answered by the runner, so the attribution control exists without any network.
"""
import re
import time

from lib import FLIGHT, MAP_JS, Fail, Skip, case, forget, norm, tx

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
    chips = c.boxes('.mp-chip')
    c.eq(len(chips), 2, 'two icon chips', what='chips')
    info = c.js("[...document.querySelectorAll('.mp-chip')].map(b => ({ title: b.title, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), hidden: b.hidden }))")
    names = [row(c, 'dataProfile'), row(c, 'wxTitle')]
    c.eq(info[0]['title'], names[0], 'the Profile chip is named in the language of the run', what='Profile chip title')
    c.eq(info[0]['pressed'], 'true', 'the Profile chip is pressed by default', what='Profile chip aria-pressed')
    c.ok(info[1]['pressed'] in ('true', 'false'), f'Weather chip aria-pressed {info[1]["pressed"]!r}', 'a toggle (aria-pressed)')
    if info[1]['hidden']:
        c.ok(not chips[1]['shown'], 'the Weather chip is hidden by attribute but displayed', 'hidden, not absent')   # cut unavailable: hidden, not absent
    else:
        c.eq(info[1]['title'], names[1], 'the Weather chip is named in the language of the run', what='Weather chip title')
    for i, ch in enumerate(chips):
        if info[i]['hidden']:
            continue
        c.ge(round(ch['w']), 36, 'icon chips are at least 36 px', what=f'chip {i} width')
    # the chips left the head row (V3 spec 7.1.13, second refinement): 40 px chips on a 44 px pitch, so touch zones of 44 px side by side
    hit = c.js("""() => [...document.querySelectorAll('.mp-chip')].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(), x = r.left + r.width / 2; let lo = null, hi = null;
        for (let y = Math.max(0, r.top - 30); y < r.bottom + 40; y++) { const e = document.elementFromPoint(x, y); if (e && e.closest('.mp-chip') === b) { if (lo === null) lo = y; hi = y } }
        return hi === null ? 0 : hi - lo + 1 })""")
    for i, h in enumerate(hit):
        c.ge(h, 40, f'chip {i}: touch zone {h} px high', 'a touch zone of about 44 px (40 px chips, 4 px apart)')
    sheet_body_checks(c)


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


def chips_layout(c, landscape, weather, what):
    """V3 spec 7.1.13, second refinement: the chips are out of the grip row; a vertical column at the right of the drawing in portrait
    (the drawing takes the width left, flush to the left edge of the body), a horizontal row above the drawing in the landscape column."""
    g = c.js(_CHIPS_JS, weather)
    ch, d, p, h = g['chips'], g['drawing'], g['panel'], g['head']
    c.eq(len(ch), 2, 'the two chips are shown', what=f'{what}: chips')
    c.ok(not g['inHead'], f'{what}: chips in the head', 'the chips are not in the grip row')
    c.ge(round(ch[0]['t'] - h['b'], 1), -1, 'the chips start under the head', what=f'{what}: chips top against head bottom')
    c.le(round(d['l'] - p['l'], 1), 8, 'the drawing starts at the left edge of the body (8 px at most)', what=f'{what}: drawing left against sheet left')
    if landscape:
        c.le(abs(round(ch[0]['t'] - ch[1]['t'], 1)), 1, 'landscape column: the chips are on one row', what=f'{what}: chip tops')
        c.ge(round(ch[1]['l'] - ch[0]['r'], 1), 0, 'landscape column: the second chip is to the right of the first', what=f'{what}: chip gap')
        c.le(round(ch[0]['b'] - g['ink']['t'], 1), 1, 'landscape column: the row is above the drawing', what=f'{what}: chips bottom against drawing top')
    else:
        c.le(abs(round(ch[0]['l'] - ch[1]['l'], 1)), 1, 'portrait: the chips form a vertical column', what=f'{what}: chip lefts')
        c.ge(round(ch[1]['t'] - ch[0]['b'], 1), 0, 'portrait: the second chip is under the first', what=f'{what}: chip gap')
        c.ge(round(ch[0]['r'] - p['r'] + 8, 1), 0, 'portrait: the column is at the right of the sheet', what=f'{what}: chips right against sheet right')
        c.le(round(g['ink']['r'] - ch[0]['l'], 1), 1, 'portrait: the drawing ends where the column begins', what=f'{what}: drawing right against chips left')
        c.ge(round(g['ink']['b'] - g['ink']['t']), 80, 'the drawing keeps its height beside the column', what=f'{what}: drawing height')


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
    chips_layout(c, False, False, 'profile portrait')
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
    chips_layout(c, False, True, 'weather portrait')
    c.ok(not g['strip']['shown'] and not g['notes']['shown'], f'strip shown {g["strip"]["shown"]}, notes shown {g["notes"]["shown"]}',
         'the weather cut alone at the default position')
    c.page.set_viewport_size({'width': 844, 'height': 390})
    c.settle()
    titled_head(c, 'weather landscape column')
    drawing_fits(c, 'weather landscape 844 x 390', True)
    chips_layout(c, True, True, 'weather landscape')
    c.tap('.mp-chip[data-view="profile"]')
    c.wait(500)
    titled_head(c, 'profile landscape column')
    drawing_fits(c, 'profile landscape 844 x 390', False)
    chips_layout(c, True, False, 'profile landscape')
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
    for m, root in (('maps', MAPS), ('atmosphere', '[data-module="atmosphere"]')):
        c.open(m, flight=True)
        try:
            c.page.wait_for_function(f"!!document.querySelector('{root} .maplibregl-ctrl-attrib')", timeout=10000)
        except Exception:
            raise Skip(f'#{m}: MapLibre did not start with the empty style, so there is no attribution control to measure') from None
        c.wait(500)
        a = c.js(f"""(() => {{ const a = document.querySelector('{root} .maplibregl-ctrl-attrib'); return {{ n: document.querySelectorAll('{root} .maplibregl-ctrl-attrib').length,
            open: a.hasAttribute('open'), compact: a.classList.contains('maplibregl-compact'), show: a.classList.contains('maplibregl-compact-show'),
            w: a.getBoundingClientRect().width, credit: document.querySelectorAll('{root} .mp-credit').length }} }})()""")
        c.eq(a['n'], 1, 'exactly one credit control on the map', what=f'#{m} attribution controls')
        c.ok(a['compact'] and not a['open'] and not a['show'], f'#{m} attribution compact={a["compact"]} open={a["open"]} shown={a["show"]}', 'compact and folded after the load')
        c.le(round(a['w']), 40, 'the folded attribution is a small button', what=f'#{m} attribution width')
        c.eq(a['credit'], 0, 'no second credit text (.mp-credit)', what=f'#{m} .mp-credit elements')


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


@case('D11', 'Airspaces list in the sheet', 'D', tags=('sheet', 'maps'), screens=False,
      rule='L1: the airspaces card was hidden under the map buttons, unclosable, 90 % of the map on a phone (23 Oct)')
def d11(c):
    c.open('maps', flight=True, aero=True)
    c.wait(1500)
    tap_airspaces(c)
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok('2' in title, f'sheet title {title!r}', 'the title counts the 2 airspaces under the point')
    c.ok(c.js("!!document.querySelector('.f-sheet-panel .mp-dbody[data-kind=\"lv\"] .mp-lv-list')"), 'no airspaces list inside the sheet panel', 'the list is the sheet\'s content')
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
    c.eq(norm(c.text('[data-admin="tune"] a') or ''), norm(tx(link, 'title', c.lang)), 'the button is named "Map threshold tuning (administrator)" in the language of the run', what='tuning button')
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
