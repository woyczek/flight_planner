# Mission Report Core — audit and integration plan

> Step “work required before coding” (§28 of the specification).
> Reference state: `repository_tree` v3 + branches `fix/explicit-option-values` (!1),
> `feat/reporting-tables-tracking` (!2), `feat/network-tracker` (!3).
> **No file is modified by this document.** Decisions validated on 2026-09-23:
> see §G (YAML storage + generated CSV, HEMS/FIRE rebuilt on the Core, `FIRE/`
> folder without redirection).

---

## A. Audit of the existing code

### A.1 Pages declared in `repository_tree`

| Page | Role | Remarks |
|---|---|---|
| `HEMS/hems_medevac_cr.html` | HEMS / MEDEVAC report generator | Minified inline script (`headers`, `row()`, `data()`), flat 50-column CSV |
| `HEMS/hems_medevac_reporting.html` | HEMS reporting | `shared/hems_reporting.js` |
| `GAAR/DEFA-Virtual.cr.gen.securite-civile.html` | GAAR report generator | Readable inline script (`ledgerHeader`, `flattenRow()`), flat 46-column CSV. **Title and file name to be corrected** |
| `GAAR/mission_stats.html` | Redirection to `gaar_mission_reporting.html` | Only GAAR menu entry, “Statistics” (« Statistiques ») |
| `mission_operations_reporting.html` | General GAAR + HEMS reporting | Coded for two families only |
| `apps/landing/…_i18n.html` | Landings table | Visual reference for the tables |
| `apps/planner/flight_performance_planner.html` | Fuel/performance planner | Outside the missions scope |

Not declared: **`GAAR/gaar_mission_reporting.html`** (reached only through the redirection).

### A.2 Common components (`shared/`)

| Area | Files | Finding |
|---|---|---|
| UI framework | `repository_nav.js/.css` (header, menu, language, themes per folder), `app_framework.js` (collapsible/movable blocks, remembered order, footer, `guardUnsavedChanges`) | Generic, reusable as is |
| Tables | `mission_table.js` → `SortedTable` (!2) | Generic |
| Period | `time_period.js` | Generic |
| i18n | `content_i18n.js` (translation of text nodes through a FR/EN/DE/ES dictionary) + `hems_i18n.js`, `gaar_i18n.js`, `reporting_i18n.js`, `mission_operations_i18n.js`, `flight_i18n.js` | Common system = **dictionary of `[fr, en, de, es]` lines** |
| Persistence | `mission_reporting_config.js` (preferences `missionReportingConfig:v1`, local copies of the ledgers `missionReportingData:v1:<clé>`, auto-loading, `traceLink`, `serializeLedger`, `openEditor`), `pilot_profile.js` | Ledger keys hard-coded for 2 families (`ledgerName`, `gaarLedgerName`) |
| Reference values | `mission_values.js` (English values of the lists, conversion of the old FR values) | Single HEMS + GAAR list |
| Editing / checking | `mission_edit.js` (edit mode, deletion, duplicates), `mission_record_loader.js`, `cr_extras.js` | Rely on the pages' globals (`headers`/`row`/`data` or `ledgerHeader`/`flattenRow`) |
| Report extensions | `mission_extensions.js` (HEMS density altitude, GAAR FMS selector, network trace section, caching after archiving), `hems_mission_sync.js` (times ↔ HEMS events), `network_tracker.js` (!3) | Mix of generic and family-specific |
| Aircraft data | `aircraft_directory.js` (fleet type/registration/callsign + local associations), `AircraftDB/aircraft_db.js` (ICAO database), `aircraft_icons.js` | Reusable for all families |
| Reportings | `hems_reporting.js`, `gaar_reporting.js` | ~80 % identical (parse, cards, breakdowns, table, export) |
| Default ledgers | `mission_ledger_defaults.js` | base64 of the two CSVs |
| **Unused** | `reporting_data_loader.js`, `gaar_reporting_bridge.js` | Referenced by no page |

### A.3 Data, exports, statistics

- **Ledger**: one flat `;` CSV per family, one line per mission; header hard-coded in each report page. Collections (events, destinations) do **not** go into the ledger: only into the single-mission CSV (`# events`) and the JSON.
- **JSON**: `Object.fromEntries(FormData)` + `events` + `kpi` — no `schemaVersion`.
- **Statistics**: computed on the reporting side from the flat columns (minutes, fuel, patients, drops…).
- **Structural limit**: the flat model cannot carry `aircraft[]`, `crew[]`, `legs[]`, `contacts[]`, `passes[]`… required by the specification (§18).

### A.4 Gaps with the specification

1. Two generators written by hand, without a common engine: any new family = a copy of a page (to be prohibited, §27).
2. Ledgers and configuration keys coded for 2 families.
3. No generic dynamic collections (only the HEMS events and destinations exist).
4. No combinable capabilities (NVG, HOIST… are currently free “conditions” text).
5. No `schemaVersion`, no automatic summary per family.
6. General reporting limited to GAAR + HEMS.

---

## B. Mapping of the existing files

