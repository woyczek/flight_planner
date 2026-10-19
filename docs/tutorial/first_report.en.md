# Write your first mission report — tutorial

*SO Group Virtual (Virtual Special Operation Group) · [Version française](first_report.fr.md)*

The mission report tells the story of a flight you flew: aircraft, crew, times, route, what happened. This tutorial
writes one from start to finish, from the mission you received to the flight found again in “My flights”. Allow
fifteen minutes the first time. Names in quotes are the button and block names as they appear on screen.

Before you start: the suite is installed and running ([installation tutorial](installation.en.md)), with your trigram
and network IDs set (Settings › My profile). The **Crew** level is enough: it shows a “short report”, the essentials of
the form.

## 1. Open the report

There are three ways in, depending on what you flew:

- **An assigned mission**: in “My missions”, open the mission's folder, then “Create the report”. The report of the
  right family opens already filled in from the order: title, route, assigned aircraft and its reference.
- **A flight from the airline log without a report**: in “My flights”, click the row marked “no report”, then “Write
  the report”. The date, call sign, aircraft, registration, route and duration are carried over.
- **From scratch**: side bar “Report”. Choose the mission family (FIRE, HEMS, AIRLIFT…) with a click, or describe the
  mission in the search (“helicopter medevac”, “para drop”). “Continue with …” offers the last family used.

If a draft is already in progress, the page asks before replacing it. From the report itself, “Prefill ▾ › New report
from…” lists your 7 recent mission orders and flights without a report (a click opens the prefilled report), or a
file at the Design level.

## 2. Check the family and the series

The pill at the start of the toolbar (“FIRE · GAAR ▾”) shows the family and the series. One click changes them; the
form follows (blocks specific to the family).

## 3. The aircraft

In the “Aircraft” block, type the registration (`F-ZB…`): the known aircraft of the fleet are offered. Choose yours:
the type, category, call sign, operator, base and equipment fill in. You can also start from the call sign: `ctm58`
gives the series, the number and the “Flight plan callsign (7 chars max)”. “⟲ Clear” starts the search again if it is not the
right aircraft.

If you did not land at the planned base, fill in the “Actual landing aerodrome (ICAO)”.

## 4. Fill in from the network

Everything that fills the report is in a single header menu, “Prefill ▾” (from the Crew level), in its “Complete this
report from…” part; each entry opens its own window. **Only empty fields are filled.**

- **“My last IVAO flight”** or **“My last VATSIM flight”**. The suite, opened by its launcher, reads your
  flights of the last seven days. A single flight fills the report at once; several are chosen from a list (call
  sign, route, date and UTC times, “in progress”). The call sign, airfields, filed flight plan (aircraft, route, level,
  registration…), times from the track and distance are taken. Your IVAO or VATSIM ID must be in My profile; IVAO
  also needs the suite's API key (Settings › Installation). VATSIM publishes no track: its times are the connection
  and disconnection times, to be corrected.
- **“Filed flight plan”**: your latest SimBrief OFP, or the IVAO / VATSIM flight plan of the current flight.
- **“Paste a flight plan, a tracker page or a METAR”**: on your flight's page (IVAO tracker, or StatSim for VATSIM),
  press Ctrl+A then Ctrl+C, come back and paste into the box. The “→ CR” bookmark (“Bookmark “→ CR”” entry), dragged
  once to the bookmarks bar, copies the tracker page in one click.

Every source ends with the same summary, in a notification: the source and the flight date, the fields filled and
the blocks touched, the fields already entered that were kept, and what the source did not give. For 10 seconds,
“Undo” puts the report back as it was, and “Replace the fields already entered” applies the source again, replacing
them.

## 5. Times and route

- **“Timeline”**: the key times, in local time (HH:MM): engine start, take-off, landing and engine stop in the short
  report. The “now” button next to a field sets the current time. An inconsistent time is highlighted and listed
  under the calculations.
- **Fuel**: at departure and at landing.
- **“Navigation”** (detailed report): departure, arrival, route; a pasted flight plan fills them.

Durations (block, flight, on station) and the fuel used are computed by themselves in “Automatic calculations”.

## 6. What happened

- **“Results and remarks”**: Success, Partial success, Interrupted…; for a result other than Success, tick the
  causes (weather, technical, no ATC…); then your “Observations”, what deserves to be read.
- **“Crew”**: you and the other members (trigram or name), with their role.
- **Family blocks**: those specific to the mission type (FIRE: sector, drops, refilling base…).

The form reads in three steps, “1 Flight · 2 Mission · 3 Result”: a block whose essentials are filled fits on one
line (“Edit” unfolds it), and “All fields” shows what goes beyond the short report. The report preview, on the right,
updates continuously.

## 7. Save

“Add to ledger” stores the report in the mission ledger; the button then becomes “Save changes”. Until then, the
draft is kept in this browser: you can close the page and come back. The message at the right of the toolbar says
what was saved and when.

## 8. Send

The “Send” menu:

- **“Send report”** sends the report to the airline's web service, if it is set up (“Mission ledger › Report sending
  settings”).
- **“Airline website”** (if its address is set) records the flight on the website:
  1. once, drag the “→ Vol” bookmark to the bookmarks bar;
  2. “Record the flight on the website ↗” opens the website's “Enregistrer mon vol” page with the flight's fields;
  3. log in if the website asks, then click “→ Vol”: it opens your aircraft, then “Ajouter un vol”; click it again to
     fill the form (call sign, number, end date, duration, mission, arrival);
  4. check, then “Valider” on the website. Nothing is submitted for you.

  Without the bookmark, “Copy the fields” copies one line to type in by hand.

## 9. Find the flight again

“My flights” (side bar, under “My missions”) lists your past flights, most recent first: your report is there, with
its number; a click opens it again to correct it. The “My flights ↗” link of the “Send” menu leads straight there.

## Going further

- The “Report of a family” chapter of the [user manual](../en/MANUEL_UTILISATEUR.md) describes every block and field.
- The “My flights” chapter of the same manual describes the flight ledger, its filters and its export.
