<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Company — manual

The Company app is the airline pilot's: the missions the airline offers (Missions module). It is where you choose your next
flight, or draw it among those you have not flown yet; « Prepare this flight » then goes to the Pilot app, in Fuel, with
the mission prepared. The flight in progress is the same in both apps.

## First start

- **The entries.** Missions, and Fleet (the current airline's, at the Full level), in the bottom bar of a phone and in the left column of a screen. Top right,
  « ? » opens this help and ⚙ the Settings.
- **The apps.** The application's name, top left, opens the list of applications (your airline's name under « Company »):
  one tap goes to Pilot.
- **The help.** It opens at the chapter of the screen shown; « All help », at the top, leads to the other manuals and the
  tutorials.
- **The logo.** The app's icon is your airline's logo when the data repository has one (a png or webp file of 512 KB at
  most, named in airline/settings.json: "logo": "airline/logo.png"); otherwise, the tinted plane.

<!-- chapter: missions -->
# Missions

The airline's missions, in the Company application: those of the shared repository (written with the CPCO): choose one, or draw one at random, then prepare it in Fuel.

## How to use

<a id="missions-list"></a>**The list.** The missions of the newest series first, grouped by family. Each row gives the id, the title, the route, the aircraft type and the estimated block; "flown on …" marks a mission whose report you wrote. The search filters on the id, the title, an aerodrome (ICAO code), an aircraft type, a callsign (SAMU66) or the activity (MEDEVAC, HEMS, SAMU…), and also in the content of the missions already on the device: summary, description, objectives, risks, places, notes, callsigns and types, ignoring case, accents and hyphens ("clermont-ferrand" = "Clermont Ferrand"). When the word is not in the title, the row says where it was found ("in: risks"); a mission whose file is not on the device yet is searched on its registry line, and the list says so ("n missions not read"). Nothing is written or downloaded to search. The registry search is the same; the drop-down list keeps one family, given by its letter (the one of the identifiers), its short name and its name ("T · AIRLIFT · Airlift / logistics"), in letter order; a chosen family with several subtypes opens a second one, "Subtype", beside it. Seven rows are shown, "N more" unfolds the rest. The organisation missions of an exercise (those ending in Z) are not flights and are not listed. Only the missions of the airline chosen in Settings › Airline are listed; a mission that names no airline is personal: it is under « Personnel ». The list « My airline · Personal · All airlines », above the search, also shows the personal missions or those of other airlines, each with the name of its airline; they can be prepared the same way. When the airline has categories (cargo, passengers…), a second drop-down keeps one category, and the open mission says its own.

<a id="missions-open"></a>**Choose, or draw at random.** A tap on a row opens the mission sheet: its category, its summary in full under the title "Summary" (beyond 600 signs, "Read more" opens the detail), its risks (the first three, "hazard → mitigation", the others folded, or "No risk declared"), the teams engaged and its zones. "Detail" shows the rest in foldable sections: description (the detailed description only, without the summary), objectives, zones to activate, rendezvous, route provided, maps provided, payload and aircraft; "See on the Map" opens the Map on a zone or on a map of the mission (drawn from its coordinates). On a phone, the browser's back returns from the detail to the sheet, then to the list; on a large screen, the sheet and the detail are side by side. "Draw at random" picks one among the missions of the filtered list you have not flown yet; "Draw again" picks another. Nothing starts by itself: "Prepare this flight" opens Fuel, in the Pilot application, with the departure, the arrival, the points of the mission (as coordinates), the level and the aircraft type; the runway, the procedures, the fuel and the weather are then prepared as for any flight.

<a id="missions-add"></a>**Add missions.** « Add missions », next to « Draw at random », reads one or more YAML mission files (a file may hold several, separated by « --- » or in a `missions:` list), or a pasted YAML. Before writing, the screen shows what it read (id, title, family, series, airline) and what it refuses, with the reason (id outside the rule, exercise organisation, duplicate, YAML unreadable at a given line). « Add (n) » writes each mission at its place, `missions/<letter>_<FAMILY>/<ID>/mission<ID>.yaml`; a mission that already exists is replaced only when « replace? » is ticked. A mission without an airline is personal. They leave at the next synchronisation.

<a id="missions-airline"></a>**Change airline.** On a mission’s sheet, « Airline: … · Change » offers the airlines and « Personal »; the sentence « … moves from … to … » is said before « Write ». In the list, « Assign to an airline… » takes the missions shown (scope, family, search), each ticked: the screen says how many change and which are unreadable (left as they are) before writing. When adding from YAML, « Add these missions to » chooses their airline. Only the `airline` field of the file changes.

<a id="missions-registry"></a>**The registry.** « Registry », next to « Draw at random » (or the address `#missions?view=registry`), shows one line per mission as the registry `missions/mission_registry.yaml` writes it, with the state of its file: there, missing, unreadable or path refused; and the repository missions the registry does not know. As in the V2 table, a mission holds on one line: the sign of its state (✓ file there, ! to check, + not in the registry, … reading, ? not read: the screen reads 500 files at most and says so in the count), the identifier, the title, the family and the series, the origin and the destination; a tap unfolds it: the state in words, the number, the operation, the path of the file, « Edit » and « Remove from the registry ». The lines to check come first, then the others by series and identifier; the family filter (and its subtype, as in the list) and the search are at the head. « Update the registry » first says what it would do (missions to add, lines without a readable file, duplicate identifiers, former identifiers), then « Write the registry » adds the repository missions, keeps one line per identifier and replaces a former identifier by the folder's; a line without a readable file stays (the file may not have arrived yet). An added mission takes its file's series, else the current series of its family (a number). In an identifier (« A-001A »), the final letter from A to Y is a flight linked to the mission without suffix, Z its organisation. « Edit » changes the title, series, number or operation of a line; « Remove from the registry » takes it out, the mission file stays in the repository. An unreadable registry is never rewritten; an absent one is created from the files.

