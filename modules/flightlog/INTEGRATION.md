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
| `modules/flightlog/test/pending.html` | bench of `pending` (the record's flights): two without a report, one with, one too old, the limits |
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

**The flight in progress** (23 Oct 2026): flightlog reads `pilot/<trigram>/current_flight.json` (`started { at,
diverted }`, aircraft, route) and `cache/report/started.json` (`{ done: [at, …] }`, written by report when a report
that used the started flight is saved; `meta.reads` gains `cache/report/`). A started flight not yet done is shown on
top, "In progress — started at hh:mm"; its "Write the report" opens `#report?from=flightlog`, where report offers the
started flight first (no handoff: report's own "Use" marks it done on save).

## 5. What flightlog publishes for the frame

`cache/flightlog/pending.json` (24 Oct 2026; policy `cache`, declared by the prefix `cache/flightlog/` of `meta.writes`:
this device only, never synchronised). The frame's "i" button reads it to draw its "report to write" lines.

```json
{ "schema": 1, "updated_at": "2026-10-24T12:00:00Z",
  "flights": [ { "date": "2026-10-23", "dep": "LFRS", "arr": "LFML", "registration": "F-ZBMC", "source": "website" } ] }
```

- `flights`: the flights **without a report** that the module finds (the rule of its "Write the report" action and of
  the "Without report" filter: the best row of the flight is the website log or a network session, not a report),
  newest first, **5 at most**, **within the last 30 days** (by the flight's date), `source` ∈ `website | ivao | vatsim`;
  an empty array when nothing is pending. `dep`, `arr` and `registration` are empty strings when unknown (a network
  session has no registration). The flight in progress started in fuel is not in the list (the frame has its own line
  for it).
- Computed by `pending` in `model.js`, the one function behind the record (and built on the same filter as the list).
- Written through `ctx.data` at mount and each time the list is refreshed (a report saved or received, the website log
  changed, the network read again), and **only when `flights` changes** (`updated_at` does not count). At the first
  mount of a pilot with an IVAO / VATSIM id the write waits for the network read, so the record does not lose then regain
  the network flights.
- **For the frame**: navigate to `#report?from=flightlog&date=<date>&dep=<dep>&arr=<arr>`. **Report reads no query key
  today**: `ctx.query` is not used by `modules/report/module.js`, which only reads `pilot/handoff.json` at mount (and
  offers the started flight first). `from=flightlog`, `date`, `dep` and `arr` are ignored, so such a line opens the
  report as it is. To start the report of that very flight, the frame (or report, by agreement of the ergonomics
  session) writes the hand-over of SPEC § 5 (`pilot/handoff.json`, `fresh`, `values`) before navigating; flightlog does
  not write it for a line it does not draw.
