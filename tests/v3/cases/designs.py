"""Area H - designs (PLAN.md section H; frame/design/*).

Rules covered
  * every design resolves the tokens the primitives read (H1);
  * the header name is readable over the header in day and night (H2, WCAG 4.5:1);
  * the overlay buttons are round in standard, cupertino and material, square in metro and swiss (H3);
  * the design mock-up pages load without error (H4);
  * Aqua, the design kept for computers (frame/design/aqua.css): on a computer it is offered, applied, textured and its header
    readable day and night (H5); on a phone it is neither offered nor applied, the device's choice is kept, and not one of its
    images is fetched (H6).

Cases: H1 H2 H3 H4 H5 H6.  Aqua is not in the five designs every case runs in (it never shows on a phone): H5 and H6 seed it.  Note on H1: the plan names `--sog-ink`; the token set of frame/design/tokens.css has no such name, the
text colour is `--sog-fg`, which is what is checked (and `--sog-ink` is not required).
"""
from urllib.parse import urlparse

from lib import Fail, Skip, case, png_rgb

TOKENS = ('--sog-surface', '--sog-fg', '--sog-accent', '--sog-radius')
RADIUS = {'standard': 'round', 'cupertino': 'round', 'material': 'round', 'metro': 'square', 'swiss': 'square'}


@case('H1', 'Tokens resolved', 'H', tags=('design',), screens=False, rule='frame/design/tokens.css: a design sets every token')
def h1(c):
    c.open('fuel')
    missing = [t for t in TOKENS if not c.var(t)]
    c.ok(not missing, f'empty on :root in {c.design}: {missing}', 'every token resolves to a value')


CONTRAST_JS = """() => {
  const parse = s => { const m = /rgba?\\(([^)]+)\\)/.exec(s); if (!m) return null; const p = m[1].split(/[,\\s\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) };
  // effective background: composite the translucent layers from the element up to the body, over white
  const bg = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break } }
    let base = { r: 255, g: 255, b: 255 }; for (const c of layers.reverse()) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) }; return base };
  const name = document.getElementById('fName'), fg = parse(getComputedStyle(name).color), b = bg(name);
  const L1 = lum({ r: fg.r, g: fg.g, b: fg.b }), L2 = lum(b), hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return { ratio: (hi + 0.05) / (lo + 0.05), fg: getComputedStyle(name).color, bg: `rgb(${Math.round(b.r)}, ${Math.round(b.g)}, ${Math.round(b.b)})`, tone: document.documentElement.dataset.tone || '' } }"""


@case('H2', 'Contrast of header text', 'H', tags=('design',), screens=False, rule='frame/design DECISIONS contrasts (WCAG AA 4.5:1)')
def h2(c):
    for tone in ('day', 'night'):
        c.open('fuel', tone=tone)
        r = c.js(CONTRAST_JS)
        c.ge(round(r['ratio'], 2), 4.5, f'header name {r["fg"]} over {r["bg"]}', what=f'{c.design} {tone}: contrast ratio')


def radius_px(v, w, h):
    """A computed border-radius (`0px`, `22px`, `50%`, `min(50%, 132px)`) in px for a w x h box."""
    v = v.strip().split(' ')[0] if not v.startswith('min(') else v.strip()
    if v.startswith('min('):
        return min(radius_px(a, w, h) for a in v[4:-1].split(','))
    return float(v[:-1]) / 100 * min(w, h) if v.endswith('%') else float(v.replace('px', ''))


@case('H3', 'Overlay button shape', 'H', tags=('design', 'overlay'), screens=False, rule='frame lot, judgement call 3 (round buttons, square in metro and swiss)')
def h3(c):
    c.open('maps', flight=True)
    r = c.js("""() => { const b = [...document.querySelectorAll('.f-ov-btn')].find(b => window.__t.shown(b)); const cs = getComputedStyle(b), r = b.getBoundingClientRect();
        return { v: cs.borderTopLeftRadius, w: r.width, h: r.height } }""")
    v = r['v']
    px = radius_px(v, r['w'], r['h'])
    if RADIUS[c.design] == 'round':
        c.ge(round(px, 1), 22, f'{c.design}: border-radius {v}', what='overlay button radius in px')
    else:
        c.eq(round(px, 1), 0, f'{c.design} has square overlay buttons', what=f'border-radius {v}')


@case('H4', 'Demo pages', 'H', tags=('design',), designs=('standard',), rule='design mock-up pages')
def h4(c):
    import glob
    from lib import ROOT
    pages = sorted(p.name for p in (ROOT / 'frame' / 'design').glob('demo_*.html'))
    if not pages:
        raise Skip('no frame/design/demo_*.html page in this tree')
    for p in pages:
        c.errors.clear()
        c.page.goto(f'{c.base}/frame/design/{p}', wait_until='load')
        c.wait(800)
        c.ok(c.js('document.body && document.body.innerText.length > 50'), f'{p} is empty at {c.width}', 'the mock-up page draws')
        c.check_errors()


AQUA = [['device/design.json', {'design': 'aqua', 'tone': 'day'}, 'cache']]
OFFERED_JS = """() => !!document.querySelector('[data-design-pick="aqua"]')"""      # the Design card of Settings


