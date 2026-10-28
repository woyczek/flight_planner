"""Area D - maps, the cases added with the recode of 28 Oct 2026 (PLAN.md D30-D38; modules/maps/SPEC.md as rewritten).

Rules covered
  * the Edit mode writes the route by merging: the moved point loses its wind, the others keep wind and airway, the procedures
    of the same aerodromes are kept, nothing outside route and level is touched; Undo; "+" inserts and disarms (D30);
  * the ETA and the planned position are derived (frame/lib/current_flight.js), "started" is started.at (D31);
  * a route across the date line (D32); a mission map from the synthetic fixture (D33); the plain background (D34);
  * the device's settings kept per mode, only the differences (D35); Escape closes one thing at a time (D36);
  * the base map's place names hidden under our towns (D37); the module's benches (D38).

Coordinates on the map come from MapLibre itself: the case wraps `Map.prototype.project` once to keep the map the module draws
with (`window.__mpMap`), then asks it where a position is.  Texts drawn on the canvas are read by wrapping `fillText`.
"""
import datetime
import json
import math
import re

from lib import FLIGHT, ROOT, STUB_STYLE, Fail, Skip, case, norm, tx

M = 'modules/maps/texts.js'
TRI = 'ABC'
PATH = f'pilot/{TRI}/current_flight.json'
COORD = re.compile(r'^\d{4}[NS]\d{5}[EW]$')


def row(c, key, **kw):
    return tx(M, key, c.lang, **kw)


def iso(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')


def now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)


def flight(**over):
    """The flight of lib.FLIGHT with `over` merged at the top level (a copy)."""
    f = json.loads(json.dumps(FLIGHT))
    f['updated_at'] = iso(now())
    f.update(over)
    return f


def fdocs(f):
    return [['device/identity.json', {'trigram': TRI}, 'cache'], [PATH, f, 'document']]


_HOOK_JS = """() => {
  const M = window.maplibregl?.Map;
  if (!M) return false;
  if (!M.prototype.__mpHook) {
    const o = M.prototype.project;
    M.prototype.project = function (...a) { window.__mpMap = this; return o.apply(this, a) };
    M.prototype.__mpHook = true;
  }
  return !!window.__mpMap;
}"""
_XY_JS = """([lat, lon]) => { const m = window.__mpMap, c = m.getCenter().lng, l = lon + 360 * Math.round((c - lon) / 360),
  p = m.project([l, lat]), r = m.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y] }"""
_TEXTS_JS = """() => { if (!CanvasRenderingContext2D.prototype.__mpText) { const o = CanvasRenderingContext2D.prototype.fillText;
  window.__mpTexts = []; CanvasRenderingContext2D.prototype.fillText = function (t, x, y, w) { if (window.__mpTexts.length > 5000) window.__mpTexts.splice(0, 2500);
  window.__mpTexts.push(String(t)); return o.call(this, t, x, y, w) }; CanvasRenderingContext2D.prototype.__mpText = true } window.__mpTexts = []; return true }"""


def hook_map(c):
    """Keeps the MapLibre map the module draws with (window.__mpMap): wraps project, then Recentre makes it draw."""
    c.until("!!window.maplibregl", timeout=10000, what='MapLibre is loaded')
    c.js(_HOOK_JS)
    c.tap('[data-mp="fit"]')
    c.until("!!window.__mpMap", timeout=6000, what='the module draws with a MapLibre map')
    c.wait(600)


def xy(c, lat, lon):
    return c.js(_XY_JS, [lat, lon])


def texts(c, prefix):
    """Texts drawn on canvases since the hook, starting with `prefix` (spaces collapsed)."""
    return [norm(t) for t in c.js('window.__mpTexts || []') if norm(t).startswith(prefix)]


def mouse_drag(c, a, b, steps=12):
    m = c.page.mouse
    m.move(*a)
    m.down()
    for i in range(1, steps + 1):
        m.move(a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps)
        c.wait(25)
    m.up()


