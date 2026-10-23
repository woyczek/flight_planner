# Fuel and level

Prepare the fuel of a flight and choose its level: an aircraft, a route, a level, and the quote comes out — taxi,
trip fuel, reserve, block fuel, flight time and top of descent.

## How to use

Preparation follows five steps, in the order a flight is prepared:
**1 Flight, 2 Route, 3 Weather, 4 Quote, 5 Departure**. On a phone, the top bar shows one step at a time (touch a number
to go to it, “Next” at the bottom of each step); on a wide screen, the five steps are one below the other. Everything is
recomputed at each change: correct the route, and the weather, the quote and the wind follow, with no button to press.
The result (block fuel, trip fuel, time, top of descent) stays visible at the bottom of the screen at every step, with
where the wind comes from (“wind: METAR LFRS”, “wind: ICON forecast FL060”, “wind typed”). A ✓ marks a completed step.
Levels are written the same way everywhere: as FL from 5,000 ft up (FL060), in feet below (3,500 ft).

**1 Flight.** The departure, the arrival and the alternate (ICAO codes), the flight date if you want the forecast (TAF)
rather than the observation, the aircraft and the cruise level (as a flight level). The aircraft fits on one line: the
chosen aircraft, its registration, its callsign and where it comes from. The magnifying glass opens the search: type a
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
at the chosen level, the curve and the quote give the same figure. Touch the curve to choose a level, or use the two buttons. “Climb” chooses how to climb: economical, best rate,
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
273°/35 kt → 284°/44 kt · block 684 → 644 kg · planned arrival 17:03”); offline, it says so and starts with the last
quote. It then records the departure time, which becomes the report's start-up time. On a phone it opens the Map, on a
large screen it stays here with the Map on the right. Changing the departure airfield afterwards means preparing another
flight: the departure time is cleared. Changing the arrival after departure is a diversion: the time is kept and the
diversion recorded.

Once the flight has started, the result at the bottom of the screen says “Flight started at 13:14 · for 1 h 10”. A
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
