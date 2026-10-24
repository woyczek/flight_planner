"""Area C - sheet primitive (PLAN.md section C; frame/INTEGRATION.md 11, frame/lib/test/sheet.html).

Rules covered
  * the frame's own bench passes both at 390 and 1280 (C1);
  * default height: 30 % of the view with a 170 px floor on a phone (user decision of 24 Oct), 35 % on a screen (C2, C3);
  * three positions by drag, `aria-expanded` follows, map + panel = view (C4);
  * the grip row is the title ("Profil..."), without state wording, no second title row, no segmented control (C5);
  * a content has a close button which restores the profile title (C6).

Cases: C1 C2 C3 C4 C5 C6.  Maps and atmosphere are the two users of the primitive; both run with a flight seeded.
"""
from lib import MAP_JS, Fail, Skip, case, tx

FIXED = ('maps', 'atmosphere')
PROFILE = {'maps': ('modules/maps/module.js', 'ttlProfile'), 'atmosphere': ('modules/atmosphere/texts.js', 'profileTitle')}
STATE_WORDS = ('non chargée', 'non chargé', 'not loaded', 'chargement', 'loading', 'nicht geladen', 'lädt', 'no cargad', 'cargando')


def profile_word(m, lang):
    path, key = PROFILE[m]
    return tx(path, key, lang)


def view_height(c):
    """The height a fixed module may fill, from the real boxes: the window less the header and the bar (phone)."""
    head = c.box('.f-head')
    bar = c.box('#fTabs')
    return c.height - (head['h'] if head['shown'] else 0) - (bar['h'] if bar and bar['shown'] else 0)


@case('C1', 'Bench', 'C', tags=('sheet',), designs=('standard',), rule='frame/INTEGRATION 11; the bench reported 76/76 at both widths')
def c1(c):
    c.page.goto(f'{c.base}/frame/lib/test/sheet.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__sheetBench && window.__sheetBench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__sheetBench.done)', 'a finished bench', 'frame/lib/test/sheet.html') from None
    r = c.js('({ pass: window.__sheetBench.pass, fail: window.__sheetBench.fail, rows: window.__sheetBench.rows })')
    bad = [x for x in (r['rows'] or []) if 'FAIL' in str(x)][:3]
    c.ok(r['fail'] == 0 and r['pass'] > 0, f"{r['pass']} passed, {r['fail']} failed. First failures: {bad}", 'every assertion of the bench passes')


@case('C2', 'Default height on a phone', 'C', tags=('sheet',), screens=False, rule='user decision of 24 Oct (30 % on a phone)')
def c2(c):
    for m in FIXED:
        c.open(m, flight=True)
        view = view_height(c)
        want = max(0.30 * view, 170)
        panel = c.box('.f-sheet-panel')
        c.eq(c.attr(f'[data-module="{m}"]', 'data-sheet'), 'default', 'the sheet starts at its default position', what=f'#{m} data-sheet')
        c.eq(round(panel['h'], 1), round(want, 1), f'max(30 % of the view {view:.0f} px, 170 px)', tol=2, what=f'#{m} sheet height')


@case('C3', 'Default height on a screen', 'C', phone=False, tags=('sheet',), rule='frame/INTEGRATION 11 (35 % from 761 px)')
def c3(c):
    for m in FIXED:
        c.open(m, flight=True)
        view = view_height(c)
        panel, root = c.box('.f-sheet-panel'), c.box(f'[data-module="{m}"]')
        if panel['w'] < root['w'] * 0.9:
            # the sheet is a side column at this width: the plan asks to assert that layout instead, and say so
            c.ok(panel['h'] >= root['h'] * 0.9, f'#{m}: side column {panel["w"]:.0f}x{panel["h"]:.0f} in a {root["w"]:.0f}x{root["h"]:.0f} root',
                 'a side column as tall as the view')
            continue
        c.eq(round(panel['h'], 1), round(max(0.35 * view, 170), 1), f'max(35 % of the view {view:.0f} px, 170 px)', tol=2, what=f'#{m} sheet height')