def esc_key(c):
    """Escape on the document; True when the module took it (defaultPrevented)."""
    return c.js("""() => { const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        document.activeElement && document.activeElement !== document.body ? document.activeElement.dispatchEvent(e) : document.dispatchEvent(e);
        return e.defaultPrevented }""")


# ------------------------------------------------------------------------------------------------------ D30
_SID = {'icao': 'LFRS', 'kind': 'SID', 'name': 'XX1A', 'status': 'ofp',
        'points': [{'id': 'LFRS', 'lat': 47.1569, 'lon': -1.6078}, {'id': 'XXS1', 'lat': 46.9, 'lon': -1.45}]}
_STAR_OTHER = {'icao': 'LFMT', 'kind': 'STAR', 'name': 'XX2B', 'status': 'ofp',
               'points': [{'id': 'XXT1', 'lat': 43.7, 'lon': 4.2}, {'id': 'LFMT', 'lat': 43.5762, 'lon': 3.963}]}


@case('D30', 'Edit mode writes the route by merging', 'D', tags=('overlay', 'maps'), screens=False, designs=('standard',),
      rule='maps SPEC § 12: route merged, procedures of the same aerodromes kept, wind of the moved point dropped, Undo, "+"')
def d30(c):
    f = flight()
    pts = f['route']['points']
    for i, p in enumerate(pts):
        p['wind'] = {'dirDeg': 270, 'kt': 30 + i, 'tempC': -20, 'levelFt': 27000, 'at': '2026-10-24T10:00:00Z'}
    pts[1]['via'] = 'UN460'
    pts[2]['alt_ft'] = 31000
    f['route']['procedures'] = {'sid': _SID, 'star': _STAR_OTHER}    # the STAR is another aerodrome's: dropped at the first write
    f['quote'] = {'minutes': 80, 'block': 4000, 'unit': 'kg'}
    f['progress'] = {'phase': None, 'at': '2026-10-24T10:00:00Z'}
    c.open('maps', docs=fdocs(f), flight=False)
    c.ready('maps', sheet=True)
    hook_map(c)
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit becomes pressed')
    # SPEC § 4: in Edit mode the column is Edit, "+", Undo, Recentre and the frame's full screen
    shown = c.js("""[...document.querySelectorAll('.f-ov-right > .f-ov-btn')].filter(b => window.__t.shown(b)).map(b => b.dataset.mp || 'full')""")
    c.eq(sorted(shown), sorted(['fit', 'edit', 'add', 'undo', 'full']), 'Edit mode keeps five buttons (route, mode and Follow hidden)', what='right column in Edit mode')
    a = xy(c, 44.9, 2.4)                                   # NEPIX
    mouse_drag(c, a, (a[0] + 45, a[1] + 35))
    doc = c.until_doc(PATH, lambda d: d and d.get('by') == 'maps' and COORD.match(d['route']['points'][2]['id'] or ''), what='the moved point written',
                      timeout=5000)
    r = doc['route']
    moved = r['points'][2]
    c.ok('wind' not in moved, f'moved point {moved}', 'the moved point loses its wind')
    c.eq(moved.get('alt_ft'), 31000, 'the moved point keeps its level step', what='alt_ft of the moved point')
    c.ok(all('wind' in p for i, p in enumerate(r['points']) if i != 2), 'a point left intact lost its wind', 'the other points keep their wind')
    c.eq(r['points'][1].get('via'), 'UN460', 'a point left intact keeps its airway (via)', what='via of LUGEN')
    c.ok(COORD.match(moved['id']) and moved['id'] in r['text'], f'route.text {r["text"]!r}', 'route.text rebuilt with the ICAO coordinates')
    c.eq(r.get('from'), 'points', 'route.from is "points"', what='route.from')
    c.eq((r.get('procedures') or {}).get('sid', {}).get('name'), 'XX1A', 'the SID of the departure is kept', what='procedures.sid')
    c.eq((r.get('procedures') or {}).get('star'), None, 'the STAR of another aerodrome is dropped', what='procedures.star')
    c.eq(doc.get('quote'), f['quote'], 'quote untouched', what='quote')
    c.eq(doc.get('profile'), f['profile'], 'profile untouched (fuel requotes)', what='profile')
    c.eq(doc.get('progress'), f['progress'], 'progress untouched', what='progress')
    c.ok(all(-180 <= p['lon'] < 180 for p in r['points']), 'a longitude outside [-180, 180[', 'longitudes written wrapped')
    # Undo: points back
    c.until("!document.querySelector('[data-mp=undo]').disabled", what='Undo enabled after a gesture')
    c.tap('[data-mp="undo"]')
    c.until_doc(PATH, lambda d: d['route']['points'][2]['id'] == 'NEPIX', what='Undo written back', timeout=5000)
    # "+" armed: the next tap inserts where the route lengthens least, then disarms
    c.tap('[data-mp="add"]')
    c.eq(c.attr('[data-mp="add"]', 'aria-pressed'), 'true', '"+" is pressed while armed', what='"+" aria-pressed')
    p0, p1 = xy(c, 46.5833, -1.2), xy(c, 44.9, 2.4)      # LUGEN → NEPIX, the longest leg
    c.page.mouse.click((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 25)    # 25 px north of its middle, away from the points
    d2 = c.until_doc(PATH, lambda d: len(d['route']['points']) == 5, what='a point inserted', timeout=5000)
    ids = [p['id'] for p in d2['route']['points']]
    new = next((i for i, p in enumerate(d2['route']['points']) if COORD.match(p['id'] or '')), None)
    ps = [(p['lat'], p['lon']) for p in d2['route']['points']]
    if new is not None:                                    # where it lengthens the route least, among the legs of the route before
        old = ps[:new] + ps[new + 1:]
        extra = [_gc(old[i], ps[new]) + _gc(ps[new], old[i + 1]) - _gc(old[i], old[i + 1]) for i in range(len(old) - 1)]
        c.eq(new, extra.index(min(extra)) + 1, 'the point goes into the leg it lengthens least', what=f'insertion rank in {ids}')
    c.ok(new is not None, f'points {ids}', 'a free point named by its ICAO coordinates')
    c.eq(c.attr('[data-mp="add"]', 'aria-pressed'), 'false', '"+" disarms after one insertion', what='"+" aria-pressed after the tap')
    # leaving the mode
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'false'", what='Edit released')


# ------------------------------------------------------------------------------------------------------ D31
def _legs_flight(start=None, planned=None, **over):
    f = flight(**over)
    f['quote'] = {'minutes': 80, 'block': 4000, 'unit': 'kg', 'taxiMin': 12,
                  'legs': [{'id': 'LFRS', 'min': 0}, {'id': 'LUGEN', 'min': 9}, {'id': 'NEPIX', 'min': 52}, {'id': 'LFML', 'min': 80}]}
    if start:
        f['started'] = {'at': iso(start)}
    if planned:
        f['planned_at'] = iso(planned)
    return f


_ETA_JS = """async (f) => { const CF = await import('/frame/lib/current_flight.js'), T = await import('/frame/lib/time.js');
  const e = CF.etaOf(f); return e ? e.map((x, i) => 'ETA ' + (i === 0 || i === e.length - 1 ? T.fmtZLocal(x.at) : T.fmtZ(x.at))) : null }"""
_CLOSE = 'maps?view=-1.5,46.35,-0.9,46.8'                # around LUGEN: well beyond 300 px per degree


@case('D31', 'ETA and planned position are derived', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='maps SPEC § 13: etaOf / plannedPositionAt of frame/lib/current_flight.js; "started" is started.at, never progress')
def d31(c):
    # (a) dated, not started: the ETA labels of a close view are etaOf(flight)
    f = _legs_flight(planned=now() + datetime.timedelta(hours=2))
    c.open(_CLOSE, docs=fdocs(f), wait=False)
    c.js(_TEXTS_JS)
    c.ready('maps', sheet=True)
    hook_map(c)
    want = [norm(t) for t in c.js(_ETA_JS, f)]
    c.until("(window.__mpTexts || []).some(t => /^ETA /.test(t))", timeout=6000, what='ETA labels drawn in a close view')
    got = set(texts(c, 'ETA '))
    c.ok(norm(want[1]) in got, f'drawn {sorted(got)}', f'the ETA of LUGEN is etaOf\'s ({want[1]})')
    c.ok(not c.shown('[data-mp="follow"]'), 'Follow shown for a flight not started', 'Follow hidden')
    # (c) a progress object but started null: not started
    g = _legs_flight(planned=now() + datetime.timedelta(hours=2), started=None, progress={'plannedPos': {'lat': 46, 'lon': 1}, 'phase': 'cruise'})
    c.open('maps', docs=fdocs(g))
    c.ok(norm(row(c, 'stPlanned')) in norm(c.grip()), f'grip {c.grip()!r}', 'a progress object does not make the flight started')
    c.ok(not c.shown('[data-mp="follow"]'), 'Follow shown', 'Follow hidden without started.at')
    # (b) started 20 min ago: the planned aircraft is drawn with its label, Follow shown, the GPS button in the notes
    h = _legs_flight(start=now() - datetime.timedelta(minutes=20))
    c.open(_CLOSE, docs=fdocs(h), wait=False)
    c.js(_TEXTS_JS)
    c.ready('maps', sheet=True)
    c.tap('[data-mp="fit"]')                                # a redraw after the hook
    c.until("window.__t.shown(document.querySelector('[data-mp=follow]'))", what='Follow shown for a started flight')
    planned = norm(row(c, 'progPlanned').replace('{t}', '')).strip()
    c.until(f"(window.__mpTexts || []).some(t => t.replace(/[\\s\\u00a0\\u202f]+/g, ' ').startsWith({json.dumps(planned)}))", timeout=6000,
            what='the planned aircraft labelled')
    c.ok(c.js("!!document.querySelector('.mp-notes [data-live]')"), 'no button to enable the position', 'the progress line offers ctx.live.enable()')
    # (d) arrived: Follow hidden, the note says it
    k = _legs_flight(start=now() - datetime.timedelta(hours=3), progress={'phase': 'arrived'})
    c.open('maps', docs=fdocs(k))
    c.until(f"(document.querySelector('.mp-notes')?.textContent || '').includes({json.dumps(row(c, 'progArrived'))})", what='the note "Arrived"')
    c.ok(not c.shown('[data-mp="follow"]'), 'Follow shown after the arrival', 'Follow hidden once arrived')
    # (e) diverted: a note names the new arrival
    d = _legs_flight(start=now() - datetime.timedelta(minutes=30))
    d['started']['diverted'] = True
    c.open('maps', docs=fdocs(d))
    want = norm(row(c, 'progDiverted').replace('{a}', 'LFML'))
    c.until(f"(document.querySelector('.mp-notes')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes({json.dumps(want)})", what='the diversion note')
    # (f) no quote.legs: the fallback times from the route still give ETA labels
    e = flight(planned_at=iso(now() + datetime.timedelta(hours=2)), quote={'minutes': 80, 'block': 4000, 'unit': 'kg'})
    c.open(_CLOSE, docs=fdocs(e), wait=False)
    c.js(_TEXTS_JS)
    c.ready('maps', sheet=True)
    c.tap('[data-mp="fit"]')
    c.until("(window.__mpTexts || []).some(t => /^ETA /.test(t))", timeout=6000, what='ETA labels from the fallback times')


# ------------------------------------------------------------------------------------------------------ D32
_DATELINE = {'schema': 1, 'by': 'fuel', 'route': {'dep': 'UHMA', 'arr': 'PAOM', 'text': 'UHMA PAOM',
             'points': [{'id': 'UHMA', 'lat': 64.7349, 'lon': 177.7414}, {'id': 'PAOM', 'lat': 64.5122, 'lon': -165.4453}]},
             'level': {'ft': 25000}}


def _gc(a, b):
    r = math.pi / 180
    d = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 2 * 3440.065 * math.asin(min(1, math.sqrt(d)))


@case('D32', 'Date line', 'D', tags=('maps',), screens=False, designs=('standard',), rule='maps SPEC § 6.9: one continuous route across 180°')
def d32(c):
    f = json.loads(json.dumps(_DATELINE))
    f['updated_at'] = iso(now())
    c.open('maps', docs=fdocs(f))
    c.until("!!document.querySelector('canvas.mp-pc')?.dataset.window", timeout=8000, what='the profile drawn')
    w = c.attr('canvas.mp-pc', 'data-window')
    total = float(w.split(',')[1])
    want = _gc((64.7349, 177.7414), (64.5122, -165.4453))
    c.le(round(abs(total - want), 1), 1.0, 'the profile is the great circle across 180°, not around the world', what=f'profile {total} NM, great circle {want:.1f} NM')
    hook_map(c)
    span = c.js("() => { const b = window.__mpMap.getBounds(); return b.getEast() - b.getWest() }")
    c.le(round(span, 1), 40, 'the framed span is a few tens of degrees (one continuous route)', what='framed longitude span')
    # a tap on the route east of 180°: the common cursor
    lat = 64.5122 + (64.7349 - 64.5122) * .3
    p = xy(c, lat, -168.0)
    c.page.mouse.click(*p)
    c.until("!!document.querySelector('.mp-map')?.dataset.cursorNm", what='the cursor set by a tap east of 180°')
    # an Edit gesture: longitudes written in [-180, 180[
    c.tap('[data-mp="edit"]')
    c.tap('[data-mp="add"]')
    q = xy(c, lat + .15, -171.0)
    c.page.mouse.click(*q)
    d = c.until_doc(PATH, lambda d: d and d.get('by') == 'maps' and len(d['route']['points']) == 3, what='a point added across the line', timeout=5000)
    c.ok(all(-180 <= p['lon'] < 180 for p in d['route']['points']), f'longitudes {[p["lon"] for p in d["route"]["points"]]}', 'written in [-180, 180[')


# ------------------------------------------------------------------------------------------------------ D33
FIXTURE = ROOT / 'tests/v3/fixtures/missions/1_ESSAI/ESSAI1/missionESSAI1.yaml'
MISSION_PATH = 'missions/1_ESSAI/ESSAI1/missionESSAI1.yaml'
_RAW_JS = """async ([path, text]) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame', 1);
  r.onupgradeneeded = () => { const d = r.result; for (const [n, o] of [['docs', { keyPath: 'path' }], ['pending', { keyPath: 'path' }], ['meta', { keyPath: 'key' }],
    ['conflicts', { keyPath: 'id', autoIncrement: true }]]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o) };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  await new Promise((res, rej) => { const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ path, text, base: text, rev: '', at: Date.now(), policy: 'reference' });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error) }); db.close(); return true }"""


@case('D33', 'Mission map (synthetic fixture)', 'D', tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='maps SPEC § 15: profile_def, resolved_bbox, cycle; the second map falls back to its type')
def d33(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('maps?mission=ESSAI1', aero=True)
    c.until("window.__t.shown(document.querySelector('.f-sheet-panel'))", timeout=10000, what='the mission profile in the sheet')
    c.eq(c.attr('[data-mp="layers"]', 'title'), row(c, 'pick'), 'the Layers button is "Map to show"', what='Layers title')
    for mp in ('route', 'mode', 'edit'):
        c.ok(not c.shown(f'[data-mp="{mp}"]'), f'[data-mp={mp}] shown', 'route, mode and Edit hidden on a mission map')
    c.eq(c.count('.mp-chip'), 3, 'three chips', what='chips')
    c.eq(c.js("document.querySelector('.mp-chip[data-view=weather]').disabled"), True, 'the Weather chip is disabled on a mission map', what='Weather chip')
    hook_map(c)
    b = c.js("() => { const x = window.__mpMap.getBounds(); return [x.getWest(), x.getSouth(), x.getEast(), x.getNorth()] }")
    want = [0.0, 43.8, 5.6, 47.3]
    # the map is fitted to resolved_bbox: the box is inside the view and fills one of its dimensions (2 % margin)
    c.ok(b[0] <= want[0] + .01 and b[2] >= want[2] - .01 and b[1] <= want[1] + .01 and b[3] >= want[3] - .01, f'view {b}', f'contains resolved_bbox {want}')
    fill = max((want[2] - want[0]) / (b[2] - b[0]), (want[3] - want[1]) / (b[3] - b[1]))
    c.ge(round(fill, 2), .9, 'resolved_bbox fills the view in one dimension', what='fill ratio')
    c.ok(norm(row(c, 'cycleDiff').replace('{a}', '2026-09-11').replace('{b}', '2026-10-15')) in norm(c.text('.mp-notes') or ''), f'notes {c.text(".mp-notes")!r}', 'the notes say the cycle differs')
    # the second map: its type's built-in profile, said in the notes
    c.open('maps?mission=ESSAI1&map=carte_cible.png', aero=True)
    c.until(f"(document.querySelector('.mp-notes')?.textContent || '').length > 0", timeout=8000, what='notes of the second map')
    c.ok(norm(row(c, 'builtin').split('{p}')[0]).strip() in norm(c.text('.mp-notes') or ''),
         f'notes {c.text(".mp-notes")!r}', 'the notes say the built-in profile of the type is used')


# ------------------------------------------------------------------------------------------------------ D34
@case('D34', 'Plain background', 'D', tags=('maps',), screens=False, designs=('standard',), rule='maps SPEC § 5: no tiles → plain background within 10 s')
def d34(c):
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/'), lambda route: route.abort('blockedbyclient'))
    c.open('maps', flight=True)
    c.until("(document.querySelector('.mp-notes')?.textContent || '').length > 0 && !document.querySelector('.maplibregl-canvas')", timeout=12000,
            what='the plain background within 10 s (no MapLibre canvas, a note)')
    c.ok(norm(row(c, 'plain')) in norm(c.text('.mp-notes') or ''), f'notes {c.text(".mp-notes")!r}', 'the note "plain background" in the sheet\'s notes')
    c.ok(c.js("() => { const k = document.querySelector('canvas.mp-over'); return k.width > 0 && k.height > 0 }"), 'empty overlay canvas', 'the aeronautical layer drawn')
    c.ok(c.shown('.mp-prof'), 'no profile', 'the profile works on the plain background')
    c.tap('[data-mp="fit"]')
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='the overlay buttons work (Layers opens)')


# ------------------------------------------------------------------------------------------------------ D35
@case('D35', 'Device settings kept', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='maps SPEC § 6.7: cache/maps/ui.json holds only the differences from the defaults, per mode; "Reset all" removes them')
def d35(c):
    c.open('maps', flight=True)
    c.tap('[data-mp="mode"]')
    c.until("window.__t.shown(document.getElementById('mp-mode-opts'))", what='the modes panel opens')
    c.tap('.mp-choice[data-mode="vfr"]')
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='the Layers content')
    was = c.js("document.querySelector('input[data-layer=asTma]').checked")
    c.tap('input[data-layer="asTma"]')
    c.js("() => { const r = document.querySelector('input[data-layer=detail]'); r.value = -2; r.dispatchEvent(new Event('input', { bubbles: true })) }")
    ui = c.until_doc('cache/maps/ui.json', lambda d: d and d.get('preset') == 'vfr' and (d.get('layers') or {}).get('vfr', {}).get('detail') == -2,
                     what='ui.json written')
    c.eq(ui['layers']['vfr'], {'asTma': not was, 'detail': -2}, 'only the differences from the defaults are kept', what='layers.vfr')
    c.page.reload()
    c.ready('maps', sheet=True)
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('.mp-dbody input[data-layer=detail]'))", what='the Layers content after a reload')
    c.eq(c.js("document.querySelector('input[data-layer=detail]').value"), '-2', 'the step is kept after a reload', what='slider after reload')
    c.eq(c.js("document.querySelector('input[data-layer=asTma]').checked"), not was, 'the unticked family is kept', what='asTma after reload')
    c.tap('[data-layers-reset]')
    c.until_doc('cache/maps/ui.json', lambda d: d and 'vfr' not in (d.get('layers') or {}), what='"Reset all" removes the mode\'s choices')
    c.eq(c.js("document.querySelector('input[data-layer=asTma]').checked"), was, 'back to the default', what='asTma after the reset')


