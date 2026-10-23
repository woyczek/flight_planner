# fuel — decisions log

The memory of the V3 fuel module: every choice, dated, with its reason. Never rely on chat history.

## 22 October 2026 — reading (lot 1) and lot 2a

- **23 Oct 2026 — quick flight date** (user's request through Simplification): next to the flight date, a clock
  "+30" (44 px, label in the tooltip and `aria-label`) sets now + 30 min rounded up to 5 min; a press while the
  date is still ahead adds 30 min to it (a past date restarts from now); "Now" empties the date (the observation,
  as the start of the flight does). The aerodromes' weather (TAF when it covers that time) and the winds aloft are
  read again 0.7 s after the last press (several presses, one reading). On a phone the date goes under the level
  (flex wrap) so the field and both buttons fit in 375 px. The Departure step does not show the date (the start
  resets it to now): no button there.
- **23 Oct 2026 — `keepScroll` from the frame** (frame lot 17, `frame/lib/dom.js`): the module's copy is gone, and
  so is `renderPlan`'s own restoring of the field being typed (value, focus, selection by `data-k` / `data-i`):
  the frame's helper does both (frame INTEGRATION § 6: a render never changes the scroll nor what is typed).
  Checked on 8804: two map writes at 600 px, the page stayed at 600.
- **23 Oct 2026 — `progress.actual` belongs to the frame** (Simplification's bug: fuel rewrote the current flight
  every 10 to 35 s without `progress.actual`, erasing the real position). `frame/lib/current_flight.js` `merge`:
  the record is read just before every write, fuel replaces only `FUEL_FIELDS` and, in `progress`, only
  `FUEL_PROGRESS`; `progress: null` clears only those keys. A frame write no longer triggers a fuel write: the
  watch re-reads without redoing the quote when the plan (route, level, aircraft, start) is unchanged, the
  progress is compared on fuel's keys only, and written at most once a minute (the planned position moves at every
  render). Report ends a flight through the same merge. Bench `test/current_flight.html` 11/11; on 8804, four
  frame writes 3 s apart: no fuel write, then fuel's minute write with `actual` intact.
- **23 Oct 2026 — the page no longer jumps to the top** (user's bug): a full `renderPlan()` — the current flight
  written by the map, report or another device while nothing has the focus — replaced the screen, which shrank for
  a moment, and the browser pulled the page up (900 → 517 px on 8804; to the top on a short page). `keepScroll`
  keeps every scrolling container's position and the block's height during the render, puts the positions back
  after it and on the next frame; the focus given back to a field no longer scrolls (`preventScroll`). The
  periodic updates (progress every minute, weather) were already partial (`refresh`) and did not move the page (85 s
  observed). Checked on 8804: two writes by the map at 900 and 500 px, no movement.
- **23 Oct 2026 — no silent fallback, an estimated ceiling said so** (end-to-end pass on the real base, items 5 and 6):
  a changed route fell back silently to the METARs' surface wind while the new forecast aloft loaded (284°/44 → 271°/15
  kt, the block jumping); the previous wind aloft now stays, marked "forecast loading…", and only a failed reading
  hands over to the METARs, said in the result and under the wind fields. The density altitude chart says "Estimated
  ceiling" when the ceiling is not a sheet's (no `ceilingFt`, a type estimate). Checked on 8804 with the real base: route
  changed → 284/44 kept with "forecast loading…", then 285/47 from the new forecast; Open-Meteo answering 503 → METAR
  wind 271/15 with "forecast aloft unavailable"; EC45 "Estimated ceiling 27,805 ft".
- **23 Oct 2026 — lot H rectified by the user**: there is no "End the flight" — writing the report is the normal end of
  a started flight (report sets `started` and `progress` to null on saving), "Cancel the start" the other one; the
  button and `started.endedAt` are removed (report no longer takes the shutdown from fuel). "Start the flight" is the
  launch of the flight plan, and the planning may be days old: it first sets the flight date to now, reads the
  weather, the winds aloft and the ISA again, redoes the quote and says what changed, then writes `started`. The line
  of changes is kept outside the module state (`startNote`), since opening the dual view may remount the module.
  Checked on 8804 with the real base and services (copy of the data's SIA base, references, sheets and fleet in the
  session's scratch folder, served by the launcher with `--data`; the user's data/ untouched): EC45 F-ZBPD, LFRS NTS
  LMG LFML 365 NM, flight date in three days → start: "wind 273°/35 kt → 284°/44 kt · block 684 kg → 644 kg · planned
  arrival 17:03", date back to now; cancel with the frame's confirmation → planning again.
