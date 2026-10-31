"""Area E - atmosphere (PLAN.md section E and the guards of section L; modules/atmosphere/SPEC.md, lots of 24 Oct).

Rules covered
  * the buttons over the map and their labels in four languages (E1);
  * nothing written over the map: no hint pill, no text element (E2, L10);
  * the sheet title carries the flight in brief (E3, L10); Details and Flight contents are compact and closable (E4, L7, L9);
  * one "i" only on the page besides the drawing's legend chip (E5, L8); the "tap the map" hint is a notification, once per page
    life (E6, L10); nothing redraws while the sheet is dragged (E7); the cut's window on the distance axis: a pinch, its marks,
    "Vol entier" (E8), kept through a sheet drag (E9); the frame's "?" opens the Weather chapter at the paragraph of the view
    shown (E10); Escape closes the legend and leaves the full screen on (E11).

Cases: E1 E2 E3 E4 E5 E6 E7 E8 E9 E10 E11.  The module is seeded with the planned flight of lib.FLIGHT; no forecast can be read without the
network, so the cases that need data use the module's offline demonstration (`#atmosphere?donnees=demo`) and say so.
"""
import re

from lib import MAP_JS, Fail, Skip, case, norm, tx

T = 'modules/atmosphere/texts.js'
ATM = '[data-module="atmosphere"]'


def row(c, key, **kw):
    return tx(T, key, c.lang, **kw)


def button_sel(c, title_key):
    """Selector (marked) of the overlay button whose title is the module's text `title_key` in the run's language."""
    return c.mark('.f-ov-btn', row(c, title_key))


@case('E1', 'Buttons', 'E', tags=('overlay', 'atmosphere'), screens=False, langs4=True, rule='atmosphere lots of 24 Oct')
def e1(c):
    c.open('atmosphere', flight=True)
    left = [b for b in c.js("[...document.querySelectorAll('.f-ov-left > .f-ov-btn')].map(b => ({ title: b.title, shown: window.__t.shown(b) }))") if b['shown']]
    c.eq([b['title'] for b in left], [row(c, 'layers')], 'left column: the Layers button', what='visible left buttons')
    right = [b for b in c.js("[...document.querySelectorAll('.f-ov-right > .f-ov-btn')].map(b => ({ title: b.title, shown: window.__t.shown(b), full: b.classList.contains('f-ov-full') }))") if b['shown']]
    want = [row(c, 'flightTitle'), row(c, 'infoTitle'), row(c, 'load'), tx('frame/app.js', 'enter', c.lang, after='full: {')]
    # Load carries its cost once known (« Charger (≈ n appels) », E17): compared without it
    loadw = norm(row(c, 'load'))
    got = [loadw if norm(b['title']).startswith(loadw + ' (') else norm(b['title']) for b in right]
    c.eq(got, [norm(w) for w in want], 'right column: Flight, Details, Load, then the frame\'s full screen', what='visible right buttons in order')
    c.ok(right[-1]['full'], 'the last right button is not the full-screen one', 'full screen last')
    c.ok(not c.shown('.at-lvl'), 'the altitude chip is displayed without any grid read', 'hidden until the map\'s grid is read')


@case('E2', 'Nothing written on the map', 'E', tags=('overlay', 'atmosphere'), screens=False, rule='relay\'s review of 24 Oct (L10: no hint pill over the map)')
def e2(c):
    for target in ('atmosphere', 'atmosphere?donnees=demo'):
        c.open(target, flight=True)
        c.wait(2500)
        box = c.js(MAP_JS, 'atmosphere')
        bad = c.js("""(b) => { const out = [], root = document.querySelector('[data-module="atmosphere"]');
          for (const e of root.querySelectorAll('*')) {
            if (e.closest('.f-sheet-panel') || e.closest('.at-map') || /^(STYLE|SCRIPT)$/.test(e.tagName)) continue;
            const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
            if (r.width <= 1 || r.height <= 1 || cs.display === 'none' || cs.visibility === 'hidden') continue;
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            if (cx < b.l || cx > b.r || cy < b.t || cy > b.b) continue;
            if (e.tagName === 'CANVAS' || e.classList.contains('f-ov-btn')) continue;
            if (e.classList.contains('at-box') || e.classList.contains('at-sr')) continue;
            out.push(e.tagName + '.' + e.className + ' ' + (e.textContent || '').trim().slice(0, 40)) }
          return out.slice(0, 4) }""", box)
        c.ok(not bad, f'{target}: elements over the map: {bad}', 'only canvases, the MapLibre container and overlay buttons')
        txt = c.js("""() => { const m = document.querySelector('[data-module="atmosphere"] .at-box'); return [...m.querySelectorAll('*')].filter(e => !e.closest('.at-map') && e.children.length === 0 && (e.textContent || '').trim()
          && window.__t.shown(e)).map(e => e.textContent.trim().slice(0, 40)) }""")
        c.ok(not txt, f'{target}: text over the map: {txt}', 'no text written on the map')


