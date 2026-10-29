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
  [{ `rpm`, `altFt`, `fuelFlowMin`, `fuelFlowPerHour`, `fuelFlowMax` }], `airframe` (aeroplane, helicopter, gyroplane, glider, balloon, airship), `propulsion` (piston, turboprop,
  turboshaft, jet, electric, none, other), `typicalWindKt`. These two fields replace `engineType` (28 Oct
  2026): empty means "as the ICAO base says" (`AeroDBSheets.catalogFacts`), the model reads `propulsion` first
  (turboshaft counts as turboprop, electric as piston), then the legacy `engineType` of an old sheet, then the base and
  the cruise TAS.
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
- **Level decision = the quote** (23 Oct 2026): each holdable level of the decision curve (below the ceiling, not
  extrapolated) takes the trip fuel and time of `M.quote` at that level (same climb law, cruise legs and descent),
  with the forecast wind at that level when the real weather is on (`aloftMeanAt`), else the quote's wind. **One basis
  for every point** (24 Oct 2026): every level, the plan's included, is a **flat flight at that level** (`steps: null`),
  so that no point of the curve is computed differently from its neighbours (the plan's level once took the route's
  steps and made a spike at exactly that level, with false optimums beside it). **The plan's real quote is its own
  marker**: at the plan's level, the quote with the route's steps and the plan's wind, drawn as a diamond on each curve
  (smaller when the route has no steps, where it coincides with the curve) and written in the legend ("Plan: FL160,
  856 kg, 0:54"); `FuelLevels.requoteSeries(D, quoteAt, { h, quote })` (pure) rewrites the series and gives
  `D.plan = { h, fuel, minutes, stepped }`. Least fuel and fastest are the minima of the flat series (the "Use FLxxx"
  buttons follow them); the result bar keeps the plan's real quote. Beyond the ceiling the model's extension stays
  (dotted).
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

- **Source** (28 Oct 2026): the frame's weather layer, `ctx.weather.metar(ids)` and `ctx.weather.taf(ids)` (frame
  INTEGRATION § 14): aviationweather.gov relayed by the launcher, without one the METAR from metar.vatsim.net and the
  TAF from avwx.rest with the device's key; kept 30 min per aerodrome by the layer. Fuel calls no weather host itself.
  The TAF only when a flight date is given (the TAF is only read then), for the departure, arrival, alternate and the
  stations that have a METAR (no key: "TAF unavailable without a launcher or a weather key", the METAR answers); the
  card says the source. Offline: the layer's reserve (`cacheOnly`), with the time of its newest METAR; the stations are the departure,
  the aerodromes of the route's corridor, the arrival and the alternate. **Corridor** (23 Oct 2026, replaces the
  "intermediate aerodrome" field): aerodb `aerodromes({ bbox, lite: true })` (aerodb's light index of
  the aerodromes — code, name, position, elevation, runway axis — when the base was published with it, else the full
  file) of each leg's box widened by the radius of the quote
  settings (`wxRadiusNm`, default 10 NM, 0 to 50), kept within that radius of the route (projection on the nearest leg,
  local plane), departure and arrival excluded, sorted by distance along the route; recomputed when the points or the
  radius change. A corridor aerodrome without METAR or TAF is ignored. Fuel keeps no copy of its own (the former
  `cache/fuel/weather.json` is removed from the device once).
