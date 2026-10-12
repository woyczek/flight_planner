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