<a id="missions-editor"></a>**The editor.** In the registry, « Create a mission » (at the head), « Edit » and « Duplicate » (on an unfolded line) open the editor: six steps (Frame, Teams, Places, Story, Risks, Timeline and maps), one at a time on a phone, the steps on the left, the form in the middle, the preview of the sheet and « To complete » on the right on a large screen. The Frame step (family and subtype, series, identifier, title, theatre, departure, arrival) and the Teams step (one row per team: callsign, type, service, role; « + Team » adds one, the cross removes it) and the Places step (one row per place: departure and arrival for their position, target, zones, turning points, rendezvous, with their position in degrees and minutes; « Edit » opens its fields, latitude and longitude in decimal degrees; « + Zone », « + Turning point », « + Rendezvous », « + Target »; a polygon keeps its points, still moved in the V2) and the Story step (the summary, with its count of signs: the sheet shows it whole up to 600; the description, one paragraph per blank line; the main objective; the secondary objectives, one per line; the load, its mass and its passengers) and the Risks step (one row « hazard → mitigation » per risk; « Edit » opens the hazard, the consequence and the mitigation; « + Risk » adds one; a removed risk leaves its translations too) are filled there; « Next » goes from one to the other, and what is typed is kept from step to step until « Save » or « Cancel ». The last one, Timeline and maps, gives the mission's events (one row per event: the time from the planned take-off, « H+30mn », a place of the mission or none, what happens; « + Event ») then the declared maps; « Propose maps from the places » adds the missing ones (general, target, rendezvous, zones), whose images are made in the V2 map studio. The organisation of an exercise (Z mission) stays in the V2. A commercial mission (family « E · CAT », a link flight) has a reduced Frame: departure, arrival, airline, load (passengers, cargo…) and aircraft; the title is proposed by itself (« LFPO → LFRS ») as long as you have not changed it; teams, risks, timeline and theatre are not asked. The family proposes the next identifier and the current series; only a missing family and an identifier without its form (« T-086 ») or already taken prevent saving, the rest is listed under « To complete ». « Save » writes the mission file and its registry line on the device: they go with the next send, and the editor says so (« changed on this device — not sent yet »). Only what you change is written, the rest of the file is kept as it is; « Save » without any change writes nothing. A file that uses YAML aliases (« &… », « *… ») does not open in the editor, and a registry that uses them is said unreadable and never rewritten: write the repeated object out in full at each place (or edit the mission in the V2); a changed identifier writes a new file, the former one is never deleted. A mission created without an airline is personal.

## Good to know

- The module writes a mission only through its editor (« Create a mission », « Edit », « Duplicate »); the rest of the mission is still written in the CPCO.
- A mission whose file does not come says so: "not found" (the repository has not got it), "not on this device yet" (the synchronisation brings it, the mission appears when it arrives) or "unreadable" (with the reason). Only the registry is shown then.
- A mission that came with the synchronisation without the registry naming it is listed all the same, read from its file, at the next display; no button to press.
- A flight being prepared is replaced only after a question; a started flight never is (cancel the start, or finish the flight, first).
- The envelope, the page-by-page reader and the assignments will come later.

<!-- fr: e786600425be -->

<!-- chapter: missions -->
# Missions

The airline's missions, in the Company application: those of the shared repository (written with the CPCO): choose one, or draw one at random, then prepare it in Fuel.

## How to use

<a id="missions-list"></a>**The list.** The missions of the newest series first, grouped by family. Each row gives the id, the title, the route, the aircraft type and the estimated block; "flown on …" marks a mission whose report you wrote. The search filters on the id, the title, an aerodrome (ICAO code), an aircraft type, a callsign (SAMU66) or the activity (MEDEVAC, HEMS, SAMU…), and also in the content of the missions already on the device: summary, description, objectives, risks, places, notes, callsigns and types, ignoring case, accents and hyphens ("clermont-ferrand" = "Clermont Ferrand"). When the word is not in the title, the row says where it was found ("in: risks"); a mission whose file is not on the device yet is searched on its registry line, and the list says so ("n missions not read"). Nothing is written or downloaded to search. The registry search is the same; the drop-down list keeps one family, given by its letter (the one of the identifiers), its short name and its name ("T · AIRLIFT · Airlift / logistics"), in letter order; a chosen family with several subtypes opens a second one, "Subtype", beside it. Seven rows are shown, "N more" unfolds the rest. The organisation missions of an exercise (those ending in Z) are not flights and are not listed. Only the missions of the airline chosen in Settings › Airline are listed; a mission that names no airline is personal: it is under « Personnel ». The list « My airline · Personal · All airlines », above the search, also shows the personal missions or those of other airlines, each with the name of its airline; they can be prepared the same way. When the airline has categories (cargo, passengers…), a second drop-down keeps one category, and the open mission says its own.

<a id="missions-open"></a>**Choose, or draw at random.** A tap on a row opens the mission sheet: its category, its summary in full under the title "Summary" (beyond 600 signs, "Read more" opens the detail), its risks (the first three, "hazard → mitigation", the others folded, or "No risk declared"), the teams engaged and its zones. "Detail" shows the rest in foldable sections: description (the detailed description only, without the summary), objectives, zones to activate, rendezvous, route provided, maps provided, payload and aircraft; "See on the Map" opens the Map on a zone or on a map of the mission (drawn from its coordinates). On a phone, the browser's back returns from the detail to the sheet, then to the list; on a large screen, the sheet and the detail are side by side. "Draw at random" picks one among the missions of the filtered list you have not flown yet; "Draw again" picks another. Nothing starts by itself: "Prepare this flight" opens Fuel, in the Pilot application, with the departure, the arrival, the points of the mission (as coordinates), the level and the aircraft type; the runway, the procedures, the fuel and the weather are then prepared as for any flight.

<a id="missions-add"></a>**Add missions.** « Add missions », next to « Draw at random », reads one or more YAML mission files (a file may hold several, separated by « --- » or in a `missions:` list), or a pasted YAML. Before writing, the screen shows what it read (id, title, family, series, airline) and what it refuses, with the reason (id outside the rule, exercise organisation, duplicate, YAML unreadable at a given line). « Add (n) » writes each mission at its place, `missions/<letter>_<FAMILY>/<ID>/mission<ID>.yaml`; a mission that already exists is replaced only when « replace? » is ticked. A mission without an airline is personal. They leave at the next synchronisation.

<a id="missions-airline"></a>**Change airline.** On a mission’s sheet, « Airline: … · Change » offers the airlines and « Personal »; the sentence « … moves from … to … » is said before « Write ». In the list, « Assign to an airline… » takes the missions shown (scope, family, search), each ticked: the screen says how many change and which are unreadable (left as they are) before writing. When adding from YAML, « Add these missions to » chooses their airline. Only the `airline` field of the file changes.

<a id="missions-registry"></a>**The registry.** « Registry », next to « Draw at random » (or the address `#missions?view=registry`), shows one line per mission as the registry `missions/mission_registry.yaml` writes it, with the state of its file: there, missing, unreadable or path refused; and the repository missions the registry does not know. As in the V2 table, a mission holds on one line: the sign of its state (✓ file there, ! to check, + not in the registry, … reading, ? not read: the screen reads 500 files at most and says so in the count), the identifier, the title, the family and the series, the origin and the destination; a tap unfolds it: the state in words, the number, the operation, the path of the file, « Edit » and « Remove from the registry ». The lines to check come first, then the others by series and identifier; the family filter (and its subtype, as in the list) and the search are at the head. « Update the registry » first says what it would do (missions to add, lines without a readable file, duplicate identifiers, former identifiers), then « Write the registry » adds the repository missions, keeps one line per identifier and replaces a former identifier by the folder's; a line without a readable file stays (the file may not have arrived yet). An added mission takes its file's series, else the current series of its family (a number). In an identifier (« A-001A »), the final letter from A to Y is a flight linked to the mission without suffix, Z its organisation. « Edit » changes the title, series, number or operation of a line; « Remove from the registry » takes it out, the mission file stays in the repository. An unreadable registry is never rewritten; an absent one is created from the files.

