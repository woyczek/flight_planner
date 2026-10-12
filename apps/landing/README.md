# Landing Performance Dashboard

The suite's landing dashboard (page title "Landing Performance — Summary"): it reads the CSV exports of the
landing-rate plugin and analyses touchdowns (rate, G-force, nose-wheel speed, float distance, trends per aircraft and
per runway). Opened from the suite's menu; user guide: *User manual › Landing Performance* (online Help).

Original project: <https://framagit.org/asr/landing_performance_dashboard>

## Files in this folder

- `LandingPerformance_Dashboard_MultiCSV_i18n.html` — the dashboard page (four languages).
- `generate_test_landings.py` — writes a synthetic test set, `LandingPerformance_TestDataset_ManyAircraft.csv` (about
  250 aircraft types) and `LandingPerformance_TestAircraftCatalog.csv`, in the current folder. The figures are invented
  and only exercise the dashboard; the generated files are not kept in the repository.
- `skunkcraft_updater.cfg`, `skunkcraft_updater_ignore.txt` — settings of the standalone project's updater, kept for
  that project; not used by the suite.

## Aircraft types and icons

The dashboard does not query any external service: it reads the suite's aircraft type base, shared with every page.

- `AircraftDB/aircraft_db.js` — type base of **this computer** (model, ICAO description such as `L2J`, wake turbulence
  category, wing position, aliases). It is **not published** (see `LICENSE.md`): each computer builds and completes it.
- `AircraftDB/aircraft_icons.js` — silhouettes chosen from the ICAO description and the wing position.
- `AircraftDB/update_aircraft_db.py` — the updater, run by the launcher: *Settings › Maintenance › Aircraft types and
  performance* ("Complete automatically"), or when a pilot adds a type in *My profile › Aircraft and simulators*.
- `AircraftDB/aircraft_types.txt` — the designators the suite rebuilds on every computer.
- Manual aliases and corrections: `data/references/aircraft_overrides.json` (data repository).

Sources, in order: manual overrides, ICAO Doc 8643, EUROCONTROL (Aircraft Type Characteristics, then APD for
performance), Aviation Fanatic as a last resort (retired types, and types without an ICAO designator, stored with their
generic flight-plan designator: `SHIP`, `BALL` or `ZZZZ`), Wikipedia / Wikidata only for the wing position.

From the command line (standard library only), in `AircraftDB/`:

```bash
python update_aircraft_db.py --only BN2T B17
python update_aircraft_db.py --add-file aircraft_types.txt
```

HTTP answers and ICAO files are cached (`aircraft_http_cache.json`, `icao_doc8643_cache/`), the base is saved as it
goes (an interrupted run keeps what was found), and HTTP 429 answers are retried with a pause.