# ------------------------------------------------------------------------------------------------------ D36
@case('D36', 'Escape order', 'D', tags=('maps', 'sheet'), screens=False, designs=('standard',),
      rule='maps SPEC § 4: Escape closes one thing per press, the nearest first, and is taken only then')
def d36(c):
    c.open('maps', flight=True)
    c.until("!document.querySelector('.mp-chip[data-legend]').disabled", timeout=8000, what='the legend chip enabled (profile drawn)')
    c.tap('.mp-chip[data-legend]')
    c.until("window.__t.shown(document.querySelector('.mp-legend'))", what='the legend opens')
    c.tap('[data-mp="mode"]')
    c.until("window.__t.shown(document.getElementById('mp-mode-opts'))", what='the modes panel opens')
    c.ok(esc_key(c) and not c.shown('.mp-legend') and c.shown('#mp-mode-opts'), 'Escape did not close the legend first', 'legend first')
    c.ok(esc_key(c) and not c.shown('#mp-mode-opts'), 'Escape did not close the modes panel', 'then the modes panel')
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('.f-sheet-close'))", what='Layers opens')
    c.ok(esc_key(c) and not c.shown('.f-sheet-close'), 'Escape did not close the Layers content', 'then the sheet\'s content')
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit pressed')
    c.tap('[data-mp="add"]')
    c.ok(esc_key(c) and c.attr('[data-mp="add"]', 'aria-pressed') == 'false', 'Escape did not disarm "+"', 'then the armed "+"')
    c.ok(esc_key(c) and c.attr('[data-mp="edit"]', 'aria-pressed') == 'false', 'Escape did not leave the Edit mode', 'then the Edit mode')
    c.ok(not esc_key(c), 'Escape taken with nothing to close', 'with nothing left the key goes to the frame (not defaultPrevented)')


