# Report

Write the report of a flight in a few touches, with or without a mission: the module takes what it already knows about
your flight, you complete it, you save — and, if you wish, the flight is recorded on the airline website in the same
move.

## How to use

**Three steps.** The report is filled in three steps: Flight, Mission, Result. On a phone, one step at a time (“Next”
at the bottom); on a computer, the three side by side. Nothing is mandatory: what is missing is shown at the last step,
without ever blocking the save.

**The last flight.** If your IVAO (or VATSIM) identifier is set (⚙) and the device is online, a card offers your last
flight on the network: “Use” fills in the aircraft, the callsign, the route and the times taken from the track. The
flight prepared in Fuel or Map is offered the same way (“Current flight”); if it was started in Fuel (“Start the
flight”), it comes first, “Flight started at hh:mm”. The card says in one line everything that will be taken, even what
a mission type has no box to show (distance, level). “Use” also fills in the start-up time (the departure time in Fuel)
and the fuel at departure (the block fuel of the quote), each marked with its source. Saving the report ends the started
flight: Fuel goes back to preparation, My flights removes “In progress”, and the flight is no longer offered.

**The other sources.** Unfold “Other sources” to take your last IVAO or VATSIM flight, your SimBrief flight plan, or a
pasted text: an ICAO flight plan, the page of a flight from the IVAO tracker or from StatSim, a METAR. Only empty fields
are filled; next to each one, its source. If a source gives something else for fields already entered, a button offers
to replace them.

**The mission.** At the second step: the family (suggested from your last report), the series, the mission identifier
if the flight follows one, then the blocks specific to the family. Some blocks only appear for one series (for example
VIP or ferry for special missions). Until you open this step it is marked "to check" instead of ✓: the family and
the series of a new report are taken by default.

**The result.** At the last step: the outcome, your observations, the crew (you first, as aircraft commander) and the
fuel at departure and at landing. Inconsistencies — times out of order, a future date, fuel that goes up — are
flagged.

**Saving.** The button at the bottom saves the report and gives it its number at the first save. As long as you have
not saved, what you entered is kept on the device and restored the next time you open it.

**Recording on the website.** “Save and record on the website” saves and opens, in the same move, the “Add a flight”
form of the airline website with your flight. Log in on the website if needed, run the “→ Vol” bookmark: it fills the
form without submitting it; check it, then submit on the website. The button is greyed out as long as the website
address is not set (Website module).

**My last reports.** Folded at the end of the first step, one line per report: touch one to reopen and edit it. “New
report” starts again from a blank report.

## Prefilling in detail

- **IVAO and VATSIM**: the flights of the last seven days for your identifier. A flight cut by disconnections counts as
  a single flight. Start-up and shutdown match the connection and the disconnection when the track begins and ends on
  the ground; take-off and landing come from the track.
- **Times** are written in your device's time.
- **SimBrief**: your last plan (identifier set in ⚙) — aircraft, route, level, speed, planned fuel, METAR and TAF.
- **From My flights**: “Write the report” on a flight opens a new report, already filled with that flight and its date;
  “Open the report” reopens the existing one.

## Report numbers

With a mission identifier, the number follows the mission and counts the attempts (CRM-016-1, CRM-016-2…). Without a
mission, each family has its own sequence (CRM-A01-0, CRM-A02-0… for HEMS). Numbers already taken, including by the
reports of the full suite, are never reused.

## The “→ Vol” bookmark

Unfold “On the airline website” at the last step and drag the “→ Vol” link to your browser's bookmarks bar. It only
works on the website: on the list of aircraft, it opens the one of your flight; on its page, “Add a flight”; on the
form, it fills the fields and flags the differences. On a phone, where bookmarks are awkward, “Copy the fields” puts the
flight's line on the clipboard.

## Special cases

- **Offline**: everything is written and saved on the device; the report leaves at the next synchronisation. Only the
  network sources (IVAO, VATSIM, SimBrief) wait for the network.
- **Without the launcher**: IVAO and VATSIM can only be reached through a computer's launcher; elsewhere, paste the
  flight's page (IVAO tracker, StatSim) into “Other sources”.
- **Without a trigram**: the report is written all the same; set your trigram (⚙) so that it is in your name.

<!-- fr: 5bd862ad5bb7 -->
