# flightlog — integration

How the frame mounts "My flights", what it reads and writes. Rules: [SPEC.md](SPEC.md); the frame's adapter:
[frame/INTEGRATION.md](../../frame/INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `modules/flightlog/module.js` | the module: `meta`, `mount(el, ctx)`, `unmount()`; tiles, filters, list, details, CSV, hand-over |
| `modules/flightlog/model.js` | pure: rows of a report, a log entry, a network session; key, merge, filter, totals, CSV, family, report values |
| `frame/lib/last_flight.js` | shared pure code (owner: report): IVAO / VATSIM flights of the last 7 days |
| `frame/lib/js-yaml.min.js` | shared library (js-yaml 4.1.0, MIT; owner: flightlog): reads the V2 registry `cr/missions.yaml` |
| `modules/flightlog/READING.md` | lot 1: what V2 "My flights" does |

## 2. Mounting

`frame/app.js` lists it after report (`{ id: 'flightlog', label: My flights, icon: '☰' }`). `meta`:

```js
reads: ['cr/', 'pilot/', 'cache/flightlog/'],
writes: [
  { prefix: 'pilot/handoff.json', policy: 'cache' },   // hand-over to report
  { prefix: 'cache/flightlog/', policy: 'cache' }      // filters, network sessions read (two minutes)
],
files: ['model.js', '../../frame/lib/last_flight.js', '../../frame/lib/js-yaml.min.js']
```

`ctx` used: `data` (get, list, put, watch), `t`, `notify`, `identity` (`trigram`, `ivao`, `vatsim`), `net`
(IVAO through the launcher's relay and key, VATSIM relayed; without a launcher the refusal is said).

## 3. For the website module

Write `pilot/<trigram>/site_log.json` as in SPEC § 3 (record, whole, `updated_at`); flightlog redraws on change.

## 4. For the report module

Report reads `pilot/handoff.json` at every mount: `{ open }` reopens a report, `{ fresh, family, values }` starts a new
one (SPEC § 5).
