# V3 non-regression suite

One command, no launcher, no data repository, no network, no token:

```
python3 tests/v3/run.py            # everything (same as --all)
```

The suite checks what must stay true on every screen of the Pilot application (`frame/index.html`) and in the repository,
from the plan in [PLAN.md](PLAN.md): the frame's layout and chrome, the overlay layer and full screen, the sheet, the
Maps, Atmosphere, Fuel, Flightlog and Report screens, the designs, and the repository rules. A case that fails names the
**rule** that broke, the value it **measured** and the value it **expected**, not a selector.

Requirements: Python 3, the Playwright Python package (`pip install playwright`), and a Chromium: the runner takes
`SOG_CHROME` if set, else the newest build under `/opt/pw-browsers` or `~/.cache/ms-playwright` (the build number changes
with the container image), else Playwright's own (`python3 -m playwright install chromium`). A missing package or browser
stops the run before any worker starts, with the fix printed and exit code 2. Case I5 also
needs `jsbeautifier` and `cssbeautifier` (`pip install jsbeautifier cssbeautifier`) and is skipped, with the reason, without
them. Nothing else, and nothing is written outside `tests/v3/` (the temporary copies of I4 are removed).

## Running

| Command | What runs |
|---|---|
| `python3 tests/v3/run.py` or `--all` | every case |
| `--changed [<base>]` | the cases chosen by the files changed: `git diff --name-only <base>...HEAD` (default base `origin/v3`) plus the working tree and untracked files |
| `--for <path> [<path>...]` | the cases chosen by these paths, by hand |
| `--grep <id or text>` | a case id (`B2`), an area letter (`B`), or text of a title or tag (3 letters or more); commas for several |
| `--journey <P1,P3>` | the guard cases and the end-to-end case (`J`) of those journeys (section "Journeys" below); added to `--changed` / `--for` when both are given |
| `--tag <tag>` | the cases carrying one of these tags (`overlay`, `sheet`, `maps`, `atmosphere`, `fuel`, `fullscreen`, `design`...) |
| `--designs a,b`, `--widths 390,1280`, `--langs fr,en` | narrow the combinations each case runs in |
| `--jobs N` | worker processes (default 3; `1` runs in this process, easiest to debug) |
| `--failed [IDS]` | replay the failed cases of the last `report.json`, in the combinations that failed (section "Replaying a failure") |
| `--failed-scope [BASE]` | the full scope of those failures (their areas and journeys, full grid) plus the cases chosen by the files changed since BASE |
| `--list` | print, run nothing: for paths (`--for`, `--changed`) the areas and the journeys they touch, then the selected cases and how many runs each one has (no browser needed) |
| `--keep-server` | leave the static server running after the run and print its address |

The runner starts `python3 -m http.server` (standard library) on a free port of `127.0.0.1`, at the repository root, runs the
cases in Chromium, kills the server at the end (even on an error), and exits **0 only if no case failed outside
`cases/known_failures.py`**. It prints one line per case (`PASS`, `FAIL`, `FAIL (known: ...)`, `SKIP`, `ERROR`), the first
failing run with its measured and expected values and the rule, then a summary line, and writes `report.md` and
`report.json` (git-ignored) and, for failures and for A1, a screenshot in `shots/<id>_<design>_<width>[_<lang>][_night].png`.

### Which combinations a case runs in

Unless a case says otherwise (PLAN.md section 0): on the **phone** (390 x 844, `device_scale_factor` 2, touch, `is_mobile`
off) in the five designs `standard`, `metro`, `swiss`, `cupertino`, `material` in French, and once on the **screen**
(1280 x 800, mouse) in `standard`. A case marked `langs4=True` also runs on the phone in `standard` in `en`, `de`, `es`.
Area A also runs once in the night tone. A case result is `FAIL` if any of its runs fails; the report names the first failing
run (`390/metro/fr`) and lists the others. A case whose runs are all skipped is `SKIP`, never `PASS`.

