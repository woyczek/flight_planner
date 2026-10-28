"""Area B - overlay layer and full screen (PLAN.md section B; rules frame/INTEGRATION.md 9.3 and 9.4).

Rules covered
  * the layer `.f-overlay` lies exactly over the map box of a fixed module (B1);
  * the right column ends with the frame's full-screen button and every button is a 44 px square at 8 px from the edge,
    even when a wide element is put in the column (B2, the "wide element" fix of 24 Oct);
  * nothing sits between the header and the map (B3); buttons never cover the sheet (B4);
  * full screen on a phone and on a screen (no exit chip: the column's button and Escape leave it), its memory across frame
    screens, the order of Escape (B5-B8), an Escape the module took ignored by the frame (B11);
  * the layer lets gestures through, only the buttons take touches (B9); panes get no full-screen button (B10).

Cases: B1 B2 B3 B4 B5 B6 B7 B8 B9 B10 B11.  Both fixed modules (maps, atmosphere) are measured with a flight seeded.
"""
from lib import MAP_JS, Fail, Skip, case, tx

FIXED = ('maps', 'atmosphere')

def exit_label(c):
    return tx('frame/app.js', 'exit', c.lang, after='full: {')


@case('B1', 'Layer over the map', 'B', tags=('overlay',), screens=False, rule='frame/INTEGRATION 9.3 placement')
def b1(c):
    for m in FIXED:
        c.open(m, flight=True)
        ov, mp = c.box('.f-overlay'), c.js(MAP_JS, m)
        c.ok(ov and ov['shown'], f'#{m}: .f-overlay missing or not displayed', 'a visible layer')
        for k in ('x', 'y', 'w', 'h'):
            c.eq(round(ov[k], 1), round(mp[k], 1), 'the layer box equals the map box', tol=1, what=f'#{m} layer {k} vs map')


def _right_buttons(c):
    return c.js("""[...document.querySelectorAll('.f-ov-right > .f-ov-btn')].map(b => ({ box: window.__t.box(b), full: b.classList.contains('f-ov-full'), title: b.title }))""")


def _check_columns(c, m, step):
    ov = c.box('.f-overlay')
    right = [b for b in _right_buttons(c) if b['box']['shown']]
    c.ok(right, f'#{m}{step}: no visible button in the right column', 'at least one button')
    allr = c.js("[...document.querySelectorAll('.f-ov-right > .f-ov-btn')].map(b => b.classList.contains('f-ov-full'))")
    c.ok(allr and allr[-1], f'#{m}{step}: the last child of .f-ov-right is not .f-ov-full ({allr})', 'the full-screen button is last in the DOM')
    c.ok(right[-1]['full'], f'#{m}{step}: the visually last right button is "{right[-1]["title"]}"', 'the full-screen button')
    c.ok(right[-1]['box']['t'] >= max(b['box']['t'] for b in right) - 0.5, f'#{m}{step}: the full-screen button is not the lowest', 'lowest top among the right buttons')
    for b in right:
        bx = b['box']
        c.eq(round(bx['w']), 44, '44x44 button', tol=1, what=f'#{m}{step} "{b["title"]}" width')
        c.eq(round(bx['h']), 44, '44x44 button', tol=1, what=f'#{m}{step} "{b["title"]}" height')
        c.eq(round(ov['r'] - bx['r'], 1), 8, 'right edge at the layer right minus 8 px', tol=1, what=f'#{m}{step} "{b["title"]}" distance to the layer right')
    left = [x for x in c.boxes('.f-ov-left > .f-ov-btn') if x['shown']]
    c.eq(len(left), 1, 'the Layers button is the one button of the left column', what=f'#{m}{step} left buttons')
    c.eq(round(left[0]['w']), 44, '44x44', tol=1, what=f'#{m}{step} Layers width')
    c.eq(round(left[0]['h']), 44, '44x44', tol=1, what=f'#{m}{step} Layers height')


