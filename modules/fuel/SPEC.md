# fuel — specification (regeneration prompt)

This document describes the V3 fuel module completely enough for a developer or a language model to rebuild it without
seeing its code. The reference implementation is `modules/fuel/model.js` (the pure quote model) with
`modules/fuel/performance_model.js` (the calibrated flight mechanics, copied from V2 unchanged); the module's screens
(`modules/fuel/index.js`) come with lot 2b, on the frame's module loader. How the frame mounts it and what it reads and
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
- **Totals**: trip = climb + cruise + descent; contingency = trip × %; block = taxi + trip + contingency + reserve.
- **Time and TOD**: time = climb + cruise + descent minutes; TOD = level ÷ gradient + buffer (NM).
- **No fuel flow known**: the quote says so (`hasFuel` false) instead of a misleading zero.

## 4. The current flight shared with maps

A record `pilot/<trigram>/current_flight.json` (merge rule `record`: the newest `updated_at` wins) holds the flight
both modules work on; the schema is in [INTEGRATION.md](INTEGRATION.md) § 3. Read it at mount; write it with every
field kept (read, change own fields, write the whole record with a new `updated_at`).

## 5. Performance sheets (lot 4)

Data of the module, in `planner/flight_performance_database_merged.fpdb.json` (`{ schema: 'flight-performance-db/v1',
profiles: [ … ] }`, the V2 file and path), merged sheet by sheet (the newest wins). aerodb only completes a sheet
(EUROCONTROL, SimBrief, estimate); it never holds the pilot's sheets.

## 6. Invariants

1. The quote is a pure function of its inputs: same inputs, same quote, on every device.
2. The module never reads `sia/base/` or `AircraftDB/`: type data comes from aerodb; data files only through the adapter.
3. Fuel quantities are in the sheet's unit inside the model; conversion to the displayed unit belongs to the screen.
4. No estimated value is ever written into a sheet without a gesture of the pilot.
5. ICAO and EUROCONTROL data never enter the repository (tests use a fictitious sheet).
