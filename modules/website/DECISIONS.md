# website — decisions

Memory of the V3 website module: every choice, dated, with its reason. Chat history is never needed.

- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel, report, flightlog), at the ergonomics
  session's request: worktree `E:\DEFA-v3-website`, local branch `v3-website` from `origin/v3` (fe9820ea8). Port 8792
  was found in use; trials on 8803.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from the V2 code that touches the site; no saved page
  was read for this lot.
- **Proposed, to settle before lot 2**:
  1. `airline/settings.json` `{ name, site, pages: { recordFlight, log, fleet, aircraft } }` edited in the module's
     settings screen (workstation), the frame exposing it as `ctx.airline`.
  2. The pasted log keeps only my trigram's rows in `pilot/<tri>/site_log.json`; the airline-wide aggregate
     (`defa_reference.js`) stays V2's for now.
  3. `airline/fleet.json` from the pasted fleet page, V2's merge rules.
  4. `website_handoff.js` moves to `frame/lib/website.js` (owner website); report imports it from there.
  5. No browser download of the site's pages (another origin); the launcher relay (`/__setup/net`) would need the site
     added to its list — not asked now: paste is enough and the daily V2 download stays on the launcher.
