# maps — integration

How the frame mounts the map module and what it needs from the frame, aerodb and fuel. Specification:
[SPEC.md](SPEC.md). Decisions: [DECISIONS.md](DECISIONS.md).

## 1. Declaration

```js
export const meta = {
  id: 'maps', apps: ['pilot'], level: 1,
  fixed: true,                                                                // the fixed, full-height view (frame INTEGRATION § 9.2)
  reads: ['pilot/', { prefix: 'missions/', policy: 'reference' }, 'cache/maps/', 'cache/weather/'],
  writes: [{ prefix: 'cache/maps/', policy: 'cache' },                        // map mode and layers, per device
    { prefix: 'cache/weather/', policy: 'cache' },                            // the shared weather cache (§ 8): read only, declared as atmosphere's doc asks
    { prefix: 'pilot/', merge: 'record' }],                                   // the current flight, edited on the map
  files: ['render.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/profiles.js?v=0', 'lib/map_base.js?v=0', '../../frame/lib/js-yaml.min.js?v=0',
    '../../frame/lib/geo.js?v=0'],                                               // kept at installation
  lazy: ['lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0', 'lib/outlines.js?v=0',     // kept at first use
    '../atmosphere/section.js?v=0', '../atmosphere/atmo.js?v=0', '../atmosphere/weather_store.js?v=0', '../fuel/winds.js?v=0']
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod']  // called by MapLibre itself
};
```

## 2. What the frame must provide

- **The menu entry**: `{ id: 'maps', label: ['Carte', 'Map', 'Karte', 'Mapa'], icon: '⌖' }` in `APP.modules` of
  `frame/app.js`, after fuel (added by the module itself in lot 3, as the other modules did). `tools/csp_policy.py`
  reads `meta.net` from it. `modules/maps/test/index.html` also mounts the module on its own.
- **`meta.lazy`** (frame lot 8): files kept by the service worker at their first use, not at installation. MapLibre
  (1 MB) is only needed with tiles.
