# Pilot — manual

The Pilot application gathers the tools to prepare and follow a flight: fuel and level, map, report, my flights,
hand-off to the airline website. It works on a phone as on a computer, with or without network.

## First start

- **The verbs.** On a phone, the bottom bar gives five entries: Prepare, Map, Report, Flights, Settings (Prepare groups
  several tools: a row of tabs above the tool links them); on a screen, each tool is a verb of the left column. A tool's
  address (`#fuel`, `#report`…) is enough to come back to it.
- **Your identity.** In ⚙ Settings, set your trigram and your IVAO, VATSIM and SimBrief IDs: the tools use them to
  prefill.
- **The level.** Also in Settings, "Level" chooses what the menu shows: Discovery, Everyday or Full. A hidden tool stays
  reachable by its address.
- **Help.** Each tool has a folded "How to use" panel at its top; the ? button opens this manual at the tool's chapter.
- **The i button.** In the header, next to ? and ⚙: a green dot when something is waiting for you. It opens a status
  sheet: the flight in progress (touch to go to the Map), the reports still to write for your past flights (touch to open
  the report, pre-filled), the state of the data (last synchronisation, pending writes, the exchange in use) and "Offline"
  when there is no network. Escape or ✕ closes it.

## Data and synchronisation

- **Offline first.** Everything you do is kept on the device and works without network.
- **Alone on this device.** With no exchange ticked in Settings, nothing goes elsewhere: export the device backup (one
  file) from time to time, it is the only copy.
- **Several devices, or several users.** Tick the usage in Settings and set the access (GitHub repository and personal
  token, or a workstation's launcher). Your writes leave together at synchronisation: at start, every 10 minutes
  online, or with the status button at the top of the screen.
- **Conflicts.** A file changed here and elsewhere at the same time keeps its newest version; the other one stays
  available (status button, then "Conflicts") and can be taken back.
