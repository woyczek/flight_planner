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
- **The current flight** (`pilot/<trigram>/current_flight.json`, fuel and maps) is only read: aircraft registration and
  type, route departure, arrival, alternate, distance, level.

## 4. Example

```js
// a report saved by the module
{ "schema": "sog-report/1", "updated_at": "2026-10-23T09:12:00Z", "by": "RBR",
  "schemaVersion": 2, "family": "HEMS", "series": "Primary HEMS",
  "metadata": { "missionId": "CRM-A03-0", "date": "2026-10-23", "reportedBy": "RBR", ... },
  "aircraft": [{ "registration": "F-ZBQU", "type": "EC45", ... }],
  "timeline": { "takeoff": "10:05", "landing": "11:20", ... },
  "missionData": { "hems": { "service": "SAMU / SMUR", "patients": 1, "destinations": [{ "name": "CHU Purpan" }] } },
  "results": { "outcome": "SUCCESS" }, "statistics": { "flightMinutes": 75, ... } }
```
