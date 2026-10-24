# atmosphere — integration

## 1. Files

| File | Role |
|---|---|
| `module.js` | `meta`, `mount(el, ctx)`, `unmount()`: the screen, the loads, the drawings |
| `texts.js` | every text, `[fr, en, de, es]`, for `ctx.t` |
| `section.js` | pure SVG renderers of the profile and the slice (§ 5) |
| `atmo.js` | pure computations: columns at an hour, reading at a pressure altitude, density, inversions, icing, trajectory, grid, contours; reuses `modules/fuel/winds.js` |
| `weather_store.js` | the shared weather cache (§ 3), written to move unchanged into `frame/weather` |
| `world.js` | the world synoptic (SPEC § 4): `worldReader({ data, net })` → `{ index(), step(index, k) }`, `valid`, `validStep`, `stepAt`, `worldGrid(index, step)`, `worldAt(index, step, lat, lon)`; pure but the reader |
| `tools/build_world_weather.py` | builds `/v3/weather/world/` from NOAA GFS in the Pages workflow (`.github/workflows/pages.yml`, step "Synoptique monde") |
| `tools/grib2_lite.py` | minimal GRIB2 reader (grid 3.0, products 4.0–4.15, packing 5.0 and 5.3, bitmap), standard library |
| `lib/weather_map.js` | the weather map renderer (§ 6), shared by this module and the maps module: `createWeatherMap`, `attach`, `gridRequest`, `legend()` |
| `demo.js` | offline demonstration, answered in Open-Meteo's own format |
| `test/weather_store.html` | bench of the weather cache (fake data layer and network) |
| `test/weather_map.html` | bench of the weather map library: states, legend, values, no fill showing the grid's limit, `edge`, `attach` / `detach`, no Open-Meteo call |
| `test/weather_map_perf.html` | performance page of the library (first draw, cost of a frame per layer, canvas memory, bytes read); run with the CPU slowed ×4 |
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
`route.dep / arr / altn / text`, `level.ft` (else `quote.levelFt`), `profile`, `planned_at` (the flight date written by
Fuel: the origin of the flight date slider; else `weather.when`, else now), `aircraft`,
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
- `sectionPlaces(points)`: the reading places (every 50 NM, 24 at most, as Fuel), on continuous longitudes
  (`A.unwrapLons`: a route across the date line is sampled along itself, not round the world); `sectionModel` does
  the same, so a reader passing the current flight's raw points finds the same cache cells as this module. `sectionVars(levelFt, points)`: the
  hourly variables (surface, pressure levels up to the top of the cross-section). `topFtOf(levelFt, points)`.
- `sectionModel({ points, levelFt, profile, profileLevelFt, depTime, cruiseKt, samples, locs })`: the model alone
  (trajectory, columns at the time of passage, the 200 × 120 field, the reading every 1 NM, `sampleAt(nm, ft)`).
- `sectionSvg(model, opts)` and `soundingSvg(column, opts)`: the SVG strings (the profile; the slice of one column).

## 6. The weather map for the maps module — `lib/weather_map.js`

One renderer for both screens (V3_SPECIFICATION § 7.1.8): isobars, isotherms, clouds, wind barbs, temperature,
jet stream and convection at the level and time asked; the flight's grid (read from `cache/weather/`, never asked to
Open-Meteo by the library) blended into the world synoptic (`/v3/weather/world/`, same origin), one computation on
both sides, no visible border. The slider, the slices, the tooltips and the layers panel stay with the host.

```js
import { attach } from '../atmosphere/lib/weather_map.js';
const wx = attach(map, { ctx, flight: { points: route.points, levelFt }, levelFt, time: depTime });
wx.state;                                  // 'ok' | 'world-only' | 'missing'
wx.update({ levelFt: 9000, time: t, layers: { isobar: false } });   // partial: the rest is kept
wx.legend();                               // rows for the host's Layers panel
wx.detach();                               // the Profil chip: the canvas and its listeners go
```

