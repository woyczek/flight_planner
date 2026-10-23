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

- Centre locked: the sidebar, the ☰ menu and the home page follow the usage level, not the lock; a Centre page opened without it shows the “Restricted access” notice, except the Board (“Schedule” entry), viewable read-only.
- A Centre page opened directly (bookmark, link) is covered by a “Restricted access” notice with the links “Enable the Centre…” and “Home”.
- In Settings › Centre, only the “Centre access and settings” section stays visible; the others (“Users and rights”, “Availability categories”, “ODV planning”, “Report sending (web service)”) are hidden.
- Activation is stored in this browser only: repeat it on each computer and after clearing the site data.

Limit: this is a usage lock, not security. The password is written in clear in `data/config/centre.json`, shared with the data (`DEFA` by default), and shown next to the “Enable the Centre” button: this is the **standalone mode**. Group mode (signed registry, access by the administrator role) is set in the “Group mode (signed registry)” section below ([design](../technique/COMPTES_SIGNES.md)).

### Enable or lock the Centre

1. Open ☰ › Settings, “Centre” tab, “Centre access and settings” section.
2. Enter the password shown next to the button (“Password: DEFA” by default) in “Centre password” (not case-sensitive).
3. Click “Enable the Centre” or press Enter. The status line shows “Centre enabled in this browser”.

The Centre entries appear at once, without reloading the page. The section then shows “Mode and access” (Centre mode; “Centre password (shared with the data)” and “Save the password”: written to `data/config/centre.json`, it goes out at the next “Synchronise”), then the “Transit route calculation” settings:

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

## Settings › Centre
<!-- page: apps/settings/centre.html -->

This page groups the everyday Centre settings: access, users, availability categories, ODV planning and report sending. It is meant for the Centre administrators.
To open it: sidebar › “Settings”, then the “Centre” tab. The sections are shown in the side menu, “Centre (CPCO)” group.
As long as the Centre is locked, only the access section is visible. In production mode, the page also requires an `admin_centre` sign-in.

### Centre access and settings

This section enables the Centre in this browser: mission generator, map studio, registry and ODV planning.
1. Enter the “Centre password”, shown next to the button (`DEFA` by default; not case-sensitive).
2. Click “Enable the Centre” or press Enter. The message “Centre enabled in this browser” confirms the activation.

Once the Centre is enabled, the section shows “Mode and access” (mode, change of the shared password), then “Transit route calculation”:

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

### Group mode (signed registry)

For an airline that shares `data/` through git: roles, accounts and passwords come from the **signed user registry**
(`data/utilisateurs/_registre.json`). Every browser refuses what is not signed by an admin: a user file changed in the
repository (“I give myself the admin role”) no longer has any effect. Design: [signed accounts](../technique/COMPTES_SIGNES.md).
- **State**: mode (standalone, group being set up, group active), accepted registry version, confirmed founder, admins
  and their device fingerprints, recovery key, this device's fingerprint.
- **“Switch to group mode”** (Centre enabled, launcher up to date: its security policy is required): you become the
  first admin with this device's key; the existing user files go into version 1 of the registry. Type the **recovery
  key** password twice: the file `sog-cle-secours-<fingerprint>.json` is downloaded, encrypted with that password. Keep
  it offline (USB stick) and the password separately. Send your fingerprint to the pilots through another channel
  (Discord, SMS, email).
- **Group being set up**: as long as there are not two admins with a device key, the Centre stays accessible with its
  password. Once the group is active, Centre access goes through the device key of a registry admin.
- **Changing a role, a state or a password** (Users and rights) publishes a new version, signed with this device's
  key: reserved for a registry admin; otherwise the message says so and nothing is written.
- **“New recovery key”** (admin) replaces the recovery key; **“Back to standalone mode”** (admin): the registry stays in
  the data but is no longer read.
- **“Use the recovery key”** (section open even with the Centre locked): file, password and trigram; that trigram
  becomes admin with this device's key. For admins who have lost their device.
