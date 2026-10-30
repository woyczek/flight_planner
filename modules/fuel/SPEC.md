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

An ES module for the frame (`meta`, `mount(el, ctx)`, `unmount()`); it loads the pure files once, with `import()`. Styles are scoped
to `[data-module="fuel"]`, built on the frame's tokens and classes; no global sheet. Two screens, switched by two buttons at the top:
**Quote** (fr « Devis », de « Berechnung », es « Cálculo »; the Plan below) and **Sheets** (F5).

- **Opening**: always on the Plan; the Sheets screen opens by its button or by `#fuel?view=sheets`; the last screen is neither kept
  nor read at mount (F1). The address may ask, once (`ctx.query.focus`, kept as `S.focus`): `route` (the Map's « Edit the route »,
  `#fuel?from=maps&focus=route`) opens step 2 with the route field focused; `arr` (the Map's « Change ») or `dep` opens the step that
  holds that side of the procedure card — step 2 before the start, step 5 after — and focuses its first list (F17).
- **Writes**: the current flight after a quiet time (§ 4); the quote settings (`pilot/<trigram>/fuel.json`) likewise; never a sheet.
- **Phone**: no horizontal scroll at 375 px (wide tables scroll inside their block), the frame's 44 px targets, drawings redrawn at
  the width of their block (F4).

### 9.1 The Plan in five steps

A steps bar as in Report: **1 Flight**, **2 Route**, **3 Weather**, **4 Result** (fr « Résultat », de « Ergebnis », es « Resultado »),
**5 Departure** (F5). One step at a time when the module is narrow (under 900 px of module: `@container`; the bar shows the numbers
and the current step's name; « Next » under each step); all five one under the other when it is wide, without bar or « Next » (F4).
The sticky result (§ 9.6) stays under every step; a ✓ marks a filled step (aerodromes, aircraft and level; route resolved or typed;
weather read or wind given; fuel quoted; flight started). The step is kept in `cache/fuel/ui.json`. Everything recomputes live
(route → weather → quote; no « redo » button) (no case for the ✓ marks). « Show the map »: `#fuel?with=maps` from 980 px (the frame's
dual view), else `#maps?from=fuel`; hidden while the Map is beside Fuel (`ctx.layout.with === 'maps'`, followed through the frame's
`frame-layout` event) (no case).

### 9.2 Step 1 — Flight

- **Aerodromes**: departure, arrival, alternate. Each field is a search (F48): from two characters, by code or by name, `aerodb.find`
  gives at most seven aerodromes with a four-character code, listed as « LFPO Paris-Orly » in one list laid over the page (never the
  native `datalist`; the list of `suggest.js`); ↑ ↓ move, Enter picks, Esc closes, a tap picks (44 px); it closes when the field
  loses the focus (a press on a proposal keeps it, so the click lands); a full code that is the only proposal opens nothing. A pick
  writes the code and fires the field's `input` event: the same path as typing (F45, F46). Only a code reaches the route; leaving a
  field unchosen reverts it (F48).
- **The name where the code is**: under each field, one read-only line (`.fu-adname`, its height reserved even empty, one line with an
  ellipsis, the full text in its `title`): « LFPO — Paris-Orly » from `aerodb.coords` (`adLine` of `frame/lib/adnames.js`, names
  recased), « inconnu » ×4 when four characters resolve to nothing, nothing under four (F44, F71).
- **Flight date**: one value, `current_flight.planned_at`, with « +30 » and « Now »; the quote's weather and the Map read this date
  (F6). A flight not started dated more than a minute ago says « Vol daté du {d}, dans le passé : météo et NOTAM ne valent plus. » on
  this step and on the plan; it blocks nothing (F43).
- **Aircraft**: one line — the chosen aircraft (name, registration, callsign, type) with its origin, and a search button that unfolds
  one field and its results from `aircraft().search(text)` (sheets → fleet → reference → types → free code, each with its origin; an
  aircraft shows the sheet that will serve it: its own, its type's, or the type estimate). Choosing writes `aircraft().aircraftOf(hit)`
  into the current flight. No default sheet: a flight without aircraft takes the last one chosen on the device
  (`cache/fuel/last_aircraft.json`), first in the empty search. The quote says the origin of its cruise flow (this flight's entry, the
  sheet's RPM table or cruise flow, Poll-Schumann, SimBrief, the type estimate) and whether it is approximate (no case).
- **Level**: the flight level (FL) (F3 for its notation).

### 9.3 Step 2 — Route

- **The route text is the first input**, always visible: free text read as item 15 or as an OFP list (`frame/lib/route_model.js`
  `routeModel`). On leaving the field it is normalised in ICAO form — one line, upper case, « DCT » between two en-route points with
  nothing between them (never against the departure or the arrival), speed-level groups dropped, departure and arrival at the ends,
  levels as « /Fnnn » after the point where they change, airways, procedures and unknown words kept in place; the unknown points are
  named in a line under the field (no dialog). ICAO coordinates (4530N00030E, 45N005E) and « NAME lat lon » are points; an identifier
  aerodb does not know takes the position it already has in the flight's points (a point placed by hand keeps it). The level of an
  entry (/N0450F370 or /F370), or an item 15 speed-level group after a point, becomes that point's `alt_ft`, kept only where it changes
  and never on the departure or the arrival (F69 route bench, F70).
- **Distance and true track are read, not typed**: a line gives them with their source (the route, the SimBrief OFP, typed by hand);
  only when nothing resolves does « Type them by hand » unfold the two fields. With procedures chosen and read, the line gives the one
  distance of the extended path (F78).
- **Completion at the cursor** (`routecomplete.js`, the list of `suggest.js`): from two characters of the word under the cursor, at
  most seven proposals — the SID names of `route.dep` and the STAR names of `route.arr`, the airway names around the last known point
  before the cursor (`aerodb.airways`, ±2° / ±3°), the points, navaids and aerodromes of `aerodb.find` whose code starts with the word;
  ↑ ↓ Enter Esc, tap, closed on blur; picking replaces the word with the token and a space, the caret after, and fires `input` (F75).
  The procedure card's selects stay the keyboard and screen-reader path to the same choices.
- **A typed airway**: in « A VOIE B », a word of airway form between two named points is an airway when the base has an airway of that
  name near A (a ±2° box), and then never a point of the same identifier elsewhere; without such an airway the identifier stays a
  point. It is followed only when A and B are nodes of it joined contiguously along it in the leg's corridor (`RG.corridor`,
  `RG.along`): its nodes are inserted (`awy`, `via`) so that distance and map follow it; otherwise the leg stays direct and one line
  says « A3 ne relie pas GILUX à MOTAL : tronçon direct » (once per text, at the field's change); the word stays in the text (F68).
- **Points** (folded under « Points (N) »): the resolved points as a list — move up, move down, remove, add before the arrival (an
  identifier from aerodb, or « NAME lat lon »); each intermediate point has an optional level (FL), flown from that point on, a point
  without one continuing the previous (its placeholder). A change rewrites the route text from the points (`RT.textFromPoints`: the
  airways of intact legs kept, in ICAO form), derives distance and track, writes the flight and redoes the quote (no case for the
  editing). Each chosen and read procedure is ONE folded row in its hue (`<details class="fu-ptgrp" data-kind="sid|star|app">`, the
  design tokens `--sog-map-sid|star|app`: « SID NTS1A · 2 points », « STAR MEN1A via NEPIX · 4 points », « I13R · 1 point »), its fixes
  (transition included) under a tap: the SID after the departure, the STAR and the approach before the arrival; a route point that is
  a fix of a chosen procedure is shown in its group, never among the typed points; N = the points shown + the groups (F73).
- **« Last SimBrief OFP »**: through `ctx.net`, with the identity's SimBrief identifier (never typed here); the OFP is kept on the
  device only; its route, level, average wind, ISA deviation and aircraft go into the current flight; its SID and STAR fill the sides
  the pilot has not chosen, one line per side (F19).
- **The route text is a view of the procedures**: after a procedure choice (the lists, the Map's return, the OFP) and once both
  aerodromes' records are drawn, `procsToText` writes the SID's name then its exit after the departure, the STAR's entry then its name
  before the arrival (`RT.withProcedures`, the ends from `PR.endsOf`; an end only when no point of its procedure is on the route
  already; never the approach); when the exit is added one line says « NTS1A sort à NT102 : NT102 DCT LUGEN ». Nothing while the field
  has the focus. When the pilot leaves the field, `textToProcs` reads it back: the first SID name of `route.dep` sets that SID (the
  record serving the chosen runway, else the first), the last STAR name of `route.arr` that STAR; a chosen procedure whose name left the
  text is cleared (« Aucune » stays). A procedure name is written and read without spaces (« AMOLO7A ») (F70, F77).
- **« Auto »** (next to the route field, in its row, 44 px, a title saying what it writes): it first brings the text up to date, then
  recomputes from the pinned points only — departure, the chosen SID's exit, the points the pilot typed, the STAR's entry, arrival —
  and replaces: the words a previous Auto wrote (airways, nodes, an approach start it added) are found by
  `RT.provenance(words, route.auto.seq)` and dropped, never constraints; `route.auto.seq` = [{ w, g }] is written with each result.
  With an approach chosen without a STAR, its start is added before the arrival as a generated word (`PR.endsOf`); an exit or entry
  word the base does not know as a point takes its record's position (Auto only; the field's reading keeps such a word); the
  aerodrome ↔ procedure leg is never routed. For each pair of consecutive named points with nothing between them, the shortest path over the base's
  airways (`frame/lib/routing.js`, V2's rules: a leg open at the level when floor − 100 ≤ level ≤ ceiling + 100 ft, direct entry and
  exit within 60 NM, no detour over 40 %, no leg of 40 NM or less unless its two ends are airway nodes joined by open airways, the
  airway preferred to a direct entry of the same length), each leg at the altitude of the profile at its middle (climb, levels,
  descent; the flight's level, else the quote's, else 6,500 ft, said; a point's own level holds from it on) (F8, F28, F30, F9).
  A routed leg that would visit a point already on the route stays direct (`loop`), then the most stretched leg while the whole exceeds
  the direct chain by more than 40 %. A leg left direct says why: « Aucune voie utile entre A et B (pas de voie près de A | trop loin
  des voies | détour de plus de 40 % | la route repasserait par un point) »; when an airway does join the two points along its own
  nodes but is closed at the leg's level (`RG.joiningAirway`), the line names it with its open band instead: « A34 relie LACOU à LMG,
  fermée au FL260 (ouverte de 6 500 ft au FL195) : tronçon direct » (F8, F74). It writes `route.text` (« LFRS TSA01 UT460 TSA05 LFML »:
  the airway's middle points not written) and `route.points` (every node, the middle ones `awy: true`, the points reached by an airway
  with `via`), reads the route again and redoes the quote; a notification gives « n airways written, d NM », or the reason, or « no
  base » when aerodb has nothing to read. An airway's ends that aerodb does not know take the segment's position: no « unknown points »
  (F8). Limits: both directions assumed open (the base carries no one-way), no fine level restriction, no crossing of the date line;
  never recomputed by a later change of level (no case).
- **The procedure card** closes the step (§ 9.4); it leaves step 2 once the flight has started (then in step 5).

### 9.4 The procedure card

Two sides, Departure and Arrival, in `modules/fuel/procedures.js` (the rules in `frame/lib/procedures.js`, bench F32); in step 2
before the start, in step 5 after (F11).

- **Folded at opening**: each side's title is its summary line — a ▸ / ▾ button (`data-do="procfold"`, `aria-expanded`), the side, the
  code, the name from `aerodb.coords(icao).name` (the code alone for an aerodrome aerodb does not know), « Sur la carte », then the
  summary of the choice (`summaryOf`, the Map pane's text: « 13R · ↑ 12 kt » in its wind colour, « MEN1A via NEPIX », « I13R »; « SID
  aucune »; nothing when nothing is chosen). A tap on the line (but its other buttons) unfolds that side and folds the other; folded
  lists and secondary line are `visibility: hidden; height: 0` (kept in the shared grid so both sides keep the same columns); a side
  without data never folds; the address's focus (§ 9) unfolds its side (F72, F65, F34).
- **Secondary line**, small and muted, one line, the pieces present only: « lu le 29/10 16:53Z ⌛ · Relire · 3 non lues · Source »:
  the date of the aerodrome's last reading (`coverage(icao).read_at`, UTC, `fmtDayZ`: F39; ⌛ when `coverage().outdated`), « Relire », the
  records left out (« N non lues » ×4; the old sentence in its `title`; nothing at 0), and « Source » (F34, F37, F27, F42). Without data:
  « aucune procédure publiée · Lire les procédures de LFXX » (F14).
- **A fixed grid**, the same columns on both sides (the box is the grid, each side a subgrid): Runway (6 em) · Procedure (wide) ·
  Transition; the Arrival's second line: · Approach · Approach transition. No select is narrower than its longest option (`minmax(
  max-content, 1fr)`), every option carries its whole label as `title` (then its reasons); under 600 px of module, one column of
  full-width selects (F34). When only the lists change they are updated in place and the focus stays (F35); choosing on a phone never
  gives the focus back to a list (the native picker would reopen) (F40).
- **Lists**: each a `select` filled by `aerodb.runways(icao)` and one `aerodb.procedures(icao)` (all kinds): ALL the procedures of
  the aerodrome (the approach list does not wait for a STAR), in ONE flat list (no `<optgroup>`) ordered by `PR.orderProcedures`: the
  entries compatible with the choice first, then the ⚠ ones, in each group the X-Plane records last, then runway, name, transition;
  the runway list opens with the runways of the SID (Departure) or the approach (Arrival) already chosen (F31, F20). Options: empty =
  not chosen (« — »), « aucune » (writes `null`; SID, STAR, approach), then the procedures by name (F12); a record with `status:
  'xplane'` comes last, « X-Plane, local »; an `outdated` one ends with ⌛ (class `outdated`, grey on a computer, title « Lue sous un
  cycle antérieur : à relire »), never the word « périmé » (F13); the runway is in the label only when NO runway is chosen, the record
  serves exactly one and its name does not say it already (« MAN1A · 07 », « RNP RWY 02 »); same-name SIDs of two runways make one row
  with their runways (F78). A record `status: 'doubt'`, or without a name, is never listed and is counted in « N non lues » with the
  aerodrome's left-out records (`stats.doubt` of the session's last reading, `coverage().doubt`); a runway only such records name is not
  offered; an aerodrome is « without data » only with no procedure of any kind and no runway (F31, F37). The lists are read again when
  aerodb announces new procedures (a `change` naming the aerodrome); the chosen procedures are read again when it is the flight's
  departure or arrival (F27).
- **Runways offered**: those of `aerodb.runways(icao)`; when it answers `[]`, those the aerodrome's procedures name (`ALL` / empty
  excluded); failing that, the two ends of the base's runway axis (`bearing`, `magVar` → magnetic numbers without side, « 24 » and
  « 06 ») (F22). Each option ends with the wind of the aerodrome's known METAR (the Départ step's, never the TAF) by
  `frame/lib/wind.js`: « 13R — ↓ 12 kt · ← 6 kt » (↓ head, ↑ tail, ← from the right, → from the left: where the wind blows, the runway
  drawn upward as on final), on the axis `wind.runwayAxis`; coloured by `wind.severity` (classes `wind-ok`, `wind-warn`, `wind-alert` on
  `--sog-ok`, `--sog-warn`, `--sog-err`; its reason in the title): head wind green; tail wind orange up to 5 kt, red above; crosswind
  orange over 10 kt, red over 20 kt or over the sheet's `maxCrosswindKt`; a VRB or missing wind gives no suffix; redrawn when the METAR
  arrives (F64, F62).
- **A choice** rewrites `route.procedures` v2 (`by: 'fuel'`, `at`) and drops what depended on it (another STAR / approach / SID removes
  its transition); a series of choices is written once, 400 ms after the last (F36). A SID, STAR or approach chosen while no runway is,
  and serving one runway only, sets that runway (F21). The STAR chosen offers its transitions, the approach its approach transitions.
  A conflict is marked, never forbidden: ⚠ on a SID, STAR or approach that does not serve the chosen runway (a record naming no runway,
  or `ALL` / `RWALL`, serves them all) and, with no runway chosen, on a STAR that serves no runway of the chosen approach; class
  `conflict`, the reason as `title`, both joined when both apply; the continuity of points between STAR and approach is never a
  conflict; the conflicting choice stays and **no notification** says it; the OFP's change lines carry the same ⚠ (F26, F21). A
  `route.procedures` v1 is read and not rewritten at mount; v2 at the next write (F18). The rows are drawn without waiting for the
  aircraft registry (F33).
- **Approaches the SIA way**: the approach list holds the finals only (`appChoices`), each by `labelOf` (« ILS 06 », « RNP 06 », the
  published name in the title); the initial approach segments (« INA RNAV RWY 06 », `isAppTransition`) are the approach transitions of
  every final of their runway, « via ODILO · ODILO 1A » (`transitionLabelOf`), sorted by IAF; `appTrans` stores the segment's id; « — »
  is the direct to the IF. An approach given by its entries is listed once, its transitions lead to it (F66, F24).
- **Reading on demand**: an aerodrome without data offers one button, « Lire les procédures de LFXX » (`aerodb.fetchProcedures(icao, {
  onProgress, signal })`, one aerodrome per gesture, nothing fetched silently); aerodb picks the source by State (France: the SIA's
  eAIP, no account; a State whose AIP publishes coding tables: EAD Basic); while it reads, the button names the source aerodb
  announces (« Lecture de l'eAIP du SIA… » / « Lecture d'EAD Basic… », with n/total). A refusal shows its reason in a floating
  notification: without a launcher (or on a paired device) the reading is done on the workstation and the SimBrief OFP is proposed as
  the per-flight source; `no-tables` « Aucune table de procédures publiée pour cet État » (plus « Little Navmap a une base sur ce poste »
  when the answer carries `lnm: true`); `no-credentials` (EAD); `too-soon` « Patientez {wait} s avant la lecture suivante (EAD Basic) »
  (F14). « Relire » on a side with data is the same gesture (aerodb replaces the file of the same source) (F27). Never silent: the start
  is said and the end always (success with its counts — « LFXX : 78 procédures lues sur 18 pages », the pages not read with the most
  frequent reason, the records dropped by the geometry check, never a bare « 0 procédures » —, refusal, failure with the launcher's
  message and the number of warnings), even when the pilot has left Fuel meanwhile; leaving does not cancel the job (F14, F38).
- **« Source »** ends the secondary line: for the side's chosen SID (departure), STAR and approach (arrival), a link to the record's
  `source.url` as aerodb gives it (`https://` only), `target="_blank"`, `rel="noopener noreferrer"`, the page's name in its title; with
  two links the kind follows (« Source STAR · Source APP »); a record of another source has no link, its `source.file` in the line's
  title; Fuel builds no address (F42).
- **« Sur la carte »**, a text button in each side's title when the aerodrome has data, sets `#maps?choose=dep|arr&icao=…`; the Map
  comes back with `location.replace('#fuel?focus=arr&rwy=25&star=ID&app=ID&apptrans=none')`, every key of the side in one trip among
  `rwy sid star app apptrans` (lower case; `none` = « Aucune »; a missing key leaves its family as it was; no SID / STAR transition).
  Fuel consumes them together with `focus` at mount (`ctx.consume`; `apptrans` into `appTrans`) and, once the side's records are drawn,
  applies them through the path of a choice: one drawing, one write, one line saying what changed. Only « none », a runway offered for
  that aerodrome, or a record of that side's aerodrome (right kind, not doubtful) is admitted; anything else is ignored (F41).
- **The quote runs on the procedures path** (before the start): with procedures chosen and read (`CF.loadProcedures`), the distance is
  the last point's `nm` of `CF.flownPath(CF.expandedPath(flight, procs))`, the level steps are the route points' `alt_ft` at their
  `nm`, `quote.legs` has one `{ id, min, origin }` per flown point and `profile.path` is the planned vertical path (`progress.js`
  `verticalPath`: nm strictly increasing; the model's climb, cruise and descent, then the constraints without a vertical jump — a
  ceiling in the descent pulls the path down only from where the model's descent gradient, taken back from it, meets the cruise; a
  ceiling in the climb holds the path level up to it; once the descent has started the path never rises, so a floor or a missed
  approach does not lift it). The procedures' altitude constraints reach `profile.path` only, not the quote's level steps: fuel and time
  count the distance. Without procedures: the route's points, legs with origin `'route'` (F15, F23).
- **After the start** the card is in step 5 and both sides stay editable: a change rewrites `route.procedures`, `quote.legs`,
  `profile.path`, the progress length and `quote.legsAt` (the time of the last rewrite of the legs or the vertical path); the block,
  trip, minutes and the rest of the quote do not change and no new quote is made (F16).

### 9.5 Step 3 — Weather

- **Level and wind**: the level (FL), the climb goal (§ 7), wind direction and speed (speed only or nothing: a range), ISA deviation;
  IAS and rate for the manual goal (F3 for their units).
- **ISA from the METAR**: once the weather is read, a line proposes the departure METAR's deviation: temperature − (15 − 1.98 ×
  aerodrome elevation in thousands of ft), the elevation from aerodb (`aerodromes({ icao }).elev`, ft), else the METAR's (m), rounded to
  1 °C; « Use ISA … » writes it into the flight and into the quote settings (`isaDev`), which a flight without a deviation starts from;
  a typed deviation is kept there too (no case).
- **Real weather** and the aerodromes of the corridor: § 10; the winds aloft table: § 11.

### 9.6 Step 4 — Result

- **Density altitude** (folded): a chart with the ISA deviation across (−20 to +40 °C, widened to the flight's and the departure's) and
  the density altitude up, one line per pressure altitude (`FlightPerfModel.isa(h, dT).sigma` inverted by bisection); the flight's
  deviation (vertical), the ceiling (`cruise.ceilingFt`, else the model's, horizontal) and their crossing, the pressure altitude where
  the ceiling is reached at that deviation (bold), and the departure from the METAR (pressure altitude = elevation + 27 ft/hPa ×
  (1013.25 − QNH)); two lines under it give the departure's pressure and density altitudes and the effective ceiling (no case).
- **Level decision**: the whole trip's fuel (solid) and time (dashed) by level, extrapolated beyond the ceiling (dotted), the levels
  that cannot be flown shaded, the ceiling, the least fuel (dot) and the fastest (square), the plan's level (vertical line) and the
  plan's real quote (a diamond on each curve, its legend line). The fuel axis is in the **displayed** fuel unit. A tap sets the level
  (rounded to the series' step, within the flyable levels); two buttons take the least-fuel and the fastest levels (F80 levels bench
  for the series; no case for the drawing).
- **Result**, sticky at the bottom: block fuel (a range when the wind is unknown), trip, time, top of descent, approximate source and
  MTOW warnings. On a phone, about 100 px at 390 px: a context line on **one line** (ellipsis, the full text in `title`) — « Block ·
  FL060→090→110→070 · wind ARPEGE FL060 » (levels joined by → without spaces, « FL » once, the wind source short, « unknown wind » for a
  range); the big figure at `--sog-h2` under 760 px of module (`--sog-h1` above); then three tiles on one row, label and value each on
  one line: « Trip » (fr « Étape », de « Reise », es « Etapa »), « Time » and « TOD », labels at `--sog-size-xs`, values at
  `--sog-h3`, TOD's value without « before », the full name in each tile's `title`. A started flight shows « Flight started at hh:mm ·
  for 1 h 12 ». Module-scoped rules on `.f-bar` and `.f-tiles` (F2).
- Folded under the result: **Open in ▾**, the V2 links (`frame/lib/external_links.js`): SimBrief dispatch prefilled (departure,
  arrival, type, route points, registration, callsign, alternate, level), SkyVector (`?fpl=` with the speed / level group, departure,
  points, arrival), Navigraph and ChartFox (departure and arrival pages); plain links in a new tab, an entry greyed with what it lacks
  (no case). The quote's **details** (taxi, climb, cruise, descent with time and distance, contingency, reserve, block, in full
  words); the **climb instructions** (a drawing of altitude against time with the IAS at each reading, then the table: throttle, RPM,
  IAS, rate, fuel flow, Mach, time, fuel); the **quote settings** (taxi and reserve minutes, contingency, displayed units, this
  flight's cruise fuel flow, the weather radius) (no case).
- **Display units** (the settings fold, one row of four selects that wraps on a phone): fuel kg / lb (`displayUnit`), speed kt / km/h
  (`displaySpeed`), altitude ft / m (`displayAlt`), distance NM / km / SM (`displayDist`); defaults kg (the sheet's unit), kt, ft, NM;
  saved with the quote settings. The conversion is the screen's (invariant 3): `FuelModel.convertFuel / convertSpeed / convertAlt /
  convertDist` are the arithmetic; the screen has one set of helpers per quantity (`speedTxt`, `altTxt`, `distTxt`, the vertical speed
  per minute of the altitude unit), each with its number-only, input-field and parse counterparts and its unit symbol (not translated);
  every number and unit label of the Plan goes through them. Typed input is parsed back to the model unit, rounded to 0.01 of it when
  the unit differs, so a whole number typed in the displayed unit shows again unchanged (100 km → 54 NM → 100 km); displayed values are
  rounded to the whole number; changing a unit redraws the fields and leaves the current flight untouched. **Flight levels stay flight
  levels** (FL120) whatever the altitude unit — the level field, the level decision, the sticky result and the climb drawing's target;
  the altitude unit shows where an altitude is a value (the climb table's altitude column, the vertical rate column and the manual rate
  field, the level in metres beside the FL in the sticky result when the unit is not ft). The Sheets screen keeps the sheets' own
  units (F3).

### 9.7 Step 5 — Departure

- **Summary**: one page — aircraft, departure and arrival named in full (`LFRS` and its name, before and after the start), normalised
  route, level and steps, wind and source, block fuel; the planned times name the first and last point when they are those aerodromes
  (F47).
- **« Start the flight »** (§ 12) writes `current_flight.started = { at, by: 'fuel' }` and opens the Map (F16 starts one); « Cancel the
  start » after a question (no case).
- **Flight plan for the simulator**: three buttons — « .fms (XP 11/12) », « .fms (XP 10) », « .pln (MSFS) » — download the route and the
  chosen procedures (`frame/lib/fms.js`; 44 px; disabled under two placed points; named `LFRS-LFML_<day>.<ext>`) (F61, F60).
- The procedure card after the start (§ 9.4), and the « Planned progress » card (§ 12).

### 9.8 Sheets

A read-only list (the editor is Maintenance's): sorted by category (helicopters, turboprops, jets, piston engines, others: aerodb
`classify`), then by name; each sheet gives its name, type, unit, origin, what is missing by family (« À compléter : régimes, vitesses… »
or « complète »), its date; the sheet of the current flight is marked; « Utiliser » sets it for the flight; the name and « Modifier dans
Maintenance » are plain links to `?app=maintenance#aircraft?sheet=<id>`, same tab; then the airline's types without a sheet (aerodb
`fleetTypes()`: a type is covered when a sheet's ICAO code, type or id resolves to it), « Type de la compagnie (n appareils) », with
« Créer dans Maintenance ». A row gives its text the width, the name on one line; under 480 px of module its actions go under the text.
No field, import, preview or removal here (F79).

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
