# flightlog — decisions

Memory of the V3 flightlog module: every choice, dated, with its reason. Chat history is never needed.

- **28 Oct 2026 — the `h1` follows `ctx.titled`** (frame lot 25, INTEGRATION § 6): while the phone's header carries
  the module's title (`ctx.titled`), the module's `h1` gets `f-sr` (screen readers only), toggled again on every
  `frame-titled` event; the listener goes at unmount. Checked on 8804 at 375 px.
- **28 Oct 2026 — status lines published for the frame** (frame lot 25, INTEGRATION § 10.0; Simplification): the module
  writes `cache/flightlog/status.json` = `{ schema: 1, lines: [{ text ×4, go: '#report?from=flightlog', news: true,
  handoff: { to: 'report', family, values } }] }` instead of `pending.json`: the frame shows ready lines and writes the
  hand-over as given, it no longer reads flightlog's schema. Texts: the frame's own wording ×4, the day in the
  language's writing and the time in UTC when known (report, network session: `whenZ`); a website-log flight keeps its
  day without conversion (the site's convention). Same selection as before (`pendingFlights`: without a report, 30
  days, 5, newest first); `pending()` keeps its output (bench unchanged). `pending.json` is removed once by the module
  (cache, this device), so the frame's fallback reading of it (§ 10.1, debt) has nothing left to read. Bench
  `test/pending.html` 14 checks (5 new); journey J4 reads `status.json` and checks that `pending.json` is gone.
- **24 Oct 2026 — the flights without a report published for the frame's "i" button** (user, 24 Oct afternoon, item
  "6 : bouton « i »": the status line gives way to an "i" button of the header whose pop-up lists "report to write" lines;
  the pending report comes from a small cache record published by flightlog — relay cloud lot): `cache/flightlog/pending.json`
  (INTEGRATION § 5, schema verbatim from the brief).
  - **Rule "without a report"**: the module's own — a flight whose best row after the merge is not a report (website
    log or network session). It is now one exported predicate, `lacksReport`, used by the "Without report" filter, the
    tile and `pending`; `pending` is `filter({ days: 30, noReport: true })`, sorted, cut to 5, mapped to the record.
    The module has no separate "to write" list, so nothing else to unify.
  - **Judgement calls**: (1) a network session still open (flight under way on IVAO / VATSIM) counts, as it does in the
    module's list and tile, "in progress" included; (2) the started flight not yet reported (fuel's `current_flight`)
    is not in the record: the frame has its own "started flight" line; (3) the date is the flight's own (local date for a
    network session, as in the list); (4) write only when `flights` differs from the last record (`updated_at` out of the
    comparison; writes queued in a promise chain so two refreshes cannot both think the record is stale); (5) at the first
    mount with an IVAO / VATSIM id the first (reports + log) stage does not publish, the network stage does, to avoid a
    record that loses then regains network flights; (6) bench `test/pending.html` added although the module had none,
    because the function is pure and the lot asked for it.
  - **Schema 2, `handoff` in each entry** (relay cloud's decision, same day, on the open point below: keep the handoff
    mechanism rather than teach report a query): each entry carries `handoff` = `{ family, values }`, what "Write the
    report" hands to report, built by one function (`handoffOf`, used by the action and by `pending`). The brief spoke of
    `values`; `family` is added because the action also sends it (report starts the new report in that family), so the
    frame writes `{ to, from, source, at, fresh: true, family, values }` and the result equals the module's own gesture.
    The record carries no times because the action fills none.
  - **Report reads no query key** (`ctx.query` unused in `modules/report/module.js`; only `pilot/handoff.json`): the
    frame's `#report?from=flightlog&date=…&dep=…&arr=…` would open report unchanged; hence the `handoff` above (INTEGRATION
    § 5). Report is not changed.
  - Checked on 8816 (Chromium 1194, 390 × 844, flights, reports and an IVAO session seeded through `FrameData`): three
    website flights (one covered by a report, one older than 30 days) and an IVAO session → record with the website
    flight, the IVAO session and the second website flight, newest first; a remount without change leaves `updated_at`
    untouched; saving the report of the newest flight shrinks the record to two lines; no `pageerror`, no horizontal
    scroll. Schema 2: the first entry's `handoff` equals, field for field, the `pilot/handoff.json` the "Write the report" button
    wrote (read back before report took it). Bench `test/pending.html`: 9 checks pass (handoff of two sample flights included).
