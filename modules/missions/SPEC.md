# Missions — specification (V3, first cut, 30 Oct 2026)

Written by the ergonomics session from § 10.32 of `docs/technique/V3_SPECIFICATION.md` and the survey of the V2
mission files of the same day. Status: **draft for the user's review; no code**. Owner of the code: to be named.

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
  "volée le …" from the flight log (a report whose `mission` is this id), "affectée" from `affectations.json` when a
  line carries this pilot's trigram. Nothing else.
- **"Choisir"** on a row opens the mission (§ 5) with "Préparer ce vol"; **"Tirer au sort"** at the top draws one
  mission among those **not yet flown by this pilot** and matching the current filters, shows it the same way, and
  offers "Tirer encore" (one more draw) — never a silent auto-start. The draw is uniform; no weighting.
- Below Complet, the list is read-only in the same way; the module needs no level to choose.

## 4. From the mission to the flight: `missionFlight(mission, assignment?)`

Pure function of `frame/lib/mission.js`, benched, one output shape consumed by Fuel through its "Nouveau vol :
depuis une mission" gesture (the same door as the OFP, § 10.32 of the specification):

| field | from the mission | rule |
|---|---|---|
| `route.dep` | `origin.name` ICAO | else the assignment's `departure`, else none (the pilot types it) |
| `route.arr` | `destination.name` ICAO | else `origin` (return to base), else none |
| points | `route_order` resolved on `turning_points`, `rendezvous`, `target`, `zones` | the order of the file; a zone gives its centre; ids kept as point names (PT1, RDV-1, TARGET) |
| aircraft | `aircraft[0].type` ICAO designator | the assignment's registration when it exists |
| level, speed | `cruise_level`, `cruise_speed_kt` | as written; Fuel's sheet wins when the type has one |
| rendezvous time | none in the file | derived: assignment `takeoff` + cumulated leg time to the RDV (`MissionEstimate` legs); shown as "estimé" until a **dated rendezvous** exists (new field of the assignment, § 6) |
| constraints | `payload.constraints`, `risks`, `notes` | free text, shown in the mission, never parsed |
| mission id | `mission.id` | written on the flight (`flight.mission`) so the report and the log know it |

Fuel writes the flight; the module writes nothing. What the mission does not carry (runway, procedures, FPL, fuel,
weather) is Fuel's as for any flight.

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

## 6. The crew's rendezvous (after the first step)

- An assignment (`affectations.yaml`, written by the CPCO — V2 today) gains, per participant or per operation, the
  **rendezvous of the crew**: a dated time (absolute UTC or `H±n` of the exercise) and the channels — Discord
  (link), SRS (server, frequency), JoinFS (session), others by name — **filled at assignment, never typed by the
  pilot**. The module shows them on the mission's cover page with "Ouvrir" (a link) and "Copier" (a value).
- Rule: these are assignment data of the shared repository, readable by every pilot of the airline (the fleet's
  access model); a session password is a known limit, said here, not a reason to build accounts.
- The folds (`events[kind:'pli']`) open at their hour as in V2, through the same `book()` bookmark.

## 7. Out of scope here

Authoring and assignment (CPCO V3), availabilities and the ODV planning, the report's mission families (already in
the Report module), a weighting of the draw, mission categories of a commercial VA (`airline/settings.json` `kind`,
rule of § 10.32, no category exists yet).

## 8. Lots, in order

1. `frame/lib/mission.js`: reader + `missionFlight`, benches on three real shapes copied into fixtures (no AIP
   content involved).
2. The Missions module: list, filters, Choisir, Tirer au sort, "Préparer ce vol" through Fuel's door; cases of a new
   area; help ×4.
3. The two design primitives `envelope()` / `book()` with the plain skin, then the textured skins per design.
4. The usage "équipier" (frame) and the Map's drawing of a mission (points, zones, RDV).
5. The crew's rendezvous in the assignment (after the CPCO decides its shape).
