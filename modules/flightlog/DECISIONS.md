# flightlog — decisions

Memory of the V3 flightlog module: every choice, dated, with its reason. Chat history is never needed.

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
