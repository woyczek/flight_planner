# report — specification (regeneration prompt)

This document describes the V3 report module completely enough to rebuild it without seeing its code. The reference
implementation is `modules/report/module.js` (the screen), with `vocab.js`, `model.js` and `families/*.js` copied from
V2 (`shared/mission_core/`) unchanged. How the frame mounts it: [INTEGRATION.md](INTEGRATION.md). Choices and dates:
[DECISIONS.md](DECISIONS.md). What V2 did and what was kept: [READING.md](READING.md).

**As a prompt**: ask for ES modules (no build, no dependency) for the frame's loader (`meta`, `mount(el, ctx)`,
`unmount()`); every rule below is a requirement, section 6 (invariants) always wins.

## 1. Purpose

The mission report of the Pilot application, written with as few gestures as possible on a phone and on a desktop. A
report is not necessarily attached to a mission. Three steps: **Flight · Mission · Result**. Nothing is required;
what is missing is said in the Result step, never blocking.

## 2. Screen

- **Phone** (below 980 px): one step at a time, a step bar at the top (a ✓ on a step that has its essentials: flight =
  registration, or type and callsign, and take-off and landing; mission = series; result = outcome), "Next" at the
  bottom of a step, the save button sticky at the bottom of the screen.
- **Desktop** (980 px and wider): the three steps side by side, no step bar, no "Next".
- **Flight**: a "current flight" card when `pilot/<trigram>/current_flight.json` (fuel and maps) has an aircraft or a
  route — "Use" fills the empty fields only (registration, type, departure, arrival, alternate, distance, level), each
  filled field shows its source until it is edited. Then date, registration, type, full callsign, departure,
  arrival, engine start, take-off, landing, shutdown; folded: callsign parts, flight plan callsign, departure and
  return bases, actual landing aerodrome, alternate.
- **Mission**: family (every V2 family listed; those not carried yet are disabled), series (the family's, first one
  by default), mission identifier (optional), then the family's blocks, the first one open, the others folded;
  collections (HEMS destinations) with add and remove.
- **Result**: outcome, observations, crew (role from the family's roles, name; my trigram as aircraft commander in a
  new report), fuel unit, start and landing; the list of what is missing (registration, take-off and landing, crew,
  fuel, outcome) and the V2 consistency checks (date invalid or in the future, invalid time, times out of order,
  timeline over 20 h, final fuel above the start) as warnings.
- **Top**: the report number (or "Editing CR…"), "New report", "My last reports" (folded; ten most recent of mine,
  reopened for editing).
- **Draft**: every change is kept on the device (`cache/report/draft.json`, after a quiet time) and restored at the
  next mount with a notice; saving removes it.
- Texts in four languages (labels of V2); codes typed in capitals; time and date fields of the device.

## 3. Saving

- **Number** at the first save (V2 `crId`): with a mission identifier, `CR<mission>-<next attempt>` (`CRM-016-2`);
  without, the next free number of the family's letter, `CR<letter>-<A01…>-0` (`CRM-A03-0`). Numbers already taken are
  read from the paths of `cr/reports/` and from the `missionId` entries of `cr/missions.yaml` (V2 reports).
- **Statistics** computed (V2 `computeStatistics`: block, flight, transit, on-station minutes, fuel used, counts),
  `metadata.reportedBy` = my trigram.
- **One record per report**: `cr/reports/<year of metadata.date>/<metadata.missionId>.json`, written whole with a new
  `updated_at`; a later save of the same report rewrites the same path (its year does not move if the date changes).
- After the first save the screen is in editing mode; "New report" starts a fresh one.

## 4. The record (schema `sog-report/1`)

The record is the V2 registry entry (`shared/mission_core/model.js`, `emptyMission`, `schemaVersion: 2`) with three
keys added. **To the V2 YAML entry**: drop `schema`, `updated_at`, `by`; every other key is copied as is into the
`missions[]` list of `cr/missions.yaml` (identity key `family|metadata.missionId|metadata.date`).

