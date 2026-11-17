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

A pane beside the map, never a window over it: « Poser l'avion ici » by a touch, the time on a slider, the aircraft, its trail, the zone
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

« Atelier », « déroulé », « au départ », « tiroir 1, 2, 3… », « clé », « heure de repli », « zone de passage », « objet à trouver »,
« arrivée au terrain », « repère » (a landmark of AeroDB), « zone » and its « contour » (a zone that is not round), « essayer les clés »; famille and série as everywhere; never
« ids », « objet logique », « phase », nor an English screen name.

### 7. Lots, in order — each one read on its captures before the push

| lot | content | waits for |
|---|---|---|
| P1 (delivered, § 7 ter) | the screen in its new frame WITHOUT the map tools nor the drawers (the library's place is kept and shows nothing): the unfolding (A alone, the drawers of the file listed read-only), the sheet of part A in six groups, the foot; phone and wide; the six steps' cases replayed on the new screen | this specification read |
| P2 | the map as the place of edition: the six tools, drag, landmarks of AeroDB, no accidental creation | SOG-0446 |
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

**Left in `module.js`** (Features SOG's file; a follow-up for its owner, nothing breaks): the style rules `.ms-steps`, `.ms-edaside`
and the texts `edNext`, `edPreview`, which the screen no longer uses.

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
- **Not walked**: a zone or an object written INSIDE the part (they cite nothing); `trigger_object`, `trigger_actor` and the `object`
  of a rule — an object is not a place of the Lieux yet; it joins them with the sheet of a drawer (the objects become rows of the
  Lieux, « caché au pilote »), its identifier given by the workshop and never edited.
- **Still to come in P3**: the sheet of a drawer (the key, the texts, the onward route), « ＋ Tiroir », « Ce que le pilote voit »
  (imported from the session « Affectation »: `describe` of `drawers_view.js`), the objects in the Lieux, and « À compléter » for a
  drawer (no message, no briefing, a key that looks at the aircraft without a fallback hour, a key the reader cannot read).

### 8. What is NOT ported

The typed test positions; the YAML tree (level 4, stays in the V2); the ZIP of an operation and the several crews
of `coordination` (P5); the outside tile host of the standard OpenStreetMap layer.
