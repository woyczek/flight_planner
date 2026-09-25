# X-Plane Web Suite — DEFA Virtual

*[Version française : README_fr.md](README_fr.md)*

A set of static web pages for virtual flight operations (X-Plane, IVAO, VATSIM): mission
reports for 15 mission families, reporting and statistics, fleet and aircraft databases,
landing performance analysis, flight / fuel planning, and mission briefs with aeronautical
maps built from official French AIS (SIA) data. No server, no account, no build
step: the pages run in the browser and keep their data in local files (YAML) and in the
browser.

- Repository: <https://framagit.org/asr/flight_planner>
- Installation: [INSTALL.md](INSTALL.md) (French)
- Changelog (French): [CHANGELOG.md](CHANGELOG.md) — current version 2.2.2 (page footer link)

## Four applications, one shared framework

| Application | Pages | Purpose | Documentation (French) |
|---|---|---|---|
| **CR DEFA** (Mission Report Core) | `CR DEFA/` — ☰ › Reporting missions, new report, settings | Mission reports for 15 families, single ledger, reporting and charts, fleet and callsign databases, report sending | [Tutorial](docs/TUTORIAL.md) · [Operations manual](docs/MANUEL_EXPLOITATION.md) · [Design notes](docs/mission_report_core_audit.md) |
| **Landing Performance Dashboard** | `LandingPerformanceDashboard/ LandingPerformance_Dashboard_MultiCSV_i18n.html` | Landing analysis (score, FPM, G) from CSV / LOG journals, trends, filters | [docs/LANDING_DASHBOARD.md](docs/LANDING_DASHBOARD.md) · [aircraft database updater](LandingPerformanceDashboard/README.md) |
| **Flight Performance & Fuel Planner** | `flight_performance_planner.html` | Aircraft performance profiles, fuel quote, optimum altitude, SimBrief calibration, Little Navmap exchange | [docs/FLIGHT_PLANNER.md](docs/FLIGHT_PLANNER.md) |
| **SIA missions** | `SIA XML/` — ☰ › Générateur de mission (SIA), Studio cartographique (SIA) | Mission brief (texts, points, final PDF) and PNG / SVG maps from SIA AIRAC data: airspaces, MORA, graticule, air-to-air refuelling tracks, OSM base maps; opens a pre-filled CR DEFA report | [docs/SIA_MISSIONS.md](docs/SIA_MISSIONS.md) |
| **Shared framework** | `repository_tree`, `shared/`, `AircraftDB/`, `tools/` | Header and ☰ menu, languages, blocks, period and zoom (TimePeriod), charts, tables, pilot profile, local data, aircraft databases | [docs/FRAMEWORK.md](docs/FRAMEWORK.md) |

The applications talk through the framework: same pilot profile (IVAO, VATSIM,
SimBrief), same period component (drag-to-zoom on charts, ◀ 🔍− ▶ buttons in the header),
same aircraft type database; the Planner lists the aircraft of the Landing Dashboard's last
file; an SIA mission opens a pre-filled CR DEFA report.

### Mission Report Core — the “CR DEFA” application

All the pages and ledgers of the application live in the `CR DEFA/` folder;
shared code stays in `shared/`, `AircraftDB/` and `assets/`.

One engine (`shared/mission_core/`) drives the report and reporting pages of every
family: HEMS / MEDEVAC, FIRE / GAAR (aerial firefighting), SAR, AIRLIFT, AAR (air-to-air refuelling), MARITIME, HADR,
AIRBORNE, FLIGHT INSPECTION, SURVEY, LAW ENFORCEMENT, ISR, COMMAND / AEW, SOF, SPECIAL
(test / training). Each family has a report page (`CR DEFA/<FOLDER>/<family>_cr.html`) and a
reporting page (`CR DEFA/<FOLDER>/<family>_reporting.html`); the header popup switches family and
mission sub-type.

Highlights:

- **Common data model** (identification, aircraft, crew, tasking, capabilities, weather,
  navigation, timeline, fuel, events, legs, results, network track) plus family-specific
  blocks, fields and events; fields irrelevant to a family are hidden.
