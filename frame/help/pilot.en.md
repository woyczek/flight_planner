<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** On a phone, the bottom bar gives five entries: Prepare, Map, Report, Flights, Settings (Prepare groups
  several tools: a row of tabs above the tool links them); on a screen, each tool is a verb of the left column. A tool's
  address (`#fuel`, `#report`…) is enough to come back to it.
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

Preparation follows five steps, in the order a flight is prepared:
**1 Flight, 2 Route, 3 Weather, 4 Quote, 5 Departure**. On a phone, the top bar shows one step at a time (touch a number
to go to it, “Next” at the bottom of each step); on a wide screen, the five steps are one below the other. Everything is
recomputed at each change: correct the route, and the weather, the quote and the wind follow, with no button to press.
The result (block fuel, trip fuel, time, top of descent) stays visible at the bottom of the screen at every step, with
where the wind comes from (“wind: METAR LFRS”, “wind: ICON forecast FL060”, “wind typed”). On a phone this bar takes three lines: the context
(“Block · FL060→090→110→070 · wind ARPEGE FL060”, in full when touched), the block fuel, then three tiles “Trip”,
“Time” and “TOD” (top of descent). The screen always opens on the “Quote” tab; the sheets open with the “Sheets” tab. A ✓ marks a completed step.
Levels are written the same way everywhere: as FL from 5,000 ft up (FL060), in feet below (3,500 ft).

**1 Flight.** The departure, the arrival and the alternate (ICAO codes), the flight date if you want the forecast (TAF)
rather than the observation, the aircraft and the cruise level (as a flight level). The aircraft fits on one line: the
chosen aircraft, its registration, its callsign and where it comes from. A new flight takes the last aircraft chosen on this device; with none
chosen, the quote waits. The magnifying glass opens the search (the last chosen first): type a
sheet, a registration, a callsign or a type. The results come in this order: your performance sheets, the airline's
aircraft (its fleet, then those known from its logbook), the published types, and last the code as typed. An airline
aircraft takes its own sheet if it has one, otherwise its type's, otherwise an estimate of the type — the quote then
marks it “approximate”. The chosen registration and callsign follow the flight through to the report. The “Cruise” line
says where the fuel flow comes from.

Next to the date, the “+30” clock sets the flight 30 min from now (rounded to 5 min; each press adds 30 min) and “Now”
goes back to the current time: the aerodrome weather (the TAF if it covers that time) and the winds aloft are read again
at once.

**2 Route.** Type the route in the “Route” field (Enter confirms it), always visible: the points, the airways and the
levels, as in a flight plan (“LFBO TOU UN460 NTS/F280 LFRN”). You can also paste an ICAO flight plan or the list of an
OFP there. When you leave the field, the route is tidied up: in capitals on one line, without DCT or speed-level groups,
the departure and the arrival at the ends, a level change written “/F280” after the point where it starts. Airways stay
written (the quote follows the points). Unknown points stay in place and are reported just below; coordinates are
written the ICAO way (“4530N00030E”). The next line gives the distance and the true track, and where they come from (the
route, the SimBrief OFP). If the route does not resolve, “Type them by hand” opens the two fields. With your SimBrief ID
set (⚙), “Last SimBrief OFP” takes the route, the level, the mean wind and the aircraft of your last plan in one go.

The “Points” fold lists the recognised points, from departure to arrival. The arrows move a point up or down the list,
the cross removes it; the field at the bottom adds one before the arrival: an identifier (beacon, fix, airfield) or
“NAME latitude longitude”. Each intermediate point has an optional level field, in FL: it is the level held from that
point on, for a step climb or step descent. A point without a level continues the previous one (shown greyed out); the
flight starts at the plan's level. The quote counts each step (its climb or descent, then the cruise at that level), the
result shows the sequence of levels (FL100 → FL120), and the descent starts from the last level. Every change rewrites
the “Route” field and is passed straight on to the map; a typed airway stays written as long as the two points framing
it stay neighbours and in place.

