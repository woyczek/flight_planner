# stats — decisions

One entry per decision, newest last. The rules are in [SPEC.md](SPEC.md).

## 6 November 2026 — the module is born as a library (SOG-0052 step 1, Features SOG)

- **Pure computations only.** `phases.js` has no screen, no storage and no network: the screens that show measured data
  (Maintenance › Appareils first) choose the files and write nothing without the user. Reason: the raw samples must never
  travel (§ 10.37 A) and the sheet must stay the single source (SOG-0023).
- **The phase is never guessed.** The FuelDashboard does not detect phases: the simulator module writes the phase of each
  15 s window in the CSV. The module trusts that column and filters on it (`eligible`); climb and descent proposals are a
  later step.
- **What was ported from the FuelDashboard** (`FuelDashboard/index.html`, in the repository since ebed6a6bc): the CSV
  reading, the eligibility of a window, the duration-weighted median of the flow. **Not ported**: the merging of
  neighbouring rpm groups (`consolidateRegimeGroups`), kept for the next lot (SOG-0052 suite); the screen itself shipped
  the same day (M27).
- **Grouping**: pressure altitude rounded to 1 000 ft, rpm rounded to 50; a group under 60 s is dropped, never
  interpolated. Reason: a sheet row is a steady level, not a transient.
- **Comparison per altitude only** (§ 10.37 C as amended on 6 Nov): a point is compared with the sheet's rows of the same
  `altFt`; at an altitude the sheet lacks, the point is a new row to propose, never a deviation against another altitude.
- **Bounds on the input**: 64 MB, 500 000 rows, 200 columns; a file that is not a journal is refused. Reason: a CSV chosen
  by the pilot is an untrusted input like every file read by the suite.
- **Documents** (integrator, 6 Nov evening): INTEGRATION.md and DECISIONS.md added after the evening pass (case I6: every
  module keeps SPEC, INTEGRATION and DECISIONS); content taken from Features SOG's delivery report, nothing new decided.

## 9 November 2026 — neighbouring rpm groups, climb and descent (SOG-0052 suite, SOG-0061, Features SOG)

- **`consolidateRegimeGroups` ported as it is** (`consolidateGroups`), applied within each altitude only (two altitudes are two
  curves, § 10.37 C): a 2450 rpm group of 30 s next to a 2400 rpm one of 120 s is the same setting read twice, not a row to propose.
- **Climb and descent as one line each**, never a curve: the sheet keeps single values for them (the user extrapolates, § 10.37 C);
  the throttle is said but has no field in the sheet, so it is never written (SOG-0061: the rpm is what the pilot watches).

## 9 November 2026 — one aggregate per flight, in the report (§ 10.37 A step 3, Features SOG)

- **The report keeps the aggregate, never the windows**: `measured = { source: 'fpm', flightId, registration, startUtc, endUtc,
  fuelKg, minutes, phases, cruise }`, written only after « Garder ce vol » and with the report's ordinary save.
- **Matching by registration and UTC times**: the report's times are UTC (`timeline.tz = "Z"` since 23 Oct, checked in its SPEC
  § 6); a flight overlaps when its first window starts before the report's last time and its last window ends after its first;
  with no registration or no time in the report, that criterion is not applied. A report written before 23 Oct (no
  `timeline.tz`, the device's time zone) is read as UTC too: its match may miss by the zone's offset (said, not corrected).
- **The journal readers are one module** (`journals.js`): Maintenance › Appareils took them out of its own code (no copy).
- **A fold of the Result step, not a fourth step**: three steps and their bar stay (G3); the fold opens when there is something in it.