@case('E3', 'Title', 'E', tags=('sheet', 'atmosphere'), screens=False, langs4=True, rule='V3_SPECIFICATION 7.1.6; relay\'s review')
def e3(c):
    c.open('atmosphere', flight=True)
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    word = row(c, 'profileTitle')
    # the departure's time, with its day when it is not today (fmtWhen): the default departure is the next hour, tomorrow after
    # 23:00Z — the case does not depend on the clock
    pat = re.compile(r'^' + re.escape(word) + r' · .+ · \S+ → \S+ · FL\d+ · (?:[^·]+ )?\d\d:\d\dZ')
    c.ok(pat.search(norm(title)) is not None, f'sheet title {title!r}', f'"{word} · <aircraft> · <from> → <to> · FL<level> · [<day>] <HH:MM>Z …"')


def open_view(c, key):
    c.tap(button_sel(c, key))
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='the content opens with a close button')


@case('E4', 'Details and Flight contents', 'E', tags=('sheet', 'atmosphere'), screens=False, langs4=True,
      rule='user "trop gros, pas assez synthétique"; L7, L9: compact list, rows of 44 px at most, never the whole sheet')
def e4(c):
    # -- without data: the forecast-not-loaded message is in the body, not in the title
    c.open('atmosphere', flight=True)
    notloaded = norm(row(c, 'notLoaded')).split('{')[0].strip()[:24]
    open_view(c, 'infoTitle')
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok(norm(title).startswith(norm(row(c, 'infoShort'))), f'Details title {title!r}', f'starts with "{row(c, "infoShort")}"')
    c.ok(notloaded not in norm(title), f'Details title {title!r}', 'no state message in the title')
    c.ok(notloaded in norm(c.text('[data-at="dbody"]') or ''), 'the forecast-not-loaded message is missing from the Details body', 'the message is in the body')
    c.tap('.f-sheet-close')
    c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='✕ closes Details')
    c.ok(norm(c.text('.f-sheet-head .f-sheet-title') or '').startswith(norm(row(c, 'profileTitle'))), 'the profile title did not come back', 'back to the profile')
    open_view(c, 'flightTitle')
    title = c.text('.f-sheet-head .f-sheet-title') or ''
    c.ok(norm(title).startswith(norm(row(c, 'flightTitle'))), f'Flight title {title!r}', f'starts with "{row(c, "flightTitle")}"')
    c.ok(notloaded not in norm(title), f'Flight title {title!r}', 'no state message in the title')
    c.ok(notloaded in norm(c.text('[data-at="dbody"]') or ''), 'the forecast-not-loaded message is missing from the Flight body', 'the message is in the body')
    c.tap('.f-sheet-close')
    c.until("!window.__t.shown(document.querySelector('.f-sheet-close'))", what='✕ closes Flight')
    # -- with the offline demonstration: the summary is a compact list
    c.open('atmosphere?donnees=demo', flight=True)
    c.wait(1500)
    open_view(c, 'infoTitle')
    c.until("!!document.querySelector('[data-at=dbody] dl')", what='the Details summary list (dl) is drawn', timeout=8000)
    rows = c.js("""[...document.querySelectorAll('[data-at=dbody] dl > div')].map(r => ({ h: r.getBoundingClientRect().height, name: !!r.querySelector('dt'), value: !!r.querySelector('dd') }))""")
    c.ge(len(rows), 5, 'a summary of several rows', what='summary rows')
    c.ok(all(r['name'] and r['value'] for r in rows), f'rows without name or value: {rows}', 'each row = a name and a value')
    tall = [round(r['h']) for r in rows if r['h'] > 44.5]
    c.ok(not tall, f'rows taller than 44 px: {tall}', 'every summary row is 44 px high at most')
    c.drag('[data-module="atmosphere"] .f-sheet-grip', -420)                  # expanded
    c.settle()
    panel = c.box('.f-sheet-panel')
    dl = c.box('[data-at=dbody] dl')
    c.le(round(dl['h'] / panel['h'], 3), 0.6, 'the summary list takes at most 60 % of the expanded sheet', what=f'summary {dl["h"]:.0f} px of a {panel["h"]:.0f} px sheet')


