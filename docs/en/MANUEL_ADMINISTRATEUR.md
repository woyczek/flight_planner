# Administrator manual

This manual describes the SO Group Virtual (Virtual Special Operation Group) suite for the **Centre** (planning and conduct of operations) and for the
suite **administrators**: one chapter per page, one section per tab, section or block, then data
synchronisation and the launcher. In the suite, the **“Help”** entry of the sidebar opens this manual
at the chapter of the current page (Centre and settings pages). The pilot pages are described in the
[user manual](MANUEL_UTILISATEUR.md); operations in detail (data, backups, troubleshooting, publishing)
in the [operations manual](../MANUEL_EXPLOITATION.md). Index of all the documentation:
[documentation index](../README.md).

## Centre access

The Centre for planning and conduct of operations (CPCO) brings together the mission generator, the map studio, the mission registry and the ODV planning. It is reserved for the suite administrators.
Two independent protections apply: the **Centre lock**, specific to each browser, and the **user rights** (roles, develop or production mode), shared by the whole airline.
The settings are in ☰ › Settings, “Centre” tab.

### Centre lock

The lock hides the Centre until it has been enabled in this browser.

- Centre locked: the Centre pages disappear from the ☰ menu, from the sidebar (“Centre” separator and “Missions”, “Registry” and “ODV” entries) and from the home page.
- A Centre page opened directly (bookmark, link) is covered by a “Restricted access” notice with the links “Enable the Centre…” and “Home”.
- In Settings › Centre, only the “Centre access and settings” section stays visible; the others (“Users and rights”, “Availability categories”, “ODV planning”, “Report sending (web service)”) are hidden.
- Activation is stored in this browser only: repeat it on each computer and after clearing the site data.

Limit: this is a usage lock, not security. The pages remain files readable by anyone with access to the folder.

### Enable or lock the Centre

1. Open ☰ › Settings, “Centre” tab, “Centre access and settings” section.
2. Enter the password in “Centre password” (not case-sensitive).
3. Click “Enable the Centre” or press Enter. The status line shows “Centre enabled in this browser”.

The Centre entries appear at once, without reloading the page. The section then shows the “Transit route calculation” settings:

| Field | Role |
|---|---|
| “Routed leg from (NM)” | Minimum length of a transit for it to be routed |
| “Airways from (ft)” | Level from which an aircraft follows the airways |
| “Low level up to (ft)” | Ceiling of routing through the RTBA |
| “Airway entry / exit (NM)”, “RTBA entry / exit (NM)” | Maximum distance to join or leave the network |
| “Allowed detour, airways (%)”, “Allowed detour, RTBA (%)” | Beyond this, the leg stays direct |

Buttons: “Save”, “Default values” and “Lock the Centre”. These settings are kept in this browser; they are the same as those of the generator's “Estimated duration” block.

### “admin_centre” and “utilisateur” roles

Each user has a shared record (`data/utilisateurs/<TRI>.json`, synchronised): trigram, display name, role, active state, password (stored as a hash, never in clear text).

| Role | Displayed label | Rights |
|---|---|---|
| `admin_centre` | Centre administrator | Centre access in production mode, user management, impersonation, mode change |
| `utilisateur` | User | Pilot pages (“My missions”, availability) |

Management in Settings › Centre › “Users and rights”:
- the table lists the records; “Display name”, “Role” and “Active” are edited on the row and saved at once;
- “Reset…” opens “Reset the password of TRI”: enter a temporary password (at least 8 characters), which the user must change at their next sign-in;
- “Add a user”: trigram, display name, role, then “Add”.

Tip: if the users folder is empty, the section creates one record per pilot of the reference.

### Develop mode and production mode

The mode applies to the whole airline (`data/config/suite.json`). It is set in “Users and rights”, “Airline mode” frame, “Mode” list.

| Mode | Effect |
|---|---|
| develop (default) | Security tested, not enforced: free trigram, optional sign-in. A record without a password signs in without a password. |
| production | Sign-in required for “My missions” and for the Centre; trigram set by the sign-in (cannot be changed in My profile). |

In production, a Centre page (or Settings › Centre) without a signed-in administrator shows a “Sign in” window (trigram, password, “Sign in”). An account without the `admin_centre` role is refused: “Account without Centre administration rights”.

To switch to production, you need at least one active Centre administrator with a password. Once in production, only a signed-in `admin_centre` can go back to develop.

Limit: the checks run in the browser; they do not really protect as long as verification does not go through a server. The Centre lock stays independent of the mode: you must also enable it on each computer.

### Impersonate a user

An administrator can act on behalf of another user, for example to correct their availability or their missions.

1. In “Users and rights”, click “Impersonate” on the user's row.
2. A notification confirms “You are acting as TRI”.
3. A banner appears on every page: “Impersonation: user TOTO (by ADM, writes signed “ADM pour TOTO”)”.
4. To finish, click “End impersonation” in the banner (or “Impersonate” on your own row).

During impersonation, the working trigram is that of the impersonated user and each write is signed “ADM pour TOTO”. In production mode, impersonation requires a signed-in `admin_centre`; in develop, setting your trigram is enough. Changing the password is not possible during impersonation.

## Mission generator
<!-- page: apps/cpco/mission_editor.html -->

The generator prepares a mission file: identification, brief texts, exercise, estimated duration, airspaces to activate, then the PDFs to hand to the crews. It is also used to order a mission from ChatGPT and to receive its answer.
Access: sidebar “Missions” (“Centre” section) or ☰ › “Mission generator (SIA)”. From the registry, “Open in generator” loads the chosen mission.
See also [SIA missions](../SIA_MISSIONS.md) and [generator prompt](../technique/PROMPT_GENERATEUR_MISSIONS.md).

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
| “Save draft” / “Reload draft” | Keeps or reloads the mission text in this browser (images must be selected again) |

The “Import another mission: files, pasted text, ChatGPT order” pane is open when no mission is loaded:
- “YAML and/or Markdown”: select `mission<ID>.yaml` and `summary<ID>.md` together, or click “or paste its content…” then “Read the mission”;
- “Maps or ZIP delivered by the generator”: choose the studio ZIP directly; the PNGs and the overview map are matched automatically;
- “Order a mission from ChatGPT”: same form as the registry (type, subtype, theatre, series, teams, aircraft…). “Order: copy prompt and open ChatGPT” copies the prompt, opens ChatGPT in a new tab and records the order in the registry (“ordered”).

A received mission is recorded in the registry and filed in its folder if the missions folder is authorised; otherwise, click “File in the missions folder…”. Link “Open the registry ↗”.

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
- “Route calculation settings (common to all missions)”: same fields as Settings › Centre, with “Default values”.
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

