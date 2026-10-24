# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** On a phone, the bottom bar gives five entries: Prepare, Map, Report, Flights, Settings (Prepare groups
  several tools: touch the already selected tab again and a small list opens above it to switch between them); on a screen, each tool is a verb of the left column. A tool's
  address (`#fuel`, `#report`…) is enough to come back to it.
- **Your identity.** In ⚙ Settings, set your trigram and your IVAO, VATSIM and SimBrief IDs: the tools use them to
  prefill.
- **The level.** Also in Settings, "Level" chooses what the menu shows: Discovery, Everyday or Full. A hidden tool stays
  reachable by its address.
- **Help.** Each tool has a folded "How to use" panel at its top; the ? button (on a phone, the last line of the i button's
  sheet, "Help for this screen") opens this manual at the tool's chapter.
- **The i button.** In the header, next to ⚙ (and ?, on a screen): a green dot when something is waiting for you, amber (on
  a phone) when something needs attention: no trigram, pending writes, conflicts, a synchronisation error, offline. It
  opens a status sheet: the flight in progress (touch to go to the Map), the reports still to write for your past flights
  (touch to open the report, pre-filled), the missing trigram (touch to set it), the state of the data (last
  synchronisation, pending writes, the exchange in use), "Offline" when there is no network and, on a phone, the source of
  the position during a flight and "Help for this screen". Escape or ✕ closes it. On a phone the header is reduced to the
  name, the i button and ⚙.
- **Full screen.** On the map (the fixed-view tools), a round button at the bottom of the column of buttons over the map hides
  the header and the bottom bar to give the map all the room; the same button or Escape bring them back.
- **Phone in landscape.** Turned on its side, the phone puts the bottom bar as a rail of icons at the left (the same five
  entries; a second touch on Prepare opens its tools at the right of the rail), keeps the header, lays the map's data block as a
  column at the right (touch its first line, or drag it to the left, to widen or narrow it) and gives the map the whole height
  that remains. In full screen the column stays.

## Data and synchronisation

- **Offline first.** Everything you do is kept on the device and works without network.
- **Alone on this device.** With no exchange ticked in Settings, nothing goes elsewhere: export the device backup (one
  file) from time to time, it is the only copy.
- **Several devices, or several users.** Tick the usage in Settings and set the access (GitHub repository and personal
  token, or a workstation's launcher). Your writes leave together at synchronisation: at start, every 10 minutes
  online, or with the status button at the top of the screen.
- **Conflicts.** A file changed here and elsewhere at the same time keeps its newest version; the other one stays
  available (status button, then "Conflicts") and can be taken back.