- **`meta.net`** (frame lot 8): the public hosts that a module's library calls directly, added to `connect-src` with
  and without a launcher. `worker-src blob:` (MapLibre's worker) is already in the CSP.
- `ctx.data` (read `pilot/`, `watch`), `ctx.aerodb`, `ctx.t`, `ctx.identity.trigram`.

## 2 bis. Missions (V2 studio and generator)

- The module reads `missions/<l>_<FAMILY>/<ID>/mission<ID>.yaml` on demand ("reference": never pulled ahead; the
  folders hold PNG files, received texts and versions). It writes nothing there.
- Since develop ea077ae36 (v3 f799f8429), the studio writes the drawing fields: `maps[].profile_def`,
  `resolved_bbox`, `cycle`; `vertical_profile.profile_def`, `cycle`, `route_points`. The registry ignores them when it
  compares versions, and carries them over to a new version map by map.
- Built-in profiles: `modules/maps/lib/profiles.js`, generated from the studio by `tools/build_maps_profiles.py`. Run
  it again when `defaultProfiles` changes (`BASE_PROFILES_VERSION`).

- **Icons**: `frame/lib/icons.js` (`svg`), imported by the module; `wand-sparkles` added there for the map modes
  (owner: design, the frame session told).

- **Display profiles of the modes**: `airline/map_profiles.json` (read, followed; written by the administrator's tuning
  page `#maps?tune=1`), schema in SPEC.md § 4 quinquies. `meta.reads` has `airline/`, `meta.writes` has that file with
  the `record` merge. The pilot's `fuel.json` (`displayAlt`) gives the contour interval.

- **Started flight** (lot 8), read from the current flight: `started` (drawn while not null) and fuel's `progress`
  (INTEGRATION § 3 of fuel, lot H: `at`, `plannedPos { lat, lon, legIndex, nmFromDep }`, `eta [{ id, at }]`,
  `fuelRemainingKg`, `remainingNm`, `phase`). The ETA labels of the route points also show for a flight that is **not started**
  when fuel wrote `progress.eta` from the current flight's `planned_at` (the flight date; arrival still in the future), counted from
  `planned_at` instead of `started.at` (24 Oct 2026). The actual position is the frame's, `progress.actual`, read as below until
  the frame's SPEC fixes it:

```json
{ "actual": { "lat": 46.0, "lon": 0.3, "altFt": 26000, "trackDeg": 128, "gsKt": 250, "at": "2026-10-23T12:27:10Z",
              "source": "gps", "trail": [{ "lat": 46.2, "lon": 0.1, "at": "2026-10-23T12:20:00Z" }] } }
```

  `source`: `gps`, `network`, `ivao`, `vatsim`, `xplane` or `lnm` (frame lot 16; another value is accepted, shown
  without a label); `trail` optional (the map keeps its own 30-minute trail from the successive
  positions); `trackDeg` optional (bearing from the previous position); `gsKt` optional (250 kt).

## 2 ter. The fixed view (`meta.fixed`)

Since 24 Oct 2026 the Map screen is a fixed view (frame/INTEGRATION.md § 9.2): the frame puts `f-fixed` on `<html>` while
it is shown, the page does not scroll, and the module root (`section.f-module[data-module="maps"]`) is a full-height flex
column with no padding. The module draws into it the map (`flex: 1 1 0; min-height: 0`) and the data sheet (fixed height,
three positions: SPEC § 4): **nothing between the frame's header and the map** (24 Oct 2026). The map's buttons are the frame's
overlay layer (`ctx.overlay.button()`, § 2 quater below). What the module's own style sheet adds, because the frame
does not give it:

- **The dual-view pane and the map on the left of a pane** take their height from the frame (frame/INTEGRATION.md § 9.2):
  the module declares `fixed`, so the frame gives the root `--f-split-h` in the split main and `--f-pane-h` in the pane
  (`--f-view-h` is context-aware), and the module no longer writes any height of its own: its two copies of the numbers
  (`100dvh − 86 px − 44 px`, `100dvh − 57 px − 32 px`) are gone with the root's `height: 100%`. What stays is the module's
  own floor, `min-height: 420px` in both places.
- **The tuning page** (`#maps?tune=1`) needs a scrolling page, and `fixed` is a property of the module, not of an address:
  the root scrolls by itself in that case (`overflow: auto`, grid from 1000 px, with a plain `display: grid`: the frame's
  `display: flex` rule for a fixed module is weightless, `:where()`, § 9.2 of the frame's INTEGRATION).
- The root has `isolation: isolate` (the z-indices 3 to 8 of the map's panels stay below the frame's header and tab bar; the
  overlay layer is a sibling of the root, above it).
- The test page `modules/maps/test/index.html` gives the host `height: calc(100dvh - 24px)` (the root has no height of
  its own any more: in the frame it is the frame's).

## 2 quater. The overlay layer (`ctx.overlay`, frame/INTEGRATION.md § 9.3) and the full screen (§ 9.4)

- **Buttons** (`ov.button({ icon, label, onClick, pressed, side })`, `ov.over(box)` to name the map box): right column, from the
  top: Edit the route (`edit`, towards fuel), Recentre (`target`), map mode (`map`, then the current mode's own icon), Edit on
  the map (toggle; the module's four-arrow icon), Follow (`plane`, toggle, started flight only), Add a point (`plus`, toggle) and
  Undo (the module's back-arrow icon) in the Edit mode only; the frame's full-screen button follows them. Left column: Layers
  (`layers`, pressed while its content is open: the content is the sheet's, opened by `openData('layers', …)`, not a panel
  over the map). Names through `ctx.t` in the four languages, written on a change only.
- **Icons the frame does not have** (not added to `frame/lib/icons.js`): a cloud (the weather chip of the sheet), a back arrow
  (undo) and a four-arrow cross (the frame's `move` is a vertical double arrow); the module draws them with the same grid, stroke
  and class (`f-icon`). To say to the frame session if it wants them in its set.
- **`hidden`**: the layer's button rule (`.f-overlay button.f-ov-btn`, `display: inline-flex`, three classes) beats the browser's
  `[hidden]`; the module adds `.f-overlay button.f-ov-btn[data-mp][hidden] { display: none }` for its buttons (each carries
  `data-mp`). To say to the frame session: the frame could carry the rule for every `.f-ov-btn`.
- **Without a layer** (`ctx.overlay` null: the test page): the module builds the same two columns (`.f-overlay`) inside the map box
  with the same classes.
- **Escape** is taken in the capture phase on `document` (the frame's listener, registered first, would otherwise run before the
  module's and see `defaultPrevented` too late); `preventDefault()` only when something was closed.
- **Full screen**: the module does nothing of its own; the box's `ResizeObserver` runs `mapSize()` (MapLibre `resize()` when the
  canvas differs) and redraws; the `resize` the frame fires on `window` reaches the same path.

## 3. What it asks of aerodb

`airspaces`, `aerodromes`, `navaids`, `airways`, `moraCells` and `obstacles` by `bbox`; `coords` (the alternate);
`status().published` and `status().cycle`; `on('change')`. For mission maps also `vrp`, `points` and `cities`, by
`bbox`. Everything is read only for the area shown or the route's corridor.

- **VFR reporting points** (aerodb SPEC § 5 quater): `vfrRoutes(icao)` for a hovered or pinned aerodrome, and for
  departure and arrival in VFR mode.

## 4. What it reads from fuel

`pilot/<trigram>/current_flight.json`: `route.points` (resolved positions, optional `alt_ft`), `route.dep / arr /
altn`, `level.ft`, `aircraft.type`, and `profile: { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` for the
vertical profile (drawn as fuel computed it; without it, the profile computes its own). "Edit the route" opens
`#fuel?from=maps&focus=route`: fuel shows its Route step with the text field focused (in the dual view, the frame
keeps the module and fuel scrolls to that step).

- `route.points[].alt_ft` follows fuel's INTEGRATION § 3 (fuel lot C): the level held from that point on, never on
  the first or the last point; the flight leaves at `level.ft`; a point without it keeps the previous level. The
  profile then draws the steps and computes TOC and TOD per segment.
- **Writes** of the Edit mode go through `frame/lib/current_flight.js` (fuel's rule, its INTEGRATION § 3):
  `merge(record read just before, { route, level }, { fields: ['route', 'level'], by: 'maps' })`, without
  `progressKeys`: the map replaces only `route` and `level`, never `progress` (the planned part is fuel's, `actual` the
  frame's) nor fuel's other fields; `updated_at` is then set to the version shown (the live view takes only a newer one).
- Missions keep the studio's meaning for `route_points[].alt_ft`: the altitude reached at the point (`mission.js`).
- Every write of the file redraws the map and the profile (debounced 300 ms).
- **Maps writes the record** when the route is edited on the map (lots 6a and 6b): `route.points`, `route.text`
  (`textFromPoints` of `frame/lib/route_text.js`, owned by fuel: airways of unchanged segments kept), `level.ft` when
  the first segment's level changes, `distanceNm`, `trackDeg`, `from: 'points'`, `manual: false`, `by: 'maps'`,
  `updated_at`, on the latest version read; every other field is kept. Fuel requotes on `by` ≠ `fuel`; until then
  maps draws its own TOC and TOD.
- `frame/lib/route_text.js` is imported by the module and kept at installation (`meta.files`).
- `route.points[].wind` (fuel lot F) is drawn as barbs; absent, nothing is drawn.
- **Longitudes**: `route.points` are read in [-180, 180[ as fuel writes them and unrolled by the module (`frame/lib/geo.js`,
  frame INTEGRATION § 12), so a flight across the date line is one continuous route; what the module writes back (Edit mode) is
  wrapped again. `modules/fuel/winds.js samples` does the same for the points it asks Open-Meteo about.

## 5. Costs (measured, see DECISIONS.md)

- **Code**: core, profile and symbols about 145 KB (kept at installation); outlines 350 KB at the first plain
  background (or ahead when MapLibre is not cached); MapLibre 1 MB at the first tiled map.
- **Terrain**: 7 to 20 Terrarium tiles for a 100 to 370 NM route (zoom 9).
- **Data**: France IFR route LFRS → LFML: France's meta, airspaces (2.8 MB), aerodromes, navaids, airways and MORA,
  plus about 100 KB of Spain and Switzerland (no airspaces): 3.64 MB, then from the frame's cache.

## 6. The data sheet: what another module may show in it

The sheet under the map shows one content at a time (SPEC § 4). The module's entry point is
`openData(kind, key, title, build, label = title)`; `closeData()` / `endData(kind)` close it. A content is drawn **by
maps**, never by another module reaching into the sheet.

- `kind`: the content's family (`'lv'` airspaces, `'ad'` aerodrome, **`'weather'`** the cross-section).
- `key`: its identity. A new key opens it fresh (scrolled to the top; a collapsed sheet opens to its default position,
  with no slide); the same key redraws it and keeps the scroll.
- `title`: the sheet's header line (one line, ellipsed; `label` is the full name for the tooltip and the screen reader).
- `build(w, h, el)`: called with the pixel width and height of the content area and the area itself. It either **returns an
  HTML string** (the existing contents; written only if it changed) **or draws into `el` and returns nothing** (SVG,
  canvas; `el` is emptied when the key is new, and the builder replaces its own drawing when called again with the same
  key). The content area scrolls; its height is the sheet's, so draw for `h` and let the rest scroll.

**The sheet is the frame's** (24 Oct 2026, frame/INTEGRATION.md § 11). Maps imports `createSheet` from
`../../frame/lib/sheet.js`; the module root carries the class `f-sheet`, the data block is the `.f-sheet-panel`, its header the
`.f-sheet-head`, the handle button the `.f-sheet-grip`, the ✕ the `.f-sheet-close` and the scrolling area the `.f-sheet-body`
(maps' own classes `mp-data`, `mp-dhead`, `mp-grip`, `mp-dbody` stay beside them for the module's code). The three positions are
the frame's tokens (`--f-sheet-head`, `-default`, `-expanded` and their floors), the drag, the flick, the keyboard, the
ARIA and the transitions are the primitive's, and `data-sheet` on the root is `collapsed`, `default` or `expanded`. What stays
in maps: `openData` / `endData` / `closeData` / `dataHead` (the content and the header's texts: the handle's title carries the flight's
summary), the Profile · Weather chips (`ignore: '[data-dclose], .mp-chips'`), the grip's texts (`labels`, four languages), the notes, the position kept between
mounts (`sheetKeep`, through `onChange`), `locked` (the tuning page) and `onSettle` (`mapSize()` and the route's re-framing).

**The atmosphere cross-section** is implemented (24 Oct 2026): § 8.

## 7. Map base for other modules — `lib/map_base.js`

What the map module and the atmosphere module do the same way to have a map, and nothing more: MapLibre loaded once, the base
styles, the tiled base (creation, waiting, giving up), the map brought to its box's size, and the plain background when tiles
do not come. Owned by maps; an ES module with no state of its own and **no module state inside** (every function takes the map,
the box and options and returns a handle; the only singletons are the loaded MapLibre and the loaded outlines, shared on
purpose). Behaviour is the one that `modules/maps/module.js` had inline (checked pixel for pixel on `#maps`, 390 and 1280,
with and without tiles).

```js
import { loadMapLibre, styleFor, startTiles, mapSize, isOwnResize, loadRender, loadOutlines, plainView, drawPlain,
         STYLE_DAY, STYLE_NIGHT, STYLES, TILE_WAIT } from '../maps/lib/map_base.js';
// declare in the module's meta: files '../maps/lib/map_base.js?v=0'; lazy '../maps/lib/maplibre-gl.js?v=0',
// '../maps/lib/maplibre-gl.css?v=0', '../maps/lib/outlines.js?v=0'; net 'tiles.openfreemap.org'
```

| Function | Contract |
|---|---|
| `loadMapLibre()` → `Promise<maplibregl \| null>` | script UMD and style sheet of `lib/`, once per page; `null` if the script does not load (the next call tries again) |
| `styleFor({ dark, base })` → URL | `base`: a key of `STYLES` (the studio profile's base), else `STYLE_DAY` (positron); `dark`: `STYLE_NIGHT`, or VersaTiles' eclipse for a `vt-` base |
| `startTiles(container, opts)` → `Promise<map \| null>` | the tiled map in `container`, once loaded; `null` when offline, MapLibre missing, no WebGL, an `error` before `load`, `wait` ms elapsed (default `TILE_WAIT` 10 s) or `alive()` false; the half-built map is removed. `opts`: `style`, `bounds` (`[[w, s], [e, n]]`), `padding` (px, optional), `attributionControl` (`false`, or `{ compact: true, customAttribution }`: the control is folded on its "i" button once the map has loaded, a tap opens it), `wait`, `alive()`, `onCreate(map)`, `onStyleLoad(map)` (every `style.load`: the first style and each `setStyle`), `onLoad(map)` (before the promise is kept: wire the events there). Mercator is forced at every style; no rotation, no pitch. `worldCopies` (default `false`): MapLibre's `renderWorldCopies`; with `false` the camera is clamped to ±180° and a route across the date line cannot be framed; with `true` the centre may be 190° or −174°, and `getBounds()` / `project()` go beyond ±180, so the host brings its longitudes to the view's copy (`nearLon` of `frame/lib/geo.js`). The Map passes `true`; Atmosphere keeps its grid on the route's own turn and the default |
| `mapSize(map, box)` → boolean | `map.resize()` only if the canvas is not the box's size; true when it resized. Call it on every size change, at load and style change, on return of a hidden tab (`visibilitychange`, `pageshow`) and at each draw |
| `isOwnResize(map)` → boolean | true during the `resize()` that `mapSize` runs: its `movestart` is not a user gesture (`map.on('movestart', () => { if (!isOwnResize(map)) userMoved = true })`) |
| `loadRender()` → `Promise` | loads `render.js` (`window.MapsRender`) if it is not there |
| `loadOutlines()` → `Promise` | loads `lib/outlines.js` (`window.MAPS_OUTLINES`, 350 KB), once; rejects (and the next call tries again) if it does not come |
| `plainView(fit, W, H, pad = 12)` → `{ toC(lat, lon), toLL(x, y), shown }` | Mercator fitting the box `fit` (`{ w, e, s, n }`) in W × H, north up (`MapsRender.mercator`; `loadRender()` first) |
| `drawPlain(ctx, toC, W, H, colors)` | sea, then land from the outlines (sea only until they arrive); `colors` `{ sea, land, border }`, day defaults |
| `STYLE_DAY`, `STYLE_NIGHT`, `STYLES`, `TILE_WAIT` | the constants |

What stays in each module: what the map does once loaded (events, overlay canvas), when to fall back to the plain background,
the redraw loop, the credit line. Atmosphere's session replaces its copy of `loadMapLibre`, its `STYLE_DAY` / `STYLE_NIGHT` /
`TILE_WAIT` constants, `loadRender`, `loadOutlines` and the body of its `startTiles` by calls: `startTiles($('map'), { style:
styleFor({ dark: dark() }), bounds: [[b.w, b.s], [b.e, b.n]], attributionControl: { compact: true }, wait: 8000, alive: () => alive,
onLoad: map => { … } })` (its handlers are unchanged; its own `movestart` handler should also test `!isOwnResize(map)`).
Differences to know: errors before `load` always give up (atmosphere's copy gave up only if `!map.loaded()`); Mercator is set
at each `style.load` (a no-op for the default style).

## 8. The weather cross-section: what maps reads from atmosphere

The sheet's "Weather" content (SPEC § 4) calls atmosphere's pure renderer. Nothing is written, nothing is asked of Open-Meteo.

- **Files** (`meta.lazy`, loaded by a dynamic `import()` at the first "Weather"): `../atmosphere/section.js` (`drawSection`,
  `sectionPlaces`, `sectionVars`, `sectionModel`), `../atmosphere/atmo.js` (`locations`, `modelFor`, `cruiseKtOf`),
  `../atmosphere/weather_store.js` (`weatherStore`), and `../fuel/winds.js` (imported by `atmo.js`).
- **`cache/weather/`** is in maps' `meta.reads` and `meta.writes` (policy `cache`), as atmosphere's INTEGRATION § 3 / § 5
  asks: the store prunes past days when it is read. The store is built with the module's `ctx.data` and **a network that
  always answers "offline"** (not `ctx.net`): `forecast(…, { cacheOnly: true })` still asks the model's last-run time
  (`meta.json`, a static file) and maps does not even do that; it takes the run atmosphere kept in
  `cache/weather/<model>/meta.json`, so a file is valid exactly when atmosphere would have found it valid.
- **What is read**: the model `modelFor(mid.lat, mid.lon).id` of the middle route point, `sectionPlaces(points)` and
  `sectionVars(levelFt, points)` with `points` = the flight's `route.points` as atmosphere reads them (`id`, `lat`, `lon`,
  `alt_ft`), `levelFt` = `level.ft` (else `quote.levelFt`), two UTC days. Anything missing: `null`, and the sheet says "No forecast
  loaded". A level or a departure time that was changed in atmosphere's own screen (not in the flight) reads other variables or
  hours and may not be found: the flight record is the only thing maps looks at.
- **What is drawn**: `drawSection(el, { route, levelFt, profile, depTime, cruiseKt, locs, labels, id: 'mp-wx', model, width,
  height, cursorM, dark })`. `profile` is the flight's `profile` only when fuel wrote it (`by` absent or `fuel`; the map's
  own edits make it stale: default rates then); `depTime` the flight's `weather.when` or the next full hour; `cruiseKt` from the
  route text, else 200; `labels.strips` are maps' own four-language texts (the five surface strips). **`model` is passed**
  (`sectionModel(…)` computed once per flight): the sheet is redrawn on each step of a drag and each cursor move, and the
  model is the costly part. `drawSection` accepts it (`o.model || sectionModel(…)`) but INTEGRATION § 5 of atmosphere does not
  document it: **atmosphere's session should add it there**. `width` and `height` are the content area's minus its padding
  (16 and 12 px). `id` keeps the SVG definitions distinct from atmosphere's own screen (dual view).
- **The cursor**: `cursorM` = maps' `S.cursor` (metres from the departure), and a tap on the drawn section calls the same
  `setCursor` with `geo.nmOf(x) × 1852`, using the geometry `drawSection` returns.
