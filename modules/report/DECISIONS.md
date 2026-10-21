# report — decisions

Memory of the V3 report module: every choice, dated, with its reason. Chat history is never needed.

- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel), at the ergonomics session's request after
  the user's "go": worktree `E:\DEFA-v3-report`, local branch `v3-report` from `origin/v3` (54ecf0026). Port 8791 was
  found taken by another session's fake GitHub server; the reading was done on 8801.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from the V2 code (`shared/mission_core/*`,
  `apps/cr/*`) and the V2 HEMS page: shortest path today 5 clicks to a report saved in the browser (plus a folder or
  GitHub set up beforehand), 8 with the website; target 3 taps to a saved report, 4 with the website, nothing
  required.
- **Proposed, to settle before lot 2** (with the ergonomics session):
  1. One JSON record per report, `cr/reports/<year>/<reportId>.json`, merge `record`, rather than the shared
     `cr/missions.yaml` (text for the data layer: no record-by-record merge). Joins the pending "reports per year"
     split of the V2 registry. Needs a bridge for V2 and CPCO, which read `cr/missions.yaml`.
  2. The family chooser page disappears: the family is a prefilled field of the Mission step.
  3. The bearer-key web-service send is dropped from the module (no token in a module).
  4. The website hand-off is one call of the website module, made inside the click; the V2 hand-off is carried as is
     until that module exists.
  5. Asked of the frame: reading another module's cache file (`cache/fuel/last_ofp.json`), METAR through `ctx.net`
     (optional), a way for one module to call another's function (the hand-off).