| File | Decision | Detail |
|---|---|---|
| `repository_nav.js/.css`, `app_framework.js`, `time_period.js`, `mission_table.js`, `pilot_profile.js`, `content_i18n.js` | **Kept** | Base of the Core, unchanged |
| `mission_reporting_config.js` | **Modified** | Ledgers declared per family (family registry) instead of 2 hard-coded keys; existing keys kept |
| `mission_values.js` | **Modified** | Becomes the vocabulary registry (lists per family + common ones); FR conversion table kept |
| `mission_edit.js`, `mission_record_loader.js`, `cr_extras.js`, `network_tracker.js` | **Modified** | Adapter: HEMS/GAAR globals **or** Core API (`MissionCore.currentRecord()`…) |
| `mission_extensions.js` | **Modified then split up** | Network trace → common Core block; density altitude → HEMS module; FMS selector → FIRE module |
| `hems_mission_sync.js` | **Replaced** (step 2) | By the common event model (times ⇄ events for all families) |
| `hems_reporting.js`, `gaar_reporting.js` | **Replaced** (step 2) | By the common reporting `mission_core/reporting.js` configured per family |
| `aircraft_directory.js`, `AircraftDB/*` | **Kept** | Feed the Aircraft block of all families |
| Existing `*_i18n.js` | **Kept** | New dictionaries per family in `shared/mission_core/i18n/` |
| `HEMS/hems_medevac_cr.html`, `HEMS/hems_medevac_reporting.html` | **Rebuilt** (step 2) | Same address; rendered by the Core (HEMS family) once parity is validated |
| `GAAR/DEFA-Virtual.cr.gen.securite-civile.html` | **Moved** → `FIRE/fire_cr.html` (step 0), rebuilt (step 2) | Title “FIRE / GAAR — Mission report” (« FIRE / GAAR — Compte rendu de mission »); **no redirection** |
| `GAAR/gaar_mission_reporting.html` | **Moved** → `FIRE/fire_reporting.html` | Declared in `repository_tree`; **no redirection** |
| `GAAR/mission_stats.html` | **Deleted** | Redirection no longer needed |
| `GAAR/DEFA-Virtual.cr_gen.secucivile.html` | **Deleted** | Old copy of the GAAR generator |
| `GAAR/cl415_gaar_fms_pack/`, `GAAR/milan_gaar_pack/` | **Moved** → `FIRE/` | Paths of the FMS selector relative to the page |
| `mission_operations_reporting.html` | **Modified** | Multi-family reporting (family filter, common + specific stats) |
| `shared/reporting_data_loader.js`, `shared/gaar_reporting_bridge.js` | **Deprecated → deleted** | Not referenced |
| `DEFA_mission_reporting_HEMS_GAAR_2026-09-23.zip` | **To be removed from the repository** | Delivery archive versioned by mistake |
| `mission_ledger_defaults.js` | **Modified** | Example ledgers per family (generated) |

---

## C. Target tree

Convention: **one folder per family, two thin pages per family** (`<famille>_cr.html`
for entry, `<famille>_reporting.html` for reporting, ~25 lines each: header,
`data-family`, scripts). All the logic is in `shared/mission_core/`. No copy of a
generator (§27), but indeed two pages per category with report ⇄ reporting toggle buttons.

```text
repository_tree                       (pages, dossiers, thèmes, favicons des 14 familles)
README.md
docs/mission_report_core_audit.md
assets/favicon-<famille>.svg          (×14)
mission_operations_reporting.html     (reporting général multi-familles)
apps/planner/flight_performance_planner.html
apps/landing/…         (inchangé)
AircraftDB/…                          (inchangé)

HEMS/   hems_medevac_cr.html  hems_medevac_reporting.html  hems_missions.yaml
FIRE/   fire_cr.html          fire_reporting.html           fire_missions.yaml  (+ packs FMS)
        (GAAR/ supprimé, sans redirection)
SAR/    sar_cr.html           sar_reporting.html            sar_missions.yaml
        (idem pour chaque famille : <famille>_missions.yaml)
LE/     le_cr.html            le_reporting.html
MARITIME/ maritime_cr.html    maritime_reporting.html
ISR/    isr_cr.html           isr_reporting.html
SOF/    sof_cr.html           sof_reporting.html
AIRLIFT/ airlift_cr.html      airlift_reporting.html
HADR/   hadr_cr.html          hadr_reporting.html
AIRBORNE/ airborne_cr.html    airborne_reporting.html
COMMAND/ command_cr.html      command_reporting.html
FLIGHTINSPECTION/ fi_cr.html  fi_reporting.html
SURVEY/ survey_cr.html        survey_reporting.html
SPECIAL/ special_cr.html      special_reporting.html

shared/
  repository_nav.js/.css  app_framework.js  content_i18n.js  time_period.js
  mission_table.js  pilot_profile.js  mission_reporting_config.js  mission_values.js
  mission_edit.js  mission_record_loader.js  cr_extras.js  network_tracker.js
  aircraft_directory.js  aircraft_icons.js
  hems_*.js  gaar_*.js  (existants, HEMS / FIRE)
  mission_core/
    core.js            registre des familles, montage de page, brouillon, import/export   [1a]
    model.js           modèle Mission (§E), calculs, migrations de schéma, YAML           [1a]
    blocks.js          blocs communs déclaratifs : identification, appareils[], équipage[],
                       tâche, capacités, environnement, navigation, chronologie, carburant,
                       événements[], étapes[], résultat, remarques, réseau                 [1a]
    form.js            rendu des blocs, collections dynamiques, règles d'affichage        [1a]
    core.css           style des pages de saisie                                           [1a]
    report.js          rendu du CR (§21, sections vides omises) + résumé automatique (§22)
    ledger.js          registre YAML (dossier local / navigateur / fichier) + export CSV    [1a-bis]
    aircraft.js        appareils connus (immatriculation), types OACI enrichissables        [1a-bis]
    vendor/js-yaml.min.js   bibliothèque YAML embarquée (MIT, aucune dépendance réseau)
    reporting.js       page de reporting commune (cartes, répartitions, SortedTable, export) [1a-bis]
    stats.js           statistiques communes + points d'extension famille
    vocab.js           capacités, résultats, types d'événements, rôles d'équipage          [1a]
    families/demo.js   famille de démonstration du moteur (page MissionCore/…_demo.html)   [1a]
    i18n/              core_i18n.js + <famille>_i18n.js (lignes [fr,en,de,es])
    families/          sar.js le.js maritime.js isr.js sof.js airlift.js hadr.js airborne.js
                       command.js flight_inspection.js survey.js special.js
                       hems.js fire.js (adaptateurs des registres existants)
```

---

## D. Functional matrix

