# fuel — specification (regeneration prompt)

This document describes the V3 fuel module completely enough for a developer or a language model to rebuild it without
seeing its code. The reference implementation is `modules/fuel/model.js` (the pure quote model),
`modules/fuel/levels.js` (the level decision and the climb instructions, pure), `modules/fuel/sheets.js` (the
performance sheets: reading, writing, completing, merging, ChatGPT; pure) with
`modules/fuel/performance_model.js` (the calibrated flight mechanics, copied from V2 unchanged); the module's screens
are `modules/fuel/module.js`, mounted by the frame's loader (§ 9). How the frame mounts it and what it reads and
writes: [INTEGRATION.md](INTEGRATION.md). Choices, measurements and their dates: [DECISIONS.md](DECISIONS.md).

**How to use this document as a prompt.** Ask for plain JavaScript files (no ES module syntax, no dependency) that
define `window.FuelModel` (no DOM, no storage, no interface text) and, later, the module object mounted by the frame.
Every rule below is a requirement; section 6 (invariants) always wins.

## 1. Purpose

The Pilot application's fuel and flight level tool: one aircraft, one route, one level, the fuel quote (taxi, trip with
climb, cruise and descent, contingency, reserve, block), the time and the top of descent; then (lot 3) the flight level
decision chart and the climb instructions; then (lot 4) the performance sheets as a sub-module. Phone first: one
column; the aircraft, the route, the level and wind, the level decision and a sticky result are visible, the rest is
folded.

## 2. Inputs of the quote

- **Sheet**: the aircraft's performance sheet (V2 profile format, `flight-performance-db/v1`), normalised: `unit` (kg or
  lb, the unit of every fuel quantity of the sheet), `cruise` { `tasKt`, `fuelFlowPerHour`, `rpmNominal`, `refAltFt`,
  `ceilingFt` }, `climb` and `descent` { `iasKt`, `tasKt`, `rateFpm`, `fuelFlowPerHour`, `rpmNominal` }, `taxi`
  { `fuelFlowPerHour` }, `reserveFuelFlowPerHour`, `tod` { `gradientFtPerNm` (300), `bufferNm` (5) }, `rpmFuelCurve`
  [{ `rpm`, `altFt`, `fuelFlowMin`, `fuelFlowPerHour`, `fuelFlowMax` }], `engineType`, `typicalWindKt`.
- **Flight**: distance (NM), level (ft; a level pinned on the chart wins over the plan's), true track, wind (direction
  and speed, or speed only, or nothing), taxi time, reserve time (min), contingency (% of the trip), take-off mass
  (sheet unit, optional), ISA deviation (°C).
- **Type data** from aerodb (`adapter.aerodb.aircraft()`): the EUROCONTROL record (`perf(code)`, its `simbrief` part),
  the cruise estimate (`estimate(codes)`), the engine class (`classify`). Optional: a Poll-Schumann function.
- **Entry for this flight**: a cruise fuel flow typed for this flight (kg/h), which replaces the sheet's.

## 3. Rules of the quote