- **`attach(target, opts)`** gives the renderer its own canvas (`canvas.sog-weather-map`, `position: absolute`,
  `pointer-events: none`). `target` is a MapLibre map (the canvas goes into `map.getCanvasContainer()`, above the
  tiles and under the host's own overlay; redrawn on `move` and `resize`, on every copy of the world) or a flat
  background `{ container, project(lat, lon) → { x, y }, size() → { W, H }, bounds() → [w, s, e, n] | null,
  zoom() → number, onChange(cb) → unsubscribe }`. It returns the `createWeatherMap` API plus `update` and `detach`
  that also repaint and clean up.
- **`createWeatherMap(opts)`** draws into the host's canvas, at its place in the host's drawing order (this module:
  background, weather, then the route): `draw(c, { W, H, project, bounds, zoom })`.
- **`opts`**: `ctx` (`data`, `net`, `t`, `lang`); `flight` (`{ points, levelFt }`: the route and its planned level;
  `null`: the world alone); `levelFt` (the pressure altitude shown, ft; `null`: the surface); `time` (s, the map's
  hour); `layers` (`{ isobar, isotherm, cloud, wind, tfill, jet, conv }`, defaults `DEFAULT_LAYERS`); `gridMax` (places
  of the flight's grid, 48); `grid` (a grid already read, `{ g, locs, levels }`: a host that loads it itself, as this
  module does; without it the cache is read); `colors` (`() → { bg, fg, muted, border, dark, cloud: [r, g, b] }`;
  `attach` reads the `--sog-*` tokens of its container); `edge` (`true`: the limit of the flight's grid drawn as a
  hairline in the border colour, contour labels kept 24 px away from it; default `false` — the administrator's setting
  "Draw the flight zone's limit", V3_SPECIFICATION § 7.1.12, read by the host and passed here, also through `update`);
  `onChange` (a read arrived: redraw, titles).
- **One source per fill, no visible limit by default**: the fills (clouds, temperature, jet stream, convection) come
  from the world synoptic on both sides of the flight's grid — two models do not agree at the same level (AROME dry,
  GFS moist) and a fill taken from each would draw the grid's rectangle; the grid keeps its own fills only when there is
  no synoptic. The lines and barbs come from the flight's grid blended into the synoptic over its outer quarter (same
  level, hour within 2 h), with no contour label on that band.
- **`state`**: `'ok'` (the flight's grid is in the cache), `'world-only'` (the world synoptic alone: nothing loaded for
  this flight, or no flight), `'missing'` (nothing yet: offer "Load in Météo").
- **The cache is read without the network** (`cacheOnly`, with a network that always answers offline): the run kept in
  `cache/weather/<model>/meta.json` decides validity, as for the cross-section (§ 5). The grid is found when this module
  (or Fuel) loaded the same request: **`gridRequest(points, levelFt, gridMax)`** → `{ g, levels, vars, model }` is the
  one computation of places, levels and variables for whoever loads and whoever reads; `daysFor(time)` the days to
  ask.
- **`info()`** → `{ state, reading, outside, gridBox, levels, pLabel, time, world: { run, time, h, step, source, k },
  worldReading, blended, zones }`: `outside` is true when the view is mostly outside the flight's grid (titles "World
  synoptic"); `blended` when the flight's lines are drawn blended into the world (same level, same hour within 2 h);
  `zones` the two sides of the limit for the host's legend with `edge` (`[{ key: 'flight' | 'world', label }]`, e.g.
  "Flight area · Météo-France AROME / ARPEGE", "World · NOAA GFS 1° (NOMADS), 5° grid", four languages).
- **`at(lat, lon)`** → `{ t, p, cc, ft }` inside the flight's grid, `null` outside; **`worldPoint(lat, lon)`** →
  `{ values, time, run, step, source }` from the world synoptic, `{ reading: true }` while the step is read, `null`
  without a publication.
- **`legend()`** → `[{ key, label, labels, on, swatch: { css, ramp, barb } }]` in `MAP_LAYERS` order: `label` in the
  current language, `labels` the four `[fr, en, de, es]`.
- Also exported: `MAP_FIXED` (the fixed altitudes offered), `MAP_LAYERS`, `DEFAULT_LAYERS`, `copiesFor(bounds, w, e)`,
  `inBox`, `barb`, `halo` (drawing helpers this module uses for its own route).
- The host module declares `cache/weather/` (policy cache, `cache/weather/world/` included) as this module does; the service
  worker leaves `/v3/weather/world/` to the network.