- **Input assistance**: previously entered values offered in every field; aircraft
  registration / callsign / ICAO type / variant filter each other and fill in when only
  one match remains; DEFA fleet (205 aircraft); callsign = series + number with its
  7-character ICAO flight plan form (DRAGON76 ↔ DRAGO76, PELICAN31 ↔ PCAN31) and ICAO
  operator (OPR/).
- **Filed flight plan import**: SimBrief, IVAO (live), VATSIM (live or prefiled).
- **Weather and sun**: filled automatically as soon as the departure aerodrome, date and time
  are known — METAR computed from the Open-Meteo model at flight time (marked
  `RMK CALC OPEN-METEO`; real VATSIM METAR for a flight today, within the hour), sunrise /
  sunset (Open-Meteo, local calculation as fallback) and day / night phase. Only empty or
  automatically filled fields are written.
- **DEFA base** (settings): flown-flights log loaded on demand (saved “Log des vols” page),
  separate from the ledger; aircraft, callsigns, trigrams and aerodromes offered in reports;
  callsign series analysis (≈ 60 series from 2025-2026 added to the correspondence table).
- **Smart callsign**: typing `ctm58` in the callsign field gives COTAM / 58 / CTM58, OPR/ CTM
  and the organisation of the series.
- **Send report**: “Send report” button posting the report (JSON) to a web service whose
  address and key are set in Settings (the key stays in the browser, outside backups).
- **Live network tracking** (IVAO / VATSIM) filling engine start, take-off, landing and
  mission end; VATSIM history import.
- **Single ledger**: all families in one YAML file (`CR DEFA/missions.yaml`), written in the
  `CR DEFA` folder authorised once (Chrome / Edge), with a simplified CSV export; former
  per-family ledgers are merged automatically. Legacy HEMS / GAAR CSV ledgers can be imported.
- **Plain text fields in capitals** (callsigns, aerodromes, waypoints, crew…), older entries
  converted on reading; free text areas keep their case.
- **Report page layout**: seven-entry header bar (family · series, save, send, import,
  network tracking, mission, ledger), live report preview in the right column, navigation and weather at
  the bottom.
- **Report**: 14-section mission report generated in four languages (FR / EN / DE / ES),
  printable to PDF, with a public version hiding sensitive data where relevant.
- **Local data backup**: everything the browser keeps can be saved to / restored from
  `defa_local_store.yaml` (menu ☰ › Données locales).

### SIA missions — mission generator and map studio

Folder `SIA XML/`; details (French): [docs/SIA_MISSIONS.md](docs/SIA_MISSIONS.md).

- **Mission generator (brief)**: YAML (`helo-xp-mission`) or Markdown import, texts proposed
  from the data when missing (points, rendezvous, instructions, refuelling track), YAML /
  Markdown / **final PDF** exports named `S1-M11_AIRLIFT_Pont_logistique_vers_Solenzara`,
  hand-off to the studio, **pre-filled CR DEFA report** (family from the mission type).
- **Map studio**: SIA database (AIXM 4.5, AIRAC cycle) read from the remembered folder;
  **display profiles** (local PNG, OSM, OpenTopoMap, OpenFreeMap / VersaTiles vector styles;
  layers, airspaces, elements) with a live control map; airspace selection by allow / block
  list, completion, groups and aliases (**@RTBA**); vertical limits; degree / minute
  graticule; computed **MORA grid** (terrain, peaks, SIA obstacles); exact **air-to-air
  refuelling racetracks** (MILAIP ENR 5.7); robust PNG / SVG / ZIP generation.

### Shared framework (summary — details: [docs/FRAMEWORK.md](docs/FRAMEWORK.md))

- `repository_tree`: page tree, labels, themes, favicons (JavaScript file without
  extension).
- `shared/repository_nav.js` / `.css`: common header, ☰ menu, language (FR / EN / DE / ES),
  pilot profile (IVAO / VATSIM IDs, SimBrief username), local data backup.
- `shared/app_framework.js`: movable / hideable blocks (layout remembered per page,
  blocks hidden by default where relevant).
- `AircraftDB/`: ICAO aircraft type database (`aircraft_db.js`) and its updater
  (`update_aircraft_db.py`), fleet updater (`update_fleet.py`).
