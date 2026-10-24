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
| `--tag <tag>` | the cases carrying one of these tags (`overlay`, `sheet`, `maps`, `atmosphere`, `fuel`, `fullscreen`, `design`...) |
| `--designs a,b`, `--widths 390,1280`, `--langs fr,en` | narrow the combinations each case runs in |
| `--jobs N` | worker processes (default 3; `1` runs in this process, easiest to debug) |
| `--list` | print the selected cases and how many runs each one has, run nothing |
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
only or also on it. The full run takes about 6 minutes on four cores with `--jobs 3` (67 cases, about 480 runs).

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

The first line of `report.md` says which areas ran and which paths chose them. A lot is good when its selected cases pass
and the known failures are the only `FAIL`s.

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
  `cache/flightlog/pending.json` (schema 2, `seed_pending`), and a tiny published SIA base (`aero=True`: three airspaces
  over the route, so that an airspaces list can be opened). The helpers are `seed_flight(page, started=False)`,
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
| `cases/frame.py`, `overlay.py`, `sheet.py`, `maps.py`, `atmosphere.py`, `fuel.py`, `flightlog.py`, `designs.py`, `repo.py` | the cases of areas A to I |
| `cases/known_failures.py` | section J |
| `PLAN.md` | the plan: the intelligence of the suite |
| `report.md`, `report.json`, `shots/` | written by each run, ignored by git |