@case('C4', 'Three positions', 'C', tags=('sheet',), screens=False, rule='frame/INTEGRATION 11')
def c4(c):
    for m in FIXED:
        c.open(m, flight=True)
        view = view_height(c)
        grip = f'[data-module="{m}"] .f-sheet-grip'
        default = c.box('.f-sheet-panel')['h']
        c.drag(grip, -420)
        c.settle()
        up = c.box('.f-sheet-panel')['h']
        c.eq(round(up, 1), round(max(0.70 * view, 260), 1), f'expanded = max(70 % of the view {view:.0f} px, 260 px)', tol=2, what=f'#{m} height after dragging up')
        c.eq(c.attr(f'[data-module="{m}"]', 'data-sheet'), 'expanded', 'data-sheet follows the drag', what=f'#{m} data-sheet')
        c.eq(c.attr(grip, 'aria-expanded'), 'true', 'aria-expanded is true when not collapsed', what=f'#{m} grip aria-expanded (expanded)')
        mp = c.js(MAP_JS, m)
        c.eq(round(mp['h'] + up, 1), round(view, 1), 'map height + panel height = view height', tol=2, what=f'#{m} map {mp["h"]:.0f} + panel {up:.0f}')
        c.drag(grip, 700)
        c.settle()
        down = c.box('.f-sheet-panel')
        c.ok(down['h'] >= 44, f'#{m}: collapsed panel is {down["h"]:.0f} px high', 'head only, at least 44 px (the grip stays reachable)')
        c.le(down['h'], 60, 'the collapsed panel is the head line only', what=f'#{m} collapsed height')
        c.eq(c.attr(f'[data-module="{m}"]', 'data-sheet'), 'collapsed', 'data-sheet follows the drag', what=f'#{m} data-sheet')
        c.eq(c.attr(grip, 'aria-expanded'), 'false', 'aria-expanded is false only when collapsed', what=f'#{m} grip aria-expanded (collapsed)')
        g = c.box(grip)
        c.ok(g['shown'] and g['h'] >= 40, f'#{m}: grip box {g["w"]:.0f}x{g["h"]:.0f}', 'the grip stays visible when collapsed')
        mp = c.js(MAP_JS, m)
        c.eq(round(mp['h'] + down['h'], 1), round(view, 1), 'map height + panel height = view height', tol=2, what=f'#{m} map {mp["h"]:.0f} + panel {down["h"]:.0f}')


@case('C5', 'Grip row is the title', 'C', tags=('sheet',), screens=False, langs4=True,
      rule='V3_SPECIFICATION 7.1.6 (user: "J\'aime la proposition de volet de la part de météo")')
def c5(c):
    for m in FIXED:
        c.open(m, flight=True)
        title = c.text('.f-sheet-head .f-sheet-title') or ''
        c.ok(title.startswith(profile_word(m, c.lang)), f'#{m} title {title!r}', f'starts with "{profile_word(m, c.lang)}"')
        low = title.lower()
        c.ok(not any(w in low for w in STATE_WORDS), f'#{m} title {title!r}', 'no state wording (not loaded / loading) in the title')
        c.eq(c.count('.mp-seg'), 0, 'no segmented control row', what=f'#{m} .mp-seg elements')
        extra = c.js("""() => { const p = document.querySelector('.f-sheet-panel'), out = [];
          for (const e of p.children) { if (e.classList.contains('f-sheet-head')) continue; if (!window.__t.shown(e)) continue;
            if (/^H[1-6]$/.test(e.tagName) || /(^|[-_ ])(title|ttl|heading)/.test(e.className)) out.push(e.tagName + '.' + e.className) }
          return out }""")
        c.ok(not extra, f'#{m}: a second title row in the panel: {extra}', 'the grip row is the only title')


@case('C6', 'Close returns to the profile', 'C', tags=('sheet',), screens=False, langs4=True, rule='frame/INTEGRATION 11')
def c6(c):
    for m in FIXED:
        c.open(m, flight=True)
        c.ok(not c.shown('.f-sheet-close'), f'#{m}: the close button is displayed on the profile', 'hidden on the profile')
        if m == 'maps':
            c.tap('.f-ov-left .f-ov-btn')                 # Layers
        else:
            c.tap(c.mark('.f-ov-right .f-ov-btn', tx('modules/atmosphere/texts.js', 'infoTitle', c.lang)))   # Details
        c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what=f'#{m} content opens with a close button')
        c.tap('.f-sheet-close')
        c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what=f'#{m} the close button hides again')
        title = c.text('.f-sheet-head .f-sheet-title') or ''
        c.ok(title.startswith(profile_word(m, c.lang)), f'#{m} title after closing {title!r}', f'starts with "{profile_word(m, c.lang)}"')