- **23 Oct 2026 — a flight's time shown in UTC** (report's times in UTC, report INTEGRATION § 3 bis): the detail
  shows `whenZ` — a report marked `timeline.tz = 'Z'` as it is ("2026-10-23 17:14Z"), an older one converted from
  the device's time ("18:30" → "16:30Z"), the flight plan's `metadata.timeUtc` with Z, a network session from its
  instant in UTC, a line of the site's log as the site wrote it. The rows' own `date` / `time` (sorting, the
  network sessions matched by date and callsign) are unchanged.
- **23 Oct 2026 — times shown in UTC** (suite rule, `frame/lib/time.js`, frame lot 22): "In progress — started at
  16:59Z (18:59)" (engine start: UTC and the device's time). The flights' own times come from the reports and the
  site's log as written there.
- **23 Oct 2026 — filters kept from the last visit are said; "—" explained** (end-to-end pass, Simplification's
  decision (d)): the filters stay on the device (`cache/flightlog/view.json`), and a visit opened on "1 year · LFRS"
  showed one flight with nothing saying why. When the stored filters differ from the defaults (1 year, no search,
  all flights), a chip "1 year · LFRS ✕" (44 px, label "Filters from the last visit: … — remove them") brings the
  defaults back; touching a filter in the visit removes the chip. A report without times shows "—" with the
  tooltip "Report without times". Checked on 8804.
- **23 Oct 2026 — a report with only its engine start keeps its time** (end-to-end pass): the report of a started
  flight (fuel's start → report's "Use") has `timeline.engineStart` and no off-block nor take-off yet, and the
  detail said "Time 2026-10-23" with no time. The time is now off-block, else take-off, else engine start (added
  last: rows that had a time keep it). Checked on 8804: "2026-10-23 18:30".
- **23 Oct 2026 — `keepScroll` from the frame** (frame lot 17, `frame/lib/dom.js`): the module's copy and its own
  focus restoring are gone; the frame's helper keeps the scroll and the field being typed, caret included
  (frame INTEGRATION § 6). Checked on 8804: "LFRS" typed in the search, one render per key, focus and caret kept.
- **23 Oct 2026 — renders keep the scroll** (user's bug seen in fuel): the list is redrawn at every reading of the
  reports, the site's log and the network; `render()` now keeps the scroll (`keepScroll`) and gives the focus back
  without scrolling.
- **23 Oct 2026 — the flight in progress** (arbitration 16 of the end-to-end pass): a flight started in fuel and not
  yet reported shows on top, before the site's log knows it. Its "Write the report" opens report rather than a
  handoff with values: report's "current flight" card offers it first and, through its own "Use", marks it done
  when the report is saved — a handoff would have filled the fields without that mark, and the card would have come
  back. Checked on 8802: card "In progress — started at 13:22 (diverted) · SAMU · EC45 F-HAND · LFRS → LFML"
  (button 46 px, no horizontal scroll at 375 px); with that `at` in `cache/report/started.json`, no card; the button
  led to report with "Flight started at 13:22" first.
- **23 Oct 2026 — wide layout by the module's width** (asked by the design session after the dual view, 1b281c1d8:
  each pane is a container): `@media (min-width: 980px)` became `@container (min-width: 900px)` — read on the
  window, the six columns of the list were squeezed into a 506 px pane. Checked at 1280 px: full screen: six columns; dual view (506 px): the three-column phone row.
