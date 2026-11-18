# missions — the editor: decisions

The decisions of the mission editor written by the session « Création de missions » (owner, since 17 Nov 2026, of
`editor.js`, `editor_texts.js`, `add.js`, the mock-ups and `frame/lib/mission.js`). The earlier decisions of the editor
(SOG-0287, the six steps, audits 182 to 194) are in [DECISIONS.md](DECISIONS.md); the format of a mission file for its
drawers is in [docs/technique/FORMAT_MISSION.md](../../docs/technique/FORMAT_MISSION.md).

- **17 Nov 2026 — the references follow the places** (SOG-0439; the ergonomist: « Renommer un lieu suit partout ; retirer un
  lieu encore cité est DIT (lesquels le citent) et demande un geste ; rien n'est réécrit si rien ne change »). A place is
  cited by its identifier in `route_order`, `phases[].trigger_point`, `phases[].route_order`, `maps[].centre_ref` (or
  `center_ref`), the `place` of an event of the timeline, `vertical_profile.route` and `alert.phases[].route`. The editor
  renamed or removed a place in its own list and left every one of them as it was.
  - **One walker**, `mapRefs(doc, fn)` (private): every reference goes through `fn(word, where, name)`; `refsOf`,
    `citedBy`, `deadRefs` and `withRefs` are built on it, so a new kind of reference is added in one place. Identifiers
    are compared without case and cut at « / » (the V2's rule, `shared/mission_estimate.js`); a route may hold `{ id }`
    objects; only the changed fields are new objects (audit 182: nothing changed, the very same document).
  - **`withRefs(doc, base, rows)` is the LAST retouch**, after every step (`edDoc` in module.js). The steps keep their rows
    on screen (the timeline's events, the proposed maps) with the identifiers the file had: applied inside `withPlaces`, a
    rename was undone by `withEvents` a moment later. The fate of each place of the file — renamed, kept, removed — is
    read from the rows of the Lieux by its kind and its place in the file (`i`), never by its name.
  - **Removing a reference**: a word leaves a route list; a part loses its `trigger_point` and KEEPS its
    `trigger_delay_min`; a map keeps its entry with `centre_ref: ''`; an event keeps its text (without one it goes). The
    kept delay and the empty centre are the traces « À compléter » reads from the file alone, in this sitting and in the
    next ones (`drawerNoPoint`, `mapNoCentre`): no state beside the file. First written « the delay goes with the point »;
    changed for that reason. A part without delay nor point opens by the pilot's gesture, on purpose: it is not said.
  - **A reference already dead in the file is never rewritten** (audit 182) — it is said (`deadRef`). A reference that
    names nothing and that the file did not carry (a place added, cited, then removed in the same sitting) goes. A word of
    the vertical profile (« FL100 ») and a map's centre that is not a place of the file (the Map accepts a name) are not
    judged.
  - **« Retirer » in two presses** (`removePlace`, pure; module.js only calls it): a place nothing cites goes at once; a
    place still cited stays at the first press — a floating notification says who cites it (`editor_texts.js`
    `citedText`), the button becomes « Retirer quand même » — and goes at the second.
  - **A new place never takes an identifier the file still carries** (`nextPlaceId`): counting the rows gave « PT2 » twice
    after a removal, and « PT1 » again after a rename — the one case where a reference could no longer tell its place.
  - **Known limit**, said: two places that swap their identifiers in one sitting — the references of the file follow
    THEIR place; a row chosen on screen after the swap may name the other one.
  - **Not followed**: the events of an organisation mission (…Z) that cite the places of another file.
  - **Measure** (17 Nov, read-only, the 102 missions of the user's workstation; counts only): 97 carry references (66 in
    routes, 308 map centres, 293 profile words), none is dead, and `withRefs` gives every document back unchanged.
  - The editor's own texts written by this session live in `editor_texts.js` (four languages); those of the six first
    steps stay in module.js. N70 (red before: the route kept « PT1 », « Retirer » removed a cited place at once).
  - **The ergonomist's three retouches on the captures** (17 Nov at 18 h 45): (a) « À compléter » NAMES — « le tiroir B n'a plus son
    point de déclenchement (il ne s'ouvre plus qu'à la main) », « la carte detail_rdv_1 n'a plus de centre », « la route de la mission
    cite GHOST, un lieu qui n'existe pas » — `todo` gives `vars`, `editor_texts.js` `todoText` writes the line, three at most per kind;
    (b) « Retirer quand même » sits exactly where « Retirer » was, so it is inert for a second (`REMOVE_ARM_MS`, in `removePlace`): a
    double press removes nothing unread; (c) the notification stays until its cross or the second press, which replaces it (one
    `key`) by « RDV-1 retiré, avec ses citations ». On a phone « À compléter » is not on screen (the validated mock-up): the marks of
    the steps carry it.
- **17 Nov 2026 — the reader of the drawers** (SOG-0440; `frame/lib/mission.js`, no screen; the format and what the reader gives:
  [FORMAT_MISSION.md](../../docs/technique/FORMAT_MISSION.md)). The contract is the one of the user's authoring workshop (« Mission
  Editor 1.0 », read on 17 Nov; SPEC_MISSIONS_TIROIRS § 10.3), which the ergonomist made the reference at 18 h 27.
  - **Two ways of writing a zone and an object, both read; one shape given.** By identifier (`zones`, `objects` at the top: the
    workshop) or inside the part (this editor will write there: the V2's technical sheet shows every unknown top-level key, only
    `phases` is hidden). The key always carries the resolved geometry, so the pilot's screen and the frame's detection never depend
    on where the file puts it — nor on the user's answer to Q-0095.
  - **Never clamp.** A mandatory number out of its bounds makes the key unreadable (`keyWhy`), and the drawer opens by hand or at
    its fallback hour: a zone shrunk into its bounds would be another zone. An optional one (ceiling, heights, fallback) is not
    read. The bounds are the workshop's (3 to 100 vertices, 500 km, 100 NM, 60 000 ft).
  - **`fallbackMin` sits in the key**, on every kind but the hour — also on `hand`, so that a key this reader cannot read (the
    workshop's 1.1 conditions: hold, landing, sequence, overflight, event) still opens at the hour the author gave.
  - **The workshop's 1.1 conditions are read bounded, never judged** (the ergonomist, 17 Nov at 18 h 42: « lues bornées, gardées,
    dites « pas encore jugées en vol » ; une sorte inconnue n'est jamais une erreur »): `hover`, `landing`, `overflight`, `sequence`,
    `event` give `{ kind: 'condition', condition, rule | steps | event }`; `emit_event` gives `emits`; an unknown kind is `hand` with
    `keyWhy: 'condition'`, its word kept as `[a-z0-9_]` (24 signs), never as free text. First written « named, not read »: changed on
    that word. `notJudgedYet(key)` is the one rule the pilot's screen asks. `coordination` is not read.
  - **A delay without a point is the gesture alone, never an unreadable key** (the ergonomist, 18 h 45): it is the trace the
    editor leaves (SOG-0439), and « À compléter » already says it to the author.
  - **A moving target is read and bounded, not judged** (`key.actor`, `key.object.moving`, `key.escortMinSec`): the screen says so.
  - **Units of the workshop adopted**: range in NM (`detection_range_nm`), heights in ft; `require_confirmation` per object
    (default true: within range AND on the pilot's word).
  - **Found while writing the bench**: `readMission` threw on `zones: 7`, on a single-object `turning_points`, on a zone whose
    `points` is a number — a whole mission said unreadable for one odd list. Read as nothing now. And `missionFlight` looked a route
    identifier up with `points[id]`: « constructor » was a point. Own keys only.
  - **No limit of three** (the user, 17 Nov at 19 h 06: « pourquoi limiter à 3 tiroirs ? »): from none to twelve drawers, ids B to
    M in the file, `rank` 1 to 12 for the screen (« Tiroir 1 » — letters already name the crews of an operation). The editor's texts
    say a drawer by its rank too (« le tiroir 1 n'a plus son point de déclenchement »).
  - N71 (red before: no `drawers`; `zones: 7` threw). The bench: 46 rows, among them 31 unreadable keys, 14 unreadable 1.1
    conditions and the hostile file.

## Porting the workshop (SOG-0444) — specification, to be read by the ergonomist before any product code

**What is ported.** The user's authoring mock-up (« Mission Editor », a workshop kept outside the repository and still moving; read on
17 Nov 2026, never copied) becomes the shape of the V3 editor. The user accepted the ergonomist's thirteen objections (organisation
SPEC_MISSIONS_TIROIRS § 10.2) and gave free rein for the port. **One authoring tool**: the six-step editor does not stay beside it, it
BECOMES the workshop. We port its frame, not its details of the day. Mock-up: `maquette/atelier.html` and its captures.

### 1. The screen

| part | wide screen (from 1 000 px of module) | phone (390 px) |
|---|---|---|
| the library (« Bibliothèque ») | on the left: a search, the families folded (the mission's own first), the bricks — a click adds the next drawer, already filled. It folds by its handle into a narrow band « Bibliothèque »; folded by itself when the module is under 1 500 px wide (the suite's menu already holds the left), opened by « ＋ Tiroir » | a sheet, opened by « ＋ Tiroir » |
| the mission's map | on the left, the place where one edits | folded (« Carte de la mission »), read only |
| the unfolding (« déroulé ») | under the map, ONE row that scrolls sideways: « Au départ » (visible), then « Tiroir 1, 2, 3… » (scellé; twelve at most), each with its key in one line; « ＋ Tiroir » is its last card | first, the same single row |
| the sheet (« fiche ») | on the right, of what is selected (the departure, a drawer, a place) | under the unfolding |
| the foot | « Enregistrer », « À compléter (n) » and its first point, « Annuler » | « À compléter (n) » alone: a button that opens the named list (never a cut text) |

- **A drawer is said by its rank** (« Tiroir 1 »), never by a letter: letters name the crews of an operation (the user, 17 Nov). In the
  file the ids stay B to M; the visible part (part A of the file) is « Au départ ». A drawer removed in the middle: the ranks close up.
- **« À compléter » on a phone** (the ergonomist, 17 Nov at 19 h 10): the six-step editor shows it only beside the form on a wide
  screen; the workshop says it on a phone too — one foldable line, « n points à compléter », which names them (the named lines of
  SOG-0439).

- **The sheet of the departure (part A) is the six steps of the editor, as six foldable groups** — Cadre, Équipes, Lieux, Récit, Risques, Chronologie et
  cartes — with the same fields and the same pure functions (`cadreOf` / `withCadre` … `eventsOf` / `withEvents`, `withRefs` last). Seven
  fields at most per group. A group to complete says so on its line. Nothing of the six steps is rewritten: the screen changes, the
  rules of audits 182 to 194 and of SOG-0439 stay.
- **The sheet of a drawer** (SOG-0445) is the accepted form of `maquette/tiroirs.html` in three groups — the key, the texts, the onward
  route — then « Ce que le pilote voit ».
- **Entry**: unchanged — « Créer une mission », « Modifier », « Dupliquer » of the Registry. The breadcrumb says « Missions › Registre ›
  Atelier ». The starting model (blank, or a scenario) is chosen in « Créer une mission », not in the library.
- **The library is ported** (the user, 17 Nov at 19 h 26: « je préférais l'ergonomie avec la colonne de gauche »; the ergonomist's
  objection 6 is withdrawn): since the workshop's 1.1 it is a palette — sixty bricks in sixteen families, with a search —, not a choice
  made once. What stays of the objection: it folds, and the map takes the width back.
- **Saving**: unchanged — `data.put` of the mission file then of its registry line, on the device, sent with the grouped send; only what
  the author changed is written; a file that cannot be rewritten safely is refused at the opening (`shapeOf`).

### 2. The map (on SOG-0446, the map's editing base — its file, never modified from here)

The V3 map is MapLibre. The workshop goes through the entries the Map's owner extracts from the Map's own Edit mode
(`modules/maps/lib/map_edit.js` and `lib/terrain.js`, contract in modules/maps/INTEGRATION.md § 7 bis; distances in metres, positions
`{ lat, lon }`): it writes no gesture and no geometry of its own.

| the workshop's need | the entry |
|---|---|
| a touch on the bare map gives a position (pose a point, an object, the centre of a zone, a vertex) | `tapPosition` |
| move a place, an object, a vertex, the handle of a radius, with its return during the gesture | `dragHandles` (kinds `point`, `vertex`, `object`, `radius`), `previewLayer` |
| the outline in progress (a zone that is not round, a route) | `sketch` (`polygon`, `line`), closed by « Fermer » or by touching its first vertex |
| the author's elements on their own layers (places, drawer zones, objects, a target's axis) | `authorLayers` |
| the landmarks of AeroDB in the bounding box, touchable | `referenceLayer` (`onPick`), `anchorsOf` / `snapTo` |
| « Annuler » | `createUndo` |
| the altitude of the terrain under an object, the profile | `elevationAt` (metres; null for a gap, never 0) |

- **Five tools: Sélection, Point, Tracé, Zone, Objet.** A contour is a zone that is not round (the user, 17 Nov): one tool, one sheet,
  two shapes — « Zone » poses a round zone (one touch, its radius typed or pulled by its handle); its shape (« Ronde | Contour ») is
  chosen in its sheet, and a contour is drawn by its vertices. **After a pose the tool goes back to Sélection** (except Tracé, which adds places to the selected route until it is
  left): no creation by accident.
- **A landmark of AeroDB touched says what it is** and offers « Ajouter comme point » (and « Radiale et distance… » for a beacon):
  touching it creates nothing.
- A selected zone shows its handles, as the workshop's 1.2 does: the centre moves the whole zone, the edge handle sets the radius, a
  square handle moves a vertex, a small one between two vertices inserts one, a vertex touched offers « Retirer ce sommet » (three at
  least). 3 to 100 vertices (SOG-0440).
- The fields stay (latitude, longitude, radius): the fallback without tiles, the phone's way, and what the cases play.
- **No new host**: the suite's map base and its day background (OpenTopoMap is already in the page's policy); the terrain is the one
  the Map's profile already reads (same host path, already allowed), asked as a shared function (SOG-0446).

### 3. What is never typed, what is generated

- **Identifiers are given by the workshop and cannot be edited** (PT1, ZONE-1, OBJ-1; `nextPlaceId` never reuses one the file still
  carries); names are free. For a new file, renaming can no longer leave a dead reference; for an old one, SOG-0439 keeps following.
- **A route is a list of chips**, filled by touching the map in Tracé, reordered and emptied chip by chip — the onward route of a
  drawer, the stops of an arrival key, the route of a target. Never « ids séparés par des virgules ».
- **Removing an element still cited says who cites it** and asks a second press (`removePlace`, SOG-0439), for a drawer's zone and
  object too.

### 4. The trial of the keys (« Essayer les clés »)

A pane beside the map, never a window over it: « Placer l'avion ici » by a touch, the time on a slider, the aircraft, its trail, the zone
and the object drawn, a log in plain words. It runs **the same pure judgement as the flight** — `frame/lib/crossing.js` (SOG-0447:
`crossed`, `reach`, `arrived`, `replay`), which takes the reader's keys as they are — else the trial lies. A datum that is missing
never satisfies a key: the log says « inconnu : il manque l'altitude », never a « oui » by default. What the service does not judge
(stops required before an arrival, a following, « within range AND declared », a target that moves) is the trial's to say. It writes
nothing in the mission. Not before SOG-0447 is on the integration branch.

### 5. What the file is

The contract of the user's workshop, read by `frame/lib/mission.js` (docs/technique/FORMAT_MISSION.md): `phases` and its keys, `zones`,
`objects`, the private block `x_mission_editor` kept as it is. **Q-0095 is decided (17 Nov): by identifier, at the top — the workshop's
contract.** So a drawer REFERENCES a zone or an object of the mission: « Choisir une zone de la mission » (never « Reprendre… »: it is
not a copy); « Dessiner sur la carte » creates a zone of the mission, with a generated identifier, that this drawer cites; the group
« Lieux » says « utilisée par le tiroir 2 ». **It is the READING that hides it from the pilot** while the drawer is closed (the pilot's
sheet, the Map, the session « Affectation »), not the place where the file writes it. The reader still reads a zone or an object
written inside a part (a hand-written file); the workshop does not write that form. Consequences for SOG-0439: a drawer's zone and
object are references like the others — `trigger_zone`, `trigger_object`, `trigger_actor`, a condition's `point`, `object` and
`required_points` join the walker of the references when P3 writes them.

### 6. Vocabulary (four languages, the suite's words)

« Atelier », « déroulé », « au départ », « tiroir 1, 2, 3… », « clé », « heure de repli » (on screen, the words of the pilot's
screen — `drawers_view.js`, the session « Affectation »: « fallback time », « Ersatzzeit », « hora de reserva »; the technical documents
keep `fallback_delay_min` and « fallback hour »), « zone de passage », « objet à trouver »,
« arrivée au terrain », « repère » (a landmark of AeroDB), « zone » and its « contour » (a zone that is not round), « essayer les clés »; famille and série as everywhere; never
« ids », « objet logique », « phase », nor an English screen name.

### 7. Lots, in order — each one read on its captures before the push

| lot | content | waits for |
|---|---|---|
| P1 (delivered, § 7 ter) | the screen in its new frame WITHOUT the map tools nor the drawers (the library's place is kept and shows nothing): the unfolding (A alone, the drawers of the file listed read-only), the sheet of part A in six groups, the foot; phone and wide; the six steps' cases replayed on the new screen | this specification read |
| P2 (first brick delivered, § 7 undecies) | the map as the place of edition: the five tools, drag, landmarks of AeroDB, no accidental creation | SOG-0446 |
| P3 | the drawers (SOG-0445): the card « ＋ Tiroir » (twelve at most), the sheet in three groups, the five keys, the fallback hour, « Ce que le pilote voit », « Vue du pilote : départ · 1 · 2 · 3… » on the map | P1; Q-0095 for where the file writes; Sécurisation (a deposited file is written) |
| P4 | the trial of the keys | SOG-0447 |
| P3 bis | the library's content: the bricks, read from a catalogue kept in the repository (never copied from the user's workshop), by family, with a search | P3 |
| P5 | the moving target and the workshop's 1.1 keys (hold, landing, sequence, overflight, message between crews, several crews in one operation) | the user saying his contract is stable; the trial of an object placed in X-Plane |

P1 is a change of screen in `module.js` (Features SOG's file). Granted by the ergonomist (17 Nov at 19 h 12): the editor's screen
moves out of it into a file of this session, `modules/missions/editor_view.js`, `module.js` keeping the dispatch — **first ONE commit
of move, with no change of behaviour** (the cases N50 to N70 green), then P1. Features SOG and « Affectation » (its own hook in
`module.js`) are told before the move starts; SOG-0439 and SOG-0440 are pushed first.

**The ergonomist's answers (17 Nov at 19 h 12), which P1 follows**: on a phone every group of the departure is folded and says its
content in one line (a new mission: « Cadre » unfolded); the terrain profile is a button of the map, a later lot; « Essayer les clés »
is shown on a phone too, driven by the time slider (the aircraft follows the route), the map unfolding by itself; « Vue du pilote : au
départ · tiroir 1 · tiroir 2… » is the map's selector (P3).

### 7 bis. The move of the screen (17 Nov 2026, done before P1)

`editor_view.js` holds the editor's screen, moved from `module.js` **as it was** (one contiguous block of about 730 lines: `edOpen`
to `edClick`, with `edInput`), by a script that checks that every line of the old file is in one of the two new ones. `module.js` keeps
`allRows` (the rows of the list and of the registry: Features SOG's request), the texts `TX`, the style rules and the dispatch (`edHtml`,
`edInput`, `edClick`), and gives the screen once, by `init(tools)`, what it shares with the list, the sheet and the registry: `REGISTRY`,
`TX`, `allRows`, `coSelect`, `cut`, `draw`, `esc`, `famChoices`, `famHtml`, `famLetter`, `mapHref`, `regLoad`, `subChoices`, `yamlFile`,
and `state()` — the module's state of the current mount, where the block read the module's own `S`. Audit 186 is untouched (a registry
that cannot be read is never rewritten: `edRegister` moved with its guard). Checked by hand on both versions, side by side: create,
the six steps and each of their gestures, save, modify, duplicate — same results, no page error.

**Found during that check, older than the move and left as it is** (to be fixed with P1, where the screen is redone): after typing in a
field of the Récit, the first real click on a step's pill is lost — the pills are redrawn between the press and the release.

### 7 ter. P1 as delivered (17 Nov 2026; SOG-0444 lot P1, SOG-0449; noreg N72, N73, and N50 to N70 replayed on the new screen)

The screen of `editor_view.js` (its rules in `AT_STYLE`, its texts `at…` in `editor_texts.js`):

- **the map** (`edMapHtml`): the sketch of the places as it was (`thumbHtml`, bounded to 320 px of height), no tool — folded behind
  the button « Carte de la mission » when the module is narrower than 850 px, always shown beyond;
- **the unfolding** (`edFlowHtml`): « Au départ », then the drawers of the file read by `readMission` (`frame/lib/mission.js`), said
  by their rank and their title with the word of their key — shown, never written: the file's `phases` are kept as they are (the rule
  of audit 182 already does it), and one line says so. One row that scrolls sideways, never wrapped;
