# Missions — specification (V3, first cut, 30 Oct 2026)

Written by the ergonomics session from § 10.32 of `docs/technique/V3_SPECIFICATION.md` and the survey of the V2
mission files of the same day. Status: lots 1 and 2 reduced built (31 Oct 2026: `frame/lib/mission.js`, `modules/missions/module.js`,
Fuel's door; cases N1–N4); the user asked for the initial module, minimal, as urgent: list, choose, draw, prepare the flight; the
summary is flat (no envelope, no reader, no assignment, no « affectée » state, no filter by aircraft category); § 5–6 later. Owner of the code: Features SOG.

## 1. Purpose and scope

The suite's purpose is playing missions as a crew (the "group mode", alive). This module is its first step: a pilot
**sees the airline's missions, chooses one or draws one at random, and hands it to Fuel as the source of the flight**.
Everything else of the crew module (assignments by the CPCO, the crew's rendezvous, the exercise folds) comes after,
on the same data. The CPCO (authoring) stays V2 until rebuilt as the third application.

## 2. Data: the V2 missions, read as they are

- The missions already live in the shared data repository: `missions/<LETTER>_<FAMILY>/<ID>/mission<ID>.yaml`
  (+ `summary<ID>.md`, `cartes/`, `recu/`, `versions/`, `affectations.yaml`), indexed by `missions/mission_registry.yaml`
  and `missions/affectations.json`. **The module reads these files; it never writes a mission** (one author, the user,
  through the V2 CPCO; the numbering `<family letter>-<3 digits><team letter>` is the reference, `former_id` kept).
- **A tolerant reader**, `frame/lib/mission.js` (pure, benched on the three real shapes: minimal `M-001`, complete
  `A-001A`, organisation `…Z`): nothing is mandatory but `mission.id` and `mission.type`; `origin` / `destination`
  may be missing (then the base of the assignment, else none); the ICAO code is parsed from `origin.name`
  ("BA 118 Mont-de-Marsan (LFBM)"); units are those of the files (degrees, minutes, kt, "FL240" / "1500 ft",
  "H+1h30mn" through the existing `hOffset`). The YAML is read by the frame's YAML reader (the one of the registry),
  never a second parser.
- **One index, read once**: the module reads `mission_registry.yaml` for the list (id, family, title, operation,
  aircraft types, origin, destination, estimate, maps) and the mission file only when one is opened. The registry's
  IndexedDB / localStorage copies of V2 are not reused: the frame's data layer is the cache.
- An organisation mission (`…Z`) is never listed as a flight: it is the exercise's envelope of its A, B, C…

## 3. The list: choose, or draw

- One screen, the module's main: the missions of the airline, newest series first, grouped by family (the sixteen
  families of the generator prompt, their letter and their name, never hard-coded twice: read from the registry),
  seven rows then "N autres", a search (id, title, aerodrome, type), a filter by family and by aircraft category.
- **Each row**: id, title, family, origin → destination, aircraft type, estimated block, and the pilot's own state —
  "volée le …" from the flight log (a report of `cr/reports/` whose `metadata.missionId` is this id, written by this pilot or
  without author; case N2), "affectée" from `affectations.json` when a line carries this pilot's trigram (later, with § 6).
  Nothing else. The list, the order, the families, the search and the family filter: case N2.
- **"Choisir"** on a row opens the mission (§ 5) with "Préparer ce vol"; **"Tirer au sort"** at the top draws one
  mission among those **not yet flown by this pilot** and matching the current filters, shows it the same way, and
  offers "Tirer encore" (one more draw) — never a silent auto-start. The draw is uniform; no weighting. Every mission of the
  filter flown: said in a notification, nothing drawn. Case N3 (lot 2: the mission is shown as a flat summary — title,
  operation, route, aircraft, estimated block, summary, notes — until the reader of § 5).
- Below Complet, the list is read-only in the same way; the module needs no level to choose.

## 4. From the mission to the flight: `missionFlight(mission, assignment?)`

Pure function of `frame/lib/mission.js`, benched, one output shape consumed by Fuel through its "Nouveau vol :
depuis une mission" gesture (the same door as the OFP, § 10.32 of the specification):

| field | from the mission | rule |
|---|---|---|
| `route.dep` | `origin.name` ICAO | else the assignment's `departure`, else none (the pilot types it) |
| `route.arr` | `destination.name` ICAO | else `origin` (return to base), else none |
| points | `route_order` resolved on `turning_points`, `rendezvous`, `target`, `zones` | the order of the file; a zone gives its centre; written in the route text as ICAO coordinates to the minute (`4445N00115E`): a mission's names (PT1, TARGET) would be looked up in aerodb first, where a real point of the same name wins (DECISIONS, 31 Oct) |
| aircraft | `aircraft[0].type` ICAO designator | the assignment's registration when it exists |
| level, speed | `cruise_level`, `cruise_speed_kt` | as written; Fuel's sheet wins when the type has one |
| rendezvous time | none in the file | derived: assignment `takeoff` + cumulated leg time to the RDV (`MissionEstimate` legs); shown as "estimé" until a **dated rendezvous** exists (new field of the assignment, § 6) |
| constraints | `payload.constraints`, `risks`, `notes` | free text, shown in the mission, never parsed |
| mission id | `mission.id` | written on the flight (`flight.mission`) so the report and the log know it |

Fuel writes the flight; the module writes nothing. What the mission does not carry (runway, procedures, FPL, fuel,
weather) is Fuel's as for any flight.

**Fuel's door** (lot 2): « Préparer ce vol » is the address `#fuel?mission=<id>`, consumed by Fuel once its current flight is
read. Fuel reads the registry and the mission file, then: a started flight is never replaced (said); a flight with a route or an
aerodrome is replaced only after the frame's question; the route, its procedures and the OFP are cleared, the level and the aircraft
type set (the aircraft of the flight is kept when it is already of that type, else the type's sheet, else the type alone), and
`flight.mission` written (a field of Fuel's in `current_flight.json`). Case N4.

## 5. The envelope and the page-by-page reader: two primitives, simplified (user, 30 Oct: "le bookify peut
probablement être simplifié")

V2's `bookify()` paginates by measuring overflow, inserts blank pages so that the last page falls on the left, builds a
turning leaf with a recto and a verso, carries a bookmark that turns with the page, and reads its geometry from
twenty `--pm-*` variables per design. Most of it exists to imitate paper. The V3 primitives keep what the reader
needs and drop the imitation:

- **Pages are sections, not measurements.** A mission is cut into pages by its content, once, in a pure function
  (`pagesOf(mission)`: cover, title and order, details, maps two per page, final part, folds); a page that is too long
  **scrolls inside its frame**, it is never re-cut by measuring the screen. No blank page: the spread shows the last
  page alone on the left when the count is odd.
- **One component, two layouts.** `book(pages)` shows a two-page spread above 760 px and one page below (and on the
  phone); the same pages, the same order, the same controls: two corners as buttons, swipe, ← → and Page keys. The
  current page is in the address (`#missions?id=M-016A&p=3`), so back, forward and a reload land on the same page.
- **Turning is a transition, not a leaf.** One CSS transition of the page (slide or fade by design token); no
  recto / verso element, no clone of the content; `prefers-reduced-motion` makes it instant. The textured skins keep
  their images (open book, page, corner, seal, bookmark) as **backgrounds through tokens** (`--book-*`, a dozen at
  most: ratio, padding, ink, font, page images); the geometry is the component's, not the design's.
- **The bookmark is a tab.** A fixed tab "Plis" goes to the folds section and back; it does not move with the pages.
  The folds keep V2's rule (sealed until their hour, opened by a tap with a two-step confirmation before the hour,
  "Resceller"), implemented by the module on top of `book()`, not inside it.
- **The envelope is a cover.** `envelope(label, { sealed })` draws the closed folder with its label (number, title,
  aircraft, callsign, takeoff when assigned) and one gesture, "Ouvrir", that breaks the seal and opens the book at
  page 1; the opening animation is one transition by design, the plain skin has none. Reading state ("lu") is the
  module's, written once on "Ouvrir".
- **What the skins may do**: colours, fonts, background images, the transition's kind and duration. **What they may
  not do**: change the pagination, the controls, the order or the address. A design without textures gets the
  plain skin for free.
- Target size: the two primitives under 400 lines together, benched (pagination, address, keys) without a browser
  for `pagesOf`, and one case per layout for `book()`.

**Light first, full as a layer (user, 30 Oct: "c'est fort simplifié ; chacun de ces petits gestes a coûté des
tokens et a un vrai effet skeuomorphe ; probablement deux versions, une light que je testerai, une full plus
lourde mais terriblement réaliste" — counter-proposal of the ergonomics session, retained: one reader, two
skins, never two components):**
- The **light** version is the component itself (sections, controls, address, plain skin): built and tested first.
- The **full** version is a visual layer on top of the same component, opted in per design: the turning leaf with its
  recto and verso, the seal's opening animation, the bookmark that moves with the page, V2's images and gestures
  reused as they are (`shared/deco/<design>/mission-*.webp`). It may add visuals; it may not change the pagination,
  the controls, the order or the address. Without the layer, or under `prefers-reduced-motion`, the light reader is
  whole. The cost of V2's gestures is kept, on a base written once.

## 6. The assignment in V3 and the crew's rendezvous (second step)

The V2 assignment (`affectations.yaml` in the mission's folder, one line per participant in
`missions/affectations.json`, written by the CPCO's ODV matrix) is the carrier of everything that is decided for a
crew. V3 reads it as it is and adds to it; the mission file stays immutable.

- **Shape read as it is**: `{ mission, updated_at, by, h_hour, participants[]{ pilot (trigram), callsign,
  aircraft{ registration, type, variant, base }, departure (ICAO), takeoff (ISO UTC), ferry|null, block_min,
  status }, alert }`. Status today is "affectée" only; the planned ones (proposée, confirmée, déclinée, volée,
  annulée) are kept as the model, with the V2 rule: **an assignment is an order, the pilot acknowledges reading, there
  is no acceptance**. "volée" is derived from the flight log (a report carrying the mission id), never written by hand.
- **Added, per operation (the Z's h_hour when there is one) or per mission**:
  - `rendezvous_at`: the **dated rendezvous**, ISO UTC, or `H±n` relative to the exercise's `h_hour` (the existing
    `hOffset` rule), the first fixed constraint of the route (§ 4); when absent, Fuel derives it from `takeoff` and
    the leg times and says "estimé".
  - `meet[]`: the **channels of the crew**, each `{ kind, label, url?, value? }` — kind in a closed list read from
    the CPCO's catalogue (discord, srs, joinfs, teamspeak, other), label free ("SRS 243.0 — Air Inter VA"), `url` for
    a link (Discord invite, JoinFS session), `value` for a thing to copy (server, frequency, code). The module shows
    them on the cover page with "Ouvrir" for a URL and "Copier" for a value; the pilot never types them.
  - `briefing[]`: optional named links (OFP, chart pack, exercise doc) already allowed by V2's `exerciseDocs`; same
    rendering.
- **Who writes**: the CPCO (V2 today through the ODV matrix, V3 later); the module and the pilot write nothing in
  the assignment. The "lu" of V2 (`assignmentsRead:v1`, local) becomes the device's own record (`policy: 'cache'`),
  with the `read_at` the V2 document planned but never wrote: written once on "Ouvrir".
- **Access model, said**: the assignment is repository data readable by every pilot of the airline (the fleet's
  model, audit line 63). A meeting password in `value` is readable by all of them: a known limit, stated in the
  help ("réservez les mots de passe de session au salon lui-même"), not a reason to build accounts.
- **Rule for the list (§ 3)**: a mission assigned to this pilot with a `rendezvous_at` in the next seven days comes
  first in the list, marked "affectée · RDV ven. 14:30Z"; the draw never picks an assigned mission.
- **Exercise**: an operation's participants take off at `h_hour` + their offset (the Z's `exercise.participants`),
  as in V2; the folds open on the same clock. The V3 module reads the Z for its own mission's offset and nothing else.

## 7. Out of scope here

Authoring and assignment (CPCO V3), availabilities and the ODV planning, the report's mission families (already in
the Report module), a weighting of the draw, mission categories of a commercial VA (`airline/settings.json` `kind`,
rule of § 10.32, no category exists yet).

## 8. Lots, in order

1. `frame/lib/mission.js`: reader + `missionFlight`, benched on the three real shapes rebuilt with invented names and
   positions (no AIP content, no mission of the user's data in the repository); checked once, locally and read-only, on the
   user's 59 missions (M-001 → its aircraft from `teams`, the minimal shape has no `aircraft` block). **Built**, case N1.
2. The Missions module: list, filters, Choisir, Tirer au sort, "Préparer ce vol" through Fuel's door; cases of a new
   area; help ×4. **Built reduced** (31 Oct 2026), cases N2–N4: a flat summary instead of the reader, no assignment, no filter by
   aircraft category.
3. The two design primitives `envelope()` / `book()` with the plain skin, then the textured skins per design.
4. The usage "équipier" (frame) and the Map's drawing of a mission (points, zones, RDV).
5. The crew's rendezvous in the assignment (after the CPCO decides its shape).