A few cases narrow the combinations in their decorator, and say why in their file: `C1` (the frame's bench, one design),
`A10` (the night tone, `standard` only), `A13` (the Cupertino bar, `cupertino` only), `H4` (the demo pages, one design),
and the cases with `screens=False` that are about the phone's chrome only; `B6`, `B10`, `C3`, `A3` and `H4` run on the screen
only or also on it. The full run takes about 6 minutes on four cores with `--jobs 3` (73 cases, about 500 runs).

### Which cases run for which change (`--changed`, `--for`)

`domains.py` holds the adherence map of PLAN.md section M: a list of path globs in order, each giving the area letters (`B`)
or case ids (`A12`) to run; the first glob that matches a path decides for that path, and the answer for a set of paths is the
union. A path that matches nothing runs `A1` and the area `I`. Examples:

```
python3 tests/v3/run.py --for modules/atmosphere/module.js    # E, B, C and I
python3 tests/v3/run.py --for docs/x.md                      # I only
python3 tests/v3/run.py --for frame/lib/sheet.js             # B, C, D, E, I
python3 tests/v3/run.py --changed                            # what your branch touches since origin/v3
```

The first line of `report.md` says which areas ran and which paths chose them, the second which journeys they touch. A lot is
good when its selected cases pass and the known failures are the only `FAIL`s.

## Journeys

A **journey** is a path the pilot walks through the application, in order, across modules: what the user calls a "feature".
`journeys.py` holds the six of PLAN.md section N as data (`JOURNEYS = {'P1': {'title', 'steps', 'paths', 'cases', 'e2e'}, ...}`):

| Journey | Path | End-to-end case |
|---|---|---|
| P1 Préparer un vol | Devis (aircraft, route, level) → quote → `current_flight.json` planned → Carte → Météo → Carte | `J1` (phone and screen) |
| P2 Voler | "Démarrer le vol" → `started` → "i" green → Carte "vol en cours" → full screen → cancel the start | `J2` (phone, four languages) |
| P3 Rendre compte | Vols without a report → `pending.json` → "i" → handoff → `#report` prefilled → three steps → save → Vols | `J3` |
| P4 Relire ses vols | Vols: totals, filters, search, CSV export | `J4` |
| P5 Installer et synchroniser | no trigram (amber) → Réglages → design → offline and back → conflicts, help | `J5` (phone and screen) |
| P6 Carte de mission | a mission map from Carte › Couches | `J6` (SKIP until `tests/v3/fixtures/` holds a mission) |

Each entry has `paths` (the globs of the files that carry the journey, same syntax as `domains.py`), `cases` (the area cases
that already guard its screens, ranges written as in the plan: `'B1–B4'`) and `e2e`. The end-to-end cases are in
`cases/journeys.py` (area `J`): each walks the whole path in one browser, once on the phone in `standard` and French (J1 and J5
also at 1280, J2 in four languages), clicking what the pilot clicks.

**Which journeys does a change touch?** With `--changed` or `--for`, the runner maps the files to the areas (`domains.py`) **and**
to the journeys (`journeys.py`), adds the `J` case of every touched journey to the selection, and prints one line per journey
before the first case:

```
$ python3 tests/v3/run.py --for modules/fuel/progress.js --list
Paths: modules/fuel/progress.js
Areas: F I (+A7)
JOURNEY P1 Préparer un vol — modules/fuel/progress.js
JOURNEY P2 Voler — modules/fuel/progress.js
...
```

Read the line as: *this change can break the path P1 and the path P2; the files listed are the ones that put it there*. A file
that carries several journeys prints on several lines (`frame/app.js`: P1, P2, P3, P5). A change that maps to no journey
prints `JOURNEY none (areas only)`: the areas are the whole check. The same lines open `report.md` ("Journeys touched: ...") and
are in `report.json` (`meta.journeys`); a lot's report quotes the line, it is the answer to "which changes touch which path".
`--journey P1,P3` runs those journeys' guard cases and `J` cases without any path.

**A failure names the step**, not only the case: `P3 step 5 (#report prefilled (family, values)): report field navigation.dep:
'' (expected 'LFRS')`. The case stops at the first failed step. A step the suite cannot do (the airline website, a data
repository, IVAO / VATSIM, a language control that does not exist) is **skipped inside the case**: the case passes the steps it
did, and `report.md` and the console print `skipped step: <step>: <reason>` under it. It is never a silent pass.

**What is clicked and what is seeded** (everything goes through `lib.py`: `seed_flights(page, n, reports)`, `seed_plan(page,
started)`, `Ctx.open(flights=, reports=, airfields=)`; a change of cache schema is fixed there only): J1 types the quote by hand
(only the identity and a published base that knows LFRS, LFML, LFMT, LUGEN and NEPIX are seeded, `aero_docs(airfields=True)`);
J2 seeds the planned flight and clicks "Démarrer le vol" and the cancellation; J3 and J4 seed the website log
(`pilot/ABC/site_log.json`) and the reports (`cr/reports/...`), and flightlog itself publishes `pending.json`; J5 seeds nothing.

**Adding a file to a journey, in the same commit as the feature.** When a new screen, record or module file serves a journey, add
its glob to that journey's `paths` in `journeys.py` (and the guard case, if you wrote one, to `cases`); a file that belongs to no
journey is a question for the relay, not a silent gap. Check it with `python3 tests/v3/run.py --for <your file> --list`: the
journey must appear. A new journey is a new entry plus its `J` case (`cases/journeys.py`, `lib.case('J7', ...)`); the runner
reports a `cases` or `e2e` id that is not registered (`JOURNEYS TABLE ...`).

## Replaying a failure

> A failed case is replayed twice before a lot is called good. First alone, as it failed (`run.py --failed <id>`: same design, width and language), to confirm the fix on the exact failure. Then in its full scope (`run.py --failed-scope`: every area and journey the case belongs to, plus the cases chosen by the files the fix touched), to see what the fix moved around. The lot's report quotes both commands and their summary lines. A fix that passes the first and not the second is not done.

```
python3 tests/v3/run.py --failed B2            # 1. alone, as it failed: the combinations of B2 that failed in the last report.json
python3 tests/v3/run.py --failed-scope         # 2. its full scope: its areas and journeys + the cases chosen by the files the fix touched
```

- `--failed [IDS]` reads the **last `report.json`**: every `FAIL` / `ERROR` case (a known failure too, reported as known), and
  runs it **only in the combinations that failed** (`390/metro/fr`, `1280/standard/fr`, `390/standard/fr/night`...), not the full
  grid. `--failed B2,D5` limits it to those ids. No report: a clear message and exit code 2; nothing failed: nothing to replay.
  `report.md` then opens with `Replay of <date of the previous report> : B2`.
- `--failed-scope [BASE]` runs, in the **full grid**, every area (PLAN.md section M) and every journey (guard cases and `J` case)
  the failed cases belong to, **plus** what `--changed` would choose from the files the fix touched (base `origin/v3`, or BASE).
  `report.md` opens with `Scope of failures B2 D5: areas B D, journeys P1 P2, changed: <files>` and the `JOURNEY` lines follow.
- A replay keeps the failures it replays in `report.json` (`meta.failed`), so `--failed-scope` still finds them after a
  `--failed` that passed. The next normal run replaces them.
- `--list` works with both and shows the selection without running anything.
- The lot's report quotes both commands and their summary lines. A fix that passes the first and not the second is not done.

## Reading a failure

```
FAIL                                   B2   Columns
      [390/cupertino/fr] measured: #maps "Recentrer" distance to the layer right: 12
      expected: 8 ± 1
      rule: frame/INTEGRATION 9.3; fix of 24 Oct
      failing runs: 390/cupertino/fr, 390/material/fr
      screenshot: tests/v3/shots/B2_cupertino_390.png
```

- `[390/cupertino/fr]`: the width, the design and the language of the first run that failed (`/night` for the night tone).
- `measured` / `expected`: the value read in the page and the value the plan gives; `what` it is comes first.
- `rule`: where the expectation comes from (a section of `frame/INTEGRATION.md` or of the specification, or the user's words).
- `ERROR`: the test itself raised (a selector that no longer exists, a timeout waiting for a screen): read the last lines
  printed under it, and fix the test or the screen. It counts as a failure in the exit code.
- A line `a JavaScript error` means the page raised an error from its load to the end of the case; every case checks this
  on top of its own assertion (`pageerror`, `console.error`, and a missing `.js` / `.css` / `.html` file; blocked network
  and the launcher's `/__` endpoints are not errors).
- `FAIL (known: ...)`: a failure carried on purpose (see below); it does not change the exit code.
- `SKIP`: the case cannot run here, with the reason (for instance MapLibre did not start, or `jsbeautifier` is missing).

To look at a failure, run only that case, one process, and read the screenshot:

```
python3 tests/v3/run.py --grep B2 --designs cupertino --widths 390 --jobs 1
```

## What the suite does for you

- **No network.** Every request to a host other than `127.0.0.1` is aborted, so a test never waits for tiles, a CDN or a
  forecast. The base map style is answered by the runner with an empty one (a background and one empty source that carries
  an attribution), so MapLibre starts, draws the route over it, and has its compact attribution control, as with tiles.
- **Seeding without a launcher.** The frame reads its documents from the IndexedDB `sogFrame` (`frame/store/frame_data.js`)
  when no launcher answers. `lib.py` writes the needed documents there from a same-origin page before loading the application:
  `device/design.json` (the design and tone of the run, which the frame applies over the `localStorage` mirror),
  `device/identity.json` (trigram `ABC`, unless a case says `trigram=''`), `pilot/ABC/current_flight.json` (a planned
  flight LFRS - LUGEN - NEPIX - LFML at FL270, C30J; `started=True` adds a start time; `steps=True` adds a level step),
  `cache/flightlog/pending.json` (schema 2, `seed_pending`), a tiny published SIA base (`aero=True`: three airspaces
  over the route, so that an airspaces list can be opened; `airfields=True` adds the aerodromes and points of the route, so that a
  typed route resolves), and the flight log of the journeys (`flights=n, reports=k`: `pilot/ABC/site_log.json` and `k` reports). The helpers are `seed_flight(page, started=False)`, `seed_plan(page, started=False)`, `seed_flights(page, n=3, reports=2)`,
  `seed_pending(page, flights=1)`, `seed_identity(page, trigram='ABC')` and `forget(page, paths)`; a case normally calls
  `c.open('maps', flight=True)` and lets it seed.
- **Translations from the code.** The labels a case expects in the four languages are read from the module's own table
  (`lib.tx('modules/maps/module.js', 'edit', 'de')`), so the test follows the wording but still checks that the screen shows
  the language of the run.

## Writing a case

A case is a function in `cases/<area>.py`, registered with a decorator, that receives a context `c` and raises `Fail` (or lets a
helper do it) when a rule does not hold:

```python
from lib import MAP_JS, case

@case('B2', 'Columns', areas='B', tags=('overlay',), langs4=False, screens=True,
      rule='frame/INTEGRATION 9.3')
def b2(c):
    c.open('maps', flight=True)                      # seeds, loads frame/index.html#maps, waits for the screen
    for b in c.boxes('.f-ov-right > .f-ov-btn'):     # boxes: x, y, w, h, l, t, r, b, shown, text
        if b['shown']:
            c.eq(round(b['w']), 44, '44x44 button', tol=1, what='button width')
```

- Decorator options: `tags`, `langs4` (also `en`, `de`, `es`), `screens` (also once at 1280), `phone` (run at 390 in the designs),
  `designs=(...)`, `static=True` (no browser: area I), `night=False` (area A: skip the night run), `tone='night'`, `rule`.
- Context: `c.page` (a Playwright page, use it freely), `c.design`, `c.width`, `c.lang`, `c.tone`, `c.phone`; `c.open(target, flight=,
  started=, steps=, aero=, pending=, trigram=, tone=)`, `c.go(target)` (change the address inside the page), `c.tap(sel)` (touch on
  a phone, click on a screen, with Playwright's checks that the control is not covered), `c.key('Escape')`, `c.drag(sel, dy)`,
  `c.box(sel)`, `c.boxes(sel)`, `c.shown(sel)`, `c.text(sel)`, `c.attr(sel, name)`, `c.style(sel, prop)`, `c.js(expr, arg)`,
  `c.until(js, what=)` (waits for a condition, fails with a message), `c.settle()`, `c.notes()`, `c.note_log()` (every
  notification since the page opened: a toast lives only 6 s), `c.mark(sel, text)` (a control by its label, spaces collapsed).
- Assertions: `c.eq(measured, expected, rule, tol=, what=)`, `c.ok(cond, measured, expected)`, `c.le`, `c.ge`, `raise Fail(measured, expected, rule)`,
  `raise Skip(reason)` when the case cannot be done here.
- Write the **measured value** in the message, not just "wrong". Expected values are the plan's (57 px, 44 px, 30 % / 170 px...)
  or, when the plan says "measure against the real box", measured from the real box (the bar's height is read, not assumed).
- A new case goes in the file of its area with a stable id, a header line in that file, and, if it guards a bug a test caught,
  a row in PLAN.md section L. Add the glob that should run it to `domains.py` if its area is not enough.

## Known failures (`cases/known_failures.py`)

The table is empty today (`F4` and `F5`, fixed on 24 Oct, were removed). A case listed there is reported `FAIL (known: ...)` and does not change the exit code. When the cause is fixed the case passes and the report
says `PASS (known failure fixed: remove it from cases/known_failures.py)`; delete the line then. Any other failure is a regression
(or a bug found), not a known one.

## Files

| File | |
|---|---|
| `run.py` | the runner (selection, server, workers, report) |
| `lib.py` | case registry, `Ctx` and its helpers, seeding, the run of one combination, the workers |
| `domains.py` | the adherence map (section M) |
| `journeys.py` | the six journeys as data and their adherence (sections N and O): files, guard cases, end-to-end case |
| `cases/frame.py`, `overlay.py`, `sheet.py`, `maps.py`, `atmosphere.py`, `fuel.py`, `flightlog.py`, `designs.py`, `repo.py` | the cases of areas A to I |
| `cases/journeys.py` | the end-to-end cases J1 to J6 (area J) |
| `cases/known_failures.py` | section J |
| `PLAN.md` | the plan: the intelligence of the suite |
| `report.md`, `report.json`, `shots/` | written by each run, ignored by git |