“Summary”, “Detailed description”, then free sections: “Add a text section”, each with “Section title”, “Content” and “Delete”.
If the received file has neither summary nor description, they are proposed from the data: proofread them.
On an organisation mission, the block becomes “General brief”: situation, common objectives, time windows, end criteria, handed to everyone.

### All YAML data

Block hidden by default: click “Show” in its header.
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

## Map studio
<!-- page: apps/cpco/map_parser.html -->

The studio produces the maps of the mission file from the SIA data (AIRAC cycle): route, vertical section, maps in PNG or SVG, ZIP and overview map.
Access: the generator's “Map studio” tab, ☰ › “Map studio (SIA)”, or “Open in map studio” in the registry.
It works on the mission shared with the generator. Technical details: [SIA missions](../SIA_MISSIONS.md).

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

### Maps to produce

“Mission maps”: one row per map.
- Click on the name: shows the map in the control map (✎ = framing changed).
- Display profile, or “Disabled” (map neither generated, nor previewed, nor on the overview).
- Trace: “No trace”, “Brief: route”, “Organisation: probable route”, “Route + probable route”.
- Exercise recipient (if the exercise has tracks): no tracks, organisation, one exercise target, or a crew after a given message or envelope.
- “ZIP” box (unticked: map not generated; choice not saved in the mission) and × to delete.

Adding: name, type (“general”, “target”, “detail”, “zone”) then “+ Map” (extent = displayed view); “+ Exercise maps” adds the maps of the organisation, of the played exercise targets or of the crew.
“Settings of profile …” (collapsed): “Profile name”, “Base map”, “Save”, “New”, “Duplicate”, “Delete”, then four tabs: “Base map”, “Airspaces”, “ICAO symbols”, “Elements”. The profile edited is always that of the chosen map; profiles are common to all missions and kept in this browser.

### Previews and generation

- “Show all maps”: previews of all the maps; they create no file.
- “Generate the maps and the ZIP” (also in the footer): produces each map ticked “ZIP”, the overview map and, if the option is ticked, the vertical profile, then downloads the ZIP.
- The PNGs are filed in `cartes/` of the mission folder (visible in the registry). Otherwise, use “File the maps in the folder” in the footer.
- A failed map does not stop the others: the ZIP contains `rapport_generation.txt` and “Retry alone” relaunches the map. “partial base map” flags a slow base map.
- Batch of several missions: “Generate the n missions” produces a single ZIP, one folder per mission, with the operation map.

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
Access: sidebar “Registry” (“Centre” section) or ☰ › “Mission registry (SIA)”.

### Registry missions

At the top: number of missions, breakdown by status and update date.

| Button | Effect |
|---|---|
| “Missions folder: …” | Chooses the `data/missions` folder then re-reads it |
| “Re-read folder” | Re-reads all the missions of the folder |
| “Add files…” | Adds `mission<ID>.yaml` / `summary<ID>.md` files (any browser) |
| “Write mission_registry.yaml” | Writes the registry to the missions folder |
| “Clean up the registry (n)” | Removes the “file missing” missions after re-reading |

The folder is re-read automatically on opening if it is already authorised.
On clean-up, the status, notes and flight date move to the mission that replaces a renumbered mission.

### Choose a mission

Filters: “Type”, “Subtype”, “Rendezvous”, “Teams engaged” (min – max), “Team / aircraft type”, “Air refuelling”, “Theatre”, “Status”, “Search”. They are stored.
- “Draw at random (n)” picks a mission among those that pass the filters.
- “Clear filters”, “CSV” (export of the selection).
- Table sorted by column: Mission, Type, Title, Teams, RDV, AAR, Theatre, Status, “Est. time”, Reports (number of flights), “Generated”. The bar under the table sets its height (double-click: default height).
- ✕ removes a mission from the registry without deleting its files.

Click a row to open the mission card, described below. The link `?mission=M-016` opens the card directly.

### Mission card

The card shows the status, the itinerary, the teams and callsigns, then:
- for an operation: its members (click to show them); “Open” loads the whole operation in the generator or the studio;
- “Mission files”: YAML, “Markdown (readable)”, “PDF (generator)”, “Edit (generator)”, “Maps (studio)”, map thumbnails, previous versions and received texts;
- map state: “complete”, “partial: maps missing” or “partial: maps not generated (can be regenerated)”;
- “Estimated time” with the comparison with the reports.

Buttons: “Open in generator”, “Open in map studio”, “Assign…” (except organisation …Z; see [mission assignment](../technique/AFFECTATION_MISSIONS.md)), “Create report” or “New report (flight n)”, and “Copy prompt again” for an ordered mission.

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

Form shared with the generator.
1. Set “Type”, “Subtype”, “Theatre” and “Second theatre” (“Country” for abroad), “Series” (empty = the next one).
2. Check “Identifier” (computed, read-only).
3. Set “Flying teams”, “Rendezvous”, “Ground teams”, “Duration” (XS to XL), “Translations”, “Air refuelling”.
4. Under “Aircraft of each flying team”, enter the aircraft of teams A, B… (empty = automatic).
5. Click “Order: copy prompt and open ChatGPT”, paste into ChatGPT (Ctrl+V) then send.

The mission appears in the registry with the status “ordered”. Then save the files to the missions folder and click “Re-read folder”: the order is matched with the generated mission (same series). The settings are stored.

## ODV planning
<!-- page: apps/cpco/odv_planning.html -->

The ODV planning page brings together the week's availability, the common slots, the likely missions and the assignments. The Centre (CPCO) uses it to plan missions and give them to free pilots.
To open it: sidebar › “Centre” section › “ODV”. The page is part of the Centre: as long as the Centre is locked, a notice points to Settings › Centre (see the next chapter). In production mode, you must also be signed in with the `admin_centre` role.
The squadron's Excel workbook is optional: without it, the week is built from the availability declared by the pilots in My missions and from the assignments already saved.
Each block can be moved (↕ handle) or hidden (“Hide” / “Show”); the layout is stored for the page.

### ODV workbook