# ------------------------------------------------------------------------------------------------------ D37
_PLACE_STYLE = json.dumps({'version': 8, 'name': 'test-places', 'sources': {
    'base': {'type': 'geojson', 'data': {'type': 'FeatureCollection', 'features': []}},
    'omt': {'type': 'vector', 'tiles': ['https://tiles.openfreemap.org/none/{z}/{x}/{y}.pbf'], 'maxzoom': 14}},
    'layers': [{'id': 'background', 'type': 'background', 'paint': {'background-color': '#e8eef3'}},
               {'id': 'place_city', 'type': 'symbol', 'source': 'omt', 'source-layer': 'place', 'layout': {}},
               {'id': 'place_hidden', 'type': 'symbol', 'source': 'omt', 'source-layer': 'place', 'layout': {'visibility': 'none'}},
               {'id': 'road_label', 'type': 'symbol', 'source': 'omt', 'source-layer': 'transportation_name', 'layout': {}}]})
_TOWNS = [{'name': 'XXVILLE', 'lat': 44.84, 'lon': -0.58, 'pop': 250000}, {'name': 'XXBOURG', 'lat': 44.9, 'lon': -0.4, 'pop': 40000}]
_VIS_JS = "(id) => window.__mpMap.getLayoutProperty(id, 'visibility') || 'visible'"