@case('B2', 'Columns', 'B', tags=('overlay', 'look'), screens=False, rule='frame/INTEGRATION 9.3; fix of 24 Oct (wrap-reverse inverted align-items)')
def b2(c):
    for m in FIXED:
        c.open(m, flight=True)
        _check_columns(c, m, '')
        # L6: a wide element (90 px) put first in the right column must not push the 44 px buttons off the right edge
        c.js("""() => { const d = document.createElement('div'); d.id = 'wide-probe'; d.className = 'f-ov-btn';
              d.style.cssText = 'width:90px;height:44px'; document.querySelector('.f-ov-right').prepend(d) }""")
        c.wait(300)
        ov = c.box('.f-overlay')
        for b in [x for x in _right_buttons(c) if x['box']['shown'] and x['box']['w'] < 60]:
            c.eq(round(ov['r'] - b['box']['r'], 1), 8, 'right edge at the layer right minus 8 px with a wide element in the column',
                 tol=1, what=f'#{m} with a 90 px element, "{b["title"]}" distance to the layer right')
        c.js("document.getElementById('wide-probe').remove()")


@case('B3', 'Nothing between header and map', 'B', tags=('overlay', 'layout'), screens=False,
      rule='V3_SPECIFICATION 7.1 rule 1 (user: "header, carte, carte, footer")')
def b3(c):
    for m in FIXED:
        c.open(m, flight=True)
        mp, head = c.js(MAP_JS, m), c.box('.f-head')
        bad = c.js("""([mapTop, headBottom]) => {
          const out = [], skip = e => e.closest('.f-overlay, .f-sheet-panel, .f-head, .f-tabbar, #fNotes, style, script');
          for (const e of document.querySelectorAll('#fView *')) {
            if (skip(e)) continue;
            const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
            if (r.width <= 1 || r.height <= 1 || cs.display === 'none' || cs.visibility === 'hidden') continue;
            if (r.bottom <= mapTop + 0.5 && r.top >= headBottom - 0.5) out.push(e.tagName + '.' + e.className + ' ' + Math.round(r.top) + '-' + Math.round(r.bottom));
          } return out.slice(0, 3) }""", [mp['t'], head['b']])
        c.ok(not bad, f'#{m}: element(s) between header and map: {bad}', 'nothing between the header bottom and the map top')


@case('B4', 'Buttons do not cover the sheet', 'B', tags=('overlay', 'sheet'), screens=False, rule='frame/INTEGRATION 9.3 sheet safety')
def b4(c):
    for m in FIXED:
        c.open(m, flight=True)
        sheet = c.box('.f-sheet-panel')
        c.ok(sheet and sheet['shown'], f'#{m}: no visible sheet panel', 'a sheet panel')
        for b in [x for x in c.boxes('.f-ov-btn') if x['shown']]:
            c.le(round(b['b'], 1), round(sheet['t'] + 0.5, 1), 'a button must end above the sheet panel top', what=f'#{m} button bottom (sheet top {sheet["t"]:.0f})')


def _full_state(c):
    return c.js("""() => ({ full: document.documentElement.classList.contains('f-full'), head: window.__t.shown(document.querySelector('.f-head')),
      bar: window.__t.shown(document.getElementById('fTabs')), nav: window.__t.shown(document.getElementById('fNav')),
      root: window.__t.box(document.querySelector('[data-module="maps"]')), chip: document.querySelectorAll('.f-ov-exit').length,
      canvas: (() => { const e = document.querySelector('.maplibregl-canvas') || document.querySelector('canvas.mp-over'); return e ? e.clientHeight : -1 })() })""")


