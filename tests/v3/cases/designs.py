"""Area H - designs (PLAN.md section H; frame/design/*).

Rules covered
  * every design resolves the tokens the primitives read (H1);
  * the header name is readable over the header in day and night (H2, WCAG 4.5:1);
  * the overlay buttons are round in standard, cupertino and material, square in metro and swiss (H3);
  * the design mock-up pages load without error (H4).

Cases: H1 H2 H3 H4.  Note on H1: the plan names `--sog-ink`; the token set of frame/design/tokens.css has no such name, the
text colour is `--sog-fg`, which is what is checked (and `--sog-ink` is not required).
"""
from lib import Fail, Skip, case

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
