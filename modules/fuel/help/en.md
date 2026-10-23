# Fuel and level

Prepare the fuel of a flight and choose its level: an aircraft, a route, a level, and the quote comes out — taxi,
trip fuel, reserve, block fuel, flight time and top of descent.

## How to use

**The aircraft.** A single line at the top: the chosen aircraft, its registration, its callsign and where it comes from.
The magnifying glass opens the search: type a sheet, a registration, a callsign or a type. The results come in this
order: your performance sheets, the airline's aircraft (its fleet, then those known from its logbook), the published
types, and last the code as typed. An airline aircraft takes its own sheet if it has one, otherwise its type's,
otherwise an estimate of the type — the quote then marks it “approximate”. The chosen registration and callsign follow
the flight through to the report. The “Cruise” line says where the fuel flow comes from.

**The route.** Type the departure, the arrival and the alternate (ICAO codes), then the route in the “Route” field,
always visible: the points, the airways and the levels, as in a flight plan (“LFBO TOU UN460 NTS/F280 LFRN”). You can
also paste an ICAO flight plan or the list of an OFP there. When you leave the field, the route is tidied up: in
capitals on one line, without DCT or speed-level groups, the departure and the arrival at the ends, a level change
written “/F280” after the point where it starts. Airways stay written (the quote follows the points). Unknown points
stay in place and are reported just below; coordinates are written the ICAO way (“4530N00030E”). The next line gives
the distance and the true track, and where they come from (the route, the SimBrief OFP). If the route does not resolve,
“Type them by hand” opens the two fields. With your SimBrief ID set (⚙), “Last SimBrief OFP” takes the route, the
level, the mean wind and the aircraft of your last plan in one go.

The “Points” fold lists the recognised points, from departure to arrival. The arrows move a point up or
down the list, the cross removes it; the field at the bottom adds one before the arrival: an identifier (beacon, fix,
airfield) or "NAME latitude longitude". Each intermediate point has an optional level field, in FL: it is the level held
from that point on, for a step climb or step descent. A point without a level continues the previous one (shown greyed
out); the flight starts at the plan's level. The quote counts each step (its climb or descent, then the cruise at that
level), the result shows the sequence of levels (FL100 → FL120), and the descent starts from the last level. Every
change rewrites the “Route” field (the points only) and is passed straight on to the map.

**The level and the wind.** Give the cruise level (as a flight level) and the wind: direction and speed. Without a
direction, or without any wind, the block fuel is given as a range. “Climb” chooses how to climb: economical, best
rate, fast, at the sheet's airspeed, or manual (you give airspeed and rate of climb).

“ISA ±” is the temperature deviation from the standard atmosphere, in °C: it changes the power available, the true
airspeed and the ceiling. Once the weather has been read, the line below computes it from the departure METAR — its
temperature minus the airfield's standard temperature (15 − 1.98 × airfield elevation in thousands of feet) — and
“Use ISA …” copies it into the field. The deviation chosen is kept in your settings: the next flight starts from the
same one.

The “Density altitude” fold shows, for the ISA deviation on the horizontal axis, the density altitude of each pressure
altitude (one line per thousand feet): it is the altitude “felt” by the rotor, the propellers and the engine. The
vertical line is the flight's deviation, the horizontal line the sheet's ceiling; where they cross tells at which
pressure altitude the aircraft reaches its ceiling that day (line in bold). A dot marks the departure according to the
METAR (temperature and QNH). Important for helicopters: in great heat or at altitude, the real ceiling can fall well
below the sheet's.

**The weather.** Below “Level and wind”, “Read the aerodromes’ weather” shows the departure, the arrival, the
alternate and the airfields along the route: all those within 10 NM on either side of the route (radius adjustable in
the quote settings) that have a METAR or a TAF; the others are ignored. Each airfield gives its distance from the
departure (the alternate, from the arrival); beyond two, the intermediate airfields are folded away below the
departure, the arrival and the alternate. For each one, what matters for the flight: the category (VFR, MVFR, IFR,
LIFR, in colour), the wind and its headwind and crosswind components on the airfield's main runway (the direction
closest to the wind), the ceiling, the visibility, the temperature and the QNH, and a warning when CB or TCU are
forecast; the raw message is folded away. With a flight date, the TAF answers if it covers that time (and its
temporary changes), otherwise the METAR. Tick “Real weather” for the quote's wind to become the mean of the winds of
the airfields on the route (departure, intermediate airfields, arrival), leg by leg and weighted by their length — an
approximation from the surface wind, stated below the fields. Offline, the last values read stay displayed with their
time.

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
- **Offline**: everything is computed on the device, from the sheets already received. Only SimBrief and the weather
  wait for the network; the last OFP and the last weather stay kept on the device.
- **Weather without the launcher**: the weather service can only be reached through a computer's launcher; elsewhere,
  the card shows the last weather kept, or says so.

<!-- fr: 8b3112cf90c8 -->
