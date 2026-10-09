# User manual

This manual describes the SO Group Virtual (Virtual Special Operation Group) suite for **pilots**: one chapter per page, one section per tab or per
block, in the order in which they appear. In the suite, the **“Help”** entry of the side bar opens this manual at the
chapter of the current page. The Centre and the administration of the suite are described in the
[administrator manual](MANUEL_ADMINISTRATEUR.md); for a first step-by-step report, see the
[tutorial](../TUTORIAL.md). Index of all the documentation: [documentation index](../README.md).

## Getting started
<!-- page: index.html -->

The “SO Group Virtual” suite brings together in the browser everything a pilot needs: missions assigned by the Centre, availability, flight maps, fuel, mission reports, landings and reporting.
All pages share the same landmarks: a side bar on the left, a header at the top, sometimes tabs, then blocks.
This chapter describes these common elements; the following chapters describe each page in detail.
The home page (`index.html`) lists the applications as cards and shows the version of the suite.
Open the suite from the launcher or a bookmark: a suite page opened from a link on another website (webmail, forum…) is refused, so that this website can neither read nor trigger anything in it.

### The side bar

The left-hand column gives access to the applications. The entry of the page on screen is highlighted.

What it shows depends on your **usage level** (My profile › “Usage level”): at most seven entries, never more than your use needs.

| Entry | What it opens | Level |
|---|---|---|
| “Today” | Next mission, reports to write, week; first entry at every level | 1 |
| “My missions” | Missions assigned by the Centre and availability (red badge: unread missions) | 1 |
| “Report” | Entry of a mission report | 1 |
| “Schedule” | Weekly order schedule (Board, read-only at level 1 or without the Centre); at level 4, common slots and likely missions of the ODV page | 1 |
| “Missions” | Mission generator and registry, as tabs; map studio at level 4 | 3 |
| “Tools” | Flight maps, fuel, landings, mission analysis (tools ticked in My profile, all at level 4) | 1 to 4 |

- The level arranges the interface, it grants no rights: the Centre pages (Missions, ODV planning, changing the Board) still require the Centre enabled.
- At the bottom of the column: “Settings” (My profile, Appearance, Centre, Installation, Maintenance, First run, as tabs) and **“Help”**. These two entries stay fixed at the bottom of the screen: only the upper list scrolls when there are too many icons (window under 460 px high: the whole bar scrolls).
- “Help” opens the documentation in a window, above the current page, directly at the chapter of that page. The window closes with ✕, Esc or a click beside it; reopened, it resumes where you were. “↗” opens it as a full page (Ctrl-click on “Help”: in a new tab). It replaces the old “Menu” entry. It also works when the suite is opened from the disk, without the launcher: the documents are built into the page.
- The logo at the top of the column opens the virtual airline's website in a new tab.
- The bar is hidden on a narrow screen (less than 760 px) and when printing. You can hide it or always show it: Appearance › Icons › “Side bar”.

### The header

The header shows the page title and its subtitle. On the right are the tools, which only appear when they are useful:

| Element | Role |
|---|---|
| Sealed envelope (red envelope with a number) | Missions assigned to you have not been read yet. A click opens “My missions”. |
| “Synchronise (n)” | Exchanges the shared data with the common repository. N = changes to send + updates to receive. At levels 1 and 2 a dot replaces the number (it stays at the top of the tooltip); the “(n)” counter is shown at levels 3 and 4. |
| “Save to folder (n) · last: …” (red button) | Reminder to back up the local data, shown from 10 unsaved changes. |
| “⚠ n” | Page alerts already cleared from the screen: a click shows them again. |
| “Language” flag | Choice of language: “Auto” (browser language), Français, English, Deutsch, Español. |
| ☰ | Full menu of the suite. |

**“Synchronise”** only exists if the suite is opened with the launcher and the `data/` folder is a git repository.
- A click first writes the files kept in the browser, then sends your changes (signed with your trigram), fetches those of the others and merges them.
- In case of a conflict on the same record, the most recent version is kept; the other one is copied into `_conflits/` and a notification reports it.
- The tooltip gives the details (changes to send, items to receive, last synchronisation). The button shows the last known state; it is checked again at the frequency set in Settings › Maintenance › Versions and synchronisation (every 30 minutes by default; also on every page, 3 times a day or once a day, and “Check now”).
- Without a trigram set, synchronisation refuses to start: set it in Settings › My profile. See [the synchronisation architecture](../technique/SYNCHRONISATION.md).

**“Save to folder”** copies all the data kept by the browser (drafts, profile, preferences…) into the `defa_local_store.yaml` file of the backup folder.
- The first click asks you to choose this folder; if no folder is possible, the backup is downloaded.
- Once the folder is allowed, the backup also happens on its own when you leave the page and every 5 minutes.
- Display settings (design, language, block layout…) are backed up but do not count in the reminder.

**The ☰ menu** contains, from top to bottom:
- the “Appearance” and “Settings” buttons;
- the list of the pages of the suite, then the settings pages (My profile, Centre, Installation, Maintenance, Appearance, First run);
- the “Pilot profile” group (trigram, IVAO ID, VATSIM ID, SimBrief), used by all pages;
- the “Local data” group: “Save to folder”, “Restore / resync”, “Backup folder…”, “Download backup”, “Restore from a file…”, and the date of the last backup;
- the “Page” group, when the page offers its own actions.

Restoring merges: for each piece of data, the most recent one wins. It also lets you find your data again in another browser or on another computer.

### Tabs at the top of the page

Some side bar entries group several sister pages, shown as tabs under the header:

| Entry | Tabs |
|---|---|
| “My missions” | “My missions”, “My availability” |
| “Settings” | “My profile”, “Appearance”, “First run” (from level 1); “Centre”, “Installation” (level 2); “Maintenance” (level 4) |
| “Missions” (Centre) | “Mission generator”, “Map studio” |

A click on a tab opens the matching page. A click with Ctrl (or Shift) opens it in a new browser tab. The tabs follow the usage level (My profile › “Usage level”); a direct address to a section always opens it.

### Blocks

Page content is split into blocks with titles. Each block title carries two controls:
1. “Hide” / “Show”: collapses or expands the block (in the material designs, only the icon is visible; the label appears as a tooltip).
2. ↕ “Move”: grab this handle and drag the block onto another: dropped on its upper half, it goes before it, on its lower half, after it; it can change column. The target block lights up, and the page scrolls when you get near the bottom of the window or the header.

The layout (order, hidden blocks) is remembered **per page and per browser**. It is restored at each visit. Menu ☰ › “Reset the block order” restores the page's original order (hidden blocks stay hidden).
Some blocks are hidden by default until you have shown them once. Text fields (route, remarks…) grow with their content, up to three fifths of the screen (Chrome and Edge).

### Floating notifications

Messages from the suite (success, warnings, errors) appear at the bottom centre of the screen, in small bubbles.
- They clear on their own: about 5 s for information, 8 s for a warning, 12 s for an error.
- Hovering over a bubble pauses the clearing; the “×” cross closes the bubble at once.
- At most four messages stay on screen.
- A repetitive reminder (for example “SIA database missing from this browser…” of the Map studio and the Flight maps) is shown only **once per session** of the browser. Some messages are reserved for higher usage levels: below them they are not shown, but warnings and errors stay in the log of the “⚠ n” indicator.
- Cleared warnings and errors can still be read through the “⚠ n” indicator in the header: “ACK” acknowledges an alert, “Acknowledge all” acknowledges them all, “Clear” empties the list. This log is lost when you change page.
- A long task (reading, generation…) shows a progress bar in the same stack. Leaving the page during the task asks for confirmation. When the task can be interrupted, the bar carries a **“Stop”** button: the step in progress finishes, the next ones are not started, then the bubble says “Cancelled.”. The button exists for the generation and previews of the maps (Map studio and Flight maps: stop between two maps), the MORA calculation (of a zone, of the full grid or by blocks), the MILAIP ENR 5.7 import and the setting up of the zones (Maintenance), and the reading of the missions folder (Registry).
- A stopped task says what remains partial. Maps: a stopped generation downloads no ZIP and files nothing in the mission folder (a batch of missions says how many are finished); the previews already shown stay. MORA by blocks (button “Stop (resume later)”): the blocks already computed are written to `mora.csv` (partial grid), “Resume the full calculation…” continues later. MORA of a zone, MORA grid and MILAIP import: nothing is written. Reading of the missions folder: the registry stays unchanged.
- Error messages say what failed and what to do, instead of a bare code. Examples: “the server does not answer — check that the suite is opened by the launcher (lancer.cmd / lancer.sh), restart it if needed, then try again”; “file missing — check that it is in the expected folder (or create it again), then try again”; “browser storage full — free some space (Settings › Maintenance › Disk space), then try again”. Other cases: online service not answering, server error, access denied by the browser, timeout; an unexpected error is shown as “failed” followed by the technical detail in brackets.
- Questions (“Clear…?”) open in a small window with “Confirm” and “Cancel”.

### Sign-in, develop or production mode, impersonation

The airline runs in one of these two modes, set by a Centre administrator:

| Mode | Effect for the pilot |
|---|---|
| develop (default) | Free trigram (the one in the pilot profile), sign-in optional. |
| production | Sign-in required for “My missions” and “My availability”; the trigram is the one you signed in with and can no longer be changed. |

- In production mode, these pages show “Production mode: sign in to see your missions.” with the “Trigram” and “Password” fields, and the “Sign in” button.
- A temporary password (given by an administrator) must be changed: Settings › My profile › “Sign-in and password”.
- An administrator can act in place of a pilot (impersonation). A banner shows it on every page: “Impersonation: user … (by …, writes signed “… pour …”)”, with the “End impersonation” button.
- The checks are made in the browser: they do not replace a real check by a server.

### Designs

The suite offers several designs. They change the shape of the pages, not the information.

| Design | In short |
|---|---|
| Standard, Aero, Operational, Console | “Flat” designs: corners, density, titles, side bar. |
| Cabinet, Flight log, Rugged, Aqua, Tactical | Material designs (leather, wood, brass, aluminium, steel, glass); Tactical: night, smoked glass, cyan accent, Orbitron titles, no images. Aqua is the design of a new installation. |

