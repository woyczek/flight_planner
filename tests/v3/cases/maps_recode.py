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
import os
import re
import time

from lib import AERO_CYCLE, FLIGHT, ROOT, STUB_STYLE, Fail, Skip, case, forget, norm, tx

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
    (la1, lo1), (la2, lo2) = (64.7349, 177.7414), (64.5122, -165.4453)
    psi = lambda la: math.log(math.tan(math.pi / 4 + math.radians(la) / 2))
    dl = math.radians((lo2 - lo1 + 180) % 360 - 180)                  # the short way across 180°
    dp = math.radians(la2 - la1)
    want = math.hypot(dp, (dp / (psi(la2) - psi(la1))) * dl) * 3440.065   # the rhumb line: the quote’s distance (SOG-0243, Q-0019)
    c.le(round(abs(total - want), 1), 1.0, 'the profile is the rhumb line across 180° (the quote’s distance), not around the world', what=f'profile {total} NM, rhumb line {want:.1f} NM')
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
    c.eq(c.attr('[data-mp="layers"]', 'title'), row(c, 'layers'), 'the Layers button is « Layers » on a mission map too (SOG-0185 c)', what='Layers title')
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
    # the second map: no profile of its own, so the view of its use (SOG-0171: VFR topo for a target map), said by the banner and no longer by a note
    c.open('maps?mission=ESSAI1&map=carte_cible.png', aero=True)
    c.until("() => !!document.querySelector('.mp-mb-theme')", timeout=8000, what='the banner’s view choice of the second map')
    c.eq(c.js("() => document.querySelector('.mp-mb-theme').value"), 'vfr', 'a target map opens in VFR topo (its use), shown in the banner', what='view')
    c.ok(norm(row(c, 'builtin').split('{p}')[0]).strip() not in norm(c.text('.mp-notes') or ''), f'notes {c.text(".mp-notes")!r}',
         'no note about a built-in profile: the view of its use is not a default to apologise for')


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
    c.open('maps', flight=True, aero=True)   # with the base: without it the floating notice « data access not set » covers the foot of the sheet at 390, over « Reset all »
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
    c.ok(any(n.startswith('I31') for n in far['names']), f'{far["names"]}', 'the approach is named (one fix off its threshold is enough)')
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
    c.until("() => !!(window.__mp.S.procs && window.__mp.S.procs.depRwy && window.__mp.S.runways && (window.__mp.S.runways.get('LFRS') || []).length)", timeout=8000, what='the runways read')
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
    c.until("() => !!(window.__mp.S && window.__mp.S.runways && (window.__mp.S.runways.get('LFRS') || []).length)", timeout=10000, what='the runways read without procedures')
    w = c.js(_RWY_JS, [4000, 12])
    c.ok(len(w) == 2 and all(x['lw'] == 2 for x in w), f'{w}', 'every runway thin when none is chosen')
    # the Map's vectors read the one rule of the frame (wind.runwayAxis, refactor R-F1 / R-M4)
    b = c.js("""async () => { const W = await import('/frame/lib/wind.js'), B = (rw, list, magVar) => W.runwayAxis(rw, { list, magVar });
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
    # named as the choose pane and Fuel name them, no kind before (the hue is the family; sixth reading, gap 5)
    want = ['XX1A ⌛', f'XX2B · {row(c, "procX")}', f'I31 · {row(c, "procX")}']
    c.eq(lay['names'], want, 'labelled by their names (displayName), with the state of the source', what='procedure labels')
    c.until("(window.__mpTexts || []).some(t => /^XX1A/.test(t))", timeout=6000, what='the SID label drawn')
    c.wait(400)
    drawn = [norm(t) for t in c.js('window.__mpTexts || []')]
    c.ok('XX1A' in drawn and '⌛' in drawn and 'XX1A ⌛' not in drawn, f'{sorted(set(t for t in drawn if t.startswith(("XX", "I31", "⌛"))))}',
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
      names: S.prof.marks.map(m => m.name), total: S.prof.total / 1852, marks: S.marks.map(m => m.nm), step: S.marksStep, fromFlown: S.marksPts === undefined ? null : S.marksPts.length === S.route.flown.length, cons: !!S.lgCons } }""")
    c.ok(r['path'], 'profile.path not used', 'profile.path drawn when it exists')
    c.eq(r['mid'], 27000, 'the planned altitude at the middle is the path\'s', what='plan altitude at mid distance')
    c.eq(r['names'], ['LFRS', 'LUGEN', 'NEPIX', 'LFML'], 'only the route points are named under the profile', what='profile marks')
    c.ok(abs(r['total'] - _FLOWN_NM) < 1, f'{r["total"]:.1f} NM against {_FLOWN_NM:.1f}', 'the profile is cut along the flown path')
    # the marks follow the flown path, at a round step that follows the visible length (SOG-0177: 5 NM in this close view, 50 on a long one): from the first step, regular, none past the end
    mk = r['marks']
    c.ok(mk and r['step'] and mk[0] == r['step'] and all(b - a == r['step'] for a, b in zip(mk, mk[1:])) and mk[-1] < _FLOWN_NM and r['fromFlown'] is True,
         f'{mk[:6]}… step {r["step"]}', 'the NM marks follow the flown path (a round step, regular, none beyond its end)')
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
        const d = g.getImageData(Math.round((h.x - S.canvas.offsetLeft) * k), Math.round((h.y - S.canvas.offsetTop) * k), 1, 1).data; out[h.a.icao] = [d[0], d[1], d[2]] } return out }""")  # the overlay overflows the view (D97): its pixel of a view point is offset
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
  return { focus: S.choose.model.focus, sel: S.choose.state.sel, n: L.traces.length, dim: L.traces.filter(t => t.dim).length, groups: L.groups.map(g => g.rows.map(r => r.id)),
    hues: (fam === 'appTrans' ? S.choose.model.subs : (S.choose.model.groups[fam] || {}).rows || []).map(i => pal[i.hi % pal.length]), dashed: L.traces.filter(t => t.dash).length,
    arrows: L.arrows.map(a => [a.name, a.lw]), at: C.chooseAt(mid.x, mid.y), nothing: C.chooseAt(-2000, -2000),
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


@case('D61', 'The flown track comes from the frame alone: read at mount, the whole flight, joined to the current position', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='INTEGRATION § 6 (29 Oct; local since 30 Oct; refactor R-M6): ctx.live.trail() = { from: started.at, trail: [[lat, lon, altFt, s since started.at]] }, kept on the device, is the only source of the track: read at each reading of the flight (a tab change no longer loses it), points older than 30 min kept, joined to the actual position when it is newer than its last point; the Map keeps no position of its own')
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
    st = c.js("() => { const S = window.__mp.S; return { fam: S.choose.model.focus, side: S.choose.side, icao: S.choose.icao, panel: S.dpanel, hash: location.hash, same: window.__noReload === 1, fit: S.fit } }")
    c.eq([st['side'], st['icao'], st['fam'], st['panel']], ['arr', 'LFML', 'star', 'choose'],
         'the arrival of LFML, the family the flight lacks touched first (the runway is chosen: the STAR), in the sheet', what='mode')
    c.ok(st['same'] and st['hash'] == '#maps', f'{st["hash"]}', 'no reload, the address unchanged')
    fit = st['fit']
    c.ok(fit['s'] < 44 and fit['n'] > 43.4 and fit['w'] < 5.2 and fit['e'] > 4.3 and fit['e'] - fit['w'] < 3, f'{fit}', 'the view fits the procedures of LFML, not the flight')
    # leaving by the cross: the flight's view and profile come back
    c.js("async () => { const C = await import('/modules/maps/choose.js'); await C.chooseClose() }")  # the one exit: nothing chosen, from the card
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
      const C = window.__mp.S.choose, PM = await import('/frame/lib/pane_model.js'); C.state = { ...C.state, open: { ...C.state.open, focus: 'app' } };
      C.model = PM.paneModel(C.input, C.state); (await import('/modules/maps/draw.js')).schedule(); return true }""")
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
    c.until("() => !!(window.__mp.S.runways && (window.__mp.S.runways.get('LFAB') || []).length)", timeout=8000, what='its runways are read')
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
# a far TMA (a big family: read over the whole view, SOG-0169) and a far R (read in the corridor only while « Around the flight only » is ticked)
_FAR_R = dict(_FAR_TMA, type='R', cls='', name='R FARVILLE')
_CORR_STATE = """async () => { const S = window.__mp.S, V = await import('/modules/maps/sheet_view.js'); S.legend = true; V.legendSync();
  return { corridor: S.data ? S.data.corridor : null, far: ((S.data && S.data.data.airspaces) || []).some(a => a.name === 'TMA FARVILLE'),
    farR: ((S.data && S.data.data.airspaces) || []).some(a => a.name === 'R FARVILLE'),
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
    c.open(view, docs=fdocs(flight()) + [ui], flight=False, airfields=True, airspaces=[_FAR_TMA, _FAR_R], wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the first reading')
    c.wait(400)
    st = c.js(_CORR_STATE)
    c.eq([st['corridor'] > 0, st['far'], st['farR']], [True, False, False], 'ticked by default: everything is read along the flight only, the far TMA (a big family) and the far R alike (SOG-0246: the box acts on every layer)', what='ticked')
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
    c.eq([st['corridor'], st['far'], st['farR']], [0, True, True], 'unticked: the whole view, the far TMA and the far R read', what='unticked')
    c.ok(norm(tx(M, 'lgCorr', c.lang)) not in norm(st['legend']), st['legend'], 'the chip no longer speaks of the corridor')
    title = c.js("() => document.querySelector('.mp-dtitle').textContent")
    c.ok(not norm(title).endswith(norm(tx(M, 'ttlCorr', c.lang))), title, 'the title no longer says "around the flight"')
    c.until("() => (window.__chT || []).some(t => /FARVILLE/.test(t))", timeout=8000, what='the far TMA labelled')
    names = sorted({t for t in c.js('window.__chT') if 'FARVILLE' in t})
    c.ok(not any('TMA TMA' in t for t in names), f'{names}', 'the type is written once ("TMA FARVILLE", not "TMA TMA FARVILLE")')
    c.eq(c.js("() => ((window.__mp.S.layers || {}).auto || {}).corridor"), False, 'the choice is kept on the device', what='kept')
    # a world view (wider than 3 000 NM, SOG-0246): the corridor imposed, said in the chip
    c.open('maps?view=-40,25,50,65', docs=fdocs(flight()) + [['cache/maps/ui.json', {'preset': 'auto', 'layers': {'auto': {'detail': 2, 'corridor': False}}}, 'cache']],
           flight=False, airfields=True, airspaces=[_FAR_TMA, _FAR_R], wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the continent reading')
    c.wait(400)
    st = c.js(_CORR_STATE)
    c.ok(st['corridor'] > 0, f"{st['corridor']}", 'wider than 3 000 NM: around the flight even unticked')
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
    c.eq(c.js("() => window.__mp.S.choose.state.sel.appTrans"), None, 'the transition ABC 1A, which S2A does not lead to, is set back to "None"',
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
# the profile's pass, read at its painting round: every request with its rank and the place it got (null: left out)
_CONS_BOXES = """async () => { const A = window.SiaAero, o = A.pass, rounds = [];
  A.pass = function (ctx, run, rankOf) { return o.call(this, ctx, (c, pl, first) => first ? run(c, pl, first) : run(c, new Proxy(pl, { get(t, k) {
    if (k === 'ask') return req => { const r = t.ask(req); rounds.push({ rank: req.rank, r }); return r };
    const v = t[k]; return typeof v === 'function' ? v.bind(t) : v } }), first), rankOf) };
  try { (await import('/modules/maps/profile_view.js')).drawProfile() } finally { A.pass = o }
  const hit = (r, q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0, put = rounds.filter(x => x.r),
    cons = put.filter(x => x.rank === 'constraint');
  return { n: cons.length, ranks: [...new Set(put.map(x => x.rank))], overlaps: cons.filter(x => put.some(y => y !== x && hit(x.r, y.r))).length } }"""


@case('D80', 'The profile: the constraints’ texts take a free place or none, never over TOC / TOD, a level, a space’s label or another text', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='usage walk of 30 Oct, point 15 (« PARIS / PARIS 1 / 205 / FL100 / ORE » over each other on the profile): the texts of the procedures’ constraints go through the profile’s collision pass (SiaAero.pass, its closed list PROFILE_RANK: TOC / TOD, constraints, levels, spaces, obstacles, airway points): above right, above left, below, else no text (the step stays); a level or a space’s label gives way to a constraint (refactor R-M2 (c))')
def d80(c):
    f = _proc_flight(planned_at=iso(now() + datetime.timedelta(hours=2)), by='fuel')
    _open_proc(c, f, view='maps?view=-1.5,46.35,-0.9,46.8')
    c.until("() => !!(window.__mp.S.prof && window.__mp.S.geo)", timeout=10000, what='the profile is drawn')
    c.wait(300)
    r = c.js(_CONS_BOXES)
    c.ok(r['n'] >= 1, f'{r}', 'the constraints write their texts, in the profile’s pass')
    c.eq(r['overlaps'], 0, 'no constraint text over TOC / TOD, a level, a space’s label or another text', what=f'{r}')



# ------------------------------------------------------------------------------------------------------ D81
@case('D81', 'The plain background draws the countries the frame gives (aerodb.zoneOutlines), not a copy of its own', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='V3 Frame d6011f983: aerodb.zoneOutlines() is the one source of the zones’ outlines; the Map’s plain background reads it (lib/outlines.js stays only for Atmosphere until it moves too)')
def d81(c):
    c.page.route(re.compile(r'.*tiles\.openfreemap\.org.*'), lambda r: r.abort())
    c.page.add_init_script("""(() => { let ab; Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab }, set(v) { ab = v;
      if (v && v.create && !v.__zo) { const o = v.create; v.__zo = 1; v.create = function (...a) { const A = o.apply(this, a), z = A.zoneOutlines;
        if (typeof z === 'function') A.zoneOutlines = (...q) => { window.__zoCalls = (window.__zoCalls || 0) + 1; return z.apply(A, q) };
        return A } } } }) })()""")
    c.open('maps', flight=True, aero=True, wait=False)
    c.ready('maps', sheet=True)
    c.until("() => Array.isArray(window.MAPS_OUTLINES) && window.MAPS_OUTLINES.length > 100", timeout=15000, what='the countries of the plain background')
    c.ok((c.js('window.__zoCalls') or 0) >= 1, f"{c.js('window.__zoCalls')}", 'read through aerodb.zoneOutlines()')
    c.eq(c.js("() => performance.getEntriesByType('resource').some(e => /maps\\/lib\\/outlines\\.js/.test(e.name))"), False,
         'the Map’s own copy (lib/outlines.js) is not loaded', what='outlines.js')


# ------------------------------------------------------------------------------------------------------ D82
@case('D82', 'The choose pane’s model bench (frame/lib/pane_model.js) passes', 'D', tags=('maps',), screens=False, designs=('standard',),
      night=False, rule='refactor R-M1 (§ 10.33): the pane’s meaning is one pure function, paneModel(input, state), with its reducers; its bench covers groups, folds, families, the pending family, transitions, the route and heading axes, marks, the correction line, the summary, the wind, the frame and the way back')
def d82(c):
    c.page.goto(f'{c.base}/frame/lib/test/pane_model.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'frame/lib/test/pane_model.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] >= 30, f"{r['pass']} passed, {r['fail']} failed. First failures: {[x for x in (r['rows'] or []) if not x['ok']][:3]}",
         'every check of the bench passes')


# ------------------------------------------------------------------------------------------------------ D83
_CART_SPY = """() => { const R = window.MapsRender, o = R.cartouche; window.__cart = 0; if (!o.__spy) { R.cartouche = function (...a) { window.__cart++; return o.apply(this, a) };
  R.cartouche.__spy = true } return true }"""


@case('D83', 'One boxed-label primitive draws the Map’s cartouches; the procedures’ hues read the design tokens', 'D', tags=('maps',),
      screens=False, designs=('standard',), night=False,
      rule='refactor R-M5 (a), § 10.33: MapsRender.cartouche is the one drawer of the procedure labels, the choose mode’s labels and the airway boxes; PALETTE.sid / star / app read --sog-map-sid / -star / -app (Features SOG, R-F3), read again at each change of theme, the hex values only a fallback')
def d83(c):
    _ch_open(c, {'rwy': '31'}, file=_CH_FILE)
    # the primitive: a filled frame and a text, in a rectangle
    px = c.js("""() => { const cv = document.createElement('canvas'); cv.width = cv.height = 60; const g = cv.getContext('2d');
      MapsRender.cartouche(g, { x0: 5, y0: 5, x1: 55, y1: 25 }, { fill: '#ff0000', frame: '#0000ff', pad: 3, rows: [{ runs: [{ t: 'AB', color: '#00ff00', font: '700 11px Arial' }] }] });
      const at = (x, y) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3); return { fill: at(50, 20), frame: at(5, 15), out: at(58, 58) } }""")
    c.eq([px['fill'], px['frame'], px['out']], [[255, 0, 0], [0, 0, 255], [0, 0, 0]], 'a fill, a frame of one pixel, nothing outside', what='primitive')
    # the choose mode's labels go through it
    c.js(_CART_SPY)
    # zoomed out two steps so that the procedures’ lines, and the places of their labels, are in the view (the labels of a request with no
    # place in the view are not drawn: SPEC § 5, the drawing overflows the view, the labels do not)
    c.js("() => { const m = window.__mp.S.map; if (m) m.jumpTo({ zoom: m.getZoom() - 2 }); return true }")
    c.js("async () => (await import('/modules/maps/draw.js')).schedule()")
    c.until("() => window.__cart > 0", timeout=6000, what='the choose mode’s labels drawn by the primitive')
    # the tokens: the default is the token, a changed token changes the palette at the next reading of the theme
    t = c.js("""() => { const d = document.documentElement, P = () => MapsRender.palette(false);
      const before = [P().sid, getComputedStyle(d).getPropertyValue('--sog-map-sid').trim()];
      d.style.setProperty('--sog-map-sid', '#123456'); MapsRender.tokens(); const after = P().sid;
      d.style.removeProperty('--sog-map-sid'); MapsRender.tokens(); return { before, after, back: P().sid } }""")
    c.eq(t['before'][0].lower(), t['before'][1].lower(), 'the SID hue is the design token', what='default SID hue')
    c.eq([t['after'].lower(), t['back'].lower()], ['#123456', t['before'][1].lower()], 'a changed token is read at the next reading of the theme', what='changed token')


# ------------------------------------------------------------------------------------------------------ D84
@case('D84', 'Labels declared as requests; aerodb answers deduplicated by key, not by object', 'D', tags=('maps',), screens=False,
      designs=('standard',), night=False,
      rule='refactor R-M2 (b), § 10.33: every layer asks the placer through one request { layer, rank, key, anchor, boxes, paint, force } (SiaAero.ask); many() keeps one answer per key — two frozen copies of one airway segment are one, while two airspaces the SIA gives the same key (« LF600 », a SUR and a PRN) stay two')
def d84(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True)
    r = c.js("""async () => { const D = await import('/modules/maps/data.js'), fz = o => Object.freeze(JSON.parse(JSON.stringify(o))),
      seg = { route: 'A34', a: { id: 'NEVER', lat: 47.4, lon: 1.5 }, b: { id: 'LEBLA', lat: 46.6, lon: 1.5 } },
      sur = { type: 'SUR', key: 'LF600', name: '600', lower: 'SFC', upper: '1000 ft ASFC', rings: [[[48.6, 2.2], [48.7, 2.3], [48.6, 2.4]]] },
      prn = { type: 'PRN', key: 'LF600', name: '600', lower: 'SFC', upper: '3300 ft ASFC', rings: [[[45.3, 6.9], [45.4, 7.0], [45.3, 7.1]]] },
      answers = [[fz(seg), fz(sur)], [fz(seg), fz(prn), fz(sur)]];
      let i = 0;
      const got = await D.many(async () => answers[i++] || [], [[0, 0, 1, 1], [1, 1, 2, 2]]);
      const pl = SiaAero.placer(), painted = [];
      const a = SiaAero.ask(pl, { layer: 't', rank: 'fix', key: 'k', boxes: [{ x0: 0, y0: 0, x1: 10, y1: 10 }], paint: r => painted.push('a') }),
        b = SiaAero.ask(pl, { layer: 't', rank: 'fix', key: 'k2', boxes: [{ x0: 5, y0: 5, x1: 15, y1: 15 }, { x0: 20, y0: 0, x1: 30, y1: 10 }], paint: r => painted.push('b@' + r.x0) }),
        f = SiaAero.ask(pl, { layer: 't', rank: 'route', key: 'k3', force: 'paint', boxes: [{ x0: 0, y0: 0, x1: 10, y1: 10 }], paint: r => painted.push('f') }),
        n = SiaAero.ask(pl, { layer: 't', rank: 'fix', key: 'k4', boxes: [{ x0: 2, y0: 2, x1: 8, y1: 8 }], paint: r => painted.push('n') });
      return { kinds: got.map(x => x.type || x.route), painted, none: n === null } }""")
    c.eq(r['kinds'], ['A34', 'SUR', 'PRN'], 'one airway segment for two frozen copies; the SUR and the PRN of key LF600 both kept', what='many()')
    c.eq([r['painted'], r['none']], [['a', 'b@20', 'f'], True], 'a request takes its first free place, else slides; force paints without room; else it is left out',
         what='requests')


# ------------------------------------------------------------------------------------------------------ D85
# LFBO with its real positions (eAIP and SIA base of the 2026 cycle: thresholds, ILS DMEs, VOR TOU, the SID AMOLO 7A of runway 14R)
_LFBO = {'icao': 'LFBO', 'name': 'TOULOUSE BLAGNAC', 'lat': 43.635128, 'lon': 1.367856, 'elev': 499, 'magVar': 1.66, 'public': True,
         'controlled': True, 'hardLen': 3503, 'bearing': 322.9}
_LFBO_NAV = [{'kind': 'VOR', 'id': 'TOU', 'name': 'TOULOUSE', 'freq': '117.7', 'lat': 43.680833, 'lon': 1.3098, 'dme': True},
             {'kind': 'DME', 'ils': True, 'id': 'TD', 'name': '', 'freq': '', 'channel': '20Y', 'lat': 43.616972, 'lon': 1.376806},
             {'kind': 'DME', 'ils': True, 'id': 'TBS', 'name': '', 'freq': '110.7', 'channel': '44X', 'lat': 43.642456, 'lon': 1.349575},
             {'kind': 'DME', 'ils': True, 'id': 'TBN', 'name': '', 'freq': '', 'channel': '30X', 'lat': 43.621836, 'lon': 1.371458}]
_LFBO_FILE = {'schema': 1, 'icao': 'LFBO', 'cycle': AERO_CYCLE, 'updated_at': '2026-10-01T00:00:00Z',
              'runways': [{'id': '14L', 'lat': 43.637364, 'lon': 1.357625, 'elev': 489, 'qfu': 141, 'true': 142.91, 'length': 3025},
                          {'id': '32R', 'lat': 43.615636, 'lon': 1.380236, 'elev': 497, 'qfu': 321, 'true': 322.91, 'length': 3025},
                          {'id': '14R', 'lat': 43.644114, 'lon': 1.345933, 'elev': 488, 'qfu': 141, 'true': 142.9, 'length': 3503},
                          {'id': '32L', 'lat': 43.618964, 'lon': 1.372117, 'elev': 497, 'qfu': 321, 'true': 322.9, 'length': 3503}],
              'procedures': [{'id': 'LFBO.SID.AMOLO7A.RW14R.NONE', 'icao': 'LFBO', 'kind': 'SID', 'name': 'AMOLO7A', 'runways': ['14R'],
                              'transition': None, 'status': 'official', 'source': {'kind': 'eaip', 'ref': 'test', 'cycle': AERO_CYCLE, 'at': '2026-10-01'},
                              'points': [{'seq': 1, 'id': 'RW14R', 'lat': 43.644114, 'lon': 1.345933, 'alt': None, 'phase': 'main'},
                                         {'seq': 2, 'id': 'BO140', 'lat': 43.574528, 'lon': 1.420639, 'alt': {'type': 'min', 'ft': 4000}, 'phase': 'main'},
                                         {'seq': 3, 'id': 'BO143', 'lat': 43.701833, 'lon': 1.70425, 'alt': None, 'phase': 'main'},
                                         {'seq': 4, 'id': 'BO145', 'lat': 43.861083, 'lon': 1.8675, 'alt': None, 'phase': 'main'},
                                         {'seq': 5, 'id': 'MEDAP', 'lat': 43.921567, 'lon': 2.021647, 'alt': None, 'phase': 'main'},
                                         {'seq': 6, 'id': 'AMOLO', 'lat': 43.827939, 'lon': 2.57875, 'alt': {'type': 'min', 'ft': 20000}, 'phase': 'main'}]}]}
# the map's pass, read at its painting round (the profile's left aside): every request with its rank, key, force and place
_MAP_PASS = """() => { const A = window.SiaAero; if (!A.__d85) { const o = A.pass; A.__d85 = 1;
  A.pass = function (ctx, run, rankOf) { const got = [];
    const out = o.call(this, ctx, (c, pl, first) => first ? run(c, pl, first) : run(c, new Proxy(pl, { get(t, k) {
      if (k === 'ask') return req => { const r = t.ask(req); got.push({ layer: req.layer, rank: req.rank, key: String(req.key || ''), force: req.force || '',
        r: r && { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 } }); return r };
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v } }), first), rankOf);
    if (!got.some(x => x.layer === 'profile')) window.__mapPass = got;
    return out } } return true }"""


def _lfbo_docs():
    """The documents of D85 and D89: LFBO → AMOLO → LFPO with the SID AMOLO 7A of 14R, the real positions of LFBO, its runways and
    beacons, and LFPO."""
    f = flight()
    f['route'] = {'text': 'LFBO AMOLO', 'dep': 'LFBO', 'arr': 'LFPO', 'points': [{'id': 'LFBO', 'lat': 43.635128, 'lon': 1.367856},
                  {'id': 'AMOLO', 'lat': 43.827939, 'lon': 2.57875}, {'id': 'LFPO', 'lat': 48.723333, 'lon': 2.379444}],
                  'procedures': {'dep': {'rwy': '14R', 'sid': 'LFBO.SID.AMOLO7A.RW14R.NONE'}, 'arr': {}, 'by': 'fuel', 'at': '2026-10-30T10:00:00Z'}}

    def kind(k, data):
        return [f'sia/base/fr/{AERO_CYCLE}/{k}.json', {'schema': 2, 'zone': 'fr', 'cycle': AERO_CYCLE, 'kind': k, 'parserVersion': 1, 'data': data,
                                                       'updated_at': f'{AERO_CYCLE}T00:00:00Z'}, 'reference']
    docs = fdocs(f) + [['proc/manual/LFBO.json', _LFBO_FILE, 'reference'], ['cache/maps/ui.json', {'preset': 'auto', 'layers': {}}, 'cache'],
                       ['sia/base/index.json', {'zones': {'fr': {'cycle': AERO_CYCLE, 'prefixes': ['LF'], 'kb': {},
                                                                 'cells': {'43': [[1, 3]], '48': [[2, 3]]}}}}, 'reference'],
                       kind('meta', {}), kind('airspaces', []), kind('navaids', _LFBO_NAV),
                       kind('aerodromes', [_LFBO, {'icao': 'LFPO', 'name': 'PARIS ORLY', 'lat': 48.723281, 'lon': 2.379578, 'elev': 291, 'magVar': 1.82, 'public': True, 'controlled': True, 'hardLen': 3650, 'bearing': 241.85}]),
                       kind('points', [{'id': 'AMOLO', 'type': 'ICAO', 'lat': 43.827939, 'lon': 2.57875}])]
    return docs


@case('D85', 'LFBO, real positions: the runway numbers at the thresholds, then the threshold beacons, then the procedure, then the route — one pass, by rank', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='refactor R-M2 + R-M5 (c), § 10.33, SPEC § 3: one collision pass over every label of the map, by the closed list (aerodrome, runway numbers, beacons, procedures, route, the rest); at LFBO (14L / 14R, the ILS DMEs TD, TBS, TBN at the thresholds, VOR TOU, SID AMOLO 7A) the four runway numbers are written, the beacons’ boxes next, the procedure’s name then slides where they are not; no two placed labels overlap')
def d85(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    docs = _lfbo_docs()
    c.open('maps?view=1.305,43.60,1.395,43.69', docs=docs, flight=False, wait=False)   # zoom 11.6 on 390 px: above runwayZoom
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.route && window.__mp.S.route.path && window.__mp.S.route.path.some(p => p.origin === 'sid'))",
            timeout=12000, what='the path holds the SID AMOLO 7A')
    c.until("() => (window.__mapPass || []).filter(x => x.rank === 'runway' && x.r).length >= 4", timeout=12000, what='the four runway numbers placed')
    c.wait(300)
    got = c.js('() => window.__mapPass')
    placed = [x for x in got if x['r']]
    rw = sorted(x['key'][4:].split('@')[0] for x in placed if x['rank'] == 'runway')
    c.eq(rw, ['14L', '14R', '32L', '32R'], 'every runway of LFBO has its number at its threshold (rank 2)', what='runway numbers')
    navs = sorted(x['key'].split('@')[0] for x in placed if x['rank'] == 'navaid')
    c.eq(navs, ['TBN', 'TBS', 'TD', 'TOU'], 'the threshold DMEs and TOU have their boxes (rank 3), before the procedure and the route', what='beacon boxes')
    proc = [x for x in placed if x['rank'] == 'procedure']
    c.ok(bool(proc), f'{proc}', 'the procedure’s name is written')
    hit = lambda r, q: r['x0'] < q['x1'] and r['x1'] > q['x0'] and r['y0'] < q['y1'] and r['y1'] > q['y0']
    # what the pass placed (a forced label painted without room aside) never overlaps
    free = [x for x in placed if x['force'] != 'paint']
    bad = [(a['key'], b['key']) for i, a in enumerate(free) for b in free[i + 1:] if hit(a['r'], b['r'])]
    c.eq(bad, [], 'no two placed labels overlap', what='overlaps')
    over = [x['key'] for x in proc if any(hit(x['r'], y['r']) for y in placed if y['rank'] in ('runway', 'navaid'))]
    c.eq(over, [], 'the procedure’s name is never over a runway number or a beacon’s box (it slides)', what='procedure name')


# ------------------------------------------------------------------------------------------------------ D86
_SHEET_JS = """() => { const S = window.__mp.S, root = S.dataEl.parentElement, box = S.dataEl.getBoundingClientRect(),
  last = [...S.dataEl.children].filter(e => e.getClientRects().length).at(-1);
  return { pos: S.sh.pos, view: root.clientHeight, sheet: Math.round(box.height), map: S.box.clientHeight,
    blank: Math.round(box.bottom - last.getBoundingClientRect().bottom), prof: S.profBox.clientHeight } }"""


@case('D86', 'The sheet is the height of what it shows, at most half the view; the map takes the rest; the choose mode gives the position back', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), SPEC § 7.1: in portrait the sheet is never taller than what it shows nor than half the view, no blank under the content, at 1280 as at 390 — a drawing fills the body (expanded: half the view), a content (Layers) is its head plus its own height, capped at half; the choose mode opens the sheet expanded and gives back the position it found')
def d86(c):
    _ch_open(c, {})
    c.until("() => window.__mp.S.sh.pos === 'expanded'", timeout=6000, what='the choose mode opens the sheet expanded')
    st = c.js(_SHEET_JS)
    c.ok(st['sheet'] <= st['view'] / 2 + 1, f'{st}', 'the choose pane is at most half the view')
    c.js("async () => { (await import('/modules/maps/choose.js')).chooseClose(); return true }")
    c.until("() => location.hash.startsWith('#fuel')", timeout=6000, what='back to Fuel')
    c.ready('fuel')
    c.js("() => { location.hash = '#maps'; return true }")
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.sh)", timeout=12000, what='the map and its profile again')
    c.wait(600)
    st = c.js(_SHEET_JS)
    c.eq(st['pos'], 'default', 'after the choose mode the sheet is back at the position it had (not left expanded)', what='position')
    c.eq(st['blank'], 0, 'no blank under the profile', what=f'{st}')
    c.js("() => { window.__mp.S.sh.set('expanded'); return true }")
    c.until("() => window.__mp.S.sh.pos === 'expanded'", timeout=3000, what='expanded')
    c.wait(700)
    ex = c.js(_SHEET_JS)
    c.ok(abs(ex['sheet'] - ex['view'] / 2) <= 2, f'{ex}', 'expanded over the profile: half the view, the map the other half')
    c.ok(ex['blank'] == 0 and ex['prof'] > st['prof'], f'{st} → {ex}', 'the profile fills the body, taller than at the default position, no blank under it')
    c.js("() => { document.querySelector('[data-mp=layers]').click(); return true }")
    c.until("() => window.__mp.S.dpanel === 'layers'", timeout=4000, what='Layers open')
    c.wait(700)
    ly = c.js(_SHEET_JS)
    want = c.js("""() => { const S = window.__mp.S, r = document.createRange(); r.selectNodeContents(S.dbodyEl); const b = getComputedStyle(S.dbodyEl);
      return Math.ceil(S.dheadEl.offsetHeight + 1 + r.getBoundingClientRect().height + parseFloat(b.paddingTop) + parseFloat(b.paddingBottom)) }""")
    c.ok(abs(ly['sheet'] - min(want, round(ly['view'] / 2))) <= 2, f'{ly}, content {want}', 'Layers: its head and its own height, capped at half the view')
    # sheetFit writes a token only when it changes: a content change and a resize settle in one round, nothing rewritten after
    c.js("""() => { const st = window.__mp.S.dataEl.parentElement.style, o = st.setProperty.bind(st), r = st.removeProperty.bind(st);
      window.__fitW = 0; st.setProperty = (k, ...a) => { if (k.startsWith('--f-sheet')) window.__fitW++; return o(k, ...a) };
      st.removeProperty = k => { if (k.startsWith('--f-sheet')) window.__fitW++; return r(k) }; return true }""")
    c.js("() => { document.querySelector('[data-mp=layers]').click(); return true }")
    c.until("() => !window.__mp.S.dpanel", timeout=4000, what='Layers closed: the profile comes back')
    c.wait(900)
    n1 = c.js('window.__fitW')
    c.wait(900)
    c.eq(c.js('window.__fitW'), n1, 'after a change of content the tokens settle: none rewritten afterwards', what=f'writes {n1}')
    c.ok(n1 <= 4, f'{n1} writes', 'at most the four tokens written once')
    vp = c.page.viewport_size
    c.page.set_viewport_size({'width': vp['width'], 'height': vp['height'] - 60})
    c.wait(1200)
    n2 = c.js('window.__fitW')
    c.wait(900)
    c.eq(c.js('window.__fitW'), n2, 'after a resize the tokens settle: none rewritten afterwards', what=f'writes {n2 - n1}')
    c.ok(0 < n2 - n1 <= 4, f'{n2 - n1} writes', 'the resize rewrites the tokens that change, once')
    c.page.set_viewport_size(vp)


# ------------------------------------------------------------------------------------------------------ D87
_CAM_JS = """() => { const S = window.__mp.S, m = S && S.map; if (!m) return null; const c = m.getCenter();
  return { lng: c.lng, lat: c.lat, zoom: m.getZoom(), moved: !!S.userMoved } }"""


def _maps_again(c):
    """Leaves the Map for Fuel and comes back, as the pilot does (« Carte » after Fuel), and waits for the map's camera."""
    c.js("() => { location.hash = '#fuel'; return true }")
    c.ready('fuel')
    c.js("() => { location.hash = '#maps'; return true }")
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn)", timeout=15000, what='the map again, its camera set')
    c.wait(500)
    return c.js(_CAM_JS)


@case('D87', 'Framed return: the Map frames the flight when it comes back; the user’s framing of this same flight is given back, not of another', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), § 10.30, SPEC § 5: opening the Map from Fuel or coming back after « Terminer » frames the flight with its procedures, as the first opening; a framing the user gave this same flight (pan, zoom) during the page is kept, not beyond — another route or another choice of procedures is framed again; one writer of the framing, frameFlight')
def d87(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn)", timeout=15000, what='the map and its camera')
    c.wait(400)
    first = c.js(_CAM_JS)
    back = _maps_again(c)
    c.ok(abs(back['lng'] - first['lng']) < 1e-3 and abs(back['lat'] - first['lat']) < 1e-3 and abs(back['zoom'] - first['zoom']) < .01,
         f'{first} → {back}', 'untouched, the flight is framed on the way back as at the first opening')
    # the pilot pans and zooms: that framing of this flight comes back with the Map
    c.js("() => { const m = window.__mp.S.map; m.jumpTo({ center: [m.getCenter().lng + 0.6, m.getCenter().lat - 0.4], zoom: m.getZoom() + 1 }); return true }")
    c.wait(400)
    mine = c.js(_CAM_JS)
    c.ok(mine['moved'], f'{mine}', 'the move is the user’s')
    back = _maps_again(c)
    c.ok(abs(back['lng'] - mine['lng']) < 1e-3 and abs(back['lat'] - mine['lat']) < 1e-3 and abs(back['zoom'] - mine['zoom']) < .01 and back['moved'],
         f'{mine} → {back}', 'the user’s framing of this same flight is given back')
    # another route (the same aerodromes, one point fewer): framed again, the kept framing forgotten
    c.js("""async () => { const S = window.__mp.S, p = 'pilot/ABC/current_flight.json', f = await S.ctx.data.get(p);
      f.route = { ...f.route, text: 'LFRS NEPIX LFML', points: f.route.points.filter(q => q.id !== 'LUGEN') };
      f.updated_at = new Date().toISOString(); await S.ctx.data.put(p, f); return true }""")
    c.wait(800)
    back = _maps_again(c)
    c.ok(not back['moved'] and (abs(back['lng'] - mine['lng']) > .05 or abs(back['zoom'] - mine['zoom']) > .3), f'{mine} → {back}',
         'another route: the flight is framed again, not the framing kept for the other one')


# ------------------------------------------------------------------------------------------------------ D88
@case('D88', 'One distance: the sheet’s title reads the flown path with its procedures, the profile’s axis and Fuel’s distance', 'D',
      tags=('maps', 'sheet'), screens=False, designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), gap 3, SPEC § 7.2: the title’s distance is the last nm of flownPath(expandedPath(flight, procedures)) (frame/lib/current_flight.js), the one Fuel shows and the profile’s axis ends on; written again when the procedures arrive after the first drawing, never left on the route alone')
def d88(c):
    f = _proc_flight(by='fuel')
    _open_proc(c, f)
    c.until("() => !!(window.__mp.S.prof && window.__mp.S.route.flown && window.__mp.S.route.flown.length > 4)", timeout=10000, what='the profile on the path')
    c.wait(400)
    r = c.js("""async () => { const S = window.__mp.S, CF = await import('/frame/lib/current_flight.js'),
      nm = S.route.flown.at(-1).nm, route = MapsRender.distances(S.route.points).pop(),
      title = [S.dtitleEl.textContent, S.dtitleEl.title, S.gripEl.title].join(' | '),
      cf = CF.flownPath(CF.expandedPath(S.route.flight, S.procs || {})).at(-1).nm;
      return { nm, route, cf, axis: S.prof.total / 1852, title } }""")
    c.ok(abs(r['nm'] - r['route']) >= 1, f'{r}', 'the fixture’s procedures make the path longer than the route alone (the case means something)')
    c.ok(abs(r['cf'] - r['nm']) < .5 and abs(r['axis'] - r['nm']) < .5, f'{r}', 'the Map’s path, current_flight’s flownPath (Fuel’s) and the profile’s axis: one distance')
    want = f"{round(r['nm'])} NM"
    c.ok(want in r['title'] and f"{round(r['route'])} NM" not in r['title'], f"{r['title']!r} wants {want!r}",
         'the sheet’s title says the path’s distance, not the route alone')
    # Fuel's own figure, read where it is written (the route step's line, « … NM · … · procedures included »)
    c.js("() => { location.hash = '#fuel?focus=route'; return true }")
    c.ready('fuel')
    c.until(r"() => /\d/.test(document.querySelector('[data-module=fuel] [data-rinfo]')?.textContent || '')", timeout=10000, what='Fuel’s distance line')
    c.until(r"""(w) => (document.querySelector('[data-module=fuel] [data-rinfo]').textContent || '').replace(/[\s\u00a0\u202f]+/g, ' ').includes(w)""",
            want, timeout=8000, what=f'Fuel says {want}')


# ------------------------------------------------------------------------------------------------------ D89
# the texts the map canvas writes in one full drawing, read by wrapping fillText on that canvas only
_TEXTS_ONCE = """async () => { const S = window.__mp.S, P = CanvasRenderingContext2D.prototype, o = P.fillText, got = [];
  P.fillText = function (t, ...a) { if (this.canvas === S.canvas) got.push(String(t)); return o.call(this, t, ...a) };
  try { (await import('/modules/maps/draw.js')).schedule(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))) }
  finally { P.fillText = o }
  return got }"""


@case('D89', 'An aerodrome of the route is written once: its name is the route’s label there, at rank 1, in the aerodrome’s style', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), gap 4, SPEC § 3: « one box per key » covers the aerodromes of the route (its ends, a stop, the alternate) — the route’s label of that point is keyed by the aerodrome’s code, the aerodrome’s name is the one box, at rank 1, always written; no « LFBO » or « LFPO » written twice')
def d89(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    docs = _lfbo_docs()
    for icao, view in (('LFBO', '1.25,43.55,1.50,43.72'), ('LFPO', '2.20,48.62,2.55,48.82')):
        c.open(f'maps?view={view}', docs=docs, flight=False, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        c.until("(i) => (window.__mapPass || []).some(x => x.key === i && x.rank === 'aerodrome' && x.r)", icao, timeout=12000,
                what=f'{icao}: the aerodrome’s name placed')
        c.wait(300)
        boxes = [x for x in c.js('() => window.__mapPass') if x['key'] == icao and x['r']]
        c.eq([x['rank'] for x in boxes], ['aerodrome'], f'{icao}: one box for the aerodrome at the end of the route, the aerodrome’s (rank 1)',
             what=f'{icao} boxes')
        texts = [t for t in c.js(_TEXTS_ONCE) if t.startswith(icao)]
        c.eq(len(texts), 1, f'{icao} written once on the map canvas', what=f'{icao} texts {texts}')


# ------------------------------------------------------------------------------------------------------ D90
_LFPO_APP = 'LFPO.APP.ILS06.RW06.NONE'
_LFPO_FILE = {'schema': 1, 'icao': 'LFPO', 'cycle': AERO_CYCLE, 'updated_at': '2026-10-01T00:00:00Z',
              'runways': [{'id': '06', 'lat': 48.7213, 'lon': 2.3256, 'elev': 291, 'qfu': 62, 'true': 63.6, 'length': 3650},
                          {'id': '24', 'lat': 48.7340, 'lon': 2.3986, 'elev': 291, 'qfu': 242, 'true': 243.6, 'length': 3650}],
              'procedures': [{'id': _LFPO_APP, 'icao': 'LFPO', 'kind': 'APP', 'name': 'ILS CAT I or CAT II or CAT III RWY 06', 'runways': ['06'],
                              'transition': None, 'status': 'official', 'source': {'kind': 'eaip', 'ref': 'test', 'cycle': AERO_CYCLE, 'at': '2026-10-01'},
                              'points': [{'seq': 1, 'id': 'IPO06', 'lat': 48.5970, 'lon': 2.0806, 'alt': {'type': 'at', 'ft': 4000}, 'phase': 'main'},
                                         {'seq': 2, 'id': 'RW06', 'lat': 48.7213, 'lon': 2.3256, 'alt': None, 'phase': 'main'}]}]}


@case('D90', 'The flight’s map names its procedures as the choose pane and Fuel do: « AMOLO7A », « ILS 06 », never the base’s raw name', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), gap 5, SPEC § 5: the map of the flight names a procedure by displayName / labelOf of frame/lib/procedures.js (a final by its short label), as the choose pane and Fuel; the chosen SID’s name is a procedure label (rank 4) that slides along its trace before being forced')
def d90(c):
    docs = _lfbo_docs()
    f = next(d[1] for d in docs if d[0] == PATH)
    f['route']['procedures']['arr'] = {'rwy': '06', 'app': _LFPO_APP}
    docs = docs + [['proc/manual/LFPO.json', _LFPO_FILE, 'reference']]
    c.open('maps', docs=docs, flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S.route.path && window.__mp.S.route.path.some(p => p.origin === 'app') && window.__mp.S.route.path.some(p => p.origin === 'sid'))",
            timeout=12000, what='the path holds the SID and the approach')
    c.wait(500)
    # the exact strings of displayName (frame/lib/procedures.js), compared as they are at the three places
    names = c.js("""async () => { const PR = await import('/frame/lib/procedures.js'), P = window.__mp.S.procs;
      return [PR.displayName(P.sid), PR.displayName(P.app)] }""")
    c.eq(names, ['AMOLO7A', 'ILS 06'], 'displayName gives « AMOLO7A » (the record’s name) and « ILS 06 » (labelOf)', what='displayName')
    texts = c.js(_TEXTS_ONCE)
    c.ok(all(n in texts for n in names), f'{[t for t in texts if "AMOLO" in t or "ILS" in t]}', 'the map writes the exact strings of displayName')
    c.eq([t for t in texts if 'CAT' in t or t.startswith(('SID ', 'APP ', 'STAR '))], [], 'never the base’s raw name nor a kind before it',
         what='raw names on the map')
    # the choose pane says the same
    c.js("() => { location.hash = '#maps?choose=arr&icao=LFPO'; return true }")
    c.until("() => !!(window.__mp.S && window.__mp.S.choose && window.__mp.S.choose.ready) && document.querySelectorAll('.mp-ch-grp').length >= 2",
            timeout=12000, what='the choose pane at LFPO')
    pane = c.js(r"() => document.querySelector('[data-module=maps]').innerText.replace(/\s+/g, ' ')")
    c.ok(names[1] in pane, pane[:300], 'the choose pane names the final by the same string')
    # and Fuel
    c.js("async () => { (await import('/modules/maps/choose.js')).chooseClose(); return true }")
    c.until("() => location.hash.startsWith('#fuel')", timeout=6000, what='back to Fuel')
    c.ready('fuel')
    c.until("(n) => n.every(x => document.querySelector('[data-module=fuel]').innerText.includes(x))", names,
            timeout=10000, what='Fuel names them by the same strings')


# ------------------------------------------------------------------------------------------------------ D91
_CH_ENTRY = """async () => { const S = window.__mp.S, C = S.choose, ch = await import('/modules/maps/choose.js'), r = S.canvas.getBoundingClientRect(),
  W = r.width, H = r.height, at = S.toC(C.input.at.lat, C.input.at.lon), procs = new Set(C.model.rows.filter(i => i.fam !== 'rwy').map(i => i.id)),
  inside = p => p.x > 10 && p.y > 10 && p.x < W - 60 && p.y < H - 10;
  let spot = null;
  for (const l of C.hits.lines) if (procs.has(l.id) && !spot)
    for (let i = 1; i < l.pts.length && !spot; i++) for (let k = 1; k < 40; k++) {
      const t = k / 40, p = { x: l.pts[i - 1].x + (l.pts[i].x - l.pts[i - 1].x) * t, y: l.pts[i - 1].y + (l.pts[i].y - l.pts[i - 1].y) * t };
      if (inside(p)) { spot = p; break } }
  const sheet = S.dataEl.getBoundingClientRect().height, view = S.dataEl.parentElement.clientHeight;
  return { W, H, at, traces: C.hits.lines.filter(l => procs.has(l.id)).length, chosen: C.model.rows.filter(i => i.chosen).map(i => i.id), spot, sheet, view } }"""


@case('D91', 'Choosing starts on the map: at entry the aerodrome is centred and the first family’s candidates are drawn, faded; touching one chooses it', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), gap 6, SPEC § 5.1: at entry, before any touch, the aerodrome is framed at the centre and the candidates of the first family not chosen are drawn (the runways with their numbers, then the compatible procedures of the next family, faded, without cartouches), as « N others »; the sheet is half the view at most; a faded trace is a trace like the others — touching it chooses it as its row would (the gesture of § 10.23 and D60); nothing is written before « Done »')
def d91(c):
    _ch_open(c, {})
    c.wait(500)
    e = c.js(_CH_ENTRY)
    c.eq(e['chosen'], [], 'nothing chosen at entry', what='entry')
    c.ok(e['traces'] >= 1, f'{e["traces"]} procedure traces', 'at least one procedure is drawn before any touch')
    c.ok(abs(e['at']['x'] - e['W'] / 2) < e['W'] * .2 and abs(e['at']['y'] - e['H'] / 2) < e['H'] * .2, f"{e['at']} in {e['W']:.0f}×{e['H']:.0f}",
         'the aerodrome is near the centre of the map')
    c.ok(e['sheet'] <= e['view'] / 2 + 1, f"{e['sheet']} / {e['view']}", 'the sheet is half the view at most')
    c.ok(e['spot'] is not None, f'{e}', 'a faded trace lies inside the map')
    before = c.doc(PATH)
    got = c.js("""async (p) => { const ch = await import('/modules/maps/choose.js'), S = window.__mp.S, id = ch.chooseAt(p.x, p.y);
      ch.chooseTap(p.x, p.y); const row = S.choose.model.rows.find(i => i.id === id);
      const btn = document.querySelector(`.mp-ch-row[data-id="${id}"]`);
      return { id, chosen: !!row && row.chosen, fam: row && row.fam, pressed: btn && btn.getAttribute('aria-pressed') } }""", e['spot'])
    c.ok(got['id'] and got['chosen'], f'{got}', 'touching a faded trace chooses its procedure')
    c.eq(got['pressed'], 'true', 'its row in the pane is marked (one writer: the choice’s state)', what=f'row {got["id"]}')
    c.eq(c.doc(PATH), before, 'nothing written before « Done »', what='the flight')


# ------------------------------------------------------------------------------------------------------ D92
# 49 aerodromes 1 to 1.5 NM apart: from afar their symbols overlap and the full drawing thins them out
_DENSE_ADS = [{'icao': f'LFX{chr(65 + i)}' if i < 26 else f'LFY{chr(39 + i)}', 'name': f'DENSE {i}', 'lat': 46.2 + (i // 7) * .02,
               'lon': -.2 + (i % 7) * .025, 'elev': 100, 'public': True, 'hardLen': 900 + 50 * i} for i in range(49)]
_LIGHT_SET = """async () => { const S = window.__mp.S, L = await import('/modules/maps/light.js'), r = S.canvas.getBoundingClientRect(),
  inside = h => h.x >= 0 && h.y >= 0 && h.x <= r.width && h.y <= r.height,
  // the full drawing's aerodromes: one name request per symbol drawn, in the map's pass (an independent reading of drawPoints)
  full = [...new Set((window.__mapPass || []).filter(x => x.rank === 'aerodrome').map(x => x.key))].filter(k => /^LF[XY]/.test(k)).sort(),
  lite = (S.lightSrc?.aerodromes || []).map(a => a.icao).filter(k => /^LF[XY]/.test(k)).sort(),
  cv = document.createElement('canvas'); cv.width = r.width; cv.height = r.height;
  const n = L.drawLight(cv.getContext('2d'), L.lightPaths(S.lightSrc), { project: ll => S.map.project(ll), zoom: S.map.getZoom(), W: r.width,
    H: r.height, dpr: 1, pal: MapsRender.palette(false), paper: '#fff' });
  return { full, lite, n, shown: (S.lightSrc?.aerodromes || []).map(a => ({ a, ...S.toC(+a.lat, +a.lon) })).filter(inside).length,
    listed: (S.data?.data?.aerodromes || []).filter(a => /^LF[XY]/.test(a.icao)).length } }"""


@case('D92', 'The light drawing of a gesture draws the aerodromes the full drawing drew, no more, as simple marks of their colour', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='sixth reading (31 Oct 2026), gap 7, SPEC § 6.8: the light drawing takes the aerodromes (and beacons) the last full drawing drew — the zoom rule and the thinning of the symbols choose, never the drawing mode — and marks each with a ring of its symbol’s colour and size; the picture does not change at the start or the end of a gesture')
def d92(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    docs = fdocs(flight()) + [['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']]
    c.open('maps?view=-1.6,45.6,1.6,47.4', docs=docs, flight=False, airfields=True, aero_extra={'aerodromes': _DENSE_ADS, 'cells': {'46': [[-1, 1]]}}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.lightSrc && (window.__mp.S.adHits || []).some(h => /^LF[XY]/.test(h.a.icao)))",
            timeout=15000, what='the dense aerodromes drawn and the light source kept')
    c.wait(400)
    r = c.js(_LIGHT_SET)
    c.ok(r['listed'] >= 40 and 0 < len(r['full']) < r['listed'], f"{len(r['full'])} drawn of {r['listed']}", 'the full drawing thins the dense aerodromes out (the case means something)')
    c.eq(r['lite'], r['full'], 'the light drawing’s aerodromes are the full drawing’s, at this zoom', what='aerodromes')
    c.eq(r['n'], r['shown'], 'it paints a mark for each of them in the frame', what='marks painted')


# ------------------------------------------------------------------------------------------------------ D93
def _terrarium_png(metres=300):
    """A 256 x 256 Terrarium tile of one elevation (R * 256 + G + B / 256 - 32768 = metres), as PNG bytes (standard library)."""
    import struct
    import zlib
    v = int(metres) + 32768
    px = bytes([v // 256, v % 256, 0])
    raw = b''.join(bytes([0]) + px * 256 for _ in range(256))

    def chunk(t, data):
        return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)
    head = bytes([0x89]) + b'PNG' + bytes([13, 10, 26, 10])
    return head + chunk(b'IHDR', struct.pack('>IIBBBBB', 256, 256, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')


@case('D93', 'The profile is built without waiting for a relief tile, with the cells’ MORA, and completed when the tiles arrive', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False,
      rule='Simplification after D86 / D87 (31 Oct 2026), SPEC § 8.3: the profile is built first without the relief (the cells’ MORA, « Relief unavailable » while nothing has arrived) and drawn; no wait for a tile holds the building back; when the tiles are read the profile is made again with the relief and replaces it; one writer of the profile (showProf)')
def d93(c):
    held = []
    c.page.route(re.compile(r'.*elevation-tiles.*'), lambda r: held.append(r))   # held: the requests hang until released below
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.geo)", timeout=8000, what='the profile built and drawn though no relief tile answers')
    c.until("() => !!(window.__mp.S.softHtml || '').length", timeout=3000, what='the notes written')
    st = c.js("() => { const S = window.__mp.S; return { pending: !!S.terrainPending, ok: !!S.prof.terrainOk, hidden: S.dataEl.hidden, notes: S.softHtml || '' } }")
    c.ok(st['pending'] and not st['ok'] and not st['hidden'], f'{st}', 'the sheet shows the profile, with the MORA, while the relief is awaited')
    c.ok(norm(row(c, 'noTerrain')) in norm(st['notes']), st['notes'][:160], '« Relief unavailable » while nothing has arrived')
    c.ok(len(held) > 0, f'{len(held)} tile requests held', 'the relief was asked')
    # the tiles arrive: the profile is completed with the relief, the note goes
    png = _terrarium_png(300)
    c.page.unroute(re.compile(r'.*elevation-tiles.*'))
    c.page.route(re.compile(r'.*elevation-tiles.*'), lambda r: r.fulfill(status=200, content_type='image/png', body=png))
    for r in held:
        try:
            r.fulfill(status=200, content_type='image/png', body=png)
        except Exception:
            pass
    c.until("() => !!(window.__mp.S.prof && window.__mp.S.prof.terrainOk && !window.__mp.S.terrainPending)", timeout=15000,
            what='the profile completed with the relief')
    c.wait(300)
    notes = c.js("() => window.__mp.S.softHtml || ''")
    c.ok(norm(row(c, 'noTerrain')) not in norm(notes), notes[:160], 'the note goes when the relief has arrived')


# ------------------------------------------------------------------------------------------------------ D94
@case('D94', 'The map base’s zones layer: a tap on a zone gives its id, a tap outside or a drag gives nothing, two rings are one zone', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='map base (modules/maps/INTEGRATION.md § 7), asked by Settings for the Data module’s map of zones (user, 31 Oct: « la vraie carte »): zonesLayer(map, features, { colors, onTap }) → { update, fit, remove }; filled polygons by zone id, the tone’s colour from the caller, picked thicker, approx dashed; onTap(id) on a tap alone, never at the end of a drag; the layers kept across a change of style; nothing read nor written by the base')
def d94(c):
    c.page.goto(f'{c.base}/modules/maps/lib/test/zones_layer.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__zl && (window.__zl.ready || window.__zl.failed)', timeout=30000)
    except Exception:
        raise Fail('the bench never drew its map', 'a map with its zones', 'modules/maps/lib/test/zones_layer.html') from None
    c.ok(not c.js('window.__zl.failed'), 'no map', 'the base’s map is created (local style, no network)')
    c.eq(len(c.js('window.__zl.layers()')), 3, 'one fill and two line layers (solid, dashed)', what='layers')
    m = c.page.mouse

    def tap_at(lon, lat):
        p = c.js('(q) => window.__zl.at(q[0], q[1])', [lon, lat])
        m.click(p['x'], p['y'])
        c.wait(250)
    tap_at(5, 45)
    tap_at(22.5, 42.5)
    tap_at(32.5, 42.5)
    tap_at(15, 47)      # between the zones: nothing
    c.eq(c.js('window.__zl.taps'), ['A', 'B', 'B'], 'a tap gives the zone under it; the two rings of B are one zone; a tap outside gives nothing',
         what='taps')
    # a drag that starts and ends on a zone: the map moves, nothing is tapped
    a = c.js('() => window.__zl.at(3, 44)')
    m.move(a['x'], a['y'])
    m.down()
    for i in range(10):
        m.move(a['x'] + 6 * (i + 1), a['y'] + 2 * (i + 1))
        c.wait(16)
    m.up()
    c.wait(300)
    c.eq(c.js('window.__zl.taps.length'), 3, 'a drag gives nothing', what='taps after a drag')
    # update: other data and colours, the layers kept; a change of style: the layers come back
    c.js("""() => { const Z = window.__zl; Z.layer.update(Z.fc('err'), { ...Z.colors, err: '#ff0000' }); return true }""")
    c.wait(300)
    c.eq(len(c.js('window.__zl.layers()')), 3, 'update keeps the layers', what='layers after update')
    c.js("""() => { const Z = window.__zl; Z.map.setStyle(JSON.parse(JSON.stringify(Z.style))); return true }""")
    c.until("() => window.__zl.map.isStyleLoaded() && window.__zl.layers().length === 3", timeout=8000, what='the layers back after setStyle')
    tap_at(5, 45)
    c.eq(c.js('window.__zl.taps.at(-1)'), 'A', 'after the change of style a tap still gives the zone', what='tap after setStyle')
    # fit on a zone across the antimeridian with far islands (the 48 states and the Aleutians): its main ring, never the world
    us = c.js("""() => { const Z = window.__zl, ring = c => [c.concat([c[0]])];
      const us = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'us', tone: 'ok' }, geometry: { type: 'MultiPolygon',
        coordinates: [ring([[-125, 25], [-67, 25], [-67, 49], [-125, 49]]), ring([[172, 51], [179.9, 51], [-170, 52], [-170, 53], [172, 53]]),
          ring([[-160, 19], [-155, 19], [-155, 22], [-160, 22]])] } }] };
      const L = Z.zonesLayer(Z.map, us, { colors: Z.colors }); L.fit(10);
      const b = Z.map.getBounds(), out = { w: b.getWest(), e: b.getEast(), s: b.getSouth(), n: b.getNorth() };
      L.fit(10, [170, -20, 190, 0]); const c = Z.map.getCenter();
      L.remove(); return { ...out, lon: c.lng } }""")
    c.ok(us['e'] - us['w'] < 120 and us['w'] > -140 and us['e'] < -50, f'{us}', 'fit() on a zone with the Aleutians frames the 48 states, not the world')
    c.ok(abs(((us['lon'] - 180 + 540) % 360) - 180) < 3, f'{us}', 'fit(padding, bounds) frames the given box, its east beyond 180° (a map with worldCopies)')
    c.js('() => { window.__zl.layer.remove(); return true }')
    c.eq(c.js('window.__zl.layers()'), [], 'remove takes the layers away', what='layers after remove')
    before = c.js('window.__zl.taps.length')
    tap_at(5, 45)
    c.eq(c.js('window.__zl.taps.length'), before, 'and its listener: a tap gives nothing more', what='taps after remove')


# ------------------------------------------------------------------------------------------------------ D95
@case('D95', 'The map base’s points layer: a tap on a point gives its id before the zone under it; nothing under its zoom; one cover zoom', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='map base (modules/maps/INTEGRATION.md § 7), asked by Settings for the Data module’s map of procedures (31 Oct / 1 Nov): pointsLayer(map, features, { colors, onTap, minzoom }) → { update, fit, remove }; a dot by ICAO code in the tone’s colour from the caller, fixed size, nothing under minzoom (COVER_ZOOM by default); a tap on a point gives its id and never ticks the zone under it; the layer kept across a change of style; COVER_ZOOM is the one value the Map’s coverPins reads too')
def d95(c):
    c.page.goto(f'{c.base}/modules/maps/lib/test/zones_layer.html', wait_until='load')
    c.page.wait_for_function('window.__zl && (window.__zl.ready || window.__zl.failed)', timeout=30000)
    c.eq(c.js('window.__zl.COVER_ZOOM'), 7, 'one cover zoom, exported by the base (the threshold the Map’s coverPins used: 180 px per degree)', what='COVER_ZOOM')
    c.js("""() => { const Z = window.__zl, pt = (id, lon, lat, tone) => ({ type: 'Feature', properties: { id, tone }, geometry: { type: 'Point', coordinates: [lon, lat] } });
      Z.pfc = { type: 'FeatureCollection', features: [pt('LFAA', 5, 45, 'ok'), pt('LFBB', 15, 47, 'warn')] };
      Z.points = Z.pointsLayer(Z.map, Z.pfc, { colors: Z.colors, onTap: id => Z.ptaps.push(id), minzoom: 0 });
      Z.hidden = Z.pointsLayer(Z.map, { type: 'FeatureCollection', features: [pt('LFCC', 17, 48, 'ok')] }, { colors: Z.colors, onTap: id => Z.ptaps.push(id) });
      return true }""")
    c.until("() => window.__zl.map.isStyleLoaded() && window.__zl.map.loaded()", timeout=5000, what='the points drawn')
    c.wait(400)
    m = c.page.mouse

    def tap_at(lon, lat):
        p = c.js('(q) => window.__zl.at(q[0], q[1])', [lon, lat])
        m.click(p['x'], p['y'])
        c.wait(250)
    tap_at(5, 45)      # a point over zone A
    tap_at(15, 47)     # a point between the zones
    tap_at(17, 48)     # a point under its zoom (COVER_ZOOM, the bench is far below): not drawn, not tapped
    tap_at(8, 42)      # zone A away from the point
    c.eq(c.js('window.__zl.ptaps'), ['LFAA', 'LFBB'], 'a tap on a point gives its ICAO code; a point under its zoom is neither drawn nor tapped', what='point taps')
    c.eq(c.js('window.__zl.taps'), ['A'], 'the zone under a tapped point is not ticked; a tap on the zone elsewhere still is', what='zone taps')
    c.js("() => { const Z = window.__zl; Z.map.setStyle(JSON.parse(JSON.stringify(Z.style))); return true }")
    c.until("() => window.__zl.map.isStyleLoaded() && (window.__zl.map.getStyle().layers || []).some(l => l.id.startsWith('mb-points-'))", timeout=8000,
            what='the points back after setStyle')
    c.wait(300)
    tap_at(15, 47)
    c.eq(c.js('window.__zl.ptaps.at(-1)'), 'LFBB', 'after the change of style a tap still gives the point', what='tap after setStyle')
    c.js("() => { window.__zl.points.remove(); window.__zl.hidden.remove(); return true }")
    tap_at(15, 47)
    c.eq(c.js('window.__zl.ptaps.length'), 3, 'remove silences the points', what='taps after remove')


# ------------------------------------------------------------------------------------------------------ D96
# every full drawing of the first load noted at its end (performance.measure 'maps:draw'): data shown or not, the sheet's height
_FLICKER_JS = """(() => { const rec = window.__flk = { draws: [] }; import('/modules/maps/state.js').then(m => { rec.m = m });
  const o = performance.measure.bind(performance);
  performance.measure = function (n, ...a) {
    const S = rec.m && rec.m.S;
    if (n === 'maps:draw' && S) rec.draws.push([!!S.data, S.dataEl && !S.dataEl.hidden ? Math.round(S.dataEl.getBoundingClientRect().height) : 0]);
    return o(n, ...a) } })()"""


@case('D96', 'No flicker at the first display: arrivals never show a map without its data, the sheet never jumps', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False,
      rule='user, 1 Nov 2026 (« elle clignote une bonne dizaine de fois, puis s’affiche »), SPEC § 6.8: the data shown stay until the new ones are read and are replaced at once (an aerodb arrival or another flight never resets them); the profile stays while it is rebuilt (the sheet neither disappears nor changes height); one drawing per animation frame')
def d96(c):
    held = []
    c.page.add_init_script(_PROC_HOOK)
    c.page.add_init_script(_FLICKER_JS)
    c.page.route(re.compile(r'^https://tiles\.openfreemap\.org/styles/'), lambda r: held.append(r))   # the base map held, then released
    f = _proc_flight(by='fuel')
    _open_proc(c, f)
    c.until("() => !!(window.__mp.S.data && window.__mp.S.prof)", timeout=12000, what='the first data and profile')
    for r in held:
        try:
            r.fulfill(status=200, content_type='application/json', body=STUB_STYLE)
        except Exception:
            pass
    # aerodb's parts arriving one by one: each a « change » of the zone
    for i in range(5):
        c.js("() => { (window.__pc.fns || []).forEach(f => f({ zone: 'fr', changed: true })); return true }")
        c.wait(180)
    c.wait(1500)
    r = c.js("() => ({ draws: window.__flk.draws, gen: window.__mp.S.dataGen || 0, fresh: (window.__mp.S.data.gen || 0) === (window.__mp.S.dataGen || 0) })")
    d = r['draws']
    first = next((i for i, x in enumerate(d) if x[0]), None)
    c.ok(first is not None, f'{len(d)} drawings', 'the data were drawn')
    empty = [i for i, x in enumerate(d) if i > first and not x[0]]
    c.eq(empty, [], 'no drawing without the data once they were shown', what=f'empty drawings of {len(d)}')
    shown = [x[1] for x in d if x[1] > 0]
    jumps = sum(1 for a, b in zip(shown, shown[1:]) if abs(a - b) > 1)
    hidden = [i for i, x in enumerate(d) if i > first and x[1] == 0 and any(y[1] > 0 for y in d[:i])]
    c.eq((jumps, hidden), (0, []), 'the sheet neither changes height nor disappears while the data and the profile are rebuilt', what=f'sheet heights {shown[:12]}')
    c.ok(r['gen'] >= 5 and r['fresh'], f"generation {r['gen']}, fresh {r['fresh']}", 'each arrival was read again, the last one is shown')


# ------------------------------------------------------------------------------------------------------ D97
_FRAME_COVER = """() => { const S = window.__mp.S, F = S.frame, r = S.box.getBoundingClientRect(), a = S.map.project(F.g0), b = S.map.project(F.g1);
  return { a: [a.x, a.y], b: [b.x, b.y], W: r.width, H: r.height, cw: S.canvas.clientWidth, ch: S.canvas.clientHeight } }"""


@case('D97', 'The drawing is the view: no overflow (OVER = 0, 6 Nov 2026), the canvas is the box, the last image covers it, no label outside', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='decision 1.1 of 6 Nov 2026 (cost rule over a comfort not asked for), SPEC § 5: the overlay canvas is the view (OVER = 0); the full drawing covers the view exactly; the labels stay in the view; the 5 % overflow of 1 Nov is one constant away')
def d97(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn && window.__mp.S.frame && window.__mp.S.frame.ok)", timeout=15000,
            what='the map drawn')
    c.wait(400)
    f = c.js(_FRAME_COVER)
    c.ok(abs(f['cw'] - f['W']) <= 1 and abs(f['ch'] - f['H']) <= 1, f'{f}', 'the overlay is the view, no overflow')
    c.ok(f['a'][0] <= 1 and f['a'][1] <= 1 and f['b'][0] >= f['W'] - 1 and f['b'][1] >= f['H'] - 1, f'{f}', 'the last full image covers the view')
    z = c.js("() => { const S = window.__mp.S, r = S.box.getBoundingClientRect(); return { n: (S.zoneHits || []).length, out: (S.zoneHits || []).filter(h => !(h.x1 > 0 && h.x0 < r.width && h.y1 > 0 && h.y0 < r.height)).length } }")
    c.eq(z['out'], 0, 'no label drawn wholly outside the view', what=f"airspace labels outside, of {z['n']}")


# ------------------------------------------------------------------------------------------------------ D98
@case('D98', 'The light drawing of a gesture follows the chosen SID, never the plain route it replaces', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user, 1 Nov 2026 (« la SID ou STAR doit s’afficher en lieu et place de la route de base »), SPEC § 5: the light drawing’s route is the flown path (S.route.flown: the route with the chosen SID, STAR and approach in place of the legs they replace, the missed approach left out); the plain route only without a path')
def d98(c):
    c.open('maps?view=0.9,43.3,2.9,44.1', docs=_lfbo_docs(), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.route && (window.__mp.S.route.flown || []).some(p => p.origin === 'sid') && window.__mp.S.lightSrc)",
            timeout=12000, what='the flown path holds the SID AMOLO 7A and a full drawing kept the light source')
    r = c.js("""() => { const S = window.__mp.S, k = p => `${p.id || ''}@${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)}`;
      return { light: (S.lightSrc.route || []).map(k), flown: (S.route.flown || []).map(k), sid: (S.lightSrc.route || []).filter(p => p.origin === 'sid').length,
        points: (S.route.points || []).length } }""")
    c.ok(r['sid'] > 0, f"{r['sid']} SID points of {len(r['light'])}", 'the light drawing’s route holds the SID’s points')
    c.eq(r['light'], r['flown'], 'it is the flown path, point for point (not the route’s points)', what='light route')
    c.ok(len(r['light']) > r['points'], f"{len(r['light'])} points against {r['points']} in the route", 'more points than the plain route: the SID replaces its first leg')


# ------------------------------------------------------------------------------------------------------ D100
# every camera MapLibre is told to take after creation, and every full drawing: its camera and the map box's height
_ONE_IMAGE_SPY = """() => { const P = window.maplibregl && window.maplibregl.Map && window.maplibregl.Map.prototype; window.__one = { cams: [], draws: [] };
  if (P && !P.__one) { P.__one = 1; for (const k of ['jumpTo', 'fitBounds', 'easeTo', 'flyTo', 'setCenter', 'setZoom'])
    { const o = P[k]; P[k] = function (...a) { const all = new Error().stack.split(String.fromCharCode(10)).map(l => l.trim()), st = all.slice(2, 5);
      // the constructor's own camera (center / zoom given at creation) is the creation camera, not a second one
      if (window.__one && !all.some(l => /^at new [A-Za-z_$.]*Map /.test(l))) window.__one.cams.push(k + ' ' + st.join(' < ')); return o.apply(this, a) } } }
  const R = window.MapsRender; if (!R.__one) { R.__one = 1; const o = R.draw; R.draw = function (...a) { const S = window.__mp && window.__mp.S, m = S && S.map;
    if (window.__one && S) window.__one.draws.push({ map: !!m, lng: m ? m.getCenter().lng : null, lat: m ? m.getCenter().lat : null, zoom: m ? m.getZoom() : null,
      box: S.box.clientHeight }); return o.apply(this, a) } } return true }"""


def _one_image(c, what):
    d = c.js("() => window.__one")
    draws, cams = d['draws'], d['cams']
    c.ok(len(draws) > 0, f'{len(draws)} drawings', f'{what}: the map was drawn')
    c.eq([x for x in draws if not x['map']], [], f'{what}: no drawing before the base map (no plain image with another framing)', what='drawings without the map')
    first = draws[0] if draws else {}
    other = [x for x in draws if x['map'] and (abs(x['lng'] - first['lng']) > 1e-6 or abs(x['lat'] - first['lat']) > 1e-6 or abs(x['zoom'] - first['zoom']) > 1e-5)]
    c.eq(other, [], f'{what}: every drawing has the first one’s framing', what='drawings with another camera')
    c.eq(sorted(set(x['box'] for x in draws)), [first.get('box')], f'{what}: the map’s box never changes height (the sheet is at its height from the start)', what='box heights')
    c.eq(cams, [], f'{what}: one camera, the one the map was created with (no fit then a return)', what='camera calls after creation')
    return first


@case('D100', 'One opening, one image: the framing (kept or the flight) is decided before the first drawing, on the map’s final size', 'D',
      tags=('maps', 'sheet'), screens=False, designs=('standard',), night=False,
      rule='user, 1 Nov 2026 (« le trajet total s’affiche, puis remonte, puis le zoom précédent s’affiche »), SPEC § 5: one framing per opening, decided before the first drawing — the user’s kept framing of this same flight, else the flight — on the map’s final height (the sheet laid out first); nothing drawn while the base map loads; no fit followed by a return')
def d100(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn && window.__mp.S.prof)", timeout=15000, what='the map, its camera and the profile')
    c.wait(400)
    # the pilot frames the flight their way, goes to Fuel and comes back: the spy set while on Fuel
    c.js("() => { const m = window.__mp.S.map; m.jumpTo({ center: [m.getCenter().lng + 0.6, m.getCenter().lat - 0.4], zoom: m.getZoom() + 1 }); return true }")
    c.wait(400)
    mine = c.js(_CAM_JS)
    c.js("() => { location.hash = '#fuel'; return true }")
    c.ready('fuel')
    c.js(_ONE_IMAGE_SPY)
    c.js("() => { location.hash = '#maps'; return true }")
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn && window.__mp.S.prof)", timeout=15000, what='the map again, with its profile')
    c.wait(1500)
    first = _one_image(c, 'back from Fuel with a kept framing')
    sig = c.js("async () => { const st = await import('/modules/maps/state.js'), sc = await import('/modules/maps/screen.js'); return { kept: st.keep.cam && st.keep.cam.sig, now: sc.flightSig() } }")
    c.ok(first and abs(first['lng'] - mine['lng']) < 1e-3 and abs(first['zoom'] - mine['zoom']) < .01, f'{mine} → {first}; {sig}', 'and it is the user’s framing')
    # untouched framing: another flight’s signature forgets it; the flight is framed, still one image
    c.js("""async () => { const S = window.__mp.S, p = 'pilot/ABC/current_flight.json', f = await S.ctx.data.get(p);
      f.route = { ...f.route, text: 'LFRS NEPIX LFML', points: f.route.points.filter(q => q.id !== 'LUGEN') };
      f.updated_at = new Date().toISOString(); await S.ctx.data.put(p, f); return true }""")
    c.wait(800)
    c.js("() => { location.hash = '#fuel'; return true }")
    c.ready('fuel')
    c.js(_ONE_IMAGE_SPY)
    c.js("() => { location.hash = '#maps'; return true }")
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.drawn && window.__mp.S.prof)", timeout=15000, what='the map again, with its profile')
    c.wait(1500)
    _one_image(c, 'back from Fuel, the flight framed')


# ------------------------------------------------------------------------------------------------------ D101
# 150 aerodromes over the view: 40 big ones (an ICAO code, a tower, 2600 m of hard runway), 110 small strips (no code, 600 m)
_MANY_ADS = [{'icao': f'LFB{chr(65 + i // 26)}{chr(65 + i % 26)}' if i < 40 else '', 'id': f'AD{i}', 'name': f'AD {i}', 'lat': 45.7 + (i % 10) * .16,
              'lon': -1.4 + (i // 10) * .19, 'elev': 100, 'public': True, 'controlled': i < 40, 'hardLen': 2600 if i < 40 else 600} for i in range(150)]


@case('D101', 'Density: the aerodromes shown are the biggest first, at most one per 12 000 px² of the view, the route’s ends always; the small ones come by zooming', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='user, 1–5 Nov 2026 (the US at z5 covered with big symbols; « on montre les plus gros avant les plus petits »), SPEC § 3, Density: an importance score (an ICAO code, tower / AFIS, longest hard runway, runways, State / public; heliports, water and closed military behind), the first adCap of the view by score (one per 12 000 px², 12 at least), the route’s ends and alternate always; the symbol 60 % under COVER_ZOOM and full size from runwayZoom; the names follow their symbols')
def d101(c):
    docs = fdocs(flight()) + [['cache/maps/ui.json', {'preset': 'vfr', 'layers': {}}, 'cache']]
    c.open('maps?view=-1.6,45.6,1.6,47.4', docs=docs, flight=False, airfields=True, aero_extra={'aerodromes': _MANY_ADS, 'cells': {'45': [[-2, 2]], '46': [[-2, 2]], '47': [[-2, 2]]}}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.map && window.__mp.S.lightSrc && (window.__mp.S.data.data.aerodromes || []).length >= 150)", timeout=20000,
            what='the 150 aerodromes read and drawn')
    c.wait(500)
    r = c.js("""() => { const S = window.__mp.S, W = S.canvas.clientWidth, H = S.canvas.clientHeight, cap = Math.max(12, Math.round(W * H / 12000)),
      mine = (S.lightSrc.aerodromes || []).filter(a => /^AD|^LFB[A-Z]{2}$/.test(a.id || a.icao) && a.name !== 'Nantes');
      return { cap, W, H, n: mine.length, big: mine.filter(a => a.controlled).length, small: mine.filter(a => !a.controlled).length,
        inView: (S.data.data.aerodromes || []).filter(a => /^AD/.test(a.id || '') && a.controlled).map(a => S.map.project([a.lon, a.lat])).filter(p => p.x > 0 && p.y > 0 && p.x < W && p.y < H).length } }""")
    c.ok(0 < r['n'] <= r['cap'], f"{r['n']} drawn, cap {r['cap']} ({r['W']}×{r['H']})", 'no more aerodromes than one per 12 000 px² of the view')
    c.ok(r['small'] == 0 or r['big'] >= r['inView'], f"{r['big']} big / {r['small']} small, {r['inView']} big in view", 'a small strip is drawn only when every big one in view is')


# ------------------------------------------------------------------------------------------------------ D102
def _awy_flight():
    """P1 → P4 along 45°N (lon −0.5 … 3.5), level 8 000 ft; the airway AW1 follows the four legs (6 500 – 19 500 ft)."""
    f = flight()
    f['route'] = {'text': 'P1 P2 P3 P4', 'dep': '', 'arr': '', 'points': [{'id': f'P{i + 1}', 'lat': 45.0, 'lon': -0.5 + i * 1.333} for i in range(4)]}
    f['level'] = {'ft': 8000}
    return f


def _awy_rows():
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'TMA', 'cls': 'D', 'name': 'COVER TMA 1', 'lower': '2000 ft AMSL', 'upper': 'FL115', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'TMA', 'cls': 'F', 'name': 'FREE TMA 2', 'lower': '2000 ft AMSL', 'upper': 'FL150', 'rings': [ring(44.6, 45.4, 1.9, 2.4)]}]
    segs = [{'route': 'AW1', 'a': {'id': f'P{i}', 'lat': 45.0, 'lon': -0.5 + (i - 1) * 1.333}, 'b': {'id': f'P{i + 1}', 'lat': 45.0, 'lon': -0.5 + i * 1.333},
             'lower': 6500, 'upper': 19500, 'nm': 56.0} for i in range(1, 4)]
    return zones, segs


@case('D102', 'Airways on the profile: the route’s airway is a named block, hidden under a class D space, not under a class F one', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='user (SOG-0001, 4–5 Nov 2026), SPEC § 8.2: each leg of the route whose two points are the ends of an airway segment is a block of that airway (name, floor, ceiling), neighbouring legs of one airway in one block; at each abscissa the most restrictive space wins — where a space of a higher class (A to D, zones R, P, D) covers the airway vertically it is not drawn, a class F space covers nothing')
def d102(c):
    zones, segs = _awy_rows()
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, airways=segs, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.airway))", timeout=15000, what='the profile with the airway’s blocks')
    r = c.js("""() => { const cr = window.__mp.S.prof.crossed, tma = cr.find(x => /COVER TMA/.test(x.a.name)), fr = cr.find(x => /FREE TMA/.test(x.a.name));
      return { awy: cr.filter(x => x.a.airway).map(x => ({ n: x.a.name, i0: x.i0, i1: x.i1, lo: x.a.lower, up: x.a.upper })), tma: tma && [tma.i0, tma.i1], free: fr && [fr.i0, fr.i1] } }""")
    c.ok(r['tma'] is not None, f'{r}', 'the class D space is drawn')
    c.eq([a['n'] for a in r['awy']], ['AW1', 'AW1'], 'the airway is two blocks, named: before and after the class D space (the F space cuts nothing)', what=f'{r}')
    a, b = r['awy'][0], r['awy'][1]
    c.ok(a['i1'] < r['tma'][0] and b['i0'] > r['tma'][1], f'{r}', 'no airway block under the class D space, whose abscissae it does not use')
    c.ok(r['free'] is not None and b['i0'] <= r['free'][0] and b['i1'] >= r['free'][1], f'{r}', 'the class F space does not interrupt the airway')
    c.eq((a['lo'], a['up']), ('FL065', 'FL195'), 'floor and ceiling are the segment’s', what=f'{a}')


# ------------------------------------------------------------------------------------------------------ D103
_PROF_PASS = """() => { const A = window.SiaAero; if (!A.__d103) { const o = A.pass; A.__d103 = 1;
  A.pass = function (ctx, run, rankOf) { const got = [];
    const out = o.call(this, ctx, (c, pl, first) => first ? run(c, pl, first) : run(c, new Proxy(pl, { get(t, k) {
      if (k === 'ask') return req => { const r = t.ask(req); got.push({ layer: req.layer, rank: req.rank, key: String(req.key || ''), placed: !!r }); return r };
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v } }), first), rankOf);
    if (got.some(x => x.layer === 'profile')) window.__profPass = got;
    return out } } return true }"""


@case('D103', 'Unregulated classes in the profile: class E in a light fill with one label at the lowest rank, after the spaces to respect; « ceiling deduced » in the card', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='user (KSET → KDOV, 5 Nov 2026), SPEC § 8.2: a class E, F or G space is drawn in a light fill, without a strong outline, with one label at the profile’s lowest rank (after TOC / TOD, the constraints, the levels, the regulated spaces and the airways); the label of a regulated space is asked first; « ceiling deduced (class A above FL180) » is written in the airspace card when aerodb says capped: classA, never on the profile')
def d103(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _PROF_PASS + ")() } }, 5) })()")
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'CTA', 'cls': 'E', 'name': 'WEST VIRGINIA CLASS E5', 'lower': '1200 ft ASFC', 'upper': '17999 ft AMSL', 'capped': 'classA',
              'rings': [ring(44.6, 45.4, -0.2, 2.4)]},
             {'type': 'TMA', 'cls': 'D', 'name': 'REGULATED TMA 1', 'lower': '2000 ft AMSL', 'upper': 'FL115', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    c.open('maps', docs=fdocs(_awy_flight()), flight=False, airspaces=zones, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => /E5/.test(x.a.name)))", timeout=15000, what='the profile with the class E space')
    c.wait(500)
    c.js("() => { window.__mp.S.prof = Object.assign({}, window.__mp.S.prof); return true }")
    ask = c.js("() => window.__profPass || []")
    zs = [x for x in ask if x['rank'] in ('zone', 'zoneLow')]
    low = [x for x in zs if x['rank'] == 'zoneLow']
    reg = [x for x in zs if x['rank'] == 'zone']
    c.ok(len(low) >= 1 and len(reg) >= 1, f'{zs}', 'the class E space asks at the lowest rank, the class D one at the regulated rank')
    c.ok(all(x['key'].find('E5') >= 0 for x in low) and all(x['key'].find('E5') < 0 for x in reg), f'{zs}', 'one label per space, the E5 under zoneLow only')
    last_reg = max(i for i, x in enumerate(zs) if x['rank'] == 'zone')
    first_low = min(i for i, x in enumerate(zs) if x['rank'] == 'zoneLow')
    c.ok(first_low > last_reg, f'{[x["rank"] for x in zs]}', 'the regulated labels are asked before the class E label')
    # the card: a touch lists the spaces; « ceiling deduced » when aerodb capped the ceiling, in the card only
    txt = c.js("""async () => { const S = window.__mp.S, lv = await import('/modules/maps/lv.js');
      S.lvList = (S.data.data.airspaces || []).filter(a => /E5/.test(a.name)); S.lvAlso = []; if (!S.lvList.length) S.lvList = [{ type: 'CTA', name: 'WEST VIRGINIA CLASS E5', cls: 'E', lower: '1200 ft ASFC', upper: '17999 ft AMSL', capped: 'classA' }];
      lv.showLv(); await new Promise(r => setTimeout(r, 300)); return { card: S.dbodyEl.innerText, strip: S.stripEl ? S.stripEl.textContent : '' } }""")
    pat = r'plafond déduit|ceiling deduced|Obergrenze abgeleitet|techo deducido'
    import re
    c.ok(re.search(pat, txt['card'], re.I) is not None, f"{txt['card']!r}", 'the airspace card says the ceiling is deduced')
    c.ok(re.search(pat, txt['strip'], re.I) is None, f"{txt['strip']!r}", 'and the profile does not')


# ------------------------------------------------------------------------------------------------------ D104
@case('D104', 'The vertical path: drawn as soon as a level exists; without one the profile says what is missing; estimated rates are said', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='user (SOG-0006, 4–5 Nov 2026), SPEC § 8.2: the vertical path (climb, level, descent) is drawn on the profile as soon as a cruise level exists — with fuel’s path, its plan, the aircraft’s rates, else standard rates (said in a note); without a level it is not drawn and a note says so, with a way to Fuel')
def d104(c):
    f = _awy_flight()
    f['level'] = {}
    f.pop('profile', None)
    c.open('maps', docs=fdocs(f), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof)", timeout=15000, what='the profile')
    c.wait(400)
    st = c.js("() => ({ plan: !!window.__mp.S.prof.plan, src: window.__mp.S.prof.planSource, soft: window.__mp.S.softHtml })")
    c.ok(not st['plan'] and st['src'] is None, f'{st}', 'without a level there is no vertical path')
    c.ok('data-go="fuel"' in st['soft'], f"{st['soft']!r}", 'a note says what is missing, with the way to Fuel')
    # a level and nothing else: drawn at standard rates, and said
    g = _awy_flight()
    g['level'] = {'ft': 8000}
    g.pop('profile', None)
    c.js("""async (f) => { const S = window.__mp.S, p = 'pilot/ABC/current_flight.json'; f.updated_at = new Date().toISOString(); await S.ctx.data.put(p, f); return true }""", g)
    c.until("() => !!(window.__mp.S.prof && window.__mp.S.prof.plan)", timeout=15000, what='the vertical path once a level exists')
    c.wait(400)
    st = c.js("() => ({ src: window.__mp.S.prof.planSource, soft: window.__mp.S.softHtml, toc: !!window.__mp.S.prof.plan.toc })")
    c.eq(st['src'], 'default', 'with only a level, the path is drawn at the standard rates', what=f'{st}')
    c.ok(st['toc'] and 'data-go="fuel"' not in st['soft'] and len(st['soft']) > 0, f"{st['soft']!r}", 'and a note says the rates are estimated')
    # fuel's rates: nothing to say
    h = _awy_flight()
    h['level'] = {'ft': 8000}
    h['profile'] = {'climbFpm': 700, 'climbKt': 100, 'descentFpm': 600, 'descentKt': 110}
    c.js("""async (f) => { const S = window.__mp.S, p = 'pilot/ABC/current_flight.json'; f.updated_at = new Date(Date.now() + 1000).toISOString(); await S.ctx.data.put(p, f); return true }""", h)
    c.wait(1500)
    dbg = c.js("() => ({ src: window.__mp.S.prof.planSource, prof: window.__mp.S.route.flight.profile, by: window.__mp.S.route.flight.by })")
    c.eq(dbg['src'], 'rates', 'with the aircraft’s rates, the path is at them', what=f'{dbg}')
    st = c.js("() => window.__mp.S.softHtml")
    c.ok('planEstimated' not in st and 'standard' not in st.lower() and 'standard' not in st, f'{st!r}', 'the aircraft’s own rates: no estimate said')


# ------------------------------------------------------------------------------------------------------ D105
@case('D105', 'The profile’s reading at the cursor says its reference: altitude, relief AMSL and the height above ground, which is their difference', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='user (SOG-0002, 4–5 Nov 2026), SPEC § 8.4: the line under the profile reads « planned FL…, relief … ft AMSL, height above ground … ft »: the planned altitude is AMSL, the relief too (Terrarium), the height is the first minus the second, the unit written')
def d105(c):
    png = _terrarium_png(300)                                # a flat relief of 300 m = 984 ft
    c.page.route(re.compile(r'.*elevation-tiles.*'), lambda r: r.fulfill(status=200, content_type='image/png', body=png))
    f = _awy_flight()
    c.open('maps', docs=fdocs(f), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.terrainOk && !window.__mp.S.terrainPending && window.__mp.S.geo)", timeout=20000,
            what='the profile with the relief')
    # the cursor halfway along the route (cruise at 8 000 ft)
    r = c.js("""async () => { const S = window.__mp.S, m = await import('/modules/maps/profile_view.js'); m.setCursor(S.prof.total / 2);
      const i = window.MapsProfile.at(S.prof, S.cursor); return { text: S.stripEl.textContent, alt: i.alt, terrain: i.terrain } }""")
    nums = [int(x.replace('\u202f', '').replace('\xa0', '').replace(' ', '')) for x in re.findall(r'(\d[\d\u202f\xa0 ]*\d|\d) ft', r['text'])]
    c.ok('AMSL' in r['text'], f"{r['text']!r}", 'the relief says AMSL')
    c.ok(abs((r['alt'] or 0) - (r['terrain'] or 0)) > 1000 and len(nums) >= 2, f"{r}", 'the planned altitude and the relief differ (the case means something)')
    c.ok(any(abs(n - round(r['alt'] - r['terrain'])) <= 1 for n in nums), f"{r['text']!r} wants {round((r['alt'] or 0) - (r['terrain'] or 0))}",
         'the height above ground is the planned altitude minus the relief')


# ------------------------------------------------------------------------------------------------------ D106
@case('D106', 'Climb and descent transitions: the profile and the map mark the same points (TOC, TOD and the intermediate levels), the same symbols, the same names', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='user (SOG-0008, 4–5 Nov 2026), SPEC § 8.2: the vertical path’s transitions — TOC, TOD and, between them, the end and the start of each climb or descent to an intermediate level — are one list (plan.steps), drawn on the profile and on the map with the same symbols (a small hollow diamond) and the level reached as the name')
def d106(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    f = _awy_flight()
    f['level'] = {'ft': 8000}
    f['profile'] = {'climbFpm': 700, 'climbKt': 100, 'descentFpm': 600, 'descentKt': 110, 'tocNm': 40, 'todNm': 40,
                    'path': [{'nm': 0, 'ft': 0}, {'nm': 25, 'ft': 5000}, {'nm': 40, 'ft': 5000}, {'nm': 70, 'ft': 8000}, {'nm': 130, 'ft': 8000}, {'nm': 170, 'ft': 0}]}
    c.open('maps', docs=fdocs(f), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.plan && window.__mp.S.drawn)", timeout=15000, what='the profile with its path')
    c.wait(500)
    r = c.js("() => { const p = window.__mp.S.prof.plan; return { steps: (p.steps || []).map(x => ({ kind: x.kind, nm: Math.round(x.s / 1852), alt: Math.round(x.alt) })), toc: Math.round(p.toc.s / 1852), tod: Math.round(p.tod.s / 1852) } }")
    c.eq([x['kind'] for x in r['steps']], ['reach', 'leave'], 'the level-off at 5 000 ft and the start of the next climb are the two intermediate transitions', what=f'{r}')
    c.ok(abs(r['steps'][0]['nm'] - 25) <= 2 and abs(r['steps'][1]['nm'] - 40) <= 2 and r['steps'][0]['alt'] == 5000, f'{r}', 'at their distances and altitude')
    c.ok(abs(r['toc'] - 70) <= 2 and abs(r['tod'] - 130) <= 2, f'{r}', 'TOC and TOD stay the ends of the cruise')
    asks = c.js("() => (window.__mapPass || []).filter(x => /^plan:/.test(x.key)).map(x => ({ key: x.key, placed: !!x.r }))")
    keys = sorted(x['key'] for x in asks)
    c.ok('plan:step:0' in keys and 'plan:step:1' not in keys and 'plan:toc' in keys and 'plan:tod' in keys, f'{asks}',
         'on the map the level reached is named, like TOC and TOD; the start of a level has its symbol only')


# ------------------------------------------------------------------------------------------------------ D99
def _lfsg_docs():
    """LFSD → LFSG → LFST (the user's map of 1 Nov 2026): LFSG at its real place, the inbound leg under its name; the NDB EMT 419
    on the outbound leg, the leg through its first box (above right)."""
    f = flight()
    f['route'] = {'text': 'LFSD LFSG LFST', 'dep': 'LFSD', 'arr': 'LFST', 'points': [{'id': 'LFSD', 'lat': 47.2689, 'lon': 5.09},
                  {'id': 'LFSG', 'lat': 48.325, 'lon': 6.0699}, {'id': 'LFST', 'lat': 48.5383, 'lon': 7.6282}]}
    f['level'] = {'ft': 3500}
    emt = {'kind': 'NDB', 'id': 'EMT', 'name': 'EPINAL', 'freq': '419', 'lat': 48.325 + (6.25 - 6.0699) * (48.5383 - 48.325) / (7.6282 - 6.0699), 'lon': 6.25}

    def kind(k, data):
        return [f'sia/base/fr/{AERO_CYCLE}/{k}.json', {'schema': 2, 'zone': 'fr', 'cycle': AERO_CYCLE, 'kind': k, 'parserVersion': 1, 'data': data,
                                                       'updated_at': f'{AERO_CYCLE}T00:00:00Z'}, 'reference']
    return fdocs(f) + [['cache/maps/ui.json', {'preset': 'auto', 'layers': {}}, 'cache'],
                       ['sia/base/index.json', {'zones': {'fr': {'cycle': AERO_CYCLE, 'prefixes': ['LF'], 'kb': {},
                                                                 'cells': {'47': [[5, 7]], '48': [[5, 7]]}}}}, 'reference'],
                       kind('meta', {}), kind('airspaces', []), kind('points', []), kind('navaids', [emt]),
                       kind('aerodromes', [{'icao': 'LFSG', 'name': 'MIRECOURT', 'lat': 48.325, 'lon': 6.0699, 'elev': 1084, 'magVar': 2.4, 'public': True,
                                            'hardLen': 1600, 'bearing': 50}])]


@case('D99', 'Labels leave the route’s line clear: LFSG’s name goes above its symbol, the beacon’s box to a corner the route does not cross', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='user, 1 Nov 2026 (LFSG: the name under the inbound leg, « EMT 419 » crossed by the route), SPEC § 3: a label whose first place the route’s line crosses tries its uncrossed places first (an aerodrome’s name above its symbol, a beacon’s box at its other corners); away from the route nothing changes')
def d99(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    c.open('maps?view=5.9,48.22,6.4,48.43', docs=_lfsg_docs(), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => (window.__mapPass || []).some(x => x.rank === 'navaid' && x.r) && (window.__mapPass || []).some(x => x.rank === 'aerodrome' && x.r)",
            timeout=12000, what='the aerodrome’s name and the beacon’s box placed')
    c.wait(300)
    r = c.js("""() => { const S = window.__mp.S, P = (S.route.points || []).map(p => S.toC(+p.lat, +p.lon)), ox = S.canvas.offsetLeft, oy = S.canvas.offsetTop,
      cut = q => P.slice(1).some((b, i) => { const a = P[i], r = { x0: q.x0 + ox, x1: q.x1 + ox, y0: q.y0 + oy, y1: q.y1 + oy }; for (let k = 0; k <= 200; k++) { const x = a.x + (b.x - a.x) * k / 200, y = a.y + (b.y - a.y) * k / 200;
        if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true } return false }),
      ad = S.adHits.find(h => h.a.icao === 'LFSG'), pick = k => (window.__mapPass || []).filter(x => x.rank === k && x.r).map(x => ({ key: x.key, r: x.r, cut: cut(x.r) }));
      return { ad: pick('aerodrome'), nav: pick('navaid'), sy: ad && ad.y } }""")
    c.eq([(x['key'], x['cut']) for x in r['ad']], [('LFSG', False)], 'LFSG’s name is not crossed by the route', what='aerodrome names')
    c.eq([(x['key'].split('@')[0], x['cut']) for x in r['nav']], [('EMT', False)], 'the beacon’s box is not crossed by the route', what='beacon boxes')


@case('D108', 'Labels leave the route’s line clear: at LFSG, close up, the full name (code and name) is not under the inbound leg', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='user, 1 Nov 2026 (LFSG: « LFSG Mirecourt » crossed by the inbound leg), SPEC § 3: close up the aerodrome’s name is wide; when the route’s line crosses its first place (under the symbol) it goes above it, never over the line when a place of the line’s other side is free')
def d108(c):
    c.page.add_init_script("(() => { const t = setInterval(() => { if (window.SiaAero && window.SiaAero.pass) { clearInterval(t); (" + _MAP_PASS + ")() } }, 5) })()")
    c.open('maps?view=6.03,48.30,6.11,48.35', docs=_lfsg_docs(), flight=False, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => (window.__mapPass || []).some(x => x.rank === 'aerodrome' && x.key === 'LFSG' && x.r)", timeout=12000, what='the aerodrome’s name placed')
    c.wait(300)
    r = c.js("""() => { const S = window.__mp.S, P = (S.route.points || []).map(p => S.toC(+p.lat, +p.lon)), ox = S.canvas.offsetLeft, oy = S.canvas.offsetTop,
      cut = q => P.slice(1).some((b, i) => { const a = P[i], r = { x0: q.x0 + ox, x1: q.x1 + ox, y0: q.y0 + oy, y1: q.y1 + oy }; for (let k = 0; k <= 400; k++) { const x = a.x + (b.x - a.x) * k / 400, y = a.y + (b.y - a.y) * k / 400;
        if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true } return false }),
      ad = (window.__mapPass || []).filter(x => x.rank === 'aerodrome' && x.key === 'LFSG' && x.r).map(x => ({ r: x.r, cut: cut(x.r) })), h = S.adHits.find(q => q.a.icao === 'LFSG');
      return { ad, sy: h && h.y, w: ad[0] && ad[0].r.x1 - ad[0].r.x0 } }""")
    c.ok(r['w'] and r['w'] > 40, f'{r}', 'close up the name is wide (the case means something)')
    c.eq([x['cut'] for x in r['ad']], [False], 'the name is not crossed by the route', what=f'{r}')


# ------------------------------------------------------------------------------------------------------ D109
@case('D109', 'One writer of the route: the Map writes what it changed since it read, what another module wrote meanwhile stays', 'D',
      tags=('overlay', 'maps'), screens=False, designs=('standard',),
      rule='ergonomics, 5 Nov 2026 (SOG-0013, SOG-0004), SPEC § 12: edit.js writes through frame/lib/current_flight.js setRoute with changesOf(base, mine), base = the route and level as the Map read them; a level typed in Fuel and a key written by Fuel between the Map’s reading and its write are kept; by is « maps »')
def d109(c):
    f = flight()
    f['route']['procedures'] = {'sid': _SID, 'star': _STAR_OTHER}
    c.open('maps', docs=fdocs(f), flight=False)
    c.ready('maps', sheet=True)
    hook_map(c)
    c.js(_STATE_JS)
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit becomes pressed')
    a = xy(c, 44.9, 2.4)                                   # NEPIX
    mouse_drag(c, a, (a[0] + 45, a[1] + 35))
    # Fuel writes meanwhile (before the Map’s write, 400 ms after its gesture): a new level and a key of its own in the route
    c.js("""async (p) => { const S = window.__mp.S, r = await S.ctx.data.get(p);
      r.level = { ...(r.level || {}), ft: 31000 }; r.route = { ...r.route, fuelNote: 'from fuel' }; r.by = 'fuel'; r.updated_at = new Date(Date.now() + 2000).toISOString();
      await S.ctx.data.put(p, r); return true }""", PATH)
    doc = c.until_doc(PATH, lambda d: d and d.get('by') == 'maps' and COORD.match(d['route']['points'][2]['id'] or ''), what='the moved point written', timeout=8000)
    c.ok(COORD.match(doc['route']['points'][2]['id']), f"{doc['route']['points'][2]}", 'the Map’s gesture is written')
    c.eq(doc['route'].get('fuelNote'), 'from fuel', 'a key of the route that fuel wrote between is kept', what='route.fuelNote')
    c.eq((doc.get('level') or {}).get('ft'), 31000, 'the level fuel typed is kept (the Map changed none)', what='level.ft')
    c.eq(doc['route'].get('procedures'), f['route']['procedures'], 'route.procedures stays fuel’s', what='procedures')


# ------------------------------------------------------------------------------------------------------ D112-D114 (the ground layer)
_GROUND_JS = """async () => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json();
  S.ctx.aerodb.ground = async icao => icao === 'LFPO' ? fx : null; return fx.items.length }"""


def _ground_flight():
    f = flight()
    f['route']['dep'] = 'LFPO'
    f['route']['points'][0] = {'id': 'LFPO', 'lat': 48.7233, 'lon': 2.3794}
    return f


def _ground_open(c, aerodb=True):
    c.open('maps', docs=fdocs(_ground_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    if aerodb:
        c.eq(c.js(_GROUND_JS), 595, 'the fixture of LFPO (OSM) is the file AeroDB would give', what='items')
    else:   # AeroDB may now provide ground() itself (its lot): this case is the one where it does not
        c.js("() => { window.__mp.S.ctx.aerodb.ground = undefined; return true }")


_PARK_AT = [2.36396, 48.726838]   # a stand of the fixture (lon, lat): the view of zoom 16 is a kilometre wide


def _ground_at(c, zoom, wait=900, where=(2.3794, 48.7233)):
    c.js("([z, w]) => { const m = window.__mpMap; m.jumpTo({ center: w, zoom: z }); return true }", [zoom, list(where)])
    c.wait(wait)
    c.until("() => !!window.__mp.S.drawn", timeout=8000, what='drawn')


_GSTAT = """() => { const g = window.__mp.S.ground; if (!g) return null; const r = [...g.cache.values()].find(x => x.items);
  return { items: r ? r.items.length : 0, hits: g.hits.length, twy: g.hits.filter(h => h.pts).length, pts: g.hits.filter(h => !h.pts).length,
           names: [...g.drawn.values()].filter(Boolean).length, asked: g.drawn.size } }"""


@case('D112', 'Ground layer: only with a flight aerodrome and zoom 13 or more; lines and taxiway names at 13, holds at 15, stands at 16; absent without AeroDB’s ground()', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='V3 spec 10.40 (SOG-0046), cost rule D68: the layer needs a departure or an arrival of the flight and zoom 13 or more (SOG-0195: one level earlier than the first 14); the taxiway lines from 13, their names from 15, the stands and holds (points and names) from 16; never without AeroDb.ground')
def d112(c):
    _ground_open(c, aerodb=False)
    _ground_at(c, 15)
    st0 = c.js(_GSTAT)
    c.ok(st0 is None or (st0['items'] == 0 and st0['hits'] == 0), f'{st0}', 'without a file from AeroDB’s ground() there is no layer (nothing lent, nothing drawn)')
    c.eq(c.js("() => !!document.querySelector('.mp-ad-ground')"), False, 'no « Ground » button either', what='button')
    c.js(_GROUND_JS)
    _ground_at(c, 12, 1200)
    st = c.js(_GSTAT)
    c.ok(st and st['hits'] == 0, f'{st}', 'under zoom 13 nothing is drawn')
    _ground_at(c, 13, 1500)
    st = c.js(_GSTAT)
    c.ok(st and st['twy'] > 50 and st['pts'] == 0, f'{st}', 'at 13: the taxiway lines (and their names, SOG-0297), no stand')
    _ground_at(c, 14, 1200)
    st = c.js(_GSTAT)
    c.ok(st and st['twy'] > 50 and st['pts'] == 0, f'{st}', 'at 14: the same, still no stand')
    _ground_at(c, 15, 1200)
    st = c.js(_GSTAT)
    holds = c.js("() => (window.__mp.S.ground.hits || []).filter(h => h.id && !h.pts && /^hold|^h/.test(String(h.id))).length")
    c.ok(st['twy'] > 20 and 8 < st['names'] <= st['asked'], f'{st}', 'at 15: the lines and the names of the taxiways')
    nh15 = c.js("() => { const g = window.__mp.S.ground, r = [...g.cache.values()].find(x => x.items); const hs = new Set(r.items.filter(i => i.kind === 'hold').map(i => i.id)); return [g.hits.filter(h => !h.pts && hs.has(h.id)).length, g.hits.filter(h => !h.pts && !hs.has(h.id)).length] }")
    c.ok(nh15[0] > 0 and nh15[1] == 0, str(nh15), 'at 15 the hold points (red) are there, no stand yet (SOG-0195: the user reads them as « no entry »)')
    c.shot('D112_holds_at_15_delivered.png')
    _ground_at(c, 16, 1200, _PARK_AT)
    st = c.js(_GSTAT)
    c.ok(st['twy'] > 8 and st['pts'] > 8 and st['names'] > 8, f'{st}', 'at 16: stands and holds as points, with their names')


@case('D113', 'Ground panel: a list with a filter, kind chips; a row highlights on the map; a touch on the map opens its row; « not drawn » is said', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='V3 spec 10.40: a sheet panel copied from choose (openData ground), one filter field (sub-string, no case, no accent), chips twy / park / hold, hover or focus of a row highlights the element (setGroundHl), a touch within 6 px of a line or a point opens its row (groundAt), the names that found no place are marked « not drawn »')
def d113(c):
    _ground_open(c)
    _ground_at(c, 16, 1500, _PARK_AT)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => window.__mp.S.dpanel === 'ground'", timeout=6000, what='the ground panel opens')
    c.until("() => document.querySelectorAll('.mp-gd-row').length > 10", timeout=6000, what='rows listed')
    rows = c.js("() => [...document.querySelectorAll('.mp-gd-row')].length")
    c.ok(rows <= 40, str(rows), 'at most 40 rows, the rest said « narrow the filter »')
    keys = c.js("() => [...document.querySelectorAll('.mp-gd-row')].map(b => b.dataset.kind + ':' + b.querySelector('b').textContent)")
    c.eq(len(keys), len(set(keys)), 'one row per kind and name (OpenStreetMap cuts a taxiway into several ways, all highlighted together)', what='rows')
    c.page.fill('.mp-gd-q', 'l4')
    c.wait(300)
    names = c.js("() => [...document.querySelectorAll('.mp-gd-row b')].map(b => b.textContent)")
    c.ok(names and all('l4' in n.lower() for n in names), str(names), 'the filter keeps the names that contain « l4 », whatever the case')
    c.page.fill('.mp-gd-q', '')
    c.wait(200)
    c.tap('.mp-gd-chip[data-kind="twy"]')
    c.tap('.mp-gd-chip[data-kind="hold"]')
    c.wait(200)
    kinds = c.js("() => [...new Set([...document.querySelectorAll('.mp-gd-row')].map(b => b.dataset.kind))]")
    c.eq(kinds, ['park'], 'with the taxiways and the holds off only stands are listed', what='kinds')
    c.tap('.mp-gd-chip[data-kind="twy"]')
    c.wait(300)
    c.ok(c.js("() => document.querySelectorAll('.mp-gd-row[data-kind=twy]').length") > 0, str(c.js("() => ({ k: window.__mp.S.ground.kinds, n: document.querySelectorAll('.mp-gd-row').length, q: window.__mp.S.ground.q, h: document.querySelector('.mp-gd-list').innerHTML.slice(0, 200) })")), 'the taxiways are listed again')
    c.js("() => { document.querySelector('.mp-gd-row[data-kind=twy]').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); return true }")   # the sheet's own hover: the row's pointerover
    c.wait(500)
    row = c.js("() => document.querySelector('.mp-gd-row[data-kind=twy]').dataset.id")
    c.eq(c.js("() => window.__mp.S.ground.hl"), row, 'hovering a row highlights its element', what='hl')
    c.eq(c.js("() => document.querySelector('.mp-gd-row[data-kind=twy]').dataset.hl"), '1', 'the row shows it', what='data-hl')
    c.js("() => { document.querySelector('.mp-gd-row[data-kind=twy]').dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body })); return true }")
    c.wait(300)
    c.eq(c.js("() => window.__mp.S.ground.hl"), None, 'leaving the row clears it', what='hl after')
    p = c.js("""() => { const S = window.__mp.S, h = S.ground.hits.find(x => !x.pts), r = S.box.getBoundingClientRect(); return h ? { id: h.grp, x: r.left + h.x, y: r.top + h.y } : null }""")
    c.ok(p, str(p), 'a stand is drawn at zoom 16')
    c.page.mouse.click(p['x'], p['y'])
    c.wait(500)
    c.eq(c.js("() => window.__mp.S.ground.hl"), p['id'], 'a touch on the map highlights the element and opens its row', what='hl from the map')
    miss = c.js("() => { const g = window.__mp.S.ground, id = [...g.drawn].find(([k, v]) => v === false && !k.startsWith('rwy'))?.[0]; const it = [...g.cache.values()].flatMap(r => r.items || []).find(x => x.id === id); return it ? { id: 'g:' + it.kind + ':' + it.name, name: it.name, ids: [...g.cache.values()].flatMap(r => r.items || []).filter(x => x.kind === it.kind && x.name === it.name).map(x => x.id) } : null }")
    c.ok(miss, str(miss), 'some names found no place at this zoom (short names collide)')
    c.page.fill('.mp-gd-q', miss['name'])
    c.wait(400)
    c.eq(c.js(f"() => document.querySelector('.mp-gd-row[data-id=\\\"{miss['id']}\\\"]').dataset.drawn"), '0', 'its row says « not drawn »', what='data-drawn')
    c.tap('[data-gdone]')
    c.until("() => window.__mp.S.dpanel !== 'ground'", timeout=4000, what='Done closes the panel')


@case('D114', 'Ground layer cost: the full drawing at zoom 15 over LFPO stays under 16 ms, the light drawing keeps the lines only', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='V3 spec 10.40, D68: the layer must not take the drawing over 16 ms; during a gesture only the lines are drawn (the light drawing)')
def d114(c):
    _ground_open(c)
    _ground_at(c, 15, 1500)
    ms = c.js("""async () => { const t = [];
      for (let i = 0; i < 9; i++) { window.__mpMap.jumpTo({ center: [2.3794 + i * 1e-4, 48.7233], zoom: 15 });
        await new Promise(r => setTimeout(r, 700)); const m = performance.getEntriesByName('maps:draw').slice(-1)[0]; if (m) t.push(m.duration) }
      t.sort((a, b) => a - b); return { n: t.length, med: t[t.length >> 1] || 0, max: t[t.length - 1] || 0 } }""")
    c.ok(ms['n'] >= 5 and ms['med'] < 16, f'{ms}', 'the full drawing with the ground layer is under 16 ms (median of the draws at rest)')
    light = c.js("""() => { const g = document.createElement('canvas').getContext('2d'); let n = 0; const o = g.stroke.bind(g); g.stroke = () => { n++; return o() };
      return import('/modules/maps/ground.js').then(G => { G.groundLight(g, ll => ({ x: 400 + (ll.lng - 2.3794) * 20000, y: 300 - (ll.lat - 48.7233) * 30000 }), 15); return n }) }""")
    c.ok(light > 100, f'{light} strokes', 'the light drawing strokes the taxiway lines (nothing else, no names)')


@case('D115', 'Ground panel: the runways are listed from the aerodrome’s sheets, not from the threshold vectors drawn; a runway row highlights and frames', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='V3 spec 10.40 (SOG-0046 leftovers): the runway rows come from S.runways of the panel’s aerodrome (a sheet with a position), whatever the zoom or runwayZoom; the highlight of a runway row is computed from its sheet (runwayVector), « see » frames its threshold at zoom 16 or more')
def d115(c):
    _ground_open(c)
    # two runways with a position and one without: the sheets of LFPO as AeroDB would give them; the threshold vectors never show (runwayZoom 16)
    c.js("""() => { const S = window.__mp.S; S.runwayZoom = 16;
      S.runways.set('LFPO', [{ id: '02', lat: 48.7167, lon: 2.3665, qfu: 20 }, { id: '20', lat: 48.7302, lon: 2.3733, qfu: 200 }, { id: 'XX' }]); return true }""")
    _ground_at(c, 15, 1500)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => window.__mp.S.dpanel === 'ground'", timeout=6000, what='the ground panel opens')
    c.until("() => document.querySelectorAll('.mp-gd-row').length > 10", timeout=6000, what='rows listed')
    rw = c.js("() => [...document.querySelectorAll('.mp-gd-row[data-kind=rwy]')].map(b => b.dataset.id)")
    c.eq(rw, ['rwy:02', 'rwy:20'], 'the runways of the sheets are listed (the one without a position is not), first', what='runway rows')
    first = c.js("() => document.querySelector('.mp-gd-row').dataset.kind")
    c.eq(first, 'rwy', 'runways come before the taxiways', what='first row')
    c.eq(c.js("() => window.__mp.S.runwayZoom"), 16, 'no threshold vector is drawn at this zoom (the rows do not come from them)', what='runwayZoom')
    # the highlight of a runway row is drawn from its sheet: a 3.5 px accent line, the spy counts it
    c.js("""() => { const S = window.__mp.S, t = document.createElement('canvas').getContext('2d'); t.strokeStyle = S.theme.accent; window.__acc = t.strokeStyle; window.__n = 0;
      const o = CanvasRenderingContext2D.prototype.stroke; CanvasRenderingContext2D.prototype.stroke = function () { if (this.lineWidth === 3.5 && this.strokeStyle === window.__acc) window.__n++; return o.apply(this, arguments) }; window.__oStroke = o; return true }""")
    c.page.mouse.move(2, 2)   # the real pointer may rest over the row (the panel’s text above the rows moves them): leave it, so the hover below is a change
    c.js("() => { document.querySelectorAll('.mp-gd-row').forEach(b => b.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }))); return true }")
    c.wait(400)
    c.js("() => { window.__n = 0; return true }")
    c.js("() => { const b = document.querySelector('.mp-gd-row[data-id=\"rwy:02\"]'); b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); return true }")
    c.wait(700)
    c.eq(c.js("() => window.__mp.S.ground.hl"), 'rwy:02', 'hovering the runway row highlights it', what='hl')
    n = c.js("() => window.__n")
    c.ok(n >= 1, f'{n} accent strokes', 'the runway is drawn highlighted without any threshold vector on the map')
    c.js("() => { CanvasRenderingContext2D.prototype.stroke = window.__oStroke; return true }")
    # a touch on the row frames the threshold
    c.tap('.mp-gd-row[data-id="rwy:20"]')
    c.wait(700)
    v = c.js("() => { const m = window.__mpMap, c = m.getCenter(); return { z: m.getZoom(), lat: c.lat, lon: c.lng } }")
    c.ok(v['z'] >= 15.9 and abs(v['lat'] - 48.7302) < .002 and abs(v['lon'] - 2.3733) < .003, f'{v}', 'a touch on a runway row frames its threshold at zoom 16 or more')
    # the filter keeps the runways whose name matches
    c.page.fill('.mp-gd-q', '20')
    c.wait(300)
    names = c.js("() => [...document.querySelectorAll('.mp-gd-row')].map(b => b.dataset.id)")
    c.ok(names and names[0] == 'rwy:20', str(names), 'the filter finds the runway by its number')


_VP_JS = r"""async (cfg) => {
  const P = window.SiaProfile;
  let seed = cfg.seed >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 };
  const b = cfg.box, airspaces = [];
  for (let k = 0; k < cfg.count; k++) {         // dense synthetic airspaces: rings of 40 irregular vertices, a few hundred NM wide in all
    const la = b[0] + rnd() * (b[1] - b[0]), lo = b[2] + rnd() * (b[3] - b[2]), r = .04 + rnd() * (k % 40 === 0 ? 1.2 : .35), ring = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * 2 * Math.PI, rr = r * (.7 + rnd() * .6); ring.push([la + Math.sin(a) * rr, lo + Math.cos(a) * rr / Math.cos(la * Math.PI / 180)]) }
    ring.push(ring[0]);
    airspaces.push({ type: 'CTA', name: 'S' + k, lower: 'FL195', upper: 'FL460', rings: [ring], rings2: [] });
  }
  const points = cfg.points.map(p => ({ ...p })), el = async () => 0;
  // the reference: the algorithm as it was before SOG-0063 (every sample against every vertex of every ring of the airspaces with a vertex in the box)
  const ref = (data) => {
    const box = { s: Math.min(...points.map(p => p.lat)) - .5, n: Math.max(...points.map(p => p.lat)) + .5, w: Math.min(...points.map(p => p.lon)) - .7, e: Math.max(...points.map(p => p.lon)) + .7 };
    const inRing = (lat, lon, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [yi, xi] = ring[i], [yj, xj] = ring[j]; if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c } return c };
    const out = [], n = data.samples.length - 1;
    for (const a of airspaces) {
      const rings = (a.rings || []).filter(r => r.length >= 3 && r.some(([la, lo]) => la > box.s && la < box.n && lo > box.w && lo < box.e));
      if (!rings.length) continue;
      let start = -1;
      for (let i = 0; i <= n + 1; i++) {
        const inside = i <= n && rings.some(r => inRing(data.samples[i].lat, data.samples[i].lon, r));
        if (inside && start < 0) start = i;
        if (!inside && start >= 0) { out.push([a.name, start, i - 1]); start = -1 }
      }
    }
    return out;
  };
  // the page must stay alive: the longest gap between two ticks of a 5 ms timer while the profile is built
  let last = performance.now(), gap = 0; const timer = setInterval(() => { const t = performance.now(); gap = Math.max(gap, t - last); last = t }, 5);
  const t0 = performance.now(), d1 = await P.build({ points, elevation: el, airspaces, obstacles: [] }), ms1 = performance.now() - t0;
  clearInterval(timer);
  const t1 = performance.now(), d2 = await P.build({ points, elevation: async () => 5, airspaces, obstacles: [] }), ms2 = performance.now() - t1;
  const key = d => d.crossed.map(c => [c.a.name, c.i0, c.i1]);
  const r = ref(d1), k1 = key(d1), k2 = key(d2);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x[0] === b[i][0] && x[1] === b[i][1] && x[2] === b[i][2]);
  return { n: airspaces.length, verts: airspaces.reduce((s, a) => s + a.rings[0].length, 0), samples: d1.samples.length, crossed: k1.length,
           ms1: Math.round(ms1), ms2: Math.round(ms2), gap: Math.round(gap), sameAsRef: same(k1, r), secondSame: same(k2, k1),
           distinct: d1.crossed[0] !== d2.crossed[0] };
}"""


@case('D116', 'Vertical profile cost: the airspaces crossed are found from the ring boxes, once for the two builds, without freezing the page; same result as before', 'D',
      tags=('maps',), designs=('standard',), night=False, screens=False,
      rule='SOG-0063 (the cost rule): building the profile of EIDW-LFPO took 2.8 s (every sample against every vertex, twice); now a sample is tested only inside the ring’s box, the second build (with relief) reuses the intervals, the loop yields when it runs long; the intervals crossed are the same as the plain algorithm gives')
def d116(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.until("() => !!window.SiaProfile && !!window.SiaProfile.build", timeout=10000, what='the profile code')
    # EIDW -> LFPO, 1 500 synthetic airspaces (60 000 vertices) in the box of the route as the real base gives (ie + gb + fr)
    big = c.js(_VP_JS, {'seed': 7, 'count': 1500, 'box': [48.0, 54.0, -7.5, 3.5],
                        'points': [{'lat': 53.4213, 'lon': -6.2701, 'name': 'EIDW'}, {'lat': 48.7233, 'lon': 2.3794, 'name': 'LFPO'}]})
    c.ok(big['crossed'] > 20 and big['samples'] > 700, f'{big}', 'the synthetic route crosses a good number of airspaces over some 800 samples')
    c.ok(big['sameAsRef'], f'{big}', 'the airspaces crossed and their sample intervals are the plain algorithm’s, one by one')
    c.ok(big['secondSame'] and big['distinct'], f'{big}', 'the second build (with relief) gives the same intervals, in objects of its own')
    c.ok(big['ms1'] < 400, f'{big["ms1"]} ms', 'the first build of EIDW-LFPO is under 400 ms (2 800 ms before)')
    c.ok(big['ms2'] < 150, f'{big["ms2"]} ms', 'the second build reuses the intervals (no second pass over the rings)')
    c.ok(big['gap'] < 150, f'{big["gap"]} ms', 'the page stays alive while the profile is built (a 5 ms timer is never kept waiting 150 ms)')
    # LFPO -> LFPB, a short flight: the same checks on a hundred samples
    small = c.js(_VP_JS, {'seed': 11, 'count': 600, 'box': [48.3, 49.4, 1.8, 3.0],
                          'points': [{'lat': 48.7233, 'lon': 2.3794, 'name': 'LFPO'}, {'lat': 48.9694, 'lon': 2.4414, 'name': 'LFPB'}]})
    c.ok(small['sameAsRef'] and small['secondSame'], f'{small}', 'a short flight gives the same intervals as the plain algorithm, in both builds')


# ------------------------------------------------------------------------------------------------------ D117 (the memory of the Map)
_MEM_INST_JS = r"""() => { if (window.__mem) return true; const I = window.__mem = { made: 0 }; const ce = document.createElement;
  document.createElement = function (t, o) { if (String(t).toLowerCase() === 'canvas') I.made++; return ce.call(this, t, o) }; return true }"""
_MEM_CANVAS_JS = """() => { const S = window.__mp.S, cs = { over: S.canvas, copy: S.frame?.bmp, pc: S.pc, pcur: S.pcur };
  const o = {}; for (const [k, c] of Object.entries(cs)) o[k] = c ? { w: c.width, h: c.height, css: c.getBoundingClientRect().width } : null; return o }"""


@case('D117', 'Map memory: the overlay canvases are bounded in pixels on a wide hi-dpi window, the draw makes no canvas of its own, the unmount frees them, the heap does not grow', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0067 (« not enough memory to open this page » on the widened Map): the overlay, its copy for the gesture and the two profile canvases are at most 8 million pixels each (MAX_CANVAS_PX), not the view × the screen ratio without a bound; a normal window keeps its sharpness; the hatch tiles are made once; the unmount sets the canvases to 0 × 0; the JS heap stays flat over resizes and gestures')
def d117(c):
    c.open('maps', docs=fdocs(flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.js(_MEM_INST_JS)
    hook_map(c)
    cdp = c.page.context.new_cdp_session(c.page)
    cdp.send('Performance.enable')

    def heap():
        cdp.send('HeapProfiler.collectGarbage')
        c.wait(300)
        return {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}['JSHeapUsedSize'] / 1048576

    def metrics(w, h, dpr):
        cdp.send('Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': dpr, 'mobile': False})
        c.wait(500)
    # a normal hi-dpi window: the canvases keep the screen's ratio (sharp)
    metrics(1280, 800, 2)
    c.js("() => { window.__mpMap.panBy([40, 30], { duration: 0 }); return true }")
    c.wait(500)
    o = c.js(_MEM_CANVAS_JS)
    c.ok(o['over'] and abs(o['over']['w'] - 2 * o['over']['css']) <= 2, f'{o}', 'at 1280 × 800 and a ratio of 2 the overlay is drawn at twice its size (sharp, as before)')
    h0 = heap()
    # the same view, widened to an ultra-wide hi-dpi screen: the pixels are bounded
    for i in range(50):
        metrics([2560, 1700, 3000, 1900][i % 4] + (i % 5) * 7, [1440, 900, 1200, 1000][i % 4], 3)
    c.js("""async () => { const m = window.__mpMap; for (let i = 0; i < 100; i++) { if (i % 2) m.jumpTo({ center: [2.3 + (i % 17) * .2, 48.7 + (i % 13) * .1], zoom: 7 + (i % 5) }); else m.panBy([90, -60], { duration: 0 });
        await new Promise(r => setTimeout(r, 70)) } return true }""")
    metrics(3440, 1440, 3)
    c.js("() => { window.__mpMap.panBy([30, 10], { duration: 0 }); return true }")
    c.wait(900)
    o = c.js(_MEM_CANVAS_JS)
    px = {k: v['w'] * v['h'] for k, v in o.items() if v}
    c.ok(o['over'] and o['copy'] and o['pc'], f'{o}', 'the overlay, its copy for the gesture and the profile canvases exist')
    c.ok(all(p <= 8.2e6 for p in px.values()), f'{ {k: round(v / 1e6, 1) for k, v in px.items()} } Mpx', 'at 3440 × 1440 and a ratio of 3 none of the overlay canvases passes 8 million pixels (it was 3 to 4 times that)')
    h1 = heap()
    c.ok(h1 - h0 < 12, f'{h0:.1f} -> {h1:.1f} MB', 'the JS heap grows by less than 12 MB over 50 resizes and 100 gestures')
    # the draw makes no canvas of its own (the hatch tiles are made once)
    metrics(1280, 800, 1)
    n0 = c.js("() => window.__mem.made")
    c.js("""async () => { const m = window.__mpMap; for (let i = 0; i < 25; i++) { m.jumpTo({ center: [2.3 + i * .05, 48.7], zoom: 8 }); await new Promise(r => setTimeout(r, 120)) } return true }""")
    n1 = c.js("() => window.__mem.made")
    c.ok(n1 - n0 <= 3, f'{n1 - n0} canvases for 25 draws', 'twenty-five draws make at most the three hatch tiles (about a canvas a draw before)')
    # the unmount frees the canvases at once
    c.js("() => { const S = window.__mp.S; window.__keep = [S.canvas, S.frame?.bmp, S.pc, S.pcur]; return true }")
    c.js("() => { location.hash = '#fuel'; return true }")
    c.until("() => !window.__mp.S", timeout=8000, what='the Map unmounts')
    kept = c.js("() => window.__keep.map(x => x ? x.width + 'x' + x.height : null)")
    c.ok(all(k == '0x0' for k in kept if k), f'{kept}', 'the unmount sets the overlay, its copy and the profile canvases to 0 × 0')


# ------------------------------------------------------------------------------------------------------ D118 (one-way airway segments)
_ONEWAY_JS = r"""() => {
  const R = window.MapsRender, W = 600, H = 400, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const raw = cv.getContext('2d'), tri = new WeakMap(), fills = [];
  if (!Path2D.prototype.__d118) { const m = Path2D.prototype.moveTo, l = Path2D.prototype.lineTo;
    Path2D.prototype.moveTo = function (x, y) { (tri.get(this) || tri.set(this, []).get(this)).push([x, y]); return m.call(this, x, y) };
    Path2D.prototype.lineTo = function (x, y) { (tri.get(this) || tri.set(this, []).get(this)).push([x, y]); return l.call(this, x, y) };
    Path2D.prototype.__d118 = true }
  const ctx = new Proxy(raw, { get(o, p) { if (p === 'fill') return a => { if (a instanceof Path2D) fills.push(tri.get(a) || []); return a ? o.fill(a) : o.fill() };
      const v = o[p]; return typeof v === 'function' ? v.bind(o) : v }, set(o, p, v) { o[p] = v; return true } });
  const mk = (route, lat, dir, lon0 = -0.28, lon1 = -0.17) => ({ route, a: { id: route + 'A', lat, lon: lon0 }, b: { id: route + 'B', lat, lon: lon1 }, lower: 6500, upper: 19500, nm: 7, ...(dir ? { dir } : {}) });
  const NEAR = [{ lat: 44.985, lon: -0.3 }, { lat: 45.105, lon: -0.15 }];
  const segs = [mk('QF', 45.0, 'F'), mk('QB', 45.03, 'B'), mk('QX', 45.06, 'FB'), mk('QN', 45.09, null)];
  const draw = (box, aw) => { fills.length = 0; const fit = R.bboxOf(box, box === NEAR ? 0 : 10), { toC, shown } = R.mercator(fit, W, H, 12);
    R.draw(ctx, { toC, W, H, scale: 1, bbox: shown, profile: R.routeProfile(9000), data: { airways: aw }, route: [], marks: [] }); return { toC, fills: fills.map(f => f.slice()) } };
  const near = draw(NEAR, segs);
  // arrows : triangles of three points ; centre, and direction of the tip from the base
  const arrows = near.fills.flatMap(f => { const o = []; for (let i = 0; i + 2 < f.length; i += 3) { const [t, p, q] = f.slice(i, i + 3), bx = (p[0] + q[0]) / 2, by = (p[1] + q[1]) / 2;
      o.push({ tip: t, base: [bx, by], dx: t[0] - bx, dy: t[1] - by }) } return o });
  const on = (ar, s) => { const A = near.toC(s.a.lat, s.a.lon), B = near.toC(s.b.lat, s.b.lon), ax = B.x - A.x, ay = B.y - A.y, L = Math.hypot(ax, ay), cx = (ar.tip[0] + ar.base[0]) / 2, cy = (ar.tip[1] + ar.base[1]) / 2,
      u = ((cx - A.x) * ax + (cy - A.y) * ay) / (L * L), off = Math.abs((cx - A.x) * ay - (cy - A.y) * ax) / L; return { u, off, fwd: (ar.dx * ax + ar.dy * ay) > 0 } };
  const per = segs.map(s => arrows.map(a => ({ a, ...on(a, s) })).filter(x => x.off < 2 && x.u > 0 && x.u < 1).map(x => ({ u: +x.u.toFixed(2), fwd: x.fwd })));
  const far = draw([{ lat: 40, lon: -6 }, { lat: 49, lon: 6 }], segs).fills.flat().length;
  const wide = draw(NEAR, segs.map(s => ({ ...s, dir: undefined }))).fills.flat().length;
  // cost : 608 short segments with and without a direction, the same drawing
  const many = dir => { const o = []; for (let i = 0; i < 608; i++) { const r = Math.floor(i / 16), k = i % 16, la = 44.99 + r * .003, lo = -0.29 + k * .0105; o.push({ route: 'Z' + i, a: { id: 'ZA' + i, lat: la, lon: lo }, b: { id: 'ZB' + i, lat: la + .0008, lon: lo + .011 }, lower: 6500, upper: 19500, nm: 1, ...(dir ? { dir } : {}) }) } return o };
  const aws = [many(null), many('F')], ts = [[], []];   // interleaved: a load on the machine weighs on both
  for (let i = 0; i < 21; i++) for (const k of [0, 1]) { const t0 = performance.now(); draw(NEAR, aws[k]); ts[k].push(performance.now() - t0) }
  const med = t => t.sort((a, b) => a - b)[10], plain = med(ts[0]), withDir = med(ts[1]), nArrows = draw(NEAR, many('F')).fills.flat().length / 3;
  return { n: arrows.length, per, far, wide, plain, withDir, nArrows };
}"""


@case('D118', 'One-way airway segments: a small arrow in the allowed direction at zoom 9 and over, none for both ways or an unknown direction, the hover says the sense', 'D',
      tags=('maps',), screens=False, designs=('standard',), night=False,
      rule='SOG-0078 (ergonomics, 9 Nov 2026): AeroDB publishes dir F | B | FB per airway segment (absent: the source is silent); a one-way segment carries one discreet arrow in the allowed direction (F: a to b, B: b to a), in the airway’s colour, at zoom 9 and over, never in the light drawing; FB or no dir changes nothing; the hover says « one way a → b » or « both ways »; D68 stays under budget')
def d118(c):
    c.page.goto(f'{c.base}/modules/maps/test/render.html', wait_until='load')
    c.until("() => window.MapsRender && document.getElementById('out') && document.getElementById('out').textContent.length > 20", what='the render bench is drawn')
    r = c.js(_ONEWAY_JS)
    c.eq(r['n'], 2, 'two arrows in all: the F segment and the B segment', what=f'arrows {r}')
    c.eq([len(p) for p in r['per']], [1, 1, 0, 0], 'one arrow on QF, one on QB, none on the both-ways and the unknown-direction segments', what=f'per segment {r["per"]}')
    c.ok(r['per'][0][0]['fwd'] and not r['per'][1][0]['fwd'], f'{r["per"]}', 'F points from a to b, B from b to a')
    c.ok(all(0.1 <= p[0]['u'] <= 0.9 for p in r['per'][:2]), f'{r["per"]}', 'each arrow sits on its segment, away from the ends (beside the name’s box when there is one)')
    c.eq(r['far'], 0, 'zoomed out under 9: no arrow', what='arrows far')
    c.eq(r['wide'], 0, 'no dir, no arrow', what='arrows without dir')
    c.ok(r['nArrows'] >= 300, f'{r["nArrows"]} arrows', 'the 608-segment drawing carries its arrows (the cost below is not the cost of nothing)')
    c.ok(r['withDir'] - r['plain'] < 3 and r['withDir'] < 16, f'{r["plain"]:.1f} ms without, {r["withDir"]:.1f} ms with {r["nArrows"]:.0f} arrows', 'the arrows add under 3 ms, the drawing stays under 16 ms (D68)')


@case('D119', 'One-way airway segments: the hover says « one way a → b » (B reversed) or « both ways », and nothing when the source is silent', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0078: the hover over an airway’s box says the sense of the segment: « one way a → b » for dir F, « one way b → a » for B (the allowed direction), « both ways » for FB, nothing without dir')
def d119(c):
    f = _awy_flight()
    segs = []
    for i, (route, dr, lat) in enumerate([('AW1', 'F', 45.0), ('AW2', 'B', 45.0), ('AW3', 'FB', 45.0), ('AW4', None, 45.4)]):
        lo = lambda k: -0.5 + k * 1.333
        a, b = ((0, 1), (1, 2), (2, 3), (0, 1))[i]
        segs.append({'route': route, 'a': {'id': f'P{a + 1}' if lat == 45.0 else 'Q1', 'lat': lat, 'lon': lo(a)}, 'b': {'id': f'P{b + 1}' if lat == 45.0 else 'Q2', 'lat': lat, 'lon': lo(b)},
                     'lower': 6500, 'upper': 19500, 'nm': 56.0, **({'dir': dr} if dr else {})})
    c.open('maps', docs=fdocs(f) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airfields=True, airways=segs, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.js("async () => { window.__tips = await import('/modules/maps/tips.js'); return true }")
    hook_map(c)
    got = {}
    # each segment in turn, at a zoom where the airways are drawn
    for route, lon, lat in [('AW1', 0.17, 45.0), ('AW2', 1.5, 45.0), ('AW3', 2.83, 45.0), ('AW4', 0.17, 45.4)]:
        c.js("([lo, la]) => { window.__mpMap.jumpTo({ center: [lo, la], zoom: 8.4 }); return true }", [lon, lat])
        c.wait(900)
        h = c.js("""(r) => { const h = (window.__mp.S.awHits || []).find(x => x.g.route === r); return h ? window.__tips.tipAt(h.x, h.y) : null }""", route)
        if h:
            got[route] = h

    line = lambda r: ' | '.join(got[r]) if got.get(r) else None
    c.ok(line('AW1') and line('AW2') and line('AW3'), f'{got}', 'the hover of the three segments is read from their boxes')
    c.ok(re.search(r'sens unique P1 → P2', line('AW1') or ''), f'{got.get("AW1")}', 'dir F: « one way P1 → P2 » (a to b)')
    c.ok(re.search(r'sens unique P3 → P2', line('AW2') or ''), f'{got.get("AW2")}', 'dir B: « one way P3 → P2 » (b to a: the allowed direction)')
    c.ok('double sens' in (line('AW3') or '') and 'sens unique' not in (line('AW3') or ''), f'{got.get("AW3")}', 'dir FB: « both ways »')
    c.ok(line('AW4') and 'sens' not in line('AW4'), f'{got.get("AW4")}', 'no dir: the hover is as before, no word about the sense')


@case('D120', 'Ground panel: no button to read OpenStreetMap; without a file it says to read the aerodrome’s procedures (with the link), with a file it says when it was read', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='V3 spec 10.40 (SOG-0135): the ground is read with the procedures (AeroDB’s lot), not by a button of the Map; the panel of an aerodrome without a file says « Read the procedures to get the ground » with a link to Fuel’s procedures (dep / arr), the panel of one with a file says « Ground read with the procedures of <date> »')
def d120(c):
    c.open('maps', docs=fdocs(_ground_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""async () => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json(), a = S.ctx.aerodb;
      window.__have = false; fx.cycle = '2026-11-09';
      a.ground = async icao => icao === 'LFPO' && window.__have ? fx : null;
      a.fetchGround = async () => ({ ok: true });   // AeroDB may still offer it: the Map no longer calls it
      return true }""")
    _ground_at(c, 15, 1200)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => window.__mp.S.dpanel === 'ground'", timeout=6000, what='the ground panel opens')
    c.until("() => !!document.querySelector('.mp-gd-none')", timeout=6000, what='an aerodrome without a file says how to get the ground')
    c.eq(c.js("() => document.querySelectorAll('.mp-gd-fetch, [data-gfetch]').length"), 0, 'no button to read OpenStreetMap', what='fetch buttons')
    txt = c.js("() => document.querySelector('.mp-gd-none').textContent")
    c.ok('procédures' in txt.lower() or 'procedures' in txt.lower(), txt, 'the panel says to read the procedures')
    c.eq(c.js("() => document.querySelector('.mp-gd-procs')?.dataset.go"), 'fuel?focus=dep', 'with a link to the procedures of the departure (LFPO)', what='link')
    c.tap('.mp-gd-procs')
    c.until("() => location.hash.startsWith('#fuel')", timeout=6000, what='the link goes to Fuel')
    c.ok(c.js("() => location.hash").startswith('#fuel'), c.js("() => location.hash"), 'on Fuel (the frame consumes the focus)')
    # the file is there (read with the procedures): the panel says when
    c.open('maps', docs=fdocs(_ground_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""async () => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json(); fx.cycle = '2026-11-09';
      S.ctx.aerodb.ground = async icao => icao === 'LFPO' ? fx : null; return true }""")
    _ground_at(c, 15, 1200)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => !!document.querySelector('.mp-gd-src')", timeout=8000, what='the panel says when the ground was read')
    src = c.js("() => document.querySelector('.mp-gd-src').textContent")
    c.ok('2026-11-09' in src, src, 'with the date of the file')
    c.eq(c.js("() => !!document.querySelector('.mp-gd-procs, .mp-gd-fetch')"), False, 'no link and no button once the file is there', what='controls')
    c.until("() => document.querySelectorAll('.mp-gd-row').length > 10", timeout=8000, what='the rows are listed')
    # the file arrives while the panel is open (AeroDB reads the ground after the procedures and says { ground: ICAO }): the panel reads it again
    c.open('maps', docs=fdocs(_ground_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""async () => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json(); fx.cycle = '2026-11-09'; window.__have = false;
      S.ctx.aerodb.ground = async icao => icao === 'LFPO' && window.__have ? fx : null; return true }""")
    _ground_at(c, 15, 1200)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => !!document.querySelector('.mp-gd-none')", timeout=6000, what='no file yet: the panel says to read the procedures')
    c.js("async () => { window.__have = true; (await import('/modules/maps/ground.js')).groundChanged('lfpo'); return true }")
    c.until("() => !!document.querySelector('.mp-gd-src') && !document.querySelector('.mp-gd-none')", timeout=8000, what='the file arrives: the open panel shows it without reopening')
    c.ok('groundChanged(e.ground' in (ROOT / 'modules/maps/module.js').read_text(encoding='utf-8'), 'module.js', 'the Map listens to AeroDB’s change { ground } and calls it')


_VIEW_JS = "() => { const x = window.__mpMap.getBounds(); return [x.getWest(), x.getSouth(), x.getEast(), x.getNorth()] }"


@case('D121', 'Mission address with zone=<id>: the view is that zone (circle or polygon, 20 % margin, no case); an unknown zone or a chosen map changes nothing', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='maps SPEC § 15 (SOG-0051, V3 § 10.45): #maps?mission=<ID>&zone=<id> centres the view on that zone of mission.zones (its circle, or the box of its polygon, with the margin of the zone type, 20 %), whatever the case of the id; without a known zone, or with &map=<file> of the mission, the view is the map’s own')
def d121(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])

    def view(addr, what):
        c.open('maps?' + addr, aero=True)
        c.until("window.__t.shown(document.querySelector('.f-sheet-panel'))", timeout=10000, what=f'the mission profile ({what})')
        hook_map(c)
        c.wait(600)
        return c.js(_VIEW_JS)
    # a polygon (Z2: lat 44.7–45.0, lon 3.5–4.0), written in lower case in the address
    b = view('mission=ESSAI1&zone=z2', 'polygon')
    c.ok(b[0] <= 3.5 and b[2] >= 4.0 and b[1] <= 44.7 and b[3] >= 45.0, f'view {b}', 'the view contains the polygon')
    c.ok(b[2] - b[0] < 2.0 and b[3] - b[1] < 1.5, f'view {b}', 'and is the zone’s, not the map’s (5.6° wide)')
    # a circle (Z1: centre 45.6 / 2.8, 15 km)
    b = view('mission=ESSAI1&zone=Z1', 'circle')
    c.ok(abs((b[0] + b[2]) / 2 - 2.8) < .08 and abs((b[1] + b[3]) / 2 - 45.6) < .08, f'view {b}', 'the view is centred on the circle')
    c.ok(b[2] - b[0] < 1.5, f'view {b}', 'and is close to it')
    # an unknown zone: the map’s own view (resolved_bbox 0.0 / 43.8 / 5.6 / 47.3)
    b = view('mission=ESSAI1&zone=nowhere', 'unknown zone')
    c.ok(b[0] <= .01 and b[2] >= 5.59 and b[1] <= 43.81 and b[3] >= 47.29, f'view {b}', 'an unknown zone changes nothing')
    # a map of the mission is asked as well: its own extent, at its own scale
    b = view('mission=ESSAI1&zone=Z2&map=carte_generale.png', 'map and zone')
    c.ok(b[0] <= .01 and b[2] >= 5.59, f'view {b}', 'a chosen map keeps its own extent')


@case('D122', 'Route weather: one action named « Route weather » reads the forecast when none is kept and shows the cut; the name then says the model and the run', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 spec (SOG-0139): the Weather chip is the one action: kept forecast first, else ctx.weather.grid asked (the click is the request) and the cut shown as soon as the data are in; named « Route weather » (not « Weather cross-section »), then « Route weather · AROME 12 h » (model chosen by the route’s middle, run hour); no separate « show » button; a refused reading says why')
def d122(c):
    # a real answer of the store: the synthetic forecast seeded for the planned flight, read once through a spy
    c.open('maps', flight=True, forecast=True)
    c.js(_STATE_JS)
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather, g = w.grid.bind(w); window.__got = null;   // ctx and ctx.weather are frozen: the Map’s state gets a copy
      S.ctx = { ...S.ctx, weather: { ...w, grid: async (...a) => { const r = await g(...a); if (r?.locs?.length && !window.__got) window.__got = JSON.parse(JSON.stringify(r)); return r } } }; return true }""")
    c.until("() => !!window.__mp.S.wxWinds", timeout=12000, what='the wind barbs have read the kept forecast')
    c.js("() => { window.__mp.S.wx = null; return true }")   # the wind barbs may have read the kept forecast already: the cut asks again
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => !!window.__got", timeout=10000, what='the kept forecast is read once')
    got = c.js("() => window.__got")
    # no forecast kept: the click must read it (the store is stubbed: nothing leaves the test)
    forget(c.page, c.doc_paths('cache/weather/'), c.base)
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    c.js("""(r) => { const S = window.__mp.S, w = S.ctx.weather; window.__calls = []; window.__fail = false;
      S.ctx = { ...S.ctx, weather: { ...w, grid: async (places, dep, vars, o) => { window.__calls.push(o?.cacheOnly ? 'cache' : 'net'); if (o?.cacheOnly) return null;
        await new Promise(x => setTimeout(x, 300)); if (window.__fail) throw Object.assign(new Error('x'), { offline: true }); return r } } };
      return true }""", got)
    want = row(c, 'wxTitle')
    c.eq(c.attr('.mp-chip[data-view="weather"]', 'title'), want, 'the chip is named by what the pilot wants: « Route weather »', what='chip title')
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", timeout=10000,
            what='the cut is drawn from the click alone')
    calls = c.js("() => window.__calls")
    c.ok(calls.count('net') == 1 and calls[-1] == 'net', str(calls), 'the kept forecast was tried (also by the wind barbs), then read once: one gesture')
    c.eq(c.js("() => !!document.querySelector('[data-wxget]')"), False, 'no separate « show » button once the cut is there', what='extra button')
    name = c.attr('.mp-chip[data-view="weather"]', 'title')
    c.ok(name.startswith(want) and ' · ' in name and re.search(r'\d+ h$', name), name, 'the name then says the model and the run: « … · AROME 12 h »')
    # a refused reading says why and offers to try again
    c.js("() => { window.__mp.S.wx = null; window.__fail = true; window.__calls = []; return true }")
    c.tap('.mp-chip[data-view="profile"]')   # back to the profile…
    c.wait(300)
    c.tap('.mp-chip[data-view="weather"]')   # …and the click again
    c.until("() => !!document.querySelector('.mp-wxmsg [data-wxget]')", timeout=8000, what='the refusal is said with a way to try again')


@case('D123', 'Mission on the Map: a flight prepared from a mission opens the Map on it without an address, with a banner (title, id, family, provided map and choice, remove); the legend names the roles', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 spec (SOG-0137): the Map reads flight.mission (written by « Prepare this flight ») without any address parameter; #maps?mission= only opens another one; a banner at the top shows the title, the id, the family, the provided map shown and the choice of the provided maps (seven at most) and removes itself (#maps?flight=1: the flight and its other layers come back); zones are a light flat tint with their name, points carry their role; the legend (i) names the zone kinds and the point roles')
def d123(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.until("() => !!document.querySelector('.mp-mbar') && !document.querySelector('.mp-mbar').hidden", timeout=15000, what='the banner: a flight with a mission opens the Map on it')
    c.js(_STATE_JS)
    c.ok('mission=' not in c.js("() => location.hash"), c.js("() => location.hash"), 'without any mission parameter in the address')
    txt = c.js("() => document.querySelector('.mp-mbar').textContent")
    c.ok('Mission d\u2019essai' in txt or "Mission d'essai" in txt, txt, 'the banner says the title')
    c.ok('ESSAI1' in txt and 'ESSAI' in txt.split('ESSAI1')[1], txt, 'the id and the family (the folder 1_ESSAI)')
    c.eq(c.js("() => [window.__mp.S.missionId, window.__mp.S.missionAside]"), ['', 'ESSAI1'], 'the Map stays in the flight view, the mission is over it (SOG-0193 L1)', what='missionId, missionAside')
    roles = c.js("() => window.__mp.S.missionPts.map(p => p.sub).filter(Boolean)")
    c.ok(len(roles) >= 3, str(roles), 'the departure, the arrival and the target carry their role')
    c.eq(c.js("() => window.__mp.S.mission.zones.length"), 2, 'the zones are the mission’s', what='zones')
    # the legend names what is drawn
    c.tap('.mp-chip[data-legend]')
    c.until("() => document.querySelectorAll('.mp-legend li').length >= 4", timeout=6000, what='the legend lists the zone kinds and the roles')
    lg = c.js("() => [...document.querySelectorAll('.mp-legend li')].map(l => l.textContent)")
    c.ok(any(r in lg for r in roles), str(lg), 'a role of a point is named in the legend')
    c.tap('.mp-chip[data-legend]')
    # choosing a provided map shows it in place (the address does not change: Fuel stays beside), the window keeps its two lists
    opts = c.js("() => [...document.querySelectorAll('.mp-mbar .mp-mb-sel option')].map(o => o.value)")
    c.eq(opts, ['', 'carte_generale.png', 'carte_cible.png'], 'the window offers the flight first, then the provided maps (seven at most)', what='options')
    c.eq(c.js("() => [document.querySelector('.mp-mbar .mp-mb-sel').value, document.querySelector('.mp-mbar .mp-mb-theme').disabled]"), ['', True], 'on the flight view the flight is selected and the view list is greyed', what='selected')
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = 'carte_cible.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === 'ESSAI1' && !!window.__mp.S.mapDef && window.__mp.S.mapDef.file === 'carte_cible.png'", timeout=10000, what='the provided map is shown in place')
    c.ok('mission=' not in c.js("() => location.hash"), c.js("() => location.hash"), 'the address did not change (Fuel stays beside)')
    c.eq(c.js("() => document.querySelector('.mp-mbar .mp-mb-theme').disabled"), False, 'the view list works on a provided map', what='view list')
    # « Flight » (or the cross) gives the flight and its layers back
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === '' && window.__mp.S.route.points.length >= 2 && !!window.__mp.S.route.flight", timeout=10000, what='the flight view is back')
    c.eq(c.js("() => document.querySelector('.mp-mbar .mp-mb-sel').value"), '', 'the window says the flight again', what='selected after')
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = 'carte_generale.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === 'ESSAI1'", timeout=10000, what='a provided map again')
    c.tap('.mp-mbar [data-mbx]')
    c.until("() => window.__mp.S.missionId === '' && !!window.__mp.S.route.flight", timeout=10000, what='the cross gives the flight back (in place, not through the address)')
    c.ok('flight=1' not in c.js("() => location.hash"), c.js("() => location.hash"), 'the address is untouched')
    c.js(_STATE_JS)


_WINDS_JS = """() => { const S = window.__mp.S; return (S.windHits || []).map(h => ({ gap: !!h.w.gap, model: h.w.model || '', dir: Math.round(+h.w.dirDeg), kt: Math.round(+h.w.kt), lat: h.w.lat, lon: h.w.lon })) }"""
_REDO_JS = """async () => { const S = window.__mp.S; S.wxWindsKey = null; S.wxWinds = null; S.wx = null; await (await import('/modules/maps/weather.js')).ensureWinds(); return true }"""


@case('D124', 'Wind barbs of the Map: read from the grid the cut reads (no network); outside the model’s coverage no arrow, said; never the same arrow repeated', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='V3 spec (SOG-0148, SOG-0141): the barbs come from the grid the vertical cut reads (ctx.weather.grid, cacheOnly: nothing asked), one every 50 NM along the trajectory; a place outside the coverage of the chosen model (the route’s middle chooses it) has no arrow and the hover says « no wind here (outside <model>) », the covering model being used only when its cells are already kept; a wind identical to the previous one 100 NM or more away is a place without wind, never a repeated arrow')
def d124(c):
    c.open('maps', flight=True, forecast=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather; window.__net = 0; window.__asked = [];
      S.ctx = { ...S.ctx, weather: { ...w, grid: async (pl, d, v, o) => { window.__asked.push(o?.model + ':' + !!o?.cacheOnly); if (!o?.cacheOnly) window.__net++; return w.grid(pl, d, v, o) } } }; return true }""")
    c.js(_REDO_JS)
    c.until("() => (window.__mp.S.windHits || []).some(h => h.w.model)", timeout=12000, what='barbs read from the grid appear')
    hs = c.js(_WINDS_JS)
    c.ok(len(hs) >= 3 and not any(h['gap'] for h in hs), str(hs), 'the route is inside the model: an arrow every 50 NM along it, none missing')
    c.eq(c.js("() => window.__net"), 0, 'nothing was asked from the network', what='network reads')
    cut = c.js("() => { const m = window.__mp.S.wx?.o?.model?.along?.[0]?.x; return m ? { dir: Math.round(m.dirDeg), kt: Math.round(m.kt) } : null }")
    c.ok(cut and hs[0]['dir'] == cut['dir'] and hs[0]['kt'] == cut['kt'], f"cut {cut} map {hs[0]}", 'the first arrow is the wind the cut shows at the departure: the same data')
    # outside the coverage of the chosen model: the second half of the route belongs to another model whose cells are not kept
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather, mid = 44.5;
      S.ctx = { ...S.ctx, weather: { ...w, modelFor: async (la, lo) => la < mid ? { id: 'gfs_seamless', name: 'NOAA GFS', short: 'GFS' } : w.modelFor(la, lo),
        grid: async (pl, d, v, o) => o?.model === 'gfs_seamless' && pl.length === 1 ? null : w.grid(pl, d, v, o) } }; return true }""")
    c.js(_REDO_JS)
    c.until("() => (window.__mp.S.windHits || []).some(h => h.w.gap)", timeout=12000, what='the places outside the model have no wind')
    hs = c.js(_WINDS_JS)
    gaps = [h for h in hs if h['gap']]
    c.ok(gaps and any(not h['gap'] for h in hs), str(hs), 'the places inside the model keep their arrow, the others have none')
    c.ok(all(h['model'] for h in gaps), str(gaps), 'a place without wind says which model does not cover it')
    # the same wind written at every point (what a reading that repeats one cell gives): never the same arrow again
    f = flight()
    for q in f['route']['points']:
        q['wind'] = {'dirDeg': 270, 'kt': 45, 'tempC': -30, 'levelFt': 27000, 'at': '2026-10-24T11:00:00Z'}
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather; S.ctx = { ...S.ctx, weather: { ...w, grid: async () => null } }; return true }""")
    c.js(_REDO_JS)
    c.until("() => (window.__mp.S.windHits || []).length >= 2", timeout=12000, what='the written winds are drawn')
    hs = c.js(_WINDS_JS)
    drawn = [h for h in hs if not h['gap']]
    c.ok(len(drawn) >= 1 and len(drawn) < len(hs), str(hs), 'the same wind repeated far away is a place without wind: some arrows are left out, the first one stays')


@case('D125', 'Great-circle route: the shortest path departure → arrival is drawn as a thin dotted line under the route as soon as both aerodromes are known, its length is in the hover', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 spec (SOG-0145): the great circle between the flight’s departure and arrival, thin dotted, in the muted tint of the route, under the route; shown as soon as both aerodromes are known (the route’s ends carry those codes); its length (NM) in the hover; nothing on a mission map')
def d125(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { window.__dash = 0; const o = CanvasRenderingContext2D.prototype.setLineDash;
      CanvasRenderingContext2D.prototype.setLineDash = function (a) { if (a && a[0] === 0.1) window.__dash++; return o.apply(this, arguments) }; return true }""")
    c.js("() => { const m = window.__mpMap, c = m.getCenter(); m.jumpTo({ center: [c.lng + 1e-4, c.lat], zoom: m.getZoom() }); return true }")
    c.until("() => window.__dash > 0 && !!window.__mp.S.gc", timeout=10000, what='the great circle is drawn')
    gc = c.js("() => ({ nm: window.__mp.S.gc.nm, dep: window.__mp.S.gc.dep, arr: window.__mp.S.gc.arr, n: window.__mp.S.gc.q.length })")
    a, b = FLIGHT['route']['points'][0], FLIGHT['route']['points'][-1]
    R = math.pi / 180
    h = math.sin((b['lat'] - a['lat']) * R / 2) ** 2 + math.cos(a['lat'] * R) * math.cos(b['lat'] * R) * math.sin((b['lon'] - a['lon']) * R / 2) ** 2
    want = 2 * 3440.065 * math.asin(math.sqrt(h))
    c.ok(abs(gc['nm'] - want) < 1, f'{gc} want {want:.1f}', 'its length is the great-circle distance LFRS → LFML')
    c.eq([gc['dep'], gc['arr']], ['LFRS', 'LFML'], 'between the departure and the arrival', what='ends')
    # the hover says what it is and how long
    tip = c.js("""async () => { const T = await import('/modules/maps/tips.js'), q = window.__mp.S.gc.q, m = q[Math.floor(q.length / 2)]; return T.tipAt(m.x, m.y) }""")
    c.ok(tip and 'LFRS' in tip[0] and 'LFML' in tip[0] and str(round(want)) in tip[1], str(tip), 'the hover names the great-circle route and gives its length')
    # under the route: its layer comes before the route’s in the drawing
    src = (ROOT / 'modules/maps/render.js').read_text(encoding='utf-8')
    c.ok(src.index("id: 'gc'") < src.index("id: 'route',"), 'render.js', 'the great circle is drawn under the route')
    # not known yet: no arrival, no great circle
    f = flight()
    f['route']['arr'] = ''
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.wait(1500)
    c.eq(c.js("() => window.__mp.S.gc"), None, 'without a known arrival there is no great circle', what='S.gc')
    # a direct route: the rhumb line and the dotted great circle beside it (the comparison, SOG-0243); a tap on the route still places the cursor (the hover of the dotted line must not take the tap)
    f = flight()
    f['route']['points'] = [f['route']['points'][0], f['route']['points'][-1]]
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.gc && !!window.__mp.S.prof", timeout=10000, what='the direct route, its great circle and its profile')
    c.wait(600)
    a, z = f['route']['points'][0], f['route']['points'][-1]
    p = xy(c, (a['lat'] + z['lat']) / 2, (a['lon'] + z['lon']) / 2)
    c.page.mouse.click(*p)
    c.until("!!document.querySelector('.mp-map')?.dataset.cursorNm", timeout=6000, what='a tap on the route sets the cursor, not the hover of the dotted great circle')


def _alts_doc(**over):
    """What Fuel publishes (modules/fuel/INTEGRATION.md § 3 bis): two proposed routes between the flight’s ends, the second with a faulty segment."""
    pts = FLIGHT['route']['points']
    a = [[p['lat'], p['lon']] for p in pts]
    b = [a[0], [46.9, 1.0], [45.2, 3.4], a[-1]]
    return {'schema': 1, 'updated_at': '2026-11-09T16:40:00Z', 'dep': 'LFRS', 'arr': 'LFML', 'mode': 'compute',
            'alternatives': [{'index': 0, 'name': 'Via UN10', 'route': 'LFRS LUGEN NEPIX LFML', 'ids': [], 'points': a, 'faulty': []},
                             {'index': 1, 'name': 'Via UN20', 'route': 'LFRS X Y LFML', 'ids': [], 'points': b, 'faulty': [1]}],
            'chosen': 0, 'hovered': None, **over}


_ALT_SPY_JS = """() => { window.__st = []; const o = CanvasRenderingContext2D.prototype.stroke;
  CanvasRenderingContext2D.prototype.stroke = function () { window.__st.push({ c: this.strokeStyle, w: this.lineWidth, a: this.globalAlpha }); return o.apply(this, arguments) }; return true }"""


@case('D126', 'Proposed routes on the Map: the chosen one solid, the others faded, the hovered one thick, the faulty segments red; a tap on a route takes it (event in the double view, #fuel?ralt= alone)', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='fuel INTEGRATION § 3 bis (SOG-0134 a): the routes Fuel publishes (window event fuel-route-alts, document cache/fuel/route_alts.json) are drawn by the Map: chosen solid, the others faded, hovered thick, faulty segments red, only for the flight’s own departure / arrival; a tap on a drawn route is « Take »: maps-route-alt { index } in the double view, #fuel?ralt=<index> on a Map alone; the list of the routes sits over the map')
def d126(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js(_ALT_SPY_JS)
    doc = _alts_doc()
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    c.js(ev, doc)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='the two proposed routes are drawn')
    st = c.js("() => window.__st.filter(x => x.c === '#d6173f' || x.a < 1)")
    c.ok(any(x['c'] == '#d6173f' for x in st), str(st[:4]), 'the faulty segment is red')
    c.ok(any(x['a'] < 1 and x['a'] > 0 for x in st), str(st[:4]), 'the route that is not chosen is faded')
    c.ok(c.shown('.mp-alts') and c.count('.mp-al-row') == 2, 'rows', 'the list of the routes sits over the map, one row each')
    c.eq(c.js("() => document.querySelector('.mp-al-row[data-chosen=\"1\"] .mp-al-n').textContent"), 'Via UN10', 'the chosen one is marked', what='chosen row')
    c.ok(c.js("() => document.querySelector('.mp-al-row[data-faulty=\"1\"]') !== null"), 'faulty row', 'the faulty one says so')
    # hovered: thick
    c.js("() => { window.__st = []; return true }")
    c.js(ev, _alts_doc(hovered=1))
    c.until("() => window.__st.some(x => x.w === 6.5)", timeout=6000, what='the hovered route is drawn thick')
    # another pair of aerodromes: nothing drawn
    c.js(ev, _alts_doc(dep='LFPO'))
    c.until("() => (window.__mp.S.altHits || []).length === 0", timeout=6000, what='a Map of another flight does not draw them')
    c.js(ev, doc)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=6000, what='drawn again')
    # a tap on the second route takes it: a Map alone goes to Fuel with the index
    c.wait(500)   # the last drawing settles (a loaded machine redraws after the event): the touch targets are those of the image
    c.js("() => { window.__hs = []; window.addEventListener('hashchange', () => window.__hs.push(location.hash)); return true }")   # Fuel consumes `ralt` at mount: the address is read when it changes, not afterwards
    _click_until(c, lambda: (lambda p: (p['x'], p['y']))(c.js("""() => { const S = window.__mp.S; if (!S) return { x: 1, y: 1 }; const h = S.altHits.find(x => x.index === 1), m = h.q[1], n = h.q[2], r = S.box.getBoundingClientRect(), card = document.querySelector('.mp-alts'), cr = card && !card.hidden ? card.getBoundingClientRect() : null; const at = f => ({ x: r.left + m.x + (n.x - m.x) * f, y: r.top + m.y + (n.y - m.y) * f }); const free = [.5, .35, .65, .25, .75, .15, .85].map(at).find(p => !cr || p.x < cr.left - 6 || p.x > cr.right + 6 || p.y < cr.top - 6 || p.y > cr.bottom + 6); return free || at(.5) }""")),
                 "() => window.__mp.S.altShow === 1", 'a tap on a route SHOWS it (SOG-0134: it does not take it)', tries=6)
    c.wait(300)
    c.ok(not c.js("() => window.__hs.some(h => h.includes('ralt=')) || location.hash.includes('ralt=')"), 'the address changed', 'a tap on a route does not go to Fuel')
    c.until("() => !!document.querySelector('.mp-alts [data-alttake]:not([disabled])')", timeout=4000, what='a Map alone offers « Choose this route » for the shown one')
    c.tap('.mp-alts [data-alttake]')
    c.until("() => window.__hs.some(h => h.includes('ralt=1')) || location.hash.includes('ralt=1')", timeout=6000, what='the button takes it: #fuel?ralt=1')
    # in the double view the choice is an event
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { window.__picked = []; window.__shown = []; window.addEventListener('maps-route-alt', e => window.__picked.push(e.detail)); window.addEventListener('maps-route-alt-show', e => window.__shown.push(e.detail)); const S = window.__mp.S; S.ctx = { ...S.ctx, query: { ...S.ctx.query, pane: '1' } }; return true }""")
    c.js(ev, doc)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='drawn in the pane')
    c.wait(500)
    c.eq(c.js("() => !!document.querySelector('.mp-alts') && !document.querySelector('.mp-alts').hidden"), False, 'beside Fuel the list is Fuel’s: not repeated over the map', what='list in a pane')
    _click_until(c, lambda: (lambda p: (p['x'], p['y']))(c.js("""() => { const S = window.__mp.S; if (!S) return { x: 1, y: 1 }; const h = S.altHits.find(x => x.index === 1), m = h.q[1], n = h.q[2], r = S.box.getBoundingClientRect(), card = document.querySelector('.mp-alts'), cr = card && !card.hidden ? card.getBoundingClientRect() : null; const at = f => ({ x: r.left + m.x + (n.x - m.x) * f, y: r.top + m.y + (n.y - m.y) * f }); const free = [.5, .35, .65, .25, .75, .15, .85].map(at).find(p => !cr || p.x < cr.left - 6 || p.x > cr.right + 6 || p.y < cr.top - 6 || p.y > cr.bottom + 6); return free || at(.5) }""")),
                 "() => window.__shown.length >= 1", 'the tap is maps-route-alt-show', tries=6)
    c.eq(c.js("() => window.__shown[0]"), {'index': 1}, 'with the index, nothing else', what='detail')
    c.eq(c.js("() => window.__picked.length"), 0, 'a tap never takes a route (Fuel’s own button does): no maps-route-alt', what='taken')
    # a Map opened afterwards reads the document
    c.open('maps', docs=fdocs(flight()) + [['cache/fuel/route_alts.json', doc, 'cache']], flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=10000, what='the document is read at mount')


@case('D127', 'Route weather fills the holes of the wind barbs: the covering model is read on the gesture only, never in silence, and each barb says its model', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='V3 spec (SOG-0141, ergonomics 9 Nov): a place outside the chosen model has no arrow and is not read in silence; the « Route weather » gesture reads the covering model (GFS) for those places, fills the holes and the hover says the model of each barb')
def d127(c):
    c.open('maps', flight=True, forecast=True)
    c.js(_STATE_JS)
    hook_map(c)
    # the store: a real answer of the kept forecast for the cut; for a place of the other model (GFS) nothing kept, but the reading answers
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather, mid = 44.5; window.__gfsNet = 0; window.__full = null;
      S.ctx = { ...S.ctx, weather: { ...w, modelFor: async (la, lo) => la < mid ? { id: 'gfs_seamless', name: 'NOAA GFS', short: 'GFS' } : w.modelFor(la, lo),
        grid: async (pl, d, v, o) => {
          if (o?.model === 'gfs_seamless' && pl.length === 1) {
            if (o.cacheOnly) return null;
            window.__gfsNet++;
            const r = window.__full; return r ? { ...r, locs: [r.locs[0]] } : null }
          const r = await w.grid(pl, d, v, o); if (r?.locs?.length && pl.length > 1) window.__full = r; return r } } }; return true }""")
    c.js(_REDO_JS)
    c.until("() => (window.__mp.S.windHits || []).some(h => h.w.gap)", timeout=12000, what='the places outside the model have no wind, nothing read for them')
    c.eq(c.js("() => window.__gfsNet"), 0, 'the covering model is not read in silence', what='GFS reads before the gesture')
    gaps0 = len([h for h in c.js(_WINDS_JS) if h['gap']])
    c.ok(gaps0 > 0, str(gaps0), 'there are holes')
    # the gesture
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => window.__gfsNet >= 1", timeout=12000, what='the gesture reads the covering model for the holes')
    c.until("() => (window.__mp.S.windHits || []).some(h => h.w.other)", timeout=8000, what='a hole is filled with the other model’s wind')
    hs = c.js("() => (window.__mp.S.windHits || []).map(h => ({ gap: !!h.w.gap, other: !!h.w.other, model: h.w.model || '' }))")
    c.ok(len([h for h in hs if h['gap']]) < gaps0 and all(h['model'] == 'GFS' for h in hs if h['other']), str(hs), 'fewer holes, and each filled barb says GFS')
    tip = c.js("""async () => { const T = await import('/modules/maps/tips.js'), h = window.__mp.S.windHits.find(x => x.w.other); return T.tipAt(h.x, h.y) }""")
    c.ok(tip and 'GFS' in tip[1], str(tip), 'the hover says the model of the barb')


_FAR_JS = """async () => { const t = []; const m = window.__mpMap;
  for (let i = 0; i < 12; i++) { const c = m.getCenter(); m.jumpTo({ center: [c.lng + 1e-3 * (i % 2 ? 1 : -1), c.lat], zoom: m.getZoom() });
    await new Promise(r => setTimeout(r, 450)); const e = performance.getEntriesByName('maps:draw').slice(-1)[0]; if (e) t.push(e.duration) }
  t.sort((a, b) => a - b); return { n: t.length, med: t[t.length >> 1] || 0, max: t[t.length - 1] || 0, z: m.getZoom() } }"""


@case('D128', 'A route that crosses the Atlantic costs no more than a short one: over 3 000 NM wide there are no wind barbs (said in the notes), the route’s points are thinned to one per pixel', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 spec (SOG-0156): the cost of an image does not depend on the length of the route; a view wider than 3 000 NM draws no wind barbs and says so in the notes; no weather model is read for a route longer than that; the screen points of the great circle and of the proposed routes are one per pixel at most')
def d128(c):
    pts = [{'id': 'LFRS', 'lat': 47.1569, 'lon': -1.6078}, {'id': 'LUGEN', 'lat': 46.5833, 'lon': -1.2}, {'id': 'NEPIX', 'lat': 44.9, 'lon': 2.4},
           {'id': 'KPAM', 'lat': 30.07, 'lon': -85.58}]
    f = flight()
    f['route']['points'] = pts
    f['route']['arr'] = 'KPAM'
    f['route']['text'] = 'LFRS LUGEN NEPIX KPAM'
    for q in pts:   # winds written at every point: drawn on a short view, not on a world view
        q['wind'] = {'dirDeg': 270, 'kt': 45, 'tempC': -30, 'levelFt': 27000, 'at': '2026-10-24T11:00:00Z'}
    ads, spaces, cells = _dense_base()
    c.page.add_init_script(_FREEZE_AERO)
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, airspaces=spaces, aero_extra={'aerodromes': ads, 'cells': cells}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => window.__mp.S.worldView === true", timeout=20000, what='the framed route is a world view (more than 3 000 NM wide)')
    c.wait(800)
    c.eq(c.js("() => (window.__mp.S.windHits || []).length"), 0, 'no wind barbs on a world view', what='barbs')
    c.until("() => (document.querySelector('.mp-notes')?.textContent || '').includes('000')", timeout=6000, what='the notes say why')
    # the cost of an image is the same order as a short route’s (the dense base is Paris’s; the route is 4 000 NM long)
    ms = c.js("""async () => { const t = [], m = window.__mpMap;
      for (let i = 0; i < 10; i++) { const c = m.getCenter(); m.jumpTo({ center: [c.lng + 1e-3 * (i % 2 ? 1 : -1), c.lat], zoom: m.getZoom() });
        await new Promise(r => setTimeout(r, 450)); const e = performance.getEntriesByName('maps:draw').slice(-1)[0]; if (e) t.push(e.duration) }
      t.sort((a, b) => a - b); return { n: t.length, med: t[t.length >> 1] || 0 } }""")
    c.ok(ms['n'] >= 5 and ms['med'] < 16, f'{ms}', 'a full drawing of the world view is under 16 ms (median)')
    # zoomed in near the departure: the barbs are back, the note is gone
    c.js("() => { window.__mpMap.jumpTo({ center: [-1.4, 46.9], zoom: 7 }); return true }")
    c.until("() => window.__mp.S.worldView === false", timeout=10000, what='no longer a world view')
    c.until("() => (window.__mp.S.windHits || []).length >= 1", timeout=10000, what='the barbs are drawn again')
    c.ok(not re.search(r'3[\s,.  ]?000', c.js("() => document.querySelector('.mp-notes')?.textContent || ''") or ''), 'notes', 'the note is gone')
    # one point per pixel
    n = c.js("""async () => { const S = await import('/modules/maps/state.js'), q = Array.from({ length: 400 }, (_, i) => ({ x: i * 0.2, y: 3 + Math.sin(i / 40) })); return [q.length, S.thinPx(q).length] }""")
    c.ok(n[1] <= 90 and n[1] >= 2, str(n), '400 points over 80 px keep at most one per pixel (and the last)')


@case('D129', 'Live flight: ten writes of the flight in one second rebuild the profile once; writes that leave the route as it is rebuild nothing', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='V3 spec (SOG-0156, ergonomics decision 9 Nov): the Map reads the flight again 300 ms after the last write (one rebuild of the profile per burst of keystrokes in the double view) and does nothing for a write that leaves the route, the level and the chosen procedures as they are')
def d129(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.wait(1500)
    c.js("""() => { const S = window.__mp.S; window.__w = { S, n: 0 }; const f = S.route.flight; window.__base = JSON.parse(JSON.stringify(f)); return true }""")
    write = """async ([moves]) => { const S = window.__mp.S, f = JSON.parse(JSON.stringify(window.__base)), path = 'pilot/ABC/current_flight.json';
      for (let i = 0; i < 10; i++) {
        if (moves) f.route.points[1].lat = +(46.5833 + i * 0.01).toFixed(4); else f.progress = { phase: 'x' + i };
        f.updated_at = new Date(Date.now() + 1000 + i).toISOString(); f.by = 'fuel';
        await S.ctx.data.put(path, JSON.parse(JSON.stringify(f))); await new Promise(r => setTimeout(r, 90)) }
      return true }"""
    r0 = c.js("() => window.__mp.S.profRun || 0")
    c.js(write, [True])
    c.wait(1800)
    r1 = c.js("() => window.__mp.S.profRun || 0")
    c.eq(r1 - r0, 1, 'ten writes of a changed route in one second: the profile is rebuilt once', what='rebuilds')
    # a write that leaves the route as it is (only the progress changes): nothing is rebuilt
    c.js("""() => { const S = window.__mp.S; window.__base = JSON.parse(JSON.stringify(S.route.flight)); return true }""")
    c.js(write, [False])
    c.wait(1500)
    r2 = c.js("() => window.__mp.S.profRun || 0")
    c.eq(r2 - r1, 0, 'writes that leave the route, the level and the procedures as they are rebuild nothing', what='rebuilds')


_NEAR_JS = """() => {
  const R = window.MapsRender, rad = x => x * Math.PI / 180, rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647 })();
  const ring = (la, lo, r) => Array.from({ length: 40 }, (_, k) => [la + r * Math.sin(2 * Math.PI * k / 40), lo + r * 1.4 * Math.cos(2 * Math.PI * k / 40)]);
  // the spaces are along the rhumb line of the route (the route is flown on it, SOG-0243): each one on a point of it, a degree and a bit aside at most
  const mk = (n, route, band) => Array.from({ length: n }, (_, i) => { const g = R.rhumbAt(route[0], route[1], rnd());
    return { type: 'TMA', cls: 'D', name: 'Z' + i, lower: 'SFC', upper: 'FL195', rings: [ring(g.lat + (rnd() - .5) * band, g.lon, .03 + rnd() * .2)] } });
  // the reference: the complete test of the samples against every ring (the algorithm before SOG-0156), written here
  const gc = (a, b) => { const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2; return 2 * 3440.065 * Math.asin(Math.sqrt(h)) };
  const samples = pts => { const out = []; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(gc(a, b) / 2));
    for (let k = 0; k < n; k++) { const g = R.rhumbAt(a, b, k / n); out.push([g.lat, g.lon]) } } out.push([pts.at(-1).lat, pts.at(-1).lon]); return out };
  const ref = (a, smp, nm) => { const seg = (la, lo, p, q) => { const k = Math.cos(rad(la)), ax = (p[1] - lo) * 60 * k, ay = (p[0] - la) * 60, bx = (q[1] - lo) * 60 * k, by = (q[0] - la) * 60, dx = bx - ax, dy = by - ay,
      t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0; return Math.hypot(ax + t * dx, ay + t * dy) };
    const inside = (la, lo, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [yi, xi] = r[i], [yj, xj] = r[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c } return c };
    return smp.some(([la, lo]) => a.rings.some(r => inside(la, lo, r) || r.some((p, i) => i && seg(la, lo, r[i - 1], p) <= nm))) };
  const prof = { zones: ['TMA'], corridorNm: 10, elements: {} };
  const run = (list, route) => { const t0 = performance.now(), got = R.selectAirspaces(list, prof, route).map(a => a.name), ms = performance.now() - t0; return { got, ms } };
  // a 2 800 NM route at 48 N with 3 000 spaces along it
  const route = [{ lat: 48, lon: -30 }, { lat: 48.4, lon: 40 }], list = mk(3000, route, 1.2);
  const a = run(list, route), want = list.filter(x => ref(x, samples(route), 10)).map(x => x.name);
  // high latitude (the longitude margin): a route at 66 N with spaces near it
  const route2 = [{ lat: 66, lon: -20 }, { lat: 66.3, lon: 30 }], list2 = mk(600, route2, 1.1);
  const b2 = run(list2, route2), want2 = list2.filter(x => ref(x, samples(route2), 10)).map(x => x.name);
  return { ms: a.ms, n: a.got.length, same: JSON.stringify(a.got) === JSON.stringify(want), n2: b2.got.length, same2: JSON.stringify(b2.got) === JSON.stringify(want2) } }"""


@case('D130', 'Airspaces near a long route: only the samples that can touch a space are tested against its rings — same result as the complete test, a long route no longer takes seconds', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='V3 spec (SOG-0156): selectAirspaces with a corridor (nearRoute) tests only the route samples inside the space’s box widened by the corridor; the answer is that of the complete test (also at high latitude, where a degree of longitude is short); a 2 800 NM route among 3 000 spaces takes well under a second')
def d130(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    r = c.js(_NEAR_JS)
    c.ok(r['n'] > 100, str(r), 'many of the spaces are along the route (the test has something to find)')
    c.ok(r['same'], str(r), 'the spaces kept are those of the complete test')
    c.ok(r['n2'] > 20 and r['same2'], str(r), 'the same at 66 N, where the longitude margin matters')
    c.ok(r['ms'] < 400, f"{r['ms']:.0f} ms", 'a long route among 3 000 spaces: under 400 ms (the complete test took seconds on the user’s base)')


_SPACE_CLICK_JS = """(ft) => { const S = window.__mp.S, g = S.geo, cr = S.prof.crossed.find(x => x.a.type === window.__want), n = S.prof.samples.length - 1;
  const s = S.prof.total * ((cr.i0 + cr.i1) / 2) / n, r = S.profBox.getBoundingClientRect();
  const x = r.left + g.padL + (g.W - g.padL - g.padR) * (s - (g.w0 || 0)) / ((g.w1 ?? g.total) - (g.w0 || 0));
  const y = r.top + g.padT + (g.H - g.padT - g.padB) * (1 - (ft - g.bottom) / (g.top - g.bottom)); return { x, y } }"""


def _click_until(c, point, cond, what, tries=3):
    """A click that a loaded machine may lose (a redraw between the target’s measure and the click): measured and clicked again, up to three times."""
    for k in range(tries):
        pt = point()
        c.page.mouse.click(*pt)
        try:
            c.until(cond, timeout=4000, what=what)
            return
        except Exception:
            if k == tries - 1:
                raise


def _open_space_from_profile(c, cond, what):
    """The gesture of the sheet of a space on the profile (SOG-0163, ergonomics 10 Nov): a tap on the block chooses it (the strip under the profile names it and offers « Sheet »),
    a second tap on the chosen block (or the button) opens the sheet."""
    _click_until(c, lambda: (lambda pt: (pt['x'], pt['y']))(c.js(_SPACE_CLICK_JS, 5000)), "() => !!document.querySelector('.mp-spsel [data-spfiche]')", f'{what}: the block is chosen')
    c.eq(c.js("() => !!document.querySelector('.mp-sp-card') && !document.querySelector('.mp-sp-card').hidden"), False, 'the first tap does not open the sheet', what=f'{what}: sheet before the button')
    c.tap('.mp-spsel [data-spfiche]')
    c.until(cond, timeout=6000, what=what)


@case('D131', 'The sheet of an R or D space: a tap on its block in the profile (or on its row of the list on the map) opens its published data, and says frankly that the real activity is not known', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False, langs4=True,
      rule='V3 (SOG-0163, ergonomics 10 Nov): a click or a tap, not a hover (no hover with a finger, conditions run to several lines): name and type, limits, the activation published (AZBA, NOTAM), the hours and the AIP conditions and remarks as published, unit and frequency, source and date, and « actual activity not known: published hours only »; a P says « prohibited »; seven lines then « n more »')
def d131(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'azba': True, 'act': 'AZBA', 'admin': 'CCER Bordeaux',
              'info': 'BORDEAUX ESSAIS 122.9', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'P', 'cls': '', 'name': '9', 'key': 'LFP9', 'lower': 'SFC', 'upper': 'FL115', 'src': 'sia', 'rings': [ring(44.6, 45.4, 1.9, 2.4)]}]
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R') && window.__mp.S.prof.crossed.some(x => x.a.type === 'P'))", timeout=15000,
            what='the profile crosses the R and the P')
    c.wait(500)
    # a tap on the R's block in the profile
    c.js("() => { window.__want = 'R'; return true }")
    _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && k.textContent.length > 20 }", 'the sheet of the R opens from its block')
    t = c.js("() => document.querySelector('.mp-sp-card').textContent")
    c.ok('R 61' in t, t, 'the sheet names the space: type and name')
    c.ok('CCER Bordeaux' in t and 'BORDEAUX ESSAIS 122.9' in t, t, 'unit and frequency as the base carries them')
    c.ok('AZBA' in t, t, 'the activation published by the AZBA')
    c.ok('NOTAM' in t and re.search(r'(not known|non connue|unbekannt|no conocida)', t), t, 'and a frank line: the real activity is not known (neither NOTAM nor AZBA read)')
    c.ok(re.search(r'(SIA)', t), t, 'the source')
    # the same sheet from the map: the list of the spaces at a point, a row opened
    c.js("() => { window.__mp.S.dpanel && 0; return true }")
    c.js("() => { const b = document.querySelector('.f-sheet-close'); if (b) b.click(); return true }")
    c.wait(400)
    _click_until(c, lambda: xy(c, 44.65, .8), "() => document.querySelectorAll('.mp-lv-list li[data-i]').length >= 1", 'the list of the spaces at this point on the map')
    for k in range(3):   # a tap a redraw may lose: again, up to three times
        c.tap('.mp-lv-list li[data-i]')
        try:
            c.until("() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && /R 61/.test(k.textContent) }", timeout=3000, what='a row of the list opens the sheet')
            break
        except Exception:
            if k == 2:
                raise
            c.wait(300)
    # a P says « prohibited »
    c.js("() => { const b = document.querySelector('.f-sheet-close'); if (b) b.click(); return true }")
    c.wait(400)
    c.js("() => { window.__want = 'P'; return true }")
    _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && /P 9/.test(k.textContent) }", 'the sheet of the P opens')
    t = c.js("() => document.querySelector('.mp-sp-card').textContent")
    c.ok(re.search(r'(prohibited|interdit|verboten|prohibido)', t, re.I), t, 'a P says it is prohibited')
    # seven lines, then « n more » (the base will carry hours and remarks: the card is ready for them)
    many = c.js("""async () => { const L = await import('/modules/maps/lv.js'); return L.spaceCardHtml({ type: 'R', name: '61', lower: 'SFC', upper: 'FL115', act: 'AZBA', admin: 'CCER', info: '122.9', src: 'sia',
      hours: ['H24', 'MON-FRI 0700-1700', 'SAT 0800-1200'], rem: ['Remark one', 'Remark two', 'Remark three'] }) }""")
    c.ok('<details>' in many and many.count('<p>') >= 8 and 'MON-FRI 0700-1700' in many and 'Remark two' in many, many[:300], 'hours and remarks as published; seven lines, then « n more »')
    # AeroDB gives up to twelve lines of hours and twelve of remarks: the frank line and the activation stay in the seven lines shown
    big = c.js("""async () => { const L = await import('/modules/maps/lv.js'); return L.spaceCardHtml({ type: 'R', name: '61', lower: 'SFC', upper: 'FL115', act: 'AZBA', admin: 'CCER', info: '122.9', src: 'sia',
      hours: Array.from({ length: 12 }, (_, i) => 'HOURS ' + i), rem: Array.from({ length: 12 }, (_, i) => 'REM ' + i) }) }""")
    shown = big.split('<details>')[0]
    c.ok(re.search(r'(not known|non connue|unbekannt|no conocida)', shown) and 'AZBA' in shown and 'HOURS 0' in shown and '<details>' in big, shown[:300], 'with twelve lines of hours and of remarks the frank line, the activation and the first hours stay in the seven lines shown')


_CLASSES_JS = """() => { const m = document.querySelector('[data-module="maps"] .mp-map'), k = m && m.dataset.kept ? JSON.parse(m.dataset.kept) : null;
  return k ? { eff: +m.dataset.zoomEff, byKey: k.byKey || {}, note: /(R, D, P|R-, D-, P-|R, D, P y)/.test((document.querySelector('.mp-notes') || {}).textContent || '') } : null }"""


def _classes(c, mode, detail, zoom, corridor=True):
    """Opens the dense base on a phone in `mode` at complexity `detail` (the box « Around the flight only » ticked or not), frames `zoom`, waits for the counters to
    settle: the classes drawn (airspaces kept by family)."""
    ads, spaces, cells = _dense_base()
    ui = ['cache/maps/ui.json', {'preset': mode, 'layers': {mode: {'detail': detail, 'corridor': corridor}}}, 'cache']
    c.open('maps', docs=fdocs(_awy_flight()) + [ui], flight=False, airfields=True, airspaces=spaces, aero_extra={'aerodromes': ads, 'cells': cells}, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.wait(1500)
    c.js("(z) => { window.__mpMap.jumpTo({ center: [1.5, 47.5], zoom: z }); return true }", zoom)
    last, end = None, time.time() + 12
    while time.time() < end:
        c.wait(700)
        cur = c.js(_CLASSES_JS)
        if cur and cur == last and sum(cur['byKey'].values()) > 0:
            break
        last = cur
    cur = c.js(_CLASSES_JS)
    return {k for k, v in cur['byKey'].items() if v}, cur['note'], cur['eff']


@case('D132', 'Airspaces are a function of the zoom and the complexity only: the same view twice shows the same spaces; one more step of complexity, or of zoom, shows one more class; what the corridor hides is said', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='V3 (SOG-0169, ergonomics 10 Nov): the display of the airspaces is deterministic and progressive: the big families (FIR / UIR, TMA / CTA, CTR) are read over the whole view, the others (R, D, P, TSA…) in the flight’s corridor while « Around the flight only » is ticked (the box is the user’s explicit choice, D75), and every family then appears at its own zoom threshold, which the complexity step shifts by one level per step; the frame size compared with the thresholds is the module’s, not the map’s (the sheet changes it); what the corridor hides, the Map says')
def d132(c):
    a, note_a, eff_a = _classes(c, 'auto', 0, 5, corridor=False)
    _, note_t, _ = _classes(c, 'auto', 0, 5)       # ticked: the corridor hides what is far from the route, and says so
    # the sheet changes the map's height, not the zoom's meaning: the effective zoom is the same with the sheet collapsed, at its default and expanded
    effs = []
    for pos in ('collapsed', 'expanded', 'default'):
        c.js("(pos) => { window.__mp.S.sh.set(pos, true); return true }", pos)
        c.wait(1200)
        effs.append(c.js("() => +document.querySelector('[data-module=\"maps\"] .mp-map').dataset.zoomEff"))
    c.ok(max(effs) - min(effs) < 0.01, str(effs), 'the effective zoom does not move with the sheet (the module’s size is compared, not the map’s)')
    a2, _, _ = _classes(c, 'auto', 0, 5, corridor=False)
    c.eq(sorted(a), sorted(a2), 'the same zoom and the same complexity, loaded twice: the same classes', what='classes twice')
    c.ok(len(a) >= 1, str(a), 'at zoom 5, complexity 0, the whole view read: the big families are drawn (the dense base is Paris’s, the route runs south of it)')
    c.ok(note_t, str(note_t), 'and ticked, the Map says that the spaces outside the corridor are hidden')
    b1, note_b, _ = _classes(c, 'auto', 1, 5, corridor=False)
    c.ok(a < b1, f'{sorted(a)} -> {sorted(b1)}', 'one more step of complexity at the same zoom: one more class')
    z1, _, _ = _classes(c, 'auto', 0, 6, corridor=False)
    c.ok(a < z1, f'{sorted(a)} -> {sorted(z1)}', 'one more level of zoom at the same complexity: one more class')
    full, note_f, _ = _classes(c, 'auto', 4, 5, corridor=False)
    c.ok(b1 < full and {'asR', 'asD', 'asP'} <= full, f'{sorted(b1)} -> {sorted(full)}', 'at complexity 4 the classes R, D and P appear as well')
    c.ok(not note_f, str(note_f), 'and the note is gone')


_GEO_SHEET = """() => { const q = s => document.querySelector(s), r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] };
  const sc = []; for (let e = q('.mp-data'); e; e = e.parentElement) if (e.scrollTop) sc.push((e.className || e.tagName).toString().slice(0, 30) + ':' + e.scrollTop);
  return { panel: r(q('.mp-data')), box: r(q('.mp-box')), pc: r(q('canvas.mp-pc')), body: r(q('.mp-dbody')), card: r(q('.mp-sp-card')), cardShown: !!q('.mp-sp-card') && !q('.mp-sp-card').hidden,
           scrolled: sc, doc: [document.scrollingElement.scrollTop, innerHeight] } }"""


@case('D133', 'The sheet of a space does not move the page: the profile keeps its geometry when the sheet opens and closes, nothing scrolls outside the sheet’s body, the map and the sheet keep their heights', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False, langs4=True,
      rule='user 10 Nov, refusal of SOG-0163 (« l\'affichage est fortement impacté, sizing vertical non recalculé »; capture 095804: in the double view the map takes the whole height and the profile sheet is reduced to its toolbar at the bottom): opening the sheet of a space must scroll the body of the sheet only (scrollIntoView scrolled every scrollable ancestor, the pane too); the profile’s width and height are the same after it closes, the sheet’s and the map’s heights never change, the sheet is where it was')
def d133(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'azba': True, 'act': 'AZBA', 'admin': 'CCER Bordeaux',
              'info': 'BORDEAUX ESSAIS 122.9', 'src': 'sia', 'hours': ['H24', 'MON-FRI 0700-1700', 'SAT 0800-1200'], 'rem': ['Remark one', 'Remark two'], 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    for w, h, q in ((390, 844, 'maps'), (1280, 760, 'maps?pane=1')):
        c.page.set_viewport_size({'width': w, 'height': h})
        c.open(q, docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R'))", timeout=15000, what=f'the profile ({w} px)')
        c.wait(900)
        # every scrollIntoView of the sheet's card is a call that scrolls the ancestors too: none must happen
        c.js("() => { window.__sIV = []; const o = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function () { window.__sIV.push((this.className || '').toString()); return o.apply(this, arguments) }; return true }")
        g0 = c.js(_GEO_SHEET)
        c.js("() => { window.__want = 'R'; return true }")
        _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && k.textContent.length > 20 }", f'the sheet of the R opens ({w} px)')
        c.wait(700)
        g1 = c.js(_GEO_SHEET)
        c.eq(g1['panel'], g0['panel'], 'the sheet keeps its place and its height while the sheet of the space is open', what=f'{w}: panel')
        c.eq(g1['box'], g0['box'], 'the map keeps its place and its height', what=f'{w}: map box')
        c.ok(not g1['scrolled'] and g1['doc'][0] == 0, str(g1['scrolled']) + str(g1['doc']), 'nothing scrolls outside the body of the sheet (the page, the pane)')
        c.eq([x for x in c.js('() => window.__sIV') if 'mp-sp-card' in x], [], 'the card does not call scrollIntoView', what=f'{w}: scrollIntoView')
        pb, cd = g1['body'], g1['card']
        c.ok(g1['cardShown'] and cd and pb and cd[1] >= pb[1] - 1 and cd[1] < pb[1] + pb[3], f'card {cd} body {pb}', 'the card starts inside the body of the sheet (reachable by scrolling it)')
        c.js("() => { const b = document.querySelector('.f-sheet-close'); if (b) b.click(); return true }")
        c.wait(900)
        g2 = c.js(_GEO_SHEET)
        c.eq([g2['panel'], g2['box'], g2['pc']], [g0['panel'], g0['box'], g0['pc']], 'closed: the sheet, the map and the profile are exactly as at the opening (width and height of the graph)', what=f'{w}: after')


@case('D134', 'Profile: a tap on a space block chooses it (highlight, its name and limits and a « Sheet » button under the profile); only a second tap on it, or the button, opens the sheet; a tap elsewhere chooses nothing; the profile is never replaced without an explicit gesture', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False, langs4=True,
      rule='ergonomics 10 Nov (the user’s refusal of SOG-0163, « affichage fortement impacté »): on a profile crowded with blocks the first tap anywhere opened the sheet and replaced the profile: now a first tap on a block chooses it, a second tap on the chosen block or the strip’s button opens the sheet, a tap outside any block deselects, and the profile’s geometry does not change while choosing')
def d134(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R'))", timeout=15000, what='the profile crosses the R')
    c.wait(700)
    g0 = c.js(_GEO_SHEET)
    c.js("() => { window.__want = 'R'; return true }")
    # first tap on the block: chosen, not opened
    _click_until(c, lambda: (lambda pt: (pt['x'], pt['y']))(c.js(_SPACE_CLICK_JS, 5000)), "() => !!document.querySelector('.mp-spsel [data-spfiche]')", 'the block is chosen')
    st = c.js("() => ({ dpanel: window.__mp.S.dpanel, sel: !!window.__mp.S.selSpace, strip: document.querySelector('.mp-spsel').textContent, card: !!document.querySelector('.mp-sp-card') && !document.querySelector('.mp-sp-card').hidden })")
    c.ok(st['dpanel'] is None and st['sel'] and not st['card'], str(st), 'one tap chooses the block: the profile stays, nothing opens')
    c.ok('R 61' in st['strip'], st['strip'], 'the label over the profile names it, with its limits, and offers the button')
    c.eq(c.js(_GEO_SHEET)['pc'], g0['pc'], 'the profile keeps its geometry while a block is chosen', what='pc')
    # a tap elsewhere (above the block's ceiling): nothing chosen
    pt = c.js("() => { const S = window.__mp.S, g = S.geo, r = S.profBox.getBoundingClientRect(); return { x: r.left + g.padL + (g.W - g.padL - g.padR) * .88, y: r.top + g.padT + (g.H - g.padT - g.padB) * .5 } }")   # 88 % along the route: past the R
    c.page.mouse.click(pt['x'], pt['y'])
    c.until("() => !window.__mp.S.selSpace && !document.querySelector('.mp-spsel [data-spfiche]')", timeout=5000, what='a tap outside any block chooses nothing')
    # choose again, then a second tap on the chosen block opens the sheet
    _click_until(c, lambda: (lambda pt: (pt['x'], pt['y']))(c.js(_SPACE_CLICK_JS, 5000)), "() => !!window.__mp.S.selSpace", 'chosen again')
    pt = c.js(_SPACE_CLICK_JS, 5000)
    c.page.mouse.click(pt['x'], pt['y'])
    c.until("() => window.__mp.S.dpanel === 'lv' && !!document.querySelector('.mp-sp-card') && !document.querySelector('.mp-sp-card').hidden", timeout=6000, what='the second tap on the chosen block opens the sheet')
    c.js("() => { const b = document.querySelector('.f-sheet-close'); if (b) b.click(); return true }")
    c.wait(800)
    c.eq(c.js(_GEO_SHEET)['pc'], g0['pc'], 'closed: the profile is as it was', what='pc after')
    # the button opens it too
    c.until("() => !!document.querySelector('.mp-spsel [data-spfiche]')", timeout=5000, what='the choice is kept when the sheet closes')
    c.tap('.mp-spsel [data-spfiche]')
    c.until("() => window.__mp.S.dpanel === 'lv'", timeout=6000, what='the button opens the sheet')


@case('D135', 'Ground panel: a failed reading says why and offers « Try again », which reads the ground alone; « reading… » while it runs; the taxiways are drawn once it is read', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False, langs4=True,
      rule='SOG-0046 / 0135 refused (« rien »): the launcher started the ground reading and wrote nothing, the failure was swallowed; AeroDb.groundStatus(icao) { state: none | reading | ok | failed, reason, message } and on(change, { ground, groundFailed }): the panel says « Ground not read: <reason> » with the launcher’s message and a « Try again » that calls AeroDb.fetchGround (the ground only, not the procedures); none keeps the sentence and the link to the procedures')
def d135(c):
    c.open('maps', docs=fdocs(_ground_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""async () => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json(), a = S.ctx.aerodb; fx.cycle = '2026-11-10';
      window.__have = false; window.__retries = 0; window.__st = { state: 'failed', reason: 'failed', message: 'Overpass answered HTTP 429' };
      a.ground = async icao => icao === 'LFPO' && window.__have ? fx : null;
      a.groundStatus = async () => ({ ...window.__st });
      a.fetchGround = async () => { window.__retries++; await new Promise(r => setTimeout(r, 400)); window.__have = true; window.__st = { state: 'ok' }; return { ok: true } };
      return true }""")
    _ground_at(c, 15, 1200)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => !!document.querySelector('.mp-gd-fail')", timeout=8000, what='a failed reading is said')
    t = c.js("() => document.querySelector('.mp-gd-fail').textContent")
    c.ok('429' in t, t, 'with the launcher’s own words')
    c.eq(c.js("() => !!document.querySelector('.mp-gd-retry')"), True, 'and a « Try again » button', what='retry')
    c.eq(c.js("() => !!document.querySelector('.mp-gd-procs')"), False, 'no link to the procedures while the ground failed (the procedures are not the problem)', what='procedures link')
    c.tap('.mp-gd-retry')
    c.until("() => /…/.test(document.querySelector('.mp-gd-none')?.textContent || '') || document.querySelectorAll('.mp-gd-row').length > 10", timeout=4000, what='reading… while it runs, or already read')
    c.until("() => document.querySelectorAll('.mp-gd-row').length > 10", timeout=9000, what='the ground is read: the rows are listed')
    c.eq(c.js("() => window.__retries"), 1, 'the retry read the ground once, through fetchGround', what='retries')
    c.eq(c.js("() => !!document.querySelector('.mp-gd-fail, .mp-gd-retry')"), False, 'no failure left', what='failure')
    c.until("() => window.__mp.S.ground.hits.length > 20", timeout=8000, what='the taxiways are drawn')
    # the announcement (AeroDB: change { ground }) reaches the open panel: the file is gone and the reading failed again
    c.js("async () => { window.__st = { state: 'failed', reason: 'too-soon', message: '' }; window.__have = false; (await import('/modules/maps/ground.js')).groundChanged('LFPO', false); return true }")
    c.until("() => { const f = document.querySelector('.mp-gd-fail'); return !!f && /(too soon|trop|zu kurz|demasiado)/i.test(f.textContent) }", timeout=6000, what='a failure announced while the panel is open is said, with its reason')

_DASH_SPY_JS = """() => { window.__dash = []; const o = CanvasRenderingContext2D.prototype.setLineDash;
  CanvasRenderingContext2D.prototype.setLineDash = function (a) { if (a && a.length) window.__dash.push(a.map(x => +x.toFixed(2))); return o.apply(this, arguments) }; return true }"""
# the engine’s words are told apart from the other dashes of the Map by their signature: incomplete = [2.6 w, 1.6 w], fallback = [.1, 1.9 w]
_DASH_KINDS_JS = """() => { const w = [4, 6.5], inc = window.__dash.filter(a => w.some(x => Math.abs(a[0] - x * 2.6) < .05 && Math.abs(a[1] - x * 1.6) < .05)).length,
  fb = window.__dash.filter(a => a[0] === .1 && w.some(x => Math.abs(a[1] - x * 2) < .05)).length; return { inc, fb } }"""


@case('D136', 'Proposed routes: what the engine says of each segment is drawn — controlled solid, incomplete dashed, fallback dotted, error red', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='fuel INTEGRATION § 3 bis (SOG-0161): each alternative carries `control`, one entry per segment points[k] → points[k + 1] (controlled, incomplete, fallback, error, or null); the Map draws controlled solid, incomplete dashed, fallback dotted and error red like a faulty segment; the card gives the key')
def d136(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js(_DASH_SPY_JS)
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    doc = _alts_doc()
    c.js(ev, doc)    # no `control`: nothing dashed
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='the routes are drawn')
    c.wait(600)
    c.eq(c.js(_DASH_KINDS_JS), {'inc': 0, 'fb': 0}, 'without `control` every segment is solid', what='dashes')
    c.eq(c.js("() => !!document.querySelector('.mp-al-key')"), False, 'and the key is not shown', what='key')
    doc['alternatives'][0]['control'] = ['fallback', 'incomplete', 'controlled']
    doc['alternatives'][1]['control'] = ['error', None, 'bogus']
    c.js(ev, doc)
    c.until("() => { const w = [4, 6.5]; return window.__dash.some(a => w.some(x => Math.abs(a[0] - x * 2.6) < .05)) }", timeout=8000, what='the dashes of the engine’s words')
    k = c.js(_DASH_KINDS_JS)
    c.ok(k['inc'] > 0, str(k), 'an incomplete segment is dashed (long dashes)')
    c.ok(k['fb'] > 0, str(k), 'a fallback segment is dotted (round dots, wide gaps)')
    c.eq(c.js("() => window.__mp.S.alts.list[1].control"), ['error', None, None], 'an unknown word is not kept', what='sanitized control')
    c.until("() => !!document.querySelector('.mp-al-key')", timeout=4000, what='the key is on the card')
    kt = c.js("() => document.querySelector('.mp-al-key').textContent")
    c.ok(re.search(r'(pointillé|dotted|gepunktet|puntos)', kt), kt, 'it says what plain, dashed, dotted and red mean')
    doc['alternatives'][0]['control'] = ['fallback', 'incomplete', 'controlled', 'error', 'error']
    c.js(ev, doc)
    c.eq(c.js("() => window.__mp.S.alts.list[0].control.length"), 3, 'one entry per segment at most', what='control length')


@case('D137', 'Route weather: the tap answers at once (« Reading… », busy button, seconds counted), ten taps are one reading, the page lives meanwhile, and the end is always said (cut, or the reason with « Try again »)', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0139 refused (« le bouton reste bleu, on ne sait pas ce que fait le lanceur, rien ne s’affiche »): the tap on « Route weather » shows « Reading the route weather… » with the seconds at once and the button is busy (aria-busy); further taps do not start another reading; the page answers during it; the end is always said: the cut, or the reason (offline, daily limit, more than 20 s, HTTP status, nothing returned, no cruise level) with « Try again »')
def d137(c):
    c.open('maps', flight=True, forecast=True)
    c.js(_STATE_JS)
    c.js("""() => { const S = window.__mp.S, w = S.ctx.weather, g = w.grid.bind(w); window.__got = null;
      S.ctx = { ...S.ctx, weather: { ...w, grid: async (...a) => { const r = await g(...a); if (r?.locs?.length && !window.__got) window.__got = JSON.parse(JSON.stringify(r)); return r } } }; return true }""")
    c.until("() => !!window.__mp.S.wxWinds", timeout=12000, what='the kept forecast is read once (to copy a real answer)')
    c.js("() => { window.__mp.S.wx = null; return true }")
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => !!window.__got", timeout=10000, what='a real answer of the store is kept')
    got = c.js("() => window.__got")
    forget(c.page, c.doc_paths('cache/weather/'), c.base)
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.page.add_style_tag(content='#fNotes{display:none!important}')
    c.js("""(r) => { const S = window.__mp.S, w = S.ctx.weather; window.__calls = 0; window.__mode = 'slow'; window.__r = r; window.__stale = null;
      S.ctx = { ...S.ctx, weather: { ...w, grid: async (places, dep, vars, o) => { if (o?.cacheOnly) return null; window.__calls++; window.__stale = o?.stale || null;
        if (window.__mode === 'slow') { await new Promise(x => setTimeout(x, 2300)); return window.__r }
        if (window.__mode === 'hang') return new Promise(() => {})
        if (window.__mode === 'empty') return { locs: [] }
        if (window.__mode === '429') throw Object.assign(new Error('x'), { status: 429 })
        throw Object.assign(new Error('x'), { offline: true }) } } };
      return true }""", got)
    # 1. the tap answers at once, the button is busy, ten taps are one reading, the page lives
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => !!document.querySelector('.mp-dbody .mp-wxel')", timeout=1500, what='the sheet says at once that the weather is being read, with the seconds')
    c.eq(c.attr('.mp-chip[data-view="weather"]', 'aria-busy'), 'true', 'the button is busy while it reads', what='aria-busy')
    c.js("() => { for (let i = 0; i < 9; i++) document.querySelector('.mp-chip[data-view=\"weather\"]').click(); return true }")
    c.until("() => /^[1-9]\\d* s/.test(document.querySelector('.mp-dbody .mp-wxel')?.textContent || '')", timeout=4000, what='the page lives meanwhile: the seconds count')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", timeout=9000, what='the cut is drawn')
    c.eq(c.js("() => window.__calls"), 1, 'ten taps made one reading', what='readings')
    c.eq(c.attr('.mp-chip[data-view="weather"]', 'aria-busy'), 'false', 'the button is free again', what='aria-busy')
    # 2. a reading that never ends is stopped and said, with « Try again »; the store is told it can stop waiting
    c.js("() => { const S = window.__mp.S; S.wx = null; S.wxDeadline = 1500; window.__mode = 'hang'; window.__calls = 0; return true }")
    c.tap('.mp-chip[data-view="profile"]')
    c.wait(300)
    c.tap('.mp-chip[data-view="weather"]')
    c.until("() => !!document.querySelector('.mp-wxmsg [data-wxget]')", timeout=6000, what='a reading that takes too long is stopped and said, with a way to try again')
    t = c.js("() => document.querySelector('.mp-wxmsg').textContent")
    c.ok(re.search(r'20 s', t), t, 'the message says the delay')
    c.eq(c.js("() => window.__stale && window.__stale()"), True, 'the store is told to stop waiting (stale)', what='stale')
    c.eq(c.attr('.mp-chip[data-view="weather"]', 'aria-busy'), 'false', 'the button is free', what='aria-busy')
    # 3. other ends: an HTTP refusal says its status, an empty answer says so, offline says offline; each offers « Try again »
    for mode, pat in (('429', r'429'), ('empty', r'(rien rendu|returned nothing|nichts|no devolvi)'), ('offline', r'(Hors ligne|Offline|Sin conexión)')):
        c.js("(m) => { window.__mode = m; return true }", mode)
        c.tap('.mp-wxmsg [data-wxget]')
        c.until("(p) => new RegExp(p, 'i').test(document.querySelector('.mp-wxmsg')?.textContent || '') && !!document.querySelector('.mp-wxmsg [data-wxget]')", pat, timeout=6000, what=f'the end « {mode} » is said with a way to try again')
    # 4. then it works: « Try again » reads and draws the cut
    c.js("() => { window.__mode = 'slow'; window.__mp.S.wxDeadline = 0; return true }")
    c.tap('.mp-wxmsg [data-wxget]')
    c.until("() => { const s = document.querySelector('.mp-dbody svg'); return !!s && s.getBoundingClientRect().height > 0 }", timeout=9000, what='« Try again » draws the cut')


def _themed(c, fam, mid, hash_, profile_def=False, preset=None):
    """Writes a synthetic mission of folder family `fam` (without the studio profile of its general map unless asked) and opens the Map on `hash_`."""
    text = FIXTURE.read_text(encoding='utf-8').replace('ESSAI1', mid)
    if not profile_def:
        text = '\n'.join(l for l in text.split('\n') if not l.lstrip().startswith('profile_def:'))
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [f'missions/{fam}/{mid}/mission{mid}.yaml', text])
    c.open(hash_, docs=fdocs(flight()) + ([['cache/maps/ui.json', {'preset': preset, 'layers': {}}, 'cache']] if preset else []), airfields=True, wait=False)
    c.until("() => !!document.querySelector('.mp-mbar') && !document.querySelector('.mp-mbar').hidden", timeout=15000, what='the mission banner')
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S.profile && !!window.__mp.S.mtheme", timeout=8000, what='the mission map has its view')


_THEME_JS = """() => { const S = window.__mp.S; return { theme: S.mtheme, auto: S.mthemeAuto, id: S.profile?.id, base: S.profile?.base, src: S.profileSource,
  sel: document.querySelector('.mp-mb-theme')?.value, opts: [...document.querySelectorAll('.mp-mb-theme option')].map(o => o.value) } }"""


@case('D138', 'Mission maps open in the view of their use: a SO mission’s target / detail / zone map in VFR topo, the general map and a commercial mission in the flight’s view, the map’s own profile first; a banner choice (VFR topo, IFR, base only) is kept per map', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0171 (the user, on the mission sheet: « VFR topographique sur la carte cible d’un SAR ou HEMS… sur une commerciale, non »): the YAML profile of the map wins; else target / detail / detail_rdv / zone maps of a non-commercial family open in VFR topo (relief, obstacles, VRP, VFR aerodromes, low spaces, OpenFreeMap liberty); the general map and a commercial mission keep the flight’s view; the banner offers VFR topo / IFR / Base only (kept per mission map on the device); closing the banner gives the flight’s view back')
def d138(c):
    # 1. a SAR mission: its target map is VFR topo, its general map the flight’s view (IFR here)
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    t = c.js(_THEME_JS)
    c.eq([t['theme'], t['base'], t['src'], t['sel']], ['vfr', 'ofm-liberty', 'theme', 'vfr'], 'SAR, target map: VFR topo on the topographic base, said in the banner', what=str(t))
    c.eq(t['opts'], ['vfr', 'ifr', 'base'], 'the banner offers three views (no profile of the map’s own here)', what='options')
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_generale.png')
    t = c.js(_THEME_JS)
    c.eq([t['theme'], t['src']], ['ifr', 'theme'], 'SAR, general map: the flight’s view (IFR)', what=str(t))
    # 2. a commercial mission keeps the flight’s view even on its target map
    _themed(c, '3_COMMERCIAL', 'COM1', 'maps?mission=COM1&map=carte_cible.png')
    t = c.js(_THEME_JS)
    c.eq([t['theme'], t['base'] != 'ofm-liberty'], ['ifr', True], 'commercial, target map: the flight’s view', what=str(t))
    # 3. the YAML profile of a map wins over the use
    _themed(c, '2_SAR', 'SAR2', 'maps?mission=SAR2&map=carte_generale.png', profile_def=True)
    t = c.js(_THEME_JS)
    c.eq([t['theme'], t['id'], t['src']], ['yaml', 'essai-copy', 'copy'], 'the YAML profile of the map comes first', what=str(t))
    c.eq(t['opts'], ['yaml', 'vfr', 'ifr', 'base'], 'and is offered as a first choice', what='options')
    # 4. the choice of the banner is kept for this map on the device, and only when it differs from the use
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    c.js("() => { const s = document.querySelector('.mp-mb-theme'); s.value = 'base'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.profile?.id === 'v3-base'", timeout=6000, what='« Base only » redraws the map without aeronautical layers')
    c.eq(c.js("() => window.__mp.S.profileSource"), 'chosen', 'it is a choice', what='source')
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    t = c.js(_THEME_JS)
    c.eq([t['theme'], t['auto']], ['base', 'vfr'], 'the choice survives a reload (kept for this map), the use’s view stays the default', what=str(t))
    c.js("() => { const s = document.querySelector('.mp-mb-theme'); s.value = 'vfr'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.profile?.base === 'ofm-liberty'", timeout=6000, what='back to the use’s view')
    c.eq(c.js("() => Object.keys(window.__mp.S.mthemes)"), [], 'the use’s view is not kept as a choice', what='kept')
    # 5. closing the banner gives the flight’s view back
    c.tap('.mp-mbar [data-mbx]')
    c.until("() => location.hash.includes('flight=1')", timeout=6000, what='the cross removes the banner')
    c.until("() => !!window.__mp?.S && window.__mp.S.missionId === ''", timeout=10000, what='the Map is on the flight again')
    c.until("() => window.__mp.S.profile && window.__mp.S.profile.id !== 'v3-base'", timeout=8000, what='the flight’s own view')


_STACK_JS = """() => { const q = s => document.querySelector(s), r = e => e ? e.getBoundingClientRect() : null, body = r(q('.mp-dbody')), st = r(q('.mp-lv-stack')), svg = q('svg.mp-lv'),
  card = r(q('.mp-sp-card')), cols = [...document.querySelectorAll('svg.mp-lv rect.mp-lv-col')].map(x => { const b = x.getBoundingClientRect(); return { h: b.height, top: b.top, bot: b.bottom, sel: x.classList.contains('mp-lv-sel') } });
  const inBody = b => !!b && !!body && b.top >= body.top - 1 && b.bottom <= body.bottom + 1;
  return { n: cols.length, sel: cols.filter(c => c.sel).length, colsInBody: cols.length > 0 && cols.every(c => c.top >= body.top - 1 && c.bot <= body.bottom + 1 && c.h >= 8),
    stackInBody: inBody(st), stack: st && [Math.round(st.left), Math.round(st.top), Math.round(st.right), Math.round(st.bottom)], card: card && [Math.round(card.left), Math.round(card.top), Math.round(card.right), Math.round(card.bottom)],
    body: body && [Math.round(body.top), Math.round(body.bottom)], labels: [...svg.querySelectorAll('text')].map(t => t.textContent).filter(t => /^(SFC|FL\\d+)$/.test(t)), cardText: (q('.mp-sp-card')?.textContent || '').slice(0, 40) } }"""


@case('D139', 'The sheet of a space keeps its stack of levels: the spaces of the point as blocks floor → ceiling on a scale framed on their limits (never empty), the chosen one highlighted, a tap on a block changes the card; the card beside the stack (wide) or under it (phone), reachable, nothing off the screen', 'D',
      tags=('maps', 'sheet'), designs=('standard',), night=False, screens=False,
      rule='SOG-0163 refused again (the user 10 Nov, captures 103950 / 103959 / 104008: the open sheet leaves an empty level scale and the space card goes off the screen): the sheet keeps a stack of the spaces of the point (blocks floor → ceiling on the FL scale, framed on their limits, the chosen one highlighted, a tap on a block changes the card); the card beside the stack when wide, under it on a phone, scrolling inside the sheet’s height; the stack stays in view while the card scrolls')
def d139(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'azba': True, 'act': 'AZBA', 'admin': 'CCER Bordeaux',
              'info': 'BORDEAUX ESSAIS 122.9', 'src': 'sia', 'hours': ['H24', 'MON-FRI 0700-1700'], 'rem': ['Remark one', 'Remark two'], 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'D', 'cls': '', 'name': '62', 'key': 'LFD62', 'lower': 'SFC', 'upper': 'FL195', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    for w, h, q in ((390, 844, 'maps'), (1280, 760, 'maps?pane=1')):
        c.page.set_viewport_size({'width': w, 'height': h})
        c.open(q, docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R') && window.__mp.S.prof.crossed.some(x => x.a.type === 'D'))", timeout=15000, what=f'the profile crosses the R and the D ({w} px)')
        c.wait(900)
        c.js("async () => { const S = window.__mp.S; (await import('/modules/maps/profile_view.js')).setCursor(S.prof.total * .33); window.__want = 'R'; return true }")
        _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && k.textContent.length > 20 }", f'the sheet of an R opens ({w} px)')
        c.wait(600)
        g = c.js(_STACK_JS)
        c.shot(f'D139_sheet_{w}.png')   # the delivered state: the bench writes a capture only on a failure
        c.eq(g['n'], 2, 'the stack holds both spaces of the point', what=f'{w}: columns')
        c.eq(g['sel'], 1, 'the chosen one is highlighted', what=f'{w}: selected')
        c.ok(g['colsInBody'] and g['stackInBody'], str(g), 'the stack is in view, every block drawn (none empty, none outside the sheet’s body)')
        if w < 600:
            c.ok(g['card'][1] >= g['stack'][3] - 1, str(g), 'on a phone the card is under the stack')
        else:
            c.ok(g['card'][0] >= g['stack'][2] - 1, str(g), 'wide: the card is beside the stack')
        # the stack stays in view while the card scrolls, and the card is wholly reachable
        c.js("() => { const b = document.querySelector('.mp-dbody'); b.scrollTop = b.scrollHeight; return true }")
        c.wait(300)
        g2 = c.js(_STACK_JS)
        c.ok(g2['stackInBody'] and g2['colsInBody'], str(g2), 'scrolled to the end of the sheet the stack is still in view (not left behind)')
        c.ok(g2['card'][3] <= g2['body'][1] + 1, str(g2), 'and the end of the card is reachable: nothing off the screen')
        c.eq(c.js("() => [document.scrollingElement.scrollTop, [...document.querySelectorAll('.mp-data')].map(e => e.scrollTop)]"), [0, [0]], 'nothing scrolls but the body of the sheet', what=f'{w}: scroll')
        # a tap on the other block changes the card
        before = g2['cardText']
        c.js("() => { const r = [...document.querySelectorAll('svg.mp-lv rect.mp-lv-col')].find(x => !x.classList.contains('mp-lv-sel')); r.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }")
        c.until("() => document.querySelectorAll('svg.mp-lv rect.mp-lv-sel').length === 1", timeout=3000, what='one block is highlighted')
        c.ok(c.js(_STACK_JS)['cardText'] != before, before, 'a tap on the other block changes the card')
    # a stack at the top of the sky is framed on its limits: not an empty scale from the ground, no « SFC »
    c.js("""async () => { const lv = await import('/modules/maps/lv.js'), a = { type: 'TRA', name: '34', key: 'T34', lower: 'FL195', upper: 'UNL', src: 'sia' }; lv.openSpace(a, [a]); return true }""")
    c.until("() => document.querySelectorAll('svg.mp-lv rect.mp-lv-col').length === 1", timeout=4000, what='the stack of an FL195 | UNL space')
    g3 = c.js(_STACK_JS)
    c.ok(g3['colsInBody'] and 'SFC' not in g3['labels'] and len(g3['labels']) >= 2, str(g3), 'framed on its limits: the scale starts near FL195, the block is drawn, no « SFC »')


_NAT_SPY_JS = """() => { window.__ns = []; window.__tx = []; const o = CanvasRenderingContext2D.prototype.stroke, f = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.stroke = function () { window.__ns.push({ c: this.strokeStyle, w: +this.lineWidth.toFixed(2), a: this.globalAlpha, d: this.getLineDash().map(x => +x.toFixed(2)) }); return o.apply(this, arguments) };
  CanvasRenderingContext2D.prototype.fillText = function (t) { if (/11px sans-serif/.test(this.font)) window.__tx.push(String(t)); return f.apply(this, arguments) }; return true }   // only the proposed routes’ layer writes in 11 px sans-serif"""


@case('D140', 'Proposed routes tell what each stretch is: the width of the flight’s route, an airway solid with its name along it, DCT dashed, FRA dotted, SID / STAR in the procedures’ tint, a fault red, a thin line when not fully checked; the chosen route’s points marked and named; a key; the hover of a line on the map highlights it', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0134 refused (« moche : ni les points ni les awy, ni si c’est du DCT, du FRA… uniformément de la même couleur, très gros, sans légende »): per segment `via` (airway, DCT, FRA) and `layer` (SID, LOW, HIGH, FRA, STAR, APP) published by Fuel as `faulty` / `control`; a line 4 px as the flight’s route, the chosen one solid, the others faded; airway = solid + name along, DCT = dashes, FRA = dots, SID / STAR / approach = the procedures’ tints, fault = red, not fully checked = thinner; the points of the chosen route named (entry, exit, changes of airway always); a collapsible key; the hover of a line highlights it')
def d140(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js(_NAT_SPY_JS)
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    doc = _alts_doc()
    a = doc['alternatives'][0]
    n = len(a['points'])     # 4 points, 3 stretches: SID, airway UN10, DCT
    a['ids'] = ['LFRS', 'AAA', 'BBB', 'LFML'][:n]
    a['via'] = ['', 'UN10', 'DCT'][:n - 1]
    a['layer'] = ['SID', 'LOW', ''][:n - 1]
    a['control'] = [None, None, 'incomplete'][:n - 1]
    b = doc['alternatives'][1]
    b['via'] = ['FRA', 'FRA', 'T11']
    b['layer'] = ['FRA', 'FRA', 'LOW']
    c.js(ev, doc)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='the routes are drawn')
    c.wait(700)
    st = c.js("() => window.__ns")
    ch = [x for x in st if x['a'] == 1]
    fade = [x for x in st if x['a'] < 1]
    c.ok(any(x['w'] == 4 and x['d'] == [] and x['c'] == '#8e24aa' for x in ch), str(ch[:6]), 'the airway: 4 px, the width of the flight’s route, solid, the route’s colour')
    green = lambda h: h.startswith('#') and int(h[3:5], 16) > int(h[1:3], 16) + 40 and int(h[3:5], 16) > int(h[5:7], 16) + 40
    c.ok(any(green(x['c']) and x['w'] == 4 for x in ch), str(ch[:6]), 'the SID in the procedures’ tint (green)')
    c.ok(any(x['w'] == 2.4 and x['d'] == [8, 5] for x in ch), str(ch[:8]), 'the DCT not fully checked: dashes, and thinner')
    c.ok(any(x['d'] == [2, 4] for x in fade), str(fade[:6]), 'the FRA stretches of the other route: dots, faded')
    c.ok(any(x['c'] == '#d6173f' for x in st), 'no red', 'the faulty stretch is red')
    c.shot(f'D140_routes_{c.width}.png')
    tx = c.js("() => window.__tx")
    c.ok('LFRS' not in tx and 'LFML' not in tx and 'AAA' not in tx and 'BBB' not in tx, str(tx), 'the points the flight’s route already names are not named again by the proposed routes (here the chosen route is the flight’s)')
    # the key: collapsible in the list, and in the map’s legend
    c.until("() => !!document.querySelector('.mp-alts .mp-al-leg')", timeout=4000, what='a collapsible key in the list')
    lg = c.js("() => [...document.querySelectorAll('.mp-alts .mp-al-leg li')].map(l => l.textContent)")
    c.ok(any('DCT' in t for t in lg) and any('FRA' in t for t in lg) and any('SID' in t for t in lg), str(lg), 'it names DCT, FRA and the SID, the stretches that are drawn')
    c.eq(c.js("() => document.querySelector('.mp-alts .mp-al-leg').open"), False, 'folded', what='key open')
    # the common table (frame/lib/route_legend.js, Features SOG): the Map’s words and patterns are the table’s, not its own
    rl = c.js("""async () => { const RL = await import('/frame/lib/route_legend.js'), l = window.__mp.S.ctx.lang(), i = Math.max(0, RL.LANGS.indexOf(l));
      return { labels: RL.NATURES.filter(n => ['awy', 'dct', 'fra', 'sid'].includes(n.id)).map(n => n.label[i]), dct: RL.NATURES.find(n => n.id === 'dct').dash, fra: RL.NATURES.find(n => n.id === 'fra').dash } }""")
    c.ok(all(any(w in t for t in lg) for w in rl['labels']), f'{lg} / {rl}', 'the key’s words are the common table’s (the same as Fuel’s Route screen)')
    c.ok(any(x['d'] == rl['dct'] for x in ch) and any(x['d'] == rl['fra'] for x in fade), f"{rl}", 'and the dashes drawn are the table’s (DCT, FRA)')
    c.tap('.mp-chip[data-legend]')
    c.until("() => [...document.querySelectorAll('.mp-legend li')].some(l => /DCT/.test(l.textContent))", timeout=6000, what='the map’s legend lists the same lines')
    c.tap('.mp-chip[data-legend]')
    # the hover of the other line on the map highlights it
    pt = c.js("() => { const S = window.__mp.S, h = S.altHits.find(x => x.index === 1), m = h.q[1], r = S.box.getBoundingClientRect(); return { x: r.left + (m.x + h.q[2].x) / 2, y: r.top + (m.y + h.q[2].y) / 2 } }")
    c.wait(1000)   # the mouse events that follow a touch are ignored for a moment
    c.js("() => { window.__ns = []; return true }")
    c.page.mouse.move(pt['x'], pt['y'])
    c.page.mouse.move(pt['x'] + 1, pt['y'] + 1)
    c.until("() => window.__mp.S.altHover === 1", timeout=4000, what='the line under the pointer is highlighted')
    c.until("() => window.__ns.some(x => x.w === 6.5)", timeout=4000, what='and drawn thick')
    c.page.mouse.move(5, 5)
    c.until("() => window.__mp.S.altHover === null", timeout=4000, what='and let go when the pointer leaves it')
    # closer, there is room along the airway’s stretch: its name is written along it (a name that finds no room is not written)
    c.js("() => { const S = window.__mp.S, h = S.altHits.find(x => x.index === 0), a = window.__mpMap.unproject([(h.q[1].x + h.q[2].x) / 2, (h.q[1].y + h.q[2].y) / 2]); window.__mpMap.jumpTo({ center: [a.lng, a.lat], zoom: window.__mpMap.getZoom() + 1.3 }); window.__tx = []; return true }")
    c.until("() => window.__tx.includes('UN10')", timeout=8000, what='the airway’s name is written along its stretch when there is room')


_PAN_SPY_JS = """() => { window.__aw = 0; const o = CanvasRenderingContext2D.prototype.stroke, low = MapsRender.palette(!!window.__mp.S.theme?.dark).airwayLow;
  if (!window.__awSpy) { window.__awSpy = true; CanvasRenderingContext2D.prototype.stroke = function () { if (this.strokeStyle === window.__awLow) window.__aw++; return o.apply(this, arguments) } }
  const c = document.createElement('canvas').getContext('2d'); c.strokeStyle = low; window.__awLow = c.strokeStyle; return window.__awLow }"""


@case('D141', 'Airways follow the same thresholds during, after and outside a gesture: at a wide zoom a pan does not make the low airways appear (the light drawing of a gesture drew every loaded one), at a close zoom it keeps them', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0173 (capture 095804): « en zoom arrière prononcé, déplacer la carte fait apparaître une foule de voies basses qu’on ne voit pas au repos »: the light drawing of a gesture (light.js) painted the airways of the list the full drawing had loaded, not the ones it had drawn; the same zoom thresholds (awLow / awHigh of the zoom × complexity table) before, during and after a move')
def d141(c):
    zones, segs = _awy_rows()
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, airways=segs, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.wait(1500)
    c.js(_PAN_SPY_JS)
    for z, want in ((8, True), (3, False)):
        c.js("(z) => { window.__mpMap.jumpTo({ center: [1.5, 45], zoom: z }); return true }", z)
        c.wait(1800)    # the full drawing at rest
        eff = c.js("() => +document.querySelector('[data-module=\"maps\"] .mp-map').dataset.zoomEff")
        n = c.js("() => window.__mp.S.lightSrc ? window.__mp.S.lightSrc.airways.length : -1")
        if want:
            c.ok(n > 0, f'zoom {z} (effective {eff}): {n} airways in the light drawing', 'at a close zoom the light drawing keeps the airways the full drawing drew')
        else:
            c.eq(n, 0, f'at zoom {z} (effective {eff}) the full drawing traces no airway: the light drawing of a gesture has none either', what='light airways')
        c.js("() => { window.__aw = 0; return true }")
        c.js("() => { window.__mpMap.panBy([60, 40], { duration: 0 }); return true }")
        c.js("() => new Promise(r => { let n = 0; const f = () => { window.__mpMap.panBy([20, 10], { duration: 0 }); if (++n < 6) requestAnimationFrame(f); else r(true) }; f() })")
        c.wait(900)
        a = c.js("() => window.__aw")
        if want:
            c.ok(a > 0, f'{a} airway strokes during and after a move at zoom {z}', 'the airways are drawn while moving')
        else:
            c.eq(a, 0, f'no airway stroke while moving at zoom {z}', what='airway strokes')


def _long_flight():
    """KDEN → LEMO through the Atlantic (4 392 NM, the user's capture 101525): five points, level 350."""
    f = flight()
    pts = [('KDEN', 39.86, -104.67), ('CYMT', 50.2, -66.0), ('CYAY', 51.4, -56.1), ('4724N03258W', 47.4, -32.97), ('LEMO', 37.17, -5.62)]
    f['route'] = {'text': ' '.join(p[0] for p in pts), 'dep': 'KDEN', 'arr': 'LEMO', 'points': [{'id': i, 'lat': la, 'lon': lo} for i, la, lo in pts]}
    f['level'] = {'ft': 35000}
    return f


_MARKS_JS = """() => { const S = window.__mp.S, m = window.__mpMap, r = S.box.getBoundingClientRect(), inV = (S.marks || []).filter(k => { const p = m.project([k.lon, k.lat]); return p.x >= 0 && p.x <= r.width && p.y >= 0 && p.y <= r.height });
  return { step: S.marksStep, visible: inV.length, nm: inV.map(k => k.nm), ticks: (S.geo?.ticks || []).map(t => t.nm) } }"""


@case('D142', 'Distance marks have a round step that follows the length and the zoom (5, 10, 25, 50, 100, 250, 500 NM…), never more than a dozen on the screen, on the map and on the profile’s axis', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0177 (capture 101525, KDEN → LEMO 4 392 NM): the profile’s bottom axis was a band of unreadable markers every 50 NM and the map’s points were dense too; a round step chosen from the visible length (map: the route inside the view; profile: the window), 40 px at least between two, a dozen at most')
def d142(c):
    c.open('maps', docs=fdocs(_long_flight()), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.prof && !!window.__mp.S.geo", timeout=15000, what='the profile is drawn')
    c.wait(1500)
    r = c.js(_MARKS_JS)
    c.ok(0 < len(r['ticks']) <= 12 and all(n % 250 == 0 for n in r['ticks']), str(r), 'the profile’s axis: a dozen at most, round (a multiple of 250 NM) on 4 392 NM')
    c.ok(r['visible'] <= 12 and r['step'] >= 250, str(r), 'the map: a dozen marks at most on the whole route in view, at a round step')
    # closer: the step follows the zoom
    wide = r['step']
    c.js("() => { window.__mpMap.jumpTo({ center: [-60, 50.5], zoom: 5 }); return true }")
    c.wait(1800)
    r2 = c.js(_MARKS_JS)
    c.ok(r2['visible'] <= 12 and r2['step'] < wide, str(r2), f'closer (the step was {wide} NM): a smaller round step, still a dozen at most')
    c.ok(all(n % r2['step'] == 0 for n in r2['nm']), str(r2), 'the marks are multiples of the step')


_ROSE_JS = """([n, s, mv, big, px]) => {
  const cv = document.createElement('canvas'); cv.width = 500; cv.height = 500; const ctx = cv.getContext('2d'), log = { arcs: [], texts: [], rot: [], moves: 0 };
  const arc = ctx.arc.bind(ctx), ft = ctx.fillText.bind(ctx), rot = ctx.rotate.bind(ctx), mt = ctx.moveTo.bind(ctx);
  ctx.arc = (x, y, r, a, b) => { log.arcs.push(+r.toFixed(2)); return arc(x, y, r, a, b) }; ctx.fillText = (t, x, y) => { const m = ctx.getTransform(); (log.fs ||= []).push(parseFloat(String(ctx.font).match(/([0-9.]+)px/)?.[1])); log.texts.push(String(t)); (log.ang ||= []).push(Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI)); (log.pos ||= []).push([Math.round(m.e + m.a * x + m.c * y), Math.round(m.f + m.b * x + m.d * y)]); return ft(t, x, y) };
  ctx.rotate = a => { log.rot.push(+(a * 180 / Math.PI).toFixed(2)); return rot(a) }; ctx.moveTo = (x, y) => { log.moves++; return mt(x, y) };
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 500, 500); ctx.strokeStyle = '#d6173f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 330); ctx.lineTo(500, 190); ctx.stroke(); // a route beside it
  window.SiaAero.drawNavaid(ctx, n, { x: 250, y: 250 }, s, 0, mv, 3.2, false, px);
  if (big) log.png = cv.toDataURL('image/png'); return log }"""


_ROSE_GROUND_JS = """() => { const cv = document.createElement('canvas'); cv.width = 800; cv.height = 800; const ctx = cv.getContext('2d'), arcs = [];
  const arc = ctx.arc.bind(ctx); ctx.arc = (x, y, r, a, b) => { arcs.push([+x.toFixed(0), +y.toFixed(0), +r.toFixed(2)]); return arc(x, y, r, a, b) };
  const out = [];
  for (const pxDeg of [200, 400, 800]) { arcs.length = 0; const lat = 48, toC = (la, lo) => ({ x: 400 + (lo - 2) * pxDeg, y: 400 - (la - lat) * pxDeg / Math.cos(lat * Math.PI / 180) });
    window.SiaAero.drawPoints(ctx, { aerodromes: [{ icao: 'LFPO', lat: 48, lon: 2, magVar: 1 }], navaids: [{ id: 'PON', kind: 'VOR', lat: 48, lon: 2, name: 'PONTOISE', freq: '110.00' }], airways: [] }, toC,
      { W: 800, H: 800, scale: 1, pxPerDegree: pxDeg, navaids: true, aerodromes: false, rose: 3.2 });
    out.push([pxDeg, arcs.filter(a => a[2] > 10).map(a => a[2])]) }
  return out }"""


@case('D143', 'The VOR rose at a close zoom: one thin, large circle that is an object of the map (5 NM on the ground), graduations inwards every 10° (longer every 30°), the four numbers 0, 9, 18, 27 inside along the circle, a solid point inwards at the cardinal points, the arrow of magnetic north, turned to the station’s declination', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0175 reopened (the user, from the charts of Pontoise, Melun and Deauville: « pas d’angle sur les labels vor, sauf les 9 18 27 0, à l’intérieur »; ergonomics: he wanted a circle twice as LARGE, not two circles): one fine circle whose radius is on the ground (5 NM, it grows with the zoom, not a pictogram of fixed size), graduations inwards every 10° and longer every 30°, only 0, 9, 18, 27 inside along the circle (the 18 reads from the centre), a small solid point at the four cardinal points inwards and the magnetic north arrow from the station to the 0, turned to the declination (the station’s own, else the nearest point’s), no inner circle')
def d143(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    R = 100
    r = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC'}, 6, 12, True, R])
    big = sorted({a for a in r['arcs'] if a > 8})
    c.eq(big, [R], 'one circle, of the radius given (the ground radius)', what=str(r['arcs']))
    c.eq(r['texts'], ['0', '9', '18', '27'], 'the numbers 0, 9, 18, 27 and no other', what=str(r['texts']))
    c.ok(r['rot'] and abs(r['rot'][0] - 12) < .01, str(r['rot']), 'turned to the declination of the nearest point (12°) when the station carries none')
    r0 = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC', 'magVar': 0}, 6, 0, False, R])
    c.eq(r0['ang'], [0, 90, 180, -90], 'each number is written along the circle, the top of its signs outwards: 0° at the north, 90° (lying, the loop of the 9 outwards) at the east, 180° at the south, −90° at the west', what=str(r0['ang']))
    c.ok(abs(r0['pos'][1][0] - 250) > 60 and abs(r0['pos'][1][1] - 250) < 2 and r0['pos'][1][0] > 250 and r0['pos'][3][0] < 250, str(r0['pos']), 'the 9 is at the east and the 27 at the west, inside the circle')
    r2 = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC', 'magVar': -5}, 6, 12, False, R])
    c.ok(r2['rot'] and abs(r2['rot'][0] + 5) < .01, str(r2['rot']), 'the station’s own declination first (−5°)')
    rb = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC'}, 6, 0, False, 450])
    c.ok(rb['fs'] and max(rb['fs']) <= 15, str(rb['fs']), 'at a very close zoom (450 px of radius) the numbers stay a reading size, 15 px at most (SOG-0175: the 18 became huge)')
    r3 = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC'}, 6, 0, False, 30])
    c.eq(r3['texts'], [], 'a small rose (30 px) writes no number (they would not read)', what=str(r3['texts']))
    r4 = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC'}, 6, 0, False, 0])
    c.eq(sorted({a for a in r4['arcs'] if a > 8}), [round(6 * 3.2 * 2, 2)], 'without a ground radius, twice the old pictogram’s', what=str(r4['arcs']))
    # on the map: the radius is on the ground, 5 NM, and grows with the zoom
    g = c.js(_ROSE_GROUND_JS)
    want = lambda px: round(px / (60 * math.cos(math.radians(48))) * 5, 2)
    c.eq([[d, a[0] if a else None] for d, a in g], [[d, want(d)] for d in (200, 400, 800)], '5 NM on the ground at 200, 400 and 800 px per degree', what=str(g))
    (ROOT / 'tests/v3/shots').mkdir(exist_ok=True)
    import base64
    big_png = c.js(_ROSE_JS, [{'kind': 'VOR', 'id': 'ABC'}, 6, 12, True, 150])['png']
    (ROOT / 'tests/v3/shots/D143_rose.png').write_bytes(base64.b64decode(big_png.split(',')[1]))   # the rose beside a route: tests/v3/shots/D143_rose.png


_NAME_SPY_JS = """() => { window.__nm = []; window.__clip = 0; const f = CanvasRenderingContext2D.prototype.fillText, cl = CanvasRenderingContext2D.prototype.clip;
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (/11px sans-serif/.test(this.font)) { const m = this.getTransform(), p = m.transformPoint(new DOMPoint(x, y)); window.__nm.push({ t: String(t), x: p.x / (window.devicePixelRatio || 1), y: p.y / (window.devicePixelRatio || 1), w: this.measureText(t).width }) } return f.apply(this, arguments) };
  CanvasRenderingContext2D.prototype.clip = function () { if (arguments[0] === 'evenodd') window.__clip++; return cl.apply(this, arguments) }; return true }"""


@case('D144', 'Proposed routes never write over the flight’s route: a point the route already names is not named again, no name overlaps another, the strokes pass under the route’s labels', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0134 (ergonomics, capture of D140 at 390): the points of the chosen route were named in black over the violet names of the flight’s route (LFRS twice, AAA over LUGEN, the DCT dashes crossing NEPIX); in use the chosen route IS the flight’s route: a point already named by it (same identifier or same place) is not named again; the names go over the strokes with their halo; a name that does not fit without overlapping is not drawn')
def d144(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js(_NAME_SPY_JS)
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    doc = _alts_doc()
    a = doc['alternatives'][0]
    n = len(a['points'])
    a['ids'] = ['LFRS', 'LUGEN', 'NEPIX', 'LFML'][:n]
    a['via'] = ['', 'UN10', 'DCT'][:n - 1]
    a['layer'] = ['SID', 'LOW', ''][:n - 1]
    c.js(ev, doc)    # the chosen route is the flight’s route
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='the routes are drawn')
    c.wait(800)
    nm = c.js("() => window.__nm")
    ids = c.js("() => window.__mp.S.route.points.map(p => String(p.id).toUpperCase())")
    c.ok(not any(x['t'] in ids for x in nm), f'{[x["t"] for x in nm]} / {ids}', 'a point the flight’s route already names is not named again')
    c.ok(c.js("() => window.__clip") > 0, 'no clip', 'the strokes are cut under the route’s labels (nothing is crossed out)')
    rects = c.js("() => window.__mp.S.routeLabelRects")
    box = lambda x: (x['x'] - x['w'] / 2, x['y'] - 6, x['x'] + x['w'] / 2, x['y'] + 6)
    hit = lambda p, q: p[0] < q[2] and p[2] > q[0] and p[1] < q[3] and p[3] > q[1]
    bad = [x['t'] for x in nm if any(hit(box(x), (r['x0'], r['y0'], r['x1'], r['y1'])) for r in rects)]
    c.eq(bad, [], 'no name of the proposed routes overlaps a label of the flight’s route', what='overlaps')
    # a chosen route that is not the flight’s: its own points are named, still without overlapping anything
    b = doc['alternatives'][1]
    b['ids'] = ['LFRS', 'XA', 'XB', 'LFML']
    b['via'] = ['', 'T11', 'T11']
    b['layer'] = ['SID', 'LOW', 'LOW']
    doc['chosen'] = 1
    c.js("() => { window.__nm = []; return true }")
    c.js(ev, doc)
    c.until("() => window.__nm.some(x => x.t === 'XA' || x.t === 'XB')", timeout=8000, what='its own points (not on the flight’s route) are named')
    nm = c.js("() => window.__nm")
    rects = c.js("() => window.__mp.S.routeLabelRects")
    c.eq([x['t'] for x in nm if x['t'] in ('LFRS', 'LFML')], [], 'but the ends it shares with the flight’s route are not', what='shared ends')
    boxes = [box(x) for x in nm if x['t'] in ('XA', 'XB', 'T11')]
    c.ok(not any(hit(p, q) for i, p in enumerate(boxes) for q in boxes[i + 1:]), str(nm), 'no two names overlap')
    c.ok(not any(hit(p, (r['x0'], r['y0'], r['x1'], r['y1'])) for p in boxes for r in rects), str(nm), 'and none overlaps a label of the flight’s route')


@case('D145', 'The complexity cursor is in every view of the Map, a mission map included: it has its own setting (the flight’s is untouched), starts at the maximum (all that the view shows) and spares the view and the CPU when lowered', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0183 (regression of SOG-0137; the user: « le curseur a disparu, et on sait qu’il sert à épargner la vue et le cpu »): the complexity cursor is in the Layers tab of every view, a mission map too, at the same place; the view of the use picks the layers, the complexity keeps its setting over it (its own key on a mission map, maximum by default); the effective zoom follows it')
def d145(c):
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    c.tap('[data-mp="layers"]')
    c.until("() => { const e = document.querySelector('.mp-l-detail'); return !!e && e.getBoundingClientRect().height > 0 }", timeout=6000, what='the complexity cursor is shown in the Layers tab of a mission map')
    c.eq(c.js("() => document.querySelector('input[data-layer=detail]').value"), '4', 'it starts at the maximum on a mission map (all that the view shows)', what='value')
    c.eq(c.js("() => [document.querySelectorAll('.mp-layer-set:not([hidden])').length, !!document.querySelector('.mp-layer-corr[hidden]'), document.querySelectorAll('.mp-layers input[data-layer]:not([data-layer=detail])').length > 8]"), [1, True, True],
         'the boxes of the layers are there on a mission map as on a flight’s map (SOG-0185), but « around the flight only », which means nothing here', what='boxes')
    c.ok('T-0' not in c.js("() => document.querySelector('.f-sheet-title').textContent") and 'SAR1' not in c.js("() => document.querySelector('.f-sheet-title').textContent"), c.js("() => document.querySelector('.f-sheet-title').textContent"), 'the title of the Layers tab does not say the mission nor the provided map again (they are in the window)')
    wd = c.js("() => { const a = document.querySelector('.mp-l-detail').getBoundingClientRect(), b = document.querySelector('.mp-layers').getBoundingClientRect(); return [Math.round(a.width), Math.round(b.width), Math.round(a.top - b.top)] }")
    c.ok(wd[0] >= wd[1] - 2 and wd[2] < 8, str(wd), 'on a mission map the cursor is at the top of the content, on the whole width, as on a flight’s map (SOG-0183 refused: it had moved)')
    c.shot('D145_layers_mission_general.png')
    hook_map(c)
    c.wait(1200)
    e0 = c.js("() => +document.querySelector('[data-module=\"maps\"] .mp-map').dataset.zoomEff")
    c.js("() => { const r = document.querySelector('input[data-layer=detail]'); r.value = '-4'; r.dispatchEvent(new Event('input', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.layers && window.__mp.S.layers.mission && window.__mp.S.layers.mission.detail === -4", timeout=6000, what='the cursor acts: kept under the mission’s own key')
    c.wait(1200)
    e1 = c.js("() => +document.querySelector('[data-module=\"maps\"] .mp-map').dataset.zoomEff")
    c.ok(e0 - e1 > 6, f'effective zoom {e0} → {e1}', 'lowering it lowers the effective zoom (eight levels): fewer elements, a lighter drawing')
    c.eq(c.js("() => Object.keys(window.__mp.S.layers)"), ['mission'], 'the flight’s own setting is untouched', what='keys')
    c.shot('D145_layers_mission.png')


_FLICK_JS = """() => { const q = s => document.querySelector(s), t0 = performance.now(), log = { body: [], map: 0, node: null }, ms = () => Math.round(performance.now() - t0);
  const o = CanvasRenderingContext2D.prototype.clearRect; CanvasRenderingContext2D.prototype.clearRect = function () { if (this.canvas.classList.contains('mp-over')) { log.map++; (log.st ||= []).push([ms(), (new Error().stack || '').split(String.fromCharCode(10)).slice(2, 6).map(x => x.trim().replace('/modules/maps/', '').slice(-60)).join(' < ')]) } return o.apply(this, arguments) };
  new MutationObserver(m => { const s = q('.mp-dbody svg.mp-lv'); if (s && !log.node) log.node = s; log.body.push([ms(), m.length, s === log.node]) }).observe(q('.mp-dbody'), { childList: true, subtree: true });
  window.__fl = log; return true }"""


_LV_HEAD_JS = """() => { const q = s => document.querySelector(s), shown = e => !!e && !e.hidden && e.getBoundingClientRect().width > 0, seg = q('.mp-chips:not(.mp-chips-l)');
  const chips = [...document.querySelectorAll('.mp-chip[data-view]')].map(b => [b.dataset.view, b.getAttribute('aria-pressed'), shown(b)]);
  return { title: (q('.f-sheet-head .f-sheet-title') || {}).textContent, layers: q('[data-mp="layers"]').getAttribute('aria-pressed'), chips, close: shown(q('.f-sheet-close')), panel: window.__mp.S.dpanel } }"""


@case('D146', 'The sheet of a space opens in one drawing (its body is built once, with the size it keeps), and is a view of the profile: the profile chip is pressed, the title and the cross are the sheet’s, never under the Layers icon', 'D',
      tags=('maps', 'sheet'), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0185 (the user: « le clignotement au double clic sur un espace… la vue coupe clignote tant que la fenêtre n’a pas réduit au max… l’onglet couches sert à autre chose que choisir les éléments à afficher »): measured between the tap and the rest: the body of the sheet is built once and not replaced later (the same graph node), the map redrawn three times at most; the sheet of a space is a view of the profile tab (chip pressed, its title, its cross) and not of Layers; the chip of the profile closes it')
def d146(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'azba': True, 'act': 'AZBA', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'D', 'cls': '', 'name': '62', 'key': 'LFD62', 'lower': 'SFC', 'upper': 'FL195', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    for w, h, q in ((390, 844, 'maps'), (1280, 760, 'maps?pane=1')):
        c.page.set_viewport_size({'width': w, 'height': h})
        c.open(q, docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R'))", timeout=15000, what=f'the profile ({w} px)')
        c.wait(1500)
        c.js(_FLICK_JS)
        c.js("async () => { const S = window.__mp.S; (await import('/modules/maps/profile_view.js')).setCursor(S.prof.total * .33); window.__want = 'R'; return true }")
        c.wait(600)
        c.js("() => { window.__fl.map = 0; window.__fl.body = []; return true }")   # from the first tap
        _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && k.textContent.length > 20 }", f'the sheet of an R opens ({w} px)')
        c.wait(2200)
        fl = c.js("() => window.__fl")
        t0 = fl['body'][0][0] if fl['body'] else 0
        c.ok(fl['body'] and all(b[2] for b in fl['body']), str(fl), f'{w}: the graph of the sheet is built once: the same node from the first drawing to the rest (never replaced)')
        c.ok(fl['map'] <= 4, str(fl['map']), f'{w}: the map is redrawn four times at most between the tap and the rest')
        g = c.js(_LV_HEAD_JS)
        c.eq([g['panel'], g['layers']], ['lv', 'false'], f'{w}: the Layers icon is not the sheet’s: it is not pressed', what=str(g))
        c.ok(('profile', 'true', True) in [tuple(x) for x in g['chips']] and g['close'] and g['title'], str(g), f'{w}: the sheet is a view of the profile tab: its chip is pressed, its title and its cross are shown')
        c.eq([x[2] for x in g['chips'] if x[0] == 'weather'], [False], f'{w}: the weather chip gives its place to the title while the sheet is open', what=str(g['chips']))
        c.shot(f'D146_sheet_{w}.png')
        c.tap('.mp-chip[data-view="profile"]')
        c.until("() => window.__mp.S.dpanel === null", timeout=4000, what=f'{w}: the chip of the profile closes the sheet')
        c.until("() => { const b = document.querySelector('.mp-chip[data-view=weather]'); return !!b && !b.hidden && b.getBoundingClientRect().width > 0 }", timeout=4000, what=f'{w}: the weather chip is back')


_CONT_SPY_JS = """() => { window.__ct = []; const M = window.MapsContours, o = M.draw; if (!M.__spy) { M.__spy = true; M.draw = function (ctx, opt) { window.__ct.push({ minor: opt.minor, z: opt.pxPerDeg }); return o.apply(this, arguments) } } return true }"""


@case('D147', 'Contour lines in the VFR topo view: asked and drawn on a mission map of that view (they were only on flight maps), the master lines alone at a low complexity, the intermediate ones when closer; none in the IFR or base-only views', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0184 (regression from V2: « le vfr topo n’a pas de courbes de niveau ?? il avait ça en v2 »): in V2 the « topo » base was OpenTopoMap, whose tiles carry the contour lines; V3 replaced that base (host outside meta.net) and drew its own lines from the elevation tiles on flight maps only; a mission map in VFR topo now asks them (the Map’s own, from the Terrarium tiles), the master lines alone below one level and a half of zoom over their threshold (the Complexity cursor shifts it), then the intermediate ones; the IFR and base-only views have none')
def d147(c):
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    hook_map(c)
    c.js(_CONT_SPY_JS)
    c.js("() => { const r = window.__mp.S.layersEl.querySelector('input[data-layer=detail]'); r.value = '0'; r.dispatchEvent(new Event('input', { bubbles: true })); return true }")   # a middle complexity: the master lines alone far out
    c.js("() => { window.__mpMap.jumpTo({ center: [2.8, 45.6], zoom: 12 }); return true }")
    c.until("() => window.__ct.length > 0", timeout=8000, what='the contour lines are asked on a mission map in VFR topo at a working zoom')
    c.eq(c.js("() => window.__ct.at(-1).minor"), True, 'with their intermediate lines when close', what='minor close')
    c.js("() => { window.__ct = []; window.__mpMap.jumpTo({ center: [2.8, 45.6], zoom: 10 }); return true }")
    c.until("() => window.__ct.length > 0", timeout=8000, what='asked again further out')
    c.eq(c.js("() => window.__ct.at(-1).minor"), False, 'the master lines alone further out (the threshold of the layer, one level and a half before the intermediate ones)', what='minor far')
    c.js("() => { const s = document.querySelector('.mp-mb-theme'); s.value = 'ifr'; s.dispatchEvent(new Event('change', { bubbles: true })); window.__ct = []; window.__mpMap.jumpTo({ center: [2.8, 45.6], zoom: 11.6 }); return true }")
    c.wait(2500)
    c.eq(c.js("() => window.__ct.length"), 0, 'none in the IFR view', what='ifr calls')
    c.js("() => { const s = document.querySelector('.mp-mb-theme'); s.value = 'vfr'; s.dispatchEvent(new Event('change', { bubbles: true })); window.__mpMap.jumpTo({ center: [2.8, 45.6], zoom: 11.7 }); return true }")
    c.until("() => window.__ct.length > 0", timeout=8000, what='back in VFR topo: asked again')
    c.shot('D147_vfr_topo_390.png')


_DROP_JS = """async (p) => { const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onupgradeneeded = () => { const d = r.result; for (const [n, o] of [['docs', { keyPath: 'path' }], ['pending', { keyPath: 'path' }], ['meta', { keyPath: 'key' }], ['conflicts', { keyPath: 'id', autoIncrement: true }]]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, o) }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  if (db.objectStoreNames.contains('docs')) await new Promise(res => { const tx = db.transaction('docs', 'readwrite'); tx.objectStore('docs').delete(p); tx.oncomplete = res }); db.close(); return true }"""
_BANNER_JS = """() => { const b = document.querySelector('.mp-mbar'); return { exists: !!b, shown: !!b && !b.hidden && b.getBoundingClientRect().width > 0, text: b ? b.textContent.slice(0, 80) : '', wanted: window.__mp.S.missionWanted, id: window.__mp.S.missionId, opts: [...document.querySelectorAll('.mp-mbar select')].map(x => x.className) } }"""


@case('D148', 'The mission window on the map, whenever the mission is known: also when the list of the missions arrives after the Map is mounted (first load), in the double view as on the Map alone: its two choices, the provided map and the view', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0196 (the user, from « Préparer » beside Fuel: « la popup… qui a sauté »): the mission window (title, id, family, « Provided map », « View », its cross) sits at the top left of the map as soon as the flight names a mission the repository knows; a flight naming a mission that the list of the repository does not give yet (first load: the tree arrives after the mount) is taken up again when the list changes — the window appears without a reload; in the double view (pane) as on the Map alone')
def d148(c):
    for w, h, q in ((1280, 760, 'maps?pane=1'), (390, 844, 'maps')):
        c.page.set_viewport_size({'width': w, 'height': h})
        # the flight names a mission whose file is not in the repository yet
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_DROP_JS, MISSION_PATH)
        c.open(q, docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
        c.js(_STATE_JS)
        c.wait(2500)
        b = c.js(_BANNER_JS)
        c.eq([b['shown'], b['wanted']], [False, 'ESSAI1'], f'{w}: no window while the mission is unknown, the Map remembers it', what=str(b))
        # the list changes: the file arrives
        c.eq(c.js("() => window.__mp.S.missionWatch"), True, f'{w}: the Map watches the missions of the repository', what='watch')
        c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])   # the file arrives (the store would announce it through the watch; the retry is the watch’s callback)
        c.js("async () => { await (await import('/modules/maps/mission_view.js')).retryMission(); return true }")
        c.until("() => { const b = document.querySelector('.mp-mbar'); return !!b && !b.hidden && b.getBoundingClientRect().width > 0 }", timeout=10000, what=f'{w}: the window appears without a reload when the list of the missions changes')
        b = c.js(_BANNER_JS)
        c.ok('ESSAI1' in b['text'] and 'mp-mb-sel' in b['opts'] and 'mp-mb-theme' in b['opts'], str(b), f'{w}: the window carries the mission, the provided map and the view')
        c.shot(f'D148_window_{w}.png')
    # and a mission already in the list is shown at the mount (D123), the double view included
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?pane=1', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => { const b = document.querySelector('.mp-mbar'); return !!b && !b.hidden }", timeout=12000, what='the window at the mount in the double view')


@case('D149', 'One tab, one role: the Layers tab has the elements shown (complexity, « around the flight only », the boxes) and no choice of flight or mission; the mission window is the only place of the mission, its provided map and its view', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0185 (c), decided by the user’s capture of the mission window: the window over the map is the only place for the choice of the mission, of its provided map and of its view; the Layers tab loses « the choice of the flight / of the mission » and keeps what is shown; the modes panel does not change; the Layers button is « Layers » on a mission map too')
def d149(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.tap('[data-mp="layers"]')
    c.until("() => !!document.querySelector('.mp-layers')", timeout=6000, what='the Layers tab')
    c.eq(c.js("() => document.querySelectorAll('.mp-pick, .mp-mappick, .mp-picks').length"), 0, 'no choice of flight or mission in the Layers tab (flight map)', what='picks')
    c.eq(c.attr('[data-mp="layers"]', 'title'), row(c, 'layers'), 'the button is « Layers »', what='title')
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_cible.png')
    c.tap('[data-mp="layers"]')
    c.until("() => !!document.querySelector('.mp-l-detail')", timeout=6000, what='the Layers tab on a mission map')
    c.eq(c.js("() => document.querySelectorAll('.mp-pick, .mp-mappick, .mp-picks').length"), 0, 'no choice of flight or mission in the Layers tab (mission map)', what='picks')
    c.eq(c.attr('[data-mp="layers"]', 'title'), row(c, 'layers'), 'the button is « Layers » on a mission map too', what='title mission')
    c.eq(c.js("() => [...document.querySelectorAll('.mp-mbar select')].map(s => s.className)"), ['mp-mb-sel', 'mp-mb-theme'], 'the window of the mission carries the provided map and the view', what='window')
    c.shot('D149_layers_mission_390.png')


@case('D150', 'The map’s balloon goes when something else takes the place: a panel opens, the chip « i », the weather chip or the modes panel is touched, the pointer leaves the map', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0192 (the user: « si on affiche sur le « i » alors qu’un balloon help indique un espace aérien, le balloon reste »): a balloon of the map disappears as soon as a panel opens, a tab changes (profile, weather, « i »), the modes panel opens or the pointer leaves the map')
def d150(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S.prof", timeout=15000, what='the profile')
    show = "() => { const t = window.__mp.S.tipEl; t.textContent = 'TMA TEST'; t.hidden = false; return !t.hidden }"
    gone = "() => window.__mp.S.tipEl.hidden === true"
    c.js(show)
    c.tap('.mp-chip[data-legend]')
    c.until(gone, timeout=3000, what='the « i » chip: the balloon is gone')
    c.tap('.mp-chip[data-legend]')   # the legend closes again
    c.js(show)
    c.tap('[data-mp="layers"]')
    c.until(gone, timeout=3000, what='the Layers tab opens: the balloon is gone')
    c.tap('[data-mp="layers"]')
    c.js(show)
    c.tap('.mp-chip[data-view="weather"]')
    c.until(gone, timeout=3000, what='the weather chip: the balloon is gone')
    c.tap('.mp-chip[data-view="profile"]')
    c.js(show)
    c.tap('[data-mp="mode"]')
    c.until(gone, timeout=3000, what='the modes panel opens: the balloon is gone')
    c.tap('[data-mp="mode"]')
    c.js(show)
    c.wait(300)
    c.page.mouse.move(300, 300)
    c.page.mouse.move(2, 2)   # the pointer leaves the map (over the frame’s header)
    c.until(gone, timeout=3000, what='the pointer leaves the map: the balloon is gone')


_INK_JS = """() => { const c = window.__mp.S.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n }"""


@case('D151', '« New flight » empties the map at once: when the flight’s route becomes empty the traced route, the points, the names and the touch lists go (the layer is redrawn blank, never left as it was)', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0194 (Features SOG, capture of N14: the file of the flight is empty, the profile says « no flight », the route stays drawn on the map even 3 s later): draw() returned early without clearing the layer when the route had no point; a flight whose route becomes empty empties the map at the instant of the tap')
def d151(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.drawn", timeout=15000, what='the route is drawn')
    c.wait(800)
    c.ok(c.js(_INK_JS) > 500, str(c.js(_INK_JS)), 'the route and its names are drawn on the layer')
    # the flight becomes empty (what « New flight » writes): the layer is blank, the lists are empty
    c.js("""async () => { const S = window.__mp.S, f = await S.ctx.data.get(`pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`);
      await S.ctx.data.put(`pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, { ...f, route: { ...f.route, text: '', points: [], dep: '', arr: '', distanceNm: 0 }, profile: null, mission: null, updated_at: new Date(Date.now() + 60000).toISOString() }); return true }""")
    c.until("() => window.__mp.S.route.points.length === 0", timeout=8000, what='the Map has read the empty flight')
    c.until("() => (() => { const c = window.__mp.S.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return false; return true })()",
            timeout=4000, what='the layer is blank within 4 s of the empty flight')
    c.eq(c.js("() => [window.__mp.S.awHits.length, window.__mp.S.adHits.length, (window.__mp.S.altHits || []).length, !!window.__mp.S.lightSrc]"), [0, 0, 0, False], 'no touch list nor light drawing of the old route is kept', what='lists')
    c.shot('D151_empty_390.png')


_MVIEW_JS = """() => { const S = window.__mp.S, E = S.profile.elements || {}, m = S.map;
  return { theme: S.mtheme, id: S.profile.id, base: S.profile.base, hill: !!(m && m.getLayer('mp-hillshade')), aar: !!E.aarTracks, nat: !!E.natTracks, awl: !!E.airwaysLow, awh: !!E.airwaysHigh,
    contours: !!(S.profile.layers?.contours || E.vfrDensity), styles: (window.__styles || []).slice() } }"""


@case('D152', 'A mission map’s view does what its name says on every map (general, target), under any flight view: « VFR topo » = the topographic base (really swapped), relief and contours, no IFR objects (refuelling tracks, airways); « IFR » = the IFR base and its objects', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0171 reopened (« en vfr topo sur la vue générale, on a un fond IFR, des hippodromes de ravitaillement, et pas de courbes de niveau ; sur la vue régionale, idem pour les objets, mais sur un fond VFR, sans relief »): the base style follows the view (it stayed the one the map was born with), the VFR view has no refuelling tracks (the studio’s vfr-detail profile carries them, only the flight’s CAM mode lights them), and has the shaded relief')
def d152(c):
    for m in ('carte_generale.png', 'carte_cible.png'):
        _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=' + m, preset='cam')    # a military flight: the CAM view lights the refuelling tracks
        c.until("() => !!window.__mp.S.map && window.__mp.S.map.isStyleLoaded()", timeout=12000, what=f'{m}: the base map is loaded')
        c.js("() => { window.__styles = []; const m = window.__mp.S.map, o = m.setStyle.bind(m); m.setStyle = (s, ...a) => { window.__styles.push(String(s)); return o(s, ...a) }; return true }")
        pick = "(v) => { const s = document.querySelector('.mp-mb-theme'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); return true }"
        c.js(pick, 'ifr')    # whatever the map opened in, start from the IFR view: the next choice must swap the base
        c.until("() => window.__mp.S.mtheme === 'ifr' && !window.__mp.S.map.getLayer('mp-hillshade')", timeout=12000, what=f'{m}: IFR first')
        c.js("() => { window.__styles = []; return true }")
        c.js(pick, 'vfr')
        c.until("() => window.__mp.S.mtheme === 'vfr' && !!window.__mp.S.map.getLayer('mp-hillshade')", timeout=12000, what=f'{m}, VFR topo: the relief is laid')
        t = c.js(_MVIEW_JS)
        c.eq([t['base'], t['aar'], t['nat'], t['awl'], t['awh'], t['contours']], ['ofm-liberty', True, False, False, False, True], f'{m}, VFR topo: topographic base, contours; the refuelling tracks of a military mission stay (they belong to the mission, SOG-0184 d), no airway', what=str(t))
        c.ok(len(t['styles']) >= 1 and 'liberty' in t['styles'][-1], str(t['styles']), f'{m}, VFR topo: the MapLibre base was really swapped to the topographic style')
        c.js(pick, 'ifr')
        c.until("() => window.__mp.S.mtheme === 'ifr' && !window.__mp.S.map.getLayer('mp-hillshade')", timeout=12000, what=f'{m}, IFR: the relief is gone')
        t = c.js(_MVIEW_JS)
        c.eq([t['base'], t['hill'], t['awl']], ['positron', False, True], f'{m}, IFR: the IFR base and its airways, no relief', what=str(t))
        c.ok(len(t['styles']) >= 2 and 'liberty' not in t['styles'][-1], str(t['styles']), f'{m}, IFR: the base was swapped back')
        if m == 'carte_generale.png':
            # « Base only » is the base of the IFR view without any object; the boxes of the layers decide the objects, whatever the view
            c.js(pick, 'base')
            c.until("() => window.__mp.S.mtheme === 'base'", timeout=8000, what='base only')
            t = c.js(_MVIEW_JS)
            c.eq([t['base'], t['aar'], t['awl'], t['hill']], ['positron', False, False, False], 'Base only: the IFR view’s base, no object', what=str(t))
            c.js(pick, 'ifr')
            c.until("() => window.__mp.S.mtheme === 'ifr'", timeout=8000, what='IFR')
            c.tap('[data-mp="layers"]')
            c.until("() => window.__t.shown(document.querySelector('input[data-layer=aar]'))", timeout=6000, what='the box of the refuelling tracks')
            c.tap('input[data-layer="aar"]')
            c.until("() => window.__mp.S.profile.elements.aarTracks === false", timeout=6000, what='the box of the refuelling tracks acts on a mission map')
            c.tap('.f-sheet-close')
            c.js(pick, 'vfr')
            c.until("() => !!window.__mp.S.map.getLayer('mp-hillshade')", timeout=12000, what='relief again')
            c.shot('D152_vfr_general_390.png')


@case('D153', 'A flight that names a mission stays in the flight view of the Map (weather, procedures, Edition, Layers boxes, proposed routes), the mission over it: its zones, its points with a role, its window; the mission map is one tap away', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0193 L1 (V3 10.47: the user asked why a mission preparation has no weather, why a flight and a mission differ in the preparation): the Map no longer switches to the mission view for a flight that names a mission (it lost the weather, procedures, runways, ground, Edition, the Layers boxes, Fuel proposed routes); the mission is drawn over the flight view (zones in a light tint with their name, points with a role) and its window says the title, the id, the family and offers the mission map (#maps?mission=ID, the mission view kept for looking at a mission without a flight)')
def d153(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js("() => { window.__tx = []; const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { window.__tx.push(String(t)); return f.apply(this, arguments) }; return true }")
    c.until("() => !!document.querySelector('.mp-mbar') && !document.querySelector('.mp-mbar').hidden", timeout=15000, what='the mission window')
    c.js(_STATE_JS)
    c.eq(c.js("() => [window.__mp.S.missionId, window.__mp.S.missionAside]"), ['', 'ESSAI1'], 'the flight view, the mission aside', what='missionId, missionAside')
    # what the flight view has (it was lost in the mission view)
    c.until("() => [...document.querySelectorAll('.f-ov-right .f-ov-btn')].filter(b => window.__t.shown(b)).length >= 4", timeout=10000, what='the buttons of the flight view')
    c.ok(c.shown('[data-mp="mode"]') and c.shown('[data-mp="edit"]'), 'Mode / Edition missing', 'the buttons Mode and Edition of the flight view')
    c.ok(c.js("() => window.__mp.S.route.points.length") >= 2, 'no route', 'the flight own route, not the mission one')
    c.tap('[data-mp="layers"]')
    c.until("() => !!document.querySelector('.mp-layers')", timeout=6000, what='the Layers tab')
    c.eq(c.js("() => document.querySelectorAll('.mp-layer-set:not([hidden])').length"), 2, 'the boxes of the Layers tab are there (the flight view)', what='boxes')
    c.tap('.f-sheet-close')
    c.until("() => window.__mp.S.mission.zones.some(z => window.__tx.includes(z.name))", timeout=10000, what='a mission zone is drawn over the flight view, with its name')
    roles = c.js("() => window.__mp.S.missionPts.map(p => p.sub)")
    c.ok(len(roles) >= 3 and all(roles), str(roles), 'only the points with a role are drawn over (departure, arrival, target...)')
    c.ok(any(r in t for t in c.js("() => window.__tx") for r in roles), 'no role drawn', 'a point with a role is written with it')
    # the weather section exists for this flight (the user: no weather in a mission preparation)
    c.eq(c.js("() => !!window.__mp.S.ctx.weather && !!document.querySelector('.mp-chip[data-view=\"weather\"]')"), True, 'the weather tab of the Map is there', what='weather chip')
    t = c.js("() => document.querySelector('.mp-mbar').textContent")
    c.ok('ESSAI1' in t and 'ESSAI' in t.split('ESSAI1')[1], t, 'the window says the id and the family')
    c.eq(c.js("() => [...document.querySelectorAll('.mp-mbar select')].map(s => s.className)"), ['mp-mb-sel', 'mp-mb-theme'], 'and carries the provided map and the view lists (SOG-0196)', what='lists')
    c.shot('D153_flight_with_mission_390.png')


@case('D154', 'The Map never writes the flight without an Edition gesture: in the double view, no gesture for 20 s, with proposed routes arriving and the flight changed from outside, it makes no write of the flight', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0209 (the user: the synchronisation never stops, the flight file committed every 4 to 6 s): the Map writes the flight by one path only (Edition gesture, setRoute, only what it changed); no write at the mount, on a flight change from outside, on proposed routes, on a mission; a write whose only difference is updated_at is never made')
def d154(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('maps?pane=1', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!window.__mp.S.route && window.__mp.S.route.points.length >= 2 && !!window.__mp.S.ctx.data", timeout=20000, what='the flight is read')
    c.js("""() => { const S = window.__mp.S, d = S.ctx.data, o = d.put.bind(d); window.__puts = []; window.__ext = false;
      d.put = (path, ...a) => { if (!window.__ext) window.__puts.push(String(path)); return o(path, ...a) }; return true }""")
    hook_map(c)
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    c.js(ev, _alts_doc())                                           # proposed routes arrive
    c.until("() => (window.__mp.S.altHits || []).length >= 1", timeout=8000, what='the proposed routes are drawn')
    # the flight changes from outside (Fuel): only its updated_at, then its level
    c.js("""async () => { const S = window.__mp.S, path = S.ctx.data.constructor && `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`;
      window.__ext = true; const f = await S.ctx.data.get(path); await S.ctx.data.put(path, { ...f, updated_at: new Date(Date.now() + 60000).toISOString() }); window.__ext = false; return true }""")
    c.wait(20000)
    puts = c.js("() => window.__puts")
    c.eq([x for x in puts if 'current_flight' in x], [], 'no write of the flight by the Map in 20 s without a gesture', what=str(puts))


_AUTO_JS = """async (mode) => { const S = window.__mp.S, fx = await (await fetch('/tests/v3/fixtures/ground_LFPO.json')).json();
  window.__fg = []; window.__got = false;
  S.ctx.aerodb.ground = async icao => window.__got && icao === 'LFPO' ? fx : null;
  S.ctx.aerodb.groundStatus = async () => window.__busy ? { state: 'reading' } : mode === 'failed' && window.__tried ? { state: 'failed', reason: 'busy', message: 'Overpass busy' } : { state: 'none' };
  S.ctx.aerodb.fetchGround = async icao => { window.__fg.push(icao); window.__busy = true; await new Promise(r => setTimeout(r, 2500)); window.__busy = false; window.__tried = true; if (mode === 'failed') throw new Error('busy'); window.__got = true; return { ok: true } };
  return true }"""


@case('D155', 'The ground of a flight aerodrome that was never read is asked by the Map itself, once: « reading the ground… » then the drawing; a failure is said with its reason and « Try again », never replayed alone', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0203 (LFBD has no taxiway: its ground was never asked, procedures read before SOG-0135; state none, not a failure): the gesture lives where the need is seen: when the Map has to draw the ground of the departure, the arrival or the alternate and the state is none, it asks the reading (fetchGround) itself, once per aerodrome, with the state « reading » then the drawing; if the launcher says failed or reading it does not ask; a failure is told by the panel with « Try again »')
def d_auto(c):
    _ground_open(c, aerodb=False)
    c.js(_AUTO_JS, 'ok')
    _ground_at(c, 13, 1200)
    c.until("() => window.__fg.length === 1", timeout=8000, what='the Map asked the ground reading itself')
    c.eq(c.js("() => window.__mp.S.ground.st.get('LFPO')?.state"), 'reading', 'the state says « reading » while the file is read', what='state')
    c.until("() => (window.__mp.S.ground.hits || []).length > 50", timeout=12000, what='the ground is drawn once read')
    _ground_at(c, 14, 600)
    _ground_at(c, 13, 600)
    c.eq(c.js("() => window.__fg"), ['LFPO'], 'asked once, not at each drawing', what='calls')
    # a failure: said, not replayed
    _ground_open(c, aerodb=False)
    c.js(_AUTO_JS, 'failed')
    _ground_at(c, 13, 1200)
    c.until("() => window.__fg.length === 1", timeout=8000, what='the Map asked once')
    c.until("() => window.__mp.S.ground.st.get('LFPO')?.state === 'failed'", timeout=8000, what='the failure is kept with its reason')
    _ground_at(c, 14, 600)
    _ground_at(c, 13, 600)
    c.eq(c.js("() => window.__fg.length"), 1, 'the launcher said failed: the Map does not ask again by itself', what='calls after a failure')


@case('D156', 'Choosing a provided map frames that map, even after the user moved or resized the map: the camera kept by a gesture belongs to the map it was given on', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0184 (b) (the user: « le choix de la carte fournie est sans effet, à part un clignotement, si on a resize / déplacé la carte »): the camera kept after a gesture was keyed on the flight (empty on a mission map): it applied to every provided map of every mission; it is now keyed on the mission and the map')
def d_frame(c):
    _themed(c, '2_SAR', 'SAR1', 'maps?mission=SAR1&map=carte_generale.png')
    hook_map(c)
    c.until("() => !!window.__mpMap && window.__mp.S.map === window.__mpMap", timeout=12000, what='the base map')
    c.wait(800)
    # the user moves the map (a gesture), far from both maps
    c.js("() => { const S = window.__mp.S, m = window.__mpMap; S.gesture = true; m.jumpTo({ center: [10, 50], zoom: 6 }); return true }")
    c.wait(600)
    c.eq(c.js("() => window.__mp.S.map.getCenter().lng > 9"), True, 'the user’s gesture took the map away', what='moved')
    c.js("() => { const s = document.querySelector('.mp-mb-sel'); s.value = 'carte_cible.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => location.hash.includes('map=carte_cible.png')", timeout=6000, what='the other map is chosen')
    c.until("() => !!window.__mp.S && !!window.__mp.S.map && !!window.__mp.S.mapDef && window.__mp.S.mapDef.file === 'carte_cible.png'", timeout=15000, what='the other map is shown')
    c.wait(1200)
    d = c.js("() => { const S = window.__mp.S, m = S.map.getCenter(), f = S.fit; return { c: [m.lng, m.lat], fit: [(f.w + f.e) / 2, (f.s + f.n) / 2], z: S.map.getZoom() } }")
    c.ok(abs(d['c'][0] - d['fit'][0]) < 1.5 and abs(d['c'][1] - d['fit'][1]) < 1.5, str(d), 'the map is framed on the chosen provided map, not left where the user had moved it')


@case('D157', 'A provided map chosen in the window of a flight is shown in place, Fuel stays beside: the address does not change, the flight view and its route come back with « Flight », a live flight change does not take the place of the map', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0196 refused (the user: « sur la vue carburant, on n’a qu’un bouton « carte de la mission » qui renvoie vers les cartes »): in the double view the window of the mission keeps its two lists, « Provided map » (the flight first, then the maps) and « View »; choosing a map shows it on the spot, without a hash change that would leave Fuel')
def d_inplace(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('fuel?with=maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!document.querySelector('.mp-mbar .mp-mb-sel') && !document.querySelector('.mp-mbar').hidden", timeout=20000, what='the window of the mission beside Fuel')
    h0 = c.js("() => location.hash")
    c.ok(h0.startswith('#fuel'), h0, 'Fuel is the page, the Map its pane')
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = 'carte_cible.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === 'ESSAI1' && window.__mp.S.mapDef && window.__mp.S.mapDef.file === 'carte_cible.png'", timeout=10000, what='the provided map is shown in place')
    c.eq(c.js("() => location.hash"), h0, 'the address did not change: Fuel stays beside', what='hash')
    c.eq(c.js("() => !!document.querySelector('[data-module=fuel]') && window.__t.shown(document.querySelector('[data-module=fuel]'))"), True, 'Fuel is still shown', what='fuel')
    # the flight changes from outside (live): it does not take the place of the provided map
    c.js("""async () => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path); await S.ctx.data.put(path, { ...f, updated_at: new Date(Date.now() + 90000).toISOString() }); return true }""")
    c.wait(1500)
    c.eq(c.js("() => window.__mp.S.mapDef && window.__mp.S.mapDef.file"), 'carte_cible.png', 'a live flight change leaves the provided map', what='map after a flight change')
    c.shot('D157_inplace_1280.png')
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === '' && window.__mp.S.route.points.length >= 2", timeout=10000, what='the flight view is back')
    c.eq(c.js("() => location.hash"), h0, 'and still the same address', what='hash after')


@case('D158', 'No exception on the Map before its libraries are there, nor without a frame: a pointer moving over the plain box and a fit without extent do nothing', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='ergonomics, in the user’s Chrome: « ReferenceError: MapsRender is not defined » at each hover (tips.js tipAt, the plain box listens before the libraries are loaded) and « Cannot read properties of undefined (reading w) » at screen.js fitMap (S.fit undefined at the map’s load): both guarded; a map created by a mount that is no longer the current one is dropped')
def d_console(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    # the plain box, before the libraries: a hover must not throw
    c.js("""() => { const S = window.__mp.S, m = S.map, R = window.MapsRender; S.map = null; delete window.MapsRender;
      try { const r = S.box.getBoundingClientRect(); S.box.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: r.left + 50, clientY: r.top + 50, bubbles: true }));
        S.box.dispatchEvent(new MouseEvent('click', { clientX: r.left + 50, clientY: r.top + 50, bubbles: true })) } finally { S.map = m; window.MapsRender = R } return true }""")
    # a fit without extent
    c.js("async () => { const S = window.__mp.S, fit = S.fit; S.fit = undefined; try { (await import('/modules/maps/screen.js')).frameFlight(false) } finally { S.fit = fit } return true }")
    c.wait(300)


@case('D159', 'The proposed routes go when the flight’s route changes after they arrived (a route taken, the route edited, another flight): never a line left on the map without its row in Fuel’s list', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='ergonomics, in the user’s Chrome (SOG-0134): « un artefact de calcul a-b est resté » — a dark blue line of a past A → B computation stayed beside the chosen violet route while Fuel’s list was empty; the Map clears the layer as soon as the flight’s route differs from the one it was drawn for (a second of grace after the arrival)')
def d_stale(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?pane=1', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc())
    c.until("() => (window.__mp.S.altHits || []).length >= 1", timeout=8000, what='the proposed routes are drawn')
    c.wait(1800)    # past the second of grace
    c.js("""async () => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path);
      await S.ctx.data.put(path, { ...f, route: { ...f.route, text: String(f.route.text || '') + ' DCT' }, updated_at: new Date(Date.now() + 120000).toISOString() }); return true }""")
    c.until("() => (window.__mp.S.altHits || []).length === 0 && !window.__mp.S.alts", timeout=10000, what='the route changed: the proposed routes are gone from the map')


@case('D160', 'The names of the route’s points under the profile never pile up: at the right end of a tight route each name has its room or is left out, the arrival always kept', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='ergonomics, in the user’s Chrome: « au bout droit de l’axe du profil, les noms des derniers points se chevauchent (TURLU, DOLUR, LERAK, BALNI entassés) » — the two rows of the axis were not enough for four names close to the arrival and the third fell on the second; a name without room on either row is not drawn (as the distance marks), the departure and the arrival are kept')
def d_axis(c):
    f = flight()
    f['route']['points'][3:3] = [{'id': i, 'lat': la, 'lon': lo} for i, la, lo in (('TURLU', 43.66, 4.80), ('DOLUR', 43.62, 4.88), ('LERAK', 43.58, 4.96), ('BALNI', 43.54, 5.04))]
    f['route']['text'] = 'LFRS LUGEN NEPIX TURLU DOLUR LERAK BALNI LFML'
    c.open('maps', docs=fdocs(f), airfields=True, wait=False)
    c.js("() => { window.__nm = []; const o = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (/^(LFRS|LUGEN|NEPIX|TURLU|DOLUR|LERAK|BALNI|LFML)$/.test(String(t)) && /^bold/.test(this.font)) { const m = this.getTransform(); window.__nm.push({ t: String(t), x: m.a * x + m.e, y: m.d * y + m.f, w: this.measureText(String(t)).width * m.a }) } return o.apply(this, arguments) }; return true }")
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!window.__mp.S.prof", timeout=20000, what='the profile is drawn')
    c.wait(800)
    nm = c.js("() => { const last = {}; for (const n of window.__nm) last[n.t] = n; return Object.values(last) }")
    under = [n for n in nm if n['y'] > 0]
    c.ok(any(n['t'] == 'LFML' for n in under) and any(n['t'] == 'LFRS' for n in under), str([n['t'] for n in under]), 'the departure and the arrival are written')
    bad = [(a['t'], b['t']) for i, a in enumerate(under) for b in under[i + 1:] if abs(a['y'] - b['y']) < 6 and abs(a['x'] - b['x']) < (a['w'] + b['w']) / 2]
    c.eq(bad, [], 'no two names of the axis overlap', what=str([(n['t'], round(n['x']), round(n['y'])) for n in under]))


@case('D161', 'The alternate changed in Fuel is drawn by the Map beside it within the second: the dotted line goes to the new aerodrome', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0205 refused (« rien. cf. screenshot »: double view, the alternate changed EIDW to LFRN in Fuel, the Map kept the dotted line to EIDW): the signature of the route (flight_time.js sigOf) did not hold route.altn, so a write of the alternate alone was taken for « only the progress changed » and the flight was never read again')
def d_altn(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?pane=1', flight=True, airfields=True)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2 && !!window.__mp.S.route.altn", timeout=15000, what='the flight and its alternate are drawn')
    first = c.js("() => String(window.__mp.S.route.altn.id)")
    other = 'LFRS' if first != 'LFRS' else 'LFML'    # the aerodromes this bench knows: the route's ends and LFMT
    c.js("""async (a) => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path);
      await S.ctx.data.put(path, { ...f, route: { ...f.route, altn: a }, updated_at: new Date(Date.now() + 120000).toISOString() }); return true }""", other)
    c.until("(a) => window.__mp.S.route.altn && String(window.__mp.S.route.altn.id).toUpperCase() === a", other, timeout=2500, what='the Map draws the new alternate within the second')


@case('D162', 'The space chosen on the profile (its strip « name, limits, Sheet ») goes when another panel opens: the legend, the weather, the layers, the modes', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0192 refused (capture 160820: after a tap on a space, « R 205 /11 FL115|FL195 · Fiche » stayed over the legend panel): the chosen block and its strip belong to the profile; any other panel replaces them')
def d_sel(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'P', 'cls': '', 'name': '9', 'key': 'LFP9', 'lower': 'SFC', 'upper': 'FL115', 'src': 'sia', 'rings': [ring(44.6, 45.4, 1.9, 2.4)]}]
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R'))", timeout=15000, what='the profile crosses the R')
    c.wait(500)
    c.js("() => { window.__want = 'R'; return true }")
    chosen = "() => !!document.querySelector('.mp-spsel [data-spfiche]') && !document.querySelector('.mp-spsel').hidden"
    gone = "() => !window.__mp.S.selSpace && (!document.querySelector('.mp-spsel [data-spfiche]') || document.querySelector('.mp-spsel').hidden)"
    for what, tap, undo in (('the legend', '.mp-chip[data-legend]', '.mp-chip[data-legend]'), ('the weather chip', '.mp-chip[data-view="weather"]', '.mp-chip[data-view="profile"]'),
                            ('the Layers tab', '[data-mp="layers"]', '[data-mp="layers"]'), ('the modes panel', '[data-mp="mode"]', '[data-mp="mode"]')):
        _click_until(c, lambda: (lambda pt: (pt['x'], pt['y']))(c.js(_SPACE_CLICK_JS, 5000)), chosen, f'{what}: the block is chosen')
        c.tap(tap)
        c.until(gone, timeout=3000, what=f'{what} opens: the strip of the chosen space is gone')
        c.tap(undo)
        c.wait(300)


@case('D163', 'A gesture that changes the zoom does not show the airways of the last full drawing at the new zoom: zooming out from a close zoom, no low airway is stroked once the zoom has moved by a level', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0173 refused again (capture 155727: « comme si l’affichage du quart haut gauche avait un niveau de zoom différent »): the light drawing of a gesture repaints the lists of the last full drawing, traced at the thresholds of ITS zoom; pinching out from a close zoom showed the low airways at a wide zoom, over a base at the wide one; the light drawing now serves only within half a level of the zoom of the full drawing, the image copy alone beyond')
def d_zoomout(c):
    zones, segs = _awy_rows()
    c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, airways=segs, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.wait(1500)
    c.js(_PAN_SPY_JS)
    c.js("() => { window.__mpMap.jumpTo({ center: [1.5, 45], zoom: 8 }); return true }")
    c.wait(1800)    # the full drawing at rest, with its airways
    c.ok(c.js("() => window.__mp.S.lightSrc ? window.__mp.S.lightSrc.airways.length : -1") > 0, 'no airway at zoom 8', 'the full drawing at a close zoom has airways')
    c.js("() => { window.__aw = 0; return true }")
    # the gesture: zoom out from 8 to 3 in quick moves (no rest in between); the strokes counted per step: below the airways’ threshold none may be added by the light drawings
    got = c.js("""() => new Promise(r => { const m = window.__mpMap, out = []; let i = 0, z = 8; const step = () => { z -= .25; m.jumpTo({ zoom: z }); out.push([z, window.__aw]); if (++i < 20) setTimeout(step, 30); else r(out) }; step() })""")
    thr = c.js("() => { const S = window.__mp.S; return +document.querySelector('[data-module=\"maps\"] .mp-map').dataset.zoomEff }")
    below = [g for g in got if g[0] <= 4.25]
    c.ok(len(below) >= 5 and all(g[1] == below[0][1] for g in below), str(got), 'no airway segment is stroked by the light drawings once the zoom is well below the airways’ threshold')


@case('D164', 'After a second computation the Map follows in the second: the new proposed routes replace the old ones within a second, nothing of the first computation stays', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0134 refused (« après un second calcul la carte suit dans la seconde »; ergonomics: measure the delay): a second fuel-route-alts replaces the first; the Map has the new lines in its touch list and its image within a second of the event, the shown one of the first computation is released')
def d_second(c):
    import copy
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?pane=1', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    ev = "(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }"
    a = _alts_doc()
    c.js(ev, a)
    c.until("() => (window.__mp.S.altHits || []).length === 2", timeout=8000, what='the first computation is drawn')
    c.js("() => { window.__mp.S.altShow = 1; return true }")    # one of them was shown
    b = copy.deepcopy(a)
    third = copy.deepcopy(b['alternatives'][0])
    third['index'] = 2
    third['points'] = [[la + .15, lo + .15] for la, lo in third['points']]
    b['alternatives'].append(third)
    t = c.js("(d) => { const t0 = performance.now(); window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return new Promise(r => { const f = () => (window.__mp.S.altHits || []).length === 3 ? r(Math.round(performance.now() - t0)) : requestAnimationFrame(f); f() }) }", b)
    c.le(t, 1000, 'the second computation is on the map within a second of its event (measured %d ms)' % t, what='delay in ms')
    c.eq(c.js("() => window.__mp.S.altShow"), None, 'the route shown of the first computation is released', what='altShow')


@case('D165', 'Ground names: a taxiway has one name (the ways OpenStreetMap cuts it into do not each repeat it), the aprons (U, V, G, M…) are named from the names’ zoom, before the stands, the alternate’s ground is read too', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0195 + SOG-0135 (capture 150548: at LFPO « L3 » four times and « L4 » three times in the same place): names of the same taxiway are merged into one on its longest visible stretch; the aprons of AeroDB (kind apron: name, outline, centre) are named at zoom 15, before the stands (16): the controller says « taxi W47, LN, to stand M02 »; the departure, the arrival and the alternate are ground aerodromes')
def d_names(c):
    _ground_open(c)
    c.js("""async () => { const S = window.__mp.S, fx = await S.ctx.aerodb.ground('LFPO'), cnt = {}; for (const it of fx.items) if (it.kind === 'twy' && it.name) cnt[it.name] = (cnt[it.name] || 0) + 1;
      window.__multi = Object.entries(cnt).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 6);
      const items = fx.items.concat([{ id: 'ap-U', kind: 'apron', name: 'U', point: [2.3794, 48.7233], line: [[2.376, 48.7225], [2.383, 48.7225], [2.383, 48.7245], [2.376, 48.7245]] },
                                     { id: 'ap-V', kind: 'apron', name: 'V', point: [2.3858, 48.7263], line: [[2.383, 48.7255], [2.389, 48.7255], [2.389, 48.7272]] }]);
      S.ctx.aerodb.ground = async icao => icao === 'LFPO' ? { ...fx, items } : null; S.ground = null; window.__tx = [];
      const f = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t) { window.__tx.push(String(t)); return f.apply(this, arguments) }; return true }""")
    _ground_at(c, 15, 1800)
    c.js("() => { window.__tx = []; window.__mp.S.map.panBy([4, 4], { duration: 0 }); return true }")
    c.wait(1500)
    tx = c.js("() => window.__tx")
    multi = c.js("() => window.__multi")
    c.ok(len(multi) > 0, str(multi), 'the fixture has taxiways cut into several ways')
    draws = max(1, tx.count('U'))
    per = {m: tx.count(m) for m in multi}
    c.ok(all(v <= draws for v in per.values()), f'{per} for {draws} drawing(s)', 'a taxiway’s name is written once per drawing, not once per way')
    c.ok(tx.count('U') >= 1 and tx.count('V') >= 1, f'U x{tx.count("U")}, V x{tx.count("V")}', 'the aprons are named at zoom 15, before the stands')
    c.eq(c.js("async () => (await import('/modules/maps/ground.js')).groundIcaos().includes('LFMT')"), True, 'the alternate (LFMT) is a ground aerodrome', what='icaos')


@case('D166', 'Wind barbs: at most 80 in the view at any zoom, never closer than 30 px to each other (thinned when too many, completed between two read winds when too few)', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0214 (the user): « barbules : entre 40 et 80 à l’écran à tout zoom »; the list along the trajectory (one wind each 50 NM) gave a handful at a close zoom and a crowd at a wide one; it is thinned above 80 and completed with winds interpolated between two neighbours that were read (never across a place without wind) below 40; SOG-0243 (the ergonomist, on the capture of KDEN DCT LFST): on a route that fits one straight line sixty barbs overlap and hide the line: the count is a ceiling, two barbs are at least 30 px (a shaft) from each other')
def d_barbs(c):
    c.open('maps', flight=True, forecast=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js(_REDO_JS)
    c.until("() => (window.__mp.S.windHits || []).length > 0", timeout=15000, what='the barbs are there')
    seen = []
    for z in (4.5, 6, 7.5, 9, 10.5):
        c.js("(z) => { window.__mpMap.jumpTo({ center: [1.8, 45.2], zoom: z }); return true }", z)
        c.wait(1500)
        n = c.js("""() => { const S = window.__mp.S, r = S.box.getBoundingClientRect(), hs = (S.windHits || []).filter(h => h.x >= 0 && h.x <= r.width && h.y >= 0 && h.y <= r.height); let min = 1e9;
          hs.forEach((a, i) => hs.forEach((b, j) => { if (i < j) min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y)) })); return [hs.length, Math.round(min)] }""")
        seen.append((z, n[0], n[1]))
    ok = [(z, n, g) for z, n, g in seen if z >= 6 and z <= 9]
    c.ok(all(8 <= n <= 80 for z, n, g in ok), str(seen), 'barbs in the view at the working zooms, 80 at most (the route crosses the view)')
    c.ok(all(g >= 29.9 for z, n, g in seen), str(seen), 'no two barbs closer than 30 px, at any zoom')


@case('D167', 'One path for a direct leg, the rhumb line (constant heading, straight on the Mercator map): the distance marks are on the solid line (less than 2 px from it), the dotted great circle stays beside it as the comparison, on a direct route too; 5 to 12 marks in the view at any zoom, without a sudden jump', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0233 (the user, KDEN BGNN LFST): three paths on the map — the solid line straight on the Mercator map, a fine dotted great circle, and the marks « 1250, 1500… » beside the solid line; the marks were placed by linear interpolation of latitude and longitude (on neither the rhumb line nor the great circle); SOG-0243 (the user: « un direct se fait au compas »): the path of a direct leg is the RHUMB LINE, the straight line of the map, the marks are on it, the great circle stays the dotted comparison; the marks’ step is chosen on the length of the route that is really in the view (a long leg whose middle is outside it counted for nothing: 5 NM then 250 NM)')
def d_gcpath(c):
    f = flight()
    pts = [('KDEN', 39.8617, -104.6731), ('BGNN', 60.1394, -45.2331), ('LFST', 48.5383, 7.6282)]
    f['route'] = {'text': 'KDEN BGNN LFST', 'dep': 'KDEN', 'arr': 'LFST', 'points': [{'id': i, 'lat': la, 'lon': lo} for i, la, lo in pts]}
    f['level'] = {'ft': 35000}
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.wait(1500)
    probe = """([z, lat, lon]) => new Promise(r => { const S = window.__mp.S, m = window.__mpMap; const mid = window.MapsRender.rhumbAt(S.marksPts[0], S.marksPts[1], .85); m.jumpTo({ center: [mid.lon, mid.lat], zoom: z });
      setTimeout(() => { const box = S.box.getBoundingClientRect(), R = window.MapsRender, line = S.marksPts.map(p => m.project([p.lon, p.lat])),
        dist = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0; return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy) };
        const ms = (S.marks || []).map(k => m.project([k.lon, k.lat])), inV = ms.filter(q => q.x >= 0 && q.x <= box.width && q.y >= 0 && q.y <= box.height);
        let worst = 0; for (const q of ms) { let best = 1e9; for (let i = 1; i < line.length; i++) best = Math.min(best, dist(q, line[i - 1], line[i])); worst = Math.max(worst, best) }
        r({ n: inV.length, worst: Math.round(worst * 10) / 10, gc: !!S.gc, step: S.marksStep }) }, 1600) })"""
    seen = []
    for z in (2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8):
        r = c.js(probe, [z, 0, 0])
        seen.append((z, r['n'], r['worst'], r['step']))
    c.ok(all(w < 2 for z, n, w, s in seen), str(seen), 'every mark is less than 2 px from the line, at every zoom')
    c.ok(all(5 <= n <= 12 for z, n, w, s in seen if z >= 3.5), str(seen), '5 to 12 marks in the view at the working zooms, whatever the length of the leg that crosses it')
    c.eq(c.js("() => !!window.__mp.S.gc"), True, 'the great circle of the whole route (KDEN to LFST) is the dotted comparison', what='dotted')
    # a direct route (two points): the line is the rhumb line, the dotted great circle beside it shows the gap
    f2 = flight()
    f2['route'] = {'text': 'KDEN LFST', 'dep': 'KDEN', 'arr': 'LFST', 'points': [{'id': i, 'lat': la, 'lon': lo} for i, la, lo in (pts[0], pts[2])]}
    f2['level'] = {'ft': 35000}
    c.open('maps', docs=fdocs(f2), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.wait(2000)
    c.eq(c.js("() => !!window.__mp.S.gc"), True, 'a direct route has its dotted great circle beside its line: it shows the gap and helps to put intermediate points', what='dotted')
    c.shot('D167_gc_path_390.png')


@case('D168', 'At a wide zoom the aerodromes kept are the most important ones of any country: a field the base does not carry (the tower, in a foreign file) is not « no »', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0227 (the user: « à zoom arrière massif, on ne voit plus que les AD du SIA, y compris FMEE »): the rank of an aerodrome used `controlled` and `afis`, fields only the SIA files carry (the FAA, Canadian… files have none: the field is missing); a small French field with a tower (1 000 + 400 + a short runway) outranked KJFK (1 000 + a long runway); a missing field is unknown, the tower is then deduced from the runway (hard, 2 000 m and up)')
def d_adrank(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    r = c.js("""() => { const R = window.SiaAero.adRank, fr = { icao: 'LFXX', hardLen: 1200, controlled: true, public: true, runways: [{}] }, frNo = { icao: 'LFYY', hardLen: 1200, controlled: false, public: true, runways: [{}] },
      us = { icao: 'KJFK', hardLen: 4423, public: true, runways: [{}, {}, {}, {}] }, usSmall = { icao: 'KXYZ', hardLen: 900, public: true, runways: [{}] }, frBig = { icao: 'LFPG', hardLen: 4200, controlled: true, public: true, runways: [{}, {}, {}, {}] };
      return { fr: R(fr), frNo: R(frNo), us: R(us), usSmall: R(usSmall), frBig: R(frBig) } }""")
    c.ok(r['us'] > r['fr'], str(r), 'a large foreign airport (no tower field) outranks a small French field with a tower')
    c.ok(r['usSmall'] < r['fr'] and r['usSmall'] <= r['frNo'] + 1, str(r), 'a small foreign field does not outrank the French ones of the same size')
    c.ok(abs(r['us'] - r['frBig']) < 150, str(r), 'two large airports of two countries rank alike')


@case('D169', 'The ground panel says when the source does not name the taxiways: « n of m have no name in the source »', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0232 (« TWY : pas de labels sur LFST ? »): proc/ground/LFST.json (OpenStreetMap) carries 213 taxiway lines, 13 with a name; a map without names is not a defect of the Map: the panel says how many are unnamed')
def d_unnamed(c):
    _ground_open(c)
    c.js("""async () => { const S = window.__mp.S, fx = await S.ctx.aerodb.ground('LFPO'), items = fx.items.map((it, i) => it.kind === 'twy' && i % 2 ? { ...it, name: '' } : it);
      S.ctx.aerodb.ground = async icao => icao === 'LFPO' ? { ...fx, items } : null; S.ground = null; return true }""")
    _ground_at(c, 16, 1500, _PARK_AT)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => !!document.querySelector('.mp-gd-unnamed')", timeout=8000, what='the panel says some taxiways have no name')
    t = c.js("() => document.querySelector('.mp-gd-unnamed').textContent")
    c.ok(re.search(r'\d+', t) is not None and ('OpenStreetMap' in t), t, 'it says how many and that the source does not name them')


@case('D170', 'The sheet of a space in a pane of the width of a Map beside Fuel (about 500 px): the card is beside the stack, as from 440 px of body; under 440 px (a phone) it stays under', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0163 (the user: « dans le profil vertical »; ergonomics proposal: the threshold at 440 px instead of 600): beside Fuel the pane is about half a screen, the list of the spaces went under the stack; it is now to its right from 440 px, tight, on two lines per space')
def d_lvwide(c):
    ring = lambda la0, la1, lo0, lo1: [[la0, lo0], [la0, lo1], [la1, lo1], [la1, lo0], [la0, lo0]]
    zones = [{'type': 'R', 'cls': '', 'name': '61', 'key': 'LFR61', 'lower': 'SFC', 'upper': 'FL115', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]},
             {'type': 'D', 'cls': '', 'name': '62', 'key': 'LFD62', 'lower': 'SFC', 'upper': 'FL195', 'src': 'sia', 'rings': [ring(44.6, 45.4, 0.4, 1.2)]}]
    for w, beside in ((500, True), (420, False)):
        c.page.set_viewport_size({'width': w, 'height': 844})
        c.open('maps', docs=fdocs(_awy_flight()) + [['cache/maps/ui.json', {'preset': 'lowifr', 'layers': {}}, 'cache']], flight=False, airspaces=zones, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        c.until("() => !!(window.__mp.S && window.__mp.S.prof && window.__mp.S.prof.crossed.some(x => x.a.type === 'R'))", timeout=15000, what=f'{w}: the profile crosses the R')
        c.wait(900)
        c.js("async () => { const S = window.__mp.S; (await import('/modules/maps/profile_view.js')).setCursor(S.prof.total * .33); window.__want = 'R'; return true }")
        _open_space_from_profile(c, "() => { const k = document.querySelector('.mp-sp-card'); return !!k && !k.hidden && k.textContent.length > 20 }", f'the sheet of an R opens ({w} px)')
        c.wait(600)
        g = c.js(_STACK_JS)
        c.shot(f'D170_sheet_{w}_delivered.png')
        if beside:
            c.ok(g['card'][0] >= g['stack'][2] - 1, str(g), f'{w} px: the card is beside the stack')
        else:
            c.ok(g['card'][1] >= g['stack'][3] - 1, str(g), f'{w} px: the card is under the stack')


@case('D171', 'A doubtful approach chosen by hand is drawn dotted with its « to be checked » tag; a sure one is solid, without the tag', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0232 (the user, 10 Nov evening: « oui, ajouter les approches en doute, mais avec un panonceau »): Fuel lists a doubtful approach (status doubt, no name, NONAME) with its tag and never takes it by itself; once chosen the Map draws it dotted (like the missed approach) and its label carries the tag; frame/lib/procedures.js isDoubt is common to both')
def d_doubt(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    r = c.js("""async () => { const S = window.__mp.S, P = await import('/modules/maps/procs.js'), toC = (la, lo) => ({ x: lo * 100, y: -la * 100 }), cv = document.createElement('canvas').getContext('2d'), out = {};
      const run = rec => { S.route.path = [{ origin: 'route', id: 'LFRS', lat: 47.1, lon: -1.6 }, { origin: 'app', id: 'AAAAA', lat: 43.6, lon: 5.0 }, { origin: 'app', id: 'BBBBB', lat: 43.5, lon: 5.1 }, { origin: 'route', id: 'LFML', lat: 43.43, lon: 5.2 }];
        S.procs = { app: rec }; S.route.flight = { ...S.route.flight, route: { ...S.route.flight.route, procedures: { arr: { app: rec.id } } } };
        const L = P.layout(cv, toC, 300); return { dashed: L.segs.filter(s => s.o === 'app').map(s => !!s.dash), label: P.procLabel('APP', rec, rec.id) } };
      out.sure = run({ id: 'LFML.APP.ILS13', name: 'ILS 13', status: 'ok' });
      out.doubt = run({ id: 'LFML.APP.ILS13', name: 'ILS 13', status: 'doubt' });
      out.noname = run({ id: 'LFML.APP.NONAME.1', name: '', status: 'ok' });
      return out }""")
    c.ok(r['sure']['dashed'] and not any(r['sure']['dashed']) and 'vérifier' not in r['sure']['label'] and 'checked' not in r['sure']['label'], str(r['sure']), 'a sure approach: solid, no tag')
    c.ok(r['doubt']['dashed'] and all(r['doubt']['dashed']), str(r['doubt']), 'a doubtful approach: dotted')
    c.ok(any(w in r['doubt']['label'] for w in ('vérifier', 'checked', 'prüfen', 'verificar')), r['doubt']['label'], 'and its label carries the tag')
    c.ok(all(r['noname']['dashed']) and r['noname']['dashed'], str(r['noname']), 'a record without a name (NONAME) is doubtful too (the rule is common: isDoubt)')


@case('D172', 'A read that ends after the Map was remounted does not write into the new Map: the mission read, the mission’s load aside and the flight read each belong to the mount that started them', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='challenge à rebours (11 Nov, risk 1): the Map’s state S is one module variable replaced at each mount; the async functions tested `if (!S) return` after each wait, which is true for the NEXT mount too: a slow read (a cold repository tree, a launcher that answers late) finished into the new instance (its mission, its route, its profile) — « le vol d’avant dans la Carte d’après »; each function keeps its own S and leaves when it is no longer the current one')
def d_remount(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!window.__mp.S.route && window.__mp.S.route.points.length >= 2 && window.__mp.S.missionAside === 'ESSAI1' && !!window.__mp.S.mission", timeout=20000, what='the flight and its mission are there')
    r = c.js("""async () => { const st = window.__mp, S0 = st.S, mv = await import('/modules/maps/mission_view.js'), out = {};
      // 1. the mission read of a mount that is replaced meanwhile
      const orig = S0.ctx.data.read.bind(S0.ctx.data); let release = null;
      S0.ctx.data.read = (...a) => new Promise(r => { release = () => r(orig(...a)) });
      S0.mission = null;
      const p = mv.loadAside();
      await new Promise(r => setTimeout(r, 300));
      const N = { ...S0, mission: null, missionPts: null, missionError: '', missionAside: '' };   // the next mount
      st.setS(N);
      if (release) release();
      await p.catch(() => {});
      await new Promise(r => setTimeout(r, 300));
      out.mission = !!N.mission; out.pts = !!N.missionPts; out.same = st.S === N;
      st.setS(S0); S0.ctx.data.read = orig;
      return out }""")
    c.ok(r['same'] and not r['mission'] and not r['pts'], str(r), 'the read of the old mount did not write its mission into the new one')


@case('D173', 'A point the mission imposes (lock « mission ») is neither dragged nor removed in the Édition: its card says so, a drag leaves the route as it was, and the lock is kept in what the Map writes', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0193 L3 (user: « les points de rdv, source, cible, restent imposés sur la carte »; V3 § 10.47 c): Fuel writes lock « mission » and the mission’s name on the points the mission imposes; the Map’s Édition neither moves nor removes them, draws them as squares, and writes the route with the lock')
def d_locked(c):
    f = flight()
    f['route']['points'][2] = {'id': 'NEPIX', 'lat': 44.9, 'lon': 2.4, 'lock': 'mission', 'mission': 'RDV-1'}
    c.open('maps', docs=fdocs(f), flight=False)
    c.ready('maps', sheet=True)
    hook_map(c)
    c.js(_STATE_JS)
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit becomes pressed')
    a = xy(c, 44.9, 2.4)                                   # the imposed point
    mouse_drag(c, a, (a[0] + 45, a[1] + 35))
    c.wait(900)                                            # past the 400 ms of the write
    d = c.doc(PATH)
    c.ok(d['by'] == 'fuel' and d['route']['points'][2]['id'] == 'NEPIX', f"by {d['by']}, {d['route']['points'][2]}", 'the drag of an imposed point changes nothing')
    # its card: the word, no « Retirer »
    c.js("(p) => { const S = window.__mp.S; S.edit.tapGuard = 0; return true }")
    a = xy(c, 44.9, 2.4)
    c.page.mouse.click(*a)
    c.until("() => !window.__mp.S.cardEl.hidden", timeout=4000, what='the card of the imposed point')
    c.eq(c.js("() => !!window.__mp.S.cardEl.querySelector('[data-remove]')"), False, 'no « Remove » on an imposed point', what='remove button')
    card = norm(c.js("() => window.__mp.S.cardEl.textContent"))
    c.ok(norm(row(c, 'ptLocked')) in card, card, 'the card says the mission imposes the point')
    c.shot(f'D173_{c.design}_{c.lang}_delivered.png')
    # a free point is still removed, and the lock stays in what is written
    c.js("() => { window.__mp.S.cardEl.hidden = true; window.__mp.S.edit.tapGuard = 0; return true }")
    b = xy(c, 46.5833, -1.2)                               # LUGEN, the pilot’s
    c.page.mouse.click(*b)
    c.until("() => !!window.__mp.S.cardEl.querySelector('[data-remove]')", timeout=4000, what='the card of a free point has « Remove »')
    c.js("() => window.__mp.S.cardEl.querySelector('[data-remove]').click()")
    doc = c.until_doc(PATH, lambda d: d and d.get('by') == 'maps' and len(d['route']['points']) == 3, what='the free point removed, written', timeout=8000)
    p = doc['route']['points'][1]
    c.ok(p['id'] == 'NEPIX' and p.get('lock') == 'mission' and p.get('mission') == 'RDV-1', f'{p}', 'the imposed point is kept with its lock and its mission name')


@case('D174', 'Everything along a direct leg is on the same path, the rhumb line: the wind barbs and the distance marks are less than 2 px from the line at every zoom (KDEN → LFST direct, and with a point between), the great circle is dotted, the places where the wind is read and the profile’s samples are on the rhumb line', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0243 (the user, capture 091755: « conflit entre les barbules et le tracé; l’orthodromie est devenue la norme, ce n’est pas le cas; un direct se fait au compas »): SOG-0233 had put the line on the great circle (the wrong way) while the barbs, the places where the wind is read (modules/fuel/winds.js samples, shared by Fuel, the Weather module and the Map) and the profile were interpolated in degrees (neither path); the nominal path of a direct leg is the rhumb line, the straight line of the Mercator map; one function (frame/lib/geo.js rhumbAt) for the line, the marks, the places read, the barbs, the profile; the great circle is the dotted comparison')
def d_barbpath(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})   # wide enough for the straight line and the great circle to be in the same view
    pts = [('KDEN', 39.8617, -104.6731), ('BGNN', 60.1394, -45.2331), ('LFST', 48.5383, 7.6282)]
    probe = """([z, mid]) => new Promise(r => { const S = window.__mp.S, m = window.__mpMap; m.jumpTo({ center: [mid.lon, mid.lat], zoom: z });
      setTimeout(() => { const box = S.box.getBoundingClientRect(), R = window.MapsRender, line = S.marksPts.map(p => m.project([p.lon, p.lat])),
        dist = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0; return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy) };
        const ms = (S.marks || []).map(k => m.project([k.lon, k.lat])).filter(q => q.x >= 0 && q.x <= box.width && q.y >= 0 && q.y <= box.height);
        let wm = 0; for (const q of ms) { let best = 1e9; for (let i = 1; i < line.length; i++) best = Math.min(best, dist(q, line[i - 1], line[i])); wm = Math.max(wm, best) }
        const hs = (S.windHits || []).filter(h => h.x >= 0 && h.x <= box.width && h.y >= 0 && h.y <= box.height);
        let worst = 0; for (const h of hs) { let best = 1e9; for (let i = 1; i < line.length; i++) best = Math.min(best, dist({ x: h.x, y: h.y }, line[i - 1], line[i])); worst = Math.max(worst, best) }
        r({ n: hs.length, worst: Math.round(worst * 10) / 10, marks: ms.length, worstMark: Math.round(wm * 10) / 10 }) }, 1800) })"""
    for name, use in (('direct', (pts[0], pts[2])), ('with a point between', pts)):
        f = flight()
        wind = {'dirDeg': 270, 'kt': 60, 'tempC': -45, 'levelFt': 35000, 'at': '2026-11-11T10:00:00Z'}
        f['route'] = {'text': ' '.join(i for i, _, _ in use), 'dep': 'KDEN', 'arr': 'LFST',
                      'points': [{'id': i, 'lat': la, 'lon': lo, 'wind': dict(wind, kt=50 + 10 * k)} for k, (i, la, lo) in enumerate(use)]}
        f['level'] = {'ft': 35000}
        c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        hook_map(c)
        mid = c.js("() => { const S = window.__mp.S; return window.MapsRender.rhumbAt(S.marksPts[0], S.marksPts[1], .5) }")
        c.js("(mid) => { window.__mpMap.jumpTo({ center: [mid.lon, mid.lat], zoom: 4 }); return true }", mid)   # the first view of a 4 000 NM route is a world view: no barbs
        c.wait(2500)
        seen = []
        for z in (3, 3.5, 4, 5, 6, 8):
            r = c.js(probe, [z, mid])
            seen.append((z, r['n'], r['worst'], r['marks'], r['worstMark']))
        c.ok(all(n >= 4 for z, n, w, m, wm in seen if 3.5 <= z <= 6), f'{name}: {seen}', 'barbs are along the line in the view at the wide zooms (at 3 the view is a world view: no barbs)')
        c.ok(all(w < 2 and wm < 2 for z, n, w, m, wm in seen), f'{name}: {seen}', 'every barb and every distance mark is less than 2 px from the line, at every zoom')
        c.eq(c.js("() => !!window.__mp.S.gc"), True, f'{name}: the dotted great circle is there, the comparison', what='dotted')
        pr = c.js("""() => { const S = window.__mp.S, line = S.marksPts, smp = (S.prof && S.prof.samples) || [], psi = la => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)), X = p => [p.lon * Math.PI / 180, psi(p.lat)]; let worst = 0;
          for (const p of smp) { let best = 1e9; const q = X(p); for (let i = 1; i < line.length; i++) { const a = X(line[i - 1]), b = X(line[i]), dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy,
            t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2)) : 0; best = Math.min(best, Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy) * Math.cos(p.lat * Math.PI / 180) * 3440.065) } worst = Math.max(worst, best) }
          return { n: smp.length, worst: Math.round(worst * 10) / 10 } }""")
        c.ok(pr['n'] >= 100 and pr['worst'] < 12, f'{name}: {pr}', 'the profile (relief, spaces crossed, TOC / TOD, cursor) is sampled on the rhumb line of the route')
        if len(use) == 2:   # the distance is the quote’s (Fuel counts each direct leg by compass: Q-0019, 4 849 NM), not the great circle’s 4 401
            tot = c.js("() => window.__mp.S.prof.total / 1852")
            c.ok(abs(tot - 4848.5) < 1.5 and abs(c.js("() => window.MapsRender.distances(window.__mp.S.marksPts).pop()") - 4848.5) < 1.5, f'{tot:.1f} NM', 'the profile and the marks count the direct leg along the rhumb line: 4 849 NM, as the quote')
        c.js("([z, mid]) => { window.__mpMap.jumpTo({ center: [mid.lon, mid.lat + 4], zoom: z }); return true }", [3.5, mid])   # the dotted great circle, north of the line, is in the capture
        c.wait(1800)
        c.shot(f'D174_{c.design}_{"direct" if len(use) == 2 else "via"}_delivered.png')
    # the places where the wind is read (Fuel, the Weather module and the Map share them): on the great circle of the leg
    far = c.js("""async () => { const WD = await import('/modules/fuel/winds.js'), a = { lat: 39.8617, lon: -104.6731 }, b = { lat: 48.5383, lon: 7.6282 },
      psi = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)), s = WD.samples([a, b]); let worst = 0;
      for (const p of s) { const t = (psi(p.lat) - psi(a.lat)) / (psi(b.lat) - psi(a.lat)), x = a.lon + (b.lon - a.lon) * t; worst = Math.max(worst, Math.abs(p.lon - x) * Math.cos(p.lat * Math.PI / 180) * 60) }
      return { n: s.length, worst: Math.round(worst * 10) / 10 } }""")
    c.ok(far['n'] >= 10 and far['worst'] < 1, f'{far}', 'the places where the wind is read are on the rhumb line (the line in degrees was up to 90 NM from it)')


@case('D175', 'Wind barbs on a route that is one straight line: never closer than 30 px to each other, never on a distance mark or its label (the labels read 1000, 1500…), at 1 280 and 390 px', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0243 (the ergonomist, on the capture of KDEN DCT LFST at 1 280): the labels of the distance marks were hidden by the barbs (« \'00 », « \'50 » instead of 1000, 1500) and sixty barbs on one straight line overlapped, their shafts and flags hiding the line; the barbs are put before the labels and skip a mark or its label, two barbs are at least 30 px from each other (the count, 40 to 80 of SOG-0214, is a ceiling)')
def d_barbgap(c):
    pts = [('KDEN', 39.8617, -104.6731), ('LFST', 48.5383, 7.6282)]
    wind = {'dirDeg': 270, 'kt': 60, 'tempC': -45, 'levelFt': 35000, 'at': '2026-11-11T10:00:00Z'}
    f = flight()
    f['route'] = {'text': 'KDEN LFST', 'dep': 'KDEN', 'arr': 'LFST', 'points': [{'id': i, 'lat': la, 'lon': lo, 'wind': dict(wind, kt=50 + 10 * k)} for k, (i, la, lo) in enumerate(pts)]}
    f['level'] = {'ft': 35000}
    for w, h in ((1280, 760), (390, 844)):
        c.page.set_viewport_size({'width': w, 'height': h})
        c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        hook_map(c)
        mid = c.js("() => { const S = window.__mp.S; return window.MapsRender.rhumbAt(S.marksPts[0], S.marksPts[1], .5) }")
        c.js("""() => { window.__ord = []; if (!CanvasRenderingContext2D.prototype.__ordHook) { const f = CanvasRenderingContext2D.prototype.fillText, s = CanvasRenderingContext2D.prototype.stroke;
          CanvasRenderingContext2D.prototype.fillText = function (t) { window.__ord.push(['t', String(t)]); return f.apply(this, arguments) };
          CanvasRenderingContext2D.prototype.stroke = function () { window.__ord.push(['s', this.lineWidth]); return s.apply(this, arguments) }; CanvasRenderingContext2D.prototype.__ordHook = true } return true }""")
        for z in (3.5, 4, 5, 6):
            c.js("([z, mid]) => { window.__ord = []; window.__mpMap.jumpTo({ center: [mid.lon, mid.lat], zoom: z }); return true }", [z, mid])
            c.wait(1800)
            r = c.js("""() => { const S = window.__mp.S, box = S.box.getBoundingClientRect(), hs = (S.windHits || []).filter(h => h.x >= 0 && h.x <= box.width && h.y >= 0 && h.y <= box.height), m = window.__mpMap;
              let min = 1e9; hs.forEach((a, i) => hs.forEach((b, j) => { if (i < j) min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y)) }));
              const marks = (S.marks || []).map(k => m.project([k.lon, k.lat])).filter(q => q.x >= 0 && q.x <= box.width && q.y >= 0 && q.y <= box.height);
              // no barb anchor on a distance mark’s point
              const on = hs.filter(h => marks.some(q => Math.hypot(q.x - h.x, q.y - h.y) < 7)).length;
              // the labels of the marks (« 500 », « 1000 »…) are written after the last barb stroke of the drawing, with their halo
              const o = window.__ord, lastBarb = o.map((e, i) => e[0] === 's' && (Math.abs(e[1] - 1.8) < .01 || e[1] === 5) ? i : -1).reduce((a, b) => Math.max(a, b), -1),
                lastLabel = o.map((e, i) => e[0] === 't' && /^[0-9]{3,4}$/.test(e[1]) ? i : -1).reduce((a, b) => Math.max(a, b), -1);
              return { n: hs.length, min: Math.round(min), on, marks: marks.length, lastBarb, lastLabel } }""")
            c.ok(r['n'] >= 3 and (r['n'] < 2 or r['min'] >= 29.9), f'{w} px, zoom {z}: {r}', 'barbs are in the view and none is closer than 30 px to another')
            c.eq(r['on'], 0, f'{w} px, zoom {z}: no barb on a distance mark', what=str(r))
            c.ok(r['marks'] == 0 or (r['lastLabel'] > r['lastBarb'] >= 0), f'{w} px, zoom {z}: {r}', 'the labels of the marks are written after the barbs')
        c.js("([z, mid]) => { window.__mpMap.jumpTo({ center: [mid.lon, mid.lat + 4], zoom: z }); return true }", [3.5, mid])
        c.wait(1800)
        c.shot(f'D175_{c.design}_{w}_delivered.png')


@case('D176', 'Wind barbs follow the route leg by leg: on LFPO → … via MOPAR KOLIV VEPET PETAX the barbs between the two read winds on either side of VEPET go through VEPET (less than 2 px from the line), never straight across the elbow', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0243 refused (the user, 11 Nov 22:19, LFPO → SFD via MOPAR KOLIV VEPET PETAX computed by the IFPS calculator: « barbules mal ficelées »): the winds Fuel wrote were on KOLIV and PETAX only (none on VEPET); the barbs between two read winds that are neighbours in the list were interpolated along the straight chord KOLIV → PETAX, ignoring VEPET and the elbow; they follow the drawn line now (the route as the line draws it, leg by leg) and are not invented between two places that are not on it')
def d_barbelbow(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    pts = [('LFPO', 48.7233, 2.3794, True), ('MOPAR', 48.95, 2.72, True), ('KOLIV', 49.55, 2.40, True), ('VEPET', 50.30, 2.55, False), ('PETAX', 50.75, 1.35, True), ('EGKB', 51.33, 0.03, True)]
    wind = {'dirDeg': 333, 'kt': 38, 'tempC': -20, 'levelFt': 17000, 'at': '2026-11-11T21:57:00Z'}
    f = flight()
    f['route'] = {'text': 'LFPO MOPAR KOLIV VEPET PETAX EGKB', 'dep': 'LFPO', 'arr': 'EGKB',
                  'points': [{'id': i, 'lat': la, 'lon': lo, **({'wind': wind} if w else {})} for i, la, lo, w in pts]}
    f['level'] = {'ft': 17000}
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    for z in (7, 8, 9):
        c.js("([z]) => { window.__mpMap.jumpTo({ center: [2.55, 50.2], zoom: z }); return true }", [z])
        c.wait(1800)
        r = c.js("""() => { const S = window.__mp.S, m = window.__mpMap, box = S.box.getBoundingClientRect(), line = S.marksPts.map(p => m.project([p.lon, p.lat])),
          dist = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0; return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy) };
          const hs = (S.windHits || []).filter(h => h.x >= 0 && h.x <= box.width && h.y >= 0 && h.y <= box.height), v = line[3];
          let worst = 0; for (const h of hs) { let best = 1e9; for (let i = 1; i < line.length; i++) best = Math.min(best, dist({ x: h.x, y: h.y }, line[i - 1], line[i])); worst = Math.max(worst, best) }
          return { n: hs.length, worst: Math.round(worst * 10) / 10, nearVepet: hs.filter(h => Math.hypot(h.x - v.x, h.y - v.y) < 90).length } }""")
        c.ok(r['n'] >= 3, f'zoom {z}: {r}', 'barbs are in the view')
        c.ok(r['worst'] < 2, f'zoom {z}: {r}', 'every barb is less than 2 px from the line (the route, leg by leg, through VEPET)')
    c.shot(f'D176_{c.design}_delivered.png')


@case('D177', 'A route taken makes the other proposals go at once, on the Map too: the list and the pale lines vanish without a change of screen (in the double view as in a Map alone), « Choose » is always on the list (grey until a route is shown), an empty publication clears everything', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0224 refused (the user, 11 Nov 22:21: « toujours pas. il faut switcher d’écran pour faire disparaître le choix, et en vue carte, toujours la popup même après le choix »; his functional reminder: « clic sur le bouton choix : valider l’itinéraire, modifier la route, et faire disparaître les alternatives »): Fuel publishes `alternatives: []` as soon as a route is taken; the Map clears its layer and its list at once, and does not wait for it when the choice is made from the Map itself')
def d_altsgone(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    # the double view: the choice is made, the traces go at once
    c.open('maps?pane=1', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc())
    c.until("() => (window.__mp.S.altHits || []).length >= 1", timeout=8000, what='the proposed routes are drawn')
    c.js("async () => (await import('/modules/maps/alts.js')).altsPick(1)")
    c.until("() => !window.__mp.S.alts && (window.__mp.S.altHits || []).length === 0", timeout=4000, what='the choice is made: the proposals are gone from the Map at once')
    # a Map alone: « Choose » is on the list from the start, grey; an empty publication clears the list and the lines
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc())
    c.until("() => !!document.querySelector('.mp-alts [data-alttake]')", timeout=6000, what='« Choose » is on the list before any route is shown')
    c.eq(c.js("() => document.querySelector('.mp-alts [data-alttake]').disabled"), False, '« Choose » is active from the opening: the first route is the current choice (SOG-0224)', what='disabled')
    c.tap('.mp-alts .mp-al-row[data-alt="1"]')
    c.until("() => !document.querySelector('.mp-alts [data-alttake]').disabled", timeout=4000, what='« Choose » is on once a route is shown')
    c.shot(f'D177_{c.design}_delivered.png')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc(alternatives=[], chosen=None))
    c.until("() => !window.__mp.S.alts && (window.__mp.S.altHits || []).length === 0 && document.querySelector('.mp-alts').hidden", timeout=4000, what='an empty publication: no list, no pale line')


@case('D178', 'Taxiway names as signs: one black sign with yellow letters (the aerodrome’s colour code, SOG-0297) per taxiway, never two of the same name within 140 px, only the long taxiways when zoomed out, none below the names’ zoom; the sign covers a road name under it', 'D',
      tags=('maps',), designs=('standard',), night=False,
      rule='SOG-0252 (the user, « TWY : illisible… fusionner les points au même endroit s’ils sont identiques », two Navigraph captures as the target: black signs with yellow letters on the taxiway, once per taxiway, fewer when zoomed out, none further out; ours: tiny grey letters on the line, twice a few metres apart (« B », « P4 »), a road name more readable than a taxiway’s): a sign per taxiway in the design’s colours (its ink as the ground, its paper as the letters), the long ones first, the names that repeat within 140 px merged, a taxiway shorter on the screen than its sign has none')
def d_signs(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    _ground_open(c)
    c.js("""() => { window.__ct = []; const f = CanvasRenderingContext2D.prototype.fillText, r = CanvasRenderingContext2D.prototype.fillRect;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { if (window.__sg) { window.__sg = false; window.__ct.push({ t: String(t), x, y }) } return f.apply(this, arguments) };
      CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (h === 16 && w > 12 && w < 80 && this.fillStyle === '#000000') { window.__rc = (window.__rc || 0) + 1; window.__sg = true } return r.apply(this, arguments) }; return true }""")
    seen = {}
    for z in (12, 13, 15, 16):
        _ground_at(c, z, 900)
        c.js("() => { window.__ct = []; window.__rc = 0; window.__mp.S.map.panBy([3, 3], { duration: 0 }); return true }")
        c.wait(1500)
        ct = c.js("() => ({ ct: window.__ct, rc: window.__rc })")
        names = list({(x['t'], round(x['x'] / 12), round(x['y'] / 12)): x for x in ct['ct']}.values())      # the same sign drawn again (a few pixels away: the pan) by another drawing of the frame is not a second sign
        dup = sum(1 for i, a in enumerate(names) for b in names[i + 1:] if a['t'] == b['t'] and ((a['x'] - b['x']) ** 2 + (a['y'] - b['y']) ** 2) ** .5 < 140)
        seen[z] = (len({(x['t'], round(x['x']), round(x['y'])) for x in names}), ct['rc'], dup)
    c.eq(seen[12][0], 0, 'no sign below the names’ zoom (13, the zoom of the lines, SOG-0297)', what=str(seen))
    c.ok(seen[13][0] >= 3 and seen[15][0] >= 3 and seen[16][0] >= 3, str(seen), 'signs from 13 (with the lines), at 15 and at 16')
    c.ok(seen[13][1] >= 3 and seen[15][1] >= 3 and seen[16][1] >= 3, str(seen), 'each one is a sign (a filled box of the design’s ink behind the letters)')
    c.ok(all(v[2] == 0 for v in seen.values()), str(seen), 'no two signs of the same name within 140 px')
    c.shot('D178_{}_1280_delivered.png'.format('standard'))
    c.page.set_viewport_size({'width': 390, 'height': 844})
    c.wait(600)
    _ground_at(c, 16, 900)
    c.wait(1200)
    c.shot('D178_{}_390_delivered.png'.format('standard'))


@case('D179', 'A provided map chosen in the window of the mission beside Fuel appears at once, even when the repository reads are slow: the mission already read is not read again', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0196 refused (the user, 11 Nov 20:17: « elle est très lente à apparaître dans la fenêtre carburant, même pas sûr qu’elle apparaisse tant qu’on n’a pas switché et retour vers carburant »): choosing a provided map read the registry of the repository and the mission file again (wait: true), after the window had read them; on a slow reading the map came late or seemed not to come; it uses the mission already read now')
def d_slowprov(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('fuel?with=maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!document.querySelector('.mp-mbar .mp-mb-sel') && !document.querySelector('.mp-mbar').hidden", timeout=20000, what='the window of the mission beside Fuel')
    # the repository is slow from now on: three seconds for each read of the registry or of a file
    c.js("""() => { const d = window.__mp.S.ctx.data, read = d.read.bind(d), list = d.list.bind(d); d.read = async (...a) => { await new Promise(r => setTimeout(r, 3000)); return read(...a) };
      d.list = async (...a) => { await new Promise(r => setTimeout(r, 3000)); return list(...a) }; return true }""")
    t0 = time.time()
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = 'carte_cible.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === 'ESSAI1' && window.__mp.S.mapDef && window.__mp.S.mapDef.file === 'carte_cible.png'", timeout=2000, what='the provided map is shown within two seconds although each read takes three')
    c.ok(time.time() - t0 < 2.2, f'{time.time() - t0:.1f} s', 'the map is there without waiting for the slow repository')


@case('D180', 'The Map leaves the mission when the flight no longer names it (« New flight », another writer): the window and the mission’s objects go', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0251 (the user: « si on a démarré la préparation d’une mission, et qu’on passe à « nouveau vol », la mission reste active; on ferme la croix de la mission (sur la carte), la croix disparaît, la mission reste toujours active »): Fuel writes the new flight without mission (N25); the Map’s mission view stayed; its cross wrote nothing and left the window as it was; the Map follows the flight and its cross writes mission: null, missionCategory: «», route.locks and the points’ lock / mission removed (N26 simulates it)')
def d_leave180(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    bare = """async () => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path), r = { ...(f.route || {}) };
      delete r.locks; r.points = (r.points || []).map(({ lock, mission, ...p }) => p);
      await S.ctx.data.put(path, { ...f, mission: null, missionCategory: '', route: r, by: 'fuel', updated_at: new Date(Math.max(Date.now(), Date.parse(f.updated_at) + 60000)).toISOString() }); return true }"""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('fuel?with=maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!document.querySelector('.mp-mbar .mp-mb-sel') && !document.querySelector('.mp-mbar').hidden", timeout=20000, what='the window of the mission beside Fuel')
    c.until("() => window.__mp.S.stops.length >= 4", timeout=20000, what='the Map is mounted (it follows the flight)')
    c.js(bare)
    c.until("() => document.querySelector('.mp-mbar').hidden && !window.__mp.S.missionAside && !window.__mp.S.mission && !(window.__mp.S.missionPts || []).length", timeout=10000, what='the flight names no mission: the window and the mission’s objects are gone')


@case('D183', 'The cross of the window of a flight leaves the mission for real: the flight is written without mission nor locks, the window goes', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0251 (the user: « si on a démarré la préparation d’une mission, et qu’on passe à « nouveau vol », la mission reste active; on ferme la croix de la mission (sur la carte), la croix disparaît, la mission reste toujours active »): Fuel writes the new flight without mission (N25); the Map’s mission view stayed; its cross wrote nothing and left the window as it was; the Map follows the flight and its cross writes mission: null, missionCategory: «», route.locks and the points’ lock / mission removed (N26 simulates it)')
def d_leave183(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    bare = """async () => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path), r = { ...(f.route || {}) };
      delete r.locks; r.points = (r.points || []).map(({ lock, mission, ...p }) => p);
      await S.ctx.data.put(path, { ...f, mission: null, missionCategory: '', route: r, by: 'fuel', updated_at: new Date(Math.max(Date.now(), Date.parse(f.updated_at) + 60000)).toISOString() }); return true }"""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('fuel?with=maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!document.querySelector('.mp-mbar .mp-mb-sel') && !document.querySelector('.mp-mbar').hidden", timeout=20000, what='the window of the mission beside Fuel')
    c.until("() => window.__mp.S.stops.length >= 4", timeout=20000, what='the Map is mounted (it follows the flight)')
    c.tap('.mp-mbar [data-mbx]')
    c.until("() => document.querySelector('.mp-mbar').hidden && !window.__mp.S.missionAside", timeout=10000, what='the window goes with the cross')
    doc = c.until_doc(PATH, lambda d: d and not d.get('mission') and not (d.get('route') or {}).get('locks'), what='the flight written without its mission and its locks', timeout=15000)
    c.ok(not doc.get('mission') and doc.get('missionCategory', '') == '' and not any(p.get('lock') or p.get('mission') for p in doc['route']['points']), str(doc.get('route', {}).get('points')), 'no mission, no category, no lock on the points')


@case('D184', 'A provided map shown in place: the flight losing its mission gives the flight view back', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0251 (the user: « si on a démarré la préparation d’une mission, et qu’on passe à « nouveau vol », la mission reste active; on ferme la croix de la mission (sur la carte), la croix disparaît, la mission reste toujours active »): Fuel writes the new flight without mission (N25); the Map’s mission view stayed; its cross wrote nothing and left the window as it was; the Map follows the flight and its cross writes mission: null, missionCategory: «», route.locks and the points’ lock / mission removed (N26 simulates it)')
def d_leave184(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    bare = """async () => { const S = window.__mp.S, path = `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`, f = await S.ctx.data.get(path), r = { ...(f.route || {}) };
      delete r.locks; r.points = (r.points || []).map(({ lock, mission, ...p }) => p);
      await S.ctx.data.put(path, { ...f, mission: null, missionCategory: '', route: r, by: 'fuel', updated_at: new Date(Math.max(Date.now(), Date.parse(f.updated_at) + 60000)).toISOString() }); return true }"""
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_RAW_JS, [MISSION_PATH, FIXTURE.read_text(encoding='utf-8')])
    c.open('fuel?with=maps', docs=fdocs(flight(mission='ESSAI1')), airfields=True, wait=False)
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && !!document.querySelector('.mp-mbar .mp-mb-sel') && !document.querySelector('.mp-mbar').hidden", timeout=20000, what='the window of the mission beside Fuel')
    c.until("() => window.__mp.S.stops.length >= 4", timeout=20000, what='the Map is mounted (it follows the flight)')
    c.js("() => { const s = document.querySelector('.mp-mbar .mp-mb-sel'); s.value = 'carte_cible.png'; s.dispatchEvent(new Event('change', { bubbles: true })); return true }")
    c.until("() => window.__mp.S.missionId === 'ESSAI1' && window.__mp.S.mapDef", timeout=10000, what='the provided map is shown in place')
    c.js(bare)
    c.until("() => window.__mp.S.missionId === '' && !window.__mp.S.missionAside && window.__mp.S.route.points.length >= 2 && document.querySelector('.mp-mbar').hidden", timeout=10000, what='the flight view is back, without the mission')
    c.shot('D184_standard_delivered.png')



@case('D181', 'The NAT layer says how long the tracks are valid and asks the launcher for them when they are out of date (once, no timer): the state is read when the layer is displayed, the notes say « valid until » or « out of date »', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0266 (the ergonomist; contract frame/aerodb/INTEGRATION.md, SOG-0263): the Map’s NAT layer calls AeroDb.natEnsure() when it is displayed and says the validity (natState()); out of date, the launcher of the workstation reads the tracks again, once; the tracks of the view are read again after a refresh that succeeded')
def d_nat(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { const A = window.__mp.S.ctx.aerodb; window.__nat = { state: 0, ensure: 0 }; const until = '2026-11-13T12:00:00.000Z';
      A.natState = async () => { window.__nat.state++; return { present: true, count: 4, validUntil: '2026-11-11T12:00:00.000Z', expired: true, current: 0 } };
      A.natEnsure = async () => { window.__nat.ensure++; return { present: true, count: 4, validUntil: until, expired: false, current: 4, refreshed: true, ok: true } }; return true }""")
    c.tap('[data-mp="layers"]')
    c.until("() => window.__t.shown(document.querySelector('.mp-dbody input[data-layer=nat]'))", timeout=8000, what='the Layers content has the NAT box')
    c.tap('.mp-dbody input[data-layer="nat"]')
    c.until("() => window.__nat.ensure >= 1", timeout=8000, what='the NAT layer displayed: the launcher is asked for the tracks')
    c.until("() => (window.__mp.S.natNote || '').length > 0", timeout=8000, what='the validity is said')
    note = norm(c.js("() => window.__mp.S.natNote"))
    c.ok('13/11 12:00Z' in note, note, 'the notes say the tracks are valid until their end, in the language of the run')
    c.eq(c.js("() => window.__nat.ensure"), 1, 'asked once', what='natEnsure calls')
    c.tap('.mp-dbody input[data-layer="nat"]')
    c.tap('.mp-dbody input[data-layer="nat"]')
    c.wait(800)
    c.eq(c.js("() => window.__nat.ensure"), 1, 'displayed again: not asked again in this mount', what='natEnsure calls after a second display')


@case('D182', 'Unticking « Around the flight only » reads the whole view, whatever its width up to 3 000 NM: the Complexity goes down at once to the step the width allows and says so, the user’s own setting wins, ticking again gives the earlier one back; only a world view forces the box, with its reason beside it; a view away from the flight is read', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0246 (the user: « en décochant la case, on diminue d’un coup la complexité; l’utilisateur peut la monter s’il le souhaite »; « le garde-fou 3000 nm, c’est en zoom out; je veux pouvoir zoomer les espaces australiens même si j’ai un vol en cours »): the box does what it says; the cost is set by the Complexity slider, lowered one step per doubling of the width past 300 NM (600 NM −1, 1 200 −2, 2 400 −3, beyond −4), never raised; ticking again restores the earlier step unless the slider was touched; a mission map keeps its own Complexity; the guard is the width of the displayed view only (3 000 NM), shown on the box, free again when zoomed in')
def d_corrbox(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    ui = ['cache/maps/ui.json', {'preset': 'auto', 'layers': {}}, 'cache']
    c.open('maps?view=-4,40,8,50', docs=fdocs(flight()) + [ui], flight=False, airfields=True, airspaces=[_FAR_TMA, _FAR_R], wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the first reading')
    c.js("async () => (await import('/modules/maps/layers.js')).toggleLayers(true)")
    c.until("() => window.__t.shown(document.querySelector('.mp-dbody input[data-layer=corridor]'))", timeout=8000, what='the Layers content')
    state = """async () => { const S = window.__mp.S, L = await import('/modules/maps/layers.js'), b = S.map.getBounds(), d = S.data && S.data.data;
      return { corridor: S.data ? S.data.corridor : null, detail: L.detailShift(), forced: !!S.corrForced, checked: document.querySelector('.mp-dbody input[data-layer=corridor]').checked,
        disabled: document.querySelector('.mp-dbody input[data-layer=corridor]').disabled, why: !document.querySelector('.mp-corr-why').hidden, note: !document.querySelector('.mp-cx-note').hidden,
        airspaces: d ? (d.airspaces || []).length : 0, w: Math.round((b.getEast() - b.getWest()) * 60 * Math.cos((b.getNorth() + b.getSouth()) / 2 * Math.PI / 180)) } }"""
    # a country-wide view (about 900 NM): unticked, the whole view is read and the Complexity goes down by two steps, said
    c.js("() => { window.__mpMap.fitBounds([[-4, 41], [8, 50]], { duration: 0, padding: 0 }); return true }")
    c.wait(1500)
    s0 = c.js(state)
    c.ok(s0['corridor'] > 0 and s0['detail'] == 0 and not s0['note'], str(s0), 'ticked by default: the corridor, the Complexity at 0')
    c.tap('.mp-dbody input[data-layer="corridor"]')
    c.until("() => window.__mp.S.data && window.__mp.S.data.corridor === 0", timeout=12000, what='unticked: the whole view is read')
    s1 = c.js(state)
    c.ok(s1['detail'] <= -2 and s1['note'], str(s1), 'the Complexity went down at once, and a line says so under the box')
    # the user raises the slider: it stays where he put it, the line goes; ticking again does not give the old one back
    c.js("() => { const r = document.querySelector('.mp-dbody input[data-layer=detail]'); r.value = '1'; r.dispatchEvent(new Event('input', { bubbles: true })); return true }")
    c.wait(600)
    s2 = c.js(state)
    c.ok(s2['detail'] == 1 and not s2['note'], str(s2), 'the slider the user touched stays where he put it, the line is gone')
    c.tap('.mp-dbody input[data-layer="corridor"]')
    c.wait(1200)
    s3 = c.js(state)
    c.eq(s3['detail'], 1, 'ticked again: the user’s own setting wins', what=str(s3))
    # untick then tick, the slider untouched: the earlier Complexity comes back
    c.tap('.mp-dbody input[data-layer="corridor"]')
    c.wait(1200)
    c.tap('.mp-dbody input[data-layer="corridor"]')
    c.wait(1200)
    s4 = c.js(state)
    c.eq(s4['detail'], 1, 'unticked then ticked with the slider untouched: the earlier step is back', what=str(s4))
    c.shot('D182_{}_{}_delivered.png'.format('standard', 'unticked'))
    # far from the flight (the fixture’s base has no Australia): a view of a few hundred NM on a space 100 NM from the route; unticked it is read, ticked it is not and the view says it is empty
    c.js("() => { window.__mpMap.jumpTo({ center: [0.6, 43.45], zoom: 6 }); return true }")
    c.wait(1500)
    sa = c.js(state)
    c.eq([sa['corridor'] > 0, sa['forced']], [True, False], 'ticked: around the flight only', what=str(sa))
    c.eq(c.js("() => ((window.__mp.S.data && window.__mp.S.data.data.airspaces) || []).some(a => a.name === 'R FARVILLE')"), False, 'ticked: nothing far from the flight is read', what='R FARVILLE')
    c.js("() => { window.__mpMap.jumpTo({ center: [40, 20], zoom: 6 }); return true }")   # nothing at all around the flight in this view
    c.until("() => !!window.__mp.S.corrEmpty", timeout=8000, what='the view says it is empty')
    c.js("() => { window.__mpMap.jumpTo({ center: [0.6, 43.45], zoom: 6 }); return true }")
    c.wait(1200)
    c.tap('.mp-dbody input[data-layer="corridor"]')
    c.until("() => window.__mp.S.data && window.__mp.S.data.corridor === 0 && (window.__mp.S.data.data.airspaces || []).some(a => a.name === 'R FARVILLE')", timeout=12000, what='unticked: the far space is read')
    sb = c.js(state)
    c.ok(not sb['forced'] and not sb['why'], str(sb), 'no mention of a guard on a view of a few hundred NM, wherever it is')
    # a world view: the box is forced, its reason beside it; zoomed in, it is free again
    c.js("() => { window.__mpMap.jumpTo({ center: [10, 40], zoom: 2.2 }); return true }")
    c.until("() => !!window.__mp.S.corrForced", timeout=10000, what='a view wider than 3 000 NM: the box is forced')
    sw = c.js(state)
    c.ok(sw['checked'] and sw['disabled'] and sw['why'] and sw['corridor'] > 0, str(sw), 'checked, grey and its reason written beside it')
    c.js("() => { window.__mpMap.jumpTo({ center: [0.6, 43.45], zoom: 6 }); return true }")
    c.until("() => !window.__mp.S.corrForced", timeout=10000, what='zoomed in: the box is free again')
    sf = c.js(state)
    c.ok(not sf['disabled'] and not sf['why'] and not sf['checked'], str(sf), 'free again, as the user left it (unticked), the reason gone')


@case('D185', 'Ground: a taxiway under the pointer is highlighted on the map and its row comes under the eyes in the list of the bottom panel; nothing under the pointer, nothing highlighted', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0254 (the user: « TWY : zone cliquable devrait se surligner au survol, et se positionner dans la liste (volet du bas) »): a hover on a taxiway (a stand, a hold) draws it wide and light under its line and marks its row in the ground list (data-hover), scrolled into view; the pointer leaving it clears both')
def d_gdhover(c):
    _ground_open(c)
    _ground_at(c, 16, 1500, _PARK_AT)
    c.js("async () => { const V = await import('/modules/maps/vfr.js'); V.pinAd({ icao: 'LFPO', name: 'LFPO TEST', lat: 48.7233, lon: 2.3794 }) }")
    c.until("() => !!document.querySelector('.mp-ad-ground')", timeout=8000, what='the aerodrome card offers the ground list')
    c.tap('.mp-ad-ground')
    c.until("() => window.__mp.S.dpanel === 'ground' && document.querySelectorAll('.mp-gd-row').length > 10", timeout=8000, what='the ground list is open')
    c.js("""() => { window.__w7 = 0; const o = CanvasRenderingContext2D.prototype.stroke; if (!o.__hv) { CanvasRenderingContext2D.prototype.stroke = function () { if (this.lineWidth === 5 && this.globalAlpha < .6) window.__w7++; return o.apply(this, arguments) }; CanvasRenderingContext2D.prototype.stroke.__hv = true } return true }""")
    pos = c.js("""() => { const g = window.__mp.S.ground, r = window.__mp.S.box.getBoundingClientRect(), h = g.hits.filter(x => x.pts && x.pts.length > 1 && x.grp.startsWith('g:twy:'))
      .map(x => ({ grp: x.grp, p: x.pts[Math.floor(x.pts.length / 2)] })).find(x => x.p.x > 20 && x.p.x < r.width - 20 && x.p.y > 20 && x.p.y < r.height - 20); return h && { grp: h.grp, x: h.p.x, y: h.p.y } }""")
    c.ok(pos is not None, str(pos), 'a taxiway is in the view')
    c.js("async ([x, y]) => { (await import('/modules/maps/tips.js')).hoverMap(x, y); return true }", [pos['x'], pos['y']])
    c.until("() => window.__mp.S.ground.hover", timeout=4000, what='the taxiway under the pointer is the hovered one')
    c.eq(c.js("() => window.__mp.S.ground.hover"), pos['grp'], 'the hovered element is the taxiway under the pointer', what='hover')
    row = c.js("(g) => { const b = document.querySelector(`.mp-gd-row[data-id=\"${CSS.escape(g)}\"]`); if (!b) return null; const r = b.getBoundingClientRect(), p = document.querySelector('.mp-dbody').getBoundingClientRect(); return { hover: b.dataset.hover, inView: r.bottom > p.top && r.top < p.bottom } }", pos['grp'])
    c.ok(row and row['hover'] == '1' and row['inView'], str(row), 'its row is marked in the list and in view')
    c.wait(500)
    c.ok(c.js("() => window.__w7") > 0, str(c.js("() => window.__w7")), 'the line is drawn wide and light on the map')
    c.shot('D185_{}_delivered.png'.format('standard'))
    c.js("async () => { (await import('/modules/maps/tips.js')).hoverMap(1, 1); return true }")
    c.until("() => !window.__mp.S.ground.hover", timeout=4000, what='nothing under the pointer: nothing highlighted')
    c.eq(c.js("() => document.querySelectorAll('.mp-gd-row[data-hover=\"1\"]').length"), 0, 'no row marked', what='rows')


@case('D186', 'The route: a direct leg (no airway) is dotted, a leg flown on an airway is solid with the airway’s name on a small sign at its middle', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0095 (roadmap of the Map, the user’s request of 1 Nov): « tronçon DCT en pointillé, un tronçon de voie aérienne en trait plein avec le cartouche de la voie »; the points of the flight carry `via` (the airway before the point, written by Fuel from the text); the legs between route points without it are direct; what comes from a procedure stays solid')
def d_dctline(c):
    f = flight()
    pts = f['route']['points']
    pts[2] = dict(pts[2], via='UN10')
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.js("""() => { window.__dt = { dash: 0, solid: 0, texts: [] }; const sd = CanvasRenderingContext2D.prototype.setLineDash, ft = CanvasRenderingContext2D.prototype.fillText;
      if (!sd.__dt) { CanvasRenderingContext2D.prototype.setLineDash = function (a) { if (a && a.length === 2 && a[0] >= 9 && a[1] >= 7) window.__dt.dash++; return sd.apply(this, arguments) }; CanvasRenderingContext2D.prototype.setLineDash.__dt = true;
        CanvasRenderingContext2D.prototype.fillText = function (t) { window.__dt.texts.push(String(t)); return ft.apply(this, arguments) } } return true }""")
    hook_map(c)
    c.js("() => { window.__dt = { dash: 0, texts: [] }; window.__mp.S.map.panBy([3, 3], { duration: 0 }); return true }")
    c.wait(1800)
    r = c.js("() => window.__dt")
    c.ok(r['dash'] >= 2, str(r['dash']), 'the direct legs (LFRS → LUGEN, NEPIX → LFML) are drawn dotted: a dash pattern is set for each, twice per drawing (the edge, then the line)')
    c.ok('UN10' in r['texts'], str(sorted(set(r['texts']))[:12]), 'the airway’s name is written on its leg')
    c.shot('D186_{}_delivered.png'.format('standard'))


@case('D187', 'Online controllers on the Map: nothing is read before the layer is on; then IVAO and VATSIM controllers are small tinted chips at their aerodrome (one tint per network), their hover says the position, the frequency and the network', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0094 (roadmap of the Map: « contrôleurs VATSIM et IVAO actifs sur la Carte, une teinte par réseau »): the public feeds (api.ivao.aero whazzup, data.vatsim.net) are already open to the frame; a controller whose callsign starts with a terrain’s code (LFML_TWR, LFML_ATIS, LFML_N_APP) is put at that terrain, D G T A i chips, blue for IVAO, orange for VATSIM; the layer is off by default and nothing is asked while it is off')
def d_atc(c):
    c.open('maps', flight=True, airfields=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("""() => { const S = window.__mp.S; window.__atc = { calls: [] }; const ok = j => ({ ok: true, headers: { get: () => null }, json: async () => j });
      S.ctx = { ...S.ctx, net: { ...S.ctx.net, fetch: async url => { window.__atc.calls.push(String(url));
        if (/ivao/.test(url)) return ok({ clients: { atcs: [{ callsign: 'LFML_TWR', atcSession: { frequency: 118.7 } }, { callsign: 'LFML_ATIS', atcSession: { frequency: 136.0 } }, { callsign: 'LFFF_CTR', atcSession: { frequency: 125.1 } }] } });
        return ok({ controllers: [{ callsign: 'LFML_N_APP', frequency: '119.250', facility: 5 }, { callsign: 'LFRS_TWR', frequency: '118.350', facility: 4 }], atis: [] }) } } }; return true }""")
    c.wait(6500)
    c.eq(c.js("() => window.__atc.calls.length"), 0, 'nothing is read while the layer is off', what='calls')
    c.tap('[data-mp="layers"]')
    c.until("() => window.__t.shown(document.querySelector('.mp-dbody input[data-layer=atc]'))", timeout=8000, what='the Layers content has the controllers box')
    c.tap('.mp-dbody input[data-layer="atc"]')
    c.until("() => (window.__mp.S.atc && window.__mp.S.atc.list.length) >= 4", timeout=12000, what='the two feeds are read: four controllers at aerodromes (the centre has no position)')
    c.eq(sorted(set(u.split('/')[2] for u in c.js("() => window.__atc.calls"))), ['api.ivao.aero', 'data.vatsim.net'], 'the two public feeds, no other host', what='hosts')
    c.js("""() => { window.__fc = new Set(); const r = CanvasRenderingContext2D.prototype.fillRect; CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) { if (w === 13 && h === 13) window.__fc.add(String(this.fillStyle)); return r.apply(this, arguments) }; return true }""")
    c.js("() => { window.__mpMap.jumpTo({ center: [5.215, 43.4367], zoom: 10 }); return true }")
    c.until("() => (window.__mp.S.atcHits || []).some(h => h.icao === 'LFML')", timeout=10000, what='the chips of LFML are drawn')
    h = c.js("() => { const q = window.__mp.S.atcHits.find(h => h.icao === 'LFML'); return { x: q.x + q.w / 2, y: q.y + q.h / 2, n: q.items.length, nets: [...new Set(q.items.map(i => i.net))].sort() } }")
    c.eq(h['nets'], ['ivao', 'vatsim'], 'LFML has controllers of both networks', what=str(h))
    # a TOUCH on the chips (a phone has no hover): the bubble says the positions, the frequencies and the networks; clicked again if a redraw moved the chip meanwhile
    chip = """() => { const S = window.__mp.S, q = (S.atcHits || []).find(h => h.icao === 'LFML'), r = S.box.getBoundingClientRect(); return q ? { x: r.left + q.x + q.w / 2, y: r.top + q.y + q.h / 2 } : { x: r.left + 5, y: r.top + 5 } }"""
    _click_until(c, lambda: (lambda pt: (pt['x'], pt['y']))(c.js(chip)), "() => { const t = window.__mp.S.tipEl; return !!t && !t.hidden && /LFML/.test(t.textContent) && /VATSIM/.test(t.textContent) && /IVAO/.test(t.textContent) && /118[.]700/.test(t.textContent) }", 'the touch on the chips opens the bubble: the positions, the frequencies and the networks')
    c.js("() => { window.__mp.S.map.panBy([2, 2], { duration: 0 }); return true }")
    c.wait(1200)
    cols = c.js("() => [...window.__fc]")
    c.ok(len(cols) == 2 and '#1f6fe0' in cols, str(cols), 'one tint per network (the design may deepen a tint for its contrast: two different ones)')
    c.shot('D187_{}_delivered.png'.format('standard'))


@case('D188', 'The time on station counted at a point (Fuel’s route.holds) is written after the point’s name on the route: « NEPIX · ⏱ 0:20 »', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='Features SOG 1a5409afe (CONCEPTION 11/11 § 1 bis): `route.holds` = { <point id>: { min, max, count, name } }, written by Fuel, read by the Map; the Map writes the minutes counted after the name of the point, in the route labels')
def d_holds(c):
    f = flight()
    f['route']['holds'] = {'NEPIX': {'min': 5, 'max': 40, 'count': 20, 'name': 'PT1'}}
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    c.js(_TEXTS_JS)
    hook_map(c)
    c.js("() => { window.__mpTexts = []; window.__mp.S.map.panBy([3, 3], { duration: 0 }); return true }")
    c.wait(1800)
    t = [norm(x) for x in c.js("window.__mpTexts || []")]
    c.ok(any(x.startswith('NEPIX (PT1)') and '⏱ 0:20' in x for x in t), str(sorted(set(t))[:14]), 'the label of NEPIX carries the mission’s name of the point and the time on station')
    c.shot('D188_{}_delivered.png'.format('standard'))


@case('D189', 'A turn of more than 90° of a procedure is an arc tangent to its two legs, the radius from the indicated speed (V / 62.8 NM, the point’s speed or the phase’s), shrunk to fit; a turn of 90° or less, the route and the missed approach keep their corner', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0093 (roadmap of the Map): « virages de plus de 90° des procédures tracés avec un rayon selon la vitesse indiquée »; roundTurns in procs.js on the legs of the layout: a fly-by arc between the tangent points, the corner replaced, never on the route, the missed approach, a dash or an arc already given')
def d_turns(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    r = c.js("""async () => { const P = await import('/modules/maps/procs.js'), toC = (la, lo) => ({ x: lo * 1000, y: -la * 1000 }),
      mk = (la, lo, kt) => ({ ...toC(la, lo), lat: la, lon: lo, src: { kt } }), A = mk(0, 0), V = mk(0, 0.2, 190), B = mk(0.1, 0.1);
      const hair = [{ a: A, b: V, o: 'sid', dash: false }, { a: V, b: B, o: 'sid', dash: false }];
      P.roundTurns(hair, toC);
      const V2 = mk(0, 0.2), C = mk(0.2, 0.3), right = [{ a: A, b: V2, o: 'sid', dash: false }, { a: V2, b: C, o: 'sid', dash: false }];
      P.roundTurns(right, toC);
      const route = [{ a: A, b: mk(0, 0.2), o: 'route', dash: false }, { a: mk(0, 0.2), b: mk(0.1, 0.1), o: 'route', dash: false }]; P.roundTurns(route, toC);
      const missed = [{ a: A, b: mk(0, 0.2), o: 'missed', dash: false }, { a: mk(0, 0.2), b: mk(0.1, 0.1), o: 'missed', dash: false }]; P.roundTurns(missed, toC);
      const arc = hair[1], g = hair.length === 3 ? hair[1] : null, ctr = g && g.arc.c, rr = g && Math.hypot(g.a.x - ctr.x, g.a.y - ctr.y), r2 = g && Math.hypot(g.b.x - ctr.x, g.b.y - ctr.y);
      return { hair: hair.length, rr: g && Math.round(rr * 10) / 10, same: g && Math.abs(rr - r2) < .01, turn: g && g.arc.turn, tangentLen: g && Math.round(Math.hypot(hair[0].b.x - 200, hair[0].b.y) * 10) / 10, small: right.length, route: route.length, missed: missed.length } }""")
    c.ok(r['hair'] == 3 and r['same'] and r['turn'] in ('L', 'R'), str(r), 'a hairpin (135°) is cut at its tangent points and joined by an arc')
    c.ok(r['rr'] > 3 and abs(r['tangentLen'] - r['rr'] * 2.414) < 1, str(r), 'the arc’s radius and the tangent length agree (t = r tan(δ/2)); the radius was shrunk to fit the legs')
    c.eq([r['small'], r['route'], r['missed']], [2, 2, 2], 'a turn under 90° (here 45°), the route and the missed approach keep their corner', what=str(r))


@case('D190', 'The arc points of an RF leg (arc: true, no id) carry the procedure’s line through all of them, and are neither dots, labels nor targets: the polyline is never a straight line across the arc', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='AeroDB (SOG-0248, RF legs: LFST RNP 05 / 23): a procedure’s points can now contain arc points { arc: true, id: null, leg: «RF», lat, lon }, twenty or more between the previous point and the RF end; the line goes through every positioned point in flight order (AeroDBProcedures.pathOf); nothing named, no label, no dot, no hover target on an arc point')
def d_arcpoints(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    r = c.js("""async () => { const S = window.__mp.S, P = await import('/modules/maps/procs.js'), toC = (la, lo) => ({ x: lo * 100, y: -la * 100 }), cv = document.createElement('canvas').getContext('2d');
      const arc = Array.from({ length: 22 }, (_, k) => ({ origin: 'app', arc: true, id: null, leg: 'RF', phase: 'main', lat: 43.60 + .004 * Math.sin(k / 21 * Math.PI) , lon: 5.00 + .01 * k }));
      S.route.path = [{ origin: 'route', id: 'LFRS', lat: 47.1, lon: -1.6 }, { origin: 'app', id: 'AAAAA', lat: 43.6, lon: 4.9, phase: 'main' }, ...arc, { origin: 'app', id: 'BBBBB', lat: 43.5, lon: 5.3, phase: 'main', leg: 'RF', center: 'CCCCC', radius: 3, nm: 5, turn: 'R' }, { origin: 'route', id: 'LFML', lat: 43.44, lon: 5.2 }];
      S.procs = { app: { id: 'LFML.APP.RNP13', name: 'RNP 13', status: 'ok' } }; S.route.flight = { ...S.route.flight, route: { ...S.route.flight.route, procedures: { arr: { app: 'LFML.APP.RNP13' } } } };
      const L = P.layout(cv, toC, 300), app = L.segs.filter(s => s.o === 'app'), ends = new Set(app.flatMap(s => [s.a, s.b].map(q => `${Math.round(q.x)}:${Math.round(q.y)}`)));
      const through = arc.every(a => ends.has(`${Math.round(a.lon * 100)}:${Math.round(-a.lat * 100)}`));
      return { segs: app.length, through, dots: L.dots.length, pts: L.pts.length, namedPts: L.pts.every(q => q.src && q.src.id), names: L.names.length } }""")
    c.ok(r['through'] and r['segs'] >= 23, str(r), 'the line goes through all twenty-two arc points (a segment between each pair)')
    c.ok(r['dots'] <= 3 and r['namedPts'], str(r), 'no dot and no label on an arc point: only the named fixes')


@case('D191', 'The contour lines’ unit follows the device’s display settings (cache/fuel/display.json), with the pilot’s fuel.json as the fallback on a device where Fuel has not run yet', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='Features SOG / V3 Frame (SOG-0279 (3)): displayAlt, displayDist, displaySpeed, displayUnit and wxRadiusNm move from pilot/<tri>/fuel.json to cache/fuel/display.json (a device setting, never sent); the Map reads displayAlt there for the contours’ equidistance; without it, fuel.json')
def d_displayalt(c):
    c.open('maps', flight=True, docs=[['cache/fuel/display.json', {'schema': 1, 'displayAlt': 'm', 'updated_at': '2026-11-12T10:00:00Z'}, 'cache']])
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && window.__mp.S.altUnit !== undefined", timeout=15000, what='the settings are read')
    c.eq(c.js("() => window.__mp.S.altUnit"), 'm', 'the device’s display document says metres', what='altUnit')
    c.open('maps', flight=True, docs=[[f'pilot/{TRI}/fuel.json', {'displayAlt': 'm'}, 'document']])
    c.js(_STATE_JS)
    c.until("() => !!window.__mp.S && window.__mp.S.altUnit !== undefined", timeout=15000, what='the settings are read')
    c.eq(c.js("() => window.__mp.S.altUnit"), 'm', 'no display document yet: fuel.json is the fallback', what='altUnit fallback')


@case('K209', 'Every V2 page has a link back to the V3 in its navigation, resolved from the page’s own depth: from three pages (two depths: apps/x and apps/x/y) it leads to the V3 frame', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0278 (the user: « on bascule en v3 par défaut; les pages v2 sont toutes accessibles de la v3 »; V3 Frame delivered the way V3 → V2, K208): the other way, an entry « Back to V3 » in shared/repository_nav.js (the V2 navigation), so every V2 page has it; the address is built from the root of the navigation script (never a host written in the code): frame/ at the root of the repository (the launcher), v3/frame/ on the published site where the V2 is at the root')
def d_v3return(c):
    for page in ('apps/aide/aide.html', 'apps/settings/profil.html', 'apps/cr/AIRBORNE/airborne_cr.html'):
        c.page.goto(c.base + '/' + page, wait_until='load')
        c.until("() => !!document.querySelector('[data-v3-return]')", timeout=15000, what=page + ': the navigation carries the link back to the V3')
        href = c.js("() => document.querySelector('[data-v3-return]').href")
        c.ok(href.startswith(c.base) and href.endswith('/frame/index.html'), href, page + ': the link points to the V3 frame from this depth')
        c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders (their own repositories) are not in the test tree: the V2 pages ask for their indexes
        st = c.js("async (h) => (await fetch(h, { method: 'HEAD' })).status", href)
        c.eq(st, 200, page + ': the address answers', what=href)
    # the published site: the V2 is at the root, the V3 under v3/ (no frame/ at the root): the same link, resolved to v3/frame/
    c.page.route('**/frame/manifest.webmanifest', lambda r: r.fulfill(status=404, body=''))
    c.page.goto(c.base + '/apps/aide/aide.html', wait_until='load')
    c.until("() => !!document.querySelector('[data-v3-return]') && /v3[/]frame[/]index[.]html$/.test(document.querySelector('[data-v3-return]').href)", timeout=15000, what='without frame/ at the root, the link goes to v3/frame/')
    c.shot('K209_standard_delivered.png')
    c.page.unroute('**/frame/manifest.webmanifest')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]


@case('D192', 'A point of the map has a « Direct to this point » button that only composes Fuel’s address (#fuel?direct=<ID>&lat=&lon=): on the card of a route point in Edit, on the card of a beacon or a fix; a name or a position that does not hold the contract has none', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0088 (direct to a point on the controller’s instruction; Features SOG’s address contract, the ergonomist’s go): `#fuel?direct=<ID>[&lat=<deg>&lon=<deg>]`, ID in capitals ^[A-Z0-9]{2,11}$ (encodeURIComponent), the position with five decimals at most; Fuel proposes the direct (Apply / Cancel) and writes nothing before; the Map never writes the flight for it; no button on a procedure point')
def d_direct(c):
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    r = c.js("""async () => { const T = await import('/modules/maps/tips.js');
      return { ok: T.directHtml('nepix', 44.9, 2.4), short: T.directHtml('X', 44.9, 2.4), long: T.directHtml('ABCDEFGHIJKL', 44.9, 2.4), bad: T.directHtml('NE PIX', 44.9, 2.4), nopos: T.directHtml('NEPIX', 'x', 2.4) } }""")
    c.ok('data-direct="NEPIX"' in r['ok'] and 'data-lat="44.90000"' in r['ok'] and 'data-lon="2.40000"' in r['ok'], str(r), 'the name in capitals and the position at five decimals')
    c.ok(r['short'] == '' and r['long'] == '' and r['bad'] == '', str(r), 'a name that does not hold ^[A-Z0-9]{2,11}$ has no button')
    c.ok('data-direct="NEPIX"' in r['nopos'] and 'data-lat' not in r['nopos'], str(r), 'without a usable position the address goes without it (Fuel takes the point of the remaining route)')
    # the card of a beacon or a fix touched on the map
    c.js("""() => { const S = window.__mp.S; S.navHits = [{ x: 140, y: 140, n: { id: 'NEPIX', kind: 'FIX', lat: 44.9, lon: 2.4, name: 'Test fix' }, merged: [] }]; return true }""")
    c.js("async () => { (await import('/modules/maps/tips.js')).tapAt(140, 140, 44.9, 2.4); return true }")
    c.until("() => !window.__mp.S.cardEl.hidden && !!window.__mp.S.cardEl.querySelector('[data-direct]')", timeout=5000, what='the card of the fix has the button')
    c.eq(norm(c.js("() => window.__mp.S.cardEl.querySelector('[data-direct]').textContent")), norm(row(c, 'directTo')), 'the button is named in the language of the run', what='label')
    c.shot('D192_{}_delivered.png'.format('standard'))
    # the card of a route point in Edit (not the departure nor the arrival): the same button
    c.js("() => { window.__mp.S.cardEl.hidden = true; return true }")
    c.tap('[data-mp="edit"]')
    c.until("document.querySelector('[data-mp=edit]').getAttribute('aria-pressed') === 'true'", what='Edit becomes pressed')
    a = xy(c, 44.9, 2.4)
    c.page.mouse.click(*a)
    c.until("() => !window.__mp.S.cardEl.hidden && !!window.__mp.S.cardEl.querySelector('[data-direct=\"NEPIX\"]')", timeout=6000, what='the card of the route point NEPIX has the button')
    # Fuel takes `direct`, `lat` and `lon` once and removes them from the address (replaceState, no hashchange): the addresses gone through are noted, not the last one
    c.js("() => { window.__hashes = []; addEventListener('hashchange', () => window.__hashes.push(location.hash)); return true }")
    c.tap('.mp-pcard [data-direct]')
    c.until("() => (window.__hashes || []).some(h => h.startsWith('#fuel?direct=NEPIX&lat=44.90000&lon=2.40000'))", timeout=8000, what='the click composes Fuel’s address and goes there')


@case('D193', 'The Map says once per publication that the proposed routes are DRAWN (window event maps-route-alts-drawn { at, n }), after the rendering, not at the put', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='Features SOG (SOG-0134, F157): Fuel measures the press, the launcher’s request, the answer, the list drawn, and listens for maps-route-alts-drawn for the last part « drawing on the Map »; the detail carries nothing else (no route, no position)')
def d_altsdrawn(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?pane=1', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    c.js("() => { window.__drawn = []; window.addEventListener('maps-route-alts-drawn', e => window.__drawn.push(e.detail)); return true }")
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc())
    c.until("() => window.__drawn.length >= 1", timeout=8000, what='the drawing is announced')
    c.js("() => { window.__mp.S.map.panBy([4, 4], { duration: 0 }); return true }")
    c.wait(1500)
    d = c.js("() => window.__drawn")
    c.eq(len(d), 1, 'once for the publication, not at each drawing', what=str(d))
    c.ok(sorted(d[0].keys()) == ['at', 'n'] and d[0]['n'] == 2 and d[0]['at'] > 0, str(d), 'the detail carries the time and the number of routes, nothing else')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc(updated_at='2026-11-09T16:41:00Z'))
    c.until("() => window.__drawn.length >= 2", timeout=8000, what='a new publication is announced again')

# The index of the V2 (IndexedDB « defaIndex », MissionIndex) of a bench: a registry line (T-085, its former number 85 in `formerId`) and an entry under the bare former number.
_FORMER_LINE = """(id, former, title) => ({ id, formerId: former, series: '', number: +former, type: 'AIRLIFT', family: 'T', subtype: '', title, folder: 'T_AIRLIFT/' + id,
  files: ['mission' + id + '.yaml'], source: 'dossier', status: 'generated', statusAt: '2026-10-20T10:00:00.000Z', notes: '', flownAt: '', addedAt: '2026-10-20T10:00:00.000Z',
  teamCount: 0, teamTypes: [], aircraftTypes: [], callsigns: [], rdv: 0, hasYaml: true })"""
_FORMER_OLD = """(id, title, status, notes, flownAt) => ({ id, formerId: '', series: '', number: +id, type: 'AIRLIFT', family: 'T', subtype: '', title, folder: '', files: [],
  source: 'collage', status, statusAt: '2026-10-01T10:00:00.000Z', notes, flownAt, addedAt: '2026-10-01T10:00:00.000Z', teamCount: 0, teamTypes: [], aircraftTypes: [], callsigns: [], rdv: 0 })"""
_FORMER_SEED_JS = "async (spec) => { const line = " + _FORMER_LINE + ", old = " + _FORMER_OLD + ";" + """
  await window.MissionIndex.ready;
  const make = s => { const b = Array.isArray(s) ? s : s.base, o = b.length === 3 ? line(...b) : old(...b); return Array.isArray(s) ? o : { ...o, ...s.set } };
  await window.MissionIndex.save(spec.map(make), new Date().toISOString());
  return window.MissionIndex.all().length }"""
_FORMER_STATE_JS = """async () => { await window.MissionIndex.ready; const R = window.MissionRegistry;
  return { index: window.MissionIndex.all().map(m => ({ id: m.id, by: m.supersededBy || '', status: m.status || '', notes: m.notes || '', flownAt: m.flownAt || '' })),
    shown: R.get().missions.filter(R.matches).map(m => m.id), note: (document.getElementById('rgFormer') || {}).textContent || '' } }"""


# the ledger of the reports of the bench: one report written under the number 89
_FORMER_LEDGER_JS = r"""() => { localStorage.setItem('missionCoreLedger:v2', JSON.stringify({ text: ['missions:', '  - family: AIRLIFT', '    metadata:', "      missionNumber: '89'", '      date: 2026-10-05', ''].join('\n') })); return true }"""


@case('K219', 'The registry of the V2 shows one mission under its lettered identifier when its index also holds the number it had before the renumbering: what was attached to the old number follows, an old entry carrying a field the line lacks is kept (and said), nothing else is purged', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0289 (the user: « 85 est doublon de T-085 … vérifier lequel est le plus complet, fusionner »; the ergonomist, 13 Nov): an index entry whose id is the formerId of a registry line, and that is not itself a line, is attached to that line; its status, notes and flight date follow; a field it has and the line lacks keeps it (hidden from the list, counted « n anciennes entrées gardées, plus complètes »); never a purge')
def k_former(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry", timeout=15000, what='the registry page and its index are loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")      # the Centre of the bench (the default password of the template)
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders (their own repositories) are not in the test tree
    # 1. the old entry has what the line lacks (the title): kept, hidden, said; its status, notes and flight date follow
    c.eq(c.js(_FORMER_SEED_JS, [['T-085', '85', ''], ['85', 'Bench airlift', 'planned', 'bench note', '2026-10-01']]), 2, 'the bench index holds the line and the old number', what='index')
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.MissionRegistry && window.MissionRegistry.get().missions.length >= 1", timeout=15000, what='the registry is read')
    c.wait(1500)
    st = c.js(_FORMER_STATE_JS)
    c.eq(st['shown'], ['T-085'], 'one mission on the screen, under the lettered identifier', what=str(st))
    line = [m for m in st['index'] if m['id'] == 'T-085']
    c.ok(line and line[0]['status'] == 'planned' and line[0]['notes'] == 'bench note' and line[0]['flownAt'] == '2026-10-01', str(line), 'what was attached to the old number follows (status, notes, flight date)')
    old = [m for m in st['index'] if m['id'] == '85']
    c.ok(old and old[0]['by'] == 'T-085', str(old), 'the old entry carries a field the line lacks: kept, marked as attached to the line')
    c.ok(st['note'] and '1' in st['note'], st['note'], 'the page says one old entry was kept')
    c.shot('K219_standard_former_kept_delivered.png')
    # 2. the old entry has nothing more than the line: absorbed, the user's fields moved, nothing said
    c.eq(c.js(_FORMER_SEED_JS, [['T-086', '86', 'Same title'], ['86', 'Same title', 'flown', 'note two', '2026-10-02']]), 2, 'the bench index is replaced by the second pair', what='index')
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.MissionRegistry && window.MissionRegistry.get().missions.length >= 1", timeout=15000, what='the registry is read again')
    c.wait(1500)
    st = c.js(_FORMER_STATE_JS)
    c.eq(st['shown'], ['T-086'], 'one mission on the screen', what=str(st))
    c.eq([m['id'] for m in st['index']], ['T-086'], 'the old entry, with nothing more than the line, is attached (one entry left in the index)', what=str(st['index']))
    c.ok(st['index'][0]['status'] == 'flown' and st['index'][0]['notes'] == 'note two', str(st['index']), 'its status and notes follow')
    c.ok(not st['note'], st['note'], 'nothing is said when nothing is kept')
    # 3. what the user wrote on the old entry that the line cannot take (it has its own note and status): the old entry is kept, hidden, counted -- never dropped
    c.eq(c.js(_FORMER_SEED_JS, [{'base': ['T-087', '87', 'Same title'], 'set': {'status': 'planned', 'notes': 'own note'}},
                                {'base': ['87', 'Same title', 'flown', 'other note', '2026-10-03'], 'set': {}}]), 2, 'the bench index holds a line with its own note and an old entry with another', what='index')
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.MissionRegistry && window.MissionRegistry.get().missions.length >= 1", timeout=15000, what='the registry is read a third time')
    c.wait(1500)
    st = c.js(_FORMER_STATE_JS)
    old = [m for m in st['index'] if m['id'] == '87']
    c.ok(old and old[0]['by'] == 'T-087' and old[0]['notes'] == 'other note' and old[0]['flownAt'] == '2026-10-03', str(st['index']), 'the old entry keeps what the user wrote on it, hidden and attached to the line')
    c.eq(st['shown'], ['T-087'], 'one mission on the screen', what=str(st))
    c.ok([m for m in st['index'] if m['id'] == 'T-087'][0]['notes'] == 'own note', str(st['index']), 'the line keeps its own note')
    # 4. a pending order (status ordered, no file) whose number a mission file quotes as its former_id is never absorbed
    c.eq(c.js(_FORMER_SEED_JS, [['T-088', '88', 'Same title'], {'base': ['88', 'Order', 'ordered', '', ''], 'set': {'files': [], 'request': {'serie': '88', 'text': 'bench order'}, 'folder': ''}}]), 2, 'the bench index holds a line and a pending order', what='index')
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.MissionRegistry && window.MissionRegistry.get().missions.length >= 1", timeout=15000, what='the registry is read a fourth time')
    c.wait(1500)
    order = c.js("async () => { await window.MissionIndex.ready; return window.MissionIndex.all().filter(m => m.id === '88').map(m => ({ status: m.status, by: m.supersededBy || '', request: m.request })) }")
    c.eq(order, [{'status': 'ordered', 'by': '', 'request': {'serie': '88', 'text': 'bench order'}}], 'the pending order is intact, not attached to the line', what='order')
    # 5. the reports written under the old number follow the line (read only: the ledger of the reports is not touched)
    c.eq(c.js(_FORMER_SEED_JS, [['T-089', '89', 'Same title']]), 1, 'the bench index holds one renumbered line', what='index')
    c.js(_FORMER_LEDGER_JS)
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.MissionRegistry && window.MissionRegistry.get().missions.length >= 1", timeout=15000, what='the registry is read a fifth time')
    c.wait(1500)
    c.eq(c.js("() => window.MissionRegistry.get().missions.map(m => [m.id, (m.reports || []).length])"), [['T-089', 1]], 'the report written under the old number is linked to the lettered line', what='reports')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders (their own repositories) are not in the test tree



# A bench missions folder (a tree of fake directory handles; no data of the user): one renumbered mission T-085 (its former number 85 in `former_id`), with the versions kept
# under the old number (recu/ as « <stamp>_<n>_<name>.txt », versions/ as « mission85_<stamp>.yaml »), and its maps.
_FAKE_FOLDER_JS = r"""(tree) => {
  const file = (name, text) => ({ kind: 'file', name, getFile: async () => ({ name, lastModified: 1760000000000, size: text.length, text: async () => text }) });
  const dir = (name, kids) => ({ kind: 'directory', name, async *entries() { for (const [k, v] of Object.entries(kids)) yield [k, v] },
    async getDirectoryHandle(n) { if (kids[n] && kids[n].kind === 'directory') return kids[n]; throw new DOMException('absent', 'NotFoundError') },
    async getFileHandle(n) { if (kids[n] && kids[n].kind === 'file') return kids[n]; throw new DOMException('absent', 'NotFoundError') } });
  const build = (name, node) => dir(name, Object.fromEntries(Object.entries(node).map(([k, v]) => [k, typeof v === 'string' ? file(k, v) : build(k, v)])));
  const root = build('missions', tree);
  window.FileAccess.status = async () => ({ handle: root, permission: 'granted', name: 'missions' });
  return true }"""
_YAML = "schema: helo-xp-mission\nmission:\n  id: '{id}'\n{former}  type: AIRLIFT\ntitle: Bench\n"
_FAKE_TREE = {'T_AIRLIFT': {'T-085': {
    'missionT-085.yaml': _YAML.format(id='T-085', former="  former_id: '85'\n"), 'summaryT-085.md': '# Mission T-085 - Bench\n',
    'recu': {'2026-10-01T10-00-00_1_mission85.yaml.txt': _YAML.format(id='85', former=''), '2026-10-01T10-00-00_2_summary85.md.txt': '# Mission 85\n'},
    'versions': {'mission85_2026-10-01.yaml': _YAML.format(id='85', former='')}, 'cartes': {'map.png': 'x'}}}}
# an index entry the way an earlier reading left it: same folder, another identifier
_FAKE_ENTRY_JS = """(id) => { const R = window.MissionRegistry, base = R.get().missions.find(m => m.id === 'T-085');
  R.get().missions.push({ ...base, id, formerId: '', missingFile: false }); return R.get().missions.length }"""
_SCAN_TWICE_JS = """async () => { const R = window.MissionRegistry; await R.scan(false); await R.scan(false); R.setFilters({});
  return { shown: R.get().missions.filter(R.matches).map(m => m.id), all: R.get().missions.map(m => [m.id, !!m.missingFile, m.supersededBy || '']),
    olds: (document.getElementById('rgOldNumbers') || {}).textContent || '' } }"""


@case('K220', 'Re-reading a renumbered mission folder (versions kept under the old number in recu/ and versions/) twice leaves one entry per mission: the reading no longer brings back an entry its folder no longer holds, an entry under the number the line had before is attached, and the bare numbers left without a renumbered mission are counted', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0289 (the ergonomist, 13 Nov, device counts): 50 entries under a bare number, source « dossier », in the NEW lettered folder, none « file missing »: the incremental re-reading took back every entry of an unchanged folder, the stale ones included; the reading of a folder neither creates nor revives an entry for the former_id of the mission of that same folder')
def k_formerscan(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry && !!window.FileAccess", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_FAKE_FOLDER_JS, _FAKE_TREE)
    c.js("async () => { await window.MissionIndex.ready; await window.MissionIndex.save([], new Date().toISOString()); window.MissionRegistry.get().missions.length = 0; const r = await window.MissionRegistry.scan(false); return r.found }")
    c.eq(c.js("() => window.MissionRegistry.get().missions.map(m => m.id)"), ['T-085'], 'the first reading of the renumbered folder: one entry (recu/ and versions/ are not missions)', what='entries')
    # 1. an entry under the old number, in the same folder (what the earlier readings left), then two re-readings of the unchanged folder
    c.js(_FAKE_ENTRY_JS, '85')
    st = c.js(_SCAN_TWICE_JS)
    c.eq(st['shown'], ['T-085'], 'two re-readings: one mission on the screen', what=str(st))
    # 2. an entry of that folder that no file gives any more (not a former number): the reading marks it, it does not take it back
    c.js(_FAKE_ENTRY_JS, '77')
    st = c.js(_SCAN_TWICE_JS)
    gone = [m for m in st['all'] if m[0] == '77']
    c.ok(gone and gone[0][1], str(st['all']), 'an entry its folder no longer holds is « file missing » after the re-readings, not live again')
    # 3. a bare number with no renumbered mission: counted, not hidden
    c.js("() => { const R = window.MissionRegistry; R.get().missions.push({ ...R.get().missions.find(m => m.id === 'T-085'), id: '99', formerId: '', folder: 'X_OLD/99', files: [], missingFile: false }); return true }")
    st = c.js(_SCAN_TWICE_JS)
    c.ok(st['olds'].startswith('2 '), st['olds'], 'the page counts the missions left under an old number (77, 99), without a renumbered mission')
    c.shot('K220_standard_old_numbers_delivered.png')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]



# « Open in generator » of the V2 registry on a bench: one line with its files, the shared mission of the generator a never-stored skeleton (so the page asks before replacing it).
_GO_SEED_JS = r"""async () => {
  await window.MissionIndex.ready;
  await window.MissionIndex.save([{ id: 'T-085', formerId: '85', series: '', number: 85, type: 'AIRLIFT', family: 'T', subtype: '', title: 'Bench', folder: 'T_AIRLIFT/T-085',
    files: ['missionT-085.yaml'], source: 'dossier', status: 'generated', statusAt: '2026-10-20T10:00:00.000Z', notes: '', flownAt: '', addedAt: '2026-10-20T10:00:00.000Z',
    teams: [], teamCount: 0, teamTypes: [], aircraftTypes: [], callsigns: [], rdv: 0, origin: '', destination: '', hasYaml: true }], new Date().toISOString());
  localStorage.setItem('siaMissionShared:v1', JSON.stringify({ yaml: { schema: 'helo-xp-mission', meta: { skeleton: true }, mission: { id: 'T-999', type: 'AIRLIFT' } }, narrative: '', sourceNames: [], rev: 1, at: '2026-10-20T10:00:00.000Z', by: 'bench' }));
  localStorage.removeItem('missionRegistryLastGo:v1');
  return true }"""
_GO_HOOK_JS = """() => { window.__n = []; const f = window.AppFramework.notify; window.AppFramework.notify = (t, ...a) => { window.__n.push(String(t)); return f.call(window.AppFramework, t, ...a) }; return true }"""
_GO_CLICK_JS = """async () => { const b = document.querySelector('#rgDetail [data-go=editor]'); if (!b) return 'no button'; b.click(); await new Promise(r => setTimeout(r, 900)); return window.__n.slice() }"""


@case('K221', 'Opening a mission in the generator from the V2 registry never ends silently: a refused or unavailable confirmation, or a failing one, says why in a floating notification; a one-line « Copy the diagnostic » gives the state (forms only, no identifier, no path) and the last step reached', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0290 (the user: « éditer une mission depuis la V2 ne fait rien »; the ergonomist, 13 Nov): « does nothing » with no message is a defect whatever the cause; the two silent exits of go() (the confirmation refused, no confirmation possible or failing) speak; the diagnostic is read-only and carries no value')
def k_gosilent(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_GO_SEED_JS)
    def open_detail():
        c.page.goto(c.base + '/apps/cpco/mission_registry.html?mission=T-085', wait_until='load')
        c.until("() => !!document.querySelector('#rgDetail [data-go=editor]')", timeout=15000, what='the mission is selected: its detail has « Open in generator »')
        c.js(_GO_HOOK_JS)
    # 1. the confirmation is refused (Cancel): a notification says the mission was not opened, and why
    open_detail()
    c.js("() => { document.querySelector('#rgDetail [data-go=editor]').click(); return true }")
    c.until("() => !!document.querySelector('dialog.repo-ask[open]')", timeout=8000, what='the page asks before replacing the shared skeleton')
    c.js("() => { document.querySelector('dialog.repo-ask button').click(); return true }")      # Cancel
    c.wait(600)
    n = c.js("() => window.__n.slice()")
    c.ok(len(n) == 1 and 'T-085' in n[0] and 'T-999' in n[0], str(n), 'a refused confirmation says that the mission was not opened and which shared mission stayed')
    # 2. no confirmation is possible (the framework's ask is missing): says so, does not open, does not replace
    open_detail()
    c.js("() => { window.AppFramework.ask = undefined; return true }")
    n = c.js(_GO_CLICK_JS)
    c.ok(isinstance(n, list) and len(n) == 1 and 'T-085' in n[0], str(n), 'without a possible confirmation: a notification says why nothing opens')
    c.eq(c.js("() => location.pathname.endsWith('mission_registry.html')"), True, 'the page stays on the registry', what='location')
    # 3. the confirmation itself fails: the same
    open_detail()
    c.js("() => { window.AppFramework.ask = () => { throw new Error('bench failure') }; return true }")
    n = c.js(_GO_CLICK_JS)
    c.ok(isinstance(n, list) and len(n) == 1 and 'T-085' in n[0], str(n), 'a failing confirmation is said, not an unhandled error')
    # 4. the missions folder does not answer (a moved folder, a network drive that is gone: the browser never gives the hand back): the page says so after a few seconds
    open_detail()
    c.js("() => { localStorage.removeItem('siaMissionShared:v1'); window.FileAccess.status = () => new Promise(() => {}); return true }")
    c.js("() => { document.querySelector('#rgDetail [data-go=editor]').click(); return true }")
    c.until("() => window.__n.length > 0", timeout=14000, what='a folder that does not answer is said, not waited for forever')
    n = c.js("() => window.__n.slice()")
    c.ok('T-085' in n[0] and 'ne répond pas' in n[0], str(n), 'the notification says that the missions folder does not answer, and how to choose it again')
    # 5. the diagnostic: copied, forms and states only
    c.js("() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t } } }); return true }")
    c.until("() => !!document.getElementById('rgDiag')", timeout=8000, what='the registry has its « Copy the diagnostic » line')
    c.js("() => { document.getElementById('rgDiag').click(); return true }")
    c.until("() => window.__copied.length > 20", timeout=10000, what='the diagnostic is copied')
    txt = c.js("() => window.__copied")
    c.ok('T-085' not in txt and 'T-999' not in txt and 'T_AIRLIFT' not in txt, txt[:300], 'the diagnostic carries no mission identifier and no path')
    c.ok('origine : http://127.0.0.1' in txt and 'mission partagée du générateur : aucune' in txt and 'pas folder' in txt and 'erreur Timeout' in txt, txt[:600], 'it says the origin, the shared mission, the folder and the last step reached with its error')
    c.shot('K221_standard_diagnostic_delivered.png')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404') and 'bench failure' not in e and 'pas de réponse en 8 s' not in e]      # the bench failures and the folder that does not answer are the case's own



# The missions the V2 editor keeps in the browser (siaMissionSaved:v1: { id -> { kind, at, snap, dirtyAt } }, snap = a JSON text { yaml, narrative }), on a bench: three snapshots (one
# under the number a mission had before the renumbering and different from its file, one identical to its file, one with no file), the shared mission, and the lines of the index.
_KEPT_SEED_JS = r"""async () => {
  const y = (id, title, summary) => ({ schema: 'helo-xp-mission', mission: { id, type: 'AIRLIFT' }, title, summary, detailed_description: 'Detailed ' + id });
  const snap = (id, title, summary) => JSON.stringify({ yaml: y(id, title, summary), narrative: { summary: '', detailed: '', sections: [] } });
  const at = Date.now();
  localStorage.setItem('siaMissionSaved:v1', JSON.stringify({
    '85': { kind: 'loaded', at, snap: snap('85', 'Bench one', 'A longer summary written in the editor'), dirtyAt: at },
    'T-086': { kind: 'saved', at, snap: snap('T-086', 'Bench two', 'Same as the file'), dirtyAt: at },
    'X-001': { kind: 'new', at, snap: snap('X-001', 'Bench three', 'No file anywhere'), dirtyAt: at } }));
  localStorage.setItem('siaMissionShared:v1', JSON.stringify({ yaml: y('T-090', 'Bench shared', 'Shared'), narrative: { summary: '', detailed: '', sections: [] }, rev: 1, at: '2026-10-20T10:00:00.000Z', by: 'bench' }));
  const line = (id, former, folder) => ({ id, formerId: former, series: '', number: 0, type: 'AIRLIFT', family: 'T', subtype: '', title: 'Bench', folder, files: ['mission' + id + '.yaml'], source: 'dossier',
    status: 'generated', statusAt: '2026-10-20T10:00:00.000Z', notes: '', flownAt: '', addedAt: '2026-10-20T10:00:00.000Z', teams: [], teamCount: 0, teamTypes: [], aircraftTypes: [], callsigns: [], rdv: 0, origin: '', destination: '', hasYaml: true });
  await window.MissionIndex.ready;
  await window.MissionIndex.save([line('T-085', '85', 'T_AIRLIFT/T-085'), line('T-086', '', 'T_AIRLIFT/T-086')], new Date().toISOString());
  return true }"""
_KEPT_FILE_85 = "schema: helo-xp-mission\nmission:\n  id: T-085\n  former_id: '85'\n  type: AIRLIFT\ntitle: Bench one\nsummary: The short summary of the file\ndetailed_description: Detailed 85\n"
_KEPT_FILE_86 = "schema: helo-xp-mission\nmission:\n  id: T-086\n  type: AIRLIFT\ntitle: Bench two\nsummary: Same as the file\ndetailed_description: Detailed T-086\n"


@case('K222', 'The registry of the V2 says how many missions the browser keeps (the editor’s snapshots), how many differ from their folder, have no file, or are identical; one button downloads them all as YAML in one archive, and writes nothing to the folder', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0293 (a) and (b) (the user: « si il y a discordance entre le registre et les fichiers, export yaml vers les fichiers »; the ergonomist, 13 Nov): the backup first -- one YAML per snapshot, DOWNLOADED, nothing written to the folder; the same line says the state; a snapshot under an old number is compared with the file of the mission that carries that former_id')
def k_keptexport(c):
    import io as _io
    import zipfile
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_KEPT_SEED_JS)
    c.page.route('**/data/missions/T_AIRLIFT/T-085/missionT-085.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', body=_KEPT_FILE_85))
    c.page.route('**/data/missions/T_AIRLIFT/T-086/missionT-086.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', body=_KEPT_FILE_86))
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!document.getElementById('rgKept') && document.getElementById('rgKept').textContent.length > 10", timeout=15000, what='the registry says what the browser keeps')
    c.wait(800)
    line = c.js("() => document.getElementById('rgKept').textContent.replace(/\\s+/g, ' ').trim()")
    c.ok(line.startswith('3 mission(s) gardée(s) par ce navigateur') and '1 différente(s) du dossier' in line and '1 sans fichier' in line and '1 identique(s)' in line, line, 'the line counts what the browser keeps: 1 different (the one under the old number, compared with the file of T-085), 1 without file, 1 identical')
    sent = []
    c.page.on('request', lambda r: sent.append(r.method + ' ' + r.url) if r.method != 'GET' else None)
    with c.page.expect_download(timeout=15000) as dl:
        c.js("() => { document.getElementById('rgKeptExport').click(); return true }")
    d = dl.value
    path = d.path()
    z = zipfile.ZipFile(path)
    names = sorted(z.namelist())
    c.ok(d.suggested_filename.endswith('.zip'), d.suggested_filename, 'one archive is downloaded')
    c.ok(len(names) == 4 and sum(n.startswith('instantanes/') for n in names) == 3 and any(n.startswith('partagee/') for n in names), str(names), 'one YAML per snapshot, and the shared mission')
    one = z.read([n for n in names if n.startswith('instantanes/') and '85' in n][0]).decode('utf-8')
    c.ok('A longer summary written in the editor' in one and 'Detailed 85' in one, one[:300], 'the snapshot under the old number is exported with the text written in the editor')
    c.ok(not sent, str(sent), 'nothing was sent anywhere (no write to the folder, no request but reads)')
    # a forged identifier (a line break inside the key of a snapshot) stays inside the header comment; two identifiers that differ only by characters made « _ » do not share a name
    c.js(r"""() => { const at = Date.now(), y = (id) => ({ schema: 'helo-xp-mission', mission: { id, type: 'AIRLIFT' }, title: 'Forged' }), snap = (id) => JSON.stringify({ yaml: y(id), narrative: { summary: '', detailed: '', sections: [] } });
      localStorage.setItem('siaMissionSaved:v1', JSON.stringify({ 'T-1\nairline: injected': { kind: 'new', at, snap: snap('T-1'), dirtyAt: at }, 'A B': { kind: 'new', at, snap: snap('A B'), dirtyAt: at }, 'A_B': { kind: 'new', at, snap: snap('A_B'), dirtyAt: at } }));
      localStorage.removeItem('siaMissionShared:v1'); return true }""")
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!document.getElementById('rgKeptExport')", timeout=15000, what='the registry has its export button for the forged snapshots')
    with c.page.expect_download(timeout=15000) as dl2:
        c.js("() => { document.getElementById('rgKeptExport').click(); return true }")
    z2 = zipfile.ZipFile(dl2.value.path())
    names2 = sorted(z2.namelist())
    c.ok(len(set(names2)) == len(names2) == 3 and 'instantanes/A_B.yaml' in names2 and 'instantanes/A_B-2.yaml' in names2, str(names2), 'two identifiers that differ only by a character made « _ » get two names (the second numbered), nothing is lost')
    forged = [n for n in names2 if n.startswith('instantanes/T-1')]
    body = z2.read(forged[0]).decode('utf-8').split('\n') if forged else []
    c.ok(body and body[0].startswith('#') and not any(l.lower().startswith('airline') for l in body[1:]), str(body[:3]), 'a line break in an identifier stays inside the one comment line: no key the mission did not have')
    c.shot('K222_standard_kept_delivered.png')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]



# A writable fake missions folder (a tree of in-memory directory handles; no data of the user): the file of T-085 as the folder holds it, and nothing for the others.
_WFS_JS = r"""(tree) => {
  const writes = [];
  const file = (path, text) => { const f = { kind: 'file', name: path.split('/').pop(), text, getFile: async () => ({ name: f.name, lastModified: 1760000000000, size: f.text.length, text: async () => f.text }),
    createWritable: async () => ({ write: async (t) => { f.text = String(t); writes.push(path) }, close: async () => {} }) }; return f };
  const dir = (path, kids) => { const d = { kind: 'directory', name: path.split('/').pop(), kids, async *entries() { for (const [k, v] of Object.entries(d.kids)) yield [k, v] },
    async getDirectoryHandle(n, o) { if (d.kids[n] && d.kids[n].kind === 'directory') return d.kids[n]; if (o && o.create) return d.kids[n] = dir(path + '/' + n, {}); throw new DOMException('absent', 'NotFoundError') },
    async getFileHandle(n, o) { if (d.kids[n] && d.kids[n].kind === 'file') return d.kids[n]; if (o && o.create) return d.kids[n] = file(path + '/' + n, ''); throw new DOMException('absent', 'NotFoundError') } }; return d };
  const build = (path, node) => dir(path, Object.fromEntries(Object.entries(node).map(([k, v]) => [k, typeof v === 'string' ? file(path + '/' + k, v) : build(path + '/' + k, v)])));
  const root = build('missions', tree);
  window.__wfs = { root, writes };
  window.FileAccess.status = async () => ({ handle: root, permission: 'granted', name: 'missions' });
  return true }"""
_WFS_READ_JS = r"""(path) => { let n = window.__wfs.root; for (const k of path.split('/')) { n = n.kids[k]; if (!n) return null } return n.kind === 'file' ? n.text : Object.keys(n.kids) }"""


# the draft of the generator (the old key missionGeneratorDraft): T-086 with a summary of its own
_KEPT_DRAFT_JS = r"""() => { localStorage.setItem('missionGeneratorDraft', JSON.stringify({ yaml: { schema: 'helo-xp-mission', mission: { id: 'T-086', type: 'AIRLIFT' }, title: 'Bench two', summary: 'A draft summary', detailed_description: 'Detailed T-086' },
  narrative: { summary: '', detailed: '', sections: [] }, sourceNames: [] })); return true }"""


@case('K223', 'The registry of the V2 sets the file and the browser’s version side by side for each kept mission that differs (date, lengths of the summary and the description, newer, more complete): « Store in the folder » writes the browser’s version and keeps the old file in versions/, a snapshot under an old number goes under the lettered identifier; « Keep the file » changes nothing; nothing is ever overwritten without the choice', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0293 (c) (the ergonomist, 13 Nov): side by side file / browser, then « Ranger dans le dossier » (the old file kept as a version) or « Garder le fichier »; never an automatic overwrite (a snapshot can be poorer than the file); a snapshot under an old number is stored under the lettered identifier of the mission carrying that former_id')
def k_keptstore(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_KEPT_SEED_JS)
    c.page.route('**/data/missions/T_AIRLIFT/T-085/missionT-085.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', headers={'Last-Modified': 'Wed, 21 Oct 2026 07:28:00 GMT'}, body=_KEPT_FILE_85))
    c.page.route('**/data/missions/T_AIRLIFT/T-086/missionT-086.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', body=_KEPT_FILE_86))
    c.js(_KEPT_DRAFT_JS)
    c.js("""() => { const all = JSON.parse(localStorage.getItem('siaMissionSaved:v1')); all['Y-001'] = { kind: 'saved', at: Date.parse('2026-10-12T10:00:00Z'),
      snap: JSON.stringify({ yaml: { schema: 'helo-xp-mission', mission: { id: 'Y-001', type: 'AIRLIFT' }, title: 'Saved elsewhere', summary: 'Kept' }, narrative: { summary: '', detailed: '', sections: [] } }), dirtyAt: null };
      localStorage.setItem('siaMissionSaved:v1', JSON.stringify(all)); return true }""")
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.js(_WFS_JS, {'T_AIRLIFT': {'T-085': {'missionT-085.yaml': _KEPT_FILE_85}, 'T-086': {'missionT-086.yaml': _KEPT_FILE_86}}})
    c.until("() => !!document.getElementById('rgKeptList')", timeout=15000, what='the side-by-side list is there for the missions that differ or have no file')
    c.wait(500)
    rows = c.js("() => [...document.querySelectorAll('#rgKeptList tbody tr')].map(r => r.dataset.keptId)")
    c.eq(sorted(rows), ['85', 'X-001', 'Y-001', 'brouillon:T-086', 'partagee:T-090'], 'five to decide: the snapshot that differs (under its old number), the two without a file, the generator draft that differs from its file, the shared mission without a file', what='rows')
    nature = c.js("() => Object.fromEntries([...document.querySelectorAll('#rgKeptList tbody tr')].map(r => [r.dataset.keptId, r.cells[0].textContent.replace(/\\s+/g, ' ')]))")
    c.ok('référence chargée' in nature['85'] and 'mission en cours dans le générateur' in nature['partagee:T-090'] and 'brouillon du générateur' in nature['brouillon:T-086'], str(nature), 'each row says the nature of what is compared: a reference loaded, the mission in progress in the generator, the draft')
    c.ok('enregistrée le' in nature['Y-001'] and 'dans un dossier qui n’est pas celui-ci' in nature['Y-001'], nature['Y-001'], 'a « stored » snapshot with no file here says it was stored in a folder that is not this one')
    cls = c.js("""() => ({ keep85: document.querySelector('[data-kept-file="85"]').className, store85: document.querySelector('[data-kept-store="85"]').className, storeX: document.querySelector('[data-kept-store="X-001"]').className })""")
    c.ok('primary' not in cls['keep85'] and 'primary' not in cls['store85'] and 'primary' in cls['storeX'], str(cls), 'the texts are longer in the browser but the file has more fields filled: the two buttons weigh the same; where there is no file, « Store in the folder » is the highlighted one')
    row85 = c.js("() => document.querySelector('#rgKeptList tr[data-kept-id=\"85\"]').textContent.replace(/\\s+/g, ' ')")
    c.ok('T-085' in row85 and 'résumé 38' in row85 and 'résumé 29' in row85 and 'Bench' in row85 and 'champ' in row85, row85, 'the row shows what is compared: the lengths of the summary and of the description, and the fields filled, on both sides')
    c.ok('textes plus longs : navigateur' in row85 and 'champs remplis : fichier' in row85 and 'plus complet' not in row85, row85, 'the verdict is said by criterion; « more complete » is not said when the criteria contradict each other')
    c.ok('plus récent : navigateur' in row85 and 'date du fichier inconnue' not in row85, row85, 'the date of the file is the Last-Modified of the answer of the launcher, so « newer » is said')
    row86 = c.js("() => document.querySelector('#rgKeptList tr[data-kept-id=\"brouillon:T-086\"]').textContent.replace(/\\s+/g, ' ')")
    c.ok('date du fichier inconnue' in row86, row86, 'a file whose answer has no Last-Modified says « file date unknown » instead of a dash')
    c.ok(c.js("() => document.querySelector('#rgKeptList').textContent.includes('un champ présent seulement dans le fichier')"), '', 'a sentence says that storing replaces the whole file: a field present only in the file stays only in versions/')
    c.eq(c.js("() => getComputedStyle(document.querySelector('#rgKeptList th')).textAlign"), 'left', 'the column heads are aligned with their cells', what='text-align')
    c.shot('K223_standard_kept_list_delivered.png')
    # the table at 1 280, scrolled to its rows (the five lines of the bench with their natures and their buttons)
    back = c.page.viewport_size
    c.page.set_viewport_size({'width': 1280, 'height': 900})
    c.wait(600)
    c.js("() => { document.getElementById('rgKeptList').scrollIntoView({ block: 'center' }); return true }")
    c.wait(500)
    c.shot('K223_standard_kept_table_1280_delivered.png')
    c.page.set_viewport_size(back)
    c.wait(400)
    # « Keep the file » changes nothing
    before = c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/missionT-085.yaml')
    c.js("() => { document.querySelector('[data-kept-file=\"85\"]').click(); return true }")
    c.wait(400)
    c.eq(c.js("() => window.__wfs.writes.length"), 0, '« Keep the file »: nothing is written', what='writes')
    c.ok('fichier gardé' in c.js("() => document.querySelector('#rgKeptList tr[data-kept-id=\"85\"]').textContent"), '', 'the choice is shown on the row')
    # reload: the choice is kept for the same snapshot; then « Store in the folder » on the other mission (no file): created under its folder
    c.js("() => { document.querySelector('[data-kept-store=\"X-001\"]').click(); return true }")
    c.wait(1500)
    c.ok(any(w.endswith('missionX-001.yaml') for w in c.js("() => window.__wfs.writes")), str(c.js("() => window.__wfs.writes")), '« Store in the folder » of a mission without a file writes it into the folder')
    # the snapshot under the old number, stored under the lettered identifier; the old file kept in versions/
    c.js("() => { const t = document.querySelector('[data-kept-store=\"85\"]'); if (t) t.click(); return !!t }")
    c.page.evaluate("() => { localStorage.removeItem('missionRegistryKeptChoice:v1') }")
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.js(_WFS_JS, {'T_AIRLIFT': {'T-085': {'missionT-085.yaml': _KEPT_FILE_85}, 'T-086': {'missionT-086.yaml': _KEPT_FILE_86}}})
    c.until("() => !!document.querySelector('[data-kept-store=\"85\"]')", timeout=15000, what='the row of the old number is there again (the choice was removed)')
    c.js(_GO_HOOK_JS)
    c.js("() => { document.querySelector('[data-kept-store=\"85\"]').click(); return true }")
    c.wait(3000)
    c.ok(c.js("() => window.__wfs.writes.some(w => w.endsWith('missionT-085.yaml'))"), str(c.js("() => [window.__wfs.writes, window.__n]")), 'the version of the browser is written under the lettered identifier')
    new = c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/missionT-085.yaml')
    c.ok('A longer summary written in the editor' in new and 'id: T-085' in new and "former_id: '85'" in new or 'former_id: 85' in new, new[:400], 'the file now holds the browser’s text, under T-085, the old number kept in former_id')
    vers = c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/versions')
    c.ok(vers and len(vers) == 1 and vers[0].startswith('missionT-085_'), str(vers), 'the old file went to versions/')
    old = c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/versions/' + vers[0]) if vers else ''
    c.eq(old, before, 'and its content is intact there', what='old file')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]



# A batch of three missions received at once (their YAML and Markdown, six files), the way the generator and the registry hand them to the storing: the whole list for every mission.
_BATCH_JS = r"""async () => {
  const y = (id) => 'schema: helo-xp-mission\nmission:\n  id: ' + id + '\n  type: AIRLIFT\ntitle: Bench ' + id + '\nsummary: Summary ' + id + '\n';
  const texts = [];
  for (const id of ['T-091', 'T-092', 'T-093']) { texts.push({ name: 'mission' + id + '.yaml', text: y(id) }); texts.push({ name: 'summary' + id + '.md', text: '# Mission ' + id + ' - Bench\n\nText ' + id + '\n' }) }
  const docs = window.SiaMission.fromTextsBatch(texts).docs, out = [];
  for (const d of docs) out.push((await window.MissionRegistryCore.record(d, { md: '', raw: texts, source: 'fichiers', request: true })).folder);
  return out }"""


@case('K224', 'A batch of three missions received at once keeps each received file in the folder of its own mission only (recu/): no more every file copied into every mission of the batch', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0294 (the ergonomist, 13 Nov, counts): 52 recu/ folders, 5 502 files for 102 distinct contents; every file of the batch of 5 Nov was copied into the recu/ of EVERY mission of the batch, 5 412 being those of another mission; the cause: the whole list of the received files is handed to the storing of each mission')
def k_recubatch(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistryCore && !!window.SiaMission && !!window.FileAccess", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_WFS_JS, {})
    folders = c.js(_BATCH_JS)
    c.eq(sorted(folders), ['T_AIRLIFT/T-091', 'T_AIRLIFT/T-092', 'T_AIRLIFT/T-093'], 'the three missions are stored in their own folders', what='folders')
    for mid in ('T-091', 'T-092', 'T-093'):
        recu = c.js(_WFS_READ_JS, 'T_AIRLIFT/' + mid + '/recu') or []
        c.ok(len(recu) == 2 and all(mid in n for n in recu), str(recu), mid + ': its recu/ holds its own two files (YAML and Markdown) and nothing of the others')



def _hostile_yaml(levels=11, fan=9):
    """A YAML file whose anchors share one list over and over: small on the disk, enormous once every reference is expanded (the « billion laughs »)."""
    rows = ["schema: helo-xp-mission", "mission:", "  id: T-085", "  former_id: '85'", "  type: AIRLIFT", "title: Hostile", "l0: &l0 [" + ', '.join(['x'] * fan) + "]"]
    rows += ["l%d: &l%d [%s]" % (k, k, ', '.join(['*l%d' % (k - 1)] * fan)) for k in range(1, levels)]
    return '\n'.join(rows) + '\n'


_TWO_CLAIMS_JS = r"""async () => { const line = (id, former, folder) => ({ id, formerId: former, series: '', number: 0, type: 'AIRLIFT', family: 'T', subtype: '', title: 'Bench ' + id, folder, files: ['mission' + id + '.yaml'], source: 'dossier',
    status: 'generated', statusAt: '2026-10-20T10:00:00.000Z', notes: '', flownAt: '', addedAt: '2026-10-20T10:00:00.000Z', teams: [], teamCount: 0, teamTypes: [], aircraftTypes: [], callsigns: [], rdv: 0, origin: '', destination: '', hasYaml: true });
  await window.MissionIndex.ready;
  await window.MissionIndex.save([line('T-085', '85', 'T_AIRLIFT/T-085'), line('T-185', '85', 'T_AIRLIFT/T-185'), line('T-086', '', 'T_AIRLIFT/T-086')], new Date().toISOString()); return true }"""
_STORE_OVER_JS = r"""async () => { const doc = { yaml: { schema: 'helo-xp-mission', mission: { id: 'T-085', type: 'AIRLIFT' }, title: 'New version' } };
  const r = await window.MissionRegistryCore.record(doc, { md: '', raw: [], source: 'fichiers', request: true }); return r.status }"""


@case('K225', 'The comparison of the kept missions refuses a hostile file (shared anchors that expand to billions of nodes) and counts that mission as not compared, in under a second; an ambiguous former number maps to no line; a storing over a file that cannot be read keeps a copy of it in versions/', 'K',
      tags=('maps',), screens=False, designs=('standard',),
      rule='audit 183 (Sécurisation, 13 Nov): jsyaml.load shares the anchors, canon() and leafCount() expand them: 11 nested levels of 455 bytes cost 2.6 s and 350 MB, 12 throw; a file loaded by the common function is refused beyond a budget of 200 000 nodes, the element becomes « not compared » and the others go on; the former number is followed only when exactly one line claims it; the old file is copied to versions/ as soon as it exists and differs, readable or not')
def k_hostile(c):
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!window.RepositoryNav && !!window.MissionIndex && !!window.MissionRegistry && !!window.MissionRegistryCore && !!window.FileAccess", timeout=15000, what='the registry page is loaded')
    c.js("async () => await window.RepositoryNav.cpco.unlock('DEFA')")
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]      # the data folders are not in the test tree
    c.js(_KEPT_SEED_JS)
    c.page.route('**/data/missions/T_AIRLIFT/T-085/missionT-085.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', body=_hostile_yaml()))
    c.page.route('**/data/missions/T_AIRLIFT/T-086/missionT-086.yaml', lambda r: r.fulfill(status=200, content_type='text/yaml', body=_KEPT_FILE_86))
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!document.getElementById('rgKept') && document.getElementById('rgKept').textContent.length > 10", timeout=5000, what='the page answers with the line of the kept missions (a hostile file does not freeze it)')
    line = c.js("() => document.getElementById('rgKept').textContent.replace(/\\s+/g, ' ').trim()")
    c.ok('1 sans fichier' in line and '1 identique(s)' in line and '1 non comparée(s)' in line, line, 'the mission of the hostile file is « not compared », the others are counted all the same')
    # a former number claimed by two lines follows none of them
    c.js(_TWO_CLAIMS_JS)
    c.page.goto(c.base + '/apps/cpco/mission_registry.html', wait_until='load')
    c.until("() => !!document.getElementById('rgKept') && document.getElementById('rgKept').textContent.length > 10", timeout=8000, what='the registry says what the browser keeps')
    line = c.js("() => document.getElementById('rgKept').textContent.replace(/\\s+/g, ' ').trim()")
    c.ok('2 sans fichier' in line, line, 'the number « 85 », claimed by two lines, is followed to none: the snapshot counts as without a file')
    # the old file cannot be read: a copy of it goes to versions/ before it is replaced
    c.js(_WFS_JS, {'T_AIRLIFT': {'T-085': {'missionT-085.yaml': 'key: [unclosed\n  - : :'}}})
    st = c.js(_STORE_OVER_JS)
    c.eq(st, 'version', 'the new version replaces the unreadable file', what='status')
    vers = c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/versions') or []
    c.ok(len(vers) == 1 and c.js(_WFS_READ_JS, 'T_AIRLIFT/T-085/versions/' + vers[0]) == 'key: [unclosed\n  - : :', str(vers), 'a copy of the file that could not be read is kept in versions/, intact')
    c.errors[:] = [e for e in c.errors if not e.startswith('missing file 404')]



@case('D195', 'Wind barbs follow the route near the edge of the screen too: with the map put so that the elbow of the route (VEPET) is close to the border, every barb, the shifted ones included, is less than 2 px from the line, at several zooms and widths', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0243 refused again (the user, 13 Nov: « reproduit. à quelques cm du bord de l’écran. 3 screenshots »): a barb that would fall on a distance mark is shifted along the route; the shift followed the straight direction of the nearest leg, so near an elbow the barb left the line by sin(angle) x the shift (14 to 17 px at VEPET); the marks depend on the view, hence the defect depends on where the map is put')
def d_barbedge(c):
    pts = [('LFPO', 48.7233, 2.3794, True), ('MOPAR', 48.95, 2.72, True), ('KOLIV', 49.55, 2.40, True), ('VEPET', 50.30, 2.55, False), ('PETAX', 50.75, 1.35, True), ('EGKB', 51.33, 0.03, True)]
    wind = {'dirDeg': 333, 'kt': 38, 'tempC': -20, 'levelFt': 17000, 'at': '2026-11-11T21:57:00Z'}
    f = flight()
    f['route'] = {'text': 'LFPO MOPAR KOLIV VEPET PETAX EGKB', 'dep': 'LFPO', 'arr': 'EGKB',
                  'points': [{'id': i, 'lat': la, 'lon': lo, **({'wind': wind} if w else {})} for i, la, lo, w in pts]}
    f['level'] = {'ft': 17000}
    for vw, vh, views in ((1280, 760, ((8, [3.6, 50.2]), (8, [3.9, 50.0]), (9, [2.2, 50.5]), (8, [3.3, 50.2]))), (700, 760, ((8, [2.55, 50.2]), (8, [0.8, 50.8]), (9, [3.0, 49.2]), (9, [1.0, 51.0]))), (390, 800, ((8, [0.8, 50.8]), (9, [1.0, 51.0])))):
        c.page.set_viewport_size({'width': vw, 'height': vh})
        c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
        c.ready('maps', sheet=True)
        c.js(_STATE_JS)
        hook_map(c)
        for z, cen in views:
            c.js("([z, cen]) => { window.__mpMap.jumpTo({ center: cen, zoom: z }); return true }", [z, cen])
            c.wait(1500)
            r = c.js("""() => { const S = window.__mp.S, m = window.__mpMap, line = S.marksPts.map(p => m.project([p.lon, p.lat])),
              dist = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0; return Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy) };
              const all = S.windHits || []; let worst = 0; for (const h of all) { let best = 1e9; for (let i = 1; i < line.length; i++) best = Math.min(best, dist({ x: h.x, y: h.y }, line[i - 1], line[i])); worst = Math.max(worst, best) }
              return { n: all.length, worst: Math.round(worst * 10) / 10 } }""")
            c.ok(r['n'] >= 3 and r['worst'] < 2, f'{vw} px, zoom {z}, centre {cen}: {r}', 'every barb is less than 2 px from the line, near the edge as at the centre')
            if (z, cen) in ((8, [3.6, 50.2]), (8, [0.8, 50.8])):
                c.shot(f'D195_{c.design}_edge_{vw}_delivered.png')



@case('D197', 'Ground: a taxiway’s name is shown at the zoom of its line (13), never a named taxiway without its name; the name is a sign the size of the line’s label', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0297 (the user, 13 Nov, on SOG-0203: « les numéros n’apparaissent pas encore au bon niveau de zoom (dès que les TWY apparaissent, les labels avec) »): the lines were drawn from zoom 13 and their names from 15; the names now follow the lines, the sign being allowed on a shorter line')
def d197(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    _ground_open(c)
    _ground_at(c, 12, 1200)
    st = c.js(_GSTAT)
    c.ok(st and st['hits'] == 0 and st['asked'] == 0, f'{st}', 'under zoom 13 nothing is drawn, no name')
    for z in (13, 14):
        _ground_at(c, z, 1500)
        st = c.js(_GSTAT)
        c.ok(st and st['twy'] > 50 and st['asked'] > 8 and st['names'] >= 8, f'zoom {z}: {st}', f'at {z} the taxiway lines AND their names (the names come with the lines)')
    c.shot('D197_standard_names_at_13_delivered.png')



@case('D198', 'Ground: a holding point is a red sign with white bold letters (the AIP’s), readable where it appears: text of 11 px or more, contrast of 4.5 or more, never a bare text beside a 4 px square', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0297 (the user, 13 Nov: « K et W22 illisibles. ce sont des points d’arrêt, cartouche rouge »): the holds were a 4 px red square and a plain 10.5 px text; measure: size of the text and contrast of its sign')
def d198(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    _ground_open(c)
    _ground_at(c, 15, 1500)
    r = c.js("""() => { const g = window.__mp.S.ground, signs = (g.signs || []).filter(s => s.kind === 'hold');
      const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
      return { n: signs.length, minFs: Math.min(...signs.map(s => s.fs)), minH: Math.min(...signs.map(s => s.h)), minW: Math.min(...signs.map(s => s.w)), minContrast: Math.round(Math.min(...signs.map(s => cr(s.bg, s.fg))) * 100) / 100,
        red: signs.every(s => /^#c8/i.test(s.bg)) } }""")
    c.ok(r['n'] >= 3, f'{r}', 'the holding points are drawn as signs at zoom 15')
    c.ok(r['minFs'] >= 11 and r['minH'] >= 15 and r['minW'] >= 15, f'{r}', 'the text is 11 px or more, the sign 15 px or more each way (« K » is not a speck)')
    c.ok(r['minContrast'] >= 4.5 and r['red'], f'{r}', 'white letters on red, a contrast of 4.5 or more')
    c.shot('D198_standard_hold_signs_15_delivered.png')



@case('D199', 'The Map has a button for the ground search: a « search » button in the map’s column appears when the view shows the flight’s departure or arrival (zoom 11 or more) and the ground can be read, and opens the Ground panel with its filter field; nothing when the view shows neither', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False, langs4=True,
      rule='SOG-0297 (the user, 13 Nov: « j’ai perdu le bouton recherche, pour les twy / parking. où est-il ? sur la carte ? »): the search is the filter of the Ground panel, reached only through the « Ground » button of the aerodrome card; it did not move, nothing on the map said it exists; the button is now on the map')
def d199(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    _ground_open(c)
    vis = "() => { const b = document.querySelector('[data-mp=ground]'); return !!b && !b.hidden && b.offsetParent !== null }"
    _ground_at(c, 5, 1200)
    c.eq(c.js(vis), False, 'a world view: no button', what='button at zoom 5')
    _ground_at(c, 12, 1500)
    c.until(vis, timeout=6000, what='the view shows the departure: the button is there')
    lab = c.js("() => document.querySelector('[data-mp=ground]').getAttribute('aria-label')")
    c.eq(norm(lab), norm(tx(M, 'gSearch', c.lang)), 'it says what it is for, in the language of the run', what='label')
    c.tap('[data-mp=ground]')
    c.until("() => window.__mp.S.dpanel === 'ground'", timeout=6000, what='the Ground panel opens')
    c.ok(c.js("() => !!document.querySelector('.mp-gd-q')"), '', 'with its filter field')
    c.shot(f'D199_standard_ground_button_{c.lang}_delivered.png')
    _ground_at(c, 12, 900, [8.0, 40.0])
    c.until("() => { const b = document.querySelector('[data-mp=ground]'); return !b || b.hidden || b.offsetParent === null }", timeout=6000, what='a view of neither end: no button')



@case('D200', 'The Map’s « Weather (wind, cloud) » layer is no longer offered (the Weather tab is for preparation); the wind barbs of « Winds aloft » are still drawn', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0295 (the user, 13 Nov, on SOG-0092: « rien ne se passe. imho, ça fait double emploi. l’onglet météo sert à la préparation. simplement les barbules suffisent. »): the layer is removed from the Layers list and the help; the barbs stay; the cache-only reading of the weather library stays')
def d200(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    pts = [('LFPO', 48.7233, 2.3794, True), ('MOPAR', 48.95, 2.72, True), ('KOLIV', 49.55, 2.40, True), ('VEPET', 50.30, 2.55, False), ('PETAX', 50.75, 1.35, True), ('EGKB', 51.33, 0.03, True)]
    wind = {'dirDeg': 333, 'kt': 38, 'tempC': -20, 'levelFt': 17000, 'at': '2026-11-11T21:57:00Z'}
    f = flight()
    f['route'] = {'text': 'LFPO MOPAR KOLIV VEPET PETAX EGKB', 'dep': 'LFPO', 'arr': 'EGKB',
                  'points': [{'id': i, 'lat': la, 'lon': lo, **({'wind': wind} if w else {})} for i, la, lo, w in pts]}
    f['level'] = {'ft': 17000}
    c.open('maps', docs=fdocs(f), flight=False, airfields=True, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.js("async () => (await import('/modules/maps/layers.js')).toggleLayers(true)")
    c.until("() => window.__t.shown(document.querySelector('.mp-dbody input[data-layer=wind]'))", timeout=8000, what='the Layers content has the wind barbs case')
    c.eq(c.js("() => document.querySelectorAll('.mp-dbody input[data-layer=wx]').length"), 0, 'the Weather (wind, cloud) layer is not offered any more', what='wx case')
    names = c.js("() => [...document.querySelectorAll('.mp-dbody .mp-layers label')].map(l => l.textContent.replace(/\\s+/g, ' ').trim())")
    c.ok(not [n for n in names if 'Wetter (Wind' in n or 'Weather (wind' in n or 'Météo (vent' in n or 'Meteo (viento' in n], str(names), 'no label of it in the list')
    c.eq(c.js("() => !!document.querySelector('.mp-dbody .mp-wx-note')"), False, 'no line under it either', what='note')
    c.eq(c.js("() => !!document.querySelector('canvas.sog-weather-map')"), False, 'no weather canvas in the map', what='canvas')
    c.js("([z]) => { window.__mpMap.jumpTo({ center: [2.55, 50.2], zoom: z }); return true }", [8])
    c.wait(1800)
    c.ok(c.js("() => (window.__mp.S.windHits || []).length") >= 3, '', 'the wind barbs of « Winds aloft » are still drawn')



@case('K230', 'The V2 registry reads every YAML through the one guarded function: no direct jsyaml.load left but the function’s own, so a file with shared anchors is refused the same everywhere', 'K',
      tags=('maps',), screens=False, static=True,
      rule='audit 185 (Sécurisation): six direct window.jsyaml.load calls remained (the usage of a mission, the detail view, the generated Markdown twice, the two readers of the previous versions); loadYaml refuses a document beyond 200 000 nodes once its shared references are expanded')
def k_loadyaml(c):
    import re
    src = (ROOT / 'shared' / 'mission_registry.js').read_text(encoding='utf-8')
    direct = re.findall(r'window\.jsyaml\??\.load\(', src)
    c.eq(len(direct), 1, 'one direct call: the one inside loadYaml itself', what=str(len(direct)))



@case('D201', 'The window of the proposed routes on a Map alone: the first route is shown and is the current choice from the opening, « Choose this route » is always active and takes it; a touch on another row changes the current choice (it does not unselect)', 'D',
      tags=('maps',), screens=False, designs=('standard',), langs4=True,
      rule='SOG-0224 refused again (the user, 13 Nov: « « choisir cet itinéraire » inefficient »; the ergonomist: a dead button without a reason is the defect): the button was disabled until a row was touched, a second touch on the same row took the selection away; now the first route is the current choice, the button never dead')
def d201(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps', flight=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!window.__mp.S.route && window.__mp.S.route.points.length >= 2", timeout=15000, what='the flight is read')
    c.js("(d) => { window.dispatchEvent(new CustomEvent('fuel-route-alts', { detail: d })); return true }", _alts_doc())
    c.until("() => !!document.querySelector('.mp-alts:not([hidden]) [data-alttake]')", timeout=8000, what='the window of the proposed routes is there')
    st = c.js("() => ({ dis: document.querySelector('[data-alttake]').disabled, shown: window.__mp.S.altShow, marked: [...document.querySelectorAll('.mp-alts [data-alt]')].map(b => b.dataset.shown || '0') })")
    c.ok(st['dis'] is False and st['shown'] == 0 and st['marked'] == ['1', '0'], str(st), 'the first route is shown and marked, the button is active from the opening')
    c.js("() => { document.querySelector('.mp-alts [data-alt=\"1\"]').click(); return true }")
    c.wait(300)
    st = c.js("() => ({ dis: document.querySelector('[data-alttake]').disabled, shown: window.__mp.S.altShow, marked: [...document.querySelectorAll('.mp-alts [data-alt]')].map(b => b.dataset.shown || '0') })")
    c.ok(st['dis'] is False and st['shown'] == 1 and st['marked'] == ['0', '1'], str(st), 'a touch on another row changes the current choice')
    c.js("() => { document.querySelector('.mp-alts [data-alt=\"1\"]').click(); return true }")
    c.wait(300)
    st = c.js("() => ({ dis: document.querySelector('[data-alttake]').disabled, shown: window.__mp.S.altShow })")
    c.ok(st['dis'] is False and st['shown'] == 1, str(st), 'a second touch on the same row does not take the selection away')
    c.shot(f'D201_standard_alts_{c.lang}_delivered.png')
    c.js("() => { document.querySelector('.mp-alts [data-alt=\"0\"]').click(); window.__hs = []; window.addEventListener('hashchange', e => window.__hs.push(new URL(e.newURL).hash)); return true }")
    c.wait(200)
    c.js("() => { document.querySelector('[data-alttake]').click(); return true }")
    c.until("() => window.__hs.length >= 1", timeout=6000, what='« Choose this route » goes to Fuel')
    c.eq(c.js("() => window.__hs[0]"), '#fuel?ralt=0', 'the current choice is what the button takes', what='address')



@case('D202', 'Proposed routes across TWO screens (Fuel, then the Map alone, then Fuel, then the Map): left unchosen they are still there in Fuel after a round trip; chosen on the Map, the route is taken in Fuel and the window does not come back on the Map', 'D',
      tags=('maps', 'fuel'), screens=False, designs=('standard',),
      rule='SOG-0224 refused again (the user, 13 Nov: « si on laisse les itinéraires et qu’on affiche la carte, il y a une popup. elle ne disparaît pas ; retour carbu : plus d’itinéraire à choisir ; retour carte : toujours la popup », and « si on n’a pas choisi l’itinéraire, aller-retour vers carte, les itinéraires disparaissent »): Fuel (modules/fuel/module.js, Features SOG) loses its proposals when its screen is left, and its path #fuel?ralt= (altsFromAddress) nulls S.alts before routeTake, so altsClear() publishes nothing and route_alts.json keeps the old proposals; a known failure until Fuel is fixed')
def d202(c):
    from cases import fuel as F
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    F._route_launcher(c, ['route/compute'])
    F.open_proc(c)
    c.until(f"!!document.querySelector('{F.FUEL} [data-reng]:not([hidden]) [data-do=rcompute]')", timeout=10000, what='the two buttons')
    c.tap(f'{F.FUEL} [data-do="rcompute"]')
    c.until(f"document.querySelectorAll('{F.FUEL} [data-altlist] [data-alt]').length === 3", what='three proposals in Fuel')
    card = "() => { const k = document.querySelector('.mp-alts'); return { on: !!k && !k.hidden, rows: k ? k.querySelectorAll('[data-alt]').length : 0 } }"
    c.wait(3000)      # leaving Fuel at once makes its own ATIS read fail on the unmounted screen (flightNetworks: « reading 'ctx' », modules/fuel/module.js, Features SOG, handed over): the user does not leave in 100 ms
    # 1. the Map alone shows the window; back to Fuel WITHOUT choosing: the proposals are still there
    c.js("() => { location.hash = '#maps' }")
    c.until("() => !!document.querySelector('.mp-alts:not([hidden]) [data-alttake]')", timeout=10000, what='the window of the proposed routes on the Map')
    c.js("() => { location.hash = '#fuel' }")
    c.wait(2500)
    n = c.js(f"document.querySelectorAll('{F.FUEL} [data-altlist] [data-alt]').length")
    c.eq(n, 3, 'back in Fuel without having chosen: the three proposals are still there', what='proposals in Fuel')
    # 2. the Map alone again, « Choose this route » (the first, the current choice): Fuel takes it; the window does not come back
    c.js("() => { location.hash = '#maps' }")
    c.until("() => !!document.querySelector('.mp-alts:not([hidden]) [data-alttake]')", timeout=10000, what='the window again')
    c.js("() => { document.querySelector('.mp-alts [data-alttake]').click(); return true }")
    c.until(f"!!document.querySelector('{F.FUEL} [data-rtaken]')", timeout=12000, what='Fuel says the route is taken')
    c.eq(c.count(f'{F.FUEL} [data-routealts] [data-alt]'), 0, 'no proposal left in Fuel', what='proposals in Fuel')
    c.wait(3000)      # (same reason as above: Fuel is left after its own reads)
    c.js("() => { location.hash = '#maps' }")
    c.wait(2500)
    c.eq(c.js(card), {'on': False, 'rows': 0}, 'back on the Map: no window, no proposal', what='window')



# What each layer reads when « Around the flight only » is ticked, and when it is not: one row per layer (the list of SOG-0246); a far item sits 200 NM north of the route, a near one on it
_CORR_EXTRA = {
    'aerodromes': [{'icao': 'LFNR', 'name': 'NEAR AD', 'lat': 47.2, 'lon': -1.55, 'elev': 100}, {'icao': 'LFFR', 'name': 'FAR AD', 'lat': 49.2, 'lon': 2.0, 'elev': 100}],
    'navaids': [{'id': 'NRV', 'name': 'NEAR VOR', 'type': 'VOR', 'lat': 47.1, 'lon': -1.5, 'freq': 113.0}, {'id': 'FRV', 'name': 'FAR VOR', 'type': 'VOR', 'lat': 49.1, 'lon': 2.1, 'freq': 114.0}],
    'vrp': [{'code': 'NV', 'name': 'NEAR VRP', 'icao': 'LFNR', 'lat': 47.18, 'lon': -1.6}, {'code': 'FV', 'name': 'FAR VRP', 'icao': 'LFFR', 'lat': 49.15, 'lon': 2.05}],
    'cities': [{'name': 'NEARTOWN', 'lat': 47.16, 'lon': -1.58, 'pop': 90000}, {'name': 'FARTOWN', 'lat': 49.0, 'lon': 2.2, 'pop': 90000}],
    'points': [{'id': 'NEARP', 'lat': 47.14, 'lon': -1.5, 'type': 'RNAV'}, {'id': 'FARP', 'lat': 49.05, 'lon': 2.0, 'type': 'RNAV'}],
    'cells': {str(y): [[-4, 8]] for y in range(41, 51)},
}
_FAR_BIG = {'type': 'TMA', 'cls': 'D', 'name': 'TMA FARNORD', 'lower': 'FL200', 'upper': 'FL300', 'rings': [[[48.8, 1.6], [48.8, 2.6], [49.4, 2.6], [49.4, 1.6], [48.8, 1.6]]]}
_CORR_LAYERS_JS = r"""async (corr) => { const S = window.__mp.S, D = await import('/modules/maps/data.js');
  S.profile = { ...S.profile, elements: { ...S.profile.elements, aerodromes: true, navaids: true, vrpPoints: true, rnavPoints: true, mora: false, obstacles: false }, cities: true, otherZones: false };
  await D.refresh({ w: -4, s: 41, e: 8, n: 50.5 }, corr);
  for (let i = 0; i < 30 && !(S.data && S.data.corridor === corr && S.data.box.n >= 50 && S.data.box.w <= -4); i++) { await new Promise(r => setTimeout(r, 200)); await D.refresh({ w: -4, s: 41, e: 8, n: 50.5 }, corr) }
  const d = (S.data && S.data.data) || {}, names = k => (d[k] || []).map(x => String(x.name || x.icao || x.id || x.code || ''));
  return { corridor: S.data && S.data.corridor, aerodromes: names('aerodromes'), navaids: names('navaids'), vrp: names('vrp'), cities: names('cities'), points: (d.points || []).map(x => x.id), airspaces: names('airspaces') } }"""


@case('D203', 'Ticked, « Around the flight only » acts on every layer read around the plan: the aerodromes, navaids, VRP, towns, RNAV points and the big airspace families are read in the corridor of the route only; unticked, the whole view', 'D',
      tags=('maps',), screens=False, designs=('standard',),
      rule='SOG-0246 refused again (the user, 13 Nov: « a un effet, mais pas sur tout. manque : airspaces, AD, peut-être d’autres »): only the small airspaces and the airways followed the box; the aerodromes, navaids, MORA, obstacles, towns, VRP and RNAV points were read over the whole view, and the big families (FIR to CTR) by SOG-0169’s exception; one case per layer: a far item 200 NM off the route is absent ticked, present unticked')
def d203(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    c.open('maps?view=-4,41,8,50.5', flight=True, airfields=True, airspaces=[_FAR_BIG], aero_extra=_CORR_EXTRA, wait=False)
    c.ready('maps', sheet=True)
    c.js(_STATE_JS)
    hook_map(c)
    c.until("() => !!(window.__mp.S && window.__mp.S.data && window.__mp.S.data.box)", timeout=12000, what='the first reading')
    free = c.js(_CORR_LAYERS_JS, 0)
    far = {'aerodromes': 'FAR AD', 'navaids': 'FAR VOR', 'vrp': 'FAR VRP', 'cities': 'FARTOWN', 'airspaces': 'TMA FARNORD'}
    for k, n in far.items():
        c.ok(n in free[k], f'{k}: {free[k]}', f'unticked ({k}): the far item is read, the fixture is valid')
    c.ok('FARP' in free['points'], str(free['points']), 'unticked (RNAV points): the far point is read')
    ticked = c.js(_CORR_LAYERS_JS, 10)
    for k, n in far.items():
        c.ok(n not in ticked[k], f'{k}: {ticked[k]}', f'ticked ({k}): the far item, 200 NM off the route, is not read')
    c.ok('FARP' not in ticked['points'], str(ticked['points']), 'ticked (RNAV points): the far point is not read')
    near = {'aerodromes': 'NEAR AD', 'navaids': 'NEAR VOR', 'vrp': 'NEAR VRP', 'cities': 'NEARTOWN'}
    for k, n in near.items():
        c.ok(n in ticked[k], f'{k}: {ticked[k]}', f'ticked ({k}): the item on the route is read')



@case('D204', 'Ground signs in the real airfield colour code, not the design’s: a taxiway yellow on black, a holding point white on red showing the mark only (never « W28@02/20 »), an apron black on white, a runway number white on black; every pair readable (contrast 4.5 or more)', 'D',
      tags=('maps',), designs=('standard',), night=False, phone=False,
      rule='SOG-0297 / SOG-0252 (the user, 13 Nov, his note: « le code couleur d’un TWY, c’est noir sur jaune pour une direction, jaune sur noir pour une indication. RWY : blanc sur rouge (point d’arrêt), ou blanc sur noir sur le tarmac. Apron : noir sur blanc »; the ergonomist: the colours of the aerodrome, not the design’s; AeroDB: the hold’s name is the mark, the runway apart)')
def d204(c):
    c.page.set_viewport_size({'width': 1280, 'height': 760})
    _ground_open(c)
    c.js("""async () => { const S = window.__mp.S, fx = await S.ctx.aerodb.ground('LFPO');
      const items = fx.items.concat([{ id: 'ap-U', kind: 'apron', name: 'U', point: [2.3794, 48.7233], line: [[2.376, 48.7225], [2.383, 48.7225], [2.383, 48.7245], [2.376, 48.7245]] }]);
      S.ctx.aerodb.ground = async icao => icao === 'LFPO' ? { ...fx, items } : null; S.ground = null; S.runwayZoom = 11;
      S.runways.set('LFPO', [{ id: '02', lat: 48.7167, lon: 2.3665, qfu: 20 }, { id: '20', lat: 48.7302, lon: 2.3733, qfu: 200 }]); S.rwySigns = []; return true }""")
    _ground_at(c, 15, 1800)
    c.js("() => { window.__mp.S.map.panBy([3, 3], { duration: 0 }); return true }")
    c.wait(1500)
    r = c.js("""() => { const g = window.__mp.S.ground, signs = g.signs || [];
      const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
      const by = k => signs.filter(s => s.kind === k), pair = a => [...new Set(a.map(s => s.bg + '/' + s.fg))];
      const rw = window.__mp.S.rwySigns || [];
      return { twy: pair(by('twy')), nTwy: by('twy').length, hold: pair(by('hold')), nHold: by('hold').length, apron: pair(by('apron')), nApron: by('apron').length, rwy: [...new Set(rw.map(s => s.bg + '/' + s.fg))], nRwy: rw.length,
        holdNames: by('hold').map(s => s.id), minContrast: Math.round(Math.min(...signs.map(s => cr(s.bg, s.fg)), ...rw.map(s => cr(s.bg, s.fg))) * 100) / 100 } }""")
    c.ok(r['nTwy'] >= 3 and r['twy'] == ['#000000/#ffcc00'], str(r), 'taxiway signs: yellow on black')
    c.ok(r['nHold'] >= 3 and r['hold'] == ['#c8102e/#ffffff'] and not [n for n in r['holdNames'] if '@' in n or '＠' in n], str(r), 'holding points: white on red, the mark only (no « @runway »)')
    c.ok(r['nApron'] >= 1 and r['apron'] == ['#ffffff/#000000'], str(r), 'aprons: black on white')
    c.ok(r['nRwy'] >= 1 and r['rwy'] == ['#000000/#ffffff'], str(r), 'runway numbers: white on black')
    c.ok(r['minContrast'] >= 4.5, str(r), 'every pair reads (contrast 4.5 or more)')
    c.shot('D204_standard_signs_15_delivered.png')
