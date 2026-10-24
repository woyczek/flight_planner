# atmosphere — specification

The V3 module **Atmosphere** of the Pilot application: the atmosphere along the current flight. Born as a standalone
mock-up (`labs/atmosphere`, 24 October 2026), turned into a module the same day. Still a mock-up: level 3, its lasting
place in the application is to be decided (DECISIONS.md).

## 1. The screen

A fixed, full-height view on the maps module's template (`meta.fixed`, `frame/INTEGRATION.md` § 9.2): no page scroll,
the phone's whole frame; portrait only for now (the landscape layout is a later lot, `V3_SPECIFICATION.md` § 7.1).

- **Nothing between the header and the map** (`V3_SPECIFICATION.md` § 7.1): the controls are round 44 px buttons laid
  over the map in the frame's overlay layer (`frame/INTEGRATION.md` § 9.3). Left: **Layers**. Right: **Flight** (the
  settings in the bottom block: flight source, departure time, level, cruise speed, data, map grid, Load), **Details**
  (list icon, not an "i": the frame's header has its own; the details in the bottom block), **Load**, the **altitude chip** (the map's level in brief — Sol / SFC, FL270, Traj.;
  a tap opens the system's list with the full names; hidden until the map's grid is read), then the frame's **full screen** (header and bar hidden).
- **Map** (top, all the height the block leaves): at the altitude chosen with its chip — sea level (MSL isobars every
  2 hPa, highs and lows, 2 m isotherms, cloud, 10 m wind), the requested level, each planned step, fixed levels
  (5,000 ft … FL300), or the computed trajectory (route coloured by the temperature met, thicker in cloud, ❄ where
  icing is possible); aloft, isobars at constant true altitude. The Layers button opens, in the bottom block (the map stays in
  view), the layers of the map and of the profile side by side, each with its key. **A tap on the map opens the local slice at that point** (said once per page in a notification; nothing is
  written over the map). What the map shows (its time, level and lines) heads the Layers content.
- **Bottom block**: the frame's sheet (`frame/lib/sheet.js`) — three heights (collapsed to its header, default, expanded) pulled by
  its handle, its content scrolling inside. **Its handle line carries the title: the content, then its context** — the
  profile and **i** with the flight in brief (aircraft, route, level, departure time, model and run; the demonstration
  marked), a slice with its place, distance and time; ◀ ▶ when they mean something, ✕ at the right (the reference sheet
  of the suite, `V3_SPECIFICATION.md` § 7.1.6). By default the **overall profile** (cross-section along the route: cloud by level, isotherms every
  5 °C with 0 °C emphasised, inversions, indicative icing, cumulus base, wind, terrain; optional backgrounds:
  temperature, humidity, density altitude; the requested, planned and computed paths with TOC and TOD; surface strips
  when the block is tall enough). A tap on the profile opens the slice of the nearest reading place (◀ ▶ walk along
  the route). The **local slice** is a sounding (temperature, dew point, standard atmosphere, inversions, cloud column,
  wind, the flight's levels there) with its reading (ground, cloud, inversions, 0 °C, cumulus base, conditions on the
  trajectory) beside it on a wide block. ✕ goes back to the profile. **Details**: the summary as a compact list (one line per value: name, value,
  note), aerodromes (METAR, TAF), the
  table along the computed trajectory (a row opens its slice), sources.
- Every reading place at the time the flight passes it (departure + estimated time, no wind — stated on screen); the
  map at the time of the chosen slice.
- Rendering: the profile and the slice are SVG (vector lines, smooth fields); the map's overlay is vector, redrawn
  with every frame of the map's movement.
- Offline **demonstration** data (`#atmosphere?donnees=demo`).

## 2. The flight

- Default: the current flight `pilot/<trigram>/current_flight.json` (schema 1, `modules/fuel/INTEGRATION.md` § 3),
  **read only**; read again when it changes (`watch`), the forecast then only from the device's cache.
- Or: the example of the schema, a `current_flight.json` file, or a route text — names resolved by
  `ctx.aerodb.coords`, ICAO or decimal coordinates, `/F270` after a point for a step.

## 3. The forecast and the quota

Open-Meteo's free quota is counted per IP address: 600 weighted calls a minute, 10,000 a day; a call is one place
and up to 10 variables (more variables count pro rata).

- **Sampling first** (as Fuel): one reading place every 50 NM, 24 at most per flight (`samples` of
  `modules/fuel/winds.js`); the map grid 35, 48 or 96 places.
- **Shared device cache** `cache/weather/` (`weather_store.js`, see INTEGRATION.md): by model, **cell** and hour.
  The cell follows the model's resolution with a floor of 0.1° (Météo-France and ICON 0.1°, GFS 0.25°): it is the key
  that removes duplicates between routes and readers. One file per model, cell and UTC day.
- **Only what is missing is asked**: cells, days and variables absent from the cache, in as few requests as
  possible (`start_date` / `end_date`); a file is valid for the model run it was read from (6 h at most), 30 min
  when the run is unknown; a file of an older run is replaced whole.
- The route reads its levels up to the top of the cross-section only; the map the levels around the offered
  altitudes.
- **Nothing is asked when the module opens**: it shows what the device keeps, or states the cost and waits for
  "Load".
- **Tally** of the calls on the device (`cache/weather/ledger.json`, 24 h rolling): waits rather than exceed 600 a
  minute, stops before 10,000 a day. The status line gives the calls spent by each load and the device's 24 h total.
- Past days are removed from the device once a day.
- One full load of a 370 NM flight, nothing in cache: ≈ 295 weighted calls (9 route places × 98 variables, 48 map
  places × 43 variables); again, or the page reloaded: 0.

## 4. Sources

| Data | Source, through | Key |
|---|---|---|
| Forecast (14 pressure levels + surface, hourly, today and tomorrow) | `api.open-meteo.com/v1/forecast`, `ctx.net` | none |
| Model run | `api.open-meteo.com/data/<model>/static/meta.json`, `ctx.net` | none |
| METAR | `metar.vatsim.net`, `ctx.net` | none |
| TAF | `avwx.rest`, `ctx.net` (kept 30 min in `cache/atmosphere/taf/`) | the device's, added by the frame |
| Base map | `tiles.openfreemap.org` (MapLibre of `modules/maps/lib/`, `meta.net`) | none |
| Model | `modelFor` of `modules/fuel/winds.js`, by the route's middle | — |

## 5. Limits

- Times without wind; cloud cover from the model's level cloud cover, else from humidity; icing and cumulus base
  indicative only. Not an official weather briefing.
- No help chapter yet (`meta.help: false`).