@case('D37', 'Base map names hidden under our towns', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='maps SPEC § 5: the style\'s place layers hidden while our towns are drawn, shown again otherwise; other layers untouched')
def d37(c):
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/styles/'),
                    lambda route: route.fulfill(status=200, content_type='application/json', body=_PLACE_STYLE))
    # the vector tiles answer empty (an error before 'load' would send the map to the plain background, lib/map_base.js)
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/none/'),
                    lambda route: route.fulfill(status=200, content_type='application/x-protobuf', body=b''))
    ui = ['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']
    c.open('maps?view=-1.2,44.6,0.1,45.1', flight=True, docs=[ui], aero_extra={'cities': _TOWNS})
    hook_map(c)
    c.until("window.__mpMap.getLayoutProperty('place_city', 'visibility') === 'none'", timeout=8000, what='the place layer hidden under our towns')
    c.eq(c.js(_VIS_JS, 'place_hidden'), 'none', 'a layer hidden by the style stays hidden', what='place_hidden')
    c.eq(c.js(_VIS_JS, 'road_label'), 'visible', 'a symbol layer that is not a place is untouched', what='road_label')
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('input[data-layer=cities]'))", what='the Towns box')
    if c.js("document.querySelector('input[data-layer=cities]').checked"):
        c.tap('input[data-layer="cities"]')
    c.until("window.__mpMap.getLayoutProperty('place_city', 'visibility') === 'visible'", timeout=6000, what='Towns unticked: the base names back')
    c.eq(c.js(_VIS_JS, 'place_hidden'), 'none', 'the layer hidden by the style is never shown', what='place_hidden after')


