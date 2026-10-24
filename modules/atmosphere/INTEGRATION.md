# atmosphere — integration

## 1. Files

| File | Role |
|---|---|
| `module.js` | `meta`, `mount(el, ctx)`, `unmount()`: the screen, the loads, the drawings |
| `texts.js` | every text, `[fr, en, de, es]`, for `ctx.t` |
| `section.js` | pure SVG renderers of the profile and the slice (§ 5) |
| `atmo.js` | pure computations: columns at an hour, reading at a pressure altitude, density, inversions, icing, trajectory, grid, contours; reuses `modules/fuel/winds.js` |
| `weather_store.js` | the shared weather cache (§ 3), written to move unchanged into `frame/weather` |
| `demo.js` | offline demonstration, answered in Open-Meteo's own format |
| `test/weather_store.html` | bench of the weather cache (fake data layer and network) |
| `ROADMAP.md` | what is done, what is next |

## 2. Mounting

- `meta`: `id: 'atmosphere'`, `level: 1`, `fixed: true`, `help: false`; `reads: ['pilot/', 'cache/weather/',
  'cache/atmosphere/']`; `writes`: `cache/weather/` and `cache/atmosphere/`, both `policy: 'cache'` (never
  synchronised); `files` (the libraries it imports, `../maps/render.js` included), `lazy` (MapLibre and the countries'
  outlines of the maps module), `net: ['tiles.openfreemap.org']`.
- In `APP.modules` (`frame/app.js`), icon `layers`, and in the **Préparer** group of `APP.tabs` (with fuel): on a phone
  the frame draws the sub-tabs Fuel · Atmosphere; on a screen it is in the rail. `#atmosphere?donnees=demo` opens the
  demonstration; `labs/atmosphere/index.html` forwards there.
- **Map: the maps module's technique and base, shared.** The base is `modules/maps/lib/map_base.js` (maps INTEGRATION
  § 7): `startTiles` (MapLibre, the style of `styleFor({ dark })`, 8 s wait, gives up on an error before `load`),
  `mapSize` on every size change and on return of a hidden tab, `isOwnResize` in `movestart`, `loadRender`,
  `loadOutlines`, `plainView` and `drawPlain` for the plain background; the weather overlay on a canvas over the map, redrawn on every frame of the map's
  movement (`move` → `requestAnimationFrame`) with `map.project`; its geometry (field images, isobar and isotherm
  segments in lon / lat, labels, highs and lows, winds, coloured trajectory) is computed once per data set, never per
  frame. Without tiles (offline, no WebGL, host refused): the plain background (`plainView`, `drawPlain`, the countries'
  outlines). What stays in the module: the map's events once loaded, the overlay and its redraw loop.
- **Bottom sheet: the frame's** (`frame/lib/sheet.js`, `frame/INTEGRATION.md` § 11): `f-sheet` on the module's root,
  `f-sheet-panel` / `f-sheet-head` / `f-sheet-grip` / `f-sheet-title` / `f-sheet-close` / `f-sheet-body` on its parts;
  `createSheet({ root, panel, head, grip, pos, ignore, labels, onChange, onSettle })`, the position kept between two
  mounts; `onSettle` resizes the map, reframes it unless the user moved it, and redraws the block when its size changed.
- **Buttons over the map: the frame's overlay layer** (`ctx.overlay`, `frame/INTEGRATION.md` § 9.3), laid over `.at-box`
  (`ov.over`): `ov.button()` for Layers (`side: 'left'`), Flight, Details and Load (`aria-pressed` kept up to date for the
  three toggles); the altitude chip is the module's own element appended to `ov.right` (a 44 px round label holding the
  level in brief and a transparent `<select>` over it, so a tap opens the system's list). The overlay is a sibling of the
  module's root: its rules are written `[data-module="atmosphere"] ~ .f-overlay …`. Full screen (§ 9.4) needs nothing
  here: the map box's `ResizeObserver` resizes the map.
- **Touch**: `touch-action: none` on the map alone (MapLibre takes its gestures there), `manipulation` on the module's
  buttons, selects and fields (no double-tap zoom, no delay).
- Everything goes through `ctx`: `data` (current flight read only, its own cache files), `net` (Open-Meteo, METAR,
  TAF), `aerodb.coords` (names of a route text), `t` / `lang`, `notify`, `identity.trigram`. No `fetch`, no storage
  of its own, no key.