- In the material designs, the mission folder in “My missions” becomes a real book, with its animations.
- You choose in Appearance: each design is shown as a thumbnail and applies at once. See the [Appearance](#appearance) chapter.

## Today
<!-- page: apps/pilot/aujourdhui.html -->

This page is the first entry of the side bar, at every usage level. It answers three questions without any searching: what is my next mission, which reports are left to write, what is happening this week.
Each block offers a single action. The data comes from the Centre’s assignments (see “My missions”) and from the report registry: nothing has to be entered again. The page rereads itself when you change language, trigram or session.
The home page also offers it at the top of “My tasks”.

### My next mission

- The nearest mission assigned to you (upcoming, or taken off less than six hours ago): time in UTC, mission and title, aircraft (type and registration), airfield, callsign; “ferry” or “on call, ready at …” where relevant, and “● new” as long as you have not opened it.
- Action: **“Open the folder”** opens the mission in “My missions”.
- With no trigram set, this block asks for it on the spot: the “Trigram” field (two to four letters) and the “Save” button. The trigram is saved in the pilot profile and the three blocks reread at once, without going through Settings › My profile. In production mode or during an impersonation, the trigram is the one you signed in with: the block shows “No trigram: sign in to see your missions.”
- With no upcoming mission, the block says so: “No upcoming mission is assigned to …”.

### Reports to write

- The missions assigned to you that took off less than 21 days ago and for which the report registry holds no report. The most recent comes first; seven lines at most.
- A report is known if it comes from a mission order: the registry (`missions.yaml`) ties it to the assignment through its order reference (mission, pilot, take-off). A report started otherwise, with the family picked by hand, does not count: the mission stays in the list.
- Each line gives the mission, its title, the time, the aircraft and the airfield, with two buttons.
- **“Write the report”** opens the mission folder in “My missions” and starts the report in the mission’s family, filled in from the mission order (address `?mission=…&do=cr`).
- **“No report”** removes the mission from the list (cancelled mission, not flown…). The choice is remembered in this browser only; the registry is not touched.
- When everything is reported, the block says “Nothing to report: your past missions have their report.” With no trigram, it points to the field of the first block (“Trigram to enter above.”).

### My week

- Seven columns, Monday to Sunday of the current week (days in UTC); the current day is outlined.
- Your missions appear there as tiles: time and mission number, or “on call”.
- Action: a click on a tile opens the mission folder in “My missions”. With no trigram, the block says “Without a trigram, the week stays empty.”

## My missions
<!-- page: apps/pilot/mes_missions.html -->

This page brings together the missions the Centre assigns to you, the folder of each one, your availability and your trigram.
You reach it from the “My missions” entry of the side bar, from the sealed envelope in the header or from the “My missions” tab.
Layout: the list of missions and the open folder side by side (the folder takes two thirds of the width), “My availability” below, across the full width. With no folder open, the list takes the full width. On a narrow screen (less than 1100 px), everything moves to a single column: missions, folder, availability.
In production mode, the page first asks you to sign in.
Depending on the usage level (My profile › “Usage level”), the mission folder shows more or fewer sections (see “Mission”); a few buttons and links only appear from the Planning level (2) or at the Expert level (4).

### My missions this week

The list of the missions assigned to you for the week shown, sorted by take-off time (UTC).

- **Week bar**: “‹” previous week, date field (go to the week of a date), “›” next week, “⟲” back to the current week (visible outside the current week). It is shared by the list and the availability: changing the week here changes both blocks.
- **Columns**: “Take-off (UTC)” (or “standby” and the time to be ready by), “Mission”, “Title”, “Aircraft”, “Airfield”, “Callsign”.
- A dot ● at the start of a line marks a **new mission, not yet opened**.
- A “ferry” mention means that you are ferrying an aircraft for another pilot: you only receive the ferry order, not the mission brief.
- A click on a line opens the mission in the “Mission” block.
- “also show past missions” box: by default, a mission disappears a few hours after its take-off. The choice is remembered.
- With no trigram set, the trigram entry field appears under the list (“Trigram” field, “Save” button): once saved, the list and the availability are read again. In production mode or during an impersonation, the trigram is the one you signed in with.
- An address `?mission=…` coming from “Today” or from “New report” shows the week of that mission (past missions shown if needed); with `?do=cr`, the report starts as soon as the folder opens.
- **Pilot**, **Aircraft mastered**, **Simulators**: three buttons under the list, to Settings › My profile (“Identity and networks” section for the trigram; “Aircraft and simulators” section, at the aircraft card or the simulators card). The “Pilot” button shows the trigram used to find your missions and your availability. In production mode or during an impersonation, it is the trigram you signed in with.
- These three buttons appear from the Planning level (2). At the Crew level (1), only “Pilot” appears, as long as the trigram is not set.

### Mission

The folder of the chosen mission, read-only. This block only appears after a click on a mission.

**Cover and seal**
- An unread mission arrives under seal: closed cover with the “CONFIDENTIAL” label (number, title, aircraft, callsign, take-off).
- To open it: click the cover or “Open the mission” (“break the seal”). The mission is then marked as read: the ● dot in the list, the badge in the side bar and the envelope in the header are updated.
- A mission already read is shown closed with “Open the folder”, or directly open.
- While the mission is sealed, the action buttons stay greyed out.

**Content of the folder** (in order):
1. The mission order: “Assigned aircraft”, “Callsign”, “Departure airfield”, “Requested take-off” (or “Ready at” for a standby), any ferry, “Status”, team members (“With”), introduction and summary.
2. The detail: “Target / sector”, “Detailed description”, “Risks and points of attention”, “Teams engaged”, “Route supplied” (table of points and plan).
3. The “Maps supplied”: a click enlarges a map in a viewer (close it with the cross or Esc).
4. The end: “Objectives”, “Remarks”, “Technical sheet”, “Assignment history”, and the Centre's signature.
5. The “Envelopes and in-flight messages”, if there are any (see below).

**Depending on the usage level**:
- Crew (1): the mission order, the summary, the route supplied, the maps, the objectives, the signature and the envelopes;
- Planning (2): in addition, the introduction, the target, the detailed description, the risks, the teams engaged, the remarks and the other sections of the summary;
- Design (3): in addition, the technical sheet and the assignment history;
- Expert (4): the whole folder; on the develop update channel, “Reseal” puts the mission back under seal (unread).

**The book** (Cabinet, Flight log, Aqua and Rugged designs, screen of at least 760 px)
- The open folder is shown as a double page. Content that is too long moves to the next page; maps are laid out two per page.
- To turn a page: the folded corner at the bottom right (next page) or at the bottom left (previous page). A click on the page does the same.
- On the first double page, the left corner closes the folder.
- The **bookmark** jumps to the end of the folder; from there, it opens the sealed envelopes (if there are any), otherwise it goes back to the start.
- A page “intentionally left blank” may appear: this is on purpose, so that the end of the folder falls on the left.
- The envelopes are filed behind the bookmark, after an “Additional information” page.
- In the other designs, or on a narrow screen, the folder is shown in the ordinary layout, in a single column.

**Sealed exercise envelopes**
- In an exercise, some envelopes or messages must only be read at a given time. Each one is shown as an envelope: “Sealed envelope”, “Expected radio message” or “Message to pass on”, with the mention “To open:” followed by the time (UTC) and the planned moment.
- At the set time, the envelope opens on its own; a notification announces it (“…: opening time reached.”).
- Before the time, “Break the seal” asks for confirmation: the button becomes “Confirm: open before the time” for 5 seconds.
- An open envelope can be closed again with “Reseal”.
- Each action (opening on time, before time, resealed) is recorded in the log; the report will use it.

**Buttons under the folder**

| Button | Effect |
|---|---|
| “Open in the flight maps” | Opens the Flight maps with this mission (assigned aircraft first). |
| “Fuel (planner)” | Opens the fuel planner in a new tab, with the route, the distance, the cruise level and the aircraft. |
| “Create the report” | Opens the report of the mission's family, pre-filled. |
| “Close the folder” | Closes the folder (the mission stays read). |

These buttons are greyed out if the mission does not provide what is needed (mission file missing, route too short).
“Open in the flight maps” and “Fuel (planner)” only appear if the matching tool is ticked in My profile › “Usage level” (always at the Expert level). Without the Flight maps, “Create the report” becomes the main button.
The “⤢ Full width” button in the block title spreads the folder across the full width, above the list; “⇥ Beside the list” puts it back alongside. The choice is remembered.

**Animations** (turned off if the system asks for fewer animations)
- Cabinet: the bundle of papers comes out of the file holder, which opens, then the page turns.
- Flight log: the logbook comes out of its envelope, then opens like a book.
- Aqua: the folder grows into a book.
- Rugged: the latch resists, then gives way; the cover opens heavily.
- Other designs: a simple fade.
- Change of mission: the open folder closes and leaves to the left, the new one arrives from the right and opens if the previous one was open.

**Language**: if the page is not in French and the mission does not bring its own translation, the content can be translated by the browser (recent Chrome or Edge), with a “read with care” warning. Otherwise, it stays in French.

### My availability

Your availability for the week shown, in UTC. The Centre uses it to assign missions to you. It is the same editor as on the My availability page (next chapter); here, the week is the one of the week bar of the list.
Depending on the usage level: the block’s own week bar, the old hourly grid and the “Open the availability entry on its own” link only appear at the Expert level; at the other levels, the week is changed with the bar of the list.

**Palette**: the categories are arranged by group (“Available”, “SOG exercise”, “Busy”, “Unavailable”). Each badge carries the ODV code letter and a short label; the tooltip gives the full label. The chosen category is remembered.

Default categories (the Centre can change this list):

| Group | Categories (ODV code) |
|---|---|
| Available | Available for everything (O), Available civil security (SC), Available defence (D+), Custom civil security (SC-), Custom defence (D-) |
| SOG exercise | SOG exercise flight (S), SOG control (AM) |
| Busy | Flight outside SOG (IVAO / VATSIM) (G), DCS (DC), Control outside SOG (IVAO / VATSIM) (AT) |
| Unavailable | Unavailable (IN), Holidays (V), Time off (Q), Real-life activity (IR) |

**Hour-by-hour grid**: one line per day (today highlighted), one column per hour from 0 to 23 UTC.
1. Choose a category in the palette.
2. Click a cell, or draw a rectangle while holding the button down: the cells take the colour and the letter of the category.
3. A new click (or rectangle) starting on a cell already in this category clears it.

A cell shared between several categories is striped; an hour partly covered (entered by the quarter hour) is faded. Each change is saved at once.

**“Precise range”** (by the quarter hour, collapsed: a click on its title opens it; open from the start at the Expert level): “Group”, “Category”, day boxes (Mon to Sun), “from” and “to” (UTC), then “Add”. Empty times = whole day. Under the form, a line recalls the mission themes opened by the category; for a custom category, the “My mission types…” link leads to the preferences in My profile.

**Other buttons**
- “⧉ Previous week”: copies the ranges of the previous week (replaces the week shown, after confirmation).
- “Clear all”: empties the week shown (after confirmation).
- “Write to the data folder (n)”: only appears if some weeks have stayed in the browser; writes them to the shared folder.

The message under the block tells you where the entry went: “Saved to the data folder.”, or “Kept in this browser, the Centre cannot see it: …” if the data folder is not allowed (see [First run](#first-run), step 3).
An existing old hourly grid is imported automatically into the week.
The “Open the availability entry on its own” link leads to the My availability page. This link only appears at the Expert level.

## My availability
<!-- page: apps/pilot/disponibilites.html -->

This page shows the availability editor on its own, in a larger size. It is used to enter several weeks quickly.
You reach it from the “My availability” tab (under the “My missions” entry of the side bar) or from the “Open the availability entry on its own” link in My missions. This link only appears at the Expert level.
The pilot is the one of the working trigram (pilot profile, sign-in or impersonation). In production mode, the page first asks you to sign in.

### My availability

The only block of the page. It works exactly like the block of the same name in My missions (previous chapter): palette, hour-by-hour grid, “Precise range” (collapsed, open from the start at the Expert level), “⧉ Previous week”, “Clear all”.

**Week navigation** (specific to this page):
- “‹” and “›”: previous or next week;
- date field: jumps to the week that contains this date;
- “Current week”: visible outside the current week, goes back to it.

Tips and limits:
- All times are in UTC. The grid works by the hour; “Precise range” by the quarter hour.
- Each change is saved straight away: there is no “Save” button.
- Without a trigram, the block shows “Trigram not set: set it in Settings › My profile (or ☰ › Pilot profile).”
- An address of the form `disponibilites.html?semaine=2026-W41` opens a given week directly.
- If the week is still loading, a change is refused with “Week still loading: try again in a moment.”

For the way the Centre uses these declarations, see [availability and reorganisation](../technique/DISPOS_ET_REORGANISATION.md).

## My profile
<!-- page: apps/settings/profil.html -->

This page groups the settings specific to each pilot: identity, sign-in, mission preferences, aircraft and simulators, altitude without oxygen.
You reach it from the “Settings” entry of the side bar (first tab, “My profile”) or from ☰ › “Settings”.
The left-hand column lists the sections by group; a click shows one on the right, with its title, its presentation, its buttons and a status message.
If a section contains unsaved changes, changing section or leaving the page asks for confirmation.
Depending on the usage level: “My aircraft (reporting)” appears from the Planning level (2); “Altitude without oxygen” only if the Fuel tool is ticked (always at the Expert level); in “Identity and networks”, the “IVAO — OAuth client” and “Language” cards are at the Expert level.

### Usage level

What the suite shows you, according to your use. Four cards, one per level (number and name, what the level shows, “Requires the Centre” for levels 2 to 4); the chosen card is highlighted and the “Current level” line recalls it. One click is enough: the page reloads and the sidebar follows.

| Level | For | What is added |
|---|---|---|
| 1 · Crew | every pilot | My missions, Report, Schedule (read-only) |
| 2 · Planning | duty officer | plan the orders: editable Board, ODV planning (Centre enabled) |
| 3 · Design | mission writer | Missions: generator and registry (Centre enabled) |
| 4 · Expert | cartographer, analyst | all tools, map studio |

“Optional tools”: Flight maps (route, topographic maps, approach), Fuel (performance and fuel estimate), Landings (landings dashboard), Mission analysis (reporting on mission reports); they are ticked at any level and grouped under “Tools” in the sidebar; at level 4, “All included at Expert level”. By default: level 4 if the Centre is enabled in this browser, otherwise level 1. The level grants no rights: the Centre keeps its access.

### Identity and networks

Your identity in the suite, used by all pages (☰ › Pilot profile, reports, reporting).

| Card | Fields |
|---|---|
| “Pilot” | “Trigram”, “VATSIM ID (CID)”, “IVAO ID (VID)”, “SimBrief (username or ID)” |
| “Airline website” | “Login”, “Password” |
| “IVAO — OAuth client (personal)” (Expert level) | “Client ID”, “Client secret”, “Redirect URL to declare at IVAO” (to copy on developers.ivao.aero); “Save the IVAO client” button: kept by this computer’s launcher, the secret is never shown again |
| “Language” (Expert level) | “Suite language”: Automatic (browser language), Français, English, Deutsch, Español |

1. Fill in the fields.
2. Click “Save”. The status message confirms “Profile saved in this browser”.

- The trigram has 2 to 4 letters or digits; it is used to find your assigned missions.
- The airline website credentials stay in this browser only: they are never written to a file or to a backup.
- The language is usually chosen with the “Language” flag of the header; the “Language” card (Expert level) applies as soon as you choose it, without “Save”.
- In production mode, the trigram is the one of the signed-in user and cannot be changed here.

### Sign-in and password

Your shared user record: role and password (kept as a hash, never in clear text).

- At the top, the airline mode (develop or production) and your state: “Signed in: … (role)” or “Not signed in.”.
- **Not signed in**: “Sign in” card with “Trigram”, “Password” and the “Sign in” button. In develop mode, a record without a password signs in without a password: set one afterwards.
- **Signed in**: “Change password” card with “Current password”, “New password (at least 8 characters)”, “Confirmation”, then “Change the password”.
- The “Sign out” button appears once you are signed in.
- A temporary password is flagged (“temporary password, to be changed”): change it at the first sign-in.
- Forgotten password: ask a Centre administrator for a reset.

### Mission types

This section sets the mission themes opened by your **custom** availability categories (“Custom civil security”, “Custom defence”).

For each domain (“Civil security”, “Defence”):
1. Choose a mode: “Every theme of the domain”, “Allow list: only these themes” or “Block list: all but these themes”.
2. Tick the themes concerned (for example HEMS, SAR, FIRE… or COMBAT, ISR, AAR…).
3. The bottom line shows the result at once: “ “Custom civil security” opens: … ”.
4. Click “Save”.

The preferences are kept in your user record, shared with the Centre by synchronisation. Without a trigram, the section asks you to set it first in “Identity and networks”.

### Aircraft and simulators

The fleet types you own and master, and your simulators. The Centre uses them to assign you an aircraft and to bring pilots together on a common simulator. (These settings used to be in My missions.)

**“Aircraft” card**: a summary (“… type(s) mastered, … owned out of … fleet types.”), then one sub-card per aircraft category, with a table:

| Column | Content |
|---|---|
| “Type” | Model and ICAO designator |
| “Fleet variants” | Variants present in the fleet |
| “Aircraft” | Number of aircraft in service (out of the total) and their bases |
| “Owned” | You have this type in your simulator |
| “Mastered” | You fly it with ease |

- Ticking “Mastered” also ticks “Owned”; unticking “Owned” unticks “Mastered”.

**“Simulators” card**: tick the simulators and tools installed.

There is no “Save” button: each tick is kept at once in this browser, then copied into your availability weeks already declared, from the current week onwards. The bottom message tells you how many weeks were updated.

### Altitude without oxygen (unpressurised aircraft)

This section (“Fuel planner” group) sets the threshold above which the planner's optimum altitude chart shows “oxygen required” for an unpressurised aircraft. It only appears if the Fuel tool is ticked in “Usage level” (always at the Expert level).

1. Enter “Maximum altitude without oxygen (ft)”: between 1,000 and 30,000 ft, in steps of 500.
2. Click “Save”.
3. “Default value (10,000 ft)” restores the original value.

Reference values shown under the field: 10,000 ft (common practice, EASA NCO), 12,500 ft (FAA, crew beyond 30 minutes), 14,000 ft (FAA, crew at all times).
This is information only: the calculation is not limited. The setting is kept in this browser.

### My aircraft (reporting)

The aircraft you flew or reported: those of the reports with your trigram in the crew, or that you wrote (reports saved since this version) (the aircraft of your seat when the report says so), with type, variant, callsigns, operator, number of flights and last flight. The greyed “Fleet” box shows whether the aircraft belongs to the fleet (ticked) or not (unticked, callsign included); it cannot be changed here. The full list, with the “personal” box, is in Settings › Centre › Fleet (restricted to the Centre). At the top, the log count: reports in total, your reports, reports with no crew entered (they count for nobody). Section shown from the Planning level (2).

## Appearance
<!-- page: apps/settings/apparence.html -->

This page sets the look of the whole suite: design, charts, icons, side bar and colours.
The “Appearance” entry of the side bar (or the “Appearance” button of the ☰ menu) opens it in a window above the current page: you see the effect straight away. To close: “✕”, Esc or a click outside the window.
The same interface exists as a full page (☰ › list of settings pages › “Appearance”).
The settings are remembered in this browser and apply to all pages; they do not count in the backup reminder.
Depending on the usage level: at levels 1 to 3, the page shows the design, the current icon set, the side bar, the icon size and “Reset everything”; the decoration, the Aqua colour, the bar display, the other icon sets, Charts, Theme colours and “Full demonstration” are added at the Expert level.

### Design

The shape of the pages: corners, density, titles, side bar.

- Each design is presented by a thumbnail drawn in its style, with its name and description: Standard, Aero, Operational, Console, Cabinet, Flight log, Rugged, Aqua, Tactical.
- Six thumbnails are shown at once (plus the current design if it is not among them); the others are under “More designs”, to unfold.
- A click on a thumbnail applies the design at once. The chosen thumbnail is framed.
- Cabinet, Flight log, Rugged and Aqua add their materials, Tactical its smoked glass on a night background; the information colours stay those of the theme (Tactical: edge at the top of the blocks).

**“Decoration (material designs)”** (Expert level):
- “Full” (default): illustrated block panels, register sheets, screws, radar;
- “Plain”: materials and plates only, on all pages.

**“Aqua colour”** (Expert level): colour of the buttons and icons of the Aqua design (Blue, Teal, Green, Graphite, Violet, Orange, Red, Pink), or “Colour of each application”. Status icons keep their original colours.

### Charts

Colour palette and style of the charts (reporting, indicators). Expert level section.

- Palettes: “Automatic” (follows the design), “Vivid (page colours)”, “Slate”, “Brass and leather”, “Khaki and olive”. Each row shows a sample of colours.
- “Style”: “Automatic”, “Flat” or “Relieve”.

The choice applies at once to the charts of the pages.

### Icons

The stroke width of the icons, or no icons at all. Each row shows a preview of the set. At levels 1 to 3, only the current set is offered; all sets at the Expert level.

| Choice | Result |
|---|---|
| “Depending on design” | The set planned by the chosen design |
| “Thin stroke”, “Normal stroke”, “Bold stroke” | Line icons |
| “Brass (medallions)”, “Steel (plates)”, “Gel (bubbles)”, “Avionics (dials)” | Material sets |
| “No icons” | No icons |

**“Side bar”**: “Depending on design”, “Always” or “Never”. By default, it is always shown (except on a narrow screen and when printing). “Icon size”: “Small”, “Medium” (default) or “Large”. “Display” (Expert level): “Icon and label” (default), “Icon only” (narrower bar, entry name as a tooltip) or “Label only”.

### Theme colours

Each page of the suite has a colour theme (banner, banner text, accent). For each theme, you choose a colour family and a tone; the colours are calculated from them, with a readability check. Expert level section.

The themes are shown as cards, in two groups: “Applications” (Fuel, Landings, Centre, report) and “Report families”.

On each card:
1. The preview shows a “Title” on the banner, a “Button” and a “Link, icon”.
2. The colour badges choose the family (Red, Brick, Orange… Slate, Graphite); “↺” goes back to the original colours.
3. The “Tone” slider (from dark to light) sets the lightness. It is inactive on the original colours.
4. The contrast badges show ✓ or ✗ for “text / bar” and “accent / page” (at least 4.5:1) and for “accent / card” (at least 3:1).
5. “Show on this page” lends the theme's colours to the current page, so you can judge; a second click (or closing the window) cancels it.

Each change is saved at once.

**At the bottom of the page**:
- “Full demonstration” (Expert level) opens a mock-up: generator, icon catalogue and contrasts of all themes.
- “Reset everything” restores all the Appearance settings to their defaults (Aqua design, design icons, side bar always shown, full decoration, original colours).

## First run
<!-- page: apps/settings/premier_lancement.html -->

This page sets up what the suite needs to work. The launcher (`lancer.cmd` on Windows, `sh lancer.sh` on macOS or Linux) opens it by itself; you can come back at any time through Settings › “First run” tab, or the “First run” card of the home page, shown as long as something remains to be set.
The launcher only brings you back to the first run if the application folder or the data are missing. Once “Finish” is clicked, the home page recalls what remains to be done in a discreet grey frame, without an alert.

At the top, a **rail of the six steps** (1 Folders · 2 Data · 3 Company · 4 Profile · 5 Aeronautical data and types · 6 Centre, then “Finish”: “at the end”, “ready” and circled when everything is done; the Centre step does not light up for a pilot) gives the state of each: ✓ done, ○ to do, – optional, 🔒 locked without step 1, ✗ to redo; the current step is circled, a click opens a step. The detailed review, **“Where the suite stands”**, is in a folded panel: each line leads to its step (✓ set, ○ to do, – optional, ? unknown: no launcher).
- For everyone: data, git sync repository (optional), application folder, airline and website, IVAO API key (optional), pilot (trigram and at least one network), airline website credentials, aeronautical data.
- Centre: enabling (administrators); once the Centre is enabled, fleet and log from the website, registry missions, users and rights (at least one administrator), report sending (optional).

Above the summary, “📘 Installation tutorial, step by step” opens the [installation tutorial](../tutorial/installation.en.md) in the Help, in the suite's language.

The same state is shown as a badge in each step title (the number turns green when the step is done), with a “✓ Done: …” or “○ To do: …” line below. The current step is open, the others folded; each step ends with “Next →”.

### 1 Folders

The browser asks you to point to each folder once; it remembers it afterwards.

- **“Application folder”**: “Choose the application folder”, then point to the folder that contains `lancer.cmd` and `lancer.sh`. The other folders (data, registry, missions, SIA, performance, local backup) are deduced from it; the message tells you how many were set.
- The folder must be the one of the suite served by the launcher: if it belongs to another copy of the suite, the step stays to do (✗ in the summary) with the message “Suite launched from …, declared folder …”; choose the right folder again.
- **“ODV workbook (optional)”**: “OneDrive folder…” points to the synchronised folder where the squadron drops the workbook (the ODV planning opens the most recent one). Without OneDrive: “or the Excel file…”, kept in this browser.

This step matters: without an allowed data folder, your availability stays in the browser and the Centre cannot see it.

### 2 Data

This step installs the airline's data (missions, references…). It goes through the launcher: without it, the page shows “For this step, open the suite with the launcher…”.

Until the application folder (step 1) is chosen, or if it belongs to another copy of the suite, this step and the following ones (airline, profile, aeronautical data, Centre) are greyed out and inactive, with the reason at the top of each, and so is “Finish”; the summary stays readable.

Three options:

| Card | How to proceed |
|---|---|
| “Sample data set” | “Install the sample data”: fictitious data shipped with the suite (missions including an exercise, pilots, fleet, availability and assignments for the current week), to discover the suite; to be replaced later by the airline’s data. Refused if data is already there. |
| “Data repository” | Enter “Repository address” (given by your airline: `https://…` or `git@…`), if needed “Login (optional)” and “Password or token (optional)”, tick “remember in Git’s credential manager” if needed, then “Fetch the data”. The first download takes a few minutes. |
| “I received the data by e-mail” | “Data archive…”: choose the `.zip` archive you received (it contains `data_tree.js`). |
- No address is prefilled. Private repository over HTTPS: login and password, or a read access token if the account uses two-factor authentication; over SSH (`git@…`), the computer’s SSH key.
- If Git is not installed: sample data set or archive (or install Git, then start again).
- **“Git repository for data synchronisation (optional)”**: the address of the remote repository of `data/`, which shares the data
  between computers (“Synchronise” button). SSH address `git@hôte:compte/dépôt.git` (the computer's SSH key) or
  HTTPS `https://hôte/compte/dépôt.git` (credentials saved in Git). The card shows the current repository;
  “Check” tells you whether it answers from this computer (30 s at most), “Save” makes it the remote repository of `data/`
  (with no data yet, the address is used to fetch them). Nothing is blocking: a repository that does not answer is reported,
  For another repository than the current one, the launcher opens a confirmation window on the computer (current and new
  address, “No” by default): answer “Yes” to change; no page can answer it for you. Never put a password or a token in the address.
  and the suite works without sharing. Details: [synchronisation](../technique/SYNCHRONISATION.md).
- Once the data is present, the optional “Flight log” card offers “Log (.html)…”: the “Flight log” page of the airline website, saved, fills in the pilots and aircraft of the reference (entry help).

### 3 Airline

The virtual airline whose name the suite bears, and its website address (links, fleet, flight log); setting of this browser.

1. “Virtual airline” card: “Name”, “Short name”, “Full name”, “Airline website” (`https://…`).
2. “IVAO API key (optional)” card: the installation's key (area activations and IVAO ATC sessions of the Board and the ODV planning). Kept by the launcher, it is never shown again: the card only says that a key is saved.
3. “Save the airline”.

The other fields (centre, website pages, external sources) are in Settings › Installation › Sources and folders.

### 4 Profile and credentials

1. “Pilot” card: “Trigram”, “IVAO ID (VID)”, “VATSIM ID (CID)”, “SimBrief”. The trigram is locked in production mode (it comes from the account).
2. “Airline website” card: “Login” and “Password” of your account on the website, kept in this browser only (never in a file or a backup).
3. “Save the profile”.

The suite never asks for your IVAO or VATSIM passwords: your IDs (VID, CID) are enough. The suite account (password, production mode), the personal IVAO client and the preferences are set in [My profile](#my-profile).

### 5 Aeronautical data and aircraft types

Maps, missions and planning use the aeronautical data (AIRAC) and the aircraft type database. The step shows the same blocks as Settings › Installation:

1. ① “Aircraft types” first: the status line names the types to complete and carries “Complete automatically” itself (ICAO types and EUROCONTROL performance); during the pass, “Download running (step, n s): the page reloads when the task ends.”, then the page reloads by itself and shows the result (“Done: 8 ICAO record(s), 1 performance profile(s).”), also after “Install everything”. A type without EUROCONTROL performance (military aircraft, helicopters) is estimated: “≈ 2,000 kg/h, 480 kt (known type)” or “(ICAO class L2J)”, as in the fuel planner; a type without an ICAO record does not block the step.
2. ② “Aeronautical data”, preceded by their status lines (database: AIRAC, airspaces, build date; MORA; X-Plane, optional): France is active by default, a click on the map chooses other zones, each source keeps its button (SIA ZIP: link to the shop, free account, cycle product at 0 €, then “Fetch the downloaded ZIP”; MORA; MILAIP PDF; datasets of other countries). A single main button, **“Install everything for <zones>”**, chains the completion of the types then the activation of the zones, waits for the end of each task and says what remains; what is already installed is not redone. The expert cards (aeronautical database, MORA, consistency) are folded under “Advanced tools” (also in Settings › Maintenance).

### 6 Centre (administrators)

For SO Group administrators only: pilots skip this step and click “Finish”. Each link of the step says what is done there and opens in a new tab.
- “Enable the Centre” card: “Centre password” (shown next to the button, `DEFA` by default), then “Enable the Centre”. The summary shows the Centre mode (standalone: password).
- Once the Centre is enabled:
  - “Fleet and flight log”: last reading of the website by the launcher (fleet, aircraft location, log), “Update now”, and the link to the fleet (Settings › Centre).
  - “Missions”: “✓ n missions in the registry: nothing to do”, otherwise where they come from (data of step 2, otherwise Centre › Mission generator), and the link to the registry.
  - “SO Group settings”: links to the Settings › Centre sections — users and rights (number, administrators, mode), availability categories, ODV planning, Board, report sending, route calculation.

“Finish” (last point of the rail; end block always visible under the steps) only requires steps 1 and 2; steps 3 to 5 are recommended (if some remain, a confirmation recalls them on click); it marks the suite as “set up” and opens the home page. The “Home” link goes back to it without finishing.

### Start again

To restart the first run from scratch, and only in that case. The block is folded by default.

- “Clean and start again…” clears, **in this browser**, the remembered folders (application, data, registry, missions, SIA, ODV, X-Plane, performance, local backup), the copy of the ODV workbook, the airline website credentials, the profile (trigram, IVAO, VATSIM, SimBrief) and the “suite set up” flag.
- A confirmation is requested, then the page reloads at step 1.
- Files on disk are not touched: `data/` folder, registries, `defa_local_store.yaml` backup.

## New report
<!-- page: apps/cr/mission_cr.html -->

This page is the entry point of every mission report: you choose the mission family there,
then the report page of that family opens. It is meant for all pilots.
To go there: side bar › **Report**, or the “New report” button in the header of the
general reporting. A report can also open directly, already filled in, from a mission assigned
to you (see below). Full step by step: [tutorial](../TUTORIAL.md).

### My missions to report

First block of the page: the missions assigned to you that are already past (21 days at most) and have no report in the registry, as in the “Reports to write” block of the “Today” page (seven lines at most).

- **“Write the report”** opens the mission folder in “My missions” and starts the report in the mission’s family, filled in from the mission order (see “Resume an assigned mission”).
- **“No report”** removes the mission from the list (remembered in this browser).
- With no trigram set, the block asks for it on the spot (“Trigram” field, “Save” button). The choice of family, further down, remains for a mission outside your assignments.

### Mission family

The block shows one tile per family (16 families: HEMS, FIRE, SAR, AIRLIFT, AAR, MARITIME, HADR,
AIRBORNE, FI, SURVEY, LE, ISR, COMMAND, COMBAT, SOF, SPECIAL). Each tile carries the family code
and its name; hovering shows its description.

1. Find the family of your mission.
2. Click its tile: the report page of the family opens, with a blank mission.

Tips:

- the last family used always appears first, framed, with the mention “Continue with”;
- you can change family later, from the “family · sub-type ▾” badge in the header of
  the report page;
- the page is shown every time: it does not send you straight to the last family.

### Find the family from the mission

The search field (example shown: “helicopter medevac”, “Rafale refuelling”, “para
drop”…) finds the family from a free description.

1. Type a few words: mission type, aircraft, organisation (“forest fire”, “canadair”,
   “paratroopers”…). Accents and the start of words are enough (“refuel”, “para”).
2. The families are ranked: the best one is framed, those that do not match are faded.
   Under the field, “Suggestion (Enter to open):” recalls the proposed family.
3. Press **Enter** to open the first one, or click another tile.

If nothing matches, the message “No matching family: SPECIAL covers other missions.”
is shown: SPECIAL (special transport, tests, training) takes all other missions.

### Resume an assigned mission

When the Centre has assigned you a mission, there is no need to go through the family choice: the report
opens directly in the right family, already filled in.

| From | Button |
|---|---|
| **My missions** (mission folder open) | “Create the report” (greyed out if the mission has no mission file) |
| Mission **Registry** (Centre) | “Create report”, or “New report (flight n)” if the mission already has reports |
| **Mission generator** (Centre) | header button “Create the report →” |

What is carried over: exercise / operation name (mission title), mission identifier (“Mission”
field), objective and instructions (Tasking block), departure and arrival airfields, waypoints and
coordinates, area, aircraft (ICAO type, registration, callsign), organisation, and a reminder of the mission and of the load
in the Remarks. The usual helpers then apply (known aircraft, airfield, weather).

- The family is deduced from the mission type (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- If a draft is in progress in this family, the page asks “Replace the current draft with
  the generated mission (SIA XML)?”.
- From the Registry, a “generated” or “planned” mission moves to the “flown” state.
- The report number is calculated from the mission: `CRM-016-1`, then `CRM-016-2` if the mission is flown again.

## Family report
<!-- page: apps/cr/AAR/aar_cr.html -->
<!-- page: apps/cr/AIRBORNE/airborne_cr.html -->
<!-- page: apps/cr/AIRLIFT/airlift_cr.html -->
<!-- page: apps/cr/COMBAT/combat_cr.html -->
<!-- page: apps/cr/COMMAND/command_cr.html -->
<!-- page: apps/cr/FIRE/fire_cr.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_cr.html -->
<!-- page: apps/cr/HADR/hadr_cr.html -->
<!-- page: apps/cr/HEMS/hems_medevac_cr.html -->
<!-- page: apps/cr/ISR/isr_cr.html -->
<!-- page: apps/cr/LE/le_cr.html -->
<!-- page: apps/cr/MARITIME/maritime_cr.html -->
<!-- page: apps/cr/SAR/sar_cr.html -->
<!-- page: apps/cr/SOF/sof_cr.html -->
<!-- page: apps/cr/SPECIAL/special_cr.html -->
<!-- page: apps/cr/SURVEY/survey_cr.html -->

All families share the same entry page: the same common blocks, plus a few blocks specific
to the family. You write the report of a flight you have flown there, then save it in the mission ledger.
You reach it from the “New report” page, from an assigned mission, or by clicking a mission
in a reporting page or a sheet (the mission then opens for editing).

**Depending on the usage level: short or detailed report.** At levels 1 (Crew) and 2 (Planning), the form only shows the essentials of the report:
- identification (mission, report no., date, series) and result;
- aircraft (registration, type, callsign, airfields; a known aircraft fills in the rest) and crew;
- four times (engine start, take-off, landing, engine stop), fuel at departure and at landing;
- the family’s own blocks and remarks.

The “Detailed report” button of the bar shows the whole form without changing level (choice kept by the browser); “Short report” goes back to the reduced form. Values already entered in hidden fields (import, flight plan, network tracking) stay in the report. At levels 3 and 4, the form is always complete and this button does not exist.

### Header and toolbar

The header stays fixed at the top of the page. From left to right:

| Entry | Role |
|---|---|
| “SAR · Land SAR ▾” (family · sub-type) | “Mission family” popup (opens the page of the other family) and “Mission sub-type” |
| “Add to ledger” / “Save changes” | files the mission in the ledger |
| “Send report” | sends the report to the web service (dotted outline as long as it is not set up) |
| “Analyse / import…” ▾ | paste a flight plan, a tracker page, a METAR; import a file |
| “Network tracking” ▾ | live IVAO / VATSIM tracking, VATSIM history |
| “Mission” ▾ | “New mission”, “Export mission (YAML)”, “Delete this mission” (when editing) |
| “Mission ledger” ▾ | “View reporting”, “Ledger folder…”, “Report sending settings (web service)…”, “Settings — databases…” |
| “Detailed report” / “Short report” | levels 1 and 2 only: shows the whole form or goes back to the short report (see above) |

On the right, a status message shows the last save (“Draft saved in the
browser · time”). Each block has in its title **↕** (drag to move it) and **Hide /
Show**; the layout is remembered. Blocks that contain a list have a **+** in their
title to add an item.

At levels 1 and 2, “Analyse / import…”, “Mission” and “Mission ledger” do not appear (they come at level 3): a new mission is opened with ☰ › Missions › “New report”.

### Editing a ledger mission

This banner only appears when you edit a mission already saved (opened from a reporting page,
a sheet or just after “Add to ledger”). It recalls the report number and its place in the ledger
(e.g. `CRS-004-1 — missions.yaml #12`).

- The main button becomes “Save changes”.
- “Mission ▾ › Delete this mission” appears (confirmation: “Permanently delete this
  mission from the ledger?”), then the page goes back to the family reporting.
- If the mission has been moved or deleted in the meantime, the page says so and opens a new mission.

### Identification & organisation

Numbers, date, series, exercise or real operation, organisation.

| Field | Good to know |
|---|---|
| “Mission (identifier)” | identifier of the mission flown (`M-016`, `S-002A`); empty: report without a mission. A “see the mission in the registry ↗” link is shown below, with the number of reports for this mission and the gap with the estimated flight |
| “Report no.” | calculated, not editable: `CRM-016-1`, `CRM-016-2` if flown again; without a mission: `CRM-A01-0` |
| “Series” / “Sub-type” | mission type of the family; the series is also in the header badge |
| “Date”, “Local time”, “UTC time” | today's date by default; the local time fills in the UTC time and the other way round; the briefing time fills them in if they are empty |
| “Exercise / real operation” | “Exercise / simulation” or “Real operation” |
| “Exercise / operation name”, “Organisation”, “Unit” | values you have already entered are suggested |
| “Requesting authority”, “Controlling authority” | taken from the last mission with the same callsign or the same organisation |

Depending on the family, other fields are added or disappear: “Serial number”, “Classification”
(non-civil families), “Tasking order reference”, “Detachment”. A date in the future is
flagged: a report is about a flight that has been flown.

### Results

Result of the mission and follow-up (block placed in 2nd position for reading the report).

1. Choose the “Outcome”: Success, Partial success, Aborted, Cancelled, Diverted, No contact,
   Target not found, Weather, Technical, Operational, Other.
2. For any outcome other than Success or Other, the “Interruption reason” and “Causes” fields appear; tick every cause (weather, technical, simulator, pilot missing, no ATC, network, airspace not activated, tanker missing, lack of time…): they go up to the flight order tile (MNE).
3. If needed, complete “Detailed result”, “Incidents” and “Technical anomalies”.

This outcome feeds the success rate and the “Outcomes” chart of the reporting pages.

### Aircraft +

One card per aircraft involved; there is always at least one. The “+” in the title adds an aircraft.

1. Type the registration (`F-ZB…`): known aircraft are suggested with type, callsign, operator
   and base. Choose one: type, category, callsign, ICAO operator, base and equipment are
   filled in.
2. Or start from the callsign: `ctm58` in “Callsign” gives the series, the number, the full callsign
   and the “Flight plan callsign (7 chars max)”.

| Button / field | Role |
|---|---|
| “Aircraft sheet ↗” | opens the aircraft's sheet (as soon as the registration is entered) |
| “⟲ Clear” | empties the aircraft to restart the search (wrong aircraft or wrong type) |
| “ICAO operator (OPR/, item 18)” | deduced from the organisation or from the known aircraft |
| “Departure base”, “Return base”, masses, “Available endurance (min)”, “Mission configuration” | to complete if useful |
| “Actual landing aerodrome (ICAO)” | aerodrome where the aircraft really landed, never pre-filled; in a report opened from “My missions” (mission or ferry order), it places the aircraft at that aerodrome for the next ferries. A report outside a mission order does not move the aircraft |
| “Aircraft equipment / technical capabilities” | collapsed; taken from the known aircraft or from the flight plan |

The fields filter each other (wing type, type, series). Choosing another aircraft replaces what had
been filled in automatically, never what you entered. An unknown type will be added to the local database
when saving.

### Crew +

Crew members and their roles; there is always at least one line. The “+” in the title adds a
member, the “×” cross at the end of the line removes it.

| Column | Content |
|---|---|
| “Role” | role on board, list specific to the family |
| “Name / callsign” | trigram or name; names already entered are suggested |
| “Aircraft no.” | number of the aircraft card (1 by default) |
| “Note” | free text |

The name entered is the key of the [crew sheet](#crew-sheet): always write it the same way.

### Tasking

Objective and instructions of the mission: “Objective”, “Special instructions”, “Priority”.
For an assigned mission, the objective and the instructions are already filled in from the mission. These
texts appear in section “5. Tasking” of the report.

### Capabilities / techniques

Techniques and means used in flight, to tick in groups (hoist, drop, NVG, night flight…).

- This block is **hidden by default**: click “Show” in its title to open it.
- When a mission is created, the boxes are taken from the last mission of the same series: you
  only need to set them once.
- Ticked capabilities make some family-specific blocks appear (e.g. SAR: hoisting if
  the aircraft is a helicopter and the hoist is ticked).

### Timeline

Key times of the flight, from off-block to on-block, in local time (HH:MM): “Briefing”, “Engine start”, “Off-block”,
“Take-off”, “Zone entry”, “Mission start”, “Mission end”, “Zone exit”,
“Landing”, “On-block”, “Shutdown”.

1. Enter the times, or click the “now” button next to the field (local time of the departure
   airfield; failing that, Paris time).
2. The durations are calculated on their own in “Automatic calculations”.

Each time creates and keeps up to date the matching timed event. An inconsistent time (zone exit
before the entry, invalid time, timeline of more than 20 h) is highlighted and listed under the
calculations. Network tracking and importing a tracker page also fill in these times.

### Fuel (lead aircraft)

Fuel on board, used and remaining for aircraft no. 1.

- Choose the “Unit” (kg, lb, L, US gal), then enter “FOB start”, “Taxi”, “At
  take-off”, “At landing”, “At block-in”, “Reserve”, “Diversion fuel”.
- For families that work on station: “Arrival on task”, “Fuel on station”, “Task
  departure”.
- “Fuel used” and “Fuel on station” are calculated in the right-hand column.
- A final fuel higher than the starting fuel is flagged.

### Family-specific blocks

They are placed after Fuel and before Events. Their list is in the table
[Blocks specific to each family](#blocks-specific-to-each-family). Some only appear for a
series, an aircraft category or a ticked capability: the “Display context” line, under the
calculations, recalls the series, the aircraft types and the capabilities taken into account.

### Timed events +

Notable events, with their time, in a compact table (one line per event, the description on
a 2nd line).

1. “+” in the title (“+ Add event”) adds a line.
2. Fill in “Local time” (the “UTC” time is calculated), “Type”, “Position”, then if useful
   “Altitude”, “Speed”, “Heading”, “Fuel”, “Description”, “Result”.
3. “×” at the end of the line removes the event.

The types offered include the common events (take-off, diversion…) and those of the family
(SAR: start / end of search, beacon detected, survivor located, survivor recovered, SAR kit
dropped…). Events created by the timeline follow its times; an event completed by hand
is never removed.

### Legs / sorties / rotations +

Legs, sorties and rotations of the flight, one line each: “From”, “To”, “Take-off”, “Landing”,
“Passengers”, “Cargo (kg)”, “Note”. The “+” in the title adds a leg.

- Airfields are suggested from the aerodrome database.
- Legs count in the sorties, passengers and cargo of the reporting pages.
- The HEMS family does not have this block: it has its own “Destinations / stops” block.

### Remarks

Free observations and lessons: “Observations” and “Lessons learned”. They
form the sections “13. Remarks” and “14. Lessons learned” of the report. An assigned mission
puts there a reminder of the original mission and of its load.

### IVAO / VATSIM network track

Track of the flight on IVAO or VATSIM.

| Field | Role |
|---|---|
| “Network” | “Offline / not provided”, IVAO or VATSIM |
| “IVAO ID (VID)”, “VATSIM ID (CID)” | taken from your pilot profile (☰ menu › Pilot profile) |
| “Track URL” | link to the track; it appears in the report (“Open track”) and in the reporting pages |

The network entered feeds the “Network” chart and the “Online” indicator of the reporting.

### Navigation

Airfields, route, points and work area. The block starts with the **Filed flight plan** bar:

| Button | Source |
|---|---|
| “Latest SimBrief OFP” | your SimBrief identifier from the pilot profile |
| “IVAO flight plan (current flight)” | your VID |
| “VATSIM flight plan (current or prefiled)” | your CID |

These buttons fill in **only the empty fields**: aircraft, ICAO equipment, route, waypoints,
levels, airfields, METAR / TAF and planned masses and fuel (SimBrief).

Fields: “Departure (ADEP)”, “Destination (ADES)”, “Alternate (ALTN)”, “Route” (only routes
already used for the same trip are suggested), “Waypoints (one per line)”,
“Coordinates”, “Altitude / FL”, “Minimum altitude”, “Speed (kt)”, “Distance (NM)”. Depending on the
family: “Operating area”, “Radius (NM)”, “Corridor”, “Holding / orbit”.

### Environment / weather

Weather and environment conditions met. As a rule, **nothing to do**: as soon as the departure
airfield, the date and the time are known, the page calculates a METAR at the time of the flight (Open-Meteo model), the
wind, the temperature, the QNH, the visibility, the ceiling, the “Density altitude (ft)”, the sunrise and
sunset and the “Day / night”.

- What you enter yourself is never replaced.
- The “Current departure METAR (VATSIM)”, “Computed METAR at flight time
  (Open-Meteo)” and “Compute sunrise / sunset” buttons redo the calculation on request.
- A METAR pasted into “METAR” is analysed (wind, T°, QNH, visibility, ceiling).
- “Sea state” only appears for a maritime mission, a shipborne mission or one on an amphibian;
  “Illumination (moon…)” only for a night flight or under NVG.

### Automatic calculations

Right-hand column, updated while you type: “Block time”, “Flight time”, “Transit outbound”,
“Time on station”, “Transit inbound”, “Mission time”, “Fuel used”, “Fuel on station”.

- Below, any anomalies start with ⚠ (invalid time, time before the previous leg,
  timeline of more than 20 h, future date, inconsistent fuel). A click takes you to the field concerned.
- “Display context” recalls the family, the series, the aircraft types and the capabilities, which
  decide which blocks are shown.
- At levels 1 and 2 (short report), three calculations only: “Block time”, “Flight time”, “Fuel used”; “Display context” and the station and mission calculations come at level 3 or with “Detailed report”. A click on an anomaly about a hidden field shows the detailed report.

### Report

Preview of the report, under the calculations, refreshed while you type and at each change of language.
It has 14 sections (identification, summary written automatically, aircraft, crew, tasking,
weather, timeline, execution, specific data, results, fuel, incidents, remarks,
lessons learned).

| Button | Role |
|---|---|
| “Generate / refresh report” | redoes the preview on request |
| “PDF / Print” | prints **only** the report (or saves it as PDF) |
| “Public version (sensitive data hidden: report, print, export)” | box visible for the families with sensitive data (COMMAND, ISR, LE, SOF, SPECIAL) |

The public version also applies to the YAML export (file with the `_public` suffix) and to sending.

### Analyse / import…

Header menu to fill in the report from a pasted text. **Only empty fields are filled in.**

1. Open the menu, then paste (Ctrl+V) into the box: the analysis is immediate. Or click “Paste
   from clipboard” (Chrome asks for permission once).
2. Recognised texts: ICAO flight plan “(FPL-…)”, IVAO tracker page (details of a flight or list of
   connections), StatSim flight page (VATSIM), VATSIM history (JSON), METAR.
3. The result shows the source recognised and the fields filled in; the button becomes “✓ Confirm”.

The “↗ IVAO tracker (my connections)” and “↗ My StatSim flights (VATSIM)” links open your pages. The
“→ CR” link, to drag into the bookmarks bar, copies the tracker page in one click. At the bottom,
“Import (YAML / legacy JSON)” loads a mission file. Details: [tutorial](../TUTORIAL.md), § 6.

### Network tracking

Header menu to record the times during the flight.

- “Start live tracking” before engine start, then **keep the page open** until
  shutdown. Every 20 s, the page reads the public IVAO / VATSIM data and fills in engine
  start, take-off, landing and mission end. “Stop tracking” interrupts it.
- After a VATSIM flight without tracking: “Retrieve VATSIM history” opens the history in a tab;
  copy everything (Ctrl+A, Ctrl+C) and come back: the connection times are taken over (check them).
- You need your IVAO or VATSIM ID (Network track block or pilot profile).

### Draft, ledger and export

**Draft.** Each entry is kept in the browser (“Draft saved in the
browser”). You can close the page and come back: the family's draft is reopened. Leaving
without having saved in the ledger shows a warning.

**Save in the ledger.**

1. The first time: “Mission ledger ▾ › Ledger folder…” and choose the `data/cr` folder
   of the data (browser permission, valid for all families).
2. Click “Add to ledger”: the mission is written to the single ledger `missions.yaml`
   (all families). If this report number already exists, the page offers to add it anyway (duplicate) or
   to cancel to correct it.
3. The page switches to editing: “Save changes” files the next corrections.

Without an allowed folder, the mission is saved in the browser only; “Download the
ledger (YAML)” then appears in the “Mission ledger” menu. The menu recalls the file, the
number of missions of the family and the folder.

**Other actions.**

| Action | Effect |
|---|---|
| “Mission ▾ › New mission” | starts again from a blank report (confirmation if the draft is not saved) |
| “Mission ▾ › Export mission (YAML)” | downloads a file of this mission only |
| “Send report” | sends mission, report (HTML and text) and calculations to the web service; the button's tooltip recalls the last sending. A mission that is not saved asks for confirmation |
| “Mission ledger ▾ › View reporting” | opens the family reporting |

As long as the web service is not set up, “Send report” offers to open its settings
(“Report sending settings (web service)…”).

### Blocks specific to each family

Conditional blocks are only shown if the stated condition is met. The last column
gives the family's own indicators, used in the reporting pages.

| Family | Specific blocks (in page order) | Family indicators |
|---|---|---|
| HEMS | Service and status · Medical mission · HEMS times · Destinations / stops (replaces “Legs / sorties / rotations”) | patients transported, missions completed, alert → take-off (average, ≤ 15 min) |
| FIRE | Flight order · Wildfire times · Drops and reloads | firefighting drops, reloads / scoopings, average fuel burn (/h) |
| SAR | SAR alert and coordination · Persons sought · Search areas and patterns · Contacts detected · Location and recovery · Hoist (helicopter + hoist ticked) · SAR kit drop (aeroplane or amphibian + drop ticked) | search areas, persons located, persons rescued, hoists, SAR kits dropped |
| AIRLIFT | Origin, destination and stops · Cargo manifest · Passengers and special loads · Runway and ground operations · Delivery | passengers, cargo (t), payload delivered (t), rotations |
| AAR | Role, area and rendezvous · Receivers and fuel offloaded · Fuel balance and incidents | receivers, fuel offloaded (t), contacts, breakaways |
| MARITIME | Maritime area and conditions · Vessel contacts · Pollution observed · Report transmission | vessels detected, vessels identified, issues, pollution observed |
| HADR | Disaster and context · Pickup, evacuation points and shelters · Evacuees and personnel · Relief cargo · Supply drop (“Supply drop” series or drop ticked) | evacuees, relief personnel, relief cargo (t), relief sorties |
| AIRBORNE | Drop zone (DZ) · Drop passes | jumpers, drops, cargo dropped (kg), drops on DZ |
| FI | Facility inspected · Passes / runs · ILS (ILS, LOC, Glide path series) · VOR / DME / TACAN / NDB (matching series) · Procedure validation (“Procedure validation”, RNAV / GNSS series) · Visual aids / lighting (PAPI / VASI, “Airport lighting” series) · Inspection conclusion | facilities inspected, passes, anomalies / out of tolerance, serviceable, unserviceable |
| SURVEY | Project and survey area · Survey lines · Acquisition and data · Weather measurement points (“Weather reconnaissance” and “Atmospheric research” series) | survey hours, lines completed, area covered (km²), datasets |
| LE | Authority and coordination · Objective · Successive positions | trackings, tracking time, positive identifications |
| ISR | Collection task · Sensors employed · Contacts / tracks · Emitter / communication observations (SIGINT, ELINT, COMINT series) · Coverage and dissemination | contacts, imagery collected, recording, average coverage (%) |
| COMMAND | Interception (“Air policing / interception (QRA)” series) · Station and authority · Units coordinated · Frequencies and networks · Coordination log · Mission effectiveness | time on station, units coordinated, relays, communication outages |
| COMBAT | Setup and area · Interception (“Interception / identification (VID)” series) · Engagements · Session debrief | engagements, wins, valid shots, knock-it-offs (KIO) |
| SOF | Supported unit · Zones (PZ / LZ / DZ) · Profile and methods · Personnel | personnel delivered, personnel recovered, zones used, night NVG missions |
| SPECIAL | VIP / government transport (VIP series) · Ferry (ferry series) · Flight test and Test points (test series) · Training and Exercises (training series) | VIP passengers, ferry flights, test points passed / flown, exercises completed |

The HEMS and FIRE families can take over their old CSV ledger: see
[Family reporting](#family-reporting).

## Aircraft sheet
<!-- page: apps/cr/appareil.html -->

The sheet gathers everything known about an aircraft, identified by its registration: identity,
status, activity, life, performance and missions. Pilots and the Centre use it to follow an
aircraft. You open it by clicking a line of “Summary by aircraft” in the general reporting, the
“Aircraft sheet ↗” link of an aircraft card in the report, a registration in a crew sheet, or from
the Flight Planner. Nothing is mandatory there: the sheet fills in as reports come in.

### Header: status and position

The title shows the registration, the type and the model. Below it, three badges:

- the **status** (Available, Unavailable, In maintenance, Retired), in colour;
- “📍 Currently at”: last known airfield (arrival of the last mission or of the last flight in the
  Log);
- “🏠 Home aerodrome”.

The reporting **period** bar (presets, dates, ◀ − ▶) is in the header: activity,
chart and table follow it. An aircraft unknown to the databases shows “Unknown in the bases: the
sheet will fill as reports come in”.

### Identity

| Element | Editable | Content |
|---|---|---|
| “Status” | yes | list above |
| “Home aerodrome” | yes | ICAO code, in capitals |
| “Commissioned” | yes | date |
| “Type”, “Variant”, “Wing”, “Wake turbulence”, “Operator” | no | taken from the fleet and from the type database |
| “Fleet sheet” | no | link to the aircraft's sheet on the fleet website |
| “Callsigns used”, “Equipment” | no | collected from the missions, with their count |
| “Notes” | yes | free text |

Click “Save sheet”: the sheet is kept **in this browser** (included in the local
backup). The identity is calculated over the whole history, whatever the period.

“Merge with… / rename”: choose another registration, then “Merge”. The ledger missions
that carry the old value take the new one (after confirmation, with a trace in
each mission); the sheet completes the one of the target.

### Activity

Cards for the period: “Missions / flights”, “Flight hours”, “Block hours”, “First flight”,
“Last flight”. Below, a chart of flight hours per period, stacked by family.

- Drag over the chart or click a bar to zoom in on that period.
- Double-click to zoom out.

### Aircraft life (maintenance, inspections, incidents…) +

Log of the aircraft's events.

1. The “+” in the title adds a line at the top, dated today, of kind MAINTENANCE, at the current airfield.
2. Correct “Date”, “Kind” (MAINTENANCE, INSPECTION, INCIDENT, MODIFICATION, CONVOYAGE, AUTRE),
   “Airfield” and “Description”.
3. “×” deletes the line.

Each change is saved at once in the browser.

### Performance and fuel burn (Flight Planner)

Flight Planner performance profile for this aircraft type.

- “Climb”, “Cruise”, “Descent” cards: hourly fuel burn and true airspeed (and
  rate), plus “Reserve” if it is known.
- RPM / power → consumption curve, when the profile contains one (hover for the values).
- “Open in the Flight Planner ↗” opens the planner on this type.

Without a profile, the block shows “No performance profile for this type yet: create it in the
Flight Planner.”

### Missions and flights

Table of the aircraft's missions and flights over the period: date, family, number, callsign, departure →
arrival, crew, flight hours, source (“ledger” or “Log”).

- Click a column title to sort.
- Click a ledger mission to open its report for editing; flights from the log are
  read-only.
- Under the table, when a period is chosen: buttons to see the missions before or after the
  period, and zoom − / +.

## Crew sheet
<!-- page: apps/cr/equipage.html -->

The sheet of a crew member, identified by the name or trigram entered in the reports: identity,
qualifications, activity and missions. You open it by clicking a line of “Summary by crew
member” in the general reporting (address: `equipage.html?name=PLN`). The reporting period is
in the header, as for the aircraft sheet.

### Identity

| Element | Editable | Content |
|---|---|---|
| “Name” | yes | full name, added to the title of the sheet |
| “Home aerodrome” | yes | the pilot's base |
| “Roles held” | no | roles held in the reports, with their count |
| “Qualifications (one per line)” | yes | free text |
| “Notes” | yes | free text |

“Save sheet” keeps it in this browser. “Merge with… / rename” brings together two
spellings of the same pilot (e.g. GRR → RBR): the ledger missions take the new value, with
a trace, after confirmation.

### Activity

Cards for the period: “Missions / flights”, “Flight hours”, “First flight”, “Last flight”. Then
“By type”: flight hours per aircraft type. The chart stacks the hours by family; dragging
or clicking zooms in, double-clicking zooms out.

For a pilot with no mission in the ledger, the figures come from the reference if it knows the pilot.

### Missions and flights

Same table as the aircraft sheet, with in addition the “Reg.” column (link to the
aircraft's sheet) and the type. Sort by column title; click on a ledger mission: report in
editing; flights from the log are read-only.

## Reporting
<!-- page: apps/cr/mission_operations_reporting.html -->

The general reporting shows the activity of **all families** from the single ledger
`data/cr/missions.yaml`: indicators, charts, summaries and table of missions. Pilots use it
for their review and the Centre for follow-up. To go there: side bar › **Tools**, “Mission analysis” tab (optional tool, ticked in My profile).

### Families and period

First block of the page (the header only keeps the title and subtitle): it folds and moves like the others; when printed, only the period appears.

| Element | Role |
|---|---|
| “New report” | opens the family choice page |
| Period | preset (All dates, Today, Last 7 days, Last 30 days, Current month, Current year, Custom period), start and end dates, ◀ back, − zoom out ×2, ▶ forward |
| “Families” | one coloured chip per family: click to hide / show, Ctrl + click to keep only one, “All” to toggle everything |
| “Grouping” | Automatic, Day, Week, Month, Quarter, Year |
| “Measure” | Missions, Flight hours, Block hours, Time on station, Mission hours, Sorties, Distance (NM) |
| “Data” | “My missions (ledger)”, “Log (flights flown)” (read-only) or “Load / update the log…” |

The period is shared with the family reporting pages and the sheets. Families, grouping and measure
are remembered.

### Indicator cards

At the top of the page: missions, success (%), flight, block and on-station hours (with the average over the
missions filled in), sorties, distance, fuel per unit, persons / cargo, night /
twilight flights, online (IVAO / VATSIM), real operations (and exercises), aircraft (and types),
crew. A card without data is not shown.

### Data checks

This block only appears if there are missions to correct. It lists the family, the mission number, the date
and the anomalies (⚠ invalid time, reversed timeline, more than 20 h, future date, inconsistent
fuel, duration declared without times). Click a line to open the report and correct it.

### Activity by period

Bars stacked by family, according to the grouping and measure chosen (recalled next to the title).

- Hover over a bar for the details.
- Drag over several bars, or click a bar, to keep only that period: the whole
  reporting follows.
- Double-click to zoom out.

### Breakdowns

Nine charts, all calculated according to the measure chosen (hover for the details):

| Block | Content |
|---|---|
| “By family” | ring, one colour per family |
| “Outcomes” | success, aborted, diverted… |
| “Series (mission types)” | family · series |
| “Aircraft types” | ICAO type of the lead aircraft |
| “Capabilities used” | boxes ticked in the reports |
| “Departure aerodromes” | ADEP or departure base |
| “Day / night” | day, night, twilight / dawn, not provided |
| “Network” | IVAO, VATSIM, offline |
| “Exercise / real operation” | exercise / simulation, real operation |

### Summary by family

A table, one line per family: missions, sorties, success (%), flight hours, average flight, block, on
station, distance, fuel, “Family indicators” (drops, persons rescued, alert →
take-off…). Click a line to open the family reporting; the “Reporting” column carries the
same link (↗).

### Summary by aircraft

One line per registration: type, callsigns, families, missions, flight hours, block, last
mission. Click a line to open the [aircraft sheet](#aircraft-sheet). Sort by column title.

### Summary by crew member

One line per name: roles, families, missions, flight hours, last mission. Click a line
to open the [crew sheet](#crew-sheet).

### Missions (sort, click to edit, delete)

Table of all the missions selected: family, mission number, date, series, type, registration,
callsign, departure → arrival, outcome, flight, block, on station, day / night, network track.

1. Click a column title to sort.
2. Click a line: the report opens for editing in the page of its family.
3. “Delete” at the end of the line removes the mission from the ledger (with confirmation).

**“✎ Edit in the table”** (in the title) makes date, mission number, series,
registration, callsign, departure / arrival, outcome, flight and block editable. Each cell is saved
at once in the ledger, with a trace in the mission; “✓ Done” goes back to the normal display.
A duration entered without times is “declared” (≈), counted, and flagged in the data checks until
the times are entered in the report.

Under the table, when a period is chosen: “◀ n before the period”, “− / +”, “m after the
period ▶”. Flights from the log are read-only.

### Mission ledger

| Button | Effect |
|---|---|
| “Export ledger (YAML)” | downloads the whole ledger |
| “Export CSV (spreadsheet)” | export for a spreadsheet |
| “Ledger folder…” | chooses the `data/cr` folder where `missions.yaml` is written |
| “PDF / Print” | prints the page |
| “Import a legacy CSV ledger” | takes over an old HEMS or FIRE / GAAR ledger, without duplicates (same number and date) |

The information line recalls the file, the number of missions and the folder (or “browser
only”).

## Family reporting
<!-- page: apps/cr/AAR/aar_reporting.html -->
<!-- page: apps/cr/AIRBORNE/airborne_reporting.html -->
<!-- page: apps/cr/AIRLIFT/airlift_reporting.html -->
<!-- page: apps/cr/COMBAT/combat_reporting.html -->
<!-- page: apps/cr/COMMAND/command_reporting.html -->
<!-- page: apps/cr/FIRE/fire_reporting.html -->
<!-- page: apps/cr/FLIGHTINSPECTION/fi_reporting.html -->
<!-- page: apps/cr/HADR/hadr_reporting.html -->
<!-- page: apps/cr/HEMS/hems_medevac_reporting.html -->
<!-- page: apps/cr/ISR/isr_reporting.html -->
<!-- page: apps/cr/LE/le_reporting.html -->
<!-- page: apps/cr/MARITIME/maritime_reporting.html -->
<!-- page: apps/cr/SAR/sar_reporting.html -->
<!-- page: apps/cr/SOF/sof_reporting.html -->
<!-- page: apps/cr/SPECIAL/special_reporting.html -->
<!-- page: apps/cr/SURVEY/survey_reporting.html -->

The reporting of a family only shows the missions of that family, with its own indicators.
You reach it from “Mission ledger ▾ › View reporting” in a report, from a line of “Summary
by family” in the general reporting, or from the “family · subtype” menu of the “Family and period” block of another reporting page.

### Family and period

| Element | Role |
|---|---|
| “family · sub-type ▾” | changes family (opens its reporting) or filters on a sub-type (“All sub-types” by default) |
| “+ New report” | opens the family's report page directly |
| Period | same component and same period as the general reporting |
| “Grouping”, “Measure” | settings of the activity chart (Missions, Flight time, Block time, Time on station), shared with the general reporting |
| “Data” | ledger or log, as in the general reporting |

### Mission ledger

| Button | Effect |
|---|---|
| “Export ledger (YAML)” | downloads the missions |
| “Export CSV (spreadsheet)” | export for a spreadsheet |
| “Import missions (YAML)” | adds one or more exported missions to the ledger |
| “Ledger folder…” | chooses the `data/cr` folder |
| “PDF / Print” | prints the page |
| “Import legacy HEMS ledger (CSV)” / “Import legacy FIRE / GAAR ledger (CSV)” | HEMS and FIRE only: takes over the old ledger, without duplicates (same number and date) |

The information line recalls the file, the number of missions and the folder.

### Summary

Cards for the period and the sub-type chosen: missions, sorties, successful, flight hours, block, mission
hours, time on station, distance, fuel, persons and cargo carried, then the **indicators
specific to the family** (see the table [Blocks specific to each family](#blocks-specific-to-each-family)).

### Activity by period

Bars stacked by **sub-type** of the family, according to the grouping and the measure. Same zoom as in the
general reporting: drag or click to zoom in, double-click to zoom out.

### Detailed breakdown

Four bar lists (the first 8 values): “By series”, “By outcome”, “By aircraft
type”, “By capability used”.

### Missions (sort, click to edit, delete)

Columns: mission number, date, series, aircraft, registration, callsign, outcome, flight, block, on
station, track, “Check” (⚠ number of anomalies, details on hover).

- Click on a column title: sort.
- Click on a line: the report opens for editing.
- “Delete” at the end of the line, with confirmation.
- “✎ Edit in the table”: same rules as in the general reporting.

## Flight maps
<!-- page: apps/planner/map_planner.html -->

This page is used to prepare your own flight maps: route, route map, approach, rendezvous, destination airfield and vertical profile.
It is open to all pilots. To go there: “Tools” in the side bar, “Flight maps” tab, the “Open in the flight maps” button of a mission in My missions, or the “Flight maps” button of the fuel planner.
It uses the engine of the Centre's map studio, but works in a space of its own in your browser: your settings never change the Centre's mission.
Each block collapses (“Hide” / “Show”) and moves (↕ handle). The SIA database must be read once in this browser (see the last block).
At levels 1 to 3 (My profile › “Usage level”), the page is limited to two blocks: “Route” (route field, “Level”, “SimBrief”, control map with “⤢ Enlarge”) and “Maps”, with its single “Generate the maps and the ZIP” button. The other controls described below only appear at level 4 (Expert).

### Receiving a mission (“Open in the flight maps”)

The page has no “Mission” block: the mission arrives on its own from My missions.

1. In My missions, open the mission folder.
2. Click “Open in the flight maps”. The aircraft assigned to you is placed first in the mission.
3. The page opens with the route and the level of the mission in the “Route” block, and all the maps planned by the mission in “Maps to produce” (plus `profil_vertical.png`). The “Maps to produce” list is only visible at the Expert level.
4. Adjust each map if needed (Expert level), then click “Generate the maps and the ZIP”: in the “Maps” block at levels 1 to 3, in the footer at the Expert level.

The footer shows the number of maps in the ZIP (“… map(s) in the ZIP + index map”), or “No mission loaded”.
Mission received: “Draw” and “Fuel” work on the loaded mission without replacing it. At levels 1 to 3, “Generate the maps and the ZIP” generates its maps as they are. At the Expert level, “Prepare the maps” asks for confirmation before replacing it with a free flight “Flight departure → destination” built from the route; with no mission loaded, the maps are created directly.

### Route

This block links three views: the flight plan (text), the map and the vertical section. Hovering over a point in one of them highlights it in the other two. Some messages of the page call this block “Route”.

- Route field: item 15 of the ICAO flight plan, or a comma list (for example `LFBO N0160A055 DCT TOU UN460 NTS DCT LFRN`). Empty: route of the mission.
- “Level”: cruise level (“FL65” or “6500”).
- “Airways” / “RTBA (low level)” menu, then “Search”: calculates a route between the points of the field. The result replaces the field.
- “SimBrief”: takes the route of the latest OFP. The SimBrief identifier is entered in ☰ › Pilot profile.
- “Draw”: draws the vertical section. “Fuel”: opens the fuel planner with this route (distance, level, true track, aircraft).
- “Copy ICAO”: copies the strict ICAO flight plan (unpublished points as coordinates).
- “Syntax and use”: reminder of the accepted forms (beacons, VFR reporting points “MM-CV”, “REN300010”, coordinates “4330N00125E”, levels “/A035”, “VFR”…).
- At levels 1 to 3, the route field, “Level”, “SimBrief” and “Syntax and use” remain; the “Airways” / “RTBA” menu, “Search”, “Draw”, “Fuel” and “Copy ICAO” are at the Expert level.

On the map: drag a point to move it (it snaps to beacons, reporting points and airfields), click the route to insert a point, right-click to delete one. On the section: click to add a point at that altitude, drag to change the altitude, right-click to delete.

### Control map and framing (Route block)

Under the route field, a control map shows the chosen map with its display profile. It is redrawn at each setting. At levels 1 to 3, only “⤢ Enlarge” is offered; the other controls of the table and the “Profile settings: section, aircraft, climb rate, outputs” are at the Expert level.

| Control | Effect |
|---|---|
| “Map” | Map shown (by default: the general route map). |
| “Profile” | Display profile of this map (same setting as in “Maps to produce”). |
| “ZIP” | Put this map in the ZIP or not. |
| “Refresh” | Redraw the preview. |
| “Keep this framing” | The generated map will use exactly the frame shown (zoom and move with the mouse). |
| “Recentre” / “Automatic framing” | Go back to the saved framing / forget it for a frame calculated from the mission. |
| “⧉ Window” / “⤢ Enlarge” | Open the map in a separate window / enlarge it (Esc to go back). |

“Profile settings: section, aircraft, climb rate, outputs” sets the vertical section: floor and ceiling (0 = auto), aircraft (fuel planner profiles) or climb and descent rates, `profil_vertical.png` image in the outputs, drawing of the route on the maps.

### Profile settings: base map, airspaces, ICAO symbols, elements

This collapsible panel, placed under the control map, sets the display profile of the chosen map. The profiles (IFR, simplified IFR, detailed VFR, simplified VFR, AIRWAYS…) are shared by all your missions and kept in the browser. Default profile of a map: AIRWAYS for the route map of the Flight maps; simplified IFR for the main map of a mission and the overview maps; detailed VFR for the target, detail and rendezvous maps; simplified VFR for the approach. Expert level panel.

- At the top: “Profile name”, “Base map” (standard OSM, OpenTopoMap, vector base maps…), “Save”, “New”, “Duplicate”, “Delete” buttons.
- “Base map” tab: OSM layers (ground, hydrography, roads, relief, contour lines, summits…), towns as ICAO symbols and population threshold, town labels, built-up areas.
- “Airspaces” tab: airspace families (R / D / P, CTR, TMA, CTA, SIV, TRA, RMZ, TMZ, PJE), ICAO symbology, altitude band shown, opacity. “Airspace selection”: allow list or block list (“Whitelist” button to switch), entry with completion (“R 45 A”, “@RTBA”…), “Paste a list…”, “Remove all”. “Selected airspaces” shows the result.
- “ICAO symbols” tab: aerodromes (by category, controlled or not, allow list), radio navigation, low and high airways, today’s NAT tracks (magenta dashes, “NAT A”; North Atlantic zone active), VFR reporting points and en-route RNAV points (blue triangle), overflight prohibited, parks and reserves, obstacles.
- “Elements” tab: waypoints, meridians and parallels, MORA grid, town labels, refuelling racetrack, mission and search areas.

Remember to click “Save” to keep a changed profile. The suggestion lists of the input fields (zones, aerodromes, waypoints) are filled only when you click in the field concerned: the page opens faster, and the list appears at the click or the first keystroke.

### Maps

This block creates the maps of a flight from the route, without a Centre mission; at levels 1 to 3, it also generates them.

1. Enter the route and the level in the “Route” block (at least a departure and a destination known to the SIA database).
2. Optional: “Rendezvous (optional)”, a point or coordinates “44.2, 0.6”.
3. Tick the maps you want: “route (overview, IFR)”, “approach”, “rendezvous”, “destination”.
4. Click “Generate the maps and the ZIP” (levels 1 to 3): the maps are created then generated, the progress (with “Stop”) and the report are shown just below and the ZIP is downloaded. At the Expert level, “Prepare the maps” only creates them: settings in “Maps to produce”, generation in the footer.

The page builds a “Flight departure → destination” mission with the ticked maps and the vertical profile. The rendezvous map is only created if a rendezvous is entered.
At levels 1 to 3, the page has neither footer nor “Previews and generation” block: everything starts from this block's button.
After that, any change to the route, the level or the rendezvous updates the maps automatically.
Arriving from the fuel planner (“Flight maps” button): the maps are created on their own as soon as the SIA database is loaded.
Possible error messages: “SIA database missing from this browser”, “Route: unknown in the SIA database”, “No map chosen”.

### Maps to produce

Expert level block. The “Mission maps” list gives one line per map:

| Element of the line | Use |
|---|---|
| File name | Click: show the map in the control map (✎: custom framing). |
| Profile | Display profile of the map, or “Disabled”. |
| Line | “No line”, “Brief: route”, “Organisation: probable route”, “Route + probable route”. |
| Recipient | Only for exercise missions: brief, organisation, exercise target or crew. |
| “ZIP” | Untick to not generate the map. |
| “×” | Remove the map from the mission. |

To add a map: enter a name (“nouvelle_carte.png”), choose the type (general, target, detail, area), then “+ Map”. Its extent is the view shown.
With no mission and no maps created, the list shows “No map: add one below.”

### Previews and generation

Expert-level block; at levels 1 to 3, the generation report (maps generated, failures and “Retry this one”) is shown under the button of the “Maps” block.

1. “Show all maps”: draws a preview of each map with its profile. The previews create no file. Click on a preview: enlargement.
2. Each preview keeps its “ZIP” box.
3. “Generate the maps and the ZIP” (button of the footer): downloads a ZIP with each map, the index map and `profil_vertical.png` if this output is ticked.

The “Index map” appears by itself under the previews; it uses the profile of the general map.
Formats: ☰ menu › Map outputs (PNG, editable SVG, PNG width from 400 to 5000 px; 1600 px by default).
If a map fails (base map unavailable, timeout), the ZIP contains `rapport_generation.txt` and the list offers “Retry this one”.
The buttons stay greyed out as long as there is no map to produce. During the previews and the generation, the progress bar carries a “Stop” button: the map in progress is completed, the next ones are not made. A stopped generation downloads no ZIP (it would be incomplete); the previews already shown stay. Run “Generate the maps and the ZIP” again for all the maps.

### SIA database

This block is at the Expert level and hidden by default: click “Show”. When the database is missing in this browser, it opens by itself, whatever the level. It reads the SIA folder (AIXM) and keeps it in the browser. Without it, the page recognises no airfields, no beacons and no airspaces.

- “SIA folder: …” button: choose the `data/sia` folder (the browser asks for access), then reading.
- “Rebuild the aeronautical database”: to do after each AIRAC update; reads the active zones of Settings › Maintenance › Aeronautical data. A gauge follows the reading; “Cancel” interrupts it without touching the database kept.
- “Purge the cache”: clears the database kept (it will be rebuilt at the next reading).
- The status line shows the database kept, its AIRAC cycle and its date; “outdated cycle” is shown if a more recent cycle is in force. “Files analysed” lists the files read.
- Without a database, the page says so: “SIA database missing from this browser: ‘SIA database’ block, ‘Rebuild the aeronautical database’, or Settings › Maintenance.”

It is the same block as Settings › Maintenance › Aeronautical data. The same database is used for the vertical profile of the fuel planner. Details: [SIA missions](../SIA_MISSIONS.md).

## Fuel
<!-- page: apps/planner/flight_performance_planner.html -->

The fuel planner (title “Fuel”) calculates the fuel for a flight from the performance profile of your aircraft. The cruise fuel flow comes, in order, from your entry for this flight, the saved profile, the Poll-Schumann model (jet airliners, according to mass, level and Mach), SimBrief, then an estimate by ICAO type or class; an approximate value is marked ≈. For a type without an EUROCONTROL or SimBrief record (military aircraft, helicopters), the estimate uses the cruise TAS and ceiling published by Airframe DB when it knows them. It also draws the optimum altitudes and climb laws.
To go there: “Tools” in the side bar, “Fuel” tab, the “Fuel (planner)” button of a mission in My missions, or the “Fuel” button of the Flight maps. The route, the distance, the level and the aircraft are then carried over.
Header: “Aircraft” menu, “Fetch latest SimBrief FPL” button, “Units: kg / lbs”. Imports and exports are in the ☰ menu. Technical details: [planner](../FLIGHT_PLANNER.md).
Depending on the usage level: at levels 1 to 3 (Crew, Planning, Design), the page shows the aircraft, the flight plan (and “Fetch latest SimBrief FPL”), the collapsible “Flight parameters” section, “Calculate” and the Result, in two columns; the ☰ menu only keeps exporting and importing the preferences. Curves, panels, instruments, profile blocks, status bar and the profile actions of the ☰ menu are added at the Expert level, where the page is complete.

### Choose the aircraft and save the profile

1. Click the aircraft button in the header (“No aircraft” at first): a list opens, one line per aircraft (icon, name, type, profile source, state).
2. Choose an aircraft with the mouse, or with the arrow keys then Enter; Escape closes the list.
3. A fleet type without a profile creates an empty profile: its performance must be filled in (see also “Performance profiles”).

The bar at the bottom of the page shows “Profile saved — …” or “Unsaved changes — …”. It carries “Reload the local database”, “Save profile” and “Delete this aircraft”. This bar only appears at the Expert level.
If you change aircraft with unsaved changes, the page offers “Stay”, “Discard and switch” or “Save and switch”.
☰ menu: import profiles / CSV / JSON (including Little Navmap `.lnmperf`), import a SimBrief airframe, choose the performance folder, export the `.lnmperf` or JSON profile, save the local database, restore the previous backup, export or import the preferences. These actions are at the Expert level, except exporting and importing the preferences.

### Fuel plan

1. “Flight plan (item 15)”: enter the route. It is the same plan as the Flight maps (the most recent one wins). The distance, the true track and the level are deduced from it.
2. Complete or correct the fields of the collapsible “Flight parameters” section (unfolded from the start at the Expert level, collapsed otherwise; the default values are enough for a quick estimate): “Distance (NM)”, “Level (FL)”, “True track (°)”, “Taxi (min)”, “Wind from (°)”, “Wind (kt)”, “Reserve (min)”, “Contingency (%)”.
3. Optional, in the same section: “Planned take-off mass”, compared with the type's MTOW; “ISA deviation (°C)”, or “Ground temperature (°C)” with “Field elevation (ft)”, or “Temperature at level (°C)”. “Cruise fuel flow (kg/h)”: filled in from the profile; without a profile, the page says which value it will use and where it comes from (for example “≈ 4,000 kg/h, type estimate A400”); “Use this value” copies it into the field, “Remember for this type” keeps it for the next flights. “Chosen climb” (detailed view): three sliders, “IAS”, climb rate and “Throttle (%)” (RPM or N1 if the profile has an engine map), each preceded by a “fixed” box; two are fixed, the third is calculated and greyed out; “full throttle” shows under the climb rate; the line below gives fuel flow, TAS and throttle at mid-climb. This is the climb the fuel plan counts.
4. Click “Calculate”.

Wind left empty: the page says so (“Unknown wind: ±25 kt range…”) and gives the fuel as a range.
The “Flight maps” button (Expert level) opens the Flight maps with this flight plan; the maps and the profile are created there on arrival.
“Flight plan syntax” recalls the accepted forms. Without the SIA database in the browser, only points given as coordinates are recognised.

### Fuel plan curves (optimum altitude and climb)

In the detailed view (“Detailed view” / “Simple view” button of the Result; detailed by default at the Expert level, simple at levels 1 to 3), after “Calculate”, the “Fuel plan” block shows, in order:

| Title | What it shows |
|---|---|
| “Optimum altitude — fuel and speed” | Whole trip flown at each level: the higher the curve, the less fuel per mile. |
| “Optimum climb — rate and fuel” | Available climb rate and fuel per 1000 ft, “by altitude” or “by power setting”. |
| “Climb speeds — IAS and TAS by altitude” | Vy, fast climb, economy climb, chosen climb, Vx. |
| “TAS by level — cruise and climb” | True airspeed in cruise and in climb. |
| “Climb comparison” | Time, distance and fuel of each climb, up to the plan level then over the whole trip; ★: best in the column. |
| “Climb by altitude — RPM / N1 settings” | Table at Vy with totals from the ground. |

Hover over a curve to read the values at that altitude; click to pin a level (white line on all curves). The fuel plan is then calculated at that level.
The “Chosen climb” sliders of the fuel plan set your chosen climb, drawn in purple on the curves.
The greyed “unreachable” area lies above the aircraft's ceiling.

### Climb instructions

This block, under “Calculate”, says how to climb, at every usage level.
- Five goals, each with its time and fuel up to the level: “Eco”, “Vy”, “Fast”, “Profile” (climb speed of the profile), “Set” (chosen climb). The choice is kept in this browser.
- An instruction in three parts: “Set” (throttle, propeller, RPM or N1), “Hold” (the instrument that carries the instruction, usually the IAS), “Expect” (climb rate to see, level reached, time and fuel).
- A table by altitude band (ground, 2,000 ft, FL050, FL100… up to the plan level): throttle, RPM or N1 if the profile has an engine map, IAS to fly, expected climb rate, cumulative time.

The instructions guide the flying; the fuel plan counts the chosen climb. They come from the performance model of the profile (atmosphere of the fuel plan, mass not modelled): to be checked against the flight manual.

### Result

This block, in the right-hand column, follows the page while you scroll through the curves.

- “Block fuel” (as a range if the wind is unknown), “Flight time”, “TOD”.
- Status line “Calculated for <aircraft> at <time>: <distance> NM at FL…, flight time, TOD. Cruise fuel flow: …”, then basis of the calculation: level, climb used and origin of the cruise fuel flow (“saved profile”, “entered for this flight”, “Poll-Schumann, 70 t at mid-cruise, FL350, M0.78”, “SimBrief”, “estimate…”). With no known fuel flow, “Block fuel” shows “—”: enter the fuel flow in the fuel plan.
- Detail: taxi, climb, cruise, descent, contingency, reserve; planned take-off mass and MTOW if you entered it (in red if it is exceeded).
- Cursor card (⌖ on hover, 📌 pinned): fuel and time for the trip at that level, max climb rate, climb speeds; “unpin” removes the pin.
- Collapsible group “Flight regimes — profile ↔ map” (Expert level): IAS, climb rate, engine setting and flow per phase, compared with the engine map. It also contains the “SimBrief Airframe Internal ID” field and the links to the sheets of the aircraft of this type.

“Pin” keeps the whole block when it follows the page; otherwise, it collapses. “Simple view” hides the curves and instruments, “Detailed view” shows them (choice kept in this browser). At the Expert level, under the block, one panel per curve gives the optimums, the limits (ceiling, requested level) and reading help. The instrument strip (Expert level) shows IAS, altimeter, climb rate, stopwatch (climb time), fuel and flight time.

### Performance profiles

This block (from the Design level) reviews the profiles: one line per saved profile and per fleet type without a profile.
- Columns: “Aircraft”, “Profile (source)” (`.lnmperf`, SimBrief, JSON, entry or estimate; “active” for the chosen aircraft, “Create” for a type without a profile), “Engine map”, “Cruise fuel flow” and its origin, “Ceiling”, “Missing data”.
- “Import…” (`.lnmperf`, JSON, CSV), “Folder…” (performance folder), “Reread”. The folder is read again by itself when it changes elsewhere (Settings, another tab).
- An action column, before the name, holds each line’s button, always in the same place: “Choose” (“Create” for a fleet type without a profile, with “Create from SimBrief” next to it when SimBrief knows the type). In the sheet of the active profile, “Update from SimBrief” takes the type’s SimBrief record (cruise fuel flow, weights, ceiling, speed) and keeps your entries; against a personal profile, it offers “Fill the empty fields”, “Merge” (the record counts as a profile dated from its retrieval: the most recent wins field by field, empty fields are filled), “Replace” (SimBrief values instead, the rest kept) or “New profile”. When fields change, a preview shows them before you confirm. “Delete this aircraft”, in the same sheet, removes the active profile.
- The boxes before the names select profiles for the block’s bar: “Merge (n)” (at least two profiles of the same type, or a single one when SimBrief knows the type: the box “Include the type’s SimBrief record”, ticked beforehand, adds it to the sources; name chosen, the most complete one’s by default; the most recent wins field by field, the others fill its gaps, the engine map gathers their rows; the window first shows the changes — current value, kept value and its source, unchanged fields folded, engine map rows added or replaced; the notification says what was taken from each source, “Undo” 10 s), “Export (n)” (one downloaded file per profile: `.lnmperf` if the profile is complete, JSON otherwise), “Save to the folder (n)” (one JSON file per profile in the performance folder, named after the profile) and “Delete (n)” (one confirmation, a single message for the batch with “Undo” for 10 s; a file in the performance folder is not erased but is no longer read: import it again to bring it back).
- “Ask ChatGPT” (block’s bar, and sheet of the active profile) opens a panel: choose the aircraft (profile, or fleet type without a profile), then “Copy the prompt and open ChatGPT”. The prompt, in the page’s language, asks to compile every source (manuals, manufacturer, authorities, Wikipedia, simulation forums), in kt, ft, ft/min and kg/h, estimated values marked, engine map included; it also gives what the suite already knows (EUROCONTROL, SimBrief, Airframe DB, current profile) so that ChatGPT completes rather than repeats. “Show the prompt” displays it. Paste the answer (the JSON, or a performance CSV) under the button, then “Import as a new profile” (“<name> — ChatGPT”) or “Merge with “…”” (the answer is dated today: it wins field by field, empty fields are filled; preview of the changes first). Unknown keys and unreadable or out-of-range values are discarded and reported; estimated values appear under “Missing data” (“estimated: …”) and stop being estimated as soon as you change them by hand (sheet or engine map).

### Engine performance — RPM / power / consumption

This block (original title “Engine performance sheet”) gives the consumption for an engine setting. Expert level block.

1. Enter “RPM / N1”. The “Altitude (ft)” and “Phase” fields complete the sheet.
2. Click “Interpolate”.
3. Read the “Total fuel flow” and its min.–max. range (interpolation in the table, by altitude when the “Altitude (ft)” column is filled in).

Under the sheet, the “RPM / power → consumption curve” draws the min., nominal and max. flows by engine setting. Hover over it to read the values at a given setting. The interpolated point is marked on it.
Without an RPM table in the profile, the page shows “RPM curve missing from the profile.” or “No quantified map”.

### RPM / power → consumption table

This table lists the points of the engine map of the active profile: “RPM / N1”, “Min.”, “Nominal”, “Max.”, “Altitude (ft)” (optional: one line per published altitude), “Flight phase”, “Comment”. Expert level block.
Click a column title (↕) to sort.
It is read-only: to change it, use the “Engine map — edit RPM / power → consumption” block.
Without data, it shows “No RPM curve in this profile.”

### Profile data — JSON ⇄ Little Navmap

This block shows all the fields of the profile, exported as they are in the Little Navmap `.lnmperf` file. Expert level block.

- Groups: “Identity and format”, “Fuel and operation”, “Runway and alternate”, “Climb”, “Cruise”, “Descent”, “Power setting and consumption”.
- Fuel is shown in the chosen unit (kg or lbs).
- When the type has a EUROCONTROL APD sheet, an “APD …” label appears next to the comparable fields: a click takes that value. Nothing is written without a click. Otherwise: “No EUROCONTROL APD data for this type”.

An empty box stays empty and blocks the `.lnmperf` export: no value is made up.
After a change, click “Save profile” in the bottom bar.

### Engine map — edit RPM / power → consumption

This block is used to enter or correct the setting → consumption table, point by point. Expert level block.

1. “Add a point” creates a line.
2. Fill in “RPM / N1”, “Min.”, “Nominal”, “Max.”, “Altitude (ft)” (optional: one line per published altitude), “Flight phase” and “Comment”.
3. Save the profile (bottom bar).

Tip: a range written in the comment, for example “1,000–1,300 kg/h total”, fills in min., nominal and max. when saving.
With no aircraft chosen, the block shows “Choose or import a profile.”

### SimBrief calibration from OFP

This block adjusts the active profile to a real SimBrief flight plan. Expert level block.

1. Click “Fetch latest SimBrief FPL” (header). The identifier is entered in ☰ › Pilot profile. Failing that, download the JSON OFP on simbrief.com and use “Import OFP JSON”.
2. The OFP fills in the fuel plan and the flight plan; the aircraft profile is created and calibrated. The message shows a full or partial calibration (measurable phases).
3. “Calibrate the active profile” applies the calibration of the last OFP to the chosen profile.
4. “Export audit JSON” downloads the audit.

“Calibration traceability” (in this block) recalls the last calibration applied; otherwise “No OFP calibration”.

### Vertical profile

This block draws a section along the flight plan of the fuel plan: terrain, airspaces, obstacles, trajectory (TOC, TOD). Expert level block.

1. Check the flight plan in “Fuel plan”.
2. Choose the “Display profile (studio)”: these are the same profiles as in the Flight maps.
3. Set “Floor (ft)” and “Ceiling (ft, 0 = auto)”.
4. Click “Draw the profile”.

The climb follows the performance model of the active aircraft; the descent follows its climb rate. A plan without a level (VFR) has no trajectory.
An imported SimBrief OFP fills in the route and draws the profile on its own.
You need the SIA database of this browser, read in the Flight maps (“SIA database” block) or in Settings › Maintenance. Without it, only points given as coordinates are recognised, without airspaces.

### OFP audit — raw and calculated values

This table compares, phase by phase, the values read in the OFP and the recalculated values: “Time”, “Distance”, “Fuel”, “Computed FF”, “TAS / GS”, “V/S”. Expert level block.
It fills in after an OFP import (“Fetch latest SimBrief FPL” or “Import OFP JSON”).
Without an OFP: “No OFP data.”
Useful to understand a partial calibration or a gap with SimBrief.

### Imported JSON / SimBrief

This block shows the raw content of the last imported file (SimBrief OFP or JSON). Expert level block.
- “Copy JSON”: copies the content to the clipboard; greyed out when there is nothing to copy.
- “Clear”: empties the display (the profile is not touched).

Without an import: “No JSON loaded.”

## Landings
<!-- page: apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html -->

This dashboard (title “Landing Performance — Summary”) analyses the quality of your landings from the files exported by the simulator: score, sink rate, G, per aircraft and over time.
To go there: “Tools” in the side bar, “Landings” tab. The file is read in the browser; nothing is sent.
The last file loaded is kept and reloaded when the page opens. Its aircraft are also offered in the “Aircraft” menu of the fuel planner. Details: [landings dashboard](../LANDING_DASHBOARD.md).

### Loading the file

1. Click “Choose file” (“Data file”) or ☰ › “Choose CSV / LOG files”. You can also drop the files on the page.
2. Choose one or more CSV or LOG files (or drop them together): they are merged into a single data set named “first.csv + n”; columns are matched by name, and a landing found in two files is counted only once.
3. The page shows the format recognised: “Rich format detected” (score, FPM, G, groundspeed…) or “Reduced historical format detected” (estimated progress without score or final G).

Before any file, the page shows “Choose or drop a CSV or LOG file.”
The status line recalls the file, the number of measurements used, the aircraft, the active filters and the period.

### Header: aircraft, period, trend

- “Aircraft”: “All”, or a type (with its icon).
- “Period”: “All dates”, “Today”, “Last 7 days”, “Last 30 days”, “Current month”, “Current year”, “Custom period”, with buttons to go back, widen or go forward. The period is remembered for each file.
- “Trend method”: “Absolute / Asymptote”, “First 25% ↔ Last 25%” or “Moving average” (with “Smoothing”: 5 or 10).
- “Print / PDF”: prints the page.

Analysis options (☰ menu): “exclude clearly implausible measurements”, “95P — exclude the strongest accidental 5%”, “Crash — exclude triggered landings” (thresholds FPM ≤ and G ≥, logic “FPM or G”, “FPM and G”, “FPM only”, “G only”), “Use estimated missing fields”.

### Period summary

At the top of the dashboard, cards give the key figures: “Landings”, “Average score”, “Score min / max”, “Average FPM”, “FPM min / max”, “Average G”, “G min / max”, “Butter / Very Good”.
The “−” and “+” buttons change the size of these cards.
Below, the trend conclusion: probable improvement or regression, slight, “No clear progress”, or “insufficient data” (at least four usable measurements are needed).
The text explains the chosen method (for example estimated asymptote and remaining gain).

### Evolution

This block draws the indicators over time, with their trend: score, touchdown rate (FPM), G force, nose rotation rate, and the “FPM × G — touchdown distribution” scatter plot. In reduced format: relative technical index, raw landing rate, float.

- Hover over a point: date, aircraft, score, rating, flare.
- Drag horizontally on a chart to select a period.
- The “Full history — drag to select” strip, under each chart, lets you choose a period over the whole history.

The chosen period is shown in the header; its buttons let you go back.
The relative technical index is not an official score.

### Summary by aircraft

This table gives one line per aircraft: “Aircraft”, “Type”, “N” (number of landings), “P95 score”, “σ score”, “Min”, “Max”, “P95 FPM”, “σ FPM”, “P95 G”, “σ G”, “Score slope”, “ρ”, “Conclusion”.
Click a column title to sort (▲ / ↕).
The “Conclusion” column gives the trend of each aircraft.
Choose an aircraft in the header to analyse only that one.

### Data quality

This block shows what the filters kept or set aside:

| Line | Meaning |
|---|---|
| “Total measurements” | Lines read in the file. |
| “Considered plausible” | Measurements kept by the plausibility filter. |
| “Partial / estimated” | Measurements completed by estimation. |
| “Flagged as implausible” | Physically impossible measurements. |
| “Excluded as crash” | Landings set aside by the crash filter (if it is active). |

The rules applied are recalled below (for example groundspeed < 25 or > 250 kt, |FPM| > 5000, G < 0.10 or > 12).

### Landings

This table details each landing kept: “Date”, “Aircraft”, “Score”, “Rating”, “FPM”, “G”, “Groundspeed kt”, “Float s”, “Nose °/s”, “Flare”, “Pitch”, “Bank”, “estimated log” values, “Source”, “Estimated fields”, “Data quality”.
Click a column title to sort. By default, the table is sorted by date.
The table scrolls inside its frame when the list is long.
It follows the aircraft, the period and the filters chosen.
