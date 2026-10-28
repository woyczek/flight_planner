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
  (list icon, not an "i": the frame's header has its own; the details in the bottom block), **Load**, the **altitude pill** (the map's level in brief — Sol / SFC, FL270, Traj.;
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
- **Flight date slider** (user: "prévoir un slider « date du vol » pour ajouter x heures à la planification (et la
  carto). Utiliser au max les données gratuites."): a line under the handle, 0 to +72 h by hours, "Departure +12 h ·
  Sun 25 03:00Z". The departure is the planned one — the shared flight's date (`planned_at`, Fuel's "Flight date"),
  else `weather.when`, else now — plus those hours; the cross-section, the flight's map and the world
  synoptic follow while it moves, from what the device keeps — nothing asked. "Load" reads at once every day the slider
  can reach (Open-Meteo counts places and variables, not days, up to two weeks), so moving it costs nothing more; beyond
  what was read, the line turns amber and "Load" reads the rest. Kept for the visit only.
- Every reading place at the time the flight passes it (departure + estimated time, no wind — stated on screen); the
  map at the time of the chosen slice.
- Rendering: the profile and the slice are SVG (vector lines, smooth fields); the map's overlay is vector, redrawn
  with every frame of the map's movement.
- Offline **demonstration** data (`#atmosphere?donnees=demo`).

## 2. The flight

- **Always the current flight at opening**: `pilot/<trigram>/current_flight.json` (schema 1,
  `modules/fuel/INTEGRATION.md` § 3), the one Fuel and the maps module read, **read only**; read again when it changes
  (`watch`), the forecast then only from the device's cache. None: nothing drawn, "No planned flight" with Prepare in
  Fuel and See the example.
- **Round the world on the map** (user: "Est-ce qu'on fait un tour avec la carte, si on décolle vers la droite ou la
  gauche ? Spoiler : je le veux."): the map repeats the world (MapLibre's world copies, the shared base's option
  `worldCopies`); the flight, its grid and markers, the synoptic and the taps follow on every copy, east or west,
  as many turns as wanted.
- **Across the date line** (user: "on veut voler de Sibérie à l'Alaska en passant par la ligne de changement de
  date"): the route's longitudes are made continuous (`unwrapLons`: UHMA 177.7° → PAOM 194.6° rather than −165.4°), so
  the sampling, the map grid, the framing, the cross-section and the drawing follow the route instead of going round
  the world; the requests to Open-Meteo are brought back to [−180, 180[ by the cache's cells; taps and tooltips compare
  longitudes modulo 360 (`frame/lib/geo.js`, shared with the maps module and Fuel).
- For the visit only (never kept, marked in the handle): the example of the schema, a `current_flight.json` file, or a
  route text — names resolved by
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

## 4. The world synoptic — nothing asked outside the flight's grid

User, 24 Oct 2026: "si on zoom out la carte météo, on n'a pas les infos… sans cramer des crédits… users are dumb",
then "NOAA approuvé. Idem, compilation vers le même format pour unifier l'api. Quitte à augmenter la granularité ou le
niveau de paramètres du fichier"; relay's decision (`docs/technique/V3_SPECIFICATION.md` § 8). **A device never asks
Open-Meteo for anything outside its flight's grid, whatever the map shows.**

- **The publication**: `/v3/weather/world/` on the pages, built by the Pages workflow (`tools/build_world_weather.py`,
  GRIB2 decoded by `tools/grib2_lite.py`, standard-library Python) from **NOAA GFS 1°** (NOMADS GRIB filter: no key,
  no call quota), reduced to a **5°** grid (lat −80…80, lon −180…175: 33 × 72 = 2,376 places), **every 3 h from the
  current 3-hour step to +72 h** (25 steps). One index and one file per step (≈ 140 KB, ≈ 38 KB compressed): a device
  reads only the steps it shows. GFS is read once per run (≈ 70 s, 25 downloads); at every other build (each push,
  every 6 h) the previous publication is taken again while it comes from the latest run and covers 66 h more; NOMADS
  unreachable: its steps still ahead are published again; never a failed deployment.
- **Format** (schema 1, the same for any source, so that readers have one API): `index.json` = `{ schema, model, run
  (s), built (s), step (°), lats [south → north], lons [west → east], times [s], files [one per step], units, source }`;
  `YYYY-MM-DDTHH.json` = `{ schema, time (s), vars: { name: [lat × lon, row by row from the south] } }`, and
  `YYYY-MM-DDTHH-alt.json` (named in `altFiles`, levels in `levels`) the same for the pressure levels: `z<hPa>` (m),
  `t<hPa>` (°C), `rh<hPa>` (%), `ws<hPa>` / `wd<hPa>` (kt, °), for 1000, 925, 850, 800, 700, 600, 500, 400, 300, 250 and
  200 hPa. Variables: the
  five every source gives — `p` sea-level pressure (hPa), `t` 2 m temperature (°C), `cc` total cloud (%), `ws` / `wd`
  10 m wind (kt, from °) — and what GFS adds: `ccl` / `ccm` / `cch` low, middle, high cloud (%), `cape` (J/kg), `frz`
  0 °C isotherm (ft), `trop` tropopause (ft), `js` / `jd` 250 hPa wind — the jet stream (kt, °), `pr` precipitation
  (mm/h), `vis` visibility (m), `ps` surface pressure (hPa), `zs` surface height (m). Values rounded, `null` where
  missing.
- **On the device** (`world.js`): read on the same origin through `ctx.net` (no extra host), kept in
  `cache/weather/world/` (policy `cache`): the index 6 h, each step until it is past (removed with a new index).
  Served by the launcher (no publication), no world layer until `frame/weather`.
- **No border with the flight's grid**: both sides are computed by the same code at the same altitude (the world's
  pressure levels, a second file per step read only when the map shows an altitude; the flight grid's true altitude
  for the isobars), with the same steps of lines (by the map's scale) and the same spacing of barbs; over the outer
  quarter of the flight's grid its values pass progressively into the world's (the models differ, more so far ahead),
  for the map only.
- **On the map**: as soon as the view goes beyond the flight's grid (or with no flight at all), the synoptic is drawn
  outside the grid at the step nearest the map's time: isobars every 4 hPa with the marked highs and lows (an extremum
  over 15° around and 2 hPa deep; 70 px apart on screen, the deepest first), isotherms every 10 °C, cloud, wind barbs
  (30 px apart on screen), temperature backdrop, and two layers of their own — **jet stream** (250 hPa wind from 60 kt,
  purple) and **convection** (CAPE from 500 J/kg, orange); Mercator-correct images, the world's copies when zoomed out.
  Inside the grid the flight's fine forecast stays. **No extra button.** When the view is mostly outside the grid (the
  grid covers less than 40 % of it, or its centre is outside), the handle's title says what is shown: "World synoptic ·
  18:00Z · run 06:00Z +12 h"; back in the grid, the profile's title returns. A tap outside the grid opens every value of
  the step at that point (pressure, wind, temperature, cloud and its three layers, precipitation, visibility, CAPE, 0 °C
  isotherm, tropopause, jet) — never a call.
- SIGMET and METAR of the world (aviationweather.gov, no CORS): through the launcher's relay only, later. Satellite
  (NASA GIBS) and radar (RainViewer) tiles answer with CORS: candidates.

## 5. Sources

| Data | Source, through | Key |
|---|---|---|
| Forecast (14 pressure levels + surface, hourly, today and tomorrow) | `api.open-meteo.com/v1/forecast`, `ctx.net` | none |
| Model run | `api.open-meteo.com/data/<model>/static/meta.json`, `ctx.net` | none |
| METAR | `metar.vatsim.net`, `ctx.net` | none |
| TAF | `avwx.rest`, `ctx.net` (kept 30 min in `cache/atmosphere/taf/`) | the device's, added by the frame |
| World synoptic (outside the flight's grid) | `/v3/weather/world/` of the pages (§ 4: NOAA GFS by the workflow), same origin, `ctx.net` | none |
| Base map | `tiles.openfreemap.org` (MapLibre of `modules/maps/lib/`, `meta.net`) | none |
| Model | `modelFor` of `modules/fuel/winds.js`, by the route's middle | — |

## 6. Limits

- Times without wind; cloud cover from the model's level cloud cover, else from humidity; icing and cumulus base
  indicative only. Not an official weather briefing.
- No help chapter yet (`meta.help: false`).