This block loads the squadron's weekly workbook (`.xlsx`). It is **hidden by default**: click “Show” in its header to display it.
- Choose the file, or drop it on the file field. It is read in the browser; nothing is sent over the network.
- On arriving on the page, the suite reopens by itself the most recent `.xlsx` workbook of the “ODV workbook folder”, if it is authorised (Settings › Installation › Sources and folders). Otherwise, it reopens the copy of the last chosen workbook, kept in this browser.
- When chosen by hand, the workbook directly shows its own week.
- Once the file is read, a summary appears: “File”, “Week”, “Duty officer”, “Theme of the week”, “Pilots”, “FLOTTE sheet”, “Timeline”, “Reading”. The “Reading report (n)” lists the warnings (⚠) and the remarks. It is expanded if it contains at least one warning.
- Anomalies (code not in the legend, duplicate trigram, offset timeline date…) are flagged by floating notifications, without ever blocking the reading.
- If a pilot of the workbook has no mission-type preferences yet, the suite creates them from their codes (C → fighter, T → transport…) and writes them into their user record.
- “Clear data” empties the page. The button stays greyed out as long as no workbook is loaded.
- The link “Settings › Centre › ODV planning” leads to the settings of the slots and of the workbook reading.
- Personal data: do not publish the exports. Workbook format and reading rules: [ODV planning](../ODV_PLANNING.md).

### Availability grid

The grid crosses the pilots with the days of the week and the three slots of each day (M = morning, A = afternoon, S = evening).
- **Week choice**: “◀ Previous week”, “Next week ▶”, “This week”, and “Workbook week” when a workbook of another week is loaded. The source shown is either “workbook …” or “pilot declarations and assignments (no workbook for this week)”.
- **Filters**, stored in this browser: “Hide empty grids”, “Trigram colour” (colour of the shape in the workbook), “Role (FLOTTE sheet)” or “Role (declared aircraft)” without a workbook, “Simulator”.
- **Legend**: workbook codes with their number of cells, then the “Pilot declarations” block, identical to the one in My missions.
- **Reading a cell**: the workbook code comes first, then the pilot's declaration. A red frame flags a pilot who is available and not assigned. A mission number flags an assigned pilot.
- **Tooltips**: the cell comment is shown on hover; the roles, the simulators and the workbook row are shown on hovering the trigram.
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
- “Fetch IVAO (preferred country)” likewise imports the week's IVAO trainings, exams and bookings, with the installation's IVAO API key (Settings › Installation). These two buttons are the import shared with the flight orders: a single file, the same sessions on both pages.
- The “×” button of a row removes the session. The “Source” column shows “fetched” or “entered”. The table first shows trainings, exams and events (exam and training marked in the margin); plain position bookings, numerous once imported, are folded under “n position booking(s)”.
- **Effect on planning**: a session is counted in its slot (★). A training or an exam makes the airfield CTR unavailable for missions in that slot; the TMAs containing the airfield should be avoided if possible.

### Area activations by network

This block is the one of the flight orders (see “Area activations”): RTBA, R, D, TRA… activations of the displayed week, VATSIM and IVAO side by side, same data. Editing restricted as in the flight orders (Centre enabled; in production, administrator).

### Common slots

This table covers the 7 days × 3 slots. Each cell gives the number of **free pilots**, that is available and not yet assigned.
- The cell marks: “+n ctrl” (controllers), “✎” (mission already assigned), “★” (event or ATC session). The tooltip also gives the headcount before assignments.
- Filters: “At least N pilot(s)”, from 1 to 20, and “Common simulator” (“any” or a simulator). They are stored with the ODV settings. A cell below the threshold is dimmed.
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

## Flight orders
<!-- page: apps/cpco/odv_orders.html -->

The Flight orders page builds the week's flight order: flight strips, control, miscellaneous items and notes placed on a timeline, with availability and area conflicts.
To open it: sidebar › “Centre” section › “Orders”. Like the rest of the Centre, it needs the Centre enabled; in production mode, you must also be logged in with the `admin_centre` role. Otherwise the page opens read-only.
Everything is saved in the shared data pool: the week's order in `data/odv/<year>-W<week>.json`, the settings in `data/config/odv.json`. Availability stays the pilots' own, and the crew of a mission flight comes from the assignments.
Times are in z (UTC). Data model: [Flight orders](../technique/ODV_ORDRES.md).

### Week

- “◀” and “▶” change the week, “This week” goes back to the current week.
- The day tabs show, in red, the number of items in conflict that day.
- “Day”, “Week” and “Statistics” change the view.
- “Duty officer” names the week's duty officer.
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
- **Choosing a mission**: the list is limited to the callsign or label entered (“SAMU” → SAMU missions); once the mission is chosen, the ODV choice window opens and its rows (posts, aircraft, pilots, callsign, ferry pilot) fill the strip; pilots available and qualified on the type are offered first. The strip takes the take-off time of the assignment (warning if they differ); “Operation mission order (n)…” chains the mission orders of the operation's strips placed that day; a strip taken back from the pool or the formations is placed at its synchronisation slot. **Refuelling**: the chosen track limits the list to its tankers; “No specific mission” puts a generic tanker on the track in the pool. A ferry moved by hand keeps its place (it follows the flight by the same gap if the flight moves); if it arrives less than 30 min before take-off, it is flagged. An availability whose category does not open the mission family, and an ATC exam or training at the departure or arrival airfield during the flight, are flagged. Below the timeline, “Assignment log” shows the last 30 operations.
- **Assignments and mission orders**: a mission assigned elsewhere (ODV planning, Registry) appears automatically as a strip on the timeline, at its take-off, with its aircraft, pilots, standby and ferry. Conversely, a mission flight with a crew but no assignment is flagged “mission order not issued” (the pilot sees nothing in My missions), and a crew that differs from the assignments “mission order to reissue”.
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

### Week and statistics

- **Week**: one row per member, one cell per day with the bar of declared availability and the number of items they appear on. A click on a cell opens their ranges for the day: category, start, end, and “Time off from”, which sets time off until midnight. The ranges are written into the pilot's declaration.
- **DLO and deadlines**: each member's permanent objectives (“＋” to add, click to edit), with an optional deadline (red at 3 working days or less, yellow at 10 or less); a DLO is closed automatically by a flight done that contains it (item DLO, label, mission) with the member in the crew. The palette shows “◎n” open DLO per member, and an item's window recalls those of the crew.
- “Availability changes” lists the declarations changed since they were last noted; “Noted” and “Note all” mark them in this browser.
- **Statistics**: planned flights, total duration, done, not done, cancelled, AAR, ME, Bâchés, MNE; per member: time available over duty hours, flight time, load (orange above 70 %, red above 100 % or with no availability).

### Area activations

This block enters the week's area activations (`data/atc/activations/<year>-W<week>.json`), in two side-by-side columns, VATSIM and IVAO: day, area, status (active, requested, refused), start, end, remark, network. A “both networks” activation appears in both columns; changing its network moves it. VATSIM does not publish activations: its column is entered by hand. In the IVAO column, “Import from IVAO” takes the schedules published by IVAO (installation API key), folded under the list, along with the week's IVAO trainings, exams and bookings (ATC sessions); entries made by hand stay. IVAO sessions are also imported automatically when a week is opened, at most once an hour, if the page can write. A change recomputes the flights' areas at once. The ODV planning shows the same block, on the same data.

