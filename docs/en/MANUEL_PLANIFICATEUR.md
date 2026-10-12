# Planner manual

This manual describes the **Centre** pages that prepare and follow the missions: mission generator, map
studio, mission registry, ODV planning and board; one chapter per page, one section per tab or block.
In the suite, the **“Help”** entry of the side bar opens this manual at the chapter of the current page. The pilot
pages are described in the [pilot manual](MANUEL_UTILISATEUR.md); Centre access, settings and data in the
[administrator manual](MANUEL_ADMINISTRATEUR.md).

## Mission generator
<!-- page: apps/cpco/mission_editor.html -->

The generator prepares a mission file: identification, brief texts, exercise, estimated duration, airspaces to activate, then the PDFs to hand to the crews. It is also used to order a mission from ChatGPT and to receive its answer.
Access: sidebar “Missions”, “Generator” tab (Design level, 3), or ☰ › “Mission generator (SIA)”. From the registry, “Generate a mission” opens the empty generator and “Open in generator” loads the chosen mission.
See also [generator prompt](../technique/PROMPT_GENERATEUR_MISSIONS.md).
Depending on the usage level: the page is offered from the Design level (3). At that level, it shows seven blocks: Mission, Identification, Estimated duration, Airspaces to activate, Mission texts, Maps of the final file and Documents (plus Operation and Exercise when the mission belongs to one). Drafts, “All YAML data” and the route calculation settings are at the Expert level (4).

### Tutorial: preparing a mission from start to finish

From the order form to the PDF brief, in nine steps. Names in quotes are button labels.
1. **Open the generator**: sidebar “Missions”, “Generator” tab (Design level), or “Generate a mission” in the registry.
2. **Set the order**: “Order from ChatGPT…” unfolds the form. Choose “Type”, “Subtype”, “Theatre”, “Flying teams”, “Ground teams” and “Duration”; in “More options”, “Rendezvous”, “Air refuelling”, “Coordinated exercise” and, if needed, the aircraft of each team (empty = a fleet aircraft).
3. **Create the mission**, either way. With ChatGPT: “Order: copy prompt and open ChatGPT”, paste the prompt into ChatGPT and send it, then load the answer (`mission<ID>.yaml` and `summary<ID>.md`) in “YAML and/or Markdown”, or “or paste its content…” then “Read the mission”. Without ChatGPT: “Create the skeleton here” creates the mission(s) at once, without narrative.
4. **Complete**: “Identification” (title), “Mission texts” (“Summary”, “Detailed description”, then “Add a text section”: main objective, risks, rendezvous…). Fields outlined with dots are still empty; the “Skeleton: …” line counts the points to place and the texts to write. Points without coordinates (departure, target, turning points, rendezvous, area) are placed in the studio, step 6; at the Expert level, the “All YAML data” block also lets you type `lat` and `lon` in decimal degrees. An operation with several teams is browsed with ◀ ▶ at the top of the page.
5. **Check**: “Estimated duration” (probable route, outbound, time on area, return) and “Areas to activate” (activation requests to make).
6. **Produce the maps**: “Open in the studio” (or the “Map studio” tab), the mission follows. If points without coordinates remain, the “Points to place (n)” panel of the Route block lists them: “Click the map” then a click on the control map, or an airfield, a beacon, a point searched by code or name; a placed point moves by dragging it, an area takes a radius in km. In “Maps to produce”, one line per expected map: choose the profile, frame it in the control map and “Keep this framing”, then “Generate the maps and the ZIP” (“Generate the n missions” for an operation). The PNGs are stored in `cartes/` of the mission folder.
7. **Save**: “Save to the folder” in the studio (map settings), then in the generator; the mission is recorded in the registry (“File in the missions folder…” if the page asks).
8. **Hand out the documents**: in the generator, “Maps of the final package” must say “ready for the PDF” for each map; “Documents” › “Crew brief (PDF)”, or “All exercise documents” for an operation.
9. **Next**: in the registry, “Assign…” gives the mission to pilots; “Duplicate” starts again from an existing mission (next identifier, title “(copie)”).

### “Mission generator” and “Map studio” tabs

The two pages share a tab at the top and work on **the same mission**.
- Switch from one tab to the other: the current mission goes with you, changes included.
- Every change is saved in this browser and read at once by the other open page (extents, maps added or deleted in the studio, for example). The generator then shows “Mission updated by the map studio”.

The header also offers:
- “Create the report →”: opens a new report of the family matching the mission type, pre-filled with the mission;
- when an operation has several missions: ◀ and ▶ (“Previous mission”, “Next mission”) and a list to switch to another mission of the batch;
- after opening from the registry: “← Registry (M-016)” to go back.

### Mission

This block shows the loaded mission and groups saving and import.

