<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** Each tool is a verb of the menu (☰ on a phone, left column on a screen). A tool's address (`#fuel`,
  `#report`…) is enough to come back to it.
- **Your identity.** In ⚙ Settings, set your trigram and your IVAO, VATSIM and SimBrief IDs: the tools use them to
  prefill.
- **The level.** Also in Settings, "Level" chooses what the menu shows: Discovery, Everyday or Full. A hidden tool stays
  reachable by its address.
- **Help.** Each tool has a folded "How to use" panel at its top; the ? button opens this manual at the tool's chapter.

## Data and synchronisation

- **Offline first.** Everything you do is kept on the device and works without network.
- **Alone on this device.** With no exchange ticked in Settings, nothing goes elsewhere: export the device backup (one
  file) from time to time, it is the only copy.
- **Several devices, or several users.** Tick the usage in Settings and set the access (GitHub repository and personal
  token, or a workstation's launcher). Your writes leave together at synchronisation: at start, every 10 minutes
  online, or with the status button at the top of the screen.
- **Conflicts.** A file changed here and elsewhere at the same time keeps its newest version; the other one stays
  available (status button, then "Conflicts") and can be taken back.

<!-- chapter: fuel -->
# Fuel and level

Prepare the fuel of a flight and choose its level: an aircraft, a route, a level, and the quote comes out — taxi,
trip fuel, reserve, block fuel, flight time and top of descent.

## How to use

**The aircraft.** Choose its performance sheet in the first card. Without a sheet, take “Other type (ICAO code)…” and
type its ICAO code (C30J, EC45…): the quote then starts from an estimate of the type, marked “approximate”. The
“Cruise” line says where the fuel flow used comes from.

**The route.** Type the departure and the arrival (ICAO codes): the distance and the true track are computed by
themselves. For a detailed route, unfold “Detailed route” and paste it (ICAO flight plan, or one "point latitude
longitude" line per point). If nothing is recognised, type the distance and the track by hand. With your SimBrief ID
set (⚙), “Last SimBrief OFP” takes the route, the level, the mean wind and the aircraft of your last plan in one go.

**The level and the wind.** Give the cruise level (as a flight level) and the wind: direction and speed. Without a
direction, or without any wind, the block fuel is given as a range. “Climb” chooses how to climb: economical, best
rate, fast, at the sheet's airspeed, or manual (you give airspeed and rate of climb).

**Choosing the level.** The drawing shows, for each level, the trip fuel (solid line) and its duration (dashes). The
green dot marks the most economical level, the orange square the fastest; the grey area, the levels that cannot be
held on this trip. Touch the curve to choose a level, or use the two buttons.

**The result.** At the bottom of the screen, always visible: block fuel, trip fuel, flight time and distance of the top
of descent before arrival. “Quote details” breaks it down phase by phase.

**The climb instructions.** Unfold them to follow the climb up to the level: power, RPM, airspeed, rate of climb, fuel
flow, Mach, time and fuel totals at each step, with the profile drawn.

**Open in.** Below the result, “Open in” prepares the same flight elsewhere, in a new tab: SimBrief (flight options
prefilled, SimBrief login required), SkyVector (the route drawn, with speed and level), Navigraph and ChartFox (the
charts of the departure and arrival airfields, login required). A greyed-out entry says what it lacks (airfield,
aircraft type). Nothing is sent that is not already in the flight.

**On to the map and the report.** The flight prepared here — aircraft, route, level, climb and descent profile — is
shared: open Map or Report, it is already there.

## Performance sheets

The “Sheets” tab gathers the airline's sheets, shared with all its devices.

- **Import**: a file (performance CSV, JSON, Little Navmap `.lnmperf`, SimBrief OFP) or pasted text (the same, or
  ChatGPT's answer). A sheet drawn from an OFP is calibrated on its real times and fuel burn.
- **Nothing is written without you**: every change to a sheet goes through a preview, one line per value, before and
  after. Untick what you do not want to take, then “Apply the selection”. A row of the power table that would be
  removed is listed too: unticked, it stays.
- **Completing a sheet**: “Complete (EUROCONTROL)” offers the known values of the type; those that would replace a value
  already entered come unticked. “Complete from another sheet” fills the empty fields only.
- **ChatGPT**: “Copy the ChatGPT request” prepares the question for the type (or for the empty fields only); paste it
  into ChatGPT, then its answer as it is in the area provided, and “Read”.
- **Editing, exporting**: the editor shows the fields by group. On a computer screen the power / fuel-flow table is
  edited row by row; on a phone it is read only. `.lnmperf` and JSON exports; deletion after confirmation.

## Settings and units

In “Quote settings”: taxi and reserve minutes, contingency percentage, and a cruise fuel flow for this flight only (it
replaces the sheet's). “Displayed units” changes fuel (kg or lb), speed, altitudes and distances on screen; levels stay
flight levels, and nothing changes in the sheets.

## Special cases

- **No sheet**: the quote rests on an estimate of the type, marked “approximate”; import or create a sheet as soon as
  you can.
- **No known fuel flow**: the quote says so rather than showing a misleading zero.
- **Unknown route**: the points not recognised are listed; the distance and the true track are typed by hand.
- **Offline**: everything is computed on the device, from the sheets already received. Only the SimBrief call waits for
  the network; the last OFP stays kept on the device.

<!-- fr: cad99988d12f -->

<!-- chapter: maps -->
# Map

See your flight on an aeronautical chart and its vertical profile, or the maps of a mission: airspaces, airfields,
beacons, airways, minimum altitudes. The map is for viewing only: it changes nothing.

## How to use

**The planned flight.** The map shows the flight prepared in Fuel: departure, route points, arrival, and the alternate
airfield in grey dashes. At the top, a line sums it up: departure and arrival, alternate, level, distance, aircraft
type. When the flight changes in Fuel, the map follows by itself.

**The map and what it shows.** Around the route: the airspaces it crosses or skirts (restricted, danger and prohibited
areas, controlled airspace), the low or high airways depending on your level, the airfields and the beacons, and in
each one-degree square the minimum safe altitude (the brown figure, in thousands and hundreds of feet: “3⁵” means
3,500 ft). The small purple figures along the route are the distances from the departure, in nautical miles. Drag the
map with one finger, spread two fingers to zoom; “Recentre” comes back to the whole route. Seen from afar, the map only
shows what is near the route; zoom in to see everything.

**The profile and the cursor.** Below the map, the vertical profile cuts through the route from end to end: the
terrain, the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the
profile: a blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The
line below the profile says what is under the cursor: distance from the departure, planned altitude, terrain height,
and the airspace you are in at that point.

**Climb and descent.** The purple diamonds mark the top of climb (TOC) and the top of descent (TOD), on the map as on
the profile. They come from the Fuel calculation; without it, the map estimates them with common rates of climb and
descent.

**Mission maps.** The first list at the top chooses what the map shows: the planned flight, or a mission of the
airline. For a mission, a second list chooses among its maps (overview, target, detail…). Each map is redrawn as in
the studio: same frame, same display profile, with the mission's points, its hatched areas and its route. The vertical
profile then shows the mission's.

**Editing the route.** The map does not change the route: “Edit the route” opens Fuel, where you rework it. When you
come back to the map, the new flight is already there.

## Without network

**What works without network.** The map, the airspaces, the airfields, the beacons and the profile stay available
offline for the areas already viewed, and for those kept in Settings › Offline data. Keep the area of your flight there
before you leave: everything will be there, even without network.

**The base map.** The background (roads, towns, coloured terrain) comes from the Internet. Without network, the map is
drawn on a plain background with country outlines, and a line says so; everything else is there.

**The profile terrain.** The profile terrain also comes from the Internet. Without network, the profile shows instead
the minimum safe altitude of each square crossed (in brown dashes), and a line says so.

## Special cases

**No flight.** Without a prepared flight, the map is hidden and offers “Open Fuel”. The mission maps stay available
from the list at the top.

**No aeronautical database.** If the aeronautical database has not yet been published by a device of the airline, the
map shows only the route, and says so.

**Area not kept.** Offline, over an area never viewed nor kept, the map has nothing to show; the “Offline data” button
opens the settings to keep it next time.

**Different cycle.** Each mission map remembers the data cycle it was made with. If the current database is from
another cycle, a line says so: the airspaces may have changed since.

**Old mission.** A mission saved before this version does not carry its display profile. The map then takes the usual
profile for the type of map (detailed for a target or a detail, simplified otherwise) and says so. Opening the mission
in the studio and saving it is enough for it to keep its own from then on.

<!-- fr: 83aa8c905f0e -->

<!-- chapter: report -->
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
flight prepared in Fuel or Map is offered the same way (“Current flight”).

**The other sources.** Unfold “Other sources” to take your last IVAO or VATSIM flight, your SimBrief flight plan, or a
pasted text: an ICAO flight plan, the page of a flight from the IVAO tracker or from StatSim, a METAR. Only empty fields
are filled; next to each one, its source. If a source gives something else for fields already entered, a button offers
to replace them.

**The mission.** At the second step: the family (suggested from your last report), the series, the mission identifier
if the flight follows one, then the blocks specific to the family. Some blocks only appear for one series (for example
VIP or ferry for special missions).

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

<!-- fr: b8fc73c91418 -->

<!-- chapter: flightlog -->
# My flights

All your past flights in one place, one line per flight, from the most recent to the oldest: your reports, the
airline website's log and your IVAO or VATSIM connections, with no duplicates.

## How to use

**The totals.** At the top, three boxes: the number of flights, the block hours and the flights that do not have a
report yet, for the chosen period. Just below, the three aircraft types you have flown the most.

**The filters.** Choose the period (7 days, 31 days, 1 year, all), search for a callsign, a type, a registration, an
airfield, a mission or a report number, or tick “Without report” to see only the flights waiting for one. Your choices
stay on the device.

**The list.** One line per flight: the date, the callsign, the route and the block time. An orange dot marks a flight
without a report. On a computer, the line also shows the aircraft and the report number.

**The details of a flight.** Touch a line to unfold it: where the flight comes from (report, website log, IVAO or
VATSIM network), its time, the aircraft, the mission and the notes.

**Writing or opening the report.** On a flight without one, “Write the report” opens a new report, already filled in
with this flight — date, aircraft, callsign, airfields — and a suggested mission family. On a flight that has one,
“Open the report” opens it again for editing.

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

<!-- fr: 99d023557d9a -->

<!-- chapter: website -->
# Airline website

The link between the app and the airline's website, which has no interface for applications: its flight log and its
fleet come in by copy and paste (or through the launcher of a computer), and the website address is set here, once for
the whole airline.

## How to use

**My flight log.** On the website, open the “Log des vols” page (the “Open the page” link leads there), select all,
copy, then paste into the card's box and “Read”. Only your rows, those of your trigram, are kept; they feed My flights.

**The airline fleet.** Same move with the website's “Flotte” page: the aircraft, their callsigns, their base and their
location. The report and the map use it.

**Nothing is written without you.** After “Read”, a preview tells what changes: new, changed and unchanged rows or
aircraft (and, for the log, the other pilots' rows, ignored). “Save” writes, “Cancel” leaves everything as it was.

**Read through the launcher.** On a computer where the app is served by the launcher, “Read through the launcher”
fetches the website's page for you, with no pasting, then shows the same preview. Where the website cannot be reached
(phone without a launcher), the button goes away and pasting remains the way in.

**The airline.** The Airline card gives the name, the website address and the path of its pages (“Record my flight”, log, fleet, aircraft page). It is edited on a computer screen and shown read only on a phone. This setting is
shared by the whole airline; it is what turns on “Save and record on the website” in the report.

## Good to know

- **The app never writes on the website** and never knows your password: you log in on the website yourself, and the
  report's “→ Vol” bookmark fills in the form without submitting it.
- **Pasting the HTML**: copying the page from the browser keeps the aircraft links; “Paste from the clipboard” reads
  them directly when the browser allows it.
- **The log grows**: the rows the website's page no longer shows (earlier pages) stay kept.
- **The fleet is merged**: an aircraft on the page replaces the one already known (its extra callsigns are kept); those
  not on the page stay.

## Special cases

- **No trigram**: the log cannot pick your rows; set it (⚙).
- **Address not set**: the links to the pages and the recording of the flight wait for the Airline card.
- **Offline**: pasting always works; what is saved goes out at the next synchronisation.

<!-- fr: cfdf162727aa -->

<!-- chapter: settings -->
# Settings

The settings of this device (⚙ at the top of the screen): your identity, what the app shows you, how data are
exchanged, and what the device keeps offline. They stay on the device, never synchronised.

## How to use

**Your identity.** In “Identity”, type your trigram and your IVAO VID, VATSIM CID and SimBrief IDs, then “Save”. The
tools use them to prefill; with several users, the trigram is needed.

**The level.** “Level” chooses what the menu shows: Discovery, Everyday or Full, with one tap. Under each choice, the
“Menu:” line says which tools it shows; a hidden tool stays reachable by its address.

**The design.** “Design” shows one thumbnail per look — Standard, Cabinet, Rugged — and the tone: Automatic (as the
system), Day or Night. One tap applies it at once, on this device only.

**The usages.** The sentence at the top of “Usages” says how data are exchanged. With no box ticked you are “Alone on
this device”: nothing goes elsewhere. Tick “Alone, on several devices” or “Several users (git data repository)” to
exchange. On a workstation served by the launcher, the app already reads and writes the launcher's `data/` folder, even
with no box ticked; an exchange usage also shares it through git.

**Data access.** On a phone or on the website, set in “Data access” the repository (account/repository), the branch and
your personal token, then “Test” and “Save”. On a workstation served by the launcher there is no token: the card
shows the remote repository of `data/` (see “A git repository for data/”).

**No access and no launcher, no bases.** A device with no access set and no launcher — the website opened on a phone
for the first time, for instance — has neither the aeronautical base (airspaces, airfields, beacons) nor the aircraft
base: “Offline data” says so. Two ways in: set the access to the data repository, even without ticking an exchange (it
then only reads the bases); or, on a workstation with the launcher, publish the bases to the repository (V2: Settings ›
Maintenance › Aeronautical data and Aircraft types), then synchronise.

**Synchronisation.** With an exchange ticked, the “Synchronisation” card gives the last success, the pending writes and
the network; “Synchronise now” sends and receives at once. Otherwise it runs by itself at start, every 10 minutes
online and when the network comes back.

**The backup.** Alone on this device, “Export (one file)” keeps all your data in a file: it is the only copy. “Import
(merge)…” takes it back without losing anything here; “Replace from a file…” first erases what is on the device.

**Offline data.** Each published zone has its row: its state on this device, its cycle and its size. “Keep offline”
downloads it whole (preferably on Wi-Fi); “Free” gives the space back.

## Launcher keys

On a workstation served by the launcher, “Launcher keys” sets the IVAO API key: it stays in the launcher’s `secrets/`
folder, never in the browser nor in the data. “Test” checks that IVAO answers; “Erase” removes it.

## A git repository for data/

On a workstation served by the launcher, “Data access” shows the remote repository of `data/`: its address and its
branch. To set or change it, type the address (`git@host:account/repo.git` or `https://…`, with no password or token
in it): “Check” says whether the repository answers, “Save” sets it. Towards another address than the configured one, a Yes / No window opens on the computer, not in the page: the card says so before the click; answer it (it may be behind other windows), then come back. Refused, closed or already open: the card gives the reason and `data/` stays as it is. This is on purpose: a malicious page must not be able to send your data elsewhere. Nothing blocks: a repository that does not answer is
only reported.

- **Access to the repository** is set on the computer: an SSH key for a `git@…` address, credentials stored in Git for
  an `https://…` address.
- **Several users through git** need this remote repository: without it, the “Several users” box leads nowhere, and
  the “Usages” card says so.
- **data/ missing or without git**: the card opens a door. `data/` is a folder ignored by the code repository; it
  becomes its own git repository, linked to the data repository (not a submodule). Type the address of the data
  repository, and if needed a username and a password or token (never kept by the page; “Remember” hands them to Git on
  this computer). Without `data/`, “Fetch the data” clones it; with a `data/` without git (example data or archive),
  “Take data/ into this repository” links it to the repository. The card follows the work and reads the state again at
  the end; a failure is explained, nothing is lost.

## Good to know

- **The token**: a fine-grained token from github.com, on the data repository only, “Contents” read and write, 90 days
  at most. It is never shown again; never paste it in a message.
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token on github.com.
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **About**: links to this help and to the roadmap (what is delivered, in progress, planned), then the
  diagnostics, folded; “Copy” puts it on the clipboard to report a problem. The token is
  never in it.

<!-- fr: d3ca81fe9923 -->
