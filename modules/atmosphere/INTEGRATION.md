# atmosphere — integration

## 1. Files

Every file is 60 KB at most; the three contents opened by a button are loaded at their first opening (and fetched once
the screen is drawn, so that they work offline).

| File | Role |
|---|---|
| `module.js` | `meta`, `mount(el, ctx)`, `unmount()`: the hub — state, skeleton, buttons over the map, the sheet and its head, the contents' switch, the load |
| `style.js` | the screen's styles (`STYLE`), set once in a `<style>` |
| `fmt.js` | formats in the interface's language (levels, temperatures, winds, times, numbers) and the DOM writes made only when the value changes |
| `flight.js` | the flight shown: `fromRecord` (current flight, example, file), `fromText` (route text), `EXAMPLE`, `flightSig` |
| `wx.js` | the data: `ctx.weather` only (§ 3), or the demonstration; `forecast`, `aerodromes`, `why` |
| `screen_map.js` | the map: MapLibre or the plain background, the weather map (`lib/weather_map.js`), the flight over it, taps, the altitude chip |
| `screen_cut.js` | the cross-section and its window (rule 20), the soundings, the legend |
| `screen_details.js` | Details (loaded on demand): summary, aerodromes, table |
| `screen_flight.js` | Flight and settings (loaded on demand) |
| `screen_layers.js` | Layers (loaded on demand) |
| `texts.js` | every text, `[fr, en, de, es]`, for `ctx.t` |
| `section.js` | pure SVG renderers of the profile and the slice (§ 5) |
| `atmo.js` | pure computations: columns at an hour, reading at a pressure altitude, density, inversions, icing, trajectory, grid, contours; reuses `modules/fuel/winds.js`, the model by region from `frame/lib/weather_store.js` |
| `world.js` | the world synoptic's pure functions (SPEC § 5): `valid`, `validStep`, `stepAt`, `worldGrid(index, step)`, `worldLocs`, `worldAt(index, step, lat, lon)`; the reading is `ctx.weather.world` |
| `lib/weather_map.js` | the weather map renderer (§ 6), shared by this module and the maps module: `createWeatherMap`, `attach`, `gridRequest`, `legend()` |
| `demo.js` | offline demonstration, answered in Open-Meteo's own format, never written to the shared cache |
| `tools/build_world_weather.py` | builds `/v3/weather/world/` from NOAA GFS in the Pages workflow (`.github/workflows/pages.yml`, step "Synoptique monde") |
| `tools/grib2_lite.py` | minimal GRIB2 reader (grid 3.0, products 4.0–4.15, packing 5.0 and 5.3, bitmap), standard library |
| `help/<lang>.md` | the "Météo" chapter of the pilot's manual, four languages (built by `frame/help/build_help.py`) |
| `test/weather_map.html` | bench of the weather map library on `ctx.weather` (the frame's store over an in-memory data layer): states, legend, values, no fill showing the grid's limit, `edge`, `attach` / `detach`, no Open-Meteo call |
| `test/weather_map_perf.html` | performance page of the library (first draw, cost of a frame per layer, canvas memory, bytes read); run with the CPU slowed ×4 |
| `ROADMAP.md` | what is done, what is next |

## 2. Mounting

- `meta`: `id: 'atmosphere'`, `level: 1`, `fixed: true`, `help: true`; `reads: ['pilot/', 'cache/atmosphere/',
  'airline/map_profiles.json']`; `writes`: `cache/atmosphere/` (`policy: 'cache'`, the screen's settings); `files` (every
  file above that the screen imports, the maps module's base and render included), `lazy` (MapLibre and the countries'
  outlines of the maps module), `net: ['tiles.openfreemap.org']`. The weather is not in `reads` / `writes`: the frame's
  weather layer keeps its own cache.
- In `APP.modules` (`frame/app.js`), its own tab of the bar (Météo, `cloud` icon; rule 14) and the rail on a screen.
  `#atmosphere?donnees=demo` (or `?data=demo`) opens the demonstration. `ctx.helpAnchor` gives the "?" the paragraph of
  the view shown (SPEC § 1).
- **Map: the maps module's base, shared.** `modules/maps/lib/map_base.js` (maps INTEGRATION § 7): `startTiles` (MapLibre,
  the style of `styleFor({ dark })`, 8 s wait), `mapSize`, `setBottomInset` (MapLibre's bottom controls above the sheet,
  rule 17), `isOwnResize` in `movestart`, `loadRender`, `loadOutlines`, `plainView` and `drawPlain` for the plain
  background. The map and its overlay have the module's whole size, under the sheet (`--at-full-w/h`, `--at-hide-r/b`):
  a move of the sheet resizes nothing. The overlay canvas is redrawn on every frame of the map's movement
  (`requestAnimationFrame`) with `map.project`; its geometry is computed once per data set.