- **Cruise fuel flow and TAS** (`cruiseSource`): the entry for this flight; otherwise the sheet (the RPM table at the
  cruise RPM and the plan's level, otherwise the cruise fuel flow); otherwise, in this order, Poll-Schumann, SimBrief
  (approximate unless its accuracy is "high"), the estimate (approximate). TAS: sheet, EUROCONTROL, SimBrief (speed,
  otherwise Mach at the level), estimate, 300 kt. The source and whether it is approximate are part of the answer.
- **Model sheet** (`modelSheet`): the sheet with its cruise completed by the retained flow and TAS when it lacks them or
  when an entry replaces it, its climb (IAS, rate) and descent (rate, IAS) completed by the EUROCONTROL record when the
  sheet lacks them. Never written back.
- **Performance model**: `FlightPerfModel.create(modelSheet, { db, dIsa, apd })`; none when the cruise TAS or flow is
  missing (the quote then uses the sheet's constant values).
- **Climb**: the model's climb to min(level, ceiling) — with the chosen climb law when it reaches the level, otherwise
  the profile climb (and say so) — otherwise level ÷ climb rate (1,200 ft/min), distance at the climb TAS (220 kt).
- **Descent**: level ÷ descent rate (1,500 ft/min), distance at the descent TAS (250 kt).
- **Cruise**: distance minus climb and descent distances (never negative), at the model's TAS and flow at the level
  (otherwise the retained ones), ground speed = TAS + wind component, never under 80 kt.
- **Phase flows**: climb = RPM table at the climb RPM and half the level, otherwise the sheet's climb flow, otherwise
  the cruise flow; descent likewise, otherwise 45 % of the cruise flow; taxi = sheet's taxi flow, otherwise 25 % of the
  cruise flow; reserve = sheet's reserve flow, otherwise 65 % of the cruise flow.
- **Wind**: direction and speed known → the component on the track (positive = tailwind). Otherwise a range ±speed
  (speed known) or ±the sheet's typical wind (25 kt): the block is given as a range, low and high.
- **Steps** (`steps: [{ nm, ft }]`, lot C): the flight leaves at the plan's level; at nm NM from departure the level
  becomes ft. Each change costs a climb (the difference of two model climbs, otherwise the sheet's rate at the climb
  TAS) or a descent (descent rate and TAS); the cruise is split into legs, each at the model's TAS and flow at its
  level, shortened by the climb (first leg), the change (next legs) and the descent (last leg). The descent and the TOD
  start from the last level. A step at the same level, at 0 or beyond the arrival changes nothing; without steps the
  quote is the single-level one (bench unchanged). The screen gives the intermediate points' `alt_ft` at their
  cumulated distance (scaled to a typed distance); the level decision still varies the plan's level alone.
- **Totals**: trip = climb + cruise + steps + descent; contingency = trip × %; block = taxi + trip + contingency +
  reserve.
- **Time and TOD**: time = climb + cruise + steps + descent minutes; TOD = last level ÷ gradient + buffer (NM).
- **No fuel flow known**: the quote says so (`hasFuel` false) instead of a misleading zero.

## 4. The current flight shared with maps

A record `pilot/<trigram>/current_flight.json` (merge rule `record`: the newest `updated_at` wins) holds the flight
both modules work on; the schema is in [INTEGRATION.md](INTEGRATION.md) § 3. Read it at mount; write it with every
field kept (read, change own fields, write the whole record with a new `updated_at`).

## 5. Performance sheets (lot 4; owned by aerodb since 23 Oct 2026)

Read and written through `aircraft().sheets` (`list`, `get`, `put(sheet, { source })`, `remove`): aerodb stamps every
changed field with its source (`edit`, `eurocontrol`, `chatgpt`, `lnmperf`, `ofp`, `import`), writes
`aircraft/sheets/<id>.json` and the V2 mirror; fuel no longer writes `planner/`. The sheets logic is aerodb's
(`aircraft().lib`, formerly `modules/fuel/sheets.js`). The text below describes the V2 file aerodb adopts.

Data of the module, in `planner/flight_performance_database_merged.fpdb.json` (`{ schema: 'flight-performance-db/v1',
profiles: [ … ] }`, the V2 file and path), merged sheet by sheet (the newest wins). aerodb only completes a sheet
(EUROCONTROL, SimBrief, estimate); it never holds the pilot's sheets.

## 10. Aerodrome weather (`modules/fuel/weather.js`)

- **Source**: aviationweather.gov, `api/data/metar` and `api/data/taf` (`ids=<ICAO,…>&format=json`), through
  `ctx.net` (relayed by the launcher: the service has no CORS), 40 stations per call; the stations are the departure,
  the aerodromes of the route's corridor, the arrival and the alternate. **Corridor** (23 Oct 2026, replaces the
  "intermediate aerodrome" field): aerodb `aerodromes({ bbox })` of each leg's box widened by the radius of the quote
  settings (`wxRadiusNm`, default 10 NM, 0 to 50), kept within that radius of the route (projection on the nearest leg,
  local plane), departure and arrival excluded, sorted by distance along the route; recomputed when the points or the
  radius change. A corridor aerodrome without METAR or TAF is ignored. The last answers are kept on the device (`cache/fuel/weather.json`) and shown,
  with their time, when the network cannot be reached.
- **Which message**: with a flight date (optional, device time) inside the TAF's validity, the TAF: its base group
  (last group without change, BECMG or FM covering the time) and its temporary groups (TEMPO, PROB) covering it;
  otherwise the METAR.
- **Shown per aerodrome**: flight category (LIFR: ceiling < 500 ft or visibility < 1 SM; IFR: < 1,000 ft or < 3 SM;
  MVFR: ≤ 3,000 ft or ≤ 5 SM; else VFR — the METAR's own category when it gives one), wind with gust, head / tail and
  crosswind components on the main runway's end closest to the wind (aerodb aerodrome `bearing`, true; runway number
  from `bearing − magVar`), ceiling (lowest BKN / OVC, else vertical visibility), visibility in km ("≥ 10 km" for
  6+ SM), temperature and QNH, weather, temporary groups, a warning for CB / TCU, the raw message folded.
- **Card**: departure, arrival, alternate, then the corridor aerodromes (folded under "n aerodromes along the route"
  when more than two); each line gives its distance from departure (the alternate: from arrival).
- **Real weather** (box): the quote's wind becomes the average of the wind vectors of the departure, the corridor
  aerodromes and the arrival that have a wind, each segment between two of them the mean of its two ends, weighted by
  its length along the route (at least two aerodromes, else said); its source is written
  under the wind fields. Typing a wind unticks it. Surface wind as a stand-in for the wind at the level: an
  approximation, said as such.

## 6. Invariants

1. The quote is a pure function of its inputs: same inputs, same quote, on every device.
2. The module never reads `sia/base/` or `AircraftDB/`: type data comes from aerodb; data files only through the adapter.
3. Fuel quantities are in the sheet's unit inside the model; conversion to the displayed unit belongs to the screen.
   The same holds for speeds, altitudes and distances: the model, the current flight and the sheets keep kt, ft and NM
   (and ft/min); the displayed units (§ 9, "Display units") are the screen's, in both directions, display and typed
   input. A converted value is never written into a record.
4. No estimated value is ever written into a sheet without a gesture of the pilot.
5. ICAO and EUROCONTROL data never enter the repository (tests use a fictitious sheet).

## 7. Level decision and climb instructions (`window.FuelLevels`)

- **Climb goals**: economical (`eco`, least fuel), best rate (`vy`), fast (`fast`, least time), the sheet's climb IAS
  (`prof`, full throttle at that IAS; becomes `vy` when the sheet has no climb IAS) and manual (`man`: IAS and rate, or
  throttle at a fixed fraction). Manual settings start from the sheet's climb IAS and rate, bounded by the model:
  IAS from 0.8 to 2.6 × the minimum-drag speed (jets: 360 kt at most), rate up to the ground climb rate rounded up to
  100 ft/min (200 at least); a rate at or above that bound means full throttle.
- **Decision series**: the whole trip (climb with the goal's law, cruise, descent) at every level, by 500 ft (1,000 ft
  when the ceiling is above 20,000 ft), up to 110 % of the ceiling; beyond the ceiling the series is extrapolated
  linearly from its last two valid points (marked extrapolated). Levels below 1,000 ft are not candidates. When the
  trip cannot be flown above some level under the ceiling (too short to climb, not enough thrust), the series stops
  there and the reason is kept. Answers: the level with the least fuel and the fastest one.
- **Level curves**: the same trips for the normal and economical cruise modes by 500 ft, the wind range when the wind
  is unknown, the highest level reachable on the trip and why, the optimums, the sustainable cruises and the trip at the
  plan's level.
- **Climb instructions** to the plan's level (bounded to the ceiling, rounded to 100 ft): integrated by steps (half
  points, 100 to 500 ft), read at the ground, 2,000 ft, 5,000 ft, 10,000 ft, then every 5,000 ft and at the level:
  throttle, RPM read in the engine map at that altitude (two rows at least), IAS, rate, fuel flow, Mach, cumulative
  time and fuel. A climb whose rate falls under 20 ft/min is reported as not reaching the level.