<a id="missions-editor"></a>**The editor.** In the registry, « Create a mission » (at the head), « Edit » and « Duplicate » (on an unfolded line) open the editor: six steps (Frame, Teams, Places, Story, Risks, Timeline and maps), one at a time on a phone, the steps on the left, the form in the middle, the preview of the sheet and « To complete » on the right on a large screen. The Frame step (family and subtype, series, identifier, title, theatre, departure, arrival) and the Teams step (one row per team: callsign, type, service, role; « + Team » adds one, the cross removes it) and the Places step (one row per place: departure and arrival for their position, target, zones, turning points, rendezvous, with their position in degrees and minutes; « Edit » opens its fields, latitude and longitude in decimal degrees; « + Zone », « + Turning point », « + Rendezvous », « + Target »; a polygon keeps its points, still moved in the V2) and the Story step (the summary, with its count of signs: the sheet shows it whole up to 600; the description, one paragraph per blank line; the main objective; the secondary objectives, one per line; the load, its mass and its passengers) and the Risks step (one row « hazard → mitigation » per risk; « Edit » opens the hazard, the consequence and the mitigation; « + Risk » adds one; a removed risk leaves its translations too) are filled there; « Next » goes from one to the other, and what is typed is kept from step to step until « Save » or « Cancel ». The last one, Timeline and maps, gives the mission's events (one row per event: the time from the planned take-off, « H+30mn », a place of the mission or none, what happens; « + Event ») then the declared maps; « Propose maps from the places » adds the missing ones (general, target, rendezvous, zones), whose images are made in the V2 map studio. The organisation of an exercise (Z mission) stays in the V2. A commercial mission (family « E · CAT », a link flight) has a reduced Frame: departure, arrival, airline, load (passengers, cargo…) and aircraft; the title is proposed by itself (« LFPO → LFRS ») as long as you have not changed it; teams, risks, timeline and theatre are not asked. The family proposes the next identifier and the current series; only a missing family and an identifier without its form (« T-086 ») or already taken prevent saving, the rest is listed under « To complete ». « Save » writes the mission file and its registry line on the device: they go with the next send, and the editor says so (« changed on this device — not sent yet »). Only what you change is written, the rest of the file is kept as it is; « Save » without any change writes nothing. A file that uses YAML aliases (« &… », « *… ») does not open in the editor, and a registry that uses them is said unreadable and never rewritten: write the repeated object out in full at each place (or edit the mission in the V2); a changed identifier writes a new file, the former one is never deleted. A mission created without an airline is personal.

## Good to know

- The module writes a mission only through its editor (« Create a mission », « Edit », « Duplicate »); the rest of the mission is still written in the CPCO.
- A mission whose file does not come says so: "not found" (the repository has not got it), "not on this device yet" (the synchronisation brings it, the mission appears when it arrives) or "unreadable" (with the reason). Only the registry is shown then.
- A mission that came with the synchronisation without the registry naming it is listed all the same, read from its file, at the next display; no button to press.
- A flight being prepared is replaced only after a question; a started flight never is (cancel the start, or finish the flight, first).
- The envelope, the page-by-page reader and the assignments will come later.

<!-- fr: e786600425be -->

<!-- chapter: aircraft -->
# Aircraft

The company's fleet, as the other screens read it: the report (registration → type, callsigns), the map, the CPCO. The performance sheets are in the same screen ("Sheets" tab); the type registry will come.

## How to use it

<a id="aircraft-fleet"></a>**The fleet.** One row per aircraft: registration, type, callsigns, base, "out of service" when it is. The search is the sheets' search plus the fleet: the registration, a callsign, the base, and the type by its code, its name or its maker ("caravelle" finds the aircraft of type S210); under the aircraft, the types that answer are offered ("Caravelle — S210: add an aircraft of this type" opens a new aircraft, the type filled); seven rows are shown, "N more" unfolds the rest. "Add" opens an empty aircraft. The fleet is the one of the airline chosen in Settings › Airline; changing the airline changes the list, and an aircraft added goes into that airline's fleet. When neither aircraft nor type answers, "Create F-BHHH" opens a new aircraft with the typed registration, and "Search on rzjets.net" opens that site in a new tab at this registration (the suite never reads it: come back to enter the type). **The French register.** When the French aircraft register is deposited on this workstation (Data screen), a registration it knows is read under "No aircraft matches": "F-BHHH: CESSNA 172 S (French register, data of …)", the home aerodrome when the register carries it, and the proposed type — a suggestion from the register's label, to check; a type the type database does not recognise is said as it is, never guessed. "Create as registered" opens the filled sheet. In a new aircraft, "Search the French register" lists the registrations of a type (seven, then "n more"); choosing one fills the sheet. The register holds no person's name; nothing is saved before "Save". Without the register, a line says so, with the link to Data.

<a id="aircraft-edit"></a>**Editing an aircraft.** A tap on a row opens it: identity (registration, type, variant, owner or operator: an airline, a flying club, a private owner) and operation (callsigns separated by commas, base, tactical number, in service). Under the fields, a line says what will change ("2 fields changed: base, callsigns"); "Save" writes it. From two characters (upper case or not), the Type field suggests the types of the database and the matching sheets ("H145 · Airbus H145 · sheet H145"); a tap, or ↓ then Enter, writes the type code. A type the database does not know is kept as typed, and the screen says so. The registration is the key: two aircraft cannot share it. The location the site gives stays as it is. "Retire" asks, then the aircraft leaves the fleet; its performance sheet, if it has one, is kept.

<a id="aircraft-sheets"></a>**The sheets.** The "Sheets" tab lists the performance sheets by family (helicopters, turboprops, jets, pistons, others); the search filters on the name, the type or the registration. Each row says where the sheet comes from, what it lacks and its date; a fleet type without a sheet is offered "to complete". "Import a file" reads a CSV, a JSON, a .lnmperf or a SimBrief OFP; "Paste a text" reads a pasted text, a ChatGPT answer included; "New sheet" asks for the type code. Nothing is written at once: an import first shows, field by field, what would change; untick what you keep, then "Apply the selection". Several sheets at once: each preview names its sheet and its rank ("3 / 13"), a sheet that does not change is passed by itself, "Skip this sheet" goes to the next one without writing anything, and the end gives the summary; a note already written is replaced only if you tick it. The chosen tab is kept on the device, and the link `#aircraft?sheet=<id>` opens a sheet's editor directly.

