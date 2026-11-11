# Mobile / GitHub-mode test scripts (lab, not part of the suite)

Scripts written by the cloud "mobile" session (October 2026) to check the stand-alone app
(`docs/technique/APPLI_AUTONOME.md`): a fake `api.github.com` serving a folder as the data repository, the phase-1
pages read and written through it, two simultaneous reports merged, and page smoke tests at desktop and 390 px width.

They need **Playwright** (`pip install playwright && playwright install chromium`), which is not part of the standard
library: that is why they live in `labs/` and never in `tools/`. They are kept as they were handed over; paths and
ports inside them may need adjusting.

- `t0.py` … `t5.py`: GitHub mode end to end on the fake API: access activation, phase-1 pages, availability write,
  report ledger write, two reports merged, built site served under `/flight_planner/`.
- `mobile/smoke.py`: 33 page loads (desktop and 390 px) without JavaScript error, `PORT=<port>` of a launcher.
- `mobile/*.py`: one-off checks of the phone layout (report, equipment, fuel, fleet, appearance, rail…).
- `test/verify.py`: command-line equivalent of `tools/verify_format.html` (acorn syntax trees).

Data: the sample data set of the repository, or an archive of `flight_planner_data@main` for the fake GitHub.
