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
