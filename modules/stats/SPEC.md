# V3 stats — measured flight data (specification)

Pure computations on the measurements of the simulator, for the statistics of V3_SPECIFICATION § 10.37 A and the curves of
§ 10.37 C (« Proposer depuis les mesures », SOG-0052). No screen, no storage, no network: the modules that show them (Maintenance
› Appareils first) choose the files, read them and write nothing without the user.

## 1. Level windows (`phases.js`, SOG-0052 step 1)

- **Input**: the CSV journals of the Fuel Phase Monitor (`FuelPhaseMonitor*.csv`, one 15 s window per row, schema 0.4: phase,
  duration, total and per-engine fuel flow, coverage, pressure altitude, IAS, TAS, vertical speed, engine rpm, quality flags), read
  as untrusted input (64 MB, 500 000 rows, 200 columns at most). The phase is the one the simulator module wrote, never guessed.
  Ported from the FuelDashboard (`FuelDashboard/index.html`: `parseCSV`, `eligible`, the weighted median); the dashboard's merging
  of neighbouring rpm groups is not ported (step 2, with the screen).
- **Eligible window**: CRUISE, schema 0.4, flow covered at 99.9 %, every engine's flow known, pressure altitude known, IAS ≥ 40 kt,
  |vertical speed| ≤ 100 ft/min, no quality flag.
- **Points** (`levelCurves`): eligible windows grouped by pressure altitude (rounded to 1000 ft) and rpm (rounded to 50); within an
  altitude, a small neighbouring rpm group (≤ 150 rpm, three times fewer windows) joins the well-supported one and at most ten groups
  stay (`consolidateGroups`, the dashboard's `consolidateRegimeGroups` as it is: the label stays the rpm most seen); every value is
  then computed again on the original windows: the flow is the duration-weighted median, the TAS the weighted mean; a group under
  60 s is left out, never interpolated.
- **Climb and descent** (`phaseSummary`, SOG-0052 suite, SOG-0061): the eligible CLIMB (vario ≥ 400 ft/min) or DESCENT (≤ −400)
  windows give the rpm and the flow (weighted medians), the IAS, TAS and rate (weighted means) and the throttle when the journal has
  `mean_throttle_pct`; nothing under 300 s or 20 windows (the dashboard's « mesures insuffisantes »).
- **Comparison** (`compare`): each point against the sheet's curve of the same altitude only (the rows of `rpmFuelCurve` sharing
  `altFt`, § 10.37 C), interpolated on the rpm when two rows frame it; nothing to compare at an altitude the sheet lacks (the point is
  then a new row to propose). Deviation in %.
- Bench `modules/stats/test/phases.html` on an invented journal (F98); never a file of the user in the repository.

## 2. To come

- Step 1, screen: done in Maintenance › Appareils, « Proposer depuis les mesures » (modules/aircraft SPEC § 6, M27). Still to port:
  nothing: the merging and the climb / descent proposals followed on 9 Nov (F98, M31).
- Step 2 (AeroDB): the launcher reads the simulator's Output folder itself. Step 3: flight log, mission reporting, flights per
  period and per fleet (§ 10.37 A).
