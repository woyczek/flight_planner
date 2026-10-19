# V2-fable — the suite says what to do, and keeps quiet when it does not concern you

*Branch `v2-fable`, based on `feature/v2-niveaux` · proposal of 8 October 2026 · [Technical index](README.md)*

V2 ([V2_NIVEAUX.md](V2_NIVEAUX.md)) arranges the interface by usage level: everyone sees only the pages of their own
use. What is still missing is the **path**: a pilot opening the suite still has to guess where to go (the home page
lists pages, "Mission report" starts with sixteen families, "My missions" answers "No trigram set" and points to the
settings), and the suite talks to them about things that are none of their concern (maintenance reminders on every
page, synchronisation counter, technical notices). This proposal removes nothing and invents no new framework: it
relies on the existing foundations (blocks and notifications of `app_framework.js`, levels of `repository_nav.js`,
assignments of `assignments.js`, report ledger of `mission_core/ledger.js`) and adds **one page and one module**.

## 1. Findings (recorded on 8 October, levels 1 and 4, Standard and Aqua designs)

| Page | What gets in the way | Ergonomics rule involved |
|---|---|---|
| Home | a list of pages, the same for everyone; nothing says *what there is to do* | visual hierarchy, quick actions |
| My missions | without a trigram: a text pointing to Settings › My profile; the page stays empty | nothing to retype, no dead end |
| Mission report | sixteen families and a search field first, even when an assigned mission is waiting for its report | one page = one task |
| Schedule, Studio, Flight maps | "SIA database missing…" as a notification at **every** opening, even at level 1 where nothing can be done about it | keep quiet when it is not relevant |
| Long tasks (maps, zones) | a progress bar, but nothing to stop it | visible status **and** a way to stop |
| Long fields (route, remarks) | fixed height, inner scrollbar from the third line | fields that grow |

## 2. Proposal

### 2.1 An arrival page: "Today"

`apps/pilot/aujourdhui.html`, first entry of the sidebar at every level. Three blocks, **one action each**:

1. **My next mission** — time (UTC), mission, aircraft, aerodrome, callsign; "Open the folder".
2. **Reports to write** — past missions (21 days) assigned to the pilot, without a report in the ledger; "Write the
   report" opens the folder and starts the report in the right family (`?mission=…&do=cr`); "No report" sets a
   mission aside (remembered in this browser). Seven lines at most.
3. **My week** — seven columns, my missions as thumbnails, the current day marked; click: the folder.

Without a trigram, the first block **asks for the trigram on the spot** (one field, one button) instead of pointing to
the settings. The home page `index.html` (generated from the sidebar) offers it at the top of "My tasks".

### 2.2 A guided report

`apps/cr/mission_cr.html` starts with **"My missions to report"** (same list as above); the family choice, unchanged,
moves to a second block for missions outside any assignment. The button leads to the report pre-filled from the mission
order (existing mechanism of "My missions": `siaMissionToCr:v1`, `metadata.orderRef`).

### 2.3 The foundation: keep quiet, stop, grow

- `AppFramework.notify(message, kind, { once, minLevel })`: `once` — once per browser session for this text
  (maintenance reminders); `minLevel` — below this usage level, the message goes to the log, not to the screen. Applied
  to the "SIA database missing" reminders (Studio, Flight maps, Fuel).
- `AppFramework.task(title, { total, cancel })`: with `cancel`, the bar carries a **Stop** button; `job.cancelled`
  turns true, the function is called (`AbortController`, loop flag), the bar says "Stopping…" then "Cancelled.".
- Fields that grow: `textarea` follows its content (`field-sizing: content`, capped at 60 % of the screen),
  `data-fixed-size` to keep a fixed height.

### 2.4 My missions

Without a trigram: the entry field inside the list itself (shared module), the list fills in as soon as it is validated.
`?do=cr`: the folder opens and the report starts without any further click.

## 3. What does not change

The pages, their blocks, the levels, the designs, the data. No text translated after the fact: new texts are produced
in the page's language (`K.t`, `K.tf`), in four languages.

## 4. Files

