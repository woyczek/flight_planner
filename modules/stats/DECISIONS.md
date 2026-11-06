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
  neighbouring rpm groups (`consolidateRegimeGroups`), kept for step 2 with the screen.
- **Grouping**: pressure altitude rounded to 1 000 ft, rpm rounded to 50; a group under 60 s is dropped, never
  interpolated. Reason: a sheet row is a steady level, not a transient.
- **Comparison per altitude only** (§ 10.37 C as amended on 6 Nov): a point is compared with the sheet's rows of the same
  `altFt`; at an altitude the sheet lacks, the point is a new row to propose, never a deviation against another altitude.
- **Bounds on the input**: 64 MB, 500 000 rows, 200 columns; a file that is not a journal is refused. Reason: a CSV chosen
  by the pilot is an untrusted input like every file read by the suite.
- **Documents** (integrator, 6 Nov evening): INTEGRATION.md and DECISIONS.md added after the evening pass (case I6: every
  module keeps SPEC, INTEGRATION and DECISIONS); content taken from Features SOG's delivery report, nothing new decided.