# ------------------------------------------------------------------------------------------------------ D38
BENCHES = [('modules/maps/test/profile.html', '__bench'), ('modules/maps/test/axis_window.html', '__bench'),
           ('modules/maps/test/mission.html', '__bench'), ('modules/maps/test/sort.html', '__bench'),
           ('frame/lib/test/routing.html', '__bench'), ('frame/lib/test/current_flight.html', '__cfBench')]


@case('D38', 'Module benches', 'D', tags=('maps',), screens=False, designs=('standard',), night=False, rule='maps SPEC § 1: every bench passes')
def d38(c):
    for path, var in BENCHES:
        c.page.goto(f'{c.base}/{path}', wait_until='load')
        try:
            c.page.wait_for_function(f'window.{var} && window.{var}.done', timeout=30000)
        except Exception:
            raise Fail(f'{path}: the bench never reported done', 'a finished bench', path) from None
        r = c.js(f'({{ pass: window.{var}.pass, fail: window.{var}.fail, rows: window.{var}.rows.filter(x => !x.ok).slice(0, 3) }})')
        c.ok(r['fail'] == 0 and r['pass'] > 0, f'{path}: {r["pass"]} passed, {r["fail"]} failed: {r["rows"]}', 'every check of the bench passes')


# ------------------------------------------------------------------------------------------------------ D39
@case('D39', 'Save for the airline: Full level only', 'D', tags=('maps',), phone=False, designs=('standard',),
      rule='maps SPEC § 14, § 19: the airline\'s thresholds are written at the Full level only, refused by the module below it')