- **23 Oct 2026 — lot H, ending a flight and its planned progress** (two questions of the user: how is a started
  flight stopped, where should it be in theory): "End the flight" and "Cancel the start" on the Departure step; the
  progress is computed from the start time and the quote — the cruise is split by leg with that leg's forecast wind
  (as the map's arrows show it) but scaled to the quote's cruise time, so the arrival ETA and the result's flight time
  agree; taxi comes first because the start time is the engine start. `progress` is written only when something else
  than its `at` changes (once a minute in flight), to keep writes low. Checked on 8793: start → "End the flight" and
  "Cancel the start", "Flight started at 14:24 · for 0 min"; a start 70 min earlier → "123 NM from departure, between
  LUGEN and NEPIX · 251 NM to go · planned fuel remaining 380 kg", NEPIX highlighted, ETAs 13:24 to 15:54; end →
  "Flight ended at 14:24 · block 0 min"; cancel, confirmed in the frame's dialog → `started` and `progress` null.
  Bench 14/14.
- **23 Oct 2026 — the level changed by the decision** (seen by the help session): "Use FL220" kept the wind of
  FL280 — `setLevel` did not re-apply the forecast aloft. It now does, like the level field and a flight changed on the
  map: wind, ISA at the level and their source are redone, then the quote, the sticky result and the Departure step.
  Help and the TAF message name the settings card as it is: "Weather key (TAF, avwx.rest)".
- **23 Oct 2026 — the quote in the current flight**: Report fills "fuel at start" with the block fuel (arbitration 15),
  so fuel writes `current_flight.quote = { block, trip, unit, minutes, levelFt, approx }` with the profile, only when it
  changes.
- **23 Oct 2026 — arbitrations of the end-to-end pass** (ergonomics session): `started` cleared when the departure
  changes, kept and marked `diverted` when the arrival changes after the start — and cleared with `null`, because a
  deleted key came back from the stored record through the write's merge (seen in the check); the wind's source in
  the sticky result and on the Departure step; the ISA deviation at the planned level from the forecast, proposed and
  taken with "Real weather"; one level notation (`formatLevel` in `frame/lib/route_text.js`, FL from 5,000 ft, feet
  below; maps will use it); "Read the aerodromes' weather" busy while reading; "Start the flight" keeps the dual view
  on a wide screen; the Flight step's fields at their useful width (codes 8 em, level, date). Found while checking:
  changing the departure or arrival added the new aerodrome in front of (behind) the old one in the route text —
  repeated changes stacked "LFRS LFBO LFRS…", 2,451 NM; the old aerodrome is now replaced (free text) or its entry
  removed (OFP list). The aircraft picker shows every origin of a merged line (aerodb 94e7feb54: one line per
  registration), `fleet-v2` read as the fleet. Checked on 8793 at 375 and 1280 px: busy button, "wind: ARPEGE forecast
  FL060", "3 500 ft" at FL035, "ISA −2 at FL060 from the ARPEGE forecast", start → `#fuel?with=maps`, diverted noted,
  `started` null after a departure change, route text kept clean over two departure and two arrival changes; route
  text bench 20/20.
- **23 Oct 2026 — an aircraft without its own sheet took the first sheet** (found during the end-to-end pass): a fleet
  aircraft with no sheet (`sheetId` empty, the type estimate in the picker) fell back to the first sheet of the list —
  a turboprop for the H145, so FL240 and 1,636 kg over 374 NM, under "Cruise: sheet's cruise fuel flow". The first
  sheet is now only a default when no aircraft is chosen; otherwise the type estimate (approximate) serves, as the
  picker said. Checked: the H145 gives 616 kg, 2:19, "type estimate (approximate)".
- **23 Oct 2026 — airways survive a points change** (ergonomics decision after maps 6a, 867d71217): rebuilding the
  text from the points alone dropped the airways typed (UN869). The route text code moved to shared pure code,
  `frame/lib/route_text.js` (fuel owns it, maps uses it): `tokenize` is the former reading of fuel's `routePoints`
  (resolution by aerodb stays in fuel), `textFromTokens` the former normalisation, and `textFromPoints` keeps the
  words between two consecutive points that were already neighbours in the previous text and are unchanged (same
  name, same position within 0.5 NM when the caller gives the previous points — maps does after a drag; fuel's list
  only reorders, removes, adds or sets levels, so names suffice). An airway between two points is a property of
  that pair: insert a point inside a direct leg and both airways stay; move a point and the airways touching it drop.
  Bench `test/route_text.html` 14/14; on 8793 the normalisation gave the same text as before, and moving LUGEN down
  the list dropped UN460 only.
- **23 Oct 2026 — answers after unmount** (bug seen by the frame: "Cannot set properties of null (setting 'wx')" in
  `wxFetch`, Fuel then Map quickly): every asynchronous path keeps the mount it started from and stops when `S` has
  changed meanwhile (`gone(s)`) — weather, corridor, Open-Meteo, aircraft search, point lookup, route reading,
  SimBrief, sheets dialogs and imports, aerodb and current-flight re-reads; the pending weather timer is cleared at
  unmount. Nothing is ever written into another mount's state. Reproduced on 8793 with 1.5 s slow answers, Fuel →
  Map three times: the former code threw three times, the new one never.
- **23 Oct 2026 — lot F, winds and temperatures aloft** (user's question through the ergonomics session: wind arrows
  at the planned level, inversions in the density altitude): METARs only give the surface wind, so a forecast by
  pressure level is needed — Open-Meteo, no key, added by the frame (7eb6aa2c0). A flight level is a pressure, so the
  interpolation is in ln(p) between pressure levels, not on geopotential heights. One call for up to 24 places along
  the route; the hour nearest to the flight date is kept (a date change refetches: the full hourly set would weigh
  hundreds of KB in the cache). The METARs' surface wind stays as the fallback of "Real weather". The ISA proposal
  stays the departure METAR's (the user's request, lot D); the real atmosphere at departure is shown beside the ISA
  chart rather than replacing it. Checked on 8793: a real answer (the module read Open-Meteo at mount: Météo-France
  model, 00:00 UTC run, three points at FL080 with wind, temperature and ISA deviation written into
  `route.points[].wind`, "Real weather" taking the mean aloft), then a mocked answer with a ground inversion
  (364 to 1,061 ft, +3 °C) drawn and listed at 375 px; bench 29/29.