@case('E5', 'One "i" only', 'E', tags=('atmosphere',), screens=False, langs4=True,
      rule='L8: user "le double bouton i sert à quoi ?"; § 7.1 rule 14: the frame\'s "i" is gone, the drawing\'s legend behind an "i" chip named "Légende"')
def e5(c):
    for target in ('atmosphere', 'atmosphere?donnees=demo'):
        c.open(target, flight=True)
        c.wait(1200)
        found = c.js("""() => [...document.querySelectorAll('button, [role=button], a')].filter(e => {
          const t = (e.textContent || '').trim(), l = (e.getAttribute('aria-label') || e.title || '').trim();
          return window.__t.shown(e) && (/^(i|ⓘ|ℹ)$/i.test(t) || /^(i|infos?|information)$/i.test(l) || !!e.querySelector('svg[data-i="info"]')) })
          .map(e => e.id || e.className || e.tagName)""")
        # since rule 14 the frame has no "i"; over a drawing, the legend chip is the only one allowed, and it is named
        c.eq([f for f in found if f not in ('fInfo', 'at-chip-i')], [], 'no "i" besides the frame\'s #fInfo and the legend chip', what=f'{target}: "i" buttons')
        legend = c.js("""() => [...document.querySelectorAll('[data-module="atmosphere"] .at-chip-i')].filter(e => window.__t.shown(e))
          .map(e => e.getAttribute('aria-label'))""")
        c.le(len(legend), 1, 'one legend chip at most', what=f'{target}: legend chips {legend}')
        c.eq(all(x and x.lower() not in ('i', 'info', 'infos', 'information') for x in legend), True,
             'the legend chip is named for what it shows (Légende), not "info"', what=f'{target}: legend chip names {legend}')
        c.ok('fInfo' not in found and len(found) <= 1, f'{target}: "i" buttons {found}', 'at most one "i" on the page, and not the frame\'s (#fInfo went with rule 14; the legend chip is the one that may come)')


@case('E6', 'Hint once', 'E', tags=('atmosphere',), screens=False, langs4=True, rule='L10: the hint was a pill written over the map')
def e6(c):
    c.open('atmosphere?donnees=demo', flight=True)               # the hint is said once the forecast is drawn (the demonstration)
    hint = norm(row(c, 'tapNote'))
    c.until("window.__notes.length > 0", timeout=10000, what='the "tap the map" notification appears once the data is drawn')
    c.eq(sum(1 for n in c.note_log() if norm(n) == hint), 1, 'the hint is a notification, said once', what='hint notifications at mount')
    c.go('fuel')
    c.go('atmosphere?donnees=demo')
    c.wait(2500)
    c.eq(sum(1 for n in c.note_log() if norm(n) == hint), 1, 'not repeated when the module is mounted again in the same page life', what='hint notifications after coming back')
    over = c.js("""(t) => [...document.querySelectorAll('[data-module="atmosphere"] .at-box *')].filter(e => !e.closest('.at-map') && window.__t.shown(e)
        && (e.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes(t)).length""", hint[:20])
    c.eq(over, 0, 'the hint is never an element over the map', what='elements over the map carrying the hint')


@case('E7', 'Still during a sheet drag', 'E', tags=('sheet', 'atmosphere'), screens=False,
      rule='user "Déplacer le volet par la poignée fait clignoter et apparaître une zone grise": nothing redraws during the drag, once at settle')