### Reservation requests

This block lists the areas crossed by the week's mission flights (planned route and working areas of the mission, areas entered for a training flight) without an “active” activation of their network: day, area, network, slot, flights, status. “Record as requested” (or “Record all as requested”) adds them to the shared activations; the request itself is made on the network's site (“Copy the list”, link to the IVAO activation requests). A P area is flagged “to avoid”. When a week is opened, the page imports the IVAO ATC sessions (trainings, exams, bookings) automatically, at most once an hour, with the import shared with the ODV planning.

## Settings › Centre
<!-- page: apps/settings/centre.html -->

This page groups the everyday Centre settings: access, users, availability categories, ODV planning and report sending. It is meant for the Centre administrators.
To open it: sidebar › “Settings”, then the “Centre” tab. The sections are shown in the side menu, “Centre (CPCO)” group.
As long as the Centre is locked, only the access section is visible. In production mode, the page also requires an `admin_centre` sign-in.

### Centre access and settings

This section enables the Centre in this browser: mission generator, map studio, registry and ODV planning.
1. Enter the “Centre password” (not case-sensitive).
2. Click “Enable the Centre” or press Enter. The message “Centre enabled in this browser” confirms the activation.

Once the Centre is enabled, the section shows “Transit route calculation”:

| Field | Role |
|---|---|
| Routed leg from (NM) | distance beyond which a leg is routed |
| Airways from (ft) | altitude from which the airways are used |
| Low level up to (ft) | ceiling of low-level flight |
| Airway entry / exit (NM), RTBA entry / exit (NM) | maximum distance to join the airways or the RTBA |
| Allowed detour, airways (%), Allowed detour, RTBA (%) | tolerated detour |

An empty field takes the default value, shown greyed out. Buttons: “Save”, “Default values”, “Lock the Centre”. These settings stay in this browser.

### Users and rights

This section manages the user records. There is one record per user (`data/utilisateurs/<TRI>.json`), synchronised with the data pool.
- **Airline mode**: `develop` (security tested but not enforced: free trigram, optional sign-in) or `production` (sign-in required for My missions and the Centre, trigram set by the sign-in). This setting applies to the whole airline (`data/config/suite.json`).
- Limit: the checks run in the browser. They only really protect once verification is done by a server (web service).
- **Table**: “Trigram”, “Display name”, “Role” (“Centre administrator” or “User”), “Active”, “Password” (set, temporary or none). Every change to a row is written at once.
- **“Reset…”**: enter a temporary password (at least 8 characters), then “Reset the password”. The user must change it at their next sign-in.
- **“Impersonate”**: you act on behalf of the user. A banner recalls it on every page, each write is signed “ADM pour TOTO”, and the “End impersonation” button ends it.
- **“Add a user”**: trigram, display name, role, then “Add”.
- If the folder is empty, a record is created for each pilot of the reference.
- If some files could not yet be written to the data folder, click “Write to the data folder”.
- In production mode, resetting a password, impersonation and changing the mode are reserved for a
  signed-in `admin_centre`; adding a user and editing a row (role, active) are only protected
  by the Centre lock (see the [technical debt](../technique/DETTE_TECHNIQUE.md)).

### Availability categories

This section defines what the pilots can declare as availability (`data/config/disponibilites.json`, synchronised).

| Column | Use |
|---|---|
| id | identifier, fixed once the category is saved; entered for a new category |
| Group | group shown in the ODV (Available, SOG exercise, Busy, Unavailable…) |
| Label, Colour | label **in French only**, cell colour |
| Open themes | “every theme”, “none”, “domain …”, “… per preferences, among …”, or “theme list” (free field, themes separated by spaces) |
| Type | available, control, busy, unavailable |
| ODV codes | workbook codes read as this category on import, separated by spaces; the first one is shown in the grid |
| Retired | checkbox: the category is hidden from the lists but kept for the history |

- A category already in use cannot be deleted: it is **retired**. Only a new category, not yet saved, can be deleted with “✕”.
- “Add a category”, then “Save”. Saving is refused if an identifier is empty or duplicated, or if a French label is missing.
- Further down: “Groups (ODV)” (label, colour) and “Themes per domain” (mission families separated by spaces).
- Translations: if you change a French label, it loses its English, German and Spanish translations until the next translation audit (`tools/audit_i18n.html`).
- “Default values” restores the original categories. Added categories are kept, but retired.
See also [availability and reorganisation](../technique/DISPOS_ET_REORGANISATION.md).

### ODV planning

This section contains the Settings of the ODV planning page. They are kept in this browser and are not synchronised. An ODV page open in another tab applies them at once.

