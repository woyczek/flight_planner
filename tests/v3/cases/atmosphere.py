"""Area E - atmosphere (PLAN.md section E and the guards of section L; modules/atmosphere/SPEC.md, lots of 24 Oct).

Rules covered
  * the buttons over the map and their labels in four languages (E1);
  * nothing written over the map: no hint pill, no text element (E2, L10);
  * the sheet title carries the flight in brief (E3, L10); Details and Flight contents are compact and closable (E4, L7, L9);
  * one "i" only on the page, the frame's (E5, L8); the "tap the map" hint is a notification, once per page life (E6, L10).

Cases: E1 E2 E3 E4 E5 E6.  The module is seeded with the planned flight of lib.FLIGHT; no forecast can be read without the
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
    c.eq([norm(b['title']) for b in right], [norm(w) for w in want], 'right column: Flight, Details, Load, then the frame\'s full screen', what='visible right buttons in order')
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
    pat = re.compile(r'^' + re.escape(word) + r' · .+ · \S+ → \S+ · FL\d+ · \d\d:\d\dZ')
    c.ok(pat.search(norm(title)) is not None, f'sheet title {title!r}', f'"{word} · <aircraft> · <from> → <to> · FL<level> · <HH:MM>Z …"')


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


@case('E5', 'One "i" only', 'E', tags=('atmosphere',), screens=False, langs4=True, rule='L8: user "le double bouton i sert à quoi ?"; rule 14: the frame\'s "i" is gone, the legend chip may be the one')
def e5(c):
    for target in ('atmosphere', 'atmosphere?donnees=demo'):
        c.open(target, flight=True)
        c.wait(1200)
        found = c.js("""() => [...document.querySelectorAll('button, [role=button], a')].filter(e => {
          const t = (e.textContent || '').trim(), l = (e.getAttribute('aria-label') || e.title || '').trim();
          return window.__t.shown(e) && (/^(i|ⓘ|ℹ)$/i.test(t) || /^(i|infos?|information)$/i.test(l) || !!e.querySelector('svg[data-i="info"]')) })
          .map(e => e.id || e.className || e.tagName)""")
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
