"""Area D - maps (PLAN.md section D and the "new" cases D11-D13 of section L; modules/maps/SPEC.md, lot of 24 Oct).

Rules covered
  * the buttons over the map: order, labels in four languages, Follow and the editing buttons hidden when they must be (D1);
  * Edit mode: pressed state, the "+" and Undo buttons, a one-time hint notification, Escape (D2);
  * Layers inside the sheet, flight selector first (D3); the Profile / Weather chips (D4);
  * the "data access not set" / "database not published" notice, once per mount (D5, D5b); the modes panel (D6); the folded attribution (D7);
  * a started flight (D8), no flight (D9), a mission map without data (D10);
  * L1 the sheet content is closable and leaves the map half the view (D11); L3 the profile canvas draws one level and no
    green / orange dots (D12); L14 a drag on the map or a wheel on the sheet does not close a content (D13).

Cases: D1 D2 D3 D4 D5 D5b D6 D7 D8 D9 D10 D11 D12 D13.  Seeding: the planned flight of lib.FLIGHT (a started one for D8);
MapLibre runs on an empty style answered by the runner, so the attribution control exists without any network.
"""
from lib import MAP_JS, Fail, Skip, case, norm, tx

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
    c.ok(norm(c.text('.f-sheet-head .f-sheet-title') or '').startswith(norm(tx(M, 'ttlProfile', c.lang))), 'the profile title did not come back', 'back to the profile')


@case('D4', 'Profile / Weather chips', 'D', tags=('sheet', 'maps'), screens=False, langs4=True, rule='maps lot point 4')
def d4(c):
    c.open('maps', flight=True)
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
        c.ge(round(ch['h']), 36, 'icon chips are at least 36 px', what=f'chip {i} height')
    before = c.js("""() => { const h = document.querySelector('.f-sheet-head'), ch = h.querySelector('.mp-chips'), x = h.querySelector('.f-sheet-close');
        return !!(ch.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING) }""")
    c.ok(before, 'the chips come after the close button in the head', 'the chips are placed before the ✕')


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
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok(norm(row(c, 'stFlying')) in norm(title), f'sheet title {title!r}', f'contains "{row(c, "stFlying")}"')
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
    c.ok(norm(c.text('.f-sheet-head .f-sheet-title') or '').startswith(norm(tx(M, 'ttlProfile', c.lang))), 'the profile did not come back', 'back to the profile')


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