| File | Role |
|---|---|
| `shared/pilot_today.js` | next mission, reports to write, week, trigram entry (`PilotToday.mount`) |
| `apps/pilot/aujourdhui.html` | the arrival page |
| `apps/cr/mission_cr.html` | "My missions to report" block |
| `apps/pilot/mes_missions.html` | trigram on the spot, `?do=cr` |
| `shared/app_framework.js` | `notify`: `once`, `minLevel`; `task`: `cancel` |
| `shared/repository_nav.css` | fields that grow |
| `shared/icons/repository_icons.js` | `today` icon |
| `config/repository_tree` | "Today" entry, page, labels |

## 5. Done afterwards (8 October, evening)

- **Synchronisation badge**: the header's "Synchronise" button carries a badge at levels 1–2 (the number stays in the
  tooltip, the "(n)" counter at levels 3–4) — done, see CHANGELOG "v2-fable, lot 2".
- **Error messages reread**: `AppFramework.explain` says what failed and what to do, in four languages, applied to the
  pages concerned — done, see CHANGELOG "v2-fable, lot 2".
- **"Stop" button** wired to the long tasks (Studio and Flight maps maps, MORA, MILAIP import, reading the missions
  folder; the partial state is announced) — done, see CHANGELOG "v2-fable, lot 2".

## 6. Performance

Measurements of 8 October in the user's Chrome (visible tab, Aqua design): details and figures in the
[report](perf/RAPPORT_2026-10-08.md).

**What the measurements showed.** Ordinary pages are healthy (scripts loaded in 150 to 370 ms, no long task,
after-the-fact translation 6 to 28 ms, observers < 1 ms). Two pages stand out: the **Schedule** (206 requests of which
48 in 404, 1,902 `JSON.parse`) and the **Flight maps** (15,073 DOM elements of which 13,552 `<option>`, page frozen
≈ 1.5 s at load by three long tasks of 600, 655 and 264 ms). In a background tab Chrome suspends rendering: timings are
only valid with the tab visible.

| Lot | Fix | Measured effect |
|---|---|---|
| (1) Schedule | requested weeks filtered through the availability index; settings read through a memoised parse (`jsonCached`) | 206 → 19 requests (404: 48 → 4); 1,902 → 157 `JSON.parse` |
| (2) Flight maps, Studio | completion lists (zones, aerodromes, beacons) built at the field's focus | 15,073 → 1,555 elements; long tasks 600 + 655 + 264 → 268 + 294 ms |
| (3) SIA database | cities (≈ 70,000) stored under their own key (`SiaBase.cities()`), read at idle time; AAR tracks at idle time | `SiaBase.get()` 212 → 116 ms, `applyBase` 140 → 84–94 ms; long tasks at load 200 + 211 ms |

**Leftovers.** `shared/browser_store.js` `snapshot()` parses every `localStorage` key on every page (41 `JSON.parse`,
409 KB): reported to the BUGS SOG session (foundation), not touched. Not done: `renderZonePick` (≈ 100 ms,
`selectedAirspaces` over 7,000 airspaces at every render), airspace geometry as compact arrays, Schedule DOM
(7,700 elements).

## 7. Fuel: climb instructions, performance base (10 October)

