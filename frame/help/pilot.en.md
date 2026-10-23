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

**The aircraft.** Choose its performance sheet in the first card. Without a sheet, take "Other type (ICAO code)…" and
type its ICAO code (C30J, EC45…): the quote then starts from an estimate of the type, marked "approximate". The
"Cruise" line says where the fuel flow used comes from.

**The route.** Type the departure and the arrival (ICAO codes): the distance and the true track are computed by
themselves. For a detailed route, unfold "Detailed route" and paste it (ICAO flight plan, or one "point latitude
longitude" line per point). If nothing is recognised, type the distance and the track by hand. With your SimBrief ID
set (⚙), "Last SimBrief OFP" takes the route, the level, the mean wind and the aircraft of your last plan in one go.

**The level and the wind.** Give the cruise level (as a flight level) and the wind: direction and speed. Without a
direction, or without any wind, the block fuel is given as a range. "Climb" chooses how to climb: economical, best
rate, fast, at the sheet's airspeed, or manual (you give airspeed and rate of climb).

**Choosing the level.** The drawing shows, for each level, the trip fuel (solid line) and its duration (dashes). The
green dot marks the most economical level, the orange square the fastest; the grey area, the levels that cannot be
held on this trip. Touch the curve to choose a level, or use the two buttons.

**The result.** At the bottom of the screen, always visible: block fuel, trip fuel, flight time and distance of the top
of descent before arrival. "Quote details" breaks it down phase by phase.

**The climb instructions.** Unfold them to follow the climb up to the level: power, RPM, airspeed, rate of climb, fuel
flow, Mach, time and fuel totals at each step, with the profile drawn.

**On to the map and the report.** The flight prepared here — aircraft, route, level, climb and descent profile — is
shared: open Map or Report, it is already there.

## Performance sheets

The "Sheets" tab gathers the airline's sheets, shared with all its devices.

- **Import**: a file (performance CSV, JSON, Little Navmap `.lnmperf`, SimBrief OFP) or pasted text (the same, or
  ChatGPT's answer). A sheet drawn from an OFP is calibrated on its real times and fuel burn.
- **Nothing is written without you**: every change to a sheet goes through a preview, one line per value, before and
  after. Untick what you do not want to take, then "Apply the selection". A row of the power table that would be
  removed is listed too: unticked, it stays.
- **Completing a sheet**: "Complete (EUROCONTROL)" offers the known values of the type; those that would replace a value
  already entered come unticked. "Complete from another sheet" fills the empty fields only.
- **ChatGPT**: "Copy the ChatGPT request" prepares the question for the type (or for the empty fields only); paste it
  into ChatGPT, then its answer as it is in the area provided, and "Read".
- **Editing, exporting**: the editor shows the fields by group. On a computer screen the power / fuel-flow table is
  edited row by row; on a phone it is read only. `.lnmperf` and JSON exports; deletion after confirmation.

## Settings and units

In "Quote settings": taxi and reserve minutes, contingency percentage, and a cruise fuel flow for this flight only (it
replaces the sheet's). "Displayed units" changes fuel (kg or lb), speed, altitudes and distances on screen; levels stay
flight levels, and nothing changes in the sheets.

## Special cases

- **No sheet**: the quote rests on an estimate of the type, marked "approximate"; import or create a sheet as soon as
  you can.
- **No known fuel flow**: the quote says so rather than showing a misleading zero.
- **Unknown route**: the points not recognised are listed; the distance and the true track are typed by hand.
- **Offline**: everything is computed on the device, from the sheets already received. Only the SimBrief call waits for
  the network; the last OFP stays kept on the device.

<!-- fr: c6ffb9983705 -->
