# Assigning missions to pilots — design (to be validated)

Status: **released in 4.6.0** (1 October 2026). Batches 1 to 4
done (§ 8), standby: `alert` block in the prompt and display on the pilot side; default decisions below (§ 9). Purpose: the Centre (CPCO) assigns an existing mission to one or
more pilots, at a given time, with a named aircraft each; each pilot sees, outside the Centre, the upcoming
missions assigned to them, flagged by a sealed envelope in the header.

## 1. Vocabulary

| Term | Meaning |
| --- | --- |
| **Assignment** | One mission × one participant: pilot (trigram), aircraft (registration), callsign, departure airfield, requested take-off time. |
| **Participant** | One pilot of a mission. A mission can have several (patrol VAILLANT 31 / 32): one aircraft each. |
| **Slot** | Time range in which a pilot is available and an aircraft is free. Today: the “MMS” periods of the flight order (ODV) (morning, afternoon, evening); to be refined to the hour. |
| **Ferry** | Positioning flight of an aircraft taken from outside the mission's departure airfield; it brings the participant's take-off forward. |
| **Standby** | Mission without a fixed take-off time: “be ready at HH:MM at LFXX and wait for orders; expected take-off within XX minutes”. |
| **Sealed envelope** | Header icon flagging a new (unread) assignment. |

## 2. Flow

**Centre side** (mission registry, mission details → “Assign…”):
1. choose the date and the H-hour (for an exercise: `exercise.h_hour`; the participants' take-offs follow from it,
   `exercise.participants[].takeoff` = “H-20”…);
2. for each participant (as many as the mission has teams, one can be added for a patrol): pilot among those
   **available in the slot** (ODV, refined to the hour), aircraft among those **of the requested type, free in the slot,
   based at the departure airfield**; otherwise aircraft from another airfield with a calculated **ferry time** (distance /
   cruise speed of the type + preparation margin) and take-off brought forward accordingly;
3. checks: pilot or aircraft already taken (another assignment, block time + turnaround), pilot's qualification on the
   type (`defa_reference.pilots[].types`), aircraft not operational (`aircraft_fleet.operational`);
4. save: the assignment is stored with the mission (§ 4); status “proposed”, then “confirmed” by the pilot
   (to be decided, § 9).

**Pilot side** (page outside the Centre, “My missions”):
1. the user is identified by their trigram (local setting, § 3; test: RBR);
2. sealed envelope in the header when a new assignment is waiting for them (counter, click → “My missions”);
3. list of upcoming missions (date, time, mission, aircraft, airfield) then, for a mission, a **read-only view**:
   narrative and objectives, assigned aircraft (registration, callsign), airfield and requested take-off time (or
   standby instruction), route (turning points on the map), graphic material supplied (maps in `cartes/` of the
   mission folder, operation map), team mates (patrol);
4. “Open in Maps” (« Ouvrir dans Cartes ») buttons (map planner, route supplied) and “Fuel” (performance
   planner: route, distance, level, aircraft — same hand-off as the studio, `plannerHandoff:v1`);
   “Create the report” once the mission has been flown.

## 3. User identity

Local setting **“My trigram”** (« Mon trigramme ») (Settings, `defaUser:v1` in this browser, not shared): trigram chosen from
the reference (`data/references/defa_reference.js`, `pilots[].trigram`). Used by “My missions”, the sealed envelope and,
later, to pre-fill the crew of mission reports (CR). No password: the suite stays local; this is not access control.

## 4. Data

An assignment is stored **with its mission**: `data/missions/<lettre>_<FAMILLE>/<ID>/affectations.yaml` (plus an index
`data/missions/affectations.yaml` rebuilt by the registry, for the pilot page and the conflict checks):

```yaml
mission: A-001A
updated_at: 2026-10-01T09:12:00Z
by: CPCO                      # trigramme ou poste qui a affecté
h_hour: 2026-10-04T13:00Z     # exercice : heure H réelle (les décollages des participants en découlent)
participants:
  - pilot: RBR
    callsign: MERCURE31
    aircraft: { registration: F-UHRE, type: RFAL, base: LFBM }
    departure: LFBM
    takeoff: 2026-10-04T12:40Z      # heure demandée (UTC)
    ferry: null                     # ou { from: LFSI, minutes: 45, takeoff: … }
    status: proposée                # proposée · confirmée · déclinée · volée · annulée
    read_at: null                   # lu par le pilote (pli cacheté éteint)
  - pilot: AGT
    callsign: MERCURE32
    aircraft: { registration: F-UHRF, type: RFAL, base: LFBM }
    departure: LFBM
    takeoff: 2026-10-04T12:41Z
alert: null                         # astreinte : § 6
```

**Sharing**: the Centre and the pilots are not on the same computer. The `data/` folder is already a git repository
(`missions-defa`, Framagit): the assignment travels there like the missions (commit on the Centre side, update on the pilot side,
`tools/update_suite.py`). Personal data (trigrams, times): to be validated (§ 9), the repository having to remain private.

## 5. Slots, availability and aircraft

- **Pilots**: availability from the ODV (`OdvCore.extract`: codes per day × morning / afternoon / evening); refinement to
  the **hour** in a days × hours grid (clickable and draggable cells, like the hourly grid attached to the request;
  15 min is too fine: **1 h** by default, 30 min as an option), “available” / “unavailable”; an MMS period
  marked “available” pre-fills its hours, and the pilot (or the Centre) adjusts them. Storage: with the ODV of the week
  (`data/odv/<semaine>/disponibilites.yaml`, personal data: same sharing rule as § 4).
- **Aircraft**: fleet (`aircraft_fleet.js`: type, registration, base, operational), availability from the
  FLOTTE sheet of the ODV (green / orange / red), occupation by the other assignments (take-off → estimated landing
  `timing.estimated_block_min` + turnaround, adjustable, 30 min by default).
- **Ferry**: aircraft taken from outside the departure airfield → great-circle distance base → departure, cruise speed of the
  type (`AircraftDB`), + 20 min of preparation; the ferry take-off is shown and checked (pilot and aircraft
  available from that moment); the ferry can be given to the same pilot or left “to be organised”.
- **Compatible aircraft**: the type written in plain text in the mission (“H225M Caracal”, “Rafale”, “E-3F / A400M”)
  is mapped to the fleet designators (aliases from the ICAO database, common synonyms, variants and models:
  `MissionAssignments.postsOf`); only the aircraft of this type (or of these types, or of the category of a generic
  post) are offered, and only those of the operator when the post's service names one (“Helicopter /
  Gendarmerie” → helicopters of the Gendarmerie nationale).
- **Slot window** (“Registry missions…” button, as soon as a pilot is free in the slot: a mission with
  a single crew is planned like a patrol): nothing is preselected; you tick the mission, choose
  the aircraft (compatible ones only, from the nearest to the farthest from the departure airfield, ferry time in the
  list), then the pilot (those free until the end of the mission and owning the type first). Missions already assigned
  (week shown or past) are not offered; those that the free pilots can crew come first.
- **Slots and likely missions**: a pilot assigned in a slot (mission or ferry) no longer counts there;
  headcount, likely missions and score are recalculated after each assignment.
- **Mission over several slots** (slot window of the ODV planning): take-off at the start of the slot, end =
  take-off + block time + turnaround; the slots covered are shown (“takes up Monday afternoon, Monday evening”)
  and the pilot must be free until the end (hour-by-hour declaration, otherwise workbook; no other assignment).
- **Ferry from the slot window**: shown end to end (route, take-off → arrival). Three choices:
  - **another pilot** (offered among the pilots free for the whole duration of the ferry, mastery of the type first);
  - **the mission pilot themselves**: ferry brought forward before the slot if they are declared free then (at the
    earliest quarter hour), otherwise flown from the start of the slot, the mission being shifted accordingly;
  - **to assign**: the ferry becomes a separate mission, without a pilot (“ferry” row, status “to assign”);
    it appears in the window of the slot it falls in (“Ferries to assign”), where it is given to a free pilot.
  Mission take-off can be changed (UTC time, brought forward or delayed; empty: automatic); a pilot not declared free
  over the whole range (ferry included) is flagged.
- **A ferry by a third party is a mission**: its own row in the index (role `convoyage`, pilot, aircraft,
  route, times), visible in the ferry pilot's “My missions”, in the week of the planning and in its slot. It
  only occupies the ferry pilot: the mission pilot is only taken from their take-off (they are taken from the ferry
  onwards only if they fly it themselves).
- **Patrol**: one named aircraft per participant; consecutive callsigns (MERCURE31 → MERCURE32); same type if
  the mission requires it (imposed `TYPES_EQUIPES`), otherwise a compatible type.

## 6. Standby missions

The generator knows alert subtypes (QRA of AAR, AIR_POLICING of COMMAND) and exercises with a timeline
(H-hour, tracks (“chiffons”), radio messages) but **no mission describes waiting on the ground**: to be added to the prompt
(`docs/PROMPT_GENERATEUR_MISSIONS.md`), optional block:

```yaml
alert:
  ready_at: "H-30"            # prêt à partir de (relatif à H ou heure réelle)
  aerodrome: LFBM
  notice_min: 15              # décollage prévisible XX minutes après l'ordre
  window_end: "H+120"         # fin d'astreinte
  trigger: "message radio du CDC (mission d'organisation Z, événement EV-1)"
  phases:                     # plusieurs phases / pistes possibles selon l'ordre reçu
    - { id: P1, if: "piste nord", route: [PT1, PT2], task: "interception" }
    - { id: P2, if: "piste sud",  route: [PT3], task: "identification" }
```

Pilot display: “Be ready at 12:30 at LFBM and wait for orders; expected take-off within 15 minutes. End
of standby 15:00.”; the take-off order and the phase selected come from the organisation mission (event), like
the tracks revealed today. Slot occupied: from `ready_at` to `window_end` + estimated block time.