def _full_screen_case(c):
    c.open('maps', flight=True)
    c.js("() => { window.__resized = 0; window.addEventListener('resize', () => { window.__resized++ }) }")
    before = _full_state(c)
    c.ok(not before['full'], 'html.f-full is set before the tap', 'not in full screen at mount')
    head_h = c.box('.f-head')['h'] if c.phone else 0
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='html gets f-full after the tap')
    c.settle()
    c.wait(300)
    st = _full_state(c)
    c.ok(not st['head'], 'the header is displayed in full screen', 'hidden')
    if c.phone:
        c.ok(not st['bar'], '#fTabs is displayed in full screen', 'hidden')
    else:
        c.ok(not st['nav'], 'the rail #fNav is displayed in full screen', 'hidden (the map takes all the width)')
    w, h = c.width, c.height
    c.eq(round(st['root']['w']), w, 'the module root fills the window', tol=1, what='root width')
    c.eq(round(st['root']['h']), h, 'the module root fills the window', tol=1, what='root height')
    c.eq(round(st['root']['t']), 0, 'the module root is at the top of the window', tol=1, what='root top')
    c.eq(round(st['root']['l']), 0, 'the module root is at the left of the window', tol=1, what='root left')
    c.eq(st['chip'], 0, 'there is no exit chip (the button of the column, now showing "minimize", and Escape leave full screen)', what='.f-ov-exit elements')
    c.ok(c.shown('.f-ov-full'), 'the full-screen button of the column is not displayed in full screen', 'displayed: it is the way out')
    c.eq(c.attr('.f-ov-full', 'aria-label'), exit_label(c), 'the button label is "Quitter le plein écran" in the language of the run', what='button label')
    c.eq(c.attr('.f-ov-full', 'aria-pressed'), 'true', 'the button is pressed in full screen', what='aria-pressed')
    c.ge(c.js('window.__resized'), 1, 'a resize event is dispatched on window after the change', what='resize events')
    if c.phone:
        c.ge(st['canvas'], before['canvas'] + 1, 'the map canvas grows in full screen (it gives back the header and the bar)', what='canvas height')
    # leave by Escape
    c.key('Escape')
    c.until("!document.documentElement.classList.contains('f-full')", what='Escape leaves the full screen')
    c.settle()
    after = _full_state(c)
    c.ok(after['head'], 'the header is not back after leaving full screen', 'displayed')
    if c.phone:
        c.eq(round(after['root']['t']), round(head_h), 'the module root is back under the header', tol=1, what='root top after exit')
    # and so does the button of the column (the way out, with Escape)
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen again')
    c.tap('.f-ov-full')
    c.until("!document.documentElement.classList.contains('f-full')", what='the button of the column leaves the full screen')


@case('B5', 'Full screen on a phone', 'B', tags=('overlay', 'fullscreen'), screens=False, langs4=True, rule='frame/INTEGRATION 9.4')
def b5(c):
    _full_screen_case(c)


@case('B6', 'Full screen on a screen', 'B', tags=('overlay', 'fullscreen'), phone=False, rule='frame/INTEGRATION 9.4 (rail hidden too)')
def b6(c):
    _full_screen_case(c)


@case('B7', 'Full screen memory', 'B', tags=('overlay', 'fullscreen'), screens=False, rule='frame/INTEGRATION 9.4 memory')
def b7(c):
    c.open('maps', flight=True)
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen')
    # the header (and its gear) is hidden in full screen: the address opens the frame screen, as the gear would
    c.js("location.hash = '#settings'")
    c.until("location.hash === '#settings'", what='the settings open over the full screen')
    c.wait(300)
    c.ok(c.shown('.f-head'), 'the header is not back while a frame screen is open over the full screen', 'header displayed')
    c.key('Escape')
    c.until("location.hash === '#maps'", what='Escape closes the settings')
    c.settle()
    c.ok('f-full' in c.js('document.documentElement.className'), 'f-full is gone after closing the frame screen', 'the module is full screen again')
    c.go('fuel')
    c.ok('f-full' not in c.js('document.documentElement.className'), 'f-full still set on #fuel', 'reset at a module change')