- **23 Oct 2026 — design lot 2 primitives** (asked by the design session): tiles, tools, list rows and the no-report dot moved to `f-tiles`, `f-tools`, `f-list` / `f-item` (a row is a button, its details an `f-card` under it), `f-dot data-kind=warn`, `f-dl`, `f-num`; the summary rule left to the frame. The module's own `<style>`
  only places things now; checked at 375 px and on a screen in standard, cabinet and field, day and night (no white
  at night, square corners in cabinet and field, no target under 44 px).
- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel and V3 report), at the ergonomics session's
  request: worktree `E:\DEFA-v3-flightlog`, local branch `v3-flightlog` from `origin/v3` (80c416012). Port 8795 was
  found in use; trials on 8802.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from `apps/pilot/mes_vols.html` and
  `shared/my_flights.js`.
- **23 Oct 2026 — settled by the ergonomics session**: (1) read `cr/reports/**.json` and `cr/missions.yaml` (text)
  filtered on my trigram until the bridge has replayed everything; report > log > network. (2) Website log:
  `pilot/<tri>/site_log.json` (record, one entry per log line), written by website, read by flightlog; schema in SPEC
  § 3. (3) A module never imports from another: shared pure code in `frame/lib/<name>.js`, listed in `frame/SPEC.md`
  with its owner; `last_flight.js` moved there (commit 374d841c3). (4) `{ open }` in the hand-over to report, done in
  this lot (flightlog's session also holds report).
- **23 Oct 2026 — lot 2, the module on the frame**:
  - `model.js` ported from V2 (`keyOf`, the 'cr' and 'log' rows of `my_flights.js`, the merge of `collect`, the page's
    filter, totals and CSV, `defa_log.js`'s `familyOf`), plus the network row and the hand-over values.
  - **V2 registry read with js-yaml**, copied into `frame/lib/js-yaml.min.js` (same 4.1.0 file as V2's vendor, MIT;
    owner flightlog), imported only when `cr/missions.yaml` exists; an unreadable registry is skipped.
  - **Network ties**: a network session has no registration, so it is also covered by a better row of the same date
    and callsign. **Block time**: a kept row without one takes it from the row it covers (a report without times over a
    log line).
  - **Hand-over**: "Write the report" sends `fresh: true` and the proposed family, so report starts a new report (not
    the draft in progress) and the flight's date replaces today's; "Open the report" sends `open` with the record path.
    A V2 registry report has no V3 path: its details say to open it in the full suite.
  - Network sessions read at mount (two minutes on the device), "Read IVAO / VATSIM again" in More says refusals.
  - Checked on 8802 (static server, local transport; fictitious data in the browser's cache only: a V2 registry with a
    FIRE report, a website log of two lines, a fake IVAO service behind `ctx.net`): three rows — the IVAO session, the
    log line, the V2 report covering its log line (report won, block 2:30); tiles 3 / 4:40 / 1 then 2; "Write the
    report" opened report in HEMS (from "EVASAN") with the flight's date, registration and callsign "Taken from My
    flights"; saved as CRM-A01-0, the row then showed it with the log's block time 1:10; "Open the report" reopened
    it; CSV checked; 375 px without horizontal scroll; a table-like row on a wide screen.
- **Proposed, settled above** (lot 1):
  1. Reports read from both `cr/reports/` (V3) and `cr/missions.yaml` (V2, until the bridge has replayed everything),
     deduplicated by the flight key.
  2. The website log is kept by the website module in the data repository (`website/flight_log.json`, keyed per row,
     airline-wide), flightlog only reads it; until the website module exists, flightlog shows reports and network
     flights.
  3. Network sessions are shown, never stored as flights; reuse report's `last_flight.js` (moved to a shared place,
     or imported from `modules/report/`, to agree with the frame's rule on cross-module files).
  4. "Open the report" needs report to accept `{ to: 'report', open: '<record path>' }` in the hand-over record.