def e7(c):
    c.open('atmosphere?donnees=demo', flight=True)             # a drawing in the sheet and a map: the offline demonstration
    c.until(f"!!document.querySelector('{ATM} .at-dbody svg')", timeout=10000, what='the cross-section is drawn')
    c.settle()
    # instruments: a resize of the map's canvas, a reset of the overlay canvas, a rewrite of the sheet's body
    c.js(f"""() => {{
      const r = document.querySelector('{ATM}'), ev = window.__dragEv = [], over = r.querySelector('canvas.at-over'),
        mc = r.querySelector('.at-map canvas'), body = r.querySelector('.at-dbody');
      for (const k of ['width', 'height']) {{
        const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, k);
        Object.defineProperty(over, k, {{ get() {{ return d.get.call(this) }}, set(v) {{ ev.push('overlay ' + k); d.set.call(this, v) }}, configurable: true }});
      }}
      if (mc) new ResizeObserver(() => window.__dragOn && ev.push('map canvas resized')).observe(mc);
      new MutationObserver(() => window.__dragOn && ev.push('sheet body rewritten')).observe(body, {{ childList: true }});
    }}""")
    g = c.box(f'{ATM} .f-sheet-grip')
    x, y = g['x'] + g['w'] / 2, g['y'] + 10
    c.page.mouse.move(x, y)
    c.page.mouse.down()
    c.js('() => { window.__dragOn = true; window.__dragEv.length = 0 }')
    for i in range(1, 13):                                      # a slow drag down then up, with pauses longer than onSettle
        c.page.mouse.move(x, y + (i if i <= 6 else 12 - i) * 18)
        c.wait(60 if i % 4 else 220)
    during = c.js('() => window.__dragEv.slice()')
    c.page.mouse.up()
    c.js('() => { window.__dragOn = false }')
    c.eq(during, [], 'nothing is redrawn while the finger drags the sheet (map, overlay, drawing)', what='events during the drag')


def _touch(c, kind, pts):
    """One CDP touch event (real pointer events, several fingers at once); no point: the fingers are lifted."""
    s = getattr(c, '_cdp', None)
    if s is None:
        s = c._cdp = c.context.new_cdp_session(c.page)
    s.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i + 1} for i, (x, y) in enumerate(pts)]})


def _pinch(c, cx, cy, d0, d1, steps=8):
    """Two fingers centred on (cx, cy), their distance going from d0 to d1 px, then lifted."""
    pair = lambda d: [(cx - d / 2, cy), (cx + d / 2, cy)]
    _touch(c, 'touchStart', pair(d0))
    for k in range(1, steps + 1):
        _touch(c, 'touchMove', pair(d0 + (d1 - d0) * k / steps))
        c.wait(30)
    _touch(c, 'touchEnd', [])
    c.wait(400)


def _cut_state(c):
    """The cut's window (NM, from data-window), its distance marks and its route-point names."""
    return c.js(f"""() => {{ const b = document.querySelector('{ATM} .at-dbody'), svg = b.querySelector('svg'),
        t = svg ? [...svg.querySelectorAll('text')] : [], w = (b.dataset.window || '').split(',').map(Number);
      return {{ from: w[0], to: w[1], ticks: t.filter(x => /^\\d+$/.test(x.textContent) && x.getAttribute('dominant-baseline') === 'hanging').map(x => +x.textContent),
        whole: !document.querySelector('{ATM} [data-at="whole"]').hidden }} }}""")


def _zoom_cut(c):
    c.open('atmosphere?donnees=demo', flight=True)
    c.until(f"!!document.querySelector('{ATM} .at-dbody svg')", timeout=10000, what='the cross-section is drawn')
    c.settle()
    whole = _cut_state(c)
    # the middle of the visible part of the cut (the bottom bar or a hint may cover its foot)
    x, y = c.js(f"""() => {{ const s = document.querySelector('{ATM} .at-dbody svg'), r = s.getBoundingClientRect(), x = r.left + r.width * .4;
      let y1 = r.top + 20; while (y1 < r.bottom && s.contains(document.elementFromPoint(x, y1 + 4))) y1 += 4;
      return [x, (r.top + y1) / 2] }}""")
    _pinch(c, x, y, 24, 200)
    return whole, _cut_state(c)


