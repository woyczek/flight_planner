# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** On a phone, the bottom bar gives five entries: Prepare, Map, Report, Flights, Weather. Touch an already
  selected tab again when it groups several screens: a small list opens above it (Prepare: Fuel and Performance sheets). On a
  screen, each tool is a verb of the left column. A tool's address (`#fuel`, `#report`…) is enough to come back to it.
  Settings are the ⚙ button of the header. The application's name, top left, opens the list of applications: Pilot and, at the Full level, Maintenance (the same plane in red); a tap switches to it.
- **Your identity.** In ⚙ Settings, set your trigram and your IVAO, VATSIM and SimBrief IDs: the tools use them to
  prefill.
- **The level.** Also in Settings, "Level" chooses what the menu shows: Discovery, Everyday or Full. A hidden tool stays
  reachable by its address.
- **Help.** Each tool has a folded "How to use" panel at its top; the ? button of the header (on a phone as on a screen) opens
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
  available (status button, then "Conflicts") and can be taken back.
