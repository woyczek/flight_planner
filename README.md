# X-Plane Web Suite — DEFA Virtual

*[Version française : README_fr.md](README_fr.md)*

A set of static web pages for virtual flight operations (X-Plane, IVAO, VATSIM): mission
reports for 14 mission families, reporting and statistics, fleet and aircraft databases,
landing performance analysis and flight / fuel planning. No server, no account, no build
step: the pages run in the browser and keep their data in local files (YAML) and in the
browser.

- Repository: <https://framagit.org/asr/flight_planner>
- Installation: [INSTALL.md](INSTALL.md) (French)
- Tutorial — your first mission report: [docs/TUTORIAL.md](docs/TUTORIAL.md) (French)
- Operations manual (data, backups, databases, maintenance): [docs/MANUEL_EXPLOITATION.md](docs/MANUEL_EXPLOITATION.md) (French)
- Design notes / audit of the Mission Report Core: [docs/mission_report_core_audit.md](docs/mission_report_core_audit.md)

## What's inside

| Menu ☰ | Page | Purpose |
|---|---|---|
| Missions › Nouveau compte rendu | `CR DEFA/mission_cr.html` | Choose a mission family, then write the report |
| Missions › Reporting missions | `CR DEFA/mission_operations_reporting.html` | All-family reporting, statistics, missions table |
| Paramétrage › Bases de données | `CR DEFA/parametrage.html` | Edit the fleet, aircraft types, callsigns, ledgers… |
| Landing Performance Dashboard | `LandingPerformanceDashboard/…` | Landing analysis from CSV logs |
| Flight Performance & Fuel Planner | `flight_performance_planner.html` | Performance and fuel planning |

### Mission Report Core — the “CR DEFA” application

All the pages and ledgers of the application live in the `CR DEFA/` folder;
shared code stays in `shared/`, `AircraftDB/` and `assets/`.

One engine (`shared/mission_core/`) drives the report and reporting pages of every
family: HEMS / MEDEVAC, FIRE / GAAR (aerial firefighting), SAR, AIRLIFT, MARITIME, HADR,
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
- **Weather and sun**: METAR parsing, current METAR (VATSIM), model weather at flight time
  (Open-Meteo), sunrise / sunset / day-night at the departure aerodrome (local time).
- **Live network tracking** (IVAO / VATSIM) filling engine start, take-off, landing and
  mission end; VATSIM history import.
- **Ledgers**: one YAML file per family (`CR DEFA/<FOLDER>/<family>_missions.yaml`), written in a
  local folder authorised once (Chrome / Edge), with a simplified CSV export. Legacy
  HEMS / GAAR CSV ledgers can be imported.
- **Report**: 14-section mission report generated in four languages (FR / EN / DE / ES),
  printable to PDF, with a public version hiding sensitive data where relevant.
- **Local data backup**: everything the browser keeps can be saved to / restored from
  `defa_local_store.yaml` (menu ☰ › Données locales).

### Shared framework

- `repository_tree`: page tree, labels, themes, favicons (JavaScript file without
  extension).
- `shared/repository_nav.js` / `.css`: common header, ☰ menu, language (FR / EN / DE / ES),
  pilot profile (IVAO / VATSIM IDs, SimBrief username), local data backup.
- `shared/app_framework.js`: movable / hideable blocks (layout remembered per page,
  blocks hidden by default where relevant).
- `AircraftDB/`: ICAO aircraft type database (`aircraft_db.js`) and its updater
  (`update_aircraft_db.py`), fleet updater (`update_fleet.py`).
- `tools/`: maintenance scripts (new mission family, cache version bump).

## Quick start

1. Get the repository (clone or download) — see [INSTALL.md](INSTALL.md).
2. Serve it locally, e.g. `python -m http.server 8000` at the repository root, and open
   <http://127.0.0.1:8000/CR%20DEFA/mission_cr.html> in Chrome or Edge.
3. ☰ › Profil pilote: enter your IVAO / VATSIM IDs (and SimBrief username).
4. Follow [docs/TUTORIAL.md](docs/TUTORIAL.md).

## Privacy

Nothing is sent to a server of this project (there is none). The pages call public
services only when you use the related feature: IVAO / VATSIM public feeds, VATSIM METAR,
SimBrief (your username), Open-Meteo (aerodrome coordinates and date), jsDelivr (world
aerodrome list). Mission data stay in your browser and in the files you choose.

## Licence and credits

CC RBR — DEFA Virtual. Bundled third-party code: js-yaml 4.1.0 (MIT,
`shared/mission_core/vendor/`). World aerodrome data: github.com/mwgg/Airports (MIT),
loaded on demand.
