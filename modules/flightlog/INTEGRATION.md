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

**Title and help (rule 16)**: `meta.title` is the title row (the `h1` draws from it; on a phone the frame shows it in the header
and clips the `h1`); `ctx.helpAnchor` is called once at `mount()`: `flightlog-detail` while a line is unfolded,
`flightlog-current` while a started flight is listed, else `flightlog-list`; the anchors are in `help/<lang>.md`.

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
{ "schema": 2, "updated_at": "2026-10-24T12:00:00Z",
  "flights": [ { "date": "2026-10-23", "dep": "LFRS", "arr": "LFML", "registration": "F-ZBMC", "source": "website",
                 "handoff": { "family": "HEMS",
                              "values": { "metadata.date": "2026-10-23", "aircraft.0.callsign": "SAMU 31",
                                          "aircraft.0.type": "EC45", "aircraft.0.registration": "F-ZBMC",
                                          "navigation.dep": "LFRS", "navigation.arr": "LFML",
                                          "metadata.operationName": "EVASAN" } } } ] }
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
- `handoff` (schema 2): exactly what the module's own "Write the report" action hands to report for that flight, built by
  the one function `handoffOf` in `model.js` (the action spreads it, the record embeds it): `family` (the proposed
  family) and `values` (mission paths of SPEC § 5, empty ones left out: date, call sign, type, registration, departure,
  arrival, and the mission text of a website-log flight). The record carries no times: the action fills none.
- **For the frame**: to write the report of a line, write `pilot/handoff.json` (policy `cache`, as flightlog does) =
  `{ "to": "report", "from": "flightlog", "source": "<label shown on the fields>", "at": "<ISO date>", "fresh": true,
  "family": handoff.family, "values": handoff.values }`, then navigate to `#report?from=flightlog`. Report reads no
  query key (`ctx.query` is unused in `modules/report/module.js`); it takes `pilot/handoff.json` at its next mount,
  starts a new report in that family with the flight's date and fills the empty fields (report INTEGRATION § 2). Nothing
  else of the address is read, so `date`, `dep` and `arr` need not be passed.
