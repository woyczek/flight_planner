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
| the foot | « Enregistrer » and « Annuler » side by side, then « À compléter (n) » and its first point (§ 7 quinvicies) | « À compléter (n) » alone: a button that opens the named list (never a cut text) |

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
- **the foot** (`.ms-atfoot`, sticky above the tab bar): « Enregistrer » and « Annuler » side by side (§ 7 quinvicies), then, at
  the end of the bar, « À compléter (n) » — on a wide module with its first point; that button opens the named list INSIDE the foot,
  just above itself (opened at the end of the page, it was off the screen of a phone). « Suivante » is gone: a group is opened by its name.
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
- **Since SOG-0459** (§ 7 septvicies): a closed drawer is shown to nobody, so « Avant l'ouverture » says one fixed sentence — « Rien :
  le pilote ne sait pas que ce tiroir existe » — and `describe` of `drawers_view.js` is no longer called; « Après — tiroir ouvert »
  gives the title (without its rank), the message, the briefing and the onward route.

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

- **The shape is chosen in the sheet of the zone** (one button, so the sheet keeps its number of elements): « Changer en polygone » for
  a round zone — six vertices at its radius (`toContour`); a zone without a position or a radius says so in a notification — and
  « Changer en cercle » for a contour (`toRound`). The sheet of a contour says « Contour de n sommets : il se retouche sur la carte »
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
  « les six poignées sont entassées, personne ne les attrape »): « Changer en polygone », and choosing a zone with a contour — on the
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
  every drawer open. « À compléter » names it, under the Lieux, with the word of its kind — « La zone Z1 n'est citée nulle part : le pilote ne la verra pas »,
  « L'objet … », « Le point … », « Le rendez-vous … », « La cible … » (the key `uncited_<kind>`) — three
  at most (`ED.uncited(doc)` gives `[{ id, kind }]`, read by `ED.todo`). The rule lives once, in `editor.js`: `ED.pilotRows(doc, rows, n)`, which the
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

### 7 quinvicies. « Annuler » against « Enregistrer », and the question before leaving (18 Nov 2026; SOG-0454; noreg N109)

The user, after his first sitting in the workshop: « Annuler » was « mal placé, pas assez visible, pas cohérent avec les autres
interfaces » — a text link at the far end of the foot, after « Enregistrer » and « À compléter ».

- **The pair of every other form of the suite**: « Enregistrer » (primary) then « Annuler », a plain button, side by side — the
  form of a line of the registry (`regEditHtml` in `module.js`: « Enregistrer » / « Annuler »), the moves, the question of the
  frame (`ask`). « À compléter (n) » is pushed to the end of the bar (`margin-left: auto`): it is a state, not an answer of the
  form. At 390 the three stay on one line, on screen without scrolling.
- **Leaving asks when something would be lost** (`edLeave`, `edDirty`): the document of the workshop (`edDoc`) is compared with
  the file read or last saved (`e.base`) — for a new mission or a copy, with the document of its opening (`e.start`). The same:
  « Annuler » leaves at once, as before. Different: the question of the frame (`ctx.ask`) — since SOG-0486 the workshop keeps a draft, so it declares `{ kept: true }`
  (`ctx.unsaved`, `ctx.askLeave`) and the frame says so: « Quitter ? Vos changements restent en brouillon sur cet appareil. »,
  « Quitter » / « Rester ». Nothing is left without the yes.
  **Before this lot « Annuler » dropped every change without a word.**
- **Leaving by the frame** (SOG-0458, noreg N119; `edDeclare` in `editor_view.js`): the workshop declares its state to the frame
  with `ctx.unsaved(() => the workshop is open AND edDirty)` — at every opening (`edOpen`, the three modes; the function reads
  `s.ed` at the moment it is asked, so « Enregistrer » is taken into account at once). So the menu of the suite, the « Missions »
  tab or any other address of the module, and the browser's « Back » ask the SAME question (one text, the frame's: `T.leave` in
  `app.js`); « Rester » keeps the workshop and what was typed, the frame
  puts the address back. « Annuler » asks the frame's own question through `ctx.askLeave()` (SOG-0458, continued: the three texts
  `leaveAsk` / `leaveOk` / `leaveStay` the workshop used to copy are gone from `editor_texts.js`) and, once the answer is yes, closes the
  workshop and withdraws the declaration (`ctx.unsaved(null)`) before the redraw: the frame never asks a second time. « Dévoiler la mission complète » alone
  does not make the workshop « changed » (`edDirty` reads the document only). **Limit, said**: from Compagnie, a module of
  ANOTHER application (Carburant, which the frame opens in Pilote) is a page replacement, not a change of screen: the frame asks
  nothing there, only the browser's own warning of `beforeunload` applies.
- The cases that leave the workshop go through `ed_leave` (the question answered when it comes).

### 7 sexvicies. The block « carte de mission »: a background, a layer, a read-only mode (18 Nov 2026; SOG-0456; noreg N110, N111)

The user, after his first sitting: the map of the workshop is « très rapide », to be kept; a topographic view is needed for medical
evacuation and insertion, the RTBA and the airspaces for interception. The ergonomist: **one block**, on the map base, the same
code in the workshop (edition) and in READ ONLY (the Brief, the reader) — never a second engine, never the Map module embedded.

- **The background** (`editor_map.js`: `BASES`, `baseOf`, option `base` of `show`): « Rapide » — the chain of today: the suite's
  background, else the plain one; it works offline — or « Relief », the topographic style of the map base (`styleFor({ base:
  'otm-topo' })`, a host already in the policy of the pages; **no new host**). The chain of `start` is « Relief » (when wanted),
  the suite's background, the plain one. A background changed on a live map **restarts the map in the same host** (`restart`:
  the same fall-back as at the first start; the view is kept when the author had moved it). « Relief » that does not come —
  offline (`startTiles` gives `null` at once), or four tiles refused with none received (`reliefWatch`) — leaves the map in
  « Rapide », and the row says « Relief indisponible… » (`reliefMissing`); the choice stays.
- **The layer « Espaces »** (option `spaces`, `onSpaces`, `setSpaces`, `spaceFeatures`): the R, D and P zones and the RTBA
  (`azba`) of the aeronautical base, drawn by the zones layer of the map base (`zonesLayer`), posed BEFORE the author's layers —
  under the mission, and under again after a change of style. **Off by default, and nothing is read while it is off**: that is
  what keeps the map fast. On, when the view comes to rest at zoom 5 or closer, the screen is asked for the airspaces of the
  frame (`ctx.aerodb.airspaces({ bbox })`) and gives them back; the block bounds them (`spaceFeatures`: the type, `azba` exactly
  true, rings of 3 to 2 000 points within bounds, 8 rings per space, 400 spaces; no name goes to the map) and the row says how
  many are drawn. A wider view empties the layer and says « rapprochez la vue ». Tones: the RTBA and P « err », R « warn », D
  « muted ». **Asked of the map base** (BUGS SOG): an option `fill` of `zonesLayer` for outlines (its 25 % fill hides the mission
  under overlapping spaces); the block already passes `fill: 0.04`.
- **The author chooses, for HIS mission** (the row « Fond : Rapide | Relief » and the box « Espaces » under the map; `edLookHtml`,
  `s.ed.mapWant`): written in the file by `ED.withMapLook` — the bounded key `mission_map` (`docs/technique/FORMAT_MISSION.md`
  § 4 ter), only when it differs from what the file says. In place: the button pressed and the box are not redrawn.
- **The read-only mode** (`mission_map.js`: `readMap(slot, { doc, opened, mine, owner, ctx, tt, alive })`, `stopMap()` — **the contract
  is at the head of that file**): the block draws what `pilotView` keeps with the `opened` first drawers open — `opened` counts only when `mine === true` (the boolean, read strictly: absent, « true », 1, null mean no drawer open — closed on failure) — in mode `view` (a
  touch chooses nothing, no handle), in the background and with the layer of the file; the pilot changes them for the sitting —
  nothing is written, neither in the mission nor on the device. It brings its frame, its style and its row (« Fond », « Espaces »,
  « Recentrer »); it carries no `data-do`: the screen that poses it receives nothing. Called again after each draw of the
  screen, it is put back in the new slot — the same map. One mission map lives at a time in the module; out of the workshop,
  `edAfter` removes the map of the WORKSHOP only (`EM.editing()`).
- **Not a third mode**: the full view is « Ouvrir dans la Carte », the gesture of the screen that poses the block.
- **Measures** (18 Nov, the bench of this session: a visible page, the graphics card of the machine; **no real network** — the
  suite's background is the bench's empty style, the topographic tiles a local image: the cost of the drawing, not of the line):

  | state | first frame after the slot (3 openings) | a 3 s drag and six wheel steps |
  |---|---|---|
  | Rapide | 88 to 175 ms | 100 frames/s, worst frame 10.3 ms |
  | Relief | 121 to 152 ms | 100 frames/s, worst frame 10.6 ms |
  | Rapide + Espaces (173 spaces drawn of 300 seeded) | 129 to 155 ms | 100 frames/s, worst frame 10.8 ms |

  A background changed on a live map: 180 to 230 ms. Not measured, said as such: the real tiles of the two hosts on the user's
  line, a phone.

### 7 septvicies. The secret goes as far as the existence of the drawers (18 Nov 2026; SOG-0459; noreg N103, N113)

The user, 18 Nov (`organisation/SPEC_MISSIONS_TIROIRS.md` § 11.3): « l'existence même des tiroirs est cachée par défaut, à tout le
monde, auteur compris ; on choisit de dévoiler ». By default NOTHING says that a mission goes beyond its first objective: no count,
no badge, no title of a closed drawer.

- **The reader (part A, commit 1)** — `pilotView` (`docs/technique/FORMAT_MISSION.md` § 4 bis): `drawers` holds the OPEN drawers
  only, whole, with their rank; the stub of a closed drawer (`sealed`) is gone, `drawersRefused` is 0, `pilot` is `{ mine, opened }`
  (no `hidden` count). `ED.pilotRows` and `mission_map.js` no longer filter `sealed`.
- **The passage zone of a closed drawer is hidden by default**: the reader's `shown` is true only when the file writes
  `zone_shown: true` (the boolean). In the sheet of a drawer the box is « Montrer cette zone au pilote dès le départ », UNTICKED by
  default; ticked → `zone_shown: true` is written; unticked → the key is not written (a file that writes `false` keeps it until the
  box is touched: only what changes is written — `editor_drawers.js` `putKey`).