“Show the map” shows the flight on the map: on a phone the Map opens (the header button brings you back here); on a wide
screen it opens alongside, and follows every change. “Edit the route” on the map brings you back to this step, with the
route field ready for typing.

**3 Weather.** The wind (direction and speed) and the ISA deviation. Without a direction, or without any wind, the block
fuel is given as a range. “Read the aerodromes’ weather” shows the departure, the arrival, the alternate and the
airfields along the route: all those within 10 NM on either side of the route (radius adjustable in the quote settings)
that have a METAR or a TAF; the others are ignored. Each airfield gives its distance from the departure (the alternate,
from the arrival); beyond two, the intermediate airfields are folded away below the departure, the arrival and the
alternate. For each one, what matters for the flight: the category (VFR, MVFR, IFR, LIFR, in colour), the wind and its
headwind and crosswind components on the airfield's main runway (the direction closest to the wind), the ceiling, the
visibility, the temperature and the QNH, and a warning when CB or TCU are forecast; the raw message is folded away. With
a flight date, the TAF answers if it covers that time (and its temporary changes), otherwise the METAR. Tick “Real
weather” for the quote's wind to become the mean of the winds of the airfields on the route (departure, intermediate
airfields, arrival), leg by leg and weighted by their length — an approximation from the surface wind, stated below the
fields. Offline, the last values read stay displayed with their time.

“ISA ±” is the temperature deviation from the standard atmosphere, in °C: it changes the power available, the true
airspeed and the ceiling. Once the weather has been read, the line below computes it from the departure METAR — its
temperature minus the airfield's standard temperature (15 − 1.98 × airfield elevation in thousands of feet) — and “Use
ISA …” copies it into the field. The deviation chosen is kept in your settings: the next flight starts from the same
one. Once the forecast aloft has been read, a second line offers the deviation at the planned level, averaged along the
route (“ISA −5 at FL060 from the ARPEGE forecast”); with “Real weather”, the quote takes that one, like the wind. “Read
the aerodromes’ weather” says “Reading…” during the calls.

“Read the aerodromes’ weather” also reads the forecast aloft (Open-Meteo, no key, with or without the launcher) at the
route's points: the “Winds and temperatures aloft” card gives, for each point, the planned level (its steps included),
the wind, the temperature and the ISA deviation at that level, with the model (Météo-France AROME / ARPEGE over France,
ICON elsewhere in Europe, GFS beyond), the target time (the flight date, otherwise now) and the run time. With “Real
weather”, the quote's wind becomes the mean of these winds at the planned level, along the route, instead of the METARs'
surface wind; the line below the fields says so. The same winds go to the Map, which draws them as arrows. Offline, the
last forecast read stays. When the route or the time changes, the previous wind aloft stays, marked “forecast loading…”,
until the new forecast arrives; if it does not come, the METARs' surface wind takes over and this is stated (“forecast
aloft unavailable”).

**4 Quote.** The drawing shows, for each level, the trip fuel (solid line) and its duration (dashes). The green dot
marks the most economical level, the orange square the fastest; the grey area, the levels that cannot be held on this
trip. Each level is worked out like the quote, with the forecast wind at that level when the real weather is on:
at the chosen level, the curve and the quote give the same figure. On a route with steps, every point of the curve is a flat flight at its level, without the steps: the black diamond marks the plan's real quote (with the route's steps and the plan's wind), given under the drawing (“Plan: FL160, 856 kg, 0:54”), and its gap from the curve is the cost of the steps. The fuel axis follows the chosen unit (kg or lb). Touch the curve to choose a level, or use the two buttons. “Climb” chooses how to climb: economical, best rate,
fast, at the sheet's airspeed, or manual (you give airspeed and rate of climb).

The “Density altitude” fold shows, for the ISA deviation on the horizontal axis, the density altitude of each pressure
altitude (one line per thousand feet): it is the altitude “felt” by the rotor, the propellers and the engine. The
vertical line is the flight's deviation, the horizontal line the sheet's ceiling; where they cross tells at which
pressure altitude the aircraft reaches its ceiling that day (line in bold). A dot marks the departure according to the
METAR (temperature and QNH). Important for helicopters: in great heat or at altitude, the real ceiling can fall well
below the sheet's.