| Button | Effect |
|---|---|
| “New mission” | Clears the form (today's date) |
| “Order from ChatGPT…” | Expands the order form (see below) |
| “Save to the folder” | Writes the modified YAML to `data/missions/<lettre>_<FAMILLE>/<ID>/`; the old version is replaced, the history is kept in the YAML |
| “Duplicate” | Copy of the loaded mission, ready to edit: next free identifier and series of the same family (team letter kept), references to the old identifier followed (expected maps, narrative), title “… (copie)”, `meta.duplicated_from`; operation reduced to the copy; maps and renders to redo in the studio. The copy opens here; “Save to the folder” to keep it |
| “Save draft” / “Reload draft” (Expert level) | Keeps or reloads the mission text in this browser (images must be selected again) |

The “Import another mission: files, pasted text, ChatGPT order” pane is open when no mission is loaded:
- “YAML and/or Markdown”: select `mission<ID>.yaml` and `summary<ID>.md` together, or click “or paste its content…” then “Read the mission”;
- “Maps or ZIP delivered by the generator”: choose the studio ZIP directly; the PNGs and the overview map are matched automatically;
- “Order a mission from ChatGPT”: same form as the registry (type, subtype, theatre, series, teams, aircraft…). “Order: copy prompt and open ChatGPT” copies the prompt, opens ChatGPT in a new tab and records the order in the registry (“ordered”). At the Design level, this section only appears when the “Order from ChatGPT…” button opens it; at the Expert level, it is also shown, collapsed, in the pane. **“Create the skeleton here”** (generator only, next to the order button) does the same without ChatGPT: with the same settings, it creates the complete mission(s) without any narrative — one per flying team (aircraft and callsign chosen, or taken from the fleet: aircraft of the prompt categories suited to the family; refuelling: one tanker then receivers; nothing suitable: aircraft to complete), departure and arrival airfield at the aircraft’s base, target, turning points, one rendezvous per team if “Rendezvous” is “with”, working area, planned refuelling with an AAR track (ARIP, ARCP) if “yes”, timing from the duration, expected maps with their description, empty main objective, risks, introduction and timeline; with “Coordinated exercise: yes”, the …Z organisation mission (H hour, participants, events H, H+15 min…). The missions open as a batch; the line “Skeleton: n point(s) to place, m text(s) to write — then the studio for the maps” counts what remains, each empty field is outlined until it is filled, and “Open in the studio” goes to the map studio to place the points and generate the maps.

A received mission is recorded in the registry and filed in its folder if the missions folder is authorised; otherwise, click “File in the missions folder…”. Link “Open the registry ↗”.
The received text is kept in `recu/`; received again, a mission replaces the previous one only if its data change: the old one goes to `versions/`, and the studio settings of maps with the same name are kept. Pasting accepts ChatGPT's whole answer (several missions: a batch); the side files of a series (VALIDATION.txt, manifest) are set aside and reported.

### Operation

Block shown only when the mission belongs to an operation (`operation` in the YAML).
- Each mission of the operation is a button: identifier, callsign or “Organisation”, take-off time. Click to show it. “not loaded” or “to create” flags a mission missing from the batch.
- “Create the exercise organisation” creates the …Z mission (general brief, H-hour, participants, exercise targets, timeline), taking over the tracks and injects of old-format missions.
- Single mission: a discreet line offers “Add an exercise organisation…”.
- “Create the missions of the played targets (n)”: each played exercise target becomes a mission of the operation (base of the first crew, route of the track, computed take-off). Then check aircraft, base and time, open each one in the studio, then “Save to the folder”.

### Identification

| Field | Content |
|---|---|
| “Title” | Mission title |
| “Family” | Mission family (list from the mission order) |
| “Subtype” | Suggestions depending on the family, free entry possible |
| “Identifier” | Family letter, hyphen, 3-digit number, then team letter (A, B…) or Z for the organisation: M-016, S-002A, I-001Z |
| “Generation series” | Generation batch within the family (one ChatGPT order = one series) |
| “Author”, “Document date” | Signature of the file |

The next free identifier and the next series appear in grey in empty fields: they are hints, not values. A warning appears if the identifier does not start with the family letter.
Changing the identifier of a mission cited by others (operation, maps, texts) opens a confirmation: accept to migrate the whole batch (the old identifier is kept in `mission.former_id`), decline to keep the old one.

### Estimated duration

Flight estimate based on the probable route and the aircraft; recomputed on every change. Hidden for an organisation mission.
- “Transit”: “automatic (by aircraft and level)”, “airways (IFR)”, “RTBA (low level)” or “direct”. The choice is written into the mission.
- “Route calculation settings (common to all missions)” (Expert level): same fields as Settings › Centre, with “Default values”.
- Display: “Estimated flight”, “Block”, outbound / on station / return, distance; return options and successive briefs where relevant.
- **Proven times** (reports of missions with the same departure and the same points) replace the calculation when they exist.
- A table compares the estimate with the reports already filed for the mission (actual flight, difference).
- “Show the probable route” box: sketch and table of the legs.

Limit: without an SIA base in the browser, routes stay direct; a warning asks you to re-read the SIA folder.

### Airspaces to activate

List of the R, D, TRA zones and of the RTBA crossed by the probable route and the work areas, with manager, limits, activation mode and crossing point. P zones are flagged “to avoid”.
- Organisation mission: airspaces of all the crews' missions (requests made by the organisation).
- Mission of a coordinated exercise: list for information only.
- Single mission: requests to be made by the crew; the list is included in the PDF brief.

Limit: indicative calculation, which replaces neither the AZBA charts nor the NOTAMs. Without an SIA base, the block says where to read it (studio, “SIA database” block, or Settings › Maintenance › Aeronautical data).

### Exercise

Block shown for an exercise mission.

On the organisation mission (…Z), full editor:
- “H-hour and participants”: “H-hour (label or real time)”, then one row per participant (“Callsign”, “Mission”, “Take-off (H-20mn, H+1h)”, “Role”); “+ Participant”, “Take the operation’s missions”.
- “Exercise targets”: tracks to identify, intercept or escort (name, “Played”, callsign, departure, nature, points, level, speed, what the crews must establish, instructions); “+ Target”, “Import a Markdown table of tracks”.
- “Timeline”: one event per card (“Trigger”: time or passing a point; “Form”: radio message or sealed envelope; “Sender”, “Title”, “Recipients”, “Tracks revealed”, text); “+ Radio message”, “+ Sealed envelope”, “Remove this event”.
- “What each one receives”: summary per recipient.

On a crew mission, the block is titled “Exercise: what this crew receives” and is read-only. The “Exercise maps” line shows the maps loaded or to be generated in the studio.

### Mission texts

“Summary”, “Detailed description”, then the sections: “Add a text section” offers the types the brief and the report know how to place (Introduction, Main objective, Secondary objectives, Teams involved, Turning points, Rendezvous, Air refuelling, Risks to consider, Load / personnel, Coordination, Timeline, Planned maps, Notes), each with a line saying where it appears and what to write in it, then “Free text”. Each section carries its type, chosen from a list and changeable afterwards (the content follows); a type is used only once (already taken: greyed out), except “Free text”, which has a title to type, can be added as many times as you want and goes at the end of the brief. Objectives, risks and notes are written into the YAML under their key (`objectives.primary`, `objectives.secondary`, `risks`, `notes`; one value per line for lists); the others complete the section of the same name in the brief. The stored brief (`summary<ID>.md`) is a rendering of the YAML: read again with the YAML, it only gives back these sections (marked in the file by an invisible comment), never the sections it takes from the YAML; a `.md` file alone remains a complete source, from which the YAML is built. Each section has “Content” and “Delete”.
If the received file has neither summary nor description, they are proposed from the data: proofread them.
On an organisation mission, the block becomes “General brief”: situation, common objectives, time windows, end criteria, handed to everyone.

### All YAML data

Expert level block, hidden by default: click “Show” in its header.
- Editor without an enforced schema: every YAML key can be edited, unknown fields are kept.
- Lists: “Add an item”, × to remove an item.
- “Name of a new root field” then “Add” creates a top-level key.

Keep it for corrections the other blocks do not allow.

### Maps of the final file

List of the maps attached to the PDF, in file order: those declared in the YAML, the overview map first, the vertical profile last.
Each map shows its state: “ready for the PDF” (size in pixels) or “image not loaded”.
To load the images, use the studio ZIP in the Mission block. A mission opened from the registry reads the maps filed in its folder directly.

### Documents

| Group | Buttons |
|---|---|
| “This mission” (or “Exercise organisation”) | “Crew brief (PDF)” or “Organisation file (PDF)”, “Organisation file (PDF)” from a crew mission, “Sheets of the played exercise targets (one PDF each)” |
| “Whole operation” (batch of several missions) | “All exercise documents (one PDF per recipient)”, “Export all PDFs”, “Operation file (one PDF)” |
| “Data” | “Export YAML”, “Export Markdown” |

The crew brief contains its sealed envelopes and the maps; the status line lists the maps not attached. Load the maps before exporting.
Each sealed envelope takes a page after the maps, followed by its exercise map; the map of a radio message has its own page “to hand over when the message is received”.

## Map studio
<!-- page: apps/cpco/map_parser.html -->

The studio produces the maps of the mission file from the SIA data (AIRAC cycle): route, vertical section, maps in PNG or SVG, ZIP and overview map.
Access: sidebar “Missions”, “Map studio” tab (Expert level, 4), ☰ › “Map studio (SIA)”, or “Open in map studio” in the registry.
It works on the mission shared with the generator. Technical details: [missions and maps](../technique/FRAMEWORK.md).

### Mission

- Status line of the loaded mission and “Save to the folder” button: writes the mission and the studio settings (profile and framing of each map, traces, tracks) to `mission<ID>.yaml`. The result is shown next to the button and as a notification.
- “SIA base” line: AIRAC cycle, number of airspaces and of MORA cells, link to Settings › Maintenance › Aeronautical data.
- “Open another mission: Markdown / YAML file or pasted text” (collapsed when a mission is loaded): choose a file, or “or paste its content…” then “Read the mission”.

The mission opened here becomes the mission shared with the generator. For an exercise mission, the missing exercise maps are added automatically: save the mission to keep them.

### Route

Flight plan, control map and vertical section are linked: hover a point in one, it lights up in the other two.
- Route field: item 15 of the ICAO flight plan or comma-separated list; empty = the mission route. “Syntax and use” details the formats.
- “Level”: cruise level (FL65 or 6500).
- List “Airways” / “RTBA (low level)” then “Search”: searches for a route between the points and replaces the text.
- “SimBrief”: takes the latest OFP (SimBrief identifier: Settings › My profile › Identity and networks); “↺ Probable route”: takes the probable route, return to base included.
- “Draw” (vertical section), “Fuel” (opens the planner with this route), “Copy ICAO” (strict flight plan).
- “Mission points”: click a point to add it to the route.

Control map: “Map” and “Profile” lists, “ZIP” box, “Refresh”, “Keep this framing” (the generated map will use the displayed frame), “Recentre”, “Automatic framing”, “⧉ Window” (separate synchronised window), “⤢ Enlarge” (Esc to go back). On the map: drag a point, click the route to insert, right-click to delete.
“Profile settings: section, aircraft, climb rate, outputs”: floor and ceiling of the section, aircraft, climb and descent, `profil_vertical.png` image in the outputs, default trace of the route.

### Points to place

A mission without coordinates (generator skeleton) shows in the Route block the “Points to place (n)” panel: departure, target, turning points, rendezvous, area centres and airfields without position, in route order.
- “Click the map”: the line is selected, the cursor becomes a cross; a click on the control map places the point (Esc cancels).
- Search field: airfield, beacon, designated point, VFR point or AAR track (“LFLY”, “OLIVIA ARIP”) of the SIA base, by code or name, or coordinates “45.72, 4.94”.
- A placed point moves by dragging it on the map; an area takes a radius in km. Identical departure and arrival are placed together.
- The coordinates go into the shared mission: the generator sees its “points to place” count go down. Everything placed: “Generate the maps and the ZIP”.

### Maps to produce

“Mission maps”: one row per map.
- Click on the name: shows the map in the control map (✎ = framing changed).
- Display profile, or “Disabled” (map neither generated, nor previewed, nor on the overview).
- Trace: “No trace”, “Brief: route”, “Organisation: probable route”, “Route + probable route”.
- Exercise recipient (if the exercise has tracks): no tracks, organisation, one exercise target, or a crew after a given message or envelope.
- “ZIP” box (unticked: map not generated; choice not saved in the mission) and × to delete.

Adding: name, type (“general”, “target”, “detail”, “zone”) then “+ Map” (extent = displayed view); “+ Exercise maps” adds the maps of the organisation, of the played exercise targets or of the crew.
“Settings of profile …” (collapsed): “Profile name”, “Base map”, “Save”, “New”, “Duplicate”, “Delete”, then four tabs: “Base map”, “Airspaces”, “ICAO symbols”, “Elements”. The profile edited is always that of the chosen map; profiles are common to all missions and kept in this browser. The suggestion lists of the input fields (zones, aerodromes, waypoints: up to 13,000 entries from the SIA database) are filled only when you click in the field concerned, not when the page opens.

### Previews and generation

- “Show all maps”: previews of all the maps; they create no file.
- “Generate the maps and the ZIP” (also in the footer): produces each map ticked “ZIP”, the overview map and, if the option is ticked, the vertical profile, then downloads the ZIP.
- The PNGs are filed in `cartes/` of the mission folder (visible in the registry). Otherwise, use “File the maps in the folder” in the footer.
- A failed map does not stop the others: the ZIP contains `rapport_generation.txt` and “Retry alone” relaunches the map. “partial base map” flags a slow base map.
- Base map in error: the control map explains the cause, switches to standard OSM and offers “Copy the error report” (technical detail to pass on).
- Batch of several missions: “Generate the n missions” produces a single ZIP, one folder per mission, with the operation map.
- “Stop” (progress bar, previews as well as generation): the map in progress is completed, the next ones are not made. A stopped generation downloads no ZIP and files nothing in the mission folder; a stopped batch says how many missions are finished (their maps are already filed in their folder); the previews already shown stay.

Output type (PNG, editable SVG) and PNG width: ☰ menu › “Map outputs”. The overview map is always included; it is shown at the bottom of the block.

### SIA database

Block hidden by default: click “Show” in its header.
- `data/sia` folder, stored like the other folders of the suite.
- “Rebuild the aeronautical database” after each AIRAC update; “Cancel” stops without changing the stored base.
- “Purge the cache” clears the base kept in this browser (to be re-read afterwards).
- The status line shows the stored base (folder, AIRAC cycle, date); “Files analysed” lists the XML files read.

If the folder contains several cycles, only the most recent is read; the others are flagged, to be archived. This is the same block as Settings › Maintenance › Aeronautical data (“Rebuild the aeronautical database”), which reads the active zones and their ticked sources.

## Mission registry
<!-- page: apps/cpco/mission_registry.html -->

The registry lists all the generated or ordered missions, with their follow-up by the Centre: status, flight date, notes, reports.
It is used to choose a mission, open it in the generator or the studio, assign it to pilots, create its report and order new missions.
Access: sidebar “Missions”, which opens on the registry (“Registry” tab), or ☰ › “Mission registry (SIA)”. At the top, “Generate a mission” opens the generator to create one.
Depending on the usage level: the page is offered from the Design level (3), with the essentials: “Add files…” and “Re-read folder”, four filters and “More filters”, a seven-column table, a card without the map studio and the simplified order form. The rest is at the Expert level (4), as shown below.

### Registry missions

At the top: number of missions, breakdown by status and update date.

| Button | Effect |
|---|---|
| “Missions folder: …” (Expert level) | Chooses the `data/missions` folder then re-reads it |
| “Re-read folder” | Re-reads all the missions of the folder; asks for it if it is not yet allowed |
| “Add files…” | Adds `mission<ID>.yaml` / `summary<ID>.md` files (any browser) |
| “Write mission_registry.yaml” (Expert level) | Writes the registry to the missions folder |
| “Clean up the registry (n)” (Expert level) | Removes the “file missing” missions after re-reading |

The folder is re-read automatically on opening if it is already authorised. The reading shows a progress bar with “Stop”: the registry stays unchanged.
On clean-up, the status, notes and flight date move to the mission that replaces a renumbered mission.

### Choose a mission

Filters: “Type”, “Status”, “Theatre”, “Search”; the others (“Subtype”, “Rendezvous”, “Teams engaged” (min – max), “Team / aircraft type”, “Air refuelling”) are under “More filters”, open at the Expert level or when one of them is active. They are stored.
- “Draw at random (n)” picks a mission among those that pass the filters.
- “Clear filters”, “CSV” (export of the selection).
- Table sorted by column: Mission, Type, Title, Teams, RDV, AAR, Theatre, Status, “Est. time”, Reports (number of flights), “Generated”. The bar under the table sets its height (double-click: default height). The Teams, RDV, AAR and Theatre columns are only shown at the Expert level.
- ✕ removes a mission from the registry without deleting its files.

Click a row to open the mission card, described below. The link `?mission=M-016` opens the card directly.

### Mission card

The card shows the status, the itinerary, the teams and callsigns, then:
- for an operation: its members (click to show them); “Open” loads the whole operation in the generator or the studio;
- “Mission files”: YAML, “Markdown (readable)”, “PDF (generator)”, “Edit (generator)”, “Maps (studio)” (Expert level), map thumbnails, previous versions and received texts;
- map state: “complete”, “partial: maps missing” or “partial: maps not generated (can be regenerated)”;
- “Estimated time” with the comparison with the reports.

Buttons: “Open in generator”, “Duplicate” (copy of the mission, next identifier, opened in the generator; see the generator), “Open in map studio”, “Assign…” (except organisation …Z; see [mission assignment](../technique/AFFECTATION_MISSIONS.md)), “Create report” or “New report (flight n)”, and “Copy prompt again” for an ordered mission. “Open in map studio” and “Copy prompt again” are at the Expert level.

### Centre follow-up: status, flight date, notes

The frame at the bottom of the card has three fields: “Status”, “Flown on”, “Notes”.

| Status | When |
|---|---|
| ordered | Order placed with ChatGPT |
| generated | Files received |
| planned | Mission opened in the generator or the studio from the registry |
| flown | Flight date entered, or report created from the card |
| report done | A report of the report ledger cites the mission (automatic) |
| dropped | Manual choice |

The follow-up is written to `suivi.yaml`, in the mission folder; it is shared with the other computers. If two computers change the same field at the same time, your entry is kept and a warning flags it.

### Link with the reports

- The card lists “Mission reports (n)”, from the most recent to the oldest; each link opens its report.
- “Create report” opens a report pre-filled for the matching family. For a mission already flown, “New report (flight n)” takes the next flight number (recurring missions).
- In the report, under the mission field, the link “see the mission in the registry ↗” goes back to the card, with the estimated duration and the flight difference.
- As soon as a report cites the mission, the status changes to “report done”, unless the mission is dropped.

### Order a mission

Form shared with the generator and the flight orders.
1. Set “Type”, “Subtype”, “Theatre” (“Country” for abroad), “Flying teams”, “Ground teams” and “Duration” (XS to XL).
2. If needed, unfold “More options”: “Second theatre” (“Country” for abroad), “Series” (empty = the next one), “Identifier” (computed, read-only), “Rendezvous”, “Translations”, “Air refuelling”, “Coordinated exercise” (yes: …Z organisation mission; no: never; free: as the scenario needs) and the aircraft of each flying team A, B… (empty = automatic). This section is open at the Expert level; at the other levels, it opens by itself when one of its settings differs from the default.
3. Click “Order: copy prompt and open ChatGPT”, paste into ChatGPT (Ctrl+V) then send.

The mission appears in the registry with the status “ordered”. Then save the files to the missions folder and click “Re-read folder”: the order is matched with the generated mission (same series). The settings are stored.

## ODV planning
<!-- page: apps/cpco/odv_planning.html -->

The ODV planning page brings together the week's availability, the common slots, the likely missions and the assignments. The Centre (CPCO) uses it to plan missions and give them to free pilots.
To open it: the “Full ODV page: workbook, grid, export…” link of the “Likely missions” block of the Board (Expert level), or the ☰ menu (Centre pages); the page has no tab and belongs to the Planning usage level (2). The page is part of the Centre: as long as the Centre is locked, a notice points to Settings › Centre (see the next chapter). In production mode, you must also be signed in with the `admin_centre` role.
The squadron's Excel workbook is optional: without it, the week is built from the availability declared by the pilots in My missions and from the assignments already saved.
Each block can be moved (↕ handle) or hidden (“Hide” / “Show”); the layout is stored for the page.
The “Common slots” and “Likely missions” blocks also appear in the Board, at the Expert level, following the week it shows (see the next chapter).

### ODV workbook

This block loads the squadron's weekly workbook (`.xlsx`). It is **hidden by default**: click “Show” in its header to display it.
- Choose the file, or drop it on the file field. It is read in the browser; nothing is sent over the network.
- On arriving on the page, the suite reopens by itself the most recent `.xlsx` workbook of the “ODV workbook folder”, if it is authorised (Settings › Installation › Sources and folders). Otherwise, it reopens the copy of the last chosen workbook, kept in this browser.
- When chosen by hand, the workbook directly shows its own week.
- Once the file is read, a summary appears: “File”, “Week”, “Duty officer”, “Theme of the week”, “Pilots”, “FLOTTE sheet”, “Timeline”, “Reading”. The “Reading report (n)” lists the warnings (⚠) and the remarks. It is expanded if it contains at least one warning.
- Anomalies (code not in the legend, duplicate trigram, offset timeline date…) are flagged by floating notifications, without ever blocking the reading.
- Keep the workbook in Excel format: saved again by LibreOffice or Google Sheets, it can lose its text boxes, hence its trigrams (flagged).
- If a pilot of the workbook has no mission-type preferences yet, the suite creates them from their codes (C → fighter, T → transport…) and writes them into their user record.
- “Clear data” empties the page. The button stays greyed out as long as no workbook is loaded.
- The link “Settings › Centre › ODV planning” leads to the settings of the slots and of the workbook reading.
- Personal data: do not publish the exports. Workbook format and reading rules: [workbook reading rules](../technique/ODV_ORDRES.md).

### Availability grid

The grid crosses the pilots with the days of the week and the three slots of each day (M = morning, A = afternoon, S = evening).
- **Week choice**: “◀ Previous week”, “Next week ▶”, “This week”, and “Workbook week” when a workbook of another week is loaded. The source shown is either “workbook …” or “pilot declarations and assignments (no workbook for this week)”.
- **Filters**, stored in this browser: “Hide empty grids”, “Trigram colour” (colour of the shape in the workbook, no effect on the rules), “Role (FLOTTE sheet)” or “Role (declared aircraft)” without a workbook, “Simulator”.
- **Legend**: workbook codes with their number of cells, then the “Pilot declarations” block, identical to the one in My missions.
- **Reading a cell**: the workbook code comes first, then the pilot's declaration. A red frame flags a pilot who is available and not assigned. A mission number flags an assigned pilot.
- **Tooltips**: the cell comment is shown on hover, without its author's name; the roles, the simulators and the workbook row are shown on hovering the trigram.
- The “Avail.” column counts the pilot's available slots, with the number of control slots in small print (+n).
- **Click on a declaration**: opens the “Assign the free pilots” window of the slot, with this pilot highlighted (see “Common slots”).

#### Missions assigned this week

Under the grid, the “Missions assigned this week (n)” table lists the assignments of the displayed week.

| Column | Content |
|---|---|
| Take-off | date and time Z |
| Slot | three M / A / S boxes, the one of the slot highlighted |
| Mission, Pilot, Callsign, Aircraft, Airfield | mission (number and title), pilot (“to assign” if nobody), callsign, type and registration, departure airfield |
| Role | “mission”, “mission (ferry from …Z)” or “ferry for …” |

Click a row to reopen the full assignment and edit it. The Centre must be enabled and the mission must be in the registry of this browser. Otherwise, the slot window opens or a warning is shown. Without any assignment, the message “No mission assigned this week.” is shown.

#### Hour-by-hour planning

This planning details one day of the week.
- The tabs at the top only show the days that have missions, with their number in brackets. By default, the planning opens on today, or else on the next day that has missions.
- Each row is a pilot; a “to assign” row groups the posts still without a pilot.
- Each mission is a coloured block carrying the callsign. A ferry flight is marked “⇢”.
- The three slots are drawn in the background; a line marks the current time.
- Click a block (or press Enter) to edit the assignment.
- Further down, “Assignment log (n)” expands and shows the last 30 operations.

### Network ATC sessions

This block gathers the VATSIM / IVAO trainings, exams, events and bookings of the displayed week. They are saved in the shared data pool (`data/atc/<année>-W<semaine>.json`).
- **Enter a session**: fill in the day, the start and the end (UTC times, in 15-min steps), the position (e.g. `LFBO_APP`, `LFMN_TWR`), the network (VATSIM or IVAO), the type (Training, Exam, Event, Booking) and an optional comment. Then click “Add”.
- Both times must fall on the same day: the end must come after the start.
- “Fetch VATSIM (preferred country)” imports the week's VATSIM bookings. Sessions already fetched are replaced (cancellations included); manual entries are kept. Only positions of the preferred country are imported (Settings › Centre › ODV planning; metropolitan France by default); the button shows its name.
- “Fetch IVAO (preferred country)” likewise imports the week's IVAO trainings, exams and bookings, with the installation's IVAO API key (Settings › Installation). These two buttons are the import shared with the Board: a single file, the same sessions on both pages.
- The “×” button of a row removes the session. The “Source” column shows “fetched” or “entered”. The table first shows trainings, exams and events (exam and training marked in the margin); plain position bookings, numerous once imported, are folded under “n position booking(s)”.
- **Effect on planning**: a session is counted in its slot (★). A training or an exam makes the airfield CTR unavailable for missions in that slot; the TMAs containing the airfield should be avoided if possible.
- A “TRAINING” or “EXAMEN” followed by a position (“EXAMEN LFMN_TWR”), written in a DIVERS lane of the workbook timeline or in a controller's comment, counts the same way.

### Area activations by network

This block is the one of the Board (see “Areas”): RTBA, R, D, TRA… activations of the displayed week, VATSIM and IVAO side by side, same data. Editing restricted as in the Board (Centre enabled; in production, administrator).

### Common slots

This table covers the 7 days × 3 slots. Each cell gives the number of **free pilots**, that is available and not yet assigned.
- The cell marks: “+n ctrl” (controllers), “✎” (mission already assigned), “★” (event or ATC session). The tooltip also gives the headcount before assignments.
- Filters: “At least N pilot(s)”, from 1 to 20 (2 by default), and “Common simulator” (“any” or a simulator). They are stored with the ODV settings. A cell below the threshold is dimmed.
- Pilots counted: codes O, SC, C, T, N, S; controllers: AT, AM. An empty cell is not counted.
- **Click on a cell**: opens the “… — assign the free pilots” window. It lets you edit the missions already assigned in the slot or plan others.

#### “Assign the free pilots” window

Opening conditions: Centre enabled, and mission registry present in this browser (otherwise, open the Centre registry and re-read the missions folder).
1. **The day in three blocks** (Morning, Afternoon, Evening) fills the top of the window. Each block gives its hours, the number of free pilots and of missions, and “now” for the current slot. The window's slot is highlighted. Clicking another block opens that slot; if unsaved choices remain, a confirmation is asked. The window stays open and switches to that slot.
2. The free pilots are listed with the aircraft types they have declared (in bold: mastered). Choose a “Family” (“all”; “(suggested)” flags the family suggested for the slot). The “To avoid:” line recalls the CTRs and TMAs closed by an ATC session.
3. In the matrix, tick a mission (“Plan” column). Then choose the “Aircraft”: the list goes from the nearest to the farthest from the departure and shows “on site” or the ferry time. Finally choose the “Pilot”: at the top come the pilots “Free until the end, with the aircraft”.
4. If the aircraft is based elsewhere, a “Ferry” row appears. Choose who ferries it (“by”): a free pilot, the pilot themselves (the mission is then shifted accordingly) or “to assign (ferry mission)”.
5. If needed, set the “take-off” time (or the “H-hour” of an operation with several missions). “+ wingman” adds a post to a patrol, with the next callsign. “✎ detail” opens the full assignment dialog; its result comes back into the matrix.
6. Check the “Status” column: duplicate pilot, duplicate or already committed aircraft, pilot not free over the whole range.
   Under each mission, a red tag flags a route crossing a CTR to avoid, an orange tag a TMA (SIA base of the browser).
7. Click “Save (n)”. “Undo changes” returns to the state at opening; “Close” asks for confirmation if choices are pending.

Under the matrix:
- “Ferries to assign (n)” lets you give a ferry flight that is still open: choose the ferry pilot, then “Assign”.
- “Pending (n)” lists the choices not yet saved.
- “Saved in this slot” offers “Edit…” for each mission.

Limits:
- The window closes by itself when all the free pilots are assigned.
- Missions already assigned (this week or before) are hidden.
- A pilot gets only one mission per slot.
- To save, the missions folder must be authorised (Settings › Installation › Sources and folders).
Detailed rules: [mission assignment](../technique/AFFECTATION_MISSIONS.md).

### Likely missions

For each slot that reaches the “At least N pilot(s)” threshold, this block suggests the best mission families playable by the free pilots.

| Column | Content |
|---|---|
| Slot | day, date, M / A / S; rank of the suggestion as a superscript |
| Family | SAR, FIRE, HEMS, MARITIME, AAR, ISR, SPECIAL, AIRBORNE, AIRLIFT, TRAINING |
| Suggested assignment, + | pilots and role held; possible reinforcements |
| Common simulators, Score, Rule | shared simulators; score (detailed calculation on hover); family rule |
| Plan (registry missions) | “Plan” or “Edit”: opens the slot window, filtered on the family |

- Click a row (outside the button) to expand its summary: slot, suggested crew, reinforcements, rule, score, context (ATC sessions, controllers, events), simulators, missions already assigned. The ▸ triangle does the same; only one row is expanded at a time.
- “Family and score rules” expands under the table. Score = number of participants, + 2 per pilot with a restricted code used in their field, + 1 per online controller for TRAINING (2 at most). A family played often moves back a little (depending on the number of reports in the registry) to vary the missions.
- The number of missions shown per slot and the order of preference at equal score are set in Settings › Centre › ODV planning.
- The table sorts by column. The roles taken from the FLOTTE sheet remain indicative: the planner validates.

### Export

This block saves files on this computer. They contain personal data: do not publish them. The buttons stay greyed out as long as no workbook is loaded.

| Button | Result |
|---|---|
| “Grid (CSV)” | `<classeur>_grille.csv`: one row per pilot, day and slot |
| “All data (JSON)” | `<classeur>_planning.json`: settings, pilots, grid, events, flights, slots, missions, anomalies |
| “Text summary” | fills the text area: DISPO MATIN / APREM / SOIR per day |
| “Copy” | copies this text to the clipboard (for example for Discord); active once the summary is produced |
| “Summary (.txt)” | `<classeur>_dispo.txt` |

If the browser refuses automatic copying, the text is selected: copy it with Ctrl+C.

## Board
<!-- page: apps/cpco/odv_orders.html -->

The Board page builds the week's flight order: flight strips, control, miscellaneous items and notes placed on a timeline, with availability and area conflicts.
To open it: sidebar › “Schedule” (“Board” tab). Unlike the rest of the Centre, it can be viewed without it: at usage level 1, or without the Centre enabled (or, in production mode, without being logged in with the `admin_centre` role), it opens read-only: the “Order of the day” block only, with the day’s timeline and its flights, control, miscellaneous and notes rows — no palette, areas, ATC, common availability, problems, log, no drag and drop or mission order; without the Centre, a floating notice says so. Changing it needs the Centre enabled and, in production mode or as soon as a user is signed in, the `admin_centre` role (a `utilisateur` account stays read-only even with the Centre open; likewise in ODV planning: ATC sessions, activations, assignments).

The page has six blocks, with no choice of view. What each one shows depends on the usage level (My profile › “Usage level”):

| Block | Content | Level |
|---|---|---|
| “Order of the day” | week bar, then the day’s timeline (only block in read-only mode) | 1 |
| “Crew of the week” | members’ availability day by day, DLO and deadlines, availability changes | 2 |
| “Areas” | area activations by network, then reservation requests | 2 |
| “Common slots” | slots where several pilots are available; a click opens the slot window | 4 (Expert) |
| “Likely missions” | compatible mission families per slot, link to the ODV page | 4 (Expert) |
| “Statistics” | the week’s flights and members’ load | 2 |

- **Hide unavailable pilots** (box of the palette and of the “Crew of the week” block, taken from the ODV page): only members that a range declared that day makes assignable to a flight remain (same rule as conflicts: ground, time off, control outside SOG or control only do not count) (the week: at least one day); kept in this browser.
Everything is saved in the shared data pool: the week's order in `data/odv/<year>-W<week>.json`, the settings in `data/config/odv.json`. Availability stays the pilots' own, and the crew of a mission flight comes from the assignments.
Times are in z (UTC). Data model: [Board](../technique/ODV_ORDRES.md).

### Order of the day: week bar

- “◀” and “▶” change the week, “This week” goes back to the current week.
- The day tabs show, in red, the number of items in conflict that day.
- “Duty officer” names the week's duty officer.
- “↶ Undo” (or Ctrl+Z): reverts the last ten changes to the flight order (strip moved, item placed or changed…), reissues and saving included; cleared when the week changes.
- “Briefing” (or the F key) puts the order of the day in full screen; the ← and → arrows change the day.
- The status line shows “Saved”, or “Saved in this browser” if the data folder is not authorised.

### Order of the day

On the left, the palette: flight, control and miscellaneous templates, the note, then the members (Staff, then Members) with the bar of their availability that day. On the right, the timeline:
- dotted lines: morning, afternoon and evening slots of the ODV planning; red line: current time; dark areas: aeronautical night at the set airfield;
- “RTBA · LL”: RTBA activity slots (activations entered or imported, otherwise the slots from the settings);
- “Areas”: areas required by each flight (those of its mission, or those entered for a training flight), green if active on the flight's network, orange if requested, red otherwise;
- “ATC”: the day's ATC sessions within the perimeter (country set in Settings › Centre › ODV planning, shown on hovering the label): trainings and exams in purple, events in blue, bookings faded; a session is outlined in red when it hinders a mission flight (its departure or arrival airfield during the flight);
- “Available together”: ranges where at least two members can be assigned to a flight;
- “Flights”, “Control”, “Miscellaneous”, “Notes” sections: items stack by themselves.

Handling:
- drag a template onto its section: the item is created at the drop time (in 5-minute steps) and its window opens;
- double-click a palette card to place it automatically: at the synchronisation slot for another crew of a multi-crew mission (offset of the operation's exercise relative to H, otherwise time of the linked patrol already placed; tanker: 30 min before the refuelling, or before the patrol it serves), otherwise at the first consistent slot of the day (duty hours, not before the current time, crew assignable and free, or enough members available together);
- drag a member from the palette onto a strip to add them, or a trigram from one strip to another to move them;
- drag a strip to change its time, its right edge to change its duration; a single click opens its window;
- in the palette, “Flight pool” keeps the strips removed from the timeline (dragged onto the palette, or “↩ Pool” in their window) and “Mission formations” offers what the placed mission flights call for: patrols of the other missions of the formation, tankers serving them, chiffons of the operation;
- “Zoom” sets the timeline scale.

On a strip: “⚠ n” counts its conflicts, “P” flags that no crew member is available in the hour and a half before the flight, “↻” a recurrence; a green (done) or orange (not done) bar underlines the status; a cancelled strip is struck through. Below the timeline, “Assignment problems” lists the day's conflicts: a click shows the strip.

### Item window

- **Flight**: label, callsign, registry mission (empty: training), network, start, duration, colour, areas of a training flight, track and offload of a tanker flight, tanker and refuelling time, aircraft (pilot, navigator, cancelled; eight at most), tasks (one per line, “name = TRI”), info, status, reason, report (ME, Bâché, MNE), partial, MNE causes.
- A callsign entered suggests the mission of the assignment that carries this callsign that day.
- “Registry mission and team”: one row per flying team of each mission (callsign, aircraft, role, family, airfields, operation, estimated duration), sorted by duration; “⚠” and a notification flag an estimated duration that differs from the requested one (gap of more than 15 min or 15 %). “Training (no mission)” leaves the strip without a mission.
- “Refuelling”: a tanker mission (those of the same operation or on the same track first), whose strip is placed that day if it is not there yet, or a tanker flight already placed; the refuelling time is set next to it.
- **PTA** (principal training audience): members the item trains first, ticked in the aircraft table (flight) or in the PTA list (control, miscellaneous); they are circled on the strip. **Configuration**: configurations loaded on the aircraft (KNON = gun, TALIOS = pod…), suggested from the settings. **DLO** (desired learning objectives): objectives of each member on the item, one line per member “TRI = objectives”; “◎” on the trigram, objectives on hover.
- **Aircraft**: two places to start with (“+ Wingman” adds more, eight at most); for each, the aircraft (mission type suggested ★, not imposed, or an aircraft of the fleet), the pilot and the navigator. The suggested callsign is the mission's, otherwise those of the callsign table for that type; it follows the mission if the mission changes it. **Refuelling**: choose the track, then a tanker mission on that track; if its strip is not placed, it joins the palette and the flight hooks onto it when it is placed. The strip shows the mission (title, family, airfield), the track held by a tanker and, for a receiver, “⛽ tanker track time”.
- **Posts and aircraft** (as in the ODV planning): for a mission flight, one row per post of the mission (callsign, type); the next wingman takes the next callsign. The aircraft list offers the compatible aircraft, on site first then from nearest to farthest (“ferry x h xx”); those already taken during the flight are greyed out. An aircraft based at another airfield than the departure makes a ferry strip “⇢” appear (aircraft, airfields, “to be assigned”), arriving 30 min before take-off and following the flight: drag the ferry pilot onto it. **Standby**: notice and end, carried into the mission order. The line under a trigram shows their qualification on the type (green: mastered; orange: owned or known; red: no); it is only a signal.
- **Choosing a mission**: the list is limited to the callsign or label entered (“SAMU” → SAMU missions); once the mission is chosen, the ODV choice window opens and its rows (posts, aircraft, pilots, callsign, ferry pilot) fill the strip; pilots available and qualified on the type are offered first. The strip takes the take-off time of the assignment (warning if they differ); “Operation mission order (n)…” chains the mission orders of the operation's strips placed that day; a strip taken back from the pool or the formations is placed at its synchronisation slot. **Refuelling**: the chosen track limits the list to its tankers; “No specific mission” puts a generic tanker on the track in the pool. A ferry moved by hand keeps its place (it follows the flight by the same gap if the flight moves), lengthened or shortened by hand it keeps its duration as long as the route does not change; it is removed only when the flight no longer needs it (flight deleted, aircraft changed or already at the departure airfield) — mission briefly missing from the registry or airfield without coordinates: the strip stays as it is, ferry pilot included; if it arrives less than 30 min before take-off, it is flagged. An availability whose category does not open the mission family, and an ATC exam or training at the departure or arrival airfield during the flight, are flagged. Below the timeline, “Assignment log” shows the last 30 operations.
- **Assignments and mission orders**: a mission assigned elsewhere (ODV planning, Registry) appears automatically as a strip on the timeline, at its take-off, with its aircraft, pilots, standby and ferry. Conversely, a mission flight with a crew but no assignment is flagged “mission order not issued” (the pilot sees nothing in My missions), and a crew that differs from the assignments “mission order to reissue”. Moving the strip of a flight that has its mission order (day, time, duration) reissues it automatically, without a window: same pilots, aircraft, callsigns and ferry pilots at the new time; an envelope already opened is sealed again so the pilot sees the change. If there is an assignment conflict (pilot, ferry pilot or aircraft taken elsewhere) or the missions folder is not authorised, the order is not reissued: the strip flags it (“mission order not reissued”, with the reason) and keeps its new time; “Mission order…” remains the way to change pilots or aircraft.
- **Ferry order**: “Ferry order…” on a ferry strip opens the mission order of the flight served, ferry included (time and duration of the strip, even moved by hand); a ferry pilot other than the mission pilot, or a ferry to be assigned, receives their ferry order in My missions; flown by the mission pilot, the ferry is a line of their mission order.
- Mission flight: the crew comes from the mission's assignments; “Mission order…” opens the Centre's assignment window, prefilled with the strip's aircraft (pilot, registration, patrol callsigns): the saved assignments are the mission order the pilots receive in My missions (“OM” badge on the strip). “Order a mission…” opens the generator's order form, preset from the strip (teams, aircraft types, duration, refuelling). The mission report is authoritative: when the week is opened, status and report are taken from it; with no report after the set delay, the flight becomes MNE (cause “no report”).
- **Control**, **Miscellaneous**: label, position (control), start, duration, colour, status, reason, crew (member boxes), notes (miscellaneous).
- **Note**: free text.
- “Repeat” (every day, every week, every other week) and “Until” place the item on the following weeks when they are first opened, never before its date.
- “Delete” removes the item.

### Conflicts

| Conflict | Meaning |
|---|---|
| week not declared | the member has not declared their availability for the week |
| not available for the whole duration | no range covers the whole item |
| not assignable (category) | a range of a category that does not open this kind of item overlaps the item |
| already busy at that time | the member is on another item at the same time |
| twice on the item | the same member holds two places |
| area not activated, requested, prohibited | required area without an “active” activation of its network over the whole flight, or P area |

A flight needs an available category; a control item, an available category or “SOG control”; a miscellaneous item also accepts “Available on the ground only”. Control and flight outside SOG, DCS, unavailable and time off can never be assigned.

### Crew of the week

Level 2 block: one row per member, one cell per day with the bar of declared availability and the number of items they appear on. A click on a cell opens their ranges for the day: category, start, end, and “Time off from”, which sets time off until midnight. The ranges are written into the pilot's declaration.
- **DLO and deadlines** (table folded or unfolded by its triangle, state kept in this browser): each member's permanent objectives (“＋” to add, click to edit), with an optional deadline (red at 3 working days or less, yellow at 10 or less); a DLO is closed automatically by a flight done that contains it (item DLO, label, mission) with the member in the crew. The palette shows “◎n” open DLO per member, and an item's window recalls those of the crew.
- “Availability changes” lists the declarations changed since they were last noted; “Noted” and “Note all” mark them in this browser.

### Areas

Level 2 block, in two parts: area activations by network, then reservation requests.

**Area activations by network**: the first part enters the week's area activations (`data/atc/activations/<year>-W<week>.json`), in two side-by-side columns, VATSIM and IVAO: day, area, status (active, requested, refused), start, end, remark, network. A “both networks” activation appears in both columns; changing its network moves it. VATSIM does not publish activations: its column is entered by hand. In the IVAO column, “Import from IVAO” takes the schedules published by IVAO (installation API key), folded under the list, along with the week's IVAO trainings, exams and bookings (ATC sessions); entries made by hand stay. IVAO sessions are also imported automatically when a week is opened, at most once an hour, if the page can write. A change recomputes the flights' areas at once. The ODV planning shows the same block, on the same data.

**Reservation requests**: the second part lists the areas crossed by the week's mission flights (planned route and working areas of the mission, areas entered for a training flight) without an “active” activation of their network: day, area, network, slot, flights, status. “Record as requested” (or “Record all as requested”) adds them to the shared activations; the request itself is made on the network's site (“Copy the list”, link to the IVAO activation requests). A P area is flagged “to avoid”. When a week is opened, the page imports the IVAO ATC sessions (trainings, exams, bookings) automatically, at most once an hour, with the import shared with the ODV planning. “Withdraw the request”: an area recorded as requested by mistake goes back to “missing”.

### Common slots

Expert level block, taken from the ODV page and following the week shown by the Board: the 7 days × 3 slots, with the number of free pilots per cell and the “At least N pilot(s)” and “Common simulator” filters. A click on a cell opens the slot window (missions × positions matrix). Details: ODV planning chapter, “Common slots” and “‘Assign the free pilots’ window”.

### Likely missions

Expert level block, also following the week of the Board: compatible mission families per slot, with the table and the rules of the ODV page (see ODV planning, “Likely missions”). At the bottom, the “Full ODV page: workbook, grid, export…” link opens the ODV page, which has no tab.

### Statistics

Level 2 block: planned flights, total duration, done, not done, cancelled, AAR, ME, Bâchés, MNE; per member: time available over duty hours, flight time, load (orange above 70 %, red above 100 % or with no availability).