| Family | Series | Fixed wing | Rotary wing | Specific blocks (conditional display) | Specific stats |
|---|---|---|---|---|---|
| HEMS / MEDEVAC *(existing)* | primary, secondary, rescue… | ○ (MEDEVAC aeroplane) | ● | patients, medical team, destinations | patients, alert→take-off |
| FIRE / GAAR *(existing)* | GAAR, intervention… | ● | ● (HBE) | drops, scoopings, FMS | drops, reloads |
| SAR / PR | SAR-LAND, SAR-MARITIME, SAR-AIRCRAFT, PR, CSAR* | ● | ● | datum/LKP, beacon, area + patterns (collection), contacts, survivors, recovery; **ROTARY+HOIST → hoist**; **FW+AIRDROP → SAR kit** | searches, located, rescued, hoistings, kits dropped |
| LAW ENFORCEMENT | POLICE OBS, GENDARMERIE, BORDER, CUSTOMS, TRAFFIC, PURSUIT, MISSING PERSON, TACTICAL SUPPORT, EVENT SECURITY | ● | ● | authority, ground units, objective, tracking (positions), masking in public export | trackings, tracking duration |
| MARITIME | MARPAT, FISHERY, CUSTOMS MARITIME, POLLUTION, SHIPPING, ICE, SHIP ID, ANTI-POLLUTION, OFFSHORE | ● | ● | vessel contacts (collection: IMO, MMSI, flag, AIS/radar/visual), pollution | vessels detected / identified, anomalies, pollutions |
| ISR / RECON | ISR, RECON, EO/IR, IMINT, SIGINT, ELINT, COMINT, BORDER/MARITIME/INFRA ISR | ● | ● | collection task, orbit, sensors/modes, contacts/tracks, coverage; generic unclassified mode | hours on station, contacts, coverage |
| SOF / TACTICAL | INSERTION, EXTRACTION, INFIL, EXFIL, TACTICAL TRANSPORT, SR SUPPORT, FAST ROPE, RAPPEL, PARA INSERTION, LZ, SHIP INSERTION | ● | ● | PZ/LZ/DZ (collection), personnel embarked/delivered/recovered, profile; **report level only** | personnel delivered / recovered |
| AIRLIFT / LOGISTICS | STRATEGIC, TACTICAL, REMOTE, OFFSHORE, POLAR, HUMANITARIAN, PAX, CARGO, COMBI | ● | ● | stages (legs), manifest, runway (type/length/surface), rotations | passengers, tonnes, rotations |
| HADR / EVACUATION | DISASTER, FLOOD, EARTHQUAKE, CYCLONE, STORM, VOLCANO, HUMANITARIAN, NEO, CIVIL EVAC, ISOLATED, SUPPLY DROP | ● | ● | evacuation points, evacuees (categories), relief cargo, rotations | evacuees, personnel, cargo, sorties |
| AIRBORNE / AIRDROP | PERSONNEL PARADROP, CARGO AIRDROP, RESUPPLY, HUMANITARIAN AIRDROP, SAR KIT DROP, TRAINING DROP | ● | ○ | DZ, drop passes (collection: planned/actual, dispersion) | parachutists, drops, load dropped |
| COMMAND / AEW / RELAY | AIRBORNE COMMAND, AEW, AIR COORD, COMM RELAY, DISASTER RELAY, FIRE COORD, SAR COORD | ● | ● | coordinated units (collection), frequencies/networks, orbit, relays, outages | time on station, coordinated units, relays |
| FLIGHT INSPECTION | ILS, LOC, GP, VOR, DME, NDB, TACAN, RADAR, PAPI/VASI, RNAV/GNSS, PROC VALIDATION, LIGHTING | ● | ○ | facility, **passes (collection)**; ILS / VOR-DME-TACAN / procedure validation blocks according to the series | facilities inspected, passes, anomalies, serviceable / unserviceable |
| SURVEY / SCIENCE | AERIAL PHOTO, MAPPING, LIDAR, PHOTOGRAMMETRY, GEOPHYSICS, ATMOSPHERIC, WEATHER RECON, VOLCANO, WILDLIFE, ENVIRONMENT, ICE, OCEANOGRAPHIC | ● | ● | project, lines (collection), sensors, data quality; **WEATHER RECON → measurements** | survey hours, lines, area covered, datasets |
| SPECIAL / TEST / TRAINING | VIP/GOV, FERRY, TEST, TRAINING | ● | ● | sub-module per series (VIP, ferry, test cards + points, training exercises) | depending on series |

● relevant · ○ possible/rare · \* CSAR visible only if the “military” context is enabled.

---

## E. Data schema

### E.1 Common mission (`schemaVersion: 2`)

```jsonc
{
  "schemaVersion": 2,
  "family": "SAR", "series": "SAR-MARITIME", "subtype": "man-overboard",
  "metadata": { "missionId": "SAR-001", "missionNumber": "", "serial": "", "date": "2026-09-23",
                "timeLocal": "", "timeUtc": "", "classification": "UNCLASSIFIED",
                "context": "exercise|real", "operationName": "", "orderRef": "" },
  "organisation": { "organisation": "", "unit": "", "detachment": "",
                    "requestingAuthority": "", "controllingAuthority": "" },
  "aircraft": [ { "type": "H145", "variant": "", "registration": "F-ZBQU", "tacticalNumber": "",
                  "callsign": "DRAGON06", "category": "rotary|fixed|amphibious",
                  "baseDeparture": "", "baseReturn": "", "massTakeoff": null, "massLanding": null,
                  "configuration": "", "fuel": { "unit": "kg", "start": null, "end": null, "reserve": null } } ],
  "crew": [ { "role": "PIC|COPILOT|WINCH_OPERATOR|RESCUE_SWIMMER|…", "name": "", "aircraftIndex": 0 } ],
  "tasking": { "requestedBy": "", "taskRef": "", "objective": "" },
  "environment": { "metar": "", "taf": "", "wind": "", "temperature": null, "qnh": null,
                   "visibility": "", "ceiling": "", "precipitation": "", "turbulence": "", "icing": "",
                   "seaState": null, "illumination": "", "dayNight": "day|night|twilight", "nvg": false },
  "navigation": { "dep": "", "arr": "", "altn": "", "route": "", "waypoints": [], "area": "",
                  "radiusNm": null, "corridor": "", "orbit": "", "altitude": "", "minAltitude": "",
                  "speed": null, "distanceNm": null },
  "capabilities": [ "NVG", "HOIST" ],
  "timeline": { "briefing": "", "engineStart": "", "offBlock": "", "takeoff": "", "zoneEntry": "",
                "missionStart": "", "missionEnd": "", "zoneExit": "", "landing": "", "onBlock": "", "shutdown": "" },
  "legs": [ { "from": "", "to": "", "takeoff": "", "landing": "", "pax": 0, "cargoKg": 0 } ],
  "events": [ { "timeLocal": "", "timeUtc": "", "type": "CONTACT", "position": "", "altitude": null,
                "speed": null, "heading": null, "fuel": null, "description": "", "result": "" } ],
  "missionData": { /* extension de la famille, versionnée : { "version": 1, … } */ },
  "results": { "outcome": "SUCCESS|PARTIAL_SUCCESS|ABORTED|CANCELLED|DIVERTED|NO_CONTACT|TARGET_NOT_FOUND|WEATHER|TECHNICAL|OPERATIONAL|OTHER",
               "detail": "", "interruptionReason": "", "incidents": "", "anomalies": "" },
  "statistics": { /* calculé : blockMinutes, flightMinutes, transitOutMinutes, timeOnStationMinutes,
                    transitInMinutes, missionMinutes, fuelUsed, distanceNm, personnel, cargoKg, + famille */ },
  "remarks": { "observations": "", "lessonsLearned": "" },
  "network": { "onlineNetwork": "", "ivaoId": "", "vatsimId": "", "trackerUrl": "" }
}
```