- **“Re-found the group”** (last resort, all keys lost): new registry, new recovery key; every other device will have
  to confirm your fingerprint.
- **Refused versions**: a version badly signed, out of the chain or older is refused; the device keeps its own, a
  notification and this section say so.
- On the first reading of the registry, a device shows the founder's fingerprint with “Confirm” and “Reject”: compare
  it with the one received before confirming.
- **Device access requests**: a pilot requests access from My profile › This device, on a device with the launcher as
  well as on the app without launcher (phone); the request is a file signed with the key of their device
  (`data/utilisateurs/demandes/`). The section lists trigram, device name, date and the fingerprint recalculated by your
  page (“new user” if the trigram is not in the registry yet; “invalid request” if the signature or the fingerprint
  does not hold). Compare the fingerprint with the one the pilot gave you through another channel, then **“Approve”**
  (new registry version with their key, user created if needed with the user role) or **“Reject”** (request removed).
  A request can come from anyone with access to the repository: only the fingerprint proves the device.
- **Device keys**: each key of the registry, by user; **“Revoke”** (admin) publishes a version without it: its later
  signatures are refused, the device will have to request again. Deactivating a user (Users and rights) revokes all
  their keys. The last admin with a key cannot lose it, and an active group cannot drop below two admins with a key.
- **“Activate the group”**: the card only shows once two admins have a device key (a second admin: “Centre
  administrator” role in Users and rights, then their request approved). Until then nothing changes and nothing is
  ignored. Once the group is active: the Centre only opens with an admin key (the password no longer counts); unsigned
  data stay accepted for 30 days, with the “unsigned” mention, then are ignored (signed assignments: next batch).