- It redraws on its size (`ResizeObserver`), on the design and tone (`data-design`, `data-tone` on `<html>`, and the
  system's colour scheme), and reads the current flight again on `watch`.

## 3. The weather cache — `cache/weather/`

For every reader of Open-Meteo (this module today; Fuel's winds aloft and the maps later). Decision of 24 October
2026 (`docs/technique/V3_SPECIFICATION.md` § 8): a frame lot, `frame/weather`, will hold it; until then it lives
here, and moving it is a substitution.

```js
import { weatherStore } from '../atmosphere/weather_store.js';
const W = weatherStore({ data: ctx.data, net: ctx.net });   // data must allow cache/weather/ (policy cache)
const run = await W.run('meteofrance_seamless');             // seconds, or null (meta.json kept 10 min)
const r = await W.forecast(places, ['temperature_850hPa', 'wind_speed_850hPa'], {
  model: 'meteofrance_seamless', cacheOnly: false, stale: () => false, onWait: s => {} });
// r = { locs: [{ latitude, longitude, elevation, hourly: { time, temperature_850hPa, … } }], weight, requests, cells }
// cacheOnly: null when anything is missing; nothing asked
await W.spent();   // weighted calls over 24 h on this device
```

- Files: `cache/weather/<model>/<cell>/<YYYY-MM-DD>.json` =
  `{ schema: 1, model, cell, size, lat, lon, elevation, day, times[24], vars: { name: [24] }, refused: [], run, at }`.
  Cell: `cellOf(lat, lon, size)`, its centre, named `47.15_-1.65`; size by model (`CELL_OF`, 0.1° floor).
- A file is valid for the run it was read from (6 h at most), 30 min when a run is unknown; another run replaces it
  whole. A variable refused by a model (400) is noted in `refused` and not asked again.
- `cache/weather/<model>/meta.json`: the model's last run; `cache/weather/ledger.json`: the tally
  `{ entries: [[ms, weight]] }`; `cache/weather/pruned.json`: the last day past files were removed.
- Errors carry a mark: `offline`, `status` (HTTP), `quota` (with `spent`), `stale`, `incomplete`; the caller words
  them.

## 4. The current flight

Schema 1 of `modules/fuel/INTEGRATION.md` § 3, read only: `route.points[] { id, lat, lon, alt_ft }`,
`route.dep / arr / altn / text`, `level.ft` (else `quote.levelFt`), `profile`, `weather.when`, `aircraft`,
`updated_at`. If the module ever writes it, it goes through `merge(stored, mine, { fields, progressKeys, by })` of
`frame/lib/current_flight.js`, with its own fields and `by`.

## 5. The cross-section for the maps module's sheet — `section.js`

Pure functions (no read of the data layer, no network, no page DOM but a detached canvas for the field images, no
global style sheet; colours through `--sog-*`). The module itself draws through them, so both screens show the same
computation. The contract is the one of `modules/maps/INTEGRATION.md` § 6 (`openData(kind, key, title, build)`).

```js
import { drawSection, sectionPlaces, sectionVars } from '../atmosphere/section.js';
import { weatherStore } from '../atmosphere/weather_store.js';      // until frame/weather (ctx.weather)
const W = weatherStore({ data: ctx.data, net: ctx.net });            // maps declares cache/weather/ (policy cache)
const places = sectionPlaces(route.points), vars = sectionVars(levelFt, route.points);
const r = await W.forecast(places, vars, { model, cacheOnly: true }); // nothing asked: what atmosphere already read
openData('weather', `wx:${flightKey}`, title, (w, h, el) => {
  drawSection(el, { width: w, height: h, route: route.points, levelFt, profile, depTime, locs: A.locations(r.locs), cursorM });
});
```

- `o.model`: a `sectionModel(…)` already computed. The maps module's sheet redraws at every step of a drag: it computes
  the model once per flight and forecast and passes it, so a redraw is only the SVG (`route` and `cursorM` are still
  read from `o`; the other inputs are the model's).
- **Read from the cache only** (`cacheOnly: true`, as the maps module does): the cross-section is there when this module
  (or Fuel, later) has read it. The model run kept in `cache/weather/<model>/meta.json` decides how long it is valid
  (6 h for the same run); without it (never read on this device, or older than 30 min with no run known), the forecast
  is not found and `drawSection` returns `null`.
- `drawSection(el, o)`: replaces `el`'s content by the SVG cross-section of `o.width` × `o.height` CSS pixels and returns
  its geometry `{ x0, y0, pw, ph, xOf(nm), yOf(ft), nmOf(x), ftOf(y) }` (tooltips, taps); `null` (and `el` emptied)
  without a forecast. `o`: `route` (points with `alt_ft` steps), `levelFt`, `profile` and `profileLevelFt` (Fuel's;
  TOC / TOD valid at that level only), `depTime` (s), `cruiseKt`, `locs` (Open-Meteo-shaped locations for
  `sectionPlaces(route)`, in that order), `layers` (`{ cloud, iso, inv, ice, wind, cu, temp, rh, da }`), `cursorM`
  (the shared cursor, metres from the departure), `labels.strips` (five texts of the surface strips), `fmtLvl`,
  `cloudRgb`, `dark`.
- `sectionPlaces(points)`: the reading places (every 50 NM, 24 at most, as Fuel). `sectionVars(levelFt, points)`: the
  hourly variables (surface, pressure levels up to the top of the cross-section). `topFtOf(levelFt, points)`.
- `sectionModel({ points, levelFt, profile, profileLevelFt, depTime, cruiseKt, samples, locs })`: the model alone
  (trajectory, columns at the time of passage, the 200 × 120 field, the reading every 1 NM, `sampleAt(nm, ft)`).
- `sectionSvg(model, opts)` and `soundingSvg(column, opts)`: the SVG strings (the profile; the slice of one column).