Automatic calculations (§4.4): block = off-block→on-block (or engine start→shutdown);
flight = take-off→landing; outbound transit = take-off→zone entry; time on station =
zone entry→zone exit; return transit = zone exit→landing; mission time =
mission start→end. Crossing midnight handled as today.

### E.2 `missionData` extensions per family (summary)

| Family | Main structure |
|---|---|
| SAR | `rcc, sarNumber, datum{lat,lon,time}, lkp{…}, alertSource, beacon{type,frequency}, persons[{count,description,status}], searchAreas[{pattern,trackSpacing,altitude,speed,visibility,cloud}], sensors[], contacts[{time,position,identified}], recovery{located,recovered,method,destination,sarKitDropped}` |
| LE | `authority, groundUnit, objective{type,description}, contactGround{callsign,frequency}, track[{time,position}], acquisitionTime, lossTime, publicRedaction: true` |
| MARITIME | `seaArea, sector, seaState, waveHeight, vessels[{name,imo,mmsi,callsign,flag,type,course,speed,ais,radar,visual,identified,photo,behaviour,anomaly}], pollution[{nature,dimensions,drift,position}], reportedTo` |
| ISR | `collectionTask, targetRef, orbit, standoffNm, sensors[{sensor,mode}], contacts[{time,trackId,confidence,observation}], coverage, gaps, dissemination, genericMode: true` |
| SOF | `supportedUnit, team, personnelCount, zones[{kind:PZ|LZ|DZ,name,coordinates,tot}], methods{insertion,extraction,landing}, personnel{embarked,delivered,recovered}, profile, lighting` |
| AIRLIFT | `stops[], manifest[{type,weightKg,volume,pallets,dangerousGoods}], pax, runway{type,lengthM,surface,unprepared}, loadingMinutes, unloadingMinutes, delivered, returned, delays, turnaroundMinutes` |
| HADR | `disaster, affectedArea, authority, populationAffected, points[{kind:pickup|evac|shelter,name}], evacuees{planned,transported,children,dependent,medical}, relief{personnel,waterKg,foodKg,medicalKg,shelters,comms}, rotations` |
| AIRBORNE | `dz{name,coordinates,elevation,dimensions}, passes[{type,jumpers,loadKg,parachute,plannedAlt,actualAlt,plannedRunIn,actualRunIn,wind,releaseTime,releasePos,result,landingPos,dispersion}]` |
| COMMAND | `authority, units[{callsign,type,role}], frequencies[], networks[], orbit, stationMinutes, coverage, handovers[], outages[], relayEvents[], effectiveness` |
| FLIGHT INSPECTION | `airport, icao, runway, facility{type,id,frequency,channel}, procedure, inspectionType, passes[{kind,altitude,distance,radial,course,result,anomaly}], ils{locFreq,course,gpAngle,interceptAlt,locResult,gpResult,dmeResult,coverage}, serviceable` |
| SURVEY | `project, organisation, pi, area{polygon}, lines[{number,plannedAlt,actualAlt,plannedSpeed,actualSpeed,start,end,status}], sensors[], dataQuantity, coverage, missedLines, repeatRequired, samples, weatherRecon{points[{altitude,pressure,temperature,humidity,wind,turbulence,icing,dropsonde}]}` |
| SPECIAL | `vip{passengers,authority,schedule,delays,handling} | ferry{reason,technicalStatus,stops,defects} | test{card,points[{id,altitude,speed,config,result,pass}],repeatRequired} | training{instructor,trainee,exercises[{objective,repetitions,completed}],grading}` |
| HEMS | `service, outcome, medicalization, incidentType, patientProfile, sceneLocation, coordinates, destinations[{name,arrival,departure,note}], patients, densityAltitude, alertToTakeoffMinutes, sceneMinutes` (import of the old CSV/JSON = `schemaVersion: 1`) |
| FIRE / GAAR | `risk, sector, reloadBase, fms, load, drops, reloads, reloadTime, eventDrops, eventReloads, fireAlert, patrolStart, firstDrop, endIntervention` (import of the old CSV/JSON = `schemaVersion: 1`) |

### E.3 YAML ledger, CSV export and compatibility *(validated decision)*

- **Source of truth: one YAML ledger per family** (`<famille>_missions.yaml`):
  `schemaVersion`, `family`, then `missions:` (list of missions in the E.1 format, tree-structured).
  Loading/writing as today: auto-loading next to the page, local folder
  authorised (Chrome/Edge), local browser copy shared between pages.
- **CSV = generated simplified export** (one line per mission: identifiers, date, family,
  series, main aircraft, computed times, result, main stats) for spreadsheets.
  It is no longer read back as a source.
- **Safe YAML writing**: dates, times (`"10:39"`), identifiers and registrations
  always quoted; reading with the YAML 1.2 “core” schema (no implicit
  conversion of dates); generated header comments.
- **Migration**: the old HEMS/GAAR CSV ledgers and the old report JSON files (without
  `schemaVersion`) remain importable once, converted to YAML (`model.js`).
- JSON remains an internal format (memory, browser copy), not a user file.

---

## F. Integration plan (one MR per step, validation after each one)

