<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->

# Maintenance — manual

The Maintenance app is for the airline's administrator: the data it publishes for the pilots (Data module), the fleet and
its performance sheets (Aircraft module), and the suite's administration (Settings, Administration card). It opens at the
Full level. With the workstation's launcher it writes; without a launcher, or from a paired device, it is read only.

## First start

- **The entries.** On a phone, the bottom bar carries Maintenance's modules: Data, and Aircraft at the level that opens
  it. Top right, as in Pilot, "?" opens this help and ⚙ the Settings, the Administration card included. On a screen they
  are the entries of the left column, with Administration, Help and the workstation's service pages (pilots' tokens,
  devices, V2 maintenance page). The application's name, top left, opens the list of applications: one tap goes to Pilot.
- **The help.** It opens at the chapter of the screen shown; this manual covers Maintenance only, Pilot's stays in Pilot.
- **The app's status.** The dot of the ⚙ (green: something new; orange: something needs your attention) leads to the
  “Status” block at the top of Settings.

<!-- chapter: data -->
# Data

What the airline publishes for the app — the aeronautical base, the procedures, the aircraft, the weather — and the state of each data set. This screen is for reading, and offers actions on every group: Download the sources, Build, Purge, then Publish.

## How to use it

<a id="data-cycle"></a>**The cycle in force.** At the top, the current AIRAC cycle (for example 2610), its dates and the number of days before the next one. Below, "Launcher of this workstation" or "No launcher: read only" says whether this computer has a launcher.

<a id="data-coverage"></a>**The coverage.** The list of zones (countries, regions) this workstation follows. On the first opening it holds every zone the airline publishes; the list is kept on this device. “Add a country” puts into the coverage a zone the suite knows, even one nobody publishes yet: it is ticked for “Build”.

<a id="data-states"></a>**The States.** Under the coverage, the States are sorted by colour: green, procedures are already published; orange, they can be read on demand; red, nothing is readable. The reason is written on each line, the colour is never alone. Beyond seven lines, "n more" unfolds the rest.

<a id="data-group-base"></a>**Aeronautical base.** One line per source that feeds a zone of the coverage: its cycle, its age ("published 3 days ago"), the number of zones published and a state badge. Tap a line to see the source's link with its address, its licence, the zones it feeds and what each zone has published.

<a id="data-group-proc"></a>**Procedures.** The procedures of France (SIA eAIP) and of the United States (FAA CIFP), with the number of aerodromes published.

<a id="data-group-aircraft"></a>**Aircraft.** The aircraft types and their performance: the edition date, the number of types and of files. After 28 days the badge turns orange.

<a id="data-group-weather"></a>**Weather.** The world weather and the NAT tracks are published with the website: these lines have neither a cycle nor a badge.

<a id="data-states-pill"></a>**The badges.** "Up to date": nothing to do. "Cycle out of date": the published cycle is older than the cycle in force (orange, red after a week). "Old parser": published by an older version of the builders. "Over 28 days old": a set without a cycle, published more than 28 days ago. "Not in the repository": nothing is published. A group opens by itself when one of its lines needs attention.

<a id="data-more"></a>**The other data sets.** At most seven lines per group; "n more data sets" unfolds the rest and the sources that are only considered or set aside (their link, licence and status).

<a id="data-build"></a>**Build the base.** At the top of the Aeronautical base group, the "Download, build, purge" panel acts on the ticked zones with three buttons, in this order: Download · Build · Purge. "Build" rebuilds the base of the ticked zones on this workstation's launcher: a windowless browser (Edge, else Chrome) builds the zones one after the other, and each one is saved to the data repository as soon as it is ready. Every zone of the coverage is ticked at the start; untick the ones you do not want to redo. The three buttons go grey together, with their reason written once below: "The workstation launcher is needed", "Another operation is running", "Tick at least one zone", "Offline".

<a id="data-build-personal"></a>**Personal-licence sources.** ENAIRE (Spain), NATS (United Kingdom) and the X-Plane data are offered only when a ticked zone uses them, and are never ticked by default: tick them only if the data repository is used by you alone. With X-Plane ticked, the build runs in the page, which is not yet possible here: it will stop with that reason.

<a id="data-build-run"></a>**While it builds.** A bar, "n of m zones", the step and the elapsed time; one line per zone says waiting, building (n / m sources), built, failed with its reason, or cancelled. "Stop" asks for the stop: the zone in progress finishes, the zones already built are kept. You can leave the screen: the build goes on in the launcher and is found again when you come back. If the launcher stopped on the way, the screen says "Build interrupted" with the last state of each zone: start again, unticking the zones already done if you like.

