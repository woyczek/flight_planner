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
    # th→stub, stub→XS01 (dashes), XS01→XS02 (the RF arc), XS02→XS03 (transition), XS03→LUGEN (transition), NEPIX→XT01 (direct), STAR, STAR, approach,
    # RW31→stub (missed), stub→XM01
    c.eq([s[0] for s in lay['segs']], [False, True, False, True, True, True, False, False, False, True, True],
         'dashes: the stub is solid, then dashed to the next fix; transition, direct and missed approach dashed', what='segments dashed')
    c.eq([i for i, s in enumerate(lay['segs']) if s[1]], [2], 'only the RF leg is drawn as an arc', what='arc segments')
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
      rule='V3 § 10.20, maps SPEC § 8: profile.path drawn when it exists, else the fallback; NM marks, cursor and ETA on the flown path; constraints as steps')
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
    c.eq(c.hash(), '#fuel?focus=arr', 'the address of the arrival row', what='hash')


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
    'red': {'reason': 'none'}}
_COV_TEXTS = {'held': ['tenues ici', 'held here', 'hier gehalten', 'tenidas aquí'],
              'sia': ['lisibles au SIA', 'readable at the SIA', 'beim SIA lesbar', 'legibles en el SIA'],
              'none': ['rien nulle part', 'nothing anywhere', 'nirgends etwas', 'nada en ninguna parte']}


def _fake_cov(levels=None, texts=True, missing=False):
    """Init script: patches the service the moment AeroDB.create builds it, before any module mounts.  `missing`: no coverage() at all."""
    cfg = json.dumps({'levels': levels or _COV_LEVELS, 'rows': _COV_ROW, 'texts': _COV_TEXTS if texts else None, 'missing': missing})
    return """(() => { const cfg = %s; let ab;
  const patch = (A) => {
  window.__cov = { calls: [], batches: [], fns: [], levels: cfg.levels, outdated: {}, open: null };
  if (cfg.missing) { A.coverage = undefined; return A }
  A.coverage = async (icao) => { const C = window.__cov; C.calls.push(icao);
    if (!C.open) { C.open = []; C.batches.push(C.open); setTimeout(() => { C.open = null }, 0) }
    C.open.push(icao);
    if (!/^[A-Z0-9]{4}$/.test(icao)) return null;
    const lv = C.levels[icao] || 'red';
    return { level: lv, state: icao.slice(0, 2), here: true, ...cfg.rows[lv], ...(C.outdated[icao] ? { outdated: true } : {}) } };
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


@case('D46', 'Procedures layer: lit by itself while a side has no chosen procedure and its aerodrome is not green', 'D', tags=('maps',),
      screens=False, designs=('standard',),
      rule='V3 § 10.22 (ergonomics session, 28 Oct): a side without a chosen procedure (arr {}) whose aerodrome is orange or red lights the layer; chosen, null ("none"), or green: not')
def d46(c):
    _cov_open(c, levels={**_COV_LEVELS, 'LFML': 'orange'})
    c.until("() => window.__cv.covShown()", timeout=8000, what='the layer is lit: nothing chosen, the arrival is orange')
    _redraw(c)
    c.ok(_ads(c).get('LFAB') == c.var('--sog-warn'), f'{_ads(c)}', 'lit: the pins are coloured')
    c.eq(c.js(_COV_BOX), True, 'the box shows the layer as shown', what='box')
    c.eq(c.doc('cache/maps/ui.json')['layers'], {}, 'the automatic lighting writes nothing on the device', what='ui.json')
    # both sides chosen: the layer goes out
    _write_flight(c, {'dep': {'rwy': '03'}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 10)
    c.until("() => !window.__cv.covShown()", timeout=8000, what='the layer goes out when both sides are chosen')
    c.eq(c.js(_COV_BOX), False, 'the box follows', what='box')
    c.eq(c.doc('cache/maps/ui.json')['layers'], {}, 'still nothing written', what='ui.json')
    # an arrival not chosen yet (arr {}): lit again
    _write_flight(c, {'dep': {'rwy': '03'}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 11)
    c.until("() => window.__cv.covShown()", timeout=8000, what='lit again: the arrival has no choice')
    # "none" (null) is a choice
    _write_flight(c, {'dep': {'rwy': '03'}, 'arr': None, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 12)
    c.until("() => !window.__cv.covShown()", timeout=8000, what='arr null is a choice: no lighting')
    # a departure not chosen whose aerodrome is green: nothing to look for; the arrival is chosen
    _write_flight(c, {'dep': {}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 13)
    c.wait(900)
    c.eq(_shown(c), False, 'a green departure (LFRS) without choice does not light the layer', what='shown, green side')
    # the arrival turns green (the base changed): off, even with arr {}
    _write_flight(c, {'dep': {'rwy': '03'}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 14)
    c.until("() => window.__cv.covShown()", timeout=8000, what='lit again')
    c.js("() => { window.__cov.levels.LFML = 'green'; window.__cov.fns.forEach(f => f({ coverage: true })) }")
    c.until("() => !window.__cv.covShown()", timeout=8000, what='the arrival is green after the change: the layer goes out')


@case('D47', 'Procedures layer: the box touched wins over the automatic lighting', 'D', tags=('maps',), screens=False, designs=('standard',),
      rule='V3 § 10.22 (ergonomics session, 28 Oct): once the user touches the box, the automatic lighting no longer applies until the page is reloaded; the kept state of the box is never written by it')
def d47(c):
    _cov_open(c, levels={**_COV_LEVELS, 'LFML': 'orange'})
    c.until("() => window.__cv.covShown()", timeout=8000, what='lit by itself')
    _layers_toggle(c)
    c.until("window.__t.shown(document.querySelector('input[data-layer]'))", what='the Layers content')
    c.eq(c.js(_COV_BOX), True, 'the box shows what is shown', what='box')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")        # the user switches it off
    c.until("() => !window.__cv.covShown()", timeout=4000, what='off by the user')
    _write_flight(c, {'dep': {}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 20)
    c.wait(1200)
    c.eq(_shown(c), False, 'the user\'s choice wins: still off with a side to look for', what='shown after the user switched it off')
    c.eq(c.doc('cache/maps/ui.json')['layers'].get('vfr', {}).get('cov'), None, 'what is kept is the default (off), not the automatic state',
         what='ui.json')
    c.js("() => window.__mp.S.layersEl.querySelector('input[data-layer=cov]').click()")        # on by the user
    c.until("() => window.__cv.covShown()", timeout=4000, what='on by the user')
    _write_flight(c, {'dep': {'rwy': '03'}, 'arr': {'rwy': '31'}, 'by': 'fuel', 'at': '2026-10-28T10:00:00Z'}, 21)
    c.wait(1200)
    c.eq(_shown(c), True, 'on by the user: stays on although both sides are chosen', what='shown after the user switched it on')
    c.eq(c.doc('cache/maps/ui.json')['layers'].get('vfr', {}).get('cov'), True, 'the user\'s box is kept', what='ui.json')


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