| # | Step | Content | Validation |
|---|---|---|---|
| 0 | Clean-up + FIRE | unused/archived files deleted; `GAAR/` → `FIRE/` (pages, FMS packs, local data) without redirection; titles corrected; `repository_tree` up to date | FIRE/HEMS/general pages working, ledgers reloaded |
| 1a | Core: model + mounting | `core.js`, `model.js`, common blocks (identification, aircraft[], crew[], timeline, weather, fuel, result, remarks, network), `collection.js`, capabilities | demonstration page; JSON export/import; i18n FR/EN/DE/ES |
| 1a-bis | Core: ledger, aircraft, reporting *(brought forward before 1b, 2026-09-23)* | `ledger.js` (YAML ledger + CSV), `aircraft.js` (known aircraft, extensible ICAO types, equipment), `reporting.js`, edit/delete mode, duplicates, network tracking, pages `MissionCore/demo_cr.html` / `demo_reporting.html` | round trip report → ledger → reporting → edit / delete |
| 1b | Core: report + summary | `report.js` (§21 sections without empty ones), summary per family, printing | report of a demo mission |
| 1c | Core: statistics | `stats.js` (common statistics + family extension points, feeding family and general reporting) | totals checked on a test ledger |
| 2a | HEMS rebuilt on the Core | `families/hems.js` (same fields, times ⇄ events, destinations), import of the old CSV/JSON, HEMS reporting through the Core | field-by-field comparison with the old page; identical stats |
| 2b | FIRE rebuilt on the Core | `families/fire.js` (drops, scoopings, FMS selector), import of the old CSV/JSON | same |
| 2c | Multi-family general reporting | family filter, common + specific stats, reading of the YAML ledgers | totals identical to step 0 |
| 3 | SAR / PR | complete family (hoist, SAR kit, patterns) | H145 hoisting report, H225 maritime search |
| 4 | AIRLIFT | legs, manifest, runways | tactical A400M, polar Twin Otter |
| 5 | MARITIME | vessel contacts, pollution | CN-235 / Atlantique 2 MARPAT |
| 6 | HADR | evacuees, relief cargo | humanitarian C-130 |
| 7 | AIRBORNE | DZ, drop passes | PC-6 parachute drop |
| 8 | FLIGHT INSPECTION | passes, ILS / VOR / procedure | King Air ILS calibration |
| 9 | SURVEY / SCIENCE | lines, sensors, weather recon | LiDAR survey |
| 10 | LAW ENFORCEMENT | tracking, masking in public export | police helicopter |
| 11 | ISR / RECON | collection, contacts, generic mode | King Air ISR |
| 12 | COMMAND / AEW / RELAY | coordinated units, relays | firefighting relay aircraft |
| 13 | SOF / TACTICAL | zones, personnel (report level) | NVG helicopter insertion |
| 14 | SPECIAL / TEST / TRAINING | VIP, ferry, tests, training | test flight, government mission |

After each step: old reports/ledgers tested, new one tested, import/export, i18n,
persistence, `repository_tree` updated (pages, folder, theme, favicon).

---

## G. Decisions

Validated on 2026-09-23:

1. **Pages**: two thin pages per family (`<famille>_cr.html` + `<famille>_reporting.html`)
   rendered by the Core, with report ⇄ reporting toggle buttons.
2. **Naming**: folder `FIRE/` (family “FIRE / GAAR”), `FIRE/fire_cr.html` and
   `FIRE/fire_reporting.html`, **without redirection** from `GAAR/`. HEMS keeps its names.
3. **Storage**: **YAML** ledger per family (source of truth) + **generated simplified CSV**
   for spreadsheets (§E.3). No JSON column, no user JSON file.
4. **HEMS / FIRE**: **rebuilt on the Core** (steps 2a/2b), old data imported.

Adopted by default (to be challenged if needed):

5. **i18n**: family labels declared as `[fr, en, de, es]` lines and registered in
   the common `RepositoryContentI18n` system (no second system).
6. **Military context** (CSAR, SOF, ISR): fields limited to the level of a simulation
   report, generic unclassified mode by default, masking of sensitive fields in
   public export.

## G. Step 3 — entry aids (2026-09-24)

- **Known values**: each text field offers the values of the recorded missions
  (current family + cached ledgers of the other families), most recent first.
  Shared pools: aerodromes, people, organisations, units, authorities, operations,
  waypoints, altitudes (`pool` of the fields, `shared/mission_core/assist.js`).
- **Aircraft**: registration, callsign, ICAO type and variant filter one another;
  a single possibility → empty fields filled; values taken from a
  previous aircraft replaced when another one is chosen. Types H160 / CL2T added.
- **Equipment / technical capabilities**: folded by default (known aircraft, flight
  plan); group “Flight plan equipment (ICAO, item 10)” (« Équipements plan de vol (OACI, case 10) »). Techniques used:
  folded block, taken from the last mission of the same series.
- **Filed flight plan** (`fpl.js`): SimBrief (identifier in the pilot profile), IVAO
  (flight in progress), VATSIM (flight in progress or prefile) → aircraft, equipment, route, waypoints,
  levels, airfields, METAR / TAF, planned masses and fuel (empty fields only).
- **Weather / sun**: METAR analysed on entry; current METAR (metar.vatsim.net); model
  weather at the time of the flight (Open-Meteo); sunrise / sunset and day / night computed (local
  time of the airfield, worldwide aerodrome database loaded on demand via jsDelivr).
- **Header**: family / subtype popup (report: series of the mission; reporting: filter).
- **Fields per family**: `only` / `hideFor` on the common fields, `hide` per family.
- Sources impossible from a static page: aviationweather.gov (no CORS),
  IVAO filed flight plans (authenticated API).

## H. Step 4 — fleet and local data (2026-09-24)

- **Fleet**: `data/references/aircraft_fleet.js` generated from the “Virtual fleet” page (« Flotte virtuelle »)
  (flotte.defa-virtual.fr) by `python AircraftDB/update_fleet.py Flotte.html`:
  205 aircraft, 6 operators (AAE, Marine nationale, ALAT, Sécurité civile, SAMU,
  Gendarmerie), ICAO type, variant (Rafale B/C/M, Mirage 2000-5/B/D, A330 MRTT…), tactical
  code, number, callsigns (several possible), home base. A known aircraft
  also fills in the departure base and the organisation (operator). Types missing from the ICAO database
  added as a supplement (`aircraft.js`). Duplicates in the source: F-ZBPD, F-YSBK.