| Setting | Default |
|---|---|
| Slots (z hours): Morning, Afternoon, Evening | 8 to 12, 12 to 18, 18 to 23 (by half hour; the end must come after the start) |
| Preferred country (ATC perimeter) | “metropolitan France”; ATC sessions (trainings, exams, bookings) imported and shown for this country only, ODV planning and flight orders (the country's ICAO indicators: LF except LFV for France) |
| Week dates | “ISO week (week number of the file)”; otherwise “Date entered on the timeline” |
| Empty cell | “Not filled in” (never counted as available); otherwise “Unavailable” |
| FLOTTE types kept for roles | “All but red (not mastered)”; “Green only”; “All” |
| Missions shown per slot | 3 (from 1 to 10) |
| Order of preference at equal score | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (unknown families ignored, with a warning) |
| Restricted code (SC, C, T, N): roles of its field only | ticked |
| Ignore a group row coloured all 7 days on a slot (decoration) | ticked |

Each change is saved at once. “Default settings” restores all the values above.

### Flight orders

This section sets the Flight orders page (`data/config/odv.json`, synchronised).

| Setting | Use |
|---|---|
| Airfield (ICAO) | aeronautical day and night on the timeline |
| Default network of flights | IVAO or VATSIM, for the status of area activations |
| Delay without report before MNE (hours) | 48 by default |
| Days shown, duty hours | 7 days, 06:00 to 23:00 z; used by the timeline and the statistics |
| Flight, miscellaneous and control templates | label, duration, colour, solid fill; “Callsign colour”: the strip takes the colour of its callsign |
| Callsign colours | prefix (the longest one contained in the callsign wins), fill, outline |
| Aircraft configurations | text (KNON, TALIOS…), colour; suggested in the aircraft table of a flight |
| LL / RTBA slots (fallback) | name, start, end, days, colour, database area |
| Personnel | Staff or Members group, colour, order in the palette |
| Recurrences | repeated items; “✕” stops a recurrence |

“Save” writes the settings; “Default values” restores the original settings, except personnel, callsign colours, LL slots and recurrences.

### Report sending (web service)

This section sets up the “Send report” button of the entry pages. It sends a JSON POST (mission, report in HTML and in text, calculations) to the given address.
- Fields: “Web service address (https://…)”, “Key header” (`Authorization` by default), “Prefix (Bearer, empty for the bare key)”, “Key”.
- The address must use `https://`, except `http://localhost` or `127.0.0.1` for tests.
- The key stays in this browser (`missionSendKey:v1`) and is not included in backups. “Forget the key” clears it.
- The service must accept calls coming from the suite's address (CORS).
- The status line shows the number of reports sent from this browser.
Details: [Operations manual](../MANUEL_EXPLOITATION.md), § 10.

## Settings › Installation
<!-- page: apps/settings/installation.html -->

This page groups the one-time settings: first run, local folders, external sources and virtual airline.
To open it: sidebar › “Settings”, then the “Installation” tab.
The side menu has two groups. The “Installation” group contains “First run”; the “Folders and sources” group contains “Sources and folders”.
These sections are assigned to the page by `config/repository_tree` (key `settings.sections`: `setup` and `sources` → installation). All the other maintenance sections open on the Maintenance page.

### First run

This section shows whether the first run is complete in this browser, and on what date.
- “Open the first run” reopens the wizard (`premier_lancement.html?force`). It runs in four steps:
  1. Data: “Fetch the data” (clone of the data repository) or “Data archive…”; optionally, “Log (.html)…”.
  2. Profile: “Save the profile”.
  3. Folders: “Choose the application folder”, then the ODV workbook (“OneDrive folder…” or “or the Excel file…”).
  4. “Finish and update the SIA data”.
- “Sources and folders, virtual airline” opens the next section.
- “Update channel” opens Maintenance › Updates.
- To start from scratch: “Clean and start again…”, at the bottom of the first run. This clears the settings of this browser, not the files.
See [Installation](../INSTALL.md), § 1.

### Sources and folders

This section is the only place to set the local folders and the addresses of the external sources.
- **First run** (arriving from the launcher): a frame asks you to choose the first row, “Repository folder”. The other folders are deduced from it.
- **Local folders**: each row has its choose button and a state (“not chosen”, “authorised”, “to re-authorise”). A check flags a folder that does not seem to be the right one (marker file missing). The browser remembers the authorisation, but may ask you to confirm it after a restart.
- **Folder alert**: if the suite cannot check that the authorised data folder is the one of the served suite, an alert says so once (reading and writing then use that folder); if a save stays in the browser because it cannot be written, the alert gives the actual reason.

| Folder | Expected content |
|---|---|
| Repository folder | root of the application (contains `lancer.cmd`, `config/repository_tree`) |
| Data folder | `data/` (contains `data_tree.js`) |
| Ledger folder, Missions folder, SIA XML folder | `data/cr`, `data/missions`, `data/sia` (deduced from the data folder) |
| ODV workbook folder | synchronised folder (OneDrive…) where the squadron drops the `.xlsx` |
| X-Plane folder (landings), Performance folder, Local backup folder | CSV logs, `.lnmperf` / `.json` profiles, `defa_local_store.yaml` |

- **External sources**: the default address is shown greyed out. An entered value applies to this browser only; “↺” goes back to the default value and “Open ↗” opens the address.
- **API keys (external services)**: suite keys, shared by all its users (IVAO: API key for the area activations and the ATC sessions — trainings, exams, bookings — of the ODV planning and the flight orders). “Save” hands them to the launcher (`secrets/` at the application root, excluded from git, outside the data and the backups); the page only sees their state and last 4 characters; “Clear” removes the key.
- **Virtual airline**: “Name”, “Full name”, “Short name”, “Centre (short)”, “Centre (full name)”, and the site pages (“Home page”, “Flight log”, “Fleet”, “Aircraft page”). An empty field keeps the default value. “Back to SO Group Virtual” clears all these settings.
- **First run**: “Reopen the first run”; “Clean and start over…” clears the stored folders, the copy of the ODV workbook, the airline site credentials and the profile. The files on disk are not touched.

## Settings › Maintenance
<!-- page: apps/settings/maintenance.html -->

This page is used to maintain the suite: updates, versions, SIA data, caches, backups and reference databases.
To open it: sidebar › “Settings”, then the “Maintenance” tab. The page opens on “Updates”.
The side menu has two parts:
- the “Maintenance” group: Updates, Versions and sync, References and dependencies, Aeronautical data, Caches, Disk space, Full backup, Journal;
- the databases, arranged in the groups “Repository files”, “Base”, “Missions” and “Browser data”.

### Suite updates

This block sets where code updates come from and when the suite looks for them.
- **Channel**: `master` (stable, published versions) or `develop` (early bird, latest changes before publication).
- **Mode**: “Manual” (“Check now” button); “Automatic, regularly”, at each opening, every day, every week, at each AIRAC cycle or every month; “Disabled” (no check, no badge).
- The check queries framagit. When something new exists, an “Update” badge is shown in the header of every page.
- **Apply the update**: a web page cannot rewrite the repository. Copy the commands (“Copy” button) and run them in a terminal, at the root: `python tools/update_suite.py channel <canal>` then `python tools/update_suite.py update`. For a diagnosis: `python tools/update_suite.py doctor`.
- `update` refuses to run if tracked files are modified, only moves forward by fast-forward and logs each operation.
- **Local git repository**: choose the “Repository folder”, then “Read git state”. The table shows the branch, HEAD, origin, the tracking, master / develop, the last fetch and the channel stored by git. A mismatch with the chosen channel is flagged.
- An installation from a ZIP archive has no `.git`: it is updated with a new archive.

### Versions and synchronisation

This table gives the version and update date of each item, with a state (✓, ⚠, ✗) and the source or update tool.
- Code: suite (`repository_tree`), script cache version, git, remote channel.
- SIA / AIRAC: current cycle and next cycle, map studio base, SIA XML folder, `mora.csv`, AAR tracks (ENR 5.7).
- Reference databases: ICAO types, APD performance, fleet, reference, callsigns.
- User data: SimBrief flight plans, planner profiles, report ledger, generated mission registry, landing logs, local data, last full backup.
- “Refresh” re-reads the git state and the SIA folder.
- A warning is shown if the local data has not been backed up for more than 7 days, or if there has been no full backup for more than 30 days.

### References and dependencies

This block describes each reference of the suite:

| Column | Content |
|---|---|
| Reference, File | the reference and its file |
| Tracing | how the version is traced |
| Update | update procedure |
| Dependents | data that depend on it |
| Check | consistency checked |

References tracked: SIA XML, studio analysed base, MORA grid, AAR tracks, APD performance, fleet, planner profiles and mission prompt.
Examples of checks: mixed cycles in the SIA base, MORA obstacles from another cycle, fleet types missing from the ICAO base, prompt to regenerate (`python tools/build_mission_prompt.py`).
The “Check” button reruns the checks.

### Aeronautical data: world zones, sources and AIRAC cycles

**Zone map**: one zone per country (France groups mainland and overseas territories, the SIA coverage). Hovering it shows its sources in the right-hand panel; a click pins it: the panel stays on it while you activate it (“Activate the zone”) and set its sources. Clicking the zone again, Esc or “📌 Release” let it go.
- Colours: outline only = inactive, no data; grey = inactive, with data; orange = active, incomplete data; green = active, all data of the ticked sources; blue = hovered zone.
- Each source is ticked or unticked for its zone; only the ticked sources of the active zones go into the database. A “link” source (PDF or reference website) is not read by the suite.
- Depending on the source, the panel offers:
  - a direct download through the launcher (`tools/aero_fetch.py`): openAIP (each country), ENAIRE (Spain), FAA (United States: military areas and routes, airspace classes);
  - an order or a registration, with the link and the instructions: SIA France (0 € order, to redo at each cycle), NATS (United Kingdom, file dropped into `data/sia/zones/gb/`);
  - a PDF, with the link and the instructions: DIRCAM / MILAIP ENR 5.7 (refuelling tracks), UK military AIP, NAV CANADA;
    DIRCAM: “Import the MILAIP PDF…” reads the PDF of section ENR 5.7 (pdf.js, network at the first import), shows the number of tracks and the anomalies found, then “Write miam-enr-5-7-tracks.xml” stores the file in the SIA folder (old one in `_archives/`) and updates the database;
  - a folder of the computer: X-Plane (navaids, fixes, airways, MORA grid, cut to the outlines of the active zones that ticked it);
  - a calculation: the zone MORA.
- SIA France (France zone): “Fetch the downloaded ZIP” (the launcher takes it from Downloads), “SIA export ZIP…”, “Extract …” if it is already in the folder, “Archive the old cycles” (`_archives/`); “SIA folder content” lists the cycle files.
- The SIA keeps priority: inside the French FIRs only its airspace counts; elsewhere an airspace, aerodrome or navaid already read is not added twice. Outside France, R, D, TRA, TSA, MOA, W, A areas and MTR routes crossed by a mission appear in its airspace to activate.
- Website addresses (SIA, DIRCAM, NATS, UK military AIP, NAV CANADA) are set in Settings › Installation › Sources and folders › External sources; the SIA and X-Plane folders there are the same as here.

**Aeronautical database: sources, cycles and rebuild**: cycle in force, next cycle and database cycle, then a table of all ticked sources of the active zones (zone, source, files, cycle or date, age, size, state). A click on a row pins its zone and updates the source (download, SIA ZIP, MILAIP PDF import, X-Plane folder, zone MORA).
“Recompute all” rebuilds the database with all active zones (a few seconds; the browser may ask to authorise the folder); “Purge the cache” empties it. It is the same block as in the map studio.
Table states:
- SIA: cycle read from the file names, “old” if it precedes the cycle in force;
- X-Plane: “Custom Data” cycle;
- downloaded files: “old” after 28 days (one AIRAC cycle).

**MORA**: several sources.
- The computed grid (`data/sia/mora.csv`) has priority. “Simple recalculation” takes the obstacles of the new cycle (offline); “Full calculation” redoes terrain and peaks (network, about one minute) for the theatres and missions; “Compute the zone MORA” (panel) does it over the extent of one zone, the other cells being kept.
- If cells change: “Write mora.csv (old one archived)”, then commit the data repository.
- Elsewhere, the X-Plane MORA grid completes it, if the X-Plane source is ticked.

**Consistency**: “Check” verifies airspace, aircraft, fleet, performance and mission aerodromes.
AIRAC XML files (about 80 MB per cycle) stay outside the repository, like the files of the other sources. MORA values are computed, not certified.

### Caches

This block purges the data the suite can rebuild. No user data is touched (ledgers, drafts, profiles, OFPs, backups).

| Cache | After “Purge” |
|---|---|
| Data index (IndexedDB `defaIndex`) | cleared, then rebuilt from the files the next time pages load |
| Aerodromes used | read again from the world database on next use |
| World aerodrome database (jsDelivr) | CDN purge requested, then file reloaded |
| Analysed SIA base | to be re-read from the SIA folder (a confirmation is asked) |
| Update check | read again at the next check |
| Application files (HTTP cache) | “Reload without cache”: files reloaded, then page reloaded |

Purge the “Data index” when a page shows outdated data after a file change made outside the suite, without the launcher.
“Purge all and reload” runs all the purges in a row, after confirmation.

### Disk space

This block only appears if the Centre is enabled.
- “Compute used space” measures the missions folder (`data/missions`): per mission, per file type and in total. It also shows the space used by the browser.
- “Aeronautical data, by zone”: space of the SIA folder by zone (sources and number of files; mora.csv counts for all zones). A deactivated zone keeps its files: delete them by hand to free the space.
- “Delete surplus maps” removes the maps that are no longer in their mission's list.
- “Purge all generated maps” and “Purge PDFs” free up space; these files are regenerated from the YAML.
- Each deletion asks for confirmation.
- Previous versions and received texts form the history: they are never purged here.
- The missions folder must be authorised in Sources and folders.

### Full backup

This block produces a ZIP archive of all the local data, with a manifest (`manifest.json`, SHA-256 hashes).
- **Content**:
  - the browser, always included;
  - “Data repository (data/ …)”;
  - the landing logs (X-Plane folder);
  - the performance profiles;
  - the folders added with “Add a folder…” (a name and a file filter).
- Each source can be ticked or unticked. The “include heavy files” option adds the PNG, ZIP and PDF maps as well as the AIRAC XML files.
- “Create full backup” writes the archive to `sauvegardes/` of the local backup folder; if this folder is not authorised, the archive is downloaded.
- “Changes since” compares the folders with the last full backup.
- **Reload a full backup**: “Choose the archive…”. Each file gets a state: identical, missing from disk, older or newer on disk. Tick the files you want, then “Restore selection”.
- Before being replaced, the files are copied to `_avant_restauration/` of their folder. The browser data is merged: the most recent value wins.
- Deliberately left out of the backup: web service key, ongoing network tracking, analysed SIA base, folder authorisations.

### Backup and reload journal

This table logs each operation on the data, with the date, the operation (and the page), the origin and the result. The details of the added (+) or modified (~) keys can be expanded.
Operations logged:
- reload of the local data (☰ › Local data › Restore);
- full backup and restore of a full backup;
- extraction of the SIA export and archiving of old cycles;
- MORA recalculation.
As long as none of these operations has taken place, the journal is empty.

### fleet (known aircraft)

This database (`data/references/aircraft_fleet.js`) lists the aircraft offered in the reports: “Operator”, “ICAO type”, “Variant”, “Registration”, “Code”, “Number”, “Callsigns” (comma-separated), “Base”, “Operational”.
- **“Paste the website Fleet page…”**:
  1. open the “Virtual fleet” page of the airline's website (link in the window);
  2. press Ctrl+A then Ctrl+C, and paste into the area (Ctrl+V); you can also use “Read the clipboard” or “or saved page…”;
  3. click “Read”.
- An aircraft from the page replaces the one in the file (same registration) but keeps its extra callsigns. Aircraft missing from the page are kept.
- The status line gives the number of aircraft updated, added and kept. Check, then “Save to repository”.
- **Buttons common to the repository databases**: “Apply in this browser” (local changes take priority), “Save to repository” (writes the file to the Repository folder, to be committed), “Download”, “Discard changes”, “Back to repository file”.
- **Automatic**: the launcher itself reads the website's public Fleet and Flight log pages (no login), once a day when a page opens, with the same rules as pasting; it writes `data/references/aircraft_fleet.js` and `defa_reference.js`, to be sent with “Synchronise”. Setting and “Update now”: under the list of aircraft in the reporting (below). Pasting and the script (`python AircraftDB/update_fleet.py Flotte.html`) remain possible.
- **Where**: Settings › Centre › “Fleet (known aircraft)”, restricted while the Centre is locked (previously in Maintenance).
- **Aircraft in the reporting**: below the fleet, all the aircraft flying in the mission log (type, callsigns, operator, flights, last flight). “Personal” box, ticked by default: individual aircraft, outside the SOG fleet; unticking it adds it to the fleet (it becomes assignable), ticking it again removes it. Then “Save to repository”: the fleet and the index of individual aircraft (`data/references/aircraft_personal.js`) are written together. An aircraft on the website's Fleet page comes back into the fleet at the next update.
- **Types and performance**: “Refresh types and performance” completes the types unknown to the database (fleet and reporting); the daily update from the website also does it, in the background, for the fleet, the log and the individual aircraft.
- **Aircraft aerodrome (base)**: it only changes through the update from the website, or through a report issued from a mission order with a real landing aerodrome; a report outside a mission order or a landing report does not move the aircraft. An aircraft added from the reporting comes in without an aerodrome. The current aerodrome is the “Location” column of the website's Fleet page (kept with the date of its last change), unless a more recent report issued from a mission order gives an actual landing aerodrome (`missions/aircraft_positions.json`); ferries start from there (assignment, ODV planning, flight orders, aircraft sheet).

### Aircraft types (ICAO base)

This database (`AircraftDB/aircraft_db.js`) contains two tables:
- “Types”: “Designator”, “Model”, “ICAO description”, “WTC”, “Wing”, “Source”;
- “Aliases (common name → designator)”.
Changes are also carried over to `aircraft_overrides.json`. The buttons are those of the repository databases.
The “Procedure” gives the commands of the refresh script, to be run from `AircraftDB`: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. The database is not published with the suite (ICAO and EUROCONTROL data): the “Aircraft types and performance” card in Settings › Maintenance › References and dependencies completes it on this computer, type by type, never all at once — a code typed in (“Add / update”), the unknown types, the fleet types or the mission types (ODV, registry); it needs the launcher and the network, then reload the page (a button offers it at the end). The card is at the top of the block; with an empty database it is outlined, a notification says so and “Complete the database” takes the fleet and mission types in one click. The files written (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) need nothing: the pages read them; not versioned, they are completed on each computer or copied from one to another.
Limit: a type deleted here may come back at the next refresh, if it is part of the script's base list.

### Callsign correspondence

This database (`data/references/callsigns.js`) links the full callsign (kept in the reports) to its flight plan form (item 7) and to the ICAO operator (OPR/, item 18).
- “Callsigns” table: “Full callsign”, “Flight plan”, “Other forms”, “Organisation”, “OPR/”, “Types”, “Role”, “Generic”, “Telephony”, “Note”.
- “Organisations → ICAO designator (OPR/)” table.
- There is no script: this page (or the file, edited by hand) is the source.
- To feed it: forms corrected in the reports arrive in “Learned callsigns”, and the series seen in the log arrive through “Add” or “Complete”.

### reference (anonymised, in the repository)

This database (`data/references/defa_reference.js`) lists the pilots (trigrams) and aircraft, without the flights or the missions. It is an input aid and is not exhaustive.
- “Aircraft” table: registration, type, variant, status, home base (editable), last known AD, entry into service, callsigns used, first and last flight, flights, fleet record, note.
- “Pilots” table: trigram, first and last flight, flights, types, note.
- Update:
  1. load the flight log (next section);
  2. click “Update the reference (anonymised)”: nothing is deleted, and manual entries are kept;
  3. “Save to repository”, then commit.
- Script alternative: `tools/defa_reference.py`.

### flight log (flights performed)

This database is separate from the mission registry. It is kept only in this browser: out of the repository and out of the local backup, because it contains trigrams.
- “Load / update the log…” accepts the “Log des vols” page copied or saved, or a CSV / JSON export. Flights are merged without duplicates.
- “Callsign series”: “Add” creates the row in the callsign correspondence; “Complete” adds the forms and types seen to it.
- “Flights”: full-text filter, 300 rows shown at most.
- Actions:
  - “Update the reference (anonymised)”;
  - “Export CSV”;
  - “Export JSON (reloadable)”;
  - “Clear the base from this browser”.

### Merges and renames (pilots, aircraft)

This table lists the equivalences created by “Merge with… / rename” from the records. Columns: “Type” (pilot or aircraft), “Old”, “Becomes”, “Result”.
These equivalences apply to the reloaded log, to the reference and to the catalogue.
“Delete” removes an equivalence, after confirmation.
A loop (A → B and B → A) is highlighted: it swaps the two names. Delete the faulty entry, then redo the merge from the record.

### Mission ledgers (operations database)

The single ledger `data/cr/missions.yaml` groups all the families. It is the source of truth for reporting.
- One row per family, with the number of missions and the buttons “Edit (YAML)”, “YAML”, “CSV”, “Reporting”.
- “Edit the full ledger (YAML)” opens the editor; “Check and save” checks the YAML before writing. In the full ledger, each mission must have its family.
- “Ledger folder…” chooses the folder to write to. Without this folder, the save stays in the browser.
- “Download the ledger (YAML)”, “Export CSV (spreadsheet)”.
- To correct a single mission, go through its report instead (click on the reporting row).

### Aircraft of saved missions

This database is kept by the browser (`missionAircraftRegistry:v1`). Aircraft are stored in it each time a mission is saved; the most recent data wins over the fleet.
Columns: registration, type, variant, category, callsign, code, operator, date.
Buttons: “Save” (in the browser) and “Discard changes”.

### Types added locally

This database lists the unknown types entered in missions: designator, model, category, date added.
“Integrate into repository base” copies these types into “Aircraft types (ICAO base)” and opens that database. You then still have to apply it or save it to the repository.

### Learned callsigns (corrected flight plan forms)

This database lists the flight plan forms corrected by hand in the reports: full callsign, flight plan, date.
“Integrate into repository base” adds them to the “Callsign correspondence” and opens that database. Check, then apply or save.

### Aerodromes used (cache)

This database keeps the coordinates and time zones of the airfields already used, for sunrise, sunset and weather: ICAO, name, country, latitude, longitude, elevation (ft), time zone.
It can be corrected by hand (“Save”). It can also be purged in “Caches”: it is then rebuilt from the world database.

## Synchronise the data

The shared data (availability, users, configuration, missions and assignments, reports, ATC sessions) lives in `data/`. This folder is a git repository separate from the code repository. The “Synchronise” button in the header exchanges it with the other computers.

### The “Synchronise (n)” button

- The button only appears if the suite is served by the launcher and `data/` is a git repository.
- (n) adds up the changes of this computer to send and the commits to receive. The remote repository is re-read every 5 minutes while the page is visible. The tooltip gives the branch and the date of the last synchronisation.
- Synchronisation is started by hand, with one click:
  1. the files kept in the browser are first written to the folder;
  2. the launcher commits in the name of the signed-in trigram (impersonated user included);
  3. it fetches and merges the changes of the other computers, then pushes.
- Without a trigram, synchronisation is refused: set it in Settings › My profile.
- At the end, a notification gives the number of files sent and received, and the pages re-read the changed files.
- **Gap with the backup**: the button turns orange (change not sent for more than 48 h, 20 or more files to send, 10 commits to receive, unsent commit, file changed outside the synchronised data) or red (`data/` without a git repository or without a remote, merge in progress, high thresholds: 100 files, 7 days, 50 commits); reasons in the tooltip, alert as a notification once per session. Without a git repository (except the trial data), a “⚠ Backup” button says so. Thresholds can be set in `data/config/suite.json`, key `sync`.

### First synchronisation

The first click sends everything that has never been committed in `data/`. If the remote branch does not exist, it creates it.
Message “Local commit only: no remote repository”: `data/` has no remote repository, so nothing is shared.
The git credentials are those of the system (SSH key, credential manager); the suite stores none.

### Several users, until the central server

- Each computer **receives** at each launch (the launcher runs a `git pull` of `data/`) and **sends** with the
  “Synchronise” button (commit, merge with the others, push).
- Each computer that sends needs: git, the suite opened by the launcher, **write access to the data repository**
  (one account per person on the git host, or a shared account) and an SSH key or HTTPS credentials
  stored in Git.
- The repository address is specified and checked in the First run (step 1, “Data synchronisation git
  repository” card): never blocking, a repository that does not answer is only flagged.
- A computer without git or write access can write to a **shared folder** (Synology, OneDrive…) that an
  equipped computer synchronises. The central server will remove these prerequisites: an account will be enough
  ([roadmap](../technique/ROADMAP.md), step 2).

### Conflicts and the `_conflits/` folder

The launcher resolves conflicts record by record, without ever losing anything:
- **record modified on two computers**: the most recent wins. The other version is kept in `<dossier>/_conflits/` and flagged by a notification;
- **assignments**: merged assignment by assignment;
- **assignment log**: both sides are combined;
- **file deleted on one side and modified on the other**: the modified version is kept.
After a conflict notification:
1. open the copy shown in `_conflits/`;
2. carry over by hand what is missing into the kept file;
3. synchronise again, then delete the copy.
The report ledger (`cr/missions.yaml`) is merged by hand.
Message “A merge or rebase is in progress in data/”: finish or abort the git operation (`git -C data merge --abort`), then start again.
Details, diagrams and risk-free tests: [synchronisation architecture](../technique/SYNCHRONISATION.md).

## Launcher, data and backups

The suite is served by a small local server, supplied with it. The data lives in three places: the `data/` folder, the browser and the local backup file.

### Start the suite

- **Windows**: double-click `lancer.cmd`. **macOS / Linux**: `sh lancer.sh`. Both call `tools/launch.py`, which follows three steps:
  1. **Python**: it is looked for, and installed if needed (version 3.8 at least).
  2. **Data**: if `data/` is present, it is updated (`git pull --ff-only`, without blocking on failure). Otherwise, a `.zip` archive dropped next to the launcher is extracted; failing that, the data repository is cloned.
  3. **Server and browser**: the server starts on `http://127.0.0.1`, on the first free port from 8000, then the browser opens. If the suite is already running, only the browser opens.
- Leave the launcher window open while you use the suite; close it (or Ctrl+C) to stop the suite.
- Options: `--port 8010`, `--page apps/…`, `--no-browser`, `--no-data`, and `--data <dossier>` to serve another copy of the data under `/data/`, without clone or update. The `--data` option is for tests, for example of synchronisation.
- Recommended browser: Chrome or Edge. For Brave, see [Installation](../INSTALL.md).

### The `data/` folder

- The application and the data are separate. `data/` is a separate, private git repository, placed in the application folder; the code repository ignores it.
- Without access to the data repository, the suite starts on the examples in `examples/`. You can also ask for a data archive by email.
- A synchronised folder (Synology Drive, OneDrive…) is fine, provided you **exclude the `.git` folders** from synchronisation.
- The files in `data/` are authoritative: the browser index is rebuilt from them (Maintenance › Caches › “Data index”).

### Backups

- **Browser data**: use ☰ › Local data.
  - “Backup folder…” is chosen once, ideally in a synchronised folder.
  - The `defa_local_store.yaml` file is then written automatically.
  - “Restore / resync” merges this file with the browser: the most recent data wins.
- **Full backup** (browser and files of the authorised folders): Settings › Maintenance › Full backup (see above).
- Do not version `defa_local_store.yaml`: it contains personal data.
- Code update: Maintenance › Updates, or `python tools/update_suite.py update`. A code update does not touch the data.
To go further: [Operations manual](../MANUEL_EXPLOITATION.md), § 2 and § 3; [Installation](../INSTALL.md); [suite data](../DONNEES.md).
