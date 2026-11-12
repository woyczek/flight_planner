<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** On a phone, the bottom bar gives five entries: Prepare, Map, Weather, Report, Flights. Touch an already
  selected tab again when it groups several screens: a small list opens above it (Prepare: Fuel and Performance sheets). On a
  screen, each tool is a verb of the left column. A tool's address (`#fuel`, `#report`…) is enough to come back to it.
  Settings are the ⚙ button of the header. The application's name, top left, opens the list of applications: Pilot, Company (the airline's missions) and, at the Full level, Maintenance (the same
  plane in red); a tap switches to it.
- **Your identity.** In ⚙ Settings, set your trigram and your IVAO, VATSIM and SimBrief IDs: the tools use them to
  prefill.
- **The level.** Also in Settings, "Level" chooses what the menu shows: Discovery, Everyday or Full. A hidden tool stays
  reachable by its address.
- **Help.** Each tool has a folded "How to use" panel below its content; the ? button of the header (on a phone as on a screen) opens
  this manual at the chapter of the screen you are on.
- **The status, on the ⚙ button.** In the header, the ⚙ button carries a dot: green when something is waiting for you (a
  flight started, a report to write), amber (on a phone) when something needs attention: no trigram, pending writes,
  conflicts, a synchronisation error, offline. Settings open on the "Status" block, which gives the detail: the flight in
  progress (touch to go to the Map), the reports still to write for your past flights (touch to open the report,
  pre-filled), the missing trigram (touch to set it), the state of the data (last synchronisation, pending writes, the
  exchange in use), the aeronautical database while it is not ready, the launcher, "Offline" when there is no network, the number of weather calls of the day (Open-Meteo forecasts,
  10,000 allowed a day), the end of the AIRAC cycle when the published aeronautical database or procedures are behind the
  cycle in force and,
  on a phone, the source of the position during a flight. On a phone the header is reduced to the name, the ? button and the
  ⚙ button.
- **Full screen.** On the map (the fixed-view tools), a round button at the bottom of the column of buttons over the map hides
  the header and the bottom bar to give the map all the room; the same button or Escape bring them back.
- **Phone in landscape.** Turned on its side, the phone puts the bottom bar as a rail of icons at the left (the same five
  entries; a second touch on Prepare opens its tools at the right of the rail), keeps the header, lays the map's data block as a
  column at the right (touch its first line, or drag it to the left, to widen or narrow it) and gives the map the whole height
  that remains. In full screen the column stays.

## Data and synchronisation

- **Position and track of the flight.** With the « several users » use, the actual position and the track of your current
  flight (one point per nautical mile or per minute, to about 100 m) are shared with the group and stay in the repository's
  history; they never go to an outside service without a gesture of yours.
- **Offline first.** Everything you do is kept on the device and works without network.
- **Alone on this device.** With no exchange ticked in Settings, nothing goes elsewhere: export the device backup (one
  file) from time to time, it is the only copy.