| Key | Type | Meaning | V2 YAML entry |
|---|---|---|---|
| `schema` | `'sog-report/1'` | record format | dropped |
| `updated_at` | ISO date | last save, decides a conflict (merge `record`) | dropped |
| `by` | trigram | who saved last | dropped (`metadata.reportedBy` carries it) |
| `schemaVersion` | 2 | V2 model version | same |
| `family`, `series`, `subtype` | text | family id (HEMS…), series value, sub-type | same |
| `metadata` | object | `missionId` (CR number), `missionNumber` (mission flown, optional), `formerMissionId`, `serial`, `date` (YYYY-MM-DD), `timeLocal`, `timeUtc`, `classification`, `context` (EXERCISE / REAL), `operationName`, `orderRef`, `reportedBy` | same |
| `organisation` | object | `organisation`, `unit`, `detachment`, `requestingAuthority`, `controllingAuthority` | same |
| `aircraft[]` | list | `category`, `type`, `variant`, `registration`, `tacticalNumber`, `callsign`, `callsignPrefix`, `callsignNumber`, `callsignFpl`, `operatorCode`, `landingAd`, `baseDeparture`, `baseReturn`, `massTakeoff`, `massLanding`, `enduranceMinutes`, `configuration`, `equipment[]` | same |
| `crew[]` | list | `role` (PIC, COPILOT, DOCTOR…), `name`, `aircraft` (number), `notes` | same |
| `tasking` | object | `objective`, `instructions`, `priority` | same |
| `environment` | object | `metar`, `taf`, `wind`, `temperature`, `qnh`, `visibility`, `ceiling`, `precipitation`, `turbulence`, `icing`, `seaState`, `illumination`, `sunrise`, `sunset`, `dayNight` | same |
| `navigation` | object | `dep`, `arr`, `altn`, `route`, `waypoints`, `coordinates`, `altitude`, `minAltitude`, `speed`, `distanceNm`, `area`, `radiusNm`, `corridor`, `orbit` | same |
| `capabilities[]` | list | capability codes | same |
| `timeline` | object | `briefing`, `engineStart`, `offBlock`, `takeoff`, `zoneEntry`, `missionStart`, `missionEnd`, `zoneExit`, `landing`, `onBlock`, `shutdown` (HH:MM) | same |
| `fuel` | object | `unit` (kg, lb, L, USG), `start`, `taxi`, `takeoff`, `onTaskArrival`, `onStation`, `taskDeparture`, `landing`, `block`, `reserve`, `diversion` | same |
| `legs[]`, `events[]` | list | legs (from, to, times, pax, cargo) and events (time, type, position…) | same |
| `missionData.<family>` | object | the family's data; HEMS: `service`, `outcome`, `resources`, `incidentType`, `patientProfile`, `medicalization`, `patients`, `sceneLocation`, `coordinates`, `conditions`, `weatherRemarks`, `densityAltitude`, `medicalNotes`, `alert`, `patientContact`, `destinationArrival`, `destinations[]` { `name`, `arrival`, `departure`, `note` } | same |
| `results` | object | `outcome` (SUCCESS, PARTIAL_SUCCESS, ABORTED, CANCELLED, DIVERTED…), `detail`, `interruptionReason`, `incidents`, `anomalies`, `causes[]` | same |
| `remarks` | object | `observations`, `lessonsLearned` | same |
| `network` | object | `onlineNetwork`, `ivaoId`, `vatsimId`, `trackerUrl` | same |
| `statistics` | object | computed at save, values that exist only | same |

## 5. Families

A family is an ES module (`families/<id>.js`, default export) copied from V2 `shared/mission_core/families/`: `id`,
`defaultCategory`, `hide`, `title`, `series` [{ value, label }], `crewRoles`, `events`, `blocks` [{ id, title,
fields | collection }] with fields { path, label [fr, en, de, es], type (text, number, time, date, select, textarea),
options, blank, full }. Statistics, summary sentences and old-format converters stay with V2 (reporting, CPCO).
Carried today: **HEMS**. Next: FIRE, SPECIAL, then the others.

## 6. Invariants

1. Nothing blocks a save; checks are warnings.
2. A record is the V2 entry plus `schema`, `updated_at`, `by`: the bridge never has to translate a field.
3. The module writes only `cr/reports/` and its device cache; it never writes `cr/missions.yaml`.
4. No network call in this lot; no token, no key, no native dialog, no global style sheet.
