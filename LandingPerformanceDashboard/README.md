# Landing Performance – Aircraft Database Updater

This package contains the local aircraft database updater used by the Landing Performance dashboard.

https://framagit.org/asr/landing_performance_dashboard

V2. Now with persistant settings, and better UI.
V3. Interpolate datas from multiple sources.
V4. Better icons.

Original GIT repository: https://framagit.org/asr/landing_performance_dashboard

Uses python (If using windows, simply type « python » in a command shell, and install it from microsoft store)

It uses a local plane database cache, to sort and display plane types. It relies on DOC 8643 from ICAO (PDF) if you have it. If not, it will query the API, but it may be a bit long at the first time.

Python database updater included.

## Files

- `update_aircraft_db.py`  
  Updates `aircraft_db.js` from local data and public aviation sources.

- `aircraft_db.js`  
  Local aircraft identification database used by the dashboard at runtime.

- `aircraft_overrides.json`  
  Manual aliases and corrections applied after automatic lookup.

- `LandingPerformance_TestDataset_ManyAircraft.csv`  
  Synthetic landing dataset used to test many aircraft types.

- `generate_test_landings.py`  
  Generates the synthetic test dataset.

## Requirements

Python 3 is required.

For ICAO Doc 8643 PDF parsing, install one of the supported PDF libraries:

```bash
python -m pip install pypdf
```

The updater may also use `pdfplumber` or the `pdftotext` command if available.

## Basic usage

Update the aircraft database using the aircraft names/designators found in a landing history CSV:

```bash
python update_aircraft_db.py LandingPerformance_TestDataset_ManyAircraft.csv
```

You can also use your normal landing history file:

```bash
python update_aircraft_db.py LandingPerformance_History_Merged.csv
```

## Data-source priority

The updater resolves aircraft using the following order:

1. Manual overrides and known local aliases
2. ICAO Doc 8643
3. EUROCONTROL Aircraft Type Characteristics
4. Wikidata / Wikipedia as a fallback only

ICAO and EUROCONTROL data are treated as stronger sources than Wikipedia/Wikidata.

Wikipedia/Wikidata results are rejected if they cannot be validated as actual aircraft data.

## ICAO Doc 8643

Official ICAO Aircraft Type Designators search page:

https://www.icao.int/operational-safety/doc-8643-aircraft-type-designators/search

Public ICAO Doc 8643 Part 3 – By Model Number / Name:

https://cfapps.icao.int/doc8643/reports/Part3-By%20Model%20Number_Name.pdf

The updater can cache ICAO Doc 8643 files locally so they do not need to be downloaded on every run.

To force a refresh of the ICAO cache:

```bash
python update_aircraft_db.py LandingPerformance_TestDataset_ManyAircraft.csv --refresh-icao
```

## EUROCONTROL

EUROCONTROL Aircraft Type Characteristics database:

https://learningzone.eurocontrol.int/ilp/customs/ATCPFDB/

Example aircraft details page:

https://learningzone.eurocontrol.int/ilp/customs/ATCPFDB/details.aspx?ICAO=B737

EUROCONTROL is used to validate or complete:

- ICAO type designator
- aircraft description code
- wake turbulence category
- wing position
- alternative names

## ICAO aircraft description codes

Examples:

- `L1P` = landplane, 1 piston engine
- `L1T` = landplane, 1 turboprop
- `L2T` = landplane, 2 turboprops
- `L4T` = landplane, 4 turboprops
- `L2J` = landplane, 2 jet engines
- `L4J` = landplane, 4 jet engines
- `H1T` = helicopter, 1 turbine
- `H2T` = helicopter, 2 turbines

Wake turbulence category (`WTC`) is stored separately, for example `L`, `M`, `H`, or `J`.

## Alias handling

Aircraft names are normalized before lookup.

For example:

```text
AS350
AS 350
AS-350
AS_350
```

all normalize to:

```text
AS350
```

The normalized name can then be mapped to the canonical ICAO designator:

```text
AS350 -> AS50
H125  -> AS50

EC135 -> EC35
H135  -> EC35

Q400      -> DH8D
DASH8Q400 -> DH8D
```

Ambiguous names are not resolved automatically.

For example, `ALOUETTE` alone may refer to more than one ICAO type and should remain ambiguous unless the source data identifies the actual model.

## Runtime behaviour

The dashboard itself does not query external services.

It only reads the local `aircraft_db.js`.

Network access is used only when running the updater.

## Rate limiting

Wikimedia services may occasionally return HTTP `429 Too Many Requests`.

The updater handles this by:

- respecting `Retry-After` when provided;
- waiting before retrying;
- using exponential backoff;
- caching previously downloaded responses;
- avoiding unnecessary repeated network requests.

Typical output:

```text
[024/253] A388: UPDATE... | L4J | WTC J | wing=low | source=EUROCONTROL
[025/253] A3ST: UPDATE... | L2J | WTC H | wing=low | source=EUROCONTROL
[026/253] A4M: SKIP (already complete) | Airbus A400M Atlas | L4T | WTC H | wing=high
[027/253] AEST: UPDATE...
      HTTP 429: waiting 48.0s before retry (1/6)...
 | UNRESOLVED (no validated aircraft source)
```

## Safe interruption

The updater is designed to survive `Ctrl+C`.

It saves the current `aircraft_db.js` and HTTP cache progressively while processing aircraft.

If interrupted, the data already retrieved is preserved.

You can then rerun the same command:

```bash
python update_aircraft_db.py LandingPerformance_TestDataset_ManyAircraft.csv
```

Already completed aircraft will be skipped and cached HTTP results reused.

## Wing-position classification

The local database may contain:

```json
"wing_position": "high"
```

Possible values include:

- `high`
- `mid`
- `low`
- `biplane`
- `rotor`
- `water`
- `unknown`

This information is used by the dashboard to select the correct aircraft icon.

Examples:

- Cessna 172 → high-wing single-engine
- BN-2 Islander → high-wing twin-engine
- ATR 42/72 → high-wing twin turboprop
- Dash 8 / Q400 (`DH8D`) → high-wing twin turboprop
- Airbus A400M (`A4M`) → high-wing four-turboprop
