# maps — integration

How the frame mounts the map module and what it needs from the frame, aerodb and fuel. Specification:
[SPEC.md](SPEC.md). Decisions: [DECISIONS.md](DECISIONS.md).

## 1. Declaration

```js
export const meta = {
  id: 'maps', apps: ['pilot'], level: 1,
  fixed: true,                                   // the fixed, full-height view (frame INTEGRATION § 9.2); no help card (the frame
                                                 // draws none for a fixed module: `help` is not set); the header's "?" opens
                                                 // #help?m=maps with the anchor given by ctx.helpAnchor (SPEC § 4)
  reads: ['pilot/', { prefix: 'missions/', policy: 'reference' }, 'cache/maps/', 'airline/'],   // weather: ctx.weather (§ 8)
  writes: [{ prefix: 'cache/maps/', policy: 'cache' },              // mode, layers, complexity, device thresholds
    { prefix: 'pilot/', merge: 'record' },                          // the current flight, edited on the map (SPEC § 12)
    { prefix: 'airline/map_profiles.json', merge: 'record' }],      // the tuning page's "Save for the airline" (SPEC § 14)
  files: [/* the module's own files */ 'state.js?v=0', 'texts.js?v=0', 'style.js?v=0', 'screen.js?v=0', 'draw.js?v=0', 'data.js?v=0',
    'layers.js?v=0', 'sheet_view.js?v=0', 'profile_view.js?v=0', 'tips.js?v=0', 'lv.js?v=0', 'vfr.js?v=0', 'flight_time.js?v=0',
    'mission_view.js?v=0', 'weather.js?v=0',
    /* its libraries */ 'render.js?v=0', 'render_airspace.js?v=0', 'render_route.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'contours.js?v=0', 'lib/aero_symbols.js?v=0',
    'lib/vertical_profile.js?v=0', 'lib/profiles.js?v=0', 'lib/map_base.js?v=0', 'lib/axis_window.js?v=0',
    /* the frame's */ '../../frame/lib/js-yaml.min.js?v=0', '../../frame/lib/route_text.js?v=0', '../../frame/lib/current_flight.js?v=0',
    '../../frame/lib/flight_time.js?v=0', '../../frame/lib/flight_path.js?v=0',
    '../../frame/lib/time.js?v=0', '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/icons.js?v=0'],
  lazy: ['edit.js?v=0', 'tune.js?v=0',            // the Edit mode, the tuning page: loaded at their first use
    'lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0', 'lib/outlines.js?v=0',
    '../atmosphere/section.js?v=0', '../atmosphere/atmo.js?v=0', '../atmosphere/texts.js?v=0', '../fuel/winds.js?v=0'],   // the cut (§ 8)
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org',           // called by MapLibre itself
    's3.amazonaws.com/elevation-tiles-prod']                         // Terrarium tiles (relief of the profile, hillshade, contours)
};
```

**The module's files** (recoded on 28 Oct 2026, SPEC § 1), all ES modules of `modules/maps/`, none above 60 KB:

