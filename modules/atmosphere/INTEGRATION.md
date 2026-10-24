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
- **Map: the maps module's technique, shared.** MapLibre of `modules/maps/lib/` and the maps module's base styles
  (positron by day, dark at night); the weather overlay on a canvas over the map, redrawn on every frame of the map's
  movement (`move` → `requestAnimationFrame`) with `map.project`; its geometry (field images, isobar and isotherm
  segments in lon / lat, labels, highs and lows, winds, coloured trajectory) is computed once per data set, never per
  frame. Without tiles (offline, no WebGL, host refused): the maps module's plain background —
  `MapsRender.mercator` and `MapsRender.drawBackground` (`modules/maps/render.js`) with `MAPS_OUTLINES`
  (`modules/maps/lib/outlines.js`). The only piece copied from the maps module is its 15-line `loadMapLibre`, internal
  to its `module.js` (DECISIONS.md).
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

## 5. Renderers for other modules — `section.js`

The profile is meant to be shown in the maps module's data block too. Pure functions, no page DOM (a detached canvas
for the field images), no storage; colours through the frame's tokens (`--sog-*`), set as variables on the SVG root.

```js
import { sectionSvg, soundingSvg } from '../atmosphere/section.js';
const { svg, geo } = sectionSvg(model, { width, height, layers, fmtLvl, cloudRgb, dark, labels: { strips } });
// model: { field (NX, NY, top, below, tC, rh, cc, daFt), traj, samples [{ nm, t, point }], cols, points, sel }
// geo: { x0, y0, pw, ph, xOf(nm), yOf(ft), nmOf(x), ftOf(y) } for tooltips and taps
const s = soundingSvg(column, { width, height, top, fmtLvl, cloudRgb, lines: [{ ft, color, dash }] });
```

`model` is what `module.js` computes (`compute()`); a reader in another module would build it from the weather cache
with `atmo.js` (`column`, `trajectory`, `at`) — to be packaged as one call when the maps module asks for it.
