# atmosphere — specification

The V3 module **Atmosphere** ("Météo" in the bar) of the Pilot application: the atmosphere along the current flight — a
weather map at a chosen altitude, the vertical cross-section of the route, the sounding of a point — at the planned
departure time or up to 72 h later. This document is the final state the module is coded from; the reasons and their
history are in DECISIONS.md, the contracts with other modules in INTEGRATION.md. Rule numbers refer to
`docs/technique/V3_SPECIFICATION.md` § 7.1.

## 1. Place in the application

- Level 1 module, its own tab of the bottom bar: Préparer · Carte · CR · Vols · **Météo** (rule 14), `cloud` icon; on a
  screen, its entry in the rail. Address `#atmosphere`; `#atmosphere?donnees=demo` (or `?data=demo`) opens the offline
  demonstration (§ 6).
- Help: the chapter `modules/atmosphere/help/<lang>.md` ("# Météo", built into `frame/help/pilot.*.md`), four
  languages, French first; `meta.help: true`. The frame's "?" opens it at the paragraph of the view shown
  (`ctx.helpAnchor`, rule 16): `atmosphere-flight` (no flight), `atmosphere-cut` (cross-section or sounding),
  `atmosphere-zoom` (zoomed cross-section), `atmosphere-legend` (legend shown), `atmosphere-details`,
  `atmosphere-settings`, `atmosphere-map` (Layers, a point of the map). The anchors are the same in the four languages.
  No "How to use" card (fixed module).
- Every text of the screen, tooltips and composed sentences included, comes from `texts.js` through `ctx.t` in fr, en,
  de, es.

## 2. The screen

A fixed, full-height view (`meta.fixed`, `frame/INTEGRATION.md` § 9.2) on the map's template: **header · map · sheet
· bar, nothing else**, no page scroll (rules 1, 5).

### 2.1 Portrait

- **Map** under the whole frame; the sheet slides over it. The map and its overlay have the module's size, never the
  sheet's: a move of the sheet only uncovers map already drawn. Fitting the route pads the part the sheet hides.