<a id="aircraft-sheet-edit"></a>**Editing a sheet.** A tap on its name (or its line) opens the editor: the fields by group (identity, fuel, runway and alternate, climb, cruise, descent, RPM), the RPM / fuel flow table on a large screen, and the EUROCONTROL completion, "Complete from another sheet…" (a button that opens the search of the sheets, nothing chosen in advance) or "Complete with ChatGPT", which copies the request and opens ChatGPT in a new tab: paste the request there if it is not, then paste its answer under the button. "Fuel as volume" and "Fuel density" are explained under the field; a density outside 0.5 to 1.0 is refused. An RPM / fuel-flow table whose flow goes down while the RPM goes up is flagged (the row in orange, "a range misread?"); nothing is corrected without you. A dot "•" at the end of a filled field's label gives its origin and date ("lnmperf · 28/10", "edited · 30/10") on hover or a tap, with the discarded values; each card's title recalls its sources once ("Sources: V2 base · 28/10, edited · 30/10"). "Save" opens the preview of the changes, which are written only after "Apply the selection"; each changed field thus keeps its source, and the old value is kept. "Export .lnmperf" and "Export JSON" download the sheet; "Delete" asks before removing the sheet from the shared database. An altitude in the "ft" column makes a curve of its own: the rows of that altitude; if its flow goes down while the RPM goes up, a line says so with the altitude ("… at 8000 ft: a range misread?") and marks the row, correcting nothing. Under the table, "Propose from the measurements" reads one or more Fuel Phase Monitor journals (.csv, .csv.gz) chosen on the device (they are neither kept nor sent): the steady levels of the sheet's type are listed by altitude and RPM, with the deviation from the curve of the same altitude ("sheet 40, deviation -5 %") or "new row"; tick the ones to keep, "Add the ticked rows to the draft", then "Save" and "Apply" as for any change. With several altitudes, the table is one folding group per altitude ("8000 ft · 4 settings"); each row also has an optional TAS (kt), which Fuel reads when two rows frame the cruise RPM. On the workstation, "From the Output folder" lists the journals of X-Plane's Output folder (set once with "Set the Output folder"): tick them, "Read the ticked journals", and the levels are shown the same way. At the head of the table, "Curves" draws the fuel flow against the RPM, one colour per altitude with its legend; the measured levels are added as squares. The measured climb and descent each have a line there (RPM, fuel flow, rate, airspeed, throttle, and the sheet's current value): ticked, it fills the climb or the descent of the draft. The editor's top line stays visible: the sheet's name and its unit ("lb · lb/h"); a tap on the unit leads to its choice. The levels are put on significant levels (up to 5,000 ft by 1,000, then FL100, 150, 200 … 450: an FL181 counts as FL200); a level without measurement between two measured ones is computed, greyed and said "extrapolated". The measurements accepted stay on the device for a later computation, never published.

<a id="aircraft-fuel-volume"></a>**Fuel as volume.** Ticked: the quantities of this sheet (usable, taxi, reserve, flows) are volumes — litres or gallons, as the simulator shows them —, not masses; the density below converts them to kilograms.

<a id="aircraft-fuel-density"></a>**Density.** Kilograms per litre of the fuel: Jet A-1 about 0.80, Avgas about 0.72. It belongs to the fuel, not to the aircraft: leave it empty for the airline’s value (Settings), else the typical one. Between 0.5 and 1.0.

**Fuel units.** At the top of the editor, "Fuel read and typed in" offers kg, lb, l or US gal (and kg/h, lb/h, l/h, gal/h for the flows); each field and the RPM / fuel-flow table carry the unit chosen. A converted value is written with four significant digits at most, no decimal from three digits before the point, two decimals at most otherwise (12,407.6 lb/h reads 12410; 84.736 reads 84.74; 0.847 reads 0.85); a value you typed stays as you wrote it, and the sheet keeps its value as long as you do not touch the field. The sheet keeps its stored unit: a line says it with the density used; a typed value is converted when saved, an untouched value does not change.

## Good to know

- The Site module also updates the fleet from the pasted "Fleet" page of the site: both write the same file, each save reads the file just before and changes one aircraft only.
- Nothing leaves before the next synchronisation.

<!-- fr: c202cf6c2d68 -->

<!-- chapter: settings -->
# Settings

The settings of this device (⚙ at the top of the screen): your identity, what the app shows you, how data are
exchanged, and what the device keeps offline. They stay on the device, never synchronised.

## How to use

**The status.** The screen opens on the “Status” block, with the same dot as the ⚙ button of the header (green: something
new; amber: attention). One line per thing, touch it to act: the flight in progress (to the Map), the reports to write (to the
pre-filled report), the missing trigram (to “Identity”), the aeronautical database while it is not ready (to “Data
access”), the state of the data and the exchange in use (to “Synchronisation”, or the conflicts), the launcher, “Offline” and,
on a phone, the position during a flight.

**The groups.** At the Discovery level, the screen shows seven cards at most, one under the other: Identity, Data
access, Synchronisation (when it is used), Usages, Level, Design and About. The backup, the offline data, the weather
key, the Little Navmap sheets and the computer access come at the Everyday level. At the Everyday and Full levels the screen is ranged **by frequency of use**: always visible, the “Status” block, the display (usage level, design) and the device's airline; what is used now and then is folded, with its frequency on the right: Data (once a month), Synchronisation (when something is wrong), Device; Administration is a “›” row that opens its own page (with “← Settings” to come back); what is used only once is at the very bottom, folded, under “Getting started” (identity, access, create or join an airline); “About” closes the screen. Touch a folded title to open it. A group that needs attention (a warning,
an error, or the card an amber status line leads to) opens by itself, with an amber dot; a line of the “Status” block
opens the group of its card. A group opened by hand stays open while the page is open. The cards of circumstance (V2
settings found, configuration received, joining resume) come first, at every level, and go once dealt with. A card
opened by its address (the “Offline data” button of the “Join the airline” assistant, for instance) is shown alone,
whatever the level; “← Settings” goes back to the list.

**Your identity.** In “Identity”, type your trigram and your IVAO VID, VATSIM CID and SimBrief IDs, then “Save”. The
tools use them to prefill; with several users, the trigram is needed.

**The level.** “Level” chooses what the menu shows: Discovery, Everyday or Full, with one tap. Under each choice, the
“Menu:” line says which tools it shows; a hidden tool stays reachable by its address.

**The design.** “Design” shows one thumbnail per look — Standard, Cabinet, Rugged — and the tone: Automatic (as the
system), Day or Night. One tap applies it at once, on this device only. A design reserved for the computer does not
apply on a phone: the card says which one is shown instead, and its thumbnail is marked; touching a thumbnail replaces
that choice.