- **the sheet of the departure** (`edSheetHtml`): the six steps as six groups, each a button with its mark (✓ or !), its name and its
  content in one line (`edLine`); the form of the open group (the step's form, unchanged) under its button; `s.ed.step` names the open
  group, `''` when all are folded — a mission being modified on a narrow module opens folded, a new mission and a copy open on the Cadre
  (a copy must be given its identifier: this session's choice, to be confirmed by the ergonomist), a wide module opens the Cadre;
- **the foot** (`.ms-atfoot`, sticky above the tab bar): « Enregistrer », « À compléter (n) » — on a wide module with its first point
  — and « Annuler »; the button opens the named list INSIDE the foot, just above itself (opened at the end of the page, it was off the
  screen of a phone). « Suivante » is gone: a group is opened by its name.
- **the library** has its place kept in the specification and shows nothing in this lot.

**SOG-0449 — what the finger is pressing is never redrawn.** The pills were replaced at every `input` AND at every `change` (leaving
a field by pressing a pill fires `change` between the press and the release: the pressed element was gone, the click lost). `edRefresh`
now updates IN PLACE what follows the typing — the title, each group's line and mark, the unfolding's first line, the sketch, the list
and the label of « À compléter » — by `textContent` and attributes; no button is replaced (the label of « À compléter » is the only
inner HTML set in a button, and the children of the foot's and the groups' buttons take no pointer event: the finger always presses
the button itself). The rule holds for every later lot of the workshop: a redraw (`draw`) answers a click or a list, never a keystroke.

**`module.js` after P1** (Features SOG's file): the rules and texts the former screen alone used (`.ms-steps`, `.ms-edaside`,
`.ms-edgrid`, `.ms-edbar`, `.ms-edform`, `edNext`, `edPreview`) were removed by their owner (782830b47); `.ms-ed` and `edNextSeries`
stay, the workshop still uses them. The rules of the fields of each step (`ms-edteam`, `ms-pl…`) stay there too.

### 7 quater. P3, first brick: the key of a drawer is a reference like the others (17 Nov 2026; SOG-0445; noreg N74)

Since the reader reads a key written by identifier (SOG-0440), renaming or removing its zone in the Lieux left the drawer with a dead
key, silently — the defect of SOG-0439, for the files of the user's workshop. The walker of the references (`mapRefs` in `editor.js`)
now also walks, in each part: `trigger_zone` when it is an identifier, the `point` of `trigger_condition` (and of each step of a
sequence) — `where: 'drawerKey'` — and its `required_points` — `where: 'drawerStop'`. So a rename is followed, « Retirer » says « le
tiroir 2 (sa clé…) » before the second press, and a dead key is named in « À compléter ».

- **What a removal leaves**: the zone's key goes, `fallback_delay_min` and `zone_shown` STAY; the point of a condition goes, the
  condition STAYS (the reader then says it unreadable: the drawer opens by hand). `drawersNoKey(doc)` reads those traces and
  « À compléter » names the drawer (« le tiroir 2 n'a plus sa clé »), in this sitting and the next ones. A required stop removed simply
  leaves the list.
- **Not walked**: a zone or an object written INSIDE the part (they cite nothing). `trigger_object`, `trigger_actor` and the `object`
  of a rule are walked since the objects are rows of the Lieux (§ 7 sexies).
- **Still to come in P3**: the sheet of a drawer (the key, the texts, the onward route), « ＋ Tiroir », « Ce que le pilote voit »
  (imported from the session « Affectation »: `describe` of `drawers_view.js`), the objects in the Lieux, and « À compléter » for a
  drawer (no message, no briefing, a key that looks at the aircraft without a fallback hour, a key the reader cannot read).

### 7 quinquies. P3, second brick: the drawers as rows — the pure part (17 Nov 2026; SOG-0445; no screen; noreg N75)

`modules/missions/editor_drawers.js` (pure: no page, no storage) is to the sheet of a drawer what `placesOf` / `withPlaces` are to the
Lieux. Not yet imported by the screen: the sheet is the next brick.

- **One row per drawer the reader accepts** — `drawerSlots(doc)` of `frame/lib/mission.js` is now THE rule of acceptance, used by
  the reader itself and by the workshop: the place of the part in `phases` and its letter. A part the reader refuses (a bare value, a
  letter out of B to M, a duplicate, beyond twelve) is not a row and stays in place, as it is.
- **A row**: `title`, `said` (`trigger`, the key in plain words — the V2 prints it), `message`, `brief` (their lines kept), the key in
  fields, `fallback`, `route` (the words of `route_order`). Numbers are texts, for the fields.
- **Five keys are edited**: `hand`, `time` (`point`, `delay`), `zone` (`zone` — an identifier of the mission's zones —, `shown`),
  `object` (an identifier of `objects`), `arrival` (`arrPoint`, `arrRadius`, `arrSpeed`, `arrGround`, `stops`). The workshop writes a
  zone or an object BY IDENTIFIER only (Q-0095).
- **A key the workshop does not edit is `kept`**, shown and never rewritten: several keys in one part, a zone or an object written
  inside the part, a zone crossed by a target (`trigger_actor`), a 1.1 condition, an arrival after a following. Choosing another key
  (`withKey`) replaces it: every field of the former key leaves the part, and the fallback hour falls for a key that does not look
  at the aircraft.
- **Writing** (`withDrawerRows`): the rule of audit 182 — nothing touched, the same document; a field changed, that field alone (an
  arrival keeps the other keys of its condition; an entry of a route that stays keeps its object); a number out of its bounds is not
  written, never brought back into them; a removed row removes its part (the ranks close up, the letters stay); a new row is added
  last, with the first letter of B to M that neither the rows nor the FILE carry — the pilots' records cite the letters — and twelve
  drawers at most. `phases` leaves the file with its last drawer.
- **« À compléter » of a drawer** (`drawersTodo`, read by the reader the pilot's screen uses): no message, no briefing, a key that
  looks at the aircraft without a fallback hour, a key the reader cannot read, an onward route that cites an absent place. It joins
  the foot's list with the sheet.
- **After the Security review of the pure part (17 Nov)**: « nothing touched » gives back a COPY of equal content (a
  `structuredClone`), never the object received — the rule is judged on the content; the invisible format characters that deceive the
  eye (direction overrides and isolates, zero-width space, word joiner, byte-order mark) are removed from what the workshop reads into
  its rows and from what it writes — the joiner and non-joiner (scripts and emoji need them) and the narrow no-break space stay; a text
  of the file the author does not touch is kept as it is; a blank text in a number of the file is not zero. **Done next, on the
  reviewer's request (18 Nov)**: the same removal in the READER, by one function — `visible` of `frame/lib/mission.js`, which the
  workshop imports (no second list to keep): every text read from a mission file or a registry, and an identifier before it is
  compared (noreg N76; 112 mission files and the registry of a real repository read identically before and after). The six steps'
  own fields (`editor.js`) still fold blanks only: to align when they are next touched.
- **`said` (`trigger`), decided with the sheet (§ 7 septies)**: the V2 prints it on the sealed fold, so the pilot reads it BEFORE the
  opening — the workshop writes it when the key changes, in words that name neither the zone nor the object.

### 7 sexies. P3, third brick: the objects to find are rows of the Lieux (18 Nov 2026; SOG-0445; noreg N77)

« Les lieux : sur la carte ET dans le groupe Lieux (la même liste) ; un objet de tiroir y est dit caché au pilote » (the mock-up).

- **`placesOf` gives a row `object` per entry of `objects`** (after the rendezvous): `id`, `name`, `okind` (the kind), `lat`, `lon`,
  `range` (`detection_range_nm`), `height` (`detection_height_ft`), `alt` (`altitude_ft`), `confirm` (`require_confirmation`, true
  by default: found within range AND on the pilot's word), `moving` (a target with a route, a speed or a motion). `withPlaces`
  rewrites them with the rule of the Lieux: a field changed, that field alone; the other keys of the object (a target's route, its
  speed, its callsign) kept; a kind out of the reader's list (`OBJECT_KINDS`), a range of 0 or above 100 NM, a height above
  60 000 ft, an altitude out of −1 500 to 60 000 ft are not written.
- **The identifier of an object is given by the workshop** (`nextPlaceId(rows, 'object', base)` → « OBJ-3 », never one the file still
  carries) and is not a field of its sheet: a drawer cites it, a rename would only make dead keys.
- **Its references** (the walker of SOG-0439): `trigger_object` and the `object` of a condition (`drawerKey`), `trigger_actor` — the
  target that crosses a zone instead of the pilot (`drawerActor`; removed, « ce sera le pilote » is said before the second press) —,
  and the `route_order` of a moving target (`objectRoute`: a place renamed is renamed there, a place removed leaves it).
- **On screen** (`editor_view.js`): the row « OBJ » says its kind, « caché au pilote », the drawer whose key it is (« clé du tiroir
  4 ») or « aucun tiroir ne le cite », its range, « cible mobile, gardée telle quelle », its position — and a ZONE says the drawer
  that uses it too; the detail of a row wraps instead of being cut. The sheet follows the rule of seven (the ergonomist's reading
  of 17 Nov): name, kind, latitude, longitude, range, the box « Trouvé seulement quand le pilote le déclare (« Objet en vue ») » —
  checked from the start for a new object (the user's decision: within range AND declared) — and ONE fold « Hauteur — facultatif »
  (the detection height and the altitude of the object), closed at first, which says its content when it is filled. A number written
  in a sentence takes the decimal comma outside English (« portée 0,3 NM », « cercle 12,5 km »); a field keeps what was typed.
  « + Objet à trouver » joins the other « + » buttons. The sketch draws an object as a diamond: the map is the author's. **An event of the timeline is never placed
  on an object** (the timeline is read by the pilot before the drawer opens).
- **The six steps read their texts through `visible`** of the reader (`cut`, `para` of `editor.js`; Security review of 18 Nov): the
  invisible format characters are not shown nor written; a text of the file the author does not touch is kept as it is.
- **Not done**: the object seen in X-Plane; the route and the speed of a moving target (P5); the height above the ground under an
  object (the terrain comes with the map's base, SOG-0446).

### 7 septies. P3, fourth brick: the sheet of a drawer (18 Nov 2026; SOG-0445; noreg N78)

The accepted form of `maquette/tiroirs.html`, in the frame of the workshop. `editor_view.js` imports `editor_drawers.js`
(`meta.files` of `module.js` carries it: one entry, granted by its owner on 18 Nov).

- **A card of the unfolding is a button** (`edsel`): `s.ed.sel` is `'start'` or the letter of a drawer; the sheet of the drawer takes
  the place of the departure's (on the right on a wide module, under the unfolding on a phone); « Au départ » brings the six groups
  back. « ＋ Tiroir » is the last card (twelve drawers at most): the next drawer, by the pilot's gesture, its sheet open. Each card
  carries the mark of what the drawer has to complete (✓ or !).
- **The sheet, three groups** — « La clé »: what opens the drawer (the pilot's gesture alone, an hour, a passage zone, an object to
  find, the arrival at the aerodrome), then the fields of that key: the point and the delay of an hour (« le décollage » by default);
  a zone or an object CHOSEN among those of the mission (the Lieux) — never drawn nor typed here: a drawer cites them (Q-0095) —,
  « Montrer la zone au pilote »; the place, the radius, the maximum speed and « Posé au sol » of an arrival (its required stops are
  shown and kept as they are); the fallback time for a key that looks at the aircraft. A key the workshop does not edit (`kept`) says
  why and is replaced only by choosing another one. « Les textes »: the title (with its warning: the pilot reads it on the closed
  drawer), the message, the briefing. « La suite de route »: chips, removed one by one, added from a list (the places of the mission,
  « l'arrivée »). Then « Retirer ce tiroir », in two presses, the second inert for a second; the ranks close up, the letters stay.
- **The ergonomist's reading (17 Nov at 21 h 59), applied**: on a narrow module « La clé » is unfolded, « Les textes » and « La
  suite de route » are folded and each says its content in one line (« Entrée nord · message de 35 signes · sans briefing »,
  « PT2, DESTINATION » or « aucune suite »); on a wide module the three groups are unfolded and their titles are not buttons. A new
  drawer opens with its texts unfolded (its title is to be given). When the mission has no zone or no object to choose, the sheet
  says « Aucune zone dans cette mission — créez-la dans les Lieux » with the link « Ouvrir les Lieux », which brings back the sheet
  of the departure with its Lieux unfolded — never an empty list. « À compléter » writes « Tiroir 1 : … », capitalised like
  « Cadre : … ». The chosen card stays in view in the row after any gesture that redraws (the row scrolls sideways, never the page).
- **A new key takes what can be guessed** (the first zone, the first object, the arrival at the destination, landed, 1 NM, 30 kt,
  after take-off) so that a key just chosen is never an unreadable one.
- **`trigger`** is written by the workshop when the key (or the point, or the delay of an hour) changes: « 20 min après le
  décollage », « au passage d'une zone », « quand l'objet est trouvé », « à l'arrivée », « au geste du pilote » — in the language of
  the author's screen. The words of a drawer that is not touched are kept.
- **Nothing is written by looking**: the rows of the drawers (`s.ed.drawers`) are created at the first change only; `edDoc` applies
  `withDrawerRows` BEFORE `withRefs`, so a place renamed or removed in the same sitting is followed in the keys just chosen.
- **SOG-0449 holds**: a text, a number, a box update the cards in place (`edRefresh`: title, key, mark); a list (the key, a place, the
  route) plays at its `change` only and redraws.
- **« À compléter »**: after the points of the departure, one line per drawer that has something to complete (« tiroir 3 : clé sans
  heure de repli, sans message, sans briefing »); the count of the foot adds them.
- **Security** (review asked before the push): every text of the file goes through `esc()`; a list never offers a value the mission
  does not carry, except the file's own value, shown with « ? » when it names nothing; `edInput` no longer takes the field `id` for
  an object, even from a forged page.
- **Done since (§ 7 octies)**: « Ce que le pilote voit », the stops of an arrival as chips. **Still to come**: « Vue du pilote » on
  the map (with P2).

### 7 octies. P3, end: « Ce que le pilote voit », the stops of an arrival (17 Nov 2026; SOG-0445; noreg N79)

- **« Ce que le pilote voit »** is the fourth group of the sheet of a drawer (folded on a narrow module, with its line): **Avant —
  tiroir fermé** — « Tiroir 2 · Entrée nord », the sentence of its key and the note the pilot reads without a live position, under
  the line « Sur l'appareil du pilote : » (the ergonomist's reading: else « Cet appareil… » reads as the author's own; since the zone
  lot of « Affectation », 18 Nov, the note says its case itself — « Sans position en direct sur cet appareil : … », « Cet appareil
  ne suit pas encore ce passage : … » — so the line no longer does);
  **Après — tiroir ouvert** — its message, the beginning of its briefing (600 signs), « Suite de route proposée : … » by the names
  of the places. The sentences are the pilot's screen's own: `edPilotView` calls `describe` of `modules/missions/drawers_view.js`
  (the session « Affectation ») with `{ key, dueAt: null }` — ONE function, so that the workshop can never say something else than
  the pilot will read (a zone not shown: « s'ouvre en vol »; what the device does not judge yet: said as the pilot's screen says it).
- **It reads the document, never the rows**: the drawer comes from `readMission(edDoc(e))` — bounded, its invisible format
  characters removed — and not from `s.ed.drawers`, whose typed texts are raw until they are written (Security review of 18 Nov).
  It follows the typing in place (`edRefresh`: `textContent` only).
- **The stops of an arrival are chips** (`required_points`): added from a list of the places of the mission, removed one by one,
  twenty at most; written by identifier, followed by the references of SOG-0439 (`drawerStop`).
- With this, lot P3 (SOG-0445) is delivered but for « Vue du pilote » on the map, which comes with the map of P2.

### 7 nonies. P4, first brick: the trial of the keys — the pure part (18 Nov 2026; SOG-0444 lot P4; no screen; noreg N90)

`modules/missions/editor_trial.js` — `trialRun(mission, { untilMin, speedKt, altFt, declares, hands })`, pure (no page, no clock, no
storage): the mission READ by the reader, a time, a speed, an altitude → where the aircraft of the trial is, which drawers are open,
by what, and a log of facts. Nothing is written in the mission. Not yet imported by the screen: the pane is the next brick.

- **The aircraft of the trial** leaves the departure, follows the route of the departure at a constant speed (the mission's cruise
  speed by default), **takes the onward route of a drawer that opens** (« Prendre la suite de route »), then joins the arrival and
  lands. Its altitude is the one the author gives (none: unknown); its height above the ground is not known here (no terrain).
- **The same judgement as the flight**: `crossed`, `reach` and `arrived` of `frame/lib/crossing.js` on the PATH between two fixes
  (a step of 15 s), with the keys of the reader as they are; an hour by `passageMin` of the reader (the estimate the flight uses);
  **the order of the flight** (`modules/missions/drawers.js`): only the first closed drawer can open, and what is due plays as soon
  as the one before opens.
- **A datum that is missing never satisfies a key**: the log says `unknown` and why — `alt` (a ceiling, no altitude), `height` (a
  detection height, no height), `ground` (« on the ground » unknown), `time` (the point of an hour is not on the route, or the
  mission has no speed). Said when it matters (the aircraft is in the zone, within range, in the radius), once per drawer.
- **What the service does not judge is the trial's to say**: the stops an arrival requires (judged on the trail of the trial: `stops`
  when the aircraft arrives without them), « within range AND declared » (`near`, unless `declares`), the pilot's gesture (`hands`),
  and what the flight does not judge yet — a 1.1 condition, a target that crosses or moves, a following (`notJudgedYet`): `unjudged`,
  and the drawer opens at its fallback time or by hand only, as in flight. A key the reader cannot read: `unread`.
- **The log is facts, not sentences** (`{ min, ev, rank, how, why }`): the pane writes them in the four languages.
- Bounds: ten hours at most, 20 to 600 kt, −1 500 to 60 000 ft (out of bounds: the default, never clamped), a trail of 240 points,
  twelve drawers; no input throws.

### 7 decies. P4, second brick: the trial pane (18 Nov 2026; SOG-0444 lot P4; noreg N91)

- **« Essayer les clés »** is a button in the head of the unfolding; pressed, **the trial pane takes the place of the sheet** — beside
  the map on a wide module, under the unfolding on a narrow one: never a window over the map. `s.ed.trial` = `{ on, min, max, speed,
  alt, declares, hands }`; the computation is `trialRun` (§ 7 nonies) on the document of the sitting read by the reader.
- **The pane**: the time on a slider (« Temps depuis le décollage — H + 10 min »; it goes to the landing or to the last fallback time,
  ten minutes more), the altitude and the speed of the aircraft of the trial (those of the mission at first; an empty altitude is
  UNKNOWN), the box « Le pilote dit « Objet en vue » dès qu'il est à portée », **the log in sentences** (four languages, built from the
  facts of the pure part), « Ouvrir à la main le tiroir n » (the pilot's gesture on the first closed drawer, at the minute of the
  slider), « Recommencer », « Fermer l'essai ».
- **The onward route taken by the aircraft of the trial is said** (the ergonomist's reading of 18 Nov): « la suite de route du tiroir 1
  est prise — en vol, le pilote la prend d'un geste »: the trial takes it without asking, the flight does not.
- **The map and the unfolding follow**: the sketch shows the aircraft and its trail (the map unfolds by itself on a phone, as the
  ergonomist asked on 17 Nov); each card of the unfolding says « ouvert à H + 6 min » or « fermé ».
- **SOG-0449 holds**: the slider, the fields and the box update the time, the log, the cards, the sketch and the label of the gesture
  button IN PLACE (`edRefresh`); only a button redraws.
- **Nothing is written**: the trial reads; « Enregistrer » after a trial writes nothing more than before (N91 checks the file byte
  for byte).
- `module.js`: two entries of `meta.files`, granted by its owner — `'editor_trial.js'` and `'../../frame/lib/crossing.js'` (once).
- **Not done**: « Placer l'avion ici » by a touch on the map and the drawing of the zone and of the object during the trial (they come
  with the map of P2, SOG-0446); a wind, a climb, a target that moves (P5).

### 7 undecies. P2, first brick: the suite's map in the workshop, read only (18 Nov 2026; SOG-0444 lot P2; noreg N92, N93)

- **The map of the workshop is the suite's map base** (`modules/maps/lib/map_base.js`: MapLibre on demand, the day or night background,
  giving up) and the mission is drawn on **the author's layers of the editing base** (`modules/maps/lib/map_edit.js`, `authorLayers`,
  SOG-0446). No gesture and no layer is written here. File: `modules/missions/editor_map.js`.
- **The pure part**, `mapFeatures(rows, { zones, adPos, path, run })` → `{ points, lines, polygons, box }`: the rows of the Lieux the
  screen shows (`s.ed.places`, else `placesOf`) — every located place is a point of its kind (the departure and the arrival at the
  position of the base when the file gives none), a round zone a ring of 64 vertices around its centre (0.05 to 500 km), a contour its
  3 to 100 vertices **read in the file's zones** (they are not edited yet), the route of the departure a dashed line (`pathOf` of
  `editor_trial.js`: the one the trial follows), and during a trial the trail and the aircraft. The identifier of an element is
  `place:i`, the rank of its row. Untrusted input: a number out of its bounds is never brought back into them — the element is not
  drawn; labels are cut at 60 signs and only go to MapLibre properties.
- **The live map** (one at a time): `show(slot, feats, options)` starts it in a host of its own, kept from one drawing to the next
  (the screen is redrawn by `innerHTML`: the host is put back in the new slot), `fit()`, `stop()`. First the suite's background
  (`startTiles` with `styleFor`), else **a plain background** (MapLibre on a local style, nothing to fetch — **offline too**, § 7
  quatervicies), else — no WebGL, MapLibre missing — nothing: the sketch of P1 stays. The view is framed on the mission at the start, again when the frame of the
  mission or the size of the box changes, **until the author moves the view**; « Recentrer » frames it again.
- **The screen**: a frame of fixed size (300 px; `min(46dvh, 440px)` on a wide module) — nothing moves when the map arrives —, the
  sketch under it until the map is there, « Recentrer » at its bottom left, shown with the map only. **A place touched leads to its
  row of the Lieux, open** (the sheet of the departure, the group « Lieux »); during a trial of the keys a touch does nothing. The map
  follows the typing in place (`edRefresh`: the same canvas, no button redrawn — SOG-0449). **On a wide module the map and the
  unfolding are sticky** under the header of the page (`--f-pane-top`): they stay in view while the sheet scrolls (the ergonomist,
  18 Nov).
- **`module.js`** (granted by its owner): `meta.files` — `'editor_map.js'`, `'../maps/lib/map_base.js?v=0'`,
  `'../maps/lib/map_edit.js?v=0'`, `'../maps/render.js?v=0'`; `meta.lazy` — MapLibre (script and style sheet) and
  `'../maps/lib/outlines.js?v=0'` (what the base may load); `meta.net` — `tiles.openfreemap.org`, **a host that is new for the
  Company page** as a declaration (it is already in `CONNECT` of `tools/csp_policy.py`: nothing is widened; read by the Security
  session); two calls of one line — `edAfter(s)` at the end of `draw` (the map is put back, or removed out of the workshop),
  `edAfter(null)` in `unmount`. **The owner's conditions** (Features SOG, 18 Nov), since the call is on the path of every drawing of
  the page: `edAfter` never throws (its body is in its own `try`), does nothing out of the workshop (no map alive: `stop()` returns
  at once, nothing is loaded — MapLibre is only loaded when the workshop opens, N93 counts the requests), and is idempotent.
- **What leaves the device** (the Security session's note, 18 Nov): opening the map asks the tile provider for the area shown, hence
  that of the mission, as the Map does; the help of the workshop says so in four languages; offline, nothing is asked.
- **Not done** (next bricks): Sélection and the drag of a place, the poses (Point, Objet, Zone), the handles of a zone and its
  contour, Tracé, the landmarks of AeroDB, « Vue du pilote », « Placer l'avion ici »; no name is written on the map yet (a base style
  does not always carry glyphs: the names come with the selection). **Asked of the map's owner** — and delivered (SOG-0446, 6f3e91140; § 7 quatervicies): `startTiles` gave up at once when the
  device was offline, even for a local style; the plain background therefore only served when the tiles did not come.

### 7 duodecies. P2, second brick: the gestures of the map — the pure part (18 Nov 2026; SOG-0444 lot P2; no screen; noreg N94)

What the tools of the map will call, on the rows of the Lieux (`modules/missions/editor.js`), written and tested before any screen:

- `newPlace(rows, kind, base, at)` → `{ rows, at }` or `null`: a new row at the place of its kind (the order of the file: target,
  zones, points, rendezvous, objects) with a free identifier (`nextPlaceId`); `at` (`{ lat, lon }`, and `radius` in km for a zone) is
  the position of the touch, kept at five decimals (one metre); out of bounds, the row is created « à placer ». `null` when the kind
  is full (`PLACES_MAX`, one target) or is not one a gesture poses. **The buttons « + Zone », « + Point tournant »… of the Lieux go
  through the same function** (they pass no position).
- `movePlace(rows, i, { lat, lon })` → new rows; `placeRadius(rows, i, km)` → new rows (two decimals). **Refused — the SAME rows are
  returned**: the departure and the arrival (aerodromes: their position comes from the base), a contour (its vertices are not moved
  as a block here), a rank that is not one, a position out of bounds, a radius out of `RADIUS_KM` (0.05 to 500 km, the reader's
  bound). Nothing is ever brought back into its bounds.
- `MOVABLE` (the kinds a gesture moves), `RADIUS_KM`.
- The file is written as before, at « Enregistrer », by `withPlaces` (audit 182: only what changed): N94 reads what is written.

### 7 terdecies. P2, second brick: the tools of the map (18 Nov 2026; SOG-0444 lot P2; noreg N95; the pure part: § 7 duodecies)

- **A row of tools above the map**, given with the map only (disabled without it and during a trial of the keys): **Sélection, Point,
  Zone, Objet**, then « Annuler le geste » and « Recentrer » (which left the corner of the map). Under it, one line says what the tool
  in hand does, or the chosen place and what a gesture does with it. A tool is taken IN PLACE (`aria-pressed`, the line: no button is
  redrawn — SOG-0449); the same tool taken again drops it. Tracé comes with the next brick.
- **Every place says its identifier on the map** (the ergonomist's reading of 18 Nov: « une carte de points sans nom ne se lit
  pas »): `mapFeatures` gives `labels` (the identifier, else the beginning of the name — the code of an aerodrome —, 24 signs; on the
  point, or in the middle of a contour) and the live map shows each one as a MapLibre marker — a page element filled by `textContent`
  that takes no touch —, not with a font of the background (a base style does not always carry glyphs). **Labels of places that
  are close stack** instead of covering each other (a zone centred on a point, an object near the target): each one moves up one line
  while it touches one already put, at the scale of the view (redone at each drawing and each change of zoom).
- **Sélection**: a place touched is chosen — its label says its whole name (« PT2 · Point deux ») in a frame, its row of the Lieux
  opens; the bare map chooses nothing. **A located place is dragged by its handle**
  (`dragHandles`, the return of the gesture on `previewLayer`): the target, a turning point, a rendezvous, an object, a round zone by
  its centre; **a round zone chosen shows the handle of its radius**, east of its circle. The departure and the arrival are not
  handles (a press on them drags the map), nor is a contour (next brick).
- **A tool of pose** (Point, Zone, Objet): a touch on the bare map (`tapPosition`) poses the place there — `newPlace`: a free
  identifier, the place of its kind; a zone is round, its radius an eighth of the width of the view (1 to 100 km) — **then the tool
  goes back to Sélection** (no creation by accident), the place is chosen and its row open, to say its name. A kind that is full: a
  floating notification, nothing created.
- **« Annuler le geste »** (`createUndo` of the base, twenty states): the rows of the Lieux of before the last gesture of the map
  (a pose, a move, a radius). It never undoes a typing: a typing in a field of a place, a row added or removed by the Lieux, a
  save empty what it keeps (and no place is chosen any more: the ranks changed).
- **`editor_map.js`** only says which handles exist (`handlesOf`: read from the features, in Sélection only) and gives the finished
  gesture back to the screen (`onPick`, `onMove`, `onRadius`, `onPose`); the screen alone changes the rows, through the pure
  functions of § 7 duodecies — a refused gesture changes nothing. `mapFeatures` gives a round zone a point at its centre and, when
  chosen, the point `radius:i`; the rank read back from an identifier is checked (`place:` or `radius:` and one to three digits).
- **Nothing new is written**: the file is written at « Enregistrer » by `withPlaces`, as when the fields are typed (N95 reads the
  saved file).
- **Not done** (third brick): the contour and its vertices, Tracé, the landmarks of AeroDB, « Dessiner sur la carte » from the sheet
  of a drawer, « Placer l'avion ici », « Vue du pilote ».

### 7 quaterdecies. P2, third brick: the contour of a zone — the pure part (18 Nov 2026; SOG-0444 lot P2; no screen; noreg N96)

- **The row of a zone carries its vertices**: `ring`, a text (« 44.5,1.5;44.5,1.7;44.4,1.7 »: lat,lon, six decimals at most) when the
  file's contour can be read — 3 to 100 vertices (`VERTICES`, the reader's bound), every one a position; else `''`, and **an unreadable
  contour is kept as the file writes it** (`poly` still says how many vertices it has; no gesture touches it). A text keeps the row
  flat, like its other fields: the rule « nothing changed, nothing rewritten » compares rows as before.
- `ringOf(row)` → `[[lat, lon]…]` or `null`; `ringMiddle(ring)` (where the map puts the label and the handle of a contour).
- **Gestures** (new rows; the SAME rows when refused): `moveVertex(rows, i, k, pos)`, `insertVertex(rows, i, k, pos)` (after vertex k;
  never over 100), `removeVertex(rows, i, k)` (never under 3); `movePlace` now **moves a readable contour as a block** — `pos` is
  where its middle goes, its centre follows when it has one —, refused when a vertex would leave the bounds. Positions of a gesture
  are numbers, kept at five decimals; nothing is brought back into its bounds.
- **The shape**: `toContour(rows, i)` makes of a round zone (a centre and a radius within bounds) a contour of six vertices at its
  radius, the first due north — its centre and its radius stay in the row, for the way back; `toRound(rows, i)` removes the vertices,
  takes the middle for centre when there was none and the mean distance of the vertices for radius when there was none.
- **The file** (`withPlaces`): the vertices are written under the key the file used (`points`, else `polygon`, else `vertices`;
  `points` for a new contour), a vertex left in place keeps the file's object (its other keys), a moved or inserted one is
  `{ lat, lon }`; a zone made round again loses the key. Nothing changed, nothing rewritten (N96 compares the documents).
- N94 follows: a contour is no longer « refused » by `movePlace`.

### 7 quindecies. P2, third brick: the contour of a zone on the map, « Dessiner sur la carte » (18 Nov 2026; SOG-0444 lot P2; noreg N97; the pure part: § 7 quaterdecies)

- **The shape is chosen in the sheet of the zone** (one button, so the sheet keeps its number of elements): « Tracer son contour » for
  a round zone — six vertices at its radius (`toContour`); a zone without a position or a radius says so in a notification — and
  « La rendre ronde » for a contour (`toRound`). The sheet of a contour says « Contour de n sommets : il se retouche sur la carte »
  in place of the fields of the centre and of the radius; a contour the file writes in a way that cannot be read stays « kept as it
  is », without the button.
- **On the map, the contour chosen shows its handles**: its vertices (`vertex:i:k`), and in the middle of each side the point that
  adds a vertex (`mid:i:k`, another colour). A vertex is dragged (`moveVertex`); a touch or a drag on the point of a side poses a
  vertex where the gesture ends (`insertVertex`); the contour is moved as a block by the handle at its middle, where its label is
  (`movePlace`). **A vertex touched, moved or posed is chosen**: the line names it (« Sommet 3 de ZONE-2 ») and **« Retirer ce
  sommet »** is shown beside the line — a button, never a long press alone; under three vertices it is refused, with a notification.
- All of these are gestures of the map: « Annuler le geste » gives the rows of before; **after an undo the place stays chosen** when
  it is still at its rank (same identifier, same kind).
- **A row of the Lieux opened by « Modifier » is the place chosen on the map** (closed: none): the list and the map say the same
  place.
- **« Dessiner sur la carte »** (a zone) and **« Poser sur la carte »** (an object), in the sheet of a drawer, under the list of the
  zones or objects of the mission, when the map is there: the tool is taken in hand, the map unfolds, the line says « ce qui est posé
  là sera la clé du tiroir n »; what is posed becomes the key of that drawer (`trigger_zone` / `trigger_object` by identifier) and
  its sheet stays. Taking a tool by hand drops this.
- **A defect corrected in passing**: after « Enregistrer », the group « Lieux » left unfolded showed an EMPTY list until it was
  folded and reopened — its rows are now read again from the saved file (N97).
- **The view is framed on a zone with a contour** (the ergonomist's reading of 18 Nov: on a zone of 5 km in a mission of 150 km
  « les six poignées sont entassées, personne ne les attrape »): « Tracer son contour », and choosing a zone with a contour — on the
  map or by « Modifier » — frame the view on the zone, with a margin (`focus(i)` of `editor_map.js`); the view then no longer
  reframes itself on the mission, **« Recentrer » comes back to it**; moving a place or a vertex never reframes (N97).
- **Not done**: Tracé and the landmarks of AeroDB (next push), « Placer l'avion ici », « Vue du pilote ».

### 7 sexdecies. P2, push 3b: Tracé — the pure part (18 Nov 2026; SOG-0444 lot P2; no screen; noreg N98)

- **The route of the departure is a list of identifiers** (`route_order`): `routeOf(doc)` → `['ORIGIN', 'PT1', 'TARGET',
  'DESTINATION']`, sixty at most (`ROUTE_MAX`, the bound of the onward routes of the drawers); an entry of the file is a text or
  `{ id }`, one without an identifier is skipped.
- `withRoute(doc, ids)` → a NEW document. **Nothing changed, nothing rewritten** (the same identifiers in the same order). Else
  `route_order` is the list: an identifier the file already had keeps the entry of the file (a text, or its object with its other
  keys), a new one is a text; an empty list removes the key. Identifiers are texts of forty signs at most; nothing else is read.
  **A route of more than sixty places in the file loses none when it is retouched**: the entries beyond the sixtieth stay as they are
  at the end (the Security session's note of 18 Nov; as the places beyond `PLACES_MAX`).
- `routeToken(row)`: what a route writes for a row of the Lieux — `ORIGIN` for the departure, `DESTINATION` for the arrival, else
  its identifier (`''`: a place without an identifier does not enter a route).
- The references still follow the places renamed or removed (`withRefs`, last, as before): the screen will apply `withRoute` before.

### 7 septdecies. P2, push 3b: Tracé on the screen (18 Nov 2026; SOG-0444 lot P2; noreg N99; the pure part: § 7 sexdecies)

- **The route of the departure is a row of chips**, under the list of the Lieux (the sheet of the departure): each place by its
  identifier — the departure and the arrival by the code of their aerodrome —, removed by its cross; « Ajouter un lieu… » adds one at
  the end (only a place of the sitting: the value of the list is checked against the tokens of the rows). `s.ed.route` holds the
  identifiers once retouched; `edDoc` applies `withRoute` before the references follow the places; a save forgets it. Sixty places
  at most (a notification beyond).
- **The fifth tool, « Tracé »**, between Point and Zone (the row has seven buttons; they are tightened to hold on one line on a wide
  module): a place touched joins **the route chosen** — the onward route of the drawer chosen in the unfolding, else the route of the
  departure; the line under the tools says which. **The tool stays in hand** until it is taken again (the only tool that does); a
  touch on the bare map adds nothing and creates nothing; a place without an identifier says so in a notification.
- **The map draws the onward route of the drawer chosen** (a second dashed line, `onward`, through its located places), beside the
  route of the departure.
- **A place added to a route by a touch of the map is a gesture of the map** (the ergonomist's reading of 18 Nov: else the button
  undoes the gesture before, while the author believes he undoes his last touch): « Annuler le geste » gives it back. The state
  kept before each gesture (`edMapRemember`) is therefore the rows of the Lieux, the route of the departure, and what a gesture
  changes of a drawer — its onward route, the zone or the object it cites (« Dessiner sur la carte »). **A retouch made in a sheet**
  — a chip removed, « Ajouter un lieu… », a field of a drawer, like a typing in a place — **empties what the button keeps**: it
  never undoes what was done in a sheet.
- **Not done**: reordering the chips of a route (remove and add again); the landmarks of AeroDB (next), « Placer l'avion ici ».

### 7 octodecies. P2: the landmarks of the aeronautical base (18 Nov 2026; SOG-0444 lot P2; noreg N100)

- **The map shows the landmarks of AeroDB in the frame of the view** — aerodromes, beacons, fixes, VFR points — on the reference
  layer of the editing base (`referenceLayer`, under the author's elements, small dots, from zoom 7: the base's threshold). When the
  view stops (`moveend`, 300 ms later, zoom 7 and beyond, a frame that changed), `editor_map.js` tells the screen (`onView`); the
  screen asks the suite's base (`ctx.aerodb.aerodromes`, `navaids`, `points`, `vrp` of the bounding box) and gives the answer back
  through `setRefs`. A late answer (the view moved, the workshop was left) is dropped; without a base, no landmark and no message.
  **Nothing is fetched from the network by this**: the base is the one the device already holds.
- **What the base returns is bounded** (`refData`, pure): an identifier of 24 signs at most and a position within bounds, 300 per
  kind; nothing else is kept. An identifier is shown by `textContent` in the line of the tool only. **A landmark that carries a
  local mark is dropped** — `local`, or a `source` / `zone` of X-Plane, Eurocontrol or Little Navmap (the Security session's guard of
  18 Nov; rule SOG-0153 / Q-0061: such a position never goes into a file of the shared data, and « Ajouter comme point » writes one):
  it is neither drawn nor addable. The lists of `aerodb` read the published base; `refData` does not assume it.
- **A landmark touched says what it is** — « Repère : la balise TSV. », « le terrain », « le point », « le point VFR » — in the line
  of the tool, is marked on the map, and **« Ajouter comme point »** is shown beside the line. **The touch creates nothing.** The
  button makes of it a turning point of the mission (`newPlace`: a free identifier), at its position, under its name; it is a gesture
  of the map (« Annuler le geste » gives it back). A touch on the bare map, a place chosen, a tool taken forget the landmark.
- In Sélection only: with a tool of pose in hand, a touch on a landmark poses as anywhere else; an element of the author under the
  finger wins; a line (the route, the trail) does not hide a landmark.
- **On a phone**, a mission of 150 km is framed under zoom 7: the landmarks only come when the author gets closer.
- **Not done**: « Radiale et distance… » for a beacon; the names of the landmarks on the map (they are said when touched).

### 7 novodecies. P2: « Placer l'avion ici » — the pure part (18 Nov 2026; SOG-0444 lot P2; no screen; noreg N101)

- The trial engine (`trialRun` of `editor_trial.js`, § 7 nonies) takes **placements by hand**: `puts: [{ min, lat, lon }]` — at that
  minute the author puts the aircraft of the trial at that position. Twenty at most (`TRIAL.puts`), each one bounded (a minute within
  the trial, a position within bounds, numbers only): an unreadable placement is ignored, the trial is the same as without it; they
  play in the order of time whatever the order they are given in.
- **Putting is not flying**: the aircraft is judged there **on its position alone**, with no path from where it was — a zone it is
  put in opens (under its ceiling; above, the log says so), an object it is put near is found, an arrival it is put on (on the ground,
  after its landing) is judged; a zone a straight line from its former position would have crossed does NOT open. The order of the
  flight holds: only the first closed drawer can open.
- Then it **goes on from there** towards what it had left to follow (the route of the departure, or the onward route it had taken);
  put after its landing, it stays on the ground, there; put at minute zero, it starts there. The log says `put`.
- **The order of the flight is said** (the ergonomist's reading of 18 Nov): when the aircraft is within range of the object, or in
  the zone, of a LATER drawer while an earlier one is still closed, nothing opens and the log says which one comes first — `order`
  (`why`: `object` | `zone`; `first`: the rank of the first closed drawer), once per drawer: « à portée de l'objet du tiroir 2 :
  rien ne s'ouvre, le tiroir 1 d'abord ». It holds for the whole trial, not only after a placement.
- Nothing is written in the mission; no input throws (N101).

### 7 vicies. P2: « Placer l'avion ici » on the screen (18 Nov 2026; SOG-0444 lot P2; noreg N102; the pure part: § 7 novodecies)

- **During a trial of the keys, « Placer l'avion ici » is a button beside the line under the tools of the map** (where « Retirer ce
  sommet » and « Ajouter comme point » are, out of a trial; the trial pane already has seven controls). It is taken in hand IN PLACE
  (`aria-pressed`; taken again, it is dropped) and the line says « Touchez la carte : l'avion de l'essai est posé là, à H + 2 min ».
- **The next touch on the map puts the aircraft there, at the minute of the slider** (`s.ed.trial.puts`; a placement at the same
  minute replaces the one before; twenty at most, a notification beyond), and **the tool is dropped**: another touch does nothing.
  The trial is computed again by the same engine: the card of the drawer says « ouvert à H + 2 min », the log « l'avion est posé à
  la main », the map shows the aircraft there.
- « Recommencer » forgets the placements with the gestures of the pilot; closing the trial hides the button.
- **The word is « placer », never « poser »** (the ergonomist, 18 Nov): for a pilot « posé » means LANDED, and the arrival key already
  says « posé ». The button is « Placer l'avion ici », the log « l'avion est placé à la main ». (« Posé » stays for a place put on the
  map by a tool: it is not about the aircraft.)
- Nothing is written in the mission (N102 compares the saved file).
- With this, lot P2 is delivered but for « Vue du pilote » on the map (waits for the pure function of SOG-0448), « Radiale et
  distance… » for a beacon and the reordering of the chips of a route (asked for later).

### 7 unvicies. « Vue du pilote » on the map of the workshop (18 Nov 2026; SOG-0448, lot B; noreg N104; the rule: `pilotView`, N103)

- **Under the frame of the map, a list « Vue de la carte »** (the row of tools already has seven buttons): « Tout — la vue de
  l'auteur » (the default: the author sees everything), « Vue du pilote : au départ », then « Vue du pilote : tiroir n ouvert » for
  each drawer of the sitting. `s.ed.mapView` = -1, 0 or n. Shown only when the mission has drawers and out of a trial of the keys
  (the trial shows everything); disabled until the map is there (it is given in place when the map arrives).
- **In the pilot's view the map draws only what the reader gives the pilot at that stage** — `MS.pilotView(readMission(doc), the
  letters of the first n drawers)`, the ONE rule of the sheet, the Detail and the Map: `edPilotRows` replaces by `null` the rows of
  the Lieux that the view does not keep (the ranks of the others do not move) — the departure and the arrival always, the target
  when it is shown, an object only when the drawer it is the key of is open, the other places by their identifier. The names
  written on the map follow.
- **The map only shows**: the tools are not given, a touch does nothing, the line says « Vue du pilote : la carte ne montre que ce
  qu'il peut voir à ce stade ; les outils reviennent avec « Tout » ». Choosing a view forgets the place chosen.
- **The guard for the author** (the ergonomist, 18 Nov; noreg N107): the reader's rule is the safe one — what nothing cites stays
  hidden (otherwise a zone laid on the target would leak) — so, in a mission with drawers, a place, a zone or an object that
  NOTHING cites (neither the route, nor a map, nor a drawer; an object: the key of no drawer) is never shown to the pilot, even with
  every drawer open. « À compléter » names it, under the Lieux: « RDV-1 n'est cité par rien : le pilote ne le verra jamais », three
  at most (`ED.uncited(doc)`, read by `ED.todo`). The rule lives once, in `editor.js`: `ED.pilotRows(doc, rows, n)`, which the
  map's view calls too (`edPilotRows`). A mission without drawers has no secret: nothing is said.
- The sheet on the right is NOT filtered: it is the author's. « Ce que le pilote voit » of a drawer (§ 7 octies) stays the
  preview of the drawer itself.
- **Not done**: the onward routes of the open drawers drawn in the pilot's view; the view during a trial of the keys.

### 7 duovicies. « Chercher un repère » by its name (18 Nov 2026; SOG-0444, the rests of lot P2 — lot C; noreg N105)

- **Under the frame of the map, above « Vue de la carte »**: a field (« Code ou nom », forty signs) and its button « Chercher ».
  Enter searches as the button does (a `change` while the field is still in hand: `module.js` forwards no key). Not given in the
  pilot's view nor during a trial of the keys (the map only shows), nor without the aeronautical base; disabled until the map is
  there.
- **What is asked** (`edRefSeek`): for a text shaped like a code (2 to 7 letters and digits), the places that carry it, the nearest
  to the centre of the view first (`aerodb.coordsAll(text, { near })`); and the places whose name answers the text
  (`aerodb.find(text, 20)`). `EM.seekRows` bounds them: a known kind (a town is not a landmark), a position within bounds, an
  identifier of 24 signs, a label of 60, five candidates at most, once each; two candidates of the same label say where they are.
- **The base confirms every candidate** before the screen sees it: the list of its kind is asked for a small frame around it
  (`EM.seekBox`, ±0.02°) and `EM.seekKeep` keeps it only if it is among the landmarks the map would draw (`refData`: bounded,
  **never a place carrying a local mark** — X-Plane, Eurocontrol, Little Navmap; SOG-0153), same identifier, same place; its
  position is then the base's. `find` returns no mark: the confirmation is the guard, not a supposition.
- **One landmark**: the view is centred on it (`EM.centre`, zoom 10 at least: it is drawn; the view no longer reframes itself, «
  Recentrer » comes back); it becomes the landmark touched (`s.ed.mapRef`) — said in the line of the tool, circled, « Ajouter comme
  point » offered. **Nothing is created.** A tool of pose in hand is dropped (« Sélection » again): the landmark found must be said.
  **Several**: one button each under the field (« Plusieurs repères : choisissez. »), written in place; typing forgets them.
  **None**, or less than two signs: a floating notification, the view does not move.
- A late answer (another search since, the workshop left) is dropped (`s.ed.seekTok`).
- **Not done**: the towns as places to go to; « Radiale et distance… » from a beacon.

### 7 tervicies. A route is reordered by two arrows on the chip chosen (18 Nov 2026; SOG-0444, the rests of lot P2 — lot D; noreg N106)

- **A chip is chosen by a touch** on its name (a button, `aria-pressed`; touched again, it is left; one chip chosen at a time:
  `s.ed.chipSel = { where, n }`, `where` = `'start'` for the route of the departure, else the drawer of the sheet). The cross still
  removes the place — and forgets the choice.
- **Under the chips, two arrows**: « ← Plus tôt » and « Plus tard → » move the chip chosen by one rank; the first cannot go earlier,
  the last cannot go later (the arrow is disabled). Before a chip is chosen, the line says how (« Touchez un lieu pour le choisir,
  puis déplacez-le par les flèches. ») and the arrows are not given. Nothing for a route of fewer than two places.
- **In place** (SOG-0449): a choice changes attributes only; a move rewrites the chips, **not the arrows** — the arrow pressed stays
  under the finger and is pressed several times in a row; the lines, what the pilot will read and the map follow by `edRefresh`.
- **In the route of the departure, the aerodrome of departure stays first and the aerodrome of arrival last** (the ergonomist, 18
  Nov: a route without its departure makes no sense). `ED.routeFree(route)` → `{ lo, hi }`, the ranks of the free places: «
  ORIGIN » at the head and « DESTINATION » at the tail are ANCHORED — their chips say their place only (no button to choose them,
  no cross: `data-chipfixed`), `ED.routeMoveStart` moves a free place among the free places only (the arrow that would pass an
  anchor is not given), a forged removal of an anchor does nothing, and a place added — « Ajouter un lieu… » or the « Tracé » tool
  — enters BEFORE the arrival (`ED.routeAddStart`). No arrows with fewer than two free places. A route of an old file that does
  not start with the departure or end with the arrival has no such anchor: it is shown as it is, never rewritten.
  **Defect corrected**: until this lot the cross of the departure (and of the arrival) removed it from the route, and a place added
  went after the arrival.
- **The onward route of a drawer is free** (its arrival is a place like another), with the same chips and arrows (`edDrawerChips`, `edChipsHtml`, `edChipMoveHtml`, `edChipsShow` are shared).
- The move is pure: `ED.routeMove(route, n, step, shown)` → `{ route, at }` — the place swaps with the nearest chip shown on that
  side (an entry the sheet does not show, a place the file cites that no longer exists, stays where it is); the same route when
  there is nothing to do. A move from the sheet is not a gesture of the map: « Annuler le geste » has nothing to give back after it.

### 7 quatervicies. The map of the workshop offline (18 Nov 2026; SOG-0444, the rests of lot P2 — rest 6; noreg N108)

- **The base now draws a local style offline** (SOG-0446, `modules/maps/lib/map_base.js`: `needsNetwork(style)`; BUGS SOG's D262):
  `startTiles` still gives `null` at once, offline, for the suite's background (a style address) — nothing is asked of the tile
  provider — and `editor_map.js` `start` then falls on its plain style (an object, no source, no glyph), which the base draws.
  Nothing was changed in `start`: the fall-back was already there, it now succeeds offline.
- **Everything else works on the plain background**: the mission drawn and named (the names are markers of the page, not glyphs),
  Sélection and the handles, the poses, Tracé, the landmarks of the base **already on the device** (AeroDB answers from the cache)
  and « Chercher un repère », « Vue du pilote », the trial of the keys.
- **The screen says it once per sitting** (`s.ed.plainSaid`), by a floating notification: « Fond de carte indisponible : la carte
  montre les lieux sur un fond uni. Tout le reste fonctionne. » — said too when, online, the tiles do not come (after
  `MAPB.wait`). The frame keeps `data-map="plain"`.
- **A hairline around the frame of the map** (the ergonomist, 18 Nov): one pixel, the colour of the suite's borders (`--sog-line`),
  square corners, inside the fixed size of the frame (`box-sizing: border-box`: nothing moves) — on a plain background of the
  colour of the page one did not see where the map ends. It is there with the suite's background too.
- **Still the sketch**: no WebGL, or MapLibre never loaded on this device (it is a file of the repository, declared `lazy`: kept
  by the page once the workshop has been opened online).
- **Not done**: coming back online does not bring the suite's background back in an open workshop (nothing reloads by itself):
  leaving the workshop and opening it again does.

### 8. What is NOT ported

The typed test positions; the YAML tree (level 4, stays in the V2); the ZIP of an operation and the several crews
of `coordination` (P5); the outside tile host of the standard OpenStreetMap layer.
