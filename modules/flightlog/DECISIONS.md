# flightlog — decisions

Memory of the V3 flightlog module: every choice, dated, with its reason. Chat history is never needed.

- **23 Oct 2026 — role taken** by the Features SOG session (also V3 fuel and V3 report), at the ergonomics session's
  request: worktree `E:\DEFA-v3-flightlog`, local branch `v3-flightlog` from `origin/v3` (80c416012). Port 8795 was
  found in use; trials on 8802.
- **23 Oct 2026 — lot 1, reading** ([READING.md](READING.md)), from `apps/pilot/mes_vols.html` and
  `shared/my_flights.js`.
- **Proposed, to settle before lot 2**:
  1. Reports read from both `cr/reports/` (V3) and `cr/missions.yaml` (V2, until the bridge has replayed everything),
     deduplicated by the flight key.
  2. The website log is kept by the website module in the data repository (`website/flight_log.json`, keyed per row,
     airline-wide), flightlog only reads it; until the website module exists, flightlog shows reports and network
     flights.
  3. Network sessions are shown, never stored as flights; reuse report's `last_flight.js` (moved to a shared place,
     or imported from `modules/report/`, to agree with the frame's rule on cross-module files).
  4. "Open the report" needs report to accept `{ to: 'report', open: '<record path>' }` in the hand-over record.