Below the chart, “Real atmosphere at departure” shows the forecast temperature at each altitude above the departure
(solid line) against the standard atmosphere (dashes): where the curve moves away from it, the ISA deviation changes
with altitude, and inversion layers (temperature rising with altitude) are highlighted and stated below. The reading
line gives, at the planned level, the real temperature, ISA deviation and density altitude.

Unfold “Climb instructions” to follow the climb up to the level: power, RPM, airspeed, rate of climb, fuel flow, Mach,
time and fuel totals at each step, with the profile drawn. The result gives block fuel, trip fuel, flight time and
distance of the top of descent before arrival. “Quote details” breaks it down phase by phase.

“Open in” prepares the same flight elsewhere, in a new tab: SimBrief (flight options prefilled, SimBrief login
required), SkyVector (the route drawn, with speed and level), Navigraph and ChartFox (the charts of the departure and
arrival airfields, login required). A greyed-out entry says what it lacks (airfield, aircraft type). Nothing is sent
that is not already in the flight. The quote settings (taxi, reserve, margin, weather corridor, units) are in the last
fold.

**5 Departure.** A one-page summary: the aircraft, the route as it will be filed, the level (and its steps), the wind
and its source, the block fuel. “Start the flight” launches the flight plan (start-up, pushback, taxi…). The preparation
may date back several days: so it begins by redoing everything at the real time — the flight date returns to now, the
aerodrome weather and the winds aloft are read again, the quote is redone — and says in one line what has changed (“wind
273°/35 kt → 284°/44 kt · block 684 → 644 kg · planned arrival 15:03Z (17:03)”); offline, it says so and starts with the last
quote. It then records the departure time, which becomes the report's start-up time. On a phone it opens the Map, on a
large screen it stays here with the Map on the right. Changing the departure airfield afterwards means preparing another
flight: the departure time is cleared. Changing the arrival after departure is a diversion: the time is kept and the
diversion recorded.

Once the flight has started, the result at the bottom of the screen says “Flight started at 11:14Z (13:14) · for 1 h 10”. Times are UTC (“Z”);
the device's time is added in brackets at the departure, the planned take-off and the planned arrival. A
started flight ends with the writing of its report: when it is saved, Fuel goes back to preparation and My flights
removes “in progress”. To go back to preparation without a report, “Cancel the start” (after confirmation). The “Planned
progress” card shows where the flight should be, in theory: the planned time over each point (taxi, climb, cruise leg by
leg with its wind, descent), the next point highlighted, the distance flown and remaining, and the planned remaining
fuel. It follows the clock, minute by minute, until the report or the cancellation, and goes to the Map with the flight.
The flight prepared here — aircraft, route, level, climb and descent profile — is shared: Map and Report already have
it.

## Performance sheets

The “Sheets” tab gathers the airline's sheets, shared with all its devices. They are sorted by category
(helicopters, turboprops, jets, piston engines, others); each type the airline uses (fleet, reference) that has no
sheet yet is listed too, “performance to fill in”, with “Create the sheet”.

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
- **Offline**: everything is computed on the device, from the sheets already received. Only SimBrief and the weather
  wait for the network; the last OFP and the last weather stay kept on the device.
- **Weather without the launcher** (a phone, a tablet): METARs then come from metar.vatsim.net, with nothing to set up.
  TAFs (useful when you give a flight date) come from avwx.rest, with your personal weather key, entered once on the
  device in Settings, “Weather key (TAF, avwx.rest)” card; without a key, the card says so and the METAR answers
  instead. The weather card says where the messages come from. With no network at all, it shows the last weather kept,
  with its time.

<!-- fr: e1923cc95a7a -->

<!-- chapter: maps -->
# Map

See your flight on an aeronautical chart and its vertical profile, or the maps of a mission: airspaces, airfields,
beacons, airways, minimum altitudes. The flight's route can also be changed on the map.

## How to use

