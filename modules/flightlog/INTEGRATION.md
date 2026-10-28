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
| `modules/flightlog/test/pending.html` | bench of `pending` and `statusLines` (the status lines for the frame): two without a report, one with, one too old, the limits, texts ×4 in UTC, the site log unconverted |
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

`cache/flightlog/status.json` (28 Oct 2026, frame/INTEGRATION § 10.0; policy `cache`, declared by the prefix
`cache/flightlog/` of `meta.writes`: this device only, never synchronised): **status lines ready to show**. The frame
checks them and shows them in the Status block of Settings and as the green badge of the ⚙; it knows nothing of
flightlog's formats.

```json
{ "schema": 1, "updated_at": "2026-10-28T09:00:00Z",
  "lines": [ { "text": ["CR à écrire pour le vol du 22/10/2026 16:30Z LFRS→LFML", "Report to write for the flight of 22/10/2026 16:30Z LFRS→LFML",
                        "Bericht zu schreiben für den Flug vom 22.10.2026 16:30Z LFRS→LFML", "Informe por escribir del vuelo del 22/10/2026 16:30Z LFRS→LFML"],
               "go": "#report?from=flightlog", "news": true,
               "handoff": { "to": "report", "family": "HEMS",
                            "values": { "metadata.date": "2026-10-22", "aircraft.0.callsign": "DRAGON 30",
                                        "navigation.dep": "LFRS", "navigation.arr": "LFML" } } } ] }
```

- One line per flight **without a report** (the rule of the "Without report" filter and of "Write the report": the best
  row of the flight is the website log or a network session), newest first, **5 at most**, **last 30 days** (`pending`'s
  selection, `pendingFlights` in `model.js`). The flight in progress started in fuel is not there (the frame has its own
  line for it).
- `text`: the frame's wording ×4 (fr, en, de, es), the day in the language's writing and the time in UTC when it is known
  ("22/10/2026 16:30Z": a report or a network session, `whenZ`); a website-log flight keeps its day as the site wrote it,
  without conversion. `go`: `#report?from=flightlog`; `news: true` (green badge). `handoff`: `{ to: 'report', family,
  values }`, exactly what "Write the report" hands over (`handoffOf`); the frame adds `from`, `source`, `at`, `fresh`.
- Computed by `statusLines` in `model.js`; written through `ctx.data` at mount and each time the list is refreshed (a
  report saved or received, the website log changed, the network read again), **only when `lines` changes** (`updated_at`
  does not count); an empty `lines` when nothing is left. At the first mount of a pilot with an IVAO / VATSIM id the write
  waits for the network read, so the record does not lose then regain the network flights.
- **`cache/flightlog/pending.json`** (24 Oct, schema 2, the frame's former reading, § 10.1) is no longer written: the
  module removes it once; `pending` stays in `model.js` (bench `test/pending.html`) as the selection's other view.
