# Weather

The atmosphere along the flight prepared in Fuel: a weather map at the chosen level, the vertical cross-section of the
route, the slice of a point, at the departure time or later.

## How to use it

**The flight.** Weather always shows the flight prepared in Fuel (route, level, flight date). With no planned flight, the
page says so and leads to Fuel; "See the example" shows a demonstration flight, marked as such in the grip.

**Loading the forecast.** The load button (the downward arrow, at the right of the map) reads the forecast along the
route and around it. Nothing is asked at opening: the page shows what the device has already kept. Outside the flight's
area, the map shows the world synoptic published with the application, asking for nothing.

**The weather map.** Isobars, isotherms, cloud, wind, jet stream and convection, at the level chosen with the level chip
("SFC", the requested level, the computed path or a fixed altitude). The layers button (top left) chooses what is
drawn. Touch a point of the map to open its slice.

**The flight area and the world.** A thin line surrounds the flight area: inside, the fine forecast loaded for the flight
(Météo-France AROME 1.3 km and ARPEGE 0.1° over France, ICON in Europe); outside, the world synoptic (NOAA GFS,
published on a 5° grid). The two models do not say quite the same thing: a jump of the lines where they cross the line
is normal. The layers panel names both models and their grid.

**The flight date.** The slider under the grip moves the time from 0 to 72 hours after the planned departure: the map,
the cross-section and the slices follow.

**The cross-section and the slices.** Under the map, the cross-section shows the route from end to end, from the ground
to above the flight level. Touch it to open the slice of the nearest point (the vertical profile of the atmosphere
there); ◀ and ▶ move to the next slice, ✕ goes back to the cross-section. The drawing always fits the block, its distance
axis visible; expand the block for more detail.

**The legend.** The "i" chip, in the grip row at the right (after ◀ and ▶), shows the legend of what is drawn; a touch on
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
- What is loaded stays on the device and works offline; the Map reuses its weather cross-section.

<!-- fr: 10a7d47c1ccc -->