- **Bottom sheet: the frame's** (`frame/lib/sheet.js`, `frame/INTEGRATION.md` § 11): `createSheet({ root, panel, head,
  grip, pos, ignore, labels, onChange, onSettle })`, the position kept between two mounts of the page; nothing is redrawn
  while the panel carries `f-sheet-nt` (a drag, rule 19); `onSettle` sizes the map, reframes it unless the user moved it,
  and redraws the drawing when the body's size changed. The bare head (`f-sheet-head-bare`, rule 13) in the default
  position in portrait only.
- **Buttons over the map: the frame's overlay layer** (`ctx.overlay`, `frame/INTEGRATION.md` § 9.3): Layers (`side:
  'left'`), Flight, Details and Load, `aria-pressed` kept up to date; the altitude chip is the module's own element in
  `ov.right` (a 44 px round label with the level in brief and a transparent `<select>` over it). The overlay's rules are
  written `[data-module="atmosphere"] ~ .f-overlay …`.
- **Touch**: `touch-action: none` on the map and on the drawing (two fingers are the cut's window), `manipulation` on the
  buttons, selects and fields.
- Everything goes through `ctx`: `data` (current flight read only, the screen's settings), `weather` (§ 3), `aerodb.coords`
  (names of a route text), `t` / `lang`, `notify`, `overlay`, `helpAnchor`, `identity.trigram`. No `fetch`, no
  `ctx.net`, no storage of its own, no key.
- It redraws on its size (`ResizeObserver`, never during a drag), on the design and tone (`data-design`, `data-tone` on
  `<html>`, and the system's colour scheme: events, nothing rewritten outside the module), and reads the current flight
  and `airline/map_profiles.json` again on `watch`.

## 3. The weather — `ctx.weather`

The frame's single weather layer (`frame/lib/weather_store.js`, contract in `frame/INTEGRATION.md` § 14): one cache
`cache/weather/<model>/<cell>/<UTC day>.json`, one count of the calls to Open-Meteo, one model by region. This module asks
it and nothing else (`wx.js`):

- the route's columns and the map's grid: `grid(places, until, vars, { model, days, from, cacheOnly, stale, onWait })` —
  the places of `sectionPlaces` / `gridRequest`, the variables of `sectionVars` / `gridRequest`, the model of `modelFor`
  at the route's midpoint by length (`frame/lib/flight_path.js` `routeMidpoint`, the Map's point), the days from the
  first day read to the last instant wanted plus ten hours (`daysUntil`); the first day is today, or the departure's day
  for a flight dated before today (`firstDay`, passed as `from`, 92 days back at most); **at opening
  `cacheOnly: true`** (null when anything is missing: "Forecast not loaded"), on "Load" every day the slider can reach;
  the answer's `locs` (Open-Meteo's shape) go through `atmo.locations`;
- a point touched on the map (in the flight's grid): the same call for one place;
- `metar(ids, { cacheOnly })`, `taf(ids, { cacheOnly })`: the aerodromes' messages (aviationweather.gov's JSON form,
  read by `station()` of `modules/fuel/weather.js`), their source said in the Details;
- `run(model)` (the head names it), `spentToday()` (the status line);
- the world synoptic: `world()` and `world(k, { alt })`, read by `lib/weather_map.js`.

Errors carry the layer's marks (`quota`, `offline`, `unreachable`, `incomplete`, `status`, `stale`); `wx.why` words them.
The demonstration answers in the same shape without the layer.

## 4. The current flight

Schema 1 of `modules/fuel/INTEGRATION.md` § 3, read only: `route.points[] { id, lat, lon, alt_ft }`,
`route.dep / arr / altn / text`, `level.ft` (else `quote.levelFt`), `profile`, `planned_at` (the flight date written by
Fuel, its only date: the origin of the flight date slider; else now), `aircraft`,
`updated_at`. If the module ever writes it, it goes through `merge(stored, mine, { fields, progressKeys, by })` of
`frame/lib/current_flight.js`, with its own fields and `by`.

## 5. The cross-section for the maps module's sheet — `section.js`

Pure functions (no read of the data layer, no network, no page DOM but a detached canvas for the field images, no
global style sheet; colours through `--sog-*`). The module itself draws through them, so both screens show the same
computation. The contract is the one of `modules/maps/INTEGRATION.md` § 6 (`openData(kind, key, title, build)`).

```js
import { drawSection, sectionPlaces, sectionVars } from '../atmosphere/section.js';
const places = sectionPlaces(route.points), vars = sectionVars(levelFt, route.points);
const r = await ctx.weather.grid(places, depTime, vars, { model, cacheOnly: true }); // nothing asked: what was already read
openData('weather', `wx:${flightKey}`, title, (w, h, el) => {
  drawSection(el, { width: w, height: h, route: route.points, levelFt, profile, depTime, locs: A.locations(r.locs), cursorM });
});
```

- `o.model`: a `sectionModel(…)` already computed. The maps module's sheet redraws at every step of a drag: it computes
  the model once per flight and forecast and passes it, so a redraw is only the SVG (`route` and `cursorM` are still
  read from `o`; the other inputs are the model's).
- **Read from the device only** (`cacheOnly: true`): the cross-section is there when this module (or Fuel) has read it
  through the frame's weather layer, whose run decides how long it is valid (`frame/INTEGRATION.md` § 14.2); otherwise
  the forecast is not found and `drawSection` returns `null`.
- `drawSection(el, o)`: replaces `el`'s content by the SVG cross-section of `o.width` × `o.height` CSS pixels and returns
  its geometry `{ x0, y0, pw, ph, xOf(nm), yOf(ft), nmOf(x), ftOf(y) }` (tooltips, taps); `null` (and `el` emptied)
  without a forecast. `o`: `route` (points with `alt_ft` steps), `levelFt`, `profile` and `profileLevelFt` (Fuel's;
  TOC / TOD valid at that level only), `depTime` (s), `cruiseKt`, `locs` (Open-Meteo-shaped locations for
  `sectionPlaces(route)`, in that order), `layers` (`{ cloud, iso, inv, ice, wind, cu, temp, rh, da }`), `cursorM`
  (the shared cursor, metres from the departure), `labels.strips` (five texts of the surface strips), `fmtLvl`,
  `cloudRgb`, `dark`, `minHeight` (a height floor, default 0: the drawing fits the height given, the distance axis and
  the waypoint names always inside; a low chart labels one level in two under 160 px of plot, one in four under 110;
  60 px is the least it draws). V3_SPECIFICATION § 7.1 rule 13: no title over a drawing, the drawing at the body's
  exact height. The left gutter is measured from the level labels it draws (about 33 px for "FL350"; the surface strips'
  labels widen it when they are shown), so the drawing starts at the body's edge.
- `o.window` (rule 20): `{ from, to }` in NM from the departure, a window on the distance axis; absent, `null` or the
  whole route: the whole cut (the default). The window is bounded to the route and is 1 NM at least. Only what lies in it
  is drawn — columns, barbs, isotherm labels, distance marks (a round step inside the window: 1, 2, 5, 10, 20, 25, 50…),
  route points and their names, TOC / TOD, the cursor and the selection — and the height scale is refitted to what is
  visible (the highest of the requested, planned and computed levels and the terrain in the window, plus 1 500 ft,
  rounded up to 1 000 ft, 3 000 ft at least, the whole cut's top at most). The geometry follows the window: `xOf(nm)`
  and `nmOf(x)` map the window onto the plot, and it carries `window: { from, to }` (only when one applies), `top` (ft,
  the height scale's top), `strips` (the surface strips drawn) and `layers` (the layers drawn, defaults filled in).
  The host keeps the window (never stored) and draws again with it; this module drives it with the maps module's
  `createAxisWindow` (`modules/maps/lib/axis_window.js`), reset when the route changes.
- `sectionLegend({ kind, layers, strips, cloudRgb, t })` (rule 14): the legend of what the drawing really shows, in
  reading order — `kind` `'cut'` (the cross-section, with the `layers` passed to `drawSection`) or `'slice'` (the
  sounding), `strips` true when the surface strips are drawn (body of 260 px or more), `t` the host's translation of a
  `[fr, en, de, es]` row (`ctx.t`). → `[{ key, label, labels, swatch }]`, `swatch` an SVG string of 28 × 14 px with the
  drawing's own colours (the `--at-*` tokens set on it). Pure; the host shows it over the drawing behind its "i" chip.
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
  background, weather, then the route): `draw(c, { W, H, project, bounds, zoom, visible })` — `visible`: the part the
  user sees when the canvas runs on under a panel (this module draws its map under the sheet), for `info().outside`.
- **`opts`**: `ctx` (`weather` — the frame's weather layer —, `t`, `lang`); `flight` (`{ points, levelFt }`: the route and its planned level;
  `null`: the world alone); `levelFt` (the pressure altitude shown, ft; `null`: the surface); `time` (s, the map's
  hour); `layers` (`{ isobar, isotherm, cloud, wind, tfill, jet, conv }`, defaults `DEFAULT_LAYERS`); `gridMax` (places
  of the flight's grid, 48); `grid` (a grid already read, `{ g, locs, levels }`: a host that loads it itself, as this
  module does; without it the cache is read); `colors` (`() → { bg, fg, muted, border, dark, cloud: [r, g, b] }`;
  `attach` reads the `--sog-*` tokens of its container); `edge` (the limit of the flight's grid drawn as a hairline in
  the border colour, contour labels kept 24 px away from it; **default `true`** since rule 15 of V3_SPECIFICATION § 7.1:
  the two models do not join and the map says so; the administrator may hide it, key `edge: false` in
  `airline/map_profiles.json`, read by the host and passed here, also through `update`; `wm.edge` gives the value);
  `onChange` (a read arrived: redraw, titles).
- **One source per fill**: the fills (clouds, temperature, jet stream, convection) come
  from the world synoptic on both sides of the flight's grid — two models do not agree at the same level (AROME dry,
  GFS moist) and a fill taken from each would draw the grid's rectangle; the grid keeps its own fills only when there is
  no synoptic. The lines and barbs come from the flight's grid blended into the synoptic over its outer quarter (same
  level, hour within 2 h), with no contour label on that band.
- **`state`**: `'ok'` (the flight's grid is in the cache), `'world-only'` (the world synoptic alone: nothing loaded for
  this flight, or no flight), `'missing'` (nothing yet: offer "Load in Météo").
- **The device is read, never Open-Meteo** (`ctx.weather.grid(…, { cacheOnly: true })`; the world by `ctx.weather.world`):
  the layer's run decides validity, as for the cross-section (§ 5). The grid is found when this module
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
