# flightlog — reading of V2 "My flights" (lot 1)

*23 October 2026. From `apps/pilot/mes_vols.html` and `shared/my_flights.js` (V2, untouched on develop). No code.
Decisions: [DECISIONS.md](DECISIONS.md).*

## 1. Sources of a flight and their key

A flight is `{ source, date, time, callsign, type, reg, dep, arr, block (min), mission, family, crId, notes }`.
**Key** (V2 `keyOf`): `date | callsign | registration`, letters and digits only. Merge: one row per key; a report
wins over any other source (V2 rule), then the website log, then a network session.

| Source | V2 | V3 |
|---|---|---|
| My reports | `cr/missions.yaml` through the ledger, filtered on `reportedBy` | `cr/reports/**.json` (report module's records) **and** `cr/missions.yaml` (V2 reports, text parsed) through `ctx.data`; mine = `by` / `metadata.reportedBy` = my trigram (none noted: kept) |
| Airline website log | pasted in V2 (`defaFlightLog:v1`, localStorage), my trigram's rows | read by the **website** module, which keeps it where flightlog can read it (proposal: `website/flight_log.json`, keyed per row); never fetched by flightlog |
| IVAO / VATSIM sessions | none (an `addSource` hook) | `ctx.net` with report's `last_flight.js` (7 days; longer windows to agree), only when online; never stored as flights, shown as "network" rows until a report or the log covers them |

Ties: a network flight whose callsign has no registration matches a log or report row on `date | callsign`. Times
of a report are local (HH:MM); network times are UTC, converted on the device.

## 2. What the Pilot application shows

- **One line per flight**, most recent first: date, callsign, aircraft (type and registration), route (dep → arr),
  block time, mission, report (number, or "Write the report").
- **Filters**: period (7 days, 31 days, 1 year — default, all), free search on callsign, type, registration,
  aerodromes, mission, report number; "without report" as a third filter (V2 had it as a tile only).
- **Totals** above the list: flights, block hours, flights without a report, the three most flown types.
- **CSV export** of the filtered list (V2 columns: date, callsign, aircraft, route, block, mission, report; `;`,
  BOM, quoted).
- **"Write the report"** on a flight without one: writes `pilot/handoff.json` `{ to: 'report', from: 'flightlog',
  source: 'My flights', values: { 'metadata.date', 'aircraft.0.callsign', 'aircraft.0.type',
  'aircraft.0.registration', 'navigation.dep', 'navigation.arr', … } }` and opens `#report` (V2 went through
  `siaMissionToCr:v1` + `?from=sia`). "Open the report" on a reported flight: `#report` with the report to reopen
  (hand-over `{ open: '<path>' }`, to add to report).
- **Moved out**: the global analysis (CPCO), the aircraft silhouettes of V2's equipment editor (design, later).

## 3. The phone

A list of one-line rows (date, callsign, route, block; a dot when no report); a tap unfolds the details (source,
time, aircraft, mission, notes) with **Write / Open the report**. Totals as three tiles above; period and search in
one row; CSV in a folded "More". On a desktop the same list as a table, details folded under the row.

## 4. Pure model in `shared/my_flights.js`

Pure, to copy: `keyOf`, the row mapping of a report (`cr` source: first aircraft, callsign from prefix and number,
departure = navigation or base, arrival = landing aerodrome, else navigation, else return base, block = statistics),
the row mapping of a log record, `collect`'s merge (report wins, sorted by date and time), and from the page the
filter (`shown`), totals and CSV. Not pure: the trigram from profiles and localStorage (→ `ctx.identity`), the
ledger and log loading (→ `ctx.data`), `writeReport` (→ hand-over record), `addSource` (→ the module's own network
source). `defa_log.js`'s `familyOf` (family from mission text, callsign, type) gives the family proposed to report.