- **Local data** (`shared/browser_store.js`, ☰ menu › “Local data”): the whole
  localStorage of the site (ledgers, drafts, aircraft, types, aerodromes, preferences,
  caches, FMS, planner) copied into `defa_local_store.yaml` in a chosen folder;
  automatic backup when leaving the page and every 5 min if the folder is authorised
  and the data has changed; restore / resynchronisation by merging (the most recent
  data wins, collections merged entry by entry), also from a
  file; the Core pages reread their ledger after a restore.

## I. Step 5 — callsigns, categories, blocks hidden by default (2026-09-24)

- **Radio callsign** split into *callsign* (series: DRAGON, PELICAN, MILAN, SAMU,
  CHOUCAS…) + *number*; the full callsign remains a free field, broken down on entry.
  Database of known callsigns derived from the fleet and the recorded missions
  (`MissionAircraft.callsignSeries()`), attached to the aircraft series (type, operator):
  Sécurité civile + H145 → DRAGON, SAMU + H145 → SAMU (majority series ≥ 80 %).
- **Flight plan form**: 7 characters at most, without a hyphen (ICAO Doc 4444, app. 2,
  item 7). Abbreviations learnt from the database (DRAGO → DRAGON), otherwise truncation
  (PELICAN41 → PELIC41). “Flight plan callsign” field (« Indicatif plan de vol ») computed and editable; a
  callsign filed or entered in abbreviated form is brought back to its full form; network
  tracking uses the flight plan form.
- **Category**: rotary wing → neither aeroplanes nor seaplanes offered (types,
  registrations, callsigns); fixed wing / amphibious → no helicopters.
- **Blocks hidden by default**: the framework's show / hide / move mechanism
  (`app_framework.js`) extended by `data-default-hidden="1"`; reapplied after each
  rendering of the Core pages. The “Capabilities / techniques used” block (« Capacités / techniques employées ») uses it.
  (The equipment of an aircraft remains a collapsible group inside the
  Aircraft block, since the framework only handles blocks.)

## J. Step 6 — callsign mapping table, OPR/ operator (2026-09-24)

- The **full** form remains that of the reports; the **mapping table**
  (`MissionVocab.callsignTable`) gives the flight plan form (item 7) and the ICAO designator
  of the operator (OPR/, item 18): PELICAN ↔ PCAN (FRU), MILAN, BENGALE ↔ BENGA, ICARE
  (function), DRAGON ↔ DRAGO, CHOUCAS ↔ CHOUC (FGN), KETOUPA ↔ KETOU, MORANE (HBE), LAT,
  FMN (F.M.N.), COTAM ↔ CTM, and generic designators FAF, FRU, FMY, FNY, FGN, FDO, DGAEV
  (generic forms; the series names are the spoken mission callsigns).
- Priority: static table, forms corrected by the pilot (remembered in
  `missionCallsignTable:v1`, hence in the local data backup), abbreviations
  learnt from the database, truncation to 7 characters. Accents and dots ignored (PÉLICAN).
- Automatic series: known aircraft of the operator, otherwise table (Sécurité civile + BE20
  → BENGALE; Gendarmerie + EC135 → KETOUPA), except function callsigns.
- **“ICAO operator (OPR/)”** field (« Exploitant OACI (OPR/) »): from the organisation (Sécurité civile → FRU…), the series
  or the known aircraft; read from the OPR/ of imported flight plans (organisation deduced).

## K. Step 7 — events and capabilities per family, simplified menu (2026-09-24)

- **Events**: common base (take-off, landing, task start / end, diversion,
  refuelling, technical, weather, interruption, other) + specialised events per
  family (`MissionVocab.eventProfiles`: contact, observation, pick-up, drop,
  hoisting, insertion, extraction) + the family's own events. GAAR: drop,
  fire alert, reload, scooping — no more insertion / extraction.
- **Capabilities / techniques**: profiles per family (`capabilityProfiles`) for FIRE, HEMS,
  flight inspection and surveys; the other families keep the complete list.
- **☰ menu**: “Missions › New report” (`mission_cr.html`: choice of the
  family at each opening, the last one used first) and
  “Missions › Mission reporting” (general reporting). The family pages remain
  declared in `repository_tree` (theme, settings) with `menu:false`; one goes from one
  to the other through the header popup and the report ⇄ reporting buttons.

## L. Step 8 — Settings › Databases (2026-09-24)

- Page `parametrage.html` (☰ menu › “Settings › Databases” (« Paramétrage › Bases de données »), `shared/data_admin.js`):
  - **repository files**: fleet (`data/references/aircraft_fleet.js`), aircraft types + aliases
    (`AircraftDB/aircraft_db.js`, changes carried over into `aircraft_overrides.json` for
    the script), callsign mapping + organisations / OPR/
    (`data/references/callsigns.js`, moved out of vocab.js); “Apply in this
    browser” (local change takes priority as long as it is more recent than the
    file), “Save to the repository” (« Enregistrer dans le dépôt ») (repository folder authorised once), “Download”,
    back to the file; operating procedure of the Python scripts;
  - **browser data**: aircraft from the missions, added types, learnt callsigns,
    aerodromes — with integration into the repository databases;
  - **mission ledgers** (operations base): YAML editing per family, checked.
- Common format of the data files (`AircraftDB/datafile.py` = `DataAdmin.render`):
  JSON one line per element, date `META.updatedAt`, file content (`fileData`) and
  local overlay; output identical byte for byte between the script and the page.
- To be made editable next: event / capability profiles and family index
  (vocab.js), lists of the old reports (mission_values.js), icons (aircraft_icons.js).

## M. Reorganisation — “CR” folder (2026-09-24)

- All the pages of the application (families, old HEMS / GAAR reports, demonstration,
  “New report”, general reporting, Settings) and their ledgers are in
  `apps/cr/`; the common code stays in `shared/`, `AircraftDB/`, `assets/`. ☰ menu unchanged.
- Paths: relative links between pages of the application unchanged; links to the root
  (`shared/`, `AircraftDB/`, `assets/`, `repository_tree`) one level up; addresses
  computed from the site root in `global.js` (from its own location),
  `mission_reporting_config.js` (from repository_tree), `data_admin.js` and the favicons
  of the old reportings. `repository_tree`: folders and pages prefixed with `apps/cr/`.