## 7. Sealed envelope

Header indicator (next to the save button), visible only when an unread assignment exists for
the user: envelope with a wax seal in the material designs (image to supply: `shared/deco/<design>/sealed.webp`,
cut out; Cabinet: red wax, Rugged: khaki envelope and stamp, Aqua: glass envelope), envelope icon and badge
elsewhere. Click → “My missions”; opening the mission marks the assignment as read (`read_at`).

## 8. Proposed breakdown

1. **Identity** (“My trigram”) + **“My missions” page**, read-only, on hand-written assignments
   (sample file) + sealed envelope. Validates the display and the Maps / Fuel hand-offs.
2. **Assignment on the Centre side**: “Assign…” dialog (participants, pilots and aircraft filtered by MMS slot,
   conflicts), writing of `affectations.yaml`, index.
3. **Hourly grid** of availability (refinement of the MMS periods to the hour).
4. **Aircraft pool and ferry** (other airfields, ferry time, take-off brought forward).
5. **Standby**: `alert` block in the prompt and the schema, pilot display, slot occupation.

## 9. Open questions

1. **Sharing assignments and availability**: through the `data/` git repository (private?), or file export / import,
   or another channel? (personal data: trigrams, times)
2. **Confirmation**: does the pilot accept / decline an assignment, or is the assignment an order?
3. **Times**: entry and display in UTC (Z) or in the airfield's local time?
4. **Granularity**: 1 h by default, 30 min as an option — agreed?
5. **Pilot page**: in everyone's ☰ menu (“My missions”) or only if a trigram is set?
6. **Sealed envelope**: one image per material design (to supply), or a single shared one?

## 10. Implementation (branch feature/affectations)

- **Foundation** `shared/assignments.js` (all pages, loaded by `repository_nav.js`): trigram from the pilot profile
  (☰ › Pilot profile, “Trigram” field), index `data/missions/affectations.json` read by fetch, local read / unread
  (`assignmentsRead:v1`), **sealed envelope** in the header (envelope with a wax seal, counter; dressing of the
  material designs), availability grid, writing of an assignment (Centre).
- **Pilot page** `apps/pilot/mes_missions.html` (☰ menu “My missions”): upcoming missions, read-only mission
  (aircraft, callsign, airfield, take-off time or standby instruction, ferry, team mates, summary, route and
  plan, maps supplied), **Open in the flight maps** (shared mission of the “planner” space), **Fuel**
  (ICAO route, distance, level, true track: `plannerHandoff:v1`), **Create the report** (assigned registration);
  **My availability**: standard week, one-hour cells painted with the **ODV codes** (palette: O, SC, C, T,
  S, N, AT, AM, G, DC, IR, IN, V, Q — “Colour code” (« Code couleur ») legend of the workbook; colours = ODV families matched to the
  design); a click or a drag sets the chosen code, a second click on a cell with this code clears it; saved in the
  browser and, with the button, in `data/disponibilites/<TRI>.json`. The Centre dialog shows the code at the
  take-off time and warns if it does not cover the mission's family (e.g. T “Transport” on a COMBAT mission).
- **Centre**: **“Assign…”** button in a mission's details (registry; not for organisation missions Z),
  `shared/assign_dialog.js`: take-off time or H-hour (exercise: participant's offset), standby (ready at,
  notice, end), participants (+ wingman, consecutive callsign), pilot (reference: qualification on the type,
  availability at that hour), aircraft of the requested type (fleet; based at the departure airfield or **ferry**: distance
  from the SIA database, the registry or the world aerodrome database, cruise speed + 20 min, ferry
  take-off = take-off − duration − 30 min), conflicts (pilot or aircraft already taken, duplicates), saving
  (`affectations.yaml` of the mission + index).
- **ODV planning** (`apps/cpco/odv_assign.js`): **two rows per pilot** in the grid — workbook code, then
  the pilot's declaration mapped to the slot (dominant code of the declared hours, same rendering as the workbook); **red
  frame**: available (declaration, otherwise workbook) and not assigned; mission number: assigned; **click on the declaration**
  → registry missions for this pilot and this slot → “Assign” (pre-filled dialog: pilot, start time of the
  slot); **common slot** (“Registry missions…”): “Assign” offers the free pilots of the slot (as many
  as the mission has teams, the others listed).
- **The pilot's aircraft** (“My aircraft”): fleet types owned / mastered, stored with their availability;
  the dialog uses them (mastered: ok; owned or known flights: warning; not declared: error).
- **Ferry** can be given to another pilot (“by …” in the dialog): “ferry” row in the index, visible in
  their “My missions” (bring the aircraft from its base to the departure airfield).
- **Factoring**: geography, airfields, ferry, qualification, slots, conflicts and writing in
  `shared/assignments.js`, used by the dialog, the ODV and the pilot page; writing no longer depends on the registry.
- **Default decisions** (§ 9, to be confirmed): sharing through the `data/` repository; no acceptance (the assignment is an
  order, the pilot acknowledges reading it); UTC times; one-hour cells; “My missions” in everyone's menu; one
  drawn envelope (SVG) dressed per design.
- **Testing**: set your trigram (☰ › Pilot profile, e.g. RBR); in the registry, a mission's details →
  “Assign…” (missions folder authorised); reload a page: sealed envelope; “My missions”.
- **Posts** (1 October 2026): a mission asks for one pilot per air crew — `aircraft[]`, or `teams[]` of the
  helicopter schema (callsign, type; generic type “Helicopter”: a helicopter of the fleet, from the team's service
  first — Gendarmerie → Gendarmerie nationale); ground teams are left out (`MissionAssignments.postsOf`, `planesFor`,
  `fits`). The dialog shows one post per card (its own type, aircraft and qualification).
- **Slot matrix (ODV)**: missions × posts, free pilot and aircraft per post, pre-filled by the proposal;
  transaction: pending choices visible (“RBR → I-01A · aircraft · callsign”), “Save” writes the ticked
  missions, “Undo changes” goes back to the proposal; closes when all the free pilots are assigned,
  or on request (confirmation if changes are pending). “✎ detail”: full dialog, whose result comes back
  into the matrix (“Carry over to the slot”), nothing is written before “Save”.
- **Exercise in the matrix** (2 October 2026): the missions of a same operation (`I-001A`, `I-001B`, `I-001C`;
  operation taken from the identifier, otherwise from the registry; the organisation mission …Z is never offered) fit
  on **one row**: banner “⛓ Operation … — n linked missions”, edge line, **a single tick box**, one post per crew of
  each mission (its own callsigns), **“+ wingman” under each crew** (patrol within its mission,
  next callsign); “Save” writes all the missions of the operation, each with its pilots.
- **H-hour**: an exercise has only one reference time (H, T or M: the same instant); offsets with their unit
  (`H+2mn`, `H-20mn`, `H+1h`, `H+1h30mn`; without a unit: minutes, old files; shared reading and writing
  `RepositoryKit.hOffset` / `hText`). On the row of an operation, the field becomes “H-hour” (by default, the
  first crew takes off at the start of the slot); each crew takes off at H + its offset (participants of the …Z),
  its ferry is calculated on that take-off, each mission is saved at its own time.
- **“Edit”** (filled slot): the missions saved in the slot are at the top of the matrix, ticked and
  pre-filled (pilots, aircraft, callsigns, ferry, take-off); “Save” rewrites them. Flights of the
  timeline: **Plan… / Edit…** button leading to their slot.
- **Aircraft**: an aircraft already taken by another ticked post (wingman, other mission) or committed in the slot
  is greyed out (“already assigned”, “committed”). The window stays anchored on the element being edited when redrawn.
- **One mission per pilot and per period** (morning, afternoon, evening), even if their declared availability is
  wider; a ferry pilot has no other mission in the slots touched by their ferry.
- **Ferry**: the ferry pilot only receives the ferry order (aircraft, departure, arrival, time, for whom),
  not the brief, the maps or the envelopes of the mission.
