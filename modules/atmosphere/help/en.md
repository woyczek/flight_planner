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
("SFC", the requested level, the computed path or a fixed altitude). The layers button (top left) opens a panel over
the map: it chooses what is drawn on the map and in the profile, and the cut stays in view below, redrawn by each box; the
cross or Escape closes it. Touch a point of the map to open its slice.

<a id="atmosphere-zones"></a>**The flight area and the world.** A thin line surrounds the flight area: inside, the fine forecast loaded for the flight
(Météo-France AROME 1.3 km and ARPEGE 0.1° over France, ICON in Europe); outside, the world synoptic (NOAA GFS,
published on a 5° grid). The two models do not say quite the same thing: a jump of the lines where they cross the line
is normal. The layers panel names both models and their grid.

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

<!-- fr: 41aa49a1eeb1 -->