**The usages.** The sentence at the top of “Usages” says how data are exchanged. With no box ticked you are “Alone on
this device”: nothing goes elsewhere. Tick “Alone, on several devices” or “Several users (git data repository)” to
exchange. On a workstation served by the launcher, the app already reads and writes the launcher's `data/` folder, even
with no box ticked; an exchange usage also shares it through git.

**Data access.** On a phone or on the website, set in “Data access” the repository (account/repository), the branch and
your personal token, then “Test” and “Save”. On a workstation served by the launcher there is no token; while `data/` is
not a git repository, the card opens the door to fetch or take it over; its remote repository is set in the
“Administration” card (see “A git repository for data/”). On the launcher's computer, the “Data access” card starts with a “Data repository:” line giving the address and branch of the remote repository: the screen does not wait for it (the launcher may take several seconds to read it), the line shows “…” then its value, without moving; what depends on the repository (the “Remote repository” panel of Administration, for example) appears when it arrives.

**No access and no launcher, no bases.** A device with no access set and no launcher — the website opened on a phone
for the first time, for instance — has neither the aeronautical base (airspaces, airfields, beacons) nor the aircraft
base: “Offline data” says so. Two ways in: set the access to the data repository, even without ticking an exchange (it
then only reads the bases); or, on a workstation with the launcher, publish the bases to the repository (V2: Settings ›
Maintenance › Aeronautical data and Aircraft types), then synchronise. Three distinct states when the base is missing: “Aeronautical database loading…” (the read is not over: wait), “Data access not set on this device” (set the access above; an app added to the home screen has its own storage, nothing you set in Safari is there) and “Aeronautical database not published” (the access works, nothing is published in the repository).

**Synchronisation.** The “Synchronisation” card is the summary of what has not left yet: at the top, one count per kind (aircraft sheets, missions, flights, fleet; “Other” only when there is
something), then the last success, the network and the last error. A folded list per kind gives what is waiting: the readable title (for example “Sheet A320 Navy”, “Flight LFPO → LFBO of 3/11”), the date,
✕ for a deletion and, if there is one, the error that holds the queue; seven items visible at most, “… and n more” for the rest. With the workstation's launcher, “changed here” (not yet saved in the
data) and “to send” (saved, not yet sent) are added. “Send everything” sends and receives at once; otherwise synchronisation runs by itself at start, every 10 minutes online and when the network comes
back. The card appears as soon as an exchange is ticked or something is waiting. Below it, one line says what has just left (“Sent at 18:04: Aircraft sheets: 2 · Missions: 1”, with “of which 1 refused” if any); unfolded, it gives the files one by one by their readable title, the refusals first with the reason the transport gave, seven at most. It is the last synchronisation that sent something: a pass with nothing to send leaves it as it was, and nothing is said before the first send. On a workstation with a launcher, two lines say **how long the synchronisation took**: the last one and **the longest of today** (kept on this device), in seconds, step by step (settle, commit, receive, push…), with the number of git commands and what was sent (“8 s — commit 1 s · receive 2 s · push 4 s · 12 git commands (1 s) · 38 Ko sent”); a shorter pass does not replace the longest, another day clears it.

**The backup.** Alone on this device, “Export (one file)” keeps all your data in a file: it is the only copy. “Import
(merge)…” takes it back without losing anything here; “Replace from a file…” first erases what is on the device.

**Offline data.** Each published zone has its row: its state on this device, its cycle and its size. “Keep offline”
downloads it whole (preferably on Wi-Fi); “Free” gives the space back.

## The weather key

METAR works without a key. TAF, on a device without a launcher (phone, website), needs a personal and free avwx.rest
key: “Create a key on avwx.rest ↗” opens the provider's page. Paste it in “Weather key (TAF, avwx.rest)”, then “Save”;
“Test” asks for the TAF of an airfield, “Erase” removes it. The key stays on this device only (kept with your identity: it survives closing the browser), never in the repository
nor in a backup, and is never shown again. On a workstation served by the launcher it is not needed: the launcher
provides the TAF.

## Little Navmap sheets

On a workstation served by the launcher, the "Little Navmap sheets (.lnmperf)" card exports your performance sheets
to the .lnmperf files of a folder. The JSON sheet is the only source: choose the folder (Little Navmap's is offered
when found), "Save", then "Export the sheets" whenever you want; nothing happens in the background. A sheet without a
file gets one, a changed sheet rewrites its own; a file changed in Little Navmap, or coming from Little Navmap alone,
is never taken silently nor overwritten: the card lists it, and it is imported through Aircraft › "Import a file",
which shows the sheet before writing it. A file is never deleted: the file of a removed sheet goes to the `_removed`
subfolder. "Stop" cuts the link. Sheets missing a value that Little Navmap requires are listed and not written. On a
phone, Fuel downloads the sheet as a .lnmperf file.

## The airline's API keys

On a workstation served by the launcher, at the Full level, the “Airline API keys (IVAO, EAD Basic)” button of the “Administration”
card unfolds the setting of the IVAO API key: it stays in the launcher’s `secrets/` folder, never in the browser nor in
the data. “Test” checks that IVAO answers; “Erase” removes it.

Under the IVAO key, the “EAD Basic (EUROCONTROL)” block takes the user name and password of your EAD Basic account: you give them once to this computer’s launcher (`secrets/` folder), which keeps them; the page never shows them again, it only says whether they are saved and when. They are used by “Read an aerodrome from EAD” (one aerodrome per gesture). EAD Basic is a demonstration tool with non-operational data, to be used for simulation only (the warning stays displayed). “Erase” removes them from the launcher.

<a id="settings-ivao-app"></a>Under the EAD Basic block, a link leads to the “IVAO application (pilots’ sign-in)” assistant (the card of the same name, “Administration” group, or `#settings?card=ivaoapp`). It lets pilots sign in to IVAO through the airline’s relay or this workstation: it guides you through IVAO (`https://developers.ivao.aero/create`: Name = the airline’s name, App Type = Third Party, Active = Enabled), lists the return addresses to declare with “+ Add Redirect URL” (this workstation’s, and the relay’s when its public address is set; “Copy” gives them exactly as they must be pasted), then takes the Client ID and the Client Secret that IVAO shows. The launcher writes them to `secrets/ivao_oauth.json`: you edit no file, and the page never shows them again (it only says whether the application is saved, and when). “Test” reaches IVAO’s OpenID discovery document; “Erase” removes the application. The application’s API key (`secrets/ivao.json`) is another setting: a new application’s key is carried over into “IVAO key”.

## The tablet next to the simulator

You fly on the computer (X-Plane) and want the map on a tablet or a phone: on the computer served by the launcher,
“Computer access” opens the Pilot application to devices of the same local network (or start `lancer.cmd --lan`).

