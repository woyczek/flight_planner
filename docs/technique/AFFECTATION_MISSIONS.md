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
- **The others' records arrive by a synchronisation pass asked once a minute, bounded** (the ergonomist, 17 Nov): only while the first
  closed drawer is awaited (a key judged in flight) AND the section is on screen AND the mission has other pilots; it stops when the
  drawer opens; it is **paused while the page is hidden** (a hidden tab, a sleeping device) and resumes with a pass at once when the
  page comes back. The pass is the module's background pass (`ctx.data.sync()` without `gesture`, never a gesture on a timer); its
  cost is one pass a minute per waiting device — on a device without launcher, one request to the repository's API per pass.
- **« reçu ici à … »**: an opening of another pilot received more than a minute after the fact says so — « ouvert au passage de la
  zone par BBB, à 20:14Z — reçu ici à 20:16Z » (the device keeps the time it first saw it, `got` in the « seen » document). No delay
  is promised in figures on screen (the ergonomist, 17 Nov, 19 h 32).
- **The delay, measured on a bench with two devices** (17 Nov 2026: two trial launchers, each on its own clone of an invented data
  repository, a local bare git repository as the remote, no network): the gesture on device A is committed and pushed **about one
  second** later (the view asks for a pass right after the write); on device B a pass takes **about half a second** and brings the
  record, which the section shows at once. With only a re-reading of the files (`data.revalidate`) device B had **nothing after 90
  seconds**: on a workstation with a launcher, re-reading does not exchange with the repository, and the opening would have come
  with the background pass (every ten minutes) — hence the pass. End to end with the pass asked every minute: **47 seconds** in the
  trial; the bound is one period (60 s) plus the exchange. **Not measured**: a real remote over the network (each exchange then takes
  the time of a git fetch and push), a device without launcher, the load beside the simulator (one short git exchange a minute). A
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
- Cases: N80 (70 checks: `follows`, `finding`, `stands`, `catchUp`, the fixes of a record), N81 (64: the subscription, the three
  states, the catch-up, the flight of another mission), N83 (the sheet with a simulated launcher and simulator: followed, crossed,
  in range and « Objet en vue », the arrival; 390 and 1280 px, four languages).