- **23 Oct 2026 — typing is never rewritten** (user's bug, "the route text keeps being rewritten"): the rule is that the
  route is normalised only on leaving the field (or Enter), and no render touches a field being typed in. Not
  reproduced on 8793 (ten slow keystrokes, alone and in the dual view with the Map), but two holes were closed: a late
  watch echo of one of fuel's own writes (older `updated_at` than the last write) replaced the flight in memory with an
  older route text while typing — such echoes are now ignored, and when a field is being typed in the watched
  record keeps the field's text; and a full `renderPlan()` (watch while nothing has the focus, unit change, OFP)
  recreated the field from the stored text — it now gives the focused field back its value, focus and selection.
  Enter in the route field leaves it (normalises), Shift+Enter makes a new line. Checked: a stale fuel echo ("OLD
  TEXT", older date) and a newer foreign write ("MAPS TEXT") while typing left the field as typed and the typed text
  was written back by fuel.
- **23 Oct 2026 — lot E, weather without a launcher** (frame lot 12, 8ea83b6c6: metar.vatsim.net and avwx.rest
  direct): aviationweather.gov is tried first (one 503 from the frame when there is no launcher, at no cost), then
  the direct sources. The METAR decoder is shared pure code in `frame/lib/metar.js` (maps or report may read a
  METAR later) and gives exactly aviationweather's form, so `weather.js` and the card did not change; its flight
  category uses the same FAA rules. TAFs are asked one station per call (avwx), so only when a flight date makes them
  useful, at most twelve, and the first 503 (no key) stops the loop. Bench `test/metar.html`, 61/61: ten raw METARs
  of the vatsim kind (gusts, CAVOK, VRB and variable sector, three layers, CB / TCU, vertical visibility, US units
  and fractions, MPS, haze with NSC, trends and remarks ignored), the month rollover, an avwx METAR (CB, inHg / SM)
  and an avwx TAF read by `station()` at 15Z (TEMPO TSRA with CB warned, BECMG VRB). Two of my first expected values
  were wrong (9,000 m is 5.59 SM, VFR; A3001 is 1016.3 hPa), the decoder right. The avwx JSON shape was written from
  its documentation without a live answer to compare: to check with a real key. Checked on 8793 with mocked answers:
  no date → METAR only from vatsim; date, no key → one avwx call then the warning; date with a key → one TAF per
  station, the card on TAF.
- **23 Oct 2026 — lot G, Plan in five steps** (ergonomics session, from the user's own way of preparing a flight):
  the blocks are regrouped by step rather than by data — the level goes with the flight (step 1), wind and ISA with the
  weather (step 3), the climb goal with the level decision (step 4). Narrow module (phone, pane): one step at a time,
  the bar shows numbers only except the current step (five names did not fit in 375 px: "1 Fligh…"); wide module: all
  steps visible, as Report does, by `@container` (900 px) so that a 506 px pane steps through. "Start the flight"
  writes `started` and navigates 350 ms later, after the 300 ms write of the current flight. `TX.steps` already named
  the quote's "Steps" row: the step names are `TX.stepNames`. Checked on 8793: 375 px — bar 44 px high, "3 Weather"
  current with numbers around, summary on step 5, sticky result on every step, `#fuel?from=maps&focus=route` → step 2
  with the route field focused, "Show the map" → `#maps?from=fuel`, "Start the flight" → `started { at, by: 'fuel' }`
  then the Map; 1280 px — full screen (1,023 px) all five steps, no bar; dual view (506 px) one step; "Show the map"
  from full screen → `#fuel?with=maps`, pane opened.
- **23 Oct 2026 — a flight changed elsewhere** (contract with maps for its lot 6, through the ergonomics session):
  when the current flight's `by` is not `fuel`, fuel adopts it — keeps `points` and `text` as written (normalising
  maps' text would overwrite what it just wrote), derives distance and track from the points, redoes the quote and
  writes `profile` with `by: 'fuel'`, on the plan or the sheets screen, live (watch) or at the next mount. Checked on
  8793 through the data layer (an adapter declaring `pilot/` as maps does): live, a 5-point route with FL140 at PT2
  gave 301 NM, "FL100 → FL140", TOD 38.9 NM in `profile`, maps' OFP text untouched; with fuel unmounted (on #report),
  a 3-point route was adopted on returning to #fuel (297 NM, profile rewritten).
- **23 Oct 2026 — the route text first** (users' feedback arbitrated by the ergonomics session: the route string is
  what pilots work with all the time): the text field is always visible and normalised on leaving it; the points list
  becomes secondary (folded, "Points (n)"); distance and track are read with their source, typed only when nothing
  resolves. Normalising keeps airways and unknown words in place rather than deleting what the pilot typed (airways
  carry information, an unknown point is shown, not dropped); positions live in `points`, and a name aerodb does not
  know is found there again on reading — otherwise a point placed by coordinates (or one from an OFP) would be lost
  once the text no longer carries coordinates. A known name is tried before the airway pattern (a fix called PT1 would
  otherwise be read as an airway). Checked at 375 px on 8793 (aerodb's `coords` mocked): `lfbo n0450f350 dct tou
  un460 LUGEN/n0450f280 xyzzz nts lfrn` → `LFBO TOU UN460 LUGEN/F280 XYZZZ NTS LFRN`, XYZZZ named under the field,
  301 NM "from the route"; an unresolved route showed "Type them by hand", 120 NM typed → "typed by hand"; an OFP list
  with PT1 / PT2 → `LFBO PT1 PT2/F140 LFRN`, read back with no unknown point; `LFBO 4530N00030E 4630N00048W LFRN` → 4
  points.
- **23 Oct 2026 — weather along the route's corridor** (user's correction through the ergonomics session): no more
  "intermediate aerodrome" field — the first feedback found it too big, the correction removed it. The aerodromes come
  from the route: aerodb's aerodromes by leg box widened by a radius (quote settings, 10 NM), filtered by their
  distance to the route, sorted along it; those without a report are dropped from the card and the wind. The real
  wind averages, leg by leg, every aerodrome that has one (two at least), no longer requiring all of them. Calls go by
  40 stations. An empty corridor is not kept (aerodb may not have loaded the area yet). Checked at 375 px on 8793 with
  aerodb's aerodromes and the METAR mocked: route LFLS → LUGEN → LFMN, 10 NM: LFNC, LFNA, LFNS kept and folded, LFMX
  (no METAR) dropped, LFLE (off the corridor) out; wind from the five; a 3 NM radius redid the corridor.
- **23 Oct 2026 — lot C, editable route points and steps** (asked through the ergonomics session): the points become a
  list (up, down, remove, add); the level is one optional field per intermediate point, read as "from this point on"
  (as an OFP or an item 15 writes it, and as maps' missions use `route_points.alt_ft`); first and last points never
  carry one, so the plan's level stays the single start and the decision chart keeps its meaning. Levels read from a
  text are kept only where they change: an OFP repeats its level at every entry, which would otherwise pin the cruise
  at the first waypoint once the plan's level is changed. Editing rewrites `route.text` (OFP form) instead of keeping
  an item 15 next to diverging points — airways typed in an item 15 are lost then, the points are what the quote and
  the map use. `quote` takes `steps` and splits the cruise into legs; without steps every value is the former one (the
  bench's three V2 cases unchanged, 8 step checks added: 58/58). The current flight is written 300 ms after the last
  change (800 before). Checked at 375 px on 8793 (aerodb's `coords` mocked, the sandbox resolves no aerodrome): a
  4-point route with FL120 from LUGEN gave "FL100 → FL120", TOD from FL120, `alt_ft` in `current_flight.json`;
  item 15 `LFLS N0120F080 DCT LUGEN/N0120F120 DCT LFMN` gave FL120 on LUGEN only; add by name and by coordinates, an
  unknown name warned; the rows stay on one line (the level field kept short against the frame's card input width).
- **23 Oct 2026 — lot D, ISA deviation and density altitude** (user's request, for helicopters): the deviation is
  proposed from the departure METAR (temperature − (15 − 1.98 × elevation kft)), not applied by itself — the pilot may
  plan for another hour; it is kept in `fuel.json` as the next flight's start. The density altitude chart first drew
  density altitude against pressure altitude: the lines for each deviation were nearly on top of one another at
  375 px, so it became the classic chart (deviation across, one line per pressure altitude), where the flight's
  deviation and the ceiling cross at a readable point. The departure point uses the METAR's own deviation at its
  pressure altitude, not the flight's. Checked at 375 px on 8793 with a mocked METAR (LFLS 30 °C, Q1008, aerodb
  elevation 1,302 ft): ISA +18 proposed, "Use" wrote the field and the settings; departure 1,444 ft pressure, 3,484 ft
  density; a 25,000 ft ceiling reached at 23,000 ft pressure altitude; the 3 designs day and night, no horizontal
  scroll.
- **23 Oct 2026 — lot B, aircraft through aerodb** (user's decision: every aircraft datum in aerodb, one API): fuel
  keeps the screen only. The picker is aerodb's `search` (the prototype kept in a stash matched its result order and
  origins, then was dropped); the Aircraft block is one line with a search button. Sheets are read with
  `sheets.list()` and written with `sheets.put(sheet, { source })` / `remove` — the review's origin becomes the source
  (eurocontrol, chatgpt, lnmperf, ofp, import, edit); aerodb stamps `updated_at` and `updatedAt` (the gap noted in
  lot 4a is closed there) and writes the V2 mirror. `modules/fuel/sheets.js` removed (aerodb's `sheets.js` is the same
  code plus registration and callsign fields); `modules/fuel/perf_prompt.js` stays (ChatGPT texts, read by aerodb's
  logic as `window.PERF_PROMPT`). The sheets bench now loads `frame/aerodb/sheets.js`: it found that aerodb's two new
  fields made `.lnmperf` export refuse sheets without them (reported to the aerodb session, fixed there in 264a73727;
  the bench is 18/18). Checked at 375 px on 8793: empty search → sheets then fleet; "hand" → F-HAND (type estimate) and the free
  code; the choice wrote `{ sheetId, type, registration, callsign, name, source: 'fleet' }`; an edited cruise TAS went
  through the review into `aircraft/sheets/TEST_TP.json` stamped `edit`, and into the V2 mirror.
- **23 Oct 2026 — aerodrome weather** (user's request through the ergonomics session, lot A; TEMSI left for the
  roadmap): METAR / TAF of aviationweather.gov through `ctx.net` (the service sends no CORS header: a direct call from a
  page fails, the launcher relays it; checked with curl that the JSON gives `fltCat`, clouds with bases and types,
  `fcsts` with `fcstChange`). The runway is the main runway's end closest to the wind, from aerodb's aerodrome
  `bearing` and `magVar` (no runway list in the SIA base): said under the components, since the runway in use is not
  known without ATIS. "Real weather" averages wind vectors weighted by leg length, a stand-in assumed and shown.
  `weather.js` pure; the weather card is open by default and its folded state kept. Checked on 8793 with answers copied
  from a real reading behind a simulated relay: TAF chosen for a flight date 3 h ahead with its TEMPO (IFR), METAR for
  the other aerodrome, CB warnings, wind 244° / 5 kt from LFBO (TAF) and LFML (METAR); the network refused → last values
  with their time; components on LFBO 32 checked by hand (260° / 10 kt → 5 kt head, 9 kt from the left); 375 px and the
  three designs, day and night.
- **23 Oct 2026 — design lot 2 primitives** (asked by the design session): result bar, tabs, grids, columns, tables, figures, warnings, sheet list and "Open in" links moved to `f-bar` (block layout, no own shadow), `f-tabs`, `f-grid` (`--f-min: 96px`), `f-cols`, `f-scroll` / `f-table` / `f-num`, `f-tiles` (h3-sized figures in the sticky result), `f-warn`, `f-list` / `f-item`; the drawings' colours from `--sog-chart-1…5`, `--sog-chart-grid` and `--sog-fg` (they follow the design without a redraw); "Open in" lost its own "▾" (the frame's summary has a chevron). The module's own `<style>`
  only places things now; checked at 375 px and on a screen in standard, cabinet and field, day and night (no white
  at night, square corners in cabinet and field, no target under 44 px).
- **Scope kept from V2 Fuel**: one aircraft (picker with search), one route (field, point list, coordinate helper), the
  SimBrief OFP read whole (`shared/simbrief_ofp.js` as is), level and wind, the quote, the climb instructions, the
  level decision chart (two scales), "Open in" (`shared/external_links.js` as is); performance sheets as a sub-module.
- **Moved out**: vertical profile and route map → maps; landing CSV import → landing; sheet merge, diff and folder
  writes (FileAccess) → the frame's data layer; `.lnmperf` export, RPM table and engine map editor → sheets
  sub-module, desktop only.
- **V2 `flight_planner.js` sorted** (6,939 lines, 235 top-level functions, by script): ~107 pure functions (~2,000
  lines) to take as they are; ~48 tied to the page state (~1,450 lines) to rewrite as functions of their inputs; ~72
  page functions (~3,360 lines) dropped. `calculate` mixed the page and the quote: the quote is taken out as
  `FuelModel.quote` (inputs → quote), with `cruiseSource` and `modelProfile` (`modelSheet`) whose page reads became
  parameters.
- **`shared/flight_performance_model.js` copied unchanged** to `modules/fuel/performance_model.js` (V2 stays
  untouched). Its notes still read the page language through `RepositoryNav`; texts move to `ctx.t` when the module
  screen exists (lot 2b).
- **`shared/fuel_reference.js` dropped**: `aerodb.aircraft().estimate(codes)` has the same rules and the same answer
  shape (`kgPerHour`, `tasKt`, `basis`, `cls`, `wtc`, `src`).
- **Bench on a known case**: a fictitious complete turboprop sheet (no ICAO or EUROCONTROL data in the repository),
  three flights (known wind; unknown wind, ±25 kt; speed only, ±40 kt) run through the V2 page `calculate` with
  EUROCONTROL, Poll-Schumann, the chosen climb and the pin neutralised; `modules/fuel/test/quote.html` finds every
  displayed value again (block or range, taxi, trip, climb, cruise, descent, contingency, reserve, TOD, time): 30/30.
- **Decisions of the ergonomics session (22 Oct)**: sheets are module data, read and written by fuel at the V2 path
  `planner/flight_performance_database_merged.fpdb.json`, merged sheet by sheet (newest wins), aerodb only completes
  them; the current flight shared with maps is a record `pilot/<tri>/current_flight.json` whose schema fuel writes
  (INTEGRATION § 3); the last OFP goes to a frame cache document (never synchronised), not to a store of the module;
  SimBrief is called through the frame, the identifier comes from the identity, never typed in fuel; phone screen:
  aircraft, route, level and wind, level decision, sticky result visible, the rest folded.
- **Sheet dates**: V2 sheets carry `updatedAt` (camelCase) and other dates (import, SimBrief snapshot, calibration;
  V2 `profileWhen` takes the latest), while the frame's merge decides on `updated_at`. On every write the module sets
  both to the latest of those dates, so V2 pages and the frame agree; to confirm with the frame agent that
  `keyed:profiles:id` compares `updated_at` per sheet.
- **Lot 3a, the level decision in pure code** (`modules/fuel/levels.js`): from V2 `shared/flight_perf_view.js`, the
  calculations are taken out of the view (2,235 lines of drawing, panels and sliders): `extendSeries`, `rpmRows`,
  `rpmForFF`, `ffForRpm`, `ensureManual` (`manualSettings`), `manualLaw`, `goalLaw`, `goalNow`, `tripLaw`,
  `climbGuide`, `decisionSeries`, `buildCache` (`levelCurves`), `minDistance`. What they read in the view's state
  (`S.manual`, the active profile, the goal remembered in `localStorage`, `modelProfile` of the page) became
  parameters. The SVG drawing stays to be rewritten with the module screen (lot 2b + 3, on the frame).
- **Bench of the level decision** (`modules/fuel/test/levels.html`): the V2 view's state read after a calculation with
  the quote bench's sheet (300 NM, FL200, 30 kt tailwind, goal "sheet's climb IAS"): model ceiling and minimum-drag
  speed, manual settings, decision series (step, bounds, least fuel FL250, fastest FL140, five levels), curves
  (highest level, optimums, plan, cruises), climb to FL200 row by row; every value found again to 0.001: 24/24.
- **23 Oct 2026 — "Open in ▾"** (asked by the user in V2, kept by the Pilot application): the pure part of V2's
  `shared/external_links.js` (route entries, SimBrief and SkyVector points, normalised flight, menu entries) copied into
  `frame/lib/external_links.js` (owner fuel; maps and report may use it), translation passed in. No request is needed:
  every entry is a plain link opened in a new tab; the V2 popup menu became a folded block under the result (one tap,
  phone-sized rows, the reason of a greyed entry under it). `meta.files` now lists fuel's calculation files and the
  shared one, kept offline from the first visit.
- **23 Oct 2026 — vertical profile for maps** (asked by maps, through the ergonomics session): the current flight
  carries `profile { climbFpm, climbKt, descentFpm, descentKt, tocNm, todNm }` from the quote's climb and descent
  (rate = level ÷ minutes, ground speed = distance ÷ time), written only when it changes (redraws and resizes do not
  write). `todNm` is the quote's descent distance, consistent with the descent rate and speed; the result's "top of
  descent" keeps the V2 gradient rule.
- **Small lot after the first screen** (23 Oct 2026, the user trying the module on a phone; no new work before
  feedback):
  - **"2,400" fixed** (`gptNumberText` in `sheets.js`): V2 read a ChatGPT value "2,400" as 2.4. The number is now read
    by its form (thousands commas, European form, otherwise decimal comma). The sheets bench keeps the V2 capture and
    states the one value that differs (2,400), plus nine number cases: 18/18. V2 keeps its behaviour.
  - **RPM table edited on a computer screen only** (the editor is wide; the phone keeps it read only). An empty cell
    of a row that never had the field adds no key, so an untouched row is not shown as replaced; a removed row is
    previewed and can be kept.
  - **Offline from the first visit**: the five calculation files are imported at every first mount, before the first
    drawing; fuel is the Pilot application's first verb, so the first visit mounts it. Requests made before the frame's
    service worker controls the page escape it, so the module fetches the five files once more at `controllerchange`.
    (The service worker does not register in the desktop app's built-in browser, so this was not tried offline here.)
- **Lots 2b, 3b and 4b, the screens on the frame's loader** (`modules/fuel/module.js`, 23 Oct 2026, after
  `6ce25009b`): one ES module with two screens inside (Plan, Sheets) rather than two modules, so the Pilot application
  keeps one verb for fuel; the pure files are loaded with `import()` (they are plain scripts that set `window.*`, which
  works as module scripts) and only once per page. The module's style is a `<style>` inside its own element, every rule
  prefixed by `[data-module="fuel"]`, on the frame's tokens; no global sheet.
- **Writes declared on `pilot/`** (merge `record`) and not on `pilot/<trigram>/…`: a declared prefix cannot hold the
  trigram, and the example module already declares `pilot/` with the same rule; the device's own documents (OFP, last
  screen, folded blocks) go under `cache/fuel/` with the cache policy.
- **Route resolution kept small**: "ID lat lon" entries are taken as they are; otherwise each identifier of item 15 is
  asked of aerodb (`coords`), speed-level groups, `DCT`, airways and procedures left out; the distance is the sum of the
  legs, the track the departure-to-arrival initial track (as V2's quote). Distance and track can be typed when nothing
  resolves. Airway expansion belongs to maps.
- **Sheet editor**: the V2 field list (`PROFILE_FIELDS`, labels in French) with labels translated in the module
  (`FIELD_TX`, `PATH_TX`); the RPM table is read only here (it comes from imports, ChatGPT or the OFP calibration). An
  unticked box of a field never filled stays empty (no invented `false`). Sheets are written without their working keys
  (`_rowId`…), so a save does not change every RPM row of every sheet for the record-by-record merge.
- **Checked at 375 px** in `frame/index.html` served on port 8793 (static server, local transport: the test sheets stay
  in the browser's cache, nothing reaches `data/`): fictitious sheet TEST_TP, 300 NM, track 090, FL200, wind 270/30 →
  block 1,416 kg as on the bench and the V2 page, least fuel FL250 and fastest FL140 as in `test/levels.html`; a tap on
  the drawing sets FL150; speed only → a range; CSV pasted → new sheet previewed then written; a field edited →
  one line previewed. No horizontal scroll. Then on a wide screen: the first three blocks side by side.
- **Lot 4a, the sheets in pure code** (`modules/fuel/sheets.js`, 1,758 lines): 66 declarations of V2
  `flight_planner.js` copied verbatim by an extraction script (a small JavaScript lexer: strings, templates and their
  nested expressions, comments, regex literals) — CSV (simple and enriched), RPM tables, JSON, `.lnmperf` read and
  written, SimBrief OFP sheet and calibration, EUROCONTROL proposals, SimBrief type sheet, gaps filled, merge (dates,
  differences, choices, sources), ChatGPT prompts and replies. Only the V2 globals were replaced by the module's
  environment: `AIRCRAFT_PERF`, `AIRCRAFT_DB` and `AircraftCatalog` read through `aerodb.aircraft()` (perf, record,
  related, classify), `state.profiles` and `active` given by the module, texts and language by `ctx`, the prompts by
  `modules/fuel/perf_prompt.js` (now also written by `tools/build_perf_prompt.py`, so both copies stay identical).
- **Out of the module**: sheets of aircraft known only from the Landing dashboard (`_landingOnly`) belong to the
  landing module; their origin text has no estimate here.
- **Bench of the sheets** (`modules/fuel/test/sheets.html`): the same inputs passed to the V2 functions on the V2 page
  (`.lnmperf` written and read back, enriched CSV, a messy ChatGPT reply, two sheets compared, gaps filled, a sheet's
  date, its values flattened, missing fields), results kept in `sheets_v2.json` (random ids, dates and the `.lnmperf`
  creation date left out): 9/9.
- **V2 defect kept, to fix with its own test**: a ChatGPT value "2,400" (thousands separator) is read as 2.4; the copy
  keeps the V2 behaviour so the bench proves the extraction; the fix (a comma followed by exactly three digits is a
  thousands separator) comes as a separate lot.
- **Lot 2 split**: 2a (this commit) = the pure model, its bench and the module documents, independent of the frame;
  2b = the module skeleton on the frame's loader (`mount(el, ctx)` / `unmount`) with the quote screen, once the frame
  pushes its lot 3.

## 22 October 2026 — display units for speed, altitude and distance (decided by the user and the ergonomics session)

- **What**: next to "kg / lb" in the Plan screen's settings fold, three more display units: speed kt / km/h, altitude
  ft / m, distance NM / km / SM (1 kt = 1.852 km/h, 1 ft = 0.3048 m, 1 NM = 1.852 km = 1.150779 SM). Settings
  `displaySpeed`, `displayAlt`, `displayDist` live in `pilot/<trigram>/fuel.json` beside `displayUnit` and are saved by
  `saveSettings()`; defaults kt, ft, NM. Four selects on one grid row (`fu-grid3`, wraps at 390 px, no new CSS).
- **Invariant 3 kept and widened**: the model (`FuelModel`, `FuelLevels`), the current flight, `fuel.json` entries and the
  sheets stay in kt, ft, NM, ft/min and the sheet's fuel unit; conversion is the screen's, both ways. The pure
  arithmetic is `FuelModel.convertSpeed / convertAlt / convertDist` next to `convertFuel` (same behaviour: a value is
  returned unchanged when the units are equal, absent or unknown, or when it is not finite), benched in
  `test/quote.html` (conversions, exact round trips kt → km/h → kt, NM → SM → NM, ft → m → ft, km → SM → km).
  The screen has one set of helpers per quantity (`speedTxt`, `altTxt`, `distTxt`, `vsTxt` and their `Num`, `Field`,
  `Parse`, `Label` counterparts); the helper reads the setting at each call, so a label and its number cannot disagree.
- **Flight levels are kept** (FL120 = hundreds of feet, whatever the altitude unit): the level field, the decision chart's
  axis, legend, buttons and "Above FLxxx" message, the sticky result and the climb drawing's target label. The altitude
  unit applies where an altitude is a value: the climb table's altitude column, the vertical rate (ft/min, m/min), the
  level in metres in brackets next to the FL in the sticky result when the unit is not ft.
- **Rounding**: displayed values are rounded to the whole number (as before for NM, kt and ft/min); a typed value is
  converted to the model unit and rounded to 0.01 of it when the unit differs (otherwise kept as typed, as before), so
  a whole number typed in the displayed unit comes back unchanged: 100 km → 54 NM → 100 km. Proven for every whole
  number 1 to 5,000 km and SM, 1 to 1,500 km/h and 1 to 20,000 m in the bench, and on the screen (390 and 1280 px).
  A typed value is never "corrected" to a nicer NM figure: 56 km/h is stored as 30.24 kt, not 30.
- **Inventory of the Plan screen** (`grep "NM\|kt\b\|ft\b\|km"`, 73 lines): converted or labelled by the helpers —
  the distance field label and value, the wind speed field, the manual IAS and rate fields (label and parse), the top of
  descent in the sticky result, the distance column of the quote details, the climb table's IAS, rate and altitude
  columns (headers carry the unit), the climb drawing's IAS labels, the "rate under 20 ft/min" message. Kept: the
  FL texts above; fuel flow `kg/h` (a fuel unit, entry kept in kg/h as in the sheet); the fuel and time axes of the
  decision chart; the sheet editor and the preview of changes (Sheets screen: the sheet's own stored fields in
  kt, ft, NM, with the field labels of V2); `ft: null` and similar code identifiers. The ceiling is not shown as a value
  anywhere on the Plan screen, so nothing to convert.
- **Judgement calls**: the vertical speed follows the altitude unit (m/min, the unit that goes with metres on a climb
  table; m/s would hide the sub-metre values); the climb table's altitude column stays flight levels while the unit is
  ft (today's display, and flight levels are the rule) and shows metres otherwise; the fuel select's label "Unité
  affichée" became "Carburant" under a "Unités affichées" heading, as four selects need one heading rather than one
  label on the first of them; no helper for typed altitudes (the level is typed as FL, nothing else is).
- **Bug caught on the way**: a field changed and still focused fires its `change` while the unit select redraws the
  screen, which would have read its text in the new unit (100 km read as 100 SM); the unit change first validates the
  active field in the old unit.
- **Help chapter**: no V3 user manual for fuel exists yet (the help block `frame/help/` is not started); the module's
  SPEC § 9 carries the rule.