@case('B8', 'Escape order', 'B', tags=('overlay', 'fullscreen', 'sheet'), screens=False, rule='frame/INTEGRATION 9.4; maps lot point 8')
def b8(c):
    c.open('maps', flight=True)
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen')
    c.tap('.f-ov-left .f-ov-btn')                      # Layers
    c.until("document.querySelector('.f-sheet-close') && window.__t.shown(document.querySelector('.f-sheet-close'))", what='the Layers content opens in the sheet')
    c.key('Escape')
    c.wait(300)
    c.ok('f-full' in c.js('document.documentElement.className'), 'the first Escape left the full screen', 'the first Escape closes Layers and keeps full screen')
    c.ok(not c.shown('.f-sheet-close'), 'the Layers content is still open after the first Escape', 'closed')
    c.key('Escape')
    c.until("!document.documentElement.classList.contains('f-full')", what='the second Escape leaves the full screen')


@case('B9', 'Gestures pass through', 'B', tags=('overlay',), screens=False, rule='frame/INTEGRATION 9.3 (the layer lets map gestures through)')
def b9(c):
    for m in FIXED:
        c.open(m, flight=True)
        c.eq(c.style('.f-overlay', 'pointerEvents'), 'none', 'the layer ignores pointers', what=f'#{m} .f-overlay pointer-events')
        bad = c.js("[...document.querySelectorAll('.f-ov-btn')].filter(b => getComputedStyle(b).pointerEvents !== 'auto').map(b => b.title)")
        c.ok(not bad, f'#{m}: buttons without pointer-events:auto: {bad}', 'every .f-ov-btn takes touches')


@case('B10', 'Panes', 'B', tags=('overlay',), phone=False, rule='frame/INTEGRATION 9.3 last bullet (a pane gets no full-screen button)')
def b10(c):
    c.open('maps?with=fuel', flight=True)
    c.wait(500)
    main = c.js("document.querySelectorAll('.f-view > .f-overlay .f-ov-full, #fView > .f-overlay .f-ov-full').length")
    c.ok(main >= 1, 'no full-screen button on the main map of #maps?with=fuel', 'the main module keeps its button')
    c.open('fuel?with=maps', flight=True)
    c.until("!!document.querySelector('.f-pane')", what='the pane opens at 1280', timeout=8000)
    c.wait(800)
    n = c.js("document.querySelectorAll('.f-pane .f-overlay').length + document.querySelectorAll('.f-pane ~ .f-overlay').length")
    full = c.js("document.querySelectorAll('.f-pane .f-ov-full').length")
    c.eq(full, 0, 'a pane has no full-screen button', what=f'.f-ov-full inside the pane ({n} pane layer(s))')


@case('B11', 'Escape taken by the module', 'B', tags=('overlay', 'fullscreen'), screens=False,
      rule='frame/INTEGRATION 9.4 (Escape): a key press the module took (preventDefault) is ignored by the frame, wherever the module listens')
def b11(c):
    c.open('maps', flight=True)
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen')
    # a module's listener on document, bubbling, added after the frame's start (the case the frame used to see first)
    c.js("""() => { window.__took = 0; window.__seen = [];
      window.__take = e => { if (e.key === 'Escape' && window.__took < 1) { window.__took++; e.preventDefault() } };
      document.addEventListener('keydown', window.__take);
      window.addEventListener('keydown', e => { if (e.key === 'Escape') window.__seen.push(e.defaultPrevented) }) }""")
    c.key('Escape')
    c.wait(300)
    c.ok('f-full' in c.js('document.documentElement.className'), 'full screen left by a key press the module took',
         'the frame ignores an Escape whose defaultPrevented is true')
    c.key('Escape')
    c.until("!document.documentElement.classList.contains('f-full')", what='the next Escape, not taken, leaves full screen')
    c.eq(c.js('window.__seen.slice(-1)[0]'), True, 'the frame marks the key it used (preventDefault)', what='defaultPrevented after the frame')
    # a frame screen opened over the module: same rule
    c.js("() => { window.__took = 0; location.hash = '#settings' }")
    c.until("!!document.querySelector('[data-card=\"status\"]')", what='the settings are open over the map')
    c.key('Escape')
    c.wait(300)
    c.eq(c.js('location.hash'), '#settings', 'the screen stays when the module took the key', what='address after a taken Escape')
    c.key('Escape')
    c.until("location.hash === '#maps'", what='the next Escape closes the settings')