- App without launcher (GitHub mode): a new device follows the registry chain through the repository history (commits
  API); requests, approvals and revocations are commits there. Switching to group mode or re-founding needs a device
  with the launcher.

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
| Preferred country (ATC perimeter) | “metropolitan France”; ATC sessions (trainings, exams, bookings) imported and shown for this country only, ODV planning and the Board (the country's ICAO indicators: LF except LFV for France) |
| Week dates | “ISO week (week number of the file)”; otherwise “Date entered on the timeline” |
| Empty cell | “Not filled in” (never counted as available); otherwise “Unavailable” |
| FLOTTE types kept for roles | “All but red (NQ: owned, not qualified)”; “Green only”; “All” |
| Missions shown per slot | 3 (from 1 to 10) |
| Order of preference at equal score | AAR, AIRBORNE, ISR, SPECIAL, SAR, MARITIME, FIRE, AIRLIFT, HEMS, TRAINING (unknown families ignored, with a warning) |
| Restricted code (SC, C, T, N): roles of its field only | ticked |
| Ignore a group row coloured all 7 days on a slot (decoration) | ticked |

Each change is saved at once. “Default settings” restores all the values above.

### Board

This section sets the Board page (`data/config/odv.json`, synchronised).

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

This page groups the one-time settings: local folders, external sources, virtual airline, aeronautical data and aircraft types.
To open it: sidebar › “Settings”, then the “Installation” tab. This tab appears from the Planning usage level (2); a direct address to one of its sections opens it at any level.
The side menu has a single group, “Folders and sources”: “Sources and folders” (open from the start), “Keys and external services”, “Aeronautical data” and “Aircraft types”.
The first run has its own tab, “First run”, described in the [user manual](MANUEL_UTILISATEUR.md#first-run); “Clean and start again…” is at the bottom of that page. See also [Installation](../INSTALL.md), § 1.
These sections are assigned to the page by `config/repository_tree` (key `settings.sections`: `sources` and `keys` → installation; `sia` and `types` → installation,maintenance, i.e. on both pages: set-up here, update in Maintenance, same blocks). All the other maintenance sections open on the Maintenance page.

In GitHub mode (app without the launcher: website, iOS app; data access set in My profile › Data access), Installation shows only the “Data access” card: data repository (link `https://github.com/<repository>`) and branch, access status (token check), last successful read, writes pending in the browser outbox (“Synchronise” button to send them), the aircraft type database read from the repository, a link to the virtual airline website and a link to My profile › Data access. Local folders, IVAO keys and SIA import are set on a computer with the launcher: the “Sources and folders”, “Keys and external services”, “Aeronautical data” and “Aircraft types” cards and the “First run” tab are not offered. The mode depends only on the data access setting, not on the device: the card is the same in a desktop browser. On the Maintenance page, this mode offers only what works without the launcher or folders: versions, aeronautical data (the database published to the data repository by a workstation with the launcher: zones, cycle, “Re-read the published base”), browser caches and storage, browser backup (downloaded archive, no backup folder) and journal; updates, references and dependencies, and aircraft types are not offered. Folders remembered by this browser from an earlier use with the launcher are ignored: the data come from the GitHub repository. When the page is served by the launcher (GitHub mode set in that same browser), Maintenance shows all its cards and their buttons, with on “Aeronautical data” and “Aircraft types” the sentence “GitHub mode active in this browser: the data read come from the repository, publications are made on this workstation (launcher).”

### Sources and folders

This section is the only place to set the local folders and the addresses of the external sources.
- **First run** (arriving from the launcher): a frame asks you to choose the first row, “Repository folder”. The other folders are deduced from it.
- **Local folders**: each row has its choose button and a state (“not chosen”, “authorised”, “to re-authorise”). A check flags a folder that does not seem to be the right one (marker file missing). The browser remembers the authorisation, but may ask you to confirm it after a restart.
- **Folder alert**: if the suite cannot check that the authorised data folder is the one of the served suite, an alert says so once (reading and writing then use that folder); if a save stays in the browser because it cannot be written, the alert gives the actual reason.

| Folder | Expected content |
|---|---|
| Repository folder | root of the application (contains `lancer.cmd`, `config/repository_tree`) |
| Data folder | `data/` (contains `data_tree.js`) |
| “Derived folders (3)”, folded: ledger, missions, SIA | `data/cr`, `data/missions`, `data/sia`, set with the data folder |
| ODV workbook folder | synchronised folder (OneDrive…) where the squadron drops the `.xlsx` |
| X-Plane (second line: “Landing logs: other folder…”), Performance folder, Local backup folder | X-Plane installation folder (navigation data `earth_*.dat`, Custom Data; CSV landing logs, unless another folder is chosen), `.lnmperf` / `.json` profiles (read again by Fuel, “Performance profiles” block, as soon as the folder changes), `defa_local_store.yaml`; optional, shown “optional, not chosen” (information) until chosen |

- **External sources**: the default address is shown greyed out. An entered value applies to this browser only; “↺” goes back to the default value and “Open ↗” opens the address.
- **API keys (external services)**: link to the “Keys and external services” section, the one place for the suite keys.
- **Websites the suite may contact**: fixed list (maps, networks, weather, SimBrief) and configuration addresses, plus the websites allowed on this computer (“Remove”); a website is added with “Allow this website…” in the block notification, confirmed in the launcher window (kept in secrets/sites.json).
- **Read-only folders**: the application folder, X-Plane folders, the ODV workbook and folders added to the backup are authorised for reading (“authorised (read)”); writing is only requested at the moment of an action that needs it (restore, “Save to the repository” for AircraftDB). The data (`data/` and its subfolders) is authorised for writing.
- **Opening from another website or an extension**: refused by default (a suite page opened by a link from another website, or by an extension such as Claude in Chrome, shows “Suite page opened from another website: refused”). “Allow until the launcher closes…” permits it after confirmation in the launcher window; a red “⚠ Reduced protection — restore” button then stays in the header of every page. Data, scripts and launcher settings stay closed to other websites.
- **Virtual airline**: “Name”, “Full name”, “Short name”, “Centre (short)”, “Centre (full name)”, and the site pages (“Home page”, “Flight log”, “Fleet”, “Aircraft page”). An empty field keeps the default value. “Back to SO Group Virtual” clears all these settings.
- **First run**: “Reopen the first run”. To start from scratch, “Clean and start again…” is at the bottom of the first run page (“Start again” section).

### Keys and external services

One place for the suite keys, shared by all its users: one card per service. Elsewhere (first run, reports, Board, ODV
planning), the suite only shows the key state and points here.
- **IVAO**: suite API key (developers.ivao.aero). It is kept by the launcher (`secrets/ivao.json` at the application
  root, excluded from git, outside the data and the backups); the page only sees its state: “saved on … UTC (…abcd)”,
  “missing”, or “IVAO_API_KEY environment variable” (takes priority, not editable here). “Save” replaces the key then
  tests it; “Test” makes a control call (“OK: key accepted by IVAO, N tracker sessions read over the last hour”, or
  “key refused”); “Remove” deletes it after confirmation. “Used for”: Report › Prefill from my last flight, Board
  (IVAO activations and ATC sessions), ODV planning (IVAO ATC sessions).
- **VATSIM**, **SimBrief**: no key (public APIs); the card says what uses them and points to My profile for the CID
  and the SimBrief login.
- **Airline website**: no key or password (the launcher reads the public pages); address in Sources and folders,
  login in My profile.
- **Report sending web service**: its key stays in this browser, set in Settings › Centre › Report sending (link);
  the card shows whether it is saved.

A key missing or refused by IVAO (401 / 403) is reported where it is used (“IVAO key refused by IVAO: replace it in
Settings › Installation › Keys and external services”) with the link “Open the keys ↗”.

## Settings › Maintenance
<!-- page: apps/settings/maintenance.html -->

This page is used to maintain the suite: updates, versions, SIA data, caches, backups and reference databases.
To open it: sidebar › “Settings”, then the “Maintenance” tab. The page opens on “Updates”. This tab only appears at the Expert usage level (4); a direct address to one of its sections opens it at any level.
The side menu has three parts:
- the “Maintenance” group: Updates, Versions and sync, References and dependencies, Aeronautical data, Aircraft types;
- the “Storage and backup” group: Caches, Disk space, Full backup, Journal;
- the databases, arranged in the groups “Repository files”, “Reference and log”, “Missions” and “Browser data”. These groups only appear at the Expert level.

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

**Zone map**: one zone per country (France groups mainland and overseas territories, the SIA coverage), plus an oceanic zone, “North Atlantic (oceanic, NAT)”, whose sources are X-Plane (oceanic points and routes, outside any country) and today’s NAT tracks. Hovering it shows its sources in the right-hand panel. **One click adds the country to the selection, another removes it** (chosen countries in blue with a dark outline); the bar under the map lists them (to activate, to deactivate, “Cancel”). **“Activate”** applies the selection, then chains by itself, for all chosen countries still incomplete, everything the suite can do: downloads of their sources, latest ZIPs from Downloads (SIA, NATS…), a single database rebuild, then the MORA of each country that has none — only if the database was rebuilt (double gauge: step and detail; a failed source does not stop the others; summary in a notification). A country’s panel keeps “Activate the zone” / “Deactivate the zone” and, for an active zone, “Fetch and recompute everything”. What is left to do by hand (order on the SIA website, PDF to import, X-Plane folder, files to drop…) is listed under the map, “Actions to do”: one line per source, with its link and its button; downloads and the MORA, done by “Activate”, fit on a single “automatic” line.
- Colours: outline only = inactive, no data; grey = inactive, with data; orange = active, incomplete data; green = active, all data of the ticked sources; light blue = hovered zone; blue with a dark blue outline = chosen country (“Activate” to apply).
- Each source is ticked or unticked for its zone; only the ticked sources of the active zones go into the database. A “link” source (PDF or reference website) is not read by the suite. **Setting up only redoes what is missing**: an up-to-date source is not downloaded again (“Fetch and recompute everything” checks it again, without rewriting anything if the server has nothing new), an identical file is not rewritten, and the database is only read again if a file, a zone or a source has changed; run again with nothing new, it downloads, writes and recomputes nothing. **“Purge the zone…”** (zone that has data) deletes, after confirmation, its files from the SIA folder (for France: the SIA XMLs and the ENR 5.7 tracks) and its `mora.csv` cells (old file in `_archives/`), deactivates it and reads the database again; the X-Plane folder is not touched. Activating it again reinstalls everything.
- Depending on the source, the panel offers:
  - a direct download through the launcher (`tools/aero_fetch.py`): openAIP (each country), ENAIRE (Spain), FAA (United States: military areas and routes, airspace classes), UK military AIP (ENR 5.2, official PDF read by the launcher: low flying areas, VATA, TVAA avoidance area, AARA refuelling tracks added to the DIRCAM ones), NAV CANADA (Designated Airspace Handbook, current edition read by the launcher: Canadian danger, restricted and advisory areas, to download again every 56 days), today’s NAT tracks (North Atlantic zone: Shanwick and Gander message published by the FAA, to download again before each transatlantic flight, the tracks changing twice a day; “old” after 12 hours; named points placed from the X-Plane source of the zone);
  - an order or a registration, with the link and the instructions: SIA France (0 € order, to redo at each cycle), NATS (United Kingdom, file dropped into `data/sia/zones/gb/`);
  - a PDF, with the link and the instructions: DIRCAM / MILAIP ENR 5.7 (refuelling tracks);
    DIRCAM: “Import the MILAIP PDF…” reads the PDF of section ENR 5.7 (pdf.js, network at the first import), shows the number of tracks and the anomalies found, then “Write miam-enr-5-7-tracks.xml” stores the file in the SIA folder (old one in `_archives/`) and updates the database (“Stop” during the reading: nothing is kept or written);
  - a folder of the computer: X-Plane (navaids, fixes, airways, MORA grid, cut to the outlines of the active zones that ticked it);
  - a calculation: the zone MORA. A very large zone (more than 1500 one-degree cells: United States, Canada…) takes the X-Plane MORA by default; “Full calculation…” computes it in 10° blocks, after a confirmation that states the volume (AWS open terrain tiles raised by 100 m, no OpenStreetMap query): each block is written to `mora.csv` at once, “Stop” between two blocks, “Resume the full calculation…” later.
- SIA France (France zone): “Fetch the downloaded ZIP” (the launcher takes it from Downloads), “SIA export ZIP…”, “Extract …” if it is already in the folder, “Archive the old cycles” (`_archives/`); “SIA folder content” lists the cycle files.
- The SIA keeps priority: inside the French FIRs only its airspace counts; elsewhere an airspace, aerodrome or navaid already read is not added twice. Outside France, R, D, TRA, TSA, MOA, W, A areas and MTR routes crossed by a mission appear in its airspace to activate.
- Website addresses (SIA, DIRCAM, NATS, UK military AIP, NAV CANADA) are set in Settings › Installation › Sources and folders › External sources; the SIA and X-Plane folders there are the same as here.

**Aeronautical database: sources, cycles and rebuild**: cycle in force, next cycle and database cycle, then a table of all ticked sources of the active zones (zone, source, files, cycle or date, age, size, state). A click on a row pins its zone and updates the source (download, SIA ZIP, MILAIP PDF import, X-Plane folder, zone MORA). At the top of the table: the number of checks without issue, then the problems (missing sources) and the warnings (old ones); “Show the problems” keeps only them. The table is sorted by state (problems first) and can be sorted by column.
“Recompute all” rebuilds the database with all active zones (a few seconds; the browser may ask to authorise the folder); “Purge the cache” empties it. It is the same block as in the map studio.
Table states:
- SIA: cycle read from the file names, “old” if it precedes the cycle in force;
- X-Plane: “Custom Data” cycle;
- downloaded files: “old” after 28 days (one AIRAC cycle) since the download or the last check without change.

**Database published to the data repository**: at each rebuild, the database is also written zone by zone into the data folder, `data/sia/base/<zone>/<cycle>.json` (one zone, plain JSON: a few hundred KB up to about 5 MB for France), and the cities into `data/sia/base/cities.json`. A file is rewritten only if its content changes; older cycles of the zone are removed. The rebuild report says what was published; “Synchronise” sends it. The data folder must be authorised (Installation › Sources and folders), otherwise the report says why the database was not published. Phones and the website (GitHub mode) read these files: they have no SIA folder and no rebuild, but the same database as the workstation that published it.

**MORA**: several sources.
- The computed grid (`data/sia/mora.csv`) has priority. “Simple recalculation” takes the obstacles of the new cycle (offline); “Full calculation” redoes terrain and peaks (network, about one minute) for the theatres and missions; “Compute the zone MORA” (panel) does it over the extent of one zone, the other cells being kept.
- If cells change: “Write mora.csv (old one archived)”, then commit the data repository.
- Elsewhere, the X-Plane MORA grid completes it, if the X-Plane source is ticked.

Computed grid method: for each 1° × 1° cell, the highest point among the terrain (AWS Terrarium elevation tiles), the OpenStreetMap peaks and the obstacles of the SIA AIXM, plus 1000 ft (2000 ft above 5000 ft), rounded up to the next hundred; without the OSM peaks, the terrain is raised by 100 m. Theatres covered: métropole, Corse and overseas territories, plus the extents of the registry missions located elsewhere (terrain and peaks only). On the maps, the value is written at the centre of the cell in ICAO notation (3⁵ = 3500 ft); when zoomed out, the cells are grouped 2 × 2 then 4 × 4 (highest value). The SIA ENR 6.1 chart is not used as a source (irregular areas).

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
- Deliberately left out of the backup: web service key, ongoing network tracking, analysed SIA base, folder authorisations, flight log (reloaded from the website), company website credentials.

### Backup and reload journal

This table logs each operation on the data, with the date, the operation (and the page), the origin and the result. The details of the added (+) or modified (~) keys can be expanded.
Operations logged:
- reload of the local data (☰ › Local data › Restore);
- full backup and restore of a full backup;
- extraction of the SIA export and archiving of old cycles;
- MORA recalculation.
As long as none of these operations has taken place, the journal is empty.

### fleet (known aircraft)

This database (`data/references/aircraft_fleet.js`) lists the aircraft offered in the reports: “Operator”, “ICAO type”, “Variant”, “Registration”, “Code”, “Number”, “Callsigns” (comma-separated), “Home base”, “Operational”. “ICAO type” offers the type base (a drop-down list with search, by code or model name); free entry is still possible.
- **“Paste the website Fleet page…”**:
  1. open the “Virtual fleet” page of the airline's website (link in the window);
  2. press Ctrl+A then Ctrl+C, and paste into the area (Ctrl+V); you can also use “Read the clipboard” or “or saved page…”;
  3. click “Read”.
- An aircraft from the page replaces the one in the file (same registration) but keeps its extra callsigns. Aircraft missing from the page are kept.
- The status line gives the number of aircraft updated, added and kept. Check, then “Save to repository”.
- **Buttons common to the repository databases**: “Save to repository” highlighted (writes the file to the Repository folder, to be committed); under “More…”, “Apply in this browser” (local changes take priority), “Download”, “Discard changes”, “Back to repository file”. The status line says where the content comes from: “State: repository file, no change in this browser”, or the local changes and their date.
- **Automatic**: the launcher itself reads the website's public Fleet and Flight log pages (no login), once a day when a page opens, with the same rules as pasting; it writes `data/references/aircraft_fleet.js` and `defa_reference.js`, to be sent with “Synchronise”. Setting and “Update now”: under the list of aircraft in the reporting (below). Pasting and the script (`python AircraftDB/update_fleet.py Flotte.html`) remain possible.
- **Where**: Settings › Centre › “Fleet (known aircraft)”, restricted while the Centre is locked (previously in Maintenance).
- **Fleet map**: separate page, for everyone (Report › Fleet, see the user manual); the “Fleet map” button above the table leads to it. It shows each aircraft at its current aerodrome, with filters, hover (last flight) and selection; with the Centre enabled, its “Edit the fleet” button brings you back here.
- **Aircraft in the reporting**: below the fleet, all the aircraft flying in the mission log (type, callsigns, operator, flights, last flight). “Personal” box, ticked by default: individual aircraft, outside the SOG fleet; unticking it adds it to the fleet (it becomes assignable), ticking it again removes it. Then “Save to repository”: the fleet and the index of individual aircraft (`data/references/aircraft_personal.js`) are written together. An aircraft on the website's Fleet page comes back into the fleet at the next update.
- **Types and performance**: “Refresh types and performance” completes the types unknown to the database (fleet and reporting); the daily update from the website also does it, in the background, for the fleet, the log and the individual aircraft.
- **Aircraft aerodrome (base)**: it only changes through the update from the website, or through a report issued from a mission order with a real landing aerodrome; a report outside a mission order or a landing report does not move the aircraft. An aircraft added from the reporting comes in without an aerodrome. The current aerodrome is the “Location” column of the website's Fleet page (kept with the date of its last change), unless a more recent report issued from a mission order gives an actual landing aerodrome (`missions/aircraft_positions.json`); ferries start from there (assignment, ODV planning, Board, aircraft sheet).

### Aircraft types (ICAO base)

This database (`AircraftDB/aircraft_db.js`) contains two tables:
- “Types”: “Designator”, “Model”, “ICAO description”, “WTC”, “Wing”, “Source”;
- “Aliases (common name → designator)”.
Changes are also carried over to `aircraft_overrides.json`. The buttons are those of the repository databases.
The “Procedure” gives the commands of the refresh script, to be run from `AircraftDB`: `python update_aircraft_db.py --no-network`, `--add <types>`, `--refresh-icao`. The database is not published with the suite (ICAO and EUROCONTROL data): the “Aircraft types” section of Settings › Maintenance completes it on this computer, type by type, never all at once. It reads in three steps: “What it is” (the ICAO record, which gives the icon and the class 2P, 2T, 4T…, and the EUROCONTROL performance); the table of the fleet, mission and report types (silhouette, code and model, ICAO class, record ✓ or missing, key performance — ceiling, cruise, V2, Vat — with the detail as a tooltip and the EUROCONTROL link, use); then “Complete automatically (n)”, which downloads what is missing. A free code is typed under “Download other types…” (folded); “Edit the database by hand…” (Expert level) opens this database. One group per aircraft: the labels of missions and reports (“A332 A330 MRTT Phénix”, “A330 MRTT PHÉNIX”) are brought back to the ICAO code (fleet, aliases, usual names; alias chain followed, for example A4M → A400, a house code brought back to the ICAO designator); a type written in plain text in a report is recognised instead of creating a local type. A type without EUROCONTROL performance is estimated: “≈ 2,000 kg/h, 480 kt (known type)” or “(ICAO class L2J)”, the same fallback as the fuel planner (`shared/fuel_reference.js`). It needs the launcher and the network; when the pass ends, the page reloads by itself and shows the summary. The files written (`AircraftDB/aircraft_db.js`, `aircraft_perf.js`) need nothing: the pages read them; not versioned, they are completed on each computer or copied from one to another. The same pass also reads the public SimBrief list (one request, kept for a week; `--simbrief` on the command line): cruise fuel flow (kg/h), weights (empty, zero fuel, landing, maximum fuel), ceiling and speed of 224 types, stored in `aircraft_perf.js` next to the EUROCONTROL records; a value whose accuracy SimBrief does not guarantee is an estimate. Finally, Airframe DB (`--airframedb`, at most 40 records per pass, 30-day cache) adds aliases (names in use, such as H125 → AS50, and simulator names → ICAO code, never replacing an existing alias nor diverting an official designator) and the published characteristics (speeds, ceiling, climb rate, weights, range) of types without an EUROCONTROL or SimBrief record, military aircraft and helicopters included. As a last resort, a designator that neither ICAO nor EUROCONTROL knows (retired type, such as the S210 Caravelle) is looked up on Aviation Fanatic: one page per type, name, ICAO description (L2J…) and wake category, kept on this computer (source “Aviation Fanatic”).

For phones and the website (GitHub mode), which have no launcher, “Publish the aircraft database to the data repository” (Expert level, under the table) copies `aircraft_db.js` and `aircraft_perf.js` into `AircraftDB/` of the data repository and removes everything else from that folder (caches, scripts, `__pycache__`), then synchronises. Before doing anything, the page shows the list of what will be copied (+) and removed (−) and asks for agreement. Both files must be plain values (checked by `tools/data_guard.py`, like the other data files). The database is never published on the public website.
Limit: a type deleted here may come back at the next refresh, if it is part of the script's base list.

### Callsign correspondence

This database (`data/references/callsigns.js`) links the full callsign (kept in the reports) to its flight plan form (item 7) and to the ICAO operator (OPR/, item 18).
- “Callsigns” table: “Full callsign”, “Flight plan”, “Other forms”, “Organisation”, “OPR/”, “Types”, “Role”, “Generic”, “Telephony”, “Note”.
- “Organisations → ICAO designator (OPR/)” table.
- There is no script: this page (or the file, edited by hand) is the source.
- To feed it: forms corrected in the reports arrive in “Learned callsigns”, and the series seen in the log arrive through “Add” or “Complete”.

### Company fleet and pilots (anonymised reference)

This database (`data/references/defa_reference.js`) lists the pilots (trigrams) and aircraft, without the flights or the missions. It is an input aid and is not exhaustive.
- “Aircraft” table: registration, type, variant, status, home base (editable), last known AD, entry into service, callsigns used, first and last flight, flights, fleet record, note.
- “Pilots” table: trigram, first and last flight, flights, types, note.
- Update:
  1. load the flight log (next section);
  2. click “Update from the flight log” (here) or “Update the reference (anonymised)” (in the log): nothing is deleted, and manual entries are kept;
  3. “Save to repository”, then commit.
- Script alternative: `tools/defa_reference.py`.

### flight log (flights performed)

This database is separate from the mission registry. It is kept only in this browser: out of the repository and out of the local backup, because it contains trigrams.
- “Load / update the log…” accepts the “Log des vols” page copied or saved, or a CSV / JSON export. Flights are merged without duplicates.
- “Callsign series”: “Add to the correspondence” creates the row in the callsign correspondence (notification with “Open the correspondence”, filtered on the row); the series becomes “In the correspondence ✓”; “Complete” adds the forms and types seen since.
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
- (n) adds up the changes of this computer to send and the commits to receive. The remote repository is re-read at the frequency set in Settings › Maintenance › Versions and synchronisation (every 30 minutes by default; on every page, 3 times a day, once a day); between two checks, the button shows the last known state, kept by the browser, and the launcher answers with its last reading. The tooltip gives the branch and the date of the last synchronisation.
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

- Each computer **receives** at each launch (the launcher updates `data/` from the repository, sending nothing) and **sends** with the
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
  2. **Data**: if `data/` is present, it is updated without `git pull`: the pool files changed on this computer are committed first (“Modifications du poste <TRI>”), then the remote branch is merged record by record as with the “Synchronise” button, sending nothing. A file outside the pool changed locally (for example `sia/mora.csv`) is left as it is; if the update would overwrite it, the update is put off and the console names it. The console says what was done (files committed, received, reception put off and why); never blocking. Otherwise, a `.zip` archive dropped next to the launcher is extracted; failing that, the data repository is cloned.
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
To go further: [Operations manual](../MANUEL_EXPLOITATION.md), § 2 and § 3; [Installation](../INSTALL.md).