def d39(c):
    # level 2 (the default): the click is refused with a notification, nothing is written; the device keeps its own
    c.open('maps?tune=1', flight=True)
    c.until("!!document.querySelector('.mp-tune [data-tune=\"co\"]')", timeout=8000, what='the tuning page')
    c.tap('.mp-tune [data-tune="co"]')
    want = norm(row(c, 'tuneCoLevel'))
    c.until(f"(window.__notes || []).some(n => n.replace(/[\s\u00a0\u202f]+/g, ' ').trim() === {json.dumps(want)})", what='the refusal said')
    c.wait(500)
    c.eq(c.doc('airline/map_profiles.json'), None, 'nothing written for the airline below the Full level', what='airline/map_profiles.json')
    c.tap('.mp-tune [data-tune="dev"]')
    c.until_doc('cache/maps/ui.json', lambda d: d and any('zoom' in (v or {}) for v in (d.get('layers') or {}).values()), what='"Keep on this device" works at level 2')
    # the Full level: written
    c.open('maps?tune=1', flight=True, docs=[['device/level.json', {'level': 3}, 'cache']])
    c.until("!!document.querySelector('.mp-tune [data-tune=\"co\"]')", timeout=8000, what='the tuning page at the Full level')
    c.tap('.mp-tune [data-tune="co"]')
    d = c.until_doc('airline/map_profiles.json', lambda d: d and d.get('by') == 'maps', what='saved for the airline at the Full level')
    c.ok(any((p or {}).get('elements', {}).get('zoom') for p in (d.get('profiles') or {}).values()), f'{d}', 'the thresholds of the mode written')
