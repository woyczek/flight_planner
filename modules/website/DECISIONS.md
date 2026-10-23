# website — decisions

Memory of the V3 website module: every choice, dated, with its reason. Chat history is never needed.

- **23 Oct 2026 — the airline arriving after the mount** (frame lot 24, event `frame-airline`): the module reads
  `airline/settings.json` again (`read`, already fetched by the frame) and redraws its cards, unless something is being
  typed in it. Bench (fake GitHub, cleared profile, new repository): the Airline card "not set" at 0.8 s, then the
  site and its pages at 3.2 s, without reloading.
- **23 Oct 2026 — times shown in UTC** (suite rule, `frame/lib/time.js`, frame lot 22): the update dates of the kept
  log and fleet ("Kept: … updated 23/10/2026 16:57Z", `fmtDateZ`).
- **23 Oct 2026 — "Paste from the clipboard" only when it can work**: without `navigator.clipboard.read` /
  `readText` (the app served over http to a tablet, frame lot 18) the button is not shown (`canPaste()`,
  `frame/lib/clipboard.js`); the paste box stays.
- **23 Oct 2026 — design lot 2 primitives** (asked by the design session): grids, columns, table, preview and terms list moved to `f-grid`, `f-cols`, `f-scroll` / `f-table`, `f-callout`, `f-dl`, the warning to `f-warn`; title sizes left to the frame. The module's own `<style>`
  only places things now; checked at 375 px and on a screen in standard, cabinet and field, day and night (no white
  at night, square corners in cabinet and field, no target under 44 px).
- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel, report, flightlog), at the ergonomics
  session's request: worktree `E:\DEFA-v3-website`, local branch `v3-website` from `origin/v3` (fe9820ea8). Port 8792
  was found in use; trials on 8803.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from the V2 code that touches the site; no saved page
  was read for this lot.
- **23 Oct 2026 — settled by the ergonomics session**: the five proposals accepted — the airline setting edited in
  the module (verb "Website", computer screen; no duplicate in Settings), only my rows in `site_log.json`, the airline
  fleet with V2's merge rules, `frame/lib/website.js` owned by website, paste in lot 2 and "Read from the launcher" in
  lot 3 (the relay accepting `ctx.airline.site`, to ask the frame then).
- **23 Oct 2026 — `website_handoff.js` → `frame/lib/website.js`** (commit 32c8ee833): self-contained (its own
  minutes, between and block / flight durations), report imports it.
- **23 Oct 2026 — lot 2, the module on the frame**:
  - `model.js`: V2's log parser (`defa_log.js` record and parse, HTML / tabs / CSV / JSON), fleet parser and merge
    (`data_admin.js`, same rules as `update_fleet.py`), `formatRegistration` copied (no import from report), log key
    (date, time, callsign, registration, trigram: fields the site may correct, such as the mission, stay out of it).
  - Pasting keeps the clipboard's HTML when there is some (the textarea shows the text): table cells and the aircraft
    link (`siteId`) survive; "Paste from the clipboard" reads HTML first, text otherwise; a refusal says to paste.
  - A preview always comes before a write; the log keeps rows absent from the page (the site pages its log).
  - The Airline card is a form at 980 px and wider, a list on a phone (redrawn when the width crosses it); paths get
    a leading "/", the site loses its final "/".
  - Checked on 8803 (local transport, fictitious pages): a pasted HTML log of two rows → "1 new, 1 of other pilots
    ignored", saved with registration F-HAND and site id 7; a pasted text fleet of two aircraft → operator spelling
    fixed, H145 D3 variant, F-RBAA / F-HAND; the Airline card saved `site.example.test` with normalised paths, the log
    and fleet cards then linked to their pages, and report's "Save and record on the website" became active; 375 px
    without horizontal scroll, the Airline card read only.
- **23 Oct 2026 — lot 3, "Read through the launcher"** (on the frame's lot 7: `ctx.net` relays `airline.site`, GET
  only): one button on the log and fleet cards when the page is set; the page's HTML goes to the paste path (same
  parsers, same preview). The frame cannot say in advance whether the site is reachable (without a launcher a direct
  call fails as "offline"), so the button is shown, and the first refusal while the device is online removes it for
  the session with "paste only"; a real offline keeps it. Checked on 8803: without a launcher the button disappeared
  with the message; with a relay simulated behind `ctx.net`, one GET of `/log_vols.php`, preview "1 new, 1 unchanged",
  saved.
- **Proposed, settled above** (lot 1):
  1. `airline/settings.json` `{ name, site, pages: { recordFlight, log, fleet, aircraft } }` edited in the module's
     settings screen (workstation), the frame exposing it as `ctx.airline`.
  2. The pasted log keeps only my trigram's rows in `pilot/<tri>/site_log.json`; the airline-wide aggregate
     (`defa_reference.js`) stays V2's for now.
  3. `airline/fleet.json` from the pasted fleet page, V2's merge rules.
  4. `website_handoff.js` moves to `frame/lib/website.js` (owner website); report imports it from there.
  5. No browser download of the site's pages (another origin); the launcher relay (`/__setup/net`) would need the site
     added to its list — not asked now: paste is enough and the daily V2 download stays on the launcher.
