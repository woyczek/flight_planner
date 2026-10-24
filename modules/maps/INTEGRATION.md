# maps — integration

How the frame mounts the map module and what it needs from the frame, aerodb and fuel. Specification:
[SPEC.md](SPEC.md). Decisions: [DECISIONS.md](DECISIONS.md).

## 1. Declaration

```js
export const meta = {
  id: 'maps', apps: ['pilot'], level: 1,
  fixed: true,                                                                // the fixed, full-height view (frame INTEGRATION § 9.2)
  reads: ['pilot/', { prefix: 'missions/', policy: 'reference' }, 'cache/maps/'],
  writes: [{ prefix: 'cache/maps/', policy: 'cache' },                        // map mode and layers, per device
    { prefix: 'pilot/', merge: 'record' }],                                   // the current flight, edited on the map
  files: ['render.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/profiles.js?v=0', '../../frame/lib/js-yaml.min.js?v=0'],               // kept at installation
  lazy: ['lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0', 'lib/outlines.js?v=0'],  // kept at first use
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
  `fuelRemainingKg`, `remainingNm`, `phase`). The actual position is the frame's, `progress.actual`, read as below until
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
column with no padding. The module draws into it a toolbar, the information line, the map (`flex: 1 1 0; min-height: 0`)
and the data sheet (fixed height, three positions: SPEC § 4). What the module's own style sheet adds, because the frame
does not give it:

- **The dual-view pane and the map on the left of a pane are not fixed views** (`f-fixed` is not applied to a split
  view's pane; with the map on the left, `html.f-fixed` stays on but the frame's full-height rules are for the unsplit
  view only). The root is given its height by two rules of the module: `.f-pane>[data-module="maps"]` =
  `100dvh − 86 px − 44 px` (the pane's `max-height` minus its close bar), `.f-view.f-split>[data-module="maps"]` =
  `100dvh − 57 px − 32 px` (header and the view's padding), both with `min-height: 420px`. Numbers copied from
  `frame.css`; **ask for a frame variable** (the header height and the pane bar's) or a pane rule so that they are not
  repeated here.
- **The tuning page** (`#maps?tune=1`) needs a scrolling page, and `fixed` is a property of the module, not of an address:
  the root scrolls by itself in that case (`overflow: auto`, grid from 1000 px, with `display: grid !important` because
  the frame's `html.f-fixed .f-view > .f-module { display: flex }` has more weight).
- The root has `isolation: isolate` (the z-indices 3 to 8 of the map's buttons stay below the frame's header and tab bar).
- The test page `modules/maps/test/index.html` gives the host `height: calc(100dvh - 24px)`.

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

**The atmosphere cross-section (awaiting atmosphere's renderer).** The atmosphere module will export a **pure renderer**
for the vertical cross-section along the route (wind, temperature, turbulence, icing, clouds against the route's level),
in a file maps can import (`modules/atmosphere/section.js`, to be declared in maps' `meta.files` when it exists). What maps
will call, once it is there:

```js
import { drawSection } from '../atmosphere/section.js';          // atmosphere's file, not written yet
// in the sheet, from a button or a tab of the sheet's header (maps' own, to be designed with the user):
openData('weather', `wx:${flightKey}`, tt(TX.weatherSection), (w, h, el) => {
  drawSection(el, { width: w, height: h, route: S.route.points, levelFt: S.route.levelFt, profile: S.prof, wind, now });
});
```

What maps asks of that function: **pure** (no read of the data layer, no network, no global style sheet; it gets the route
points, the level, the profile's cumulative distances, and the forecast as arguments), **idempotent** (`el` is replaced
by each call), **sized by the arguments** (it draws for `width` × `height` CSS pixels and does not read the page), colours
from the `--sog-*` tokens or from `MapsRender.tokens()`. Whether it returns an HTML string instead (then `build` returns
it) is atmosphere's choice; the sheet takes both. The cursor shared by the profile and the map (`S.cursor`, in metres from
the departure) can be given as `cursorM` so the cross-section follows it. Nothing of this is implemented in maps yet: no
button, no text, no import (DECISIONS.md, 24 Oct 2026).
