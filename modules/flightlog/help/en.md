# My flights

All your past flights in one place, one line per flight, from the most recent to the oldest: your reports, the
airline website's log and your IVAO or VATSIM connections, with no duplicates.

## How to use

**The totals.** At the top, three boxes: the number of flights, the block hours and the flights that do not have a
report yet, for the chosen period. Just below, the three aircraft types you have flown the most.

**The filters.** Choose the period (7 days, 31 days, 1 year, all), search for a callsign, a type, a registration, an
airfield, a mission or a report number, or tick “Without report” to see only the flights waiting for one. Your choices
stay on the device: at the next visit a chip recalls them ("1 year · LFRS ✕") and removes them in one tap. A "—"
instead of the block time: a report without times.

**The list.** One line per flight: the date, the callsign, the route and the block time. An orange dot marks a flight
without a report. On a computer, the line also shows the aircraft and the report number.

**The details of a flight.** Touch a line to unfold it: where the flight comes from (report, website log, IVAO or
VATSIM network), its time, the aircraft, the mission and the notes.

**Writing or opening the report.** On a flight without one, “Write the report” opens a new report, already filled in
with this flight — date, aircraft, callsign, airfields — and a suggested mission family. On a flight that has one,
“Open the report” opens it again for editing.

**The current flight.** A flight started in Fuel (“Start the flight”) and not yet reported appears at the top, “In
progress — started at hh:mm” (a diversion is flagged), even before the website log knows it. “Write the report” opens
the report, which offers this flight first; once the report is saved, the line disappears.

**More.** Unfold “More” to export the filtered list as CSV (spreadsheet) or read your IVAO and VATSIM connections again.

## Where the flights come from

- **Your reports**: those you have written, including those of the full suite. A report of the full suite opens in the
  full suite.
- **The website log**: your rows of the airline's “Log des vols”, taken over by the Website module (pasting, or reading
  by the launcher).
- **The network**: your IVAO and VATSIM connections of the last seven days (IDs set in ⚙). They are shown, never saved
  as flights.
- **No duplicates**: the same flight (same date, same callsign, same registration) appears only once. The report comes
  before the log, the log before the network; a report without hours takes the block time from the log.

## Special cases

- **Offline**: the reports and the log already received are shown; the network waits for the connection.
- **No launcher**: IVAO and VATSIM can only be read again through the launcher of a computer.
- **No trigram**: set it (⚙); it is what picks your reports and your rows of the log.

<!-- fr: 21df43e2dc4e -->