<a id="data-build-end"></a>**At the end.** A notification gives the counts ("Base built: 3 zones; 1 failed (gb)") and the summary stays in the panel with what to do: a failed zone (the reason is written on its line: windowless browser, time limit, invalid output, could not write…), a stopped build, no browser found ("Neither Edge nor Chrome was found on this workstation: install one of them."). The state of the lines is read again afterwards.

<a id="data-download"></a>**Download.** The "Download" button fetches, on this workstation's launcher, the raw sources of the ticked zones (openAIP, FAA, UK Mil AIP, NAV CANADA, today's NAT tracks; ENAIRE only if it is ticked among the personal-licence sources). One line per zone says where it stands ("downloading (2 / 3 sources)") and, below it, one line per source: downloaded (n files), unchanged, failed with its reason and HTTP code ("HTTP 404"), skipped (licence not declared) or manual. What has not changed is never rewritten. At the end a notification gives the counts ("Downloaded: 2 zones changed, 1 unchanged; 1 failure"); the sources the launcher does not download (the SIA, for example) are listed by name, with a link only if their address is https, "to be dropped in by hand"; if source files tracked by git were modified, the screen says so ("n source files changed, outside the synchronised data"). "Nothing to download for these zones": none of the ticked zones has a downloadable source. Two downloads cannot follow each other within 30 s: the screen says "Try again in n s".