- **Buttons over the map**, in the frame's overlay layer (`frame/INTEGRATION.md` § 9.3), round, 44 px (rule 1):
  - left: **Layers**: a **panel over the map**, under its button (scrolling when taller than the map, never over the
    sheet), with the layers of the map and of the cross-section side by side, each with its key; the cross-section
    stays in the sheet and is redrawn by each box (user, 29 Oct 2026: "choisir les éléments météo masque le profil
    vertical"). The panel is written only when its rows change and a box's state is set in place, so one tap is one
    toggle ("certaines coches doivent être cliquées deux fois"). Its cross, Escape, or another content of the sheet
    (Flight, Details) closes it; opening it over a non-drawing content brings the cross-section back;
  - right: **Flight** (plane icon: the flight and settings in the sheet), **Details** (list icon), **Load** (down
    arrow), the **altitude chip** (the map's altitude in brief — Sol / SFC, FL270, Traj.; a tap opens the system list
    with the full names; hidden until the flight's grid is read), then the frame's **Full screen** (rule 2).
  - A button whose content is shown (or whose panel is open) is pressed (`aria-pressed`); a second tap goes back to
    the cross-section (closes the panel).
- **MapLibre's own controls** (attribution, scale) stay above the sheet: `setBottomInset(map, px)` of
  `modules/maps/lib/map_base.js` with the height the sheet covers, at each settle (rule 17). One attribution control.
- **Sheet**: the frame's primitive (`frame/lib/sheet.js`, rule 19), three positions — collapsed to its head, default
  (30 % of the view on a phone, 170 px at least; 35 % on a screen), expanded — moved by its grip, its content scrolling
  inside when it is a list.
- **The height of what it shows** (the frame's rule since the Map's sixth reading, 31 Oct 2026, `06dcd175b`): in
  portrait the sheet is never taller than what it shows nor than half the view (the module's height); the map takes the
  rest; no blank under the content, at 1280 as at 390. A drawing (cross-section, sounding) fills the body at every
  position, the expanded position being half the view; a content (Details, Flight, a point of the world, no flight) makes
  the expanded position its head, the slider's row and its own height, capped at half, and the default position the
  smaller of the frame's default and that. A flight whose cut is not there yet (reading, forecast not loaded) keeps the
  frame's sizes: the cut comes with "Load" (the Map's rule for a profile not there yet). `sheetFit()` (`module.js`) writes `--f-sheet-default`,
  `-default-min`, `-expanded`, `-expanded-min` on the module's root in pixels, only when they change: after every drawing
  of the content and at every settle of the sheet; removed in the landscape column (its own sizes, § 2.2).

### 2.2 Landscape and screens

- Window wider than high and under 1024 px (`html.f-land`, rule 7): the sheet is a right column (40 % of the width,
  280 px at least, default and expanded 60 %), the map takes the rest; the overlay columns stay on the map in one
  column each; the right-hand MapLibre control moves left of the column. Full screen hides the header and the rail, the
  column stays.
- Wider screens: the same layout as portrait with the screen's sheet height.

### 2.3 The sheet's head

- **Default position, portrait, a drawing shown** (cross-section or sounding): the bare head (`.f-sheet-head-bare`,
  28 px, rule 13) — the grip, the chips, ✕; **no title** (the drawing says what it is).
- **Expanded, collapsed, landscape column, or a content that is not a drawing** (Details, Flight, a point of the
  world, no flight): the titled head — the title says the content, then its context:
  - cross-section: the flight in brief (aircraft, route, level, departure time, model and run; "demonstration"
    marked);
  - sounding: its place, its distance from the route and its time;
  - when there is no cross-section and the map's view is mostly outside the flight's grid (§ 4.4): "World synoptic ·
    18:00Z · run 06:00Z +12 h" ("World synoptic · run 06:00Z" until its step is read); with a cross-section the
    title stays the cross-section's (expanding the sheet does not change it).
- **The chips**, always in the head at its right, before ✕, **always three** (rule 13): ◀ ▶ (the previous and next
  route sounding; disabled off a route sounding) and **i** (the legend; disabled without a drawing). 28 px in the bare
  head, 44 px touch zones; 44 px in the titled head.
- **"Vol entier"** (text button, before the chips, only while the cross-section is zoomed, rule 20).

### 2.4 The flight date slider

A row under the head, with the cross-section and the sounding (a control, kept in the default position, rule 9):
0 to +72 h by hours, "Départ +12 h · dim. 25 03:00Z". The departure is the planned one (the shared flight's
`planned_at`, Fuel's "Flight date", the only date of the flight since Fuel's lot of 28 October; else now) plus those hours. The map, the cross-section,
the soundings and the world synoptic follow while it moves, from what the device keeps — nothing is asked. Its text has
a **fixed width** (a longer text — the day, the warning — never shortens the slider, whose thumb would slide under
the finger). Beyond what was read the row turns amber, starts with ⚠ (said again in its tooltip), a floating warning
appears once per exit, and Load reads the rest; when part of the slider is outside the forecast read, a **band under
the slider shows the hours covered** (elsewhere the nearest hour is shown). Kept for the visit only. In the landscape
column it stays horizontal under the head. The departure is written with its day ("dim. 25 03:00Z") wherever it is
shown, the sheet's title included.

### 2.5 Contents of the sheet

- **Cross-section** (default): the route from end to end, from the ground to above the flight level, every reading place
  at the time the flight passes it (§ 3.3). Drawn **at the body's exact height and full width** (rule 13): the distance
  axis and the waypoint names always visible, level labels thinned before the axis is dropped, nothing under the
  drawing in the default position (rule 9). Layers: cloud by level (grey, darker = more cover), isotherms every 5 °C
  (0 °C emphasised), inversions and indicative icing (hatching), wind barbs, estimated cumulus base, terrain, route
  points; optional backgrounds (temperature, humidity, density altitude); the requested (dotted), planned (dashed) and
  computed (solid) paths with TOC and TOD; on a body of 260 px or more, the surface strips (low, middle, high cloud,
  precipitation, visibility under 8 km). A tap opens the sounding of the nearest reading place.
- **Zoom of the cross-section** (rule 20): a window on the distance axis, the Map's gesture (`createAxisWindow`,
  `modules/maps/lib/axis_window.js`): two fingers pinch around their middle and slide; Ctrl + wheel and a drag on a
  screen; a double tap, a double click or "Vol entier" go back to the whole flight. One finger keeps its role (a tap
  opens a sounding; the sheet's drag). The height scale refits to what is visible, the distance marks take a round step,
  what lies outside is not drawn. On a zoomed cross-section a tap waits 320 ms before opening the sounding (a double tap
  resets instead). The window is kept for the page's life, reset when the route changes, never stored.
- **Sounding** of a point (from the cross-section, the map or the Details table): temperature, dew point, standard
  atmosphere, inversions, cloud column, wind, terrain, the flight's three levels there; on a wide body, its reading
  beside it (ground, cloud, inversions, 0 °C, cumulus base, conditions on the path). ◀ ▶ walk along the route; ✕ goes
  back to the cross-section.
- **Legend** (rule 14): the "i" chip shows over the drawing the series actually drawn, with their symbol and name in four
  languages, produced by the drawing code (`sectionLegend`); closed by the chip, a tap on it, or Escape; it closes when
  the content is not a drawing.
- **Details**: the summary as a compact list (one line per value: name, value, note — distance, profile, climb, mean
  wind and deviation from the standard atmosphere in cruise, 0 °C isotherm, inversions under the level), the aerodromes
  (METAR, TAF), the table along the computed path (a row opens its sounding), the sources and the status line.
- **Flight and settings**: the flight's source (§ 3.1), departure (UTC), requested level, Load; at the Full level
  only, the cruise speed (read from Fuel's flight when it has one) and the map's grid. No "data" choice: the frame's
  weather layer is the only source; the demonstration is the address and "See the example" (§ 6).
- **Layers** (the panel over the map, § 2.1, not a content of the sheet): what the map shows heads it (time, altitude,
  lines); the layers of the map and of the cross-section side by side, each with its key; the two zones of the map
  (§ 4.4) with their model and grid.
- **Point of the world**: a tap on the map outside the flight's grid opens every value of the world synoptic's step at
  that point (pressure, wind, temperature, cloud and its three layers, precipitation, visibility, CAPE, 0 °C isotherm,
  tropopause, jet).
- **No flight**: "No planned flight", with **Prepare in Fuel** and **See the example**.

### 2.6 Behaviour

- **Nothing happens while a finger holds the sheet** (rule 19): no redraw of the map, its overlay or the drawing; one
  layout at the release.
- A DOM write happens only when the value changes (CLAUDE.md).
- The map's tap hint is said once per page, in a notification (`AppFramework.notify`); nothing is written over the map.
- Warnings in notifications; no `alert`, no console for the user.

## 3. The flight and the forecast

### 3.1 The flight

- **Always the current flight at opening**: `pilot/<trigram>/current_flight.json` (schema 1,
  `modules/fuel/INTEGRATION.md` § 3), read only, watched: when it changes the screen follows, the forecast then only
  from the device.
- For the visit only, never kept, marked in the head: the schema's example ("See the example", every level) and, at
  the Full level only (frame levels), a `current_flight.json` file or a route text (names resolved by `ctx.aerodb.coords`, ICAO or decimal coordinates,
  `/F270` after a point for a step).
- **Round the world**: the map repeats the world (`worldCopies`); the flight, its grid, the synoptic and the taps follow
  on every copy.
- **Across the date line**: the route's longitudes are made continuous (`unwrapLons`), so the sampling, the grid, the
  framing, the cross-section and the drawing follow the route; requests are brought back to [−180, 180[ by the weather
  layer; taps compare longitudes modulo 360 (`frame/lib/geo.js`).

### 3.2 The forecast comes from the frame's weather layer

- Atmosphere reads **only `ctx.weather`** (the frame's single weather layer, V3_SPECIFICATION § 8, contract in
  `frame/INTEGRATION.md` § 14): the route's columns (`aloft`), the map's grid (`grid`), METAR and TAF (`metar`,
  `taf`), the world synoptic (`world`). It never calls Open-Meteo, never builds a request URL, never writes
  `cache/weather/`, never counts the quota: the layer caches, deduplicates, counts and says what a load costs.
- **Nothing is asked at opening**: the screen shows what the device keeps (cache-only reads); **Load** is the only
  gesture that asks the network, for what is missing, with its cost stated before.
- Load reads at once every day the slider can reach (planned departure to +72 h plus the flight), so moving the slider
  costs nothing more. **A flight dated before today** is read from the day of its departure (Open-Meteo serves up to 92
  past days), not from today (user, 29 Oct 2026: "pas de météo avant H+56" on a flight of the 26th).
- The route reads its levels up to the top of the cross-section; the map's grid the levels around the offered
  altitudes; the grid has 35, 48 (default) or 96 places.

### 3.3 Time along the route

Every reading place at the time the flight passes it: departure + estimated time at the **ground speed** — the
phase's true airspeed minus the headwind read at that distance and altitude (30 kt on the nose = 30 kt less ground
speed, never under 40 kt; user, 29 Oct 2026). The vertical path is **Fuel's** when the flight has one
(`profile.path` [{ nm, ft }], procedures and imposed altitudes included, scaled to the route's length; TOC and TOD at
the first and last point of its highest level: "la coupe météo ignore les altitudes imposées"), else climb and descent
from Fuel's profile rates, else the defaults. The forecast model is chosen at the route's midpoint by length
(`frame/lib/flight_path.js` `routeMidpoint`, the same point as the Map's). The map at the time of the shown sounding,
else of the departure.

## 4. The weather map

### 4.1 Altitudes

The altitude chip chooses: the surface (MSL isobars every 2 hPa with highs and lows, 2 m isotherms, cloud, 10 m wind),
the requested level, each planned step, fixed altitudes (5,000, 10,000, 18,000, 24,000 ft, FL300), or the computed path
(the route coloured by the temperature met, thicker in cloud, ❄ where icing is possible). Aloft, isobars at constant
true altitude.

### 4.2 Layers

Isobars, isotherms, cloud, wind, temperature backdrop, **jet stream** (250 hPa wind from 60 kt, purple) and
**convection** (CAPE from 500 J/kg, orange). Line steps follow the map's scale; barbs 30 px apart on screen; highs and
lows 70 px apart, the deepest first.

### 4.3 Rendering

The shared library `lib/weather_map.js` (the same for the Map, rule 8): a vector overlay on a canvas redrawn with
every frame of the map's movement (`map.project`), geometry computed once per data set; only what is in view is
projected. The cross-section and the sounding are SVG (`section.js`): smooth field images, vector lines.

### 4.4 The flight's grid and the world

- Inside the flight's grid, the fine forecast loaded for the flight (Météo-France AROME 1.3 km and ARPEGE 0.1° over
  France, ICON in Europe, GFS elsewhere); outside, the **world synoptic** (§ 5); the same code computes both at the same
  altitude.
- Fills (cloud, temperature, jet, convection) come from the world synoptic on both sides; lines and barbs from the
  flight's grid, passing into the world's over the outer quarter of the grid.
- **A thin line marks the flight zone's limit, by default** (rule 12): the two models do not join, a jump across it is
  normal. The Layers content names both zones with their model and grid; the help says the same. The administrator
  hides it (`edge.show: false` in `airline/map_profiles.json`, Réglages › Administration, rule 18); the module watches
  the key.
- When the view is mostly outside the grid (the grid covers less than 40 % of it, or its centre is outside), the head
  says what is shown (§ 2.3); back in the grid, the cross-section's title returns. No extra button.
- No airspace is drawn: rule 21 does not apply.

## 5. The world synoptic

A device never asks for anything outside its flight's grid, whatever the map shows.

- **Publication** `/v3/weather/world/` on the pages, built in the Pages workflow by `tools/build_world_weather.py`
  (standard-library Python; GRIB2 read by `tools/grib2_lite.py`) from **NOAA GFS 1°** (NOMADS GRIB filter, no key, no
  quota), on a **5°** grid (lat −80…80, lon −180…175: 33 × 72 = 2,376 places), **every 3 h to +72 h** (25 steps). The
  previous publication is taken again while it comes from the latest run; NOMADS unreachable: its steps still ahead are
  published again; never a failed deployment.
- **Format, schema 1** (the same for any source): `index.json` = `{ schema, model, run, built, step, lats [south →
  north], lons [west → east], times, files, altFiles, levels, units, source }`; `YYYY-MM-DDTHH.json` = `{ schema, time,
  vars: { name: [lat × lon, row by row from the south] } }` — `p` (hPa), `t` (°C), `cc` (%), `ws` / `wd` (kt, °) from
  every source, and from GFS `ccl ccm cch` (%), `cape` (J/kg), `frz` and `trop` (ft), `js` / `jd` (250 hPa wind), `pr`
  (mm/h), `vis` (m), `ps` (hPa), `zs` (m); `YYYY-MM-DDTHH-alt.json` the pressure levels 1000 … 200 hPa (`z` m, `t` °C,
  `rh` %, `ws` / `wd`). Values rounded, `null` where missing.
- **On the device**: read through `ctx.weather.world` (same origin), only the steps shown, the pressure-level file only
  when the map shows an altitude.

## 6. Demonstration

`?donnees=demo` (and "See the example" without a flight): a synthetic forecast and METAR computed on the device
(`demo.js`), the same shape as the weather layer's answers, never written to the shared cache, marked in the head.
No network at all.

## 7. Sources

| Data | Source | Through |
|---|---|---|
| Route columns, map grid (hourly, pressure levels and surface) | Open-Meteo (model by region: Météo-France, ICON, GFS) | `ctx.weather.aloft` / `grid` |
| METAR | the frame's source | `ctx.weather.metar` |
| TAF | the frame's source (device key) | `ctx.weather.taf` |
| World synoptic | `/v3/weather/world/` (NOAA GFS by the workflow) | `ctx.weather.world` |
| Base map | `tiles.openfreemap.org` (MapLibre of `modules/maps/lib/`) | `meta.net` |
| Terrain along the route | the forecast's surface height | — |

## 8. Code

- `module.js` and the files of the screen, each 60 KB at most, loaded on demand, every function commented.
- Shared bricks: `lib/weather_map.js` (the weather map, also the Map's), `section.js` (`drawSection`, `sectionSvg`,
  `soundingSvg`, `sectionLegend`, `sectionModel`: also the Map's), `atmo.js` (pure atmosphere functions), `texts.js`.
- Kept on the device by the module: its screen settings only (`cache/atmosphere/ui.json`: route text, grid, layers,
  map altitude), written only when they change.

## 9. Limits

- Times with the forecast headwind but no turn or acceleration model; cloud from the model's level cover, else from humidity; icing and cumulus base indicative only.
  Not an official weather briefing.
- SIGMET and world METAR (aviationweather.gov, no CORS): through the launcher's relay only, later. Satellite (NASA GIBS)
  and radar (RainViewer) tiles: candidates.
