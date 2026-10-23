# Map

See your flight on an aeronautical chart and its vertical profile, or the maps of a mission: airspaces, airfields,
beacons, airways, minimum altitudes. The flight's route can also be changed on the map.

## How to use

**The planned flight.** The map shows the flight prepared in Fuel: departure, route points, arrival, and the alternate
airfield in grey dashes. At the top, a line sums it up: departure and arrival, alternate, level, distance, aircraft
type. When the flight changes in Fuel, the map follows by itself.

**The map and what it shows.** Around the route: the airspaces it crosses or skirts (restricted, danger and prohibited
areas, controlled airspace), the low or high airways depending on your level, the airfields and the beacons, and in
each one-degree square the minimum safe altitude (the brown figure, in thousands and hundreds of feet: “3⁵” means
3,500 ft). The small purple figures along the route are the distances from the departure, in nautical miles. Drag the
map with one finger, spread two fingers to zoom; “Recentre” comes back to the whole route. The map stays where you put it, even when the route
changes: only “Recentre” (or another flight) reframes it. Seen from afar, the map only
shows what is near the route; zoom in to see everything.

**The profile and the cursor.** Below the map, the vertical profile cuts through the route from end to end: the
terrain, the airspaces you enter at the planned altitude, and the flight path in purple. Slide your finger along the
profile: a blue cursor follows it, and the same cursor moves on the map. Tap the route on the map to put it there. The
line below the profile says what is under the cursor: distance from the departure, planned altitude, terrain height,
and the airspace you are in at that point.

**Six map modes.** The button at the top left of the map shows the chosen mode; tap it to see the six modes. “Low IFR”:
low airways, airspaces, minimum altitudes and beacons. “High IFR”: upper airways (UN…, UM…), airspaces above FL195.
“VFR”: topographic background with towns, the airspaces that matter in VFR, reporting points and obstacles. “Topo”: the
terrain, with only airfields, towns and obstacles. “OAT”: military flight, the IFR of your level plus the air refuelling
tracks, the day's NAT tracks, the R, D, P, TSA, TRA, CBA areas and the low-flying network at all levels. “Auto” chooses
from your flight's level (High IFR from FL195). The mode is kept on this device.

**The closer you zoom, the more it tells.** From afar, the map shows only the large airfields, the airways and their
names. Closer: the airway points (triangles and beacons), each airway's minimum level (“F195”), then the segment's
distance, its track (“097°”), the reporting points and the obstacles. Close up, each obstacle carries its height above
ground, and the elevation of its top in brackets (“434 AGL (771)”).

**Layers.** The layers button, under the map setting, opens the list of what the map draws: airspace families
(TMA / CTR, D / R / P, FIR, others), lower and upper airways, beacons, airway points, VFR reporting points,
obstacles, minimum altitudes, towns, graticule, alternate. Tick or untick: the map follows, and your choice is kept
for this setting on this device. “Reset all” goes back to the original choice. “Around the route only”, ticked by
default in IFR, keeps airspaces and airways near the route; unticked, the whole visible map is drawn, to look
elsewhere. Close up, everything is drawn anyway.

**Tap or hover to learn more.** Tap, click or hover over an airway's name, an airspace's label or a wind barb: a
small bubble gives the essentials in two lines — for an airway, the segment (point → point), its distance, its tracks,
its floor and ceiling; for an airspace, its name and its limits in AIP notation (“TMA 8 AQUITAINE 2000|FL145 D”).
Tapped elsewhere inside an airspace, the bubble gives the airspaces under your finger. It follows the pointer, stays 5
seconds, gives way to the next one, and closes with a tap elsewhere or a move of the map. On the profile, your finger
or the mouse give the airspaces crossed in the same way.

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
such as 4530N00030E). Tap a fix or a beacon off the route: it is added to the nearest segment. Tap a route point: its
card gives its level and offers “Remove”. Departure and arrival do not move here. On the profile, drag a level up or
down: the level changes from the point that opens that segment, in steps of FL10 (on the first segment, it is the
flight's level); in a point's card, “−” and “+” do the same. “Undo” takes back the last gesture. Each change is saved in
the flight at once, and Fuel redoes the quote; the profile follows. “Done” closes the mode, and the map moves under your
finger again. To type the route as text, “Edit the route” opens Fuel's Route step.

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

<!-- fr: e49322f78862 -->