1. **Open to devices of the local network**: the card shows the address to open on the device, its QR code and a
   8-digit pairing code (6 until 30 October 2026). Windows may ask to allow Python: accept for private networks only.
2. On the tablet, scan the QR code with the camera (or type the address), then enter the code. It is asked only
   **once per device**.
3. The tablet then sees the computer's data, the simulator's position in the flight badge, and “Launcher on
   <computer>” at the top.

- **Trusted network only**: everything goes over http, unencrypted. At home, yes; on public or hotel wifi, never.
- Access closes with the launcher, or with “Close access”. A paired device stays paired; “Forget the devices” asks
  them all for a code again (a lost tablet, for instance).
- On the tablet, the application does not work offline and does not use its GPS: the browser grants them only over
  https. The position comes from the computer's simulator.
- A code works only once and lasts 10 minutes: “New code” gives another. 5 wrong codes from one device: a
  one-minute wait; 30 in an hour: pairing closes until the next “New code”. “Forget”, next to a device (with its pairing
  date, in UTC), removes that one only.
- Only the computer's main address is opened; the others (VPN, virtual machines) only through “Open them too”. An
  address that cannot open is named in the card; the launcher's window says why.

## A git repository for data/

**GitHub or GitLab?** It is not a setting: the provider is read from the remote repository’s address and shown at the top of “Administration › Remote repository of data/”; the “Data access” card leads there.

On a workstation served by the launcher, at the Full level, the “Remote repository of data/” button of the
“Administration” card shows the remote repository of `data/`: its address and its branch. To set or change it, type the address (`git@host:account/repo.git` or `https://…`, with no password or token
in it): “Check” says whether the repository answers, “Save” sets it. Towards another address than the configured one, a Yes / No window opens on the computer, not in the page: the card says so before the click; answer it (it may be behind other windows), then come back. Refused, closed or already open: the card gives the reason and `data/` stays as it is. This is on purpose: a malicious page must not be able to send your data elsewhere. Nothing blocks: a repository that does not answer is
only reported.

- **Access to the repository** is set on the computer: an SSH key for a `git@…` address, credentials stored in Git for
  an `https://…` address.
- **The provider** of a configuration is chosen (github or gitlab), never guessed; the panel only reads the remote repository's address (GitHub, gitlab.com, framagit.org, or a self-hosted GitLab that the device's configuration names with the same host; otherwise “Provider not recognised”). At the top of the panel, “Provider: GitLab · project group/project” (the project is a link to its page); for GitLab, the “Pilots’ tokens” link leads to the creation of the welcome tokens; for GitHub, the panel suggests entering the address of a GitLab project, because welcoming by project token needs one. The page only suggests: changing the repository goes, as always, through the launcher's Yes / No window. The exported configuration always carries the provider (github or gitlab; an unknown repository is refused, never exported as “other”), and the pilot's side opens on it. An old configuration without a provider is accepted only for github.com. Without a launcher, a GitLab configuration is applied on the device like a GitHub one.
- **Several users through git** need this remote repository: without it, the “Several users” box leads nowhere, and
  the “Usages” card says so.
- **data/ missing or without git**: the “Data access” card opens a door, at every level. `data/` is a folder ignored by the code repository; it
  becomes its own git repository, linked to the data repository (not a submodule). Type the address of the data
  repository, and if needed a username and a password or token (never kept by the page; “Remember” hands them to Git on
  this computer). Without `data/`, “Fetch the data” clones it; with a `data/` without git (example data or archive),
  “Take data/ into this repository” links it to the repository. The card follows the work and reads the state again at
  the end; a failure is explained, nothing is lost.
- **Rewritten repository history** (for instance to purge big files from it): this computer's synchronisation then
  refuses any merge and says so; nothing is lost. Here, « Take up the new history » first shows what will leave (your
  commits, the data files carried over), asks, keeps the old state in a local reference, carries your data files onto
  the new history, then synchronises. A file outside the synchronised data is never sent again.

## Configuring a pilot

**Preparing the configuration (administrator).** In the “Administration” card (“Full” level), “Add a pilot” prepares a pilot’s configuration (see “Add a pilot (administrator)” below). It gives **three forms of the same configuration**: the file sog-config-<TRI>.json, the link and its QR code; send whichever you like. The pilot scans the QR code with their phone’s camera: it opens the link, which leads to the assistant. They contain the airline, the data repository, the trigram and the token how-to, never a token or a secret; the repository’s owner (user or organisation) is noted there, it decides which token to create. For a GitHub repository, first invite the pilot’s GitHub name on the repository, with the Write right (the link leads to the repository’s collaborators page).

**Joining the airline (pilot).** The QR code (scanned with the phone’s camera: it opens the link), the link, “Join the airline…” (“Data access” card: the assistant without a configuration asks you to paste the link received, or to choose the file) and the welcome card of the first opening open the “Join the airline” assistant, one screen per step: the
configuration received; the account (create it if needed, with the sign-up link) and the username; the invitation to
accept; the token, step by step (classic for a user's repository, fine-grained for an organisation's); the token pasted
and tested; the network IDs; and last “Finish and synchronise”, then the offline data. Ticked boxes stay on the device:
a settings card offers to resume where you left off. The “Join the airline” tutorial follows the same steps.

**Joining for a GitLab project (pilot).** When the configuration you received is a GitLab project, you create nothing: no account, no invitation, no token. The assistant has only three screens: the configuration read (airline, project), then “Paste the token” — paste the token the administrator sent you apart (never in the link); your trigram is read from the configuration, you do not type it — then “Finish and synchronise”. Your VID, CID and SimBrief identifiers are filled in later in Settings › Identity. Before accepting the token, the app asks GitLab what kind of token it is. A personal token (it works for all your projects) gives a question: prefer the project token asked from the administrator; if you answer “No”, nothing is saved. A token without an expiry date (or more than a year away), or with more rights than needed, is flagged with a warning line, without blocking you. The “Data access” card says the same of a personal token, without a question: alone with your own repository, a personal token is the right one.

**Nothing more than the file.** Only what the configuration holds is set, and the access is saved only once the token is
tested; “Test” says what is wrong: invitation not accepted yet, token copied wrongly or expired, token without the right
on the contents. A classic token opens all the repositories of the account: for a user's repository, a GitHub account
dedicated to flying is advised. A file in another format is refused with a message. The airline is written to the
repository only if it has none yet. On a workstation whose data/ already follows this repository, the assistant skips
the account and the token. Without a launcher, the app reaches a GitHub repository or a project on a GitLab instance
(gitlab.com): paste the project's address (https://gitlab.com/group/project) and the project access token the
administrator gave you; the token is sent to that instance only. When the received configuration or the device's access is a GitLab project, the “Data access” card expects the project's address and describes the project token (Developer role, `write_repository`).