**The planned flight.** The map shows the flight prepared in Fuel: departure, route points, arrival, and the alternate
airfield in grey dashes. Under the top bar, a line sums it up: departure and arrival, alternate, level, distance, aircraft
type. When the flight changes in Fuel, the map follows by itself.

**The map and what it shows.** Around the route: the airspaces it crosses or skirts (restricted, danger and prohibited
areas, controlled airspace), the low or high airways depending on your level, the airfields and the beacons, and in each
one-degree square the minimum safe altitude (the brown figure, in thousands and hundreds of feet: “3⁵” means 3,500 ft).
The small purple figures along the route are the distances from the departure, in nautical miles. Drag the map with one
finger, spread two fingers to zoom; “Recentre” (the target in the top bar) comes back to the whole route. The map stays where you put it, even when
the route changes: only “Recentre” (or another flight) reframes it. Seen from afar, the map only shows what is near the
route; zoom in to see everything.

**The profile and the cursor.** In the data block under the map, the vertical profile cuts through the route from end to end: the terrain,
the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the profile: a
blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The line below
the profile says what is under the cursor: distance from the departure, planned altitude, terrain height, and the
airspace you are in at that point. Under the map, this data block shows the profile; the list of airspaces at a point or
an airfield's reporting points open in its place when you ask for them, and the profile comes back when they are closed.

**A fixed screen.** The top bar, the map and the data block fill the screen, and nothing scrolls but the block's
content. The block is a sheet: drag its top line (the small bar and the title) up to enlarge it, down to shrink it to
that line, which leaves the whole height to the map; a tap on the line collapses it or brings it back to its normal
height.

**Six map modes.** The last button of the top bar shows the chosen mode; tap it to see the six modes. “Low IFR”:
low airways, airspaces, minimum altitudes and beacons. “High IFR”: upper airways (UN…, UM…), airspaces above FL195.
“VFR”: topographic background with towns, the airspaces that matter in VFR, reporting points and obstacles. “Topo”: the
terrain and, close up, the contour lines (every 500 ft or 100 m depending on your unit, the index contours numbered),
with only airfields, towns and obstacles. “OAT”: military flight, the IFR of your level plus the air refuelling tracks,
the day's NAT tracks, the R, D, P, TSA, TRA, CBA areas and the low-flying network at all levels. “Auto” chooses from
your flight's level (High IFR from FL195). The mode is kept on this device.

**The closer you zoom, the more it tells.** From afar, the map shows only the large airfields, the airways and their
names. Closer: the airway points (triangles and beacons), each airway's minimum level (“F195”), then the segment's
distance, its track (“097°”), the reporting points and the obstacles. Close up, each obstacle carries its height above
ground, and the elevation of its top in brackets (“434 AGL (771)”).

