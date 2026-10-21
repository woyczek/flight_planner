# fuel — decisions log

The memory of the V3 fuel module: every choice, dated, with its reason. Never rely on chat history.

## 22 October 2026 — reading (lot 1) and lot 2a

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
- **Lot 2 split**: 2a (this commit) = the pure model, its bench and the module documents, independent of the frame;
  2b = the module skeleton on the frame's loader (`mount(el, ctx)` / `unmount`) with the quote screen, once the frame
  pushes its lot 3.