## Administration

**The administration pages.** At the “Full” level (“Level” card), the “Administration” card, below “About”, gathers the
administration and test pages, **one button per page**, each with a sentence; at the other levels it does not appear, and
nothing of the administrator's is on the other cards. In the app: the “Map threshold tuning” button (`#maps?tune=1`, read only on a phone; it opens the tuning page: for each map element and each mode, the zooms where it appears, saved for the airline, `airline/map_profiles.json`; a mode you never saved takes the thresholds of a tuned mode, and the page says so; the map's “Complexity” slider only shifts the zoom), back by the back arrow; the “Flight zone limit” button, which unfolds a box
“Show the edge line of the flight zone limit” (saved at once for the airline, with the thresholds, in `airline/map_profiles.json`,
key `edge`; the edge line is shown until you set it); the “Runway thresholds on the map” button, which unfolds a list from 8 to 16: the zoom from which the map draws the runway thresholds (saved at once for the airline, same file, key `runwayZoom`; 11 until you set it); the “Add a pilot” button (see below);
on a workstation served by the launcher, the “Remote repository of data/” and “Airline API keys (IVAO, EAD Basic)” buttons, which
unfold their setting (see “A git repository for data/” and “The airline's API keys”); the roadmap (`#roadmap`, which opens on “Priorities”: columns Delivered, In test, one per open milestone, Backlog, where cards are dragged (to the head of the column where they are dropped; “To the top”, “Up”, “Down” on the card); “By theme” shows them by lane); the acceptance list (`#recette`): one functional test per delivered card, with “Passed”, “Failed” and a comment (required for a failure), written by the launcher in `organisation/RECETTE.json`; a defect already known says “in progress, do not retest”; a second tab “To decide (n)” puts the points to decide as multiple-choice with a free field (answers written by the launcher in `organisation/DECISIONS_REPONSES.json`); and the diagnostics of the “About” card.

**The administrator’s assistant.** The “Administrator’s assistant” button (“Administration” card, or the address `#settings?card=assistant`) takes the administrator by the hand: six steps, in order, each with its state read from the installation (done, to do, optional, unknown), a sentence and a button to the card that sets the step. The first step to do has the coloured button. The data repository (a remote repository for data/ and, for GitLab, your administrator token on this workstation), the airline (its name, in the Website module; your trigram is in Settings › Identity), the aeronautical base (at least one published zone), the first pilot (“Add a pilot”), then, optional, the devices and the keys (IVAO, EAD). The state of the installation, as the frame gives it, is at the bottom. The assistant writes nothing: each button opens the card that already exists.

**Add a pilot (administrator).** At the “Full” level, the “Add a pilot” button of the “Administration” card (where the export is possible) prepares everything for a pilot who has nothing yet. Type their trigram, their name if you want to greet them, the language of the message and the published app’s address, then “Prepare”: you get the file, the link and the QR code (three forms of the same configuration), your steps, and a message ready to copy, in the chosen language. For a GitLab repository, your steps are: create the pilot’s project token (one per pilot, name = their trigram, role Developer, scope `api`, expiry date 90 days advised and 365 at most, never without a date), copy it at once (GitLab shows it only once), check that the data branch lets Developers push, and know how to revoke (Settings › Access tokens › Revoke). With the launcher, “Create their token” opens the “Pilots’ tokens” screen with the trigram already typed: the launcher creates the token with the administrator’s; the steps by hand stay folded below. Without a launcher, they are open. **Send the token apart from the message** (another channel, or paste it in front of the pilot): it is never in the link or in the message. For a GitHub repository, the steps are the export’s.

<a id="settings-sources"></a>**Data sources.** The “Data sources” button (`#sources`, Full level) lists the sources of aeronautical data the suite uses, considers or has set aside: for each, what it gives, its licence, its status and a link that opens in a new tab; for those that change with each AIRAC cycle (SIA, VAC, eAIP, CIFP), the link is the one of the cycle in force, written at the top of the screen. The screen downloads nothing. Under the button of the Administration card, the absolute address of the screen, to open or bookmark (“Copy the link”). It replaces the data laboratory, removed on 28 October 2026.

**The benches, on a workstation.** Served by the launcher, they only open on a workstation with a launcher (elsewhere
they are named without a link); paths relative to the root of the suite: `frame/aerodb/bench.html` and `frame/aerodb/offline_bench.html` (aeronautical base, online and offline),
`frame/store/test/` (data layer, against the fake GitHub) and `modules/maps/test/render.html` (map rendering).

**The V2 pages.** No button in this card any more: every page of the old version (Settings › Maintenance, First launch, map studio…) is kept in the “Old pages (V2)” screen (`#legacy`), the last entry of each application's navigation column.

## Good to know

- **IVAO account**: the « IVAO account » card links this device to your IVAO account through the airline's relay (or
  the workstation's launcher): « Sign in to IVAO » opens IVAO's page, then comes back here. The relay keeps the airline
  application's secret; your token stays on this device, renewed by itself, never in a backup. « Unlink » erases it and asks IVAO
  to withdraw the access; if IVAO cannot, the suite tells you to withdraw it in your IVAO account. Without an IVAO
  application set, the button is off and the card says where it is missing: on this workstation, Administration › « IVAO
  application » sets it (it gives the return address to declare at IVAO); on the relay, the administrator sets it.
- **Devices**: one screen, Maintenance › « Devices », for every pilot's device, whether it comes from the local network
  or the airline's relay (when the launcher runs as the relay, behind the NAS's reverse proxy, in https). A pilot pairs
  each device once with an 8-digit code the administrator asks for there for their trigram (once, 10 minutes, on either
  channel); their writes are signed with that trigram. Each row says the device's channel; a device paired with the
  console's code says « console code », and « Name » sets a trigram on it. A lost device, or all those of a pilot who
  leaves, are revoked there.
- **Update the suite** (Administration, with the launcher): choose a channel — stable, pre-releases, or development
  follow-up —, “Check” says what would change without touching anything, then “Update” (after a question). Never a step back;
  refused if files of the suite were changed on this computer, and while a job of the Data module or a synchronisation runs
  (try again once it is over). The data are not touched. The version taken is the one the suite’s repository announces: its
  tags are not signed, the trust is the same as an update made by hand with git. It is the one “Check” showed: if the
  channel changed meanwhile, nothing is written and the panel asks to check again.
  Then close the launcher’s window and run
  lancer.cmd again.
- **Folders of this computer** (Administration, with the launcher): where the suite, the data, the downloads, Little
  Navmap's databases and sheets are on this computer, the path read only and where it comes from; “Open” shows the folder
  in the file explorer. A path is changed where it says, never here; X-Plane is unknown to the launcher.