**What the user wants to know** (their words: "how to set my throttle, my propeller pitch and/or the rpm, and whether
I should watch the airspeed, the altimeter or the vario during the climb", "the sweet spot between economic and fast
flying"). At every altitude, three quantities are linked: indicated airspeed, vario, setting (throttle, RPM or N1). Two
fix the third — which the model already does (`FlightPerfModel.manualLaw` / `manualPoint`, setting recovered from the
engine map by `rpmForFF`). The page showed it badly: two hand-made vertical sliders around the curves, the "full
throttle" law shifting the calculation's basis line, altimeter and stopwatch removed, no overview of the loaded
performance profiles.

**Simple view (levels 1 to 3).** A "Climb instructions" block in the left column, under the fuel plan: a goal chosen by
segments (Eco · Vy · Fast · Profile · Set) and, for the chosen goal, a table per altitude band (ground, 2,000, 5,000,
10,000 ft… up to the plan level): throttle ("full" or %), RPM or N1 when the engine map allows it, airspeed to hold,
expected vario, cumulative time; above it, an instruction sentence produced at the source ("Full throttle, propeller
fully fine, hold 120 kt indicated; the vario decreases from 900 to 500 ft/min") that says what to set and what to watch
(the instrument carrying the instruction is named, the other is "expected"). The band's instruments (airspeed, vario)
stay.

**Detailed view (level 4, or "Detailed view").** Three sliders — airspeed, vario, setting — each with a "fixed" box:
two at most are fixed, the third is computed and greyed out (framework component: `.field` with `input[type=range]`,
label above, value and state under the slider — "full throttle" shows under the vario slider, no longer in the
calculation's basis line, which no longer moves). The existing curves, with an "by altitude ↔ by setting" toggle of the
climb chart; altimeter and stopwatch come back to the band at level 4 (they repeat the hovered level and the climb
time: playful and telling, in the user's words).

**Performance base.** A "Performance profiles" block (level 3 and above): one line per fleet and mission type — loaded
profile (source: `.lnmperf`, SimBrief, JSON, entry, class estimate), engine map (yes, n rows / no), cruise consumption,
ceiling, missing data named; actions: Import (`.lnmperf`, JSON, CSV, pasted text of a PDF sheet), Folder, Re-read. The
folder's profiles are re-read when the folder changes elsewhere (`file-access-change`, key `__perf`). The engine map
gains an optional "Altitude" column (published consumptions vary with altitude; the model interpolates between the rows
of a same altitude).

**Details.** The aircraft choice at the top of the page becomes a list (icon, name, type, profile source, state)
instead of a row of buttons; "Copy JSON" has an `execCommand("copy")` fallback outside a secure context and is greyed
out when there is nothing to copy.

## 8. Mission generator without ChatGPT (12 October)

**What the user saw.** "Add a text section" without knowing which one or what it is for; no duplication of a registry
mission; indexed missions whose files no longer exist; and above all no way to produce a mission without ChatGPT,
although the order form (type, theatre, teams, aircraft, rendezvous, refuelling, duration) already describes everything
a skeleton needs.

**Text sections.** The free "Add a text section" button (title "New section") becomes a choice among the sections the
brief, the PDF and the report already know how to place: Introduction, Primary objective, Secondary objectives, Teams
involved, Turning points, Rendezvous, Air-to-air refuelling, Risks to consider, Load / personnel, Coordination,
Timeline, Planned maps, Notes — each with a line saying where it appears and what to write in it; "Other section…"
stays, free title, and goes into the brief only. A section already present is no longer offered. The block's subtitle
says so in one sentence.

**Duplicate a mission.** In the registry, next to "Open in the generator": "Duplicate" — copy of the YAML with the next
free identifier of the same family (nextNumbering), title suffixed "(copy)", maps and renderings not copied (they are
regenerated in the studio), `meta.duplicated_from` set, direct opening in the generator on the copy, ready to edit.
Same button in the generator's "Mission" block for the loaded mission.

**Skeleton without ChatGPT.** The order form gains a second button next to "Copy the prompt and open ChatGPT":
"Create the skeleton here". The same settings produce a complete mission without narrative: next identifier and
series, family, subtype, theatre, teams (one mission per flying team, aircraft and callsign taken from the fleet as for
ChatGPT), departure and arrival aerodrome (the aircraft's base, or the theatre's), target and turning points to place
(empty coordinates, role filled), one rendezvous per team when "with" (and its `detail_rdv` map), working zone,
planned refuelling with its track when "yes", coordinated exercise: organisation mission Z with H hour, participants
and an empty timeline of events (H+0, H+15, H+30… according to the duration); estimated timing from the chosen
duration; list of expected maps (general, target, target detail, detail of each rendezvous, zone) with their
descriptions; text sections created empty (Introduction, Primary objective, Risks, Timeline). The skeleton opens in the
generator with a status line "Skeleton: n points to place, m texts to write — then the studio for the maps" and the
"Open in the studio" button highlighted; every field to complete is marked ("to complete" class) until it is filled.
The form's fields are exactly those of the prompt: a single source of settings for both paths.

**Registry artefacts.** The registry checks the present folders on opening (`/__setup/mission-folders`) and removes or
flags missions without a folder, with "Clean the index (n)"; no need to go through Caches any more (BUGS SOG).

## 9. Online help and repository language (12 October) — written in English, the repository's target language

**What the user said.** The online help is a jumble: a lot of legacy documentation, not up to date. Redo it, make
the tutorials visible. The repository's target language is English; some READMEs and tutorials are translated into
French in git, but the essential lives in the online help. The changelog, in English.

**Decisions.**

1. **One source per subject.** The user manual and the administrator manual are the reference, chapter per page,
   in four languages (fr, en, de, es), as today. The per-subject guides that duplicate them (`DONNEES.md`,
   `ODV_PLANNING.md`, `SIA_MISSIONS.md`, `FLIGHT_PLANNER.md`, `LANDING_DASHBOARD.md`, `PRESENTATION*.md`, the old
   `TUTORIAL.md`) are merged into the manual chapter they belong to, then deleted. Nothing is kept "for history": an
   outdated text is a wrong text.
2. **Tutorials first.** `docs/tutorial/` holds step-by-step walkthroughs with screenshots, named by language
   (`<name>.en.md`, `<name>.fr.md`): installation (exists), first mission report (replaces `TUTORIAL.md`), prepare a
   mission end to end (generator → studio → documents, moved out of the administrator manual), build a fuel profile
   (Carburant). The help page shows them at the top, before the manuals.
3. **The help page** (`apps/aide`) gets a fixed structure: Tutorials · User manual · Administrator manual ·
   Operations manual (install, data, backups, updates, release) · For developers (`docs/technique`, collapsed, not
   searched by default). The index is produced from that structure, not from a hand-written `docs/README.md` table.
   Search covers tutorials and manuals in the current language.
4. **Languages.** Repository documents (`README.md`, `docs/README.md`, `docs/technique/*`, `docs/CHANGELOG.md`,
   `VERSION.md`, `INSTALL.md`) are written in English; tutorials are written in English and translated into French;
   manuals stay French-first in four languages because they are the online help. Every published repository document
   (all of `docs/technique/*`, history included, the bug log too) is translated into English or made bilingual — the
   user's precision of 12 October; new sections and new documents are English. Split: BUGS SOG — `BUGS.md` (done),
   `perf/SYNTHESE.md`, `perf/RAPPORT_PERF.md`, `SYNCHRONISATION.md`, `INDEX_DONNEES.md`, `DETTE_TECHNIQUE.md`;
   Features SOG — functional design documents (`AFFECTATION_MISSIONS.md`, `COMPTES_SIGNES.md`,
   `DISPOS_ET_REORGANISATION.md`, `ODV_ORDRES.md`, `PROMPT_*.md` and `PROMPTS_*.md` framing text, `V2_NIVEAUX.md`,
   `FRAMEWORK.md`, `REFACTORING_TOOLKIT.md`, `SIA_XML_INTEGRATION.md`, `DONNEES_AERO_ETRANGER.md`,
   `ASSETS_A_FOURNIR.md`, `PROPOSITION_DESIGN_ICONES.md`, `ROADMAP.md`, `mission_report_core_audit.md`, `README.md`);
   this session — `V2_FABLE.md`, `CONTRASTE_2026-10-09.md`, `perf/RAPPORT_2026-10-08.md`, the audits
   (`AUDIT_2026-09-28.md`, `AUDIT_SECURITE_*.md`).
5. **Changelog.** Entries are in English from now on, under the section `Unreleased`; the history before 5.1.0 stays
   as written. Release notes (`VERSION.md`) in English.

**Who.** Features SOG: tutorials, merges into the manuals, help page structure, index generation, search. BUGS SOG:
`CHANGELOG` section renaming and the `Unreleased` convention in tools (`publish_dist`, release checks). This session:
ergonomics review of the help page and the tutorials in the browser.

## 10. Every mission by hand: one path per use case (12 October)

The user's requirement: "since everything must be creatable by hand, every case needs a path". Six use cases, in the
data model's words: a *mission* is one aircraft and its crew (letter A, B… when there are several); an *operation* is
the set of missions sharing an identifier base; the *organisation* (letter Z) is the mission that carries the exercise:
H hour, participants, played tracks, timeline. Three things are missing today: a structured timeline on a single
mission, and two transitions (add a crew to a standalone mission; create the organisation of an existing operation)
that exist in the code but are not offered where the user is.

| Use case | Path | State of the "Operation" line of the Mission block |
|---|---|---|
| UC1 — standalone mission, one aircraft | "New mission", or "Create the skeleton here" with 1 team and exercise = no, or ChatGPT | "Standalone mission (no operation)" · action **Add a crew** |
| UC2 — standalone mission, several aircraft (several missions, one brief each) | skeleton with n teams, exercise = no; or UC1 then **Add a crew** (n − 1 times) | "Operation X-016: crew A of 2 · no organisation" · actions **Add a crew**, **Create the exercise organisation** |
| UC3 — standalone mission, one aircraft, timed events and waypoints | UC1, then the **Timeline** block of the mission (same editor as the organisation's, H = planned take-off by default): events at H+n with a place (a turning point, rendezvous or zone of the mission, or free text); turning points keep `time_on_task_min` | as UC1 |
| UC4 — standalone mission that becomes coordinated, several aircraft | **Add a crew** on the mission: it becomes crew A (identifier migrated by `migrateIds`: M-016 → M-016A), the new mission B copies the shared context (family, theatre, departure and arrival, target, zones, rendezvous with both callsigns), gets its own brief; repeat for C… | "Operation M-016: crew A of 2 · no organisation" |
| UC5 — coordinated exercise (operation) from scratch | skeleton with n teams and exercise = yes (missions A… and Z), or ChatGPT | "Operation X-016: crew A of 3 · organisation X-016Z · H hour 10:00" · action **Open the organisation** |
| UC6 — coordinated missions that become an operation with an organiser and an organisation brief | **Create the exercise organisation** on the operation line (existing function: Z created with H hour, participants from the missions, tracks, empty timeline, general brief proposed from the missions) | as UC5 |

Rules: the three actions live on the "Operation" line of the Mission block, never elsewhere; each one says what it
will create before doing it (AppFramework.ask with the identifiers); a crew can also be **removed** (its mission
deleted after confirmation; the last remaining crew becomes a standalone mission again, identifier migrated back);
the studio follows the shared lot; the planner manual describes the six paths with the same words, and the "prepare a
mission end to end" tutorial walks UC1 → UC4 → UC6.

## 11. Guided mission entry: "step by step" (12 October)

The user wrote a mission by hand (G-001, SURVEY): rich texts, but the fields did not help him — a theatre left at the
skeleton's default, points never placed although the story names the villages, risks pasted as tab-separated
columns, four objectives in the "primary" field, no callsign. His request: fields that propose and warn, and, if
needed, a guided process.

**Decision.** The generator gets a **step-by-step mode** for a new mission (and for a skeleton), reusing the existing
blocks: a rail of six steps like the First run page, one step open at a time, "Next" at the bottom of each, the other
steps folded; the expert layout (all blocks) stays one click away ("Show everything"). No new data model.

| Step | What is entered | Proposals (filled before the user types) | Warnings (inline, under the field, never a popup) |
|---|---|---|---|
| 1 Frame | family, subtype, theatre, duration, aircraft and callsign, departure and arrival | theatre from the aircraft's base; callsigns from the fleet for the type; team name = callsign; departure = base; timing from the duration | theatre ≠ country of the departure aerodrome; aircraft unsuited to the family; no callsign |
| 2 Places | target, working zone, turning points, rendezvous | search over aerodromes, beacons, designated points **and cities**; points proposed around the target (entry / exit at 15 NM on the route) | a place without coordinates; a rendezvous without participants; a zone without radius |
| 3 Story | title, summary, detailed description | a canvas built from the frame and the places (family wording, aircraft, departure, target, duration) that the user rewrites | empty title; summary over 600 characters |
| 4 Objectives and risks | one primary objective, secondary objectives, risks | risks entered one per row with four fields (hazard, level, consequence, mitigation) in a small table, a level selector; pasted text split on tabs, dashes or pipes | primary with several numbered items (split proposed); a risk without mitigation |
| 5 Timeline | H hour, events | H = planned take-off; events proposed from the route (entry, on target, exit, return) at times computed from the model | an event outside the estimated block time |
| 6 Maps and documents | expected maps, save | maps proposed from the places (general, target, target detail, each rendezvous, zone) | a map centred on an unplaced point |

Every proposal is a value put in the field, marked "proposed" until the user confirms or changes it; every warning is
a line under the field with a one-click fix when one exists ("Set theatre to mainland", "Split into secondary
objectives", "Place in the studio"). The step-by-step mode is the default for a new mission at levels 1 to 3, a
choice at level 4. Same vocabulary in the planner manual and in the "prepare a mission end to end" tutorial.

## 12. Fuel: the level decision chart (13 October)

The user: "in the fuel tool's chart I struggle to decide the optimal flight level; I need a chart that shows the
essentials — optimal level against speed and fuel — and lets me plan the airspeed and vario that follow." The page has
the curves (trip fuel by level, climb rate and fuel per 1,000 ft, climb speeds) but no single view that answers
"which level, and what does it cost in time and fuel, and how do I climb to it".

**Decision.** One chart, "Flight level decision", first in the detailed view and the only chart of the simple view:

- X axis: flight level, from the lowest usable to the ceiling, standard levels ticked; two curves on two scales —
  **trip fuel** (kg or lb, left) and **trip time** (minutes, right) for the whole flight flown at that level, climb
  and descent included; the plan level, the **best-fuel level** and the **best-time level** are marked and named; a
  shaded "unreachable" band beyond the ceiling as today.
- Hover or a slider under the chart moves a cursor: a card beside the chart shows for that level fuel, time, cruise
  TAS, climb time and fuel, **climb IAS to hold** and **expected vario** (from the chosen climb goal: Eco, Vy, Fast,
  Profile, Set), top of climb distance; the "Climb instructions" block follows the cursor.
- "Use this level" sets the plan level, updates the fuel plan and the climb instructions; a second button
  "Compare" pins the current level so that two levels are read side by side (fuel and time deltas).
- Under the chart, the same figures as a table for the standard levels only (one row per level), sortable by fuel or
  time, the chosen row highlighted.

The three existing curves stay in the detailed view, below. Nothing new is computed: the model already gives trip fuel
and time per level (`m.trip`), climb points (`climbTo`, `manualPoint`) and the climb law of the chosen goal.

**Done (13 October)** — `shared/flight_perf_view.js` (`renderDecision`), block `#levelDecision` of the fuel page; see
CHANGELOG "Flight level decision". The table lists round levels (every 1,000 ft, 2,000 ft above a 20,000 ft ceiling);
the curves use the climb goal of the climb instructions, so changing the goal redraws them.
Simplified the same day after the user found the charts unclear (review by the ergonomics session): two stacked
panels instead of two scales, "Least fuel" / "Fastest" pills, one mark (the chosen level), one grey for levels that
cannot be held, a three-line card; detailed view reduced to one "Climb" chart sharing the axis and the cursor, a table
of goals and the engine settings (engine map only); "Optimum altitude", "TAS by level" and the Result's cursor card
removed.

## 13. Three roles: My aircraft / Performance sheets / Fuel (15 October)

**What the user said.** "Three places to choose the aircraft, it is not clear; it is not this page's job to do that
work." The fuel page had become a manager of performance sheets that also made fuel plans.

**Decision** (validated by the user, ergonomics review):

1. **My aircraft** (Settings › My profile › Aircraft and simulators): declare what I own and master, variants included.
   The "Performance" column is only a link — to the sheet on the Performance sheets page, or "none → create", which
   opens that page on the aircraft (`?aircraft=<code>`, `&create=…`). No creation flow in Settings.
2. **Performance sheets** (`apps/planner/performance_sheets.html`, Tools, level 3): the management. One list, my
   aircraft first, then the other sheets; every action that creates or changes a sheet starts here (add an aircraft,
   import, folder, reread, SimBrief / ChatGPT / class estimate, merge, export, save to the folder, delete, field
   editor, "Update from SimBrief", engine map, RPM table and curve, ChatGPT panel, OFP calibration). The page's
   "active" sheet is the sheet being edited ("Edit" instead of "Choose").
3. **Fuel**: the fuel plan only. One aircraft choice, in the header, listing existing sheets only (my aircraft first);
   without a sheet: "no sheet for this aircraft — open Performance sheets ↗". The sheet consulted stays visible read
   only. `?aircraft=` still picks the sheet; `?create=` is redirected to the sheets page.

**Technique.** Both pages share one script and one style sheet (`apps/planner/flight_planner.js` / `.css`, moved out
of the fuel page) and the same local database (`flightPerfState`, performance folder); the page's role is
`<body data-perf-page>`; `$` returns a detached empty element for an id the page does not have. Each page writes only
the fields it owns (quote settings from the fuel page, `lastAircraft` / `lastSheet`); a `storage` event makes the
other page reread the sheets (the open sheet is replaced unless it has unsaved changes; nothing is written back, so no
ping-pong).

**Steps.** (1) Performance sheets page working with the management blocks; Fuel keeps its own meanwhile (no
regression) — done. (2) Fuel reduced to the plan, My aircraft as links — done: the fuel page keeps the plan, the
result (with the sheet read only, "Edit this sheet in Performance sheets ↗"), the level decision, the climb charts and
the vertical profile; its "Aircraft" menu lists existing sheets, My aircraft first, then "Manage performance sheets ↗";
without a sheet, a line links to the sheets page; the ☰ menu and the status bar keep their sheet actions on the sheets
page only. The shared script stays one file (`flight_planner.js`), no split into modules.
(3) Ergonomics review of the sheets page (Simplification, 16 October), applied in three commits — done:
**A** an aircraft without a sheet shows only "none" in the table; choosing it (its row, or "— no sheet" in the
selector) creates nothing and the bottom bar offers "Create the sheet" (SimBrief, ChatGPT, class estimate) once;
notifications sit above the bottom bar; search and sorting before ChatGPT; one word for the object, "sheet".
**B** nine blocks below the table become four cards: "Sheet being edited" (flight regimes and fields, from level 3,
with "Save the sheet" / "Discard changes" visible from level 3 too), "Engine" (engine map, RPM table and curve,
interpolation), "SimBrief" (airframe, OFP calibration, traceability, audit), "File" (imported JSON, folded); duplicate
export buttons removed (kept hidden for the ☰ menu). **C** a bottom bar of five commands (add, import, "Selection (n)
▾" for the ticked rows, save, discard); the folder gets its own line under the table's introduction; "Fetch latest
SimBrief FPL" moved to the OFP calibration. A tutorial, "Create a performance sheet" (`docs/tutorial/fuel_profile.*`),
follows the whole path.

Not applied, by the user's choice: the "Aircraft" selector stays at the top of the page (the review wanted the table
as the only way to choose), and the header's kg / lbs units stay where they are.

## 14. External links: “Open in ▾” (19 October)

`shared/external_links.js` (`ExternalLinks.menu(host, flight)`), used by Fuel (row of the flight plan, not the page
header) and Flight maps (page header, through `tools/build_map_planner.py`); reusable by the report. `flight` is an
object, or a function (possibly async) read when the menu opens: `{ dep, arr, route, type, reg, callsign, altn, fl }`;
`route` is item 15 or the comma list of a SimBrief OFP route. Entries open in a new tab (`rel="noopener noreferrer"`);
nothing is sent that is not already in the flight (no personal ID, no key); an entry whose data is missing is greyed
out with its reason as a tooltip. Short menu: placed in the window, Escape, click elsewhere.

Formats checked in the browser on 19 October 2026, without signing in:

| Service | Address | Check |
|---|---|---|
| SimBrief | `https://dispatch.simbrief.com/options/custom?orig=&dest=&type=&route=&reg=&airline=&fltnum=&callsign=&altn=&fl=` | `www.simbrief.com/system/dispatch.php?…` redirects there keeping the parameters; names from the SimBrief API documentation (orig, dest and type required); prefills “Custom options” once signed in |
| SkyVector | `https://skyvector.com/?fpl=<ADEP> <points> <ADES>` | Flight Plan panel filled (departure, destination), route drawn |
| Navigraph Charts | `https://charts.navigraph.com/airport/<ICAO>` | address kept, “Sign in” page: **to be confirmed with a signed-in account** |
| ChartFox | `https://chartfox.org/<ICAO>` | redirects to the VATSIM sign-in without keeping the address: **to be confirmed with a signed-in account** |

Route points for SimBrief and SkyVector: speed/level groups (`N0450F350`), level changes after a point (`NTS/…`),
departure and arrival aerodromes and leading/trailing `DCT` removed. SkyVector resolves each name on its own: no
airway, no procedure, and an unknown name goes to a far-away namesake (`TOC` became Toccoa, USA, 3,800 NM away —
the “SkyVector does not take the route” bug of 19 October). So SkyVector only gets names of 2 to 5 letters and ICAO
coordinates (`4341N00122E`, accepted as a “GPS” point); airways, procedures (`FISTO5A`) and `DCT` are dropped. In a
route list from a SimBrief OFP (“ID lat lon” entries), any other ID (`WPT`, SimBrief `4600N` idents) becomes the
entry's ICAO coordinates and `TOC` / `TOD` are dropped; SimBrief keeps airways and procedures of an item 15 route
and, from a route list, only the named IDs (no coordinates, no aerodromes: `orig`, `dest`, `fl` and `altn` go apart;
`fl` falls back to the level of the route's speed/level group).

SkyVector fields (checked 20 October): only an ICAO speed/level group **at the start** of `fpl` fills the Flight Plan
speed and altitude (`fpl=N0236F270 LFRS … LFML` → 236, FL270); the group after the departure, the FAA form
(`<TAIL> <TYPE>/<EQUIP> <TAS> <ADEP> <route> <ADES> <ALT>`) and a tail number or type in front fill nothing (and the
latter breaks the group). No address parameter fills the aircraft or the ETD: `etd`, `tas`, `mach` exist in SkyVector's
code only as arguments of its embedded chart, not of `?fpl=`. The group is sent when the route gives a speed (OFP or
item 15), with the flight level if known, otherwise the group's. A call sign such as
`AFR1234` gives SimBrief `airline` and `fltnum`. In Fuel, the alternate, call sign and registration come from the last
SimBrief OFP only when its origin and destination match the flight plan.

## 15. Reading a SimBrief OFP (19 October)

`shared/simbrief_ofp.js` (`window.SimbriefOfp`), loaded by Fuel and by the map studio (so Flight maps): one reading of
the OFP JSON returned by `xml.fetcher.php`, whatever the format. With `json=1`, `navlog` is `{ fix: [ … ] }` and
`alternate` an object; with `json=v2`, `navlog` is the list of points itself and `alternate` a list (and
`alternate_navlog` comes before `navlog`: a depth-first search for a “navlog” key took it — the “Fuel keeps only the
two airfields” bug of 19 October).

| Function | Returns |
|---|---|
| `fixes(raw)` | every navlog entry (`ident`, `pos_lat`, `pos_long`, `type`, `stage`, `is_sid_star`, `via_airway`…) |
| `routeFixes(raw)` | route points: TOC / TOD and airfields (`type: apt`) left out, positioned entries only |
| `alternate(raw)` | the alternate's ICAO code or `''` |
| `problem(raw)` | why the OFP gives no point-by-point route (no airfield, empty navlog, no positioned point), or `''` |
| `summary(raw)` | “OFP of 19/10 · LFRS → LFML · 11 points · FL270 · alternate LFPG · S210 F-BHHH” (page language) |
| `showJson(raw)` | read-only window with the JSON (`AppFramework.askText`) and a “Copy” button |
| `render(host, raw, { error })` | the summary (or `error`, in red) and a “View the JSON” link in `host` |

Fuel: `#ofpSummary` and `#fplPoints` under the flight plan (`shared/flight_vertical_profile.js`, `showOfp`,
`showPoints`); the route list stays the “ID lat lon” form of `routeFromOfp` (§ 14). Flight maps: the route block's
“SimBrief” button writes the same form (`ofpRouteList`) and the summary in `#routeInfo`.