- **Which message**: with a flight date (optional; `current_flight.planned_at`, entered in the device's time) inside the TAF's validity, the TAF: its base group
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

## 11. Winds and temperatures aloft (`modules/fuel/winds.js`, lot F)

- **Source** (28 Oct 2026): the frame's weather layer, `ctx.weather.aloft(samples, when)` (frame INTEGRATION § 14):
  temperature, wind speed (kt) and direction at 14 pressure levels (1000 to 200 hPa) at up to 24 places — the route's
  points plus a place about every 50 NM (`winds.js` `samples`) — at the hour nearest to the flight date (else now); the
  model by the route's middle (`ctx.weather.modelFor`: `meteofrance_seamless` AROME / ARPEGE over France and its
  surroundings, `icon_seamless` elsewhere in Europe, `gfs_seamless` beyond; `winds.js` `modelFor` delegates to it),
  with its run time. The layer answers from its reserve (`cache/weather/`, cells of 0.1° at least, read at the cell's
  centre) and asks Open-Meteo only for what is missing; its calls are counted for the device ("Weather: n calls
  today" in the Status block). Offline: its reserve only (`cacheOnly`). The flight date is `current_flight.planned_at`,
  the same value as the aerodromes' weather and the Map's ETA read. Fuel keeps no copy of its own (the former
  `cache/fuel/aloft.json` is removed once). Read with the aerodromes' weather, again when the route's points or the
  flight hour change.
- **At a level**: a flight level is a pressure (ISA): wind (as a vector) and temperature are interpolated in
  ln(pressure) between the two levels around it; ISA deviation = temperature − ISA temperature at that pressure
  altitude. The level of each place is the plan's, then the steps' (`alt_ft` from their point on).
- **Wind of the quote** ("Real weather" ticked): the mean of the winds at the planned level along the route, each
  leg the mean of its two ends weighted by its length; preferred to the METARs' surface wind, which stays the
  fallback. Source shown under the wind fields.
- **While a new forecast loads** (route or hour changed): the previous wind aloft stays, `windSource.pending` and
  "forecast loading…" in the result; only a failed reading hands over to the METARs' surface wind, said as such
  (`windSource.aloftFailed`, "forecast aloft unavailable").
- **Current flight**: `route.points[].wind = { dirDeg, kt, tempC, levelFt, at }` for maps' arrows.
- **Shown**: step 3, a table per route point (level, wind, temperature, ISA deviation) with model, hour, run and
  reading time; step 4, under the density altitude chart, the real atmosphere at departure — temperature by pressure
  altitude against ISA (dashed), inversion layers shaded and listed, the planned level marked, and at that level the
  temperature, ISA deviation and density altitude.
- **Across the date line** (24 Oct 2026): `samples` interpolates the longitudes of the places on the unrolled route
  (`frame/lib/geo.js`: UHMA 177.7° E → PAOM 165.4° W goes 177.7° → 194.6°, not back round the world) and returns the places
  wrapped in [-180, 180[ (a longitude already inside is returned as written), so the forecast is never asked outside it
  and a route that stays on one side is unchanged.
- Bench `test/winds.html` (35 checks: pressure altitudes, interpolation, samples, samples across the date line, steps, mean
  wind, inversions, the profiles' shape fuel reads (the layer's `profilesAt`), model choice).

## 12. Progress of a started flight (`modules/fuel/progress.js`, lot H)

- **Start, cancel** (rectified by the user, 23 Oct 2026): "Start the flight" launches the flight plan (engine start,
  push-back, taxi…). It first redoes everything for now — the flight date goes back to now, the aerodromes' weather
  and the winds aloft are read again (ISA at the level with them), the quote is redone — and says in one line what
  changed (wind, block, planned arrival); offline it says so and starts with the last quote. Then it writes
  `started = { at, by: 'fuel' }` (Report's engine start). A started flight ends with its report (report writes
  `started = null` and `progress = null` on saving) or with "Cancel the start" (confirmation, the same nulls). The
  sticky result shows "Flight started at hh:mm · for 1 h 12".
- **Planned timeline** from the start time: taxi (quote settings), the quote's climb, the cruise split by route leg —
  ground speed = cruise TAS + the leg's wind component (the forecast winds at both ends of the leg, else the quote's
  wind), durations scaled so the cruise keeps the quote's time —, the quote's descent; fuel burnt along it by phase.
  From it: the estimated time over each point, the planned position at a given time (leg, NM from departure), the
  distance and planned fuel remaining.
- **Current flight**: `progress = { at, fuelRemainingKg, remainingNm, phase }` for a started flight, written when it
  changes — every minute during the flight, at every quote change — until the report or the cancellation;
  `progress.actual` (the real position) is written by the frame and kept. The ETAs and the planned position are not
  written (28 Oct 2026): readers derive them from `quote.legs` (`frame/lib/current_flight.js` `etaOf`,
  `plannedPositionAt`); a flight that is only dated has no `progress`. The screen keeps its own computation for the
  card below.
- **Shown**: the Departure step's "Planned progress" card: the line of the moment and the points with their ETA, the
  next point highlighted.
- Bench `test/progress.html` (14 checks).

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
inside the module, switched by two buttons at the top: **Quote** (fr "Devis", de "Berechnung", es "Cálculo"; the Plan
screen below; renamed on 24 Oct 2026, it was "Préparer / Plan / Planen / Preparar", a name the frame's bottom tab now
carries) and **Sheets**. **The module always opens on the Plan screen** (24 Oct 2026): one comes
here to change the flight plan or the fuel quote, rarely to edit an aircraft; the Sheets screen opens only by its
button or by the address `#fuel?view=sheets` (`ctx.query.view`), and the last screen is neither kept nor read at
mount. Inside a mount, the two buttons switch as before.

- **Plan in five steps** (lot G, 23 Oct 2026, the pilot's own order: aerodromes, aircraft, level → route → weather →
  density altitude and quote → correct the route → start): a steps bar as in Report — **1 Flight** (departure,
  arrival, alternate, **flight date** (24 Oct 2026: the field "Flight date" writes `current_flight.planned_at`, the one value of
  the flight's date, with its quick buttons "+30" and "Now"; hint: the quote's weather and the Map are read at this date), the one-line aircraft — no default sheet: a flight without
  aircraft takes the last one chosen on the device, `cache/fuel/last_aircraft.json`, shown first in the empty search
  — level), **2 Route** (the route text, the read distance, the
  folded points, "Last SimBrief OFP", "Show the map"), **3 Weather** (wind, ISA and its METAR proposal, real weather,
  the aerodromes of the corridor), **4 Result** (fr "Résultat", de "Ergebnis", es "Resultado"; it was "Quote", the name of the first tab: renamed on 24 Oct 2026; density altitude, level decision with the climb goal, "Open in",
  details, climb instructions, settings), **5 Departure** (a one-page summary: aircraft, normalised route, level and
  steps, wind and source, block fuel; "Start the flight" writes `current_flight.started = { at, by: 'fuel' }` and
  opens the Map). One step at a time when the module is narrow (phone, dual-view pane: `@container` under 900 px; the
  bar shows the numbers, the current step with its name; "Next" under each step); all five one under the other when
  it is wide, without bar or "Next". The sticky result stays under every step; a ✓ marks a filled step (aerodromes,
  aircraft and level; route resolved or typed; weather read or wind given; fuel quoted; flight started). The step is
  kept in `cache/fuel/ui.json`. Everything recomputes live (route → weather → quote, no "redo" button). "Show the
  map": `#fuel?with=maps` from 980 px (the frame's dual view), else `#maps?from=fuel`; hidden while the map is beside fuel
  (`ctx.layout.with === 'maps'`, followed through the frame's `frame-layout` event). Arriving with
  `ctx.query.focus === 'route'` (the Map's "Edit the route", `#fuel?from=maps&focus=route`) opens step 2 with the
  route field focused; `ctx.query.focus === 'arr'` (the Map's "Change" on the arrival, `#fuel?focus=arr`) opens the step that
  holds the arrival row — **1 Flight** before the start, **5 Departure** after — and focuses its first select. The blocks below
  keep their former description:
  0. **Runway, SID, STAR and approach** (28 Oct 2026, V3_SPECIFICATION § 10.20), in step 1 after the aerodromes: two short rows,
     "Departure: runway · SID · transition" and "Arrival: runway · STAR · transition · approach" (+ the approach transition
     select, only when the chosen approach has transitions). Each is a `select` filled by `aerodb.runways(icao)` and
     one `aerodb.procedures(icao)` (all kinds; fuel sorts them): a list shows ALL the procedures of the aerodrome (the
     approach list does not wait for a STAR), in ONE flat list ordered by runway then name (no `<optgroup>`; the X-Plane records
     last by the sort), whatever the runway chosen; an aerodrome is « without data » only when it has no procedure of any kind and no runway; the
     lists are read again when aerodb announces new procedures. The runways offered are those of `aerodb.runways(icao)`; when it
     answers `[]` (files without runway records and `RWnn` points without position), those the aerodrome's procedures name (the
     union of their `runways`, `ALL` / empty excluded), and failing that the two ends of the runway axis in the base
     (`aerodromes({ icao })`: `bearing`, `magVar` → magnetic numbers without side, « 24 » and « 06 »); fuel only reads. Options: empty = not chosen ("—"),
     "aucune" (writes `null`; SID, STAR and approach), then the procedures by name; a record with `status: 'xplane'` (local)
     comes last, worded "X-Plane, local"; an `outdated` one ends with ⌛; the runway is in the label only when the record serves exactly
     one and its name does not already say it (« MAN1A · 07 », « RNP RWY 02 »); the label then ends with ⌛ (outdated, grey, class
     `outdated`) and ⚠ (in conflict with the current choice, orange, class `conflict`, the reason as `title`, both reasons joined when
     both apply). A change rewrites `route.procedures` v2 (`by: 'fuel'`, `at`) and drops what depended on it. A conflict is marked,
     never forbidden: ⚠ is on a SID, STAR or approach that does not serve the chosen runway (a record with no runway named, or `ALL` /
     `RWALL`, serves them all) and, with no runway chosen, on a STAR that serves no runway of the chosen approach — the runway only
     (29 Oct 2026): the STAR → approach and transition → STAR end continuity is never a conflict (real STARs end in a hold or radar
     vectors; the Map links them dashed). A conflicting
     procedure stays selectable and the choice is kept; ONE floating notification (`⚠ RNP RWY 07 : Ne dessert pas la piste 02`) says
     the conflict when it appears, not at every redraw; the change notifications of « Load my OFP » carry the same ⚠. A SID, STAR
     or approach chosen while no runway is, and serving one runway only, sets that runway; the STAR chosen offers its transitions,
     the approach chosen its approach transitions, another STAR / approach / SID removes the transition. An aerodrome
     without data: the row says "aucune procédure publiée" and offers one button, "Lire les procédures de LFXX"
     (`aerodb.fetchProcedures(icao, { onProgress, signal })`, one aerodrome per gesture, nothing fetched silently); a refusal
     shows its reason in a floating notification (`ctx.notify`), and without a launcher (or on a device paired with the
     workstation) the reason says the reading is done on the workstation and proposes the SimBrief OFP as the per-flight
     source. aerodb picks the source by State (82eeef3b5): France from the SIA eAIP (no account), a State whose AIP publishes
     coding tables from EAD Basic; while it reads, the button names the source it announces (`onProgress` `source`: "Lecture de
     l'eAIP du SIA…" / "Lecture d'EAD Basic…", with the progress n/total); any other State is refused `no-tables` ("Aucune table de
     procédures publiée pour cet État", plus "Little Navmap a une base sur ce poste" when the answer carries `lnm: true`);
     `no-credentials` only comes from EAD. `too-soon` (EAD Basic, 30 s between two readings) says "Patientez {wait} s avant la lecture suivante (EAD Basic)". A procedure read under an earlier cycle ends with the symbol ⌛ in the lists and in the change notifications, never the word « périmé » (user, 29 Oct 2026); its option has the class `outdated` (grey on the computer, ignored by a phone's native picker) and the title « Lue sous un cycle antérieur : à relire ». An aerodb `change` naming an aerodrome (`procedures: ICAO`, also with `coverage: true` when a proc/ file arrives by synchronisation) empties fuel's cache of answers and redraws the rows; when it is the flight's departure or arrival, the chosen procedures are read again. A success says its counts when aerodb gives them (`stats`): "LFXX : 78 procédures lues sur 18 pages", plus the pages not read with the most frequent reason (the tool's French phrase, translated when known) and the procedures dropped by the geometry check; never a bare "0 procédures". "Load my OFP" replaces the choice by the OFP's SID and STAR (one notification line per side).
     **The quote runs on the procedures path** (before the start): when procedures are chosen and read (`CF.loadProcedures`),
     the distance is the last point's `nm` of `CF.flownPath(CF.expandedPath(flight, procs))` (never recomputed here), the
     level steps are the route points' `alt_ft` at their `nm`, `quote.legs` has one `{ id, min, origin }` per flown point and
     `profile.path` is the planned vertical path (`progress.js` `verticalPath`: nm strictly increasing; the model's climb, cruise
     and descent, then the constraints without any vertical jump — a ceiling in the descent pulls the path down only from where the
     model's descent gradient, taken back from it, meets the cruise; a ceiling in the climb holds the path level up to it; once the
     descent has started the path never rises again, so a floor or a missed-approach climb does not lift it). The procedures' altitude constraints reach
     `profile.path` only, not the quote's level steps (the step machinery models cruise levels, not a descent through
     restrictions): fuel and time count the distance. Without procedures: the route's points, legs with origin `'route'`.
     **After "Start the flight"** the Departure step carries a "Procedures" card: the arrival row stays editable at any time,
     the departure row while the flight has not passed the end of the SID (the last point of origin `'sid'`; position =
     `progress.actual` when less than two minutes old, else `plannedPositionAt` on the path; read-only afterwards). A change
     rewrites `route.procedures`, `quote.legs`, `profile.path`, the progress length and `quote.legsAt`; the block, trip, minutes
     and the rest of the quote do not change (the quote keeps `quote.distanceNm` while the route is unchanged) and no new
     quote is made. Nothing else is made editable by this lot after the start (the former behaviour is untouched, see
     DECISIONS 28 Oct 2026).
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
     **"Auto" button** (25 Oct 2026, next to the route field, 44 px, in the field's row): for each pair of consecutive named
     points with nothing between them in the text (no airway, no procedure), the shortest path over the published base's
     airways (`AeroDB.airways`, V2's rules ported in `frame/lib/routing.js`: a leg open at the level when floor − 100 ≤
     level ≤ ceiling + 100 ft, direct entry and exit within 60 NM, no detour over 40 %, no leg of 40 NM or less unless its
     two ends are airway nodes joined by open airways, the airway preferred to a direct entry of the same length) at the
     planned level (the flight's, else the quote's, else 6,500 ft, said in a notification; a point's own level holds from that
     point on). It writes `route.text` ("LFRS TSA01 UT460 TSA05 LFML": the airway's middle points are not written) and
     `route.points` (every node, the middle ones with `awy: true`, the points reached by an airway with `via`), reads the route
     again (`resolveRoute`) and redoes the quote; a notification gives "n airways written, d NM" or "no useful airway between X
     and Y" (four languages), "no base" when aerodb has nothing to read. An airway's ends that aerodb does not know take the
     position of the segment (they are in `route.points`, which the reading takes as a fallback): no "unknown points".
     **Limits** (source: V2's `mission_routing.js`): both directions assumed open (the base carries no one-way), no fine level
     restriction, no SID / STAR, no crossing of the date line; written once, never recomputed by a later change of level.
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
     (square), the plan's level (vertical line) and the plan's real quote (diamond on each curve, with its legend
     line). The fuel axis and its unit label are in the **displayed** fuel unit (kg or lb), not the sheet's. A tap on
     the drawing sets the level (rounded to the series' step, within the flyable levels); two buttons take the
     least-fuel and the fastest levels.
  5. **Result**, sticky at the bottom: block fuel (a range when the wind is unknown), trip, time, top of descent,
     approximate source and MTOW warnings. **Phone rule: compact, about 100 px at 390 px** (it was 190): a context line
     on **one line** (`white-space: nowrap`, ellipsis, the full text in `title`) — short form "Block · FL060→090→110→070 ·
     wind ARPEGE FL060" (levels joined by → without spaces, "FL" written once, the wind source shortened, "unknown
     wind" for a range), full form "Block fuel · FL060 → FL090 → FL110 → FL070 · wind: ARPEGE forecast FL060"; the big
     figure at `--sog-h2` under 760 px (container query of the module, `--sog-h1` above); then **three tiles on one
     row, label and value each on one line**: "Trip" (fr "Étape", de "Reise", es "Etapa"), "Time" and **"TOD" in the four
     languages**, labels at `--sog-size-xs`, values at `--sog-h3`, the value of TOD without "before" ("28 NM"), the full
     name in each tile's `title` ("Top of descent: 28 NM before"). Values go through `fuelTxt`, `distTxt`, `hmm`. The
     quote details keep the full words. Module-scoped rules on `.f-bar` and `.f-tiles` (the frame's primitives are
     unchanged).
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
- **Sheets**: the list, sorted like V2's by category (helicopters, turboprops, jets, piston engines, others: aerodb
  `classify`), then by name: each sheet (name, type, unit, origin, what is missing named by family — "To complete: rpm, speeds, cruise…", or
  "complete" —, date; "Use" sets it for the flight,
  "Edit"), then the airline's types without a sheet (aerodb `fleetTypes()`: fleet and reference, aliases resolved;
  a type is covered when a sheet's ICAO code, type or id resolves to it), "Company type (n aircraft): performance to
  fill in", with "Create the sheet" (the "new sheet" flow without asking the code, named after the model);
  import of files (CSV, JSON, `.lnmperf`, SimBrief OFP) or of a pasted text (the same, or a ChatGPT answer); a new
  sheet from an ICAO code (SimBrief type data when aerodb has them); a sheet from the last OFP (calibrated on its
  navlog). The editor: the fields by group (labels in the four languages; airframe and propulsion are lists whose empty
  choice reads "auto · <what the ICAO base says>"), the RPM table (edited row by row on a
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