| File | Concern |
|---|---|
| `module.js` | `meta`, `mount` (the screen's skeleton, the listeners), `unmount` |
| `state.js` | the mount's state `S` (live binding, `setS`), what lives for the page (`keep`), shared helpers, `got` / `need` for the lazy files |
| `texts.js`, `style.js` | the texts (four languages), the module's style |
| `screen.js` | the overlay buttons and which are shown, empty state, notes and notifications, flight summary, camera, MapLibre or plain background, design and night, the help anchor |
| `draw.js` | the drawing loop of the map (one frame per animation frame), projection across world copies, map size, hillshade, base-map place names, TOC / TOD, the shared route lines |
| `data.js` | the current flight, the path "route + procedures", aerodb's data for the useful area, the live view, the device's and airline's settings |
| `layers.js` | modes, zoom thresholds, the effective profile, the Layers content, the modes panel |
| `sheet_view.js` | the sheet: head, chips, legend, contents, Escape, `onSettle` |
| `profile_view.js` | the vertical profile, the common cursor, the strip, the window on the distance axis |
| `procs.js` | the chosen SID, STAR and approach: the trace, the constraints, the labels, the profile's constraint steps, the aerodrome card's rows |
| `tips.js` | tooltip, winds aloft, a tap on the map |
| `lv.js`, `vfr.js` | the airspaces at a point, an aerodrome's VFR reporting points |
| `flight_time.js` | ETA labels, planned and actual positions, the progress line, Follow |
| `mission_view.js` | mission maps and the flight selector |
| `weather.js` | the weather cut: `ctx.weather.grid` in cache only, atmosphere's renderer, the cut's window, cursor and legend |
| `edit.js` (lazy) | the Edit mode and its writes |
| `tune.js` (lazy) | the tuning page `#maps?tune=1` |

The files import each other by plain relative paths (no `?v=`), so that `state.js` is one instance; the lazy files are loaded
with `import(new URL('edit.js?v=0', import.meta.url))` (`need`), and a drawing never waits for them (`got`).

## 2. What the frame must provide

- **The menu entry**: `{ id: 'maps', label: ['Carte', 'Map', 'Karte', 'Mapa'], icon: '⌖' }` in `APP.modules` of
  `frame/app.js`, after fuel (added by the module itself in lot 3, as the other modules did). `tools/csp_policy.py`
  reads `meta.net` from it. `modules/maps/test/index.html` also mounts the module on its own.
- **`meta.lazy`** (frame lot 8): files kept by the service worker at their first use, not at installation. MapLibre
  (1 MB) is only needed with tiles.
- **`meta.net`** (frame lot 8): the public hosts that a module's library calls directly, added to `connect-src` with
  and without a launcher. `worker-src blob:` (MapLibre's worker) is already in the CSP.
- `ctx.data` (read, `watch`, `list('missions/')`, record writes), `ctx.aerodb`, `ctx.weather` (§ 8), `ctx.t`, `ctx.notify`,
  `ctx.net` (Terrarium tiles), `ctx.identity.trigram`, `ctx.query`, `ctx.overlay` (`button()`, `over(el)`), `ctx.live.enable()`,
  `ctx.helpAnchor` (the paragraph of what is shown, SPEC § 4), `ctx.level` (the device's usage level, read only: the tuning
  page saves for the airline at the Full level only, SPEC § 14; added to the module context by this lot).
- `ctx.airline.transitionFt` (the airline's transition altitude, `airline/settings.json`): fuel already reads it; **the frame's
  INTEGRATION does not list it yet** (`ctx.airline` there: name, site, pages): to add there. Default 5,000 ft.
- **Escape**: the module takes it in the capture phase and calls `preventDefault()` when it closed something; the frame must
  then not leave the full screen (`defaultPrevented`): **to state in frame/INTEGRATION.md § 9.4**.

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

- **The flight in time** (SPEC § 13). The ETAs and the planned position are **derived** by `frame/lib/flight_time.js`:

| Function | Contract |
|---|---|
| `refTime(flight)` → ms \| null | `started.at` when `started` is set (never the presence of `progress`), else `planned_at`, else null |
| `isStarted(flight)` → bool | `started.at` set (never the presence of `progress`) |
| `legTimes(flight)` → `{ pts, cum, min, taxi, total, tocNm, todNm, D }` \| null | `taxi`: `quote.taxiMin` (`TAXI_MIN` = 10 without it); `min`: minutes from brake release at each route point: `quote.legs` (by rank, else by id); without it, from the route: climb at `profile.climbKt` to `tocNm`, descent at `descentKt` from `todNm`, cruise over what is left of `quote.minutes` (one mean speed without a profile); `cum`: NM from the departure (great circle, continuous longitudes); null without two points or a quote |
| `etaOf(flight, now)` → `[{ id, at }]` \| null | `refTime` + the taxi + each point's minutes, ISO UTC; null without a reference time, and once the arrival is past for a flight not started |
| `plannedPositionAt(flight, now)` → `{ lat, lon, legIndex, nmFromDep, phase }` \| null | interpolated on the same times along each leg's great circle (`lon` in [-180, 180[); `phase` `taxi` (at the departure), `climb`, `cruise`, `descent`, `arrived`; null like `etaOf` (no reference time, before engine start, a flight not started whose arrival is past) |

  Pure functions, no state, no write; every reader (the map, the frame's status block, Flights) goes through them. Fuel writes
  `quote.legs` and `quote.taxiMin` (since v3 350db40cf); dropping its own `progress.eta` and `progress.plannedPos` is fuel's
  announced debt (fuel INTEGRATION § 3); it keeps `fuelRemainingKg`, `remainingNm` and `phase`. Bench:
  `frame/lib/test/current_flight.html`. Readings are strict: `quote.taxiMin` and `legs[].min` count only as finite numbers
  (`typeof v === 'number'`), a text or null is absent; longitudes go through `frame/lib/geo.js` (`unwrapLons`, `wrapLon`).
- **The actual position** is the frame's, `progress.actual` (read with `watch`, never written), in the shape below **until the
  frame's INTEGRATION fixes it**:

```json
{ "actual": { "lat": 46.0, "lon": 0.3, "altFt": 26000, "trackDeg": 128, "gsKt": 250, "at": "2026-10-23T12:27:10Z",
              "source": "gps", "trail": [{ "lat": 46.2, "lon": 0.1, "at": "2026-10-23T12:20:00Z" }] } }
```

  `source`: `gps`, `network`, `ivao`, `vatsim`, `xplane` or `lnm` (another value is accepted, shown without a label); `trail`
  optional; `trackDeg` optional (bearing from the previous position); `gsKt` optional (250 kt). Without a position the module
  offers a button that calls `ctx.live.enable()`.

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
  top: Edit the route (`route`, `edit` icon, towards fuel), Recentre (`fit`, `target`), map mode (`mode`, the current mode's
  icon), Edit on the map (`edit`, toggle, `move4`), Follow (`follow`, `plane`, toggle, started flight only), Add a point (`add`,
  `plus`, toggle) and Undo (`undo`, `undo`) in the Edit mode only; the frame's full-screen button follows them. Left column:
  Layers (`layers`, pressed while its content is open). Each button carries `data-mp` = its key. Names through `ctx.t`, written
  on a change only. Every icon is the frame's (`frame/lib/icons.js`: `cloud`, `undo`, `move4` included); `hidden` is respected
  by the frame's rule, the module has none of its own.
- **The modes panel** is placed in the overlay layer (`ov.over(el)`), next to the mode button, so that nothing of the module
  lies over the map outside the frame's layer.
- **Without a layer** (`ctx.overlay` null: the test page): the module builds the same two columns (`.f-overlay`) inside the map box
  with the same classes.
- **Escape** is taken in the capture phase on `document` (the frame's listener, registered first, would otherwise run before the
  module's and see `defaultPrevented` too late); `preventDefault()` only when something was closed.
- **Full screen**: the module does nothing of its own; its one `ResizeObserver` (the root, the map box, the sheet's body and the profile frame) calls
  `sheet.settle()`, and the sheet's `onSettle` runs `mapSize()` (MapLibre `resize()` when the canvas differs: MapLibre is created with
  `trackResize: false`, it never resizes itself) and redraws; the `resize` the frame fires on `window` reaches the same path.

## 3. What it asks of aerodb

- By `bbox` (the route's corridor or the data area, SPEC § 5): `airspaces`, `aerodromes`, `navaids`, `airways`, `moraCells`,
  `obstacles`, `vrp`, `points`, `cities`; boxes cut in two at 180°.
- `coords(id)` (the alternate, a mission's names), `mora(lat, lon)` (the profile without terrain).
- `vrp({ lat, lon, radiusNm })` and `vfrRoutes(icao)` (aerodb SPEC § 5 quater) for a hovered or pinned aerodrome, and for
  departure and arrival in VFR mode.
- `aarTracks()` and `natTracks()` (aerodb SPEC § 5, `aar.js`): the tracks of the loaded zones, read after the zones of the
  view; nothing to open for NAT.
- `state()` and `on('state')` (`loading`, `noaccess`, `unpublished`, `offline`: SPEC § 4), `status().cycle` (a mission
  map's cycle).
- `on('change')`: read again for a zone or a changed file; an `aircraft` change is ignored. An event with `coverage` or
  `refreshed` also asks the coverage again (§ 3 ter).

## 3 bis. Procedures

The map draws the runway, SID, STAR and approach that **fuel** recorded in `route.procedures` (v2, `{ dep: { rwy, sid, trans },
arr: { rwy, star, trans, app, appTrans }, by, at }`, identifiers of aerodb's common schema; `null` = none, absent = not chosen;
V3_SPECIFICATION § 10.20). It reads through `proceduresOf(flight)` of `frame/lib/flight_path.js` (the v2 view, also of an
old `{ sid, star }` record; a side whose aerodrome is not the route's is read as not chosen) and never writes the field.
`conflictsOf(key, rec, choice, byId)` and `orderProcedures(list, key, choice, byId)` live in `frame/lib/procedures.js` (still re-exported
by `flight_path.js` during the transition, § 10.29 c): the one rule of the ⚠ marks and of the order of the lists (V3_SPECIFICATION
§ 10.23); the choose mode calls them, as Fuel does, with `appChoices` / `transitionsOf` for the approaches and their transitions.
- **Asked of aerodb**: `procedure(id)` for each chosen identifier and `runways(icao)` for the chosen runways, through
  `loadProcedures(aerodb, flight)`, once per change of `route.procedures` (or of departure and arrival), without waiting; a
  `refreshed` event of aerodb reads them again. The map never calls `procedures(icao)`: nothing that is not chosen is drawn, and
  the on-demand reading (`fetchProcedures`) is fuel's gesture.
- **Kept in the state**: `S.procs` (the records), `S.route.path` (`expandedPath`: route and procedures in flight order, legs
  without a fix and the missed approach included) and `S.route.flown` (`flownPath`: the points flown, with cumulative NM).
  Without `aerodb`, without a choice or without a record, both are the route.
- **Read from the record**: `profile.path` [{ nm, ft }] (drawn by the profile when it covers the path's length, else the profile's
  own fallback) and `quote.legs` [{ id, min, origin }] (the times, through `etaOf(flight, now, { path })`).
- **The map's aerodrome card** gives the runway and procedures chosen for that aerodrome (departure and / or arrival) and a
  "Change" button, `data-go="fuel?focus=dep"` or `fuel?focus=arr`; fuel's step focuses the row.
- **Source states** shown in the label: `status` `xplane` → "X-Plane, local", `lnm` → "Little Navmap, local", `outdated` →
  "outdated"; the other statuses add nothing.

## 3 ter. Coverage of the procedures (V3_SPECIFICATION § 10.22)

For the "Aerodrome procedures" layer (SPEC § 6.11), the map asks aerodb:
- **`coverage(icao)`** → `Promise<{ level: 'green' | 'orange' | 'red', reason, state, here, … } | null>`; `null` for a code that is not
  four characters `[A-Z0-9]`. Reasons (closed list): green `held` (+ `source` `published` | `manual` | `local`, `outdated`, `counts
  { SID, STAR, APP }`); orange `sia`, `ead`, `lnm`; red `images`, `labels`, `points`, `prose`, `vfr`, `none`, `unknown`. `state` is the
  two-letter ICAO prefix, `here` is true when this device can start the reading. Cheap after the first call (an in-memory table);
  the map keeps its own cache per code in `S.cov` and asks **only the aerodromes drawn in the frame**, in one batch per drawing. Without the function the layer is not offered
  and nothing else changes.
- **`sources()`** → `AeroCatalogue.COVERAGE[reason] = [fr, en, de, es]` (the frame's catalogue): the texts of the reasons on the
  aerodrome card, used as they are; without them the card shows the level alone (text of the map, four languages).
- **`on('change')`** with `coverage` or `refreshed`: the answers are asked again (SPEC § 6.11).

**Between modules**: nothing (the layer is lit by its box only, V3 § 10.29 h).

## 4. What it reads from fuel

`pilot/<trigram>/current_flight.json`: `route.points` (resolved positions, optional `alt_ft`), `route.dep / arr /
altn`, `level.ft`, `aircraft.type`, and `profile: { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` for the
vertical profile (drawn as fuel computed it; without it, the profile computes its own), and `profile.path` [{ nm, ft }], the
planned vertical path under the procedures' constraints (§ 3 bis). "Edit the route" opens
`#fuel?from=maps&focus=route`: fuel shows its Route step with the text field focused (in the dual view, the frame
keeps the module and fuel scrolls to that step).

- `route.points[].alt_ft` follows fuel's INTEGRATION § 3 (fuel lot C): the level held from that point on, never on
  the first or the last point; the flight leaves at `level.ft`; a point without it keeps the previous level. The
  profile then draws the steps and computes TOC and TOD per segment.
- **Writes** of the Edit mode go through `frame/lib/current_flight.js` `merge`, on the record read just before, with
  `by: 'maps'`; the map writes `level.ft` when the first segment's level changed and **merges into `route`**: `points`, `text`,
  `distanceNm`, `trackDeg`, `from: 'points'`, `manual: false`; every other key of `route` is kept, **`procedures` as it is** (fuel's choice: the
  map never writes nor removes it; fuel sets to "none" the side whose aerodrome no longer matches `route.dep` / `route.arr` at its
  next write, and the readers check the aerodrome), `wind` removed from the points that moved, `via` / `awy` kept on the points
  left intact. Nothing outside `route` and `level` (`progress` is fuel's and the frame's, `quote` and `profile` fuel's);
  `updated_at` is then the version shown (the live view takes only a newer one). **Maps is a writer of `route` and `level`**:
  fuel's "who writes what" table (fuel INTEGRATION § 3) lists it.
- **Fuel writes `quote.legs` `[{ id, min, origin }]` and `quote.taxiMin`** with every quote (minutes from brake release at each
  point of the flown path, `origin` ∈ route | sid | star | app; the taxi apart): the source of the derived times (§ 2 bis).
- Missions keep the studio's meaning for `route_points[].alt_ft`: the altitude reached at the point (`mission.js`).
- Every write of the file redraws the map and the profile (debounced 300 ms).
- `route.text` comes from `textFromPoints(points, previousText, previousPoints)` of `frame/lib/route_text.js` (airways of
  unchanged segments kept). Fuel requotes on `by` ≠ `fuel`; until then maps draws its own TOC and TOD.
- `frame/lib/route_text.js` is imported by the module and kept at installation (`meta.files`).
- `route.points[].wind` (fuel lot F) is drawn as barbs; absent, nothing is drawn.
- **Longitudes**: `route.points` are read in [-180, 180[ as fuel writes them and unrolled by the module (`frame/lib/geo.js`,
  frame INTEGRATION § 12), so a flight across the date line is one continuous route; what the module writes back (Edit mode) is
  wrapped again. `modules/fuel/winds.js samples` does the same for the points it asks Open-Meteo about.

## 5. Costs (measured, see DECISIONS.md)

- **Code**: core, profile and symbols about 145 KB (kept at installation); outlines 350 KB at the first plain
  background; MapLibre 1 MB at the first tiled map. The module calls `fetch` on nothing, its own files included: the frame
  keeps `meta.files` at installation and `meta.lazy` at first use.
- **Terrain**: 7 to 20 Terrarium tiles for a 100 to 370 NM route (zoom 9), read through `ctx.net.fetch` (the frame lets
  `s3.amazonaws.com/elevation-tiles-prod/` through directly, `frame/app.js` `DIRECT_PATHS`): the module gives the bricks a
  `load(url)` → Blob (`tileLoader(ctx)` of `state.js`) — `SiaProfile.terrainSampler(z, load)`, `MapsContours.draw(…, { load })`;
  the bricks never call `fetch`. The hillshade is MapLibre's `raster-dem` source, fetched by MapLibre itself like the base
  tiles (`meta.net`).
- **Data**: France IFR route LFRS → LFML: France's meta, airspaces (2.8 MB), aerodromes, navaids, airways and MORA,
  plus about 100 KB of Spain and Switzerland (no airspaces): 3.64 MB, then from the frame's cache.

## 6. The data sheet: what another module may show in it

The sheet under the map shows one content at a time (SPEC § 4). The module's entry point is
`openData(kind, key, title, build, label = title)`; `closeData()` / `endData(kind)` close it. A content is drawn **by
maps**, never by another module reaching into the sheet.

- `kind`: the content's family (`'layers'`, `'lv'` airspaces, `'ad'` aerodrome, **`'weather'`** the cross-section).
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
ARIA and the glide are the primitive's, and `data-sheet` on the root is `collapsed`, `default` or `expanded`. What stays
in maps: `openData` / `endData` / `closeData` / `dataHead` (the content and the header's texts: the handle's title carries the flight's
summary), the Profile · Weather · "i" chips (inside the head line, always three, one without content `disabled`; `ignore: '[data-dclose], .mp-chips, .mp-whole'`), the grip's texts (`labels`, four languages), the notes, the position kept between
mounts (`sheetKeep`, through `onChange`), `locked` (the tuning page) and `onSettle` (`mapSize()`, the route's re-framing and the redraw of the overlay, the profile and the cut: **once the size has stopped, never while
the sheet moves**; nothing of the map is redrawn or resized while a finger drags the sheet, V3 spec § 7.1 rule 19, test D20).

**The atmosphere cross-section** is implemented (24 Oct 2026): § 8.

## 7. Map base for other modules — `lib/map_base.js`

What the map module and the atmosphere module do the same way to have a map, and nothing more: MapLibre loaded once, the base
styles, the tiled base (creation, waiting, giving up), the map brought to its box's size, and the plain background when tiles
do not come. Owned by maps; an ES module with no state of its own and **no module state inside** (every function takes the map,
the box and options and returns a handle; the only singletons are the loaded MapLibre and the loaded outlines, shared on
purpose). Behaviour is the one that `modules/maps/module.js` had inline (checked pixel for pixel on `#maps`, 390 and 1280,
with and without tiles).

```js
import { loadMapLibre, styleFor, startTiles, mapSize, isOwnResize, setBottomInset, zonesLayer, loadRender, loadOutlines, plainView,
         drawPlain, STYLE_DAY, STYLE_NIGHT, STYLES, TILE_WAIT } from '../maps/lib/map_base.js';
// declare in the module's meta: files '../maps/lib/map_base.js?v=0'; lazy '../maps/lib/maplibre-gl.js?v=0',
// '../maps/lib/maplibre-gl.css?v=0', '../maps/lib/outlines.js?v=0'; net 'tiles.openfreemap.org'
```

| Function | Contract |
|---|---|
| `loadMapLibre()` → `Promise<maplibregl \| null>` | script UMD and style sheet of `lib/`, once per page; `null` if the script does not load (the next call tries again) |
| `styleFor({ dark, base })` → URL | `base`: a key of `STYLES` (the studio profile's base), else `STYLE_DAY` (positron); `dark`: `STYLE_NIGHT`, or VersaTiles' eclipse for a `vt-` base |
| `startTiles(container, opts)` → `Promise<map \| null>` | the tiled map in `container`, once loaded; `null` when offline, MapLibre missing, no WebGL, an `error` before `load`, `wait` ms elapsed (default `TILE_WAIT` 10 s) or `alive()` false; the half-built map is removed. `opts`: `style`, `bounds` (`[[w, s], [e, n]]`), `padding` (px, optional), `attributionControl` (`false`, or `{ compact: true, customAttribution }`: the control is folded on its "i" button and marked compact (`maplibregl-compact`) **as soon as it exists**, before the style loads, so that no later `resize` of the map re-opens it; a tap opens it), `wait`, `alive()`, `onCreate(map)`, `onStyleLoad(map)` (every `style.load`: the first style and each `setStyle`), `onLoad(map)` (before the promise is kept: wire the events there). Mercator is forced at every style; no rotation, no pitch. `worldCopies` (default `false`): MapLibre's `renderWorldCopies`; with `false` the camera is clamped to ±180° and a route across the date line cannot be framed; with `true` the centre may be 190° or −174°, and `getBounds()` / `project()` go beyond ±180, so the host brings its longitudes to the view's copy (`nearLon` of `frame/lib/geo.js`). The Map passes `true`; Atmosphere keeps its grid on the route's own turn and the default |
| `mapSize(map, box)` → boolean | `map.resize()` only if the canvas is not the box's size; true when it resized. **`startTiles` creates the map with `trackResize: false`: MapLibre does not follow its container's size by itself** (its own observer resized, and so cleared, the canvas at every frame of a sheet drag), so call it when the size has stopped (the sheet's `onSettle`, a rotation, full screen), at load and style change, on return of a hidden tab (`visibilitychange`, `pageshow`) and at each draw |
| `isOwnResize(map)` → boolean | true during the `resize()` that `mapSize` runs: its `movestart` is not a user gesture (`map.on('movestart', () => { if (!isOwnResize(map)) userMoved = true })`) |
| `setBottomInset(map, px)` → boolean | the map's bottom controls (attribution, scale, any other in `bottom-left` / `bottom-right`) move up by `px`: the part of the map's box that a sheet covers (the sheet's top against the box's bottom; 0 when the map sits above the sheet or beside it). Sets `--mb-inset-b` on the map's container, written only when the value changes (true then); the camera is not touched (frame the route with a bottom `padding`). Call it at every size change and at each `onSettle` of the sheet, and from a `ResizeObserver` on the sheet if the map can sit under it (V3 spec § 7.1 rule 17). Atmosphere: its `--at-hide-b` rule (an oversized map) can give way to one call with the same value |
| `zonesLayer(map, features, { colors, onTap })` → `{ update(features, colors), fit(padding = 24, bounds), remove() }` | filled zones one can touch, by id (the Data module's map of zones, asked by Settings, user's word of 31 Oct 2026: « la vraie carte »). `features`: a GeoJSON FeatureCollection of `Polygon` / `MultiPolygon` in `[lon, lat]` (several rings for one zone: Alaska, Hawaii), each with `{ id, tone: 'ok' \| 'warn' \| 'err' \| 'muted', picked, approx }`; `colors`: `{ ok, warn, err, muted, line }` already resolved by the caller (MapLibre does not read CSS variables: read the design tokens and pass them; `line` is the colour of an unknown tone). Drawn: the fill at the tone's colour, translucent (more when `picked`), the outline at the same colour, 3 px when `picked`, dashed when `approx` (two line layers: `line-dasharray` is not data-driven). `onTap(id)`: MapLibre's `click`, which never follows a drag or a pinch; the topmost zone under the finger, else within 6 px. The layers come back after every change of style (`style.load` for a URL, `styledata` for an object, which MapLibre applies as a diff that removes them silently). `update` replaces the data (`setData`) and, given `colors`, the colours, without new layers; `fit` frames `bounds` (`[w, s, e, n]`, the east beyond 180 allowed) or, without it, the union of each zone's **main ring** (its largest outer ring, read in one piece: a ring whose longitudes spread over more than 180° has its western ones + 360) — a zone across the antimeridian or with far islands (the 48 states and the Aleutians, France and its overseas lands: six zones of aerodb) is framed on its main land, never on the whole world, and never from a box given by anyone else (`fitBounds`, no animation). A box or a ring beyond 180° needs a map created with `worldCopies: true` (`startTiles`), else the camera stops at ±180°; a ring across the antimeridian is drawn in one piece when the caller gives it so (western longitudes + 360), no cut at 180° needed; `remove` takes the layers, the source and the listeners away. Nothing is read nor written by the base; no state but a per-map counter for unique layer ids. Bench: `modules/maps/lib/test/zones_layer.html`, driven by noreg D94 (a tap on a zone → its id, outside → nothing, a drag → nothing, the two rings of one zone → one id, update and `setStyle` keep the layers, `fit()` on « us » with the Aleutians frames the 48 states and not the world, `fit(padding, [170, −20, 190, 0])` centres at 180°, `remove` silences the taps) |
| `loadRender()` → `Promise` | loads `render.js` (`window.MapsRender`) if it is not there: the core only (background, `mercator`, `tokens`), enough for atmosphere; the map's own loader adds `render_airspace.js` and `render_route.js` |
| `loadOutlines()` → `Promise` | loads `lib/outlines.js` (`window.MAPS_OUTLINES`, 350 KB), once; rejects (and the next call tries again) if it does not come |
| `plainView(fit, W, H, pad = 12)` → `{ toC(lat, lon), toLL(x, y), shown }` | Mercator fitting the box `fit` (`{ w, e, s, n }`) in W × H, north up (`MapsRender.mercator`; `loadRender()` first) |
| `drawPlain(ctx, toC, W, H, colors)` | sea, then land from the outlines (sea only until they arrive); `colors` `{ sea, land, border }`, day defaults |
| `STYLE_DAY`, `STYLE_NIGHT`, `STYLES`, `TILE_WAIT` | the constants |

**The page's CSS on MapLibre** (25 Oct 2026): `loadMapLibre()` also adds one `<style data-map-base>` (once per page). The frame's global
`summary` rule (44 px, chevron, flex: for folded sections) stretched MapLibre's attribution button, a 24 px `summary`, so its "i" icon was
drawn twice (the second one under the sheet) and the chevron appeared as a bar; the style resets that button (24 px, no repeat, no
`::before`) and moves the bottom controls by `--mb-inset-b` (`setBottomInset`). Both modules get it by loading MapLibre through
`map_base`; nothing to add to their own CSS.

What stays in each module: what the map does once loaded (events, overlay canvas), when to fall back to the plain background,
the redraw loop, the credit line. Atmosphere's session replaces its copy of `loadMapLibre`, its `STYLE_DAY` / `STYLE_NIGHT` /
`TILE_WAIT` constants, `loadRender`, `loadOutlines` and the body of its `startTiles` by calls: `startTiles($('map'), { style:
styleFor({ dark: dark() }), bounds: [[b.w, b.s], [b.e, b.n]], attributionControl: { compact: true }, wait: 8000, alive: () => alive,
onLoad: map => { … } })` (its handlers are unchanged; its own `movestart` handler should also test `!isOwnResize(map)`).
Differences to know: errors before `load` always give up (atmosphere's copy gave up only if `!map.loaded()`); Mercator is set
at each `style.load` (a no-op for the default style).

## 8. The weather cross-section: what maps reads from the frame and atmosphere

The sheet's "Weather" content (SPEC § 9) calls atmosphere's pure renderer with data read through the frame's weather layer.
Nothing is written, nothing is asked of Open-Meteo.

- **Data**: `ctx.weather`, the frame's single weather layer (grid of the flight, world; cache only), whose contract is
  frame/INTEGRATION.md § 14. The map asks it for what the cut needs (the model of the route's middle point, the cut's places
  and variables at the flight's level, two UTC days) and draws only what is already kept; anything missing gives "No forecast
  …" (SPEC § 9). The call: `ctx.weather.grid(sectionPlaces(points), depTime, sectionVars(levelFt, points), { model:
  ctx.weather.modelFor(mid).id, cacheOnly: true })`; null or no `locs` is "No forecast"; `locs` go through atmosphere's
  `locations()`.
- **Files** (`meta.lazy`, loaded by a dynamic `import()` at the first "Weather"): `../atmosphere/section.js` (`drawSection`,
  `sectionPlaces`, `sectionVars`, `sectionModel`, `sectionLegend`), `../atmosphere/atmo.js` (`locations`, `cruiseKtOf`) and what
  they import (`../atmosphere/texts.js`, `../fuel/winds.js`).
- **What is drawn**: `drawSection(el, { route, levelFt, profile, profileLevelFt, depTime, cruiseKt, locs, labels, fmtLvl, cloudRgb,
  id: 'mp-wx', model, width, height, minHeight: 0, cursorM, dark, window })`. `profile` is the flight's `profile` only when fuel wrote
  it (`by` absent or `fuel`), with `profileLevelFt` = the level it was computed for (fuel's TOC / TOD hold at one level only);
  `depTime` (seconds) is `started.at` when started, else `planned_at`, else now (`weather.when` is local time and is not used);
  `cruiseKt` from the route text, else 200; `labels.strips` are maps' own four-language texts (the five surface strips);
  `fmtLvl` is `formatLevel` with the airline's transition; `model` is computed once per flight (`sectionModel`) and passed;
  `width` and `height` are the content area's whole size (no padding, no box of the module's own); `id` keeps the SVG definitions
  distinct from atmosphere's own screen (dual view) — **atmosphere's INTEGRATION § 5 should list `id`**.
- **The legend of the cut** (the "i" chip, V3_SPECIFICATION § 7.1 rule 14). Contract read in `modules/atmosphere/section.js`:
  `sectionLegend({ kind: 'cut' | 'slice', layers, strips, cloudRgb, t })` is pure and returns `[{ key, labels [fr, en, de, es], label,
  swatch }]` in reading order; **`swatch` is a string: a complete SVG of 28 x 14** (`<svg … style="--at-computed:…" aria-hidden>`), already
  drawn with the cut's own tokens (`var(--at-computed|planned|requested|terrain)`, `--sog-muted`, `--sog-border`, `--sog-chart-*`: the
  variables are set on the SVG itself) and its own gradients / hatches; it is not `{ css }` and has no `kind`. `key` is `computed`, `planned`,
  `requested`, `toc`, `cloud`, `temp|da|rh`, `iso`, `inv`, `ice`, `wind`, `cu`, `terrain`, `points`, `strips`. `layers` and `strips` must be
  the ones passed to the drawing, `t` takes a four-language row (the Map passes `row => ctx.t(row)`; without it the labels are French).
  The Map therefore (1) draws the cut with an explicit `layers` (`WX_LAYERS`: the set `drawSection` takes by default) and asks the legend
  for the same ones, `strips` being what `sectionSvg` decided, **read from the `geo` the drawing returns** (`geo.strips`, `geo.layers`: the
  request of 25 Oct, served by atmosphere's `d785ec7c6`; the Map no longer recomputes the 260 px rule), (2) puts each row's SVG as it is in its
  box (`.mp-lg-svg`, `data-key` = the row's key) and the label beside it. The legend therefore says what is drawn in the window.
- **The cursor**: `cursorM` = maps' `S.cursor` (metres from the departure), and a tap on the drawn section calls the same
  `setCursor` with `geo.nmOf(x) × 1852`, using the geometry `drawSection` returns.
- **A window on the distance axis: served** (rule 20 of V3_SPECIFICATION § 7.1, 25 Oct 2026; contract: atmosphere's `INTEGRATION.md` § 5,
  `o.window`, `geo.window`, `geo.top`, `geo.strips`, `geo.layers`; used by the Map since lot `v3-maps-coupe-fenetre`). The request, as it was
  written and as atmosphere delivered it. The Map zooms its profile and wants the same gesture on the cut. Option of `drawSection(el, o)` (and of `sectionSvg(M, o)`, which
  it calls): **`o.window = { from, to }`**, distances **in NM from the departure** (the unit of `geo.xOf(nm)` / `geo.nmOf(x)`), none or
  `{ from: 0, to: total }` = the whole cut as today. When given, the cut must: (1) map the plot's width to `[from, to]` and clip to it, so
  `geo.xOf(nm)` and `geo.nmOf(x)` follow the window (the Map places its cursor with `nmOf` and draws nothing else on the cut); (2) draw only the
  columns / field inside it, **refitting the vertical axis** to what is visible if it can (flight level, terrain, top of the cloud and of
  the field) — if it keeps its own top, say so; (3) filter the distance-axis graduations, the route points' names and the TOC / TOD, the
  NM marks and the tick labels to the window, and keep the names inside the frame; (4) put `geo.window = { from, to }` (the window really
  drawn, after its own bounding) in the geometry, and return the same `geo` fields as now. The window is bounded by the caller (at least 5 NM,
  inside `[0, total]`); the cut may refuse it and draw whole (then `geo.window` is absent and the Map shows no "Whole flight" button).
  **What the Map does with it**: one window per route, `S.axw` (the profile's frame) and `S.axx` (the sheet's body, where the cut is drawn) are
  two `createAxisWindow` helpers, one per container, that hand each other the window after every gesture (`set(…, { quiet: true })`);
  every drawing reads `S.axw`. `total` = the route's length from the profile (`S.prof.total` / 1852, the same number for both), `min` = 5 NM,
  `plot` = `{ x0, x1 }` from the cut's own `geo` (`geo.x0`, `geo.x0 + geo.pw`, plus the svg's offset in the body). `weatherBuild` passes
  `window: { from, to }` while zoomed (else `null`), and states what was drawn on the body: `data-window` (`from,to` NM), `data-top` (ft),
  `data-strips`. One finger stays the cut's cursor (a tap places it, it opens no slice: the Map has none), so a double tap needs no delay
  (atmosphere waits 320 ms because a tap opens a slice there).

## 9. Routing over the airways — `frame/lib/routing.js`

Shared code, so a frame library: fuel's "Auto" button calls it (`import * as RG from '../../frame/lib/routing.js'`, declared in
fuel's `meta.files`); the map does not use it. An ES module with no state of its own, no page, no network; it imports
`frame/lib/route_text.js`. Bench: `frame/lib/test/routing.html` (moved with it).

| Function | Contract |
|---|---|
| `route(aerodb, a, b, { altFt, reachNm, detourPct, minNm, padPct })` → `Promise<{ points, text, nm, dct, routes } \| null>` | the path from `a` to `b` (`{ id, lat, lon }`) over the airways open at `altFt` (default 6,500 ft); `points`: `a`, the airway's nodes, `b` — `{ id, lat, lon, via }`, `via`: the airway that reaches the point (`'DCT'` for a direct entry or exit, `''` for `a`), `awy: true` on the nodes the text does not write; `text`: `LFRS DCT TSA01 UT460 TSA05 DCT LFML`; `nm`: the path's length; `dct`: it contains a direct part; `routes`: the airways, in order. `null` when no airway serves: leg of 40 NM or less, far from every airway, no path open at that level, detour over 40 % |
| `expand(aerodb, chain, { altFt, altOf(i), skip(i), … })` → `Promise<{ points, legs, nm, routes }>` | the same for a chain of points, one `aerodb.airways({ bbox })` call; `altOf(i)`: level of leg `i`; `skip(i)`: keep leg `i` direct; `legs[i]`: `{ status: 'routed' \| 'short' \| 'far' \| 'none' \| 'detour' \| 'skipped', routes, nm, points }` |
| `leg(segments, a, b, altFt, opts)` → `{ points, routes, nm, why }`, `airwayGraph(segments)`, `shortest(graph, a, b, altFt, reachNm)` | the pure parts, on segments `{ route, a, b, lower, upper (ft), nm }` |
| `tokensOf(points, { dct })`, `textOf(points, { dct })` | `route_text.js` tokens and normalised text of points carrying `via`; `dct: false` writes no DCT |
| `RoutingError` (`code: 'base'`, `state`) | thrown when aerodb has nothing to read: the base is missing, which is not "no airway" |
| `DEFAULTS`, `nm(a, b)` | `{ reachNm: 60, detourPct: 40, minNm: 40, padPct: 15, ifrMinFt: 6500 }`; great-circle distance in NM |

Rules: an edge is open when floor − 100 ≤ level ≤ ceiling + 100 ft, both directions; entry and exit go direct to the 8 nearest
nodes within `reachNm`; one node per identifier within 2 NM; a composite designator (`G54-R66`) is read as the airway one was
following; the corridor is the chain's box widened by `reachNm` plus `padPct` % of the direct distance. Limits: no one-way
airways, no fine level restriction, no SID / STAR, no crossing of the date line.

## 10. Window on a distance axis — `lib/axis_window.js` (25 Oct 2026, rule 20 of V3_SPECIFICATION § 7.1)

The gesture of the vertical drawings, written once: the Map's profile and the weather cut (atmosphere's own screen, and the cut in the Map's sheet; § 8) use it. An ES module, no state of its own, no timer, nothing written in the page; `import { createAxisWindow } from
'../maps/lib/axis_window.js'` (declare it in the module's `meta.files`).

`createAxisWindow(el, { total, onChange, min, plot, enabled })` → `{ from, to, zoomed, active, set(from, to, { quiet }), reset({ quiet }), stop() }`

| Argument | Contract |
|---|---|
| `el` | the element that receives the pointers (the module sets `touch-action: none` on it: the pinch is then the helper's, not the page's) |
| `total` | the flight's length in NM, a number or a function (it changes with the route) |
| `onChange(from, to)` | called **only if the window changes**, at every pointer event of a gesture: the caller coalesces its redraw (the Map: one `requestAnimationFrame`) |
| `min` | the least NM visible (default 5; never more than the flight) |
| `plot()` | `{ x0, x1 }`: the left and right of the plot frame, px from the element's left edge (the window maps to it); default the element's width |
| `enabled()` | `false` disarms everything (the Map: Edit mode, or another content open in the sheet) |

Gestures, in the capture phase of `el`: two pointers = pinch (zoom around the middle of the fingers, which also moves the window); double
tap (two short taps within 350 ms and 40 px) or `dblclick` = `reset()`; wheel with `ctrlKey` (a trackpad pinch too) = zoom around the pointer
(`preventDefault`); a mouse drag beyond 4 px = pan, only when the window is tight; **a single touch or pen pointer is never taken or stopped**.
While a pinch lasts, and until every finger is up, the events of the pointers are stopped (`stopImmediatePropagation`) so the caller's own
handlers (the cursor) do not run; `active` says so too. `set()` / `reset()` bound the window (`min`, `[0, total]`, centre kept) and return
whether it changed; `quiet: true` does not call `onChange` (the caller redraws itself). The window is **never stored** by the helper; the
Map keeps it for the life of the page.