- **Exercise envelopes in “My missions”**: the events addressed to the crew (or sent by it: “Message to
  pass on”) are **sealed envelopes** behind the bookmark: the design's envelope (`shared/deco/<design>/pli-sealed.webp`),
  the opening time (participant's take-off − its offset + time of the event), the number of tracks and of maps
  attached. The envelope opens by itself at the time (notification); a click on the envelope breaks the seal (before the time:
  two-step confirmation); “Reseal” closes it again. The tracks (nature, route, level, to be established) and the exercise
  maps (`maps[].exercise`) only appear in the open envelope; the technical sheet shows neither `tracks`, nor
  `injects`, nor `exercise`.
- **Book**: the last page of the folder is on the left (“intentionally left blank” page before it if needed);
  opposite, the “Additional information” page leads to the annexes (envelopes) through the corner or with a click; the bookmark, placed
  at the end of the folder, opens them or goes back to them, and turns with the page. Maps: shared viewer
  (`RepositoryKit.viewImage`: cross, Esc).
- **Log** (`LocalStore.logEvent`, `kind: 'mission'`): mission opened, resealed, envelopes opened (on time, before
  time), resealed, hand-offs to the Flight maps, the fuel, the report — the basis of the upcoming pre-filled report.
- **Weeks** (1 October 2026): availability per week (`weeks`, key: ISO Monday UTC, twelve past weeks
  kept); the old “standard week” grid (`grid`) applies as long as no week has been entered. “My missions”:
  week bar (‹, date, ›, ⟲ current week) shared by the list and the grid; “⧉ S-1” copies the previous
  week; drawing by rectangle (days × hours). The Centre and the ODV read the grid of the week concerned.

## 11. V3 — the pilot's side: the drawers of a mission and the pilot's record (SOG-0441)

From 17 November 2026 the V3 work on assignments and on the mission read by its pilot is described here (the V2 design above stays
the reference of the Centre's side). Functional specification of the drawers: `organisation/SPEC_MISSIONS_TIROIRS.md` (version 2).

### 11.1 Batch T1 — the pure part (`modules/missions/drawers.js`)

A **drawer** (« tiroir »; twelve at most, ids B to M in the order of the file — the reader's own closed list, `DRAWER_IDS` of
`frame/lib/mission.js`, imported and never copied: a drawer the reader gives always has its place in the record — the user, 17 Nov: no limit of three; on screen
« Tiroir 1, 2, 3… », never a letter: letters name the crews of an operation — the `phases` of a mission file, read and bounded by `frame/lib/mission.js` as `drawers`) is closed
until its **key** has played: a time (`time`: the departure, or the estimated passage of a place, plus a delay), a zone or an object
(`zone`, `object`, each with an optional **fallback time** `fallbackMin`), or the pilot's gesture alone (`hand`).

- **The pilot's record** (« carnet »): one per pilot and per mission, `pilot/<TRI>/missions/<ID>.json`; **each pilot writes only his
  own** (no write conflict), never the current flight (`current_flight.json` is merged as a whole file and rewritten every ten seconds
  by the live position). One top-level key per drawer, so that the frame's `record` merge joins two devices of the same pilot:

  ```json
  { "schema": 1, "mission": "X-701A", "seance": "A:2026-11-18", "read_at": null, "start_at": "2026-11-18T19:50:00.000Z",
    "drawer_D": { "state": "open", "at": "2026-11-18T20:00:00.000Z", "how": "hand" },
    "drawer_C": { "state": "open", "at": "…", "how": "zone", "from": [44.51235, -1.204, 2400], "to": [44.498, -1.171, 2350], "source": "xplane" },
    "updated_at": "…", "by": "AAA" }
  ```

- **What is written and what is computed.** Only gestures (`hand`) and findings (`zone`, `object`, with the leg that made them) are
  written. The time and the fallback time are **computed** by every device from the same reference: the earliest real departure a
  record of the play gives (`start_at`), else the take-off of the assignment, else none (the drawer then stays closed; the gesture
  remains). A time that rests on a planned departure or on an estimated passage is flagged `estimated` (the screen says « heure estimée »).
- **The order** (the ergonomist, 17 Nov, 19 h 22, as the reference engine of the user's mission workshop does): a key, a fallback
  time or the gesture opens **only the first drawer still closed**; the next ones are locked (`locked`, `after`: the drawer before)
  and say « après le tiroir n ». What happened while a drawer before was closed — a time that passed, another pilot's finding — plays
  **as soon as that one opens**: the drawer then opens at that instant (`at`), `srcAt` keeping the time of the fact. A finding of
  another pilot under lock is kept by the device (`other`, the « seen » document) for its turn.
- **Open for all** (the user's decision, Q-0087) is **computed**: a drawer is open as soon as the record of ONE pilot of the mission
  says a **finding** (zone entered, object found); the earliest opening kept is « the » opening (who, when, how). The **gesture**
  « Ouvrir le tiroir » opens for the pilot who makes it only (on all his devices): the others read it (`hands`: « BBB opened it by
  hand ») and keep their drawer closed — the ergonomist's rule of 17 Nov while the user answers Q-0094 (for all, or for oneself);
  one line to change (`SHARED`).
- **The play** (« séance »): a mission is played again, so a record is worth one play only — `A:<UTC day of the first take-off>` for a
  mission assigned to this pilot (`A:0` without a time; the crew = the trigrams of the mission's lines, cancelled lines and ferries
  left out), `S:<started.at>` for a mission played alone once its flight has started (none before: a record written before the
  departure has no play and is attached to the one of the departure). A record of another play does not count and is replaced at the
  first write.
- **Another pilot's record is an untrusted input** (any pilot writes in the repository). It is read bounded (`readBook`: own keys
  only, closed lists, bounded numbers and positions) and its opening is kept only when it stands; otherwise it opens nothing and is
  **named** in `refused` with its author: `stranger` (not a pilot of the mission), `seance` (another play), `future` (more than two
  minutes ahead), `before` (more than twelve hours before the reference), `key` (a zone finding on a drawer without a zone), `shape`
  (the leg it carries does not cross the shape of the reader's own mission file — judged by the frame's service, later).
- **An open drawer stays open.** No one can close another's drawer; the device keeps the openings of others it has seen
  (`readSeen` / `seenAfter`, a device-only document): if the author removes it from his record, the drawer stays open here and the
  state says so (`gone`). « Resceller » (the author's tool, Full level) only withdraws the pilot's own opening and the time for
  himself; another pilot's opening keeps the drawer open.
- **The limit, stated**: without accounts, a pilot of the mission who writes a false but plausible finding in his own record opens
  the drawer; it is not prevented, it is said everywhere (who, when, how).
- **One record per pilot, settled** (the ergonomist, 17 Nov, 18 h 30): the shared append-only journal per play considered the same
  day is dropped — a file written by several workstations at once would rest on a merge at every stage of the synchronisation.
- **What the Centre must know**: the play of an assigned mission is the UTC day of its first take-off, so **moving an assignment to
  another day starts a new play — the drawers are closed again** for every pilot (the old records no longer count); moving it within
  the same day keeps them.
- **A key this batch cannot judge yet** (the « arrivée » key and the moving target of the mission editor's format,
  `organisation/SPEC_MISSIONS_TIROIRS.md` § 10.3) is not refused: the drawer stays closed and opens by the gesture, or at its fallback
  time when the file gives one; a finding written for it in another pilot's record is refused (`key`). The fallback time holds for
  **every key but the time key** (`docs/technique/FORMAT_MISSION.md` § 4) — also for the gesture alone, which is what the reader
  gives when it could not read the author's condition.
- Bench: `modules/missions/test/drawers.html` (case N80). Nothing on screen yet: the « Tiroirs » section is batch T2.

### 11.2 Batch T2 — the « Tiroirs » section of the mission sheet (`modules/missions/drawers_view.js`)

The screen described here was changed by § 11.5 (SOG-0459): nothing of a closed drawer is shown any more — no line, no count, no key, no « Ouvrir le tiroir »; the section shows the OPEN drawers only, under « Suite de la mission », and the one gesture is « Demander la suite ». What is said below of the reading, the writing, the order and the synchronisation still holds.

- **Where**: on the first page of the sheet, **in the place of the zones line for MY mission** (the ergonomist, 17 Nov, 19 h 06: the
  first page keeps its seven elements; the zones stay in « Détail »; a browsed mission keeps its zones line and gets one line
  « Tiroirs : n »), a section `[data-drawers]` the module only places (`module.js`: the import, `meta.files`,
  `meta.reads` / `writes`, one mount point, one call after each drawing, `stop()` at unmount); the view paints it and owns its gestures.
- **Whole only for MY mission** — it is assigned to me (a line of `missions/affectations.json` carries my trigram), or it is the
  mission of my current flight (`flight.mission`). A mission I only browse says « Tiroirs : n » and nothing else: no title, no key, no
  gesture (one does not open the drawer of a mission one does not play).
- **The screen follows the accepted mock-up** (`modules/missions/maquette/tiroirs.html`, « Ce que le pilote voit », accepted by the
  ergonomist on 17 Nov): the author's preview and the pilot's screen say the same thing — `describe(tt, state, drawer, { live,
  notJudged })` of the view is pure and gives the three sentences (the key, the note, how it opened) to whoever needs them.
- **Seven drawers on screen**, the next ones folded under « Tiroirs suivants : n » (the rule of seven elements); a folded drawer
  opens and is touched like the others.
- **A closed drawer**: an envelope, « Tiroir 1 · Title » (its rank, the one the reader gives), its key in words — « s'ouvre à 20:20Z (heure estimée) », « s'ouvre au passage de la
  zone montrée sur la Carte », « s'ouvre en vol » for a hidden zone or a condition, « s'ouvre quand l'objet est trouvé », « s'ouvre à
  l'arrivée à … », « à ouvrir à la main » — and « Ouvrir le tiroir ». Neither its message nor its briefing is in the page.
- **Only the first closed drawer has « Ouvrir le tiroir »**; a locked one shows its envelope, its name and « après le tiroir n ».
- **The fallback time is said only when it concerns the pilot** (the ergonomist, 17 Nov, 18 h 42) — otherwise it stays out of his
  sight: when the key is **not followed in flight** on this device (§ 11.3: what `follows(key)` of `drawers.js` does not judge, and
  the reader's own rule `notJudgedYet` — a moving target, a required following, a condition of the workshop) — the pilot's sentence, the hour first and once: « Cet appareil ne suit pas encore ce passage : le tiroir s'ouvrira à
  19:20Z (heure estimée), ou à la main » (« H + 1 h 30 » only while no hour is known) —, or when the device has **no live position**
  (`ctx.live.status` is not `tracking`) — « Sans position en direct sur cet appareil : le tiroir s'ouvrira à 19:20Z ».
- **Wide screen**: the first column of the sheet widens for MY mission (up to 40 em) and a drawer is 64 characters wide at most.
  Another pilot's gesture is said under the key (« BBB l'a ouvert à la main à 20:31Z, pour lui seul »).
- **« Ouvrir le tiroir » takes two touches** (the second within five seconds, as in the V2): the first writes nothing; the second
  writes the pilot's own record, then asks the frame for a synchronisation pass at once, so that the other devices read it without
  waiting for the background pass.
- **An open drawer**: how and when (« ouvert à l'heure, à … », « ouvert à l'heure de repli », « ouvert à la main », « ouvert au passage
  de la zone par BBB », « ouvert sur « Objet en vue » »), its message (set off by a rule) and its briefing as text; a long briefing
  shows its first 1 200 signs, the rest under « Lire la suite » (the page-by-page reader is batch T3). Every text of the file goes
  through `esc`. A drawer that opens while the
  sheet is shown is announced once by a floating notification; so is an opening of another record that is not kept, with its author
  and the reason. « Resceller » shows at the Full level only.
- **What it reads and writes** (through `ctx.data` only): reads `missions/affectations.json`, `pilot/<me>/current_flight.json`, the
  records of the pilots of the mission (twelve at most) and `cache/missions/seen_<ID>.json`; writes **only** the pilot's own record
  (the gesture; the real departure `start_at` of the flight of this mission, once) and the device-only « seen » document.
- **The others' records arrive by a synchronisation pass asked every ten seconds, bounded** (the ergonomist, 17 Nov; every ten seconds instead of every minute: SOG-0463, 18 Nov): only while the first
  closed drawer is awaited (a key judged in flight) AND the section is on screen AND the mission has other pilots; it stops when the
  drawer opens; it is **paused while the page is hidden** (a hidden tab, a sleeping device) and resumes with a pass at once when the
  page comes back. The pass is the module's background pass (`ctx.data.sync()` without `gesture`, never a gesture on a timer); its
  cost is six passes a minute per waiting device — on a device without launcher, six passes a minute to the repository's API, under the ceiling of 80 a minute (hence ten seconds and not five).
  A pass that finds nothing new costs ONE conditional request for the head of the branch (two when a reference repository is set:
  `pullRefs` asks its head too), and a 304 does not count in the API's limit (`transport_github.js`, `head()`); a pass that finds
  something reads the changed files besides. Passes never pile up: `sync()` is single-flight and holds the `sog-frame-sync` lock, so a
  pass slower than ten seconds does not start the next one (Sécurisation, 18 Nov).
- **« reçu ici à … »**: an opening of another pilot received more than a minute after the fact says so — « ouvert au passage de la
  zone par BBB, à 20:14Z — reçu ici à 20:16Z » (the device keeps the time it first saw it, `got` in the « seen » document). No delay
  is promised in figures on screen (the ergonomist, 17 Nov, 19 h 32).
- **The delay, measured on a bench with two devices** (17 Nov 2026: two trial launchers, each on its own clone of an invented data
  repository, a local bare git repository as the remote, no network): the gesture on device A is committed and pushed **about one
  second** later (the view asks for a pass right after the write); on device B a pass takes **about half a second** and brings the
  record, which the section shows at once. With only a re-reading of the files (`data.revalidate`) device B had **nothing after 90
  seconds**: on a workstation with a launcher, re-reading does not exchange with the repository, and the opening would have come
  with the background pass (every ten minutes) — hence the pass. End to end with the pass asked every minute: **47 seconds** in the
  trial; the bound was one period (60 s) plus the exchange. With ten seconds (SOG-0463) the bound is one period plus the exchange, about
  10 + 1.5 s, so under 15 s; this bound is **computed** from the exchange times measured on 17 Nov, not measured again with two launchers. **Not measured**: a real remote over the network (each exchange then takes
  the time of a git fetch and push), a device without launcher, the load beside the simulator (one short git exchange every ten seconds). A
  measure on the real repository is the user's to grant (Q-0097).
- Help: `modules/missions/help/<lang>.md`, « Les tiroirs » (`missions-drawers`), four languages; the two documents of the section
  are listed in `modules/missions/INTEGRATION.md`.
- Cases: N81 (the view in a bare page with a fake frame), N82 (the sheet, 390 and 1280 px, four languages).
- **Security review** (« Sécurisation », 17 Nov, accepted with one touch-up): every path the view builds — the pilot's record, his
  current flight — starts from the trigram **validated** by `bookPath` (trimmed, three letters), never from the identity as it is
  (« ABC » followed by a blank gave `pilot/ABC /current_flight.json`). Counter-test: without it the bench of N81 stops on its case
  « un trigramme de l'identité avec des blancs » (red). The module declares the whole `pilot/` prefix (as Fuel does) and writes only
  `bookPath`: not to be widened. The minute re-reading costs up to twelve repository reads a minute on a device without launcher: it
  runs only while a drawer is awaited and the page is visible, and stops at the opening.

### 11.3 The zone lot — the drawers follow the flight (`frame/lib/crossing.js` through `ctx.live.watch`)

The screen described here was changed by § 11.5 (SOG-0459): the following goes on in silence — no « Cet appareil suit ce passage », no « À portée de l'objet », no « Objet en vue »: an object in range is opened by « Demander la suite ». The judging and the findings are unchanged.

The ergonomist's word, 17 Nov 2026, 21 h 48. The frame's crossing service (SOG-0447, `frame/lib/crossing.js`) judges; this module
decides what is followed, writes the finding and says it.

- **What is followed** — `follows(key)` of `drawers.js`: a zone the PILOT crosses (no `actor`), an object that does not move, an
  arrival without a required following (`escortMinSec`). The rest is not judged by the device and keeps the sentence « Cet appareil
  ne suit pas encore ce passage : … » : a moving target (an actor that crosses the zone, a moving object), a required following,
  a condition of the workshop's 1.1 contract (`keyWhy === 'condition'`, `notJudgedYet`).
- **When** — only for the **first closed drawer** (the order), only while **the started flight of THIS mission** is under way
  (`current_flight.json` carries `mission` = this one and `started.at`) and the frame has a live position (`ctx.live.status ===
  'tracking'`). A live position during another flight is not this mission's: the line then says « Sans position en direct sur cet
  appareil : … ». One subscription (`ctx.live.watch`, a fix every five seconds), released by `stop()`; **no timer of this module**.
- **The leg** — each fix is judged with the one before — the first one received with the frame's last fix (`ctx.live.last`); two
  fixes more than a minute apart are not a leg: the fix is judged alone, the track says the rest — (`finding(key, prev, next, {
  trail })`): a zone the leg **touches**
  (`crossed(...).touched`: entered, inside, or crossed between two fixes), under its ceiling; an object the leg passes **in range**
  (`reach(...).ok`, range and height); an arrival **landed** (`arrived(...).ok`: within the radius, on the ground, under the maximum
  speed) once every required stop was approached, on the kept track or on this leg. An absent datum never satisfies a key (the
  service's rule): « on the ground » unknown is not landed.
- **The finding is written at once** in the pilot's own record, by the same `withOpen` as a gesture: `how` (`zone`, `object`,
  `arrival`), `at` = the time of the FACT (the crossing, never in the future), `source`, and **the two fixes of the leg**, `from` and
  `to`, each `{ lat, lon, at, altFt, aglFt, onGround, gsKt }` at full precision (read through the service's `fixOf`; an unknown
  field is absent). Then a synchronisation pass is asked (`ctx.data.sync()`), as after a gesture.
- **Another device replays it** — `stands(entry, key)`: the finding of another pilot's record is re-played by the same service on
  the reader's OWN mission file; a finding without a fix, or whose leg does not touch the zone, reach the object or land at the
  arrival, is refused (« shape ») and named as before. An arrival is a finding: open for all (`SHARED`).
- **Security review** (« Sécurisation », 18 Nov, accepted with two touch-ups, each with its counter-test in the bench of N80): a
  finding on a key this file does **not follow** (a zone a target crosses, a moving object, an arrival with a required following) is
  refused « key » — the screen says the key is not judged in flight, another pilot's word does not open it; the two fixes of a finding
  are a leg only when they are **one minute apart at most** (`LEG_MS`, the same rule as the writing) — otherwise a distant `from`
  would draw a chord through the shape: the last fix is then judged alone. Known limit, unchanged: without accounts, a pilot of the
  mission can still write two invented fixes that stand; the screen says by whom, when and how. A catch-up on a thinned track (two
  points more than a minute apart, neither inside the shape) opens for its pilot and is refused by the others.
- **« Objet en vue »** — an object whose author wants the pilot's word (`confirm`, the default) is never opened by the range alone:
  in range, the line says « À portée de l'objet : déclarez « Objet en vue » » and the button becomes the main one; the pilot's touch
  writes the finding (the leg in range, the time of the touch). The button is accepted for one minute after the last fix in range;
  out of range it is refused with a notification (« L'objet n'est pas à portée de cet appareil : … »). `confirm: false`: the range
  opens.
- **The catch-up** — when the page comes back (or when the live position arrives after the drawing), the first closed drawer that is
  followed is replayed ONCE on the kept track of the flight (`ctx.live.trail()`, read only when its `from` is the `started.at` of this
  flight) since the moment it became the first closed one (`since`): `catchUp(key, trail, since)`, source `trail`. The track keeps a
  point per nautical mile: a coarser leg than the fixes. An object that wants « Objet en vue » is never caught up.
- **On screen** — a followed drawer says « Cet appareil suit ce passage » (`[data-dw-follow="followed"]`), without the fallback hour
  (it does not concern the pilot); an opened one « ouvert au passage de la zone, à … », « ouvert sur « Objet en vue », à … »,
  « ouvert à l'arrivée, à … ». The section is re-read at the first fix that turns the live position on or off; a live position that
  goes silent is said at the next minute at the latest.
- **Not done here**: the page closed, nothing is judged (the catch-up does it at the return, on the track); a watch held by the frame
  (V3 Frame's idea, `device/watches.json`) is the ergonomist's to settle. The fallback hour still opens the drawer for everyone.
- Cases: N80 (72 checks: `follows`, `finding`, `stands`, `catchUp`, the fixes of a record), N81 (64: the subscription, the three
  states, the catch-up, the flight of another mission), N83 (the sheet with a simulated launcher and simulator: followed, crossed,
  in range and « Objet en vue », the arrival; 390 and 1280 px, four languages).

### 11.4 The secret of a closed drawer on the sheet, and the open drawers published on the device (SOG-0448, the part of this session)

The rule is the reader's, written once: `pilotView(mission, opened, { mine })` of `frame/lib/mission.js`
(`docs/technique/FORMAT_MISSION.md` § 4 bis). This session gives it its two inputs — whose mission it is, which drawers are open —
and nobody else computes them.

- **The sheet and its Detail** — `drawers_view.js` exports `sees(id, mission)`: the mission read, through `pilotView`, with what the
  posed « Tiroirs » section knows. Before the section has read (the first drawing), and for a mission that is not mine: the visible
  part alone — a place, a zone, a rendezvous or the target of a closed drawer is neither listed nor named, in the first page as in the
  Detail. `modules/missions/module.js` calls it in `missionHtml` (one line) and gives `show()` a `changed` callback (one line): when a
  drawer opens — a gesture, its hour, a finding — the section tells the sheet ONCE per state and the sheet is drawn again with the
  places of the drawer (a sheet that does not redraw is not called at every computation; no drawing loop: a redrawn sheet calls
  `sees` again, which records what it returned). The section itself keeps reading the WHOLE mission: it follows the keys in flight.
- **The document of the device** — `cache/missions/open_<ID>.json` (prefix `cache/missions/`, policy `cache`: on the device alone,
  never sent, never in a backup), written by `drawers_view.js` after every computation of the section, when it changes or when its
  hour is a quarter of an hour old:

  ```json
  { "schema": 1, "mission": "X-905A", "mine": true, "seance": "A:2026-11-18", "opened": ["B", "C"], "at": "2026-11-18T05:12:00.000Z" }
  ```

  `opened`: the letters of the drawers open for THIS pilot at this computation (his gesture, the hour, a finding of the crew), in the
  reader's order; `seance`: the play it belongs to (null before the start of a mission played alone); `at`: the hour of the
  computation. No position, no title, no text of the mission. A mission that is not mine writes nothing — except to undo a document
  that said it mine (an assignment withdrawn): `mine: false`, no letter.
- **Reading it** — an UNTRUSTED entry like any document (another tab, another version, a hand): only through
  `readOpen(doc, missionId, { now, seance })` of `drawers.js` (pure, never throws) → `{ mine, opened, seance, at }`, closed on failure
  (`{ mine: false, opened: [] }`): another mission, another schema, a `mine` that is not exactly `true`, no hour, an hour more than
  two minutes in the future or more than a day old (`OPEN_MS`), a play that is not the reader's when the reader gives it; of `opened`
  only the letters of `DRAWER_IDS` count (64 entries read at most). The Map (BUGS SOG) reads the document with it and passes the
  result to `pilotView(mission, r.opened, { mine: r.mine })`; it can watch `cache/missions/` to follow an opening. `openPath(id)`
  gives the path (never a path taken as it is), `openAfter(states, { mission, mine, seance }, now)` the document to write.
- **Limits, said** — the document is what the device knew when the SHEET last computed: the page closed, a drawer whose hour passes
  stays closed on the Map until the sheet is shown again (too little is shown, never too much). A mission played alone and started
  again within a day without showing its sheet keeps the letters of the play before, unless the reader gives the play to `readOpen`.
  A place of a mission with drawers that nothing cites (neither the route, nor the centre of a map, nor a drawer) is not shown: the
  reader's rule; the invented missions of N82 cite their zone by a map. It is a seal of the game, not a protection: the file stays
  readable by whoever opens it.
- **A document more than a day old is « nothing open »** (a closed failure, wanted): it holds again as soon as the section of the
  sheet has computed once more.
- **The readers to pass** (the Security session, 18 Nov 2026) — the seal exists only where it is applied: every screen that shows a
  PILOT a mission read whole must go through `pilotView` with `readOpen`, and each one that does goes back through the Security
  session. Done: the sheet and its Detail (here). To do, by their owners: the Map (`modules/maps/mission_view.js`, `screen.js`,
  `module.js` — BUGS SOG), « Préparer ce vol » of Carburant (`modules/fuel/module.js`, `MS.readMission` then `MS.missionFlight`),
  the report (`modules/report/module.js`), the search in the content of the missions (`modules/missions/search.js`
  `missionFields`, the index built by `module.js`). Not concerned: the workshop of the author, who sees everything
  (`editor*.js`), and the tools that handle the file itself (`add.js`, `move.js`, `registry.js`). Listed from the files that import
  the reader; what each of them shows of a closed drawer today was not measured here.
- Cases: N80 (81 checks: `openPath`, `openAfter`, `readOpen` and its hostile entries), N81 (74: `sees` before and after the reading,
  the document written, the sheet told once, a browsed mission, the document undone), N84 (the sheet of an invented mission whose
  drawer 1 hides a zone, a point and a rendezvous: closed, opened by the gesture, then the same file as another pilot's mission; 390
  and 1280 px, four languages).

### 11.5 The existence of the drawers is hidden (SOG-0459)

The user's word, 18 Nov 2026: « si une mission a des tiroirs, ils sont masqués ; même le fait qu'il y en ait doit être masqué, et tout
moyen de voir que la mission va au-delà d'un objectif primaire ». The ergonomist's decisions of the same day; `drawers_view.js` and one
pure function of `drawers.js`.

- **What is removed from the pilot's screen** — every line of a closed drawer (its envelope, « Tiroir n · title », its key in words,
  « après le tiroir n », the notes « Cet appareil suit ce passage », « Sans position en direct… », « Cet appareil ne suit pas encore… »,
  « À portée de l'objet… »), the line « Tiroirs : n » of a browsed mission, another pilot's gesture (« BBB l'a ouvert à la main… »), the
  notification of a refused opening of another record, the gestures « Ouvrir le tiroir » and « Objet en vue », and the number in the
  notification of an opening. `describe(tt, state, drawer, opts)` keeps its form and its sentences: the author's workshop
  (`editor_view.js`, case N79) uses them; the rows of `TX` it needs stay, the others are gone.
- **Nothing before an opening** — for EVERY mission (mine or browsed, with or without drawers), as long as no drawer is open, the
  section `[data-drawers]` stays `hidden` and EMPTY: no text, no element, no attribute that depends on the drawers (`data-mine` only
  when an open drawer is shown; before, the zones line of the first page is there as for any mission).
- **« Suite de la mission »** — as soon as a drawer of MY mission is open, the section shows `<h3>Suite de la mission</h3>` and one line
  per OPEN drawer, in order: its title in bold (no rank), how and when (`describe`'s `how`, with « reçu ici à … » and « … a retiré cette
  ouverture »), its message, its briefing (cut at 1 200 signs, « Lire la suite »), « Resceller » at the Full level. Nothing says what is
  still to come. Beyond seven open lines, the next are folded under « {n} autres ». The notification: « Suite de la mission : {title} ».
- **The following goes on in silence** — time, fallback time, zone entered, arrival landed, object in range without a wanted declaration
  (`key.object.confirm === false`), another pilot's finding: they open as before (same computation, same writings in the record).
  `v.inRange` is still kept for an object to declare, without painting anything.
- **One neutral gesture, « Demander la suite »** — a button `[data-dw-ask]` the section places in the place `[data-actslot]` that
  `module.js` gives it in the actions row of the sheet, right after « Préparer ce vol » (a `<span>` in `display: contents`; the batch T3
  will put « Lire la mission » there too: the section removes only ITS button), for every mission that is MINE, with or without drawers;
  removed when the mission is not mine and by `stop()`; no place (a bare page), no button. Touch height 44 px, no forced wrap. The first
  touch shows the panel `[data-dw-askbox]` — « Vous avez atteint ou trouvé ce que la mission demande ? Le centre vous donne la suite s'il
  y en a une. », « Demander » and « Pas maintenant » — the same words and elements for every mission. « Demander » opens the first closed
  drawer (not locked) when its key is the gesture (`hand`, whatever `keyWhy`; written by `withOpen(…, 'hand')`), or when its key is an
  object that the device follows and has in range NOW (a fix in range less than `RANGE_MS` ago; the finding written as « Objet en vue »
  did); an unknown position never satisfies the key; a time, a zone, an arrival, an object out of range or not followed: nothing opens.
  The rule is pure: `asked(states, { inRange })` of `drawers.js` → `{ id, how: 'hand' | 'object' }` or `null`. The answer: the opening
  (the section and its notification), else the floating notification « Rien de nouveau pour l'instant » — word for word the same for a
  mission without drawers, a mission whose drawers are all closed and a mission whose drawers are all open. After EVERY answer the
  command rests one minute (`disabled`, `data-dw-rest`), re-armed by the only new timer; the rest is kept per mission in a `Map` of the
  module (opening the sheet again does not reset it); `show()` takes `restMs` (a bench shortens it). « Pas maintenant » closes the panel
  without rest.
- **The section runs for every mission** — `show()` no longer stops on a mission without drawers: it reads the assignments and the
  current flight to know whether the mission is mine, places « Demander la suite » if so, and publishes `cache/missions/open_<ID>.json`
  (`mine: true, opened: []`) as for a mission with drawers — the same visible behaviour; a mission without drawers arms neither a due
    timer nor the minute pass, and does not subscribe to the live position (nothing to follow), without any effect on screen. Nothing
  is written to the pilot's record for a mission WITHOUT drawers — not even the real departure of its flight (the review of 18 Nov:
  the secret is a secret of the screen; no file added to the repository for every flight of every pilot); the device-only document
  `open_<ID>.json` is published for every mission that is mine. The section element for every mission read and the place
  `[data-actslot]` are GIVEN by `module.js` (the session Features SOG, in its own batch); this batch does not touch `module.js`.
- **The sentences of an open drawer** — the pilot's own opening no longer names a gesture that is gone: « ouvert à votre demande,
  à … » (`openHandMe`), « ouvert quand vous avez trouvé l'objet, à … » (`openObjectMe`), « ouvert quand BBB a trouvé l'objet, à … »
  (`openObjectBy`); the sentences the author's workshop reads (`openHandBy`, `inRange`, `followed`…) are unchanged.
- **Limits, said** — the sheet of a mission with drawers hides, by the reader's rule (`pilotView`, § 11.4), a place of the visible part
  that nothing cites (neither the route, nor the centre of a map, nor a drawer), when a mission without drawers shows it: a file written
  that way can still tell the two apart. The invented missions of N87 cite every visible place. The file itself stays readable by whoever
  opens it.
- Cases: N80 (89 checks: `asked` — by hand, object in range or not, zone, time and arrival → null, locked, none, hostile entries), N81
  (93: nothing before, the panel, « Demander », the rest, the same DOM with and without drawers, no record written without drawers, the
  object in range and out of range, the shared place), N82 (my assigned mission: nothing before, « Demander » opens the drawer given by hand, the drawer at its time opens
  by itself, a browsed mission shows nothing), N83 (in flight: nothing said while followed, the zone crossed, the object refused out of
  range then opened in range, the arrival), N84 (the secret in the sheet and the Detail; the gesture is « Demander »), N87 (the same
  screen and the same answer for X-907A, without `phases`, and X-908A, two drawers closed).

### 11.6 Landing judged in flight (SOG-0500, lot 1)

The workshop (format 1.1) writes the key `{ kind: 'condition', condition: 'landing', rule, fallbackMin }`; `frame/lib/mission.js` reads and
bounds it (`holdRule`), and until this lot no flight judged it. `drawers.js` now does, with the same service as the arrival:

- **The rule.** A fix is « down » when it is within `radiusM` metres of the point (`rule.at`) or of the still object (`rule.object`, not
  `moving`), `gsKt <= speedMaxKt` and `onGround === true` — `arrived()` of `frame/lib/crossing.js`, called with
  `{ at, radiusNm: radiusM / 1852, speedMaxKt, onGround: true }`, never copied. The condition is met when the pilot stayed down for
  `durationSec` seconds in a row. Two successive down fixes are never more than `maxGapSec` apart; a fix that is not down, a gap that is too
  long, a fix without a readable time or an unknown datum (`ok === null`) resets the hold. A missing datum never satisfies the condition.
- **`holding(key, hold, fix) → { hold, f }`** (pure, never throws): `hold` is `null` or `{ from, last }`; `f` is `null` or the finding
  `{ how: 'landing', at, from, to }` (`at`: the instant of the fix that completes the hold, in ms). `finding()` returns `null` for a landing
  and `catchUp()` too: a hold needs a state, and the kept trail has one point per nautical mile, so an aircraft on the ground leaves no points.
  `drawers_view.js` keeps `v.hold` per drawer (reset when the first closed drawer changes) and records the finding like an arrival.
- **Which sources know « on the ground ».** The simulator, every 5 s (`LIVE_SIM` of `frame/app.js`), and IVAO, every 15 to 60 s; neither the
  browser GPS nor VATSIM. With those the datum is unknown, the condition is never met, and the drawer opens at its fallback time or by hand,
  as an arrival does today.
- **`follows(key)`** accepts a landing when the point is readable (or the object is not mobile), `rule.confirmation === ''` (a confirmation
  word asked by the author is not judged yet, by prudence) and `rule.maxGapSec >= FIX_PERIOD_SEC` (5): a shorter permitted gap can never be
  held with fixes five seconds apart. Hover, overflight, sequence and event stay unjudged. `followsHere()` and `describe()` let `D.follows`
  decide for a `condition` key, so `notJudgedYet` of `mission.js` (which still says « not judged » for every condition) is not asked.
- **Shared.** `'landing'` is in `HOWS` and `SHARED`: the finding of one pilot of the mission opens the drawer for all, as an arrival does.
  `howOf(key)` pairs the finding with its key (`'landing'` for the condition, `key.kind` otherwise). `stands()` replays a landing on the
  reader's own key: both fixes down by THAT key, at least `durationSec` apart and LESS than `durationSec + maxGapSec` apart — what an
  honest device writes (`holding` concludes at the first fix that completes the duration, and two successive fixes down are
  `maxGapSec` apart at most), so a forged finding must look like a real one (Sécurisation, 18 Nov). **Replayed, not proved**: a
  hostile record can carry two fixes « on the ground » `durationSec` apart without having flown — the same level of trust as the
  zone and arrival findings already accepted.
- **Texts** (four languages): `keyLanding` (« s'ouvre à l'atterrissage », NEVER the place: the point may be a place the mission
  still hides, and its identifier — « DESTINATION », an id of the workshop — is not a name for the pilot), `openLandingMe`,
  `openLandingBy`.
- **Cases.** N80 (100 checks, 9 new: follows, holding, hostile entries, stands, finding and catchUp null, HOWS/SHARED, the record and the
  other pilot's finding) and N81 (99, 3 new: the texts, a landing held in flight, a source that ignores « on the ground »).

### 11.7 Overflight judged in flight (SOG-0500, lot 2)

The workshop's `{ kind: 'condition', condition: 'overflight', rule, fallbackMin }` (`holdRule` of `frame/lib/mission.js`, not modified)
is now judged like the landing, with no hold state: a pass is judged on one leg.

- **The rule** `{ kind: 'overflight', at | object, radiusNm, heightMinFt, heightMaxFt, confirmation, confirm }`. `overSpec(key)` returns
  `null` (not judged) for: not an overflight; neither a readable point nor a still object; `confirmation !== ''` (a confirmation word is not
  judged, by prudence); `radiusNm` not finite or <= 0; a height not finite; `heightMinFt > heightMaxFt`.
- **The heights are heights ABOVE GROUND (`aglFt`), and only the simulator gives them.** With the browser GPS, IVAO or VATSIM `aglFt` is
  unknown, so the condition is never met (an unknown datum never counts, and neither does the altitude `altFt`): the drawer opens at its
  fallback time or by the gesture. Trail points carry `aglFt` in `q[4]`; older points have none, hence an unknown height.
- **A pass** (`prev` → `next`, two fixes; `prev` null: the fix alone) counts when two things hold: the leg passes within `radiusNm` of the
  point, horizontally — `reach()` of `frame/lib/crossing.js`, called with `{ lat, lon, rangeNm: radiusNm }` and no `heightFt`, which is how
  `reach` skips its vertical judgement; nothing is copied — AND the height above ground is known and within `[heightMinFt, heightMaxFt]`
  at BOTH fixes of the leg (at the single fix when `prev` is null), by prudence: a leg that crosses the circle between a fix inside the
  band and one outside it does not count.
- **`confirm`** (true by default, `require_confirmation`): `finding()` returns the finding with `confirm: true`, `drawers_view.js` keeps it
  in `v.inRange` and « Ask for what comes next » opens the drawer, as for an object (`asked()` now returns `how: 'overflight'` for such a
  key, and the view records any non-`hand` answer from `v.inRange`). With `confirm: false` the finding is written at once.
- **Catch-up.** `catchUp()` replays the kept trail for `confirm: false` only; a confirmed overflight is never caught up, like an object.
- **Shared and replayed.** `'overflight'` is in `HOWS` and `SHARED`; `howOf(key)` returns it for the condition. `stands()` replays the
  finding on the reader's own key, with the two fixes taken as a leg only when they are at most `LEG_MS` (one minute) apart, as for the zone.
  **Replayed, not proved**: a hostile record can carry two fixes with a plausible `aglFt` without having flown — the same level of trust
  as the other findings.
- **Texts** (four languages): `keyOverflight` (« s'ouvre au survol », NEVER the place), `openOverflightMe`, `openOverflightBy`.
- **Cases.** N80 (112 checks, 12 new) and N81 (104, 5 new): follows, finding (in the band, outside the radius, above, below, unknown
  height, `confirm`), stands, catch-up, hostile entries, `HOWS`/`SHARED`, the record; in flight with and without `confirm`, a source
  without ground height.

### 11.8 Hover judged in flight (SOG-0500, lot 4)

The workshop's `{ kind: 'condition', condition: 'hover', rule, fallbackMin }` (`holdRule` of `frame/lib/mission.js`, not modified) is a HOLD,
like the landing of § 11.6: the same `holding(key, hold, fix)` serves both, through a table `HOLDS` of `drawers.js` —
`{ landing: { spec: landSpec, ok: isDown }, hover: { spec: hoverSpec, ok: isHovering } }`, chosen by `howOf(key)` — and the same
`standsHeld()` (renamed from `standsLanded`) holds the honesty bound in `stands`. Nothing of the landing's hold was copied. `isHold(key)`
(exported) tells whether a key is judged by a hold; `drawers_view.js` uses it in place of the test on `'landing'`, and `finding()` and
`catchUp()` return `null` for any hold.

- **The rule** `{ kind: 'hover', at | object, radiusM, durationSec, maxGapSec, speedToleranceKt, heightMinFt, heightMaxFt, confirmation }`.
  `hoverSpec(key)` returns `null` (not judged) for: not a hover; neither a readable point nor a still object; `confirmation !== ''`; a number
  not finite; `radiusM <= 0`; `durationSec <= 0`; `maxGapSec < FIX_PERIOD_SEC`; `speedToleranceKt < 0`; `heightMinFt > heightMaxFt`.
- **A fix is hovering** when ALL hold: it is within `radiusM` of the point (or of the still object) AND `gsKt <= speedToleranceKt` —
  `arrived()` of `frame/lib/crossing.js`, called with `{ at, radiusNm: radiusM / 1852, speedMaxKt: speedToleranceKt }` and no `onGround`, so
  the distance test is the framework's, not a copy; `onGround === false` (in the air: `null` never counts, and neither does `true`); and
  `aglFt` is finite and within `[heightMinFt, heightMaxFt]`. The heights are heights ABOVE GROUND, as decided with Création.
- **The hold.** The condition is met after `durationSec` seconds in a row; two successive fixes are never more than `maxGapSec` apart
  (and `maxGapSec >= FIX_PERIOD_SEC`, as for the landing); any fix that does not hover, a longer gap, a fix without a time or an unknown
  datum resets it. The finding is `{ how: 'hover', at, from, to }`. In `stands`, both fixes hover by the reader's key, and the gap is
  `durationSec <= gap < durationSec + maxGapSec` — what an honest device writes. Replayed, not proved, as for the landing.
- **Only the simulator gives `aglFt`.** With the browser GPS, IVAO or VATSIM the condition is never met: the drawer opens at its fallback
  time or by the gesture. Trail points carry `aglFt`, but there is no catch-up anyway (one point per nautical mile).
- **No noise measurement is needed**: the simulator's positions are exact, and the pilot's drift is what `radiusM` measures.
- **Shared.** `'hover'` is in `HOWS` and `SHARED`; `howOf(key)` returns it; `follows(key)` accepts the hover.
- **Texts** (four languages): `keyHover` (« s'ouvre au stationnaire », NEVER the place), `openHoverMe`, `openHoverBy`.
- **Cases.** N80 (126 checks, 14 new: follows, holding in every direction — on the ground, unknown ground, too fast, out of the band,
  unknown height, out of the radius, too long a gap —, hostile entries, `stands` and its bounds, `finding` / `catchUp` null, `isHold`,
  `HOWS` / `SHARED`, the record) and N81 (107, 3 new: the texts, a hover held in flight, a source without ground height). The checks of
  the landing stay green: the generalisation changes nothing for it. The event (lot 3) waits for the ergonomist.

### 11.9 Sequence judged in flight (SOG-0500, lot 5)

The workshop's `{ kind: 'condition', condition: 'sequence', steps: [rule, …], fallbackMin }` (`frame/lib/mission.js`, not modified: one to
ten steps, each a `holdRule` whose `kind` is `landing`, `hover` or `overflight`, never a nested sequence) is judged by `drawers.js` from the
conditions already judged alone — nothing of them was copied.

- **A step is a key.** `stepKey(rule) = { kind: 'condition', condition: rule.kind, rule }` (exported); `follows`, `holding`, `finding` and
  `stands` work on these keys exactly as on the condition alone.
- **`follows(sequence)`** is true when there are 1 to 10 steps, every step key is accepted by `follows`, and NO overflight step has `confirm`
  true. A « Ask for what comes next » in the middle of a sequence is not judged yet: decided out of caution, so that the sequence keeps its
  fallback time or the gesture instead of waiting for a gesture that nothing asks for.
- **The order.** The state of a sequence is `{ i, hold, proofs }` — `i`: the step in progress (also: the number of steps done), `hold`: the hold
  in progress (landing or hover), `proofs`: `[{ how, from, to, at }]`, the findings of the steps done. `stepping(key, state, prev, fix) →
  { state, f }` (exported, pure, never throws; an unreadable `state` starts again from `{ i: 0, hold: null, proofs: [] }`) judges the step
  `i` only: `holding(stepKey, hold, fix)` for a hold, `finding(stepKey, prev, fix)` for an overflight. When a step is done its finding is
  pushed, `i` moves on and `hold` is reset. The fix that ends a step does NOT count for the next: one step per fix, and the previous fix is
  never used as the start of the leg of an overflight if it ended the step before. An interrupted hold starts again without losing the steps
  done. When `i === steps.length`, `f = { how: 'sequence', at (the last step's), from: proofs[0].from, to: proofs[last].to, steps: proofs }`.
- **`judgeKind(key)`** (exported) → `'hold' | 'steps' | 'leg'`: `drawers_view.js` calls `holding`, `stepping` or `finding` from it, and
  keeps the state of a sequence per drawer (`v.steps`) as it does `v.hold`. `isHold(sequence)` is false; `finding()` and `catchUp()` return
  `null` for a sequence (the trail has one point per nautical mile).
- **The record.** `'sequence'` is in `HOWS` and `SHARED`; `howOf` returns it. The finding carries `steps`: 1 to 10 proofs, each
  `{ how, from, to, at }`. Written (`withOpen`, `docOf`): `at` as ISO text, the fixes at full precision; refused by `withOpen` without
  proofs, with more than 10 or with an unreadable one. Read (`entryOf`): each `from` and `to` goes through the same `fixOf` / `fixRead`,
  `how` must be in `HOWS` (and neither `sequence` nor `hand`: no nesting), at most 10 proofs, `at` readable; a `steps` that is too long,
  empty, not an array or unreadable makes the whole entry unreadable (the drawer stays closed for that author), and so does a `sequence`
  without `steps`. An entry without `steps` is read as before: existing records are untouched.
- **`stands(e, key)`** for `'sequence'`: every proof `j` is replayed on the step key `j` of the READER (`stands({ how, from, to },
  stepKey(rule_j))`), the lengths are equal, and the proofs are in order (`Date.parse(steps[j].from.at) >= Date.parse(steps[j-1].to.at)`).
  Replayed, not proved, like the other conditions: a forged record that satisfies each rule in order stands; the honesty bound of a hold
  (`durationSec <= gap < durationSec + maxGapSec`) applies to each hold step.
- **Texts** (four languages): `keySequence` (« s'ouvre à la fin de ses étapes »: neither the number of steps nor a place, so that nothing of
  what the mission hides is said), `openSequenceMe`, `openSequenceBy`. The screen does NOT show the progress step by step.
- **Cases.** N80 (143 checks, 17 new: `follows`, `stepping` in order / out of order / interrupted hold / the fix that ends a step, hostile
  entries and states, `stands` and its bounds, `finding` / `catchUp` null, `judgeKind`, `HOWS` / `SHARED`, the record written and read, a
  hostile `steps`; two older checks that said « a sequence is not judged » now say it of an empty one and of `event`) and N81 (110, 3 new:
  the texts, a sequence done in flight, the same steps out of order). The event (lot 3) still waits for the ergonomist.

### 11.10 Tolerances of the user (SOG-0507)

The user's figures (19 Nov 2026) REPLACE the radius written in the mission file, only where he set them. Everything is in `drawers.js`
(`mission.js`, `crossing.js`, `module.js` and the editor are not touched).

- **Constants (exported).** `TRANSIT_NM = 2`, `AD_NM = 1`, `PRECISION = [{ tier: 'excellent', nm: 0.05 }, { tier: 'parfait', nm: 0.1 },
  { tier: 'réussi', nm: 0.2 }, { tier: 'partiel', nm: 0.5 }]` (frozen), `TIERS = ['excellent', 'parfait', 'réussi', 'partiel']`.
  `tierOf(distNm)` returns the tier, or `''` beyond 0.5 NM, for a non-finite or negative distance and for anything but a number. The bounds
  are INCLUDED: exactly 0.2 NM is `réussi`. The tier words are data identifiers; their text is translated in the view.
- **Where the tiers live (SOG-0516).** `PRECISION`, `TIERS` and `tierOf` now live in `frame/lib/precision.js` (with `AD_NM`, `FIX_PERIOD_SEC`, `landRule`, `landTier(rule, fix)` and `precisionLandings`, read by the mission report); `drawers.js` imports and re-exports them, nothing else changes. See `frame/INTEGRATION.md` § 12g.
- **Required stopover: 2 NM.** `stopsDone` reaches each `key.required` point at `TRANSIT_NM`, not at the arrival's `radiusNm`.
- **Arrival on an airfield: 1 NM.** Every `kind: 'arrival'` key is judged `{ ...key, radiusNm: AD_NM }` (`adKey`) in `finding`, `stands` and
  `catchUp`; speed and ground stay the key's rules.
- **Precision landing: tiers.** `landSpec` no longer reads `radiusM`: its `radiusNm` is the last tier (0.5 NM), so `isDown` counts the fix as
  down from `partiel`; its new field `tiered` is true off an airfield. When the target is an airfield of the route (`rule.point` is `ORIGIN` or
  `DESTINATION`) the radius is `AD_NM`, `tiered` is false and nothing carries a tier. `holding`, `standsHeld` and the steps of a sequence
  (`stepKey`) use `landSpec`, so all follow. The hover, the overflight, the object and the zone keep the author's radius. A polygon has no
  position: no tier.
- **The finding and the record.** The finding of a tiered landing carries `tier` and `distNm` (distance of the fix `to` to the target,
  taken from `arrived().distNm`, rounded to 0.001 NM); in a sequence the proof of a landing step carries them too. `withOpen` / `docOf` write
  them when they exist; `entryOf` / `proofOf` read them bounded (`tier` in `TIERS`, `distNm` a finite number from 0 to 0.5) and give `null`
  for anything else; an old finding without tier reads as before.
- **At the reader's.** `stands` replays a landing on the READER's key at the tier radius. The tier shown is the one the reader recomputes
  from `e.to` (`replayTier(e, key)`, exported; `state.tier` and `state.distNm` of `stateOf`), never the `tier` another pilot wrote.
- **View.** `openLandingTierMe` / `openLandingTierBy` say the tier and the distance (« ouvert à votre atterrissage — réussi (0,15 NM), à … »;
  two decimals, the language's separator through `TX.decSep`); without a known tier the earlier sentences stay. `record` passes `tier` and
  `distNm` on to `withOpen`.
- **Not used yet.** The tier only serves the drawer's line and the finding (Q-0117).
- **Cases.** N80 (162 checks, 19 new: every threshold just inside and just outside — `tierOf`, the stopover at 1.99 / 2.01 NM with a file
  radius of 0.5 or 5 NM, the arrival at 0.99 / 1.01 NM with a file radius of 0.2 or 3 NM for `finding`, `stands` and `catchUp`, the landing
  at 0.15 / 0.51 NM with `radiusM` 10 m or 5 000 m, the airfield at 0.9 / 1.1 NM, the record bounds, `replayTier`, the sequence proof) and N81
  (114, 4 new: the line in French, English, German, Spanish, without a tier, and end to end). Three older checks changed to follow the rule:
  the hostile record (entries now carry `tier: null, distNm: null`), the landing « fix outside the radius » (445 m for 300 m became 2 224 m
  for the airfield's 1 NM) and the sequence « unreadable step » (a zero `radiusM` is no longer read: a zero `durationSec` instead).

### 11.11 Debrief (SOG-0516, lot B)

A block « Débrief » in the sheet of MY mission: one line per precision landing judged, mine and the crew mates'. Nothing is written; it
reads what the section already computes (`drawers.js`, `drawers_view.js`; `frame/lib/precision.js` is imported, not touched).

- **The datum.** `debriefOf(states)` takes the states of `stateOf` and returns `[{ rank, how: 'landing', tier, distNm, at, by, mine }]`:
  `rank` is the place of the drawer in the suite (1 for the first), `at` the hour of the fact, `by` the trigram, `mine` true for my own
  landing. Ordered by `at` (then rank). A landing on an airfield (no tier), a drawer opened by hand, another condition, a closed drawer:
  no line. Never a place, never a point identifier, no score. Pure; it never throws (a hostile entry is left out: a tier outside `TIERS`,
  a distance outside 0 to 0.5, an unreadable hour).
- **The proofs.** `stateOf` now gives each open drawer `lands: [{ at, tier, distNm, by, mine }]`, from every opening kept for it (mine and
  the crew mates', never one under a lock): a landing finding gives one line, a sequence gives one per landing step with the hour of the
  step. The tier is RECOMPUTED on the reader's rule (`landTier` of `frame/lib/precision.js`, on the reader's key, or the key of the step of
  the same rank), never the `tier` written in the record; a proof that does not stand on the reader's key (`stands`) gives no line.
- **The screen.** Under « Suite de la mission », a title « Débrief » and a list that reuses the blocks of the section (`h3`, `dw-list`,
  `dw-row`); present only with at least one line (so after a drawer opens), at every level from the first, withdrawn by `stop()`. The line:
  « Tiroir 2 — atterrissage réussi (0,15 NM), à 19:20Z », followed by « — BBB » for a crew mate; the tier words are `TIER_TEXT`, the
  separator `TX.decSep`, the hour `fmtZ`. `debriefLine(tt, line)` is the pure text, in the four languages.
- **Cases.** N80 (169 checks, 7 new: the three landings in order, the lying tier of a crew mate recomputed, the proof off my key, the airfield,
  no drawer open or under a lock, hostile entries, no place), N81 (119, 5 new: absent without a landing, present with two lines, level 1,
  `stop()`, the exact text in four languages) and the screen case N181 (390 and 1280 px, four languages, invented data).

## 12. Assigning a mission from V3 (SOG-0443)

The user's word (Q-0093, 18 Nov 2026): yes to a minimal gesture to assign from V3; the CPCO's redesign waits. No compatibility with
V2 is owed (it was never used); the line written is the shape the V3 readers already read, nothing more. The pure part is
`modules/missions/assign.js`, the screen `modules/missions/assign_view.js`, called by `drawers_view.js` `show()` / `stop()` (one import,
one call in each) — not by `module.js`.

- **The screen.** « Affecter… » is a button posed by the DOM at the END of the place `[data-actslot]` of the sheet's actions row
  (after « Demander la suite » when it is there), at every drawing of the sheet, for EVERY mission read, at the Current level and above
  (`ctx.level >= 2`; none at the Discovery level, none when the level is unknown); `stop()` removes it; no sheet, no button. It opens
  « Affecter cette mission » in the place of the sheet (the attribute `data-assigning` on `.ms-sheet`: on a phone the first page and
  the Detail are hidden; on a wide module the first page stays on the left and the form takes the column of the Detail; « ← Fiche » on
  a phone, « Annuler » everywhere close it). Seven elements at most: the assignments of this mission (one line per NOT cancelled line,
  « ABC · TEST31 · décollage 20:00Z · EC25 F-TEST » and « Retirer »; beyond seven, « {n} autres »), Pilote, Indicatif, Décollage (UTC),
  Aéronef, « Affecter » and « Annuler ». No help line under a field: « immatriculation (facultative) »
  is the placeholder of the field.
- **The fields.** Pilot: an input with a `<datalist>` of the trigrams that have a pilot's folder (`ctx.data.list('pilot/')`, read by
  pattern as `frame/help/signaler.js` does; 400 at most), any three letters accepted (`/^[A-Z]{3}$/` after upper-casing, the rule of
  `assigned.js`). Callsign: `/^[A-Z0-9-]{2,12}$/i` (`assigned.js`). Take-off: a date and a time field read in UTC
  (`Date.parse(`${date}T${time}:00Z`)`, the way of `modules/atmosphere/screen_flight.js`; two fields as `modules/report/module.js`); a
  date that does not exist (31 February) is refused, never moved to the next month; default: today, the next round hour, UTC. Aircraft:
  a `<select>` of the types of the mission's VISIBLE part (`pilotView(mission, [], { mine: false })` of `frame/lib/mission.js`; « — »
  for a mission without a type: the line then goes without a type) and a free registration, optional (`/^[A-Z0-9-]{1,10}$/i` after
  trimming), no fleet check. The departure is the mission's visible ICAO (the whole text must be four signs), not a field. An empty or
  refused field: « Affecter » says which by a floating `warn` notification; nothing is written.
- **What is written** — `missions/affectations.json`, `{ updatedAt, assignments: [line…] }`; one line:
  `{ mission, title, pilot, callsign, takeoff, departure, aircraft: { type, registration }, status: 'affectée' | 'annulée',
  role: 'mission', updated_at, by }` — `takeoff` and `updated_at` in ISO UTC, `by` the device's trigram validated as `bookPath` does
  (none: nothing is written), `title` the visible title (120 signs), `departure` the visible ICAO or `''`. Every line built is READ
  BACK by `mine()` (`assigned.js`, « Mes missions affectées ») and `seanceOf()` (`drawers.js`, the play of the drawers) before it is
  written: a line they would not read as it is is not written. Nothing of a closed drawer enters the form or the line.
- **The key and the merge.** The key of a line is `mission + pilot + role`; it never changes on a line (changing the pilot = withdraw
  one, assign the other). Every write re-reads the file (`ctx.data.get`), replaces OR appends its own line by that key (in place), keeps
  every other line and every other top-level key AS IT IS (never re-read into another shape, never rewritten), sets `updatedAt`, writes.
  `module.js` declares, before `{ prefix: 'missions/', merge: 'record' }`,
  `{ prefix: 'missions/affectations.json', merge: 'keyed:assignments:mission+pilot+role' }` — the longest prefix wins (`ruleOf` of
  `frame/store/frame_data.js`), and the frame's data layer registers the rule at start-up for every module (V3 Frame; its SHA will be
  quoted when it is pushed). With it, two devices that each add a line to the same base keep BOTH lines; a line changed on both keeps
  the most recent and the other goes to the conflicts. With `record` (the rule of `missions/` before this batch), the whole
  `assignments` array of the most recent device won and the other line was lost — the bench shows both. The key is the one of
  `tools/data_sync.py` (`mission|pilot|role`).
- **Conflict, said, never blocking.** At the first « Affecter », if the pilot already has a NOT cancelled line of ANOTHER mission whose
  take-off is LESS than two hours from this one (two hours exactly: no conflict), a floating `warn` notification says — no box, no mark
  in the form (the user's rule: warnings go by the floating notification, never twice) — « ABC a déjà une mission à cette heure :
  X-901A, décollage 19:40Z. Vous pouvez affecter quand même. »; a second « Affecter » writes. The same pilot already on THIS mission (a
  line not cancelled): « Affecter » updates his line (same key) and the notification says « ABC : affectation mise à jour ».
  After a write: the list is updated, the fields are emptied (the type kept), « ABC est affecté à X-905A, décollage 20:00Z. ».
- **« Retirer ».** The line gets `status: 'annulée'` and a new `updated_at` — never deleted; it leaves the list; « ABC n'est plus
  affecté à X-905A. ». No confirmation: the line is assigned again in two gestures (the same key becomes « affectée » again).
  « Retirer » writes `by` = the trigram of the device that withdraws (validated as for « Affecter »; none: nothing is written, an `err`
  notification says so) and keeps the former `by` in `assigned_by` when it validates (absent otherwise); nothing else of the shape read by
  `mine()` changes (Sécurisation, 18 Nov).
- **Untrusted inputs.** Any pilot writes the repository, so the file read may be hostile: every key read by `own()` (never an inherited
  key, `__proto__` kept as data), texts bounded and cleaned, every text shown escaped (`esc`), at most 2 000 lines read — beyond, nothing
  is written and an `err` notification says so (the lines of others are never cut); the JSON text is capped at `MAX_SIZE` = 1 000 000
  signs, for the file read AND for the file to write (`MAX_LINES` bounds the number of lines, not their size: a giant line of another
  pilot would be copied at every assignment) — beyond, the reason is `size`, nothing is written, the same `err` notification; an unreadable file, another shape, a line that
  throws or a file that does not serialise again: nothing is written, said by an `err` notification. No path is ever built from a value
  read; the only document written is `missions/affectations.json` (and `ctx.data.sync()` is asked right after, as `drawers_view.js`
  does). No new timer.
- **Limits, said.** No rights and no availability check (the airline's organisation); a pilot of the airline can assign or withdraw
  anyone. The pilot of the line is a trigram, not an account.
- Cases: N88 (the bench `modules/missions/test/assign.html`, 59 checks: the input, the line read back by `mine()` and `seanceOf()`, the
  key, the withdrawal, the conflict under two hours, the list, the hostile files, the merge of two devices through
  `frame/store/frame_data.js` and its counter-proof with `record`), N89 (the screen, four languages: no button at the Discovery level,
  the button, the form, the conflict said by a notification then assigned anyway, the line read in the store, the list, the notification, XYZ assigned,
  « Retirer », the device of ABC that finds X-905A in « Mes missions affectées » only while the line is not cancelled). The view bench
  `modules/missions/test/assign_view.html` (48 checks) is played by the session.
