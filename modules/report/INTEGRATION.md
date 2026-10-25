# report — integration

How the frame mounts the report module, what it reads and writes, and what the launcher's bridge reads. Rules of the
module: [SPEC.md](SPEC.md); the frame's adapter: [frame/INTEGRATION.md](../../frame/INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `modules/report/module.js` | the module: `meta`, `mount(el, ctx)`, `unmount()`; the three steps, the draft, saving |
| `modules/report/vocab.js` | lists and numbers of V2 (`crId`, outcomes, crew roles, families, fuel units), unchanged |
| `modules/report/model.js` | the V2 mission model (`emptyMission`, paths, durations, statistics, checks), unchanged |
| `modules/report/families/*.js` | the sixteen V2 families (series, roles, events, blocks, `when` conditions), unchanged but for their imports and export; no statistics, summary or legacy import |
| `modules/report/fpl.js` | V2 flight plan: equipment codes, levels, SimBrief / IVAO / VATSIM plans, filling a mission; network through `configure({ getJson })` |
| `modules/report/text_import.js` | V2 analysis of a pasted text (FPL, IVAO tracker page, StatSim, IVAO list, METAR), track, filling |
| `frame/lib/website.js` (owner website) | V2's hand-off to the airline website (flight fields, `#defa=` address, copy line, "→ Vol" bookmark); to move into `modules/website` |
| `frame/lib/last_flight.js` | shared pure code, owned by report: the V2 launcher's "last flight" (IVAO sessions, VATSIM history) in JavaScript, network passed in; also used by flightlog |
| `modules/report/READING.md` | lot 1: what V2 does and what the module keeps |

## 2. Mounting

The Pilot application lists it in `frame/app.js` (`{ id: 'report', label: Report, icon: '✎' }`). `meta`:

```js
reads: ['cr/', 'pilot/', 'cache/report/'],
writes: [
  { prefix: 'cr/reports/', merge: 'record' },        // one JSON record per report
  { prefix: 'cache/report/', policy: 'cache' },      // the draft, the last flights read, my last family: this device only
  { prefix: 'pilot/handoff.json', policy: 'cache' }  // hand-over record, removed once taken
],
files: ['vocab.js', 'model.js', 'fpl.js', 'text_import.js', '../../frame/lib/last_flight.js', '../../frame/lib/website.js', 'families/<each family>.js']
```

**Title and help (rule 16)**: `meta.title` is the title row (the `h1` draws from it; on a phone the frame shows it in the
header and clips the `h1`); `ctx.helpAnchor` is called once at `mount()`: `report-step-<n>` of the step shown (the step bar is
displayed), `report-steps` when the three steps are side by side; the anchors are in `help/<lang>.md`.

`ctx` used: `data` (get, put, remove, list), `t`, `lang`, `notify`, `identity` (`trigram` for the author and the
current flight's path, `ivao`, `vatsim`, `simbrief` for the prefill), `aerodb` (`aircraft().record`: model and rotary
wing of a type), `airline` (`site`, `pages.recordFlight`: the website's "add a flight" page, from the frame's
`airline/settings.json`; `{}` greys the website button), `net`:

- `https://api.ivao.aero/v2/tracker/sessions…` (list, a session, its `flightPlans`, its `tracks`): needs the launcher's
  relay (IVAO key); without it the 401 is reported and the paste offered.
- `https://api.vatsim.net/v2/members/<cid>/history` and `/flightplans`: relayed by the launcher (no CORS).
- `https://www.simbrief.com/api/xml.fetcher.php?userid|username=…&json=1`: direct or relayed.

**Hand-over to report** from another module: write `pilot/handoff.json` (cache policy) as `{ to: 'report', from:
'<module>', source: '<label shown on the fields>', at, values: { '<mission path>': value } }` — or `{ to: 'report',
open: '<cr/reports/… path>' }` to reopen a report, `fresh: true, family: '<id>'` to start a new one —, then open `#report`
(`#report?from=<module>` once the frame routes addresses with a query). Report takes it at its next mount, fills the
empty fields, and removes it.

## 3. What other modules and the bridge read

