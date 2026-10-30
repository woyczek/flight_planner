# fuel — specification

The V3 fuel module as it is: what it computes, what it shows, what it reads and writes. Enough for a developer or a language model
to rebuild it without its code. How the frame mounts it and its records: [INTEGRATION.md](INTEGRATION.md). Why each rule is so, with
its date and its history: [DECISIONS.md](DECISIONS.md).

**Files.** Pure, without page or storage: `model.js` (`window.FuelModel`, the quote), `levels.js` (`window.FuelLevels`, the level
decision and the climb instructions), `performance_model.js` (`FlightPerfModel`, the calibrated flight mechanics of V2, unchanged),
`winds.js` (winds aloft at a level), `weather.js` (METAR and TAF read), `progress.js` (a started flight's timeline and the vertical
path). The screen: `module.js` (`meta`, `mount`, `unmount`), with `procedures.js` (the procedure card) and its texts
`procedures_texts.js`, `adnames.js` (aerodrome names and their completion), `routecomplete.js` (the route field's completion) and
`suggest.js` (the one completion list of both). Shared with other modules, in `frame/lib/`: `procedures.js` (procedure rules),
`route_text.js` and `route_model.js` (the route text and the route read from it), `routing.js` (airways), `wind.js`, `adnames.js`,
`fms.js`, `current_flight.js` and `flight_path.js`. The sheets' pure code is aerodb's (`aircraft().lib`).

**Cases.** Each rule names the case of `tests/v3` that checks it (area F, `tests/v3/cases/fuel.py`), or says « no case » when none
does; a rule with neither a case nor code is not a rule here but a debt in DECISIONS. Invariant 6 always wins.

## 1. Purpose

The Pilot application's fuel and flight level tool: one aircraft, one route, one level; the fuel quote (taxi, trip with climb,
cruise and descent, contingency, reserve, block), the time and the top of descent; the level decision chart and the climb
instructions; the procedures of the route; the start of the flight and its progress. Phone first: one column, one step at a time
with a sticky result (§ 9; F1, F2, F4).

## 2. Inputs of the quote

- **Sheet**: the aircraft's performance sheet (V2 profile format, `flight-performance-db/v1`), normalised: `unit` (kg or lb, the unit
  of every fuel quantity of the sheet), `cruise` { `tasKt`, `fuelFlowPerHour`, `rpmNominal`, `refAltFt`, `ceilingFt` }, `climb` and
  `descent` { `iasKt`, `tasKt`, `rateFpm`, `fuelFlowPerHour`, `rpmNominal` }, `taxi` { `fuelFlowPerHour` }, `reserveFuelFlowPerHour`,
  `tod` { `gradientFtPerNm` (300), `bufferNm` (5) }, `rpmFuelCurve` [{ `rpm`, `altFt`, `fuelFlowMin`, `fuelFlowPerHour`,
  `fuelFlowMax` }], `airframe` (aeroplane, helicopter, gyroplane, glider, balloon, airship), `propulsion` (piston, turboprop,
  turboshaft, jet, electric, none, other), `typicalWindKt`, `maxCrosswindKt`. An empty `airframe` or `propulsion` means « as the ICAO
  base says » (`catalogFacts`); the model reads `propulsion` first (turboshaft counts as turboprop, electric as piston), then an old
  sheet's `engineType`, then the base and the cruise TAS (F80 quote bench, F10 sheets bench).
- **Flight**: distance (NM), level (ft; a level pinned on the chart wins over the plan's), true track, wind (direction and speed, or
  speed only, or nothing), taxi time, reserve time (min), contingency (% of the trip), take-off mass (sheet unit, optional), ISA
  deviation (°C) (F80).
- **Type data** from aerodb (`aircraft()`): the EUROCONTROL record (`perf(code)`, its `simbrief` part), the cruise estimate
  (`estimate(codes)`), the engine class (`classify`); optionally a Poll-Schumann function (F80).
- **Entry for this flight**: a cruise fuel flow typed for this flight (sheet unit per hour), which replaces the sheet's (F80).

## 3. Rules of the quote

All checked by the quote and levels benches (F80) unless said.

