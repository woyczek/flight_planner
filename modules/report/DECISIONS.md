# report — decisions

Memory of the V3 report module: every choice, dated, with its reason. Chat history is never needed.

- **23 Oct 2026 — the report's times in UTC** (Simplification's decision, points 1 to 5): a new report carries
  `timeline.tz = 'Z'`, its times in UTC and its day in UTC (`todayZ`); the time fields say "(Z)". A report without
  the marker (V2, older V3) is converted in memory (`toZ`: the report's date as the day, the device's time zone with
  summer time), shown with "entered 18:30 local" under each field, and rewritten in UTC with the marker only when
  saved; nothing migrated in bulk. Its date is never moved, even when the first time falls the day before in UTC: the
  date is part of the V2 registry key and the bridge would add a duplicate. The marker is not in `emptyMission`
  (`fillDefaults` would put it on an old report before its conversion). Imports in UTC: the started flight
  (`hhmmZ(started.at)`), the network (`T.apply(…, { tz: 'UTC', today: todayZ() })`). The bridge copies `tz` as is
  (checked in `tools/report_bridge.py`); the site gets the values without conversion (website SPEC § 5). Checked on
  8804: CRF-A01-0 (18:30, no marker) shown "16:30" (Z) with "entered 18:30 local", the stored record unchanged; a
  new report taking the started flight gets 17:14, the UTC time of the start.
