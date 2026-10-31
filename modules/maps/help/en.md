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
finger, spread two fingers to zoom (during the gesture the map keeps only its lines — airspaces, airways, route,
aerodromes as small squares — and its names come back as soon as it stops); “Recentre” (the target, at the top right of the map) comes back to the whole route. The map stays where you put it, even when
the route changes: only “Recentre” (or another flight) reframes it. Coming back to the map (from Fuel, or after “Done”), you find your framing
again as long as the route and the chosen procedures have not changed; otherwise the flight is framed, procedures included. While “Around the flight only” is ticked (Layers),
airspaces and airways are read only near the flight, from afar; untick it or zoom in to see everything.

<a id="maps-procs"></a>**The runway and procedures chosen.** What you chose in Fuel (runway, SID, STAR, approach) is drawn over the route: the SID in green, the STAR in orange, the approach and its missed approach in blue, from the threshold of the departure runway to the first point of the route, and from the last point of the route to the threshold of the arrival runway. Transitions and the missed approach are dashed; a leg without a fix (a climb on a heading, for example) is a short stroke along its course, then dashes to the next point; a constant-radius turn is an arc. When the SID does not reach a point of the route, a dashed straight line joins it to the route (likewise for the STAR). A procedure you did not choose is never drawn, and the Layers list has no box for it. The procedure's name is written on its trace, followed by where its data come from when they come from X-Plane or Little Navmap ("X-Plane, local") then by the symbol ⌛ (in grey) when they were read under an earlier cycle; the legend ("i" chip) recalls it. From the regional view on (adjustable on the thresholds page), each point carries its constraints; the procedure's name is written at every scale, over everything else, as on procedure charts: an **underlined** altitude means "at or above", **overlined** "at or below", both "exactly", "5000–7000" "between the two"; "≤ 220 kt" is the speed not to exceed. The vertical profile follows the same path and shows these constraints as steps (up arrow: at or above, down arrow: at or below, dot: exactly, bar: between two altitudes); their text takes a free place or none, never over a space’s name, TOC / TOD or a level; distances, estimated times and the cursor are measured along that path. The map never changes this choice: touch an aerodrome of the route and its card gives the runway and procedures chosen, with a "Change" button that opens Fuel on the row to change; a "Source" link opens the procedure's published page (the SIA's eAIP) in a new tab, and for a procedure read elsewhere its document's name shows when hovering the row.

<a id="maps-rwy"></a>**The runways.** Close in, each runway of every aerodrome drawn is a short vector from its threshold, and the aerodrome shows its name next to its code ("LFPO Paris-Orly"); each vector goes along the runway, its number at the tail, behind the threshold: the runway chosen in Fuel bold in its side’s colour, the others thin. They appear only from the zoom set by the airline (Settings › Administration, "Runway thresholds zoom", 11 with no setting); below it, nothing. In "Choose on the map", every runway of the aerodrome is drawn so, the chosen one bold; the choice’s drawings go over the base map’s labels, which are dimmed.

