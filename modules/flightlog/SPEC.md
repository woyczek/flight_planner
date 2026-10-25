# flightlog — specification (regeneration prompt)

This document describes the V3 flightlog module ("My flights") completely enough to rebuild it without seeing its
code. Reference implementation: `modules/flightlog/module.js` (the screen) and `modules/flightlog/model.js` (pure);
shared pure code from `frame/lib/` (`last_flight.js`, owned by report; `js-yaml.min.js`). How the frame mounts it:
[INTEGRATION.md](INTEGRATION.md). Choices and dates: [DECISIONS.md](DECISIONS.md). What V2 did: [READING.md](READING.md).

**As a prompt**: ask for ES modules for the frame's loader (`meta`, `mount(el, ctx)`, `unmount()`), no import from
another module; section 6 (invariants) always wins.

## 1. Purpose

The pilot's past flights, one line per flight, most recent first, from every source without duplicates, with
totals, filters, a CSV export, and the way to write (or open) the report of a flight.

## 2. Flights and sources

A flight: `{ source ('cr' | 'log' | 'net'), date (YYYY-MM-DD), time (HH:MM), callsign, type, reg, dep, arr, block
(minutes), mission, family, crId, path (V3 report record), network, notes }`.

- **My reports**: every `cr/reports/**.json` record (report module, schema `sog-report/1`) and every entry of the V2
  registry `cr/missions.yaml` (text read with js-yaml) until the launcher's bridge has replayed everything; mine =
  author (`by`, else `metadata.reportedBy`) equal to my trigram, or no author noted. Row (V2 rule): first aircraft;
  callsign full, else series + number; departure = navigation, else departure base; arrival = actual landing
  aerodrome, else navigation, else return base; block = statistics (block, else flight), else the times; mission =
  family · sub-type · operation.
- **Airline website log**: `pilot/<trigram>/site_log.json`, written by the website module (§ 3), read only here.
- **Network**: the IVAO and VATSIM sessions of the last 7 days of the identity's VID / CID (`frame/lib/last_flight.js`
  through `ctx.net`), kept two minutes on the device, never written as flights. Date and time in the device's zone,
  block = connection to disconnection, no type or registration.
- **Key**: `date | callsign | registration`, letters and digits only. **Merge**: one row per key, the report wins over
  the log, the log over the network; a network flight is also covered by a better row of the same date and callsign
  (it has no registration). A kept row without a block time takes the covered row's.
- **Family** proposed for a flight without a report (V2 `familyOf`): rules on the mission text (fire, rescue, medical,
  airdrop…), then callsign and type (PELIC → FIRE, SAMU → HEMS, K35R → AAR…), else SPECIAL.

## 3. Website log schema (`pilot/<trigram>/site_log.json`, record)

`{ "schema": 1, "updated_at": ISO date, "by": "website", "entries": [ { "date": "YYYY-MM-DD", "time": "HH:MM",
"durationMin": number | null, "trigram": "ABC", "callsign": "PELICAN 41", "registration": "F-ZBMG", "type": "CL2T",
"variant": "", "dep": "LFMY", "arr": "LFMY", "mission": "FEU" } ] }` — one entry per line of the site's flight log
for this pilot (V2 `defa_log.js` record fields). The website module writes it whole; flightlog never writes it.

## 4. Screen

- **Three tiles**: flights, block hours, flights without a report; below, the three most flown types.
- **Filters** in one row: period (7 days, 31 days, 1 year — default —, all), search (callsign, type, registration,
  aerodromes, mission, report number), "Without report"; kept on the device (`cache/flightlog/view.json`).
- **List**: one line per flight — on a phone date (MM-DD), callsign · route, block, with a dot when there is no report;
  on a wide screen (980 px) date, callsign, aircraft, route, block, report or mission. A tap unfolds the details:
  source (report, website log, IVAO / VATSIM network, "in progress"), date and time, aircraft, mission, notes, report
  number, then **Write the report** (no report) or **Open the report** (a V3 report; a V2 registry report says to open
  it in the full suite).
- **More** (folded): **Export (CSV)** of the filtered list (V2 columns date, callsign, aircraft, route, block, mission,
  report; `;`, quoted, BOM, CRLF), **Read IVAO / VATSIM again** (refusals said: offline, launcher needed).
- The list is redrawn when a report is saved or received (`cr/`) and when the website log changes.
- **Published for the frame** (`cache/flightlog/pending.json`, INTEGRATION § 5): the flights without a report (same
  rule as the "Without report" filter), newest first, five at most, last 30 days, each with the `handoff` the "Write the report" action would hand to report (same function), rewritten only when they change.

## 5. Hand-over to report

`pilot/handoff.json` (cache policy), then the address `#report`:
- write: `{ to: 'report', from: 'flightlog', source: 'My flights', at, fresh: true, family, values: { 'metadata.date',
  'aircraft.0.callsign', 'aircraft.0.type', 'aircraft.0.registration', 'navigation.dep', 'navigation.arr',
  'metadata.operationName' (log mission) } }` — report starts a new report in that family, the flight's date replacing
  today's, and fills the empty fields;
- open: `{ to: 'report', from: 'flightlog', at, open: '<cr/reports/… path>' }` — report reopens that report.

## 6. Invariants

1. Flightlog writes only its device cache and the hand-over record; it never writes reports, the log or flights.
2. A flight appears once, from its best source.
3. Network only through `ctx.net`; no module imports another module (shared code in `frame/lib/`).