- **23 Oct 2026 — times shown in UTC** (suite rule, `frame/lib/time.js`, frame lot 22): the started-flight card says
  "Flight started at 16:59Z (18:59)" (engine start: UTC and the device's time), the network flights and the
  restored draft "23/10/2026 16:57Z" (`fmtDateZ`). The report's time fields (`timeline.*`, `type=time`) keep their
  values in the device's time, like the V2 reports already saved: turning them to UTC changes the data, a decision
  asked to Simplification.
- **23 Oct 2026 — the Mission step is "to check" until seen** (end-to-end pass, Simplification's go): a new report
  takes the family of the last report (`PREFS`) and its first series, so "2 Mission ✓" showed on a report whose
  Mission step was never opened, and a family nobody chose went to the log. Now `S.missionSeen`: false for a new
  report (button, mount without a draft, a module's handoff), true for a report reopened, set by opening the step,
  by a field of the step or the family, and when the step is on screen (wide module: every step shown); kept in the
  draft (a draft from before counts as seen). Unseen: the step says "to check" (`data-todo`) instead of ✓, and the
  Result step lists "mission (family and series taken by default, not seen yet)". Saving stays possible. The family
  stays the last report's (no empty family: the families' fields depend on it). Checked on 8804 at 375 and 1280 px.
- **23 Oct 2026 — "Copy the fields" on a tablet over http**: through `copyText` (`frame/lib/clipboard.js`);
  as a last resort the line is shown selected under the button with "copy it". Checked on 8804 without
  `navigator.clipboard`: copied by `execCommand`.
- **23 Oct 2026 — `keepScroll` from the frame** (frame lot 17, `frame/lib/dom.js`): the module's copy is gone;
  the frame's helper also gives back the field being typed (frame INTEGRATION § 6).
- **23 Oct 2026 — ending a flight keeps the real position**: the report's write of the current flight goes through
  `frame/lib/current_flight.js` `merge` (`started` null, fuel's progress keys cleared); `progress.actual` belongs to
  the frame and stays.
- **23 Oct 2026 — renders keep the scroll** (user's bug seen in fuel): `render()` draws through `keepScroll`, so a
  family or series change or a source taken up no longer moves the page; a step change still goes to the top on
  purpose. Checked on 8804 at 375 px: family changed at 600 px, the page stayed at 600.
- **23 Oct 2026 — the report ends a started flight** (user's rectification of fuel's lot H): there is no "End the
  flight" in fuel any more, so the shutdown is no longer taken from it (0a5a994d4 undone). Saving the report that used
  the started flight ("Use" on the card) sets `started` and `progress` to null in the current flight, by report,
  only if `started.at` is still the one used — a flight started again meanwhile is left alone.
- **23 Oct 2026 — what the current flight brings** (arbitrations 14 and 15 of the end-to-end pass): the card lists
  everything taken in one line — the HEMS family has no distance or level field, so the pilot did not see them taken;
  engine start comes from fuel's `started.at`, fuel at start from fuel's new `quote.block`, each with its own source
  badge (`fill(values, source, by)`). The level is written with the suite's `formatLevel` (FL060 / 3 500 ft). Checked
  on 8801: card "F-HAND · SAMU · EC45 · LFRS → LFML · alternate LFMT · 374 NM · FL060 · block fuel 616 kg"; "Use"
  gave 13:21 "Flight started (fuel)" and 616 "Fuel quote".
- **23 Oct 2026 — the started flight first** (ergonomics session, after fuel's lot G): the "current flight" card
  shows "Flight started at hh:mm" when fuel's `started` is set, above the last network flight (the card already came
  first); "Use" remembers `started.at`, and saving the report keeps it in `cache/report/started.json`, so the
  card is not offered again for that departure (a report saved without using it does not count). Checked on 8801
  with the TST flight: card titled "Flight started at 11:42" first; with that `at` in `started.json`, no card. The
  save path that writes `started.json` was not run end to end (a full report needed); it runs after the report is
  written and the draft removed.
- **23 Oct 2026 — wide layout by the module's width** (asked by the design session after the dual view, 1b281c1d8:
  each pane is a container): `@media (min-width: 980px)` became `@container (min-width: 900px)` — read on the
  window, the steps bar was hidden with the three steps stacked in a 506 px pane. Checked at 1280 px: full screen (1,023 px): the three steps side by side, no steps bar; dual view (506 px): the steps bar and one step.
- **23 Oct 2026 — the current flight's callsign**: fuel now writes `aircraft = { sheetId, type, registration, callsign,
  name, source }` (aerodb's `aircraftOf`); the "current flight" card shows and fills the callsign too.
- **23 Oct 2026 — design lot 2 primitives** (asked by the design session): save bar, steps, grids, columns, warnings, sources, prefill cards and lists moved to `f-bar` (no own shadow, hidden in print), `f-steps` with `data-done`, `f-grid` / `f-full`, `f-cols`, `f-warn`, `f-badge data-kind=accent`, `f-card f-accent`, `f-list` / `f-item`; the "→ Vol" bookmark is an `a.f-btn` (44 px); title and summary rules left to the frame. The module's own `<style>`
  only places things now; checked at 375 px and on a screen in standard, cabinet and field, day and night (no white
  at night, square corners in cabinet and field, no target under 44 px).
- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel), at the ergonomics session's request after
  the user's "go": worktree `E:\DEFA-v3-report`, local branch `v3-report` from `origin/v3` (54ecf0026). Port 8791 was
  found taken by another session's fake GitHub server; the reading was done on 8801.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from the V2 code (`shared/mission_core/*`,
  `apps/cr/*`) and the V2 HEMS page: shortest path today 5 clicks to a report saved in the browser (plus a folder or
  GitHub set up beforehand), 8 with the website; target 3 taps to a saved report, 4 with the website, nothing
  required.
- **23 Oct 2026 — settled by the ergonomics session** (answers to the five proposals below):
  1. One JSON record per report, `cr/reports/<year>/<id>.json`, merge `record`: the truth of V3. The bridge to
     `cr/missions.yaml` (V2, CPCO) belongs to the frame session, launcher side (records replayed by V2's registry
     merge at every batch and exchange). The module never touches `missions.yaml`; SPEC § 4 gives the record field by
     field with its V2 correspondence.
  2. The family is a prefilled field; no chooser page.
  3. No keyed web-service send.
  4. The website hand-off becomes a website-module function; until then the V2 hand-off, as is, behind one button
     "Save and record on the website" (lot 3).
  5. Frame: another module's cache read with `data.get`, read only, path declared in `meta.reads`; METAR through
     `ctx.net` (source to propose: aviationweather.gov); no direct call between modules: a module hands over by the
     address (`#report?from=flightlog`) and a hand-over record `pilot/handoff.json` (record, cache) read at mount.
- **23 Oct 2026 — lot 2, the skeleton on the frame, HEMS**:
  - **Record = V2 entry + `schema`, `updated_at`, `by`**, so the bridge translates nothing; `schema: 'sog-report/1'`.
    V2 has no per-mission date; `updated_at` is V3's and dropped by the bridge.
  - **V2 code copied, not rewritten**: `vocab.js` (lists, `crId`), `model.js` (`emptyMission`, paths, durations,
    statistics, checks), `families/hems.js` (series, roles, blocks) extracted from `shared/mission_core/` by a script
    (lines cut, two spaces removed), as ES modules with explicit exports. HEMS statistics, summary and old-format
    converters stay in V2 (reporting).
  - **Numbers**: V2 `crId` over the numbers of `cr/reports/` (file names) and of `cr/missions.yaml` (`missionId`
    entries read from the text), so a V3 report never takes a V2 number.
  - **Path year** = the year of the report's date at its first save; it never moves afterwards (the record would
    otherwise exist twice).
  - **Short fields first** (V2 levels 1-2) in Flight and Result; the family's blocks in Mission, the first open.
  - **Current flight** read from `pilot/<trigram>/current_flight.json` (fuel / maps) as the first prefill, empty fields
    only, source shown per field: the only prefill of this lot (no network); IVAO, VATSIM, SimBrief and paste come
    with lot 3.
  - **Draft** in `cache/report/draft.json` (cache policy), restored with a notice; a pending draft write still leaves
    after unmount.
  - Checked in `frame/index.html` served on 8801 (static server, local transport: nothing reaches `data/`): at 375 px,
    no horizontal scroll; the current flight written by fuel (EC45, LFBO → LFBZ) filled three fields with their
    source; HEMS service, patients and a destination; save → `cr/reports/2026/CRM-A01-0.json` with schema, statistics
    (75 min flight) and the HEMS data; a second report → `CRM-A02-0`; a draft restored after a reload; three columns
    on a wide screen.
- **23 Oct 2026 — lot 3a, prefill** (3b, the website button, waits for the site address: frame `ctx.airline` asked):
  - **V2 copied again, globals replaced**: `fpl.js` and `text_import.js` extracted by script; `fetch` became
    `ENV.getJson` (the module passes `ctx.net`), `window.MissionAircraft` an environment (aerodb `record` for the model
    and rotary wing; no local "known aircraft" registry), `window.MissionAssist.routePoints` copied in. `model.js`
    gained V2's callsign and registration helpers.
  - **"Last flight" ported from the launcher** (`last_flight.js`, from `tools/launch.py`): the launcher answered
    `/__setup/<net>/last-flight`; V3 calls the networks through `ctx.net` (the launcher relays IVAO with its key and
    VATSIM), with the same grouping of sessions cut by disconnections and the same "(FPL-…)" text read by
    `text_import.js`. No cache of tracks beyond one reading; the list is kept two minutes on the device.
  - **One proposal at mount**, IVAO first then VATSIM, only when online and identified, silent on failure: the "Use"
    card is the 3-tap path's second tap.
  - **Time zone**: the device's, not the aerodrome's (aerodb has none yet): to revisit when it has.
  - **Hand-over record read at every mount**, not only with `?from=` in the address: the frame's router takes the
    whole hash as the module id, so `#report?from=x` opens the first module (reported to the frame); the record is
    removed once taken, so reading it each time is harmless.
  - **V2 notes kept in French** (`text_import.js` notes such as "trace : n points…"): copied unchanged; translating
    them is a V2 change for later.
  - Checked on 8801: a pasted FPL filled 16 fields (registration F-ZBQU from REG/, callsign, type, route); a fictitious
    IVAO service behind `ctx.net` (session, plan, seven track points) gave the proposal card, then 25 fields (times
    from the track, distance); the real IVAO API without key answered 401 → message and paste box; a hand-over record
    filled two fields "Taken from Mes vols" and was removed; 375 px without horizontal scroll.
- **23 Oct 2026 — lot 3b, the website hand-off** (settled: option (a), `ctx.airline = { name, site, pages }` from the
  data repository's `airline/settings.json`, asked of the frame's lot 6):
  - `website_handoff.js`: V2's `defaFields` / `defaUrl` / copy line rewritten as functions of the mission and the
    airline setting, and the "→ Vol" bookmark (`defaFlightFill`) copied verbatim by script; the whole file moves to
    the website module when it exists.
  - One button **Save and record on the website**: the tab is opened first, inside the click (popup rules), then the
    report is saved; greyed with "website address not set" without the setting. The V2 hand-off before saving asked
    "unsaved changes?"; here saving is part of the gesture, so no question.
  - The bookmark and "Copy the fields" sit in a folded block of the Result step (rarely needed once the bookmark is
    installed; on a phone the copy line is the fallback).
  - Ergonomics feedback on lot 2 applied: "My last reports" moved from the top of the screen to a folded one-line-per-
    report list at the end of the Flight step.
  - Checked on 8801 (the frame gives no `ctx.airline` yet): button greyed with its reason; with a test setting
    (`site.example.test`) the functions give the form address with the fragment, whose JSON reads back (end date-time
    on the next day for a 23:30 → 00:40 flight, block 01:10); the bookmark compiles.
- **23 Oct 2026 — lot 4, all families**: the sixteen V2 families extracted by script (`families/*.js`): the file's
  lists and helpers, then the `registerFamily` object copied as is, its `stats`, `summary` and `legacy` properties
  removed (V2 reporting and CPCO; they were the only users of `MissionStats` and of most `MissionModel` helpers);
  `window.MissionVocab` / `window.MissionModel` became imports. `model.js` gained V2's `context` and `blockVisible`,
  `vocab.js` the `capabilityGroups` (ISR sensors). DEMO is not carried (V2 demonstration).
  - `when` conditions honoured on blocks and fields with V2's context; a series change redraws the Mission step
    (SPECIAL shows VIP, ferry, test or training blocks by series group).
  - The common "Task / mission order" block (V2 level 1 unless `ownOrder`) is a folded block of the Mission step.
  - A new report takes the family of my last saved report (`cache/report/prefs.json`), as V2's "continue with".
  - Numbers from a family's collections are read as numbers (field found through the collection's definition).
  - Checked on 8801: sixteen families listed; SPECIAL VIP → "VIP / government transport", ferry → "Ferry flight";
    FIRE without the common order block (its own "Flight order"); SAR with its six blocks; 375 px without horizontal
    scroll with every block open; a FIRE report saved as `CRF-A01-0`, the next new report opened in FIRE.
- **23 Oct 2026 — `last_flight.js` moved to `frame/lib/`** (ergonomics session's rule: a module never imports from
  another module; shared pure code lives in `frame/lib/<name>.js`, listed in `frame/SPEC.md` with its owner). Report
  stays its owner; flightlog imports it from there; `meta.files` lists `../../frame/lib/last_flight.js`.
- **23 Oct 2026 — hand-over `{ open }`, `{ fresh, family }`** (for flightlog, done in flightlog's lot 2): reopening
  a report and starting a new one from a past flight without mixing it into a draft in progress; the flight's date
  replaces the new report's default date (V2 `setDate`).
- **23 Oct 2026 — `website_handoff.js` moved to `frame/lib/website.js`** (owner website, ergonomics decision):
  self-contained (its own `minutes`, `between` and block / flight durations instead of report's `model.js`), report
  imports it from there; `meta.files` updated.
- **Proposed, settled above** (lot 1):
  1. One JSON record per report, `cr/reports/<year>/<reportId>.json`, merge `record`, rather than the shared
     `cr/missions.yaml` (text for the data layer: no record-by-record merge). Joins the pending "reports per year"
     split of the V2 registry. Needs a bridge for V2 and CPCO, which read `cr/missions.yaml`.
  2. The family chooser page disappears: the family is a prefilled field of the Mission step.
  3. The bearer-key web-service send is dropped from the module (no token in a module).
  4. The website hand-off is one call of the website module, made inside the click; the V2 hand-off is carried as is
     until that module exists.
  5. Asked of the frame: reading another module's cache file (`cache/fuel/last_ofp.json`), METAR through `ctx.net`
     (optional), a way for one module to call another's function (the hand-off).
