# atmosphere — integration

## 1. Files

| File | Role |
|---|---|
| `module.js` | `meta`, `mount(el, ctx)`, `unmount()`: the screen, the loads, the drawings |
| `texts.js` | every text, `[fr, en, de, es]`, for `ctx.t` |
| `atmo.js` | pure computations: columns at an hour, reading at a pressure altitude, density, inversions, icing, trajectory, grid, contours; reuses `modules/fuel/winds.js` |
| `weather_store.js` | the shared weather cache (§ 3), written to move unchanged into `frame/weather` |
| `demo.js` | offline demonstration, answered in Open-Meteo's own format |
| `test/weather_store.html` | bench of the weather cache (fake data layer and network) |
| `ROADMAP.md` | what is done, what is next |

## 2. Mounting

- `meta`: `id: 'atmosphere'`, `level: 3`, `help: false`; `reads: ['pilot/', 'cache/weather/', 'cache/atmosphere/']`;
  `writes`: `cache/weather/` and `cache/atmosphere/`, both `policy: 'cache'` (never synchronised); `files` (the
  libraries it imports), `lazy` (MapLibre of the maps module), `net: ['tiles.openfreemap.org']`.
- In `APP.modules` (`frame/app.js`), icon `layers`. Shown in the menu at the "full" usage level only; `#atmosphere`
  opens it at any level; `#atmosphere?donnees=demo` on the demonstration. `labs/atmosphere/index.html` forwards there.
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
