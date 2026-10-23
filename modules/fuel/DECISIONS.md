# fuel — decisions log

The memory of the V3 fuel module: every choice, dated, with its reason. Never rely on chat history.

## 22 October 2026 — reading (lot 1) and lot 2a

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