@case('E8', 'Cut window: pinch, marks, whole flight', 'E', tags=('sheet', 'atmosphere'), screens=False, langs4=True,
      rule='V3 spec 7.1 rule 20: the same gesture on the weather cut as on the map\'s profile')
def e8(c):
    whole, st = _zoom_cut(c)
    c.ok(whole['from'] == 0 and whole['to'] > 300 and not whole['whole'], f'window {whole}', 'the whole flight, no "whole flight" button, before any gesture')
    span = st['to'] - st['from']
    c.ok(5 <= span < whole['to'] / 4, f'window {st["from"]}..{st["to"]} ({span:.1f} NM)', 'a pinch tightens the cut to a part of the flight (5 NM at least)')
    c.ok(st['ticks'] and all(st['from'] - .01 <= t <= st['to'] + .01 for t in st['ticks']), f'marks {st["ticks"]} in {st["from"]}..{st["to"]}', 'every distance mark is inside the window')
    c.ok(st['whole'], 'the "whole flight" button is not displayed while zoomed', 'a button in the grip row while the window is tight')
    c.eq(c.text(f'{ATM} [data-at="whole"]'), row(c, 'winWhole'), 'its label is in the language of the run', what='button label')
    c.page.locator(f'{ATM} [data-at="whole"]').click()
    c.wait(400)
    back = _cut_state(c)
    c.ok(back['from'] == 0 and abs(back['to'] - whole['to']) < .1 and not back['whole'], f'window {back}', '"Vol entier" gives the whole cut back and hides itself')


@case('E9', 'Cut window: a sheet drag keeps it', 'E', tags=('sheet', 'atmosphere'), screens=False,
      rule='V3 spec 7.1 rules 19 and 20: the window is kept and the cut is not redrawn under the finger while the sheet is dragged')
def e9(c):
    whole, st = _zoom_cut(c)
    c.ok(st['to'] - st['from'] < whole['to'] / 4, f'window {st["from"]}..{st["to"]}', 'the cut is zoomed before the drag')
    c.js(f"""() => {{ const ev = window.__dragEv = []; new MutationObserver(() => window.__dragOn && ev.push('sheet body rewritten'))
      .observe(document.querySelector('{ATM} .at-dbody'), {{ childList: true }}) }}""")
    g = c.box(f'{ATM} .f-sheet-grip')
    x, y = g['x'] + g['w'] / 2, g['y'] + 10
    c.page.mouse.move(x, y)
    c.page.mouse.down()
    c.js('() => { window.__dragOn = true }')
    for i in range(1, 13):
        c.page.mouse.move(x, y + (i if i <= 6 else 12 - i) * 18)
        c.wait(60 if i % 4 else 220)
    during = c.js('() => window.__dragEv.slice()')
    c.page.mouse.up()
    c.js('() => { window.__dragOn = false }')
    c.eq(during, [], 'the zoomed cut is not redrawn while the finger drags the sheet', what='events during the drag')
    c.settle()
    c.wait(400)
    end = _cut_state(c)
    c.eq([round(end['from'], 1), round(end['to'], 1)], [round(st['from'], 1), round(st['to'], 1)], 'the window is the same after the drag', what='window after the drag')


@case('E10', 'A flight dated before today: its weather from its departure, not from today', 'E', tags=('atmosphere',), screens=False,
      designs=('standard',), night=False, rule='user 29 Oct: "pas de météo avant H+56" on a flight of 26 Oct (the days before today were never read)')
def e10(c):
    import copy, datetime
    import lib
    f = copy.deepcopy(lib.FLIGHT)
    f['planned_at'] = (datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=60)).strftime('%Y-%m-%dT%H:00:00Z')
    c.open('atmosphere?donnees=demo', docs=[['pilot/ABC/current_flight.json', f, 'document']])
    c.until(f"() => !!document.querySelector('{ATM} [data-at=whenOut]') && /[0-9]/.test(document.querySelector('{ATM} [data-at=whenOut]').textContent)",
            timeout=10000, what='the time line')
    c.wait(1500)
    out = c.js(f"""() => {{ const o = document.querySelector('{ATM} [data-at=whenOut]'), b = document.querySelector('{ATM} [data-at=cover]');
      return [o.className, o.textContent, b ? b.hidden : null] }}""")
    c.ok('at-out' not in out[0] and '⚠' not in out[1], f'{out}', 'the planned departure 60 h ago is inside the forecast read (no ⚠)')
    c.eq(out[2], True, 'the slider is covered from its start: no band of covered hours', what='covered band hidden')