<a id="data-zone-map"></a>**The map of the zones to tick.** Above the list of zones (base panel) and of States (procedures panel: France and the United States), a real map (the application's shared map base, as the Map and the Weather use) draws the zones filled with the tint of their state: you pan and zoom it with the finger, and the "Recenter" button brings the view back to all the zones. Tapping a zone ticks or unticks it, exactly like its box in the list (one selection: the map and the list are both redrawn from it); dragging or pinching the map ticks nothing. With the keyboard, the list is the path: its boxes tick with Space. The colour follows the state (up to date, cycle out of date or missing, running, not in the coverage: the legend under the map names them in words) but is never alone: a ticked zone has a thick outline and a fuller tint. During an operation, the map is frozen like the list. An outline that is only the zone's frame is dashed; the legend recalls it. When the map cannot come (offline without a map background in memory, no WebGL, or the frame does not give the outlines), the list stands alone, with no error message.

<a id="data-pickup"></a>**Take the downloaded file.** Some sources do not download by themselves (the SIA for France, NATS for the United Kingdom): you download them in your browser, then "Take the downloaded file" (the second button of the base panel, and under the "to be dropped in by hand" line of a download) looks in this workstation's Downloads folder for the most recent zip with the expected name (for example EG_*_DS_*_XML.zip). The plan first and one question: for each zone the zip found (name, number of files, size), what is missing (with the expected name), where the files go (data/sia/, data/sia/zones/gb/); they are raw sources of this workstation, never committed. Nothing found: no question, the screen says what is missing. At the end: "Taken: n files (x MB)", the failures named (zip too large, nothing useful in the zip…) and "Now start Build". "Update all" never starts this take: it stays a gesture. The button is greyed with its reason if this workstation's launcher does not know the operation yet. The take only brings the zip the plan showed (name and size): if another zip arrived during the question, that source is refused ("the file changed since the plan") and nothing is taken for it; "Run the plan again" shows it anew. A zip whose name is outside the rule (letters, digits, dot, hyphen, underscore, space, parentheses) is shown by the plan but never taken: its line says "file name to rename: letters, digits, . _ -"; if nothing else is left to take, no question is asked.

<a id="data-purge"></a>**Purge.** The "Purge" button removes from this workstation the raw sources of the ticked zones (the ones you download again) and their caches. It first works out the plan without erasing anything, then asks one question: "Purge 15 files (14.3 MB) from the sources of Spain, France?". If the SIA files (France) are part of it, the question recalls that they also serve the outlines of the other zones when building; files tracked by git are always kept and counted. No: nothing is removed. Yes: the purge runs and the screen says "Purged: n files, x MB", with the paths refused (left in place). Nothing to remove: "Nothing to purge", with no question.

<a id="data-publish"></a>**Publish the base.** Under "Build", the "Publish the base" panel sends what was built on this workstation to the data repository. A built zone is committed whole on the workstation and also leaves at the next synchronisation: “Publish” sends it right away. It first says where the workstation stands: "3 files changed · 2 commits to send", the date of the last pass and, if there is one, the merge waiting in data/ (publishing concludes it first). Tap "Publish": one question recalls the files and the commits, then the pass runs; an endless bar shows that it is working. Meanwhile the buttons of the "Download, build, purge" panel are grey, and "Publish" is grey during any operation of that panel: one operation at a time.

<a id="data-publish-end"></a>**At the end of the publication.** A notification gives the counts and the result stays in the panel: what was sent (files committed, files received); the files of the base kept on the workstation because a build was under way; the conflicts (the most recent is kept, see Settings › Conflicts); the files refused because they are not in the format of a data file. A failure says so in one sentence, with what the launcher answers: nothing is lost, the files stay on the workstation. The button is grey with its reason written below: "The workstation launcher is needed", "A build is running: publish when it is finished", "Nothing to publish", "The frame cannot publish the base yet: update the app", "Offline".

<a id="data-set-panels"></a>**The same buttons for every group.** Each group has its "Download · Build · Purge" panel: the Aeronautical base, the Procedures, the VFR points of the VAC charts (in the Aeronautical base group, under "Publish") and the Aircraft. The principle is the same everywhere: one operation at a time, all panels together (it is found again when you reopen the screen); one line per item while it runs, an end sentence and a notification, a line in the journal; "Purge" first works out a plan without deleting anything, then asks one question. Procedures: tick the States that are read in bulk, France (the SIA's eAIP) and the United States (the FAA's CIFP); none is ticked for you. States read through EAD Basic are never read in bulk: one aerodrome at a time, with "Read again" in Fuel or on the Map. VFR points: the cycle in force, no box to tick; "Download" fetches the cycle's VAC charts ("n charts not published yet" is not a failure); "Build" first needs this cycle's France base, the downloaded charts and pypdf (the first-install assistant installs it), and says when nothing was committed for lack of a trigram; "Purge" empties the charts cache of all cycles. Aircraft: ICAO types separated by commas or spaces (2 to 4 letters or digits); a refused code is said and nothing is sent, an empty field means the fleet's types; the lines of the run are the three steps (types, performance, SimBrief profiles). The weather has no panel: it is published with the site. A button greyed with "This workstation's launcher does not know this operation yet": the launcher of this workstation is older than the app, update it. Nothing is committed by "Download" or "Purge". "Build" commits its results on the workstation, except for the aircraft: this workstation's AircraftDB/ folder is not versioned, sending is done by "Published sheets". While a merge is waiting in data/, no build or sheets publication writes anything: the screen says "A merge is waiting in data/: synchronise first (Settings › Synchronisation)". During an update of the suite no operation starts (base, other sets, chain, file pickup, sheets): the screen says "Suite update under way: try again after the launcher restarts"; the state and the following of a job already running go on.

<a id="data-aircraft-sheets"></a>**The airline's published sheets.** Under the Aircraft, "Publish" copies the airline's sheets to the data repository. It first works out a plan without changing anything, then asks one question (sheets to copy, sheets to remove, total size); if you accept, the copy, the commit and the sending are done in one gesture. It needs your trigram (Settings › Identity); without it the screen says so and nothing is sent. With nothing to copy or remove: "Nothing to publish".

<a id="data-update-all"></a>**Update all.** Under the coverage, the "Update all (n data sets)" button redoes in one gesture what the panels have chosen: for each data set, in the published order (the aeronautical base, the procedures, the VFR points, the aircraft), "Download" then "Build"; never a purge, never the published sheets. A plan first and one question: the AIRAC cycle, the data sets with what each touches (zones, States, cycle, types or the fleet's types), the size of the downloads (not known beforehand); a data set with nothing ticked, with refused types or whose verbs the launcher does not know is skipped, with its reason. Then a chain line says the data set and the step under way ("2 / 4 data sets") with a single "Stop" for the whole chain; the other buttons are greyed. The chain stops at the first failure (even a partial one), at the requested stop, or if a merge is waiting in data/: what is already built stays committed on the workstation, nothing is published, and the screen says which data set and why. A download with nothing new ("nothing to download", charts not published yet) does not stop it. If everything succeeded, one publication goes, with no question other than the plan; if it is impossible (the frame cannot publish, nothing to send), the chain says so. The journal keeps one line for the whole chain, with each data set's result; one notification at the end. If the page is reloaded on the way, the launcher's running job is found again, but the chain does not go on: "Chain interrupted by the reload: start "Update all" again". An attention dot marks the base's "Build" and "Update all" when the published cycle is older than the cycle in force ("Cycle 2610 out of date, rebuild for 2611").

<a id="data-journal"></a>**The journal.** At the foot of the screen, the last 50 operations of this device: UTC time, verb, zones, result.

## Special cases

- **Without a launcher**: the screen reads the same way; it shows what is published.
- **A read that fails**: the section says so in one line, the rest of the screen is drawn.

<!-- fr: 161ad6b91c7d -->

<!-- chapter: aircraft -->
# Aircraft

The company's fleet, as the other screens read it: the report (registration → type, callsigns), the map, the CPCO. The performance sheets are in the same screen ("Sheets" tab); the type registry will come.

## How to use it

<a id="aircraft-fleet"></a>**The fleet.** One row per aircraft: registration, type, callsigns, base, "out of service" when it is. The search filters on the registration, the type, a callsign or the base; seven rows are shown, "N more" unfolds the rest. "Add" opens an empty aircraft.

<a id="aircraft-edit"></a>**Editing an aircraft.** A tap on a row opens it: identity (registration, type, variant, operator) and operation (callsigns separated by commas, base, tactical number, in service). Under the fields, a line says what will change ("2 fields changed: base, callsigns"); "Save" writes it. A type the database does not know is kept as typed, and the screen says so. The registration is the key: two aircraft cannot share it. The location the site gives stays as it is. "Retire" asks, then the aircraft leaves the fleet; its performance sheet, if it has one, is kept.

<a id="aircraft-sheets"></a>**The sheets.** The "Sheets" tab lists the performance sheets by family (helicopters, turboprops, jets, pistons, others); the search filters on the name, the type or the registration. Each row says where the sheet comes from, what it lacks and its date; a fleet type without a sheet is offered "to complete". "Import a file" reads a CSV, a JSON, a .lnmperf or a SimBrief OFP; "Paste a text" reads a pasted text, a ChatGPT answer included; "New sheet" asks for the type code. Nothing is written at once: an import first shows, field by field, what would change; untick what you keep, then "Apply the selection". The chosen tab is kept on the device, and the link `#aircraft?sheet=<id>` opens a sheet's editor directly.

<a id="aircraft-sheet-edit"></a>**Editing a sheet.** "Edit" opens the editor: the fields by group (identity, fuel, runway and alternate, climb, cruise, descent, RPM), the RPM / fuel flow table on a large screen, and the EUROCONTROL completion, "complete from another sheet" or the ChatGPT request to fill the empty fields. Under each filled field a muted line gives its origin and date ("lnmperf · 28/10", "edited · 30/10"); hovering it shows the discarded values. "Save" opens the preview of the changes, which are written only after "Apply the selection"; each changed field thus keeps its source, and the old value is kept. "Export .lnmperf" and "Export JSON" download the sheet; "Delete" asks before removing the sheet from the shared database.

## Good to know

- The Site module also updates the fleet from the pasted "Fleet" page of the site: both write the same file, each save reads the file just before and changes one aircraft only.
- Nothing leaves before the next synchronisation.

<!-- fr: 6c68e01d8018 -->

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
key, the Little Navmap sheets and the computer access come at the Everyday level. At the Everyday and Full levels, the
cards are arranged under seven titles, in the order things are set: Identity, Access, Data, Device, Display,
Administration (Full level) and Help. Each title is folded; touch it to open it. A group that needs attention (a warning,
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
“Administration” card (see “A git repository for data/”).

**No access and no launcher, no bases.** A device with no access set and no launcher — the website opened on a phone
for the first time, for instance — has neither the aeronautical base (airspaces, airfields, beacons) nor the aircraft
base: “Offline data” says so. Two ways in: set the access to the data repository, even without ticking an exchange (it
then only reads the bases); or, on a workstation with the launcher, publish the bases to the repository (V2: Settings ›
Maintenance › Aeronautical data and Aircraft types), then synchronise. Three distinct states when the base is missing: “Aeronautical database loading…” (the read is not over: wait), “Data access not set on this device” (set the access above; an app added to the home screen has its own storage, nothing you set in Safari is there) and “Aeronautical database not published” (the access works, nothing is published in the repository).

**Synchronisation.** With an exchange ticked, the “Synchronisation” card gives the last success, the pending writes and
the network; “Synchronise now” sends and receives at once. Otherwise it runs by itself at start, every 10 minutes online
and when the network comes back. While writes are waiting, the card lists them, newest first: path, module and time, ✕
for a deletion, with the last error if there is one.

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

On a workstation served by the launcher, the "Little Navmap sheets (.lnmperf)" card links your performance sheets
with the .lnmperf files of a folder, both ways. Choose the folder (Little Navmap's is offered when found), then
"Save". After that, nothing to do: a sheet changed in Fuel rewrites its file, a file changed in Little Navmap updates
the sheet, a new file becomes a sheet. If the same value changed on both sides, the newest wins and the other stays
kept in the sheet; the synchronisation button says so. A file is never deleted: the file of a removed sheet goes to
the `_removed` subfolder. "Synchronise now" runs a pass at once, "Stop" cuts the link. Sheets missing a value that
Little Navmap requires are listed and not written. On a phone, Fuel downloads the sheet as a .lnmperf file.

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

**Preparing the configuration (administrator).** On a workstation served by the launcher, or on a device set up on
GitHub, at the “Full” level, tap “Export a configuration for a pilot” in the “Administration” card: it lists your steps in order. First
invite the pilot's GitHub name to the repository, with the Write role (the link leads to the repository's collaborators
page). Then type their trigram and the address of the published app, and “Create the file and the link”: the file
sog-config-<TRI>.json is saved, the link and its QR code are shown. They hold the airline, the data repository, the
trigram and how to create the token, never a token or a secret; the repository's owner (user or organisation) is noted
in them, and decides which token to create. Send the link or the file, or have the pilot's phone scan the QR code.

**Joining the airline (pilot).** The link, the QR code, “Import a configuration…” or “Join the airline…” (“Data access”
card) and the welcome card of the first opening open the “Join the airline” assistant, one screen per step: the
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
key `edge`; the edge line is shown until you set it); the “Runway thresholds on the map” button, which unfolds a list from 8 to 16: the zoom from which the map draws the runway thresholds (saved at once for the airline, same file, key `runwayZoom`; 11 until you set it); the “Export a configuration for a pilot” button (see “Configuring a pilot”);
on a workstation served by the launcher, the “Remote repository of data/” and “Airline API keys (IVAO, EAD Basic)” buttons, which
unfold their setting (see “A git repository for data/” and “The airline's API keys”); the roadmap (`#roadmap`) and the diagnostics of the “About” card.

**Add a pilot (administrator).** At the “Full” level, the “Add a pilot” button of the “Administration” card (where the export is possible) prepares everything for a pilot who has nothing yet. Type their trigram, their name if you want to greet them, the language of the message and the published app’s address, then “Prepare”: you get the configuration link and file (the same as the export), your steps, and a message ready to copy, in the chosen language. For a GitLab repository, your steps are: create the pilot’s project token (one per pilot, name = their trigram, role Developer, scope `api`, expiry date 90 days advised and 365 at most, never without a date), copy it at once (GitLab shows it only once), check that the data branch lets Developers push, and know how to revoke (Settings › Access tokens › Revoke). With the launcher, “Create their token” opens the “Pilots’ tokens” screen with the trigram already typed: the launcher creates the token with the administrator’s; the steps by hand stay folded below. Without a launcher, they are open. **Send the token apart from the message** (another channel, or paste it in front of the pilot): it is never in the link or in the message. For a GitHub repository, the steps are the export’s.

<a id="settings-sources"></a>**Data sources.** The “Data sources” button (`#sources`, Full level) lists the sources of aeronautical data the suite uses, considers or has set aside: for each, what it gives, its licence, its status and a link that opens in a new tab; for those that change with each AIRAC cycle (SIA, VAC, eAIP, CIFP), the link is the one of the cycle in force, written at the top of the screen. The screen downloads nothing. Under the button of the Administration card, the absolute address of the screen, to open or bookmark (“Copy the link”). It replaces the data laboratory, removed on 28 October 2026.

**The benches, on a workstation.** Served by the launcher, they only open on a workstation with a launcher (elsewhere
they are named without a link); paths relative to the root of the suite: `labs/design_primitives.html` (primitives and
designs), `frame/aerodb/bench.html` and `frame/aerodb/offline_bench.html` (aeronautical base, online and offline),
`frame/store/test/` (data layer, against the fake GitHub) and `modules/maps/test/render.html` (map rendering).

**The workstation's V2 pages.** Shown only when a launcher serves the page: Settings › Maintenance
(`apps/settings/maintenance.html`), First launch (`apps/settings/premier_lancement.html`) and the map studio
(`apps/cpco/map_parser.html`).

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
  one project access token per pilot (named after the trigram, Developer role, one year at most), shows it once only, and
  revokes it. The launcher uses the administrator's token there (secrets/gitlab.json), which it never shows. Set the
  data branch so that the Developer role may push to it.
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

<!-- fr: 5bb5ad1309e3 -->