- **Minimum distance** for a level: the climb distance plus the descent distance; none when the cruise cannot be held.

## 8. Performance sheets in pure code (`window.FuelSheets`)

- **Formats read**: the suite's performance CSV (simple and enriched: one row per aircraft, ranges such as "800-900 lb/h"
  and RPM tables written in a cell), JSON sheets or a sheets database (`flight-performance-db/v1`), Little Navmap
  `.lnmperf` (XML), a SimBrief OFP (sheet of the type from the OFP, and a calibration measured on its navlog: climb,
  cruise and descent durations, fuel, distances, rates), a ChatGPT reply whatever its shape (code fence or not,
  comments, trailing commas, units in values, keys in another case, nested objects). A number in a ChatGPT value is
  read by its form: commas between groups of three digits are thousands separators ("2,400", "1,234.5"); dots between
  groups of three followed by a decimal comma are the European form ("2.400,5"); otherwise a single comma is decimal
  ("2,5", "0,850").
- **Written**: `.lnmperf`, refused with the list of empty fields when one is missing (Little Navmap needs them all).
- **Completed**: from the type's EUROCONTROL record (proposed values per field, never written without a gesture),
  SimBrief's type data, or another sheet of the same type (only the empty fields; fuel converted to the sheet's unit).
- **Merged sheet by sheet**: a sheet's date is the latest of its dates (update, import, SimBrief snapshot, calibration);
  differences between two sheets are listed field by field and RPM row by RPM row; the pilot picks what to take.
