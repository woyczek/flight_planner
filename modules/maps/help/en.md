# Map

See your flight on an aeronautical chart and its vertical profile, or the maps of a mission: airspaces, airfields,
beacons, airways, minimum altitudes. The flight's route can also be changed on the map.

## How to use

**The planned flight.** The map shows the flight prepared in Fuel: departure, route points, arrival, and the alternate
airfield in grey dashes. Its summary (level, distance, planned or in-flight) is the title of the data block's handle under the map; the title's tooltip gives the whole line: departure and arrival, alternate, aircraft type. When the flight changes in Fuel, the map follows by itself.

**The map and what it shows.** Around the route: the airspaces it crosses or skirts (restricted, danger and prohibited
areas, controlled airspace), the low or high airways depending on your level, the airfields and the beacons, and in each
one-degree square the minimum safe altitude (the brown figure, in thousands and hundreds of feet: “3⁵” means 3,500 ft).
The small purple figures along the route are the distances from the departure, in nautical miles. Drag the map with one
finger, spread two fingers to zoom; “Recentre” (the target, at the top right of the map) comes back to the whole route. The map stays where you put it, even when
the route changes: only “Recentre” (or another flight) reframes it. Seen from afar, the map only shows what is near the
route; zoom in to see everything.

**The profile and the cursor.** In the data block under the map, the vertical profile cuts through the route from end to end: the terrain,
the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the profile: a
blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The line below
the profile says what is under the cursor: distance from the departure, planned altitude, terrain height, and the
airspace you are in at that point. Under the map, this data block shows the profile; the list of airspaces at a point or
an airfield's reporting points open in its place when you ask for them, and the profile comes back when they are closed. The cloud chip at the right of the block's handle replaces it (the profile chip brings it back) with the weather
cross-section along the route (wind, temperature, cloud, icing) against the flight's level; the cross-section follows the same cursor, and a tap on
it moves the cursor. It only shows the forecast that Atmosphere has already loaded: without one, the line "No forecast loaded" leads to
Weather, under Prepare.

**A fixed screen.** Nothing between the header and the map: the map and the data block fill the screen, and nothing scrolls but the block's content. The buttons sit on the map: on the right, from the top, “Edit the route” (the pencil), “Recentre”, the map mode, “Edit on the map” (the four arrows) and, last, full screen (Escape leaves it); on the left, “Layers”. The block is a sheet: drag its top line (the small bar and the title) up to enlarge it, down to shrink it to
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

**Layers.** The layers button, at the left of the map, opens in the data block, in place of the profile, the list of what the map draws (the ✕ brings the profile back): airspace families (TMA /
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
and where you are (filled aircraft, turned to your track, with the trail of the last 30 minutes dotted). In the data block's notes, under the profile, a line gives the difference: ahead or late (minutes and NM), how many NM off the route, and your altitude against the
planned one; the profile shows both altitudes. Close up, each point carries its estimated time (ETA) under its name, never over an airfield, in UTC (“14:52Z”), the local time in brackets at departure and arrival. “Follow” keeps the
map on your position; moving the map stops it. Without a position (GPS or network not enabled), a notification says so once, the line stays in the notes and its link opens the settings; a position older than 2 minutes is greyed. The line ends with the position's source: GPS, network,
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

**Mission maps.** The first list, at the head of the layers (the layers button), chooses what the map shows: the planned flight, or a mission of the
airline. For a mission, a second list chooses among its maps (overview, target, detail…). Each map is redrawn as in
the studio: same frame, same display profile, with the mission's points, its hatched areas and its route. The vertical
profile then shows the mission's.

**Editing the route on the map.** Tap “Edit on the map” (the four arrows, at the right of the map; a short help appears the first time you enter the mode): the waypoints get a circle. Drag a point onto
a fix, a beacon or an airfield: it settles there (dropped elsewhere, it becomes a free point named by its coordinates,
such as 4530N00030E). To add a point, tap “+” (in the same column), then tap the place you want (or keep pressing for half a
second): on a fix, a beacon or an airfield it settles there, elsewhere it is a free point; it is added to the nearest
segment. A simple tap adds nothing: it shows the bubble. Tap a route point: its card gives its level and offers
“Remove”. Departure and arrival do not move here. On the profile, drag a level up or down: the level changes from the
point that opens that segment, in steps of FL10 (on the first segment, it is the flight's level); in a point's card, “−”
and “+” do the same. “Undo” takes back the last gesture. Each change is saved in the flight at once, and Fuel redoes the
quote; the profile follows. Tapping the button again (or Escape) closes the mode, and the map moves under your finger again. To type the route as
text, the pencil at the top of the right column (“Edit the route”) opens Fuel's Route step.

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

<!-- fr: dc1f0c9c9d2f -->