- `shared/time_period.js`: common analysis period (presets, dates, ◀ zoom out ▶, drag-to-zoom
  on charts) — reportings and Landing Dashboard.
- `shared/mission_core/charts.js`, `shared/mission_table.js`: SVG charts, sortable tables.
- `shared/file_access.js`: configured folders (ledger, backup, performance, SIA XML), file
  pickers opening in the right folder, shared paste panels.
- `shared/aar_tracks.js`: ENR 5.7 refuelling tracks (MILAIP PDF reader, named XML, racetrack
  geometry).
- `tools/`: maintenance scripts (new mission family, cache version bump).

## Known bugs

Version 2.2.2. Workarounds at the end of each line.

- **SIA studio — vertical profile**: terrain comes from an elevation model (≈ 150 m) and airspaces
  are those selected for the general map; “ASFC” limits follow that model, not the actual ground.
- **SIA studio — live preview while scrolling**: when scrolling the page, the preview's background
  map may vanish faster than its frame (overlays stay). Refresh the preview; generated maps are
  not affected.
- **SIA studio — generating in a hidden tab**: browsers suspend rendering of background tabs, so
  PNG generation can fail (“Délai dépassé pendant le chargement du fond de carte”). Keep the studio
  tab visible while generating.
- **SIA studio — freeze when all navaid types are unchecked**: reported, not reproduced. Reload the
  page if it happens and report the display profile used.
- **SIA studio — city labels**: they no longer overlap each other but can still overlap a ⊗
  (overflight prohibited) or a park symbol.
- **SIA studio — built-up areas**: kept by distance to the cities of the cities file (radius grows
  with population), so a neighbouring town may be included and a sprawling suburb cut. Not drawn on
  the SVG output over the “Carte France vierge” background.
- **SIA studio — parks and reserves**: only 26 of the 143 in the AIXM have an outline; the others
  are a single point (symbol only). SIA data limitation.
- **SIA studio — online backgrounds and data** (OpenFreeMap, OpenTopoMap, Overpass, elevation
  tiles): no background map or peaks offline; peaks are only fetched for small areas. MORA values
  are computed, not certified.
- **After an update**: the browser may keep the old page in cache (Ctrl + F5); the studio asks to
  read the SIA folder again once (base cached by a previous version).
- **Pages opened as `file://`**: CSV ledgers next to the pages cannot be read (browser security);
  legacy reportings fall back to the embedded ledger. Serve the folder over HTTP or pick the folder
  (Chrome / Edge).
- **Saving to a folder** (File System Access): Chrome and Edge only; other browsers download the files.

## Quick start

1. Get the repository (clone or download) — see [INSTALL.md](INSTALL.md).
2. Serve it locally, e.g. `python -m http.server 8000` at the repository root, and open
   <http://127.0.0.1:8000/CR%20DEFA/mission_cr.html> in Chrome or Edge.
3. ☰ › Profil pilote: enter your IVAO / VATSIM IDs (and SimBrief username).
4. Follow [docs/TUTORIAL.md](docs/TUTORIAL.md).

## Privacy

Nothing is sent to a server of this project (there is none), except the reports you send
yourself with “Send report” to the web service you configured. The pages call public
services only when you use the related feature: IVAO / VATSIM public feeds, VATSIM METAR,
SimBrief (your username), Open-Meteo (aerodrome coordinates and date), jsDelivr (world
aerodrome list); for SIA missions, OpenStreetMap, OpenTopoMap, OpenFreeMap, VersaTiles tiles,
Terrarium terrain (AWS) and Overpass API (peaks). Mission data stay in your browser and in the files you choose.

## Licence and credits

CC RBR — DEFA Virtual. Bundled third-party code: js-yaml 4.1.0 (MIT,
`shared/mission_core/vendor/`); MapLibre GL JS (BSD-3-Clause) and jsPDF (MIT) in
`SIA XML/`. World aerodrome data: github.com/mwgg/Airports (MIT), loaded on demand.
Aeronautical data: SIA (AIP France, AIXM 4.5) and DIRCAM (MILAIP ENR 5.7); cities: GeoNames
(CC BY 4.0); maps © OpenStreetMap contributors, OpenTopoMap (CC-BY-SA).