- **ChatGPT**: the prompt for a type (model, variant, fleet, what is already known) and for the missing fields of
  several sheets, in the page language; the reply's keys checked against the schema of `perf_prompt.js`.
- Environment (`FuelSheets.configure`): aerodb's aircraft base, the existing sheets, the active sheet, the texts and
  the language; nothing else is read.

## 9. Screens (`modules/fuel/module.js`)

An ES module for the frame (`meta`, `mount(el, ctx)`, `unmount()`); it loads the pure files above once, with `import()`.
Styles are scoped to `[data-module="fuel"]` and built on the frame's tokens and classes; no global sheet. Two screens
inside the module, switched by two buttons at the top, the last one kept on the device (`cache/fuel/ui.json`).

- **Plan**, one column on a phone, the first three blocks side by side on a wide screen:
  1. **Aircraft** (since 23 Oct 2026, aerodb's registry): one line — the chosen aircraft (name, registration,
     callsign, type) with its origin, and a search button that unfolds one field and its results from
     `aircraft().search(text)` (sheets → fleet → reference → types → free code, each with its origin; an aircraft shows
     the sheet that will serve it: its own, its type's, or the type estimate). Choosing writes
     `aircraft().aircraftOf(hit)` into the current flight. Former text kept below for the quote's origins: the sheets of the shared database, or "other type" (an ICAO code: aerodb's estimate); the origin
     of the cruise fuel flow (this flight's entry, the sheet's RPM table or cruise flow, Poll-Schumann, SimBrief, the
     type estimate) and whether it is approximate.
  2. **Route**: departure, arrival, alternate; the **route text, always visible, is the first input** (23 Oct
     2026): free text read as item 15 or as an OFP list; on leaving the field it is normalised — one line, upper case,
     DCT and speed-level groups dropped, departure and arrival at the ends, levels as "/Fnnn" after the point where
     they change, airways, procedures and unknown words kept in place (the unknown points named in a line under the
     field, no dialog); ICAO coordinates (4530N00030E, 45N005E) and "NAME lat lon" read as points; an identifier
     aerodb does not know takes the position it already has in the flight's points (a point placed by hand keeps it).
     Distance and true track are **read, not typed**: a line gives them with their source (the route, the SimBrief
     OFP, typed by hand); only when nothing resolves does "Type them by hand" unfold the two fields. **Route points**
     (lot C, folded under "Points (n)", secondary): the resolved points as a list —
     move up, move down, remove, add before the arrival (an identifier from aerodb `coords`, or "NAME lat lon"); each
     intermediate point has an optional level (FL), the level flown from that point on (steps), a point without one
     continuing the previous (shown as its placeholder). Every change rewrites the route text from the points alone
     ("DEP PT1 PT2/F280 ARR"), derives distance and track, writes the current flight (300 ms after the
     last change) and redoes the quote. Reading a route: the level of an entry (/N0450F370 or /F370), or an item 15
     speed-level group after a point, becomes that point's `alt_ft`, kept only where it changes and never on the
     departure or the arrival (an OFP repeats its level at every point). "Last SimBrief OFP": through `ctx.net`, the SimBrief identifier
     of the identity (never typed here), the OFP kept on the device only, its route, level, average wind, ISA
     deviation and aircraft taken into the current flight.
  3. **Level and wind**: level (FL), climb goal (§ 7), wind direction and speed (speed only or nothing: range), ISA
     deviation; IAS and rate for the manual goal. Once the weather is read, a line proposes the ISA deviation of the
     departure METAR: temperature − (15 − 1.98 × aerodrome elevation in thousands of ft), the elevation from aerodb
     (`aerodromes({ icao }).elev`, ft), else the METAR's (m), rounded to 1 °C; "Use ISA …" writes it into the flight
     and into the quote settings (`isaDev`), which a flight without a deviation starts from; a typed deviation is kept
     there too.
  3 bis. **Density altitude** (folded): a chart with the ISA deviation across (−20 to +40 °C, widened to the flight's
     and the departure's), the density altitude up, one line per pressure altitude (density altitude = the standard
     altitude of the same density, `FlightPerfModel.isa(h, dT).sigma` inverted by bisection); the flight's deviation
     (vertical), the sheet's ceiling (`cruise.ceilingFt`, else the model's `perf.ceiling`, horizontal) and their
     crossing, the pressure altitude where the ceiling is reached at that deviation (bold line), and the departure
     from the METAR (temperature and QNH: pressure altitude = elevation + 27 ft/hPa × (1013.25 − QNH)). Two reading
     lines under it give the departure's pressure and density altitudes and the effective ceiling.
  4. **Level decision**: a drawing of the whole trip's fuel (solid) and time (dashed) by level, extrapolated beyond
     the ceiling (dotted), the levels that cannot be flown shaded, the ceiling, the least fuel (dot) and the fastest
     (square), the plan's level (vertical line). A tap on the drawing sets the level (rounded to the series' step,
     within the flyable levels); two buttons take the least-fuel and the fastest levels.
  5. **Result**, sticky at the bottom: block fuel (a range when the wind is unknown), trip, time, top of descent,
     approximate source and MTOW warnings.
  - Folded, under the result: **Open in ▾**, the V2 links (`frame/lib/external_links.js`, copied from
    `shared/external_links.js`): SimBrief dispatch prefilled (departure, arrival, type, route points, registration,
    callsign, alternate, level), SkyVector (`?fpl=` with the speed / level group, departure, points, arrival), Navigraph
    and ChartFox (departure and arrival aerodrome pages); plain links in a new tab, an entry greyed with what it lacks.
  - Folded: the quote's details (taxi, climb, cruise, descent with time and distance, contingency, reserve, block),
    the climb instructions (drawing of altitude against time with the IAS at each reading, then the table: throttle,
    RPM, IAS, rate, fuel flow, Mach, time, fuel), the quote settings (taxi and reserve minutes, contingency, displayed
    units, this flight's cruise fuel flow for the sheet).
- **Display units** (the quote settings fold, one grid row of four selects: fuel, speed, altitude, distance; they
  wrap on a phone). Fuel: kg / lb (`displayUnit`). Speed: kt / km/h (`displaySpeed`, 1 kt = 1.852 km/h). Altitude: ft /
  m (`displayAlt`, 1 ft = 0.3048 m). Distance: NM / km / SM (`displayDist`, 1 NM = 1.852 km = 1.150779 SM). Defaults
  kg (the sheet's unit), kt, ft, NM; saved with the other quote settings (`pilot/<trigram>/fuel.json`). Rules:
  - The conversion is the screen's (invariant 3): `FuelModel.convertFuel / convertSpeed / convertAlt / convertDist`
    are the pure arithmetic, the screen has one set of helpers per quantity (`speedTxt`, `altTxt`, `distTxt`, and
    the vertical speed that follows the altitude unit per minute), each with its number-only, input-field and parse
    counterparts and its unit symbol. Every number on the Plan screen that carries one of these units, and every
    unit label (field labels, table headers, the sticky result, drawing labels, messages), goes through them. Unit
    symbols are not translated.
  - Typed input is parsed back to the model unit (distance, wind speed, manual IAS and rate), rounded to 0.01 of the
    model unit when the unit differs, so a whole number typed in the displayed unit is displayed again unchanged
    (100 km → 54 NM → 100 km); in the model's own unit the typed value is kept as typed. Displayed values are rounded
    to the whole number. Changing a unit redraws the fields with the model's value in the new unit and leaves the
    current flight untouched.
  - **Flight levels stay flight levels** (FL120, hundreds of feet) whatever the altitude unit: the level field, the
    level decision (axis, legend, buttons), the sticky result and the climb drawing's target keep FL. The altitude unit
    shows as a value where an altitude is a value: the climb table's altitude column (flight levels while the unit is
    ft, the altitude in metres otherwise), the vertical rate column and the manual rate field (ft/min or m/min), and the
    level in metres next to the FL in the sticky result when the unit is not ft.
  - The Sheets screen shows and edits the sheets' own fields (kt, ft, NM, fuel unit of the sheet): it is not affected.
- **Sheets**: the list (name, type, unit, origin, empty fields, date; "Use" sets it for the flight, "Edit");
  import of files (CSV, JSON, `.lnmperf`, SimBrief OFP) or of a pasted text (the same, or a ChatGPT answer); a new
  sheet from an ICAO code (SimBrief type data when aerodb has them); a sheet from the last OFP (calibrated on its
  navlog). The editor: the fields by group (labels in the four languages), the RPM table (edited row by row on a
  computer screen, wider than 760 px: RPM, altitude, minimum, nominal and maximum flow, rows added or removed; read only
  on a phone), completion from
  EUROCONTROL or from another sheet, the ChatGPT request (whole sheet or empty fields, copied) and its answer pasted,
  export `.lnmperf` and JSON, deletion after a question.
- **Every change of a sheet goes through a preview**: one line per changed field and per RPM row, before and after,
  ticked by default (a EUROCONTROL value replacing a filled field is not ticked); "Apply the selection" writes only the
  ticked lines (`pickChanges`), dated `updatedAt`. A removed RPM row is a line too: unticked, it stays. A new sheet is shown whole, without boxes. Several sheets read at
  once are previewed one after the other.
- **Writes**: the sheets database whole (sheets without their working keys `_…`, the other fields of the file kept);
  the current flight after a quiet time (read again, own fields changed, the rest kept, `updated_at`); the settings
  likewise. A change of the current flight written elsewhere (maps, another device) redraws the screen when no field
  has the focus.
- **Phone**: no horizontal scroll at 375 px (wide tables scroll inside their block), touch targets of the frame
  (44 px), drawings redrawn at the width of their block.
