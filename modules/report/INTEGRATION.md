# report — integration

How the frame mounts the report module, what it reads and writes, and what the launcher's bridge reads. Rules of the
module: [SPEC.md](SPEC.md); the frame's adapter: [frame/INTEGRATION.md](../../frame/INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `modules/report/module.js` | the module: `meta`, `mount(el, ctx)`, `unmount()`; the three steps, the draft, saving |
| `modules/report/vocab.js` | lists and numbers of V2 (`crId`, outcomes, crew roles, families, fuel units), unchanged |
| `modules/report/model.js` | the V2 mission model (`emptyMission`, paths, durations, statistics, checks), unchanged |
| `modules/report/families/hems.js` | the HEMS family of V2 (series, roles, blocks), unchanged but for its export |
| `modules/report/READING.md` | lot 1: what V2 does and what the module keeps |

## 2. Mounting

The Pilot application lists it in `frame/app.js` (`{ id: 'report', label: Report, icon: '✎' }`). `meta`:

```js
reads: ['cr/', 'pilot/', 'cache/report/'],
writes: [
  { prefix: 'cr/reports/', merge: 'record' },        // one JSON record per report
  { prefix: 'cache/report/', policy: 'cache' }       // the draft: this device only
],
files: ['vocab.js', 'model.js', 'families/hems.js']   // kept for offline from the first visit
```

`ctx` used: `data` (get, put, remove, list), `t`, `lang`, `notify`, `identity` (`trigram` for the author and the
current flight's path, `ivao` and `vatsim` copied into a new report). No `ctx.net` in this lot.

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