- **Cruise fuel flow and TAS** (`cruiseSource`): the entry for this flight; else the sheet (its RPM table at the cruise RPM and the
  plan's level, else its cruise flow); else, in this order, Poll-Schumann, SimBrief (approximate unless its accuracy is « high »),
  the estimate (approximate). TAS: sheet, EUROCONTROL, SimBrief (speed, else Mach at the level), estimate, 300 kt. The source and
  whether it is approximate are part of the answer.
- **Model sheet** (`modelSheet`): the sheet with its cruise completed by the retained flow and TAS when it lacks them or an entry
  replaces them, its climb (IAS, rate) and descent (rate, IAS) completed by the EUROCONTROL record when it lacks them. Never written.
- **Performance model**: `FlightPerfModel.create(modelSheet, { db, dIsa, apd })`; none when the cruise TAS or flow is missing (the
  quote then uses the sheet's constant values).
- **Climb**: the model's climb to min(level, ceiling) — the chosen climb law when it reaches the level, else the profile climb, said —
  else level ÷ climb rate (1,200 ft/min), its distance at the climb TAS (220 kt).
- **Descent**: level ÷ descent rate (1,500 ft/min), its distance at the descent TAS (250 kt).
- **Cruise**: the distance less the climb and descent distances (never negative), at the model's TAS and flow at the level (else the
  retained ones); ground speed = TAS + wind component, never under 80 kt.
- **Phase flows**: climb = the RPM table at the climb RPM and half the level, else the sheet's climb flow, else the cruise flow;
  descent likewise, else 45 % of the cruise flow; taxi = the sheet's taxi flow, else 25 % of the cruise flow; reserve = the sheet's
  reserve flow, else 65 % of the cruise flow.
- **Wind**: direction and speed known → its component on the track (positive = tailwind); else a range ± the speed (speed known) or ±
  the sheet's typical wind (25 kt): the block is then a range, low and high.
- **Steps** (`steps: [{ nm, ft }]`): the flight leaves at the plan's level; at nm NM from departure the level becomes ft. A change
  costs a climb (the difference of two model climbs, else the sheet's rate at the climb TAS) or a descent (descent rate and TAS); the
  cruise is split into legs, each at the model's TAS and flow at its level, shortened by the climb (first leg), the change (next
  legs) and the descent (last leg). The descent and the TOD start from the last level. A step at the same level, at 0 or beyond the
  arrival changes nothing; without steps the quote is the single-level one. The screen gives the intermediate points' `alt_ft` at
  their cumulated distance (scaled to a typed distance).
- **Level decision = the quote**: each holdable level of the decision curve (below the ceiling, not extrapolated) takes the trip fuel
  and time of `quote` at that level (same climb law, cruise legs and descent), with the forecast wind at that level when the real
  weather is on (`aloftMeanAt`), else the quote's wind. Every level, the plan's included, is a **flat flight at that level**
  (`steps: null`): no point of the curve is computed differently from its neighbours. **The plan's real quote is its own marker**: at
  the plan's level, the quote with the route's steps and the plan's wind, a diamond on each curve (smaller when the route has no
  steps) and a legend line (« Plan: FL160, 856 kg, 0:54 »); `FuelLevels.requoteSeries(D, quoteAt, { h, quote })` (pure) rewrites the
  series and gives `D.plan = { h, fuel, minutes, stepped }`. Least fuel and fastest are the minima of the flat series (the « Use
  FLxxx » buttons follow them); the result bar keeps the plan's real quote. Beyond the ceiling the model's extension stays (dotted).
- **Totals**: trip = climb + cruise + steps + descent; contingency = trip × %; block = taxi + trip + contingency + reserve.
- **Time and TOD**: time = climb + cruise + steps + descent minutes; TOD = last level ÷ gradient + buffer (NM).
- **No fuel flow known**: the quote says so (`hasFuel` false) instead of a misleading zero.

## 4. The current flight shared with the Map

A record `pilot/<trigram>/current_flight.json` (merge rule `record`: the newest `updated_at` wins) holds the flight the Pilot
application works on; its schema is [INTEGRATION.md](INTEGRATION.md) § 3. Read at mount; written with every field kept (read again,
own fields changed, the whole record written with a new `updated_at`), after a quiet time of 300 ms (F80 current flight bench, F7
mount race, F36 one write per series of choices). A change written elsewhere (the Map, another device) redraws the screen when no
field has the focus (no case).

## 5. Performance sheets

Fuel reads the sheets through aerodb, `aircraft().sheets` (`list`, `get`), and never writes them: the editor is the Maintenance
application's (`modules/aircraft/`, its SPEC § 4). aerodb stamps every changed field with its source and keeps the V2 mirror. Fuel's
Sheets screen is a read-only list (§ 9; F79). The sheets' pure code (formats read and written, completion, merge, ChatGPT) is
aerodb's `aircraft().lib` (§ 8; F10).

## 6. Invariants

1. The quote is a pure function of its inputs: same inputs, same quote, on every device (F80).
2. The module reads no data file but through the frame (`ctx.data`, `ctx.aerodb`, `ctx.weather`); type data comes from aerodb, never
   from `sia/base/` or `AircraftDB/` directly (no case: `meta.reads` declares `pilot/` and `cache/fuel/` only).
3. Fuel quantities are in the sheet's unit inside the model; speeds, altitudes and distances in kt, ft, NM (and ft/min) in the model,
   the current flight and the sheets. The displayed units are the screen's, both ways (display and typed input); a converted value
   is never written into a record (F3).
4. No estimated value is written into a sheet without a gesture of the pilot: Fuel writes no sheet at all (F79; the editor's own
   rule is checked in Maintenance, M8, M9).
5. ICAO and EUROCONTROL data never enter the repository: tests use invented sheets, points and procedures (no case: a rule of the
   repository and its security review).
6. These invariants win over any other rule of this document.

## 7. Level decision and climb instructions (`window.FuelLevels`)

All checked by the levels bench (F80).

- **Climb goals**: economical (`eco`, least fuel), best rate (`vy`), fast (`fast`, least time), the sheet's climb IAS (`prof`, full
  throttle at that IAS; `vy` when the sheet has no climb IAS) and manual (`man`: IAS and rate, or throttle at a fixed fraction).
  Manual settings start from the sheet's climb IAS and rate, bounded by the model: IAS from 0.8 to 2.6 × the minimum-drag speed
  (jets: 360 kt at most), rate up to the ground climb rate rounded up to 100 ft/min (200 at least); a rate at or above that bound
  means full throttle.
- **Decision series**: the whole trip (climb with the goal's law, cruise, descent) at every level, by 500 ft (1,000 ft when the
  ceiling is above 20,000 ft), up to 110 % of the ceiling; beyond the ceiling the series is extrapolated linearly from its last two
  valid points (marked extrapolated). Levels below 1,000 ft are not candidates. When the trip cannot be flown above some level under
  the ceiling (too short to climb, not enough thrust), the series stops there and keeps the reason. Answers: the least-fuel level
  and the fastest one.