- **« Ce que le pilote voit »** of a drawer: nothing before the opening (§ 7 octies).
- **The workshop opens VEILED (part B, commit 2; noreg N114, N115)** — the author too discovers his mission by playing it, unless he
  chooses to reveal it:
  - **Who is veiled**: a mission that EXISTS, opened by « Modifier » or « Dupliquer », opens veiled (`s.ed.veil`), unless
    `state().fullView === true`, strictly (the box « Voir le contenu complet des missions » of the registry, which « Features SOG »
    will set in the state of the module; any other value veils — closed on failure). A created mission is whole. The rule is the
    pure `ED.veiledAt(mode, fullView)`; it NEVER depends on what the mission hides.
  - **What the veiled workshop shows**: in the unfolding, « Au départ » alone — no card of a drawer, no « ＋ Tiroir », no « Essayer
    les clés »; no « Vue de la carte »; in the Lieux, on the map and its labels, in the sketch, in the route of the departure and its
    « Ajouter un lieu… », in every list of places: only the places `pilotView` keeps with no drawer open (`ED.veilHidden(doc)`: the
    rows hidden at the departure, by their kind and their place in the file — `["zone:0", …]` —, taken at the opening and valid after a
    save: a new place goes to the end of its kind, a place of the file is never removed while veiled). « À compléter » says nothing of
    what is hidden (`ED.veilTodo`: the document without its drawers; « à placer » only for a row shown) and counts the visible only.
    A zone or an object never says « clé du tiroir n »; « + Cible » and « Proposer les cartes depuis les lieux » are not offered (the
    first would tell a hidden target by its absence, the second names the zones by their rank). The map stays editable (Sélection,
    Point, Tracé, Zone, Objet) on the visible.
  - **The veil is a filter of DISPLAY** — the rule of construction: the hidden rows STAY in `s.ed.places` at their rank (`ED.veilRows`
    turns them into null for the screen), never removed, never retouched (`data-i`, `mapSel`… do not move); the drawers are not
    loaded (`s.ed.drawers` stays null: they are not rewritten). Saving a mission that is not revealed keeps its drawers and its hidden
    places intact (N114 compares the YAML written with the file; it is red if the veil removed the rows instead of hiding them —
    checked by breaking the guard for one replay).
  - **« Dévoiler la mission complète »**: a button on EVERY mission opened veiled, whether it hides something or not (its presence must
    say nothing), in the card « Déroulé de la mission », in place of « Essayer les clés ». The frame's question: « Dévoiler la mission
    complète ? Vous ne pourrez plus la découvrir en la jouant. » — « Dévoiler » / « Garder le secret ». On yes, `s.ed.veil = false`: the
    workshop of today, whole; a mission that hid nothing (no drawer, no hidden row) says « Cette mission n'a rien de caché ». What was
    typed in the veiled sitting is kept; revealing is not a change (`edDirty` reads the document only).
  - **One rule for every place of a mission that exists** (the ergonomist: no refusal case by case, it would be a clue): texts and
    positions are retouched; removing a place or changing its identifier asks to reveal — the same sentence everywhere, as a
    notification: « Retirer un lieu ou changer son identifiant demande de dévoiler la mission. » A place added in the veiled sitting
    (`i === -1`) is removed and renamed freely.
  - **The identifier of a new place** (`ED.nextPlaceId`, in every mode): the GREATEST number of its kind already carried — rows of the
    sitting and places of the file read, hidden ones included — plus one. A gap is never filled, so a gap proves nothing (« ZONE-2 »
    proposed in a veiled workshop no longer tells a hidden ZONE-1).
  - **« Dupliquer »** a veiled mission copies everything, drawers included; the copy stays veiled.
  - Guards against a forged page: the gestures of the trial and of the drawers do nothing while veiled (`VEILED_OFF`), a hidden row is
    never opened nor retouched (`edHid`), « Ajouter un lieu… » takes only the token of a row shown.
  - **A reference to a hidden place** (noreg N116): an event of the chronology placed on a place that is not shown displays its list
    « lieu » as an event without a place (the empty option chosen, the visible places alone) — on screen only: the row of the sitting
    keeps the value of the file, written back as it is, until the author chooses a place himself (his choice replaces it; a hidden one
    cannot be chosen, even by a forged page). The other references were checked: the route of the departure and the centre of a map cite
    a place, which makes it visible; the keys, stops and onward routes of the drawers are not shown while veiled; participants and the vertical profile are not references the workshop shows.
  - **Removing a place says nothing of a drawer** (the Security session's retouch; noreg N117): a place added in the sitting can be
    given any identifier — the one a hidden drawer cites (« ZONE-1 » is guessed) would have made « Retirer » say « ZONE-1 est encore
    cité par : clé du tiroir 2 », a probe. While veiled, `removePlace` reads who cites the place in the document WITHOUT its `phases`
    (`edCiteDoc`): only the route, the maps, the chronology, the profile and the alerts are counted, before the question and in the
    sentence. The saved file keeps the reference of the drawer (`withRefs` only follows the places of the file). Checked for the same
    leak: « À compléter » (`ED.veilTodo`, the document without its drawers: no dead reference, no drawer without key or point), the line
    of a place (« clé du tiroir n » not said while veiled), renaming a new place (no message): nothing else names a drawer.
  - **The limits, said** (asked by the Security session): it is a secret of the SCREEN — the file stays readable by whoever opens it,
    and the V2 shows everything; the identifier proposed for a new place jumps above the greatest number of the file, hidden ones
    included (if the visible is ZONE-1 and ZONE-6 is proposed, a ZONE-5 or more exists or has existed); free texts (a title, a
    description, the text of an event) say what the author wrote in them; the attributes `data-place` / `data-i` of the page carry the
    ranks of the file (a gap in them tells a hidden row).

### 7 novovicies. The map opens without a located place, and a lower-case aerodrome is read when the base knows it (18 Nov 2026; SOG-0469; noreg N118)

The user, 18 Nov, on one of his real missions: the workshop had NO MAP (« Aucun lieu placé : la carte est vide », « Sans carte, les lieux
se placent par leurs champs »), the departure and the arrival « à placer ». His aerodromes are written in LOWER case and carry no
coordinates. Two causes, both confirmed by case N118 (red before, green after):

- **The code was read in capitals only, and four letters made a code.** The position of a departure or arrival the file does not
  locate is asked to the aeronautical base by its code, found by `/^[A-Z]{4}(?= ·|$)/` (in `edMapFeats`, in `thumbHtml`, in
  `mission_map.js` `featsOf`); `placeText` read `icao` and the head of the name in capitals only. Now: a code written in CAPITALS
  (« XTST · Base », « Base (XTST) ») or declared in the field `icao` (in any case) is a code, as it always was; a code in lower or
  mixed case (« xtst », « xtst · base sud », « Base Test (xtst) ») is one ONLY IF THE AERONAUTICAL BASE KNOWS THAT AERODROME
  (`ctx.aerodb.aerodromes({ icao })`): the answer is noted (`ED.noteAerodrome`, by `adPosOf` of the workshop and `adPos` of the
  block) and `placeText` / `placeIn` read with it; otherwise the text stays AS WRITTEN (« metz », « Piste (nord) », « lyon »: no
  capitals, no position, nothing written). Without a base (`ctx.aerodb` absent) nothing in lower case is ever a code. The
  candidates (`ED.codeCands`: the head, the parentheses, whatever the case) are asked at each drawing for the departure and the
  arrival, as written in the file and as typed in the Cadre; the base answers after the first drawing, so the Cadre shows the text as
  written and, at the answer, the code in capitals — `edRecode` replaces, ON THE SPOT (the line of the group, the map, the row of the
  Lieux), only a departure or an arrival the author has not touched; a field being typed is never replaced. What is WRITTEN is
  untouched until the author edits the field (the Cadre unchanged writes nothing; « xtsv » typed is written as typed while the base
  does not know it, `{ name: XTSV, icao: XTSV }` once it does). Read before → after (the base knowing XTST): `name: xtst` no → yes;
  `name: "xtst · base test"` no → yes; `icao: xtst` no (no row at all) → yes; `name: Base Test (xtst)` yes — the Cadre said
  « XTST · Base Test (xtst) » — → yes (« XTST · Base Test »); `name: metz`, `Piste (nord)`: as written, before and after.
- **A mission with no located element had no frame, so no map.** `mapFeatures` now ALWAYS gives a frame: that of the located
  elements, else — `wide: true` — the LAST FRAME SEEN in the workshop during the sitting (the view of the live map, kept in a variable
  of `editor_map.js` each time it stops moving and when it is removed; written nowhere), else the start view of the Carte of the suite,
  the `START_VIEW` constant of `modules/maps/lib/map_base.js` (the one the Map itself starts on), imported by `editor_map.js` and read
  as it is — never copied into the workshop. A frame of this kind is fitted with no padding
  (it is already a view). `show()` and `start()` are unchanged; the first place set by a tool reframes the map unless the author
  has already moved the view. The sketch « Aucun lieu placé » stays hidden while the map is alive; in Sélection the line under the
  tools says the empty state — « Aucun lieu : choisissez Point, puis touchez la carte. » — in place of « Touchez un lieu pour le
  choisir… », which comes back as soon as a place is located; the tools (Point, Zone, Objet) are given on the empty map. A Zone set
  on it takes the usual radius (span / 8, at most 100 km).
- **The read-only block** (`mission_map.js`) keeps its behaviour — no located element, no map, the slot stays empty — except that an
  aerodrome the base knows locates the mission: the map is then shown, framed on it, as soon as the base answers (the block places
  itself then; before, it was drawn only at the next drawing of the screen).
- **Date of the defect** (`git log -S`): the capital-only regex came with the sketch of the preview, 14 Nov (9422d3925); it became a
  defect the night of 18 Nov, 01:57, when the map of the workshop took it over and returned without a frame (`if (!slot ||
  !feats?.box) return;`, e872defb2, SOG-0444), and the read-only block copied it at 10:04 the same day (06ceade63, SOG-0456). Before
  18 Nov the workshop had no live map at all, so nothing regressed on the map; the sketch did not read lower case since 14 Nov.
- Not changed: `frame/lib/mission.js` `placeOf` / `icaoOf` (the reader still finds the code only between parentheses at the end of
  the name; `originIcao` for `name: xtst` or `icao: xtst` stays empty there).
- **The rule that replaces the « Limit, said » of the Security session** (« Piste (nord) » was taken for a code, the reader putting
  the text in capitals before it looks): a word of four letters between parentheses at the end of a name, or at its head, is a code
  only if the base knows it (or if it comes from the field `icao`, or is written in capitals — the reading that existed before
  SOG-0469, kept so that a file or a typing in capitals does not depend on the base); otherwise the name stays whole, in the field and
  in the file. « Piste (nord) » stays « Piste (nord) » unless the base knows NORD.

### 7 tricies. Départ and Arrivée take the aerodrome field of the suite, with its completion (18 Nov 2026; SOG-0465; noreg N120, N118)

The user, 18 Nov: « le champ adep / adest avec complétion, le même que dans fuel. Le même code. La même fonction. C'est un module
factorisé. » The two fields of the Cadre (both forms of the group: the full Cadre and the reduced Cadre of a link flight) are now THE
aerodrome field of Fuel, moved into `frame/lib/ad_field.js` (and `frame/lib/suggest_list.js`) by the Features SOG session.

- **Reused as is** (`createAdField`, nothing copied nor rewritten): the completion (two characters at least, seven proposals at most,
  by the code, the name, the country or a town), the list under the field (↑ ↓ Entrée Échap, touch, closed when the field loses the
  focus), the line « XTST — Base Test » under the field (`data-adline`, its height reserved), `known(code)` and `nameKnown(code)`.
  Its texts are its own, in four languages. The base comes from `ctx.aerodb` only.
- **Written by the workshop**: the marking (each input in its `<label>`, ONE `[data-adsug]` list in the row `.ms-adrow`, positioned;
  its styles in `AT_STYLE`, without rounded corners); `edAd(s)`, one block per mounting of the workshop (created at its first need —
  the drawing of the Cadre, `edAfter`, a typing —, stopped by `edAfter` outside the workshop and at unmounting); the listeners.
- **The listeners**: `module.js` gives the workshop only `input`, `change` and the click of an « ed… » button. The workshop puts its
  OWN listeners on `s.el`, once per mounting (`keydown` → `onKey`, `focusout` → `onFocusOut`, `pointerdown` → `onPointerDown`,
  `click` → `onClick`: a proposal is not an « ed… » button, so `edClick` never sees it), and `edInput` gives the typing to the block
  first (`onInput`) before doing what it did. `AD.paint()` after each drawing (`edAfter`) and after `edRecode`. A `focusin` listener
  lifts the field to the top of the view when the seven proposals have no room under it before the foot (a phone, the Cadre low in the
  sheet): a reaction to the focus, nothing rewritten.
- **What the field carries**: the CODE of an aerodrome alone (`ED.fieldText`: the code `codeIn` reads — written in capitals, or known
  to the base), its name under it; the TEXT as written for a place that is not an aerodrome (a heliport pad, a hospital): free text
  stays possible. What the Cadre keeps (`e.cadre.dep`, `arr`) and what is written do not change form (`ED.withCadre`: `origin:
  { name, icao, lat, lon }`). `edAdValue`: the field still saying what the Cadre keeps → nothing changes; the aerodrome of the file
  typed again → its text as written (nothing written); a choice of the list → the code, noted as known; a code of four signs typed →
  kept as typed, then, if the base knows it (`AD.known`), in CAPITALS; in both cases, once the base has given the name, the Cadre
  keeps « XTST · <name> » and the file gets `name: <name> (XTST)`, `icao: XTST`; any other text → as typed (« metz » stays
  « metz »). Nothing is written while the field is not touched (« Enregistrer » untouched writes nothing, N120).
- **Not changed**: `adPosOf` (the position of an aerodrome for the map and the sketch, by `aerodb.aerodromes`) stays — the block
  gives the name and whether the base knows the code, not the position; no function of the workshop became useless. The four-sign
  patterns of `editor.js` and `editor_view.js` stay: `isCode` (the heliport code « LF418 ») is not yet on this head — a follow-up.
- **Other aerodrome fields of the workshop**: none. The key « arrival » of a drawer chooses a place in a list (Destination, Départ,
  the places), the rows Départ and Arrivée of the Places carry only their latitude and longitude.
- Known limit of the block: a free name of four letters (« metz ») shows « inconnu » under the field, the block taking any four signs
  for a code to look up.

### 7 untricies. A handle moved redraws at once what depends on it (18 Nov 2026; SOG-0478; noreg N121)

The user, 18 Nov: « quand on déplace le centre d'une zone, un objet, autre poignée, il faut un redraw. de la même manière que quand on
change le diamètre d'un cercle. » Until now only the radius showed its result while the finger was down (a preview circle of the base);
the centre of a zone, an object, a point or a vertex showed a small ghost dot and the circle, the outline, the route and the rows of the
Lieux stayed at the old place until the release. Now **one single path serves every handle** (`done` in `editor_map.js`, then
`edMapGesture` in `editor_view.js`): at each frame of the gesture the rows take the position of the finger WITHOUT keeping anything
(the state of before waits in `e.dragBase`), and what depends on them is redrawn in place at most once per frame — the map elements
(circle, outline, route, labels), the line of the Lieux (the rows are replaced only when they changed), the counts and the preview;
the view does not reframe under the finger (the frame is taken again at the end). At the release the state of before is given back to
the same function as ever: one « Annuler le geste » per gesture. The point between two vertices still waits for the end (placing a
vertex changes the handles); a gesture dropped without an end gives back the rows of before.

### 7 duotricies. « Enregistrer » keeps the unfolded group on screen (18 Nov 2026; SOG-0485; noreg N122, N54)

The user: « Quand on clique sur Enregistrer, le contenu (brief, description) de la mission est vidé. Perdu. » After a save, `edSave`
takes the saved document as the new base (`e.base`) and drops the rows of the sitting (`teams`, `story`, `risks`, `events`: `null`)
while the group stays unfolded; those rows were read only when a group was touched (`edstep`), so the Récit showed EMPTY fields (the
Équipes, Risques and Chronologie: no row) and a field typed afterwards was ignored (`edInput` writes into `e.story` only when it
exists): « Enregistrer » then said « nothing changed » and leaving asked nothing — the typing was lost. The Lieux had the same defect,
fixed alone on 18 Nov (37bf93ab5). Now `edLoadStep(e)` reads the rows of the unfolded group (from the file, once; rows already in the
sitting are kept) at the opening of a group AND after « Enregistrer ». The file was not emptied by this path: `withStory` writes only
the fields that differ from the file (audit 182), so a mission saved from an empty-looking Récit kept its texts. Origin: the Récit,
13 Nov (ce72c9c25), the Équipes the same morning (c138087b3); moved unchanged to `editor_view.js` on 17 Nov (c2a6960c1).

### 7 tertricies. A helistation in Départ and Arrivée: `isCode` of the common field (18 Nov 2026; SOG-0465; noreg N123, N133, N120, N118)

Features SOG: the common field knows the helistation code (two letters and three digits, « LF418 »; AeroDB pattern `^(?:[A-Z0-9]{4}|[A-Z]{2}[0-9]{3})$`)
and exposes `isCode(v)`. The workshop copies no pattern.

- **`editor.js` is pure** and holds no field instance: it imports `{ isCode }` from `frame/lib/ad_field.js` (the pure function Features SOG exports,
  commit 7fd7a29de; it replaces the instance without a screen made first, bd6d7cfb3) and re-exports it (`ED.isCode`). `headCode`,
  `tailCode` (the code between brackets at the end), `placeText`, `codeIn`, `fieldCode`, `noteAerodrome` and `codeCands` read a word of four or five
  signs and ask `isCode` (a word without any letter is never a code). `mission_map.js` gets the same through `ED.adCodeOf`.
- **`editor_view.js`**: `edAdValue` asks `ad.isCode` of the field instance; `adPosOf` asks `ED.isCode` (the same function).
- **The reader asks it too** (`frame/lib/mission.js`): it imports the same `isCode` (`ad_field.js` has no dependency on the reader, no DOM at load); `icaoOf`
  reads `(XT123)` at the end of a name as a code (a word of four or five signs with a letter, `isCode`), and `originIcao` / `destinationIcao` of the registry
  entry take an `icao` written `XT123` (`placeIcao`). A year « (2024) » is still no code. N133 (pure; red before) and the bench check on `icaoOf`.
- **Not changed**: `modules/missions/choice.js` (`depIcao`), not ours.
- Written file: unchanged in form — `origin: { name: « <name> (XT123) », icao: XT123 }`. N123 (invented helistation XT123): proposed, chosen,
  the name under the field, lower case put in capitals, written, framed on the map.

### 7 quatertricies. A point of the base becomes a place of the mission, by ONE function (18 Nov 2026; SOG-0480, SOG-0481, SOG-0495; noreg N124, N125, N126, N100)

The user: « un turning point doit pouvoir être un point quelconque aerodb (LF485, par ex., ou REN) » (SOG-0480); with a landmark of the base chosen on
the map, « + Point tournant » and « + Cible » add THAT point (SOG-0481); a point named by its code stayed « à placer » without coordinates (SOG-0495).
The three gestures call ONE function, `edPlaceFromBase(s, e, { kind, at, code, lat, lon })`: the place takes the **position of the base** and the **code
as its name**; the identifier (`PT3`) and the format of the file do not change (`id`, `name`, `lat`, `lon`). With `at` < 0 it makes a new row of the
kind (`ED.newPlace`, one gesture to undo, a full kind: a notification); with a row rank it retouches that row and the open sheet says it.

- **SOG-0480 — the field (retouched the same day, the ergonomist: no field apart).** The NAME of a turning point, a target or a rendez-vous
  (`input[data-k=edplname][data-f=name]`; not the zone, not the object, not the departure and arrival rows) IS the common field with `points: true`
  and `near()`, like Départ and Arrivée: one element less in the sheet, the same gesture everywhere. The first version had a field « Point de la
  base » apart (`edptbase`); it is gone, with its texts. It is a SECOND instance of `createAdField` (`edAdPt(s)`, created and stopped with the
  first, `edAd`/`edAfter`): `points` and `near()` belong to the instance (Départ and Arrivée stay aerodromes only). The list is searched in the sheet
  (`data-adform`), not in the whole workshop, so the two lists never meet; the four listeners of the workshop go to the instance whose field (or
  list) is the target. `near()` = the position of the open place if it has one, else the centre of the map of the workshop (`EM.centreOf`), else
  the departure. `keys` are `data-k` values and the place fields all share `data-k="edplace"`, so ONLY the Name of these places carries its own
  `data-k="edplname"` (`data-i` and `data-f=name` are kept, so the selectors and `edPlaceFromBase` find it by `data-f`); `edInput` reads it in the
  same branch as `edplace` (`edPlName` first). Free text typed in the Name stays as it is and nothing is written until a point is chosen. A
  CHOICE (`isPicking`) gives `positionOf` → `edPlaceFromBase` (code in the Name AND the position of the base, same format of file); a chosen
  aerodrome has no position in the list, so `edNameBase` asks for it as for a typed code. The `change` that follows a choice does nothing more
  (the place already has a position, `edNameBase` returns at once). No `data-adline` under the Name: the block names a code of four signs or a
  helipad list code, not a point of the base.
- **« Ajouter comme point » and this field**: the same function and the same result (name = code, position of the base). The button takes the landmark
  touched on the map; the Name takes a code typed or chosen by the author; neither writes anything on its own.
- **SOG-0481.** `edplaceadd` (« + Point tournant », « + Cible ») with `edMapRef(e)` true calls `edPlaceFromBase` with the landmark; `edrefadd` does the same
  (the code it had copied is gone). Without a landmark: a new place « à placer », as before. The position of a landmark is the one the map gives (its
  rendered point: the fifth decimal may differ from the base, 44.6999 for 44.7).
- **SOG-0495.** Reproduced by: « + Point tournant », a code typed in its Nom (a reporting point, an aerodrome, in lower case too), Tab — the place stayed
  without position. Now the `change` of the Nom of a point, a target or a rendez-vous WITHOUT position and with one word asks `aerodb.coordsAll` (nearest
  first) and `edNameBase` gives the place the position and the code. A place that already has a position is never moved; a name the base does not know
  changes nothing; the answer is ignored if the name changed meanwhile. The identifier field is not read as a code.
- **The line of a place says its position at once** (noreg N128). The title and detail of each row of the Lieux were written only by the redraw of a gesture, so a
  place taken from the base said « à placer » until « OK ». `edRefresh` now writes them in place for every row, from the row being edited (the same path as the
  rest of the redraw, SOG-0478); the open sheet is not touched.
- **A point of the base is taken only when bounded** (security session; noreg N136). The base is a file of the repository, not trusted: `edPlaceFromBase` refuses first (returns -1, no place made, nothing written) a latitude or longitude that is absent, not finite or out of bounds (|lat| > 90, |lon| > 180), and a code that, trimmed and in upper case, does not match `^[A-Z0-9][A-Z0-9 ./-]{0,23}$`; the place's name is that cleaned code. The three gestures go through it.
- Veiled workshop: nothing to add (hidden rows are never touched, `edHid`).

### 7 quinquetricies. The unfolding is a vertical list; « ＋ Tiroir » opens the choice of the type (18 Nov 2026; SOG-0467; noreg N129, N134, N73, N78)

The user (SOG-0467): « Ta maquette étire les tiroirs en largeur, la mienne en hauteur ; je préfère réduire le texte secondaire et étirer en
hauteur » and « Le + qui cache le nouveau type est probablement suffisant : concis, il ne fait apparaître l'information qu'au moment où on en a
besoin ». The ergonomist (18 Nov, 11:26): « ＋ Tiroir » opens the choice of the basic brick — the kinds of key — and the drawer is born with it.

- **The list (reused: the list rows of the suite).** `edFlowHtml` renders `f-list` and `button.f-item` — the rows of the list of missions
  (`ms-mrow` in module.js) and of the frame (`frame/design/primitives.css`): « Au départ » (its two ends in one line), one drawer per row (its
  mark ✓ / !, « Tiroir n · title », its key in ONE secondary line), « ＋ Tiroir » last. 0 to 12 drawers; the chosen row is marked
  (`aria-current`); touching a row opens its sheet (`edsel`, unchanged). No sideways scroll at any width: the horizontal row (`.ms-atflowrow`,
  `scroll-snap`) and `edShowSel`, which scrolled it, are gone. The tags « visible » and « tiroir scellé » (.75 em, under the small size of the
  suite) are gone: the mark and the rank say it. Veiled (SOG-0459): « Au départ » alone and « Dévoiler la mission complète », unchanged.
- **The chosen sheet comes on screen** (the relay of the ergonomist: at 1280 the sheet stayed under the frame of the Lieux, out of sight). After
  `edsel`, `edSheetShow` looks at the top of the sheet (`[data-atsheet]`): under the header or near the foot of the workshop, it calls
  `scrollIntoView({ block: 'start' })` — the one gesture of the aerodrome field (`edAdRoom`), the margin under the header written in CSS
  (`.ms-atsheet{scroll-margin-top}`); a sheet already seen does not move. N134 (red before: sheet at −106 px at 1280, −62 at 390).
- **The choice of the type (new: one component).** `edKindsHtml(s, where, cur)`, the SAME under « ＋ Tiroir » (`s.ed.kinds = 'new'`) and in
  the sheet of a drawer (`'drawer'`, opened by touching the key in force, `data-kindcur`; the `<select data-f=key>` is gone). One row per
  entry of `DR.TYPES` — `[{ key, judged }]` in editor_drawers.js, a list to lengthen (the catalogue of bricks by families will come into it;
  it waits for the user) —, the key in force marked (`aria-pressed`), « Annuler ». A kind the flight does not judge yet says « s'ouvre au geste
  ou à l'heure de repli » in one secondary line, never hidden (`dwNotJudged`); today the five kinds offered are judged, so the line only shows
  on the key in force of a drawer whose key the flight does not judge (`MS.notJudgedYet`). Touching a type: under « ＋ Tiroir »,
  `DR.blankDrawer`, then `DR.keyed(row, key, places)` — the guess the old list of keys made (the first zone, the first object, the arrival at
  the destination 1 NM / 30 kt / on the ground, the hour after take-off), moved from `edDrawerInput` into editor_drawers.js so both paths
  share it —, and the sheet opens with its title in hand; in a sheet, the key changes (the same key: nothing). « ＋ Tiroir » touched again,
  or « Annuler », closes without creating anything. Twelve drawers: « ＋ Tiroir » is not offered (as before; a forged touch says « Douze
  tiroirs au plus. »). `edkind`, `edkindopen` and `edkindoff` do not play in the veiled workshop (`VEILED_OFF`).
- **What the workshop writes, what the flight judges** (read in `modules/missions/drawers.js` `follows` and `frame/lib/mission.js`
  `notJudgedYet`). The five kinds the workshop WRITES are all judged in flight: the pilot's gesture, an hour (`time`), a passage zone the
  pilot crosses himself, a fixed object, an arrival without escort. NOT judged yet: the conditions of version 1.1 (`trigger_condition` of kind
  `hover`, `landing`, `overflight`, `sequence`, `event`), a zone crossed by a target (`trigger_actor`), a moving object, an arrival with an
  escort (`escort_min_sec`). The workshop only KEEPS these (key `kept`), so they are not offered. To write: `hover`, `landing`, `overflight`
  need their fields in the sheet (a point or an object, then radius, duration, gap, speed and heights — the reader `holdRule` refuses a rule
  with one missing; `hover` alone has six numbers), `sequence` an editor of its steps (one to ten rules), `event` an event identifier and the
  drawer that sends it (`emit_event`).
- Cases: N73 now checks the list (the « ONE row that scrolls sideways » of SOG-0444 is replaced); N78 changes the key by the choice
  (`dw_key`) and reads the key in force from `data-kindcur`; N129 is new.

### 7 sextricies. « Lieux » at the head of the right column, in a frame (18 Nov 2026; SOG-0472; noreg N130, N50, N54, N72, N73)

The ergonomist's decision (SOG-0472): « Lieux » goes to the HEAD of the right column, in a frame, with a list of fixed height that scrolls; the
fields of the chosen place under the list; map and list linked both ways; the column no longer scrolls to find a place; on a phone the list comes
under the map.

- **The frame** (`edPlacesCardHtml`): the mark ✓ / ! of the step, « Lieux », its line (`data-mark="places"`, `data-line="places"`, kept up to date
  by `edRefresh` like the other groups), then `edPlacesHtml` in the same `.ms-atbody` as a group (its field rules apply). The sheet of the
  departure keeps its five other groups, folded one at a time (`ED.STEPS` is unchanged: « À compléter » still names the step « Lieux »). The frame
  shows on the departure's sheet and on a drawer's sheet, not during a trial of the keys (the trial pane takes the column, as before).
- **The list (reused: the rows of `edPlacesHtml` and its rows-only mode of SOG-0478).** `[data-pllist]`, a fixed `max-height` (`min(36dvh,
  264px)`) that scrolls in itself (`overflow-y: auto`, `overscroll-behavior: contain`). Each row is ONE button (`.ms-plpick`, `data-do="edplace"`,
  its badge, its name, its detail line); the « Modifier » link is gone (touching the row is the gesture). The chosen row is marked
  (`aria-current`: the open place, else the place chosen on the map). The fields of the chosen place come UNDER the list, in `[data-edplaces]`
  (the same form as before). The rows are read from the document when the sitting has none yet (`e.places || placesOf(edDoc)`: the ranks are
  those of `edPlaces`); every path that changes the rows (open a row, add, remove, the route list) first creates them with `edPlaces`.
- **Map and list, both ways, ONE path of redraw** (SOG-0478 unchanged: `draw`, `edRefresh`, `edLive` — the live gesture now replaces the rows of
  `[data-pllist]` only). A place touched on the map (`edMapPick`) chooses and opens its row; after the draw, `edPlShow` (called by `edAfter`) puts
  the list back where it was (`e.plTop`, remembered on its own scroll) and brings the chosen row into view INSIDE the list — only `scrollTop`
  changes, and only when it must; the page and the column do not scroll (the old `scrollIntoView` is gone). `edMapPick` no longer switches the
  sheet to the departure nor folds the open group: the Lieux are always on screen. A row touched chooses the place on the map (`mapSel`, as the
  « Modifier » link did). « Créez-le dans les Lieux » (a drawer without zone or object) brings the frame into view.
- **On a phone**, one DOM, the order in CSS: `.ms-atgrid` is a column, `.ms-atmain` and `.ms-atside` are `display: contents`, and the blocks are
  ordered map, Lieux, unfolding, sheet. From 850 px the two columns come back (the left one sticky, as before).
- Cases: the taps on the step « Lieux » become `ed_places(c)` (the frame is there); N50 reads the six steps from their marks (the Lieux first);
  N54 opens and closes a place instead of the group; N72 and N73 take another group for « one click » and « one at a time »; N130 is new.

### 7 septemtricies. The tools of the map: names, the shape of « Zone », « Rétablir »; the icons wait for the set of the suite (18 Nov 2026; SOG-0471 points 1 to 3; noreg N131, N93, N95, N118)

The user (SOG-0471): the tools of the map become ICONS of the suite (pointer: Sélection; black disc: Point; two strokes and three points: Tracé;
circle or polygon: Zone; a figure: Objet; « Recentrer » the icon of the Carte; « Annuler le geste », « Rapide », « Relief » too), each with its
name read and as a tooltip in four languages; « Zone » carries the shape in force, changed by a long press and by a second touch; « Rétablir »
next to « Annuler le geste ». Point (4), the third background, waits for the ergonomist (Q-0107): not touched.

- **One button for every control of the map** (`edIconBtn(icon, name, attrs)`): the icon of `frame/lib/icons.js` (`IC.svg`, read only) or the
  name written, `aria-label` and `title` = the name (the texts of the workshop: `atTool_*`, `atMapUndo`, `atMapRedo`, `atMapFit`, `atBase_*`).
  The icons are named in `ED_ICONS`: `pointer`, `dot`, `route`, `circle`, `polygon`, `person`, `undo`, `redo`, `target` (« Recentrer »: the
  same source as the Carte, `modules/maps/screen.js`), `map` (Rapide), `mountain` (Relief). **The set of the suite has `undo`, `target` and `map`
  only today**: `edIcons()` is all or nothing — while one icon is missing every button keeps its written name (never a mixed row), and the day
  V3 Frame adds the eight missing ones (`pointer`, `dot`, `route`, `circle`, `polygon`, `person`, `redo`, `mountain`), the rows turn to icons
  with nothing else to change. The tool in hand stays marked (`aria-pressed`).
- **« Zone » carries its shape** (`s.ed.zoneShape`: `round`, the default, or `contour`; `data-shape` on the button). Its name and tooltip:
  « Zone (cercle) — Changer en polygone » / « Zone (polygone) — Changer en cercle » (the user's words, Q-0110: `plToContour` / `plToRound`). A
  second touch on « Zone » already in hand changes the shape (it used to drop the tool; « Sélection » drops it); so does a long press
  (`edToolHold`, half a second, on `pointerdown` among the listeners of the workshop; the click that ends it does nothing more). The button is
  updated in place (`edZoneShow`: only what changes). A zone posed in polygon shape is born as a contour — `ED.toContour` of the round zone
  just posed, ONE gesture to undo; the line under the tools says it (`atHint_zoneContour`). The sheet of the zone keeps its shape button.
- **« Rétablir »** (`edmapredo`, after « Annuler le geste »): a second `createUndo` of the socle (`s.ed.mapRedo`) holding the SAME states
  (`edMapSnap`, the former body of `edMapRemember`) — no other memory of the state. « Annuler le geste » pushes the state after onto it; « Rétablir »
  pops it and pushes the state before back onto « Annuler le geste »; both restore through `edMapBack` (the former body of `edmapundo`). Any new
  gesture (`edMapRemember`) and any retouch of a sheet (`edUndoClear`, in place of every `mapUndo.clear()`) empty it; « Enregistrer » too.
- Cases: N93 reads the name of « Recentrer » from its `aria-label`; N95, N108 and N118 count « Rétablir » in the row; N131 is new.

### 7 octotricies. Less text: cut rather than shrink (18 Nov 2026; SOG-0467; noreg N132, N106)

The ergonomist's opinion, which is the rule (SOG-0467, point 3): a sentence of explanation stays on screen only for an EMPTY state, an ALERT or a
QUESTION; every other one leaves the screen for the help « Comment s'en servir » (the chapter of the editor, anchor `missions-editor`). At most ONE
line of secondary text per group — a card, a group of a sheet, a sub-group with its own title (`.ms-edsub`: the route of the departure, the maps of
the Chronologie), the fields of a place (`.ms-plform`), the line under the tools of the map (the line of the tool is a state instruction: the
line allowed to its group) —, at the small size of the suite (`f-muted`, `--sog-size-s`), never smaller. No alert, no empty state, no question is
removed.

- **Measured, not eyeballed** (N132, `_TEXT_RULE` in missions.py): in every state of the workshop at 390 and 1280 — veiled, whole, the map, the
  choice of the type, each group of the sheet, each place open, the sheet of each drawer with its groups and the choice of its key, the trial, a new
  mission — the visible `.f-muted` and `small` elements with text are counted per closest group (`.f-card`, `.ms-atgrp`, `.ms-dgrp`, `.ms-edsub`,
  `.ms-plform`, `.ms-atmaphintrow`: a group added with one of these classes is measured too). Not secondary text: a field label (`label`, `.ms-lbl`
  — « Fond »), the data of a row of a list (`.f-item`, `.ms-plrow`, `.ms-edteam`, `li`, `.ms-chip`), what the pilot will read (`.ms-pilot`), the
  value line of the aerodrome field of the suite (`.ms-adname`), the sketch. No secondary text is smaller than a probe `p.f-muted`.
- **What changed to hold it.** The line that says what a group contains shows only when the group is folded (`.ms-atline` hidden in an unfolded
  `.ms-atgrp` / `.ms-dgrp`). The Cadre says one indication at most: in a mission being modified « l'ancien est gardé » when its identifier changes,
  otherwise nothing; for a new mission or a copy « suivante : n » under Série. « cible mobile » joins the identifier line of a moving object. A
  Chronologie written as a text says only « La chronologie de ce fichier est un texte… » (not « Aucun événement » with it). The maps of the
  Chronologie are a sub-group (`data-edmapsgrp`). The tags of « Ce que le pilote voit » (.75 em) and the state of a drawer during a trial (.85 em)
  take the small size of the suite. The arrows of a route lose the line that said how to use them (`data-chiphint`); N106 checks that it is gone.
- **The sentences removed from the screen, and where the help says them** (`modules/missions/help/{fr,en,de,es}.md`, `missions-editor`):
  1. « Ce que le pilote lit au départ, puis les tiroirs, dans l'ordre. » (the unfolding) — « le déroulé, une liste de haut en bas (« Au départ »,
     puis un tiroir par ligne… ».
  2. « Ce que le pilote lit au départ. » (the veiled unfolding) — « l'atelier ne montre que ce que le pilote voit au départ ».
  3. « Ce que le pilote lit avant de partir. Six groupes ; chacun dit son contenu en une ligne. » (the sheet) — « la fiche du départ, ce que le
     pilote lit avant de partir, en cinq groupes… Chaque groupe dit son contenu en une ligne ».
  4. « Ce qui range la mission : sa famille, sa série, son identifiant, d'où elle part et où elle arrive. » (Cadre) — « Les groupes Cadre (famille
     et sous-type, série, identifiant, titre, théâtre, départ, arrivée) ».
  5. « Une liaison : le départ, l'arrivée, la compagnie, la charge et l'aéronef ; le titre se propose seul. » (the reduced Cadre) — « Une mission
     commerciale… a un Cadre réduit… le titre se propose seul ».
  6. « le suivant de la famille » (under Identifiant) and « suivante : n » in a mission being modified — « La famille propose l'identifiant
     suivant et la série en cours ».
  7. « proposé d'après le départ et l'arrivée » (under the title of a liaison) — « le titre se propose seul (« LFPO → LFRS ») tant que vous ne
     l'avez pas changé ».
  8. « Les équipages et services engagés : une ligne par équipe. » — « Équipes (une ligne par équipe : indicatif, type, service, rôle… ».
  9. « Cible, zones, points tournants et rendez-vous. Une ligne par lieu ; « Modifier » en ouvre les champs. » — « Lieux (une ligne par lieu…
     la toucher en ouvre les champs, sous la liste… ».
  10. « identifiant donné par l'atelier ; un tiroir le cite comme clé. » / « identifiant donné par l'atelier. » (an object; the identifier stays)
      — « son identifiant est donné par l'atelier ; sa ligne… dit le tiroir qui le cite ».
  11. « Les lieux que le pilote rejoint, dans l'ordre. Sur la carte, l'outil « Tracé » en ajoute au toucher. » (the route of the departure) —
      « La route du départ se lit en pastilles… l'outil « Tracé » ajoute chaque lieu touché à la route du départ ».
  12. « Touchez un lieu pour le choisir, puis déplacez-le par les flèches. » (a route, the departure's and a drawer's) — « un lieu touché se
      choisit : les deux flèches « ← Plus tôt » et « Plus tard → » le déplacent d'un rang ».
  13. « Ce que lit le pilote : le résumé (la synthèse le montre entier jusqu'à 600 signes), la description, les objectifs, la charge. » (Récit) —
      « Récit (le résumé, avec son compte de signes : la synthèse le montre entier jusqu'à 600… ».
  14. « Une ligne par risque : le danger, sa conséquence, la parade. La fiche en montre trois sur sa première page. » — « Risques (une ligne
      « danger → parade » par risque — la fiche de la mission en montre trois sur sa première page… » (ADDED by this lot).
  15. « H = décollage prévu. Un événement par ligne : l'heure (H+30mn, H+1h05mn), un lieu de la mission ou rien, ce qui se passe. » — « une ligne
      par événement : l'heure comptée depuis le décollage prévu, « H+30mn », un lieu de la mission ou aucun, ce qui se passe ».
  16. « Les images des cartes se font au studio cartographique de la V2. » — « dont les images se font au studio cartographique de la V2 ».
  17. « Le pilote l'ouvre par « Ouvrir le tiroir ». » (the key « the pilot's gesture alone »; stale since SOG-0459) — « le geste du pilote seul :
      il l'ouvre par « Demander la suite » » (ADDED).
  18. « Sans position reçue de l'avion, le tiroir s'ouvre à cette heure. » (under the fallback time) — « son heure de repli quand la clé regarde
      l'avion (sans position reçue de l'avion, le tiroir s'ouvre à cette heure) » (ADDED).
  19. « Le pilote le lit sur le tiroir fermé : restez neutre si la suite doit surprendre. » (the title of a drawer; stale since SOG-0459) — « son
      titre — que le pilote lit une fois le tiroir ouvert — ».
  20. « Les lieux que le pilote rejoint après l'ouverture, dans l'ordre. » (the onward route of a drawer) — « sa suite de route lieu par lieu ».
  21. « Sans simulateur : l'avion suit la route du départ, avancez le temps. Le même calcul que le vol ; rien n'est écrit dans la mission. » (the
      trial) — « l'avion de l'essai suit la route du départ, vous avancez le temps au curseur… c'est le calcul même du vol, et l'essai n'écrit
      rien dans la mission ».
  22. (SOG-0467 commit 1) the tags « visible » and « tiroir scellé » of the cards of the unfolding — the mark and the rank say it.
  The texts 1, 2, 3, 10, 11, 12, 17, 18, 19, 20 and 21 leave `editor_texts.js`; 4 to 9 and 13 to 16 are texts of `module.js` (Features SOG),
  now unused by the workshop and left there.
- **Kept on screen**: the empty states (« Aucune équipe… », « Aucun risque… », « Aucun événement… », « Aucune carte déclarée. », « Aucun lieu
  dans la route du départ. », « Aucune suite… », « Aucune zone / Aucun objet dans cette mission — créez-le dans les Lieux »), the alerts and states
  (« l'ancien est gardé », « La chronologie de ce fichier est un texte… », « Cette clé ne s'édite pas encore ici… », « Contour de n sommets… »,
  « Le polygone garde ses n points… », « cible mobile », the count of signs of the summary, « Plusieurs repères : choisissez. », what the row
  « Fond / Espaces » says), the line under the tools of the map, « Ce que le pilote voit » (what the pilot will read), the questions.

### 7 novemtricies. The callsign of a team completes from the known fleet (18 Nov 2026; SOG-0488; noreg N135, N54, N50, N109, N122)

The user: « quand on saisit un callsign, on est censé avoir une complétion pour trouver le callsign et le type, non ? En fonction de la flotte connue. »
The ergonomist's decision: ONE callsign field, common to the workshop and the assignment form (`frame/lib/callsign_field.js`, Features SOG; contract in
`frame/INTEGRATION.md`, « The callsign field »; bench F274).

- **Where**: the Teams step, one block per mounting of the workshop, created by `edAd` with the block of the aerodromes and the block of the names of the
  places (the same schema: the listeners keydown, focusout, pointerdown and click are set ONCE on the element of the workshop and stopped when it is
  unmounted; each event goes to the block whose field or list is the target — `[data-edteams]` for this one). `edAdCs(s)` hands the block to `edInput`.
- **The list**: ONE `[data-cssug]` element in the list of the teams (positioned, like `[data-adsug]`); each field is in a `<label>`. `owns` = the callsign
  field of a team line; `typeOf` = the « Type OACI » field of the same line.
- **The gesture**: from two characters, seven callsigns at most, « CALLSIGN — TYPE · REGISTRATION »; the choice writes the callsign and, when ONE type is
  known for it, writes the type with an `input` event that `edInput` records like a keystroke; two types: nothing guessed. A callsign typed in full and alone
  in its list closes the list.
- **Written**: nothing until the author types or chooses; the format of the team (`name`, `service`, `type`, `role`) does not change; a free text stays as typed.

### 7 quadragies. « Profil » under the map: the vertical profile of the Carte, reused (18 Nov 2026; SOG-0464; noreg N137, N93, N110, N118, N121, N129 to N132, N134)

The user: « on a perdu le profil vertical dans la bagarre ? » — behind a fold if need be, but the terrain matters when drawing the route of a mission. The ergonomist's decision: REUSE
the Carte's profile (`modules/maps/lib/profile_embed.js`, contract in `modules/maps/INTEGRATION.md` § 7 ter), do not write a second one.

- **Where**: a section `[data-atprof]` right under the map, before the unfolding (`edProfHtml`): a button « Profil » (`data-do="edprof"`, `s.ed.profOpen`) and a canvas of fixed
  height (160 px; 200 px on a wide module). Folded at the phone, open on a wide module (the button is then hidden), like the map.
- **What is reused**: `drawProfile` of `profile_embed.js`, imported on demand (`import()`: a library that does not come never breaks the workshop); the route is THE line `route` of
  `e.mapFeats` (what the map draws; not recomputed, positions already bounded); the loader is the Map's (`ctx.net.fetch`, as `tileLoader` of `maps/state.js`), one per sitting
  (`edTileLoad`) because the profile keeps the tiles read per loader; the cruise level is `cruiseLevelFt` of the reader, bounded (0 = the terrain alone).
- **What is written**: `edProfile(s)`, called by the ONE path of redraw (`edRefresh`, which `edLive` calls at most once per frame during a gesture) and by `edAfter` (the canvas is
  new at each drawing of the screen). Nothing is redrawn when the route, the level and the width did not change (a key kept on the canvas); folded (width 0): nothing; a newer
  drawing took the place (`stale`): nothing. No timer, no second path.
- **What it says**: the length of the route when the relief was read; « Relief indisponible » (and the route drawn without it) when the tile is refused or the host not declared in
  `net` of the module (the expected state until Features SOG adds `s3.amazonaws.com/elevation-tiles-prod` and `../maps/lib/profile_embed.js` + its four scripts to `module.js`);
  « Placez deux lieux pour voir le profil » under two places. Nothing is invented.
- **A wide module**: the sticky left column (map, profile, unfolding) is taller than the screen; it is bounded to the screen and scrolls in itself, otherwise it became the tallest
  column of the grid and no longer stuck while the sheet scrolled (N121).
- **Case N137**: the tile loader is a fake at the level of the browser (a plain Terrarium tile built in the page, or a refusal); every other host is aborted by the harness.
- **Retouch (18 Nov 2026; noreg N143)**: each point given to `drawProfile` carries `id`, the label of the place found in `e.mapFeats.points` at the same position (the Map writes it under the axis; a route position that
  no place carries stays unnamed). When the answer carries `clear` (`{ minFt, atNm, below }`, INTEGRATION § 7 ter; absent from an older Map: nothing is said) and the terrain was read, the line `[data-atprofwarn]` says
  « La croisière passe sous le relief à {nm} NM ({ft} ft) » when `below` (`ft` = the depth under the terrain), « Marge faible au-dessus du relief : {ft} ft à {nm} NM » when the margin is under 500 ft; nothing otherwise.
  Case N143 serves `profile_embed.js` through a wrapper that adds `clear` to the answer of the real one when it has none, built from the case's own values (the fake tile gives 2 625 ft, the mission cruises at 2 000 ft).

### 7 unquadragies. The catalogue of bricks and models: one file of the code repository, read as untrusted (18 Nov 2026; lot « modèles de mission », decision A; noreg N138)

The user's tool keeps its bricks and models in code; the suite keeps them in ONE data file delivered with the module, `modules/missions/catalog.yaml`, read only, never
copied from the tool. It is read by `readCatalog(text, Y)` of `modules/missions/catalog.js` (pure: no page, no storage, no network) exactly like a file any pilot could
have written — the same reader reads the personal models (§ 7 quaterquadragies).

- **Keys**: `version: 1`; `families` (codes of the themes of `frame/lib/mission_themes.js`, their labels are the themes' — not repeated); `bricks[]`: `id`, `family`,
  `key` (one of the keys the workshop writes: `hand`, `time`, `zone`, `object`, `arrival`), `title` and `brief` in `{ fr, en, de, es }`, `params` (an arrival: `radius_nm`,
  `speed_max_kt`, `require_on_ground`; a time: `delay_min`), `fallback_min`; `models[]`: `id`, `type` (a family, or empty for any), `title` and `brief` in four languages,
  `drawers[]` (a brick by `brick: <id>` and what the model changes in it — `title`, `message`, `brief`, `place`, `fallback_min`, `route` — or a whole drawer by `key`),
  `places[]` (`id` — a key local to the model —, `kind`: target, zone, pt, rdv, object; `okind` for an object; `name` in four languages) WITHOUT position.
- **Bounds** (`LIMITS`): 128 KB (more: refused whole, `size`); 16 families, 80 bricks, 20 models, 12 drawers and 20 places per model (beyond: cut, counted in
  `dropped`); identifiers of the closed form `^[a-z0-9-]{1,40}$` (« ../x » set aside); texts through `visible` of the reader (invisible format characters out), cut
  (title 80, brief 600, message 2 000, name 60), a text with a tag (`<`, `>`) or an address (`://`, `javascript:`) refused; a number out of its bounds never read nor
  brought back into them (a fallback of 1e9: none); a YAML anchor refuses the file (`alias`, `shapeOf` of the reader); an unknown key is never copied; a position
  written on a place of a model is never read.
- **What is delivered**: the 28 bricks the workshop WRITES today (15 passage zones, 6 objects to find, 6 gestures of the pilot alone — the tool's `manual` —, 1 arrival),
  their French from the tool, translated; three models: « Mission vierge », « Recherche sur un glacier » (SAR: a passage zone, a person to find, the return to the
  aerodrome; three drawers, two places to place), « Interception d'un aéronef » (COMBAT: an entry zone, the aircraft to identify, the return). Every text is invented:
  no callsign, no registration, no real place, no coordinate.
- **What is set aside, and why**: the 32 bricks whose keys are those of the 1.1 conditions (landing 12, hover 7, overflight 5, event 5, follow 2, sequence 1) — the
  reader reads them but the workshop does not write them; they come with SOG-0500. The model « Bateau mobile · 2 aéronefs » (`coordination.participants` is not read by
  the suite, its conditions are 1.1). From the glacier: the required stop of its arrival (a real hospital) and its exercise coordinates; from the interception: the zone
  crossed by the mobile target and the 30 s escort of its arrival (keys the workshop keeps but does not write); the tool's `catalog-index.json` (its path, the user's
  fleet), its callsigns and registrations, its private block `x_mission_editor`.
- **Bench**: `modules/missions/test/catalog.html` (the delivered file, then forged ones: 200 KB, 100 bricks, « ../x », a tag, 1e9, an anchor, a position).

### 7 duoquadragies. The bricks under « ＋ Tiroir »: THE SAME choice of the type (18 Nov 2026; lot « modèles de mission »; noreg N139, N129)

The user: « Tout ce qui peut être constitué de modules doit être constitué de modules. KISS, oui, mais reuse. » The bricks are not a second component: they ENTER the choice
of the type of SOG-0467 (§ 7 quinquetricies).

- **Where**: `edKindsHtml(s, 'new')` — under « ＋ Tiroir » only — draws the five types, then `edBricksHtml`: a list « Briques » of the families that have bricks
  (`data-k="edbrickfam"`, `s.ed.brickFam`; the family of the mission first, then the first one) and the bricks of THAT family, seven at most, each its title and its key
  in one line (`data-do="edbrick"`, `data-brick`). In the sheet of a drawer (`edKindsHtml(s, 'drawer')`, its key) no brick: changing a key never rewrites the author's texts.
- **What a brick does**: `edKind(s, key, brick)` — the same path as a type: `DR.blankDrawer`, then `CAT.drawerFrom` (which is `DR.keyed`, what the key guesses — the first
  zone, the first object, the arrival at the destination — then the title, the message, the fallback and the arrival's settings of the brick, in the language of the
  screen); the sheet of the new drawer opens, its title in hand. A brick the catalogue read does not carry (a forged page) does nothing; veiled, nothing (`VEILED_OFF`).
- **The catalogue**: read once per page by `edCatalog` (`ctx.net.fetch` of `catalog.yaml`, beside the module; refused or absent — offline without a copy — an empty
  catalogue: the workshop works without bricks, and the reading is tried again at the next opening); posed in the sitting (`s.ed.cat`); when it arrives only an open
  choice under « ＋ Tiroir » is redrawn, never a field being typed.

### 7 terquadragies. The model of the mission: at the creation, and « Changer de modèle » (18 Nov 2026; lot « modèles de mission », decisions B and D; noreg N140, N141)

The order of the creation (the user): the TYPE (the family, in the Cadre), then the MODEL if any, then the BRICKS at « ＋ Tiroir ». The variant #modele of the mock-up:
the model is visible near the title, and changes.

- **The line**: in the WHOLE workshop only (never veiled: `edModelHtml` returns nothing), under the title — « Modèle : <its title> » (`[data-atmodelname]`; its identifier
  while the catalogue is not read; « aucun » without model) and a link « Changer de modèle » (« Choisir un modèle » without model; `data-do="edmodel"`).
- **The list**: opened IN PLACE under the line (`s.ed.modelOpen`, `edModelListHtml`): the models of the catalogue then « Vos modèles » (the personal models, `edMine`, § 7
  quaterquadragies), of the TYPE of the mission (a model without type goes to any family); without a family, a line asks for the family first and only the models
  without type are offered. Seven at most per group; each its title and what it poses in one line (« 3 tiroirs · 2 lieux à placer »); the model in force is marked.
- **A model touched** (`edModelPick`): when it would replace something (a drawer, a place of the former model still to place), the question of the frame says it BEFORE
  — « Prendre le modèle « … » ? », groups « Remplacé » (the drawers of the mission (n), the places of the model still to place) and « Gardé » (the Cadre, the Teams, the
  Story, the Risks, the Timeline; your places; the places of the model already placed) — « Remplacer par ce modèle » / « Garder la mission telle quelle ». Nothing to
  replace (a new mission): no question. Then `CAT.applyModel`: the places of the model are posed « to place » with a free identifier (`ED.newPlace`), its drawers
  (`DR.blankDrawer` + `CAT.drawerFrom`) cite them; `s.ed.model = { id, placed }`, written by `edDoc` (`CAT.withModel`) — FORMAT_MISSION.md § 4 quater. A model the list
  does not carry, or of another type (a forged page), does nothing; veiled, nothing (`VEILED_OFF`).
- **After « Enregistrer »** the model is the file's (`s.ed.model` back to undefined).

### 7 quaterquadragies. « Enregistrer comme modèle »: a personal model, written like a mission (18 Nov 2026; lot « modèles de mission », decision C; noreg N142)

- **Where**: on the line of the model (§ 7 terquadragies), in the WHOLE workshop only (`data-do="edmodelsave"`; veiled: no link, and a forged touch does nothing —
  `VEILED_OFF`).
- **What it writes** (`edModelSave`): the name asked by the frame (`ctx.askText`, the title of the mission offered); its identifier `CAT.slug(name)` (lower case without
  accent, `^[a-z0-9-]{1,40}$`); the file `pilot/<TRI>/modeles/<id>.yaml` (`CAT.modelPath`: a trigram of three letters, else nothing is written and the workshop says
  so) by `ctx.data.put(path, text, { module: 'missions' })` — as `edSave` writes a mission: on the device, bounded by the `writes` of the module (prefix `pilot/`), it goes
  with the grouped sending. Its content (`CAT.modelFromSession`, `CAT.modelText`): `{ version: 1, models: [ { id, type (the family), title, drawers, places } ] }` —
  the drawers COMPLETE (key, title, message, briefing, cited place, fallback, the arrival's settings, onward route), the places by identifier, kind, kind of object and
  name, WITHOUT position (no latitude, longitude, centre, radius, contour); neither identifier of mission, nor departure or arrival, nor teams, nor callsigns (the
  participants of a rendezvous are not copied). Bounded as the reader bounds it (12 drawers, 20 places, texts cut, a tag refused) and RE-READ by `CAT.readCatalog` before
  it is written: what would not read back is not written.
- **The same name**: the model is replaced after the question of the frame (« Le modèle « … » existe déjà : le remplacer par cette mission ? » — « Remplacer le modèle » /
  « Garder l'ancien »); the history of the data repository keeps the former one. The name of a model of the suite (its identifier) is refused.
- **Re-read**: at once among « Vos modèles » (`edMine`: the list of `pilot/<TRI>/modeles/`, twenty files at most, each read by the same `readCatalog`, one model per file
  whose identifier is the file's name). Choosing it poses its drawers and its places « to place », like a model of the catalogue.
- **To be reviewed by Sécurisation before any push** (it writes files to the data repository; a personal model is read on every device of the pilot).

### 7 quinquaquadragies. The optimisation pass of the workshop: the same screen, less work per keystroke and per drawing (18 Nov 2026; SOG-0468; no change of behaviour; noreg N91, N93, N95, N97, N106, N109, N110, N114, N118, N121, N129 to N132, N134, N137, N139 to N143)

- **« À compléter » and the document, once**: `edOnce(doc, key, make)` keeps per document (a `WeakMap`) what the screen derives from it — `edTodos` (one key, or `todo:<hidden rows>` in the veiled workshop), `edMission` (`MS.readMission`), `edDrawersTodo` (`DR.drawersTodo`); a new `edDoc` is a new document, so no cache goes stale; what is kept is only read. `edRefresh` passes its document to `edPlacesHtml(s, listOnly, doc)` and `edProfile(s, doc)`. Per keystroke on 12 drawers and 59 places: `ED.todo` 8 -> 1, `uncited` 8 -> 1, `pilotView` 8 -> 1, `readMission` 14 -> 4, `edDoc` 3 -> 1, `placesOf` 41 -> 9.
- **The colours of the design, read once**: `EM.tokens(el, names)` lays one probe per token in a single hidden wrapper and reads them after one style recalculation (it was one recalculation per token, 14 per drawing); `EM.lookKey()` (class, `data-design` and `data-tone` of `<html>`, the device tone, the number of style sheets) tells whether the design changed, and `edMapShow` reads the look again only then (`edAfter` no longer resets `mapLook` at every drawing). Same colours as before in the five designs and both tones.
- **The labels of the map, touched only when they change** (`editor_map.js` `mark`): a marker stays on its map (`LBL`: the map it is on and its position, a `WeakMap`), `setLngLat` only when the position changes, `addTo` only when it is not on this map, the text and `data-mapsel` only when they change; `spread` (the stacking, a read of every width) only if a label was put, removed, moved, re-texted or re-chosen, or if the scale is not the one of the last stacking (`L.spreadZoom`; `zoomend` still calls it). Per keystroke on 59 labels: 118 child-list mutations -> 0.
- **« Write only if it changes », in one place**: `put(node, text)`, `putAttr(node, name, value)`, `putData(node, key, value)` and `putProp(node, prop, value)` at the head of `editor_view.js` replace the local copies of the guard and are used for the writes that had none (`data-kind` of the marks, `data-open`, `data-map`, `aria-pressed`, `data-over`, `disabled`, `hidden`). A keystroke now writes 1 node of the DOM instead of 25 (1280) or 27 (390) on 12 drawers and 59 places. `editor_map.js` keeps its own guard in `mark` (it needs to know that the text changed).
- **The texts of a place line, from one function**: `edPlaceTexts(s, rows, doc)` gives `title(r)`, `detail(r, i)` (and `zk`, `ok`, the words of a zone kind and of an object kind) to `edPlacesHtml` (the list) and to `edRefresh` (the in-place update of the titles and details): no more HTML built, parsed in a `<template>` and read back for two selectors per row at every keystroke, and a frame of a gesture (`edLive`) builds the list once instead of twice.

### 7 sexquadragies. The icons of the map turn on (18 Nov 2026; SOG-0471; noreg N131)

V3 Frame pushed the eight missing icons (`frame/lib/icons.js`, efc39e5aa: `pointer`, `dot`, `route`, `circle`, `polygon`, `person`, `redo`, `mountain`); the
set of the suite now has every name of `ED_ICONS`, so `edIcons()` is true and the whole map turns to icons with no other change of code: Sélection,
Point, Tracé, « Zone » (`circle` or `polygon`, by `s.ed.zoneShape`), Objet, « Annuler le geste », « Rétablir », « Recentrer » (`target`, the icon of the
Carte) and the two backgrounds, « Rapide » (`map`) and « Relief » (`mountain`). Each keeps its name as `aria-label` and `title` in four languages; the
tool in hand stays marked (`aria-pressed`). At 390 the row wraps onto a second line (« Rétablir » and « Recentrer » under the first five) and never
scrolls sideways. A set that lost an icon would bring back every written name together (never a mixed row). Case N131 follows: besides the names, it
reads that every button carries `data-icon` and an `svg`, and no written text.

### 7 septquadragies. The reader and the workshop share the frame's guards for untrusted input (18 Nov 2026; SOG-0468; no change of behaviour; noreg N1, N113, N127, N133)

`frame/lib/mission.js` imported nothing of the frame's guards: it carried its own `visible` (the invisible format characters), `clean`, `plain` and
`idWord`. Since `frame/lib/untrusted.js` (c62741c36) holds ONE definition of them, the reader imports `visible`, `clean`, `plain` and `idWord` from
it and keeps `export { visible }` (the workshop reads `MS.visible`). Before the change the two sets were compared: the same pattern for every code
point of Unicode, and the same result for `undefined`, `null`, numbers, texts with invisible characters, objects, arrays and an object with its own
`toString`. `num` stays in the reader (a tolerant reading, not a guard). `cut` (a one-line text, without invisible characters, bounded) was written
in `editor.js` and again in `editor_drawers.js`; `untrusted.js` has no equivalent, so `editor.js` exports the one, `editor_drawers.js` imports it
(no cycle: `editor.js` imports no workshop file).

### 7 octoquadragies. The draft: the mission in progress kept on the device (18 Nov 2026; SOG-0486; noreg N150, N109, N119, N122)

The user: « Ne jamais enregistrer, même après beaucoup d'étapes, c'est gênant. Conserver une mission en brouillon, et la proposer en tête de liste du registre. »
The ergonomist: the workshop keeps the mission ON THE DEVICE at each change, never published until « Enregistrer »; ONE draft per mission.

- **Where**: `cache/missions/draft_<KEY>.json`, the frame's `cache` policy (the module's `writes` already declare `cache/missions/`: this device only, never
  synchronised), written by `ctx.data.put(…, { module: 'missions' })`. `KEY` is the identifier of the mission opened by « Atelier » (mode `edit`), or `new` for
  a mission created or copied and not yet saved (ONE creation draft at a time: a new « Créer une mission » overwrites it at its first change). Form
  `^(new|[A-Z0-9-]{1,24})$`; an identifier outside it has no draft (nothing is written).
- **Content** (`draft.js` `draftOf`): `{ version: 1, updated_at, key, mode ('new' | 'dup' | 'edit'), title, text }`, `text` = the YAML « Enregistrer » would
  write at that instant (`edSaveCadre`, `edDoc`, `ED.yamlText`, the same functions as `edSave`), veiled or not (the veil filters the screen, never what is
  written: the drawers stay in the text); 256 KB at most, else nothing is written.
  **The draft of a VEILED workshop carries the WHOLE mission, closed drawers included, on the device alone**: that is a screen secret (the pilot
  who opens the workshop does not see it on the screen), NOT a protection — whoever reads the device's storage reads the text of the draft.
- **Bounded in number** (`draft.js` `pruneDrafts`, called by `edDraftKeep` right after the workshop wrote its own): beyond `LIMITS.keep` (40)
  drafts on the device, the OLDEST are erased (their `at` in the device's cache, else their `updated_at`), never the one just written.
- **When** (`editor_view.js`): after each drawing (`edAfter`) and each keystroke (`edRefresh`) a write is asked (`edDraftSoon`), made one second later at most
  once per second (`edDraftKeep`), only when the workshop is « changed » in the sense of the question before leaving (`edDirty`, the test `ctx.unsaved` reads:
  no second detector) and the document differs from the last one written; once more when the workshop is left (`edLeave` after « Quitter »,
  and the unmount of the module, `edAfter(null)`). A workshop back to its starting point erases the draft THIS session wrote or resumed.
- **« Enregistrer »** that wrote the mission erases the draft (its key before the save: `new` for a creation). « Quitter » keeps it: that is
  its purpose. The question of the frame says so since the `kept` option (`ctx.unsaved(fn, { kept: true })`, `ctx.askLeave({ kept: true })`, V3 Frame's a7072f1e6):
  « Quitter ? Vos changements restent en brouillon sur cet appareil. »
- **Reading** (`draft.js` `readDraft`, `listDrafts`): the file is on the device but read as untrusted — the size first (the file, then the text), the envelope
  (version 1, key and mode that go together), the text read by js-yaml with the CORE schema and refused with an alias or beyond `MS.NODES_MAX` (`shapeOf`), as
  the workshop reads a mission file. Not `readMission`: a draft of a new mission has no identifier nor family yet, and `readMission` refuses that. Anything
  else → null, never an exception. `listDrafts` reads what the device keeps (`data.cached`, no network), 40 files at most, the files over the size left
  unread, a draft whose key is not its file's left aside, ten at most, the most recent first.
- **Resuming** (`edResume`): the workshop opens in the draft's mode, « changed »: an `edit` draft needs the registry line of its mission (else « La mission
  X-… n'est plus au registre : son brouillon ne se reprend pas. »), reads the mission file (what « changed » and « Enregistrer » compare: `s.ed.start`), then
  works on the draft's document; a `new` or `dup` draft is taken as it is (a copy stays veiled, `ED.veiledAt`). « Brouillon repris. » is said; an unreadable
  draft says « Ce brouillon ne se lit plus. » and opens nothing.

**The contract for the registry (Features SOG: the line of the registry is theirs).**

1. `import * as DF from './draft.js'` in module.js; `draft.js` goes into `meta.files` (case I26 asks for it).
2. When the Registry screen opens (and after a return from the workshop): `s.drafts = await DF.listDrafts(s.ctx)` → `[{ key, mode, id, title, updated_at }]`.
3. Draw one line per draft AT THE HEAD of the registry list: « Brouillon — <title or id> », its date, and two buttons.
4. « Reprendre »: `<button type="button" data-do="eddraft" data-key="${esc(d.key)}">` — THE ONE LINE: the existing switch of `onClick`
   (`b.dataset.do.startsWith('ed') && (s.ed || s.reg)` → `edClick`) already hands it to the workshop, which reads, validates and opens the draft.
5. « Jeter »: the registry's own confirmation (`ctx.ask`), then `await DF.dropDraft(s.ctx, d.key)` and the list read again.
6. Nothing else to know: the key is checked again by the workshop (`DF.KEY`); a draft that no longer reads is said by the workshop, never an error.
7. A draft `edit` of a mission absent from `s.reg.lines` is refused by the workshop: the registry may hide such a line or show it greyed.
8. The texts of the line (« Brouillon », « Reprendre », « Jeter », the question) are the registry's, in four languages.
9. The drafts are on THIS device only: another device of the pilot does not see them (the `cache` policy).
10. Case N150 touches a forged `data-do="eddraft"` button in the registry bar: the same path as the line.

### 7 novemquadragies. The 1.1 conditions are written: hover, landing, overflight (18 Nov 2026; SOG-0500 (a); noreg N151, N152, N78, N79, N138)

The ergonomist (SOG-0500): « Pour chaque condition : ses champs dans la fiche du tiroir (réutiliser ceux qui existent), le format écrit (FORMAT_MISSION.md),
et ce que le vol sait en juger ; une condition que le vol ne sait pas juger n'est pas proposée. »

- **The row** (`editor_drawers.js`): `key` is now also `hover`, `landing` or `overflight` (`DR.HOLDS` = `MS.HOLD_KINDS`, the reader's list), with a `rule`
  `{ point, object, label, radiusM, radiusNm, duration, gap, speed, tol, hMin, hMax, confirmation, confirm }` (texts for the fields). A condition whose point or
  object is not a bare identifier stays `kept` (`keptWhy: 'condition'`), as before.
- **Written** by `putRule` in `trigger_condition`, the form of `holdRule` (FORMAT_MISSION.md § 4 quinquies), bounds `MS.HOLD_BOUNDS` (exported by the reader
  for that: the same table); `RULE_USE` says which fields a kind reads; a fresh rule drops every field of another kind. `holdRow(kind, places)` guesses: an
  object of the mission to follow, else the target, else the arrival; a landing at the arrival; the defaults of the user's workshop (60 s, 5 m, a gap of
  10 s, 2 kt, 10 to 100 ft; an overflight 0.5 NM, 100 to 2 000 ft) — a landing 10 s and a gap of 10 s, its speed (3 kt) written, no confirmation word (the
  precision of « Affectation », 18 Nov).
- **« À compléter »**: `ruleMissing(kind, rule)` names what the reader would refuse (`at`: neither point nor object, or both; a required number absent or out of
  bounds; `hOrder`; `confirmation`); `drawersTodo` says `condIncomplete` with these names (« condition à compléter : Durée (s) »). For a landing the gap is not
  shorter than `FIX_PERIOD_SEC` of `drawers.js` when it is published there (read through the namespace: its absence is not an error).
- **The sheet** (`edRuleHtml`, `edRuleInput`): the place — « Sur un point » (the arrival, the departure, the points of the mission) OR « ou en suivant un
  objet » (two lists: choosing one empties the other) —, the numbers two by row, the pilot's confirmation for an overflight, then the fallback time. Reused:
  « Rayon (NM) » and « Vitesse maximale (kt) » of the arrival, the fallback field, the lists of the arrival. The label and the confirmation word of a single
  condition are kept as written (not shown: they matter for the steps of a sequence).
- **Not offered**: `DR.TYPES` keeps the five keys the flight judges; a drawer already written with a 1.1 condition is edited and keeps the mention
  « s'ouvre au geste ou à l'heure de repli » (`data-dwnotjudged`).
- Captures: `P13a_390_landing.png`, `P13a_1280_landing.png` (case N152).

### 7 quinquagies. A sequence of steps, a message between crews (18 Nov 2026; SOG-0500 (b); noreg N153, N154)

- **The row**: `key: 'sequence'` with `steps` `[{ kind, …rule }]` (each a hover, a landing or an overflight; 1 to `MS.DRAWER_BOUNDS.steps` = 10, the reader's
  bound — the brief said « 8 au plus — lis la borne du lecteur »: the reader says 10); `key: 'event'` with `event` (the identifier awaited); for ANY key,
  `emit` and `emitTo` (`emit_event { id, to }`, the message the drawer sends when it opens; recipients as words separated by commas, 16 at most). `DR.CONDS`
  is the five 1.1 conditions.
- **Written** (`putKey`, `putEmit`): the steps by `putRule` each — a step of the same kind at its rank keeps the other keys of its step, another kind is written
  whole, never beyond ten; `event` and the recipients only as words (`MS.EVENT_ID`); nothing typed → `emit_event` removed. Read back by `readMission` (N153).
- **Kept as they are** (`keptWhy: 'condition'`): a nested sequence, a step that is not an object, more than ten steps, an event that is not a bare word.
- **« À compléter »**: `condMissing(row)` — `steps` (no step), `<n>.<field>` (« étape 2 : Durée (s) »), `event`; `emitIncomplete` when the reader would not
  read the message sent.
- **The sheet**: « Les étapes, dans l'ordre » — ONE step open at a time (`s.ed.stepOpen`): its heading, « Sorte » (a hover, a landing, an overflight: changing
  it takes what the kind guesses, the name kept), « Nom de l'étape », the fields of its rule (`edRuleHtml`, the same as a single condition), « Mot de
  confirmation (facultatif) » (not for a landing), « Retirer l'étape »; the other steps in one line each (rank, kind, name, place) — touched, it opens;
  « ＋ Étape » (a hover) up to the bound. A message awaited: « Message attendu (son identifiant) » (the messages the other drawers send are proposed) and one
  line that says where it comes from (« Envoyé par le tiroir 1 à son ouverture », or « Envoyé par un autre équipage »), followed as one types. « Message envoyé
  à l'ouverture » and « Destinataires » show only for a drawer that sends one (in the file or in the sitting): not offered while the flight does not judge
  the messages (SOG-0500 (c)).
- Actions `eddrstep`, `eddrstepadd`, `eddrstepdel` are off in the veiled workshop (`VEILED_OFF`).
- Captures: `P13a_390_sequence.png`, `P13a_1280_sequence.png` (case N154).

### 7 unquinquagies. What « ＋ Tiroir » offers comes from the flight (18 Nov 2026; SOG-0500 (c); noreg N155, N152, N139)

- **The rule** (Affectation, 18 Nov): `judged = kind === 'hand' || kind === 'time' || follows(key)` — `follows` of `drawers.js` (read, never changed), the stable
  contract: what the flight judges WITH a position.
- **Which key** (`judgedKind(kind, judge = follows)`): for each kind the workshop writes a drawer with its own defaults (`keyed`: a landing at the arrival,
  5 m, 10 s, a gap of 10 s, 3 kt — the complete rule Affectation will judge), on a small invented mission (`SAMPLE_DOC`), reads it with `readMission` and gives
  THAT key to `follows`, once. `DR.TYPES` is `[{ key, judged }]` for the ten kinds, from this; `DR.offered(cur, judge)` keeps the judged kinds and the key in
  force of a drawer. No list of the workshop: the day Affectation judges a condition in flight, it is offered without a change here.
- **Today** (`follows`, read on 18 Nov): a zone crossed by the pilot himself (no `actor`), an object that does not move, an arrival without a following
  (`escortMinSec` 0) — plus the gesture and the hour. Offered: hand, time, zone, object, arrival; no 1.1 condition.
- **The screen**: `edKindsHtml` draws `DR.offered(cur)`; `edKind` refuses a kind `DR.offered` does not offer (a forged page); the mention « s'ouvre au geste ou
  à l'heure de repli » shows for a key the flight does not judge (`!DR.judgedKind`), or for a key the reader reads as not judged (`MS.notJudgedYet`). « Message
  envoyé à l'ouverture » shows for a drawer that sends one, or when the flight judges messages.
- **The control** (Affectation): for every kind of key the reader gives, `MS.notJudgedYet(k) === !(hand || time || follows(k))` (case N155) — the pilot's
  screen and « ＋ Tiroir » never diverge. It went RED on the landing when Affectation's 3c2e2abba made `follows` accept it (N155 named `landing`, twice), and on
  the overflight when 4c9b10ef3 did (N155 names `overflight` and `overflight+obj`), on the hover when 9cbbf9e11 did (`hover`, `hover+obj`) and on the sequence when 72d7ef7dc did (`sequence`); each time the same lot makes `notJudgedYet` of `frame/lib/mission.js` say
  false for it (see § 7 duoquinquagies, « The landing is judged », « The overflight is judged », « The hover is judged » and « The sequence is judged »).

### 7 duoquinquagies. The 32 bricks of the 1.1 conditions in the catalogue (18 Nov 2026; SOG-0500 (d); noreg N156, N138, N139)

- **What**: the 32 bricks of the user's catalogue whose key is a 1.1 condition (relevé of 18 Nov: 12 landings, 7 hovers, 2 followings, 5 overflights,
  1 sequence, 5 messages), added to `modules/missions/catalog.yaml` with their texts in four languages (the user's are French only: translated here).
  60 bricks, 16 families (HEMS and SOF added): `LIMITS` (80 bricks, 16 families, 128 KB) still holds — not widened. The file weighs 35 KB.
- **A following is a hover** on an object (`le-track`, `aar-follow`): 1 000 m, 0 to 3 000 ft, 20 kt of relative speed tolerated (a choice of this lot: the
  user's tool says « hover élargi : 1 000 m, 0-3 000 ft » without a speed).
- **Nothing of a real look**: the ids and texts that told a real unit's scenario are renamed (`maritime-customs` → `maritime-team`, « Dépose puis reprise d'une
  équipe »; `le-customs` → `le-contact`, « Identification d'un contact »); « VIP » → « Embarquement d'une autorité », « Transfert offshore » → « Transfert
  vers une plateforme », « Dépose à l'hôpital » → « Dépose au point de soins »; no callsign, no place, no position. The path of the user's tool enters nowhere.
- **Read** (`catalog.js`): `DR.KEYS` gives the keys a brick may have; `paramsOf` reads the numbers of a rule under the file's names with `DR.RULE_NUM` (the
  reader's bounds, `MS.HOLD_BOUNDS`) and a sequence's `steps` (ten at most, each a hover, a landing or an overflight, its confirmation word); `drawerFrom` puts
  them on the row (`DR.keyed` guesses the place); `modelFromSession` keeps them in a personal model (a rule's place when it is a place of the model).
- **Offered under the rule of their key**: `edBricksHtml` lists only the bricks whose key the flight judges (`DR.judgedKind`), the families with such bricks
  only; a forged `edbrick` of a brick not judged does nothing. Today: none of the 32.

- **« Lieux » no longer says « done » and « to fill in » at once** (noreg N157; the ergonomist's capture of the draft). The mark of a group is the rule of
  `ED.todo` (`edStepOk`: ✓ when the step has nothing to complete); the line is `edLine`. They disagreed on « Lieux »: `ED.todo` asks for no place besides the
  departure and the arrival (a mission needs none), so the tick was TRUE, while the line said « à remplir » for ANY empty group — the line was the lying one.
  « à remplir » is now said only by the groups `ED.todo` does require (teams, story, risks, timeline); « Lieux » with no place of its own says
  « aucun lieu » (`atLine_noplace`, four languages), its mark stays ✓.

- **The landing is judged** (SOG-0500, after Affectation's 3c2e2abba; noreg N155, N158, N139, N152, N129, N156). `follows` accepts a condition `landing`: `rule.kind` `landing`,
  a readable point or a STILL object, an empty `confirmation`, `max_gap_sec` ≥ `FIX_PERIOD_SEC` (5 s), finite numbers. `notJudgedYet` (`frame/lib/mission.js`) says false in exactly
  those conditions — the rule is written there (`landingJudged`, `FIX_PERIOD_SEC` copied: the frame imports no module; the comment says it must follow `follows`, N155 keeps
  both together). « ＋ Tiroir » therefore offers the landing (the `judged` flag comes from `follows`; « Un poser » on the screen) and the 12 landing bricks of the catalogue
  (40 offered instead of 28); a landing drawer no longer carries the mention « s'ouvre au geste ou à l'heure de repli ». The sheet of a landing offers only the STILL objects
  (`still` of `edRuleHtml`: a moving object is not judged; a moving object already written stays shown with its « ? ») and its gap says its minimum
  (`dwGapMin`, « 5 au moins », from `DR.landingGapMin`, which `ruleMissing` already enforced: under 5 s, « À compléter »). Captures `P13b_390_atterrissage.png`, `P13b_1280_atterrissage.png`.

- **A message between crews goes to « all »** (SOG-0500, the relay's decision; noreg N153, N154): until the ergonomist decides on Thursday what `to` holds (a call sign, a
  role or « all »), the sheet of a drawer that sends a message has the identifier field only — the free entry of the recipients (`emitTo`, commit dcb285eb2) is gone from
  the screen. A message with its identifier and no recipient is written `emit_event: { id, to: ['all'] }` (`putEmit`; « all » passes `MS.EVENT_ID`); recipients a file
  already carries stay as written (the row keeps them in `emitTo`, the sheet says « Destinataires du fichier, gardés : … »), and nothing is rewritten if the author does
  not touch the message. « Message envoyé sans destinataire » can no longer arise from the screen.

- **The overflight is judged** (SOG-0500, after Affectation's 4c9b10ef3; noreg N155, N159, N139, N152, N129, N156). `follows` accepts a condition `overflight`: `rule.kind`
  `overflight`, a readable point or a STILL object, an empty `confirmation` (the WORD), `radius_nm` > 0, `height_min_ft` ≤ `height_max_ft`, both finite (heights above
  the ground, AGL). `require_confirmation: true` is accepted: the pilot must be in range, then touch « Demander la suite » — the workshop keeps its default (box checked)
  and never writes a confirmation word for an overflight. The rule is generalised in ONE place, `conditionJudged` of `frame/lib/mission.js` (the former `landingJudged`:
  one rule per kind, commented « suit follows, N155 / N158 le gardent »; N159 plays the variants), and `notJudgedYet` says false in exactly those conditions. « ＋ Tiroir »
  therefore offers « Un survol » (the `judged` flag still comes from `follows`) and the 5 overflight bricks of the catalogue (45 offered instead of 40); the sheet of an
  overflight offers only STILL objects, like the landing (`still` of `edRuleHtml`). The sequence and the event stay not judged. Captures `P13c_390_survol.png`,
  `P13c_1280_survol.png` (the choice of the type) and `P13c_390_survol_fiche.png`, `P13c_1280_survol_fiche.png` (the sheet of an overflight).

- **The hover is judged** (SOG-0500, after Affectation's 9cbbf9e11; noreg N155, N160, N139, N156, N129, N152). `follows` accepts a condition `hover`: `rule.kind` `hover`, a
  readable point or a STILL object, an empty `confirmation`, `radius_m` > 0, `duration_sec` > 0, `max_gap_sec` of at least one fix period (`FIX_PERIOD_SEC`, 5 s),
  `speed_tolerance_kt` >= 0, `height_min_ft` <= `height_max_ft`, all finite (heights above the ground, AGL). `conditionJudged` of `frame/lib/mission.js` gains the hover
  (still one rule per kind, commented « suit follows »), so `notJudgedYet` says false in exactly those conditions. « ＋ Tiroir » offers « Un stationnaire » and the 9
  hover bricks of the catalogue (54 offered instead of 45); the sheet of a hover offers only STILL objects (`still` of `edRuleHtml`) and asks for a tolerated gap of 5 s
  at least, like the landing (`landingGapMin`). N155 now covers the THREE judged conditions — landing, overflight, hover — each on a point, on a still object and on a
  moving object, so that the copy never diverges from `follows`; it was RED for the hover before this lot (`THE control: ['hover', 'hover+obj']`). Only the sequence and
  the event stay not judged. Captures `P13d_390_stationnaire.png`, `P13d_1280_stationnaire.png` (the sheet of a hover).

- **The sequence is judged** (SOG-0500, after Affectation's 72d7ef7dc; noreg N155, N162, N139, N156). `follows` accepts a condition `sequence` of one to ten steps
  (`SEQ_MAX`), each a landing, an overflight or a hover that `follows` accepts as a condition alone, and with NO overflight to confirm (a « Demander la suite » in the
  middle of a sequence is not judged, by prudence); a sequence in a sequence, an event as a step, none or eleven steps are not. `conditionJudged` of `frame/lib/mission.js`
  gains the sequence by calling itself on each step with the step's kind (still one rule per kind, commented « suit follows », no import of `drawers.js`; `confirm` of the
  reader's overflight rule is true unless the file writes `require_confirmation: false`), so `notJudgedYet` says false in exactly those conditions. « ＋ Tiroir » offers
  « Une suite d'étapes » (its flag comes from `follows` applied to the sequence the workshop writes by default: one hover on the first point) and the catalogue's one
  sequence brick (55 offered instead of 54): the brick keeps the confirmation words of its two steps, so the drawer born of it still says « s'ouvre au geste ou à
  l'heure de repli » until they are cleared — the offer follows the KEY, the mention follows the file. N155 covers the sequence (a file's sequences B to J: judged, a moving
  step, a word, an overflight to confirm or not, ten steps, eleven, none, a gap under one fix period; and eleven keys built by hand that the reader never gives); it was RED
  before this lot (`THE control: ['sequence']`). N162 plays the variants of a sequence and the sheet of a judged one at 390 and 1280. Only the event stays not judged.
  Captures `P13f_390_suite.png`, `P13f_1280_suite.png` (the sheet of a sequence of steps, without the « not judged » mention).

- **A moving object says « (mobile : non jugé) »** (SOG-0500, the ergonomist's touch-up of 19 Nov; noreg N161). In the sheet of a drawer whose judged condition (landing,
  overflight, hover) already follows a MOVING object, the object select used to show the file's value with a « ? » — the mechanism of « the file's value designates
  nothing any more », misleading here: the object exists, the flight just does not judge a moving one. The select now shows the object's name followed by
  « (mobile : non jugé) » (`dwMoving`, four languages); a value that designates nothing keeps its « ? ». The value is the file's own and nothing is rewritten without
  a gesture of the author; the list still offers only still objects; the mention « s'ouvre au geste ou à l'heure de repli » of the drawer shows (it comes from
  `MS.notJudgedYet` of the read key, which is true for a moving object). Captures `P13e_390_objet_mobile.png`, `P13e_1280_objet_mobile.png`.

### 7 tresquinquagies. A named point of the base gives its position and locks it (19 Nov 2026; SOG-0506; noreg N163, N164, N120)

- **The cause, measured** (the user: « lfrf ne semble toujours pas connu comme point »). SOG-0495 gave a position to a turning point, a target or a
  rendezvous named by a code — never to the DEPARTURE or the ARRIVAL typed in the Cadre: `edNameBase` takes `pt`, `target` and `rdv` only, and
  `placeWith` (editor.js) drops the position of a terrain whose code changes. The line of the Lieux stayed « à placer »; the map drew the terrain at the
  position of the base (`mapFeatures`, `adPos`), but the dashed route was read from the FILE (`edMapFeats` → `TR.pathOf(MS.readMission(doc))` →
  `missionFlight` `depAt = at(mission.origin)`, null without `lat`/`lon`): the route — and the profile, which reads the same line (`edProfile`) — skipped
  it. Measured in N164 before the fix: the route of a file whose departure is « XTST » without a position started at PT1, `[[44.8, 1.2], [44, 2]]`.
  For a turning point, the position is taken at the choice in the list or when the Name is left (`change`), not at each key: a code typed in full alone
  in the list closes it (`ad_field.js`, « le code complet déjà tapé et seul de sa liste »), the place stays « à placer » until the field is left. A point
  added to the mission is not added to the route of the departure by itself (« Ajouter un lieu… », or Tracé) — unchanged.
- **A named point of the base is LOCKED**: chosen or typed, it writes its complete position (five decimals) with its code as its name; its latitude and
  longitude are read only (`readonly`, a dashed field) and the sheet names the source: « Position de la base aéronautique : le terrain XTST —
  verrouillée. Effacez le code pour la libérer. » (`plSrc`, the kind: terrain, balise, point du réseau, point de report). The map gives it no handle
  (`mapFeatures`: a row `locked` is not `movable`); a gesture that would still come is refused (`onMove`), and the line under the map says
  « PT3 · XTST : position de la base, verrouillée — effacez son code pour le déplacer. » (`atHint_locked`). A forged typing in a locked field is put back.
- **The source is not a key of the file** (no new key, nothing for Sécurisation to bound): it is read from what the file already says — the name equal to
  the code (a turning point, a target, a rendezvous: `[A-Z0-9][A-Z0-9./-]{1,23}`, as `edPlaceFromBase` writes it) or the code of the terrain (departure,
  arrival: `icao`, or the code in the name), AND the position equal to the one the base gives to that code (1e-4 degree). `edSrcOf` asks the base once per
  code and position (`aerodb.coordsAll` with `near`, for the homonyms; `adPosOf` for a terrain), keeps the answer (400 entries at most) and redraws in place
  (`edSrcPaint`). A file written by hand with a name that is a code but another position is a free point, as before.
- **Freed by erasing the code**: the name no longer the code, the place keeps its position as a free point; its fields are written again and the map
  moves it. No new word.
- **A known code on a place ALREADY placed moves it** (the user's decision, the choice (2) refused by the relay: « choisir un point nommé donne les
  coordonnées, mais les bloque »; noreg N169, N126 follows it). Until then a name typed never moved a placed point (SOG-0495). Now a code of the base,
  typed (the `change` of the Name) or chosen in the list, and publishable (`EM.publishable`), gives the place the position of the base and locks it,
  whether it was placed or not (`edNameBase`, one request at a time per place: the `change` that follows a choice does not ask again). A place that was
  elsewhere is MOVED, and a notification says « Déplacé à la position de la base : PT3 · XPT01. » with « Annuler » (`plMoved`, `plMovedUndo`; the
  frame's action note, `ms` 10 s): `edNameUndo` gives the place back its former position AND the name it had before the typing (`e.nameWas`, kept at
  the first key of the Name), free again — nothing is done if the place was touched since. A free name that is not a known code moves nothing, says
  nothing. « Annuler le geste » of the map is not used: it never undoes a typing (SOG-0471). Capture `P14c_390_deplace.png`.
- **A typed code moves a place only if it has no homonym** (the relay, on SOG-0506; noreg N171, N126 and N169 unchanged): the rule above is for a code
  with ONE publishable point in the base (`EM.publishable`, the same guard as the licence). A name TYPED (no `pick`) whose code has several publishable
  points at distinct positions (`edNameBase` counts them in the answer of `coordsAll`) changes nothing — a placed point stays where it is, a place with
  no position stays « à placer », nothing is locked, nothing is said — and the list of the Name proposes them all; only the CHOICE of one in the list
  (`pick`) moves and locks, as before. A homonym listed twice at the same position counts once. The search around the place is the usual one (`near`,
  the nearest zones): a homonym in a far zone not yet opened is not seen.
- **The departure and the arrival**: a terrain the author types in Départ or Arrivée and the base knows writes its position in its line of the Lieux
  (`edEndFill`, at the typing and at the answer of the base): the file carries `origin: { name, icao, lat, lon }`. A terrain of the file the author did not
  retype is NOT rewritten (opening a mission writes nothing, « Annuler » asks nothing): the route of the map and the profile go through the position of
  the base all the same (`ED.endsAt`, for the drawing only), where the map already showed it.
- Captures `P14a_390_verrouille.png`, `P14a_1280_verrouille.png` (the sheet locked; at 1280 the dashed route through the locked terrain beside it).
  The bench of N163 / N164 gives the locked terrain a code of its own, XTSL (« XTSL TEST LOCK », 44.55 N, 1.85 E): the departure of the trial
  mission, « Base Test (XTST) » at 45 N, 1 E, keeps its XTST in the base, so the captures no longer show two XTST.
- **A position of a LOCAL source is never written** (Sécurisation's retouch, the rule of 18 Nov: SOG-0153, Q-0061; noreg N168). A position that comes
  from X-Plane, Eurocontrol (and its RAD), Little Navmap, or from a record marked `local`, never goes into a file of the data repository. ONE guard,
  `EM.publishable(x)` (editor_map.js: the `isLocal` of the map — `source` or `zone` in `xplane`, `eurocontrol`, `eurocontrol_rad`, `lnm`, or `local`
  true —, on the record and on the `item` it wraps), and every path that writes or locks a position of the base goes through it: `adPosOf` (the first
  PUBLISHABLE aerodrome of the code: a local one gives no position to the Cadre, to `edEndFill`, to the lock of a departure or an arrival, nor to the
  drawing — the code stays a known terrain, `noteAerodrome`), `edNameBase` (the code typed, and the point chosen in the list of the Name: the common
  field does not say its source, so the base confirms it publishable at its position before anything is written — one answer of the base later than
  before), `edPlaceFromBase` (the record of the base is now a required argument, refused unless publishable: the references of the map pass it, already
  filtered by `refData`), `edPtSrc` (a local record locks nothing); `refData` and `seekRows` use the same function. A local terrain or point typed in the
  workshop keeps its code, with no position (« à placer »).

### 7 quattuorquinquagies. The workshop no longer asks for the radii the user's tolerances replace (19 Nov 2026; SOG-0507; noreg N165, N166, N167)

The user's figures (`drawers.js`: `TRANSIT_NM` 2, `AD_NM` 1, `PRECISION`, `TIERS`) prime over the file, and the workshop says them instead of
asking for a radius: the sheet of a landing has no « Rayon (m) » but one line, « Jugé par paliers : partiel 0,5 NM · réussi 0,2 NM · parfait 0,1 NM ·
excellent 0,05 NM » (`DR.precisionTiers`, read from `PRECISION`; the words are those of the pilot's book, four languages), or « Jugé à 1 NM du terrain »
when its point is ORIGIN or DESTINATION (`DR.landingJudge`); the sheet of an arrival has no radius field but « Arrivée jugée à 1 NM du terrain » and
« Un arrêt compte à 2 NM du point » (`DR.toleranceNm`). « À compléter » no longer requires `radius_m` of a landing (`RULE_NEED`), a new landing writes none, and a
file that carries `radius_m` or `radius_nm` keeps it as it is (only what changes is written). The reader (`frame/lib/mission.js`) no longer refuses a landing
without `radius_m` (`holdRule`, `conditionJudged`: N155, N158 keep the reader and `follows` together). The trial of the keys (`editor_trial.js`) judges an
arrival like the flight: `AD_NM` and `TRANSIT_NM` imported from `drawers.js`, never copied.

### 7 quinquinquagies. « ＋ Tiroir » opens the window of the bricks; one touch creates the drawer (19 Nov 2026; SOG-0508; noreg N172 to N177, N129, N139)

The user's gesture (his mock-up: « les briques de base, qui correspondent aux tiroirs, donnent directement une popup de choix. c'est plus clair »)
replaces the choice in place of SOG-0467 (`edKindsHtml`, `edBricksHtml` and the list of the families are gone).

- **The tile**: « ＋ Tiroir » with « Choisir une brique » under it (`aria-haspopup="dialog"`); still hidden at twelve drawers, still off in the veiled workshop.
- **The window** (`kwSync`, `kwStart`, `kwHtml`, `kwPoolHtml` in `editor_view.js`): the frame's box (`.f-modal`, its veil and its look in every design),
  laid in `document.body` and driven by the state after each drawing (`edAfter`): the frame's view and the module are query containers, so a fixed box laid
  inside the module would stay inside it. Open while `s.ed.kinds` is `'new'` (« ＋ Tiroir ») or `'drawer'` (« Changer la clé »); its content is
  rewritten only when what it shows changes (the purpose, the key in force, the catalogue, the language, the family), so the search keeps what is typed.
  Full screen up to 760 px; centred and 760 px wide at most above; every touch 44 px high. « Fermer » and Échap close it and create nothing; the focus goes
  back to what opened it. Its buttons go to `edClick`, like the workshop's.
- **Its content**, the mock-up's: the title « Choisir une brique de tiroir » and « Fermer »; « Rechercher une brique… » (`s.ed.kq`, 60 characters; the
  list alone is redone as one types; accents and capitals ignored by `foldLower` of `frame/lib/text.js`; every fold kept open while a text is searched);
  one line of counts (families and bricks offered, the aircraft — the type of the first team, else its name — and the family of the mission, « à définir »
  when absent); then the folds of the suite (`fold` and `wireFolds` of `frame/lib/fold.js`, taken from `SogFrame.fold`: importing the file here would
  have to list it in `meta.files` of `module.js`, case I26; without it, plain sections, always open). « Actions transverses » first (the bricks of family
  `common`), then the mock-up's six themes (Secours et assistance, Mer, douane et sécurité, Feu et protection civile, Transport et projection, Opérations
  aériennes, Mesure et validation; a family the table does not name goes to « Autres familles ») › one fold per family (its name from
  `frame/lib/mission_themes.js`, its code) › its bricks, then « Une clé seule » (`DR.offered`: a key with no text, the key in force of a drawer marked).
  Open with no search: the theme and the family of the mission (and « Une clé seule » when the key of a drawer changes); what the author opens or closes is
  kept for the session (`s.ed.kfold`, cleared when the search changes). Nothing found: « Aucune brique correspondante. »
- **A brick** is a button: its symbol (the mock-up's: ⚑ landing and arrival, ⊙ hover, ⇅ sequence, ⌖ overflight, ◇ object, ◯ zone, ✓ the gesture;
  ◷ the hour, which the mock-up does not draw), its title, its key in one line, its brief as `title` (shown on hover).
- **One touch** on a brick (or a key alone) under « ＋ Tiroir » creates the drawer (`CAT.drawerFrom`: its key with what `DR.keyed` guesses, its title, its
  message, its fallback), closes the window, selects the drawer (its sheet open, its title in hand) and says so: `ctx.notify` « Tiroir n ajouté : <title>. »
  (key `missions-drawer-added`, 10 s) with « Annuler » (`edAddUndo`: the drawer removed, the former row chosen again; nothing if the workshop changed or
  the drawer is gone). The settings (duration, places…) are made afterwards in the sheet of the drawer.
- **« Changer la clé »** (the key of a drawer, `data-kindcur`; it says « Changer la clé » instead of ▾) opens THE SAME window: a key alone changes the key
  (`DR.keyed`); a brick gives its key and its settings (its rule, its steps, its arrival) and never the author's texts — title, message, brief, onward route
  and a fallback already written stay.
- **Kept from the V3, against the mock-up**: (a) no point invented at the centre of the map — the places a brick needs stay « à placer », as before;
  (b) twelve drawers, not three; (c) only the bricks whose key the flight judges (`DR.judgedKind`, SOG-0500 (c)): « Message entre équipages » (`event`) is not
  offered today. Not taken from the mock-up: the level « type » under the family (the V3 catalogue has no subtype: the bricks sit in their family) and the
  count of indexed missions after the code of a family.

### 8. What is NOT ported

The typed test positions; the YAML tree (level 4, stays in the V2); the ZIP of an operation and the several crews
of `coordination` (P5); the outside tile host of the standard OpenStreetMap layer.