- **Several devices, or several users.** Tick the usage in Settings and set the access (GitHub repository and personal
  token, or a workstation's launcher). Your writes leave together at synchronisation: at start, every 10 minutes
  online, or with the status button at the top of the screen.
- **Conflicts.** A file changed here and elsewhere at the same time keeps its newest version; the other one stays
  available (status button, then "Conflicts") and can be taken back; "Seen" takes a conflict off the list and the count, "Mark
  all as seen" does it for all of them at once.

<!-- chapter: fuel -->
# Fuel and level

Prepare the fuel of a flight and choose its level: an aircraft, a route, a level, and the quote comes out — taxi,
trip fuel, reserve, block fuel, flight time and top of descent.

## How to use

<a id="fuel-quote"></a>Preparation follows five steps, in the order a flight is prepared:
**1 Flight, 2 Route, 3 Weather, 4 Result, 5 Departure**. On a phone, the top bar shows one step at a time (touch a number
to go to it, “Next” at the bottom of each step); on a wide screen, the five steps are one below the other. Everything is
recomputed at each change: correct the route, and the weather, the quote and the wind follow, with no button to press.
The result (block fuel, trip fuel, time, top of descent) stays visible at the bottom of the screen at every step, with
where the wind comes from (“wind: METAR LFRS”, “wind: ICON forecast FL060”, “wind typed”). On a phone this bar takes three lines: the context
(“FA50 · F-GXXX · Block · FL060→090→110→070 · wind ARPEGE FL060”: the aircraft of the quote first, “type estimate” when no sheet serves, and a tap on it opens the aircraft choice; then the fuel unit, “lb · lb/h”; in full when the line is touched), the block fuel, then three tiles “Trip”,
“Time” and “TOD” (top of descent). The screen always opens on the “Quote” tab; the sheets open with the “Sheets” tab. A ✓ marks a completed step.
Levels are written the same way everywhere: as FL from 5,000 ft up (FL060), in feet below (3,500 ft).

**The mission.** A flight prepared from a mission carries, at the top of the screen, the chip "Mission <ID>": it opens the mission sheet over the step (the risks first, then the summary, the objectives, the teams and the zones, each on the map), without leaving the step; the cross closes it.

**Points imposed by the mission.** The rendezvous, the target and the source (water scooping) of a mission are imposed points of the route: in the list of points they read "imposed by the mission" and cannot be moved up, down or removed; if the route text loses one, it is put back when you leave the field. The other points (transit) are yours: add or remove your own freely between them.

**New flight.** The "New flight" button at the top of the screen clears the flight being prepared (departure, arrival, route, procedures, level, OFP), after a question if it already carries something or is started; the aircraft stays. Changing an aerodrome for one more than 150 NM away, or changing both departure and arrival, also makes a new pair: the route, procedures and OFP of the previous flight are cleared, and the screen says so. A nearby aerodrome (a correction) only replaces the old one in the route.

<a id="fuel-step-1"></a>**1 Flight.** The aircraft comes first in the step: nothing is computed without it. The departure, the arrival and the alternate (ICAO codes), the flight date if you want the forecast (TAF)
rather than the observation, the aircraft and the cruise level (as a flight level); “Auto”, next to the level, takes the one that burns the least fuel on the route among the levels of the semicircular rule (up to the sheet's ceiling), says “auto” and the flight time under the field, and follows it when the route, the aircraft or the wind change — until you type a level. Under each code a fixed line gives the aerodrome's name for checking (“LFPO — Paris-Orly”; “unknown” when the code matches nothing). “⇄”, between departure and arrival, swaps them: it is a new pair of aerodromes, so the route, procedures and OFP of the outbound flight are cleared. From two characters, a code, the start of a name, a town or a country (“LFP”, “orly”, “stockholm”, “sweden”, “usa”), the field offers at most seven aerodromes: ↑ ↓ to choose, Enter to confirm, Esc to close, or a tap; the list closes when you leave the field, and typing the whole code by hand always works. The name can be typed in full (“toulouse”): only a chosen or typed code reaches the route, and a field left without a choice goes back to the saved aerodrome. The flight date (entered in the device's local time) is a single value, kept in the current flight: the quote’s weather (the aerodromes’ TAF, winds and temperatures aloft) is read at that date, the Map’s ETA starts from it while the flight has not started, and Weather’s slider starts from it; empty means now. The aircraft fits on one line: the
chosen aircraft, its registration, its callsign and where it comes from. A new flight takes the last aircraft chosen on this device; with none
chosen, the quote waits. “Change”, right after the aircraft, opens the search (the last chosen first): type a
sheet, a registration, a callsign or a type. The results come in this order: your performance sheets, the airline's
aircraft (its fleet, then those known from its logbook), the published types, and last the code as typed. An airline
aircraft takes its own sheet if it has one, otherwise its type's, otherwise an estimate of the type — the quote then
marks it “approximate”. The chosen registration and callsign follow the flight through to the report. The “Cruise” line
says where the fuel flow comes from; read from the sheet's RPM / fuel flow table, it says the two RPM rows and, when the table has several altitudes, the two curves the level is interpolated between ("2400 rpm between 2300 and 2500 rpm, between the curves of 4000 and 8000 ft"). The table is used only when two of its rows with a flow frame the cruise RPM (or one row is at that RPM): otherwise the cruise flow typed in the sheet counts, never the nearest row stretched.

Next to the date, the “+30” clock sets the flight 30 min from now (rounded to 5 min; each press adds 30 min) and “Now”
goes back to the current time: the aerodrome weather (the TAF if it covers that time) and the winds aloft are read again
at once.

<a id="fuel-theme"></a>**Family and series.** Under the date, "Family" and "Series" say what you are going to do: a cargo flight, a passenger flight, a test flight, a SAR mission… Optional, they are filled by the mission you prepare and offer only your airline's families (a commercial airline: CAT · Commercial air transport). The report takes them and can change them: forgotten here, they are chosen there.

<a id="fuel-step-2"></a>**2 Route.** Type the route in the “Route” field (Enter confirms it), always visible: the points, the airways and the A direct leg is flown by compass: its distance and course are those of the rhumb line, the straight line of the map. When a direct by compass is more than 2 % longer than the great circle (a long trip in a single leg), a line under the route says so: add intermediate points, for instance with "Compute A → B". Each point of the list can carry a time on area (⏱, in minutes): the quote counts it, one line per point, at the sheet's holding flow (else at the cruise of the point's level), and the times of the following points shift accordingly. Prepared from a mission, the time on area of its points is taken; a range ("5 to 40 min") counts its maximum by default, and you change the value; a duration the mission writes otherwise is said ("duration not read").
levels, as in a flight plan (“LFBO/32L TOU UN460 NTS/F280 LFRN/28”). You can also paste an ICAO flight plan or the list of an
OFP there. When you leave the field, the route is tidied up: in capitals on one line, without DCT or speed-level groups,
the departure and the arrival at the ends, a level change written “/F280” after the point where it starts. Airways stay
written (the quote follows the points). Unknown points stay in place and are reported just below; coordinates are
written the ICAO way (“4530N00030E”). The next line gives the distance and the true track, and where they come from (the
route, the SimBrief OFP). If the route does not resolve, “Type them by hand” opens the two fields. With your SimBrief ID
set (⚙), “Last SimBrief OFP” takes the route, the level, the mean wind and the aircraft of your last plan in one go.

**Compute and check the route.** On a workstation whose launcher carries the route computation, two buttons appear under the field (if the launcher has stopped since, the tap says so, "Available with the workstation's launcher (it does not answer)", with "Try again"): "Compute A → B" proposes routes from one aerodrome to the other (the points you typed are imposed passages), with their length, the FL kept and the number of rule deviations; a tap on a route shows it (highlighted here and on the Map, its detail unfolded) without taking it; "Choose" writes its route, its SID and its STAR. "Check" analyses the typed route as it is: the faulty segments turn red in the list of points with their reason (RAD, FRA, floor, ceiling…), and their number shows on the result bar; "N rule deviations" unfolds into one line per deviation: the segment, the rule (the RAD or FRA identifier) and the engine's sentence. A route whose check is incomplete for missing data is marked "incomplete check": it is neither validated nor in deviation. Each route also says its checked share: "checked 22 % · incomplete 65 % · fallback 14 %" ("fallback": a section the engine joined without being able to check it), and a fold lists its sections by layer (SID, FRA, airways, STAR). When no route can be computed, what the engine found comes apart, under "Unvalidated proposals": never said checked, to be checked if you take one. Each section says its nature with the Map's stroke: airway (solid), DCT (dashed), FRA (dotted), SID, STAR, approach; "Legend", under the list, shows them all. The routes are drawn on the Map: beside Fuel on a large screen, or through "On the map"; touching a trace shows it too, the list stays. Your typing is never replaced without "Choose". Without a RAD imported on the workstation, a link leads to its line in Data to import it. It is a simulation pre-check, not an IFPS validation. "Choose" takes the route and changes it: the other proposals disappear at once, here and on the map, and a line says which route was taken. From the tap, both buttons are busy and "Computing…" counts the seconds beyond two; a second tap starts nothing. A computation over 3 s says so under the list, with its largest part ("Computed in 7.4 s — 6.8 s of it at the launcher") and "Copy the diagnostic": the durations, in milliseconds, to attach to a report.

The “Auto” button next to the “Route” field writes the airways between the points: for each pair of named points that
follow each other with no airway between them, it looks for the shortest path over the published base's airways, open at the
planned level (each leg's floor and ceiling, within 100 ft; with no planned level, 6,500 ft, and a notification says so),
with a direct entry and exit within 60 NM and no detour of more than 40 %. The text becomes “LFRS TSA01 UT460 TSA05 LFML”;
the airway's middle points, which the text does not write, are kept in the points (distance, map and profile follow them).
A notification gives the result (“3 airways written, 254 NM”) or “no useful airway between X and Y”. Limits: airways are
taken in both directions (the base does not carry one-way yet), with no fine level restriction nor SID / STAR; check the
route. "Auto" always starts again from the pinned points — the departure, the chosen SID's exit, the points you typed, the STAR's entry, the arrival — and replaces what a previous "Auto" wrote: two "Auto" in a row give the same text, never a route that grows in loops. A leg that would pass a point twice, or lengthen the whole too much, stays direct, and the notification says why ("no airway near LACOU", "detour of more than 40 %"). When the SID's name is in the text, its exit is written after it ("LFBO LACOU7B LACOU …") and the leg from the exit to the first point is routed. An airway you type between two points ("GILUX A3 MOTAL") is always read as an airway, never as a point of the same name elsewhere; it is followed only if it really joins those two points, otherwise the leg stays direct and a line says so ("A3 does not join GILUX to MOTAL: direct leg"). The route text follows your procedures, in ICAO form: the SID's name then its exit after the departure, the STAR's entry then its name before the arrival, "DCT" between two points without an airway ("LFRS NTS1A NT102 DCT LUGEN … MEN01 MEN1A LFML"); the approach never appears. When the SID's exit is not on your route, a line says it is joined by a direct ("NTS1A exits at NT102: NT102 DCT LUGEN"). The other way round, the text is read back: typing the name of a SID of the departure or a STAR of the arrival chooses it, deleting it clears the choice. In the "Points (N)" list, each chosen procedure is a single folded row, in its map colour ("SID NTS1A · 2 points", "STAR MEN1A via NEPIX · 4 points"): its fixes show with a tap, never at the rank of the points you typed; the number counts your points and these rows. When an airway does join two points but is not open at the leg's level, the line names it with its open band, so that you decide ("A34 joins LACOU to LMG, closed at FL260 (open from 6 500 ft to FL195): direct leg"); "Auto" never follows it anyway. While you type in the field, from two characters of the word under the cursor, a list proposes (seven at most) the SIDs of the departure and the STARs of the arrival, the airways around the previous point, the points and navaids of the base: ↑ ↓ and Enter, or a tap, write the word at the cursor; Escape closes the list. The step's lists stay, for the keyboard and screen readers.

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

**Runway, SID, STAR and approach.** At the bottom of the Route step, a "Procedures" card holds a Departure side and an Arrival side. Each has a title ("Departure LFPO Paris-Orly", with "On the map": the Map opens on the aerodrome's procedures; what you choose there — runway, procedure, approach — comes back here in one go, applied as a choice made here and said in a single line; a family the Map does not touch stays as it was), one muted line ("read on 29/10 16:53Z · Read again · 3 not read", then "Charts": the aerodrome's page in its state's official AIP — the SIA eAIP, ENAIRE, AirNav Ireland — where its charts are, in a new tab; nothing for a state whose AIP the database does not know; when the database knows the official chart of a choice, a link "Chart 13R", "Chart SID", "Chart STAR" or "Chart APP" opens its PDF in a new tab, and "Charts" stays as long as a choice has no known chart; the same line once the flight has started, on the Departure step) and a fixed grid, the same on both sides: runway · SID · transition for the departure; runway · STAR · transition for the arrival, then, below, approach · approach transition (a transition appears only when the chosen procedure has one). On a phone, a single column; no label is cut. Every list comes from aerodb and shows all the procedures of the aerodrome in one list ordered by runway then name (the runway is in the label only when no runway is chosen and the procedure serves just one: "OPALE 2E" once the runway is chosen). Nothing is forbidden: a procedure in conflict with your choice is marked ⚠ (a SID, STAR or approach that does not serve the chosen runway; with no runway chosen, a STAR that serves no runway of the chosen approach; the reason is in the tooltip — a STAR that does not join the approach is no conflict: the Map links them with a dashed line) and you can still choose it — the ⚠ and the tooltip are enough, no notification repeats it. ⌛ (grey) means outdated, ⚠ (orange) means in conflict. In every list, what is compatible with your choice comes first, the ⚠ ones after; in the runway list, the runways of the SID or approach already chosen come first. A procedure the source could not read properly (no name, or doubtful) is never offered: the side's muted line says how many are not read ("3 not read": the pages not read and the procedures to check of the file read). If the data of the aerodrome carry no runway record, the runways offered are those its procedures name. Each runway carries the wind of the aerodrome's known METAR (the one of the Departure step): "13R — ↓ 12 kt · ← 6 kt": the arrow shows where the wind blows, the runway seen upward as on final (↓ head wind, ↑ tail wind, ← a wind from the right, → a wind from the left). Green for a head wind; orange for a tail wind up to 5 kt or a crosswind over 10 kt; red for a tail wind over 5 kt or a crosswind over 20 kt (or the aircraft sheet's limit when it has one); the reason in the tooltip. Without a METAR, nothing is shown. Each side's title ends with the summary of the choice, the same text as the Map's pane: "13R · ↑ 12 kt", "MEN1A via NEPIX", "I13R" ("SID none" for a departure without a SID). Choosing a STAR or an approach that serves a single runway sets that runway; a STAR offers its transitions, an approach its approach transitions. An approach reads short, its type and runway ("ILS 06", "RNP 06"; the published name in the tooltip). An ILS approach says, under the list, the aid the database carries: "ILS 25 · DO 109.35 · course 246° · DME" (ident, frequency, course); nothing when the database does not carry it; the folded summary of the arrival keeps its ident and frequency ("I13R · TST 110.30"). The initial approach segments the SIA publishes apart ("INA RNAV RWY 06") are never rows: they are the transitions of every final of their runway, "via ODILO 1A" (the IAF then the published name), and "—" stays the direct to the IF. The first choice, "—", means "not chosen"; "none" is a real choice (a direct departure, no SID). A procedure of the workstation's X-Plane fallback comes last, marked "X-Plane, local"; a procedure read under an earlier cycle is marked ⌛ (to read again). For an aerodrome with no published procedure the muted line says so ("no published procedure · Read the procedures of LFXX"): one aerodrome per gesture, never silently. If the State does not publish its procedures as tables (images, labels only…), the line says so and offers Navigraph and ChartFox rather than a reading bound to fail; a State readable on demand offers "Read on demand". When it is the database's zone that is missing (not installed, to rebuild, or without points or airways), the same line says so, offers "Add" or "Update" in Data, and names this computer's fallbacks: Little Navmap if it is there, Navigraph, ChartFox. An aerodrome that already has procedures shows, on that same line, the date of its last reading ("read on 29/10 16:53Z", ⌛ when it is from a past cycle) then "Read again": the same gesture, which replaces the file read. The same line says where the aerodrome's ground stands (taxiways and parking, read with its procedures, for the Map): "Reading the ground…", "Ground read", or "Ground not read" and why, with "Try again", which reads the ground alone; these are the words of the Map's Ground panel. A French aerodrome is read from the SIA eAIP, without an account; a State whose AIP publishes procedure tables, from EAD Basic (credentials set on the workstation); for any other State, the message says no table is published. Without a launcher, or on a device paired with the workstation, the reading is done on the workstation — the message says so — and the SimBrief OFP stays the source of the flight. Once the SID and STAR are chosen, the quote runs on the "route + procedures" path (the distance of the SID and STAR included) and the Map draws them with their altitudes and speeds; their altitude constraints do not enter the quote's level steps, they are read on the vertical profile, which keeps the cruise until the descent has to begin and never climbs again once it has. "Last SimBrief OFP" proposes its SID and STAR for the sides you have not chosen yet only ("none" is a choice): it never replaces your choice, and says what it filled, one line per side ("Arrival: STAR — → LERG1R"). Choices made in a row are written once, a moment after the last. The card opens folded, to be read without scrolling: one summary line per side ("Departure LFRS · 03 · NTS1A", with "On the map"); a tap on the line, or on ▸, unfolds its lists and its secondary line ("Read again", "Charts"), one side at a time. A side without procedures stays unfolded: its line offers the reading. With a METAR of a directed wind (3 kt and more), the runway of the strongest head wind is said first — "Probable runway: 31L (METAR 1230Z, wind 310/12)" — with "Take the probable runway"; it is never set by itself, and nothing is said by a calm or variable wind. When the company flies on IVAO or VATSIM and you have your identifier on that network, the aerodrome's ATIS is read when the step opens (and on "Read the aerodromes’ weather"): "Runway in use: 25 (ATIS VATSIM, information F, 1655Z)" is said first, with "Take the ATIS runway"; the METAR line follows when it says something else. Only the runway, the letter and the time are taken, and only from a recognised phrasing ("ARR RWY 25", "RWY IN USE 25"…) for a runway that exists; an ATIS older than 90 min, or that contradicts itself, is not said. The route can also be pasted in the format of the tools' flight plans, runway included: "LFPO/07 OPAL2E OPALE DCT … LFML/31R" sets the departure runway, the SID, the STAR and the arrival runway; a chosen runway is written the same way after its aerodrome. A runway the aerodrome does not have is said, and nothing is chosen; erasing "/07" removes the runway, and says so. A speed and level group in front ("N0450F350") is ignored, and said: the level stays the one of the Flight step.

**Approaches to check.** An approach whose reading is doubtful (rows of the coding table not read, a geometry that does not fit…) is still offered, marked "⚑ to check", its reason in the tooltip: you can choose it by hand, nothing chooses it for you. The approaches the AIP gives only as a chart (no coding table) are said under the lists, "Chart only in the AIP", each with its chart. Once chosen, an approach to check says its reason on a line under the list, and the folded summary of the arrival carries "⚑". After the coded approaches, each approach the AIP gives only as a chart has its line ("NDB RWY 13L — chart only in the AIP · chart"): it is read on its chart, it is not chosen. An approach of which the base has only the final (FAF and threshold) is said "— final only". "No approach published" is said only when the AIP really publishes none.

**Procedures read from Little Navmap.** A procedure read in this device's Little Navmap database reads "Little Navmap, read on this device". It stays on this device: the flight keeps only its name, none of its points. The files for X-Plane and MSFS carry it like the other procedures.

**Read from Little Navmap.** For an aerodrome the base has no procedure for (KDEN, for example), on a device where the launcher found a Little Navmap database, "Read from Little Navmap" reads its procedures in that database, through the launcher. You must first tick personal use in Data › Personal-licence sources; otherwise a line reminds you and nothing is read.

**Levels and procedure points.** When the route's points carry a level ("/F180") and the plan another, a line under the level says so with the climb and cruise that result ("Points at FL180, plan at FL320: 0:36 of climb for 0:09 of cruise"); "Align the points on the plan" removes the points' levels. In the list of points, each point of a chosen SID, STAR or approach has a level field: a level set is followed by the profile (and the Map); above the sheet's ceiling, or too steep to be reached, it is refused and the screen says why. A route name no database knows but the chosen procedure carries (BEPAN of BEPA4E) takes the procedure's position; if it stays unknown near an aerodrome around which the database has no published point, the line says so. A name several points carry (homonyms) takes the one nearest the previous point (an aerodrome code stays the aerodrome), and the line under the route says so, as it says a jump of more than 1,000 NM from one point to the next. A name whose only known place is very far from the route (more than twice the direct distance, plus 400 NM) is not placed: the line says so, and the base of its zone may be incomplete. An unknown point says the state of its zone: database not installed ("Add"), the cycle's file missing ("Update"), or a source without points or airways. A STAR published once per runway follows the runway chosen.

**An aerodrome is never a point of the route.** If the route text still starts with the old departure after a change of aerodrome (or ends with the old arrival), that aerodrome is not listed, not routed by "Auto", not written back: the flight always leaves from its departure. Another aerodrome in the middle of the route stays (a VFR route may pass one). In the list of points, a route name no database knows stays at its place, without position, with its reason ("unknown to the database", or "no published point around EIDW" when the zone is missing): the list shows the whole route, never less.

<a id="fuel-step-3"></a>**3 Weather.** The wind (direction and speed) and the ISA deviation. Without a direction, or without any wind, the block
fuel is given as a range. The wind is counted leg by leg, on the course of each (the wind forecast at its two ends when read, else the flight's), with the drift: a strong crosswind slows too; the result bar says « wind leg by leg ». “Read the aerodromes’ weather” shows the departure, the arrival, the alternate and the
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

<a id="fuel-step-4"></a>**4 Result.** The drawing shows, for each level, the trip fuel (solid line) and its duration (dashes). The green dot
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

The title of “Climb instructions” says the sheet's climb RPM (“Climb: 8000 rpm”) when it has one. Unfold them to follow the climb up to the level: power, RPM, airspeed, rate of climb, fuel flow, Mach,
time and fuel totals at each step, with the profile drawn. The result gives block fuel, trip fuel, flight time and
distance of the top of descent before arrival. “Quote details” breaks it down phase by phase.

“Open in” prepares the same flight elsewhere, in a new tab: SimBrief (flight options prefilled, SimBrief login
required), SkyVector (the route drawn, with speed and level), Navigraph and ChartFox (the charts of the departure and
arrival airfields, login required). A greyed-out entry says what it lacks (airfield, aircraft type). Nothing is sent
that is not already in the flight. The quote settings (taxi, reserve, margin, weather corridor, units, this flight's fuel flow) are the first
fold of the Result step, folded, its title saying the fuel unit ("Quote settings · lb/h").

<a id="fuel-alternate"></a>**Alternate fuel.** The block fuel now counts the alternate: taxi + trip + contingency + alternate + final reserve. Its line, in "Quote details", gives the distance from the arrival to the alternate, the level, where the figure comes from (the sheet's alternate flow, or the model of the trip) and the wind (the route's near the arrival, or "wind unknown"). Without an alternate entered, or without its position, the line says so and nothing is added. The block of a flight with an alternate is therefore higher than before: this is intended.

<a id="fuel-step-5"></a>**5 Departure.** A one-page summary: the aircraft, the route as it will be filed, the level (and its steps), the wind

**Direct to a point.** On a started flight, when ATC gives a direct, type the point's name in "Direct to…" of the Departure step (or tap "Direct to this point" on the Map), then "Prepare the direct". The panel says where the direct starts (your position under two minutes old, else the planned position, else the last point passed), the points skipped and the difference (estimated distance, time and fuel); nothing is written before "Apply the direct". A point off the route is inserted, the route resumes at the next point (another can be chosen). A point imposed by the mission that is skipped is said in red and asks a second confirmation; its time on area is removed from the quote, and the report will say "not overflown: direct from ATC". A point already passed, or farther than the rest of the route, is refused. "Undo the direct" gives back the route of before as long as nothing else has changed.

**Send this flight to my devices.** The current flight is saved at once on this device, but it does not leave with the grouped send of the data (every five minutes at most): your other devices (phone, tablet) receive it only when you send it. While it waits, the summary says so and offers "Send this flight to my devices"; it leaves at once, and the line says "Flight sent to your devices at 17:52". "Synchronise" sends it too. If it does not leave (offline), a note says so: it stays on this device.

**Radio aids.** Under the summary, "Radio aids" gives at a glance the ILS of the chosen approach (runway, ident, frequency, course, DME), then, folded, the VOR / DME of the route in the order of the flight, each with its frequency and the leg it serves. Nothing is invented: without an aid in the base, the card says so.
and its source, the block fuel. “Start the flight” launches the flight plan (start-up, pushback, taxi…). The preparation
may date back several days: so it begins by redoing everything at the real time — the flight date returns to now, the
aerodrome weather and the winds aloft are read again, the quote is redone — and says in one line what has changed (“wind
273°/35 kt → 284°/44 kt · block 684 → 644 kg · planned arrival 15:03Z (17:03)”); offline, it says so and starts with the last
quote. It then records the departure time, which becomes the report's start-up time. On a phone it opens the Map, on a
large screen it stays here with the Map on the right. Changing the departure airfield afterwards means preparing another
flight: the departure time is cleared. Changing the arrival after departure is a diversion: the time is kept and the
diversion recorded.

Flight plan for the simulator: under the summary, three buttons — ".fms (XP 11/12)", ".fms (XP 10)" and ".pln (MSFS)" — download the route and the chosen procedures (runway, SID, STAR, approach and their transitions) for X-Plane or Microsoft Flight Simulator, in a file named "LFPO-EIDW_2026-10-30.fms". The route needs at least two placed points. Then copy the file into X-Plane's "Output/FMS plans" folder (sending it directly will come with the launcher).

Once the flight has started, this step carries a "Procedures" card: nothing is locked: the Departure and Arrival sides stay editable at any time (another departure is a new departure). A change does not redo the quote: the block fuel, the trip fuel and the reserves stay those of the departure; only the times at the points, the vertical profile and the remaining distance follow the new path. The Map's "Change" button opens Fuel on the Arrival row (`#fuel?focus=arr`): the Route step before the start, the Departure step after.

Once the flight has started, the result at the bottom of the screen says “Flight started at 11:14Z (13:14) · for 1 h 10”. Times are UTC (“Z”);
the device's time is added in brackets at the departure, the planned take-off and the planned arrival. A
started flight ends with the writing of its report: when it is saved, Fuel goes back to preparation and My flights
removes “in progress”. To go back to preparation without a report, “Cancel the start” (after confirmation). The “Planned
progress” card shows where the flight should be, in theory: the planned time over each point (taxi, climb, cruise leg by
leg with its wind, descent), the next point highlighted, the distance flown and remaining, and the planned remaining
fuel. It follows the clock, minute by minute, until the report or the cancellation, and goes to the Map with the flight.
The flight prepared here — aircraft, route, level, climb and descent profile — is shared: Map and Report already have
it.

## Performance sheets <a id="fuel-sheets"></a>

The "Sheets" tab starts with the same aircraft search as the Flight step (the field "Sheet, registration, callsign or type": a result tapped becomes the flight's aircraft). It then lists the company's sheets (those of the types of the current airline's fleet first, the others in "Other sheets", folded; the search also gives its registrations first), shared with all its devices, **read-only**: they are edited in
Maintenance › Aircraft, "Sheets" tab. They are sorted by category (helicopters, turboprops, jets, piston engines, others);
every type used by the company (fleet, reference) that has no sheet yet is listed too, "performance to fill in", with
"Create in Maintenance". Each sheet says what it lacks, by family ("To complete: rpm, speeds, cruise, taxi, runway"),
"complete" when nothing is missing; the sheet of the flight reads "used for this flight".

- **Use**: chooses this sheet for the flight and goes back to the quote.
- **Edit in Maintenance**: the sheet's name and this button open its editor in the same tab. That is where the import
  (file, pasted text, ChatGPT answer), the EUROCONTROL completions, the field-by-field preview before any write, the origin
  and date of each field, the `.lnmperf` and JSON exports and the removal live.

## Settings and units

In “Quote settings”: taxi and reserve minutes, contingency percentage, and a cruise fuel flow for this flight only (it
replaces the sheet's), typed in the unit of the quote that its label says ("lb/h"). “Displayed units” changes fuel (kg or lb), speed, altitudes and distances on screen; levels stay
flight levels, and nothing changes in the sheets. The displayed units and the weather radius are settings of this device: they do not follow on your other devices (a phone may show km, the computer NM).

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

<!-- fr: ddf7571d1e89 -->

<!-- chapter: maps -->
# Map

See your flight on an aeronautical chart and its vertical profile, or the maps of a mission: airspaces, airfields,
beacons, airways, minimum altitudes. The flight's route can also be changed on the map.

## How to use

**The planned flight.** The map shows the flight prepared in Fuel: departure, route points, arrival, and the alternate
airfield in grey dashes. The runway, SID, STAR and approach chosen in Fuel are drawn over the route (SID in green, STAR in orange, approach in blue), named as in Fuel ("ROYAN6P", "ILS 06"). Its summary (level, distance, planned or in-flight) is not written over the drawing (the drawing shows it): the tooltip of the data block's handle under the map gives it, with departure and arrival, alternate and aircraft type. When the flight changes in Fuel, the map follows by itself.

**The map and what it shows.** Around the route: the airspaces it crosses or skirts (restricted, danger and prohibited
areas, controlled airspace), the low or high airways depending on your level, the airfields and the beacons, and in each
one-degree square the minimum safe altitude (the brown figure, in thousands and hundreds of feet: “3⁵” means 3,500 ft).
The small purple figures along the route are the distances from the departure, in nautical miles. Drag the map with one
finger, spread two fingers to zoom (during the gesture the map keeps only its lines — airspaces, airways, route with the chosen SID and STAR,
aerodromes and beacons as small rings, the very ones it shows at rest — and its names come back as soon as it stops); “Recentre” (the target, at the top right of the map) comes back to the whole route. The map stays where you put it, even when
the route changes: only “Recentre” (or another flight) reframes it. Coming back to the map (from Fuel, or after “Done”), you find your framing
again as long as the route and the chosen procedures have not changed; otherwise the flight is framed, procedures included. While “Around the flight only” is ticked (Layers),
airspaces and airways are read only near the flight, from afar; untick it or zoom in to see everything.

**The great-circle route.** As soon as the departure and the arrival are known, the map draws the shortest path between them (the great circle) as a thin dotted line, in the muted tint of the route and under it: the gap with your route shows at a glance. Hover or touch the dotted line: the bubble gives its length in NM.

**The proposed routes.** When Fuel computes or checks a route (“Calculate A → B”, “Check”), the map draws the proposed routes: the one taken solid, the others faded, the one you hover in the list thicker, the faulty segments red. Touch a route (or its row in the small list, on a map alone) to take it: Fuel takes it as its “Take” button does. The map of another flight draws nothing. When the engine says what it checked of a segment, the line shows it: solid = checked, dashed = incomplete, dotted = fallback, red = error; the small list gives the key. The line has the width of the flight's route: the chosen one solid, the others faded. It tells the nature of the stretch when Fuel gives it: an airway solid with its name along the line, a direct (DCT) dashed, a free route (FRA) dotted, a SID, a STAR or an approach in the procedures' tint, a fault red, and a thinner line when the stretch is not fully checked. The points of the chosen route are marked and named (entry, exit and changes of airway always, the others when there is room). A collapsible key is in the list, and in the map's legend; hovering a line on the map highlights it.

<a id="maps-procs"></a>**The runway and procedures chosen.** What you chose in Fuel (runway, SID, STAR, approach) is drawn over the route: the SID in green, the STAR in orange, the approach and its missed approach in blue, from the threshold of the departure runway to the first point of the route, and from the last point of the route to the threshold of the arrival runway. Transitions and the missed approach are dashed; a leg without a fix (a climb on a heading, for example) is a short stroke along its course, then dashes to the next point; a constant-radius turn is an arc. When the SID does not reach a point of the route, a dashed straight line joins it to the route (likewise for the STAR). A procedure you did not choose is never drawn, and the Layers list has no box for it. The procedure's name is written on its trace, followed by where its data come from when they come from X-Plane or Little Navmap ("X-Plane, local") then by the symbol ⌛ (in grey) when they were read under an earlier cycle; the legend ("i" chip) recalls it. From the regional view on (adjustable on the thresholds page), each point carries its constraints; the procedure's name is written at every scale, over everything else, as on procedure charts: an **underlined** altitude means "at or above", **overlined** "at or below", both "exactly", "5000–7000" "between the two"; "≤ 220 kt" is the speed not to exceed. The vertical profile follows the same path and shows these constraints as steps (up arrow: at or above, down arrow: at or below, dot: exactly, bar: between two altitudes); their text takes a free place or none, never over a space’s name, TOC / TOD or a level; distances, estimated times and the cursor are measured along that path. The map never changes this choice: touch an aerodrome of the route and its card gives the runway and procedures chosen, with a "Change" button that opens Fuel on the row to change; a "Source" link opens the procedure's published page (the SIA's eAIP) in a new tab, and for a procedure read elsewhere its document's name shows when hovering the row.

<a id="maps-rwy"></a>**The runways.** Close in, each runway of every aerodrome drawn is a short vector from its threshold, and the aerodrome shows its name next to its code ("LFPO Paris-Orly"); each vector goes along the runway, its number at the tail, behind the threshold: the runway chosen in Fuel bold in its side’s colour, the others thin. They appear only from the zoom set by the airline (Settings › Administration, "Runway thresholds zoom", 11 with no setting); below it, nothing. In "Choose on the map", every runway of the aerodrome is drawn so, the chosen one bold; the choice’s drawings go over the base map’s labels, which are dimmed.

**The direction of an airway.** A one-way airway segment carries a small arrow in the allowed direction, from a medium zoom (beside the airway's name); a two-way segment, or one whose source says nothing, carries none. The tooltip of the airway's name says “one way LMG → NEPIX” or “both ways”.

<a id="maps-choose"></a>**Choosing on the map.** The "On the map" button of a side in Fuel (departure or arrival) opens the map on that aerodrome — as does "Choose on the map" on the card of the departure or arrival aerodrome (touch its pin; full width on a phone): the sheet opens expanded (“Done” stays at its foot, always in sight), the base map and the layers are dimmed and the view fits the aerodrome and its procedures that suit your choice, within 40 NM of it, the aerodrome at the centre (far entries stay out of the frame; a chosen procedure leaving the view widens it to that procedure alone); from the start, the compatible procedures of the first family are drawn, faded: touch one on the map to choose it, as its row. At the top of the data block, your selection in one line per family ("Runway 31 · ↑ 12 kt", "OKRI5L", "I31 via IAF1"), each with ✕ to set it back to "None"; touching a family’s name ("Runway", "STAR", "Approach") goes to its group and unfolds it. Below, the three families at once — the runway, the SID (departure) or the STAR, the approach (arrival) — in tight rows: three taps in whatever order suits you. Each choice narrows the two other families to what fits it; the rest is folded under one thin line "N more · All", which unfolds it marked ⚠ (it can still be chosen). SIDs leaving and STARs entering on the route you typed come first, under "Towards your route"; the others follow, marked "exit LACOU" or "entry OKRIX". On a direct route (no point and no airway between the two aerodromes), nothing of the kind: they rank by their direction towards the other aerodrome, "Towards LFPO" over the best aligned (within 60°), a small arrow along the way flown on each row. "None" is always the first row. Procedures that differ only by their runway (OKRI5L, OKRI5R) are one row "OKRI5" with its runways as small tags: tapping it chooses the family and narrows the runways, tapping a runway chooses the procedure. Approaches read by their short label ("ILS 06", "RNP 06", with no runway tag since the label says it, the same on the map; the published name on hover); under the chosen approach, "No transition" then its transitions, among them the initial approach segments the SIA publishes for the whole runway ("via ODILO 1A"), in their final’s hue; a chosen STAR leaves only the transitions starting from one of its points (otherwise the transition goes back to “None”); a transition that does not meet the final on a shared point joins it with a dashed line. Each procedure has its hue (eight, cycled), the same on its row, its label and its trace; on the map, one small label per family and point ("NIMER 9"), and the procedure hovered or touched goes over everything, with its full name; hovering a row of any family highlights its trace, hovering a trace highlights its row; ⌛ (grey): read under an earlier cycle. The aerodrome’s code stays written above the procedures; runway numbers take their place before the beacons, which give way; a number that would fall on a label is not written (the arrow stays). Each runway carries the wind of the METAR already known: "↓ 12 kt" head, "↑" tail, then the crosswind (← wind from the right, → wind from the left: the arrow says where it blows, the runway drawn upward, as in Fuel), in green, orange or red by the tailwind and the crosswind; without a METAR, nothing. A tap on a row or a trace adds that choice and leaves it on the map (the runway bold, the procedure in its hue, the others of its family dimmed); nothing is written yet. A procedure that serves one runway sets it when none is chosen; otherwise a line under the group offers the correction, in one tap: "OPAL2E serves 25 — Switch to 25", or "OKRIX5A does not serve 07 — Choose OKRIX5B". "Done", the ✕ cross or Escape take you back to Fuel with everything you chose; Fuel writes it and says what changed; the map writes nothing. To give up without handing anything back: "← Fuel" at the top.

<a id="maps-ground"></a>**The ground of an aerodrome.** The “Ground” button of the aerodrome card opens the list of its taxiways, stands and holding points: a field filters by name (no case, no accent), chips choose the kind, and hovering or touching a row highlights it on the map (the touch frames it). On the map, a touch on a taxiway or a stand opens its row. The layer is drawn close up (taxiways from zoom 13, their names at 15, stands and holds at 16); a name that found no place is marked “not drawn” in the list. The ground is read with the aerodrome’s procedures: until they are read, the panel says so and links to the procedures; once read, it shows the date. Data © OpenStreetMap contributors, ODbL. If the ground could not be read, the panel says so with the reason and offers “Try again” (the ground alone, without reading the procedures again).

<a id="maps-coverage"></a>**Coverage.** The "Coverage" layer (in the layers list, off to start with, switched on by its box only) colours the aerodromes by what this device can give of their procedures: **green**, they are held (published, entered by hand or read on this computer); **orange**, they are held but partly read (pages not read, records to check: the aerodrome's card says how many) or they are read on demand (France through the SIA's eAIP, a State whose tables can be read, an aerodrome of Little Navmap's local database); **red**, nothing readable (images only, prose text, nothing on this computer). The legend (the "i" chip of the data block) gives one line per colour while the layer is shown. Only the visible aerodromes are asked. Touch an aerodrome: its card adds a line with the pin, the level and the reason (⌛ when the procedures held are from an earlier cycle, then how many SIDs, STARs and approaches are held). When the device cannot give this information, the layer is not offered.

<a id="maps-weather"></a>**The profile and the cursor.** In the data block under the map, the vertical profile cuts through the route from end to end: the terrain,
the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the profile: a
blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The line below
the profile says what is under the cursor: distance from the departure, planned altitude and terrain altitude (both above sea level, AMSL), height above ground (their difference), and the
airspace you are in at that point. Under the map, this data block shows the profile; the list of airspaces at a point or
an airfield's reporting points open in its place when you ask for them, and the profile comes back when they are closed. The cloud chip, (the three chips — profile, cloud, “i” — are always in the top line, at the right; one with nothing to show is only greyed out), replaces it (the profile chip brings it back) with the weather
cross-section along the route (wind, temperature, cloud, icing) against the flight's level; the cross-section follows the same cursor, and a tap on
it moves the cursor. The “Route weather” button is the one action: it shows the forecast already kept, otherwise it reads it, then names the model chosen by the middle of the route (“Route weather · AROME 12 h”); from the tap, the sheet says “Reading the route weather…” with the seconds elapsed and the button is busy (ten taps are one reading); the reading stops after 20 s; the end is always said: the cut, or the reason (offline, daily limit, over 20 s, HTTP answer, nothing received, flight without a level) with “Try again”. The last chip, “i” (greyed out while the drawing has no legend), opens the legend of the profile over it (what each line, band and mark is); dragging a finger on the cross-section moves the cursor like on the profile. The profile and the cross-section are drawn to the exact height of the block, their distance axis always in view: on a low block they drop level labels, never the axis.

<a id="maps-profile-spaces"></a>**The profile's airspaces.** The profile shows only the airspaces the planned vertical path enters (within 500 ft); overlapping sectors of one family (Dublin's CTAs) make one envelope there, named by the family; free route airspace (FRA) and W or weather research areas appear only when the "Other airspaces" layer is on; at most seven airspaces are named, the others in the list below. The airways the route follows are named blocks there (« UN460 », floor – ceiling): where a space of a higher class (A to D) covers them, that space is drawn, not the airway; a class F space covers nothing. Class E, F and G spaces are drawn in a light fill and named last, so as not to hide the rest.

**The airspaces by zoom and complexity.** The display depends on the zoom and the complexity step only: the big families (FIR and UIR, TMA and CTA, CTR) are read over the whole view; R, D, P, TSA and the others in the flight's corridor while “Around the flight only” is ticked (the notes say so, and how to see more); each family appears at its own zoom threshold, which one step of complexity shifts by one level. The size of the sheet changes nothing. FIR exist in the published bases for France only.

**The sheet of an airspace.** Touch a space — its block in the profile, or its row in the list of the spaces at a point of the map (no hover: a finger has none, and conditions run to several lines) — and its sheet opens: name and type (a P says “prohibited”), limits, the activation published (AZBA, NOTAM), hours and AIP conditions when the base carries them, unit and frequency, source and date. A frank line remains for R, D, TSA and TRA areas: “actual activity not known: published hours only (neither NOTAM nor AZBA read)”. Seven lines, then “n more”. The current SIA base does not carry the hours or the remarks yet: the sheet says so. In the profile, a first tap on a block chooses it (it is highlighted, its name and limits show over the profile with a “Sheet” button); a second tap on that block, or the button, opens the sheet; a tap elsewhere chooses nothing: the profile is never replaced without an explicit gesture. The sheet keeps the stack of the point's spaces: blocks floor → ceiling on the level scale, framed on their limits (never empty), the chosen one highlighted; a tap on a block changes the sheet. It sits beside the stack in a wide view, under it on a phone, where the stack stays at the top while the sheet scrolls.

<a id="maps-profile-zoom"></a>**Zooming the profile.** To read the profile precisely, tighten it on part of the flight: pinch it with two fingers (the middle of the fingers stays in place) and drag with two fingers to move the window; one finger stays the reading cursor. The altitude scale refits to what the window shows (that is where the precision comes from), the distance marks (NM) tighten with it, and points outside the window are not drawn. A double tap goes back to the whole flight, as does the “Whole flight” button, which appears in the top line while the profile is zoomed. On a screen: the wheel zooms around the pointer (with Ctrl always; without Ctrl unless the profile moves with a page that scrolls; the side pane of Fuel stays in place, so the wheel zooms there too), the horizontal wheel moves the tight window, a drag does too (on the whole flight the drag is the reading cursor), Shift + drag draws a rectangle on the distances and zooms it, a double click goes back to the whole flight. The zoom is kept while the page stays open and the route does not change; it is never stored. The weather cross-section zooms the same way (same gestures, same “Whole flight” button) and the window is the same for both: zoom on one, switch to the other with the chip, and you find the same part of the flight; the cross-section also refits its height scale to what it shows.

**A fixed screen.** Nothing between the header and the map: the map and the data block fill the screen, and nothing scrolls but the block's content. The buttons sit on the map: on the right, from the top, “Edit the route” (the pencil), “Recentre”, the map mode, “Edit on the map” (the four arrows) and, last, full screen (Escape leaves it). “Layers” sits on the sheet’s line, left of its grip, next to what it opens; with nothing to draw, the sheet is that line alone. The block is a sheet: drag its top line (the small bar; at its normal height the line carries no title above a profile or a cross-section, only the three chips) up to enlarge it, down to shrink it to
that line, which leaves the whole height to the map; a tap on the line collapses it or brings it back to its normal
height.

**Six map modes.** The mode button, at the right of the map, shows the chosen mode; tap it to see the six modes. “Low IFR”:
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

<a id="maps-layers"></a>**Layers.** The layers button, at the left of the map, opens in the data block, in place of the profile, the list of what the map draws (the ✕ brings the profile back). First, under the flight selector, the “Complexity” slider: it acts as if the zoom were different, one zoom level per step (−4 to +4) — fewer details to the left, more to the right. What each zoom shows is set by the administrator (Settings, “Administration” card). Then the airspace families (TMA /
CTR, D / R / P, FIR, others), lower and upper airways, beacons, airway points, VFR reporting points, obstacles, minimum
altitudes, towns, graticule, alternate, airspace names, airway names. Tick or untick: the map follows, and your choice
is kept for this setting on this device. “Reset all” goes back to the original choice. At the top, “Around the flight only
(faster)”, ticked by default in IFR, keeps airspaces and airways near the flight: the pane title then ends with “around
the flight”, and the “i” chip says nothing is read outside the corridor; unticked (“otherwise the whole view”), the whole
view is read, at the same density everywhere, filtered by complexity alone — except a view wider than 3,000 NM, read around
the flight anyway (the box says so, with its reason). Unticking the box lowers the Complexity at once when the view is wide (a line says so); raise it if you wish, and ticking again gives the earlier one back. Close up, everything is drawn anyway. Each element of the map has its zoom range: VFR reporting points appear only
very close, CTRs close up, TMAs in a medium view, FIRs from afar. The size of the map counts too: in a small frame
(phone, pane of the dual view) it shows fewer elements than a large one at the same zoom, as if you were further out
(the zoom is corrected by the mean of the frame's height and width, 900 px meaning no correction).

<a id="maps-airspaces"></a>**Tap or hover to learn more.** Tap, click or hover over an airway's name, an airspace's label or a wind barb: a small
bubble gives the essentials in two lines — for an airway, the segment (point → point), its distance, its tracks, its
floor and ceiling; for an airspace, its name and its limits in AIP notation (“TMA 8 AQUITAINE 2000|FL145 D”). Tapped
elsewhere inside an airspace, the data block under the map shows the airspaces under your finger, one or several, in
place of the profile: a chart of levels, like the vertical profile (one numbered column per airspace, from its floor to
its ceiling), then the numbered list with their limits, read like the vertical axis: the highest on top (number 1 is the airspace with the highest ceiling, on the left of the chart), the lowest at the bottom. FIRs, UIRs, SIVs and control sectors without limits, like any airspace from the surface to the ceiling, are neither drawn nor counted (you do not cross them): their names read on a folded line “Also here (n)” under the list and on a last grey line of the hover bubble (“Also here: FIR PARIS · SIV POITIERS”), the FIR or the SIV to call, without a column. The ✕, Escape or a tap on an empty spot of the map close it and
the profile comes back, another tap on airspaces replaces it; moving the map leaves it. The map neither moves nor
changes size. The hover bubble follows the pointer, stays 5 seconds, gives way to the next one, and closes with a tap
elsewhere or a move of the map. Over a beacon, the bubble gives its type, ident and frequency; where several beacons
share a place, the map keeps the most useful one (VOR, TACAN or DME, then NDB, then ILS) and the bubble names the others
(“also here: ILS 25L BG 109.9”). On the profile, your finger or the mouse give the airspaces crossed in the same way.

<a id="maps-vfr"></a>**The VFR reporting points of an airfield.** Move the mouse over an airfield: its reporting points and the sequences
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
Maintenance). A reporting point is one line in the list and one label on the map, even when the database and the VAC chart both name
it: the line keeps the database's description and published position, and says “VAC position 1.2 NM away” when the VAC chart puts it more than half
a mile from there.

<a id="maps-started"></a>**In flight.** Once the flight is started in Fuel, the map shows where you should be (hollow aircraft, “planned 14:32Z”)
and where you are (filled aircraft, turned to your track, with the flown trail dotted, since departure, kept across a change of tab). In the data block's notes, under the profile, a line gives the difference: ahead or late (minutes and NM), how many NM off the route, and your altitude against the
planned one; the profile shows both altitudes. Close up, each point carries its estimated time (ETA) under its name, never over an airfield, in UTC (“14:52Z”), the local time in brackets at departure and arrival. “Follow” keeps the
map on your position; moving the map stops it. Without a position (GPS or network not enabled), a notification says so once, the line stays in the notes with an “Enable the position” button; a position older than 2 minutes is greyed. The line ends with the position's source: GPS, network,
IVAO, VATSIM, X-Plane or Little Navmap. The estimated times are also shown for a flight dated in Fuel, before it leaves. Once arrived, the note “Arrived” replaces the line and “Follow” goes; a diversion is said in the notes.

**Winds aloft.** When Fuel has the wind forecast at the flight level, the map shows it as barbs along the route: at
each point, and every 50 NM between two points. The staff points to where the wind comes from; a pennant is 50 kt, a
barb 10 kt, a half barb 5 kt. Tap a barb (or move the mouse over it): the bubble gives the direction, the speed, the
temperature, the level and the forecast hour. The “Winds aloft” layer hides them.
The barbs are read from the same forecast as the weather cross-section (nothing more is asked): if the cross-section has wind, the map has. Where the chosen model does not cover the route (the middle of the route chooses it) there is no arrow: the bubble says “No wind here (outside ARPEGE)”; never the same arrow repeated. The “Route weather” gesture then reads the covering model (GFS) for those holes, and each barb says its model in the bubble. On a view more than 3,000 NM wide (a route to another continent) the barbs are hidden and the notes say so: zoom in to see them.

**Steps.** If the route sets a level at some points in Fuel, the profile draws the steps: climb, level-off, new
climb or descent, with the top of climb and top of descent computed again. The route's waypoints are also marked on
the profile.

**Climb and descent.** The purple diamonds mark the top of climb (TOC) and the top of descent (TOD), on the map as on
the profile. They come from the Fuel calculation; without it, the map estimates them with common rates of climb and
descent. When room is short, the map writes the aerodrome's name first, then the runway numbers, the beacons, the
procedures, the route (names, times, TOC / TOD), then the rest; an estimated time or the name of TOC / TOD slides
along the route before it gives up (the diamond stays).

**A flight that names a mission.** The map stays the flight's, with all it can do (weather, procedures, route editing, Layers boxes, proposed routes); the mission is drawn over it: its zones, its points with a role (departure, arrival, target…) and, at the top left, a window giving its title, identifier, family and two lists: “Provided map” (“Flight” first, then the mission's maps: choosing one shows it on the spot, Fuel stays beside, “Flight” goes back to the flight) and “View”.

**Mission maps.** A mission opens from Missions (“See on the Map”), or from the window of a flight that names it; a window at the top left of the map is the only place to choose the mission, its provided map (overview, target, detail…) and its view; the Layers tab only sets what is shown.
Each map is redrawn as in
the studio: same frame, same display profile, with the mission's points, its hatched areas and its route. The vertical
profile then shows the mission's.
A provided map (chosen in the window of a flight, or “See on the Map” from Missions) gives: a banner at the top gives its title, identifier, family, the provided map shown and, when there are several, the choice among them (seven at most). Zones are a light flat tint with their name, points carry their role (departure, arrival, target…), and the legend (“i”) names them. The banner's cross removes it: you are back on the flight with all its layers; another mission is chosen in the layers list. The map opens in the view of its use: the profile carried by the map's YAML comes first; otherwise the target, detail, rendezvous and zone maps of an operational mission (SAR, MEDEVAC, FIRE, LE, ISR, COMBAT, MARITIME, AAR, AIRLIFT, COMMAND: everything but commercial) open in VFR topo (relief, obstacles, VRPs, VFR aerodromes, low spaces), the general map and a commercial mission keep the flight's view. The banner offers “View”: VFR topo, IFR or Base map only; the choice is kept for that map on the device, and removing the banner gives the flight's view back.

<a id="maps-edit"></a>**Editing the route on the map.** Tap “Edit on the map” (the four arrows, at the right of the map; a fold “How to”, at the top left of the map, gives the help of the mode): the waypoints get a circle. Drag a point onto
a fix, a beacon or an airfield: it settles there (dropped elsewhere, it becomes a free point named by its coordinates,
such as 4530N00030E). To add a point, tap “+” (in the same column), then tap the place you want (or keep pressing for half a
second): on a fix, a beacon or an airfield it settles there, elsewhere it is a free point; it is added to the nearest
segment. A simple tap adds nothing: it shows the bubble. Tap a route point: its card gives its level and offers
“Remove”. A point the mission imposes (rendezvous, target, source; a filled square, “set by the mission” on its card) is neither moved nor removed: the pilot keeps the other points. Departure and arrival do not move here. On the profile, drag a level up or down: the level changes from the
point that opens that segment, in steps of FL10 (on the first segment, it is the flight's level); in a point's card, “−”
and “+” do the same. “Undo” takes back the last gesture. Each change is saved in the flight at once, and Fuel redoes the
quote; the profile follows. Tapping the button again (or Escape) closes the mode, and the map moves under your finger again. To type the route as
text, the pencil at the top of the right column (“Edit the route”) opens Fuel's Route step. While the mode is on, the right column keeps only “Edit on the map”, “+”, “Undo”, “Recentre” and full screen.

## Without network

**What works without network.** The map, the airspaces, the airfields, the beacons and the profile stay available
offline for the areas already viewed, and for those kept in Settings › Offline data. Keep the area of your flight there
before you leave: everything will be there, even without network.

**The base map.** The background (roads, towns, coloured terrain) comes from the Internet. Without network, the map is
drawn on a plain background with country outlines, and a line says so; everything else is there.

**The profile terrain.** The profile terrain also comes from the Internet. Without network, the profile shows instead
the minimum safe altitude of each square crossed (in brown dashes), and a line says so.

## Special cases

**No flight.** Without a prepared flight, the map is empty and offers “Open Fuel”. The mission maps stay available from the layers list.

**Flight across the date line.** A flight that crosses the 180° meridian (Siberia to Alaska, for instance) is drawn in one piece: the map goes on past the line, the distance marks, the profile and the weather section follow the route, which stays stored with longitudes between −180° and 180°.

**No aeronautical database.** If the aeronautical database has not yet been published by a device of the airline, the
map shows only the route, and says so once (a notification, then a note in the data block).

**Area not kept.** Offline, over an area never viewed nor kept, the map has nothing to show; the “Offline data” button
opens the settings to keep it next time.

**Different cycle.** Each mission map remembers the data cycle it was made with. If the current database is from
another cycle, a line says so: the airspaces may have changed since.

**Old mission.** A mission saved before this version does not carry its display profile. The map then takes the usual
profile for the type of map (detailed for a target or a detail, simplified otherwise) and says so. Opening the mission
in the studio and saving it is enough for it to keep its own from then on.

<!-- fr: 8fdd30cdbb88 -->

<!-- chapter: atmosphere -->
# Weather

The atmosphere along the flight prepared in Fuel: a weather map at the chosen level, the vertical cross-section of the
route, the slice of a point, at the departure time or later.

## How to use it

<a id="atmosphere-flight"></a>**The flight.** Weather always shows the flight prepared in Fuel (route, level, flight date). With no planned flight, the
page says so and leads to Fuel; "See the example" shows a demonstration flight, marked as such in the grip.

<a id="atmosphere-load"></a>**Loading the forecast.** The load button (the downward arrow, at the right of the map) reads the forecast along the
route and around it. Nothing is asked at opening: the page shows what the device has already kept, and the button says beforehand what
loading would cost ("Load (≈ 120 calls)", or "already on the device"). Outside the flight's
area, the map shows the world synoptic published with the application, asking for nothing.

<a id="atmosphere-map"></a>**The weather map.** Isobars, isotherms, cloud, wind, jet stream and convection, at the level chosen with the level chip
("SFC", the requested level, the computed path or a fixed altitude). The Layers chip, left of the sheet's grip, opens a
panel over the map, just above the sheet: it chooses what is drawn on the map and in the profile, and the cut stays in view below, redrawn by each box; the
cross or Escape closes it. Touch a point of the map to open its slice.

<a id="atmosphere-zones"></a>**The flight area and the world.** A thin line surrounds the flight area: inside, the fine forecast loaded for the flight
(Météo-France AROME 1.3 km and ARPEGE 0.1° over France, ICON in Europe); outside, the world synoptic (NOAA GFS,
published on a 5° grid). The two models do not say quite the same thing: a jump of the lines where they cross the line
is normal. The layers panel names both models and their grid. Without a world synoptic, or with one more than 12 h old, the first line of the bottom sheet says so and offers “Build (2 min)”: this workstation’s launcher computes it (NOAA GFS, no key) and the layer arrives on the map; without a launcher, the line says where to do it.

<a id="atmosphere-date"></a>**The flight date.** The slider under the grip moves the time from 0 to 72 hours after the planned departure: the map,
the cross-section and the slices follow. When part of the slider is outside the forecast read (a planned departure
already past, days not loaded yet), a band under the slider shows the hours covered; elsewhere the nearest hour is shown,
⚠ says so on the slider line and in the grip, and a warning appears.

<a id="atmosphere-cut"></a>**The cross-section and the slices.** Under the map, the cross-section shows the route from end to end, from the ground
to above the flight level. Touch it to open the slice of the nearest point (the vertical profile of the atmosphere
there); ◀ and ▶ move to the next slice, ✕ goes back to the cross-section. The drawing always fits the block, its distance
axis visible; expand the block for more detail.

<a id="atmosphere-zoom"></a>**Zooming the cross-section.** Pinch the cross-section with two fingers (or Ctrl + wheel) to show only part of it, and
slide it with two fingers; distances, points, winds and the height scale follow the part shown. One finger keeps its role
(opening a slice, moving the block). "Whole flight", in the grip row, a double tap or a double click go back to the whole
route; a change of route goes back to it too.

<a id="atmosphere-details"></a>**The details.** The list button, at the right of the map, shows in the block the flight's summary
(distance, profile, climb, mean wind and deviation from the standard atmosphere in cruise, 0 °C isotherm), the aerodromes
(METAR and TAF) and the table along the computed path; touch a row of the table to open the slice of that place.

<a id="atmosphere-settings"></a>**Flight and settings.** The plane button, at the right of the map, opens the flight shown:
its source (Fuel's current flight, the example, a `current_flight.json` file or a typed route), the departure (UTC), the
requested level, the cruise speed, the data (Open-Meteo forecast or offline demonstration) and the map's grid. A second
touch on the button goes back to the cross-section.

<a id="atmosphere-legend"></a>**The legend.** The "i" chip, in the grip row at the right (after ◀ and ▶), shows the legend of what is drawn; a touch on
the legend, the chip or Escape closes it.

- Cross-section: computed path (solid: climb, cruise, descent), planned level (dashed), requested level (dotted), top of
  climb and top of descent (TOC, TOD), cloud (grey, darker: more cover), isotherms every 5 °C (0 °C thick blue),
  inversions and icing (hatching), wind (barbs: half 5 kt, feather 10, pennant 50), estimated cumulus base (grey
  dotted), terrain, route points (vertical lines); on a tall block, the bottom strips: low, mid, high cloud,
  precipitation, visibility under 8 km.
- Slice: temperature (red), dew point (green), standard atmosphere (dashed), the flight's three levels at that point,
  inversions, cloud (column at the right), wind, terrain.

## Good to know

- The forecast comes from Open-Meteo (Météo-France AROME and ARPEGE over France, ICON in Europe, GFS elsewhere); the
  world synoptic comes from GFS (NOAA), every 3 hours up to 72 hours.
- What is loaded stays on the device and works offline, in the weather store shared by Fuel, the Map and Weather; the
  Map reuses its weather cross-section. The day's calls to Open-Meteo are counted in the status block of Settings.

<!-- fr: 730918eb6af9 -->

<!-- chapter: report -->
# Report

Write the report of a flight in a few touches, with or without a mission: the module takes what it already knows about
your flight, you complete it, you save — and, if you wish, the flight is recorded on the airline website in the same
move.

## How to use

<a id="report-steps"></a>**Three steps.** Under the title, "Report for …" says the airline and its kind; until the report is saved, "Change" beside it offers the airlines and "Personal": the choice is made in place, the draft stays as it is; once saved it keeps its own, and the header says "AAA ≠ BBB" when the current airline is not its own. The report is filled in three steps: Flight, Mission, Result. On a phone, one step at a time (“Next”
at the bottom); on a computer, the three side by side. Nothing is mandatory: what is missing is shown at the last step,
without ever blocking the save.

<a id="report-step-1"></a>**The last flight.** If your IVAO (or VATSIM) identifier is set (⚙) and the device is online, a card offers your last
flight on the network: “Use” fills in the aircraft, the callsign, the route and the times taken from the track. The
flight prepared in Fuel or Map is offered the same way (“Current flight”); if it was started in Fuel (“Start the
flight”), it comes first, “Flight started at hh:mm”. The card says in one line everything that will be taken, even what
a mission type has no box to show (distance, level). “Use” also fills in the start-up time (the departure time in Fuel)
and the fuel at departure (the block fuel of the quote), the whole recalled in the “Prefilled from: …” line under the card’s title. Saving the report ends the started
flight: Fuel goes back to preparation, My flights removes “In progress”, and the flight is no longer offered.

**A flight of another company.** A flight prepared for a company and taken when the device has moved to another keeps its own: the heading says it, the list of families is its own, and the report is saved for it. Its family and series come from Fuel's Flight step (filled by the mission); if they were forgotten at the departure, choose them here: the report has the last word.

**The other sources.** Unfold “Other sources” to take your last IVAO or VATSIM flight, your SimBrief flight plan, or a
pasted text: an ICAO flight plan, the page of a flight from the IVAO tracker or from StatSim, a METAR. Only empty fields
are filled; the “Prefilled from: …” line under the card’s title says where they come from. If a source gives something else for fields already entered, a button offers
to replace them.

<a id="report-step-2"></a>**The mission.** At the second step: the family, said by its acronym then its name ("SAR · Personnel recovery", suggested from your last report), the series, the mission identifier
if the flight follows one, then the blocks specific to the family. Some blocks only appear for one series (for example
VIP or ferry for special missions). Until you open this step it is marked "to check" instead of ✓: the family and
the series of a new report are taken by default. The default series is the family's first, except for Commercial: "Passengers". A family added by the airline numbers its reports with the letter it was given in Settings.

<a id="report-step-3"></a>**The result.** At the last step: the outcome, your observations, the crew (you first, as aircraft commander) and the
fuel at departure and at landing. Inconsistencies — times out of order, a future date, fuel that goes up — are
flagged.

<a id="report-load"></a>**Load.** “Use” takes the flight's family and series; you can change them, the report has the last word. A series that carries (Cargo, Passengers, VIP) adds, on the last step, the “Load” card with a single field: the freight carried in kg, or the number of passengers. Any other series adds nothing.

<a id="report-measures"></a>**Measurements.** At the end of the last step, "Measurements" reads the Fuel Phase Monitor journals ("Choose journals", or "From the Output folder" on the workstation) and proposes the flight that left this report's departure and reached its arrival, at its UTC times within an hour — never by the registration, an X-Plane livery's not being yours; several flights fit: they are listed, you choose; "Keep this flight" puts its fuel used, its duration and its phases in the report, saved with it. Nothing else of the journal is kept.

<a id="report-save"></a>**Saving.** The button at the bottom saves the report and gives it its number at the first save. As long as you have
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
  report, entered in the device's time, is shown converted with the entered time in the line under the card's title ("Take-off entered 18:30 local"); it
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

<!-- fr: c7defe7f33ab -->

<!-- chapter: flightlog -->
# My flights

All your past flights in one place, one line per flight, from the most recent to the oldest: your reports, the
airline website's log and your IVAO or VATSIM connections, with no duplicates.

## How to use

<a id="flightlog-totals"></a>**The totals.** At the top, three boxes: the number of flights, the block hours and the flights that do not have a
report yet, for the chosen period. Just below, the three aircraft types you have flown the most.

<a id="flightlog-filters"></a>**The filters.** Choose the period (7 days, 31 days, 1 year, all), search for a callsign, a type, a registration, an
airfield, a mission or a report number, or tick “Without report” to see only the flights waiting for one. Your choices
stay on the device: at the next visit a chip recalls them ("1 year · LFRS ✕") and removes them in one tap. A "—"
instead of the block time: a report without times.

<a id="flightlog-list"></a>**The list.** One line per flight: the date, the callsign, the route and the block time; when you fly for more than one airline, the airline of each report. An orange dot marks a flight
without a report. On a computer, the line also shows the aircraft and the report number.

<a id="flightlog-detail"></a>**The details of a flight.** Touch a line to unfold it: where the flight comes from (report, website log, IVAO or
VATSIM network), its time, the aircraft, the mission and the notes.

<a id="flightlog-report"></a>**Writing or opening the report.** On a flight without one, “Write the report” opens a new report, already filled in
with this flight — date, aircraft, callsign, airfields — and a suggested mission family. On a flight that has one,
“Open the report” opens it again for editing.

<a id="flightlog-current"></a>**The current flight.** A flight started in Fuel (“Start the flight”) and not yet reported appears at the top, “In
progress — started at hh:mm” (a diversion is flagged), even before the website log knows it. “Write the report” opens
the report, which offers this flight first; once the report is saved, the line disappears.

<a id="flightlog-more"></a>**More.** Unfold “More” to export the filtered list as CSV (spreadsheet) or read your IVAO and VATSIM connections again.

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

<!-- fr: 7b729c25101f -->

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

**The status.** The screen opens on the “Status” block, with the same dot as the ⚙ button of the header (green: something
new; amber: attention). One line per thing, touch it to act: the flight in progress (to the Map), the reports to write (to the
pre-filled report), the missing trigram (to “Identity”), the aeronautical database while it is not ready (to “Data
access”), the state of the data and the exchange in use (to “Synchronisation”, or the conflicts), the launcher, “Offline” and,
on a phone, the position during a flight.

**The groups.** At the Discovery level, the screen shows seven cards at most, one under the other: Identity, Data
access, Synchronisation (when it is used), Usages, Level, Design and About. The backup, the offline data, the weather
key, the Little Navmap sheets and the computer access come at the Everyday level. At the Everyday and Full levels, the
cards are arranged under seven titles, in the order things are set: Identity, Access, Data, Device, Display,
Administration (Full level) and Help. Each title is folded; touch it to open it. A group that needs attention (a warning,
an error, or the card an amber status line leads to) opens by itself, with an amber dot; a line of the “Status” block
opens the group of its card. A group opened by hand stays open while the page is open. The cards of circumstance (V2
settings found, configuration received, joining resume) come first, at every level, and go once dealt with. A card
opened by its address (the “Offline data” button of the “Join the airline” assistant, for instance) is shown alone,
whatever the level; “← Settings” goes back to the list.

**Your identity.** In “Identity”, type your trigram and your IVAO VID, VATSIM CID and SimBrief IDs, then “Save”. The
tools use them to prefill; with several users, the trigram is needed.

**The level.** “Level” chooses what the menu shows: Discovery, Everyday or Full, with one tap. Under each choice, the
“Menu:” line says which tools it shows; a hidden tool stays reachable by its address.

**The design.** “Design” shows one thumbnail per look — Standard, Cabinet, Rugged — and the tone: Automatic (as the
system), Day or Night. One tap applies it at once, on this device only. A design reserved for the computer does not
apply on a phone: the card says which one is shown instead, and its thumbnail is marked; touching a thumbnail replaces
that choice.

**The usages.** The sentence at the top of “Usages” says how data are exchanged. With no box ticked you are “Alone on
this device”: nothing goes elsewhere. Tick “Alone, on several devices” or “Several users (git data repository)” to
exchange. On a workstation served by the launcher, the app already reads and writes the launcher's `data/` folder, even
with no box ticked; an exchange usage also shares it through git.

**Data access.** On a phone or on the website, set in “Data access” the repository (account/repository), the branch and
your personal token, then “Test” and “Save”. On a workstation served by the launcher there is no token; while `data/` is
not a git repository, the card opens the door to fetch or take it over; its remote repository is set in the
“Administration” card (see “A git repository for data/”). On the launcher's computer, the “Data access” card starts with a “Data repository:” line giving the address and branch of the remote repository: the screen does not wait for it (the launcher may take several seconds to read it), the line shows “…” then its value, without moving; what depends on the repository (the “Remote repository” panel of Administration, for example) appears when it arrives.

**No access and no launcher, no bases.** A device with no access set and no launcher — the website opened on a phone
for the first time, for instance — has neither the aeronautical base (airspaces, airfields, beacons) nor the aircraft
base: “Offline data” says so. Two ways in: set the access to the data repository, even without ticking an exchange (it
then only reads the bases); or, on a workstation with the launcher, publish the bases to the repository (V2: Settings ›
Maintenance › Aeronautical data and Aircraft types), then synchronise. Three distinct states when the base is missing: “Aeronautical database loading…” (the read is not over: wait), “Data access not set on this device” (set the access above; an app added to the home screen has its own storage, nothing you set in Safari is there) and “Aeronautical database not published” (the access works, nothing is published in the repository).

**Synchronisation.** The “Synchronisation” card is the summary of what has not left yet: at the top, one count per kind (aircraft sheets, missions, flights, fleet; “Other” only when there is
something), then the last success, the network and the last error. A folded list per kind gives what is waiting: the readable title (for example “Sheet A320 Navy”, “Flight LFPO → LFBO of 3/11”), the date,
✕ for a deletion and, if there is one, the error that holds the queue; seven items visible at most, “… and n more” for the rest. With the workstation's launcher, “changed here” (not yet saved in the
data) and “to send” (saved, not yet sent) are added. “Send everything” sends and receives at once; otherwise synchronisation runs by itself at start, every 10 minutes online and when the network comes
back. The card appears as soon as an exchange is ticked or something is waiting. Below it, one line says what has just left (“Sent at 18:04: Aircraft sheets: 2 · Missions: 1”, with “of which 1 refused” if any); unfolded, it gives the files one by one by their readable title, the refusals first with the reason the transport gave, seven at most. It is the last synchronisation that sent something: a pass with nothing to send leaves it as it was, and nothing is said before the first send. On a workstation with a launcher, two lines say **how long the synchronisation took**: the last one and **the longest of today** (kept on this device), in seconds, step by step (settle, commit, receive, push…), with the number of git commands and what was sent (“8 s — commit 1 s · receive 2 s · push 4 s · 12 git commands (1 s) · 38 Ko sent”); a shorter pass does not replace the longest, another day clears it.

**The backup.** Alone on this device, “Export (one file)” keeps all your data in a file: it is the only copy. “Import
(merge)…” takes it back without losing anything here; “Replace from a file…” first erases what is on the device.

**Offline data.** Each published zone has its row: its state on this device, its cycle and its size. “Keep offline”
downloads it whole (preferably on Wi-Fi); “Free” gives the space back.

## The weather key

METAR works without a key. TAF, on a device without a launcher (phone, website), needs a personal and free avwx.rest
key: “Create a key on avwx.rest ↗” opens the provider's page. Paste it in “Weather key (TAF, avwx.rest)”, then “Save”;
“Test” asks for the TAF of an airfield, “Erase” removes it. The key stays on this device only (kept with your identity: it survives closing the browser), never in the repository
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

## The airline's API keys

On a workstation served by the launcher, at the Full level, the “Airline API keys (IVAO, EAD Basic)” button of the “Administration”
card unfolds the setting of the IVAO API key: it stays in the launcher’s `secrets/` folder, never in the browser nor in
the data. “Test” checks that IVAO answers; “Erase” removes it.

Under the IVAO key, the “EAD Basic (EUROCONTROL)” block takes the user name and password of your EAD Basic account: you give them once to this computer’s launcher (`secrets/` folder), which keeps them; the page never shows them again, it only says whether they are saved and when. They are used by “Read an aerodrome from EAD” (one aerodrome per gesture). EAD Basic is a demonstration tool with non-operational data, to be used for simulation only (the warning stays displayed). “Erase” removes them from the launcher.

<a id="settings-ivao-app"></a>Under the EAD Basic block, a link leads to the “IVAO application (pilots’ sign-in)” assistant (the card of the same name, “Administration” group, or `#settings?card=ivaoapp`). It lets pilots sign in to IVAO through the airline’s relay or this workstation: it guides you through IVAO (`https://developers.ivao.aero/create`: Name = the airline’s name, App Type = Third Party, Active = Enabled), lists the return addresses to declare with “+ Add Redirect URL” (this workstation’s, and the relay’s when its public address is set; “Copy” gives them exactly as they must be pasted), then takes the Client ID and the Client Secret that IVAO shows. The launcher writes them to `secrets/ivao_oauth.json`: you edit no file, and the page never shows them again (it only says whether the application is saved, and when). “Test” reaches IVAO’s OpenID discovery document; “Erase” removes the application. The application’s API key (`secrets/ivao.json`) is another setting: a new application’s key is carried over into “IVAO key”.

## The tablet next to the simulator

You fly on the computer (X-Plane) and want the map on a tablet or a phone: on the computer served by the launcher,
“Computer access” opens the Pilot application to devices of the same local network (or start `lancer.cmd --lan`).

1. **Open to devices of the local network**: the card shows the address to open on the device, its QR code and a
   8-digit pairing code (6 until 30 October 2026). Windows may ask to allow Python: accept for private networks only.
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
  one-minute wait; 30 in an hour: pairing closes until the next “New code”. “Forget”, next to a device (with its pairing
  date, in UTC), removes that one only.
- Only the computer's main address is opened; the others (VPN, virtual machines) only through “Open them too”. An
  address that cannot open is named in the card; the launcher's window says why.

## A git repository for data/

**GitHub or GitLab?** It is not a setting: the provider is read from the remote repository’s address and shown at the top of “Administration › Remote repository of data/”; the “Data access” card leads there.

On a workstation served by the launcher, at the Full level, the “Remote repository of data/” button of the
“Administration” card shows the remote repository of `data/`: its address and its branch. To set or change it, type the address (`git@host:account/repo.git` or `https://…`, with no password or token
in it): “Check” says whether the repository answers, “Save” sets it. Towards another address than the configured one, a Yes / No window opens on the computer, not in the page: the card says so before the click; answer it (it may be behind other windows), then come back. Refused, closed or already open: the card gives the reason and `data/` stays as it is. This is on purpose: a malicious page must not be able to send your data elsewhere. Nothing blocks: a repository that does not answer is
only reported.

- **Access to the repository** is set on the computer: an SSH key for a `git@…` address, credentials stored in Git for
  an `https://…` address.
- **The provider** of a configuration is chosen (github or gitlab), never guessed; the panel only reads the remote repository's address (GitHub, gitlab.com, framagit.org, or a self-hosted GitLab that the device's configuration names with the same host; otherwise “Provider not recognised”). At the top of the panel, “Provider: GitLab · project group/project” (the project is a link to its page); for GitLab, the “Pilots’ tokens” link leads to the creation of the welcome tokens; for GitHub, the panel suggests entering the address of a GitLab project, because welcoming by project token needs one. The page only suggests: changing the repository goes, as always, through the launcher's Yes / No window. The exported configuration always carries the provider (github or gitlab; an unknown repository is refused, never exported as “other”), and the pilot's side opens on it. An old configuration without a provider is accepted only for github.com. Without a launcher, a GitLab configuration is applied on the device like a GitHub one.
- **Several users through git** need this remote repository: without it, the “Several users” box leads nowhere, and
  the “Usages” card says so.
- **data/ missing or without git**: the “Data access” card opens a door, at every level. `data/` is a folder ignored by the code repository; it
  becomes its own git repository, linked to the data repository (not a submodule). Type the address of the data
  repository, and if needed a username and a password or token (never kept by the page; “Remember” hands them to Git on
  this computer). Without `data/`, “Fetch the data” clones it; with a `data/` without git (example data or archive),
  “Take data/ into this repository” links it to the repository. The card follows the work and reads the state again at
  the end; a failure is explained, nothing is lost.
- **Rewritten repository history** (for instance to purge big files from it): this computer's synchronisation then
  refuses any merge and says so; nothing is lost. Here, « Take up the new history » first shows what will leave (your
  commits, the data files carried over), asks, keeps the old state in a local reference, carries your data files onto
  the new history, then synchronises. A file outside the synchronised data is never sent again.

## Configuring a pilot

**Preparing the configuration (administrator).** In the “Administration” card (“Full” level), “Add a pilot” prepares a pilot’s configuration (see “Add a pilot (administrator)” below). It gives **three forms of the same configuration**: the file sog-config-<TRI>.json, the link and its QR code; send whichever you like. The pilot scans the QR code with their phone’s camera: it opens the link, which leads to the assistant. They contain the airline, the data repository, the trigram and the token how-to, never a token or a secret; the repository’s owner (user or organisation) is noted there, it decides which token to create. For a GitHub repository, first invite the pilot’s GitHub name on the repository, with the Write right (the link leads to the repository’s collaborators page).

**Joining the airline (pilot).** The QR code (scanned with the phone’s camera: it opens the link), the link, “Join the airline…” (“Data access” card: the assistant without a configuration asks you to paste the link received, or to choose the file) and the welcome card of the first opening open the “Join the airline” assistant, one screen per step: the
configuration received; the account (create it if needed, with the sign-up link) and the username; the invitation to
accept; the token, step by step (classic for a user's repository, fine-grained for an organisation's); the token pasted
and tested; the network IDs; and last “Finish and synchronise”, then the offline data. Ticked boxes stay on the device:
a settings card offers to resume where you left off. The “Join the airline” tutorial follows the same steps.

**Joining for a GitLab project (pilot).** When the configuration you received is a GitLab project, you create nothing: no account, no invitation, no token. The assistant has only three screens: the configuration read (airline, project), then “Paste the token” — paste the token the administrator sent you apart (never in the link); your trigram is read from the configuration, you do not type it — then “Finish and synchronise”. Your VID, CID and SimBrief identifiers are filled in later in Settings › Identity. Before accepting the token, the app asks GitLab what kind of token it is. A personal token (it works for all your projects) gives a question: prefer the project token asked from the administrator; if you answer “No”, nothing is saved. A token without an expiry date (or more than a year away), or with more rights than needed, is flagged with a warning line, without blocking you. The “Data access” card says the same of a personal token, without a question: alone with your own repository, a personal token is the right one.

**Nothing more than the file.** Only what the configuration holds is set, and the access is saved only once the token is
tested; “Test” says what is wrong: invitation not accepted yet, token copied wrongly or expired, token without the right
on the contents. A classic token opens all the repositories of the account: for a user's repository, a GitHub account
dedicated to flying is advised. A file in another format is refused with a message. The airline is written to the
repository only if it has none yet. On a workstation whose data/ already follows this repository, the assistant skips
the account and the token. Without a launcher, the app reaches a GitHub repository or a project on a GitLab instance
(gitlab.com): paste the project's address (https://gitlab.com/group/project) and the project access token the
administrator gave you; the token is sent to that instance only. When the received configuration or the device's access is a GitLab project, the “Data access” card expects the project's address and describes the project token (Developer role, `write_repository`).

## Administration

**The administration pages.** At the “Full” level (“Level” card), the “Administration” card, below “About”, gathers the
administration and test pages, **one button per page**, each with a sentence; at the other levels it does not appear, and
nothing of the administrator's is on the other cards. In the app: the “Map threshold tuning” button (`#maps?tune=1`, read only on a phone; it opens the tuning page: for each map element and each mode, the zooms where it appears, saved for the airline, `airline/map_profiles.json`; a mode you never saved takes the thresholds of a tuned mode, and the page says so; the map's “Complexity” slider only shifts the zoom), back by the back arrow; the “Flight zone limit” button, which unfolds a box
“Show the edge line of the flight zone limit” (saved at once for the airline, with the thresholds, in `airline/map_profiles.json`,
key `edge`; the edge line is shown until you set it); the “Runway thresholds on the map” button, which unfolds a list from 8 to 16: the zoom from which the map draws the runway thresholds (saved at once for the airline, same file, key `runwayZoom`; 11 until you set it); the “Add a pilot” button (see below);
on a workstation served by the launcher, the “Remote repository of data/” and “Airline API keys (IVAO, EAD Basic)” buttons, which
unfold their setting (see “A git repository for data/” and “The airline's API keys”); the roadmap (`#roadmap`, which opens on “Priorities”: columns Delivered, In test, one per open milestone, Backlog, where cards are dragged (to the head of the column where they are dropped; “To the top”, “Up”, “Down” on the card); “By theme” shows them by lane); the acceptance list (`#recette`): one functional test per delivered card, with “Passed”, “Failed” and a comment (required for a failure), written by the launcher in `organisation/RECETTE.json`; a defect already known says “in progress, do not retest”; a second tab “To decide (n)” puts the points to decide as multiple-choice with a free field (answers written by the launcher in `organisation/DECISIONS_REPONSES.json`); and the diagnostics of the “About” card.

**The administrator’s assistant.** The “Administrator’s assistant” button (“Administration” card, or the address `#settings?card=assistant`) takes the administrator by the hand: six steps, in order, each with its state read from the installation (done, to do, optional, unknown), a sentence and a button to the card that sets the step. The first step to do has the coloured button. The data repository (a remote repository for data/ and, for GitLab, your administrator token on this workstation), the airline (its name, in the Website module; your trigram is in Settings › Identity), the aeronautical base (at least one published zone), the first pilot (“Add a pilot”), then, optional, the devices and the keys (IVAO, EAD). The state of the installation, as the frame gives it, is at the bottom. The assistant writes nothing: each button opens the card that already exists.

**Add a pilot (administrator).** At the “Full” level, the “Add a pilot” button of the “Administration” card (where the export is possible) prepares everything for a pilot who has nothing yet. Type their trigram, their name if you want to greet them, the language of the message and the published app’s address, then “Prepare”: you get the file, the link and the QR code (three forms of the same configuration), your steps, and a message ready to copy, in the chosen language. For a GitLab repository, your steps are: create the pilot’s project token (one per pilot, name = their trigram, role Developer, scope `api`, expiry date 90 days advised and 365 at most, never without a date), copy it at once (GitLab shows it only once), check that the data branch lets Developers push, and know how to revoke (Settings › Access tokens › Revoke). With the launcher, “Create their token” opens the “Pilots’ tokens” screen with the trigram already typed: the launcher creates the token with the administrator’s; the steps by hand stay folded below. Without a launcher, they are open. **Send the token apart from the message** (another channel, or paste it in front of the pilot): it is never in the link or in the message. For a GitHub repository, the steps are the export’s.

<a id="settings-sources"></a>**Data sources.** The “Data sources” button (`#sources`, Full level) lists the sources of aeronautical data the suite uses, considers or has set aside: for each, what it gives, its licence, its status and a link that opens in a new tab; for those that change with each AIRAC cycle (SIA, VAC, eAIP, CIFP), the link is the one of the cycle in force, written at the top of the screen. The screen downloads nothing. Under the button of the Administration card, the absolute address of the screen, to open or bookmark (“Copy the link”). It replaces the data laboratory, removed on 28 October 2026.

**The benches, on a workstation.** Served by the launcher, they only open on a workstation with a launcher (elsewhere
they are named without a link); paths relative to the root of the suite: `frame/aerodb/bench.html` and `frame/aerodb/offline_bench.html` (aeronautical base, online and offline),
`frame/store/test/` (data layer, against the fake GitHub) and `modules/maps/test/render.html` (map rendering).

**The V2 pages.** No button in this card any more: every page of the old version (Settings › Maintenance, First launch, map studio…) is kept in the “Old pages (V2)” screen (`#legacy`), the last entry of each application's navigation column.

## Good to know

- **IVAO account**: the « IVAO account » card links this device to your IVAO account through the airline's relay (or
  the workstation's launcher): « Sign in to IVAO » opens IVAO's page, then comes back here. The relay keeps the airline
  application's secret; your token stays on this device, renewed by itself, never in a backup. « Unlink » erases it and asks IVAO
  to withdraw the access; if IVAO cannot, the suite tells you to withdraw it in your IVAO account. Without an IVAO
  application set, the button is off and the card says where it is missing: on this workstation, Administration › « IVAO
  application » sets it (it gives the return address to declare at IVAO); on the relay, the administrator sets it.
- **Devices**: one screen, Maintenance › « Devices », for every pilot's device, whether it comes from the local network
  or the airline's relay (when the launcher runs as the relay, behind the NAS's reverse proxy, in https). A pilot pairs
  each device once with an 8-digit code the administrator asks for there for their trigram (once, 10 minutes, on either
  channel); their writes are signed with that trigram. Each row says the device's channel; a device paired with the
  console's code says « console code », and « Name » sets a trigram on it. A lost device, or all those of a pilot who
  leaves, are revoked there.
- **Update the suite** (Administration, with the launcher): choose a channel — stable, pre-releases, or development
  follow-up —, “Check” says what would change without touching anything, then “Update” (after a question). Never a step back;
  refused if files of the suite were changed on this computer, and while a job of the Data module or a synchronisation runs
  (try again once it is over). The data are not touched. The version taken is the one the suite’s repository announces: its
  tags are not signed, the trust is the same as an update made by hand with git. It is the one “Check” showed: if the
  channel changed meanwhile, nothing is written and the panel asks to check again.
  Then close the launcher’s window and run
  lancer.cmd again.
- **Folders of this computer** (Administration, with the launcher): where the suite, the data, the downloads, Little
  Navmap's databases and sheets are on this computer, the path read only and where it comes from; “Open” shows the folder
  in the file explorer. A path is changed where it says, never here; X-Plane is unknown to the launcher.
- **Pilots' tokens (GitLab)**: in the Maintenance application, on the launcher's computer, « Pilots' tokens » creates
  one project access token per pilot (named after the trigram, Developer role, one year at most) and revokes it. After
  « Create the token », the screen shows only that token, at the top: copy it at once (it will not be shown again), with
  what to tell the pilot and the link to their message (« Add a pilot »); the « Existing tokens » list is folded below,
  the new one there « created just now ». The launcher uses the administrator's token there, which it never shows: a personal access token of your
  GitLab account (Preferences › Access tokens), scope api, with an expiry (one year at most), this account being
  Maintainer or Owner of the project. Paste it in « Administrator's token », under the list; « Test the administrator's
  token » says the account, its role, its scopes and its expiry; the block's title says whether a token is set (its date, the
  instance, the project, the time of the last test), never its value. A refusal of GitLab is said by its cause: token refused
  (missing, expired or without api), account that is not Maintainer, project not found. The data branch must be protected,
  open to the Developer role and without force push (on gitlab.com the default branch is reserved to Maintainers): the screen checks it, and « Open the
  branch to Developers » does it after a question, asked too before the first token. A pilot whose token is refused
  writing reads « the project's branch main is not open to Developers ».
- **Token expiry (GitLab)**: the « Existing tokens » list says, for each token, « expires on … · in 12 days » (amber under 30 days, red under 7, « expired on … » once the date is past); the date is read from GitLab each time the screen opens, nothing of it is kept. On the launcher's computer, the « Status » block of Settings says « 2 pilot tokens expire soon (nearest: …) »: the number and the nearest date, read at most once a day, never a name. For its own token, the device keeps only the expiry date GitLab gives (never the token), reads it again at most once a day, says it in the « Status » block and, under 30 days, once a day in a notification. A refused token is said « expired on … » only when that known date is past: GitLab answers an expired, a revoked and an unknown token the same way. With GitHub, no date is read (the browser cannot read the header that carries it).
- **The token**: on github.com, a fine-grained token, on the data repository only, “Contents” read and write, 90 days
  at most; on GitLab, a project access token (one per pilot, named after the trigram), created by the administrator. It
  is never shown again; never paste it in a message.
- **Your settings stay after the browser is closed**: the identity, the token and the weather key are kept in the same place
  on the device, never synchronised nor in a backup. If Safari made you lose them anyway (it clears the storage of a site
  that is little used), add the app to the Home Screen: it is better kept there. The diagnostics (“Copy”) say whether the
  browser promised not to clear (`storage.persisted`).
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token at the host (github.com, gitlab.com…).
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **About**: links to this help and to the roadmap (what is delivered, in progress, planned), then the
  diagnostics, folded: transport, last sync, errors, repository tree, reference bases and aeronautical base, line by
  line; “Copy” puts it all on the clipboard, to paste in your message to report a problem. The token is
  never in it.

<!-- fr: c75cd2a9eb9f -->

**The airline.** At the “Full” level (or through #settings?card=company), the “Airline” card lists the airlines of data/airline/index.json and “Personal”: the name, the code, the networks (IVAO, VATSIM, off-line) and the number of aircraft in the fleet. The card is titled “This device’s airline”: a list of radio buttons, one line per airline (the name, the code, the kind said in words — “Commercial”, “SO squadron” or “Personal” —, the networks and the fleet). Touching a line makes it the current airline of this device (the choice is per device): only the radio buttons change, the list is not redrawn. While the frame cannot yet save this choice, the buttons are grey and the card says so. Under the list, the sheet of the chosen airline (the others have none), open: the **kind** (two radio buttons, a sentence each) then the **mission families** (one box per family: the acronym and the name), ticked from the kind while nothing has been ticked; ticking or unticking writes themes.json, at least one family stays ticked. **Add a family** (an acronym of 2 to 8 letters or digits, a name of 1 to 40 characters; eight at most; a free **letter** is proposed to number the family's reports, refused with its reasons when a family of the table, M, D, X or another added family already has it; a family added before the letters gets a free letter proposed, written only when you set it) and **Add a series** (a family of the list, a name; twenty per family): the name typed in the language of the screen is copied into the four languages; the family or series is removed with “Remove”. Three gestures follow, in this order: “Create an airline” opens an **assistant on the same screen**: the **Identity** step (the name; the code, proposed from the name and editable, 2 to 8 lower-case letters or digits, never one already taken; the **kind**, Commercial or SO squadron, Commercial preselected; the networks), then the **Flight families** step (the kind's own, ticked in advance: untick what you do not fly; nothing is written for the families if you do not touch them), then the **Fleet** step (“Fleet · 2 aircraft”: search a type in the sheets base, type the registration, “Add the aircraft”; “Remove”; “Later” if you prefer to add the aircraft from Aircraft), then the **Summary** in words (“Rennes Motoculture · Commercial · IVAO · 1 family · 2 aircraft”). “Back” keeps everything typed. **Nothing is written before “Create the airline”**: then the settings, the (empty) fleet and, last, the entry in the list (an airline is listed only when complete); an existing file is never overwritten. If the creation is interrupted, the message says what is done and “Resume” finishes without overwriting anything. At the end, “Fly for this airline” chooses it and opens Missions. If the code typed already has its folder but the airline is missing from the list, the assistant says so and offers **“Take this airline back”**: it goes back into the list, nothing else is written. Twenty airlines at most; everything read from data/airline/ is treated as untrusted text. “Join an airline” opens another assistant: paste the “Fleet” page of the airline’s website (or “Read the clipboard”), then “Read the page”; the screen shows **what was read** (“4 aircraft · 3 operators”), the name and code proposed, the kind (“SO squadron” by default), the networks and the address of the site (optional, https) **before anything is written**; “Join” then writes the settings, the fleet read and, last, the entry in the list. The “what was read” step also says **how many missions of the registry are already at this code** (“Registry: 2 missions already at this code”), and follows the code you type. An airline already in the list is not joined again: its fleet is refreshed by the paste of the airline website screen. On the launcher's computer, while your airline is still at the root of data/airline/, the card offers to **migrate** it: an optional code (proposed from the name), “See what would be done” (the name, the folder data/airline/<code>/, the files and their size, the fleet that will be empty there), then “Migrate to “<code>””. Nothing is deleted or overwritten: the current files stay in place as a copy. In the sheet: with no kind every family is ticked in advance and the sheet asks you to choose the kind; a commercial airline has the Commercial family (cargo, passengers, empty leg, VIP, training, transit, test flights), a squadron the sixteen military families. “Personal” (every family) has nothing to set.