- Folder permissions of the ledgers: to be granted again once per family (“Ledger
  folder…”) if they pointed to the old folders.

## N. Step 9 — single ledger, capitals, layout of the report page (2026-09-24)

- **Single ledger** `data/cr/missions.yaml` (all families; `shared/mission_core/ledger.js`):
  views per family (same interface), a single folder permission (“CR”), automatic
  and idempotent migration of the old per-family ledgers (`legacyImported`).
- **Capitals**: simple text fields declared by the common blocks and by the families
  (`MissionModel.registerUpperFields`, `isUpperField`, exception `keepCase` for URLs);
  entry converted while typing, automatically filled values converted, old
  missions converted on reading then saved again.
- **Report page**: toolbar in the header (mission ledger; network tracking in compact
  mode, instructions in a tooltip), report preview in the right-hand column (sticky,
  own scrolling, calculations on 4 columns), Navigation and Weather blocks at the bottom of the page.

## O. Step 10 — analysis of pasted texts, menu (2026-09-24)

- `shared/mission_core/text_import.js` (“Analyse / import…” in the report header): ICAO flight
  plan (items 7 to 19), “details” page of the IVAO tracker (flight plan, connection / disconnection,
  track → take-off, landing, distance, max altitude; times converted to the local time of the
  airfield), list of IVAO connections, VATSIM history (JSON), METAR; “→ CR” bookmarklet
  (copy of the tracker page, analysed on return). A page from another site cannot be read
  by the report page: copy-paste or bookmarklet.
- ☰ menu: “Mission reporting” alone at the top; “New report” through the button in
  the reportings' header; “Settings — databases” at the bottom, before “Local data”
  (`slot:"settings"` in repository_tree).

## P. Step 11 — smart callsign, computed METAR, sending of reports (2026-09-24)

- Callsign: an entry with a number in the callsign field (`ctm58`) is split
  (COTAM / 58, flight plan form CTM58, OPR/ CTM); the series in the mapping table
  fills in the organisation and, if it has only one, the type (`seriesAssist`, after clearing the
  values of the previous aircraft).
- Weather (`assist.js`): `buildMetar()` — wind, visibility (≥ 10 km assumed without fog or
  precipitation when the archive gives none), present weather (WMO code), clouds by layer (base
  of low clouds ≈ 400 ft per °C of T / Td spread), T / Td, QNH, `CAVOK` if applicable,
  `RMK CALC OPEN-METEO`. Open-Meteo sunrise / sunset (`daily`), local NOAA computation otherwise. Source
  kept only if it has values (the forecast api returns nulls for a distant
  past → archive-api).
- `autoEnvironment()`: signature departure airfield | date | time; request 1.2 s after a
  change; reference state when opening a mission (no request), immediate request
  for a new mission. An automatic fill does not make an untouched mission
  “modified” (`changed(path, auto)`).
- “Send report”: POST JSON, configuration `missionSendConfig:v1`, key `missionSendKey:v1`
  (excluded from browser_store), log `missionSendLog:v1`. Tested with a local service (201,
  Bearer header, complete body) and an unreachable service (CORS message).

## Q. Step 12 — general reporting, clearing the aircraft, ledger robustness (2026-09-24)

- `apps/cr/mission_operations_reporting.html` rewritten on the single ledger
  (`shared/mission_core/global_reporting.js`): title “Mission reporting — CR”, coloured family
  chips (`COLORS`), indicators, standalone SVG charts (`charts.js`: stacked bars
  per period with automatic or chosen unit, rings, rankings), summaries per
  family (`family.stats` indicators), aircraft, crew; import of the old HEMS / GAAR CSVs.
  The page's old CSV loadings and `global.js` are removed.
- Aircraft card: “⟲ Clear” button (option `collection.clear` of form.js, hook
  `onClear`: the organisation taken from the fleet is removed).
- `ledger.js`: an unreadable ledger (network error, ≠ 404) is no longer treated as empty — no more
  migration nor writing of a partial copy (which replaced the complete ledger);
  `save()` rereads the ledger first. Old ledgers served as missing: one check per day.
- `model.js`: transit / time on station never longer than the flight (inverted time = error,
  not a midnight crossing).

## R. Step 13 — header bar of the reports (2026-09-24)

- One line, seven entries in order of importance: family · series (popup moved into the
  bar), “Add / Save” (« Ajouter / Enregistrer ») (main), “Send report” (green; dotted as long as the
  web service is not set up, with an offer to open the settings), “Analyse / import…” ▾
  (the YAML / JSON file joins the pasted text there), “Network tracking” ▾ (compact panel of the
  network_tracker, red ● during tracking), “Mission” ▾ (new, export, deletion),
  “Mission ledger” ▾ (info, reporting, folder, download, sending settings,
  Settings). Only one menu open, closed by clicking outside; `data-action` unchanged.

## S. Step 14 — consistency checks, charts of the family reportings (2026-09-24)

- `MissionModel.checkMission`: invalid times, inverted timeline (gap ≥ 12 h between two
  steps from engine start → shutdown, mission end ≥ 20 h after the start), timeline > 20 h,
  final fuel > departure. Labels: `MissionBlocks.describeIssue(issue, langue)`.
- Report: ⚠ list under the calculations (click = field), highlighted fields (`.mc-invalid`).
- General reporting: “Data checks” section (« Contrôle des données ») (missions to correct, click = report).
- Family reporting: chart per period stacked by series (`charts.js` loaded by the
  15 pages), “Check” column; duplicate “New report” button removed from the body
  (it is in the header).
- `charts.js` injects its styles (theme through the variables `--muted`, `--soft`, `--mcg-grid`…).

## T. Step 15 — unified period and zoom, reporting headers, suite documentation (2026-09-24)

- `shared/time_period.js` rewritten as a single component: presets, dates always visible,
  ◀ / zoom out ×2 / ▶ bounded by the data, `zoomTo()` / `zoomOut()` called by the
  charts; shared mode (reportings) or driven mode (Landing Dashboard, period per file);
  millisecond precision for time-stamped events, rounded to days otherwise.
  Old API (`mount`, `read`, `write`, `range`, `filterRows`) kept.