_TRAJ_JS = """async () => { const A = await import('/modules/atmosphere/atmo.js');
  const pts = [{ id: 'A', lat: 45, lon: 0 }, { id: 'B', lat: 45, lon: 4.2 }], total = A.trajectory(pts, { levelFt: 30000 }).total;
  const path = [{ nm: 0, ft: 0 }, { nm: 40, ft: 20000 }, { nm: 60, ft: 20000 }, { nm: 80, ft: 30000 }, { nm: total - 50, ft: 30000 }, { nm: total, ft: 0 }];
  const t1 = A.trajectory(pts, { levelFt: 30000, path, cruiseKt: 300 }), t0 = A.trajectory(pts, { levelFt: 30000, cruiseKt: 300 }),
    tw = A.trajectory(pts, { levelFt: 30000, cruiseKt: 300, headAt: () => 30 });
  return { total, at50: t1.computed(50), at70: t1.computed(70), free50: t0.computed(50), toc: t1.toc,
    m0: t0.minutesAt(total), mw: tw.minutesAt(total) } }"""


@case('E11', 'The cut follows Fuel’s vertical path, and its times the ground speed', 'E', tags=('atmosphere',), screens=False,
      designs=('standard',), night=False,
      rule='user 29 Oct: "la coupe météo ignore les altitudes imposées … 30 kt de face = 30 kt de vitesse sol en moins"')
def e11(c):
    c.open('atmosphere?donnees=demo', flight=True)
    r = c.js(_TRAJ_JS)
    c.eq(round(r['at50']), 20000, 'a constraint step of profile.path (20 000 ft from 40 to 60 NM) is kept by the cut', what='altitude at 50 NM')
    c.ok(r['at70'] > 20000 and r['at70'] < 30000, f'{r["at70"]}', 'and the climb resumes after it')
    c.ok(abs(r['free50'] - r['at50']) > 1000, f'{r["free50"]} without the path', 'without the path the cut takes its own climb (the difference the path makes)')
    c.ok(r['toc'] is not None and r['toc'] > 75, f'{r["toc"]}', 'the top of climb is where the path reaches its highest level')
    c.ok(r['mw'] > r['m0'] * 1.05, f'{r["m0"]:.1f} min without wind, {r["mw"]:.1f} with 30 kt on the nose', 'a headwind lengthens the times (ground speed)')


_POP = f'{ATM} .at-layerpop'
_CUT = f"() => {{ const s = document.querySelector('{ATM} [data-at=dbody] svg'); return s ? s.outerHTML.length : 0 }}"


@case('E12', 'Layers: a panel over the map, the cut stays in view and follows each box at once', 'E', tags=('atmosphere',), screens=False,
      designs=('standard',), night=False,
      rule='user 29 Oct: "choisir les éléments météo masque le profil vertical. Certaines coches doivent être cliquées deux fois" — the Layers panel sits over the map under its button, the cut stays in the sheet and is redrawn by each box, one tap = one toggle (the panel is not rewritten between press and release)')