<a id="maps-choose"></a>**Choosing on the map.** The "On the map" button of a side in Fuel (departure or arrival) opens the map on that aerodrome — as does "Choose on the map" on the card of the departure or arrival aerodrome (touch its pin; full width on a phone): the sheet opens expanded (“Done” stays at its foot, always in sight), the base map and the layers are dimmed and the view fits the aerodrome and its procedures that suit your choice, within 40 NM of it, the aerodrome at the centre (far entries stay out of the frame; a chosen procedure leaving the view widens it to that procedure alone); from the start, the compatible procedures of the first family are drawn, faded: touch one on the map to choose it, as its row. At the top of the data block, your selection in one line per family ("Runway 31 · ↑ 12 kt", "OKRI5L", "I31 via IAF1"), each with ✕ to set it back to "None"; touching a family’s name ("Runway", "STAR", "Approach") goes to its group and unfolds it. Below, the three families at once — the runway, the SID (departure) or the STAR, the approach (arrival) — in tight rows: three taps in whatever order suits you. Each choice narrows the two other families to what fits it; the rest is folded under one thin line "N more · All", which unfolds it marked ⚠ (it can still be chosen). SIDs leaving and STARs entering on the route you typed come first, under "Towards your route"; the others follow, marked "exit LACOU" or "entry OKRIX". On a direct route (no point and no airway between the two aerodromes), nothing of the kind: they rank by their direction towards the other aerodrome, "Towards LFPO" over the best aligned (within 60°), a small arrow along the way flown on each row. "None" is always the first row. Procedures that differ only by their runway (OKRI5L, OKRI5R) are one row "OKRI5" with its runways as small tags: tapping it chooses the family and narrows the runways, tapping a runway chooses the procedure. Approaches read by their short label ("ILS 06", "RNP 06", with no runway tag since the label says it, the same on the map; the published name on hover); under the chosen approach, "No transition" then its transitions, among them the initial approach segments the SIA publishes for the whole runway ("via ODILO 1A"), in their final’s hue; a chosen STAR leaves only the transitions starting from one of its points (otherwise the transition goes back to “None”); a transition that does not meet the final on a shared point joins it with a dashed line. Each procedure has its hue (eight, cycled), the same on its row, its label and its trace; on the map, one small label per family and point ("NIMER 9"), and the procedure hovered or touched goes over everything, with its full name; hovering a row of any family highlights its trace, hovering a trace highlights its row; ⌛ (grey): read under an earlier cycle. The aerodrome’s code stays written above the procedures; runway numbers take their place before the beacons, which give way; a number that would fall on a label is not written (the arrow stays). Each runway carries the wind of the METAR already known: "↓ 12 kt" head, "↑" tail, then the crosswind (← wind from the right, → wind from the left: the arrow says where it blows, the runway drawn upward, as in Fuel), in green, orange or red by the tailwind and the crosswind; without a METAR, nothing. A tap on a row or a trace adds that choice and leaves it on the map (the runway bold, the procedure in its hue, the others of its family dimmed); nothing is written yet. A procedure that serves one runway sets it when none is chosen; otherwise a line under the group offers the correction, in one tap: "OPAL2E serves 25 — Switch to 25", or "OKRIX5A does not serve 07 — Choose OKRIX5B". "Done", the ✕ cross or Escape take you back to Fuel with everything you chose; Fuel writes it and says what changed; the map writes nothing. To give up without handing anything back: "← Fuel" at the top.

<a id="maps-coverage"></a>**Coverage.** The "Coverage" layer (in the layers list, off to start with, switched on by its box only) colours the aerodromes by what this device can give of their procedures: **green**, they are held (published, entered by hand or read on this computer); **orange**, they are held but partly read (pages not read, records to check: the aerodrome's card says how many) or they are read on demand (France through the SIA's eAIP, a State whose tables can be read, an aerodrome of Little Navmap's local database); **red**, nothing readable (images only, prose text, nothing on this computer). The legend (the "i" chip of the data block) gives one line per colour while the layer is shown. Only the visible aerodromes are asked. Touch an aerodrome: its card adds a line with the pin, the level and the reason (⌛ when the procedures held are from an earlier cycle, then how many SIDs, STARs and approaches are held). When the device cannot give this information, the layer is not offered.

<a id="maps-weather"></a>**The profile and the cursor.** In the data block under the map, the vertical profile cuts through the route from end to end: the terrain,
the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the profile: a
blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The line below
the profile says what is under the cursor: distance from the departure, planned altitude, terrain height, and the
airspace you are in at that point. Under the map, this data block shows the profile; the list of airspaces at a point or
an airfield's reporting points open in its place when you ask for them, and the profile comes back when they are closed. The cloud chip, (the three chips — profile, cloud, “i” — are always in the top line, at the right; one with nothing to show is only greyed out), replaces it (the profile chip brings it back) with the weather
cross-section along the route (wind, temperature, cloud, icing) against the flight's level; the cross-section follows the same cursor, and a tap on
it moves the cursor. It only shows the forecast that Weather has already loaded: without one, the line "No forecast loaded" leads to
Weather, under Prepare. The last chip, “i” (greyed out while the drawing has no legend), opens the legend of the profile over it (what each line, band and mark is); dragging a finger on the cross-section moves the cursor like on the profile. The profile and the cross-section are drawn to the exact height of the block, their distance axis always in view: on a low block they drop level labels, never the axis.

<a id="maps-profile-spaces"></a>**The profile's airspaces.** The profile shows only the airspaces the planned vertical path enters (within 500 ft); overlapping sectors of one family (Dublin's CTAs) make one envelope there, named by the family; free route airspace (FRA) and W or weather research areas appear only when the "Other airspaces" layer is on; at most seven airspaces are named, the others in the list below.

