# route_engine — the route calculator of RouteSim 2 (SOG-0081)

Copied from `E:/DEFA/rad` (RouteSim 2, not versioned) so that the launcher can compute routes: `engine.py`, `fra.py`, `procedures.py`, `flight_profile.py` are the user's files **without change of substance**. The user keeps evolving the algorithm in `E:/DEFA/rad`; his diffs apply here as they are.

**What differs from RouteSim 2** (every changed line carries `SOG-0081`; `diff <RouteSim file> <this file>` shows nothing else):

- `engine.py`: relative imports (`from . import flight_profile` …); three module variables, `DATA_DIR` (the data folder: `sia/base`, `proc`; None: `<root>/data`), `RAD_FILE` (None: next to the module); `Nav.data_dir`; **`SOG-0078` (the only change of substance)**: `Nav.graph` honours the `dir` of the airways (`F`, `B`, `FB`; absent: both ways as before), `Nav` keeps `dir` on its edges, the control says « Sens interdit » for a one-way segment flown against its direction, the legs say `direction` (`sens unique`, `double sens`, `inconnue`).
- `fra.py`: `FRA_FILE` (None: next to the module).
- `procedures.py`: `nav.data_dir` instead of `nav.root/'data'`; relative import.
- `flight_profile.py`: identical.

**New, not RouteSim's**:

- `planning.py` — RouteSim 4's objectives and fuel model (copied as it is; `SOG-0081`: the RNAV metadata file is read from the data folder).
- `view.py` — the answer in the shape of the Fuel screen (`action` compute / check → `alternatives`, `segments`, `issues`); the job uses it when `action` is present (SOG-0081, 10 Nov).
- `plan.py` — `plan()` is the port of `server.plan()` (the calculation, the control and the alternatives; if the user changes `plan()` in `server.py`, the diff applies to it); `check_request` (the closed request), `bound_result` (the bounded answer), `compute` (what the job calls).
- `import_books.py`, `xlsx.py` — the import of the EUROCONTROL workbooks (RAD, FRA points) into `data/route/rad.json.gz` and `fra.json.gz`, **standard library only** (no openpyxl). Checked against RouteSim 2's `import_rad.py` and its compiled files: the two RAD workbooks and the four FRA workbooks of `E:/DEFA/rad/sources` give exactly the same books (content equal, SHA-256 included).

Not taken: `server.py` (the web server, port 8766), `web/` (the screen: Fuel does it), `config.json`, `import_rad.py`, the compiled files (they live in `data/route/`).

Jobs: `tools/regen/route.py` (`route/compute`, `route/import-rad`). Contract: `frame/aerodb/INTEGRATION.md`, « Route computation ». Cases: K101, K102, K103.
