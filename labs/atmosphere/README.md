# Route atmosphere — mock-up

A standalone page (not yet a V3 module) that shows the atmosphere along the current flight: open
`labs/atmosphere/index.html` from the suite served by the launcher, or from the repository served by any static
server (`python -m http.server` at the root). `?donnees=demo` starts on the offline demonstration data.

## What it shows

- **Cross-section along the route** (x: NM from departure, y: pressure altitude): cloud cover by level, isotherms every
  5 °C with 0 °C emphasised, inversion layers (temperature rising with height), indicative icing (possible / probable),
  estimated cumulus base, wind barbs, terrain; optional backgrounds: temperature, humidity, density altitude minus
  pressure altitude. Three flight paths: **requested** level, **planned** levels (steps `alt_ft` from their point on),
  **computed** trajectory (climb and descent from Fuel's `profile` — `tocNm`, `todNm`, rates — or 1,200 / 1,500 ft/min
  at 220 / 250 kt), with TOC and TOD. Surface strips under it: low / mid / high cloud, precipitation, visibility
  under 8 km. Hover: temperature, dew point, humidity, cloud, wind with head / cross components on the leg's track,
  ISA deviation, air density, density altitude, true altitude.
- **Every reading place at the time the flight passes it**: departure time + estimated time along the computed
  trajectory (true airspeed by phase, no wind — an approximation the page states).
- **Map at the chosen altitude**: sea level (MSL isobars every 2 hPa, highs and lows, 2 m isotherms, low / mid / high
  cloud, 10 m wind), the requested level, each planned step, fixed levels (FL050 … FL300), or the computed trajectory
  (route coloured by the temperature met, thicker in cloud, ❄ where icing is possible). Aloft, isobars are drawn at
  constant true altitude (pressure interpolated from the geopotential heights), so they read like surface isobars;
  the map is at the hour the flight passes the selected slice.
- **Vertical slice** (sounding) at any reading place: temperature, dew point, ISA, inversions, cloud column, winds,
  the three flight levels at that distance, and a summary (ground, cloud, inversions, 0 °C, cumulus base, conditions
  on the trajectory).
- **Table along the computed trajectory** and **aerodromes** (departure, arrival, alternate): METAR from
  metar.vatsim.net, TAF from avwx.rest with the device's key (the suite's Settings, `githubData:avwx`, never shown).

## Sources

| Data | Source | Key |
|---|---|---|
| Route and map forecast (14 pressure levels + surface, hourly, 2 days) | `api.open-meteo.com/v1/forecast`, model by the route's middle (`modelFor` of `modules/fuel/winds.js`) | none (optional customer key, kept on the device) |
| Model run time | `api.open-meteo.com/data/<model>/static/meta.json` (AROME HD, ICON, GFS 0.13° for the seamless models) | none |
| METAR | `metar.vatsim.net/metar.php?id=…` | none |
| TAF | `avwx.rest/api/taf/<ICAO>` | the device's avwx.rest key |
| Base map | `tiles.openfreemap.org` (positron / dark), neutral background when unreachable | none |
| Flight | example of `modules/fuel/INTEGRATION.md` § 3, `data/pilot/<trigram>/current_flight.json` served by the launcher, a file, or a route text in coordinates | — |

**Open-Meteo's free quota** is counted per IP address (600 weighted calls a minute, 10,000 a day; a call is one place
and up to 10 variables). One load is about 17–24 route places × ~98 variables plus 48 map places × the variables of
the levels around the offered altitudes only (`bracketLevels`): roughly 350–400 weighted calls. Answers are kept 30
minutes in the session.

## Files

- `atmo.js` — pure computations: Open-Meteo URLs, columns at an hour, reading at a pressure altitude (ln p
  interpolation, ground included), density and density altitude, inversions, 0 °C crossings, indicative icing,
  cumulus base, trajectory, grid, bilinear refinement, marching-squares contours. Reuses `modules/fuel/winds.js`.
- `demo.js` — offline demonstration: an invented but plausible situation (Atlantic low and its front, south-east high
  with a low-level inversion, westerly jet, schematic relief), answered in Open-Meteo's own format.
- `page.js`, `index.html` — the page.

## Known limits (mock-up)

- French only; the suite's four languages come with the module.
- Route text: points in coordinates only (no aerodb lookup).
- Times without wind; cloud cover from the model's level cloud cover, else from humidity (Sundqvist); icing and
  cumulus base are indicative only. Not an official weather briefing.
