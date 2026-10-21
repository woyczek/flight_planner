# report — decisions

Memory of the V3 report module: every choice, dated, with its reason. Chat history is never needed.

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
