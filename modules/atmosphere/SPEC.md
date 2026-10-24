# atmosphere — specification

The V3 module **Atmosphere** of the Pilot application: the atmosphere along the current flight. Born as a standalone
mock-up (`labs/atmosphere`, 24 October 2026), turned into a module the same day. Still a mock-up: level 3, its lasting
place in the application is to be decided (DECISIONS.md).

## 1. What it shows

- **Cross-section along the route** (x: NM from departure, y: pressure altitude): cloud cover by level, isotherms
  every 5 °C with 0 °C emphasised, inversion layers, indicative icing (possible / probable), estimated cumulus base,
  wind barbs, terrain; optional backgrounds: temperature, humidity, density altitude minus pressure altitude. Three
  flight paths: **requested** level, **planned** levels (steps `alt_ft` from their point on), **computed** trajectory
  (climb and descent from Fuel's `profile` — `tocNm`, `todNm`, rates — or 1,200 / 1,500 ft/min at 220 / 250 kt),
  with TOC and TOD. Surface strips: low / mid / high cloud, precipitation, visibility under 8 km.
- **Every reading place at the time the flight passes it**: departure time + estimated time along the computed
  trajectory (true airspeed by phase, no wind — stated on screen).
- **Map at the chosen altitude**: sea level (MSL isobars every 2 hPa, highs and lows, 2 m isotherms, cloud, 10 m
  wind), the requested level, each planned step, fixed levels (5,000 ft … FL300), or the computed trajectory (route
  coloured by the temperature met, thicker in cloud, ❄ where icing is possible). Aloft, isobars at constant true
  altitude. The map is at the hour the flight passes the selected slice.
- **Vertical slice** (sounding) at any reading place, with a summary (ground, cloud, inversions, 0 °C, cumulus
  base, conditions on the trajectory).
- **Table along the computed trajectory** and **aerodromes** (departure, arrival, alternate: METAR, TAF).
- Offline **demonstration** data (`#atmosphere?donnees=demo`): an invented but plausible situation.

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
