# stats — integration

How the other modules use the stats computations and what they must never do with them. The rules are in
[SPEC.md](SPEC.md); the decisions in [DECISIONS.md](DECISIONS.md).

## 1. Files

| File | Role |
|---|---|
| `modules/stats/phases.js` | ES module, pure: `parseWindows(text)`, `eligible(row)`, `levelCurves(rows, options)`, `compare(curves, sheet, options)` — no DOM, no storage, no network |
| `modules/stats/test/phases.html` | the bench of case F98 (an invented journal, never a user's file) |

No `module.js`, no screen, no mount by the frame: the module is a library for the screens that show measured data.

## 2. Contract

- **Input is untrusted**: `parseWindows` reads a text (a CSV of the Fuel Phase Monitor, schema 0.4) bounded to 64 MB,
  500 000 rows and 200 columns; a text that is not such a journal is refused with an error the caller shows as a sentence,
  never as raw text.
- **Nothing travels**: the caller chooses the files (a file picker, or the launcher's reading of the simulator's Output
  folder in step 2) and keeps nothing; the raw samples are never published, never written in `data/`, never in git
  (§ 10.37 A). Only the aggregates the user accepts reach a sheet, through the ordinary review of Maintenance › Appareils.
- **The sheet is the single source** (§ 10.35, SOG-0023): `compare` reads the sheet's `rpmFuelCurve` rows of the same
  `altFt` and proposes; it writes nothing.
- **Units**: flows in kg/h and speeds in kt inside the module; the screen converts with `frame/lib/fuel_units.js` to the
  sheet's unit (SOG-0032).

## 3. Readers today

- `modules/aircraft/sheets.js`, « Proposer depuis les mesures » (SOG-0052 step 1, case M27): reads the chosen CSV files,
  calls `parseWindows` → `eligible` → `levelCurves` → `compare`, shows one row to tick per point and adds the ticked rows
  to the sheet's draft; nothing is saved before « Enregistrer » then « Appliquer ».

## 4. To come

- The launcher reads `X-Plane 12\Output\FuelPhaseMonitor_*.csv` itself (AeroDB, step 2) and hands the text to the same
  functions; the per-flight aggregates of § 10.37 A (Statistiques module in Maintenance) and the report's « Mesures » step
  are the next readers.
