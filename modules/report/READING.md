# report — reading of the V2 mission report (lot 1)

*23 October 2026. What the V2 report does today (`shared/mission_core/*`, `apps/cr/*`, left untouched on develop),
what the Pilot application keeps, what moves elsewhere, and what the module needs. No code in this lot. Decisions:
[DECISIONS.md](DECISIONS.md).*

## 1. V2 today, path by path

| Path | What it does | Where |
|---|---|---|
| Family chooser | `apps/cr/mission_cr.html`: "my missions to report", 16 family tiles, "continue with" the last family, search | mission_cr.html, vocab.js |
| Write one report | `apps/cr/<FAM>/<fam>_cr.html`, an empty shell: `MissionCore.mount({ family })` builds everything (2,300 lines in one function) | core.js 536-2841 |
| Form | steps Flight (identification, aircraft, timeline, crew, fuel, network), Mission (tasking + family blocks), Result, Flight details (folded); at levels 1-2 only the short fields. **No field is required**: checks are warnings (date, times in order, fuel) | blocks.js 640-647, model.js 228-298 |
| Prefill | "New report from" a mission order, one of my flights (website log without report), a file; "Complete from" my last IVAO / VATSIM flight (launcher route, API key on the launcher), the filed flight plan (SimBrief, IVAO whazzup, VATSIM data, direct), a pasted FPL / tracker page / StatSim page / METAR, the "→ CR" bookmarklet. Imports fill empty fields only, with undo, "replace the n filled fields", and the source of each field | core.js 1984-2339, fpl.js, text_import.js |
| Automatic | weather now (Open-Meteo, METAR from VATSIM), airports from jsDelivr, next report id, IVAO / VATSIM ids, capabilities of the last mission of the series | assist.js, core.js 572-593, 2819 |
| Family blocks | a family module adds blocks in step 2, crew roles, events, statistics, a summary sentence, sensitive fields (public version) | families/*.js (HEMS 96-232, FIRE 56-160, SPECIAL 34-232) |
| Mission link | `missionNumber` → report id `CRM-016-1` (attempt), or `CR<letter>-A01-0` without a mission; `orderRef` from an order; link and planned vs flown time from the registry | vocab.js 353-396, core.js 1708-1740 |
| Save | one registry for every family, `data/cr/missions.yaml` (`schemaVersion 2`, `missions[]`, key `family|missionId|date`), under a lock: re-read, three-way merge per mission, IndexedDB and localStorage copies, then GitHub or an authorised folder; conflicts to `cr/_conflits/`. Without folder or GitHub the report stays in the browser | ledger.js 509-674 |
| After save | statistics, `reportedBy`, known aircraft, aircraft position for CPCO (`missions/aircraft_positions.json`); nothing sent | core.js 2371-2414 |
| Send | "Send report": POST to a configured web service with a bearer key; "Record the flight on the website ↗": `selection_appareil.php#defa=<base64 JSON>` (reg, type, callsign, fpl, number, date, block time, mission, dep, arr) and the "→ Vol" bookmarklet that fills `add_flight.php` and never submits; "Copy the fields" | core.js 413-521, 2445-2603 |
| Read the website | the site's flight log by paste / bookmarklet / saved page (`defaFlightLog:v1`), used for "my flights without report", aircraft, crews, statistics | defa_log.js |
| Reporting | per-family lists, KPIs, charts, table editing, exports; cross-family analysis; fleet, aircraft and crew sheets | reporting.js, global_reporting.js, stats.js, charts.js, grid_edit.js, sheets.js, flotte.* |

## 2. What goes where

- **Pilot application, module `report`**: the form (three steps, the short fields first), the prefill sources, the
  report id, the warnings, save, and the website hand-off. Families HEMS, FIRE, SPECIAL first, the others after.
- **SOG client** (later): "my missions to report" as a list (the module offers "report this mission" when an order is
  given to it); the family chooser page disappears: the family is a field of the Mission step, prefilled.
- **CPCO**: reporting, analysis, statistics, charts, table editing, fleet / aircraft / crew sheets, the mission
  generator hand-off (`?from=sia` through localStorage becomes an assignment read from the data layer), aircraft
  positions, the public version of sensitive families.
- **Other Pilot modules**: the website log read side → `website` and `flightlog`; live network tracking → `maps`.
- **Dropped from the module**: the bearer-key web-service send (no token in a module; the website transport will carry
  reports later), file import / export menus, the level-3 "Registre" menu, folder authorisation (the frame's data
  layer replaces it), its own IndexedDB / localStorage copies, automatic weather (environment is a level-3 detail; a
  METAR stays pasteable).

## 3. Clicks: today and target

- **Today, best case** (launcher with an IVAO key, profile set, one IVAO flight in 7 days): sidebar "Report" (1),
  family tile (2), "Prefill" (3), "My last IVAO flight" (4), "Add to ledger" (5) — and the report reaches the
  repository only if a folder or GitHub was set up beforehand. The website: "Send" (6), "Record the flight on the
  website" (7), the "→ Vol" bookmarklet on the site (8), then the site's own button. Crew, fuel and outcome stay empty.
- **Target**: verb "Report" (1) → the module has already proposed the last flight (current flight of fuel / maps, last
  OFP, last IVAO / VATSIM flight when online), "Use" (2); outcome in the Result step (3); **"Save and record on the
  website"** (4) saves and opens the site's form in the same gesture; on the site, its own button. Three taps to a
  saved report, four with the website, the same on a desktop with a mouse. Nothing is required; what is missing is
  listed in the Result step, never blocking.

## 4. What the module asks of the frame and aerodb

- **Writes** (proposal, to settle with the ergonomics session, see DECISIONS): one JSON record per report,
  `cr/reports/<year>/<reportId>.json` (merge `record`, `updated_at`, `by`), instead of appending to the shared
  `cr/missions.yaml` (YAML is text for the data layer: a file changed on two devices would keep only one side). V2 and
  CPCO keep reading `cr/missions.yaml`: a bridge must fold the records into it (launcher sync or V2 ledger reading both
  — not decided). Drafts: `cache/report/draft.json` (cache policy).
- **Reads**: `cr/` (my reports: the next id, edit the last one, "already reported"), `missions/` (assignments: orders
  to report, read only), `pilot/<trigram>/current_flight.json` (shared with fuel and maps: aircraft, route, level),
  `cache/fuel/last_ofp.json` (the last OFP of this device, if fuel's cache may be read by another module — to confirm).
- **`ctx.net`**: IVAO tracker sessions and VATSIM history through the launcher relay (keys stay there); without a
  launcher IVAO needs its key and VATSIM has no CORS, so the module offers the paste instead (tracker page, StatSim).
  SimBrief directly. METAR (`metar.vatsim.net`) is not in the frame's list today: asked, optional.
- **`ctx.identity`**: `trigram` (`by`, paths), `ivao`, `vatsim`, `simbrief`. Never typed in the module.
- **aerodb**: aerodrome positions and names (replaces the jsDelivr airport list), `aircraft().classify / record`
  (type, category for the family default), registrations of the fleet if aerodb carries them (else `references/`).
- **Texts and files**: four languages from the start; `meta.files` for the family files so the module works offline
  from the first visit.

## 5. The phone, three steps

1. **Flight** — one card "Last flight" with its source (IVAO 23/10 LFRS → LFML, F-RAJA, 1 h 42) and **Use**; below,
   only aircraft (registration, type, callsign), departure, arrival, block times (four time fields), each filled field
   marked with its source; "Other source" folds the rest (SimBrief, paste, mission order).
2. **Mission** — family and series (prefilled: the order's, else the last used), mission number if any, then the
   family's blocks with their short fields; the rest folded.
3. **Result** — outcome, remarks, crew (my trigram first), fuel start / landing; the summary of what is missing (not
   blocking); **Save** and **Save and record on the website**.

The step bar stays at the top, the save button at the bottom (sticky), as in fuel. On a desktop the three steps sit
side by side.

## 6. The website hand-off

`website` owns the site (address from the airline setting, fields of `add_flight.php`, the "→ Vol" bookmarklet that
fills and never submits; no POST to another origin, never the pilot's login). The report module only builds the flight
(`reg, type, callsign, fpl, number, date, block time, mission, dep, arr`) and calls the website module's hand-off in
the click itself (a tab can only be opened inside the gesture). Until `website` exists, the report module carries the
V2 hand-off unchanged (URL fragment + bookmarklet + "Copy the fields") behind that single call, to be moved as is.
On a phone a bookmarklet is awkward: "Copy the fields" and the site's form side by side is the fallback until the site
has an API (today none: pages are read by paste).