- **Level curves**: the same trips for the normal and economical cruise modes by 500 ft, the wind range when the wind is unknown,
  the highest level reachable on the trip and why, the optimums, the sustainable cruises and the trip at the plan's level.
- **Climb instructions** to the plan's level (bounded to the ceiling, rounded to 100 ft): integrated by steps (half points, 100 to
  500 ft), read at the ground, 2,000 ft, 5,000 ft, 10,000 ft, then every 5,000 ft and at the level: throttle, RPM read in the engine
  map at that altitude (two rows at least), IAS, rate, fuel flow, Mach, cumulative time and fuel. A climb whose rate falls under
  20 ft/min is reported as not reaching the level.
- **Minimum distance** for a level: the climb distance plus the descent distance; none when the cruise cannot be held.

## 8. Performance sheets in pure code (aerodb's `aircraft().lib`)

Fuel's quote reads sheets made by this code; the code is aerodb's (`frame/aerodb/sheets.js`), its editor Maintenance's. Checked by
the sheets bench (F10).

- **Formats read**: the suite's performance CSV (simple and enriched: one row per aircraft, ranges such as « 800-900 lb/h » and RPM
  tables in a cell), JSON sheets or a sheets database (`flight-performance-db/v1`), Little Navmap `.lnmperf` (XML), a SimBrief OFP (the
  type's sheet from the OFP, and a calibration measured on its navlog: climb, cruise and descent durations, fuel, distances, rates), a
  ChatGPT reply whatever its shape (code fence or not, comments, trailing commas, units in values, keys in another case, nested
  objects). A number in a ChatGPT value is read by its form: commas between groups of three digits are thousands separators
  (« 2,400 », « 1,234.5 »); dots between groups of three followed by a decimal comma are the European form (« 2.400,5 »); otherwise
  a single comma is decimal (« 2,5 », « 0,850 »).
- **Written**: `.lnmperf`, refused with the list of empty fields when one is missing (Little Navmap needs them all).
- **Completed**: from the type's EUROCONTROL record (proposed values per field, never written without a gesture), SimBrief's type
  data, or another sheet of the same type (only the empty fields; fuel converted to the sheet's unit).
- **Merged sheet by sheet**: a sheet's date is the latest of its dates (update, import, SimBrief snapshot, calibration); the
  differences between two sheets are listed field by field and RPM row by RPM row; the pilot picks what to take.
- **ChatGPT**: the prompt for a type (model, variant, fleet, what is already known) and for the missing fields of several sheets, in
  the page language; the reply's keys checked against the schema of `perf_prompt.js` (Maintenance's).

## 9. Screens (`modules/fuel/module.js`)

An ES module for the frame (`meta`, `mount(el, ctx)`, `unmount()`); it loads the pure files above once, with `import()`.
Styles are scoped to `[data-module="fuel"]` and built on the frame's tokens and classes; no global sheet. Two screens
inside the module, switched by two buttons at the top: **Quote** (fr "Devis", de "Berechnung", es "Cálculo"; the Plan
screen below; renamed on 24 Oct 2026, it was "Préparer / Plan / Planen / Preparar", a name the frame's bottom tab now
carries) and **Sheets**. **The module always opens on the Plan screen** (24 Oct 2026): one comes
here to change the flight plan or the fuel quote, rarely to edit an aircraft; the Sheets screen opens only by its
button or by the address `#fuel?view=sheets` (`ctx.query.view`), and the last screen is neither kept nor read at
mount. Inside a mount, the two buttons switch as before.

- **The aerodrome's name where its code is, and progressive completion** (29 Oct 2026, V3 § 10.27; `modules/fuel/adnames.js`). At step 1, under each
  of the departure, arrival and alternate fields, one read-only line (`.fu-adname`, height reserved even when empty, one line with an ellipsis,
  the full text in its `title`) shows `LFPO — Paris-Orly` from `aerodb.coords` (the same source as the procedures card's title), `unknown`
  (x4) when four characters resolve to nothing, nothing under four. From two characters, by code or by name (the field takes four
  characters, so a name is typed by its first four letters), `aerodb.find` gives at most **seven** aerodromes with a four-character code,
  listed as `LFPO Paris-Orly` in one list laid over the page (absolute, in the fields' container: nothing moves; never the native `datalist`);
  ↑ ↓ move, Enter picks, Esc closes, a tap picks (44 px targets); it closes when the field loses the focus (a press on a proposal does not
  take the focus, so the click still lands); a full code that is the only proposal opens nothing. A pick writes the code and fires the
  field's `input` event: the same write, route and weather path as a typing. Step 5's summary adds a Departure and an Arrival row
  (`LFRS` and its name), and the planned times list names the first and last point when they are those aerodromes.
- **Plan in five steps** (lot G, 23 Oct 2026, the pilot's own order: aerodromes, aircraft, level → route → weather →
  density altitude and quote → correct the route → start): a steps bar as in Report — **1 Flight** (departure,
  arrival, alternate, **flight date** (24 Oct 2026: the field "Flight date" writes `current_flight.planned_at`, the one value of
  the flight's date, with its quick buttons "+30" and "Now"; hint: the quote's weather and the Map are read at this date), the one-line aircraft — no default sheet: a flight without
  aircraft takes the last one chosen on the device, `cache/fuel/last_aircraft.json`, shown first in the empty search
  — level), **2 Route** (the route text, the read distance, the
  folded points, "Last SimBrief OFP", "Show the map", then the **Procedures** card: the Departure and Arrival rows, see block 0 — a SID or
  a STAR belongs to the route, not to the flight, 29 Oct 2026), **3 Weather** (wind, ISA and its METAR proposal, real weather,
  the aerodromes of the corridor), **4 Result** (fr "Résultat", de "Ergebnis", es "Resultado"; it was "Quote", the name of the first tab: renamed on 24 Oct 2026; density altitude, level decision with the climb goal, "Open in",
  details, climb instructions, settings), **5 Departure** (a one-page summary: aircraft, normalised route, level and
  steps, wind and source, block fuel; "Start the flight" writes `current_flight.started = { at, by: 'fuel' }` and
  opens the Map; then a card « Flight plan for the simulator » with three buttons — « .fms (XP 11/12) », « .fms (XP 10) »,
  « .pln (MSFS) » — that download the route and the chosen procedures (`frame/lib/fms.js`, V3 § 10.28; 44 px, disabled under two
  placed points, named `LFRS-LFML_<day>.<ext>`; cases F60, F61; the direct send into X-Plane's `Output/FMS plans` is a later launcher verb)). One step at a time when the module is narrow (phone, dual-view pane: `@container` under 900 px; the
  bar shows the numbers, the current step with its name; "Next" under each step); all five one under the other when
  it is wide, without bar or "Next". The sticky result stays under every step; a ✓ marks a filled step (aerodromes,
  aircraft and level; route resolved or typed; weather read or wind given; fuel quoted; flight started). The step is
  kept in `cache/fuel/ui.json`. Everything recomputes live (route → weather → quote, no "redo" button). "Show the
  map": `#fuel?with=maps` from 980 px (the frame's dual view), else `#maps?from=fuel`; hidden while the map is beside fuel
  (`ctx.layout.with === 'maps'`, followed through the frame's `frame-layout` event). Arriving with
  `ctx.query.focus === 'route'` (the Map's "Edit the route", `#fuel?from=maps&focus=route`) opens step 2 with the
  route field focused; `ctx.query.focus === 'arr'` (the Map's "Change" on the arrival, `#fuel?focus=arr`) opens the step that
  holds the arrival row — **2 Route** before the start, **5 Departure** after — and focuses its first select. The blocks below
  keep their former description:
  0. **Runway, SID, STAR and approach** (28 Oct 2026, V3_SPECIFICATION § 10.20), at the end of step 2 Route (a card after the route text, the points and the OFP row; moved from step 1 Flight on 29 Oct 2026: « star et sid
     sont route, pas vol »; the box is `data-procbox="route"`, emptied once the flight has started): two sides, Departure and Arrival,
     redone on 29 Oct 2026 (§ 10.29 d, e; user: « c'est moisi »). Each side has (1) a **title line** "Départ LFPO Paris-Orly" (the side, the
     code, the name from `aerodb.coords(icao).name`; the code alone for an aerodrome aerodb does not know), (2) **one secondary line**, small
     and muted, never more: « lu le 29/10 16:53Z ⌛ · Relire · 3 non lues » (the pieces present only; « Relire » is a text button, not a cell of
     the grid; without data: « aucune procédure publiée · Lire les procédures de LFXX »; an empty `data-source-slot` ends it for the later
     « Source » link of § 10.25), (3) **a fixed grid**, the same columns on both sides (the box is the grid, each side a subgrid): Runway (6 em) ·
     Procedure (wide) · Transition; the Arrival's second line, on the same columns: · Approach · Approach transition. No select is narrower
     than its longest option (the columns are `minmax(max-content, 1fr)`) and every option carries its whole label as `title` (then its
     reasons). Under 600 px of module width (`@container`), a single column of full-width selects. Each list is a `select` filled by `aerodb.runways(icao)` and
     one `aerodb.procedures(icao)` (all kinds; fuel sorts them): a list shows ALL the procedures of the aerodrome (the
     approach list does not wait for a STAR), in ONE flat list (no `<optgroup>`) ordered by `CF.orderProcedures` (`frame/lib/current_flight.js`, shared with the
     Map): the entries compatible with the choice first, then the ⚠ ones, in each group the X-Plane records last, then runway, name,
     transition; the runway list opens with the runways of the SID (Departure) or the approach (Arrival) already chosen. A record with
     `status: 'doubt'`, or without a name (`name` empty, id `….NONAME.…`) while aerodb does not set that status, is never listed
     (V3_SPECIFICATION § 10.26, data is kept) and the secondary line ends with « N non lues » (×4, 1 and many; the old sentence « N procédures non lues sur cette page »
     is its `title`; nothing when N = 0) and counts the aerodrome's records so left out — the nameless ones that reach Fuel, plus `stats.doubt` of the last reading made in
     the session and `coverage().doubt` when aerodb gives it (aerodb itself leaves `doubt` records out of `procedures()`) — with the
     empty `data-source-slot` at the end of the line for the « Source » link of § 10.25; a runway that only such records name is not offered; an aerodrome is « without data » only when it has no procedure of any kind and no runway; the
     lists are read again when aerodb announces new procedures. The runways offered are those of `aerodb.runways(icao)`; when it
     answers `[]` (files without runway records and `RWnn` points without position), those the aerodrome's procedures name (the
     union of their `runways`, `ALL` / empty excluded), and failing that the two ends of the runway axis in the base
     (`aerodromes({ icao })`: `bearing`, `magVar` → magnetic numbers without side, « 24 » and « 06 »); fuel only reads. Options: empty = not chosen ("—"),
     "aucune" (writes `null`; SID, STAR and approach), then the procedures by name; a record with `status: 'xplane'` (local)
     comes last, worded "X-Plane, local"; an `outdated` one ends with ⌛; the runway is in the label only when NO runway is chosen, the record serves exactly
     one and its name does not already say it (« MAN1A · 07 », « RNP RWY 02 »; « OPALE 2E » once a runway is chosen, § 10.29 d); the label then ends with ⌛ (outdated, grey, class
     `outdated`) and ⚠ (in conflict with the current choice, orange, class `conflict`, the reason as `title`, both reasons joined when
     both apply). A change rewrites `route.procedures` v2 (`by: 'fuel'`, `at`) and drops what depended on it. A conflict is marked,
     never forbidden: ⚠ is on a SID, STAR or approach that does not serve the chosen runway (a record with no runway named, or `ALL` /
     `RWALL`, serves them all) and, with no runway chosen, on a STAR that serves no runway of the chosen approach — the runway only
     (29 Oct 2026): the STAR → approach and transition → STAR end continuity is never a conflict (real STARs end in a hold or radar
     vectors; the Map links them dashed). A conflicting
     procedure stays selectable and the choice is kept; **no notification** says a conflict (challenge of 29 Oct, § 10.23: the ⚠ and the
     option's `title` are enough); the change lines of « Load my OFP » carry the same ⚠. A SID, STAR
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
     `no-credentials` only comes from EAD. **A past date** (§ 10.28): a flight not started dated more than a minute ago gets the warning « Vol daté du {d}, dans le passé : météo et NOTAM ne valent plus. » on the Flight step and on the plan; it blocks nothing. **« Source »** (§ 10.25) ends the secondary line: for the side's chosen SID (departure), STAR and approach (arrival), a link to the record's `source.url` as aerodb gives it (the SIA's public page of the coding table, `https://` only), `target="_blank"`, `rel="noopener noreferrer"`, the page's name in its title; with two links the kind follows (« Source STAR · Source APP »). A record of another source has no link; its `source.file` goes in the line's title. Fuel builds no address. **« Sur la carte »** (§ 10.23), a text button in each side's title when the aerodrome has data, sets `#maps?choose=dep|arr&icao=…`; the Map comes back with `location.replace('#fuel?focus=arr&rwy=25&star=ID&app=ID&apptrans=none')`, every key of the side in one trip among `rwy sid star app apptrans` (lower case; `none` = « Aucune »; a missing key leaves its family as it was; no SID / STAR transition; § 10.30 replaces the one key per trip of § 10.23). Fuel consumes them together with `focus` at mount (`ctx.consume`; `apptrans` is written to `appTrans`) and applies the proposal once the side's records are drawn, through the same path as a choice in a list (the single runway of a procedure follows it), with one drawing, one deferred write, then one line says what changed. **Wind on each runway** (§ 10.30): each option of a side's runway list ends with the components of the aerodrome's known METAR (`ctx.weather`, the one the Départ step shows, never the TAF) by `frame/lib/wind.js` (`components`, `label`): « 13R — ↓ 12 kt · ← 6 kt » (arrows: where the wind blows, the runway drawn upward as on final — ↓ head, ↑ tail, ← from the right, → from the left; § 10.30 third reading); the runway's true axis is `wind.runwayAxis` (its record's `true`, else threshold → opposite threshold, else `qfu` or its number × 10, plus the aerodrome's `magVar`; the Map's rule, refactoring R-F1); a VRB or missing wind, or no METAR, gives no suffix. The option is coloured by `wind.severity` (classes `wind-ok`, `wind-warn`, `wind-alert` on the design's semantic tokens `--sog-ok`, `--sog-warn`, `--sog-err`), with its reason in the title: head wind green; tail wind orange up to 5 kt, red above; crosswind orange over 10 kt, red over 20 kt or over the aircraft sheet's `maxCrosswindKt` when the sheet has one (no sheet carries it today: the field is read, not edited). The rows are drawn again when the METAR arrives. **Approaches the SIA way** (§ 10.30, fourth reading): the approach list holds the finals only (`appChoices`), each by `labelOf` (« ILS 06 », « RNP 06 », the published name in the title); the initial approach segments (« INA RNAV RWY 06 », `isAppTransition`) are the approach transitions of every final of their runway, « via ODILO · ODILO 1A » (`transitionLabelOf`), sorted by IAF; `appTrans` stores the segment's id; « — » is the direct to the IF. **The side's title ends with the summary of its choice** (§ 10.30, second reading): `summaryOf` of `frame/lib/procedures.js`, the same text as the Map's pane — « 13R · ↑ 12 kt » (the chosen runway with the wind of the known METAR, in its severity colour), « MEN1A via NEPIX », « I13R »; « Aucune » is said with its kind (« SID aucune »); nothing when nothing is chosen. Never silent: the start of a reading is said, and its end (success with its counts, refusal, failure with the launcher's message and the number of warnings) is always said, even when the pilot has left Fuel meanwhile; the job is not cancelled by leaving. The secondary line of a side that has data starts with the date of the aerodrome's last reading (aerodb `coverage(icao).read_at`, UTC: "lu le 29/10 16:53Z", ⌛ when `coverage().outdated`; nothing without `read_at`) and a short text button « Relire » ×4: the same `fetchProcedures` gesture (aerodb accepts an aerodrome already read and replaces the file of the same source), the same counts in the notification. `too-soon` (EAD Basic, 30 s between two readings) says "Patientez {wait} s avant la lecture suivante (EAD Basic)". A procedure read under an earlier cycle ends with the symbol ⌛ in the lists and in the change notifications, never the word « périmé » (user, 29 Oct 2026); its option has the class `outdated` (grey on the computer, ignored by a phone's native picker) and the title « Lue sous un cycle antérieur : à relire ». An aerodb `change` naming an aerodrome (`procedures: ICAO`, also with `coverage: true` when a proc/ file arrives by synchronisation) empties fuel's cache of answers and redraws the rows; when it is the flight's departure or arrival, the chosen procedures are read again. A success says its counts when aerodb gives them (`stats`): "LFXX : 78 procédures lues sur 18 pages", plus the pages not read with the most frequent reason (the tool's French phrase, translated when known) and the procedures dropped by the geometry check; never a bare "0 procédures". "Load my OFP" replaces the choice by the OFP's SID and STAR (one notification line per side).
     **The quote runs on the procedures path** (before the start): when procedures are chosen and read (`CF.loadProcedures`),
     the distance is the last point's `nm` of `CF.flownPath(CF.expandedPath(flight, procs))` (never recomputed here), the
     level steps are the route points' `alt_ft` at their `nm`, `quote.legs` has one `{ id, min, origin }` per flown point and
     `profile.path` is the planned vertical path (`progress.js` `verticalPath`: nm strictly increasing; the model's climb, cruise
     and descent, then the constraints without any vertical jump — a ceiling in the descent pulls the path down only from where the
     model's descent gradient, taken back from it, meets the cruise; a ceiling in the climb holds the path level up to it; once the
     descent has started the path never rises again, so a floor or a missed-approach climb does not lift it). The procedures' altitude constraints reach
     `profile.path` only, not the quote's level steps (the step machinery models cruise levels, not a descent through
     restrictions): fuel and time count the distance. Without procedures: the route's points, legs with origin `'route'`.
     **After "Start the flight"** the Departure step carries a "Procedures" card: both rows stay editable at any time
     (challenge of 29 Oct, § 10.20: **no lock after the start** — `depPassed` and the « La SID est passée » sentence are gone; another
     departure is a new departure). A change rewrites `route.procedures`, `quote.legs`, `profile.path`, the progress length and `quote.legsAt`
     (a single state: the time of the last rewrite of the legs or the vertical path, kept while they do not change); the block, trip, minutes
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
     **The route field completes at the cursor** (§ 10.31 part 4, `modules/fuel/routecomplete.js`, the § 10.27 component: one list, `modules/fuel/suggest.js`, since refactoring R-F5): from two
     characters of the word under the cursor, at most seven proposals — the SID names of `route.dep` and STAR names of `route.arr`
     (`P.textModel`), the airway names around the last known point before the cursor (`aerodb.airways`, ±2° / ±3°), the points,
     navaids and aerodromes of `aerodb.find` whose code starts with the word; ↑ ↓ Enter Escape, tap (pointerdown kept from blurring),
     closed on blur; picking replaces the word with the token and a space, the caret after, and fires `input` (the same path as typing).
     The selects of the Route step stay, the keyboard and screen-reader path.
     **The points list groups the procedures** (§ 10.31, confirmed by the user): « Points (N) » of the Route step shows the pilot's
     points and, for each chosen and read procedure (`S.procs`), ONE folded row in the Map's hue (`<details class="fu-ptgrp"
     data-kind="sid|star|app">`: « SID NTS1A · 2 points », « STAR MEN1A via NEPIX · 4 points », « I13R · 1 point »), its fixes
     (`PR.pointsOf`, transition included) under a tap: the SID after the departure, the STAR and the approach before the arrival; a
     route point that is a fix of a chosen procedure (its exit, its entry) is shown in its group, never at the rank of the typed
     points; N = the points shown + the groups. Redrawn when the procedures are read (`ensureProcs`).
     **The card opens folded** (§ 10.31, user: « l'étape procédures doit se lire sans défiler, pire sur téléphone »): each side's
     title is its summary line — ▸ / ▾ button (`data-do="procfold"`, `aria-expanded`), side, code, name, « Sur la carte », the
     summary (`summaryOf`); a tap anywhere on the line but its other buttons unfolds that side and folds the other (`P.fold`); the
     folded lists and secondary line are `visibility: hidden; height: 0` (out of reach, kept in the shared grid so both sides keep the
     same columns); a side without data never folds (its line offers the reading); `P.focus(side)` (the Map's « Changer ») unfolds it.
     **The route text is a view of the procedures** (§ 10.31, 30 Oct 2026): `route.text` is normalised in ICAO form (`RT.textFromTokens`
     with `dct`: « DCT » between two en-route points with nothing between them, never against the departure or the arrival). After a
     procedure choice (Fuel's lists, the Map's proposal, the OFP: `procsSettled`) and once the two aerodromes' records are drawn
     (`host.drawn`), `procsToText` writes the SID's name then its exit after the departure, the STAR's entry then its name before the
     arrival (`RT.withProcedures`; the exit / entry only when no point of the procedure is on the route already; never the approach);
     when the exit is added, one line says « NTS1A sort à NT102 : NT102 DCT LUGEN ». Nothing while the field has the focus. When the
     pilot leaves the field, `textToProcs` reads it back (`RT.proceduresOfText`): the first SID name of `route.dep` sets that SID (the
     record serving the chosen runway, else the first), the last STAR name of `route.arr` that STAR; a chosen procedure whose name left
     the text is cleared (« Aucune » stays); the choice goes through `P.choose`. Auto turns an exit word the base does not know as a
     point into the inserted exit point. `compatible()` takes `route` (the typed points): a SID fits when its exit is on it, a STAR when
     its entry is (axis « vers votre route » for the Map).
     **A typed airway** (§ 10.31, 30 Oct 2026): in « A VOIE B », a word of airway form between two named points is an airway when the
     base has an airway of that name near A (a ±2° box), and then never a point of the same identifier taken elsewhere (the user's
     « A3 », a point near Gibraltar: 1 871 NM); without such an airway nearby the identifier stays a point (PO421…). The airway is
     followed only when A and B are both nodes of it joined contiguously along it in the leg's corridor (`RG.corridor`, `RG.along`):
     its nodes are inserted (awy, via) so that distance and map follow it; otherwise the leg stays direct and one line says
     « A3 ne relie pas GILUX à MOTAL : tronçon direct » (once per text, at the field's change). The word stays in the text.
     **"Auto" button** (25 Oct 2026, next to the route field, 44 px, in the field's row; **idempotent since § 10.31**, 30 Oct
     2026: it recomputes from the pinned points only — departure, the chosen SID's exit, the points the pilot typed, the STAR's
     entry, arrival — and replaces: the words a previous Auto wrote (airways, nodes, the exit and entry it added) are found by
     `RT.provenance(words, route.auto.seq)` and dropped, never constraints; `route.auto.seq` = [{ w, g }] is written with each
     result; a routed leg that would visit a point already on the route stays direct (`loop`), then the most stretched leg while
     the whole exceeds the direct chain by more than `detourPct`; a leg left direct says why, « Aucune voie utile entre A et B
     (pas de voie près de A | trop loin des voies | détour de plus de 40 % | la route repasserait par un point) »; and when an airway does
     join the two points along its own nodes but is closed at the leg's level (`RG.joiningAirway` on the leg's corridor, levels
     ignored), the line names it with its open band instead: « A34 relie LACOU à LMG, fermée au FL260 (ouverte de 6 500 ft au
     FL195) : tronçon direct » (the first failed leg that has one); the leg stays direct, never « follow it anyway »; the SID exit is
     written after the SID's name when the text holds it, so the exit → first point leg is adjacent and routed): with SID / STAR / approach chosen and read, the text is brought up to date first (the SID's exit and the STAR's entry are placed points of it), then the chain gets what the text lacks — the start of an approach chosen without a STAR, before the arrival, as a generated word — by `PR.endsOf` (refactoring R-F4b, 30 Oct 2026: one rule for the text and Auto; no end when a point of its procedure is already on the route, the route joins at the common point), the aerodrome ↔ procedure leg never routed; for each pair of consecutive named
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
  - The Sheets screen shows the sheets' own fields (kt, ft, NM, fuel unit of the sheet): it is not affected.
- **Sheets** (read-only since 30 Oct 2026; the editor moved to Maintenance › Appareils, `modules/aircraft/`, § 10.34 A2 step 5):
  the list, sorted like V2's by category (helicopters, turboprops, jets, piston engines, others: aerodb `classify`), then
  by name: each sheet (name, type, unit, origin, what is missing named by family — "To complete: rpm, speeds, cruise…", or
  "complete" —, date; the sheet of the current flight marked "used for this flight"; "Use" sets it for the flight; the
  name and "Edit in Maintenance" are plain links to `?app=maintenance#aircraft?sheet=<id>`, same tab), then the airline's
  types without a sheet (aerodb `fleetTypes()`: fleet and reference, aliases resolved; a type is covered when a sheet's ICAO
  code, type or id resolves to it), "Company type (n aircraft): performance to fill in", with "Create in Maintenance"
  (`?app=maintenance#aircraft`). No field, import, preview or removal here: one editor, in Maintenance (its SPEC § 4).
- **Writes**: the sheets are never written by Fuel; the current flight after a quiet time (read again, own fields changed, the rest kept, `updated_at`); the settings
  likewise. A change of the current flight written elsewhere (maps, another device) redraws the screen when no field
  has the focus.
- **Phone**: no horizontal scroll at 375 px (wide tables scroll inside their block), touch targets of the frame
  (44 px), drawings redrawn at the width of their block.

## 10. Aerodrome weather (`modules/fuel/weather.js`)

- **Source**: the frame's weather layer, `ctx.weather.metar(ids)` and `ctx.weather.taf(ids)` (frame INTEGRATION § 14), which keeps
  each aerodrome 30 min and serves its reserve offline (`cacheOnly`, with the time of its newest METAR); Fuel calls no weather host
  and keeps no copy of its own (an old `cache/fuel/weather.json` is removed from the device once). The TAF is read only when the
  flight has a date, for the departure, arrival, alternate and the stations that have a METAR; without a launcher or a weather key
  the card says « TAF unavailable » and the METAR answers. The card says the source (F80 METAR bench; the layer: frame cases).
- **Stations**: the departure, the aerodromes of the route's corridor, the arrival and the alternate. **Corridor**: aerodb
  `aerodromes({ bbox, lite: true })` of each leg's box widened by the radius of the quote settings (`wxRadiusNm`, default 10 NM, 0 to
  50), kept within that radius of the route (projection on the nearest leg), departure and arrival excluded, sorted by distance
  along the route, recomputed when the points or the radius change; an aerodrome without METAR or TAF is left out (no case).
- **Which message**: with a flight date (`current_flight.planned_at`) inside the TAF's validity, the TAF — its base group (the last
  group without change, BECMG or FM covering the time) and its temporary groups (TEMPO, PROB) covering it; otherwise the METAR (F80).
- **Shown per aerodrome**: flight category (LIFR: ceiling < 500 ft or visibility < 1 SM; IFR: < 1,000 ft or < 3 SM; MVFR: ≤ 3,000 ft
  or ≤ 5 SM; else VFR — the METAR's own category when it gives one), wind with gust, head / tail and crosswind on the main runway's
  end closest to the wind (`wind.bestRunwayEnd`: aerodb `bearing`, true, number from `bearing − magVar`), ceiling (lowest BKN / OVC,
  else vertical visibility), visibility in km (« ≥ 10 km » for 6 SM and more), temperature and QNH, weather, temporary groups, a
  warning for CB / TCU, the raw message folded (F80 METAR bench, F62 wind bench).
- **Card**: departure, arrival, alternate, then the corridor aerodromes (folded under « n aerodromes along the route » beyond two);
  each line gives its distance from departure (the alternate: from arrival) (no case).
- **Real weather** (a box): the quote's wind becomes the forecast wind aloft (§ 11); without it, the mean of the surface wind vectors
  of the departure, the corridor aerodromes and the arrival that have one, each segment between two of them the mean of its ends,
  weighted by its length along the route (at least two aerodromes, else said), an approximation said as such; its source is written
  under the wind fields; typing a wind unticks the box (no case).

## 11. Winds and temperatures aloft (`modules/fuel/winds.js`)

- **Source**: the frame's weather layer, `ctx.weather.aloft(samples, when)` (frame INTEGRATION § 14): temperature, wind speed and
  direction at 14 pressure levels (1000 to 200 hPa) at up to 24 places — the route's points plus a place about every 50 NM
  (`samples`) — at the hour nearest to the flight date (else now); the model chosen by the route's middle (`ctx.weather.modelFor`),
  with its run time. The layer answers from its reserve and asks Open-Meteo only for what is missing, counts its calls for the
  device, and serves its reserve only offline. Fuel keeps no copy of its own (an old `cache/fuel/aloft.json` is removed once). Read
  with the aerodromes' weather, again when the route's points or the flight hour change (F80 winds bench; F29).
- **At a level**: a flight level is a pressure (ISA): wind (as a vector) and temperature are interpolated in ln(pressure) between the
  two levels around it; ISA deviation = temperature − ISA temperature at that pressure altitude. The level of each place is the
  altitude of the profile there (climb, levels, descent), not the cruise level everywhere (F29, F80).
- **Wind of the quote** (« Real weather » ticked): the mean of the winds at the planned level along the route, each leg the mean of
  its two ends weighted by its length; preferred to the METARs' surface wind, the fallback. Source shown under the wind fields (F80).
- **While a new forecast loads**: the previous wind aloft stays, « forecast loading… » in the result (`windSource.pending`); only a
  failed reading hands over to the surface wind, said as such (`windSource.aloftFailed`, « forecast aloft unavailable ») (no case).
- **Current flight**: `route.points[].wind = { dirDeg, kt, tempC, levelFt, at }`, for the Map's arrows (F29).
- **Shown**: step 3, a table per route point (level, wind, temperature, ISA deviation) with model, hour, run and reading time; step 4,
  under the density altitude chart, the real atmosphere at departure — temperature by pressure altitude against ISA (dashed),
  inversion layers shaded and listed, the planned level marked, and at that level the temperature, ISA deviation and density
  altitude (no case).
- **Across the date line**: `samples` interpolates the places' longitudes on the unrolled route (`frame/lib/geo.js`: 177.7° E →
  165.4° W goes 177.7° → 194.6°) and returns them wrapped in [-180, 180[ (a longitude already inside is returned as written) (F80).

## 12. Progress of a started flight (`modules/fuel/progress.js`)

- **Start, cancel**: « Start the flight » first redoes everything for now — the flight date goes back to now, the aerodromes' weather
  and the winds aloft are read again, the quote is redone — and says in one line what changed (wind, block, planned arrival); offline
  it says so and starts with the last quote. Then it writes `started = { at, by: 'fuel' }` (Report's engine start). A started flight
  ends with its report (Report writes `started = null` and `progress = null`) or with « Cancel the start » (a question, the same
  nulls). The sticky result shows « Flight started at hh:mm · for 1 h 12 » (F16 starts a flight; no case for the line of what changed).
- **Planned timeline** from the start time: taxi, the quote's climb, the cruise split by route leg — ground speed = cruise TAS + the
  leg's wind component (the forecast winds at both ends of the leg, else the quote's wind), durations scaled so the cruise keeps the
  quote's time —, the quote's descent; fuel burnt by phase. From it: the time over each point, the planned position at a given time,
  the distance and planned fuel remaining (F80 progress bench).
- **Current flight**: `progress = { at, fuelRemainingKg, remainingNm, phase }` for a started flight, written when it changes — every
  minute in flight, at every quote change — until the report or the cancellation; `progress.actual` (the real position) is the
  frame's and kept. The times over the points and the planned position are not written: readers derive them from `quote.legs`
  (`frame/lib/current_flight.js` `etaOf`, `plannedPositionAt`); a flight that is only dated has no `progress` (F80 current flight
  bench).
- **Shown**: the Departure step's « Planned progress » card: the line of the moment and the points with their time, the next point
  highlighted (no case).