- **Pilots' tokens (GitLab)**: in the Maintenance application, on the launcher's computer, « Pilots' tokens » creates
  one project access token per pilot (named after the trigram, Developer role, one year at most) and revokes it. After
  « Create the token », the screen shows only that token, at the top: copy it at once (it will not be shown again), with
  what to tell the pilot and the link to their message (« Add a pilot »); the « Existing tokens » list is folded below,
  the new one there « created just now ». The launcher uses the administrator's token there, which it never shows: a personal access token of your
  GitLab account (Preferences › Access tokens), scope api, with an expiry (one year at most), this account being
  Maintainer or Owner of the project. Paste it in « Administrator's token », under the list; « Test the administrator's
  token » says the account, its role, its scopes and its expiry; the block's title says whether a token is set (its date, the
  instance, the project, the time of the last test), never its value. A refusal of GitLab is said by its cause: token refused
  (missing, expired or without api), account that is not Maintainer, project not found. The data branch must be protected,
  open to the Developer role and without force push (on gitlab.com the default branch is reserved to Maintainers): the screen checks it, and « Open the
  branch to Developers » does it after a question, asked too before the first token. A pilot whose token is refused
  writing reads « the project's branch main is not open to Developers ».
- **Token expiry (GitLab)**: the « Existing tokens » list says, for each token, « expires on … · in 12 days » (amber under 30 days, red under 7, « expired on … » once the date is past); the date is read from GitLab each time the screen opens, nothing of it is kept. On the launcher's computer, the « Status » block of Settings says « 2 pilot tokens expire soon (nearest: …) »: the number and the nearest date, read at most once a day, never a name. For its own token, the device keeps only the expiry date GitLab gives (never the token), reads it again at most once a day, says it in the « Status » block and, under 30 days, once a day in a notification. A refused token is said « expired on … » only when that known date is past: GitLab answers an expired, a revoked and an unknown token the same way. With GitHub, no date is read (the browser cannot read the header that carries it).
- **The token**: on github.com, a fine-grained token, on the data repository only, “Contents” read and write, 90 days
  at most; on GitLab, a project access token (one per pilot, named after the trigram), created by the administrator. It
  is never shown again; never paste it in a message.
- **Your settings stay after the browser is closed**: the identity, the token and the weather key are kept in the same place
  on the device, never synchronised nor in a backup. If Safari made you lose them anyway (it clears the storage of a site
  that is little used), add the app to the Home Screen: it is better kept there. The diagnostics (“Copy”) say whether the
  browser promised not to clear (`storage.persisted`).
- **Cut access**: erases the token from this device; your pending writes stay and will leave once access is set again.
  Lost or stolen phone: also delete the token at the host (github.com, gitlab.com…).
- **V2 settings**: if this browser was already used for V2, the “V2 settings found” card offers once to take over your
  identity and your access.
- **About**: links to this help and to the roadmap (what is delivered, in progress, planned), then the
  diagnostics, folded: transport, last sync, errors, repository tree, reference bases and aeronautical base, line by
  line; “Copy” puts it all on the clipboard, to paste in your message to report a problem. The token is
  never in it.

<!-- fr: c75cd2a9eb9f -->

**The airline.** At the “Full” level (or through #settings?card=company), the “Airline” card lists the airlines of data/airline/index.json and “Personal”: the name, the code, the networks (IVAO, VATSIM, off-line) and the number of aircraft in the fleet. The card is titled “This device’s airline”: a list of radio buttons, one line per airline (the name, the code, the kind said in words — “Commercial”, “SO squadron” or “Personal” —, the networks and the fleet). Touching a line makes it the current airline of this device (the choice is per device): only the radio buttons change, the list is not redrawn. While the frame cannot yet save this choice, the buttons are grey and the card says so. Under the list, the sheet of the chosen airline (the others have none), open: the **kind** (two radio buttons, a sentence each) then the **mission families** (one box per family: the acronym and the name), ticked from the kind while nothing has been ticked; ticking or unticking writes themes.json, at least one family stays ticked. **Add a family** (an acronym of 2 to 8 letters or digits, a name of 1 to 40 characters; eight at most; a free **letter** is proposed to number the family's reports, refused with its reasons when a family of the table, M, D, X or another added family already has it; a family added before the letters gets a free letter proposed, written only when you set it) and **Add a series** (a family of the list, a name; twenty per family): the name typed in the language of the screen is copied into the four languages; the family or series is removed with “Remove”. Three gestures follow, in this order: “Create an airline” opens an **assistant on the same screen**: the **Identity** step (the name; the code, proposed from the name and editable, 2 to 8 lower-case letters or digits, never one already taken; the **kind**, Commercial or SO squadron, Commercial preselected; the networks), then the **Flight families** step (the kind's own, ticked in advance: untick what you do not fly; nothing is written for the families if you do not touch them), then the **Fleet** step (“Fleet · 2 aircraft”: search a type in the sheets base, type the registration, “Add the aircraft”; “Remove”; “Later” if you prefer to add the aircraft from Aircraft), then the **Summary** in words (“Rennes Motoculture · Commercial · IVAO · 1 family · 2 aircraft”). “Back” keeps everything typed. **Nothing is written before “Create the airline”**: then the settings, the (empty) fleet and, last, the entry in the list (an airline is listed only when complete); an existing file is never overwritten. If the creation is interrupted, the message says what is done and “Resume” finishes without overwriting anything. At the end, “Fly for this airline” chooses it and opens Missions. If the code typed already has its folder but the airline is missing from the list, the assistant says so and offers **“Take this airline back”**: it goes back into the list, nothing else is written. Twenty airlines at most; everything read from data/airline/ is treated as untrusted text. “Join an airline” opens another assistant: paste the “Fleet” page of the airline’s website (or “Read the clipboard”), then “Read the page”; the screen shows **what was read** (“4 aircraft · 3 operators”), the name and code proposed, the kind (“SO squadron” by default), the networks and the address of the site (optional, https) **before anything is written**; “Join” then writes the settings, the fleet read and, last, the entry in the list. The “what was read” step also says **how many missions of the registry are already at this code** (“Registry: 2 missions already at this code”), and follows the code you type. An airline already in the list is not joined again: its fleet is refreshed by the paste of the airline website screen. On the launcher's computer, while your airline is still at the root of data/airline/, the card offers to **migrate** it: an optional code (proposed from the name), “See what would be done” (the name, the folder data/airline/<code>/, the files and their size, the fleet that will be empty there), then “Migrate to “<code>””. Nothing is deleted or overwritten: the current files stay in place as a copy. In the sheet: with no kind every family is ticked in advance and the sheet asks you to choose the kind; a commercial airline has the Commercial family (cargo, passengers, empty leg, VIP, training, transit, test flights), a squadron the sixteen military families. “Personal” (every family) has nothing to set.