def e12(c):
    c.open('atmosphere?donnees=demo', flight=True)
    c.until(f"() => !!document.querySelector('{ATM} [data-at=dbody] svg')", timeout=12000, what='the cut is drawn (demonstration)')
    c.wait(800)
    c.tap(button_sel(c, 'layers'))
    c.until(f"window.__t.shown(document.querySelector('{_POP}'))", what='the Layers panel opens')
    c.ok(c.shown(f'{ATM} [data-at=dbody] svg'), 'the cut is no longer shown', 'the cut stays in the sheet while the panel is open')
    pop, box, panel = c.box(_POP), c.box(f'{ATM} .at-box'), c.box(f'{ATM} .f-sheet-panel')
    c.ok(pop['y'] >= box['y'] - 1 and pop['y'] + pop['h'] <= box['y'] + box['h'] + 1, f'panel {pop}, map {box}', 'the panel lies within the map')
    c.ok(pop['y'] + pop['h'] <= panel['y'] + 1, f'panel bottom {pop["y"] + pop["h"]:.0f}, sheet top {panel["y"]:.0f}', 'the panel never covers the sheet')
    c.eq(c.attr(button_sel(c, 'layers'), 'aria-pressed'), 'true', 'the Layers button is pressed', what='aria-pressed')
    # one tap, one toggle, the cut redrawn at once, the panel's boxes kept (not rewritten)
    c.js(f"() => document.querySelectorAll('{_POP} input[data-g]').forEach(i => {{ i.__kept = 1 }})")
    for k in ('wind', 'iso', 'cloud'):
        sel = f'{_POP} input[data-g=xsLayers][data-k={k}]'
        before, cut = c.js(f"() => document.querySelector('{sel}').checked"), c.js(_CUT)
        c.tap(f'{_POP} label:has(input[data-g=xsLayers][data-k={k}])')
        c.until(f"(b) => document.querySelector('{sel}').checked !== b", before, timeout=3000, what=f'one tap toggles "{k}"')
        c.wait(400)
        c.ok(c.js(_CUT) != cut, f'cut length {cut} -> {c.js(_CUT)}', f'the cut is redrawn by "{k}", the panel still open')
        c.ok(c.shown(_POP), 'the panel closed', 'the panel stays open')
    c.ok(c.js(f"() => [...document.querySelectorAll('{_POP} input[data-g]')].every(i => i.__kept === 1)"), 'the boxes were rebuilt',
         'the panel is not rewritten by a box (its boxes are the same nodes)')
    # the cross and Escape close it; Flight closes it too
    c.tap(f'{_POP} [data-at=layersClose]')
    c.until(f"!window.__t.shown(document.querySelector('{_POP}'))", what='the cross closes the panel')
    c.tap(button_sel(c, 'layers'))
    c.until(f"window.__t.shown(document.querySelector('{_POP}'))", what='open again')
    c.page.keyboard.press('Escape')
    c.until(f"!window.__t.shown(document.querySelector('{_POP}'))", what='Escape closes the panel')
    c.tap(button_sel(c, 'layers'))
    c.until(f"window.__t.shown(document.querySelector('{_POP}'))", what='open again')
    c.tap(button_sel(c, 'flightTitle'))
    c.until(f"!window.__t.shown(document.querySelector('{_POP}'))", what='Flight takes the sheet and closes the panel')


def _help_at(c, anchor):
    """The frame's "?" asks the Weather chapter at `anchor`; the paragraph is in the manual of the run's language and highlighted."""
    c.tap('#fHelp')
    c.until("location.hash.startsWith('#help')", what='the help screen opens')
    c.eq(c.hash(), f'#help?m=atmosphere&a={anchor}', 'the "?" asks the Weather chapter at the paragraph of the view shown', what='help address')
    c.until("(a) => !!document.querySelector('.f-screen [id=\"' + a + '\"]')", anchor, timeout=8000, what=f'the anchor {anchor} is in the manual')
    c.until("(a) => document.querySelector('.f-screen [id=\"' + a + '\"]').closest('p, li, h1, h2, h3').classList.contains('f-hl')", anchor,
            what='the paragraph is highlighted on arrival')


@case('E13', 'Help lands on the view\'s paragraph', 'E', tags=('atmosphere', 'help'), screens=False, langs4=True, designs=('standard',), night=False,
      rule='V3_SPECIFICATION 7.1 rule 16 (user, 25 Oct: "bien vérifier que l\'aide contextuelle arrive sur le bon paragraphe"); meta.help true')
