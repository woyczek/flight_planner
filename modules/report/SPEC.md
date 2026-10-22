# report — specification (regeneration prompt)

This document describes the V3 report module completely enough to rebuild it without seeing its code. The reference
implementation is `modules/report/module.js` (the screen), with `vocab.js`, `model.js`, `fpl.js`, `text_import.js`
and `families/*.js` copied from V2 (`shared/mission_core/`) unchanged but for their globals, and `frame/lib/last_flight.js` (shared pure code, owned by report) ported
from the V2 launcher (`tools/launch.py`). How the frame mounts it: [INTEGRATION.md](INTEGRATION.md). Choices and dates:
[DECISIONS.md](DECISIONS.md). What V2 did and what was kept: [READING.md](READING.md).

**As a prompt**: ask for ES modules (no build, no dependency) for the frame's loader (`meta`, `mount(el, ctx)`,
`unmount()`); every rule below is a requirement, section 7 (invariants) always wins.

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
  return bases, actual landing aerodrome, alternate. Then the **sources** (§ 6).
- **Mission**: family (the sixteen V2 families; a new report takes the family of my last saved report, HEMS the
  first time), series (the family's, first one by default), mission identifier (optional), the common "Task / mission
  order" block (objective, instructions, priority; folded) for the families without an order block of their own
  (`ownOrder`: FIRE, ISR, LE), then the family's blocks, the first one open, the others folded; collections with add
  and remove. A block or a field with a `when` condition is shown only when it holds for the mission (V2 context:
  family, series, capabilities, aircraft categories, family flags); a change of series redraws the step.
- **Result**: outcome, observations, crew (role from the family's roles, name; my trigram as aircraft commander in a
  new report), fuel unit, start and landing; the list of what is missing (registration, take-off and landing, crew,
  fuel, outcome) and the V2 consistency checks (date invalid or in the future, invalid time, times out of order,
  timeline over 20 h, final fuel above the start) as warnings.
- **Top**: the report number (or "Editing CR…") and "New report". **My last reports** is a folded list at the end
  of the Flight step, one line per report (number, date, registration, family; ten most recent of mine), a line
  reopens it for editing — never a screen of its own.
- **Save bar** (sticky): **Save**, and **Save and record on the website** (§ 3 bis); the latter is greyed with "website
  address not set" when the airline setting has no address.
- **Result step, folded "On the airline website"**: how the hand-off works, the "→ Vol" bookmark to drag to the
  bookmarks bar (a click on it in the suite only explains), "Copy the fields" (one line, for a phone).
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

## 3 bis. Recording the flight on the airline website

- The address is the airline setting's (`ctx.airline.site` + `pages.recordFlight`, or a full address in
  `pages.recordFlight`); never in the code.
- "Save and record on the website" opens, **inside the click** (a tab opened later is blocked), the website's form page
  with the flight in the fragment (`#defa=` + base64url of the JSON, never sent to the server), then saves the report.
- Fields (V2 rule): registration without dash, type, callsign series, flight-plan callsign, number, end date-time
  (report date + on-block, else landing, else shutdown; next day when it precedes the start), block time (else flight
  time) HH:MM, mission (family, sub-type, operation), departure and arrival ICAO.
- The "→ Vol" bookmark (V2's, unchanged) runs on the website: aircraft list → the aircraft's page → "Add a flight" →
  fills the form by field name, compares read-only fields, never submits. The suite never posts to the website and
  never handles the pilot's login.
- `frame/lib/website.js` (shared pure code, owned by the website module) holds all of it.

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
Carried: all sixteen — AAR, AIRBORNE, AIRLIFT, COMBAT, COMMAND, FIRE, FI, HADR, HEMS, ISR, LE, MARITIME, SAR, SOF,
SPECIAL, SURVEY (DEMO, a V2 demonstration family, is not carried). Their `flags`, `ownOrder`, `when` conditions and
`crewRoles` are honoured; `sensitive` fields (public version) and `idPrefix` belong to V2 and CPCO.

## 6. Prefill

Every source fills **empty fields only**; each filled field shows its source until it is edited; when the source
gave another value for fields already filled, a button offers "Replace the n fields already filled" (V2's rule).
Times are written in the device's time zone (V2 used the aerodrome's: aerodb has no time zone yet); helicopter
thresholds for the track when the aircraft (or the family's default category) is rotary.

- **Current flight** of fuel and maps (§ 2).
- **Last flight proposed at mount**: when the device is online and the identity has an IVAO VID (else a VATSIM CID),
  the flights of the last 7 days are read once (kept two minutes on the device, `cache/report/last_flights.json`) and
  the most recent is proposed in a card with **Use**: the report is then one tap from filled.
- **My last IVAO / VATSIM flight** (other sources): the same list; one flight is taken at once, several are listed to
  choose. IVAO: `/v2/tracker/sessions` (pilot connections of the VID, 7 days, five pages at most), consecutive sessions
  of the same flight cut by disconnections grouped (same callsign, reconnected within 30 min, not ended "On Blocks",
  resumed where it stopped at 600 kt at most), then the chosen flight's sessions, last flight-plan revision and tracks
  put end to end. VATSIM: `/v2/members/<cid>/history` and `/flightplans` (plan of the connection, else filed for the
  callsign between 12 h before and the end), no track. Both give an ICAO "(FPL-…)" text read like a pasted plan.
  Engine start ≈ connection when the track starts on the ground, take-off and landing from the track, shutdown ≈
  disconnection when it ends on the ground, distance and maximum altitude from the track.
- **SimBrief flight plan**: the last OFP of the identity's SimBrief id: aircraft, registration, equipment, route,
  waypoints, level, speed, distance, METAR / TAF, masses, fuel.
- **Paste**: an ICAO flight plan, an IVAO tracker "details" page, a StatSim flight page, the IVAO connection list, a
  METAR (V2 `text_import.js`).
- **Hand-over from another module**: `pilot/handoff.json` `{ to: 'report', from, source, at, values: { path: value } }`
  is read at every mount and removed: `open: '<record path>'` reopens that report; `fresh: true` (with `family`) starts
  a new report in that family, the hand-over's date replacing today's; then the values fill the empty fields like a
  source.
- Network refusals: offline → "nothing was requested"; IVAO without key or VATSIM without relay (no launcher) → said,
  and the paste box opens (the flight page can be pasted instead).

## 7. Invariants

1. Nothing blocks a save; checks are warnings.
2. A record is the V2 entry plus `schema`, `updated_at`, `by`: the bridge never has to translate a field.
3. The module writes only `cr/reports/` and its device cache; it never writes `cr/missions.yaml`.
4. Network only through `ctx.net`; no token, no key, no native dialog, no global style sheet.