- `charts.js`: bar periods (`start` / `end`), `enableZoom()` (drag, click, double-click).
- General reporting: period and filters in the sticky header; the `<header>` is no longer
  rewritten (the ☰ menu and the language had disappeared). Family reportings: family · series,
  new report, period, grouping and measure in the header.
- Landing Dashboard: dates and ◀ 🔍 ▶ replaced by the component (driven mode); the drag
  zoom of its charts goes through it; behaviour kept (period width,
  memory per file).
- Flight Planner: the SimBrief identifier of the common pilot profile is used first.
- Documentation: README (three applications + framework), user manual
  (chapters “Carburant” and “Atterrissages”), `technique/FRAMEWORK.md`,
  `docs/FRAMEWORK.md`.

## U. Step 16 — base (flight log), callsign series (2026-09-24)

- `shared/mission_core/defa_log.js`: reading of the saved “Log des vols” page (table
  with 9 columns, link to the fleet sheet), of a CSV or of a JSON; browser storage
  `defaFlightLog:v1` (excluded from browser_store); callsign series (patrol suffixes,
  noise, `ALIASES` variants); CSV / JSON export.
- Settings › Base (« Paramétrage › Base »): loading, statistics, series (“Add” / “Complete the
  mapping” (« Ajouter / Compléter la correspondance »)), filterable flights, export, clearing; “Other forms” column (`aliases`)
  in the callsign mapping.
- `aircraft.js`: the log is a source of known aircraft (without a callsign by default);
  `aliases` taken into account in the abbreviations. `assist.js`: trigrams (crew) and
  airfields of the log among the suggested values.
- `data/callsigns.js`: 49 series found in the log from 2025-05 to 2026-09 (≥ 3 flights;
  organisation deduced only if all the types agree) and 4 completed series (DRAGON,
  PELICAN, BENGALE, CHOUCAS); the log itself is not in the repository.

## V. Step 17 — report entry, folders, backup reminder (2026-09-24)

- Form: “+” in the title of the collections (framework `form.js`), crew at least 1;
  “now” button on all dates / times (`now` option of the form); Result
  block in 2nd position.
- `core.js`: time zone of the departure airfield (Europe/Paris by default) on the date of the mission;
  local time ⇄ UTC (identification, events); briefing time → report time;
  timeline events (types BRIEFING, ENGINE_START, OFF_BLOCK, MISSION_START,
  MISSION_END, ON_BLOCK, SHUTDOWN added, `source: timeline.<champ>`); authorities (history,
  otherwise department: `MissionVocab.departments`).
- `checkMission`: future date, invalid date.
- `shared/file_access.js` (framework, loaded by repository_nav): remembered folders, labels
  and tooltips, file picker opened in the configured folder for all the
  `<input type=file>`; Settings: “Configured folders” (« Dossiers paramétrés »); Flight Planner: performance
  folder remembered.
- `browser_store.js`: change counter, “Save” button (« Sauvegarder ») in the header from
  10, time stamp of the last backup.

## W. Step 18 — reference, common catalogue, alternative log (2026-09-24)

- `data/references/defa_reference.js` (committed) + `tools/defa_reference.py` + `DefaFlightLog.reference()`:
  aggregated pilots and aircraft, without flights or missions; “Reference” dataset in
  Settings (status, assignment, entry into service editable).
- `shared/aircraft_catalog.js` (framework): common types (ICAO + SUPPLEMENT moved from
  aircraft.js + local types) merged into `AIRCRAFT_DB`, aircraft and types; loaded
  by the 16 report / Settings pages, the Landing Dashboard and the Planner.
- Planner: types without a profile offered (“fleet, no profile” (« flotte, sans profil »)). Report: reference as a source
  of known aircraft, trigrams and airfields offered.
- Reportings: **Data** ledger / log (`DefaFlightLog.toMissions()`, families by
  label rules, read-only); `defa_log.js` loaded by the 16 reporting pages.

## X. Step 19 — aircraft / crew sheets, navigation of the reportings (2026-09-24)

- `shared/mission_core/sheets.js`, `apps/cr/appareil.html`, `apps/cr/equipage.html`: “loose”
  sheets (common catalogue, ledger, log, Flight Planner profile); local entry
  (status, assignment, entry into service, events, qualifications).
- General reporting: click on family → family reporting, aircraft → sheet, crew → sheet.
- `TimePeriod.zoomIn()`, `shift()`, `edges()`: before / after markers and zoom under the tables.
- Flight Planner: `?aircraft=<type>` (ICAO aliases resolved), links to the sheets of the aircraft
  of the active type.

## Y. Step 20 — grid editing, merges, log from the reportings (2026-09-24)

- `shared/mission_core/grid_edit.js`: grid editing (validated rules: end moved,
  time created, declared duration `timeline.declared`, trace `mission.history`); merging / renaming
  of aircraft and pilots (`missionMergeMap:v1`, sheets merged). `computeStatistics` and
  `checkMission` take the declared durations into account.
- Reportings: “✎ Edit in the table” button; “Data” menu always visible with
  “Load / update the log…” (`DefaFlightLog.loaderDialog`: tab-separated
  copy-paste or saved page, merge without duplicates — key = complete line).
- `form.js`: collections as a compact table (`layout: 'cards'` for the aircraft), “Aircraft sheet”
  link; routes offered for the same journey (departure / destination, pairs
  of stages); density altitude; `otherMissions` on the single ledger.
- Aircraft sheet: performance to 1 decimal place.

## Z. Fix — copy-paste windows (2026-09-24)

`FileAccess.pastePanel` (framework) applied to “Analyse / import…” (report), to the log window
and to the VATSIM history area: × and “Close”, button disabled if empty, “Confirm” (« Valider »)
after loading (closes), back to “Load” on entry.

## AA. Version 2.1.0, changelog, period on the sheets (2026-09-24)

- `repository_tree`: `release` 2.1.0 (+ `changelog`); footer (`app_framework.js`): the
  version links to `CHANGELOG.md` on framagit; `CHANGELOG.md` created (2.0.7 → 2.1.0).
- Aircraft / crew sheets: common period in the header, cards / chart / table
  filtered, zoom on the chart, before / after markers.
- `TimePeriod.edges()` keeps the classes of the container (the 2nd rendering lost the container).