def e13(c):
    c.open('atmosphere')
    c.until(f"!!document.querySelector('{ATM} [data-at=\"seeExample\"]')", timeout=10000, what='the page says there is no flight')
    _help_at(c, 'atmosphere-flight')
    whole, st = _zoom_cut(c)
    c.ok(st['whole'], f'window {st["from"]}..{st["to"]}', 'the cut is zoomed')
    _help_at(c, 'atmosphere-zoom')
    for setup, anchor in ((None, 'atmosphere-cut'), ('legend', 'atmosphere-legend'), ('infoTitle', 'atmosphere-details'),
                          ('flightTitle', 'atmosphere-settings'), ('layers', 'atmosphere-map')):
        c.open('atmosphere?donnees=demo', flight=True)
        c.until(f"!!document.querySelector('{ATM} .at-dbody svg')", timeout=10000, what='the cross-section is drawn')
        c.settle()
        if setup == 'legend':
            c.tap(f'{ATM} [data-at="legendBtn"]')
            c.until(f"!!document.querySelector('{ATM} .at-legend:not([hidden])')", what='the legend is shown')
        elif setup == 'layers':
            # the Layers are a panel over the map (E12), not a content of the sheet: no close button in the head
            c.tap(button_sel(c, 'layers'))
            c.until(f"window.__t.shown(document.querySelector('{ATM} .at-layerpop'))", what='the Layers panel opens')
        elif setup:
            open_view(c, setup)
        _help_at(c, anchor)


@case('E14', 'Escape closes the legend only', 'E', tags=('atmosphere', 'overlay'), screens=True, designs=('standard',), night=False,
      rule='frame/INTEGRATION.md 9.4: Escape closes the innermost first; a module that closes something calls preventDefault')
def e14(c):
    c.open('atmosphere?donnees=demo', flight=True)
    c.until(f"!!document.querySelector('{ATM} .at-dbody svg')", timeout=10000, what='the cross-section is drawn')
    c.settle()
    c.tap('.f-ov-full')
    c.until("document.documentElement.classList.contains('f-full')", what='full screen on')
    c.tap(f'{ATM} [data-at="legendBtn"]')
    c.until(f"!!document.querySelector('{ATM} .at-legend')", what='the legend is shown')
    c.key('Escape')
    c.until(f"!document.querySelector('{ATM} .at-legend')", what='Escape closes the legend')
    c.ok(c.js("document.documentElement.classList.contains('f-full')"), 'the same Escape also left the full screen',
         'the full screen stays: the module consumed the key')
    c.key('Escape')
    c.until("!document.documentElement.classList.contains('f-full')", what='a second Escape leaves the full screen')


# ------------------------------------------------------------------------------------------------------ E17
@case('E17', '"Load" says what it would cost, asking nothing', 'E', tags=('atmosphere', 'overlay'), screens=False, langs4=True,
      designs=('standard',), night=False,
      rule='lot 0 gap § 14, closed 31 Oct (ergonomics session; ctx.weather.cost of V3 Frame d9609bd7f): "Load (≈ n calls)" before any call')
def e17(c):
    c.open('atmosphere', flight=True)
    want = norm(row(c, 'loadCost')).split('(')[0].strip()   # « Charger », the words before the cost
    c.until("(w) => { const b = [...document.querySelectorAll('.f-ov-right .f-ov-btn')].find(x => /\\d/.test(x.title || '')); return !!b }", want,
            timeout=8000, what='the Load button says its cost')
    title = c.js("() => [...document.querySelectorAll('.f-ov-right .f-ov-btn')].map(x => x.title).find(t => /\\d/.test(t))")
    n = int(''.join(ch for ch in title.split('≈')[-1] if ch.isdigit()) or 0)
    c.ok(n > 0 and norm(title).startswith(want), f'title {title!r}', '"Load (≈ n calls)" with n > 0: nothing is on the device yet')
    c.eq(norm(c.js("() => [...document.querySelectorAll('.f-ov-right .f-ov-btn')].map(x => x.getAttribute('aria-label')).find(t => /\\d/.test(t || ''))") or ''),
         norm(title), 'screen readers hear the same', what='aria-label')
    open_view(c, 'flightTitle')
    c.until("(t) => (document.querySelector('[data-module=\"atmosphere\"] form button[type=submit]') || {}).textContent === t", title,
            timeout=5000, what='the Flight form says the same')
    # the demonstration asks nothing: "Load" alone
    c.open('atmosphere?donnees=demo', flight=True)
    c.until(f"!!document.querySelector('{ATM} [data-at=dbody] svg')", timeout=12000, what='the cut is drawn (demonstration)')
    c.ok(not c.js("() => [...document.querySelectorAll('.f-ov-right .f-ov-btn')].some(x => /≈/.test(x.title || ''))"),
         'a cost is said in the demonstration', 'the demonstration costs nothing: "Load" alone')