<a id="maps-profile-zoom"></a>**Zooming the profile.** To read the profile precisely, tighten it on part of the flight: pinch it with two fingers (the middle of the fingers stays in place) and drag with two fingers to move the window; one finger stays the reading cursor. The altitude scale refits to what the window shows (that is where the precision comes from), the distance marks (NM) tighten with it, and points outside the window are not drawn. A double tap goes back to the whole flight, as does the “Whole flight” button, which appears in the top line while the profile is zoomed. On a screen: Ctrl + wheel zooms around the pointer, a drag moves the window, a double click goes back to the whole flight. The zoom is kept while the page stays open and the route does not change; it is never stored. The weather cross-section zooms the same way (same gestures, same “Whole flight” button) and the window is the same for both: zoom on one, switch to the other with the chip, and you find the same part of the flight; the cross-section also refits its height scale to what it shows.

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
view is read, at the same density everywhere, filtered by complexity alone — except a view wider than 600 NM, read around
the flight anyway (the “i” chip says so). Close up, everything is drawn anyway. Each element of the map has its zoom range: VFR reporting points appear only
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

**Steps.** If the route sets a level at some points in Fuel, the profile draws the steps: climb, level-off, new
climb or descent, with the top of climb and top of descent computed again. The route's waypoints are also marked on
the profile.

**Climb and descent.** The purple diamonds mark the top of climb (TOC) and the top of descent (TOD), on the map as on
the profile. They come from the Fuel calculation; without it, the map estimates them with common rates of climb and
descent. When room is short, the map writes the aerodrome's name first, then the runway numbers, the beacons, the
procedures, the route (names, times, TOC / TOD), then the rest; an estimated time or the name of TOC / TOD slides
along the route before it gives up (the diamond stays).

**Mission maps.** The list at the bottom of the layers (the layers button) chooses what the map shows: the planned flight, or a mission of the
airline. For a mission, a second list chooses among its maps (overview, target, detail…). Each map is redrawn as in
the studio: same frame, same display profile, with the mission's points, its hatched areas and its route. The vertical
profile then shows the mission's.

<a id="maps-edit"></a>**Editing the route on the map.** Tap “Edit on the map” (the four arrows, at the right of the map; a short help appears the first time you enter the mode): the waypoints get a circle. Drag a point onto
a fix, a beacon or an airfield: it settles there (dropped elsewhere, it becomes a free point named by its coordinates,
such as 4530N00030E). To add a point, tap “+” (in the same column), then tap the place you want (or keep pressing for half a
second): on a fix, a beacon or an airfield it settles there, elsewhere it is a free point; it is added to the nearest
segment. A simple tap adds nothing: it shows the bubble. Tap a route point: its card gives its level and offers
“Remove”. Departure and arrival do not move here. On the profile, drag a level up or down: the level changes from the
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

<!-- fr: ab9ff462f78b -->
