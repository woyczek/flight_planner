# fuel — specification (regeneration prompt)

This document describes the V3 fuel module completely enough for a developer or a language model to rebuild it without
seeing its code. The reference implementation is `modules/fuel/model.js` (the pure quote model),
`modules/fuel/levels.js` (the level decision and the climb instructions, pure) with
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
