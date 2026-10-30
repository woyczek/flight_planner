"""Area D - maps, the cases added with the recode of 28 Oct 2026 (PLAN.md D30-D38; modules/maps/SPEC.md as rewritten).

Rules covered
  * the Edit mode writes the route by merging: the moved point loses its wind, the others keep wind and airway, route.procedures
    (Fuel's choice) is neither written nor removed, nothing outside route and level is touched; Undo; "+" inserts and disarms (D30);
  * the ETA and the planned position are derived (frame/lib/current_flight.js), "started" is started.at (D31);
  * a route across the date line (D32); a mission map from the synthetic fixture (D33); the plain background (D34);
  * the device's settings kept per mode, only the differences (D35); Escape closes one thing at a time (D36);
  * the base map's place names hidden under our towns (D37); the module's benches (D38);
  * the chosen SID, STAR and approach: path, trace, constraints, profile, aerodrome card (D41-D44).

Coordinates on the map come from MapLibre itself: the case wraps `Map.prototype.project` once to keep the map the module draws
with (`window.__mpMap`), then asks it where a position is.  Texts drawn on the canvas are read by wrapping `fillText`.
"""
import datetime
import json
import math
import re

from lib import AERO_CYCLE, FLIGHT, ROOT, STUB_STYLE, Fail, Skip, case, norm, tx

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
    f['route']['procedures'] = {'sid': _SID, 'star': _STAR_OTHER}    # a choice of fuel (here an old one): the Map never writes it
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
    c.eq(r.get('procedures'), f['route']['procedures'], 'route.procedures belongs to Fuel: kept as it is, even a side whose aerodrome is not the one of the route', what='procedures')
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
    # under load the first labels may come from a draw before the flight's times: wait for LUGEN's own, not for any ETA
    c.until(f"(window.__mpTexts || []).some(t => t.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === {json.dumps(want[1])})", timeout=10000,
            what='the ETA of LUGEN drawn in a close view')
    got = set(texts(c, 'ETA '))
    c.ok(norm(want[1]) in got, f'drawn {sorted(got)}', f'the ETA of LUGEN is etaOf\'s ({want[1]})')
    c.ok(not c.shown('[data-mp="follow"]'), 'Follow shown for a flight not started', 'Follow hidden')
    # (c) a progress object but started null: not started
    g = _legs_flight(planned=now() + datetime.timedelta(hours=2), started=None, progress={'plannedPos': {'lat': 46, 'lon': 1}, 'phase': 'cruise'})
    c.open('maps', docs=fdocs(g))
    c.until(f"(document.querySelector('.f-sheet-head .f-sheet-grip') || {{}}).title.replace(/[\\s\\u00a0\\u202f]+/g, ' ').includes({json.dumps(norm(row(c, 'stPlanned')))})",
            timeout=10000, what='the grip says the flight is planned')
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
_RAW_JS = """async ([path, text]) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame');
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
    c.ok(norm(row(c, 'cycleDiff').replace('{a}', '2026-09-11').replace('{b}', AERO_CYCLE)) in norm(c.text('.mp-notes') or ''), f'notes {c.text(".mp-notes")!r}', 'the notes say the cycle differs')
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
    c.until(f"(window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === {json.dumps(want)})", what='the refusal said')
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


# ------------------------------------------------------------------------------------------------------ D40
_ON_ROUTE_JS = r"""() => {
  const R = window.MapsRender, W = 600, H = 400, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const raw = cv.getContext('2d'), log = [];
  const ctx = new Proxy(raw, {
    get(o, p) {
      if (p === 'fillText') return (s, x, y) => { const m = o.getTransform(); log.push(['t', String(s), m.e + x * m.a + y * m.c, m.f + x * m.b + y * m.d]); return o.fillText(s, x, y) };
      if (p === 'stroke') return a => { log.push(['s', o.lineWidth]); return a ? o.stroke(a) : o.stroke() };
      const v = o[p]; return typeof v === 'function' ? v.bind(o) : v;
    },
    set(o, p, v) { o[p] = v; return true }
  });
  const A = { id: 'XOBL', lat: 44.80, lon: -0.22 }, B = { id: 'XVEL', lat: 44.98, lon: 0.16 }, C = { id: 'XNOR', lat: 45.48, lon: 0.68 },
    route = [{ id: 'XDEP', lat: 44.6, lon: -0.7 }, A, B, C, { id: 'XARR', lat: 45.7, lon: 1.0 }],
    aw = [{ route: 'X10', a: A, b: B, lower: 6500, upper: 19500, nm: 22 }, { route: 'X10', a: B, b: C, lower: 6500, upper: 19500, nm: 37 },
      { route: 'Y20', a: { id: 'XQ1', lat: 45.3, lon: -0.6 }, b: { id: 'XQ2', lat: 45.6, lon: -0.1 }, lower: 6500, upper: 19500, nm: 30 }],
    fit = R.bboxOf(route, 10), { toC, shown } = R.mercator(fit, W, H, 12);
  const run = rt => { log.length = 0; R.draw(ctx, { toC, W, H, scale: 1, bbox: shown, profile: R.routeProfile(9000), data: { airways: aw }, route: rt, marks: [] }); return log.slice() };
  const dist = (p, a, b) => { const ax = b.x - a.x, ay = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * ax + (p.y - a.y) * ay) / (ax * ax + ay * ay)));
    return Math.hypot(p.x - a.x - t * ax, p.y - a.y - t * ay) };
  const names = l => l.map((e, i) => [e, i]).filter(([e]) => e[0] === 't' && /^[XY]\d0$/.test(e[1]))
    .map(([e, i]) => ({ s: e[1], i, off: Math.min(...aw.filter(w => w.route === e[1]).map(w => dist({ x: e[2], y: e[3] }, toC(w.a.lat, w.a.lon), toC(w.b.lat, w.b.lon)))), x: e[2], y: e[3] }));
  const withRoute = run(route), lastRoute = withRoute.map((e, i) => e[0] === 's' && e[1] >= 4 ? i : -1).reduce((a, b) => Math.max(a, b), -1),
    on = names(withRoute), off = names(run([])), noRoute = off.filter(n => n.s === 'X10');
  return { on, lastRoute, same: on.filter(n => n.s === 'X10').every(n => noRoute.some(m => Math.hypot(m.x - n.x, m.y - n.y) < 1)) };
}"""


@case('D40', 'An airway the route follows: its box on the line, above the route', 'D', tags=('maps',), screens=False, designs=('standard',),
      night=False, rule='user 28 Oct (via ergonomics): the box stays on the airway, drawn over the route line which it interrupts; never beside it')
def d40(c):
    c.page.goto(f'{c.base}/modules/maps/test/render.html', wait_until='load')
    c.until("() => window.MapsRender && document.getElementById('out') && document.getElementById('out').textContent.length > 20", what='the render bench is drawn')
    r = c.js(_ON_ROUTE_JS)
    x10 = [n for n in r['on'] if n['s'] == 'X10']
    c.ge(len(x10), 2, 'both boxes of the airway the route follows are written', what=f'X10 names {x10}')
    c.ok(all(n['off'] < 1 for n in r['on']), f'distances to their segments {[(n["s"], round(n["off"], 1)) for n in r["on"]]}', 'every box sits on its own segment (never beside it)')
    c.ok(all(n['i'] > r['lastRoute'] for n in x10), f'route line stroked at call {r["lastRoute"]}, X10 names at {[n["i"] for n in x10]}', 'the boxes on the route are painted after the route line')
    c.ok(r['same'], 'the boxes moved when the route was added', 'the same place with or without the route (no jump)')
    # § 10.29 e: the parts draw from their frozen namespaces, the kit is frozen, nothing is stored in it
    fr = c.js("() => [Object.isFrozen(MapsRender.kit), Object.isFrozen(MapsRender.parts.airspace), Object.isFrozen(MapsRender.parts.route), 'drawAirways' in MapsRender.kit]")
    c.eq(fr, [True, True, True, False], 'kit and parts are frozen; the parts store nothing in the kit', what='frozen')



_AW_NAMES_JS = r"""(on) => {
  const R = window.MapsRender, W = 600, H = 400, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const raw = cv.getContext('2d'), log = [];
  const ctx = new Proxy(raw, { get(o, p) { if (p === 'fillText') return (s, x, y) => { log.push(String(s)); return o.fillText(s, x, y) };
    const v = o[p]; return typeof v === 'function' ? v.bind(o) : v }, set(o, p, v) { o[p] = v; return true } });
  const A = { id: 'XOBL', lat: 44.80, lon: -0.22 }, B = { id: 'XVEL', lat: 44.98, lon: 0.16 },
    aw = [{ route: 'X10', a: A, b: B, lower: 6500, upper: 19500, nm: 22 }], fit = R.bboxOf([A, B], 10), { toC, shown } = R.mercator(fit, W, H, 12),
    profile = R.routeProfile(9000);
  profile.elements = { ...(profile.elements || {}), awLabels: on };
  R.draw(ctx, { toC, W, H, scale: 1, bbox: shown, profile, data: { airways: aw }, route: [], marks: [] });
  return log;
}"""


@case('D51', 'Layers: the "Airway names" box shows and hides the airway names', 'D', tags=('maps',), screens=False, designs=('standard',),
      night=False, rule='user 29 Oct: "la coche « nom des voies » est inop dans la liste des couches de la carte"')
def d51(c):
    c.page.goto(f'{c.base}/modules/maps/test/render.html', wait_until='load')
    c.until("() => window.MapsRender && document.getElementById('out') && document.getElementById('out').textContent.length > 20", what='the render bench is drawn')
    shown, hidden = c.js(_AW_NAMES_JS, True), c.js(_AW_NAMES_JS, False)
    c.ok('X10' in shown, f'{shown}', 'box ticked: the airway name is written')
    c.ok('X10' not in hidden and '22' not in hidden, f'{hidden}', 'box unticked: neither the name nor the segment length is written')
    # § 10.29 g: one element; a profile that still carries the former airwayLabels is read as awLabels
    mig = c.js("() => [MapsRender.elementOf({ elements: { airwayLabels: false } }, 'awLabels'), MapsRender.elementOf({ elements: { airwayLabels: false, awLabels: true } }, 'awLabels'), 'airwayLabels' in (MapsRender.migrated({ elements: { airwayLabels: true } }).elements)]")
    c.eq(mig, [False, True, False], 'the former airwayLabels is migrated to awLabels (awLabels wins when both are there)', what='migration')

# ------------------------------------------------------------------------------------------------------ D41-D44
# The chosen runway, SID, STAR and approach (V3_SPECIFICATION § 10.20, maps SPEC § 5): route.procedures v2 written by fuel, the records
# read by aerodb (proc/manual/ for LFRS, read at a past cycle so the SID is "outdated"; proc/local/ for LFML, the X-Plane fallback).
# LFRS: SID XX1A (a leg without a fix, a published point with a "between" constraint and a speed, an RF arc), its transition TRA
# which ends on the route's LUGEN; a SID ZZ9Z that is not chosen.  LFML: STAR XX2B (no point in common with the route: a dashed direct
# from NEPIX), approach I31 ending on RW31, its missed approach (a leg without a fix, then XM01).
_MLMAP_HOOK = """(() => { let ml; Object.defineProperty(window, 'maplibregl', { configurable: true, get() { return ml },
  set(v) { ml = v; if (v && v.Map && !v.Map.__cap) { const o = v.Map.prototype.project; v.Map.__cap = 1;
    v.Map.prototype.project = function (...a) { window.__mlMap = this; return o.apply(this, a) } } } }) })()"""


def _pp(seq, id, lat, lon, **kw):
    return {'seq': seq, 'id': id, 'lat': lat, 'lon': lon, 'phase': 'main', **kw}


def _proc(icao, kind, name, rwy, points, trans=None, status='check', cycle='2025-01-02'):
    return {'id': f'{icao}.{kind}.{name}.RW{rwy}.{trans or "NONE"}', 'icao': icao, 'kind': kind, 'name': name, 'runways': [rwy],
            'transition': trans, 'points': points, 'status': status, 'source': {'kind': 'manual', 'cycle': cycle, 'how': 'hand'}}


_LFRS_PROCS = [
    _proc('LFRS', 'SID', 'XX1A', '03', [
        _pp(1, None, None, None, leg='VA', crs=30, alt={'type': 'min', 'ft': 1500}),
        _pp(2, 'XS01', 47.30, -1.45, leg='TF', alt={'type': 'between', 'ft': 3000, 'ft2': 5000}, kt=220),
        _pp(3, 'XS02', 47.15, -1.25, leg='RF', turn='R', arc={'centre': {'id': 'C01', 'lat': 47.22, 'lon': -1.36}, 'radius': 6},
            alt={'type': 'at', 'ft': 4000})]),
    _proc('LFRS', 'SID', 'XX1A', '03', [
        _pp(1, 'XS03', 46.90, -1.30, phase='trans', alt={'type': 'min', 'ft': 6000}),
        _pp(2, 'LUGEN', 46.5833, -1.2, phase='trans')], trans='TRA'),
    _proc('LFRS', 'SID', 'ZZ9Z', '03', [_pp(1, 'ZZFIX', 47.0, -1.7), _pp(2, 'LUGEN', 46.5833, -1.2)]),
]
_LFRS_FILE = {'schema': 1, 'icao': 'LFRS', 'cycle': '2025-01-02', 'updated_at': '2025-01-02T00:00:00Z', 'procedures': _LFRS_PROCS,
              'runways': [{'id': '03', 'lat': 47.15, 'lon': -1.62, 'elev': 90, 'qfu': 30, 'displaced': 0}]}
_LFML_PROCS = [
    _proc('LFML', 'STAR', 'XX2B', '31', [
        _pp(1, 'XT01', 43.95, 3.75, alt={'type': 'between', 'ft': 7000, 'ft2': 9000}),
        _pp(2, 'XT02', 43.62, 4.55, alt={'type': 'max', 'ft': 5000}, kt=210)], status='xplane'),
    _proc('LFML', 'APP', 'I31', '31', [
        _pp(1, 'XF01', 43.52, 4.95, alt={'type': 'at', 'ft': 3000}, kt=180),
        _pp(2, 'RW31', 43.44, 5.20, alt={'type': 'at', 'ft': 60}),
        _pp(3, None, None, None, leg='CA', crs=310, alt={'type': 'min', 'ft': 2000}, phase='missed'),
        _pp(4, 'XM01', 43.60, 4.90, phase='missed')], status='xplane'),
]
_LFML_FILE = {'schema': 1, 'icao': 'LFML', 'cycle': '2025-01-02', 'updated_at': '2025-01-02T00:00:00Z', 'procedures': _LFML_PROCS,
              'runways': [{'id': '31', 'lat': 43.44, 'lon': 5.20, 'elev': 21, 'qfu': 310, 'displaced': 0}]}
_PROC_DOCS = [['proc/manual/LFRS.json', _LFRS_FILE, 'reference'], ['proc/local/LFML.json', _LFML_FILE, 'reference']]
_CHOSEN = {'dep': {'rwy': '03', 'sid': 'LFRS.SID.XX1A.RW03.NONE', 'trans': 'LFRS.SID.XX1A.RW03.TRA'},
           'arr': {'rwy': '31', 'star': 'LFML.STAR.XX2B.RW31.NONE', 'app': 'LFML.APP.I31.RW31.NONE'}, 'by': 'fuel',
           'at': '2026-10-28T10:00:00Z'}
# the flown path (what flownPath must give, in order): the departure, the threshold, the fixes, the route, the fixes, the threshold, the arrival
_FLOWN = [('LFRS', 47.1569, -1.6078), ('RW03', 47.15, -1.62), ('XS01', 47.30, -1.45), ('XS02', 47.15, -1.25), ('XS03', 46.90, -1.30),
          ('LUGEN', 46.5833, -1.2), ('NEPIX', 44.9, 2.4), ('XT01', 43.95, 3.75), ('XT02', 43.62, 4.55), ('XF01', 43.52, 4.95),
          ('RW31', 43.44, 5.20), ('LFML', 43.4367, 5.215)]
_FLOWN_NM = sum(_gc(a[1:], b[1:]) for a, b in zip(_FLOWN, _FLOWN[1:]))
_STATE_JS = """async () => { window.__mp = await import('/modules/maps/state.js'); window.__pr = await import('/modules/maps/procs.js'); return true }"""
_PATH_JS = """() => { const S = window.__mp.S; return S && S.route && S.route.path ? S.route.path.map(p => p.origin + (p.id ? ':' + p.id : '')) : null }"""
_FLOWN_JS = """() => { const S = window.__mp.S; return S.route.flown.map(p => [p.id, p.nm]) }"""
_LAYOUT_JS = """() => { const ctx = document.createElement('canvas').getContext('2d'),
  L = window.__pr.layout(ctx, (lat, lon) => ({ x: (lon + 2) * 400, y: (48 - lat) * 400 }), 400);
  return L && { segs: L.segs.map(s => [!!s.dash, !!s.arc]), names: L.names.map(n => n.text), dots: L.dots.length,
                legs: L.segs.map(s => ({ dash: !!s.dash, arc: !!s.arc, o: s.o, a: s.a.src ? s.a.src.id || '' : '·', b: s.b.src ? s.b.src.id || '' : '·',
                  ph: s.b.src ? s.b.src.phase || '' : '' })),
                kinds: L.segs.map(s => s.o), hues: L.segs.map(s => window.__pr.colOf(s.o)),
                legend: ['sid', 'star', 'app', 'missed'].map(o => window.__pr.colOf(o)),
                lines: window.__pr.routeLines().map(r => r.length) } }"""


def _proc_flight(**over):
    f = flight(**over)
    f['route']['procedures'] = json.loads(json.dumps(_CHOSEN))
    return f


def _open_proc(c, f, view='maps?view=-1.8,46.95,-1.1,47.35', extra=()):
    c.open(view, docs=fdocs(f) + [list(d) for d in _PROC_DOCS] + [list(d) for d in extra], flight=False, airfields=True, wait=False)
    c.js(_TEXTS_JS)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.route && window.__mp.S.route.path && window.__mp.S.route.path.some(p => p.origin === 'sid'))",
            timeout=10000, what='the path holds the chosen SID')


_PROC_HOOK = """(() => { let ab; const patch = (A) => { window.__pc = { fns: [], n: 0 };
  const p = A.procedure; A.procedure = function (...a) { window.__pc.n++; return p.apply(this, a) };
  const on = A.on; A.on = function (ev, fn) { if (ev === 'change') window.__pc.fns.push(fn); return on.call(A, ev, fn) }; return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__pc) { const o = v.create; v.__pc = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()"""
_PROC_FIRE = """(e) => { const before = window.__pc.n, procs = window.__mp.S.procs; window.__pc.fns.forEach(f => f(e));
  return new Promise(r => setTimeout(() => r({ asked: window.__pc.n - before, same: window.__mp.S.procs === procs }), 600)) }"""


@case('D52', 'After "Read" / "Read again" in Fuel the map reads the flight’s procedures again', 'D', tags=('maps',), screens=False,
      designs=('standard',), night=False, rule='inventory 29 Oct: { procedures: ICAO, coverage: true } left the map on the old records (it reread on refreshed only)')
def d52(c):
    c.page.add_init_script(_PROC_HOOK)
    _open_proc(c, _proc_flight())
    other = c.js(_PROC_FIRE, {'procedures': 'EGLL', 'coverage': True})
    c.eq(other['asked'], 0, 'an aerodrome that is not the departure or the arrival: nothing is read again', what='procedure() calls')
    mine = c.js(_PROC_FIRE, {'procedures': 'LFML', 'coverage': True})
    c.ge(mine['asked'], 1, 'the arrival read again: its records are asked again', what='procedure() calls')
    c.ok(not mine['same'], 'S.procs kept', 'and the path is rebuilt from the new records')


_ZOOM_LAYOUT_JS = """(px) => { const S = window.__mp.S, R = window.MapsRender, ctx = document.createElement('canvas').getContext('2d'),
  z = R.zoomOf(px), L = window.__pr.layout(ctx, (lat, lon) => ({ x: (lon + 2) * px, y: (48 - lat) * px }), px, k => R.visibleAt(S.profile, k, z));
  return L && { names: L.names.map(n => n.text), near: L.near, pts: L.pts.length } }"""


@case('D53', 'Procedure names at every scale, their fixes and constraints from the regional view, both on the thresholds page', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user 29 Oct: "ils disparaissent trop tôt en zoom arrière (c’est une info hyper importante)"; "le nom de l’approche ne semble pas s’afficher"')
def d53(c):
    _open_proc(c, _proc_flight())
    far, mid = c.js(_ZOOM_LAYOUT_JS, 20), c.js(_ZOOM_LAYOUT_JS, 150)
    c.eq(len(far['names']), 3, 'far out (20 px per degree): the SID, STAR and approach names are still written', what=f'names {far["names"]}')
    c.ok(any(n.startswith('APP ') for n in far['names']), f'{far["names"]}', 'the approach is named (one fix off its threshold is enough)')
    c.ok(not far['near'], 'near', 'far out: no fixes and constraints')
    c.ok(mid['near'], 'not near', 'at 150 px per degree (the regional view, well below the former 300): fixes and constraints are written')
    c.page.goto(f'{c.base}/frame/index.html#maps?tune=1', wait_until='load')
    c.until("!!document.querySelector('.mp-tune [data-row=\"procCons\"]')", timeout=8000, what='the tuning page')
    rows = c.js("() => ['procNames', 'procCons'].map(k => { const r = document.querySelector(`.mp-tune [data-row=${k}]`); return r && [r.textContent.trim().slice(0, 40), !!r.querySelector('input[data-vis]'), r.querySelectorAll('input[type=range]').length] })")
    c.ok(all(r and not r[1] and r[2] == 2 for r in rows), f'{rows}', 'both thresholds are rows of the tuning page, with their two sliders and no layer box')


_KEPT_JS = """async () => { const M = await import('/modules/maps/state.js'), S = M.S, keep = S.route.path;
  const A = { id: 'XA', lat: 46.0, lon: 0.0 }, B = { id: 'AMB', lat: 46.5, lon: 0.5 }, C = { id: 'PIWIZ', lat: 47.0, lon: 1.0 },
    D = { id: 'TSU', lat: 48.5, lon: 2.2 }, E = { id: 'LFPO', lat: 48.72, lon: 2.38 };
  S.route.path = [{ ...A, origin: 'route' }, { ...B, origin: 'route' }, { id: 'STX', lat: 47.5, lon: 1.5, origin: 'star' }, { ...E, origin: 'route' }];
  const withStar = M.keptRoute([A, B, C, D, E]).map(p => p.id);
  S.route.path = [A, B, C, D, E].map(p => ({ ...p, origin: 'route' }));
  const without = M.keptRoute([A, B, C, D, E]).map(p => p.id);
  S.route.path = keep;
  return { withStar, without } }"""


@case('D54', 'A STAR joined on a route point: the route points it bypasses are neither drawn nor given winds', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='user 29 Oct: "les points de la route sont toujours présents, avec les flèches de vent, bien que la star se connecte à l’un des points de la route"')
def d54(c):
    _open_proc(c, _proc_flight())
    r = c.js(_KEPT_JS)
    c.eq(r['withStar'], ['XA', 'AMB', 'LFPO'], 'the STAR joins on AMB: PIWIZ and TSU are left out of the drawn route (marks, names, winds)', what='kept route')
    c.eq(r['without'], ['XA', 'AMB', 'PIWIZ', 'TSU', 'LFPO'], 'without a procedure every route point is kept', what='kept route without procedures')


_PLANE_JS = """async () => { await import('/modules/maps/state.js'); const F = await import('/modules/maps/flight_time.js');
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200; const raw = cv.getContext('2d'), pts = [];
  const ctx = new Proxy(raw, { get(o, p) { if (p === 'moveTo' || p === 'lineTo') return (x, y) => { const m = o.getTransform();
      pts.push([m.e + x * m.a + y * m.c, m.f + x * m.b + y * m.d]); return o[p](x, y) };
    const v = o[p]; return typeof v === 'function' ? v.bind(o) : v }, set(o, p, v) { o[p] = v; return true } });
  const out = [];
  for (const hdg of [0, 90, 225]) { pts.length = 0; F.drawPlane(ctx, { x: 100, y: 100 }, hdg, '#c62828', true, 10);
    const far = Math.max(...pts.map(p => Math.hypot(p[0] - 100, p[1] - 100)));
    out.push({ hdg, tip: pts[0], far }) }
  return out }"""


@case('D55', 'The aircraft arrow: its tip is on the position', 'D', tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user 29 Oct: "c’est la pointe de la flèche qui doit indiquer la position, pas son centre"')
def d55(c):
    _open_proc(c, _proc_flight())
    for r in c.js(_PLANE_JS):
        c.ok(abs(r['tip'][0] - 100) < .01 and abs(r['tip'][1] - 100) < .01, f'heading {r["hdg"]}: tip at {r["tip"]}', 'the tip of the arrow is the position, at any heading')
        c.ok(r['far'] > 15, f'{r["far"]:.1f} px', 'the body lies behind the tip')


_FAM_JS = """async () => { const L = await import('/modules/maps/lv.js');
  const cta = (n, lo) => ({ type: 'CTA', name: `DUBLIN ${n}`, cls: 'C', lower: lo, upper: 'FL245' });
  const dub = L.levelsHtml([cta(3, '1500 FT'), cta(4, '2500 FT'), cta(5, '3500 FT'), cta(6, '5500 FT')], 360, 220),
    mix = L.levelsHtml([cta(3, '1500 FT'), { type: 'TMA', name: 'SHANNON 1', cls: 'C', lower: '5500 FT', upper: 'FL245' }], 360, 220),
    same = L.levelsHtml([cta(3, '1500 FT'), cta(4, '1500 FT')], 360, 220);
  const has = h => h.includes('mp-lv-fam');
  return { dub: has(dub), mix: has(mix), same: has(same) } }"""


@case('D56', 'Airspaces at a point: overlapping sectors of one family with different floors are said to be the source’s data', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='ergonomics 29 Oct (Dublin: openAIP codes CTA 3 to 6 without their inner hole): a discreet note, no cutting on the map')
def d56(c):
    _open_proc(c, _proc_flight())
    r = c.js(_FAM_JS)
    c.ok(r['dub'], f'{r}', 'DUBLIN 3 to 6 (one family, one class, four floors): the note is written under the list')
    c.ok(not r['mix'] and not r['same'], f'{r}', 'two families, or one family with one floor: no note')


_PROF_AS_JS = """async () => {
  const box = (lo1, lo2) => [[[45.9, lo1], [46.1, lo1], [46.1, lo2], [45.9, lo2]]];
  const as = (name, type, cls, lower, upper, lo1, lo2) => ({ name, type, cls, lower, upper, rings: box(lo1, lo2) });
  const pts = [{ id: 'A', lat: 46, lon: 0 }, { id: 'B', lat: 46, lon: 4 }];
  const data = await MapsProfile.build(pts, { levelFt: 20000, profile: { tocNm: 40, todNm: 40, climbKt: 250, descentKt: 280 },
    elevation: async () => 0, airspaces: [
      as('DUBLIN CTA 3', 'CTA', 'C', '2500 ft AMSL', 'FL 245', 1.0, 2.0), as('DUBLIN CTA 4', 'CTA', 'C', '3000 ft AMSL', 'FL 245', 1.5, 2.5),
      as('DUBLIN CTA 5', 'CTA', 'C', '3500 ft AMSL', 'FL 245', 2.2, 3.0),
      as('HIGH TMA', 'TMA', 'C', 'FL 300', 'FL 400', 1.0, 3.0),
      as('JUST ABOVE', 'TMA', 'C', '20300 ft AMSL', 'FL 300', 1.0, 3.0)] });
  return data.crossed.map(c => [c.a.name, c.a.lower, c.a.upper, c.a.family || 1]) }"""


@case('D57', 'Profile: only the airspaces the planned path enters, overlapping sectors of one family as one envelope', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='user 29 Oct (LFPO → EIDW, FL280): « toujours la pollution par les CTA » — crossed ±500 ft, one envelope per family, FRA / W off, ≤ 7 labels')
def d57(c):
    c.page.goto(f'{c.base}/modules/maps/test/profile.html', wait_until='load')
    c.until("() => !!window.MapsProfile && !!window.SiaProfile", what='the profile libraries')
    r = c.js(_PROF_AS_JS)
    names = [x[0] for x in r]
    c.ok('DUBLIN CTA' in names and not any(n.startswith('DUBLIN CTA ') for n in names), f'{r}', 'DUBLIN CTA 3, 4 and 5, overlapping, are one envelope named "DUBLIN CTA"')
    d = next((x for x in r if x[0] == 'DUBLIN CTA'), None)
    c.ok(d and d[1] == '2500 ft AMSL' and d[3] == 3, f'{d}', 'from the lowest floor, three sectors')
    c.ok('HIGH TMA' not in names, f'{names}', 'an airspace above the planned path (FL300 at FL200) is not drawn')
    c.ok('JUST ABOVE' in names, f'{names}', 'one 300 ft above the cruise level is kept (±500 ft)')
    _open_proc(c, _proc_flight())
    n = c.js("""async () => { const V = await import('/modules/maps/profile_view.js'); return [['FREE RT ASPC EGTT WEST', 'CTA'], ['W-METRESEARCH', 'OTHER'],
      ['DUBLIN CTA 3', 'CTA'], ['VATA LOWER AIRSPACE A1', 'TRA']].map(([name, type]) => V.profileNoise({ name, type })) }""")
    c.eq(n, [True, True, False, False], 'free route (FRA) and W / weather research zones are left out of the profile (unless « Other airspaces » is on)', what='noise')


_RWY_JS = """([px, zoom]) => { const pr = window.__pr, k = Math.cos(47.15 * Math.PI / 180), toC = (lat, lon) => ({ x: (lon + 2) * px * k, y: (48 - lat) * px });
  return pr.runwayArrows(toC, zoom).map(w => ({ side: w.side, name: w.name, col: w.col, lw: w.lw,
    brg: (Math.atan2(w.b.x - w.a.x, -(w.b.y - w.a.y)) * 180 / Math.PI + 360) % 360, len: Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y),
    sid: pr.colOf('sid'), app: pr.colOf('app') })) }"""
_PROFILES_PUT = """(v) => window.FrameData.adapter({ id: 't-rz', reads: ['airline/'], writes: ['airline/'] }).put('airline/map_profiles.json', v)"""


@case('D58', 'The runways as threshold vectors, above the airline’s zoom threshold', 'D', tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='V3 § 10.30 (replacing the full-length arrow of § 10.24): a 24 px screen vector from each threshold along the true bearing, the designator at its tail, the chosen runway bold in its side’s hue; only from maps.runwayZoom (airline/map_profiles.json runwayZoom, 8 to 16, 11 by default)')
def d58(c):
    _open_proc(c, _proc_flight())
    c.until("() => !!(window.__mp.S.procs && window.__mp.S.procs.depRwy && window.__mp.S.rwys)", timeout=8000, what='the runways read')
    c.eq(c.js("() => window.__mp.S.runwayZoom"), 11, 'no setting: the threshold is 11', what='runwayZoom')
    near = c.js(_RWY_JS, [4000, 12])
    c.eq(sorted(w['side'] for w in near), ['arr', 'dep'], 'above the threshold, the runways of both aerodromes are vectors', what=f'vectors {near}')
    d = next(w for w in near if w['side'] == 'dep')
    a = next(w for w in near if w['side'] == 'arr')
    c.eq((d['name'], a['name']), ('03', '31'), 'named by the runway', what='names')
    c.ok(all(abs(w['len'] - 24) < .5 for w in near), f"{[round(w['len'], 1) for w in near]}", '24 px on the screen, whatever the zoom')
    c.ok(abs(c.js(_RWY_JS, [40000, 15])[0]['len'] - 24) < .5, 'length changes with the zoom', 'still 24 px ten times closer')
    c.ok(abs(((d['brg'] - 30 + 180) % 360) - 180) < 3, f"{d['brg']:.1f}°", 'a runway read from its number (03) points to 030° (its QFU)')
    c.eq((d['col'], a['col'], d['lw'], a['lw']), (d['sid'], a['app'], 3.5, 3.5), 'the chosen runway bold, in its side’s hue (SID, approach)', what='hue and width')
    c.eq(c.js(_RWY_JS, [4000, 10.9]), [], 'below the threshold nothing is drawn', what='vectors at zoom 10.9')
    # the airline's setting moves the threshold; a value out of 8..16 falls back to 11
    c.js(_PROFILES_PUT, {'runwayZoom': 14})
    c.until("() => window.__mp.S.runwayZoom === 14", timeout=8000, what='the setting is read again on its change')
    c.eq(c.js(_RWY_JS, [4000, 13]), [], 'threshold 14: nothing at zoom 13', what='vectors at zoom 13')
    c.eq(len(c.js(_RWY_JS, [4000, 14])), 2, 'from zoom 14 they are drawn', what='vectors at zoom 14')
    c.js(_PROFILES_PUT, {'runwayZoom': 30})
    c.until("() => window.__mp.S.runwayZoom === 11", timeout=8000, what='an out-of-range value is 11')
    # a flight without chosen procedures: the runways are read all the same, thin
    f = _proc_flight()
    f['route']['procedures'] = {'dep': {}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-29T10:00:00Z'}
    c.open('maps?view=-1.8,46.95,-1.1,47.35', docs=fdocs(f) + [list(d) for d in _PROC_DOCS], flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.rwys && window.__mp.S.rwys.dep.length)", timeout=10000, what='the runways read without procedures')
    w = c.js(_RWY_JS, [4000, 12])
    c.ok(len(w) == 2 and all(x['lw'] == 2 for x in w), f'{w}', 'every runway thin when none is chosen')
    b = c.js("""() => { const B = window.__pr.runwayBearing;
      return [B({ id: '20', true: 198.35, qfu: 197 }, [], 1.8), B({ id: '20', lat: 48.738, lon: 2.387, qfu: 197 }, [{ id: '02', lat: 48.7175, lon: 2.3767 }], 1.8),
        B({ id: '20', qfu: 197 }, [], 1.8), B({ id: '20', qfu: 197 }, [], null)] }""")
    c.ok(abs(b[0] - 198.35) < .01, f'{b}', 'the true bearing of the record first')
    c.ok(190 < b[1] < 205 and abs(b[1] - 198.8) < 2, f'{b}', 'else threshold to opposite threshold')
    c.ok(abs(b[2] - 198.8) < .01 and b[3] == 197, f'{b}', 'else QFU + the aerodrome’s variation, else the QFU as it is')


@case('D41', 'The chosen SID, STAR and approach are drawn from the runway', 'D', tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 § 10.20, maps SPEC § 5: path from the threshold; transition and missed approach dashed; a leg without a fix = 2 NM stroke then dashes; RF = arc; join on a common point or dashed direct; unchosen procedures never drawn')
def d41(c):
    _open_proc(c, _proc_flight())
    c.eq(c.js(_PATH_JS), ['route:LFRS', 'sid:RW03', 'sid', 'sid:XS01', 'sid:XS02', 'sid:XS03', 'route:LUGEN', 'route:NEPIX', 'star:XT01', 'star:XT02',
                          'app:XF01', 'app:RW31', 'route:LFML', 'missed', 'missed:XM01'],
         'the expanded path: threshold, SID, transition joined on LUGEN, STAR and approach to the threshold, the arrival, the missed approach last',
         what='the path origins')
    fl = c.js(_FLOWN_JS)
    c.eq([x[0] for x in fl], [p[0] for p in _FLOWN], 'the flown points: no leg without a fix, no missed approach', what='the flown points')
    c.ok(abs(fl[-1][1] - _FLOWN_NM) < .5, f'{fl[-1][1]:.1f} NM against {_FLOWN_NM:.1f}', 'nm is the cumulative great-circle distance of the flown points')
    lay = c.js(_LAYOUT_JS)
    # assertions of meaning (V3 § 10.29 h), not the exact list of segments: a leg more or less breaks none of them
    legs = lay['legs']
    by = lambda a, b: next((g for g in legs if g['a'] == a and g['b'] == b), None)
    stub = next((i for i, g in enumerate(legs) if g['a'] == 'RW03'), None)
    c.ok(stub is not None and not legs[stub]['dash'] and legs[stub + 1]['dash'], f'{legs[stub:stub + 2] if stub is not None else legs}',
         'a leg without a fix (VA after the threshold): a solid stroke along its course, then dashes to the next fix')
    rf = [g for g in legs if g['arc']]
    c.ok(len(rf) == 1 and rf[0]['b'] == 'XS02', f'{rf}', 'the RF leg (to XS02) is drawn as an arc, and only it')
    tr = [g for g in legs if g['ph'] == 'trans' or (g['o'] == 'sid' and g['b'] == 'LUGEN')]
    c.ok(tr and all(g['dash'] for g in tr), f'{tr}', 'the transition of the SID is dashed, up to the route')
    d = by('NEPIX', 'XT01')
    c.ok(d and d['dash'], f'{d}', 'the STAR joins the route by a dashed direct from NEPIX (no common point)')
    main = [g for g in legs if g['o'] in ('star', 'app') and g['a'] != 'NEPIX' and g['ph'] != 'missed']
    c.ok(main and not any(g['dash'] for g in main), f'{main}', 'the STAR and the approach themselves are solid')
    mi = [g for g in legs if g['o'] == 'missed']
    c.ok(mi and all(g['dash'] for g in mi), f'{mi}', 'the missed approach is dashed')
    c.eq(lay['lines'], [2], 'the route draws only LUGEN → NEPIX (the SID and the STAR draw the rest of the way)', what='route polylines')
    # user 29 Oct: "des couleurs de contraste autres que violet (vert ? orange ? bleu ?)"
    sid, star, app, missed = lay['legend']
    c.eq(len({sid, star, app}), 3, 'SID, STAR and approach each have their own hue', what=f'hues {lay["legend"]}')
    c.eq(missed, app, 'the missed approach takes the approach hue', what='missed hue')
    c.ok(not ({sid, star, app} & {'#7c3aed', '#8e24aa', '#6a3fa0', '#1f6fb2'}), f'{lay["legend"]}', 'none is the violet of the route and of the high airways, nor the blue of the low ones')
    c.eq([h for k, h in zip(lay['kinds'], lay['hues']) if k == 'sid'][:1], [sid], 'a SID leg is drawn in the SID hue', what='SID leg hue')
    # une procédure périmée : le seul symbole « ⌛ », jamais le mot (29 Oct)
    want = ['SID XX1A ⌛', f'STAR XX2B · {row(c, "procX")}', f'APP I31 · {row(c, "procX")}']
    c.eq(lay['names'], want, 'labelled "SID NAME", "STAR NAME", "APP NAME", with the state of the source', what='procedure labels')
    c.until("(window.__mpTexts || []).some(t => /^SID /.test(t))", timeout=6000, what='the SID label drawn')
    c.wait(400)
    drawn = [norm(t) for t in c.js('window.__mpTexts || []')]
    c.ok('SID XX1A' in drawn and '⌛' in drawn and 'SID XX1A ⌛' not in drawn, f'{sorted(set(t for t in drawn if t.startswith(("SID", "STAR", "APP", "⌛"))))}',
         'the SID label is written on the map, its ⌛ written apart (in grey)')
    # the airline's transition altitude is 5,000 ft by default: up to it an altitude in feet, as in the AIP ("5000", not "FL050")
    c.ok('≤ 220 kt' in drawn and '3000' in drawn and '5000' in drawn and 'FL050' not in drawn and '–' in drawn, f'{sorted(set(drawn))[:30]}',
         'a close view writes the constraints in the AIP notation (3000–5000, ≤ 220 kt)')
    c.ok(not any('ZZ9Z' in t or 'ZZFIX' in t for t in drawn), f'{[t for t in drawn if "ZZ" in t]}', 'a procedure that is not chosen is never drawn')
    c.tap('[data-mp="layers"]')
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    keys = c.js("[...document.querySelectorAll('input[data-layer]')].map(i => i.dataset.layer)")
    c.ok(not any(re.search(r'proc|sid|star|app', k, re.I) for k in keys), f'{keys}', 'no box for the procedures in Layers')
    c.eq(c.doc(PATH)['route']['procedures'], _CHOSEN, 'the map wrote nothing to route.procedures', what='route.procedures after the page')


@case('D42', 'The profile follows the flown path and the constraints', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 § 10.20, maps SPEC § 8: profile.path drawn when it exists, else the fallback; NM marks, cursor and ETA on the flown path; constraints as steps; TOC / TOD read within 100 ft of the top')
def d42(c):
    T = _FLOWN_NM
    path = [{'nm': 0, 'ft': 90}, {'nm': round(T * .1, 1), 'ft': 6000}, {'nm': round(T * .2, 1), 'ft': 27000}, {'nm': round(T * .8, 1), 'ft': 27000},
            {'nm': round(T * .95, 1), 'ft': 3000}, {'nm': round(T, 1), 'ft': 20}]
    legs = [{'id': p[0], 'min': round(i * 6.5, 1), 'origin': 'route' if p[0] in ('LFRS', 'LUGEN', 'NEPIX', 'LFML') else ('sid' if i < 5 else 'star')}
            for i, p in enumerate(_FLOWN)]
    f = _proc_flight(planned_at=iso(now() + datetime.timedelta(hours=2)), by='fuel')
    f['profile'] = {**f['profile'], 'path': path}
    f['quote'] = {'minutes': 80, 'block': 4000, 'unit': 'kg', 'taxiMin': 12, 'legs': legs}
    _open_proc(c, f, view='maps?view=-1.5,46.35,-0.9,46.8')
    c.until("() => !!window.__mp.S.prof", timeout=10000, what='the profile is built')
    r = c.js("""() => { const S = window.__mp.S; return { path: !!S.prof.plan?.path, mid: S.prof.plan.alt[Math.round((S.prof.plan.alt.length - 1) / 2)],
      names: S.prof.marks.map(m => m.name), total: S.prof.total / 1852, marks: S.marks.map(m => m.nm), cons: !!S.lgCons } }""")
    c.ok(r['path'], 'profile.path not used', 'profile.path drawn when it exists')
    c.eq(r['mid'], 27000, 'the planned altitude at the middle is the path\'s', what='plan altitude at mid distance')
    c.eq(r['names'], ['LFRS', 'LUGEN', 'NEPIX', 'LFML'], 'only the route points are named under the profile', what='profile marks')
    c.ok(abs(r['total'] - _FLOWN_NM) < 1, f'{r["total"]:.1f} NM against {_FLOWN_NM:.1f}', 'the profile is cut along the flown path')
    c.ok(r['marks'] and r['marks'][-1] < _FLOWN_NM and r['marks'][0] == 50, f'{r["marks"]}', 'the NM marks follow the flown path')
    c.ok(r['cons'], 'no constraint step drawn', 'the constraints are drawn as steps on the profile')
    # the ETA labels are etaOf(flight, { path: flown })
    want = c.js("""async () => { const CF = await import('/frame/lib/current_flight.js'), T = await import('/frame/lib/time.js'), S = window.__mp.S,
      e = CF.etaOf(S.route.flight, Date.now(), { path: S.route.flown }), i = e.findIndex(x => x.id === 'LUGEN'); return 'ETA ' + T.fmtZ(e[i].at) }""")
    c.until("(window.__mpTexts || []).some(t => /^ETA /.test(t))", timeout=8000, what='ETA labels')
    c.ok(norm(want) in set(texts(c, 'ETA ')), f'drawn {texts(c, "ETA ")}', f'the ETA of LUGEN is etaOf\'s on the flown path ({want})')
    # without profile.path: the fallback
    g = _proc_flight()
    _open_proc(c, g, view='maps?view=-1.5,46.35,-0.9,46.8')
    c.until("() => !!window.__mp.S.prof", timeout=10000, what='the profile is built')
    c.eq(c.js("() => !!window.__mp.S.prof.plan?.path"), False, 'without profile.path the profile keeps its fallback', what='plan.path')
    # a cruise that drifts by a few feet (Fuel's 24 980 → 24 970) keeps TOC at its start and TOD at its end; a step climb keeps TOC
    # at the higher level
    r = c.js("""async () => { const pts = [{ id: 'A', lat: 46, lon: 0 }, { id: 'B', lat: 46 + 100 / 60, lon: 0 }],
      at = async path => { const p = await MapsProfile.build(pts, { path }); return [p.plan.toc.s, p.plan.tod.s].map(s => Math.round(s / 1852)) };
      return [await at([{ nm: 0, ft: 0 }, { nm: 20, ft: 24980 }, { nm: 80, ft: 24970 }, { nm: 100, ft: 0 }]),
        await at([{ nm: 0, ft: 0 }, { nm: 20, ft: 24970 }, { nm: 80, ft: 24980 }, { nm: 100, ft: 0 }]),
        await at([{ nm: 0, ft: 0 }, { nm: 20, ft: 23000 }, { nm: 50, ft: 23000 }, { nm: 55, ft: 25000 }, { nm: 80, ft: 25000 }, { nm: 100, ft: 0 }])] }""")
    c.eq(r, [[20, 80], [20, 80], [55, 80]], 'TOC and TOD at the ends of a drifting cruise; a step climb tops at the higher level',
         what='TOC / TOD on profile.path')


@case('D43', 'The aerodrome card shows the choice and a button to Fuel', 'D', tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 § 10.20: the Map shows the chosen runway and procedures on the aerodrome card, "Changer" goes to #fuel?focus=arr, and never writes route.procedures')
def d43(c):
    c.page.add_init_script(_MLMAP_HOOK)
    f = _proc_flight()
    c.open('maps?view=4.7,43.2,5.7,43.8', docs=fdocs(f) + [list(d) for d in _PROC_DOCS] + [['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']],
           flight=False, airfields=True, aero_extra={'aerodromes': [{'icao': 'LFML', 'name': 'MARSEILLE PROVENCE', 'lat': 43.4367, 'lon': 5.215, 'elev': 21,
                                                                   'hardLen': 3500, 'public': True}], 'cells': {'43': [[0, 6]], '44': [[0, 6]]}})
    c.until("() => !!window.__mlMap", timeout=20000, what='the map instance is seen')
    c.settle()
    c.wait(1500)
    xyz = c.js("""() => { const m = window.__mlMap, p = m.project([5.215, 43.4367]), r = m.getCanvas().getBoundingClientRect(); return [r.left + p.x, r.top + p.y] }""")
    c.page.mouse.click(xyz[0], xyz[1])
    c.until("() => !!document.querySelector('.mp-ad-proc')", timeout=10000, what='the aerodrome card shows the chosen procedures')
    row_ = norm(c.js("() => document.querySelector('.mp-ad-proc[data-proc=arr]').textContent"))
    c.ok(norm(row(c, 'adProcRwy').replace('{r}', '31')) in row_ and 'STAR XX2B' in row_ and 'APP I31' in row_ and norm(row(c, 'procX')) in row_, row_,
         'the card gives the runway, the STAR and the approach chosen, and where they come from')
    c.ok(not c.count('.mp-ad-proc[data-proc=dep]'), 'a departure row on the arrival aerodrome', 'only the side the aerodrome is')
    go = c.attr('.mp-ad-proc[data-proc=arr] [data-go]', 'data-go')
    c.eq(go, 'fuel?focus=arr', 'the button leads to Fuel\'s arrival row', what='data-go')
    c.eq(c.doc(PATH)['route']['procedures'], _CHOSEN, 'route.procedures untouched', what='route.procedures')
    c.tap('.mp-ad-proc[data-proc=arr] [data-go]')
    c.until("location.hash.startsWith('#fuel')", what='Fuel opens')
    # Fuel takes the request once (ctx.consume('focus'), frame/INTEGRATION 6.1) and the frame removes it from the address: a reload or Back does not replay it
    c.until("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k === 'p-arr-rwy'", timeout=15000, what="Fuel's arrival row has the focus")
    c.eq(c.hash(), '#fuel', 'the request is consumed: the address is back to Fuel alone', what='hash')


@case('D44', 'Without records the path is the route; the live view sees the choice', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 § 10.20: without aerodb, without procedure or without record the path is the route (today\'s behaviour); a new choice or profile.path is a new route for the live view')
def d44(c):
    # procedures chosen but no record at all (nothing under proc/): the route as it was
    f = _proc_flight()
    c.open('maps?view=-1.8,46.95,-1.1,47.35', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.js(_TEXTS_JS)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.route && window.__mp.S.route.path)", timeout=10000, what='the path is built')
    c.wait(800)
    c.eq(c.js(_PATH_JS), ['route:LFRS', 'route:LUGEN', 'route:NEPIX', 'route:LFML'], 'no record: the path is the route', what='path')
    c.eq(c.js("() => window.__pr.routeLines()"), None, 'the route is drawn whole', what='routeLines')
    c.ok(not [t for t in c.js('window.__mpTexts || []') if re.match(r'^(SID|STAR|APP) ', t)], 'a procedure label', 'nothing drawn for a choice without record')
    # the signature of the live view
    r = c.js("""async (f) => { const T = await import('/modules/maps/flight_time.js'), g = JSON.parse(JSON.stringify(f)); const same = T.sameRoute(f, g);
      g.route.procedures.arr.star = 'LFML.STAR.YY.RW31.NONE'; const proc = T.sameRoute(f, g); g.route.procedures = f.route.procedures;
      g.profile = { ...g.profile, path: [{ nm: 0, ft: 0 }, { nm: 9, ft: 9 }] }; return [same, proc, T.sameRoute(f, g)] }""", f)
    c.eq(r, [True, False, False], 'a changed choice or profile.path is a new route; the same record is not', what='sameRoute')


# ------------------------------------------------------------------------------------------------------ D45-D50
# The "Procédures" layer (V3 § 10.22): the pins coloured by what the device can give, a legend, a line on the aerodrome card, an
# automatic lighting.  aerodb is the real service with a fake coverage() injected before the module mounts (a setter on window.AeroDB
# wraps create()): coverage(icao) answers from window.__cov.levels, calls are kept in batches (one
# batch = one tick), on('change') listeners are kept so that a case can fire the event.
_COV_LEVELS = {'LFRS': 'green', 'LFML': 'green', 'LFAB': 'orange', 'LFAC': 'red', 'LFAD': 'green'}
_COV_ROW = {
    'green': {'reason': 'held', 'source': 'published', 'outdated': False, 'counts': {'SID': 3, 'STAR': 2, 'APP': 5}},
    'orange': {'reason': 'sia'},
    'red': {'reason': 'none'},
    # an aerodrome held but partly read (V3 § 10.26): orange, the fields of 'held' and partial { pages, doubt }
    'partial': {'level': 'orange', 'reason': 'partial', 'source': 'manual', 'outdated': False, 'counts': {'SID': 4, 'STAR': 6, 'APP': 3},
                'partial': {'pages': 2, 'doubt': 1}}}
_COV_TEXTS = {'held': ['tenues ici', 'held here', 'hier gehalten', 'tenidas aquí'],
              'sia': ['lisibles au SIA', 'readable at the SIA', 'beim SIA lesbar', 'legibles en el SIA'],
              'none': ['rien nulle part', 'nothing anywhere', 'nirgends etwas', 'nada en ninguna parte'],
              'partial': ['lues à moitié', 'half read', 'halb gelesen', 'leídas a medias']}


def _fake_cov(levels=None, texts=True, missing=False):
    """Init script: patches the service the moment AeroDB.create builds it, before any module mounts.  `missing`: no coverage() at all."""
    cfg = json.dumps({'levels': levels or _COV_LEVELS, 'rows': _COV_ROW, 'texts': _COV_TEXTS if texts else None, 'missing': missing})
    return """(() => { const cfg = %s; let ab;
  const patch = (A) => {
  window.__cov = { calls: [], batches: [], fns: [], levels: cfg.levels, rows: cfg.rows, outdated: {}, open: null };
  if (cfg.missing) { A.coverage = undefined; return A }
  A.coverage = async (icao) => { const C = window.__cov; C.calls.push(icao);
    if (!C.open) { C.open = []; C.batches.push(C.open); setTimeout(() => { C.open = null }, 0) }
    C.open.push(icao);
    if (!/^[A-Z0-9]{4}$/.test(icao)) return null;
    const lv = C.levels[icao] || 'red';
    return { level: lv, state: icao.slice(0, 2), here: true, ...C.rows[lv], ...(C.outdated[icao] ? { outdated: true } : {}) } };
  if (cfg.texts) { const s = A.sources; A.sources = async () => ({ ...(s ? await s.call(A) : {}), COVERAGE: cfg.texts }) }
  else A.sources = async () => ({});
  const on = A.on; A.on = function (ev, fn) { if (ev === 'change') window.__cov.fns.push(fn); return on.call(A, ev, fn) };
  return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__cov) { const o = v.create; v.__cov = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()""" % cfg


_COV_SPY = """() => { const S = window.SiaAero; if (!S.__spy) { const o = S.drawPoints; window.__ads = [];
  S.drawPoints = function (ctx, data, ...r) { if (r[1] && r[1].aerodromes) window.__ads = (data.aerodromes || []).map(a => [a.icao, a.cov ? a.cov.main : null]);
    return o.apply(this, [ctx, data, ...r]) };
  S.__spy = 1 } return true }"""
_COV_IMPORT = """async () => { window.__mp = await import('/modules/maps/state.js'); window.__cv = await import('/modules/maps/coverage.js');
  window.__dr = await import('/modules/maps/draw.js'); return true }"""
_COV_ADS = [{'icao': 'LFAB', 'name': 'AB TEST', 'lat': 47.30, 'lon': -1.75, 'elev': 50, 'hardLen': 3000, 'public': True},
            {'icao': 'LFAC', 'name': 'AC TEST', 'lat': 46.98, 'lon': -1.70, 'elev': 50, 'hardLen': 3000, 'public': True},
            {'icao': 'LFAD', 'name': 'AD TEST', 'lat': 47.28, 'lon': -1.25, 'elev': 50, 'hardLen': 3000, 'public': True}]
_COV_CELLS = {'46': [[-3, 0]], '47': [[-3, 0]]}
_COV_PIN = """async (a) => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: a[0], name: a[0] + ' TEST', lat: a[1], lon: a[2] }) }"""
_COV_BOX = "() => { const i = window.__mp.S.layersEl.querySelector('input[data-layer=cov]'); return i ? i.checked : null }"


def _cov_open(c, f=None, levels=None, texts=True, missing=False, layers=None):
    """The Map in VFR mode over LFRS with three aerodromes off the route; fake coverage; waits for the first drawing."""
    c.page.add_init_script(_fake_cov(levels, texts, missing))
    ui = {'preset': 'vfr', 'layers': layers or {}}
    c.open('maps?view=-1.8,46.95,-1.1,47.35', docs=fdocs(f or flight()) + [['cache/maps/ui.json', ui, 'cache']], flight=False, airfields=True,
           aero_extra={'aerodromes': _COV_ADS, 'cells': _COV_CELLS}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_COV_IMPORT)
    c.js(_COV_SPY)
    c.until("() => window.__mp.S && window.__mp.S.adHits && window.__mp.S.adHits.some(h => h.a.icao === 'LFAB')", timeout=12000,
            what='the aerodromes are drawn')
    _redraw(c)         # the spy sees a drawing of its own


def _redraw(c):
    c.js("() => window.__dr.schedule()")
    c.wait(500)


def _ads(c):
    """{ icao: colour of the symbol } as handed to the symbol drawing at the last drawing."""
    return {a[0]: a[1] for a in c.js("() => window.__ads")}


def _level_of(rgb):
    r, g, b = rgb
    return 'green' if g > r and g > b else ('orange' if g > b + 30 else 'red')


def _write_flight(c, procedures, k):
    """The current flight written again with `procedures` (what Fuel does); k orders the writes."""
    f = c.doc(PATH)
    f['route']['procedures'] = procedures
    f['updated_at'] = f'2099-01-01T00:00:{k:02d}Z'
    c.js("""(a) => window.FrameData.adapter({ id: 't-cov', reads: ['pilot/'], writes: ['pilot/'] }).put(a[0], a[1])""", [PATH, f])


def _shown(c):
    return c.js("() => window.__cv.covShown()")


def _layers_toggle(c):
    c.tap('[data-mp="layers"]')
    c.wait(300)


@case('D45', 'Procedures layer: off by default, the pins take the colour of their level, requests grouped', 'D', tags=('maps',), screens=False,
      designs=('standard',), langs4=True,
      rule='V3 § 10.22, maps SPEC § 6.7: layer "Procédures" off by default; on: green / orange / red pins, only the visible aerodromes asked, one batch per drawing, cached')
def d45(c):
    _cov_open(c)
    _redraw(c)
    c.eq(c.js(_COV_BOX), False, 'the box of the layer is there and unchecked', what='box before')
    c.eq(_shown(c), False, 'the layer is off by default', what='shown')
    c.ok(_ads(c) and all(v is None for v in _ads(c).values()), f'{_ads(c)}', 'off: the pins keep their own colours')
    asked = set(c.js("() => window.__cov.calls"))
    c.ok(asked <= {'LFRS', 'LFML'}, f'{sorted(asked)}', 'off: only the departure and the arrival are asked (for the automatic lighting)')
    _layers_toggle(c)
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    name = tx(M, 'cov', c.lang, after='layerNames: {')
    labels = [norm(t) for t in c.js("[...document.querySelectorAll('.mp-layers label')].map(l => l.textContent)")]
    c.ok(name in labels, f'{name!r} in {labels}', 'the layer is named in the language of the run')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")
    c.until("() => ['LFAB', 'LFAC', 'LFAD'].every(i => window.__cov.calls.includes(i))", timeout=6000, what='the visible aerodromes are asked')
    c.wait(600)
    calls = c.js("() => window.__cov.calls")
    c.eq(len(calls), len(set(calls)), 'each aerodrome is asked once', what='calls')
    batch = c.js("() => window.__cov.batches.find(b => b.includes('LFAB'))")
    c.ok({'LFAB', 'LFAC', 'LFAD'} <= set(batch), f'{batch}', 'the aerodromes of one image are asked in the same batch')
    ads = _ads(c)
    tok = {k: c.var(f'--sog-{n}') for k, n in (('green', 'ok'), ('orange', 'warn'), ('red', 'err'))}
    c.eq([ads.get('LFAD'), ads.get('LFAB'), ads.get('LFAC')], [tok['green'], tok['orange'], tok['red']],
         'green, orange and red of the design for the three levels', what='colours handed to the symbols')
    # the pixels: the centre of each symbol (a runway symbol filled with its colour)
    px = c.js("""() => { const S = window.__mp.S, k = S.canvas.width / S.canvas.clientWidth, g = S.canvas.getContext('2d'), out = {};
      for (const h of S.adHits) { if (!['LFAB', 'LFAC', 'LFAD'].includes(h.a.icao)) continue;
        const d = g.getImageData(Math.round(h.x * k), Math.round(h.y * k), 1, 1).data; out[h.a.icao] = [d[0], d[1], d[2]] } return out }""")
    c.eq({k: _level_of(v) for k, v in px.items()}, {'LFAD': 'green', 'LFAB': 'orange', 'LFAC': 'red'},
         'the drawn symbols are green, orange and red', what=f'pixels {px}')
    c.eq(c.doc('cache/maps/ui.json')['layers'].get('vfr', {}).get('cov'), True, 'the box is kept on the device like the others', what='ui.json')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")      # unchecked: the usual pins again
    c.wait(500)
    c.ok(all(v is None for v in _ads(c).values()), f'{_ads(c)}', 'unchecked: the pins are the usual ones')


@case('D46', 'Coverage layer: lit by its box only', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 § 10.29 h (challenge of 29 Oct): the layer "Coverage" is never lit by itself; its box alone shows it, and is kept')
def d46(c):
    _cov_open(c, levels={**_COV_LEVELS, 'LFML': 'orange'})
    c.wait(1200)
    c.eq(_shown(c), False, 'nothing chosen and an orange arrival: the layer stays off (no automatic lighting)', what='shown')
    c.eq(c.doc('cache/maps/ui.json')['layers'], {}, 'nothing written', what='ui.json')
    _layers_toggle(c)
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    name = c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').closest('label').textContent.trim()")
    c.eq(norm(name), norm(tx(M, 'cov', c.lang, after='layerNames: {')), 'the layer is named "Coverage"', what='layer name')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")
    c.until("() => window.__cv.covShown()", timeout=4000, what='on by its box')
    c.eq(c.doc('cache/maps/ui.json')['layers'].get('vfr', {}).get('cov'), True, 'the box is kept', what='ui.json')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")
    c.until("() => !window.__cv.covShown()", timeout=4000, what='off by its box')


@case('D48', 'Procedures layer: a legend line per level; the aerodrome card says the level and why', 'D', tags=('maps',), screens=False,
      designs=('standard',), langs4=True,
      rule='V3 § 10.22: one legend line per level, only while the layer is shown; the pinned aerodrome\'s card: pin, level, reason (AeroCatalogue.COVERAGE), outdated, SID / STAR / APP counts')
def d48(c):
    _cov_open(c)
    c.js("() => { window.__cov.outdated.LFAD = true }")
    lang = ['fr', 'en', 'de', 'es'].index(c.lang)
    legend_off = "() => document.querySelector('.mp-legend').hidden"
    c.until("() => !document.querySelector('[data-legend]').disabled", timeout=8000, what='the legend chip is on')
    c.tap('[data-legend]')
    c.until("() => !document.querySelector('.mp-legend').hidden", what='the legend is open')
    green = norm(tx(M, 'green', c.lang, after='lgCov: {'))
    c.ok(green not in norm(c.text('.mp-legend')), norm(c.text('.mp-legend')), 'layer off: no line of the layer in the legend')
    c.tap('[data-legend]')
    c.until(legend_off, what='the legend is closed')
    # the layer on through its box: the three lines
    _layers_toggle(c)
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")
    c.until("() => window.__cv.covShown()", what='on')
    _layers_toggle(c)
    c.until("() => !document.querySelector('[data-legend]').disabled", what='the profile and its legend chip are back')
    c.tap('[data-legend]')
    c.until("() => !document.querySelector('.mp-legend').hidden", what='the legend is open')
    want = [norm(tx(M, k, c.lang, after='lgCov: {')) for k in ('green', 'orange', 'red')]
    got = [norm(t) for t in c.js("() => [...document.querySelectorAll('.mp-legend li')].map(l => l.textContent)")]
    c.ok(all(w in got for w in want), f'{got}', 'one legend line per level, in the language of the run')
    sw = c.js("() => [...document.querySelectorAll('.mp-legend .mp-lg-pin')].map(e => e.style.getPropertyValue('--c'))")
    c.eq(sw, ['var(--sog-ok)', 'var(--sog-warn)', 'var(--sog-err)'], 'the swatches carry the three colours of the design', what='swatches')
    # the card of a pinned aerodrome
    c.js(_COV_PIN, ['LFAD', 47.28, -1.25])
    c.until("(w) => ((document.querySelector('.mp-ad-cov') || {}).textContent || '').includes(w)", _COV_TEXTS['held'][lang], timeout=8000,
            what='the coverage line, with the reason from the frame catalogue')
    t = norm(c.text('.mp-ad-cov'))
    for part in (norm(tx(M, 'green', c.lang, after='covLevel: {')), _COV_TEXTS['held'][lang], '⌛', 'SID 3 · STAR 2 · APP 5'):
        c.ok(part in t, t, f'the card says "{part}"')
    c.eq(c.attr('.mp-ad-cov', 'data-level'), 'green', 'the line carries its level', what='data-level')
    c.eq(c.js("() => document.querySelector('.mp-ad-cov .mp-cov-dot').style.background"), 'var(--sog-ok)', 'the pin of the line is green', what='dot')
    c.js(_COV_PIN, ['LFAB', 47.30, -1.75])
    c.until("() => /SIA|sia/.test((document.querySelector('.mp-ad-cov') || {}).textContent || '')", timeout=8000, what='the card of an orange aerodrome')
    t = norm(c.text('.mp-ad-cov'))
    c.ok(norm(tx(M, 'orange', c.lang, after='covLevel: {')) in t and _COV_TEXTS['sia'][lang] in t and 'SID' not in t, t,
         'orange: the level and the reason, no counts')


@case('D49', 'Procedures layer: no reason text without the catalogue; the cache is emptied on a coverage change', 'D', tags=('maps',), screens=False,
      designs=('standard',),
      rule='V3 § 10.22: without AeroCatalogue.COVERAGE the card line shows the level only; aerodb.on("change") with coverage or refreshed asks again and redraws')
def d49(c):
    _cov_open(c, texts=False, layers={'vfr': {'cov': True}})
    c.until("() => (window.__ads || []).some(a => a[0] === 'LFAB' && a[1])", timeout=8000, what='the layer is on (kept box)')
    c.js(_COV_PIN, ['LFAB', 47.30, -1.75])
    c.until("() => !!document.querySelector('.mp-ad-cov')", timeout=8000, what='the card line')
    c.wait(500)
    c.eq(norm(c.text('.mp-ad-cov')), norm(tx(M, 'orange', c.lang, after='covLevel: {')), 'without the catalogue: the level only', what='line text')
    # a change of coverage: asked again, and the colour follows
    n = c.js("() => window.__cov.calls.length")
    c.js("() => { window.__cov.levels.LFAB = 'green'; window.__cov.fns.forEach(f => f({ coverage: true })) }")
    c.until("() => (window.__ads || []).some(a => a[0] === 'LFAB' && a[1] === getComputedStyle(document.documentElement).getPropertyValue('--sog-ok').trim())",
            timeout=8000, what='LFAB turns green after the change')
    m = c.js("() => window.__cov.calls.length")
    c.ok(m > n, f'{n} -> {m}', 'the aerodromes are asked again after the change')
    # the aircraft database changing touches neither the map nor the cache
    c.js("() => window.__cov.fns.forEach(f => f({ aircraft: true }))")
    c.wait(700)
    c.eq(c.js("() => window.__cov.calls.length"), m, 'an aircraft change asks nothing', what='calls')


@case('D59', 'Coverage layer: an aerodrome partly read says what is missing and what is held', 'D', tags=('maps',), screens=False,
      designs=('standard',), langs4=True,
      rule='V3 § 10.26, maps SPEC § 6.7: reason "partial" (orange): the card says "partly held", the reason, the pages not read and the records to check (singular / plural), then SID / STAR / APP; the orange legend line names both cases')
def d59(c):
    _cov_open(c, levels={**_COV_LEVELS, 'LFAC': 'partial'}, layers={'vfr': {'cov': True}})
    lang = ['fr', 'en', 'de', 'es'].index(c.lang)
    c.until("(w) => (window.__ads || []).some(a => a[0] === 'LFAC' && a[1] === w)", c.var('--sog-warn'), timeout=8000,
            what='LFAC is drawn orange')
    # the legend: the orange line names the partly read aerodromes
    c.until("() => !document.querySelector('[data-legend]').disabled", timeout=8000, what='the legend chip is on')
    c.tap('[data-legend]')
    c.until("() => !document.querySelector('.mp-legend').hidden", what='the legend is open')
    got = [norm(x) for x in c.js("() => [...document.querySelectorAll('.mp-legend li')].map(l => l.textContent)")]
    c.ok(norm(tx(M, 'orange', c.lang, after='lgCov: {')) in got, f'{got}', 'the orange legend line, partly read or read on demand')
    c.tap('[data-legend]')
    c.until("() => document.querySelector('.mp-legend').hidden", what='the legend is closed')
    c.js(_COV_PIN, ['LFAC', 46.98, -1.70])
    c.until("(w) => ((document.querySelector('.mp-ad-cov') || {}).textContent || '').includes(w)", _COV_TEXTS['partial'][lang], timeout=8000,
            what='the coverage line, with the reason from the frame catalogue')
    t = norm(c.text('.mp-ad-cov'))
    pages = tx(M, 'many', c.lang, after='covPages: {').replace('{n}', '2')
    doubt = tx(M, 'one', c.lang, after='covDoubt: {').replace('{n}', '1')
    for part in (norm(tx(M, 'partial', c.lang, after='covLevel: {')), _COV_TEXTS['partial'][lang], norm(pages), norm(doubt), 'SID 4 · STAR 6 · APP 3'):
        c.ok(part in t, t, f'the card says "{part}"')
    c.ok(norm(tx(M, 'orange', c.lang, after='covLevel: {')) not in t, t, 'not "readable on demand": the procedures are held')
    c.eq([c.attr('.mp-ad-cov', 'data-level'), c.attr('.mp-ad-cov', 'data-reason')], ['orange', 'partial'], 'orange, reason partial',
         what='data-level / data-reason')
    c.eq(c.js("() => document.querySelector('.mp-ad-cov .mp-cov-dot').style.background"), 'var(--sog-warn)', 'the pin of the line is orange',
         what='dot')
    # three records to check only: no page line, the plural
    c.js("() => { window.__cov.rows.partial = { ...window.__cov.rows.partial, counts: { SID: 1, STAR: 0, APP: 0 }, partial: { pages: 0, doubt: 3 } }; "
         "window.__cov.fns.forEach(f => f({ coverage: true })) }")
    c.until("() => ((document.querySelector('.mp-ad-cov') || {}).textContent || '').includes('SID 1 ')", timeout=8000, what='the new answer on the card')
    t = norm(c.text('.mp-ad-cov'))
    c.ok(norm(tx(M, 'many', c.lang, after='covDoubt: {').replace('{n}', '3')) in t, t, 'three records to check, in the plural')
    c.ok(norm(tx(M, 'one', c.lang, after='covPages: {').replace('{n}', '0')) not in t and 'SID 1 · STAR 0 · APP 0' in t, t,
         'no page line for zero pages; the counts are kept')


@case('D50', 'Procedures layer: not offered without aerodb.coverage', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 § 10.22: if aerodb.coverage does not exist the layer is not proposed in Layers, nothing else changes')
def d50(c):
    _cov_open(c, missing=True, layers={'vfr': {'cov': True}})
    _layers_toggle(c)
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    c.eq(c.js(_COV_BOX), None, 'no box for the layer', what='box')
    c.eq(_shown(c), False, 'a kept "on" does nothing without coverage()', what='shown')
    _redraw(c)
    c.ok(_ads(c) and all(v is None for v in _ads(c).values()), f'{_ads(c)}', 'the pins keep their own colours')
    c.js(_COV_PIN, ['LFAB', 47.30, -1.75])
    c.wait(800)
    c.eq(c.count('.mp-ad-cov'), 0, 'no coverage line on the aerodrome card', what='line')


# ------------------------------------------------------------------------------------------------------ D60
# The choose mode (V3 § 10.23, maps SPEC § 5.1): #maps?choose=arr&icao=LFML.  LFML holds nine STARs (S1A and S2A enter at the same fix
# ENT1, S9A serves 13 only, the odd ones serve 31 and the even ones serve both, S4A is read under an earlier cycle), a STAR the reading
# doubted (DOUBTX: status doubt), one without a name (NONAME), two approaches and two runways.
_CH_RWY = [{'id': '31', 'lat': 43.44, 'lon': 5.20, 'elev': 21, 'qfu': 310, 'displaced': 0, 'length': 3000},
           {'id': '13', 'lat': 43.4367, 'lon': 5.215, 'elev': 21, 'qfu': 130, 'displaced': 0, 'length': 3000}]


def _ch_star(n, rwys, status='check', cycle=None, entry=None, name=None):
    lat, lon = 43.9 + .05 * n, 4.2 + .1 * n
    p = _proc('LFML', 'STAR', name or f'S{n}A', rwys[0], [_pp(1, entry or f'EN{n:02d}', lat, lon), _pp(2, f'MD{n:02d}', 43.6, 4.9)],
              status=status, cycle=cycle or AERO_CYCLE)
    p['runways'] = rwys
    return p


_CH_PROCS = [_ch_star(1, ['31'], entry='ENT1'), _ch_star(2, ['31', '13'], entry='ENT1'), _ch_star(3, ['31']),
             _ch_star(4, ['31', '13'], cycle='2025-01-02'), _ch_star(5, ['31']), _ch_star(6, ['31', '13']), _ch_star(7, ['31']),
             _ch_star(8, ['31', '13']), _ch_star(9, ['13']), _ch_star(10, ['31'], status='doubt', name='DOUBTX'),
             _ch_star(11, ['31'], name='NONAME'),
             _proc('LFML', 'APP', 'I31', '31', [_pp(1, 'XF01', 43.52, 4.95), _pp(2, 'RW31', 43.44, 5.20)], cycle=AERO_CYCLE),
             _proc('LFML', 'APP', 'I13', '13', [_pp(1, 'XF13', 43.35, 5.45), _pp(2, 'RW13', 43.4367, 5.215)], cycle=AERO_CYCLE)]
_CH_FILE = {'schema': 1, 'icao': 'LFML', 'cycle': AERO_CYCLE, 'updated_at': '2025-01-02T00:00:00Z', 'procedures': _CH_PROCS, 'runways': _CH_RWY}
_CH_STAR1 = 'LFML.STAR.S1A.RW31.NONE'
# the address the Map asks for is caught as it changes (Fuel consumes its keys at mount: the address read afterwards says nothing), and the
# data adapter's two writers (put, remove) are counted: the Map writes nothing
_CH_HASH = """() => { window.__hc = []; window.__wr = []; window.addEventListener('hashchange', e => window.__hc.push(e.newURL));
  const d = window.__mp.S.ctx.data; for (const k of ['put', 'remove']) { const o = d[k]; d[k] = (...a) => { window.__wr.push([k, a[0]]); return o.apply(d, a) } }
  return true }"""
_CH_ROWS = """() => { const lists = [...document.querySelectorAll('.mp-ch-list')];
  return { groups: [...document.querySelectorAll('.mp-ch-grp')].map(g => ({ fam: g.dataset.fam,
      rows: [...g.querySelectorAll('.mp-ch-row')].map(b => ({ id: b.dataset.id || null, text: b.textContent.trim(), c: b.style.getPropertyValue('--c'),
        pressed: b.getAttribute('aria-pressed') === 'true', wind: (b.querySelector('.mp-ch-wind') || {}).textContent || null,
        sev: (b.querySelector('.mp-ch-wind') || {}).dataset ? b.querySelector('.mp-ch-wind').dataset.sev : null })),
      fix: ((g.querySelector('.mp-ch-fix') || {}).textContent || '').trim(), fixVal: (g.querySelector('[data-fix]') || {}).dataset ? g.querySelector('[data-fix]').dataset.val : null,
      fixFam: g.querySelector('[data-fix]') ? g.querySelector('[data-fix]').dataset.fix : null })),
    scrolls: lists.some(l => l.scrollHeight > l.clientHeight + 1),
    sums: [...document.querySelectorAll('.mp-ch-sum')].map(d => [d.dataset.fam, d.querySelector('.mp-ch-sum-v').textContent.trim()]),
    folds: Object.fromEntries([...document.querySelectorAll('.mp-ch-fold')].map(b => [b.dataset.more, b.textContent.trim()])),
    title: document.querySelector('.mp-dtitle').textContent.trim(), hash: location.hash } }"""
_CH_LAYOUT = """async ([id, fam]) => { const C = await import('/modules/maps/choose.js'), S = window.__mp.S, cv = document.createElement('canvas').getContext('2d'),
  L = C.chooseLayout(cv, S.toC), pal = MapsRender.palette(!!S.theme.dark).procHues;
  const t = L.traces.find(x => x.it && x.it.id === id), mid = t ? { x: (t.pts[0].x + t.pts[1].x) / 2, y: (t.pts[0].y + t.pts[1].y) / 2 } : { x: -50, y: -50 };
  return { focus: S.choose.focus, sel: S.choose.sel, n: L.traces.length, dim: L.traces.filter(t => t.dim).length, groups: L.groups.map(g => g.rows.map(r => r.id)),
    hues: (S.choose.items[fam] || []).map(i => pal[i.hi % pal.length]), dashed: L.traces.filter(t => t.dash).length,
    arrows: L.arrows.map(a => [a.name, a.lw]), at: C.chooseAt(mid.x, mid.y), nothing: C.chooseAt(-50, -50),
    last: L.traces.length ? L.traces[L.traces.length - 1].it.id : null, traced: [...new Set(L.traces.map(t => t.it.id))],
    hl: L.hl ? { text: L.hl.text, rows: L.hl.rows.map(r => r.id) } : null } }"""


def _ch_open(c, cur, side='arr', icao='LFML', extra=(), file=None):
    f = flight()
    f['route']['procedures'] = {'dep': cur if side == 'dep' else {}, 'arr': cur if side == 'arr' else {}, 'by': 'fuel', 'at': '2026-10-29T10:00:00Z'}
    docs = [['proc/manual/LFML.json', file or _CH_FILE, 'reference'], ['proc/manual/LFRS.json', _LFRS_FILE, 'reference']] + [list(d) for d in extra]
    c.open(f'maps?choose={side}&icao={icao}', docs=fdocs(f) + docs, flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.choose && window.__mp.S.choose.ready && window.__mp.S.toC)", timeout=12000, what='the choose mode is ready')
    # the pane drawn (its groups and the selection at the top), not only the mode's state: under load the sheet comes a moment later
    c.until("() => document.querySelectorAll('.mp-ch-grp').length >= 2 && !!document.querySelector('.mp-ch-sums')", timeout=12000, what='the pane is drawn')
    c.js(_CH_HASH)
    return f


def _grp(r, fam):
    g = next((g for g in r['groups'] if g['fam'] == fam), None)
    if g is None:
        raise Fail(f"no group {fam!r} in the pane: {[x['fam'] for x in r['groups']]}", f'the group {fam}', 'the pane')
    return g


def _back(c, how):
    """Closes the pane (Terminer, ✕ through closeData, Escape) and returns the query of the address the Map asked for, as a dict."""
    if how == 'done':
        c.tap('.mp-ch-done')
    else:
        c.js("async () => { (await import('/modules/maps/sheet_view.js')).closeData() }")
    c.until("() => (window.__hc || []).length > 0", what='the address changed')
    url = c.js('window.__hc')[0]
    q = url.split('#', 1)[1]
    c.ok(q.startswith('fuel?'), url, 'back to Fuel')
    return dict(kv.split('=', 1) for kv in q.split('?', 1)[1].split('&'))


_CH_METAR = ['cache/weather/metar/LFML.json', {'at': 4102444800000, 'source': 'launcher', 'data': {'icaoId': 'LFML', 'wdir': 107, 'wspd': 12}}, 'cache']


@case('D60', 'Choosing on the Map: the side’s families at once, the selection adds up and stays drawn, one trip back to Fuel', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False, langs4=True,
      rule='V3 § 10.30: one pane with runway, STAR (or SID), approach; "Aucune" first, six rows then "N more…", one scrolling surface; a tap sets the family’s choice in the pane and on the map (the rest of the touched family dimmed); runway and procedure correct each other by one line and one tap; wind on each runway from the METAR known; closing returns #fuel?focus=<side>&rwy=…&star=…&app=… once; the Map writes nothing; doubt records never listed')
def d60(c):
    _ch_open(c, {'rwy': '31'})
    r = c.js(_CH_ROWS)
    c.eq(r['hash'], '#maps', 'the request is consumed: choose and icao are gone from the address', what='address')
    c.eq(r['title'], tx(M, 'arr', c.lang, after='chSide: {').replace('{icao}', 'LFML'), 'the pane is the arrival of LFML', what='title')
    c.eq([g['fam'] for g in r['groups']], ['rwy', 'star', 'app'], 'runway, STAR and approach at once, in that order', what='groups')
    c.ok(all(g['rows'][0]['id'] == 'none' for g in r['groups']), f"{[g['rows'][0] for g in r['groups']]}", '"Aucune" first in every group')
    c.eq([x['id'] for x in _grp(r, 'rwy')['rows'] if x['pressed']], ['31'], 'the runway of the flight is the one pressed', what='runway')
    c.ok(all(x['wind'] is None for x in _grp(r, 'rwy')['rows']), 'a wind without METAR', 'no METAR known: no wind, nothing invented')
    c.eq(r['sums'], [['rwy', '31'], ['star', '—'], ['app', '—']], 'the selection at the top, three lines: the runway of the flight, the rest not chosen', what='summary')
    star = _grp(r, 'star')['rows']
    c.eq(len([x for x in star if x['id'] not in (None, 'none')]), 6, 'six compatible STARs shown, the rest folded', what='STAR rows')
    c.ok(not any('S9A' in x['text'] for x in star), f'{star}', 'S9A (runway 13 only) is not shown while 31 is chosen')
    c.eq(norm(r['folds'].get('star', '')), norm(tx(M, 'chFold', c.lang).replace('{n}', '3')), 'one thin line "3 more · All"', what='fold line')
    c.ok(not r['scrolls'], 'a list scrolls', 'no list scrolls by itself (the sheet is the only scrolling surface)')
    c.tap('.mp-ch-fold[data-more="star"]')
    c.until("() => (document.querySelector('.mp-ch-fold[data-more=\"star\"]') || {}).getAttribute && document.querySelector('.mp-ch-fold[data-more=\"star\"]').getAttribute('aria-expanded') === 'true'",
            what='the STARs unfold in place')
    r = c.js(_CH_ROWS)
    star = [x for x in _grp(r, 'star')['rows'] if x['id'] != 'none']
    names = [norm(x['text']) for x in star]
    c.eq(len(names), 9, 'the nine published STARs are listed', what=f'rows {names}')
    c.ok(not any('DOUBTX' in n for n in names), f'{names}', 'the record the reading doubted is never listed')
    c.ok(not any('NONAME' in n or 'EN11' in n for n in names), f'{names}', 'a record without a name is never listed (as in Fuel)')
    c.ok(any('S4A' in n and '⌛' in n for n in names), f'{names}', 'a STAR read under an earlier cycle ends with the hourglass')
    c.ok(any('S9A' in n and '⚠' in n for n in names), f'{names}', 'unfolded, the STAR that does not fit is marked ⚠')
    L = c.js(_CH_LAYOUT, ['LFML.STAR.S3A.RW31.NONE', 'star'])
    hues = [x['c'] for x in star]
    c.eq(L['focus'], 'star', 'the runway is chosen: the STARs are the family drawn', what='focus')
    c.eq(hues, L['hues'], 'the hue of a row is the hue its trace is drawn in', what='hues')
    c.eq(len(set(hues[:8])), 8, 'eight distinct hues', what=f'hues {hues}')
    c.eq(hues[8], hues[0], 'the ninth procedure takes the first hue again', what='ninth hue')
    c.eq(L['n'], 9, 'one trace per STAR, nothing chosen yet', what='traces')
    c.ok(any(len(g) == 2 for g in L['groups']) and len(L['groups']) == 8, f"{L['groups']}", 'one label per entry point: S1A and S2A share ENT1')
    c.eq(L['at'], 'LFML.STAR.S3A.RW31.NONE', 'a tap on a trace finds its procedure', what='hit on the S3A trace')
    c.eq(L['nothing'], None, 'a tap on nothing finds nothing', what='hit on nothing')
    c.eq(sorted(a[0] for a in L['arrows']), ['13', '31'], 'every runway is drawn', what='runways')
    # a STAR chosen: it stays in the pane and on the map, the other STARs dimmed, nothing written, the address unchanged
    s3 = 'LFML.STAR.S3A.RW31.NONE'
    c.tap(f'.mp-ch-row[data-id="{s3}"]')
    c.until("(id) => { const b = document.querySelector(`.mp-ch-row[data-id=\"${id}\"]`); return !!b && b.getAttribute('aria-pressed') === 'true' }", s3,
            what='the STAR is pressed in the pane')
    L = c.js(_CH_LAYOUT, [s3, 'star'])
    c.eq(L['dim'], 8, 'the other eight STARs are dimmed, the chosen one drawn in its hue', what='dimmed traces')
    c.eq(c.js('window.__hc'), [], 'the address does not change: the selection stays in the pane', what='address changes')
    # the runway changed: S3A does not serve 13 (13 is folded under "All") — the line offers the first STAR of the group that does
    c.ok(not c.count('.mp-ch-row[data-fam="rwy"][data-id="13"]'), 'runway 13 shown', 'S3A chosen: only the runway it serves is shown')
    c.tap('.mp-ch-fold[data-more="rwy"]')
    c.until("() => !!document.querySelector('.mp-ch-row[data-fam=\"rwy\"][data-id=\"13\"]')", timeout=10000, what='the runways unfold')
    c.tap('.mp-ch-row[data-fam="rwy"][data-id="13"]')
    c.until("() => !!document.querySelector('.mp-ch-grp[data-fam=star] .mp-ch-fix')", timeout=10000, what='the correction line under the STARs')
    r = c.js(_CH_ROWS)
    g = _grp(r, 'star')
    serving13 = [x['id'] for x in g['rows'] if x['id'] not in (None, 'none') and re.search(r'S[24689]A', x['text'])]
    c.eq(g['fixVal'], serving13[0], 'the first STAR of the group that serves 13 (PR.firstServing)', what='proposed STAR')
    c.ok(norm(tx(M, 'chNotServes', c.lang).replace('{p}', 'S3A').replace('{r}', '13')) in norm(g['fix']), g['fix'], '"S3A ne sert pas la 13 — Choisir …"')
    c.ok(any(x['id'] == s3 and '⚠' in x['text'] for x in g['rows']), f"{g['rows']}", 'S3A keeps its ⚠ meanwhile')
    c.tap('.mp-ch-grp[data-fam=star] [data-fix]')
    c.until("() => !document.querySelector('.mp-ch-grp[data-fam=star] .mp-ch-fix')", timeout=10000, what='the STAR is replaced, the line goes')
    star13 = serving13[0]
    # an approach that serves 31 only while 13 is chosen: "I31 sert la 31 — Passer en 31", one tap sets the runway
    i31 = 'LFML.APP.I31.RW31.NONE'
    c.tap('.mp-ch-fold[data-more="app"]')           # I31 does not fit runway 13: folded
    c.until(f"() => !!document.querySelector('.mp-ch-row[data-id=\"{i31}\"]')", timeout=10000, what='the approaches unfold')
    c.tap(f'.mp-ch-row[data-id="{i31}"]')
    c.until("() => !!document.querySelector('.mp-ch-grp[data-fam=app] .mp-ch-fix')", timeout=10000, what='the correction line under the approaches')
    g = _grp(c.js(_CH_ROWS), 'app')
    c.eq([g['fixFam'], g['fixVal']], ['rwy', '31'], 'the line offers runway 31', what='proposed runway')
    c.ok(norm(tx(M, 'chServes', c.lang).replace('{p}', 'I31').replace('{r}', '31')) in norm(g['fix']), g['fix'], '"I31 sert la 31 — Passer en 31"')
    c.tap('.mp-ch-grp[data-fam=app] [data-fix]')
    c.until("() => { const b = document.querySelector('.mp-ch-row[data-fam=rwy][data-id=\"31\"]'); return !!b && b.getAttribute('aria-pressed') === 'true' }",
            what='runway 31 pressed again')
    c.eq([x[0] for x in c.js(_CH_ROWS)['sums']], ['rwy', 'star', 'app'], 'the selection reads as three lines at the top', what='summary')
    # Terminer: one trip back with every family touched; the Map wrote nothing
    q = _back(c, 'done')
    c.eq(q, {'focus': 'arr', 'rwy': '31', 'star': star13, 'app': i31}, 'one return with the runway, the STAR and the approach chosen', what='keys')
    c.eq(c.js('window.__wr'), [], 'the Map wrote nothing (no put, no remove on its data adapter)', what='writes')
    # nothing chosen yet: a STAR that serves one runway sets it; Escape returns both
    _ch_open(c, {})
    c.eq(c.js(_CH_LAYOUT, ['', 'star'])['focus'], 'rwy', 'nothing chosen: the runway is the family touched first', what='focus')
    s1 = 'LFML.STAR.S1A.RW31.NONE'
    c.tap(f'.mp-ch-row[data-id="{s1}"]')
    c.until("() => { const b = document.querySelector('.mp-ch-row[data-fam=rwy][data-id=\"31\"]'); return !!b && b.getAttribute('aria-pressed') === 'true' }",
            what='the STAR’s only runway is set (PR.runwayOf)')
    c.eq(_back(c, 'close'), {'focus': 'arr', 'star': s1, 'rwy': '31'}, '✕ / Escape return like "Terminer"', what='keys')
    # ✕ on a line of the selection clears that family ("Aucune")
    _ch_open(c, {'rwy': '31', 'star': _CH_STAR1})
    c.tap('.mp-ch-sum[data-fam=star] .mp-ch-x')
    c.until("(w) => ((document.querySelector('.mp-ch-sum[data-fam=star] .mp-ch-sum-v') || {}).textContent || '').trim() === w", tx(M, 'chNone', c.lang),
            what='the STAR line reads "Aucune"')
    c.eq(_back(c, 'done'), {'focus': 'arr', 'star': 'none'}, '✕ on the STAR line is "Aucune"', what='keys')
    # "Aucune" is a choice; a family left untouched has no key
    _ch_open(c, {'rwy': '31'})
    c.tap('.mp-ch-grp[data-fam=star] .mp-ch-row[data-id="none"]')
    c.until("() => document.querySelector('.mp-ch-grp[data-fam=star] .mp-ch-none').getAttribute('aria-pressed') === 'true'", timeout=10000, what='"Aucune" pressed')
    c.eq(_back(c, 'done'), {'focus': 'arr', 'star': 'none'}, '"Aucune" is none; the runway and the approach, untouched, have no key', what='keys')
    _ch_open(c, {'rwy': '31'})
    c.eq(_back(c, 'done'), {'focus': 'arr'}, 'nothing touched: back to Fuel on the side, without keys', what='keys')
    # the wind of the METAR known on every runway: headwind on 31, tailwind (orange) on 13
    _ch_open(c, {}, extra=[_CH_METAR])
    rw = {x['id']: x for x in _grp(c.js(_CH_ROWS), 'rwy')['rows'] if x['id'] != 'none'}
    c.eq([rw['31']['wind'], rw['31']['sev']], ['↓ 12 kt', 'ok'], 'runway 31 (true 107° here) faces the 107° wind: 12 kt head, green (wind.severity)', what='wind on 31')
    c.eq([rw['13']['wind'], rw['13']['sev']], ['↑ 12 kt', 'alert'], 'runway 13: 12 kt tail, red (beyond 5 kt of tail)', what='wind on 13')
    # the departure: runway and SID, the transitions drawn for the highlighted SID only
    _ch_open(c, {'rwy': '03'}, 'dep', 'LFRS')
    r = c.js(_CH_ROWS)
    c.eq([g['fam'] for g in r['groups']], ['rwy', 'sid'], 'the departure: runway and SID', what='groups')
    c.eq(sorted(re.match(r'[A-Z]{2}\d[A-Z]', norm(x['text'])).group(0) for x in _grp(r, 'sid')['rows'][1:]), ['XX1A', 'ZZ9Z'], 'both SIDs listed (not the transition)', what='rows')
    sid = 'LFRS.SID.XX1A.RW03.NONE'
    c.eq(c.js(_CH_LAYOUT, [sid, 'sid'])['dashed'], 0, 'no transition drawn while nothing is highlighted', what='dashed traces')
    c.js("async (id) => { (await import('/modules/maps/choose.js')).setHl(id) }", sid)
    c.eq(c.js(_CH_LAYOUT, [sid, 'sid'])['dashed'], 1, 'the highlighted SID shows its transition, dashed', what='dashed traces')


# ------------------------------------------------------------------------------------------------------ D61
_TRAIL_JS = """() => (window.__mp.S.trail || []).map(p => [p.lat, p.lon, p.at])"""
# true once the Map's track is exactly `want` ([[lat, lon]], 4 decimals): the case waits for a state, never for a delay or a length
_TRAIL_IS = """(want) => { const t = (window.__mp && window.__mp.S && window.__mp.S.trail) || [];
  return t.length === want.length && t.every((p, i) => Math.abs(p.lat - want[i][0]) < 1e-4 && Math.abs(p.lon - want[i][1]) < 1e-4) }"""


def _trail_wait(c, want, what):
    """Waits until the Map's track is `want` (20 s: the full noreg loads the machine); fails with the last track seen."""
    try:
        c.until(_TRAIL_IS, want, timeout=20000, what=what)
    except Fail:
        pass
    got = c.js(_TRAIL_JS)
    return got


@case('D61', 'The flown track comes from the frame: read at mount, the whole flight, then the Map adds its newer positions', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='INTEGRATION § 6 (29 Oct; local since 30 Oct): ctx.live.trail() = { from: started.at, trail: [[lat, lon, altFt, s since started.at]] }, kept on the device; the Map starts its track from it at mount (a tab change no longer loses it), points older than 30 min kept, and only adds positions newer than its last point')
def d61(c):
    t0 = now() - datetime.timedelta(minutes=60)
    trail = [[47.1569, -1.6078, 400, 0], [46.9, -1.45, 12000, 1800], [46.6, -1.21, 20000, 3000]]
    f = flight(started={'at': iso(t0)},
               progress={'phase': 'cruise', 'at': iso(now()),
                         'actual': {'lat': 46.3, 'lon': -0.9, 'altFt': 24000, 'at': iso(now() - datetime.timedelta(seconds=20))}})
    # the device's track (device/trail.json), two points off the Earth
    dev = {'from': iso(t0), 'trail': trail[:2] + [[95.0, 10.0, 1000, 2000], [46.7, 200.0, 1000, 2400]] + trail[2:]}
    c.open('maps', docs=fdocs(f) + [['device/trail.json', dev, 'cache']], flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js("async () => { window.__mp = await import('/modules/maps/state.js'); return true }")
    want = [[q[0], q[1]] for q in trail] + [[46.3, -0.9]]
    got = _trail_wait(c, want, 'the track is read')
    c.eq([[round(q[0], 4), round(q[1], 4)] for q in got], want,
         'the frame\u2019s track, its first point an hour old included, the points off the Earth left out, then the current position', what='track')
    c.eq(got[1][2][:16], iso(t0 + datetime.timedelta(seconds=1800))[:16], 'a point\u2019s time is started.at + s', what='time of a point')
    # a reread (the frame wrote a new position and the track grew on the device): the track is the frame's again, nothing doubled
    c.js("""(t) => window.FrameData.adapter({ id: 't-trail-dev', reads: ['device/'], writes: [{ prefix: 'device/', policy: 'cache' }] })
      .put('device/trail.json', t)""", {'from': iso(t0), 'trail': trail + [[46.3, -0.9, 24000, 3580]]})
    c.until("() => (window.__mp.S.ctx.live.trail()?.trail || []).length === 4", timeout=10000, what='the frame reads the device track')
    g = c.doc(PATH)
    g['progress']['actual'].update({'lat': 46.1, 'lon': -0.7, 'at': iso(now())})
    # strictly newer than the record shown: the Map rereads only a newer updated_at, and on a warm browser this write can fall
    # in the same second as the flight's (whole seconds here) — it was then rightly ignored, one run in seven
    g['updated_at'] = iso(max(now(), datetime.datetime.strptime(g['updated_at'], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc))
                          + datetime.timedelta(seconds=1))
    c.js("""(a) => window.FrameData.adapter({ id: 't-trail', reads: ['pilot/'], writes: ['pilot/'] }).put(a[0], a[1])""", [PATH, g])
    want = [[q[0], q[1]] for q in trail] + [[46.3, -0.9], [46.1, -0.7]]
    got = _trail_wait(c, want, 'the new position')
    c.eq([[round(q[0], 4), round(q[1], 4)] for q in got], want,
         'the frame\u2019s track plus the new position, nothing doubled', what='track after a reread')


# ------------------------------------------------------------------------------------------------------ D62
@case('D62', 'The aerodrome card offers "Choose on the map" for its side: the choose mode without a reload', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False, langs4=True,
      rule='ergonomics 29 Oct (the user, on a phone, did not find the entry): the card of the departure or the arrival has "Choisir sur la carte" next to "Changer", full width on a phone; it opens the choose mode on the missing family, the same code as #maps?choose=, without a reload')
def d62(c):
    f = flight()
    f['route']['procedures'] = {'dep': {}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-29T10:00:00Z'}
    docs = [['proc/manual/LFML.json', _CH_FILE, 'reference'], ['proc/manual/LFRS.json', _LFRS_FILE, 'reference']]
    c.open('maps', docs=fdocs(f) + docs, flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.toC)", timeout=12000, what='the map is drawn')
    c.js("() => { window.__noReload = 1 }")
    c.js(_COV_PIN, ['LFML', 43.4367, 5.215])
    c.until("() => !!document.querySelector('.mp-ad-proc[data-proc=arr] [data-choose]')", timeout=10000, what='the card of the arrival')
    sel = '.mp-ad-proc[data-proc=arr] [data-choose=arr]'
    c.eq(norm(c.text(sel)), norm(tx(M, 'adProcChoose', c.lang)), 'the button says "Choose on the map" in the language of the run', what='label')
    c.ok(c.count('.mp-ad-proc[data-proc=arr] [data-go="fuel?focus=arr"]') == 1, 'no Change button', '"Changer" stays next to it')
    if c.width < 768:
        b, p = c.box(sel), c.box('.mp-ad-proc[data-proc=arr]')
        c.ok(b['w'] >= p['w'] - 2, f'button {b["w"]:.0f} px of a {p["w"]:.0f} px row', 'full width on a phone')
    c.tap(sel)
    c.until("() => !!(window.__mp.S.choose && window.__mp.S.choose.ready)", timeout=10000, what='the choose mode opens')
    st = c.js("() => { const S = window.__mp.S; return { fam: S.choose.focus, side: S.choose.side, icao: S.choose.icao, panel: S.dpanel, hash: location.hash, same: window.__noReload === 1, fit: S.fit } }")
    c.eq([st['side'], st['icao'], st['fam'], st['panel']], ['arr', 'LFML', 'star', 'choose'],
         'the arrival of LFML, the family the flight lacks touched first (the runway is chosen: the STAR), in the sheet', what='mode')
    c.ok(st['same'] and st['hash'] == '#maps', f'{st["hash"]}', 'no reload, the address unchanged')
    fit = st['fit']
    c.ok(fit['s'] < 44 and fit['n'] > 43.4 and fit['w'] < 5.2 and fit['e'] > 4.3 and fit['e'] - fit['w'] < 3, f'{fit}', 'the view fits the procedures of LFML, not the flight')
    # leaving by the cross: the flight's view and profile come back
    c.js("async () => { const C = await import('/modules/maps/choose.js'); await C.chooseExit() }")
    c.until("() => !window.__mp.S.choose && window.__mp.S.dpanel !== 'choose'", timeout=6000, what='the mode is left')
    fit = c.js("() => window.__mp.S.fit")
    c.ok(fit['w'] < -1 and fit['e'] > 5, f'{fit}', 'the flight’s frame again')


# ------------------------------------------------------------------------------------------------------ D63
_SRC_URL = 'https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_30_OCT_2025/FRANCE/AIRAC-2025-10-30/pdf/FR-AD-2.LFML-fr-FR.pdf'


@case('D63', 'The aerodrome card links each chosen procedure to its published page ("Source")', 'D', tags=('maps',), screens=False,
      designs=('standard',), night=False, langs4=True,
      rule='V3 § 10.25: "Source" opens the record\u2019s source.url in a new tab (https only, rel noopener); a record without a public page has no link, its document named in the line\u2019s title')
def d63(c):
    lfml, lfrs = json.loads(json.dumps(_LFML_FILE)), json.loads(json.dumps(_LFRS_FILE))
    lfml['procedures'][0]['source'] = {'kind': 'eaip', 'cycle': '2025-01-02', 'file': 'FR-AD-2.LFML-fr-FR.pdf', 'url': _SRC_URL}
    lfml['procedures'][1]['source'] = {'kind': 'eaip', 'cycle': '2025-01-02', 'url': 'http://example.invalid/app.pdf'}   # not https: no link
    for r in lfrs['procedures']:
        r['source'] = {'kind': 'ead', 'cycle': '2025-01-02', 'file': 'LF_AD_2_LFRS_en.pdf'}
    f = _proc_flight()
    c.open('maps', docs=fdocs(f) + [['proc/manual/LFRS.json', lfrs, 'reference'], ['proc/local/LFML.json', lfml, 'reference']], flight=False,
           airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.procs && window.__mp.S.procs.star)", timeout=12000, what='the chosen procedures are read')
    c.js(_COV_PIN, ['LFML', 43.4367, 5.215])
    c.until("() => !!document.querySelector('.mp-ad-proc[data-proc=arr]')", timeout=10000, what='the card of the arrival')
    links = c.js("() => [...document.querySelectorAll('.mp-ad-proc[data-proc=arr] a.mp-ad-src')].map(a => [a.textContent, a.getAttribute('href'), a.target, a.rel])")
    word = tx(M, 'adProcSource', c.lang)
    c.eq(links, [[word, _SRC_URL, '_blank', 'noopener noreferrer']], 'one "Source" link, the STAR’s https page, in a new tab; none for the http page of the approach',
         what='links')
    c.js(_COV_PIN, ['LFRS', 47.1569, -1.6078])
    c.until("() => !!document.querySelector('.mp-ad-proc[data-proc=dep]')", timeout=10000, what='the card of the departure')
    c.eq(c.count('.mp-ad-proc[data-proc=dep] a.mp-ad-src'), 0, 'an EAD record has no link', what='departure links')
    c.eq(c.attr('.mp-ad-proc[data-proc=dep]', 'title'), 'LF_AD_2_LFRS_en.pdf', 'its document is named in the line’s title', what='title')


# ------------------------------------------------------------------------------------------------------ D64
# aerodb as the user's device gives it: the data layer deep-freezes the published base (shared references, 802e6856f); the
# seeded test base is not frozen (no revision), so the case freezes every answer of aerodb itself
_FREEZE_AERO = """(() => { const fz = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k in v) fz(v[k]) } return v };
  let ab; Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab }, set(v) { ab = v;
    if (v && v.create && !v.__fz) { const o = v.create; v.__fz = 1; v.create = function (...a) { const A = o.apply(this, a);
      for (const k of ['airspaces', 'aerodromes', 'navaids', 'airways', 'cities', 'vrp', 'points', 'obstacles', 'moraCells', 'procedures', 'procedure', 'runways'])
        { const f = A[k]; if (typeof f === 'function') A[k] = async (...q) => fz(await f.apply(A, q)) }
      return A } } } }) })()"""
_DRAWN = """() => { const S = window.__mp.S, d = (S.data && S.data.data) || {};
  return { corridor: S.data ? S.data.corridor : null, airspaces: (d.airspaces || []).length, aerodromes: (d.aerodromes || []).length,
    zones: (S.zoneHits || []).length, ads: (S.adHits || []).map(h => h.a.icao) } }"""


@case('D64', 'The published base frozen by the data layer: airspaces and aerodromes still drawn in the general view and at zoom 9', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user 30 Oct ("tous les éléments sont invisibles, même à complexité > 0, sauf si on zoome très fort"): the corridor selection cached a box ON the airspace record (a._mb), a TypeError on a frozen record emptied the whole reading; nothing of the Map writes on an aerodb record')
def d64(c):
    c.page.add_init_script(_FREEZE_AERO)
    ui = ['cache/maps/ui.json', {'preset': 'auto', 'layers': {'auto': {'detail': 2}}}, 'cache']
    errs = []
    c.page.on('pageerror', lambda e: errs.append(str(e)))
    # the general view: the whole route, read along its corridor
    c.open('maps', docs=fdocs(flight()) + [ui], flight=False, airfields=True, aero_extra={'aerodromes': _COV_ADS, 'cells': _COV_CELLS}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the first reading')
    c.wait(600)
    d = c.js(_DRAWN)
    c.ok(d['corridor'] > 0, f"{d['corridor']}", 'the general view reads along the corridor of the route')
    c.ok(d['airspaces'] > 0 and d['zones'] > 0, f'{d}', 'the airspaces along the route are read and drawn')
    c.eq(c.js("() => Object.isFrozen((window.__mp.S.data.data.airspaces || [])[0] || {})"), True, 'the records are frozen, as on the device', what='frozen')
    # zoom 9 around the departure, complexity +2: the aerodromes are drawn too
    c.open('maps?view=-2.2,46.6,-0.8,47.6', docs=fdocs(flight()) + [ui], flight=False, airfields=True,
           aero_extra={'aerodromes': _COV_ADS, 'cells': _COV_CELLS}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => (window.__mp.S && window.__mp.S.adHits || []).some(h => h.a.icao === 'LFAB')", timeout=12000, what='the aerodromes are drawn at zoom 9')
    d = c.js(_DRAWN)
    c.ok(d['aerodromes'] > 0 and {'LFAB', 'LFAC', 'LFAD'} <= set(d['ads']), f'{d}', 'zoom 9, complexity +2: the aerodromes are read and drawn')
    c.eq(errs, [], 'no error on the page (no write on a frozen record)', what='page errors')


# ------------------------------------------------------------------------------------------------------ D65
# every get of a module's data adapter and every answer of aerodb waits window.__slow ms when it is set
_SLOW_READS = """(() => { const slow = p => window.__slow ? p.then(v => new Promise(r => setTimeout(() => r(v), window.__slow))) : p;
  let fd; Object.defineProperty(window, 'FrameData', { configurable: true, get() { return fd }, set(v) { fd = v;
    if (v && v.adapter && !v.__slow) { const o = v.adapter; v.__slow = 1; v.adapter = function (...a) { const d = o.apply(this, a), g = d.get;
      d.get = (...q) => slow(Promise.resolve(g.apply(d, q))); return d } } } });
  let ab; Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab }, set(v) { ab = v;
    if (v && v.create && !v.__slow) { const o = v.create; v.__slow = 1; v.create = function (...a) { const A = o.apply(this, a);
      for (const k of ['airspaces', 'aerodromes', 'procedure', 'runways', 'coverage']) { const f = A[k]; if (typeof f === 'function') A[k] = (...q) => slow(Promise.resolve(f.apply(A, q))) }
      return A } } } }) })()"""
@case('D65', 'Leaving the Map right after it mounts: no error; the choose mode returns to Fuel only when its pane is closed', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='Features SOG 30 Oct (F41 / F63 under load): a reading awaited at mount resumed after the teardown (readFlight, buildProfile, readSettings) and read the gone state; the return to Fuel is the pane’s ✕ / Escape / Terminer only, never an outside navigation')
def d65(c):
    errs = []
    c.page.on('pageerror', lambda e: errs.append(str(e)))
    # the frame catches an error of a module's mount and logs it: those count too
    c.page.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Error' in m.text and '/modules/maps/' in m.text + str(m.location) else None)
    # the readings of the Map made slow on demand (window.__slow): the teardown always falls during an await
    c.page.add_init_script(_SLOW_READS)
    f = _proc_flight()
    c.open('fuel', docs=fdocs(f) + [list(d) for d in _PROC_DOCS], flight=False, airfields=True, wait=False)
    c.wait(1500)
    for d in (100, 250, 400, 700, 1000):     # leaving at every step of the mount
        c.js("() => { window.__slow = 400; location.hash = '#maps' }")
        c.wait(d)
        c.js("() => { location.replace('#fuel?focus=arr&rwy=31') }")
        c.wait(1500)
    c.js("() => { window.__slow = 0 }")
    c.eq(errs, [], 'leaving the Map at once: no error from a reading that resumes after the teardown', what='page errors')
    # the choose mode left from outside (another module, Back): no return of its own
    _ch_open(c, {'rwy': '31'})
    c.js("() => { location.replace('#fuel') }")
    c.wait(1500)
    hc = [u.split('#', 1)[1] for u in c.js('window.__hc')]
    c.eq(hc, ['fuel'], 'the Map adds no return of its own when it is left from outside', what='address changes')
    c.eq(errs, [], 'and no error either', what='page errors')


# ------------------------------------------------------------------------------------------------------ D66
# LFML with a STAR family (OKRI5L serves 31, OKRI5R serves 13), a lone STAR, and an approach with one entry transition
# OKRI5L passes IAF1, the IAF of I31's transition: a transition the STAR does not lead to is not offered (D77)
_CH2_PROCS = [_proc('LFML', 'STAR', 'OKRI5L', '31', [_pp(1, 'OKR', 44.0, 4.4), _pp(2, 'IAF1', 43.7, 4.6), _pp(3, 'MD31', 43.6, 4.9)],
                    cycle=AERO_CYCLE),
              _proc('LFML', 'STAR', 'OKRI5R', '13', [_pp(1, 'OKR', 44.0, 4.4), _pp(2, 'MD13', 43.6, 5.4)], cycle=AERO_CYCLE),
              _proc('LFML', 'STAR', 'SOLO1', '31', [_pp(1, 'SOL', 44.1, 5.0), _pp(2, 'MD31', 43.6, 4.9)], cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'I31', '31', [_pp(1, 'XF01', 43.52, 4.95), _pp(2, 'RW31', 43.44, 5.20)], cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'I31', '31', [_pp(1, 'IAF1', 43.7, 4.6), _pp(2, 'XF01', 43.52, 4.95)], trans='IAF1', cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'I13', '13', [_pp(1, 'XF13', 43.35, 5.45), _pp(2, 'RW13', 43.4367, 5.215)], cycle=AERO_CYCLE)]
_CH2_FILE = {**_CH_FILE, 'procedures': _CH2_PROCS}


@case('D66', 'Choosing on the Map: a STAR family is one row, its runway resolves it; an approach’s transitions are sub-rows', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False, langs4=True,
      rule='V3 § 10.30 second reading: OKRI5L / OKRI5R are one row "OKRI5" with its runways as tags; a tap chooses the family and narrows the runways, a tap on a runway resolves the record; the chosen approach shows "No transition" then its transitions; the summary reads "I31 via IAF1"; one trip back with apptrans')
def d66(c):
    _ch_open(c, {}, file=_CH2_FILE)
    r = c.js(_CH_ROWS)
    star = [x for x in _grp(r, 'star')['rows'] if x['id'] != 'none']
    c.eq([x['id'] for x in star].count('fam:OKRI5'), 1, 'OKRI5L and OKRI5R make one row', what=f'rows {[x["id"] for x in star]}')
    fam = next(x for x in star if x['id'] == 'fam:OKRI5')
    c.ok(norm(fam['text']).startswith('OKRI5') and '13' in fam['text'] and '31' in fam['text'], fam['text'], 'the row "OKRI5" carries its runways as tags')
    # the family first: no record yet, the selection says the family and its runways
    c.tap('.mp-ch-row[data-id="fam:OKRI5"]')
    c.until("() => !!document.querySelector('.mp-ch-sum[data-fam=star]')", timeout=10000, what='the family in the selection')
    c.eq(dict(c.js(_CH_ROWS)['sums']).get('star'), 'OKRI5 · 13/31', 'the family and its runways while the runway is open', what='summary')
    # the runway resolves it
    c.tap('.mp-ch-row[data-fam="rwy"][data-id="31"]')
    c.until("() => (document.querySelector('.mp-ch-sum[data-fam=star] .mp-ch-sum-v') || {}).textContent === 'OKRI5L'", timeout=10000, what='the record of the family is resolved')
    # the approach, then its transition
    i31 = 'LFML.APP.I31.RW31.NONE'
    c.tap(f'.mp-ch-row[data-id="{i31}"]')
    c.until("() => !!document.querySelector('.mp-ch-subs')", timeout=10000, what='the transitions under the chosen approach')
    subs = c.js("() => [...document.querySelectorAll('.mp-ch-subs .mp-ch-row')].map(b => [b.dataset.id, b.textContent.trim()])")
    c.eq(norm(subs[0][1]), norm(tx(M, 'chNoTrans', c.lang)), '"No transition" first', what='first sub-row')
    c.eq([norm(x[1]) for x in subs[1:]], ['via IAF1'], 'then the transition by its entry (transitionLabelOf)', what='sub-rows')
    c.tap('.mp-ch-subs .mp-ch-row[data-id="LFML.APP.I31.RW31.IAF1"]')
    c.until("() => /IAF1/.test((document.querySelector('.mp-ch-sum[data-fam=app] .mp-ch-sum-v') || {}).textContent || '')", timeout=10000, what='the summary of the approach')
    c.eq(dict(c.js(_CH_ROWS)['sums']).get('app'), 'I31 via IAF1', 'the approach reads "I31 via IAF1"', what='summary')
    q = _back(c, 'done')
    c.eq(q, {'focus': 'arr', 'star': 'LFML.STAR.OKRI5L.RW31.NONE', 'rwy': '31', 'app': i31, 'apptrans': 'LFML.APP.I31.RW31.IAF1'},
         'one trip back with the resolved STAR and the approach transition', what='keys')
    # the runway first: tapping the family resolves it at once
    _ch_open(c, {'rwy': '13'}, file=_CH2_FILE)
    c.tap('.mp-ch-row[data-id="fam:OKRI5"]')
    c.until("() => (document.querySelector('.mp-ch-sum[data-fam=star] .mp-ch-sum-v') || {}).textContent === 'OKRI5R'", timeout=10000, what='runway 13 chosen: the family resolves to OKRI5R')


# ------------------------------------------------------------------------------------------------------ D68
def _dense_base():
    """A dense base around Paris: 2 000 aerodromes, 600 airspaces of 41 points, deterministic."""
    import random
    rnd = random.Random(7)

    def ring(la, lo, r, n=40):
        return [[la + r * math.sin(2 * math.pi * k / n), lo + r * 1.4 * math.cos(2 * math.pi * k / n)] for k in range(n)] + [[la, lo + r * 1.4]]
    ads = [{'icao': f'X{i:03d}', 'name': f'AD {i}', 'lat': 46 + rnd.random() * 4, 'lon': -1 + rnd.random() * 6, 'elev': 100,
            'hardLen': 1500 + rnd.random() * 2000, 'public': True} for i in range(2000)]
    spaces = [{'type': rnd.choice(['CTR', 'TMA', 'R', 'D', 'P']), 'cls': 'D', 'name': f'ZONE {i}', 'lower': rnd.choice(['SFC', '1500 FT', 'FL065']),
               'upper': rnd.choice(['FL115', 'FL195', '4500 FT']), 'rings': [ring(46 + rnd.random() * 4, -1 + rnd.random() * 6, .05 + rnd.random() * .3)]}
              for i in range(600)]
    return ads, spaces, {str(y): [[-2, 7]] for y in range(45, 52)}


@case('D68', 'Panning a dense map: light drawings (lines only) and the kept image carry the gesture, the full drawing waits for rest', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user 30 Oct (« très saccadé (2 fps ?) », then « le freeze de refresh est efficace pour la fluidité, mais gênant pour se déplacer : un intermédiaire ? »): during a pan, a light drawing at most every 120 ms — airspaces, airways, route, aerodromes as symbols, from cached Mercator paths, no label, no collision — each under 8 ms of work (else the kept image alone for the rest of the gesture); between two, the last image follows by its two geographic corners; labels, vectors and collisions at rest (end of the gesture or 150 ms without movement), one full drawing; 16 ms at most per image')
def d68(c):
    ads, spaces, cells = _dense_base()
    c.page.add_init_script(_FREEZE_AERO)
    ui = ['cache/maps/ui.json', {'preset': 'vfr', 'layers': {'vfr': {'detail': 2}}}, 'cache']
    c.open('maps?view=1.6,48.4,3.2,49.2', docs=fdocs(flight()) + [ui], flight=False, airfields=True, airspaces=spaces,
           aero_extra={'aerodromes': ads, 'cells': cells}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.data && (window.__mp.S.data.data.airspaces || []).length > 50 && window.__mp.S.frame && window.__mp.S.frame.ok)",
            timeout=40000, what='the dense map drawn once (MapLibre base)')
    c.wait(800)
    box = c.js("() => { const r = window.__mp.S.box.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] }")
    c.page.mouse.move(box[0], box[1])
    c.wait(500)                                 # the hover of the pointer drawn, then the gesture alone is measured
    c.js("() => performance.clearMeasures()")
    c.page.mouse.down()
    # a continuous drag: 20 moves in a row (no round trip between them, which would let the 150 ms rest pass)
    c.page.mouse.move(box[0] - 400, box[1] - 120, steps=20)
    during = c.js("""() => ({ draws: performance.getEntriesByName('maps:draw').map(e => e.duration),
      follows: performance.getEntriesByName('maps:follow').map(e => e.duration),
      lights: performance.getEntriesByName('maps:light').map(e => e.duration),
      paths: performance.getEntriesByName('maps:light:paths').map(e => e.duration),
      times: [...performance.getEntriesByName('maps:draw').map(e => 'D' + Math.round(e.startTime)), ...performance.getEntriesByName('maps:follow').map(e => 'f' + Math.round(e.startTime))] })""")
    c.page.mouse.up()
    c.until("() => performance.getEntriesByName('maps:draw').length > 0", timeout=4000, what='the full drawing at rest')
    # at rest the full drawing comes back (a second one may follow when the data of the new view arrive)
    # a full drawing during the drag is only the one of rest: 150 ms without movement (a loaded machine can take that long between
    # two pointer steps) — never one following a copy closely; the copies carry the gesture
    seq = sorted(during['times'], key=lambda x: int(x[1:]))
    early = [t for i, t in enumerate(seq) if t[0] == 'D' and (lambda prev: prev and prev[0] == 'f' and int(t[1:]) - int(prev[1:]) < 140)(
        next((x for x in reversed(seq[:i]) if x[0] == 'f'), None) if not (i and seq[i - 1][0] == 'D') else None)]
    c.eq(early, [], 'no full drawing during the gesture (nothing projected again), only at rest', what=f'full drawings while panning {seq}')
    c.ok(len(during['lights']) >= 1, f"lights {during['lights']}, paths {during['paths']}", 'light drawings carry the gesture (lines only)')
    c.le(round(max(during['lights'] or [0]), 1), 8, 'each light drawing under 8 ms of work', what=f"light drawings {[round(x, 1) for x in during['lights']]}")
    c.ok(len(during['follows']) + len(during['lights']) >= 10, f"{len(during['follows'])} copies, {len(during['lights'])} light", 'an image for every step of the gesture')
    worst = max(during['follows'] + during['lights'] or [0])
    c.le(round(worst, 1), 16, 'under 16 ms of work per image of the drag', what=f'worst image {worst:.1f} ms')


# ------------------------------------------------------------------------------------------------------ D67
_AW_JS = """(n) => { const PA = MapsRender.parts.airspace, pl = SiaAero.placer(), cv = document.createElement('canvas'); cv.width = 800; cv.height = 800;
  const ctx = cv.getContext('2d'), toC = (lat, lon) => ({ x: (lon - 1) * 400, y: (47.5 - lat) * 400 }),
    seg = (route, a, b, nm, lower) => ({ route, nm, lower, a: { id: a[0], lat: a[1], lon: a[2] }, b: { id: b[0], lat: b[1], lon: b[2] } }),
    long = seg('A34', ['NEVER', 47.4, 1.5], ['LEBLA', 46.6, 1.5], 22, 6500),
    short = seg('B12', ['TINY1', 47.0, 1.8], ['TINY2', 46.99, 1.8], 1, 3000),
    list = [long, ...Array.from({ length: n }, () => ({ ...long, a: { ...long.a }, b: { ...long.b } })), short],
    profile = { elements: { airwaysLow: true, airwaysHigh: true, awLabels: true } },
    env = { theme: MapsRender.tokens(), pal: MapsRender.palette(false), placer: pl },
    ends = PA.drawAirways(ctx, list, toC, 1, { s: 46, n: 48, w: 0, e: 3 }, pl, profile, 'near', new Set(), env);
  return ends.hits.map(h => h.g.route) }"""


@case('D67', 'One label per airway segment, distance and level on one line, none on a segment shorter than its label', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='user 30 Oct (« toujours ce recouvrement », the leg towards Le Blanc): the same segment read by several boxes of the corridor came as distinct objects, the second slid its label further along the same line; a segment is drawn and labelled once, "22 · F065" on one line, the longer segment kept when two labels would overlap')
def d67(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.until("() => !!(window.MapsRender && window.MapsRender.parts && window.MapsRender.parts.airspace && window.SiaAero)", timeout=10000,
            what='the render parts')
    hits = c.js(_AW_JS, 3)
    c.eq(hits.count('A34'), 1, 'a segment read four times (four boxes of the corridor) is labelled once', what=f'labels {hits}')
    c.eq(hits.count('B12'), 0, 'a segment shorter on screen than its label has none (its line stays)', what=f'labels {hits}')


# ------------------------------------------------------------------------------------------------------ D69
_SET_HL = "async (id) => { (await import('/modules/maps/choose.js')).setHl(id) }"


@case('D69', 'Choosing on the Map, third reading: the highlighted procedure drawn last, one label per family, any row highlights, the summary leads to its group', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='V3 § 10.30 third reading: the highlighted procedure is drawn last with its own label (its full name) over the others; one small label per family and point ("OKRI 5"), never one per procedure of a family; hovering a row of any family highlights its trace; a tap on a summary label scrolls to its group and unfolds it')
def d69(c):
    # a family: one label "OKRI 5" at the shared entry point; highlighted, its own label with the full name, drawn last
    _ch_open(c, {'rwy': '31'}, file=_CH2_FILE)
    L = c.js(_CH_LAYOUT, ['', 'star'])
    c.ok(any('fam:OKRI5' in g for g in L['groups']) and sum(g.count('fam:OKRI5') for g in L['groups']) == 1, f"{L['groups']}",
         'the family OKRI5 has one line in one label, not one per procedure')
    c.js(_SET_HL, 'fam:OKRI5')
    L = c.js(_CH_LAYOUT, ['fam:OKRI5', 'star'])
    c.eq(L['last'], 'fam:OKRI5', 'the highlighted procedure is drawn last, over the others', what='last trace')
    c.eq(L['hl'] and L['hl']['rows'], ['fam:OKRI5'], 'it has its own label, placed first (above)', what='highlighted label')
    c.ok(L['hl'] and L['hl']['text'] in ('OKRI5L', 'OKRI5R'), f"{L['hl']}", 'with the full name of the procedure')
    c.ok(not any('fam:OKRI5' in g for g in L['groups']), f"{L['groups']}", 'and no longer in the small labels')
    # hovering a row of another family (the approaches while the STARs were touched): its trace is drawn and highlighted
    i31 = 'LFML.APP.I31.RW31.NONE'
    c.js(_SET_HL, i31)
    L = c.js(_CH_LAYOUT, [i31, 'app'])
    c.ok(i31 in L['traced'] and L['last'] == i31, f"{L['traced']}", 'an approach hovered while the STARs are the family touched: drawn, last')
    c.js(_SET_HL, None)
    L = c.js(_CH_LAYOUT, ['', 'app'])
    c.ok(i31 not in L['traced'], f"{L['traced']}", 'leaving the row gives back the previous state')
    # the summary is the table of contents: a tap on "Approach" scrolls to its group and unfolds it
    _ch_open(c, {'rwy': '13', 'star': 'LFML.STAR.OKRI5R.RW13.NONE'}, file=_CH2_FILE)
    c.ok(c.count('.mp-ch-fold[data-more=app]') == 1, 'no fold line', 'I31 does not fit runway 13: the approaches are folded')
    c.tap('.mp-ch-sum-k[data-goto=app]')
    c.until("() => (document.querySelector('.mp-ch-fold[data-more=app]') || {}).getAttribute && document.querySelector('.mp-ch-fold[data-more=app]').getAttribute('aria-expanded') === 'true'",
            what='the approaches unfold')
    top = c.js("() => { const g = document.querySelector('.mp-ch-grp[data-fam=app]').getBoundingClientRect(), b = window.__mp.S.dbodyEl.getBoundingClientRect(); return [g.top, b.top, b.bottom] }")
    c.ok(top[1] - 2 <= top[0] <= top[2], f'{top}', 'the group of the approaches is in view')
    c.eq(c.count('.mp-ch-sum[data-fam=app] .mp-ch-x'), 0, 'no ✕ on a family not chosen (only its label)', what='clear buttons')


# ------------------------------------------------------------------------------------------------------ D70
# LFML as the SIA publishes it: two finals to 31 (ILS, RNP), and initial approach segments "INA RNAV RWY 31" published once for every
# final of the runway: ODILO 1A ends on the finals' IF (XF01), ABC 1A shares no point with them
_CH3_PROCS = [_proc('LFML', 'STAR', 'S1A', '31', [_pp(1, 'ENT1', 43.95, 4.3), _pp(2, 'MD31', 43.6, 4.9)], cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'ILS RWY 31', '31', [_pp(1, 'XF01', 43.52, 4.95), _pp(2, 'RW31', 43.44, 5.20)], cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'RNP RWY 31', '31', [_pp(1, 'XF02', 43.55, 4.9), _pp(2, 'RW31', 43.44, 5.20)], cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'INA RNAV RWY 31', '31', [_pp(1, 'ODILO', 43.75, 4.6), _pp(2, 'XF01', 43.52, 4.95)], trans='ODILO 1A',
                    cycle=AERO_CYCLE),
              _proc('LFML', 'APP', 'INA RNAV RWY 31', '31', [_pp(1, 'ABC1', 43.8, 5.3), _pp(2, 'ABC2', 43.7, 5.25)], trans='ABC 1A',
                    cycle=AERO_CYCLE)]
_CH3_FILE = {**_CH_FILE, 'procedures': _CH3_PROCS}


@case('D70', 'Choosing on the Map: approaches by their short label, the SIA’s initial segments as transitions in the hue of their final', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='V3 § 10.30 fourth reading: the rows are the finals (appChoices().list) by labelOf ("ILS 31", "RNP 31"), the published name in the title, no runway tag the label already says, the same label on the map; the INA records are sub-rows of the chosen final (transitionLabelOf, "via ODILO 1A", "via ABC1 · ABC 1A" when the name does not start with the IAF), in its hue; a transition sharing no point with its final joins it by a dashed line')
def d70(c):
    _ch_open(c, {'rwy': '31'}, file=_CH3_FILE)
    rows = c.js("() => [...document.querySelectorAll('.mp-ch-grp[data-fam=app] .mp-ch-row')].filter(b => b.dataset.id !== 'none').map(b => [b.dataset.id, b.querySelector('.mp-ch-name').textContent.trim(), b.title, b.style.getPropertyValue('--c')])")
    c.eq(sorted(r[1] for r in rows), ['ILS 31', 'RNP 31'], 'the finals only, by their short label (the INA segments are not rows)', what='approach rows')
    ils = next(r for r in rows if r[1] == 'ILS 31')
    c.ok('ILS RWY 31' in ils[2], ils[2], 'the published name in the row’s title')
    tags = c.js("() => [...document.querySelectorAll('.mp-ch-grp[data-fam=app] .mp-ch-row .mp-ch-tag')].map(t => t.textContent.trim())")
    c.eq(tags, [], 'no runway tag where the label already says it ("ILS 31", not "ILS 31 31")', what='approach tags')
    # the map's small labels (the approaches touched) read the list's label, not the published name
    c.js("""async () => { window.__chT = []; const o = CanvasRenderingContext2D.prototype.fillText;
      if (!o.__ch) { CanvasRenderingContext2D.prototype.fillText = function (t, x, y, w) { window.__chT.push(String(t)); return o.call(this, t, x, y, w) };
        CanvasRenderingContext2D.prototype.fillText.__ch = true }
      window.__mp.S.choose.focus = 'app'; (await import('/modules/maps/draw.js')).schedule(); return true }""")
    c.until("() => (window.__chT || []).some(t => /^(ILS|RNP) /.test(t))", timeout=6000, what='the approaches’ labels drawn')
    drawn = sorted({t for t in c.js('window.__chT') if re.match(r'^(ILS|RNP) ', t)})
    c.eq(drawn, ['ILS 31', 'RNP 31'], 'the map labels the approaches as the list does', what='map labels')
    c.tap(f'.mp-ch-row[data-id="{ils[0]}"]')
    c.until("() => !!document.querySelector('.mp-ch-subs')", timeout=10000, what='the transitions under the chosen final')
    subs = c.js("() => [...document.querySelectorAll('.mp-ch-subs .mp-ch-row')].filter(b => b.dataset.id !== 'none').map(b => [b.dataset.id, b.querySelector('.mp-ch-name').textContent.trim(), b.style.getPropertyValue('--c')])")
    c.eq(sorted(norm(x[1]) for x in subs), ['via ABC1 · ABC 1A', 'via ODILO 1A'], 'the SIA’s initial segments as transitions (transitionLabelOf)', what='sub-rows')
    c.ok(all(x[2] == ils[3] for x in subs), f'{subs} vs {ils[3]}', 'each transition in the hue of its final')
    # ABC 1A shares no point with the ILS: a dashed junction to the final's first point; ODILO 1A ends on its IF: none
    abc = next(x[0] for x in subs if 'ABC' in x[1])
    c.tap(f'.mp-ch-subs .mp-ch-row[data-id="{abc}"]')
    c.until("(id) => (document.querySelector(`.mp-ch-subs .mp-ch-row[data-id=\"${id}\"]`) || {}).getAttribute && document.querySelector(`.mp-ch-subs .mp-ch-row[data-id=\"${id}\"]`).getAttribute('aria-pressed') === 'true'", abc,
            what='ABC 1A chosen')
    joins = c.js("""async () => { const C = await import('/modules/maps/choose.js'), S = window.__mp.S, L = C.chooseLayout(document.createElement('canvas').getContext('2d'), S.toC);
      return L.traces.filter(t => t.join).map(t => t.it.id) }""")
    c.eq(joins, [abc], 'a dashed junction from ABC 1A to the final', what='junctions')
    odilo = next(x[0] for x in subs if 'ODILO' in x[1])
    c.tap(f'.mp-ch-subs .mp-ch-row[data-id="{odilo}"]')
    c.wait(300)
    joins = c.js("""async () => { const C = await import('/modules/maps/choose.js'), S = window.__mp.S, L = C.chooseLayout(document.createElement('canvas').getContext('2d'), S.toC);
      return L.traces.filter(t => t.join).length }""")
    c.eq(joins, 0, 'ODILO 1A ends on the final’s IF: no junction', what='junctions')


# ------------------------------------------------------------------------------------------------------ D71
_LFAB_RWY = {'schema': 1, 'icao': 'LFAB', 'cycle': AERO_CYCLE, 'updated_at': '2025-01-02T00:00:00Z', 'procedures': [],
             'runways': [{'id': '09', 'lat': 47.30, 'lon': -1.7560, 'elev': 50, 'qfu': 90}, {'id': '27', 'lat': 47.30, 'lon': -1.7440, 'elev': 50, 'qfu': 270}]}
_AD_STATE = """() => { const S = window.__mp.S, z = MapsRender.zoomOf(S.canvas.clientWidth / (S.fit.e - S.fit.w)), h = (S.adHits || []).find(h => h.a.icao === 'LFAB');
  return { zoom: z, label: h ? h.a.label || null : 'absent', rwys: (window.__pr.runwayArrows(S.toC, z) || []).filter(w => w.lw === 1.6).map(w => w.name).sort() } }"""


@case('D71', 'From the airline’s zoom, every drawn aerodrome shows its runways’ numbers and its name next to its code', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='V3 § 10.30 fourth reading, point 3: from runwayZoom, each runway of each aerodrome drawn carries its number at its threshold (with the 24 px vector), in the collision pass with the aerodromes’ priority; the aerodrome’s label reads its code and its name (adTitle of frame/lib/adnames.js); below the zoom nothing changes')
def d71(c):
    docs = fdocs(flight()) + [['proc/manual/LFAB.json', _LFAB_RWY, 'reference'], ['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']]
    # zoom ≈ 12 over LFAB, off the route
    c.open('maps?view=-1.80,47.28,-1.70,47.32', docs=docs, flight=False, airfields=True, aero_extra={'aerodromes': _COV_ADS, 'cells': _COV_CELLS}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && (window.__mp.S.adHits || []).some(h => h.a.icao === 'LFAB'))", timeout=12000, what='LFAB is drawn')
    c.until("() => !!(window.__mp.S.adRwys && (window.__mp.S.adRwys.get('LFAB') || []).length)", timeout=8000, what='its runways are read')
    c.until("() => (window.__mp.S.adHits || []).some(h => h.a.icao === 'LFAB' && h.a.label)", timeout=6000, what='the label with the name')
    st = c.js(_AD_STATE)
    c.ok(st['zoom'] >= 11, f"{st['zoom']:.1f}", 'the view is above the airline’s zoom (11)')
    want = c.js("async () => (await import('/frame/lib/adnames.js')).adTitle({ icao: 'LFAB', name: 'AB TEST' }, 'LFAB')")
    c.ok(want.startswith('LFAB '), want, 'adTitle gives the code then the name')
    c.eq(st['label'], want, 'the aerodrome reads its code and its name (adTitle, the name rule of § 10.27)', what='aerodrome label')
    c.eq(st['rwys'], ['09', '27'], 'both runways of LFAB as vectors with their numbers', what='runways of an aerodrome off the route')
    # below the zoom: the code alone, no runway
    c.open('maps?view=-3.2,46.4,-0.2,48.2', docs=docs, flight=False, airfields=True, aero_extra={'aerodromes': _COV_ADS, 'cells': _COV_CELLS}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && (window.__mp.S.adHits || []).some(h => h.a.icao === 'LFAB'))", timeout=12000, what='LFAB is drawn far out')
    st = c.js(_AD_STATE)
    c.ok(st['zoom'] < 11, f"{st['zoom']:.1f}", 'the view is below the airline’s zoom')
    c.eq([st['label'], st['rwys']], [None, []], 'below the zoom: the code alone, no runway', what='far out')


# ------------------------------------------------------------------------------------------------------ D72
@case('D72', 'Choosing on the Map: the STARs entering on the typed route come first, the others marked with their entry', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False, langs4=True,
      rule='V3 § 10.31: a second axis beside the runway — the SID whose exit, the STAR whose entry is on the typed route comes first ("towards your route", compatible({ route })), the others after, marked "entry OKRIX" (exitOf / entryOf); the incompatible ones stay folded')
def d72(c):
    f = flight()
    f['route']['points'] = f['route']['points'][:-1] + [{'id': 'EN05', 'lat': 44.15, 'lon': 4.7}] + f['route']['points'][-1:]
    f['route']['procedures'] = {'dep': {}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-29T10:00:00Z'}
    docs = [['proc/manual/LFML.json', _CH_FILE, 'reference'], ['proc/manual/LFRS.json', _LFRS_FILE, 'reference']]
    c.open('maps?choose=arr&icao=LFML', docs=fdocs(f) + docs, flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.choose && window.__mp.S.choose.ready)", timeout=12000, what='the choose mode is ready')
    c.until("() => !!document.querySelector('.mp-ch-grp[data-fam=star] .mp-ch-row')", timeout=12000, what='the pane is drawn')
    g = c.js("""() => { const g = document.querySelector('.mp-ch-grp[data-fam=star]');
      return { subh: ((g.querySelector('.mp-ch-subh') || {}).textContent || '').trim(),
        rows: [...g.querySelectorAll('.mp-ch-row')].filter(b => b.dataset.id !== 'none').map(b => [b.querySelector('.mp-ch-name').textContent.trim(), ((b.querySelector('.mp-ch-off') || {}).textContent || '').trim()]) } }""")
    c.eq(g['subh'], tx(M, 'chToRoute', c.lang), '"Towards your route" heads the STARs entering on the route', what='label')
    c.eq(g['rows'][0], ['S5A', ''], 'S5A, whose entry EN05 is on the typed route, comes first, unmarked', what='first STAR')
    entry = tx(M, 'chEntry', c.lang)
    c.ok(all(off == entry.replace('{p}', 'ENT1' if n in ('S1A', 'S2A') else f'EN0{n[1]}') for n, off in g['rows'][1:]), f"{g['rows']}",
         'the others follow, each marked with its entry')


# ------------------------------------------------------------------------------------------------------ D73
_CH_VIEW = """() => { const S = window.__mp.S, b = S.map && S.map.getBounds && S.map.getBounds();
  return b ? { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() } : S.fit }"""


@case('D73', 'Choosing on the Map: the view frames the aerodrome and its compatible procedures, a chosen one widens it', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='V3 § 10.31 (usage walk of 30/10, point 3): the choose view frames the aerodrome, its runways and the points of the compatible procedures within 40 NM of it — the far STAR entries stay out; a chosen procedure that leaves the view widens it to that procedure alone')
def d73(c):
    _ch_open(c, {})
    fit = c.js("() => window.__mp.S.fit")
    c.ok(fit['s'] < 43.44 < fit['n'] and fit['w'] < 5.2 < fit['e'], f'{fit}', 'the aerodrome is in the frame')
    c.ok(fit['s'] < 43.6 and fit['w'] < 4.9, f'{fit}', 'the STARs’ points near the aerodrome (MD.., 16 NM) are in the frame')
    c.ok(fit['n'] < 43.95, f'{fit}', 'the far entries (EN.., 50 NM and more) stay out of the frame')
    c.js("async ([id]) => (await import('/modules/maps/choose.js')).choosePick('star', id)", [_CH_STAR1])
    c.until(f"() => {{ const v = ({_CH_VIEW})(); return v.n >= 43.95 && v.w <= 4.3 }}", timeout=6000, what='the view widened to S1A’s entry ENT1')
    v = c.js(_CH_VIEW)
    c.ok(v['n'] < 44.2, f'{v}', 'the view widens to the chosen STAR alone, not to every entry (EN09 at 44.35)')


# ------------------------------------------------------------------------------------------------------ D74
# a direct route LFRS LFML (no point, no airway): three STARs of 31 — S1A enters from the north-west (towards LFRS), S9A from the north,
# SEA from the south-east
_DIR_FILE = {**_CH_FILE, 'procedures': [_ch_star(1, ['31']), _ch_star(9, ['31']),
                                        _proc('LFML', 'STAR', 'SEA', '31', [_pp(1, 'SUDEE', 42.90, 5.95), _pp(2, 'MDSE', 43.30, 5.40)], cycle=AERO_CYCLE)]}


@case('D74', 'Choosing on the Map: on a direct route the STARs are ranked by their heading from the other aerodrome, an arrow on each row', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False, langs4=True,
      rule='V3 § 10.31 (usage walk of 30/10, point 4): a route with no point and no airway between the aerodromes says nothing about "your route" — no "entry X" repeating the name; the SIDs rank by the angle between their exit and the great circle to the arrival, the STARs by their entry and the great circle from the departure ("Towards LFRS" over the rows within 60° when others follow); each row has a small arrow along its heading')
def d74(c):
    f = flight()
    f['route']['points'] = [f['route']['points'][0], f['route']['points'][-1]]
    f['route']['text'] = 'LFRS LFML'
    f['route']['procedures'] = {'dep': {}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-29T10:00:00Z'}
    docs = [['proc/manual/LFML.json', _DIR_FILE, 'reference'], ['proc/manual/LFRS.json', _LFRS_FILE, 'reference']]
    c.open('maps?choose=arr&icao=LFML', docs=fdocs(f) + docs, flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.choose && window.__mp.S.choose.ready)", timeout=12000, what='the choose mode is ready')
    c.until("() => !!document.querySelector('.mp-ch-grp[data-fam=star] .mp-ch-row')", timeout=12000, what='the pane is drawn')
    g = c.js("""() => { const g = document.querySelector('.mp-ch-grp[data-fam=star]');
      return { subh: ((g.querySelector('.mp-ch-subh') || {}).textContent || '').trim(), offs: g.querySelectorAll('.mp-ch-off').length,
        rows: [...g.querySelectorAll('.mp-ch-row')].filter(b => b.dataset.id !== 'none').map(b => [b.querySelector('.mp-ch-name').textContent.trim(),
          (b.querySelector('.mp-ch-dir') || { getAttribute: () => null }).getAttribute('aria-label')]) } }""")
    c.eq(g['offs'], 0, 'no "entry X" on a direct route', what='entry marks')
    c.eq([r[0] for r in g['rows']], ['S1A', 'S9A', 'SEA'], 'the STAR entering from the departure’s side first, the one from the south-east last',
         what='order')
    c.eq(g['subh'], tx(M, 'chToward', c.lang).replace('{icao}', 'LFRS'), '"Towards LFRS" heads the rows within 60°', what='label')
    head = tx(M, 'chDir', c.lang)
    pre, post = head.split('{c}')
    c.ok(all(a and a.startswith(pre) and a.endswith(post) for _, a in g['rows']), f"{g['rows']}", 'each row has its arrow, read "heading NNN°"')
    # SEA enters from the south-east: it flies north-west, towards the aerodrome
    deg = int(g['rows'][2][1][len(pre):len(g['rows'][2][1]) - len(post)])
    c.ok(290 <= deg <= 330, f'{deg}', 'SEA’s arrow points north-west, its way in to the aerodrome')


# ------------------------------------------------------------------------------------------------------ D75
# a TMA far from the route (100 NM south of LUGEN–NEPIX), named the foreign way (« TMA FARVILLE »: the type in the name)
_FAR_TMA = {'type': 'TMA', 'cls': 'D', 'name': 'TMA FARVILLE', 'lower': 'FL200', 'upper': 'FL300',
            'rings': [[[43.2, 0.3], [43.2, 0.9], [43.7, 0.9], [43.7, 0.3], [43.2, 0.3]]]}
_CORR_STATE = """async () => { const S = window.__mp.S, V = await import('/modules/maps/sheet_view.js'); S.legend = true; V.legendSync();
  return { corridor: S.data ? S.data.corridor : null, far: ((S.data && S.data.data.airspaces) || []).some(a => a.name === 'TMA FARVILLE'),
    legend: S.legendEl.textContent.replace(/\\s+/g, ' ').trim() } }"""
_TEXT_HOOK = """() => { window.__chT = []; const o = CanvasRenderingContext2D.prototype.fillText;
  if (!o.__ch) { CanvasRenderingContext2D.prototype.fillText = function (t, x, y, w) { window.__chT.push(String(t)); return o.call(this, t, x, y, w) };
    CanvasRenderingContext2D.prototype.fillText.__ch = true } return true }"""


@case('D75', 'Layers: "Around the flight only" at the top, said in the title and the "i" chip; unticked, the whole view at the same density', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False, langs4=True,
      rule='user 30 Oct (France / Spain at zoom 7.5: nothing away from the route "même en augmentant la complexité"): the corridor reading is an explicit box at the top of Layers, "Around the flight only (faster)", "otherwise the whole view", ticked by default and kept on the device; ticked, the pane title ends "· around the flight" and the "i" chip says nothing is read outside; unticked, the whole view is read and filtered by complexity only, except a view wider than 600 NM (corridor imposed, said in the chip); a name carrying its type ("TMA FARVILLE") reads the type once')
def d75(c):
    ui = ['cache/maps/ui.json', {'preset': 'auto', 'layers': {'auto': {'detail': 2}}}, 'cache']
    view = 'maps?view=-1.5,42.2,3.5,45.2'
    c.open(view, docs=fdocs(flight()) + [ui], flight=False, airfields=True, airspaces=[_FAR_TMA], wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the first reading')
    c.wait(400)
    st = c.js(_CORR_STATE)
    c.eq([st['corridor'] > 0, st['far']], [True, False], 'ticked by default: read along the flight, the far TMA is not read', what='ticked')
    c.ok(norm(tx(M, 'lgCorr', c.lang)) in norm(st['legend']), st['legend'], 'the "i" chip says nothing is read outside the corridor')
    # the box heads the Layers content; the title says it
    c.js("async () => (await import('/modules/maps/layers.js')).toggleLayers(true)")
    c.until("() => !!document.querySelector('.mp-layer-set input[data-layer]')", what='the Layers content')
    first = c.js("() => document.querySelector('.mp-layer-set input[data-layer]').dataset.layer")
    c.eq(first, 'corridor', '"Around the flight only" is the first box of Layers', what='first box')
    lab = c.js("() => document.querySelector('.mp-layer-set input[data-layer=corridor]').closest('label').textContent.replace(/\\s+/g, ' ').trim()")
    c.ok(norm(tx(M, 'corridor', c.lang, after='layerNames: {')) in norm(lab) and norm(tx(M, 'corrSub', c.lang)) in norm(lab), lab,
         'its label and sub-label')
    title = c.js("() => document.querySelector('.mp-dtitle').textContent")
    c.ok(norm(title).endswith(norm(tx(M, 'ttlCorr', c.lang))), title, 'the pane title ends with "around the flight"')
    # unticked: the whole view, the far TMA read and drawn, its type written once
    c.js(_TEXT_HOOK)
    c.tap('.mp-layer-set input[data-layer=corridor]')
    c.until("() => { const S = window.__mp.S; return !!(S.data && S.data.corridor === 0) }", timeout=12000, what='the whole view is read')
    st = c.js(_CORR_STATE)
    c.eq([st['corridor'], st['far']], [0, True], 'unticked: the whole view, the far TMA read', what='unticked')
    c.ok(norm(tx(M, 'lgCorr', c.lang)) not in norm(st['legend']), st['legend'], 'the chip no longer speaks of the corridor')
    title = c.js("() => document.querySelector('.mp-dtitle').textContent")
    c.ok(not norm(title).endswith(norm(tx(M, 'ttlCorr', c.lang))), title, 'the title no longer says "around the flight"')
    c.until("() => (window.__chT || []).some(t => /FARVILLE/.test(t))", timeout=8000, what='the far TMA labelled')
    names = sorted({t for t in c.js('window.__chT') if 'FARVILLE' in t})
    c.ok(not any('TMA TMA' in t for t in names), f'{names}', 'the type is written once ("TMA FARVILLE", not "TMA TMA FARVILLE")')
    c.eq(c.js("() => ((window.__mp.S.layers || {}).auto || {}).corridor"), False, 'the choice is kept on the device', what='kept')
    # a continent view (wider than 600 NM): the corridor imposed, said in the chip
    c.open('maps?view=-8,38,14,52', docs=fdocs(flight()) + [['cache/maps/ui.json', {'preset': 'auto', 'layers': {'auto': {'detail': 2, 'corridor': False}}}, 'cache']],
           flight=False, airfields=True, airspaces=[_FAR_TMA], wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the continent reading')
    c.wait(400)
    st = c.js(_CORR_STATE)
    c.ok(st['corridor'] > 0, f"{st['corridor']}", 'wider than 600 NM: around the flight even unticked')
    c.ok(norm(tx(M, 'lgCorrWide', c.lang)) in norm(st['legend']), st['legend'], 'the chip says the view is too wide')


# ------------------------------------------------------------------------------------------------------ D76
_LAYERS_AT = """() => { const b = document.querySelector('[data-mp=layers]'), g = document.querySelector('.mp-grip'), r = b && b.getBoundingClientRect(),
  q = g.getBoundingClientRect(), box = document.querySelector('.mp-box').getBoundingClientRect();
  return { inHead: !!(b && b.closest('.mp-dhead')), leftOfGrip: !!r && r.right <= q.left + 1, sameLine: !!r && Math.abs((r.top + r.bottom) / 2 - (q.top + q.bottom) / 2) < 12,
    belowMap: !!r && r.top >= box.bottom - 1, shown: !!(b && window.__t.shown(b)), cornerButtons: document.querySelectorAll('.f-ov-left .f-ov-btn').length,
    sheet: document.querySelector('.mp-data') && !document.querySelector('.mp-data').hidden } }"""


@case('D76', 'The Layers button sits on the sheet’s line, left of its grip; the map’s corner keeps only the view’s commands', 'D', tags=('maps', 'sheet'),
      screens=False, designs=('standard',), night=False,
      rule='user 30 Oct (« l’onglet Couches en haut, alors que le volet est en bas… »): a button and the pane it opens are neighbours — Layers is a chip of the sheet’s head, left of the grip, on a phone and a computer alike; nothing stays in the map’s top left corner; without a profile (no flight) the sheet is its head line alone and Layers is still reachable')
def d76(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof)", timeout=12000, what='the profile is drawn')
    at = c.js(_LAYERS_AT)
    c.eq([at['inHead'], at['leftOfGrip'], at['sameLine'], at['belowMap'], at['shown']], [True] * 5,
         'Layers on the sheet’s line, left of the grip, under the map', what=f'{at}')
    c.eq(at['cornerButtons'], 0, 'no button left in the map’s top left corner', what='corner buttons')
    c.tap('[data-mp=layers]')
    c.until("() => window.__mp.S.dpanel === 'layers'", what='Layers opens in the sheet')
    c.eq(c.attr('[data-mp=layers]', 'aria-pressed'), 'true', 'the chip says the content is open', what='pressed')
    c.tap('[data-mp=layers]')
    c.until("() => window.__mp.S.dpanel !== 'layers'", what='a second tap closes it')
    # nothing to draw (a mission without map: no profile): the sheet is its head line, Layers reachable
    c.open('maps?mission=NOSUCH1')
    c.js(_STATE_JS)
    c.wait(1200)
    at = c.js(_LAYERS_AT)
    c.eq([at['sheet'], at['shown'], at['inHead']], [True, True, True], 'with nothing drawn the sheet keeps its head line with Layers', what=f'{at}')
    c.eq(c.js("() => window.__mp.S.sh.pos"), 'collapsed', 'the empty sheet is reduced to its head line', what='sheet position')


# ------------------------------------------------------------------------------------------------------ D77
# _CH3 plus a STAR S2A that ends on ODILO (the IAF of the transition ODILO 1A); S1A ends on MD31, on no transition
_CH4_FILE = {**_CH_FILE, 'procedures': _CH3_PROCS + [_proc('LFML', 'STAR', 'S2A', '31', [_pp(1, 'ENT2', 44.1, 4.2), _pp(2, 'ODILO', 43.75, 4.6)],
                                                           cycle=AERO_CYCLE)]}
_ILS31 = 'LFML.APP.ILS RWY 31.RW31.NONE'
_SUBS_JS = """() => [...document.querySelectorAll('.mp-ch-subs .mp-ch-row')].filter(b => b.dataset.id !== 'none').map(b => b.querySelector('.mp-ch-name').textContent.trim())"""
_PICK_JS = "async ([f, id]) => (await import('/modules/maps/choose.js')).choosePick(f, id)"


@case('D77', 'Choosing on the Map: no approach transition is offered that the chosen STAR does not lead to', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='usage walk of 30 Oct, point 6 (STAR AMB 9E offered with the transition MOLBA 1E, east of Paris, the STAR ending west): under the chosen approach, a transition whose IAF is not on the chosen STAR (its points, its end included) is not offered (PR.compatible({ star })); a STAR chosen after an incompatible transition sets it back to "None"')
def d77(c):
    _ch_open(c, {'rwy': '31'}, file=_CH4_FILE)
    c.js(_PICK_JS, ['app', _ILS31])
    c.until("() => !!document.querySelector('.mp-ch-subs')", timeout=10000, what='the transitions under the ILS')
    c.eq(sorted(norm(x) for x in c.js(_SUBS_JS)), ['via ABC1 · ABC 1A', 'via ODILO 1A'], 'no STAR chosen: every transition of the final', what='transitions')
    # a transition chosen first, then a STAR that does not lead to it: back to "None"
    c.js(_PICK_JS, ['appTrans', 'LFML.APP.INA RNAV RWY 31.RW31.ABC 1A'])
    c.js(_PICK_JS, ['star', 'LFML.STAR.S2A.RW31.NONE'])
    c.wait(300)
    c.eq([norm(x) for x in c.js(_SUBS_JS)], ['via ODILO 1A'], 'STAR S2A ends on ODILO: only ODILO 1A is offered', what='transitions with S2A')
    c.eq(c.js("() => window.__mp.S.choose.sel.appTrans"), None, 'the transition ABC 1A, which S2A does not lead to, is set back to "None"',
         what='chosen transition')
    # a STAR that leads to none: "No transition" alone
    c.js(_PICK_JS, ['star', 'LFML.STAR.S1A.RW31.NONE'])
    c.wait(300)
    c.eq(c.js(_SUBS_JS), [], 'STAR S1A leads to no transition: "No transition" alone', what='transitions with S1A')


# ------------------------------------------------------------------------------------------------------ D78
_CH_SHEET = """() => { const d = document.querySelector('.mp-dbody'), r = d.getBoundingClientRect(), b = document.querySelector('.mp-ch-done').getBoundingClientRect(),
  h = document.querySelector('.mp-ch-hint');
  return { pos: document.querySelector('[data-module=maps]').dataset.sheet, scrolls: d.scrollHeight > d.clientHeight + 1,
    doneIn: b.top >= r.top - 1 && b.bottom <= r.bottom + 1, hint: window.__t.shown(h), layers: window.__t.shown(document.querySelector('[data-mp=layers]')) } }"""


@case('D78', 'Choosing on the Map: the pane opens tall, its hint shown, "Done" always in sight at the foot', 'D', tags=('maps', 'sheet'),
      screens=False, designs=('standard',), night=False,
      rule='usage walk of 30 Oct, point 7 (240 px of pane at 1280 px, 164 at 390, "Terminer" out of sight, the hint hidden): the choose pane opens the sheet expanded, the hint is shown from the start, "Done" sticks to the foot of the body however far the rows scroll; Layers is not offered while choosing')
def d78(c):
    _ch_open(c, {}, file=_CH_FILE)
    c.until("() => document.querySelector('[data-module=maps]').dataset.sheet === 'expanded'", timeout=6000, what='the sheet expanded')
    c.wait(300)
    st = c.js(_CH_SHEET)
    c.eq([st['pos'], st['hint'], st['doneIn'], st['layers']], ['expanded', True, True, False], 'expanded, the hint shown, "Done" in sight, no Layers',
         what=f'{st}')
    c.js("() => { const d = document.querySelector('.mp-dbody'); d.scrollTop = d.scrollHeight }")
    c.wait(200)
    st = c.js(_CH_SHEET)
    c.ok(st['doneIn'], f'{st}', '"Done" stays in sight with the rows scrolled to the end')
    c.js("() => { const d = document.querySelector('.mp-dbody'); d.scrollTop = 0 }")
    c.wait(200)
    c.ok(c.js(_CH_SHEET)['doneIn'], 'out of sight at the top', '"Done" stays in sight with the rows at the top')


# ------------------------------------------------------------------------------------------------------ D79
_CH_PAINT = """async ([full, reserved]) => { const C = await import('/modules/maps/choose.js'), S = window.__mp.S, cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 900; const ctx = cv.getContext('2d'), got = [], o = ctx.fillText;
  ctx.fillText = function (t, x, y, w) { got.push(String(t)); return o.call(this, t, x, y, w) };
  const L = C.chooseLayout(ctx, S.toC, 1200, 900), pl = SiaAero.placer();
  if (reserved) L.reserve(pl);                                   // the screen's reservations first, as in the drawing
  if (full) pl.add({ x0: -1e5, y0: -1e5, x1: 1e5, y1: 1e5 });   // every place taken afterwards (beacon boxes everywhere)
  L.paint(ctx, pl);
  return { ad: L.ad ? L.ad.text : null, numbers: got.filter(t => /^\\d\\d[LRC]?$/.test(t)).sort() } }"""


@case('D79', 'Choosing on the Map: the aerodrome’s code above the procedures, once; runway numbers give way to what is already placed', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='usage walk of 30 Oct, point 8 (LFBO hidden under the procedures, "14R" over "(D) TOU 117.7"): in the choose mode the aerodrome’s code takes its place before any procedure cartouche and is written above the veil, once (the dimmed route does not repeat it); the runway numbers are in the collision pass and reserve their place before the beacons (user: « a minima le numéro de piste au seuil »): what comes later gives way; a number whose place was already taken is not written, its vector stays')
def d79(c):
    _ch_open(c, {}, file=_CH_FILE)
    c.js(_TEXT_HOOK)
    c.js("async () => (await import('/modules/maps/draw.js')).schedule()")
    c.until("() => (window.__chT || []).includes('LFML')", timeout=8000, what='the aerodrome’s code drawn')
    c.wait(300)
    c.eq(c.js("() => window.__chT.filter(t => t === 'LFML').length"), 1, 'LFML written once (no second label under the veil, none by the route)',
         what='LFML labels')
    free = c.js(_CH_PAINT, [False, False])
    c.eq(free['ad'], 'LFML', 'the choose layout carries the aerodrome’s code', what='code')
    c.eq(free['numbers'], ['13', '31'], 'with room, both runway numbers are written', what='numbers with room')
    full = c.js(_CH_PAINT, [True, False])
    c.eq(full['numbers'], [], 'no room (every place taken before): no number written, the vectors stay', what='numbers without room')
    first = c.js(_CH_PAINT, [True, True])
    c.eq(first['numbers'], ['13', '31'], 'reserved first, the numbers are written though every place is taken afterwards (beacons give way)',
         what='numbers reserved before the beacons')


# ------------------------------------------------------------------------------------------------------ D80
_CONS_BOXES = """async () => { const S = window.__mp.S, ctx = S.pc.getContext('2d'), got = [], o = ctx.fillText, P = await import('/modules/maps/procs.js');
  const g = { ...S.geo, taken: [...(S.geo.taken || [])] }, before = g.taken.length;
  ctx.fillText = function (t, x, y, w) { got.push(String(t)); return o.call(this, t, x, y, w) };
  P.drawProfileCons(ctx, g); delete ctx.fillText;
  const mine = g.taken.slice(before), hit = (r, q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0;
  return { n: mine.length, overlaps: mine.filter((r, i) => g.taken.some((q, j) => j !== before + i && hit(r, q))).length, texts: got } }"""


@case('D80', 'The profile: the constraints’ texts take a free place or none, never over a space’s label, TOC / TOD or a level', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='usage walk of 30 Oct, point 15 (« PARIS / PARIS 1 / 205 / FL100 / ORE » over each other on the profile): the texts of the procedures’ constraints go through the profile’s collision pass (g.taken: spaces’ labels, TOC / TOD, levels): above right, above left, below, else no text (the step stays)')
def d80(c):
    f = _proc_flight(planned_at=iso(now() + datetime.timedelta(hours=2)), by='fuel')
    _open_proc(c, f, view='maps?view=-1.5,46.35,-0.9,46.8')
    c.until("() => !!(window.__mp.S.prof && window.__mp.S.geo)", timeout=10000, what='the profile is drawn')
    c.wait(300)
    r = c.js(_CONS_BOXES)
    c.ok(r['n'] >= 1, f'{r}', 'the constraints write their texts')
    c.eq(r['overlaps'], 0, 'no constraint text over a space’s label, TOC / TOD, a level or another text', what=f'{r}')

