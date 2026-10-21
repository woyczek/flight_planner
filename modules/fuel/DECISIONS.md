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