PAGE_TEXT_JS = """() => {
  // text of the view that is not inside a card, a bar or a list (it sits on the page, so on the panel): the first two shown
  const inBox = e => e.closest('.f-card, .f-bar, .f-tiles, .f-list, .f-callout, .f-sheet, button, details');
  const els = [...document.querySelectorAll('#fView :is(h1, h2, p)')].filter(e => window.__t.shown(e) && !inBox(e) && e.textContent.trim()).slice(0, 2);
  return els.map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    e.dataset.h5 = '1'; return { x: r.left, y: r.top, w: Math.min(r.width, 400), h: r.height, fg: cs.color, tag: e.tagName } }) }"""


def _lum(c):
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (x / 255 for x in c[:3])
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def panel_contrast(c):
    """Worst contrast between the page text (not in a card) and the pixels behind it: the text is made transparent, its
    boxes are shot and every 4th pixel compared with the text colour.  Returns (ratio, description)."""
    import re as _re
    texts = c.js(PAGE_TEXT_JS)
    if not texts:
        raise Skip('no text on the page outside the cards')
    c.js("() => document.querySelectorAll('[data-h5]').forEach(e => e.style.color = 'transparent')")
    data = c.page.screenshot(scale='css')
    c.js("() => document.querySelectorAll('[data-h5]').forEach(e => e.style.color = '')")
    worst, what = 99, ''
    for t in texts:
        fg = tuple(int(v) for v in _re.findall(r'[\d.]+', t['fg'])[:3])
        pts = [(int(t['x'] + i), int(t['y'] + j)) for i in range(0, int(t['w']), 4) for j in range(0, int(t['h']), 4)]
        for px in png_rgb(data, pts):
            a, b = sorted((_lum(fg), _lum(px)))
            r = (b + 0.05) / (a + 0.05)
            if r < worst:
                worst, what = r, f'{t["tag"]} {t["fg"]} over rgb{px}'
    return round(worst, 2), what


def aqua_requests(c):
    """Starts recording the requests for Aqua's images (frame/design/aqua/); returns the list it fills."""
    seen = []
    c.page.on('request', lambda r: seen.append(urlparse(r.url).path) if '/frame/design/aqua/' in r.url else None)
    return seen


@case('H5', 'Aqua on a computer', 'H', tags=('design', 'aqua'), phone=False, rule='frame/design/SPEC.md § 3 (aqua: computers only)')
def h5(c):
    seen = aqua_requests(c)
    for tone in ('day', 'night'):
        c.open('fuel', docs=[['device/design.json', {'design': 'aqua', 'tone': tone}, 'cache']])
        h = c.js("() => ({ design: document.documentElement.dataset.design, desk: document.documentElement.classList.contains('f-desk') })")
        c.ok(h['desk'], f'html.f-desk absent at {c.width} with a mouse', 'the frame marks a computer (INTEGRATION § 9.1)')
        c.eq(h['design'], 'aqua', what=f'design applied on a computer ({tone})')
        r = c.js(CONTRAST_JS)
        c.ge(round(r['ratio'], 2), 4.5, f'header name {r["fg"]} over {r["bg"]}', what=f'aqua {tone}: contrast ratio')
    c.ok(any(p.endswith('/brushed.webp') for p in seen), f'requests: {seen}', 'the brushed metal of the header and rail is drawn')
    # text set on the page itself (not in a card) over the module's panel: worst pixel behind it, day and night
    for target, tone in (('fuel', 'day'), ('fuel', 'night'), ('settings', 'day'), ('settings', 'night')):
        c.open(target, docs=[['device/design.json', {'design': 'aqua', 'tone': tone}, 'cache']])
        c.ok(any(f'/aqua/{tone}/{target}.webp' in p for p in seen), f'requests: {seen[-4:]}', f'the {target} panel ({tone}) is drawn')
        ratio, what = panel_contrast(c)
        c.ge(ratio, 4.5, f'{target} {tone}: {what}', what='contrast of page text over the panel (worst pixel)')
    c.open('settings', docs=AQUA)
    c.ok(c.js(OFFERED_JS), 'no "Aqua" in the Design card', 'Aqua offered on a computer')


@case('H6', 'Aqua kept off a phone', 'H', tags=('design', 'aqua'), screens=False, designs=('standard',),
      rule='frame/design/SPEC.md § 3 (aqua: nothing skeuomorphic on a phone)')
def h6(c):
    seen = aqua_requests(c)
    c.open('settings', docs=AQUA)
    h = c.js("() => ({ design: document.documentElement.dataset.design, desk: document.documentElement.classList.contains('f-desk'),"
             " mirror: localStorage.getItem('sogFrame:design') })")
    c.ok(not h['desk'], 'html.f-desk on a phone', 'no f-desk at 390 with touch')
    c.eq(h['design'], 'standard', what='design applied on a phone with aqua chosen')
    c.ok('"aqua"' in (h['mirror'] or ''), f'mirror {h["mirror"]}', "the device's choice (aqua) is kept")
    c.ok(not c.js(OFFERED_JS), '"Aqua" offered in the Design card', 'Aqua not offered on a phone')
    c.go('fuel')
    c.wait(6000)                                  # late loads (the help, the precache) included
    c.eq(seen, [], what='requests for frame/design/aqua/ on a phone')