- **Reports**: `cr/reports/<year>/<CR number>.json`, schema `sog-report/1` (SPEC § 4). The record is the V2 registry
  entry plus `schema`, `updated_at`, `by`.
- **The bridge to V2** (frame session, launcher side): at every batch received (`/__setup/batch`) and every exchange,
  every record of `cr/reports/` is replayed into `cr/missions.yaml` by V2's registry merge — drop `schema`,
  `updated_at` and `by`, then merge by `family|metadata.missionId|metadata.date`. Without a launcher, the V2 registry
  is updated at the next pass of a workstation that has one.
- **The current flight** (`pilot/<trigram>/current_flight.json`, fuel and maps) is only read: aircraft registration,
  callsign and type (fuel's `aircraft`, from aerodb's `aircraftOf`), route departure, arrival, alternate, distance,
  level, `quote { block, unit, … }` and `started { at, by }` (fuel's "Start the flight"): a started flight is offered
  first, "Flight started at hh:mm"; the card's line lists everything taken (distance and level too, even when the
  family has no field for them). "Use" also fills `timeline.engineStart` with `started.at` (UTC, like every time of the
  report; source "Flight started (fuel)") and `fuel.start` / `fuel.unit` with the quote's block fuel (source
  "Fuel quote"). Levels are written with `formatLevel` (`frame/lib/route_text.js`). Once a report that used it is saved, its `started.at` goes into `cache/report/started.json`
  (`{ done: [at, …] }`, the last 20, device only, kept as a guard against offering it twice) and the card no longer offers
  it.
- **Report ends a started flight**: saving the report that took the started flight up rewrites the current flight
  (read just before, `frame/lib/current_flight.js` `merge`) with `started: null`, the planned progress cleared and
  `by: 'report'`, nothing else changed — `progress.actual` belongs to the frame and stays — fuel goes
  back to planning, My flights drops "in progress", the frame stops the real position, the map clears the flight in
  progress. `meta.writes` declares `pilot/` (record) for it. Who writes `started`: fuel at the start and at a
  cancellation, report at the report's saving.

## 3 bis. Times of a report (`timeline.tz`, since 23 Oct 2026)

- A report written by V3 carries `timeline.tz = "Z"`: its times (`timeline.*`: briefing, engine start, off-block,
  take-off, zone, mission, landing, on-block, shutdown) are UTC "HH:MM", and `metadata.date` is the UTC day of a new
  report. The fields say "(Z)".
- A report without the marker (V2, older V3) has the device's times. Report shows them converted to UTC (the report's
  date as the day, summer time included) with "entered 18:30 local" under each field, and rewrites them in UTC with
  the marker only when the report is saved; nothing is migrated in bulk. Its `metadata.date` never changes (it is part
  of the V2 registry key: family | number | date).
- The imports fill in UTC: the started flight (`started.at`), the network (IVAO / VATSIM, `text_import.apply` with
  `tz: 'UTC'`), the day from the same instants.
- The bridge to V2 (`tools/report_bridge.py`) copies the record as it is, `timeline.tz` included. The passage to the
  airline's website keeps the site form's convention: the values go as they are, without conversion (website SPEC § 5).
- Readers: a time is UTC when `timeline.tz === 'Z'`, else the device time of whoever wrote it.

## 4. Example

```js
// a report saved by the module
{ "schema": "sog-report/1", "updated_at": "2026-10-23T09:12:00Z", "by": "RBR",
  "schemaVersion": 2, "family": "HEMS", "series": "Primary HEMS",
  "metadata": { "missionId": "CRM-A03-0", "date": "2026-10-23", "reportedBy": "RBR", ... },
  "aircraft": [{ "registration": "F-ZBQU", "type": "EC45", ... }],
  "timeline": { "tz": "Z", "takeoff": "10:05", "landing": "11:20", ... },
  "missionData": { "hems": { "service": "SAMU / SMUR", "patients": 1, "destinations": [{ "name": "CHU Purpan" }] } },
  "results": { "outcome": "SUCCESS" }, "statistics": { "flightMinutes": 75, ... } }
```