**Layers.** The layers button, at the top left of the map, opens the list of what the map draws: airspace families (TMA /
CTR, D / R / P, FIR, others), lower and upper airways, beacons, airway points, VFR reporting points, obstacles, minimum
altitudes, towns, graticule, alternate, airspace names, airway names. Tick or untick: the map follows, and your choice
is kept for this setting on this device. “Reset all” goes back to the original choice. “Around the route only”, ticked
by default in IFR, keeps airspaces and airways near the route; unticked, the whole visible map is drawn, to look
elsewhere. Close up, everything is drawn anyway. At the bottom, the “Complexity (trial)” slider shows fewer details to
the left, more to the right, at every zoom. Each element of the map has its zoom range: VFR reporting points appear only
very close, CTRs close up, TMAs in a medium view, FIRs from afar. The size of the map counts too: in a small frame
(phone, pane of the dual view) it shows fewer elements than a large one at the same zoom, as if you were further out
(the zoom is corrected by the mean of the frame's height and width, 900 px meaning no correction).

**Tap or hover to learn more.** Tap, click or hover over an airway's name, an airspace's label or a wind barb: a small
bubble gives the essentials in two lines — for an airway, the segment (point → point), its distance, its tracks, its
floor and ceiling; for an airspace, its name and its limits in AIP notation (“TMA 8 AQUITAINE 2000|FL145 D”). Tapped
elsewhere inside an airspace, the data block under the map shows the airspaces under your finger, one or several, in
place of the profile: a chart of levels, like the vertical profile (one numbered column per airspace, from its floor to
its ceiling), then the numbered list with their limits. The ✕, Escape or a tap on an empty spot of the map close it and
the profile comes back, another tap on airspaces replaces it; moving the map leaves it. The map neither moves nor
changes size. The hover bubble follows the pointer, stays 5 seconds, gives way to the next one, and closes with a tap
elsewhere or a move of the map. Over a beacon, the bubble gives its type, ident and frequency; where several beacons
share a place, the map keeps the most useful one (VOR, TACAN or DME, then NDB, then ILS) and the bubble names the others
(“also here: ILS 25L BG 109.9”). On the profile, your finger or the mouse give the airspaces crossed in the same way.

**The VFR reporting points of an airfield.** Move the mouse over an airfield: its reporting points and the sequences
taken from its VAC charts light up (named circles, dashes between the points). On the map, a reporting point carries
only its short code (“NA”, “E”, “SE”…), so that the map stays legible; the long name is in the bubble and in the list.
Tap the airfield: the map zooms in on its points when they are crowded, and the data block under the map, in place of
the profile, gives the list of points (code, long name, restrictions), the sequences (with the VAC page), then the
instructions of the VAC, folded page by page; it scrolls when the content is long. It stays open while you move the map:
the ✕ or Escape closes it and the profile comes back, another airfield replaces it. Tapping a reporting point opens its
airfield's content in the same way, that point first. In VFR mode, the points of the departure and arrival airfields are
shown automatically. These data are extracted automatically from the VAC: they are marked “to be checked” and are not
the published route; the VAC chart prevails. When the airfield has been analysed by hand, the block says so, the routes
carry their name, runways and conditions, a reviewed track follows the VAC chart (long dashes) and an arrow marks a
one-way route. The reporting points of the database are always there, in black for aeroplanes and in green for
helicopters; the sequences and instructions of the VAC are added once the administrator has imported them (Settings ›
Maintenance).

**In flight.** Once the flight is started in Fuel, the map shows where you should be (hollow aircraft, “planned 14:32Z”)
and where you are (filled aircraft, turned to your track, with the trail of the last 30 minutes dotted). Above the map,
a line gives the difference: ahead or late (minutes and NM), how many NM off the route, and your altitude against the
planned one; the profile shows both altitudes. Close up, each point carries its estimated time (ETA) under its name, never over an airfield, in UTC (“14:52Z”), the local time in brackets at departure and arrival. “Follow” keeps the
map on your position; moving the map stops it. Without a position (GPS or network not enabled), the line says so and
opens the settings; a position older than 2 minutes is greyed. The line ends with the position's source: GPS, network,
IVAO, VATSIM, X-Plane or Little Navmap.

**Winds aloft.** When Fuel has the wind forecast at the flight level, the map shows it as barbs along the route: at
each point, and every 50 NM between two points. The staff points to where the wind comes from; a pennant is 50 kt, a
barb 10 kt, a half barb 5 kt. Tap a barb (or move the mouse over it): the bubble gives the direction, the speed, the
temperature, the level and the forecast hour. The “Winds aloft” layer hides them.

**Steps.** If the route sets a level at some points in Fuel, the profile draws the steps: climb, level-off, new
climb or descent, with the top of climb and top of descent computed again. The route's waypoints are also marked on
the profile.

**Climb and descent.** The purple diamonds mark the top of climb (TOC) and the top of descent (TOD), on the map as on
the profile. They come from the Fuel calculation; without it, the map estimates them with common rates of climb and
descent.

**Mission maps.** The first list at the top chooses what the map shows: the planned flight, or a mission of the
airline. For a mission, a second list chooses among its maps (overview, target, detail…). Each map is redrawn as in
the studio: same frame, same display profile, with the mission's points, its hatched areas and its route. The vertical
profile then shows the mission's.

**Editing the route on the map.** Tap “Edit” at the top right of the map: the waypoints get a circle. Drag a point onto
a fix, a beacon or an airfield: it settles there (dropped elsewhere, it becomes a free point named by its coordinates,
such as 4530N00030E). To add a point, tap “+” beside “Edit”, then tap the place you want (or keep pressing for half a
second): on a fix, a beacon or an airfield it settles there, elsewhere it is a free point; it is added to the nearest
segment. A simple tap adds nothing: it shows the bubble. Tap a route point: its card gives its level and offers
“Remove”. Departure and arrival do not move here. On the profile, drag a level up or down: the level changes from the
point that opens that segment, in steps of FL10 (on the first segment, it is the flight's level); in a point's card, “−”
and “+” do the same. “Undo” takes back the last gesture. Each change is saved in the flight at once, and Fuel redoes the
quote; the profile follows. “Done” closes the mode, and the map moves under your finger again. To type the route as
text, the pencil of the top bar (“Edit the route”) opens Fuel's Route step.

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

<!-- fr: 150d28aa1aed -->

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
- **Times** are UTC, marked "(Z)" on the fields; the started flight and the network fill them in UTC. An older
  report, entered in the device's time, is shown converted with the entered time below ("entered 18:30 local"); it
  is rewritten in UTC only if you save it.
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

<!-- chapter: flightlog -->
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
the network; “Synchronise now” sends and receives at once. Otherwise it runs by itself at start, every 10 minutes online
and when the network comes back. While writes are waiting, the card lists them, newest first: path, module and time, ✕
for a deletion, with the last error if there is one.

**The backup.** Alone on this device, “Export (one file)” keeps all your data in a file: it is the only copy. “Import
(merge)…” takes it back without losing anything here; “Replace from a file…” first erases what is on the device.

**Offline data.** Each published zone has its row: its state on this device, its cycle and its size. “Keep offline”
downloads it whole (preferably on Wi-Fi); “Free” gives the space back.

## The weather key

METAR works without a key. TAF, on a device without a launcher (phone, website), needs a personal and free avwx.rest
key: “Create a key on avwx.rest ↗” opens the provider's page. Paste it in “Weather key (TAF, avwx.rest)”, then “Save”;
“Test” asks for the TAF of an airfield, “Erase” removes it. The key stays on this device only, never in the repository
nor in a backup, and is never shown again. On a workstation served by the launcher it is not needed: the launcher
provides the TAF.

## Little Navmap sheets

On a workstation served by the launcher, the "Little Navmap sheets (.lnmperf)" card links your performance sheets
with the .lnmperf files of a folder, both ways. Choose the folder (Little Navmap's is offered when found), then
"Save". After that, nothing to do: a sheet changed in Fuel rewrites its file, a file changed in Little Navmap updates
the sheet, a new file becomes a sheet. If the same value changed on both sides, the newest wins and the other stays
kept in the sheet; the synchronisation button says so. A file is never deleted: the file of a removed sheet goes to
the `_removed` subfolder. "Synchronise now" runs a pass at once, "Stop" cuts the link. Sheets missing a value that
Little Navmap requires are listed and not written. On a phone, Fuel downloads the sheet as a .lnmperf file.

## Launcher keys

On a workstation served by the launcher, “Launcher keys” sets the IVAO API key: it stays in the launcher’s `secrets/`
folder, never in the browser nor in the data. “Test” checks that IVAO answers; “Erase” removes it.

## The tablet next to the simulator

You fly on the computer (X-Plane) and want the map on a tablet or a phone: on the computer served by the launcher,
“Computer access” opens the Pilot application to devices of the same local network (or start `lancer.cmd --lan`).

1. **Open to devices of the local network**: the card shows the address to open on the device, its QR code and a
   6-digit pairing code. Windows may ask to allow Python: accept for private networks only.
2. On the tablet, scan the QR code with the camera (or type the address), then enter the code. It is asked only
   **once per device**.
3. The tablet then sees the computer's data, the simulator's position in the flight badge, and “Launcher on
   <computer>” at the top.

- **Trusted network only**: everything goes over http, unencrypted. At home, yes; on public or hotel wifi, never.
- Access closes with the launcher, or with “Close access”. A paired device stays paired; “Forget the devices” asks
  them all for a code again (a lost tablet, for instance).
- On the tablet, the application does not work offline and does not use its GPS: the browser grants them only over
  https. The position comes from the computer's simulator.
- A code works only once and lasts 10 minutes: “New code” gives another. 5 wrong codes from one device: a
  one-minute wait; 30 in an hour: pairing closes until the next “New code”. “Forget”, next to a device, removes
  that one only.
- Only the computer's main address is opened; the others (VPN, virtual machines) only through “Open them too”.

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

## Configuring a pilot

**Preparing the configuration (administrator).** On a workstation served by the launcher, or on a device set up on
GitHub, unfold “Export a configuration for a pilot…” in the “Data access” card: it lists your steps in order. First
invite the pilot's GitHub name to the repository, with the Write role (the link leads to the repository's collaborators
page). Then type their trigram and the address of the published app, and “Create the file and the link”: the file
sog-config-<TRI>.json is saved, the link and its QR code are shown. They hold the airline, the data repository, the
trigram and how to create the token, never a token or a secret; the repository's owner (user or organisation) is noted
in them, and decides which token to create. Send the link or the file, or have the pilot's phone scan the QR code.

**Joining the airline (pilot).** The link, the QR code, “Import a configuration…” or “Join the airline…” (“Data access”
card) and the welcome card of the first opening open the “Join the airline” assistant, one screen per step: the
configuration received; the account (create it if needed, with the sign-up link) and the username; the invitation to
accept; the token, step by step (classic for a user's repository, fine-grained for an organisation's); the token pasted
and tested; the network IDs; and last “Finish and synchronise”, then the offline data. Ticked boxes stay on the device:
a settings card offers to resume where you left off. The “Join the airline” tutorial follows the same steps.

**Nothing more than the file.** Only what the configuration holds is set, and the access is saved only once the token is
tested; “Test” says what is wrong: invitation not accepted yet, token copied wrongly or expired, token without the right
on the contents. A classic token opens all the repositories of the account: for a user's repository, a GitHub account
dedicated to flying is advised. A file in another format is refused with a message. The airline is written to the
repository only if it has none yet. On a workstation whose data/ already follows this repository, the assistant skips
the account and the token. Without a launcher, the app only reaches a GitHub repository: for a framagit or GitLab
repository, set the access on a workstation with the launcher.

## Administration

**The administration pages.** At the “Full” level (“Level” card), the “Administration” card, below “About”, gathers the
administration and test pages, each with a sentence; at the other levels, it does not appear. In the app: the map
threshold tuning (`#maps?tune=1`, read only on a phone), the roadmap (`#roadmap`) and the diagnostics of the “About”
card.

**The benches, on a workstation.** Served by the launcher, they only open on a workstation with a launcher (elsewhere
they are named without a link); paths relative to the root of the suite: `labs/design_primitives.html` (primitives and
designs), `frame/aerodb/bench.html` and `frame/aerodb/offline_bench.html` (aeronautical base, online and offline),
`frame/store/test/` (data layer, against the fake GitHub) and `modules/maps/test/render.html` (map rendering).

**The workstation's V2 pages.** Shown only when a launcher serves the page: Settings › Maintenance
(`apps/settings/maintenance.html`), First launch (`apps/settings/premier_lancement.html`) and the map studio
(`apps/cpco/map_parser.html`).

## Good to know

- **The token**: a fine-grained token from github.com, on the data repository only, “Contents” read and write, 90 days
  at most. It is never shown again; never paste it in a message.
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token on github.com.
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **About**: links to this help and to the roadmap (what is delivered, in progress, planned), then the
  diagnostics, folded: transport, last sync, errors, repository tree, reference bases and aeronautical base, line by
  line; “Copy” puts it all on the clipboard, to paste in your message to report a problem. The token is
  never in it.

<!-- fr: 690a6cb3e469 -->
